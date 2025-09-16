'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChartConfig } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { InteractiveZones } from './InteractiveZones';

interface ChartWrapperProps {
  chart: ChartConfig;
}

export function ChartWrapper({ chart }: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { removeChart, setError } = useAppStore();

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    const initChart = async () => {
      try {
        // Dynamic import for LightweightCharts
        const { createChart } = await import('lightweight-charts');
        
        const chartInstance = createChart(chartRef.current!, {
          layout: {
            background: { color: '#1a1a1a' },
            textColor: '#e0e0e0',
          },
          rightPriceScale: { visible: true, borderVisible: false },
          grid: {
            vertLines: { color: 'rgba(197,203,206,0.1)' },
            horzLines: { color: 'rgba(197,203,206,0.1)' },
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderVisible: false,
          },
          crosshair: { mode: 0 }, // Disable crosshair
          width: chartRef.current!.clientWidth,
          height: chartRef.current!.clientHeight,
        });

        const candlestickSeries = chartInstance.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });

        chartInstanceRef.current = chartInstance;
        seriesRef.current = candlestickSeries;

        // Update chart reference in store
        useAppStore.getState().updateChart(chart.id, {
          chart: chartInstance,
          series: candlestickSeries,
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          if (chartInstance && chartRef.current) {
            chartInstance.applyOptions({
              width: chartRef.current.clientWidth,
              height: chartRef.current.clientHeight,
            });
          }
        });
        if (chartRef.current) {
          resizeObserver.observe(chartRef.current);
        }

        return () => {
          resizeObserver.disconnect();
          chartInstance.remove();
        };
      } catch (error) {
        console.error('Chart initialization error:', error);
        setError('Ошибка инициализации графика');
      }
    };

    initChart();
  }, [chart.id, setError]);

  const loadChartData = async () => {
    if (!seriesRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/coinglass/price-history?' + new URLSearchParams({
        exchange: chart.exchange,
        symbol: chart.symbol,
        type: chart.type,
        interval: chart.interval,
        start_time: new Date(chart.startDate).getTime().toString(),
        end_time: new Date(chart.endDate).getTime().toString(),
        limit: '1000'
      }));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        seriesRef.current.setData(result.data);
        chartInstanceRef.current?.timeScale().fitContent();
      } else {
        throw new Error(result.error || 'API Error');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
    }
    removeChart(chart.id);
  };

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden">
      {/* Chart Header */}
      <div className="bg-dark-700 px-4 py-3 border-b border-dark-600">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            <span className="font-medium">{chart.symbol}</span>
            <span className="mx-2">•</span>
            <span>{chart.exchange}</span>
            <span className="mx-2">•</span>
            <span>{chart.type}</span>
            <span className="mx-2">•</span>
            <span>{chart.interval}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={loadChartData}
              disabled={isLoading}
              className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-50"
            >
              {isLoading ? '⏳' : '📊'} Загрузить
            </button>
            
            <button
              onClick={handleRemove}
              className="btn btn-danger text-xs px-3 py-1"
            >
              🗑️ Удалить
            </button>
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div className="relative" style={{ height: '400px' }}>
        <div ref={chartRef} className="w-full h-full" />
        
        {/* Interactive Zones Component */}
        {chartInstanceRef.current && seriesRef.current && (
          <InteractiveZones 
            chartId={chart.id}
            chart={chartInstanceRef.current}
            series={seriesRef.current}
          />
        )}
        
        {isLoading && (
          <div className="absolute inset-0 bg-dark-800 bg-opacity-75 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-white">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              <span className="text-sm">Загрузка...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
