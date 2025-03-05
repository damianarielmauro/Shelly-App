#!/bin/bash
set -e

echo "*****************************************"
echo "*       01_preparacion_sistema          *"
echo "*****************************************"

echo "🔧 Iniciando la preparación del sistema..."

# ===========================
# 📦 Actualización del sistema y dependencias esenciales
# ===========================

echo "📦 Actualizando paquetes del sistema..."
sudo apt update && sudo apt upgrade -y
sudo apt -f install

# ✅ Esperar a que termine cualquier otro proceso de apt antes de continuar
while sudo fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
  echo "⏳ Esperando a que termine otro proceso de apt..."
  sleep 5
done

# ===========================
# 📦 Instalación de herramientas esenciales
# ===========================

sudo apt update

echo "📦 Instalando herramientas esenciales..."
sudo apt install -y curl wget git unzip software-properties-common ufw

# ===========================
# 🐍 Instalación y configuración de Python
# ===========================

echo "🐍 Instalando Python y paquetes necesarios..."
sudo apt install -y python3 python3-pip python3-venv python3-dev libpq-dev gcc

sudo mkdir -p /opt/shelly_monitoring
sudo chown -R $(whoami):$(whoami) /opt/shelly_monitoring
cd /opt/shelly_monitoring

# Crear entorno virtual
if [ ! -d "venv" ]; then
    echo "⚙️ Creando entorno virtual de Python..."
    python3 -m venv venv
fi

# Corregir permisos del entorno virtual
echo "🔧 Corrigiendo permisos del entorno virtual..."
sudo chown -R $(whoami):$(whoami) /opt/shelly_monitoring/venv

# Activar entorno virtual
echo "🐍 Activando entorno virtual y actualizando pip..."
source venv/bin/activate

# Instalar dependencias de Python
echo "📦 Instalando bibliotecas de Python necesarias..."
pip install --upgrade pip
pip install flask flask-sqlalchemy flask-socketio redis requests pandas \
            matplotlib psycopg2-binary gunicorn eventlet

# Desactivar entorno virtual
deactivate

echo "🚑 Eliminando versiones previas de Node.js y npm..."
sudo apt remove -y nodejs npm || true
sudo apt autoremove -y || true

# Forzar eliminación de carpetas residuales
echo "🗑️ Eliminando manualmente archivos residuales de npm y nodejs..."
sudo rm -rf /usr/lib/node_modules/ /usr/local/lib/node_modules/ ~/.npm ~/.cache/npm
sudo rm -rf /opt/shelly_monitoring/frontend/node_modules || true

echo "✅ Preparación del sistema completada con éxito."
