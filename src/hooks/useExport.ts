import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ChartConfig, ExportData } from '@/types';
import { generateCSVContent, downloadFile, generateExportFilename, generateMultiExportFilename } from '@/lib/exportUtils';

export function useExport() {
  const { charts, tradingZones } = useAppStore();

  /**
   * Экспортирует данные конкретного графика
   */
  const exportChartData = useCallback((chart: ChartConfig) => {
    if (!chart.series?.data()) {
      console.warn('Нет данных для экспорта графика:', chart.symbol);
      return;
    }

    const chartData = chart.series.data();
    const chartZones = tradingZones.filter(zone => zone.chartId === chart.id);
    const exportData: ExportData[] = [];

    chartData.forEach((candle: { time: number; open: any; high: any; low: any; close: any; volume: any; }) => {
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

    const csvContent = generateCSVContent(exportData);
    const filename = generateExportFilename(chart.symbol, chart.exchange, chart.type, chart.interval);
    
    downloadFile(csvContent, filename);
    
    console.log(`Экспортирован график ${chart.symbol}: ${exportData.length} записей`);
  }, [tradingZones]);

  /**
   * Экспортирует данные всех графиков в один файл
   */
  const exportAllChartsData = useCallback(() => {
    const exportData: ExportData[] = [];

    charts.forEach(chart => {
      if (!chart.series?.data()) return;
      
      const chartData = chart.series.data();
      const chartZones = tradingZones.filter(zone => zone.chartId === chart.id);
      
      chartData.forEach((candle: { time: number; open: any; high: any; low: any; close: any; volume: any; }) => {
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

    const csvContent = generateCSVContent(exportData);
    const filename = generateMultiExportFilename();
    
    downloadFile(csvContent, filename);
    
    console.log(`Экспортированы все графики: ${exportData.length} записей`);
  }, [charts, tradingZones]);

  /**
   * Экспортирует данные всех графиков в отдельные файлы
   */
  const exportAllChartsSeparately = useCallback(() => {
    charts.forEach(chart => {
      if (chart.series?.data()) {
        exportChartData(chart);
      }
    });
  }, [charts, exportChartData]);

  return {
    exportChartData,
    exportAllChartsData,
    exportAllChartsSeparately
  };
}
