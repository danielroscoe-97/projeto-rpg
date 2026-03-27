# UX Bugfix Sprint — 2026-03-27

**Objetivo:** Corrigir bugs visuais, de reatividade e de layering identificados por auditoria IA externa.
**Origem:** Relatório de Percepções e Melhorias gerado em 26/03/2026 por IA que escaneou a codebase e a aplicação ao vivo.
**Método:** Party Mode (multi-agent review) + implementação imediata de 5 stories.

---

## Contexto

Relatório externo identificou 7 issues. Após varredura da codebase:
- **1 já corrigida** (search flicker — debounce 200ms + guard `!isLoading`)
- **1 fora de escopo** (i18n do SRD — tech spec define SRD em inglês, só UI labels traduzidos)
- **5 pendentes** — implementadas neste sprint

---

## Stories Implementadas

### S1: Z-Index — Oráculo atrás dos Pinned Cards [CRÍTICO]

| Campo | Detalhe |
|-------|---------|
| **Bug** | Cards fixados (`z-index: 9999`) ficavam à frente do modal do Oráculo (`z-index: 60-61`), impedindo interação com a IA |
| **Root cause** | O Oráculo foi implementado antes do sistema de floating cards e usava z-index baixo |
| **Fix** | `z-[60]` → `z-[10001]` (backdrop), `z-[61]` → `z-[10002]` (modal content) |
| **Arquivo** | `components/oracle/OracleAIModal.tsx` linhas 188, 194 |
| **Hierarquia z-index resultante** | Base (0-1) → Dice/Tooltips (9990-9999) → Pinned Cards (9999) → Unpin Button (10000) → **Oráculo (10001-10002)** |

---

### S2: ConditionReference — Race Condition no SRD [CRÍTICO]

| Campo | Detalhe |
|-------|---------|
| **Bug** | Aba de Condições no Compêndio iniciava com 0 resultados. Dados carregavam mas componente não re-renderizava |
| **Root cause** | `ConditionReference.tsx` chamava `getConditionsByCategory()` de um singleton module-level (`srd-search.ts`) em vez de subscrever ao Zustand store. Como `initializeSrd()` é async e fire-and-forget no `SrdInitializer`, o componente renderizava antes dos dados existirem e nunca reagia à mudança |
| **Fix** | Removido import de `getConditionsByCategory`. Componente agora subscribe a `useSrdStore((s) => s.conditions)` e filtra via `useMemo` reativo |
| **Arquivo** | `components/compendium/ConditionReference.tsx` linhas 3-25 |
| **Impacto** | Condições, Doenças e Status agora aparecem imediatamente após o carregamento do SRD |

---

### S3: EncounterSetup — Desalinhamento de Colunas [MÉDIO]

| Campo | Detalhe |
|-------|---------|
| **Bug** | Headers (INIC, NOME, HP, CA) desalinhados com os campos de entrada porque rows com `MonsterToken` (32px / `w-8`) empurravam o campo Nome pra direita |
| **Root cause** | Header e add-row não tinham spacer compensando o espaço do token. Rows sem monster_id também não tinham spacer |
| **Fix** | Adicionado `<span className="w-8 flex-shrink-0" />` em 3 locais: header, add-row, e rows sem monster_id |
| **Arquivos** | `components/combat/EncounterSetup.tsx` linhas 506, 568 · `components/combat/CombatantSetupRow.tsx` linhas 101-111 |

---

### S4: Scrollbars — Estilização Dark/Gold [MÉDIO]

| Campo | Detalhe |
|-------|---------|
| **Bug** | Scrollbars nativas do browser (cinza) destoavam do tema dourado/escuro do app |
| **Root cause** | CSS de scrollbar existia na referência visual (`ro-modern/theme.css`) mas nunca foi portado para o app |
| **Fix** | Adicionado CSS customizado no `@layer base` de `globals.css`: webkit-scrollbar (6px, gold 25% thumb, gold 50% hover) + Firefox fallback (`scrollbar-width: thin`, `scrollbar-color`) |
| **Arquivo** | `app/globals.css` linhas 113-131 |
| **Cores** | `rgba(201, 169, 89, 0.25)` normal, `rgba(201, 169, 89, 0.5)` hover — consistente com `#c9a959` do tema |

---

### S5: Iniciativa — Tooltip no Valor Passivo [BAIXO]

| Campo | Detalhe |
|-------|---------|
| **Bug** | No MonsterStatBlock, a iniciativa era exibida como `-1 (9)` sem explicar o que o valor entre parênteses significa |
| **Fix** | Adicionado `title="Passive Initiative"` via `<span>` no valor calculado `(10 + dexMod)` |
| **Arquivo** | `components/oracle/MonsterStatBlock.tsx` linha 327 |

---

## Issues Não Implementadas (Referência)

| Issue | Status | Motivo |
|-------|--------|--------|
| **Flicker na busca de monstros** | ✅ Já corrigido | Debounce 200ms + `!isLoading` guard em `MonsterSearchPanel.tsx:438-442` |
| **i18n do conteúdo SRD** | ℹ️ Out of scope | Tech spec (`tech-spec-app-i18n-next-intl.md`) define: "SRD data content translation out of scope. Only UI labels around SRD." Decisão de design, não bug |

---

## Validação

- **TypeScript:** `tsc --noEmit` — 0 erros nos arquivos alterados
- **Code Review:** Party Mode com agentes QA (Quinn), UX (Sally) e Dev (Amelia) — aprovado
- **Arquivos tocados:** 6 (OracleAIModal, ConditionReference, EncounterSetup, CombatantSetupRow, MonsterStatBlock, globals.css)

---

## Mapa de Z-Index Atualizado

Para referência futura de qualquer agente trabalhando em layering:

```
z-index: 0-1       → Background (noise, gradients, main content)
z-index: 1          → Card toolbar (scoped within card)
z-index: 1000+      → Individual pinned cards (card.zIndex + 1000, auto-increment)
z-index: 9990       → Dice history pill/panel
z-index: 9999       → Floating card container, tooltips, dice roll popovers
z-index: 10000      → Unpin All button, mobile close button
z-index: 10001      → Oracle AI modal backdrop      ← NOVO
z-index: 10002      → Oracle AI modal content        ← NOVO
```
