'use client';

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface TradingZonesProps {
  chartId: string;
  chart: any;
  series: any;
}

export function TradingZones({ chartId, chart, series }: TradingZonesProps) {
  const { tradingZones, removeTradingZone } = useAppStore();
  const zoneSeriesRef = useRef<any>(null);
  
  // Get zones for this chart
  const chartZones = tradingZones.filter(zone => zone.chartId === chartId);

  useEffect(() => {
    if (!chart || !series) return;

    // Clear existing zones
    chartZones.forEach(zone => {
      if (zone.startLine) {
        try {
          zone.startLine.remove();
        } catch (e) {
          // Line might already be removed
        }
      }
      if (zone.endLine) {
        try {
          zone.endLine.remove();
        } catch (e) {
          // Line might already be removed
        }
      }
    });

    // Add zones to chart
    chartZones.forEach(zone => {
      try {
        if (!series.data || series.data().length === 0) return;

        // Get data for the zone time range
        const data = series.data();
        const zoneData = data.filter((d: any) => 
          d.time >= zone.startTime && d.time <= zone.endTime
        );

        if (zoneData.length === 0) return;

        // Calculate price range for the zone
        const prices = zoneData.map((d: any) => [d.high, d.low]).flat();
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const midPrice = (minPrice + maxPrice) / 2;

        // Create vertical lines for time boundaries
        const startLine = chart.addPriceLine({
          price: midPrice,
          color: zone.color,
          lineWidth: 3,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: `${zone.name} (Start)`
        });

        const endLine = chart.addPriceLine({
          price: midPrice,
          color: zone.color,
          lineWidth: 3,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: `${zone.name} (End)`
        });

        // Store references for cleanup
        zone.startLine = startLine;
        zone.endLine = endLine;
      } catch (error) {
        console.error('Error adding zone to chart:', error);
      }
    });

    return () => {
      // Cleanup existing zones
      chartZones.forEach(zone => {
        if (zone.startLine) {
          try {
            zone.startLine.remove();
          } catch (e) {
            // Line might already be removed
          }
        }
        if (zone.endLine) {
          try {
            zone.endLine.remove();
          } catch (e) {
            // Line might already be removed
          }
        }
      });
    };
  }, [chart, series, chartZones]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (zoneSeriesRef.current) {
        try {
          zoneSeriesRef.current.remove();
        } catch (e) {
          // Series might already be removed
        }
      }
    };
  }, []);

  return null; // This component doesn't render anything
}

