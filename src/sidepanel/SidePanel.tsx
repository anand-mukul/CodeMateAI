import React from 'react';
import App from '../App';

export const SidePanel: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100">
      <App isSidePanel={true} />
    </div>
  );
};

export default SidePanel;

