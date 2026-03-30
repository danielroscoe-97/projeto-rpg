# Quick Spec: RLS Battle-Testing

> **Prioridade:** P0 — Segurança de dados entre mesas/jogadores
> **Estimativa:** ~5h
> **Data:** 2026-03-30
> **Referência:** Roadmap H1.4, epic-campaign-dual-role-addendum.md

---

## Contexto

As migrations 025-039 adicionaram um sistema complexo de campaign membership com RLS policies, SECURITY DEFINER functions, e join codes. O addendum do dual-role identificou bugs de RLS recursion que foram corrigidos, mas a cobertura de testes de isolamento é insuficiente.

**Risco:** Bug de RLS = Player A vê dados de Player B, ou jogador vê HP numérico de monstros via query direta ao Supabase.

---

## Story 1: Testes de Isolamento por Role

**Test file:** `lib/supabase/__tests__/rls-isolation.test.ts`

**Cenários obrigatórios:**

### DM Isolation
```
- DM A cria campanha → DM B NÃO pode ver campanha de A
- DM A cria sessão → DM B NÃO pode listar sessões de A
- DM A adiciona combatant → DM B NÃO pode modificar combatants de A
- DM A cria preset → DM B NÃO pode ver presets de A
```

### Player Isolation
```
- Player com token de Session A NÃO pode acessar Session B
- Player NÃO pode ver dm_notes de qualquer combatant
- Player NÃO pode ver HP numérico de monstros (via select direto)
- Player NÃO pode modificar combatants (is read-only via RLS)
- Player NÃO pode ver player_characters de outra campanha
```

### Campaign Member Isolation
```
- Member de Campaign A NÃO pode ver Campaign B
- Member com role "player" NÃO pode criar sessão (só DM pode)
- Member pode ver player_characters da campanha (read-only)
- Member NÃO pode ver dm_notes dos player_characters
```

### Cross-Role (Dual-Role)
```
- User é DM em Campaign A e Player em Campaign B
- Como DM em A: pode criar sessões, ver tudo
- Como Player em B: só pode ver dados permitidos
- Dados de A e B são completamente isolados
```

**Implementação:**
- Usar Supabase client com diferentes auth contexts (service role para setup, user roles para verificação)
- Cada teste: setup com service client → verify com user client → assert 403 ou empty result
- Cleanup no afterEach

**AC:**
- [ ] 15+ cenários de isolamento testados
- [ ] Zero vazamento de dados cross-session
- [ ] Zero vazamento de dados cross-campaign
- [ ] dm_notes NUNCA acessível por non-owner
- [ ] HP numérico de monstros NUNCA acessível por player via RLS

---

## Story 2: Testes de SECURITY DEFINER Functions

**Problema:** `accept_campaign_invite()` usa SECURITY DEFINER (executa com permissões do criador, não do caller). Race conditions e edge cases precisam ser testados.

**Cenários:**

```
- Aceitar invite válido → membership criada, invite marcado como used
- Aceitar invite expirado (>7 dias) → erro, nenhuma mudança
- Aceitar invite já usado → erro, nenhuma mudança
- Dois users aceitam o mesmo invite simultaneamente → apenas 1 succeed (FOR UPDATE SKIP LOCKED)
- Aceitar invite para campanha que não existe mais → erro graceful
- Aceitar invite quando já é membro → erro, não duplica membership
- Aceitar invite com email diferente do registrado → erro (se invite tem email target)
```

**Implementação:**
- Testes contra Supabase local (`supabase start`)
- Usar `supabase.rpc('accept_campaign_invite', { ... })` diretamente
- Teste de concorrência: Promise.all com 2 chamadas simultâneas

**AC:**
- [ ] Todos os 7 cenários passam
- [ ] Race condition testada (concurrent accept)
- [ ] Nenhum estado inconsistente (partial membership, unused invite com member criado)

---

## Story 3: Testes de Broadcast Sanitization E2E

**Problema:** Os unit tests em `broadcast.test.ts` cobrem sanitização, mas não validam o fluxo completo DM→broadcast→player.

**Cenários:**

```
- DM atualiza HP de monstro → Player recebe hp_status (não current_hp)
- DM atualiza HP de PC → Player recebe current_hp (dados completos)
- DM adiciona combatant hidden → Player NÃO recebe broadcast
- DM revela combatant (is_hidden: false) → Player recebe combatant_add
- DM edita stats de monstro → Player recebe apenas display_name (não AC, DC)
- DM adiciona dm_notes → Player NÃO recebe dm_notes em nenhum evento
- State sync (reconnect) → Player recebe apenas combatants visíveis (hidden filtrados)
- State sync → Turn index ajustado para lista de visíveis (hidden skipped)
```

**Implementação:**
- Pode ser Playwright E2E (DM page + Player page, verificar DOM do player)
- Ou integration test com mock channel (mais rápido, menos coverage real)
- Recomendação: ambos — integration test rápido + 1 E2E smoke test

**AC:**
- [ ] 8 cenários de sanitização validados
- [ ] Nenhum dado sensível (current_hp monstro, AC, DC, dm_notes) chega ao player
- [ ] Hidden combatants são invisíveis para o player em todos os eventos

---

## Story 4: Audit Script de RLS Coverage

**Problema:** Difícil saber se todas as tabelas têm RLS habilitado e policies adequadas.

**Implementação:**

Criar script `scripts/audit-rls.ts`:
```typescript
// Conectar com service role
// Para cada tabela:
//   1. Verificar ALTER TABLE ... ENABLE ROW LEVEL SECURITY
//   2. Listar policies ativas
//   3. Verificar que existe policy para SELECT, INSERT, UPDATE, DELETE (conforme necessidade)
//   4. Reportar tabelas sem RLS ou com policies incompletas
```

Output esperado:
```
✅ users: RLS enabled, 3 policies (select-own, update-own, delete-own)
✅ campaigns: RLS enabled, 4 policies (owner-crud, member-read)
⚠️ homebrew: RLS enabled, 1 policy (select-own) — FALTA: insert, update, delete
❌ feature_flags: RLS NOT enabled — RISCO
```

**AC:**
- [ ] Script roda com `npx ts-node scripts/audit-rls.ts`
- [ ] Reporta qualquer tabela sem RLS ou com policies incompletas
- [ ] Zero tabelas com dados de usuário sem RLS habilitado
