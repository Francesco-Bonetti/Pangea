"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  BookOpen,
  Flag,
  Vote,
  MessageCircle,
  Map,
  Info,
  LayoutDashboard,
  Plus,
  Rss,
  Mail,
  Settings,
  Shield,
  LogOut,
  Users,
  LogIn,
  ChevronLeft,
} from "lucide-react";
import { useSidebar } from "@/components/sidebar-provider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AppSidebarProps {
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string;
  isGuest?: boolean;
  pendingDelegations?: number;
}

/* ── Navigation structure ── */
const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/laws", label: "Laws", icon: BookOpen },
  { href: "/parties", label: "Parties", icon: Flag },
  { href: "/elections", label: "Elections", icon: Vote },
  { href: "/social", label: "Forum", icon: MessageCircle },
  { href: "/jurisdictions", label: "Jurisdictions", icon: Map },
  { href: "/about", label: "About", icon: Info },
];

const userNavItems = [
  { href: "/feed", label: "Feed", icon: Rss },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppSidebar({
  userName,
  userEmail,
  userRole,
  isGuest = false,
  pendingDelegations = 0,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { isOpen, isMobile, close, toggle } = useSidebar();
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = userRole === "admin" || userRole === "moderator";

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  function handleNavClick() {
    // Close sidebar on mobile after navigation
    if (isMobile) close();
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          sidebar-container
          ${isMobile ? "fixed inset-y-0 left-0 z-50" : "sticky top-0 h-screen z-30"}
          flex flex-col
          shrink-0
          border-r
          transition-all duration-300 ease-in-out
          ${isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full overflow-hidden"}
        `}
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--sidebar-bg)",
        }}
      >
        {/* ── Logo + collapse button ── */}
        <div
          className="flex items-center justify-between h-16 px-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity duration-200 group"
            onClick={handleNavClick}
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-200 shrink-0">
              <Globe className="w-5 h-5 text-fg" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
              AGORA
            </span>
          </Link>
          {/* Collapse on desktop / close on mobile */}
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-[var(--muted)]"
            style={{ color: "var(--muted-foreground)" }}
            aria-label={isMobile ? "Close menu" : "Toggle sidebar"}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* ── New Proposal CTA ── */}
        {!isGuest && (
          <div className="px-3 pt-4 pb-2">
            <Link
              href="/proposals/new"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-fg text-sm font-medium rounded-lg transition-all duration-150 hover:shadow-lg hover:shadow-blue-600/20 active:scale-[0.98]"
              onClick={handleNavClick}
            >
              <Plus className="w-4 h-4" />
              New Proposal
            </Link>
          </div>
        )}

        {/* ── Main navigation ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 sidebar-scrollbar">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
            Navigation
          </p>
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`
                  sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${active ? "sidebar-nav-active" : "sidebar-nav-inactive"}
                `}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* ── User section (authenticated only) ── */}
          {!isGuest && (
            <>
              <div className="my-3 mx-3" style={{ borderTop: "1px solid var(--border)" }} />
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                Your Space
              </p>
              {userNavItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`
                      sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-150
                      ${active ? "sidebar-nav-active" : "sidebar-nav-inactive"}
                    `}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}

              {/* Delegations with badge */}
              <Link
                href="/dashboard/delegations"
                onClick={handleNavClick}
                className={`
                  sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${isActive("/dashboard/delegations") ? "sidebar-nav-active" : "sidebar-nav-inactive"}
                `}
              >
                <Users className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">Delegations</span>
                {pendingDelegations > 0 && (
                  <span className="px-2 py-0.5 bg-red-600 text-fg text-[10px] font-bold rounded-full">
                    {pendingDelegations}
                  </span>
                )}
              </Link>

              {/* Admin */}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={handleNavClick}
                  className={`
                    sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150
                    ${isActive("/admin") ? "sidebar-nav-active" : "sidebar-nav-inactive"}
                  `}
                >
                  <Shield className="w-[18px] h-[18px] shrink-0 text-amber-500" />
                  Admin Panel
                </Link>
              )}
            </>
          )}
        </nav>

        {/* ── Bottom user card / Guest CTA ── */}
        <div
          className="shrink-0 px-3 py-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {isGuest ? (
            <Link
              href="/auth"
              onClick={handleNavClick}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-fg text-sm font-medium rounded-lg transition-all duration-150"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
          ) : (
            <div className="space-y-2">
              {/* User info */}
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500/50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-fg">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                    {userName || "User"}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    {userEmail}
                  </p>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed sidebar-nav-inactive"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0 text-fg-danger" />
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
