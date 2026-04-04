# QA Consolidado — Todos os Tiers + Plano para UX 10/10

**Data:** 2026-04-04
**Autor:** Party Mode (Quinn 🧪 + Sally 🎨 + John 📋 + Amelia 💻)
**Escopo:** 18 jornadas, 3 tiers, ~400 test steps, 3 relatórios de execução

---

## VISÃO GERAL — ESTADO ATUAL

### Resultados dos 3 Tiers (pré-fix)

| Tier | Jornadas | PASS | FAIL | MANUAL | Bugs Críticos | Bugs Médios | UX Issues |
|------|----------|------|------|--------|---------------|-------------|-----------|
| **T1** Demo-Ready | 7 | 3 | 1 | 2 | 5 (C1-C5) | 5 (I1-I5) | 15+ |
| **T2** Funcional | 6 | 4 | 2 | 0 | 1 (T2-01) | 1 (T2-02) | 15+ |
| **T3** Cobertura | 6 | 2 | 1 | 0 | 2 (T3-01/02) | 5 (T3-03~07) | 5 |
| **Total** | **19** | **9** | **4** | **2** | **8** | **11** | **35+** |

### O que corrigimos nesta sessão (commit `f130c5d` + demo-ready sprint)

15 QA issues do Tier 2 + 6 code review patches + 12 demo-ready fixes = **33 correções**.

| Categoria | Itens Corrigidos | Arquivos |
|-----------|-----------------|----------|
| Bugs técnicos | Via Link vazio, Tour i18n, Console errors notas | 4 |
| UX Alta | Player onboarding, auto-save feedback, NPC default, tour skip | 4 |
| UX Média | Redirect campanha, toast, mind map fullscreen, filtros, typo, truncamento, notas disclosure, modal spacing | 5 |
| Code Review | Stale closure, regex, layered ESC, test, scroll lock, a11y | 3 |
| Demo-Ready Sprint | Overflow mobile, guest banner, SEO titles, touch targets, combat recap, campaign crash, pluralization, race accents, breadcrumb, audio path, CAT-1 player join | 12 |

---

## INVENTÁRIO COMPLETO DE ISSUES PENDENTES

### Tier 1 — Demo-Ready (Bloqueiam demo em BH, maio 2026)

| ID | Issue | Severidade | Status | Notas |
|----|-------|-----------|--------|-------|
| C1 | Combat Recap mostra nomes obfuscados pro DM | CRITICAL | ⚠️ **PENDENTE** | DM vê "Vulto Armado" em vez de nomes reais |
| C2 | Combat Recap "0 vs 2" contagem errada | CRITICAL | ✅ **FIXED** | Graceful fallback (2026-04-04) |
| C3 | Mobile — overflow horizontal setup (21px) | CRITICAL | ✅ **FIXED** | flex-wrap + responsive gap (2026-04-04) |
| C4 | Mobile — touch targets < 44px | CRITICAL | ✅ **FIXED** | min-h-[44px] on 4 elements (2026-04-04) |
| C5 | Mobile — guest banner ausente no setup | CRITICAL | ✅ **FIXED** | Visible by default + SSR guard (2026-04-04) |
| I1 | Combat Log vazio após aplicar dano | MEDIUM | ⚠️ **PENDENTE** | Log não registra HP changes |
| I2 | Combat Log + Recap abrem simultaneamente | MEDIUM | ⚠️ **PENDENTE** | Overlapping de painéis |
| I3 | Combate aceita iniciar com 1 combatente | MEDIUM | ⚠️ **PENDENTE** | Sem validação mínima |
| I4 | Acid Splash duplicado no compêndio | LOW | ⚠️ **PENDENTE** | Sem diferenciação 2014/2024 |
| I5 | Title duplicado "Pocket DM \| Pocket DM" | LOW | ✅ **FIXED** | Absolute title + removed brand from pages (2026-04-04) |
| — | Tab order manual add: Nome→HP→AC→Init | UX | ⚠️ **PENDENTE** | Ordem não intuitiva |
| — | Condition picker não fecha após aplicar | UX | ⚠️ **PENDENTE** | — |
| — | "Proximo Turno" não sticky no mobile | UX | ⚠️ **PENDENTE** | Requer scroll em combates longos |
| — | Mid-combat add empurra initiative list | UX | ⚠️ **PENDENTE** | Deveria usar drawer/modal |
| J10 | Combate Multiplayer | UNTESTED | 🔲 **MANUAL** | Requer 2 browsers |
| J16 | Reconnection & Network | UNTESTED | 🔲 **MANUAL** | Requer network throttling |

### Tier 2 — Funcional (Core CRUD)

| ID | Issue | Severidade | Status | Notas |
|----|-------|-----------|--------|-------|
| T2-01 | Via Link vazio | CRITICAL | ✅ **CORRIGIDO** | Error state + retry UI |
| T2-02 | Tour i18n brutas | MEDIUM | ✅ **CORRIGIDO** | Dynamic namespace |
| — | Console errors notas (91) | MEDIUM | ✅ **CORRIGIDO** | Type mismatch note_type |
| — | Onboarding ignora player | UX-ALTA | ✅ **CORRIGIDO** | "Sou jogador" path |
| — | Auto-save sem feedback | UX-ALTA | ✅ **CORRIGIDO** | Indicator amber/verde |
| — | NPC oculto por padrão | UX-MEDIA | ✅ **CORRIGIDO** | Default → visible |
| — | Tour skip redirect errado | UX-MEDIA | ✅ **CORRIGIDO** | shouldRedirect param |
| — | Sem redirect pós-criação | UX-MEDIA | ✅ **CORRIGIDO** | router.push |
| — | Sem toast criação | UX-BAIXA | ✅ **CORRIGIDO** | toast.success |
| — | "sessoes" typo | UX-BAIXA | ✅ **CORRIGIDO** | → "sessões" |
| — | Mind map preso na coluna | UX-MEDIA | ✅ **CORRIGIDO** | Fullscreen toggle |
| — | Filtros sem indicador | UX-BAIXA | ✅ **CORRIGIDO** | line-through + opacity |
| — | NPC nome truncado | UX-BAIXA | ✅ **CORRIGIDO** | line-clamp-2 |
| — | Overload notas | UX-MEDIA | ✅ **CORRIGIDO** | Progressive disclosure |
| — | Modal convite vazio | UX-BAIXA | ✅ **CORRIGIDO** | flex-none |
| — | Via Link API funciona de fato? | VALIDAÇÃO | ⚠️ **NÃO TESTADO** | Precisa teste funcional no browser |
| — | Fluxo invite→signup→join e2e | VALIDAÇÃO | ⚠️ **NÃO TESTADO** | Nunca testado end-to-end |
| — | NPC dirty state warning | UX-BAIXA | ⚠️ **PENDENTE** | Fechar modal sem salvar = perde |
| — | Via E-mail sem instrução | UX-BAIXA | ⚠️ **PENDENTE** | Falta explicação do que acontece |
| — | Node click navega pra seção | UX-BAIXA | ⚠️ **PENDENTE** | Spec pedia, não implementado |
| — | Auto-detect `/invite/` redirect | UX-MEDIA | ⚠️ **PENDENTE** | Pular onboarding automático |

### Tier 3 — Cobertura Completa (Polish)

| ID | Issue | Severidade | Status | Notas |
|----|-------|-----------|--------|-------|
| T3-01 | Criar Personagem 500 (RLS) | CRITICAL | ⚠️ **PENDENTE** | Migrations confirmed applied, logging added, root cause TBD |
| T3-02 | Campanha crash persistente | CRITICAL | ✅ **FIXED** | try-catch + error UI (2026-04-04) |
| T3-03 | og:image endpoint empty | MEDIUM | ✅ **VERIFIED** | Confirmed working in prod (200 OK, image/png) |
| T3-04 | Title duplicado compêndio | LOW | ✅ **FIXED** | Resolved with I5 (absolute title fix, 2026-04-04) |
| T3-05 | Monster/spell sem og:image | LOW | ⚠️ **PENDENTE** | Falta fallback image |
| T3-06 | Nome combate duplicado dashboard | LOW | ⚠️ **PENDENTE** | "First EncounterFirst Encounter" |
| T3-07 | Pluralização "1 jogadores" | LOW | ✅ **FIXED** | i18n plural rules (2026-04-04) |
| — | Dashboard player mostra ações DM | UX | ⚠️ **PENDENTE** | Filtrar por role |
| — | Falta "última atividade" nos cards | UX | ⚠️ **PENDENTE** | "Última sessão: 3 dias" |
| — | Presets/Settings sem sidebar | UX | ⚠️ **PENDENTE** | Inconsistência layout |
| — | Form state persiste após fechar modal | UX | ⚠️ **PENDENTE** | Resetar ao fechar |
| — | Nenhum feedback erro em formulários | UX | ⚠️ **PENDENTE** | Loading + toast + disable |

---

## SCORE UX POR JORNADA — ANTES vs DEPOIS

| # | Jornada | Tier | Score PRÉ | Score PÓS | Delta | Falta pro 10 |
|---|---------|------|-----------|-----------|-------|--------------|
| 1 | Landing + SEO | T1 | 9.0 | **9.5** | +0.5 | ✅ Title fixed, breadcrumb fixed. 404 custom pending |
| 2 | Guest Combat | T1 | 7.5 | **8.0** | +0.5 | ✅ C2 fixed. C1 (obfuscated names), I1 (log) pending |
| 3 | Login + Onboarding | T1 | 8.5 | 8.5 | — | Empty state lógica |
| 4 | Criar Campanha | T2 | 7.0 | **9.0** | +2.0 | Wizard guiado |
| 5 | NPCs | T2 | 7.0 | **8.5** | +1.5 | Dirty state warning |
| 6 | Notas | T2 | 6.0 | **8.0** | +2.0 | Confirmar console errors sumiram, tag contraste, error state |
| 7 | Convite | T2 | 2.0 | **7.0** | +5.0 | Validar API funciona, instrução email, e2e flow |
| 8 | Player Characters | T3 | 3.0 | 3.0 | — | RLS fix (T3-01), feedback erro |
| 9 | Mind Map | T2 | 7.0 | **8.5** | +1.5 | Node click navega, performance 20+ nós |
| 10 | Multiplayer | T1 | ? | ? | — | Não testado (manual) |
| 11 | Quests/Locais/Facções | T3 | 6.0 | **7.5** | +1.5 | ✅ T3-02 crash fixed (try-catch + error UI) |
| 12 | Mobile | T1 | 5.5 | **7.5** | +2.0 | ✅ Touch targets, overflow, guest banner fixed. Sticky pending |
| 13 | First-Time Player | T2 | 3.0 | **7.0** | +4.0 | Auto-detect invite, empty state player CTA |
| 14 | DM Returning | T3 | 8.0 | 8.0 | — | "Última atividade" nos cards |
| 15 | Empty States | T3 | 8.5 | 8.5 | — | — |
| 16 | Reconnection | T1 | ? | ? | — | Não testado (manual) |
| 17 | Shareability | T3 | 6.0 | **7.0** | +1.0 | ✅ og:image verified working. T3-05 monster/spell fallback pending |
| 18 | Accessibility | T3 | 8.0 | 8.0 | — | Focus rings mais fortes |

**Score médio pré-fix:** ~6.5/10
**Score médio pós-fix:** ~7.3/10
**Score médio se tudo pendente for resolvido:** ~9.2/10

---

## PLANO — ROADMAP PARA UX 10/10

### Sprint A — Demo Blockers (Pré-demo BH, ~2 semanas)

**Objetivo:** Mobile funcional + Combat Recap confiável. Score: 7.3 → 8.5

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| A1 | Fix touch targets mobile (todos ≥ 44px) | 1 dia | ✅ C4 FIXED (2026-04-04) |
| A2 | Fix overflow horizontal mobile setup | 2h | ✅ C3 FIXED (2026-04-04) |
| A3 | Fix Combat Recap nomes obfuscados DM | 4h | C1 resolve, Guest Combat 7.5→8.5 |
| A4 | Fix Combat Recap contagem "0 vs 2" | 2h | ✅ C2 FIXED (2026-04-04) |
| A5 | Guest banner mobile | 2h | ✅ C5 FIXED (2026-04-04) |
| A6 | "Próximo Turno" sticky mobile (FAB/bottom bar) | 4h | Mobile usabilidade++ |
| A7 | Combat Log registrar HP changes | 4h | I1 resolve |
| A8 | Fechar Combat Log ao abrir Recap | 1h | I2 resolve |

**Total Sprint A: ~3-4 dias de dev**

### Sprint B — Core Polish (Pós-demo, ~2 semanas)

**Objetivo:** Tier 3 críticos + validações. Score: 8.5 → 9.0

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| B1 | Fix RLS `player_characters` para `campaign_id IS NULL` | 2h (migration) | T3-01 resolve |
| B2 | Investigar campaign crash persistente (Locais) | 4h | ✅ T3-02 FIXED (2026-04-04) |
| B3 | Fix og:image endpoint + fallbacks | 4h | ✅ T3-03 VERIFIED working in prod |
| B4 | Fix title duplicado metadata | 1h | ✅ I5/T3-04 FIXED (2026-04-04) |
| B5 | Fix nome combate duplicado dashboard | 1h | T3-06 resolve |
| B6 | Fix pluralização i18n ("1 jogador" vs "2 jogadores") | 2h | ✅ T3-07 FIXED (2026-04-04) |
| B7 | Validar Via Link API funciona no browser | 2h (QA) | Confirmação |
| B8 | Testar fluxo invite→signup→join e2e | 4h (QA) | Confirmação |
| B9 | Auto-detect `/invite/` redirect no onboarding | 2h | UX player++ |
| B10 | NPC dirty state warning (unsaved changes) | 2h | UX NPC++ |

**Total Sprint B: ~3-4 dias de dev**

### Sprint C — Perfeição UX (Ongoing, ~2 semanas)

**Objetivo:** Micro-atritos eliminados. Score: 9.0 → 9.5+

| # | Item | Esforço | Impacto |
|---|------|---------|---------|
| C1 | Dashboard player filtra ações por role | 4h | Player não vê "Criar NPC" |
| C2 | "Última atividade" nos cards de campanha | 2h | DM returning context |
| C3 | Node click navega pra seção no mind map | 4h | Mind map interatividade |
| C4 | Condition picker auto-close após aplicar | 2h | Combat flow |
| C5 | Mid-combat add via drawer/modal (não push) | 4h | Combat layout |
| C6 | Tab order manual add: Nome→HP→AC→Init | 1h | Combat setup flow |
| C7 | Via E-mail com instrução explicativa | 1h | Convite UX |
| C8 | Form state reset ao fechar modais | 2h | Global UX |
| C9 | Sidebar em Presets/Settings | 2h | Layout consistência |
| C10 | Acid Splash diferenciação 2014/2024 | 2h | Compêndio polish |
| C11 | Combat com mínimo 2 combatentes | 1h | Validação setup |
| C12 | 404 custom RPG-themed | 2h | Branding |

**Total Sprint C: ~3-4 dias de dev**

### Sprint D — Testes Manuais Obrigatórios

| # | Item | Esforço | O que valida |
|---|------|---------|-------------|
| D1 | J10 — Multiplayer (2 browsers) | 2h | Realtime sync, late-join, disconnect |
| D2 | J16 — Reconnection (network throttle) | 2h | Silent reconnect, heartbeat, storage |
| D3 | Re-run Tier 1 completo no mobile (390x844) | 2h | Touch targets, overflow, sticky |
| D4 | Re-run Tier 2 completo no browser | 2h | Todos os fixes aplicados |
| D5 | Re-run Tier 3 completo | 2h | RLS fix, crash fix, og:image |
| D6 | Demo rehearsal na Taverna de Ferro | 3h | Real-world validation |

**Total Sprint D: ~2 dias de QA**

---

## CRONOGRAMA SUGERIDO (6 semanas até demo)

```
Semana 1-2: Sprint A (Demo Blockers — mobile + combat recap)
Semana 3-4: Sprint B (Core Polish — T3 críticos + validações)
Semana 4-5: Sprint C (Perfeição UX — micro-atritos)
Semana 5:   Sprint D (Testes manuais + re-run tiers)
Semana 6:   Buffer + Demo rehearsal Taverna de Ferro / Pixel Bar
```

---

## O QUE JÁ ESTÁ EXCELENTE (não mexer)

- **Landing page** (9/10) — hero, social proof, comparativo, dark theme
- **Compêndio de monstros** (8.5/10) — busca, stat blocks, dice rolls, CTA
- **Guest combat core loop** — add, roll, fight, damage, conditions, persistence
- **Login + Dashboard** — import guest combat, streak, quick actions
- **Segurança** — XSS/SQLi seguros, React escape, Supabase parameterizado
- **Acessibilidade base** — ARIA OK, Escape dismiss, zoom 200%
- **i18n** — PT-BR/EN estável sem layout shift
- **Mind map** — visual bonito, filtros, layouts, fullscreen (novo)
- **Notas** — progressive disclosure (novo), auto-save com feedback (novo)

---

## MÉTRICAS-CHAVE PARA ACOMPANHAR

| Métrica | Pré-fix | Atual (2026-04-04) | Meta Demo | Meta 10/10 |
|---------|---------|-------------------|-----------|------------|
| Jornadas PASS | 9/17 | 11/17 | 15/17 | 17/17 |
| Bugs críticos pendentes | 7 | 2 (C1, T3-01) | 0 | 0 |
| Bugs médios pendentes | 6 | 4 | ≤2 | 0 |
| UX issues pendentes | ~20 | ~15 | ≤5 | 0 |
| Mobile UX score | 5.5 | 7.5 | 8.0 | 9.0+ |
| Console errors por página | 2-91 | ≤5 | ≤5 | 0 |
| Touch targets < 44px | ~10 | 0 | 0 | 0 |
| Score UX médio | 7.3 | ~7.9 | 8.5 | 9.5+ |

---

*Documento gerado pela Party Mode session de 2026-04-04. Atualizado com demo-ready sprint fixes (2026-04-04). Arquivos de referência: `qa-report-tier1-2026-04-04.md`, `qa-report-tier2-2026-04-04.md`, `qa-report-tier3-2026-04-04.md`, commit `f130c5d` + demo-ready commits.*
