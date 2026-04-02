# C.14 — Aba de Spells no Combate (Player View)

**Epic:** C — Player Agency  
**Prioridade:** Alta  
**Estimativa:** 5 SP  
**Dependencia:** Nenhuma (pode ser implementada em paralelo com Trilhas A e B)  
**Arquivos principais:** Novo componente `components/player/PlayerSpellBrowser.tsx`, `components/player/PlayerInitiativeBoard.tsx`, `components/player/PlayerJoinClient.tsx`, `components/guest/GuestCombatClient.tsx`

---

## Resumo

Na mesa presencial, jogadores consultam magias constantemente — verificar alcance, componentes, duracao, dano em niveis mais altos. Hoje precisam sair do app e abrir outro site (5e.tools, D&D Beyond) ou folhear o livro fisico. Isso quebra a imersao e atrasa o jogo.

O Pocket DM ja tem um `SpellBrowser` completo no compendium (`/app/compendium`) com search, filtros por nivel/escola/classe, e `SpellCard` com descricao formatada estilo 5e. Porem esse componente e full-page e nao esta acessivel durante o combate.

Esta story adiciona um **painel de consulta de magias** acessivel durante o combate ativo, tanto na player view quanto na DM view (guest combat). E read-only — nao consome spell slots nem interage com o combate. Apenas referencia rapida.

---

## Contexto Tecnico

### Infraestrutura existente

**`components/compendium/SpellBrowser.tsx` (428 linhas):**
- Componente stateless (sem props) — todo estado e interno
- Carrega spells de `useSrdStore((s) => s.spells)` — dados ja em memoria (carregados no boot do app via IndexedDB cache)
- Filtros: `nameFilter`, `levels` (Set<number>), `schools` (Set<string>), `classes` (Set<string>), `ritualOnly`, `concentrationOnly`, `versionFilter`
- Layout full-page: split panel desktop (lista esquerda + detail direita), toggle mobile (lista OU detail)
- **NAO e embeddable** — assume viewport inteiro, estado isolado

**`components/oracle/SpellCard.tsx` (162 linhas):**
- Props: `spell: SrdSpell`, `variant?: "inline" | "card"`, `onClose?`, `onPin?`, etc.
- Variant `"inline"` — embeddable, sem toolbar, perfeito pra reutilizar
- Mostra: nome, level, school, casting time, range, components, duration, description, higher levels, classes, ritual/concentration badges
- Usa `styles/stat-card-5e.css` pra visual estilo D&D 5e

**`components/oracle/SpellDescriptionModal.tsx` (52 linhas):**
- Pattern ja validado: `Dialog` + `SpellCard variant="inline"` dentro de `DialogContent`
- Custom styling: `max-w-lg max-h-[85vh] overflow-y-auto !bg-[#1a1a1e] !border-white/[0.08]`
- Usa `VisuallyHidden` pra titulo (a11y)

**`lib/stores/srd-store.ts`:**
- Interface `SrdSpell`: id, name, ruleset_version, level, school, casting_time, range, components, duration, description, higher_levels, classes[], ritual, concentration
- Dados carregados em 2 fases: Phase 1 (2024 spells, critical path), Phase 2 (2014 spells, deferred)
- IndexedDB caching — zero fetch durante combate
- Acessivel de qualquer componente via `useSrdStore`

**`lib/hooks/useSrdContentFilter.ts`:**
- Filtra spells por feature gate `show_non_srd_content`
- Retorna `{ filtered }` com array filtrado

**UI primitives disponiveis:**
- `Dialog` (Radix UI via `components/ui/dialog.tsx`) — modal centered, overlay, close button
- `Button` com variants: `ghost`, `gold`, `goldOutline`, `icon` size
- Nao existe Sheet/Drawer — Dialog e o unico overlay

### Decisao: novo componente vs reutilizar SpellBrowser

O `SpellBrowser` atual e monolitico e full-page. Reutiliza-lo dentro de um Dialog exigiria:
- Refatorar pra aceitar props de container size
- Mudar layout de split-panel pra single-column
- Remover assuncoes de viewport

**Decisao:** Criar `PlayerSpellBrowser` — componente novo e leve que reutiliza `SpellCard` e a logica de filtragem, mas com layout otimizado pra Dialog. Isso evita regressao no SpellBrowser existente e permite UX otimizada pro contexto de combate (mobile-first, consulta rapida).

---

## Decisoes de UX

> **D5:** FAB (botao flutuante) no canto inferior **ESQUERDO** (`bottom-24 left-4`), acima do BottomBar. Canto direito e zona de scroll — evitar. Ocultar durante TurnNotificationOverlay ("E sua vez!") pra nao conflitar.
>
> **D6:** Mobile usa Dialog **full-screen** (nao quase-full). Override: `!max-w-none !w-screen !h-screen !rounded-none`. Maximiza espaco em celular. Desktop mantem `max-w-2xl` centered.
>
> **D7:** Filtro de classe: se personagem tem classe, vem com chip destacado `[✨ Wizard]` + botao "Todas as classes". Obvio que esta filtrado, facil desfiltrar.
>
> **D8:** Lista mostra count: "42 de 361 magias encontradas". Da contexto de que existe mais quando filtrado.

---

## Criterios de Aceite

1. **FAB de spells no canto inferior esquerdo (mobile).** Botao redondo flutuante com icone `BookOpen` dourado, posicao `fixed bottom-24 left-4 z-30`. Borda gold sutil. Oculto durante `TurnNotificationOverlay` (pra nao conflitar com "E sua vez!").

2. **Botao de spells no card "Own Character" (desktop).** Botao com icone `BookOpen` + label "Magias" no card destacado do proprio personagem. Estilo link dourado, compacto.

3. **Dialog full-screen no mobile, centered no desktop.** Mobile: Dialog ocupa 100% da tela (`!max-w-none !w-screen !h-screen !rounded-none`). Desktop: Dialog centered com `max-w-2xl max-h-[85vh]`. Ambos com `overflow-hidden` no container e scroll na area de conteudo.

4. **Painel de spells com search e filtros.** O Dialog exibe:
   - Campo de busca por nome (texto livre, case-insensitive)
   - Filtro por nivel (chips 0-9 toggleaveis, "C" pra cantrip)
   - Filtro por classe: se personagem tem classe, chip destacado `[✨ Wizard ✕]` pre-ativo + dropdown "Todas as classes". Clicar no ✕ limpa o filtro.
   - **Contador:** "42 de 361 magias encontradas" — sempre visivel, da contexto
   - Lista de resultados com nome, nivel, escola, casting time, badges ritual/concentration
   - Paginacao: 50 items iniciais, botao "Carregar mais (N restantes)"

5. **Navegacao lista → detail (mobile toggle).** No mobile, clicar numa spell substitui a lista pelo detail (SpellCard inline). Botao "← Voltar" no topo retorna a lista com filtros preservados. Botao "Voltar ao combate" no rodape como segundo caminho de saida. No desktop: mesma navegacao (toggle), nao split panel.

6. **Filtro por classe do personagem (pre-selecao).** Se o personagem do jogador tem classe conhecida (campo `class` no combatant), o filtro de classe vem pre-selecionado com essa classe. Chip visual: `[✨ Wizard ✕]`. O jogador pode limpar o filtro clicando no ✕ pra ver todas as magias.

7. **Dados carregados sem fetch.** Os spells vem do `useSrdStore` que ja esta em memoria. Zero requests de rede ao abrir o painel.

8. **Read-only — sem interacao com combate.** O painel e apenas referencia. Nao consome spell slots, nao interage com o combate, nao envia broadcasts. Fechar o painel retorna ao combate normalmente.

9. **DM view (guest combat) — mesma feature.** O DM no `GuestCombatClient` tambem recebe acesso ao painel de spells com o mesmo componente. Posicionamento: botao no toolbar de combate (ao lado de monster search).

10. **Filtro de versao respeita ruleset do combate.** Se o combate esta em versao 2024, mostra spells 2024 por padrao. Toggle pra ver 2014 disponivel.

---

## Abordagem Tecnica

### 1. Novo componente: PlayerSpellBrowser

Criar `components/player/PlayerSpellBrowser.tsx`:

```typescript
interface PlayerSpellBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select class filter if player class is known */
  playerClass?: string;
  /** Ruleset version for default filter */
  rulesetVersion?: "2014" | "2024";
}
```

Estrutura interna:
```typescript
export function PlayerSpellBrowser({ open, onOpenChange, playerClass, rulesetVersion }: PlayerSpellBrowserProps) {
  const allSpells = useSrdStore((s) => s.spells);
  const { filtered: spells } = useSrdContentFilter(allSpells);

  const [nameFilter, setNameFilter] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(playerClass ?? null);
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);
  const [versionFilter, setVersionFilter] = useState<"all" | "2014" | "2024">(rulesetVersion ?? "all");

  const filtered = useMemo(() => {
    let result = spells;
    if (nameFilter) result = result.filter(s => s.name.toLowerCase().includes(nameFilter.toLowerCase()));
    if (versionFilter !== "all") result = result.filter(s => s.ruleset_version === versionFilter);
    if (selectedLevel !== null) result = result.filter(s => s.level === selectedLevel);
    if (selectedClass) result = result.filter(s => s.classes.some(c => c.toLowerCase() === selectedClass!.toLowerCase()));
    return result.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [spells, nameFilter, versionFilter, selectedLevel, selectedClass]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden !p-0 !bg-[#1a1a1e] !border-white/[0.08]">
        <VisuallyHidden.Root><DialogTitle>{t("spell_browser_title")}</DialogTitle></VisuallyHidden.Root>
        {selectedSpell ? (
          // Detail view
          <div className="flex flex-col h-full max-h-[85vh]">
            <div className="flex items-center gap-2 p-3 border-b border-white/10">
              <button onClick={() => setSelectedSpell(null)}>← {t("back")}</button>
              <span className="font-semibold">{selectedSpell.name}</span>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <SpellCard spell={selectedSpell} variant="inline" />
            </div>
          </div>
        ) : (
          // List view
          <div className="flex flex-col h-full max-h-[85vh]">
            <div className="p-3 space-y-2 border-b border-white/10">
              <input ... /> {/* Search */}
              <div className="flex gap-1 flex-wrap"> {/* Level chips */} </div>
              <div> {/* Class filter */} </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.map(spell => (
                <button key={spell.id} onClick={() => setSelectedSpell(spell)}>
                  {/* Spell row: name, level, school, casting_time */}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Estilo de cada spell row na lista

```typescript
<button
  className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 flex items-center justify-between"
  onClick={() => setSelectedSpell(spell)}
>
  <div>
    <div className="text-sm font-medium text-foreground">{spell.name}</div>
    <div className="text-xs text-muted-foreground">
      {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} · {spell.school}
      {spell.concentration && " · Conc."}
      {spell.ritual && " · Ritual"}
    </div>
  </div>
  <div className="text-xs text-muted-foreground shrink-0">{spell.casting_time}</div>
</button>
```

### 3. Level chips (filtro visual rapido)

```typescript
const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

<div className="flex gap-1 flex-wrap">
  {LEVELS.map(lvl => (
    <button
      key={lvl}
      onClick={() => setSelectedLevel(selectedLevel === lvl ? null : lvl)}
      className={cn(
        "px-2 py-0.5 text-xs rounded-full border",
        selectedLevel === lvl
          ? "bg-gold/20 border-gold/50 text-gold"
          : "border-white/10 text-muted-foreground hover:border-white/20"
      )}
    >
      {lvl === 0 ? "C" : lvl}
    </button>
  ))}
</div>
```

### 4. Trigger button na PlayerInitiativeBoard

Em `PlayerInitiativeBoard.tsx`, adicionar estado e botao:

```typescript
const [spellsOpen, setSpellsOpen] = useState(false);
```

**Mobile — botao flutuante acima do BottomBar:**
```typescript
{/* Spell browser trigger — mobile */}
<div className="fixed bottom-[calc(theme(spacing.20)+env(safe-area-inset-bottom))] right-4 z-30 lg:hidden">
  <button
    type="button"
    onClick={() => setSpellsOpen(true)}
    className="w-10 h-10 rounded-full bg-[#1a1a2e] border border-gold/30 flex items-center justify-center shadow-lg"
    aria-label={t("open_spells")}
  >
    <BookOpen className="w-5 h-5 text-gold" />
  </button>
</div>
```

**Desktop — botao no card "Own Character":**
```typescript
{/* Dentro do card do proprio personagem, apos conditions */}
<button
  type="button"
  onClick={() => setSpellsOpen(true)}
  className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
>
  <BookOpen className="w-3.5 h-3.5" />
  {t("spells")}
</button>
```

**Renderizar o componente:**
```typescript
<PlayerSpellBrowser
  open={spellsOpen}
  onOpenChange={setSpellsOpen}
  playerClass={primaryPlayerChar?.class}
  rulesetVersion={rulesetVersion}
/>
```

### 5. Trigger button no GuestCombatClient (DM view)

Em `GuestCombatClient.tsx`, adicionar o mesmo pattern. O botao vai no toolbar de combate (ao lado do botao de adicionar monstro ou no header):

```typescript
const [spellsOpen, setSpellsOpen] = useState(false);

{/* No toolbar */}
<button onClick={() => setSpellsOpen(true)} className="...">
  <BookOpen className="w-4 h-4" />
  <span className="text-xs">{t("spells")}</span>
</button>

<PlayerSpellBrowser
  open={spellsOpen}
  onOpenChange={setSpellsOpen}
  rulesetVersion={currentRulesetVersion}
/>
```

### 6. Responsividade do Dialog

O `DialogContent` ja e responsivo (`max-w-2xl` no desktop, full-width no mobile via CSS do dialog.tsx). A key e garantir que:

- Mobile: Dialog ocupa ~95% da tela (ajustar classes se necessario)
- `max-h-[85vh]` com `overflow-hidden` no container externo
- `overflow-y-auto` na area de scroll (lista OU detail)
- Filtros fixos no topo (nao scrollam)

### 7. Performance: virtualizacao

Com ~500 spells no SRD, a lista filtrada raramente passa de 100 items. Paginacao simples (mostrar 50, botao "carregar mais") e suficiente — sem necessidade de virtualizacao. Pattern ja usado no SpellBrowser existente (`MOBILE_PAGE_SIZE = 50`).

```typescript
const [displayCount, setDisplayCount] = useState(50);
const displayed = filtered.slice(0, displayCount);

{filtered.length > displayCount && (
  <button onClick={() => setDisplayCount(c => c + 50)} className="...">
    {t("load_more")} ({filtered.length - displayCount} restantes)
  </button>
)}
```

### 8. Novas chaves i18n

Em `messages/pt-BR.json` e `messages/en.json`:

```json
"spell_browser_title": "Consultar Magias",
"open_spells": "Abrir magias",
"spells": "Magias",
"spell_level_cantrip": "Truque",
"spell_level": "Nivel {level}",
"spell_no_results": "Nenhuma magia encontrada",
"spell_load_more": "Carregar mais",
"spell_all_classes": "Todas as classes",
"back": "Voltar"
```

```json
"spell_browser_title": "Spell Lookup",
"open_spells": "Open spells",
"spells": "Spells",
"spell_level_cantrip": "Cantrip",
"spell_level": "Level {level}",
"spell_no_results": "No spells found",
"spell_load_more": "Load more",
"spell_all_classes": "All classes",
"back": "Back"
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `components/player/PlayerSpellBrowser.tsx` (novo) | Componente principal: Dialog + search + filtros + lista + SpellCard detail |
| `components/player/PlayerInitiativeBoard.tsx` | Estado `spellsOpen`, botao trigger (mobile flutuante + desktop no card), renderizar PlayerSpellBrowser |
| `components/player/PlayerJoinClient.tsx` | Nenhuma mudanca direta — o PlayerSpellBrowser e self-contained, renderizado dentro do PlayerInitiativeBoard |
| `components/guest/GuestCombatClient.tsx` | Estado `spellsOpen`, botao trigger no toolbar, renderizar PlayerSpellBrowser |
| `messages/pt-BR.json` | Chaves de spell browser |
| `messages/en.json` | Chaves de spell browser |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

1. **Abrir painel — mobile (player view)**
   - [ ] Botao flutuante com icone BookOpen visivel acima do BottomBar
   - [ ] Clicar abre Dialog com campo de busca e lista de spells
   - [ ] Dialog ocupa ~95% da tela mobile
   - [ ] Scroll funciona na lista de spells

2. **Abrir painel — desktop (player view)**
   - [ ] Botao no card "Own Character" com label "Magias"
   - [ ] Clicar abre Dialog centralizado (max-w-2xl)
   - [ ] Dialog nao bloqueia visao do turno atual

3. **Busca por nome**
   - [ ] Digitar "fire" filtra para spells com "fire" no nome
   - [ ] Busca e case-insensitive
   - [ ] Limpar busca mostra todas as spells

4. **Filtro por nivel**
   - [ ] Clicar em chip "3" mostra apenas spells de nivel 3
   - [ ] Clicar novamente no chip "3" desativa o filtro (toggle)
   - [ ] Chip "C" filtra cantrips (nivel 0)
   - [ ] Filtros combinam: nivel 3 + busca "fire" = spells de nivel 3 com "fire" no nome

5. **Filtro por classe (pre-selecao)**
   - [ ] Se personagem tem classe "Wizard", filtro vem pre-selecionado com Wizard
   - [ ] Lista mostra apenas spells de Wizard
   - [ ] Limpar filtro de classe mostra todas as spells

6. **Detail view — mobile**
   - [ ] Clicar numa spell substitui lista pelo SpellCard (estilo 5e)
   - [ ] Botao "Voltar" retorna a lista com filtros preservados
   - [ ] SpellCard mostra: nome, nivel, escola, casting time, range, components, duration, description, higher levels, classes

7. **Detail view — desktop**
   - [ ] Clicar numa spell mostra SpellCard (ou substitui lista como mobile — depende do layout escolhido)
   - [ ] Scroll funciona na descricao longa

8. **DM view (guest combat)**
   - [ ] Botao de spells visivel no toolbar do GuestCombatClient
   - [ ] Abre o mesmo PlayerSpellBrowser
   - [ ] Busca e filtros funcionam identicamente

9. **Performance**
   - [ ] Abrir painel e instantaneo (dados ja em memoria)
   - [ ] Filtrar 500+ spells nao causa lag perceptivel
   - [ ] Scroll e fluido

10. **Fechar painel**
    - [ ] Clicar no X fecha o Dialog
    - [ ] Clicar no backdrop fecha o Dialog
    - [ ] Pressionar Escape fecha o Dialog
    - [ ] Ao reabrir, filtros estao resetados (fresh state)

11. **Filtro de versao**
    - [ ] Se combate esta em versao 2024, spells 2024 mostradas por padrao
    - [ ] Toggle disponivel pra ver spells 2014

### Testes Automatizados (recomendados)

- **Unit test** para logica de filtragem: nome, nivel, classe, versao, combinacoes
- **Unit test** para pre-selecao de classe: playerClass="Wizard" → filtered para Wizard spells

---

## Notas de Paridade

- **Guest Combat (DM):** Recebe o mesmo componente `PlayerSpellBrowser`. Botao no toolbar de combate. DM consulta spells da mesma forma que o player. **Paridade completa.**
- **Player anonimo (`/join`):** Usa `PlayerInitiativeBoard` que recebe o botao de spells. Sem dependencia de auth — spells sao dados SRD publicos. **Funciona identicamente.**
- **Player autenticado (`/invite`):** Mesmo fluxo. Se o personagem tem classe no DB, o filtro vem pre-selecionado. **Paridade automatica com bonus.**
- **SpellBrowser existente (`/app/compendium`):** NAO e alterado. O novo `PlayerSpellBrowser` e um componente separado otimizado pra combate. Ambos consomem `useSrdStore`.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| SpellBrowser e PlayerSpellBrowser divergem (filtros, dados) | Ambos consomem `useSrdStore` e `useSrdContentFilter`. Logica de filtragem e simples e duplicada intencionalmente (5 linhas de filtro — nao justifica abstracoes). |
| Dialog interfere com combate no mobile (z-index, scroll) | Dialog Radix UI ja gerencia focus trap e z-index (z-50). PlayerBottomBar e z-40 — Dialog fica acima corretamente. |
| Spells nao carregadas no momento do combate | Spells sao carregadas no boot do app (Phase 1 da srd-store). Se por algum motivo nao carregaram, mostrar mensagem "Carregando magias..." com spinner. |
| Botao flutuante obstrui UI importante | Posicionar no canto inferior direito, acima do BottomBar. Nao sobrepoe a lista de iniciativa. Se necessario, esconder durante animacao de turno. |

---

## Definicao de Pronto

- [ ] Componente `PlayerSpellBrowser` criado e funcional
- [ ] Busca por nome funciona (case-insensitive, substring)
- [ ] Filtro por nivel funciona (chips toggleaveis)
- [ ] Filtro por classe funciona (pre-selecao se disponivel)
- [ ] Filtro por versao funciona (respeita ruleset do combate)
- [ ] Detail view com SpellCard inline funciona (mobile: toggle, desktop: detail)
- [ ] Botao trigger visivel na player view (mobile + desktop)
- [ ] Botao trigger visivel no GuestCombatClient (DM view)
- [ ] Dados carregados sem fetch (useSrdStore)
- [ ] Paginacao simples (50 items, load more)
- [ ] Chaves i18n adicionadas em pt-BR e en
- [ ] Testes manuais 1-11 passando
- [ ] Nenhuma regressao no SpellBrowser existente (/app/compendium)
- [ ] Code review aprovado
