# PROMPT: Player HQ — Remaining UX Polish

> **Contexto:** O Player HQ passou por Sprint 3 de visual polish (2026-04-08) com ClassBadge em 5 superficies, 13+ componentes polidos, inventario pessoal, e correcoes anti-AI-slop. Estes sao os itens de UX identificados nas reviews adversariais mas NAO corrigidos na sessao. Sao melhorias incrementais de qualidade — nada esta quebrado.
>
> **Tempo:** Uma sessao. Sem scope creep.
>
> **Regra absoluta:** NÃO toque em código de combate. NÃO altere lógica de hooks. NÃO mexa no guest mode. SEMPRE verifique build limpo. SEMPRE mantenha HP tiers imutáveis.

---

## MIGRATION PENDENTE

**ANTES de qualquer código**, aplicar a migration 109 no Supabase de produção:

```bash
npx supabase db push
```

Tabela criada: `character_inventory_items` com RLS (owner CRUD + DM read).

---

## TAREFA 1: UX Review Pt.1 — Componentes Novos

### 1.1 — RaceCombobox

**Arquivo:** `components/character/RaceCombobox.tsx`

- [ ] Empty state precisa de icone (quando busca nao encontra nada)
- [ ] Dropdown precisa de animacao de abertura (fade+slide suave)
- [ ] Indicador visual de scroll quando lista e longa (gradient fade no bottom)

### 1.2 — PersonalInventory

**Arquivo:** `components/player-hq/PersonalInventory.tsx`

- [ ] Toggle equip/unequip precisa de animacao (transicao suave entre secoes equipped/backpack)
- [ ] Secao de currency precisa de label explicativo (ex: "Moedas do Personagem")
- [ ] Input de adicionar item precisa de focus ring consistente com o design system (amber/gold)

### 1.3 — ScratchPad

**Arquivo:** `components/player-hq/ScratchPad.tsx`

- [ ] Animacao de expand/collapse (altura animada com transition, nao snap instantaneo)

### 1.4 — PlayerNotesSection

**Arquivo:** `components/player-hq/PlayerNotesSection.tsx`

- [ ] Formulario de journal precisa de estilo pergaminho (usar token `rpg-parchment` como no ScratchPad)
- [ ] Empty states precisam de icones unicos por tab (Quick Notes → StickyNote, Journal → BookOpen, NPCs → Users)
- [ ] Tooltip de privacidade no cadeado (explicar que notas sao privadas do jogador)
- [ ] Fix: `aria-label` faltando nos botoes de tab

### 1.5 — PlayerHqShell

**Arquivo:** `components/player-hq/PlayerHqShell.tsx`

- [ ] Refatorar tab bar para array + `.map()` com ARIA roles (`role="tablist"`, `role="tab"`, `aria-selected`)
- [ ] `font-display: swap` no nome do personagem (garantir que fonte carrega sem FOIT)
- [ ] Loading skeleton melhor (atualmente pode ser generico demais — usar skeleton que espelha o layout real)
- [ ] Mobile: tab overflow horizontal com scroll indicator (seta ou fade nos extremos)

---

## TAREFA 2: UX Review Pt.2 — Componentes Polidos

### 2.1 — ConditionBadges

**Arquivo:** `components/player-hq/ConditionBadges.tsx`

- [ ] Adicionar emoji/icone por tipo de condicao (Poisoned → Skull, Stunned → Zap, Blinded → EyeOff, etc.)
- [ ] Native `<select>` de exhaustion → controle segmentado (6 niveis visiveis de uma vez)
- [ ] Estado "all clear" quando nenhuma condicao ativa (mensagem positiva, nao apenas vazio)

### 2.2 — ResourceDots

**Arquivo:** `components/player-hq/ResourceDots.tsx`

- [ ] Proporcao visual do dot vs touch target (dot visual pode ser menor que o touch target de 44px — usar padding invisivel)
- [ ] Dots vazios mais visiveis (atual `bg-white/10` pode ser muito sutil em alguns monitores — testar `bg-white/15` ou ring sutil)

### 2.3 — RestResetPanel

**Arquivo:** `components/player-hq/RestResetPanel.tsx`

- [ ] Dawn precisa de cor distinta do Long Rest (atualmente ambos podem parecer similares)
- [ ] Long Rest: mostrar breakdown de spell slots recuperados no badge (ex: "3 slots")
- [ ] Estado disabled precisa de opacity mais evidente (quando nao ha recursos para resetar)

### 2.4 — SpellSlotsHq

**Arquivo:** `components/player-hq/SpellSlotsHq.tsx`

- [ ] Empty state com icone (quando personagem nao tem spell slots — BookX ou Wand2)
- [ ] Discoverability do "edit max": adicionar hint visual de que max e editavel (icone de lapis sutil ou tooltip)
- [ ] Separadores visuais entre niveis de spell (linha fina ou spacing maior entre level groups)

### 2.5 — BagOfHolding

**Arquivo:** `components/player-hq/BagOfHolding.tsx`

- [ ] Native emojis → Lucide icons (consistencia visual com resto do app)
- [ ] Hover feedback nos itens (sutil highlight no hover para indicar interatividade)
- [ ] Icone para itens removidos (Trash2 ou similar em vez de apenas greyed text)

### 2.6 — HpDisplay

**Arquivo:** `components/player-hq/HpDisplay.tsx`

- [ ] Botoes +/- HP: adicionar borda sutil para melhor affordance (atualmente podem parecer flat demais)
- [ ] Barra de HP: aumentar altura para melhor visibilidade (de `h-2` para `h-3` ou `h-2.5`)

### 2.7 — PlayerMindMap

**Arquivo:** `components/player-hq/PlayerMindMap.tsx`

- [ ] Loading skeleton melhor (atualmente pode ser spinner generico — usar placeholder de nodes com linhas conectoras)
- [ ] Empty state melhor (quando nao ha nodes — CTA para criar primeira nota/NPC)
- [ ] Diferenciar visualmente nodes de Session vs Note (cores ou shapes distintos)
- [ ] Background dots do ReactFlow: verificar visibilidade (podem ser muito sutis no tema escuro)

### 2.8 — CharacterCard

**Arquivo:** `components/character/CharacterCard.tsx`

- [ ] Mobile: botao de acao pode ter opacity baixa — verificar contraste
- [ ] Level badge: verificar se nao e redundante com info no header (se ja mostra nivel em outro lugar, considerar remover)
- [ ] Hover feedback no card expandivel (sutil scale ou border change)

### 2.9 — PlayerCampaignCard

**Arquivo:** `components/dashboard/PlayerCampaignCard.tsx`

- [ ] `fixed height` → `min-height` (permitir que conteudo maior expanda o card naturalmente)
- [ ] Limpar fallback text em ingles (verificar se ha strings hardcoded que deveriam usar i18n)

---

## REGRAS DE SEGURANÇA

- **NÃO** tocar em nenhum arquivo de combate (`components/combat/`, `components/player/PlayerJoinClient.tsx`, `components/player/PlayerInitiativeBoard.tsx`)
- **NÃO** alterar lógica de hooks (useCharacterStatus, useResourceTrackers, usePersonalInventory, etc.) — apenas imports/CSS/layout
- **NÃO** mexer no guest mode ou fluxo anônimo
- **NÃO** usar cores genéricas azuis — dourado/amber é o accent do Pocket DM
- **NÃO** adicionar animações pesadas ou partículas (performance first)
- **SEMPRE** verificar build limpo após cada mudança (`tsc --noEmit`)
- **SEMPRE** manter HP tiers imutáveis (LIGHT/MODERATE/HEAVY/CRITICAL em 70/40/10%)
- **SEMPRE** testar em mobile (min-width 375px) alem de desktop

---

## RESULTADO ESPERADO

Ao final desta sessão:
1. Todos os componentes novos (RaceCombobox, PersonalInventory, ScratchPad) com animacoes e polish
2. Componentes existentes com micro-melhorias de UX (empty states, icones, affordance)
3. ARIA roles corretos no tab bar
4. Build limpo (0 erros, 0 warnings)
5. Migration 109 aplicada em producao
