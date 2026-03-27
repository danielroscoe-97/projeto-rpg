# PROMPT — Implementação: Player Sound Effects (Soundboard de Combate)

Cole este prompt inteiro em uma nova janela do Claude Code.

---

## Instrução Principal

Você vai implementar a feature **Player Sound Effects — Soundboard de Combate** de ponta a ponta. A spec completa está em:

```
_bmad-output/implementation-artifacts/tech-spec-player-sound-effects.md
```

**Leia a spec INTEIRA antes de escrever qualquer código.** Ela contém 13 tasks ordenados por dependência, 25 acceptance criteria, e todas as decisões técnicas já tomadas.

---

## Contexto do Projeto

- **Projeto:** Pocket DM — Combat tracker para D&D 5e, presencial-first
- **Stack:** Next.js 15, React 19, Supabase (auth, DB, Storage, Realtime), Zustand, Framer Motion, next-intl, Tailwind CSS
- **Tech stack completo:** `docs/tech-stack-libraries.md`
- **PRD:** `docs/prd-v2.md` (Epic 6 — Audio & Ambiance)
- **Idioma do código:** Inglês (variáveis, componentes, tipos)
- **Idioma do conteúdo:** pt-BR primário + en (i18n via next-intl)

---

## O Que a Feature Faz

1. **Jogador** faz upload de até 6 MP3s (max 3MB cada) na conta dele (global, não por sessão)
2. Durante combate ativo, **no turno do jogador**, aparece um **soundboard** (FAB → mini-drawer com grid de botões)
3. O soundboard tem **presets pré-definidos** (espada, bola de fogo, cura, etc.) + **áudios custom** do jogador
4. Jogador clica num som → **broadcast via Supabase Realtime** → áudio toca **SÓ no PC do mestre**
5. O DM tem **controle de volume + mute** no toolbar dele
6. Ao avançar turno, **áudio corta imediatamente**
7. **Anti-spam:** delay de 2s entre triggers

---

## Fluxo Técnico Principal

```
Player (turno ativo) → clica botão no PlayerSoundboard
  → channelRef.current.send({
      type: "broadcast",
      event: "audio:play_sound",
      payload: { sound_id, source: "preset"|"custom", player_name, audio_url? }
    })
  → Supabase Realtime broadcast para todos no canal
  → CombatSessionClient (DM) listener .on("broadcast", { event: "audio:play_sound" })
    → audioStore.playSound(sound_id, source, url)
      → new Audio(url).play() no browser do DM
      → Toast: "🔊 João: Bola de Fogo" (2s)
```

**IMPORTANTE:** O player NÃO usa `broadcastEvent()` (que é helper do DM). O player envia direto pelo `channelRef.current.send()`.

---

## Arquivos Chave para Referência (Leia ANTES de implementar)

| Arquivo | O que olhar |
|---------|------------|
| `components/player/TurnNotificationOverlay.tsx` | **Padrão de áudio existente** — `new Audio()`, `useRef<HTMLAudioElement>`, `.play().catch()` |
| `components/player/PlayerInitiativeBoard.tsx` | **Player view** — `isPlayerTurn` (linha ~192), bottom area (linha ~514) onde soundboard entra |
| `components/player/PlayerJoinClient.tsx` | **Canal Realtime** — `channelRef` (linha 149), `updateTurnIndex` (linha ~202), listeners (linhas 243-467) |
| `components/session/CombatSessionClient.tsx` | **DM view** — `getDmChannel(sid).on("broadcast")` (linha ~397), toolbar (linhas 415-463) |
| `lib/types/realtime.ts` | **Event types** — union `RealtimeEventType` (14 tipos), interfaces de payload |
| `lib/realtime/broadcast.ts` | **Broadcast** — `sanitizePayload()`, `broadcastEvent()`, `getDmChannel()` |
| `lib/hooks/useCombatActions.ts` | **Turn advance** — `handleAdvanceTurn()` onde colocar `stopAllAudio()` |
| `app/api/session/[id]/files/route.ts` | **Padrão de upload API** — magic bytes, FormData, Supabase Storage |
| `supabase/migrations/024_session_files.sql` | **Padrão de migration** — tabela + RLS + Storage policies |
| `components/session/FileShareButton.tsx` | **Padrão de upload UI** — progress bar, error handling, toast |

---

## Ordem de Implementação (13 Tasks)

Seguir EXATAMENTE esta ordem (dependências):

1. **`lib/types/audio.ts`** — Interfaces AudioPreset, PlayerAudioFile, AudioPlayEvent
2. **`lib/types/realtime.ts`** — Adicionar `"audio:play_sound"` ao union + interface RealtimeAudioPlay
3. **`lib/realtime/broadcast.ts`** — Pass-through para audio events no sanitizePayload()
4. **`lib/utils/audio-presets.ts`** — Array de presets + helpers
5. **`supabase/migrations/028_player_audio.sql`** — Tabela + RLS + bucket + storage policies
6. **`app/api/player-audio/route.ts`** — GET/POST/DELETE para áudios do jogador
7. **`lib/stores/audio-store.ts`** — Zustand store para DM (volume, mute, play, stop, preload)
8. **`components/audio/PlayerSoundboard.tsx`** — Soundboard UI do jogador (FAB + drawer + grid)
9. **`components/audio/AudioUploadManager.tsx`** — Tela "Meus Sons" para upload/gerenciamento
10. **`components/audio/DmAudioControls.tsx`** — Widget de volume/mute na toolbar do DM
11. **Integração Player** — Modificar PlayerInitiativeBoard + PlayerJoinClient
12. **Integração DM** — Modificar CombatSessionClient + useCombatActions
13. **i18n** — Namespace `audio` em pt-BR.json e en.json (32 keys cada)

---

## Regras Críticas

1. **HP tiers são IMUTÁVEIS:** LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%) — não alterar nada em hp-status.ts
2. **Anti-metagaming:** Nunca expor dados de monstro (HP real, AC, DC) para jogadores
3. **Broadcast sanitization:** Eventos de áudio passam direto (pass-through) — não contêm dados sensíveis
4. **Player envia via `channelRef.current.send()`**, NÃO via `broadcastEvent()`
5. **Áudio toca SÓ no DM** — Nenhum outro client reproduz o som
6. **Magic bytes para MP3:** `0xFF 0xFB`, `0xFF 0xF3`, `0xFF 0xF2` (MPEG sync) ou `0x49 0x44 0x33` (ID3 tag)
7. **Max 6 arquivos por jogador** — Enforced via RLS (count check no INSERT policy)
8. **Cooldown 2s anti-spam** — `Date.now() - lastTrigger < 2000` → ignore click
9. **Corte de áudio no advanceTurn** — `audio.pause(); audio.currentTime = 0;`
10. **localStorage para DM prefs** — Keys: `dm_audio_volume`, `dm_audio_muted`

---

## Arquivos MP3 Pré-Definidos

Crie arquivos placeholder em `public/sounds/sfx/` com os nomes:
- `sword-hit.mp3`
- `fireball.mp3`
- `healing.mp3`
- `thunder.mp3`
- `death.mp3`
- `war-cry.mp3`
- `shield.mp3`
- `arrow.mp3`
- `critical-hit.mp3`
- `teleport.mp3`

**Nota:** Os MP3s reais precisam ser obtidos de fontes CC0 (Freesound.org, Pixabay Sound). Para implementação, gere placeholders silenciosos de 1s (`ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame placeholder.mp3`) ou anote como TODO.

---

## ETAPA 0: Adversarial Review (ANTES de implementar)

Antes de escrever qualquer código, rode uma **Adversarial Review** da spec:

```
/bmad-review-adversarial-general _bmad-output/implementation-artifacts/tech-spec-player-sound-effects.md
```

Analise os findings:
- **CRITICAL/HIGH:** Corrija na spec antes de implementar
- **MEDIUM:** Avalie se vale corrigir agora ou deferir
- **LOW:** Ignore para v1

Depois de resolver os findings críticos, comece a implementação pela Task 1.

---

## Validação Final

Após implementar tudo:

1. `npx tsc --noEmit` — Zero erros
2. `npx jest --passWithNoTests` — Testes novos passando
3. Verificar que os 25 ACs da spec estão cobertos
4. Testar manualmente: player soundboard → DM ouve som → mute → volume → turn advance corta
5. Rodar `/bmad-code-review` no diff final para pegar bugs antes de commit

---

## Referência Rápida: Spec Completa

```
_bmad-output/implementation-artifacts/tech-spec-player-sound-effects.md
```

Leia ANTES de começar. Contém todas as interfaces TypeScript, SQL da migration, keys de i18n, e edge cases documentados.

**Ship it! 🎵**
