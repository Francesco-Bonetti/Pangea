import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import GuestBanner from "@/components/GuestBanner";
import CommentSection from "@/components/CommentSection";
import Link from "next/link";
import { MessageCircle, ArrowLeft, Hash, FileText, Scale, TrendingUp } from "lucide-react";

export const metadata = {
  title: "Discussioni — Agora Pangea",
  description: "Partecipa alle discussioni della comunità di Pangea",
};

export default async function SocialPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  let profile: { full_name?: string; role?: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Recupera discussioni recenti legate a proposte (per il feed laterale)
  const { data: recentProposalComments } = await supabase
    .from("comments")
    .select("id, proposal_id, body, created_at, proposals(title)")
    .not("proposal_id", "is", null)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // Recupera discussioni recenti legate a leggi
  const { data: recentLawComments } = await supabase
    .from("comments")
    .select("id, law_id, body, created_at, laws(title)")
    .not("law_id", "is", null)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // Tag più usati
  const { data: trendingTags } = await supabase
    .from("tags")
    .select("name, slug, usage_count")
    .order("usage_count", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} isGuest={isGuest} />
      {isGuest && <GuestBanner />}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-pangea-400" />
              Discussioni
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Confrontati con la comunità su qualsiasi argomento
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main feed: discussione generale */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-pangea-400" />
                Discussione Generale
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Scrivi un messaggio visibile a tutta la comunità. Per commentare una proposta o una legge specifica, vai direttamente sulla sua pagina.
              </p>
              <CommentSection
                targetType="general"
                userId={user?.id}
              />
            </div>
          </div>

          {/* Sidebar: link alle discussioni specifiche */}
          <div className="lg:col-span-1 space-y-6">
            {/* Trending tags */}
            {trendingTags && trendingTags.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pangea-400" />
                  Tag popolari
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingTags.map((tag: { name: string; slug: string; usage_count: number }) => (
                    <span
                      key={tag.slug}
                      className="text-xs text-pangea-400 bg-pangea-900/20 px-2 py-1 rounded-full border border-pangea-800/30 flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3" />
                      {tag.name}
                      {tag.usage_count > 0 && (
                        <span className="text-slate-500 ml-0.5">{tag.usage_count}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Discussioni recenti su proposte */}
            {recentProposalComments && recentProposalComments.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Ultime su proposte
                </h3>
                <div className="space-y-3">
                  {recentProposalComments.map((c: Record<string, unknown>) => (
                    <Link
                      key={c.id as string}
                      href={`/proposals/${c.proposal_id}`}
                      className="block group"
                    >
                      <p className="text-xs text-pangea-400 group-hover:text-pangea-300 font-medium truncate">
                        {(c.proposals as { title: string })?.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {(c.body as string).slice(0, 80)}...
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Discussioni recenti su leggi */}
            {recentLawComments && recentLawComments.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-400" />
                  Ultime su leggi
                </h3>
                <div className="space-y-3">
                  {recentLawComments.map((c: Record<string, unknown>) => (
                    <Link
                      key={c.id as string}
                      href={`/laws#${c.law_id}`}
                      className="block group"
                    >
                      <p className="text-xs text-blue-400 group-hover:text-blue-300 font-medium truncate">
                        {(c.laws as { title: string })?.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {(c.body as string).slice(0, 80)}...
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
