# PROMPT: Finalização do Player HQ — Polish Visual + Sprint 3

> **Contexto:** O Player HQ está 100% funcional (26 componentes, 6 hooks, 9 migrations, todos com data bindings reais via Supabase). O que falta é aplicar a identidade visual Pocket DM e espalhar os ClassBadges. NADA precisa ser reconstruído — é trabalho de POLISH, não de criação.
>
> **Tempo:** Uma sessão. Sem scope creep.
>
> **Regra absoluta:** NÃO toque em NENHUM código de combate. NÃO altere comportamento de hooks ou lógica de dados. Apenas visual/CSS/layout.

---

## IDENTIDADE VISUAL POCKET DM — Regras Obrigatórias

**Paleta:**
- Fundo principal: `#13131E` (bg-background)
- Superfície: `#1A1A28` (bg-card)
- Dourado (accent principal): `#D4A853` / `amber-400` — usado em labels, borders ativos, ícones, CTAs
- Pergaminho: `#2a2520` — para cards especiais (stat blocks, preview)
- Funcional HP: verde (>70%), amarelo (40-70%), vermelho (10-40%), cinza/skull (≤10%) — IMUTÁVEL

**Tipografia:**
- Labels/headings de seção: `text-xs font-semibold text-amber-400 uppercase tracking-wider` (padrão gold label)
- Corpo: `text-sm text-foreground` ou `text-muted-foreground`
- Stats/números: `tabular-nums font-mono` quando aplicável

**Componentes RPG disponíveis** (importar de `@/components/ui/rpg`):
- `TorchGlow` — glow dourado no hover (max 2 por viewport)
- `FireGradient` — gradient brasa→ouro para barras de progresso
- `RuneCircle` — step indicator com números
- `QuestPath` — conector entre steps

**Anti-patterns (PROIBIDO):**
- Gradientes de fogo em texto (WCAG fail)
- Mais de 2 elementos com glow simultâneo
- Texturas pesadas/Geocities
- Partículas ember em mobile (<768px)
- Cores genéricas azuis em borders/labels — tudo deve ser dourado ou neutro
- Estilos que pareçam "template de dashboard SaaS" — queremos RPG premium

**Regra de ouro:** Se parece que poderia ser qualquer outro app, está errado. Se parece que é uma taverna medieval premium, está certo.

---

## TAREFA 1: Verificar migrations no Supabase de produção

**ANTES de qualquer código**, verificar se as tabelas do Player HQ existem no banco:

```bash
# Conectar ao Supabase e verificar
npx supabase db push --dry-run
```

Tabelas que DEVEM existir:
- `character_resource_trackers` (migration 057)
- `player_journal_entries` (migration 063)
- `player_npc_notes` (migration 064)
- `character_spells` (migration 065)
- `party_inventory_items` (migration 066)
- `inventory_removal_requests` (migration 067)
- `player_notifications` (migration 068)
- `player_quest_notes` (migration 069)

Colunas em `player_characters` que DEVEM existir:
- `hp_temp`, `speed`, `initiative_bonus`, `inspiration`, `conditions`
- `str`, `dex`, `con`, `int_score`, `wis`, `cha_score`
- `subrace`, `subclass`, `background`, `alignment`, `traits`, `currency`

Se qualquer tabela/coluna não existir, aplicar:
```bash
npx supabase db push
```

---

## TAREFA 2: Sprint 3 — ClassBadge em todas as superfícies

O componente `ClassBadge` já existe em `components/character/ClassBadge.tsx`. O `ClassIcon` com aliases EN/PT-BR está em `components/character/ClassIcon.tsx`. Ambos usam `currentColor` e ficam dourados com `text-amber-400`.

### 2.1 — ClassBadge no `CharacterCard.tsx`

**Arquivo:** `components/character/CharacterCard.tsx`
**O que fazer:** Ao lado do avatar/token circular, adicionar `ClassBadge` no canto inferior direito.

```tsx
import { ClassBadge } from "@/components/character/ClassBadge";

// No avatar container, adicionar posição relativa e o badge:
<div className="relative">
  {/* Avatar existente */}
  <ClassBadge 
    characterClass={character.class} 
    size="sm" 
    className="absolute -bottom-0.5 -right-0.5" 
  />
</div>
```

### 2.2 — ClassBadge no `PlayerHqShell.tsx` header

**Arquivo:** `components/player-hq/PlayerHqShell.tsx`
**Onde:** No header do shell (linhas ~88-97), ao lado do nome do personagem.
**O que fazer:** Adicionar ClassIcon ao lado do nome, tamanho 20px.

```tsx
import { ClassIcon } from "@/components/character/ClassIcon";

// Na div do nome:
<div className="min-w-0 flex-1">
  <div className="flex items-center gap-2">
    <ClassIcon characterClass={character.class} size={20} className="text-amber-400 flex-shrink-0" />
    <h1 className="text-lg font-semibold text-foreground truncate">
      {character.name}
    </h1>
  </div>
  {/* subtitle existente permanece */}
</div>
```

### 2.3 — ClassBadge no `PlayerCampaignCard.tsx`

**Arquivo:** `components/dashboard/PlayerCampaignCard.tsx`
**Onde:** Na linha de raça/classe do personagem.
**O que fazer:** Adicionar ClassBadge inline antes do nome da classe.

```tsx
import { ClassBadge } from "@/components/character/ClassBadge";

// Dentro do span de raça/classe:
<div className="flex items-center gap-1.5">
  <ClassBadge characterClass={membership.character_class} size="sm" />
  <span className="text-[10px] text-white/50">
    {membership.character_race} {membership.character_class}
  </span>
</div>
```

**NOTA:** O `UserMembership` type pode não ter `character_class`. Verificar em `lib/types/campaign-membership.ts`. Se não tiver, adicionar o campo ao tipo e ao `getUserMemberships()` em `lib/supabase/campaign-membership.ts`.

### 2.4 — ClassBadge no `MemberCard.tsx`

**Arquivo:** `components/campaign/MemberCard.tsx`
**O que fazer:** Se o membro tem personagem com classe, mostrar ClassBadge ao lado do nome.

### 2.5 — ClassIcon como placeholder de avatar

**Em todo componente que mostra avatar de personagem:** Se `token_url` é null, em vez do ícone genérico de User, usar `ClassIcon` da classe do personagem (ou Swords como fallback final).

Componentes afetados:
- `CharacterCard.tsx` — avatar circular
- `PlayerCampaignCard.tsx` — se não tem cover_image
- `PlayerHqShell.tsx` — header avatar
- `MemberCard.tsx` — avatar do membro

```tsx
{character.token_url ? (
  <img src={character.token_url} alt="" className="w-full h-full object-cover" />
) : (
  <ClassIcon characterClass={character.class} size={28} className="text-amber-400/60" />
)}
```

---

## TAREFA 3: Polish visual do Player HQ

O Player HQ funciona mas pode ter visual genérico em alguns pontos. Percorra cada componente e aplique a identidade Pocket DM.

### 3.1 — Tab bar do PlayerHqShell

**Arquivo:** `components/player-hq/PlayerHqShell.tsx`
**Verificar:** A tab bar deve usar `border-amber-400` para tab ativa (já faz). Garantir que os ícones das tabs usam `text-amber-400` quando ativos e `text-muted-foreground` quando inativos.

### 3.2 — CharacterStatusPanel (HP section)

**Arquivo:** `components/player-hq/CharacterStatusPanel.tsx` + `HpDisplay.tsx`
**Verificar:**
- HP bar usa as cores corretas dos tiers (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) — NÃO ALTERAR a lógica
- Botões de +/- HP devem ser touch-friendly (min 44px)
- Labels de seção em gold: `text-xs font-semibold text-amber-400 uppercase tracking-wider`
- Container com borda sutil: `border border-border rounded-xl bg-card`

### 3.3 — ConditionBadges

**Arquivo:** `components/player-hq/ConditionBadges.tsx`
**Verificar:** Condições ativas devem ter visual distinto (não apenas cor diferente). Cada condição ativa deve ter borda mais forte e background com opacidade. Exhaustion level deve ser visualmente diferenciado (dropdown com cor de warning para níveis altos).

### 3.4 — ResourceDots

**Arquivo:** `components/player-hq/ResourceDots.tsx`
**Verificar:**
- Dots preenchidos em dourado (`bg-amber-400`), vazios em `bg-white/10`
- Bounce animation no toggle (já implementado — verificar se funciona)
- Labels de tipo de reset (Short Rest, Long Rest, Dawn) em text-muted-foreground

### 3.5 — RestResetPanel

**Arquivo:** `components/player-hq/RestResetPanel.tsx`
**Verificar:** Os 3 botões (Short Rest, Long Rest, Dawn) devem ter visual distinto:
- Short Rest: ícone de lua crescente, borda azul sutil
- Long Rest: ícone de lua cheia, borda dourada
- Dawn: ícone de sol, borda âmbar
- Todos com contagem de recursos afetados (`{count}` badge)

### 3.6 — SpellSlotsHq

**Arquivo:** `components/player-hq/SpellSlotsHq.tsx`
**Verificar:** Spell slots devem usar o mesmo padrão de dots do ResourceDots. Labels de nível em dourado.

### 3.7 — BagOfHolding

**Arquivo:** `components/player-hq/BagOfHolding.tsx`
**Verificar:** Cards de item devem usar `bg-card border-border`. Itens com remoção pendente devem ter visual de "pendente" (borda amarela tracejada). Itens removidos devem estar acinzentados.

### 3.8 — PlayerNotesSection

**Arquivo:** `components/player-hq/PlayerNotesSection.tsx`
**Verificar:** Tabs internas (notas rápidas, journal, NPCs) devem seguir o mesmo padrão da tab bar principal. Badge de privacidade (cadeado) visível.

### 3.9 — PlayerMindMap

**Arquivo:** `components/player-hq/PlayerMindMap.tsx`
**Verificar:** Nodes devem usar as cores corretas: NPC (roxo), Quest (amarelo), Location (verde), Session (azul), Player (esmeralda). MiniMap no canto deve ser sutil.

---

## TAREFA 4: QA manual — fluxo completo do jogador

Testar o seguinte fluxo na produção:

### Fluxo 1: Novo jogador via invite
1. DM cria campanha e envia convite
2. Jogador recebe convite → aceita
3. Jogador é redirecionado para campanha
4. Sem personagem → vê CTA "Criar Personagem" (NÃO dead end)
5. Clica no CTA → wizard abre (3 passos)
6. Seleciona classe com ícone dourado → raça → nome
7. Passo 2: nível + HP + AC (ou pula)
8. Passo 3: preview → "Criar Personagem"
9. Personagem criado → página recarrega → Player HQ acessível

### Fluxo 2: Player HQ funcional
1. Jogador abre Player HQ (`/app/campaigns/[id]/sheet`)
2. Tab "Mapa" → mind map carrega com nodes
3. Tab "Ficha" → HP display + conditions + core stats
4. Tab "Recursos" → resource dots + spell slots + rest buttons
5. Tab "Inventário" → Bag of Holding + notificações
6. Tab "Notas" → notas rápidas + journal + NPCs
7. Tab "Quests" → quest board com favoritos

### Fluxo 3: Dashboard como jogador
1. Dashboard mostra seção "Minhas Campanhas como Jogador"
2. PlayerCampaignCard mostra HP bar + class badge + "LIVE" se sessão ativa
3. Clicar no card → abre Player HQ
4. Se sem personagem → mostra badge "Criar Personagem" → clica → campanha → wizard

---

## REGRAS DE SEGURANÇA

- **NÃO** tocar em nenhum arquivo de combate (`components/combat/`, `components/player/PlayerJoinClient.tsx`, `components/player/PlayerInitiativeBoard.tsx`)
- **NÃO** alterar lógica de hooks (useCharacterStatus, useResourceTrackers, etc.) — apenas imports/CSS
- **NÃO** criar migrations — todas já existem (verificar apenas se foram aplicadas)
- **NÃO** mexer no guest mode ou fluxo anônimo
- **NÃO** usar cores genéricas azuis — dourado é a cor de accent do Pocket DM
- **NÃO** adicionar animações pesadas ou partículas (performance first)
- **SEMPRE** verificar build limpo após cada mudança (`tsc` + `next build`)
- **SEMPRE** manter parity com HP tiers imutáveis (LIGHT/MODERATE/HEAVY/CRITICAL)
- Acentos corretos em português: herói, raça, nível, você, número, magia

---

## RESULTADO ESPERADO

Ao final desta sessão, o Player HQ deve:
1. Ter visual consistente com a identidade Pocket DM (dourado, escuro, RPG premium)
2. Mostrar ClassBadge/ClassIcon em todas as superfícies que exibem personagem
3. Usar ClassIcon como placeholder de avatar quando sem token_url
4. Ter 0 dead ends no fluxo do jogador
5. Build limpo (0 erros, 0 warnings)
6. Estar pronto para demo presencial nos bares de BH em maio
