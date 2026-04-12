import { createClient } from "@/lib/supabase/server";
import { canModerate } from "@/lib/permissions";
import AppShell from "@/components/AppShell";
import LawDetailClient from "@/components/LawDetailClient";
import Link from "next/link";
import { FileText } from "lucide-react";
import type { LawNode } from "@/app/laws/page";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface BreadcrumbRow {
  id: string;
  title: string;
  article_number: string | null;
  law_type: string;
  parent_id: string | null;
}

export default async function LawDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user;

  // Fetch the law
  const { data: rawLaw } = await supabase
    .from("laws")
    .select("*")
    .eq("id", id)
    .single();
  const law = rawLaw as LawNode | null;

  if (!law) {
    return (
      <AppShell section="core" sectionName="laws" userEmail={user?.email} isGuest={isGuest}>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <FileText className="w-16 h-16 text-fg-muted mx-auto mb-4" strokeWidth={1} />
          <h2 className="text-xl text-fg mb-2">Law not found</h2>
          <Link href="/laws" className="text-blue-400 hover:text-blue-300">
            &larr; Back to Living Codes
          </Link>
        </div>
      </AppShell>
    );
  }

  // Build breadcrumb by walking up the parent chain
  const breadcrumb: BreadcrumbRow[] = [];
  {
    let currentId: string | null = id;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const { data: row } = await supabase
        .from("laws")
        .select("id, title, article_number, law_type, parent_id")
        .eq("id", currentId)
        .single();
      if (!row) break;
      const typed = row as BreadcrumbRow;
      breadcrumb.unshift(typed);
      currentId = typed.parent_id;
    }
  }

  // Fetch children (select * to match LawNode type)
  const { data: rawChildren } = await supabase
    .from("laws")
    .select("*")
    .eq("parent_id", id)
    .eq("status", "active")
    .order("order_index")
    .order("created_at");
  const children = (rawChildren ?? []) as LawNode[];

  // Fetch siblings for prev/next navigation
  const parentId = law.parent_id;
  let prevLaw: { id: string; title: string; article_number: string | null } | null = null;
  let nextLaw: { id: string; title: string; article_number: string | null } | null = null;

  if (parentId) {
    const { data: siblings } = await supabase
      .from("laws")
      .select("id, title, article_number, order_index")
      .eq("parent_id", parentId)
      .eq("status", "active")
      .order("order_index")
      .order("created_at");

    if (siblings) {
      const idx = siblings.findIndex((s) => s.id === id);
      if (idx > 0) prevLaw = siblings[idx - 1];
      if (idx < siblings.length - 1) nextLaw = siblings[idx + 1];
    }
  }

  // Check admin
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = canModerate(profile?.role);
  }

  // Check bootstrap lock
  const hasBootstrapLock = law.bootstrap_lock_threshold != null && law.bootstrap_lock_threshold > 0;

  return (
    <AppShell section="core" sectionName="laws" userEmail={user?.email} isGuest={isGuest}>
      <LawDetailClient
        law={law}
        breadcrumb={breadcrumb}
        children={children}
        prevLaw={prevLaw}
        nextLaw={nextLaw}
        isAdmin={isAdmin}
        isGuest={isGuest}
        hasBootstrapLock={hasBootstrapLock}
      />
    </AppShell>
  );
}
