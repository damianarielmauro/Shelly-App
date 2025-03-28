import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';

interface Tablero {
  id: number;
  nombre: string;
}

interface TabManagerProps {
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
  user: {
    permissions: string[];
    role: string;
  };
  setRoomMatrixView: React.Dispatch<React.SetStateAction<boolean>>;
  tableros: Tablero[];
}

const TabManager: React.FC<TabManagerProps> = ({
  selectedTab,
  setSelectedTab,
  editMode,
  setEditMode,
  setHabitaciones,
  setTableros,
  deleteMode,
  setDeleteMode,
  handleDeleteOptionSelect,
  selectedItems,
  setSelectedItems,
  deleteType,
  user,
  setRoomMatrixView,
  tableros
}) => {
  // Esta función se llama cuando se cambia de tab
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue === selectedTab) {
      // Si hace clic en el mismo tab, no hacemos nada aquí
    } else {
      setSelectedTab(newValue);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Tabs
        value={selectedTab}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        indicatorColor="primary"
        textColor="primary"
        sx={{
          '& .MuiTabs-indicator': { backgroundColor: '#1ECAFF', height: 3 },
          '& .MuiTab-root': { color: 'white', '&.Mui-selected': { color: '#1ECAFF' } },
        }}
      >
        {tableros.map((tablero, index) => (
          <Tab 
            key={tablero.id} 
            label={tablero.nombre} 
            sx={{ color: 'white' }}
            onClick={() => {
              // Manejar el clic directamente en el tab
              if (index === selectedTab) {
                console.log("Clic en el mismo tab, forzando vista matriz");
                setRoomMatrixView(true); // Esto debe forzar el cambio a vista matriz
              }
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default TabManager;
