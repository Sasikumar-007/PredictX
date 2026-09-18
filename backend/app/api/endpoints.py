import io
import uuid
import pandas as pd
import numpy as np
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Response
from fastapi.responses import JSONResponse

from ..config import settings
from ..database.db import db
from ..schemas.models import (
    APIResponse, AnalysisConfig, SyntheticDataConfig, AnalysisStatusResponse
)
from ..ml.preprocessing import DataPreprocessor
from ..ml.training import ModelTrainer
from ..ml.importance import FeatureImportanceEngine
from ..ml.correlation import CorrelationAnalyzer
from ..ml.vif import VIFAnalyzer
from ..ml.proxy import ProxyRiskAnalyzer
from ..ml.stability import StabilityAnalyzer
from ..ml.agreement import ModelAgreementAnalyzer
from ..ml.subgroup import SubgroupAnalyzer
from ..ml.perturbation import PerturbationAnalyzer
from ..ml.reliability import PredictXReliabilityAnalyzer
from ..ml.synthetic import SyntheticDataGenerator
from ..ml.reporting import ReportGenerator

router = APIRouter()
executor = ThreadPoolExecutor(max_workers=settings.MAX_CONCURRENT_WORKERS)

# In-memory storage for raw uploaded dataframes before analysis
raw_dataframes: Dict[str, pd.DataFrame] = {}

def execute_analysis_pipeline(analysis_id: str, dataset_id: str, config: AnalysisConfig):
    """
    Background worker that runs the full end-to-end ML & Reliability pipeline.
    Updates progress through all stages:
    PREPROCESSING -> TRAINING -> EXPLAINING -> ANALYZING -> REPORTING -> COMPLETED
    """
    try:
        df = raw_dataframes.get(dataset_id)
        if df is None:
            db.save_analysis_status(analysis_id, "FAILED", 0, "Dataset not found", "Dataset session expired")
            return
            
        # 1. Preprocessing Stage
        db.save_analysis_status(analysis_id, "PREPROCESSING", 15, "Profiling & Preprocessing Dataset")
        preprocessor = DataPreprocessor()
        X, y, feature_names, prep_summary = preprocessor.preprocess(
            df=df,
            target_col=config.target_column,
            scale_features=False
        )
        
        # 2. Model Training Stage
        db.save_analysis_status(analysis_id, "TRAINING", 35, "Training ML Models (LR, DT, RF, XGB)")
        trainer = ModelTrainer(random_state=config.random_seed)
        X_train, X_test, y_train, y_test = trainer.split_data(X, y)
        metrics = trainer.train_all(X_train, X_test, y_train, y_test, selected_models=config.models_to_train)
        best_model_name = trainer.best_model_name or "random_forest"
        best_model = trainer.models[best_model_name]
        
        # 3. Feature Importance Stage
        db.save_analysis_status(analysis_id, "EXPLAINING", 55, "Calculating SHAP, Permutation & Model Importance")
        imp_engine = FeatureImportanceEngine(random_state=config.random_seed)
        unified_table = imp_engine.generate_unified_table(
            model=best_model,
            X_train=X_train,
            X_val=X_test,
            y_val=y_test,
            feature_names=feature_names
        )
        unified_imp_dict = {item["feature"]: item["consensus_importance"] for item in unified_table}
        
        # 4. Reliability Diagnostics Stage
        db.save_analysis_status(analysis_id, "ANALYZING", 75, "Running Multi-Signal Reliability Engine")
        
        # 4a. Correlation & VIF
        corr_analyzer = CorrelationAnalyzer(threshold=config.correlation_threshold)
        corr_results = corr_analyzer.analyze(X, feature_names)
        
        vif_analyzer = VIFAnalyzer(high_threshold=config.vif_threshold)
        vif_results = vif_analyzer.calculate_vif(X, feature_names)
        
        # 4b. Proxy Risk
        proxy_analyzer = ProxyRiskAnalyzer(sensitive_feature=config.sensitive_column)
        proxy_results = proxy_analyzer.analyze(X, feature_names, corr_results)
        
        # 4c. Stability Analysis
        stab_analyzer = StabilityAnalyzer(n_runs=config.stability_runs, random_state=config.random_seed)
        stability_results = stab_analyzer.analyze(best_model, X_train, y_train, feature_names)
        
        # 4d. Model Agreement
        agree_analyzer = ModelAgreementAnalyzer()
        agreement_results = agree_analyzer.analyze(trainer.models, feature_names)
        
        # 4e. Subgroup Analysis
        sub_analyzer = SubgroupAnalyzer()
        # Reconstruct DataFrame for subgroup identification
        X_df = pd.DataFrame(X, columns=feature_names)
        subgroup_results = sub_analyzer.analyze(best_model, X_df, y, subgroup_col=config.subgroup_column)
        
        # 4f. Perturbation Testing
        pert_analyzer = PerturbationAnalyzer(random_state=config.random_seed)
        perturb_results = pert_analyzer.analyze(best_model, X_test, y_test, feature_names, unified_imp_dict)
        
        # 5. Master Reliability Scoring & Plain Language Generator
        db.save_analysis_status(analysis_id, "GENERATING_REPORT", 90, "Scoring & Generating Plain-Language Explanations")
        rel_analyzer = PredictXReliabilityAnalyzer(
            weights=config.reliability_weights,
            threshold_reliable=settings.THRESHOLD_RELIABLE,
            threshold_needs_review=settings.THRESHOLD_NEEDS_REVIEW
        )
        reliability_evaluations = rel_analyzer.analyze(
            feature_names=feature_names,
            unified_importances=unified_table,
            correlation_results=corr_results,
            vif_results=vif_results,
            proxy_results=proxy_results,
            stability_results=stability_results,
            agreement_results=agreement_results,
            subgroup_results=subgroup_results,
            perturbation_results=perturb_results
        )
        
        # Package full result object
        complete_analysis = {
            "analysis_id": analysis_id,
            "dataset_id": dataset_id,
            "dataset_name": getattr(df, "name", "Dataset"),
            "target_column": config.target_column,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "best_model_name": best_model_name,
            "preprocessing_summary": prep_summary,
            "model_metrics": metrics,
            "unified_importances": unified_table,
            "correlation_analysis": corr_results,
            "vif_analysis": vif_results,
            "proxy_analysis": proxy_results,
            "stability_analysis": stability_results,
            "model_agreement_analysis": agreement_results,
            "subgroup_analysis": subgroup_results,
            "perturbation_analysis": perturb_results,
            "reliability_evaluations": reliability_evaluations,
            "config": config.dict()
        }
        
        db.save_completed_analysis(analysis_id, complete_analysis)
        
    except Exception as e:
        db.save_analysis_status(analysis_id, "FAILED", 0, "Analysis Error", str(e))

# ----------------- ENDPOINTS -----------------

@router.post("/datasets/upload", response_model=APIResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None)
):
    """Uploads CSV, parses preview and profiles features."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are currently supported.")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        df.name = file.filename
        
        dataset_id = str(uuid.uuid4())[:8]
        raw_dataframes[dataset_id] = df
        
        preprocessor = DataPreprocessor()
        profile = preprocessor.profile_dataframe(df, target_col=target_column)
        db.save_dataset(dataset_id, file.filename, profile)
        
        return APIResponse(
            success=True,
            data={"dataset_id": dataset_id, "profile": profile},
            message="Dataset uploaded and profiled successfully."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

@router.get("/datasets/{dataset_id}", response_model=APIResponse)
async def get_dataset_profile(dataset_id: str):
    profile = db.get_dataset(dataset_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return APIResponse(success=True, data=profile)

@router.post("/analysis/create", response_model=APIResponse)
async def create_analysis(
    dataset_id: str,
    config: AnalysisConfig,
    background_tasks: BackgroundTasks
):
    """Initiates an asynchronous analysis job."""
    if dataset_id not in raw_dataframes and not db.get_dataset(dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found.")
        
    analysis_id = str(uuid.uuid4())[:8]
    db.save_analysis_status(analysis_id, "QUEUED", 5, "Job queued")
    
    # Run via threadpool executor
    executor.submit(execute_analysis_pipeline, analysis_id, dataset_id, config)
    
    return APIResponse(
        success=True,
        data={"analysis_id": analysis_id},
        message="Analysis job initiated."
    )

@router.get("/analysis/{analysis_id}/status", response_model=APIResponse)
async def get_analysis_status(analysis_id: str):
    """Pollable endpoint returning job progress percentage and current stage."""
    status_info = db.get_analysis_status(analysis_id)
    return APIResponse(success=True, data=status_info)

@router.get("/analysis/{analysis_id}/overview", response_model=APIResponse)
async def get_analysis_overview(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis results not ready or not found.")
    return APIResponse(success=True, data=data)

@router.get("/analysis/{analysis_id}/feature-importance", response_model=APIResponse)
async def get_feature_importance(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return APIResponse(success=True, data=data.get("unified_importances", []))

@router.get("/analysis/{analysis_id}/reliability", response_model=APIResponse)
async def get_reliability_scores(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return APIResponse(success=True, data=data.get("reliability_evaluations", []))

@router.get("/analysis/{analysis_id}/correlation", response_model=APIResponse)
async def get_correlation_data(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return APIResponse(success=True, data=data.get("correlation_analysis", {}))

@router.get("/analysis/{analysis_id}/stability", response_model=APIResponse)
async def get_stability_data(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return APIResponse(success=True, data=data.get("stability_analysis", []))

@router.get("/analysis/{analysis_id}/model-agreement", response_model=APIResponse)
async def get_agreement_data(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return APIResponse(success=True, data=data.get("model_agreement_analysis", {}))

@router.get("/analysis/{analysis_id}/subgroups", response_model=APIResponse)
async def get_subgroups_data(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return APIResponse(success=True, data=data.get("subgroup_analysis", []))

@router.get("/analysis/{analysis_id}/perturbation", response_model=APIResponse)
async def get_perturbation_data(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return APIResponse(success=True, data=data.get("perturbation_analysis", []))

@router.get("/analysis/{analysis_id}/feature/{feature_name}", response_model=APIResponse)
async def get_feature_detail(analysis_id: str, feature_name: str):
    data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    evals = data.get("reliability_evaluations", [])
    matched = [e for e in evals if e.get("feature") == feature_name]
    if not matched:
        raise HTTPException(status_code=404, detail=f"Feature '{feature_name}' not found in analysis.")
    return APIResponse(success=True, data=matched[0])

@router.get("/analyses/recent", response_model=APIResponse)
async def list_recent_analyses():
    analyses = db.list_recent_analyses()
    return APIResponse(success=True, data=analyses)

# ----------------- SYNTHETIC RESEARCH & DEMO -----------------

@router.post("/synthetic/generate", response_model=APIResponse)
async def generate_synthetic_dataset(config: SyntheticDataConfig):
    """Generates synthetic dataset with known ground truth roles."""
    generator = SyntheticDataGenerator(random_state=config.random_seed)
    df, ground_truth = generator.generate_research_dataset(n_rows=config.rows, noise_level=config.noise_level)
    
    dataset_id = f"synth_{uuid.uuid4().hex[:6]}"
    df.name = "Synthetic Research Benchmark"
    raw_dataframes[dataset_id] = df
    
    preprocessor = DataPreprocessor()
    profile = preprocessor.profile_dataframe(df, target_col="target")
    profile["ground_truth"] = ground_truth
    db.save_dataset(dataset_id, "Synthetic Research Benchmark", profile)
    
    return APIResponse(
        success=True,
        data={"dataset_id": dataset_id, "profile": profile, "ground_truth": ground_truth},
        message="Synthetic benchmark generated with ground truth roles."
    )

@router.get("/synthetic/evaluate/{analysis_id}", response_model=APIResponse)
async def evaluate_synthetic_analysis(analysis_id: str):
    """Evaluates PredictX classifications against synthetic ground truth."""
    analysis = db.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
        
    dataset_id = analysis.get("dataset_id")
    profile = db.get_dataset(dataset_id) or {}
    ground_truth = profile.get("ground_truth")
    
    if not ground_truth:
        # Fallback to qualitative assessment note for non-synthetic datasets
        return APIResponse(
            success=True,
            data={
                "is_synthetic": False,
                "note": "This is an empirical real-world dataset without observable ground truth. Evaluated via qualitative plausibility diagnostics."
            }
        )
        
    generator = SyntheticDataGenerator()
    evaluation_summary = generator.evaluate_ground_truth(
        ground_truth=ground_truth,
        predictx_evaluations=analysis.get("reliability_evaluations", [])
    )
    evaluation_summary["is_synthetic"] = True
    return APIResponse(success=True, data=evaluation_summary)

@router.get("/demo/run", response_model=APIResponse)
async def run_instant_demo():
    """
    Sub-second instant demo endpoint.
    Loads student performance dataset and runs complete PredictX analysis pipeline.
    """
    demo_analysis_id = "demo_student_perf"
    cached = db.get_analysis(demo_analysis_id)
    if cached:
        return APIResponse(success=True, data=cached, message="Instant demo retrieved.")
        
    generator = SyntheticDataGenerator(random_state=42)
    df, ground_truth = generator.generate_student_demo(n_rows=1000)
    df.name = "Student Performance Demo"
    
    dataset_id = "demo_dataset"
    raw_dataframes[dataset_id] = df
    
    preprocessor = DataPreprocessor()
    profile = preprocessor.profile_dataframe(df, target_col="Performance_Category")
    profile["ground_truth"] = ground_truth
    db.save_dataset(dataset_id, "Student Performance Demo", profile)
    
    config = AnalysisConfig(
        target_column="Performance_Category",
        models_to_train=["logistic_regression", "decision_tree", "random_forest", "xgboost"],
        stability_runs=15,
        correlation_threshold=0.80,
        subgroup_column="Internet_Access"
    )
    
    # Synchronously execute for instant demo caching
    execute_analysis_pipeline(demo_analysis_id, dataset_id, config)
    completed = db.get_analysis(demo_analysis_id)
    
    return APIResponse(success=True, data=completed, message="Instant demo created.")

# ----------------- REPORT DOWNLOADS -----------------

@router.get("/reports/{analysis_id}/pdf")
async def download_pdf_report(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data and analysis_id == "demo_student_perf":
        await run_instant_demo()
        data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    reporter = ReportGenerator(data)
    pdf_bytes = reporter.generate_pdf()
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PredictX_Report_{analysis_id}.pdf"}
    )

@router.get("/reports/{analysis_id}/csv")
async def download_csv_report(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data and analysis_id == "demo_student_perf":
        await run_instant_demo()
        data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    reporter = ReportGenerator(data)
    csv_str = reporter.generate_csv()
    
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=PredictX_Summary_{analysis_id}.csv"}
    )

@router.get("/reports/{analysis_id}/json")
async def download_json_report(analysis_id: str):
    data = db.get_analysis(analysis_id)
    if not data and analysis_id == "demo_student_perf":
        await run_instant_demo()
        data = db.get_analysis(analysis_id)
    if not data:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    reporter = ReportGenerator(data)
    json_str = reporter.generate_json()
    
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=PredictX_Data_{analysis_id}.json"}
    )
