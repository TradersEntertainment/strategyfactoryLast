import { StrategyConfig, Candle, BacktestResult } from '../types';
import { runBacktest } from './backtestEngine';

export interface OptimizationResult {
    config: StrategyConfig;
    stats: BacktestResult;
    score: number;
    category?: string; // e.g. "💰 Most Profitable"
}

export const optimizeStrategy = async (
    baseConfig: StrategyConfig,
    data: Candle[],
    onProgress?: (progress: number) => void
): Promise<OptimizationResult[]> => {
    // 1. Slice data based on lookback
    const testData = baseConfig.lookbackCandles && baseConfig.lookbackCandles > 0
        ? data.slice(-baseConfig.lookbackCandles)
        : data;

    if (!testData || testData.length < 50) return [];

    const allResults: OptimizationResult[] = [];
    const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));

    // 2. Define Grids (Testing both Risk ON and OFF)
    const riskToggles = [true, false];
    const slRanges = [0.01, 0.02, 0.03];
    const tpRanges = [0.03, 0.05, 0.10, 0.20];

    // Indicator Specific Variations
    const paramVariations = [7, 10, 14, 21, 28];
    const rsiValues = [25, 30, 70, 75];
    const rsiOps = ['<', '>'] as const;

    const firstCond = baseConfig.entryConditions[0];

    // Progress tracking
    const totalCombos = 2 * (slRanges.length * tpRanges.length + 1) * (firstCond ? paramVariations.length * rsiValues.length * rsiOps.length : 1);
    let count = 0;

    for (const riskEnabled of riskToggles) {
        const currentSlRange = riskEnabled ? slRanges : [0];
        const currentTpRange = riskEnabled ? tpRanges : [0];

        for (const sl of currentSlRange) {
            for (const tp of currentTpRange) {
                if (firstCond) {
                    for (const p of paramVariations) {
                        for (const v of rsiValues) {
                            for (const op of rsiOps) {
                                const variation = deepClone(baseConfig);
                                variation.riskParametersEnabled = riskEnabled;
                                variation.stopLossPct = sl;
                                variation.takeProfitPct = tp;

                                const cond = variation.entryConditions[0];
                                cond.params.period = p;
                                cond.value = v;
                                if (cond.indicator === 'RSI') cond.operator = op;

                                // Sync exit if it exists and matches
                                const exit = variation.exitConditions[0];
                                if (exit && exit.indicator === cond.indicator) {
                                    exit.params.period = p;
                                }

                                const stats = runBacktest(variation, testData);
                                const score = (stats.totalPnL * (stats.profitFactor + 1)) / (stats.maxDrawdown + 0.01);

                                allResults.push({ config: variation, stats, score });

                                count++;
                                if (count % 40 === 0) {
                                    onProgress?.((count / totalCombos) * 100);
                                    await new Promise(r => setTimeout(r, 0));
                                }
                            }
                        }
                    }
                } else {
                    const variation = deepClone(baseConfig);
                    variation.riskParametersEnabled = riskEnabled;
                    variation.stopLossPct = sl;
                    variation.takeProfitPct = tp;
                    const stats = runBacktest(variation, testData);
                    allResults.push({ config: variation, stats, score: stats.totalPnL });
                    count++;
                }
            }
        }
    }

    // Categorize Results
    const winners: OptimizationResult[] = [];

    // 1. Most Profitable
    const mostProfitable = [...allResults].sort((a, b) => b.stats.totalPnL - a.stats.totalPnL)[0];
    if (mostProfitable) winners.push({ ...mostProfitable, category: "💰 Most Profitable" });

    // 2. Highest Win Rate (with at least 5 trades to be stable)
    const bestWinRate = [...allResults].filter(r => r.stats.totalTrades >= 5).sort((a, b) => b.stats.winRate - a.stats.winRate)[0];
    if (bestWinRate) winners.push({ ...bestWinRate, category: "🎯 Highest Win Rate" });

    // 3. Most Active (Max trades)
    const mostActive = [...allResults].sort((a, b) => b.stats.totalTrades - a.stats.totalTrades)[0];
    if (mostActive) winners.push({ ...mostActive, category: "⚡ Most Active" });

    // 4. Best of "No Risk"
    const noRiskBest = [...allResults].filter(r => r.config.riskParametersEnabled === false).sort((a, b) => b.stats.totalPnL - a.stats.totalPnL)[0];
    if (noRiskBest) winners.push({ ...noRiskBest, category: "🔓 Pure Signal (No SL/TP)" });

    // 5. Best Risk/Reward
    const bestSafety = [...allResults].filter(r => r.stats.totalTrades >= 3).sort((a, b) => b.stats.profitFactor - a.stats.profitFactor)[0];
    if (bestSafety) winners.push({ ...bestSafety, category: "🛡️ Safety & Reliability" });

    return winners;
};
