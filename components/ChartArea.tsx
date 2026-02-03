import React, { useState } from 'react';
import { Candle, Trade, StrategyConfig } from '../types';
import { TrendingUp, Layout } from 'lucide-react';
import CandleChart from './CandleChart';

interface ChartAreaProps {
  data: Candle[];
  trades?: Trade[];
  strategy?: StrategyConfig | null;
  symbol: string;
  timeframe: string;
}

const ChartArea: React.FC<ChartAreaProps> = ({ data, trades = [], strategy, symbol, timeframe }) => {
  return (
    <div className="bg-[#1e293b] rounded-xl border border-gray-700 shadow-xl overflow-hidden flex flex-col h-[400px] lg:h-[550px]">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f1115]">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-gray-100 font-bold flex items-center gap-2">
              {symbol}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Standard Candles</span>
              <span className="w-1 h-1 rounded-full bg-gray-700"></span>
              <span className="text-[10px] text-indigo-400 font-bold">{timeframe} Timeframe</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 uppercase font-bold">Data Range</span>
            <span className="text-xs text-gray-300 font-mono">{data.length} Candles Loaded</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full bg-[#0f1115]">
        <CandleChart data={data} trades={trades} />
      </div>

      {strategy && (
        <div className="p-3 bg-[#0f1115] border-t border-gray-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 uppercase font-bold tracking-tighter">Active Indicators:</span>
            <div className="flex gap-2">
              {strategy.entryConditions.map((c, i) => (
                <span key={i} className="bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800/30">
                  {c.indicator}
                </span>
              ))}
            </div>
          </div>
          <div className="text-gray-500 italic">
            Visualizing Entry/Exit Markers on Candle Bars
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartArea;