// src/lib/kline-overlay.ts
import {
    registerOverlay,
    type OverlayTemplate,
    type OverlayCreateFiguresCallbackParams,
    type OverlayFigure,
  } from 'klinecharts';
  
  /** Доп. данные, которые можно прокинуть при создании overlay через extendData */
  export type TradingZoneExtend = {
    /** цвет заливки/бордеров, hex */
    color?: string;
    /** цвет бордеров (если нужен отличный от color) */
    borderColor?: string;
    /** прозрачность 0..1 */
    opacity?: number;
  };
  
  function hexToRgba(hex: string, alpha = 0.45) {
    const m = hex.replace('#', '');
    const v =
      m.length === 3
        ? parseInt(m.split('').map((c) => c + c).join(''), 16)
        : parseInt(m, 16);
    const r = (v >> 16) & 255;
    const g = (v >> 8) & 255;
    const b = v & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  let _registered = false;
  
  /**
   * Регистрирует кастомный overlay 'tradingZone'.
   * Вызывай один раз (например, в layout.tsx или перед первой инициализацией графика).
   */
  export function ensureTradingZoneOverlayRegistered() {
    if (_registered) return;
    _registered = true;
  
    // Используем строковые значения вместо enum'ов, чтобы исключить проблемы рантайма.
    const template: OverlayTemplate<TradingZoneExtend> = {
      name: 'tradingZone',
      totalStep: 2,
      // На время отладки поверх всего, потом можно поставить -1 (под свечами)
      zLevel: 10,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      // 'weak_magnet' дружелюбнее к кликам по времени
      mode: 'weak_magnet' as any,
      modeSensitivity: 6,
  
      createPointFigures: (
        params: OverlayCreateFiguresCallbackParams<TradingZoneExtend>
      ): OverlayFigure[] => {
        const { coordinates, bounding, overlay } = params;
  
        // Нет хотя бы одной точки — ничего не рисуем
        if (!coordinates[0]) return [];
  
        const a = coordinates[0];
        const b = coordinates[1] ?? coordinates[0];
  
        // x-координаты границ зоны
        const left = Math.min(a.x, b.x);
        const right = Math.max(a.x, b.x);
        const { top, bottom } = bounding;
  
        const color = overlay.extendData?.color ?? '#8b5cf6';
        const borderColor = overlay.extendData?.borderColor ?? color;
        const opacity = overlay.extendData?.opacity ?? 0.45;
  
        // Прямоугольник на всю высоту панели
        const fillRect: OverlayFigure = {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: left, y: top },
              { x: right, y: top },
              { x: right, y: bottom },
              { x: left, y: bottom },
            ],
          },
          styles: {
            // PolygonType.Fill
            style: 'fill',
            color: hexToRgba(color, opacity),
            borderColor,
            borderSize: 0,
            // LineType.Solid
            borderStyle: 'solid',
            borderDashedValue: [0, 0],
          },
          ignoreEvent: true,
        };
  
        // Левый бордер
        const leftLine: OverlayFigure = {
          type: 'line',
          attrs: {
            coordinates: [
              { x: left, y: top },
              { x: left, y: bottom },
            ],
          },
          styles: {
            // LineType.Solid
            style: 'solid',
            size: 2,
            color: borderColor,
            dashedValue: [0, 0],
          },
          ignoreEvent: true,
        };
  
        // Правый бордер
        const rightLine: OverlayFigure = {
          type: 'line',
          attrs: {
            coordinates: [
              { x: right, y: top },
              { x: right, y: bottom },
            ],
          },
          styles: {
            style: 'solid',
            size: 2,
            color: borderColor,
            dashedValue: [0, 0],
          },
          ignoreEvent: true,
        };
  
        return [fillRect, leftLine, rightLine];
      },
    };
  
    registerOverlay<TradingZoneExtend>(template);
    // console.debug('[kline-overlay] tradingZone registered');
  }
  