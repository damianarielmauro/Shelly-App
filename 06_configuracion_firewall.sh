#!/bin/bash
set -e

echo "*****************************************"
echo "*       06_configuracion_firewall       *"
echo "*****************************************"

echo "🔧 Configurando Firewall UFW..."

# ===========================
# 📦 Instalación de UFW
# ===========================

echo "📦 Instalando UFW si no está presente..."
sudo apt update && sudo apt install -y ufw

# ===========================
# 🔥 Configuración de reglas del firewall
# ===========================

echo "🔥 Aplicando reglas del firewall..."

# 📌 Permitir SSH (evitar bloqueo accidental)
sudo ufw allow 22/tcp

# 📌 Permitir tráfico HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 📌 Permitir tráfico para la API Flask (Backend)
sudo ufw allow 8000/tcp

# 📌 Permitir tráfico para PostgreSQL
sudo ufw allow 5432/tcp

# 📌 Permitir tráfico para Redis
sudo ufw allow 6379/tcp

# 📌 Permitir tráfico para el Frontend con Vite (Desarrollo)
sudo ufw allow 5173/tcp

# 📌 Recargar y habilitar UFW
echo "🔄 Recargando reglas de UFW..."
sudo ufw reload
echo "y" | sudo ufw enable

# ===========================
# 🔍 Verificación del Firewall
# ===========================

echo "🔍 Estado del firewall UFW:"
sudo ufw status verbose

echo "✅ Configuración del firewall completada correctamente."
