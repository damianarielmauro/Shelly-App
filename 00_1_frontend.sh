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
bash "$SCRIPT_DIR/09_1_frontend_tableros.sh"
bash "$SCRIPT_DIR/09_2_frontend_tableros.sh"
bash "$SCRIPT_DIR/09_3_frontend_tableros.sh"
bash "$SCRIPT_DIR/09_4_frontend_discovery.sh"
bash "$SCRIPT_DIR/09_5_frontend_build.sh"

# ===========================
# ✅ Instalación completada
# ===========================

echo "🎉 Instalación completada con éxito. Todos los servicios han sido configurados correctamente."
