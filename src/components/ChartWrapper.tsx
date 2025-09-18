'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChartConfig, TradingZone } from '@/types';
import { useAppStore } from '@/store/useAppStore';

type UTCTimestamp = number;
type LwTime = UTCTimestamp | { year: number; month: number; day: number };

interface ChartWrapperProps {
  chart: ChartConfig;
}

/** Прозрачный цвет для зоны */
function hexToRgba(hex: string, alpha = 0.28) {
  const m = hex.replace('#', '');
  const v = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16);
  const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Нормализуем время lightweight-charts в unix-sec */
function toUnix(t: LwTime): UTCTimestamp {
  if (typeof t === 'number') return t;
  const d = Date.UTC(t.year, t.month - 1, t.day, 0, 0, 0);
  return Math.floor(d / 1000);
}

/** Игнорим хоткеи, когда пользователь печатает или открыт модал */
function isTypingContext(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;

  // Примитивная проверка открытого модала
  const openDialog = document.querySelector<HTMLElement>('[role="dialog"], .modal, [data-modal="true"]');
  if (openDialog && openDialog.offsetParent !== null) return true;

  return false;
}

export function ChartWrapper({ chart }: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Ховер над областью графика (чтобы не ловить хоткеи везде)
  const [isHover, setIsHover] = useState(false);

  // Активный хоткей (тип зоны) — и в state, и в ref (чтобы onClick видел актуальное)
  const [_activeHotkeyId, _setActiveHotkeyId] = useState<string | null>(null);
  const activeHotkeyIdRef = useRef<string | null>(null);
  const setActiveHotkeyId = (v: string | null) => {
    activeHotkeyIdRef.current = v;
    _setActiveHotkeyId(v);
  };

  // Ожидание второго клика — старт зоны
  const [_pendingStart, _setPendingStart] = useState<UTCTimestamp | null>(null);
  const pendingStartRef = useRef<UTCTimestamp | null>(null);
  const setPendingStart = (v: UTCTimestamp | null) => {
    pendingStartRef.current = v;
    _setPendingStart(v);
  };

  // Ссылки на стор
  const {
    removeChart,
    setError,
    updateChart,
    addTradingZone,
    tradingZones,
    hotkeys,
  } = useAppStore();

  // Зоны для заголовка/слежения (рендер всё равно берёт из стора напрямую)
  const zonesForChart = useMemo(
    () => tradingZones.filter(z => z.chartId === chart.id),
    [tradingZones, chart.id]
  );

  // ==== Рисовальщик зон (через ref, чтобы всегда быть актуальным) ====
  const redrawOverlayRef = useRef<() => void>(() => {});
  const doRedrawOverlay = () => {
    const inst = chartInstanceRef.current;
    const overlay = overlayRef.current;
    if (!inst || !overlay) return;

    const ts = inst.timeScale();
    overlay.innerHTML = '';

    // Берём именно текущее состояние зон из стора
    const allZones = useAppStore.getState().tradingZones;
    const zonesNow = allZones.filter(z => z.chartId === chart.id);

    zonesNow.forEach((z) => {
      const x1 = ts.timeToCoordinate(z.startTime);
      const x2 = ts.timeToCoordinate(z.endTime);
      if (x1 == null || x2 == null) return;

      const left = Math.min(x1, x2);
      const width = Math.max(1, Math.abs(x2 - x1));

      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.top = '0';
      el.style.bottom = '0';
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      el.style.background = hexToRgba(z.color, 0.28);
      el.style.pointerEvents = 'none';
      // Акценты по краям зоны (как референс)
      el.style.borderLeft = `2px solid ${z.color}`;
      el.style.borderRight = `2px solid ${z.color}`;
      overlay.appendChild(el);
    });

    // Линия старта, если ждём второй клик
    const pending = pendingStartRef.current;
    if (pending != null) {
      const x = ts.timeToCoordinate(pending);
      if (x != null) {
        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.top = '0';
        line.style.bottom = '0';
        line.style.left = `${x}px`;
        line.style.width = '1px';
        line.style.background = 'rgba(255,255,255,0.35)';
        line.style.pointerEvents = 'none';
        overlay.appendChild(line);
      }
    }
  };
  // Обновляем ссылку на актуальный рисовальщик на каждом рендере
  useEffect(() => {
    redrawOverlayRef.current = doRedrawOverlay;
  });

  // ==== Хоткеи: включение/выключение режима бинда + ESC ====
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (isTypingContext(e)) return; // игнор при вводе/модале
      // Если нужно активировать хоткеи только над графиком — оставь проверку isHover
      if (!isHover) return;

      const key = e.key.toLowerCase();

      // ESC: выход из режима + сброс незавершенной зоны
      if (key === 'escape') {
        setActiveHotkeyId(null);
        setPendingStart(null);
        requestAnimationFrame(() => redrawOverlayRef.current());
        return;
      }

      const hk = hotkeys.find(h => h.key?.toLowerCase() === key);
      if (!hk) return;

      e.preventDefault();
      if (activeHotkeyIdRef.current === hk.id) {
        // повторное нажатие — выключаем биндинг
        setActiveHotkeyId(null);
        setPendingStart(null);
      } else {
        // включаем новый тип зоны
        setActiveHotkeyId(hk.id);
        setPendingStart(null);
      }
      requestAnimationFrame(() => redrawOverlayRef.current());
    };

    document.addEventListener('keydown', onDown, { capture: true });
    return () => document.removeEventListener('keydown', onDown, { capture: true } as any);
  }, [hotkeys, isHover]);

  // ==== Инициализация чарта (только на монтаж/смену chart.id) ====
  useEffect(() => {
    if (!chartRef.current) return;

    let destroyed = false;
    let ro: ResizeObserver | null = null;
    let unsubClick: (() => void) | null = null;
    let unsubRange: (() => void) | null = null;

    (async () => {
      try {
        const { createChart, CandlestickSeries } = await import('lightweight-charts');
        if (!chartRef.current || destroyed) return;

        const inst = createChart(chartRef.current, {
          layout: { background: { color: '#1a1a1a' }, textColor: '#e0e0e0' },
          rightPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
          grid: {
            vertLines: { color: 'rgba(197,203,206,0.1)' },
            horzLines: { color: 'rgba(197,203,206,0.1)' },
          },
          timeScale: { timeVisible: true, secondsVisible: true, borderVisible: true },
          crosshair: { mode: 1 },
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        });

        const series = inst.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
          priceScaleId: 'right',
        });

        chartInstanceRef.current = inst;
        seriesRef.current = series;

        // Сохраняем ссылки для экспорта и внешних действий
        useAppStore.getState().updateChart(chart.id, { chart: inst, series });

        // Обработчик кликов для биндинга зон
        const onClick = (param: any) => {
          if (!param || param.point?.x == null || param.point?.y == null) return;
          if (!param.time) return; // клик вне области баров
          const currentHotkeyId = activeHotkeyIdRef.current;
          if (!currentHotkeyId) return; // режим не активен

          const hk = useAppStore.getState().hotkeys.find(h => h.id === currentHotkeyId);
          if (!hk) return;

          const t = toUnix(param.time as LwTime);

          // Первый клик — фиксируем старт
          if (pendingStartRef.current == null) {
            setPendingStart(t);
            requestAnimationFrame(() => redrawOverlayRef.current());
            return;
          }

          // Второй клик — создаём зону
          const start = Math.min(pendingStartRef.current, t);
          const end = Math.max(pendingStartRef.current, t);

          const zone: TradingZone = {
            id: crypto.randomUUID(),
            name: hk.name || 'Zone',
            color: hk.color || '#8b5cf6',
            group: hk.group || 'Custom',
            startTime: start,
            endTime: end,
            chartId: chart.id,
            createdAt: new Date().toISOString(),
            interval: chart.interval,
            symbol: chart.symbol,
            exchange: chart.exchange,
            type: chart.type,
          };

          // Глобальный список (левая панель)
          useAppStore.getState().addTradingZone(zone);

          // Дублируем в chart.zones — экспорт остаётся рабочим
          const prevZones = (chart as any).zones || [];
          useAppStore.getState().updateChart(chart.id, { zones: [...prevZones, zone] });

          // Остаёмся в активном типе, но сбрасываем ожидание конца
          setPendingStart(null);
          requestAnimationFrame(() => redrawOverlayRef.current());
        };

        inst.subscribeClick(onClick);
        unsubClick = () => inst.unsubscribeClick(onClick);

        // При скролле/зумах — просто перерисовываем актуальным рисовальщиком
        const onRange = () => requestAnimationFrame(() => redrawOverlayRef.current());
        inst.timeScale().subscribeVisibleTimeRangeChange(onRange);
        unsubRange = () => inst.timeScale().unsubscribeVisibleTimeRangeChange(onRange);

        // Ресайз контейнера
        ro = new ResizeObserver(() => {
          if (!chartRef.current) return;
          inst.applyOptions({
            width: chartRef.current.clientWidth,
            height: chartRef.current.clientHeight,
          });
          requestAnimationFrame(() => redrawOverlayRef.current());
        });
        ro.observe(chartRef.current);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Ошибка инициализации графика');
      }
    })();

    return () => {
      destroyed = true;
      ro?.disconnect();
      unsubClick?.();
      unsubRange?.();
      chartInstanceRef.current?.remove();
      chartInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.id]);

  // Перерисовать overlay при изменении зон / хоткея / ожидания второго клика
  useEffect(() => {
    requestAnimationFrame(() => redrawOverlayRef.current());
  }, [tradingZones, _activeHotkeyId, _pendingStart, chart.id]);

  // ==== Загрузка данных ====
  const loadChartData = async () => {
    if (!seriesRef.current) return;

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
          }),
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result.success) {
        seriesRef.current.setData(result.data);
        chartInstanceRef.current?.timeScale().fitContent();
        requestAnimationFrame(() => redrawOverlayRef.current());
      } else {
        throw new Error(result.error || 'API Error');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    chartInstanceRef.current?.remove();
    chartInstanceRef.current = null;
    removeChart(chart.id);
  };

  const activeHk = hotkeys.find(h => h.id === _activeHotkeyId);

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-dark-700 px-4 py-3 border-b border-dark-600">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            <span className="font-medium">{chart.symbol}</span>
            <span className="mx-2">•</span>
            <span>{chart.exchange}</span>
            <span className="mx-2">•</span>
            <span>{chart.type}</span>
            <span className="mx-2">•</span>
            <span>{chart.interval}</span>
            {activeHk && (
              <span className="ml-3" style={{ color: activeHk.color }}>
                Активный хоткей: {activeHk.key} — {activeHk.name}
                {pendingStartRef.current ? ' (выберите конец зоны)' : ' (кликните для старта зоны)'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadChartData}
              disabled={isLoading}
              className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-50"
            >
              {isLoading ? '⏳' : '📊'} Загрузить
            </button>
            <button onClick={handleRemove} className="btn btn-danger text-xs px-3 py-1">
              🗑️ Удалить
            </button>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div
        className="relative"
        style={{ height: '750px' }}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        <div ref={chartRef} className="w-full h-full" />
        {/* Полупрозрачные зоны поверх канваса */}
        <div ref={overlayRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }} />
        {isLoading && (
          <div className="absolute inset-0 bg-dark-800 bg-opacity-75 flex items-center justify-center">
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
