"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useLanguage } from "@/components/language-provider";
import {
  Wallet,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Heart,
  Server,
  Users,
  Info,
} from "lucide-react";

const BTC_ADDRESS = "bc1q4hfds4l76naxpcssvkytqa76mwucf35dmuu043";
const MEMPOOL_URL = `https://mempool.space/address/${BTC_ADDRESS}`;

export default function TreasuryPage() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(BTC_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = BTC_ADDRESS;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-900/30 border border-amber-700/30">
            <Wallet className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-fg">{t("treasury.title")}</h1>
          <p className="text-fg-muted max-w-xl mx-auto">{t("treasury.subtitle")}</p>
        </div>

        {/* Description */}
        <div className="card border border-theme/30 p-6">
          <p className="text-fg-secondary leading-relaxed">{t("treasury.description")}</p>
        </div>

        {/* Donate Card */}
        <div className="card border border-amber-800/30 bg-amber-900/10 p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-fg flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              {t("treasury.donateTitle")}
            </h2>
            <p className="text-fg-muted text-sm">{t("treasury.donateDescription")}</p>
          </div>

          {/* BTC Address */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              {t("treasury.btcAddress")}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-theme-base border border-theme/40 rounded-lg px-4 py-3 font-mono text-sm text-fg break-all select-all">
                {BTC_ADDRESS}
              </div>
              <button
                onClick={copyAddress}
                className={`shrink-0 p-3 rounded-lg border transition-all duration-200 ${
                  copied
                    ? "bg-green-900/30 border-green-700/40 text-green-400"
                    : "bg-theme-card border-theme/40 text-fg-muted hover:text-fg hover:border-theme"
                }`}
                title={t("treasury.copyAddress")}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && (
              <p className="text-green-400 text-xs font-medium">{t("treasury.copied")}</p>
            )}
          </div>

          {/* QR Code placeholder — using a simple visual since we can't generate QR in Next.js without a lib */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=bitcoin:${BTC_ADDRESS}`}
                alt="BTC QR Code"
                className="w-full h-full"
                width={180}
                height={180}
              />
            </div>
            <p className="text-xs text-fg-muted">{t("treasury.scanQr")}</p>
          </div>

          {/* Example */}
          <div className="flex gap-3 p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-fg-secondary">{t("treasury.example")}</p>
          </div>
        </div>

        {/* Transparency */}
        <div className="card border border-theme/30 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-fg flex items-center gap-2">
            <Shield className="w-5 h-5 text-pangea-400" />
            {t("treasury.transparencyTitle")}
          </h2>
          <p className="text-fg-muted text-sm">{t("treasury.transparencyDescription")}</p>
          <a
            href={MEMPOOL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-theme-card border border-theme/40 rounded-lg text-sm font-medium text-fg hover:border-pangea-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {t("treasury.verifyOnChain")}
          </a>
        </div>

        {/* How funds are used */}
        <div className="card border border-theme/30 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-fg">{t("treasury.howFundsUsed")}</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Server className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-fg-secondary">{t("treasury.fundsDevelopment")}</p>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <p className="text-sm text-fg-secondary">{t("treasury.fundsSecurity")}</p>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <p className="text-sm text-fg-secondary">{t("treasury.fundsCommunity")}</p>
            </div>
          </div>
        </div>

        {/* Voluntary note */}
        <div className="flex gap-3 p-4 bg-theme-card border border-theme/20 rounded-lg">
          <Heart className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-fg-muted italic">{t("treasury.voluntaryNote")}</p>
        </div>
      </div>
    </AppShell>
  );
}
