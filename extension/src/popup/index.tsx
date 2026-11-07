import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import { AnalyticsService } from '../services/analytics-service';
import '../styles/globals.css';

AnalyticsService.init().catch(() => {});

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}

