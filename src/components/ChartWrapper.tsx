'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ChartConfig, TradingZone } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useExport } from '@/hooks/useExport';

import { init, dispose, type Chart, type KLineData, type PaneOptions } from 'klinecharts';
import { ensureTradingZoneOverlayRegistered } from '@/lib/kline-overlay';

interface ChartWrapperProps {
  chart: ChartConfig;
}

function isTypingContext(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  const openDialog = document.querySelector<HTMLElement>('[role="dialog"], .modal, [data-modal="true"]');
  return !!(openDialog && openDialog.offsetParent !== null);
}

function normalizeToKLineData(raw: any[]): KLineData[] {
  return raw.map((d: any) => {
    const t =
      typeof d.time === 'number'
        ? d.time * 1000
        : Date.UTC(d.time?.year ?? 1970, (d.time?.month ?? 1) - 1, d.time?.day ?? 1);
    return {
      timestamp: d.timestamp ?? t,
      open: +d.open,
      high: +d.high,
      low: +d.low,
      close: +d.close,
      volume: d.volume != null ? +d.volume : undefined,
    } as KLineData;
  });
}

export function ChartWrapper({ chart }: ChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const mainPaneIdRef = useRef<string | null>(null);
  const dataReadyRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isHover, setIsHover] = useState(false);

  const [_activeHotkeyId, _setActiveHotkeyId] = useState<string | null>(null);
  const activeHotkeyIdRef = useRef<string | null>(null);
  const setActiveHotkeyId = (v: string | null) => { activeHotkeyIdRef.current = v; _setActiveHotkeyId(v); };

  const [_pendingStart, _setPendingStart] = useState<number | null>(null);
  const pendingStartRef = useRef<number | null>(null);
  const setPendingStart = (v: number | null) => { pendingStartRef.current = v; _setPendingStart(v); };

  const { removeChart, setError, updateChart, addTradingZone, tradingZones, hotkeys } = useAppStore();
  const { exportChartData } = useExport();

  const zonesForChart = useMemo(
    () => tradingZones.filter(z => z.chartId === chart.id),
    [tradingZones, chart.id]
  );

  const zonesSignature = useMemo(
    () => zonesForChart.map(z => `${z.id}:${z.startTime}-${z.endTime}-${z.color}`).sort().join('|'),
    [zonesForChart]
  );

  const getAnchorValue = (): number => {
    const list = chartRef.current?.getDataList?.() as KLineData[] | undefined;
    return list && list.length ? (list[list.length - 1].close ?? 0) : 0;
  };

  // --- хоткеи ---
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isTypingContext(e)) return;
      if (!isHover) return;

      const key = e.key.toLowerCase();
      if (key === 'escape') {
        setActiveHotkeyId(null);
        setPendingStart(null);
        return;
      }
      const hk = hotkeys.find(h => h.key?.toLowerCase() === key);
      if (!hk) return;

      e.preventDefault();
      if (activeHotkeyIdRef.current === hk.id) {
        setActiveHotkeyId(null);
        setPendingStart(null);
      } else {
        setActiveHotkeyId(hk.id);
        setPendingStart(null);
      }
    };

    document.addEventListener('keydown', onDown, { capture: true });
    return () => document.removeEventListener('keydown', onDown as any, { capture: true } as any);
  }, [hotkeys, isHover]);

  /** Синхронизируем стор → оверлеи (только свечная панель) */
  const syncZonesToChart = () => {
    const inst = chartRef.current;
    if (!inst || !dataReadyRef.current) return;
  
    // снести только зоны этого графика
    try { inst.removeOverlay({ name: 'tradingZone', groupId: chart.id }); } catch {}
  
    const anchor = getAnchorValue();
    zonesForChart.forEach(z => {
      const id = inst.createOverlay({
        name: 'tradingZone',
        groupId: chart.id, // уникальность на этот график
        // paneId не указываем — ляжет на свечную по умолчанию
        points: [
          { timestamp: z.startTime * 1000, value: anchor },
          { timestamp: z.endTime   * 1000, value: anchor },
        ],
        extendData: { color: z.color, borderColor: z.color, opacity: 0.45 },
      });
      if (!id) console.warn('createOverlay failed for zone', z);
    });
  };

  // --- загрузка данных ---
  const loadChartData = async () => {
    const inst = chartRef.current;
    if (!inst) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        '/api/coinglass/price-history?' +
          new URLSearchParams({
            exchange: chart.exchange,
            symbol: chart.symbol,
            type: chart.type,
            interval: chart.interval,
            start_time: new Date(chart.startDate).getTime().toString(),
            end_time: new Date(chart.endDate).getTime().toString(),
            limit: '1000',
          })
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API Error');

      const data = normalizeToKLineData(result.data);
      inst.applyNewData(data);
      inst.scrollToRealTime?.(0);
      dataReadyRef.current = true;

      // поднять зоны после данных
      syncZonesToChart();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  // --- инициализация графика ---
  useEffect(() => {
    if (!containerRef.current) return;

    // очень важно: зарегистрировать overlay до любых createOverlay
    ensureTradingZoneOverlayRegistered();

    let destroyed = false;
    let ro: ResizeObserver | null = null;

    try {
      const inst = init(containerRef.current, {
        styles: {
          grid: {
            horizontal: { show: true, color: 'rgba(197,203,206,0.1)', size: 1, dashedValue: [0, 0] },
            vertical:   { show: true, color: 'rgba(197,203,206,0.1)', size: 1, dashedValue: [0, 0] },
          },
          candle: {
            type: 'candle_solid' as any,
            bar: {
              upColor: '#26a69a',
              downColor: '#ef5350',
              noChangeColor: '#888',
              compareRule: 'current_open' as any,
              upBorderColor: '#26a69a',
              downBorderColor: '#ef5350',
              noChangeBorderColor: '#888',
              upWickColor: '#26a69a',
              downWickColor: '#ef5350',
              noChangeWickColor: '#888',
            },
            area: {
              lineSize: 1, lineColor: '#789', value: 'close', smooth: true,
              backgroundColor: 'rgba(120,136,152,0.12)',
              point: { show: false, color: '#fff', radius: 2, rippleColor: '#fff', rippleRadius: 4, animation: false, animationDuration: 0 },
            },
            priceMark: {
              show: true,
              high: { show: false, color: '#ccc', textOffset: 6, textSize: 11, textFamily: 'inherit', textWeight: '400' },
              low:  { show: false, color: '#ccc', textOffset: 6, textSize: 11, textFamily: 'inherit', textWeight: '400' },
              last: {
                show: true,
                compareRule: 'current_open' as any,
                line: { show: true, size: 1, style: 'solid' as any },
                text: {
                  show: true,
                  paddingLeft: 4, paddingTop: 2, paddingRight: 4, paddingBottom: 2,
                  style: 'fill' as any,
                  color: '#101010', size: 11, family: 'inherit', weight: 500,
                  borderStyle: 'solid' as any, borderDashedValue: [0, 0], borderSize: 0, borderColor: '#000', borderRadius: 4,
                },
                upColor: '#26a69a', downColor: '#ef5350', noChangeColor: '#888',
              },
            },
            tooltip: {
              showRule: 'follow_cross' as any,
              showType: 'standard' as any,
              defaultValue: '--',
              text: { color: '#ddd', size: 12, family: 'ui-monospace, monospace', weight: 400, marginLeft: 8, marginTop: 8, marginRight: 8, marginBottom: 8 },
              features: [],
              offsetLeft: 0, offsetTop: 0, offsetRight: 0,
            },
          },
        },
      });

      if (!inst) throw new Error('Не удалось инициализировать график');

      chartRef.current = inst;
      updateChart(chart.id, { chart: inst });

      // id главной свечной панели (после инициализации он уже есть)
      const panes = inst.getPaneOptions?.() as PaneOptions[] | PaneOptions | null;
      if (Array.isArray(panes)) {
        mainPaneIdRef.current = panes[0]?.id ?? null;
      } else if (panes && 'id' in panes) {
        mainPaneIdRef.current = (panes as PaneOptions).id ?? null;
      }

      // индикаторы: BOLL на свече, VOL — отдельная панель
      inst.createIndicator('BOLL', true);
      inst.createIndicator('VOL', false, { height: 90 });

      // клики → зоны (только свечная панель)
      const onRootClick = (ev: MouseEvent) => {
        const hkId = activeHotkeyIdRef.current;
        if (!hkId) return;

        const hk = useAppStore.getState().hotkeys.find(h => h.id === hkId);
        if (!hk) return;

        const rect = containerRef.current!.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;

        // конвертируем координату именно на свечной панели
        const res = inst.convertFromPixel([{ x, y }], { paneId: mainPaneIdRef.current ?? undefined });
        const p = Array.isArray(res) ? res[0] : (res as any);
        const ts: number | undefined = p?.timestamp;
        if (!ts) return;

        if (pendingStartRef.current == null) {
          setPendingStart(ts);
          return;
        }

        const startMs = Math.min(pendingStartRef.current, ts);
        const endMs   = Math.max(pendingStartRef.current, ts);
        const color   = hk.color || '#8b5cf6';
        const anchor  = getAnchorValue();

        // 1) overlay на графике
        const id = inst.createOverlay({
          name: 'tradingZone',
          groupId: chart.id,
          points: [
            { timestamp: startMs, value: anchor },
            { timestamp: endMs,   value: anchor },
          ],
          extendData: { color, borderColor: color, opacity: 0.45 },
        });

        // если по какой-то причине не создался — дальше нет смысла
        if (!id) {
          console.warn('tradingZone overlay not created');
          setPendingStart(null);
          return;
        }

        // 2) добавляем в стор (секунды)
        const zone: TradingZone = {
          id: crypto.randomUUID(),
          name: hk.name || 'Zone',
          color,
          group: hk.group || 'Custom',
          startTime: Math.floor(startMs / 1000),
          endTime: Math.floor(endMs / 1000),
          chartId: chart.id,
          createdAt: new Date().toISOString(),
          interval: chart.interval,
          symbol: chart.symbol,
          exchange: chart.exchange,
          type: chart.type,
        };
        addTradingZone(zone);

        const prevZones = (chart as any).zones || [];
        updateChart(chart.id, { zones: [...prevZones, zone] });

        setPendingStart(null);
      };

      containerRef.current.addEventListener('click', onRootClick);

      ro = new ResizeObserver(() => inst.resize());
      ro.observe(containerRef.current);

      setTimeout(() => { if (!destroyed) loadChartData(); }, 150);

      return () => {
        destroyed = true;
        containerRef.current?.removeEventListener('click', onRootClick);
        ro?.disconnect();
        dispose(inst);
        chartRef.current = null;
        mainPaneIdRef.current = null;
        dataReadyRef.current = false;
      };
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Ошибка инициализации графика');
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.id]);

  // пересоздаём зоны при изменении стора
  useEffect(() => {
    if (chartRef.current) syncZonesToChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonesSignature, chart.id]);

  // перезагрузка данных при смене параметров
  useEffect(() => {
    const t = setTimeout(() => {
      if (chartRef.current && chart.symbol && chart.exchange) {
        loadChartData();
      }
    }, 100);
    return () => clearTimeout(t);
  }, [chart.id, chart.symbol, chart.exchange, chart.type, chart.interval, chart.startDate, chart.endDate]);

  const handleRemove = () => {
    if (chartRef.current) dispose(chartRef.current);
    chartRef.current = null;
    removeChart(chart.id);
  };

  const handleExport = () => {
    exportChartData(chart);
  };

  const activeHk = hotkeys.find(h => h.id === _activeHotkeyId);

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden">
      <div className="bg-dark-700 px-4 py-3 border-b border-dark-600">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            <span className="font-medium">{chart.symbol}</span>
            <span className="mx-2">•</span><span>{chart.exchange}</span>
            <span className="mx-2">•</span><span>{chart.type}</span>
            <span className="mx-2">•</span><span>{chart.interval}</span>
            <span className="mx-2 text-blue-400">({zonesForChart.length} зон)</span>
            {activeHk && (
              <span className="ml-3" style={{ color: activeHk.color }}>
                Активный хоткей: {activeHk.key} — {activeHk.name}
                {pendingStartRef.current ? ' (выберите конец зоны)' : ' (кликните для старта зоны)'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={loadChartData} disabled={isLoading} className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-50">
              {isLoading ? '⏳' : '📊'} Загрузить
            </button>
            <button onClick={handleExport} disabled={isLoading} className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-50">
              {isLoading ? '⏳' : '📤'} Экспорт в CSV
            </button>
            <button onClick={handleRemove} className="btn btn-danger text-xs px-3 py-1">🗑️ Удалить</button>
          </div>
        </div>
      </div>

      <div
        className="relative h-[clamp(300px,45vh,900px)]"
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        {isLoading && (
          <div className="absolute inset-0 bg-dark-800/75 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-white">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2"></div>
              <span className="text-sm">Загрузка...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
