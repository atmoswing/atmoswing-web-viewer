/**
 * @fileoverview Tests for the shared chart options checkbox list.
 */

import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {setupI18nMock} from '../../testUtils.js';
import ChartOptionsGroup from '@/components/modals/common/ChartOptionsGroup.jsx';

setupI18nMock();

const KEYS = ['bestAnalogs', 'tenYearReturn', 'allReturnPeriods'];
const OPTIONS = {bestAnalogs: false, tenYearReturn: true, allReturnPeriods: false};

function renderGroup(props = {}) {
  const onOptionChange = vi.fn(() => vi.fn());
  const utils = render(
    <ChartOptionsGroup
      optionKeys={KEYS}
      options={OPTIONS}
      onOptionChange={onOptionChange}
      {...props}
    />
  );
  return {onOptionChange, ...utils};
}

describe('ChartOptionsGroup', () => {
  it('renders one checkbox per key, in the given order', () => {
    renderGroup();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    KEYS.forEach(key => expect(screen.getByText(`seriesModal.${key}`)).toBeInTheDocument());
  });

  it('reflects each option value', () => {
    renderGroup();
    const [best, tenYear, allPeriods] = screen.getAllByRole('checkbox');
    expect(best).not.toBeChecked();
    expect(tenYear).toBeChecked();
    expect(allPeriods).not.toBeChecked();
  });

  it('treats a key missing from options as unchecked rather than uncontrolled', () => {
    renderGroup({options: {}});
    screen.getAllByRole('checkbox').forEach(box => expect(box).not.toBeChecked());
  });

  it('calls the handler for the key that was clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    const onOptionChange = vi.fn(() => handler);
    render(
      <ChartOptionsGroup optionKeys={KEYS} options={OPTIONS} onOptionChange={onOptionChange}/>
    );

    await user.click(screen.getAllByRole('checkbox')[0]);

    expect(onOptionChange).toHaveBeenCalledWith('bestAnalogs');
    expect(handler).toHaveBeenCalled();
  });

  it('renders nothing for an empty key list', () => {
    renderGroup({optionKeys: []});
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });
});
