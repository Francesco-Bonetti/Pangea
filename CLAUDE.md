# CLAUDE.md — Agora · Piattaforma Democratica Pangea

> **Brain ausiliario dell'agente**. Questo file è la mappa architetturale del progetto.
> L'agente deve aggiornare la sezione STATE prima di ogni conclusione di task.

---

## WHAT — Mappatura dell'Architettura

### Stack Tecnologico
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Deploy**: Vercel
- **Supabase Project ID**: `lihgeljdaegjpbssyedf`
- **Supabase Region**: eu-west-1

### Struttura Directory
```
agora-pangea/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout + metadata SEO
│   │   ├── page.tsx                # Redirect intelligente (auth → dashboard)
│   │   ├── globals.css             # Tailwind + design system custom
│   │   ├── auth/
│   │   │   ├── page.tsx            # Login/Register (tabs) + GDPR consent
│   │   │   └── callback/route.ts   # OAuth callback handler
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Piazza Telematica (Server Component)
│   │   └── proposals/
│   │       ├── new/page.tsx        # Editor proposta legislativa
│   │       └── [id]/
│   │           ├── page.tsx        # Cabina Elettorale (Server Component)
│   │           └── not-found.tsx   # 404 personalizzato
│   ├── components/
│   │   ├── Navbar.tsx              # Navigation + logout
│   │   ├── ProposalCard.tsx        # Card con barre percentuali voti
│   │   └── VotingBooth.tsx         # Cabina elettorale interattiva (Client)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # createBrowserClient (CSR)
│   │   │   └── server.ts           # createServerClient (SSR)
│   │   ├── types.ts                # Interfacce TypeScript (Proposal, Vote, etc.)
│   │   └── utils.ts                # calcPercentage, formatDate, etc.
│   └── middleware.ts               # Auth guard (protegge /dashboard, /proposals/new)
├── .env.local                      # Credenziali Supabase (NON committare)
├── .env.example                    # Template variabili d'ambiente
├── CLAUDE.md                       # Questo file
└── package.json
```

---

## WHY — Logica di Dominio

**Agora** è la piattaforma di democrazia digitale della **Repubblica Democratica Globale Pangea**.

### Principi Architetturali Immutabili
1. **Un cittadino, un voto**: garantito dal vincolo `UNIQUE(proposal_id, voter_id)` a livello PostgreSQL
2. **Privacy by Design**: NESSUNA policy SELECT sulla tabella `votes` — le preferenze individuali sono irraggiungibili
3. **Trasparenza pubblica**: le proposte `active/closed` sono visibili a tutti (anon + authenticated)
4. **GDPR Art. 6 e 9**: consenso esplicito in fase di registrazione, voti aggregati solo via SECURITY DEFINER

### ⚠️ Regola critica RLS
La tabella `votes` NON ha policy SELECT. Qualsiasi tentativo di SELECT diretto fallirà con errore 403.
I risultati si leggono SOLO tramite `supabase.rpc('get_proposal_results', ...)`.

---

## HOW — Convenzioni Esecutive

### Comandi di sviluppo
```bash
npm run dev      # Avvia server locale http://localhost:3000
npm run build    # Build di produzione
npm run lint     # ESLint check
```

### Pattern Supabase
- Server Components: `import { createClient } from '@/lib/supabase/server'`
- Client Components: `import { createClient } from '@/lib/supabase/client'`
- RPC calls: `supabase.rpc('nome_funzione', { params })`

### Gestione stato di autenticazione
- Il middleware.ts protegge `/dashboard` e `/proposals/new`
- Il redirect avviene automaticamente tramite Next.js middleware
- Il profilo viene creato automaticamente via trigger `on_auth_user_created`

---

## DATABASE — Schema SQL

### Tabelle
```sql
-- profiles: estende auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- proposals: atti legislativi
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  dispositivo TEXT,
  status TEXT CHECK (status IN ('draft', 'active', 'closed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- votes: REGISTRO DELIBERATIVO (RLS blocco totale lettura)
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id) NOT NULL,
  voter_id UUID REFERENCES public.profiles(id) NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('yea', 'nay', 'abstain')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, voter_id)  -- CARDINE CIVILE: un cittadino, un voto
);
```

### Funzioni RPC (SECURITY DEFINER)
```sql
-- Risultati aggregati (nessun dato personale)
public.get_proposal_results(p_proposal_id UUID)
  RETURNS TABLE(yea_count BIGINT, nay_count BIGINT, abstain_count BIGINT)

-- Verifica partecipazione (solo booleano, mai il contenuto del voto)
public.has_user_voted(p_proposal_id UUID)
  RETURNS BOOLEAN
```

---

## STATE — Protocollo di Handoff

**Data ultimo aggiornamento**: 2026-03-31

### Task completati
- [x] Reset completo schema Supabase precedente
- [x] Creazione tabelle (profiles, proposals, votes) con vincoli FK
- [x] RLS abilitata su tutte le tabelle
- [x] Policy GDPR configurate (blocco lettura totale su votes)
- [x] Funzioni RPC `get_proposal_results` e `has_user_voted` con SECURITY DEFINER
- [x] Trigger `on_auth_user_created` per auto-creazione profilo
- [x] Progetto Next.js 14 con App Router
- [x] Middleware di autenticazione
- [x] Pagina Auth (login/register + GDPR consent)
- [x] Dashboard (Piazza Telematica) con grid proposte + barre percentuali
- [x] Editor proposta (bozza + pubblica)
- [x] Cabina Elettorale con VotingBooth (real-time results)

### Prossimi step
- [ ] Deploy Vercel con variabili d'ambiente
- [ ] Scheduled task per chiusura automatica proposte scadute
- [ ] Pagina profilo utente
- [ ] Funzionalità di modifica proposta (solo autore, solo status=draft)

### Variabili d'ambiente necessarie in Vercel
```
NEXT_PUBLIC_SUPABASE_URL=https://lihgeljdaegjpbssyedf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
