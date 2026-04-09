"use client";

import { useState } from "react";
import { Globe, Sparkles, Layers } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PLATFORM_TREE, type PlatformTreeNode } from "@/lib/platform-nodes";
import TreeViewer3D from "@/components/TreeViewer3D";
import TreeViewer2D from "@/components/TreeViewer2D";

/* ═══════════════════════════════════════════════════════════
   PangeaTree — Main dashboard tree (2D default, 3D toggle)
   ═══════════════════════════════════════════════════════════ */

interface PangeaTreeProps {
  isGuest: boolean;
  nodes?: PlatformTreeNode[];
}

export default function PangeaTree({ isGuest, nodes }: PangeaTreeProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<"2d" | "3d">("2d");
  const treeNodes = nodes ?? PLATFORM_TREE;

  /* ── Root orb — big, readable, animated ────────────── */

  const renderRootOrb = (visible: boolean = true) => (
    <div
      className="relative flex flex-col items-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.5)",
        transition:
          "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Orbital ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 100,
          height: 100,
          top: "50%",
          left: "50%",
          marginTop: -50 - 16,
          marginLeft: -50,
          border: "1.5px solid rgba(37,99,235,0.12)",
          animation: visible
            ? "orbitalSpin 12s linear infinite"
            : "none",
        }}
      >
        <div
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{
            top: -5,
            left: "50%",
            marginLeft: -5,
            background:
              "linear-gradient(135deg, #3b82f6, #60a5fa)",
            boxShadow: "0 0 10px rgba(59,130,246,0.6)",
          }}
        />
      </div>

      {/* Glow pulse */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 110,
          height: 110,
          top: "50%",
          left: "50%",
          marginTop: -55 - 16,
          marginLeft: -55,
          background:
            "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)",
          animation: visible
            ? "globePulse 4s ease-in-out infinite"
            : "none",
        }}
      />

      {/* Globe icon */}
      <div
        className="relative w-[76px] h-[76px] rounded-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
          boxShadow:
            "0 0 40px rgba(37,99,235,0.28), 0 8px 28px rgba(0,0,0,0.18)",
        }}
      >
        <Globe
          className="w-10 h-10 text-white"
          strokeWidth={1.5}
        />
      </div>

      {/* Title — large and bold */}
      <h1
        className="text-lg font-extrabold tracking-tight mt-2.5"
        style={{ color: "var(--foreground)" }}
      >
        PANGEA
      </h1>
      <p
        className="text-[10px] sm:text-[11px] text-center max-w-[140px] leading-snug mt-0.5"
        style={{ color: "var(--muted-foreground)" }}
      >
        {t("tree.subtitle")}
      </p>

      {/* Welcome badge */}
      {!isGuest && (
        <div
          className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full"
          style={{
            fontSize: 9,
            backgroundColor:
              "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
        >
          <Sparkles style={{ width: 9, height: 9 }} />
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
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
            <Layers className="w-3.5 h-3.5" />
            2D
          </button>
          <button
            onClick={() => setView("3d")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
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
            <Globe className="w-3.5 h-3.5" />
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
            opacity: 0.1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
