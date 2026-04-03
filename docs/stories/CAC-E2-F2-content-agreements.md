# CAC-E2-F2 — Content Agreements: Tabela + Gate com Assinatura Digital

**Epic:** Content Access Control (`docs/epic-content-access-control.md`)
**Prioridade:** Alta
**Estimativa:** 5 SP
**Dependencia:** Nenhuma (pode ser feita em paralelo com F1)
**Arquivos principais:** `supabase/migrations/059_content_agreements.sql` (novo), `components/import/ExternalContentGate.tsx` (modificar), `lib/supabase/content-agreements.ts` (novo), `app/api/content/agree/route.ts` (novo)

---

## Resumo

Cria a tabela `content_agreements` no Supabase e refatora o `ExternalContentGate` para gravar o aceite no banco com timestamp, IP e user-agent (assinatura digital), em vez de apenas `localStorage`.

O aceite e vinculado ao usuario autenticado e serve como audit trail legal. O `localStorage` passa a ser apenas cache local pra evitar queries repetidas.

---

## Decisoes de UX

**D1: Modal existente, fluxo melhorado.** O `ExternalContentGate` ja existe e funciona. A mudanca e no backend: ao clicar "Desbloquear", agora grava no Supabase em vez de so localStorage.

**D2: Loading state no botao.** Como agora ha uma chamada de API, o botao mostra spinner enquanto grava. Se falhar, toast de erro e permite retry.

**D3: Texto do aceite com versao.** O modal exibe o texto dos termos com referencia a versao atual (v1). Se a versao mudar no futuro, usuarios que aceitaram v1 verao o modal novamente.

**D4: Apenas logados veem o modal.** Guest e anonimo nao devem ver o `ExternalContentGate` — o filtro "Completo" estara bloqueado pra eles (implementado na F3). O modal so aparece pra auth users.

**D5: Indicador visual de aceite.** Apos aceitar, o filtro "Completo" funciona normalmente. Nao ha badge ou indicador extra — a experiencia e transparente.

---

## Contexto Tecnico

### Migration 059: content_agreements

```sql
-- 059_content_agreements.sql

CREATE TABLE content_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  agreement_version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, agreement_version)
);

-- Index
CREATE INDEX idx_content_agreements_user ON content_agreements(user_id);

-- RLS
ALTER TABLE content_agreements ENABLE ROW LEVEL SECURITY;

-- User pode ver seus proprios agreements
CREATE POLICY "Users can view own agreements"
  ON content_agreements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User pode criar seu proprio agreement
CREATE POLICY "Users can create own agreement"
  ON content_agreements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin pode ver todos (pra auditoria)
CREATE POLICY "Admins can view all agreements"
  ON content_agreements FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin pode deletar (revogar aceite se necessario)
CREATE POLICY "Admins can delete agreements"
  ON content_agreements FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
```

### API Route: `/app/api/content/agree/route.ts`

```typescript
// POST — grava aceite do usuario
// Body: { agreement_version: number }
// Extrai automaticamente:
//   - user_id: do session token
//   - ip_address: do request header (x-forwarded-for ou remoteAddress)
//   - user_agent: do request header
//   - agreed_at: server-side timestamp (nao confia no client)
//
// Retorna: { success: true, agreed_at: string }
// Erro 409 se ja existe agreement pra essa versao
```

**IMPORTANTE:** O timestamp e o IP sao capturados server-side pela API route, NAO pelo client. Isso garante integridade da assinatura.

### Lib: `lib/supabase/content-agreements.ts`

```typescript
export async function hasUserAgreed(userId: string, version?: number): Promise<boolean>
export async function getUserAgreement(userId: string): Promise<ContentAgreement | null>
export async function recordAgreement(version: number): Promise<ContentAgreement>
```

### Refatoracao do ExternalContentGate

```diff
// components/import/ExternalContentGate.tsx

- const { activate } = useExtendedCompendium();
+ const { activate } = useExtendedCompendium();
+ const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActivate = async () => {
+   setIsSubmitting(true);
+   try {
+     // Grava no Supabase via API route (captura IP + UA server-side)
+     await fetch("/api/content/agree", {
+       method: "POST",
+       headers: { "Content-Type": "application/json" },
+       body: JSON.stringify({ agreement_version: 1 }),
+     });
      activate(); // Atualiza cache local (localStorage)
      onOpenChange(false);
      toast.success(t("gate_success", { count: nonSrdCount }));
+   } catch {
+     toast.error(t("gate_error"));
+   } finally {
+     setIsSubmitting(false);
+   }
  };
```

### Constante de versao

```typescript
// lib/constants/content.ts
export const CURRENT_AGREEMENT_VERSION = 1;
```

Centralizar a versao permite incrementa-la em um unico lugar quando os termos mudarem.

---

## Acceptance Criteria

### AC-1: Migration cria tabela com RLS
- [ ] Tabela `content_agreements` criada com schema correto
- [ ] RLS habilitado: user le/cria seus proprios, admin le/deleta todos
- [ ] Constraint UNIQUE em `(user_id, agreement_version)`

### AC-2: API route grava aceite com assinatura
- [ ] POST `/api/content/agree` grava agreement no Supabase
- [ ] `agreed_at` e gerado server-side (nao pelo client)
- [ ] `ip_address` extraido de headers do request
- [ ] `user_agent` extraido de headers do request
- [ ] Retorna 409 se agreement ja existe pra essa versao
- [ ] Retorna 401 se user nao esta autenticado

### AC-3: ExternalContentGate grava no Supabase
- [ ] Ao clicar "Desbloquear", chama API route antes de ativar localStorage
- [ ] Botao mostra loading state durante a chamada
- [ ] Em caso de erro, toast de erro e permite retry
- [ ] Em caso de sucesso, ativa localStorage (cache) + fecha modal

### AC-4: Funcao de check reutilizavel
- [ ] `hasUserAgreed(userId)` retorna boolean
- [ ] Checa pela versao atual (`CURRENT_AGREEMENT_VERSION`)
- [ ] Sera consumida pelo hook refatorado na F3

### AC-5: Versao do agreement e centralizada
- [ ] `CURRENT_AGREEMENT_VERSION` definido em constante
- [ ] Modal exibe referencia a versao nos termos
- [ ] Se versao mudar, usuarios com versao antiga precisam re-aceitar

---

## Testes

### Manuais
- User logado abre compendio → clica "Completo" → ve gate modal
- Aceita termos → verifica no Supabase que agreement foi criado com IP + UA
- Fecha e reabre browser → compendio Completo ainda acessivel (cache + DB)
- Limpa localStorage → compendio Completo ainda acessivel (re-valida no DB)
- User tenta aceitar novamente (mesma versao) → 409 graceful (nao quebra UX)

### Automatizados (se aplicavel)
- RLS: user nao pode ler agreements de outros users
- RLS: user nao pode deletar seus proprios agreements
- API: POST sem auth retorna 401
- API: POST duplicado retorna 409
- API: campos `ip_address` e `user_agent` sao populados
