'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChartConfig } from '@/types';
import { useAppStore } from '@/store/useAppStore';

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

    let resizeObserver: ResizeObserver | null = null;
    let destroyed = false;

    // 1) на всякий случай убираем всё, что могло остаться
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }
    if (chartRef.current) {
      chartRef.current.innerHTML = '';
    }

    (async () => {
      try {
        const { createChart, CandlestickSeries } = await import('lightweight-charts');
        if (!chartRef.current || destroyed) return;

        const chartInstance = createChart(chartRef.current, {
          layout: { background: { color: '#1a1a1a' }, textColor: '#e0e0e0' },
          rightPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.02, bottom: 0.02 } },
          overlayPriceScales: { scaleMargins: { top: 0.02, bottom: 0.02 } },
          grid: {
            vertLines: { color: 'rgba(197,203,206,0.1)' },
            horzLines: { color: 'rgba(197,203,206,0.1)' },
          },
          timeScale: { timeVisible: true, secondsVisible: true, borderVisible: true },
          crosshair: { mode: 0 },
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        });

        // 2) добавляем свечи тем же API, но явно в правую шкалу
        const candlestickSeries = chartInstance.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
          priceScaleId: 'right',
        });

        chartInstanceRef.current = chartInstance;
        seriesRef.current = candlestickSeries;

        useAppStore.getState().updateChart(chart.id, {
          chart: chartInstance,
          series: candlestickSeries,
        });

        resizeObserver = new ResizeObserver(() => {
          if (!chartRef.current || !chartInstanceRef.current) return;
          chartInstanceRef.current.applyOptions({
            width: chartRef.current.clientWidth,
            height: chartRef.current.clientHeight,
          });
        });
        resizeObserver.observe(chartRef.current);
      } catch (e) {
        console.error('Chart init error', e);
        setError(e instanceof Error ? e.message : 'Ошибка инициализации графика');
      }
    })();

    // 3) важный cleanup — сработает при повторном вызове эффекта (StrictMode) и при размонтировании
    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
      }
    };
  }, [chart.id]); // setError в зависимостях не нужен, чтобы не триггерить эффект

  const loadChartData = async () => {
    if (!seriesRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        '/api/coinglass/price-history?' +
          new URLSearchParams({
            exchange: chart.exchange,
            symbol: chart.symbol,
            type: chart.type,
            interval: chart.interval,
            start_time: new Date(chart.startDate).getTime().toString(),
            end_time: new Date(chart.endDate).getTime().toString(),
            limit: '1000',
          }),
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API Error');

      seriesRef.current.setData(result.data);
      // при необходимости подгон времени
      chartInstanceRef.current?.timeScale().fitContent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    chartInstanceRef.current?.remove();
    chartInstanceRef.current = null;
    removeChart(chart.id);
  };

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden">
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
            <button onClick={loadChartData} disabled={isLoading} className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-50">
              {isLoading ? '⏳' : '📊'} Загрузить
            </button>
            <button onClick={handleRemove} className="btn btn-danger text-xs px-3 py-1">
              🗑️ Удалить
            </button>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: '1000px' }}>
        <div ref={chartRef} className="w-full h-full" />
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
