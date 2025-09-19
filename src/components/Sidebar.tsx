'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ZonesList } from './ZonesList';
import { useExport } from '@/hooks/useExport';

interface SidebarProps {
  onOpenSettings: () => void;
  onAddChart: () => void;
}

export function Sidebar({ onOpenSettings, onAddChart }: SidebarProps) {
  const { charts, tradingZones } = useAppStore();
  const { exportAllChartsData, exportAllChartsSeparately } = useExport();

  const handleExportAll = () => {
    exportAllChartsData();
  };

  const handleExportSeparately = () => {
    exportAllChartsSeparately();
  };

  return (
    <div className="w-80 bg-dark-800 border-r border-dark-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-700">
        <h2 className="text-lg font-semibold text-white">Настройки</h2>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3">
        <button
          onClick={onOpenSettings}
          className="btn btn-primary w-full"
        >
          ⚙️ Настройки хоткеев
        </button>
        
        <button
          onClick={onAddChart}
          className="btn btn-secondary w-full"
        >
          📊 Добавить график
        </button>
        
        <div className="space-y-2">
          <button
            onClick={handleExportAll}
            disabled={tradingZones.length === 0}
            className="btn btn-success w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📤 Экспорт всех графиков (1 файл)
          </button>
          
          <button
            onClick={handleExportSeparately}
            disabled={tradingZones.length === 0}
            className="btn btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📤 Экспорт всех графиков (отдельные файлы)
          </button>
        </div>
      </div>

      {/* Charts Info */}
      <div className="p-4 border-t border-dark-700">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Графики</h3>
        <div className="text-sm text-gray-300 mb-2">
          Активных: {charts.length}
        </div>
        {charts.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {charts.map((chart) => (
              <div key={chart.id} className="text-xs text-gray-400 bg-dark-700 p-2 rounded">
                <div className="font-medium text-white">{chart.symbol}</div>
                <div>{chart.exchange} • {chart.type} • {chart.interval}</div>
                <div className="text-gray-500">
                  {tradingZones.filter(z => z.chartId === chart.id).length} зон
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zones List */}
      <div className="flex-1 overflow-y-auto">
        <ZonesList />
      </div>
    </div>
  );
}
