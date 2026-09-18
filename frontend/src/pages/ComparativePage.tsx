import React from 'react';
import { ArrowRight, AlertTriangle, CheckCircle2, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { AnalysisOverview } from '../types';

interface ComparativePageProps {
  data?: AnalysisOverview | null;
  onLaunchDemo: () => void;
}

export const ComparativePage: React.FC<ComparativePageProps> = ({ data, onLaunchDemo }) => {
  // If no active data, use the canonical student performance comparison scenario
  const comparisonItems = data?.reliability_evaluations || [
    {
      feature: 'Learning_App_Usage',
      importance: 0.312,
      reliability_score: 42.4,
      classification: 'POTENTIALLY_MISLEADING',
      evidence: { unified_rank: 1, max_correlation: 0.91, rank_std: 5.8 },
      warnings: ['Strong collinearity (r=0.91) with Study_Hours', 'Retraining instability (±5.8 rank std)'],
    },
    {
      feature: 'Study_Hours',
      importance: 0.285,
      reliability_score: 91.2,
      classification: 'RELIABLE',
      evidence: { unified_rank: 2, max_correlation: 0.91, rank_std: 0.8 },
      warnings: ['Collinearity detected, but verified ground-truth functional driver'],
    },
    {
      feature: 'Previous_Score',
      importance: 0.220,
      reliability_score: 88.5,
      classification: 'RELIABLE',
      evidence: { unified_rank: 3, max_correlation: 0.24, rank_std: 0.5 },
      warnings: [],
    },
    {
      feature: 'Attendance',
      importance: 0.125,
      reliability_score: 72.0,
      classification: 'NEEDS_REVIEW',
      evidence: { unified_rank: 4, max_correlation: 0.35, rank_std: 2.1 },
      warnings: ['Moderate rank variance across model families'],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#2b3530] pb-6">
        <span className="text-[10px] font-mono uppercase text-[#75d95c] bg-[#1a241e] px-2 py-0.5 rounded border border-[#2b4433]">
          PARADIGM SHIFT
        </span>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
          Traditional Feature Importance vs. PredictX Reliability Audit
        </h1>
        <p className="text-xs text-[#a9baae] mt-1">
          Illustrating why a high importance score alone does not guarantee a trustworthy explanation.
        </p>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Traditional XAI */}
        <div className="rounded-xl border border-[#3e4d44] bg-[#141715] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#2b3530] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#a9baae] font-mono uppercase tracking-wider">
                Traditional Explainers (SHAP / Gini)
              </h2>
              <p className="text-[11px] text-[#768775]">Answers: "What feature did the model look at?"</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#202422] text-[#768775]">
              NAIVE VIEW
            </span>
          </div>

          <div className="space-y-3">
            {comparisonItems.map((item, idx) => (
              <div
                key={item.feature}
                className="p-4 rounded-lg bg-[#181a19] border border-[#262f2a] flex items-center justify-between font-mono text-xs"
              >
                <div>
                  <div className="text-white font-bold">{item.feature}</div>
                  <div className="text-[11px] text-[#768775] mt-0.5">Rank #{idx + 1}</div>
                </div>
                <div className="text-right">
                  <div className="text-[#d4fc64] font-bold">{(item.importance * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-[#a9baae]">Attribution</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded bg-[#202422] border border-[#2b3530] text-xs text-[#a9baae] leading-relaxed">
            <b className="text-white">The Blindspot:</b> Standard XAI tools rank <code>Learning_App_Usage</code> as the #1 most important feature. A data scientist or regulator looking at this table would incorrectly conclude that app usage drives student performance, unaware that it is collinear with study hours and shifts unpredictably across runs.
          </div>
        </div>

        {/* Right: PredictX Reliability */}
        <div className="rounded-xl border border-[#75d95c] bg-[#181a19] p-6 shadow-2xl space-y-4 glow-card">
          <div className="flex items-center justify-between border-b border-[#2b3530] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-[#75d95c]">PredictX</span> Reliability Assessment
              </h2>
              <p className="text-[11px] text-[#a9baae]">Answers: "Can that explanation be trusted?"</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#18311c] text-[#75d95c] border border-[#315837]">
              TRUST LAYER
            </span>
          </div>

          <div className="space-y-3">
            {comparisonItems.map((item) => {
              const isRel = item.classification === 'RELIABLE';
              const isRev = item.classification === 'NEEDS_REVIEW';
              const badge = isRel
                ? 'bg-[#18311c] text-[#75d95c] border-[#315837]'
                : isRev
                ? 'bg-[#332c12] text-[#ffea71] border-[#5d5124]'
                : 'bg-[#381616] text-[#cb5f5f] border-[#682c2c]';

              return (
                <div
                  key={item.feature}
                  className="p-4 rounded-lg bg-[#202422] border border-[#2c3731] space-y-2 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white font-bold">{item.feature}</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${badge}`}>
                      {item.classification.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#a9baae]">Reliability Score:</span>
                    <span className="text-white font-bold">{item.reliability_score.toFixed(1)} / 100</span>
                  </div>
                  {item.warnings && item.warnings.length > 0 && (
                    <div className="text-[10px] text-[#cb5f5f] truncate">
                      ⚠️ {item.warnings[0]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded bg-[#141715] border border-[#3e4d44] text-xs text-[#d1e0d5] leading-relaxed">
            <b className="text-[#75d95c]">The Resolution:</b> PredictX flags <code>Learning_App_Usage</code> as <b>POTENTIALLY MISLEADING</b> (Score: 42.4) due to collinearity with Study Hours (r=0.91) and high retraining variance. It redirects confidence to <code>Study_Hours</code> (Score: 91.2), preventing erroneous interventions.
          </div>
        </div>
      </div>
    </div>
  );
};
