# F-14 — Lock de Audio ao Turno do Jogador

**Epic:** F — Audio & Ambientacao  
**Prioridade:** Media  
**Estimativa:** 2 SP  
**Dependencia:** Nenhuma (PlayerSoundboard ja implementa `isPlayerTurn` guard)  
**Arquivos principais:** `components/audio/PlayerSoundboard.tsx`, `components/player/PlayerInitiativeBoard.tsx`, `components/player/PlayerJoinClient.tsx`, `messages/en.json`, `messages/pt-BR.json`

---

## Resumo

O PlayerSoundboard ja bloqueia o envio de audio quando nao e o turno do jogador — o guard `if (!isPlayerTurn) return` existe na linha 46 e o FAB fica desabilitado visualmente. Porem, falta feedback visual claro explicando **por que** os botoes estao desabilitados, e a passagem da prop `isPlayerTurn` precisa ser verificada em todos os contextos de uso.

Na mesa, o jogador olha pro celular, ve o botao cinza e nao entende. Um tooltip/mensagem "Disponivel no seu turno" elimina a confusao e mantem a experiencia fluida sem quebrar o ritmo do combate.

---

## Decisoes de UX

**D1 — Feedback visual quando nao e seu turno:** Exibir um texto pequeno abaixo do FAB desabilitado: "Disponivel no seu turno" em `text-muted-foreground text-[10px]`. Nao usar toast ou modal — seria intrusivo demais.

**D2 — FAB continua visivel mas desabilitado:** O FAB ja aparece com `opacity-40 cursor-not-allowed` quando `isPlayerTurn=false`. Manter esse comportamento e apenas adicionar o label textual.

**D3 — DM nunca tem restricao de turno:** O `DmSoundboard` nao recebe `isPlayerTurn` e nao deve receber. DM controla ambientacao livremente em qualquer momento. Nenhuma alteracao no DmSoundboard.

**D4 — Sons ambiente do DM nao sao bloqueados:** Apenas o PlayerSoundboard (SFX do jogador) tem lock de turno. Sons de ambiente/musica do DM via `audio:ambient_start` nao tem relacao com turno.

**D5 — Sem notificacao ao DM sobre tentativa off-turn:** Bloquear silenciosamente. Adicionar log no console em dev mode, mas nao broadcast. Simplicidade > complexidade.

---

## Contexto Tecnico

### PlayerSoundboard (componentes/audio/PlayerSoundboard.tsx)

Ja implementado:
- Prop `isPlayerTurn: boolean` (linha 13)
- Guard em `handlePlaySound`: `if (!isPlayerTurn) return` (linha 46)
- FAB desabilitado: `disabled={!isPlayerTurn}` (linha 84)
- Classes visuais: `bg-gray-700 text-gray-500 opacity-40 cursor-not-allowed` quando desabilitado
- aria-label e title ja usam `t("disabled_not_turn")` (linhas 90-91)
- Drawer so abre se `isPlayerTurn`: `{isOpen && isPlayerTurn && (` (linha 101)

### PlayerInitiativeBoard (componentes/player/PlayerInitiativeBoard.tsx)

Ja implementado:
- Calcula `isPlayerTurn` corretamente (linhas 365-367):
  ```typescript
  const isPlayerTurn = registeredName
    ? currentCombatant?.is_player === true && currentCombatant.name === registeredName
    : currentCombatant?.is_player ?? false;
  ```
- Passa `isPlayerTurn` ao PlayerSoundboard (linha 998)
- PlayerSoundboard renderizado condicionalmente quando `channelRef` existe (linha 996)

### PlayerJoinClient (componentes/player/PlayerJoinClient.tsx)

- Passa `channelRef` ao PlayerInitiativeBoard (linha 1670)
- Passa `registeredName` (linha 1674)
- PlayerInitiativeBoard calcula `isPlayerTurn` internamente — nao depende de prop externa

### Chaves i18n existentes

- `audio.soundboard` = "Sons de Combate" / "Combat Sounds"
- `audio.disabled_not_turn` = "Disponivel apenas no seu turno" / "Available only on your turn"

---

## Criterios de Aceite

### Feedback Visual

1. Quando `isPlayerTurn=false`, um texto "Disponivel no seu turno" aparece abaixo do FAB desabilitado
2. O texto usa classes `text-muted-foreground text-[10px] text-center` e fica fixo na mesma posicao do FAB
3. Quando `isPlayerTurn=true`, o texto desaparece e o FAB fica dourado e clicavel
4. A transicao entre estados e suave (opacity transition de 200ms)

### Bloqueio Funcional (ja existente — verificar)

5. Player nao consegue enviar `audio:play_sound` via broadcast quando nao e seu turno
6. FAB nao abre o drawer quando `isPlayerTurn=false`
7. O guard `handlePlaySound` retorna sem efeito quando `isPlayerTurn=false`

### DM sem restricao

8. DmSoundboard funciona em qualquer momento, sem prop de turno
9. Sons de ambiente (`audio:ambient_start/stop`) do DM nao sao afetados por turno de nenhum jogador

### Acessibilidade

10. `aria-label` do FAB desabilitado indica que esta bloqueado por turno (ja existe)
11. `title` do FAB mostra tooltip com razao do bloqueio (ja existe)

---

## Abordagem Tecnica

### Passo 1: Adicionar label visual ao FAB desabilitado

Em `components/audio/PlayerSoundboard.tsx`, adicionar um texto fixo abaixo do FAB quando desabilitado:

```tsx
{/* FAB — Floating Action Button */}
<button
  type="button"
  onClick={() => isPlayerTurn && setIsOpen((v) => !v)}
  disabled={!isPlayerTurn}
  className={`fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all duration-200 ${
    isPlayerTurn
      ? "bg-gold text-black active:scale-95"
      : "bg-gray-700 text-gray-500 opacity-40 cursor-not-allowed"
  }`}
  aria-label={isPlayerTurn ? t("soundboard") : t("disabled_not_turn")}
  title={isPlayerTurn ? t("soundboard") : t("disabled_not_turn")}
  data-testid="soundboard-fab"
>
  {isOpen ? "✕" : isCustomLoading ? (
    <span className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
  ) : "🔊"}
</button>

{/* Turn-lock label — visible only when NOT player's turn */}
{!isPlayerTurn && (
  <span
    className="fixed bottom-[5.25rem] right-4 z-40 w-14 text-center text-muted-foreground text-[10px] leading-tight pointer-events-none"
    data-testid="soundboard-turn-lock-label"
  >
    {t("disabled_not_turn_short")}
  </span>
)}
```

### Passo 2: Adicionar chave i18n curta para o label

A chave `disabled_not_turn` existente e longa demais para um label de 14x wide. Criar uma versao curta:

**messages/pt-BR.json** (namespace `audio`):
```json
"disabled_not_turn_short": "Seu turno"
```

**messages/en.json** (namespace `audio`):
```json
"disabled_not_turn_short": "Your turn"
```

O label curto indica que o recurso esta vinculado ao turno. O tooltip (`title`) ja contem a explicacao completa.

### Passo 3: Verificar prop pipeline

Confirmar que o fluxo funciona end-to-end:
1. PlayerJoinClient passa `registeredName` e `channelRef` ao PlayerInitiativeBoard
2. PlayerInitiativeBoard calcula `isPlayerTurn` com base em `currentTurnIndex` e `registeredName`
3. PlayerInitiativeBoard passa `isPlayerTurn` ao PlayerSoundboard
4. PlayerSoundboard usa `isPlayerTurn` para habilitar/desabilitar FAB e envio

Este fluxo ja esta implementado. O passo 3 e apenas verificacao — nao requer mudanca de codigo.

---

## Arquivos a Modificar

| Arquivo | Alteracao | Tipo |
|---------|-----------|------|
| `components/audio/PlayerSoundboard.tsx` | Adicionar label visual abaixo do FAB desabilitado | Modificacao |
| `messages/en.json` | Adicionar `audio.disabled_not_turn_short` | Modificacao |
| `messages/pt-BR.json` | Adicionar `audio.disabled_not_turn_short` | Modificacao |

---

## Plano de Testes

### Testes Manuais

1. Entrar como player via `/join/[token]`, registrar nome
2. Quando nao for seu turno: verificar FAB cinza com label "Seu turno" abaixo
3. Clicar no FAB desabilitado — nada acontece
4. DM avanca turno para o player
5. FAB fica dourado, label desaparece
6. Clicar no FAB — drawer abre com presets de som
7. Tocar um som — broadcast enviado ao DM
8. DM avanca turno para outro combatente
9. FAB volta a ficar cinza, drawer fecha, label reaparece

### Testes Automatizados

```typescript
// PlayerSoundboard.test.tsx
describe("PlayerSoundboard turn lock", () => {
  it("shows turn-lock label when isPlayerTurn is false", () => {
    render(<PlayerSoundboard isPlayerTurn={false} playerName="Aria" channelRef={mockRef} customAudioFiles={[]} />);
    expect(screen.getByTestId("soundboard-turn-lock-label")).toBeInTheDocument();
    expect(screen.getByTestId("soundboard-fab")).toBeDisabled();
  });

  it("hides turn-lock label when isPlayerTurn is true", () => {
    render(<PlayerSoundboard isPlayerTurn={true} playerName="Aria" channelRef={mockRef} customAudioFiles={[]} />);
    expect(screen.queryByTestId("soundboard-turn-lock-label")).not.toBeInTheDocument();
    expect(screen.getByTestId("soundboard-fab")).toBeEnabled();
  });

  it("does not broadcast sound when not player turn", () => {
    render(<PlayerSoundboard isPlayerTurn={false} playerName="Aria" channelRef={mockRef} customAudioFiles={[]} />);
    // FAB should be disabled, click should not open drawer
    fireEvent.click(screen.getByTestId("soundboard-fab"));
    expect(screen.queryByTestId("soundboard-drawer")).not.toBeInTheDocument();
  });
});
```

---

## Notas de Paridade

| Modo | Aplica? | Detalhes |
|------|---------|----------|
| Guest (`/try`) | NAO | Guest e DM — usa DmSoundboard sem restricao de turno |
| Anonimo (`/join`) | SIM | Player anonimo usa PlayerInitiativeBoard que renderiza PlayerSoundboard com `isPlayerTurn`. O label visual sera visivel. |
| Autenticado (`/invite`) | SIM | Mesmo fluxo do anonimo — PlayerJoinClient > PlayerInitiativeBoard > PlayerSoundboard. |

**Conclusao:** A alteracao no PlayerSoundboard atinge automaticamente ambos os modos de player (anon + auth) pois ambos passam por PlayerInitiativeBoard. Guest (DM) nao e afetado.

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Label visual sobrepoe outros elementos fixos (bottom bar) | Baixa | Baixo | Posicionamento com `bottom-[5.25rem]` alinha acima do FAB. Testar em telas pequenas (375px). |
| `isPlayerTurn` nao atualiza apos turn_advance broadcast | Muito Baixa | Alto | Pipeline ja funciona — PlayerJoinClient atualiza `turnIndex` no broadcast handler (linha 675), PlayerInitiativeBoard recalcula `isPlayerTurn` via `currentTurnIndex`. |
| Texto i18n muito longo em algum locale | Baixa | Baixo | Usar versao curta ("Seu turno" / "Your turn") limitada a `w-14` com `text-[10px]`. |

---

## Definicao de Pronto

- [ ] Label "Seu turno" / "Your turn" aparece abaixo do FAB desabilitado
- [ ] Label desaparece quando e turno do jogador
- [ ] FAB continua bloqueando envio de audio off-turn (verificar guard existente)
- [ ] DmSoundboard nao e afetado por nenhuma mudanca
- [ ] Chaves i18n adicionadas em pt-BR e en
- [ ] Teste unitario do PlayerSoundboard cobre estado locked/unlocked
- [ ] Testado em viewport 375px (mobile) sem sobreposicao de elementos
- [ ] Build passa sem erros (`next build`)
