/**
 * @module components/ErrorBoundary
 * @description React error boundary component that catches JavaScript errors in the component tree.
 */

import React from 'react';

/**
 * Error boundary component that catches and handles React component errors.
 * Displays fallback UI and provides retry functionality.
 *
 * @class
 * @extends React.Component
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component {
  /**
   * @param {Object} props - Component props
   * @param {React.ReactNode} props.children - Child components to protect
   * @param {Function} [props.onError] - Optional error handler callback
   * @param {React.ReactNode} [props.fallback] - Optional custom fallback UI
   */
  constructor(props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  /**
   * Updates state when an error is caught.
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state object
   */
  static getDerivedStateFromError(error) {
    return {hasError: true, error};
  }

  /**
   * Lifecycle method called after an error is caught.
   * Logs the error and calls the optional onError callback.
   *
   * @param {Error} error - The error that was thrown
   * @param {Object} info - Error info with componentStack
   */
  componentDidCatch(error, info) {
    if (this.props.onError) {
      try {
        this.props.onError(error, info);
      } catch { /* swallow error from onError handler */
      }
    }
    if (import.meta.env.MODE !== 'production') {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{padding: 16, fontFamily: 'sans-serif'}}>
          <h2>Something went wrong.</h2>
          <pre style={{whiteSpace: 'pre-wrap'}}>{String(this.state.error)}</pre>
          <button onClick={() => this.setState({hasError: false, error: null})}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
