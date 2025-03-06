#!/bin/bash


echo "*****************************************"
echo "*       03_configuracion_nginx          *"
echo "*****************************************"


echo "🔧 Configurando Nginx para Shelly Monitoring..."

# 1️⃣ Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    sudo apt update && sudo apt install -y nginx
else
    echo "✅ Nginx ya está instalado."
fi

# 2️⃣ Eliminar configuración predeterminada de Nginx
echo "🛑 Eliminando configuración predeterminada de Nginx..."
sudo rm -f /etc/nginx/sites-enabled/default

# 3️⃣ Generar certificado SSL autofirmado si no existe
SSL_CERT="/etc/ssl/certs/shelly_monitoring.pem"
SSL_KEY="/etc/ssl/private/shelly_monitoring.key"

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    echo "🔑 Generando certificado SSL autofirmado..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_KEY" \
        -out "$SSL_CERT" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=shelly_monitoring"
    
    sudo chmod 600 "$SSL_KEY"
    sudo chmod 644 "$SSL_CERT"
else
    echo "✅ Certificado SSL ya existe."
fi

# 4️⃣ Crear el archivo de configuración para Shelly Monitoring
echo "📝 Creando configuración personalizada para Nginx..."

NGINX_CONF="/etc/nginx/sites-available/shelly_monitoring"

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    server_name _;

    # Redirigir todo el tráfico HTTP a HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/ssl/certs/shelly_monitoring.pem;
    ssl_certificate_key /etc/ssl/private/shelly_monitoring.key;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }

    location / {
        root /opt/shelly_monitoring/frontend/dist;
        index index.html;
        try_files \$uri /index.html;
    }

    # Si el frontend no existe, devolver error 503
    if (!-d /opt/shelly_monitoring/frontend/dist) {
        return 503;
    }
}
EOF

# 5️⃣ Crear enlace simbólico en sites-enabled
echo "🔗 Activando configuración de Nginx..."
sudo ln -sf /etc/nginx/sites-available/shelly_monitoring /etc/nginx/sites-enabled/shelly_monitoring

# 6️⃣ Ajustar permisos del frontend para que Nginx pueda acceder
echo "🔧 Ajustando permisos del frontend..."
sudo chown -R www-data:www-data /opt/shelly_monitoring/frontend
sudo chmod -R 755 /opt/shelly_monitoring/frontend

# 7️⃣ Verificar la configuración de Nginx antes de reiniciar
echo "✅ Verificando configuración de Nginx..."
sudo nginx -t

# 8️⃣ Reiniciar Nginx para aplicar cambios
echo "🔄 Reiniciando Nginx..."
sudo systemctl restart nginx

echo "🚀 Nginx configurado y ejecutándose correctamente."
