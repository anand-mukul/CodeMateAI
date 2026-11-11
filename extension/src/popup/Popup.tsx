import React from 'react';
import App from '../App';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const Popup: React.FC = () => {
  return (
    <div className="w-[380px] min-h-[500px] max-h-[580px] overflow-y-auto bg-slate-950 text-slate-100">
      <ErrorBoundary fallbackTitle="CodeMate Paused">
        <App isSidePanel={false} />
      </ErrorBoundary>
    </div>
  );
};

export default Popup;

