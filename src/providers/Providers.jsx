/**
 * @module providers/Providers
 * @description Root provider component that wraps the application with all necessary React contexts.
 *
 * Provider hierarchy (from outer to inner):
 * 1. ConfigProvider - Runtime configuration management
 * 2. SnackbarProvider - Notification system
 * 3. WorkspaceProvider - Workspace selection and management
 * 4. ForecastsProvider - Forecast data management
 */

import React from 'react';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';
import {SnackbarProvider} from '@/contexts/SnackbarContext.jsx';
import {WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import {ForecastsProvider} from '@/contexts/ForecastsContext.jsx';

/**
 * Combines all application providers in the correct order.
 * This component should wrap the entire application at the root level.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Application content to wrap with providers
 * @returns {React.ReactElement}
 * @example
 * <Providers>
 *   <App />
 * </Providers>
 */
export default function Providers({children}) {
  return (
    <ConfigProvider>
      <SnackbarProvider>
        <WorkspaceProvider>
          <ForecastsProvider>
            {children}
          </ForecastsProvider>
        </WorkspaceProvider>
      </SnackbarProvider>
    </ConfigProvider>
  );
}

