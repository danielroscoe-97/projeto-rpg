# Workstream 2: Produto & Features Críticas

> **Data:** 2026-04-04
> **Responsável:** Agente dedicado (pode rodar independente)
> **Objetivo:** Fechar gaps críticos, proteger moats, melhorar conversão
> **Métrica principal:** 0 gaps CRITICAL abertos, conversão guest→cadastro > 10%
> **Doc master:** `docs/strategic-3-workstreams.md`

---

## Contexto Estratégico

O Pocket DM tem **7 vantagens exclusivas** em combat tracking e **5 moats defensáveis**. Mas temos **3 gaps críticos/altos** que ameaçam a proposta de valor. Esta workstream fecha esses gaps e adiciona features de conversão.

### Estado Atual dos Moats

| Moat | Status | Ação |
|---|---|---|
| 1. Real-Time Combat Broadcast | ✅ FORTE | Manter — G-01 complementa |
| 2. Zero-Friction Player Access | ✅ MÉDIO | Melhorar com onboarding tour |
| 3. Dual SRD Versioning | ✅ MÉDIO | Manter — ninguém mais tem |
| 4. In-Person First Design | ✅ MÉDIO | PWA fortalece (H2) |
| 5. Radical Simplicity | ✅ FILOSÓFICO | Proteger — cada feature nova deve reduzir tempo olhando pra tela |

### Gaps Críticos (de docs/gap-analysis-competitors-2026-03-30.md)

| Gap | Risco | Status | Sprint |
|---|---|---|---|
| G-01: Turn notifications push | **CRITICAL** | ❌ Em dev | **ESTA WS — Sprint 1** |
| G-02: PWA / offline | ALTO | ❌ Planejado | **ESTA WS — Sprint 3** |
| G-03: D&D Beyond import | ALTO | ❌ Não planejado | Futuro H3 |
| G-04: Notas compartilhadas | ALTO | ❌ Em dev | Sprint 2 |
| G-08: Homebrew content | MÉDIO | ❌ Em dev | Sprint 3 |

---

## PLANO DE EXECUÇÃO

### SPRINT 1 — Conversão + Gap Crítico (Prioridade 🔴 P0)

#### 1.1 — Turn Notifications Push (G-01 CRITICAL)

**Por que é P0:** Real-time sync perde 50% do valor sem notificação ativa pro player. É a segunda metade do Moat 1. Prometido, não entregue.

**Spec:**
- Quando o turno muda para o player, ele recebe notificação visual + sonora no celular
- Tipos de notificação:
  1. **In-app toast** (sempre funciona, fallback primário)
  2. **Browser Notification API** (se permissão concedida)
  3. **Vibração** (mobile, via `navigator.vibrate`)
- O DM pode toggle notifications on/off por sessão
- O player pode opt-in/opt-out na player view

**Implementação:**
```
1. Adicionar campo `notifications_enabled` no session token ou localStorage
2. No broadcast de turn change, incluir flag `is_your_turn: true`
3. No PlayerJoinClient, detectar `is_your_turn` e disparar:
   a. Toast visual (shadcn/ui toast ou custom)
   b. Notification API (se permission granted)
   c. navigator.vibrate([200, 100, 200]) (mobile)
4. No GuestCombatClient, mesmo comportamento (combat parity!)
5. UI de opt-in: dialog simples "Quer receber alertas quando for seu turno?"
```

**Arquivos principais:**
- `components/player/PlayerJoinClient.tsx` (anônimo + autenticado)
- `components/guest/GuestCombatClient.tsx` (guest)
- `components/combat/CombatTracker.tsx` (DM side — broadcast turn info)

**Combat Parity Check (CLAUDE.md):**
- [x] Guest (/try) — Sim, implementar no GuestCombatClient
- [x] Anônimo (/join) — Sim, implementar no PlayerJoinClient
- [x] Autenticado (/invite) — Sim, mesmo PlayerJoinClient

**Critérios de aceite:**
- [ ] Player recebe toast visual quando é seu turno
- [ ] Vibração funciona em mobile (Android + iOS Safari)
- [ ] Browser Notification funciona se permissão concedida
- [ ] DM pode desativar notifications
- [ ] Funciona nos 3 modos (guest, anon, auth)
- [ ] Não quebra reconexão resiliente (CLAUDE.md)
- [ ] Build passando

**Esforço:** G (grande)

---

#### 1.2 — Onboarding Tour (Guest → Cadastro)

**Por que é P0:** Conversão direta. Sem tour, o guest não entende o valor total do app. Com tour, ele vê o que está perdendo sem conta.

**Spec:**
- Tour ativado na PRIMEIRA visita a /try (localStorage flag)
- 5-7 steps max, mostrando:
  1. "Busque um monstro no compêndio" (spotlight no search)
  2. "Adicione ao combate" (spotlight no botão add)
  3. "Inicie o combate" (spotlight no botão start)
  4. "Controle HP e condições" (spotlight nos controles)
  5. "Compartilhe com jogadores" (spotlight no QR/link)
  6. "Quer salvar? Crie uma conta grátis" (CTA signup)
- Componente: usar lib existente ou custom com spotlight overlay
- Skip button sempre visível
- Não mostrar novamente após skip ou complete

**Arquivos existentes relevantes:**
- `components/tour/DashboardTourProvider.tsx` (já existe tour na dashboard!)
- `components/tour/TourTooltip.tsx` (componente de tooltip já existe!)
- Verificar se pode reaproveitar a infra existente

**Implementação:**
```
1. Criar GuestTourProvider.tsx (baseado em DashboardTourProvider)
2. Definir steps com targets (CSS selectors dos elementos)
3. Wrap /try page com GuestTourProvider
4. localStorage flag: 'pocket-dm-guest-tour-complete'
5. Último step = CTA para criar conta
```

**Critérios de aceite:**
- [ ] Tour aparece na primeira visita a /try
- [ ] Não aparece em visitas subsequentes
- [ ] Skip funciona
- [ ] CTA no último step redireciona para signup
- [ ] Mobile responsive (tooltips não cortam em 375px)
- [ ] Build passando

**Esforço:** M (médio)

---

#### 1.3 — Nudges Contextuais "Upgrade to Pro"

**Por que é P1:** Receita. O mestre precisa sentir valor no momento certo — quando tenta usar feature Pro.

**Spec:**
- Nudges aparecem quando o DM tenta:
  1. Salvar encounter preset (free = efêmero) → "Salve seus encontros com Pro"
  2. Acessar histórico de sessão anterior → "Continue de onde parou com Pro"
  3. Exportar combat log → "Exporte em PDF com Pro"
- Formato: Banner discreto ou modal inline (NÃO popup intrusivo)
- Link direto para /pricing
- Máximo 1 nudge por sessão (não spammar)

**Critérios de aceite:**
- [ ] Nudge aparece no contexto certo (não aleatório)
- [ ] Máximo 1 por sessão
- [ ] Não aparece para assinantes Pro
- [ ] Link para /pricing funciona
- [ ] Design consistente (dark + gold, sem emoji)
- [ ] Build passando

**Esforço:** P (pequeno)

---

### SPRINT 2 — Retenção (Prioridade 🟡 P1)

#### 2.1 — Spell Slots Tracker

**Por que:** Feature mais pedida no beta test. Jogadores querem trackear spell slots gastos durante combate.

**Spec:**
- No player view, seção colapsável "Spell Slots"
- Grid com slots por nível (1st-9th)
- Tap para marcar como gasto, tap novamente para restaurar
- Estado persiste durante a sessão (sessionStorage)
- Para Pro: persiste entre sessões (Supabase)

**Combat Parity:**
- Guest: Sim (sessionStorage)
- Anônimo: Sim (sessionStorage)
- Autenticado: Sim (Supabase persist para Pro)

**Esforço:** M

---

#### 2.2 — Notas de Campanha Compartilhadas (G-04)

**Por que:** MasterApp tem com pastas. DMs precisam compartilhar info com players.

**Spec:**
- Tab "Notas" na campanha (ao lado de Sessions, Members)
- DM pode criar notas e marcar como "compartilhada com jogadores"
- Players veem notas compartilhadas na sua campaign view
- Formato: texto simples + markdown básico
- Sem pastas (simplicity first — evolui depois se necessário)

**Auth-only** (requer campanha persistente = Pro ou cadastrado)

**Esforço:** M

---

### SPRINT 3 — Expansão (Prioridade 🟢 P2)

#### 3.1 — PWA + Offline (G-02)

**Por que:** WiFi na mesa é instável. App nativo (Game Master 5e) ganha em confiabilidade. PWA com service worker resolve isso.

**Spec:**
- Service Worker com cache strategy:
  - Static assets: cache-first
  - API responses: network-first com fallback
  - Combat state: offline queue + sync when online
- Web App Manifest (installable na home screen)
- Offline banner discreto (não intrusivo nos primeiros 3s — CLAUDE.md)
- Sync queue para ações de combate feitas offline

**Complexidade:** ALTA — não subestimar. Service worker + cache invalidation + sync conflict resolution.

**Esforço:** G (grande)

---

#### 3.2 — Homebrew Monsters/Spells (G-08)

**Por que:** Sem isso, ficamos limitados ao SRD (~25% do conteúdo total D&D). DMs criam conteúdo custom constantemente.

**Spec:**
- Formulário de criação de monstro custom (nome, CR, HP, AC, abilities)
- Formulário de criação de magia custom (nome, nível, escola, descrição)
- Salvar no Supabase (Pro feature)
- Monstros/magias homebrew aparecem na busca do combat tracker
- NÃO aparecem no compêndio público (SRD compliance — CLAUDE.md!)

**Auth-only / Pro-only**

**Esforço:** G

---

## Regras Imutáveis (de CLAUDE.md)

Toda implementação nesta workstream DEVE respeitar:

### Combat Parity
```
Antes de considerar qualquer combat feature completa:
1. Guest (/try) — Funciona no GuestCombatClient? Se sim, implementar.
2. Anônimo (/join) — Funciona no PlayerJoinClient? Se sim, implementar.
3. Autenticado (/invite) — Requer dados persistentes? Marcar Auth-only.
```

### Resilient Reconnection
```
- NUNCA depender APENAS de visibilitychange em mobile
- NUNCA exigir aprovação do DM para reconexão
- NUNCA mostrar banner de "desconectado" nos primeiros 3s
- NUNCA rodar heartbeat quando tab está hidden
```

### SRD Compliance
```
- NUNCA expor conteúdo não-SRD em páginas públicas
- Homebrew = privado do user, NUNCA no compêndio público
- Whitelist filters devem continuar funcionando
```

---

## Métricas de Sucesso

| Métrica | Meta Sprint 1 | Meta Sprint 2 | Meta Sprint 3 |
|---|---|---|---|
| Gaps CRITICAL abertos | 0 | 0 | 0 |
| Gaps ALTO abertos | 3 | 2 | 1 |
| Conversão guest → cadastro | Baseline | > 10% | > 15% |
| Turn notifications funcionando | ✅ | ✅ | ✅ |
| PWA installable | ❌ | ❌ | ✅ |

---

## Arquivos-Chave para Referência

| Arquivo | Relevância |
|---|---|
| `components/guest/GuestCombatClient.tsx` | Guest combat — parity |
| `components/player/PlayerJoinClient.tsx` | Anon + Auth player |
| `components/combat/CombatTracker.tsx` | DM combat UI |
| `components/tour/DashboardTourProvider.tsx` | Tour existente (reusar) |
| `components/tour/TourTooltip.tsx` | Tooltip de tour (reusar) |
| `lib/supabase/combat-persist.ts` | Persistência de combate |
| `CLAUDE.md` | Regras imutáveis |

---

## Checklist de "Done" por Feature

Cada feature desta workstream deve:
- [ ] Build passando (`rtk next build`)
- [ ] Combat parity verificada (guest, anon, auth)
- [ ] Reconexão resiliente não quebrada
- [ ] SRD compliance mantida
- [ ] Mobile responsive (375px)
- [ ] Testada manualmente nos 3 modos
- [ ] Sem regressões em features existentes

---

> **Última atualização:** 2026-04-04
