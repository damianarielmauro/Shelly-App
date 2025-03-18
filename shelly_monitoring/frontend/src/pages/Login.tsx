import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setAuthToken, getUser } from '../services/auth';
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
          localStorage.setItem('jwtToken', data.token);
          setAuthToken(data.token); // Set the token in axios headers
          const user = getUser();
          localStorage.setItem('user', JSON.stringify(user)); // Store user info
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
      <Box width="100%" maxWidth="400px">
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
    </Box>
  );
};

export default Login;
