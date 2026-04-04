"use client";

import { SidebarProvider } from "@/components/sidebar-provider";
import AppSidebar from "@/components/AppSidebar";
import TopHeader from "@/components/TopHeader";
import GuestBanner from "@/components/GuestBanner";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string;
  isGuest?: boolean;
  pendingDelegations?: number;
}

export default function AppShell({
  children,
  userEmail,
  userName,
  userRole,
  isGuest = false,
  pendingDelegations = 0,
}: AppShellProps) {
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

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
