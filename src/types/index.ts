export interface Hotkey {
  id: string;
  name: string;
  key: string;
  color: string;
  group: 'Trend' | 'Vibe' | 'Custom';
  description?: string;
}

export interface ChartConfig {
  id: string;
  symbol: string;
  exchange: string;
  type: 'spot' | 'futures';
  interval: string;
  startDate: string;
  endDate: string;
  chart?: any; // LightweightCharts.IChartApi
  series?: any; // LightweightCharts.ISeriesApi
  zones: TradingZone[];
}

export interface TradingZone {
  id: string;
  name: string;
  color: string;
  group: string;
  startTime: number;
  endTime: number;
  chartId: string;
  createdAt: string;
  topLine?: any;
  bottomLine?: any;
  startLine?: any;
  endLine?: any;
  rectangle?: any;
  zoneLines?: any[];
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CoinglassResponse {
  code: string;
  msg?: string;
  data: CoinglassCandleData[];
}

export interface CoinglassCandleData {
  time: number;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume_usd: string | number;
}

export interface ChartData {
  symbol: string;
  exchange: string;
  type: 'spot' | 'futures';
  interval: string;
  startTime: number;
  endTime: number;
  limit?: number;
}

export interface ExportData {
  timestamp: string;
  symbol: string;
  exchange: string;
  type: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume_usd: number;
  zone_name: string;
  zone_group: string;
  zone_color: string;
  zone_start: string;
  zone_end: string;
}

export interface AppState {
  charts: ChartConfig[];
  hotkeys: Hotkey[];
  tradingZones: TradingZone[];
  currentChartId: number;
  selectedRange: { from: number; to: number } | null;
  isLoading: boolean;
  error: string | null;
}
