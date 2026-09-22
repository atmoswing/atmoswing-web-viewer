/**
 * @fileoverview A modal that cannot load must not take the app down with it.
 *
 * Kept apart from ForecastDetailsContext.test.jsx because the failing module mock below applies to the whole
 * file. Before the modal had its own boundary, this exact scenario replaced the entire app,
 * map included, with the root "Something went wrong" screen.
 */

import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import {ForecastDetailsProvider, useForecastDetails} from '@/contexts/ForecastDetailsContext.jsx';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());

const {enqueueSnackbar} = vi.hoisted(() => ({enqueueSnackbar: vi.fn()}));

vi.mock('@/contexts/SnackbarContext.jsx', () => ({
  useSnackbar: () => ({enqueueSnackbar})
}));
// The details modal's chunk cannot be loaded.
vi.mock('@/components/modals/ForecastDetailsModal.jsx', () => {
  throw new TypeError('Failed to fetch dynamically imported module: http://localhost/assets/ForecastDetailsModal-OLD.js');
});

function OpenButton() {
  const {openForecastDetails} = useForecastDetails();
  return <button type="button" onClick={() => openForecastDetails()}>open details</button>;
}

function renderApp() {
  return render(
    <ErrorBoundary>
      <ForecastDetailsProvider>
        <div>the map</div>
        <header><OpenButton/></header>
      </ForecastDetailsProvider>
    </ErrorBoundary>
  );
}

describe('ForecastDetailsProvider with a window that cannot load', () => {
  let consoleError;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
    });
    return () => consoleError.mockRestore();
  });

  it('keeps the rest of the app on screen', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('open details'));

    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalled());
    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument();
    expect(screen.getByText('the map')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('tells the user the window could not be shown', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('open details'));

    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledTimes(1));
    // Vitest rewrites a failing mock's message, so this surfaces as a general failure here;
    // the stale-chunk wording is covered by the boundary's own tests.
    expect(enqueueSnackbar).toHaveBeenCalledWith('errors.modalFailed', {variant: 'error'});
  });

  it('tries again on the next click', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('open details'));
    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledTimes(1));
    await user.click(screen.getByText('open details'));

    await vi.waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledTimes(2));
  });
});
