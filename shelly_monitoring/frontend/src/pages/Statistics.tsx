import React from 'react';
import { checkPermission } from '../services/auth';

interface StatisticsProps {
  user: {
    permissions: string[];
  };
}

const Statistics: React.FC<StatisticsProps> = ({ user }) => {
  if (!checkPermission(user, 'view_statistics')) {
    return <div>No tienes permiso para ver esta página.</div>;
  }

  return (
    <div>
      <h1>Statistics Page</h1>
      {/* Contenido de la página de estadísticas */}
    </div>
  );
};

export default Statistics;
