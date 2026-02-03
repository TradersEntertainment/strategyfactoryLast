import React, { useState, useEffect } from 'react';
import { PRESET_STRATEGIES } from './constants';
import { Candle, StrategyConfig, BacktestResult, Timeframe } from './types';
import ChartArea from './components/ChartArea';
import StrategyPanel from './components/StrategyPanel';
import DeployModal from './components/DeployModal';
import { analyzeChartPoints } from './services/geminiService';
import { runBacktest } from './services/backtestEngine';
import { fetchBinanceData } from './services/marketService';
import { BrainCircuit, Wallet, PlayCircle, LayoutDashboard, LogOut, CheckCircle2, Activity, Zap, Library, Save, Cpu, RefreshCcw, TrendingUp, Search } from 'lucide-react';

const App: React.FC = () => {
    // State
    const [data, setData] = useState<Candle[]>([]);
    const [strategy, setStrategy] = useState<StrategyConfig | null>(null);
    const [backtest, setBacktest] = useState<BacktestResult | null>(null);
    const [alternatives, setAlternatives] = useState<StrategyConfig[]>([]);
    const [savedStrategies, setSavedStrategies] = useState<StrategyConfig[]>([]);

    // Market State
    const [symbol, setSymbol] = useState('BTCUSDT');
    const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.H1);
    const [loadingData, setLoadingData] = useState(false);

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [userPrompt, setUserPrompt] = useState('');
    const [walletConnected, setWalletConnected] = useState(false);
    const [paperTradingActive, setPaperTradingActive] = useState(false);
    const [liveMode, setLiveMode] = useState(false);
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SAVED'>('DASHBOARD');
    const [isManualMode, setIsManualMode] = useState(false);

    // Load Real Data
    const loadMarketData = async () => {
        setLoadingData(true);
        try {
            const candles = await fetchBinanceData(symbol, timeframe, 10000);
            setData(candles);
            if (strategy) {
                const btResult = runBacktest(strategy, candles);
                setBacktest(btResult);
            }
        } catch (e) {
            console.error("Market data load failed", e);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadMarketData();
    }, [symbol, timeframe]);

    // Load Saved Strategies
    useEffect(() => {
        const saved = localStorage.getItem('my_strategies');
        if (saved) {
            try {
                setSavedStrategies(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load strategies", e);
            }
        }
    }, []);

    // Handlers
    const handleUpdateStrategy = (newConfig: StrategyConfig) => {
        setStrategy(newConfig);
        if (data.length > 0) {
            const btResult = runBacktest(newConfig, data);
            setBacktest(btResult);
        }
    };

    const handleSaveStrategy = (config: StrategyConfig) => {
        const newStrategy = {
            ...config,
            id: config.id || Math.random().toString(36).substring(2, 11),
            createdAt: config.createdAt || Date.now()
        };
        setStrategy(newStrategy);
        setSavedStrategies(prev => {
            const others = prev.filter(s => s.id !== newStrategy.id);
            const updatedList = [newStrategy, ...others];
            localStorage.setItem('my_strategies', JSON.stringify(updatedList));
            return updatedList;
        });
    };

    const handleDeleteStrategy = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedList = savedStrategies.filter(s => s.id !== id);
        setSavedStrategies(updatedList);
        localStorage.setItem('my_strategies', JSON.stringify(updatedList));
    };

    const handleGenerateStrategy = async () => {
        if (userPrompt.length < 5) {
            alert("Please describe a strategy.");
            return;
        }

        setIsGenerating(true);
        setStrategy(null);
        setBacktest(null);
        setAlternatives([]);

        try {
            const generatedStrategies = await analyzeChartPoints(data, userPrompt);

            if (generatedStrategies.length > 0) {
                // Run backtests for all and pick the best one for main view
                const tested = generatedStrategies.map(s => ({
                    strategy: s,
                    result: runBacktest(s, data)
                }));

                // Sort by PnL
                tested.sort((a, b) => b.result.totalPnL - a.result.totalPnL);

                setStrategy(tested[0].strategy);
                setBacktest(tested[0].result);
                setAlternatives(tested.slice(1).map(t => t.strategy));
            }
        } catch (e) {
            console.error(e);
            alert("Failed to generate strategy.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSwitchStrategy = (alt: StrategyConfig) => {
        const main = strategy;
        if (!main) return;

        setStrategy(alt);
        setBacktest(runBacktest(alt, data));
        setAlternatives(prev => [main, ...prev.filter(s => s.name !== alt.name)]);
    };

    const handleDeployClick = () => {
        if (!walletConnected) {
            alert("Connect wallet first.");
            return;
        }
        if (backtest?.maxDrawdown && backtest.maxDrawdown > 0.15) {
            const confirm = window.confirm("Warning: This strategy has high drawdown. Are you sure you want to deploy?");
            if (!confirm) return;
        }
        setShowDeployModal(true);
    };

    const handleLoadPreset = (preset: StrategyConfig) => {
        setStrategy(preset);
        setUserPrompt(`Loaded: ${preset.name}`);
        const btResult = runBacktest(preset, data);
        setBacktest(btResult);
        setAlternatives([]);
        setActiveTab('DASHBOARD');
    };

    const handleRealDeploy = async (agentKey: string) => {
        try {
            setShowDeployModal(false);
            const response = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ strategy, agentKey })
            });
            const result = await response.json();
            if (result.success) {
                setLiveMode(true);
                alert("Strategy Deployed to Hyperliquid!");
            } else {
                alert("Deployment failed: " + result.error);
            }
        } catch (e) {
            alert("Failed to connect to Strategy Server.");
        }
    };

    return (
        <div className="min-h-screen flex bg-[#0f1115] text-gray-200 font-sans selection:bg-indigo-500 selection:text-white">
            {strategy && (
                <DeployModal isOpen={showDeployModal} strategy={strategy} onClose={() => setShowDeployModal(false)} onDeploy={handleRealDeploy} />
            )}

            {/* Sidebar - Mobile Responsive */}
            <aside className="fixed inset-y-0 left-0 w-16 lg:static lg:w-64 border-r border-gray-800 flex flex-col items-center lg:items-stretch py-6 flex-shrink-0 bg-[#0f1115] z-30 transition-all">
                <div className="mb-8 px-4 flex items-center gap-3 justify-center lg:justify-start">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <BrainCircuit className="text-white w-5 h-5" />
                    </div>
                    <span className="hidden lg:block font-bold text-lg tracking-tight text-white">Strategy<span className="text-indigo-400">Factory</span></span>
                </div>

                <nav className="flex-1 w-full space-y-2 px-2">
                    <button onClick={() => setActiveTab('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'DASHBOARD' ? 'bg-[#1e293b] text-white border border-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}>
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="hidden lg:block font-medium text-sm">Dashboard</span>
                    </button>
                    <button onClick={() => setActiveTab('SAVED')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'SAVED' ? 'bg-[#1e293b] text-white border border-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}>
                        <Save className="w-5 h-5" />
                        <span className="hidden lg:block font-medium text-sm">My Strategies</span>
                    </button>

                    {alternatives.length > 0 && activeTab === 'DASHBOARD' && (
                        <div className="mt-6 pt-4 border-t border-gray-800 px-4">
                            <p className="text-[10px] text-gray-500 uppercase font-black mb-2 hidden lg:block tracking-widest">AI Alternatives</p>
                            <div className="space-y-2 hidden lg:block">
                                {alternatives.map((alt, i) => (
                                    <div
                                        key={i}
                                        onClick={() => handleSwitchStrategy(alt)}
                                        className="group cursor-pointer bg-indigo-900/10 hover:bg-indigo-900/20 border border-indigo-500/10 p-2 rounded-lg transition-all"
                                    >
                                        <div className="text-[11px] font-bold text-indigo-300 group-hover:text-indigo-200 truncate">{alt.name}</div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="text-[9px] text-gray-500">{alt.stopLossPct * 100}% SL</span>
                                            <span className="text-[9px] text-indigo-500/50">•</span>
                                            <span className="text-[9px] text-emerald-500">Positive Result</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </nav>

                <div className="px-4 pb-4 w-full flex flex-col gap-4">
                    <button onClick={() => setWalletConnected(!walletConnected)} className={`w-full flex items-center justify-center lg:justify-start gap-2 px-4 py-3 rounded-xl border transition-all ${walletConnected ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' : 'bg-indigo-600 hover:bg-indigo-700 border-transparent text-white shadow-lg shadow-indigo-900/50'}`}>
                        <Wallet className="w-4 h-4" />
                        <span className="hidden lg:block text-sm font-semibold">{walletConnected ? '0x71...3A' : 'Connect Wallet'}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Header - Mobile Responsive */}
                <header className="h-auto min-h-[4rem] border-b border-gray-800 flex flex-col lg:flex-row items-center justify-between gap-4 px-4 lg:px-8 py-4 bg-[#0f1115]/95 backdrop-blur z-20">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 lg:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                className="bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 w-full lg:w-40"
                            />
                        </div>
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value={Timeframe.M15}>15 Minutes</option>
                            <option value={Timeframe.H1}>1 Hour</option>
                            <option value={Timeframe.H4}>4 Hours</option>
                            <option value={Timeframe.D1}>1 Day</option>
                        </select>
                        {loadingData && <RefreshCcw className="w-4 h-4 text-indigo-500 animate-spin" />}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="flex items-center gap-2 text-[10px] lg:text-xs text-emerald-400 bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-900/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            AI Active
                        </div>
                        <div className="flex items-center gap-2 text-[10px] lg:text-sm text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
                            <Cpu className="w-3.5 h-3.5 lg:w-4 h-4 text-indigo-500" />
                            Socket Local
                        </div>
                    </div>
                </header>

                {/* Content Grid */}
                <div className="flex-1 overflow-hidden p-6">
                    {activeTab === 'SAVED' ? (
                        <div className="h-full overflow-y-auto pb-20">
                            <h2 className="text-xl lg:text-2xl font-bold mb-6">Saved Strategies</h2>
                            {savedStrategies.length === 0 ? (
                                <div className="text-center py-20 text-gray-500 bg-[#1e293b] rounded-xl border border-gray-700">
                                    <Save className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No strategies saved yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {savedStrategies.map(s => (
                                        <div key={s.id} className="bg-[#1e293b] border border-gray-700 rounded-xl p-5 hover:border-indigo-500 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-white text-lg">{s.name}</h3>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleLoadPreset(s)} className="text-indigo-400 hover:text-white bg-indigo-900/30 p-1.5 rounded"><PlayCircle className="w-4 h-4" /></button>
                                                    <button onClick={(e) => handleDeleteStrategy(s.id!, e)} className="text-gray-500 hover:text-red-400 bg-gray-800 p-1.5 rounded"><LogOut className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">{s.description}</p>
                                            <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-700 pt-3">
                                                <span className="uppercase font-bold tracking-widest">{s.timeframe}</span>
                                                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">Saved Strateji</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-6 h-full overflow-y-auto pb-40">
                            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                                <ChartArea data={data} trades={backtest?.trades || []} strategy={strategy} symbol={symbol} timeframe={timeframe} />

                                <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-4 lg:p-6 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <BrainCircuit className="w-32 h-32" />
                                    </div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-indigo-400" />
                                            Deep Analysis Generation
                                        </h3>
                                        <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded">MULTI-STRATEGY</span>
                                    </div>
                                    <div className="flex flex-col gap-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                                                <Library className="w-3 h-3" /> Templates
                                            </label>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                                {PRESET_STRATEGIES.map((preset, idx) => (
                                                    <button key={idx} onClick={() => handleLoadPreset(preset)} className="text-left p-2.5 rounded-xl border border-gray-700/50 bg-[#0f1115] hover:bg-gray-800 hover:border-indigo-500 transition-all group">
                                                        <div className="font-bold text-[10px] lg:text-[11px] text-gray-300 group-hover:text-white truncate">{preset.name}</div>
                                                        <div className="text-[8px] lg:text-[9px] text-gray-600 group-hover:text-gray-400 mt-1 uppercase tracking-tighter">{preset.timeframe}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col lg:flex-row gap-4">
                                            <textarea
                                                value={userPrompt}
                                                onChange={(e) => setUserPrompt(e.target.value)}
                                                placeholder="Describe your strategy. Example: 'Look for EMA 20 crossing 50 on short term trends with RSI confirmation.'"
                                                className="flex-1 bg-[#0f1115] border border-gray-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-28 text-gray-300 placeholder-gray-600"
                                            />
                                            <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-44">
                                                <button onClick={() => { setStrategy(null); setBacktest(null); setUserPrompt(''); setAlternatives([]); }} className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:text-white border border-gray-800 rounded-xl hover:bg-gray-800 transition-all">Clear</button>
                                                <button onClick={handleGenerateStrategy} disabled={isGenerating} className="flex-[2] bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-30 relative group shadow-xl">
                                                    {isGenerating ? (
                                                        <span className="flex items-center justify-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Crafting</span>
                                                    ) : (
                                                        <span className="flex items-center justify-center gap-2"><BrainCircuit className="w-4 h-4" /> Generate</span>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-12 lg:col-span-4 h-full border-t lg:border-t-0 lg:border-l border-gray-800 pt-8 lg:pt-0 lg:pl-6 overflow-y-visible">
                                <StrategyPanel
                                    strategy={strategy}
                                    backtest={backtest}
                                    data={data}
                                    isGenerating={isGenerating}
                                    onUpdateStrategy={handleUpdateStrategy}
                                    onSaveStrategy={handleSaveStrategy}
                                />
                                {strategy && backtest && (
                                    <div className="mt-6 space-y-3">
                                        <button onClick={() => setPaperTradingActive(!paperTradingActive)} className={`w-full py-4 font-black text-xs uppercase tracking-widest rounded-xl transition-all border ${paperTradingActive ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                                            {paperTradingActive ? 'Stop Paper Trading' : 'Start Paper Trading'}
                                        </button>
                                        {paperTradingActive && (
                                            <button onClick={handleDeployClick} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 transition-all outline-none">
                                                Deploy Strategy to Hyperliquid
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;