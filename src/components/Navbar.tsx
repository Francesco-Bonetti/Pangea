"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, LogOut, Plus, User, Menu, X, BookOpen, Shield, Settings, LogIn, MessageCircle, Flag, Mail, Rss, Map, Info, Vote } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdmin = userRole === "admin" || userRole === "moderator";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

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
    <nav className="sticky top-0 z-50 border-b border-slate-700 bg-slate-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 overflow-hidden">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-85 transition-opacity duration-200 group shrink-0"
          >
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-200 shrink-0">
              <Globe className="w-5 h-5 text-white shrink-0" strokeWidth={2} />
            </div>
            <span className="text-lg font-bold text-white tracking-tight shrink-0">AGORA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 overflow-hidden">
            <Link
              href="/laws"
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors duration-150 group shrink-0"
            >
              <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              Laws
            </Link>
            <Link
              href="/parties"
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors duration-150 group shrink-0"
            >
              <Flag className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              Parties
            </Link>
            <Link
              href="/elections"
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors duration-150 group shrink-0"
            >
              <Vote className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              Elections
            </Link>
            <Link
              href="/social"
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors duration-150 group shrink-0"
            >
              <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              Forum
            </Link>
            <Link
              href="/jurisdictions"
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors duration-150 group shrink-0"
            >
              <Map className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              Jurisdictions
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors duration-150 group shrink-0"
            >
              <Info className="w-4 h-4 group-hover:scale-110 transition-transform duration-150 shrink-0" />
              About
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 overflow-hidden">
            {isGuest ? (
              /* Guest: Sign In Button */
              <Link
                href="/auth"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 shrink-0"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline shrink-0">Sign In</span>
                <span className="sm:hidden shrink-0">Sign In</span>
              </Link>
            ) : (
              /* Authenticated User */
              <>
                {/* Feed Icon */}
                <Link
                  href="/feed"
                  className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-150 shrink-0"
                  title="Your Feed"
                >
                  <Rss className="w-5 h-5 shrink-0" />
                </Link>

                {/* Messages Icon */}
                <Link
                  href="/messages"
                  className="relative p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-150 shrink-0"
                  title="Messages"
                >
                  <Mail className="w-5 h-5 shrink-0" />
                </Link>

                {/* New Proposal Button */}
                <Link
                  href="/proposals/new"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 shadow-lg shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  New Proposal
                </Link>
                <Link
                  href="/proposals/new"
                  className="sm:hidden p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-150 hover:scale-110 active:scale-95 shrink-0"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                </Link>

                {/* User Avatar Dropdown */}
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 pl-3 border-l border-slate-700 hover:border-slate-600 transition-colors duration-150 overflow-hidden"
                  >
                    <div className="hidden sm:flex flex-col items-end min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{userName || "User"}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[120px]">{userEmail}</p>
                    </div>
                    <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500 flex items-center justify-center hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-150 cursor-pointer hover:scale-110 active:scale-95 shrink-0">
                      <span className="text-xs font-bold text-white">{initials}</span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                        <p className="text-xs font-semibold text-white">{userName || "User"}</p>
                        <p className="text-xs text-slate-400 truncate mt-1">{userEmail}</p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        {/* Messages */}
                        <Link
                          href="/messages"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-150"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Mail className="w-4 h-4 shrink-0" />
                          Messages
                        </Link>

                        {/* Settings */}
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-150"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Settings className="w-4 h-4 shrink-0" />
                          Settings
                        </Link>

                        {/* My Delegations */}
                        <Link
                          href="/dashboard/delegations"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-150 relative overflow-hidden"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <div className="flex items-center gap-3 w-full min-w-0">
                            <MessageCircle className="w-4 h-4 shrink-0" />
                            <span className="min-w-0">My Delegations</span>
                            {pendingDelegations > 0 && (
                              <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full shrink-0">
                                {pendingDelegations}
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Admin Panel - Only for admins/moderators */}
                        {isAdmin && (
                          <>
                            <div className="border-t border-slate-700 my-1" />
                            <Link
                              href="/admin"
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-150"
                              onClick={() => setDropdownOpen(false)}
                            >
                              <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                              Admin Panel
                            </Link>
                          </>
                        )}

                        {/* Logout */}
                        <div className="border-t border-slate-700 my-1" />
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            handleLogout();
                          }}
                          disabled={loggingOut}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                          {loggingOut ? "Logging out..." : "Logout"}
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
              className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors duration-150 text-slate-400 hover:text-slate-200 shrink-0"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 shrink-0" /> : <Menu className="w-6 h-6 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-900 py-4 px-4 space-y-2 animate-in slide-in-from-top duration-200 overflow-hidden">
            {/* Navigation Links */}
            <Link
              href="/laws"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              Laws
            </Link>
            <Link
              href="/parties"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Flag className="w-4 h-4 shrink-0" />
              Parties
            </Link>
            <Link
              href="/elections"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Vote className="w-4 h-4 shrink-0" />
              Elections
            </Link>
            <Link
              href="/social"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              Forum
            </Link>
            <Link
              href="/jurisdictions"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Map className="w-4 h-4 shrink-0" />
              Jurisdictions
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Info className="w-4 h-4 shrink-0" />
              About
            </Link>

            {!isGuest && (
              <>
                <div className="border-t border-slate-700 my-2" />
                <Link
                  href="/proposals/new"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-colors duration-150 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  New Proposal
                </Link>
                <Link
                  href="/feed"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Rss className="w-4 h-4 shrink-0" />
                  Feed
                </Link>
                <Link
                  href="/messages"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  Messages
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/delegations"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150 relative overflow-hidden"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span className="min-w-0">My Delegations</span>
                  {pendingDelegations > 0 && (
                    <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full shrink-0">
                      {pendingDelegations}
                    </span>
                  )}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-150"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
