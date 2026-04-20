# Migração i18n — Linguagem Ubíqua (v2 — audit completo)

> **Status:** Pronto para execução
> **Referência:** [docs/glossario-ubiquo.md](glossario-ubiquo.md)
> **Regra:** Alterar valores PT-BR e EN correspondentes. Chaves (key names) NÃO mudam.
> **Audit:** 100+ linhas com "sessão" verificadas em `messages/pt-BR.json`

---

## Resumo de Impacto (v2)

| Categoria | Chaves a alterar | Manter como está | Decisão pendente | Total |
|---|---|---|---|---|
| Combate ativo (session→combate) | 45 | — | — | 45 |
| Histórico (session→histórico) | 12 | — | — | 12 |
| Encounter (clarificar) | 5 | — | — | 5 |
| Session Planner (manter sessão) | — | 20 | — | 20 |
| Auth session (manter sessão) | — | 2 | — | 2 |
| Marketing/narrativo | — | 5 | 3 | 8 |
| Já corretos (combat/quest/preset) | — | 44 | — | 44 |
| **Total** | **62** | **71** | **3** | **136** |

---

## GRUPO 1 — "Sessão" → "Combate" (45 chaves)

Estas chaves usam "sessão" para se referir a **combate ativo ou funcionalidade de combate**. Pelo glossário, o termo correto é "Combate".

### 1A — Labels de combate ativo (Campaign HQ)

| # | Chave | Linha | PT-BR atual | PT-BR novo |
|---|---|---|---|---|
| 1 | `campaign.enter_session` | 202 | Entrar na Sessão | **Entrar no Combate** |
| 2 | `campaign.session_active_label` | 207 | Sessão Ativa | **Combate Ativo** |
| 3 | `campaign.session_fallback` | 225 | Sessão | **Combate** |
| 4 | `campaign.session_start_error` | 230 | Erro ao iniciar sessão. Tente novamente. | **Erro ao iniciar combate. Tente novamente.** |
| 5 | `campaign.active_session_banner` | 235 | Sessão ativa | **Combate ativo** |
| 6 | `campaign.hub_kpi_session_active` | 317 | Sessão Ativa | **Combate Ativo** |
| 7 | `campaign.quick_action_first_session` | 331 | Inicie sua primeira sessão | **Inicie seu primeiro combate** |
| 8 | `campaign.hero_session_active` | 332 | Sessão em andamento: {name} | **Combate em andamento: {name}** |
| 9 | `campaign.hero_enter_session` | 334 | Entrar na sessão ativa | **Entrar no combate ativo** |
| 10 | `campaign.start_session_combat` | 363 | Iniciar Sessão: {name} | **Iniciar Combate: {name}** |
| 11 | `campaign.start_session_combat_desc` | 364 | Iniciar combate na sessão planejada | **Iniciar combate planejado** |
| 12 | `campaign.send_link_desc` | 368 | Enviar link da sessão ativa para os jogadores | **Enviar link do combate ativo para os jogadores** |
| 13 | `campaign.session_link` | 380 | Link da sessão | **Link do combate** |
| 14 | `campaign.step3_desc` | 395 | Comece sua primeira sessão de combate | **Comece seu primeiro combate** |
| 15 | `campaign.step4_desc` | 398 | Pré-planeje desafios para uma sessão futura | **Pré-planeje encontros para um combate futuro** |

### 1B — Labels do Dashboard

| # | Chave | Linha | PT-BR atual | PT-BR novo |
|---|---|---|---|---|
| 16 | `dashboard.new_session` | 755 | Nova Sessão de Combate | **Novo Combate** |
| 17 | `dashboard.encounters_empty` | 782 | Nenhum encontro ativo. Inicie uma nova sessão de combate! | **Nenhum encontro ativo. Inicie um novo combate!** |
| 18 | `dashboard.active_session` | 830 | Sessão Ativa | **Combate Ativo** |
| 19 | `dashboard.no_active_session` | 831 | Sem sessão ativa | **Sem combate ativo** |
| 20 | `dashboard.encounter_history_empty_desc` | 845 | Inicie uma sessao de combate e finalize-a para ver o historico aqui. | **Inicie um combate e finalize-o para ver o histórico aqui.** |
| 21 | `dashboard.player_join_hint` | 808 | Peça ao seu Mestre o link da sessão para participar de um encontro. | **Peça ao seu Mestre o link do combate para participar.** |
| 22 | `dashboard.dm_nudge_invite_desc` | 862 | Compartilhe o link da sessão e eles entram com um clique | **Compartilhe o link do combate e eles entram com um clique** |
| 23 | `dashboard.player_empty_desc` | 865 | Peça ao seu mestre o link da sessão ou cole um código de campanha abaixo | **Peça ao seu mestre o link do combate ou cole um código de campanha abaixo** |
| 24 | `dashboard.session_join` | 871 | Entrar na Sessão | **Entrar no Combate** |
| 25 | `dashboard.combats_desc` | 1540 | Veja e retome combates salvos. Nunca perca uma sessão. | **Veja e retome combates salvos. Nunca perca um combate.** |
| 26 | `dashboard.player_join_desc` | 1564 | Quando o mestre iniciar uma sessão, um indicador AO VIVO aparecerá | **Quando o mestre iniciar um combate, um indicador AO VIVO aparecerá** |
| 27 | `dashboard.combats_desc` (compact) | 3058 | Inicie uma sessão para começar | **Inicie um combate para começar** |
| 28 | `dashboard.item_session` | 1591 | Participou de uma sessão | **Participou de um combate** |

### 1C — Labels do Player/Session namespace (tela de combate)

| # | Chave | Linha | PT-BR atual | PT-BR novo |
|---|---|---|---|---|
| 29 | `session.share_button` | 2219 | Compartilhar Sessão | **Compartilhar Combate** |
| 30 | `session.share_generate_aria` | 2221 | Gerar link da sessão | **Gerar link do combate** |
| 31 | `session.share_link_label` | 2222 | Link de participação da sessão | **Link de participação do combate** |
| 32 | `session.share_copy_aria` | 2223 | Copiar link da sessão | **Copiar link do combate** |
| 33 | `session.pick_campaign_title` | 2243 | Iniciar Sessão de Combate | **Iniciar Combate** |
| 34 | `session.pick_campaign_description` | 2244 | Escolha uma campanha para vincular a esta sessão | **Escolha uma campanha para vincular a este combate** |
| 35 | `session.notes_title` | 2251 | Notas da Sessão | **Notas do Combate** |
| 36 | `session.connecting` | 2267 | Conectando à sessão... | **Conectando ao combate...** |
| 37 | `session.connection_error_detail` | 2269 | Falha ao conectar à sessão | **Falha ao conectar ao combate** |
| 38 | `session.session_not_found` | 2301 | Sessão Não Encontrada | **Combate Não Encontrado** |
| 39 | `session.session_not_found_detail` | 2302 | Sessão não encontrada ou expirou | **Combate não encontrado ou expirou** |
| 40 | `session.session_ended` | 2303 | Sessão Encerrada | **Combate Encerrado** |
| 41 | `session.session_ended_detail` | 2304 | Esta sessão encerrou | **Este combate encerrou** |
| 42 | `session.session_ended_before_join` | 2305 | O combate foi encerrado pelo mestre. Você pode tentar novamente na próxima sessão. | **O combate foi encerrado pelo mestre. Peça um novo link ao seu Mestre.** |
| 43 | `session.poll_end_session` | 2047 | Encerrar Sessão | **Encerrar Combate** |
| 44 | `session.poll_awaiting_end` | 2433 | Aguardando encerramento da sessão... | **Aguardando encerramento do combate...** |
| 45 | `session.share_session_error` | 1717 | Erro ao preparar sessão para compartilhamento | **Erro ao preparar combate para compartilhamento** |

### 1D — Reconnection/Rejoin labels

| # | Chave | Linha | PT-BR atual | PT-BR novo |
|---|---|---|---|---|
| 46 | `session.rejoin_confirm_active_title` | 2365 | Sessão Ativa Detectada | **Combate Ativo Detectado** |
| 47 | `session.rejoin_confirm_active_body` | 2366 | ...controlado por outra sessão... | **...controlado por outro dispositivo...** |
| 48 | `session.rejoin_revoked` | 2372 | Sua sessão foi assumida de outro dispositivo | **Sua conexão foi assumida de outro dispositivo** |
| 49 | `session.session_transferred` | 2376 | Sessão transferida para outro dispositivo | **Conexão transferida para outro dispositivo** |
| 50 | `session.session_revoked_banner` | 2409 | Sua sessão foi assumida de outro dispositivo | **Sua conexão foi assumida de outro dispositivo** |
| 51 | `session.rejoin_notification_active` | 1851 | ⚠️ {name} quer assumir {character} (sessão ativa) | **⚠️ {name} quer assumir {character} (combate ativo)** |
| 52 | `session.rejoin_banner_subtitle_active` | 1853 | Quer assumir {character} (sessão ativa) | **Quer assumir {character} (combate ativo)** |
| 53 | `session.player_drawer_no_campaign` | 2118 | Sessão sem campanha vinculada | **Combate sem campanha vinculada** |

### 1E — Onboarding/Wizard labels

| # | Chave | Linha | PT-BR atual | PT-BR novo |
|---|---|---|---|---|
| 54 | `onboarding.choose_campaign_description` | 1388 | ...link de sessão para compartilhar | **...link de combate para compartilhar** |
| 55 | `onboarding.launch_description` | 1448 | ...crie sua primeira sessão | **...crie seu primeiro combate** |
| 56 | `onboarding.launch_session_link_label` | 1455 | Link da sessão | **Link do combate** |
| 57 | `onboarding.error_session` | 1464 | Falha ao criar sessão | **Falha ao criar combate** |
| 58 | `onboarding.error_link` | 1466 | Falha ao gerar link da sessão | **Falha ao gerar link do combate** |
| 59 | `onboarding.create_button` | 1469 | Criar & Obter Link da Sessão | **Criar & Obter Link do Combate** |
| 60 | `dashboard.notif_session_start` | 2550 | Inicio de sessao | **Início de combate** |
| 61 | `session.toast_session_created` | 4000 | Sessão criada | **Combate criado** |
| 62 | `settings.expired_title` | 2800 | Sessão expirada | **Link expirado** |

---

## GRUPO 2 — "Sessão/Sessões" → "Histórico" (12 chaves)

Estas chaves referem-se a **combates passados/registros históricos**.

| # | Chave | Linha | PT-BR atual | PT-BR novo |
|---|---|---|---|---|
| 63 | `campaign.summary_sessions` | 181 | {count, plural, one {sessão} other {sessões}} | **{count, plural, one {combate no histórico} other {combates no histórico}}** |
| 64 | `campaign.hub_card_sessions` | 327 | Sessões | **Histórico** |
| 65 | `campaignHealth.segment_sessions` | 598 | Sessões | **Histórico** |
| 66 | `campaignHealth.tooltip_sessions` | 602 | Tem pelo menos uma sessão | **Tem pelo menos um combate no histórico** |
| 67 | `campaignHealth.last_session_days` | 585 | Última sessão: há {days}d | **Último combate: há {days}d** |
| 68 | `campaignHealth.last_session_days_ago` | 586 | Última sessão: há {days}d | **Último combate: há {days}d** |
| 69 | `campaignHealth.last_session_today` | 587 | Última sessão: hoje | **Último combate: hoje** |
| 70 | `campaignHealth.last_session_yesterday` | 588 | Última sessão: ontem | **Último combate: ontem** |
| 71 | `campaignHealth.no_sessions` | 589 | Sem sessões ainda | **Sem histórico ainda** |
| 72 | `campaignHealth.no_sessions_yet` | 590 | Sem sessões ainda | **Sem histórico ainda** |
| 73 | `sessionHistory.empty` | 543 | Nenhuma sessão registrada ainda | **Nenhum combate registrado ainda** |
| 74 | `sessionHistory.empty_desc` | 544 | Planeje sua primeira sessão para começar... | **Inicie seu primeiro combate para começar a acompanhar o histórico.** |

---

## GRUPO 3 — "Encontro/Combate" → Clarificar (5 chaves)

| # | Chave | Linha | PT-BR atual | PT-BR novo | Nota |
|---|---|---|---|---|---|
| 75 | `campaign.section_encounters` | 193 | Combates Anteriores | **Histórico de Combates** | Seção de histórico |
| 76 | `campaign.stats_encounters` | 184 | Combates | **Encontros** | São presets, não combates |
| 77 | `campaign.summary_encounters` | 182 | {count, plural, one {combate finalizado} other {combates finalizados}} | **{count, plural, one {encontro salvo} other {encontros salvos}}** | Clarificar como preset |
| 78 | `campaign.encounters_empty` | 195 | Nenhum combate finalizado ainda. | **Nenhum encontro preparado ainda.** | Clarificar como preset |
| 79 | `campaignHealth.tooltip_encounters` | 601 | Tem pelo menos um encontro | **Tem pelo menos um encontro preparado** | Adicionar "preparado" |

### ⚠️ Chaves encounter com MÚLTIPLAS ocorrências (cuidado no find-replace)

| Chave | Namespace 1 (alterar) | Namespace 2 (NÃO alterar) |
|---|---|---|
| `encounters_empty` | Linha 195 (`campaign`): alterar | Linha 782 (`dashboard`): alterar (Grupo 1, #17) |
| `tooltip_encounters` | Linha 601 (`campaignHealth`): alterar | Linha 3645 (outro): NÃO alterar — é tooltip de contagem |
| `encounter_description` | Linha 1678 (`combat`): **NÃO alterar** — diz "inicie o combate", está CORRETO | Linha 1444 (`onboarding`): NÃO alterar — contexto de wizard |

---

## GRUPO 4 — Session Planner (MANTER "Sessão" — 20 chaves)

O `SessionPlanner` é uma feature de **planejamento de sessões de jogo** (agendar data, descrever agenda). "Sessão" aqui se refere à mesa de jogo real, NÃO a combate. Manter por ora.

| Chave | Linha | Valor | Motivo para manter |
|---|---|---|---|
| `sessionPlanner.title` | 491 | Planejar Sessão | Feature de planejamento |
| `sessionPlanner.name_label` | 492 | Nome da Sessão | Idem |
| `sessionPlanner.name_placeholder` | 493 | Sessão {number} | Idem |
| `sessionPlanner.description_placeholder` | 497 | Resumo do que esta sessão vai abordar... | Idem |
| `sessionPlanner.created` | 506 | Sessão planejada! | Idem |
| `sessionPlanner.started` | 507 | Sessão iniciada! | Idem |
| `sessionPlanner.success_planned` | 508 | Sessão planejada! | Idem |
| `sessionPlanner.success_started` | 509 | Sessão iniciada! | Idem |
| `sessionPlanner.default_name` | 510 | Nova Sessão | Idem |
| `sessionPlanner.error` | 511 | Erro ao criar sessão | Idem |
| `sessionPlanner.error_create` | 513 | Erro ao criar sessão | Idem |
| `sessionPlanner.next_session` | 514 | Próxima Sessão | Idem |
| `sessionPlanner.start_session` | 532 | Iniciar Sessão | Idem |
| `sessionPlanner.enter_session` | 533 | Entrar na Sessão | Idem |
| `sessionPlanner.cancel_confirm` | 535 | Cancelar esta sessão? | Idem |
| `sessionPlanner.cancel_confirm_desc` | 536 | Esta sessão será marcada como cancelada. | Idem |
| `sessionPlanner.cancelled` | 538 | Sessão cancelada | Idem |
| `sessionPlanner.session_number` | 539 | Sessão {number} | Idem |
| `campaign.quick_action_plan_session` | 328 | Planejar Sessão | Feature de planejamento |
| `campaign.hero_session_next` | 333 | Próxima sessão: {name} | Referência ao SessionPlanner |

> **Nota:** O `SessionPlanner` é uma feature legítima. O conceito de "planejar uma sessão de jogo" (com data, descrição) é válido. A confusão ocorre quando o app usa "sessão" para se referir a combate ativo — isso sim precisa mudar (Grupo 1).

---

## GRUPO 5 — SessionHistory labels (MANTER nome do componente, mudar conteúdo)

Labels do componente `SessionHistory` que falam sobre **combates passados**.
Já cobertos no Grupo 2 (chaves 73-74). Chaves adicionais que mantêm "Sessão" mas são do SessionHistory component:

| Chave | Linha | Valor | Ação |
|---|---|---|---|
| `sessionHistory.recap_title` | 545 | Resumo da Sessão: {name} | **Mudar → "Resumo do Combate: {name}"** |
| `sessionHistory.recap_placeholder` | 546 | O que aconteceu nesta sessão? | **Mudar → "O que aconteceu neste combate?"** |
| `sessionHistory.recap_skipped` | 554 | Sessão concluída | **Mudar → "Combate concluído"** |
| `sessionHistory.plan_session` | 566 | Planejar Sessão | MANTER — link pro SessionPlanner |
| `sessionHistory.session_title` | 567 | Sessão {number}: {name} | **Mudar → "Combate {number}: {name}"** |
| `sessionHistory.session_stats` | 568 | {encounters} encontros, {rounds} rodadas | MANTER — sem "sessão" |

> Isso adiciona **4 chaves** ao total de migração.

---

## GRUPO 6 — Auth/Pagamento (MANTER "sessão" — 2 chaves)

| Chave | Linha | Valor | Motivo |
|---|---|---|---|
| `common.session_expired` | 734 | Sua sessão expirou. Faça login novamente. | Auth session — NÃO é combate |
| `pricing.checkout_error` | 3123 | Falha ao criar sessão de pagamento. | Stripe checkout session — NÃO é combate |

---

## GRUPO 7 — Marketing/Narrativo (5 manter + 3 avaliar)

### Manter (contexto de "mesa de jogo real")

| Chave | Linha | Valor | Motivo |
|---|---|---|---|
| `campaign.type_oneshot_desc` | 417 | Aventura completa em uma sessão | "Sessão" = mesa real, correto |
| `landing.testimonial_1_quote` | 3005 | Na sessão passada, um combate de 8 criaturas... | Testimonial, "sessão" = mesa real |
| `landing.beyond_combat_subheading` | 3017 | Cada sessão no Pocket DM alimenta... | Marketing, sessão = uso do app |
| `landing.final_cta_subheading_logged_out` | 3029 | ...transforme sua próxima sessão | Marketing, sessão = mesa real |
| `landing.step_3_description` | 2929 | Gere o link da sessão | **Avaliar** — deveria ser "link do combate"? |

### Avaliar (decisão pendente)

| Chave | Linha | Valor | Questão |
|---|---|---|---|
| `campaign.hub_subtitle_session` | 296 | Sessão {number} | É referência ao SessionPlanner ou ao histórico? |
| `dashboard.npc_global_desc` | 816 | Disponível para usar em qualquer campanha ou sessão | "Sessão" aqui é genérico — mudar pra "combate"? |
| `landing.step_3_description` | 2929 | Gere o link da sessão | Contexto de onboarding — provavelmente "link do combate" |

---

## GRUPO 8 — Outras chaves com "sessão" (mudar)

| # | Chave | Linha | PT-BR atual | PT-BR novo |
|---|---|---|---|---|
| 80 | `campaign.hub_subtitle_last` | 297 | Última sessão: há {days} dias | **Último combate: há {days} dias** |
| 81 | `campaign.hub_subtitle_last_today` | 298 | Última sessão: hoje | **Último combate: hoje** |
| 82 | `campaign.delete_warning` | 479 | ...tem {sessions} sessões, {encounters} encontros... | **...tem {sessions} combates no histórico, {encounters} encontros...** |
| 83 | `session_drawer.hint` | 929 | Sessão da sua campanha. | **Combate da sua campanha.** |
| 84 | `playerHq.scratch_pad_label` | 1321 | Rascunho de Sessão | **Rascunho de Combate** |
| 85 | `playerHq.notes_desc` | 1574 | Anote durante a sessão | **Anote durante o combate** |
| 86 | `upsell.upsell_description_share` | 2780 | ...links de sessão... | **...links de combate...** |
| 87 | `delete_confirm_description` | 2517 | ...histórico de sessão | **...histórico de combate** |
| 88 | `tour.controls_description` | 3510 | ...salvar sessão... | **...salvar combate...** |
| 89 | `tour.complete_description` | 3518 | ...quando a sessão expira... | **...quando o combate expira...** |
| 90 | `mindMap.sessions_group` | 3593 | Sessoes | **Histórico** |
| 91 | `mindMap.filter_session` | 3616 | Sessões | **Histórico** |
| 92 | `pricing.session_analytics.title` | 3089 | Desbloqueie Análise de Sessão | **Desbloqueie Análise de Combate** |
| 93 | `pricing.session_analytics` (×2) | 3136, 3183 | Análise de sessão | **Análise de combate** |
| 94 | `pricing.pro_feature_10` | 3427 | Analytics de sessão | **Analytics de combate** |
| 95 | `pricing.session_analytics.description` | 3098 | ...durante a sessão | **...durante o combate** |
| 96 | `compendium.subheadline` | 3870 | ...sessão que você roda... | **...combate que você roda...** |
| 97 | `campaign.leave_campaign_confirm` | 219 | ...dados de sessão | **...dados de combate** |
| 98 | `campaign.notes_placeholder` | 194 | ...resumos de sessao... | **...resumos de combate...** |
| 99 | `playerHq.journal_content_placeholder` | 1295 | O que aconteceu na sessão? | **O que aconteceu no combate?** |

---

## GRUPO 9 — Chaves que NÃO mudam (validação)

### Combat — Todas corretas (17 chaves)

Todas usam "Combate" corretamente. ✅ Sem alteração.

### Quest — Todas corretas (12 chaves)

Todas usam "Quest" sem traduzir. ✅

### Preset — Todas corretas (15 chaves)

Todas usam "Preset de Combate". ✅

### ⚠️ `combat.encounter_description` — NÃO alterar

| Chave | Linha | Valor | Status |
|---|---|---|---|
| `combat.encounter_description` | 1678 | "Adicione combatentes, defina iniciativa e inicie o combate." | ✅ **CORRETO** — o DM está iniciando um COMBATE, não um encontro |
| `onboarding.encounter_description` | 1444 | "Nomeie o primeiro encontro que seu grupo enfrentará." | ✅ **CORRETO** — contexto de wizard |

> **Nota da v1:** A v1 deste doc listava `combat.encounter_description` como chave #15 a alterar de "combate" para "encontro". Isso era **ERRADO** — contradizia o glossário. Removido na v2.

---

## Contagem Final

| Grupo | Chaves | Ação |
|---|---|---|
| 1 — Combate ativo | 62 | Mudar "sessão" → "combate" |
| 2 — Histórico | 12 | Mudar "sessão/sessões" → "histórico" |
| 3 — Encounter | 5 | Clarificar terminologia |
| 5 — SessionHistory | 4 | Mudar recap labels |
| 8 — Outras | 20 | Mudar "sessão" → "combate" |
| **Total a alterar** | **103** | |
| 4 — Session Planner | 20 | Manter "sessão" |
| 6 — Auth | 2 | Manter "sessão" |
| 7 — Marketing | 8 | 5 manter, 3 avaliar |
| 9 — Já corretas | 44 | Nenhuma ação |

---

## Plano de Execução

### Passo 1: Alterar `messages/pt-BR.json` (83 chaves dos Grupos 1+2+3+5+8)
### Passo 2: Alterar `messages/en.json` (mesmas chaves, valores EN correspondentes)
### Passo 3: Verificar build (`tsc --noEmit`)
### Passo 4: Verificar visualmente no browser (dashboard, campaign, combat, player view)
### Passo 5: Rodar testes e2e que validam labels

### ⚠️ Cuidados na execução

1. **NÃO usar find-replace cego de "sessão"→"combate"** — existem 20 chaves do SessionPlanner e 2 de auth que DEVEM manter "sessão"
2. **Verificar namespaces** — `encounters_empty` e `tooltip_encounters` existem em múltiplos namespaces com valores diferentes
3. **NÃO alterar `combat.encounter_description`** — valor atual está CORRETO
4. **Verificar `sessionPlanner.*` keys** — devem permanecer inalteradas
5. **Verificar `session_expired` e `checkout_error`** — são auth/pagamento, não combate

### Critério de sucesso
- Zero erros de compilação
- Labels corretas em PT-BR e EN
- Nenhuma label diz "Sessão" referindo-se a combate ativo/passado
- SessionPlanner labels mantêm "Sessão"
- Auth session labels mantêm "Sessão"
- Nenhuma label diz "Combate" referindo-se a preset/encontro
