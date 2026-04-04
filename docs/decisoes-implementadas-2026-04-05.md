# Decisoes Implementadas sem PRD Formal — 2026-04-05

> Decisoes tomadas durante a sessao de assembly do Player HQ e correcao de bugs de combate.
> Ref: `docs/session-log-2026-04-05.md`

---

## 1. CharacterEditSheet — Mount no Header (nao na aba Sheet)

**Data:** 2026-04-05
**Tipo:** UX / Arquitetura de componente
**Por que:** O componente existia completo mas nao tinha mount point. Decisao: colocar o botao pencil no header global do shell (ao lado do nome do personagem), nao dentro da aba Sheet. Isso permite editar atributos de qualquer aba sem navegar.
**O que inclui:**
- Pencil button no header com 44px touch target
- Translations object passado inline (27 chaves PT+EN)
- `saveField` do `useCharacterStatus` como `onSave` (debounce 400ms)

---

## 2. NotificationFeed — Dentro da aba Inventory (nao header global)

**Data:** 2026-04-05
**Tipo:** UX / Decisao de layout
**Por que:** Notificacoes atuais sao exclusivamente sobre Bag of Holding (removal approved/denied). Faz sentido contextual mostrar dentro da aba Inventory. Se no futuro houver notificacoes de outros tipos, mover para um bell icon no header.
**O que inclui:**
- Render condicional: so aparece se `notifications.length > 0`
- Card com header "Notifications" em amber-400

---

## 3. Combat Log/Recap Mutex — Derived State (nao useEffect)

**Data:** 2026-04-05
**Tipo:** Bug fix / Decisao tecnica
**Por que:** Code review identificou que `useEffect` para fechar o log causava 1 frame de flicker (log + recap visiveis simultaneamente). Derivacao (`effectiveShowActionLog = showActionLog && !postCombatPhase`) e flicker-free.
**O que inclui:**
- Variavel derivada em ambos CombatSessionClient e GuestCombatClient
- Toggle do log bloqueado durante post-combat (`if (!postCombatPhase)`)
- Parity completa Guest/Auth

---

## 4. Sticky Next Turn FAB — Escondido durante Action Log

**Data:** 2026-04-05
**Tipo:** UX / Decisao de interacao
**Por que:** Code review identificou que o FAB (z-40) ficava clickavel sobre o backdrop do CombatActionLog (tambem z-40). Em vez de apenas bumpar z-index (que deixaria o FAB visivel sobre o log), decisao: esconder o FAB quando action log esta aberto. Mais limpo.
**O que inclui:**
- Guard `!showActionLog` no render do FAB (auth + guest)
- z-[41] como safety net

---

## 5. Spell Slug Collision — Usar `spell.id` para 2024

**Data:** 2026-04-05
**Tipo:** Bug fix / Decisao de roteamento
**Por que:** 319 spells existem em ambas versoes (2014 + 2024) com o mesmo nome. `toSlug(name)` gera o mesmo slug. Decisao: para spells 2024, usar o campo `id` do JSON (que ja tem sufixo `-2024`) como slug de roteamento.
**O que inclui:**
- `spellSlug(spell)` — retorna `spell.id` se 2024 e diferente do name slug
- `getSrdSpellStaticParams()` — gera rotas unicas para ambas versoes
- `getSpellBySlug()` — fallback por `s.id` apos falha por name slug
- hreflang usa `toSlug(spell.name)` para lookup PT (paginas 2024 apontam para a mesma pagina PT que 2014)

---

## 6. CTA Sprint 1 — Confirmado como Completo (nao implementado nesta sessao)

**Data:** 2026-04-05
**Tipo:** Descoberta / Atualizacao de status
**Por que:** Pesquisa profunda do codebase revelou que CTA-01 a CTA-09 (~27 SP) ja estavam implementados. O epic doc (`docs/epic-combat-time-analytics.md`) estava desatualizado. Decisao: nao tocar no codigo CTA, apenas documentar que Sprint 1 esta completo.
**Metricas de validacao:**
- `turnTimeAccumulated` em auth store + guest store
- `CombatLeaderboard` renderiza duration, per-combatant time, Speedster/Slowpoke
- `buildCombatReport()` e `buildCombatReportFromStats()` incluem tempo
- i18n keys presentes em EN + PT-BR
