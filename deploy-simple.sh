#!/bin/bash

# ============================================
# Простой скрипт деплоя PaintCharts для тестового сервера
# ============================================
# Использование:
#   ./deploy-simple.sh
# Скрипт запросит все необходимые данные интерактивно

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Функции для логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ============================================
# СБОР ПАРАМЕТРОВ
# ============================================

echo -e "${BLUE}=========================================="
echo -e "🚀 Деплой PaintCharts на тестовый сервер"
echo -e "==========================================${NC}"
echo ""

# Запрос IP адреса
read -p "Введите IP адрес сервера: " SERVER_IP
if [ -z "$SERVER_IP" ]; then
    log_error "IP адрес не может быть пустым!"
    exit 1
fi

# Запрос пользователя
read -p "Введите имя пользователя [root]: " SERVER_USER
SERVER_USER=${SERVER_USER:-root}

# Запрос порта
read -p "Введите SSH порт [22]: " SERVER_PORT
SERVER_PORT=${SERVER_PORT:-22}

# Запрос пароля
echo -n "Введите пароль для ${SERVER_USER}@${SERVER_IP}: "
read -s SERVER_PASSWORD
echo ""

if [ -z "$SERVER_PASSWORD" ]; then
    log_error "Пароль не может быть пустым!"
    exit 1
fi

DEPLOY_PATH="/opt/paintcharts"

# ============================================
# ПРОВЕРКА ЗАВИСИМОСТЕЙ
# ============================================

log_info "Проверка зависимостей..."

# Проверка sshpass
if ! command -v sshpass &> /dev/null; then
    log_warning "sshpass не установлен. Устанавливаем..."
    
    # Определение ОС и установка sshpass
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y sshpass
        elif command -v yum &> /dev/null; then
            sudo yum install -y sshpass
        elif command -v pacman &> /dev/null; then
            sudo pacman -S --noconfirm sshpass
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            log_error "Установите Homebrew для macOS"
            exit 1
        fi
    fi
fi

# Проверка Docker локально
if ! command -v docker &> /dev/null; then
    log_error "Docker не установлен локально!"
    log_info "Установите Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# ============================================
# ФУНКЦИЯ ДЛЯ ВЫПОЛНЕНИЯ SSH КОМАНД
# ============================================

ssh_exec() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "$1"
}

scp_copy() {
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -P ${SERVER_PORT} "$1" ${SERVER_USER}@${SERVER_IP}:"$2"
}

# ============================================
# ШАГ 1: Проверка подключения
# ============================================

log_info "Проверка подключения к серверу..."

if ssh_exec "echo 'Подключение успешно'" > /dev/null 2>&1; then
    log_success "Подключение к серверу установлено"
else
    log_error "Не удается подключиться к серверу. Проверьте IP, пользователя и пароль"
    exit 1
fi

# ============================================
# ШАГ 2: Сборка Docker образа
# ============================================

log_info "Сборка Docker образа..."

# Проверка наличия Dockerfile
if [ ! -f "Dockerfile" ]; then
    log_error "Dockerfile не найден в текущей директории!"
    exit 1
fi

# Сборка образа
docker build -t paintcharts:latest . --platform linux/amd64

if [ $? -eq 0 ]; then
    log_success "Docker образ успешно собран"
else
    log_error "Ошибка при сборке Docker образа"
    exit 1
fi

# ============================================
# ШАГ 3: Сохранение образа
# ============================================

log_info "Сохранение Docker образа в файл..."

docker save paintcharts:latest | gzip > paintcharts.tar.gz

if [ $? -eq 0 ]; then
    log_success "Образ сохранен в paintcharts.tar.gz"
    log_info "Размер файла: $(du -h paintcharts.tar.gz | cut -f1)"
else
    log_error "Ошибка при сохранении образа"
    exit 1
fi

# ============================================
# ШАГ 4: Подготовка сервера
# ============================================

log_info "Подготовка сервера..."

# Скрипт установки Docker на сервере
INSTALL_SCRIPT='
set -e

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "Docker не установлен. Устанавливаем..."
    
    # Определение ОС
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    fi
    
    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y apt-transport-https ca-certificates curl software-properties-common
            curl -fsSL https://get.docker.com | sh
            ;;
        centos|rhel|fedora)
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io
            ;;
        *)
            curl -fsSL https://get.docker.com | sh
            ;;
    esac
    
    systemctl start docker
    systemctl enable docker
fi

# Проверка docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose не установлен. Устанавливаем..."
    
    # Установка Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
fi

# Создание директории для деплоя
mkdir -p /opt/paintcharts
cd /opt/paintcharts

# Остановка старого контейнера (если есть)
if [ -f "docker-compose.yml" ]; then
    docker-compose down || true
fi

# Открытие порта 80 в firewall
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw --force enable
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --reload
fi

echo "Сервер готов"
'

ssh_exec "$INSTALL_SCRIPT"

if [ $? -eq 0 ]; then
    log_success "Сервер подготовлен"
else
    log_error "Ошибка при подготовке сервера"
    exit 1
fi

# ============================================
# ШАГ 5: Копирование файлов
# ============================================

log_info "Копирование файлов на сервер..."

# Копирование Docker образа
log_info "Копирование Docker образа (это может занять время)..."
scp_copy "paintcharts.tar.gz" "${DEPLOY_PATH}/"

# Создание docker-compose.yml
cat > docker-compose.tmp.yml << 'EOF'
version: '3.8'

services:
  paintcharts:
    image: paintcharts:latest
    container_name: paintcharts-app
    ports:
      - "80:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - NEXT_TELEMETRY_DISABLED=1
      - COINGLASS_API_KEY=57e6078b48cf4f2bb9a308fabde7a594
      - COINGLASS_API_BASE=https://open-api-v4.coinglass.com/api
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

# Копирование docker-compose.yml
scp_copy "docker-compose.tmp.yml" "${DEPLOY_PATH}/docker-compose.yml"
rm docker-compose.tmp.yml

log_success "Файлы скопированы"

# ============================================
# ШАГ 6: Запуск приложения
# ============================================

log_info "Запуск приложения на сервере..."

DEPLOY_SCRIPT='
set -e
cd /opt/paintcharts

# Загрузка Docker образа
echo "Загрузка Docker образа..."
docker load < paintcharts.tar.gz

# Удаление архива
rm paintcharts.tar.gz

# Запуск контейнера
echo "Запуск контейнера..."
docker-compose up -d

# Ожидание запуска
echo "Ожидание запуска приложения..."
sleep 15

# Проверка статуса
docker-compose ps

# Показ логов
echo ""
echo "Последние логи:"
docker-compose logs --tail=20

# Проверка доступности
echo ""
echo "Проверка доступности приложения..."
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Приложение успешно запущено!"
else
    echo "⚠️ Приложение может еще запускаться. Проверьте логи: docker-compose logs"
fi
'

ssh_exec "$DEPLOY_SCRIPT"

# Удаление локального архива
rm paintcharts.tar.gz

# ============================================
# ГОТОВО
# ============================================

echo ""
log_success "=========================================="
log_success "🎉 Деплой завершен успешно!"
log_success "=========================================="
echo ""
echo -e "${GREEN}Приложение доступно по адресу:${NC}"
echo -e "${YELLOW}http://${SERVER_IP}${NC}"
echo ""
echo -e "${BLUE}Полезные команды на сервере:${NC}"
echo "  sshpass -p '${SERVER_PASSWORD}' ssh ${SERVER_USER}@${SERVER_IP}"
echo "  cd ${DEPLOY_PATH}"
echo "  docker-compose logs -f        # Смотреть логи в реальном времени"
echo "  docker-compose restart        # Перезапустить приложение"
echo "  docker-compose down           # Остановить приложение"
echo "  docker-compose up -d          # Запустить приложение"
echo "  docker-compose pull && docker-compose up -d  # Обновить и перезапустить"
echo ""
echo -e "${YELLOW}Примечание:${NC}"
echo "Если сайт не открывается, проверьте:"
echo "1. Открыт ли порт 80 на сервере"
echo "2. Нет ли другого сервиса на порту 80"
echo "3. Логи контейнера: docker-compose logs"