import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import LawsPageClient from "@/components/LawsPageClient";
import LawsPageHeader from "@/components/LawsPageHeader";
import { BookOpen } from "lucide-react";
import Link from "next/link";

// Revalidate every 5 minutes — laws don't change frequently
export const revalidate = 300;

// Type for tree nodes
export interface LawNode {
  id: string;
  uid?: string | null;
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

interface Props {
  searchParams: Promise<{ group?: string }>;
}

export default async function LawsPage({ searchParams }: Props) {
  const params = await searchParams;
  const groupFilter = params.group || null;
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

  // T09: Load laws, optionally filtered by group
  let lawsQuery = supabase
    .from("laws")
    .select("*")
    .eq("status", "active")
    .order("order_index")
    .order("created_at");

  if (groupFilter) {
    lawsQuery = lawsQuery.or(`group_id.eq.${groupFilter},jurisdiction_id.eq.${groupFilter}`);
  }

  const { data: allLaws, error } = await lawsQuery;

  if (error) {
    console.error("Error loading laws:", error);
  }

  const laws = (allLaws ?? []) as LawNode[];

  // Build hierarchical tree with circular reference protection
  function buildTree(items: LawNode[], parentId: string | null, visited = new Set<string>()): LawNode[] {
    return items
      .filter((l) => l.parent_id === parentId && !visited.has(l.id))
      .map((l) => {
        visited.add(l.id);
        return {
          ...l,
          children: buildTree(items, l.id, visited),
        };
      });
  }

  const fullTree = buildTree(laws, null);

  // Build operative-only tree: include active laws AND their ancestors
  // so the tree structure stays intact (parent codes/sections shown even if
  // they are not themselves "active", as long as they have active descendants)
  const activeIds = new Set(laws.filter((l) => l.is_active).map((l) => l.id));

  // Walk up from every active law to include all ancestors
  const idsToInclude = new Set(activeIds);
  const lawByIdMap: Record<string, LawNode> = {};
  laws.forEach((l) => { lawByIdMap[l.id] = l; });
  const activeIdArray = laws.filter((l) => l.is_active).map((l) => l.id);
  activeIdArray.forEach((id) => {
    let current = lawByIdMap[id];
    while (current?.parent_id) {
      if (idsToInclude.has(current.parent_id)) break;
      idsToInclude.add(current.parent_id);
      current = lawByIdMap[current.parent_id];
    }
  });

  const operativeLaws = laws.filter((l) => idsToInclude.has(l.id));
  const activeTree = buildTree(operativeLaws, null);

  // Stats — count only truly active laws (is_active = true)
  const activeLaws = laws.filter((l) => l.is_active);
  const totalCodes = laws.filter((l) => l.law_type === "code").length;
  const totalArticles = laws.filter((l) => l.law_type === "article").length;
  const activeCodes = activeLaws.filter((l) => l.law_type === "code").length;
  const activeArticles = activeLaws.filter((l) => l.law_type === "article").length;

  // T09: Resolve group info for filter banner
  let groupInfo: { id: string; name: string; emoji: string } | null = null;
  if (groupFilter) {
    const { data: g } = await supabase.from("groups").select("id, name, logo_emoji").eq("id", groupFilter).single();
    if (g) groupInfo = { id: g.id, name: g.name, emoji: g.logo_emoji };
  }

  return (
    <AppShell section="core" sectionName="laws" userEmail={user?.email} isGuest={isGuest}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LawsPageHeader />

        <LawsPageClient
          fullTree={fullTree}
          activeTree={activeTree}
          totalCodes={totalCodes}
          totalArticles={totalArticles}
          activeCodes={activeCodes}
          activeArticles={activeArticles}
          isAdmin={isAdmin}
          isGuest={isGuest}
          groupFilter={groupInfo}
        />
      </div>
    </AppShell>
  );
}
