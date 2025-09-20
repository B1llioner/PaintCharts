// app/api/coinbase/symbols/route.ts
import { NextRequest, NextResponse } from "next/server";

type Market = "spot" | "futures";

// --- in-memory cache ---
type CacheKey = string;
type CacheValue = { timestamp: number; data: any };
const CACHE_TTL = 60 * 1000; // 1 минута
const cache: Record<CacheKey, CacheValue> = {};

function getCacheKey(type: Market) {
  return `coinbase:${type}`;
}

// Публичные Coinbase Exchange REST эндпоинты
const COINBASE_PRODUCTS = "https://api.exchange.coinbase.com/products";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") as Market) || "spot";

    if (type !== "spot") {
      return NextResponse.json(
        { success: false, error: "Coinbase: only 'spot' supported on public REST" },
        { status: 400 }
      );
    }

    const cacheKey = getCacheKey(type);
    const now = Date.now();

    // КЭШ
    if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
      const cached = cache[cacheKey].data;
      return NextResponse.json({
        ...cached,
        meta: { ...cached.meta, cached: true },
      });
    }

    // Получаем список продуктов (пары)
    const prodRes = await fetch(COINBASE_PRODUCTS, { cache: "no-store" });
    if (!prodRes.ok) {
      return NextResponse.json(
        { success: false, error: `Coinbase products error: ${prodRes.statusText}` },
        { status: prodRes.status }
      );
    }
    const products = await prodRes.json(); // массив объектов

    // Фильтруем только USDT/USDC и только online
    const filtered: Array<{ id: string; quote_currency?: string; status?: string }> =
      (Array.isArray(products) ? products : []).filter((p: any) => {
        const id = p?.id as string;
        const statusOk = (p?.status ?? "online") === "online";
        const endsOk = typeof id === "string" && (id.endsWith("-USDT") || id.endsWith("-USDC"));
        return statusOk && endsOk;
      });

    const data = filtered.map((p) => ({
      symbol: p.id,
      name: p.id,
      price: 0,
      change24h: 0,
    }));

    const responseData = {
      success: true,
      data,
      meta: {
        exchange: "Coinbase",
        type,
        market: null,
        count: data.length,
        cached: false,
      },
    };

    cache[cacheKey] = { timestamp: now, data: responseData };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Coinbase API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
