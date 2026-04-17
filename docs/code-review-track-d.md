# Code Review — Sprint 2 Track D
Branch: worktree-agent-a0c0df33
Commits: bb14360, 6b304d1, 88dba08, f6cec21

## Veredicto
**APPROVE WITH CHANGES** — implementação sólida, cobre os 4 hotfixes com boa higiene de tokens e a11y, e o gate SRD do `VersionBadge` é estruturalmente correto (default `isSrd = false`, veredito só-gold exige `version === "2024" && isSrd === true`). Porém existem 3 pontos a endereçar antes do merge:

1. [MEDIUM] H1 não propaga para `components/ui/sheet.tsx` — o `<DialogPrimitive.Close>` em Sheet ainda tem o mesmo hit-target pequeno, e Sheet é usado em `GuestCombatClient` (`mid-combat-add-panel`) e `CampaignCreationWizard`. Spec H1 pede "propagar em TODAS as modais".
2. [LOW] VersionBadge em `MonsterStatBlock.tsx:375-381` passa `isSrd={monster.is_srd}`, mas `is_srd` é `boolean | undefined` (campo opcional) — o fallback para `undefined → false → neutro` é o comportamento seguro, porém dados autenticados (full mode) que tenham monstros SRD sem `is_srd` setado vão render neutro em vez de gold. Ver sub-seção abaixo.
3. [LOW] Botão close mobile em `FloatingCardContainer.tsx:720-745` usa `style` inline com hex literal `#fff`. O próprio commit log afirma "No hex, no raw px" — isto é um desvio (minor, mas contradiz o que foi documentado).

Nenhum dos achados é CRITICAL/bloqueador; todos têm fix trivial.

## Severity Summary
- [CRITICAL] 0 | [HIGH] 0 | [MEDIUM] 1 | [LOW] 4

## Findings por commit

### bb14360 — H1 Dialog X
**Arquivo**: `components/ui/dialog.tsx:43-49`

- [OK] Wrapper `DialogPrimitive.Close` com `h-11 w-11` (44×44), ícone `X` em `h-5 w-5` dentro — mantém proporção visual certa.
- [OK] `aria-label="Close dialog"`, `focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-auth`, `<span className="sr-only">Close</span>` redundante (belt-and-suspenders, aceitável).
- [OK] Tokens corretos: `gold`, `surface-auth`, `text-white` — sem hex, sem `purple-*`.
- [OK] `z-50` herdado do `DialogContent` pai; não conflita.
- [OK] Propagação: 30+ arquivos usam `DialogContent` (encounter-generator, CampaignLoader, CharacterForm, etc.) — todos recebem o novo close gratuitamente via Radix.
- [MEDIUM] **Scope miss**: `components/ui/sheet.tsx:50` tem `<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ...">` — 16×16 hit-target. Sheet é usado em:
  - `components/guest/GuestCombatClient.tsx:1787` (mid-combat-add-panel)
  - `components/campaign/CampaignCreationWizard.tsx:238`
  - `components/blog/BlogTOC.tsx:194`
  Spec H1 pede "propagar para TODAS as modais". Sheet é uma modal bottom em mobile — MESMO problema.
- [LOW] Mobile viewport <320px: 44×44 + `right-2 top-2` = 56px consumidos da direita. Em 320px viewport, isso é 17.5% da largura. Não empurra conteúdo para fora do viewport porque `DialogContent` tem `max-w-md` e `w-full`, mas botões/títulos longos podem ficar colados no X. Não-bloqueador mas vale considerar `pr-12` no header para viewports estreitos.

### 6b304d1 — H2 Stat card toolbar
**Arquivos**: `styles/stat-card-5e.css:51-124`, `MonsterStatBlock.tsx:308-337`, `ConditionCard.tsx:130-142`, `SpellCard.tsx:88-100`, `OracleAICard.tsx:125-137`, `FloatingCardContainer.tsx` (6 locais)

- [OK] Hierarquia visual correta: `.card-toolbar button` = 36×36 (era 24×24), `.card-toolbar button.toolbar-close` = 44×44 com border gold + bg gold/8% + hover muda para red/20%. Diferenciação é clara e segue o spec.
- [OK] Focus-visible diferenciado: `outline: 2px solid var(--5e-accent-gold)` para botões normais, `outline: 2px solid var(--5e-accent-red)` para close. Passa WCAG 2.4.7.
- [OK] Tokens 100% via CSS vars do `.stat-card-5e` (`--5e-accent-gold`, `--5e-accent-red`). Sem hex novos no CSS.
- [OK] `@media (max-width: 767px)` ajusta apenas `gap` — 44×44 preservado em mobile (close continua clicável).
- [OK] Parity: `styles/stat-card-5e.css` é compartilhado — atinge Guest (`GuestCombatClient` via FloatingCardContainer), Anon (`PlayerCompendiumBrowser`), Auth (`CommandPalette`, compendium).
- [OK] `FloatingCardContainer` toca 6 sub-componentes (`MinimizedCard`, `PinnedMonsterCard`, `PinnedSpellCard`, `PinnedConditionCard`, `PinnedItemCard`, `PinnedFeatCard`) — todos passam `className="toolbar-close"`. Cobertura completa.
- [LOW] **FloatingCardContainer.tsx:720-745** (mobile overlay close): usa `style={{ ... background: "rgba(146, 38, 16, 0.25)", color: "#fff", border: "1px solid rgba(201, 169, 89, 0.8)" }}` — escapa do sistema de CSS vars. O `#fff` é um hex literal — contradiz o claim do commit "No hex, no raw px". Fix trivial: extrair para classe CSS `.floating-mobile-close` no `stat-card-5e.css` reusando `var(--5e-accent-red)` e `var(--5e-accent-gold)`.
- [LOW] SpellCard/ConditionCard/OracleAICard nunca tiveram H2 no spec original, mas como estão dentro do mesmo `.card-toolbar`, aplicar o estilo diferenciado é coerente (se não fosse feito, close do MonsterStatBlock ficaria gigante e dos outros ficaria minúsculo — inconsistência pior). Decisão correta, mas merece menção no CHANGELOG.

### 88dba08 — H7 VersionBadge (SRD gate — extra scrutiny)
**Arquivos**: `components/ui/VersionBadge.tsx` (novo, 79 linhas), callers em 6 componentes.

**Audit de segurança do gate (linha-a-linha)**:

`VersionBadge.tsx:44-49`:
```tsx
export function VersionBadge({
  version,
  isSrd = false,   // ← DEFAULT SEGURO
  className,
  size = "sm",
}: VersionBadgeProps) {
```
[OK] `isSrd` é opcional MAS tem default `false`. Caller que esquecer de passar → render neutro, NUNCA gold.

`VersionBadge.tsx:50`:
```tsx
if (!version) return null;
```
[OK] Sem `version` → nada renderizado. Safe.

`VersionBadge.tsx:52`:
```tsx
const is2024Srd = version === "2024" && isSrd === true;
```
[OK] Gate estrito: exige AMBAS as condições com comparação estrita (`=== true` descarta `undefined`/`null`/`1`/strings truthy).

`VersionBadge.tsx:61-63`:
```tsx
const toneClasses = is2024Srd
  ? "border-gold/60 bg-gold/15 text-gold"
  : "border-zinc-500/30 bg-zinc-500/5 text-zinc-400";
```
[OK] Só dois estilos. 2024-SRD → gold. Qualquer outro caso (inclui `2014 SRD`, `2024 não-SRD`, `2014 não-SRD`) → zinc neutro.

**Veredicto do gate**: estruturalmente correto. O componente é impossível de usar incorretamente sem auditoria explícita do caller. Matriz de casos (conforme docstring, linhas 14-21):

| version | isSrd | Render |
|---------|-------|--------|
| `"2024"` | `true` | gold (é a única combinação gold) |
| `"2024"` | `false`/`undefined`/não-passado | zinc neutro |
| `"2014"` | `true` | zinc neutro (docstring menciona "subtle gold-dim", mas o código produz zinc puro — **divergência minor entre comentário e código**) |
| `"2014"` | `false`/`undefined` | zinc neutro |
| `null`/`undefined` | qualquer | `null` (nada) |
| qualquer string | qualquer | renderiza a string mas neutro (aceita `string` em `RulesetVersion`, então rulesets futuros funcionam) |

[LOW] Comentário na linha 18 (`2014 SRD → neutral (subtle gold-dim)`) diverge do código real — código gera zinc puro, não "gold-dim". Ajuste de comentário ou de código necessário, mas do ponto de vista de compliance/SRD gate isso é inócuo (zinc é sempre seguro).

**Auditoria dos callers**:

1. `components/oracle/MonsterStatBlock.tsx:375-381` — `isSrd={monster.is_srd}` (auth, full mode). Campo `is_srd` em `SrdMonster` é `boolean | undefined`. Undefined → neutro. [OK]
2. `components/oracle/MonsterStatBlock.tsx:504-510` — source line, idem. [OK]
3. `components/oracle/CommandPalette.tsx:332, 364` — `isSrd={r.item.is_srd}` — idem. [OK]
4. `components/public/PublicMonsterStatBlock.tsx:188-192` — `isSrd={monster.is_srd}`. Dados públicos em `/public/srd/monsters-2024.json` foram auditados e TODOS os 346 records têm `is_srd: true`. 2014 públicos (419): todos `true`. [OK verificado via `node -e`]
5. `components/public/PublicCommandPalette.tsx:500-504, 546-550` — `isSrd={isSrdContent(r.item)}`. `isSrdContent` (linhas 81-87) retorna `true` para tudo em public mode (porque whitelist já filtrou). **Defesa em profundidade**: se alguma entrada não-SRD vazar para o bundle público, ela receberá `isSrd=true` e poderia render gold. Mas isto é um bug de pipeline (whitelist), não de VersionBadge — o componente está correto. [OK]
6. `components/compendium/MonsterBrowser.tsx:110` e `SpellBrowser.tsx:331` — `isSrd={m.is_srd}` / `isSrd={spell.is_srd}`. [OK]

- [LOW] `MonsterStatBlock` no fluxo auth com dados vindos de `/api/srd/full/` (full mode, beta-tester): se algum monster SRD não tiver `is_srd` setado no server-side bundle, vai renderizar neutro em vez de gold. **Não é um risco de compliance** (under-promotion, não over-promotion), mas é uma pequena degradação de UX. Mitigação: adicionar verificação em `scripts/generate-srd-bundles.ts` para garantir `is_srd` sempre presente.

[OK] **A11y**: `aria-label={\`D&D ${version} edition\`}` e `title={is2024Srd ? \`SRD ${version}\` : \`${version}\`}` — screen readers anunciam semanticamente. Tamanho de fonte `9px`/`11px` é pequeno (tocável/lado a lado de um nome) mas a a11y é via aria-label.

[OK] **Tokens**: `border-gold/60 bg-gold/15 text-gold` vs `border-zinc-500/30 bg-zinc-500/5 text-zinc-400`. Sem purple, sem hex.

### f6cec21 — H4 Resistances color
**Arquivos**: `styles/stat-card-5e.css:234-273` (novas classes), `MonsterStatBlock.tsx:84-107` (PropLine variant), `PublicMonsterStatBlock.tsx:280-303` (hand-rolled `<p>` com mesmas classes).

- [OK] Abordagem "position-agnostic" via classes CSS modifier (`prop-defense` + `prop-defense-{variant}`). Track C pode mover o bloco sem quebrar a cor — bem arquitetado.
- [OK] `PropLine` helper aceita `variant?: "resistance" | "immunity" | "vulnerability"`. `variant` opcional → zero overhead para prop-lines não-defense.
- [OK] CSS usa `var(--5e-accent-blue|gold|red)` e `var(--5e-header-blue|red)` — tokens existentes, sem hex novos.
- [OK] Border-left 3px + bg tintado (6-8% alpha) + cor do label — **3 camadas de diferenciação, não só cor**. Passa WCAG 1.4.1 (color-alone). Labels "Damage Resistances"/"Immunities"/"Vulnerabilities" continuam como texto — screen readers anunciam semanticamente.
- [OK] Parity: `stat-card-5e.css` é compartilhado. `MonsterStatBlock` usado em Auth (CommandPalette, compendium), Anon (PlayerCompendiumBrowser), e `PublicMonsterStatBlock` cobre guest/público.
- [OK] Empty resistances (`damage_resistances: null`): `{damageRes && (...)}` curto-circuita. Sem bleed.
- [OK] `conditionImm` reutiliza `prop-defense-immunity` (linha 483-484) — fiel ao spec (condition immunities são equivalentes a immunities defensivas).
- [LOW] Cores escolhidas (azul resistência, gold imunidade, vermelho vulnerabilidade): gold colide com cor que já é usada para `trait-name` e `accent-gold` geral. Para DM scanning rapidamente, gold é "neutro/destaque" em muitos outros lugares do stat block. Sugerido considerar um `--5e-accent-purple` ou `--5e-accent-teal` para imunidade, para aumentar distintividade. Não-bloqueador.
- [LOW] Acessibilidade color-blind: protanopia/deuteranopia podem confundir blue-gold (cores de média luminância). Com o texto do label ("Damage Immunities") + border-left, a diferenciação não é color-only. Ainda assim, considerar um ícone (🛡 para immunity, ▼ para vulnerability, ◐ para resistance) seria mais robusto. Spec H4 não exige ícones — pode ser backlog.

## SRD Compliance audit (H7)

**Verificação estrutural** (não me baseei em claims do agent, li o código):

1. **Default do `isSrd` prop**: `isSrd = false` (linha 46). [OK] — missing prop = safe fallback.
2. **Gate condicional**: `version === "2024" && isSrd === true` (linha 52). [OK] — AND estrito. Nenhum `||`, nenhum coercion fraco.
3. **Apenas 2 estilos possíveis**: `is2024Srd ? gold : zinc` (linha 61-63). [OK] — não existe caminho ambíguo.
4. **Rendering de texto**: `{version}` (linha 76) — o conteúdo textual é o que veio como prop, nada mais; o badge não revela fonte/livro.

**Simulação de ataques**:

- Passar `version="2024"` sem `isSrd` → default `false` → neutro. [BLOQUEADO]
- Passar `version="2024" isSrd={undefined}` → `undefined === true` = false → neutro. [BLOQUEADO]
- Passar `version="2024" isSrd={null}` → `null === true` = false → neutro. [BLOQUEADO]
- Passar `version="2024" isSrd={1}` → `1 === true` = false → neutro. [BLOQUEADO — truthy não é suficiente, precisa do strict `=== true`]
- Passar `version="2024" isSrd={"true"}` → string `=== true` = false → neutro. [BLOQUEADO]
- Passar `version="2024" isSrd={true}` → gold. [ESPERADO]

Gate double-locked e à prova de descuido de caller. Apto.

**Verificação de dados públicos**:
```
public/srd/monsters-2014.json : 419/419 com is_srd=true
public/srd/monsters-2024.json : 346/346 com is_srd=true
public/srd/spells-2014.json   : 361/361 com is_srd=true
public/srd/spells-2024.json   : 359/359 com is_srd=true
```
Todos os bundles públicos têm `is_srd=true` em 100% dos records — consistente com a regra "public = SRD-only". Se um dia o filter-srd-public.ts gerar records sem `is_srd`, o VersionBadge vai renderizar neutro (não-gold) em vez de vazar gold em não-SRD. Failure-mode correto.

## Scope creep check

13 arquivos para 4 hotfixes parece muito, mas a auditoria mostra que é justificado:

| Arquivo | Hotfix | Razão |
|---------|--------|-------|
| `components/ui/dialog.tsx` | H1 | target principal |
| `components/ui/VersionBadge.tsx` | H7 | novo componente |
| `components/oracle/MonsterStatBlock.tsx` | H2+H4+H7 | 3 hotfixes convergem aqui |
| `components/oracle/ConditionCard.tsx` | H2 | compartilha `.card-toolbar` |
| `components/oracle/SpellCard.tsx` | H2 | compartilha `.card-toolbar` |
| `components/oracle/OracleAICard.tsx` | H2 | compartilha `.card-toolbar` |
| `components/oracle/FloatingCardContainer.tsx` | H2 | 6 sub-cards + mobile overlay |
| `components/oracle/CommandPalette.tsx` | H7 | callsite auth |
| `components/public/PublicMonsterStatBlock.tsx` | H4+H7 | variante pública |
| `components/public/PublicCommandPalette.tsx` | H7 | callsite público |
| `components/compendium/MonsterBrowser.tsx` | H7 | callsite list |
| `components/compendium/SpellBrowser.tsx` | H7 | callsite list |
| `styles/stat-card-5e.css` | H2+H4 | CSS shared |

**Sem arquivos irrelevantes**. OracleAICard/SpellCard/ConditionCard foram tocados por H2 (não eram do spec original H2, mas omitir causaria inconsistência visual pior). Decisão correta — documentar no changelog.

## Cross-cutting

### Tokens
- [OK] `gold`, `zinc`, `surface-auth`, `text-white` (Tailwind) no Dialog.
- [OK] `--5e-accent-blue`, `--5e-accent-gold`, `--5e-accent-red`, `--5e-header-blue`, `--5e-header-red` (CSS vars) em stat-card-5e.css.
- [LOW] Hex literal `#fff` em `FloatingCardContainer.tsx:736` (mobile overlay close). Violação minor.
- [OK] Nenhum `purple-*` introduzido.

### Parity (3 modos)
- **Guest (`/try`)**: [OK] H1 via `DialogContent` → encontra em `EncounterGeneratorDialog` chamado do `GuestCombatClient`. H2 via `.stat-card-5e .card-toolbar` → FloatingCardContainer (Zustand store). H4 via CSS shared. H7 via callers em CommandPalette (quando guest abre compendium).
- **Anon (`/join`)**: [OK] Mesmo código de `MonsterStatBlock`, `CommandPalette`, `stat-card-5e.css` via `PlayerCompendiumBrowser`/`PlayerSpellBrowser`.
- **Auth (`/invite`)**: [OK] Via `CommandPalette` + compendium browsers.

Ponto de falha: **Sheet.tsx não foi atualizado** (MEDIUM). `GuestCombatClient` usa Sheet para o `mid-combat-add-panel` — falta hit-target grande em mobile.

### A11y
- H1: `aria-label="Close dialog"`, `focus-visible:ring-2 focus-visible:ring-gold`, `<span className="sr-only">Close</span>`. [OK]
- H2: `aria-label="Close card"`, focus outline diferenciado red vs gold. [OK]
- H4: text labels mantidos, não-color-only. [OK]
- H7: `aria-label={\`D&D ${version} edition\`}`, `title` com contexto SRD. [OK]

### DoD
- [x] **rtk tsc**: clean, zero errors.
- [x] **rtk lint**: 3 errors pre-existentes em master (`isAuthenticated` unused em MonsterBrowser:122, `displayName` missing dep em MonsterBrowser:223, `isPt` unused em PublicMonsterStatBlock:45). **Nenhum introduzido por Track D** — verificado em `git show master:...`.
- [x] **Parity 3-mode**: cobre Guest/Anon/Auth via shared components + CSS. Exceção: Sheet não coberto (MEDIUM).
- [x] **A11y per hotfix**: aria-labels + focus-visible presentes em todos os 4.
- [x] **SRD gate proven**: auditado estruturalmente (VersionBadge) + simulação de 6 inputs maliciosos. Seguro.
- [x] **Tokens discipline**: 1 pequena violação (`#fff` em FloatingCardContainer mobile overlay — LOW).

## Recomendações antes do merge

1. **[MEDIUM — recomendo ANTES do merge]** Atualizar `components/ui/sheet.tsx:50` para usar `h-11 w-11` (44×44) com `X` em `h-5 w-5`, `aria-label="Close sheet"`, focus-visible ring gold. Mesmo tratamento do Dialog. Senão `GuestCombatClient.mid-combat-add-panel` fica com hit-target pequeno em mobile — contradiz o spec H1.
2. **[LOW]** Extrair estilos inline do mobile overlay close em `FloatingCardContainer.tsx:720-745` para uma classe CSS em `stat-card-5e.css` usando `var(--5e-accent-red)`/`var(--5e-accent-gold)`. Remove o `#fff` hardcoded.
3. **[LOW]** Corrigir docstring em `VersionBadge.tsx:18` — remover "subtle gold-dim" (o código renderiza zinc puro). Ou implementar um terceiro tom "gold-dim" se era a intenção (recomendo ajustar o comentário, o comportamento atual é mais seguro).
4. **[LOW]** Considerar ícone semântico ao lado das resistências/imunidades/vulnerabilidades (🛡/◐/▼) para reforçar diferenciação em usuários com color-blindness. Pode ir para backlog.
5. **[LOW]** Adicionar teste em `scripts/generate-srd-bundles.ts` (ou um CI guard) que garante `is_srd` presente em 100% dos records gerados — evita drift futuro que degradaria UX do VersionBadge em full mode.
6. **[INFO]** Mencionar no CHANGELOG/PR body que SpellCard/ConditionCard/OracleAICard receberam o close button 44×44 mesmo sem estarem no spec H2 original — decisão de consistência. Track C / QA deve saber.

Sem o item #1 resolvido, o merge ainda pode passar (Sheet é usado em menos lugares que DialogContent), mas a afirmação "propaga para TODAS as modais" fica frouxa.
