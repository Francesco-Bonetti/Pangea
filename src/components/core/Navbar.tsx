"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, LogOut, Plus, User, Users, Menu, X, Shield, Settings, LogIn, Mail, Rss, Info, Vote, Compass, ChevronDown, BookOpen, FileText, MessageCircle } from "lucide-react";
import { GROUP_NODES, ICON_MAP } from "@/lib/platform-nodes";
import { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/core/theme-toggle";
import { useLanguage } from "@/components/core/language-provider";

interface NavbarProps {
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string;
  isGuest?: boolean;
  pendingDelegations?: number;
}

export default function Navbar({ userEmail, userName, userRole, isGuest = false, pendingDelegations = 0 }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const isAdmin = userRole === "admin" || userRole === "moderator";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setExploreDropdownOpen(false);
      }
    }

    if (dropdownOpen || exploreDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen, exploreDropdownOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <nav className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--background) 95%, transparent)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-85 transition-opacity duration-200 group shrink-0"
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-200 shrink-0">
              <Globe className="w-5 h-5 text-fg shrink-0" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold text-fg tracking-tight shrink-0">PANGEA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 overflow-hidden">
            {/* Groups dropdown */}
            <div className="relative shrink-0" ref={exploreRef}>
              <button
                onClick={() => setExploreDropdownOpen(!exploreDropdownOpen)}
                className="flex items-center gap-1.5 text-sm text-fg hover:text-fg transition-colors duration-150 group"
              >
                <Compass className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
                {t("nav.groups")}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${exploreDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {exploreDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-52 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div className="py-1.5">
                    {GROUP_NODES.map((node) => {
                      const Icon = ICON_MAP[node.iconKey];
                      return (
                        <Link
                          key={node.id}
                          href={node.href}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:bg-theme-card transition-colors duration-150"
                          onClick={() => setExploreDropdownOpen(false)}
                        >
                          <Icon className="w-4 h-4 shrink-0" style={{ color: node.color }} />
                          {t(node.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/laws"
              className="flex items-center gap-2 text-sm text-fg hover:text-fg transition-colors duration-150 group shrink-0"
            >
              <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {t("nav.laws")}
            </Link>
            <Link
              href="/proposals"
              className="flex items-center gap-2 text-sm text-fg hover:text-fg transition-colors duration-150 group shrink-0"
            >
              <FileText className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {t("nav.proposals")}
            </Link>
            <Link
              href="/elections"
              className="flex items-center gap-2 text-sm text-fg hover:text-fg transition-colors duration-150 group shrink-0"
            >
              <Vote className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {t("nav.elections")}
            </Link>
            <Link
              href="/social"
              className="flex items-center gap-2 text-sm text-fg hover:text-fg transition-colors duration-150 group shrink-0"
            >
              <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {t("nav.forum")}
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-2 text-sm text-fg hover:text-fg transition-colors duration-150 group shrink-0"
            >
              <Info className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              {t("nav.about")}
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle — always visible */}
            <ThemeToggle />

            {isGuest ? (
              /* Guest: Sign In Button */
              <Link
                href="/auth"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-fg text-sm font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 shrink-0"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline shrink-0">{t("nav.signIn")}</span>
                <span className="sm:hidden shrink-0">{t("nav.signIn")}</span>
              </Link>
            ) : (
              /* Authenticated User */
              <>
                {/* Feed Icon */}
                <Link
                  href="/feed"
                  className="relative p-2 rounded-lg hover:bg-theme-card text-fg-muted hover:text-fg transition-all duration-150 shrink-0"
                  title={t("nav.yourFeed")}
                >
                  <Rss className="w-5 h-5 shrink-0" />
                </Link>

                {/* Messages Icon */}
                <Link
                  href="/messages"
                  className="relative p-2 rounded-lg hover:bg-theme-card text-fg-muted hover:text-fg transition-all duration-150 shrink-0"
                  title={t("nav.messages")}
                >
                  <Mail className="w-5 h-5 shrink-0" />
                </Link>

                {/* New Proposal Button */}
                <Link
                  href="/proposals/new"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-fg text-sm font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 shadow-lg shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  {t("nav.newProposal")}
                </Link>
                <Link
                  href="/proposals/new"
                  className="sm:hidden p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-fg transition-all duration-150 hover:scale-110 active:scale-95 shrink-0"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                </Link>

                {/* User Avatar Dropdown */}
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 pl-3 border-l border-theme hover:border-theme transition-colors duration-150 overflow-hidden"
                  >
                    <div className="hidden sm:flex flex-col items-end min-w-0">
                      <p className="text-xs font-semibold text-fg truncate">{userName || "User"}</p>
                      <p className="text-xs text-fg-muted truncate max-w-[120px]">{userEmail}</p>
                    </div>
                    <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500 flex items-center justify-center hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-150 cursor-pointer hover:scale-110 active:scale-95 shrink-0">
                      <span className="text-xs font-bold text-fg">{initials}</span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                      {/* User Info Header */}
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'color-mix(in srgb, var(--muted) 50%, var(--card))' }}>
                        <p className="text-xs font-semibold text-fg">{userName || "User"}</p>
                        <p className="text-xs text-fg-muted truncate mt-1">{userEmail}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* Citizen Profile */}
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card transition-colors duration-150"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <User className="w-4 h-4 shrink-0" />
                          {t("nav.citizenProfile")}
                        </Link>

                        {/* Messages */}
                        <Link
                          href="/messages"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card transition-colors duration-150"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Mail className="w-4 h-4 shrink-0" />
                          {t("nav.messages")}
                        </Link>

                        {/* Feed */}
                        <Link
                          href="/feed"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card transition-colors duration-150"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Rss className="w-4 h-4 shrink-0" />
                          {t("nav.feed")}
                        </Link>

                        {/* Delegations */}
                        <Link
                          href="/dashboard/delegations"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card transition-colors duration-150 relative overflow-hidden"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <div className="flex items-center gap-3 w-full min-w-0">
                            <Users className="w-4 h-4 shrink-0" />
                            <span className="min-w-0">{t("nav.delegations")}</span>
                            {pendingDelegations > 0 && (
                              <span className="ml-auto px-2 py-0.5 bg-red-600 text-fg text-[10px] font-bold rounded-full shrink-0">
                                {pendingDelegations}
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Positions (replaces Admin) */}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card transition-colors duration-150"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                            {t("nav.positions")}
                          </Link>
                        )}

                        {/* Settings */}
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card transition-colors duration-150"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Settings className="w-4 h-4 shrink-0" />
                          {t("nav.settings")}
                        </Link>

                        {/* Logout */}
                        <div className="border-t border-theme my-1" />
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            handleLogout();
                          }}
                          disabled={loggingOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <LogOut className="w-4 h-4 text-fg-danger shrink-0" />
                          {loggingOut ? t("nav.loggingOut") : t("nav.logout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-theme-card transition-colors duration-150 text-fg-muted hover:text-fg shrink-0"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 shrink-0" /> : <Menu className="w-6 h-6 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 px-4 space-y-2 animate-in slide-in-from-top duration-200 overflow-hidden" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--card)' }}>
            {/* Groups section */}
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
              {t("nav.groups")}
            </p>
            {GROUP_NODES.map((node) => {
              const Icon = ICON_MAP[node.iconKey];
              return (
                <Link
                  key={node.id}
                  href={node.href}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150 ml-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: node.color }} />
                  {t(node.labelKey)}
                </Link>
              );
            })}

            <div className="border-t border-theme my-2" />

            {/* Main navigation */}
            <Link
              href="/laws"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              {t("nav.laws")}
            </Link>
            <Link
              href="/proposals"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {t("nav.proposals")}
            </Link>
            <Link
              href="/elections"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Vote className="w-4 h-4 shrink-0" />
              {t("nav.elections")}
            </Link>
            <Link
              href="/social"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              {t("nav.forum")}
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Info className="w-4 h-4 shrink-0" />
              {t("nav.about")}
            </Link>

            {!isGuest && (
              <>
                <div className="border-t border-theme my-2" />
                <Link
                  href="/proposals/new"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-colors duration-150 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  {t("nav.newProposal")}
                </Link>

                <div className="border-t border-theme my-2" />
                <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                  {t("nav.yourSpace")}
                </p>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4 shrink-0" />
                  {t("nav.citizenProfile")}
                </Link>
                <Link
                  href="/messages"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  {t("nav.messages")}
                </Link>
                <Link
                  href="/feed"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Rss className="w-4 h-4 shrink-0" />
                  {t("nav.feed")}
                </Link>
                <Link
                  href="/dashboard/delegations"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150 relative overflow-hidden"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="min-w-0">{t("nav.delegations")}</span>
                  {pendingDelegations > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-red-600 text-fg text-[10px] font-bold rounded-full shrink-0">
                      {pendingDelegations}
                    </span>
                  )}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                    {t("nav.positions")}
                  </Link>
                )}
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg hover:text-fg hover:bg-theme-card rounded-lg transition-colors duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  {t("nav.settings")}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-fg-danger hover:text-fg-danger hover:bg-theme-card rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {loggingOut ? t("nav.loggingOut") : t("nav.logout")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
