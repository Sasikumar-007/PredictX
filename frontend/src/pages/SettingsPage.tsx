import React, { useState } from 'react';
import { Settings as SettingsIcon, RotateCcw, Save, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [corrThreshold, setCorrThreshold] = useState<number>(0.80);
  const [vifThreshold, setVifThreshold] = useState<number>(10.0);
  const [bootstrapRuns, setBootstrapRuns] = useState<number>(15);
  const [reliableCutoff, setReliableCutoff] = useState<number>(80);
  const [reviewCutoff, setReviewCutoff] = useState<number>(50);

  // Weights (sum = 100)
  const [weights, setWeights] = useState({
    correlation: 20,
    proxy: 15,
    stability: 20,
    modelAgreement: 15,
    subgroup: 15,
    perturbation: 15,
  });

  const [saved, setSaved] = useState<boolean>(false);

  const handleReset = () => {
    setCorrThreshold(0.80);
    setVifThreshold(10.0);
    setBootstrapRuns(15);
    setReliableCutoff(80);
    setReviewCutoff(50);
    setWeights({
      correlation: 20,
      proxy: 15,
      stability: 20,
      modelAgreement: 15,
      subgroup: 15,
      perturbation: 15,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-[#2b3530] pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Research & Diagnostic Configuration</h1>
          <p className="text-xs text-[#a9baae] mt-1">
            Calibrate statistical risk thresholds, bootstrap sample size, and reliability scoring weights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3e4d44] text-xs text-[#a9baae] hover:text-white hover:bg-[#1f2622] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] text-xs font-bold transition-all shadow-sm"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Threshold Controls */}
      <div className="glow-card p-6 rounded-xl border border-[#2b3530] space-y-6">
        <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider border-b border-[#2b3530] pb-3">
          Statistical Diagnostics Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Correlation Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-white">Correlation Risk Cutoff (|r|)</span>
              <span className="text-[#75d95c]">{corrThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={corrThreshold}
              onChange={(e) => setCorrThreshold(parseFloat(e.target.value))}
              className="w-full accent-[#75d95c]"
            />
            <span className="text-[10px] text-[#768775] block">
              Features with correlation above this value are flagged as collinearity risks.
            </span>
          </div>

          {/* VIF Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-white">VIF Multicollinearity Cutoff</span>
              <span className="text-[#75d95c]">{vifThreshold.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="20.0"
              step="1.0"
              value={vifThreshold}
              onChange={(e) => setVifThreshold(parseFloat(e.target.value))}
              className="w-full accent-[#75d95c]"
            />
            <span className="text-[10px] text-[#768775] block">
              Variance inflation factor above this triggers a High Multicollinearity flag.
            </span>
          </div>

          {/* Bootstrap Runs */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-white">Bootstrap Retraining Runs</span>
              <span className="text-[#75d95c]">{bootstrapRuns} iterations</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={bootstrapRuns}
              onChange={(e) => setBootstrapRuns(parseInt(e.target.value))}
              className="w-full accent-[#75d95c]"
            />
            <span className="text-[10px] text-[#768775] block">
              Higher numbers increase rank variance precision (default: 15 for fast response).
            </span>
          </div>

          {/* Classification Cutoffs */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-white">Classification Tiers (Reliable / Review)</span>
              <span className="text-[#75d95c]">{reliableCutoff} / {reviewCutoff} pts</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={reliableCutoff}
                onChange={(e) => setReliableCutoff(parseInt(e.target.value))}
                className="w-1/2 bg-[#141715] border border-[#3e4d44] rounded px-3 py-1.5 text-xs text-white font-mono"
              />
              <input
                type="number"
                value={reviewCutoff}
                onChange={(e) => setReviewCutoff(parseInt(e.target.value))}
                className="w-1/2 bg-[#141715] border border-[#3e4d44] rounded px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <span className="text-[10px] text-[#768775] block">
              Scores &ge; {reliableCutoff} are Reliable; &lt; {reviewCutoff} are Potentially Misleading.
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Signal Weights */}
      <div className="glow-card p-6 rounded-xl border border-[#2b3530] space-y-6">
        <div className="flex items-center justify-between border-b border-[#2b3530] pb-3">
          <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
            Multi-Signal Scoring Weights (Sum = 100%)
          </h2>
          <span className="text-xs font-mono text-[#d4fc64]">
            Total: {Object.values(weights).reduce((a, b) => a + b, 0)}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 font-mono text-xs">
          {Object.entries(weights).map(([key, val]) => (
            <div key={key} className="p-3 rounded bg-[#141715] border border-[#262f2a] space-y-1.5">
              <div className="flex justify-between text-white capitalize">
                <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-[#75d95c]">{val}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="5"
                value={val}
                onChange={(e) => setWeights({ ...weights, [key]: parseInt(e.target.value) })}
                className="w-full accent-[#75d95c]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
