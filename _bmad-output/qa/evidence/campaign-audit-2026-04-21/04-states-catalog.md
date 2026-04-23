# Campaign HQ — States Catalog (v1.0, 2026-04-22)

**Escopo:** matriz de estados (empty / loading / error / full) por surface × role × condição, com copy PT-BR final (não placeholder).

**Regras imutáveis aplicadas:**
- **Combat Parity** (CLAUDE.md): cada surface marca cobertura Guest / Anônimo / Auth
- **Resilient Reconnection** (CLAUDE.md): offline state universal (skeleton, nunca tela branca)
- **SRD Content Compliance** (CLAUDE.md): surfaces que referenciam SRD usam `getSrdMonsters()` com whitelist ativa
- **Copy em PT-BR user-facing** (CLAUDE.md): labels em português; code labels em inglês

**Convenção de testids:** `data-testid="hq-{surface}-{state}"` — `hq-npcs-empty`, `hq-npcs-loading`, etc.

**Convenção de CTAs:** `[Primary]` = botão gold sólido · `[Secondary]` = botão gold outline · `[Ghost]` = link-style

---

## Condições universais (aplicam a TODAS as surfaces)

Estas condições se sobrepõem ao estado da surface individual.

### Offline / Reconectando
- **Trigger:** `navigator.onLine === false` OU channel status error OU 3 heartbeats missed
- **Comportamento:** conteúdo atual permanece visível (não some); ao tentar qualquer ação mutativa, banner bottom aparece
- **Visual:** banner bottom 40px height, fundo amber/10%, border-top amber/40%, texto amber/90%
- **Copy:** "Reconectando..." + spinner gold; após 10s sem sucesso: "Sem conexão. Suas alterações serão salvas quando voltar."
- **Testid:** `hq-offline-banner`
- **Grace period:** 3000ms antes de mostrar banner (Resilient Rule)

### Campanha arquivada
- **Trigger:** `campaign.archived_at !== null`
- **Comportamento:** todas ações mutativas desabilitadas; read-only
- **Visual:** banner topo 48px, amber/15% background, ícone 📁
- **Copy:** "Esta campanha está arquivada — modo somente leitura · [Desarquivar] [Ver em Arquivos]"
- **CTAs:** `[Desarquivar]` só Mestre; `[Ver em Arquivos]` universal

### Role transition (player vira Mestre ou vice-versa)
- **Trigger:** `campaign.dm_id` changed OR user acquired Mestre role
- **Comportamento:** shell re-renderiza; `resolveMode()` roda; mode default correto (`preparar` vs `minha-jornada`)
- **Visual:** toast info 5s "Você agora é o Mestre desta campanha" (ou inverso)
- **Testid:** `hq-role-change-toast`

### Sem permissão (surface inacessível pro role)
- **Trigger:** tentativa de acesso direto via URL a surface que role não pode ver (ex: player tenta `/recap`)
- **Visual:** página central com ícone 🔒 + copy + CTA
- **Copy (player):** "Você não tem acesso a esta seção · [Pedir acesso ao Mestre]"
- **Copy (anônimo):** "Faça login para acessar · [Entrar com Google]"
- **Copy (Mestre tentando surface player):** "Esta seção é específica dos jogadores · [Voltar pra Preparar]"
- **Testid:** `hq-forbidden`

---

## Convenção: formato das tabelas

Cada surface tem:
1. **Meta:** modo, role, auth matrix, testid base
2. **Tabela 4 linhas:** empty / loading / error / full — colunas **estado · copy · visual · CTAs · testid**
3. **Notas:** regras especiais (fixes da findings, condições)

---

# PARTE A — Surfaces Mestre Preparar

## A.1 Próxima Sessão

**Meta:** mode=preparar · role=Mestre · auth=Auth-only · testid base=`hq-next-session`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Nenhuma sessão agendada. Quando marcar, aparece aqui." | Card hero 240px altura, ícone 📅 cinza, texto foreground/60% | `[+ Agendar sessão]` gold primary · `[Ver sessões passadas]` ghost | `hq-next-session-empty` |
| **loading** | — | Skeleton card hero (título 60%, 2 linhas texto, 1 row meta) | — | `hq-next-session-loading` |
| **error** | "Não conseguimos carregar a próxima sessão." | Card vermelho/10% background, border red/30%, ícone ⚠ | `[Tentar novamente]` primary | `hq-next-session-error` |
| **full** | `Sessão {N} — «{nome}»` · `📅 {dia_semana}, {DD/MMM} · {HH}h` · `🎯 {hook_one_liner}` | Card hero populated, avatares dos 5 jogadores, botão ✎ no hover | `[Iniciar combate agora]` primary · `[✎ Editar]` ghost | `hq-next-session-full` |

**Notas:**
- Nome default: `"Sessão {N} — {DD/MMM}"` (fix F-09)
- Se sessão é "hoje": badge gold "HOJE" topo do card
- Se sessão está há >7 dias sem ser rodada: badge amber "ATRASADA" + nudge em Recap

---

## A.2 Quests

**Meta:** mode=preparar · role=Mestre · auth=Auth-only · testid base=`hq-quests`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Crie a primeira quest da campanha — de caça ao dragão a busca por ingrediente secreto." | Ilustração compass 96px, texto centralizado max-w-md | `[+ Nova quest]` primary · `[Usar template do compêndio]` secondary | `hq-quests-empty` |
| **loading** | — | Skeleton list 3 rows (badge + título + descrição) | — | `hq-quests-loading` |
| **error** | "Falha ao carregar quests." | Row erro com retry inline | `[Tentar novamente]` primary | `hq-quests-error` |
| **full** | Título · status chip · tags · resumo 2 linhas | Lista com filter chips removíveis no topo | `[+ Nova]` secondary · chips `[× Ativas] [× Tag:dragão] [+ Adicionar filtro]` | `hq-quests-full` |

**Notas:**
- Sub-tabs antigas (Ativas/Disponíveis/etc) removidas — viram chips (F-11)
- Status chips cores: ativa (gold), disponível (blue/60%), concluída (green/50%), falhada (red/50%), cancelada (gray/50%)
- Click em row → slideover detalhes (padrão §7 interactions)

---

## A.3 NPCs

**Meta:** mode=preparar · role=Mestre · auth=Auth-only · testid base=`hq-npcs`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Ainda não há NPCs. Taberneiros, vilões, aliados — todos começam aqui." | Ilustração UserCircle 96px cinza | `[+ Novo NPC]` primary · `[Importar do SRD]` secondary | `hq-npcs-empty` |
| **loading** | — | Skeleton grid 6 cards (NpcCardSkeleton existente) | — | `hq-npcs-loading` |
| **error** | "Falha ao carregar NPCs." | — | `[Tentar novamente]` primary | `hq-npcs-error` |
| **full** | Nome (serif) · raça/classe · role chip (aliado/neutro/hostil) · tags | Grid 3-cols desktop, 1-col mobile; busca inline topo | `[+ Novo]` secondary · busca + chips | `hq-npcs-full` |

**Notas:**
- **F-16 fix:** no mobile, filtros internos (Por facção, Por local) ficam dentro de botão `[Filtros]` que abre bottom-sheet (não dropdown horizontal que corta)
- View toggle grid/list persistido em localStorage (cosmético)
- Click em card → slideover edit (padrão §7)

---

## A.4 Locais

**Meta:** mode=preparar · role=Mestre · auth=Auth-only · testid base=`hq-locations`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Nenhum local mapeado. Tavernas, masmorras, reinos — o mundo começa com um alfinete no mapa." | Ilustração MapPin 96px | `[+ Novo local]` primary · `[Usar template]` secondary | `hq-locations-empty` |
| **loading** | — | Skeleton 4 cards | — | `hq-locations-loading` |
| **error** | "Falha ao carregar locais." | — | `[Tentar novamente]` primary | `hq-locations-error` |
| **full** | Nome (serif) · tipo · tags · descrição truncada 2 linhas | Grid/list toggle; ordenar por uso ou alfabético | `[+ Novo]` secondary | `hq-locations-full` |

---

## A.5 Facções

**Meta:** mode=preparar · role=Mestre · auth=Auth-only · testid base=`hq-factions`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Nenhuma facção. Guildas, cultos, reinos — organizações dão forma ao conflito." | Ilustração Flag 96px | `[+ Nova facção]` primary | `hq-factions-empty` |
| **loading** | — | Skeleton 3 cards | — | `hq-factions-loading` |
| **error** | "Falha ao carregar facções." | — | `[Tentar novamente]` primary | `hq-factions-error` |
| **full** | Nome (serif) · alinhamento · líder · NPCs filiados count | Lista com relação visual (ícones + cor) | `[+ Nova]` secondary | `hq-factions-full` |

---

## A.6 Notas

**Meta:** mode=preparar · role=Mestre · auth=Auth-only · testid base=`hq-notes`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Suas notas do mestre aparecem aqui. Segredos, twist, ganchos — só você lê." | Ícone 🔒 destaque + texto explicativo | `[+ Nova nota]` primary | `hq-notes-empty` |
| **loading** | — | NotesListSkeleton existente | — | `hq-notes-loading` |
| **error** | "Falha ao carregar notas." | — | `[Tentar novamente]` primary | `hq-notes-error` |
| **full** | Título · preview 2 linhas · data · tags | Lista 1-col; ordenar por data/título | `[+ Nova]` secondary · busca | `hq-notes-full` |

**Notas:**
- Todas notas do Mestre são `visibility=dm-only` por default (req #8 proposal)
- Badge 🔒 gold no canto do card deixa explícito
- Backlinks §4 funcionam aqui

---

## A.7 Mapa Mental

**Meta:** mode=preparar · role=Mestre · auth=Auth-only · testid base=`hq-mindmap`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Adicione NPCs, locais e quests primeiro. Eles aparecerão aqui conectados." | Ilustração nodes esqueças + setas | `[Ir pra NPCs]` primary · `[Ir pra Locais]` ghost | `hq-mindmap-empty` |
| **loading** | — | Skeleton circle center + 4 nodes fantasma | — | `hq-mindmap-loading` |
| **error** | "Falha ao carregar mapa mental." | — | `[Tentar novamente]` primary | `hq-mindmap-error` |
| **full** | Grafo D3/Reactflow · labels sempre visíveis · legenda topo | Filter chips tipo + layout picker + zoom controls | `[⊞ Ajustar]` `[⊙ Reset]` | `hq-mindmap-full` |

**Notas:**
- **F-12 fix:** labels sempre visíveis ao lado do node (não hover-only)
- **F-13 fix:** legenda cores explícita: ● NPC (roxo #7C3AED) · ▲ Local (verde #4ADE80) · ⬢ Quest (laranja #F97316) · ■ Facção (vermelho #EF4444)

---

## A.8 Trilha (Soundboard)

**Meta:** mode=preparar · role=Mestre · auth=Auth-only · testid base=`hq-trilha`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Crie playlists por mood. Taverna, combate, ritual — a trilha certa transforma a cena." | Ilustração music notes | `[+ Nova playlist]` primary · `[Explorar moods prontos]` secondary | `hq-trilha-empty` |
| **loading** | — | Skeleton 3 cards playlist | — | `hq-trilha-loading` |
| **error** | "Falha ao carregar trilha." | — | `[Tentar novamente]` primary | `hq-trilha-error` |
| **full** | Playlists (mood label + count tracks) · controle play atual | Grid 2-col desktop, 1-col mobile | `[+ Nova]` secondary · play controls | `hq-trilha-full` |

---

# PARTE B — Surfaces Mestre Rodar

## B.1 Combate

**Meta:** mode=rodar · role=Mestre · auth=Auth-only · testid base=`hq-combat`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Nenhum combate ativo. Comece uma iniciativa para rolar a mesa." | Ilustração d20 96px + texto | `[⚔ Iniciar combate]` primary large · `[Ver combates passados]` ghost | `hq-combat-empty` |
| **loading** | — | CombatSkeleton existente | — | `hq-combat-loading` |
| **error** | "Combate desincronizado. Seus dados estão salvos." | Banner red/10% | `[Recarregar]` primary · `[Voltar pra Preparar]` secondary | `hq-combat-error` |
| **full** | Round · turno atual highlight · iniciativa ordenada · HP chips · painéis colapsáveis | Layout W2 proposal: 8 visíveis + 4 colapsáveis | `[⚡ Próximo turno]` primary xl · `[Pausar]` · `[Sair]` | `hq-combat-full` |

**Notas:**
- **F-22 fix:** HP display: se `current_hp` null → `max_hp/max_hp`; se `current === max` → apenas `max_hp`; se menor → `current/max` com cor (getHpStatus)
- HP color tiers (memory rule): FULL / LIGHT / MODERATE / HEAVY / CRITICAL — labels em inglês nos 2 locales

---

## B.2 Cena

**Meta:** mode=rodar · role=Mestre · auth=Auth-only · testid base=`hq-scene`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Adicione NPCs à cena — eles vão aparecer na visão dos jogadores." | Ícone MapPin + texto | `[+ Adicionar NPC]` primary · `[+ Adicionar local]` secondary | `hq-scene-empty` |
| **loading** | — | Skeleton 3 chips | — | `hq-scene-loading` |
| **error** | "Falha ao carregar cena." | — | `[Tentar novamente]` primary | `hq-scene-error` |
| **full** | Chips de NPCs em cena (com humor/mood) · local atual | Horizontal scroll chips + local badge fixed | `[+ NPC]` secondary small | `hq-scene-full` |

**Notas:**
- Requer schema `npcs_in_scene` + `npc.mood` (req #6 proposal — pendente Winston)
- Se schema não existe → fallback skeleton permanent + toast "Cena requer migração de schema"

---

## B.3 Party (em Rodar)

**Meta:** mode=rodar · role=Mestre · auth=Auth-only · testid base=`hq-run-party`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Nenhum jogador conectado. Envie o link de sessão." | Ícone Users + texto | `[Copiar link da sessão]` primary | `hq-run-party-empty` |
| **loading** | — | Skeleton 4 rows player | — | `hq-run-party-loading` |
| **error** | "Falha ao carregar party." | — | `[Tentar novamente]` primary | `hq-run-party-error` |
| **full** | Lista players · nome · HP bar · AC · badge online/offline | Chips online (green dot) · offline (amber há Xs) | `[Copiar link]` ghost | `hq-run-party-full` |

**Notas:**
- Mestre timer stale detection (Resilient Rule): badge amber "offline há 30s" auto-update

---

## B.4 Quest ativa

**Meta:** mode=rodar · role=Mestre · auth=Auth-only · testid base=`hq-active-quest`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Nenhuma quest marcada como ativa. Isso é opcional." | Texto pequeno + link | `[Escolher quest ativa]` ghost | `hq-active-quest-empty` |
| **loading** | — | Skeleton 1 card | — | `hq-active-quest-loading` |
| **error** | "Falha ao carregar." | — | `[Tentar novamente]` primary | `hq-active-quest-error` |
| **full** | Título · descrição curta · objetivos checkables | Card compacto collapsible | `[Trocar quest ativa]` ghost | `hq-active-quest-full` |

---

# PARTE C — Surfaces Mestre Recap

## C.1 Recap editor

**Meta:** mode=recap · role=Mestre · auth=Auth-only · testid base=`hq-recap-editor`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Escreva o que aconteceu na sessão {N}. Use `@` pra linkar NPCs e `#` pra tags." | Editor vazio com placeholder dinâmico | `[Salvar rascunho]` secondary | `hq-recap-editor-empty` |
| **loading** | — | Skeleton editor (toolbar + 5 rows) | — | `hq-recap-editor-loading` |
| **error** | "Falha ao carregar editor." | — | `[Tentar novamente]` primary | `hq-recap-editor-error` |
| **full** | Markdown rich editor · chips backlink renderizados · tags footer | Toolbar com bold/italic/list · backlinks §4 | `[📤 Publicar]` primary · `[Salvar rascunho]` secondary | `hq-recap-editor-full` |

**Notas:**
- Auto-save a cada 5s (debounced)
- Backlinks `@` §4 funcionam; tags `#` §5 funcionam
- Publicar → visibility=all; rascunho = dm-only

---

## C.2 Timeline

**Meta:** mode=recap · role=Mestre · auth=Auth-only · testid base=`hq-timeline`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Nenhum evento registrado ainda. Eventos aparecem automaticamente conforme a campanha rola." | Ilustração clock + texto | `[Abrir sessão passada]` ghost | `hq-timeline-empty` |
| **loading** | — | Skeleton 5 rows timeline | — | `hq-timeline-loading` |
| **error** | "Falha ao carregar linha do tempo." | — | `[Tentar novamente]` primary | `hq-timeline-error` |
| **full** | Linha vertical com eventos (data · tipo · label · link pro item) | Ícone por tipo · cor por categoria | `[Filtrar por tipo ▾]` ghost | `hq-timeline-full` |

**Notas:**
- Eventos auto: combate iniciou/terminou, quest mudou status, NPC adicionado, nota escrita (req #9 proposal)
- Click event → abre item (NPC/Quest/Combate) em modal/slideover

---

## C.3 Números (stats)

**Meta:** mode=recap · role=Mestre · auth=Auth-only · testid base=`hq-stats`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty-early** | "Estatísticas aparecem depois da 3ª sessão rodada. Vocês estão na {N}ª." | Ícone chart cinza + texto pequeno | — | `hq-stats-empty-early` |
| **empty-zero** | "Estatísticas aparecem depois da 3ª sessão rodada." | Ícone chart cinza | — | `hq-stats-empty-zero` |
| **loading** | — | Skeleton 4 boxes | — | `hq-stats-loading` |
| **error** | "Falha ao carregar números." | — | `[Tentar novamente]` primary | `hq-stats-error` |
| **full** | Grid: Duração média · Combates · Rolagens · Dificuldade | Números tabulares mono, labels sans 11px | — | `hq-stats-full` |

**Notas:**
- **F-10 fix:** só aparece após `combat_count >= 3`. Antes disso, empty-early.
- Evita grid 2×2 de "—" em mobile que consumia 50% da tela (finding original F-10/F-19)
- Tipografia: mono tabular (CLAUDE.md §11.2)

---

## C.4 Notas do Mestre (em Recap)

**Meta:** mode=recap · role=Mestre · auth=Auth-only · testid base=`hq-dm-notes`

Reusa estrutura da A.6 Notas. Mesma empty/loading/error/full. Diferença: contexto pinada à sessão atual ("Notas pós-sessão {N}").

---

## C.5 Última Sessão (em Recap)

**Meta:** mode=recap · role=Mestre · auth=Auth-only · testid base=`hq-last-session`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Nenhuma sessão finalizada ainda. Rode a primeira e escreva o recap aqui." | Ícone book | `[Ir pra Rodar]` primary | `hq-last-session-empty` |
| **loading** | — | Skeleton hero card | — | `hq-last-session-loading` |
| **error** | "Falha ao carregar sessão." | — | `[Tentar novamente]` primary | `hq-last-session-error` |
| **full** | Título · data · recap preview 3 linhas · participantes · duração | Card hero | `[Abrir recap completo]` primary · `[✎ Editar]` ghost | `hq-last-session-full` |

---

# PARTE D — Surfaces Player Minha Jornada

## D.1 Meu Personagem

**Meta:** mode=minha-jornada · role=player · auth=Anônimo+Auth · testid base=`hq-character`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** (auth) | "Ficha incompleta — complete para entrar no combate." | Card amber/10%, ícone ⚠ | `[Abrir ficha]` primary | `hq-character-empty` |
| **empty** (anon) | "Seu personagem ainda não foi configurado. Peça ao Mestre." | Card texto neutro | `[Avisar Mestre]` ghost | `hq-character-empty-anon` |
| **loading** | — | Skeleton character card | — | `hq-character-loading` |
| **error** | "Falha ao carregar personagem." | — | `[Tentar novamente]` primary | `hq-character-error` |
| **full** (auth) | Nome · raça/classe/nível · HP bar + AC chip · class features | Card hero 240px · HP colorido por tier | `[Abrir ficha completa]` secondary | `hq-character-full` |
| **full** (anon) | Idem mas sem CTA edit | Card read-only badge "Anônimo" | `[Criar conta para salvar]` ghost | `hq-character-full-anon` |

**Notas:**
- **F-14 fix:** ficha incompleta = nome + indicador ⚠ + CTA "Abrir ficha" (player completa a própria) OU "Pedir pro Mestre" (se Mestre cria fichas pré-feitas)
- HP display: segue regra F-22 (ver B.1)
- HP tier labels (memory rule): FULL/LIGHT/MODERATE/HEAVY/CRITICAL em inglês

---

## D.2 Última Sessão (player)

**Meta:** mode=minha-jornada · role=player · auth=Anônimo+Auth · testid base=`hq-player-last-session`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Sua campanha ainda não rodou sessões. Quando rodar, o recap aparece aqui." | Ícone book cinza | — | `hq-player-last-session-empty` |
| **loading** | — | Skeleton recap card | — | `hq-player-last-session-loading` |
| **error** | "Falha ao carregar sessão passada." | — | `[Tentar novamente]` primary | `hq-player-last-session-error` |
| **full** | Título (serif) · "há {X} dias" · recap preview 4 linhas + fade | Card com handouts thumbnails se houver | `[Ler recap completo ▶]` primary | `hq-player-last-session-full` |

**Notas:**
- Accordion "Handouts" abaixo do card quando Rodar enviou §6
- Click "Ler recap" → modal full-screen com recap rendered (backlinks clicáveis)

---

## D.3 Próxima Sessão (player)

**Meta:** mode=minha-jornada · role=player · auth=Anônimo+Auth · testid base=`hq-player-next-session`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Seu mestre ainda não agendou a próxima sessão." | Ícone 📅 cinza | — | `hq-player-next-session-empty` |
| **loading** | — | Skeleton meta card | — | `hq-player-next-session-loading` |
| **error** | "Falha ao carregar próxima sessão." | — | `[Tentar novamente]` primary | `hq-player-next-session-error` |
| **full** | `📅 {dia}, {DD/MMM} · {HH}h` · `📍 {local}` · "⚠ Trazer ficha impressa" (se Mestre marcou) | Meta card compacta | `[Adicionar ao calendário]` ghost · `[📋 Copiar convite]` ghost | `hq-player-next-session-full` |

**Notas:**
- Se sessão é "hoje" + <6h: destaque gold + contador
- Se sessão começou + player não entrou: banner "⚔ Sessão começou · [Entrar]" primary

---

## D.4 Quests (player)

**Meta:** mode=minha-jornada · role=player · auth=Anônimo+Auth · testid base=`hq-player-quests`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Seu mestre ainda não criou quests. Elas aparecerão aqui." | Ícone compass cinza, **SEM** CTA de criar | — | `hq-player-quests-empty` |
| **loading** | — | Skeleton 3 rows | — | `hq-player-quests-loading` |
| **error** | "Falha ao carregar quests." | — | `[Tentar novamente]` primary | `hq-player-quests-error` |
| **full** | Lista quests visíveis (respeita visibility rules) | Status chip + título + descrição | filters chips | `hq-player-quests-full` |

**Notas:**
- **F-05 fix crítico:** empty copy NÃO tem CTA "Crie a primeira" (player não pode criar). Copy confirmado: "Seu mestre ainda não criou quests. Elas aparecerão aqui."
- Player vê apenas quests com `visibility !== "dm-only"`

---

## D.5 Minhas Notas (player)

**Meta:** mode=minha-jornada · role=player · auth=**Auth-only** (Anônimo vê rodapé) · testid base=`hq-player-notes`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** (auth) | "Escreva suas primeiras observações da campanha. Só você lê." | Ícone 🔒 + texto | `[+ Nova nota]` primary | `hq-player-notes-empty` |
| **empty** (anon) | "Notas privadas precisam de conta. Crie grátis pra começar." | Card neutro, ícone 🔒 | `[Criar conta]` primary | `hq-player-notes-empty-anon` |
| **loading** | — | NotesListSkeleton | — | `hq-player-notes-loading` |
| **error** | "Falha ao carregar notas." | — | `[Tentar novamente]` primary | `hq-player-notes-error` |
| **full** (auth only) | Lista notas (título · preview · data) | Badge 🔒 gold "privada" | `[+ Nova]` secondary | `hq-player-notes-full` |

**Notas:**
- Anônimo sempre tem rodapé persistente "💾 Crie uma conta pra salvar suas notas e histórico · [Criar conta]" (proposal §5.3)
- Notes auth tem backlinks §4 quando entities são visíveis ao player

---

## D.6 Party (player)

**Meta:** mode=minha-jornada · role=player · auth=Anônimo+Auth · testid base=`hq-player-party`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty-solo** | "Você está sozinho por enquanto. O mestre pode convidar mais jogadores." | Texto informativo, sem CTA de ação do player | — | `hq-player-party-empty-solo` |
| **loading** | — | MembersListSkeleton existente | — | `hq-player-party-loading` |
| **error** | "Falha ao carregar party." | — | `[Tentar novamente]` primary | `hq-player-party-error` |
| **full** | Lista players com você primeiro | `● Daniel (Você — Capa Barsavi)` · `● {Outro} · {raça} {classe} · Nv{N}` | — | `hq-player-party-full` |

**Notas:**
- **F-15 fix:** rename "Companheiros" → **"Party"** (aprovado proposal §13)
- Você primeiro com badge "Você"
- Se `count === 1 && único === self`: copy empty-solo (não oculta accordion, mostra context)
- Fichas incompletas: linha final "⚠ 3 fichas incompletas" (info-only pro player; CTA só Mestre vê em B.3)

---

# PARTE E — Surfaces Player Assistindo

## E.1 Combate (Watch)

**Meta:** mode=assistindo · role=player · auth=Anônimo+Auth · testid base=`hq-watch-combat`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | (não existe empty — se combate não ativo, mode não é assistindo) | — | — | — |
| **loading** | — | CombatSkeleton existente | — | `hq-watch-combat-loading` |
| **error** | "Desconectado do combate. Tentando reconectar..." | Banner amber + retry inline | `[Recarregar]` primary | `hq-watch-combat-error` |
| **full** (auth) | Iniciativa · "Sua vez em {N} turnos" · HP próprio + party · turno atual | Layout W7 proposal mobile-first | `[📖 Minha ficha]` ghost · `[✎ Anotar algo]` ghost · (chat se auth) | `hq-watch-combat-full` |
| **full** (anon) | Idem sem chat/roll | Watch simplificado | (sem chat CTA) | `hq-watch-combat-full-anon` |

**Notas:**
- Auth tem chat/roll (proposal §4.2)
- Anônimo NÃO tem chat (proposal §4.2 — auth-only via realtime persistente)
- HP display: F-22 compliance
- Initiative destaque do jogador atual com ★

---

## E.2 Iniciativa (componente compartilhado)

Reusa lógica de E.1. Mesma tabela mas testid `hq-watch-initiative`.

---

## E.3 Turno atual (destaque)

**Meta:** mode=assistindo · role=player · testid base=`hq-watch-current-turn`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **loading** | — | Skeleton chip | — | `hq-watch-current-turn-loading` |
| **error** | "—" | Fallback mínimo | — | `hq-watch-current-turn-error` |
| **full-self** | "SUA VEZ" + timer | Chip gold destaque + pulsa | — | `hq-watch-current-turn-full-self` |
| **full-other** | "{Nome} (aliado|inimigo)" | Chip neutro | — | `hq-watch-current-turn-full-other` |

---

## E.4 Ação rápida

**Meta:** mode=assistindo · role=player auth-only · testid base=`hq-watch-quick-action`

| Estado | Copy | Visual | CTAs | Testid |
|---|---|---|---|---|
| **empty** | "Aguardando sua vez..." | Placeholder ghost | — | `hq-watch-quick-action-waiting` |
| **full-own-turn** | "É sua vez · role ataque, cast spell ou passe" | Painel expandido | `[🎲 Atacar]` · `[✨ Magia]` · `[⏭ Passar]` | `hq-watch-quick-action-own` |

**Notas:**
- Anônimo não vê este painel (sem realtime persistente pra rolls)

---

# PARTE F — Matrix resumo por condição especial

| Condição | Todas surfaces comportamento | Exceções |
|---|---|---|
| **Offline** | Skeleton sobre dado stale + banner bottom após 3s (§8 interactions) | Combat ativo mostra dados last-known congelados |
| **Arquivada** | Banner topo "somente leitura" + actions desabilitadas | Recap permanece legível (só não edita) |
| **Sem permissão** | Tela `hq-forbidden` com CTA role-aware | — |
| **Role transition** | Toast + re-render shell | Combat ativo preserva estado |
| **Token revogado** (anônimo) | Redirect pra `/join/{token}` com form + copy "Sua sessão expirou" | Minhas Notas não existe mais pra anônimo |
| **Campanha deletada** | Redirect pra dashboard + toast info | — |

---

# PARTE G — Checklist de revisão

Antes de marcar um surface como implementado, validar:

- [ ] 4 estados (empty/loading/error/full) têm copy PT-BR final, sem placeholder
- [ ] Empty state NÃO sugere ação que role não pode fazer (F-05 legacy)
- [ ] Loading usa skeleton existente de `components/ui/skeletons/` quando possível
- [ ] Error tem retry (exceto 403 forbidden)
- [ ] Testids seguem convenção `hq-{surface}-{state}`
- [ ] Offline condition testada manualmente (DevTools offline)
- [ ] Archived condition testada (seed + flag `archived_at`)
- [ ] Mobile layout: nenhum texto cortado, safe-area respeitado
- [ ] Anônimo vs Auth: copies diferentes onde aplicável (notas, ficha)
- [ ] Findings relacionados fechados:
  - [ ] F-05 (empty Quest player)
  - [ ] F-09 (naming default)
  - [ ] F-10 (stats ≥3 combates)
  - [ ] F-14 (ficha incompleta)
  - [ ] F-15 (Party count-1)
  - [ ] F-16 (dropdown mobile → bottom-sheet)
  - [ ] F-22 (HP display rules)

---

## Changelog

- **v1.0 (2026-04-22):** versão inicial, 21 surfaces × 4+ estados × 4 condições especiais. Copy PT-BR final. Derivado de redesign-proposal v0.2 + findings v1. Cobre todas as 24 findings com referências explícitas nos notes.

## Próximos passos

1. Sally valida copy PT-BR (tom + concisão)
2. Cross-check com `03-interactions-spec.md` — testids devem bater
3. Design tokens map: gold tier, red/amber/green severities → Figma vars
4. Phase B sprint: implementar loading+error+empty primeiro (evita "parece quebrado" em prod); full states já existem para a maioria
5. Playwright suite: gerar tests a partir dos testids listados (12 surfaces Mestre × 4 estados + 6 player × 4 estados = ~72 cenários básicos)
