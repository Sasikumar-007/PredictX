import React from 'react';
import { ArrowRight, Play, ShieldCheck, AlertTriangle, Layers, Cpu, BarChart3, Database, RefreshCw, GitFork } from 'lucide-react';
import { Logo } from '../components/Logo';

interface LandingPageProps {
  onStartAnalysis: () => void;
  onLaunchDemo: () => void;
  isDemoLoading: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartAnalysis,
  onLaunchDemo,
  isDemoLoading,
}) => {
  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#109c85]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" showSubtitle={true} className="mb-4" />
          <div className="inline-flex items-center space-x-2 rounded-full border border-[#2f3833] bg-[#1a201c] px-3.5 py-1.5 text-xs font-mono text-[#109c85]">
            <span className="h-2 w-2 rounded-full bg-[#109c85] animate-pulse" />
            <span>Research Release 1.0 · Explainable AI Diagnostics</span>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white font-sans">
          Don't Just Explain Predictions.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#75d95c] via-[#d4fc64] to-[#f9fb04]">
            Know When the Explanation Can Be Trusted.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#a9baae] leading-relaxed">
          PredictX evaluates the reliability of feature importance using multiple independent signals—detecting when correlation, multicollinearity, proxy bias, and model instability give a dangerously false impression.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onStartAnalysis}
            className="flex items-center space-x-2 rounded-lg bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-6 py-3 text-sm font-semibold tracking-wide transition-all shadow-lg active:scale-95"
          >
            <span>Start Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onLaunchDemo}
            disabled={isDemoLoading}
            className="flex items-center space-x-2 rounded-lg border border-[#3e4d44] bg-[#1a201c] hover:bg-[#222a25] text-white px-6 py-3 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current text-[#75d95c]" />
            <span>{isDemoLoading ? 'Loading Demo...' : 'Explore Demo'}</span>
          </button>
        </div>

        {/* Hero Visual: Specimen Spec Card */}
        <div className="mt-16 rounded-xl border border-[#2b3530] bg-[#181a19] p-6 shadow-2xl text-left font-mono">
          <div className="flex items-center justify-between border-b border-[#2b3530] pb-4">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-[#cb5f5f]" />
              <div className="h-3 w-3 rounded-full bg-[#ffea71]" />
              <div className="h-3 w-3 rounded-full bg-[#75d95c]" />
              <span className="text-xs text-[#768775] ml-2">predictx-core-diagnostics</span>
            </div>
            <span className="text-xs text-[#75d95c]">STUDENT_PERFORMANCE_AUDIT</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="p-3 rounded bg-[#141715] border border-[#262f2a]">
              <div className="text-[#768775]">TRADITIONAL SHAP EXPLAINER</div>
              <div className="text-white font-bold text-sm mt-1">Learning_App_Usage</div>
              <div className="text-[#ffea71] mt-1">Rank #1 · Importance: 0.312</div>
              <div className="text-[11px] text-[#a9baae] mt-2 italic">"Learning App Usage is the primary predictive driver."</div>
            </div>

            <div className="p-3 rounded bg-[#141715] border border-[#262f2a]">
              <div className="text-[#768775]">PREDICTX MULTI-SIGNAL AUDIT</div>
              <div className="text-[#cb5f5f] font-bold text-sm mt-1">POTENTIALLY MISLEADING</div>
              <div className="text-[#cb5f5f] mt-1">Reliability Score: 42.4 / 100</div>
              <div className="text-[11px] text-[#a9baae] mt-2">• Collinear with Study_Hours (r=0.91)<br />• Instability: ±5.8 rank std</div>
            </div>

            <div className="p-3 rounded bg-[#141715] border border-[#262f2a]">
              <div className="text-[#768775]">CORRECTED ACTION</div>
              <div className="text-[#75d95c] font-bold text-sm mt-1">Study_Hours (Reliable)</div>
              <div className="text-[#75d95c] mt-1">Score: 91.0 / 100 · Stable</div>
              <div className="text-[11px] text-[#a9baae] mt-2">True functional causal driver. Importance was redistributed to app usage.</div>
            </div>
          </div>
        </div>
      </section>

      {/* The 6 Independent Reliability Signals */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            6 Independent Diagnostic Signals
          </h2>
          <p className="mt-3 text-sm text-[#a9baae]">
            PredictX evaluates explanations across the six fundamental failure modes of machine learning explainers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glow-card p-6 rounded-xl border border-[#2b3530]">
            <div className="h-10 w-10 rounded-lg bg-[#202824] border border-[#3e4d44] flex items-center justify-center text-[#75d95c] mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">1. Correlation & Multicollinearity</h3>
            <p className="text-xs text-[#a9baae] mt-2 leading-relaxed">
              Detects high Pearson/Spearman feature-feature correlations and variance inflation (VIF &gt; 10) where importance is arbitrarily split.
            </p>
          </div>

          <div className="glow-card p-6 rounded-xl border border-[#2b3530]">
            <div className="h-10 w-10 rounded-lg bg-[#202824] border border-[#3e4d44] flex items-center justify-center text-[#ffea71] mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">2. Observational Proxy Risk</h3>
            <p className="text-xs text-[#a9baae] mt-2 leading-relaxed">
              Heuristically identifies features that encode sensitive demographic attributes or predictive substitutes without claiming causal proof.
            </p>
          </div>

          <div className="glow-card p-6 rounded-xl border border-[#2b3530]">
            <div className="h-10 w-10 rounded-lg bg-[#202824] border border-[#3e4d44] flex items-center justify-center text-[#75d95c] mb-4">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">3. Bootstrap Retraining Stability</h3>
            <p className="text-xs text-[#a9baae] mt-2 leading-relaxed">
              Runs bootstrap retraining iterations to verify whether ranking holds consistently or swings wildly across data resamples.
            </p>
          </div>

          <div className="glow-card p-6 rounded-xl border border-[#2b3530]">
            <div className="h-10 w-10 rounded-lg bg-[#202824] border border-[#3e4d44] flex items-center justify-center text-[#d4fc64] mb-4">
              <GitFork className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">4. Cross-Model Agreement</h3>
            <p className="text-xs text-[#a9baae] mt-2 leading-relaxed">
              Constructs an agreement matrix across Logistic Regression, Decision Trees, Random Forests, and XGBoost to detect model-dependent explanations.
            </p>
          </div>

          <div className="glow-card p-6 rounded-xl border border-[#2b3530]">
            <div className="h-10 w-10 rounded-lg bg-[#202824] border border-[#3e4d44] flex items-center justify-center text-[#ffea71] mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">5. Subgroup Heterogeneity</h3>
            <p className="text-xs text-[#a9baae] mt-2 leading-relaxed">
              Slices datasets by demographic and categorical strata to identify features whose explanatory power differs drastically across sub-populations.
            </p>
          </div>

          <div className="glow-card p-6 rounded-xl border border-[#2b3530]">
            <div className="h-10 w-10 rounded-lg bg-[#202824] border border-[#3e4d44] flex items-center justify-center text-[#cb5f5f] mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">6. Perturbation Sensitivity</h3>
            <p className="text-xs text-[#a9baae] mt-2 leading-relaxed">
              Shuffles and removes features to uncover "paper tiger" features that standard explainers rank high despite producing zero change in model F1 score.
            </p>
          </div>
        </div>
      </section>

      {/* Research Methodology */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 border-t border-[#2b3530] pt-16">
        <div className="rounded-xl bg-[#181a19] border border-[#2b3530] p-8">
          <h2 className="text-xl font-bold text-white">Research Methodology & Scientific Limitations</h2>
          <div className="mt-4 space-y-3 text-xs text-[#a9baae] leading-relaxed">
            <p>
              <b className="text-white">Empirical Unobservability:</b> On real-world datasets, "true feature importance" cannot be observed because real-world causal graphs are unknown. PredictX therefore evaluates real data through sensitivity and stability diagnostics, while providing a synthetic benchmark for controlled ground-truth evaluation.
            </p>
            <p>
              <b className="text-white">Correlation is Not Causation:</b> High collinearity and proxy scores identify shared statistical variance and substitution vulnerabilities; they do not prove or disprove causal effects without structural causal assumptions.
            </p>
            <p>
              <b className="text-white">Model Disagreement:</b> Divergent rankings across linear and non-linear models demonstrate architectural representation differences rather than an inherent defect in the feature.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#3e4d44] bg-gradient-to-b from-[#1c241f] to-[#121413] p-10 glow-card">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Ready to Audit Your Feature Importances?
          </h2>
          <p className="mt-2 text-sm text-[#a9baae] max-w-md mx-auto">
            Upload any CSV dataset or evaluate our student performance demo in sub-seconds.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={onStartAnalysis}
              className="bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-6 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all shadow-md active:scale-95"
            >
              Start Free Analysis
            </button>
            <button
              onClick={onLaunchDemo}
              className="border border-[#3e4d44] text-white hover:bg-[#202824] px-6 py-2.5 rounded-lg text-xs font-medium transition-all"
            >
              Run Instant Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
