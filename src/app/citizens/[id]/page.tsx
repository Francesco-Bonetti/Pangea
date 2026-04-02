import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { User, Calendar, FileText, Users, Vote, BookOpen, Shield } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CitizenProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch target citizen profile
  const { data: citizen, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !citizen) notFound();

  // Fetch citizen's proposals
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, title, status, created_at")
    .eq("author_id", id)
    .in("status", ["active", "closed", "curation"])
    .order("created_at", { ascending: false })
    .limit(10);

  // Count votes cast
  const { count: voteCount } = await supabase
    .from("votes")
    .select("*", { count: "exact", head: true })
    .eq("voter_id", id);

  // Count delegations received (accepted)
  const { count: delegationCount } = await supabase
    .from("delegations")
    .select("*", { count: "exact", head: true })
    .eq("delegate_id", id)
    .eq("status", "accepted");

  const statusConfig: Record<string, string> = {
    curation: "status-curation",
    active: "status-active",
    closed: "status-closed",
  };

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} isGuest={!user} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6 inline-block">
          ← Torna alla Piazza
        </Link>

        {/* Profile header */}
        <div className="card p-8 mb-6 text-center">
          <div className="w-20 h-20 rounded-full bg-pangea-800 border-2 border-pangea-600 flex items-center justify-center text-2xl text-pangea-300 font-bold mx-auto mb-4">
            {(citizen.full_name ?? "?")[0].toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{citizen.full_name ?? "Cittadino"}</h1>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              citizen.role === "admin" ? "text-red-300 bg-red-900/30 border border-red-700/30" :
              citizen.role === "moderator" ? "text-amber-300 bg-amber-900/30 border border-amber-700/30" :
              "text-slate-400 bg-slate-700/50"
            }`}>
              <Shield className="w-3 h-3 inline mr-1" />
              {citizen.role === "admin" ? "Amministratore" : citizen.role === "moderator" ? "Moderatore" : "Cittadino"}
            </span>
          </div>
          {citizen.bio && (
            <p className="text-slate-400 text-sm max-w-md mx-auto">{citizen.bio}</p>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            Membro dal {formatDate(citizen.created_at)}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 text-center">
            <FileText className="w-5 h-5 text-pangea-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{proposals?.length ?? 0}</p>
            <p className="text-xs text-slate-500">Proposte</p>
          </div>
          <div className="card p-4 text-center">
            <Vote className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{voteCount ?? 0}</p>
            <p className="text-xs text-slate-500">Voti</p>
          </div>
          <div className="card p-4 text-center">
            <Users className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{delegationCount ?? 0}</p>
            <p className="text-xs text-slate-500">Deleghe ricevute</p>
          </div>
        </div>

        {/* Proposals */}
        {proposals && proposals.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-pangea-400" />
              Proposte pubbliche
            </h2>
            <div className="space-y-3">
              {proposals.map((p: { id: string; title: string; status: string; created_at: string }) => (
                <Link
                  key={p.id}
                  href={`/proposals/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{p.title}</p>
                    <p className="text-xs text-slate-500">{formatDate(p.created_at)}</p>
                  </div>
                  <span className={statusConfig[p.status] || "status-draft"}>
                    {p.status === "active" ? "In Votazione" : p.status === "closed" ? "Approvata" : "In Promozione"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
