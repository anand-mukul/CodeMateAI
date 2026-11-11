import React from 'react';
import App from '../App';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const SidePanel: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100">
      <ErrorBoundary fallbackTitle="Side Panel Paused">
        <App isSidePanel={true} />
      </ErrorBoundary>
    </div>
  );
};

export default SidePanel;

