import { useEffect } from "react";

interface ConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="overlay" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Approve GBP post"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="modal-title">Approve GBP post?</h3>
        <p className="modal-text">
          This publishes immediately once live. Approve?
        </p>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-approve" onClick={onConfirm} autoFocus>
            ✓ Approve (publishes)
          </button>
        </div>
      </div>
    </div>
  );
}
