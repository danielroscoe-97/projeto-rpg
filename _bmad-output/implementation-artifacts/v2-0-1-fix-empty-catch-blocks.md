# Story 0.1: Fix Empty Catch Blocks

Status: review

## Story

As a **developer**,
I want to replace empty catch blocks with proper error handling and user feedback,
so that users see meaningful error messages instead of silent failures, and errors are tracked in Sentry.

## Acceptance Criteria

1. **PlayerLobby.tsx:64** — O catch block vazio no `handleSubmit` deve exibir feedback de erro ao jogador e logar no Sentry
2. **OracleAIModal.tsx:150** — O catch block para SSE malformado deve logar `console.warn` para debugging (skip intencional, mas silencioso demais)
3. Zero catch blocks completamente vazios no codebase após esta story
4. Sentry recebe exceções com contexto (component name, session info)
5. Usuário recebe feedback visual quando uma ação falha

## Tasks / Subtasks

- [x] Task 1: Instalar shadcn/ui toast component (AC: #1, #5)
  - [x] Executar `npx shadcn@latest add sonner` para instalar o componente de toast
  - [x] Verificar que `<Toaster />` está no root layout (`app/layout.tsx`)
  - [x] Se já existir outro toast provider, usar o existente em vez de adicionar duplicado

- [x] Task 2: Fix PlayerLobby.tsx catch block (AC: #1, #4, #5)
  - [x] Importar `* as Sentry` de `@sentry/nextjs` e `toast` de `sonner`
  - [x] No catch block (linha 64): capturar erro, mostrar toast de erro, logar no Sentry
  - [x] Manter o `setIsSubmitting(false)` existente
  - [x] Usar mensagem i18n: `t('registerError')` (key adicionada em pt-BR.json e en.json)

- [x] Task 3: Fix OracleAIModal.tsx catch block (AC: #2)
  - [x] No catch block da linha 150 (dentro do loop SSE): adicionar `console.warn('[OracleAI] Malformed SSE chunk skipped:', data)`
  - [x] NÃO adicionar toast aqui — chunks malformados são esperados em streaming SSE
  - [x] NÃO modificar o catch da linha 155 — já está correto (trata AbortError + setError)

- [x] Task 4: Varredura de catch blocks vazios no codebase (AC: #3)
  - [x] Buscar com `grep -rn "catch\s*{" --include="*.tsx" --include="*.ts"` (excluir node_modules)
  - [x] Para cada catch vazio encontrado: adicionar tratamento adequado ou `console.warn` com contexto
  - [x] Documentar no PR quais catches eram vazios e o que foi adicionado

## Dev Notes

### Padrão de Error Handling do Projeto

O projeto usa este padrão para erros:
- **Sentry** para tracking server-side e client-side (já configurado em `sentry.client.config.ts` e `sentry.server.config.ts`)
- **Sentry NÃO está importado em nenhum componente .tsx** — apenas no global-error.tsx. Esta story será a primeira a usar `Sentry.captureException()` em componentes
- **Toast** para feedback ao usuário — tech-stack-libraries.md recomenda `sonner` via shadcn/ui
- **i18n** via `next-intl` com `useTranslations` — já em uso no PlayerLobby

### Estado Atual dos Arquivos

**`components/player/PlayerLobby.tsx`**
- Linha 64: `} catch { setIsSubmitting(false); }` — sem feedback, sem logging
- Imports atuais: `useState, useCallback` do React, `useTranslations` do next-intl, `Swords, Users` do lucide-react
- **Sentry NÃO importado** — precisa adicionar
- **Toast NÃO importado** — precisa instalar shadcn/sonner primeiro

**`components/oracle/OracleAIModal.tsx`**
- Linha 150: `} catch { // Skip malformed }` — dentro do loop SSE, INTENCIONAL mas sem logging
- Linha 155: `} catch (err) { if (err instanceof DOMException && err.name === "AbortError") return; setError(...); }` — CORRETO, não mexer
- Este componente já trata o error case principal (linha 155). Só falta logging no inner catch.

### Código Exato para Referência

**PlayerLobby.tsx — ANTES (linhas 55-66):**
```typescript
try {
  const hpVal = hp.trim() ? parseInt(hp, 10) : null;
  const acVal = ac.trim() ? parseInt(ac, 10) : null;
  await onRegister({
    name: trimmedName,
    initiative: initVal,
    hp: hpVal && !isNaN(hpVal) && hpVal > 0 ? hpVal : null,
    ac: acVal && !isNaN(acVal) && acVal > 0 ? acVal : null,
  });
} catch {
  setIsSubmitting(false);
}
```

**PlayerLobby.tsx — DEPOIS:**
```typescript
} catch (error) {
  setIsSubmitting(false);
  toast.error(t('player.registerError'));
  Sentry.captureException(error, {
    tags: { component: 'PlayerLobby', flow: 'player-registration' },
  });
}
```

**OracleAIModal.tsx — ANTES (linha 150):**
```typescript
} catch {
  // Skip malformed
}
```

**OracleAIModal.tsx — DEPOIS:**
```typescript
} catch {
  console.warn('[OracleAI] Malformed SSE chunk skipped:', data);
}
```

### Project Structure Notes

- Toast component: `components/ui/sonner.tsx` (gerado pelo shadcn CLI)
- Toaster provider: `app/layout.tsx` — adicionar `<Toaster />` se ainda não existir
- Sentry config: `sentry.client.config.ts` (já existe, DSN configurado)
- i18n messages: `messages/pt-BR.json` e `messages/en.json` — adicionar key `player.registerError`
- Naming convention: imports com `* as Sentry` (padrão Sentry Next.js)

### Riscos e Anti-Patterns

- **NÃO** adicionar toast no catch do SSE streaming (linha 150) — chunks malformados são normais
- **NÃO** modificar o catch da linha 155 do OracleAIModal — já está correto
- **NÃO** adicionar `Sentry.captureException` para chunks SSE malformados — seria spam de eventos
- **NÃO** usar `alert()` ou `window.confirm()` — usar sonner toast sempre
- **NÃO** criar novo componente de toast — usar shadcn/sonner

### References

- [Source: _bmad-output/implementation-artifacts/v2-epics-0-1-2-stories.md — Story 0.1]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 0]
- [Source: docs/tech-stack-libraries.md — shadcn/ui toast/sonner recommendation]
- [Source: _bmad-output/planning-artifacts/architecture.md — Error handling pattern]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Completion Notes List
- Task 1: sonner already installed (`components/ui/sonner.tsx`), `<Toaster richColors position="top-right" />` already in `app/layout.tsx`
- Task 2: Added `toast.error(t('registerError'))` + `Sentry.captureException()` with component/flow tags to PlayerLobby catch block. Added i18n keys to both locale files.
- Task 3: Replaced `// Skip malformed` with `console.warn('[OracleAI] Malformed SSE chunk skipped:', data)`. Did NOT touch outer catch (line 155).
- Task 4: Scanned all 40+ catch blocks in codebase. Only 2 were truly empty (PlayerLobby, OracleAI inner). All others have proper handling: error state setters, fallback returns, intentional silent catches for localStorage/storage/vibrate APIs, or contextual comments. No additional fixes needed.

### Change Log
- `components/player/PlayerLobby.tsx`: Added imports for `sonner` and `@sentry/nextjs`. Changed empty catch to capture error, show toast, log to Sentry.
- `components/oracle/OracleAIModal.tsx`: Added `console.warn` to SSE malformed chunk catch block.
- `messages/pt-BR.json`: Added `player.registerError` key.
- `messages/en.json`: Added `player.registerError` key.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: Updated story status to `review`.

### File List
- `components/player/PlayerLobby.tsx`
- `components/oracle/OracleAIModal.tsx`
- `messages/pt-BR.json`
- `messages/en.json`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/v2-0-1-fix-empty-catch-blocks.md`
