# Spec — Votação Retroativa via `/feedback/[token]`

**Data:** 2026-04-17
**Driver:** Beta test 3 (DM Lucas Galupo, 2026-04-16). Jogadores perderam o recap in-session, precisam votar a dificuldade retroativamente via link do WhatsApp.
**Escopo:** Pequeno (~2-3h). Reutiliza componentes e schema existentes.

---

## Contexto — o que já existe

- **Schema pronto:** [supabase/migrations/060_encounter_votes.sql](../supabase/migrations/060_encounter_votes.sql)
  - Tabela `encounter_votes(encounter_id, user_id, vote 1-5, voted_at)` com unique constraint por `(encounter_id, user_id)`
  - RPC `cast_late_vote(p_encounter_id, p_vote)` — upsert + recalcula `encounters.difficulty_rating/votes`
  - **Gap:** RPC exige `auth.uid()` + `campaign_members.role='player'`. Players anon de `/join/[token]` **não conseguem votar**.
- **UI pronta:** [components/combat/DifficultyRatingStrip.tsx](../components/combat/DifficultyRatingStrip.tsx) — 5 ícones (Coffee/Smile/Swords/Flame/Skull) com labels i18n
- **Share token existe:** [supabase/migrations/004_session_tokens.sql](../supabase/migrations/004_session_tokens.sql) — `session_tokens.token` já usado em `/join/[token]`
- **i18n:** keys `combat.poll_*` já traduzidas PT-BR (referência na `DifficultyPoll.tsx`)

---

## Decisão de arquitetura

**Usar o `session_tokens.token` existente** como path param, não criar token novo. Motivo:
- Players já têm o link de `/join/[token]` salvo (WhatsApp, browser history)
- Evita schema novo + segundo sistema de tokens
- Guest mode (`/try`) fica fora do escopo — guest já vota local in-session, não precisa persistir

Rota: **`/feedback/[token]`**
- `token` = `session_tokens.token` (mesmo valor do `/join/[token]`)
- Mostra o último encounter encerrado daquela sessão (ou lista, se múltiplos)
- Suporta voto anônimo (via session_token ownership) **E** autenticado

---

## Schema — Migration nova

Criar `supabase/migrations/XXX_late_vote_via_session_token.sql`:

```sql
-- Permite voto retroativo via session_token (anon players)
-- Mantém cast_late_vote original pra authenticated, adiciona variant anon

-- 1. Coluna opcional pra rastrear anon votes sem user_id
ALTER TABLE encounter_votes
  ADD COLUMN session_token_id UUID REFERENCES session_tokens(id) ON DELETE SET NULL,
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Unique: ou user_id OU session_token_id identifica o votante
DROP INDEX IF EXISTS encounter_votes_encounter_id_user_id_key;
CREATE UNIQUE INDEX encounter_votes_user_unique
  ON encounter_votes(encounter_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX encounter_votes_token_unique
  ON encounter_votes(encounter_id, session_token_id)
  WHERE session_token_id IS NOT NULL;

-- 3. Check: pelo menos um identificador
ALTER TABLE encounter_votes
  ADD CONSTRAINT encounter_votes_has_voter
  CHECK (user_id IS NOT NULL OR session_token_id IS NOT NULL);

-- 4. RPC nova (separada da original pra não quebrar callers existentes)
CREATE OR REPLACE FUNCTION cast_late_vote_via_token(
  p_token TEXT,
  p_encounter_id UUID,
  p_vote SMALLINT
) RETURNS JSONB AS $$
DECLARE
  v_token_id UUID;
  v_session_id UUID;
  v_ev_avg NUMERIC;
  v_ev_count INTEGER;
BEGIN
  -- Valida token e extrai session_id
  SELECT id, session_id INTO v_token_id, v_session_id
  FROM session_tokens
  WHERE token = p_token AND is_active = true;

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive session token';
  END IF;

  -- Valida encounter pertence à sessão do token
  IF NOT EXISTS (
    SELECT 1 FROM encounters WHERE id = p_encounter_id AND session_id = v_session_id
  ) THEN
    RAISE EXCEPTION 'Encounter does not belong to this session';
  END IF;

  -- Upsert via session_token_id
  INSERT INTO encounter_votes (encounter_id, session_token_id, vote)
  VALUES (p_encounter_id, v_token_id, p_vote)
  ON CONFLICT (encounter_id, session_token_id)
  DO UPDATE SET vote = p_vote, voted_at = now();

  -- Recalcula aggregate
  SELECT COALESCE(AVG(vote), 0), COUNT(*) INTO v_ev_avg, v_ev_count
  FROM encounter_votes WHERE encounter_id = p_encounter_id;

  UPDATE encounters
  SET difficulty_rating = ROUND(v_ev_avg, 1),
      difficulty_votes = GREATEST(v_ev_count, COALESCE(difficulty_votes, 0))
  WHERE id = p_encounter_id;

  RETURN jsonb_build_object('avg', ROUND(v_ev_avg, 1), 'count', v_ev_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION cast_late_vote_via_token FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cast_late_vote_via_token TO anon, authenticated;
```

### Decisões da migration

- **Nova RPC em vez de mudar a existente** — evita breaking change em qualquer caller de `cast_late_vote`
- **SECURITY DEFINER** — permite que anon escrevam em `encounter_votes` sem RLS INSERT policy pra anon (token-based auth via validação interna)
- **Check constraint** — garante que cada row tenha OU user_id OU session_token_id
- **Unique partial indexes** — mantém "um voto por votante por encounter" sem quebrar a constraint composta original

---

## Rota — `/feedback/[token]`

### Server component: `app/feedback/[token]/page.tsx`

Faz SSR:
1. Valida `token` via query em `session_tokens` (se inválido → 404)
2. Busca último encounter encerrado dessa session (`status='ended' ORDER BY ended_at DESC LIMIT 1`)
   - Se zero encounters → mostra mensagem "Nenhuma sessão encerrada ainda"
   - Se múltiplos → mostra seletor (lista 3 mais recentes)
3. Passa `encounterId`, `sessionName`, `dmName`, `endedAt` pro client component

### Client component: `app/feedback/[token]/FeedbackClient.tsx`

Layout mobile-first:
```
┌────────────────────────────────┐
│   🎲 PocketDM                  │
│                                │
│   Como foi o combate?          │
│   Sessão: [Nome da Sessão]     │
│   Mestre: [DM name]            │
│   Encerrado: [timestamp]       │
│                                │
│   [DifficultyRatingStrip]      │
│   ☕ 😊 ⚔️ 🔥 💀               │
│                                │
│   Comentário (opcional):       │
│   ┌──────────────────────────┐ │
│   │ textarea 280 chars       │ │
│   └──────────────────────────┘ │
│                                │
│   [Enviar voto]                │
└────────────────────────────────┘
```

Após submit:
```
┌────────────────────────────────┐
│   ✅ Obrigado pelo voto!        │
│                                │
│   Seu feedback ajuda o mestre  │
│   a calibrar próximos combates │
│                                │
│   [Ver detalhes do encontro]   │
│   [Jogar de novo]              │
└────────────────────────────────┘
```

### API route: `app/api/feedback/route.ts`

`POST /api/feedback`:
```ts
body: { token: string, encounter_id: string, vote: 1|2|3|4|5, notes?: string }
```

Handler:
1. Valida body com Zod
2. Chama RPC `cast_late_vote_via_token(token, encounter_id, vote)` via `supabase.rpc(...)`
3. Se `notes` presente, insert em nova tabela `encounter_feedback_notes` (scope adicional, opcional na v1)
4. Return `{ avg, count }` ou erro

**Rate limit:** IP-based, 10 req/min por token (middleware existente).

### i18n

Reusar keys `combat.poll_*` existentes. Adicionar:
- `feedback.page_title` — "Como foi o combate?"
- `feedback.encounter_info` — "Sessão: {name} · Mestre: {dm}"
- `feedback.submit_cta` — "Enviar voto"
- `feedback.thanks_title` — "Obrigado pelo voto!"
- `feedback.thanks_subtitle` — "Seu feedback ajuda o mestre a calibrar..."
- `feedback.notes_placeholder` — "Compartilhe um comentário (opcional)"
- `feedback.error_already_voted` — "Você já votou. Pode atualizar seu voto a qualquer momento."

---

## Geração do link (DM-side)

### Para a sessão do Lucas (imediato, one-off)

Query no Supabase pra achar o token ativo da sessão de 2026-04-16:

```sql
SELECT t.token, s.name AS session_name, e.id AS encounter_id
FROM session_tokens t
JOIN sessions s ON s.id = t.session_id
JOIN encounters e ON e.session_id = s.id
WHERE s.created_by = '<lucas_user_id>'
  AND e.ended_at > '2026-04-16'
ORDER BY e.ended_at DESC;
```

Construir URL: `https://pocketdm.com.br/feedback/<token>`

Mandar no WhatsApp do grupo.

### Para sessões futuras (automático)

Adicionar botão "Copiar link de feedback" na tela de recap do DM ([components/combat/RecapActions.tsx](../components/combat/RecapActions.tsx)):

```tsx
<Button onClick={() => copyToClipboard(`${origin}/feedback/${sessionToken}`)}>
  📊 Copiar link de feedback pro grupo
</Button>
```

---

## Edge cases

1. **Token revogado/inativo** — RPC retorna exception "Invalid or inactive session token". UI mostra "Este link expirou. Peça um novo ao mestre."
2. **Encounter ainda ativo** — filtra `status='ended'` no SSR. Se só tem active, mostra "Nenhum combate encerrado pra votar ainda"
3. **Já votou** — RPC usa upsert, permite trocar voto. UI mostra "Você já votou neste combate. Seu voto anterior era: [X]. Atualizar?"
4. **Múltiplos encounters na mesma session** — mostra seletor (lista top 3 mais recentes com timestamp + ID curto)
5. **Anon + authenticated no mesmo device** — user_id tem precedência se o visitante tá logado
6. **Notes abusivas** — limit 280 chars, strip HTML, opcional

---

## Parity Rule (Combat Parity)

| Modo | Aplica? | Racional |
|------|---------|----------|
| Guest (`/try`) | ❌ | Guest vota local in-session, não persiste em DB. Fora de escopo. |
| Anônimo (`/join/[token]`) | ✅ | Usa session_token, RPC nova `cast_late_vote_via_token` |
| Autenticado (`/invite/[token]`) | ✅ | Pode usar qualquer uma das duas RPCs. Preferir a original pra manter RLS por campaign_members |

---

## Testing

### Unit
- RPC `cast_late_vote_via_token` — token válido/inválido, encounter de outra session, vote fora de 1-5
- Upsert: voto duplicado atualiza em vez de duplicar

### E2E (Playwright)
1. Fluxo anon completo: navegar pra `/feedback/[token]` → selecionar estrela → submit → ver tela de thanks
2. Token inválido → mostra erro amigável
3. Sessão sem encounters encerrados → mensagem específica

---

## Observability

Tracking events novos:
- `feedback.page_viewed` — entrou em `/feedback/[token]`
- `feedback.vote_submitted` — submit bem-sucedido (vote, has_notes)
- `feedback.error_token_invalid` — token inválido
- `feedback.error_no_encounters` — session sem encounters

---

## Estimativa

| Tarefa | Tempo |
|--------|-------|
| Migration (schema + RPC) | 45min |
| Route + SSR lookup | 30min |
| Client component (reuso DifficultyRatingStrip) | 45min |
| API route + Zod + rate limit | 20min |
| i18n keys + Copy | 15min |
| E2E test | 30min |
| Botão "copiar link" no RecapActions | 15min |
| QA manual + query pro Lucas | 20min |
| **Total** | **~3h20** |

---

## Ordem de implementação

1. Migration (anon RPC + schema alter)
2. API route
3. Page + Client component
4. i18n keys
5. Botão no RecapActions (opcional v1)
6. E2E test
7. QA: rodar query pra sessão do Lucas, gerar link, testar link no mobile, mandar pro WhatsApp

---

## Riscos e premissas

- **R1 (médio):** `session_tokens.is_active` pode ter sido flipado pra false após a sessão. Checar no Supabase antes de confiar no link. Se inativo, reabrir temporariamente ou gerar novo token.
- **R2 (baixo):** `encounter_feedback_notes` é opcional na v1 — se o Lucas/jogadores quiserem texto aberto, adicionar depois.
- **R3 (baixo):** RPC `cast_late_vote_via_token` não valida que o token pertence a alguém específico — qualquer pessoa com o link pode votar (múltiplas vezes, uma por token). Aceitável pra beta; em prod futuro, linkar a `anon_user_id` + `player_name` ajuda.
- **P1:** Link é seguro pra compartilhar? Token dá acesso à sessão inteira — mesmo risco de compartilhar o `/join/[token]`. Aceitável (já era público).
