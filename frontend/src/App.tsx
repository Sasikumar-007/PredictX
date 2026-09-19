import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Logo } from './components/Logo';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { AnalysisDashboardPage } from './pages/AnalysisDashboardPage';
import { ResearchEvaluationPage } from './pages/ResearchEvaluationPage';
import { ComparativePage } from './pages/ComparativePage';
import { SettingsPage } from './pages/SettingsPage';
import { AnalysisOverview } from './types';
import { api } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisOverview | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'connecting' | 'waking_up'>('connecting');

  // Background health check & warm-up on page load
  useEffect(() => {
    let isMounted = true;
    const checkEngine = async () => {
      try {
        await api.checkHealth();
        if (isMounted) setBackendStatus('online');
      } catch (e) {
        if (isMounted) {
          setBackendStatus('waking_up');
          // Retry after 5 seconds to detect when warm
          setTimeout(async () => {
            try {
              await api.checkHealth();
              if (isMounted) setBackendStatus('online');
            } catch {
              // Ignore subsequent errors
            }
          }, 5000);
        }
      }
    };
    checkEngine();
    return () => { isMounted = false; };
  }, []);

  // Global instant demo launcher
  const handleLaunchDemo = async () => {
    setIsDemoLoading(true);
    try {
      const demoData = await api.runInstantDemo();
      setActiveAnalysis(demoData);
      setCurrentTab('analysis');
      setBackendStatus('online');
    } catch (e) {
      console.error('Failed to load demo:', e);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleOpenAnalysis = async (analysisId: string) => {
    try {
      let data: AnalysisOverview;
      try {
        data = await api.getAnalysisOverview(analysisId);
      } catch {
        // Brief retry in case overview is still finalizing
        await new Promise(r => setTimeout(r, 600));
        data = await api.getAnalysisOverview(analysisId);
      }
      setActiveAnalysis(data);
      setCurrentTab('analysis');
      setBackendStatus('online');
    } catch (e) {
      console.error('Failed to open analysis:', e);
      throw e;
    }
  };

  const handleAnalysisComplete = async (analysisId: string) => {
    await handleOpenAnalysis(analysisId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121413] text-[#f0f5f1]">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onLaunchDemo={handleLaunchDemo}
        isDemoLoading={isDemoLoading}
        backendStatus={backendStatus}
      />

      {/* Main Page Content */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            onStartAnalysis={() => setCurrentTab('new-analysis')}
            onLaunchDemo={handleLaunchDemo}
            isDemoLoading={isDemoLoading}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardPage
            onNewAnalysis={() => setCurrentTab('new-analysis')}
            onOpenAnalysis={handleOpenAnalysis}
            onLaunchDemo={handleLaunchDemo}
            isDemoLoading={isDemoLoading}
          />
        )}

        {currentTab === 'new-analysis' && (
          <NewAnalysisPage onAnalysisComplete={handleAnalysisComplete} />
        )}

        {currentTab === 'analysis' && activeAnalysis && (
          <AnalysisDashboardPage
            data={activeAnalysis}
            onRunNewAudit={() => setCurrentTab('new-analysis')}
          />
        )}

        {currentTab === 'evaluation' && <ResearchEvaluationPage />}

        {currentTab === 'comparative' && (
          <ComparativePage
            data={activeAnalysis}
            onLaunchDemo={handleLaunchDemo}
          />
        )}

        {currentTab === 'settings' && <SettingsPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2b3530] bg-[#141715] py-6 text-center text-xs text-[#768775] font-mono">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Logo size="sm" />
            <span>·</span>
            <span>AI-Powered Feature Importance Reliability Assessment</span>
          </div>
          <div>
            Built for Explainable AI & Machine Learning Reliability · Open Source
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
