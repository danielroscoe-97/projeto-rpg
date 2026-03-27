---
title: 'Player Sound Effects — Soundboard de Combate'
slug: 'player-sound-effects'
created: '2026-03-27'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 15', 'React 19', 'Supabase Storage + Realtime', 'Zustand', 'Framer Motion', 'next-intl', 'HTMLAudioElement']
files_to_modify:
  - 'lib/types/realtime.ts'
  - 'lib/realtime/broadcast.ts'
  - 'components/player/PlayerJoinClient.tsx'
  - 'components/player/PlayerInitiativeBoard.tsx'
  - 'components/session/CombatSessionClient.tsx'
  - 'lib/hooks/useCombatActions.ts'
  - 'messages/pt-BR.json'
  - 'messages/en.json'
files_to_create:
  - 'supabase/migrations/028_player_audio.sql'
  - 'lib/types/audio.ts'
  - 'lib/stores/audio-store.ts'
  - 'lib/utils/audio-presets.ts'
  - 'components/audio/PlayerSoundboard.tsx'
  - 'components/audio/AudioUploadManager.tsx'
  - 'components/audio/DmAudioControls.tsx'
  - 'app/api/player-audio/route.ts'
  - 'public/sounds/sfx/*.mp3'
code_patterns:
  - 'HTMLAudioElement via useRef (TurnNotificationOverlay pattern)'
  - 'Supabase Realtime broadcast domain:action events'
  - 'channelRef.current.send() for player→DM broadcast'
  - 'getDmChannel().on("broadcast") for DM-side listeners'
  - 'Supabase Storage upload via FormData + magic bytes validation'
  - 'Zustand store for audio state'
  - 'Framer Motion for button animations'
test_patterns:
  - 'Jest + React Testing Library'
  - '*.test.ts / *.test.tsx co-located'
---

# Tech-Spec: Player Sound Effects — Soundboard de Combate

**Created:** 2026-03-27
**Author:** Dani_ + BMAD Team (Winston, Sally, John, Quinn, Amelia)

## Overview

### Problem Statement

Jogadores em combate presencial não têm forma de contribuir com efeitos sonoros durante seus turnos, perdendo uma camada de imersão e diversão na mesa. O mestre precisa gerenciar tudo sozinho enquanto os jogadores ficam passivos esperando sua vez.

### Solution

Soundboard com áudios pré-definidos (biblioteca temática D&D) + upload custom (max 6 MP3s, 3MB cada, globais da conta). Habilitado **somente no turno do jogador**. O jogador clica no botão → broadcast de `audio_id` via Supabase Realtime → áudio toca **exclusivamente no PC do mestre**. DM tem controle de volume/mute. Áudio corta ao avançar turno.

### Scope

**In Scope:**
- Upload/CRUD de até 6 MP3s por jogador (conta global)
- Biblioteca de ~8-10 sons pré-definidos temáticos (CC0/royalty-free)
- Soundboard UI no player view (habilitado só no turno)
- Player broadcast `audio:play_sound` via Realtime → DM reproduz
- DM audio player com preload de áudios custom dos jogadores
- Controle de volume master + mute toggle no DM
- Corte de áudio ao avançar turno
- Delay anti-spam 2s entre triggers
- Migration SQL + Storage bucket + RLS
- i18n (pt-BR + en)

**Out of Scope:**
- Áudio tocando em todos os dispositivos (só DM)
- WebRTC / streaming de áudio
- Áudio ambiente / música de fundo contínua
- Upload de formatos além de MP3
- Áudio por campanha (global da conta por enquanto)
- Web Audio API (HTMLAudioElement é suficiente para v1)

## Context for Development

### Codebase Patterns

**Audio Playback (existente):**
- `TurnNotificationOverlay.tsx` usa `new Audio("/sounds/turn-notification.mp3")` com `useRef<HTMLAudioElement>`, `.play().catch()` para browser autoplay, `volume = 0.5`

**Broadcast (Player → DM):**
- Player usa `channelRef.current.send({ type: "broadcast", event: "audio:play_sound", payload })` direto no canal Realtime
- DM escuta via `getDmChannel(sid).on("broadcast", { event: "audio:play_sound" }, handler)`
- **IMPORTANTE:** `broadcastEvent()` é helper do DM only. Player envia direto pelo `channelRef`

**File Upload:**
- `FileShareButton.tsx` + `/api/session/[id]/files/route.ts` — FormData, magic bytes, Supabase Storage
- Storage path: `{bucket}/{folder}/{uuid}_{filename}`

**Turn Detection:**
- `PlayerInitiativeBoard.tsx:191-192`: `isPlayerTurn = currentCombatant?.is_player ?? false`
- `PlayerJoinClient.tsx:202-213`: `updateTurnIndex()` — turn change = `prev !== newIndex`

**State Management:**
- Zustand stores para estado de combate, SRD, dice-history, subscription
- Local useState para estado de UI em componentes

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `components/player/TurnNotificationOverlay.tsx` | Padrão de HTMLAudioElement existente |
| `components/player/PlayerInitiativeBoard.tsx` | Player view — integração do soundboard (518 linhas) |
| `components/player/PlayerJoinClient.tsx` | Realtime channel + turn detection (723 linhas) |
| `components/session/CombatSessionClient.tsx` | DM view — listener de áudio + preload |
| `components/session/FileShareButton.tsx` | Padrão de upload de arquivo |
| `app/api/session/[id]/files/route.ts` | Padrão de API de upload com magic bytes |
| `supabase/migrations/024_session_files.sql` | Padrão de migration + RLS |
| `lib/types/realtime.ts` | Event type union (14 tipos, 207 linhas) |
| `lib/realtime/broadcast.ts` | Broadcast sanitization + channel management (212 linhas) |
| `lib/hooks/useCombatActions.ts` | Turn advance handler |

### Technical Decisions

1. **HTMLAudioElement (não Web Audio API)** — Suficiente para play/pause/stop. Sem mixing ou efeitos necessários.
2. **Bucket separado `player-audio`** — RLS por `auth.uid()` (global da conta), não por sessão.
3. **Pre-load no DM** — Signed URLs baixados quando jogadores entram na sessão. Renovação de URLs se sessão >1h.
4. **Delay anti-spam 2s** — Timestamp do último trigger, UI desabilita botão com cooldown visual.
5. **Presets em `/public/sounds/sfx/`** — Estáticos, CDN-cached. Custom em Supabase Storage.
6. **Áudio corta no turn_advance** — `audio.pause(); audio.currentTime = 0;` no handler do DM.
7. **Player envia via `channelRef.current.send()`** — Não usa `broadcastEvent()` (DM-only helper).

---

## Implementation Plan

### Task 1: Tipos e Interfaces de Áudio
- [ ] **Criar `lib/types/audio.ts`**
  - File: `lib/types/audio.ts`
  - Action: Definir interfaces para o sistema de áudio:
    ```typescript
    export interface AudioPreset {
      id: string;           // e.g. "sword-hit"
      name_key: string;     // i18n key: "audio.preset_sword_hit"
      file: string;         // "/sounds/sfx/sword-hit.mp3"
      icon: string;         // emoji: "⚔️"
      category: "attack" | "magic" | "defense" | "dramatic";
    }

    export interface PlayerAudioFile {
      id: string;           // UUID from DB
      user_id: string;
      file_name: string;    // user-given name
      file_path: string;    // Supabase Storage path
      file_size_bytes: number;
      created_at: string;
    }

    export interface AudioPlayEvent {
      sound_id: string;     // preset id OR player_audio UUID
      source: "preset" | "custom";
      player_name: string;  // who triggered it
      audio_url?: string;   // signed URL for custom (DM resolves presets locally)
    }
    ```

### Task 2: Tipo de Evento Realtime
- [ ] **Modificar `lib/types/realtime.ts`**
  - File: `lib/types/realtime.ts`
  - Action: Adicionar `"audio:play_sound"` ao `RealtimeEventType` union (linha ~19). Criar interface `RealtimeAudioPlay`:
    ```typescript
    export interface RealtimeAudioPlay {
      type: "audio:play_sound";
      sound_id: string;
      source: "preset" | "custom";
      player_name: string;
      audio_url?: string;  // signed URL para custom sounds
    }
    ```
  - Adicionar ao `RealtimeEvent` union e ao `SanitizedEvent` union (pass-through, sem dados sensíveis).

### Task 3: Broadcast — Pass-Through de Áudio
- [ ] **Modificar `lib/realtime/broadcast.ts`**
  - File: `lib/realtime/broadcast.ts`
  - Action: Na função `sanitizePayload()`, adicionar early return para eventos de áudio (sem sanitização necessária — não contém dados de monstro/HP):
    ```typescript
    if (event.type === "audio:play_sound") return event;
    ```

### Task 4: Presets de Áudio
- [ ] **Criar `lib/utils/audio-presets.ts`**
  - File: `lib/utils/audio-presets.ts`
  - Action: Definir array de `AudioPreset[]` com 8-10 sons temáticos:
    - ⚔️ `sword-hit` — Golpe de Espada
    - 🔥 `fireball` — Bola de Fogo
    - 💚 `healing` — Cura Divina
    - ⚡ `thunder` — Trovão
    - 💀 `death` — Morte do Monstro
    - 📯 `war-cry` — Grito de Guerra
    - 🛡️ `shield` — Escudo Mágico
    - 🏹 `arrow` — Flecha Certeira
    - 🎲 `critical-hit` — Acerto Crítico
    - 🌀 `teleport` — Teleporte
  - Exportar função `getPresetById(id: string): AudioPreset | undefined`
  - Exportar função `getAllPresets(): AudioPreset[]`
  - Notes: Os nomes i18n ficam em `messages/*.json`, aqui só os IDs e paths

- [ ] **Adicionar arquivos MP3 em `public/sounds/sfx/`**
  - Action: Obter 8-10 MP3s CC0/royalty-free (Freesound.org, Pixabay Sound, etc.)
  - Formato: MP3, mono, 44.1kHz, ≤200KB cada
  - Nomes: `sword-hit.mp3`, `fireball.mp3`, `healing.mp3`, `thunder.mp3`, `death.mp3`, `war-cry.mp3`, `shield.mp3`, `arrow.mp3`, `critical-hit.mp3`, `teleport.mp3`

### Task 5: Migration SQL + Storage Bucket
- [ ] **Criar `supabase/migrations/028_player_audio.sql`**
  - File: `supabase/migrations/028_player_audio.sql`
  - Action: Criar tabela `player_audio_files` + RLS + bucket:
    ```sql
    -- Tabela de áudios do jogador (global da conta, max 6)
    CREATE TABLE player_audio_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL CHECK (char_length(file_name) <= 50),
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 3145728),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_player_audio_user ON player_audio_files(user_id);

    ALTER TABLE player_audio_files ENABLE ROW LEVEL SECURITY;

    -- Jogador gerencia seus próprios áudios
    CREATE POLICY player_audio_own_select ON player_audio_files
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY player_audio_own_insert ON player_audio_files
      FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND (SELECT count(*) FROM player_audio_files WHERE user_id = auth.uid()) < 6
      );

    CREATE POLICY player_audio_own_delete ON player_audio_files
      FOR DELETE USING (auth.uid() = user_id);

    -- DM pode ver áudios dos jogadores na sessão (para preload)
    CREATE POLICY player_audio_dm_view ON player_audio_files
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM session_tokens st
          JOIN sessions s ON s.id = st.session_id
          WHERE st.anon_user_id = player_audio_files.user_id
          AND s.owner_id = auth.uid()
        )
      );

    -- Storage bucket (criar via SQL em storage.buckets)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'player-audio',
      'player-audio',
      false,
      3145728,
      ARRAY['audio/mpeg']
    ) ON CONFLICT (id) DO NOTHING;

    -- Storage policies
    CREATE POLICY player_audio_storage_insert ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'player-audio'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY player_audio_storage_select ON storage.objects
      FOR SELECT USING (
        bucket_id = 'player-audio'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    CREATE POLICY player_audio_storage_delete ON storage.objects
      FOR DELETE USING (
        bucket_id = 'player-audio'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- DM pode ler áudios de jogadores da sessão dele
    CREATE POLICY player_audio_storage_dm_read ON storage.objects
      FOR SELECT USING (
        bucket_id = 'player-audio'
        AND EXISTS (
          SELECT 1 FROM session_tokens st
          JOIN sessions s ON s.id = st.session_id
          WHERE st.anon_user_id = (storage.foldername(name))[1]::uuid
          AND s.owner_id = auth.uid()
        )
      );
    ```

### Task 6: API de Upload de Áudio
- [ ] **Criar `app/api/player-audio/route.ts`**
  - File: `app/api/player-audio/route.ts`
  - Action: API com 3 métodos:
    - **GET** — Lista os áudios do jogador autenticado (`player_audio_files WHERE user_id = auth.uid()`)
    - **POST** — Upload de MP3:
      1. Auth check (`getUser()`)
      2. Verificar contagem < 6
      3. FormData → File extraction
      4. Size check (≤ 3MB)
      5. Magic bytes validation: MP3 header `0xFF 0xFB`, `0xFF 0xF3`, `0xFF 0xF2`, ou ID3 tag `0x49 0x44 0x33`
      6. Upload para Supabase Storage: `player-audio/{user_id}/{uuid}_{filename}`
      7. Insert em `player_audio_files`
      8. Return record
    - **DELETE** — Remove áudio por `id`:
      1. Auth check
      2. Fetch record (verify `user_id = auth.uid()`)
      3. Delete from Storage
      4. Delete from DB
  - Notes: Seguir exatamente o padrão de `/api/session/[id]/files/route.ts` para error handling e captureError

### Task 7: Audio Store (Zustand)
- [ ] **Criar `lib/stores/audio-store.ts`**
  - File: `lib/stores/audio-store.ts`
  - Action: Zustand store para estado de áudio no DM:
    ```typescript
    interface AudioState {
      // DM playback state
      volume: number;          // 0-1, default 0.7
      isMuted: boolean;        // default false
      activeAudioId: string | null;
      activeAudio: HTMLAudioElement | null;

      // Preloaded player audio URLs (signed)
      playerAudioUrls: Map<string, string>;  // audioFileId → signed URL
      preloadedAudio: Map<string, HTMLAudioElement>;

      // Actions
      setVolume: (volume: number) => void;
      toggleMute: () => void;
      playSound: (soundId: string, source: "preset" | "custom", url?: string) => void;
      stopAllAudio: () => void;
      preloadPlayerAudio: (audioFiles: PlayerAudioFile[]) => Promise<void>;
      cleanup: () => void;
    }
    ```
  - `playSound()`: Cria `new Audio(url)`, seta volume, chama `.play().catch()`. Guarda ref em `activeAudio`.
  - `stopAllAudio()`: `activeAudio.pause(); activeAudio.currentTime = 0; activeAudio = null;`
  - `preloadPlayerAudio()`: Busca signed URLs do Supabase, cria `new Audio()` para cada e chama `.load()` (preload sem play).
  - Volume/mute persistidos em `localStorage` key `dm_audio_volume` e `dm_audio_muted`.

### Task 8: Componente Soundboard do Jogador
- [ ] **Criar `components/audio/PlayerSoundboard.tsx`**
  - File: `components/audio/PlayerSoundboard.tsx`
  - Action: Componente de soundboard que aparece no player view:
    - **Props:** `isPlayerTurn: boolean`, `playerName: string`, `channelRef: RefObject<RealtimeChannel>`, `customAudioFiles: PlayerAudioFile[]`
    - **UI:**
      - FAB (Floating Action Button) com ícone 🔊 no canto inferior direito
      - Tap abre mini-drawer com grid 3x2 (6 slots)
      - Seção "Efeitos" com presets (scroll horizontal se >6)
      - Seção "Meus Sons" com custom uploads (slots vazios mostram "+")
      - Cada botão: ícone + nome curto, tap para tocar
      - Fora do turno: drawer desabilitado, FAB em cinza com opacity 40%
    - **Lógica:**
      - `lastTriggerRef = useRef<number>(0)` — anti-spam: `Date.now() - lastTrigger < 2000` → ignore
      - On play: `channelRef.current.send({ type: "broadcast", event: "audio:play_sound", payload: { sound_id, source, player_name, audio_url? } })`
      - Botão pulsa com Framer Motion `animate={{ scale: [1, 1.15, 1] }}` durante 300ms
      - Cooldown visual: botão fica disabled com progress ring de 2s (CSS animation)
    - **Responsiveness:** Grid adapta para mobile (3x2), tablet (4x2)

### Task 9: Componente de Upload/Gerenciamento
- [ ] **Criar `components/audio/AudioUploadManager.tsx`**
  - File: `components/audio/AudioUploadManager.tsx`
  - Action: Tela "Meus Sons" acessível via settings/perfil do jogador:
    - Grid de 6 slots fixos
    - Cada slot: preview (play/pause inline), nome editável, botão de delete, indicador de tamanho
    - Slot vazio: botão "+" abre file picker (accept="audio/mpeg")
    - Upload com progress bar simulada (padrão FileShareButton)
    - Confirmação de delete (toast com undo de 5s)
    - Se já tem 6 arquivos: "+" abre dialog "Substitua um som existente"
    - Feedback: toast.success/error via Sonner
  - Notes: Este componente NÃO é usado durante combate — é acessado via área logada

### Task 10: Player Audio Controls no DM View
- [ ] **Criar `components/audio/DmAudioControls.tsx`**
  - File: `components/audio/DmAudioControls.tsx`
  - Action: Widget de controle de áudio na toolbar do DM:
    - Ícone 🔊 (ou 🔇 quando mudo) na toolbar do CombatSessionClient
    - Click abre popover com:
      - Slider de volume (0-100%)
      - Toggle mute
      - Indicador "Último som: [PlayerName] — [SoundName]" (se algo tocou recentemente)
    - Usa `useAudioStore` para ler/setar volume e mute
    - Ícone muda baseado em volume: 🔇 (muted), 🔈 (low), 🔊 (normal)
  - Notes: Posicionar na toolbar ao lado do botão de Cheatsheet (CombatSessionClient ~linha 453)

### Task 11: Integração no Player View
- [ ] **Modificar `components/player/PlayerInitiativeBoard.tsx`**
  - File: `components/player/PlayerInitiativeBoard.tsx`
  - Action:
    - Adicionar props: `channelRef`, `customAudioFiles`
    - Renderizar `<PlayerSoundboard>` ao lado do PlayerBottomBar (antes do closing div, ~linha 514)
    - Passar `isPlayerTurn`, `playerName` (do combatant atual), `channelRef`, `customAudioFiles`

- [ ] **Modificar `components/player/PlayerJoinClient.tsx`**
  - File: `components/player/PlayerJoinClient.tsx`
  - Action:
    - Fetch áudios custom do jogador autenticado: `GET /api/player-audio` no mount (try/catch — anônimos retornam array vazio)
    - State: `const [playerAudioFiles, setPlayerAudioFiles] = useState<PlayerAudioFile[]>([])`
    - Passar `channelRef` e `playerAudioFiles` para `PlayerInitiativeBoard`
    - **Broadcast dos custom audio URLs para o DM**: No momento do join (após registro), enviar lista de áudios via canal para o DM fazer preload

### Task 12: Integração no DM View
- [ ] **Modificar `components/session/CombatSessionClient.tsx`**
  - File: `components/session/CombatSessionClient.tsx`
  - Action:
    - Import e usar `useAudioStore`
    - Adicionar listener no canal: `.on("broadcast", { event: "audio:play_sound" }, handleAudioPlay)` paralelo ao listener de late-join (~linha 397)
    - `handleAudioPlay`: Resolver URL do som (preset = `/sounds/sfx/{id}.mp3`, custom = `payload.audio_url`), chamar `audioStore.playSound()`
    - Toast discreto: `🔊 {player_name}: {sound_name}` (duration: 2s, posição bottom-right)
    - Renderizar `<DmAudioControls>` na toolbar (~linha 453)
    - **Preload**: Listener para evento `audio:player_sounds_list` — quando player envia lista de seus áudios, DM faz preload

- [ ] **Modificar `lib/hooks/useCombatActions.ts`**
  - File: `lib/hooks/useCombatActions.ts`
  - Action: Na função `handleAdvanceTurn` (antes do broadcast de `combat:turn_advance`), chamar `useAudioStore.getState().stopAllAudio()` para cortar qualquer áudio tocando.

### Task 13: i18n
- [ ] **Modificar `messages/pt-BR.json`**
  - File: `messages/pt-BR.json`
  - Action: Adicionar namespace `audio`:
    ```json
    "audio": {
      "soundboard": "Sons de Combate",
      "my_sounds": "Meus Sons",
      "presets": "Efeitos Sonoros",
      "upload": "Enviar Áudio",
      "upload_success": "Áudio enviado com sucesso",
      "upload_error": "Falha ao enviar áudio",
      "delete_success": "Áudio removido",
      "delete_confirm": "Remover este áudio?",
      "error_format": "Formato inválido. Use MP3.",
      "error_size": "Arquivo muito grande. Máximo: 3MB.",
      "error_limit": "Limite de 6 áudios atingido. Remova um para adicionar outro.",
      "cooldown": "Aguarde...",
      "disabled_not_turn": "Disponível apenas no seu turno",
      "dm_volume": "Volume dos jogadores",
      "dm_muted": "Sons dos jogadores silenciados",
      "dm_unmuted": "Sons dos jogadores ativados",
      "last_sound": "Último som",
      "preset_sword_hit": "Golpe de Espada",
      "preset_fireball": "Bola de Fogo",
      "preset_healing": "Cura Divina",
      "preset_thunder": "Trovão",
      "preset_death": "Morte do Monstro",
      "preset_war_cry": "Grito de Guerra",
      "preset_shield": "Escudo Mágico",
      "preset_arrow": "Flecha Certeira",
      "preset_critical_hit": "Acerto Crítico",
      "preset_teleport": "Teleporte",
      "slot_empty": "Slot vazio",
      "replace_sound": "Substituir som"
    }
    ```

- [ ] **Modificar `messages/en.json`**
  - File: `messages/en.json`
  - Action: Mesmo namespace `audio` em inglês:
    ```json
    "audio": {
      "soundboard": "Combat Sounds",
      "my_sounds": "My Sounds",
      "presets": "Sound Effects",
      "upload": "Upload Audio",
      "upload_success": "Audio uploaded successfully",
      "upload_error": "Audio upload failed",
      "delete_success": "Audio removed",
      "delete_confirm": "Remove this audio?",
      "error_format": "Invalid format. Use MP3.",
      "error_size": "File too large. Maximum: 3MB.",
      "error_limit": "6 audio limit reached. Remove one to add another.",
      "cooldown": "Wait...",
      "disabled_not_turn": "Available only on your turn",
      "dm_volume": "Player sounds volume",
      "dm_muted": "Player sounds muted",
      "dm_unmuted": "Player sounds enabled",
      "last_sound": "Last sound",
      "preset_sword_hit": "Sword Hit",
      "preset_fireball": "Fireball",
      "preset_healing": "Divine Healing",
      "preset_thunder": "Thunder",
      "preset_death": "Monster Death",
      "preset_war_cry": "War Cry",
      "preset_shield": "Magic Shield",
      "preset_arrow": "Arrow Strike",
      "preset_critical_hit": "Critical Hit",
      "preset_teleport": "Teleport",
      "slot_empty": "Empty slot",
      "replace_sound": "Replace sound"
    }
    ```

---

## Acceptance Criteria

### Upload & Gerenciamento

- [ ] AC1: Given jogador autenticado, when acessa "Meus Sons", then vê 6 slots (vazios ou preenchidos com seus áudios)
- [ ] AC2: Given jogador com <6 áudios, when faz upload de MP3 ≤3MB, then arquivo salvo e slot preenchido com nome e preview
- [ ] AC3: Given jogador com 6 áudios, when tenta upload, then vê mensagem "Limite de 6 atingido. Remova um."
- [ ] AC4: Given jogador, when faz upload de arquivo não-MP3 (ex: WAV renomeado), then rejeita com "Formato inválido"
- [ ] AC5: Given jogador, when faz upload de MP3 >3MB, then rejeita com "Arquivo muito grande"
- [ ] AC6: Given jogador, when deleta um áudio, then slot fica vazio e arquivo removido do Storage
- [ ] AC7: Given jogador anônimo (sem conta), when tenta GET /api/player-audio, then retorna 401 (soundboard mostra só presets)

### Soundboard — Player Turn

- [ ] AC8: Given combate ativo e é o turno do jogador, when jogador abre soundboard, then vê presets + seus custom sounds habilitados
- [ ] AC9: Given combate ativo e NÃO é o turno do jogador, when jogador tenta abrir soundboard, then FAB está cinza/desabilitado com tooltip "Disponível apenas no seu turno"
- [ ] AC10: Given é o turno do jogador, when jogador toca um preset, then evento `audio:play_sound` broadcast com `source: "preset"` e `sound_id`
- [ ] AC11: Given é o turno do jogador, when jogador toca um custom sound, then evento broadcast com `source: "custom"`, `sound_id` e `audio_url` (signed)
- [ ] AC12: Given jogador tocou um som, when tenta tocar outro em <2s, then botão está em cooldown (desabilitado com indicador visual)
- [ ] AC13: Given jogador tocou um som, when espera 2s, then pode tocar outro som normalmente

### DM Playback

- [ ] AC14: Given DM em combate ativo, when jogador envia `audio:play_sound` com preset, then DM ouve o som em `/sounds/sfx/{id}.mp3` no volume configurado
- [ ] AC15: Given DM em combate ativo, when jogador envia `audio:play_sound` com custom, then DM ouve o som via signed URL no volume configurado
- [ ] AC16: Given DM com mute ativo, when jogador envia som, then DM NÃO ouve (som ignorado)
- [ ] AC17: Given DM ajusta volume para 30%, when jogador envia som, then som toca a 30% do volume
- [ ] AC18: Given áudio tocando, when DM avança turno, then áudio corta imediatamente (`pause + currentTime = 0`)
- [ ] AC19: Given DM recarrega página, when volume/mute previamente configurados, then settings restaurados do localStorage
- [ ] AC20: Given jogador envia som, when DM recebe, then toast discreto "🔊 [PlayerName]: [SoundName]" aparece por 2s

### Preload & Performance

- [ ] AC21: Given jogador autenticado entra na sessão com custom audios, when DM está na sessão, then DM recebe lista de áudios e faz preload (signed URLs)
- [ ] AC22: Given signed URL expira (>1h), when jogador toca custom sound, then DM renova URL e toca sem erro perceptível

### Edge Cases

- [ ] AC23: Given browser do DM bloqueia autoplay, when primeiro som é enviado, then som toca após qualquer interação do DM com a página (browser policy)
- [ ] AC24: Given jogador desconecta e reconecta, when volta ao combate no seu turno, then soundboard funciona normalmente
- [ ] AC25: Given combate não está ativo (setup phase), when jogador tenta usar soundboard, then soundboard não está visível

---

## Additional Context

### Dependencies

- **Supabase Storage bucket `player-audio`** — Criado via migration (SQL em `storage.buckets`)
- **Arquivos MP3 CC0** — Obter de Freesound.org ou Pixabay Sound antes da implementação
- **Nenhuma lib externa nova** — HTMLAudioElement nativo é suficiente

### Testing Strategy

**Unit Tests:**
- `lib/utils/audio-presets.test.ts` — `getPresetById()`, `getAllPresets()` retornam dados corretos
- `lib/stores/audio-store.test.ts` — Volume, mute, playSound, stopAllAudio, preload
- `components/audio/PlayerSoundboard.test.tsx` — Renderização com/sem turno, cooldown, click handlers
- `components/audio/DmAudioControls.test.tsx` — Volume slider, mute toggle, rendering states

**Integration Tests (manual):**
1. Upload MP3 → verificar no Supabase Storage
2. Player no turno → clicar preset → verificar som no DM
3. Player no turno → clicar custom → verificar som no DM
4. DM mute → verificar silêncio
5. Avançar turno → verificar corte de áudio
6. Cooldown 2s entre cliques
7. Reconexão do player → soundboard funcional
8. 6 arquivos → tentar 7º → erro

### Notes

**High-Risk Items:**
- Browser autoplay policy pode bloquear o primeiro som no DM. Mitigação: O DM já interage com a página (clica botões de combate) antes do primeiro som, o que destrava o autoplay na maioria dos browsers.
- Signed URLs expiram. Mitigação: Preload no join + refresh periódico.
- Tamanho dos presets no bundle: ~2MB total (10 MP3s × 200KB). Aceitável — são estáticos e CDN-cached.

**Limitações Conhecidas:**
- Player anônimo (sem conta) só vê presets, não pode fazer upload. Comportamento intencional.
- Se DM fecha o laptop/aba, o áudio para. Sem workaround — é o comportamento esperado.
- Sem feedback visual no player de que o DM ouviu. Pode ser adicionado futuramente.

**Considerações Futuras (out of scope):**
- Feedback de "recebido" do DM para o player
- Categorias de presets (ataque, magia, defesa, dramático) com filtro
- Upload de WAV/OGG (converter para MP3 client-side)
- Audio tocando em todos os dispositivos (opção do DM)
- Web Audio API para mixing de múltiplos sons simultâneos
