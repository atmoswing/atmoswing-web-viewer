/**
 * @module components/modals/common/AnalogsTable
 * @description Sortable table of the analogs for one forecast lead: rank, date, precipitation
 * and analogy criteria.
 */

import React, {useMemo, useState} from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import {formatCriteria, formatDateLabel, formatPrecipitation} from '@/utils/formattingUtils.js';
import {sortAnalogs} from './analogRows.js';

/**
 * Renders the analogs as a table sortable by any column, initially by rank.
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} props.analogs - Normalized analog records `{rank, date, value, criteria}`
 * @param {Function} props.t - Translation function
 * @returns {React.ReactElement}
 * @example
 * <AnalogsTable analogs={analogs} t={t}/>
 */
export default function AnalogsTable({analogs, t}) {
  const [sortColumn, setSortColumn] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedAnalogs = useMemo(
    () => sortAnalogs(analogs, sortColumn, sortDirection),
    [analogs, sortColumn, sortDirection]
  );

  // Clicking the active column flips its direction; another column starts ascending.
  const handleSortRequest = (column) => {
    const isAsc = sortColumn === column && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortColumn(column);
  };

  const header = (column, label, sx) => (
    <TableCell sx={sx}>
      <TableSortLabel
        active={sortColumn === column}
        direction={sortColumn === column ? sortDirection : 'asc'}
        onClick={() => handleSortRequest(column)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <TableContainer component={Paper} sx={{maxHeight: 420, mt: 1}}>
      <Table stickyHeader size="small" sx={{tableLayout: 'fixed'}}>
        <TableHead>
          <TableRow>
            {header('rank', '#', {width: '6%'})}
            {header('date', t('detailsAnalogsModal.colDate'), {width: '34%'})}
            {header('value', t('detailsAnalogsModal.colPrecipitation'), {width: '30%', textAlign: 'right'})}
            {header('criteria', t('detailsAnalogsModal.colCriteria'), {width: '30%', textAlign: 'right'})}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedAnalogs.map((a, idx) => (
            <TableRow key={a.rank ?? idx} hover>
              <TableCell sx={{width: '6%'}}>{a.rank ?? (idx + 1)}</TableCell>
              <TableCell sx={{width: '34%'}}>{formatDateLabel(a.date)}</TableCell>
              <TableCell sx={{width: '30%'}} align="right">{formatPrecipitation(a.value)}</TableCell>
              <TableCell sx={{width: '30%'}} align="right">{formatCriteria(a.criteria)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
