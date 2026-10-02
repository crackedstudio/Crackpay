"use client";

import { useEffect, type ReactNode } from "react";
import { IconButton } from "./ui";
import { X } from "./icons";

/**
 * A panel that rises from the bottom edge. Used where a detail or a confirmation
 * should not cost the user their place: a receipt, a sign-out check.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind from scrolling while the sheet owns the screen.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 animate-fade bg-foreground/35 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-[460px] animate-rise rounded-t-[1.75rem] border-t border-line bg-card pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lift"
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-2 text-muted">
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="flex flex-col gap-4 px-5 pt-3">{children}</div>
      </div>
    </div>
  );
}
