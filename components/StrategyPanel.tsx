import React, { useState, useEffect } from 'react';
import { BacktestResult, StrategyConfig, Candle } from '../types';
import { ShieldCheck, AlertTriangle, Activity, TrendingUp, DollarSign, BrainCircuit, Edit3, Save, Share2, MousePointer2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import ManualStrategyBuilder from './ManualStrategyBuilder';

interface StrategyPanelProps {
    strategy: StrategyConfig | null;
    backtest: BacktestResult | null;
    data: Candle[];
    isGenerating: boolean;
    onUpdateStrategy: (config: StrategyConfig) => void;
    onSaveStrategy?: (strategy: StrategyConfig) => void;
}

// Internal component to handle number inputs smoothly without cursor jumping or formatting fighting
const LiveInput = ({
    value,
    onChange,
    step = "0.1",
    className
}: {
    value: number,
    onChange: (val: number) => void,
    step?: string,
    className?: string
}) => {
    const displayValue = value * 100;
    const [strVal, setStrVal] = useState(displayValue.toString());

    useEffect(() => {
        const currentNum = parseFloat(strVal);
        const propNum = displayValue;
        if (isNaN(currentNum) || Math.abs(currentNum - propNum) > 0.0001) {
            setStrVal(Number.isInteger(propNum) ? propNum.toString() : propNum.toFixed(2));
        }
    }, [displayValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setStrVal(newVal);
        const num = parseFloat(newVal);
        if (!isNaN(num)) {
            onChange(num / 100);
        }
    };

    return (
        <input
            type="number"
            step={step}
            value={strVal}
            onChange={handleChange}
            className={className}
        />
    );
};

const StrategyPanel: React.FC<StrategyPanelProps> = ({ strategy, backtest, data, isGenerating, onUpdateStrategy, onSaveStrategy }) => {
    const [isManualMode, setIsManualMode] = useState(false);

    const handleParamChange = (field: keyof StrategyConfig, value: number) => {
        if (!strategy) return;
        const newStrategy = { ...strategy, [field]: value };
        onUpdateStrategy(newStrategy);
    };

    // Helper to initialize a default strategy for manual mode if none exists
    const ensureManualStrategy = () => {
        if (strategy) return { ...strategy, side: strategy.side || 'LONG' };
        return {
            name: "New Manual Strategy",
            description: "Manually created strategy",
            timeframe: "1h" as any,
            side: 'LONG' as const,
            entryConditions: [],
            exitConditions: [],
            stopLossPct: 0.02,
            takeProfitPct: 0.04,
            riskPerTradePct: 0.01,
            logicExplanation: "Manual build"
        };
    };

    if (isGenerating) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 animate-pulse">
                <BrainCircuit className="w-16 h-16 text-indigo-500 animate-spin-slow" />
                <div className="text-center">
                    <h3 className="text-lg font-medium text-white">Strategy Factory Active</h3>
                    <p className="text-sm text-gray-400">Analyzing price patterns against your description...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 overflow-y-auto h-full pr-2">
            {/* Mode Toggle */}
            <div className="flex bg-[#0f172a] p-1 rounded-xl border border-gray-800 self-start w-fit">
                <button
                    onClick={() => setIsManualMode(false)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isManualMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <BrainCircuit className="w-3.5 h-3.5" /> AI Engine
                </button>
                <button
                    onClick={() => setIsManualMode(true)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isManualMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    <MousePointer2 className="w-3.5 h-3.5" /> Manual Build
                </button>
            </div>

            {!isManualMode ? (
                strategy ? (
                    <>
                        {/* Strategy Identity */}
                        <div className="bg-[#1e293b] p-5 rounded-xl border border-gray-700">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">{strategy.name}</h3>
                                    <span className="text-xs bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700">
                                        AI Generated
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-gray-400">Timeframe</span>
                                    <span className="font-mono text-sm text-white">{strategy.timeframe}</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300 italic border-l-2 border-indigo-500 pl-3 mb-4">
                                "{strategy.logicExplanation}"
                            </p>

                            <div className="grid grid-cols-1 gap-2 text-xs">
                                <div className="bg-[#0f1115] p-3 rounded border border-gray-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-gray-500 font-semibold flex items-center gap-1">
                                            <Edit3 className="w-3 h-3" /> Risk Parameters (Editable)
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-gray-500 mb-1">Stop Loss %</label>
                                            <LiveInput
                                                value={strategy.stopLossPct}
                                                onChange={(val) => handleParamChange('stopLossPct', val)}
                                                className="w-full bg-[#1e293b] border border-gray-700 rounded px-2 py-1 text-red-400 font-mono focus:outline-none focus:border-red-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-500 mb-1">Take Profit %</label>
                                            <LiveInput
                                                value={strategy.takeProfitPct}
                                                onChange={(val) => handleParamChange('takeProfitPct', val)}
                                                className="w-full bg-[#1e293b] border border-gray-700 rounded px-2 py-1 text-green-400 font-mono focus:outline-none focus:border-green-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-500 mb-1">Risk / Trade %</label>
                                            <LiveInput
                                                value={strategy.riskPerTradePct}
                                                onChange={(val) => handleParamChange('riskPerTradePct', val)}
                                                className="w-full bg-[#1e293b] border border-gray-700 rounded px-2 py-1 text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => onSaveStrategy && onSaveStrategy(strategy)}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors shadow-lg shadow-indigo-900/20 border border-indigo-500/50"
                                    >
                                        <Save className="w-3 h-3" />
                                        Save Configs to My Strategies
                                    </button>
                                </div>

                                <div className="bg-[#0f1115] p-3 rounded border border-gray-800 mt-2">
                                    <span className="text-gray-500 block mb-1">Entry Logic</span>
                                    {strategy.entryConditions.map((cond, i) => (
                                        <div key={i} className="text-emerald-400 font-mono text-[10px] break-all">
                                            {cond.indicator} {cond.operator} {cond.value.toFixed(2)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 py-20">
                        <Activity className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-center px-6 text-sm">Describe your trading idea in the text box or switch to **Manual Build** to start.</p>
                    </div>
                )
            ) : (
                <div className="bg-[#1e293b] p-6 rounded-2xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/5">
                    <ManualStrategyBuilder
                        strategy={ensureManualStrategy()}
                        data={data}
                        onChange={onUpdateStrategy}
                    />
                    <button
                        onClick={() => onSaveStrategy && onSaveStrategy(ensureManualStrategy())}
                        className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/40 border border-indigo-400/30"
                    >
                        <Save className="w-4 h-4" />
                        Save Manual Strategy
                    </button>
                </div>
            )}

            {/* Backtest Results */}
            {backtest && (
                <div className="space-y-4 pb-20">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Backtest Performance</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                <TrendingUp className="w-3 h-3" /> Win Rate
                            </div>
                            <div className={`text-2xl font-bold ${backtest.winRate > 0.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {(backtest.winRate * 100).toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                                <span className="text-emerald-400">{backtest.winTrades} wins</span> / <span className="text-red-400">{backtest.lossTrades} losses</span>
                            </div>
                        </div>
                        <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                <DollarSign className="w-3 h-3" /> Total Profit
                            </div>
                            <div className={`text-2xl font-bold ${backtest.totalPnL > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ${backtest.totalPnL.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                                {backtest.totalTrades} Total Trades
                            </div>
                        </div>
                        <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                <ShieldCheck className="w-3 h-3" /> Profit Factor
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {backtest.profitFactor.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700">
                            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                                <AlertTriangle className="w-3 h-3" /> Max DD
                            </div>
                            <div className="text-2xl font-bold text-red-400">
                                {(backtest.maxDrawdown * 100).toFixed(2)}%
                            </div>
                        </div>
                    </div>

                    {/* Equity Curve */}
                    <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700 h-40">
                        <div className="text-xs text-gray-400 mb-2">Equity Curve</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={backtest.equityCurve}>
                                <defs>
                                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip contentStyle={{ backgroundColor: '#0f1115', border: 'none', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="equity" stroke="#22c55e" fill="url(#colorEquity)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Warnings */}
                    {backtest.warnings.length > 0 && (
                        <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-500 text-sm font-semibold mb-1">
                                <AlertTriangle className="w-4 h-4" /> Risk Warnings
                            </div>
                            <ul className="list-disc list-inside text-xs text-yellow-200/70">
                                {backtest.warnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StrategyPanel;
