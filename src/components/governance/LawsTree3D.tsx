"use client";

/**
 * LawsTree3D — 3D visualization of the Pangea laws tree.
 *
 * Converts LawNode[] → PlatformTreeNode[] and renders via the generic TreeViewer3D.
 * Top-level codes become L1 nodes; their direct children become L2 nodes.
 *
 * Raw law titles are passed as `labelKey` / `descKey`.
 * Because t() falls back to the key path when no translation is found,
 * actual title strings display correctly with no i18n key required.
 */

import { useMemo } from "react";
import { BookOpen } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import type { PlatformTreeNode } from "@/lib/platform-nodes";
import TreeViewer3D from "@/components/governance/TreeViewer3D";
import type { LawNode } from "@/app/laws/page";

/* ═══════════════════════════════════════════════════════
   Color palette — amber/gold brand matching Laws section
   ═══════════════════════════════════════════════════════ */

const LAW_TYPE_STYLE: Record<
  string,
  { color: string; colorLight: string; glow: string; iconKey: string }
> = {
  code:    { color: "#d97706", colorLight: "#f59e0b", glow: "rgba(217,119,6,0.25)",  iconKey: "book"     },
  book:    { color: "#b45309", colorLight: "#d97706", glow: "rgba(180,83,9,0.25)",   iconKey: "book"     },
  title:   { color: "#92400e", colorLight: "#b45309", glow: "rgba(146,64,14,0.25)",  iconKey: "fileText" },
  chapter: { color: "#78350f", colorLight: "#92400e", glow: "rgba(120,53,15,0.25)",  iconKey: "fileText" },
  section: { color: "#ea580c", colorLight: "#fb923c", glow: "rgba(234,88,12,0.25)",  iconKey: "fileText" },
  article: { color: "#c2410c", colorLight: "#f97316", glow: "rgba(194,65,12,0.25)",  iconKey: "scale"    },
};

const DEFAULT_STYLE = LAW_TYPE_STYLE.code;

function lawToTreeNode(law: LawNode): PlatformTreeNode {
  const style = LAW_TYPE_STYLE[law.law_type] ?? DEFAULT_STYLE;
  return {
    id: law.id,
    href: `/laws#${law.id}`,
    labelKey: law.title,         // raw text — t() falls back to the string itself
    iconKey: style.iconKey,
    color: style.color,
    colorLight: style.colorLight,
    glow: style.glow,
    descKey: law.summary ?? "",  // raw text — t() falls back to the string itself
    actionKey: "tree.open",
    children: law.children?.map(lawToTreeNode),
  };
}

/* ═══════════════════════════════════════════════════════
   LawsTree3D — exported component
   ═══════════════════════════════════════════════════════ */

interface LawsTree3DProps {
  /** Top-level law codes (with nested children) */
  laws: LawNode[];
  isGuest?: boolean;
}

export default function LawsTree3D({ laws, isGuest = false }: LawsTree3DProps) {
  const { t } = useLanguage();

  const nodes = useMemo<PlatformTreeNode[]>(
    () => laws.map(lawToTreeNode),
    [laws],
  );

  return (
    <>
      <TreeViewer3D
        nodes={nodes}
        isGuest={isGuest}
        initialRotX={-15}
        centerContent={(visible) => (
          <div className="relative flex flex-col items-center">
            {/* Pulse ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: 100,
                height: 100,
                background:
                  "radial-gradient(circle, rgba(217,119,6,0.15) 0%, transparent 70%)",
                animation: visible
                  ? "lawsPulse 3s ease-in-out infinite"
                  : "none",
              }}
            />

            {/* Book orb */}
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center border-2"
              style={{
                background:
                  "linear-gradient(135deg, #d97706, #b45309, #92400e)",
                borderColor: "rgba(217,119,6,0.35)",
                boxShadow:
                  "0 0 40px rgba(217,119,6,0.3), 0 8px 32px rgba(0,0,0,0.2)",
              }}
            >
              <BookOpen
                className="w-10 h-10 text-white"
                strokeWidth={1.5}
              />
            </div>

            {/* Title */}
            <h2
              className="text-base font-extrabold tracking-tight mt-1"
              style={{ color: "var(--foreground)" }}
            >
              {t("nav.laws")}
            </h2>

            {/* Subtitle */}
            <p
              className="text-[9px] text-center max-w-[130px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {t("laws.title")}
            </p>
          </div>
        )}
      />

      {/* Laws tree pulse animation */}
      <style jsx global>{`
        @keyframes lawsPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
