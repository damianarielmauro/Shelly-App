#!/bin/bash
set -e

echo "*****************************************"
echo "*       04_configuracion_redis          *"
echo "*****************************************"


echo "🗄️ Instalando y configurando Redis..."

# ===========================
# 📦 Instalación de Redis
# ===========================

echo "📦 Instalando Redis..."
sudo apt update && sudo apt install -y redis-server

# ===========================
# ⚙️ Configuración de Redis
# ===========================

echo "⚙️ Configurando Redis..."
sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# ===========================
# 🔄 Habilitación y reinicio del servicio Redis
# ===========================

echo "🔄 Habilitando y reiniciando Redis..."
sudo systemctl enable redis-server
sudo systemctl restart redis-server

# ===========================
# 🔍 Verificación del estado de Redis
# ===========================

echo "🔍 Verificando el estado de Redis..."
sudo systemctl status redis-server --no-pager

if systemctl is-active --quiet redis-server; then
    echo "✅ Redis instalado y ejecutándose correctamente."
else
    echo "❌ Error: Redis no está en ejecución. Revisa los logs."
    exit 1
fi
