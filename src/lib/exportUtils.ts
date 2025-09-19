import { ExportData } from '@/types';

/**
 * Генерирует CSV контент из данных экспорта
 */
export function generateCSVContent(data: ExportData[]): string {
  const headers = [
    'Timestamp', 'Symbol', 'Exchange', 'Type', 'Interval',
    'Open', 'High', 'Low', 'Close', 'Volume_USD',
    'Zone_Name', 'Zone_Group', 'Zone_Color', 'Zone_Start', 'Zone_End'
  ];

  const csvContent = [
    headers.join(','),
    ...data.map((row: ExportData) => 
      headers.map(header => {
        const value = row[header.toLowerCase().replace('_', '_') as keyof ExportData];
        return `"${value || ''}"`;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
}

/**
 * Скачивает файл в браузере
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Генерирует имя файла для экспорта
 */
export function generateExportFilename(symbol: string, exchange: string, type: string, interval: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '');
  return `trading_zones_${cleanSymbol}_${exchange}_${type}_${interval}_${timestamp}.csv`;
}

/**
 * Генерирует имя файла для множественного экспорта
 */
export function generateMultiExportFilename(): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `trading_zones_all_charts_${timestamp}.csv`;
}
