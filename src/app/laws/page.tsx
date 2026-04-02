import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import GuestBanner from "@/components/GuestBanner";
import LawTree from "@/components/LawTree";
import { BookOpen, Globe, Scale } from "lucide-react";
import Link from "next/link";

// Tipo per i nodi dell'albero
export interface LawNode {
  id: string;
  parent_id: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  code: string | null;
  article_number: string | null;
  law_type: string;
  status: string;
  order_index: number;
  children?: LawNode[];
}

export default async function LawsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Profilo per ruolo (navbar + admin check)
  let profile: { full_name?: string; role?: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const isAdmin = profile?.role === "admin" || profile?.role === "moderator";

  // Carica tutte le leggi e costruisci l'albero lato server
  const { data: allLaws, error } = await supabase
    .from("laws")
    .select("*")
    .eq("status", "active")
    .order("order_index")
    .order("created_at");

  if (error) {
    console.error("Errore caricamento leggi:", error);
  }

  // Costruisci albero gerarchico
  const laws = allLaws ?? [];
  const rootLaws = laws.filter((l: LawNode) => l.parent_id === null);

  function buildTree(parentId: string): LawNode[] {
    return laws
      .filter((l: LawNode) => l.parent_id === parentId)
      .map((l: LawNode) => ({
        ...l,
        children: buildTree(l.id),
      }));
  }

  const lawTree: LawNode[] = rootLaws.map((l: LawNode) => ({
    ...l,
    children: buildTree(l.id),
  }));

  // Statistiche
  const totalCodes = rootLaws.length;
  const totalArticles = laws.filter((l: LawNode) => l.law_type === "article").length;

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} isGuest={isGuest} />
      {isGuest && <GuestBanner />}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4 inline-block"
          >
            ← Torna alla Piazza
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-white">
              Codice di Pangea
            </h1>
          </div>
          <p className="text-slate-400">
            I Living Codes del Pangean Commonwealth — leggi viventi, emendabili e abrogabili attraverso il processo democratico dell&apos;Agorà.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card p-4 bg-blue-900/10">
            <Scale className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{totalCodes}</p>
            <p className="text-xs text-slate-500">Codici</p>
          </div>
          <div className="card p-4 bg-pangea-900/10">
            <BookOpen className="w-5 h-5 text-pangea-400 mb-2" />
            <p className="text-2xl font-bold text-white">{totalArticles}</p>
            <p className="text-xs text-slate-500">Articoli</p>
          </div>
          <div className="card p-4 bg-green-900/10">
            <Globe className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">Attivo</p>
            <p className="text-xs text-slate-500">Status</p>
          </div>
        </div>

        {/* Albero delle leggi */}
        <div className="space-y-4">
          {lawTree.map((code) => (
            <LawTree key={code.id} node={code} depth={0} isAdmin={isAdmin} />
          ))}
        </div>

        {lawTree.length === 0 && (
          <div className="text-center py-20 card">
            <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              Nessuna legge ancora
            </h3>
            <p className="text-slate-500">
              I Living Codes verranno popolati man mano che la comunità cresce.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
