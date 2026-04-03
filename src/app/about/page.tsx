import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import { Globe, BookOpen, Users, Vote, FileText, Shield } from "lucide-react";
import Link from "next/link";

export default async function AboutPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id || "")
    .single()
    .catch(() => ({ data: null }));

  // Global statistics
  const stats = await supabase.rpc("get_platform_stats");
  const platformStats = stats.data?.[0] ?? {
    total_users: 0,
    total_proposals: 0,
    total_votes: 0,
    active_proposals: 0,
    closed_proposals: 0,
  };

  return (
    <div className="min-h-screen bg-[#0c1220]">
      {user && <Navbar userEmail={user.email} userName={profile?.full_name} />}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-pangea-400" strokeWidth={1.5} />
            <h1 className="text-4xl font-bold text-white">Agora Pangea</h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl">
            The digital democracy platform of the Global Democratic Republic of Pangea.
            Propose laws, debate and vote on legislative proposals in a transparent and secure environment.
          </p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {[
            { label: "Citizens", value: platformStats.total_users, icon: Users },
            { label: "Proposals", value: platformStats.total_proposals, icon: FileText },
            { label: "Active Votes", value: platformStats.active_proposals, icon: Vote },
            { label: "Concluded", value: platformStats.closed_proposals, icon: Globe },
            { label: "Votes Cast", value: platformStats.total_votes, icon: FileText },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card p-4 bg-pangea-900/20 border border-pangea-700/30">
              <Icon className="w-5 h-5 text-pangea-400 mb-2" />
              <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Guide Sections */}
        <div className="space-y-12">
          {/* How it works */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-pangea-400" />
              <h2 className="text-2xl font-semibold text-white">How It Works</h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "1. Register",
                  desc: "Create your citizen profile on Agora. Registration is free and requires GDPR consent to protect your privacy.",
                },
                {
                  title: "2. Explore Proposals",
                  desc: "Browse the Agora to see proposals in active voting. Each proposal shows the legislative context, proposed articles, and real-time results.",
                },
                {
                  title: "3. Propose Laws",
                  desc: "Create a new legislative proposal. Describe the problem, context, and the legal provision you propose. Your drafts remain private until you publish them.",
                },
                {
                  title: "4. Vote and Participate",
                  desc: "Enter the Voting Booth and vote on active proposals. One citizen, one vote. Results are aggregated and visible in real time.",
                },
              ].map((step, idx) => (
                <div key={idx} className="card p-6 bg-slate-900/30 border border-slate-700/30">
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Principles */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-pangea-400" />
              <h2 className="text-2xl font-semibold text-white">Our Principles</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "One Citizen, One Vote",
                  desc: "Civic security is enforced by PostgreSQL relational constraints. No one can vote twice on the same proposal.",
                },
                {
                  title: "Privacy by Design",
                  desc: "Your votes are private. Row-Level Security policies prevent access to personal data. Only aggregated results are visible.",
                },
                {
                  title: "Full Transparency",
                  desc: "All active proposals and deliberative outcomes are public. Anyone can see the legislative context and aggregated votes.",
                },
                {
                  title: "GDPR Compliant",
                  desc: "Explicit consent at registration, right to be forgotten, data minimization. Digital democracy respects your rights.",
                },
              ].map((principle, idx) => (
                <div key={idx} className="card p-6 bg-green-900/20 border border-green-700/30">
                  <h3 className="font-semibold text-green-300 mb-2">{principle.title}</h3>
                  <p className="text-slate-400 text-sm">{principle.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: "How do I change my profile?",
                  a: "From the dashboard, click on your name in the top right. You can edit your full name and biography.",
                },
                {
                  q: "Can I edit a proposal after publishing it?",
                  a: "No. Published proposals are immutable to ensure the integrity of the deliberative process. You can create a new proposal if needed.",
                },
                {
                  q: "How long do I have to vote on a proposal?",
                  a: "It depends on the proposal's deadline. Each proposal displays its expiration date. After that date, it moves to the archive.",
                },
                {
                  q: "Is my data safe?",
                  a: "Yes. We use Supabase with PostgreSQL, Row-Level Security, and encryption. Sensitive data is never stored in plaintext.",
                },
              ].map((item, idx) => (
                <div key={idx} className="card p-4 bg-slate-900/30 border border-slate-700/30">
                  <p className="font-semibold text-white mb-2">{item.q}</p>
                  <p className="text-slate-400 text-sm">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="card p-8 bg-pangea-900/30 border border-pangea-700/30 text-center">
            <h3 className="text-2xl font-semibold text-white mb-4">Ready to Participate?</h3>
            <p className="text-slate-400 mb-6">
              Join the citizens of Pangea and shape the future of global digital democracy.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {user ? (
                <>
                  <Link href="/dashboard" className="btn-primary">
                    Back to the Agora
                  </Link>
                  <Link href="/proposals/new" className="btn-secondary">
                    Propose a Law
                  </Link>
                </>
              ) : (
                <Link href="/auth" className="btn-primary">
                  Register Now
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
