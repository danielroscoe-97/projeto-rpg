# 06 — i18n Strings Spec (Campaign HQ Redesign v0.2)

**Autor:** spec pack 2026-04-22
**Source of truth:** `redesign-proposal.md` (v0.2)
**Arquivos alvo:** `messages/pt-BR.json` · `messages/en.json`
**Escopo:** TODAS as strings user-facing que o redesign introduz (shell, modes, surfaces, empty states, tours, actions, errors, a11y, toasts, confirms) — prontas pra colar nos bundles existentes.

---

## Seção 1 — Namespaces propostos

Hierarquia a inserir em `messages/pt-BR.json` e `messages/en.json`. Todos convivem com a raiz `campaign.*` já existente (não quebrar chaves legadas).

```
campaign.shell.*          // topbar, logo, switcher, busca rápida, notificações, user menu
campaign.modes.*          // Preparar / Rodar / Recap (labels, descriptions, tooltips, aria)
campaign.surfaces.*       // 11 surfaces × label + description + aria + empty-state-title
campaign.prep.*           // strings exclusivas do modo Preparar (next-session card, quick-add etc)
campaign.run.*            // strings exclusivas do modo Rodar (painel colapsável, cena, quick add monstro)
campaign.recap.*          // strings exclusivas do modo Recap (editor, tags, timeline, números, publicar)
player.journey.*          // modo Minha Jornada (banner combate, card personagem, party, notas)
player.watch.*            // modo Assistindo (turno, iniciativa, próximo turno, ações rápidas)
empty_states.*            // copy role-conditional por surface (fix F-05) — Mestre vs player-auth vs player-anon
actions.*                 // verbos canônicos reutilizáveis (substitui ad-hoc buttons espalhados)
tour.*                    // W0b onboarding + re-tour
errors.*                  // load fail, save fail, network, permission
badges.*                  // HP tiers (EN nos 2 locales), status, contadores, alertas
a11y.*                    // aria-label específicos, live-region messages, SR-only strings
toasts.*                  // confirmações efêmeras (salvou, publicou, convidou, copiou)
confirms.*                // diálogos destrutivos (pausar combate, deletar, arquivar)
```

**Observações:**
- Mantém coexistência com `campaign.hub_*`, `campaign.section_*` etc (legado) — ver Seção 4 pra lista do que deprecia.
- `actions.*` é **namespace novo raiz** (sem prefixo `campaign.`) porque é reutilizado fora de campanha também (dashboard, compendium).
- `badges.hp_*` segue convenção já documentada no header do `pt-BR.json` (prefixo `hp_status_*` ou `hp_*_short`).

---

## Seção 2 — Tabela master

> Legenda: chaves com `{variavel}` seguem ICU MessageFormat como o resto do projeto.

### 2.1 `campaign.shell.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `campaign.shell.campaign_switcher_label` | "Trocar campanha" | "Switch campaign" | Dropdown Krynn ▾ no topbar |
| `campaign.shell.campaign_switcher_aria` | "Seletor de campanha, {name} selecionada" | "Campaign selector, {name} selected" | aria-label do botão |
| `campaign.shell.campaign_switcher_empty` | "Sem outras campanhas" | "No other campaigns" | Se Mestre tem só 1 |
| `campaign.shell.campaign_switcher_create` | "+ Criar campanha" | "+ New campaign" | Item final do dropdown |
| `campaign.shell.quick_search_placeholder` | "Buscar rápida (Ctrl+K)" | "Quick search (Ctrl+K)" | Input na topbar |
| `campaign.shell.quick_search_placeholder_mac` | "Buscar rápida (⌘K)" | "Quick search (⌘K)" | Mac only |
| `campaign.shell.quick_search_aria` | "Abrir busca rápida" | "Open quick search" | aria-label do botão 🔍 |
| `campaign.shell.quick_search_empty` | "Nada encontrado" | "Nothing found" | Estado sem resultados |
| `campaign.shell.quick_search_hint` | "Busque NPCs, quests, locais, notas — ou comandos (\"novo npc\")" | "Search NPCs, quests, locations, notes — or commands (\"new npc\")" | Placeholder helper do modal |
| `campaign.shell.quick_search_section_npcs` | "NPCs" | "NPCs" | Grupo de resultados |
| `campaign.shell.quick_search_section_quests` | "Quests" | "Quests" | Grupo |
| `campaign.shell.quick_search_section_locations` | "Locais" | "Locations" | Grupo |
| `campaign.shell.quick_search_section_notes` | "Notas" | "Notes" | Grupo |
| `campaign.shell.quick_search_section_sessions` | "Sessões" | "Sessions" | Grupo |
| `campaign.shell.quick_search_section_commands` | "Comandos" | "Commands" | Grupo de ações |
| `campaign.shell.notifications_label` | "Notificações" | "Notifications" | aria-label do 🔔 |
| `campaign.shell.notifications_count` | "{count, plural, =0 {Sem notificações} one {# notificação} other {# notificações}}" | "{count, plural, =0 {No notifications} one {# notification} other {# notifications}}" | Badge aria |
| `campaign.shell.notifications_empty` | "Tudo em dia" | "All caught up" | Estado vazio |
| `campaign.shell.notifications_mark_all` | "Marcar tudo como lido" | "Mark all as read" | Botão do popover |
| `campaign.shell.user_menu_label` | "Menu da conta" | "Account menu" | aria do avatar |
| `campaign.shell.user_menu_profile` | "Perfil" | "Profile" | Item |
| `campaign.shell.user_menu_settings` | "Configurações" | "Settings" | Item |
| `campaign.shell.user_menu_logout` | "Sair" | "Log out" | Item |
| `campaign.shell.sidebar_collapse` | "Recolher menu lateral" | "Collapse sidebar" | Botão ◀ |
| `campaign.shell.sidebar_expand` | "Expandir menu lateral" | "Expand sidebar" | Botão ▸ |
| `campaign.shell.sidebar_aria` | "Navegação da campanha" | "Campaign navigation" | aria-label da `<nav>` |
| `campaign.shell.topbar_aria` | "Barra superior" | "Top bar" | aria-label do header |
| `campaign.shell.session_badge_in_days` | "Sess. {n} em {days} dias" | "Sess. {n} in {days} days" | Indicador no topbar |
| `campaign.shell.session_badge_today` | "Sess. {n} hoje" | "Sess. {n} today" | Variante today |
| `campaign.shell.session_badge_tomorrow` | "Sess. {n} amanhã" | "Sess. {n} tomorrow" | Variante tomorrow |
| `campaign.shell.session_badge_overdue` | "Sess. {n} atrasada" | "Sess. {n} overdue" | Se > data planejada |
| `campaign.shell.main_content_label` | "Conteúdo principal" | "Main content" | aria landmark |

### 2.2 `campaign.modes.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `campaign.modes.tablist_label` | "Modos da campanha" | "Campaign modes" | aria-label `role="tablist"` |
| `campaign.modes.prep_label` | "Preparar Sessão" | "Prep Session" | Label canônico do tab (W1). Travado em decisão #21 |
| `campaign.modes.prep_short` | "Preparar" | "Prep" | Variante curta mobile bottom-tab |
| `campaign.modes.prep_description` | "Entre sessões: escreva NPCs, quests, notas e prepare a próxima sessão." | "Between sessions: write NPCs, quests, notes and prep the next session." | Tooltip hover |
| `campaign.modes.prep_aria_selected` | "Modo Preparar Sessão, selecionado" | "Prep Session mode, selected" | aria quando ativo |
| `campaign.modes.prep_aria` | "Modo Preparar Sessão" | "Prep Session mode" | aria padrão |
| `campaign.modes.run_label` | "Rodar Combate" | "Run Combat" | Label canônico do tab (W2). Travado em decisão #21 |
| `campaign.modes.run_short` | "Rodar" | "Run" | Variante curta mobile |
| `campaign.modes.run_description` | "Na mesa: iniciativa, HP, cena, NPCs presentes — tudo 1 clique." | "At the table: initiative, HP, scene, NPCs present — one click for everything." | Tooltip |
| `campaign.modes.run_aria` | "Modo Rodar Combate" | "Run Combat mode" | aria |
| `campaign.modes.run_aria_selected` | "Modo Rodar Combate, selecionado" | "Run Combat mode, selected" | aria ativo |
| `campaign.modes.run_badge_active` | "Combate ativo" | "Combat active" | Badge no tab quando combat on |
| `campaign.modes.recap_label` | "Recaps" | "Recaps" | Label canônico do tab (W8). Travado em decisão #21 (plural intencional — múltiplos recaps por campanha) |
| `campaign.modes.recap_short` | "Recaps" | "Recaps" | Mobile |
| `campaign.modes.recap_description` | "Depois da sessão: escreva o resumo, revise quests, linkeia NPCs." | "After the session: write the recap, review quests, link NPCs." | Tooltip |
| `campaign.modes.recap_aria` | "Modo Recaps" | "Recaps mode" | aria |
| `campaign.modes.recap_aria_selected` | "Modo Recaps, selecionado" | "Recaps mode, selected" | aria ativo |
| `campaign.modes.lock_badge_short` | "Bloqueado" | "Locked" | 🔒 badge compacto na sidebar |
| `campaign.modes.lock_badge_detail` | "Combate em andamento — edição pausada" | "Combat in progress — editing paused" | Tooltip do 🔒 |
| `campaign.modes.lock_pause_to_edit_title` | "Pausar combate pra editar?" | "Pause combat to edit?" | Modal title quando Mestre tenta editar |
| `campaign.modes.lock_pause_to_edit_body` | "O combate está ativo. Pausar libera edição em Preparar Sessão e Recaps. Retome quando quiser." | "Combat is active. Pausing unlocks editing in Prep Session and Recaps. Resume whenever you want." | Modal body |
| `campaign.modes.lock_pause_confirm` | "Pausar combate" | "Pause combat" | CTA primária |
| `campaign.modes.lock_pause_cancel` | "Cancelar" | "Cancel" | CTA secundária |
| `campaign.modes.switched_live_region` | "Modo trocado para {mode}" | "Switched to {mode} mode" | aria-live ao trocar |
| `campaign.modes.auto_switched_to_watch` | "Combate iniciado — você está assistindo" | "Combat started — you are watching" | Toast quando player cai em Assistindo |
| `campaign.modes.auto_switched_to_run` | "Combate iniciado — você entrou em Rodar Combate" | "Combat started — you are in Run Combat" | Toast Mestre |
| `campaign.modes.just_ended_prompt` | "Combate terminou. Escrever o recap agora?" | "Combat ended. Write the recap now?" | Sugestão pós-combate |
| `campaign.modes.back_to_journey_cta` | "Voltar pra Minha Jornada" | "Back to My Journey" | Player em Assistindo quer opt-out |

### 2.3 `campaign.surfaces.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `campaign.surfaces.next_session.label` | "Próxima Sessão" | "Next Session" | Sidebar item (Preparar) |
| `campaign.surfaces.next_session.aria` | "Próxima sessão — {name}" | "Next session — {name}" | aria com nome da sessão |
| `campaign.surfaces.quests.label` | "Quests" | "Quests" | Sidebar |
| `campaign.surfaces.quests.aria_count` | "Quests — {count} ativas" | "Quests — {count} active" | aria |
| `campaign.surfaces.npcs.label` | "NPCs" | "NPCs" | Sidebar |
| `campaign.surfaces.npcs.aria_count` | "NPCs — {count} cadastrados" | "NPCs — {count} entries" | aria |
| `campaign.surfaces.locations.label` | "Locais" | "Locations" | Sidebar |
| `campaign.surfaces.factions.label` | "Facções" | "Factions" | Sidebar |
| `campaign.surfaces.notes.label` | "Notas" | "Notes" | Sidebar |
| `campaign.surfaces.mindmap.label` | "Mapa Mental" | "Mind Map" | Sidebar |
| `campaign.surfaces.soundtrack.label` | "Trilha" | "Soundtrack" | Sidebar (ex-"Soundboard") |
| `campaign.surfaces.combat.label` | "Combate" | "Combat" | Sidebar (Rodar) |
| `campaign.surfaces.party.label` | "Party" | "Party" | Sidebar (Rodar) — **nunca "Companheiros"**, per F-15 |
| `campaign.surfaces.scene.label` | "Cena" | "Scene" | Sidebar (Rodar) — NPCs + locais em cena |
| `campaign.surfaces.scene.sub_npcs` | "NPCs em cena" | "NPCs on scene" | Subsection |
| `campaign.surfaces.scene.sub_locations` | "Onde estamos" | "Where we are" | Subsection |
| `campaign.surfaces.active_quest.label` | "Quest ativa" | "Active quest" | Sidebar (Rodar) |
| `campaign.surfaces.quick_add.label` | "Adicionar" | "Add" | Sidebar (Rodar) ➕ |
| `campaign.surfaces.last_session.label` | "Última Sessão" | "Last Session" | Sidebar (Recap) |
| `campaign.surfaces.recap_editor.label` | "Recap" | "Recap" | Sidebar (Recap) — editor |
| `campaign.surfaces.timeline.label` | "Linha do Tempo" | "Timeline" | Sidebar (Recap) |
| `campaign.surfaces.numbers.label` | "Números" | "Numbers" | Sidebar (Recap) — era "Stats" |
| `campaign.surfaces.dm_notes.label` | "Notas do Mestre" | "Mestre Notes" | Sidebar (Recap), `visibility=dm-only` |

### 2.4 `campaign.prep.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `campaign.prep.next_session.heading` | "Próxima Sessão" | "Next Session" | H1 do card |
| `campaign.prep.next_session.session_hash` | "#{n}" | "#{n}" | Numero da sessão |
| `campaign.prep.next_session.edit_name` | "Renomear sessão" | "Rename session" | Botão ✎ |
| `campaign.prep.next_session.name_placeholder` | "Dê um nome a essa sessão..." | "Give this session a name..." | Input inline |
| `campaign.prep.next_session.date_label` | "Quando" | "When" | Label do datepicker |
| `campaign.prep.next_session.goal_label` | "Objetivo da sessão" | "Session goal" | Label |
| `campaign.prep.next_session.goal_placeholder` | "Ex: grupo persegue o dragão fugido" | "E.g. party hunts the escaped dragon" | Placeholder |
| `campaign.prep.checklist.prepared` | "Preparado" | "Ready" | Header coluna |
| `campaign.prep.checklist.pending` | "Pendente" | "Pending" | Header coluna |
| `campaign.prep.checklist.add_item` | "+ Adicionar item" | "+ Add item" | Dropdown ▼ trigger |
| `campaign.prep.checklist.add_encounter` | "Encontro / combate" | "Encounter / combat" | Item do dropdown |
| `campaign.prep.checklist.add_npc` | "NPC" | "NPC" | Item |
| `campaign.prep.checklist.add_location` | "Local" | "Location" | Item |
| `campaign.prep.checklist.add_quest` | "Quest" | "Quest" | Item |
| `campaign.prep.checklist.add_note` | "Nota" | "Note" | Item |
| `campaign.prep.checklist.add_handout` | "Handout" | "Handout" | Item |
| `campaign.prep.checklist.mark_done` | "Marcar como preparado" | "Mark as ready" | aria no checkbox |
| `campaign.prep.checklist.mark_undone` | "Marcar como pendente" | "Mark as pending" | aria |
| `campaign.prep.recent_activity.heading` | "Atividade recente" | "Recent activity" | Seção scroll |
| `campaign.prep.recent_activity.edited_ago` | "{what} editado {when}" | "{what} edited {when}" | Linha de log |
| `campaign.prep.session_needs_name_nudge` | "Quer dar um nome a essa sessão?" | "Want to name this session?" | Nudge (F-09, 3 dias pós-sessão) |
| `campaign.prep.session_needs_name_dismiss` | "Depois" | "Later" | Dismiss do nudge |

### 2.5 `campaign.run.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `campaign.run.header_encounter` | "Combate: {name}" | "Combat: {name}" | Header W2 |
| `campaign.run.header_round` | "Round {n}" | "Round {n}" | Header |
| `campaign.run.header_current_turn` | "Vez: {name}" | "Turn: {name}" | Header subtítulo |
| `campaign.run.pause_combat` | "Pausar" | "Pause" | Botão header |
| `campaign.run.resume_combat` | "Retomar" | "Resume" | Botão após pause |
| `campaign.run.exit_combat` | "Sair" | "Exit" | Botão header (X mobile) |
| `campaign.run.next_turn` | "Próximo turno" | "Next turn" | CTA primária W2/W6 |
| `campaign.run.next_turn_aria` | "Avançar para o próximo turno — atalho: espaço" | "Advance to next turn — shortcut: space" | aria-label |
| `campaign.run.initiative.heading` | "Iniciativa" | "Initiative" | H2 do painel |
| `campaign.run.initiative.reroll` | "Rolar iniciativa novamente" | "Reroll initiative" | Botão |
| `campaign.run.initiative.turn_marker` | "Vez atual" | "Current turn" | aria no ▶ |
| `campaign.run.panel.scene` | "Ver cena" | "View scene" | Collapsible header |
| `campaign.run.panel.actions` | "Ações do turno" | "Turn actions" | Collapsible header |
| `campaign.run.panel.chat_roll` | "Chat / rolagens" | "Chat / rolls" | Collapsible (auth-only) |
| `campaign.run.panel.quick_note` | "Nota rápida" | "Quick note" | Collapsible |
| `campaign.run.expand_hint` | "💡 Expand só o que você precisa agora" | "💡 Expand only what you need right now" | Hint visual |
| `campaign.run.add_monster` | "+ Adicionar monstro" | "+ Add monster" | Botão |
| `campaign.run.add_pc` | "+ Adicionar PC" | "+ Add PC" | Botão |
| `campaign.run.add_monster_search_placeholder` | "Buscar monstro no compêndio..." | "Search monster in compendium..." | Input do modal |
| `campaign.run.scene.npcs_heading` | "NPCs em cena" | "NPCs on scene" | H3 |
| `campaign.run.scene.mood_label` | "Humor" | "Mood" | Label |
| `campaign.run.scene.can_flee` | "Pode fugir no round {n}" | "Can flee on round {n}" | Info |
| `campaign.run.soundboard_chip.label` | "Trilha" | "Soundtrack" | Chip compacto no header |
| `campaign.run.soundboard_chip.current` | "{mood}" | "{mood}" | Ex: "Taverna tranquila" |
| `campaign.run.soundboard_chip.play` | "Tocar" | "Play" | aria |
| `campaign.run.soundboard_chip.pause` | "Pausar" | "Pause" | aria |
| `campaign.run.quick_add.heading` | "Adicionar rápido" | "Quick add" | Collapsible |
| `campaign.run.handout_drop.title` | "Mostrar pros jogadores" | "Show to players" | Zona de drop |
| `campaign.run.handout_drop.hint` | "Arraste imagem ou link aqui" | "Drop image or link here" | Hint |

### 2.6 `campaign.recap.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `campaign.recap.header` | "Recap — Sessão {n} (terminou há {when})" | "Recap — Session {n} (ended {when} ago)" | Header W8 |
| `campaign.recap.editor.heading` | "Escreva o que aconteceu (o player vai ler)" | "Write what happened (players will read)" | Descrição do editor |
| `campaign.recap.editor.placeholder` | "# Título da sessão\n\nO grupo @personagem foi até @local e encontrou..." | "# Session title\n\nThe party @character went to @location and met..." | Placeholder |
| `campaign.recap.editor.backlink_hint` | "💡 Digite @ pra linkar NPC, local ou quest (ou use [[nome]])" | "💡 Type @ to link NPC, location or quest (or use [[name]])" | Hint |
| `campaign.recap.editor.autosaved` | "Salvo automaticamente" | "Auto-saved" | Indicator |
| `campaign.recap.tags.heading` | "Tags" | "Tags" | Label |
| `campaign.recap.tags.placeholder` | "#masmorra #dragão" | "#dungeon #dragon" | Placeholder |
| `campaign.recap.tags.add` | "+ Tag" | "+ Tag" | Botão |
| `campaign.recap.numbers.heading` | "Números discretos" | "Discreet numbers" | Seção |
| `campaign.recap.numbers.duration` | "{h}h {m}min" | "{h}h {m}min" | Stat |
| `campaign.recap.numbers.combats` | "{count, plural, one {# combate} other {# combates}}" | "{count, plural, one {# combat} other {# combats}}" | Stat |
| `campaign.recap.numbers.rolls` | "{count} rolagens" | "{count} rolls" | Stat |
| `campaign.recap.numbers.locked_until_3` | "Estatísticas aparecem depois da 3ª sessão rodada" | "Stats appear after your 3rd session played" | Lock (F-10) |
| `campaign.recap.publish.primary` | "Publicar pros jogadores" | "Publish to players" | CTA |
| `campaign.recap.publish.draft` | "Salvar rascunho" | "Save draft" | CTA secundária |
| `campaign.recap.publish.confirm_title` | "Publicar este recap?" | "Publish this recap?" | Modal |
| `campaign.recap.publish.confirm_body` | "Os jogadores receberão notificação e poderão ler a partir de agora." | "Players will be notified and can read it from now on." | Body |
| `campaign.recap.publish.confirm_cta` | "Publicar" | "Publish" | CTA |
| `campaign.recap.publish.success_toast` | "Recap publicado — {count, plural, one {# jogador} other {# jogadores}} notificado{count, plural, one {} other {s}}" | "Recap published — {count} player{count, plural, one {} other {s}} notified" | Toast |
| `campaign.recap.timeline.heading` | "Linha do Tempo" | "Timeline" | H2 |
| `campaign.recap.timeline.empty` | "Eventos da sessão aparecem aqui conforme você joga." | "Session events appear here as you play." | Empty |
| `campaign.recap.timeline.event_combat_start` | "Combate iniciado: {name}" | "Combat started: {name}" | Evento |
| `campaign.recap.timeline.event_combat_end` | "Combate finalizado: {result}" | "Combat ended: {result}" | Evento |
| `campaign.recap.timeline.event_quest_changed` | "Quest {name} — {from} → {to}" | "Quest {name} — {from} → {to}" | Evento |
| `campaign.recap.timeline.event_npc_added` | "NPC {name} adicionado" | "NPC {name} added" | Evento |
| `campaign.recap.timeline.event_note_written` | "Nota: {title}" | "Note: {title}" | Evento |
| `campaign.recap.dm_notes.heading` | "Notas do Mestre (privadas)" | "Mestre Notes (private)" | H2 |
| `campaign.recap.dm_notes.badge` | "🔒 Só mestre" | "🔒 Apenas Mestre" | Badge |
| `campaign.recap.dm_notes.placeholder` | "Notas pessoais — jogadores nunca veem." | "Personal notes — players never see." | Placeholder |

### 2.7 `player.journey.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `player.journey.mode_label` | "Minha Jornada" | "My Journey" | Label da mode |
| `player.journey.mode_description` | "Ficha, última sessão, próxima sessão e quests." | "Sheet, last session, next session and quests." | Tooltip |
| `player.journey.combat_banner.title` | "O mestre iniciou o combate" | "The Mestre started combat" | Banner W4 |
| `player.journey.combat_banner.cta` | "Entrar no combate" | "Join combat" | CTA |
| `player.journey.my_character.heading` | "Meu personagem" | "My character" | H2 |
| `player.journey.my_character.open_sheet` | "Abrir ficha completa" | "Open full sheet" | CTA |
| `player.journey.my_character.incomplete_label` | "Ficha incompleta" | "Sheet incomplete" | Badge |
| `player.journey.my_character.complete_sheet_cta` | "Completar ficha" | "Complete sheet" | CTA (F-14) |
| `player.journey.last_session.heading` | "Última sessão" | "Last session" | H2 |
| `player.journey.last_session.when` | "{days, plural, =0 {hoje} =1 {ontem} other {há # dias}}" | "{days, plural, =0 {today} =1 {yesterday} other {# days ago}}" | Metadata |
| `player.journey.last_session.read_recap` | "Ler recap" | "Read recap" | CTA |
| `player.journey.last_session.empty` | "Nenhum recap publicado ainda." | "No recap published yet." | Empty |
| `player.journey.next_session.heading` | "Próxima sessão" | "Next session" | H2 |
| `player.journey.next_session.remember` | "Trazer ficha impressa" | "Bring printed sheet" | Nota auto |
| `player.journey.next_session.empty` | "O mestre ainda não marcou a próxima sessão." | "Mestre hasn't scheduled the next session yet." | Empty |
| `player.journey.quests.heading` | "Quests ativas" | "Active quests" | H2 |
| `player.journey.quests.count` | "({count})" | "({count})" | Contador |
| `player.journey.my_notes.heading` | "Minhas notas" | "My notes" | H2 |
| `player.journey.my_notes.new` | "+ Nova nota" | "+ New note" | CTA |
| `player.journey.my_notes.anon_lock` | "Notas privadas precisam de conta — crie grátis pra começar" | "Private notes need an account — create one free to start" | Copy anon (decisão 17) |
| `player.journey.my_notes.anon_cta` | "Criar conta" | "Create account" | CTA |
| `player.journey.party.heading` | "Party" | "Party" | H2 (F-15: nunca "Companheiros") |
| `player.journey.party.you_badge` | "Você" | "You" | Badge do próprio player |
| `player.journey.party.solo_copy` | "Você está sozinho por enquanto. O mestre pode convidar mais jogadores em Preparar > Party." | "You are alone for now. The Mestre can invite more players in Prep > Party." | Solo state (F-15) |
| `player.journey.party.incomplete_warning` | "{count, plural, one {# ficha incompleta} other {# fichas incompletas}} — [Pedir pros outros jogadores]" | "{count, plural, one {# incomplete sheet} other {# incomplete sheets}} — [Ask other players]" | Warning + CTA Mestre |
| `player.journey.anon_footer.copy` | "Crie uma conta pra salvar suas notas e histórico" | "Create an account to save your notes and history" | Footer persistente |
| `player.journey.anon_footer.cta` | "Criar conta" | "Create account" | CTA |

### 2.8 `player.watch.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `player.watch.mode_label` | "Assistindo" | "Watching" | Label da mode |
| `player.watch.header` | "Combate · Round {n}" | "Combat · Round {n}" | Header W7 |
| `player.watch.your_turn_in` | "Sua vez em {n, plural, one {# turno} other {# turnos}}" | "Your turn in {n, plural, one {# turn} other {# turns}}" | Indicator |
| `player.watch.your_turn_now` | "É a sua vez!" | "Your turn!" | Ativo |
| `player.watch.current_turn_label` | "Turno atual" | "Current turn" | Label |
| `player.watch.current_turn_ally_suffix` | "(aliado)" | "(ally)" | Sufixo |
| `player.watch.current_turn_enemy_suffix` | "(inimigo)" | "(enemy)" | Sufixo |
| `player.watch.you_marker` | "★ Você" | "★ You" | Marker na lista |
| `player.watch.initiative_heading` | "Iniciativa" | "Initiative" | H2 |
| `player.watch.open_sheet` | "Minha ficha" | "My sheet" | Botão |
| `player.watch.take_note` | "Anotar algo" | "Take a note" | Botão |
| `player.watch.roll_dice` | "Rolar dados" | "Roll dice" | Botão (auth-only) |
| `player.watch.chat_placeholder` | "Digitar mensagem..." | "Type a message..." | Input (auth-only) |
| `player.watch.chat_anon_lock` | "Chat disponível só pra contas" | "Chat available only for accounts" | Lock anon |
| `player.watch.handout_toast` | "O mestre compartilhou: {title}" | "The Mestre shared: {title}" | Toast (killer 10.4) |
| `player.watch.handout_view` | "Ver" | "View" | Botão toast |

### 2.9 `empty_states.*` (CRITICAL — role-conditional, fix F-05)

> Convenção: `{surface}.{role}` onde role ∈ { `dm`, `player_auth`, `player_anon` }. Copy varia: Mestre convida a criar; player espera o Mestre.

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `empty_states.quests.dm.title` | "Nenhuma quest ainda" | "No quests yet" | Quest surface Mestre |
| `empty_states.quests.dm.body` | "Crie a primeira quest da campanha" | "Create the first quest of the campaign" | Mestre |
| `empty_states.quests.dm.cta` | "+ Nova quest" | "+ New quest" | Mestre |
| `empty_states.quests.player_auth.title` | "Sem quests ativas" | "No active quests" | Player auth |
| `empty_states.quests.player_auth.body` | "Seu mestre ainda não criou quests — ou nenhuma está visível pra você." | "Your Mestre hasn't created quests yet — or none are visible to you." | Player (F-05) |
| `empty_states.quests.player_anon.title` | "Sem quests ativas" | "No active quests" | Anon |
| `empty_states.quests.player_anon.body` | "Seu mestre ainda não compartilhou quests." | "Your Mestre hasn't shared quests yet." | Anon |
| `empty_states.npcs.dm.title` | "Nenhum NPC" | "No NPCs" | Mestre |
| `empty_states.npcs.dm.body` | "Crie NPCs pra popular o mundo e linkeá-los nas sessões." | "Create NPCs to populate the world and link them in sessions." | Mestre |
| `empty_states.npcs.dm.cta` | "+ Novo NPC" | "+ New NPC" | Mestre |
| `empty_states.npcs.player_auth.title` | "Nenhum NPC conhecido" | "No known NPCs" | Player |
| `empty_states.npcs.player_auth.body` | "Você vai ver NPCs conforme o mestre os compartilhar." | "You'll see NPCs as the Mestre shares them." | Player |
| `empty_states.locations.dm.title` | "Nenhum local" | "No locations" | Mestre |
| `empty_states.locations.dm.body` | "Mapeie os lugares importantes da campanha." | "Map the important places of the campaign." | Mestre |
| `empty_states.locations.dm.cta` | "+ Novo local" | "+ New location" | Mestre |
| `empty_states.locations.player_auth.title` | "Nenhum local revelado" | "No revealed locations" | Player |
| `empty_states.locations.player_auth.body` | "O mestre revela lugares conforme vocês os visitam." | "The Mestre reveals places as you visit them." | Player |
| `empty_states.factions.dm.title` | "Nenhuma facção" | "No factions" | Mestre |
| `empty_states.factions.dm.body` | "Crie facções — grupos, cultos, guildas — e vincule NPCs a elas." | "Create factions — groups, cults, guilds — and link NPCs to them." | Mestre |
| `empty_states.factions.dm.cta` | "+ Nova facção" | "+ New faction" | Mestre |
| `empty_states.factions.player_auth.title` | "Nenhuma facção conhecida" | "No known factions" | Player |
| `empty_states.factions.player_auth.body` | "Você verá facções conforme o mestre as revelar." | "You'll see factions as the Mestre reveals them." | Player |
| `empty_states.notes.dm.title` | "Nenhuma nota" | "No notes" | Mestre |
| `empty_states.notes.dm.body` | "Anote o que precisa lembrar — público ou só pra você." | "Jot down what you need to remember — public or private." | Mestre |
| `empty_states.notes.dm.cta` | "+ Nova nota" | "+ New note" | Mestre |
| `empty_states.notes.player_auth.title` | "Sem notas" | "No notes" | Player |
| `empty_states.notes.player_auth.body` | "Comece anotando dicas e pistas." | "Start jotting down clues and hints." | Player |
| `empty_states.notes.player_auth.cta` | "+ Nova nota" | "+ New note" | Player |
| `empty_states.notes.player_anon.title` | "Notas precisam de conta" | "Notes need an account" | Anon |
| `empty_states.notes.player_anon.body` | "Crie uma conta grátis pra salvar suas anotações da campanha." | "Create a free account to save your campaign notes." | Anon |
| `empty_states.notes.player_anon.cta` | "Criar conta" | "Create account" | Anon |
| `empty_states.mindmap.dm.title` | "Mapa vazio" | "Empty map" | Mestre |
| `empty_states.mindmap.dm.body` | "Adicione NPCs, locais e quests — as conexões aparecem automaticamente." | "Add NPCs, locations and quests — connections appear automatically." | Mestre |
| `empty_states.mindmap.player_auth.title` | "Mapa ainda vazio" | "Map still empty" | Player |
| `empty_states.mindmap.player_auth.body` | "O mestre cria o mapa e escolhe o que é público." | "The Mestre builds the map and chooses what's public." | Player |
| `empty_states.soundtrack.dm.title` | "Sem playlists" | "No playlists" | Mestre |
| `empty_states.soundtrack.dm.body` | "Crie playlists por mood — taverna, combate, tensão — e troque com 1 clique no Rodar." | "Create playlists by mood — tavern, combat, tension — and switch with one click in Run." | Mestre |
| `empty_states.soundtrack.dm.cta` | "+ Nova playlist" | "+ New playlist" | Mestre |
| `empty_states.next_session.dm.title` | "Nenhuma sessão planejada" | "No session planned" | Mestre |
| `empty_states.next_session.dm.body` | "Marque data, dê um nome e comece a preparar." | "Set a date, give it a name, start prepping." | Mestre |
| `empty_states.next_session.dm.cta` | "Planejar sessão" | "Plan session" | Mestre |
| `empty_states.last_session.dm.title` | "Nenhuma sessão jogada ainda" | "No session played yet" | Mestre |
| `empty_states.last_session.dm.body` | "Rode uma sessão e volte aqui pra escrever o recap." | "Run a session and come back to write the recap." | Mestre |
| `empty_states.last_session.player_auth.title` | "Nenhuma sessão registrada" | "No session recorded" | Player |
| `empty_states.last_session.player_auth.body` | "O mestre publica o recap depois que vocês jogam." | "The Mestre publishes the recap after you play." | Player |
| `empty_states.recap_editor.dm.title` | "Sem rascunho" | "No draft" | Mestre |
| `empty_states.recap_editor.dm.body` | "Escreva o recap da última sessão jogada." | "Write the recap of the last session played." | Mestre |
| `empty_states.combat.dm.title` | "Nenhum combate ativo" | "No active combat" | Mestre em Rodar sem combate |
| `empty_states.combat.dm.body` | "Inicie um combate pra ver iniciativa e HP aqui." | "Start combat to see initiative and HP here." | Mestre |
| `empty_states.combat.dm.cta` | "Iniciar combate" | "Start combat" | Mestre |
| `empty_states.combat.player_auth.title` | "Nenhum combate rolando" | "No combat running" | Player |
| `empty_states.combat.player_auth.body` | "Quando o mestre iniciar, você entra automaticamente." | "When the Mestre starts, you'll join automatically." | Player |
| `empty_states.party.dm.title` | "Nenhum jogador ainda" | "No players yet" | Mestre |
| `empty_states.party.dm.body` | "Convide jogadores por link ou email — até 6 por campanha." | "Invite players by link or email — up to 6 per campaign." | Mestre |
| `empty_states.party.dm.cta` | "Convidar jogadores" | "Invite players" | Mestre |
| `empty_states.timeline.dm.title` | "Linha do tempo vazia" | "Empty timeline" | Mestre |
| `empty_states.timeline.dm.body` | "Eventos aparecem aqui conforme você joga (combates, quests, NPCs)." | "Events appear here as you play (combats, quests, NPCs)." | Mestre |
| `empty_states.numbers.dm.locked` | "Estatísticas aparecem depois da 3ª sessão rodada" | "Stats appear after your 3rd session played" | Mestre (F-10) |
| `empty_states.dm_notes.dm.title` | "Sem notas privadas" | "No private notes" | Mestre |
| `empty_states.dm_notes.dm.body` | "Notas do mestre nunca aparecem pros jogadores." | "Mestre notes never appear to players." | Mestre |

### 2.10 `actions.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `actions.save` | "Salvar" | "Save" | Botão |
| `actions.save_draft` | "Salvar rascunho" | "Save draft" | Botão |
| `actions.cancel` | "Cancelar" | "Cancel" | Botão |
| `actions.delete` | "Excluir" | "Delete" | Botão |
| `actions.remove` | "Remover" | "Remove" | Botão |
| `actions.edit` | "Editar" | "Edit" | Botão |
| `actions.add` | "Adicionar" | "Add" | Botão |
| `actions.create` | "Criar" | "Create" | Botão |
| `actions.publish` | "Publicar" | "Publish" | Botão |
| `actions.unpublish` | "Despublicar" | "Unpublish" | Botão |
| `actions.duplicate` | "Duplicar" | "Duplicate" | Botão |
| `actions.archive` | "Arquivar" | "Archive" | Botão |
| `actions.unarchive` | "Desarquivar" | "Unarchive" | Botão |
| `actions.share` | "Compartilhar" | "Share" | Botão |
| `actions.copy_link` | "Copiar link" | "Copy link" | Botão |
| `actions.link_copied` | "Link copiado" | "Link copied" | Toast |
| `actions.invite` | "Convidar" | "Invite" | Botão |
| `actions.dismiss` | "Dispensar" | "Dismiss" | Botão |
| `actions.skip` | "Pular" | "Skip" | Botão |
| `actions.retry` | "Tentar novamente" | "Retry" | Botão |
| `actions.refresh` | "Atualizar" | "Refresh" | Botão |
| `actions.close` | "Fechar" | "Close" | Botão |
| `actions.open` | "Abrir" | "Open" | Botão |
| `actions.expand` | "Expandir" | "Expand" | Botão |
| `actions.collapse` | "Recolher" | "Collapse" | Botão |
| `actions.back` | "Voltar" | "Back" | Botão |
| `actions.next_step` | "Próximo passo" | "Next step" | Botão |
| `actions.finish` | "Concluir" | "Finish" | Botão |
| `actions.undo` | "Desfazer" | "Undo" | Botão |
| `actions.redo` | "Refazer" | "Redo" | Botão |

### 2.11 `tour.*` (W0b onboarding)

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `tour.welcome_new_campaign` | "🎉 Campanha criada! Vamos preparar a primeira sessão?" | "🎉 Campaign created! Let's prep the first session?" | Banner W0b |
| `tour.step1.title` | "Passo 1 — Convide seus jogadores" | "Step 1 — Invite your players" | Bloco |
| `tour.step1.body` | "Convide por link ou email, ou pule e faça depois." | "Invite by link or email, or skip and do it later." | Body |
| `tour.step1.cta_link` | "Convidar por link" | "Invite by link" | CTA |
| `tour.step1.cta_email` | "Convidar por email" | "Invite by email" | CTA |
| `tour.step2.title` | "Passo 2 — Marque a primeira sessão" | "Step 2 — Schedule the first session" | Bloco |
| `tour.step2.cta_when` | "Quando?" | "When?" | CTA datepicker |
| `tour.step2.cta_name` | "Dar nome" | "Name it" | CTA |
| `tour.step2.save` | "Salvar" | "Save" | CTA |
| `tour.step3.title` | "Passo 3 — Comece a preencher o mundo" | "Step 3 — Start populating the world" | Bloco |
| `tour.step3.body` | "💡 Dica: você pode usar templates do compêndio" | "💡 Tip: you can use compendium templates" | Hint |
| `tour.start_tour_cta` | "Tour do modo Preparar (30s)" | "Prep mode tour (30s)" | Link |
| `tour.skip` | "Pular" | "Skip" | Botão |
| `tour.replay_settings` | "Refazer tour" | "Replay tour" | Item em Configurações |
| `tour.welcome_empty_dashboard` | "Bem-vindo, {name}!" | "Welcome, {name}!" | W0a header |
| `tour.no_campaigns_body` | "Você ainda não tem campanhas." | "You don't have any campaigns yet." | W0a |
| `tour.create_campaign_card_title` | "Criar nova campanha" | "Create a new campaign" | Card W0a |
| `tour.create_campaign_card_body` | "Como Mestre: crie e convide até 6 jogadores" | "As a Mestre: create and invite up to 6 players" | Card body |
| `tour.create_campaign_card_cta` | "Começar" | "Get started" | CTA |
| `tour.or_divider` | "ou" | "or" | Separador |
| `tour.paste_invite_link` | "Tem um convite do Mestre? Cole o link:" | "Got an invite from a Mestre? Paste the link:" | Input W0a |
| `tour.paste_invite_cta` | "Entrar" | "Join" | CTA |
| `tour.watch_demo` | "Ver como funciona (tour 2min)" | "See how it works (2min tour)" | Link W0a |

### 2.12 `errors.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `errors.load_failed` | "Não conseguimos carregar. Tente novamente." | "Couldn't load. Please retry." | Surface-level |
| `errors.load_failed_retry` | "Tentar novamente" | "Retry" | Botão |
| `errors.save_failed` | "Falha ao salvar. Suas alterações ficaram aqui." | "Save failed. Your changes are still here." | Form |
| `errors.network_offline` | "Sem conexão. Reconectando..." | "Offline. Reconnecting..." | Banner |
| `errors.network_reconnected` | "Reconectado." | "Reconnected." | Toast |
| `errors.permission_denied` | "Você não tem permissão pra isso." | "You don't have permission for this." | Banner |
| `errors.permission_player_edit_other` | "Jogadores só editam a própria ficha." | "Players can only edit their own sheet." | Quando player tenta editar outro |
| `errors.permission_hidden_from_player` | "Esse conteúdo não é visível pra você." | "This content isn't visible to you." | Block |
| `errors.campaign_not_found` | "Campanha não encontrada." | "Campaign not found." | 404 |
| `errors.campaign_deleted_body` | "O mestre deletou essa campanha." | "The Mestre deleted this campaign." | 410 |
| `errors.request_timeout` | "Demorou demais. Verifique a conexão." | "Took too long. Check your connection." | Timeout 30s |
| `errors.sync_conflict` | "Outra pessoa editou isso enquanto você editava. Suas alterações foram mantidas — revise antes de salvar." | "Someone else edited this while you did. Your changes are kept — review before saving." | Last-write-wins warning |

### 2.13 `badges.*`

> HP tiers ficam **em inglês nos dois locales** per memory `hp_tier_labels`.

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `badges.hp_full_short` | "FULL" | "FULL" | HP tier |
| `badges.hp_light_short` | "LIGHT" | "LIGHT" | HP tier |
| `badges.hp_moderate_short` | "MODERATE" | "MODERATE" | HP tier |
| `badges.hp_heavy_short` | "HEAVY" | "HEAVY" | HP tier |
| `badges.hp_critical_short` | "CRITICAL" | "CRITICAL" | HP tier |
| `badges.hp_down_short` | "DOWN" | "DOWN" | HP tier |
| `badges.hp_full_tooltip` | "Vida cheia" | "Full health" | Tooltip (tradução livre ok) |
| `badges.hp_light_tooltip` | "Dano leve" | "Lightly wounded" | Tooltip |
| `badges.hp_moderate_tooltip` | "Moderadamente ferido" | "Moderately wounded" | Tooltip |
| `badges.hp_heavy_tooltip` | "Gravemente ferido" | "Heavily wounded" | Tooltip |
| `badges.hp_critical_tooltip` | "Crítico — 1 hit pode derrubar" | "Critical — one hit may drop" | Tooltip |
| `badges.srd_source` | "SRD 5.1" | "SRD 5.1" | Badge de origem de monstro (F-21) |
| `badges.srd_source_aria` | "Conteúdo do System Reference Document 5.1 sob CC-BY-4.0" | "System Reference Document 5.1 content under CC-BY-4.0" | aria do tooltip |
| `badges.dm_only` | "🔒 Só mestre" | "🔒 Apenas Mestre" | Badge de visibility |
| `badges.hidden` | "Oculto dos jogadores" | "Hidden from players" | Badge |
| `badges.shared` | "Compartilhado" | "Shared" | Badge |
| `badges.new` | "Novo" | "New" | Badge |
| `badges.draft` | "Rascunho" | "Draft" | Badge |
| `badges.published` | "Publicado" | "Published" | Badge |
| `badges.archived` | "Arquivado" | "Archived" | Badge |
| `badges.paused` | "Em pausa" | "Paused" | Badge |
| `badges.incomplete_sheet` | "Ficha incompleta" | "Sheet incomplete" | Badge (F-14) |
| `badges.you` | "Você" | "You" | Badge no self player (F-15) |
| `badges.turn_marker` | "Vez" | "Turn" | Indicator |
| `badges.new_count` | "{n} novas" | "{n} new" | Contador |

### 2.14 `a11y.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `a11y.skip_to_content` | "Pular para conteúdo principal" | "Skip to main content" | Skip link |
| `a11y.skip_to_nav` | "Pular para navegação" | "Skip to navigation" | Skip link 2 |
| `a11y.live_mode_switched` | "Modo {mode} ativo" | "{mode} mode active" | aria-live polite |
| `a11y.live_combat_started` | "Combate iniciado" | "Combat started" | aria-live assertive |
| `a11y.live_combat_ended` | "Combate finalizado" | "Combat ended" | aria-live assertive |
| `a11y.live_turn_changed` | "Vez de {name}" | "{name}'s turn" | aria-live polite |
| `a11y.live_your_turn` | "É a sua vez!" | "Your turn!" | aria-live assertive |
| `a11y.live_hp_changed` | "{name}: {current} de {max} pontos de vida" | "{name}: {current} of {max} hit points" | aria-live polite |
| `a11y.live_toast` | "{message}" | "{message}" | aria-live polite wrapper |
| `a11y.loading_surface` | "Carregando {surface}" | "Loading {surface}" | Skeleton aria |
| `a11y.error_occurred` | "Ocorreu um erro" | "An error occurred" | aria-live assertive |
| `a11y.shortcut_help_heading` | "Atalhos de teclado" | "Keyboard shortcuts" | H2 modal |
| `a11y.shortcut_help_aria` | "Lista de atalhos de teclado" | "Keyboard shortcut list" | aria |
| `a11y.modal_close` | "Fechar modal" | "Close modal" | aria em X |
| `a11y.sortable_drag_handle` | "Arrastar pra reordenar" | "Drag to reorder" | aria |
| `a11y.expand_section` | "Expandir seção {name}" | "Expand section {name}" | aria |
| `a11y.collapse_section` | "Recolher seção {name}" | "Collapse section {name}" | aria |

### 2.15 `toasts.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `toasts.saved` | "Salvo" | "Saved" | Efêmero |
| `toasts.saved_entity` | "{entity} salvo" | "{entity} saved" | Contextual |
| `toasts.published` | "Publicado" | "Published" | Efêmero |
| `toasts.deleted` | "Excluído" | "Deleted" | Efêmero |
| `toasts.undo` | "Desfazer" | "Undo" | Ação no toast |
| `toasts.invite_sent` | "Convite enviado para {target}" | "Invite sent to {target}" | Efêmero |
| `toasts.handout_shared` | "Handout compartilhado com {count, plural, one {# jogador} other {# jogadores}}" | "Handout shared with {count, plural, one {# player} other {# players}}" | Efêmero |
| `toasts.combat_paused` | "Combate pausado" | "Combat paused" | Efêmero |
| `toasts.combat_resumed` | "Combate retomado" | "Combat resumed" | Efêmero |
| `toasts.sheet_reminder_sent` | "Lembrete enviado pros jogadores" | "Reminder sent to players" | F-14 |
| `toasts.mode_locked_for_combat` | "Combate ativo — edição pausada" | "Combat active — editing paused" | Quando clica locked section |
| `toasts.backlink_created` | "Link criado: {target}" | "Link created: {target}" | Killer 10.1 |
| `toasts.tag_applied` | "#{tag} adicionada" | "#{tag} added" | Killer 10.2 |
| `toasts.session_renamed` | "Sessão renomeada" | "Session renamed" | F-09 |
| `toasts.player_joined` | "{name} entrou na sessão" | "{name} joined the session" | Efêmero |

### 2.16 `confirms.*`

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `confirms.delete_npc.title` | "Excluir NPC {name}?" | "Delete NPC {name}?" | Modal destrutivo |
| `confirms.delete_npc.body` | "Menções em recaps e notas viram texto solto." | "Mentions in recaps and notes become plain text." | Body |
| `confirms.delete_npc.cta` | "Excluir" | "Delete" | CTA |
| `confirms.delete_quest.title` | "Excluir quest {name}?" | "Delete quest {name}?" | Modal |
| `confirms.delete_quest.body` | "Jogadores que viam essa quest não verão mais." | "Players seeing this quest will no longer see it." | Body |
| `confirms.archive_campaign.title` | "Arquivar campanha?" | "Archive campaign?" | Modal |
| `confirms.archive_campaign.body` | "Dados ficam preservados read-only. Você pode desarquivar depois." | "Data stays read-only. You can unarchive later." | Body |
| `confirms.leave_campaign.title` | "Sair da campanha?" | "Leave campaign?" | Modal (player) |
| `confirms.leave_campaign.body` | "Você perderá acesso à ficha e ao histórico de sessões." | "You'll lose access to your sheet and session history." | Body |
| `confirms.end_combat.title` | "Encerrar combate?" | "End combat?" | Modal |
| `confirms.end_combat.body` | "Os jogadores voltam pra Minha Jornada. Você pode escrever o recap logo depois." | "Players return to My Journey. You can write the recap right after." | Body |
| `confirms.discard_recap.title` | "Descartar rascunho do recap?" | "Discard recap draft?" | Modal |
| `confirms.discard_recap.body` | "O texto não salvo será perdido." | "Unsaved text will be lost." | Body |

---

## Seção 3 — Regras de tradução

### 3.1 HP tier labels — **inglês nos dois locales**
Per memory `hp_tier_labels` (2026-04-XX, Dani confirmou):
- `FULL`, `LIGHT`, `MODERATE`, `HEAVY`, `CRITICAL`, `DOWN` sempre em EN.
- Tooltips longos (`hp_*_tooltip`) podem traduzir.

### 3.2 D&D jargon preservado em PT
| Termo | PT-BR | EN | Obs |
|---|---|---|---|
| AC | "CA" | "AC" | Classe de Armadura |
| HP | "HP" | "HP" | Não traduzir |
| XP | "XP" | "XP" | Não traduzir |
| Level | "Nv" | "Lv" | Abreviado |
| CR | "ND" | "CR" | Nível de Desafio |
| DC | "CD" | "DC" | Classe de Dificuldade |

### 3.3 Nomes dos modes — PT-BR travado (decisão 10)
- `Preparar` (nunca "Prep" em PT user-facing; "Prep" só em label compacto EN)
- `Rodar` (nunca "Run" em PT; "Mesa" em short mobile)
- `Recap` (igual nos 2 — neologismo aceito no Brasil)

### 3.4 Vocabulário banido na UI (decisão 5 / §6.2)
Nunca aparecer em PT nem em EN user-facing:
- "Mode switcher", "Surface", "Command palette", "Retro", "Shell", "Chrome", "JTBD"

Substitutos:
- "Mode switcher" → sem label (só 3 ícones Preparar/Rodar/Recap)
- "Surface" → "seção" só em docs internos
- "Command palette" → "Buscar rápida"
- "Retro" → "Recap" ou "Depois da Sessão"

### 3.5 Quest não traduz (per memory `feedback_linguagem_ubiqua`)
- `Quest` / `quests` mantidos em PT-BR e EN.

### 3.6 Rotas EN (decisão 16)
- `/app/campaigns/[id]/prep`
- `/app/campaigns/[id]/run`
- `/app/campaigns/[id]/recap`
- Labels UI em PT-BR; path em EN (SEO + bookmarks).

### 3.7 Party vs Companheiros (F-15)
- Surface chamada `Party` (EN) em ambos locales.
- `player.journey.party.you_badge` = "Você" / "You".
- Legado `campaign.companions` / `campaign.companions_empty` deprecia (ver §4).

### 3.8 Capitalização
- Títulos (H1/H2) em `Title Case` em EN, **primeira letra maiúscula apenas** em PT-BR (exceto nomes próprios).
- Labels de botão: `Title Case` em EN, `Primeira letra maiúscula` em PT-BR.
- Badges em CAPS só pros HP tiers.

### 3.9 ICU plurais
- Usar `plural` / `selectordinal` sempre que o valor depender de contagem. Exemplo: `{count, plural, one {# quest} other {# quests}}`.
- `zero` → `=0` (explícito, suportado).

---

## Seção 4 — Keys a REMOVER (deprecated)

Ao mergear o redesign v2 (flag `CAMPAIGN_HQ_V2` on), estas chaves ficam órfãs. Limpar após Fase D (cleanup da pill bar antiga):

| Chave legada | Motivo | Substituto |
|---|---|---|
| `campaign.companions` | F-15 rename | `campaign.surfaces.party.label` |
| `campaign.companions_empty` | F-15 rename | `player.journey.party.solo_copy` |
| `campaign.no_companions` | F-15 | `player.journey.party.solo_copy` |
| `campaign.section_encounters` | "Histórico" deprecia (decisão 15) | `campaign.surfaces.last_session.label` + `campaign.surfaces.timeline.label` |
| `campaign.combat_history` | idem | idem |
| `campaign.hub_card_history` | Redesign (pill bar sai) | `campaign.surfaces.timeline.label` |
| `campaign.hub_nav_overview` | Overview deprecia (virou Prep default) | — |
| `campaign.hub_card_*` (todo o grupo) | Pill bar removida na Fase D | `campaign.surfaces.*` |
| `campaign.hub_kpi_*` | Overview deprecia | Banner topbar `campaign.shell.session_badge_*` |
| `campaign.hub_onboard_*` | Substituído pelo W0b | `tour.*` |
| `campaign.hub_group_operational` | Grouping antigo | — |
| `campaign.hub_group_world` | idem | — |
| `campaign.hub_group_journal` | idem | — |
| `campaign.section_inventory` (se vira sub-item de Party) | Reorg | TBD |
| `campaign.encounters_empty` | Naming antigo | `empty_states.combat.dm.body` |
| `campaign.player_view_title` | Dual page deprecia | — |
| `campaign.hero_session_*` | Hero card antigo | `campaign.shell.session_badge_*` |
| `campaign.quick_action_*` | Quick actions antigo | `campaign.prep.checklist.add_*` |
| `campaignOnboarding.*` (bloco inteiro) | Substituído por `tour.*` | `tour.*` |

**Procedimento:**
1. Não remover antes da Fase D.
2. Manter 90 dias como alias pra evitar quebrar links cached.
3. Adicionar comentário `// deprecated 2026-04-22 — remove after Phase D` no JSON (via `__deprecated_*` keys parallel).

---

## Seção 5 — Chave crítica do bug F-02

**Bug:** `campaign.player_hq_button` aparece RAW na UI (visto em `CampaignPlayerViewServer.tsx:197`).
**Callsite:** `t("player_hq_button")` chamado dentro do namespace `campaign`, mas a chave não existe.

**Fix obrigatório na Fase A:** adicionar em **ambos** os locales.

```json
// messages/pt-BR.json — dentro do bloco "campaign": {
"player_hq_button": "Abrir meu painel"

// messages/en.json — dentro do bloco "campaign": {
"player_hq_button": "Open my dashboard"
```

**Valores propostos:**

| Chave | PT-BR | EN | Contexto |
|---|---|---|---|
| `campaign.player_hq_button` | "Abrir meu painel" | "Open my dashboard" | Card "Meu Personagem" na view do player — navega pra `/app/campaigns/[id]/journey` (ou rota equivalente pós-redesign) |
| `campaign.player_hq_button_aria` | "Abrir painel do jogador com ficha, quests e última sessão" | "Open player dashboard with sheet, quests and last session" | aria-label |

**Rationale da copy:**
- "Abrir meu painel" é curto, direto, mesma métrica de 3 palavras em EN.
- Evita "Meu HQ" (jargão interno não-user-facing — vocabulário banido §3.4).
- Evita "Minha Jornada" pra não colidir com o label de modo uma vez que o redesign aterrissar — `player_hq_button` é legado da pill bar antiga, vai sumir na Fase D.

**Validação:** após fix, `grep -r "player_hq_button"` deve achar 0 ocorrências na UI renderizada. Screenshot de regressão em `player-desktop-00-overview.png` mostra botão com texto "Abrir meu painel".
