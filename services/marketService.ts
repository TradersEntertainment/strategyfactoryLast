import { Candle, Timeframe } from '../types';

export const fetchBinanceData = async (symbol: string = 'BTCUSDT', timeframe: Timeframe = Timeframe.H1, limit: number = 500): Promise<Candle[]> => {
    const intervalMap: { [key in Timeframe]: string } = {
        [Timeframe.M15]: '15m',
        [Timeframe.H1]: '1h',
        [Timeframe.H4]: '4h',
        [Timeframe.D1]: '1d',
    };

    const interval = intervalMap[timeframe];
    let allCandles: Candle[] = [];
    let lastEndTime: number | null = null;

    // Binance limit is 1000 per request. Loop to get requested total.
    const CHUNK_SIZE = 1000;
    const iterations = Math.ceil(limit / CHUNK_SIZE);

    try {
        for (let i = 0; i < iterations; i++) {
            let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${CHUNK_SIZE}`;
            if (lastEndTime) {
                // Fetch older data
                url += `&endTime=${lastEndTime - 1}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Binance API error: ${response.statusText}`);
            const rawData = await response.json();

            if (rawData.length === 0) break;

            const chunk: Candle[] = rawData.map((d: any) => ({
                timestamp: d[0],
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5]),
                dateStr: new Date(d[0]).toLocaleString()
            }));

            allCandles = [...chunk, ...allCandles];
            lastEndTime = chunk[0].timestamp; // Update for next iteration (earlier data)

            if (rawData.length < CHUNK_SIZE) break;
        }

        // Return exactly what was requested (or all if less)
        return allCandles.slice(-limit);
    } catch (error) {
        console.error('Market Data Fetch Error:', error);
        throw error;
    }
};
