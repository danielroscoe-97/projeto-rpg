# Quick Spec: Audio Validation & E2E

> **Prioridade:** P1 — Feature de imersão diferenciadora
> **Estimativa:** ~4h
> **Data:** 2026-03-30
> **Referência:** Roadmap H1.3, audio-store.ts, DmSoundboard.tsx

---

## Contexto

O sistema de áudio tem 64 arquivos em `public/sounds/` (9 ambient, 13 music, 42 sfx). Sprint report mencionou "placeholders idênticos" mas os arquivos agora existem com nomes distintos. Precisa validar que:
1. Todos os arquivos são únicos (não cópias do mesmo audio)
2. Broadcast DM→Player funciona end-to-end
3. Mobile playback funciona (autoplay restrictions)
4. Ambient loop é suave (sem pop/click na transição)

---

## Story 1: Validação de Arquivos de Áudio

**Problema:** Sprint report anterior identificou que MP3s eram idênticos. Verificar se foram substituídos.

**Implementação:**

Criar script `scripts/validate-audio.ts`:
```typescript
import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';

// 1. Hash MD5 de cada arquivo em public/sounds/
// 2. Agrupar por hash
// 3. Se 2+ arquivos têm o mesmo hash → duplicata (placeholder)
// 4. Verificar tamanho mínimo (>10KB = provavelmente real, <1KB = placeholder)
// 5. Verificar duração com metadata (se possível)
```

Output esperado:
```
✅ 64 audio files scanned
✅ 64 unique hashes (no duplicates)
⚠️ 3 files under 10KB: sfx/ui-click.mp3 (2KB), sfx/ui-hover.mp3 (1KB), sfx/coin-pickup.mp3 (3KB)
   → These may be intentionally short SFX
```

**AC:**
- [ ] Script roda e reporta status de todos os 64 arquivos
- [ ] Zero duplicatas (hashes únicos)
- [ ] Todos os arquivos > 1KB (não são placeholders vazios)
- [ ] Lista de arquivos suspeitamente pequenos para review manual

---

## Story 2: Validação de Audio Presets Config

**Problema:** `lib/utils/audio-presets.ts` define os presets que o DM vê no soundboard. Precisa bater com os arquivos físicos.

**Implementação:**

1. Ler `audio-presets.ts` e extrair todos os paths referenciados
2. Verificar que cada path existe em `public/sounds/`
3. Verificar que não há arquivos órfãos em `public/sounds/` (existem mas não são referenciados)

**AC:**
- [ ] Cada preset referencia um arquivo que existe
- [ ] Nenhum arquivo `public/sounds/` está órfão (ou, se estiver, é documentado como "reservado para futuro")
- [ ] Categorias (ambient, music, sfx) batem com a estrutura de diretórios

---

## Story 3: Teste E2E de Broadcast de Áudio

**Problema:** DM toca som → Player deve ouvir. Nunca testado end-to-end.

**Test file:** `e2e/features/audio-broadcast.spec.ts`

```
test("DM plays sound and player receives it", async ({ browser }) => {
  const dmPage = /* setup DM */;
  const playerPage = /* setup Player */;

  // 1. DM abre soundboard
  // 2. DM toca um SFX (ex: "sword-hit")
  // 3. Verificar que evento audio:play_sound foi broadcast
  // 4. Player page: verificar que <audio> element foi criado ou playback triggered

  // Nota: Playwright não pode verificar áudio audível, mas pode verificar:
  //   - Evento de broadcast recebido
  //   - Elemento <audio> com src correto criado no DOM
  //   - Audio.play() foi chamado (via page.evaluate)
});

test("DM starts ambient and player receives loop", async ({ browser }) => {
  // Similar, mas verifica que ambient é loop (audio.loop = true)
  // E que audio:ambient_start foi broadcast
});

test("Only one ambient plays at a time", async ({ browser }) => {
  // DM toca ambient "rain"
  // DM toca ambient "forest"
  // Verificar que "rain" parou e "forest" está tocando
});
```

**AC:**
- [ ] Broadcast de SFX chega ao player (verificar via DOM)
- [ ] Broadcast de ambient chega ao player com loop=true
- [ ] Regra "1 ambient por vez" é respeitada
- [ ] Player pode mutar (verificar que mute control existe no mobile)

---

## Story 4: Mobile Autoplay Validation

**Problema:** iOS Safari e Chrome Android bloqueiam autoplay de áudio sem interação do usuário. O player precisa ter interagido com a página antes que áudio funcione.

**Implementação:**

1. No `PlayerSoundboard.tsx` ou handler de `audio:play_sound`:
```typescript
// Verificar se AudioContext está suspenso
if (audioContext.state === 'suspended') {
  // Mostrar toast: "Toque para ativar som" com botão
  // Ou: usar o primeiro tap do player como unlock
}
```

2. Alternativa: "Audio unlock" no momento do join:
   - Quando player entra na sessão, mostrar banner "Ativar sons da mesa?"
   - Tap no banner → `audioContext.resume()` → desbloqueia autoplay
   - Salvar preferência em localStorage

3. Fallback: Se autoplay falha silenciosamente, não crashar — apenas log warning.

**AC:**
- [ ] Áudio funciona no iOS Safari (após user interaction)
- [ ] Áudio funciona no Chrome Android
- [ ] Se autoplay bloqueado, mostra feedback visual (não falha silenciosamente)
- [ ] Preferência "som ativado" persiste entre visits
- [ ] Teste manual em device real (ou BrowserStack) — Playwright não simula autoplay restrictions
