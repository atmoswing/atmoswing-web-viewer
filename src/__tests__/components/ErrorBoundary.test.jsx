import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {ErrorBoundary} from '@/components/ErrorBoundary.jsx';

// Component that throws an error
function ThrowError({shouldThrow}) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });

  it('should show retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', {name: 'Retry'})).toBeInTheDocument();
  });

  it('should retry rendering when retry button is clicked', () => {
    const {rerender} = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', {name: 'Retry'});
    retryButton.click();

    // After retry, re-render without throwing
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false}/>
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should call onError callback when provided', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('should render custom fallback when provided', () => {
    const fallback = <div>Custom error UI</div>;
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong.')).not.toBeInTheDocument();
  });

  it('should handle errors in onError callback gracefully', () => {
    const onError = vi.fn(() => {
      throw new Error('onError failed');
    });

    // Should not throw and should still render error UI
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('should maintain error state until retry', () => {
    const {rerender} = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();

    // Rerender with same error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true}/>
      </ErrorBoundary>
    );

    // Should still show error
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });
});

