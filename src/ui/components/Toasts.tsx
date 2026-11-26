import { X } from 'lucide-react';
import { useApp } from '../../state/store';

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast glass">
          <span>{t.text}</span>
          <span className="inline">
            {t.action && (
              <button className="btn" onClick={t.action.run}>
                {t.action.label}
              </button>
            )}
            <button className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X aria-hidden="true" />
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
