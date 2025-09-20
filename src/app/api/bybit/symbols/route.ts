// app/api/bybit/symbols/route.ts
import { NextRequest, NextResponse } from "next/server";

type Market = "spot" | "futures";
type FuturesKind = "um" | "cm"; // um → linear (USDT-M), cm → inverse (COIN-M)

// Bybit v5: /v5/market/tickers?category=spot|linear|inverse
function buildUrl(params: { type: Market; futuresKind?: FuturesKind }) {
  const { type, futuresKind = "um" } = params;
  const url = new URL("https://api.bybit.com/v5/market/tickers");
  if (type === "spot") {
    url.searchParams.set("category", "spot");
  } else {
    url.searchParams.set("category", futuresKind === "cm" ? "inverse" : "linear");
  }
  return url.toString();
}

function normalizeItem(item: any) {
  // Bybit отдаёт строки; price24hPcnt — доля (0.0123 = 1.23%)
  const lastPrice = Number(item.lastPrice);
  const changePct = Number(item.price24hPcnt);
  return {
    symbol: item.symbol,
    name: item.symbol,
    price: lastPrice,
    change24h: isFinite(changePct) ? changePct * 100 : 0,
  };
}

// --- in-memory cache ---
type CacheKey = string;
type CacheValue = { timestamp: number; data: any };
const CACHE_TTL = 60 * 1000; // 1 мин
const cache: Record<CacheKey, CacheValue> = {};

function getCacheKey(type: Market, market: FuturesKind) {
  return `bybit:${type}:${market}`;
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

    // try cache first
    if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
      console.log("Bybit: serving from cache:", cacheKey);
      const cached = cache[cacheKey].data;
      return NextResponse.json({
        ...cached,
        meta: { ...cached.meta, cached: true },
      });
    }

    console.log("Bybit: fetching upstream:", cacheKey);
    const url = buildUrl({ type, futuresKind: market });
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Bybit error: ${res.statusText}` },
        { status: res.status }
      );
    }

    const payload = await res.json();

    // Bybit v5 response: { retCode, retMsg, result: { list: [...] } }
    if (payload?.retCode !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Bybit API retCode=${payload?.retCode}: ${payload?.retMsg || "Unknown error"}`,
        },
        { status: 502 }
      );
    }

    const items: any[] = payload?.result?.list ?? [];

    const normalized = items
      .map(normalizeItem)
      .filter((it) => it.price && it.price > 0) // убрать без цены
      .filter((it) => it.symbol?.endsWith("USDT") || it.symbol?.endsWith("USDC")); // оставить USDT/USDC

    const responseData = {
      success: true,
      data: normalized,
      meta: {
        exchange: "Bybit",
        type,
        market: type === "futures" ? market : null,
        count: normalized.length,
        cached: false,
      },
    };

    // store in cache
    cache[cacheKey] = { timestamp: now, data: responseData };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Bybit API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
