import Link from "next/link";
import { Globe, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0c1220] flex items-center justify-center">
      <div className="text-center">
        <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" strokeWidth={1} />
        <h1 className="text-2xl font-bold text-slate-300 mb-2">Proposta non trovata</h1>
        <p className="text-slate-500 mb-6">
          Questa proposta non esiste o non è ancora pubblica.
        </p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Torna alla Piazza
        </Link>
      </div>
    </div>
  );
}
