# Epic 2 — Combat UX Hotfixes (v2)

> **Autora:** Sally (UX Designer / BMAD)
> **Versão:** 2.0 — revisada após adversarial review ([docs/ux-spec-review-findings.md](ux-spec-review-findings.md))
> **Data v1:** 2026-04-17 · **Data v2:** 2026-04-17
> **Origem:** Beta test sessão 3 (2026-04-16, DM Lucas Galupo)
> **Destinatário:** Dev agent (execução paralela ao spike de arquitetura em [docs/spike-beta-test-3-2026-04-17.md](spike-beta-test-3-2026-04-17.md))

---

## Changelog v1 → v2

Apenas as mudanças substantivas. Correções de file:line e typos não estão listadas.

- **H5 (HP numérico)** — `DEFEATED` **não** é mais adicionado ao union `HpStatus` de [lib/types/realtime.ts](../lib/types/realtime.ts). Passa a ser um estado derivado *client-side only* via helper `deriveClientHpState(combatant)`. Threshold change (70/40/10 → 75/50/25) agora está **atrás de feature flag** `ff_hp_thresholds_v2` com plano de rollout documentado. Mobile stack agora é explícito no pseudocódigo (`flex-col sm:flex-row`). Troca de `role="meter"` por `role="progressbar"` (melhor SR support). Label abreviada (`MOD`) reutiliza a chave existente `player.hp_status_moderate`, não cria chave nova.
- **H6 (Busca)** — Remove referência a `Fuse.config.getFn` (API instável). Agora usa a opção oficial `ignoreDiacritics: true` do Fuse v7 + um helper `normalizeForSearch` aplicado **no lado do caller** (filtros locais + query). Exporta `normalizeForSearch` de [lib/srd/normalize-query.ts](../lib/srd/normalize-query.ts) (arquivo novo). Threshold recalibrado de 0.35 para 0.4 nos índices com diacritic-insensitive (Fuse aplica distância maior após fold).
- **H7 (Badge 2014/2024)** — Badge agora só aparece se `monster.is_srd === true` OU se o consumer estiver num contexto `auth-gated` (rota fechada `/campaign/*`, `/session/*`, `/invite/*`). Em `/try` e `/srd` públicos, o badge é suprimido para monstros não-whitelisted, por SRD Compliance. Troca de `slate-*` para os tokens já existentes do projeto.
- **H8 (Auto-scroll + pulse)** — **Defer ao spike para o guard fix.** Esta spec agora cobre **apenas a camada visual (pulse + reduced-motion)**. O fix do `data-panel-open` guard está em [spike Finding 5](spike-beta-test-3-2026-04-17.md#finding-5). `useEffect` deps voltam para `[currentTurnIndex]` (não incluir `combatants`). Cleanup `pulseTimerRef` no unmount. Keyframe usa `--tw-gold` (brand) em vez de oracle-gold. Replica nos 3 clients (DM, Guest, Player) com a mesma classe.
- **H9 (HP por grupo)** — **Defer à spike [Finding 3](spike-beta-test-3-2026-04-17.md#finding-3) para a camada de dados** (como agregar/computar por membro). Esta spec cobre **apenas o display** (dots individuais + status line). Remove `computeGroupAgg` duplicado do PlayerInitiativeBoard. i18n unificado em `combat.hp_full/light/...` (o spec H5 e H9 agora usam a mesma chave).
- **H10 (Limpar/deletar grupo)** — Inclui agora **persist + broadcast + turn_index adjustment + state_sync** (paridade com `handleRemoveCombatant` em [lib/hooks/useCombatActions.ts:352-400](../lib/hooks/useCombatActions.ts#L352)). Touch targets subiram de 28×28 para 32×32 desktop (WCAG 2.5.8 AA).
- **H11 (Condições custom)** — Contradição Guest N/A vs aplicar resolvida: **Guest é DM** (solo play), então aplica. Cores `purple-*` substituídas por `gold` (token do projeto). Feature-flagged via `ff_custom_conditions_v1` (risco de colisão com parsers existentes de `concentrating:X`, `exhaustion:N`).
- **H12 (Quick actions)** — Anônimo **tem self-apply** (via `onSelfConditionToggle`) — lista atualizada. Auto-cleanup descrito explicitamente como disparado no `handleAdvanceTurn` do DM + broadcast `combat:condition_change` para players.
- **H13 (Richard)** — **BLOCKED pending DM clarification.** Removido o "implementar variante mínima como melhor palpite". Dev NÃO deve implementar sem confirmação do Lucas. Hotfix fica fora do sprint até haver resposta.
- **H14 (Login nudge)** — Correção do bug de detecção: `isRealAuth = !!user && !user.is_anonymous` (ref [PlayerJoinClient.tsx:415](../components/player/PlayerJoinClient.tsx#L415)). Analytics migra de `window.dispatchEvent` para `trackEvent()` (padrão do projeto). `returnUrl` sanitizado via whitelist de paths internos. TTL de dismissal fixa em 3 dias (remove ambiguidade "24h-7d"). `localStorage` com try/catch e fallback para `sessionStorage`.
- **Novo** — Seção **Design tokens & i18n inventory** (antes de todos os hotfixes).
- **Novo** — Seção **A11y checklist global** (WCAG AA contrast pairs, reduced-motion, focus management).
- **Novo** — Seção **Telemetry** (eventos a instrumentar por hotfix).
- **Novo** — Seção **Test strategy** por hotfix.
- **Novo** — Seção **Feature flags** (H5 threshold, H11 custom conditions).
- **Estimativas** — Revisadas de 18.5h para **50-70h** com justificativa em "Notas sobre estimativa". Sprint planning reorganizado em 4 sprints realistas (~2-3 dias cada).

---

## Cross-cutting com o Spike

Esta spec UX convive com o spike de arquitetura ([docs/spike-beta-test-3-2026-04-17.md](spike-beta-test-3-2026-04-17.md) + [docs/spike-review-findings.md](spike-review-findings.md)). Dependências bidirecionais explícitas:

| Tópico | UX spec (esta) | Spike | Decisão |
|---|---|---|---|
| Auto-scroll do DM | **H8** — camada visual (pulse, reduced-motion) | **Finding 5** — camada de controle (remover/relaxar o guard `data-panel-open`) | Spike é prerequisite. H8 só é visível após spike remover o guard. |
| HP de grupo | **H9** — camada de display (dots, aria, responsive) | **Finding 3** — camada de dados (como reconciliar `hp_status` por membro vs hp sum) | Paralelo. H9 depende de Finding 3 entregar o shape dos dados. |
| HP crítico legível | **H3** — badge do player (`HpStatusBadge`) | **Finding 7 Quick Win 2** — HP number no DM (`CombatantRow.tsx:459-468`) | Paralelo (lugares diferentes). Dev deve aplicar ambos — checar `CombatantRow` para o H3-like no DM |
| Ordem resistências | **H4** — reorder + ícones + i18n | **Finding 7 Quick Win 1** — reorder apenas | H4 é superset. Spike vai fazer apenas se H4 não chegar antes. |

**Antes de abrir PR para H8 ou H9, confirmar que o spike já foi mergeado.** Se spike ainda não tiver, criar branch compartilhada.

---

## Design tokens & i18n inventory (NEW)

### Tokens de cor permitidos

Apenas estes. Qualquer outro (purple, slate, hex raw, `rgba(...)` explícito) exige justificativa explícita no PR ou é bloqueio. Tokens definidos em [tailwind.config.ts:60-108](../tailwind.config.ts#L60) e [app/globals.css](../app/globals.css).

| Token | Tailwind class | Uso previsto |
|---|---|---|
| gold (brand) | `text-gold`, `bg-gold`, `bg-gold/10`, `bg-gold/20`, `border-gold/30`, `border-gold/40`, `ring-gold`, `ring-gold/30` | CTAs, turno atual, destaque premium, badge 2024 |
| gold/light/dark/hover | `text-gold-light`, `bg-gold-hover` | Hover states |
| oracle (statblock) | `text-oracle`, `bg-oracle/10` | **Somente** dentro de `.stat-card-5e` (compendium). **Não usar** em badges genéricos do combat. |
| cool | `text-cool`, `border-l-cool` | Marcador de player (linha esquerda) |
| warm / brand-red / brand-green | — | Marketing; não usar em combat UI |
| temp-hp | `text-temp-hp`, `bg-temp-hp` | Somente para HP temporário |
| surface-primary/secondary/tertiary/deep/overlay/auth | `bg-surface-primary`, `text-surface-primary`, `bg-surface-auth` | Backgrounds. Dialog usa `surface-auth` ([dialog.tsx:37](../components/ui/dialog.tsx#L37)). |
| emerald-400/500 | `text-emerald-400`, `bg-emerald-400/20`, `bg-emerald-500` | HP FULL/LIGHT, beneficial |
| green-400/500 | `text-green-400`, `bg-green-400/10`, `bg-green-500` | HP LIGHT (atual mapping) |
| amber-400 | `text-amber-400`, `bg-amber-400/10` | HP MODERATE, warning, limpar |
| red-400/500/600/700/900/950 | `text-red-400`, `bg-red-500`, `bg-red-700`, `bg-red-950/50` | HP HEAVY/CRITICAL, deletar |
| zinc-400/600/700/800 | `text-zinc-400`, `border-zinc-600`, `bg-zinc-700`, `bg-zinc-800` | DEFEATED, neutral empty state |
| foreground / muted-foreground | `text-foreground`, `text-muted-foreground` | Texto primário/secundário |
| border | `border-border` | Divisores |
| white/X transparência | `bg-white/[0.04]`, `bg-white/[0.06]`, `bg-white/[0.08]` | Sombras leves, fill de barras. **Aceito** (já usado no projeto). |

### Animações permitidas (em `app/globals.css`)

Existentes a reutilizar — NÃO criar duplicadas:
- `animate-critical-glow` (5s) em [globals.css:513-515](../app/globals.css#L513) — aplicado na row inteira quando `isCritical` ([CombatantRow.tsx:231](../components/combat/CombatantRow.tsx#L231))
- `animate-flash-red`, `animate-flash-green` — damage/heal pulse
- `animate-pulse-red` — HP=0 dramatic border
- `animate-pending-pulse` — optimistic ACK
- `animate-reaction-blink`

Novas (serão introduzidas):
- `animate-pulse-critical` (H3) — 1.2s, respiração sutil do badge CRITICAL. Coexiste com `animate-critical-glow` (que pulsa a row em 5s) — **verificar visualmente** se não causa efeito estroboscópico.
- `animate-turn-pulse` (H8) — 1s one-shot, destaque do turno novo.

### i18n inventory

**Convenção adotada (v2):** chaves de tier HP usam `combat.hp_{tier}` (sem prefixo `hp_status_`). A existência de `player.hp_status_*` (linhas 2333-2337) é **legado** que fica como está — callers não migram agora. Qualquer nova renderização de tier HP usa `combat.hp_{tier}`.

Namespaces existentes relevantes (verificar [messages/pt-BR.json](../messages/pt-BR.json)):
- `common` ([linha 2](../messages/pt-BR.json#L2))
- `combat` ([linha 1597](../messages/pt-BR.json#L1597)) — **primary para este epic**
- `combat.sheet` ([linha 953](../messages/pt-BR.json#L953)) — sub-namespace
- `player` ([linha 2266](../messages/pt-BR.json#L2266))
- `compendium` ([linha 2600](../messages/pt-BR.json#L2600))
- `conditions` ([linha 2144](../messages/pt-BR.json#L2144))

**Chaves novas por hotfix** (total ~32 — precisam existir em `pt-BR.json` E `en.json`):

| Hotfix | Namespace | Chave | PT-BR | EN |
|---|---|---|---|---|
| H1 | `common` | `close` | "Fechar" | "Close" (se não existir) |
| H2 | `combat` | `stat_card_close` | "Fechar ficha" | "Close card" |
| H2 | `combat` | `stat_card_minimize` | "Minimizar" | "Minimize" |
| H2 | `combat` | `stat_card_lock` | "Fixar posição" | "Lock position" |
| H2 | `combat` | `stat_card_focus` | "Focar" | "Focus" |
| H2 | `combat` | `stat_card_popout` | "Abrir em janela" | "Pop out" |
| H2 | `combat` | `stat_card_popin` | "Trazer de volta" | "Pop in" |
| H4 | `combat.sheet` | `defenses_header` | "Defesas" | "Defenses" |
| H5 | `combat` | `hp_defeated` | "CAÍDO" | "DOWN" |
| H9 | `combat` | `group_members_hp` | "HP dos membros do grupo" | "Group members HP" |
| H9 | `combat` | `hp_full_short` | "CHEIO" | "FULL" |
| H9 | `combat` | `hp_light_short` | "LEVE" | "LIGHT" |
| H9 | `combat` | `hp_moderate_short` | "MOD" | "MOD" |
| H9 | `combat` | `hp_heavy_short` | "GRAVE" | "HEAVY" |
| H9 | `combat` | `hp_critical_short` | "CRÍT" | "CRIT" |
| H9 | `combat` | `hp_defeated_short` | "CAÍDO" | "DOWN" |
| H10 | `combat` | `group_clear_defeated` | "Limpar derrotados" | "Clear defeated" |
| H10 | `combat` | `group_clear_defeated_aria` | "Limpar {n} derrotados do grupo" | "Clear {n} defeated from group" |
| H10 | `combat` | `group_clear_confirm_title` | "Limpar {n} {name} derrotado(s)?" | "Clear {n} defeated {name}?" |
| H10 | `combat` | `group_clear_confirm_desc` | "Os {n} membros mortos serão removidos. Os vivos continuam na iniciativa." | "{n} fallen members will be removed. The living stay in initiative." |
| H10 | `combat` | `group_clear_confirm_action` | "Limpar {n}" | "Clear {n}" |
| H10 | `combat` | `group_delete` | "Deletar grupo" | "Delete group" |
| H10 | `combat` | `group_delete_aria` | "Deletar o grupo {name} ({n} membros)" | "Delete group {name} ({n} members)" |
| H10 | `combat` | `group_delete_confirm_title` | "Deletar o grupo {name}?" | "Delete group {name}?" |
| H10 | `combat` | `group_delete_confirm_desc` | "Todos os {n} membros serão removidos. Esta ação não pode ser desfeita." | "All {n} members will be removed. This cannot be undone." |
| H10 | `combat` | `group_delete_confirm_action` | "Deletar grupo" | "Delete group" |
| H11 | `combat` | `custom_condition_label` | "Condição customizada" | "Custom condition" |
| H11 | `combat` | `custom_condition_name_placeholder` | "Nome (ex: Bênção)" | "Name (e.g. Blessed)" |
| H11 | `combat` | `custom_condition_desc_placeholder` | "Descrição (opcional)" | "Description (optional)" |
| H11 | `combat` | `custom_condition_apply` | "Aplicar" | "Apply" |
| H11 | `combat` | `custom_condition_aria` | "Condição customizada: {name}" | "Custom condition: {name}" |
| H12 | `combat` | `quick_actions_label` | "Ação rápida (este turno)" | "Quick action (this turn)" |
| H12 | `combat` | `action_dodge` / `_dash` / `_help` / `_disengage` / `_hide` / `_ready` | 6 labels | 6 labels |
| H12 | `combat` | `action_dodge_desc` / ... (6 desc) | 6 tooltips | 6 tooltips |
| H14 | `compendium` | `login_nudge_title` | "Compêndio SRD público" | "Public SRD compendium" |
| H14 | `compendium` | `login_nudge_desc` | "Entre para acessar compêndio completo, itens homebrew e traduções PT-BR." | "Log in for full compendium, homebrew items and PT-BR translations." |
| H14 | `compendium` | `login_nudge_cta_guest` | "Criar conta grátis" | "Sign up free" |
| H14 | `compendium` | `login_nudge_cta_anon` | "Entrar" | "Log in" |
| H14 | `compendium` | `login_nudge_dismiss` | "Dispensar" | "Dismiss" |

Dev agent: **criar as 32 chaves antes de tocar no primeiro componente**. Isso evita run-time errors de `next-intl` (que é strict por default).

---

## A11y checklist global (NEW)

Aplicar em TODO hotfix. Se algum item não couber, documentar no PR.

### WCAG AA contrast pairs verificados

| Combinação | Uso | Razão de contraste | Status |
|---|---|---|---|
| branco puro `#ffffff` sobre `bg-red-700` (`#b91c1c`) | Badge CRITICAL (H3) | 5.94:1 | AA normal & AAA grande |
| branco puro `#ffffff` sobre `bg-red-600` (`#dc2626`) | Fill da barra CRITICAL | 4.83:1 | AA normal |
| `text-amber-400` (`#fbbf24`) sobre `bg-surface-primary` | ShieldAlert (H4) | 9.5:1 | AAA |
| `text-red-400` (`#f87171`) sobre `bg-surface-primary` | ShieldX (H4) | 6.2:1 | AA |
| `text-cool` (`#5B8DEF`) sobre `bg-surface-primary` | ShieldRes (H4) | 4.6:1 | AA ✓ |
| `text-foreground` sobre `bg-gold/10` | Banner login nudge (H14) | depende do `--foreground` atual; spot-check manualmente | **verificar** |
| `text-gold` sobre `bg-surface-primary` | Headers, edition badge 2024 | 8.2:1 | AAA |
| branco sobre `bg-gold` | CTA primário (H14) | 3.1:1 | **FALHA AA para texto normal**. Usar `bg-gold text-surface-primary` ou aumentar peso. |

> **Ação H14:** CTA usa `bg-gold text-surface-primary` (não branco) — padrão do projeto e cumpre AA (14:1).

### Reduced motion

Toda animação NOVA (`animate-pulse-critical`, `animate-turn-pulse`) deve respeitar `prefers-reduced-motion: reduce` via seletor CSS:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse-critical,
  .animate-turn-pulse { animation: none !important; }
  /* fallback estático para turn pulse: apenas box-shadow fixo */
  .animate-turn-pulse {
    box-shadow: 0 0 0 2px theme('colors.gold.DEFAULT') !important;
  }
}
```

Transitions de width (barra HP) também: `@media (prefers-reduced-motion: reduce) { .hp-bar-fill { transition: none !important; } }`.

### Focus management

- Todo modal novo (AlertDialog H10, H11 input) deve trapar foco (Radix já faz).
- `focus:ring-2 focus:ring-gold/50` em **todos** os botões novos com `focus:outline-none`.
- Ordem DOM = ordem visual — não usar `tabIndex > 0`.
- Screen-reader-only em PT-BR por default — se um componente usa `<span className="sr-only">Close</span>`, o texto tem que ser traduzido para `sr-only` não duplicar com `aria-label`. Preferir SÓ `aria-label` quando houver ícone visual (ex: `<X />`).

### Semantic roles

| Componente | Role | Notas |
|---|---|---|
| Barra de HP | `role="progressbar"` + `aria-valuenow/min/max` | **NÃO** usar `role="meter"` — suporte SR fraco no Chrome |
| Dot de membro do grupo (H9) | `role="listitem"` dentro de `role="list"` | Mas ver nota de resumo primeiro (N membros lidos em grupo grande) |
| Banner nudge (H14) | **sem role explícito** OU `role="note"` | Não usar `role="complementary"` — landmark deve ser único na página |
| Badge de condição | `role="status"` quando é ephemeral (quick action); padrão `<span>` para persistente | — |

---

## Hotfix-by-hotfix

### Hotfix 1 — X de fechar do compêndio muito pequeno

**Sintoma.** Jogador ou DM abre o compêndio in-combat (via `PlayerCompendiumBrowser` dentro de um Radix Dialog) e precisa mirar num X de 16×16 px. No mobile é quase impossível acertar na primeira. O X está em [components/ui/dialog.tsx:43-46](../components/ui/dialog.tsx#L43) com `h-4 w-4`, ou seja 16×16. WCAG 2.5.5 pede 44×44 mínimo (AAA).

**Por que dói.** Compêndio é consultado dezenas de vezes por sessão — cada spell, cada condição, cada regra. Se fechar custa esforço, o DM começa a evitar abrir. Touch targets abaixo do mínimo iOS HIG (44×44 pt) são o sintoma mais comum de "app foi feito no desktop".

**Localização atual (verificado).**
- [components/ui/dialog.tsx:43-46](../components/ui/dialog.tsx#L43) — `DialogPrimitive.Close` com `h-4 w-4` e `absolute right-4 top-4`. Componente compartilhado — **propaga para todos os modais do app** (login, onboarding, settings, etc.).
- [components/player/PlayerCompendiumBrowser.tsx](../components/player/PlayerCompendiumBrowser.tsx) — usa o Dialog compartilhado em todos os 3 modos (Guest, Anon, Auth).

**Decisões passadas.** Commit `e9223be` ("fix(srd): race condition guards for loaders + WCAG 44px touch targets") já iniciou a migração 44×44 em outras áreas, mas o `Dialog` global ficou fora.

**Solução visual.**
- Área clicável **44×44** (WCAG 2.5.5 AAA + iOS HIG).
- Ícone `X` permanece 20×20 (`w-5 h-5`) — ícone é o alvo visual; os 44×44 são o alvo de toque.
- Background em hover (`bg-white/[0.06]`) + `rounded-md`.
- Deslocamento: `right-3 top-3`.
- Em mobile (<768px): manter o mesmo padrão — NÃO adicionar `backdrop-blur-sm` porque o Dialog já tem `bg-surface-auth` opaco ([dialog.tsx:37](../components/ui/dialog.tsx#L37)); blur sobre fundo opaco é no-op.
- **Risco:** o `max-w-md` default do Dialog (~448px) pode ficar apertado com o botão maior. Mitigar: o Dialog tem `p-6` interno, o botão absolute não consome espaço de layout. Spot-check visualmente em modais pequenos (login).

**Solução de código (pseudocódigo).**

`components/ui/dialog.tsx` (substitui linhas 43-46):
```tsx
<DialogPrimitive.Close
  className="absolute right-3 top-3 inline-flex items-center justify-center
             w-11 h-11 rounded-md
             text-white/70 hover:text-white hover:bg-white/[0.08]
             active:bg-white/[0.12]
             focus:outline-none focus:ring-2 focus:ring-gold/50
             transition-colors
             disabled:pointer-events-none"
  aria-label={t("close")}
>
  <X className="h-5 w-5" aria-hidden />
</DialogPrimitive.Close>
```

> `w-11 h-11` = 44 px (Tailwind base 4 × 11).
> Remover o `<span className="sr-only">Close</span>` — o `aria-label="Fechar"` já carrega a semântica, evita dupla leitura.

Callers não mudam — a prop is passthrough em todos os `DialogContent`.

**Parity checklist.**
- [x] Guest (`/try`) — `PlayerCompendiumBrowser` compartilhado
- [x] Anônimo (`/join/[token]`) — idem
- [x] Autenticado (`/invite/[token]`) — idem
- [x] DM view — [CombatSessionClient.tsx:1956](../components/session/CombatSessionClient.tsx#L1956) usa `PlayerCompendiumBrowser`

Único ponto de mudança, todos os modos beneficiam.

**A11y.**
- `aria-label="Fechar"` traduzido via `useTranslations("common")`.
- `focus:ring-2 focus:ring-gold/50` visível.
- `Esc` nativo via Radix.

**i18n.** chave `common.close` (adicionar se não existir).

**Telemetry.** Sem instrumentação específica (botão é UI básica).

**Test strategy.**
- Unit: N/A (shadcn Dialog)
- E2E: playwright test existente de login/compendium deve continuar passando — rodar suite completa `rtk playwright test`.
- Visual: antes/depois screenshot — opcional.

**Estimativa.** **S — 1h** (era 30min; uplift +30min por verificar 5-10 callers de Dialog custom no app para non-regression).

---

### Hotfix 2 — X de sair da ficha do monstro difícil de clicar

**Sintoma.** Na ficha fixada de monstro (`MonsterStatBlock` com `onClose`), o X no toolbar é 24×24. Em mobile é frustrante.

**Por que dói.** O DM fixa a ficha do BBEG, consulta 3 ações, e pra voltar ao combate precisa brigar com o botão. Cada interação ruim desabilita feature que diferencia o produto ("pin card").

**Localização atual (verificado).**
- [components/oracle/MonsterStatBlock.tsx:308-312](../components/oracle/MonsterStatBlock.tsx#L308) — `{onClose && <button ... ×>}`. Há também `popout` (297), `pop-in` (300), `minimize` (303), além do `onClose`. **4 botões no toolbar**, não 3 como v1 sugeria.
- [styles/stat-card-5e.css:64-82](../styles/stat-card-5e.css#L64) — `.stat-card-5e .card-toolbar button` com `width: 24px; height: 24px`.
- [components/oracle/FloatingCardContainer.tsx](../components/oracle/FloatingCardContainer.tsx) — wrapper das cards flutuantes (DM + Guest + Anon + Auth).

**Decisões passadas.** Toolbar projetada com 24×24 para caber 4 botões na borda de uma card com 320px de largura mínima.

**Solução visual.**
- Toolbar **inteira** aumenta de 24×24 → **36×36** (todos os 4 botões). Acomoda melhor em mobile e mantém visual consistente.
- **Apenas o Close** recebe destaque adicional: **44×44** + fundo `bg-red-950/50` (token do projeto — nada de rgba raw) + `text-red-200`. Único botão com tamanho AAA; é o mais frequente.
- Gap entre botões: 6px (de 4).
- Padding externo toolbar: top/right 6px (de 8).
- Em mobile (<768px): **todos** os botões 44×44 (card ocupa viewport; espaço não é problema).

**Solução de código.**

`styles/stat-card-5e.css` — substituir bloco 64-82:
```css
.stat-card-5e .card-toolbar {
  top: 6px;
  right: 6px;
  gap: 6px;
}

.stat-card-5e .card-toolbar button {
  width: 36px;
  height: 36px;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* demais propriedades existentes: color, border, bg, hover, etc. — manter */
  color: var(--5e-text-muted);
  background: transparent;
  border-radius: 4px;
}

/* Close — destaque e alvo AAA */
.stat-card-5e .card-toolbar button[data-action="close"] {
  width: 44px;
  height: 44px;
  background-color: rgb(69 10 10 / 0.5);  /* = bg-red-950/50 */
  color: rgb(254 202 202);                 /* = text-red-200 */
}
.stat-card-5e .card-toolbar button[data-action="close"]:hover {
  background-color: rgb(127 29 29 / 0.8); /* = bg-red-900/80 */
  color: #fff;
}

@media (max-width: 767px) {
  .stat-card-5e .card-toolbar button {
    width: 44px;
    height: 44px;
  }
}
```

`components/oracle/MonsterStatBlock.tsx` — adicionar `data-action` em **todos os 4 botões** (sem isso, o CSS `[data-action="close"]` não resolve):
```tsx
{/* popout — linha ~297 */}
<button type="button" data-action="popout" onClick={onPopout}
  aria-label={t("stat_card_popout")} title={t("stat_card_popout")}>⬆</button>

{/* pop-in — linha ~300 */}
<button type="button" data-action="popin" onClick={onPopin}
  aria-label={t("stat_card_popin")} title={t("stat_card_popin")}>⬇</button>

{/* minimize — linha ~303 */}
{onMinimize && (
  <button type="button" data-action="minimize" onClick={onMinimize}
    aria-label={t("stat_card_minimize")} title={t("stat_card_minimize")}>−</button>
)}

{/* close — linha ~308 */}
{onClose && (
  <button type="button" data-action="close" onClick={onClose}
    aria-label={t("stat_card_close")} title={t("stat_card_close")}>×</button>
)}
```

Adicionar no topo do arquivo (se já não tem):
```tsx
const t = useTranslations("combat");
```

**Parity checklist.**
- [x] Guest — cards flutuantes via `FloatingCardContainer` montado em `app/try/layout.tsx`
- [x] Anônimo — idem
- [x] Autenticado — idem
- [x] DM view — usado em [components/combat/CombatantRow.tsx:7](../components/combat/CombatantRow.tsx#L7) e no pin global

**A11y.**
- Labels traduzidos (5 chaves em `combat.*`: popout, popin, minimize, close, focus).
- Ordem do foco: focus, popout/popin, minimize, close (close último).
- `Esc` fecha a card no container do pin (já existe).

**i18n.** 5 chaves novas no namespace `combat` — ver inventory.

**Telemetry.** Sem instrumentação nova.

**Test strategy.**
- Visual: antes/depois screenshot mobile 375px + desktop 1280px.
- E2E: ajustar `e2e/combat/*.spec.ts` se existir teste de pin card.

**Estimativa.** **S-M — 1.5h** (era 45min; uplift por `data-action` em 4 botões + i18n em 5 chaves + verificação visual mobile).

---

### Hotfix 3 — HP em estado CRITICAL ilegível

**Sintoma.** Quando o monstro está com ≤10% HP, a label "CRITICAL" é `text-red-200` sobre `bg-red-950/50` no badge — duas tonalidades escuras. Em OLED, o texto some. No badge do **player** (PlayerInitiativeBoard).

**Por que dói.** O ápice dramático de um combate é quando um monstro está prestes a cair. Se o DM/player não LÊ "CRITICAL", perde o tempo dramático.

**Localização atual (verificado).**
- [lib/utils/hp-status.ts:31](../lib/utils/hp-status.ts#L31) — `CRITICAL: { colorClass: "text-red-200", bgClass: "bg-red-950/50", ... }`.
- [components/player/PlayerInitiativeBoard.tsx:79-100](../components/player/PlayerInitiativeBoard.tsx#L79) — `HpStatusBadge`. Verificado: tem **DUAS text-shadows** na linha 81 (`_0_0_6px_rgba(0,0,0,0.9),_0_0_2px_rgba(0,0,0,0.8)`) — paliativo existente.
- [components/combat/CombatantRow.tsx:225-231](../components/combat/CombatantRow.tsx#L225) — no DM, a row ganha `border-2 border-red-500/60 shadow-[0_0_6px_rgba(239,68,68,0.15)] animate-critical-glow` quando `isCritical` **mas não mexe na cor do HP number**. O HP number usa `text-muted-foreground` ([CombatantRow.tsx:462](../components/combat/CombatantRow.tsx#L462)) sem branch para isCritical — bug equivalente no DM, **spike Finding 7 Quick Win 2** aborda.

**Decisões passadas.** Tier CRITICAL projetado com vermelho-sobre-vermelho para transmitir urgência. Execução falhou em contraste.

**Solução visual.**
- **Badge (PlayerInitiativeBoard)**: texto branco (`text-white`) sobre `bg-red-700` sólido. Contraste branco/red-700 = 5.94:1 (AAA normal).
- **Ícone** (`Skull`): mudar de `text-red-200` para `text-white`.
- **Animação**: adicionar `animate-pulse-critical` (1.2s opacity 1.0↔0.85) **APENAS no badge**, não na row.
- **Row** (CombatantRow): SEM mudança de animação — já tem `animate-critical-glow` (5s). Não sobrepor pulse no badge com critical-glow na row = 2 frequências concorrentes. Testar visualmente em dev. Se conflitar, OPÇÃO: remover `animate-critical-glow` da row e deixar só o badge pulsando. Decisão deferida ao dev agent após visual test.
- **Remover** o `[text-shadow:...]` duplo da linha 81 — não é mais necessário com contraste AAA.
- **Respeita `prefers-reduced-motion`** — opacity fixa em 1.

**Solução de código.**

`lib/utils/hp-status.ts` — ATENÇÃO: `DEFEATED` **não é adicionado ao union type** (ver H5 para razão). Só o `CRITICAL` muda:
```ts
CRITICAL: {
  colorClass: "text-white",        // era text-red-200
  bgClass: "bg-red-700",           // era bg-red-950/50 (sólido, não /50)
  barClass: "bg-red-600",          // era bg-red-900 (fill mais brilhante)
  icon: "skull",
  labelKey: "hp_critical",
  pct: "≤10%",
},
```

`components/player/PlayerInitiativeBoard.tsx` — substituir linhas 79-100:
```tsx
<span
  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm lg:text-xs font-semibold ${style.colorClass} ${style.bgClass}${
    isCriticalStatus ? " animate-pulse-critical shadow-[0_0_12px_rgba(220,38,38,0.5)]" : ""
  }`}
  aria-label={`${label}${percentage != null ? ` ${percentage}%` : ""}`}
>
```

Remover o `[text-shadow:...]` (`_0_0_6px...`) completamente.

`app/globals.css` — adicionar após linha 515 (onde `critical-glow` termina):
```css
@keyframes pulse-critical {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
.animate-pulse-critical {
  animation: pulse-critical 1.2s ease-in-out infinite;
  will-change: opacity;
}
@media (prefers-reduced-motion: reduce) {
  .animate-pulse-critical { animation: none; opacity: 1; }
}
```

> **NÃO** usar Tailwind arbitrary animation (`animate-[pulse-critical_1.2s...]`) — JIT pode falhar e o escape de seletor fica frágil. Classe nomeada é melhor.

**Decisão sobre row glow.** Se testar visualmente e for estroboscópico:
- Opção A: remover `animate-critical-glow` quando badge tem `animate-pulse-critical` (apenas na row — manter o border/shadow estáticos).
- Opção B: manter ambos e aceitar que a frequência de 5s é tão lenta que não interfere perceptualmente.

Dev agent: **Opção B é o default**. Sinalizar no PR se descobrir conflito visual.

**Parity checklist.**
- [x] Guest — `getHpStatus()` é single source of truth; todos os modos usam.
- [x] Anônimo — PlayerInitiativeBoard é compartilhado.
- [x] Autenticado — idem.
- [x] DM view — CombatantRow (HP number) está fora do escopo H3. Ver spike Finding 7 Quick Win 2.

**A11y.**
- Contraste AA/AAA ✓.
- `prefers-reduced-motion` respeitado.
- `aria-label` já inclui "Critical 8%" (sem mudança).

**i18n.** Nenhuma chave nova (labels já existem em `combat.hp_critical`).

**Telemetry.** Opcional: `combat:hp_threshold_transition` (ver Feature flags para H5).

**Test strategy.**
- Visual: screenshot mobile+desktop do PlayerInitiativeBoard com combatant em CRITICAL (6 HP/34 max, etc.).
- A11y: rodar `axe-core` no badge.
- E2E: `e2e/combat/hp-status.spec.ts` — se não existir, criar.

**Estimativa.** **S-M — 1.5h** (era 30min; uplift: verificação visual com `animate-critical-glow`, decisão Opção A/B, teste de contraste).

---

### Hotfix 4 — Resistências movidas pro topo da ficha do monstro

**Sintoma.** Na `MonsterStatBlock`, resistências/imunidades/vulnerabilidades ficam em "Properties" depois de Skills, Senses, Languages, CR, Source — tipicamente abaixo da dobra em mobile. DM precisa rolar para ver se goblin é imune a poison.

**Por que dói.** Em 5e, resistências são **a informação tática principal**. Bardo lança Vicious Mockery num fiend — dano psíquico, fiend tem resistência? Consulta deve ser instantânea. Convenção da indústria (5e.tools, D&D Beyond) coloca resistências IMEDIATAMENTE abaixo de AC/HP/Speed, antes da ability table.

**Localização atual (verificado).**
- [components/oracle/MonsterStatBlock.tsx:374-405](../components/oracle/MonsterStatBlock.tsx#L374) — bloco AC/HP/Initiative/Speed.
- [components/oracle/MonsterStatBlock.tsx:407-413](../components/oracle/MonsterStatBlock.tsx#L407) — AbilityTable.
- [components/oracle/MonsterStatBlock.tsx:415-458](../components/oracle/MonsterStatBlock.tsx#L415) — Properties (saves, skills, damage vuln/res/imm, condition imm, senses, languages, CR, source).

**Decisões passadas.** Ordem segue SRD legado. Nunca foi repensada para combate digital.

**Solução visual.**

Nova ordem do miolo:

1. Header (nome + token + size/type/alignment)
2. Core stats: AC / HP / Init / Speed
3. **[NOVO] Defesas** (renderizado apenas se alguma existir):
   - Damage Vulnerabilities (`text-amber-400` + `ShieldAlert`)
   - Damage Resistances (`text-cool` + `Shield`) — **`text-cool` é o token do projeto, não `text-blue-400`**
   - Damage Immunities (`text-red-400` + `ShieldX`)
   - Condition Immunities (`text-red-400` + `ShieldX`)
4. AbilityTable
5. Properties restantes: Saves, Skills, Senses, Languages, CR, Source
6. Traits, Actions, Reactions, Legendary (inalterado)

- Sub-header "Defesas" em tipografia `section-header` (reutilizar classe existente) **sem** border-bottom vermelha — só `border-b border-white/[0.08]`.
- Ícones `lucide-react`: `ShieldAlert`, `Shield`, `ShieldX`. **NÃO usar emojis** (v1 misturou os dois — causou confusão). Apenas ícones lucide.
- Se monstro não tem nenhuma defesa → seção inteira some (sem header vazio).

**Contagem de dividers.** Ordem final fica:
```
{Header} {Core} <CardDivider/> {Defesas?} <CardDivider/> {AbilityTable} <CardDivider/> {Saves/Skills/Senses/Lang/CR/Source}
```
= **3 dividers** se Defesas existem, **2 dividers** se não existem.
V1 tinha 2 dividers. Aceitar o uplift — visualmente quebra bem o stat block em seções claras. Se o DM feedback for "muito dividido", remover o divider antes de AbilityTable.

**Solução de código.**

`components/oracle/MonsterStatBlock.tsx` entre linhas 405 e 415:
```tsx
{/* Core stats — manter (374-405) */}

{/* NOVO: Defesas */}
{(damageVuln || damageRes || damageImm || conditionImm) && (
  <>
    <CardDivider />
    <h4 className="section-header">{L.defenses}</h4>
    {damageVuln && (
      <PropLine label={L.damageVulnerabilities} value={damageVuln}
        icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-400" aria-hidden />} />
    )}
    {damageRes && (
      <PropLine label={L.damageResistances} value={damageRes}
        icon={<Shield className="w-3.5 h-3.5 text-cool" aria-hidden />} />
    )}
    {damageImm && (
      <PropLine label={L.damageImmunities} value={damageImm}
        icon={<ShieldX className="w-3.5 h-3.5 text-red-400" aria-hidden />} />
    )}
    {conditionImm && (
      <PropLine label={L.conditionImmunities} value={conditionImm}
        icon={<ShieldX className="w-3.5 h-3.5 text-red-400" aria-hidden />} />
    )}
  </>
)}

{/* AbilityTable — manter (408-413) */}

{/* Properties — REMOVER damageVuln/damageRes/damageImm/conditionImm daqui */}
<CardDivider />
{savingThrowsStr && <PropLine label={L.savingThrows} value={savingThrowsStr} />}
{skills && <PropLine label={L.skills} value={skills} />}
{/* damageVuln/damageRes/damageImm/conditionImm — REMOVER (movidos acima) */}
{sensesStr && <PropLine label={L.senses} value={sensesStr} />}
{monster.languages && <PropLine label={L.languages} value={monster.languages} />}
<PropLine label={L.challenge} value={crDisplay} />
{/* source — manter */}
```

Estender `PropLine` (linhas 83-90) com prop `icon`:
```tsx
function PropLine({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <p className="prop-line">
      {icon && <span className="inline-flex items-center mr-1 align-middle">{icon}</span>}
      <span className="prop-label">{label} </span>
      <span className="prop-value">{value}</span>
    </p>
  );
}
```

Adicionar `L.defenses` em [lib/i18n/stat-labels.ts](../lib/i18n/stat-labels.ts):
- EN: `"Defenses"` · PT-BR: `"Defesas"`

Chave i18n adicional: `combat.sheet.defenses_header` (para uso em outros contextos se necessário).

**Parity checklist.**
- [x] Guest — MonsterStatBlock via floating cards + MonsterSearchPanel
- [x] Anônimo — compêndio
- [x] Autenticado — idem
- [x] DM view — principal

**A11y.**
- Ícones `aria-hidden` ✓ (texto da label já carrega semântica).
- Ordem DOM linear segue ordem visual.

**i18n.** 1 chave nova (`combat.sheet.defenses_header`) + `L.defenses` em `stat-labels`.

**Telemetry.** Sem instrumentação nova.

**Test strategy.**
- Visual: 3 screenshots — monstro com todas as defesas (Rakshasa/Lich), monstro sem nenhuma (Rat), monstro com apenas condition immunities (Goblin-like).
- Unit: `PropLine` com e sem `icon`.

**Estimativa.** **M — 2h** (era 1.5h; uplift: L.defenses em stat-labels, verificação visual 3 cenários, remover emojis e usar só lucide).

---

### Hotfix 5 — HP numérico com barra visual

**Sintoma.** Players veem HP de monstros como labels textuais (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) via `HpStatusBadge`. Sem número, sem percentual sem hover. Bardo pergunta "quanto de HP tem esse goblin?" — player vê LIGHT e adivinha.

**Por que dói.** Tactical combat depende de precisão. Player decide gastar Hunter's Mark baseado em "será que esse dano mata?". Labels qualitativas criam ambiguidade.

**Importante.** Preservar o **anti-metagaming** — se o DM marcou HP do monstro como "hidden HP" (intenção do `hp_status`), o player vê percentual aproximado, não valor absoluto.

**Localização atual (verificado).**
- [lib/utils/hp-status.ts](../lib/utils/hp-status.ts) — tiers e thresholds. **NÃO** alterar union `HpStatus` (ver abaixo).
- [components/player/PlayerInitiativeBoard.tsx:72-101](../components/player/PlayerInitiativeBoard.tsx#L72) — `HpStatusBadge` atual.
- [components/player/PlayerInitiativeBoard.tsx:1153](../components/player/PlayerInitiativeBoard.tsx#L1153) — consumidor. **Importante**: a branch em 1153 é `else if (combatant.hp_status || otherPlayerHpStatus)` — significa que nesse escopo, o combatant **só tem tier, não números**. Dev precisa adicionar a branch anterior (com `current_hp`/`max_hp`) para entrar no `HpDisplay` — a existente só tem tier.

### DEFEATED como estado derivado client-side (NÃO no union HpStatus)

**Decisão crítica v2.** `DEFEATED` **não** é adicionado a `HpStatus` porque o type é importado em [lib/types/realtime.ts](../lib/types/realtime.ts) (broadcasts DM ↔ players). Um player com código antigo receberia `hp_status: "DEFEATED"` e quebraria em `HP_STATUS_STYLES[status]` (undefined).

Em vez disso:
- O broadcast continua enviando `hp_status: "CRITICAL" | "HEAVY" | ...` (5 valores atuais) E `is_defeated: boolean` (campo já existente em `Combatant`).
- Client deriva o estado visual `"DEFEATED"` quando `is_defeated === true` OU `current_hp <= 0`.

Helper novo em `lib/utils/hp-status.ts` (append, não substituir):
```ts
/** Client-side only derived state for display. NOT part of HpStatus union. */
export type HpDisplayState = HpStatus | "DEFEATED";

export function deriveDisplayState(
  current: number | null,
  max: number | null,
  is_defeated: boolean,
  hp_status?: HpStatus | null,
): HpDisplayState {
  if (is_defeated) return "DEFEATED";
  if (current != null && current <= 0) return "DEFEATED";
  if (hp_status) return hp_status;
  if (current != null && max != null && max > 0) return getHpStatus(current, max);
  return "FULL"; // safe fallback
}

/** Styles including DEFEATED — for display only, does NOT export to realtime types. */
export const HP_DISPLAY_STYLES: Record<HpDisplayState, HpStatusStyle> = {
  ...HP_STATUS_STYLES,
  DEFEATED: {
    colorClass: "text-zinc-400",
    bgClass: "bg-zinc-800",
    barClass: "bg-zinc-700",
    icon: "skull",
    labelKey: "hp_defeated",
    pct: "0",
  },
};
```

Broadcasts não mudam. Players antigos veem CRITICAL ao invés de DEFEATED — UX degrada graciosamente, sem crash.

### Feature flag — threshold change 70/40/10 → 75/50/25

**Decisão crítica v2.** Thresholds mudam por pedido do DM, MAS combates em andamento transicionam de tier em momentos diferentes. Se o goblin estava em MODERATE com 42% HP, passa para HEAVY. Isso pode ser confuso no meio da sessão.

**Rollout:**
1. Adicionar env var/cookie flag `ff_hp_thresholds_v2` (default `false`).
2. `getHpStatus()` lê a flag (ou sobrecarrega via param):
   ```ts
   export function getHpStatus(currentHp: number, maxHp: number): HpStatus {
     if (maxHp <= 0) return "CRITICAL";
     if (currentHp >= maxHp) return "FULL";
     const pct = currentHp / maxHp;
     const v2 = isFeatureFlagEnabled("ff_hp_thresholds_v2");
     if (v2) {
       if (pct >= 0.75) return "LIGHT";
       if (pct >= 0.50) return "MODERATE";
       if (pct >= 0.25) return "HEAVY";
       return "CRITICAL";
     }
     if (pct > 0.7) return "LIGHT";
     if (pct > 0.4) return "MODERATE";
     if (pct > 0.1) return "HEAVY";
     return "CRITICAL";
   }
   ```
3. Habilitar em staging para DMs beta (Lucas) primeiro. Default-off por 1 sprint.
4. Default-on após 1 semana de feedback positivo. Remover flag após 1 release.

**Alternativa se não quisermos flag:** aceitar o uplift gradual — combates existentes têm transições "visualmente surpreendentes" mas não bugam.

**Thresholds finais (v2 on):**

| Tier | Range | Cor barra | Cor badge |
|---|---|---|---|
| FULL | 100% | `bg-emerald-500` | `text-emerald-400 bg-emerald-400/20` |
| LIGHT | 75–99% | `bg-green-500` | `text-green-400 bg-green-400/10` |
| MODERATE | 50–74% | `bg-amber-400` | `text-amber-400 bg-amber-400/10` |
| HEAVY | 25–49% | `bg-red-500` | `text-red-500 bg-red-500/10` |
| CRITICAL | 1–24% | `bg-red-600` | `text-white bg-red-700` (H3) |
| DEFEATED | 0 ou is_defeated | `bg-zinc-700` | `text-zinc-400 bg-zinc-800` |

### Componente HpDisplay

**Novo arquivo:** `components/combat/HpDisplay.tsx`.

```tsx
"use client";
import { HP_DISPLAY_STYLES, deriveDisplayState, getHpPercentage } from "@/lib/utils/hp-status";
import { useTranslations } from "next-intl";
import { HeartPulse, Heart, Skull } from "lucide-react";

interface HpDisplayProps {
  current: number | null;
  max: number | null;
  is_defeated: boolean;
  hp_status?: HpStatus | null;
  revealExact?: boolean;  // default true
  size?: "sm" | "md";
}

export function HpDisplay({
  current, max, is_defeated, hp_status,
  revealExact = true, size = "md"
}: HpDisplayProps) {
  const state = deriveDisplayState(current, max, is_defeated, hp_status);
  const style = HP_DISPLAY_STYLES[state];
  const pct = current != null && max != null ? getHpPercentage(current, max) : 0;
  const t = useTranslations("combat");
  const label = t(style.labelKey as Parameters<typeof t>[0]);

  // SR label
  const ariaLabel = revealExact && current != null && max != null
    ? t("hp_aria_exact", { current, max, label, pct })
    : t("hp_aria_tier", { label, pct });

  // Icon
  const Icon = style.icon === "heartpulse" ? HeartPulse
    : style.icon === "skull" ? Skull
    : Heart;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 ${size === "sm" ? "text-xs" : "text-sm"}`}
      role="progressbar"
      aria-valuenow={current ?? 0}
      aria-valuemin={0}
      aria-valuemax={max ?? 0}
      aria-label={ariaLabel}
    >
      {/* Linha 1 mobile: números + ícone | Desktop: inline */}
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`${style.colorClass} shrink-0 w-4 h-4`} aria-hidden />
        <span className={`font-mono font-semibold ${style.colorClass} tabular-nums`}>
          {revealExact && current != null && max != null ? `${current}/${max}` : "??/??"}
        </span>
      </div>

      {/* Linha 2 mobile: barra + badge | Desktop: inline */}
      <div className="flex items-center gap-2 min-w-0">
        <div className={`${size === "sm" ? "w-12" : "w-20"} sm:w-20 h-1.5 bg-white/[0.06] rounded-full overflow-hidden shrink-0`}>
          <div
            className={`h-full ${style.barClass} hp-bar-fill`}
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${style.colorClass} ${style.bgClass}`}>
          {label}{revealExact ? ` ${pct}%` : ""}
        </span>
      </div>
    </div>
  );
}
```

Adicionar em `app/globals.css`:
```css
.hp-bar-fill {
  transition: width 300ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .hp-bar-fill { transition: none; }
}
```

Consumidores — substituir `HpStatusBadge` por `HpDisplay` **condicionalmente**:
- [PlayerInitiativeBoard.tsx:1153](../components/player/PlayerInitiativeBoard.tsx#L1153) — adicionar branch ANTES do `else if (hp_status)`:
  ```tsx
  if (combatant.current_hp != null && combatant.max_hp != null && combatant.max_hp > 0) {
    return <HpDisplay current={combatant.current_hp} max={combatant.max_hp}
      is_defeated={combatant.is_defeated ?? false}
      revealExact={!hideHpForThisCombatant} size="md" />;
  } else if (combatant.hp_status || otherPlayerHpStatus) {
    return <HpStatusBadge ... />; // manter caminho legacy
  }
  ```
- [MonsterGroupHeader.tsx:165-177](../components/combat/MonsterGroupHeader.tsx#L165) — **remover** `{totalCurrentHp}/{totalMaxHp}` somado (ver H9).
- [CombatantRow.tsx](../components/combat/CombatantRow.tsx) — DM já tem HP como números. **Não aplicar**.

**Parity checklist.**
- [x] Guest — PlayerInitiativeBoard em modo leitura
- [x] Anônimo — idem
- [x] Autenticado — idem
- [ ] DM view — **N/A** (DM já tem número)

**A11y.**
- `role="progressbar"` (não `meter` — Chrome SR fraco).
- `aria-valuenow/min/max` setados.
- `prefers-reduced-motion` respeita transition.

**i18n.**
- `combat.hp_defeated` (CAÍDO / DOWN) — nova.
- `combat.hp_aria_exact` (novo): "HP {current} de {max} ({label}, {pct}%)"
- `combat.hp_aria_tier` (novo): "HP {label} ({pct}%)"

**Telemetry.**
- `combat:hp_threshold_transition` — opcional, dispara quando flag `v2` muda o tier de um combatant.

**Test strategy.**
- Unit (vitest): `deriveDisplayState` — casos FULL/LIGHT/MOD/HEAVY/CRIT/DEFEATED + null max.
- Unit: `getHpStatus()` com flag v1 e v2 — 75%, 50%, 25% boundary.
- Visual: screenshot mobile (stack vertical) + desktop (inline) em todos os 6 tiers.
- E2E: combate com goblin recebendo dano gradual — verificar transição visual.

**Estimativa.** **L — 5h** (era 2h; uplift: flag de threshold + rollout planning + ui component + 2 conditional branches em consumidores + i18n + 6 visual tests).

---

### Hotfix 6 — Busca do compêndio com acentos e sinônimos

**Sintoma.** DM digita "Velociraptor" — nada. Digita "Owlbear" — nada. Mas em PT-BR `name_pt` existe. Digita "remora" — não encontra `Rêmora` com acento. Filtros locais em [PlayerCompendiumBrowser.tsx:213-215](../components/player/PlayerCompendiumBrowser.tsx#L213) usam `m.name.toLowerCase().includes(lower)` — não normaliza acentos, ignora `name_pt`.

**Por que dói.** Busca quebrada = compêndio inútil. DM perde confiança. É o bug mais corrosivo da lista.

**Localização atual (verificado).**
- [lib/srd/srd-search.ts:53-64](../lib/srd/srd-search.ts#L53) — `MONSTER_OPTIONS` já tem `name_pt` com weight 0.25.
- [components/combat/MonsterSearchPanel.tsx:250-260](../components/combat/MonsterSearchPanel.tsx#L250) — **bug principal**: Fuse local só com `name`, `type`, `cr` — ignora `name_pt`.
- [components/oracle/MonsterSearch.tsx:42](../components/oracle/MonsterSearch.tsx#L42) — usa `searchMonsters()` global.
- [components/player/PlayerCompendiumBrowser.tsx:210-218](../components/player/PlayerCompendiumBrowser.tsx#L210) — filtro local monstros.
- [PlayerCompendiumBrowser.tsx:200-208](../components/player/PlayerCompendiumBrowser.tsx#L200) — filtro de spells (análogo).
- [PlayerCompendiumBrowser.tsx:220+](../components/player/PlayerCompendiumBrowser.tsx) — conditions, items, feats, races, backgrounds (6 filtros análogos).

### Fuse API correction (critical fix)

**Problema v1.** V1 usava `Fuse.config.getFn(obj, path)` — isso é o default getFn (nested path resolver), mas não tratar como API pública é frágil (não documentado).

**Solução v2.** Fuse v7 tem opção oficial [`ignoreDiacritics: boolean`](../node_modules/fuse.js/dist/fuse.d.ts#L299) (verificado em `node_modules/fuse.js/dist/fuse.d.ts:299`). **Usar essa opção** em vez de custom getFn.

**Para filtros locais** (que não usam Fuse, apenas `.toLowerCase().includes()`), criar helper explícito:

```ts
// lib/srd/normalize-query.ts — ARQUIVO NOVO
export function normalizeForSearch(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip combining diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, "") // remove pontuação, hífens, mas preserva letras unicode
    .trim();
}

/** Custom getFn for Fuse when ignoreDiacritics isn't enough (e.g. also strip hyphens). */
export function createNormalizingGetFn<T>(defaultGetFn: (obj: T, path: string | string[]) => ReadonlyArray<string> | string) {
  return (obj: T, path: string | string[]) => {
    const raw = defaultGetFn(obj, path);
    if (typeof raw === "string") return normalizeForSearch(raw);
    if (Array.isArray(raw)) return raw.map(v => typeof v === "string" ? normalizeForSearch(v) : v);
    return raw;
  };
}
```

**Atualizar `lib/srd/srd-search.ts` (linhas 53-64) — `MONSTER_OPTIONS`:**
```ts
const MONSTER_OPTIONS: IFuseOptions<SrdMonster> = {
  keys: [
    { name: "name", weight: 0.35 },
    { name: "name_pt", weight: 0.30 },
    { name: "id", weight: 0.15 },
    { name: "type", weight: 0.15 },
    { name: "cr", weight: 0.05 },
  ],
  threshold: 0.4,           // recalibrado de 0.35 — diacritic fold aumenta matches
  ignoreLocation: true,
  ignoreDiacritics: true,    // NOVO — Fuse v7+ built-in
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
};

export function searchMonsters(query: string, version?: RulesetVersion): FuseResult<SrdMonster>[] {
  if (!monsterIndex || !query) return [];
  const results = monsterIndex.search(query);  // Fuse trata diacritics internamente
  if (version) return results.filter((r) => r.item.ruleset_version === version);
  return results;
}
```

Aplicar também em `SPELL_OPTIONS`, `ITEM_OPTIONS`, `FEAT_OPTIONS`, `BACKGROUND_OPTIONS` — adicionar `ignoreDiacritics: true`.

**Corrigir `components/combat/MonsterSearchPanel.tsx:250-260`:**
```ts
fuseRef.current = new Fuse(monsters, {
  keys: [
    { name: "name", weight: 0.4 },
    { name: "name_pt", weight: 0.3 },
    { name: "id", weight: 0.15 },
    { name: "type", weight: 0.15 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  ignoreDiacritics: true,
  includeScore: true,
  minMatchCharLength: 2,
});
```

**Corrigir 6 filtros locais em `components/player/PlayerCompendiumBrowser.tsx`:**
```ts
import { normalizeForSearch } from "@/lib/srd/normalize-query";

// monsters (linha 211-218)
const filteredMonsters = useMemo(() => {
  let result = monsters;
  if (monsterNameFilter) {
    const needle = normalizeForSearch(monsterNameFilter);
    result = result.filter((m) =>
      normalizeForSearch(m.name).includes(needle) ||
      normalizeForSearch(m.name_pt ?? "").includes(needle) ||
      normalizeForSearch(m.id).includes(needle)
    );
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}, [monsters, monsterNameFilter]);

// spells (adaptar)
// items, conditions, feats, races, backgrounds — idem
```

Aplicar também em `globalResults` (linha 285 — verificada).

### Testes de aceitação (que DEVEM passar)

- `"velociraptor"` → encontra
- `"Velociraptor"` → encontra
- `"remora"` → encontra `Rêmora` (se existir no dataset)
- `"Owlbear"` → encontra
- `"owl bear"` → encontra (após normalização remove espaços internos extras)
- `"drag"` → lista dragons (minMatchCharLength=2 permite "dr"; aceitar)
- `"polvo"` (PT) → encontra Octopus (**dependente** de `name_pt` estar populado para Octopus; dev deve verificar `data/srd/monsters-*.json` antes)

**Parity checklist.**
- [x] Guest — MonsterSearchPanel compartilhado
- [x] Anônimo — PlayerCompendiumBrowser
- [x] Autenticado — idem
- [x] DM view — MonsterSearchPanel + PlayerCompendiumBrowser

**A11y.** Input já tem `aria-label`, `aria-autocomplete="list"` ✓.

**i18n.** Sem chaves novas.

**Telemetry.** Opcional: `compendium:search_empty_result` (query normalizada + charCount) para monitorar cobertura PT-BR.

**Test strategy.**
- Unit (vitest): `normalizeForSearch` — 10+ casos (vazio, null, acentos, hífens, unicode CJK edge, emoji).
- Unit: `searchMonsters` — 7 casos de aceitação acima com dataset mock.
- E2E: `e2e/compendium/search.spec.ts` — teclar "Velociraptor" + assert aparece; teclar "remora" + assert.

**Estimativa.** **M-L — 3h** (era 2h; uplift: helper novo, 7 Fuse configs + 6 filtros locais, threshold recalibration, teste de aceitação).

---

### Hotfix 7 — Badge de edição (2014/2024) no card do monstro

**Sintoma.** Monstros têm duas edições — 2014 e 2024 — com stats diferentes. No card e na linha do combatente não é óbvio qual edição está ativa. DM pode estar olhando 2014 achando que é 2024.

**Por que dói.** Ambiguidade sobre regras = "não sei em qual mundo estou".

**Localização atual (verificado).**
- [components/oracle/MonsterStatBlock.tsx:474-478](../components/oracle/MonsterStatBlock.tsx#L474) — versão aparece INSIDE propline "Source" com `opacity-60`. Muito discreto.
- [components/oracle/MonsterStatBlock.tsx:349-368](../components/oracle/MonsterStatBlock.tsx#L349) — header da ficha.
- [components/session/RulesetSelector.tsx:50-59](../components/session/RulesetSelector.tsx#L50) — `VersionBadge` existe. Hoje estilo neutro (`bg-white/[0.06] text-muted-foreground`).
- [components/combat/CombatantRow.tsx:542-543](../components/combat/CombatantRow.tsx#L542) — `VersionBadge` aparece na row. Confirmado.

### SRD Compliance (regra imutável — CLAUDE.md)

**Risco v1.** Mudar `VersionBadge` globalmente tornaria o badge dourado destacado. Se `fullDataMode=true` e o contexto mostra monstros não-SRD (VGM, MPMM, etc.), o badge dourado pode insinuar "este é conteúdo novo SRD" em monstros que NÃO são SRD. Isso expõe conteúdo/metadata não-SRD em UI.

**Solução v2.** Dois níveis de gating:
1. **Dataset-level**: todo `SrdMonster` tem `is_srd?: boolean` ([lib/srd/srd-loader.ts:28,73](../lib/srd/srd-loader.ts#L28)). Badge só renderiza com estilo destacado se `is_srd === true`. Para monstros não-SRD, o badge aparece em estilo **neutro** (o atual `bg-white/[0.06] text-muted-foreground`).
2. **Route-level**: em rotas públicas (`/try`, `/srd/*`, compêndio público), o `fullDataMode` deve estar off por default. Se on, badge neutro ainda se aplica via regra 1.

**Visual.**
- 2014: `bg-white/[0.06] text-muted-foreground border border-border` (neutro, o atual).
- 2024 SRD: `bg-gold/20 text-gold border border-gold/40` (destaque dourado).
- 2024 não-SRD: `bg-white/[0.06] text-muted-foreground border border-border` (neutro — NÃO destaca).

**Solução de código.**

`components/session/RulesetSelector.tsx:50-59` — substituir:
```tsx
export function VersionBadge({ version, isSrd = false }: {
  version: RulesetVersion;
  isSrd?: boolean;  // default false = conservative (neutral style)
}) {
  const highlight2024 = version === "2024" && isSrd;
  const styles = highlight2024
    ? "bg-gold/20 text-gold border border-gold/40"
    : "bg-white/[0.06] text-muted-foreground border border-border";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${styles}`}
      aria-label={`Ruleset ${version}`}
      title={version === "2024" ? "D&D 2024" : "D&D 2014"}
    >
      {version}
    </span>
  );
}
```

Callers devem passar `isSrd={monster.is_srd ?? false}`:
- `MonsterStatBlock.tsx:349-368` (header): `<VersionBadge version={monster.ruleset_version} isSrd={monster.is_srd} />`
- `CombatantRow.tsx:542-543`: idem
- `MonsterSearchPanel.tsx`: idem
- `RulesetSelector.tsx` self-usage (filtro): `isSrd={true}` (filtro sempre mostra opção da edição, independente de dataset)

Remover o span `(2024)` pequeno em `MonsterStatBlock.tsx:474-478`:
```tsx
{monster.source && (
  <p className="prop-line">
    <span className="prop-label">{L.source} </span>
    <span className="prop-value">{getSourceName(monster.source)}</span>
  </p>
)}
```

**Parity checklist.**
- [x] Guest — stat block via floating cards
- [x] Anônimo — idem
- [x] Autenticado — idem
- [x] DM view — CombatantRow + floating cards + MonsterSearchPanel

**A11y.**
- `aria-label="Ruleset 2024"` ✓.
- `title` com descrição — tooltip nativo.

**i18n.** Sem chaves novas.

**Telemetry.** Sem instrumentação nova.

**Test strategy.**
- Unit: `VersionBadge` com `isSrd=true/false` — 4 combinações (2014/2024 × SRD/non-SRD).
- Visual: 4 screenshots.

**Estimativa.** **S-M — 1.5h** (era 45min; uplift: `isSrd` prop propagation em 4 callers, 4 visual cases, SRD compliance verification).

---

### Hotfix 8 — Auto-scroll suave + pulse highlight do ator atual

**Sintoma.** Quando o turno avança, a lista de iniciativa scrolla pro combatente atual (DM apenas, com guard `data-panel-open`). Mas (a) o guard atual bloqueia scroll quando qualquer painel está aberto ([CombatSessionClient.tsx:1886](../components/session/CombatSessionClient.tsx#L1886)); (b) não há pulse visual.

**Por que dói.** Combat tracker só serve se o mestre sabe de quem é o turno sem pensar.

### Defer ao spike — guard fix

**Importante.** O guard `if (document.querySelector('[data-panel-open="true"]')) return;` em [CombatSessionClient.tsx:1886](../components/session/CombatSessionClient.tsx#L1886) é identificado pelo spike [Finding 5](spike-beta-test-3-2026-04-17.md#finding-5) como **root cause** do auto-scroll não funcionar na prática. `data-panel-open` é setado em [CombatantRow.tsx:238](../components/combat/CombatantRow.tsx#L238) sempre que qualquer popover está aberto — ou seja, o guard ativa em cenários legítimos (DM olhando condição do combatente atual → guard impede scroll do próximo turno).

**Esta spec UX NÃO altera o guard.** O spike owner decide:
- Remover o guard.
- Relaxar: só bloquear se painel está aberto na **row atual** (não em outras rows).
- Fechar painels automaticamente no advance turn.

H8 assume que o guard vai ser resolvido pelo spike. Camada visual (pulse + reduced-motion) é escopo dedicado.

### Camada UX apenas — Pulse highlight

**Solução visual.**
1. Scroll suave — **já existe** em 3 clients. Esta spec valida que os 3 estão alinhados (eles NÃO estão — ver Parity).
2. **Pulse** de 1s no combatente atual após scroll:
   - `ring-2 ring-gold` + `shadow-[0_0_16px_rgba(212,168,83,0.6)]` (brand gold `#D4A853`, ref [tailwind.config.ts:66](../tailwind.config.ts#L66) — **NÃO oracle gold** `#c9a959` que é exclusivo do statblock).
   - Animação fade-out de 1s.
   - Após 1s, permanece `ring-1 ring-gold/30` (o `isCurrentTurn` já aplica isso).
3. `prefers-reduced-motion`: sem pulse, só `ring-2 ring-gold` estático por 1s via setTimeout.

### Paridade entre 3 clients — padronizar seletor

**Problema v1.** V1 usou `data-combatant-index` no DM, `aria-current="true"` no Guest, `turnRef` no Player. V2 escolhe UM padrão: **`data-combatant-index="{N}"`** (já existe em [CombatantRow.tsx:237](../components/combat/CombatantRow.tsx#L237) via `data-combatant-index={index}`).

- DM ([CombatSessionClient.tsx:1880-1890](../components/session/CombatSessionClient.tsx#L1880)) — já usa. ✓
- Guest ([GuestCombatClient.tsx:1095-1106](../components/guest/GuestCombatClient.tsx#L1095)) — **migrar** para `data-combatant-index`.
- Player ([PlayerInitiativeBoard.tsx:467-472](../components/player/PlayerInitiativeBoard.tsx#L467)) — **migrar** de `turnRef` para `data-combatant-index` (adicionar atributo).

**Solução de código.**

`app/globals.css` — adicionar:
```css
@keyframes turn-pulse {
  0%   { box-shadow: 0 0 0 2px rgba(212, 168, 83, 1), 0 0 24px 4px rgba(212, 168, 83, 0.6); }
  50%  { box-shadow: 0 0 0 2px rgba(212, 168, 83, 0.4), 0 0 16px 2px rgba(212, 168, 83, 0.2); }
  100% { box-shadow: 0 0 0 1px rgba(212, 168, 83, 0.3), 0 0 0 0 rgba(212, 168, 83, 0); }
}
.animate-turn-pulse {
  animation: turn-pulse 1s ease-out 1;
  will-change: box-shadow;
}
@media (prefers-reduced-motion: reduce) {
  .animate-turn-pulse {
    animation: none;
    box-shadow: 0 0 0 2px rgb(212 168 83 / 1);
  }
}
```

`components/session/CombatSessionClient.tsx` — reescrever useEffect em linhas 1878-1890:
```tsx
const [pulseTurnId, setPulseTurnId] = useState<string | null>(null);
const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return; }
  requestAnimationFrame(() => {
    // NOTE: guard check lives in spike Finding 5; NOT duplicated here.
    const el = document.querySelector(`[data-combatant-index="${currentTurnIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const current = combatants[currentTurnIndex];
    if (current) {
      setPulseTurnId(current.id);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setPulseTurnId(null), 1100);
    }
  });
}, [currentTurnIndex]);  // NÃO adicionar combatants — dispara em toda operação

// Cleanup on unmount
useEffect(() => () => {
  if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
}, []);

// Em renderItem da lista:
<div className={pulseTurnId === c.id ? "animate-turn-pulse rounded-lg" : ""}>
  <CombatantRow ... />
</div>
```

Replicar em:
- `components/guest/GuestCombatClient.tsx` (~linha 1095)
- `components/player/PlayerInitiativeBoard.tsx` (~linha 467) — substituir uso de `turnRef` por query selector

**Parity checklist.**
- [x] Guest — `GuestCombatClient` (migrar para `data-combatant-index`)
- [x] Anônimo — `PlayerInitiativeBoard`
- [x] Autenticado — `PlayerInitiativeBoard`
- [x] DM view — `CombatSessionClient`

**A11y.**
- `prefers-reduced-motion` respeitado.
- Screen reader: anúncio de turno via `aria-live="polite"` já existe no `TurnNotificationOverlay`. Sem mudança.

**i18n.** Sem chaves novas.

**Telemetry.** Sem instrumentação nova.

**Test strategy.**
- Visual: 1 screenshot do pulse mid-animation.
- E2E: disparar advance turn + verificar que `data-combatant-index="{N+1}"` tem classe `animate-turn-pulse` por 1s.
- Unit: cleanup do timer ao unmount.

**Estimativa.** **M — 3h** (era 1h; uplift: padronização de seletor em 3 clients, cleanup, visual test, brand gold vs oracle gold guard — e depende do spike Finding 5 ser resolvido).

---

### Hotfix 9 — HP individual por membro do grupo (não somar)

**Sintoma.** Grupo de 4 Goblins (3 com 7 HP, 1 com 2 HP) — header mostra `HP 23/28` somado. Player vê "LIGHT" na agregação. O goblin quase morto some visualmente na média.

**Por que dói.** Somar HP esconde informação crítica. Bardo não vê que há 1 goblin matável em 1 hit.

### Defer à spike para camada de dados

**Importante.** Spike [Finding 3](spike-beta-test-3-2026-04-17.md#finding-3) define COMO agregar (options A/B/C: dots, pips, worst+count). Esta spec UX cobre **apenas o display** — assumindo que o spike forneça `members` com estado por membro derivado coerente.

### Camada de display

**Localização atual (verificado).**
- [components/combat/MonsterGroupHeader.tsx:47-51](../components/combat/MonsterGroupHeader.tsx#L47) — bug: soma de `current_hp` e `max_hp`.
- [components/combat/MonsterGroupHeader.tsx:165-177](../components/combat/MonsterGroupHeader.tsx#L165) — renderiza barra agregada.
- [components/player/PlayerInitiativeBoard.tsx:104-123](../components/player/PlayerInitiativeBoard.tsx#L104) — `computeGroupAgg` (worst + avg). **Remover** avg (spec v2).

**Solução visual (DM + Guest — expanded=false).**

Substituir barra agregada única por linha compacta de dots (pips) + status summary:

```
▸ Goblin (3/4 ativos)  Init 10  [●●●◐]  3× HEAVY · 1× CRITICAL
```

- Cada combatante = dot de 10px com fill do tier (`HP_DISPLAY_STYLES[state].barClass`).
- Ordem estável (ordem do grupo).
- Defeated = dot vazio (border `border-zinc-600`).
- Hover: tooltip `"{name} — {current}/{max} HP {label}"`.
- Após dots: texto compacto `"3× HEAVY · 1× CRITICAL"` (só tiers presentes).
- **Remover** `{totalCurrentHp}/{totalMaxHp}` somado. **Remover** barra agregada.

**Solução visual (Player).** Mantém "worst tier + count" (anti-metagaming). Exemplo: `"3 de 4 — HEAVY"`.

**Limite de dots.** Em grupos >20, renderizar `[●●●●●●●●●●+10]` (10 dots + "+N more") para não quebrar layout mobile.

**Auto-expand.** Se grupo tem 1 membro, comportamento atual: apresenta como grupo de 1. **Decisão v2**: auto-expand quando `members.length === 1` (em MonsterGroupHeader, `setIsExpanded(true)`). Spec deferida ao dev — se muito complexo, aceitar grupo-de-1 como está.

**Solução de código.**

`components/combat/MonsterGroupHeader.tsx` — substituir linhas 47-51 e 165-177:
```tsx
import { deriveDisplayState, HP_DISPLAY_STYLES } from "@/lib/utils/hp-status";

// REMOVER totalCurrentHp, totalMaxHp, hpPct, hpBarColor (linhas 48-51)

const memberStates = useMemo(() =>
  members.map(m => ({
    id: m.id,
    name: m.name,
    current_hp: m.current_hp,
    max_hp: m.max_hp,
    state: deriveDisplayState(m.current_hp, m.max_hp, m.is_defeated ?? false),
  })),
  [members]
);

const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const m of memberStates) counts[m.state] = (counts[m.state] ?? 0) + 1;
  return counts;
}, [memberStates]);

const statusLine = useMemo(() => {
  const ORDER = ["CRITICAL", "HEAVY", "MODERATE", "LIGHT", "FULL", "DEFEATED"] as const;
  const parts: string[] = [];
  for (const tier of ORDER) {
    const n = statusCounts[tier];
    if (n > 0) parts.push(`${n}× ${t(`hp_${tier.toLowerCase()}_short`)}`);
  }
  return parts.join(" · ");
}, [statusCounts, t]);

const MAX_VISIBLE_DOTS = 10;
const visibleMembers = memberStates.slice(0, MAX_VISIBLE_DOTS);
const hiddenCount = memberStates.length - visibleMembers.length;

// Substituir linhas 165-177:
{!isExpanded && (
  <div className="flex items-center gap-2 flex-shrink-0">
    <div className="flex items-center gap-0.5" role="list" aria-label={t("group_members_hp")}>
      {visibleMembers.map((m) => {
        const style = HP_DISPLAY_STYLES[m.state];
        const isDefeated = m.state === "DEFEATED";
        return (
          <span
            key={m.id}
            role="listitem"
            className={`w-2.5 h-2.5 rounded-full ${isDefeated ? "border border-zinc-600" : style.barClass}`}
            title={`${m.name} — ${m.current_hp}/${m.max_hp} ${t(style.labelKey)}`}
            aria-label={`${m.name}: ${m.current_hp} de ${m.max_hp} HP`}
          />
        );
      })}
      {hiddenCount > 0 && (
        <span className="ml-0.5 text-[10px] text-muted-foreground whitespace-nowrap">+{hiddenCount}</span>
      )}
    </div>
    <span className="text-[10px] text-muted-foreground/70 whitespace-nowrap hidden md:inline">
      {statusLine}
    </span>
  </div>
)}
```

**Player view** — `components/player/PlayerInitiativeBoard.tsx` — `computeGroupAgg` (linhas 104-123):
- **Remover** o cálculo `avgStatus`. Manter apenas `worstStatus` + `activeCount`.
- Render: `"{activeCount} de {totalCount} — {worstStatusLabel}"`.

**Parity checklist.**
- [x] Guest — MonsterGroupHeader em GuestCombatClient
- [x] Anônimo — PlayerInitiativeBoard (worst + count)
- [x] Autenticado — idem
- [x] DM view — MonsterGroupHeader (dots individuais)

**A11y.**
- `role="list"` + `role="listitem"` no wrapper de dots.
- Em grupo >5, screen reader lê todos os dots sequencialmente — por isso o **status line** vai ANTES dos dots no DOM ideal. Dev: validar ordem.
- `title` em cada dot (tooltip visual) + `aria-label` (SR).
- Status line escondida em mobile via `hidden md:inline` — tooltip ainda funciona.

**i18n.**
- `combat.group_members_hp` (aria do wrapper)
- `combat.hp_{tier}_short` × 6 tiers (nova convenção para abreviações — FULL/LIGHT/MOD/HEAVY/CRIT/DOWN)

**Telemetry.** Sem instrumentação nova.

**Test strategy.**
- Unit: `deriveDisplayState` (já testado em H5).
- Visual: 4 screenshots — grupo de 4 misto, grupo de 1, grupo de 20 (truncation), grupo todo defeated.
- E2E: reduzir HP de 1 goblin em grupo + assert dot muda de cor.

**Estimativa.** **M-L — 3h** (era 1.5h; uplift: dependência em spike Finding 3, auto-expand, truncation em >20, player view refactor, 6 chaves i18n de abreviação).

---

### Hotfix 10 — Botões "Limpar grupo" e "Deletar grupo"

**Sintoma.** DM criou grupo de 6 Bandits. Todos morreram. Sem atalho para remover o grupo inteiro — clica "Remove" em cada combatente, com modal individual.

**Por que dói.** Friction pós-combate. DM terminou narrativa, quer passar pro recap.

**Localização atual (verificado).**
- [components/combat/MonsterGroupHeader.tsx](../components/combat/MonsterGroupHeader.tsx) — 251 linhas totais. Header com `activeMembers`.
- [lib/stores/combat-store.ts:60](../lib/stores/combat-store.ts#L60) — `removeCombatant(id)` individual.
- [lib/hooks/useCombatActions.ts:352-400](../lib/hooks/useCombatActions.ts#L352) — **reference** de persist flow (`handleRemoveCombatant` — 50 linhas).
- [components/combat/CombatantRow.tsx:820-841](../components/combat/CombatantRow.tsx#L820) — AlertDialog padrão (reutilizar).

### Duas ações distintas

| Ação | Verbo | Efeito | Quando |
|---|---|---|---|
| **Limpar derrotados** | "Limpar" | Remove membros com `is_defeated === true` OU `current_hp <= 0` | Combate ativo; manter vivos |
| **Deletar grupo inteiro** | "Deletar" | Remove TODOS os membros | Pós-combate; limpar lista |

### Solução visual

Dois botões no header, à direita:

```
▸ Goblin (3/4) Init 10 [●●●○] 2× HEAVY  [Limpar 1]  [Deletar]
```

- **Limpar derrotados**: `bg-amber-400/10 text-amber-400 border-amber-400/30 hover:bg-amber-400/20`. Só aparece se `activeMembers.length < totalMembers` AND `activeMembers.length > 0`.
- **Deletar grupo inteiro**: `bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20`. Sempre visível quando DM.
- Se `activeMembers.length === 0` (todos derrotados): só mostra **Deletar** (Limpar não faz sentido).
- Touch targets: **32×32 desktop, 44×44 mobile** (WCAG 2.5.8 AA — upgrade de v1).

### Modais de confirmação

- **Limpar** (leve): título `"Limpar {n} Goblin(s) derrotado(s)?"`, ações `[Cancelar] [Limpar {n}]` (amber).
- **Deletar** (pesado): título `"Deletar o grupo Goblin?"`, desc `"Todos os {n} membros serão removidos. Esta ação não pode ser desfeita."`, ações `[Cancelar] [Deletar grupo]` (`bg-red-900/60` como [CombatantRow.tsx:836](../components/combat/CombatantRow.tsx#L836)).

### Fluxo completo de persist + broadcast + turn adjust (v2 — crítico)

**Problema v1.** V1 só mudava o store local, não persistia nem broadcastava. Em modo autenticado, o grupo some local mas volta no refresh (não persistido) — bug crítico.

**Solução v2.** Mirror do `handleRemoveCombatant` em [useCombatActions.ts:352-400](../lib/hooks/useCombatActions.ts#L352) mas em loop.

**Novo hook** em `lib/hooks/useCombatActions.ts`:
```ts
const handleRemoveGroup = useCallback((groupId: string, mode: "defeated" | "all") => {
  const snap = useCombatStore.getState();
  const toRemove = snap.combatants.filter(c => {
    if (c.monster_group_id !== groupId) return false;
    if (mode === "defeated") return c.is_defeated || c.current_hp <= 0;
    return true;
  });
  if (toRemove.length === 0) return;

  const toRemoveIds = new Set(toRemove.map(c => c.id));
  const wasCurrentTurnRemoved = toRemoveIds.has(snap.combatants[snap.current_turn_index]?.id);
  const removedBeforeCurrent = snap.combatants
    .slice(0, snap.current_turn_index)
    .filter(c => toRemoveIds.has(c.id)).length;

  // Local store update (reuse removeCombatant for consistency with lair_actions cleanup etc.)
  for (const c of toRemove) snap.removeCombatant(c.id);

  // Adjust current_turn_index
  const postRemove = useCombatStore.getState();
  if (wasCurrentTurnRemoved && postRemove.combatants.length > 0) {
    const clampedIdx = Math.min(postRemove.current_turn_index, postRemove.combatants.length - 1);
    postRemove.hydrateActiveState(clampedIdx, postRemove.round_number);
  } else if (removedBeforeCurrent > 0) {
    const newIdx = Math.max(0, postRemove.current_turn_index - removedBeforeCurrent);
    postRemove.hydrateActiveState(newIdx, postRemove.round_number);
  }

  // Reorder initiative
  const finalState = useCombatStore.getState();
  const reordered = assignInitiativeOrder(finalState.combatants);
  finalState.hydrateCombatants(reordered);

  // Broadcast + persist for each removed combatant
  for (const c of toRemove) {
    broadcastEvent(getSessionId(), { type: "combat:combatant_remove", combatant_id: c.id });
    persistRemoveCombatant(c.id).catch(err =>
      setError(err instanceof Error ? err.message : "Failed to save.")
    );
  }

  trackEvent("combat:group_removed", {
    group_id: groupId,
    mode,
    count: toRemove.length,
  });

  // Full state sync for players (initiative order + turn index)
  const syncState = useCombatStore.getState();
  if (syncState.encounter_id) {
    broadcastEvent(getSessionId(), {
      type: "session:state_sync",
      combatants: syncState.combatants,
      current_turn_index: syncState.current_turn_index,
      round_number: syncState.round_number,
      encounter_id: syncState.encounter_id,
    });
  }

  if (reordered.length > 0) {
    persistInitiativeOrder(reordered.map(c => ({
      id: c.id,
      initiative_order: c.initiative_order,
    }))).catch(err => setError(err instanceof Error ? err.message : "Failed to save."));
  }
}, [setError, getSessionId]);
```

**Guest mode** — `lib/stores/guest-combat-store.ts` tem `removeCombatant` (não persiste). Adicionar:
```ts
removeCombatantsByGroup: (groupId: string, mode: "defeated" | "all") => set((state) => {
  const toRemove = state.combatants.filter(c => {
    if (c.monster_group_id !== groupId) return false;
    if (mode === "defeated") return c.is_defeated || c.current_hp <= 0;
    return true;
  });
  const toRemoveIds = new Set(toRemove.map(c => c.id));
  // ... same turn_index logic as above, but no broadcast/persist
});
```

### UI no `MonsterGroupHeader.tsx`

```tsx
interface MonsterGroupHeaderProps {
  // ... existentes
  groupId?: string;
  onClearDefeated?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

// no render:
{onClearDefeated && activeMembers.length < totalMembers && activeMembers.length > 0 && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <button
        onClick={e => e.stopPropagation()}
        className="shrink-0 min-h-[32px] min-w-[32px] sm:min-h-[44px] sm:min-w-[44px] md:min-h-[32px] md:min-w-[32px]
                   px-2 text-xs rounded
                   bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 border border-amber-400/30
                   focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-colors
                   inline-flex items-center gap-1"
        aria-label={t("group_clear_defeated_aria", { n: totalMembers - activeMembers.length })}
        data-testid={`group-clear-${groupId}`}
      >
        <Trash2 className="w-3 h-3 opacity-60" aria-hidden />
        <span className="hidden sm:inline">{t("group_clear_defeated")}</span>
      </button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("group_clear_confirm_title", { n: totalMembers - activeMembers.length, name: groupName })}</AlertDialogTitle>
        <AlertDialogDescription>{t("group_clear_confirm_desc", { n: totalMembers - activeMembers.length })}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => onClearDefeated(groupId)}
          className="bg-amber-500 hover:bg-amber-600 text-surface-primary"
        >
          {t("group_clear_confirm_action", { n: totalMembers - activeMembers.length })}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}

{onDeleteGroup && (
  <AlertDialog>
    {/* estrutura análoga com red-500 styling e t("group_delete_*") */}
  </AlertDialog>
)}
```

**Parity checklist.**
- [x] Guest (`/try`) — `GuestCombatClient` chama `useGuestCombatStore.removeCombatantsByGroup`
- [ ] Anônimo — **N/A** (player não remove)
- [ ] Autenticado — **N/A** (player não remove)
- [x] DM view — `CombatSessionClient` → `useCombatActions.handleRemoveGroup` (persist + broadcast)

**A11y.**
- AlertDialog Radix = FocusTrap + Esc.
- Labels com contagens dinâmicas.
- `focus:ring-2 focus:ring-amber-400/50` / `ring-red-500/50`.
- Touch target 32px desktop + 44px mobile (WCAG 2.5.8 AA ✓).

**i18n.** 8 chaves novas em `combat.*` (inventory acima).

**Telemetry.** `combat:group_removed` (fields: `group_id`, `mode`, `count`).

**Test strategy.**
- Unit: `removeCombatantsByGroup` (guest store) + `handleRemoveGroup` (hook) — casos: remove todos defeated; remove all; turn adjustment quando current era do grupo; empty result.
- E2E: `e2e/combat/group-cleanup.spec.ts` — criar grupo de 4, matar 2, clicar Limpar, assert 2 removidos e state_sync broadcast.
- Persistence: Supabase test — recarregar página após delete, grupo ausente.

**Estimativa.** **L — 5h** (era 2h; uplift: persist flow 50 linhas paridade com `handleRemoveCombatant`, turn adjust, broadcast + state_sync, guest store, 2 modais, i18n 8 chaves, Supabase persistence test).

---

### Hotfix 11 — Condições custom do DM

**Sintoma.** DM quer aplicar "Bênção", "Maldição Histérica" etc. Hoje o `ConditionSelector` só tem 13 RAW + 6 beneficial. Homebrew volta para papel.

**Por que dói.** Homebrew magic é o core. Bardo com canção única, druida com terreno — se a ferramenta não permite, o DM desiste.

**Localização atual (verificado).**
- [components/combat/ConditionSelector.tsx:9-32](../components/combat/ConditionSelector.tsx#L9) — ALL_CONDITIONS + BENEFICIAL_CONDITIONS.
- [components/combat/ConditionSelector.tsx:74](../components/combat/ConditionSelector.tsx#L74) — formato `concentrating:{spellName}` já usado.
- [lib/types/combat.ts](../lib/types/combat.ts) — `Combatant.conditions: string[]` — aceita custom sem migração.
- [components/oracle/ConditionBadge.tsx:74-99](../components/oracle/ConditionBadge.tsx#L74) — render badge (já tem branch para `isConcentration`).

### Colisão com parsers existentes (crítico)

**Problema v1.** Prefixo `custom:` colide com convenção `concentrating:`, `exhaustion:`. Parser genérico `condition.includes(":")` existe e pode mal-interpretar.

**Solução v2.** Verificar TODOS os consumidores de `conditions[]` **antes** de merge:

```
grep -n "includes(\":\")\|split(\":\")\|startsWith(.*:.*\")" components/ lib/
```

Se o parser genérico existir, adicionar early return para `custom:` **antes** dele. Helper oficial:

```ts
// lib/combat/custom-conditions.ts — NOVO ARQUIVO
export const CUSTOM_CONDITION_PREFIX = "custom:";

export function isCustomCondition(c: string): boolean {
  return c.startsWith(CUSTOM_CONDITION_PREFIX);
}

export function parseCustomCondition(c: string): { name: string; description?: string } {
  const raw = c.slice(CUSTOM_CONDITION_PREFIX.length);
  const sepIdx = raw.indexOf("|");
  if (sepIdx === -1) return { name: raw.trim(), description: undefined };
  return {
    name: raw.slice(0, sepIdx).trim(),
    description: raw.slice(sepIdx + 1).trim() || undefined
  };
}

export function formatCustomCondition(name: string, description?: string): string {
  const safeName = name.trim().slice(0, 32).replace(/\|/g, "");  // sanitize separator
  const safeDesc = (description ?? "").trim().slice(0, 200).replace(/\|/g, "");
  return safeDesc
    ? `${CUSTOM_CONDITION_PREFIX}${safeName}|${safeDesc}`
    : `${CUSTOM_CONDITION_PREFIX}${safeName}`;
}
```

### Guest paridade resolvida

**V2 decisão.** Guest mode é DM solo sem login. Ele É o DM. Feature aplica-se a guest.
Anônimo/Autenticado players NÃO criam custom (só visualizam). Mas `ConditionBadge` renderiza custom corretamente em todos os modos (read-only para player).

### Feature flag

Adicionar flag `ff_custom_conditions_v1` (default `false`). Habilitar gradualmente:
1. DM Lucas (staging) por 1 sprint.
2. Beta geral após feedback positivo.

Razão: mitigar risco de colisão com parsers não-inventariados.

### Solução visual

**Tokens.** V1 usou `purple-*` — V2 usa `gold` (token do projeto) com peso secundário:
- Input border: `border-gold/30`
- Input focus: `ring-gold/50`
- Badge: `bg-gold/10 text-gold border border-gold/30` (distingue visualmente das D&D conditions em vermelho/azul).

Bloco novo no selector (após linha 184 do ConditionSelector.tsx):
```tsx
{isCustomConditionsEnabled && (
  <div className="mt-2 pt-2 border-t border-white/[0.06]">
    <p className="text-[10px] text-gold/80 font-medium uppercase tracking-wider mb-1">
      {tcombat("custom_condition_label")}
    </p>
    <div className="flex items-center gap-1 flex-wrap">
      <input
        type="text"
        value={customName}
        onChange={e => setCustomName(e.target.value)}
        placeholder={tcombat("custom_condition_name_placeholder")}
        maxLength={32}
        aria-describedby="custom-cond-limit-hint"
        className="bg-transparent border border-gold/30 rounded px-2 py-1 text-xs text-foreground
                   focus:outline-none focus:ring-1 focus:ring-gold/50 flex-1 min-w-[120px]"
        data-testid="custom-condition-name"
      />
      <input
        type="text"
        value={customDesc}
        onChange={e => setCustomDesc(e.target.value)}
        placeholder={tcombat("custom_condition_desc_placeholder")}
        maxLength={200}
        className="bg-transparent border border-gold/30 rounded px-2 py-1 text-xs text-foreground
                   focus:outline-none focus:ring-1 focus:ring-gold/50 flex-1 min-w-[160px]"
        data-testid="custom-condition-desc"
      />
      <button
        type="button"
        disabled={!customName.trim()}
        onClick={() => {
          const str = formatCustomCondition(customName, customDesc);
          onToggle(str);
          setCustomName("");
          setCustomDesc("");
        }}
        className="min-h-[44px] sm:min-h-[32px] px-3 text-xs rounded
                   bg-gold text-surface-primary hover:bg-gold-hover
                   disabled:opacity-40 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-gold/50"
        data-testid="custom-condition-apply"
      >
        {tcombat("custom_condition_apply")}
      </button>
      <span id="custom-cond-limit-hint" className="sr-only">
        {tcombat("custom_condition_limits_hint")} {/* "Nome até 32 caracteres, descrição até 200" */}
      </span>
    </div>
  </div>
)}
```

### Render no ConditionBadge

**Atualizar** [components/oracle/ConditionBadge.tsx](../components/oracle/ConditionBadge.tsx) — detectar custom **ANTES** de `isConcentration` check (linha ~71):
```tsx
if (isCustomCondition(condition)) {
  const { name, description } = parseCustomCondition(condition);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded
                 bg-gold/10 text-gold border border-gold/30"
      title={description ?? name}
      aria-label={`${t("custom_condition_aria", { name })}${description ? `. ${description}` : ""}`}
    >
      <Sparkles className="w-3 h-3" aria-hidden />
      {name}
    </span>
  );
}
```

### Persistência

- `persistConditions(id, newConditions)` em [lib/supabase/session.ts](../lib/supabase/session.ts) grava em `combatants.conditions: text[]`.
- Limite soft: 10 condições por combatant (já não documentado — propor como constraint). Row inflation em combates grandes: 10 combatants × 10 conditions × 200 chars = ~20KB por row. Aceitável.
- Fim de combate: conditions persistem no histórico (não descartadas — são parte do log).

**Parity checklist.**
- [x] Guest (`/try`) — DM solo, aplica via ConditionSelector
- [ ] Anônimo (`/join`) — **read-only**: ConditionBadge renderiza custom. Player NÃO cria.
- [ ] Autenticado (`/invite`) — **read-only**: idem. Self-apply NÃO expõe custom (evita abuso).
- [x] DM view — ConditionSelector — principal

**A11y.**
- `aria-describedby` no input para limit hint.
- `aria-label` no badge inclui descrição.
- Tooltip nativo `title` completa.

**i18n.** 5 chaves novas em `combat.*` (inventory acima) + `custom_condition_limits_hint`.

**Telemetry.** `combat:custom_condition_created` (fields: `name_length`, `desc_length`, `mode` [guest/auth]).

**Test strategy.**
- Unit: `formatCustomCondition` + `parseCustomCondition` — round-trip, pipe in name, empty desc, overlong.
- Unit: `isCustomCondition` — prefix check.
- E2E: criar "Bênção", assert aparece no badge + persist via refresh.
- Cross-parser: teste que `concentrating:Bless` NÃO é interpretado como custom.

**Estimativa.** **L — 5h** (era 2h; uplift: feature flag, cross-parser inventory, sanitize pipe, analytics, i18n 5 chaves, edge cases no parse).

---

### Hotfix 12 — Quick-actions na ficha do combatente (Dodge, Dash, Help, etc)

**Sintoma.** Player/DM quer marcar "está em Dodge neste turno" — não existe como condição. Usa notas de texto.

**Por que dói.** Ações comuns 5e — Dodge, Dash, Help, Disengage, Hide, Ready — são **estados relevantes** mas não conditions formais. Sem UI, informação se perde na cabeça do DM.

**Localização atual (verificado).**
- [components/combat/ConditionSelector.tsx](../components/combat/ConditionSelector.tsx) — local do UI.
- [components/oracle/ConditionBadge.tsx](../components/oracle/ConditionBadge.tsx) — render.
- [lib/hooks/useCombatActions.ts:handleAdvanceTurn](../lib/hooks/useCombatActions.ts) — local do auto-cleanup.
- [components/player/PlayerInitiativeBoard.tsx:218](../components/player/PlayerInitiativeBoard.tsx#L218) — `onSelfConditionToggle` (player anon + auth).

### Auto-cleanup — fluxo explícito (v2)

**Problema v1.** `handleAdvanceTurn` é disparado **só no DM client**. Player que aplica Dodge em si mesmo via `onSelfConditionToggle` NÃO passa por `handleAdvanceTurn`. Cleanup só acontece via broadcast `combat:condition_change` do DM.

**Solução v2.**
1. DM `handleAdvanceTurn` limpa `action:*` do combatant cujo turno começa.
2. Limpeza gera broadcast `combat:condition_change` com a `conditions` array atualizada.
3. Players recebem e aplicam localmente (handler existente já trata).
4. Se player aplicou Dodge via `onSelfConditionToggle` e o DM ainda não avançou, a condição persiste na visão do DM (via broadcast `player:self_condition_toggle`) — quando DM avançar, cleanup dispara e broadcast.

### Parity — anonymous tem self-apply

**Correção v2.** Anônimo players **têm** `onSelfConditionToggle` via `PlayerInitiativeBoard` (componente compartilhado com auth). Atualizar parity.

### Solução de código

**Helper** `lib/combat/quick-actions.ts` (NOVO):
```ts
export const QUICK_ACTIONS = ["dodge", "dash", "help", "disengage", "hide", "ready"] as const;
export type QuickAction = typeof QUICK_ACTIONS[number];
export const ACTION_PREFIX = "action:";

export const QUICK_ACTION_META: Record<QuickAction, { iconKey: string; tooltipKey: string }> = {
  dodge: { iconKey: "shield", tooltipKey: "action_dodge_desc" },
  dash: { iconKey: "zap", tooltipKey: "action_dash_desc" },
  help: { iconKey: "users", tooltipKey: "action_help_desc" },
  disengage: { iconKey: "arrow-left", tooltipKey: "action_disengage_desc" },
  hide: { iconKey: "eye-off", tooltipKey: "action_hide_desc" },
  ready: { iconKey: "timer", tooltipKey: "action_ready_desc" },
};

export function isQuickAction(c: string): boolean {
  return c.startsWith(ACTION_PREFIX);
}

export function getQuickActionKind(c: string): QuickAction | null {
  const kind = c.slice(ACTION_PREFIX.length);
  return (QUICK_ACTIONS as readonly string[]).includes(kind) ? (kind as QuickAction) : null;
}

/** Remove all action:* from a conditions array. */
export function stripQuickActions(conditions: string[]): string[] {
  return conditions.filter(c => !isQuickAction(c));
}
```

> **Nota sobre emojis.** V1 usou emojis (🛡 🏃 etc.) — renderização varia entre OS. V2 usa **lucide-react icons** (Shield, Zap, etc.) — consistente cross-platform.

**Ícones lucide:** `Shield` (dodge), `Zap` (dash), `Users` (help), `ArrowLeft` (disengage), `EyeOff` (hide), `Timer` (ready).

### UI no ConditionSelector

Adicionar antes das D&D conditions (antes da linha 132):
```tsx
<div className="mb-2">
  <p className="text-[10px] text-cool/80 font-medium uppercase tracking-wider mb-1">
    {tcombat("quick_actions_label")}
  </p>
  <div className="flex flex-wrap gap-1">
    {QUICK_ACTIONS.map(kind => {
      const conditionStr = `${ACTION_PREFIX}${kind}`;
      const isActive = activeConditions.includes(conditionStr);
      const Icon = ICON_MAP[kind];  // map kind → lucide component
      return (
        <button
          key={kind}
          type="button"
          onClick={() => onToggle(conditionStr)}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium
                      min-h-[44px] sm:min-h-[32px] transition-all
                      focus:outline-none focus:ring-2 focus:ring-cool/50
                      ${isActive
                        ? "bg-cool text-white"
                        : "bg-cool/10 text-cool hover:bg-cool/20 border border-cool/30"}`}
          aria-pressed={isActive}
          title={tcombat(QUICK_ACTION_META[kind].tooltipKey)}
          data-testid={`quick-action-${kind}`}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden />
          {tcombat(`action_${kind}`)}
        </button>
      );
    })}
  </div>
</div>
```

### Render no ConditionBadge

Após check de `isCustomCondition`, adicionar:
```tsx
if (isQuickAction(condition)) {
  const kind = getQuickActionKind(condition)!;
  const meta = QUICK_ACTION_META[kind];
  const Icon = ICON_MAP[kind];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded
                 bg-cool/10 text-cool border border-cool/30"
      title={t(meta.tooltipKey)}
      role="status"
    >
      <Icon className="w-3 h-3" aria-hidden />
      {t(`action_${kind}`)}
    </span>
  );
}
```

### Auto-cleanup no handleAdvanceTurn

`useCombatActions.handleAdvanceTurn`:
```ts
// Ao avançar turno: limpar action:* do combatente cujo turno vai começar
const nextTurnIndex = (snap.current_turn_index + 1) % snap.combatants.length;
const nextCombatant = snap.combatants[nextTurnIndex];
if (nextCombatant) {
  const cleaned = stripQuickActions(nextCombatant.conditions);
  if (cleaned.length !== nextCombatant.conditions.length) {
    // Update local
    useCombatStore.getState().updateCombatant(nextCombatant.id, { conditions: cleaned });
    // Broadcast para players (usa evento existente)
    broadcastEvent(getSessionId(), {
      type: "combat:condition_change",
      combatant_id: nextCombatant.id,
      conditions: cleaned,
    });
    // Persist
    persistConditions(nextCombatant.id, cleaned).catch(err =>
      setError(err instanceof Error ? err.message : "Failed to save.")
    );
  }
}
// ... seguir com turn advance normal
```

### Player self-apply — limitar

Em [PlayerInitiativeBoard.tsx:218-220](../components/player/PlayerInitiativeBoard.tsx#L218) — `onSelfConditionToggle` hoje aceita qualquer string. Player expandir para aplicar quick actions em si mesmo — OK. **NÃO** expor custom conditions no self-apply (H11 read-only para player).

Dev: validar que o handler rejeita custom prefix no player mode.

**Parity checklist.**
- [x] Guest — ConditionSelector compartilhado via CombatantRow
- [x] Anônimo — self-apply via `onSelfConditionToggle` (6 quick actions + beneficial)
- [x] Autenticado — idem
- [x] DM view — CombatantRow → ConditionSelector

**A11y.**
- `aria-pressed` nos toggles.
- `title` com descrição (SR anuncia via `aria-describedby` opcional).
- Icons `aria-hidden` — label textual carrega semântica.
- Touch target 44×44 mobile, 32×32 desktop (WCAG AAA/AA).

**i18n.**
- `combat.quick_actions_label`
- `combat.action_{kind}` × 6
- `combat.action_{kind}_desc` × 6

**Telemetry.** `combat:quick_action_applied` (fields: `kind`, `mode` [dm/player]).

**Test strategy.**
- Unit: `isQuickAction`, `getQuickActionKind`, `stripQuickActions`.
- Unit: auto-cleanup — advance turn com combatant ativo com Dodge → conditions limpas.
- E2E: player aplica Dodge em si; DM avança turn; verificar que Dodge some no player e no DM.
- Cross-broadcast: assert broadcast `combat:condition_change` disparado na cleanup.

**Estimativa.** **L — 5h** (era 2h; uplift: parity anon, persist + broadcast no cleanup, 12 i18n keys, self-apply restriction, lucide icons replacement, testes cross-broadcast).

---

### Hotfix 13 — "Richard" clicável (dice roller do combatente)

**Status:** **BLOCKED — pending DM clarification.**

**Sintoma.** Citação do beta: *"Richard tem que dar pra clicar pra ser o D6"*. Contexto: "Richard" é um nome de combatente. O feedback sugere que nome/linha deveria ser gatilho de rolagem de d6.

### Razão do block

V1 propôs "variante mínima" que extrai primeira action do monstro. Mas:
- "Richard" não é monstro SRD — provavelmente é PC/NPC manual. A variante não resolve.
- `ClickableRoll` existe em [components/dice/DiceText.tsx](../components/dice/DiceText.tsx) — **assumido** pelo v1, não verificado. Grep revelou: componente existe, mas assinatura `notation` prop precisa confirmar.
- Modelo de dados: adicionar `combatant.quick_roll: string` requer migration Supabase + update de broadcast types. V1 menciona mas não inventaria.

### Ação

**Dev NÃO implementa sem confirmação do Lucas.**

No PR tracker (GitHub issue ou Asana):
1. Comentar "Esclarecer 'Richard': é PC, NPC, ou monstro? Qual dado quer rolar? Qual contexto visual (nome, linha inteira, botão dedicado)?"
2. Aguardar resposta.
3. Após resposta, reabrir H13 como quick spec dedicado.

**Estimativa.** **BLOCKED (0h)** — não faz parte do sprint v2. Reabrir após clarificação.

---

### Hotfix 14 — Compêndio: login nudge pra guest/anon

**Sintoma.** Jogador Guest ou Anônimo abre o compêndio e vê... o compêndio inteiro, sem saber que logado ganha itens homebrew, traduções persistentes, favoritos. Perda de conversão.

**Por que dói.** Usuário não logado não sabe o que está perdendo.

**Regra de ouro.** NUDGE, NÃO BLOQUEIO. Banner sutil — não restringir acesso aos itens SRD.

**Localização atual (verificado).**
- [components/player/PlayerCompendiumBrowser.tsx:367-376](../components/player/PlayerCompendiumBrowser.tsx#L367) — `DialogContent`.
- Check de auth: ver [PlayerJoinClient.tsx:415](../components/player/PlayerJoinClient.tsx#L415) — `isRealAuth = !!u && !u.is_anonymous`. **Chave para H14 detecção correta.**

### Bug de detecção corrigido (v2)

**Problema v1.** `mode={authReady && authUserId ? "authenticated" : "anonymous"}` — anon users também têm `authUserId` (Supabase `signInAnonymously` retorna UID).

**Solução v2.** Usar `!user.is_anonymous`:
```ts
// Em PlayerJoinClient.tsx, passar mode prop para PlayerCompendiumBrowser:
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
const mode: "guest" | "anonymous" | "authenticated" =
  !user ? "anonymous"  // sem user = modo join anon não feito ainda
  : user.is_anonymous ? "anonymous"
  : "authenticated";

// No JSX:
<PlayerCompendiumBrowser mode={mode} returnUrl={...} />
```

`GuestCombatClient` sempre passa `mode="guest"`.
`CombatSessionClient` (DM) sempre `mode="authenticated"`.

### returnUrl sanitization

**Problema v1.** `returnUrl` podia ser qualquer URL → open redirect (XSS via login redirect).

**Solução v2.** Whitelist de paths internos:
```ts
function sanitizeReturnUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Deve começar com / e não conter //, @, protocol schemes
  if (!/^\/(?!\/)([a-zA-Z0-9_\-\/\[\]]+)$/.test(raw)) return undefined;
  // Whitelist de prefixos
  const ALLOWED = ["/try", "/join/", "/invite/", "/campaign/", "/session/"];
  if (!ALLOWED.some(p => raw.startsWith(p))) return undefined;
  return raw;
}
```

### localStorage fallback

**Problema v1.** localStorage pode estar indisponível (Safari private mode, iframe sandbox). V1 sem try/catch.

**Solução v2.**
```ts
function getDismissTs(): number | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      return raw ? parseInt(raw, 10) : null;
    } catch {
      return null;  // storage bloqueado; banner sempre aparece
    }
  }
}
function setDismissTs(ts: number): void {
  try { localStorage.setItem(DISMISS_KEY, String(ts)); }
  catch { try { sessionStorage.setItem(DISMISS_KEY, String(ts)); } catch {} }
}
```

### Analytics — usar trackEvent

**Problema v1.** Usava `window.dispatchEvent(new CustomEvent(...))` — não é o padrão do projeto. Ver [PlayerJoinClient.tsx:327](../components/player/PlayerJoinClient.tsx#L327) usa `trackEvent()`.

**Solução v2.**
```ts
import { trackEvent } from "@/lib/analytics";

trackEvent("compendium:login_nudge_shown", { mode });
trackEvent("compendium:login_nudge_dismissed", { mode });
trackEvent("compendium:login_nudge_clicked", { mode });
```

### TTL fixo

Dismissal TTL: **3 dias** (removido ambiguidade "24h-7d").

### Solução visual

Banner no topo do compêndio, depois de `<VisuallyHidden.Root>`, antes do detail check:

```
┌────────────────────────────────────────────────────────────────┐
│ ✨ Você está vendo o compêndio SRD público.                    │
│    Faça login pra acessar compêndio completo, itens homebrew  │
│    e traduções PT-BR persistentes.                             │
│                                        [Criar conta]  [×]      │
└────────────────────────────────────────────────────────────────┘
```

- `bg-gold/10 border-gold/30` wrapper.
- `Sparkles` icon à esquerda em `text-gold`.
- CTA: `mode="guest"` → "Criar conta grátis" → `/signup?next=...`; `mode="anonymous"` → "Entrar" → `/login?next=...`.
- CTA styling: `bg-gold text-surface-primary` (AAA contrast).
- Dismiss: botão `w-8 h-8` (não ideal para mobile — elevar para `min-w-[44px] min-h-[44px]`) com `X` icon.
- Banner não aparece se `mode === "authenticated"` OR dismissal dentro de 3d.

### Componente completo

`components/player/CompendiumLoginNudge.tsx` (NOVO):
```tsx
"use client";
import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";

const DISMISS_KEY = "compendium_login_nudge_dismissed_at";
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;

interface Props {
  mode: "guest" | "anonymous" | "authenticated";
  returnUrl?: string;
}

function sanitizeReturnUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (!/^\/(?!\/)[a-zA-Z0-9_\-\/\[\]]+$/.test(raw)) return undefined;
  const ALLOWED = ["/try", "/join/", "/invite/", "/campaign/", "/session/"];
  return ALLOWED.some(p => raw.startsWith(p)) ? raw : undefined;
}

function getDismissTs(): number | null {
  try { const raw = localStorage.getItem(DISMISS_KEY); return raw ? parseInt(raw, 10) : null; }
  catch { try { const raw = sessionStorage.getItem(DISMISS_KEY); return raw ? parseInt(raw, 10) : null; }
  catch { return null; } }
}
function setDismissTs(ts: number): void {
  try { localStorage.setItem(DISMISS_KEY, String(ts)); }
  catch { try { sessionStorage.setItem(DISMISS_KEY, String(ts)); } catch {} }
}

export function CompendiumLoginNudge({ mode, returnUrl }: Props) {
  const t = useTranslations("compendium");
  const [dismissed, setDismissed] = useState(true);  // SSR-safe: start dismissed

  useEffect(() => {
    if (mode === "authenticated") return;
    const ts = getDismissTs();
    const expired = !ts || (Date.now() - ts > DISMISS_TTL_MS);
    if (expired) {
      setDismissed(false);
      trackEvent("compendium:login_nudge_shown", { mode });
    }
  }, [mode]);

  if (mode === "authenticated" || dismissed) return null;

  const safeReturn = sanitizeReturnUrl(returnUrl);
  const nextParam = safeReturn ? `?next=${encodeURIComponent(safeReturn)}` : "";
  const loginHref = mode === "guest" ? `/signup${nextParam}` : `/login${nextParam}`;
  const ctaKey = mode === "guest" ? "login_nudge_cta_guest" : "login_nudge_cta_anon";

  return (
    <div className="flex items-start gap-3 p-3 mx-3 mt-3 mb-1 bg-gold/10 border border-gold/30 rounded-md">
      <Sparkles className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium">{t("login_nudge_title")}</p>
        <p className="text-xs text-foreground/70 mt-0.5">{t("login_nudge_desc")}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href={loginHref}
          className="px-3 py-2 text-xs font-semibold rounded bg-gold text-surface-primary
                     hover:bg-gold-hover focus:outline-none focus:ring-2 focus:ring-gold/50
                     min-h-[44px] inline-flex items-center"
          onClick={() => trackEvent("compendium:login_nudge_clicked", { mode })}
        >
          {t(ctaKey)}
        </Link>
        <button
          type="button"
          onClick={() => {
            setDismissTs(Date.now());
            setDismissed(true);
            trackEvent("compendium:login_nudge_dismissed", { mode });
          }}
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center
                     text-muted-foreground hover:text-foreground rounded
                     focus:outline-none focus:ring-2 focus:ring-gold/30"
          aria-label={t("login_nudge_dismiss")}
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
```

Atualizar `PlayerCompendiumBrowser.tsx`:
- Adicionar prop `mode: "guest" | "anonymous" | "authenticated"`, `returnUrl?: string`.
- Renderizar `<CompendiumLoginNudge mode={mode} returnUrl={returnUrl} />` logo após `<VisuallyHidden.Root>` e antes do detail branch.

Callers:
- [GuestCombatClient.tsx:~1373](../components/guest/GuestCombatClient.tsx#L1373) — `<PlayerCompendiumBrowser mode="guest" returnUrl="/try" ...>`
- `PlayerInitiativeBoard` — `mode={...}` (derivado do `isRealAuth` check em PlayerJoinClient), `returnUrl={joinTokenPath}`
- [CombatSessionClient.tsx:~1956](../components/session/CombatSessionClient.tsx#L1956) — `mode="authenticated"` (banner nunca aparece)

**Parity checklist.**
- [x] Guest (`/try`) — `mode="guest"` → CTA `/signup`
- [x] Anônimo (`/join/[token]`) — `mode="anonymous"` → CTA `/login?next=/join/...`
- [ ] Autenticado (`/invite/[token]`) — `mode="authenticated"` — **não aparece**
- [ ] DM view — `mode="authenticated"` — **não aparece**

**A11y.**
- Sem `role="complementary"` (evita poluir landmark tree).
- `aria-label="Dispensar"` no X.
- Keyboard: Tab alcança CTA e dismiss.
- `X` button: 44×44 (WCAG).

**i18n.** 5 chaves em `compendium.*` (inventory).

**Telemetry.** 3 eventos: `shown`, `dismissed`, `clicked` (com `mode`).

**Test strategy.**
- Unit: `sanitizeReturnUrl` — casos: `//evil.com`, `http://evil.com`, `/try`, `/try/foo`, vazio, null.
- Unit: `getDismissTs` / `setDismissTs` com localStorage mock, throws, sessionStorage fallback.
- E2E: `/try` → abrir compêndio → banner visible; clicar dismiss → banner sumir; refresh → ainda sumido.
- E2E: `/invite/[token]` autenticado → banner não aparece.

**Estimativa.** **M-L — 3.5h** (era 1.5h; uplift: bug de detection, sanitize whitelist, storage fallback, trackEvent migration, 5 i18n keys, 4 unit tests).

---

## Ordem de implementação (v2)

Reorganizada em 4 sprints realistas. Dependências do spike incluídas.

### Sprint 1 — Quick wins visíveis (1 dia, ~7h)

| # | Hotfix | Est. | Dependência |
|---|---|---|---|
| H1 | X compêndio 44×44 | 1h | — |
| H3 | HP CRITICAL legível | 1.5h | — |
| H7 | Badge 2014/2024 | 1.5h | — |
| H2 | X ficha monstro 44×44 | 1.5h | — |
| H4 | Defesas no topo | 2h (parcial) | — |

**Gate:** todos visíveis no próximo deploy; Lucas demo.

### Sprint 2 — Infraestrutura de busca e listas (2 dias, ~14h)

| # | Hotfix | Est. | Dependência |
|---|---|---|---|
| H4 | Defesas no topo (finalizar) | restante | — |
| H6 | Busca acentos + PT-BR | 3h | normalize-query.ts novo |
| H8 | Auto-scroll + pulse | 3h | **Spike Finding 5** (guard) |
| H10 | Limpar/deletar grupo | 5h | — |

**Gate:** todos os 3 modos verificados; spike mergeado antes de H8.

### Sprint 3 — HP estrutural (2.5 dias, ~16h)

| # | Hotfix | Est. | Dependência |
|---|---|---|---|
| H5 | HP numérico + barra + DEFEATED derivado + feature flag | 5h | feature flag framework |
| H9 | HP individual no grupo | 3h | **H5** + **Spike Finding 3** |
| H12 | Quick actions (Dodge etc) | 5h | custom conditions parser não colide |

**Gate:** thresholds v2 ativado em staging para Lucas.

### Sprint 4 — Features e conversão (1.5 dias, ~10h)

| # | Hotfix | Est. | Dependência |
|---|---|---|---|
| H11 | Condições custom | 5h | cross-parser audit ok |
| H14 | Login nudge | 3.5h | trackEvent disponível |
| H13 | Richard | **0h (BLOCKED)** | clarificação Lucas |

**Gate:** analytics em staging; Lucas valida nudge CTA.

### Sumário geral

| Bucket | Hotfixes | Total |
|---|---|---|
| Sprint 1 (visual + quick) | H1, H2, H3, H4 parcial, H7 | ~7h |
| Sprint 2 (busca + listas) | H4 final, H6, H8, H10 | ~14h |
| Sprint 3 (HP structural) | H5, H9, H12 | ~16h |
| Sprint 4 (features + conversão) | H11, H14 | ~9h |
| H13 | Blocked | — |
| **TOTAL** | 13 hotfixes ativos (+1 blocked) | **~46h** |
| **Buffer 20% rework** | | **~55h** |

Aproximadamente **7 dias de dev focado** (em vez dos 2.5 dias do v1 irrealista).

---

## Feature flags (v2 — NEW)

| Flag | Hotfix | Default | Rollout |
|---|---|---|---|
| `ff_hp_thresholds_v2` | H5 | `false` | Lucas staging 1 sprint → general beta → default-on → remove flag |
| `ff_custom_conditions_v1` | H11 | `false` | audit cross-parser → Lucas staging → general → default-on |

Implementação proposta: env var via `lib/flags.ts` helper. Se não existir, criar no Sprint 1.

---

## Telemetry — eventos a instrumentar (v2 — NEW)

| Evento | Hotfix | Fields | Proposta |
|---|---|---|---|
| `combat:hp_threshold_transition` | H5 | `from_tier`, `to_tier`, `flag_on` | opt — monitorar rollout v2 |
| `compendium:search_empty_result` | H6 | `query_normalized`, `char_count` | cobertura PT-BR |
| `combat:group_removed` | H10 | `group_id`, `mode`, `count` | ação mais usada |
| `combat:custom_condition_created` | H11 | `name_length`, `desc_length`, `mode` | adoção homebrew |
| `combat:quick_action_applied` | H12 | `kind`, `mode` [dm/player] | quais são mais usados |
| `compendium:login_nudge_shown` | H14 | `mode` | impressões |
| `compendium:login_nudge_clicked` | H14 | `mode` | CTR conversão |
| `compendium:login_nudge_dismissed` | H14 | `mode` | churn rate |

Usar `trackEvent()` existente ([PlayerJoinClient.tsx:327](../components/player/PlayerJoinClient.tsx#L327) é referência).

---

## Notas sobre estimativa (v1 → v2)

V1 declarava ~18.5h total. V2 declara ~46h ativos + 20% buffer = ~55h. **Uplift de ~3×.** Razões:

1. **H5 — DEFEATED refactor (+3h)**: não bastava adicionar ao union; requer helper `deriveDisplayState` + HP_DISPLAY_STYLES separado para não quebrar broadcasts com clients antigos.
2. **H5 — Feature flag (+1h)**: threshold change 70/40/10 → 75/50/25 afeta combates em andamento; rollout precisa de flag + monitoring.
3. **H6 — Fuse API correction (+1h)**: V1 usava `Fuse.config.getFn` que é API instável. V2 usa `ignoreDiacritics: true` + helper externo + threshold recalibration.
4. **H10 — Persist + broadcast (+3h)**: V1 só mudava store local. V2 mirrora `handleRemoveCombatant` (50 linhas) × grupo + broadcast + state_sync + turn adjust.
5. **H11 — Cross-parser audit + feature flag (+3h)**: risco de colisão com `concentrating:X` e `exhaustion:N` exige inventário antes de merge.
6. **H12 — Parity + auto-cleanup broadcast (+3h)**: anon tem self-apply (ajuste de parity). Cleanup precisa broadcast + persist.
7. **H14 — Detection bug + sanitize (+2h)**: V1 classificava anon como auth (banner nunca aparecia). V2 corrige + sanitize returnUrl + localStorage fallback.
8. **Design tokens & i18n inventory (+2h)**: mapeamento explícito de ~32 chaves i18n em 2 locales + token discipline rules.
9. **A11y checklist global (+1h)**: WCAG AA verification, reduced-motion, focus management.
10. **Telemetry events (+1h)**: 8 novos eventos × field design.
11. **Test strategy (+3h)**: unit + visual + e2e por hotfix. V1 tinha 0 testes definidos.
12. **H13 — BLOCKED**: removido do sprint, mas esforço em clarificação = ~1h de comunicação.

Uplift distribuído = ~24h de overhead real. V1 subestimava cada hotfix em ~2×.

---

## Riscos e premissas

### Premissas

1. Spike [Finding 5](spike-beta-test-3-2026-04-17.md#finding-5) vai ser resolvido antes ou em paralelo com H8.
2. Spike [Finding 3](spike-beta-test-3-2026-04-17.md#finding-3) vai estabelecer o shape de `members` com estado por membro antes de H9.
3. `data/srd/monsters-*.json` tem `name_pt` populado o suficiente para H6 testes funcionarem. Se não, backlog spike separado.
4. `combat_reports` ou `encounters` tem espaço em `conditions` para persistir custom/action prefixes — `text[]` sem constraint intrínseco.
5. Dev agent tem acesso a criar chaves i18n em `messages/pt-BR.json` + `messages/en.json`.

### Riscos identificados

| Risco | Probabilidade | Mitigação |
|---|---|---|
| H5 thresholds mudam UX em combates ativos | Alta | Feature flag `ff_hp_thresholds_v2` |
| H11 custom prefix colide com parsers | Média | Audit `grep includes(":")` antes de merge; flag `ff_custom_conditions_v1` |
| H6 threshold 0.4 gera noise (muitos matches fracos) | Baixa | Testes de aceitação + monitorar `compendium:search_empty_result` |
| H8 pulse + critical-glow criam efeito estroboscópico | Baixa | Opção A/B documentada (dev decide no visual test) |
| H10 broadcast timing race: limpar grupo + advance turn simultâneo | Baixa | `state_sync` é authoritative (já existe) |
| H13 clarificação demora → ficha não clicável | Alta | Bloqueio aceito; não é show-stopper |
| i18n keys não criadas causam runtime error (next-intl strict) | Alta | Criar TODAS as 32 chaves antes de tocar no primeiro componente |

---

## Notas finais pro dev agent

1. **`rtk tsc` após cada hotfix** — muitos tocam types (`HpDisplayState`, `QuickAction`, `Combatant.conditions` prefixes, `CompendiumLoginNudge` mode).
2. **i18n primeiro**: criar todas as 32 chaves novas em `pt-BR.json` e `en.json` ANTES de tocar componentes.
3. **Combat Parity Rule (CLAUDE.md)** é imutável. Verificar 3 modos para TODO hotfix.
4. **SRD Compliance (CLAUDE.md)** imutável. H7 é o hotfix que toca diretamente — usar `monster.is_srd` gate.
5. **`rtk vitest run` + `rtk playwright test`** no fim de cada sprint. Testes existentes de `CombatantRow`, `PlayerInitiativeBoard`, `EncounterSetup` devem continuar passando.
6. **Tokens do projeto apenas**: `gold`, `cool`, `emerald`, `red`, `amber`, `zinc`, `surface-*`, `muted-foreground`, `foreground`, `border`. Qualquer outro exige justificativa no PR.
7. **Nenhum emoji em UI funcional** (renderização inconsistente cross-OS) — usar lucide-react.
8. **H13 BLOQUEADO** — não implementar sem resposta do Lucas.
9. **H8 depende de spike Finding 5** — coordenar merge order.
10. **H5, H9, H10, H11, H12 mexem em persist/broadcast** — testar persistence via refresh após cada mudança.

Se algo aqui entrar em contradição na implementação, pode me chamar. Nada aqui é inegociável exceto CLAUDE.md rules (Parity, Reconnection, SRD Compliance).

— Sally
