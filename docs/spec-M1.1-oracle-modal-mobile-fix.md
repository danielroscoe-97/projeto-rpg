# Spec M1.1 — Fix Oracle Modal Dismiss no Mobile

**Sprint:** M1 — Critical Fix + Quick Wins
**Tipo:** Bug P0
**Esforço estimado:** 2h
**Componentes:** `OracleAIModal.tsx`, `CommandPalette.tsx`

---

## Problema

No mobile, ao abrir o Oráculo (pergunta ao AI), o usuário não consegue fechar o modal. Clicar/tocar fora não funciona, e não há botão de fechar visível no mobile (o hint "ESC" é `hidden md:inline-flex`).

## Root Cause

1. O `OracleAIModal` não tem botão de fechar visível em viewports < `md` (768px)
2. O backdrop (`z-[10001]`) recebe `onClick={handleDismiss}`, mas o modal content container (`z-[10002]`) ocupa a maior parte da viewport mobile, deixando área de backdrop insuficiente para tap
3. Sem ESC key no mobile, o usuário fica preso

## Solução

### 1. Adicionar botão "✕" no header do modal (mobile + desktop)

**Em `OracleAIModal.tsx`:**
- Adicionar `<button>` com ícone X (Lucide `X` icon) no top-right do modal container
- Visível sempre, mas especialmente importante no mobile
- `onClick={handleDismiss}` (fecha sem limpar query — consistente com backdrop)
- Touch target: `min-w-[44px] min-h-[44px]` (acessibilidade mobile)

### 2. Garantir backdrop tap funciona no mobile

- Verificar se não há `pointer-events: none` ou `touch-action: none` no backdrop
- O backdrop deve ter `cursor-pointer` para feedback visual
- Testar com teclado virtual aberto e fechado

### 3. Aplicar mesmo fix no CommandPalette

O `CommandPalette.tsx` tem o mesmo padrão — ESC hint hidden no mobile. Aplicar botão X consistente.

## Critérios de Aceite

- [ ] Ao tocar no "✕", o modal fecha no mobile (iOS Safari + Chrome Android)
- [ ] Ao tocar no backdrop (área escura), o modal fecha
- [ ] A query é preservada ao fechar (soft dismiss)
- [ ] Ao reabrir, a resposta anterior ainda está lá
- [ ] No desktop, botão X aparece mas ESC continua funcionando
- [ ] CommandPalette tem o mesmo comportamento
- [ ] Touch target >= 44x44px

## Arquivos a modificar

1. `components/oracle/OracleAIModal.tsx` — adicionar close button
2. `components/oracle/CommandPalette.tsx` — adicionar close button
3. (Opcional) `components/ui/dialog.tsx` — verificar se Dialog wrapper precisa de fix similar

## Testes

- E2E: testar open/close do oracle no viewport mobile (393x851)
- Manual: testar em dispositivo real (Safari iOS + Chrome Android)
