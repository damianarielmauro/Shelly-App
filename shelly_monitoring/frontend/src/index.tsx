import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/custom.css'; // Importa el archivo de estilos personalizado

const Main: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [deleteType, setDeleteType] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  const handleDeleteOptionSelect = (type: string) => {
    setDeleteType(type);
  };

  return (
    <BrowserRouter>
      <App
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        editMode={editMode}
        setEditMode={setEditMode}
        deleteMode={deleteMode}
        setDeleteMode={setDeleteMode}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        deleteType={deleteType}
        user={user}
        setHabitaciones={() => {}}
        setTableros={() => {}}
        handleDeleteOptionSelect={handleDeleteOptionSelect}
      />
    </BrowserRouter>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);
