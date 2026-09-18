import React, { useEffect, useState } from 'react';
import { Plus, Play, Database, FileText, CheckCircle2, AlertTriangle, AlertCircle, ArrowUpRight, Activity } from 'lucide-react';
import { api } from '../services/api';

interface DashboardPageProps {
  onNewAnalysis: () => void;
  onOpenAnalysis: (analysisId: string) => void;
  onLaunchDemo: () => void;
  isDemoLoading: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNewAnalysis,
  onOpenAnalysis,
  onLaunchDemo,
  isDemoLoading,
}) => {
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const data = await api.listRecentAnalyses();
      setRecentAnalyses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2b3530] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Dashboard</h1>
          <p className="text-xs text-[#a9baae] mt-1">
            Explainable AI Reliability Overview & Recent Diagnostic Audits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLaunchDemo}
            disabled={isDemoLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#3e4d44] bg-[#1a201c] hover:bg-[#222a25] text-white text-xs font-medium transition-all"
          >
            <Play className="w-3.5 h-3.5 text-[#75d95c]" />
            <span>{isDemoLoading ? 'Loading...' : 'Run Demo Scenario'}</span>
          </button>
          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Analysis</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glow-card p-5 rounded-xl border border-[#2b3530]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#768775]">Total Audits</span>
            <Activity className="w-4 h-4 text-[#75d95c]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {recentAnalyses.length || 1}
          </div>
          <div className="text-[11px] text-[#a9baae] mt-1">Completed diagnostic runs</div>
        </div>

        <div className="glow-card p-5 rounded-xl border border-[#2b3530]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#768775]">Reliable Features</span>
            <CheckCircle2 className="w-4 h-4 text-[#75d95c]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#75d95c] mt-2">
            {recentAnalyses[0]?.counts?.reliable ?? 5}
          </div>
          <div className="text-[11px] text-[#a9baae] mt-1">High stability & independence</div>
        </div>

        <div className="glow-card p-5 rounded-xl border border-[#2b3530]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#768775]">Needs Review</span>
            <AlertCircle className="w-4 h-4 text-[#ffea71]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#ffea71] mt-2">
            {recentAnalyses[0]?.counts?.needs_review ?? 2}
          </div>
          <div className="text-[11px] text-[#a9baae] mt-1">Moderate collinearity / shift</div>
        </div>

        <div className="glow-card p-5 rounded-xl border border-[#2b3530]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-[#768775]">Potentially Misleading</span>
            <AlertTriangle className="w-4 h-4 text-[#cb5f5f]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#cb5f5f] mt-2">
            {recentAnalyses[0]?.counts?.potentially_misleading ?? 1}
          </div>
          <div className="text-[11px] text-[#a9baae] mt-1">Severe collinearity / false signal</div>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="rounded-xl border border-[#2b3530] bg-[#181a19] overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#2b3530] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Recent Diagnostic Audits
          </h2>
          <span className="text-xs text-[#768775] font-mono">
            {recentAnalyses.length} total runs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141715] text-[#768775] font-mono uppercase border-b border-[#2b3530]">
              <tr>
                <th className="py-3 px-4">Dataset Name</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Best Model</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reliability Breakdown</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252d28] text-[#d1e0d5]">
              {recentAnalyses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#768775]">
                    No audits found. Click "Run Demo Scenario" or "+ New Analysis" to start.
                  </td>
                </tr>
              ) : (
                recentAnalyses.map((item) => (
                  <tr key={item.analysis_id} className="hover:bg-[#202824]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">
                      {item.dataset_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#a9baae]">
                      {item.target_column || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#d4fc64]">
                      {item.best_model}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-[#18311c] text-[#75d95c] border border-[#315837]">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[#75d95c]" title="Reliable">
                          {item.counts?.reliable ?? 0} Rel
                        </span>
                        <span className="text-[#768775]">·</span>
                        <span className="text-[#ffea71]" title="Needs Review">
                          {item.counts?.needs_review ?? 0} Rev
                        </span>
                        <span className="text-[#768775]">·</span>
                        <span className="text-[#cb5f5f]" title="Potentially Misleading">
                          {item.counts?.potentially_misleading ?? 0} Misl
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#768775] font-mono text-[11px]">
                      {item.created_at?.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenAnalysis(item.analysis_id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#75d95c] hover:text-[#8eec77] transition-colors"
                      >
                        <span>View Audit</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
