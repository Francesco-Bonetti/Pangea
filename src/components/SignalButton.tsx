"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Flame, Loader2, CheckCircle2 } from "lucide-react";

interface SignalButtonProps {
  proposalId: string;
  userId: string;
  initialSignalCount: number;
  initialHasSignaled: boolean;
  threshold: number;
  activeUsersCount: number;
}

export default function SignalButton({
  proposalId,
  userId,
  initialSignalCount,
  initialHasSignaled,
  threshold,
  activeUsersCount,
}: SignalButtonProps) {
  const [signalCount, setSignalCount] = useState(initialSignalCount);
  const [hasSignaled, setHasSignaled] = useState(initialHasSignaled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const progress = Math.min((signalCount / threshold) * 100, 100);

  async function toggleSignal() {
    setLoading(true);
    setError(null);

    try {
      if (hasSignaled) {
        // Ritira segnale
        const { error: deleteError } = await supabase
          .from("proposal_signals")
          .delete()
          .eq("proposal_id", proposalId)
          .eq("supporter_id", userId);

        if (deleteError) throw deleteError;
        setSignalCount((c) => Math.max(0, c - 1));
        setHasSignaled(false);
      } else {
        // Invia segnale
        const { error: insertError } = await supabase
          .from("proposal_signals")
          .insert({
            proposal_id: proposalId,
            supporter_id: userId,
            signal_strength: 1,
          });

        if (insertError) {
          if (insertError.code === "23505") {
            setHasSignaled(true);
            return;
          }
          throw insertError;
        }
        setSignalCount((c) => c + 1);
        setHasSignaled(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Progress bar verso la soglia */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Segnali di supporto</span>
          <span className="font-medium">
            {signalCount} / {threshold} segnali (
            {activeUsersCount > 0
              ? ((threshold / activeUsersCount) * 100).toFixed(0)
              : "0"}
            % degli utenti attivi)
          </span>
        </div>
        <div className="bg-slate-700 rounded-full h-2.5">
          <div
            className="bg-amber-500 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-1">
          {signalCount >= threshold
            ? "Soglia raggiunta — in attesa di promozione"
            : `Mancano ${threshold - signalCount} segnali per la fase deliberativa`}
        </p>
      </div>

      {/* Bottone segnala */}
      <button
        onClick={toggleSignal}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all duration-200 disabled:opacity-50 ${
          hasSignaled
            ? "border-amber-600 bg-amber-900/30 text-amber-300 hover:bg-amber-900/50"
            : "border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-amber-600"
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : hasSignaled ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Flame className="w-4 h-4" />
        )}
        {loading
          ? "Aggiornamento..."
          : hasSignaled
          ? "Segnale inviato — Ritira"
          : "Supporta questa proposta"}
      </button>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
