'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function HotkeyTester() {
  const { hotkeys, charts } = useAppStore();
  const [lastKey, setLastKey] = useState<string>('');
  const [lastAction, setLastAction] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setLastKey(event.key);
      
      const hotkey = hotkeys.find(h => h.key.toLowerCase() === event.key.toLowerCase());
      if (hotkey) {
        setLastAction(`Нажата клавиша: ${hotkey.key} (${hotkey.name})`);
        console.log('Hotkey pressed:', hotkey);
      } else {
        setLastAction(`Нажата клавиша: ${event.key} (не настроена)`);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys]);

  if (charts.length === 0) {
    return (
      <div className="fixed top-4 left-4 bg-yellow-600 text-white p-3 rounded-lg shadow-lg z-50">
        <div className="text-sm font-medium">⚠️ Добавьте график для тестирования хоткеев</div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-4 bg-blue-600 text-white p-3 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="text-sm font-medium mb-2">Тестер хоткеев</div>
      <div className="text-xs">
        <div>Последняя клавиша: <span className="font-mono">{lastKey}</span></div>
        <div className="mt-1">{lastAction}</div>
        <div className="mt-2 text-yellow-200">
          Доступные хоткеи: {hotkeys.map(h => h.key).join(', ')}
        </div>
      </div>
    </div>
  );
}
