# Story Dependency Map — projeto-rpg
**Autor:** Winston 🏗️ Architect + Agente 4 (reconciliação)
**Atualizado:** 2026-03-24
**Propósito:** Guia completo de dependências e ordem de construção para 4 agentes dev em paralelo.

---

## Estado Real do Projeto

> Sprint-status.yaml e story files foram reconciliados e estão corretos.

```
EPIC 1 ── Project Foundation & DM Authentication ──────── ⚠️ EM PROGRESSO
  ✅ 1-1  Initialize project with starter template
  ✅ 1-2  Database schema and RLS policies
  🔍 1-3  SRD content seeding & static bundle generation   ← aguardando CR
  🔍 1-4  DM registration and login                        ← aguardando CR
  🔍 1-5  Legal pages, attribution and privacy policy      ← aguardando CR

EPIC 2 ── Campaign & Player Group Management ──────────── ✅ COMPLETO

EPIC 3 ── Combat Tracker Core ─────────────────────────── ✅ COMPLETO

EPIC 4 ── Rules Oracle (Spells, Monsters, Conditions) ─── ✅ COMPLETO

EPIC 5 ── Real-Time Player View & Session Sharing ─────── ✅ COMPLETO

EPIC 6 ── Admin Panel & Content Management ────────────── ✅ COMPLETO

EPIC 7 ── Performance, Accessibility & Production ─────── ⚠️ EM PROGRESSO
  ✅ 7-1  Performance optimization and web vitals
  🔍 7-2  Accessibility audit & WCAG 2.1 AA compliance    ← 5 patches aplicados (2,3,6 já ok; 1,4,5,7,8 aplicados agora)
  🔲 7-3  Load testing and scalability validation
  ✅ 7-4  Error tracking and monitoring setup
  ✅ 7-5  Security hardening and input validation
```

**Progresso total: ~95% completo** (40 de 42 stories done/em review)

---

## O Que Falta Construir

### Trabalho Imediato (sem bloqueadores)

| Story | Título | Status |
|-------|--------|--------|
| **7-2 patches** | 8 correções WCAG | ✅ Aplicados (P1–P8) |
| **7-3** | Load Testing & Scalability | 🔲 Único bloqueador restante |

### Code Reviews Pendentes (stories em `review`)

| Story | Aguardando CR | Evidência |
|-------|--------------|-----------|
| 1-3 | SRD Seeding | Commit `25466fc` — sem CR formal |
| 1-4 | DM Auth | Commit `6bead9f` — sem CR formal |
| 1-5 | Legal Pages | Commit `4ff74dc` — sem CR formal |

---

## Dependências Técnicas Restantes

### Epic 6 — Admin Panel ✅ COMPLETO

Todos os arquivos criados: `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/users/page.tsx`, `app/admin/content/monsters/page.tsx`, `app/admin/content/spells/page.tsx`.

### Epic 7 — Partes restantes

#### 7-2 Patches — ✅ TODOS APLICADOS

| # | Arquivo | Status |
|---|---------|--------|
| P1 | `components/session/CampaignLoader.tsx` | ✅ `<DialogTrigger asChild>` aplicado |
| P2 | `components/dashboard/PlayerCharacterManager.tsx:394` | ✅ já estava ok |
| P3 | `components/dashboard/PlayerCharacterManager.tsx:418` | ✅ já estava ok |
| P4 | `components/combat/InitiativeTracker.tsx` | ✅ `min-h-[44px]` + `type="button"` |
| P5 | `components/combat/CombatantRow.tsx` | ✅ `pct >= 0.5` (boundary fix) |
| P6 | `components/logout-button.tsx` | ✅ já estava ok |
| P7 | `components/session/CampaignLoader.tsx` | ✅ `loadingCampaignId` reset on close |
| P8 | `components/combat/CombatantRow.test.tsx` | ✅ testes `max_hp === 0` + boundary 50% |

#### 7-4 Error Tracking ✅ COMPLETO

#### 7-5 Security Hardening ✅ COMPLETO

#### 7-3 Load Testing

**Gate: precisa Epics 3 e 5 completos** — ambos ✅. Pode iniciar imediatamente.

---

## Trabalho Restante (Estado Atual)

| Tarefa | Status |
|--------|--------|
| Code Reviews 1-3, 1-4, 1-5 | 🔍 Pendente |
| Marcar epic-1 done | Aguarda CRs acima |
| Marcar 7-2 done | 🔍 Patches aplicados, awaiting test run |
| 7-3 Load Testing | 🔲 Gate final para produção |

---

## Checklist de Gate para Produção

```
[ ] 1-3, 1-4, 1-5 — code reviews executados e stories marcadas done
[ ] epic-1 → done
[x] 7-2 patches aplicados (P1–P8)
[ ] 7-2 → done (após npm test passar)
[x] Epic 6 completo (6-1 → 6-4) ✅
[x] 7-4 Sentry configurado ✅
[x] 7-5 Zod validation ✅
[ ] 7-3 Load Testing — 1.000 sessões concorrentes ≤500ms WebSocket latency
[ ] npm test — todos os testes passando
[ ] Lighthouse produção — FCP ≤1.5s, TTI ≤3s
[ ] WCAG 2.1 AA — auditoria manual keyboard-only confirmada
[ ] 🚀 PRODUÇÃO
```
