# CAC-E1-F1 — Admin Whitelist: Tabela + UI de Gerenciamento

**Epic:** Content Access Control (`docs/epic-content-access-control.md`)
**Prioridade:** Alta
**Estimativa:** 8 SP
**Dependencia:** Nenhuma (infraestrutura admin ja existe)
**Arquivos principais:** `supabase/migrations/058_content_whitelist.sql` (novo), `app/admin/whitelist/page.tsx` (novo), `components/admin/WhitelistManager.tsx` (novo), `lib/supabase/content-whitelist.ts` (novo), `app/api/admin/whitelist/route.ts` (novo)

---

## Resumo

Cria a tabela `content_whitelist` no Supabase e uma UI admin em `/app/admin/whitelist` para o admin adicionar e remover beta testers que terao acesso ao compendio Completo sem passar pelo modal de aceite.

O beta tester adicionado a whitelist tem bypass total — nao ve gate, nao precisa aceitar termos. Acesso e imediato.

---

## Decisoes de UX

**D1: Page dentro do admin existente.** Nova rota `/app/admin/whitelist` seguindo o padrao visual das paginas admin existentes (metrics, users, content). Link no menu lateral do admin.

**D2: Lista de testers como tabela compacta.** Colunas: Email | Display Name | Adicionado em | Adicionado por | Acoes. Ordenada por data de adicao (mais recente primeiro). Testers revogados aparecem em secao separada "Revogados" com texto muted + strikethrough.

**D3: Adicionar tester por email.** Campo de busca no topo que busca users existentes por email ou display_name. Autocomplete com debounce (300ms). Ao selecionar, clica "Adicionar" e o user e imediatamente whitelisted.

**D4: Remover tester com confirmacao.** Botao de revogacao no card/row do tester. Dialog de confirmacao: "Remover [nome] da whitelist? O usuario precisara aceitar os termos para acessar o compendio completo novamente." Usa soft delete (`revoked_at`).

**D5: Contador no header.** "Whitelist (X testers ativos)" no titulo da pagina.

**D6: Empty state.** Quando nao ha testers: ilustracao minimalista + "Nenhum beta tester adicionado. Use o campo acima para adicionar usuarios."

---

## Contexto Tecnico

### Migration 058: content_whitelist

```sql
-- 058_content_whitelist.sql

CREATE TABLE content_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(user_id)
);

-- Indices
CREATE INDEX idx_content_whitelist_user ON content_whitelist(user_id) WHERE revoked_at IS NULL;

-- RLS
ALTER TABLE content_whitelist ENABLE ROW LEVEL SECURITY;

-- Qualquer user autenticado pode checar se esta na whitelist
CREATE POLICY "Users can check own whitelist status"
  ON content_whitelist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin pode ver todos
CREATE POLICY "Admins can view all whitelist entries"
  ON content_whitelist FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin pode inserir
CREATE POLICY "Admins can add to whitelist"
  ON content_whitelist FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin pode atualizar (soft delete via revoked_at)
CREATE POLICY "Admins can update whitelist"
  ON content_whitelist FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true)
  );
```

### API Route: `/app/api/admin/whitelist/route.ts`

```typescript
// GET — lista todos os testers (ativos + revogados)
// POST — adiciona user a whitelist { user_id, notes? }
// PATCH — revoga tester { id, revoked_at: now() }
```

Seguir padrao das rotas admin existentes: rate limiting, check `is_admin`, error handling.

### Lib: `lib/supabase/content-whitelist.ts`

```typescript
export async function getWhitelistEntries(): Promise<WhitelistEntry[]>
export async function addToWhitelist(userId: string, notes?: string): Promise<void>
export async function revokeFromWhitelist(entryId: string): Promise<void>
export async function isUserWhitelisted(userId: string): Promise<boolean>
```

### Component: `components/admin/WhitelistManager.tsx`

Componente principal da page. Contem:
- Campo de busca de users (reutilizar padrao do admin/users se existir)
- Tabela de testers ativos
- Secao colapsavel de testers revogados
- Dialogs de confirmacao

---

## Acceptance Criteria

### AC-1: Migration cria tabela com RLS
- [ ] Tabela `content_whitelist` criada com schema correto
- [ ] RLS habilitado com policies para user check + admin CRUD
- [ ] Index parcial em `user_id WHERE revoked_at IS NULL`

### AC-2: Admin pode listar testers
- [ ] Page `/app/admin/whitelist` acessivel apenas por admin
- [ ] Lista mostra email, display_name, granted_at, granted_by
- [ ] Testers ativos e revogados em secoes separadas
- [ ] Contador de testers ativos no header

### AC-3: Admin pode adicionar tester
- [ ] Campo de busca com autocomplete de users existentes
- [ ] Ao adicionar, `granted_by` e populado com o admin atual
- [ ] Toast de confirmacao: "[Nome] adicionado a whitelist"
- [ ] User duplicado mostra erro amigavel

### AC-4: Admin pode revogar tester
- [ ] Botao de revogacao com dialog de confirmacao
- [ ] Soft delete: `revoked_at` preenchido, entry movida pra secao "Revogados"
- [ ] Toast: "[Nome] removido da whitelist"

### AC-5: Funcao de check reutilizavel
- [ ] `isUserWhitelisted(userId)` retorna boolean
- [ ] Checa `revoked_at IS NULL`
- [ ] Sera consumida pelo hook refatorado na F3

---

## Testes

### Manuais
- Admin acessa `/app/admin/whitelist` e ve lista vazia
- Admin busca user por email, adiciona, ve na lista
- Admin revoga tester, ve movido pra secao "Revogados"
- User nao-admin tenta acessar `/app/admin/whitelist` → redirect
- Adicionar user que ja esta na whitelist → erro amigavel

### Automatizados (se aplicavel)
- RLS: user nao-admin nao pode INSERT/UPDATE na `content_whitelist`
- RLS: user pode SELECT seu proprio registro
- API: POST sem `is_admin` retorna 403
- API: PATCH com id inexistente retorna 404
