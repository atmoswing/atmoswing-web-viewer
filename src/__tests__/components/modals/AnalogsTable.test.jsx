/**
 * @fileoverview Tests for the sortable analogs table.
 */

import React from 'react';
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AnalogsTable from '@/components/modals/common/AnalogsTable.jsx';

const t = k => k;
const ANALOGS = [
  {rank: 2, date: '2019-09-03T00:00:00', value: 12.4, criteria: 54.35},
  {rank: 1, date: '1990-09-04T00:00:00', value: 0.3, criteria: 50.33},
  {rank: 3, date: '2003-01-10T00:00:00', value: 5.0, criteria: 60.1}
];

/** Rank column of the body rows, top to bottom. */
const ranks = () => screen.getAllByRole('row').slice(1)
  .map(row => within(row).getAllByRole('cell')[0].textContent);

describe('AnalogsTable', () => {
  it('labels the columns', () => {
    render(<AnalogsTable analogs={ANALOGS} t={t}/>);
    ['#', 'detailsAnalogsModal.colDate', 'detailsAnalogsModal.colPrecipitation', 'detailsAnalogsModal.colCriteria']
      .forEach(label => expect(screen.getByRole('columnheader', {name: label})).toBeInTheDocument());
  });

  it('starts sorted by rank', () => {
    render(<AnalogsTable analogs={ANALOGS} t={t}/>);
    expect(ranks()).toEqual(['1', '2', '3']);
  });

  it('formats the values for display', () => {
    render(<AnalogsTable analogs={ANALOGS} t={t}/>);
    const first = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(first[1]).toHaveTextContent('04.09.1990');
    expect(first[2]).toHaveTextContent('0.3');
    expect(first[3]).toHaveTextContent('50.33');
  });

  it('sorts by a column when its header is clicked, and reverses on a second click', async () => {
    const user = userEvent.setup();
    render(<AnalogsTable analogs={ANALOGS} t={t}/>);

    await user.click(screen.getByText('detailsAnalogsModal.colPrecipitation'));
    expect(ranks()).toEqual(['1', '3', '2']); // 0.3, 5.0, 12.4

    await user.click(screen.getByText('detailsAnalogsModal.colPrecipitation'));
    expect(ranks()).toEqual(['2', '3', '1']);
  });

  it('renders an empty table without failing', () => {
    render(<AnalogsTable analogs={[]} t={t}/>);
    expect(screen.getAllByRole('row')).toHaveLength(1); // header only
  });
});
