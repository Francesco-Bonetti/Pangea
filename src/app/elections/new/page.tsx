import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import NewElectionForm from "@/components/NewElectionForm";

export const metadata = {
  title: "Create Election — Agora Pangea",
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar
        userEmail={user.email}
        userName={profile?.full_name}
        userRole={userRole}
        pendingDelegations={count ?? 0}
      />
      <NewElectionForm />
    </div>
  );
}
