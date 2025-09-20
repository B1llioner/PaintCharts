// app/api/binance/route.ts
import { NextRequest, NextResponse } from "next/server";

type Market = "spot" | "futures";
type FuturesKind = "um" | "cm"; // USDT-M / COIN-M

function buildUrl(params: { type: Market; futuresKind?: FuturesKind }) {
  const { type, futuresKind = "um" } = params;

  if (type === "spot") {
    return "https://api.binance.com/api/v3/ticker/24hr";
  }

  return futuresKind === "cm"
    ? "https://dapi.binance.com/dapi/v1/ticker/24hr" // COIN-M
    : "https://fapi.binance.com/fapi/v1/ticker/24hr"; // USDT-M (default)
}

function normalizeItem(item: any) {
  return {
    symbol: item.symbol,
    name: item.symbol,
    price: Number(item.lastPrice),
    change24h: Number(item.priceChangePercent),
  };
}

// Примитивный in-memory кэш (живёт только в рамках процесса)
type CacheKey = string;
type CacheValue = {
  timestamp: number;
  data: any;
};
const CACHE_TTL = 60 * 1000; // 1 минута
const cache: Record<CacheKey, CacheValue> = {};

function getCacheKey(type: Market, market: FuturesKind) {
  return `${type}:${market}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") as Market) || "spot";
    const market = (searchParams.get("market") as FuturesKind) || "um"; // для futures

    if (type !== "spot" && type !== "futures") {
      return NextResponse.json(
        { success: false, error: "type must be 'spot' or 'futures'" },
        { status: 400 }
      );
    }

    const cacheKey = getCacheKey(type, market);
    const now = Date.now();

    // Проверяем кэш
    if (
      cache[cacheKey] &&
      now - cache[cacheKey].timestamp < CACHE_TTL &&
      cache[cacheKey].data
    ) {
      // Отдаём кэшированные данные
      return NextResponse.json(cache[cacheKey].data);
    }

    const url = buildUrl({ type, futuresKind: market });
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Binance error: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : [data];

    const normalized = items
      .map(normalizeItem)
      .filter((item) => item.price && item.price > 0) // убираем без цены
      .filter((item) =>
        item.symbol.endsWith('USDT') || item.symbol.endsWith('USDC')
      ); // оставляем только пары, заканчивающиеся на USDT или USDC

    const responseData = {
      success: true,
      data: normalized,
      meta: {
        exchange: "Binance",
        type,
        market: type === "futures" ? market : null,
        count: normalized.length,
      },
    };

    // Кэшируем результат
    cache[cacheKey] = {
      timestamp: now,
      data: responseData,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Binance API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
