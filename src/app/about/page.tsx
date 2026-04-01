import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import { Globe, BookOpen, Users, Vote, FileText, Shield } from "lucide-react";
import Link from "next/link";

export default async function AboutPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id || "")
    .single()
    .catch(() => ({ data: null }));

  // Statistiche globali
  const stats = await supabase.rpc("get_platform_stats");
  const platformStats = stats.data?.[0] ?? {
    total_users: 0,
    total_proposals: 0,
    total_votes: 0,
    active_proposals: 0,
    closed_proposals: 0,
  };

  return (
    <div className="min-h-screen bg-[#0c1220]">
      {user && <Navbar userEmail={user.email} userName={profile?.full_name} />}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-pangea-400" strokeWidth={1.5} />
            <h1 className="text-4xl font-bold text-white">Agora Pangea</h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl">
            La piattaforma di democrazia digitale della Repubblica Democratica Globale Pangea.
            Proponi leggi, dibatti e vota su proposte legislative in un ambiente trasparente e sicuro.
          </p>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {[
            { label: "Cittadini", value: platformStats.total_users, icon: Users },
            { label: "Proposte", value: platformStats.total_proposals, icon: FileText },
            { label: "In Delibera", value: platformStats.active_proposals, icon: Vote },
            { label: "Deliberate", value: platformStats.closed_proposals, icon: Globe },
            { label: "Voti Espressi", value: platformStats.total_votes, icon: FileText },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card p-4 bg-pangea-900/20 border border-pangea-700/30">
              <Icon className="w-5 h-5 text-pangea-400 mb-2" />
              <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Guide Sections */}
        <div className="space-y-12">
          {/* Come funziona */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-pangea-400" />
              <h2 className="text-2xl font-semibold text-white">Come Funziona</h2>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "1. Registrati",
                  desc: "Crea il tuo profilo cittadino su Agora. La registrazione è gratuita e richiede il consenso GDPR per garantire la tua privacy.",
                },
                {
                  title: "2. Esplora Proposte",
                  desc: "Consulta la Piazza Telematica per vedere le proposte in delibera. Ogni proposta mostra il contesto legislativo, gli articoli proposti e i risultati in tempo reale.",
                },
                {
                  title: "3. Proponi Leggi",
                  desc: "Crea una nuova proposta legislativa. Descrivi il problema, il contesto e il dispositivo normativo che proponi. Le tue bozze restano private finché non le pubblichi.",
                },
                {
                  title: "4. Vota e Partecipa",
                  desc: "Accedi alla Cabina Elettorale e vota le proposte in delibera. Un cittadino, un voto. I risultati sono aggregati e visibili in tempo reale.",
                },
              ].map((step, idx) => (
                <div key={idx} className="card p-6 bg-slate-900/30 border border-slate-700/30">
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Principi */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-pangea-400" />
              <h2 className="text-2xl font-semibold text-white">I Nostri Principi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "🔒 Un Cittadino, Un Voto",
                  desc: "La sicurezza civile è garantita da vincoli relazionali PostgreSQL. Nessuno può votare due volte sulla stessa proposta.",
                },
                {
                  title: "🕵️ Privacy by Design",
                  desc: "I tuoi voti sono privati. Le policy di Row-Level Security impediscono l'accesso ai dati personali. Vediamo solo i risultati aggregati.",
                },
                {
                  title: "📊 Trasparenza Totale",
                  desc: "Tutte le proposte attive e gli esiti deliberativi sono pubblici. Chiunque può vedere il contesto legislativo e i voti aggregati.",
                },
                {
                  title: "⚖️ Conforme GDPR",
                  desc: "Consenso esplicito in registrazione, diritto all'oblio, dati limitati al minimo necessario. La democrazia digitale rispetta i diritti.",
                },
              ].map((principle, idx) => (
                <div key={idx} className="card p-6 bg-green-900/20 border border-green-700/30">
                  <h3 className="font-semibold text-green-300 mb-2">{principle.title}</h3>
                  <p className="text-slate-400 text-sm">{principle.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-6">Domande Frequenti</h2>
            <div className="space-y-4">
              {[
                {
                  q: "Come cambio il mio profilo?",
                  a: "Dalla dashboard, clicca sul tuo nome in alto a destra. Puoi modificare il tuo nome completo e la biografia.",
                },
                {
                  q: "Posso modificare una proposta dopo averla pubblicata?",
                  a: "No. Le proposte pubblicate sono immutabili per garantire l'integrità del processo deliberativo. Puoi creare una nuova proposta se necessario.",
                },
                {
                  q: "Quanto tempo ho per votare una proposta?",
                  a: "Dipende dalla scadenza della proposta. Ogni proposta mostra la data di scadenza. Dopo quella data, entra in archivio.",
                },
                {
                  q: "I miei dati sono al sicuro?",
                  a: "Sì. Usiamo Supabase con PostgreSQL, Row-Level Security, e crittografia. I dati sensibili non vengono mai archiviati in chiaro.",
                },
              ].map((item, idx) => (
                <div key={idx} className="card p-4 bg-slate-900/30 border border-slate-700/30">
                  <p className="font-semibold text-white mb-2">{item.q}</p>
                  <p className="text-slate-400 text-sm">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="card p-8 bg-pangea-900/30 border border-pangea-700/30 text-center">
            <h3 className="text-2xl font-semibold text-white mb-4">Pronto a Partecipare?</h3>
            <p className="text-slate-400 mb-6">
              Unisciti ai cittadini di Pangea e forma il futuro della democrazia digitale globale.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {user ? (
                <>
                  <Link href="/dashboard" className="btn-primary">
                    Torna alla Dashboard
                  </Link>
                  <Link href="/proposals/new" className="btn-secondary">
                    Proponi una Legge
                  </Link>
                </>
              ) : (
                <Link href="/auth" className="btn-primary">
                  Registrati Ora
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
