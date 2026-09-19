import {
  DatasetProfile,
  AnalysisOverview,
  JobStatus,
  SyntheticEvaluation
} from '../types';

const FALLBACK_DIRECT_URL = 'https://predictx-tczk.onrender.com/api';

/**
 * Extracts and sanitizes the API base URL.
 * Handles cases where environment variables might have accidental duplicate URLs or newlines.
 */
export const getCleanUrl = (raw?: string): string | null => {
  if (!raw) return null;
  const match = raw.trim().match(/https?:\/\/[^\s"'<>\n\r]+/);
  if (!match) return null;
  let clean = match[0].replace(/\/+$/, '');
  // If multiple URLs were accidentally pasted together without whitespace:
  const secondHttp = clean.indexOf('http', 7);
  if (secondHttp !== -1) {
    clean = clean.substring(0, secondHttp).replace(/\/+$/, '');
  }
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export const getApiBase = (): string => {
  const envUrl = getCleanUrl(import.meta.env.VITE_API_BASE_URL as string);
  if (envUrl) {
    return envUrl;
  }
  // If running on Vercel or localhost, relative '/api' is routed via proxy rewrites
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('vercel.app') || host.includes('localhost') || host.includes('127.0.0.1')) {
      return '/api';
    }
  }
  return FALLBACK_DIRECT_URL;
};

const API_BASE = getApiBase();

/**
 * Helper to fetch with automatic fallback if relative /api route encounters 404 or network blip.
 */
async function fetchWithFallback(path: string, options?: RequestInit): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBase();
  const primaryUrl = `${base}${cleanPath}`;

  try {
    const res = await fetch(primaryUrl, options);
    // If relative /api returned 404 or 502/503/504, try direct Render backend fallback
    if ((res.status === 404 || res.status >= 500) && base === '/api') {
      try {
        const fallbackRes = await fetch(`${FALLBACK_DIRECT_URL}${cleanPath}`, options);
        if (fallbackRes.ok || fallbackRes.status < 500) {
          return fallbackRes;
        }
      } catch {
        // Continue and return original response if fallback also fails
      }
    }
    return res;
  } catch (err) {
    // Network failure (e.g. Render sleeping or connection issue) - attempt direct fallback
    if (base === '/api') {
      try {
        return await fetch(`${FALLBACK_DIRECT_URL}${cleanPath}`, options);
      } catch {
        // Fallback also failed
      }
    }
    throw new Error(
      'Unable to connect to PredictX backend engine. If the service was inactive, Render free tier may take ~30-45s to wake up from sleep. Please wait a moment and try again.'
    );
  }
}

export const api = {
  async checkHealth(): Promise<{ status: string; service: string; environment?: string; database?: string }> {
    const res = await fetchWithFallback('/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async uploadDataset(file: File, targetColumn?: string): Promise<{ dataset_id: string; profile: DatasetProfile }> {
    const formData = new FormData();
    formData.append('file', file);
    if (targetColumn) {
      formData.append('target_column', targetColumn);
    }
    const res = await fetchWithFallback('/datasets/upload', {
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
    const res = await fetchWithFallback(`/datasets/${datasetId}`);
    if (!res.ok) throw new Error('Dataset not found');
    const data = await res.json();
    return data.data;
  },

  async createAnalysis(datasetId: string, config: any): Promise<{ analysis_id: string }> {
    const res = await fetchWithFallback(`/analysis/create?dataset_id=${datasetId}`, {
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
    const res = await fetchWithFallback(`/analysis/${analysisId}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    const data = await res.json();
    return data.data;
  },

  async getAnalysisOverview(analysisId: string): Promise<AnalysisOverview> {
    const res = await fetchWithFallback(`/analysis/${analysisId}/overview`);
    if (!res.ok) throw new Error('Analysis not ready or not found');
    const data = await res.json();
    return data.data;
  },

  async listRecentAnalyses(): Promise<any[]> {
    try {
      const res = await fetchWithFallback('/analyses/recent');
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  },

  async runInstantDemo(): Promise<AnalysisOverview> {
    const res = await fetchWithFallback('/demo/run');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to run instant demo' }));
      throw new Error(err.detail || 'Failed to run instant demo');
    }
    const data = await res.json();
    return data.data;
  },

  async generateSynthetic(rows: number = 1000, noise: number = 0.15, randomSeed?: number): Promise<{ dataset_id: string; profile: DatasetProfile; ground_truth: Record<string, string> }> {
    const seed = randomSeed !== undefined ? randomSeed : Math.floor(Math.random() * 1000000);
    const res = await fetchWithFallback('/synthetic/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, noise_level: noise, random_seed: seed }),
    });
    if (!res.ok) throw new Error('Failed to generate synthetic data');
    const data = await res.json();
    return data.data;
  },

  async evaluateSynthetic(analysisId: string): Promise<SyntheticEvaluation> {
    const res = await fetchWithFallback(`/synthetic/evaluate/${analysisId}`);
    if (!res.ok) throw new Error('Evaluation failed');
    const data = await res.json();
    return data.data;
  },

  getPdfReportUrl(analysisId: string): string {
    return `${getApiBase()}/reports/${analysisId}/pdf`;
  },

  getCsvReportUrl(analysisId: string): string {
    return `${getApiBase()}/reports/${analysisId}/csv`;
  },

  getJsonReportUrl(analysisId: string): string {
    return `${getApiBase()}/reports/${analysisId}/json`;
  },
};
