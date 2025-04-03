#!/bin/bash
set -e  # Detener el script si hay errores

# Verificar si Node.js y npm están instalados
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Node.js y/o npm no están instalados. Instalándolos..."
    sudo apt-get update
    sudo apt-get install -y nodejs npm
fi

# Directorio para el adaptador
ADAPTER_DIR="/opt/shelly_monitoring/shelly_adapter"

# Limpiar y crear directorio
echo "Preparando directorio del adaptador..."
rm -rf $ADAPTER_DIR
mkdir -p $ADAPTER_DIR

# Clonar repositorio
echo "Clonando repositorio Shelly.ioAdapter..."
cd $ADAPTER_DIR
git clone https://github.com/damianarielmauro/Shelly.ioAdapter.git .

# Verificar que el clone fue exitoso
if [ ! -f "$ADAPTER_DIR/package.json" ]; then
    echo "Error: No se pudo clonar correctamente el repositorio. No se encontró package.json"
    exit 1
fi

# Instalar dependencias
echo "Instalando dependencias con npm..."
cd $ADAPTER_DIR
npm install

# Crear archivo de configuración
echo "Creando archivo de configuración..."
cat > $ADAPTER_DIR/config.json << EOF
{
  "port": 8087,
  "protocol": "both",
  "bind": "0.0.0.0",
  "coapbind": "0.0.0.0",
  "qos": 1,
  "mqttusername": "admin",
  "mqttpassword": "shelly",
  "httpusername": "admin",
  "httppassword": "shelly",
  "autoupdate": false,
  "polltime": 60,
  "updateUnchangedObjects": false,
  "logDebugMessages": true
}
EOF

# Crear archivo de servicio systemd
echo "Configurando servicio systemd..."
cat > /etc/systemd/system/shelly-adapter.service << EOF
[Unit]
Description=Shelly.io Adapter
After=network.target

[Service]
ExecStart=/usr/bin/node $ADAPTER_DIR/main.js
WorkingDirectory=$ADAPTER_DIR
Restart=always
User=www-data
Group=www-data
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Ajustar permisos
echo "Ajustando permisos..."
chown -R www-data:www-data $ADAPTER_DIR
chmod -R 755 $ADAPTER_DIR

# Detener servicio si ya existe
systemctl stop shelly-adapter 2>/dev/null || true

# Habilitar e iniciar el servicio
echo "Iniciando servicio..."
systemctl daemon-reload
systemctl enable shelly-adapter
systemctl start shelly-adapter

echo "Verificando estado del servicio..."
systemctl status shelly-adapter --no-pager

echo "Shelly.ioAdapter configurado e iniciado en el puerto 8087"
