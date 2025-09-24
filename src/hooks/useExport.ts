import { useAppStore } from '@/store/useAppStore';
import type { ChartConfig, TradingZone } from '@/types';
import type { Chart, KLineData } from 'klinecharts';
import {
  generateCSVContent,
  downloadFile,
  generateExportFilename,
  generateMultiExportFilename,
} from '@/lib/exportUtils';

// Строка CSV: ключи соответствуют тому, как generateCSVContent
// переводит заголовки в поле объекта (lowercase + underscores).
type ExportRow = {
  timestamp: number;        // ms
  symbol: string;
  exchange: string;
  type: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume_usd: number | string; // turnover или volume
  // поля зоны — могут быть пустыми, либо конкатенация "несколько зон" через '|'
  zone_name: string;
  zone_group: string;
  zone_color: string;
  zone_start: string;       // seconds, если несколько — 'start1|start2|...'
  zone_end: string;         // seconds, если несколько — 'end1|end2|...'
};

function getChartData(chartLike: any): KLineData[] {
  const inst: Chart | undefined = chartLike?.chart;
  if (inst && typeof inst.getDataList === 'function') {
    const list = inst.getDataList();
    return Array.isArray(list) ? list : [];
  }
  // Фоллбэк — если мы сохранили данные в стор при загрузке
  return Array.isArray(chartLike?.data) ? chartLike.data : [];
}

/** Собираем строки для ВСЕГО ряда данных.
 *  Если свеча попадает в 1+ зон — заполняем zone_* (для нескольких зон: join('|')).
 *  Если нет — оставляем zone_* пустыми.
 */
function buildRowsForChartFull(
  chart: ChartConfig,
  zones: TradingZone[],
  data: KLineData[],
): ExportRow[] {
  const rows: ExportRow[] = [];
  if (!data.length) return rows;

  for (const k of data) {
    const ts = k.timestamp!;
    // какие зоны покрывают текущую свечу
    const matched = zones.filter(
      (z) => ts >= (z.startTime ?? 0) * 1000 && ts <= (z.endTime ?? 0) * 1000,
    );

    const zone_name  = matched.length ? matched.map(z => z.name   ?? '').join('|') : '';
    const zone_group = matched.length ? matched.map(z => z.group  ?? '').join('|') : '';
    const zone_color = matched.length ? matched.map(z => z.color  ?? '').join('|') : '';
    const zone_start = matched.length ? matched.map(z => String(z.startTime ?? 0)).join('|') : '';
    const zone_end   = matched.length ? matched.map(z => String(z.endTime   ?? 0)).join('|') : '';

    rows.push({
      timestamp: ts,
      symbol: chart.symbol,
      exchange: chart.exchange,
      type: chart.type,
      interval: chart.interval,
      open: k.open ?? 0,
      high: k.high ?? 0,
      low: k.low ?? 0,
      close: k.close ?? 0,
      volume_usd: (k as any).turnover ?? k.volume ?? '',
      zone_name,
      zone_group,
      zone_color,
      zone_start,
      zone_end,
    });
  }

  return rows;
}

export function useExport() {
  const { tradingZones } = useAppStore();

  const exportChartData = (chart: ChartConfig) => {
    const fresh = useAppStore.getState().charts.find((c) => c.id === chart.id) || chart;

    const data = getChartData(fresh as any);
    if (!data.length) {
      console.warn(`Нет данных для экспорта графика: ${fresh.symbol}`);
      return;
    }

    const zones = tradingZones.filter((z) => z.chartId === fresh.id);
    const rows = buildRowsForChartFull(fresh, zones, data);
    if (!rows.length) {
      console.warn(`Нечего экспортировать: ${fresh.symbol}`);
      return;
    }

    const csv = generateCSVContent(rows as any);
    const filename = generateExportFilename(fresh.symbol, fresh.exchange, fresh.type, fresh.interval);
    downloadFile(csv, filename);
  };

  // Экспорт всех активных графиков в один CSV
  const exportAllChartsToSingleFile = () => {
    const state = useAppStore.getState();
    const allCharts: ChartConfig[] = state.charts;
    const allRows: ExportRow[] = [];

    for (const ch of allCharts) {
      const data = getChartData(ch as any);
      if (!data.length) continue;
      const zones = state.tradingZones.filter((z) => z.chartId === ch.id);
      allRows.push(...buildRowsForChartFull(ch, zones, data));
    }

    if (!allRows.length) {
      console.warn('Нет данных для множественного экспорта');
      return;
    }

    const csv = generateCSVContent(allRows as any);
    const filename = generateMultiExportFilename();
    downloadFile(csv, filename);
  };

  return { exportChartData, exportAllChartsToSingleFile };
}
