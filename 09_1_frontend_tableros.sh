#!/bin/bash

echo "*****************************************"
echo "*        09_1_frontend_tableros         *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"


# Verificar si Node.js está instalado
if ! command -v node &> /dev/null
then
    echo "Node.js no está instalado. Instalando Node.js..."
    # Instalar Node.js (Ubuntu/Debian)
    curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null
then
    echo "npm no está instalado. Instalando npm..."
    sudo apt-get install -y npm
fi

# Verificar si npx está instalado
if ! command -v npx &> /dev/null
then
    echo "npx no está instalado. Instalando npx..."
    sudo npm install --loglevel=error --no-audit -g npx --force
fi

# 📌 Eliminar versiones previas si existen
if [ -d "$FRONTEND_DIR" ]; then
    echo "🗑️ Eliminando versión anterior del frontend..."
    sudo rm -rf "$FRONTEND_DIR"
fi

# 📁 Crear nuevo directorio
echo "📁 Creando directorio del frontend..."
mkdir -p "$FRONTEND_DIR"

echo "🔧 Corrigiendo permisos en frontend..."
sudo chown -R $(whoami):$(whoami) "$FRONTEND_DIR"
sudo chmod -R 755 "$FRONTEND_DIR"

cd "$FRONTEND_DIR"


# Inicializar un nuevo proyecto React con TypeScript
CI=true npx --loglevel=error --no-audit create-react-app . --template typescript

# Eliminar el directorio .git creado por create-react-app
if [ -d ".git" ]; then
    echo "🗑️ Eliminando el directorio .git..."
    rm -rf .git
fi

# Instalar dependencias adicionales
CI=true npm install --loglevel=error --no-audit @emotion/react @emotion/styled @mui/icons-material @mui/material axios react-router-dom@^6 ajv@^6.12.6 ajv-keywords@^3.5.2 crypto-browserify process buffer

# Crear la estructura de directorios
mkdir -p src/assets src/components/Tabs src/components/RoomMatrix src/components/DeviceList src/components/Tableros src/pages src/services src/store src/styles

# Crear el archivo .gitignore
cat <<EOL > .gitignore
node_modules
build
.env
EOL

# Crear el archivo tsconfig.json
cat <<EOL > tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
EOL

# Crear el archivo public/index.html
cat <<EOL > public/index.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frontend</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
EOL

# Crear el archivo src/index.tsx
cat <<EOL > src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/custom.css'; // Importa el archivo de estilos personalizado

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
EOL

# Crear el archivo src/App.tsx
cat <<EOL > src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import Consumption from './pages/Consumption';
import Settings from './pages/Settings';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/consumption" element={<Consumption />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
EOL

# Crear el archivo src/theme.ts
cat <<EOL > src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

export default theme;
EOL

# Crear el archivo src/services/api.ts
cat <<EOL > src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://172.16.10.222:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dispositivos
export const getDispositivos = async () => {
  const response = await api.get('/dispositivos');
  return response.data;
};

export const toggleDevice = async (deviceId: number) => {
  const response = await api.post(\`/toggle_device/\${deviceId}\`);
  return response.data;
};

// Habitaciones
export const getHabitaciones = async () => {
  const response = await api.get('/habitaciones');
  return response.data;
};

export const createHabitacion = async (nombre: string, tableroId: number) => {
  const response = await api.post('/habitaciones', { nombre, tablero_id: tableroId });
  return response.data;
};

export const updateOrdenHabitaciones = async (habitaciones: { id: number; orden: number }[]) => {
  const response = await api.put('/habitaciones/orden', habitaciones);
  return response.data;
};

// Tableros
export const getTableros = async () => {
  const response = await api.get('/tableros');
  return response.data;
};

export const createTablero = async (nombre: string) => {
  const response = await api.post('/tableros', { nombre });
  return response.data;
};

export const deleteTablero = async (id: number) => {
  const response = await api.delete(\`/tableros/\${id}\`);
  return response.data;
};

export const updateOrdenTableros = async (tableros: { id: number; orden: number }[]) => {
  const response = await api.put('/tableros/orden', tableros);
  return response.data;
};

// Descubrimiento
export const startDiscovery = async (subredes: string[]) => {
  const response = await api.post('/start_discovery', { subredes });
  return response.data;
};

// Logs
export const getLogs = async () => {
  const response = await api.get('/logs');
  return response.data;
};

export default api;
EOL

