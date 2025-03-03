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

# ===========================
# 🌐 Instalación de Node.js y npm
# ===========================

echo "🚑 Eliminando versiones previas de Node.js y npm..."
sudo apt remove -y nodejs npm || true
sudo apt autoremove -y || true

# Forzar eliminación de carpetas residuales
echo "🗑️ Eliminando manualmente archivos residuales de npm y nodejs..."
sudo rm -rf /usr/lib/node_modules/ /usr/local/lib/node_modules/ ~/.npm ~/.cache/npm
sudo rm -rf /opt/shelly_monitoring/frontend/node_modules || true

# Instalación de Node.js
echo "🌐 Instalando Node.js v20 desde NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "🔄 Verificando e instalando npm si falta..."
if ! command -v npm &> /dev/null; then
    sudo apt install -y npm
fi

# Verificar que Node.js y npm estén instalados correctamente
echo "✅ Verificando instalación de Node.js y npm..."
node -v
npm -v

# 📦 Instalar dependencias
echo "📦 Instalando dependencias del frontend..."
echo "📂 Creando directorio del frontend si no existe..."
sudo mkdir -p /opt/shelly_monitoring/frontend
sudo chown -R $(whoami):$(whoami) /opt/shelly_monitoring/frontend
cd /opt/shelly_monitoring/frontend

echo "📦 Verificando que package.json existe..."
if [ ! -f "/opt/shelly_monitoring/frontend/package.json" ]; then
    echo "⚠️ No se encontró package.json, generando uno automáticamente..."
    cat > /opt/shelly_monitoring/frontend/package.json <<EOF
{
  "name": "shelly-monitoring",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "recoil": "^0.7.7",
    "axios": "^1.6.7",
    "clsx": "^2.0.0",
    "lodash": "^4.17.21",
    "socket.io-client": "^4.7.2"
  },
  "devDependencies": {
    "vite": "^4.5.6",
    "@vitejs/plugin-react": "^3.1.0",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.17"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
EOF
fi

echo "📦 Instalando dependencias del frontend..."
npm install --yes

# 🔍 Verificar y corregir vulnerabilidades en paquetes npm
echo "🛠 Ejecutando npm audit fix..."
npm audit fix || echo "⚠️ No se pudieron corregir todas las vulnerabilidades."

# 🔍 Forzar la corrección si aún quedan problemas (opcional)
echo "🛠 Intentando npm audit fix --force si aún hay vulnerabilidades..."
npm audit fix --force || echo "⚠️ Se aplicaron correcciones forzadas, pero revisa si el frontend sigue funcionando correctamente."


# 📂 Verificar que node_modules fue creada
echo "📂 Verificando que node_modules fue creada..."
if [ ! -d "node_modules" ]; then
    echo "❌ Error: La instalación de dependencias falló. node_modules no existe."
    exit 1
fi

echo "✅ Preparación del sistema completada con éxito."
