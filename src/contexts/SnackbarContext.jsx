/**
 * @module contexts/SnackbarContext
 * @description React context for managing application-wide notification snackbars.
 * Provides a queue-based system for displaying temporary messages to users.
 */

import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

const SnackbarContext = createContext();

/**
 * Hook to access snackbar functionality.
 * Must be used within a SnackbarProvider.
 *
 * @returns {Object} Snackbar context value
 * @returns {Function} returns.enqueueSnackbar - Add a new snackbar
 * @returns {Function} returns.closeSnackbar - Close a snackbar
 * @returns {Function} returns.removeSnackbar - Remove a snackbar
 * @returns {Array} returns.snackbars - Array of active snackbars
 * @throws {Error} If used outside SnackbarProvider
 * @example
 * const { enqueueSnackbar } = useSnackbar();
 * enqueueSnackbar('Success!', { variant: 'success' });
 */
export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

/**
 * Provider component for snackbar notifications.
 * Manages a queue of snackbar messages and provides methods to add, close, and remove them.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 * @example
 * <SnackbarProvider>
 *   <App />
 * </SnackbarProvider>
 */
export const SnackbarProvider = ({children}) => {
  const [snackbars, setSnackbars] = useState([]);

  /**
   * Adds a new snackbar to the queue.
   * @param {string} message - Message to display
   * @param {Object} options - Snackbar options (variant, autoHideDuration, etc.)
   */
  // Stable identities: consumers list these in effect dependencies (the map is built in one),
  // and a new function per render would re-run those effects every time a snackbar opens.
  const enqueueSnackbar = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    setSnackbars(prev => [...prev, {id, message, ...options, open: true}]);
  }, []);

  /**
   * Closes a snackbar by ID (triggers exit animation).
   * @param {number} id - Snackbar ID
   */
  const closeSnackbar = useCallback((id) => {
    setSnackbars(prev => prev.map(sb => sb.id === id ? {...sb, open: false} : sb));
  }, []);

  /**
   * Removes a snackbar from the queue completely.
   * @param {number} id - Snackbar ID
   */
  const removeSnackbar = useCallback((id) => {
    setSnackbars(prev => prev.filter(sb => sb.id !== id));
  }, []);

  const value = useMemo(
    () => ({enqueueSnackbar, closeSnackbar, removeSnackbar, snackbars}),
    [enqueueSnackbar, closeSnackbar, removeSnackbar, snackbars]
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
};
