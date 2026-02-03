import { Candle, StrategyConfig, Timeframe } from '../types';

export const analyzeChartPoints = async (
  data: Candle[],
  userNotes: string
): Promise<StrategyConfig[]> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userNotes, data: data.slice(-50) })
    });

    if (!response.ok) throw new Error('API request failed');

    const result = await response.json();
    return result.strategies || [];

  } catch (error) {
    console.error("AI Proxy Error:", error);

    return [{
      name: "Fallback Strategy (Network Error)",
      description: "Sunucu hatası, varsayılan strateji kullanıldı.",
      timeframe: Timeframe.H1,
      entryConditions: [{ indicator: 'RSI', operator: '<', value: 30, params: { period: 14 } }],
      exitConditions: [{ indicator: 'RSI', operator: '>', value: 70, params: { period: 14 } }],
      stopLossPct: 0.02,
      takeProfitPct: 0.04,
      riskPerTradePct: 0.01,
      logicExplanation: "Sunucu bağlantısında bir sorun oluştu."
    }];
  }
};