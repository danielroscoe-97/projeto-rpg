# Epic: Content Access Control — Controle de Acesso ao Compendio Completo

**Projeto:** Pocket DM
**Autor:** BMAD Team (PM + Architect + Analyst + Dev)
**Data:** 2026-04-03
**Status:** Aprovado
**Dependencia:** Infraestrutura admin ja implementada (`users.is_admin`, `/app/admin/layout.tsx`)

---

## 0. Estado Atual — O Que Ja Existe

### Infraestrutura ja pronta

| Componente | Status | Arquivos |
|---|---|---|
| `users.is_admin` boolean | Implementado | migration 001 |
| Admin layout com auth check | Implementado | `app/admin/layout.tsx` |
| Admin pages (metrics, users, content) | Implementado | `app/admin/` |
| Admin API routes com rate limiting | Implementado | `app/api/admin/` |
| `ExternalContentGate` modal | Implementado | `components/import/ExternalContentGate.tsx` |
| `useExtendedCompendium` hook (localStorage) | Implementado | `lib/hooks/use-extended-compendium.ts` |
| `useSrdContentFilter` hook | Implementado | `lib/hooks/use-srd-content-filter.ts` |
| Feature flags (`show_non_srd_content`, `extended_compendium`) | Implementado | `lib/feature-flags.ts` |
| Filtro source no MonsterBrowser (all/srd/complete/mad) | Implementado | `components/compendium/MonsterBrowser.tsx` |
| Dados SRD + MAD em JSONs publicos | Implementado | `public/srd/monsters-*.json` |

### Filtros de conteudo atuais

```
"all"      → SRD + MAD (default, esconde 5e.tools nao-SRD)
"srd"      → Apenas SRD oficial
"complete" → Tudo exceto MAD (inclui 5e.tools nao-SRD)
"mad"      → Apenas Monster A Day
```

### Problema

O filtro "Completo" (conteudo 5e.tools alem do SRD) esta disponivel para qualquer usuario, incluindo guests. O aceite e armazenado em `localStorage` sem audit trail. Nao ha controle sobre quem pode acessar esse conteudo nem registro formal de aceitacao.

---

## 1. Manifesto de Produto

> *"Conteudo aberto e pra todos. Conteudo curado e pra quem entende e aceita."*

O Pocket DM distribui livremente o conteudo SRD 5.1 e o Monster A Day (MAD) — ambos sao abertos e podem ser acessados ate no modo guest (`/try`). Porem, o compendio **Completo** (conteudo importado de fontes externas como 5e.tools) requer:

1. **Autenticacao** — apenas usuarios logados
2. **Aceite formal** — com timestamp, IP, user-agent (assinatura digital)
3. **OU whitelist** — beta testers selecionados pelo admin, que pulam o modal completamente

### Principios

- **SRD + MAD = aberto pra todos** — inclusive guest e anonimo
- **Completo = gated** — requer login + aceite OU whitelist
- **Audit trail obrigatorio** — todo aceite e rastreavel
- **Admin whitelist com bypass total** — beta tester nem ve o modal
- **Revogabilidade** — admin pode remover acesso a qualquer momento

---

## 2. Tiers de Conteudo

| Tier | Conteudo | Quem acessa | Mecanismo |
|---|---|---|---|
| **Open** | SRD 5.1 + Monster A Day (MAD) | Todos: Guest, Anon, Auth | Nenhum gate |
| **Gated** | Compendio Completo (5e.tools) | Auth + aceite formal | `content_agreements` table |
| **Whitelisted** | Compendio Completo (5e.tools) | Auth + whitelist admin | `content_whitelist` table (bypass total) |

### Matriz de acesso por modo

| Modo | Rota | SRD | MAD | Completo |
|---|---|---|---|---|
| Guest | `/try` | Sim | Sim | Nao |
| Anonimo | `/join/[token]` | Sim | Sim | Nao |
| Autenticado (sem aceite) | `/app/compendium` | Sim | Sim | Nao (ve gate) |
| Autenticado (com aceite) | `/app/compendium` | Sim | Sim | Sim |
| Whitelisted (beta tester) | `/app/compendium` | Sim | Sim | Sim (sem gate) |

---

## 3. Arquitetura Tecnica

### 3.1 Tabela `content_whitelist`

```sql
CREATE TABLE content_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id)
);
```

**RLS:**
- SELECT: qualquer auth user (pra checar se esta na whitelist)
- INSERT/UPDATE/DELETE: apenas users com `is_admin = true`

### 3.2 Tabela `content_agreements`

```sql
CREATE TABLE content_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  agreement_version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, agreement_version)
);
```

**RLS:**
- SELECT: user pode ler seus proprios agreements
- INSERT: user pode criar seu proprio agreement
- DELETE: apenas admin (pra revogar se necessario)

### 3.3 Logica de acesso unificada

```
canSeeCompleteContent(user):
  if (!user.authenticated) → false
  if (content_whitelist.exists(user.id) && revoked_at IS NULL) → true
  if (content_agreements.exists(user.id, current_version)) → true
  return false
```

### 3.4 Refatoracao do hook

O `useExtendedCompendium` hoje usa `localStorage`. Sera refatorado para:
- Checar `content_whitelist` (bypass imediato)
- Checar `content_agreements` (aceite previo)
- Fallback: mostrar gate modal
- Manter cache client-side pra nao bater no DB a cada render

### 3.5 Versionamento de termos

O campo `agreement_version` permite invalidar aceites antigos se os termos mudarem. Ao incrementar a versao, usuarios que aceitaram versoes anteriores precisam aceitar novamente. Beta testers (whitelist) nao sao afetados.

---

## 4. Stories

| ID | Story | SP | Dependencia |
|---|---|---|---|
| **CAC-E1-F1** | Admin Whitelist — Tabela + UI de gerenciamento | 8 | Nenhuma |
| **CAC-E2-F2** | Content Agreements — Tabela + Gate com assinatura digital | 5 | Nenhuma |
| **CAC-E3-F3** | Compendium Access Refactor — Hook + bloqueio guest/anon | 5 | F1 + F2 |

**Total:** 18 SP

### Grafo de dependencias

```
F1 (whitelist table + admin UI) ─────┐
                                      ├──→ F3 (refactor hook + compendium)
F2 (agreements table + gate modal) ──┘
```

F1 e F2 podem ser desenvolvidas em paralelo. F3 depende de ambas.

---

## 5. Decisoes de Design

**D1: Whitelist com bypass total.** Beta tester nao ve modal, nao precisa aceitar nada. Acesso e imediato apos ser adicionado a whitelist. Motivo: friction zero para testers confiados.

**D2: Assinatura digital = user autenticado + timestamp + metadata.** Nao usamos PKI/certificado digital. O fato do user estar logado com sessao Supabase autenticada vincula a identidade. Timestamp + IP + user-agent formam o audit trail.

**D3: Soft delete na whitelist.** `revoked_at` em vez de DELETE. Permite historico de quem teve acesso e quando foi revogado.

**D4: localStorage como cache, nao como source of truth.** O hook pode cachear o resultado da query pra evitar chamadas repetidas, mas a source of truth e o Supabase.

**D5: Guest ve SRD + MAD, nao ve "Completo".** O filtro "Completo" aparece no compendium mas com indicador de lock. Guest e redirecionado pro login ao tentar ativar.

**D6: Admin UI dentro de `/app/admin/`.** Aproveita layout e protecao ja existentes. Nova page: `/app/admin/whitelist/page.tsx`.

**D7: Agreement version starts at 1.** Incrementar manualmente quando termos mudarem. Simples e suficiente.

---

## 6. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| User limpa cookies e perde cache local | Baixo | Source of truth e Supabase, hook re-valida no mount |
| Admin adiciona user errado a whitelist | Medio | Soft delete permite revogar; UI mostra confirmacao |
| Termos mudam e users precisam re-aceitar | Baixo | Incrementar `agreement_version`; whitelist nao afetada |
| Performance: query no Supabase a cada page load | Baixo | Cache client-side com TTL de 5min (mesmo padrao dos feature flags) |

---

## 7. Fora de Escopo (Bucket)

- Roles granulares (moderador, editor) — futuro se necessario
- UI de auto-servico pra solicitar acesso ao Completo
- Integracao com planos de assinatura (monetizacao)
- Gate para spells separado de monsters (mesmo gate cobre tudo)
- Whitelist por conteudo especifico (ex: so Monster Manual) — hoje e tudo ou nada
