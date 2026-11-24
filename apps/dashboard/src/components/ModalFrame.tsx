"use client";

import { ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  keepMounted?: boolean;
  busy?: boolean;
};

const focusable = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const subscribe = () => () => {};

export function ModalFrame({ open, onClose, title, description, children, footer, wide = false, keepMounted = false, busy = false }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const titleId = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  useEffect(() => {
    if (!open || !mounted) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("[data-initial-focus]") ?? dialog?.querySelector<HTMLElement>(focusable);
    (first ?? dialog)?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [open, mounted]);

  if (!mounted || (!open && !keepMounted)) return null;

  return createPortal(
    <div className={`${open ? "fixed" : "hidden"} inset-0 z-[60] flex items-center justify-center bg-black/50 p-0 sm:p-4`} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${titleId}-title`}
        aria-describedby={description ? `${titleId}-description` : undefined}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) { event.stopPropagation(); onClose(); }
          if (event.key !== "Tab") return;
          const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusable) ?? []).filter((element) => element.getClientRects().length > 0);
          if (elements.length === 0) { event.preventDefault(); return; }
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
        className={`flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl outline-none dark:bg-zinc-900 sm:max-h-[min(90dvh,760px)] sm:rounded-2xl ${wide ? "sm:h-[min(90dvh,760px)] sm:max-w-3xl" : "sm:h-auto sm:max-w-md"}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <div className="min-w-0">
            <h2 id={`${titleId}-title`} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            {description && <p id={`${titleId}-description`} className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={`Close ${title}`} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50 dark:hover:bg-zinc-800">✕</button>
        </div>
        <div className={`min-h-0 flex-1 overscroll-contain px-4 py-4 sm:px-5 ${wide ? "overflow-hidden" : "overflow-y-auto"}`}>{children}</div>
        {footer && <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
