# EPIC: Player HQ para Personagens Standalone

> **Status:** Pronto para implementacao
> **Prioridade:** Alta
> **Origem:** Party Mode session 2026-04-15 (Dani_, Sally, Winston, John)
> **Agente executor:** Qualquer agente BMAD dev
> **Nota de nomenclatura (adicionada 2026-04-19):** a tabela no Supabase é `player_characters` (migration 001), mas a ROTA pública é `/app/characters/[id]` (nome user-friendly). Toda referência SQL neste doc deve usar `player_characters`; rotas Next.js usam `/app/characters/*`. Ver glossário ubíquo (Story 01-A do Épico 01 Identity Foundation).

---

## Problema

Atualmente, ao criar um personagem avulso ("Personagem Avulso") em `/app/dashboard/characters`, o unico acesso de edicao eh um formulario basico (`CharacterForm` em `MyCharactersPage.tsx`) com campos de texto puro. Nao ha pagina dedicada pro personagem — nao ha tracos raciais, inventario, spell slots, habilidades, notas, nada.

O **Player HQ ja existe** e esta 100% funcional com 26+ componentes, 6+ hooks, 7 tabs (map, sheet, resources, abilities, inventory, notes, quests). Porem, ele so funciona dentro do contexto de campanha (`/app/campaigns/[id]/sheet`) e exige `campaignId` + campaign membership.

O objetivo eh **reutilizar o Player HQ existente** para personagens standalone, sem recriar nada do zero.

---

## Estado Atual

### Player HQ (funcional, campaign-only)
- **Rota:** `/app/campaigns/[id]/sheet/page.tsx`
- **Shell:** `components/player-hq/PlayerHqShell.tsx`
- **Props obrigatorias:** `characterId`, `campaignId`, `campaignName`, `userId`
- **Tabs:** map, sheet, resources, abilities, inventory, notes, quests
- **Auth:** Exige campaign membership como "player"

### Personagem Standalone (atual)
- **Rota:** `/app/dashboard/characters/page.tsx`
- **Componente:** `MyCharactersPage.tsx` → `EditCharacterDialog` → `CharacterForm`
- **UX:** Clicar no card abre dialog com formulario de edicao (campos de texto)
- **Nao tem:** pagina dedicada, inventario, spell slots, habilidades, notas, tracos raciais

---

## Solucao Proposta

### Fase 1: Rota Standalone do Player HQ

**Criar rota `/app/characters/[id]/page.tsx`** que renderiza o PlayerHqShell para personagens sem campanha.

#### Mudancas necessarias:

1. **Nova rota `app/app/characters/[id]/page.tsx`**
   - Server component que busca o personagem por ID
   - Valida que `user_id` === usuario logado (RLS ja cobre, mas checar)
   - Renderiza `PlayerHqShell` com `campaignId={null}`

2. **Adaptar `PlayerHqShell` para `campaignId` opcional**
   - Tipo de `campaignId`: `string | null`
   - Se `campaignId === null`:
     - Filtrar tabs: esconder "map" e "quests" (dependem de campanha)
     - Default tab: "sheet" (em vez de "map")
     - Header: link de volta vai pra `/app/dashboard/characters` (nao pra campanha)
     - Esconder `BagOfHolding` (inventario compartilhado de campanha)
     - Esconder `NotificationFeed` (notificacoes de campanha)

3. **Adaptar hooks que usam `campaignId`**
   - `useNotifications(userId)` → chamar condicionalmente (so se tem campanha)
   - `PlayerNotesSection` → props `campaignId` opcional
   - `PlayerMindMap` → nao renderizar sem campanha (ja coberto pela tab filter)

4. **Atualizar `MyCharactersPage.tsx`**
   - Personagem standalone clicado → navegar para `/app/characters/[id]` em vez de abrir dialog de edicao
   - Manter dialog de edicao rapida como opcao secundaria (botao de editar no card)
   - Personagem de campanha clicado → navegar para `/app/campaigns/[campaignId]/sheet`

### Fase 2: Tracos Raciais Auto-Populados

**Criar data layer que mapeia raca → racial features.**

#### Dados necessarios:

1. **`data/srd/racial-traits.json`** (SRD-only, seguro)
   - Mapeamento: `race_id` → array de traits
   - Cada trait: `{ name, description, level? }`
   - Exemplo Elf: Darkvision 60ft, Keen Senses, Fey Ancestry, Trance
   - Exemplo Dwarf: Darkvision 60ft, Dwarven Resilience, Stonecunning
   - Fonte: SRD 5.1 (CC-BY-4.0) — seguro para uso publico

2. **Integracao com `AbilitiesSection`**
   - `AbilitiesSection` ja recebe `characterRace` como prop
   - Adicionar: ao montar, buscar racial traits do JSON e exibir como abilities automaticas
   - Visual: badge "Racial" diferenciando de abilities adicionadas manualmente
   - Nao editavel/deletavel (sao traits da raca, nao do user)

3. **`data/srd/racial-traits-pt.json`** (protegido, traduções PT-BR)
   - Mesma estrutura, com nomes e descricoes traduzidos
   - Servido via `/api/srd/full/racial-traits-pt.json` (auth-gated)

### Fase 3: Polish de Acessibilidade

#### Principios de UX (Sally):

1. **Zero-click information** — Ao abrir o HQ, o jogador ve imediatamente: HP atual, AC, nivel, classe, raca. Sem precisar clicar em nada.

2. **Maximo 2 taps para qualquer acao** — Usar recurso? 1 tap. Editar HP? 1 tap. Ver spell slots? 1 tap na tab + ja esta visivel.

3. **Mobile-first tabs** — Tab bar horizontal com scroll e fade indicator (ja implementado). Considerar bottom navigation em mobile para tabs mais usadas.

4. **Onboarding contextual** — Tour ja existe (`PlayerHqTourProvider`). Verificar se funciona no modo standalone (sem campanha).

5. **Feedback tatil** — Toda acao (usar spell slot, gastar recurso, editar HP) deve ter feedback visual imediato (animacao, toast, ou state change).

---

## Componentes do Player HQ vs Compatibilidade Standalone

| Componente | Precisa de campaignId? | Standalone? | Notas |
|---|---|---|---|
| `CharacterStatusPanel` | Nao | Sim | HP, conditions — funciona 100% |
| `CharacterCoreStats` | Nao | Sim | AC, speed, attributes — funciona 100% |
| `CharacterEditSheet` | Nao | Sim | Editor rapido inline — funciona 100% |
| `ProficienciesSection` | Nao | Sim | Saving throws, skills — funciona 100% |
| `SpellSlotsHq` | Nao | Sim | Spell slot tracking — funciona 100% |
| `ResourceTrackerList` | Nao | Sim | Custom resources — funciona 100% |
| `RestResetPanel` | Nao | Sim | Short/long rest — funciona 100% |
| `ActiveEffectsPanel` | Nao | Sim | Buffs/debuffs — funciona 100% |
| `SpellListSection` | Nao | Sim | Spell list — funciona 100% |
| `AbilitiesSection` | Nao | Sim | Class features — funciona 100% |
| `AttunementSection` | Nao | Sim | Magic items — funciona 100% |
| `PersonalInventory` | Nao | Sim | Personal items/coins — funciona 100% |
| `CharacterPdfExport` | Nao | Sim | PDF export — funciona 100% |
| `PlayerNotesSection` | Sim (parcial) | Adaptavel | Journal usa campaignId pra context — tornar opcional |
| `BagOfHolding` | Sim | Nao | Inventario compartilhado de campanha |
| `NotificationFeed` | Sim (parcial) | Nao | Notificacoes de campanha |
| `PlayerQuestBoard` | Sim | Nao | Quests de campanha |
| `PlayerMindMap` | Sim | Nao | Mind map de campanha |

**Resultado:** 14 de 18 componentes funcionam standalone sem mudanca. 1 precisa de adaptacao menor. 3 sao campaign-only.

---

## Arquivos Chave para Modificacao

| Arquivo | Mudanca |
|---|---|
| `app/app/characters/[id]/page.tsx` | **CRIAR** — nova rota standalone |
| `components/player-hq/PlayerHqShell.tsx` | Tornar `campaignId` opcional, filtrar tabs |
| `components/dashboard/MyCharactersPage.tsx` | Click → navegar pra HQ em vez de dialog |
| `components/player-hq/PlayerNotesSection.tsx` | `campaignId` opcional |
| `data/srd/racial-traits.json` | **CRIAR** — dados de tracos raciais SRD |
| `components/player-hq/AbilitiesSection.tsx` | Integrar racial traits auto-populados |
| `lib/data/races.ts` | Adicionar mapeamento race → traits (opcional) |

---

## Criterios de Aceitacao

### Fase 1 (MVP)
- [ ] Personagem standalone abre em `/app/characters/[id]` com Player HQ completo
- [ ] Tabs "map" e "quests" escondidas quando sem campanha
- [ ] `BagOfHolding` e `NotificationFeed` escondidos quando sem campanha
- [ ] Link de volta no header aponta pra `/app/dashboard/characters`
- [ ] Click no card de personagem em `MyCharactersPage` navega pro HQ
- [ ] Build limpo (`tsc --noEmit`)
- [ ] Tour de onboarding funciona no modo standalone

### Fase 2 (Racial Traits)
- [ ] JSON de racial traits SRD criado com pelo menos 12 racas SRD
- [ ] `AbilitiesSection` exibe racial traits automaticamente baseado na raca
- [ ] Badge visual "Racial" diferencia de abilities manuais
- [ ] Traits nao sao editaveis/deletaveis pelo user
- [ ] Traducoes PT-BR disponiveis (auth-gated)

### Fase 3 (Polish)
- [ ] Zero-click info visivel ao abrir (HP, AC, nivel, classe)
- [ ] Todas as acoes acessiveis em maximo 2 taps
- [ ] Mobile scroll tabs funcionando com fade indicator
- [ ] Feedback visual em todas as acoes interativas

---

## Estimativa de Esforco

| Fase | Complexidade | Componentes novos | Componentes modificados |
|---|---|---|---|
| Fase 1 | Media | 1 (rota) | 3 (Shell, MyChars, Notes) |
| Fase 2 | Media | 1 (JSON data) | 1 (AbilitiesSection) |
| Fase 3 | Baixa | 0 | Polish em existentes |

**Fase 1 pode ser feita em uma sessao.** Fase 2 e 3 sao incrementais.

---

## Regras Imutaveis (CLAUDE.md)

- **SRD Compliance:** Racial traits publicos DEVEM ser SRD-only. Traits non-SRD (VGM, MPMM, etc.) so via auth-gated API.
- **Combat Parity:** Mudancas no Player HQ que afetem combate DEVEM verificar parity guest/anon/auth.
- **Visual Identity:** Seguir paleta Pocket DM (dourado, pergaminho, taverna medieval premium).
