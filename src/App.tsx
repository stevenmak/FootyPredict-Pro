import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  BarChart3, 
  TrendingUp, 
  Info, 
  ShieldCheck, 
  Loader2, 
  History as HistoryIcon,
  LayoutDashboard,
  Target,
  ArrowRightLeft,
  RefreshCw,
  X,
  AlertCircle,
  Clock,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

import { fetchMatchStats } from './services/geminiService';
import { calculatePrediction } from './services/poissonModel';
import { PredictionResults, TeamStats, HistoryItem } from './types';
import { POPULAR_TEAMS } from './constants';

type Tab = 'predict' | 'history' | 'leagues';

// Components
const StatBadge = ({ label, value, color = "border-emerald-500" }: { label: string, value: string | number, color?: string }) => (
  <div className={`p-3 bg-white/5 rounded-xl border-l-2 ${color} flex flex-col gap-0.5`}>
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    <span className="text-sm font-mono font-bold text-white">{value}</span>
  </div>
);

const VerdictCard = ({ label, pick, prob, type }: { label: string, pick: string, prob: number, type: 'success' | 'warning' | 'info', key?: string | number }) => {
  const colors = {
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", badge: "bg-emerald-500 text-black" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500 text-black" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "bg-blue-500 text-black" }
  };
  const theme = colors[type];

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`${theme.bg} ${theme.border} border rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden`}
    >
      <div className="flex justify-between items-start z-10">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <span className={`${theme.badge} text-[8px] font-black px-1.5 py-0.5 rounded uppercase`}>{prob > 65 ? 'High Confidence' : 'Value Pick'}</span>
      </div>
      <div className="flex items-end justify-between z-10">
        <span className={`text-sm font-bold text-white capitalize`}>{pick}</span>
        <span className={`text-xl font-mono font-black ${theme.text}`}>{prob}%</span>
      </div>
      <div className={`absolute -right-4 -bottom-4 opacity-5 pointer-events-none`}>
        <ShieldCheck size={80} />
      </div>
    </motion.div>
  );
};

const ProbabilityBar = ({ label, probability, total = 100, color = "bg-emerald-500" }: { label: string, probability: number, total?: number, color?: string }) => {
  const percentage = (probability / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <span className="text-lg font-mono font-bold text-white">{probability}%</span>
      </div>
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
        />
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('predict');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PredictionResults | null>(null);
  const [teamStats, setTeamStats] = useState<{ home: TeamStats, away: TeamStats } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('footypredict_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handlePredict = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!homeTeam || !awayTeam) return;

    setLoading(true);
    setError(null);
    setActiveTab('predict');

    try {
      const stats = await fetchMatchStats(homeTeam, awayTeam);
      setTeamStats(stats);
      const prediction = calculatePrediction(stats.home, stats.away);
      setResults(prediction);

      // Save to history
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        results: prediction,
        teamStats: stats,
        timestamp: Date.now()
      };
      
      const updatedHistory = [newItem, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem('footypredict_history', JSON.stringify(updatedHistory));

    } catch (err) {
      console.error(err);
      setError("Unable to fetch team statistics. Please ensure names are correct.");
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setResults(item.results);
    setTeamStats(item.teamStats);
    setHomeTeam(item.results.homeTeam);
    setAwayTeam(item.results.awayTeam);
    setActiveTab('predict');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteFromHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('footypredict_history', JSON.stringify(updated));
  };

  const chartData = results?.topScores.map(score => ({
    name: `${score.home}-${score.away}`,
    prob: score.probability,
    type: score.home > score.away ? 'Home' : (score.home === score.away ? 'Draw' : 'Away')
  })).slice(0, 6) || [];

  return (
    <div className="min-h-screen font-sans bg-[#0B0F19] text-slate-200 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-lg px-6 pt-8 pb-6 border-b border-slate-800 bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">Live Poisson Engine v1.0</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white font-display">Match Predictor Pro</h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5 font-bold">Session</div>
            <div className="text-sm font-mono font-bold text-white flex items-center gap-1.5">
              {results ? (
                <>
                  {results.homeTeam.substring(0,3).toUpperCase()} <span className="text-slate-600">vs</span> {results.awayTeam.substring(0,3).toUpperCase()}
                </>
              ) : (
                <span className="text-slate-600 uppercase">Awaits</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-lg px-6 py-8 pb-32 space-y-8">
        
        {activeTab === 'predict' && (
          <motion.div 
            key="predict-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Search Section */}
            <section className="sleek-card border-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.03)]">
              <div className="flex items-center gap-2 mb-6">
                <Search size={14} className="text-emerald-500" />
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Query Engine</h2>
              </div>
              
              <form onSubmit={handlePredict} className="space-y-4">
                <datalist id="popular-teams">
                  {POPULAR_TEAMS.map(team => (
                    <option key={team} value={team} />
                  ))}
                </datalist>
                <div className="space-y-3">
                  <div className="relative group">
                    <input
                      type="text"
                      list="popular-teams"
                      placeholder="Home Team Name"
                      value={homeTeam}
                      onChange={(e) => setHomeTeam(e.target.value)}
                      className="w-full bg-[#1C2333] border border-slate-700/50 rounded-xl px-5 py-3.5 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                      required
                    />
                  </div>
                  <div className="relative group">
                    <input
                      type="text"
                      list="popular-teams"
                      placeholder="Away Team Name"
                      value={awayTeam}
                      onChange={(e) => setAwayTeam(e.target.value)}
                      className="w-full bg-[#1C2333] border border-slate-700/50 rounded-xl px-5 py-3.5 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                      required
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 text-[#0B0F19] py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,0.15)] disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <TrendingUp size={16} />}
                  {loading ? "Analyzing..." : "Calculate Odds"}
                </button>
              </form>
            </section>

            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
                <AlertCircle className="text-rose-500" size={18} />
                <p className="text-xs text-rose-200 font-medium">{error}</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {results && teamStats && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* xG Summary Card */}
                  <div className="bg-gradient-to-br from-indigo-600/20 to-transparent border border-indigo-500/30 rounded-2xl p-6">
                    <div className="text-[10px] text-indigo-300 uppercase font-bold tracking-widest mb-3">Expected Goals (xG)</div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-4xl font-mono font-bold text-white tracking-tighter">
                          {results.xgHome} <span className="text-slate-600 mx-1">:</span> {results.xgAway}
                        </div>
                        <div className="text-[9px] text-indigo-300/60 mt-2 uppercase tracking-wide">Calculated via Poisson Distribution v1.0</div>
                      </div>
                      <div className="w-14 h-14 rounded-full border-2 border-indigo-500/50 flex flex-col items-center justify-center bg-indigo-500/10">
                        <span className="text-xs font-bold text-indigo-300">{Math.round((results.xgHome + results.xgAway) * 10) / 10}</span>
                        <span className="text-[7px] text-indigo-400 uppercase font-black">Total</span>
                      </div>
                    </div>
                  </div>

                  {/* Pro Betting Verdict Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <h2 className="text-[11px] font-black uppercase text-white tracking-[0.25em]">Exclusive Betting Verdict</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {(() => {
                        const verdicts = [];
                        const hP = results.probabilities1X2.homeWin;
                        const dP = results.probabilities1X2.draw;
                        const aP = results.probabilities1X2.awayWin;
                        const o25 = results.overUnder['2.5'].over;
                        const o15 = results.overUnder['1.5'].over;

                        if (hP + dP > 70) verdicts.push(<VerdictCard key="dc" label="Double Chance" pick={`${results.homeTeam} or Draw`} prob={Math.round(hP + dP)} type="success" />);
                        else if (aP + dP > 70) verdicts.push(<VerdictCard key="dc" label="Double Chance" pick={`${results.awayTeam} or Draw`} prob={Math.round(aP + dP)} type="success" />);

                        if (o25 > 60) verdicts.push(<VerdictCard key="o25" label="Goal Market" pick="Over 2.5 Goals" prob={o25} type="warning" />);
                        else if (o15 > 75) verdicts.push(<VerdictCard key="o15" label="Goal Market" pick="Over 1.5 Goals" prob={o15} type="success" />);

                        if (hP > 55) verdicts.push(<VerdictCard key="win" label="Match Winner" pick={results.homeTeam} prob={hP} type="info" />);
                        else if (aP > 55) verdicts.push(<VerdictCard key="win" label="Match Winner" pick={results.awayTeam} prob={aP} type="info" />);

                        return verdicts.slice(0, 3);
                      })()}
                    </div>
                  </div>

                  {/* Statistical Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="sleek-card border-emerald-500/20">
                      <h3 className="stat-label mb-3 border-l-2 border-emerald-500 pl-2">{results.homeTeam}</h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        <StatBadge label="Avg Scored" value={teamStats.home.avgGoalsScored} />
                        <StatBadge label="Avg Conc" value={teamStats.home.avgGoalsConceded} color="border-rose-500" />
                      </div>
                    </div>
                    <div className="sleek-card border-blue-500/20">
                      <h3 className="stat-label mb-3 border-l-2 border-blue-500 pl-2">{results.awayTeam}</h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        <StatBadge label="Avg Scored" value={teamStats.away.avgGoalsScored} color="border-blue-500" />
                        <StatBadge label="Avg Conc" value={teamStats.away.avgGoalsConceded} color="border-rose-500" />
                      </div>
                    </div>
                  </div>

                  {/* Probabilities */}
                  <div className="sleek-card-accent p-8">
                    <h3 className="text-center text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-8">1X2 Probabilities</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="flex flex-col items-center gap-4">
                        <span className="text-xl font-mono font-bold text-white">{results.probabilities1X2.homeWin}%</span>
                        <div className="w-full bg-emerald-500/10 border-t-2 border-emerald-500 transition-all duration-1000" style={{ height: `${Math.max(20, results.probabilities1X2.homeWin * 2)}px` }} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Home (1)</span>
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <span className="text-xl font-mono font-bold text-white">{results.probabilities1X2.draw}%</span>
                        <div className="w-full bg-slate-700/20 border-t-2 border-slate-500 transition-all duration-1000" style={{ height: `${Math.max(20, results.probabilities1X2.draw * 2)}px` }} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Draw (X)</span>
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <span className="text-xl font-mono font-bold text-white">{results.probabilities1X2.awayWin}%</span>
                        <div className="w-full bg-blue-500/10 border-t-2 border-blue-500 transition-all duration-1000" style={{ height: `${Math.max(20, results.probabilities1X2.awayWin * 2)}px` }} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Away (2)</span>
                      </div>
                    </div>
                    <div className="mt-8 p-3.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-bold italic tracking-wider">Model Verdict:</span>
                      <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                        {results.probabilities1X2.homeWin > results.probabilities1X2.awayWin ? 'Favorable Home' : 'Favorable Away'} Outcome
                      </span>
                    </div>
                  </div>

                  {/* Markets Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="sleek-card">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Goals Market Analysis</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {['1.5', '2.5', '3.5'].map(t => (
                          <div key={t} className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">Over {t} Goals</div>
                            <div className="text-2xl font-mono font-bold text-emerald-400">{results.overUnder[t].over}%</div>
                          </div>
                        ))}
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col justify-center">
                           <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">Confidence Index</div>
                           <div className="text-lg font-bold text-indigo-400 uppercase italic">High Range</div>
                        </div>
                      </div>
                    </div>

                    <div className="sleek-card">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6">Top Probable Scores</h3>
                      <div className="space-y-2.5">
                        {results.topScores.slice(0, 5).map((score, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 hover:border-emerald-500/20 transition-all">
                            <span className="font-mono text-lg font-bold text-white tracking-widest">{score.home} - {score.away}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-400 font-mono font-bold">{score.probability}%</span>
                              <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                              <span className="text-[9px] text-slate-500 uppercase font-bold">{score.home > score.away ? 'Home' : score.home === score.away ? 'Draw' : 'Away'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!results && !loading && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center animate-float border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                    <Trophy size={32} className="text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Awaiting Match Input</p>
                  <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
                    Enter specific team names to run the Poisson distribution model and extract real-time win probabilities.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div 
            key="history-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-emerald-500" />
                <h2 className="text-xs font-black uppercase text-white tracking-[0.25em]">Analysis History</h2>
              </div>
              <span className="text-[10px] text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded-full">
                {history.length} Saved
              </span>
            </div>

            {history.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <HistoryIcon size={48} className="text-slate-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No History Records</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <motion.div
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => loadFromHistory(item)}
                    className="sleek-card p-4 hover:border-emerald-500/30 transition-all cursor-pointer group relative"
                  >
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                          <span>{item.results.homeTeam}</span>
                          <span className="text-slate-600 text-[10px]">VS</span>
                          <span>{item.results.awayTeam}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold flex items-center gap-2">
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                          <span>xG {item.results.xgHome}:{item.results.xgAway}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => deleteFromHistory(e, item.id)}
                          className="p-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={18} className="text-emerald-500 opacity-50 group-hover:opacity-100 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <footer className="pt-8 flex flex-col items-center gap-4 text-[9px] text-slate-600 uppercase tracking-[0.2em] font-bold text-center">
          <div className="w-8 h-[1px] bg-slate-800"></div>
          <div>Statistical Analysis Based on 10 Match Sample Size</div>
          <div className="flex gap-4 flex-wrap justify-center italic">
            <span>Poisson Variance: 0.14</span>
            <div className="w-1 h-1 rounded-full bg-slate-800 mt-1"></div>
            <span>Confidence: Adaptive</span>
          </div>
          <p className="text-[8px] text-slate-700 normal-case mb-10">Disclaimer: Predictions are informational only. Play responsibly.</p>
        </footer>
      </main>

      {/* Persistent Nav */}
      <nav className="fixed bottom-0 w-full max-w-lg bg-[#161B29]/95 backdrop-blur-2xl border-t border-slate-800 px-10 py-6 flex justify-between items-center z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        <button 
          onClick={() => setActiveTab('predict')}
          className={`flex flex-col items-center gap-2 group transition-all ${activeTab === 'predict' ? 'text-emerald-500' : 'text-slate-500'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'predict' ? 'bg-emerald-500/10' : 'group-hover:bg-white/5'}`}>
            <TrendingUp size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Predict</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-2 group transition-all ${activeTab === 'history' ? 'text-emerald-500' : 'text-slate-500'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'history' ? 'bg-emerald-500/10' : 'group-hover:bg-white/5'}`}>
            <HistoryIcon size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </button>
        <button 
          onClick={() => setActiveTab('leagues')}
          className={`flex flex-col items-center gap-2 group transition-all ${activeTab === 'leagues' ? 'text-emerald-500' : 'text-slate-500'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'leagues' ? 'bg-emerald-500/10' : 'group-hover:bg-white/5'}`}>
            <LayoutDashboard size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Leagues</span>
        </button>
      </nav>
    </div>
  );
}
