import React, { useState, useEffect } from 'react';
import { createUser, getUsers, deleteUser, updateUserRole, getRooms, getUserPermissions, saveUserPermissions } from '../services/api'; // Línea corregida
import { checkPermission } from '../services/auth';
import { Box, TextField, Button, MenuItem, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit'; // Línea corregida
import DeleteIcon from '@mui/icons-material/Delete'; // Línea corregida

interface UsersManagementProps {
  user: {
    permissions: string[];
  };
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: number[];
}

interface Room {
  id: number;
  nombre: string;
}

const UsersManagement: React.FC<UsersManagementProps> = ({ user }) => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<string>('user'); // Default role to 'user'
  const [message, setMessage] = useState<string>('');
  const [messageColor, setMessageColor] = useState<string>(''); // New state for message color
  const [users, setUsers] = useState<User[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await getUsers();
      console.log('Fetched users:', fetchedUsers);
      setUsers(fetchedUsers);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      const fetchedRooms = await getRooms();
      console.log('Fetched rooms:', fetchedRooms);
      setRooms(fetchedRooms);
    };
    fetchRooms();
  }, []);

  const handleCreateUser = async () => {
    if (!checkPermission(user, 'create_user')) {
      alert('No tienes permiso para crear usuarios.');
      return;
    }
    if (username && email && password && role) {
      try {
        await createUser(username, email, password, role);
        setMessage('Usuario creado correctamente');
        setMessageColor('#1976d2'); // Set success message color to blue
        setUsername('');
        setEmail('');
        setPassword('');
        setRole('user'); // Reset role to 'user'
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error creating user:', error);
        setMessage('Error al crear el usuario');
        setMessageColor('red'); // Set error message color to red
      }
    } else {
      setMessage('Por favor, completa todos los campos');
      setMessageColor('red'); // Set error message color to red
    }
  };

  const handleEditUser = (id: number) => {
    const userToEdit = users.find((user) => user.id === id);
    if (userToEdit) {
      setUsername(userToEdit.username);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setEditUserId(userToEdit.id);
      setEditMode(true);
    }
  };

  const handleUpdateUser = async () => {
    if (editUserId !== null && role) {
      try {
        await updateUserRole(editUserId, role);
        setMessage('Usuario actualizado correctamente');
        setMessageColor('#1976d2'); // Set success message color to blue
        setUsername('');
        setEmail('');
        setRole('user'); // Reset role to 'user'
        setEditUserId(null);
        setEditMode(false);
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error updating user:', error);
        setMessage('Error al actualizar el usuario');
        setMessageColor('red'); // Set error message color to red
      }
    }
  };

  const handleDeleteUser = async (id: number) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar este usuario?');
    if (confirmed) {
      try {
        await deleteUser(id);
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleOpenDialog = async (id: number) => {
    setEditUserId(id);
    try {
      const userPermissions = await getUserPermissions(id);
      console.log('User permissions:', userPermissions);
      setSelectedRooms(userPermissions.room_ids);
      setOpen(true);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setSelectedRooms([]);
  };

  const handleRoomChange = (roomId: number) => {
    setSelectedRooms((prevSelected) =>
      prevSelected.includes(roomId)
        ? prevSelected.filter((id) => id !== roomId)
        : [...prevSelected, roomId]
    );
  };

  const handleSavePermissions = async () => {
    if (editUserId !== null) {
      try {
        await saveUserPermissions(editUserId, selectedRooms);
        handleCloseDialog();
      } catch (error) {
        console.error('Error saving user permissions:', error);
      }
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      sx={{ p: 3, backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Box para formulario y mensajes de éxito/error */}
      <Box sx={{ width: '100%' }}>
        <Typography variant="h6" mb={2} sx={{ fontSize: '1rem' }}>
          Gestión de Usuarios
        </Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0, mb: 2, width: '100%' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            sx={{
              backgroundColor: '#333',
              borderRadius: '4px',
              color: 'white',
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'none' },
                '&:hover fieldset': { borderColor: 'none' },
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1976d2' },
              },
              '& input': {
                color: 'white',
                padding: '10px 12px',
                height: '40px',
                boxSizing: 'border-box',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.7)',
              }
            }}
          />
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            sx={{
              backgroundColor: '#333',
              borderRadius: '4px',
              color: 'white',
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'none' },
                '&:hover fieldset': { borderColor: 'none' },
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1976d2' },
              },
              '& input': {
                color: 'white',
                padding: '10px 12px',
                height: '40px',
                boxSizing: 'border-box',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.7)',
              }
            }}
          />
          <TextField
            fullWidth
            variant="outlined"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            sx={{
              backgroundColor: '#333',
              borderRadius: '4px',
              color: 'white',
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'none' },
                '&:hover fieldset': { borderColor: 'none' },
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1976d2' },
              },
              '& input': {
                color: 'white',
                padding: '10px 12px',
                height: '40px',
                boxSizing: 'border-box',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.7)',
              }
            }}
          />
          <TextField
            fullWidth
            variant="outlined"
            select
            placeholder="Rol"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            margin="normal"
            sx={{
              backgroundColor: '#333',
              borderRadius: '4px',
              color: 'white',
              flexGrow: 1,
              height: '40px', // Ajustamos la altura para que sea igual a los otros campos
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'none' },
                '&:hover fieldset': { borderColor: 'none' },
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1976d2' },
              },
              '& .MuiSelect-select': {
                color: 'white',
                padding: '10px 12px',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.7)',
              }
            }}
          >
            <MenuItem value="admin" sx={{ fontSize: '0.875rem' }}>Admin</MenuItem>
            <MenuItem value="user" sx={{ fontSize: '0.875rem' }}>Usuario</MenuItem>
          </TextField>
          <Button
            variant="contained"
            color="primary"
            onClick={editMode ? handleUpdateUser : handleCreateUser}
            sx={{
              backgroundColor: '#1976d2',
              fontSize: '10px',
              height: '40px', // Altura igual a los campos
              marginLeft: '18px',
              lineHeight: '1.5',
              padding: '0 16px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '6px', // Añadido para centrarlo verticalmente
            }}
          >
            {editMode ? 'Actualizar Usuario' : 'Crear Usuario'}
          </Button>
        </Box>

        {/* Box para mostrar los mensajes de éxito/error */}
        <Box sx={{ mt: 2, height: '50px', overflow: 'hidden' }}> {/* Fijo el alto y oculto cualquier sobrecarga */}
          {message && (
            <Typography variant="body2" sx={{ color: messageColor, fontSize: '0.875rem' }}>
              {message}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Box para la lista de usuarios */}
      <Box sx={{ width: '100%', mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem' }}>
          Lista de Usuarios
        </Typography>
        {users.map((user) => (
          <Box
            key={user.id}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              bgcolor: '#333',
              color: 'white',
              p: 1,
              mb: 1,
              borderRadius: 1,
              boxShadow: 1,
              height: 'auto',
              width: '100%',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
              <Typography>{user.username} - {user.email} - {user.role}</Typography>
              <Box>
                <Button onClick={() => handleOpenDialog(user.id)} variant="outlined" color="primary">
                  Permisos
                </Button>
                <IconButton onClick={() => handleEditUser(user.id)}>
                  <EditIcon sx={{ color: 'white' }} />
                </IconButton>
                <IconButton onClick={() => handleDeleteUser(user.id)}>
                  <DeleteIcon sx={{ color: 'white' }} />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ mt: 1, width: '100%' }}>
              {user.role === 'admin' ? (
                <Typography variant="body2" sx={{ color: 'lightgreen' }}>
                  Todas las habitaciones permitidas
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: 'lightgray' }}>
                  Habitaciones permitidas: {rooms && user.permissions && user.permissions.length > 0 ? user.permissions.map(id => rooms.find(room => room.id === id)?.nombre).filter(Boolean).join(', ') : 'Ninguna'}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      <Dialog open={open} onClose={handleCloseDialog}>
        <DialogTitle>Seleccionar Habitaciones Permitidas</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" sx={{ fontSize: '0.5rem', lineHeight: '1rem' }}>
            {rooms.map((room) => (
              <FormControlLabel
                key={room.id}
                control={
                  <Checkbox
                    checked={selectedRooms.includes(room.id)}
                    onChange={() => handleRoomChange(room.id)}
                  />
                }
                label={room.nombre}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleSavePermissions} color="primary">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersManagement;
