'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ChartWrapper } from '@/components/ChartWrapper';

export function ChartsContainer() {
  const { charts } = useAppStore();

  if (charts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-dark-900">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📊</div>
          <div className="text-xl mb-2">Добавьте график для начала работы</div>
          <div className="text-sm">Используйте кнопку "Добавить график" в боковой панели</div>
        </div>
      </div>
    );
  }

  // Determine grid layout based on number of charts
  const getGridClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className={`grid ${getGridClass(charts.length)} gap-4 p-4 h-full`}>
      {charts.map((chart: any) => (
        <ChartWrapper key={chart.id} chart={chart} />
      ))}
    </div>
  );
}
