# Wireframe — Mapa (mind map, ajustes mínimos)

**Prereq:** [PRD §7.6](./PRD-EPICO-CONSOLIDADO.md)
**Escopo:** Status quo + 3 ajustes propostos.

---

## 1. Status atual

O Mapa hoje é a tab mais polida do Player HQ. Evidência: [screenshots/20-hq-tab-map-desktop.png](./screenshots/20-hq-tab-map-desktop.png).

**O que está bom:**
- Full-width mind map com zoom + pan
- Chips filtro: NPCs / Notas / Jogadores / Histórico / Quests / Bag / Locais / Facções / Pins
- Banner "N novidades desde sua última visita"
- Minimap canto inferior direito
- Nodes com labels (Cinzel gold nos nomes próprios)
- Drawers laterais para detalhes de cada entidade

**Base:** [components/player-hq/PlayerMindMap.tsx](../../components/player-hq/PlayerMindMap.tsx) + drawers em [components/player-hq/drawers/](../../components/player-hq/drawers/).

---

## 2. Ajustes propostos

### 2.1 🎨 Sub-header compacto (redução de padding)

**Antes:** filtros chip bar + banner "N novidades" ocupam ~90px.
**Depois:** chip bar + banner inline em 60px (economia 33%).

**Mudança:**
- Chips menor altura (32px → 28px)
- Banner integrado à direita dos chips (inline) quando N>0
- Espaço entre chips e mind map reduzido em 8px

### 2.2 🔗 Link inline "Ver no Diário" em drawers de NPC/Local/Facção

**Quando o drawer abre pra uma entidade:**
- Se jogador tem notas sobre essa entidade (via `edges(note → entity, rel='mentions')`) → link "📖 Ver minhas notas" no header do drawer
- Click navega pra `?tab=diario&section=<npcs|locais|faccoes>&id=<entity_id>`

### 2.3 🔦 Destaque de entidades com atualização recente

**Quando a entidade teve update desde última visita do jogador:**
- Node do mind map ganha halo gold pulsante 2s ao carregar
- Lista ordenada por `last_updated_at` desc nos drawers

---

## 3. Cross-nav (com Diário)

**Diário → Mapa:**
- Click em NPC card em Diário > NPCs → navega pra `?tab=mapa&drawer=npc:{id}` (abre Mapa com drawer do NPC aberto)

**Mapa → Diário:**
- Drawer de NPC/Local/Facção tem "📖 Ver notas" → navega pra Diário section correspondente

Ver [10-mermaid-flows.md §11](./10-mermaid-flows.md).

---

## 4. Tokens a aplicar

Apenas ajustes cosméticos conforme [08-design-tokens-delta.md](./08-design-tokens-delta.md):
- Chips filtro: `py-1.5` → `py-1`
- Banner novidades: `p-3` → `px-4 py-2`
- Drawer header: `p-5` → `p-4`

---

## 5. Não muda

- Lógica de graph rendering (D3/VisX/similar)
- Drawers e suas sub-abas (mantidos)
- Minimap
- Zoom/pan
- Filtros chips (só cosmético)

---

## 6. Referências código

- [components/player-hq/PlayerMindMap.tsx](../../components/player-hq/PlayerMindMap.tsx)
- [components/player-hq/drawers/PlayerNpcDrawer.tsx](../../components/player-hq/drawers/PlayerNpcDrawer.tsx)
- [components/player-hq/drawers/PlayerLocationDrawer.tsx](../../components/player-hq/drawers/PlayerLocationDrawer.tsx)
- [components/player-hq/drawers/PlayerFactionDrawer.tsx](../../components/player-hq/drawers/PlayerFactionDrawer.tsx)
- [components/player-hq/drawers/PlayerQuestDrawer.tsx](../../components/player-hq/drawers/PlayerQuestDrawer.tsx)
- [components/player-hq/drawers/PlayerPinDrawer.tsx](../../components/player-hq/drawers/PlayerPinDrawer.tsx)
- [components/player-hq/drawers/PlayerSessionDrawer.tsx](../../components/player-hq/drawers/PlayerSessionDrawer.tsx)
- [components/player-hq/MapRecap.tsx](../../components/player-hq/MapRecap.tsx)

---

## 7. Size

**Total estimado:** S (3-5h) — apenas ajustes cosméticos + 1 link cross-nav. Se quiser pular, não bloqueia nada.
