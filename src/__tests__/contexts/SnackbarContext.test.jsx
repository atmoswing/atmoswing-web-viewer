/**
 * @fileoverview Tests for SnackbarContext
 */

import {describe, it, expect} from 'vitest';
import {render, screen} from '@testing-library/react';
import {renderHook, act} from '@testing-library/react';
import {SnackbarProvider, useSnackbar} from '@/contexts/SnackbarContext.jsx';

describe('SnackbarProvider', () => {
  it('renders children without crashing', () => {
    render(
      <SnackbarProvider>
        <div>Test Child</div>
      </SnackbarProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('provides snackbar context to children', () => {
    const TestComponent = () => {
      const {snackbars} = useSnackbar();
      return <div>Snackbars: {snackbars.length}</div>;
    };

    render(
      <SnackbarProvider>
        <TestComponent />
      </SnackbarProvider>
    );

    expect(screen.getByText('Snackbars: 0')).toBeInTheDocument();
  });
});

describe('useSnackbar hook', () => {
  const wrapper = ({children}) => (
    <SnackbarProvider>{children}</SnackbarProvider>
  );

  it('provides initial empty snackbars array', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    expect(result.current.snackbars).toEqual([]);
  });

  it('provides enqueueSnackbar function', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    expect(typeof result.current.enqueueSnackbar).toBe('function');
  });

  it('adds snackbar when enqueueSnackbar is called', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    act(() => {
      result.current.enqueueSnackbar('Test message', {severity: 'info'});
    });

    expect(result.current.snackbars).toHaveLength(1);
    expect(result.current.snackbars[0].message).toBe('Test message');
    expect(result.current.snackbars[0].severity).toBe('info');
    expect(result.current.snackbars[0].open).toBe(true);
  });

  it('generates unique IDs for each snackbar', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    act(() => {
      result.current.enqueueSnackbar('Message 1', {severity: 'info'});
      result.current.enqueueSnackbar('Message 2', {severity: 'error'});
    });

    expect(result.current.snackbars).toHaveLength(2);
    expect(result.current.snackbars[0].id).not.toBe(result.current.snackbars[1].id);
  });

  it('provides closeSnackbar function', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    expect(typeof result.current.closeSnackbar).toBe('function');
  });

  it('closes snackbar when closeSnackbar is called', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    act(() => {
      result.current.enqueueSnackbar('Test message', {severity: 'info'});
    });

    const snackbarId = result.current.snackbars[0].id;

    act(() => {
      result.current.closeSnackbar(snackbarId);
    });

    expect(result.current.snackbars[0].open).toBe(false);
  });

  it('provides removeSnackbar function', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    expect(typeof result.current.removeSnackbar).toBe('function');
  });

  it('removes snackbar when removeSnackbar is called', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    act(() => {
      result.current.enqueueSnackbar('Test message', {severity: 'info'});
    });

    const snackbarId = result.current.snackbars[0].id;

    act(() => {
      result.current.removeSnackbar(snackbarId);
    });

    expect(result.current.snackbars).toHaveLength(0);
  });

  it('handles multiple snackbars', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    act(() => {
      result.current.enqueueSnackbar('Message 1', {severity: 'info'});
      result.current.enqueueSnackbar('Message 2', {severity: 'error'});
      result.current.enqueueSnackbar('Message 3', {severity: 'warning'});
    });

    expect(result.current.snackbars).toHaveLength(3);
  });

  it('handles different severity levels', () => {
    const {result} = renderHook(() => useSnackbar(), {wrapper});

    act(() => {
      result.current.enqueueSnackbar('Info', {severity: 'info'});
      result.current.enqueueSnackbar('Error', {severity: 'error'});
      result.current.enqueueSnackbar('Warning', {severity: 'warning'});
      result.current.enqueueSnackbar('Success', {severity: 'success'});
    });

    expect(result.current.snackbars[0].severity).toBe('info');
    expect(result.current.snackbars[1].severity).toBe('error');
    expect(result.current.snackbars[2].severity).toBe('warning');
    expect(result.current.snackbars[3].severity).toBe('success');
  });
});

