# Session Analytics — Noite de 10/abr/2026

> Dados extraídos de `analytics_events`, `encounters`, `session_tokens` e `combat_reports` no Supabase.
> Período: 10/abr 19:17 BRT — 11/abr 02:07 BRT (22:17 — 05:07 UTC)
> Total de eventos: **412** | Usuários autenticados: **14** | Anônimos: **100+**

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Sessões de combate criadas | 7 |
| Encounters criados | 5+ |
| Players que entraram via /join | 19 |
| Novo signup | 1 (86baf326) |
| Combat reports gerados | 10 |
| Emails enviados | 5 (2 welcome/first-combat, 3 recap) |
| Maior combate | Djinni & Air Elementals — 6 players, 5 monsters, 2+ rounds, ~1h30 |
| Referral externo | 1 visita de chatgpt.com |
| Guest combats (11/abr tarde) | 19 em 4 minutos (burst) |

---

## Timeline Completa

### Fase 1: DM de Teste (19:17–19:43 BRT)

**Usuário: `0c1d188f`** — DM testando o sistema

Este DM criou **4 sessões em sequência**, cada uma com 4 monstros e 0 players, speed-running os turnos (~1s por turno). Claramente um padrão de teste/exploração, não gameplay real.

| Hora (BRT) | Ação |
|------------|------|
| 19:17 | Login → Dashboard → New Session |
| 19:17 | Sessão `d3961275` criada (4 monsters) |
| 19:18 | Encounter criado + started + speed-run até round 6 |
| 19:19 | Login novamente → Sessão `1f848964` criada |
| 19:19-19:22 | Speed-run 6 rounds, 2 players joined late |
| 19:23 | Combat recap email enviado |
| 19:26 | Login → Sessão `f28e7215` criada |
| 19:28 | Login → Sessão `7f4b9a7c` criada |
| 19:28-19:33 | Speed-run, 2 players joined late |
| 19:37 | Login → Sessão `b333b586` criada |
| 19:38-19:43 | Speed-run, 3 players joined (including "Elara" rejoin) |

**Players que entraram nas sessões de teste:**
- Sessão 1f848964: 2 late joins
- Sessão 7f4b9a7c: 2 late joins
- Sessão b333b586: 3 joins (1 rejoin de "Elara")

**Insight**: Este DM logou 5x em 25 minutos. Pode indicar problemas de sessão/auth, ou simplesmente abria abas novas. Os combates eram todos "Orc Warrior, Wolf & +3" — preset de teste.

---

### Fase 2: Sessão do Daniel (19:45–20:05 BRT)

**DM: `0e489319` (Daniel)**

| Hora (BRT) | Ação |
|------------|------|
| 19:45 | Login |
| 19:45 | Dashboard → New Session |
| 19:46 | Sessão `d736e0af` criada, link compartilhado |
| 19:46-19:48 | 3 players entraram via `/join/2o6u3x435e68596r133l10562l486v5m` |
| 19:55 | **Abandonou** sessão d736e0af, criou nova: `60551d0f` |
| 19:55 | Link compartilhado (`/join/5a4c455v061v1s1328215l644i652753`) |
| 19:56 | 3 players entraram: **daniel**, **Charles Emanuel**, **GODZILLA XD 123** |
| 19:56 | Encounter **"The Demogorgon" & Gladiator & Aarakocras** criado (3 players + 4 monsters) |
| 19:56 | **COMBATE INICIADO** |
| 19:58-20:03 | Round 1 completo + início do Round 2 |
| 20:04 | DM encerrou combate → **dm_ended** |
| 20:04 | 2 combat recap emails enviados |
| 20:04 | Navegou para Campaigns |

**Dados do combate (The Demogorgon):**
- Duração: **7.3 minutos**
- Resultado: `dm_ended`
- Rounds: ~1.5 (2 começou mas DM encerrou)
- Combat log: 16 entradas
- Criaturas: Aberrant Spirit, "The Demogorgon" (IMR), Gladiator, 2x Aarakocra
- Party: daniel (99 HP, AC 15, init 25), Charles Emanuel (20 HP, AC 20), GODZILLA XD 123

**Combat highlights:**
- GODZILLA XD 123 se curou +30 HP, levou 15+10+25 dano, ganhou 25 temp HP (testando sistema de HP)
- Aberrant Spirit 1 deu 10 dano em Charles Emanuel
- Combate foi rápido — mais exploratório/demo do que tactical

---

### Fase 2b: Novo Usuário Signup! (19:54–20:05 BRT)

**Usuário: `86baf326`** — **PRIMEIRO USO COMPLETO**

| Hora (BRT) | Ação |
|------------|------|
| 19:54 | **Welcome email enviado** (novo signup!) |
| 19:54 | Onboarding page |
| 19:55 | Dashboard |
| 19:55-19:57 | Explorou dashboard, criou sessão |
| 19:58 | Sessão `4cb66c76` criada, link compartilhado |
| 19:59 | Encounter **"Goblin"** criado (1 player + 1 monster) |
| 19:59 | **First combat email enviado!** |
| 20:02 | Player "Paladino de Loviatar" entrou via `/join/6e1i2v3500606w0o336b4h1s4t2n514y` |
| 20:03-20:04 | Dashboard refresh (3x) |
| 20:04 | Dashboard → Combats |
| 20:05 | Encerrou combate → **dm_ended** (5.2 min) |
| 20:05 | Dashboard → **Compendium** (exploração pós-combate) |

**Dados do combate (Goblin):**
- Duração: **5.2 minutos**
- Resultado: `dm_ended`
- Criaturas: Goblin (derrotado, 7/7 HP → 0), Aarakocra
- Turn times: ~3 min por combatente (exploratório)
- Combate simples — primeiro combate do usuário

**Jornada completa**: Signup → Onboarding → Dashboard → Criar Sessão → Compartilhar Link → Criar Encounter → Combate → Encerrar → Explorar Compendium. **Ativação Day-1 confirmada!**

---

### Fase 2c: Visitante do ChatGPT (19:52 BRT)

**Usuário anônimo: `a98895b1`**

| Hora (BRT) | Ação |
|------------|------|
| 19:52 | Chegou em `/monsters` com `utm_source=chatgpt.com` |
| 19:53 | Navegou para `/monsters/size-of-a-field-mouse` |
| 19:53 | Voltou a `/monsters` (utm_source=chatgpt.com) |
| 19:53 | Navegou para `/monsters/aboleth` |
| 19:53 | Foi para `/auth/login` |
| 20:02 | Avançou turno na sessão 4cb66c76 (turno de combate!) |

**Insight**: Usuário veio do ChatGPT pesquisando monstros, navegou o compendium público, foi para login, e depois apareceu avançando turnos na sessão do novo usuário (86baf326). Pode ter sido um player convidado pelo novo DM. **Referral orgânico do ChatGPT funcionando!**

---

### Fase 3: Sessão RPG Principal (00:23–02:07 BRT)

**DM: `414dd199`** — Sessão real com 6 jogadores

| Hora (BRT) | Ação |
|------------|------|
| 00:23 | Login → Dashboard → New Session |
| 00:23 | Sessão `b33616aa` criada (sem campanha) |
| 00:23 | Link compartilhado |
| 00:25-00:27 | **6 jogadores entraram!** |

**Jogadores (por ordem de entrada):**

| # | Nome | Token | Entrada (BRT) | Último sinal |
|---|------|-------|---------------|--------------|
| 1 | Capa Barsavi | 4c3d4s5s | 00:23 | 01:51 |
| 2 | Auditore | 1u1h6621 | 00:25 | 01:50 |
| 3 | Socrates | 0f5a1v5o | 00:25 | 01:46 |
| 4 | Skidd, o Coberto de Bladnir | 6c384p16 | 00:25 | 01:35 |
| 5 | Laurien | 5z3k5t5k | 00:25 | 02:07 |
| 6 | Amum | 026t0x1b | 00:26 | 01:52 |

| Hora (BRT) | Ação |
|------------|------|
| 00:28 | Encounter **"Djinni & Air Elementals"** criado (6 players + 5 monsters = 11 combatants) |
| 00:28 | **COMBATE INICIADO** |
| 00:37 | Round 1, Turno 1 (Laurien) |
| ... | Combate contínuo |
| 01:26 | Round 1 finalizado (13 turnos — ~49 min) |
| 01:26 | Round 2 começa |
| 01:59 | Round 2 finalizado → Round 3 começa (Laurien) |

**COMBATE TOTAL: ~1h30+ (00:28–02:00+ BRT)**

#### Round 1 — Ordem de Iniciativa e Timing

| # | Combatente | Hora início | Dano dealt | Dano taken |
|---|-----------|-------------|-----------|------------|
| 1 | Laurien | 00:37 | 129 (Djinni) | 11 (self) |
| 2 | Socrates | 00:44 | — | — |
| 3 | Skidd, o Coberto de Bladnir | 00:52 | 40 (Djinni), healed 5 elementals | 35+5 (self) |
| 4 | Auditore | 00:59 | 40 (Djinni) | — |
| 5 | Air Elemental 3 | 01:05 | — | — |
| 6 | Air Elemental 4 | 01:12 | — | — |
| 7 | Capa Barsavi | 01:14 | **DEFEATED Djinni!** | 8 (self) |
| 8 | Air Elemental Myrmidon 2 | 01:23 | — | — |
| 9 | Giant Owl 1 | 01:24 | 8+5+3+3 (elementals) | — |
| 10 | Air Elemental 1 | 01:31 | — | — |
| 11 | Air Elemental 2 | 01:33 | — | — |

**Tempo médio por turno Round 1: ~3.8 min**

#### Round 2 — Combate ficou mais rápido

| # | Combatente | Hora início | Ações notáveis |
|---|-----------|-------------|----------------|
| 1 | Laurien | 01:33 | 16+7 em Air Elemental 2, tomou 34 self |
| 2 | Socrates | 01:36 | — |
| 3 | Skidd | 01:38 | — |
| 4 | Auditore | 01:42 | 50 em Air Elemental 2 |
| 5 | Air Elemental 3 | 01:43 | — |
| 6 | Air Elemental 4 | 01:45 | — |
| 7 | Capa Barsavi | 01:47 | 13+13 (Elemental 2 + 4) |
| 8 | Amum | 01:51 | 15+17+8 em Air Elemental 4 |
| 9 | AE Myrmidon 1 | 01:54 | — |
| 10 | AE Myrmidon 2 | 01:57 | — |
| 11 | Giant Owl 1 | 01:58 | — |
| 12 | Air Elemental 1 | 02:03 | Tomou 4 dano (auto?) |

**Tempo médio por turno Round 2: ~2.5 min** (melhoria de 34%!)

#### Round 3

| # | Combatente | Hora | Nota |
|---|-----------|------|------|
| 1 | Laurien | 02:06 | Último evento registrado |

**Nota**: O encounter **não tem started_at/ended_at/duration_seconds preenchidos**. Isso indica que o combate não foi formalmente encerrado pelo DM — provavelmente a sessão foi fechada/abandonada depois do Round 3. Gap de dados.

---

### Fase 4: Guest Burst (11/abr 12:48–12:52 BRT)

**19 guest:combat_started** em 4 minutos, todos de IDs anônimos diferentes.

| Métrica | Valor |
|---------|-------|
| Total | 19 combates guest |
| Finalizados (guest:combat_ended) | 3 |
| Combatants médio | 3.2 |
| Duração média (finalizados) | ~19s |
| Período | 15:48–15:52 UTC (12:48–12:52 BRT) |

**Hipóteses:**
1. Post em rede social ou grupo de WhatsApp com link para `/try`
2. Demo para alguém mostrando o app
3. Bots (improvável — IDs diferentes, combatants variados)

**Nota**: Apenas 3 de 19 finalizaram combate. Maioria iniciou e abandonou. Drop-off de 84%.

---

## Reconexões de Players

Vários players acessaram a página `/join/...` múltiplas vezes durante a sessão principal:

| Usuário | Acessos | Provável causa |
|---------|---------|----------------|
| 0e489319 (Daniel) | 4x em /join/4c3d4s5s | Testando? Jogando pelo celular do player? |
| c0ba5750 | 4x em /join/4c3d4s5s | Reconexões (00:25, 01:05, 01:06, 02:07) |
| 10f254af | 2x em /join/4c3d4s5s | Reconexão (00:25, 01:23) |
| da03f639 | 2x em /join/4c3d4s5s | Reconexão (00:25, 00:59) |
| cbe2b9c6 | 2x em /join/4c3d4s5s | Reconexão (00:26, 01:05) |

**Insight**: 5 de 6 participantes da sessão principal reconectaram pelo menos uma vez. Isso é normal em sessões longas (1h30+), mas vale monitorar se a reconexão é suave (skeleton) ou se os players viram formulário novamente.

---

## Dano Total no Encounter "Djinni & Air Elementals"

| Jogador | Dano Dealt | Dano Taken | Destaque |
|---------|-----------|------------|----------|
| Laurien | 152 | 45 (self-report) | 129 no Djinni em um turno! |
| Capa Barsavi | 26 | 8 (self-report) | **Matou o Djinni** |
| Auditore | 90 | 0 | Consistente |
| Skidd | 40 + heals | 40 (self-report) | Support (heals) + damage |
| Amum | 40 | 0 | Focou Air Elemental 4 |
| Socrates | 0 (trackado) | 0 | Nenhuma ação registrada no log |
| Giant Owl 1 | 19 | 0 | NPC/companion |

**Total de dano no Djinni**: 129 + 40 + 40 = **209** (antes de ser defeated por Capa Barsavi)

---

## Problemas Detectados

### 1. Encounter sem started_at/ended_at (ALTO)
O encounter principal (Djinni & Air Elementals, `484114e7`) tem `combat_log` com 52 entradas mas `started_at: null`, `ended_at: null`, `duration_seconds: null`. O combate nunca foi formalmente encerrado pelo DM via "End Encounter". Isso quebra analytics de duração.

### 2. Combat reports duplicados (BAIXO)
Cada encounter gerou 2 combat reports (IDs diferentes, mesmo encounter_id). Isso está acontecendo sistematicamente.

### 3. Socrates sem ações no combat log (INFO)
Socrates aparece nos turnos (turn events) mas não tem nenhuma ação de dano/heal registrada. Pode ser que não reportou dano, ou estava fazendo ações que não geram log (movement, dodge, etc).

### 4. Turn index gaps (INFO)
No Round 1, turn_index pula de 9 para 11 (sem 10), e de 5 para 8 (sem 6-7). Pode indicar turn skips ou turn_index off-by-one.

### 5. DM de teste logou 5x em 25 minutos (BAIXO)
O usuário 0c1d188f logou repetidamente. Pode ser: (a) testando auth flow, (b) problemas com sessão, (c) multiple devices.

### 6. Guest drop-off de 84% (ALTO)
19 guest combats iniciados, apenas 3 finalizados. O guest flow precisa de investigação — pode ser confuso, lento, ou sem engagement.

---

## KPIs da Noite

| KPI | Valor | Meta | Status |
|-----|-------|------|--------|
| Sessões com players reais | 3 | — | Baseline |
| Players por sessão (máx) | 6 | — | Bom |
| Combate mais longo | ~1h30 | — | Excelente para engagement |
| Novo signup ativado | 1/1 (100%) | >50% | Excelente |
| Day-1 activation | Sim (signup → combat em 5 min) | — | Excelente |
| Reconexões por sessão | 5/6 players | <2 ideal | Investigar |
| Guest conversion | 0/19 | >5% | Precisa melhorar |
| ChatGPT referral | 1 | — | Orgânico funcionando |

---

## Ações Recomendadas

1. **Investigar reconexões** — 83% dos players reconectaram na sessão longa. É por causa de mobile sleep? Tab switching? O skeleton está funcionando?

2. **Fix duplicate combat reports** — Cada encounter gera 2 reports. Encontrar e corrigir a race condition.

3. **Guest onboarding** — 84% drop-off no guest mode. Precisa de melhor guidance ou simplificação do flow.

4. **Track encounter end** — O encounter principal não foi formalmente encerrado. Considerar auto-end depois de X minutos sem atividade, ou lembrete para o DM.

5. **Investigar turn_index gaps** — Entender por que turnos são pulados na sequência.

6. **Aproveitar ChatGPT referral** — Conteúdo público de monsters está gerando tráfego orgânico do ChatGPT. Expandir SEO de conteúdo SRD.
