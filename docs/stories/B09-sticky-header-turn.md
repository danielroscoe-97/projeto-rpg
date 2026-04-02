# B.09 — Header Sticky com Turno Atual e Proximo

**Tipo:** Melhoria de UX  
**Prioridade:** Alta  
**Estimativa:** 3 pontos  
**Componente:** Player Initiative Board + Guest Combat Client

---

## Resumo

Nenhuma tela de combate (jogador ou DM) possui um indicador de turno fixo (sticky). Quando o usuario rola a pagina no celular, perde de vista de quem e o turno atual e quem e o proximo. Esse problema foi reportado especificamente durante beta test — jogadores em mesas com muitos combatentes precisavam rolar de volta ao topo constantemente para verificar o turno.

---

## Contexto e Problema

### Situacao atual

**Player view (`PlayerInitiativeBoard.tsx`):**
- O banner de turno atual (linhas 356-407) e um `<div>` normal com `bg-card` que rola junto com o conteudo.
- Em mobile, a lista de combatentes pode ser longa (10+ entradas). Ao rolar para ver condicoes/HP de combatentes abaixo, o banner de turno some.
- Existe auto-scroll para o turno atual (`turnRef.current?.scrollIntoView`), mas isso so funciona quando o turno **muda** — nao ajuda durante o turno.

**Guest/DM view (`GuestCombatClient.tsx`):**
- Ja possui um bloco `sticky top-[72px]` (linha 1173) para controles do DM, mas esse bloco contem OmniBar, Round counter e botoes de acao — **nao** inclui indicador de turno de forma destacada.
- O turno atual e indicado pelo highlight na linha do combatente, que rola junto com a lista.

### Problema reportado no beta

> "No celular com 12 combatentes, eu rolo pra baixo pra ver o HP do meu personagem e perco de vista de quem e o turno. Preciso rolar de volta toda hora." — feedback de beta tester

### Elementos sticky existentes

| Componente | Posicao | z-index | Descricao |
|---|---|---|---|
| GuestCombatClient controles | `sticky top-[72px]` | z-30 | OmniBar + round counter + acoes DM |
| GuestCombatClient header colunas | `sticky top-[72px]` | z-20 | Headers da tabela (Init, Name, HP, etc.) |
| PlayerBottomBar | `fixed bottom-0` | z-40 | Barra do proprio personagem (mobile) |
| Navbar (provavelmente) | `fixed top-0` | z-50 | Navbar global |

O novo header sticky precisa se encaixar nessa hierarquia sem conflitar.

---

## Decisoes de UX (Party Mode 2026-04-02)

| Decisao | Resolucao |
|---------|-----------|
| **Altura mobile** | `h-14` (56px) fixo, nunca muda |
| **Background** | `bg-background/95 border-b border-border` — sem backdrop-blur (imprevisivel em hardware barato) |
| **End Turn** | **FORA do header.** Mantém posicao existente (PlayerBottomBar em mobile). Header nunca muda de altura. |
| **Nome longo** | `truncate` com `max-w-[200px]` |
| **Desktop max-w** | `max-w-2xl mx-auto`, igual ao container da lista |
| **Animacao turno** | Fade via `AnimatePresence`, `opacity 0→1`, 150ms |

---

## Criterios de Aceite

1. **Indicador de turno (turno atual + proximo) e sticky no topo da tela de combate.** Permanece visivel ao rolar o conteudo para baixo, tanto no mobile quanto no desktop. Altura fixa de `h-14` (56px) em todas as plataformas.

2. **Funciona em ambas as plataformas (mobile e desktop).** No mobile, o indicador e compacto com `h-14`. No desktop, usa `max-w-2xl mx-auto` para seguir o container da lista.

3. **Background solido semi-transparente para legibilidade.** Usar `bg-background/95 border-b border-border` — **sem backdrop-blur** (imprevisivel em hardware variado de mesa de RPG). Background solido e mais confiavel.

4. **Mostra: nome/icone do combatente atual + "Proximo: [nome]".** O indicador exibe claramente de quem e o turno agora e quem vem depois. Se o turno atual for do proprio jogador, destacar com texto especial (ex: "Seu turno!"). Nomes longos usam `truncate` com `max-w-[200px]`.

5. **Botao End Turn FORA do header sticky.** O End Turn permanece na posicao existente (PlayerBottomBar em mobile, posicao fixa em desktop). O header sticky tem altura fixa e nunca muda — evita layout shift e simplifica a implementacao.

6. **Visualmente distinto com acento gold/amber.** O indicador deve se destacar do conteudo normal usando a cor gold/amber da marca (`text-gold`, `border-gold`, `bg-amber-*`). Nao deve ser confundido com um combatente comum da lista.

7. **NAO interfere com outros elementos sticky/fixed.** Deve respeitar o espaco da navbar (`top-[72px]` ou equivalente) e nao sobrepor a `PlayerBottomBar` (mobile, `fixed bottom-0`). Testar com DevTools em diferentes tamanhos de tela.

8. **Transicao suave quando o turno muda.** Ao avancar o turno, o indicador atualiza com fade via `AnimatePresence` (`opacity 0→1`, 150ms). Sem slide — sutil e rapido.

---

## Abordagem Tecnica

### 1. Criar componente `StickyTurnHeader`

Novo componente reutilizavel que aceita dados do turno atual e proximo:

```typescript
interface StickyTurnHeaderProps {
  currentCombatantName: string;
  isPlayerTurn: boolean;
  isMonster: boolean;
  nextCombatantName?: string;
  roundNumber: number;
  /** DM's hidden turn — show "DM's turn" instead of combatant name */
  isDmTurn?: boolean;
}
```

### 2. Posicionamento no Player view

Em `PlayerInitiativeBoard.tsx`, substituir o banner de turno atual (linhas 356-407) por uma versao sticky. O banner original se torna o `StickyTurnHeader`:

```tsx
{/* Sticky turn indicator — always visible, h-14 fixed */}
<div className="sticky top-0 z-30 h-14 bg-background/95 border-b border-border px-4 flex items-center -mx-2 max-w-2xl mx-auto">
  <StickyTurnHeader
    currentCombatantName={currentCombatant?.name ?? ""}
    isPlayerTurn={isPlayerTurn}
    isMonster={!currentCombatant?.is_player}
    nextCombatantName={nextCombatant?.name}
    roundNumber={roundNumber}
    isDmTurn={currentTurnIndex === -1}
  />
</div>
```

**Nota sobre `top` value:** O Player view nao tem navbar com `72px` como o Guest view (jogador acessa via link direto). Verificar qual e o offset correto — pode ser `top-0` ou `top-[56px]` dependendo do layout. Inspecionar em runtime.

### 3. Posicionamento no Guest/DM view

Em `GuestCombatClient.tsx`, o bloco sticky existente (linha 1173) ja contem controles do DM. Adicionar o indicador de turno dentro desse bloco ou como um sub-header sticky abaixo dele:

```tsx
{/* Dentro do bloco sticky existente, apos os controles */}
<div className="flex items-center gap-2 py-1.5 border-t border-border/30">
  <span className="text-gold text-sm">▶</span>
  <span className="text-foreground text-sm font-medium truncate">
    {currentCombatant?.name ?? "—"}
  </span>
  {nextCombatant && (
    <span className="text-muted-foreground text-xs ml-auto">
      Proximo: {nextCombatant.name}
    </span>
  )}
</div>
```

### 4. Remover duplicacao

O banner de turno atual NAO-sticky que existe hoje em `PlayerInitiativeBoard` (linhas 356-407) deve ser **substituido** pelo novo sticky header, nao duplicado. Manter a mesma informacao e elementos visuais (icone ▶, tag player/monster, botao End Turn).

### 5. Responsividade

- **Mobile:** Header compacto `h-14` com texto truncado (`max-w-[200px]`). End Turn **fora** do header (fica na PlayerBottomBar).
- **Desktop (lg+):** Header `h-14 max-w-2xl mx-auto` com mais espaco horizontal. End Turn tambem fora do header.

### 6. Animacao de transicao

Usar `AnimatePresence` + `motion.div` do Framer Motion para animar a troca de turno. **Apenas fade, sem slide** — sutil e rapido:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={currentTurnIndex}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
  >
    {/* conteudo do header */}
  </motion.div>
</AnimatePresence>
```

### 7. Caso "DM's turn" (turno de NPC oculto)

Quando `currentTurnIndex === -1`, o indicador mostra "Turno do DM" em vez do nome de um combatente. Isso ja existe no banner atual (linhas 410-420) — manter a mesma logica.

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudanca |
|---|---|
| `components/player/PlayerInitiativeBoard.tsx` | Converter banner de turno existente (linhas 354-420) para sticky + backdrop blur. Manter botao End Turn e tags player/monster. |
| `components/guest/GuestCombatClient.tsx` | Adicionar indicador de turno ao bloco sticky existente (linha 1173) ou como sub-header. |
| `components/combat/StickyTurnHeader.tsx` | **(Opcional)** Criar componente reutilizavel se a logica for compartilhada. Pode ser desnecessario se as views divergirem muito. |

---

## Plano de Testes

### Testes manuais (obrigatorios)

1. **Player view — mobile (scroll test)**
   - [ ] Com 10+ combatentes, rolar para baixo
   - [ ] Indicador de turno permanece visivel no topo
   - [ ] Backdrop blur funciona — conteudo atras e desfocado
   - [ ] Nao sobrepoe PlayerBottomBar (bottom)
   - [ ] Nome do combatente atual e "Proximo" visiveis

2. **Player view — desktop (scroll test)**
   - [ ] Indicador sticky funciona com scroll longo
   - [ ] Layout responsivo — mais espaco horizontal utilizado

3. **Player view — turno do jogador**
   - [ ] Indicador mostra "Seu turno!" ou texto destacado
   - [ ] Botao End Turn funciona dentro do header sticky
   - [ ] Gold/amber accent visivel e distinto

4. **Player view — turno do DM (NPC oculto)**
   - [ ] Indicador mostra "Turno do DM" quando `currentTurnIndex === -1`

5. **DM view — scroll test**
   - [ ] Indicador de turno visivel ao rolar lista de combatentes
   - [ ] Nao conflita com controles sticky existentes (OmniBar, round counter)

6. **Transicao de turno**
   - [ ] Ao avancar turno, indicador atualiza com animacao suave
   - [ ] Nao pisca ou desaparece momentaneamente

7. **Diferentes tamanhos de tela**
   - [ ] iPhone SE (320px largura) — texto trunca corretamente
   - [ ] iPad — layout adequado
   - [ ] Desktop 1440px — uso de espaco proporcional

8. **z-index (regressao)**
   - [ ] Navbar permanece acima do sticky header
   - [ ] PlayerBottomBar permanece acima (mobile)
   - [ ] Modais/overlays (HPLegendOverlay, TurnNotificationOverlay) aparecem acima

### Testes automatizados (recomendados)

- **Unit test** para `StickyTurnHeader` (se criado como componente separado) — renderiza nome, "Proximo", caso DM turn
- **Snapshot test** para verificar classes CSS do sticky positioning

---

## Notas de Paridade

- **Player view:** Precisa de mudanca significativa — converter banner estatico para sticky. O banner atual (linhas 354-420 de `PlayerInitiativeBoard.tsx`) contem toda a logica necessaria, mas precisa ser reposicionado.
- **Guest/DM view:** Ja possui estrutura sticky (linha 1173 de `GuestCombatClient.tsx`). Adicionar apenas o indicador de turno dentro do bloco existente. Mudanca menor.
- **CombatSessionClient:** O componente `components/session/CombatSessionClient.tsx` (visao logada do DM) tambem tem bloco sticky (linha 738). Avaliar se precisa do mesmo indicador de turno — provavelmente sim, para consistencia.
- **Ambas as views** devem mostrar o mesmo formato de informacao: nome do combatente atual + "Proximo: [nome]".

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Sticky header ocupa espaco vertical em telas pequenas | Manter compacto (max 48-56px altura). O beneficio de sempre ver o turno compensa o espaco. |
| Conflito de z-index com elementos existentes | Mapear todos os z-index existentes (feito na tabela acima). Usar z-30 para o sticky header, abaixo de fixed elements (z-40, z-50). |
| `position: sticky` nao funciona se algum ancestor tem `overflow: hidden` | Verificar a arvore DOM. Se necessario, usar `position: fixed` como fallback com calculo de posicao. |
| Backdrop blur nao suportado em todos os browsers | `backdrop-blur` e suportado em 95%+ dos browsers modernos. Fallback: fundo opaco (`bg-black/90`) sem blur. |
| Botao End Turn no header sticky pode gerar cliques acidentais no mobile | Manter min-height de 44px e padding adequado. Considerar colocar o botao apenas no banner nao-sticky se houver problemas. |

---

## Definition of Done

- [ ] Indicador de turno sticky visivel ao rolar em mobile e desktop
- [ ] Player view: banner de turno convertido para sticky com backdrop blur
- [ ] DM view: indicador de turno adicionado ao bloco sticky existente
- [ ] Mostra nome do combatente atual + "Proximo: [nome]"
- [ ] Acento gold/amber visualmente distinto
- [ ] Animacao de transicao na troca de turno
- [ ] Caso "Turno do DM" funciona (currentTurnIndex === -1)
- [ ] Nao conflita com navbar, PlayerBottomBar ou modais
- [ ] Testes manuais 1-8 passando
- [ ] Nenhuma regressao em elementos sticky existentes
