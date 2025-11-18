/**
 * @module main
 * @description Application entry point that initializes React and renders the app.
 * Sets up StrictMode, providers, and Suspense boundary.
 */

import React, {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import Providers from '@/providers/Providers.jsx';
import '@/styles/index.css';
import './i18n.js';
import App from '@/App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Providers>
      <Suspense fallback={null}>
        <App/>
      </Suspense>
    </Providers>
  </StrictMode>
);
