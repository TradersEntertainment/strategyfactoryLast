import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { Candle, Trade, OrderType } from '../types';

interface CandleChartProps {
    data: Candle[];
    trades?: Trade[];
}

const CandleChart: React.FC<CandleChartProps> = ({ data, trades = [] }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'>>(null);
    const tradeSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0f1115' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: '#1e293b', style: 1 },
                horzLines: { color: '#1e293b', style: 1 },
            },
            width: chartContainerRef.current.clientWidth,
            height: 450,
            timeScale: {
                borderColor: '#1e293b',
                timeVisible: true,
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const chartData: CandlestickData[] = data.map(d => ({
                time: (d.timestamp / 1000) as UTCTimestamp,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }));
            seriesRef.current.setData(chartData);
            chartRef.current?.timeScale().fitContent();
        }
    }, [data]);

    useEffect(() => {
        if (seriesRef.current && trades.length > 0) {
            // Clean up old trade series
            tradeSeriesRef.current.forEach(s => chartRef.current?.removeSeries(s));
            tradeSeriesRef.current = [];

            const markers = trades.flatMap(trade => {
                const entryTimeSec = (trade.entryTime / 1000) as UTCTimestamp;

                // Add Entry Horizontal Level (Short segment)
                const entryLine = chartRef.current.addLineSeries({
                    color: '#3b82f6',
                    lineWidth: 1,
                    lineStyle: 2, // Dashed
                    lineType: 0, // Simple
                    lastValueVisible: false,
                    priceLineVisible: false,
                });

                // Find next sample time for short line
                const dataIndex = data.findIndex(d => d.timestamp === trade.entryTime);
                const nextTimeSec = data[dataIndex + 1]
                    ? (data[dataIndex + 1].timestamp / 1000) as UTCTimestamp
                    : (trade.entryTime / 1000 + 3600) as UTCTimestamp; // Fallback +1h

                entryLine.setData([
                    { time: entryTimeSec, value: trade.entryPrice },
                    { time: nextTimeSec, value: trade.entryPrice }
                ]);
                tradeSeriesRef.current.push(entryLine);

                const entryMarker = {
                    time: entryTimeSec,
                    position: 'belowBar' as const,
                    color: '#3b82f6',
                    shape: 'arrowUp' as const,
                    text: 'Entry',
                };

                if (trade.exitTime) {
                    const exitTimeSec = (trade.exitTime / 1000) as UTCTimestamp;

                    // Add Exit Horizontal Level
                    const exitLine = chartRef.current.addLineSeries({
                        color: trade.pnl > 0 ? '#22c55e' : '#ef4444',
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });

                    const exitDataIndex = data.findIndex(d => d.timestamp === trade.exitTime);
                    const exitNextTimeSec = data[exitDataIndex + 1]
                        ? (data[exitDataIndex + 1].timestamp / 1000) as UTCTimestamp
                        : (trade.exitTime / 1000 + 3600) as UTCTimestamp;

                    exitLine.setData([
                        { time: exitTimeSec, value: trade.exitPrice! },
                        { time: exitNextTimeSec, value: trade.exitPrice! }
                    ]);
                    tradeSeriesRef.current.push(exitLine);

                    return [
                        entryMarker,
                        {
                            time: exitTimeSec,
                            position: 'aboveBar' as const,
                            color: trade.pnl > 0 ? '#22c55e' : '#ef4444',
                            shape: 'arrowDown' as const,
                            text: `Ex ${trade.pnl > 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}%`,
                        }
                    ];
                }
                return [entryMarker];
            });

            seriesRef.current.setMarkers(markers);
        } else if (seriesRef.current) {
            seriesRef.current.setMarkers([]);
            tradeSeriesRef.current.forEach(s => chartRef.current?.removeSeries(s));
            tradeSeriesRef.current = [];
        }
    }, [trades, data]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
};

export default CandleChart;
