"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Globe, Shield, Users, Vote, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

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

    // GDPR validation: consent required for registration
    if (mode === "register" && !consent) {
      setMessage({
        type: "error",
        text: "Consent to data processing is required to participate in Agora (Art. 6 GDPR).",
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        setMessage({
          type: "success",
          text: "Registration complete! Check your email to confirm your account.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      let userMsg = msg;
      if (msg === "Invalid login credentials") {
        userMsg = "Invalid credentials. Please check your email and password.";
      } else if (msg.includes("security purposes") || msg.includes("rate limit")) {
        userMsg = "Too many attempts. Please wait a minute and try again.";
      } else if (msg.includes("already registered") || msg.includes("already been registered")) {
        userMsg = "This email is already registered. Try signing in instead.";
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
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-[#0c1a2e] to-[#0c1220] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-pangea-400" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full border border-pangea-400" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-pangea-400" />
        </div>

        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center mb-8">
            <Globe className="w-16 h-16 text-pangea-400" strokeWidth={1} />
          </div>
          <h1 className="text-5xl font-display font-bold text-white mb-3">
            Agora
          </h1>
          <p className="text-pangea-300 text-lg mb-2">
            Pangea Global Democratic Commonwealth
          </p>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-12">
            The platform where ideas become legislative proposals, proposals
            become debates, and debates become the will of the people.
          </p>

          <div className="grid grid-cols-1 gap-4 text-left max-w-sm mx-auto">
            {[
              { icon: Vote, label: "One citizen, one vote", desc: "Mathematically guaranteed integrity" },
              { icon: Shield, label: "Privacy by Design", desc: "Architectural GDPR compliance" },
              { icon: Users, label: "Public transparency", desc: "Debates belong to the people" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30">
                <Icon className="w-5 h-5 text-pangea-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-200 text-sm font-medium">{label}</p>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0c1220]">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <Globe className="w-12 h-12 text-pangea-400 mx-auto mb-2" strokeWidth={1} />
            <h1 className="text-3xl font-bold text-white">Agora</h1>
            <p className="text-slate-400 text-sm">Pangea Global Democratic Commonwealth</p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-slate-800 rounded-xl p-1 mb-8">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setMessage(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? "bg-pangea-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div>
                <label className="label">Full name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={mode === "register"}
                />
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="citizen@pangea.world"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="input-field pr-12"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* GDPR consent - required for registration */}
            {mode === "register" && (
              <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-600 text-pangea-500 focus:ring-pangea-500"
                />
                <label htmlFor="consent" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                  <span className="text-slate-300 font-medium">Required consent (Art. 6 GDPR)</span>
                  <br />
                  I consent to the processing of my personal data for
                  participation in the Agora democratic platform of Pangea.
                  My voting preferences will never be disclosed.
                </label>
              </div>
            )}

            {/* Feedback message */}
            {message && (
              <div
                className={`p-4 rounded-lg text-sm ${
                  message.type === "error"
                    ? "bg-red-900/30 border border-red-700/50 text-red-300"
                    : "bg-green-900/30 border border-green-700/50 text-green-300"
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
              {mode === "login" ? "Enter the Agora" : "Become a Citizen"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500">or</span>
            <div className="flex-1 h-px bg-slate-700" />
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
            Explore as guest
          </button>

          <p className="text-center text-xs text-slate-600 mt-8">
            Agora · Pangea World · Privacy by Design
          </p>
        </div>
      </div>
    </div>
  );
}
