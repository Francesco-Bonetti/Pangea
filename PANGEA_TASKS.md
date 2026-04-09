# PANGEA — Task Tracker & Storico

> Ultimo aggiornamento: 2026-04-09
> Questo file viene aggiornato da Claude ad ogni sessione di lavoro.
> Le task completate restano come memoria storica.

---

## LEGENDA STATI
- ✅ DONE — Completato (con data)
- 🔄 IN PROGRESS — In lavorazione
- 📋 TODO — Da fare
- ⏸️ PAUSED — Sospeso (con motivo)
- ❌ DROPPED — Abbandonato (con motivo)

## LEGENDA PRIORITÀ
- P0: Fix immediati / bloccanti
- P1: Core architecture
- P2: Feature avanzate
- P3: Contenuti e struttura
- P4: Visualizzazione e blockchain

---

# ═══════════════════════════════════════════
# COMPLETATI (Storico)
# ═══════════════════════════════════════════

## Fase 1-4 — Fondamenta (pre-2026-04)
| ID | Task | Data |
|----|------|------|
| — | Auth email + guest + ruoli (admin/moderator/citizen) | ✅ |
| — | Codici cittadino PAN-XXXXXXXX | ✅ |
| — | Proposte (draft→curation→active→closed) + voto slider % | ✅ |
| — | Curatela automatica proposte | ✅ |
| — | Catalogo leggi gerarchico + conversione proposte→leggi (RPC cron) | ✅ |
| — | Deleghe transitive con consenso + prevenzione cicli | ✅ |
| — | Partiti (fondazione, iscrizione, voti, forum) | ✅ |
| — | Sotto-giurisdizioni + conflitti leggi | ✅ |
| — | Elezioni (upcoming→candidature→voting→closed) | ✅ |
| — | i18n completo 4 lingue + traduzione automatica LibreTranslate | ✅ |
| — | Privacy (25+ campi, PrivacyName, 3 modalità) | ✅ |
| — | DM E2E (tweetnacl) + follow + feed + bug report | ✅ |
| — | Hash integrity (SHA-256, Merkle) + 8 indici DB + paginazione | ✅ |
| — | Security headers + audit log + rate limiting | ✅ |
| — | Ricerca full-text | ✅ |

## Fase A — UID & Gruppi ricorsivi (2026-04)
| ID | Task | Data |
|----|------|------|
| A1 | UID universali (prefisso 3 lettere + 8 alfanumerici) | ✅ 2026-04 |
| A2 | Gruppi ricorsivi (tutto è un gruppo: jurisdiction/party/community/working_group/religion) | ✅ 2026-04 |
| A3 | Rename Agora (sezione discussioni distinta dalla piattaforma) | ✅ 2026-04 |

## Fase B — Agora UX & Albero (2026-04)
| ID | Task | Data |
|----|------|------|
| B1 | Agora UX redesign | ✅ 2026-04 |
| B2 | Tree structure (PangeaTree.tsx) | ✅ 2026-04 |
| B3 | Tagging universale @/# | ✅ 2026-04 |
| B4 | Group discussions | ✅ 2026-04 |
| B5 | Personal posts | ✅ 2026-04 |

## Fase C — Messaging & Notifiche (2026-04)
| ID | Task | Data |
|----|------|------|
| C1 | Messaging standalone | ✅ 2026-04 |
| C2 | Push notifications | ✅ 2026-04 |
| C3 | Message badge | ✅ 2026-04 |

## Fase D — Privacy & Settings (2026-04)
| ID | Task | Data |
|----|------|------|
| D1 | Extended privacy (JSONB settings) | ✅ 2026-04 |
| D2 | Settings collapsible tree | ✅ 2026-04 |

## Ristrutturazione architetturale (2026-04-07/08)
| ID | Task | Data |
|----|------|------|
| — | Commonwealth + Party + group_links | ✅ 2026-04-07 |
| — | Charter fondamentale inserito (30 articoli, 5 Titoli) | ✅ 2026-04-07 |
| — | 212 leggi create (36 root + 176 Commonwealth) | ✅ 2026-04-07 |
| — | Navbar ristrutturata: Gruppi→Leggi→Proposte→Elezioni→Agorà→About | ✅ 2026-04-08 |
| — | Registry centralizzato nodi (platform-nodes.ts, 38 nodi) | ✅ 2026-04-08 |
| — | TreeViewer3D generico riusabile | ✅ 2026-04-08 |
| — | LawsTree3D (tab "3D View" nelle leggi) | ✅ 2026-04-08 |
| — | DB migration: `religion` aggiunto a groups.group_type | ✅ 2026-04-08 |
| — | Route legacy redirect (/jurisdictions, /parties → /groups) | ✅ 2026-04-08 |

---

# ═══════════════════════════════════════════
# DIAMOND EDITION — SECURE MVP CORE
# ═══════════════════════════════════════════
# Nuova direzione architetturale (2026-04-09)
# Principio: Thin Protocol (Core) / Fat Application (Edge)
# Il Core deve essere blindato prima del lancio.

## STEP 1 — Identity Foundation (T0-T2)
| ID | Task | Stato | Note |
|----|------|-------|------|
| DE-01 | Aggiungere `identity_tier` (0-3) a tabella `profiles` | ✅ DONE 2026-04-09 | Default 0, CHECK 0-3, index |
| DE-02 | Creare tabella `user_identity_proofs` (provider_type, proof_hash UNIQUE) | ✅ DONE 2026-04-09 | Anti-Sybil + verify_identity RPC |
| DE-03 | Modificare RLS per rispettare i tier (T0: sola lettura + commenti lenti, T2: voto/proposte) | ✅ DONE 2026-04-09 | has_min_tier() SD, votes/proposals T2+, delegations T1+ |
| DE-04 | UI Progressive Disclosure: popup "Verifica Sovranità" solo su Vota/Proponi | ✅ DONE 2026-04-09 | TierGate + useTierGate, integrato in VotingBooth |
| DE-05 | Simulatore SPID/CIE: generazione `spid_hash` per testing (Hash CF + Salt) | ✅ DONE 2026-04-09 | IdentitySimulator.tsx, SHA-256 client-side |

## STEP 2 — Thermodynamic Cooldown (Attrito anti-spam)
| ID | Task | Stato | Note |
|----|------|-------|------|
| DE-06 | Creare tabella `user_activity_stats` (contatori azioni, timestamp, strike) | ✅ DONE 2026-04-09 | Edge, 8 action types, UNIQUE(user,action) |
| DE-07 | Creare tabella `system_config` (parametri formula: C, γ, β, S per tier) | ✅ DONE 2026-04-09 | 11 parametri seed, RLS admin-only write |
| DE-08 | RPC `get_pangea_cooldown(user_uid, action_type)` — formula TA | ✅ DONE 2026-04-09 | TA = C·e^(1+(τ/A)^γ)·(1+β·D²)·S, SECURITY DEFINER |
| DE-09 | RPC `check_pangea_access(user_uid, action_type)` — gate pre-azione | ✅ DONE 2026-04-09 | Ritorna can_proceed + wait_seconds |
| DE-10 | Quorum di Protezione: D²=0 se voti T2+ < Qmin (anti-oligarchia) | ✅ DONE 2026-04-09 | Integrato in DE-08, Qmin=20 default |
| DE-11 | UI timer/feedback: mostra countdown + CTA "Verifica identità per ridurre attesa" | ✅ DONE 2026-04-09 | CooldownTimer.tsx component, integrato in VotingBooth |

### STEP 2b — Anti-Spam Hardening (post-analisi Gemini Deep Research)
> Migrazione: `20260409_antispam_hardening.sql` — 5 fix alla formula TA v2

| ID | Task | Stato | Note |
|----|------|-------|------|
| FIX-01 | Strike Decay: `effective_strikes = max(0, strikes - floor(days/30))` | ✅ DONE 2026-04-09 | Bug fix: prima gli strike erano permanenti |
| FIX-02 | Qmin Dinamico: `Qmin = max(5, floor(T2_attivi × 0.1))` | ✅ DONE 2026-04-09 | Risolve bootstrap: con pochi T2, D² ora funziona |
| FIX-03 | Gamma Adattivo per azione: comment=1.2, law=2.5, vote=1.8-2.0 | ✅ DONE 2026-04-09 | 8 override in system_config |
| FIX-04 | Burst Detection: penalizza ×3 se ≥3 azioni in 5min | ✅ DONE 2026-04-09 | Colonna burst_action_timestamps[], record_user_action v2 |
| FIX-05 | Config per Staking Quadratico: cap 2^8, params futuri | ✅ DONE 2026-04-09 | Preparazione per DE-18/22 |

## STEP 3 — Secure Ballot (Voto Cieco Commit-and-Reveal)
| ID | Task | Stato | Note |
|----|------|-------|------|
| DE-12 | Colonna `is_final` (boolean) in `votes` — sigillo definitivo | ✅ DONE 2026-04-09 | seal_proposal_votes RPC, index su is_final |
| DE-13 | Voto Fluido: UPSERT illimitato fino a expires_at (se !is_final) | ✅ DONE 2026-04-09 | upsert_proposal_vote + get_my_proposal_vote RPCs, VotingBooth refactored |
| DE-14 | Commit fase: client genera Salt, invia Hash(Voto+Salt) a Supabase | ✅ DONE 2026-04-09 | vote-hash.ts, SHA-256 client+server |
| DE-15 | UI: nascondere percentuali Sì/No durante fase attiva (solo affluenza) | ✅ DONE 2026-04-09 | get_proposal_turnout RPC, EyeOff icon |
| DE-16 | Reveal fase: Edge Function decripta con chiave privata elezione | 📋 TODO | Compromesso Web2.5 accettato |
| DE-17 | UI: risultati visibili solo dopo scadenza timer | ✅ DONE 2026-04-09 | Bars hidden during active, shown on closed |

## STEP 4 — Quadratic Staking (Proof of Competence)
| ID | Task | Stato | Note |
|----|------|-------|------|
| DE-18 | Prima legge gratuita per ogni T2 | ✅ DONE 2026-04-09 | get_pangea_cooldown v3: is_first_law_free, staking_first_law_free config |
| DE-19 | Sistema Strike (F): legge respinta → F+1, approvata → F=0 | ✅ DONE 2026-04-09 | process_proposal_outcome RPC, integrato in close_expired_proposals cron |
| DE-20 | Cooldown esponenziale: Cbase · 2^max(0, F - Δt/τ) tradotto in TEMPO | ✅ DONE 2026-04-09 | get_pangea_cooldown v3 con staking_info, StakingInfo.tsx component |
| DE-21 | Incubatore off-chain: legge draft→100 upvote T2+→Free Pass (no Strike) | ✅ DONE 2026-04-09 | update_incubator_count RPC + trigger su discussion_votes, incubator_passed flag |
| DE-22 | Decadimento temporale: 1 strike rimosso ogni 30 giorni | ✅ DONE 2026-04-09 | **Fatto in FIX-01** — calcolo dinamico in get_pangea_cooldown v2 |

## STEP 5 — Albero 2D (Navigazione principale)
| ID | Task | Stato | Note |
|----|------|-------|------|
| DE-23 | Albero 2D orizzontale (default) | ✅ DONE 2026-04-09 | TreeViewer2D v3: Miller-column, SVG bezier, scrollTo auto |
| DE-24 | Nodi: Logo + Titolo + Descrizione + Azione + Espandi | ✅ DONE 2026-04-09 | 300px cards, hover-expand desc, accent bar, breadcrumb |
| DE-25 | Toggle 3D opzionale (TreeViewer3D esistente) | ✅ DONE 2026-04-09 | 2D/3D pill toggle in PangeaTree.tsx |
| DE-26 | Dati da DB (non hardcoded) — usa platform-nodes.ts + query gruppi | 📋 TODO | Struttura ad albero ricorsiva |

## STEP 6 — Deleghe & Manutenzione democrazia
| ID | Task | Stato | Note |
|----|------|-------|------|
| DE-27 | Aggiungere `last_pinged_at` + aggiornare `status` in `delegations` | 📋 TODO | |
| DE-28 | Cron job: ping conferma ogni 6 mesi, revoca dopo 30gg senza risposta | 📋 TODO | status→expired |

---

# ═══════════════════════════════════════════
# BACKLOG (Task precedenti ancora validi)
# ═══════════════════════════════════════════

## Da Roadmap T01-T20
| ID | Task | Stato | Note |
|----|------|-------|------|
| T01 | Settings: convertire in albero collapsibile | ✅ DONE | Integrato in D2 |
| T02 | Fix bottone messaggi flottante (z-index?) | 📋 TODO | Minore |
| T03 | Account Guardian (super-admin Francesco, non eliminabile) | 📋 TODO | Sunset clause nel Charter |
| T04 | Home ad albero → **sostituito da DE-23/25** | ❌ SUPERATO | Era 3D, ora 2D default |
| T05 | Ruoli completi nei gruppi (10 ruoli + matrice permessi) | 📋 TODO | |
| T06 | Co-fondazione gruppi (più founder pari livello) | 📋 TODO | |
| T07 | Bot AI moderatore (solo report, MAI azioni auto) | 📋 TODO | |
| T08 | Azioni concrete nei Discussion Reports (ban, rimuovi, avviso) | 📋 TODO | |
| T09 | Gruppi come mini-Pangea (leggi proprie, elezioni, Agorà, sotto-gruppi) | 📋 TODO | Core per scalabilità |
| T10 | Impostazioni gerarchiche parent→child (lucchetto su settings bloccate) | 📋 TODO | |
| T11 | Molte più opzioni gruppi (identità, governance, membership, ecc.) | 📋 TODO | Organizzate ad albero |
| T12 | Rating stelline 1-5 per gruppi | 📋 TODO | |
| T13 | Posizioni pubbliche + prime elezioni (mod→legislatori→giudiziari) | 📋 TODO | |
| T14 | Albero pagine nelle leggi (sito aggiorna albero, non viceversa) | 📋 TODO | |
| T15 | Pre-costituire gruppi reali del mondo (locked/unclaimed) | 📋 TODO | |
| T16 | Creazione nuovi gruppi "real" con verifica proprietario | 📋 TODO | |
| T17 | Gruppo "Religions" come ramo principale | ✅ DONE | Fatto in ristrutturazione |
| T18 | Registrazione siti ufficiali giurisdizioni (campo official_website) | 📋 TODO | |
| T19 | Visualizzazione 3D universale → **integrato in DE-25** | ❌ SUPERATO | TreeViewer3D esiste, diventa toggle |
| T20 | Blockchain anchoring (hash voti/leggi su chain) | 📋 TODO | Fase 2-3 |

## Anti-Sybil Layer (medio termine)
| ID | Task | Stato | Note |
|----|------|-------|------|
| AS-01 | Device fingerprint per T0/T1 (limitare upvote farm con 100 account email) | 📋 TODO | Accettabile per MVP, necessario pre-scaling. Libreria: FingerprintJS open-source |
| AS-02 | Rate-limit per IP subnet (Supabase Edge Function o Vercel middleware) | 📋 TODO | Complemento a fingerprint, non sostitutivo |
| AS-03 | Honeypot fields per form di registrazione | 📋 TODO | Zero-cost anti-bot, facile da implementare |
| AS-04 | Anomaly detection: alert se un IP crea >5 account in 24h | 📋 TODO | Log-based, non bloccante |

## Fase E — Data & Testing
| ID | Task | Stato | Note |
|----|------|-------|------|
| E1 | Clean old data + recreate examples (account Claude 1-7) | 📋 TODO | |
| E2 | Automated testing (Playwright via Chrome/Kapture) | 📋 TODO | |

## Fase F — Ecosystem
| ID | Task | Stato | Note |
|----|------|-------|------|
| F1 | API pubblica RESTful (Swagger, API key+OAuth2, rate limiting) | 📋 TODO | Prerequisito per F2-F5 |
| F2 | Plugin system | 📋 TODO | |
| F3 | Pangea Store (marketplace) | 📋 TODO | |
| F4 | Flagship apps (Analytics, Calendar, Polls, Export, AI Assistant) | 📋 TODO | |
| F5 | Integrazioni (Google Cal, Telegram, Discord, Notion, KYC) | 📋 TODO | |

## Fase H — Hardening architetturale (ispirato da analisi letteratura)
> Queste task derivano dal report Gemini Deep Search su architetture core-plugin.
> Alcune sono complesse e non urgenti, ma potenzialmente utili man mano che Pangea scala.

| ID | Task | Stato | Complessità | Note Claude |
|----|------|-------|-------------|-------------|
| H-01 | Error Boundaries per sezione: Core (voti, leggi) e Edge (feed, DM) isolati | 📋 TODO | Bassa | **Consiglio: fare presto.** È solo un wrapper React. Se il feed crasha, un voto in corso non deve interrompersi. Facile e ad alto impatto. |
| H-02 | DTO layer: creare types/ con interfacce pure per i confini Core→Edge | 📋 TODO | Bassa | **Consiglio: fare durante refactor.** Oggi usiamo già i tipi TS, ma non c'è un confine esplicito. Basta creare `types/core.ts` e `types/edge.ts` e importare quelli invece degli oggetti Supabase raw. |
| H-03 | Dependency graph check: script che verifica che nessun file Core importi da Edge | 📋 TODO | Media | **Opinione: utile ma non urgente.** Si può fare con un linting rule (eslint-plugin-boundaries) o uno script bash. Oggi il rischio è basso perché siamo in due (io e te), ma diventa critico se altri contribuiscono. |
| H-04 | Contract Testing leggero: test automatici che verificano che le RPC Core ritornino la shape attesa | 📋 TODO | Media | **Opinione: over-engineering oggi.** Il report Gemini suggerisce Pact e CI/CD — per un team di 1 persona è troppo. Però un file di test con 5-10 chiamate RPC che verificano la shape del risultato (tipo `expect(result).toHaveProperty('identity_tier')`) sarebbe utile prima del lancio pubblico. |
| H-05 | Audit sicurezza RLS: verificare che ogni tabella Core abbia policy adeguate e nessun bypass | 📋 TODO | Media | **Consiglio: fare prima del lancio.** Il caso CVE-2026-23550 (WordPress Modular DS) nel report mostra come un plugin che bypassa il middleware auth sia devastante. Le nostre RLS sono il middleware equivalente. |
| H-06 | Event Bus asincrono per comunicazione Core→Edge | 📋 TODO | Alta | **Opinione: troppo complesso oggi.** Il report suggerisce Event Bus per disaccoppiare core e plugin. Per Pangea oggi non serve — le nostre "comunicazioni" sono query Supabase dirette. Diventa rilevante solo se implementiamo il Plugin System (F2). Tenere come riferimento concettuale. |
| H-07 | Semantic Versioning per API pubblica (quando esisterà) | 📋 TODO | Media | **Opinione: prematura.** Non abbiamo ancora un'API pubblica (F1). Quando la creeremo, adottare SemVer fin dal giorno 1 per i contratti JSON. Il report cita Stripe come modello — rolling versions con retrocompatibilità lunga. |
| H-08 | Deleghe transitive: benchmark performance con grafo >1000 nodi | 📋 TODO | Alta | **Consiglio: fare prima di andare in produzione con utenti reali.** Il report cita LiquidFeedback e i paper accademici sulla complessità computazionale della delega transitiva. La nostra implementazione è in RPC PostgreSQL (bene), ma non è mai stata testata con grafi grandi. Un loop infinito o una query O(n³) con 10k utenti può bloccare il DB. |

## Fase G — Polish
| ID | Task | Stato | Note |
|----|------|-------|------|
| G1 | i18n audit completo (schedulato settimanale) | 📋 TODO | ~30 stringhe hardcoded residue |
| G2 | PWA (manifest, service worker, installabilità mobile) | 📋 TODO | |

## Bug attivi
| Severità | Descrizione | Stato |
|----------|-------------|-------|
| Minore | ~30 stringhe hardcoded non-i18n (VotingBooth, KeySetup, MessagesClient, ecc.) | 📋 TODO |

---

# ═══════════════════════════════════════════
# FUTURO (Strategia 3 Fasi — North Star)
# ═══════════════════════════════════════════

## Fase 1: Repubblica Digitale Minima (ora → 6 mesi)
Diamond Edition Steps 1-6 + Backlog selezionato.
Democrazia liquida, Living Codes, storico leggi, identità civica.
NO layer economico.

## Fase 2: Layer Economico (6-18 mesi)
LUXIAN su sidechain Bitcoin, NEXUS wallet, Treasury DAO, DAO LLC.
T3 Garanti con staking reale + slashing a cascata.
Lending agreements (Mudarabah/Musharakah).

## Fase 3: Sovranità Completa (18-36 mesi)
DLC bridge trustless, Arbiters' Council staking.
Sovereignty as a Service, Quadratic Funding.
Migrazione Core su Layer 2 / IPFS.
