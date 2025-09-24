'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChartsContainer } from '@/components/ChartsContainer';
import { Toolbar } from '@/components/Toolbar';
import { StatusBar } from '@/components/StatusBar';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { AddChartModal } from '@/components/modals/AddChartModal';
import { useAppStore } from '@/store/useAppStore';
// import { useHotkeys } from '@/hooks/useHotkeys';

export function TradingTool() {
  const [showSettings, setShowSettings] = useState(false);
  const [showAddChart, setShowAddChart] = useState(false);
  const { charts, isLoading, error, hotkeys } = useAppStore();
  
  // Initialize hotkeys
  // useHotkeys();

  return (
    <div className="flex h-screen bg-dark-900">
      {/* Sidebar */}
      <Sidebar 
        onOpenSettings={() => setShowSettings(true)}
        onAddChart={() => setShowAddChart(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <Toolbar />

        {/* Charts Container */}
        <div className="flex-1 overflow-hidden">
          <ChartsContainer />
        </div>

        {/* Status Bar */}
        <StatusBar />
      </div>

      {/* Modals */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      
      {showAddChart && (
        <AddChartModal onClose={() => setShowAddChart(false)} />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            <span>Загрузка данных...</span>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 animate-slide-up">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}


      {/* Hotkeys Info */}
      {hotkeys.length > 0 && (
      <div
        aria-hidden
        className="
          pointer-events-none fixed top-2 right-3 z-[40]
          max-w-[70vw]
        "
      >
        <div
          className="
            flex items-center gap-3
            rounded-lg border border-white/10
            bg-dark-800/55 backdrop-blur-sm
            px-3 py-1.5 text-xs leading-none
            shadow-sm
          "
        >
          <span className="text-gray-400">Горячие клавиши:</span>

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {hotkeys.map(h => (
              <div
                key={h.id}
                className="flex items-center gap-1 text-[11px] text-gray-300 pointer-events-none"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: h.color, opacity: 0.9 }}
                />
                <span className="text-white/90">{h.key}</span>
                <span className="text-gray-400">{h.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
