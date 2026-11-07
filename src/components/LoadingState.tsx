import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Inspecting coding environment...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-3 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      <span className="text-xs font-medium text-slate-400">{message}</span>
    </div>
  );
};

