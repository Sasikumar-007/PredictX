import React from 'react';
import { ShieldCheck, Play, Activity, Sparkles, BookOpen, Layers, Settings as SettingsIcon } from 'lucide-react';

import { Logo } from './Logo';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onLaunchDemo: () => void;
  isDemoLoading: boolean;
  backendStatus?: 'online' | 'connecting' | 'waking_up';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onLaunchDemo,
  isDemoLoading,
  backendStatus = 'connecting',
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2b3530] bg-[#141715]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand with User's Boxed Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => onSelectTab('landing')}>
          <Logo size="md" showSubtitle={true} />
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentTab === 'dashboard'
                ? 'bg-[#222a25] text-[#75d95c] border border-[#3e4d44]'
                : 'text-[#a9baae] hover:text-white hover:bg-[#1a201c]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('new-analysis')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentTab === 'new-analysis'
                ? 'bg-[#222a25] text-[#75d95c] border border-[#3e4d44]'
                : 'text-[#a9baae] hover:text-white hover:bg-[#1a201c]'
            }`}
          >
            + New Analysis
          </button>
          <button
            onClick={() => onSelectTab('evaluation')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentTab === 'evaluation'
                ? 'bg-[#222a25] text-[#75d95c] border border-[#3e4d44]'
                : 'text-[#a9baae] hover:text-white hover:bg-[#1a201c]'
            }`}
          >
            Research Benchmark
          </button>
          <button
            onClick={() => onSelectTab('comparative')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              currentTab === 'comparative'
                ? 'bg-[#222a25] text-[#75d95c] border border-[#3e4d44]'
                : 'text-[#a9baae] hover:text-white hover:bg-[#1a201c]'
            }`}
          >
            XAI vs PredictX
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`p-1.5 text-xs rounded-md transition-colors ${
              currentTab === 'settings'
                ? 'bg-[#222a25] text-[#75d95c] border border-[#3e4d44]'
                : 'text-[#a9baae] hover:text-white hover:bg-[#1a201c]'
            }`}
            title="Research Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </nav>

        {/* Action Button & Backend Status */}
        <div className="flex items-center space-x-3">
          {backendStatus === 'online' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1a2920] border border-[#2d4737] text-[11px] font-mono text-[#75d95c]" title="FastAPI Backend Engine is online and responding">
              <span className="w-1.5 h-1.5 rounded-full bg-[#75d95c] animate-pulse" />
              <span>Engine Online</span>
            </div>
          )}
          {backendStatus === 'waking_up' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2d2416] border border-[#523e1e] text-[11px] font-mono text-[#f5a742]" title="Render backend is warming up (~30-45s cold start)">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a742] animate-ping" />
              <span>Waking Engine...</span>
            </div>
          )}
          {backendStatus === 'connecting' && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e2320] border border-[#303833] text-[11px] font-mono text-[#a9baae]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a9baae]" />
              <span>Connecting...</span>
            </div>
          )}

          <button
            onClick={onLaunchDemo}
            disabled={isDemoLoading}
            className="flex items-center space-x-1.5 bg-[#75d95c] hover:bg-[#8eec77] text-[#121413] px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {isDemoLoading ? (
              <>
                <Activity className="w-3.5 h-3.5 animate-spin" />
                <span>Auditing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Try Demo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
