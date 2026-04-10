"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import { useLanguage } from "@/components/language-provider";
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Copy,
  Link as LinkIcon,
  Clock,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import type {
  VerificationResult,
  HashSearchResult,
  ContentHash,
  IntegrityStats,
} from "@/lib/types";
import { formatHash, entityTypeLabels } from "@/lib/integrity";

export default function VerifyPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState<"hash" | "entity">("hash");
  const [entityType, setEntityType] = useState("law");
  const [entityId, setEntityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | HashSearchResult | null>(null);
  const [hashChain, setHashChain] = useState<ContentHash[]>([]);
  const [showChain, setShowChain] = useState(false);
  const [stats, setStats] = useState<IntegrityStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load integrity stats on mount
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_integrity_stats");
      if (rpcError) throw rpcError;
      setStats(data as unknown as IntegrityStats);
    } catch {
      // Stats are optional, don't block the page
    } finally {
      setStatsLoading(false);
    }
  }, [supabase]);

  // Load stats on first render
  useState(() => {
    loadStats();
  });

  const handleSearchByHash = async () => {
    if (!searchInput.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setHashChain([]);

    try {
      const { data, error: rpcError } = await supabase.rpc("search_by_hash", {
        p_hash: searchInput.trim(),
      });
      if (rpcError) throw rpcError;
      setResult(data as unknown as HashSearchResult);

      // If found, load the full chain
      const searchResult = data as unknown as HashSearchResult;
      if (searchResult.found && searchResult.entity_type && searchResult.entity_id) {
        const { data: chain } = await supabase
          .from("content_hashes")
          .select("*")
          .eq("entity_type", searchResult.entity_type)
          .eq("entity_id", searchResult.entity_id)
          .order("version", { ascending: true });
        if (chain) setHashChain(chain as ContentHash[]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEntity = async () => {
    if (!entityId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setHashChain([]);

    try {
      const { data, error: rpcError } = await supabase.rpc("verify_record_integrity", {
        p_entity_type: entityType,
        p_entity_id: entityId.trim(),
      });
      if (rpcError) throw rpcError;
      setResult(data as unknown as VerificationResult);

      // Load the full chain
      const { data: chain } = await supabase
        .from("content_hashes")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId.trim())
        .order("version", { ascending: true });
      if (chain) setHashChain(chain as ContentHash[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVerification = (r: VerificationResult | HashSearchResult): r is VerificationResult => {
    return "verified" in r;
  };

  const isSearch = (r: VerificationResult | HashSearchResult): r is HashSearchResult => {
    return "found" in r;
  };

  return (
    <AppShell section="core" sectionName="verify">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t("integrity.title")}</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("integrity.description")}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.total_hashes || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("integrity.totalHashes")}
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.recent_verifications || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("integrity.verificationsToday")}
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {stats.merkle_trees || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("integrity.merkleTrees")}
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${(stats.recent_mismatches || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                {stats.recent_mismatches || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("integrity.mismatches")}
              </div>
            </div>
          </div>
        )}

        {/* Search Mode Toggle */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSearchType("hash")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                searchType === "hash"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Hash className="w-4 h-4 inline mr-2" />
              {t("integrity.searchByHash")}
            </button>
            <button
              onClick={() => setSearchType("entity")}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                searchType === "entity"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              {t("integrity.verifyRecord")}
            </button>
          </div>

          {/* Search by Hash */}
          {searchType === "hash" && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {t("integrity.enterHash")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="e.g. a1b2c3d4e5f6..."
                  className="flex-1 px-4 py-2.5 rounded-lg border bg-background text-sm font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleSearchByHash()}
                />
                <button
                  onClick={handleSearchByHash}
                  disabled={loading || !searchInput.trim()}
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("integrity.hashHelp")}
              </p>
            </div>
          )}

          {/* Verify by Entity */}
          {searchType === "entity" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    {t("integrity.recordType")}
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                  >
                    <option value="law">Law</option>
                    <option value="proposal">Proposal</option>
                    <option value="vote">Vote</option>
                    <option value="delegation">Delegation</option>
                    <option value="election">Election</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-1 block">
                    {t("integrity.recordId")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={entityId}
                      onChange={(e) => setEntityId(e.target.value)}
                      placeholder="UUID..."
                      className="flex-1 px-4 py-2.5 rounded-lg border bg-background text-sm font-mono"
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyEntity()}
                    />
                    <button
                      onClick={handleVerifyEntity}
                      disabled={loading || !entityId.trim()}
                      className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {loading ? (
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Shield className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("integrity.entityHelp")}
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <div className="font-medium text-red-800 dark:text-red-400">
                {t("integrity.verificationFailed")}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400/80 mt-1">
                {error}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-card border rounded-xl overflow-hidden">
            {/* Result Header */}
            {isVerification(result) && (
              <div
                className={`p-5 ${
                  result.verified
                    ? "bg-green-50 dark:bg-green-950/20 border-b border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.verified ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <div className="font-bold text-lg">
                      {result.verified
                        ? t("integrity.integrityVerified")
                        : t("integrity.integrityFailed")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.verified
                        ? t("integrity.recordIntact")
                        : result.error || t("integrity.recordTampered")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isSearch(result) && (
              <div
                className={`p-5 ${
                  result.found
                    ? "bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800"
                    : "bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.found ? (
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  )}
                  <div>
                    <div className="font-bold text-lg">
                      {result.found
                        ? t("integrity.hashFound")
                        : t("integrity.hashNotFound")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.found
                        ? `${entityTypeLabels[result.entity_type || ""] || result.entity_type} — ${t("integrity.version")} ${result.version}`
                        : t("integrity.hashNotFoundDesc")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Result Details */}
            {((isVerification(result) && result.content_hash) ||
              (isSearch(result) && result.found)) && (
              <div className="p-5 space-y-4">
                {/* Hash */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    SHA-256 Hash
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded break-all flex-1">
                      {isVerification(result)
                        ? result.content_hash
                        : (result as HashSearchResult).content_hash}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          (isVerification(result)
                            ? result.content_hash
                            : (result as HashSearchResult).content_hash) || ""
                        )
                      }
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Copy hash"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {copied && (
                    <div className="text-xs text-green-600 mt-1">
                      {t("integrity.copied")}
                    </div>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {isVerification(result) && result.entity_type && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {t("integrity.recordType")}
                      </div>
                      <div className="text-sm font-medium">
                        {entityTypeLabels[result.entity_type] || result.entity_type}
                      </div>
                    </div>
                  )}
                  {isSearch(result) && result.entity_type && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {t("integrity.recordType")}
                      </div>
                      <div className="text-sm font-medium">
                        {entityTypeLabels[result.entity_type] || result.entity_type}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {t("integrity.version")}
                    </div>
                    <div className="text-sm font-medium">
                      {isVerification(result)
                        ? result.version
                        : (result as HashSearchResult).version}
                    </div>
                  </div>

                  {isVerification(result) && result.hashed_at && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {t("integrity.hashedAt")}
                      </div>
                      <div className="text-sm">
                        {new Date(result.hashed_at).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {isSearch(result) && result.created_at && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {t("integrity.hashedAt")}
                      </div>
                      <div className="text-sm">
                        {new Date(result.created_at).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Link to entity */}
                  {((isVerification(result) && result.entity_type && result.entity_id) ||
                    (isSearch(result) && result.entity_type && result.entity_id)) && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        <LinkIcon className="w-3 h-3 inline mr-1" />
                        {t("integrity.viewRecord")}
                      </div>
                      <a
                        href={getEntityLink(
                          (isVerification(result) ? result.entity_type : (result as HashSearchResult).entity_type) || "",
                          (isVerification(result) ? result.entity_id : (result as HashSearchResult).entity_id) || ""
                        )}
                        className="text-sm text-primary hover:underline"
                      >
                        {t("integrity.openRecord")}
                      </a>
                    </div>
                  )}
                </div>

                {/* Previous Hash */}
                {((isVerification(result) && result.previous_hash) ||
                  (isSearch(result) && result.previous_hash)) && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      {t("integrity.previousHash")}
                    </div>
                    <code className="text-xs font-mono bg-muted px-3 py-1.5 rounded block break-all">
                      {isVerification(result) ? result.previous_hash : (result as HashSearchResult).previous_hash}
                    </code>
                  </div>
                )}

                {/* Hashed Fields (for search results) */}
                {isSearch(result) && result.hashed_fields && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      {t("integrity.viewHashedData")}
                    </summary>
                    <pre className="mt-2 text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto max-h-64">
                      {JSON.stringify(result.hashed_fields, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Hash Chain */}
            {hashChain.length > 1 && (
              <div className="border-t">
                <button
                  onClick={() => setShowChain(!showChain)}
                  className="w-full p-4 flex items-center justify-between text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <span>
                    {t("integrity.hashChain")} ({hashChain.length} {t("integrity.versions")})
                  </span>
                  {showChain ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showChain && (
                  <div className="px-5 pb-5 space-y-2">
                    {hashChain.map((entry, i) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 text-xs"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                          {entry.version}
                        </div>
                        <div className="flex-1 min-w-0">
                          <code className="font-mono text-muted-foreground break-all">
                            {formatHash(entry.content_hash, 20)}
                          </code>
                        </div>
                        {i > 0 && (
                          <div className="text-muted-foreground">
                            {entry.previous_hash === hashChain[i - 1].content_hash ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                            )}
                          </div>
                        )}
                        <div className="text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* How it Works */}
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("integrity.howItWorks")}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-medium text-sm">{t("integrity.step1Title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("integrity.step1Desc")}
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-medium text-sm">{t("integrity.step2Title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("integrity.step2Desc")}
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-medium text-sm">{t("integrity.step3Title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("integrity.step3Desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Merkle Roots */}
        {stats?.latest_merkle_roots && stats.latest_merkle_roots.length > 0 && (
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">{t("integrity.latestMerkleRoots")}</h2>
            <div className="space-y-3">
              {stats.latest_merkle_roots.map((tree, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {entityTypeLabels[tree.entity_type] || tree.entity_type}
                    </div>
                    <code className="text-xs font-mono text-muted-foreground">
                      {formatHash(tree.root_hash, 16)}
                    </code>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {tree.leaf_count} {t("integrity.records")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tree.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function getEntityLink(entityType: string, entityId: string): string {
  switch (entityType) {
    case "law":
      return `/laws/${entityId}`;
    case "proposal":
      return `/proposals/${entityId}`;
    case "election":
      return `/elections/${entityId}`;
    default:
      return "#";
  }
}
