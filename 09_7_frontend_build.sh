#!/bin/bash

echo "*****************************************"
echo "*        09_7_frontend_build            *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"


# Compilar el proyecto y moverlo a la carpeta dist
npm run build
mkdir -p "$FRONTEND_DIR/dist"
cp -r build/* "$FRONTEND_DIR/dist"

# ===========================
# 📦 Configuración de permisos
# ===========================

echo "📦 Configurando permisos del frontend..."
sudo chown -R www-data:www-data /opt/shelly_monitoring/frontend
sudo chmod -R 775 /opt/shelly_monitoring/frontend

# Mensaje de finalización
echo "El proyecto frontend ha sido configurado y compilado exitosamente."
