'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';

export function StatusBar() {
  const { charts, tradingZones, isLoading, error } = useAppStore();

  const getStatusMessage = () => {
    if (error) return `Ошибка: ${error}`;
    if (isLoading) return 'Загрузка данных...';
    if (charts.length === 0) return 'Готов к работе - добавьте график';
    if (tradingZones.length === 0) return `Готов к работе - ${charts.length} график(ов), нет зон`;
    return `Готов к работе - ${charts.length} график(ов), ${tradingZones.length} зон`;
  };

  return (
    <div className="bg-dark-800 border-t border-dark-700 px-4 py-2">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{getStatusMessage()}</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <span>Графиков: {charts.length}</span>
          <span>Зон: {tradingZones.length}</span>
        </div>
      </div>
    </div>
  );
}
