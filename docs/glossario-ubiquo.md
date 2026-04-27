# Glossário de Linguagem Ubíqua — PocketDM

> **Status:** Aprovado
> **Data:** 2026-04-16
> **Origem:** Beta test session 3 (1h com DM) + Party Mode analysis
> **Regra:** Todo novo código, i18n, docs e UI DEVE seguir este glossário

---

## Hierarquia Conceitual

```
Campanha (container de tudo)
  ├── Encontro (preset de combate preparado antecipadamente)
  │    └── Combate (instância ao vivo — iniciativa, turnos, HP)
  │         └── Histórico (registro do combate finalizado)
  ├── Quests (objetivos narrativos com status)
  ├── Locais (lugares no mundo, com hierarquia)
  ├── NPCs (personagens do mestre)
  ├── Facções (organizações)
  └── Notas (anotações livres)
```

### Fluxo Principal

```
[Encontro] ──inicia──→ [Combate] ──finaliza──→ [Histórico]
 (preset)               (ao vivo)                (registro)
```

---

## Termos Oficiais

| # | Conceito | EN (código/DB/rotas) | PT-BR (UI) | Subtítulo descritivo (UI) | Definição |
|---|---|---|---|---|---|
| 1 | Mecânica de turnos ao vivo | `combat` | **Combate** | "Inicie e gerencie combates em tempo real" | CTA principal do app. Iniciativa, turnos, HP, condições. |
| 2 | Preset de combate | `encounter` | **Encontro** | "Prepare combates antecipadamente" | Combate montado e salvo pelo mestre para uso futuro. |
| 3 | Registro de combate passado | `session` (DB legado) | **Histórico** | "Reveja combates passados e resultados" | Log de combates finalizados com rodadas, monstros, resultado. |
| 4 | Objetivo narrativo | `quest` | **Quest** | "Acompanhe objetivos e missões da campanha" | Mantido em inglês — universal no RPG brasileiro. |
| 5 | Grupo de jogo | `campaign` | **Campanha** | — | Container principal de tudo. |
| 6 | Ficha jogável | `character` | **Personagem** | — | Ficha do jogador com stats, inventário, habilidades. |
| 7 | Lugar no mundo | `location` | **Local** | — | Lugar geográfico/narrativo (com hierarquia: região > cidade > taverna). |
| 8 | Organização | `faction` | **Facção** | — | Grupo organizado no mundo (pode conter NPCs e locais). |
| 9 | Personagem do mestre | `npc` | **NPC** | — | Universal, sem tradução. "PdM" é arcaico e não usado. |
| 10 | Dono da mesa | `dm` | **Mestre** | — | Quem controla a campanha e os combates. |
| 11 | Participante | `player` | **Jogador** | — | Quem joga um personagem. |
| 12 | Anotações | `notes` | **Notas** | — | Registros livres do mestre ou jogador. |
| 13 | Diário pessoal | `journal` | **Diário** | — | Notas pessoais do jogador dentro da campanha. |
| 14 | Template de monstros | `preset` | **Preset** | — | Mantido em inglês — termo técnico universalmente entendido. |

---

## Termos Proibidos / Mapeamento de Migração

| Termo antigo (UI) | Contexto | Termo correto | Motivo |
|---|---|---|---|
| "Sessão" / "Sessões" | Referindo-se a combates passados | **Histórico** | "Sessão" confunde com mesa de jogo real |
| "Sessão Ativa" | Referindo-se a combate em andamento | **Combate Ativo** | É combate, não sessão |
| "Combates Anteriores" | Seção de histórico | **Histórico** | Simplificar label |
| "Missão" / "Aventura" | Tradução de Quest | **Quest** | Manter inglês, universal |
| "Encontro" | Referindo-se a combate passado | **Histórico** | Encontro = preset, não registro |
| "Combate" | Referindo-se a preset | **Encontro** | Preset de combate = Encontro |
| "Conversão" (identity) | Virar conta autenticada | **Upgrade de identidade** | "Conversão" tem carga de funil de marketing; aqui é ato técnico. |
| "Adoção" (identity) | Reivindicar personagem DM-created | **Claim de personagem** | "Adoção" é ambíguo e infantiliza. |
| "Linked player" | — | Usar **personagem vinculado** | Character é vinculado, não o player (player é jogador, sempre humano). |

---

## Regras de Aplicação

### 1. Rotas (URLs)
- Rotas são SEMPRE em inglês (são técnicas, não user-facing)
- `/app/combat/[id]` — combate ativo (migrar de `/app/session/[id]`)
- `/app/combat/new` — criar combate (migrar de `/app/session/new`)
- `/api/combat/[id]/*` — APIs de combate (migrar de `/api/session/[id]/*`)
- NUNCA rotas em português (ex: `/acoes-em-combate` é exceção SEO pública, não rota do app)

### 2. Código (variáveis, tipos, funções)
- Usar termos EN do glossário: `combat`, `encounter`, `quest`, `session` (DB legado OK)
- Novas funções: `startCombat()` não `startSession()`
- Novos componentes: `CombatClient` não `SessionClient`

### 3. i18n (mensagens traduzidas)
- Seguir coluna PT-BR do glossário
- Subtítulos descritivos devem aparecer na UI como texto secundário
- Toda label de nav/tab deve ter subtítulo acessível (tooltip ou texto menor)

### 4. Documentação
- Docs internos: podem usar EN ou PT-BR, mas seguir o glossário
- Docs públicos (blog, help): sempre PT-BR do glossário

---

## Alinhamento com Terminologia D&D Oficial (Galápagos)

| EN (PHB/DMG) | PT-BR Galápagos | PocketDM | Nota |
|---|---|---|---|
| Encounter | Encontro | **Encontro** | Alinhado (mas no app = preset de combate) |
| Combat | Combate | **Combate** | Alinhado |
| Quest | Aventura/Missão | **Quest** | Diverge — mantemos inglês por ser universal |
| Campaign | Campanha | **Campanha** | Alinhado |
| NPC | NPC/PdM | **NPC** | Alinhado com uso popular (PdM não usado) |
| DM | Mestre de Jogo | **Mestre** | Alinhado com uso popular |

---

## Player Identity & Continuity — Termos específicos

Termos adicionados 2026-04-19 durante a iniciativa [Player Identity & Continuity](EPIC-player-identity-continuity.md). Todo código (funções, migrations, APIs, tabelas) desta iniciativa DEVE seguir estas nomenclaturas. Valida-se na Story 01-A do Épico 01.

| # | Conceito | EN (código/DB) | PT-BR (UI) | Definição |
|---|---|---|---|---|
| 15 | Ato de anon virar auth preservando UUID | `upgradePlayerIdentity` | **Upgrade de identidade** | Promover anon user para auth via `supabase.auth.updateUser({ email, password })` — UUID é preservado. NÃO usar `signUp` (criaria UUID novo). |
| 16 | Personagem sem campanha | `player_characters WHERE campaign_id IS NULL` | **Personagem standalone** | Personagem fora de qualquer campanha. Pode virar vinculado via invite. Ver [EPIC-player-hq-standalone.md](EPIC-player-hq-standalone.md). |
| 17 | Sinônimo de standalone em contexto guest→auth | `migrateGuestCharacterToAuth` | **Personagem portável** | Usado apenas em discussão de migração `/try` (guest) para conta. Fora desse contexto, usar "standalone". |
| 18 | Personagem ligado a campanha com dono | `player_characters WHERE campaign_id IS NOT NULL AND user_id IS NOT NULL` | **Personagem vinculado** | Vinculado a uma campanha específica e com `user_id` definido. Pode voltar a standalone se `campaign_id` for nulado. |
| 19 | Ato de reivindicar personagem DM-created | `claimCampaignCharacter` | **Claim de personagem** | Player reivindica `player_characters` com `user_id IS NULL`. Pode ser soft (anon) ou hard (auth). **Pós-claim, player tem posse total.** |
| 20 | Claim por anon user (temporário) | `claimed_by_session_token` | **Soft claim** | Reserva via `session_token` — player anônimo pode editar via RLS específica, mas ainda não tem `user_id`. Promove a hard claim no upgrade. |
| 21 | Claim por auth user (permanente) | `user_id` em `player_characters` | **Hard claim** | Posse definitiva. Player tem edição plena via RLS normal (`user_id = auth.uid()`). |
| 22 | Último UUID anônimo visto (informativo) | `session_tokens.anon_user_id` | **Identidade anterior** | Pode **regenerar** em cookie loss (ver [spec-resilient-reconnection.md](spec-resilient-reconnection.md)). NÃO é histórico imutável — apenas "último valor observado". Nunca exposto em UI. |
| 23 | Jogador que já jogou com você | `past_companions` (RPC `get_past_companions`) / **Past companion** | **Ex-companheiros** | Usuário com **pelo menos 1 sessão** em comum com `auth.uid()` — critério `COUNT(DISTINCT s.id) >= 1` via JOIN `sessions → encounters → combatants → player_characters`. Fonte do "Convide quem jogou com você" (Épico 04, Área 5). Respeita opt-out `users.share_past_companions` (D8). |

### Nota sobre `character` vs `player_characters` vs `/app/characters/*`

Três níveis de nomenclatura coexistem no projeto:

| Nível | Nomenclatura | Exemplo |
|---|---|---|
| Conceito em prosa, TypeScript types | `Character` / `PlayerCharacter` | `type Character = { ... }` |
| Tabela SQL, migrations, RLS, RPC | `player_characters` (SEMPRE) | `CREATE TABLE player_characters (...)` |
| URL / rota Next.js | `/app/characters/*` (user-friendly) | `/app/characters/[id]` |

Erro comum: escrever migration `ALTER TABLE characters ...` — sempre use `player_characters`.

### Identificador estável

`session_tokens.id` é o identificador estável para cross-reference em toda a iniciativa Player Identity & Continuity. **Não use `anon_user_id` como chave** — ele pode regenerar (spec §2.4 de resilient-reconnection).

---

## Contexto de Decisão

- **Por que "Histórico" e não "Sessão"?** — O DM beta tester confundiu "sessão" do app com "sessão de jogo na mesa". Histórico é auto-explicativo.
- **Por que "Quest" e não "Missão"?** — Todo RPGista BR usa "quest" no dia-a-dia. Traduzir adiciona carga cognitiva desnecessária.
- **Por que "Encontro" = preset?** — Na infraestrutura atual, `encounters` já é a tabela que guarda combates preparados. Alinha nomenclatura com realidade técnica.
- **Por que manter "Preset" em inglês?** — Termo técnico universalmente entendido. "Modelo" ou "Predefinição" seriam confusos.

---


## ADENDO 2026-04-21 v0.3 — Campaign HQ Redesign (modes + HP tiers + entity graph)

**Revisão 2026-04-21 tarde:** watch mode removido · player wiki adicionada · quests atribuíveis via graph existente · regra "Mestre nunca DM" travada.

Aprovado por Dani 2026-04-21 durante sessões de redesign da Campaign HQ.
Spec completa: [_bmad-output/qa/evidence/campaign-audit-2026-04-21/](../_bmad-output/qa/evidence/campaign-audit-2026-04-21/)

### 🔒 Regra absoluta — "Mestre", nunca "DM"

Em TODOS os contextos user-facing (UI, i18n, docs, comunicação, commits, PRs, respostas em chat, comentários de código explicativos), usar **"Mestre"** — nunca "DM". **Inclusive quando alguém escreve "DM"** por hábito, a resposta/doc usa "Mestre".

**Exceções pragmáticas (apenas código interno, nunca user-facing):**
- `role = 'dm'` (Supabase enum / role string)
- `dmOnly`, `isDm` (props booleanas em TypeScript)
- Nome do produto "Pocket DM" (brand, intocável)

Memory relacionada: `feedback_mestre_nao_dm.md`.

### Modes da Campaign HQ (4 modes — watch removido)

Substituem a antiga pill bar de 13 abas. **4 modes**: 3 do Mestre + 1 do Jogador.

| Code (EN) | Label UI (PT-BR, fixo nos 2 locales) | Rota | Papel | Propósito |
|---|---|---|---|---|
| `prep` | **Preparar Sessão** | `/app/campaigns/[id]/prep` | Mestre | Entre sessões: NPCs, quests, notas, prep da próxima |
| `run` | **Rodar Combate** | `/app/campaigns/[id]/run` | Mestre | Iniciar/executar/fechar combate — cockpit live |
| `recap` | **Recaps** (plural intencional) | `/app/campaigns/[id]/recap` | Mestre | Biblioteca de recaps + timeline narrativa |
| `journey` | **Minha Jornada** | `/app/campaigns/[id]/journey` | Jogador | Ficha, última sessão, próxima, quests, mini-wiki de notas, party |

**Combate ativo (Jogador):** não há mode switch. Aparece **banner sticky topo** em `journey`: *"O Mestre iniciou o combate — [Entrar no Combate]"*. Click navega pra `/app/combat/[id]` (tela existente, não nova surface). PWA push notification disparada se permissão concedida.

**Regras imutáveis:**
- Labels não traduzem pra EN — ficam em PT-BR nos dois locales (mesma convenção dos HP tiers).
- TS enum: `type Mode = 'prep' | 'run' | 'recap' | 'journey'` (4 modes).
- Mode é **stateless derivado do server** via `resolveMode(user, campaign, combat)` — **NUNCA persistido em localStorage** (quebra Resilient Reconnection).
- Combate ativo força Mestre em `run`. Jogador **permanece em `journey`** com banner + CTA "Entrar no Combate".
- Variantes curtas pra bottom-tab mobile (só Mestre): `"Preparar"`, `"Rodar"`, `"Recaps"`.

### HP Tiers (labels EN nos 2 locales — memory `feedback_hp_tier_labels.md`)

Canônico do projeto inteiro travado por Dani 2026-04-21:

| Label (EN, não traduzir) | Threshold (legacy) | Contexto visual |
|---|---|---|
| `FULL` | `current === max` (100%) | Verde emerald, sem dano |
| `LIGHT` | `70% < pct < 100%` | Verde claro, dano leve |
| `MODERATE` | `40% < pct ≤ 70%` | Âmbar, dano moderado |
| `HEAVY` | `10% < pct ≤ 40%` | Vermelho, dano pesado |
| `CRITICAL` | `pct ≤ 10%` | Vermelho escuro + pulse |

**Source-of-truth:** `lib/utils/hp-status.ts` — `HP_STATUS_STYLES`, `HP_THRESHOLDS_LEGACY`, `formatHpPct`.

**Regras:**
- Percentage strings em UI **sempre via `formatHpPct(status, flagV2)`** — jamais `"70-100%"` hardcoded.
- Flag `ff_hp_thresholds_v2` shifta para `75/50/25` quando ON — `formatHpPct` reflete.
- `DEFEATED` é display-only via `deriveDisplayState()` — NÃO entra na union `HpStatus` (ABI de broadcast).
- Cores derivam do `HP_STATUS_STYLES` — nunca hardcode Tailwind class por componente.

### Mini-wiki do Jogador (surface `my_notes` em `journey`)

Dentro do mode Minha Jornada, surface `my_notes` é mini-wiki estilo Obsidian:

- **MVP v1.0:** editor markdown (`content_md`) + `tags[]` + busca/filtro por tag
- **v1.5:** backlinks `@nome` com autocomplete **filtrado por visibility** — Jogador NUNCA referencia entidades `hidden` do Mestre (NPCs, quests, locais ocultos)

Schema novo: tabela `player_notes` (ver `_bmad-output/architecture/schema-investigation-winston.md §2 M1`). Dual-auth (user_id XOR session_token_id) seguindo pattern de `player_quest_notes` (mig 069).

### Entity Graph (já existente) — fonte de "quests atribuíveis" e similares

`campaign_mind_map_edges` (migrações 080 + 148 + 152 + 154) suporta **9 entidades × 18 relationships polimórficas**. Foi confirmado durante a sessão 2026-04-21 que toda a atribuição polimórfica que o redesign precisa **já está no schema**.

**Entidades:** `npc`, `note`, `quest`, `session`, `location`, `faction`, `encounter`, `player`, `bag_item`

**Relationships canônicas (18):** `linked_to`, `lives_in`, `participated_in`, `requires`, `leads_to`, `allied_with`, `enemy_of`, `gave_quest`, `dropped_item`, `member_of`, `happened_at`, `guards`, `owns`, `custom`, `headquarters_of`, `rival_of`, `family_of`, **`mentions`** (backbone dos backlinks).

**Uso no redesign:**
- "Quest atribuída a jogador" = `edges(player → quest, rel='participated_in')`
- "Quest acontece em local" = `edges(quest → location, rel='happened_at')`
- "NPC dá quest" = `edges(npc → quest, rel='gave_quest')`
- "Facção ligada a quest" = `edges(faction → quest, rel='allied_with'|'enemy_of')`
- "Backlink `@Grolda` em nota" = `edges(note → npc, rel='mentions')`

**Regra:** nunca criar `quest_players`, `quest_locations`, `entity_mentions` ou tabelas similares — sempre usar o graph polimórfico existente.

### Surfaces canônicas (code snake_case EN → label PT-BR)

| Code | Label UI | Modes | Roles |
|---|---|---|---|
| `next_session` | Próxima Sessão | `prep` | Mestre |
| `quests` | Quests | `prep`, `journey` | Mestre + Jogador (read) |
| `npcs` | NPCs | `prep` | Mestre |
| `locations` | Locais | `prep` | Mestre |
| `factions` | Facções | `prep` | Mestre |
| `notes` | Notas | `prep` | Mestre |
| `mindmap` | Mapa Mental | `prep` | Mestre |
| `soundboard` | Trilha | `prep`, `run` | Mestre |
| `combat` | Combate | `run` | Mestre |
| `party` | Party | `run`, `journey` | Mestre + Jogador |
| `scene` | Cena | `run` | Mestre |
| `last_session` | Última Sessão | `recap`, `journey` | Mestre + Jogador |
| `recap_library` | Biblioteca de Recaps | `recap` | Mestre |
| `timeline` | Linha do Tempo | `recap` | Mestre |
| `stats` | Números | `recap` | Mestre |
| `dm_notes` | Notas do Mestre | `recap` | Mestre (privado) |
| `my_character` | Meu Personagem | `journey` | Jogador |
| `my_notes` | Minhas Notas | `journey` | Jogador (auth; anon vê prompt "criar conta") |

### Termos renomeados (deprecated → canônico do redesign)

| Deprecated | Canônico novo | Motivo |
|---|---|---|
| "Companheiros" (label do jogador) | **Party** | Confuso quando `count === 1` (F-15); anglicismo D&D já usado |
| "Mesa" (como nome de mode) | **Rodar Combate** | "Mesa" é ambíguo; Rodar Combate é explícito |
| "Retro" / "Retrospectiva" | **Recaps** | Corporativês; Recap é termo de mídia familiar |
| "Player HQ" / "Campaign HQ" | **Minha Jornada** / **Campanha** | Termos técnicos não user-facing |
| "Assistindo" (watch mode) | **removido** | Jogador entra em combate via CTA em `journey`, não via mode-switch |
| "DM" | **Mestre** | Anglicismo diluí brand PT-BR first. Nunca mais usar em user-facing |

### Nota sobre "Histórico"

O termo "Histórico" da versão 2026-04-16 (item #3 da tabela principal) **muda de escopo** no redesign:
- **Antes:** surface única onde listavam combates passados
- **Agora:** o conceito vive dentro de **Recaps** (mode) → **Timeline** (surface) + **Biblioteca de Recaps** (surface). Mais rico, mas nome "Histórico" isolado sai de circulação.

A aba antiga "Histórico" da Campaign HQ atual (que mostrava sessões PLANEJADAS, não passadas — bug F-08) será renomeada como parte da Fase A (Story A.5 do implementation-guide).

---

## ADENDO 2026-04-27 — F08 SRD Full

### SRD Full

Modo opt-in onde a campanha libera magias, monstros e itens **completos** (não-SRD-only) pros jogadores que entram via link de combate (`/join/[token]`). O Mestre marca essa preferência em **Campaign HQ → Configurações → Compêndio e regras**, e a flag persiste em `campaign_settings.srd_full_access`.

Como funciona:
- **Default:** `srd_full_access = false`. O `<SrdInitializer />` carrega só o subset público estático (`/srd/`).
- **Quando ativo:** `<SrdInitializer fullData={true} />` faz fetch via `/api/srd/full/...` (rota auth-gated). Player precisa estar logado pra receber.
- O gate `/api/srd/full/*` continua sendo a defesa primária — esta flag só muda a fonte de dados do client em cima daquilo. SRD Content Compliance Rule (`CLAUDE.md`) preservada: nada não-SRD vaza pra rotas públicas.

Anti-patterns:
- ❌ Expor `srd_full_access` num cookie ou query string (defesa = auth gate, não flag client)
- ❌ Fallback silencioso pra public SRD quando o auth falha (mostrar mensagem clara ao jogador)
