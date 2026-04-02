import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Globe, Users, Vote, BookOpen, Shield, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Agora Pangea — La Piattaforma di Democrazia Digitale Globale",
  description:
    "Agora Pangea è la piattaforma di democrazia digitale della Repubblica Democratica Globale Pangea. Proponi leggi, vota proposte, delega il tuo voto a esperti, e partecipa alla costruzione di un governo globale dal basso.",
  keywords: [
    "democrazia digitale",
    "voto online",
    "proposte di legge",
    "democrazia liquida",
    "partecipazione civica",
    "Pangea",
    "Agora",
    "e-democracy",
    "governo globale",
    "piattaforma democratica",
  ],
  openGraph: {
    title: "Agora Pangea — Democrazia Digitale Globale",
    description:
      "Proponi leggi, vota, delega il tuo voto a esperti e partecipa alla costruzione della prima democrazia digitale globale.",
    type: "website",
    url: "https://v0-agora-pangea-dashboard.vercel.app",
    siteName: "Agora Pangea",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agora Pangea — Democrazia Digitale Globale",
    description:
      "Proponi leggi, vota, delega il tuo voto a esperti e partecipa alla costruzione della prima democrazia digitale globale.",
  },
  alternates: {
    canonical: "https://v0-agora-pangea-dashboard.vercel.app",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se già loggato, vai direttamente alla dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Altrimenti mostra la landing page pubblica (visibile ai crawler)
  return (
    <div className="min-h-screen bg-[#0c1220] text-slate-100">
      {/* Navbar minimale */}
      <nav className="border-b border-slate-800/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-pangea-400" />
            <span className="font-bold text-lg text-white">Agora</span>
            <span className="text-slate-500 text-sm">Pangea</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
              Chi Siamo
            </Link>
            <Link
              href="/auth"
              className="bg-pangea-600 hover:bg-pangea-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Accedi
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-pangea-900/30 border border-pangea-700/40 rounded-full px-4 py-1.5 text-sm text-pangea-300 mb-8">
          <Zap className="w-3.5 h-3.5" />
          Repubblica Democratica Globale Pangea
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          La democrazia digitale<br />
          <span className="text-pangea-400">per il mondo intero</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Agora è la piazza telematica di Pangea. Proponi leggi, vota proposte,
          delega il tuo voto a esperti di fiducia e partecipa alla costruzione
          del primo governo democratico globale.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-pangea-600 hover:bg-pangea-500 text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-pangea-500/25"
          >
            Partecipa ora
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-8 py-3.5 rounded-lg transition-colors border border-slate-700"
          >
            Esplora come ospite
          </Link>
        </div>
      </section>

      {/* Come funziona */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Come funziona Agora</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Tre pilastri per una democrazia moderna, trasparente e partecipativa.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Vote,
              title: "Fase Deliberativa",
              description:
                "Vota le proposte di legge attive. Il tuo voto vale quanto quello di chiunque altro. Puoi esprimere una posizione semplice (Favorevole / Contrario / Astenuto) oppure distribuire il tuo voto tra più opzioni deliberative.",
              color: "text-pangea-400",
              bg: "bg-pangea-900/20 border-pangea-700/30",
            },
            {
              icon: Zap,
              title: "Raccolta Supporto",
              description:
                "Prima di votare, le proposte devono raccogliere il sostegno della comunità. I cittadini le segnalano con un 'supporto'. Quando una proposta raggiunge la soglia del 20% degli utenti attivi, viene promossa a votazione.",
              color: "text-amber-400",
              bg: "bg-amber-900/20 border-amber-700/30",
            },
            {
              icon: Users,
              title: "Democrazia Liquida",
              description:
                "Se non sei esperto di un tema, puoi delegare il tuo voto a un cittadino di fiducia per quella categoria. La delega è sempre revocabile e il tuo voto diretto ha sempre la supremazia.",
              color: "text-purple-400",
              bg: "bg-purple-900/20 border-purple-700/30",
            },
          ].map(({ icon: Icon, title, description, color, bg }) => (
            <div key={title} className={`p-6 rounded-xl border bg-slate-800/30 ${bg}`}>
              <div className={`${color} mb-4`}>
                <Icon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principi */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">I principi di Pangea</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {[
            "Ogni cittadino ha un voto di peso uguale, indipendentemente da ricchezza o status",
            "I voti sono anonimi per garantire libertà di espressione senza pressioni",
            "Tutte le proposte e delibere sono pubbliche e trasparenti",
            "Nessuna barriera geografica: la democrazia è globale",
            "Le leggi approvate entrano nel Catalogo Leggi pubblico e permanente",
            "Chiunque può proporre una legge, non solo i politici",
          ].map((principle) => (
            <div key={principle} className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <CheckCircle2 className="w-5 h-5 text-pangea-400 shrink-0 mt-0.5" />
              <p className="text-slate-300 text-sm">{principle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA finale */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-12">
          <Shield className="w-12 h-12 text-pangea-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Unisciti alla Repubblica Democratica Globale Pangea
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Registrati gratuitamente e inizia a partecipare alla costruzione
            della prima democrazia digitale globale.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-pangea-600 hover:bg-pangea-500 text-white font-semibold px-10 py-4 rounded-lg transition-all duration-200 text-lg shadow-xl hover:shadow-pangea-500/25"
          >
            Inizia ora — è gratuito
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Globe className="w-4 h-4" />
            <span>Agora Pangea — Repubblica Democratica Globale</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/about" className="hover:text-slate-300 transition-colors">Chi Siamo</Link>
            <Link href="/auth" className="hover:text-slate-300 transition-colors">Accedi</Link>
            <Link href="/auth?tab=signup" className="hover:text-slate-300 transition-colors">Registrati</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
