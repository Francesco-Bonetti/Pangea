import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import GuestBanner from "@/components/GuestBanner";
import LawTree from "@/components/LawTree";
import { BookOpen, Globe, Scale, Shield, Eye } from "lucide-react";
import Link from "next/link";

// Tipo per i nodi dell'albero
export interface LawNode {
  id: string;
  parent_id: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  simplified_content: string | null;
  code: string | null;
  article_number: string | null;
  law_type: string;
  status: string;
  is_active: boolean;
  order_index: number;
  updated_at: string | null;
  children?: LawNode[];
}

export default async function LawsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Load ALL laws (active status = published, is_active = operative)
  const { data: allLaws, error } = await supabase
    .from("laws")
    .select("*")
    .eq("status", "active")
    .order("order_index")
    .order("created_at");

  if (error) {
    console.error("Error loading laws:", error);
  }

  const laws = (allLaws ?? []) as LawNode[];

  // Build hierarchical tree
  function buildTree(items: LawNode[], parentId: string | null): LawNode[] {
    return items
      .filter((l) => l.parent_id === parentId)
      .map((l) => ({
        ...l,
        children: buildTree(items, l.id),
      }));
  }

  const fullTree = buildTree(laws, null);

  // Build operative-only tree (filter to is_active = true)
  const activeLaws = laws.filter((l) => l.is_active);
  const activeTree = buildTree(activeLaws, null);

  // Stats
  const totalCodes = laws.filter((l) => l.law_type === "code").length;
  const totalArticles = laws.filter((l) => l.law_type === "article").length;
  const activeCodes = activeLaws.filter((l) => l.law_type === "code").length;
  const activeArticles = activeLaws.filter((l) => l.law_type === "article").length;

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} isGuest={isGuest} />
      {isGuest && <GuestBanner />}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4 inline-block"
          >
            &larr; Back to the Agora
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-white">
              The Living Codes of Pangea
            </h1>
          </div>
          <p className="text-slate-400">
            The complete body of Pangean law — living codes that are amendable
            and repealable through the democratic process of the Agora. Each law
            has a technical version and a simplified explanation.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
            <a
              href="#living-codes"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-blue-600/20 border border-blue-500/30 text-blue-300 font-medium text-sm transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Living Codes
              <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">
                {totalCodes} codes &middot; {totalArticles} articles
              </span>
            </a>
            <a
              href="#operative"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 font-medium text-sm transition-all"
            >
              <Shield className="w-4 h-4" />
              Operative Laws
              <span className="text-xs bg-slate-700/50 px-2 py-0.5 rounded-full">
                {activeCodes} codes &middot; {activeArticles} articles
              </span>
            </a>
          </div>
        </div>

        {/* Section 1: Living Codes (ALL laws) */}
        <section id="living-codes" className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Living Codes</h2>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
              Complete Collection
            </span>
          </div>
          <div className="card border border-blue-800/20 bg-blue-900/5 p-4 mb-6">
            <p className="text-sm text-slate-400 leading-relaxed">
              <Eye className="w-4 h-4 inline mr-1 text-blue-400" />
              This is the complete collection of all Pangean laws — both those currently
              in force and those that will be progressively activated as the Pangea project
              advances. Inactive laws are shown with a slightly different style. All laws,
              including inactive ones, can be amended, modified, or repealed through the
              Agora&apos;s democratic process.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-4 bg-blue-900/10">
              <Scale className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-white">{totalCodes}</p>
              <p className="text-xs text-slate-500">Codes</p>
            </div>
            <div className="card p-4 bg-pangea-900/10">
              <BookOpen className="w-5 h-5 text-pangea-400 mb-2" />
              <p className="text-2xl font-bold text-white">{totalArticles}</p>
              <p className="text-xs text-slate-500">Articles</p>
            </div>
            <div className="card p-4 bg-green-900/10">
              <Globe className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-white">
                {activeLaws.filter((l) => l.law_type === "code").length}/{totalCodes}
              </p>
              <p className="text-xs text-slate-500">Active Codes</p>
            </div>
          </div>

          {/* Full tree */}
          <div className="space-y-4">
            {fullTree.map((code) => (
              <LawTree key={code.id} node={code} depth={0} showActiveStatus />
            ))}
          </div>
        </section>

        {/* Section 2: Operative Laws (only active) */}
        <section id="operative">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold text-white">Operative Laws</h2>
            <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
              Currently In Force
            </span>
          </div>
          <div className="card border border-green-800/20 bg-green-900/5 p-4 mb-6">
            <p className="text-sm text-slate-400 leading-relaxed">
              <Shield className="w-4 h-4 inline mr-1 text-green-400" />
              Only the laws currently in force. When an inactive law in the Living Codes
              becomes active, it automatically appears here. These are the laws that govern
              the Commonwealth today.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-4 bg-green-900/10">
              <Scale className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-white">{activeCodes}</p>
              <p className="text-xs text-slate-500">Active Codes</p>
            </div>
            <div className="card p-4 bg-green-900/10">
              <BookOpen className="w-5 h-5 text-green-400 mb-2" />
              <p className="text-2xl font-bold text-white">{activeArticles}</p>
              <p className="text-xs text-slate-500">Active Articles</p>
            </div>
          </div>

          <div className="space-y-4">
            {activeTree.map((code) => (
              <LawTree key={code.id} node={code} depth={0} />
            ))}
          </div>

          {activeTree.length === 0 && (
            <div className="text-center py-20 card">
              <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No operative laws yet
              </h3>
              <p className="text-slate-500">
                Operative laws will appear here as the Pangea project advances.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
