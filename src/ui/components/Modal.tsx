import { useEffect, useRef, type ReactNode } from 'react';

/** native <dialog>: real focus trap, Esc to close, inert background, focus returns on close */
export function Modal({ open, onClose, labelledBy, children, className = '' }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
    if (!open) returnTo.current?.focus?.();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`dialog glass ${className}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
