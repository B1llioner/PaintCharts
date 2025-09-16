export const EXCHANGES = [
  { value: 'Binance', label: 'Binance' },
  { value: 'OKX', label: 'OKX' },
  { value: 'Bybit', label: 'Bybit' },
  { value: 'Coinbase', label: 'Coinbase' }
] as const;

export const INTERVALS = [
  { value: '1m', label: '1 минута' },
  { value: '3m', label: '3 минуты' },
  { value: '5m', label: '5 минут' },
  { value: '15m', label: '15 минут' },
  { value: '30m', label: '30 минут' },
  { value: '1h', label: '1 час' },
  { value: '4h', label: '4 часа' },
  { value: '6h', label: '6 часов' },
  { value: '8h', label: '8 часов' },
  { value: '12h', label: '12 часов' },
  { value: '1d', label: '1 день' },
  { value: '1w', label: '1 неделя' }
] as const;

export const ZONE_GROUPS = [
  { value: 'Trend', label: 'Trend', description: 'Трендовые характеристики' },
  { value: 'Vibe', label: 'Vibe', description: 'Настроенческие характеристики' },
  { value: 'Custom', label: 'Custom', description: 'Пользовательские характеристики' }
] as const;

export const DEFAULT_HOTKEYS = [
  { name: 'Uptrend', key: 'U', color: '#00ff00', group: 'Trend' as const },
  { name: 'Downtrend', key: 'D', color: '#ff0000', group: 'Trend' as const },
  { name: 'Flat', key: 'F', color: '#ffff00', group: 'Trend' as const },
  { name: 'Бычка', key: 'B', color: '#00ffff', group: 'Vibe' as const },
  { name: 'Пролив', key: 'P', color: '#ff00ff', group: 'Vibe' as const },
  { name: 'Время брить хомяков', key: 'H', color: '#ffa500', group: 'Vibe' as const }
] as const;

export const CHART_COLORS = {
  up: '#26a69a',
  down: '#ef5350',
  wickUp: '#26a69a',
  wickDown: '#ef5350',
  background: '#1a1a1a',
  text: '#e0e0e0',
  grid: 'rgba(197,203,206,0.1)'
} as const;

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_COINGLASS_API_BASE || 'https://open-api-v4.coinglass.com/api',
  apiKey: process.env.NEXT_PUBLIC_COINGLASS_API_KEY || '57e6078b48cf4f2bb9a308fabde7a594',
  timeout: 10000,
  retries: 3
} as const;

export const CHART_DEFAULTS = {
  height: 400,
  symbol: 'BTCUSDT',
  exchange: 'Binance',
  type: 'spot' as const,
  interval: '1h',
  daysBack: 7
} as const;
