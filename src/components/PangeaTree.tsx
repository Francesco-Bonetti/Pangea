"use client";

import { useState } from "react";
import { Globe, Sparkles, Layers } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PLATFORM_TREE, type PlatformTreeNode } from "@/lib/platform-nodes";
import TreeViewer3D from "@/components/TreeViewer3D";
import TreeViewer2D from "@/components/TreeViewer2D";

/* ═══════════════════════════════════════════════════════════
   PangeaTree — Toggle between 2D (default) and 3D views
   ═══════════════════════════════════════════════════════════ */

interface PangeaTreeProps {
  isGuest: boolean;
  /** Override nodes — defaults to PLATFORM_TREE */
  nodes?: PlatformTreeNode[];
}

export default function PangeaTree({ isGuest, nodes }: PangeaTreeProps) {
  const { t } = useLanguage();
  const [view, setView] = useState<"2d" | "3d">("2d");
  const treeNodes = nodes ?? PLATFORM_TREE;

  /* ── Shared center / root content ─────────────────── */

  const renderRootOrb = (visible: boolean = true) => (
    <div
      className="flex flex-col items-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.5)",
        transition:
          "opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: 104,
          height: 104,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
          animation: visible ? "globePulse 3s ease-in-out infinite" : "none",
        }}
      />
      <div
        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2"
        style={{
          background: "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
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
      <h1
        className="text-base sm:text-lg font-extrabold tracking-tight mt-1"
        style={{ color: "var(--foreground)" }}
      >
        PANGEA
      </h1>
      <p
        className="text-[9px] sm:text-[10px] text-center max-w-[140px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        {t("tree.subtitle")}
      </p>
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
  );

  return (
    <>
      {/* View toggle pill (top-right) */}
      <div className="flex justify-end mb-3">
        <div
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-1 border"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <button
            onClick={() => setView("2d")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
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

      {/* Views */}
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

      <style jsx global>{`
        @keyframes globePulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.12;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
