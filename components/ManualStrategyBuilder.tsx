import React, { useState } from 'react';
import { StrategyConfig, StrategyCondition, Timeframe, Candle } from '../types';
import { Plus, Trash2, Sliders, LineChart, Activity, Zap, Shield, Cpu, CheckCircle2, X, Loader2, ArrowRight } from 'lucide-react';
import { optimizeStrategy, OptimizationResult } from '../services/optimizerEngine';

interface ManualStrategyBuilderProps {
    strategy: StrategyConfig;
    data: Candle[];
    onChange: (strategy: StrategyConfig) => void;
}

const INDICATORS = [
    { id: 'RSI', label: 'RSI (Relative Strength)', icon: Activity },
    { id: 'EMA_CROSS', label: 'EMA Crossover', icon: Zap },
    { id: 'SMA_CROSS', label: 'SMA Crossover', icon: LineChart },
    { id: 'MACD', label: 'MACD Convergence', icon: Sliders },
    { id: 'BOLLINGER', label: 'Bollinger Bands', icon: Activity },
];

const OPERATORS = [
    { id: '>', label: 'Greater Than (>)' },
    { id: '<', label: 'Less Than (<)' },
    { id: 'crosses_above', label: 'Crosses Above' },
    { id: 'crosses_below', label: 'Crosses Below' },
];

const ManualStrategyBuilder: React.FC<ManualStrategyBuilderProps> = ({ strategy, data, onChange }) => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optProgress, setOptProgress] = useState(0);
    const [optResults, setOptResults] = useState<OptimizationResult[] | null>(null);

    const handleRunOptimizer = async (lookback?: number) => {
        if (strategy.entryConditions.length < 1) {
            alert("Add at least one entry condition to optimize.");
            return;
        }
        setIsOptimizing(true);
        setOptProgress(0);
        setOptResults(null);

        try {
            const configWithLookback = { ...strategy, lookbackCandles: lookback || 0 };
            const results = await optimizeStrategy(configWithLookback, data, (p) => setOptProgress(p));
            setOptResults(results);
        } catch (e) {
            console.error("Optimization failed", e);
        } finally {
            setIsOptimizing(false);
        }
    };

    const applyOptimization = (newConfig: StrategyConfig) => {
        onChange(newConfig);
        setOptResults(null);
    };

    const addCondition = (type: 'entry' | 'exit') => {
        const newCond: StrategyCondition = {
            indicator: 'RSI',
            params: { period: 14 },
            operator: '<',
            value: 30
        };

        if (type === 'entry') {
            onChange({ ...strategy, entryConditions: [...strategy.entryConditions, newCond] });
        } else {
            onChange({ ...strategy, exitConditions: [...strategy.exitConditions, newCond] });
        }
    };

    const setSide = (side: 'LONG' | 'SHORT') => {
        onChange({ ...strategy, side });
    };

    const removeCondition = (type: 'entry' | 'exit', index: number) => {
        if (type === 'entry') {
            const newConds = [...strategy.entryConditions];
            newConds.splice(index, 1);
            onChange({ ...strategy, entryConditions: newConds });
        } else {
            const newConds = [...strategy.exitConditions];
            newConds.splice(index, 1);
            onChange({ ...strategy, exitConditions: newConds });
        }
    };

    const updateCondition = (type: 'entry' | 'exit', index: number, updates: Partial<StrategyCondition>) => {
        const conditions = type === 'entry' ? [...strategy.entryConditions] : [...strategy.exitConditions];
        conditions[index] = { ...conditions[index], ...updates };

        if (type === 'entry') {
            onChange({ ...strategy, entryConditions: conditions });
        } else {
            onChange({ ...strategy, exitConditions: conditions });
        }
    };

    const renderCondition = (cond: StrategyCondition, index: number, type: 'entry' | 'exit') => {
        const Icon = INDICATORS.find(i => i.id === cond.indicator)?.icon || Activity;

        return (
            <div key={index} className="bg-[#1e293b]/50 border border-gray-700/50 p-4 rounded-xl mb-3 flex flex-col gap-3 group hover:border-indigo-500/30 transition-all duration-300">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                            <Icon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <select
                            value={cond.indicator}
                            onChange={(e) => updateCondition(type, index, { indicator: e.target.value as any })}
                            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
                        >
                            {INDICATORS.map(i => <option key={i.id} value={i.id} className="bg-[#0f172a]">{i.label}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => removeCondition(type, index)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {/* Operator Select */}
                    <div className="col-span-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Logic</label>
                        <select
                            value={cond.operator}
                            onChange={(e) => updateCondition(type, index, { operator: e.target.value as any })}
                            className="w-full bg-[#0f172a] border border-gray-700/50 rounded px-2 py-1.5 text-xs text-indigo-200 focus:outline-none focus:border-indigo-500 transition-colors"
                        >
                            {OPERATORS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Value Input */}
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Value</label>
                        <input
                            type="number"
                            value={cond.value}
                            onChange={(e) => updateCondition(type, index, { value: parseFloat(e.target.value) })}
                            className="w-full bg-[#0f172a] border border-gray-700/50 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Dynamic Params based on indicator */}
                <div className="flex flex-wrap gap-4 p-2 bg-black/20 rounded-lg">
                    {cond.indicator === 'RSI' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 font-bold">PERIOD:</span>
                            <input
                                type="number"
                                value={cond.params.period}
                                onChange={(e) => updateCondition(type, index, { params: { ...cond.params, period: parseInt(e.target.value) } })}
                                className="bg-transparent text-[10px] text-indigo-400 w-8 focus:outline-none font-mono"
                            />
                        </div>
                    )}
                    {(cond.indicator === 'EMA_CROSS' || cond.indicator === 'SMA_CROSS') && (
                        <>
                            <div className="flex items-center gap-2 border-r border-gray-800 pr-3">
                                <span className="text-[10px] text-gray-500 font-bold">FAST:</span>
                                <input
                                    type="number"
                                    value={cond.params.fast}
                                    onChange={(e) => updateCondition(type, index, { params: { ...cond.params, fast: parseInt(e.target.value) } })}
                                    className="bg-transparent text-[10px] text-emerald-400 w-8 focus:outline-none font-mono"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 font-bold">SLOW:</span>
                                <input
                                    type="number"
                                    value={cond.params.slow}
                                    onChange={(e) => updateCondition(type, index, { params: { ...cond.params, slow: parseInt(e.target.value) } })}
                                    className="bg-transparent text-[10px] text-orange-400 w-8 focus:outline-none font-mono"
                                />
                            </div>
                        </>
                    )}
                    {cond.indicator === 'MACD' && (
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500 font-bold">F:</span>
                                <input type="number" value={cond.params.fast} onChange={(e) => updateCondition(type, index, { params: { ...cond.params, fast: parseInt(e.target.value) } })} className="bg-transparent text-[10px] text-indigo-400 w-6 focus:outline-none font-mono" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500 font-bold">S:</span>
                                <input type="number" value={cond.params.slow} onChange={(e) => updateCondition(type, index, { params: { ...cond.params, slow: parseInt(e.target.value) } })} className="bg-transparent text-[10px] text-indigo-400 w-6 focus:outline-none font-mono" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500 font-bold">SIG:</span>
                                <input type="number" value={cond.params.signal} onChange={(e) => updateCondition(type, index, { params: { ...cond.params, signal: parseInt(e.target.value) } })} className="bg-transparent text-[10px] text-indigo-400 w-6 focus:outline-none font-mono" />
                            </div>
                        </div>
                    )}
                    {cond.indicator === 'BOLLINGER' && (
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500 font-bold">P:</span>
                                <input type="number" value={cond.params.period} onChange={(e) => updateCondition(type, index, { params: { ...cond.params, period: parseInt(e.target.value) } })} className="bg-transparent text-[10px] text-indigo-400 w-8 focus:outline-none font-mono" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-500 font-bold">SD:</span>
                                <input type="number" step="0.1" value={cond.params.stdDev} onChange={(e) => updateCondition(type, index, { params: { ...cond.params, stdDev: parseFloat(e.target.value) } })} className="bg-transparent text-[10px] text-indigo-400 w-6 focus:outline-none font-mono" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 relative">
            {/* Strategy Direction */}
            <section className="bg-indigo-950/20 border border-indigo-500/10 p-4 rounded-2xl flex items-center justify-between">
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Trade Direction</h4>
                    <p className="text-[10px] text-gray-500 italic">Should this strategy open Long or Short?</p>
                </div>
                <div className="flex bg-black/40 p-1 rounded-xl border border-gray-800">
                    <button
                        onClick={() => setSide('LONG')}
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${strategy.side !== 'SHORT' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        LONG
                    </button>
                    <button
                        onClick={() => setSide('SHORT')}
                        className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${strategy.side === 'SHORT' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        SHORT
                    </button>
                </div>
            </section>

            {/* AI Optimizer Access */}
            <div className="space-y-3">
                <button
                    onClick={() => handleRunOptimizer()}
                    disabled={isOptimizing}
                    className="w-full bg-[#312e81] hover:bg-[#3730a3] border border-indigo-400/30 p-4 rounded-2xl flex items-center justify-between group transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 bg-indigo-500/20 rounded-xl ${isOptimizing ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`}>
                            {isOptimizing ? <Loader2 className="w-5 h-5 text-indigo-300 animate-spin" /> : <Cpu className="w-5 h-5 text-indigo-300" />}
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-black text-white uppercase tracking-tighter">Machine Binary Optimizer</div>
                            <div className="text-[10px] text-indigo-300/70">Find the ideal combination (All History)</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isOptimizing && !strategy.lookbackCandles && <span className="text-[10px] font-mono text-indigo-300">{optProgress.toFixed(0)}%</span>}
                        <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

                <button
                    onClick={() => handleRunOptimizer(1000)}
                    disabled={isOptimizing}
                    className="w-full bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-500/20 p-3 rounded-2xl flex items-center justify-between group transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                            <Activity className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <div className="text-xs font-bold text-emerald-100 uppercase tracking-tighter">Stress Test: Last 1000 Candles</div>
                            <div className="text-[9px] text-emerald-400/60">Verify if strategy works in recent market conditions</div>
                        </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Optimization Results Overlay */}
            {optResults && (
                <div className="absolute inset-0 z-50 bg-[#0f1115]/95 backdrop-blur-md rounded-2xl border border-indigo-500/30 p-6 flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-lg font-bold text-white">Optimization Complete</h3>
                        </div>
                        <button onClick={() => setOptResults(null)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Best Variations Found:</div>
                        {optResults.map((res, i) => (
                            <div key={i} className="bg-[#1e293b] border border-gray-700/50 p-4 rounded-xl flex flex-col gap-3 group hover:border-indigo-500/40 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        {res.category && (
                                            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                                {res.category}
                                            </div>
                                        )}
                                        <div className="text-xs font-bold text-white mb-1">{res.config.name}</div>
                                        <div className="flex flex-wrap gap-1">
                                            {res.config.entryConditions.map((c, j) => (
                                                <span key={j} className="text-[8px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">{c.indicator}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-emerald-400">${res.stats.totalPnL.toFixed(0)}</div>
                                        <div className="text-[10px] text-gray-500">{res.stats.totalTrades} trades / {(res.stats.winRate * 100).toFixed(1)}% WR</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => applyOptimization(res.config)}
                                    className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[10px] font-bold rounded-lg border border-indigo-600/30 transition-all"
                                >
                                    APPLY THIS VERSION
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Entry Conditions Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                        <h4 className="text-sm font-bold text-gray-200 uppercase tracking-widest">Entry Conditions</h4>
                    </div>
                    <button
                        onClick={() => addCondition('entry')}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 transition-all font-mono"
                    >
                        <Plus className="w-3 h-3" /> ADD RULE
                    </button>
                </div>
                <div className="space-y-3">
                    {strategy.entryConditions.map((c, i) => renderCondition(c, i, 'entry'))}
                    {strategy.entryConditions.length === 0 && (
                        <div className="p-8 border-2 border-dashed border-gray-800 rounded-2xl text-center text-gray-600 text-xs italic">
                            No entry rules defined. All conditions use AND logic.
                        </div>
                    )}
                </div>
            </section>

            {/* Exit Conditions Section */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-6 bg-red-500 rounded-full" />
                        <h4 className="text-sm font-bold text-gray-200 uppercase tracking-widest">Technical Exits</h4>
                    </div>
                    <button
                        onClick={() => addCondition('exit')}
                        className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-500/20 transition-all font-mono"
                    >
                        <Plus className="w-3 h-3" /> ADD RULE
                    </button>
                </div>
                <div className="space-y-3">
                    {strategy.exitConditions.map((c, i) => renderCondition(c, i, 'exit'))}
                    {strategy.exitConditions.length === 0 && (
                        <div className="p-4 bg-gray-900/40 rounded-xl text-center text-gray-500 text-[10px] italic border border-gray-800/50">
                            Optional: Strategy will exit via SL/TP if no technical rules are added.
                        </div>
                    )}
                </div>
            </section>

            {/* Risk Parameters Quick Access */}
            <section className={`bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-3xl relative overflow-hidden group transition-all duration-500 ${strategy.riskParametersEnabled === false ? 'opacity-60 saturate-50' : ''}`}>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Shield className="w-16 h-16 text-indigo-400" />
                </div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${strategy.riskParametersEnabled === false ? 'text-gray-500' : 'text-indigo-400'}`} />
                        <h4 className="text-sm font-bold text-gray-200 tracking-wide">Risk Safeguards</h4>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={strategy.riskParametersEnabled !== false}
                            onChange={(e) => onChange({ ...strategy, riskParametersEnabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{strategy.riskParametersEnabled === false ? 'OFF' : 'ON'}</span>
                    </label>
                </div>
                <div className={`grid grid-cols-2 gap-4 relative z-10 transition-all ${strategy.riskParametersEnabled === false ? 'pointer-events-none' : ''}`}>
                    <div className="space-y-1.5">
                        <span className="text-[10px] text-gray-500 font-bold block">STOP LOSS %</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0.1" max="10" step="0.1"
                                value={strategy.stopLossPct * 100}
                                onChange={(e) => onChange({ ...strategy, stopLossPct: parseFloat(e.target.value) / 100 })}
                                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                            <span className="text-[10px] font-mono text-red-400">{(strategy.stopLossPct * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <span className="text-[10px] text-gray-500 font-bold block">TAKE PROFIT %</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="0.1" max="20" step="0.1"
                                value={strategy.takeProfitPct * 100}
                                onChange={(e) => onChange({ ...strategy, takeProfitPct: parseFloat(e.target.value) / 100 })}
                                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-[10px] font-mono text-emerald-400">{(strategy.takeProfitPct * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ManualStrategyBuilder;
