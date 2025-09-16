import { NextRequest, NextResponse } from 'next/server';
import { ExportData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    // Generate CSV content
    const headers = [
      'Timestamp', 'Symbol', 'Exchange', 'Type', 'Interval',
      'Open', 'High', 'Low', 'Close', 'Volume_USD',
      'Zone_Name', 'Zone_Group', 'Zone_Color', 'Zone_Start', 'Zone_End'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map((row: ExportData) => 
        headers.map(header => {
          const value = row[header.toLowerCase().replace('_', '_') as keyof ExportData];
          return `"${value || ''}"`;
        }).join(',')
      )
    ].join('\n');

    // Create response with CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="trading_zones_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('CSV Export Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed' 
      },
      { status: 500 }
    );
  }
}
