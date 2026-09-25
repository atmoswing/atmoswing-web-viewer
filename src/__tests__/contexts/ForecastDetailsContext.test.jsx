/**
 * @fileoverview Tests for ForecastDetailsContext: opening the forecast details window from
 * anywhere, with or without a selection.
 */

import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {ForecastDetailsProvider, useForecastDetails} from '@/contexts/ForecastDetailsContext.jsx';

vi.mock('react-i18next', async () => (await import('@/__tests__/testUtils.js')).i18nMockModule());
vi.mock('@/contexts/SnackbarContext.jsx', () => ({useSnackbar: () => ({enqueueSnackbar: vi.fn()})}));

const {requests} = vi.hoisted(() => ({requests: []}));

// The window is lazy loaded by the provider, so it is mocked at its own module path. It records
// every request object it is given.
vi.mock('@/components/modals/ForecastDetailsModal.jsx', () => ({
  default: ({open, onClose, request}) => {
    if (requests[requests.length - 1] !== request) requests.push(request);
    return open
      ? <div data-testid="details">
        <span data-testid="selection">{JSON.stringify(request?.selection)}</span>
        <button type="button" onClick={onClose}>close</button>
      </div>
      : null;
  }
}));

function Opener({selection}) {
  const {openForecastDetails} = useForecastDetails();
  return (
    <button type="button" onClick={() => (selection ? openForecastDetails(selection) : openForecastDetails())}>
      {selection ? 'open on selection' : 'open'}
    </button>
  );
}

const SELECTION = {methodId: 'm1', configId: 'c2', entityId: 7, lead: 48};

function renderProvider() {
  return render(
    <ForecastDetailsProvider>
      <Opener/>
      <Opener selection={SELECTION}/>
    </ForecastDetailsProvider>
  );
}

describe('ForecastDetailsContext', () => {
  beforeEach(() => {
    requests.length = 0;
  });

  it('does not load the window before it is first opened', () => {
    renderProvider();
    expect(requests).toHaveLength(0);
  });

  it('opens on the current selection when given none', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText('open'));

    expect(await screen.findByTestId('details')).toBeInTheDocument();
    expect(screen.getByTestId('selection').textContent).toBe('null');
  });

  it('passes a given selection to the window', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText('open on selection'));

    expect(JSON.parse((await screen.findByTestId('selection')).textContent)).toEqual(SELECTION);
  });

  it('closes, and makes a new request for each opening so the window re-seeds', async () => {
    const user = userEvent.setup();
    renderProvider();

    await user.click(screen.getByText('open'));
    await screen.findByTestId('details');
    await user.click(screen.getByText('close'));
    expect(screen.queryByTestId('details')).not.toBeInTheDocument();

    await user.click(screen.getByText('open'));
    await screen.findByTestId('details');
    expect(requests).toHaveLength(2);
    expect(requests[0]).not.toBe(requests[1]);
  });

  it('does nothing outside a provider', () => {
    function Lonely() {
      const {openForecastDetails} = useForecastDetails();
      return <button type="button" onClick={() => openForecastDetails()}>lonely</button>;
    }
    render(<Lonely/>);
    expect(() => screen.getByText('lonely').click()).not.toThrow();
  });
});
