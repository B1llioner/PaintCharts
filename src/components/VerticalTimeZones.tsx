'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface VerticalTimeZonesProps {
  chartId: string;
  chart: any;
  series: any;
}

export function VerticalTimeZones({ chartId, chart, series }: VerticalTimeZonesProps) {
  const { tradingZones } = useAppStore();
  
  // Get zones for this chart
  const chartZones = tradingZones.filter(zone => zone.chartId === chartId);

  useEffect(() => {
    if (!chart || !series) return;

    // Clear existing zones
    chartZones.forEach(zone => {
      if (zone.zoneLines) {
        zone.zoneLines.forEach((line: any) => {
          try {
            line.remove();
          } catch (e) {
            // Line might already be removed
          }
        });
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

        // Create vertical lines at start and end of zone
        const startLine = chart.addPriceLine({
          price: maxPrice,
          color: zone.color,
          lineWidth: 3,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: `${zone.name} START`
        });

        const endLine = chart.addPriceLine({
          price: minPrice,
          color: zone.color,
          lineWidth: 3,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: `${zone.name} END`
        });

        const zoneLines = [startLine, endLine];

        // Store references for cleanup
        zone.zoneLines = zoneLines;
      } catch (error) {
        console.error('Error adding zone to chart:', error);
      }
    });

    return () => {
      // Cleanup existing zones
      chartZones.forEach(zone => {
        if (zone.zoneLines) {
          zone.zoneLines.forEach((line: any) => {
            try {
              line.remove();
            } catch (e) {
              // Line might already be removed
            }
          });
        }
      });
    };
  }, [chart, series, chartZones]);

  return null; // This component doesn't render anything
}
