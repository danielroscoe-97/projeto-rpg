# Test Accounts — Playwright E2E

> **Ambiente:** Supabase Production (`mdcmjpcjkqgyxvhweoqs.supabase.co`)
> **Criado em:** 2026-03-27
> **Seed script:** `npx tsx scripts/seed-test-accounts.ts` (idempotente)

---

## Conta Existente (Manual)

| Campo | Valor |
|-------|-------|
| **Email** | `danielroscoe97@gmail.com` |
| **Senha** | `Eusei123*` |
| **Role** | DM (conta pessoal do Dani_) |
| **Nota** | Conta principal do projeto — não usar em testes destrutivos |

---

## DM Accounts

### 1. DM Primário (pt-BR, Free)

| Campo | Valor |
|-------|-------|
| **Email** | `dm.primary@test-taverna.com` |
| **Senha** | `TestDM_Primary!1` |
| **Display Name** | Mestre Primário |
| **Idioma** | pt-BR |
| **Plano** | Free |
| **UUID** | `0c1d188f-9afb-4d21-9115-e655073d886e` |

**Cenários:**
- Criar sessão e compartilhar link `/join/[token]`
- Gerenciar combate (add/remove combatants, advance turn)
- Testar soundboard do lado DM (volume, mute, receber áudio de jogadores)
- Testar file sharing, CR calculator, keyboard shortcuts
- End encounter flow

### 2. DM Pro (pt-BR, Pro)

| Campo | Valor |
|-------|-------|
| **Email** | `dm.pro@test-taverna.com` |
| **Senha** | `TestDM_Pro!2` |
| **Display Name** | Mestre Pro |
| **Idioma** | pt-BR |
| **Plano** | Pro (active) |
| **UUID** | `d493fb17-7da2-4565-aa92-1f6382e9499b` |

**Cenários:**
- Features premium (limites maiores, Oracle AI, etc.)
- Mesa model: jogadores na sessão deste DM herdam plano Pro
- Testar billing portal, subscription management
- Comparar UX Free vs Pro

### 3. DM English (en, Free)

| Campo | Valor |
|-------|-------|
| **Email** | `dm.english@test-taverna.com` |
| **Senha** | `TestDM_English!3` |
| **Display Name** | English DM |
| **Idioma** | en |
| **Plano** | Free |
| **UUID** | `937aec78-cf9f-4b5e-aa49-5871fc5c166e` |

**Cenários:**
- Validar i18n completo no DM view (labels, toasts, erros)
- Testar troca de idioma nas settings
- Verificar que presets de áudio mostram nomes em inglês

---

## Player Accounts (Authenticated)

### 4. Thorin Guerreiro — Player #1

| Campo | Valor |
|-------|-------|
| **Email** | `player.warrior@test-taverna.com` |
| **Senha** | `TestPlayer_War!1` |
| **Display Name** | Thorin Guerreiro |
| **Idioma** | pt-BR |
| **Plano** | Free |
| **UUID** | `e85c2e54-0f0d-4381-bd34-80b06f994ab2` |

**Cenários:**
- Join de sessão via `/join/[token]` (autenticado)
- Player view: initiative board, HP bar, conditions
- Soundboard: tocar presets no turno, cooldown 2s
- Upload de áudios custom (1-6 MP3s)
- Player notes (sinalizar DM)
- Spell Oracle

### 5. Elara Maga — Player #2

| Campo | Valor |
|-------|-------|
| **Email** | `player.mage@test-taverna.com` |
| **Senha** | `TestPlayer_Mage!2` |
| **Display Name** | Elara Maga |
| **Idioma** | pt-BR |
| **Plano** | Free |
| **UUID** | `03243068-e80e-4441-92a0-c125a4ea122b` |

**Cenários:**
- Multi-player: 2 jogadores na mesma sessão simultaneamente
- Late-join: entrar em combate já ativo (DM aceita/rejeita)
- Turn notification overlay ("É sua vez!")
- "Você é o próximo" banner
- Reconexão após desconexão

### 6. Lyra Curandeira — Player #3

| Campo | Valor |
|-------|-------|
| **Email** | `player.healer@test-taverna.com` |
| **Senha** | `TestPlayer_Heal!3` |
| **Display Name** | Lyra Curandeira |
| **Idioma** | pt-BR |
| **Plano** | Free |
| **UUID** | `6e8ddb43-eb0e-4c2d-9c46-e52ade7dc9ad` |

**Cenários:**
- 3+ jogadores simultâneos (stress test realtime)
- Testar condições (Blinded, Poisoned, etc.) no player view
- HP bar: healing, damage, temp HP
- Defeated state

### 7. John Ranger — Player EN

| Campo | Valor |
|-------|-------|
| **Email** | `player.english@test-taverna.com` |
| **Senha** | `TestPlayer_EN!4` |
| **Display Name** | John Ranger |
| **Idioma** | en |
| **Plano** | Free |
| **UUID** | `b0ba2643-39a6-4871-9ba7-f1209a337920` |

**Cenários:**
- i18n no player view (labels, toasts, soundboard em inglês)
- Join em sessão de DM pt-BR (mixed languages)
- Verificar que HP status labels (LIGHT/MODERATE/HEAVY/CRITICAL) traduzem

### 8. Novato — Fresh Account

| Campo | Valor |
|-------|-------|
| **Email** | `player.fresh@test-taverna.com` |
| **Senha** | `TestPlayer_Fresh!5` |
| **Display Name** | Novato |
| **Idioma** | pt-BR |
| **Plano** | Free |
| **UUID** | `c8f1fcf6-4b43-49af-8ae6-07edb5b06fb4` |

**Cenários:**
- Primeiro login / onboarding wizard
- Dashboard vazio (nenhuma sessão, campanha, ou personagem)
- HP Legend overlay (tutorial de cores para novatos)
- Soundboard sem custom sounds (só presets)

### 9. DJ Bardo — Audio Tester

| Campo | Valor |
|-------|-------|
| **Email** | `player.maxaudio@test-taverna.com` |
| **Senha** | `TestPlayer_Audio!6` |
| **Display Name** | DJ Bardo |
| **Idioma** | pt-BR |
| **Plano** | Free |
| **UUID** | `68916a27-7048-4043-b88b-d1a0af7d7aa7` |

**Cenários:**
- Upload de 6 MP3s (atingir limite)
- Tentar 7º upload → erro "Limite de 6 atingido"
- Delete de áudio → slot fica vazio
- Re-upload após delete
- Upload de arquivo inválido (WAV renomeado, >3MB)
- Soundboard com 10 presets + 6 custom = 16 botões

### 10. Trial Player — Pro Trial

| Campo | Valor |
|-------|-------|
| **Email** | `player.trial@test-taverna.com` |
| **Senha** | `TestPlayer_Trial!7` |
| **Display Name** | Trial Player |
| **Idioma** | pt-BR |
| **Plano** | Pro (trial — expira em 14 dias) |
| **UUID** | `51bd87b3-0cb9-40b0-ab59-4772be7bcd51` |

**Cenários:**
- Features Pro durante trial (verificar acesso)
- Trial expiry: simular expiração e verificar downgrade para Free
- Feature gates: o que fica bloqueado após expirar
- Banner/notificação de trial ativo

---

## First Access Accounts (Primeiro Acesso)

### 11. DM Novato — DM Fresh

| Campo | Valor |
|-------|-------|
| **Email** | `dm.fresh@test-pocketdm.com` |
| **Senha** | `TestDM_Fresh!4` |
| **Display Name** | DM Novato |
| **Idioma** | pt-BR |
| **Plano** | Free |

**Cenários:**
- Dashboard vazio — nenhuma campanha, sessão, ou jogador
- Onboarding wizard do DM (primeiro acesso)
- DM tour completo (tooltips, checklist)
- Criar primeira campanha e sessão do zero

### 12. Player Novato — Player Fresh

| Campo | Valor |
|-------|-------|
| **Email** | `player.newbie@test-pocketdm.com` |
| **Senha** | `TestPlayer_New!8` |
| **Display Name** | Player Novato |
| **Idioma** | pt-BR |
| **Plano** | Free |

**Cenários:**
- Dashboard vazio — sem campanhas, convites, ou personagens
- Onboarding wizard do Player (primeiro acesso)
- Player tour completo
- Aceitar primeiro convite de campanha

---

## Player Anônimo (Sem Conta)

| Campo | Valor |
|-------|-------|
| **Auth** | Anonymous (Supabase `signInAnonymously()`) |
| **UUID** | Gerado automaticamente pelo browser |

**Cenários:**
- Join via `/join/[token]` sem login
- Soundboard mostra só presets (sem custom, sem upload)
- GET `/api/player-audio` retorna 401
- Player lobby → registro com nome/initiative/HP/AC
- Reconexão mantém identidade via `anon_user_id`

---

## Matriz de Cenários E2E

| Cenário | DM | Player(s) | O que testar |
|---------|-----|-----------|-------------|
| **Happy path básico** | dm.primary | player.warrior | Criar sessão → join → combate → turn → soundboard |
| **Multi-player** | dm.primary | warrior + mage + healer | 3 jogadores simultâneos, turns alternando |
| **Late join** | dm.primary | mage (late) | Combate ativo → player entra → DM aceita |
| **Audio completo** | dm.primary | maxaudio | Upload 6 MP3s → soundboard custom → DM ouve |
| **i18n mix** | dm.english | player.english | Tudo em inglês |
| **Pro features** | dm.pro | warrior | Mesa model: player herda Pro |
| **Trial expiry** | dm.primary | trial | Trial ativo → features → simular expiry |
| **Onboarding** | — | fresh | Primeiro login, dashboard vazio |
| **Anônimo** | dm.primary | (anônimo) | Join sem conta, só presets |
| **Reconexão** | dm.primary | warrior | Player desconecta → reconecta → estado preservado |
| **Stress: áudio** | dm.primary | warrior + mage | 2 players tocando sons rápido, cooldown, mute |
| **Edge: defeated** | dm.primary | healer | Player com HP 0, defeated state |

---

## Como Usar nos Testes Playwright

```typescript
// playwright/fixtures/test-accounts.ts
export const TEST_ACCOUNTS = {
  dmPrimary: { email: "dm.primary@test-taverna.com", password: "TestDM_Primary!1" },
  dmPro:     { email: "dm.pro@test-taverna.com",     password: "TestDM_Pro!2" },
  dmEnglish: { email: "dm.english@test-taverna.com",  password: "TestDM_English!3" },
  player1:   { email: "player.warrior@test-taverna.com", password: "TestPlayer_War!1" },
  player2:   { email: "player.mage@test-taverna.com",    password: "TestPlayer_Mage!2" },
  player3:   { email: "player.healer@test-taverna.com",   password: "TestPlayer_Heal!3" },
  playerEN:  { email: "player.english@test-taverna.com",  password: "TestPlayer_EN!4" },
  playerFresh: { email: "player.fresh@test-taverna.com",  password: "TestPlayer_Fresh!5" },
  playerAudio: { email: "player.maxaudio@test-taverna.com", password: "TestPlayer_Audio!6" },
  playerTrial: { email: "player.trial@test-taverna.com",   password: "TestPlayer_Trial!7" },
} as const;
```

```typescript
// Example: login helper
async function loginAs(page: Page, account: { email: string; password: string }) {
  await page.goto("/auth/login");
  await page.fill('[data-testid="email-input"]', account.email);
  await page.fill('[data-testid="password-input"]', account.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL("**/app/**");
}
```

---

## Re-seed / Reset

```bash
# Recriar contas (idempotente — pula existentes)
npx tsx scripts/seed-test-accounts.ts

# Para resetar dados de uma conta específica (combatants, sessions, etc.):
# Use o Supabase Dashboard > SQL Editor
```
