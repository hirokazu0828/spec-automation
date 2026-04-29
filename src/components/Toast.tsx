import { useCallback, useEffect, useRef, useState } from 'react';

type ToastKind = 'info' | 'error';

interface ToastState {
  message: string;
  kind: ToastKind;
}

export function useToast(durationMs = 2000) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast({ message, kind });
    timer.current = window.setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const ToastView = useCallback(() => {
    if (!toast) return null;
    const bg = toast.kind === 'error' ? 'bg-red-600' : 'bg-gray-800';
    return (
      <div
        role={toast.kind === 'error' ? 'alert' : 'status'}
        aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${bg} text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg`}
      >
        {toast.message}
      </div>
    );
  }, [toast]);

  return { showToast, ToastView };
}
