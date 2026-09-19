import React, { useState, useEffect } from 'react';
import { Play, Sparkles, CheckCircle2, XCircle, AlertCircle, Info, Activity, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { SyntheticEvaluation } from '../types';

interface ResearchEvaluationPageProps {
  onOpenAnalysis?: (analysisId: string) => void;
}

export const ResearchEvaluationPage: React.FC<ResearchEvaluationPageProps> = ({ onOpenAnalysis }) => {
  const [evaluation, setEvaluation] = useState<SyntheticEvaluation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [currentSeed, setCurrentSeed] = useState<number>(42);
  const [noiseLevel, setNoiseLevel] = useState<number>(0.12);
  const [trialCount, setTrialCount] = useState<number>(1);

  useEffect(() => {
    // Fast initial load (cached benchmark)
    runBenchmark(42, 0.12, false);
  }, []);

  const runBenchmark = async (seedToUse?: number, noiseToUse?: number, forceRefresh: boolean = true) => {
    setLoading(true);
    setErrorMsg('');
    const nextSeed = seedToUse !== undefined ? seedToUse : Math.floor(Math.random() * 100000);
    const nextNoise = noiseToUse !== undefined ? noiseToUse : noiseLevel;
    setCurrentSeed(nextSeed);

    try {
      const evalSummary = await api.getResearchBenchmark(nextSeed, nextNoise, forceRefresh);
      setEvaluation(evalSummary);
      setTrialCount(prev => prev + 1);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to run synthetic benchmark.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#2b3530] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-[#d4fc64] bg-[#202824] px-2 py-0.5 rounded border border-[#3e4d44]">
              CONTROLLED GROUND TRUTH
            </span>
            <span className="text-[10px] font-mono uppercase text-[#768775] bg-[#161817] px-2 py-0.5 rounded border border-[#2b3530]">
              Trial Seed: #{currentSeed}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Research Evaluation & Empirical Metrics
          </h1>
          <p className="text-xs text-[#a9baae] mt-1">
            Validating PredictX reliability classifications against mathematically verified data-generating relationships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1b201d] border border-[#2b3530] rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-[#768775] text-[11px]">Noise:</span>
            <select
              value={noiseLevel}
              disabled={loading}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                setNoiseLevel(n);
                runBenchmark(undefined, n);
              }}
              className="bg-transparent text-white text-xs outline-none cursor-pointer"
            >
              <option value="0.05" className="bg-[#1b201d]">Low (0.05)</option>
              <option value="0.12" className="bg-[#1b201d]">Standard (0.12)</option>
              <option value="0.25" className="bg-[#1b201d]">High (0.25)</option>
            </select>
          </div>

          <button
            onClick={() => runBenchmark()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{loading ? 'Evaluating...' : 'Re-Run Benchmark (New Sample)'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-[#381616] border border-[#682c2c] text-xs text-[#f1c5c5] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#cb5f5f] shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => runBenchmark(currentSeed, noiseLevel, false)}
            className="px-3 py-1 bg-[#4d1f1f] hover:bg-[#602727] text-white rounded text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !evaluation && (
        <div className="glow-card p-10 rounded-2xl border border-[#3e4d44] text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#75d95c]">
            <Activity className="w-6 h-6 animate-spin" />
            <span>Computing Controlled Ground-Truth Benchmark...</span>
          </div>
          <p className="text-xs text-[#a9baae] max-w-md mx-auto">
            Generating non-linear latent equations, training ML models, and benchmarking PredictX multi-signal diagnostics against mathematically known ground truth.
          </p>
          <div className="w-48 bg-[#141715] h-1.5 rounded-full overflow-hidden mx-auto">
            <div className="bg-[#75d95c] h-full animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Critical Scientific Distinction Callout */}
      <div className="p-5 rounded-xl bg-[#181a19] border border-[#2b3530] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#75d95c] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-white uppercase font-mono">
            Scientific Protocol: Synthetic vs. Real-World Datasets
          </div>
          <p className="text-[#a9baae] leading-relaxed">
            In Explainable AI, <b>no universal ground-truth importance exists for real-world observational data</b>. Computing Precision and Recall on empirical data is scientifically flawed. PredictX only computes quantitative classification metrics on <b>controlled synthetic benchmarks</b> where data-generating equations are explicitly defined. Real-world datasets are evaluated through qualitative sensitivity diagnostics.
          </p>
        </div>
      </div>

      {/* Benchmark Analysis Deep Dive Banner */}
      {evaluation && evaluation.analysis_id && onOpenAnalysis && (
        <div className="p-4 rounded-xl bg-[#1a241e] border border-[#2e4736] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-white">Controlled Benchmark Reliability Audit:</span>
            <span className="text-[#a9baae] ml-2">Inspect individual feature SHAP consensus curves, VIF scores, and perturbation logs for this benchmark run.</span>
          </div>
          <button
            onClick={() => onOpenAnalysis(evaluation.analysis_id!)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
          >
            <span>Open Benchmark Audit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Cards (Precision, Recall, F1, Accuracy) */}
      {evaluation && evaluation.is_synthetic && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glow-card p-5 rounded-xl border border-[#2b3530]">
            <span className="text-xs font-mono uppercase text-[#768775]">Detection Precision</span>
            <div className="text-3xl font-extrabold font-mono text-[#75d95c] mt-1">
              {(evaluation.precision * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#a9baae] mt-1">True misleading flags / all flags</div>
          </div>

          <div className="glow-card p-5 rounded-xl border border-[#2b3530]">
            <span className="text-xs font-mono uppercase text-[#768775]">Detection Recall</span>
            <div className="text-3xl font-extrabold font-mono text-[#d4fc64] mt-1">
              {(evaluation.recall * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#a9baae] mt-1">Identified risks / actual risks</div>
          </div>

          <div className="glow-card p-5 rounded-xl border border-[#2b3530]">
            <span className="text-xs font-mono uppercase text-[#768775]">Benchmark F1 Score</span>
            <div className="text-3xl font-extrabold font-mono text-white mt-1">
              {(evaluation.f1 * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#a9baae] mt-1">Harmonic mean of detection</div>
          </div>

          <div className="glow-card p-5 rounded-xl border border-[#2b3530]">
            <span className="text-xs font-mono uppercase text-[#768775]">Overall Accuracy</span>
            <div className="text-3xl font-extrabold font-mono text-white mt-1">
              {(evaluation.accuracy * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#a9baae] mt-1">Correct state assignments</div>
          </div>
        </div>
      )}

      {/* Detailed Ground Truth Mapping Table */}
      {evaluation && evaluation.feature_evaluations && (
        <div className="rounded-xl border border-[#2b3530] bg-[#181a19] overflow-hidden shadow-xl">
          <div className="p-4 bg-[#141715] border-b border-[#2b3530] flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Controlled Feature Ground-Truth Matrix
            </h2>
            <span className="text-xs text-[#768775] font-mono">
              {evaluation.feature_evaluations.length} evaluated features
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#121413] text-[#768775] uppercase border-b border-[#2b3530]">
                <tr>
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Ground Truth Role</th>
                  <th className="py-3 px-4">PredictX Score</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Research Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252d28] text-[#d1e0d5]">
                {evaluation.feature_evaluations.map((item) => (
                  <tr key={item.feature_name} className="hover:bg-[#202824]">
                    <td className="py-3 px-4 font-bold text-white">
                      {item.feature_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#1f2622] text-[#d4fc64] border border-[#3e4d44]">
                        {item.ground_truth_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-bold">
                      {item.predictx_reliability_score.toFixed(1)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${
                          item.predictx_classification === 'RELIABLE'
                            ? 'bg-[#18311c] text-[#75d95c] border-[#315837]'
                            : item.predictx_classification === 'NEEDS_REVIEW'
                            ? 'bg-[#332c12] text-[#ffea71] border-[#5d5124]'
                            : 'bg-[#381616] text-[#cb5f5f] border-[#682c2c]'
                        }`}
                      >
                        {item.predictx_classification.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.is_correctly_classified ? (
                        <div className="flex items-center gap-1 text-[#75d95c]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[#cb5f5f]">
                          <XCircle className="w-4 h-4" />
                          <span>Misaligned</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-sans text-[#a9baae]">
                      {item.rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
