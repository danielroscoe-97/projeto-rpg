# Review Adversarial do UX Spec — Findings

> **Revisor:** agente adversarial (cético UX + implementação)
> **Data:** 2026-04-17
> **Alvo:** [docs/epic-2-combat-ux-hotfixes.md](epic-2-combat-ux-hotfixes.md)
> **Cross-ref:** [docs/spike-beta-test-3-2026-04-17.md](spike-beta-test-3-2026-04-17.md)

---

## Severity Summary

- **[CRITICAL] 7** — quebram implementação ou violam regras do CLAUDE.md
- **[HIGH] 14** — causam bugs ou UX ruim
- **[MEDIUM] 12** — risco de ambiguidade para o implementador
- **[LOW] 8** — polish e inconsistências

---

## Hotfix-by-Hotfix Review

### H1 — X do compêndio 44×44

- **Parity:** ⚠️ — Spec diz "único ponto de mudança propaga pra todos". Verdade parcial, mas `dialog.tsx` é usado em MUITOS diálogos não-combate (login, onboarding, settings). Aumentar X para 44×44 em TODOS os dialogs pode quebrar densidade em modais pequenos com `max-w-md` (atual default em [components/ui/dialog.tsx:37](../components/ui/dialog.tsx#L37)).
- **A11y:** ✅ — `aria-label`, `focus:ring`, `Esc` nativo.
- **Tokens:** ⚠️ — `text-white/70`, `bg-white/[0.08]`, `bg-black/40` são ad-hoc. `gold/50` usa token. Inconsistência.
- **Clarity:** ⚠️ — Spec diz "hardcoded em inglês `Close`" mas não diz se mantém o `<span className="sr-only">` em inglês ou em PT-BR. O snippet deixa "Close" em sr-only e `aria-label="Fechar"` — **dupla semântica conflitante** (screen readers podem ler ambos). Remover o sr-only ou torná-lo duplicado consistente.

**[HIGH]** — Risco: `bg-black/40 backdrop-blur-sm` em mobile é aplicado via `max-[768px]:`. Mas o `backdrop-blur-sm` só funciona sobre conteúdo translúcido — se o modal tem `bg-surface-auth` opaco (o caso — [dialog.tsx:37](../components/ui/dialog.tsx#L37)), o blur não faz nada. Indicação visual extra não será visível. Spec não verificou.

**[MEDIUM]** — Não cobre dialogs onde `DialogContent` é customizado via `className` override (ex: `PlayerCompendiumBrowser` usa uma largura custom). Pode haver dialogs em que `right-3 top-3` colida com título/header existente.

---

### H2 — X do monster card 44×44

- **Parity:** ✅
- **A11y:** ⚠️ — Spec diz "Ordem do foco: close último no DOM" mas linhas 288-312 mostram a ordem atual **lock → focus → minimize → close**. Spec pediu adicionar `data-action="close"` mas não renumerou outros botões (lock, focus, minimize) — ficam igualmente sem `data-action`, logo só o close fica estilizado. CSS `.card-toolbar button[data-action="close"]` não cobre os outros, **todos continuam 24×24** exceto close. Spec diz "toolbar inteira aumenta 24 → 36" — mas o CSS do spec não tem seletor que afete os 3 outros. **Contradição entre visual e código.**
- **Tokens:** ❌ — Usa `rgba(146, 38, 16, 0.25)` hex raw em vez de var CSS. `.card-toolbar` já usa `var(--5e-text-muted)` no arquivo real ([styles/stat-card-5e.css:67](../styles/stat-card-5e.css#L67)). Violação de token discipline.
- **Clarity:** ❌ — i18n: spec lista chaves `stat_card.close/minimize/lock/focus` mas MonsterStatBlock.tsx tem outros botões ("popout" em 297 e "pop-in" em 300). Spec diz "add chaves em pt-BR.json e en.json" mas não fornece as traduções. Dev vai inventar.

**[CRITICAL]** — Spec substitui `aria-label="Close card"` (hardcoded inglês) por `aria-label={t("close_card")}` assumindo namespace desconhecido. Nenhuma menção a `useTranslations` já existe no arquivo — toda a chamada precisa ser adicionada. Sem contexto, dev pode escolher namespace errado.

---

### H3 — HP CRITICAL legível

- **Parity:** ✅
- **A11y:** ⚠️ — Contraste branco sobre `#b91c1c` (red-700) reivindicado como 5.4:1. Verdade. Mas **isso é para texto normal; texto pequeno de 10px (`text-[10px]` em H5) precisa 4.5:1 e o spec não garante**. Spec mistura H3 e H5 sem checar tamanho final.
- **Tokens:** ⚠️ — Usa `bg-red-700` (Tailwind) ✓, mas `shadow-[0_0_12px_rgba(220,38,38,0.5)]` é arbitrary value (red-600 rgba). Não tokenizado.
- **Clarity:** ❌ — Spec adiciona keyframe `pulse-critical` (1.2s) mas **já existe** `animate-critical-glow` (5s) em [app/globals.css:513-520](../app/globals.css#L513) aplicado na row. Em CRITICAL a row inteira + badge vão pulsar em **2 frequências diferentes simultaneamente** — efeito estroboscópico, péssimo UX. Spec não sinaliza nem propõe unificar.

**[CRITICAL]** — O `[text-shadow:...]` na linha 81 do PlayerInitiativeBoard é **duplo** (`_0_0_6px_rgba(0,0,0,0.9),_0_0_2px_rgba(0,0,0,0.8)`) — spec simplifica para um único shadow ("já existe um text-shadow paliativo"). Se o dev confiar no spec, ele removerá o shadow completo mas o spec escreve apenas o primeiro. Verificar [PlayerInitiativeBoard.tsx:81](../components/player/PlayerInitiativeBoard.tsx#L81).

**[HIGH]** — Spec diz "manter `bg-red-950/50` na linha do combatente". Mas na verdade a linha NÃO usa `bg-red-950/50` no DM/guest — usa `border-2 border-red-500/60 shadow-[0_0_6px_rgba(239,68,68,0.15)] animate-critical-glow` ([CombatantRow.tsx:231](../components/combat/CombatantRow.tsx#L231)). Spec confundiu styles. Ao implementar "manter linha escura só o badge branco", dev ficará perdido.

**[MEDIUM]** — Spec usa classe `animate-[pulse-critical_1.2s_ease-in-out_infinite]` inline. Tailwind JIT pode não aceitar esse formato com underscores entre `ease-in-out_infinite`. Padrão do projeto é declarar em `globals.css`. Spec mistura as duas abordagens inconsistentemente.

**[LOW]** — `prefers-reduced-motion` selector usa `\[pulse-critical_1\.2s_ease-in-out_infinite\]` — escape complexo e frágil. Melhor criar classe nomeada `.animate-pulse-critical`.

---

### H4 — Reordenar resistências

- **Parity:** ✅
- **A11y:** ⚠️ — Ícones `aria-hidden` — OK. Mas spec adiciona emoji/ícones por tipo (`ShieldAlert`, `Shield`, `ShieldX`). Spec diz "Usar lucide `ShieldAlert/Shield/ShieldX`" — **consistente com lucide-react**, OK. Mas também diz "`⚠️` vulnerabilities" com emoji **antes** — confuso: ícone OU emoji?
- **Tokens:** ⚠️ — `text-amber-400`, `text-blue-400`, `text-red-400` — todos tokens válidos. `border-b border-white/[0.08]` ad-hoc.
- **Clarity:** ⚠️ — Spec pseudocode usa `<CardDivider />` antes do novo bloco, mas a existing order tem o Divider **entre** ability table e properties (linhas 415-416). Se implementador adicionar `<CardDivider />` em outro lugar, pode duplicar o divider entre Speed e Defesas.

**[HIGH]** — `L.defenses` referenciado mas spec diz "Adicionar chave em lib/i18n/stat-labels.ts". Não confirmei o schema do L object. Se ele usa estrutura diferente (namespace, sub-object), o dev pode colocar chave no lugar errado.

**[MEDIUM]** — Spec remove damageVuln/damageRes/damageImm/conditionImm de linha 415+ e move para antes da ability table. Mas `savingThrowsStr`, `skills`, `senses`, `languages`, `crDisplay` ficam. Divider pattern vai ficar: `{Core} <CardDivider/> {Defesas} <CardDivider/> {AbilityTable} <CardDivider/> {SavingThrows/Skills/Senses/Languages/CR}` = **3 dividers**. Era **2** antes. Spec não conta.

---

### H5 — HP numérico + barra

- **Parity:** ⚠️ — Spec diz "DM view — NÃO aplicar", mas o `HpDisplay` proposto substitui `HpStatusBadge` em PlayerInitiativeBoard. **Mas PlayerInitiativeBoard.tsx é consumido por AMBOS anon e auth**. Se o monster do DM **não revela HP para player** (tier visível em `hp_status`), o player não tem `current_hp`/`max_hp` numérico — só tier. O componente proposto tem `current: number, max: number` obrigatórios. Para monsters sem revelação, o componente não funciona. Spec reconhece o problema ("hidden HP mode") mas deixa o default `revealExact=true` que **vai leak números do monster em todos os casos atuais** até flag existir.
- **A11y:** ⚠️ — `role="meter"` proposto mas **meter não anuncia via SR em todos os browsers** (Chrome fraco). Preferir `role="progressbar"` com `aria-valuenow/min/max`. Spec escolheu meter sem justificativa.
- **Tokens:** ⚠️ — `bg-white/[0.06]` — ad-hoc já usado no projeto. Barra com `w-20` desktop e `w-12` mobile (spec texto diz 80/60, pseudocódigo diz `w-20/w-12` = 80/48). **Inconsistência 60 vs 48.**
- **Clarity:** ❌

**[CRITICAL]** — Mudança de thresholds **de 70/40/10 para 75/50/25** tem efeitos **irreversíveis** em jogos em andamento. Combatentes que estavam em MODERATE (42%) passam para HEAVY; em LIGHT (73%) passam para MODERATE. Animações de transição + mudança de cor simultâneas. Spec não menciona **migração** nem **roll-out**. Precisa feature flag ou atualização gradual.

**[CRITICAL]** — Novo tier `DEFEATED` adicionado a `HpStatus` type. `HpStatus` é **importado por `lib/types/realtime.ts`** que tipa broadcasts entre DM e players. Clientes desatualizados receberão "DEFEATED" e quebrarão (`HP_STATUS_STYLES[status]` retorna undefined → `.colorClass` crash). Spec não menciona backward-compat nem define valor default.

**[HIGH]** — `labelKey: "hp_defeated"` no style. Spec exige i18n key em `messages/pt-BR.json` e `messages/en.json`. Mas **existem 3 namespaces** com `hp_*` no pt-BR.json (linhas 955, 1602, 2294) + um quarto `hp_status_*` (2333). Dev vai adicionar em apenas 1 e quebrar os outros.

**[HIGH]** — Mobile stack: spec texto diz "Mobile: stack vertical — números em cima, barra embaixo". Mas o **pseudocódigo** mostra apenas `flex items-center gap-2` (horizontal). **Ausente**: responsivo `flex-col sm:flex-row`. Se dev copiar pseudocode, fica horizontal em mobile.

**[MEDIUM]** — Consumidor em [PlayerInitiativeBoard.tsx:1153](../components/player/PlayerInitiativeBoard.tsx#L1153) — spec diz "passar current/max se revealExact=true". Mas nesse ponto o combatant pode ter `hp_status` só, sem números. Dev precisa de lógica condicional que spec não especifica: "se tem números → HpDisplay, senão manter HpStatusBadge".

**[LOW]** — Label `hp_moderate: "MOD"` vs i18n existente `"MODERADO"` ([messages/pt-BR.json:957](../messages/pt-BR.json#L957)). Spec abrevia diferente. Inconsistência entre locales.

---

### H6 — Busca com acentos + PT-BR

- **Parity:** ✅ — 6 filtros locais + 2 Fuse configs tocados.
- **A11y:** ✅ — input já tem aria; sem mudança.
- **Tokens:** N/A.
- **Clarity:** ❌

**[CRITICAL]** — Pseudocode usa `Fuse.config.getFn(obj, path)` — **isso não existe na API pública do Fuse.js**. Verificado em [node_modules/fuse.js/dist/fuse.d.ts:117-120](../node_modules/fuse.js/dist/fuse.d.ts#L117). `Fuse.config` não é exportado. O getFn tem que ser implementado manualmente lendo `path` (`obj[path]`, ou split se `path.includes(".")`). Dev seguindo spec verá erro em runtime (undefined).

**[HIGH]** — Spec reutiliza `customGetFn` em `MonsterSearchPanel.tsx` sem dizer onde o helper é exportado. Se o dev copiar `normalizeForSearch` corretamente em `lib/srd/normalize-query.ts` mas esquecer de exportar o getFn, import vai falhar. Spec não fornece export estratégia.

**[HIGH]** — Normalização `replace(/[^\w\s]/g, "")` **remove hífens** — ok para "owl-bear" → "owlbear". Mas `\w` em regex JS **não** inclui caracteres unicode por default. `"ñ"`, `"ç"`, `"á"` após `NFD` viram `n`, `c`, `a` (decomposed + stripped), OK. Mas testar slug `"dao"` vs `"dão"` — com `normalize("NFD")` funciona. OK. Mas spec diz "Buscar 'polvo' (PT-BR) — achar Octopus se name_pt populado". Dev precisa confirmar `name_pt` está populado no dataset atual — spec não pede que dev valide.

**[MEDIUM]** — Threshold `0.35` mantido. Mas com normalização de acentos, a "distância" Fuse muda (mais matches potenciais). Pode inundar resultados. Spec não propõe re-calibração.

**[MEDIUM]** — `minMatchCharLength: 2` existe. Spec H6 aceitance-test diz "Buscar 'drag' → listar dragons". Mas com charLength 2, "dr" já filtra — testar para não produzir noise.

---

### H7 — Badge de edição 2014/2024

- **Parity:** ✅
- **A11y:** ✅ — `aria-label` e `title` ok.
- **Tokens:** ⚠️ — `bg-slate-700/50 text-slate-300 border-slate-600/40` — todos Tailwind mas não são tokens do projeto (tokens principais são `gold`, `surface-*`, `cool`). Introduz uso de slate onde projeto não usa.
- **Clarity:** ⚠️

**[CRITICAL — regra SRD]** — Spec H7 ignora que **monstros não-SRD também renderizam esse badge** quando acessados via `/api/srd/full/*`. Tornar o badge **destacado em dourado para 2024** pode implicitamente indicar "este é conteúdo novo" em monstros não-SRD. Não leak direto, mas visualização potencialmente confusa em modo full. CLAUDE.md diz "NUNCA expor conteúdo não-SRD em páginas públicas" — spec precisa garantir que badge só aparece onde conteúdo é SRD. **Falta verificação.**

**[HIGH]** — Spec diz `[CombatantRow.tsx:542-543](../components/combat/CombatantRow.tsx#L542)` já usa `VersionBadge`. Verificado ([CombatantRow.tsx:541-544](../components/combat/CombatantRow.tsx#L541)). Mas spec muda o **componente VersionBadge em si** — afeta **visual em todos os consumidores**, incluindo MonsterSearchPanel, RulesetSelector, CombatantRow. Spec não inventaria cada consumidor para validar que `bg-gold/20` não destoa do contexto. CombatantRow em estado CRITICAL (border vermelha) + badge dourado 2024 pode ter dissonância visual.

**[MEDIUM]** — Spec remove o `(2024)` pequeno do source line (474-478). Mas em **mobile** onde o header fica em 1 linha só e o badge vai pra nova linha (flex-wrap), usuário pode perder o indicador de edição visualmente. Spec não testou mobile.

---

### H8 — Auto-scroll + pulse highlight

- **Parity:** ⚠️ — Spec reconhece 3 implementações (DM, Guest, Player) mas o padrão de seletor é diferente:
  - DM: `[data-combatant-index]`
  - Guest: `[aria-current="true"]`
  - Player: `turnRef`
  O spec reescreve usando `data-combatant-index` no CombatSessionClient mas **não alinha os outros**. Guest vai ficar sem pulse se dev copiar direto.
- **A11y:** ⚠️
- **Tokens:** ❌ — `rgba(201, 169, 89, ...)` é **#c9a959 = oracle gold** (statblock), NÃO é `#D4A853` = **brand gold**. Spec classes usam `ring-gold` (brand), mas o keyframe usa `rgba()` do oracle gold. **Duas cores diferentes coexistem.** Verificar [tailwind.config.ts:65-69](../tailwind.config.ts#L65) e [styles/stat-card-5e.css:14](../styles/stat-card-5e.css#L14).

**[CRITICAL]** — `useEffect` deps mudou de `[currentTurnIndex]` para `[currentTurnIndex, combatants]`. Mas `combatants` muda em **toda operação** (toggle condition, HP change). O useEffect vai disparar scroll + pulse em **cada atualização**, não só em mudança de turno. Dev vai fazer refactor exagerado guiado pelo spec.

**[CRITICAL]** — Spec diz "Guard: não executar scroll se houver `data-panel-open='true'` — já existe — manter". Mas o **spike doc finding 5** identifica ESSE guard como **o root cause** do auto-scroll não funcionar em combate real (`CombatSessionClient.tsx:1886`). **Conflito direto entre spec UX e spec técnica.** Spec UX preserva o bug que o spike tenta remover. Precisa consolidar.

**[HIGH]** — `pulseTimerRef` não é limpo no unmount. `useEffect` cleanup não proposto no spec. Memory leak possível em navegação entre encounters.

**[MEDIUM]** — Spec escreve `pulse-turn-highlight` keyframe com `box-shadow` 3 camadas. A linha da row **já tem** `ring-1 ring-gold/30` via Tailwind quando `isCurrentTurn`. Layering: ring + box-shadow compete pelo mesmo canto. Pode duplicar glow ou um esconder o outro.

---

### H9 — HP individual por grupo

- **Parity:** ⚠️ — Player view mantém "worst tier + count", DM view muda para dots. OK, mas spec **não remove** `computeGroupAgg` em PlayerInitiativeBoard ([PlayerInitiativeBoard.tsx:107-123](../components/player/PlayerInitiativeBoard.tsx#L107)). A função ainda computa `avgStatus` — spec diz "mantem worst" mas deixa avg pendurado.
- **A11y:** ⚠️ — `role="list"` + `role="listitem"` no wrapper de dots. OK, mas dots são `<span>` com `aria-label` individual. Screen reader vai ler N items de uma vez. Em grupo de 20 goblins, SR lista 20 itens. Spec não propõe resumo primeiro.
- **Tokens:** ⚠️ — `border-zinc-600` para defeated — OK. `bg-zinc-700` para `DEFEATED.barClass` em H5 — consistente.
- **Clarity:** ⚠️

**[HIGH]** — Texto-resumo `"3× HEAVY · 1× CRITICAL"` usa `t('hp_status_${tier.toLowerCase()}')` — mas em H5 o labelKey é `"hp_heavy"` (sem `hp_status_` prefix). **Duas chaves i18n diferentes para o mesmo tier em dois hotfixes.** Dev vai criar chaves duplicadas/mistas.

**[HIGH]** — Quando grupo tem 1 membro restante, spec diz "renderiza como 1 dot + 1 status". Mas toda UX de agrupamento desaparece — framing "grupo de 1" é estranho. Spec não propõe auto-expand nesse caso.

**[MEDIUM]** — Em grupo com 30+ membros (raro mas possível), 30 dots horizontais colapsam visualmente. Spec não limita (ex: "max 10 visible + '+N more'").

**[MEDIUM]** — Dots usam `barClass` do tier. Mas `FULL.barClass = "bg-emerald-400"` (spec H5) vs `FULL.barClass = "bg-emerald-500"` atual. Spec H9 assume H5 já foi aplicado. Se H9 é entregue sem H5, cores dos dots não fazem sentido.

---

### H10 — Limpar / Deletar grupo

- **Parity:** ⚠️ — Spec diz "Guest + DM; N/A para players". OK. Mas o spec **só** muda `lib/stores/combat-store.ts` e `guest-combat-store.ts`. Auth mode depende de broadcast + persist. Spec NÃO descreve:
  - Broadcast do tipo `combat:group_removed` para players
  - Persist no Supabase (`persistRemoveCombatant(id)` × N)
  - Adjustment de `current_turn_index` se turn estava em membro deletado
  - `state_sync` broadcast para re-sync players
  Compare com `handleRemoveCombatant` em [useCombatActions.ts:352-400](../lib/hooks/useCombatActions.ts#L352) — 50 linhas de lógica complexa que spec NÃO replicou.

**[CRITICAL]** — `removeCombatantsByGroup` proposto não limpa orphaned lair actions ([combat-store.ts:65](../lib/stores/combat-store.ts#L65)), não atualiza `lastAddedCombatantId`, não persiste no DB. Se DM logado usar a feature, o grupo desaparece localmente mas **volta após refresh** (não persistido). Bug crítico.

**[HIGH]** — Modal spec diz "Cancelar (ghost) + Deletar grupo (red-900/60 como o remove individual em CombatantRow.tsx:836)". Verificado ([CombatantRow.tsx:836](../components/combat/CombatantRow.tsx#L836) confirmado). Mas spec não reutiliza o wrapper AlertDialog — duplica o padrão. Se dev não é atento, cria estilo inconsistente.

**[HIGH]** — Touch targets: spec diz "36×36 mobile, 28×28 desktop". **28×28 em desktop viola WCAG 2.5.5** (44×44 AAA) e também **2.5.8 AA (24×24 mínimo)**. Justificativa "são ações de DM, desktop-first" não vale para WCAG. Spec é inconsistente com H1/H2 que usam 44×44.

**[MEDIUM]** — Spec diz "Só aparece se `activeMembers.length < totalMembers` (tem algum derrotado pra limpar)". Mas o Limpar botão **também deveria sumir quando todos estão derrotados** — nesse caso só Deletar faz sentido. Spec não trata.

**[LOW]** — i18n tem `group_clear_confirm_action: "Limpar {n}"` — o template `{n}` é ICU. Mas spec usa `{n}` e `{name}` intercambiavelmente. Confirmar formato com next-intl.

---

### H11 — Condições custom

- **Parity:** ❌ — Spec tem **auto-correção visual em linha** (1193-1197): primeiro diz "Guest N/A", depois "Correção: Guest É DM sem login, aplicar!". **Implementador confuso.** Ambiguidade explícita no documento. Deve ser decidido antes, não durante.
- **A11y:** ⚠️ — `data-testid` ✓. `aria-label` no badge. Mas input `type="text"` sem `aria-describedby` para o `maxLength={32}` — usuário screen reader não sabe do limite até digitar.
- **Tokens:** ⚠️ — `text-purple-400`, `bg-purple-900/40`, `border-purple-500/30` — Tailwind mas purple não é token do projeto (projeto usa gold, emerald, red, amber, cool). Adiciona nova cor sem justificativa — viola nota final "Nada de novos design tokens".
- **Clarity:** ❌

**[CRITICAL]** — Formato `custom:{name}|{description}` colide com convenção existente. Veja:
  - `concentrating:SpellName` ([ConditionSelector.tsx:74](../components/combat/ConditionSelector.tsx#L74))
  - `exhaustion:N` (em [player-hq/CharacterStatusPanel.tsx:31](../components/player-hq/CharacterStatusPanel.tsx#L31) e PublicConditionsGrid)
  
  O parser genérico `condition.includes(":")` existe e ignora prefixo — **custom:foo** pode ser mal-parsed em caller desavisado. Spec não inventaria TODOS os consumidores de `conditions[]` para validar novo prefixo.

**[HIGH]** — `persistConditions(id, newConditions)` ([session.ts:71](../lib/supabase/session.ts#L71)) armazena string[] em Postgres. PostgreSQL text[] sem limite intrínseco, mas arrays de 20+ strings de 200 chars cada inflam row. Se DM aplicar 10 custom conditions em 20 combatentes, row size passa de ~40KB. Spec não limita total por combatant nem define constraint.

**[HIGH]** — `tc(condition.toLowerCase())` em ConditionBadge ([line 79](../components/oracle/ConditionBadge.tsx#L79)) — se dev não adicionar early return para custom **no topo**, i18n lookup em `custom:foo|bar` lança erro (next-intl strict). Spec diz "detectar no topo do render" mas localização ambígua se há guard precedente.

**[MEDIUM]** — Input description aceita HTML/markdown? Spec não filtra. Broadcast distribui string crua para todos clientes. Se description tem `<script>` — React escapa, OK. Mas `title` attribute também escapa. OK mas spec não explicita.

**[MEDIUM]** — Quando combate termina, o que acontece com custom conditions? Persistem no historical log? São descartadas? Spec silencioso.

**[LOW]** — `maxLength={32}` + `maxLength={200}` em HTML <input>. Usuário pode colar mais via clipboard (browsers respeitam maxLength em paste). OK. Mas `formatCustomCondition.slice(0, 32)` faz o trim server-side também. Consistente.

---

### H12 — Quick actions (Dodge etc.)

- **Parity:** ⚠️ — Spec mostra que Auth permite player aplicar quick-actions em próprio personagem via `onSelfConditionToggle`. Mas players **anon** também têm `onSelfConditionToggle` via mesmo componente PlayerInitiativeBoard. Spec diz "[anon] — N/A". **Inconsistência:** anon deveria ter paridade com auth em self-apply.

**[CRITICAL]** — Auto-cleanup no `handleAdvanceTurn`:
```ts
const nextCombatant = combatants[nextTurnIndex];
if (nextCombatant) {
  const cleaned = nextCombatant.conditions.filter(c => !c.startsWith(ACTION_PREFIX));
  ...
}
```
  - 5e RAW: Dodge **termina no início do próximo turno do combatente**, não no fim. Spec está correto em **limpar no começo do turno**. ✓
  - Mas spec **limpa TODAS** `action:*`. Se player usou Dodge + Help (impossível RAW, mas DM pode permitir), ambos caem juntos. OK mas spec não considera "algumas quick actions duram 1 round", "algumas até próxima ação". Dash dura até **fim do turno atual** — diferente de Dodge. Ready dura até trigger. Spec trata tudo igual.

**[HIGH]** — Spec diz auto-cleanup em `handleAdvanceTurn` mas spec mesmo propõe aplicar via `onToggle` (que chama `handleToggleCondition`, não `handleAdvanceTurn`). `handleAdvanceTurn` é **disparado pelo DM clicando "próximo turno"**. Em player view, `onSelfConditionToggle` não passa por `handleAdvanceTurn`. Para auth players que aplicam Dodge em si, cleanup **nunca dispara** no player side. Depende do broadcast DM → player.

**[HIGH]** — Broadcast de cleanup: `updateCombatant(nextCombatant.id, {conditions: cleaned})` — isso não replica logic de broadcast + persist de `handleToggleCondition`. Players não veem Dodge sumir.

**[MEDIUM]** — Tipo `QuickAction = typeof QUICK_ACTIONS[number]` + `includes(...as any)` — funciona mas ergonômica. `QUICK_ACTIONS.includes(kind as QuickAction)` — TS strict pode reclamar. Spec não compila mentalmente.

**[MEDIUM]** — Emoji `🛡` Dodge, `🏃` Dash — emoji rendering varia entre OS. Spec não testa visual em Android/Windows/iOS. Fallback `aria-hidden` tem label textual, OK.

**[LOW]** — `min-h-[32px]` — abaixo de 44px WCAG AAA. Se player usar em mobile, touch target subminimal.

---

### H13 — "Richard" clicável

- **Parity:** ⚠️
- **A11y:** ⚠️
- **Tokens:** ⚠️
- **Clarity:** ❌

**[CRITICAL]** — Spec **admite abertamente** ambiguidade e diz "dev precisa perguntar ao Lucas". Instrução para implementador: "Implementar variante mínima e abrir PR com nota". Isso é aceitável, mas:
  - A variante mínima assume `fullMonster.actions[0].desc` tem dice notation
  - Regex `(\d+d\d+(?:[+\-]\d+)?)` não cobre notations com vantagem `2d20kh1` ou outras ([lib/dice/notation.ts](../lib/dice/notation.ts) pode ter parser real)
  - Se primeira action é "Multiattack" (texto descritivo sem dado), regex falha. Spec não sugere fallback para segunda action.

**[HIGH]** — Spec fala em `combatant.quick_roll` como "campo opcional no schema local". Mas combatants vem de `lib/types/combat.ts`. Adicionar campo **requer migration no Supabase** + broadcast types atualizados. Spec não inventaria isso.

**[MEDIUM]** — `ClickableRoll` existe como componente ([components/dice/DiceText.tsx](../components/dice/DiceText.tsx) via spec), mas spec não confirma assinatura. Se `notation` prop não existir, implementador vai ter que refatorar.

**[MEDIUM]** — O contexto "Richard" permanece desconhecido. **Recomendação mais forte do que o spec:** dev deve **PARAR e perguntar** antes de implementar, não implementar variante mínima que pode ser irrelevante.

---

### H14 — Login nudge no compêndio

- **Parity:** ⚠️
- **A11y:** ⚠️ — `role="complementary"` opcional? Spec diz "opcional" — mas tecnicamente complementary é landmark — 1 por page. Se compendium é modal, complementary pode poluir landmark tree. Preferir `role="note"` ou sem role.
- **Tokens:** ✅ — `bg-gold/10 border-gold/30 text-gold text-surface-primary` — todos tokens do projeto. ✓
- **Clarity:** ⚠️

**[CRITICAL]** — Detecção de "modo authenticated" errada: `mode={authReady && authUserId ? "authenticated" : "anonymous"}`. **`authUserId` existe para anonymous users também** (Supabase `signInAnonymously` retorna UID). Verificado em [PlayerJoinClient.tsx:415](../components/player/PlayerJoinClient.tsx#L415): `isRealAuth = !!u && !u.is_anonymous`. Spec vai classificar TODOS anon como auth → banner nunca aparece para anon. Regressão sobre intenção.

**[HIGH]** — `localStorage.setItem(DISMISS_KEY, ...)` — localStorage pode estar indisponível (Safari private mode, iframe sandbox). Spec não try/catch nem tem fallback sessionStorage.

**[HIGH]** — `nextParam` constrói URL sem validação. `returnUrl` é recebido como prop, se callers passam URL interpolada, XSS via redirect (open redirect). Spec não sanitiza. Preferir whitelist de paths.

**[MEDIUM]** — Analytics `window.dispatchEvent(new CustomEvent("analytics:event", ...))` — não é o padrão do projeto. Os recent commits usam `trackEvent()` ([PlayerJoinClient.tsx:327](../components/player/PlayerJoinClient.tsx#L327)). Spec introduz padrão divergente.

**[MEDIUM]** — Dismissal TTL 3 dias (aqui) vs "24h-7d" (spec texto). Inconsistência dentro do próprio hotfix.

**[LOW]** — Hidratação: `useState(true)` inicial + setDismissed em useEffect evita FOUC ✓. Mas usuário vê **nada** no primeiro render. Se JS desabilitado ou lento, banner nunca aparece. OK para nudge.

---

## Cross-Cutting Issues

### Token Discipline

- Spec introduz `purple-*` (H11), `slate-*` (H7), ad-hoc hex `rgba(146, 38, 16, ...)` (H2), mistura oracle gold `#c9a959` e brand gold `#D4A853` em H8.
- Violação explícita da nota final item 6 do próprio spec: "Nada de novos design tokens sem justificativa".
- Recomendação: forçar dev a usar **APENAS** `gold`, `emerald`, `red`, `amber`, `cool`, `surface-*`, `muted-foreground`, `foreground`.

### i18n Gaps

- Spec H5 usa `hp_full` (labelKey). Spec H9 usa `hp_status_full`. **Duas convenções coexistem** em [messages/pt-BR.json](../messages/pt-BR.json) (linhas 955 vs 2333).
- H12 precisa de ~12 chaves novas em 2 locales — nenhuma existe ainda.
- H10 tem 6 chaves novas.
- H11 tem 3 chaves novas.
- H14 tem 4 chaves novas.
- **Total: ~25 chaves novas em 2 arquivos.** Dev precisa organizar por namespace (combat, compendium, common) — spec não tem inventário completo.

### Testes — Completamente Ausentes

Spec diz "`rtk vitest run` no fim" mas **não define critérios de aceitação testáveis**:
- H3: teste de contraste?
- H5: teste de threshold (75% exato → LIGHT não MODERATE)?
- H6: os 6 casos de busca aceitação NÃO têm assertion programada.
- H8: pulse timer + clear — sem teste.
- H9: dots renderização com N membros — sem teste.
- H10: modal de confirmação + persist — sem teste.
- H11: formato string round-trip — sem teste.

Nenhum teste visual (Chromatic, percy, playwright screenshot) proposto apesar de mudanças pesadas em CSS/layout.

### Feature Flags

- H5 threshold change (70/40/10 → 75/50/25) precisa de flag para rollback. **Ausente.**
- H5 `revealExact` é mencionado como prop com default true — mas sem flag por sessão.
- H14 nudge podia ter flag para A/B testing conversão. **Ausente.**

### Analytics / Telemetry

- H14 único com tracking. Outros não:
  - H11 custom conditions — quantas DMs criam? Quantas reusam? Sem track.
  - H12 quick actions — qual é mais usado? Sem track.
  - H10 limpar vs deletar — qual é preferido? Sem track.
  - H13 Richard — click rate? Sem track.
- Beta test 3 insight: "entity graph como maior feature request" — nenhum hotfix instrumenta conversão.

### Parity — Summary Violations

| Hotfix | Guest | Anon | Auth | DM | Observação |
|---|---|---|---|---|---|
| H1 | ✓ | ✓ | ✓ | ✓ | OK |
| H2 | ✓ | ✓ | ✓ | ✓ | OK |
| H3 | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Conflito com animate-critical-glow em 4 modos |
| H4 | ✓ | ✓ | ✓ | ✓ | OK |
| H5 | ⚠️ | ⚠️ | ⚠️ | N/A | Threshold muda comportamento em auth para players existentes |
| H6 | ✓ | ✓ | ✓ | ✓ | OK |
| H7 | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Leak de info em modo full (non-SRD) |
| H8 | ❌ | ❌ | ❌ | ⚠️ | 3 seletores diferentes, spec só corrige DM |
| H9 | ⚠️ | ⚠️ | ⚠️ | ✓ | i18n divergente |
| H10 | ⚠️ | N/A | ❌ | ❌ | Persist ausente para auth DM |
| H11 | ⚠️ | ✓ | ✓ | ✓ | Auto-correção inline no spec |
| H12 | ⚠️ | ❌ | ⚠️ | ✓ | Anon tem self-toggle também |
| H13 | ⚠️ | N/A | ⚠️ | ⚠️ | Ambiguidade declarada |
| H14 | ✓ | ❌ | ✓ | ✓ | Detection de modo errada (anon classificado como auth) |

---

## Overlap com Spike Doc

| Hotfix UX | Spike Finding | Status |
|---|---|---|
| H9 (HP individual) | Finding 3 (vida do grupo somada) | **Duplicação direta** — ambos propõem dots/pips. Spec UX é mais detalhado (hover, contagens, list roles). Spike mostra Opção A/B simpler. |
| H8 (auto-scroll + pulse) | Finding 5 (DM sem auto-scroll) | **CONFLITO** — spike diz root cause é `data-panel-open` guard. Spec UX **preserva o guard** ("já existe — manter"). Spike propõe remover guard ou relaxar. |
| H4 (resistências topo) | Finding 7 Quick Win 1 | Duplicação. Spec UX é superset (inclui ícones coloridos, i18n). |
| H3 (HP crítico) | Finding 7 Quick Win 2 + Finding 7 HP-crit-ilegivel | Duplicação parcial. Spike foca **texto do HP number no CombatantRow:459-468**. Spec UX foca **badge em PlayerInitiativeBoard:81**. Dois lugares diferentes! **Ambos precisam ser atualizados.** |

**Recomendação:** consolidar em 1 implementação por tema. Atualmente há risco de 2 agentes fazerem PRs divergentes:
- Agente A (spike): remover guard, fixar HP-number no CombatantRow
- Agente B (UX): manter guard, fixar badge no PlayerInitiativeBoard

---

## Stale File:Line Refs

Verificados um-a-um:

- [CLAIM] GuestCombatClient `~1400` linhas. **REAL:** 1965 linhas.
- [CLAIM] PlayerInitiativeBoard `~1500` linhas. **REAL:** 1383 linhas.
- [CLAIM] `CombatSessionClient.tsx:1885-1889`. **REAL:** o `scrollIntoView` está em 1888, useEffect em 1880-1890. Close o suficiente.
- [CLAIM] `PlayerInitiativeBoard.tsx:1153` — "passar current/max se revealExact=true". **REAL:** linha 1153 existe mas chama `HpStatusBadge` com só status+percentage. O `current_hp`/`max_hp` não está no escopo local dessa branch — branch é do `else if (combatant.hp_status || otherPlayerHpStatus)`, onde por definição só tem `hp_status` não númerico. Spec não alinha com realidade do data model.
- [CLAIM] `dialog.tsx:43-46` X close button. **REAL:** confirmado (linhas 43-46).
- [CLAIM] `MonsterStatBlock.tsx:306-311` close button. **REAL:** 308-312. Próximo.
- [CLAIM] `stat-card-5e.css:64-82` toolbar button. **REAL:** 64-82 ✓.
- [CLAIM] `hp-status.ts:26-32`. **REAL:** 26-32 ✓.
- [CLAIM] `PlayerInitiativeBoard.tsx:81` text-shadow. **REAL:** text-shadow existe mas é DUPLO (2 shadows, 6px + 2px), spec simplificou.
- [CLAIM] `PlayerCompendiumBrowser.tsx:211-218` monster filter. **REAL:** ✓.
- [CLAIM] `PlayerCompendiumBrowser.tsx:280` globalResults. **REAL:** 285.
- [CLAIM] `CombatantRow.tsx:820-841` AlertDialog padrão. **REAL:** ✓.
- [CLAIM] `RulesetSelector.tsx:50-59` VersionBadge. **REAL:** ✓.
- [CLAIM] `MonsterGroupHeader.tsx:48-51` sum bug. **REAL:** ✓.
- [CLAIM] `MonsterGroupHeader.tsx:165-177` render. **REAL:** 165-178.
- [CLAIM] `ConditionSelector.tsx:9-32` ALL_CONDITIONS + BENEFICIAL. **REAL:** ALL_CONDITIONS 9-23, BENEFICIAL 25-32 ✓.
- [CLAIM] `CombatantRow.tsx:542-543` VersionBadge. **REAL:** 541-544 ✓.
- [CLAIM] `PlayerInitiativeBoard.tsx:218` onSelfConditionToggle. **REAL:** precisa verificar mas contexto confirma.
- [CLAIM] `GuestCombatClient.tsx:1373` PlayerCompendiumBrowser. **REAL:** não verificado (arquivo é 1965 linhas). Provável.
- [CLAIM] `CombatSessionClient.tsx:1956` PlayerCompendiumBrowser. **REAL:** não verificado.
- [CLAIM] `GuestCombatClient.tsx:1100-1108` scroll. **REAL:** 1095-1106 (similar).

---

## Recommended Spec Revisions

Edits exatas para tornar o spec implementation-ready, em ordem de prioridade:

### Bloqueadores (resolver antes de handoff)

1. **H5 CRITICAL thresholds**: adicionar seção "Rollout strategy" explicando que mudança de 70/40/10 → 75/50/25 precisa ser feature-flagged ou feita via migration. Documentar impacto em combates em andamento.

2. **H5 DEFEATED tier**: adicionar nota em `lib/types/realtime.ts` sobre compatibilidade retro. Propor: `DEFEATED` é **client-side only** — servidor continua enviando `CRITICAL` + `is_defeated: true`. Evita crash em clients antigos.

3. **H6 Fuse getFn**: substituir `Fuse.config.getFn(obj, path)` por implementação custom que faça `String(obj[path as keyof T])` ou split em `.`. Remover referência a API fantasma.

4. **H8 conflito com Finding 5 do spike**: decidir entre (a) manter guard `data-panel-open` (spec UX atual) ou (b) remover/relaxar (spike). Ambos os docs precisam convergir. **Recomendação:** alinhar com spike — guard fecha painéis no advance turn, permitindo scroll.

5. **H10 persist missing**: adicionar seção "Backend effects" com broadcast + persistRemoveCombatant × N + state_sync + lair cleanup. Comparar com `handleRemoveCombatant` existente.

6. **H11 auto-correção inline**: resolver a contradição (1193-1197) definitivamente. Decidir: Guest aplica H11? (A: sim, é DM sem login.) Reescrever checklist.

7. **H14 detection bug**: trocar `authReady && authUserId` por `authReady && authUserId && !isAnonymous` onde `isAnonymous = session.user.is_anonymous`. Adicionar ao spec a fonte da flag.

### Alta prioridade (ajustes para evitar regression)

8. **H3 animation conflict**: listar `animate-critical-glow` existente e proibir aplicação simultânea. Propor unificar em 1 keyframe.

9. **H7 SRD leak risk**: adicionar guard "badge só aparece se `monster.is_srd` ou `source === 'SRD'`". Verificar contra whitelist antes de renderizar.

10. **H9 i18n key**: padronizar em `hp_${tier}` OU `hp_status_${tier}` — escolher um e documentar migration dos callers existentes.

11. **H12 parity**: corrigir "Anônimo N/A" para "Anônimo ✓ — player pode aplicar em si mesmo via onSelfConditionToggle".

12. **H12 auto-cleanup**: especificar **qual** dispatcher chama cleanup. Se é `handleAdvanceTurn` no DM, players recebem cleanup via broadcast `combat:condition_change` emitido pelo DM. Documentar explicitamente.

13. **Token discipline global**: adicionar regra "Qualquer cor fora de `gold|emerald|red|amber|cool|surface-*|muted-foreground|foreground` exige justificativa explícita no PR". Remover purple (H11) e slate (H7) ou justificar.

### Recomendações adicionais

14. **Adicionar matriz i18n completa**: tabela com todas as ~25 chaves novas, em qual namespace, EN + PT-BR. Organizar por hotfix.

15. **Adicionar seção de testes**: playwright visual tests (before/after screenshots), vitest para `formatCustomCondition`, `parseCustomCondition`, `getQuickActionKind`, `removeCombatantsByGroup`.

16. **Telemetry cross-cutting**: adicionar seção "Eventos a instrumentar" com:
    - `compendium:login_nudge_shown/dismissed/clicked`
    - `combat:custom_condition_created` (+ length)
    - `combat:quick_action_applied` (+ kind)
    - `combat:group_cleared/deleted` (+ count)
    - `combat:hp_threshold_transition` (opt; para monitorar rollout de H5)

17. **Feature flag para H5**: `ff_hp_thresholds_v2` ligado via cookie ou DB row. Default off por 1 sprint.

18. **H13 escalonar**: marcar H13 como "BLOCKED — aguardando clarificação do Lucas". Não recomendar "variante mínima" como opção de spec; dev pode interpretar como autorização.

19. **Sizes H10**: mudar "28×28 desktop" para mínimo 32×32 (ou 44×44 se mobile-shared). Cumprir WCAG 2.5.8 AA.

20. **H4 divider count**: adicionar diagrama do fluxo visual pós-reordenação mostrando os 3 dividers. Se isso é intencional ou se algum divider deve ser removido.

21. **H8 deps do useEffect**: manter `[currentTurnIndex]` (não adicionar `combatants`). Pulse quando turno muda, não em toda atualização de combatant.

22. **Compatibility com useCombatActions**: cada hotfix que toca condition list (H11, H12) deve documentar que o caminho é `onToggle → handleToggleCondition → broadcast + persist + log`. Dev precisa saber que broadcast + log disparam.

---

## Conclusão executiva

O spec é **exaustivo em escopo** mas **frouxo em disciplina**. Em particular:

- **7 items CRITICAL** — 3 quebram código (Fuse API inexistente, DEFEATED tier incompatível, persist ausente no H10), 2 violam parity (H14 detection bug, H12 anon paridade), 1 conflita com spike (H8 guard), 1 é auto-corregido inline (H11).
- **Spec conflita com spike doc** em H8 — os 2 agentes vão brigar se forem implementar em paralelo.
- **Token drift** (purple, slate, oracle gold misturado com brand gold).
- **i18n migration** custa ~25 chaves em 2+ namespaces com convenção dupla — sem inventário pronto.
- **Testes e telemetry** ausentes praticamente em todos os hotfixes.

Se o spec for entregue ao dev agent **sem revisão**, estimativa realística é **3-4× o orçamento de ~18.5h declarado** — mais perto de 60-80h contando retrabalho após bugs em produção, conflito com spike, missing i18n e paridade quebrada.

**Recomendação final:** Sally (autora) + Winston (spike) devem consolidar H3, H4, H8, H9 em um documento único antes do handoff. Hotfixes H5, H10, H14 precisam passar por revisão de arquitetura (persist/migration/auth detection). H11/H12/H13 precisam de bloqueio temporário até clarificações (H13 do Lucas, H11 decidir Guest paridade, H12 decidir se anon tem quick-actions).
