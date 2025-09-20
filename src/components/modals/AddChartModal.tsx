'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface AddChartModalProps {
  onClose: () => void;
}

interface Symbol {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

const EXCHANGES = [
  { value: 'Binance', label: 'Binance' },
  { value: 'OKX', label: 'OKX' },
  { value: 'Bybit', label: 'Bybit' },
  { value: 'Coinbase', label: 'Coinbase' }
];

const INTERVALS = [
  { value: '1m', label: '1 минута' },
  { value: '3m', label: '3 минуты' },
  { value: '5m', label: '5 минут' },
  { value: '15m', label: '15 минут' },
  { value: '30m', label: '30 минут' },
  { value: '1h', label: '1 час' },
  { value: '4h', label: '4 часа' },
  { value: '6h', label: '6 часов' },
  { value: '8h', label: '8 часов' },
  { value: '12h', label: '12 часов' },
  { value: '1d', label: '1 день' },
  { value: '1w', label: '1 неделя' }
];

export function AddChartModal({ onClose }: AddChartModalProps) {
  const { addChart } = useAppStore();
  const [formData, setFormData] = useState({
    symbol: '',
    exchange: 'Binance',
    type: 'spot' as 'spot' | 'futures',
    interval: '1h',
    startDate: '',
    endDate: ''
  });

  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [symbolsError, setSymbolsError] = useState<string | null>(null);

  // Set default dates
  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    setFormData(prev => ({
      ...prev,
      startDate: weekAgo.toISOString().slice(0, 16),
      endDate: now.toISOString().slice(0, 16)
    }));
  }, []);

  // Загружаем символы при изменении биржи или типа
  useEffect(() => {
    if (formData.exchange && formData.type) {
      loadSymbols();
    } else {
      setSymbols([]);
      setFormData(prev => ({ ...prev, symbol: '' }));
    }
  }, [formData.exchange, formData.type]);

  const loadSymbols = async () => {
    setLoadingSymbols(true);
    setSymbolsError(null);
    
    try {
      // Используем бирже-специфичный API endpoint
      const exchangeApiUrl = `/api/${formData.exchange.toLowerCase()}/symbols`;
      const response = await fetch(
        `${exchangeApiUrl}?${new URLSearchParams({
          type: formData.type
        })}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setSymbols(result.data);
        // Автоматически выбираем первый символ, если список не пустой
        if (result.data.length > 0) {
          setFormData(prev => ({ ...prev, symbol: result.data[0].symbol }));
        }
      } else {
        throw new Error(result.error || 'Ошибка загрузки символов');
      }
    } catch (error) {
      setSymbolsError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      setSymbols([]);
    } finally {
      setLoadingSymbols(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.symbol || !formData.startDate || !formData.endDate) {
      return;
    }

    addChart({
      symbol: formData.symbol.toUpperCase(),
      exchange: formData.exchange,
      type: formData.type,
      interval: formData.interval,
      startDate: formData.startDate,
      endDate: formData.endDate
    });

    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSymbolFieldDisabled = !formData.exchange || !formData.type || loadingSymbols;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Добавить график</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exchange and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Биржа
              </label>
              <select
                value={formData.exchange}
                onChange={(e) => handleChange('exchange', e.target.value)}
                className="input w-full"
              >
                {EXCHANGES.map(exchange => (
                  <option key={exchange.value} value={exchange.value}>
                    {exchange.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Тип
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="input w-full"
              >
                <option value="spot">Спотовая пара</option>
                <option value="futures">Фьючерсная пара</option>
              </select>
            </div>
          </div>

          {/* Symbol Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Торговая пара
            </label>
            {loadingSymbols ? (
              <div className="input w-full flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span className="text-gray-400">Загрузка пар...</span>
              </div>
            ) : symbolsError ? (
              <div className="input w-full text-red-400 bg-red-900/20 border-red-500">
                Ошибка: {symbolsError}
              </div>
            ) : (
              <select
                value={formData.symbol}
                onChange={(e) => handleChange('symbol', e.target.value)}
                className="input w-full"
                disabled={isSymbolFieldDisabled}
                required
              >
                <option value="">
                  {isSymbolFieldDisabled 
                    ? 'Сначала выберите биржу и тип' 
                    : 'Выберите торговую пару'
                  }
                </option>
                {symbols.map(symbol => (
                  <option key={symbol.symbol} value={symbol.symbol}>
                    {symbol.symbol} {symbol.price > 0 ? `($${symbol.price.toFixed(4)})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Интервал
            </label>
            <select
              value={formData.interval}
              onChange={(e) => handleChange('interval', e.target.value)}
              className="input w-full"
            >
              {INTERVALS.map(interval => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Начальная дата
              </label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Конечная дата
              </label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="input w-full"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-dark-600">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!formData.symbol || !formData.startDate || !formData.endDate || loadingSymbols}
            >
              {loadingSymbols ? 'Загрузка...' : 'Создать график'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
