# Code Review — Track D Fixes (follow-up)
Branch: `feat/beta3-ux-dialogs-statblock` (worktree `agent-a0c0df33`)
Fix commits: `216e23c`, `6a5ab1a`, `3d6079f`
Review anterior: `docs/code-review-track-d.md` (APPROVE WITH CHANGES, 3 pendências)

## Veredicto
**APPROVE** — os 3 commits endereçam diretamente os 3 itens pendentes da review original (1 MEDIUM + 2 LOW). Zero regressão, tsc limpo, nenhuma violação de token introduzida.

## 216e23c — Sheet close 44x44 (fix MEDIUM #1)

**Arquivo**: `components/ui/sheet.tsx:50-56`

O fix espelha o tratamento aplicado ao Dialog (`bb14360`). Comparando lado-a-lado:

- `Dialog.tsx:45` → `className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-auth disabled:pointer-events-none"`
- `Sheet.tsx:52` → **idêntico, char-a-char**.

Icon `X` com `h-5 w-5 aria-hidden="true"` em ambos. `<span className="sr-only">` presente em ambos. Sizing, focus-visible e ring/offset casam 100%.

**Único delta semântico**: `aria-label="Fechar"` (PT-BR) no Sheet vs `aria-label="Close dialog"` (EN) no Dialog. Commit message defende a escolha ("matches user-facing locale"). A codebase já é mista — aceitável, mas vale uma nota: idealmente escolher uma convenção única no futuro (o resto do app está migrando para PT-BR conforme `I18N_MIGRATION_MAP.txt`, portanto a direção PT-BR está correta; eventualmente o Dialog deveria seguir para `"Fechar"` também, mas fora de escopo deste fix).

**Callers auditados independentemente** (encontrei 5, agent disse 5 — match):
- `components/blog/BlogTOC.tsx:194` — Sheet side=bottom, nenhum custom Close
- `components/campaign/CampaignCreationWizard.tsx:238` — side default, nenhum custom Close
- `components/guest/GuestCombatClient.tsx:1787` — `mid-combat-add-panel` bottom sheet, nenhum custom Close
- `components/player-hq/CharacterEditSheet.tsx:139` — side=right, nenhum custom Close
- `components/session/CombatSessionClient.tsx:1582` — `add-combatant-panel` bottom sheet, nenhum custom Close

`rtk grep` confirmou zero uso de `SheetClose` ou `DialogPrimitive.Close` diretamente nesses 5 arquivos — o novo close propaga automaticamente. Zero breakage possível.

**Parity cobertura**: GuestCombatClient (Guest `/try`), CombatSessionClient (Auth `/session`/`/combat`) — cobre o spec H1 "TODAS as modais" agora de fato.

- [x] 44x44 tap target
- [x] aria-label presente (`"Fechar"`)
- [x] focus-visible gold ring consistente com Dialog
- [x] Nenhum caller quebrado

## 6a5ab1a — #fff -> white (fix LOW #3)

**Arquivo**: `components/oracle/FloatingCardContainer.tsx:736`

Diff mínimo: `color: "#fff"` → `color: "white"`. Rendering é bit-a-bit idêntico (CSS named color `white` é definido como `#ffffff`). Honra o "no hex" claim do commit `6b304d1`.

Nota: o item #3 da review original sugeriu extrair o bloco inteiro de `style={{...}}` para uma classe CSS em `stat-card-5e.css` com `var(--5e-accent-red)` / `var(--5e-accent-gold)`. O commit faz somente a troca literal do `#fff`. **Aceitável** — o bloco ainda contém hex em `rgba(146, 38, 16, 0.25)` e `rgba(201, 169, 89, 0.8)`, mas essas já existiam antes de Track D e estão fora do escopo do fix puntual. Se for bloco para o pipeline "no hex" absoluto, criar uma issue separada para extrair `.floating-mobile-close`. Não-bloqueador.

- [x] #fff removido
- [x] Rendering idêntico
- [ ] (fora de escopo) restantes hex em rgba() no mesmo bloco — backlog

## 3d6079f — VersionBadge docstring (fix LOW #2)

**Arquivo**: `components/ui/VersionBadge.tsx:10-21`

A linha problemática `"2014 SRD → neutral (subtle gold-dim)"` foi removida. A nova matriz é precisa:

```
- 2024 SRD          -> gold (the "new edition" cue)
- 2024 non-SRD      -> neutral zinc
- 2014 SRD          -> neutral zinc
- 2014 non-SRD      -> neutral zinc
```

Confere com o código (`is2024Srd ? gold : zinc`, linhas 60-62). Zero ambiguidade restante. A linha final "SRD 2024 monsters pop out while all other entries stay muted" também foi atualizada para ser consistente.

- [x] Docstring reflete o comportamento real
- [x] Nenhuma frase enganosa remanescente

## Cross-cutting

- [x] `rtk tsc` limpo (`TypeScript compilation completed`, zero errors)
- [x] Nenhum token novo introduzido, nenhum hex novo, nenhum `purple-*`
- [x] Parity 3-mode preservada (Sheet agora cobre Guest + Auth via `GuestCombatClient` e `CombatSessionClient`)
- [x] Sem mudança em lógica de negócio, somente a11y/tokens/docs

## DoD

- [x] Fix MEDIUM #1 (Sheet H1) — resolvido, paridade visual com Dialog verificada
- [x] Fix LOW #2 (VersionBadge docstring) — resolvido, matriz correta
- [x] Fix LOW #3 (#fff hex) — resolvido (pontual; hex remanescentes em rgba() ficam para backlog se houver política estrita)
- [x] tsc verde
- [x] Nenhuma regressão em callers Sheet (5 auditados)

**Pronto para merge.**
