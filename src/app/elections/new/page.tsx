import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import NewElectionForm from "@/components/NewElectionForm";

export const metadata = {
  title: "Create Election — Pangea",
};

export default async function NewElectionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role ?? "citizen";
  if (userRole !== "admin" && userRole !== "moderator") {
    redirect("/elections");
  }

  const { count } = await supabase
    .from("delegations")
    .select("*", { count: "exact", head: true })
    .eq("delegate_id", user.id)
    .eq("status", "pending");

  return (
    <AppShell
      section="core"
      sectionName="elections"
      userEmail={user.email}
      userName={profile?.full_name}
      userRole={userRole}
      pendingDelegations={count ?? 0}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <NewElectionForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
