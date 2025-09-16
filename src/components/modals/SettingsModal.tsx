'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Hotkey } from '@/types';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { hotkeys, addHotkey, updateHotkey, removeHotkey } = useAppStore();
  const [newHotkey, setNewHotkey] = useState<Partial<Hotkey>>({
    name: '',
    key: '',
    color: '#ff0000',
    group: 'Trend'
  });

  const handleAddHotkey = () => {
    if (!newHotkey.name || !newHotkey.key) return;
    
    addHotkey({
      name: newHotkey.name,
      key: newHotkey.key,
      color: newHotkey.color || '#ff0000',
      group: newHotkey.group || 'Trend'
    });
    
    setNewHotkey({
      name: '',
      key: '',
      color: '#ff0000',
      group: 'Trend'
    });
  };

  const handleUpdateHotkey = (id: string, field: keyof Hotkey, value: string) => {
    updateHotkey(id, { [field]: value });
  };

  const handleRemoveHotkey = (id: string) => {
    removeHotkey(id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Настройки хоткеев</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Existing Hotkeys */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-4">Текущие характеристики</h3>
          
          <div className="space-y-3">
            {hotkeys.map((hotkey) => (
              <div key={hotkey.id} className="flex items-center space-x-3 p-3 bg-dark-700 rounded-lg">
                <input
                  type="text"
                  value={hotkey.name}
                  onChange={(e) => handleUpdateHotkey(hotkey.id, 'name', e.target.value)}
                  className="input flex-1"
                  placeholder="Название характеристики"
                />
                
                <input
                  type="text"
                  value={hotkey.key}
                  onChange={(e) => handleUpdateHotkey(hotkey.id, 'key', e.target.value)}
                  className="input w-20 text-center"
                  placeholder="Клавиша"
                  maxLength={1}
                />
                
                <input
                  type="color"
                  value={hotkey.color}
                  onChange={(e) => handleUpdateHotkey(hotkey.id, 'color', e.target.value)}
                  className="w-10 h-10 rounded border border-dark-600"
                />
                
                <select
                  value={hotkey.group}
                  onChange={(e) => handleUpdateHotkey(hotkey.id, 'group', e.target.value as any)}
                  className="input w-32"
                >
                  <option value="Trend">Trend</option>
                  <option value="Vibe">Vibe</option>
                  <option value="Custom">Custom</option>
                </select>
                
                <button
                  onClick={() => handleRemoveHotkey(hotkey.id)}
                  className="btn btn-danger px-3 py-2"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Hotkey */}
        <div className="border-t border-dark-600 pt-6">
          <h3 className="text-lg font-medium text-white mb-4">Добавить характеристику</h3>
          
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newHotkey.name || ''}
              onChange={(e) => setNewHotkey({ ...newHotkey, name: e.target.value })}
              className="input flex-1"
              placeholder="Название характеристики"
            />
            
            <input
              type="text"
              value={newHotkey.key || ''}
              onChange={(e) => setNewHotkey({ ...newHotkey, key: e.target.value })}
              className="input w-20 text-center"
              placeholder="Клавиша"
              maxLength={1}
            />
            
            <input
              type="color"
              value={newHotkey.color || '#ff0000'}
              onChange={(e) => setNewHotkey({ ...newHotkey, color: e.target.value })}
              className="w-10 h-10 rounded border border-dark-600"
            />
            
            <select
              value={newHotkey.group || 'Trend'}
              onChange={(e) => setNewHotkey({ ...newHotkey, group: e.target.value as any })}
              className="input w-32"
            >
              <option value="Trend">Trend</option>
              <option value="Vibe">Vibe</option>
              <option value="Custom">Custom</option>
            </select>
            
            <button
              onClick={handleAddHotkey}
              disabled={!newHotkey.name || !newHotkey.key}
              className="btn btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Добавить
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-dark-600">
          <button onClick={onClose} className="btn btn-secondary">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
