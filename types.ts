
export enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum Timeframe {
  M15 = '15m',
  H1 = '1h',
  H4 = '4h',
  D1 = '1d'
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dateStr: string; // Pre-formatted date for UI
}

export interface StrategyCondition {
  indicator: 'RSI' | 'SMA_CROSS' | 'PRICE_LEVEL' | 'EMA_CROSS' | 'MACD' | 'BOLLINGER';
  params: { [key: string]: number };
  operator: '>' | '<' | 'crosses_above' | 'crosses_below';
  value: number; // threshold
}

export interface StrategyConfig {
  id?: string; // Optional for new, required for saved
  createdAt?: number;
  name: string;
  description: string;
  timeframe: Timeframe;
  entryConditions: StrategyCondition[];
  exitConditions: StrategyCondition[];
  stopLossPct: number;
  takeProfitPct: number;
  riskPerTradePct: number;
  riskParametersEnabled?: boolean; // Toggle for TP/SL
  side: 'LONG' | 'SHORT'; // Strategy direction
  logicExplanation: string; // AI generated explanation
  lookbackCandles?: number; // Last N candles to test
}

export interface Trade {
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  type: OrderType;
  pnl: number;
  pnlPct: number;
  status: 'OPEN' | 'CLOSED';
}

export interface BacktestResult {
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  totalPnL: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: { timestamp: number; equity: number }[];
  trades: Trade[];
  warnings: string[]; // Risk warnings
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  relatedStrategy?: StrategyConfig;
}

export interface HyperliquidConfig {
  agentAddress: string;
  agentPrivateKey: string; // Encrypted in real app
  maxPositionSizeUsd: number;
}