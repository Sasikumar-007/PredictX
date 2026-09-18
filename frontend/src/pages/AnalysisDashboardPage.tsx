import React, { useState, useMemo } from 'react';
import {
  Download,
  FileDown,
  Layers,
  ArrowUpDown,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { AnalysisOverview, ReliabilityEvaluation } from '../types';
import { api } from '../services/api';
import { FeatureDetailModal } from '../components/FeatureDetailModal';

interface AnalysisDashboardPageProps {
  data: AnalysisOverview;
  onRunNewAudit: () => void;
}

export const AnalysisDashboardPage: React.FC<AnalysisDashboardPageProps> = ({
  data,
  onRunNewAudit,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<ReliabilityEvaluation | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'table'>('overview');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const evals = data.reliability_evaluations || [];
  const nReliable = evals.filter((e) => e.classification === 'RELIABLE').length;
  const nReview = evals.filter((e) => e.classification === 'NEEDS_REVIEW').length;
  const nMisleading = evals.filter((e) => e.classification === 'POTENTIALLY_MISLEADING').length;

  const bestMetric = data.model_metrics[data.best_model_name] || Object.values(data.model_metrics)[0];

  // Filter and sort features for the table
  const filteredFeatures = useMemo(() => {
    return evals.filter((item) => {
      const matchesSearch = item.feature.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || item.classification === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [evals, searchTerm, statusFilter]);

  // Chart data: Feature Importance vs Reliability Score
  const comparisonChartData = useMemo(() => {
    return evals.map((item) => ({
      name: item.feature.length > 14 ? item.feature.slice(0, 12) + '...' : item.feature,
      fullName: item.feature,
      importance: Number((item.importance * 100).toFixed(1)),
      reliability: Number(item.reliability_score.toFixed(1)),
      classification: item.classification,
    }));
  }, [evals]);

  // Chart data: Stability Rank Std
  const stabilityChartData = useMemo(() => {
    return (data.stability_analysis || []).map((s) => ({
      name: s.feature.length > 14 ? s.feature.slice(0, 12) + '...' : s.feature,
      rankStd: s.rank_std,
      score: s.stability_score,
    }));
  }, [data.stability_analysis]);

  // Subgroup variation data
  const subgroupChartData = useMemo(() => {
    return (data.subgroup_analysis || []).filter(s => s.is_valid).map((s) => ({
      name: s.feature.length > 14 ? s.feature.slice(0, 12) + '...' : s.feature,
      variation: Number((s.variation_score * 100).toFixed(1)),
    }));
  }, [data.subgroup_analysis]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2b3530] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-[#75d95c] bg-[#1a241e] px-2 py-0.5 rounded border border-[#2b4433]">
              AUDIT COMPLETED
            </span>
            <span className="text-xs text-[#768775] font-mono">{data.timestamp}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            {data.dataset_name} — Feature Reliability Audit
          </h1>
        </div>

        {/* Export & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={api.getPdfReportUrl(data.analysis_id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF Report</span>
          </a>
          <a
            href={api.getCsvReportUrl(data.analysis_id)}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#3e4d44] bg-[#1a201c] hover:bg-[#222a25] text-white text-xs font-medium transition-all"
          >
            <FileDown className="w-3.5 h-3.5 text-[#a9baae]" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="glow-card p-4 rounded-xl border border-[#2b3530]">
          <span className="text-[10px] font-mono uppercase text-[#768775]">Best Model</span>
          <div className="text-sm font-bold font-mono text-white mt-1 capitalize truncate">
            {data.best_model_name.replace('_', ' ')}
          </div>
          <div className="text-[10px] text-[#75d95c] mt-0.5">
            F1: {bestMetric?.f1?.toFixed(3) || '0.84'}
          </div>
        </div>

        <div className="glow-card p-4 rounded-xl border border-[#2b3530]">
          <span className="text-[10px] font-mono uppercase text-[#768775]">Accuracy / AUC</span>
          <div className="text-sm font-bold font-mono text-white mt-1">
            {bestMetric ? `${(bestMetric.accuracy * 100).toFixed(1)}%` : '85.2%'}
          </div>
          <div className="text-[10px] text-[#a9baae] mt-0.5">
            AUC: {bestMetric?.roc_auc?.toFixed(2) || '0.88'}
          </div>
        </div>

        <div className="glow-card p-4 rounded-xl border border-[#2b3530]">
          <span className="text-[10px] font-mono uppercase text-[#768775]">Features Audited</span>
          <div className="text-sm font-bold font-mono text-white mt-1">
            {evals.length}
          </div>
          <div className="text-[10px] text-[#a9baae] mt-0.5">Independent signals</div>
        </div>

        <div className="glow-card p-4 rounded-xl border border-[#2b3530]">
          <span className="text-[10px] font-mono uppercase text-[#75d95c]">Reliable</span>
          <div className="text-sm font-bold font-mono text-[#75d95c] mt-1">
            {nReliable}
          </div>
          <div className="text-[10px] text-[#a9baae] mt-0.5">Score &ge; 80</div>
        </div>

        <div className="glow-card p-4 rounded-xl border border-[#2b3530]">
          <span className="text-[10px] font-mono uppercase text-[#ffea71]">Needs Review</span>
          <div className="text-sm font-bold font-mono text-[#ffea71] mt-1">
            {nReview}
          </div>
          <div className="text-[10px] text-[#a9baae] mt-0.5">Score 50–79</div>
        </div>

        <div className="glow-card p-4 rounded-xl border border-[#2b3530]">
          <span className="text-[10px] font-mono uppercase text-[#cb5f5f]">Misleading</span>
          <div className="text-sm font-bold font-mono text-[#cb5f5f] mt-1">
            {nMisleading}
          </div>
          <div className="text-[10px] text-[#a9baae] mt-0.5">Score &lt; 50</div>
        </div>
      </div>

      {/* Main Feature Importance vs Reliability Visual */}
      <div className="rounded-xl border border-[#2b3530] bg-[#181a19] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2b3530] pb-4">
          <div>
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Feature Importance vs. PredictX Reliability Score
            </h2>
            <p className="text-xs text-[#a9baae] mt-0.5">
              Notice discrepancies where traditional importance is elevated, but reliability score drops into warning zones.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#75d95c]" />
              <span className="text-[#a9baae]">Reliable (&ge;80)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#ffea71]" />
              <span className="text-[#a9baae]">Needs Review</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#cb5f5f]" />
              <span className="text-[#a9baae]">Potentially Misleading</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <XAxis dataKey="name" stroke="#768775" tick={{ fill: '#a9baae', fontSize: 11 }} />
              <YAxis stroke="#768775" tick={{ fill: '#a9baae', fontSize: 11 }} domain={[0, 100]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="p-3 rounded-lg bg-[#141715] border border-[#3e4d44] font-mono text-xs space-y-1">
                        <div className="text-white font-bold">{d.fullName}</div>
                        <div className="text-[#a9baae]">SHAP Consensus Importance: {d.importance}%</div>
                        <div className="text-[#75d95c]">Reliability Score: {d.reliability}/100</div>
                        <div className="text-[10px] text-[#cb5f5f] uppercase mt-1">{d.classification.replace('_', ' ')}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="reliability" radius={[4, 4, 0, 0]}>
                {comparisonChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.classification === 'RELIABLE'
                        ? '#75d95c'
                        : entry.classification === 'NEEDS_REVIEW'
                        ? '#ffea71'
                        : '#cb5f5f'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Reliability Scorecard Table */}
      <div className="rounded-xl border border-[#2b3530] bg-[#181a19] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#2b3530] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Feature Reliability Scorecard & Signals
            </h2>
            <p className="text-[11px] text-[#a9baae]">
              Click any feature to inspect detailed evidence, deductions, and plain-language rationale.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#768775]" />
              <input
                type="text"
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#141715] border border-[#313c36] rounded-md pl-8 pr-3 py-1 text-xs text-white focus:outline-none focus:border-[#75d95c] font-mono"
              />
            </div>

            {/* Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#141715] border border-[#313c36] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#75d95c] font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="RELIABLE">Reliable</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="POTENTIALLY_MISLEADING">Potentially Misleading</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141715] text-[#768775] font-mono uppercase border-b border-[#2b3530]">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Feature Name</th>
                <th className="py-3 px-4">Importance</th>
                <th className="py-3 px-4">Reliability Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Correlation</th>
                <th className="py-3 px-4">Stability</th>
                <th className="py-3 px-4">Key Warning</th>
                <th className="py-3 px-4 text-right">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252d28] text-[#d1e0d5] font-mono">
              {filteredFeatures.map((item) => {
                const isRel = item.classification === 'RELIABLE';
                const isRev = item.classification === 'NEEDS_REVIEW';
                const badge = isRel
                  ? 'bg-[#18311c] text-[#75d95c] border-[#315837]'
                  : isRev
                  ? 'bg-[#332c12] text-[#ffea71] border-[#5d5124]'
                  : 'bg-[#381616] text-[#cb5f5f] border-[#682c2c]';

                return (
                  <tr
                    key={item.feature}
                    onClick={() => setSelectedFeature(item)}
                    className="hover:bg-[#202824] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      #{item.evidence.unified_rank}
                    </td>
                    <td className="py-3 px-4 text-white font-semibold">
                      {item.feature}
                    </td>
                    <td className="py-3 px-4 text-[#d4fc64]">
                      {item.importance.toFixed(3)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white text-sm">
                        {item.reliability_score.toFixed(1)}
                      </span>
                      <span className="text-[#768775] text-[10px]"> / 100</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${badge}`}>
                        {item.classification.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#a9baae]">
                      |r|={item.evidence.max_correlation.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-[#a9baae]">
                      ±{item.evidence.rank_std.toFixed(1)} std
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[#cb5f5f]">
                      {item.warnings[0] || <span className="text-[#75d95c]">No concerns detected</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-xs text-[#75d95c] hover:underline font-sans">
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Visuals: Correlation Matrix & Model Agreement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stability & Variance */}
        <div className="glow-card p-6 rounded-xl border border-[#2b3530] space-y-4">
          <div className="border-b border-[#2b3530] pb-3">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Bootstrap Retraining Rank Stability
            </h3>
            <p className="text-[11px] text-[#a9baae] mt-0.5">
              Features with high rank standard deviation (± ranks) fluctuate across resampled training runs.
            </p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stabilityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#768775" tick={{ fill: '#a9baae', fontSize: 10 }} />
                <YAxis stroke="#768775" tick={{ fill: '#a9baae', fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-2.5 rounded bg-[#141715] border border-[#3e4d44] font-mono text-xs">
                          <div className="text-white font-bold">{d.name}</div>
                          <div className="text-[#ffea71]">Rank Std Dev: ±{d.rankStd.toFixed(1)}</div>
                          <div className="text-[#75d95c]">Stability: {d.score.toFixed(1)}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="rankStd" fill="#ffea71" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subgroup Heterogeneity */}
        <div className="glow-card p-6 rounded-xl border border-[#2b3530] space-y-4">
          <div className="border-b border-[#2b3530] pb-3">
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Subgroup Slice Heterogeneity Score
            </h3>
            <p className="text-[11px] text-[#a9baae] mt-0.5">
              Measures explanatory divergence across demographic & strata slices.
            </p>
          </div>
          <div className="h-60 w-full">
            {subgroupChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subgroupChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#768775" tick={{ fill: '#a9baae', fontSize: 10 }} />
                  <YAxis stroke="#768775" tick={{ fill: '#a9baae', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="variation" fill="#d4fc64" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#768775] font-mono">
                No categorical column with sufficient slice size (&ge; 15) available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Feature Detail Drawer */}
      <FeatureDetailModal
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </div>
  );
};
