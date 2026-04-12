"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/core/language-provider";
import {
  Mail,
  Plus,
  Trash2,
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  X,
} from "lucide-react";

interface UserEmail {
  id: string;
  email: string;
  is_primary: boolean;
  verified: boolean;
  created_at: string;
}

export default function MultiEmailManager() {
  const { t } = useLanguage();
  const supabase = createClient();
  const [emails, setEmails] = useState<UserEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [primaryEmail, setPrimaryEmail] = useState("");

  useEffect(() => {
    loadEmails();
  }, []);

  async function loadEmails() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setPrimaryEmail(user.email || "");

    const { data } = await supabase
      .from("user_emails")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at");

    if (data && data.length > 0) {
      setEmails(data as UserEmail[]);
    } else {
      // Initialize with current auth email
      const { error } = await supabase.from("user_emails").insert({
        user_id: user.id,
        email: user.email,
        is_primary: true,
        verified: true,
        verified_at: new Date().toISOString(),
      });
      if (!error) {
        setEmails([{
          id: crypto.randomUUID(),
          email: user.email || "",
          is_primary: true,
          verified: true,
          created_at: new Date().toISOString(),
        }]);
      }
      // Reload
      const { data: reloaded } = await supabase
        .from("user_emails")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false });
      if (reloaded) setEmails(reloaded as UserEmail[]);
    }
    setLoading(false);
  }

  async function handleAddEmail() {
    if (!newEmail.trim() || !userId) return;
    setAdding(true);
    setFeedback(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setFeedback({ type: "error", text: t("multiEmail.invalidEmail") });
      setAdding(false);
      return;
    }

    const { error } = await supabase.from("user_emails").insert({
      user_id: userId,
      email: newEmail.trim().toLowerCase(),
      is_primary: false,
      verified: false,
    });

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        setFeedback({ type: "error", text: t("multiEmail.alreadyRegistered") });
      } else {
        setFeedback({ type: "error", text: error.message });
      }
    } else {
      setFeedback({ type: "success", text: t("multiEmail.emailAdded") });
      setNewEmail("");
      setShowAddForm(false);
      loadEmails();
    }
    setAdding(false);
  }

  async function handleRemoveEmail(emailId: string) {
    const email = emails.find(e => e.id === emailId);
    if (!email || email.is_primary) return;

    const { error } = await supabase.from("user_emails").delete().eq("id", emailId);
    if (error) {
      setFeedback({ type: "error", text: error.message });
    } else {
      setFeedback({ type: "success", text: t("multiEmail.emailRemoved") });
      loadEmails();
    }
  }

  async function handleMakePrimary(emailId: string) {
    if (!userId) return;
    const email = emails.find(e => e.id === emailId);
    if (!email || email.is_primary) return;

    // Unset current primary
    await supabase.from("user_emails").update({ is_primary: false }).eq("user_id", userId).eq("is_primary", true);
    // Set new primary
    const { error } = await supabase.from("user_emails").update({ is_primary: true }).eq("id", emailId);

    if (error) {
      setFeedback({ type: "error", text: error.message });
    } else {
      setFeedback({ type: "success", text: t("multiEmail.primaryUpdated") });
      loadEmails();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="w-4 h-4 animate-spin text-fg-muted" />
        <span className="text-sm text-fg-muted">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          <Mail className="w-4 h-4 text-blue-400" />
          {t("settings.emails")}
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-fg transition-colors"
        >
          <Plus className="w-3 h-3" />
          {t("settings.addEmail")}
        </button>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 p-3 rounded-lg text-xs" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
        <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p>
          {t("multiEmail.infoText")}
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 p-2 rounded text-xs ${feedback.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {feedback.text}
        </div>
      )}

      {/* Add email form */}
      {showAddForm && (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={t("multiEmail.placeholder")}
            className="input-field text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
          />
          <button
            onClick={handleAddEmail}
            disabled={adding || !newEmail.trim()}
            className="btn-primary text-xs px-3 py-2 flex items-center gap-1"
          >
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {t("multiEmail.add")}
          </button>
          <button
            onClick={() => { setShowAddForm(false); setNewEmail(""); }}
            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            style={{ color: "var(--muted-foreground)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Email list */}
      <div className="space-y-2">
        {emails.map((email) => (
          <div
            key={email.id}
            className="flex items-center justify-between p-3 rounded-lg border"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Mail className="w-4 h-4 shrink-0" style={{ color: email.is_primary ? "var(--foreground)" : "var(--muted-foreground)" }} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{email.email}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {email.is_primary && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                      {t("settings.primaryEmail")}
                    </span>
                  )}
                  {email.verified ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> {t("multiEmail.verified")}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      {t("multiEmail.unverified")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {!email.is_primary && (
                <>
                  <button
                    onClick={() => handleMakePrimary(email.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
                    style={{ color: "var(--muted-foreground)" }}
                    title={t("settings.makePrimary")}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveEmail(email.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
                    title={t("settings.removeEmail")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
