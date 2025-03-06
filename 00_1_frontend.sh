#!/bin/bash
set -e

# ===========================
# 🛠️ Instalación completa del sistema
# ===========================

echo "🚀 Iniciando instalación general de Shelly Monitoring..."

# Definir el directorio donde están los scripts
SCRIPT_DIR="$(dirname "$0")"

# Ejecutar los scripts en orden
bash "$SCRIPT_DIR/09_0_frontend_base.sh"
bash "$SCRIPT_DIR/09_1_frontend_files.sh"
bash "$SCRIPT_DIR/09_2_frontend_api.sh"
bash "$SCRIPT_DIR/09_3_frontend_tabmanager.sh"
bash "$SCRIPT_DIR/09_4_frontend_dashboard.sh"
bash "$SCRIPT_DIR/09_5_frontend_rooms_devices.sh"
bash "$SCRIPT_DIR/09_6_frontend_discovery.sh"
bash "$SCRIPT_DIR/09_7_frontend_build.sh"

# ===========================
# ✅ Instalación completada
# ===========================

echo "🎉 Instalación completada con éxito. Todos los servicios han sido configurados correctamente."
