# Crear archivo de configuración
echo "Creando archivo de configuración..."
cat > $ADAPTER_DIR/config.json << EOF
{
  "port": 8087,
  "protocol": "http",
  "bind": "0.0.0.0",
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
