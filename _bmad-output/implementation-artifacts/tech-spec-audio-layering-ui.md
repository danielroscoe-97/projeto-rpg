# Tech Spec: Audio Layering Livre — Atualização de UI e Broadcast

## Resumo

Atualizar os 3 componentes de UI do DM + o listener do player + tipos realtime para suportar **layering livre de áudio**: múltiplos loops ambient/music simultâneos com controle individual (play/stop por loop) e "Parar Tudo".

O store (`audio-store.ts`) já foi reescrito com suporte a `activeLoops: ActiveLoop[]`. Esta spec cobre a camada de UI e broadcast.

---

## Estado Atual

### Pronto (store)

| Feature | Método | Localização |
|---------|--------|-------------|
| Múltiplos loops simultâneos | `activeLoops: ActiveLoop[]` | `audio-store.ts:41` |
| Toggle individual | `playAmbient(presetId)` — adiciona ou remove do array | `audio-store.ts:142` |
| Stop individual | `stopLoop(presetId)` | `audio-store.ts:183` |
| Query individual | `isLoopActive(presetId): boolean` | `audio-store.ts:226` |
| Stop todos os loops | `stopAmbient()` | `audio-store.ts:198` |
| Stop tudo (loops + one-shot) | `stopAllAudio()` | `audio-store.ts:207` |
| Backward compat | `activeAmbientId` aponta para `activeLoops[0]?.id` | `audio-store.ts:44` |

### Pendente (esta spec)

| Componente | Problema |
|------------|----------|
| `SoundboardPageClient.tsx` | Usa `activeAmbientId === preset.id` (single-loop) |
| `DmAtmospherePanel.tsx` | Usa `activeAmbientId === preset.id` (single-loop) |
| `DmSoundboard.tsx` | Usa `activeAmbientId === preset.id` + chama `stopAmbient()` no broadcast |
| `PlayerJoinClient.tsx` | `audio:ambient_stop` chama `stopAmbient()` (para TODOS os loops) |
| `lib/types/realtime.ts` | Não tem evento `audio:loop_stop` com `sound_id` |
| `messages/*.json` | Falta chave `now_playing_count` |

---

## Mudanças por Arquivo

### 1. `lib/types/realtime.ts` — Novo evento broadcast

**Adicionar** tipo `RealtimeLoopStop`:

```ts
export interface RealtimeLoopStop {
  type: "audio:loop_stop";
  sound_id: string;
}
```

**Adicionar** `"audio:loop_stop"` ao union `RealtimeBroadcastEvent`.

> `audio:ambient_stop` (sem payload) continua existindo para "Parar Tudo".
> `audio:loop_stop` (com `sound_id`) é o novo evento para stop individual.

### 2. `components/dashboard/SoundboardPageClient.tsx` — Soundboard page

**Substituições:**
- `useAudioStore((s) => s.activeAmbientId)` → `useAudioStore((s) => s.isLoopActive)` + `useAudioStore((s) => s.activeLoops)`
- Remover import de `playAmbient` separado (já vem do store)
- `activeAmbientId === preset.id` → `isLoopActive(preset.id)` (~1 ocorrência na linha 138)

**Adicionar "Now Playing" bar** entre a seção de presets e o grid:
- Visível quando `activeLoops.length > 0`
- Lista de chips: cada um mostra `icon + nome + botão [×]` que chama `stopLoop(id)`
- Botão "Parar Tudo" que chama `stopAllAudio()`

**Adicionar** import de `stopLoop` e `stopAllAudio` do store.

### 3. `components/audio/DmAtmospherePanel.tsx` — Painel flutuante in-combat

**Substituições (15 ocorrências):**
- Linha 75: `useAudioStore((s) => s.activeAmbientId)` → `useAudioStore((s) => s.isLoopActive)` + `useAudioStore((s) => s.activeLoops)`
- Adicionar: `const stopLoop = useAudioStore((s) => s.stopLoop);`
- Linha 128: `activeAmbientId === presetId` → `isLoopActive(presetId)` no `handleAmbientToggle`
- Linha 138: dependency array `[activeAmbientId, ...]` → `[isLoopActive, ...]`
- Linha 173: `!!activeAmbientId` → `activeLoops.length > 0`
- Linhas 287, 308, 338: `activeAmbientId === preset.id` → `isLoopActive(preset.id)`

**Broadcast no `handleAmbientToggle`:**
```ts
const wasPlaying = isLoopActive(presetId);
playAmbient(presetId);
if (onBroadcast) {
  if (wasPlaying) {
    onBroadcast("audio:loop_stop", { sound_id: presetId });  // stop individual
  } else {
    onBroadcast("audio:ambient_start", { sound_id: presetId });
  }
}
```

**Broadcast no `handleStopAll`:**
```ts
stopAllAudio();
onBroadcast?.("audio:ambient_stop", {});  // mantém evento sem payload = stop tudo
```

**Now Playing (sounds tab):**
Substituir o indicador simples de 1 linha por lista de chips com stop individual:
```
🎵 Tocando (3)                    [Parar Tudo]
🌧️ Chuva [×]  ⚔️ Batalha [×]  🏰 Taverna [×]
```

### 4. `components/audio/DmSoundboard.tsx` — Soundboard legacy (combat)

Mesmas substituições do DmAtmospherePanel:
- `activeAmbientId` → `isLoopActive` + `activeLoops` (~12 ocorrências)
- `stopAmbient()` → `stopLoop(id)` para stop individual ou `stopAllAudio()` para parar tudo
- `handleAmbientToggle` broadcast: usar `audio:loop_stop` com `sound_id`
- Adicionar now playing multi-chip no header do panel e no `ambientOnly` mode
- `hasActiveAudio` check: `!!activeAmbientId` → `activeLoops.length > 0`

### 5. `components/player/PlayerJoinClient.tsx` — Player listener

**Adicionar** listener para o novo evento:

```ts
.on("broadcast", { event: "audio:loop_stop" }, ({ payload }) => {
  if (payload.sound_id) {
    useAudioStore.getState().stopLoop(payload.sound_id);
  }
})
```

> `audio:ambient_stop` continua chamando `stopAmbient()` (para tudo).
> `audio:loop_stop` chama `stopLoop(sound_id)` (para individual).
> `audio:ambient_start` continua chamando `playAmbient(sound_id)` (adiciona ao array — funciona sem mudança!).

### 6. `messages/pt-BR.json` + `messages/en.json` — i18n

| Chave (namespace `audio`) | pt-BR | en |
|---------------------------|-------|----|
| `now_playing_count` | `Tocando ({count})` | `Playing ({count})` |

Chaves existentes reutilizadas:
- `dm_stop_all` = "Parar Tudo" / "Stop All"
- `dm_stop_ambient` = "Parar" / "Stop"

---

## UX do "Now Playing" (componente compartilhado)

Layout dos chips ativos (usado nos 3 componentes):

```
┌──────────────────────────────────────────────────┐
│ 🎵 Tocando (2)                      [Parar Tudo] │
│ ┌──────────────┐ ┌──────────────┐                │
│ │ 🌧️ Chuva  × │ │ ⚔️ Batalha × │                │
│ └──────────────┘ └──────────────┘                │
└──────────────────────────────────────────────────┘
```

- Chips são `flex-wrap` para acomodar múltiplos
- Cada chip: `bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full px-2.5 py-1 text-xs`
- Botão `×` no chip: `hover:text-red-400`, chama `stopLoop(id)` + broadcast `audio:loop_stop`
- "Parar Tudo": `text-muted-foreground hover:text-red-400`, chama `stopAllAudio()` + broadcast `audio:ambient_stop`

---

## Impacto no Broadcast (Player-Side)

| Ação do DM | Evento Broadcast | Ação no Player |
|------------|-----------------|----------------|
| Clica preset inativo | `audio:ambient_start { sound_id }` | `playAmbient(id)` — adiciona loop |
| Clica preset ativo (toggle off) | `audio:loop_stop { sound_id }` | `stopLoop(id)` — remove 1 loop |
| "Parar Tudo" | `audio:ambient_stop {}` | `stopAmbient()` — remove todos |

---

## Fora de Escopo

- Custom sounds no layering (são one-shot, não loops)
- Volume individual por loop (usa volume global)
- Limite máximo de loops simultâneos (sem limite artificial)
- Atualização de testes e2e (posterior)
- Persistência de loops ativos entre reloads

---

## Ordem de Implementação

1. `lib/types/realtime.ts` — tipo novo (sem dependências)
2. `messages/*.json` — chave i18n nova
3. `components/player/PlayerJoinClient.tsx` — listener novo (backward compat)
4. `components/dashboard/SoundboardPageClient.tsx` — mais simples (sem broadcast)
5. `components/audio/DmAtmospherePanel.tsx` — com broadcast
6. `components/audio/DmSoundboard.tsx` — com broadcast + ambientOnly mode
