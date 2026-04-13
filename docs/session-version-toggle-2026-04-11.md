# Sessão: Monster Version Toggle (2014/2024) — 2026-04-11

## Problema Reportado

Na tela de construção do combate ("Novo Encontro"), o DM não conseguia alternar a visualização dos monstros entre as versões 2014 e 2024 do D&D 5e. Nem pelo monstro individual, nem pelo filtro de busca.

**Screenshots:** DM pesquisava "goblin" e via todos os resultados na versão 2014, sem forma de ver os stats da versão 2024.

## Decisão Arquitetural: Duas Vias de Troca

**Decisão:** Implementar troca de versão por DOIS caminhos simultâneos.

**Por quê:** O DM precisa de flexibilidade para montar encontros mistos (ex: Owlbear 2014 + Goblin 2024). Oferecer apenas o filtro global forçaria o DM a ficar alternando entre versões. Oferecer apenas o toggle por monstro exigiria muitos cliques. As duas vias se complementam.

### Via 1: Filtro de Versão no Painel de Busca
- RulesetSelector (botões 2014/2024) dentro do painel de filtros (⚙ Filtros)
- Ao trocar, recarrega toda a lista de monstros da versão selecionada
- Prop `onRulesetChange` propagada para o componente pai

### Via 2: Toggle Individual por Monstro
- Badge de versão (2014/2024) em cada resultado de busca é clicável
- Usa o `monster-version-crossref.json` para mapear o monstro para seu equivalente na outra versão
- Lazy-load: se os dados da versão alternativa não foram carregados, carrega automaticamente
- Preserva a quantidade selecionada no stepper ao trocar

## Decisão UX: Badge Condicional

**Decisão:** Badge de versão só é clicável quando existe crossref. Sem crossref, badge fica com opacity reduzida + tooltip "Nenhuma versão alternativa disponível".

**Por quê:** ~357 monstros MAD (Monster-a-Day) e monstros sem equivalente 2024 não têm crossref. Um botão que sempre falha é UX pobre — melhor mostrar visualmente que não há alternativa e explicar via tooltip.

## Decisão de Parity: Guest/Auth/Mid-Combat

**Decisão:** Aplicar `onRulesetChange` em TODOS os contextos onde MonsterSearchPanel é usado.

| Contexto | Componente | onRulesetChange | Por quê |
|----------|-----------|----------------|---------|
| Setup (Auth) | EncounterSetup | ✅ `setRulesetVersion` | Principal uso — DM montando encontro |
| Setup (Guest) | GuestCombatClient | ✅ `setRulesetVersion` | Parity obrigatória (CLAUDE.md) |
| Mid-combat (Guest) | GuestCombatClient | ✅ `setMidCombatRuleset` | DM pode precisar adicionar monstro de outra versão durante combate |
| Mid-combat (Auth) | CombatSessionClient | ✅ `setMidCombatRuleset` (local) | Parity com Guest — estado local independente da sessão |
| Preset Editor | PresetEditor | ✅ `setRulesetVersion` | Editor de presets já tinha RulesetSelector externo, agora tem dentro do search também |

**Por quê do estado local no CombatSessionClient:** A versão da sessão vem como prop e não deve mudar. Mas o DM deve poder buscar monstros de outra versão no painel de adicionar mid-combat. O estado local (`midCombatRuleset`) controla apenas a busca, não altera a sessão.

## Code Review: 5 Patches Aplicados

### F-01: rowQuantities perdido no version toggle (HIGH)
**Problema:** Ao trocar versão de um monstro, o id muda (ex: `goblin` → `goblin-2024`). O stepper de quantidade era keyed pelo id antigo, então a qty voltava pra 1.
**Fix:** Migrar a entrada do `rowQuantities` do id antigo para o novo.

### F-03: Race condition no handleVersionToggle (MEDIUM)
**Problema:** Função async sem guard. Double-click disparava dois loads concorrentes.
**Fix:** `useRef<boolean>` como lock — clicks são ignorados enquanto o toggle roda.

### F-04: CombatSessionClient sem onRulesetChange (MEDIUM)
**Problema:** Guest mid-combat tinha troca de versão, Auth não. Violação de parity.
**Fix:** Adicionado `midCombatRuleset` local + wired no MonsterSearchPanel.

### F-05: MAD monsters com VersionBadge clicável que sempre falha (MEDIUM)
**Problema:** Monstros sem crossref mostravam botão que sempre dava erro.
**Fix:** Checar `getCrossVersionMonsterId()` no render. Sem crossref = span estático + tooltip.

### F-07: Toast emoji removido (LOW)
**Problema:** `✓` removido dos toasts `monster_added_toast`. Poderia quebrar testes.
**Verificação:** Nenhum teste matcha nesse texto. Sem impacto.

## Findings Rejeitados (7)

| Finding | Motivo da Rejeição |
|---------|-------------------|
| Stale closure no Enter handler | Handler inline, recriado a cada render — não há closure stale |
| Toast dep no useCallback | `toast` de sonner é import de módulo, estável |
| Non-null assertion `altMonster!` | Guard `if (!altMonster) return` antes do setResults — TypeScript não narrow let em callbacks |
| Debounce do reload | `loadMonsters` é cached, toggle é botão (não input rápido) |
| Enter key fallback | Stepper UI só aparece quando `onSelectMonsterGroup` existe |
| hasFilters não conta versão | Versão é gerenciada pelo parent, conceitualmente separada dos filtros locais |
| Click-outside desabilitado no setup | Intencional — setup mode precisa manter resultados persistentes |

## Findings Deferidos (2)

| Finding | Por quê Deferido |
|---------|-----------------|
| Versão toggled reverte no próximo search | Inerente ao design de search — resultados são regenerados a cada input. DM deve adicionar antes de continuar buscando |
| Crossref pode não ter carregado | Fire-and-forget no srd-store. Degradação graceful (toast informativo). Carrega em <1s normalmente |

## Commits

| Hash | Descrição |
|------|-----------|
| `3fab673` | feat(combat): MonsterSearchPanel version toggle + ruleset filter + parity fixes |
| `3f5ab36` | feat(compendium): cross-link public pages, attunement items, and ability search |
| `5446553` | fix(review): 5 patches from code review + sitemap subclasses/classes-pt |

## Arquivos Alterados

- `components/combat/MonsterSearchPanel.tsx` — Core: toggle, filtro, badge condicional, lock
- `components/combat/EncounterSetup.tsx` — Wire onRulesetChange
- `components/guest/GuestCombatClient.tsx` — Wire setup + mid-combat
- `components/session/CombatSessionClient.tsx` — midCombatRuleset local + wire
- `components/presets/PresetEditor.tsx` — Wire onRulesetChange
- `messages/en.json` — 3 keys: search_filter_version, no_alternate_version, switch_version_tooltip
- `messages/pt-BR.json` — 3 keys traduzidas
