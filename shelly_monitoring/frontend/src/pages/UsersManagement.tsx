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
        setMessageColor('#2391FF');
        
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
        setMessageColor('#2391FF');
        
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#2391FF' },
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#2391FF' },
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#2391FF' },
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
                '&.Mui-focused fieldset': { borderWidth: '2px', borderColor: '#2391FF' },
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
              backgroundColor: '#2391FF',
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
        <Box sx={{ mt: 2, height: '30px', overflow: 'hidden' }}> {/* Reducir altura de 50px a 30px */}
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
          scrollbarColor: '#2391FF black',
          '::-webkit-scrollbar': { width: '6px' },
          '::-webkit-scrollbar-track': { background: 'black' },
          '::-webkit-scrollbar-thumb': { background: '#2391FF' },
          // Añadir padding bottom para que se vea el último elemento
          pb: 2,
        }}
      >
        <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}> {/* Reducir margen de 2 a 1 */}
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
              mb: 1, // Mantener este espacio
              borderRadius: 1,
              boxShadow: 1,
              height: 'auto',
              width: '100%',
            }}
          >
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              sx={{ 
                width: '100%',
                // Eliminar espacio vertical entre los elementos
                mb: 0.5, // Reducir margen inferior
              }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.9rem' }}> {/* Reducir tamaño de texto */}
                {user.username} - {user.email} - {user.role}
              </Typography>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',  // Centrar verticalmente los botones e iconos
                  ml: 2, // Agregar margen a la izquierda para separar del texto
                }}
              >
                {user.role !== 'admin' && (
                  <Button
                    onClick={() => handleOpenDialog(user.id)}
                    variant="contained"
                    sx={{
                      backgroundColor: '#2391FF',
                      color: 'black',
                      fontWeight: 'bold',
                      fontSize: '0.7rem', // Reducir tamaño de texto
                      height: '24px', // Reducir altura del botón
                      minWidth: '70px', // Establecer ancho mínimo
                      '&:hover': {
                        backgroundColor: '#18b2e1',
                      }
                    }}
                  >
                    Permisos
                  </Button>
                )}
                <IconButton 
                  onClick={() => handleEditUser(user.id)}
                  size="small" // Hacer el botón más pequeño
                  sx={{ p: 0.5 }} // Reducir padding
                >
                  <EditIcon sx={{ color: 'white', fontSize: '1.2rem' }} /> {/* Reducir tamaño de icono */}
                </IconButton>
                <IconButton 
                  onClick={() => confirmDeleteUser(user.id)}
                  size="small" // Hacer el botón más pequeño
                  sx={{ p: 0.5 }} // Reducir padding
                >
                  <DeleteIcon sx={{ color: 'white', fontSize: '1.2rem' }} /> {/* Reducir tamaño de icono */}
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ 
              width: '100%', 
              mt: 0, // Eliminar margen superior
              // Asegurar que el texto termine antes del botón de permisos
              pr: user.role !== 'admin' ? '90px' : '0', // Reservar espacio para el botón permisos
            }}>
              {user.role === 'admin' || (rooms.length > 0 && user.permissions && user.permissions.length === rooms.length) ? (
                <Typography variant="body2" sx={{ color: '#00FF00', fontSize: '0.8rem' }}> {/* Reducir tamaño de texto */}
                  Todas las habitaciones permitidas
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}> {/* Reducir tamaño de texto */}
                  <span style={{ color: '#2391FF' }}>Habitaciones permitidas: </span>
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

      {/* Diálogo rediseñado para seleccionar habitaciones con espacio entre renglones reducido */}
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
          color: '#2391FF', 
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
              backgroundColor: '#2391FF',
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
                      color: '#2391FF',
                    },
                    padding: '2px' // Reducir padding del checkbox
                  }}
                />
              }
              label={
                <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Seleccionar todas
                </Typography>
              }
              sx={{ 
                marginBottom: '2px', // Reducir espacio entre opciones a la mitad
                '& .MuiFormControlLabel-label': { marginLeft: '-4px' } // Ajustar posición del texto
              }}
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
                        color: '#2391FF',
                      },
                      padding: '2px' // Reducir padding del checkbox
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: 'white', fontSize: '0.9rem' }}>
                    {room.nombre}
                  </Typography>
                }
                sx={{ 
                  marginBottom: '2px', // Reducir espacio entre opciones a la mitad 
                  '& .MuiFormControlLabel-label': { marginLeft: '-4px' } // Ajustar posición del texto
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: '16px' }}>
          <Button 
            onClick={handleCloseDialog} 
            sx={{ 
              color: '#2391FF',
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
              backgroundColor: '#2391FF', 
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
          color: '#2391FF', 
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
              color: '#2391FF',
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
