"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/* ═══════════════════════════════════════════════════════════
   ErrorBoundary — Core & Edge variants
   ─────────────────────────────────────────────────────────
   Core (votes, laws, proposals, elections, delegations):
     → full error display + retry button
   Edge (feed, messages, discussions, settings):
     → graceful degradation, section collapsed
   ═══════════════════════════════════════════════════════════ */

type BoundaryVariant = "core" | "edge";

interface ErrorBoundaryProps {
  children: ReactNode;
  variant: BoundaryVariant;
  /** Optional section name for logging */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** Wrapper to pass i18n t() into class component */
function ErrorFallback({
  variant,
  error,
  onRetry,
}: {
  variant: BoundaryVariant;
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useLanguage();

  if (variant === "core") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px]">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
        >
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-base" style={{ color: "var(--foreground)" }}>
            {t("errorBoundary.coreTitle")}
          </h3>
          <p className="text-sm max-w-md" style={{ color: "var(--muted-foreground)" }}>
            {t("errorBoundary.coreDesc")}
          </p>
          {error && process.env.NODE_ENV === "development" && (
            <p className="text-xs font-mono mt-2 p-2 rounded" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
              {error.message}
            </p>
          )}
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          <RefreshCw className="w-4 h-4" />
          {t("errorBoundary.retry")}
        </button>
      </div>
    );
  }

  // Edge variant — minimal, degraded gracefully
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg mx-4 my-2" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {t("errorBoundary.edgeTitle")}
        </p>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {t("errorBoundary.edgeDesc")}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="text-xs px-3 py-1 rounded-md flex-shrink-0 transition-colors"
        style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
      >
        {t("errorBoundary.retry")}
      </button>
    </div>
  );
}

export class SectionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { variant, section } = this.props;
    console.error(
      `[ErrorBoundary:${variant}${section ? `:${section}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          variant={this.props.variant}
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

/* ── Convenience wrappers ────────────────────────────────── */

export function CoreErrorBoundary({ children, section }: { children: ReactNode; section?: string }) {
  return (
    <SectionErrorBoundary variant="core" section={section}>
      {children}
    </SectionErrorBoundary>
  );
}

export function EdgeErrorBoundary({ children, section }: { children: ReactNode; section?: string }) {
  return (
    <SectionErrorBoundary variant="edge" section={section}>
      {children}
    </SectionErrorBoundary>
  );
}
