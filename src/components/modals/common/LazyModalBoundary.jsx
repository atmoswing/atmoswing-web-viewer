/**
 * @module components/modals/common/LazyModalBoundary
 * @description Error boundary and Suspense for one lazily loaded modal, so a modal that fails
 * to load or render takes down only itself instead of the whole app.
 */

import React, {Suspense} from 'react';
import {isChunkLoadError, reloadForStaleChunk} from '@/utils/staleChunk.js';

/**
 * Wraps a lazy modal in its own error boundary and Suspense.
 *
 * - A chunk that failed to load (a tab left open across a deploy) reloads the page once, which
 *   fetches the current chunk names.
 * - Any other error, or a chunk still missing right after that reload, renders nothing here and
 *   reports through `onFailure`, so the parent can close the modal and tell the user.
 *
 * `React.lazy` caches a failed import, so re-rendering alone cannot recover from a missing chunk;
 * only a reload does.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The lazy modal
 * @param {*} [props.resetKey] - Clears a caught error when it changes, so reopening retries
 * @param {Function} [props.onFailure] - `(error, {stale}) => void`; `stale` is true for a chunk
 *   that could not be loaded
 * @example
 * <LazyModalBoundary resetKey={loaded} onFailure={notifyAndClose}>
 *   {loaded && <DistributionsModal open={open} onClose={close}/>}
 * </LazyModalBoundary>
 */
export default class LazyModalBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {error: null};
  }

  /**
   * Records the error so the modal renders nothing.
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state
   */
  static getDerivedStateFromError(error) {
    return {error};
  }

  /**
   * Reloads for a stale chunk; otherwise reports the failure.
   * @param {Error} error - The error that was thrown
   */
  componentDidCatch(error) {
    const stale = isChunkLoadError(error);
    if (stale && reloadForStaleChunk()) return;
    // Logged in every build: this is a real failure the user saw, not development noise.
    console.error('[LazyModalBoundary]', error);
    try {
      this.props.onFailure?.(error, {stale});
    } catch { /* a failing handler must not escape the boundary */
    }
  }

  /**
   * Retries after the parent signals a fresh attempt.
   * @param {Object} prevProps - Previous props
   */
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({error: null});
    }
  }

  render() {
    if (this.state.error) return null;
    return <Suspense fallback={null}>{this.props.children}</Suspense>;
  }
}
