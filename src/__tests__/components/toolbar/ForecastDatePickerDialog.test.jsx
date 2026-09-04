/**
 * @fileoverview Tests for the forecast date picker dialog.
 *
 * The dialog's job is to seed its fields from the current run date, snap the hour to an
 * allowed sub-daily value, and hand back a Date — the toolbar decides what to do with it.
 */

import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {setupI18nMock} from '../../testUtils.js';
import ForecastDatePickerDialog from '@/components/toolbar/ForecastDatePickerDialog.jsx';

setupI18nMock();

function renderDialog(props = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const utils = render(
    <ForecastDatePickerDialog
      open
      baseDate={new Date(2025, 10, 5, 6)}
      onClose={onClose}
      onConfirm={onConfirm}
      {...props}
    />
  );
  return {onClose, onConfirm, ...utils};
}

/** The date field is the only `type="date"` input in the dialog. */
const dateInput = () => document.querySelector('input[type="date"]');

describe('ForecastDatePickerDialog', () => {
  it('seeds the date field from the current run date', () => {
    renderDialog();
    expect(dateInput().value).toBe('2025-11-05');
  });

  it('snaps the seeded hour to the nearest allowed value', () => {
    // 14h is not a sub-daily hour; the field should show 12.
    renderDialog({baseDate: new Date(2025, 10, 5, 14)});
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('clears the fields when there is no usable run date', () => {
    renderDialog({baseDate: null});
    expect(dateInput().value).toBe('');
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('ignores an invalid run date rather than seeding NaN', () => {
    renderDialog({baseDate: new Date('nonsense')});
    expect(dateInput().value).toBe('');
  });

  it('hands the chosen date back on confirm', async () => {
    const user = userEvent.setup();
    const {onConfirm, onClose} = renderDialog();

    await user.click(screen.getByText('ok'));

    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const picked = onConfirm.mock.calls[0][0];
    expect(picked).toBeInstanceOf(Date);
    expect(picked.getFullYear()).toBe(2025);
    expect(picked.getMonth()).toBe(10);
    expect(picked.getDate()).toBe(5);
    expect(picked.getHours()).toBe(6);
  });

  // userEvent types a date input character by character, which is fast in isolation but
  // runs close to the 5s default under coverage instrumentation.
  it('confirms the date the user typed, not the seeded one', async () => {
    const user = userEvent.setup();
    const {onConfirm} = renderDialog();

    await user.clear(dateInput());
    await user.type(dateInput(), '2024-03-09');
    await user.click(screen.getByText('ok'));

    const picked = onConfirm.mock.calls[0][0];
    expect(picked.getFullYear()).toBe(2024);
    expect(picked.getMonth()).toBe(2);
    expect(picked.getDate()).toBe(9);
  }, 20000);

  it('dismisses without confirming when the date is empty', async () => {
    const user = userEvent.setup();
    const {onConfirm, onClose} = renderDialog({baseDate: null});

    await user.click(screen.getByText('ok'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on cancel without confirming', async () => {
    const user = userEvent.setup();
    const {onConfirm, onClose} = renderDialog();

    await user.click(screen.getByText('cancel'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    renderDialog({open: false});
    expect(screen.queryByText('ok')).not.toBeInTheDocument();
  });
});
