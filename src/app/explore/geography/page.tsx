"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/core/AppShell";
import GeographyDirectory, { GeoArea, LinkedGroup } from "@/components/governance/GeographyDirectory";
import { Globe, Info } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import type { Profile } from "@/lib/types";

function GeographyPageInner() {
  const { t } = useLanguage();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const areaId = searchParams.get("area");

  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);

  const [currentArea, setCurrentArea] = useState<GeoArea | null>(null);
  const [parentArea, setParentArea] = useState<GeoArea | null>(null);
  const [children, setChildren] = useState<GeoArea[]>([]);
  const [linkedGroups, setLinkedGroups] = useState<LinkedGroup[]>([]);
  const [continents, setContinents] = useState<GeoArea[]>([]);
  const [worldArea, setWorldArea] = useState<GeoArea | null>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setIsGuest(!u);
      if (u) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .maybeSingle()
          .then(({ data }) => setProfile(data as Profile | null));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load geography data
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      if (!areaId) {
        // Top level: load World + Continents
        const { data: topAreas } = await supabase
          .from("geographic_areas")
          .select("id, name, level, emoji_flag, iso_alpha2, description")
          .in("level", ["world", "continent"])
          .order("level", { ascending: false })
          .order("name");

        const world = topAreas?.find((a) => a.level === "world") ?? null;
        const conts = topAreas?.filter((a) => a.level === "continent") ?? [];

        // For each continent, count sub-areas and linked groups
        const enrichedContinents = await Promise.all(
          conts.map(async (c) => {
            const [{ count: childCount }, { count: groupCount }] = await Promise.all([
              supabase
                .from("geographic_areas")
                .select("id", { count: "exact", head: true })
                .eq("parent_id", c.id),
              supabase
                .from("groups")
                .select("id", { count: "exact", head: true })
                .eq("geographic_area_id", c.id),
            ]);
            return { ...c, child_count: childCount ?? 0, group_count: groupCount ?? 0 };
          })
        );

        setWorldArea(world);
        setContinents(enrichedContinents);
        setCurrentArea(null);
        setParentArea(null);
        setChildren([]);
        setLinkedGroups([]);
      } else {
        // Drill-down: load this area + its children + linked groups
        const [{ data: area }, { data: childAreas }, { data: groups }] = await Promise.all([
          supabase
            .from("geographic_areas")
            .select("id, name, level, emoji_flag, iso_alpha2, description, parent_id")
            .eq("id", areaId)
            .maybeSingle(),
          supabase
            .from("geographic_areas")
            .select("id, name, level, emoji_flag, iso_alpha2, description")
            .eq("parent_id", areaId)
            .order("name"),
          supabase
            .from("groups")
            .select("id, uid, name, logo_emoji, group_type")
            .eq("geographic_area_id", areaId)
            .order("name"),
        ]);

        if (!area) {
          setLoading(false);
          return;
        }

        setCurrentArea(area as GeoArea);
        setLinkedGroups((groups ?? []) as LinkedGroup[]);

        // Enrich child areas with counts
        const enrichedChildren = await Promise.all(
          (childAreas ?? []).map(async (child) => {
            const [{ count: childCount }, { count: groupCount }] = await Promise.all([
              supabase
                .from("geographic_areas")
                .select("id", { count: "exact", head: true })
                .eq("parent_id", child.id),
              supabase
                .from("groups")
                .select("id", { count: "exact", head: true })
                .eq("geographic_area_id", child.id),
            ]);
            return { ...child, child_count: childCount ?? 0, group_count: groupCount ?? 0 };
          })
        );
        setChildren(enrichedChildren);

        // Load parent if exists
        if ((area as GeoArea & { parent_id?: string }).parent_id) {
          const parentId = (area as GeoArea & { parent_id?: string }).parent_id!;
          const { data: parent } = await supabase
            .from("geographic_areas")
            .select("id, name, level, emoji_flag, iso_alpha2, description")
            .eq("id", parentId)
            .maybeSingle();
          setParentArea(parent as GeoArea | null);
        } else {
          setParentArea(null);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [areaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayAreas = areaId ? children : continents;
  const pageTitle = currentArea
    ? `${currentArea.emoji_flag ?? "🌐"} ${currentArea.name}`
    : t("geography.title");

  return (
    <AppShell
      userEmail={user ? undefined : null}
      userName={profile?.full_name ?? null}
      userRole={profile?.role}
      isGuest={isGuest}
    >
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className="p-3 rounded-xl shrink-0"
            style={{ backgroundColor: "color-mix(in srgb, #0ea5e9 15%, transparent)" }}
          >
            <Globe className="w-6 h-6" style={{ color: "#0ea5e9" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-fg">{pageTitle}</h1>
            <p className="text-sm opacity-60 mt-1">
              {currentArea
                ? t(("geography.level." + currentArea.level) as "geography.level.world")
                : t("geography.subtitle")}
            </p>
          </div>
        </div>

        {/* World stats row (top level only) */}
        {!areaId && worldArea && (
          <div
            className="rounded-xl p-4 border flex items-start gap-3"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />
            <p className="text-sm opacity-70">
              <strong>{t("geography.exampleTitle")}:</strong>{" "}
              {t("geography.exampleDesc")}
            </p>
          </div>
        )}

        {/* Main directory */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <GeographyDirectory
            areas={displayAreas}
            linkedGroups={linkedGroups}
            currentArea={currentArea}
            parentArea={parentArea}
            searchable={displayAreas.length > 8}
          />
        )}
      </div>
    </AppShell>
  );
}

export default function GeographyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <GeographyPageInner />
    </Suspense>
  );
}
