# Story A.0.4: Adicionar Regras ESLint para React Hooks e Segurança

Status: ready-for-dev

## Story

As a **developer**,
I want ESLint configured with react-hooks and security rules,
so that dependency array bugs and XSS vulnerabilities are caught at lint time.

## Acceptance Criteria

1. `eslint-plugin-react-hooks` enabled with `exhaustive-deps` as error
2. Security-focused rules added (no dangerouslySetInnerHTML without justification, no eval)
3. `eslint.config.mjs` updated with new rules
4. All existing violations fixed or explicitly suppressed with justification comment
5. `npm run lint` passes with zero errors
6. CI will catch future violations

## Tasks / Subtasks

- [ ] Task 1: Install ESLint plugins (AC: #1, #2)
  - [ ] `npm install -D eslint-plugin-react-hooks eslint-plugin-security`
- [ ] Task 2: Update eslint.config.mjs (AC: #3)
  - [ ] Add react-hooks/rules-of-hooks: error
  - [ ] Add react-hooks/exhaustive-deps: error
  - [ ] Add security rules
- [ ] Task 3: Fix violations (AC: #4)
  - [ ] Run lint, fix each violation
  - [ ] Add eslint-disable with justification where suppression is needed
- [ ] Task 4: Verify (AC: #5)
  - [ ] `npm run lint` passes

## Dev Notes

### Files to Modify/Create

- Modify: `eslint.config.mjs` — add plugins and rules
- Modify: `package.json` — new dev dependencies
- Modify: Various files with violations

### Anti-Patterns

- **DON'T** add eslint-disable without a comment explaining why
- **DON'T** set exhaustive-deps to "warn" — must be "error"
- **DON'T** add rules that conflict with Next.js patterns

### References

- [Source: _bmad-output/brainstorming/brainstorming-session-2026-03-27-radiografia-completa.md — DT-06]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### Change Log

### File List
