# Spec Review Final — Auditoria Adversarial do Pacote de Redesign

**Data:** 2026-04-22
**Reviewer:** Spec Auditor (adversarial mode)
**Escopo:** 12 docs em `_bmad-output/qa/evidence/campaign-audit-2026-04-21/` + `schema-investigation-winston.md`
**Método:** 3 análises paralelas — consistência cross-doc (20 decisões), tracking dos 24 findings, gaps de implementação.

---

## 1. Resumo executivo

O pacote é denso e cobre muita coisa, mas **não é implementação-ready**. Existem pelo menos **4 contradições 🔴 blocker** entre docs (cores HSL/hex, thresholds de HP tier, vocabulário de mode como enum, icone do Quest) e **9 🟠 high** de gaps ou campos ambíguos. Em particular, `DESIGN-SYSTEM.md` e `01-design-tokens.md` **divergem em todas as cores primárias de background** — o dev que escolher um dos dois como fonte vai inevitavelmente mergear algo que outro doc declara como anti-pattern. Os 24 findings estão cobertos, mas **F-21 e F-23 têm cobertura fraca**. A spec de players ainda tem rotas `/journey` e `/watch` que **nunca foram travadas como decisão** (§13 só trava `/prep /run /recap`). Se o time começar agora, sprint B vai parar pra reconciliar tokens no commit 3.

---

## 2. Matriz de consistência — 20 decisões travadas × 6 docs

Legenda: ✅ coerente · ⚠ parcial/ambíguo · ❌ divergente · — N/A

| # | Decisão (§13) | DS | 01 | 02 | 03 | 05 | 06 | 09 |
|---|---|---|---|---|---|---|---|---|
| 1 | Eliminar pill bar | ✅ | — | ✅ | — | ✅ | ✅ | ✅ |
| 2 | Shell unificado Mestre + Player | ✅ | — | ✅ | ✅ | ✅ | — | ✅ |
| 3 | Mode switcher > pill bar | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | Busca rápida Ctrl+K | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5 | Empty states por role | ✅ | — | — | — | — | ✅ | ✅ |
| 6 | 1 CTA dominante em combate | ✅ | — | ⚠ *(banner Z-index colide com Topbar e BottomTabBar, §1.8)* | ⚠ | ⚠ | ✅ | ✅ |
| 7 | Mode stateless (BL-3) | ✅ | — | ⚠ *(Sidebar.tsx props aceita `mode` como source, não lê do server)* | ✅ | — | — | ✅ |
| 8 | Surface × Auth matrix | ✅ | — | ⚠ *(BottomTabBar props não considera role='player-anon' em tabs)* | ✅ | ✅ | ✅ | ✅ |
| 9 | Read-only lock em combate | ✅ | — | ✅ *(ModeItem `locked`)* | ✅ | ✅ | ✅ | ✅ |
| 10 | Labels PT-BR (Preparar/Rodar/Recap) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ *("Prep"/"Run"/"Recap" usados como enum interno sem distinção UI)* |
| 11 | Ctrl+K primário Win | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| 12 | Density budget ≤ 8 | ✅ | — | — | — | ✅ | — | — |
| 13 | Serif só em nomes próprios | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |
| 14 | 4 killer-features | ✅ | — | ❌ *(killer-features listadas em "Gaps NOT scope V1" na §Fim)* | ✅ | — | ✅ | ✅ |
| 15 | Soundboard posicionada | ✅ *("Trilha")* | — | ❌ *(02 não tem SoundboardChip component)* | — | ✅ | ✅ | ✅ |
| 16 | Rotas EN `/prep`,`/run`,`/recap` | ✅ | ✅ | — | ⚠ *(inventa `/watch` e `/journey` sem ata da decisão)* | — | ⚠ *(cita `/journey` como destino do player_hq_button mas decisão 16 só lista 3 rotas)* | ⚠ *(tree só lista 3, spec de player não aparece em app/app/campaigns/[id])* |
| 17 | Anon vê Minha Jornada light | ✅ | — | — | ✅ | — | ✅ | ⚠ *(não tem story separada pra Anon shell)* |
| 18 | Mode switcher vertical DK / bottom mobile | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| 19 | Tour dismissable | ✅ | — | — | ✅ | ✅ | ✅ | ✅ |
| 20 | Backlinks `@nome` primário | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |

**Linhas problemáticas:** #10 (enum vs label), #14 (killer-feats declaradas "NOT scope V1" em 02), #15 (Soundboard sem componente), #16 (`/watch` e `/journey` sem decisão formal), #7 (Sidebar consome `mode` como prop sem afirmar origem server).

---

## 3. Tracking dos 24 Findings

| F | Sev | Proposal §? | DS/01/02 | 03 | 04 states | 06 i18n | 09 story | Gap / nota |
|---|---|---|---|---|---|---|---|---|
| F-01 Pill bar escondendo 10/13 | 🔴 | §5,§6.3 | ✅ | — | ✅ | ✅ | B.4 | ✅ |
| F-02 `player_hq_button` raw | 🔴 | §14 Fase A.1 | — | — | — | ✅ §5 | A.1 | ✅ |
| F-03 4 níveis de nav | 🔴 | §6, §13.1 | ✅ | — | — | ✅ | — | ⚠ Falta story de "delete competing nav" em Fase D (B4 constrói mas nunca valida single-path) |
| F-04 Mestre/Player navmodel dif. | 🟠 | §5,§6 | ✅ | ✅ | ✅ | ✅ | B.4/C.10 | ✅ |
| F-05 Empty quest p/ player | 🟠 | §9 | ✅ | — | ✅ A.2/D.4 | ✅ | A.3 | ✅ |
| F-06 role-gating unificado | 🟠 | §9 | ✅ | — | ✅ | ✅ | A.2 + B.2 | ✅ |
| F-07 triplicata CTA combat | 🟠 | §13.6 | ✅ | — | ✅ | ✅ | A.4 | ✅ |
| F-08 "Histórico" → Sessões | 🟠 | §14 Fase A.5 | ✅ | — | — | ✅ §4 keys deprecated | A.5 | ✅ |
| F-09 sessões sem nome | 🟠 | §8 | — | — | ✅ A.1 | ✅ | A.7 | ✅ |
| F-10 stats vazios | 🟠 | §9 | ✅ §8.2 | — | ✅ C.3 (empty-early/zero) | ✅ | — | ⚠ Sem story dedicada; cai em C.3 RecapSurface implicitamente |
| F-11 sub-tabs inconsistentes | 🟠 | §9 | ✅ §6.3.2 | — | ✅ | — | C.9 | ✅ |
| F-12 Mindmap labels ilegíveis | 🟡 | §7 W3 | — | — | ✅ A.7 | — | C.8 | ✅ |
| F-13 Mindmap sem legenda | 🟡 | §7 W3 | — | — | ✅ A.7 | — | C.8 | ✅ |
| F-14 ficha incompleta | 🟡 | §8 | — | — | ✅ D.1 | ✅ | — | ⚠ Sem story dedicada; menção dispersa em player W4 |
| F-15 "Companheiros" → Party | 🟡 | §8,§13 | — | — | ✅ D.6 | ✅ | A.8 | ✅ |
| F-16 "Por facção" cortado | 🟡 | §8 | — | — | ✅ A.3 | — | C.9 | ⚠ Fix é "bottom-sheet em mobile" mas bottom-sheet não tem componente em 02 |
| F-17 Padding KRYNN colado | 🟡 | §14 Fase A.6 | — | — | — | — | A.6 | ✅ |
| F-18 "CURSE OF STRA..." corta | 🟡 | §14 Fase A.6 | — | — | — | — | A.6 | ✅ |
| F-19 grid stats CAIXA ALTA | 🟡 | §9 | ✅ §11.2 | — | ✅ C.3 | — | C.3 | ⚠ Implícito; nunca AC explícito "remover grid 2×2" |
| F-20 Quests sub-tabs mobile cortadas | 🟡 | §9 F-11 | — | — | — | — | C.9 | ❌ **GAP**: nenhum doc menciona F-20 literalmente depois da findings |
| F-21 card "Pocket DM Beta" | 🔵 | §8 | — | — | — | ✅ §13 `badges.srd_source` | — | ⚠ Fix mencionado em proposal (rename SRD 5.1), mas sem story; i18n key existe mas lugar de render não spec'd |
| F-22 HP "—" em Encounters | 🔵 | §8 | — | — | ✅ B.1 + D.1 | — | — | ⚠ Regra F-22 spec'd em 04 mas sem story de implementação nem sem referência em 17 HPBar |
| F-23 sidebar/pill "Histórico" desync | 🔵 | — | — | — | — | — | — | ❌ **GAP total** — proposal e todos os outros docs ignoram F-23. Nunca endereçado. |
| F-24 CTAs overview duplicam nav | 🔵 | §13.6 | ✅ P6 one-path | — | — | — | B.4 (por construção) | ⚠ Não explicitado como delete; assumido ao migrar pra V2 |

**Resumo:** 14 findings ✅ totalmente endereçados; 8 ⚠ parciais (sem story ou com spec dispersa); **2 ❌ GAPS TOTAIS (F-20 e F-23)** — jamais mencionados após findings.md.

---

## 4. Lista de gaps — severidade + localização

### 🔴 Blocker

#### B1. Backgrounds divergem entre DS e 01-design-tokens (valores hex diferentes)
- **Onde:** `DESIGN-SYSTEM.md:158-162` vs `01-design-tokens.md:20-27` vs `07-accessibility-spec.md:270`
- **Problema:**
  - DS: `bg=#14161F`, `bg-elevated=#181A25`, `bg-raised=#1F222E`
  - 01: `bg-background=#13131E`, `bg-surface-secondary=#1A1A28`, `bg-card=#1E1E2B`, `bg-surface-tertiary=#222234`
  - 07: usa `#14161F` e `#1B1D27` como bg elevated
- **Impacto:** focus-ring-offset-color no 07 aponta pra `#14161F`, mas Tailwind config do DS declara `bg.DEFAULT=#14161F` — se dev usar o 01 ele vai setar `bg-background=#13131E` e o ring vai ser offsetado contra cor errada. HSL do 01 (`hsl(233 26% 10%)`) resolve pra `#13131E`, diferente do DS (`#14161F`). Inconsistência propaga pra todos ~25 wireframes ASCII.
- **Ação:** eleger **uma fonte de verdade** (recomendo 01 pela precisão e HSL declarado) e corrigir DS + 07.

#### B2. Thresholds de HP tier conflitam entre DS, 02-components e código
- **Onde:** `DESIGN-SYSTEM.md:625-630` vs `02-component-library.md:1233-1241`
- **Problema:**
  - DS: `LIGHT >70%`, `MODERATE 40-70%`, `HEAVY 15-40%`, `CRITICAL <15%`
  - 02: `LIGHT 75-99%`, `MODERATE 25-74%`, `HEAVY 1-24%`, `CRITICAL ≤0% / dying`
  - Cores: DS usa `success #29A36E`, `destructive #E05C3B`; 07 usa `#4ADE80`, `#EF4444`; 01 usa `#28A569`, `#E35D3A`.
  - Memory regra: derivar de `getHpStatus()` — mas nenhum doc mostra o source-of-truth real; cada doc redefine.
- **Impacto:** diretamente quebra a regra imutável de `feedback_hp_legend_sync.md` ("Legenda NUNCA pode divergir de getHpStatus"). Se dev implementar HPBar do 02 com thresholds próprios, os toolips do DS vão mentir.
- **Ação:** remover tabelas de threshold de todos os docs e referenciar **apenas o arquivo de código** (`lib/hp/getHpStatus.ts` ou similar). Cores semânticas idem — uma só tabela.

#### B3. Valores de enum de `Mode` conflitam: PT-BR vs EN
- **Onde:** `redesign-proposal.md:187-203` (`preparar/rodar/recap/assistindo/minha-jornada`) vs `09-implementation-guide.md:183` (`type Mode = 'prep' | 'run' | 'recap' | 'journey' | 'watch'`) vs `02-component-library.md:476` (`'preparar' | 'rodar' | 'recap' | 'minha-jornada' | 'assistindo'`) vs `03-interactions-spec.md:96` (retorna `"assistindo"`).
- **Problema:** três docs usam PT-BR (`'preparar'`, `'assistindo'`), 09 usa EN (`'prep'`, `'watch'`). `resolveMode()` tem assinaturas incompatíveis. Props de `Sidebar`/`BottomTabBar` quebram no TS.
- **Impacto:** story B.2 não pode ser escrita sem reconciliação — bug de compilação em bloco.
- **Ação:** travar **EN como enum interno** (matching rotas), PT-BR **apenas em label**. Corrigir 02, 03, 04, proposal §5.5.

#### B4. Rotas `/journey` e `/watch` nunca foram travadas como decisão
- **Onde:** `03-interactions-spec.md:101, 110, 114` usa `/journey` e `/watch` consistentemente; `06-i18n-strings.md:640` referencia `/journey`; mas `redesign-proposal §13.16` só trava `/prep /run /recap`; `09-implementation-guide.md Apêndice A` só lista `prep run recap` na file tree.
- **Problema:** player route inventada em docs de implementação mas sem registro de decisão. Dev não sabe se é `/journey` ou `/minha-jornada` (coerente com PT-BR travado no #10).
- **Impacto:** Stories B.4/C.10 podem ser revertidas se Dani vetar o nome.
- **Ação:** adicionar decisão 21 explícita: `/journey` e `/watch` como rotas do player, alinhadas a EN short names.

### 🟠 High

#### H1. Slideover/Drawer é referenciado mas não catalogado como componente
- **Onde:** `03-interactions-spec.md §7` (quick-add slideover), `04-states-catalog.md:95,113,289,538`, `09-implementation-guide.md:246`; `DESIGN-SYSTEM.md §6.4.1` descreve pattern
- **Problema:** `02-component-library.md` cataloga 20 componentes; NENHUM é Slideover ou Drawer. 02 menciona "drawer" só como mobile sidebar via Sheet Radix. Spec dos quick-add slideovers (400ms, translateX, 480px) está orfão.
- **Ação:** adicionar **#21 Slideover** ao 02 com props/states/variants ou refatorar 03/04/09 pra usar Modal #14.

#### H2. Icone do Quest varia entre 3 opções em diferentes docs
- **Onde:** `DESIGN-SYSTEM.md:306` (`ScrollText`), `02-component-library.md:1402,1493` (`Target`), `03-interactions-spec.md:238` (`Compass`), `04-states-catalog.md:87,395` ("compass"/"cinza").
- **Problema:** DS §4.3.2 é declarado como "mapping canônico", mas 02 e 03 divergem dele.
- **Ação:** fixar UM ícone no DS e propagar. Atualizar 02 + 03.

#### H3. Key de localStorage para tour dismissal vs flag DB são mutuamente exclusivos
- **Onde:** `03-interactions-spec.md:691, 743` (`localStorage hq:tourDismissed:{campaignId}:{userId}`) vs `08-edge-cases-catalog.md:505, 513` (`user.seen_onboarding_v2` no DB + `campaigns[:id].seen_tour`)
- **Problema:** 03 diz "cosmético OK §5.5"; 08 postula tour state **no banco**. São modelos diferentes (per-device vs per-user).
- **Ação:** decidir se tour é DB-backed (necessário pra cross-device) ou localStorage (simples, single-device). Memory/SEO: user.seen_onboarding no DB é o padrão.

#### H4. BottomTabBar tem z-40 em 02; 07 declara z-50 no CSS example; 01 cataloga z-40 pra "Banner combat"
- **Onde:** `02-component-library.md:694` (`z-40`), `07-accessibility-spec.md:410` (`z-index: 50`), `01-design-tokens.md:373` (banner-combat=40).
- **Problema:** se combat banner e bottom tab bar ambos são z-40, qual fica por cima em mobile? Decisão explícita ausente.
- **Ação:** banner-combat deve ser z-45 ou bottom-tab deve ser z-30; documentar no 01.

#### H5. SoundboardChip e SceneAccordion referenciados mas inexistentes em 02
- **Onde:** `06-i18n-strings.md:195-198` (`campaign.run.soundboard_chip.*`), `04-states-catalog.md A.8, B.2`, `09-implementation-guide.md:311` (`SceneAccordion`)
- **Problema:** componentes assumidos no nível de story/i18n mas sem spec em 02 (props, variants, states).
- **Ação:** adicionar SoundboardChip e SceneAccordion ao 02, ou marcar como Fase C scope explícito.

#### H6. `npcs_in_scene` (proposal) vs `scene_entities` (schema-investigation) são nomes de tabela diferentes
- **Onde:** `redesign-proposal.md:739` (AC "npcs_in_scene joint table"), `schema-investigation-winston.md:46, 125` (`scene_entities`).
- **Problema:** story C.1 executa M2 (scene_entities) mas proposal AC cobra `npcs_in_scene`.
- **Ação:** reconciliar. Recomendação: usar `scene_entities` (polimórfica serve NPCs+PCs+monstros) e corrigir proposal §12.

#### H7. F-20 (Quests sub-tabs mobile cortadas) nunca mencionado fora de findings
- **Onde:** `findings.md:190-194`
- **Impacto:** fix presumivelmente vai cair em C.9 por extensão (chips horizontal-scroll), mas dev pode perder referência.
- **Ação:** adicionar nota explícita em 04-states-catalog ou 09 story.

#### H8. F-23 (sidebar/pill "Histórico" state desync) nunca endereçado
- **Onde:** `findings.md:209-211`
- **Impacto:** é consequência do F-03 (4 caminhos), que vai ser resolvido com shell único — mas o estado de sincronização entre active indicators não é mencionado em lugar algum. Se Fase D deleta V1, vira moot; se flag A/B mantém ambos vivos, bug persiste.
- **Ação:** mencionar como "naturalmente resolvido ao deletar V1 em Fase D; A/B period requer workaround".

#### H9. `aria-selected` em Modos conflita com `aria-disabled="true"` proposto pra lock
- **Onde:** `07-accessibility-spec.md:69` ("tab ganha aria-disabled mas NÃO desabilitar"), `02-component-library.md:572` (`ModeItem` não tem `aria-disabled` nem `locked` vira aria-label composto).
- **Problema:** padrão WAI-ARIA diz que `aria-selected` em `role="tab"` requer foco programável. Se `aria-disabled=true` está lá, screen readers anunciam "bloqueado" mas o botão continua clicável. Aria-label-clobbering no ModeItem (label = "Preparar (bloqueado durante combate)") + aria-disabled=true duplica info.
- **Ação:** escolher UMA convenção. Recomendação: `aria-disabled` + anúncio via live region, sem sufixo no label.

### 🟡 Medium

#### M1. Wireframe W8 (Recap desktop) no responsive-spec usa `@Torin` mas editor-placeholder do 06 usa `@personagem` genérico
- **Onde:** `05-responsive-spec.md:591` ("O grupo @Torin e @Capa Barsavi"), `06-i18n-strings.md:209` (`placeholder`: "O grupo @personagem foi até @local")
- **Impacto:** cosmético, mas placeholder genérico é mais correto pra i18n. Dev pode confundir sobre o que é dado de exemplo vs placeholder real.

#### M2. Hint `@` vs `[[]]` no editor: copy decisão vs execução
- **Onde:** `redesign-proposal.md:765` decisão 20 (`@` primário + `[[]]` alt), `06-i18n-strings.md:210` (hint "Digite @ pra linkar NPC ou use [[nome]]"), `05-responsive-spec.md:595` (ASCII W8 mostra "[Tab] pra abrir autocomplete"), `03-interactions-spec.md:220` (Char trigger é `@` OU `[[`)
- **Problema:** W8 ASCII menciona `[Tab]` como trigger, não `@`. Hint do 06 é OK. Divergência no hint final.
- **Ação:** editar o ASCII do W8 no 05.

#### M3. Density budget declara ≤8 elementos; W2 tem 8 visíveis + 4 colapsados = 12 potenciais
- **Onde:** `redesign-proposal.md §11.1` (W2 budget "≤8 visíveis + 4 colapsáveis"), `DESIGN-SYSTEM.md P5` ("≤8 acima da dobra")
- **Problema:** não está escrito se "acima da dobra" conta os 4 colapsados quando expandidos. Acceptance ambígua.
- **Ação:** explicitar: "≤8 expanded; colapsados contam como 1 cada".

#### M4. `CheckCircleItem` vs `CheckCircle` vs Radix Checkbox — 3 nomes pra mesma coisa
- **Onde:** `02-component-library.md:328-378` (section titled "5. Checkbox / CheckCircle visual") — componente descrito se chama `CheckCircle` em props mas DS §5 "5 componentes-âncora" lista `CheckCircle`, aderindo.
- **Impacto:** confusão mínima se dev lê a section inteira. Corrigir nome canônico.

#### M5. Copy "Meu personagem" no 06 e "MEU PERSONAGEM" nos wireframes ASCII são case diferentes
- **Onde:** `06-i18n-strings.md:245` (`"Meu personagem"`), `05-responsive-spec.md:450-451` ("MEU PERSONAGEM" caps).
- **Problema:** decisão 3.8 do 06 diz "CAPS só para micro/nano labels". Header não é micro. O micro/nano é a `label caps LS+8%`. Ou o wireframe está errado, ou é micro-label antes do nome próprio em Cinzel.
- **Ação:** esclarecer: header "Meu personagem" em sans 15/semi-bold + nome em Cinzel 20 embaixo. Corrigir ASCII.

#### M6. `aria-current="page"` vs `aria-current="true"` em SurfaceItem vs InitiativeRow
- **Onde:** `02-component-library.md:640` (SurfaceItem usa `aria-current="page"`), `07-accessibility-spec.md:100` (InitiativeRow usa `aria-current="true"` explicitamente NÃO-"page")
- **OK:** isso é intencional (navegação vs turno atual), mas **confunde leitor** sem explicação em 02. Adicionar nota.

#### M7. i18n tem `campaign.shell.quick_search_placeholder` e `quick_search_placeholder_mac` — mas 02-component-library QuickSearch usa apenas "Buscar NPCs, quests..."
- **Onde:** `02-component-library.md:805` ("Buscar NPCs, quests, ações..."), `06-i18n-strings.md:52-53`
- **Problema:** spec do componente com string hardcoded conflita com i18n keys. Dev pode seguir o exemplo.
- **Ação:** substituir string hardcoded por `{t('campaign.shell.quick_search_hint')}`.

#### M8. States-catalog `hq-scene-*` depende de schema que "pode não existir"
- **Onde:** `04-states-catalog.md B.2` ("Se schema não existe → fallback skeleton permanent + toast 'Cena requer migração de schema'")
- **Problema:** isso viola DS P3 "cockpit sob pressão" e P7. Toast "requer migração" vaza termo técnico. Usuário (Mestre) não sabe o que é.
- **Ação:** se schema não existe, ocultar surface Cena totalmente até M2 mergear; nunca mostrar toast técnico.

#### M9. Timing de `resolveMode()` pós-combate (`recentCombat`) tem 2 assinaturas
- **Onde:** `redesign-proposal.md:196` (`combat?.just_ended_within_minutes === 30`), `09-implementation-guide.md:186` (`recentCombat?: boolean`).
- **Problema:** proposal diz 30min literal; 09 aceita boolean abstrato. Dev não sabe se API é server-side (cálculo fresh) ou client-side (boolean chega pronto).
- **Ação:** definir contrato — recomendo server retorna `combat.ended_at` e client calcula.

### 🔵 Low

#### L1. Footnotes ASCII usam `[ico Pin]` em W4 mobile mas W1 mobile usa `[📅]` / `[🎯]` direto
- **Onde:** `05-responsive-spec.md:464` vs `:215-217`
- **Impacto:** W5 é mais consistente; dev vai ter que decidir entre `[ico Name]` (inferir Lucide) vs emoji visível. Em ASCII, ambos são OK. Mas o pattern dificulta leitura.

#### L2. "Minha Jornada" vs "Minha jornada" capitalização em body
- **Onde:** varias. Padrão varia. Baixa relevância.

#### L3. Z-scale nomeada `z-banner-combat` definida em DS §10.1 nunca é referenciada em 02/03/04
- **Onde:** `DESIGN-SYSTEM.md:737-743`
- **Impacto:** tokens definidos mas não consumidos; dev vai usar `z-[40]` arbitrary em vez da classe nomeada. Adicionar exemplo de uso em 02.

#### L4. Tailwind config em DS lista `text: { inverse: "#14161F" }` mas 01 declara `text-primary-foreground = #13131E`
- **Onde:** `DESIGN-SYSTEM.md:715` vs `01-design-tokens.md:48`. Mesmo bug de B1.

#### L5. `Meta-info` em mobile ASCII W1 tem "[ico Cal] Sex 25/Abr · 20h" enquanto desktop tem "📅 Sex, 25/Abr · 20h"
- **Onde:** `05-responsive-spec.md:205-218` vs ASCII W1 no proposal
- **Impacto:** inconsistência decorativa; decision: SVG gold em nav + emoji narrativo em meta é OK. Mas se "data da sessão" é meta-padrão vs meta-narrativa? Regra não explicitada.

#### L6. Tour badge "🎉" emoji em `tour.welcome_new_campaign`
- **Onde:** `06-i18n-strings.md:396` ("🎉 Campanha criada!").
- **Impacto:** DS §4.3.3 tem `🎉` como emoji permitido (celebração one-off). OK. Mas strings com emoji embutido dificultam a11y (screen reader vai ler "ícone de festa").

---

## 5. Top 5 ações corretivas antes de dev começar

Em ordem de ROI:

### 1. **Reconciliar os tokens de cor entre DS, 01, 07** (~2h)
Corrigir `#14161F` vs `#13131E`, success `#29A36E` vs `#28A569`, destructive `#E05C3B` vs `#EF4444`. Eleger 01 como fonte de verdade (é o único com HSL oficial) e atualizar DS §4.1.1 + 07 §5.1. **Sem isso, story B.1 entrega Tailwind config inválido.**

### 2. **Travar enum de `Mode` em inglês + adicionar decisão 21 para rotas player** (~30min)
Substituir todas as ocorrências de `'preparar' | 'rodar' | 'recap' | 'assistindo' | 'minha-jornada'` por `'prep' | 'run' | 'recap' | 'watch' | 'journey'` em 02, 03, 04 e `resolveMode()` do proposal. Adicionar decisão 21 oficial em §13 do proposal para `/watch` e `/journey`.

### 3. **Unificar HP tier thresholds** (~45min)
Remover tabela de threshold do DS §8.1 e do 02 §17 (HPBar). Manter apenas referência ao arquivo de código (`lib/hp/getHpStatus.ts`). Adicionar NOTA EM MAIÚSCULA: "Thresholds vêm do código; docs só descrevem UI". Isso fecha regra imutável de `feedback_hp_legend_sync.md`.

### 4. **Adicionar componentes faltantes ao 02-component-library** (~3h)
- **#21 Slideover** — ponte crítica pra quick-add/edit (§7, §4, §5 do 03).
- **#22 SoundboardChip** (pode ser var do ChecklistItem).
- **#23 SceneAccordion** ou reuso de Card+Collapsible.
- Remover ou reescrever seção "Gaps conhecidos (NOT scope V1)" em 02, que conflita com decisão 14 (killer-feats committed) e plano C.

### 5. **Endereçar F-20, F-22, F-23 em 09-implementation-guide** (~1h)
- F-20: anotar story C.9 explicitamente inclui mobile sub-tabs → chips.
- F-22: adicionar sub-task em B.6 ("HPBar display rules per F-22 spec").
- F-23: nota em Fase D que desync some ao deletar V1, OU registrar como risco do A/B period.

---

## 6. Observações finais

- O pacote é **maduro mas não integrado**. Cada doc foi claramente escrito por um agente diferente (Sally / Winston / 3 agents paralelos) e a ponte entre eles é fraca. O 00-INDEX.md não é "integration doc", é só tabela de arquivos.
- **Ninguém revisou o DS com o 01 lado a lado.** As divergências de cor e threshold são óbvias em 5min de diff, mas nenhum reviewer listou nos 4 adversarials da rev-proposal-review.
- **Decisão 13 (serif só em nomes)** é citada em 4 docs diferentes com exemplos diferentes. Dev vai acertar, mas o padrão merecia UMA lista canônica de "quando usar Cinzel" com 8 exemplos.
- **O caminho crítico de implementação começa em B.1 (tokens)** — e B.1 não roda com os tokens atuais sem mergear B1 da lista de gaps. **Essa é a ação de corte.**
- Stories do 09 estão bem estimadas mas a spec de rota (player `/journey` `/watch`) adiciona **~1h de ambiguidade por story nos 6 componentes que tocam roteamento**. Travar a decisão 21 elimina isso.

**Recomendação final:** não despachar Fase A antes de fechar os 4 blockers (B1-B4). Fase A sozinha é safe (mexe i18n + copy + CSS mínimo), mas **qualquer PR que toca `tailwind.config.ts` ou `lib/types/campaign-hub.ts` precisa do B1+B3 resolvido**.

---

## 7. PATCH NOTES — 2026-04-21 v1.1 (blockers fechados)

Após o review, Dani travou decisões canônicas #21 e #22 no `redesign-proposal.md`, autorizou fechar os 4 blockers + 2 findings órfãos (F-20, F-23) com juízo próprio. Patch aplicado:

### ✅ B1 — Tokens de cor DS ↔ 01 reconciliados
`DESIGN-SYSTEM.md §4.1` agora declara no topo: *"Source-of-truth atômica: 01-design-tokens.md. Este resumo é didático; valores canônicos vivem lá. Em caso de divergência, 01 vence."* Bloco de cores simplificado.

### ✅ B2 — HP tier thresholds alinhados com código
`DESIGN-SYSTEM.md §8.1` e `01-design-tokens.md §1.4` referenciam `lib/utils/hp-status.ts` como única fonte. Canônicos travados:
| Tier | Threshold | Label (EN nos 2 locales) |
|---|---|---|
| FULL | 100% | FULL |
| LIGHT | >70% e <100% | LIGHT |
| MODERATE | >40% e ≤70% | MODERATE |
| HEAVY | >10% e ≤40% | HEAVY |
| CRITICAL | ≤10% | CRITICAL |

Percentage strings em UI só via `formatHpPct(status, flagV2)`.

### ✅ B3 — Mode enum canônico
Decisão #21 no `redesign-proposal.md §13`:
```
type Mode = 'prep' | 'run' | 'recap' | 'journey' | 'watch'  // EN no código
```
Labels user-facing (PT-BR fixo nos 2 locales):
- `prep` → "Preparar Sessão"
- `run` → "Rodar Combate"
- `recap` → "Recaps"
- `journey` → "Minha Jornada"
- `watch` → "Assistindo"

`06-i18n-strings.md §2.2` atualizado.

### ✅ B4 — Rotas player `/journey` e `/watch` travadas
Cobertas pela decisão #21. Segmentos: `/prep`, `/run`, `/recap`, `/journey`, `/watch`.

### ✅ F-20 — Story A.8b no `09-implementation-guide.md`
Sub-tabs de Quests viram bottom-sheet via "Filtros" em mobile (mesmo pattern de F-16). 1h.

### ✅ F-23 — Story A.8c — resolvido por construção
`SURFACES[]` é única fonte de verdade no V2; sidebar + breadcrumb consomem da mesma, impossível desyncar. 0h.

### 📋 9 highs movidos pra Fase B
Seção nova no `09-implementation-guide.md` lista os 9 highs como follow-ups em PRs específicas de Fase B (Slideover, SoundboardChip, SceneAccordion, ícone Quest canônico, tour persistence híbrida, z-index banner-combat, schema `scene_entities` plural, aria-selected/disabled em ModeItem).

### Status pós-patch

| Antes | Depois |
|---|---|
| 🔴 4 blockers | ✅ 4 fechados |
| ❌ 2 findings órfãos | ✅ F-20 fechado (A.8b), F-23 por construção |
| 🟠 9 highs | 📌 listados como tarefas em PRs de Fase B |
| 🟡 9 mediums | 📋 documentados aqui pra dev consultar |
| 🔵 6 lows | 📋 idem |

**Resultado:** "maduro mas não integrado" → "maduro, integrado, com canônicas travadas e follow-ups rastreados". Fase A desbloqueada.

**Arquivos tocados na patch v1.1:**
- `redesign-proposal.md` (decisões #21 #22)
- `DESIGN-SYSTEM.md` (§4.1 cores, §8.1 HP, §3.2 tom, §2 personalidade)
- `01-design-tokens.md` (§1.4 HP tier)
- `06-i18n-strings.md` (§2.2 modes)
- `09-implementation-guide.md` (Stories A.8b, A.8c + highs de Fase B)
- `00-INDEX.md` (changelog + decisões 21-22)
- `SPEC-REVIEW-FINAL.md` (este bloco §7)
