"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useLanguage } from "@/components/language-provider";
import { Globe, BookOpen, Users, Vote, FileText, Shield } from "lucide-react";
import Link from "next/link";

interface PlatformStats {
  total_users: number;
  total_proposals: number;
  total_votes: number;
  active_proposals: number;
  closed_proposals: number;
}

export default function AboutPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    total_users: 0,
    total_proposals: 0,
    total_votes: 0,
    active_proposals: 0,
    closed_proposals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setUser(authUser);

        if (authUser) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();
          setProfile(profileData);
        }

        const { data: statsData, error: statsError } = await supabase.rpc("get_platform_stats");
        if (statsError) {
          console.error("Error fetching platform stats:", statsError);
        }
        const stats_result = statsData?.[0] ?? {
          total_users: 0,
          total_proposals: 0,
          total_votes: 0,
          active_proposals: 0,
          closed_proposals: 0,
        };
        setPlatformStats(stats_result);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <AppShell userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} isGuest={!user}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-fg-muted">{t("common.loading")}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} isGuest={!user}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-fg-primary" strokeWidth={1.5} />
            <h1 className="text-4xl font-bold text-fg">Pangea</h1>
          </div>
          <p className="text-xl text-fg-muted max-w-2xl">
            {t("about.subtitle")}
            <br />
            {t("about.proposeDesc")}
          </p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {[
            { label: t("about.citizens"), value: platformStats.total_users, icon: Users },
            { label: t("about.proposals"), value: platformStats.total_proposals, icon: FileText },
            { label: t("about.activeVotes"), value: platformStats.active_proposals, icon: Vote },
            { label: t("about.concluded"), value: platformStats.closed_proposals, icon: Globe },
            { label: t("about.votesCast"), value: platformStats.total_votes, icon: FileText },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card p-4 bg-pangea-900/20 border border-pangea-700/30">
              <Icon className="w-5 h-5 text-fg-primary mb-2" />
              <p className="text-2xl font-bold text-fg">{value.toLocaleString()}</p>
              <p className="text-xs text-fg-muted mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Guide Sections */}
        <div className="space-y-12">
          {/* How it works */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-fg-primary" />
              <h2 className="text-2xl font-semibold text-fg">{t("about.howItWorks")}</h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: t("about.step1Title"),
                  desc: t("about.step1Desc"),
                },
                {
                  title: t("about.step2Title"),
                  desc: t("about.step2Desc"),
                },
                {
                  title: t("about.step3Title"),
                  desc: t("about.step3Desc"),
                },
                {
                  title: t("about.step4Title"),
                  desc: t("about.step4Desc"),
                },
              ].map((step, idx) => (
                <div key={idx} className="card p-6 bg-theme-base border border-theme/30">
                  <h3 className="text-lg font-semibold text-fg mb-2">{step.title}</h3>
                  <p className="text-fg-muted">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Principles */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-fg-primary" />
              <h2 className="text-2xl font-semibold text-fg">{t("about.principles")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: t("about.principle1Title"),
                  desc: t("about.principle1Desc"),
                },
                {
                  title: t("about.principle2Title"),
                  desc: t("about.principle2Desc"),
                },
                {
                  title: t("about.principle3Title"),
                  desc: t("about.principle3Desc"),
                },
                {
                  title: t("about.principle4Title"),
                  desc: t("about.principle4Desc"),
                },
              ].map((principle, idx) => (
                <div key={idx} className="card p-6 bg-success-tint border border-theme">
                  <h3 className="font-semibold text-fg-success mb-2">{principle.title}</h3>
                  <p className="text-fg-muted text-sm">{principle.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-semibold text-fg mb-6">{t("about.faq")}</h2>
            <div className="space-y-4">
              {[
                {
                  q: t("about.faq1Q"),
                  a: t("about.faq1A"),
                },
                {
                  q: t("about.faq2Q"),
                  a: t("about.faq2A"),
                },
                {
                  q: t("about.faq3Q"),
                  a: t("about.faq3A"),
                },
                {
                  q: t("about.faq4Q"),
                  a: t("about.faq4A"),
                },
              ].map((item, idx) => (
                <div key={idx} className="card p-4 bg-theme-base border border-theme/30">
                  <p className="font-semibold text-fg mb-2">{item.q}</p>
                  <p className="text-fg-muted text-sm">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="card p-8 bg-pangea-900/30 border border-pangea-700/30 text-center">
            <h3 className="text-2xl font-semibold text-fg mb-4">{t("about.readyToParticipate")}</h3>
            <p className="text-fg-muted mb-6">
              {t("about.joinCitizens")}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {user ? (
                <>
                  <Link href="/dashboard" className="btn-primary">
                    {t("common.backToDashboard")}
                  </Link>
                  <Link href="/proposals/new" className="btn-secondary">
                    {t("about.proposeALaw")}
                  </Link>
                </>
              ) : (
                <Link href="/auth" className="btn-primary">
                  {t("about.registerNow")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
