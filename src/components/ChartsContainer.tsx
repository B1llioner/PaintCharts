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

  // кол-во колонок по количеству графиков
  const gridCols =
    charts.length <= 1 ? 'grid-cols-1'
    : charts.length <= 2 ? 'grid-cols-1 md:grid-cols-2'
    : charts.length <= 4 ? 'grid-cols-1 md:grid-cols-2'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

    return (
      // здесь задаём желаемую высоту карточки
      // можешь сразу поставить 60vh/65vh, или фикс пикселей
      <div className="h-full min-h-0 overflow-auto
                      [--chart-min-h:600px] md:[--chart-min-h:640px] lg:[--chart-min-h:700px]">
        <div
          className={`grid ${gridCols} gap-4 p-4
                      auto-rows-[minmax(var(--chart-min-h),auto)]`}
        >
          {charts.map((chart: any) => (
            <div key={chart.id} className="min-h-0">
              <ChartWrapper chart={chart} />
            </div>
          ))}
        </div>
      </div>
    );
}
