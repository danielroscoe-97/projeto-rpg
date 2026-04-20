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
