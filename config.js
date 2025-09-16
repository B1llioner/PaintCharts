// Конфигурация по умолчанию для инструмента торговых зон

// API настройки
const DEFAULT_CONFIG = {
    // Coinglass API
    API_KEY: '57e6078b48cf4f2bb9a308fabde7a594',
    API_BASE_URL: 'https://open-api-v4.coinglass.com/api',
    
    // Поддерживаемые биржи
    EXCHANGES: [
        { value: 'Binance', label: 'Binance' },
        { value: 'OKX', label: 'OKX' },
        { value: 'Bybit', label: 'Bybit' },
        { value: 'Coinbase', label: 'Coinbase' }
    ],
    
    // Поддерживаемые таймфреймы
    INTERVALS: [
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
    ],
    
    // Настройки графиков по умолчанию
    CHART_DEFAULTS: {
        symbol: 'BTCUSDT',
        exchange: 'Binance',
        type: 'spot',
        interval: '1h',
        daysBack: 7
    },
    
    // Цвета для зон торговли
    ZONE_COLORS: [
        '#00ff00', // Зеленый - Uptrend
        '#ff0000', // Красный - Downtrend
        '#ffff00', // Желтый - Flat
        '#00ffff', // Голубой - Бычка
        '#ff00ff', // Пурпурный - Пролив
        '#ffa500', // Оранжевый - Время брить хомяков
        '#ff69b4', // Розовый
        '#32cd32', // Лаймовый
        '#4169e1', // Королевский синий
        '#ff1493'  // Глубокий розовый
    ],
    
    // Группы характеристик
    ZONE_GROUPS: [
        { value: 'Trend', label: 'Trend', description: 'Трендовые характеристики' },
        { value: 'Vibe', label: 'Vibe', description: 'Настроенческие характеристики' },
        { value: 'Custom', label: 'Custom', description: 'Пользовательские характеристики' }
    ],
    
    // Характеристики по умолчанию
    DEFAULT_HOTKEYS: [
        {
            name: 'Uptrend',
            key: 'U',
            color: '#00ff00',
            group: 'Trend',
            description: 'Восходящий тренд'
        },
        {
            name: 'Downtrend',
            key: 'D',
            color: '#ff0000',
            group: 'Trend',
            description: 'Нисходящий тренд'
        },
        {
            name: 'Flat',
            key: 'F',
            color: '#ffff00',
            group: 'Trend',
            description: 'Боковое движение'
        },
        {
            name: 'Бычка',
            key: 'B',
            color: '#00ffff',
            group: 'Vibe',
            description: 'Бычий рынок'
        },
        {
            name: 'Пролив',
            key: 'P',
            color: '#ff00ff',
            group: 'Vibe',
            description: 'Медвежий рынок'
        },
        {
            name: 'Время брить хомяков',
            key: 'H',
            color: '#ffa500',
            group: 'Vibe',
            description: 'Время высокой волатильности'
        }
    ],
    
    // Настройки экспорта
    EXPORT_SETTINGS: {
        filename: 'trading_zones',
        includeMetadata: true,
        includePrices: true,
        includeVolume: false,
        dateFormat: 'ISO'
    },
    
    // Настройки интерфейса
    UI_SETTINGS: {
        theme: 'dark',
        chartHeight: '400px',
        maxCharts: 6,
        autoFit: true,
        showGrid: true,
        showCrosshair: true
    }
};

// Вспомогательные функции
const ConfigUtils = {
    // Получить случайный цвет для новой зоны
    getRandomColor: function() {
        const colors = DEFAULT_CONFIG.ZONE_COLORS;
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    // Получить настройки по умолчанию для нового графика
    getDefaultChartConfig: function() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - DEFAULT_CONFIG.CHART_DEFAULTS.daysBack * 24 * 60 * 60 * 1000);
        
        return {
            ...DEFAULT_CONFIG.CHART_DEFAULTS,
            startDate: weekAgo.toISOString().slice(0, 16),
            endDate: now.toISOString().slice(0, 16)
        };
    },
    
    // Валидация символа пары
    validateSymbol: function(symbol) {
        const pattern = /^[A-Z]{2,10}[A-Z]{3,10}$/;
        return pattern.test(symbol);
    },
    
    // Форматирование даты для API
    formatDateForAPI: function(dateString) {
        return new Date(dateString).getTime();
    },
    
    // Получить URL для API запроса
    getAPIUrl: function(type, params) {
        const baseUrl = DEFAULT_CONFIG.API_BASE_URL;
        const endpoint = type === 'futures' ? 'futures' : 'spot';
        const queryString = new URLSearchParams(params).toString();
        return `${baseUrl}/${endpoint}/price/history?${queryString}`;
    }
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEFAULT_CONFIG, ConfigUtils };
}
