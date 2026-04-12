import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/core/AppShell";
import DashboardClient from "@/components/core/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Fetch profile (only if authenticated)
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Count pending delegations for this user
  let pendingDelegations = 0;
  if (user) {
    const { count } = await supabase
      .from("delegations")
      .select("*", { count: "exact", head: true })
      .eq("delegate_id", user.id)
      .eq("status", "pending");
    pendingDelegations = count ?? 0;
  }

  return (
    <AppShell
      section="core"
      sectionName="dashboard"
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <DashboardClient isGuest={isGuest} />
    </AppShell>
  );
}
