# Quick Spec: DM Soundboard

## Objetivo

Dar ao DM acesso rápido a efeitos sonoros (SFX) e sons ambientes durante o combate e no dashboard. Os sons são reproduzidos localmente no DM e transmitidos via Realtime para os jogadores conectados.

## Contexto

A infraestrutura de áudio já existe:
- `useAudioStore` (Zustand) com volume, mute, playback
- `PlayerSoundboard` (FAB + drawer, turn-gated)
- `DmAudioControls` (volume popover no header do combate)
- `audio-presets.ts` com 22 presets (10 SFX + 6 ambient + 3 novos pendentes)
- Broadcast Realtime `audio:play_sound` para jogadores
- API de upload custom (`/api/player-audio`)

## Escopo

### O que fazer

1. **Registrar 3 novos ambient presets** — wind, bonfire, thunder-storm (já processados em `public/sounds/ambient/`)
2. **Criar `DmSoundboard`** — componente FAB + sheet com grid de sons, separado por categoria
3. **Integrar no CombatSessionClient** — ao lado do `DmAudioControls` existente
4. **Integrar no Dashboard DM** — seção "Sons Rápidos" abaixo dos saved encounters
5. **Ambient looping** — ambient sounds tocam em loop contínuo até o DM parar
6. **Broadcast para jogadores** — ambient + SFX são transmitidos via Realtime channel
7. **Adicionar i18n keys** para os 3 novos presets + labels do soundboard

### O que NÃO fazer

- Upload de áudio custom pelo DM (futuro)
- Mixer de múltiplos ambients simultâneos (futuro)
- Player-side volume control (já existe no DmAudioControls)
- Trocar os SFX placeholder (story separada 2.3)

## Arquivos a criar/modificar

### Criar

| Arquivo | Descrição |
|---|---|
| `components/audio/DmSoundboard.tsx` | Componente principal: FAB + Sheet com grid |

### Modificar

| Arquivo | Mudança |
|---|---|
| `lib/utils/audio-presets.ts` | Adicionar 3 presets: ambient-wind, ambient-bonfire, ambient-thunder-storm |
| `lib/stores/audio-store.ts` | Suportar loop flag para ambient (se não existir) + `stopAmbient()` |
| `components/session/CombatSessionClient.tsx` | Adicionar `<DmSoundboard />` no header toolbar |
| `components/dashboard/DashboardContent.tsx` | Adicionar seção "Sons Rápidos" na DmSection (apenas ambient) |
| `messages/en.json` | 6 novas keys (3 presets + 3 labels) |
| `messages/pt-BR.json` | 6 novas keys (3 presets + 3 labels) |

## Design do Componente

### DmSoundboard (Combat View)

```
┌──────────────────────────────────────┐
│ 🔊 FAB button (bottom-right, acima  │
│     do FAB existente do Oracle)      │
└──────────────────────────────────────┘
         ↓ click abre Sheet
┌──────────────────────────────────────┐
│  🎵 Sons de Combate                 │
│                                      │
│  ── Ambiente ──────────────────────  │
│  [🌧️ Chuva ] [🏔️ Vento ] [🔥 Fogueira]│
│  [🍺 Taverna] [🌲 Floresta] [🌊 Oceano]│
│  [🕶️ Dungeon] [🏞️ Riacho ] [⛈️ Tempest]│
│  ── Ativo: 🌧️ Chuva ─── [⏹ Parar] │
│                                      │
│  ── Efeitos ───────────────────────  │
│  [⚔️ Espada] [🔥 Fireball] [💚 Cura ]│
│  [⚡ Trovão] [💀 Morte  ] [📯 Grito ]│
│  [🛡️ Escudo] [🏹 Flecha ] [🎲 Crítico]│
│  [🌀 Teleport]                       │
└──────────────────────────────────────┘
```

**Comportamento:**
- **Ambient:** Toggle — clicar inicia loop, clicar de novo para. Só 1 ambient por vez.
- **SFX:** One-shot — toca uma vez e para. Cooldown de 1.5s anti-spam.
- **Indicador visual:** Ambient ativo mostra borda pulsante verde + label "Ativo: X".
- **Stop All:** Botão para parar tudo.
- **Min-height 44px** em todos os botões (WCAG touch target).

### Dashboard DM (Quick Access)

Na `DmSection` do dashboard, abaixo do link de Presets:

```
┌──────────────────────────────────────┐
│ 🔊 Sons Ambientes                   │
│ [🌧️] [🏔️] [🔥] [🍺] [🌲] [🌊] [🕶️] [🏞️] [⛈️] │
│ ── 🌧️ Chuva tocando ── [⏹]        │
└──────────────────────────────────────┘
```

**Nota:** No dashboard, só ambient (sem SFX). SFX só faz sentido em combate com broadcast.

## Novos Presets

```typescript
{ id: "ambient-wind", name_key: "audio.preset_ambient_wind", file: "/sounds/ambient/wind.mp3", icon: "🏔️", category: "ambient" },
{ id: "ambient-bonfire", name_key: "audio.preset_ambient_bonfire", file: "/sounds/ambient/bonfire.mp3", icon: "🔥", category: "ambient" },
{ id: "ambient-thunder-storm", name_key: "audio.preset_ambient_thunder_storm", file: "/sounds/ambient/thunder-storm.mp3", icon: "⛈️", category: "ambient" },
```

## i18n Keys

```json
// en.json
"audio": {
  "preset_ambient_wind": "Wind",
  "preset_ambient_bonfire": "Bonfire",
  "preset_ambient_thunder_storm": "Thunder Storm",
  "dm_soundboard": "Combat Sounds",
  "dm_ambient_section": "Ambient",
  "dm_sfx_section": "Sound Effects",
  "dm_ambient_playing": "Playing: {name}",
  "dm_stop_ambient": "Stop",
  "dm_stop_all": "Stop All",
  "dashboard_ambient_title": "Ambient Sounds"
}

// pt-BR.json
"audio": {
  "preset_ambient_wind": "Vento",
  "preset_ambient_bonfire": "Fogueira",
  "preset_ambient_thunder_storm": "Tempestade",
  "dm_soundboard": "Sons de Combate",
  "dm_ambient_section": "Ambiente",
  "dm_sfx_section": "Efeitos Sonoros",
  "dm_ambient_playing": "Tocando: {name}",
  "dm_stop_ambient": "Parar",
  "dm_stop_all": "Parar Tudo",
  "dashboard_ambient_title": "Sons Ambientes"
}
```

## Audio Store Changes

```typescript
// Adicionar ao useAudioStore:
activeAmbientId: string | null       // ID do ambient em loop
playAmbient(presetId: string): void  // Inicia loop, para o anterior
stopAmbient(): void                  // Para o ambient atual
isAmbientPlaying: boolean            // Computed from activeAmbientId
```

**Loop implementation:** `HTMLAudioElement.loop = true` para ambient. Ao trocar de ambient, fade out o atual (300ms) antes de iniciar o novo.

## Broadcast

O DM soundboard reutiliza o mesmo evento `audio:play_sound` existente:

```typescript
broadcastEvent(channelRef, {
  type: "audio:play_sound",
  sound_id: preset.id,
  source: "preset",
  player_name: "DM",
})
```

Para ambient start/stop, adicionar novo evento:

```typescript
// Start
{ type: "audio:ambient_start", sound_id: "ambient-rain" }
// Stop
{ type: "audio:ambient_stop" }
```

Jogadores conectados recebem e reproduzem localmente (respeitando o volume do DmAudioControls).

## Critérios de Aceite

- [ ] 9 ambient sounds tocam em loop seamless
- [ ] 10 SFX presets tocam one-shot com cooldown
- [ ] Apenas 1 ambient por vez (toggle behavior)
- [ ] FAB no combate abre sheet com grid categorizado
- [ ] Dashboard mostra barra de ambient quick-access na DmSection
- [ ] Ambient ativo mostra indicador visual (pulsante)
- [ ] Broadcast funciona — jogadores conectados ouvem os sons
- [ ] Volume respeitado (useAudioStore.volume)
- [ ] Mute funciona (useAudioStore.muted)
- [ ] Min-height 44px nos botões (WCAG)
- [ ] i18n completo (pt-BR + en)
- [ ] Sem memory leak (cleanup ao desmontar)
