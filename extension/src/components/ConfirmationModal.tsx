import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Replace Code',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 shadow-lg flex flex-col gap-2.5 animate-fade-in text-xs font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-amber-300 font-medium text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <span>{title}</span>
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed">
        {message}
      </p>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={onCancel}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1 rounded-md text-[11px] font-medium text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};

