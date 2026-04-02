"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, LogOut, Plus, User, Users, Menu, X, BookOpen, Shield, Settings, LogIn } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string;
  isGuest?: boolean;
}

export default function Navbar({ userEmail, userName, userRole, isGuest = false }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = userRole === "admin" || userRole === "moderator";

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-[#0c1220]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Globe className="w-7 h-7 text-pangea-400" strokeWidth={1.5} />
            <span className="text-xl font-bold text-white">Agora</span>
            <span className="hidden sm:block text-xs text-slate-500 mt-0.5">· Pangea</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Desktop navigation */}
            <Link
              href="/laws"
              className="hidden md:flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Codice
            </Link>
            {!isGuest && (
              <Link
                href="/dashboard/delegations"
                className="hidden md:flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                Deleghe
              </Link>
            )}
            <Link
              href="/about"
              className="hidden md:block text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Chi Siamo
            </Link>
            {!isGuest && isAdmin && (
              <Link
                href="/admin"
                className="hidden md:flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
            {!isGuest && (
              <Link
                href="/settings"
                className="hidden md:flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Impostazioni
              </Link>
            )}

            {isGuest ? (
              /* Ospite: mostra CTA accedi/registrati */
              <Link
                href="/auth"
                className="flex items-center gap-2 btn-primary text-sm py-2"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Accedi / Registrati</span>
                <span className="sm:hidden">Accedi</span>
              </Link>
            ) : (
              /* Utente autenticato */
              <>
                <Link
                  href="/proposals/new"
                  className="hidden sm:flex items-center gap-2 btn-primary text-sm py-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuova Proposta
                </Link>
                <Link
                  href="/proposals/new"
                  className="sm:hidden p-2 rounded-lg bg-pangea-600 text-white hover:bg-pangea-500 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </Link>

                {/* User info */}
                <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-slate-300 font-medium">{userName || "Cittadino"}</p>
                    <p className="text-xs text-slate-600 truncate max-w-[120px]">{userEmail}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="w-8 h-8 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center hover:bg-pangea-700 transition-colors"
                    title="Impostazioni"
                  >
                    <User className="w-4 h-4 text-pangea-300" />
                  </Link>
                </div>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400"
              title="Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {!isGuest && (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn-ghost p-2 text-slate-400"
                title="Esci"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 py-3 px-4 space-y-2">
            <Link
              href="/laws"
              className="block text-sm text-slate-400 hover:text-slate-200 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Codice di Pangea
            </Link>
            {!isGuest && (
              <Link
                href="/dashboard/delegations"
                className="block text-sm text-slate-400 hover:text-slate-200 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Deleghe
              </Link>
            )}
            <Link
              href="/about"
              className="block text-sm text-slate-400 hover:text-slate-200 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Chi Siamo
            </Link>
            {!isGuest && (
              <Link
                href="/proposals/new"
                className="block text-sm text-slate-400 hover:text-slate-200 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Nuova Proposta
              </Link>
            )}
            {!isGuest && isAdmin && (
              <Link
                href="/admin"
                className="block text-sm text-slate-400 hover:text-slate-200 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pannello Admin
              </Link>
            )}
            {!isGuest && (
              <Link
                href="/settings"
                className="block text-sm text-slate-400 hover:text-slate-200 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Impostazioni
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
