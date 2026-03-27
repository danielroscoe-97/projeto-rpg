# PROMPT — Playwright E2E Tests: Player Sound Effects + Full Flow

Cole este prompt inteiro em uma nova janela do Claude Code.

---

## Instrução Principal

Você vai criar e rodar **testes E2E com Playwright** para validar a feature **Player Sound Effects (Soundboard de Combate)** e os fluxos críticos do app **Pocket DM**.

**Leia TUDO antes de escrever qualquer teste.**

---

## Contexto do Projeto

- **Projeto:** Pocket DM — Combat tracker para D&D 5e, presencial-first
- **Stack:** Next.js 15, React 19, Supabase (auth, DB, Storage, Realtime), Zustand, Tailwind CSS
- **URL Produção:** `https://tavernadomestre.vercel.app/`
- **Idioma do código:** Inglês (variáveis, componentes, tipos)
- **Idioma do conteúdo:** pt-BR primário + en (i18n via next-intl)

---

## Arquivos de Referência (Leia ANTES de escrever testes)

| Arquivo | O que olhar |
|---------|------------|
| `docs/test-accounts.md` | **Todas as credenciais**, UUIDs, cenários, matriz E2E, snippet Playwright |
| `_bmad-output/implementation-artifacts/tech-spec-player-sound-effects.md` | Spec completa — 25 ACs a validar |
| `components/player/PlayerInitiativeBoard.tsx` | Player view — `data-testid` dos elementos |
| `components/player/PlayerJoinClient.tsx` | Player join flow — lobby, registration, realtime |
| `components/session/CombatSessionClient.tsx` | DM view — toolbar, combatants, audio listener |
| `components/audio/PlayerSoundboard.tsx` | Soundboard — FAB, drawer, presets, custom sounds |
| `components/audio/AudioUploadManager.tsx` | Upload UI — slots, file picker, delete |
| `components/audio/DmAudioControls.tsx` | DM volume/mute popover |
| `app/auth/login/page.tsx` | Login page structure |
| `components/sign-up-form.tsx` | Signup form structure |

---

## Credenciais de Teste

### Conta Pessoal (DM real)
```
Email: danielroscoe97@gmail.com
Senha: Eusei123*
Dados: Campanha "Krynn" com 5 jogadores (Torin, Noknik, Askelad, Satori, Kai)
```

### DM Accounts (seed)
```
dm.primary@test-taverna.com    / TestDM_Primary!1   — Mestre Primário (pt-BR, Free)
dm.pro@test-taverna.com        / TestDM_Pro!2       — Mestre Pro (pt-BR, Pro)
dm.english@test-taverna.com    / TestDM_English!3   — English DM (en, Free)
```

### Player Accounts (seed)
```
player.warrior@test-taverna.com   / TestPlayer_War!1    — Thorin Guerreiro (pt-BR)
player.mage@test-taverna.com      / TestPlayer_Mage!2   — Elara Maga (pt-BR)
player.healer@test-taverna.com    / TestPlayer_Heal!3   — Lyra Curandeira (pt-BR)
player.english@test-taverna.com   / TestPlayer_EN!4     — John Ranger (en)
player.fresh@test-taverna.com     / TestPlayer_Fresh!5  — Novato (pt-BR)
player.maxaudio@test-taverna.com  / TestPlayer_Audio!6  — DJ Bardo (pt-BR)
player.trial@test-taverna.com     / TestPlayer_Trial!7  — Trial Player (pt-BR, Pro trial)
```

### Player Anônimo
```
Sem conta — usa Supabase signInAnonymously() automaticamente ao acessar /join/[token]
```

---

## Setup Playwright

### 1. Verificar se Playwright já está instalado
```bash
npx playwright --version
```

Se não estiver, instalar:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Criar config se não existir
Verificar se `playwright.config.ts` existe. Se não, criar com:
- `baseURL: "https://tavernadomestre.vercel.app"`
- `testDir: "./e2e"`
- Projects: `chromium` (desktop) + `mobile-chrome` (mobile)
- `timeout: 30000`
- `retries: 1`

### 3. Estrutura de arquivos
```
e2e/
├── fixtures/
│   └── test-accounts.ts      ← Credenciais exportadas como constantes
├── helpers/
│   └── auth.ts               ← loginAs(), logoutAs() helpers
├── auth/
│   ├── login.spec.ts          ← Login flows
│   └── signup.spec.ts         ← Signup flows
├── combat/
│   ├── session-create.spec.ts ← DM cria sessão + combate
│   ├── player-join.spec.ts    ← Player join via /join/[token]
│   └── turn-advance.spec.ts   ← Turn advance, HP, conditions
├── audio/
│   ├── soundboard.spec.ts     ← Soundboard presets, cooldown, turn gate
│   ├── audio-upload.spec.ts   ← Upload/delete MP3s, limits
│   └── dm-controls.spec.ts    ← Volume, mute, popover
├── i18n/
│   └── language.spec.ts       ← pt-BR vs en labels
└── visitor/
    └── try-mode.spec.ts       ← Modo visitante /try
```

---

## Cenários de Teste (Prioridade)

### P0 — Smoke Tests (rodar primeiro)

#### 1. Login Flow
```
DM: dm.primary@test-taverna.com / TestDM_Primary!1
1. Navegar para /auth/login
2. Preencher email + senha
3. Clicar login
4. Verificar redirecionamento para /app/dashboard
5. Verificar que display name aparece na navbar
```

#### 2. Modo Visitante
```
1. Navegar para /try
2. Verificar que encounter setup aparece
3. Adicionar 2 combatants manualmente
4. Iniciar combate
5. Verificar initiative list renderiza
```

#### 3. DM Cria Sessão + Compartilha
```
DM: dm.primary@test-taverna.com
1. Login como DM
2. Criar nova sessão (/app/session/new)
3. Adicionar combatants (manual ou monster search)
4. Iniciar combate
5. Copiar link de share (/join/[token])
6. Verificar que link é válido
```

### P1 — Core Combat Flow

#### 4. Player Join (Authenticated)
```
DM: dm.primary (já com sessão ativa)
Player: player.warrior@test-taverna.com
1. Em browser separado, login como player
2. Navegar para /join/[token] (token da sessão do DM)
3. Preencher nome "Thorin", initiative 15, HP 45, AC 18
4. Clicar registrar
5. Verificar que initiative board aparece
6. Verificar que combatant "Thorin" aparece na lista
```

#### 5. Player Join (Anônimo)
```
DM: dm.primary (já com sessão ativa)
1. Em janela anônima, navegar para /join/[token]
2. Não fazer login — usar anonymous auth
3. Registrar como "Anônimo" com initiative 10
4. Verificar que initiative board aparece
5. Verificar que soundboard mostra SÓ presets (sem "Meus Sons")
```

#### 6. Turn Advance + HP
```
DM: dm.primary com combate ativo (2+ combatants)
1. Clicar "Próximo Turno" (next-turn-btn)
2. Verificar que turn indicator move
3. Aplicar dano em um combatant
4. Verificar que HP bar atualiza
5. Verificar que player view reflete a mudança (via outro browser)
```

### P2 — Audio Feature (Soundboard)

#### 7. Soundboard — Presets no Turno do Player
```
DM: dm.primary com combate ativo
Player: player.warrior no turno ativo
1. Player: Verificar FAB 🔊 aparece (soundboard-fab)
2. Player: Clicar FAB → drawer abre (soundboard-drawer)
3. Player: Verificar presets visíveis (preset-btn-fireball, etc.)
4. Player: Clicar "Bola de Fogo" (preset-btn-fireball)
5. Player: Verificar cooldown visual (botão disabled por 2s)
6. DM: Verificar toast "🔊 Thorin: 🔥 fireball" aparece
7. Player: Tentar clicar outro preset em <2s → não dispara
8. Player: Esperar 2s → clicar funciona novamente
```

#### 8. Soundboard — Desabilitado Fora do Turno
```
Player: player.warrior, NÃO é seu turno
1. Verificar FAB está cinza/disabled (opacity 40%)
2. Clicar FAB → nada acontece
3. Verificar tooltip "Disponível apenas no seu turno"
```

#### 9. DM Audio Controls
```
DM: dm.primary em combate ativo
1. Verificar ícone 🔊 na toolbar (dm-audio-controls-btn)
2. Clicar → popover abre (dm-audio-popover)
3. Verificar slider de volume (dm-volume-slider)
4. Arrastar slider para 30%
5. Verificar texto "30%"
6. Clicar mute toggle (dm-mute-toggle)
7. Verificar ícone muda para 🔇
8. Verificar texto "Sons dos jogadores silenciados"
9. Clicar fora do popover → fecha
```

#### 10. Audio Upload (DJ Bardo)
```
Player: player.maxaudio@test-taverna.com
1. Login como DJ Bardo
2. Navegar para área de upload (AudioUploadManager)
3. Verificar 6 slots vazios
4. Upload de 1 MP3 válido (< 3MB)
5. Verificar slot preenchido com nome do arquivo
6. Upload de mais 5 MP3s (atingir limite)
7. Verificar 6 slots preenchidos
8. Tentar upload do 7º → erro "Limite de 6 atingido"
9. Deletar 1 áudio → slot fica vazio
10. Upload de novo → funciona
```

#### 11. Turn Advance Corta Áudio
```
DM: dm.primary com áudio tocando (player enviou som)
1. Verificar que há áudio ativo (lastSoundLabel no popover)
2. Clicar "Próximo Turno"
3. Verificar que áudio para (stopAllAudio chamado)
```

### P3 — Edge Cases

#### 12. Late Join
```
DM: dm.primary com combate já ativo
Player: player.mage@test-taverna.com
1. Player: Navegar para /join/[token]
2. Player: Ver tela de late-join (combate ativo)
3. Player: Preencher dados e enviar request
4. DM: Ver toast de late-join request
5. DM: Clicar "Aceitar"
6. Player: Ver initiative board (combat view)
```

#### 13. i18n — English
```
Player: player.english@test-taverna.com (idioma: en)
1. Login
2. Verificar navbar em inglês
3. Join sessão
4. Verificar labels: "Round", "Sound Effects", "Combat Sounds"
5. Verificar presets: "Fireball", "Sword Hit", "Thunder"
```

#### 14. Reconexão
```
Player: player.warrior em combate ativo
1. Verificar connection indicator "connected"
2. Simular desconexão (offline mode)
3. Verificar indicator muda para "disconnected"
4. Reconectar (online mode)
5. Verificar estado atualiza (combatants, turn index)
```

---

## data-testid Reference

### Login/Signup
- `email-input`, `password-input`, `login-button`

### Combat (DM)
- `active-combat` — container do combate ativo
- `initiative-list` — lista de combatants
- `next-turn-btn` — botão próximo turno
- `end-encounter-btn` — finalizar encontro
- `add-combatant-btn` — adicionar combatant
- `dm-audio-controls-btn` — botão de controles de áudio
- `dm-audio-popover` — popover de volume/mute
- `dm-volume-slider` — slider de volume
- `dm-mute-toggle` — toggle mute

### Player View
- `player-view` — container do player view
- `player-initiative-board` — lista de initiative
- `player-combatant-{id}` — combatant individual
- `turn-now-overlay` — overlay "É sua vez!"
- `player-oracle-btn` — botão spell oracle
- `notification-toggle` — toggle de notificações

### Soundboard
- `soundboard-fab` — botão flutuante 🔊
- `soundboard-drawer` — drawer com presets/custom
- `preset-btn-{id}` — botão de preset (fireball, sword-hit, etc.)
- `custom-btn-{id}` — botão de áudio custom

### Audio Upload
- `audio-upload-manager` — container de upload
- `audio-slot-{i}` — slot preenchido (0-5)
- `audio-slot-empty-{i}` — slot vazio
- `upload-audio-btn` — botão de upload
- `audio-file-input` — input file hidden
- `preview-btn-{id}` — preview play/pause
- `delete-btn-{id}` — deletar áudio

---

## Regras Críticas

1. **HP tiers são IMUTÁVEIS:** LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%) — não alterar nada
2. **Anti-metagaming:** Players NÃO vêem HP real de monstros, só status labels
3. **Áudio toca SÓ no DM** — Player envia, DM ouve
4. **Cooldown 2s anti-spam** — Botão fica disabled entre cliques
5. **Player anônimo só vê presets** — Sem upload, sem custom sounds
6. **Testes rodam contra PRODUÇÃO** — `https://tavernadomestre.vercel.app`
7. **Não criar/deletar dados da conta pessoal** (danielroscoe97@gmail.com) — usar contas seed
8. **Testes de áudio são visuais** — Verificar toasts/UI, não o áudio real (browser headless não reproduz)

---

## Ordem de Execução

1. **Setup:** Verificar/instalar Playwright, criar config + fixtures + helpers
2. **Smoke (P0):** Login, visitor mode, session create — garante que app funciona
3. **Core (P1):** Player join, turn advance, HP — fluxo principal
4. **Audio (P2):** Soundboard, upload, DM controls — feature nova
5. **Edge (P3):** Late join, i18n, reconexão — robustez
6. **Rodar tudo:** `npx playwright test` — relatório final

---

## Validação Final

1. `npx playwright test` — Todos os testes passando
2. Relatório HTML: `npx playwright show-report`
3. Screenshots de falhas salvas em `e2e/results/`
4. Listar ACs da spec que foram cobertos vs não cobertos

**Ship it! 🧪**
