'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface AddChartModalProps {
  onClose: () => void;
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
    symbol: 'BTCUSDT',
    exchange: 'Binance',
    type: 'spot' as 'spot' | 'futures',
    interval: '1h',
    startDate: '',
    endDate: ''
  });

  // Set default dates
  useState(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    setFormData(prev => ({
      ...prev,
      startDate: weekAgo.toISOString().slice(0, 16),
      endDate: now.toISOString().slice(0, 16)
    }));
  });

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
          {/* Symbol and Exchange */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Пара
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => handleChange('symbol', e.target.value)}
                className="input w-full"
                placeholder="BTCUSDT"
                required
              />
            </div>
            
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
          </div>

          {/* Type and Interval */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            >
              Создать график
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
