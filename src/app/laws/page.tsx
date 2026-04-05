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
        <LawsPageHeader />

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
