#!/bin/bash

echo "*****************************************"
echo "*        09_7_frontend_build            *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Instalar dependencias si no están instaladas
echo "📦 Instalando dependencias del frontend..."
npm install

# Compilar el proyecto y moverlo a la carpeta dist
echo "🔨 Compilando el frontend..."
npx react-app-rewired build
mkdir -p "$FRONTEND_DIR/dist"

# Verificar si la carpeta build existe antes de copiar
if [ -d "build" ]; then
    cp -r build/* "$FRONTEND_DIR/dist"
else
    echo "❌ Error: La carpeta build no se creó correctamente. La compilación falló."
    exit 1
fi

# ===========================
# 📦 Configuración de permisos
# ===========================

echo "📦 Configurando permisos del frontend..."
sudo chown -R www-data:www-data /opt/shelly_monitoring/frontend
sudo chmod -R 775 /opt/shelly_monitoring/frontend

# Mensaje de finalización
echo "✅ El proyecto frontend ha sido configurado y compilado exitosamente."
