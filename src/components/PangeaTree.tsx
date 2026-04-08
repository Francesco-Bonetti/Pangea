"use client";

/**
 * PangeaTree — Pangea-specific instance of TreeViewer3D.
 *
 * Wraps the generic TreeViewer3D with:
 *  - Default data: PLATFORM_TREE (platform navigation tree)
 *  - Custom center: animated globe + PANGEA title + welcome badge
 *
 * Accepts optional `nodes` prop to override the default dataset
 * (e.g. for embedding a different tree on another page).
 */

import { Globe, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PLATFORM_TREE, type PlatformTreeNode } from "@/lib/platform-nodes";
import TreeViewer3D from "./TreeViewer3D";

interface PangeaTreeProps {
  isGuest: boolean;
  /** Override default PLATFORM_TREE with any PlatformTreeNode[] */
  nodes?: PlatformTreeNode[];
}

export default function PangeaTree({
  isGuest,
  nodes = PLATFORM_TREE,
}: PangeaTreeProps) {
  const { t } = useLanguage();

  return (
    <>
      <TreeViewer3D
        nodes={nodes}
        isGuest={isGuest}
        centerContent={(visible) => (
          <div className="relative flex flex-col items-center">
            {/* Pulse ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: 104,
                height: 104,
                background:
                  "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
                animation: visible
                  ? "globePulse 3s ease-in-out infinite"
                  : "none",
              }}
            />

            {/* Globe orb */}
            <div
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2"
              style={{
                background:
                  "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
                borderColor: "rgba(59,130,246,0.3)",
                boxShadow:
                  "0 0 40px rgba(37,99,235,0.3), 0 8px 32px rgba(0,0,0,0.2)",
              }}
            >
              <Globe
                className="w-10 h-10 sm:w-12 sm:h-12 text-white"
                strokeWidth={1.5}
              />
            </div>

            {/* Title */}
            <h1
              className="text-base sm:text-lg font-extrabold tracking-tight mt-1"
              style={{ color: "var(--foreground)" }}
            >
              PANGEA
            </h1>

            {/* Subtitle */}
            <p
              className="text-[9px] sm:text-[10px] text-center max-w-[140px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {t("tree.subtitle")}
            </p>

            {/* Welcome badge (logged-in users) */}
            {!isGuest && (
              <div
                className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full"
                style={{
                  fontSize: 8,
                  backgroundColor:
                    "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "var(--primary)",
                }}
              >
                <Sparkles style={{ width: 8, height: 8 }} />
                {t("tree.welcomeBack")}
              </div>
            )}
          </div>
        )}
      />

      {/* Globe pulse animation — scoped to PangeaTree */}
      <style jsx global>{`
        @keyframes globePulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.12;
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
