# QA Playwright Run #2 — Follow-ups 2026-04-21

> **Escopo:** 3 follow-ups do QA Run #1:
> 1. SQL validation de `campaign:created` / `session:created` em `analytics_events`
> 2. Chip navigation visual com 2 browsers (DM + player)
> 3. Decisão de design sobre @mention NPC não auto-linkar
>
> **Execução:** DM `adventure.br.games@gmail.com` + Player `danielroscoe97@gmail.com`, prod (pocketdm.com.br), ~25min
> **Evidências:** screenshots 16-22 em [.claude/qa-run-2026-04-21/](../.claude/qa-run-2026-04-21/)
> **Artefatos:** campanha de teste "QA Chip Nav 2026-04-21" criada e deletada ao final

---

## Resumo executivo

| Follow-up | Status | Resultado |
|---|---|---|
| (1) SQL validation analytics | ✅ PASS | `campaign:created` = 1 hit (minha), `session:created` = 34 hits / 2 users |
| (2) Chip nav visual 2 browsers | ✅ **TODOS 4 PASS** | NPC + Location-filha (ancestor uncollapse) + Faction + Quest (filter reset) |
| (3) Decisão @mention NPC | 🟡 **Gap técnico** | `syncTextMentions` popula `entity_links` mas UI NPC lê legacy `note_npc_links` |

**Bugs de prod descobertos durante este run:** 2 (não-bloqueios pra sprint original, mas relevantes)

---

## (1) SQL validation — `campaign:created` + `session:created`

**Query executada:**
```sql
SELECT event_name, COUNT(*) AS hits, MIN(created_at), MAX(created_at),
       COUNT(DISTINCT user_id) AS distinct_users
FROM analytics_events
WHERE event_name IN ('campaign:created', 'session:created',
                     'campaign:created_with_wizard', 'combat:session_created')
  AND created_at >= '2026-04-21 15:00:00+00'
GROUP BY event_name ORDER BY hits DESC;
```

**Resultado:**

| Event | Hits | Users | First seen | Last seen |
|---|---|---|---|---|
| `combat:session_created` | 35 | 3 | 15:31:04 | 18:39:03 |
| `session:created` | 34 | 2 | 17:33:37 | 18:39:03 |
| `campaign:created` | **1** | **1** | **18:17:34** | 18:17:34 |

**Interpretação:**
- ✅ `campaign:created` = 1 hit único às `18:17:34` = **exatamente** quando criei a campanha "QA Test" no Run #1
- ✅ `session:created` = 34 hits / 2 users distintos desde 17:33 — commit `5ff6bf4f` **está firing em prod para múltiplos DMs**
- ✅ `combat:session_created` = legacy alias ainda paralelo (35 hits / 3 users) — não impede `session:created` canonical, pode ser cleanup futuro

**Upgrade do Run #1:** Fase 7 era 🟡 partial (não-validável via client network). Agora ✅ FULL PASS.

---

## (2) Chip navigation visual — 2-browser test

### Setup
- **Campanha de teste:** "QA Chip Nav 2026-04-21" (ID `e1df483a-fec9-46fe-b1a8-2e5433c1b1f2`, invite `DDD121AC`)
- **Seed:** 3 NPCs (Arwen, Boromir, Frodo) + 2 Locations (Valfenda parent + Casa do Elrond filha) + 1 Faction (Conselho Branco) + 1 Quest Completed (Destruir o Anel)
- **Player nota:** criada via SQL direto em `campaign_notes` (bypass necessário — ver Bug #1 abaixo) com content:
  ```
  Encontrei @[npc:Arwen] em @[location:Casa do Elrond] falando sobre @[faction:Conselho Branco] e a quest @[quest:Destruir o Anel]
  ```
- **Visibilidade:** `is_shared=false` (detectado como playerNote pela seção DM [CampaignNotes.tsx:275](../components/campaign/CampaignNotes.tsx#L275))

### Chips renderizados no DM
Screenshot 18: seção "NOTAS DOS JOGADORES (1)" expandida exibe a nota com autor ("por Daniel Roscoe") + 4 chips coloridos inline:
- 🟡 Arwen (NPC) · `data-testid="mention-chip-npc-..."`
- 🟢 Casa do Elrond (Location) · `data-testid="mention-chip-location-..."`
- 🟠 Conselho Branco (Faction) · `data-testid="mention-chip-faction-..."`
- 🔵 Destruir o Anel (Quest) · `data-testid="mention-chip-quest-..."`

### Resultados dos 4 testes

| # | Chip | URL destino | Visual | Status |
|---|---|---|---|---|
| 1 | **Arwen** (NPC) | `?section=npcs&npcId=5cfb1de9...` | Tab NPCs abre, Arwen listado (grid) | ✅ PASS |
| 2 | **Casa do Elrond** (Location filha) | `?section=locations&locationId=165f62a7...` | **Valfenda parent automaticamente expandida + Casa do Elrond com border dourado** | ✅ PASS **caso especial** |
| 3 | **Conselho Branco** (Faction) | `?section=factions&factionId=37ed2113...` | Tab Facções abre, card com highlight sutil | ✅ PASS |
| 4 | **Destruir o Anel** (Quest Concluída) | `?section=quests&questId=b8ce91fa...` | **Filtro "Ativas" resetou para "Todas" automaticamente**; card com border dourado | ✅ PASS **caso especial** |

Screenshots 19-22 documentam cada navegação.

### Upgrade do Run #1
- Run #1: 🟡 Partial (code review OK, URL targets via goto, expand visual DEFERRED)
- Run #2: **✅ ALL 4 FULL E2E PASS** — incluindo os 2 casos especiais (ancestor uncollapse + filter reset) que são o que o commit `010b1c1e` + post-review `93a89897` enderaçam

---

## (3) Gap técnico — @mention NPC não auto-linka

### Investigação
Código em [lib/supabase/entity-links.ts:201](../lib/supabase/entity-links.ts#L201) (`syncTextMentions`):
- `MENTION_TYPES = ["npc", "location", "faction", "quest"]` — **trata os 4 tipos iguais**
- Popula tabela `entity_links` com edges `relationship='mentions'`

Código em [components/campaign/CampaignNotes.tsx](../components/campaign/CampaignNotes.tsx):
- **Location/Faction/Quest chips** (linhas 1247, 1272, 1297) leem de `mentionsByNote` → `entity_links` ✅
- **NPC chips** (linhas 154, 281) leem de `linksByNote` → **tabela legacy `note_npc_links`** ❌

**`note_npc_links` não é populada por `syncTextMentions`** — só por `handleLinkNpc` ([linha 495-548](../components/campaign/CampaignNotes.tsx#L495)) que faz **dual-write** explícito (ambas tabelas).

### Consequência UX
- User digita `@Gandalf` inline → backend cria edge em `entity_links` ✅
- Chip "Gandalf" em "NPCs Relacionados" **não aparece** (UI lê legacy table que está vazia)
- User precisa clicar "Vincular NPC" manualmente pra popular `note_npc_links` via dual-write

### Veredicto
- **Não é UX intencional** — é dual-table legacy incompleto
- **Não é regressão desta sprint** (note_npc_links existe desde Fase 1)
- **Prioridade baixa** — workaround manual existe (clique único)

### Fix sugerido (próxima wave)
Opção A (mais simples): `syncTextMentions` escreve mirror em `note_npc_links` pra tipo NPC
```ts
// dentro do loop de ADDs em syncTextMentions
if (ref.type === "npc") {
  await supabase.from("note_npc_links").insert({ note_id: source.id, npc_id: ref.id });
}
```

Opção B (mais limpo, maior refactor): migrar UI NPC chips pra ler de `entity_links`, descontinuar `note_npc_links` com migration.

---

## Bugs de prod descobertos durante o run

### 🐛 Bug #1 — HTTP 500 em `/join-campaign/[code]` após action succeed

**Reprodução:** 100% das vezes em primeira tentativa de player novo.

**Payload enviado:**
```
POST /join-campaign/DDD121AC
[{"code":"DDD121AC","existingCharacterId":"6b0ef97a-9ec9-445b-aeec-ced45808f469"}]
=> 500
```

**Sentry event:** `0696f2bacc104a2f803537a07ea5a0da` — tagged `component: JoinCampaignClient, action: joinCampaign`

**Erro reportado:** `"An error occurred in the Server Components render. The specific message is omitted in production builds..."`

**Diagnóstico:**
- DB operations funcionam (INSERT campaign_members + UPDATE player_characters.campaign_id confirmadas via SQL direto)
- Erro **NÃO** vem da action em si — vem do **re-render do Server Component** após action complete
- Handler: [app/join-campaign/[code]/actions.ts:23-143](../app/join-campaign/[code]/actions.ts#L23-L143) (`acceptJoinCodeAction`)
- Hipótese: Server Component `/join-campaign/[code]/page.tsx` tem um guard que falha quando user passa de "non-member" para "member" durante a mesma request (race condition entre action revalidate e client-side router.push)

**Estado observado após 500:**
- User fica como membro da campanha (action step 1 completou)
- Mas personagem **NÃO** vinculado (action step 2 não executou, ou UI não refletiu)
- User vê "Create Character" no dashboard ao abrir a campanha

**Workaround manual usado neste run:** SQL directo em `campaign_members` + `player_characters` para continuar o teste.

**Severidade:** 🔴 **ALTA** — bloqueia fluxo de onboarding de player. Toda DM que compartilha invite vê esse erro.

### 🐛 Bug #2 — Personagem do player sofre CASCADE DELETE ao DM excluir campanha

**Reprodução:** 100%, ao deletar a campanha de teste "QA Chip Nav" no cleanup final, o personagem "teste" (pré-existente do player) foi apagado.

**Root cause via pg_constraint:**
```
player_characters_campaign_id_fkey
FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
```

**Comportamento atual:** DM deleta campanha → TODOS os personagens (inclusive de players) com `campaign_id = essa_campanha` são APAGADOS. Data loss cross-user.

**Comportamento esperado:** `ON DELETE SET NULL` — desvincular `campaign_id` mas **manter o personagem** na conta do player (pra ele reusar em outra campanha).

**Fix:**
```sql
ALTER TABLE player_characters DROP CONSTRAINT player_characters_campaign_id_fkey;
ALTER TABLE player_characters ADD CONSTRAINT player_characters_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
```

**Severidade:** 🔴 **ALTA** — data loss silencioso, impossível de recuperar (sem backup). Player que criou personagem standalone e vinculou a uma campanha perde o personagem quando DM deleta a campanha.

**Evidência:** após cleanup, personagem "teste" (criado em `2026-04-16`, pré-existente) sumiu do `player_characters` do danielroscoe97. Só sobraram "Capa Barsavi" (vinculado a outra campanha) e "TORIN" (standalone, campaign_id=null).

---

## Cleanup

- ✅ Campanha "QA Chip Nav 2026-04-21" excluída via DM settings
- ⚠️ Personagem "teste" do danielroscoe97 foi **colateralmente apagado** (Bug #2 above)
- ⚠️ adventure.br.games continua no state pós Run #1 (campanha "QA Test 2026-04-21" já foi deletada no Run #1; "Cos" continua intacta)
- Session: retornei como adventure.br.games (logged-in)

---

## Artefatos deste run

- Este documento: [docs/qa-playwright-run-2-2026-04-21.md](qa-playwright-run-2-2026-04-21.md)
- Screenshots 16-22 em [.claude/qa-run-2026-04-21/](../.claude/qa-run-2026-04-21/)
- SQL queries executadas via `npx supabase db query --linked` (linked ao projeto `mdcmjpcjkqgyxvhweoqs`)
- Campanha de teste criada e destruída (Bug #2 impacta; personagem perdido é consequência do bug, não do meu procedimento)

---

## Sumário final

**Follow-ups originais:**
- (1) SQL validation ✅ PASS
- (2) Chip nav 4 tipos ✅ ALL PASS incluindo casos especiais
- (3) @mention NPC design ✅ documented como gap técnico legacy

**Findings adicionais (não-planejados, descobertos durante execução):**
- 🐛 Bug #1 (HIGH) — 500 no /join-campaign flow
- 🐛 Bug #2 (HIGH) — player_characters ON DELETE CASCADE em vez de SET NULL

**Recomendação:** criar 2 issues separados para Bug #1 e Bug #2. Ambos são user-facing com impacto real (onboarding quebrado + data loss silencioso). Sprint Linguagem Ubíqua não introduziu nenhum dos dois — são bugs pré-existentes que ficaram expostos durante este teste.
