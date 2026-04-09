"use client";

import { useState } from "react";
import { Globe, Sparkles, Layers } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PLATFORM_TREE, type PlatformTreeNode } from "@/lib/platform-nodes";
import TreeViewer3D from "@/components/TreeViewer3D";
import TreeViewer2D from "@/components/TreeViewer2D";

/* ═══════════════════════════════════════════════════════════
   PangeaTree — Main dashboard tree (2D default, 3D toggle)
   ─────────────────────────────────────────────────────────
   Wraps the generic TreeViewer2D/3D with Pangea-specific
   root orb and platform tree data.
   ═══════════════════════════════════════════════════════════ */

interface PangeaTreeProps {
  isGuest: boolean;
  /** Override tree data — defaults to PLATFORM_TREE */
  nodes?: PlatformTreeNode[];
}

export default function PangeaTree({ isGuest, nodes }: PangeaTreeProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<"2d" | "3d">("2d");
  const treeNodes = nodes ?? PLATFORM_TREE;

  /* ── Root orb (shared by 2D and 3D views) ────────── */

  const renderRootOrb = (visible: boolean = true) => (
    <div
      className="relative flex flex-col items-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.6)",
        transition:
          "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Orbital ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 72,
          height: 72,
          top: "50%",
          left: "50%",
          marginTop: -36 - 10, // centered on globe, offset for text below
          marginLeft: -36,
          border: "1px solid rgba(37,99,235,0.1)",
          animation: visible
            ? "orbitalSpin 10s linear infinite"
            : "none",
        }}
      >
        {/* Orbiting dot */}
        <div
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            top: -3,
            left: "50%",
            marginLeft: -3,
            background:
              "linear-gradient(135deg, #3b82f6, #60a5fa)",
            boxShadow: "0 0 6px rgba(59,130,246,0.5)",
          }}
        />
      </div>

      {/* Subtle glow pulse behind globe */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 80,
          height: 80,
          top: "50%",
          left: "50%",
          marginTop: -40 - 10,
          marginLeft: -40,
          background:
            "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)",
          animation: visible
            ? "globePulse 3.5s ease-in-out infinite"
            : "none",
        }}
      />

      {/* Globe */}
      <div
        className="relative w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
          boxShadow:
            "0 0 28px rgba(37,99,235,0.22), 0 4px 16px rgba(0,0,0,0.12)",
        }}
      >
        <Globe
          className="w-7 h-7 text-white"
          strokeWidth={1.5}
        />
      </div>

      {/* Label */}
      <h1
        className="text-xs font-extrabold tracking-tight mt-1.5"
        style={{ color: "var(--foreground)" }}
      >
        PANGEA
      </h1>
      <p
        className="text-[8px] text-center max-w-[100px] leading-tight"
        style={{ color: "var(--muted-foreground)" }}
      >
        {t("tree.subtitle")}
      </p>

      {/* Welcome badge */}
      {!isGuest && (
        <div
          className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full"
          style={{
            fontSize: 7,
            backgroundColor:
              "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--primary)",
          }}
        >
          <Sparkles style={{ width: 7, height: 7 }} />
          {t("tree.welcomeBack")}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* View toggle pill */}
      <div className="flex justify-end mb-2">
        <div
          className="inline-flex items-center rounded-full p-0.5 border"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <button
            onClick={() => setView("2d")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
            style={{
              backgroundColor:
                view === "2d"
                  ? "var(--primary)"
                  : "transparent",
              color:
                view === "2d"
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            <Layers className="w-3 h-3" />
            2D
          </button>
          <button
            onClick={() => setView("3d")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200"
            style={{
              backgroundColor:
                view === "3d"
                  ? "var(--primary)"
                  : "transparent",
              color:
                view === "3d"
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            <Globe className="w-3 h-3" />
            3D
          </button>
        </div>
      </div>

      {/* Active view */}
      {view === "2d" ? (
        <TreeViewer2D
          nodes={treeNodes}
          isGuest={isGuest}
          onToggle3D={() => setView("3d")}
          rootContent={() => renderRootOrb(true)}
        />
      ) : (
        <TreeViewer3D
          nodes={treeNodes}
          isGuest={isGuest}
          initialRotX={-12}
          initialRotY={25}
          centerContent={(visible) => renderRootOrb(visible)}
        />
      )}

      {/* Global animations */}
      <style jsx global>{`
        @keyframes orbitalSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes globePulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.08;
          }
          50% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
