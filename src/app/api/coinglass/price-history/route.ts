import { NextRequest, NextResponse } from 'next/server';

const COINGLASS_API_BASE = 'https://open-api-v4.coinglass.com/api';
const API_KEY = process.env.COINGLASS_API_KEY || '57e6078b48cf4f2bb9a308fabde7a594';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const exchange = searchParams.get('exchange') || 'Binance';
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const type = searchParams.get('type') || 'spot';
    const interval = searchParams.get('interval') || '1h';
    const startTime = searchParams.get('start_time');
    const endTime = searchParams.get('end_time');
    const limit = searchParams.get('limit') || '1000';

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'start_time and end_time are required' },
        { status: 400 }
      );
    }

    const endpoint = type === 'futures' ? 'futures' : 'spot';
    const url = `${COINGLASS_API_BASE}/${endpoint}/price/history?` + new URLSearchParams({
      exchange,
      symbol,
      interval,
      start_time: startTime,
      end_time: endTime,
      limit
    });

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'CG-API-KEY': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code !== '0') {
      throw new Error(data.msg || 'API Error');
    }

    // Transform data to our format
    const transformedData = data.data.map((item: any) => ({
      time: Math.floor(item.time / 1000), // Convert to seconds
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume_usd || 0)
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      meta: {
        symbol,
        exchange,
        type,
        interval,
        count: transformedData.length
      }
    });

  } catch (error) {
    console.error('Coinglass API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
