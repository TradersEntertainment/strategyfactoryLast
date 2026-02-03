import { BacktestResult, Candle, StrategyConfig, Trade, OrderType, StrategyCondition } from '../types';
import { INITIAL_CAPITAL } from '../constants';

// Helper for Simple Moving Average
const calculateSMA = (data: Candle[], period: number, index: number): number | null => {
  if (index < period - 1) return null;
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[index - i].close;
  }
  return sum / period;
};

// Helper for RSI
const calculateRSI = (data: Candle[], period: number, index: number): number | null => {
  if (index < period) return null;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[index - period + i].close - data[index - period + i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
};

const calculateEMA = (data: Candle[], period: number, index: number): number | null => {
  if (index < period - 1) return null;
  const k = 2 / (period + 1);

  // To avoid O(N^2) or stack overflow, we should ideally pre-calculate this
  // But for the current structure, let's at least make it iterative
  let ema = calculateSMA(data, period, period - 1);
  if (ema === null) return null;

  for (let i = period; i <= index; i++) {
    ema = data[i].close * k + ema * (1 - k);
  }
  return ema;
};

const checkCondition = (cond: StrategyCondition, candle: Candle, data: Candle[], index: number): boolean => {
  const currentPrice = candle.close;

  if (cond.indicator === 'RSI') {
    const rsi = calculateRSI(data, cond.params.period || 14, index);
    if (rsi === null) return false;
    if (cond.operator === '<') return rsi < cond.value;
    if (cond.operator === '>') return rsi > cond.value;
  }

  if (cond.indicator === 'SMA_CROSS') {
    const smaFast = calculateSMA(data, cond.params.fast || 9, index);
    const smaSlow = calculateSMA(data, cond.params.slow || 21, index);
    const prevSmaFast = calculateSMA(data, cond.params.fast || 9, index - 1);
    const prevSmaSlow = calculateSMA(data, cond.params.slow || 21, index - 1);

    if (!smaFast || !smaSlow || !prevSmaFast || !prevSmaSlow) return false;

    if (cond.operator === 'crosses_above') return prevSmaFast < prevSmaSlow && smaFast > smaSlow;
    if (cond.operator === 'crosses_below') return prevSmaFast > prevSmaSlow && smaFast < smaSlow;
  }

  if (cond.indicator === 'EMA_CROSS') {
    const emaFast = calculateEMA(data, cond.params.fast || 12, index);
    const emaSlow = calculateEMA(data, cond.params.slow || 26, index);
    const prevEmaFast = calculateEMA(data, cond.params.fast || 12, index - 1);
    const prevEmaSlow = calculateEMA(data, cond.params.slow || 26, index - 1);

    if (!emaFast || !emaSlow || !prevEmaFast || !prevEmaSlow) return false;

    if (cond.operator === 'crosses_above') return prevEmaFast < prevEmaSlow && emaFast > emaSlow;
    if (cond.operator === 'crosses_below') return prevEmaFast > prevEmaSlow && emaFast < emaSlow;
  }

  if (cond.indicator === 'MACD') {
    const emaFast = calculateEMA(data, cond.params.fast || 12, index);
    const emaSlow = calculateEMA(data, cond.params.slow || 26, index);
    if (!emaFast || !emaSlow) return false;
    const macd = emaFast - emaSlow;
    if (cond.operator === '>') return macd > cond.value;
    if (cond.operator === '<') return macd < cond.value;
  }

  if (cond.indicator === 'BOLLINGER') {
    const period = cond.params.period || 20;
    const stdDevMultiplier = cond.params.stdDev || 2;
    const sma = calculateSMA(data, period, index);
    if (!sma) return false;

    let sumSq = 0;
    for (let i = 0; i < period; i++) {
      sumSq += Math.pow(data[index - i].close - sma, 2);
    }
    const stdDev = Math.sqrt(sumSq / period);
    const upper = sma + stdDevMultiplier * stdDev;
    const lower = sma - stdDevMultiplier * stdDev;

    if (cond.operator === '<') return currentPrice < lower;
    if (cond.operator === '>') return currentPrice > upper;
  }

  if (cond.indicator === 'PRICE_LEVEL') {
    const sma = calculateSMA(data, cond.params.period || 20, index);
    if (!sma) return false;
    if (cond.operator === '>') return currentPrice > sma;
    if (cond.operator === '<') return currentPrice < sma;
  }

  return false;
};

export const runBacktest = (strategy: StrategyConfig, data: Candle[]): BacktestResult => {
  let equity = INITIAL_CAPITAL;
  const trades: Trade[] = [];
  const equityCurve = [{ timestamp: data[0].timestamp, equity }];
  let openTrade: Trade | null = null;

  // Risk Management
  const warnings: string[] = [];
  let maxEquity = equity;
  let maxDrawdown = 0;

  for (let i = 21; i < data.length; i++) {
    const candle = data[i];

    // Check Exits
    if (openTrade) {
      const priceChangePct = (candle.close - openTrade.entryPrice) / openTrade.entryPrice;
      const pnlPct = openTrade.type === OrderType.BUY ? priceChangePct : -priceChangePct;

      let shouldExit = false;
      let exitReason = '';

      // Stop Loss / Take Profit
      if (strategy.riskParametersEnabled !== false) {
        if (pnlPct <= -strategy.stopLossPct) { shouldExit = true; exitReason = 'SL'; }
        if (pnlPct >= strategy.takeProfitPct) { shouldExit = true; exitReason = 'TP'; }
      }

      // Technical Exit
      if (!shouldExit && strategy.exitConditions.length > 0) {
        // AND logic for exits (can be OR depending on complexity, assuming OR for exits usually)
        const isTechnicalExit = strategy.exitConditions.some(cond => checkCondition(cond, candle, data, i));
        if (isTechnicalExit) { shouldExit = true; exitReason = 'Signal'; }
      }

      if (shouldExit) {
        const exitPrice = candle.close;
        const fees = (openTrade.entryPrice * 0.0005) + (exitPrice * 0.0005);

        // PnL Calculation based on LONG/SHORT
        const isLong = openTrade.type === OrderType.BUY;
        const rawPnl = isLong
          ? (exitPrice - openTrade.entryPrice) * (equity / openTrade.entryPrice)
          : (openTrade.entryPrice - exitPrice) * (equity / openTrade.entryPrice);

        const realPnl = rawPnl - (equity * 0.001); // Simplified 0.1% total fee

        equity += realPnl;
        openTrade.exitPrice = exitPrice;
        openTrade.exitTime = candle.timestamp;
        openTrade.pnl = realPnl;
        openTrade.pnlPct = pnlPct;
        openTrade.status = 'CLOSED';
        trades.push(openTrade);
        openTrade = null;
      }
    }

    // Check Entries (only if no open trade)
    if (!openTrade) {
      // AND logic for entries: All conditions must be met
      const signal = strategy.entryConditions.every(cond => checkCondition(cond, candle, data, i));

      if (signal) {
        openTrade = {
          entryTime: candle.timestamp,
          entryPrice: candle.close,
          type: strategy.side === 'SHORT' ? OrderType.SELL : OrderType.BUY,
          pnl: 0,
          pnlPct: 0,
          status: 'OPEN'
        };
      }
    }

    // Update Max Drawdown tracking
    if (equity > maxEquity) maxEquity = equity;
    const drawdown = (maxEquity - equity) / maxEquity;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    equityCurve.push({ timestamp: candle.timestamp, equity });
  }

  // Calculate Stats
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;

  const grossProfit = winningTrades.reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((a, b) => a + b.pnl, 0));
  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : grossProfit / grossLoss;

  // Sharpe Ratio (Simplified annual)
  const returns = equityCurve.map((e, i) => i === 0 ? 0 : (e.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(returns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / returns.length);
  const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(24 * 365); // Annualized for hourly data

  if (maxDrawdown > 0.20) warnings.push("High Risk: Max Drawdown exceeds 20%");
  if (trades.length < 5) warnings.push("Unstable: Too few trades to be statistically significant");
  if (winRate < 0.4 && sharpeRatio < 1) warnings.push("Poor Performance: Low win rate and risk-adjusted return");

  return {
    totalTrades: trades.length,
    winTrades: winningTrades.length,
    lossTrades: losingTrades.length,
    winRate,
    totalPnL: equity - INITIAL_CAPITAL,
    profitFactor,
    maxDrawdown,
    sharpeRatio,
    equityCurve,
    trades,
    warnings
  };
};