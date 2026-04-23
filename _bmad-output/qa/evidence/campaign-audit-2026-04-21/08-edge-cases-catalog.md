# 08 — Edge Cases Catalog (Campaign HQ Redesign v0.2)

**Autor:** spec pack 2026-04-22
**Source of truth:** `redesign-proposal.md` (v0.2) + `CLAUDE.md` (regras imutáveis)
**Escopo:** edge cases **não cobertos** pela proposal v0.2. Checklist pré-deploy pro dev.
**Tom:** denso, acionável. Cada cenário tem descrição + comportamento esperado + falhas a evitar + como testar.

---

## 1. Estados especiais de campanha

### 1.1 Campanha arquivada (read-only)

**Cenário:** Mestre arquiva campanha (via `actions.archive`). Banner topo em todas as rotas: "Campanha arquivada — somente leitura. [Desarquivar]".

**Comportamento esperado:**
- Mode switcher continua visível (Preparar/Rodar/Recap) mas **todos os forms** ficam `readOnly`.
- Botões destrutivos (delete, invite, start combat) ocultos.
- Badge `badges.archived` aparece no CampaignSwitcher do topbar.
- Player vê banner "Mestre arquivou a campanha. Seu personagem permanece consultável."
- `campaignSwitcher` default ordena arquivadas abaixo das ativas.

**Falhas a evitar:**
- Tentar salvar (PATCH/POST) numa campanha arquivada → backend deve retornar 403 `errors.permission_denied`, não engolir silenciosamente.
- Combat start endpoint aceitar archived=true — **blocker**. Guard no server.
- `resolveMode()` retornar `rodar` se combat antigo estava ativo antes do arquivo (arquivar deve forçar combat.active=false).

**Como testar:**
```
1. Criar campanha, iniciar combate, arquivar
2. Assertion: GET /api/campaigns/:id retorna archived=true, combat.active=false
3. Playwright: navegar pra /app/campaigns/:id/prep — assert banner visible, input[name=description] disabled
4. POST /api/npc retorna 403
```

### 1.2 Campanha deletada pelo Mestre enquanto player está dentro

**Cenário:** Player está em `/app/campaigns/:id/journey`. Mestre deleta campanha em outra aba/device.

**Comportamento esperado:**
- Supabase realtime broadcast `campaign:deleted` → client mostra modal "O mestre deletou essa campanha" com CTA "Voltar pro dashboard".
- Fetcher subsequentes retornam 404 → redirect `/app` com toast `errors.campaign_deleted_body`.
- Dados locais (localStorage notas pro anônimo) mantidos até user decidir apagar.

**Falhas a evitar:**
- Tela branca ou 500.
- Player fica preso em tela de combate "morta".
- localStorage persiste token e tenta rejoin infinitamente.

**Como testar:**
```
1. Player aberto em tab A /journey
2. Mestre em tab B executa DELETE /api/campaigns/:id
3. Assert realtime event recebido em A dentro de 3s
4. Assert modal aparece, redirect após click
```

### 1.3 Mudança de ownership (transferir Mestre)

**Cenário:** Mestre original promove outro user a Mestre e remove-se. Feature ainda não implementada — documentar para futuro.

**Comportamento esperado:**
- Ambos ficam "co-Mestre" durante período transitivo.
- Resolução quando original remove-se: novo Mestre vira único owner.
- Se original estava em Rodar e combat ativo: combate preservado, novo Mestre assume.

**Falhas a evitar:**
- "Órfã" de Mestre — campanha sem owner. **Backend deve recusar removal se único Mestre.**
- Player fica como Mestre acidentalmente (role mismatch no DB).

**Como testar:**
```
-- SQL:
UPDATE campaign_members SET role='dm' WHERE user_id=<new> AND campaign_id=<id>;
DELETE FROM campaign_members WHERE user_id=<old> AND campaign_id=<id>;
-- Assert at least one row remains with role='dm', senão o trigger reverte.
```

### 1.4 Campanha pausada pelo Mestre

**Cenário:** Mestre marca campanha como `status=paused` (sem arquivar — pausa temporária).

**Comportamento esperado:**
- Banner "Campanha em pausa" em topo.
- Combat desabilitado.
- Edição permitida (Preparar/Recap write).
- Player vê banner e CTA "Avisar o mestre que quero jogar".

**Falhas a evitar:**
- Confundir `paused` com `archived` — são estados distintos.
- Status de pausa sumir sozinho (timer?) — deve persistir até Mestre desativar.

---

## 2. Papéis e transições

### 2.1 Usuário Mestre em campanha A, player em campanha B

**Cenário:** Dani é Mestre em "Krynn" e player em "Curse of Strahd". Troca entre elas pelo CampaignSwitcher.

**Comportamento esperado:**
- `resolveMode()` recalcula por campanha — Krynn cai em Preparar, Curse of Strahd cai em Minha Jornada.
- Sidebar + surfaces re-renderizam com o mapping certo.
- LocalStorage de preferências (sidebar collapsed etc) é per-campanha.

**Falhas a evitar:**
- Mode "sticky" entre campanhas (se Mestre navega de Krynn/prep → Curse of Strahd, **não** cair em prep em Curse of Strahd).
- Realtime subscriptions vazam de campanha A pra B (cancelar channels no switch).

**Como testar:**
```
1. User com 2 campanhas (role diferente)
2. Navegar campaign A → assert sidebar mostra "Preparar · Rodar · Recap"
3. Switch pra campaign B → assert sidebar mostra "Minha Jornada · Assistindo" (se combate) ou só Minha Jornada
4. DevTools: assert supabase channels apenas pra B (A unsubscribed)
```

### 2.2 Player promovido a co-Mestre mid-session

**Cenário:** Mestre convida player pra virar co-Mestre durante sessão ativa.

**Comportamento esperado:**
- Player recebe broadcast `campaign_members:updated` → client re-fetcha role.
- Se combate ativo: mantém Assistindo (não pula pra Rodar sozinho) — Mestre precisa sair e re-entrar pra assumir.
- Toast: "Você virou co-mestre. Ativar modo Rodar? [Sim] [Depois]".
- Permissões ampliam gradualmente.

**Falhas a evitar:**
- UI trava por 5s enquanto permissões re-carregam (fazer otimista + fallback).
- Player perder acesso à própria ficha ao virar Mestre (ficha deve seguir vinculada ao user).

### 2.3 Mestre que joga o próprio personagem (self-player)

**Cenário:** Mestre tem character vinculado. Em alguns grupos isso acontece (ex: mestre narra + controla NPC principal).

**Comportamento esperado:**
- Em Preparar/Rodar/Recap Mestre vê tudo.
- Em Minha Jornada: pode visualizar "perspectiva player" num toggle — mas sem perder powers.
- Ficha aparece em Party (W4) com badge "Mestre + você".

**Falhas a evitar:**
- Combat auto-switch forçar Mestre pra Assistindo em vez de Rodar.
- Ficha duplicada na lista de party.

### 2.4 Anônimo que cria conta durante sessão

**Cenário:** Player anônimo (via `/join/token`) decide criar conta durante sessão ativa. Clica rodapé `player.journey.anon_footer.cta`.

**Comportamento esperado:**
- Signup flow preserva session token.
- Após signup: merge automático — notas locais (localStorage) viram notas persistidas do novo user.
- Re-enter na sessão com auth token (mesma sessão, sem perder estado).
- Toast: "Conta criada. Suas notas foram salvas."

**Falhas a evitar:**
- Notas locais perdidas se browser fecha antes da sync completar.
- Duplicação de player na party (anon + auth sendo pessoas diferentes pro Mestre).
- Session token deixar de ser válido pós-auth (migração de auth precisa preservar campaign_members).

**Como testar:**
```
1. Abrir /join/<token> como anônimo
2. Criar 2 notas (localStorage)
3. Clicar rodapé "Criar conta" → signup
4. Assert notas aparecem em Minhas Notas no DB
5. Assert Mestre view mostra apenas 1 player (não duplicado)
```

---

## 3. Combate extremo

### 3.1 Combate com 20+ entidades

**Cenário:** Mestre adiciona muitos monstros (ex: 5 PCs + 20 kobolds).

**Comportamento esperado:**
- Lista de iniciativa **virtualizada** (TanStack Virtual ou similar) — render só o visible.
- Próximo turno auto-scroll pro item ativo.
- Agrupamento sugerido pelo sistema: "Grupo de 20 kobolds" com HP total (opcional).
- Mobile: indicador de "mais 12 abaixo ↓".

**Falhas a evitar:**
- Render síncrono de 30 rows derruba FPS.
- `aria-live` anuncia "HP mudou" 20 vezes quando 20 kobolds caem (debounce em ≥3 eventos em <500ms → "múltiplos HP mudaram").
- Realtime channel saturado (broadcast cada HP change individual — batch).

**Como testar:**
```javascript
// seed 25 creatures, inicia combate
// assert FPS > 50 durante scroll
// Performance tab: scripting < 16ms per frame
```

### 3.2 Combate paused por desconexão do Mestre

**Cenário:** Mestre fecha laptop durante combate. Player está em Assistindo.

**Comportamento esperado** (per `Resilient Reconnection Rule` no CLAUDE.md):
- L1-L3 fallbacks não detectam imediatamente — Player vê turno ainda do Mestre.
- L4 (Mestre stale timer, 15s poll) dispara "Mestre offline — combate pausado" no client do player.
- Player banner: "Mestre desconectado — aguardando reconexão".
- Combate NÃO é encerrado — fica em `combat.paused_reason='dm_offline'`.
- Quando Mestre reconnecta: resume automático, broadcast "Mestre reconectou".

**Falhas a evitar:**
- Player forçar end combat (só Mestre pode).
- Banner "desconectado" aparecer < 3s (per anti-pattern do CLAUDE.md).
- Dados de iniciativa perdidos durante pause (devem persistir no DB).

**Como testar:**
```
1. Mestre + player em combate
2. kill process Mestre (force-quit browser)
3. Assert banner em player aparece entre 15-45s
4. Mestre reabre → assert combate retoma no mesmo turno/round
```

### 3.3 Mestre fecha aba durante combate

Subset de 3.2 — variante onde Mestre fecha tab (não browser).

**Comportamento esperado:**
- `pagehide` dispara → sendBeacon "combat:dm_left".
- Server marca `combat.dm_present=false`.
- Timer 15s → se não reconectar, broadcast `combat.paused_reason='dm_offline'`.
- Mestre reabre → restoration via sessionStorage (spec `docs/spec-resilient-reconnection.md`).

### 3.4 Múltiplos combates em campanhas diferentes

**Cenário:** Dani abre 2 tabs — tab A é Krynn (Mestre rodando combate), tab B é Curse of Strahd (player).

**Comportamento esperado:**
- Cada tab mantém sua própria sessão de realtime.
- Presence independente.
- Combat active em A não afeta mode em B.
- **Design constraint:** Mestre só pode rodar 1 combate por campanha por vez (não 2 combates em Krynn). Validar via `UNIQUE INDEX WHERE active=true` no DB.

**Falhas a evitar:**
- Channel collision (campaign A e B compartilhando subscription).
- Toast de combate A aparecer em tab B.

---

## 4. Network / offline

### 4.1 Offline completo

**Cenário:** Conexão cai. Usuário estava em Preparar.

**Comportamento esperado:**
- Após 3s sem rede: banner "Reconectando..." (`common.reconnecting`).
- Skeleton em leituras que dependem de fetch.
- Edições ficam em draft local (IndexedDB) com badge "Não salvo".
- Reconecta: sync automático, toast `common.reconnected`.

**Falhas a evitar:**
- Banner "desconectado" antes dos 3s (per CLAUDE.md anti-pattern).
- Formulário perder input quando reconecta (preserve draft).
- Infinite spinner.

**Como testar:**
```
DevTools → Network → Offline
Aguardar 3s → assert banner
Editar NPC name → assert "Não salvo" badge
Toggle online → assert sync em <2s
```

### 4.2 Slow 3G (loading > 2s)

**Cenário:** Conexão ruim, requests demoram 4-6s.

**Comportamento esperado:**
- Skeleton aparece **imediato** (não esperar 300ms).
- Stale-while-revalidate: se havia cache, mostra cache + refresh no fundo.
- Toast "Modo de atualização lenta ativado" (`common.slow_update_mode`) se >3 requests >2s.

**Falhas a evitar:**
- Tela branca enquanto carrega.
- Multiple spinners empilhados.

### 4.3 Request que trava (no response)

**Cenário:** Server não responde. Request em limbo.

**Comportamento esperado:**
- Timeout em 30s.
- AbortController dispara → error handler → toast `errors.request_timeout`.
- Retry automático 1x após 5s.
- Se falhar 3x → banner persistente + "Tentar novamente" manual.

**Falhas a evitar:**
- Request nunca termina → user pensa que app travou.
- Retry loop infinito (backoff exponencial, max 3 retries).

### 4.4 Sync conflict (edição concorrente)

**Cenário:** Dani edita NPC Grolda em tab A, mesmo NPC em tab B (ou outro co-Mestre em device diferente). Salva A primeiro, depois B.

**Comportamento esperado:**
- **Last-write-wins** (escolha simples — editing collaboratively real-time fica pra v2 com CRDT).
- Warning antes de overwrite: `errors.sync_conflict`.
- Toast após save: "Outra pessoa editou. Suas mudanças foram aplicadas por último."

**Falhas a evitar:**
- Merge silencioso perdendo campos.
- Race condition no DB (usar `UPDATE ... WHERE updated_at=<client_timestamp>` e 409 se divergir).

---

## 5. Dados extremos

### 5.1 100+ NPCs numa surface

**Cenário:** Campanha veterana com 150 NPCs.

**Comportamento esperado:**
- Lista virtualizada.
- Busca inline (`/` shortcut) sempre visível — filter instantâneo client-side.
- Filter chips (tags, faction, status) + Views salvas (§9 F-11).
- Count no header: "NPCs (150)".

**Falhas a evitar:**
- Render síncrono → FCP > 3s.
- Busca bloqueante no main thread → Web Worker ou debounce 150ms.

### 5.2 50+ quests ativas

**Cenário:** Campanha rica com 50 quests ativas simultâneas.

**Comportamento esperado:**
- Paginação de 20 em 20 com "Carregar mais".
- Agrupamento por tipo (Main/Side/Bounty) default.
- Mapa mental pode ficar dens — ver 5.4.

### 5.3 Nota com 10.000 caracteres

**Cenário:** Mestre escreve um recap massivo com 10k chars.

**Comportamento esperado:**
- Editor usa lazy render (virtual scroll dentro da nota).
- Salvamento incremental (autosave a cada 5s).
- Backlinks indexados sob demanda.

**Falhas a evitar:**
- Input lag em textarea >5k chars.
- Salvamento dispara PATCH de 10k em cada keystroke (debounce 2s).

### 5.4 Mindmap com 200 nodes

**Cenário:** Campanha longa com 200+ entidades.

**Comportamento esperado:**
- Zoom-level inicial baseado em **cluster density** (fix F-12 da proposal):
  - Auto-fit calcula bounding box e pan/zoom pra mostrar clusters.
  - Label hidden em nodes até zoom > 0.8x; labels full em 1x+.
  - Edge bundling em regiões densas.
- Filter chips (tipo, tag) reduzem visible nodes.

**Falhas a evitar:**
- Render 200 DOM nodes simultâneos → usar canvas/SVG (preferir Flow/React Flow lib).
- Labels sobrepostas ilegíveis (F-12).

**Como testar:**
```
Seed 200 NPCs + 50 locations + 30 quests + links
Abrir mindmap → assert FPS > 30 no pan/zoom
Assert labels visíveis em clusters
```

---

## 6. Permissões (killer-feat 10.3)

### 6.1 Player tenta editar ficha de outro player

**Cenário:** Player A abre ficha de player B (via party list) e tenta editar HP.

**Comportamento esperado:**
- Ficha abre em **read-only** (sem campos editáveis visíveis).
- Se intercepta via devtools/direct POST: backend retorna 403 `errors.permission_player_edit_other`.

**Falhas a evitar:**
- UI esconde mas backend aceita (bypass via cURL).
- Toast confuso "Falha ao salvar" em vez de "Sem permissão".

**Como testar:**
```bash
# autenticado como player A
curl -X PATCH /api/characters/<player-b-id> -d '{"hp":100}'
# assert 403 com body {"error":"permission_denied","i18n":"errors.permission_player_edit_other"}
```

### 6.2 Player tenta ver NPC "hidden"

**Cenário:** Mestre marca NPC com `visibility=dm-only`. Player faz GET `/api/npc/:id`.

**Comportamento esperado:**
- GET retorna 403 ou 404 (preferir 404 pra não vazar existência).
- Sem link no mindmap do player pro NPC.
- Busca rápida não indexa hidden pra players.

**Falhas a evitar:**
- Nome aparecer em backlink em nota que foi compartilhada (scrub backlinks ao renderizar pro player).

### 6.3 Mestre compartilha Mapa Mental filtered

**Cenário:** Mestre tem 100 NPCs; só 20 são "compartilháveis" (`visibility=shared`).

**Comportamento esperado:**
- Player abre mindmap → vê só 20.
- Edges entre shared + hidden são **quebrados** (não mostrar aresta pra nada).
- Label "fantasma" pra hidden aparece apenas pro Mestre em toggle "Ver como jogador".

**Falhas a evitar:**
- Vazar nome de NPC hidden via edge.
- Player deduz hidden pelo número ("5 conexões a partir desse NPC, mas só vejo 3").

### 6.4 Handout rate-limiting

**Cenário:** Mestre faz drag de 10 handouts em 30s (tentando flood).

**Comportamento esperado:**
- Rate limit: max 3 handouts/minuto por Mestre por campanha.
- 4º+ dispara toast: "Muitos handouts em pouco tempo. Aguarde {sec}s."
- Supabase Storage respeita quota (imagens > 5MB rejeitadas client-side).

**Falhas a evitar:**
- DoS via upload gigante.
- Imagens abrindo em players antes de carregar → scale progressive.

---

## 7. Mobile específico

### 7.1 Rotação portrait ↔ landscape

**Cenário:** Usuário roda o device durante uso.

**Comportamento esperado:**
- Portrait (default): bottom tab bar + sidebar drawer.
- Landscape mobile (<1024w): side rail de 60px à esquerda (respeita safe-area-left); bottom bar some.
- Transição suave (não full reload).
- Scroll position preservado.

**Falhas a evitar:**
- Duplo scroll (horizontal + vertical).
- Layout "quebra" por 200ms durante transição.

### 7.2 Teclado virtual cobrindo bottom tab bar

**Cenário:** Player abre campo de nota e teclado sobe.

**Comportamento esperado:**
- `visualViewport` API detecta → tab bar **some** enquanto teclado ativo (ou sobe com teclado).
- Input fica visível (auto-scroll se necessário).
- Foco não perde ao fechar teclado.

**Falhas a evitar:**
- Input atrás do teclado (inacessível).
- Tab bar cobrindo texto do input.

### 7.3 Pull-to-refresh

**Cenário:** Player em Minha Jornada puxa pra baixo.

**Comportamento esperado:**
- Refresh re-fetch de quests/última sessão.
- Spinner nativo (via `overscroll-behavior: auto` + JS detection).
- Desabilitado em Rodar/Assistindo (`overscroll-behavior: contain`).

**Falhas a evitar:**
- Refresh acidental durante scroll rápido.
- Double-refresh.

### 7.4 Back button hardware (Android)

Detalhado em §8.5 do accessibility spec. Resumo:

- Modal/drawer aberto: fecha modal, não navega.
- Combate ativo (Mestre): confirma antes de sair.
- Combate ativo (player em Assistindo): volta pra Minha Jornada, combate preservado.
- Em mode switch dentro da mesma campanha: back retorna mode anterior.

**Como testar:**
```
Android emulator: abrir modal → back → assert modal fecha, rota mesma
Combate ativo (Mestre): back → assert confirm modal abre
```

---

## 8. Onboarding

### 8.1 Primeiro login ever (nunca viu Pocket DM)

**Cenário:** User criou conta pela primeira vez. 0 campanhas.

**Comportamento esperado:**
- Aterrissa em `/app` → W0a (dashboard vazio).
- CTA primário "Criar nova campanha".
- Link secundário "Cole o link do convite".
- Opt-in "Ver como funciona (tour 2min)".
- Flag `user.seen_onboarding_v2=false` no DB.

**Falhas a evitar:**
- Criar campanha default sem pedir.
- Onboarding modal obrigatório não-skippable.

### 8.2 Primeiro acesso a nova campanha (já usou o app)

**Cenário:** User veterano cria campanha nova. `seen_onboarding_v2=true` mas `campaigns[:id].seen_tour=false`.

**Comportamento esperado:**
- Aterrissa em W0b (3 passos PT-BR).
- **Tour 30s não inicia automático** (user já conhece o app) — só aparece link dismissable.
- Wireframe W0b visível até um dos passos completar.
- Após 3 ações: transiciona pro Preparar padrão.

**Falhas a evitar:**
- Tour pop-up forçando revisão do app que user já conhece.
- W0b persiste mesmo depois de 10 NPCs criados.

### 8.3 Tour reaberto via Configurações

**Cenário:** User clica `tour.replay_settings`.

**Comportamento esperado:**
- Tour 30s roda como se fosse novo.
- Pode skipar normalmente.
- Não altera flags do DB (temporário).

---

## 9. SEO / SSR (Next.js app router)

### 9.1 `/app/campaigns/:id/prep` sem auth

**Cenário:** User sem session tenta acessar rota protegida.

**Comportamento esperado:**
- Middleware Next.js detecta → redirect `/login?redirect=/app/campaigns/:id/prep`.
- Pós-login: redirect pro destino original.
- Se user logga mas não é membro: 403 + redirect `/app` + toast `errors.permission_denied`.

**Falhas a evitar:**
- Loop de redirect (login → app → login).
- Query `?redirect=` aceitar URL externa (XSS — sanitizar).

### 9.2 Shared link de recap publicado (public)

**Cenário:** Mestre publica recap e compartilha link. Anônimo (não-membro da campanha) acessa.

**Comportamento esperado (TBD — confirma com Dani):**
- **Opção A (conservadora):** exige login como player da campanha.
- **Opção B (recomendada):** público read-only se recap tem `visibility=public`. Mostra só texto + tags — sem mindmap, sem NPCs não-SRD.
- Meta tags OpenGraph pra preview no Discord/WhatsApp.
- Filter SRD whitelist aplicado (per CLAUDE.md SRD Compliance).

**Falhas a evitar:**
- Expor NPCs custom pra público por acidente.
- `metadata.robots` indexar recap com conteúdo privado.

### 9.3 Bots indexando

**Cenário:** Googlebot crawla `/app/campaigns/:id/*`.

**Comportamento esperado:**
- `robots.txt` bane `/app/*`.
- `<meta name="robots" content="noindex,nofollow">` em rotas auth-gated.
- Apenas `/app/campaigns/:id/recap/public/:slug` (se existir) indexável.

**Falhas a evitar:**
- Conteúdo SRD-compliant mas privado aparecer em search.

---

## 10. Dados SRD / compliance (CLAUDE.md SRD Rule)

### 10.1 Mindmap público — JAMAIS expõe não-SRD

**Cenário:** Mestre marca mindmap com visibility=shared pros players anônimos.

**Comportamento esperado:**
- Filter SRD whitelist ativo (server-side).
- NPCs custom criados pelo Mestre aparecem só pra Mestre + players auth.
- Se player anônimo chega: mindmap renderiza só nodes cujo `source ∈ srd-whitelist` ou `created_by_dm=true AND visibility=shared AND no_srd_leak=true` (flag extra).
- Build-time script `filter-srd-public.ts` garante que snapshots SSG nunca contêm non-SRD.

**Falhas a evitar:**
- Node name de monster não-SRD (ex: Beholder) leakar em tooltip.
- Edge label expondo conteúdo privado.

**Como testar:**
```bash
# rodar filter-srd-public.ts
npx tsx scripts/filter-srd-public.ts
# assert public/srd/monsters.json count ~1122
# grep -r "Beholder" public/srd/ → 0 matches (não-SRD)
```

### 10.2 Recap publicado com `@monstro-não-SRD`

**Cenário:** Mestre escreve recap: "O grupo matou o @Beholder da caverna." Publica pros players (auth). Mas vai um shared link público.

**Comportamento esperado:**
- Render pra auth-player: link clicável normal.
- Render pra público/anon: nome do monster mantido (é texto livre do Mestre, não conteúdo SRD WotC direto) MAS o backlink não resolve numa ficha do compêndio público (`/monsters/beholder` retorna 404 pra não-auth — já é assim).
- Se Mestre referencia monster custom dele: normal (é IP dele).

**Falhas a evitar:**
- Backlink auto-resolve stat block completo do Beholder em página pública.
- Imagem Beholder aparecer via `metadata` OpenGraph.

### 10.3 Handout com imagem copyrighted

**Cenário:** Mestre arrasta imagem de um livro copyrighted como handout.

**Comportamento esperado:**
- Handout é privado da campanha (só players vêem).
- Storage bucket com `visibility=authenticated` (não-public).
- URL assinada com expiração de 1h.
- Compliance: Mestre é responsável pelo conteúdo (TOS já cobre).

**Falhas a evitar:**
- Bucket mal-config deixar URL pública.
- CDN cache vazando imagem pós-delete.

---

## Apêndice — Checklist pré-deploy

- [ ] **Estados especiais**: arquivada, deletada, pausada — todos testados
- [ ] **Papéis**: switch campaigns, promote, self-player, anon→auth merge
- [ ] **Combate extremo**: 20+ entidades virtualizadas; Mestre offline fallback (15s); múltiplas campanhas isoladas
- [ ] **Offline/slow**: 3s banner; draft local; timeout 30s + retry; sync conflict warning
- [ ] **Dados extremos**: 100+ NPCs virtualized; 200 mindmap nodes perf > 30 FPS
- [ ] **Permissões**: player edit own only; hidden NPCs não vazam; handout rate limit
- [ ] **Mobile**: rotação smooth; keyboard não cobre; back button testado Android
- [ ] **Onboarding**: W0a first-ever; W0b per-campaign; tour replay
- [ ] **SSR/SEO**: auth redirect preserva destino; robots bane /app; recap público SRD-filtered
- [ ] **SRD compliance**: mindmap público 0 vazamento; recap backlinks resolvem certo; handouts privados
