# F-13 — SFX Automatico por Turno

**Epic:** F — Audio & Ambientacao  
**Prioridade:** Media  
**Estimativa:** 3 SP  
**Dependencia:** Nenhuma  
**Arquivos principais:** `lib/hooks/useCombatActions.ts`, `components/guest/GuestCombatClient.tsx`, `components/player/TurnNotificationOverlay.tsx`, `lib/stores/audio-store.ts`, `messages/en.json`, `messages/pt-BR.json`

---

## Resumo

Quando o DM avanca o turno, o combate deve ter pontuacao sonora automatica. O lado do **player** ja tem isso: `TurnNotificationOverlay` toca `/sounds/turn-notification.mp3` + vibracao haptica quando e a vez do jogador. O que falta e o lado do **DM** — o DM clica "Next" e nao ha feedback auditivo do avanco de turno.

Na mesa, o DM esta gerenciando 5+ combatentes, alternando entre monstros e players. Um SFX sutil no avanco de turno ("whoosh" ou "page flip") da ritmo ao combate e confirma que o clique registrou, sem precisar olhar pra tela.

---

## Decisoes de UX

**D1 — SFX padrao de turno para o DM:** Usar `/sounds/sfx/page-flip.mp3` (6.6K, 0.3s) como SFX padrao de avanco de turno. E sutil, tematico (virar pagina da iniciativa), e nao compete com sons de combate.

**D2 — Toggle on/off no DM (nao por combatente):** Simplicidade radical — um unico toggle "Som de turno" nas preferencias de audio do DM, nao mapeamento por combatente. Per-combatant SFX e over-engineering para o momento da mesa.

**D3 — Persistencia via localStorage:** O toggle usa `localStorage` (`dm_turn_sfx_enabled`), padrao `true` (ligado). Sem persist no banco — e preferencia local do dispositivo.

**D4 — Volume vinculado ao volume master do audio-store:** O SFX de turno respeita `volume` e `isMuted` do `useAudioStore`. Se o DM mutou audio, nao toca SFX de turno.

**D5 — Nao broadcast para players:** O SFX de turno e local para o DM. Players ja tem `TurnNotificationOverlay` com seu proprio som. Nao duplicar feedback.

**D6 — Guest DM tambem ouve:** O GuestCombatClient (`/try`) deve tocar o mesmo SFX de turno, mantendo paridade com DM autenticado.

---

## Contexto Tecnico

### Fluxo de avanco de turno — DM Autenticado

`lib/hooks/useCombatActions.ts` > `handleAdvanceTurn()` (linhas 60-149):
1. Guard anti-double-click (`turnPendingRef`)
2. `useAudioStore.getState().stopAllAudio()` — para audio anterior (linha 66)
3. `advanceTurn()` — atualiza store local (linha 76)
4. `broadcastEvent(sessionId, { type: "combat:turn_advance", ... })` — notifica players (linha 106)
5. Push notification ao player da vez (linhas 113-127)
6. `persistTurnAdvance(encounter_id, nextIdx, nextRound)` — salva no banco (linha 141)

**Ponto de insercao do SFX:** Imediatamente apos `advanceTurn()` na linha 76, antes do broadcast. O SFX e local, nao precisa de broadcast.

### Fluxo de avanco de turno — Guest DM

`components/guest/GuestCombatClient.tsx` > `handleAdvanceTurn()` (linhas 769-773):
```typescript
const handleAdvanceTurn = useCallback(() => {
  const store = useGuestCombatStore.getState();
  pushTurnUndo(store.combatants, store.currentTurnIndex, store.roundNumber);
  advanceTurn();
}, [advanceTurn, pushTurnUndo]);
```

Nota: Guest combat NAO chama `stopAllAudio()` no avanco de turno. O SFX sera adicionado aqui.

### TurnNotificationOverlay (player-side — ja implementado)

`components/player/TurnNotificationOverlay.tsx`:
- Toca `/sounds/turn-notification.mp3` quando `visible=true` (linhas 33-44)
- Vibracao haptica: `navigator.vibrate?.([200, 100, 200])` (linha 30)
- Auto-dismiss em 3 segundos
- **Nenhuma alteracao necessaria neste componente**

### audio-store.ts

- `playSound(soundId, source, playerName, url)` — toca one-shot (linhas 102-142)
- `isMuted` e `volume` — controles globais
- `stopAllAudio()` — para tudo (usado no avanco de turno do DM autenticado)
- O SFX de turno nao deve usar `playSound` pois isso setaria `activeAudioId` e `lastSoundLabel`, interferindo no estado visual. Usar `new Audio()` diretamente.

### SFX disponiveis para turno

Candidatos do `/public/sounds/sfx/`:
- `page-flip.mp3` (6.6K) — **escolhido** — sutil, tematico
- `ui-click.mp3` (1.3K) — muito generico
- `book-open.mp3` (1.7K) — alternativa valida
- `notification.mp3` (2.4K) — pode confundir com TurnNotificationOverlay do player

---

## Criterios de Aceite

### SFX no avanco de turno

1. Quando DM clica "Next Turn", um SFX sutil (`page-flip.mp3`) toca localmente no dispositivo do DM
2. O SFX nao e broadcast para players (players tem seu proprio `TurnNotificationOverlay`)
3. O SFX respeita volume master (`useAudioStore.volume`) e estado mute (`useAudioStore.isMuted`)
4. Se `isMuted=true`, nenhum SFX de turno toca
5. O SFX nao interfere com ambient/music loops ativos do DM

### Toggle de preferencia

6. Existe um toggle "Som de turno" acessivel na interface do DM (dentro do DmSoundboard panel ou toolbar de combate)
7. Padrao: ligado (`true`)
8. Estado persiste em `localStorage` (`dm_turn_sfx_enabled`)
9. Desligar o toggle impede o SFX de tocar no avanco de turno

### Paridade Guest/Auth

10. Guest DM (`/try`) ouve o SFX de turno ao avancar turno
11. DM autenticado ouve o SFX de turno ao avancar turno
12. Toggle funciona em ambos os modos

### Nao-regressao

13. `TurnNotificationOverlay` do player continua funcionando normalmente
14. `stopAllAudio()` no DM autenticado nao afeta o SFX de turno (SFX e fire-and-forget)
15. Undo de turno (Guest) nao toca SFX

---

## Abordagem Tecnica

### Passo 1: Criar utility para SFX de turno

Criar uma funcao pura que toca o SFX respeitando volume e mute, sem afetar o estado do audio-store:

```typescript
// lib/utils/turn-sfx.ts

const LS_KEY = "dm_turn_sfx_enabled";
const TURN_SFX_PATH = "/sounds/sfx/page-flip.mp3";

let cachedAudio: HTMLAudioElement | null = null;

export function isTurnSfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(LS_KEY);
  return stored !== "false"; // default true
}

export function setTurnSfxEnabled(enabled: boolean): void {
  localStorage.setItem(LS_KEY, String(enabled));
}

export function playTurnSfx(): void {
  if (!isTurnSfxEnabled()) return;

  // Import audio store inline to avoid circular deps
  const { isMuted, volume } = (await import("@/lib/stores/audio-store")).useAudioStore.getState();
  if (isMuted) return;

  if (!cachedAudio) {
    cachedAudio = new Audio(TURN_SFX_PATH);
  }
  cachedAudio.volume = Math.min(volume, 0.5); // Cap at 50% — SFX should be subtle
  cachedAudio.currentTime = 0;
  cachedAudio.play().catch(() => {
    // Autoplay blocked — ignore silently
  });
}
```

**Nota:** Como `import()` dinamico retorna Promise, a funcao precisa ser async. Alternativa mais simples — importar `useAudioStore` no topo do modulo (sem circular dep pois `turn-sfx.ts` e um util, nao um store):

```typescript
// lib/utils/turn-sfx.ts
import { useAudioStore } from "@/lib/stores/audio-store";

const LS_KEY = "dm_turn_sfx_enabled";
const TURN_SFX_PATH = "/sounds/sfx/page-flip.mp3";

let cachedAudio: HTMLAudioElement | null = null;

export function isTurnSfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(LS_KEY);
  return stored !== "false";
}

export function setTurnSfxEnabled(enabled: boolean): void {
  localStorage.setItem(LS_KEY, String(enabled));
}

export function playTurnSfx(): void {
  if (!isTurnSfxEnabled()) return;

  const { isMuted, volume } = useAudioStore.getState();
  if (isMuted) return;

  if (!cachedAudio) {
    cachedAudio = new Audio(TURN_SFX_PATH);
  }
  cachedAudio.volume = Math.min(volume, 0.5);
  cachedAudio.currentTime = 0;
  cachedAudio.play().catch(() => {});
}
```

### Passo 2: Integrar no DM Autenticado (useCombatActions.ts)

Em `lib/hooks/useCombatActions.ts`, adicionar chamada apos `advanceTurn()`:

```typescript
import { playTurnSfx } from "@/lib/utils/turn-sfx";

// Dentro de handleAdvanceTurn, apos linha 76 (advanceTurn()):
advanceTurn();
playTurnSfx(); // SFX local para o DM
```

**Posicao exata:** Apos `advanceTurn()` (linha 76), antes do calculo de `nextCombatantId`. O SFX e fire-and-forget, nao bloqueia o fluxo.

### Passo 3: Integrar no Guest DM (GuestCombatClient.tsx)

Em `components/guest/GuestCombatClient.tsx`, dentro de `handleAdvanceTurn`:

```typescript
import { playTurnSfx } from "@/lib/utils/turn-sfx";

const handleAdvanceTurn = useCallback(() => {
  const store = useGuestCombatStore.getState();
  pushTurnUndo(store.combatants, store.currentTurnIndex, store.roundNumber);
  advanceTurn();
  playTurnSfx(); // SFX local para o DM guest
}, [advanceTurn, pushTurnUndo]);
```

### Passo 4: Toggle UI no DmSoundboard

Adicionar toggle no painel do DmSoundboard (modo combate, nao dashboard). Posicionar no header do panel, ao lado do botao "Stop All":

```tsx
// Em DmSoundboard.tsx, adicionar estado e imports
import { isTurnSfxEnabled, setTurnSfxEnabled } from "@/lib/utils/turn-sfx";

// Dentro do componente:
const [turnSfx, setTurnSfx] = useState(isTurnSfxEnabled);

const handleTurnSfxToggle = useCallback(() => {
  const next = !turnSfx;
  setTurnSfx(next);
  setTurnSfxEnabled(next);
}, [turnSfx]);
```

Renderizar no header do painel de combate (dentro do `<motion.div>` do panel, apos o header):

```tsx
{/* Turn SFX toggle */}
<div className="flex items-center justify-between mb-3 px-1">
  <span className="text-xs text-muted-foreground">{t("turn_sfx_toggle")}</span>
  <button
    type="button"
    onClick={handleTurnSfxToggle}
    className={`relative w-8 h-4 rounded-full transition-colors ${
      turnSfx ? "bg-gold/60" : "bg-white/10"
    }`}
    aria-label={t("turn_sfx_toggle")}
    data-testid="turn-sfx-toggle"
  >
    <span
      className={`absolute top-0.5 w-3 h-3 rounded-full transition-transform ${
        turnSfx ? "translate-x-4 bg-gold" : "translate-x-0.5 bg-gray-500"
      }`}
    />
  </button>
</div>
```

### Passo 5: Adicionar chaves i18n

**messages/pt-BR.json** (namespace `audio`):
```json
"turn_sfx_toggle": "Som ao trocar turno"
```

**messages/en.json** (namespace `audio`):
```json
"turn_sfx_toggle": "Turn advance sound"
```

---

## Arquivos a Modificar

| Arquivo | Alteracao | Tipo |
|---------|-----------|------|
| `lib/utils/turn-sfx.ts` | Criar utility com `playTurnSfx`, `isTurnSfxEnabled`, `setTurnSfxEnabled` | Novo |
| `lib/hooks/useCombatActions.ts` | Chamar `playTurnSfx()` apos `advanceTurn()` na linha 76 | Modificacao |
| `components/guest/GuestCombatClient.tsx` | Chamar `playTurnSfx()` apos `advanceTurn()` no `handleAdvanceTurn` | Modificacao |
| `components/audio/DmSoundboard.tsx` | Adicionar toggle de turn SFX no header do panel | Modificacao |
| `messages/en.json` | Adicionar `audio.turn_sfx_toggle` | Modificacao |
| `messages/pt-BR.json` | Adicionar `audio.turn_sfx_toggle` | Modificacao |

---

## Plano de Testes

### Testes Manuais

**Guest DM (`/try`):**
1. Iniciar combate guest com 3+ combatentes
2. Clicar "Next Turn" — ouvir SFX de page-flip sutil
3. Abrir DmSoundboard, desligar toggle "Som ao trocar turno"
4. Clicar "Next Turn" — nenhum SFX
5. Religar toggle, mutar audio geral (botao de volume)
6. Clicar "Next Turn" — nenhum SFX (muted)
7. Desmutar, verificar que SFX volta
8. Fazer undo de turno — SFX NAO deve tocar no undo

**DM Autenticado:**
9. Iniciar combate via campanha com players conectados
10. Clicar "Next Turn" — DM ouve SFX localmente
11. Player NAO ouve o SFX de turno do DM (tem seu proprio TurnNotificationOverlay)
12. Verificar que ambient loops continuam tocando durante avanco de turno
13. Verificar que `stopAllAudio()` no avanco de turno nao para o SFX (SFX usa Audio separado)

**Player (`/join`):**
14. Conectar como player, esperar DM avancar turno para voce
15. Verificar que TurnNotificationOverlay continua tocando `turn-notification.mp3` normalmente
16. Verificar que player NAO ouve `page-flip.mp3`

### Testes Automatizados

```typescript
// lib/utils/turn-sfx.test.ts
describe("turn-sfx", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("is enabled by default", () => {
    expect(isTurnSfxEnabled()).toBe(true);
  });

  it("can be disabled via setTurnSfxEnabled", () => {
    setTurnSfxEnabled(false);
    expect(isTurnSfxEnabled()).toBe(false);
    expect(localStorage.getItem("dm_turn_sfx_enabled")).toBe("false");
  });

  it("persists enabled state", () => {
    setTurnSfxEnabled(true);
    expect(isTurnSfxEnabled()).toBe(true);
  });

  it("playTurnSfx does not throw when audio not available", () => {
    expect(() => playTurnSfx()).not.toThrow();
  });

  it("playTurnSfx respects muted state", () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "Audio").mockImplementation(() => ({ play: mockPlay, volume: 0, currentTime: 0 } as any));
    useAudioStore.setState({ isMuted: true, volume: 0.7 });
    playTurnSfx();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it("playTurnSfx respects disabled toggle", () => {
    const mockPlay = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "Audio").mockImplementation(() => ({ play: mockPlay, volume: 0, currentTime: 0 } as any));
    setTurnSfxEnabled(false);
    useAudioStore.setState({ isMuted: false, volume: 0.7 });
    playTurnSfx();
    expect(mockPlay).not.toHaveBeenCalled();
  });
});

// DmSoundboard.test.tsx
describe("DmSoundboard turn SFX toggle", () => {
  it("renders turn SFX toggle in combat mode", () => {
    render(<DmSoundboard onBroadcast={vi.fn()} />);
    // Open panel
    fireEvent.click(screen.getByLabelText(/combat sounds/i));
    expect(screen.getByTestId("turn-sfx-toggle")).toBeInTheDocument();
  });

  it("does not render turn SFX toggle in ambientOnly mode", () => {
    render(<DmSoundboard ambientOnly />);
    expect(screen.queryByTestId("turn-sfx-toggle")).not.toBeInTheDocument();
  });
});
```

---

## Notas de Paridade

| Modo | Aplica? | Detalhes |
|------|---------|----------|
| Guest (`/try`) | SIM — DM | GuestCombatClient.handleAdvanceTurn chama `playTurnSfx()`. Toggle visivel no DmSoundboard (se renderizado no guest). |
| Anonimo (`/join`) | NAO — Player | Player ja tem TurnNotificationOverlay. SFX de turno e exclusivo do DM. |
| Autenticado — DM | SIM — DM | useCombatActions.handleAdvanceTurn chama `playTurnSfx()`. Toggle no DmSoundboard. |
| Autenticado — Player (`/invite`) | NAO — Player | Mesmo que anonimo — player tem TurnNotificationOverlay. |

**Nota sobre DmSoundboard no Guest:** Verificar se DmSoundboard e renderizado no GuestCombatClient. Se nao for (Guest DM nao tem soundboard no combate), o toggle precisa ser adicionado em outro local acessivel do guest, ou manter habilitado por padrao sem toggle no guest.

**Verificacao necessaria:** Buscar onde DmSoundboard e renderizado no contexto de combate do GuestCombatClient. Se nao existir, considerar:
- Opcao A: Adicionar DmSoundboard ao GuestCombatClient (scope creep — nao recomendado para esta story)
- Opcao B: Turn SFX fica sempre ligado no Guest, sem toggle (o DM pode mutar via volume geral)

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| SFX de turno compete com ambient/music ativo | Media | Baixo | Volume capped em 50% (`Math.min(volume, 0.5)`). `page-flip.mp3` e curto (0.3s) e nao compete com loops. |
| `stopAllAudio()` em useCombatActions para o SFX de turno | Baixa | Medio | SFX usa `HTMLAudioElement` separado do store (`cachedAudio`), nao registrado em `activeAudio`. `stopAllAudio` so para `activeAudio` e `activeLoops`. |
| Double-trigger no avanco rapido de turno | Baixa | Baixo | `page-flip.mp3` e curto. `cachedAudio.currentTime = 0` reseta o audio. Guard `turnPendingRef` em useCombatActions previne double-advance. |
| Browser bloca autoplay do SFX | Media | Baixo | `.play().catch(() => {})` silencia o erro. Apos primeira interacao do usuario (clicar "Next Turn"), autoplay policy e satisfeita. |
| DmSoundboard nao renderizado no GuestCombatClient | Alta | Medio | Verificar e documentar. Se nao existir, toggle fica indisponivel no guest — SFX toca por padrao, mute geral desliga. |
| localStorage nao disponivel (modo privado em Safari antigo) | Muito Baixa | Baixo | `isTurnSfxEnabled` retorna `true` por padrao se `localStorage` falha. Wrap em try/catch no setter. |

---

## Definicao de Pronto

- [ ] `playTurnSfx()` utility criada em `lib/utils/turn-sfx.ts`
- [ ] SFX toca ao avancar turno no DM autenticado (`useCombatActions.ts`)
- [ ] SFX toca ao avancar turno no Guest DM (`GuestCombatClient.tsx`)
- [ ] SFX NAO toca no undo de turno
- [ ] SFX respeita `isMuted` e `volume` do audio-store
- [ ] Toggle on/off no DmSoundboard (modo combate)
- [ ] Toggle persiste em localStorage
- [ ] SFX nao e broadcast para players
- [ ] TurnNotificationOverlay do player nao e afetado
- [ ] Chaves i18n adicionadas em pt-BR e en
- [ ] Teste unitario de `turn-sfx.ts` (enabled/disabled/muted)
- [ ] Teste unitario do toggle no DmSoundboard
- [ ] Testado em mobile (Chrome Android) e desktop
- [ ] Build passa sem erros (`next build`)
