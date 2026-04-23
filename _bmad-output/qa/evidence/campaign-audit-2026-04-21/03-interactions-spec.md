# Campaign HQ — Interactions Spec (v1.0, 2026-04-22)

**Escopo:** frame-by-frame das 12 interações críticas do shell novo (Preparar / Rodar / Recap / Minha Jornada / Assistindo). Deriva de `redesign-proposal.md` v0.2.

**Regras imutáveis aplicadas:**
- **Combat Parity** (CLAUDE.md §Combat Parity): cada interação marca quais dos 3 modos (Guest / Anônimo / Auth) é coberto
- **Resilient Reconnection** (CLAUDE.md §Resilient): `pagehide`, `visibilitychange`, skeleton-first, zero tela branca
- **Mode stateless** (redesign §5.5): mode derivado do server, nunca de localStorage

**Componentes reusados (não reinventar):**
- Toast: `sonner` (já em `app/layout.tsx`), padrão visto em `components/xp/XpRewardToast.tsx`
- Command palette: `cmdk` via `components/oracle/CommandPalette.tsx` (já tem debounce 150ms + grupos)
- Skeletons: `components/ui/skeletons/*` (DashboardSkeleton, CampaignPageSkeleton, CombatSkeleton)
- visibilitychange + pagehide: padrão atual em `components/player/PlayerJoinClient.tsx` + `components/combat-session/CombatSessionClient.tsx`
- Quick switcher data: `lib/hooks/useQuickSwitcherData.ts` + `lib/quick-switcher/actions.ts`

**Convenção de timing:** usar `ease-out` (Tailwind default `cubic-bezier(0, 0, 0.2, 1)`) exceto quando marcado. Timing < 100ms = imperceptível; 150-300ms = confortável; > 400ms = pesado (evitar). Valores validados contra Material Motion guidelines.

**Convenção de testes:** `data-testid="hq-{interação}-{estado}"`. Playwright é default; unit para lógica pura.

---

## 1. Mode switch (Preparar ⇄ Rodar ⇄ Recap)

**Modos de acesso:** Auth-only (Mestre).
**Arquivos esperados:** `components/campaign-hq/ModeNav.tsx` + rotas `/app/campaigns/[id]/(prep|run|recap)`.

### Trigger
- **Click:** botão do mode na sidebar vertical (desktop/tablet) ou bottom tab bar (mobile)
- **Keyboard:** `g p` (Preparar), `g r` (Rodar), `g c` (Recap). Dois-keystroke Gmail-like: `g` abre modo "goto" por 1500ms, segunda tecla executa. Após timeout, reseta.
- **Server:** `combat.active` passa a `true` → auto-redirect Mestre pra `/run` (veja §2 para player).

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Click | Router.push(`/app/campaigns/[id]/run`) disparado; prefetch já feito no hover (Next `<Link prefetch>`) |
| 0 | Visual | Sidebar item highlight muda (gold background 15% + border gold 40%) — via CSS pseudo `:active` imediato, sem wait |
| 0–120 | Transição | Conteúdo atual fade-out 100ms opacity 1→0; simultaneamente sidebar contextual muda (as surfaces do novo mode aparecem, outras saem); URL atualiza via `router.push` (shallow) |
| 120–150 | Montagem | Novo mode renderiza; skeleton aparece SE a surface default do mode não estiver cacheada (ex: primeiro acesso Recap busca última sessão); se cacheada, pula skeleton |
| 150–300 | Fade-in | Conteúdo fade-in 150ms opacity 0→1 |
| 300 | Final | `aria-live="polite"` anuncia "Modo {nome} ativo" (screen reader) |

**Meta:** transição total ≤ 300ms pra input responsivo (< frame budget de 16ms × 20).

### Edge cases
- **Combate ativo + Mestre clica em Preparar/Recap:** sidebar item mostra ícone 🔒 + sufixo `(🔒)`. Click dispara modal bloqueante:
  - Título: "Combate em andamento"
  - Copy: "Você tem um combate rolando. Pausar pra editar {mode}?"
  - CTAs: `[Pausar combate]` (primário gold) · `[Cancelar]` (ghost)
  - Pausar combate → PATCH `/api/combat/[id]/pause` → combat.active=false → redirect acontece; Cancelar → modal fecha, Mestre fica em Rodar
- **Prefetch falhou (offline):** click com rede off mostra skeleton do novo mode + banner bottom "Reconectando..." depois de 2s sem sucesso. Se reconecta em <10s, carrega normalmente; senão mantém skeleton até fetch resolver.
- **Keyboard `g p` com foco em input/textarea:** ignorar. Checar `document.activeElement?.tagName !== "INPUT" && !"TEXTAREA"` e `!contentEditable`. Testar também com `role="combobox"` aberto (autocomplete) — ignorar.
- **Mode switch durante save em progresso (ex: editor Recap aberto com alterações não salvas):** modal de confirmação "Você tem alterações não salvas. Sair mesmo assim?" (padrão `beforeunload` mas custom UI). CTAs `[Descartar]` · `[Salvar e sair]` · `[Cancelar]`.

### Validação automatizada
```ts
// playwright/e2e/campaign-hq/mode-switch.spec.ts
test("Mestre Preparar→Rodar via click atualiza URL e sidebar contextual", async ({ page }) => {
  await page.goto("/app/campaigns/krynn-id/prep");
  await page.getByTestId("hq-mode-run").click();
  await expect(page).toHaveURL(/\/run$/);
  await expect(page.getByTestId("hq-surface-combat")).toBeVisible({ timeout: 500 });
  await expect(page.getByTestId("hq-surface-next-session")).not.toBeVisible();
});

test("Mestre em combate ativo vê lock em Preparar", async ({ page }) => {
  await mockCombatActive(page, true);
  await page.goto("/app/campaigns/krynn-id/run");
  await page.getByTestId("hq-mode-prep").click();
  await expect(page.getByTestId("modal-pause-combat")).toBeVisible();
});

test("Atalho g p ignora quando input focado", async ({ page }) => {
  await page.goto("/app/campaigns/krynn-id/recap");
  await page.getByTestId("recap-editor").focus();
  await page.keyboard.type("g");
  await page.keyboard.type("p");
  await expect(page).toHaveURL(/\/recap$/);
});
```

---

## 2. Mode auto-switch para Player (trigger: server event `combat.active=true`)

**Modos de acesso:** Anônimo + Auth (player). Não aplicável ao Guest (combate guest é local).
**Arquivos esperados:** `hooks/usePlayerModeResolver.ts`, `components/campaign-hq/PlayerShell.tsx`.

### Trigger
- **Server:** Supabase realtime broadcast `campaign:${id}` event `combat:started` com payload `{ combat_id, active: true }`
- **Fallback:** polling a cada 15s em `/api/campaign/[id]/state` (se realtime falhou — padrão Resilient Reconnection)

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Evento chega | `resolveMode()` recalcula → retorna `"assistindo"` |
| 0–50 | Preparação | Hook setta estado `isTransitioningToCombat=true`; player shell já ativa |
| 50 | Banner início | Banner vermelho começa slide-down do topo (translateY -100%→0, 300ms cubic-bezier(0.4, 0, 0.2, 1)). Conteúdo: "⚔ O Mestre iniciou o combate · [Entrar no combate ▶]" |
| 300 | Banner fixo | Banner travado no topo, role="alert", aria-live="assertive" |
| 300 | Auto-entrou? | Se player tem config `auto_enter_combat=true` (default para anônimo) → redirect automático após 500ms grace period. Se false → player fica em Minha Jornada mas banner persistente. |
| 800 | Redirect (se auto) | `router.push("/app/campaigns/[id]/watch")` + skeleton de Assistindo 200ms enquanto initiative carrega |
| 1000 | Watch renderizado | Iniciativa + HP + turno aparecem |

### Reverso: `combat.active=false` (combate finalizado)
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Evento | `combat:ended` recebido |
| 0–300 | Banner sai | Banner vermelho slide-up (translateY 0→-100%, 300ms) |
| 300 | Toast | Toast sonner success "Combate finalizado · +{xp} XP" (4s auto-dismiss, gold theme) |
| 300 | Redirect | `router.push("/app/campaigns/[id]/journey")` com fade (Minha Jornada reaparece) |
| 600 | Card destaque | Card "Última Sessão" fica com borda gold pulsante por 5s (indicar que é novo) |

### Edge cases
- **Mestre bloqueou opt-out:** se `campaign.settings.force_watch_during_combat=true`, player NÃO pode voltar pra Minha Jornada. Mode switcher fica oculto; banner "Voltar pra Minha Jornada" não aparece. Tentativa via URL direta (`/journey`) redireciona pra `/watch` + toast info "Seu mestre bloqueou navegação durante combate".
- **Player chegou depois do combate começar:** ao abrir `/app/campaigns/[id]`, `resolveMode()` retorna `assistindo` direto (stateless §5.5). Skeleton aparece, depois watch. Nenhuma animação de "banner chegando" (já chegou).
- **Reconexão durante combate:** player perde WiFi 30s, volta. Skeleton aparece (não tela branca — Resilient §1). Reconecta → `combat.active=true` ainda → já está em `/watch`, só re-subscribe ao channel. Se enquanto estava offline o combate terminou → ao reconectar, redirect pra `/journey` + toast "Combate finalizado enquanto você estava offline".
- **Dois combates seguidos (Mestre inicia novo logo após fechar):** 2 toasts não podem empilhar poluição; se segundo `combat:started` chega <3s após `combat:ended`, suprimir toast de "Combate finalizado" (usar Sonner `.dismiss()` do toast prévio).

### Validação automatizada
```ts
test("Player recebe banner combate e auto-redirect em 1s", async ({ page, context }) => {
  await page.goto("/app/campaigns/strahd-id/journey");
  await expect(page.getByTestId("hq-journey")).toBeVisible();
  // simular broadcast no outro contexto (Mestre)
  await startCombatFromAnotherContext(context, "strahd-id");
  await expect(page.getByTestId("hq-combat-banner")).toBeVisible({ timeout: 500 });
  await expect(page).toHaveURL(/\/watch$/, { timeout: 2000 });
});

test("Reverso: combate fecha → toast + redirect pra journey", async ({ page, context }) => {
  await startInWatch(page, "strahd-id");
  await endCombatFromAnotherContext(context, "strahd-id");
  await expect(page.getByRole("status", { name: /combate finalizado/i })).toBeVisible();
  await expect(page).toHaveURL(/\/journey$/);
});
```

---

## 3. Busca rápida (Ctrl+K / ⌘K)

**Modos de acesso:** Todos (Guest/Anônimo/Auth) — mas escopo diferente por role. Guest busca só no SRD; Player busca SRD + campanha read-only; Mestre busca SRD + campanha full + comandos.
**Arquivos existentes:** `components/oracle/CommandPalette.tsx` (base atual via `cmdk`, expandir). Mobile: ícone 🔍 no topbar abre a mesma palette.

### Trigger
- **Keyboard:** `Ctrl+K` (Windows/Linux) / `⌘K` (Mac). Detectar via `e.metaKey || e.ctrlKey` + `e.key === "k"`.
- **Click:** ícone 🔍 no topbar (sempre visível mobile, opcional desktop) ou campo fake "Buscar rápida (Ctrl+K)" no topbar desktop
- **Focus trap:** uma vez aberto, Tab circula dentro do dialog

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Shortcut | Handler global intercepta (condicional: só se nenhum dialog já aberto) |
| 0 | Backdrop | Overlay black/40% fade-in 100ms |
| 0–150 | Dialog entra | Dialog (max-w-2xl) fade-in + scale 0.95→1 (150ms ease-out) |
| 150 | Input focado | `inputRef.current?.focus()` automático |
| 150 | Empty state | "Digite pra buscar em sua campanha" + lista de recentes (se existir) |
| 150+ | Digitação | Keystroke → timer 120ms debounce → `searchScoped(query)` → resultados renderizam |
| Por keystroke | Grupo dinâmico | Grupos: **Navegação** (sempre primeiro, ex: "Ir pra Preparar"), **NPCs**, **Locais**, **Quests**, **Sessões**, **Notas**, **SRD** (monstros/magias/itens), **Comandos** (ex: "Adicionar quest") |
| Enter | Seleção | Executa ação (navigate, open modal, trigger action) + fecha dialog em 100ms fade-out |

**Grupos e limites** (reutiliza padrão atual):
- Max 5 resultados por grupo (constante `MAX_RESULTS_PER_GROUP` já existente)
- Ordem fixa: Navegação > Campanha (NPCs, Locais, Quests, Sessões, Notas) > SRD > Comandos
- Scroll interno do dialog em `max-h-[60vh]`

### Keyboard navigation
| Tecla | Ação |
|---|---|
| ↑ ↓ | Mover entre items (wrap around: chega no fim, volta pro topo) |
| Enter | Executar item selecionado |
| Esc | Fechar dialog (fade-out 100ms) |
| Tab | Move entre grupos (primeiro item de cada grupo) |
| ⌘/Ctrl + 1-9 | Pular pro grupo N |

### Edge cases
- **Query vazia:** mostrar "Recentes" (localStorage últimos 5 pesquisados na campanha atual) + "Comandos populares" (Adicionar NPC, Iniciar combate, Abrir ficha X)
- **Zero resultados:** "Nenhum resultado pra «{query}» · [Buscar em todas as campanhas?]" (escopo global opcional)
- **Network falha em fetch de campanha (NPCs não carregam):** mostrar só SRD + Navegação + banner sutil "Conteúdo da campanha indisponível offline"
- **Scope: guest/player read-only:** ocultar grupo "Comandos" (eles não podem criar); mostrar tooltip ao focar em Nota privada se anônimo: "Notas precisam de conta"
- **Mesma tecla com outro dialog aberto:** `Ctrl+K` dentro do dialog Handout Drop não dispara (captura por dialog já prioriza seu handler); se conflito, usar stack de keyboard providers
- **Ação bloqueada (ex: Mestre em combate escolhe "Editar NPC"):** executa → dispara modal "Pausar combate pra editar?" (mesmo flow do §1 edge case)

### Validação automatizada
```ts
test("Ctrl+K abre palette em <200ms", async ({ page }) => {
  await page.goto("/app/campaigns/krynn-id/prep");
  const t0 = Date.now();
  await page.keyboard.press("Control+KeyK");
  await expect(page.getByTestId("hq-search-dialog")).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(200);
});

test("Debounce de 120ms não dispara fetch por keystroke", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/api/search")) requests.push(r.url()); });
  await page.keyboard.press("Control+KeyK");
  await page.keyboard.type("grol", { delay: 30 });
  await page.waitForTimeout(200);
  expect(requests.length).toBe(1); // não 4
});

test("Enter em NPC navega e fecha", async ({ page }) => {
  await page.keyboard.press("Control+KeyK");
  await page.getByTestId("hq-search-input").fill("grolda");
  await page.getByTestId("hq-search-item-npc-grolda").press("Enter");
  await expect(page).toHaveURL(/\/npcs\/grolda/);
  await expect(page.getByTestId("hq-search-dialog")).not.toBeVisible();
});
```

---

## 4. Backlink `@autocomplete` (killer-feat Notion §10.1)

**Modos de acesso:** Auth-only (Mestre editor Recap/Notas) + Auth player (Minhas Notas). Guest não tem backlinks. Anônimo não tem notas.
**Arquivos esperados:** `components/campaign-hq/BacklinkEditor.tsx` + `lib/backlinks/parser.ts`.

### Trigger
- **Char:** `@` ou `[[` digitado dentro de editor rich-text (Recap, Notas, Session hook)
- **Escopo:** campaign-scoped (apenas entities da campanha atual)

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | `@` detectado | Parser dispara; floating div posiciona abaixo do caret (via Range.getBoundingClientRect) |
| 0–100 | Dropdown vazio | Mostra header "Sugestões" + skeleton 3 rows (100ms apenas — deve ser cache-first) |
| 100 | Últimos usados | Se cache tem "últimos 5 @citados na campanha", mostra eles primeiro |
| 100+ | Type "gro" | Debounce 100ms (menor que palette — mais responsivo inline) |
| 100+100 | Filter | `filter(entities, fuzzyMatch("gro"))` → Grolda aparece primeiro (com ícone ● NPC) |
| Enter/Click | Insere chip | Texto `@gro` é substituído por chip `[Grolda](npc:uuid)` — renderizado como badge gold com borda (seguindo padrão visual SVG dourado, regra memory) |
| — | Autocomplete alt | `[[Grolda]]` também aceito; parser ao save converte pra `@` interno. UI sempre renderiza como chip. |

### Tipos de entidade
Ordenação fixa no dropdown (por pulse da campanha):
1. NPCs (ícone ● lucide `UserCircle`)
2. Locais (ícone ▲ lucide `MapPin`)
3. Quests (ícone ⬢ lucide `Compass`)
4. Sessões (ícone 📖 lucide `BookOpen`)
5. Facções (ícone ■ lucide `Flag`)

### Edge cases
- **@ em meio de palavra (email@domain):** detectar `@` apenas se precedido por whitespace ou início de linha; padrão regex `/(?:^|\s)@\w*/`
- **Entity não existe ainda:** no fim do dropdown mostrar "+ Criar novo NPC «{query}»" (só Mestre vê). Enter → cria stub + insere chip + abre slideover pra completar ficha (ver §7 Quick-add)
- **Delete no chip:** backspace no fim do chip seleciona chip; segundo backspace remove (padrão Notion)
- **Paste de texto com `@nomes`:** parser passa por toda a string ao paste, tenta resolver cada `@nome` contra cache; casa → chip; não casa → texto literal com underline wavy gold e tooltip "Link não resolvido"
- **Entity renamed:** chip guarda UUID imutável; rename refleja no texto renderizado via lookup. Se UUID deletado → chip vira "⚠ NPC removido" em red/60%.
- **Sync conflict (Mestre rename enquanto player tem modal aberto):** realtime broadcast `entity:renamed` → lookup atualiza, chip re-renderiza sem piscar

### Validação automatizada
```ts
test("@ dispara dropdown com NPCs em <250ms", async ({ page }) => {
  await page.goto("/app/campaigns/krynn-id/recap");
  await page.getByTestId("recap-editor").click();
  await page.keyboard.type("O grupo encontrou @gro");
  await expect(page.getByTestId("hq-backlink-dropdown")).toBeVisible({ timeout: 250 });
  await expect(page.getByTestId("hq-backlink-item-npc-grolda")).toBeVisible();
});

test("Sintaxe alternativa [[Grolda]] renderiza como chip", async ({ page }) => {
  await page.keyboard.type("[[Grolda]] apareceu");
  await page.getByTestId("recap-save").click();
  await page.reload();
  await expect(page.getByTestId("recap-chip-grolda")).toHaveAttribute("data-entity-type", "npc");
});

test("Criar novo NPC inline via autocomplete", async ({ page }) => {
  await page.keyboard.type("@Zarek");
  await page.getByTestId("hq-backlink-create-npc").click();
  await expect(page.getByTestId("slideover-npc-new")).toBeVisible();
  await expect(page.getByTestId("slideover-npc-name")).toHaveValue("Zarek");
});
```

---

## 5. Tags com autocomplete (killer-feat Obsidian §10.2)

**Modos de acesso:** Auth-only.
**Arquivos esperados:** `components/campaign-hq/TagInput.tsx`.

### Trigger
- **Char:** `#` em editor ou input dedicado de tags (field no card de NPC/Quest/Nota)

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | `#` | Dropdown aparece (mesma base do §4 — positioning) |
| 0–100 | Lista | Mostra tags existentes na campanha, ordenadas por **recência** (última `used_at`), max 8 |
| 100+ | Type "drag" | Filter `startsWith`/`contains` case-insensitive |
| — | Match | Enter/click insere chip tag (verde oliva #6B8E23 — diferente do chip backlink gold) |
| — | Sem match | Última row: "+ Criar tag #{query}" — Enter cria (POST `/api/tags`) + insere |

### Edge cases
- **Tag hierárquica (`#boss/dragão`):** parser aceita `/` como separador; renderiza como breadcrumb `boss > dragão`
- **Limite:** max 20 tags por entidade (evitar spam); input mostra counter `13/20` quando ≥ 15
- **Delete:** `x` no chip remove; backspace no input vazio remove último chip
- **Sugestão smart:** se editor tem texto mencionando "dragão" 3+ vezes, dropdown sugere `#dragão` mesmo sem digitar (low-priority — Fase C)
- **Duplicate:** tentar inserir tag que já existe → noop, mostra shake animation 200ms

### Validação automatizada
```ts
test("# abre dropdown com tags ordenadas por recência", async ({ page }) => {
  await page.getByTestId("tag-input").click();
  await page.keyboard.type("#");
  const items = await page.getByTestId("tag-item").all();
  expect(items.length).toBeGreaterThan(0);
  const first = await items[0].getAttribute("data-used-at");
  const second = await items[1].getAttribute("data-used-at");
  expect(new Date(first!).getTime()).toBeGreaterThan(new Date(second!).getTime());
});
```

---

## 6. Handout drop (killer-feat Roll20 §10.4)

**Modos de acesso:** Mestre Auth-only publica; Player Anônimo + Auth consomem. Guest não.
**Arquivos esperados:** `components/campaign-hq/HandoutDropzone.tsx` + `app/api/handouts/route.ts`.

### Trigger
- **Drag:** arquivo (imagem, pdf, link `.url`) do OS → dropzone "Mostrar aos players" (sempre visível em Rodar, recolhível)
- **Paste:** `Ctrl+V` com imagem no clipboard também aceita
- **Click:** botão `[📎 Enviar handout]` abre file picker

### Frame-by-frame — Mestre side
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Drag enter viewport | Dropzone ganha border dashed gold + background gold/5%; rest of content escurece 10% |
| 0 | Drag over dropzone | Border solid gold + scale 1.02 + cursor `copy` |
| 0 | Drop | Validação local (max 10MB, mime `image/*` ou `application/pdf`); se inválido → toast error "Arquivo não suportado" |
| 100 | Otimista | Thumbnail aparece na zona "Handouts da sessão" com overlay spinner + texto "Enviando..." |
| 100 | Upload | POST multipart pra Supabase Storage via signed URL |
| — | Progress | Progress bar gold na thumbnail (0–100%) |
| upload done | Broadcast | POST `/api/handouts/publish` → supabase realtime broadcast `handout:published` |
| +100 | Toast Mestre | Sonner success "Handout enviado pros players" (3s) |
| +100 | Final | Thumbnail perde spinner, ganha check gold por 1s |

### Frame-by-frame — Player side
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Realtime chega | Payload `{ handout_id, url, type, caption }` |
| 0–200 | Toast | Sonner info com thumbnail miniatura + "Novo handout: {caption}" + CTA [Ver agora] (persistente até click ou dismiss) |
| Click [Ver] | Modal | Lightbox full-screen com imagem + caption + botão [Fechar] |
| — | Accordion | Handout fica permanente em "Última sessão > Handouts" |

### Edge cases
- **Upload falha (rede):** thumbnail fica com overlay red + ícone ⚠ + [Tentar novamente]. Clique re-envia.
- **Player offline quando broadcast dispara:** ao reconectar, fetch `/api/campaign/[id]/handouts?since=<last_seen_at>` retorna pendentes + toast "3 handouts enquanto você estava offline"
- **Arquivo grande (>10MB):** pre-validação bloqueia; toast error "Arquivo muito grande. Max 10MB."
- **Drop múltiplos arquivos:** processa em série, toast único "3 handouts enviados"
- **Mestre drop durante combate:** funciona (cena precisa ser dinâmica — essa é a feature)
- **Permissão granular (§10.3):** futuro — "Mostrar apenas para {player}" dropdown antes de publicar. Fase C.
- **Copyright/bulk protect:** hook pra scan dimensões (>4K rejeita como suspeito — prevenção de vazamento de book digitalizado). Phase D.

### Validação automatizada
```ts
test("Mestre drag imagem → broadcast chega no player em <2s", async ({ browser }) => {
  const dmCtx = await browser.newContext(/* auth Mestre */);
  const playerCtx = await browser.newContext(/* auth player */);
  const [dm, player] = await Promise.all([dmCtx.newPage(), playerCtx.newPage()]);
  await dm.goto("/app/campaigns/krynn-id/run");
  await player.goto("/app/campaigns/krynn-id/journey");
  await dm.getByTestId("hq-handout-dropzone").setInputFiles("tests/fixtures/map.png");
  await expect(player.getByRole("status", { name: /novo handout/i })).toBeVisible({ timeout: 2000 });
});
```

---

## 7. Quick-add em Preparar (decisão: slideover à direita)

**Modos de acesso:** Auth-only (Mestre).
**Decisão travada neste doc:** **slideover 480px da direita** (não modal central). Razões:
1. Não perde contexto de Preparar (lista atrás visível)
2. Mobile: vira sheet bottom full-height (padrão Radix Dialog)
3. Keyboard: Esc fecha; Enter em último campo salva
4. Reutilizável para edit (mesma UI quando click em NPC)

**Arquivos esperados:** `components/campaign-hq/QuickAddSlideover.tsx`, entities por tipo.

### Trigger
- **Click:** `[+ NPC]`, `[+ Local]`, `[+ Quest]`, `[+ Facção]`, `[+ Nota]` em Preparar
- **Dropdown:** `[+ Adicionar item ▼]` unificado → menu → tipo → slideover
- **Keyboard:** `n` (quando fora de input) → dropdown unificado
- **Via backlink §4:** `+ Criar novo NPC «{query}»` abre slideover com nome pré-preenchido

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Click | Slideover container ganha `open=true` |
| 0 | Backdrop | Overlay black/30% fade-in 200ms |
| 0–400 | Slide | Slideover translate-x 100%→0 (400ms cubic-bezier(0.16, 1, 0.3, 1)) |
| 400 | Focus | Primeiro input (nome) recebe focus |
| — | User digita | Validações inline (nome required; descrição opcional) |
| Enter Ctrl+Enter | Save | POST `/api/{entity}` otimista: append local + close + toast |
| — | Toast | "NPC criado" success 3s; ação [Desfazer] por 5s (DELETE reverso) |
| 400 close | Slideover sai | translate-x 0→100% (250ms ease-in) |
| 650 | Final | Foco volta pro botão que abriu |

### Campos mínimos por tipo
| Tipo | Required | Opcional (visível) |
|---|---|---|
| NPC | Nome | Raça · Classe · Role (aliado/neutro/hostil) · Descrição |
| Local | Nome | Tipo (cidade/masmorra/região) · Descrição |
| Quest | Título | Status (ativa/disponível) · Recompensa |
| Facção | Nome | Alinhamento · Líder · Descrição |
| Nota | (nenhum) | Corpo (editor com backlinks §4) |

### Edge cases
- **Save falha (400):** slideover mantém aberto, erro inline por campo + banner top "Falha ao salvar: {msg}". Retry button.
- **Save falha (500/offline):** salvar local em IndexedDB `pendingCreates`, fechar slideover com toast warning "Salvo offline — enviará quando reconectar". Background sync quando online.
- **Slideover aberto + Esc:** se form "dirty" → confirma "Descartar alterações?"; se clean → fecha direto
- **Criar NPC com mesmo nome:** warning suave inline "Já existe 'Grolda'. Criar outro?" + checkbox "Sim, outro NPC com mesmo nome". Default bloqueia.
- **Mobile:** vira bottom-sheet full height; swipe down fecha; safe-area-inset-bottom respeitado

### Validação automatizada
```ts
test("Click +NPC abre slideover e salva com Enter", async ({ page }) => {
  await page.goto("/app/campaigns/krynn-id/prep");
  await page.getByTestId("hq-quick-add-npc").click();
  await expect(page.getByTestId("slideover-npc")).toBeVisible();
  await page.getByTestId("slideover-npc-name").fill("Grolda");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("status", { name: /npc criado/i })).toBeVisible();
  await expect(page.getByTestId("slideover-npc")).not.toBeVisible();
  await expect(page.getByTestId("npc-list-item-grolda")).toBeVisible();
});
```

---

## 8. Reconexão invisível (Resilient Reconnection Rule compliance)

**Modos de acesso:** Anônimo + Auth (Player + Mestre). Guest não tem realtime.
**Arquivos existentes (padrão atual):** `components/player/PlayerJoinClient.tsx` + `components/combat-session/CombatSessionClient.tsx` já têm visibilitychange.
**Regra imutável:** CLAUDE.md §Resilient Reconnection Rule — zero tela branca, 3s grace antes de qualquer banner "desconectado".

### Trigger
- **Browser:** `online`/`offline` events; `visibilitychange` (visible após hidden); `navigator.onLine`
- **Supabase channel:** `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED` do channel status
- **Heartbeat miss:** 3 heartbeats consecutivos sem ACK (15s cada = 45s total)

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Rede cai | `offline` event ou `CHANNEL_ERROR` detectado; flag `isReconnecting=true` |
| 0–3000 | Grace silencioso | **Nada visível muda**. Skeleton substitui conteúdo ao vivo (HP bars, initiative) — dados "congelados" mostrados com badge gold sutil "stale since 2s" (opcional visual, dev mode) |
| 0 | Retry 1 | Tenta re-subscribe channel imediato |
| 1500 | Retry 2 | Se 1 falhou, backoff exponencial: 1.5s, 3s, 6s |
| 3000 | Banner aparece | Se não reconectou em 3s, banner bottom (não top — menos intrusivo) translate-y 100%→0 em 200ms: "Reconectando..." + spinner gold sutil. Z-index alto mas não overlay. |
| — | Tentativas | Continua tentando em backoff (cap em 30s entre tentativas) |
| Reconecta | Banner sai | Banner slide-down 200ms + toast sonner success "Conectado" 2s |
| Reconecta | Fetch state | Re-fetch `/api/campaign/[id]/state` → merge com cliente → anima diffs |

### Fallbacks em cadeia (da Regra Imutável)
```
L1: visibilitychange + reconnect imediato (< 2s)
L2: sessionStorage → restore auth anon sem login form
L3: localStorage (24h TTL) → mesmo mas com validação de token_owner
L4: cookie auth
L5: lista de nomes server-side (1 click)
L6: formulário completo (último recurso, só mostra após L1-L5 tudo falhar)
```

### Edge cases
- **Mobile background >30s:** iOS/Android suspendem JS; ao voltar, `visibilitychange` dispara visible; heartbeat validado; se token ainda válido → re-subscribe silencioso (sem banner). Se token expirou → refresh auth em background; se refresh falha → banner aparece.
- **Pagehide durante combate:** enviar `sendBeacon("/api/presence/leave", {...})` + broadcast `player:disconnecting`. Fire-and-forget. Página pode fechar.
- **Split-brain (2 tabs mesmo jogador):** ao visibilitychange em tab B, validar `session_tokens.current_tab_id` no DB; se outra tab tem posse, mostrar banner "Essa aba não é a ativa · [Assumir controle]"
- **Mestre timer 15s stale detection:** independente do player, Mestre vê indicador amarelo "Satori — offline há 30s" no initiative. Não há fluxo de expulsão automática; é diagnóstico.
- **JAMAIS:** mostrar form de rejoin durante os primeiros 3s. Mostrar skeleton → se L1-L5 falham, aí sim.

### Validação automatizada
```ts
test("Player perde rede 2s: banner NÃO aparece (grace period)", async ({ page, context }) => {
  await page.goto("/app/campaigns/strahd-id/watch");
  await context.setOffline(true);
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("hq-reconnecting-banner")).not.toBeVisible();
  await context.setOffline(false);
});

test("Player perde rede >3s: banner aparece bottom", async ({ page, context }) => {
  await context.setOffline(true);
  await page.waitForTimeout(3500);
  await expect(page.getByTestId("hq-reconnecting-banner")).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("status", { name: /conectado/i })).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("hq-reconnecting-banner")).not.toBeVisible();
});

test("Reconexão preserva mode=assistindo se combat.active=true", async ({ page, context }) => {
  await page.goto("/app/campaigns/strahd-id/watch");
  await context.setOffline(true);
  await page.waitForTimeout(5000);
  await context.setOffline(false);
  await expect(page).toHaveURL(/\/watch$/);
});
```

---

## 9. Sidebar collapse/expand (desktop)

**Modos de acesso:** Auth-only (Mestre + Player auth). Anônimo em desktop também vê (light).
**Arquivos esperados:** `components/campaign-hq/Sidebar.tsx`.

### Trigger
- **Click:** chevron `◀`/`▸` no bottom da sidebar
- **Keyboard:** `[` (toggle collapse) — apenas quando foco não em input
- **Persist:** estado salvo em localStorage `hq:sidebarCollapsed:{userId}` (cosmético, permitido §5.5)

### Frame-by-frame
| ms | Estado | Width | O que acontece |
|---|---|---|---|
| 0 | Click | 220px | Estado `collapsed=true`; CSS transition ativa |
| 0–200 | Transição | 220→80px | width anima 200ms ease-out; labels opacity 1→0 (mesmo timing) |
| 200 | Final | 80px | Só ícones visíveis; tooltip gold aparece on hover (Radix Tooltip delay=500ms) |

### Expand reverso
| ms | Estado | Width | O que acontece |
|---|---|---|---|
| 0 | Click ▸ | 80px | `collapsed=false` |
| 0–200 | Transição | 80→220px | width + labels opacity 0→1 (delay 50ms pra não "piscar" texto cortado) |

### Edge cases
- **Tooltip posicionamento collapsed:** `side="right"` sempre, `sideOffset=8`; se viewport cortar → fallback top
- **Hover on transition:** se user hover durante 200ms anim → tooltip não aparece ainda (delay 500ms do Radix cobre)
- **Tablet 768-1023px:** default collapsed; botão expand disponível mas não persiste (sempre collapsed ao reload nesse breakpoint)
- **Mobile <768px:** sidebar vira drawer (hamburger); essa interação não aplica
- **Respeitar reduced-motion:** `@media (prefers-reduced-motion: reduce)` → remove transição, só snap

### Validação automatizada
```ts
test("Click chevron collapse sidebar para 80px em ~200ms", async ({ page }) => {
  await page.goto("/app/campaigns/krynn-id/prep");
  const sidebar = page.getByTestId("hq-sidebar");
  await expect(sidebar).toHaveCSS("width", "220px");
  await page.getByTestId("hq-sidebar-toggle").click();
  await expect(sidebar).toHaveCSS("width", "80px", { timeout: 400 });
  await expect(page.getByTestId("hq-sidebar-label-npcs")).not.toBeVisible();
});

test("Persistência entre reloads via localStorage", async ({ page }) => {
  await page.getByTestId("hq-sidebar-toggle").click();
  await page.reload();
  await expect(page.getByTestId("hq-sidebar")).toHaveCSS("width", "80px");
});
```

---

## 10. Bottom tab bar mobile (mode switch)

**Modos de acesso:** Todos com shell (Mestre Auth; Player Auth + Anônimo; Guest vê variação).
**Arquivos esperados:** `components/campaign-hq/BottomTabBar.tsx`.

### Trigger
- **Tap:** cada tab (Preparar / Rodar / Recap para Mestre; Minha Jornada / Assistindo para Player quando ambos acessíveis)
- **Swipe:** (opcional Fase C) swipe horizontal no conteúdo troca mode

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Tap início | Touchstart: scale 0.95 (100ms) + gold/15% background |
| 0 | Haptic | `navigator.vibrate?.(10)` (iOS ignora mas Android responde) |
| 0–100 | Feedback | Active state: background gold/15% + border-top gold/40% + label gold + icon fill gold |
| 100 | Touchend | Scale volta 1.0 |
| 0 | Navigate | `router.push(mode)` disparado simultaneamente ao feedback |
| 120–300 | Conteúdo troca | Mesma curva de §1 (fade-out/in) |

### Layout
- Altura: `60px + env(safe-area-inset-bottom)` (respeita notch)
- Tabs: flex equal, ícone 24px + label 11px sans
- Fixed bottom-0; content tem padding-bottom correspondente
- Backdrop-filter blur (opcional se perf permitir): dá profundidade

### Edge cases
- **Safe area iOS com home indicator:** padding-bottom inclui `env(safe-area-inset-bottom)`
- **Landscape mobile (<480px height):** ocultar bottom tab e usar hamburger? Decisão: manter bottom bar reduzida a 48px, sem labels (só ícones)
- **Mode locked (combate ativo para Mestre):** tab de Preparar/Recap renderiza ícone 🔒 sobreposto; tap abre modal (§1 edge case)
- **Estado combate player:** tab "Assistindo" só aparece quando `combat.active=true`. Some quando combate fecha (abscence handled via flex-1 redistribute).
- **Tab bar oculta em Rodar mobile (W6):** decisão visual — em combate, tab bar dá lugar a CTA "Próximo turno" fixed bottom. Re-aparece ao pausar/sair.

### Validação automatizada
```ts
test("Tap mobile em Rodar tem scale feedback", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/campaigns/krynn-id/prep");
  const tab = page.getByTestId("hq-bottom-tab-run");
  await tab.tap();
  // verificar via CSS computed style ou via animation timing
  await expect(page).toHaveURL(/\/run$/);
  await expect(tab).toHaveAttribute("aria-selected", "true");
});

test("Tab bar respeita safe-area-inset-bottom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const bar = page.getByTestId("hq-bottom-tab-bar");
  const paddingBottom = await bar.evaluate((el) => getComputedStyle(el).paddingBottom);
  expect(paddingBottom).not.toBe("0px");
});
```

---

## 11. Toast notifications

**Modos de acesso:** Todos. Lib: `sonner` (já instalado).
**Arquivos existentes:** `app/layout.tsx` (Toaster provider), `components/xp/XpRewardToast.tsx` (padrão).

### Configuração base (Sonner)
```ts
<Toaster
  position={isMobile ? "bottom-center" : "bottom-right"}
  expand={false}
  richColors
  closeButton
  toastOptions={{
    className: "hq-toast",
    duration: 4000,
  }}
/>
```

### Tipos e comportamento
| Tipo | Duração | Auto-dismiss? | Close button? | Cor |
|---|---|---|---|---|
| `info` | 4000ms | Sim | Sim | foreground/80% |
| `success` | 3000ms | Sim | Sim | gold (#D4A853) |
| `warning` | **manual** | Não | Sim, obrigatório | amber |
| `error` | **manual** | Não | Sim, obrigatório | red/70% |
| `loading` | até promise resolver | Não | Não | gold spinner |

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | `toast.success()` | Sonner adiciona à fila |
| 0–200 | Slide-in | Desktop: translateX 100%→0 (from right, 200ms ease-out). Mobile: translateY 100%→0 (from bottom) |
| 200 | Fixo | Toast visível; hover pausa auto-dismiss (Sonner default) |
| duration | Fade-out | opacity 1→0 200ms + slide-out |
| +200 | Removido | DOM cleanup |

### Stacking
- Max 3 simultâneos (Sonner default `visibleToasts={3}`); older fade out
- Stack direction: toasts mais recentes em cima (desktop right-bottom) ou topo da pilha mobile
- Gap: 8px entre toasts

### Edge cases
- **Duplicate (mesma mensagem <2s):** passar `id` na toast pra dedupe — update texto se id existe
- **Toast com ação ([Desfazer]):** duração bump pra 6s; click executa + dismiss
- **Toast persistente (error de save, handout falhou):** `duration: Infinity`; deve ter close button obrigatório
- **Reduced-motion:** Sonner suporta nativo; slide vira fade direto
- **Narração screen-reader:** Sonner usa `role="status"` (polite) por default; errors usam `role="alert"` (assertive) — toast-type mapping já correto no Sonner
- **Toast sobreposto a bottom tab bar (mobile):** ajustar `offset={{ bottom: "70px" }}` mobile pra não colidir

### Validação automatizada
```ts
test("toast.success auto-dismiss em 3s", async ({ page }) => {
  await page.evaluate(() => (window as any).toast.success("Test"));
  await expect(page.getByRole("status", { name: /test/i })).toBeVisible();
  await page.waitForTimeout(3200);
  await expect(page.getByRole("status", { name: /test/i })).not.toBeVisible();
});

test("Max 3 toasts simultâneos", async ({ page }) => {
  await page.evaluate(() => {
    for (let i = 0; i < 6; i++) (window as any).toast.info(`Msg ${i}`);
  });
  const toasts = await page.getByRole("status").count();
  expect(toasts).toBeLessThanOrEqual(3);
});

test("Error toast requer dismiss manual", async ({ page }) => {
  await page.evaluate(() => (window as any).toast.error("Boom"));
  await page.waitForTimeout(6000);
  await expect(page.getByRole("alert", { name: /boom/i })).toBeVisible();
});
```

---

## 12. Tour dismissable (W0b onboarding)

**Modos de acesso:** Auth-only (Mestre primeiro login em HQ).
**Arquivos esperados:** `components/campaign-hq/OnboardingTour.tsx`.

### Trigger
- **Auto:** primeiro carregamento em campanha nova (counts: NPCs=0 + Quests=0 + Locais=0). Dispara uma vez apenas.
- **Manual:** `Configurações > Ajuda > Refazer tour do Preparar` — abre mesmo componente
- **Persist:** localStorage `hq:tourDismissed:{campaignId}:{userId}=true` (cosmético)

### Frame-by-frame
| ms | Estado | O que acontece |
|---|---|---|
| 0 | Mount | Componente renderiza se `!dismissed && isEmpty` |
| 0–300 | Highlight step 1 | Spotlight overlay: ponto de destaque com border gold + pulso 2s cycle; resto do viewport escurece 60% |
| 0–300 | Callout in | Tooltip callout slide-in next to spotlight (fade+slide 300ms) |
| — | Conteúdo step 1 | Texto curto ("Esse é o modo Preparar — aqui você planeja a sessão") + CTAs [Próximo] [Pular tour] |
| Click Próximo | Step 2 | Spotlight anima pra próximo target (400ms cubic-bezier); callout re-posiciona |
| — | 3 passos total | Mode switcher → Sidebar surfaces → Quick add |
| Click [Pular] | Fade-out | Overlay + callout fade 150ms → dismiss + localStorage flag |
| Esc | Mesmo | Trata Esc como [Pular] |

### Edge cases
- **Dismiss durante transição:** cancela anim + cleanup imediato
- **Resize durante tour:** re-posiciona spotlight baseado em target.getBoundingClientRect()
- **Target element não existe (sidebar collapsed):** step 2 detecta e expande sidebar antes de aplicar spotlight
- **A11y:** focus trap durante tour; Tab circula entre Próximo/Pular; Esc fecha
- **Reduced-motion:** spotlight sem pulso, callout sem slide (fade direto)
- **Refazer tour:** ignora flag, dispara fresh

### Validação automatizada
```ts
test("Tour aparece em HQ vazia e some após Pular", async ({ page }) => {
  await createEmptyCampaign(page);
  await page.goto("/app/campaigns/new-id/prep");
  await expect(page.getByTestId("hq-tour-step-1")).toBeVisible();
  await page.getByTestId("hq-tour-skip").click();
  await expect(page.getByTestId("hq-tour-step-1")).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId("hq-tour-step-1")).not.toBeVisible();
});

test("Refazer tour via config ignora flag", async ({ page }) => {
  // dismissed previamente
  await page.evaluate(() => localStorage.setItem("hq:tourDismissed:krynn:dani", "true"));
  await page.goto("/app/campaigns/krynn/prep");
  await expect(page.getByTestId("hq-tour-step-1")).not.toBeVisible();
  await page.getByTestId("hq-help-restart-tour").click();
  await expect(page.getByTestId("hq-tour-step-1")).toBeVisible();
});
```

---

## Changelog

- **v1.0 (2026-04-22):** versão inicial, 12 interações derivadas do redesign-proposal v0.2. Decisões travadas:
  - Quick-add = slideover direita (§7), não modal central
  - Toast lib = Sonner (já instalado); bottom-right desktop / bottom-center mobile
  - Sidebar collapse persistido em localStorage (cosmético OK §5.5)
  - Tour = `hq:tourDismissed` flag por campaign+user; reabre via config
  - Grace reconexão = 3000ms antes de banner (conforme Resilient Rule)
  - Banner reconectando = bottom (menos intrusivo) não top
  - Backlink = `@nome` primário + `[[nome]]` alternativa (já decidido proposal §10.1)

## Próximos passos

1. Cross-check com `test-spec.md` (pasta da auditoria) — garantir nenhum E2E test conflita com IDs aqui
2. Enviar pro Sally validar copy dos modais (PT-BR)
3. Priorizar Fase B implementation: §1 + §3 + §7 primeiro (maior ROI)
4. Phase C: §4 §5 §6 (killer-features)
5. Polish / §10 mobile tabs / §12 tour = últimos
