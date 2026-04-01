---
title: 'Soundboard com Upload de Áudios Custom'
slug: 'soundboard-custom-upload'
created: '2026-04-01'
status: 'ready'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [Next.js, TypeScript, Supabase Storage, Tailwind, Zustand]
files_to_modify:
  - components/audio/DmSoundboard.tsx
  - components/audio/CustomSoundUploader.tsx (new)
  - components/audio/CustomSoundCard.tsx (new)
  - app/api/dm-audio/route.ts (new)
  - lib/stores/audio-store.ts
  - app/app/dashboard/soundboard/page.tsx
  - components/dashboard/SoundboardPageClient.tsx
  - app/app/layout.tsx (hamburger menu)
  - messages/pt-BR.json
  - messages/en.json
code_patterns: [supabase-storage-upload, api-route-validation, zustand-store]
test_patterns: [api-route, component-render, file-upload]
---

# Tech-Spec: Soundboard com Upload de Áudios Custom

**Created:** 2026-04-01

## Overview

### Problem Statement

A tela do Soundboard (`/app/dashboard/soundboard`) só mostra presets estáticos (27 sons hardcoded). O DM não consegue adicionar seus próprios efeitos sonoros personalizados para usar nas atmosferas de combate. A tela é básica e pouco útil.

Além disso, o Soundboard foi removido do bottom nav mobile e precisa ser acessível via menu hamburger.

### Solution

Redesenhar a tela do Soundboard com:
1. Seção de **presets existentes** (ambient, music, SFX) reorganizados visualmente
2. Seção de **sons customizados** com upload de MP3 (5MB max), nome, emoji/ícone
3. Preview/play de cada som
4. Integração com painel de Atmosfera do combate
5. Acesso via menu hamburger (mobile) e sidebar desktop (já existe)

### Scope

**In Scope:**
- Upload de até 5 áudios custom (plano free)
- Formato MP3, máximo 5MB por arquivo
- Nomear cada efeito + selecionar emoji
- Preview/play na tela do soundboard
- Delete de efeitos existentes
- Efeitos disponíveis no painel Atmosfera durante combates
- Acesso via menu hamburger
- API route para upload/list/delete
- Tabela `dm_custom_sounds` no Supabase
- Storage bucket `dm-custom-sounds`

**Out of Scope:**
- Limites diferenciados por plano premium (usa constante, fácil de mudar depois)
- Compartilhamento de sons entre DMs
- Edição de áudio (trim, volume, etc)
- Streaming/broadcast para jogadores (usa infraestrutura existente)

## Context for Development

### Codebase Patterns

- **Upload existente**: `AudioUploadManager.tsx` + `app/api/player-audio/route.ts` — valida MP3 por magic bytes, salva no Supabase Storage, metadata no DB. **Reutilizar padrão.**
- **Audio store**: `lib/stores/audio-store.ts` (Zustand) — gerencia playback, volume, presets ativos
- **Audio presets**: `lib/utils/audio-presets.ts` — presets hardcoded com categorias
- **DmSoundboard**: `components/audio/DmSoundboard.tsx` (321 linhas) — painel expansível com tabs por categoria
- **Supabase Storage**: Buckets existentes: `player-audio`, `player-avatars`, `session-files`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `components/audio/AudioUploadManager.tsx` | Upload existente de áudio (player) — reutilizar padrão |
| `app/api/player-audio/route.ts` | API de upload existente — copiar e adaptar |
| `components/audio/DmSoundboard.tsx` | Soundboard atual com presets |
| `lib/stores/audio-store.ts` | Store Zustand de áudio |
| `lib/utils/audio-presets.ts` | Presets hardcoded |
| `components/audio/DmAtmospherePanel.tsx` | Painel de atmosfera no combate |
| `app/app/dashboard/soundboard/page.tsx` | Página do soundboard |

### Technical Decisions

- **Storage bucket**: `dm-custom-sounds/{user_id}/{uuid}.mp3` — separado do `player-audio` por segurança/RLS
- **Tabela DB**: `dm_custom_sounds(id uuid PK, user_id uuid FK, name text, emoji text, file_url text, file_size integer, duration_ms integer, created_at timestamptz)` com RLS por user_id
- **Limite**: Constante `MAX_CUSTOM_SOUNDS = 5` (fácil mudar para premium)
- **Max file size**: 5MB (5 * 1024 * 1024 bytes)
- **Validação**: MP3 magic bytes (mesma do player-audio)
- **Emoji picker**: Grid simples de emojis pré-selecionados (🔥⚡🎵🗡️💀👻🐉🏰🌊🌪️💥🔔) — sem lib externa
- **Player**: Tag `<audio>` nativa com preload="metadata" para duração

## Implementation Plan

### Tasks

#### Task 1: Migration SQL — tabela `dm_custom_sounds`
```sql
CREATE TABLE dm_custom_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  emoji TEXT NOT NULL DEFAULT '🎵',
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dm_custom_sounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sounds"
  ON dm_custom_sounds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_dm_custom_sounds_user ON dm_custom_sounds(user_id);
```

**Supabase Storage**: Criar bucket `dm-custom-sounds` com policy RLS similar a `player-audio`.

#### Task 2: API Route `app/api/dm-audio/route.ts`
Baseado em `app/api/player-audio/route.ts`:

- **GET**: Lista sons custom do usuário autenticado
- **POST**: Upload MP3
  - Valida autenticação
  - Valida MP3 magic bytes
  - Valida tamanho ≤ 5MB
  - Verifica count ≤ MAX_CUSTOM_SOUNDS (5)
  - Salva no bucket `dm-custom-sounds/{user_id}/{uuid}.mp3`
  - Insere metadata na tabela `dm_custom_sounds`
  - Retorna o registro criado
- **DELETE**: Remove som por ID
  - Valida ownership via RLS
  - Deleta do storage + DB

#### Task 3: Componente `CustomSoundCard.tsx`
- Card com emoji grande (32px), nome, duração
- Botão play/pause com barra de progresso mini
- Botão delete (com confirmação)
- Hover: highlight border

#### Task 4: Componente `CustomSoundUploader.tsx`
- Botão "Adicionar Som" (+ icon)
- File input hidden, aceita `.mp3`
- Após selecionar arquivo:
  - Input de nome (default: nome do arquivo sem extensão)
  - Grid de emojis para seleção (12 opções pré-definidas)
  - Preview/play do áudio selecionado
  - Botão "Salvar" → POST /api/dm-audio
  - Loading state durante upload
- Se count >= MAX_CUSTOM_SOUNDS, botão desabilitado com tooltip "Limite atingido"

#### Task 5: Redesenhar `SoundboardPageClient.tsx`
Layout da página:

```
┌─────────────────────────────────────┐
│ 🎵 Soundboard                       │
│ Gerencie seus efeitos sonoros        │
├─────────────────────────────────────┤
│ MEUS SONS CUSTOMIZADOS              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐│
│ │ 🔥   │ │ ⚡   │ │ 🗡️   │ │  +  ││
│ │Fireba│ │Thund│ │Sword│ │ Add ││
│ │ ▶ 3s │ │ ▶ 2s │ │ ▶ 1s │ │     ││
│ └──────┘ └──────┘ └──────┘ └─────┘│
├─────────────────────────────────────┤
│ PRESETS                              │
│ [Ambiente] [Música] [Efeitos]       │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │🔥    │ │⛈️    │ │🌊    │        │
│ │Foguei│ │Tempo│ │Ocean │        │
│ └──────┘ └──────┘ └──────┘        │
└─────────────────────────────────────┘
```

#### Task 6: Integrar sons custom no painel Atmosfera do combate
- `DmAtmospherePanel.tsx` — na tab "Sons", adicionar seção "Meus Sons" acima dos presets
- Carregar sons custom via fetch `/api/dm-audio` no mount
- Cada som custom com botão play/stop (mesmo padrão dos presets)

#### Task 7: Adicionar Soundboard ao menu hamburger
- `app/app/layout.tsx` — adicionar link "Soundboard" no array `navLinks` (com ícone Music)
- Posicionar após "Compêndio" e antes de "Presets"

#### Task 8: i18n
- Adicionar strings em namespace `soundboard` nos dois locales

### Acceptance Criteria

**AC1: Upload de áudio funciona**
- Given: DM na tela do Soundboard com menos de 5 sons
- When: Clica "Adicionar Som", seleciona MP3 ≤5MB, nomeia, escolhe emoji, salva
- Then: Som aparece no grid de "Meus Sons" com preview funcional

**AC2: Limite de uploads respeitado**
- Given: DM tem 5 sons custom
- When: Tenta adicionar mais um
- Then: Botão "Adicionar" desabilitado com mensagem de limite

**AC3: Delete funciona**
- Given: DM tem sons custom
- When: Clica delete em um som e confirma
- Then: Som removido do grid, storage e DB

**AC4: Validação de arquivo**
- Given: DM tenta fazer upload
- When: Seleciona arquivo não-MP3 ou >5MB
- Then: Toast de erro com mensagem clara

**AC5: Sons custom aparecem no combate**
- Given: DM tem sons custom e está em sessão de combate
- When: Abre painel Atmosfera → tab Sons
- Then: Seção "Meus Sons" mostra sons custom com play/stop

**AC6: Soundboard acessível via hamburger**
- Given: Usuário logado no mobile
- When: Abre menu hamburger
- Then: Link "Soundboard" visível e leva a `/app/dashboard/soundboard`

**AC7: Preview de áudio na tela**
- Given: DM na tela do Soundboard
- When: Clica play em qualquer som (custom ou preset)
- Then: Áudio toca com indicador visual de progresso

## Additional Context

### Dependencies
- Supabase Storage (bucket novo)
- Supabase DB (tabela nova com migration)
- API route pattern existente em `player-audio`

### Bucket Futuro
- Limites diferenciados por plano (5 free, 20 pro, ilimitado mesa)
- Compartilhamento de packs de som entre DMs
- Drag-and-drop reordenação dos sons
- Waveform visual durante playback

### Notes
- Reutilizar ao máximo o padrão de `AudioUploadManager` e `player-audio` API
- O emoji picker é intencional simples (grid estático) para evitar dependência de lib externa
- Sons custom são por usuário (DM), não por campanha — acessíveis em qualquer combate
