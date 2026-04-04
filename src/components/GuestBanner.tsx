"use client";

import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { useState } from "react";

export default function GuestBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-900/30 border-b border-amber-700/40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-200">
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>
            You are exploring Agora as a <strong>guest</strong>. Actions are not saved.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/auth"
            className="text-xs font-medium bg-amber-600 hover:bg-amber-500 text-fg px-3 py-1.5 rounded-lg transition-colors"
          >
            Register
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400 hover:text-amber-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
