import React, { useState } from 'react';
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, Play, Sparkles, Activity, FileText, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { DatasetProfile } from '../types';

interface NewAnalysisPageProps {
  onAnalysisComplete: (analysisId: string) => void;
}

export const NewAnalysisPage: React.FC<NewAnalysisPageProps> = ({ onAnalysisComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [datasetId, setDatasetId] = useState<string>('');
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [completedAnalysisId, setCompletedAnalysisId] = useState<string>('');

  // ML configuration state
  const [selectedModels, setSelectedModels] = useState<string[]>([
    'logistic_regression',
    'decision_tree',
    'random_forest',
    'xgboost',
  ]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([
    'shap',
    'permutation',
    'model_based',
  ]);
  const [diagnostics, setDiagnostics] = useState<Record<string, boolean>>({
    correlation: true,
    vif: true,
    stability: true,
    model_agreement: true,
    subgroup: true,
    perturbation: true,
  });

  // Analysis progress execution state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStage, setCurrentStage] = useState<string>('Initiating Pipeline...');

  // Handle Preset Dataset Pick (e.g. Student Performance Demo)
  const handleLoadPreset = async (preset: 'student' | 'synthetic') => {
    setIsUploading(true);
    setErrorMsg('');
    try {
      if (preset === 'student') {
        const demoData = await api.runInstantDemo();
        onAnalysisComplete(demoData.analysis_id);
      } else {
        const synth = await api.generateSynthetic(1000, 0.15);
        setDatasetId(synth.dataset_id);
        setProfile(synth.profile);
        setSelectedTarget(synth.profile.target_column || 'target');
        setStep(2);
      }
    } catch (e: any) {
      const msg = e.message === 'Not Found'
        ? 'Backend endpoint returned 404. If Render free tier is waking up from sleep, please wait ~30s and try again.'
        : (e.message || 'Failed to load preset.');
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle CSV file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsUploading(true);
    setErrorMsg('');
    try {
      const res = await api.uploadDataset(selected);
      setDatasetId(res.dataset_id);
      setProfile(res.profile);
      if (res.profile.target_column) {
        setSelectedTarget(res.profile.target_column);
      } else if (res.profile.features.length > 0) {
        // Default to last column
        setSelectedTarget(res.profile.features[res.profile.features.length - 1]);
      }
      setStep(2);
    } catch (err: any) {
      const msg = err.message === 'Not Found'
        ? 'Upload endpoint returned 404. If Render is waking up, please wait a moment and try again.'
        : (err.message || 'Failed to parse CSV.');
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger analysis execution & poll status
  const handleRunAnalysis = async () => {
    setIsExecuting(true);
    setProgress(5);
    setCurrentStage('Job Queued...');
    setErrorMsg('');

    try {
      const config = {
        target_column: selectedTarget,
        models_to_train: selectedModels,
        explanation_methods: selectedMethods,
        correlation_threshold: 0.80,
        vif_threshold: 10.0,
        stability_runs: 8,
      };

      const { analysis_id } = await api.createAnalysis(datasetId, config);

      // Start Polling
      const interval = setInterval(async () => {
        try {
          const status = await api.getAnalysisStatus(analysis_id);
          setProgress(status.progress_percentage || 10);
          setCurrentStage(status.current_stage || 'Processing...');

          if (status.status === 'COMPLETED') {
            clearInterval(interval);
            setProgress(100);
            setCurrentStage('Analysis Complete! Loading Dashboard...');
            setCompletedAnalysisId(analysis_id);
            try {
              await onAnalysisComplete(analysis_id);
            } catch (err: any) {
              console.error('Auto-open failed, manual button available:', err);
            }
          } else if (status.status === 'FAILED') {
            clearInterval(interval);
            setIsExecuting(false);
            setErrorMsg(status.error_message || 'Analysis failed.');
          }
        } catch (e) {
          // Keep polling
        }
      }, 600);
    } catch (err: any) {
      setIsExecuting(false);
      setErrorMsg(err.message || 'Failed to trigger analysis.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Wizard Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-mono text-[#768775]">
          <span>STEP {step} OF 7</span>
          <span>
            {step === 1 && 'Upload Dataset'}
            {step === 2 && 'Target Variable'}
            {step === 3 && 'Dataset Inspection'}
            {step === 4 && 'Preprocessing Decisions'}
            {step === 5 && 'Model Selection'}
            {step === 6 && 'Explanation Methods'}
            {step === 7 && 'Reliability Audit'}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-[#1c221f] overflow-hidden">
          <div
            className="h-full bg-[#75d95c] transition-all duration-300"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-lg bg-[#381616] border border-[#682c2c] text-xs text-[#f1c5c5] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#cb5f5f] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg('')}
            className="text-xs text-[#f1c5c5]/80 hover:text-white underline cursor-pointer ml-4 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-white tracking-tight">Upload Dataset</h2>
            <p className="text-xs text-[#a9baae] mt-1">
              Select any classification CSV dataset or pick one of our research benchmarks.
            </p>
          </div>

          <div className="glow-card p-8 rounded-2xl border-2 border-dashed border-[#3e4d44] text-center hover:border-[#75d95c] transition-colors relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="h-12 w-12 rounded-full bg-[#202824] border border-[#3e4d44] flex items-center justify-center text-[#75d95c] mx-auto mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">
              {isUploading ? 'Parsing dataset...' : 'Drop your CSV file here, or click to browse'}
            </p>
            <p className="text-xs text-[#768775] mt-1">Supports UTF-8 CSV datasets up to 100,000 rows</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#768775] font-mono justify-center my-4">
            <div className="h-px bg-[#2b3530] flex-1" />
            <span>OR PICK A RESEARCH BENCHMARK</span>
            <div className="h-px bg-[#2b3530] flex-1" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => handleLoadPreset('student')}
              className="p-4 rounded-xl bg-[#181a19] border border-[#2b3530] hover:border-[#75d95c] cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Student Performance Demo</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#202824] text-[#75d95c] border border-[#3e4d44]">
                  INSTANT DEMO
                </span>
              </div>
              <p className="text-xs text-[#a9baae] mt-2">
                1,000 rows · Classic scenario with correlated features (`Study_Hours` vs `Learning_App_Usage`).
              </p>
            </div>

            <div
              onClick={() => handleLoadPreset('synthetic')}
              className="p-4 rounded-xl bg-[#181a19] border border-[#2b3530] hover:border-[#75d95c] cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Synthetic Ground Truth Benchmark</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#202824] text-[#d4fc64] border border-[#3e4d44]">
                  EVALUATION
                </span>
              </div>
              <p className="text-xs text-[#a9baae] mt-2">
                Features with verified ground-truth roles (True Signals, Correlated, Proxy, Redundant, Noise).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT TARGET */}
      {step === 2 && profile && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Select Target Variable</h2>
            <p className="text-xs text-[#a9baae] mt-1">
              Choose the outcome column to classify. PredictX will configure stratified splitting automatically.
            </p>
          </div>

          <div className="glow-card p-6 rounded-xl border border-[#2b3530] space-y-4">
            <label className="text-xs font-mono uppercase text-[#768775] block">Target Column</label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full bg-[#141715] border border-[#3e4d44] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#75d95c] font-mono"
            >
              {profile.features.concat(profile.target_column ? [profile.target_column] : []).map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>

            <div className="p-4 rounded-lg bg-[#141715] border border-[#262f2a] text-xs font-mono space-y-1 text-[#a9baae]">
              <div>Target Type Detected: <span className="text-[#75d95c] font-bold">Binary Classification</span></div>
              <div>Available Features: <span className="text-white">{profile.features.length} columns</span></div>
              <div>Total Samples: <span className="text-white">{profile.row_count} rows</span></div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-xs text-[#a9baae] hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-5 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Continue to Data Inspection <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DATA INSPECTION */}
      {step === 3 && profile && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Dataset Inspection & Profiling</h2>
            <p className="text-xs text-[#a9baae] mt-1">
              Review feature distributions, cardinality, and missingness before running ML pipelines.
            </p>
          </div>

          <div className="rounded-xl border border-[#2b3530] bg-[#181a19] overflow-hidden">
            <div className="p-3 bg-[#141715] border-b border-[#2b3530] text-xs font-mono text-[#768775]">
              COLUMN PROFILES ({profile.column_count} TOTAL)
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#121413] text-[#768775] font-mono uppercase sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Feature</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Missing</th>
                    <th className="py-2.5 px-4">Cardinality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252d28] font-mono text-[#d1e0d5]">
                  {profile.features.map((feat) => (
                    <tr key={feat} className="hover:bg-[#202824]">
                      <td className="py-2 px-4 text-white font-semibold">{feat}</td>
                      <td className="py-2 px-4 text-[#a9baae]">
                        {profile.numerical_features.includes(feat) ? 'Numerical' : 'Categorical'}
                      </td>
                      <td className="py-2 px-4">
                        {profile.missing_value_counts[feat] > 0 ? (
                          <span className="text-[#ffea71]">{profile.missing_value_counts[feat]} rows</span>
                        ) : (
                          <span className="text-[#75d95c]">0 (Clean)</span>
                        )}
                      </td>
                      <td className="py-2 px-4">{profile.cardinality[feat] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-xs text-[#a9baae] hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-1.5 bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-5 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Confirm Preprocessing <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREPROCESSING */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Automated Preprocessing Decisions</h2>
            <p className="text-xs text-[#a9baae] mt-1">
              Deterministic, non-silent transformations configured for this dataset.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glow-card p-5 rounded-xl border border-[#2b3530] space-y-2">
              <span className="text-xs font-mono text-[#75d95c] uppercase">Numerical Strategy</span>
              <p className="text-xs text-[#d1e0d5]">
                Missing values imputed using feature median. Preserved raw for tree architectures (RF, XGB); standardized for linear models.
              </p>
            </div>
            <div className="glow-card p-5 rounded-xl border border-[#2b3530] space-y-2">
              <span className="text-xs font-mono text-[#75d95c] uppercase">Categorical Strategy</span>
              <p className="text-xs text-[#d1e0d5]">
                Low cardinality (≤10 categories) converted to One-Hot columns; higher cardinality encoded with ordinal label mappings.
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1 text-xs text-[#a9baae] hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex items-center gap-1.5 bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-5 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Model Selection <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: MODEL SELECTION */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Model Architectures</h2>
            <p className="text-xs text-[#a9baae] mt-1">
              Select which model families to train and cross-evaluate for explanation agreement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'logistic_regression', name: 'Logistic Regression', desc: 'Linear baseline with L2 regularization' },
              { id: 'decision_tree', name: 'Decision Tree', desc: 'Non-linear single tree with depth bounding' },
              { id: 'random_forest', name: 'Random Forest', desc: 'Ensemble bagging of 100 decision trees' },
              { id: 'xgboost', name: 'XGBoost', desc: 'Gradient boosted decision trees with logloss objective' },
            ].map((m) => (
              <label
                key={m.id}
                className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  selectedModels.includes(m.id)
                    ? 'bg-[#1e2621] border-[#75d95c]'
                    : 'bg-[#181a19] border-[#2b3530]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedModels.includes(m.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedModels([...selectedModels, m.id]);
                    } else if (selectedModels.length > 1) {
                      setSelectedModels(selectedModels.filter((id) => id !== m.id));
                    }
                  }}
                  className="mt-1 accent-[#75d95c]"
                />
                <div>
                  <div className="text-xs font-bold text-white">{m.name}</div>
                  <div className="text-[11px] text-[#a9baae] mt-0.5">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-1 text-xs text-[#a9baae] hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(6)}
              className="flex items-center gap-1.5 bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-5 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Explanation Methods <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: EXPLANATION METHODS */}
      {step === 6 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Explanation Methods</h2>
            <p className="text-xs text-[#a9baae] mt-1">
              Specify baseline feature attribution algorithms.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { id: 'shap', name: 'SHAP (Tree & Linear Explainer)', desc: 'Mean absolute Shapley values with adaptive background sampling' },
              { id: 'permutation', name: 'Permutation Importance', desc: 'Validation F1 score degradation under feature shuffle' },
              { id: 'model_based', name: 'Native Model Importance', desc: 'Gini impurity reduction & normalized logistic coefficients' },
            ].map((method) => (
              <label
                key={method.id}
                className="p-4 rounded-xl border bg-[#181a19] border-[#2b3530] flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedMethods.includes(method.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedMethods([...selectedMethods, method.id]);
                    else if (selectedMethods.length > 1) setSelectedMethods(selectedMethods.filter((m) => m !== method.id));
                  }}
                  className="mt-1 accent-[#75d95c]"
                />
                <div>
                  <div className="text-xs font-bold text-white">{method.name}</div>
                  <div className="text-[11px] text-[#a9baae] mt-0.5">{method.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(5)}
              className="flex items-center gap-1 text-xs text-[#a9baae] hover:text-white px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(7)}
              className="flex items-center gap-1.5 bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-5 py-2 rounded-lg text-xs font-bold transition-all"
            >
              Configure Diagnostics <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: RELIABILITY DIAGNOSTICS & RUN */}
      {step === 7 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Reliability Diagnostics Engine</h2>
            <p className="text-xs text-[#a9baae] mt-1">
              Select the 6 multi-signal diagnostics to compute the transparent PredictX Reliability Score.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'correlation', name: 'Correlation & Multicollinearity', weight: '20% weight' },
              { id: 'vif', name: 'Variance Inflation Factor (VIF)', weight: 'Diagnostic' },
              { id: 'proxy', name: 'Observational Proxy Risk', weight: '15% weight' },
              { id: 'stability', name: '15-Run Bootstrap Stability', weight: '20% weight' },
              { id: 'model_agreement', name: 'Cross-Model Agreement Matrix', weight: '15% weight' },
              { id: 'subgroup', name: 'Subgroup Slice Heterogeneity', weight: '15% weight' },
              { id: 'perturbation', name: 'Perturbation Inconsistency Test', weight: '15% weight' },
            ].map((diag) => (
              <div
                key={diag.id}
                className="p-3.5 rounded-lg bg-[#181a19] border border-[#2b3530] flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#75d95c]" />
                  <span className="text-xs text-white font-medium">{diag.name}</span>
                </div>
                <span className="text-[10px] font-mono text-[#a9baae]">{diag.weight}</span>
              </div>
            ))}
          </div>

          {/* Execution Box */}
          {isExecuting ? (
            <div className="glow-card p-6 rounded-xl border border-[#75d95c] space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#75d95c]">
                <Activity className="w-5 h-5 animate-spin" />
                <span>{currentStage}</span>
              </div>
              <div className="w-full bg-[#141715] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#75d95c] h-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-[#a9baae] font-mono">
                Progress: {progress}% · Running parallelized multi-signal evaluations
              </p>
              {progress >= 100 && completedAnalysisId && (
                <div className="pt-2">
                  <button
                    onClick={() => onAnalysisComplete(completedAnalysisId)}
                    className="inline-flex items-center gap-2 bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#121413]" />
                    <span>View Analysis Dashboard →</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(6)}
                className="flex items-center gap-1 text-xs text-[#a9baae] hover:text-white px-4 py-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleRunAnalysis}
                className="flex items-center gap-2 bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-8 py-3 rounded-lg text-sm font-bold transition-all shadow-lg active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Run PredictX Analysis</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
