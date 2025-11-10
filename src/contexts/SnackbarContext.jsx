import React, {createContext, useContext, useState} from 'react';

const SnackbarContext = createContext();

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export const SnackbarProvider = ({children}) => {
  const [snackbars, setSnackbars] = useState([]);

  const enqueueSnackbar = (message, options = {}) => {
    const id = Date.now() + Math.random();
    setSnackbars(prev => [...prev, {id, message, ...options, open: true}]);
  };

  const closeSnackbar = (id) => {
    setSnackbars(prev => prev.map(sb => sb.id === id ? {...sb, open: false} : sb));
  };

  const removeSnackbar = (id) => {
    setSnackbars(prev => prev.filter(sb => sb.id !== id));
  };

  return (
    <SnackbarContext.Provider value={{enqueueSnackbar, closeSnackbar, removeSnackbar, snackbars}}>
      {children}
    </SnackbarContext.Provider>
  );
};
