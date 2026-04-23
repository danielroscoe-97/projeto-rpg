# 07 — Accessibility Spec (Campaign HQ Redesign v0.2)

**Autor:** spec pack 2026-04-22
**Source of truth:** `redesign-proposal.md` (v0.2) + WCAG 2.1 AA
**Escopo:** ARIA roles, tab order, keyboard shortcuts, SR announcements, contraste, focus rings, motion, mobile a11y.
**Target:** WCAG 2.1 AA compliance; WCAG 2.2 onde viável.

---

## Seção 1 — ARIA roles e landmarks

Cada componente da shell tem role explícita e landmark labelizada. **Sem role redundante** (ex: `<nav role="navigation">` é overkill — o elemento nativo já é landmark).

### 1.1 Hierarquia de landmarks (1 por tipo, em ordem)

```html
<header aria-label="{campaign.shell.topbar_aria}">               <!-- role="banner" implícito -->
<nav aria-label="{campaign.shell.sidebar_aria}">                  <!-- role="navigation" implícito -->
<main aria-label="{campaign.shell.main_content_label}">           <!-- role="main" implícito -->
<aside aria-label="Notificações" hidden>                          <!-- quando popover aberto -->
<footer>                                                          <!-- role="contentinfo" -->
<div role="status" aria-live="polite" aria-atomic="true">         <!-- toast region -->
<div role="alert" aria-live="assertive">                          <!-- error region -->
```

**Regra:** apenas **1** `<header>`, **1** `<main>`, **1** `<nav aria-label="Campaign navigation">`. Sub-navs usam `aria-label` distinto.

### 1.2 Topbar

| Sub-componente | Elemento | Role | aria |
|---|---|---|---|
| Logo Pocket DM | `<a href="/">` | link (implícito) | `aria-label="Pocket DM — ir para dashboard"` |
| Campaign switcher | `<button>` + popover | button + listbox no popover | `aria-haspopup="listbox"` · `aria-expanded={open}` · `aria-label="{campaign.shell.campaign_switcher_aria}"` |
| Session badge | `<span>` | status | `aria-live="polite"` (muda quando session troca) |
| Quick search | `<button>` (abre modal) | button | `aria-label="{campaign.shell.quick_search_aria}"` · `aria-keyshortcuts="Control+K Meta+K"` |
| Notifications | `<button>` + popover | button | `aria-label="{campaign.shell.notifications_count}"` · `aria-expanded={open}` · `aria-haspopup="dialog"` |
| User menu | `<button>` + dropdown | button + menu no popover | `aria-label="{campaign.shell.user_menu_label}"` · `aria-haspopup="menu"` · `aria-expanded={open}` |

### 1.3 Sidebar + ModeSwitcher

Mode switcher usa padrão ARIA Tabs (per decisão 11 da proposal).

```html
<nav aria-label="{campaign.shell.sidebar_aria}">
  <div role="tablist" aria-label="{campaign.modes.tablist_label}" aria-orientation="vertical">
    <button role="tab" id="tab-prep" aria-selected="{isPrep}" aria-controls="panel-prep" tabindex="{isPrep ? 0 : -1}">
      <span aria-hidden="true">🛠</span>
      <span>{campaign.modes.prep_label}</span>
    </button>
    <button role="tab" id="tab-run" aria-selected="{isRun}" aria-controls="panel-run" tabindex="{isRun ? 0 : -1}">…</button>
    <button role="tab" id="tab-recap" aria-selected="{isRecap}" aria-controls="panel-recap" tabindex="{isRecap ? 0 : -1}">…</button>
  </div>

  <!-- Surface nav (lista de seções do modo ativo) -->
  <ul role="list" aria-label="Seções do modo {modeName}">
    <li>
      <a href="/app/campaigns/{id}/prep/next-session" aria-current="{isCurrent ? 'page' : undefined}">
        {campaign.surfaces.next_session.label}
      </a>
    </li>
    …
  </ul>
</nav>
```

**Regras:**
- Apenas **1 tab ativa** por vez (`aria-selected="true"`).
- `tabindex` roving (active = `0`, outros = `-1`) — setas movem foco dentro do tablist.
- Quando combate ativo e mode lock: tab ganha `aria-disabled="true"` (NÃO desabilitar — precisa continuar clicável pra disparar modal `Pausar combate?`). Badge de 🔒 usa `aria-label="{campaign.modes.lock_badge_detail}"`.

### 1.4 Main content (panel)

```html
<main id="main-content" tabindex="-1">                            <!-- tabindex pra skip link focar -->
  <div role="tabpanel" id="panel-prep" aria-labelledby="tab-prep" tabindex="0">
    <h1>{surface.label}</h1>
    …
  </div>
</main>
```

- `<main tabindex="-1">` pra receber foco programático quando skip-link ativo.
- Panel tem `tabindex="0"` só se contiver conteúdo não-focável próprio (recomendado sempre).

### 1.5 Initiative tracker (W2/W6/W7)

```html
<section aria-label="Iniciativa" aria-live="polite">
  <ol role="list" aria-label="Ordem de iniciativa">
    <li aria-current="{isCurrentTurn ? 'true' : undefined}">
      <span class="turn-marker" aria-label="{badges.turn_marker}">▶</span>
      <span>{name}</span>
      <span aria-label="{current} de {max} pontos de vida">[{current}/{max}]</span>
      <span aria-label="Classe de armadura {ac}">AC{ac}</span>
    </li>
  </ol>
</section>
```

`aria-current="true"` marca o turno atual (não `aria-current="page"` — não é navegação).

### 1.6 Toast region + live regions

```html
<!-- monta 1 vez no layout root -->
<div id="toast-region" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>
<div id="alert-region" role="alert" aria-live="assertive" aria-atomic="true" class="sr-only"></div>
<div id="combat-live-region" role="status" aria-live="polite" aria-atomic="false"></div>
```

- `status` = informativo (salvou, link copiado)
- `alert` = erro crítico (perdeu conexão, perdeu permissão)
- Combat region é não-atômico pra não re-anunciar lista inteira quando HP muda.

### 1.7 Modal dialogs

```html
<div role="dialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-body">
  <h2 id="dlg-title">{campaign.modes.lock_pause_to_edit_title}</h2>
  <p id="dlg-body">{campaign.modes.lock_pause_to_edit_body}</p>
  <button>{campaign.modes.lock_pause_confirm}</button>
  <button>{campaign.modes.lock_pause_cancel}</button>
</div>
```

- `aria-modal="true"` bloqueia AT da área fora do dialog.
- Foco vai pro primeiro elemento focável ao abrir; ao fechar, volta pro trigger.
- ESC fecha; foco-trap enquanto aberto.

---

## Seção 2 — Tab order

Ordem lógica de tabulação no shell (desktop). Mobile inverte sidebar pra drawer.

```
1. Skip link "Pular para conteúdo principal" (visualmente oculto, visível no :focus)
2. Skip link "Pular para navegação"
3. [Topbar] Logo
4. [Topbar] Campaign switcher
5. [Topbar] Quick search (abre com Ctrl+K também)
6. [Topbar] Notifications
7. [Topbar] User menu
8. [Sidebar] Mode tab 1 (ativo) — setas ↑↓ movem entre 3 tabs (roving tabindex)
9. [Sidebar] Primeira surface do modo ativo
  9a–9n. demais surfaces (1 por tab, ordem visual)
10. [Sidebar] Collapse button ◀ ▸
11. [Main] Conteúdo da surface (headings H1..Hn, form fields, botões em ordem)
12. [Footer / anon banner quando aplicável] Criar conta CTA
```

**Regras:**
- **Skip link "Pular para conteúdo principal"** já existe no projeto (`nav.skip_content` no `pt-BR.json`). Manter. Alvo: `<main id="main-content">`.
- Foco circular **dentro** de modal/popover/drawer (focus trap).
- Foco **não** entra em elementos `aria-hidden="true"` ou `display:none`.
- Ao abrir drawer (mobile) o foco vai pro primeiro item focável dentro dele. Ao fechar, volta pro trigger.

### 2.1 Skip link CSS (reforçar o já existente)

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
  z-index: 9999;
  padding: 0.5rem 1rem;
  background: var(--bg-elevated);
  color: var(--text-primary);
  outline: 2px solid var(--accent-gold);
}
```

---

## Seção 3 — Keyboard shortcuts

Fonte dos shortcuts: decisão 11 + §6.2 da proposal. Help modal aberto com `?` exibe tabela abaixo.

### 3.1 Tabela canônica

| Chave (Win) | Chave (Mac) | Ação | Escopo | aria-keyshortcuts |
|---|---|---|---|---|
| `Ctrl+K` | `⌘+K` | Abrir Busca rápida | Global (em qualquer mode) | `Control+K Meta+K` |
| `g` então `p` | `g` então `p` | Ir pra Preparar | Global | `g p` |
| `g` então `r` | `g` então `r` | Ir pra Rodar | Global | `g r` |
| `g` então `c` | `g` então `c` | Ir pra Recap | Global | `g c` |
| `?` | `?` | Abrir ajuda de atalhos | Global | `?` |
| `Esc` | `Esc` | Fechar modal / popover / drawer / search | Global | `Escape` |
| `/` | `/` | Focar busca inline da surface atual | Surface com lista (NPCs, Quests, etc) | `/` |
| `n` | `n` | Novo item (contextual — novo NPC em NPCs, nova quest em Quests, etc) | Surface com lista | `n` |
| `Enter` | `Enter` | Ativar item focado (link, botão) | Global | — (implícito) |
| `Space` | `Space` | Checkbox toggle + **Próximo turno** em Rodar | Rodar (combate) | `Space` |
| `↑` `↓` | `↑` `↓` | Mover seleção em listas / tablist | Lista / tablist | — |
| `Home` / `End` | idem | Primeiro / último item da lista | Lista / tablist | — |
| `Ctrl+S` | `⌘+S` | Salvar (editor de Recap, notas) | Editor open | `Control+S Meta+S` |
| `Ctrl+Enter` | `⌘+Enter` | Publicar (no Recap editor) | Recap editor | `Control+Enter Meta+Enter` |
| `Ctrl+Z` | `⌘+Z` | Desfazer (editor / reorder) | Editor | `Control+Z Meta+Z` |
| `Ctrl+Shift+Z` | `⌘+Shift+Z` | Refazer | Editor | — |

### 3.2 Regras de implementação

- **Gmail-like `g p` / `g r` / `g c`**: listener global; primeira tecla `g` põe em "g-mode" por 1.5s (exibe overlay discreto "g + p/r/c"); `Esc` cancela.
- **Atalhos NÃO disparam** quando o foco está em `<input>`, `<textarea>`, `[contenteditable]`, exceto `Ctrl+K`, `Ctrl+S`, `Ctrl+Enter`, `Esc`.
- **`aria-keyshortcuts`** atribuído no próprio elemento trigger (ex: botão Search tem `aria-keyshortcuts="Control+K Meta+K"`).
- **Conflito com browser**: nunca sobrescrever `Ctrl+T`, `Ctrl+W`, `Ctrl+N`, `Ctrl+R` (reservados pro browser).
- **Mac detection**: `navigator.platform` / `navigator.userAgent` — exibe `⌘K` em vez de `Ctrl+K` no placeholder e no help modal.

### 3.3 Help modal (atalho `?`)

Modal `role="dialog"` com título `{a11y.shortcut_help_heading}` e lista (tabela acima) agrupada por escopo. Fechar com `Esc` ou clicar fora.

---

## Seção 4 — Screen reader announcements

### 4.1 Quando usar `aria-live="polite"` (interrompe após leitura atual)

- Mode switch: "Modo Preparar ativo" — `{a11y.live_mode_switched}`
- Toast de sucesso: "Salvo", "Publicado"
- Turn changed em combate: "Vez de {name}"
- HP changed (não-player): "{name}: {current} de {max} HP"
- Skeleton loading: "Carregando {surface}"
- Reconnected: "Reconectado"

### 4.2 Quando usar `aria-live="assertive"` (interrompe imediato)

- Erro crítico: "Sem conexão", "Sessão expirou"
- Combate iniciado: "Combate iniciado"
- **É a sua vez!** (player em Assistindo) — `{a11y.live_your_turn}`
- Permission denied
- Deleção confirmada (ação irreversível acabou de rolar)

### 4.3 Quando NÃO usar live region

- Navegação (mudança de rota) → usa `aria-current="page"` + foco em `<main>`
- Loading inicial da página (usa `<title>` + role + aria-busy)
- Animação decorativa

### 4.4 Regras

- `aria-atomic="true"` em toasts (re-lê inteiro)
- `aria-atomic="false"` em lista de iniciativa (só lê o que mudou)
- Debounce: múltiplas mudanças em <300ms viram 1 anúncio consolidado
- Mensagens `sr-only` quando o visual já comunica (evita duplo-anúncio)
- Toast visual + `role="status"` (não duplicar com 2 lives)

### 4.5 Formato recomendado

```tsx
// hook
function useLiveRegion() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const region = document.getElementById(priority === 'polite' ? 'toast-region' : 'alert-region')
    if (!region) return
    region.textContent = ''  // clear first to force re-announcement
    requestAnimationFrame(() => { region.textContent = message })
  }
  return { announce }
}
```

---

## Seção 5 — Contraste

Tokens do design system (inferidos pelos H3 dos wireframes: bg `#14161F`, text `#E6E5E1`, muted `#9896A0`, gold `#D4A853`). Validação via fórmula WCAG (relative luminance).

### 5.1 Tabela de pares validados

| Par | Fg | Bg | Ratio (calc) | WCAG AA (4.5:1 body / 3:1 large) | Status |
|---|---|---|---|---|---|
| Text primary em bg | #E6E5E1 | #14161F | **14.8:1** | ✅ body + large | **PASS** |
| Text muted em bg | #9896A0 | #14161F | **6.1:1** | ✅ body + large | **PASS** |
| Gold em bg | #D4A853 | #14161F | **8.3:1** | ✅ body + large | **PASS** |
| Gold em bg elevated (#1B1D27) | #D4A853 | #1B1D27 | **7.6:1** | ✅ | **PASS** |
| Text primary em gold (button) | #14161F | #D4A853 | **8.3:1** | ✅ | **PASS** |
| Gold em gold (hover nested) | #D4A853 | #D4A853 | 1:1 | ❌ | **NEVER USE** |
| Semantic success (#4ADE80) em bg | #4ADE80 | #14161F | **~10:1** | ✅ | **PASS** |
| Semantic warning (#F59E0B) em bg | #F59E0B | #14161F | **~8:1** | ✅ | **PASS** |
| Semantic destructive (#EF4444) em bg | #EF4444 | #14161F | **~5.2:1** | ✅ body | **PASS** |
| Semantic info (#3B82F6) em bg | #3B82F6 | #14161F | **~4.1:1** | ⚠️ **AA body marginal** | **REVIEW** |
| Semantic info em bg-elevated | #3B82F6 | #1B1D27 | **~3.7:1** | ❌ body / ✅ large | **FAIL pra body** |
| Placeholder (#6B6A72) em bg | #6B6A72 | #14161F | **3.2:1** | ❌ body / ✅ large | **FAIL pra body** |
| HP tier CRITICAL (#EF4444) em bg | #EF4444 | #14161F | 5.2:1 | ✅ | **PASS** |
| HP tier LIGHT (#4ADE80) em bg | #4ADE80 | #14161F | ~10:1 | ✅ | **PASS** |
| HP tier MODERATE (#F59E0B) em bg | #F59E0B | #14161F | ~8:1 | ✅ | **PASS** |
| HP tier HEAVY (#F97316) em bg | #F97316 | #14161F | ~6.5:1 | ✅ | **PASS** |
| Focus ring gold com α=0.5 em bg | rgba(212,168,83,0.5) | #14161F | ~4.5:1 | ⚠️ **borderline** | **USE α=0.75** |

**Ratios exatos** precisam ser validados com os tokens reais do `tailwind.config` / `globals.css`. Os números acima são estimados.

### 5.2 Fixes obrigatórios

1. **Info semantic (#3B82F6)**: elevar luminância pra `#60A5FA` (blue-400 do Tailwind) quando usado pra body text; manter `#3B82F6` só pra bordas/ícones grandes.
2. **Placeholder text**: subir pra `#8A8890` (ratio ~4.6:1) ou aceitar como "não-essencial" (placeholders podem ser 3:1 per WCAG 1.4.11 non-text contrast se não forem conteúdo).
3. **Focus ring**: usar α=0.75 em vez de 0.5 (ou offset externo de bg dark pra aumentar contraste efetivo).

### 5.3 Regra imutável

> **Antes de merge**: rodar `axe-core` ou `@storybook/addon-a11y` em todos os componentes novos. Qualquer violation A ou AA é blocker.

---

## Seção 6 — Focus rings

### 6.1 Tokens de focus

```css
:root {
  --focus-ring-color: rgb(212 168 83 / 0.75);   /* gold com alpha 0.75 */
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --focus-ring-offset-color: var(--bg-default);  /* #14161F */
}

*:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  border-radius: inherit;
}
```

### 6.2 Regras imutáveis

1. **Nunca** remover `outline` sem substituir com algo visível (ring, border, glow).
2. **`:focus-visible` preferido a `:focus`** — evita ring pra cliques de mouse mas mantém pra teclado.
3. **Contraste do ring com bg adjacente ≥ 3:1** (WCAG 1.4.11 non-text contrast).
4. **Ring dentro** de containers com `overflow: hidden`: adicionar `inset box-shadow` em vez de `outline` (outline é clipped).

### 6.3 Componentes especiais

| Componente | Ring customizado | Nota |
|---|---|---|
| Tab ativo (ModeSwitcher) | Ring externo + indicador visual (barra dourada lateral) | Dupla signalização |
| Card clicável (NPC, Quest) | Ring externo + hover state distinto | |
| Checkbox | Ring externo mais largo (`outline-offset: 4px`) | Evita clipping |
| Link inline em texto | Underline + ring | |
| Campo editável inline (nome da sessão) | Border acent gold em vez de outline | Visual mais sutil |

---

## Seção 7 — Motion sensitivity

Respeitar `prefers-reduced-motion: reduce` — Dani aprovou isso em memory sobre "efeitos sutis".

### 7.1 Regras

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 7.2 Substituições específicas

| Normal | Reduced motion |
|---|---|
| Slide-in da sidebar | Fade-in instantâneo |
| Slide-up do toast | Fade-in 100ms |
| Slide-down de dropdown | Fade-in 80ms |
| Auto-scroll pra elemento focado | `scrollIntoView({ behavior: 'auto' })` em vez de `smooth` |
| Parallax em hero | Desativar — render estático |
| Pulsar animado em "Próximo turno" | Cor estática em destaque |
| Confetti/sparkle no quest-completed | Remover animação; manter ícone |
| Mindmap auto-animate nodes | Reposicionar sem tween |

### 7.3 Features banidas sob reduced motion

- Auto-scroll horizontal em listas
- Vídeo loop de fundo
- Transições CSS > 200ms
- Spinners com >1 Hz de rotação (aceita 1 Hz discreto)

### 7.4 Loading states sob reduced motion

Skeleton não pulsa — fica estático com cor média. Ainda serve como placeholder visual.

---

## Seção 8 — Mobile accessibility

### 8.1 Touch targets

- **Mínimo 44×44 CSS px** (WCAG 2.5.5 AAA — adotado aqui como hard requirement).
- Targets menores só se espaçamento entre eles for ≥ 8px e operação equivalente via outro gesto.
- Verificar nas pills atuais já compliant (memory mentioned); manter no redesign.

### 8.2 Bottom tab bar (W5/W6)

```css
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-default);
  z-index: 50;
}
```

- **Respeitar `safe-area-inset-bottom`** (iPhone notch/home indicator).
- **Nunca coberta pelo teclado virtual**: quando input focado dispara virtual-keyboard, `visualViewport` API ajusta.
- Cada tab é `role="tab"` com `aria-selected` (consistente com desktop).
- Ícones têm `aria-hidden="true"`, label visível abaixo é o nome acessível.

### 8.3 Keyboard virtual handling

```tsx
// detectar e ajustar
window.visualViewport?.addEventListener('resize', () => {
  const keyboardHeight = window.innerHeight - window.visualViewport!.height
  document.documentElement.style.setProperty('--kb-height', `${keyboardHeight}px`)
})
```

```css
.bottom-tab-bar {
  bottom: var(--kb-height, 0);  /* sobe com o teclado */
}
```

### 8.4 Pull-to-refresh

- **Habilitado em Minha Jornada** (player) — pull recarrega ficha, quests.
- **Desabilitado em Rodar/Assistindo** — risco de refresh acidental durante combate. `overscroll-behavior-y: contain`.

### 8.5 Hardware back button (Android)

- Em modal/drawer aberto: back fecha o modal (não navega).
- Em combate ativo (Mestre): back pede confirmação ("Sair do combate?").
- Em combate ativo (player em Assistindo): back retorna pra Minha Jornada (banner topo "Combate em andamento").
- Em mode switch dentro da mesma campanha: back volta pro mode anterior (history push).

### 8.6 Rotação portrait ↔ landscape

- Wireframes mobile são **portrait**. Landscape mobile (~844×390) deve:
  - Bottom tab bar vira side rail (coluna de 60px à esquerda, safe-area-inset-left respeitado).
  - Sidebar drawer desativa; side rail já é persistent.
  - Conteúdo principal preenche restante.
- Tablet landscape (≥1024w) já cai no breakpoint desktop.

### 8.7 Safari iOS específico

- `-webkit-tap-highlight-color: transparent` + ring visível no `:focus-visible` (substituir a flash cinza padrão).
- `position: sticky` em topbar requer fallback — testar scroll bounce.
- `env(safe-area-inset-*)` em todos os fixeds.

### 8.8 Zoom

- **Não desativar zoom** (`user-scalable=yes` no viewport meta — default).
- Layout continua funcional em até 200% zoom (WCAG 1.4.4).
- Texto reflow horizontal até 320px width sem scroll horizontal (WCAG 1.4.10).

---

## Apêndice — Checklist pré-merge

- [ ] `axe-core` run em todos os componentes novos — 0 violations A/AA
- [ ] Keyboard-only walkthrough: navegar todo o shell sem mouse
- [ ] VoiceOver (iOS) smoke test em Minha Jornada + Assistindo
- [ ] NVDA + Firefox smoke test em Preparar + Rodar
- [ ] `prefers-reduced-motion: reduce` smoke test
- [ ] Zoom 200% + viewport 320px sem h-scroll
- [ ] Contraste validado com Contrast Checker em todos pares
- [ ] Focus ring visível em TODOS os interativos (grep `outline:none` sem substituto)
- [ ] aria-live regions configuradas e debounced
- [ ] Touch targets ≥ 44×44 em mobile
- [ ] Safe-area em iPhone 14 Pro emulator
- [ ] Hardware back button Android testado em combate + modal
- [ ] Skip links funcionam e são visíveis no :focus
