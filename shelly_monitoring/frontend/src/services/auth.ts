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
    // Obtener permisos del rol del usuario desde el backend
    const rolePermissionsResponse = await axios.get(`/api/roles/${data.user.role}/permissions`);
    const rolePermissions = rolePermissionsResponse.data.permissions;

    const userWithPermissions = {
      ...data.user,
      permissions: rolePermissions
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
