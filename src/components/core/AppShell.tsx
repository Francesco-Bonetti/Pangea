"use client";

import { SidebarProvider } from "@/components/core/sidebar-provider";
import AppSidebar from "@/components/core/AppSidebar";
import TopHeader from "@/components/core/TopHeader";
import GuestBanner from "@/components/ui/GuestBanner";
import { CoreErrorBoundary, EdgeErrorBoundary } from "@/components/core/ErrorBoundary";
import type { ReactNode } from "react";

/**
 * Section classification for error boundary isolation.
 * Core = append-only (votes, laws, proposals, elections, delegations) → full error + retry
 * Edge = CRUD (feed, messages, discussions, settings, about) → graceful degradation
 */
type SectionType = "core" | "edge";

interface AppShellProps {
  children: ReactNode;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string;
  isGuest?: boolean;
  pendingDelegations?: number;
  /** Section type for error boundary isolation (default: "edge") */
  section?: SectionType;
  /** Optional section name for error logging */
  sectionName?: string;
}

export default function AppShell({
  children,
  userEmail,
  userName,
  userRole,
  isGuest = false,
  pendingDelegations = 0,
  section = "edge",
  sectionName,
}: AppShellProps) {
  const wrappedContent =
    section === "core" ? (
      <CoreErrorBoundary section={sectionName}>
        {children}
      </CoreErrorBoundary>
    ) : (
      <EdgeErrorBoundary section={sectionName}>
        {children}
      </EdgeErrorBoundary>
    );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: "var(--background)" }}>
        {/* Sidebar */}
        <AppSidebar
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          isGuest={isGuest}
          pendingDelegations={pendingDelegations}
        />

        {/* Main area (header + content) */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader
            userName={userName}
            userEmail={userEmail}
            isGuest={isGuest}
          />

          {isGuest && <GuestBanner />}

          {/* Page content — wrapped in section-appropriate error boundary */}
          <main className="flex-1 overflow-y-auto">
            {wrappedContent}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
