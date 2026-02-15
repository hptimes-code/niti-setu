import React, { useState, useCallback, useRef } from 'react';
import { FarmerProfile, EligibilityResult, DashboardMetrics } from './types';
import { INITIAL_SCHEMES } from './constants';
import { checkAllEligibilities, playSpeech } from './services/geminiService';
import VoiceControl from './components/VoiceControl';
import ProfileForm from './components/ProfileForm';
import ResultCard from './components/ResultCard';
import AuthForm from './components/AuthForm';
import PromptSection from './components/PromptSection';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Partial<FarmerProfile>>({
    category: 'General',
    landHolding: 0
  });
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'results' | 'dashboard' | 'assistant'>('input');
  
  const isAnalysisRunning = useRef(false);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    schemesAnalyzed: INITIAL_SCHEMES.length,
    checksPerformed: 0,
    avgResponseTime: '0.0s',
    eligibleCount: 0
  });

  const runAnalysis = useCallback(async (currentProfile?: Partial<FarmerProfile>, shouldSwitchTab: boolean = true) => {
    if (isAnalysisRunning.current) return;

    const profileToAnalyze = currentProfile || profile;
    
    if (!profileToAnalyze.name || !profileToAnalyze.state) {
      if (!currentProfile) alert("Please fill in at least Name and State.");
      return;
    }

    isAnalysisRunning.current = true;
    setIsLoading(true);
    setErrorMsg(null);
    if (shouldSwitchTab) setActiveTab('results'); 
    
    const startTime = Date.now();
    
    try {
      const batchResults = await checkAllEligibilities(profileToAnalyze as FarmerProfile, INITIAL_SCHEMES);
      
      if (!batchResults || batchResults.length === 0) {
        throw new Error("No analysis results received. The AI may be overloaded.");
      }

      setResults(batchResults);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      setMetrics(prev => ({
        ...prev,
        checksPerformed: prev.checksPerformed + 1,
        avgResponseTime: `${duration}s`,
        eligibleCount: batchResults.filter(r => r.isEligible).length
      }));

    } catch (error: any) {
      console.error("Batch Analysis Error:", error);
      setErrorMsg(error.message || "An unexpected error occurred during analysis. Please try again.");
    } finally {
      setIsLoading(false);
      isAnalysisRunning.current = false;
    }
  }, [profile]);

  const handleLogin = (userData: { email: string; name: string }) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setResults([]);
    setErrorMsg(null);
    setProfile({ category: 'General', landHolding: 0 });
    setActiveTab('input');
  };

  const handleProfileUpdate = (updates: Partial<FarmerProfile>, autoTrigger: boolean = false) => {
    setProfile(prev => {
      const updated = { ...prev, ...updates };
      if (autoTrigger && updated.name && updated.state && !isAnalysisRunning.current) {
        setTimeout(() => runAnalysis(updated, false), 2000);
      }
      return updated;
    });
  };

  const handleReadAloud = async (text: string) => {
    await playSpeech(text);
  };

  if (!isAuthenticated) return <AuthForm onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-12 transition-colors duration-500">
      <nav className="bg-emerald-900 text-white p-4 shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-900 text-2xl font-black shadow-inner">NS</div>
            <div>
              <h1 className="text-xl font-black uppercase">Niti-Setu</h1>
              <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">AI Agriculture Bridge</p>
            </div>
          </div>
          
          <div className="flex bg-emerald-800 p-1 rounded-xl shadow-inner border border-emerald-700">
            {[
              { id: 'input', label: 'Profile', icon: 'fa-id-card' },
              { id: 'assistant', label: 'AI Chat', icon: 'fa-robot' },
              { id: 'results', label: 'Results', icon: 'fa-check-double' },
              { id: 'dashboard', label: 'Repository', icon: 'fa-book' },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-100 hover:bg-emerald-700'}`}>
                <i className={`fas ${tab.icon}`}></i><span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-black text-white uppercase">{user?.name}</div>
              <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">Registered Farmer</div>
            </div>
            <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-emerald-800 hover:bg-red-600 transition flex items-center justify-center text-sm shadow-sm">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="lg:col-span-4 space-y-6">
              <VoiceControl onProfileExtracted={(updates) => handleProfileUpdate(updates, true)} />
            </div>
            <div className="lg:col-span-8">
              <ProfileForm profile={profile} onChange={(updates) => handleProfileUpdate(updates, false)} onSubmit={() => runAnalysis(undefined, true)} />
            </div>
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <PromptSection currentProfile={profile} onProfileUpdate={(updates) => handleProfileUpdate(updates, true)} />
          </div>
        )}

        {activeTab === 'results' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100">
                <div className="w-24 h-24 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <h3 className="text-2xl font-black text-slate-800 mt-8">Analyzing eligibility...</h3>
                <p className="text-slate-500 mt-2">Using Pro reasoning for accurate results. Please wait.</p>
              </div>
            ) : errorMsg ? (
              <div className="text-center py-24 bg-red-50 rounded-3xl border-4 border-dashed border-red-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                </div>
                <h3 className="text-xl font-black text-red-800 uppercase">Analysis Interrupted</h3>
                <p className="text-red-600 text-sm mt-2 mb-6 px-12">{errorMsg}</p>
                <button 
                  onClick={() => runAnalysis()}
                  className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg"
                >
                  <i className="fas fa-redo mr-2"></i>
                  Try Again
                </button>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-6">
                {results.map((res, i) => <ResultCard key={i} result={res} onReadAloud={handleReadAloud} />)}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-3xl border-4 border-dashed border-slate-200">
                <p className="text-slate-400 font-black uppercase tracking-widest">No Analysis Data Available</p>
                <button 
                  onClick={() => setActiveTab('input')}
                  className="mt-4 text-emerald-600 font-bold underline"
                >
                  Go to Profile Entry
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex flex-col mb-8 border-b border-slate-100 pb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Scheme Knowledge Repository</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Direct guidelines from official sources</p>
             </div>
             <div className="space-y-8">
               {INITIAL_SCHEMES.map((scheme, i) => (
                 <div key={i} className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                       <i className="fas fa-book-open"></i>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase tracking-tight">{scheme.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{scheme.description}</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;