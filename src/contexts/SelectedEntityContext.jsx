/**
 * @module contexts/SelectedEntityContext
 * @description React context for managing the currently selected forecast entity (station/point).
 * Automatically resets selection when workspace changes.
 */

import React, {createContext, useContext, useEffect, useState} from 'react';
import {useWorkspace} from './WorkspaceContext.jsx';

const SelectedEntityContext = createContext({});

/**
 * Provider component for selected entity state management.
 * Tracks which forecast entity is currently selected and resets on workspace change.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement}
 */
export function SelectedEntityProvider({children}) {
  const {workspace} = useWorkspace();
  const [selectedEntityId, setSelectedEntityId] = useState(null);

  // Reset on workspace change
  useEffect(() => {
    setSelectedEntityId(null);
  }, [workspace]);

  const value = {selectedEntityId, setSelectedEntityId};
  return <SelectedEntityContext.Provider value={value}>{children}</SelectedEntityContext.Provider>;
}

/**
 * Hook to access the selected entity context.
 *
 * @returns {Object} Selected entity context value
 * @returns {string|number|null} returns.selectedEntityId - Currently selected entity ID, or null
 * @returns {Function} returns.setSelectedEntityId - Function to set the selected entity ID
 * @example
 * const { selectedEntityId, setSelectedEntityId } = useSelectedEntity();
 * setSelectedEntityId(123); // Select entity with ID 123
 * console.log(selectedEntityId); // Logs: 123
 */
export const useSelectedEntity = () => useContext(SelectedEntityContext);
