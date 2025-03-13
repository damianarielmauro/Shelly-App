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
    "react-router-dom": "^6.20.1",
    "axios": "^0.24.0"
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
import React, { useEffect, useState } from 'react';
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
import { isLoggedIn, getUser, setAuthToken } from './services/auth';

interface PrivateRouteProps {
  element: React.ComponentType<any>;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element: Element, ...rest }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) {
      const userData = getUser();
      setUser(userData);
      const token = localStorage.getItem('token');
      setAuthToken(token); // Set the token in axios headers
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Puedes reemplazar esto con un spinner o algún componente de carga
  }

  if (!isLoggedIn()) {
    return <Navigate to="/login" />;
  }

  console.log('Render PrivateRoute with user:', user); // Log de depuración
  return user ? <Element {...rest} user={user} /> : null;
};

const App: React.FC = () => {
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
import { login } from '../services/auth';
import { TextField, Button, Box, Typography } from '@mui/material';

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (email && password) {
      try {
        const data = await login(email, password);
        if (data.token) {
          localStorage.setItem('token', data.token);
          navigate('/dashboard');
        } else {
          setMessage('Login exitoso, pero no se recibió un token.');
        }
      } catch (error) {
        setMessage('Usuario o contraseña incorrectos');
      }
    } else {
      setMessage('Por favor, completa todos los campos');
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="black"
      color="white"
      p={3}
    >
      <Typography variant="h4" mb={3}>
        Login
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2, bgcolor: 'white', borderRadius: 1 }}
      />
      <TextField
        fullWidth
        variant="outlined"
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 2, bgcolor: 'white', borderRadius: 1 }}
      />
      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={handleLogin}
        sx={{ mb: 2 }}
      >
        Iniciar Sesión
      </Button>
      {message && (
        <Typography variant="body2" color="error">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default Login;
EOF

# Crear el archivo src/services/auth.ts
cat <<'EOF' > src/services/auth.ts
import axios from 'axios';

// Set up the base URL for axios
axios.defaults.baseURL = 'https://172.16.10.222:8000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Function to set the Authorization header
export const setAuthToken = (token: string | null) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Login function
export const login = async (email: string, password: string): Promise<any> => {
  const response = await axios.post('/api/login', { email, password });
  const data = response.data;
  console.log('Login response:', data); // Log de depuración
  if (data.token) {
    // Añadir permisos al objeto user
    const userWithPermissions = {
      ...data.user,
      permissions: ['toggle_device', 'delete_habitacion', 'add_user', 'add_dashboard', 'add_habitacion'] // Permisos de ejemplo
    };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(userWithPermissions));
    setAuthToken(data.token); // Set the token in axios headers
  }
  return data;
};

export const isLoggedIn = (): boolean => {
  const token = localStorage.getItem('token');
  console.log('Is logged in:', !!token); // Log de depuración
  return !!token;
};

export const getUser = (): any => {
  const user = localStorage.getItem('user');
  try {
    const parsedUser = user ? JSON.parse(user) : null;
    console.log('Get user:', parsedUser); // Log de depuración
    return parsedUser;
  } catch (error) {
    console.error('Error parsing user JSON:', error);
    return null;
  }
};

// Function to get the token
export const getToken = (): string | null => {
  const token = localStorage.getItem('token');
  console.log('Get token:', token); // Log de depuración
  return token;
};

// Function to check user permissions
export const checkPermission = (user: any, permission: string): boolean => {
  console.log('Checking permission for user:', user, 'Permission:', permission); // Log de depuración
  if (user && user.permissions) {
    const hasPermission = user.permissions.includes(permission);
    console.log('Has permission:', hasPermission); // Log de depuración
    return hasPermission;
  }
  return false;
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


echo "📂 Files basicos para frontend generados automáticamente..."
