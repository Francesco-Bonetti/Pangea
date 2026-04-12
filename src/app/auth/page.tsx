"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Globe, Shield, Users, Vote, Eye, EyeOff, Loader2, Languages } from "lucide-react";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { useLanguage } from "@/components/core/language-provider";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>("en");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [honeypot, setHoneypot] = useState("");  // AS-03: anti-bot honeypot
  const router = useRouter();
  const supabase = createClient();
  const { setLocale, t } = useLanguage();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: existing } } = await supabase.auth.getUser();
      if (existing) router.push("/dashboard");
    };
    checkUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // AS-03: honeypot check — bots fill hidden fields, humans don't
    if (honeypot) {
      // Fake success to not tip off the bot
      setMessage({ type: "success", text: t("auth.registrationComplete") });
      return;
    }

    // GDPR validation: consent required for registration
    if (mode === "register" && !consent) {
      setMessage({
        type: "error",
        text: t("auth.consentRequired"),
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, preferred_language: selectedLanguage },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        // Save language preference to profile if user was created
        if (data.user) {
          await supabase.from("profiles").update({ preferred_language: selectedLanguage }).eq("id", data.user.id);
        }

        // Apply language immediately
        setLocale(selectedLanguage);

        setMessage({
          type: "success",
          text: t("auth.registrationComplete"),
        });
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Load user's saved language preference
        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_language")
            .eq("id", data.user.id)
            .single();
          if (profile?.preferred_language) {
            setLocale(profile.preferred_language as Locale);
          }
        }

        router.push("/dashboard");
        router.refresh();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      let userMsg = msg;
      if (msg === "Invalid login credentials") {
        userMsg = t("auth.invalidCredentials");
      } else if (msg.includes("security purposes") || msg.includes("rate limit")) {
        userMsg = t("auth.tooManyAttempts");
      } else if (msg.includes("already registered") || msg.includes("already been registered")) {
        userMsg = t("auth.emailAlreadyRegistered");
      }
      setMessage({
        type: "error",
        text: userMsg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-[#0c1a2e] to-[var(--background)] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-pangea-400" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full border border-pangea-400" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-pangea-400" />
        </div>

        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center mb-8">
            <Globe className="w-16 h-16 text-fg-primary" strokeWidth={1} />
          </div>
          <h1 className="text-5xl font-display font-bold text-fg mb-3">
            Pangea
          </h1>
          <p className="text-fg-primary text-lg mb-2">
            {t("auth.globalDemocratic")}
          </p>
          <p className="text-fg-muted text-sm max-w-md leading-relaxed mb-12">
            {t("auth.tagline")}
          </p>

          <div className="grid grid-cols-1 gap-4 text-left max-w-sm mx-auto">
            {[
              { icon: Vote, label: t("auth.oneCitizenOneVote"), desc: t("auth.mathematicalIntegrity") },
              { icon: Shield, label: t("auth.privacyByDesign"), desc: t("auth.gdprCompliance") },
              { icon: Users, label: t("auth.publicTransparency"), desc: t("auth.debatesBelong") },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-theme-card/30">
                <Icon className="w-5 h-5 text-fg-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-fg text-sm font-medium">{label}</p>
                  <p className="text-fg-muted text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[var(--background)]">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <Globe className="w-12 h-12 text-fg-primary mx-auto mb-2" strokeWidth={1} />
            <h1 className="text-3xl font-bold text-fg">Pangea</h1>
            <p className="text-fg-muted text-sm">{t("auth.globalDemocratic")}</p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-theme-card rounded-xl p-1 mb-8">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? "bg-pangea-600 text-fg shadow-lg"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {m === "login" ? t("auth.signIn") : t("auth.register")}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <>
                <div>
                  <label className="label">{t("auth.fullName")}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={t("auth.fullNamePlaceholder")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={mode === "register"}
                  />
                </div>

                {/* Language selection at registration */}
                <div>
                  <label className="label flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    {t("auth.preferredLanguage")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUPPORTED_LOCALES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setSelectedLanguage(lang.code as Locale)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150 ${
                          selectedLanguage === lang.code
                            ? "border-blue-500 bg-blue-500/10 text-fg"
                            : "border-theme bg-theme-card text-fg-muted hover:border-blue-500/50"
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label">{t("auth.email")}</label>
              <input
                type="email"
                className="input-field"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">{t("auth.password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field pr-12"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* GDPR consent - required for registration */}
            {mode === "register" && (
              <div className="flex items-start gap-3 p-4 bg-theme-card rounded-lg border border-theme">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-theme text-fg-primary focus:ring-pangea-500"
                />
                <label htmlFor="consent" className="text-xs text-fg-muted leading-relaxed cursor-pointer">
                  <span className="text-fg font-medium">{t("auth.gdprConsent")}</span>
                  <br />
                  {t("auth.gdprConsentText")}
                </label>
              </div>
            )}

            {/* AS-03: Honeypot field — hidden from humans, visible to bots */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                autoComplete="off"
                tabIndex={-1}
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Feedback message */}
            {message && (
              <div
                className={`p-4 rounded-lg text-sm ${
                  message.type === "error"
                    ? "bg-danger-tint border border-theme text-fg-danger"
                    : "bg-green-900/30 border border-green-700/50 text-fg-success"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === "register" && !consent)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {mode === "login" ? t("auth.enterPangea") : t("auth.becomeCitizen")}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-theme-muted" />
            <span className="text-xs text-fg-muted">{t("common.or")}</span>
            <div className="flex-1 h-px bg-theme-muted" />
          </div>

          {/* Guest button */}
          <button
            type="button"
            onClick={() => {
              router.push("/dashboard");
            }}
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
          >
            <Globe className="w-4 h-4" />
            {t("auth.exploreAsGuest")}
          </button>

          <p className="text-center text-xs text-fg-muted mt-8">
            {t("auth.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
