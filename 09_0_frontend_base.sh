#!/bin/bash

set -e

echo "*****************************************"
echo "*         09_0_frontend_base            *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

# 📌 Eliminar versiones previas si existen
if [ -d "$FRONTEND_DIR" ]; then
    echo "🗑️ Eliminando versión anterior del frontend..."
    sudo rm -rf "$FRONTEND_DIR"
fi

echo "📂 Creando directorio del frontend..."
sudo mkdir -p "$FRONTEND_DIR"
cd "$FRONTEND_DIR"

echo "📦 Configurando permisos del frontend..."
sudo chown -R $(whoami):$(whoami) "$FRONTEND_DIR"
sudo chmod -R 775 "$FRONTEND_DIR"

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "Node.js no está instalado. Instalando Node.js..."
    # Instalar Node.js (Ubuntu/Debian)
    curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "npm no está instalado. Instalando npm..."
    sudo apt-get install -y npm
fi

# Verificar si npx está instalado
if ! command -v npx &> /dev/null; then
    echo "npx no está instalado. Instalando npx..."
    sudo npm install --loglevel=error --no-audit -g npx --force --loglevel=error --no-audit
fi

# Inicializar un nuevo proyecto React con TypeScript
CI=true npx create-react-app . --no-git --template typescript

# Eliminar el directorio .git creado por create-react-app
if [ -d ".git" ]; then
    echo "🗑️ Eliminando el directorio .git..."
    rm -rf .git
fi

# Instalar dependencias adicionales
echo "📦 Instalación de dependencias adicionales..."
CI=true npm install --loglevel=error --no-audit @emotion/react @emotion/styled @mui/icons-material @mui/material axios react-router-dom@^6 ajv@^6.12.6 ajv-keywords@^3.5.2 crypto-browserify process buffer

# Instalar react-app-rewired y ansi_up
CI=true npm install --loglevel=error --no-audit react-app-rewired ansi_up --save

