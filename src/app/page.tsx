'use client';

import { useEffect } from 'react';
import { TradingTool } from '@/components/TradingTool';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const { setError, clearError } = useAppStore();

  useEffect(() => {
    // Clear any existing errors on mount
    clearError();
  }, [clearError]);

  return (
    <main className="min-h-screen bg-dark-900 text-white">
      <TradingTool />
    </main>
  );
}
