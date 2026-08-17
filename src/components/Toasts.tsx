import { useEffect, useState } from "react";

export interface ToastData {
  id: number;
  msg: string;
  sub?: string;
  cls: "ok" | "warn" | "err";
}

const ICONS = { ok: "✓", warn: "↩", err: "⚠" } as const;

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFading(true), 3600);
    const removeTimer = window.setTimeout(() => onDismiss(toast.id), 3900);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast ${toast.cls}${fading ? " fade" : ""}`}>
      <span>{ICONS[toast.cls]}</span>
      <span>
        {toast.msg}
        {toast.sub && <small>{toast.sub}</small>}
      </span>
    </div>
  );
}

interface ToastsProps {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}

export default function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
