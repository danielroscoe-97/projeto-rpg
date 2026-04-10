# Code Review Fixes — DM Campaign Journey v2

**Data:** 2026-04-10
**Escopo:** 3 sprints auditados, 66 findings, 7 CRITICAL, 12 BUG
**Estrategia:** 2 agentes paralelos (Agent A + Agent B)
**Pre-requisito:** Nenhum — fixes sao independentes entre si

---

## Divisao por Agente

```
AGENT A: Backend & Safety               AGENT B: Frontend & i18n
─────────────────────────────            ─────────────────────────
F1  Archived campaigns block             F4  i18n hardcoded strings (~30)
F2  startSession before navigate         F6  Dashboard health badge data
F5  max_players default → 10             F10 date_absolute i18n fix
F7  Require archive before delete        F11 Health level growing vs active
F8  SessionPlanner → server action       F13 Duplicate i18n key
F9  Session status transitions           F14 Auto-save dirty tracking
F12 Join code default expiration         F3  Onboarding completed flag
F15 Campaign creation atomic RPC
```

---

## AGENT A: Backend & Safety

### F1 — Bloquear acesso a campanhas arquivadas

**Severidade:** CRITICAL
**Problema:** Campanhas arquivadas continuam acessiveis via join link e URL direta.
**Arquivos:**

1. `app/join-campaign/[code]/page.tsx`
   - Na query de campaign (linha ~19), adicionar `.eq("is_archived", false)`
   - Se campanha esta arquivada, mostrar pagina de erro: "Esta campanha foi arquivada pelo mestre."

2. `app/join-campaign/[code]/actions.ts`
   - Na query de campaign (linha ~39), adicionar `.eq("is_archived", false)`

3. `app/app/campaigns/[id]/page.tsx`
   - Na query de campaign (linha ~35-44), buscar `is_archived`
   - Se `is_archived === true`, renderizar banner "Campanha arquivada" com botao "Restaurar" (DM only) ou "Voltar ao dashboard" (player)
   - Bloquear quick actions (New Combat, Invite, etc.) quando arquivada

**Criterio de done:** Campanha arquivada nao aceita joins e mostra estado read-only no hub.

---

### F2 — Chamar startSession antes de navegar

**Severidade:** BUG
**Problema:** Hero navega pra sessao sem mudar status de "planned" → "active".
**Arquivo:** `app/app/campaigns/[id]/CampaignHero.tsx`

- Localizar o `onStart` handler do NextSessionCard (linha ~148-155)
- Antes do `router.push(...)`, chamar:
  ```ts
  import { startSession } from "@/lib/supabase/campaign-sessions"
  await startSession(session.id)
  ```
- Tratar erro: se startSession falhar, mostrar toast e nao navegar

**Criterio de done:** Clicar "Iniciar Sessao" muda status no DB antes de navegar.

---

### F5 — max_players default consistente

**Severidade:** BUG
**Problema:** `campaign-settings.ts` insere `max_players: 8`, DB default e 10, UI default e 10.
**Arquivo:** `lib/supabase/campaign-settings.ts`

- Linha ~88: mudar `max_players: 8` → `max_players: 10`

**Criterio de done:** Valor consistente 10 em todos os lugares.

---

### F7 — Exigir archive antes de delete permanente

**Severidade:** CRITICAL
**Problema:** `CampaignArchiveDialog` permite hard delete sem checar se campanha esta arquivada.
**Arquivo:** `components/campaign/CampaignArchiveDialog.tsx`

- No `handleDelete` (linha ~96-118), adicionar check no inicio:
  ```ts
  if (!isArchived) {
    toast.error(t("must_archive_first"))
    return
  }
  ```
- Desabilitar botao "Excluir permanentemente" visualmente quando `!isArchived`
- Adicionar chave i18n: `campaignSettings.must_archive_first`

**Criterio de done:** Delete so funciona em campanhas ja arquivadas.

---

### F8 — SessionPlanner usar server action

**Severidade:** CRITICAL
**Problema:** `SessionPlanner.tsx` faz insert direto no client em vez de usar `createSession()`.
**Arquivo:** `components/campaign/SessionPlanner.tsx`

- Remover import de `createClient` e `useMemo(() => createClient())`
- Substituir bloco de insert direto (linhas ~63-113) por:
  ```ts
  import { createSession, startSession } from "@/lib/supabase/campaign-sessions"

  const result = await createSession(campaignId, {
    name: name || `Session ${nextNumber}`,
    description,
    scheduled_for: scheduledFor || null,
    prep_notes: prepNotes || null,
    status: startNow ? "active" : "planned",
  })
  ```
- Se `startNow`, chamar `startSession(result.id)` apos criar
- Manter toast + router.push + onOpenChange(false) no success path

**Criterio de done:** Zero client-side Supabase imports no SessionPlanner. Usa server action com analytics.

---

### F9 — Validacao de transicao de status em sessions

**Severidade:** CRITICAL
**Problema:** `startSession`, `cancelSession`, `completeSession` fazem UPDATE sem checar status atual.
**Arquivo:** `lib/supabase/campaign-sessions.ts`

- `startSession`: adicionar `.eq("status", "planned")` no UPDATE. Checar `count === 0` → throw/return error "Session is not in planned state"
- `cancelSession`: adicionar `.in("status", ["planned", "active"])`. Nao permitir cancelar completed.
- `completeSession`: adicionar `.eq("status", "active")`. Nao permitir completar planned diretamente.
- Retornar `{ success: false, error: "invalid_transition" }` quando transicao invalida

**Criterio de done:** Transicoes invalidas retornam erro em vez de executar silenciosamente.

---

### F12 — Join code auto-gerado com expiracao default

**Severidade:** BUG
**Problema:** GET handler auto-gera code quando null mas nao seta expiracao.
**Arquivo:** `app/api/campaign/[id]/join-link/route.ts`

- No bloco GET onde `join_code` e null e gera um novo (linha ~62-70):
  ```ts
  const DEFAULT_EXPIRY_DAYS = 30
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS)
  ```
- Salvar `join_code_expires_at: expiresAt.toISOString()` na tabela `campaign_settings` junto com a geracao do code

**Criterio de done:** Todo join code auto-gerado tem expiracao de 30 dias.

---

### F15 — Campaign creation atomica (RPC)

**Severidade:** CRITICAL
**Problema:** 3 inserts separados (campaign, member, settings) sem transacao.
**Arquivo:** Nova migration + `lib/supabase/campaign-settings.ts`

1. Criar migration `supabase/migrations/XXX_create_campaign_atomic.sql`:
   ```sql
   CREATE OR REPLACE FUNCTION create_campaign_with_settings(
     p_owner_id UUID,
     p_name TEXT,
     p_description TEXT DEFAULT NULL,
     p_game_system TEXT DEFAULT '5e',
     p_party_level INTEGER DEFAULT 1,
     p_theme TEXT DEFAULT NULL,
     p_is_oneshot BOOLEAN DEFAULT false
   ) RETURNS JSON AS $$
   DECLARE
     v_campaign_id UUID;
     v_join_code TEXT;
   BEGIN
     -- Generate join code
     v_join_code := upper(substr(md5(random()::text), 1, 8));

     -- Insert campaign
     INSERT INTO campaigns (owner_id, name, description, join_code, join_code_active)
     VALUES (p_owner_id, p_name, p_description, v_join_code, true)
     RETURNING id INTO v_campaign_id;

     -- Insert settings
     INSERT INTO campaign_settings (campaign_id, game_system, party_level, theme, is_oneshot, max_players)
     VALUES (v_campaign_id, p_game_system, p_party_level, p_theme, p_is_oneshot, 10);

     -- DM member is auto-inserted by trigger handle_new_campaign()

     RETURN json_build_object(
       'campaign_id', v_campaign_id,
       'join_code', v_join_code
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. Atualizar `campaign-settings.ts` → `createCampaignWithSettings`:
   - Substituir 3 inserts por: `supabase.rpc("create_campaign_with_settings", { ... })`
   - Remover logica de rollback manual

**Criterio de done:** Criacao de campanha e uma unica operacao atomica no DB.

---

## AGENT B: Frontend & i18n

### F4 — i18n hardcoded strings → traducoes

**Severidade:** WARNING (mas impacta UX de EN users)
**Problema:** ~30 strings hardcoded em portugues/ingles espalhadas em 5 arquivos.
**Arquivos e strings a mover:**

1. **`app/join-campaign/[code]/page.tsx`** (~5 strings):
   - "Link invalido ou expirado" → `joinCampaign.error_invalid_link`
   - "Este link foi desativado pelo mestre" → `joinCampaign.error_link_disabled`
   - "Esta campanha atingiu o limite de jogadores" → `joinCampaign.error_campaign_full`
   - "Voltar ao inicio" → `joinCampaign.back_home`
   - Usar `getTranslations("joinCampaign")` (server component)

2. **`components/campaign/InvitePlayerDialog.tsx`** (~15 strings):
   - "Link copiado!" → `campaign.invite_link_copied`
   - "Link renovado!" → `campaign.invite_link_renewed`
   - "Gerando link..." → `campaign.invite_generating`
   - "Desativar Link" / "Ativar Link" → `campaign.invite_disable_link` / `invite_enable_link`
   - "Renovar Link" → `campaign.invite_renew_link`
   - "Confirmar" → `common.confirm`
   - "Cancelar" → `common.cancel`
   - "Tem certeza?" → `common.are_you_sure`
   - "Link de convite" / "Email" (tab labels)
   - "Expira em X dias" → `campaign.invite_expires_in`
   - Usar `useTranslations("campaign")` + `useTranslations("common")`

3. **`components/campaign/JoinCampaignClient.tsx`** (~2 strings):
   - `` `Nivel ${char.level}` `` → `t("level_label", { level: char.level })`
   - "Entrar com este personagem" → `joinCampaign.join_with_character`

4. **`components/campaign/SessionHistory.tsx`** — `formatSessionDate()` (~5 strings):
   - "Today" → `t("date_today")`
   - "Yesterday" → `t("date_yesterday")`
   - `${days}d ago` → `t("date_days_ago", { count: days })`
   - `${weeks}w ago` → `t("date_weeks_ago", { count: weeks })`
   - Passar `t` como parametro para `formatSessionDate`

5. **Adicionar chaves em `messages/pt-BR.json` e `messages/en.json`:**
   - Novo namespace `joinCampaign` (~8 chaves)
   - Expandir namespace `campaign` (~15 chaves)

**Criterio de done:** Zero strings hardcoded em PT ou EN nos 4 arquivos. Ambos idiomas funcionam.

---

### F6 — Dashboard health badge buscar dados reais

**Severidade:** WARNING
**Problema:** Dashboard page so busca `id, name, player_characters(count)` mas health badge precisa de session_count, encounter_count, etc. Badge sempre mostra "new".
**Arquivo:** `app/app/dashboard/campaigns/page.tsx`

- Expandir query de campaigns para incluir:
  ```ts
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(`
      id, name, created_at, is_archived,
      player_characters(count),
      sessions(count),
      campaign_notes(count),
      campaign_npcs(count)
    `)
    .eq("owner_id", user.id)
    .eq("is_archived", false)
  ```
- Para `last_session_date`: query separada ou subquery:
  ```ts
  // Para cada campaign, buscar ultima sessao
  sessions!inner(created_at).order('created_at', { ascending: false }).limit(1)
  ```
  Ou fazer uma query separada aggregada e fazer merge client-side
- Passar dados enriquecidos para `CampaignManager`

**Criterio de done:** Health badge no dashboard mostra dados reais (nao todos "new").

---

### F10 — Fix date_absolute i18n vazio no NextSessionCard

**Severidade:** BUG
**Problema:** `date_absolute` i18n value e string vazia — datas >4 semanas mostram nada.
**Arquivos:** `messages/en.json`, `messages/pt-BR.json`, `components/campaign/NextSessionCard.tsx`

- Em `messages/en.json` namespace `sessionPlanner`:
  ```json
  "date_absolute": "{date}"
  ```
- Em `messages/pt-BR.json`:
  ```json
  "date_absolute": "{date}"
  ```
- Em `NextSessionCard.tsx`, onde renderiza a data relativa:
  ```ts
  // Quando key === "date_absolute", passar a data formatada como param
  const dateLabel = relativeDate.key === "date_absolute"
    ? t("date_absolute", { date: session.scheduled_for ? new Date(session.scheduled_for).toLocaleDateString() : "" })
    : t(relativeDate.key)
  ```

**Criterio de done:** Datas >4 semanas mostram a data formatada em vez de string vazia.

---

### F11 — Fix health level growing vs active

**Severidade:** BUG
**Problema:** Score 50-74 retorna "active" quando deveria ser "growing".
**Arquivo:** `lib/utils/campaign-health.ts`

- Linha ~75-76: mudar `level = "active"` → `level = "growing"` para o branch `score >= 50`
- Resultado: new (0-24), growing (25-74), active (75-100), stale (override)

**Criterio de done:** 4 niveis de saude distintos funcionando.

---

### F13 — Fix duplicate i18n key quick_action_invite

**Severidade:** BUG
**Problema:** Chave duplicada no namespace `campaign` — valor original sobrescrito.
**Arquivos:** `messages/en.json`, `messages/pt-BR.json`

- Procurar todas as ocorrencias de `"quick_action_invite"` no namespace `campaign`
- Manter UMA definicao com o valor mais adequado
- Se ambos textos sao necessarios, renomear: `quick_action_invite` (curto) + `quick_action_invite_cta` (longo)
- Verificar quais componentes usam cada variante e atualizar

**Criterio de done:** Zero chaves duplicadas em ambos JSONs.

---

### F14 — Auto-save com dirty tracking

**Severidade:** BUG
**Problema:** CampaignSettings salva em toda keystroke (debounced) sem comparar com dados originais.
**Arquivo:** `components/campaign/CampaignSettings.tsx`

- Adicionar ref para dados carregados originais:
  ```ts
  const originalRef = useRef<typeof settings>(null)
  // Setar quando dados carregam do DB
  ```
- No `handleChange`, antes de chamar `saveSettings`:
  ```ts
  const isDirty = JSON.stringify(next) !== JSON.stringify(originalRef.current)
  if (!isDirty) return // nao salvar se nada mudou
  ```
- Apos save sucesso, atualizar `originalRef.current = next`

**Criterio de done:** Settings so salva quando ha mudanca real. Indicador "saved" nao pisca sem motivo.

---

### F3 — Onboarding completed flag funcional

**Severidade:** BUG
**Problema:** `onboarding_completed` existe no DB mas nunca e lida nem escrita. Checklist desaparece ao adicionar 1 player.
**Arquivos:**

1. `app/app/campaigns/[id]/page.tsx`:
   - Buscar `campaign_settings.onboarding_completed` na query
   - Condicao de onboarding: `onboarding_completed === false` (nao mais baseado em counts)
   - Fallback: se campaign_settings nao existe, usar logica de counts atual

2. `components/campaign/CampaignOnboardingChecklist.tsx`:
   - No `handleSkip`, chamar:
     ```ts
     await updateCampaignSettings(campaignId, { onboarding_completed: true })
     ```
   - No `handleComplete` (quando todos steps done), chamar:
     ```ts
     await updateCampaignSettings(campaignId, { onboarding_completed: true })
     ```

3. Resultado: checklist persiste ate DM completar todos os 4 steps OU clicar skip, mesmo que tenha players.

**Criterio de done:** Checklist aparece ate ser completado/skippado. Flag persiste no DB.

---

## Regras de Paralelizacao

### Arquivos exclusivos por agente (sem conflito):

| Agent A (Backend) | Agent B (Frontend) |
|---|---|
| `lib/supabase/campaign-settings.ts` | `messages/en.json` |
| `lib/supabase/campaign-sessions.ts` | `messages/pt-BR.json` |
| `app/api/campaign/[id]/join-link/route.ts` | `components/campaign/SessionHistory.tsx` |
| `app/join-campaign/[code]/page.tsx` | `components/campaign/NextSessionCard.tsx` |
| `app/join-campaign/[code]/actions.ts` | `components/campaign/InvitePlayerDialog.tsx` |
| `components/campaign/CampaignArchiveDialog.tsx` | `components/campaign/JoinCampaignClient.tsx` |
| `components/campaign/SessionPlanner.tsx` | `lib/utils/campaign-health.ts` |
| Nova migration SQL | `app/app/dashboard/campaigns/page.tsx` |

### Arquivos compartilhados (merge manual depois):

| Arquivo | Agent A toca | Agent B toca |
|---------|-------------|-------------|
| `CampaignHero.tsx` | F2 (startSession call) | — |
| `CampaignSettings.tsx` | — | F14 (dirty tracking) |
| `page.tsx` (campaigns/[id]) | F1 (archived check) | F3 (onboarding flag) |
| `CampaignOnboardingChecklist.tsx` | — | F3 (skip persist) |

**Conflito real:** `page.tsx` e tocado por ambos (F1 e F3). **Solucao:** Agent A faz F1 primeiro (adiciona `is_archived` check), Agent B faz F3 depois (adiciona `onboarding_completed` check). Ou combinar ambos no Agent A se preferir.

### Ordem de execucao sugerida:

```
Agent A:                          Agent B:
  F5  (15min, trivial)              F11 (15min, trivial)
  F2  (30min)                       F13 (15min)
  F7  (30min)                       F10 (30min)
  F9  (1h)                          F14 (1h)
  F8  (1h)                          F4  (2h, maior)
  F12 (30min)                       F6  (1h)
  F1  (1h)                          F3  (1h)
  F15 (2h, maior)
                                  
  Total: ~6.5h                    Total: ~6h
```

### Apos ambos completarem:

- [ ] Merge manual de `page.tsx` se ambos editaram
- [ ] `tsc --noEmit`
- [ ] Verificar i18n: nenhuma chave duplicada em messages/*.json
- [ ] Teste manual: criar campanha → onboarding → invite → session → archive → join expirado

---

## Prompt para cada agente

### Agent A:
```
Execute os fixes do Agent A em docs/code-review-dm-journey-fixes-2026-04-10.md.
Sao 8 fixes focados em backend e safety: F1, F2, F5, F7, F8, F9, F12, F15.
Ordem: F5 → F2 → F7 → F9 → F8 → F12 → F1 → F15.
Ao final, rodar tsc --noEmit.
```

### Agent B:
```
Execute os fixes do Agent B em docs/code-review-dm-journey-fixes-2026-04-10.md.
Sao 7 fixes focados em frontend e i18n: F4, F6, F10, F11, F13, F14, F3.
Ordem: F11 → F13 → F10 → F14 → F4 → F6 → F3.
Ao final, rodar tsc --noEmit.
```
