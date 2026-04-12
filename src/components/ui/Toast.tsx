"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */
type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

/* ──────────────────────────────────────────────
   Context
   ────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

/* ──────────────────────────────────────────────
   Provider + Renderer
   ────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "success", duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);

      // Auto-dismiss
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — bottom right */}
      <div
        className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ──────────────────────────────────────────────
   Individual Toast
   ────────────────────────────────────────────── */
const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; colorVar: string }
> = {
  success: { icon: CheckCircle2, colorVar: "var(--success)" },
  error: { icon: XCircle, colorVar: "var(--destructive)" },
  warning: { icon: AlertTriangle, colorVar: "#d97706" },
  info: { icon: Info, colorVar: "var(--primary)" },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const config = variantConfig[toast.variant];
  const Icon = config.icon;

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-[420px] toast-slide-in"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
      role="status"
    >
      <Icon
        className="w-5 h-5 shrink-0"
        style={{ color: config.colorVar }}
      />
      <p
        className="text-sm font-medium flex-1"
        style={{ color: "var(--foreground)" }}
      >
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        style={{ color: "var(--muted-foreground)" }}
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
