#!/bin/bash

set -e

echo "*****************************************"
echo "*         09_1_frontend_files           *"
echo "*****************************************"

# Nombre del directorio del frontend
FRONTEND_DIR="/opt/shelly_monitoring/frontend"

cd "$FRONTEND_DIR"

# Crear la estructura de directorios adicionales
mkdir -p public src/assets src/components src/components/RoomMatrix src/components/DeviceList src/services src/store src/styles src/pages

echo "📦 Verificando que package.json existe..."
if [ ! -f "/opt/shelly_monitoring/frontend/package.json" ]; then
    echo "⚠️  No se encontró package.json, generando uno automáticamente..."
    cat > /opt/shelly_monitoring/frontend/package.json <<EOF
{
  "name": "Shelly_monitoring",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF
fi

# Reemplazar scripts en package.json
CI=true npx json -I -f package.json -e 'this.scripts.start="react-app-rewired start"'
CI=true npx json -I -f package.json -e 'this.scripts.build="react-app-rewired build"'
CI=true npx json -I -f package.json -e 'this.scripts.test="react-app-rewired test"'

# Reinstalar dependencias para evitar errores de módulos faltantes
echo "Reinstalando dependencias..."
rm -rf node_modules package-lock.json
CI=true npm install  --loglevel=error --no-audit

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
    "useUnknownInCatchVariables": true
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
cat <<EOF > src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import Consumption from './pages/Consumption';
import Settings from './pages/Settings';
import Login from './pages/Login';
import UsersManagement from './pages/UsersManagement';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme';
import { isLoggedIn } from './services/auth';

const PrivateRoute = ({ element: Element, ...rest }: any) => {
  return isLoggedIn() ? <Element {...rest} /> : <Navigate to="/login" />;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute element={Dashboard} />} />
        <Route path="/statistics" element={<PrivateRoute element={Statistics} />} />
        <Route path="/consumption" element={<PrivateRoute element={Consumption} />} />
        <Route path="/settings" element={<PrivateRoute element={Settings} />} />
        <Route path="/users" element={<PrivateRoute element={UsersManagement} />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
EOF

# Crear el archivo src/pages/Login.tsx
cat <<EOF > src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api';
import { TextField, Button, Box, Typography } from '@mui/material';
import axios, { AxiosError } from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await loginUser(email, password);
      navigate('/dashboard');  // Redirigir al dashboard si el login es exitoso
    } catch (err) {
      // Hacer una afirmación de tipo de AxiosError
      const axiosError = err as AxiosError;
      
      if (axios.isAxiosError(axiosError)) {
        setError(axiosError.response?.data?.error || 'Error desconocido');
      } else if (err instanceof Error) {
        setError(err.message || 'Error desconocido');
      } else {
        setError('Error desconocido');
      }
    }
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
      <Typography variant="h4" gutterBottom>Login</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          margin="normal"
        />
        {error && <Typography color="error">{error}</Typography>}
        <Button type="submit" variant="contained" color="primary" fullWidth>
          Iniciar Sesión
        </Button>
      </form>
    </Box>
  );
};

export default Login;
EOF

# Crear el archivo src/services/auth.ts
cat <<EOF > src/services/auth.ts
import axios from 'axios';

export const login = async (email: string, password: string) => {
  const response = await axios.post('https://172.16.10.222:8000/api/login', { email, password });
  return response.data;
};

export const isLoggedIn = () => {
  return !!localStorage.getItem('token');
};
EOF

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

# Crear el archivo config-overrides.js para configurar Webpack
cat <<EOL > config-overrides.js
const webpack = require('webpack');

module.exports = function override(config, env) {
  config.resolve.fallback = {
    crypto: require.resolve('crypto-browserify'),
    process: require.resolve('process/browser.js'),
    buffer: require.resolve('buffer/'),
  };
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
  );

  return config;
};
EOL

echo "📂 Archivos básicos para frontend generados automáticamente..."
