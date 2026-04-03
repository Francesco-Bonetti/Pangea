import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { History, ArrowLeft, Clock, RotateCcw, FileText } from "lucide-react";
import LawHistoryClient from "@/components/LawHistoryClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LawHistoryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Get the law
  const { data: law } = await supabase
    .from("laws")
    .select("*")
    .eq("id", id)
    .single();

  if (!law) {
    return (
      <div className="min-h-screen bg-[#0c1220]">
        <Navbar userEmail={user?.email} isGuest={isGuest} />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl text-slate-300 mb-2">Law not found</h2>
          <Link href="/laws" className="text-blue-400 hover:text-blue-300">
            &larr; Back to Living Codes
          </Link>
        </main>
      </div>
    );
  }

  // Get history
  const { data: history } = await supabase
    .from("law_history")
    .select("*")
    .eq("law_id", id)
    .order("version_number", { ascending: false });

  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} isGuest={isGuest} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/laws"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Living Codes
        </Link>

        <div className="flex items-center gap-3 mb-2 mt-4">
          <History className="w-7 h-7 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Version History</h1>
        </div>

        {/* Current law info */}
        <div className="card border border-slate-700/30 p-4 mb-8">
          <div className="flex items-center gap-2 mb-1">
            {law.article_number && (
              <span className="text-xs font-medium text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                {law.article_number}
              </span>
            )}
            <h2 className="text-lg font-semibold text-white">{law.title}</h2>
          </div>
          {law.summary && (
            <p className="text-sm text-slate-400">{law.summary}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className="w-3 h-3 text-slate-600" />
            <span className="text-xs text-slate-600">
              Current version &middot; Last updated:{" "}
              {new Date(law.updated_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* History list */}
        {history && history.length > 0 ? (
          <LawHistoryClient
            history={history}
            lawId={id}
            isAdmin={isAdmin}
            currentTitle={law.title}
            currentContent={law.content}
          />
        ) : (
          <div className="text-center py-16 card">
            <History
              className="w-12 h-12 text-slate-600 mx-auto mb-3"
              strokeWidth={1}
            />
            <h3 className="text-lg font-semibold text-slate-300 mb-1">
              No history yet
            </h3>
            <p className="text-sm text-slate-500">
              Changes to this law will be tracked and shown here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
