"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Loader2, Sparkles, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Knowledge base — covers all Pangea platform topics
const KNOWLEDGE_BASE: Record<string, { keywords: string[]; answer_en: string; answer_it: string; answer_es: string; answer_fr: string }> = {
  proposals: {
    keywords: ["proposal", "proposta", "propuesta", "proposition", "create", "creare", "submit", "draft", "how do i", "come faccio", "new proposal"],
    answer_en: "To create a proposal:\n1. Click 'New Proposal' in the sidebar\n2. Fill in the title, summary, and full content\n3. Add a simplified explanation so everyone can understand\n4. Choose tags and set the voting duration\n5. Optionally place it in the law tree\n6. Save as draft or submit for deliberation\n\nOnce submitted, citizens can discuss and vote on it. If approved, it becomes law!",
    answer_it: "Per creare una proposta:\n1. Clicca 'Nuova Proposta' nella barra laterale\n2. Compila titolo, riepilogo e contenuto completo\n3. Aggiungi una spiegazione semplificata\n4. Scegli i tag e la durata della votazione\n5. Posizionala nell'albero delle leggi (opzionale)\n6. Salva come bozza o invia per deliberazione\n\nUna volta inviata, i cittadini possono discuterla e votarla. Se approvata, diventa legge!",
    answer_es: "Para crear una propuesta:\n1. Haz clic en 'Nueva Propuesta' en la barra lateral\n2. Completa título, resumen y contenido\n3. Añade una explicación simplificada\n4. Elige etiquetas y duración de votación\n5. Posiciónala en el árbol de leyes (opcional)\n6. Guarda como borrador o envía a deliberación\n\n¡Si se aprueba, se convierte en ley!",
    answer_fr: "Pour créer une proposition:\n1. Cliquez sur 'Nouvelle Proposition' dans la barre latérale\n2. Remplissez titre, résumé et contenu\n3. Ajoutez une explication simplifiée\n4. Choisissez tags et durée du vote\n5. Placez-la dans l'arbre des lois (optionnel)\n6. Sauvegardez en brouillon ou soumettez\n\nSi approuvée, elle devient loi !",
  },
  voting: {
    keywords: ["vote", "voto", "voting", "votazione", "deliberation", "how to vote", "come votare"],
    answer_en: "The voting system works like this:\n• Each citizen gets one vote per proposal\n• You can vote Yes, No, or Abstain\n• Voting periods are set by the proposal author (3 to 30 days, or no expiry)\n• Once the voting period ends, if more than 50% voted Yes, the proposal is approved\n• Approved proposals automatically become operative laws\n• You can also delegate your vote to someone you trust",
    answer_it: "Il sistema di voto funziona così:\n• Ogni cittadino ha un voto per proposta\n• Puoi votare Sì, No o Astenerti\n• La durata del voto è impostata dall'autore (da 3 a 30 giorni, o senza scadenza)\n• Se più del 50% vota Sì, la proposta è approvata\n• Le proposte approvate diventano automaticamente leggi operative\n• Puoi anche delegare il tuo voto a qualcuno di fiducia",
    answer_es: "El sistema de votación funciona así:\n• Cada ciudadano tiene un voto por propuesta\n• Puedes votar Sí, No o Abstenerte\n• El período de votación lo fija el autor\n• Si más del 50% vota Sí, se aprueba\n• Las propuestas aprobadas se convierten en leyes\n• Puedes delegar tu voto a alguien de confianza",
    answer_fr: "Le système de vote fonctionne ainsi:\n• Chaque citoyen a un vote par proposition\n• Votez Oui, Non ou Abstention\n• La durée est fixée par l'auteur\n• Si plus de 50% votent Oui, c'est approuvé\n• Les propositions approuvées deviennent des lois\n• Vous pouvez déléguer votre vote",
  },
  delegations: {
    keywords: ["delegation", "delega", "deleghe", "delegación", "delegate", "delegare", "trust"],
    answer_en: "Delegations let you entrust your voting power to another citizen:\n• Go to Delegations in the sidebar\n• Choose a citizen to delegate to\n• You can delegate per topic or globally\n• The delegate votes on your behalf if you don't vote\n• You can revoke a delegation at any time\n• If you vote directly, your personal vote always takes precedence\n\nDelegations require acceptance — the other citizen must agree to represent you.",
    answer_it: "Le deleghe ti permettono di affidare il tuo potere di voto a un altro cittadino:\n• Vai a Deleghe nella barra laterale\n• Scegli a chi delegare\n• Puoi delegare per argomento o globalmente\n• Il delegato vota per te se non voti\n• Puoi revocare una delega in qualsiasi momento\n• Se voti direttamente, il tuo voto ha sempre la precedenza\n\nLe deleghe richiedono accettazione — l'altro cittadino deve accettare di rappresentarti.",
    answer_es: "Las delegaciones te permiten confiar tu voto a otro ciudadano:\n• Ve a Delegaciones en la barra lateral\n• Elige a quién delegar\n• Puedes delegar por tema o globalmente\n• Puedes revocar en cualquier momento\n• Tu voto directo siempre tiene precedencia",
    answer_fr: "Les délégations permettent de confier votre vote à un autre citoyen:\n• Allez dans Délégations\n• Choisissez à qui déléguer\n• Vous pouvez déléguer par sujet ou globalement\n• Votre vote direct a toujours la priorité",
  },
  groups: {
    keywords: ["group", "groups", "gruppo", "groups", "groupo", "groupe", "jurisdiction", "party", "community"],
    answer_en: "Groups are unified organizations within Pangea:\n• Jurisdictions: topic-based (e.g., Environment, Technology) or location-based (e.g., Europe, Asia)\n• Parties: political organizations with manifestos and members\n• Communities: topic-based groups for discussions and collaboration\n• Working groups: specialized task forces\n• Each group can have its own laws, proposals, and members\n• Groups can be nested (sub-groups)\n• The system detects conflicts between laws from different groups\n• You can follow groups to get updates in your feed",
    answer_it: "I gruppi sono organizzazioni unificate in Pangea:\n• Giurisdizioni: basate su temi (es. Ambiente, Tecnologia) o luoghi (es. Europa, Asia)\n• Partiti: organizzazioni politiche con manifesti e membri\n• Comunità: gruppi tematici per discussioni\n• Gruppi di lavoro: task force specializzate\n• Ogni gruppo può avere leggi, proposte e membri propri\n• Possono essere annidati\n• Il sistema rileva conflitti tra leggi di gruppi diversi\n• Puoi seguire i gruppi per ricevere aggiornamenti",
    answer_es: "Los grupos son organizaciones unificadas en Pangea:\n• Jurisdicciones: basadas en temas o ubicación\n• Partidos: organizaciones políticas con manifiestos\n• Comunidades: grupos temáticos\n• Grupos de trabajo: fuerzas de tareas especializadas\n• Cada grupo puede tener sus propias leyes y miembros",
    answer_fr: "Les groupes sont des organisations unifiées dans Pangea:\n• Juridictions: thématiques ou géographiques\n• Partis: organisations politiques avec manifestes\n• Communautés: groupes thématiques\n• Groupes de travail: forces de tâches spécialisées\n• Chaque groupe peut avoir ses propres lois et membres",
  },
  platform: {
    keywords: ["pangea", "platform", "piattaforma", "plataforma", "plateforme", "what is", "cos'è", "about", "how does"],
    answer_en: "Pangea is a global democratic platform where citizens can:\n• Propose new laws and amendments\n• Vote on proposals through direct or delegated democracy\n• Join political parties and discuss in the Agora\n• Participate in elections for official positions\n• Follow other citizens, parties, and jurisdictions\n• Send encrypted private messages\n\nEvery citizen has equal voting power. The platform is designed with privacy by design (GDPR-compliant) and full transparency in governance.",
    answer_it: "Pangea è una piattaforma democratica globale dove i cittadini possono:\n• Proporre nuove leggi e emendamenti\n• Votare le proposte con democrazia diretta o delegata\n• Unirsi a partiti politici e discutere nell'Agorà\n• Partecipare a elezioni per posizioni ufficiali\n• Seguire cittadini, partiti e giurisdizioni\n• Inviare messaggi privati crittografati\n\nOgni cittadino ha uguale potere di voto. Privacy by design e trasparenza totale.",
    answer_es: "Pangea es una plataforma democrática global donde los ciudadanos pueden proponer leyes, votar, unirse a partidos, participar en elecciones y discutir en el Ágora. Cada ciudadano tiene igual poder de voto.",
    answer_fr: "Pangea est une plateforme démocratique mondiale où les citoyens peuvent proposer des lois, voter, rejoindre des partis, participer aux élections et discuter sur l'Agora. Chaque citoyen a un pouvoir de vote égal.",
  },
  parties: {
    keywords: ["party", "partito", "partido", "parti", "political", "join", "create"],
    answer_en: "Political parties in Pangea:\n• Any citizen can create a party with a name, description, and manifesto\n• Parties are now unified under the Groups system\n• Citizens join parties using an 8-character alphanumeric code\n• Each party has a leader and members with vote weights\n• Parties can have their own messaging channels\n• Party activities appear in the feed of followers\n• Parties can endorse proposals and candidates",
    answer_it: "I partiti politici in Pangea:\n• Ogni cittadino può creare un partito\n• I partiti sono ora unificati nel sistema Gruppi\n• I cittadini si uniscono con un codice alfanumerico di 8 caratteri\n• Ogni partito ha un leader e dei membri con pesi di voto\n• I partiti possono avere canali messaggi propri\n• Le attività dei partiti appaiono nel feed dei follower",
    answer_es: "Los partidos políticos en Pangea: cualquier ciudadano puede crear uno, ahora unificados en el sistema Grupos, los miembros se unen con un código de 8 caracteres.",
    answer_fr: "Les partis politiques dans Pangea: tout citoyen peut en créer un, maintenant unifiés dans le système Groupes, les membres rejoignent avec un code de 8 caractères.",
  },
};

function findAnswer(query: string, locale: string): string {
  const q = query.toLowerCase();
  const langKey = `answer_${locale}` as keyof typeof KNOWLEDGE_BASE.proposals;

  // Score each topic
  let bestScore = 0;
  let bestAnswer = "";

  for (const [, topic] of Object.entries(KNOWLEDGE_BASE)) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.length; // longer keyword = more specific match
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = (topic[langKey] as string) || topic.answer_en;
    }
  }

  if (bestScore > 0) return bestAnswer;

  // Default fallback
  const fallback: Record<string, string> = {
    en: "I'm not sure about that specific topic. Try asking about: proposals, voting, delegations, groups, parties, how the platform works, or how to use the platform. You can also browse the About page for more details.",
    it: "Non sono sicuro di questo argomento specifico. Prova a chiedere di: proposte, voto, deleghe, gruppi, partiti, o come funziona la piattaforma.",
    es: "No estoy seguro de ese tema. Prueba a preguntar sobre: propuestas, votación, delegaciones, grupos, partidos o cómo funciona la plataforma.",
    fr: "Je ne suis pas sûr de ce sujet. Essayez de demander sur: propositions, vote, délégations, groupes, partis ou le fonctionnement de la plateforme.",
  };
  return fallback[locale] || fallback.en;
}

export default function AiAssistant() {
  const { t, locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    if (!input.trim() || thinking) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const answer = findAnswer(userMsg.content, locale);
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setThinking(false);
    }, 600 + Math.random() * 800);
  }

  const suggestions = t("ai.suggestions") as unknown as string[];

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-500/40 flex items-center justify-center transition-all duration-200 hover:scale-105"
          aria-label="Open AI Assistant"
          title={t("ai.title")}
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600/10 to-blue-600/10" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{t("ai.title")}</p>
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  <Sparkles className="w-3 h-3 inline mr-0.5" />
                  {t("ai.disclaimer")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                {/* Welcome */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-600/10 to-blue-600/10 text-sm" style={{ color: "var(--foreground)" }}>
                  {t("ai.welcome")}
                </div>
                {/* Suggestions */}
                <div className="space-y-1.5">
                  {(Array.isArray(suggestions) ? suggestions : []).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(s);
                        setTimeout(() => {
                          const synth = { target: { value: s } };
                          setInput(s);
                        }, 0);
                      }}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border hover:bg-[var(--muted)] transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                    >
                      <MessageCircle className="w-3 h-3 inline mr-1.5" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "rounded-bl-sm"
                  }`}
                  style={msg.role === "assistant" ? {
                    backgroundColor: "var(--muted)",
                    color: "var(--foreground)",
                  } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl rounded-bl-sm text-sm flex items-center gap-2" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("ai.thinking")}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ai.placeholder")}
                className="flex-1 bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
