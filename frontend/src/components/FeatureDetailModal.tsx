import React from 'react';
import { X, AlertTriangle, CheckCircle2, AlertCircle, Info, ArrowDown, Activity, Cpu } from 'lucide-react';
import { ReliabilityEvaluation } from '../types';

interface FeatureDetailModalProps {
  feature: ReliabilityEvaluation | null;
  onClose: () => void;
}

export const FeatureDetailModal: React.FC<FeatureDetailModalProps> = ({ feature, onClose }) => {
  if (!feature) return null;

  const isReliable = feature.classification === 'RELIABLE';
  const isReview = feature.classification === 'NEEDS_REVIEW';
  const isMisleading = feature.classification === 'POTENTIALLY_MISLEADING';

  const badgeColor = isReliable
    ? 'bg-[#18311c] text-[#75d95c] border-[#315837]'
    : isReview
    ? 'bg-[#332c12] text-[#ffea71] border-[#5d5124]'
    : 'bg-[#381616] text-[#cb5f5f] border-[#682c2c]';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="relative w-full max-w-xl h-full bg-[#181a19] border-l border-[#2b3530] flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#2b3530] flex items-center justify-between sticky top-0 bg-[#181a19]/95 backdrop-blur-sm z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{feature.feature}</h2>
              <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
                {feature.classification.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-[#a9baae] mt-1 font-mono">
              Consensus Importance: {feature.importance.toFixed(3)} &nbsp;|&nbsp; Rank: #{feature.evidence.unified_rank}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#768775] hover:text-white hover:bg-[#252b27] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm">
          {/* Top Score Banner */}
          <div className="glow-card p-5 rounded-xl border border-[#2b3530] flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-[#768775]">
                PredictX Reliability Score
              </span>
              <div className="text-4xl font-extrabold font-mono text-white mt-1">
                {feature.reliability_score.toFixed(1)}
                <span className="text-sm font-normal text-[#768775]"> / 100</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#a9baae] block">Diagnostic State</span>
              <span className={`text-sm font-semibold ${isReliable ? 'text-[#75d95c]' : isReview ? 'text-[#ffea71]' : 'text-[#cb5f5f]'}`}>
                {isReliable ? 'High Reliability' : isReview ? 'Review Recommended' : 'Severely Misleading Risk'}
              </span>
            </div>
          </div>

          {/* Plain Language Explanation */}
          <div className="p-4 rounded-lg bg-[#202422] border border-[#313c36] space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#75d95c]">
              <Info className="w-4 h-4" />
              <span>Evidence-Based Explanation</span>
            </div>
            <p className="text-xs leading-relaxed text-[#d1e0d5]">
              {feature.plain_language_explanation}
            </p>
          </div>

          {/* Score Calculation Breakdown (Waterfall) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#768775]">
              "Why this score?" — Transparent Deductions
            </h3>
            <div className="p-4 rounded-lg bg-[#141715] border border-[#252d28] font-mono text-xs space-y-2.5">
              <div className="flex justify-between items-center text-white pb-1 border-b border-[#252d28]">
                <span>Base Baseline Score</span>
                <span className="text-[#75d95c] font-bold">100.0 pts</span>
              </div>
              <div className="flex justify-between items-center text-[#cb5f5f]">
                <span>- Collinearity & Correlation Risk</span>
                <span>-{feature.score_calculation.correlation.toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center text-[#cb5f5f]">
                <span>- Proxy / Sensitive Confounding</span>
                <span>-{feature.score_calculation.proxy.toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center text-[#cb5f5f]">
                <span>- Retraining Instability Risk</span>
                <span>-{feature.score_calculation.stability.toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center text-[#cb5f5f]">
                <span>- Cross-Model Disagreement</span>
                <span>-{feature.score_calculation.model_agreement.toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center text-[#cb5f5f]">
                <span>- Subgroup Heterogeneity</span>
                <span>-{feature.score_calculation.subgroup.toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center text-[#cb5f5f]">
                <span>- Perturbation Functional Inconsistency</span>
                <span>-{feature.score_calculation.perturbation.toFixed(1)} pts</span>
              </div>
              <div className="flex justify-between items-center text-white pt-2 border-t border-[#252d28] font-bold">
                <span>Final PredictX Reliability Score</span>
                <span className="text-[#d4fc64]">{feature.reliability_score.toFixed(1)} pts</span>
              </div>
            </div>
          </div>

          {/* Exact Numerical Evidence Matrix */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#768775]">
              Exact Numerical Evidence
            </h3>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded bg-[#202422] border border-[#2c3731]">
                <div className="text-[10px] text-[#768775] uppercase">Max Correlation (|r|)</div>
                <div className="text-base font-bold text-white mt-0.5">{feature.evidence.max_correlation.toFixed(2)}</div>
                <div className="text-[10px] text-[#a9baae] mt-1">Collinearity risk: {(feature.signals.correlation_risk * 100).toFixed(0)}%</div>
              </div>
              <div className="p-3 rounded bg-[#202422] border border-[#2c3731]">
                <div className="text-[10px] text-[#768775] uppercase">Variance Inflation (VIF)</div>
                <div className="text-base font-bold text-white mt-0.5">{feature.evidence.vif.toFixed(1)}</div>
                <div className="text-[10px] text-[#a9baae] mt-1">{feature.evidence.vif > 10 ? 'High multicollinearity' : 'Acceptable'}</div>
              </div>
              <div className="p-3 rounded bg-[#202422] border border-[#2c3731]">
                <div className="text-[10px] text-[#768775] uppercase">Bootstrap Rank Std</div>
                <div className="text-base font-bold text-white mt-0.5">±{feature.evidence.rank_std.toFixed(1)}</div>
                <div className="text-[10px] text-[#a9baae] mt-1">Top-5 Freq: {feature.evidence.top_5_frequency.toFixed(0)}%</div>
              </div>
              <div className="p-3 rounded bg-[#202422] border border-[#2c3731]">
                <div className="text-[10px] text-[#768775] uppercase">Cross-Model Spread</div>
                <div className="text-base font-bold text-white mt-0.5">{feature.evidence.model_rank_spread} ranks</div>
                <div className="text-[10px] text-[#a9baae] mt-1">Disagreement: {(feature.signals.model_disagreement_risk * 100).toFixed(0)}%</div>
              </div>
              <div className="p-3 rounded bg-[#202422] border border-[#2c3731]">
                <div className="text-[10px] text-[#768775] uppercase">Subgroup Disparity</div>
                <div className="text-base font-bold text-white mt-0.5">{feature.evidence.subgroup_variation_score.toFixed(2)}</div>
                <div className="text-[10px] text-[#a9baae] mt-1">Variation slice divergence</div>
              </div>
              <div className="p-3 rounded bg-[#202422] border border-[#2c3731]">
                <div className="text-[10px] text-[#768775] uppercase">Perturbation ΔF1</div>
                <div className="text-base font-bold text-white mt-0.5">{feature.evidence.perturbation_f1_delta.toFixed(3)}</div>
                <div className="text-[10px] text-[#a9baae] mt-1">Impact: {feature.evidence.functional_impact}</div>
              </div>
            </div>
          </div>

          {/* Active Warnings */}
          {feature.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#cb5f5f] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Detected Reliability Warnings</span>
              </h3>
              <div className="space-y-1.5">
                {feature.warnings.map((w, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-[#231818] border border-[#522222] text-xs text-[#f1c5c5] flex items-start gap-2">
                    <span className="text-[#cb5f5f] font-bold mt-0.5">•</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
