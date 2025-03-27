import React, { useState, useEffect } from 'react';
import { createUser, getUsers, deleteUser, updateUserRole, getRooms, getUserPermissions, saveUserPermissions } from '../services/api';
import { checkPermission } from '../services/auth';
import { Box, TextField, Button, MenuItem, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

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
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  // Nuevo estado para el diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  // Función para cargar las habitaciones y ordenarlas alfabéticamente
  const fetchRooms = async () => {
    try {
      const fetchedRooms = await getRooms();
      console.log('Fetched rooms:', fetchedRooms);
      // Ordenar habitaciones alfabéticamente por nombre
      const sortedRooms = [...fetchedRooms].sort((a, b) => a.nombre.localeCompare(b.nombre));
      setRooms(sortedRooms);
      return sortedRooms;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  };

  // Función para cargar usuarios con permisos actualizados
  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getUsers();
      console.log('Fetched users:', fetchedUsers);
      
      // Obtener la lista actualizada de habitaciones para asegurar que tengamos todas
      const currentRooms = await fetchRooms();
      const roomIds = currentRooms.map(room => room.id);
      
      const usersWithPermissions = await Promise.all(
        fetchedUsers.map(async (user: User) => {
          const userPermissions = await getUserPermissions(user.id);
          
          // Si el usuario es admin, asegurarse que tenga acceso a todas las habitaciones
          let permissions = userPermissions.room_ids;
          if (user.role === 'admin') {
            // Para administradores, asignar automáticamente todas las habitaciones
            permissions = roomIds;
            
            // Actualizar los permisos en el backend si es necesario
            if (JSON.stringify(userPermissions.room_ids.sort()) !== JSON.stringify(roomIds.sort())) {
              console.log('Updating admin permissions to include all rooms');
              await saveUserPermissions(user.id, roomIds);
            }
          }
          
          return { ...user, permissions };
        })
      );
      
      // Ordenar los usuarios: admin primero y luego user, ambos alfabéticamente
      usersWithPermissions.sort((a, b) => {
        if (a.role === b.role) {
          return a.username.localeCompare(b.username);
        }
        return a.role === 'admin' ? -1 : 1;
      });
      
      setUsers(usersWithPermissions);
    } catch (error) {
      console.error('Error fetching users with permissions:', error);
    }
  };

  // Cargar usuarios y habitaciones al inicializar el componente
  useEffect(() => {
    fetchUsers();
  }, []);

  // Cargar habitaciones al inicializar el componente
  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateUser = async () => {
    if (!checkPermission(user, 'create_user')) {
      alert('No tienes permiso para crear usuarios.');
      return;
    }
    if (username && email && password && role) {
      try {
        // Crear nuevo usuario
        await createUser(username, email, password, role);
        setMessage('Usuario creado correctamente');
        setMessageColor('#1ECAFF');
        
        // Limpiar campos del formulario
        setUsername('');
        setEmail('');
        setPassword('');
        setRole('user');
        
        // Si es admin, asignar automáticamente todas las habitaciones
        if (role === 'admin') {
          // Primero necesitamos obtener el ID del usuario recién creado
          const allUsers = await getUsers();
          const newUser = allUsers.find((u: User) => u.email === email);
          
          if (newUser) {
            const allRoomIds = rooms.map(room => room.id);
            await saveUserPermissions(newUser.id, allRoomIds);
          }
        }
        
        // Recargar la lista de usuarios actualizada
        await fetchUsers();
      } catch (error) {
        console.error('Error creating user:', error);
        setMessage('Error al crear el usuario');
        setMessageColor('red');
      }
    } else {
      setMessage('Por favor, completa todos los campos');
      setMessageColor('red');
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
        const previousUser = users.find(u => u.id === editUserId);
        const wasAdmin = previousUser?.role === 'admin';
        const willBeAdmin = role === 'admin';
        
        await updateUserRole(editUserId, role);
        setMessage('Usuario actualizado correctamente');
        setMessageColor('#1ECAFF');
        
        // Si se cambió a rol admin, asignar todas las habitaciones
        if (!wasAdmin && willBeAdmin) {
          const allRoomIds = rooms.map(room => room.id);
          await saveUserPermissions(editUserId, allRoomIds);
        }
        
        // Limpiar formulario
        setUsername('');
        setEmail('');
        setRole('user');
        setEditUserId(null);
        setEditMode(false);
        
        // Recargar usuarios actualizados
        await fetchUsers();
      } catch (error) {
        console.error('Error updating user:', error);
        setMessage('Error al actualizar el usuario');
        setMessageColor('red');
      }
    }
  };

  // Método para abrir el diálogo de confirmación de eliminación
  const confirmDeleteUser = (id: number) => {
    setUserToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Método actualizado para eliminar usuario después de confirmación
  const handleDeleteUser = async () => {
    if (userToDelete !== null) {
      try {
        await deleteUser(userToDelete);
        await fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Método para cancelar la eliminación
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleOpenDialog = async (id: number) => {
    setEditUserId(id);
    try {
      // Refrescar la lista de habitaciones antes de abrir el diálogo
      const currentRooms = await fetchRooms();
      
      // Obtener permisos actuales del usuario
      const userPermissions = await getUserPermissions(id);
      console.log('User permissions:', userPermissions);
      
      setSelectedRooms(userPermissions.room_ids);
      setSelectAll(userPermissions.room_ids.length === currentRooms.length);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRooms([]);
    setSelectAll(false);
  };

  const handleRoomChange = (roomId: number) => {
    const newSelectedRooms = selectedRooms.includes(roomId)
      ? selectedRooms.filter((id) => id !== roomId)
      : [...selectedRooms, roomId];
    setSelectedRooms(newSelectedRooms);
    setSelectAll(newSelectedRooms.length === rooms.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map((room) => room.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSavePermissions = async () => {
    if (editUserId !== null) {
      try {
        await saveUserPermissions(editUserId, selectedRooms);
        await fetchUsers();
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
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ flexShrink: 0, mb: 1, width: '100%' }}>
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1ECAFF' },
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1ECAFF' },
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1ECAFF' },
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#1ECAFF' },
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
              backgroundColor: '#1ECAFF',
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
              fontWeight: 'bold', // Agregar texto en negrita
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
      <Box
        sx={{
          width: '100%',
          mt: 1,
          flexGrow: 1,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#1ECAFF black',
          '::-webkit-scrollbar': { width: '6px' },
          '::-webkit-scrollbar-track': { background: 'black' },
          '::-webkit-scrollbar-thumb': { background: '#1ECAFF' },
        }}
      >
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
                {user.role !== 'admin' && (
                  <Button
                    onClick={() => handleOpenDialog(user.id)}
                    variant="contained"
                    sx={{
                      backgroundColor: '#1ECAFF',
                      color: 'black',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      '&:hover': {
                        backgroundColor: '#18b2e1',
                      }
                    }}
                  >
                    Permisos
                  </Button>
                )}
                <IconButton onClick={() => handleEditUser(user.id)}>
                  <EditIcon sx={{ color: 'white' }} /> {/* Cambiar color a blanco */}
                </IconButton>
                <IconButton onClick={() => confirmDeleteUser(user.id)}>
                  <DeleteIcon sx={{ color: 'white' }} />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ mt: 1, width: '100%' }}>
              {user.role === 'admin' || (rooms.length > 0 && user.permissions && user.permissions.length === rooms.length) ? (
                <Typography variant="body2" sx={{ color: '#00FF00' }}>
                  Todas las habitaciones permitidas
                </Typography>
              ) : (
                <Typography variant="body2">
                  <span style={{ color: '#1ECAFF' }}>Habitaciones permitidas: </span>
                  <span style={{ color: '#00FF00' }}>
                    {rooms && user.permissions && user.permissions.length > 0 
                      ? user.permissions
                          .map(id => rooms.find(room => room.id === id)?.nombre)
                          .filter(Boolean)
                          .sort() // Ordenar alfabéticamente los nombres
                          .join(' - ') 
                      : 'Ninguna'}
                  </span>
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Diálogo rediseñado para seleccionar habitaciones */}
      <Dialog 
        open={dialogOpen}
        onClose={handleCloseDialog}
        PaperProps={{
          style: {
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '10px',
            minWidth: '300px'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#1ECAFF', 
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          Seleccionar habitaciones permitidas
        </DialogTitle>
        <DialogContent
          sx={{
            maxHeight: '600px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#222',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#1ECAFF',
              borderRadius: '10px',
            },
            pt: 1
          }}
        >
          <Box display="flex" flexDirection="column">
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAll}
                  onChange={handleSelectAll}
                  sx={{
                    color: 'white',
                    '&.Mui-checked': {
                      color: '#1ECAFF',
                    }
                  }}
                />
              }
              label={
                <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Seleccionar todas
                </Typography>
              }
            />
            {rooms.map((room) => (
              <FormControlLabel
                key={room.id}
                control={
                  <Checkbox
                    checked={selectedRooms.includes(room.id)}
                    onChange={() => handleRoomChange(room.id)}
                    sx={{
                      color: 'white',
                      '&.Mui-checked': {
                        color: '#1ECAFF',
                      }
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: 'white', fontSize: '0.9rem' }}>
                    {room.nombre}
                  </Typography>
                }
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={handleCloseDialog} 
            sx={{ 
              color: '#1ECAFF',
              '&:hover': {
                backgroundColor: 'rgba(30, 202, 255, 0.1)',
              }
            }}
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleSavePermissions} 
            variant="contained" 
            sx={{ 
              backgroundColor: '#1ECAFF', 
              color: 'black',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#18b2e1',
              }
            }}
          >
            GUARDAR
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación para eliminar usuario */}
      <Dialog 
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        PaperProps={{
          style: {
            backgroundColor: '#333',
            color: 'white',
            borderRadius: '10px',
            minWidth: '300px'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#1ECAFF', 
          fontSize: '1.1rem',
          fontWeight: 'bold'
        }}>
          Confirmar eliminación
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '8px' }}>
          <Typography sx={{ color: 'white' }}>
            ¿Estás seguro de que deseas eliminar este usuario?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={handleCancelDelete} 
            sx={{ 
              color: '#1ECAFF',
              '&:hover': {
                backgroundColor: 'rgba(30, 202, 255, 0.1)',
              }
            }}
          >
            CANCELAR
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            variant="contained" 
            sx={{ 
              backgroundColor: '#ff4444', 
              color: 'white',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#cc3333',
              }
            }}
          >
            ELIMINAR
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersManagement;
