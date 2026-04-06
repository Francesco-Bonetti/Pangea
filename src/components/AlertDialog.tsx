"use client";

import { useEffect, useRef, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
}

export default function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = "primary",
  loading = false,
}: AlertDialogProps) {
  const { t } = useLanguage();
  const overlayRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const resolvedConfirmLabel = confirmLabel || t("common.confirm");
  const resolvedCancelLabel = cancelLabel || t("common.cancel");

  // Focus trap: focus confirm button on open
  useEffect(() => {
    if (open && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, loading]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current && !loading) {
        onClose();
      }
    },
    [onClose, loading]
  );

  if (!open) return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "btn-danger"
      : "btn-primary";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-2xl animate-in"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "color-mix(in srgb, var(--destructive) 15%, transparent)",
            }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: "var(--destructive)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="alert-dialog-title"
              className="text-lg font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {title}
            </h2>
            <p
              id="alert-dialog-description"
              className="text-sm mt-2 leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {description}
            </p>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ color: "var(--muted-foreground)" }}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary flex-1 text-sm min-h-[44px]"
          >
            {resolvedCancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={loading}
            className={`${confirmClass} flex-1 text-sm min-h-[44px] flex items-center justify-center gap-2`}
          >
            {loading && (
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {loading ? t("common.recording") : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
