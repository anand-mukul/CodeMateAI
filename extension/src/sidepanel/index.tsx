import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanel from './SidePanel';
import { AnalyticsService } from '../services/analytics-service';
import '../styles/globals.css';

AnalyticsService.init().catch(() => {});

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <SidePanel />
    </React.StrictMode>
  );
}

