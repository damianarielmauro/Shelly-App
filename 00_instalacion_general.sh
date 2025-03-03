#!/bin/bash
set -e

# ===========================
# 🛠️ Instalación completa del sistema
# ===========================

echo "🚀 Iniciando instalación general de Shelly Monitoring..."

# Definir el directorio donde están los scripts
SCRIPT_DIR="$(dirname "$0")"

# Ejecutar los scripts en orden
bash "$SCRIPT_DIR/01_preparacion_sistema.sh"
bash "$SCRIPT_DIR/02_instalacion_postgresql.sh"
bash "$SCRIPT_DIR/03_configuracion_nginx.sh"
bash "$SCRIPT_DIR/04_configuracion_redis.sh"
bash "$SCRIPT_DIR/05_script_descubrimiento_shelly.sh"
bash "$SCRIPT_DIR/06_configuracion_firewall.sh"
bash "$SCRIPT_DIR/07_backend.sh"
#bash "$SCRIPT_DIR/08_0_frontend_base.sh"
#bash "$SCRIPT_DIR/08_1_frontend_tableros.sh"
#bash "$SCRIPT_DIR/08_2_frontend_tableros.sh"
#bash "$SCRIPT_DIR/08_3_frontend_tableros.sh"
#bash "$SCRIPT_DIR/08_4_frontend_discovery.sh"
#bash "$SCRIPT_DIR/09_iniciar_servicios.sh"

# ===========================
# ✅ Instalación completada
# ===========================

echo "🎉 Instalación completada con éxito. Todos los servicios han sido configurados correctamente."
