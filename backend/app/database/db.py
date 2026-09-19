import os
import json
import sqlite3
import threading
from datetime import datetime
from typing import Dict, Any, Optional, List
from ..config import settings

# Thread-safe lock for SQLite operations
db_lock = threading.Lock()

class DatabaseManager:
    def __init__(self, db_path: str = settings.DATABASE_PATH):
        self.db_path = db_path
        self.supabase_client = None
        self._init_sqlite()
        self._init_supabase()
        
        # Fast in-memory cache for active analyses and status polling
        self.analyses_cache: Dict[str, Dict[str, Any]] = {}
        self.datasets_cache: Dict[str, Dict[str, Any]] = {}
        self.jobs_status: Dict[str, Dict[str, Any]] = {}

    def _init_sqlite(self):
        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS datasets (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    row_count INTEGER,
                    feature_count INTEGER,
                    target_column TEXT,
                    profile_json TEXT,
                    created_at TEXT
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY,
                    dataset_id TEXT,
                    dataset_name TEXT,
                    target_column TEXT,
                    status TEXT,
                    progress INTEGER,
                    current_stage TEXT,
                    best_model_name TEXT,
                    summary_json TEXT,
                    created_at TEXT,
                    completed_at TEXT,
                    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS dataset_csv_data (
                    id TEXT PRIMARY KEY,
                    csv_content TEXT NOT NULL,
                    created_at TEXT
                )
            """)
            
            conn.commit()
            conn.close()

    def _init_supabase(self):
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                # pyrefly: ignore [missing-import]
                from supabase import create_client
                self.supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            except Exception:
                self.supabase_client = None

    def save_dataset(self, dataset_id: str, filename: str, profile: Dict[str, Any]):
        self.datasets_cache[dataset_id] = profile
        created_at_iso = datetime.utcnow().isoformat()
        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO datasets (id, filename, row_count, feature_count, target_column, profile_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                dataset_id,
                filename,
                profile.get("row_count", 0),
                profile.get("column_count", 0),
                profile.get("target_column", ""),
                json.dumps(profile, default=str),
                created_at_iso
            ))
            conn.commit()
            conn.close()

        # Sync to Supabase if client is active
        if self.supabase_client:
            try:
                self.supabase_client.table("datasets").upsert({
                    "id": dataset_id,
                    "filename": filename,
                    "row_count": profile.get("row_count", 0),
                    "feature_count": profile.get("column_count", 0),
                    "target_column": profile.get("target_column", ""),
                    "profile_json": profile,
                    "created_at": created_at_iso
                }).execute()
            except Exception as e:
                print(f"Supabase save_dataset warning: {e}")

    def get_dataset(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        if dataset_id in self.datasets_cache:
            return self.datasets_cache[dataset_id]

        # Check Supabase if active
        if self.supabase_client:
            try:
                res = self.supabase_client.table("datasets").select("profile_json").eq("id", dataset_id).execute()
                if res.data and len(res.data) > 0:
                    profile = res.data[0].get("profile_json")
                    if isinstance(profile, str):
                        profile = json.loads(profile)
                    self.datasets_cache[dataset_id] = profile
                    return profile
            except Exception as e:
                print(f"Supabase get_dataset fallback: {e}")

        # Check SQLite
        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT profile_json FROM datasets WHERE id = ?", (dataset_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                data = json.loads(row[0])
                self.datasets_cache[dataset_id] = data
                return data
        return None

    def save_raw_csv(self, dataset_id: str, csv_content: str):
        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO dataset_csv_data (id, csv_content, created_at)
                VALUES (?, ?, ?)
            """, (dataset_id, csv_content, datetime.utcnow().isoformat()))
            conn.commit()
            conn.close()

    def get_raw_csv(self, dataset_id: str) -> Optional[str]:
        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT csv_content FROM dataset_csv_data WHERE id = ?", (dataset_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                return row[0]
        return None

    def save_analysis_status(self, analysis_id: str, status: str, progress: int, stage: str, error: Optional[str] = None):
        status_payload = {
            "analysis_id": analysis_id,
            "status": status,
            "progress_percentage": progress,
            "current_stage": stage,
            "error_message": error,
            "updated_at": datetime.utcnow().isoformat()
        }
        self.jobs_status[analysis_id] = status_payload

    def get_analysis_status(self, analysis_id: str) -> Dict[str, Any]:
        if analysis_id in self.jobs_status:
            return self.jobs_status[analysis_id]
        # Check SQLite
        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT status, progress, current_stage FROM analyses WHERE id = ?", (analysis_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                return {
                    "analysis_id": analysis_id,
                    "status": row[0],
                    "progress_percentage": row[1],
                    "current_stage": row[2]
                }
        return {
            "analysis_id": analysis_id,
            "status": "NOT_FOUND",
            "progress_percentage": 0,
            "current_stage": "Unknown"
        }

    def save_completed_analysis(self, analysis_id: str, result_data: Dict[str, Any]):
        self.analyses_cache[analysis_id] = result_data
        self.save_analysis_status(analysis_id, "COMPLETED", 100, "Analysis complete")
        
        created_at_iso = result_data.get("timestamp", datetime.utcnow().isoformat())
        completed_at_iso = datetime.utcnow().isoformat()

        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO analyses (
                    id, dataset_id, dataset_name, target_column, status, progress,
                    current_stage, best_model_name, summary_json, created_at, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                analysis_id,
                result_data.get("dataset_id", ""),
                result_data.get("dataset_name", "Dataset"),
                result_data.get("target_column", ""),
                "COMPLETED",
                100,
                "Analysis complete",
                result_data.get("best_model_name", "N/A"),
                json.dumps(result_data, default=str),
                created_at_iso,
                completed_at_iso
            ))
            conn.commit()
            conn.close()

        # Sync to Supabase if active
        if self.supabase_client:
            try:
                self.supabase_client.table("analyses").upsert({
                    "id": analysis_id,
                    "dataset_id": result_data.get("dataset_id", ""),
                    "dataset_name": result_data.get("dataset_name", "Dataset"),
                    "target_column": result_data.get("target_column", ""),
                    "status": "COMPLETED",
                    "progress": 100,
                    "current_stage": "Analysis complete",
                    "best_model_name": result_data.get("best_model_name", "N/A"),
                    "summary_json": result_data,
                    "created_at": created_at_iso,
                    "completed_at": completed_at_iso
                }).execute()
            except Exception as e:
                print(f"Supabase save_completed_analysis warning: {e}")

    def get_analysis(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        if analysis_id in self.analyses_cache:
            return self.analyses_cache[analysis_id]

        # Check Supabase if active
        if self.supabase_client:
            try:
                res = self.supabase_client.table("analyses").select("summary_json").eq("id", analysis_id).execute()
                if res.data and len(res.data) > 0:
                    summary = res.data[0].get("summary_json")
                    if isinstance(summary, str):
                        summary = json.loads(summary)
                    self.analyses_cache[analysis_id] = summary
                    return summary
            except Exception as e:
                print(f"Supabase get_analysis fallback: {e}")

        # Check SQLite
        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT summary_json FROM analyses WHERE id = ?", (analysis_id,))
            row = cursor.fetchone()
            conn.close()
            if row:
                data = json.loads(row[0])
                self.analyses_cache[analysis_id] = data
                return data
        return None

    def list_recent_analyses(self, limit: int = 15) -> List[Dict[str, Any]]:
        # If Supabase is connected, query Supabase
        if self.supabase_client:
            try:
                res = self.supabase_client.table("analyses").select(
                    "id, dataset_name, target_column, status, best_model_name, created_at, summary_json"
                ).order("created_at", desc=True).limit(limit).execute()
                if res.data and len(res.data) > 0:
                    results = []
                    for r in res.data:
                        summary = r.get("summary_json") or {}
                        if isinstance(summary, str):
                            summary = json.loads(summary)
                        evals = summary.get("reliability_evaluations", [])
                        n_misleading = sum(1 for e in evals if e.get("classification") == "POTENTIALLY_MISLEADING")
                        n_review = sum(1 for e in evals if e.get("classification") == "NEEDS_REVIEW")
                        n_reliable = sum(1 for e in evals if e.get("classification") == "RELIABLE")
                        results.append({
                            "analysis_id": r.get("id"),
                            "dataset_name": r.get("dataset_name"),
                            "target_column": r.get("target_column"),
                            "status": r.get("status"),
                            "best_model": r.get("best_model_name"),
                            "created_at": r.get("created_at"),
                            "counts": {
                                "reliable": n_reliable,
                                "needs_review": n_review,
                                "potentially_misleading": n_misleading
                            }
                        })
                    return results
            except Exception as e:
                print(f"Supabase list_recent_analyses fallback: {e}")

        # Fallback to SQLite
        with db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, dataset_name, target_column, status, best_model_name, created_at, summary_json
                FROM analyses ORDER BY created_at DESC LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            conn.close()
            
            results = []
            for r in rows:
                summary = json.loads(r[6]) if r[6] else {}
                evals = summary.get("reliability_evaluations", [])
                n_misleading = sum(1 for e in evals if e.get("classification") == "POTENTIALLY_MISLEADING")
                n_review = sum(1 for e in evals if e.get("classification") == "NEEDS_REVIEW")
                n_reliable = sum(1 for e in evals if e.get("classification") == "RELIABLE")
                
                results.append({
                    "analysis_id": r[0],
                    "dataset_name": r[1],
                    "target_column": r[2],
                    "status": r[3],
                    "best_model": r[4],
                    "created_at": r[5],
                    "counts": {
                        "reliable": n_reliable,
                        "needs_review": n_review,
                        "potentially_misleading": n_misleading
                    }
                })
            return results

db = DatabaseManager()
