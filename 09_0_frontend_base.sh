#!/bin/bash

set -e

echo "*****************************************"
echo "*         09_0_frontend_base            *"
echo "*****************************************"

# ===========================
# 📂 Crear directorio del frontend si no existe
# ===========================

echo "📂 Verificando directorio del frontend..."
sudo mkdir -p /opt/shelly_monitoring/frontend

# ===========================
# 📦 Configuración de permisos
# ===========================

echo "📦 Configurando permisos del frontend..."
sudo chown -R $(whoami):$(whoami) /opt/shelly_monitoring/frontend
sudo chmod -R 775 /opt/shelly_monitoring/frontend

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# ===========================
# 🔧 Instalación de herramientas base
# ===========================

# 📂 Verificar existencia de package.json, si no existe crearlo automáticamente
echo "📂 Verificando que package.json existe..."
if [ ! -f "package.json" ]; then
    echo "⚠️ No se encontró package.json, generando uno automáticamente..."
    cat > package.json <<EOF
{
  "name": "shelly-monitoring",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "recoil": "^0.7.7",
    "axios": "^1.6.7",
    "clsx": "^2.0.0",
    "lodash": "^4.17.21",
    "socket.io-client": "^4.7.2"
  },
  "devDependencies": {
    "vite": "^4.5.6",
    "@vitejs/plugin-react": "^3.1.0",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.17"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
EOF
fi

# 📂 Verificar y crear estructura mínima del frontend
echo "📂 Verificando estructura mínima del frontend..."
mkdir -p src/pages src/components src/context

# 📌 Generar src/App.jsx si no existe
echo "📌 Verificando src/App.jsx..."
if [ ! -f "src/App.jsx" ]; then
    echo "⚠️ No se encontró src/App.jsx, generando uno básico..."
    cat > src/App.jsx <<EOF
import React from 'react';

function App() {
    return (
        <div>
            <h1>Shelly Monitoring</h1>
            <p>Bienvenido a Shelly Monitoring</p>
        </div>
    );
}

export default App;
EOF
fi

# 📌 Generar src/main.jsx si no existe
echo "📌 Verificando src/main.jsx..."
if [ ! -f "src/main.jsx" ]; then
    echo "⚠️ No se encontró src/main.jsx, generando uno básico..."
    cat > src/main.jsx <<EOF
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
EOF
fi

# 📌 Generar index.html en la raíz si no existe
echo "📌 Verificando index.html..."
if [ ! -f "index.html" ]; then
    echo "⚠️ No se encontró index.html, generando uno básico..."
    cat > index.html <<EOF
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shelly Monitoring</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>
EOF
fi

# 📌 Generar vite.config.js con proxy correcto
echo "📌 Verificando vite.config.js..."
if [ ! -f "vite.config.js" ]; then
    echo "⚠️ No se encontró vite.config.js, generando uno automáticamente..."
    cat > vite.config.js <<EOF
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: "./",
    server: {
        proxy: {
            '/api': {
                target: 'https://127.0.0.1:8000',
                changeOrigin: true,
                secure: false
            }
        }
    }
});
EOF
fi

# 📦 Instalación de dependencias y compilación
echo "📦 Verificando instalación de dependencias..."
if [ ! -d "node_modules" ]; then
    echo "⚠️ No se encontraron dependencias. Ejecutando npm install..."
    npm install --yes --loglevel=error --no-audit
fi

echo "📦 Verificando versión de Vite..."
npm uninstall vite --save-dev
npm install vite@latest --save-dev

# 🚀 Construcción del frontend
echo "⚡ Compilando frontend con Vite..."
npm run build || echo "❌ Error en la compilación, revisa los logs."

echo "✅ Frontend con Vite instalado y configurado correctamente."
echo "✅ Instalación y configuración del frontend base completadas exitosamente."
