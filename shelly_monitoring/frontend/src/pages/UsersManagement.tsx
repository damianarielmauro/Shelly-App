import React, { useState } from 'react';
import { createUser } from '../services/api';
import { checkPermission } from '../services/auth';

interface UsersManagementProps {
  user: {
    permissions: string[];
  };
}

const UsersManagement: React.FC<UsersManagementProps> = ({ user }) => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleCreateUser = async () => {
    if (!checkPermission(user, 'create_user')) {
      alert('No tienes permiso para crear usuarios.');
      return;
    }
    if (username && email && password && role) {
      try {
        await createUser(username, email, password, role);
        setMessage('Usuario creado correctamente');
        setUsername('');
        setEmail('');
        setPassword('');
        setRole('');
      } catch (error) {
        setMessage('Error al crear el usuario');
      }
    } else {
      setMessage('Por favor, completa todos los campos');
    }
  };

  return (
    <div>
      <h2>Gestión de Usuarios</h2>
      <input
        type="text"
        placeholder="Nombre de usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="text"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="text"
        placeholder="Rol"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <button onClick={handleCreateUser}>Crear Usuario</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UsersManagement;
