# Spec Funcional — Estados, Ações, Erros, A11y

**Prereq:** [PRD §8](./PRD-EPICO-CONSOLIDADO.md)
**Escopo:** Matriz estados × ações × erros × a11y por zona. Usa-se como **contrato de implementação** e **checklist de QA**.

---

## 1. Convenções

- **State:** como o elemento se apresenta visualmente
- **Interaction:** o que user pode fazer
- **Optimistic:** UI atualiza antes de ack do servidor
- **Ack:** feedback visual confirmando persistência (pulse gold 1.5s)
- **Error:** como lidar com falha (revert + toast)
- **A11y:** ARIA + keyboard + contrast

---

## 2. RIBBON VIVO

### 2.1 HP bar (núcleo do ribbon)

| State | Visual | Condition |
|---|---|---|
| FULL | Verde emerald cheio `bg-success` | HP=max |
| LIGHT | Verde médio | 70-100% |
| MODERATE | Amarelo warning | 40-70% |
| HEAVY | Laranja destructive | 10-40% |
| CRITICAL | Vermelho pulsante | 0-10% |
| INCONSCIENTE | Cinza escuro + badge "INCONSCIENTE" | HP=0 |
| DEAD | Cinza + overlay "MORTO" (só Mestre pode revive) | flag separada |

**HP label:** `{current}/{max} {TIER_LABEL}` — tier em maiúscula inglês nos 2 locales. Source: `lib/utils/hp-status.ts` (NUNCA hardcode).

| Interaction | Behavior | Ack | Error |
|---|---|---|---|
| Click [−5] | HP -=5 optimistic; pulse gold | Servidor confirma em <500ms | Revert + toast "Não foi dessa vez" |
| Click [−1] [+1] [+5] | idem | idem | idem |
| Click no HP number (input mode) | Abre input inline; enter salva | Pulse + fecha | idem |
| HP atinge 0 | Badge "INCONSCIENTE" aparece + toast | — | — |
| HP negativo | Clamp em 0 | — | — |

**A11y:**
- `role="progressbar"` + `aria-valuenow={current}` + `aria-valuemax={max}` + `aria-label="HP 88 of 88, tier FULL"`
- Botões ±5/±1 têm `aria-label` completo ("Diminuir HP em 5")
- Focus ring gold visível

### 2.2 HP Temporário

| State | Visual | Condition |
|---|---|---|
| Hidden | row não renderiza | hp_temp = 0 |
| Visible | "HP Temp: {n} [−][+]" inline | hp_temp > 0 |

**Regras:**
- Nunca acumula além do mais alto concedido (RAW 5e)
- Decai a 0 com descanso curto

### 2.3 AC / Init / Speed / Inspiration / CD Magia

Todos são **read-only no ribbon** (edição via Drawer Editar Personagem):

| Field | Format | Fallback |
|---|---|---|
| AC | `🛡 21` | `—` se null |
| Init | `⚡ +2` ou `⚡ −1` | `—` |
| Speed | `👣 30ft` | `—` |
| Inspiration | `✨ !` (ativo) ou `✨ —` (sem) | sempre visível |
| CD Magia | `🎯 CD 16` | hidden se null |

### 2.4 Condições ativas

| State | Visual |
|---|---|
| Nenhuma | "Condições: —" + `[+ Condição]` |
| 1-3 ativas | chips inline "Abençoado" "Enfeitiçado" + `[+]` |
| 4+ ativas | chips primeiros 2 + "+N mais" link → drawer completo |

**Click em chip:** remove condição (optimistic).
**Click em `[+]`:** abre picker de condições (13 canônicas D&D + exaustão 1-6).

---

## 3. ABILITY SCORES (chips)

| State | Visual | Condition |
|---|---|---|
| Null | Chip com "—" no mod e "—" no score | atributo não preenchido |
| Preenchido | Chip com "+0" e "10" | valor registrado |
| Highlighted (roadmap) | Chip com halo gold | se relevante pro turno atual |

**Interaction:**
- Hover desktop: tooltip "Força — usada em testes de atletismo"
- Click (MVP): abre drawer Editar atributos
- Click (v1.5): rolar d20 + mod

**A11y:**
- `role="button"` ou link
- `aria-label="Força, modificador +0, valor 10"`

---

## 4. TESTES DE RESISTÊNCIA & PERÍCIAS

### 4.1 Row de save/skill

| State | Visual |
|---|---|
| Default | `○ Acrobacia  DEX  +2` |
| Proficient | `● Acrobacia  DEX  +5` (dot gold) |
| Expertise | `●● Acrobacia  DEX  +8` (2 dots) |
| Disabled (non-editor mode) | dot read-only |

**Interaction:**
- Click dot (editor): toggle prof → expertise → none
- Click skill name: abre tooltip/modal com descrição (roadmap)
- Click modifier: rola d20 + mod (roadmap)

**A11y:**
- Row é `<article>` ou `<li>` com aria-label completo
- Proficient dots: `aria-pressed={true|false}`

---

## 5. SPELL SLOTS

### 5.1 Grid de dots

| State | Visual | Condition |
|---|---|---|
| Available | `●` gold filled | slot disponível |
| Used | `○` outline | slot consumido |
| Max | slots completos | config do personagem |

**Interaction:**
- Click dot cheio → vira vazio (optimistic) + trigger efeito se spell precisar (opcional)
- Click dot vazio → vira cheio (undo ou reset parcial)
- Descanso Longo → todos voltam pra cheio

**Visual em combate ativo:** dots com pulse gold ao mudar.

### 5.2 Sem slots configurados (não-caster)

**State:** card inteiro esconde. Regra CSS + conditional render.

---

## 6. ACTIVE EFFECTS (painel)

### 6.1 Row de efeito

| State | Visual |
|---|---|
| Active | `○ Nome · duração · [conc]  [↻][×]` |
| Expiring soon (<1min) | Badge warning + timer |
| Expired | Auto-remove após broadcast de turno |

**Interaction:**
- Click `[↻]` reset duração
- Click `[×]` remove efeito (optimistic)
- Click concentration → toggle concentração (ativo/passivo)
- Se já tem conc em outra spell → prompt "Trocar concentração?"

### 6.2 Concentration conflict

**Trigger:** adicionar efeito com `concentration=true` enquanto já existe um ativo.

**UI:**
```
┌─────────────────────────────────────────┐
│ ⚠ Conflito de Concentração              │
│                                         │
│ Você já concentra em "Proteção contra   │
│ Mal". Adicionar "Abençoar" removerá a   │
│ concentração anterior.                  │
│                                         │
│ [Cancelar]  [Trocar concentração]       │
└─────────────────────────────────────────┘
```

---

## 7. TAB BAR (topo)

| State | Visual |
|---|---|
| Active | text gold + border-bottom 2px gold |
| Inactive | text muted |
| Hover (inactive) | text foreground |
| With badge | label + badge `[N]` ou `⚡` pulsante |
| Disabled (error) | text subtle + not clickable |

**Interaction:**
- Click: switch tab (sem reload, SPA)
- Keyboard: focus via Tab; Enter/Space ativa; setas ← → circulam (aria pattern tabs)
- Atalho: 1/2/3/4

**A11y:**
- `role="tablist"` no container, `role="tab"` nas tabs, `role="tabpanel"` no conteúdo
- `aria-selected={true|false}`
- Tab order correta

---

## 8. LOADING / SKELETON

**Regra imutável** (Resilient Reconnection): nunca tela branca. Sempre skeleton.

### 8.1 Skeleton do Player HQ inicial

```
┌─ HEADER ────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░             │  ← linha animada
├─────────────────────────────────┤
│ ░░░ ░░░ ░░░ ░░░   (tabs)        │
├─────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░      │  ← ribbon
├─────────────────────────────────┤
│ COL A           COL B           │
│ ░░░ ░░░ ░░░    ░░░░░░░         │
│ ░░░ ░░░ ░░░    ░░░░░░░         │
│ ░░░░░░░░░░     ░░░░░░░         │
│ ░░░░░░░░░░     ░░░░░░░         │
└─────────────────────────────────┘
```

**Duração:** animação `pulse 1.5s infinite`. Se >3s fetch → mostrar mensagem "Conectando...".

### 8.2 Skeleton por seção (quando só parte recarrega)

- Ability scores: 6 chips cinza animados
- Spell list: 5 rows animadas
- Quests: 3 cards placeholder

---

## 9. ERROR STATES

### 9.1 Rede caiu mid-optimistic

1. Optimistic update rodou (HP −5 local)
2. Request timeout 10s ou erro HTTP
3. Revert local (HP volta pra valor pré-ação)
4. Toast destrutivo: "Não foi dessa vez. Tentar de novo?" com `[Tentar]`
5. Reconnection engine (Resilient Reconnection Rule) tenta em background

### 9.2 Permissão revogada (ex: Mestre expulsou jogador)

1. Realtime broadcast `membership:revoked`
2. Toast: "Seu acesso a essa campanha foi removido"
3. Redirect pra `/dashboard` após 3s
4. LocalStorage limpa estado específico da campanha

### 9.3 Personagem deletado (corner case)

1. Refresh da página → `/sheet/page.tsx` detecta `character=null`
2. Redirect pra `/app/campaigns/[id]` com toast "Personagem não encontrado"

---

## 10. OPTIMISTIC UPDATE RULES

**Regra geral:** toda ação de modificação faz optimistic UI + reverte em erro.

| Ação | Optimistic? | Revert em erro | Notas |
|---|---|---|---|
| HP change | ✅ | ✅ | Já implementado |
| Slot toggle | ✅ | ✅ | |
| Condition add/remove | ✅ | ✅ | |
| Effect add/remove | ✅ | ✅ | |
| Resource dot | ✅ | ✅ | |
| Item usage (decrement) | ✅ | ✅ | Com undo |
| Inventory add | 🟡 Parcial | ✅ | Mostra "Adicionando..." até ack |
| Note save | ❌ | — | Auto-save só persiste; mostra "Salvando..." |
| Quest status change | ✅ | ✅ | |

**Ack universal:** pulse gold 1.5s com `.glow-gold-flash` CSS class existente.

---

## 11. RESPONSIVIDADE — regras específicas

### 11.1 Breakpoints canônicos (DESIGN-SYSTEM)

| Breakpoint | Range | Layout do Player HQ |
|---|---|---|
| `xs` | <640px | Single-col. Ribbon compacto 48px. |
| `sm` | 640-767 | Single-col. Ribbon 48px. |
| `md` | 768-1023 | Single-col ou 2-col ajustado. Ribbon 56px. |
| `lg` | 1024-1279 | 2-col (cols ~480px). Ribbon 56px. |
| `xl` | 1280+ | 2-col (cols ~560px). Ribbon 56px. |

### 11.2 Touch targets (regra imutável WCAG)

Mobile + desktop:
- **Botões padrão:** min 40×40px
- **Dots clicáveis (slots, saves, resources):** visual pode ser 12-18px MAS área invisível clicável **min 44×44px**
- **FAB:** 56×56px
- **Slot dots no Ribbon Vivo:** 16px visual + 44px touch target (padrão CSS)

Implementação canônica em [ResourceDots.tsx:9-13](../../components/player-hq/ResourceDots.tsx#L9-L13):
```tsx
const DOT_SIZES: Record<DotSize, { dot: string; touch: string }> = {
  sm: { dot: "w-2.5 h-2.5", touch: "p-1.5" },  // dot 10px, container 44px
  md: { dot: "w-3.5 h-3.5", touch: "p-1" },     // dot 14px, container 44px
  lg: { dot: "w-5 h-5", touch: "p-0.5" },       // dot 20px, container 44px
};
// + className inclui sempre `min-w-[44px] min-h-[44px]`
```

**Comentário no código:** `I-02 fix: all sizes have invisible padding for 44px touch target`. **Regra:** todo dot interativo (saves, slots, resources, reactions) DEVE seguir esse padrão. Aplicar em RibbonVivo.tsx novo.

### 11.3 Safe zones

Mobile:
- Respeitar notch iPhone (padding-top via `env(safe-area-inset-top)`)
- Bottom nav / keyboard: scroll adjust

---

## 12. A11Y GLOBAL

### 12.1 Tab order (desktop, por tab)

Herói:
1. Skip link → #main-content
2. Sidebar (já existente)
3. Header: back button → campaign name → character name → actions (PDF, Edit)
4. Tab bar (Herói active)
5. Ribbon: HP controls → AC/Init/Speed/Insp/CD → slot summary → conditions
6. Col A: ability chips (6) → saves (6) → skills (18) → accordions (4)
7. Col B: effects → resources → slots → spells search → spells filter → spells list
8. FAB nota rápida (quando combate ativo)

### 12.2 ARIA landmarks

- `<header>` — topbar + campaign/character identity
- `<nav aria-label="Abas do personagem">` — tab bar
- `<main>` — conteúdo da tab
- `<aside aria-label="Status vivo">` — ribbon
- `<article>` — cada card grande (Efeitos, Recursos, Slots, Spells)

### 12.3 Contraste

Seguir DESIGN-SYSTEM §7 — WCAG AA mínimo:
- Body text: 4.5:1
- Large text (≥18px bold ou 24px): 3:1
- UI elements: 3:1
- **Validar:** gold #D4A853 on bg-card — passa em 14pt bold, FALHA em body regular (usar gold só pra labels/headings)

### 12.4 Reduced motion

`@media (prefers-reduced-motion: reduce)`:
- Pulse gold: desabilita
- Slide animations: vira fade
- Badge pulse: vira static
- Hover scale: desabilita

---

## 13. TELEMETRIA

Eventos a trackear (roadmap — não bloqueia MVP):

| Evento | Trigger | Propriedades |
|---|---|---|
| `player_hq.tab_switch` | click tab | `from`, `to`, `via` (click/keyboard) |
| `player_hq.hp_change` | ação HP | `delta`, `tier_before`, `tier_after`, `source` (ribbon/button) |
| `player_hq.slot_used` | click slot | `level`, `had_effect` (bool) |
| `player_hq.quick_note_created` | salvar nota rápida | `combat_active`, `length` |
| `player_hq.combat_auto_activated` | modo combate auto ON | `campaign_id` |
| `player_hq.entered_combat_view` | click "Entrar no Combate" | `time_since_start_broadcast` |

---

## 14. TESTES

### 14.1 Unit tests críticos

- `getHpStatus(current, max)` → retorna tier correto em todos os ranges
- `formatHpPct(current, max)` → retorna string correta
- Parser `@` menções — extrai corretamente de markdown
- Concentration conflict detector

### 14.2 E2E Playwright (ver Fase B6 e C6 em [09-implementation-plan](./09-implementation-plan.md))

Cenários obrigatórios:
- Login → dashboard → abre /sheet → default tab Herói
- Clica tab Arsenal → conteúdo correto
- Atalho `3` → Diário
- Realtime combat:started → badge aparece
- Jogador em Diário + combate iniciando → permanece em Diário, banner em Herói
- Click "Entrar no Combate" → `/app/combat/[id]`
- Broadcast combat:ended → banner some

### 14.3 Visual regression

Sugerido Percy ou similar:
- Screenshot cada tab em 3 breakpoints (390, 1024, 1440)
- Diff vs baseline em PRs

---

## 15. CHECKLIST DE QA POR STORY

Cada story (A1-D5) deve cumprir antes de merge:

- [ ] Functional acceptance criteria ✅
- [ ] TypeScript check limpo (`rtk tsc --noEmit`)
- [ ] Lint limpo (`rtk lint`)
- [ ] Unit tests passando
- [ ] E2E relevantes passando
- [ ] Visual regression OK
- [ ] Mobile 390px testado manualmente
- [ ] A11y: focus visible, aria correto, contraste
- [ ] Memory rules: Mestre-nunca-DM, HP tier EN, hex não-inline
- [ ] Combat Parity quando aplicável (guest/anon/auth)
- [ ] Screenshot antes/depois no PR
