import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import LawsPageClient from "@/components/LawsPageClient";
import { BookOpen } from "lucide-react";
import Link from "next/link";

// Type for tree nodes
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

  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin" || profile?.role === "moderator";
  }

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
    <AppShell userEmail={user?.email} isGuest={isGuest}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4 inline-block"
          >
            &larr; Back to the Agora
          </Link>
          <div className="flex items-center gap-3 mb-2 overflow-hidden">
            <BookOpen className="w-8 h-8 text-blue-400 shrink-0" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-white truncate">
              The Living Codes of Pangea
            </h1>
          </div>
          <p className="text-slate-400">
            The complete body of Pangean law — living codes that are amendable
            and repealable through the democratic process of the Agora. Each law
            has a technical version and a simplified explanation.
          </p>
        </div>

        <LawsPageClient
          fullTree={fullTree}
          activeTree={activeTree}
          totalCodes={totalCodes}
          totalArticles={totalArticles}
          activeCodes={activeCodes}
          activeArticles={activeArticles}
          isAdmin={isAdmin}
        />
      </div>
    </AppShell>
  );
}
