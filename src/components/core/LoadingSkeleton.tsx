"use client";

import { Globe } from "lucide-react";

interface LoadingSkeletonProps {
  /** Number of skeleton cards to show */
  cards?: number;
  /** Show a header skeleton */
  showHeader?: boolean;
}

export default function LoadingSkeleton({ cards = 3, showHeader = true }: LoadingSkeletonProps) {
  return (
    <div className="animate-pulse space-y-6">
      {showHeader && (
        <div className="space-y-3">
          <div className="skeleton-text w-48 h-6" />
          <div className="skeleton-text w-72 h-4" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-text w-24 h-5" />
            <div className="skeleton-text w-full h-5" />
            <div className="skeleton-text w-3/4 h-4" />
            <div className="skeleton-text w-1/2 h-4" />
            <div className="flex justify-between pt-4 border-t border-[var(--border)]">
              <div className="skeleton-text w-16 h-3" />
              <div className="skeleton-text w-20 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full page loading state with centered spinner */
export function PageLoader() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <Globe className="w-10 h-10 text-fg-primary mx-auto mb-3 animate-spin" style={{ animationDuration: "2s" }} />
        <p className="text-fg-muted text-sm">Loading...</p>
      </div>
    </div>
  );
}
