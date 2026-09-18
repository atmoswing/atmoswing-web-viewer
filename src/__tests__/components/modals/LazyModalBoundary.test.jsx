/**
 * @fileoverview Tests for the per-modal error boundary.
 */

import React, {lazy, useState} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';

const {reloadForStaleChunk} = vi.hoisted(() => ({reloadForStaleChunk: vi.fn(() => true)}));

// Detection stays real; only the reload itself is replaced, since jsdom cannot reload.
vi.mock('@/utils/staleChunk.js', async importOriginal => ({
  ...(await importOriginal()),
  reloadForStaleChunk
}));

import LazyModalBoundary from '@/components/modals/common/LazyModalBoundary.jsx';

/** What the browser throws when a tab asks for a chunk the current deploy no longer has. */
const staleChunk = () => lazy(() => Promise.reject(
  new TypeError('Failed to fetch dynamically imported module: http://localhost/assets/Modal-OLD.js')
));

function Crashing() {
  throw new TypeError("Cannot read properties of undefined (reading 'map')");
}

describe('LazyModalBoundary', () => {
  let consoleError;

  beforeEach(() => {
    vi.clearAllMocks();
    reloadForStaleChunk.mockReturnValue(true);
    // React and the boundary both log caught errors; keep the output readable.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders a lazy modal that loads normally', async () => {
    const Modal = lazy(() => Promise.resolve({default: () => <div>modal</div>}));
    render(<LazyModalBoundary><Modal/></LazyModalBoundary>);
    expect(await screen.findByText('modal')).toBeInTheDocument();
  });

  it('keeps the rest of the app when a modal fails to render', () => {
    const onFailure = vi.fn();
    render(
      <>
        <div>the map</div>
        <LazyModalBoundary onFailure={onFailure}><Crashing/></LazyModalBoundary>
      </>
    );

    expect(screen.getByText('the map')).toBeInTheDocument();
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure.mock.calls[0][1]).toEqual({stale: false});
    expect(reloadForStaleChunk).not.toHaveBeenCalled();
  });

  it('reloads the page when the modal chunk is gone, and does not report it', async () => {
    const Stale = staleChunk();
    const onFailure = vi.fn();
    render(
      <>
        <div>the map</div>
        <LazyModalBoundary onFailure={onFailure}><Stale/></LazyModalBoundary>
      </>
    );

    await vi.waitFor(() => expect(reloadForStaleChunk).toHaveBeenCalledTimes(1));
    expect(onFailure).not.toHaveBeenCalled();
    expect(screen.getByText('the map')).toBeInTheDocument();
  });

  it('reports a stale chunk when the reload is refused, so the user can reload', async () => {
    reloadForStaleChunk.mockReturnValue(false);
    const Stale = staleChunk();
    const onFailure = vi.fn();
    render(<LazyModalBoundary onFailure={onFailure}><Stale/></LazyModalBoundary>);

    await vi.waitFor(() => expect(onFailure).toHaveBeenCalledTimes(1));
    expect(onFailure.mock.calls[0][1]).toEqual({stale: true});
  });

  it('retries when the reset key changes', () => {
    let shouldCrash = true;

    function Flaky() {
      if (shouldCrash) throw new Error('first render fails');
      return <div>recovered</div>;
    }

    function Harness() {
      const [attempt, setAttempt] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setAttempt(a => a + 1)}>retry</button>
          <LazyModalBoundary resetKey={attempt}><Flaky/></LazyModalBoundary>
        </>
      );
    }

    render(<Harness/>);
    expect(screen.queryByText('recovered')).not.toBeInTheDocument();

    shouldCrash = false;
    act(() => screen.getByText('retry').click());

    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('stays in its failed state while the reset key is unchanged', () => {
    const {rerender} = render(<LazyModalBoundary resetKey="a"><Crashing/></LazyModalBoundary>);
    rerender(<LazyModalBoundary resetKey="a"><div>fine now</div></LazyModalBoundary>);
    expect(screen.queryByText('fine now')).not.toBeInTheDocument();
  });

  it('contains a failure handler that itself throws', () => {
    const onFailure = () => {
      throw new Error('handler bug');
    };
    render(
      <>
        <div>the map</div>
        <LazyModalBoundary onFailure={onFailure}><Crashing/></LazyModalBoundary>
      </>
    );
    expect(screen.getByText('the map')).toBeInTheDocument();
  });
});
