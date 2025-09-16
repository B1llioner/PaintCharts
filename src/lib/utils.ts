import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('ru-RU');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function downloadCSV(data: any[], filename: string) {
  const csvContent = [
    Object.keys(data[0]).join(','),
    ...data.map(row => 
      Object.values(row).map(value => `"${value || ''}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function validateSymbol(symbol: string): boolean {
  const pattern = /^[A-Z]{2,10}[A-Z]{3,10}$/;
  return pattern.test(symbol);
}

export function getRandomColor(): string {
  const colors = [
    '#00ff00', '#ff0000', '#ffff00', '#00ffff', '#ff00ff', '#ffa500',
    '#ff69b4', '#32cd32', '#4169e1', '#ff1493', '#00ced1', '#ff6347'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
