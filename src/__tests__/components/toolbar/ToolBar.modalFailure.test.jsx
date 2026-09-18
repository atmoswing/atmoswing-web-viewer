/**
 * @fileoverview A modal that cannot load must not take the app down with it.
 *
 * Kept apart from ToolBar.test.jsx because the failing module mock below applies to the whole
 * file. Before the modal had its own boundary, this exact scenario replaced the entire app,
 * map included, with the root "Something went wrong" screen.
 */

import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import ToolBar from '@/components/toolbar/ToolBar.jsx';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());

const {enqueueSnackbar} = vi.hoisted(() => ({enqueueSnackbar: vi.fn()}));

vi.mock('@/contexts/SnackbarContext.jsx', () => ({
  useSnackbar: () => ({enqueueSnackbar})
}));
vi.mock('@/components/toolbar/ToolbarSquares.jsx', () => ({default: () => <div>squares</div>}));
vi.mock('@/components/toolbar/ToolbarCenter.jsx', () => ({default: () => <div>center</div>}));
vi.mock('@/assets/toolbar/frame_distributions.svg?react', () => ({default: () => <svg/>}));
// The details modal's chunk cannot be loaded.
vi.mock('@/components/modals/ForecastDetailsModal.jsx', () => {
  throw new TypeError('Failed to fetch dynamically imported module: http://localhost/assets/ForecastDetailsModal-OLD.js');
});

function renderApp() {
  return render(
    <ErrorBoundary>
      <div>the map</div>
      <ToolBar/>
    </ErrorBoundary>
  );
}

describe('ToolBar with a modal that cannot load', () => {
  let consoleError;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
    });
    return () => consoleError.mockRestore();
  });

  it('keeps the map and the toolbar on screen', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByLabelText('toolbar.openForecastDetails'));

    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalled());
    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument();
    expect(screen.getByText('the map')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('tells the user the window could not be shown', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByLabelText('toolbar.openForecastDetails'));

    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledTimes(1));
    // Vitest rewrites a failing mock's message, so this surfaces as a general failure here;
    // the stale-chunk wording is covered by the boundary's own tests.
    expect(enqueueSnackbar).toHaveBeenCalledWith('errors.modalFailed', {variant: 'error'});
  });

  it('tries again on the next click', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByLabelText('toolbar.openForecastDetails'));
    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledTimes(1));
    await user.click(screen.getByLabelText('toolbar.openForecastDetails'));

    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledTimes(2));
  });
});
