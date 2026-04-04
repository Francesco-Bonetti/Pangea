import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import FeedClient from "@/components/FeedClient";
import { Rss } from "lucide-react";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Pending delegations count
  const { count: pendingDelegations } = await supabase
    .from("delegations")
    .select("*", { count: "exact", head: true })
    .eq("delegate_id", user.id)
    .eq("status", "pending");

  return (
    <AppShell userEmail={user.email} userName={profile?.full_name} userRole={profile?.role} pendingDelegations={pendingDelegations ?? 0}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Rss className="w-6 h-6 text-fg-primary" />
          <h1 className="text-2xl font-bold text-fg">Your Feed</h1>
        </div>

        <FeedClient userId={user.id} />
      </div>
    </AppShell>
  );
}
