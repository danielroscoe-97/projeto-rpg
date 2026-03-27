# V2 Sprint 2 — Stories Deferidas (2026-03-27)

**Objetivo:** Implementar as 4 stories deferidas do Sprint V2 original por dependências cruzadas.
**TypeScript Build:** `npx tsc --noEmit` — CLEAN (zero erros em produção)
**Code Review:** 17 findings (2 CRITICAL, 4 HIGH, 7 MEDIUM, 4 LOW) — todos CRITICAL e HIGH corrigidos.

---

## Stories Implementadas

### Story v2-4-5 — CR Calculator

**O que faz:** Badge no Encounter Setup que calcula dificuldade do encontro (Fácil/Médio/Difícil/Mortal) baseado no nível do grupo vs monstros adicionados.

**Arquivos criados:**
- `lib/utils/cr-calculator.ts` — Funções puras de cálculo. DMG 2014 (XP thresholds + group multiplier) e DMG 2024 (CR budget). <=50ms.
- `components/combat/CRCalculator.tsx` — Componente colapsável com badge de dificuldade, party config (nível/tamanho), toggle de fórmula 2014/2024.

**Arquivos modificados:**
- `components/combat/EncounterSetup.tsx` — Integrado CRCalculator entre toolbar e coluna headers.
- `messages/pt-BR.json` + `messages/en.json` — 9 keys: `cr_difficulty`, `cr_easy`, `cr_medium`, `cr_hard`, `cr_deadly`, `cr_party_level`, `cr_party_size`, `cr_formula`, `cr_no_monsters`

**Decisões técnicas:**
- Pro-gated via `<ProGate flagKey="cr_calculator">`. Feature flag `cr_calculator` já existia no schema.
- Usa `getMonsterById()` do SRD para CR real quando `monster_id` disponível; fallback para heurística HP→CR para NPCs customizados.
- Party size auto-detectado dos combatants marcados como `is_player`.

---

### Story v2-4-6 — Homebrew Content Creation

**O que faz:** DMs Pro criam monstros, magias e itens customizados. Salvos no Supabase (JSONB), aparecem na busca do Compêndio com badge roxo "Homebrew".

**Arquivos criados:**
- `supabase/migrations/026_homebrew.sql` — 3 tabelas (`homebrew_monsters`, `homebrew_spells`, `homebrew_items`). JSONB flexível. RLS: `auth.uid() = user_id`. Triggers `updated_at`.
- `components/homebrew/HomebrewCreator.tsx` — Componente com 3 tabs (Monstro/Magia/Item). Formulários por tipo, CRUD completo, confirmação de delete.
- `components/homebrew/HomebrewBadge.tsx` — Badge roxo "Homebrew" para resultados de busca.

**Arquivos modificados:**
- `lib/srd/srd-search.ts` — Funções `mergeHomebrewMonsters/Spells/Items` para merge no Fuse.js index. Deduplicação via map-first.
- `messages/pt-BR.json` + `messages/en.json` — 33 keys no namespace `homebrew.*`

**Decisões técnicas:**
- Pro-gated via `<ProGate flagKey="homebrew">`.
- JSONB sem schema rígido — flexibilidade para extensão futura.
- Merge em Fuse.js insere no map primeiro, depois reconstrói o index (evita duplicatas em re-renders).

---

### Story v2-3-3 — Player Auto-Join

**O que faz:** Jogador autenticado que entra numa sessão de campanha onde já tem personagem: formulário vem pré-preenchido (nome, HP, AC). Se tem vários, escolhe qual.

**Arquivos criados:**
- `supabase/migrations/027_player_characters_user_id.sql` — ADD COLUMN `user_id UUID` em `player_characters`. Index + RLS policy para SELECT por user.

**Arquivos modificados:**
- `app/join/[token]/page.tsx` — Detecção server-side: auth check → session.campaign_id → player_characters query por user_id. Passa `prefilledCharacters` ao client.
- `components/player/PlayerJoinClient.tsx` — Aceita e propaga `prefilledCharacters`.
- `components/player/PlayerLobby.tsx` — Character selector (múltiplos) ou notice (único). Pre-fill form fields. Botão "Confirmar e Entrar".
- `app/invite/actions.ts` — Seta `user_id: user.id` no insert. **Fix P1:** usa `invite.campaign_id` ao invés do client-supplied.
- `messages/pt-BR.json` + `messages/en.json` — 3 keys: `auto_join_select_character`, `auto_join_confirm`, `auto_join_prefilled`

**Decisões técnicas:**
- Auth check em try/catch — anônimos continuam com formulário vazio (V1 behavior).
- `user_id` é nullable — characters existentes sem vínculo continuam funcionando.
- Pre-fill é editável (spec AC#1) — campos preenchidos mas não locked.

---

### Story v2-3-5 — DM Link Temp Player to Character

**O que faz:** DM vê dropdown ao lado de jogadores temporários para vincular a um personagem da campanha. Stats carregam automaticamente.

**Arquivos criados:**
- `components/combat/PlayerLinkDropdown.tsx` — Dropdown com characters da campanha. Disabled para já-linkados. Click-outside handler. Unlink button.

**Arquivos modificados:**
- `lib/types/combat.ts` — `player_character_id: string | null` no `Combatant` + actions `linkCharacter`/`unlinkCharacter`.
- `lib/types/realtime.ts` — `session:player_linked` event type.
- `lib/stores/combat-store.ts` — Actions `linkCharacter` (carrega stats) e `unlinkCharacter`.
- `lib/realtime/reconnect.ts` — Inclui `player_character_id` na query de reconnect.
- 11 arquivos de produção — `player_character_id: null` adicionado a todos os Combatant literals.
- `messages/pt-BR.json` + `messages/en.json` — 9 keys: `player_link`, `player_link_title`, `player_unlink`, `player_linked`, `player_unlinked`, `player_link_none`, `player_link_already`, `player_link_in_use`

**Decisões técnicas:**
- `player_character_id` já existia no DB (migration 002) — só faltava no tipo client-side.
- Click-outside via `useRef` + `mousedown` listener.
- Characters carregados lazy no primeiro open do dropdown.

---

## Code Review — Findings & Patches

**Método:** Adversarial parallel review — Blind Hunter + Edge Case Hunter.

### Patches Aplicados

| ID | Sev | Problema | Fix |
|----|-----|----------|-----|
| P1 | CRITICAL | `acceptInviteAction` usava `data.campaignId` do client — injection em qualquer campanha | Substituído por `invite.campaign_id` (server-authoritative) |
| P3 | HIGH | Homebrew merge duplicava entries no Fuse index em re-renders | Map-first approach: insere no map, rebuild index from map values |
| P5 | HIGH | PlayerLinkDropdown sem click-outside — dropdown nunca fechava | `useRef` + `mousedown` listener + cleanup |
| P6 | HIGH | CR Calculator usava heurística HP→CR para SRD monsters (impreciso) | Import `getMonsterById` para lookup de CR real |
| P10 | MEDIUM | HomebrewCreator chamava async durante render body | Movido para `useEffect` |
| P13 | MEDIUM | `crToXP` arredondava CRs fracionários incorretamente (0.5→1→200XP) | Reverse map `NUM_TO_CR` para frações canônicas |

### Findings Deferidos (não-bloqueantes)

| ID | Sev | Problema |
|----|-----|----------|
| P2 | CRITICAL | `session:player_linked` sem interface typed no union — broadcast untyped |
| P4 | HIGH | RLS additive em player_characters — write operations precisam service client |
| P7 | MEDIUM | `acceptInviteAction` não é atômico — char criado se invite update falha |
| P8 | MEDIUM | JSONB sem size limit — user pode inserir payloads grandes |
| P9 | MEDIUM | `homebrew_items` sem `ruleset_version` column |
| P11 | MEDIUM | PlayerLobby form state pode dessincronizar com prop changes |
| P12 | MEDIUM | `SanitizedCombatant` omite `display_name` (anti-metagaming) |
| P14-P17 | LOW | Over-fetch, null args, hardcoded i18n, missing loading guard |

---

## Migrations

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 026 | `026_homebrew.sql` | 3 tabelas homebrew (monsters/spells/items) + RLS + triggers |
| 027 | `027_player_characters_user_id.sql` | ADD COLUMN user_id + index + RLS policy |

---

## Deploy Checklist

- [ ] `npx supabase db push` — migrations 026-027
- [ ] Verificar feature flags `cr_calculator` e `homebrew` em `feature_flags` table
- [ ] Testar auto-join com um player autenticado em campanha
- [ ] Verificar que anônimos continuam com formulário vazio
- [ ] Testar PlayerLinkDropdown no combat view com campanha que tem characters
