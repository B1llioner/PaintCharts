import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, ChartConfig, Hotkey, TradingZone } from '@/types';

interface AppStore extends AppState {
  // Actions
  addChart: (chart: Omit<ChartConfig, 'id' | 'zones'>) => void;
  removeChart: (chartId: string) => void;
  updateChart: (chartId: string, updates: Partial<ChartConfig>) => void;
  
  addHotkey: (hotkey: Omit<Hotkey, 'id'>) => void;
  updateHotkey: (hotkeyId: string, updates: Partial<Hotkey>) => void;
  removeHotkey: (hotkeyId: string) => void;
  
  addTradingZone: (zone: Omit<TradingZone, 'id' | 'createdAt'>) => void;
  removeTradingZone: (zoneId: string) => void;
  updateTradingZone: (zoneId: string, updates: Partial<TradingZone>) => void;
  
  setSelectedRange: (range: { from: number; to: number } | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Computed
  getChartById: (chartId: string) => ChartConfig | undefined;
  getZonesByChartId: (chartId: string) => TradingZone[];
  getHotkeyByKey: (key: string) => Hotkey | undefined;
}

const defaultHotkeys: Omit<Hotkey, 'id'>[] = [
  { name: 'Uptrend', key: 'U', color: '#00ff00', group: 'Trend' },
  { name: 'Downtrend', key: 'D', color: '#ff0000', group: 'Trend' },
  { name: 'Flat', key: 'F', color: '#ffff00', group: 'Trend' },
  { name: 'Бычка', key: 'B', color: '#00ffff', group: 'Vibe' },
  { name: 'Пролив', key: 'P', color: '#ff00ff', group: 'Vibe' },
  { name: 'Время брить хомяков', key: 'H', color: '#ffa500', group: 'Vibe' }
];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      charts: [],
      hotkeys: defaultHotkeys.map((hotkey, index) => ({ ...hotkey, id: `hotkey-${index}` })),
      tradingZones: [],
      currentChartId: 0,
      selectedRange: null,
      isLoading: false,
      error: null,

      // Chart actions
      addChart: (chartData) => {
        const newChart: ChartConfig = {
          ...chartData,
          id: `chart-${get().currentChartId}`,
          zones: []
        };
        
        set((state) => ({
          charts: [...state.charts, newChart],
          currentChartId: state.currentChartId + 1
        }));
      },

      removeChart: (chartId) => {
        set((state) => ({
          charts: state.charts.filter(chart => chart.id !== chartId),
          tradingZones: state.tradingZones.filter(zone => zone.chartId !== chartId)
        }));
      },

      updateChart: (chartId, updates) => {
        set((state) => ({
          charts: state.charts.map(chart => 
            chart.id === chartId ? { ...chart, ...updates } : chart
          )
        }));
      },

      // Hotkey actions
      addHotkey: (hotkeyData) => {
        const newHotkey: Hotkey = {
          ...hotkeyData,
          id: `hotkey-${Date.now()}`
        };
        
        set((state) => ({
          hotkeys: [...state.hotkeys, newHotkey]
        }));
      },

      updateHotkey: (hotkeyId, updates) => {
        set((state) => ({
          hotkeys: state.hotkeys.map(hotkey => 
            hotkey.id === hotkeyId ? { ...hotkey, ...updates } : hotkey
          )
        }));
      },

      removeHotkey: (hotkeyId) => {
        set((state) => ({
          hotkeys: state.hotkeys.filter(hotkey => hotkey.id !== hotkeyId)
        }));
      },

      // Trading zone actions
      addTradingZone: (zoneData) => {
        const newZone: TradingZone = {
          ...zoneData,
          id: `zone-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({
          tradingZones: [...state.tradingZones, newZone],
          charts: state.charts.map(chart => 
            chart.id === zoneData.chartId 
              ? { ...chart, zones: [...chart.zones, newZone] }
              : chart
          )
        }));
      },

      removeTradingZone: (zoneId) => {
        const zone = get().tradingZones.find(z => z.id === zoneId);
        if (zone) {
          set((state) => ({
            tradingZones: state.tradingZones.filter(z => z.id !== zoneId),
            charts: state.charts.map(chart => 
              chart.id === zone.chartId 
                ? { ...chart, zones: chart.zones.filter(z => z.id !== zoneId) }
                : chart
            )
          }));
        }
      },

      updateTradingZone: (zoneId, updates) => {
        set((state) => ({
          tradingZones: state.tradingZones.map(zone => 
            zone.id === zoneId ? { ...zone, ...updates } : zone
          )
        }));
      },

      // UI actions
      setSelectedRange: (range) => {
        set({ selectedRange: range });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Computed getters
      getChartById: (chartId) => {
        return get().charts.find(chart => chart.id === chartId);
      },

      getZonesByChartId: (chartId) => {
        return get().tradingZones.filter(zone => zone.chartId === chartId);
      },

      getHotkeyByKey: (key) => {
        return get().hotkeys.find(hotkey => hotkey.key.toLowerCase() === key.toLowerCase());
      }
    }),
    {
      name: 'trading-tool-storage',
      partialize: (state) => ({
        hotkeys: state.hotkeys,
        charts: state.charts.map(chart => ({
          ...chart,
          chart: undefined,
          series: undefined,
          zones: chart.zones.map(zone => ({
            ...zone,
            topLine: undefined,
            bottomLine: undefined,
            startLine: undefined,
            endLine: undefined
          }))
        }))
      })
    }
  )
);
