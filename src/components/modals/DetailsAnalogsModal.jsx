import React, {useEffect, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {Box, CircularProgress, Typography} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {useForecastSession} from '@/contexts/ForecastSessionContext.jsx';
import {getAnalogs} from '@/services/api.js';
import {useTranslation} from 'react-i18next';
import {formatCriteria, formatDateLabel, formatPrecipitation} from '@/utils/formattingUtils.js';
import {clearCachedRequests, useCachedRequest} from '@/hooks/useCachedRequest.js';
import {normalizeAnalogsResponse} from '@/utils/apiNormalization.js';
import {SHORT_TTL} from '@/utils/cacheTTLs.js';
import MethodConfigSelector, {useModalSelectionData} from './common/MethodConfigSelector.jsx';

export default function DetailsAnalogsModal({open, onClose}) {
  const {workspace, activeForecastDate} = useForecastSession();
  const {t} = useTranslation();

  // Local selections managed by shared selector component
  const [selection, setSelection] = useState({
    methodId: null,
    configId: null,
    entityId: null,
    lead: 0
  });

  // Get resolved IDs from the selector
  const {resolvedMethodId, resolvedConfigId, resolvedEntityId} = useModalSelectionData('modal_', open, selection);

  const [analogs, setAnalogs] = useState(null);

  // ANALOGS via cached request
  const analogsCacheKey = open && workspace && activeForecastDate && resolvedMethodId && resolvedConfigId && resolvedEntityId != null && selection.lead != null
    ? `modal_analogs|${workspace}|${activeForecastDate}|${resolvedMethodId}|${resolvedConfigId}|${resolvedEntityId}|${selection.lead}`
    : null;
  const {data: analogsData, loading: analogsLoading, error: analogsError} = useCachedRequest(
    analogsCacheKey,
    async () => {
      const resp = await getAnalogs(workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, selection.lead);
      return normalizeAnalogsResponse(resp);
    },
    [workspace, activeForecastDate, resolvedMethodId, resolvedConfigId, resolvedEntityId, selection.lead, open],
    {enabled: !!analogsCacheKey, initialData: [], ttlMs: SHORT_TTL}
  );

  useEffect(() => {
    setAnalogs(Array.isArray(analogsData) ? analogsData : []);
  }, [analogsData]);

  // Reset local selections when modal closes
  useEffect(() => {
    if (!open) {
      setSelection({
        methodId: null,
        configId: null,
        entityId: null,
        lead: 0
      });
      setAnalogs([]);
      clearCachedRequests('modal_');
    }
  }, [open]);

  return (
    <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="md"
            sx={{'& .MuiPaper-root': {width: '100%', maxWidth: '920px'}}}>
      <DialogTitle sx={{pr: 5}}>
        {t('detailsAnalogsModal.title')}
        <IconButton aria-label={t('detailsAnalogsModal.close')} onClick={onClose} size="small"
                    sx={{position: 'absolute', right: 8, top: 8}}>
          <CloseIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2}}>
          <MethodConfigSelector
            cachePrefix="modal_"
            open={open}
            value={selection}
            onChange={setSelection}
          />
          <Box sx={{borderLeft: '1px dashed #e0e0e0', pl: 2, minHeight: 360}}>
            <Typography variant="subtitle1"
                        sx={{mb: 1}}>{t('detailsAnalogsModal.analogsList') || 'Analogs'}</Typography>

            <Box sx={{mt: 2}}>
              {analogsLoading &&
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><CircularProgress size={20}/>
                  <Typography
                    variant="caption">{t('detailsAnalogsModal.loadingAnalogs') || 'Loading...'}</Typography></Box>}
              {analogsError && <Typography variant="caption"
                                           sx={{color: '#b00020'}}>{t('detailsAnalogsModal.errorLoadingAnalogs') || 'Failed to load analogs'}</Typography>}
              {!analogsLoading && analogs && (
                <TableContainer component={Paper} sx={{maxHeight: 420, mt: 1}}>
                  <Table stickyHeader size="small" sx={{tableLayout: 'fixed'}}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{width: '6%'}}>#</TableCell>
                        <TableCell
                          sx={{width: '34%'}}> {t('detailsAnalogsModal.colDate') || 'Date'}</TableCell>
                        <TableCell sx={{
                          width: '30%',
                          textAlign: 'right'
                        }}>{t('detailsAnalogsModal.colPrecipitation') || t('detailsAnalogsModal.precipitation') || 'Precipitation'}</TableCell>
                        <TableCell sx={{
                          width: '30%',
                          textAlign: 'right'
                        }}>{t('detailsAnalogsModal.colCriteria') || 'Criteria'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analogs.map((a, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{width: '6%'}}>{a.rank ?? (idx + 1)}</TableCell>
                          <TableCell sx={{width: '34%'}}>{formatDateLabel(a.date)}</TableCell>
                          <TableCell sx={{width: '30%'}}
                                     align="right">{formatPrecipitation(a.value)}</TableCell>
                          <TableCell sx={{width: '30%'}}
                                     align="right">{formatCriteria(a.criteria)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

