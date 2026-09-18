import {
  DatasetProfile,
  AnalysisOverview,
  JobStatus,
  SyntheticEvaluation
} from '../types';

const getApiBase = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string)?.trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  // If running in production (e.g. on Vercel), point directly to live Render backend
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://predictx-tczk.onrender.com/api';
  }
  return '/api';
};

const API_BASE = getApiBase();

export const api = {
  async uploadDataset(file: File, targetColumn?: string): Promise<{ dataset_id: string; profile: DatasetProfile }> {
    const formData = new FormData();
    formData.append('file', file);
    if (targetColumn) {
      formData.append('target_column', targetColumn);
    }
    const res = await fetch(`${API_BASE}/datasets/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload CSV.' }));
      throw new Error(err.detail || 'Upload failed');
    }
    const data = await res.json();
    return data.data;
  },

  async getDatasetProfile(datasetId: string): Promise<DatasetProfile> {
    const res = await fetch(`${API_BASE}/datasets/${datasetId}`);
    if (!res.ok) throw new Error('Dataset not found');
    const data = await res.json();
    return data.data;
  },

  async createAnalysis(datasetId: string, config: any): Promise<{ analysis_id: string }> {
    const res = await fetch(`${API_BASE}/analysis/create?dataset_id=${datasetId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start analysis.' }));
      throw new Error(err.detail || 'Failed to start analysis');
    }
    const data = await res.json();
    return data.data;
  },

  async getAnalysisStatus(analysisId: string): Promise<JobStatus> {
    const res = await fetch(`${API_BASE}/analysis/${analysisId}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    const data = await res.json();
    return data.data;
  },

  async getAnalysisOverview(analysisId: string): Promise<AnalysisOverview> {
    const res = await fetch(`${API_BASE}/analysis/${analysisId}/overview`);
    if (!res.ok) throw new Error('Analysis not ready or not found');
    const data = await res.json();
    return data.data;
  },

  async listRecentAnalyses(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/analyses/recent`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  },

  async runInstantDemo(): Promise<AnalysisOverview> {
    const res = await fetch(`${API_BASE}/demo/run`);
    if (!res.ok) throw new Error('Failed to run instant demo');
    const data = await res.json();
    return data.data;
  },

  async generateSynthetic(rows: number = 1000, noise: number = 0.15, randomSeed?: number): Promise<{ dataset_id: string; profile: DatasetProfile; ground_truth: Record<string, string> }> {
    const seed = randomSeed !== undefined ? randomSeed : Math.floor(Math.random() * 1000000);
    const res = await fetch(`${API_BASE}/synthetic/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, noise_level: noise, random_seed: seed }),
    });
    if (!res.ok) throw new Error('Failed to generate synthetic data');
    const data = await res.json();
    return data.data;
  },

  async evaluateSynthetic(analysisId: string): Promise<SyntheticEvaluation> {
    const res = await fetch(`${API_BASE}/synthetic/evaluate/${analysisId}`);
    if (!res.ok) throw new Error('Evaluation failed');
    const data = await res.json();
    return data.data;
  },

  getPdfReportUrl(analysisId: string): string {
    return `${API_BASE}/reports/${analysisId}/pdf`;
  },

  getCsvReportUrl(analysisId: string): string {
    return `${API_BASE}/reports/${analysisId}/csv`;
  },

  getJsonReportUrl(analysisId: string): string {
    return `${API_BASE}/reports/${analysisId}/json`;
  },
};
