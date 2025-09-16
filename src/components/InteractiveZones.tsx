'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface InteractiveZonesProps {
  chartId: string;
  chart: any;
  series: any;
}

interface ZoneSelection {
  id: string;
  startTime: number;
  endTime: number;
  startPrice: number;
  endPrice: number;
  color: string;
  name: string;
  isActive: boolean;
}

export function InteractiveZones({ chartId, chart, series }: InteractiveZonesProps) {
  const { tradingZones, addTradingZone, removeTradingZone } = useAppStore();
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<ZoneSelection | null>(null);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const zoneSeriesRef = useRef<any>(null);
  const selectionSeriesRef = useRef<any>(null);
  
  // Get zones for this chart
  const chartZones = tradingZones.filter(zone => zone.chartId === chartId);

  // Create zone series for displaying zones
  useEffect(() => {
    if (!chart || !series) return;

    // Clear existing zone series
    if (zoneSeriesRef.current) {
      try {
        zoneSeriesRef.current.remove();
      } catch (e) {
        // Series might already be removed
      }
    }

    if (chartZones.length === 0) return;

    try {
      // Create a histogram series for zones
      zoneSeriesRef.current = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });

      // Generate zone data for each zone
      const allZoneData: any[] = [];
      
      chartZones.forEach(zone => {
        if (!series.data || series.data().length === 0) return;

        // Get data for the zone time range
        const data = series.data();
        const zoneCandles = data.filter((d: any) => 
          d.time >= zone.startTime && d.time <= zone.endTime
        );

        if (zoneCandles.length === 0) return;

        // Calculate price range for the zone
        const prices = zoneCandles.map((d: any) => [d.high, d.low]).flat();
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        // Create dense histogram data to fill the entire time range
        const timeStep = (zone.endTime - zone.startTime) / 100; // 100 data points for dense coverage
        
        for (let i = 0; i <= 100; i++) {
          const time = zone.startTime + (timeStep * i);
          
          allZoneData.push({
            time: time,
            value: 1, // Volume value
            color: zone.color + '40', // Add transparency
          });
        }
      });

      // Update zone series with all zone data
      if (zoneSeriesRef.current && allZoneData.length > 0) {
        zoneSeriesRef.current.setData(allZoneData);
      }
    } catch (error) {
      console.error('Error creating zone series:', error);
    }

    return () => {
      if (zoneSeriesRef.current) {
        try {
          zoneSeriesRef.current.remove();
        } catch (e) {
          // Series might already be removed
        }
      }
    };
  }, [chart, series, chartZones]);

  // Handle mouse events for zone selection
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!chart || !series) return;
    
    // Get the chart container DOM element - chart.container is now a property, not a method
    const container = chart.container;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert screen coordinates to chart coordinates
    const timeScale = chart.timeScale();
    const priceScale = series.priceScale();
    
    const time = timeScale.coordinateToTime(x);
    const price = priceScale.coordinateToPrice(y);
    
    if (time && price) {
      setIsSelecting(true);
      setCurrentSelection({
        id: `temp-${Date.now()}`,
        startTime: time,
        endTime: time,
        startPrice: price,
        endPrice: price,
        color: '#26a69a',
        name: 'New Zone',
        isActive: true
      });
    }
  }, [chart, series]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isSelecting || !currentSelection || !chart || !series) return;
    
    const container = chart.container;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert screen coordinates to chart coordinates
    const timeScale = chart.timeScale();
    const priceScale = series.priceScale();
    
    const time = timeScale.coordinateToTime(x);
    const price = priceScale.coordinateToPrice(y);
    
    if (time && price) {
      setCurrentSelection(prev => prev ? {
        ...prev,
        endTime: time,
        endPrice: price
      } : null);
    }
  }, [isSelecting, currentSelection, chart, series]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (isSelecting && currentSelection) {
      setIsSelecting(false);
      
      // Create the zone
      const zone = {
        name: currentSelection.name,
        color: currentSelection.color,
        group: 'Manual',
        startTime: Math.min(currentSelection.startTime, currentSelection.endTime),
        endTime: Math.max(currentSelection.startTime, currentSelection.endTime),
        chartId: chartId
      };
      
      addTradingZone(zone);
      setCurrentSelection(null);
    }
  }, [isSelecting, currentSelection, chartId, addTradingZone]);

  // Add event listeners
  useEffect(() => {
    if (!chart) return;
    
    // Get the chart container DOM element - chart.container is now a property
    const container = chart.container;
    if (!container) return;
    
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [chart, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Display current selection
  useEffect(() => {
    if (!chart || !series) return;

    // Clear existing selection series
    if (selectionSeriesRef.current) {
      try {
        selectionSeriesRef.current.remove();
      } catch (e) {
        // Series might already be removed
      }
    }

    if (!currentSelection) return;

    try {
      // Create selection series
      selectionSeriesRef.current = chart.addHistogramSeries({
        color: '#ff6b6b',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });

      // Generate selection data
      const timeStep = Math.abs(currentSelection.endTime - currentSelection.startTime) / 50;
      const selectionData = [];
      
      for (let i = 0; i <= 50; i++) {
        const time = currentSelection.startTime + (timeStep * i);
        selectionData.push({
          time: time,
          value: 1,
          color: '#ff6b6b80', // Semi-transparent red
        });
      }

      selectionSeriesRef.current.setData(selectionData);
    } catch (error) {
      console.error('Error creating selection series:', error);
    }

    return () => {
      if (selectionSeriesRef.current) {
        try {
          selectionSeriesRef.current.remove();
        } catch (e) {
          // Series might already be removed
        }
      }
    };
  }, [chart, series, currentSelection]);

  return (
    <div className="absolute top-2 left-2 z-10">
      {isSelecting && (
        <div className="bg-dark-800 border border-dark-700 rounded-lg p-2 text-xs text-white">
          Выделение зоны... Отпустите мышь для создания зоны
        </div>
      )}
    </div>
  );
}
