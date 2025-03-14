import React from 'react';

interface StatisticsProps {
  user: {
    permissions: string[];
  };
}

const Statistics: React.FC<StatisticsProps> = ({ user }) => {
  return (
    <div>
      <h1>Statistics Page</h1>
      {/* Contenido de la página de estadísticas */}
    </div>
  );
};

export default Statistics;
