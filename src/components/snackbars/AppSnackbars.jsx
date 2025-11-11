import * as React from 'react';
import Snackbar from '@mui/material/Snackbar';
import {useTranslation} from 'react-i18next';
import {useConfig} from '@/contexts/ConfigContext.jsx';
import {useWorkspace} from '@/contexts/WorkspaceContext.jsx';
import {useSnackbar} from '@/contexts/SnackbarContext.jsx';
import {SnackbarItem} from './SnackbarItem.jsx';

export default function AppSnackbars() {
  const {t} = useTranslation();
  const config = useConfig();
  const {invalidWorkspaceKey} = useWorkspace();
  const {snackbars, closeSnackbar, removeSnackbar} = useSnackbar();

  const workspacesLoaded = config?.__workspacesLoaded;
  const hasNoWorkspaces = workspacesLoaded && (!config?.workspaces || config.workspaces.length === 0);

  const [invalidOpen, setInvalidOpen] = React.useState(false);

  React.useEffect(() => {
    setInvalidOpen(!!invalidWorkspaceKey);
  }, [invalidWorkspaceKey]);

  const handleCloseInvalid = (_, reason) => {
    if (reason === 'clickaway') return;
    setInvalidOpen(false);
  };

  const handleCloseSnackbar = (id) => (_, reason) => {
    if (reason === 'clickaway') return;
    closeSnackbar(id);
    setTimeout(() => removeSnackbar(id), 300); // delay removal for animation
  };

  return (
    <>
      {hasNoWorkspaces && (
        <Snackbar
          anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
          open={true}
          message={t('workspace.noWorkspaces')}
          autoHideDuration={6000}
        />
      )}
      <Snackbar
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
        open={invalidOpen}
        onClose={handleCloseInvalid}
        autoHideDuration={6000}
        message={t('workspace.invalidFromUrl', {key: invalidWorkspaceKey})}
      />
      {snackbars.map((snackbar) => (
        <SnackbarItem
          key={snackbar.id}
          id={snackbar.id}
          anchorOrigin={snackbar.anchorOrigin}
          open={snackbar.open}
          onClose={handleCloseSnackbar(snackbar.id)}
          autoHideDuration={snackbar.autoHideDuration}
          message={snackbar.message}
        />
      ))}
    </>
  );
}
