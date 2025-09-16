// Глобальные переменные
let charts = [];
let hotkeys = [];
let tradingZones = [];
let currentChartId = 0;
let selectedRange = null;

// API настройки
const COINGLASS_API_BASE = 'https://open-api-v4.coinglass.com/api';
const API_KEY = '57e6078b48cf4f2bb9a308fabde7a594';

// Настройки по умолчанию
const DEFAULT_HOTKEYS = [
    { name: 'Uptrend', key: 'U', color: '#00ff00', group: 'Trend' },
    { name: 'Downtrend', key: 'D', color: '#ff0000', group: 'Trend' },
    { name: 'Flat', key: 'F', color: '#ffff00', group: 'Trend' },
    { name: 'Бычка', key: 'B', color: '#00ffff', group: 'Vibe' },
    { name: 'Пролив', key: 'P', color: '#ff00ff', group: 'Vibe' },
    { name: 'Время брить хомяков', key: 'H', color: '#ffa500', group: 'Vibe' }
];

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
    updateZonesList();
    setDefaultDates();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики для модальных окон
    document.getElementById('settingsModal').addEventListener('click', function(e) {
        if (e.target === this) closeSettingsModal();
    });
    
    document.getElementById('addChartModal').addEventListener('click', function(e) {
        if (e.target === this) closeAddChartModal();
    });

    // Обработчики клавиш для хоткеев
    document.addEventListener('keydown', handleHotkey);
}

// Установка дат по умолчанию
function setDefaultDates() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('chartStartDate').value = formatDateTimeLocal(weekAgo);
    document.getElementById('chartEndDate').value = formatDateTimeLocal(now);
}

// Форматирование даты для input datetime-local
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Управление модальными окнами
function openSettingsModal() {
    document.getElementById('settingsModal').style.display = 'flex';
    loadHotkeysList();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function openAddChartModal() {
    document.getElementById('addChartModal').style.display = 'flex';
}

function closeAddChartModal() {
    document.getElementById('addChartModal').style.display = 'none';
}

// Управление хоткеями
function loadHotkeysList() {
    const container = document.getElementById('hotkeyList');
    container.innerHTML = '';
    
    hotkeys.forEach((hotkey, index) => {
        const hotkeyElement = createHotkeyElement(hotkey, index);
        container.appendChild(hotkeyElement);
    });
}

function createHotkeyElement(hotkey, index) {
    const div = document.createElement('div');
    div.className = 'hotkey-item';
    div.innerHTML = `
        <input type="text" placeholder="Название характеристики" value="${hotkey.name || ''}" 
               onchange="updateHotkey(${index}, 'name', this.value)">
        <input type="text" placeholder="Горячая клавиша" value="${hotkey.key || ''}" 
               onchange="updateHotkey(${index}, 'key', this.value)">
        <input type="color" value="${hotkey.color || '#ff0000'}" 
               onchange="updateHotkey(${index}, 'color', this.value)">
        <select onchange="updateHotkey(${index}, 'group', this.value)">
            <option value="Trend" ${hotkey.group === 'Trend' ? 'selected' : ''}>Trend</option>
            <option value="Vibe" ${hotkey.group === 'Vibe' ? 'selected' : ''}>Vibe</option>
            <option value="Custom" ${hotkey.group === 'Custom' ? 'selected' : ''}>Custom</option>
        </select>
        <button class="btn btn-danger" onclick="removeHotkey(${index})">Удалить</button>
    `;
    return div;
}

function addHotkey() {
    hotkeys.push({
        name: '',
        key: '',
        color: '#ff0000',
        group: 'Trend'
    });
    loadHotkeysList();
}

function updateHotkey(index, field, value) {
    if (hotkeys[index]) {
        hotkeys[index][field] = value;
    }
}

function removeHotkey(index) {
    hotkeys.splice(index, 1);
    loadHotkeysList();
}

function saveSettings() {
    localStorage.setItem('tradingToolHotkeys', JSON.stringify(hotkeys));
    updateZonesList();
    closeSettingsModal();
    showStatus('Настройки сохранены');
}

function loadSettings() {
    const saved = localStorage.getItem('tradingToolHotkeys');
    if (saved) {
        hotkeys = JSON.parse(saved);
    } else {
        hotkeys = [...DEFAULT_HOTKEYS];
    }
    updateZonesList();
}

// Управление графиками
function addChart() {
    openAddChartModal();
}

function createChart() {
    const symbol = document.getElementById('chartSymbol').value;
    const exchange = document.getElementById('chartExchange').value;
    const type = document.getElementById('chartType').value;
    const interval = document.getElementById('chartInterval').value;
    const startDate = document.getElementById('chartStartDate').value;
    const endDate = document.getElementById('chartEndDate').value;

    if (!symbol) {
        showError('Введите символ пары');
        return;
    }

    const chartId = currentChartId++;
    const chartConfig = {
        id: chartId,
        symbol,
        exchange,
        type,
        interval,
        startDate,
        endDate
    };

    charts.push(chartConfig);
    updateChartsLayout();
    closeAddChartModal();
    
    // Создаем график
    createChartElement(chartConfig);
}

function createChartElement(config) {
    const container = document.getElementById('chartsContainer');
    
    // Удаляем сообщение о загрузке если есть
    const loading = container.querySelector('.loading');
    if (loading) loading.remove();

    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'chart-wrapper';
    chartWrapper.id = `chart-${config.id}`;
    
    chartWrapper.innerHTML = `
        <div class="chart-header">
            <div class="chart-info">
                ${config.symbol} | ${config.exchange} | ${config.type} | ${config.interval}
            </div>
            <div class="chart-controls">
                <button class="btn" onclick="loadChartData(${config.id})">Загрузить</button>
                <button class="btn btn-danger" onclick="removeChart(${config.id})">Удалить</button>
            </div>
        </div>
        <div class="chart-content">
            <div class="chart" id="chart-canvas-${config.id}"></div>
        </div>
    `;
    
    container.appendChild(chartWrapper);
    
    // Инициализируем график
    initializeChart(config);
}

function initializeChart(config) {
    const chartElement = document.getElementById(`chart-canvas-${config.id}`);
    
    const chart = LightweightCharts.createChart(chartElement, {
        layout: { 
            background: { type: 'solid', color: '#1a1a1a' }, 
            textColor: '#e0e0e0' 
        },
        rightPriceScale: { visible: true, borderVisible: false },
        grid: { 
            vertLines: { color: 'rgba(197,203,206,0.1)' }, 
            horzLines: { color: 'rgba(197,203,206,0.1)' } 
        },
        timeScale: { 
            timeVisible: true, 
            secondsVisible: false, 
            borderVisible: false 
        },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        width: chartElement.clientWidth,
        height: chartElement.clientHeight
    });

    // Добавляем серию свечей
    const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
    });

    // Сохраняем ссылку на график
    config.chart = chart;
    config.series = candlestickSeries;
    config.zones = [];

    // Обработчик изменения размера
    new ResizeObserver(() => {
        chart.applyOptions({ 
            width: chartElement.clientWidth,
            height: chartElement.clientHeight
        });
    }).observe(chartElement);

    // Загружаем данные
    loadChartData(config.id);
}

async function loadChartData(chartId) {
    const config = charts.find(c => c.id === chartId);
    if (!config) return;

    showStatus(`Загрузка данных для ${config.symbol}...`);

    try {
        const data = await fetchChartData(config);
        config.series.setData(data);
        config.chart.timeScale().fitContent();
        showStatus(`Данные загружены для ${config.symbol}`);
    } catch (error) {
        showError(`Ошибка загрузки данных: ${error.message}`);
    }
}

async function fetchChartData(config) {
    const apiKey = document.getElementById('apiKey').value || API_KEY;
    const startTime = new Date(config.startDate).getTime();
    const endTime = new Date(config.endDate).getTime();
    
    const endpoint = config.type === 'futures' ? 'futures' : 'spot';
    const url = `${COINGLASS_API_BASE}/${endpoint}/price/history?` + new URLSearchParams({
        exchange: config.exchange,
        symbol: config.symbol,
        interval: config.interval,
        start_time: startTime.toString(),
        end_time: endTime.toString(),
        limit: '1000'
    });

    const response = await fetch(url, {
        headers: {
            'accept': 'application/json',
            'CG-API-KEY': apiKey
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.code !== '0') {
        throw new Error(result.msg || 'Ошибка API');
    }

    return result.data.map(item => ({
        time: Math.floor(item.time / 1000), // Конвертируем в секунды
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume_usd || 0)
    }));
}

function removeChart(chartId) {
    const index = charts.findIndex(c => c.id === chartId);
    if (index === -1) return;

    charts.splice(index, 1);
    
    const chartElement = document.getElementById(`chart-${chartId}`);
    if (chartElement) {
        chartElement.remove();
    }

    updateChartsLayout();
    
    if (charts.length === 0) {
        const container = document.getElementById('chartsContainer');
        container.innerHTML = '<div class="loading">Добавьте график для начала работы</div>';
    }
}

function updateChartsLayout() {
    const container = document.getElementById('chartsContainer');
    const count = charts.length;
    
    // Удаляем все классы сетки
    container.className = 'charts-container';
    
    // Добавляем соответствующий класс
    if (count <= 1) {
        container.classList.add('grid-1');
    } else if (count <= 2) {
        container.classList.add('grid-2');
    } else if (count <= 4) {
        container.classList.add('grid-3');
    } else if (count <= 6) {
        container.classList.add('grid-5');
    } else {
        container.classList.add('grid-6');
    }
}

function loadAllCharts() {
    charts.forEach(config => {
        if (config.chart) {
            loadChartData(config.id);
        }
    });
}

// Обработка хоткеев
function handleHotkey(event) {
    const hotkey = hotkeys.find(h => h.key.toLowerCase() === event.key.toLowerCase());
    if (!hotkey) return;

    event.preventDefault();
    
    // Находим активный график (последний созданный)
    const activeChart = charts[charts.length - 1];
    if (!activeChart || !activeChart.chart) return;

    // Получаем выделенный диапазон времени
    const timeScale = activeChart.chart.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    
    if (!visibleRange) {
        showError('Выделите диапазон времени на графике');
        return;
    }

    // Создаем зону торговли
    const zone = {
        id: Date.now(),
        name: hotkey.name,
        color: hotkey.color,
        group: hotkey.group,
        startTime: visibleRange.from,
        endTime: visibleRange.to,
        chartId: activeChart.id,
        createdAt: new Date().toISOString()
    };

    tradingZones.push(zone);
    activeChart.zones.push(zone);
    
    // Добавляем зону на график
    addZoneToChart(activeChart, zone);
    updateZonesList();
    
    showStatus(`Добавлена зона: ${hotkey.name}`);
}

function addZoneToChart(chartConfig, zone) {
    const chart = chartConfig.chart;
    
    // Получаем данные для определения ценового диапазона
    const data = chartConfig.series.data();
    if (!data || data.length === 0) return;
    
    // Находим данные в указанном временном диапазоне
    const zoneData = data.filter(d => d.time >= zone.startTime && d.time <= zone.endTime);
    if (zoneData.length === 0) return;
    
    // Определяем минимальную и максимальную цены в зоне
    const prices = zoneData.map(d => [d.high, d.low]).flat();
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Создаем прямоугольную зону с помощью горизонтальных линий
    const topLine = chart.addPriceLine({
        price: maxPrice,
        color: zone.color,
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: zone.name
    });
    
    const bottomLine = chart.addPriceLine({
        price: minPrice,
        color: zone.color,
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: false
    });
    
    // Добавляем вертикальные линии для обозначения временных границ
    const startLine = chart.addPriceLine({
        price: minPrice + priceRange * 0.1,
        color: zone.color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: false
    });
    
    const endLine = chart.addPriceLine({
        price: minPrice + priceRange * 0.9,
        color: zone.color,
        lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: false
    });

    zone.topLine = topLine;
    zone.bottomLine = bottomLine;
    zone.startLine = startLine;
    zone.endLine = endLine;
}

function updateZonesList() {
    const container = document.getElementById('zonesList');
    container.innerHTML = '';

    // Группируем зоны по группам
    const groupedZones = {};
    tradingZones.forEach(zone => {
        if (!groupedZones[zone.group]) {
            groupedZones[zone.group] = [];
        }
        groupedZones[zone.group].push(zone);
    });

    // Отображаем зоны по группам
    Object.keys(groupedZones).forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.innerHTML = `<h5 style="margin: 10px 0 5px 0; color: #888;">${group}</h5>`;
        container.appendChild(groupDiv);

        groupedZones[group].forEach(zone => {
            const zoneDiv = document.createElement('div');
            zoneDiv.className = 'zone-item';
            zoneDiv.innerHTML = `
                <div class="zone-color" style="background-color: ${zone.color}"></div>
                <div class="zone-name">${zone.name}</div>
                <div class="zone-group">${zone.group}</div>
                <button class="btn btn-danger" onclick="removeZone(${zone.id})" style="padding: 4px 8px; font-size: 12px;">×</button>
            `;
            container.appendChild(zoneDiv);
        });
    });
}

function removeZone(zoneId) {
    const zoneIndex = tradingZones.findIndex(z => z.id === zoneId);
    if (zoneIndex === -1) return;

    const zone = tradingZones[zoneIndex];
    
    // Удаляем с графика
    if (zone.topLine) zone.topLine.remove();
    if (zone.bottomLine) zone.bottomLine.remove();
    if (zone.startLine) zone.startLine.remove();
    if (zone.endLine) zone.endLine.remove();

    // Удаляем из массивов
    tradingZones.splice(zoneIndex, 1);
    
    const chartConfig = charts.find(c => c.id === zone.chartId);
    if (chartConfig) {
        const chartZoneIndex = chartConfig.zones.findIndex(z => z.id === zoneId);
        if (chartZoneIndex !== -1) {
            chartConfig.zones.splice(chartZoneIndex, 1);
        }
    }

    updateZonesList();
    showStatus('Зона удалена');
}

// Экспорт в CSV
function exportToCSV() {
    if (tradingZones.length === 0) {
        showError('Нет зон для экспорта');
        return;
    }

    // Создаем CSV данные
    const csvData = generateCSVData();
    
    // Создаем и скачиваем файл
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trading_zones_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus('CSV файл экспортирован');
}

function generateCSVData() {
    // Заголовки
    const headers = [
        'Timestamp', 'Symbol', 'Exchange', 'Type', 'Interval', 
        'Open', 'High', 'Low', 'Close', 'Volume_USD',
        'Zone_Name', 'Zone_Group', 'Zone_Color', 'Zone_Start', 'Zone_End'
    ];
    
    // Собираем данные из всех графиков
    const rows = [];
    
    charts.forEach(chartConfig => {
        if (!chartConfig.series || !chartConfig.series.data()) return;
        
        const chartData = chartConfig.series.data();
        const chartZones = chartConfig.zones || [];
        
        chartData.forEach(candle => {
            // Находим зоны для этого времени
            const zonesForTime = chartZones.filter(zone => 
                candle.time >= zone.startTime && candle.time <= zone.endTime
            );
            
            if (zonesForTime.length > 0) {
                zonesForTime.forEach(zone => {
                    rows.push([
                        new Date(candle.time * 1000).toISOString(),
                        chartConfig.symbol,
                        chartConfig.exchange,
                        chartConfig.type,
                        chartConfig.interval,
                        candle.open,
                        candle.high,
                        candle.low,
                        candle.close,
                        candle.volume || '', // Объем может отсутствовать
                        zone.name,
                        zone.group,
                        zone.color,
                        new Date(zone.startTime * 1000).toISOString(),
                        new Date(zone.endTime * 1000).toISOString()
                    ]);
                });
            } else {
                // Добавляем строку без зоны
                rows.push([
                    new Date(candle.time * 1000).toISOString(),
                    chartConfig.symbol,
                    chartConfig.exchange,
                    chartConfig.type,
                    chartConfig.interval,
                    candle.open,
                    candle.high,
                    candle.low,
                    candle.close,
                    candle.volume || '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ]);
            }
        });
    });
    
    // Создаем CSV
    const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
    
    return csvContent;
}

// Утилиты
function showStatus(message) {
    document.getElementById('statusBar').textContent = message;
    setTimeout(() => {
        document.getElementById('statusBar').textContent = 'Готов к работе';
    }, 3000);
}

function showError(message) {
    console.error(message);
    showStatus(`Ошибка: ${message}`);
}

// Инициализация при загрузке
window.addEventListener('load', function() {
    showStatus('Приложение загружено');
});
