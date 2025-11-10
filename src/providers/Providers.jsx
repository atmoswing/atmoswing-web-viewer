import React from 'react';
import {ConfigProvider} from '@/contexts/ConfigContext.jsx';
import {SnackbarProvider} from '@/contexts/SnackbarContext.jsx';
import {WorkspaceProvider} from '@/contexts/WorkspaceContext.jsx';
import {ForecastsProvider} from '@/contexts/ForecastsContext.jsx';

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

