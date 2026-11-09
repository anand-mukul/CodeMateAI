import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastNotification {
  message: string;
  isError?: boolean;
}

interface ToastProps {
  notification: ToastNotification | null;
  onDismiss: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  notification,
  onDismiss,
  duration = 3000,
}) => {
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismissRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [notification, duration]);

  if (!notification) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-10 left-3 right-3 mx-auto max-w-sm px-3 py-2 rounded-lg text-xs shadow-xl font-medium animate-fade-in z-50 flex items-center gap-2.5 border backdrop-blur-xl transition-all ${
        notification.isError
          ? 'bg-slate-950/95 text-rose-200 border-rose-500/30'
          : 'bg-slate-950/95 text-slate-100 border-slate-700/80'
      }`}
    >
      <div
        className={`p-1 rounded-full shrink-0 ${
          notification.isError
            ? 'bg-rose-500/15 text-rose-400'
            : 'bg-emerald-500/15 text-emerald-400'
        }`}
      >
        {notification.isError ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" />
        )}
      </div>
      <span className="flex-1 text-[11.5px] leading-snug font-medium text-slate-200 break-words">
        {notification.message}
      </span>
      <button
        onClick={onDismiss}
        className="p-1 -mr-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default Toast;

