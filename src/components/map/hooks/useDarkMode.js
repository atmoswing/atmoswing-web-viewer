/**
 * @module components/map/hooks/useDarkMode
 * @description React hook for detecting system dark mode preference.
 */

import {useEffect, useState} from 'react';

/**
 * Hook that detects and tracks the user's dark mode preference.
 * Listens to system preference changes via prefers-color-scheme media query.
 *
 * @returns {boolean} True if dark mode is preferred, false otherwise
 * @example
 * const isDarkMode = useDarkMode();
 * const tileLayer = isDarkMode ? 'dark-tiles' : 'light-tiles';
 */
export default function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    const handler = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return isDarkMode;
}

