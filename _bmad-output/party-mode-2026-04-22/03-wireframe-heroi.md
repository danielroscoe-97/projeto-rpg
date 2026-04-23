# Wireframe — Herói (tab default do Player HQ)

**Prereq:** [PRD §7.1-7.3](./PRD-EPICO-CONSOLIDADO.md) + [DESIGN-SYSTEM.md v1.0](../qa/evidence/campaign-audit-2026-04-21/DESIGN-SYSTEM.md)
**Escopo:** Wireframes ASCII + spec visual detalhado de cada zona.

---

## 1. Wireframe — Herói · desktop 1280-1440px · modo leitura

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [SIDEBAR 240px]   HEADER 56px                                                        │
│                   ◄ Curse of Strahd · CAPA BARSAVI · Half-Elf Clérigo/Sorce · Nv10  │
│                                                             [📄 Exportar PDF] [✎]  │
│                   ──────────────────────────────────────────────────────────────── │
│                   ┌─ TAB BAR 40px ─────────────────────────────────────────────┐   │
│                   │ [⚔ Herói]  [🎒 Arsenal]  [📖 Diário]  [🗺 Mapa]           │   │
│                   └─────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│                   ┌─ RIBBON VIVO (sticky top, 56px, gold border bottom) ───────┐   │
│                   │ ❤ 88/88 ████████████████████████████ FULL                  │   │
│                   │   [−5][−1][+1][+5]                                         │   │
│                   │   HP Temp: 0 [−][+]  ·  🛡 AC 21  ·  ⚡ Init +2  ·  👣 30ft │   │
│                   │   ✨ —  ·  🎯 CD Magia 16  ·  Slots: R9·D11·A0             │   │
│                   │   Condições: —  [+ Condição]                               │   │
│                   └─────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│                   ┌─ COL A (~560px) ─────────────┐  ┌─ COL B (~560px) ──────────┐ │
│                   │ ABILITY SCORES (sempre)      │  │ EFEITOS ATIVOS            │ │
│                   │ ┌─────┐┌─────┐┌─────┐        │  │ ○ Abençoar · 9min · conc  │ │
│                   │ │ STR ││ DEX ││ CON │        │  │     [↻][×]                │ │
│                   │ │ +0  ││ +2  ││ +4  │        │  │ ○ Escudo da fé · 8min     │ │
│                   │ │ 10  ││ 14  ││ 18  │        │  │     [↻][×]                │ │
│                   │ └─────┘└─────┘└─────┘        │  │ [+ Efeito]                │ │
│                   │ ┌─────┐┌─────┐┌─────┐        │  │ ─────────────────────────│ │
│                   │ │ INT ││ WIS ││ CHA │        │  │ RECURSOS DE CLASSE        │ │
│                   │ │ −1  ││ +2  ││ +4  │        │  │ Canalizar Divindade 1/1●  │ │
│                   │ │  8  ││ 14  ││ 18  │        │  │ Intervenção Divina 0/1 ○  │ │
│                   │ └─────┘└─────┘└─────┘        │  │ [+ Recurso]               │ │
│                   │                              │  │ ─────────────────────────│ │
│                   │ TESTES DE RESISTÊNCIA        │  │ SPELL SLOTS               │ │
│                   │ ○ FOR +0  ○ DES +2 ● CON +4  │  │  I  II  III  IV  V  VI   │ │
│                   │ ● INT +4  ○ SAB +2 ● CAR +4  │  │ ●● ●●● ●●● ●●● ●● ○○     │ │
│                   │ ──────────────────────────── │  │  VII  VIII  IX           │ │
│                   │ PERÍCIAS (3-col grid, 36px)  │  │   ○○   ○○   ○            │ │
│                   │ ○ Acrobacia   DEX  +2        │  │ ─────────────────────────│ │
│                   │ ○ Adestrar A. WIS  +2        │  │ SPELLS CONHECIDAS         │ │
│                   │ ○ Arcanismo   INT  −1        │  │ [🔍 Buscar magia...]      │ │
│                   │ ○ Atletismo   STR  +0        │  │ [Todas][Prep][Favs][Truq] │ │
│                   │ ● Enganação   CAR  +8        │  │ ● Bless · 1st · conc      │ │
│                   │ ○ História    INT  −1        │  │ ● Cure Wounds · 1st       │ │
│                   │ ○ Intuição    WIS  +2        │  │ ● Shield · 1st            │ │
│                   │ ● Intimidação CAR  +8        │  │ ● Shield of Faith · 1st   │ │
│                   │ ● Investiga.  INT  +4        │  │ ● Spiritual Weapon · 2nd  │ │
│                   │ ○ Medicina    WIS  +2        │  │ [...scroll]               │ │
│                   │ ○ Natureza    INT  −1        │  │                           │ │
│                   │ ○ Percepção   WIS  +2        │  │                           │ │
│                   │ ● Atuação     CAR  +8        │  │                           │ │
│                   │ ● Persuasão   CAR  +8        │  │                           │ │
│                   │ ● Religião    INT  +4        │  │                           │ │
│                   │ ○ Prestidi.   DEX  +2        │  │                           │ │
│                   │ ○ Furtiv.     DEX  +2        │  │                           │ │
│                   │ ○ Sobreviv.   WIS  +2        │  │                           │ │
│                   │ ──────────────────────────── │  │                           │ │
│                   │ [Ferramentas ▾] [Idiomas ▾]  │  │                           │ │
│                   │ [Armaduras ▾]   [Armas ▾]    │  │                           │ │
│                   └──────────────────────────────┘  └───────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Dimensões:**
- Viewport 1440px: sidebar ~240px + gap 40px + content ~1160px (= 2 cols de 560px + gap 40px)
- Ribbon: height 56px, sticky top:0 (absolute dentro do container scrollável)
- Header: 56px (fixed pattern)
- Tab bar: 40px
- **Total above-the-fold:** header + tab + ribbon = ~152px; restante 748px pro conteúdo = cabe ~600-700px da coluna A ou B

---

## 2. Wireframe — Herói · desktop · modo combate ativo

```
┌─ HEADER (inalterado) ─────────────────────────────────────────────────────┐
│ ◄ Curse of Strahd · CAPA BARSAVI · ...                   [PDF] [✎]       │
├──────────────────────────────────────────────────────────────────────────┤
│ [⚔ Herói ⚡]  [🎒 Arsenal]  [📖 Diário]  [🗺 Mapa]                        │   ← badge pulsante ⚡ gold
├──────────────────────────────────────────────────────────────────────────┤
│ ┌─ BANNER DE COMBATE (novo, altura 40px, fundo destructive/20) ────────┐ │
│ │ ⚔ Round 3 · Turno de Grolda · próximo: Capa Barsavi    [Entrar →]  │ │   ← CTA gold link /combat/[id]
│ └──────────────────────────────────────────────────────────────────────┘ │
│ ┌─ RIBBON VIVO (com pulse gold em HP quando muda) ──────────────────────┐│
│ │ ❤ 88/88 FULL ████████████ [−5][−1][+1][+5]  🛡21 ⚡+2 👣30ft          ││
│ │   ✨— 🎯CD16  Slots: I●● II●●● III●●● IV●●● V●●  cond: —  [+]        ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│ ┌─ COL A (minimizada) ───────┐  ┌─ COL B (expandida) ────────────────┐ │
│ │ ABILITY SCORES (stays)     │  │ EFEITOS ATIVOS (3 items visíveis)  │ │
│ │ [6 chips inalterados]      │  │ ○ Abençoar · 9min · conc  [↻][×]   │ │
│ │                            │  │ ○ Escudo da fé · 8min     [↻][×]   │ │
│ │ TESTES DE RESISTÊNCIA      │  │ [+ Efeito]                         │ │
│ │ [6 linhas inalteradas]     │  │ ────────────────────────────────── │ │
│ │                            │  │ RECURSOS DE CLASSE                 │ │
│ │ ▾ Perícias (18)            │  │ Canalizar Divindade  1/1  ●        │ │   ← accordion
│ │   [expansível]             │  │ Intervenção Divina  0/1  ○         │ │
│ │                            │  │ ────────────────────────────────── │ │
│ │ [Ferramentas ▾]            │  │ SPELL SLOTS (altura normal)        │ │
│ │ [Idiomas ▾]                │  │ I ●●  II ●●●  III ●●●  IV ●●●     │ │
│ │ [Armaduras ▾]              │  │ V ●●  VI ○○  VII ○○  VIII ○○ IX ○ │ │
│ │ [Armas ▾]                  │  │ ────────────────────────────────── │ │
│ │                            │  │ SPELLS CONHECIDAS                  │ │
│ │                            │  │ [🔍 filtrar...]  [Prep] [Favs]     │ │
│ │                            │  │ ● Bless  (1st, conc)  [Usar]       │ │
│ │                            │  │ ● Cure Wounds (1st)   [Usar]       │ │
│ │                            │  │ [...scroll]                        │ │
│ └────────────────────────────┘  └────────────────────────────────────┘ │
│                                                             [ 📝 FAB ]   │   ← Nota rápida flutuante
└──────────────────────────────────────────────────────────────────────────┘
```

**Diferenças-chave vs modo leitura:**
1. Banner de combate adicional acima do ribbon
2. Badge ⚡ pulsante na aba Herói
3. Coluna A: perícias colapsam em accordion (foco em stats + saves)
4. Coluna B: spells ganham botão "Usar" inline (consume slot automaticamente)
5. FAB 📝 bottom-right pra nota rápida (atalho `N` também)

---

## 3. Wireframe — Herói · mobile 390px

```
┌─────────────────────────────────────┐
│ ☰  Pocket DM            🔔 [●]      │  ← topbar mobile
├─────────────────────────────────────┤
│ ◄ Capa Barsavi · Nv10   [PDF][✎]   │  ← header compacto
├─────────────────────────────────────┤
│ [⚔][🎒][📖][🗺]   ← scroll-h fade  │  ← tab bar compacto
├─────────────────────────────────────┤
│ ┌ RIBBON (48px compacto) ─────────┐│
│ │ ❤ 88/88 FULL ██████████████      ││
│ │ [−5][−1][+1][+5]    🛡21  ⌄     ││  ← ⌄ expand button
│ └──────────────────────────────────┘│
│   (expanded:                         │
│    ⚡+2 👣30ft ✨— 🎯CD16            │
│    Slots: I●● II●●● III●●● IV●●●    │
│    Cond: —  [+])                     │
│                                      │
│ ABILITY SCORES (3x2)                 │
│ ┌────┐┌────┐┌────┐                  │
│ │STR ││DEX ││CON │                  │
│ │ +0 ││ +2 ││ +4 │                  │
│ └────┘└────┘└────┘                  │
│ ┌────┐┌────┐┌────┐                  │
│ │INT ││WIS ││CHA │                  │
│ │ −1 ││ +2 ││ +4 │                  │
│ └────┘└────┘└────┘                  │
│                                      │
│ TESTES DE RESISTÊNCIA                │
│ ○FOR +0  ○DES +2  ●CON +4           │
│ ●INT +4  ○SAB +2  ●CAR +4           │
│                                      │
│ ▾ Perícias (18)                     │
│ ▾ Ferramentas                        │
│ ▾ Idiomas · Armaduras · Armas       │
│                                      │
│ EFEITOS ATIVOS (card)                │
│ ○ Abençoar · 9min [×]                │
│ ○ Escudo da fé · 8min [×]           │
│ [+ Efeito]                           │
│                                      │
│ RECURSOS DE CLASSE (card)            │
│ Canalizar Div 1/1 ●                  │
│ Intervenção D 0/1 ○                 │
│                                      │
│ SPELL SLOTS (card)                   │
│ I  ●● ○○                             │
│ II ●●● ○                             │
│ [...]                                │
│                                      │
│ SPELLS (search + filtros)            │
│ [🔍 magia...]                        │
│ [Todas] [Prep] [Favs] [Truq]        │
│ ● Bless · 1st · conc                 │
│ ● Cure Wounds · 1st                  │
│ [...]                                │
└─────────────────────────────────────┘
```

**Mobile strategy:**
- Ribbon compacto por default; expande com clique em ⌄ pra ver detalhes
- Single column obrigatório
- Ability chips em 3×2 (em vez de 6×1)
- Perícias em accordion default-fechado (aqui é aceitável — screen real estate é limitado)
- Cards em stack vertical
- FAB aparece bottom-right em modo combate (mesmo que desktop)

---

## 4. Zonas detalhadas — spec por elemento

### 4.1 HEADER (56px)

**Conteúdo:**
- `◄` back chevron — navega pra `/app/campaigns/[id]` (view geral)
- Nome da campanha em Cinzel 20/28 semi-bold gold
- `·` divisor
- Nome do personagem em Cinzel 20/28 gold
- Meta line (Inter 13/18 muted): "Half-Elf Clérigo/Sorce · Nv10"
- Ações alinhadas direita: `[📄 Exportar PDF]` ghost button + `[✎ Editar]` icon button

**Estados:**
- Default: como descrito
- Loading: skeleton da linha toda (width animada)
- Readonly (view anon): esconde [✎] e [📄]

**Tokens:**
- Padding: `py-3 px-6` (12/24)
- Background: `bg-background` (level 0)
- Border-bottom: `border-subtle` white/6%

### 4.2 TAB BAR (40px)

**Conteúdo:**
- 4 tabs horizontais: `[⚔ Herói]` · `[🎒 Arsenal]` · `[📖 Diário]` · `[🗺 Mapa]`
- Ícone Lucide 16px + label Inter 14/20 medium
- Active: border-bottom 2px gold `#D4A853` + text gold
- Inactive: text muted
- Hover: text foreground

**Estados:**
- Badges: ver §6.3 do PRD + §4.2 de [02-topologia-navegacao.md](./02-topologia-navegacao.md)

**Mobile:** horizontal scroll com fade indicator à direita (já implementado em [PlayerHqShell.tsx:104](../../components/player-hq/PlayerHqShell.tsx#L104)).

### 4.3 RIBBON VIVO (56px desktop, 48px mobile)

**Conteúdo (desktop):**

Linha 1:
- HP display: `❤ {current}/{max} {tier}` em Inter 14/20 bold, HP bar full-width atrás
- HP Temp inline: `HP Temp: {value} [−][+]`
- Separador `·`
- AC: `🛡 {ac}`
- Init: `⚡ Init +{bonus}`
- Speed: `👣 {speed}ft`
- Inspiration: `✨ {! | —}`
- CD Magia: `🎯 CD Magia {dc}` (só se caster)
- Resumo slots: `Slots: R{remaining} D{disp} A{active}` (compacto)

Linha 2 (ou inline se couber):
- Controles HP: `[−5][−1][+1][+5]` botões 32px altura
- Condições ativas: chips gold (se houver) + `[+ Condição]`

**Posicionamento:**
- `position: sticky; top: 0; z-index: 20`
- Border-bottom gold/25%
- Background `bg-elevated` com blur 10px (efeito glass)

**Comportamento em combate auto:**
- Pulse gold 1.5s ao mudar HP
- CTA "Entrar no Combate →" aparece à direita da linha 1 (link pra `/combat/[id]`)

**Mobile:**
- Compacto: só HP bar + AC visíveis
- Botão `⌄` expande pra mostrar restante

### 4.4 COLUNA A — Identidade & Proficiências

**Largura desktop:** min 560px, flex-grow 1

#### 4.4.1 Ability Scores (sempre visíveis)

**Grid:** 6×1 desktop; 3×2 mobile

**Chip unitário:**
- Container: `w-24 h-20` (96×80) ou `flex-1 h-20` (responsivo)
- Border: `border-subtle` rounded-lg
- Background: `bg-card`
- Conteúdo:
  - Label: "STR" (Inter 11/14 caps, `tracking-wide +8%`, muted)
  - Mod: "+0" (Inter 20 bold tabular, foreground, centrado)
  - Score: "10" (Inter 11/14 muted tabular)
- Padding: `p-2.5`

**Interação:**
- Hover: border-subtle → border (opacity 6% → 12%)
- Click: abre drawer "Editar atributo" (roadmap — MVP só visualização)

#### 4.4.2 Testes de Resistência

**Layout:** 3 colunas × 2 linhas em desktop; 1 coluna × 6 linhas em mobile

**Linha unitária:**
- Dot proficiency: `●` (gold) se proficient, `○` se não
- Label abrev: "FOR" (Inter 11/14 caps, muted)
- Modifier: `+4` (Inter 13 tabular bold, foreground)
- Altura: 24px

**Interação:**
- Click dot → toggle proficient (auth + editor)
- Click modifier → trigger roll (roadmap)

#### 4.4.3 Perícias

**Layout:**
- Desktop: 3 colunas × ~6 rows (18 perícias)
- Mobile: accordion default-fechado

**Row unitária (36px):**
- Dot proficiency: `●/○` (+ `●●` pra expertise)
- Skill name: "Acrobacia" (Inter 13/18)
- Atributo base: "DEX" (Inter 11/14 caps, muted, alinhado direita)
- Modifier: `+2` (Inter 13 tabular bold, alinhado direita extrema)

**Interação:**
- Click dot: toggle prof → expertise → none (se auth + editor)
- Click skill: abre tooltip com detalhes

#### 4.4.4 Accordions secundários

`[Ferramentas ▾]` · `[Idiomas ▾]` · `[Armaduras ▾]` · `[Armas ▾]`

**Default:** fechados
**Contents:** lista de strings (proficiency list)
**Padding:** reduzido em 10% vs DS v1.0

### 4.5 COLUNA B — Recursos Voláteis

#### 4.5.1 Efeitos Ativos

**Card containing list:**
- Heading "EFEITOS ATIVOS" (Inter 11/14 caps muted + tracking wide)
- `[+ Adicionar Efeito]` ghost button à direita

**Row de efeito (altura 40px):**
- Checkbox `○` (estado) ou `●` concentração
- Nome em Cinzel 14/20 gold (ex: "Abençoar")
- Duração: "9min" (Inter 12/16 muted)
- Badge "conc" (se concentration) em warning/20
- Ações: `[↻]` reset + `[×]` remove

**Interação:**
- Click em concentration de outra spell → prompt "Trocar concentração?"
- Timer visual (bar ou countdown) — MVP pode ser só número

#### 4.5.2 Recursos de Classe

**Card:**
- Heading "RECURSOS DE CLASSE" + `[+ Adicionar]`

**Row de recurso (altura 32px):**
- Nome: "Canalizar Divindade" (Inter 13 medium)
- Count: "1/1" (Inter 11 muted tabular)
- Dots: `●` (usado) ou `○` (disponível) — 1 por charge

**Reset:** via botão Descanso Curto/Longo (fora deste card — no ribbon ou config).

#### 4.5.3 Spell Slots

**Layout:** grid horizontal 9×N

```
 I   II   III   IV   V   VI   VII   VIII   IX
●●  ●●●  ●●●  ●●●  ●●  ○○   ○○   ○○    ○
```

**Dot unitário:** 16px circle, gold filled ou outline
**Header de nível:** Cinzel 11/14 gold ("I", "II", etc)
**Altura total:** ~40px

**Interação:**
- Click dot cheio → vira vazio (slot usado) optimistic
- Click dot vazio → vira cheio (undo ou reset parcial)

#### 4.5.4 Spells Conhecidas

**Card com search + filters:**
- Search input "Buscar magia..." (sticky no card)
- Filters: `[Todas] [Preparadas] [Favoritas] [Truques]` (chips)

**Row de spell (altura 36px):**
- Status dot: `●` prepared, `○` not prepared
- Nome: "Bless" (Inter 13)
- Meta: "· 1st · conc" (muted)
- Ação inline: `[Usar]` (só em modo combate) consome slot do nível

**Scroll:** lista rolável até 400px altura

---

## 5. Comportamento Modo Combate Auto

Quando `campaigns.combat_active = true` E Jogador está em Herói:

1. **Badge ⚡ na aba Herói** — pulsante gold
2. **Banner de combate** aparece acima do ribbon com:
   - "⚔ Round {N} · Turno de {Name} · próximo: {Name}"
   - CTA "Entrar no Combate →" (link /combat/[id])
3. **Ribbon** ganha pulse gold ao mudar HP (já existe `.glow-gold-flash`)
4. **Coluna A** colapsa perícias em accordion (`[Perícias ▾]`)
5. **Coluna B** prioriza:
   - Efeitos Ativos sempre expandido
   - Recursos de Classe sempre expandido
   - Spell Slots sempre expandido (usuário vê tudo numa olhada)
   - Spells Conhecidas: mostra só magias preparadas + truques por default; filtro "Todas" disponível
6. **FAB 📝** aparece bottom-right (atalho `N`)

---

## 6. Empty states

### 6.1 Sem ability scores preenchidos
- Chips mostram `—` em vez de mod
- Subtle copy: "Preencha seus atributos em [✎ Editar]"

### 6.2 Sem spell slots (personagem não caster)
- Card Spell Slots esconde
- Card Spells Conhecidas esconde
- Coluna B fica mais compacta (só efeitos + recursos)

### 6.3 Sem recursos de classe
- Card mostra "Nenhum recurso rastreado" + `[+ Adicionar]` proeminente

### 6.4 Sem efeitos ativos
- Card mostra "Nada afetando você agora" + `[+ Efeito]` ghost

---

## 7. Screenshot de referência (antes/depois)

**Antes:** [screenshots/21-hq-tab-ficha-desktop.png](./screenshots/21-hq-tab-ficha-desktop.png)
- ~640px largura útil / 1280px total = 50%
- Modifiers escondidos em accordion
- HP controls em linha separada
- Ficha + Recursos em tabs diferentes

**Depois (alvo):** wireframe acima
- ~1160px largura útil / 1280px total = 92%
- Modifiers sempre visíveis
- HP controls inline no ribbon
- Ficha + Recursos fundidas em Herói (2 colunas)

---

## 8. A11y checklist específico do Herói

- [ ] Ability chips têm `role="button"` ou links com aria-label descritivo ("Força, modificador +0, valor 10")
- [ ] Ribbon tem `role="complementary"` ou aria-region "Status vivo do personagem"
- [ ] Banner de combate tem `role="status"` aria-live="polite"
- [ ] Badge pulsante na aba tem `aria-label="Combate ativo"`
- [ ] Skill rows são rows com aria-label ("Acrobacia, DEX, +2, proficiente")
- [ ] Filter chips são `role="tab"` dentro de tablist "Filtros de magia"
- [ ] FAB de nota rápida tem atalho visível no tooltip
- [ ] Focus ring gold visible em todos elementos interativos
- [ ] Keyboard nav: Tab pela ordem lógica (header → ribbon controls → col A → col B)

---

## 9. Referências código (arquivos a tocar)

- [components/player-hq/PlayerHqShell.tsx](../../components/player-hq/PlayerHqShell.tsx) — TabBar + default tab
- [components/player-hq/CharacterStatusPanel.tsx](../../components/player-hq/CharacterStatusPanel.tsx) — vira parte do ribbon
- [components/player-hq/CharacterCoreStats.tsx](../../components/player-hq/CharacterCoreStats.tsx) — remove accordion, expõe chips
- [components/player-hq/HpDisplay.tsx](../../components/player-hq/HpDisplay.tsx) — compactar, inline controls
- [components/player-hq/ConditionBadges.tsx](../../components/player-hq/ConditionBadges.tsx) — vira compacto inline no ribbon
- [components/player-hq/SpellSlotsHq.tsx](../../components/player-hq/SpellSlotsHq.tsx) — mover pra coluna B
- [components/player-hq/ResourceTrackerList.tsx](../../components/player-hq/ResourceTrackerList.tsx) — coluna B
- [components/player-hq/ActiveEffectsPanel.tsx](../../components/player-hq/ActiveEffectsPanel.tsx) — coluna B topo
- [components/player-hq/ProficienciesSection.tsx](../../components/player-hq/ProficienciesSection.tsx) — coluna A, densificar
- [components/player-hq/SpellListSection.tsx](../../components/player-hq/SpellListSection.tsx) — coluna B rolável
- **Novo:** `components/player-hq/RibbonVivo.tsx` — compõe HP + AC + Init + Speed + etc
- **Novo:** `components/player-hq/CombatBanner.tsx` — banner do modo combate auto
- **Novo:** `lib/hooks/useCampaignCombatState.ts` — detecção de combate ativo
