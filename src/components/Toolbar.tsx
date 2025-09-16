'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function Toolbar() {
  const { charts, setLoading, setError } = useAppStore();
  const [apiKey, setApiKey] = useState('57e6078b48cf4f2bb9a308fabde7a594');

  const loadAllCharts = async () => {
    if (charts.length === 0) {
      setError('Нет графиков для загрузки');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load data for all charts
      const loadPromises = charts.map(async (chart: any) => {
        if (!chart.series) return;

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
          throw new Error(`Failed to load data for ${chart.symbol}`);
        }

        const result = await response.json();
        
        if (result.success) {
          chart.series.setData(result.data);
          chart.chart?.timeScale().fitContent();
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      });

      await Promise.all(loadPromises);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-800 border-b border-dark-700 px-4 py-3">
      <div className="flex items-center space-x-4">
        {/* API Key Input */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-400">API Key:</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              className="input text-sm w-64"
              placeholder="Введите API ключ"
            />
        </div>

        {/* Load All Button */}
        <button
          onClick={loadAllCharts}
          disabled={charts.length === 0}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📊 Загрузить все графики
        </button>

        {/* Charts Count */}
        <div className="text-sm text-gray-400">
          Графиков: {charts.length}
        </div>
      </div>
    </div>
  );
}
