'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ZonesList } from './ZonesList';

interface SidebarProps {
  onOpenSettings: () => void;
  onAddChart: () => void;
}

export function Sidebar({ onOpenSettings, onAddChart }: SidebarProps) {
  const { charts, tradingZones, exportToCSV } = useAppStore();

  const handleExport = async () => {
    try {
      // Generate export data
      const exportData = generateExportData();
      
      // Call API to generate CSV
      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: exportData }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading_zones_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const generateExportData = () => {
    const exportData: any[] = [];
    
    charts.forEach(chart => {
      if (!chart.series?.data()) return;
      
      const chartData = chart.series.data();
      const chartZones = chart.zones || [];
      
      chartData.forEach(candle => {
        const zonesForTime = chartZones.filter(zone => 
          candle.time >= zone.startTime && candle.time <= zone.endTime
        );
        
        if (zonesForTime.length > 0) {
          zonesForTime.forEach(zone => {
            exportData.push({
              timestamp: new Date(candle.time * 1000).toISOString(),
              symbol: chart.symbol,
              exchange: chart.exchange,
              type: chart.type,
              interval: chart.interval,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume_usd: candle.volume || 0,
              zone_name: zone.name,
              zone_group: zone.group,
              zone_color: zone.color,
              zone_start: new Date(zone.startTime * 1000).toISOString(),
              zone_end: new Date(zone.endTime * 1000).toISOString()
            });
          });
        } else {
          exportData.push({
            timestamp: new Date(candle.time * 1000).toISOString(),
            symbol: chart.symbol,
            exchange: chart.exchange,
            type: chart.type,
            interval: chart.interval,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume_usd: candle.volume || 0,
            zone_name: '',
            zone_group: '',
            zone_color: '',
            zone_start: '',
            zone_end: ''
          });
        }
      });
    });
    
    return exportData;
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
        
        <button
          onClick={handleExport}
          disabled={tradingZones.length === 0}
          className="btn btn-success w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📤 Экспорт в CSV
        </button>
      </div>

      {/* Charts Info */}
      <div className="p-4 border-t border-dark-700">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Графики</h3>
        <div className="text-sm text-gray-300">
          Активных: {charts.length}
        </div>
      </div>

      {/* Zones List */}
      <div className="flex-1 overflow-y-auto">
        <ZonesList />
      </div>
    </div>
  );
}
