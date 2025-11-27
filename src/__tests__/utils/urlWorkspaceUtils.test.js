import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readWorkspaceFromUrl,
  writeWorkspaceToUrl,
  onWorkspacePopState
} from '@/utils/urlWorkspaceUtils.js';

describe('urlWorkspaceUtils', () => {
  beforeEach(() => {
    // Reset location and history
    delete window.location;
    window.location = new URL('http://localhost/');
    window.history.pushState = vi.fn();
  });

  describe('readWorkspaceFromUrl', () => {
    it('should return workspace from URL parameter', () => {
      window.location = new URL('http://localhost/?workspace=demo');
      expect(readWorkspaceFromUrl()).toBe('demo');
    });

    it('should return empty string if no workspace parameter', () => {
      window.location = new URL('http://localhost/');
      expect(readWorkspaceFromUrl()).toBe('');
    });

    it('should return empty string if workspace parameter is empty', () => {
      window.location = new URL('http://localhost/?workspace=');
      expect(readWorkspaceFromUrl()).toBe('');
    });

    it('should handle multiple query parameters', () => {
      window.location = new URL('http://localhost/?other=value&workspace=test&another=value');
      expect(readWorkspaceFromUrl()).toBe('test');
    });

    it('should handle URL-encoded workspace values', () => {
      window.location = new URL('http://localhost/?workspace=my%20workspace');
      expect(readWorkspaceFromUrl()).toBe('my workspace');
    });

    it('should return empty string on error', () => {
      // Mock URLSearchParams to throw
      const original = window.URLSearchParams;
      window.URLSearchParams = function() {
        throw new Error('Mock error');
      };

      expect(readWorkspaceFromUrl()).toBe('');

      window.URLSearchParams = original;
    });
  });

  describe('writeWorkspaceToUrl', () => {
    it('should call pushState when writing workspace', () => {
      window.location = new URL('http://localhost/');
      writeWorkspaceToUrl('demo');

      expect(window.history.pushState).toHaveBeenCalled();
    });

    it('should call pushState when updating workspace', () => {
      window.location = new URL('http://localhost/?workspace=old');
      writeWorkspaceToUrl('new');

      expect(window.history.pushState).toHaveBeenCalled();
    });

    it('should remove workspace parameter when null', () => {
      window.location = new URL('http://localhost/?workspace=demo');
      writeWorkspaceToUrl(null);

      expect(window.history.pushState).toHaveBeenCalled();
    });

    it('should remove workspace parameter when empty string', () => {
      window.location = new URL('http://localhost/?workspace=demo');
      writeWorkspaceToUrl('');

      expect(window.history.pushState).toHaveBeenCalled();
    });

    it('should not push state if URL is unchanged', () => {
      window.location = new URL('http://localhost/?workspace=demo');
      writeWorkspaceToUrl('demo');

      expect(window.history.pushState).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      window.history.pushState = () => {
        throw new Error('Mock error');
      };

      expect(() => writeWorkspaceToUrl('demo')).not.toThrow();
    });
  });

  describe('onWorkspacePopState', () => {
    it('should register popstate listener', () => {
      const handler = vi.fn();
      const addEventListener = vi.spyOn(window, 'addEventListener');

      onWorkspacePopState(handler);

      expect(addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should call handler with workspace from URL on popstate', () => {
      window.location = new URL('http://localhost/?workspace=demo');
      const handler = vi.fn();

      onWorkspacePopState(handler);

      // Trigger popstate
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(handler).toHaveBeenCalledWith('demo');
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const removeEventListener = vi.spyOn(window, 'removeEventListener');

      const cleanup = onWorkspacePopState(handler);

      expect(typeof cleanup).toBe('function');

      cleanup();

      expect(removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should remove listener when cleanup is called', () => {
      const handler = vi.fn();

      const cleanup = onWorkspacePopState(handler);
      cleanup();

      // Trigger popstate after cleanup
      window.dispatchEvent(new PopStateEvent('popstate'));

      // Handler should not be called
      expect(handler).not.toHaveBeenCalled();
    });
  });
});

