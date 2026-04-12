"use client";

import { Globe, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import { PLATFORM_TREE, type PlatformTreeNode } from "@/lib/platform-nodes";
import { useTreeData } from "@/hooks/useTreeData";
import TreeViewer2D from "@/components/governance/TreeViewer2D";

/* ═══════════════════════════════════════════════════════════
   PangeaTree — Main dashboard tree (2D only, dynamic data)
   ═══════════════════════════════════════════════════════════ */

interface PangeaTreeProps {
  isGuest: boolean;
  nodes?: PlatformTreeNode[];
}

export default function PangeaTree({ isGuest, nodes }: PangeaTreeProps) {
  const { t } = useLanguage();
  const staticNodes = nodes ?? PLATFORM_TREE;
  const { tree, loadChildren } = useTreeData(staticNodes);

  /* ── Root orb — fixed, no hover movement ─────────────── */

  const renderRootOrb = () => (
    <div className="relative flex flex-col items-center">
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
          animation: "orbitalSpin 12s linear infinite",
        }}
      >
        <div
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{
            top: -5,
            left: "50%",
            marginLeft: -5,
            background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
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
          animation: "globePulse 4s ease-in-out infinite",
        }}
      />

      {/* Globe icon */}
      <div
        className="relative w-[76px] h-[76px] rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
          boxShadow:
            "0 0 40px rgba(37,99,235,0.28), 0 8px 28px rgba(0,0,0,0.18)",
        }}
      >
        <Globe className="w-10 h-10 text-white" strokeWidth={1.5} />
      </div>

      {/* Title */}
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
      <TreeViewer2D
        nodes={tree}
        isGuest={isGuest}
        rootContent={renderRootOrb}
        onRequestChildren={loadChildren}
      />

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
