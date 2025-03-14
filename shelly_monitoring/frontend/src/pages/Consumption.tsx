import React from 'react';
import { checkPermission } from '../services/auth';

interface ConsumptionProps {
  user: {
    permissions: string[];
  };
}

const Consumption: React.FC<ConsumptionProps> = ({ user }) => {
  if (!checkPermission(user, 'view_consumption')) {
    return <div>No tienes permiso para ver esta página.</div>;
  }

  return (
    <div>
      <h1>Consumption Page</h1>
      {/* Contenido de la página de consumos */}
    </div>
  );
};

export default Consumption;
