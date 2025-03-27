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
import TabManager from './components/TabManager'; // Importar TabManager

interface PrivateRouteProps {
  element: React.ComponentType<any>;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element: Element, ...rest }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('PrivateRoute useEffect called'); // Log de depuración
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

interface AppProps {
  selectedTab: number;
  setSelectedTab: React.Dispatch<React.SetStateAction<number>>;
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  setHabitaciones: React.Dispatch<React.SetStateAction<any[]>>;
  setTableros: React.Dispatch<React.SetStateAction<any[]>>;
  deleteMode: boolean;
  setDeleteMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteOptionSelect: (type: string) => void;
  selectedItems: number[];
  setSelectedItems: React.Dispatch<React.SetStateAction<number[]>>;
  deleteType: string;
  user: any;
}

const App: React.FC<AppProps> = (props) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute element={Dashboard} {...props} />} />
        <Route path="/statistics" element={<PrivateRoute element={Statistics} {...props} />} />
        <Route path="/consumption" element={<PrivateRoute element={Consumption} {...props} />} />
        <Route path="/settings" element={<PrivateRoute element={Settings} {...props} />} />
        <Route path="/users" element={<PrivateRoute element={UsersManagement} {...props} />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
