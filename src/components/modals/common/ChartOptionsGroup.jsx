/**
 * @module components/modals/common/ChartOptionsGroup
 * @description Checkbox list of chart display options, shared by the chart modals.
 *
 * Each modal shows its own subset of the same options, so the list is driven by the keys
 * passed in. Labels come from `seriesModal.<key>`, which is where every option string
 * already lives.
 */

import React from 'react';
import {Checkbox, FormControlLabel, FormGroup, Typography} from '@mui/material';
import {useTranslation} from 'react-i18next';

/**
 * Renders one checkbox per option key.
 *
 * @param {Object} props - Component props
 * @param {Array<string>} props.optionKeys - Options to show, in display order
 * @param {Object} props.options - Current values, keyed by option name
 * @param {Function} props.onOptionChange - `key => event => void`, from `useChartOptions`
 * @param {string} [props.labelVariant='body1'] - Typography variant for the labels
 * @returns {React.ReactElement}
 * @example
 * <ChartOptionsGroup
 *   optionKeys={['bestAnalogs', 'tenYearReturn']}
 *   options={options}
 *   onOptionChange={handleOptionChange}
 * />
 */
export default function ChartOptionsGroup({optionKeys, options, onOptionChange, labelVariant = 'body1'}) {
  const {t} = useTranslation();

  return (
    <FormGroup>
      {optionKeys.map(key => (
        <FormControlLabel
          key={key}
          control={
            <Checkbox
              size="small"
              checked={!!options[key]}
              onChange={onOptionChange(key)}
            />
          }
          label={<Typography variant={labelVariant}>{t(`seriesModal.${key}`)}</Typography>}
        />
      ))}
    </FormGroup>
  );
}
