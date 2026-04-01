"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, LogOut, Plus, User } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  userEmail?: string | null;
  userName?: string | null;
}

export default function Navbar({ userEmail, userName }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);

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
              <div className="w-8 h-8 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center">
                <User className="w-4 h-4 text-pangea-300" />
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn-ghost p-2 text-slate-400"
              title="Esci"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
