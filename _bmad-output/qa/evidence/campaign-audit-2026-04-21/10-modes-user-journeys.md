# Modes — User Journeys Funcionais (v0.3)

**Propósito:** descrever **step-by-step o que o usuário FAZ** em cada mode, com cenários concretos e crítica multi-lens (Sally UX / Mary Analyst / Winston Architect / John PM + Blind Hunter + Edge Case Hunter).

Complementa [redesign-proposal.md](./redesign-proposal.md) v0.3 e [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md).

**Decisões base travadas:**
- 4 modes (3 Mestre + 1 Jogador — watch removido)
- Mestre: `prep` / `run` / `recap`
- Jogador: `journey` (com mini-wiki de notas + CTA "Entrar no Combate" quando ativo)
- Entity graph (`campaign_mind_map_edges`) já existe no schema — quests atribuíveis usam ele
- HP tiers canônicos travados (FULL/LIGHT/MODERATE/HEAVY/CRITICAL)
- Nunca "DM" — sempre "Mestre"

---

## 1. Jornada do Mestre — Preparar Sessão (`prep`)

### Cenário canônico: Sexta 18h, 2h antes da mesa

Dani chega em casa do trabalho. Mesa é 20h. Abre Pocket DM no laptop.

**Landing:** `/app/campaigns/krynn/prep/next_session` (surface default de `prep`).

### Fluxo passo a passo

**Passo 1 — Contexto imediato (<5s)**
- Vê **hero card** "Próxima Sessão #12 · Masmorra do Dragão"
- Meta em linha: `📅 Sex 25/Abr · 20h · ⏱ ~4h · 📍 Cavernas de Krynn · Câmara 3`
- Gancho destacado: `🎯 Grupo persegue o dragão fugido para a masmorra escondida`
- Ação rápida: `[✎ Editar]` hover revela

**Passo 2 — Checklist "o que falta" (<10s)**
- 2 colunas: **PREPARADO (2)** verde / **PENDENTE (2)** âmbar
- Preparado: Encontro "Kobolds ×4", NPC Grolda
- Pendente: Encontro boss (Dragão Vermelho), Recap da sessão 11

**Passo 3 — Criar um NPC rápido (<30s)**
- Clica `[+ Adicionar item ▼]` → dropdown com 4 opções: Encontro / NPC / Nota / Quest
- Escolhe NPC → slideover da direita abre (400ms slide-in)
- Form: nome ("Grolda"), humor (enum dropdown: preocupada/hostil/etc), visibility (public/hidden), descrição markdown
- Salva → slideover fecha, NPC aparece no feed de atividade
- Toast: "NPC Grolda criada"

**Passo 4 — Atribuir NPC à quest via graph (<20s)**
- Navega surface `quests` via sidebar
- Abre quest "Caça ao Dragão"
- Aba "Ligações" (ou chips inline): `[+ Adicionar]`
- Pick: NPC Grolda, relationship `gave_quest`
- Confirma → edge criado em `campaign_mind_map_edges(source='npc', source_id=grolda, target='quest', target_id=caça, rel='gave_quest')`
- Chip dourado aparece no card da quest: `Grolda · quest-giver`

**Passo 5 — Escrever nota com backlinks (<1min)**
- Navega surface `notes`
- `[+ Nova nota]` → editor markdown abre
- Digita: `A @Grolda mentiu sobre a espada +2. Esconder reveal pro round 3.`
- Autocomplete `@` mostra sugestões filtradas por nome (Grolda aparece como NPC)
- Select → chip `@Grolda` criado
- Background: edge `edges(note → npc, rel='mentions')` inserido automaticamente
- Salva (Ctrl+S) → toast "Nota salva"

**Passo 6 — Conferir Mapa Mental (<30s)**
- Navega surface `mindmap` → Renderiza graph com nodes:
  - NPC Grolda (gold) conectado a Quest Caça ao Dragão (edge `gave_quest`)
  - Grolda conectada a Nota "segredo da espada" (edge `mentions`)
  - Quest conectada a Location Cavernas (edge `happened_at`, se criado)
- Visual mostra a rede construída

**Passo 7 — Sair e ir fazer café (tempo: total ~5min)**
- Mesa começa às 20h, tudo pronto
- Fecha laptop

### Crítica multi-lens sobre Preparar Sessão

**Sally 🎨 (UX):** "O hero card + checklist + quick-add é o coração do Notion-like. Cobre 80% do uso. Ruim seria se tudo virasse form de 20 campos — mas a gente salvou via slideover + defaults sensatos."

**Mary 📊 (Analyst):** "Diferencial vs D&D Beyond: o graph existente transforma cada criação em nó conectado. Outros apps isolam entidades. A gente **linka automaticamente** via `mentions` trigger + atribuição explícita. Isso é killer-feat real."

**Winston 🏗 (Architect):** "Passo 5 (backlinks) depende de um parser que detecta `@nome` no body da nota e insere edge. Hoje não existe trigger — fica como Story na Fase C. Mas schema tá pronto."

**John 📋 (PM):** "Happy path é fluido. Mas: Mestre esquece de atribuir quest→NPC? Vira nó solto no mapa. **Sugestão MVP:** quando cria NPC dentro de contexto de quest, pré-seleciona relationship. Reduz 1 passo explícito."

**Blind Hunter (Mestre iniciante):** "Passo 4 (atribuir) — se eu nunca usei graph, posso não saber que existe. UI precisa convidar: 'Quer ligar esta NPC a uma quest?' após criar NPC — inline suggestion."

**Edge Case Hunter:**
- ✋ E se eu criar NPC sem ligação, depois tentar usar em mapa mental? → nó solto, que é OK (Mapa Mental mostra tudo)
- ✋ E se eu deletar NPC Grolda depois que ela tá em 3 notas? → `campaign_mind_map_edges_cascade` (mig 152) deleta edges. Notas ficam com chip "broken link" ou removem referência?
- **TODO:** decidir policy de broken links (remove ou flag).

### Métricas de sucesso (Preparar Sessão)

- **Tempo médio de preparação:** <10min pra sessão com 2-3 encontros + 5 NPCs + 2 notas
- **Uso de Quick Add:** ≥3 criações por sessão preparada
- **Uso de `@` backlinks:** ≥2 por nota (indica engajamento com graph)
- **Retorno semana-1:** Mestres que usam Preparar voltam na sessão seguinte

---

## 2. Jornada do Mestre — Rodar Combate (`run`)

### Cenário canônico: Sexta 20h05, grupo chegou, DM aperta "Iniciar combate"

### Estado antes (sem combate ativo)

**Landing:** `/app/campaigns/krynn/run` → tela "Iniciar novo combate"

**Fluxo:**
1. Vê lista de encontros preparados em `prep` → "Kobolds ×4 · Dragão Vermelho"
2. Clica "Kobolds ×4" → preview (monstros, dificuldade calculada, XP)
3. `[Iniciar combate →]` → confirm modal "Iniciar combate com 5 jogadores + 4 monstros?"
4. Confirma → server cria combate, broadcast realtime, UI transiciona pro cockpit

### Estado durante (combate ativo)

**Cockpit (wireframe W2 do [05-responsive-spec.md](./05-responsive-spec.md)):**

**Passo 1 — Round inicia**
- Header: `⚔ Krynn · Combate · Round 1 · Quick Encounter · [Pausar] [Sair]`
- Sidebar mostra `🛠🔒 Preparar Sessão` e `📖🔒 Recaps` (bloqueados durante combate)
- Iniciativa ordenada: `▶ Satori [83/83] AC 23` (vez dele, chevron gold)

**Passo 2 — Ação do turno (<5s)**
- Satori ataca Kobold 1 → Mestre atualiza HP do Kobold: `18/18 → 10/18` (inline +/- ou input)
- HP bar recolore de FULL (100%) → MODERATE (>40% e ≤70%) automaticamente via `getHpStatus()`
- Clica `[⚡ Próximo turno]` → server avança iniciativa, broadcast

**Passo 3 — Consulta rápida de NPC (<10s)**
- Jogador pergunta: "Grolda ainda tá com a gente?"
- Ctrl+K → "Grolda" → result: "NPC · quest-giver · humor: preocupada"
- Clica → side panel abre com ficha da Grolda (não sai do combate)
- Esc fecha

**Passo 4 — Add monstro surpresa (<20s)**
- Dragão irrompe no round 5
- `[+ Adicionar monstro]` → dropdown compendium → "Young Red Dragon"
- Server adiciona ao combate, recalcula iniciativa
- Realtime atualiza todos clients

**Passo 5 — Nota rápida no meio do combate (<5s)**
- `[▼ Nota rápida]` expande accordion
- Mestre digita: "Satori rolou crítico com espada flamejante!"
- Salva — nota marcada com tag `#combat-12` auto-gerada

**Passo 6 — Combate termina**
- Último inimigo derrotado → banner "Combate finalizado!"
- Options: `[Escrever recap agora]` (→ leva pra `recap`) · `[Voltar pra Preparar]` · `[Fechar]`
- Se escolhe recap → mode auto-switch pra `recap` com rascunho da sessão recém-terminada

### Estado depois (combate recém-terminado <30min)

Se Mestre navega pra `/run` sem combate ativo nas últimas 30min:
- Vê banner "Combate terminou há 5min — [Escrever recap agora]"
- Landing continua "Iniciar novo combate" mas com sugestão de recap pendente

### Crítica multi-lens sobre Rodar Combate

**Sally:** "Mode do cockpit é onde Foundry ganha. A gente tem que igualar: accordions colapsáveis, sticky CTA 'Próximo turno', foco máximo. Se tela ficar densa demais, jogadores esperam — quebra ritmo."

**Mary:** "Passo 4 (add monstro surpresa) é o momento que DIFERENCIA ferramenta boa de ferramenta genérica. Se demora >30s, Mestre desiste e vai improvisar no papel. Isso deve ser <20s."

**Winston:** "Lock de Preparar/Recap durante combate é crítico — senão Mestre edita NPC ao vivo e broadcast vaza HP/AC errado. Read-only + modal 'Pausar combate pra editar?'."

**John:** "Banner 'Combate terminou — escrever recap' é golden. Aproveita a memória quente. Se sugerir só 12h depois, Mestre esqueceu detalhes. **Métrica:** % de sessões com recap publicado em <2h pós-combate."

**Blind Hunter:** "A expressão 'Rodar Combate' assume que Mestre sabe o que é 'rodar'. Pra Mestre novato, pode ser 'Começar partida' ou 'Na mesa'. **Decisão travada pelo Dani:** mantém 'Rodar Combate' — é jargão de RPG BR. Novato aprende em minutos."

**Edge Case Hunter:**
- ✋ Mestre fecha aba durante combate ativo → Resilient Reconnection (15s stale detection) + Jogadores veem "Mestre desconectou"
- ✋ Mestre tenta iniciar 2º combate enquanto outro tá ativo → server bloqueia, UI mostra "Já há combate ativo"
- ✋ PC perde conexão mid-combat → HP congela no último estado broadcast até reconectar

### Métricas de sucesso (Rodar Combate)

- **Tempo pra achar NPC em Ctrl+K:** <10s (job Mestre-Run-1)
- **Tempo pra add monstro surpresa:** <20s
- **Taxa de recap escrito <30min pós-combate:** ≥60%
- **Zero bugs de HP desync** entre clients (Combat Parity + Resilient Reconnection)

---

## 3. Jornada do Mestre — Recaps (`recap`)

### Cenário canônico: Domingo 15h, sessão foi sexta 20h, Mestre quer publicar recap

**Landing:** `/app/campaigns/krynn/recap` → surface `last_session` com editor vazio (ou rascunho automático)

### Fluxo passo a passo

**Passo 1 — Editor abre (<2s)**
- Header: "📖 RECAP — Sessão 12 (terminou há 2h)"
- Editor markdown pre-filled com metadata: título sessão, data, duração
- Cursor posicionado no corpo

**Passo 2 — Escrever recap narrativo (<10min)**
- Mestre digita: `O grupo @Torin e @Capa Barsavi desceram nas @Cavernas e encontraram @Grolda...`
- Autocomplete `@` → selects renderizam como chips gold clicáveis
- Background: edges `mentions` inseridos automaticamente
- Auto-save a cada 30s → toast discreto "Rascunho salvo"

**Passo 3 — Adicionar tags (<10s)**
- `Tags: [#masmorra] [#dragão] [+ adicionar]`
- Cada tag vira chip removível

**Passo 4 — Revisar números (<20s)**
- Collapse "Números" expande: `⏱ 2h 14min · ⚔ 2 combates · 🎲 47 rolagens`
- Só aparece pra Mestre se ≥3 combates na campanha (F-10 fix)
- Se <3 combates, secção some

**Passo 5 — Preview + Publicar (<30s)**
- `[👁 Preview]` → modal mostra como Jogador verá
- `[📤 Publicar pros jogadores]` → confirm
- Server marca `sessions.recap_published_at = now()`
- Jogadores recebem push notification (se permissão)
- Toast: "Recap publicado. 5 jogadores notificados."

**Passo 6 — Consultar timeline (<10s)**
- Navega surface `timeline` → vertical timeline com eventos da campanha:
  - Sessão 12 · "Masmorra do Dragão" · publicado há 2min
  - Sessão 12 · Combate "Kobolds ×4" · finalizado ontem 22h
  - Nova nota "@Grolda mentiu" · criada há 3 dias
- Click em evento abre detalhe

**Passo 7 — Notas privadas do Mestre (opcional)**
- Navega surface `dm_notes` — notas que jogadores NÃO veem
- Mestre escreve estratégia interna: "No próximo round, fazer Grolda revelar a traição"
- Privacy enforced via RLS (`dm_notes.visibility = 'private'`)

### Crítica multi-lens sobre Recaps

**Sally:** "Plural 'Recaps' (não 'Recap') é intencional — a Biblioteca lista vários recaps. Jogador lê sua história. É Notion pro RPG. **Problema:** se Mestre preguiçoso não escreve, Jogador perde contexto."

**Mary:** "A gente pode inspirar escrita com IA (v2.0+). 'Baseado nos eventos do combate, sugestão de recap:' + rascunho auto-gerado. Mestre edita em vez de escrever do zero. Killer-feature futura."

**Winston:** "Passo 2 backlinks — parser async ou trigger? Se trigger, salvar nota com 30 `@` pode demorar. **Melhor:** parse frontend + batch insert edges em transaction."

**John:** "Métrica crítica: % de sessões com recap publicado em <48h. Recap atrasado = baixo engajamento do Jogador. Se <40%, investigar friction."

**Blind Hunter:** "Mestre com 50 sessões — Biblioteca de Recaps tem que scrollar rápido. **Requer:** search por título/tag, filtro por data. Sem isso, não escala."

**Edge Case Hunter:**
- ✋ Mestre escreve recap com `@NPC-Hidden` → publica — Jogador vê chip broken? **Decisão:** filtrar mentions por visibility na renderização do Jogador (NPC hidden → substituir por "???")
- ✋ Mestre publica recap, depois edita — Jogador vê notificação "Recap atualizado"?
- ✋ Mestre apaga sessão — recap some? (cascade delete)

### Métricas de sucesso (Recaps)

- **Tempo médio de escrita:** <15min pra recap de 500 palavras
- **Uso de `@` por recap:** ≥5 (engajamento com graph)
- **% sessões com recap <48h:** ≥60%
- **Taxa de leitura pelos jogadores:** ≥80% (via notificação → click)

---

## 4. Jornada do Jogador — Minha Jornada (`journey`)

### Cenário canônico 1: Sexta 19h, Jogador consultando ficha no ônibus

**Landing:** `/app/campaigns/curse-of-strahd/journey/my_character`

### Fluxo passo a passo (sem combate ativo)

**Passo 1 — Context imediato (<3s)**
- Hero card: "Capa Barsavi · Half-Elf Clérigo/Sorcerer · Nível 10"
- HP bar full-width: `████████████ 88/88` (FULL, verde emerald)
- AC: 21
- `[Abrir ficha completa →]` pra detalhes

**Passo 2 — Lembrar onde parou (<10s)**
- Surface `last_session` — card com recap publicado pelo Mestre
- Título: "Masmorra do Dragão"
- Preview: "O grupo encontrou a espada +2 no baú. Grolda pediu ajuda..."
- `[Ler completo →]` expande

**Passo 3 — Confirmar próxima sessão (<5s)**
- Surface `next_session` — card
- `📅 Sex 25/Abr · 20h · 📍 Cavernas de Krynn`
- `⚠ Trazer ficha impressa` (se Mestre marcou no hook)

**Passo 4 — Revisar quests ativas (<10s)**
- Surface `quests` — lista
- "Destruir o dragão vermelho" — quest card com chip `@Grolda · quest-giver`
- "Descobrir Culto Negro" — quest card (sem atribuição explícita = solo)
- **Destaque gold nas quests onde Jogador tá atribuído** (via `edges(player → quest, rel='participated_in')`)

**Passo 5 — Abrir Minhas Notas (mini-wiki) (<30s)**
- Surface `my_notes`
- Lista de notas com título + tag chips
- Clica "Observações sobre Grolda" → editor markdown
- Conteúdo: `Grolda mentiu sobre o baú — conferir no próx. encontro #suspeita`
- Edita, adiciona: `Talvez ela seja aliada do Culto Negro #teoria`
- Save (Ctrl+S) → toast "Nota salva"
- **v1.5:** autocomplete `@` filtrado por visibility

**Passo 6 — Ver party (<5s)**
- Surface `party` — lista de jogadores
- "Você" primeiro (destaque), depois Torin, Noknik, Askelad, Satori, Kai
- HP visible para todos (se Mestre permitir — regra de permissão granular v2.0)

### Cenário canônico 2: Sexta 20h05, combate acabou de começar

**Passo 1 — Banner sticky aparece**
- Jogador estava em `my_notes` escrevendo
- Banner vermelho no topo de `journey`: `⚔ O MESTRE INICIOU O COMBATE — Kobolds × 4 [Entrar no Combate →]`
- PWA push notification (se permissão concedida) — "Pocket DM: Combate iniciado em Curse of Strahd"

**Passo 2 — Clique no CTA**
- `[Entrar no Combate →]` navega pra `/app/combat/{combat_id}`
- Tela de combate existente carrega (não é novo mode — é tela separada que já existe)
- Jogador vê iniciativa, HP, turno atual
- **Mode state:** Jogador ainda é `journey`; só navegou pra outra rota. Pode voltar via back button.

**Passo 3 — Jogar o combate**
- Fluxo existente hoje da tela `/combat/[id]` continua igual
- Combate termina → redirect de volta pra `/journey` (ou banner "Ver recap quando publicado")

### Crítica multi-lens sobre Minha Jornada

**Sally:** "Jogador é consumidor ativo, não passivo. **Mini-wiki de notas** é diferencial vs planilha — Jogador vira cronista da própria jornada. Notion-like pro RPG de mesa."

**Mary:** "Comparação: D&D Beyond só tem ficha. Roll20 tem ficha + chat. Pocket DM tem ficha + quests atribuídas + wiki. **Posicionamento:** 'app de campanha de verdade, não só ficha'."

**Winston:** "Passo 1 cenário 2 (banner combate) — broadcast realtime notifica o client do Jogador. PWA push é fallback se aba tá fechada. **Precisa:** service worker com `push` listener + subscription management."

**John:** "**Risco de adopção:** Jogador não cria notas por preguiça. **Mitigação v1.5:** template de nota ('Minhas primeiras impressões da sessão') + prompts pós-sessão ('Anotar algo sobre @Grolda?'). Guia o hábito."

**Blind Hunter:** "Jogador novo abre app primeira vez depois que Mestre manda convite. Se 'Minha Jornada' tá vazia (sem recap, sem quest atribuída), frustrante. **Empty state narrativo:** 'Sua aventura ainda não começou. O Mestre vai marcar a primeira sessão em breve.'"

**Edge Case Hunter:**
- ✋ Jogador anônimo (via `/join/token`) não tem `user_id` — wiki de notas precisa dual-auth (ver spec-winston M1)
- ✋ Jogador tenta escrever nota → precisa conta? Anon vê prompt "Crie conta grátis pra salvar"
- ✋ Jogador com 0 quests atribuídas → empty state "Sua participação em quests aparece aqui"
- ✋ Jogador em combate, combate cai de rede → Resilient Reconnection força re-render com server state
- ✋ Jogador clica "Entrar no Combate" mas combate já terminou (race condition) → "Esse combate já acabou. [Ver recap quando publicar]"

### Métricas de sucesso (Minha Jornada)

- **Retorno semana-1:** Jogador convidado volta ≥1x na semana seguinte
- **Uso de Minhas Notas:** ≥1 nota/jogador/sessão (MVP); ≥3 (v1.5)
- **Tempo até clicar "Entrar no Combate" após banner:** <30s
- **Taxa de leitura de recaps:** ≥80% dentro de 48h da publicação

---

## 5. Jornadas cruzadas (Mestre + Jogador simultâneos)

### Cenário: Sexta 20h, sessão acontecendo em tempo real

```
20:00  Mestre: ABRE Krynn → cai em prep
       Jogador (Capa Barsavi): já estava em journey (abriu 19h no ônibus)

20:05  Mestre: clica "Rodar Combate" → seleciona encontro "Kobolds" → [Iniciar]
       Realtime broadcast → todos clients recebem `combat:started`

20:05  Jogador: banner vermelho aparece em journey: "Mestre iniciou combate"
       Jogador clica [Entrar no Combate] → navega /combat/[id]

20:05-21:30  Combate rola
       Mestre: em run mode cockpit (Preparar e Recaps lockados 🔒)
       Jogador: em /combat/[id] (tela separada — não é um "mode")
       HP sync realtime, turnos sincronizados, broadcast funciona

21:30  Mestre: último Kobold derrotado → banner "Combate finalizado"
       Mestre clica [Escrever recap agora] → mode auto-switch pra recap
       Jogador: redirect de /combat/[id] de volta pra /journey
       Jogador vê surface last_session com placeholder "Recap em breve"

22:00  Mestre: publica recap
       Jogador: push notification + banner em journey "Novo recap: Masmorra do Dragão"
       Jogador abre, lê, talvez anote algo em my_notes
```

### Crítica cross-mode

**Winston:** "Pontos críticos de realtime: (1) broadcast de `combat:started` → Jogadores recebem, (2) HP updates durante combate, (3) broadcast de `combat:ended`, (4) notificação de `recap:published`. Tudo via Supabase Realtime. Já funciona no atual — só precisa manter."

**Sally:** "Transição Mestre combat → recap é **golden path**. Se um botão automático leva do combate direto pro editor de recap com metadata preenchida, captura a memória quente. Retention +20%."

**Edge Case Hunter:**
- ✋ Mestre fecha aba durante combate → Jogadores continuam vendo "Mestre offline" via Resilient Reconnection stale detection (15s)
- ✋ Jogador anônimo sai do combate (fecha aba) durante turno dele → Mestre pode pular turno manualmente
- ✋ Múltiplos Jogadores clicam "Entrar no Combate" simultâneos → idempotent (todos joinam same room)
- ✋ Mestre inicia combate durante sessão paralela em OUTRA campanha → só a campanha atual é afetada (combate é campaign-scoped)

---

## 6. Review consolidado — Top 5 riscos da jornada funcional

Identificados pelo party mode com as 4+ lentes:

1. **🔴 Backlinks parser não existe** (Winston) — UI de `@` autocomplete + chip precisa de parser que insere edges `mentions`. Sem isso, killer-feat não funciona. **Bloqueador de MVP Fase C.**
2. **🟠 Ponte "combate → recap" não é automática** (Sally) — hoje Mestre precisa navegar manual. Proposta: CTA direto no banner de fim de combate. **ROI alto.**
3. **🟠 PWA push notifications** (Winston) — pro banner "Entrar no Combate" funcionar quando Jogador tá com aba fechada. Service worker + subscription management não triviais.
4. **🟡 Broken links de entidades deletadas** (Edge Case) — quando Mestre deleta NPC citada em 3 notas, o chip vira o quê? Policy não definida.
5. **🟡 Empty state do Jogador novo** (Blind Hunter) — Jogador chega via invite, não tem recap, não tem quest atribuída. Hoje fica esquisito. Precisa copy narrativo.

---

## 7. Decisões pendentes sobre jornadas

| # | Pergunta | Quem decide | Impacto |
|---|---|---|---|
| J1 | Broken link policy (NPC deletada citada em notas): remove chip, mostra "???", ou mantém com badge "removido"? | Winston + Sally | Médio |
| J2 | Auto-gerar rascunho de recap com events do combate? | John (ROI v2.0) | Baixo MVP |
| J3 | Banner "combate iniciado" pro Jogador: push automático ou opt-in? | Sally + compliance | Alto (UX + GDPR) |
| J4 | Template de notas do Jogador (v1.5)? | Sally | Médio |
| J5 | Notification de "recap publicado" no app + push ou só in-app? | John | Médio |

---

## 8. Próximos passos

1. **Schema:** Winston revisa [`schema-investigation-winston.md`](../../architecture/schema-investigation-winston.md) v2 com as 8 perguntas novas (foca em player_notes + backlinks parser)
2. **Implementation:** Fase A pode começar (quick wins não dependem disso). Fase B shell novo não depende. Fase C depende de schema Winston + backlinks parser.
3. **Figma:** wireframes W0b + W1 rebuild com SVGs gold (quando Figma destravar) + construir W4 atualizado (journey sem watch — com mini-wiki + banner de combate)
4. **Documentação:** este doc + [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) + [redesign-proposal.md](./redesign-proposal.md) v0.3 formam a trinca canônica

---

**Changelog:**
- **v0.3 (2026-04-21 tarde):** criado após party mode — watch removido, player wiki, entity graph existente descoberto, "Mestre nunca DM" travado
