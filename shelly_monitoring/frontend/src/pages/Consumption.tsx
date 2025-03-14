import React from 'react';

interface ConsumptionProps {
  user: {
    permissions: string[];
  };
}

const Consumption: React.FC<ConsumptionProps> = ({ user }) => {
  return (
    <div>
      <h1>Consumption Page</h1>
      {/* Contenido de la página de consumos */}
    </div>
  );
};

export default Consumption;
