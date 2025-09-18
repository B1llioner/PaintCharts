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

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      charts: [],
      tradingZones: [],
      hotkeys: defaultHotkeys.map((hotkey, index) => ({ ...hotkey, id: `hotkey-${index}` })),
      currentChartId: 0,
      selectedRange: null,
      isLoading: false,
      error: null,

      // Chart actions
      addChart: (data) =>
        set((state) => ({
          charts: [
            ...state.charts,
            {
              id: uuid(),       // ← уникальный
              ...data,
              zones: [],        // ← обязательно пусто
              chart: undefined,
              series: undefined,
            },
          ],
        })),

      removeChart: (chartId) => {
        set((state) => ({
          charts: state.charts.filter(chart => chart.id !== chartId),
          tradingZones: state.tradingZones.filter(zone => zone.chartId !== chartId)
        }));
      },

    // 2) ОБНОВЛЕНИЕ ГРАФИКА — СТРОГО ПО ID
    updateChart: (id, patch) =>
      set((state) => ({
        charts: state.charts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),

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
        
        console.log('Добавление зоны в стор:', newZone);
        
        set((state) => {
          const newState = {
            tradingZones: [...state.tradingZones, newZone]
          };
          console.log('Новое состояние стора:', newState);
          return newState;
        });
      },

      removeTradingZone: (zoneId) => {
        set((state) => ({
          tradingZones: state.tradingZones.filter(z => z.id !== zoneId)
        }));
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
        tradingZones: state.tradingZones,
        charts: state.charts.map(chart => ({
          ...chart,
          chart: undefined,
          series: undefined,
          zones: [] // Убираем сохранение zones, так как они хранятся в tradingZones
        }))
      })
    }
  )
);
