import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error) {
    return {hasError: true, error};
  }

  componentDidCatch(error, info) {
    if (this.props.onError) {
      try {
        this.props.onError(error, info);
      } catch { /* swallow error from onError handler */ }
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
