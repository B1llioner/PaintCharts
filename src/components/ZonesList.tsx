'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';

export function ZonesList() {
  const { tradingZones, removeTradingZone } = useAppStore();

  // Group zones by group
  const groupedZones = tradingZones.reduce((acc, zone) => {
    if (!acc[zone.group]) {
      acc[zone.group] = [];
    }
    acc[zone.group].push(zone);
    return acc;
  }, {} as Record<string, typeof tradingZones>);

  if (tradingZones.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500 text-sm">
          <div className="mb-2">📊</div>
          <div>Нет зон торговли</div>
          <div className="text-xs mt-1">
            Добавьте график и используйте горячие клавиши для создания зон
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Зоны торговли</h3>
      
      <div className="space-y-4">
        {Object.entries(groupedZones).map(([group, zones]) => (
          <div key={group}>
            <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              {group}
            </h4>
            
            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center space-x-3 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: zone.color }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {zone.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(zone.startTime * 1000).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })} - {new Date(zone.endTime * 1000).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeTradingZone(zone.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium px-2 py-1 rounded hover:bg-red-900/20 transition-colors"
                    title="Удалить зону"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
