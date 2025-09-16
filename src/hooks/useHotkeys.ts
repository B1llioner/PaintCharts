'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useHotkeys() {
  const { 
    hotkeys, 
    charts, 
    addTradingZone 
  } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const hotkey = hotkeys.find(h => h.key.toLowerCase() === event.key.toLowerCase());
      if (!hotkey) return;

      event.preventDefault();

      // Find the last chart (most recently added)
      const activeChart = charts[charts.length - 1];
      if (!activeChart || !activeChart.chart) {
        console.warn('No active chart found');
        return;
      }

      // Get visible range from chart
      const timeScale = activeChart.chart.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      
      if (!visibleRange) {
        console.warn('No visible range found');
        return;
      }

      // Create trading zone with precise timestamps
      const zone = {
        name: hotkey.name,
        color: hotkey.color,
        group: hotkey.group,
        startTime: Math.floor(visibleRange.from),
        endTime: Math.floor(visibleRange.to),
        chartId: activeChart.id
      };

      addTradingZone(zone);
      console.log(`Added zone: ${hotkey.name} from ${new Date(zone.startTime * 1000).toLocaleString()} to ${new Date(zone.endTime * 1000).toLocaleString()}`);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys, charts, addTradingZone]);
}
