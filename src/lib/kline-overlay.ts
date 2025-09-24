// src/lib/kline-overlay.ts
import {
    registerOverlay,
    DomPosition,
    type OverlayTemplate,
    type OverlayCreateFiguresCallbackParams,
    type OverlayFigure,
  } from 'klinecharts';
  
  export type TradingZoneExtend = {
    color?: string;
    borderColor?: string;
    opacity?: number; // 0..1
  };
  
  function hexToRgba(hex: string, alpha = 0.45) {
    const m = hex.replace('#', '');
    const v = m.length === 3 ? parseInt(m.split('').map(c => c + c).join(''), 16) : parseInt(m, 16);
    const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  let registered = false;
  
  /** Регистрируй ОДИН раз, до первого init(chart) */
  export function ensureTradingZoneOverlayRegistered() {
    if (registered) return;
    registered = true;
  
    const template: OverlayTemplate<TradingZoneExtend> = {
      name: 'tradingZone',
      totalStep: 2,
      // для отладки поверх; когда всё ок — можно -1 (под свечами)
      zLevel: 10,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      mode: 'weak_magnet' as any,
      modeSensitivity: 6,
  
      createPointFigures: (p) => {
        const { chart, overlay, xAxis, bounding } = p;
      
        const ts0 = overlay.points?.[0]?.timestamp;
        if (ts0 == null) return [];
        const ts1 = overlay.points?.[1]?.timestamp ?? ts0;
      
        if (!xAxis) return [];
      
        // X из оси времени — всегда надёжно
        const x0 = xAxis.convertTimestampToPixel(ts0);
        const x1 = xAxis.convertTimestampToPixel(ts1);
        if (x0 == null || x1 == null) return [];
      
        const left = Math.min(x0, x1);
        const right = Math.max(x0, x1);
      
        // ⚠️ Критично: Y рисуем в СИСТЕМЕ КООРДИНАТ ПАНЕЛИ (0..paneHeight)
        const paneBox = chart.getSize(overlay.paneId, 'main' as any);
        const paneHeight = paneBox?.height ?? bounding.height ?? 0;
        const top = 0;
        const bottom = paneHeight;
      
        const baseColor   = overlay.extendData?.color ?? '#8b5cf6';
        const borderColor = overlay.extendData?.borderColor ?? baseColor;
        const opacity     = overlay.extendData?.opacity ?? 0.45;
      
        const width  = Math.max(1, right - left);
        const height = Math.max(1, bottom - top);
      
        const fill: OverlayFigure = {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: left,         y: top },
              { x: left + width, y: top },
              { x: left + width, y: top + height },
              { x: left,         y: top + height },
            ],
          },
          styles: {
            style: 'fill',
            color: hexToRgba(baseColor, opacity),
            borderColor,
            borderSize: 0,
            borderStyle: 'solid',
            borderDashedValue: [0, 0],
          },
          ignoreEvent: true,
        };
      
        const leftLine: OverlayFigure = {
          type: 'line',
          attrs: { coordinates: [{ x: left, y: top }, { x: left, y: top + height }] },
          styles: { style: 'solid', size: 2, color: borderColor, dashedValue: [0, 0] },
          ignoreEvent: true,
        };
        const rightLine: OverlayFigure = {
          type: 'line',
          attrs: { coordinates: [{ x: left + width, y: top }, { x: left + width, y: top + height }] },
          styles: { style: 'solid', size: 2, color: borderColor, dashedValue: [0, 0] },
          ignoreEvent: true,
        };
      
        return [fill, leftLine, rightLine];
      },
      
    };
  
    registerOverlay<TradingZoneExtend>(template);
  }
  