"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * One line of confirmation, bottom of the screen, gone in a moment. For actions
 * that succeed invisibly — a copy, a share — where a whole screen of feedback
 * would be too much and nothing at all leaves the user guessing.
 */
type Toast = { id: number; message: string };

const ToastContext = createContext<((message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 2200);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-5 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+5rem))]"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            className="animate-rise rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lift"
          >
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside ToastProvider");
  return show;
}
