// app/api/okx/symbols/route.ts
import { NextRequest, NextResponse } from "next/server";

type Market = "spot" | "futures";

// OKX v5 tickers:
// SPOT:    https://www.okx.com/api/v5/market/tickers?instType=SPOT
// FUTURES: https://www.okx.com/api/v5/market/tickers?instType=FUTURES
function buildUrl(type: Market) {
  const url = new URL("https://www.okx.com/api/v5/market/tickers");
  url.searchParams.set("instType", type === "spot" ? "SPOT" : "SWAP");
  return url.toString();
}

function normalizeItem(item: any) {
  // OKX strings → numbers
  const last = Number(item.last);        // последняя цена
  const open24h = Number(item.open24h);  // цена 24ч назад (UTC)
  const changePct =
    isFinite(open24h) && open24h > 0 ? ((last - open24h) / open24h) * 100 : 0;

  return {
    symbol: item.instId,     // напр. "BTC-USDT" или "BTC-USDT-240927"
    name: item.instId,
    price: last,
    change24h: changePct,
  };
}

// --- in-memory cache ---
type CacheKey = string;
type CacheValue = { timestamp: number; data: any };
const CACHE_TTL = 60 * 1000; // 1 минута
const cache: Record<CacheKey, CacheValue> = {};

function getCacheKey(type: Market) {
  return `okx:${type}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") as Market) || "spot";

    if (type !== "spot" && type !== "futures") {
      return NextResponse.json(
        { success: false, error: "type must be 'spot' or 'futures'" },
        { status: 400 }
      );
    }

    const cacheKey = getCacheKey(type);
    const now = Date.now();

    // cache hit
    if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
      const cached = cache[cacheKey].data;
      return NextResponse.json({
        ...cached,
        meta: { ...cached.meta, cached: true },
      });
    }

    // upstream
    const url = buildUrl(type);
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `OKX error: ${res.statusText}` },
        { status: res.status }
      );
    }

    const payload = await res.json();
    // OKX формат ответа: { code: "0", msg: "", data: [...] }
    if (payload?.code !== "0") {
      return NextResponse.json(
        {
          success: false,
          error: `OKX API code=${payload?.code}: ${payload?.msg || "Unknown error"}`,
        },
        { status: 502 }
      );
    }

    const items: any[] = payload?.data ?? [];

    const normalized = items
      .map(normalizeItem)
      .filter((it) => it.price && it.price > 0)
      .filter((it) =>
        type === "spot"
          ? it.symbol.endsWith("-USDT") || it.symbol.endsWith("-USDC")
          : it.symbol.includes("-USDT-") || it.symbol.includes("-USDC-")
      );

    const responseData = {
      success: true,
      data: normalized,
      meta: {
        exchange: "OKX",
        type,
        market: null,
        count: normalized.length,
        cached: false,
      },
    };

    // save cache
    cache[cacheKey] = { timestamp: now, data: responseData };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("OKX API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
