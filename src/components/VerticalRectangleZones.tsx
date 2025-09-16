'use client';

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface VerticalRectangleZonesProps {
  chartId: string;
  chart: any;
  series: any;
}

export function VerticalRectangleZones({ chartId, chart, series }: VerticalRectangleZonesProps) {
  const { tradingZones } = useAppStore();
  const zoneSeriesRef = useRef<any>(null);
  
  // Get zones for this chart
  const chartZones = tradingZones.filter(zone => zone.chartId === chartId);

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
      const allZoneData = [];
      
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
        const timeStep = (zone.endTime - zone.startTime) / 200; // 200 data points for dense coverage
        
        for (let i = 0; i <= 200; i++) {
          const time = zone.startTime + (timeStep * i);
          
          allZoneData.push({
            time: time,
            value: 1, // Volume value
            color: zone.color + '80', // Add transparency
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

  return null; // This component doesn't render anything
}
