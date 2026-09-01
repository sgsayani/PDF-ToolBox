import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

createRoot(container).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {/* Page views only — no cookies, nothing tied to an identity. Data
          shows up in the Vercel dashboard's Analytics tab once enabled
          there (Project → Analytics → Enable). */}
      <Analytics />
    </HelmetProvider>
  </StrictMode>,
);
