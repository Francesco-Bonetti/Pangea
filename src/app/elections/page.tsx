import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ElectionsClient from "@/components/ElectionsClient";

export const metadata = {
  title: "Elections — Pangea",
  description: "Vote for candidates, run for office, and shape the governance of Pangea.",
};

export default async function ElectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Component: elections/page.tsx has minimal overflow risks as it delegates to ElectionsClient
  // No direct flex headers with text overflow in this server component

  let userName: string | null = null;
  let userEmail: string | null = null;
  let userRole = "citizen";
  let pendingDelegations = 0;
  const isGuest = !user;

  if (user) {
    userEmail = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    userName = profile?.full_name ?? null;
    userRole = profile?.role ?? "citizen";

    const { count } = await supabase
      .from("delegations")
      .select("*", { count: "exact", head: true })
      .eq("delegate_id", user.id)
      .eq("status", "pending");

    pendingDelegations = count ?? 0;
  }

  const isAdmin = userRole === "admin" || userRole === "moderator";

  return (
    <AppShell
      userEmail={userEmail}
      userName={userName}
      userRole={userRole}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <ElectionsClient isAdmin={isAdmin} />
    </AppShell>
  );
}
