#!/bin/bash
set -e

echo "*****************************************"
echo "*        08_iniciar_servicios           *"
echo "*****************************************"


echo "🚀 Iniciando y verificando todos los servicios..."

# ===========================
# 🔄 Reiniciar y verificar servicios
# ===========================

# 📌 Iniciar y verificar PostgreSQL
echo "📦 Verificando PostgreSQL..."
sudo systemctl restart postgresql
sudo systemctl enable postgresql
if ! sudo systemctl is-active --quiet postgresql; then
    echo "❌ Error: PostgreSQL no está activo."
    exit 1
fi

# 📌 Iniciar y verificar Redis
echo "📦 Verificando Redis..."
sudo systemctl restart redis-server
sudo systemctl enable redis-server
if ! sudo systemctl is-active --quiet redis-server; then
    echo "❌ Error: Redis no está activo."
    exit 1
fi

# 📌 Iniciar y verificar Nginx
echo "📦 Verificando Nginx..."
sudo systemctl restart nginx
sudo systemctl enable nginx
if ! sudo systemctl is-active --quiet nginx; then
    echo "❌ Error: Nginx no está activo."
    exit 1
fi

# 📌 Verificar y asegurar permisos del backend
echo "🔧 Verificando permisos del backend..."
BACKEND_DIR="/opt/shelly_monitoring"
sudo chown -R www-data:www-data "$BACKEND_DIR"
sudo chmod -R 755 "$BACKEND_DIR"

# 📌 Asegurar existencia del archivo de logs
LOG_PATH="$BACKEND_DIR/backend.log"
if [ ! -f "$LOG_PATH" ]; then
    echo "⚠️ Creando archivo de logs del backend..."
    sudo touch "$LOG_PATH"
    sudo chown www-data:www-data "$LOG_PATH"
    sudo chmod 664 "$LOG_PATH"
fi

# 📌 Iniciar y verificar el backend Flask
echo "📦 Verificando Backend Flask..."
sudo systemctl restart shelly_monitoring
sudo systemctl enable shelly_monitoring
if ! sudo systemctl is-active --quiet shelly_monitoring; then
    echo "❌ Error: Backend Flask no está activo."
    exit 1
fi

# 📌 Verificación final de todos los servicios
echo "✅ Verificación final de servicios completada."
