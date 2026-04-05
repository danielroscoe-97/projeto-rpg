# QA Prompt: Player Mind Map — Validacao Completa via Playwright

**Epic:** Player Mind Map — "O Mapa do Aventureiro"
**Data:** 2026-04-04
**Ambiente:** https://tavernadomestre.vercel.app/
**Escopo:** 15 stories implementadas em 3 commits (Sprint 1 + Sprint 2 + Polish)

---

## Credenciais de Teste

### DM (cria campanha, controla visibility)
- **Email:** `dm.primary@test-taverna.com`
- **Senha:** `TestDM_Primary!1`

### Player (acessa mind map, pins, drawers)
- **Email:** `player.warrior@test-taverna.com`
- **Senha:** `TestPlayer_War!1`
- **Display Name:** Thorin Guerreiro

### Player 2 (testa isolamento de pins)
- **Email:** `player.mage@test-taverna.com`
- **Senha:** `TestPlayer_Mage!2`

### URLs
- Login: `/auth/login`
- Dashboard: `/app/dashboard`
- Campanha DM: `/app/campaigns/[id]`
- Player HQ: `/app/campaigns/[id]/sheet`

---

## Playwright Patterns (IMPORTANTE — ler antes de escrever testes)

1. **Strict mode:** Dashboard tem 3 `<nav>`. Nunca use `page.locator("nav")` sozinho — use `button:has-text()` ou `[aria-label]`.
2. **Login flow:** Supabase PKCE auth. Apos login, esperar redirect com `page.waitForURL('**/app/**')`.
3. **i18n:** App pode estar em pt-BR ou en. Usar regex nos seletores: `hasText: /Mapa|Map/`.
4. **Tabs:** O PlayerHqShell tem 6 tabs. Tab "Map" e a primeira (default). Tabs nao tem `role="tab"` — usar `button:has-text()`.
5. **ReactFlow:** Nodes sao renderizados dentro de `.react-flow`. Clicar em nodes: `page.locator('.react-flow__node').filter({ hasText: 'NodeName' }).click()`.
6. **Drawers:** Abrem da direita com backdrop. Fechar: click no backdrop ou botao X. Escape tambem fecha.

---

## Setup Necessario (antes dos testes)

O agente de QA deve fazer o setup da campanha de teste:

### 1. Login como DM e criar campanha de teste
```
1. Login com dm.primary@test-taverna.com
2. Criar campanha "QA Mind Map Test"
3. Copiar o campaign ID da URL
```

### 2. Popular a campanha com entidades
```
1. Criar 2 NPCs: "Elara" (visivel), "Shadow Lord" (oculto — toggle Eye)
2. Criar 2 Locations: "Ironforge" (discovered), "Dark Citadel" (undiscovered)
3. Criar 2 Quests: "Find the Dragon" (active, visivel), "Secret Mission" (available, oculta — toggle Eye)
4. Criar 1 Faction: "Adventurer's Guild" (ally, visivel)
5. Criar 1 Note compartilhada
```

### 3. Convidar player
```
1. Gerar link de convite para a campanha
2. Login como player.warrior@test-taverna.com
3. Aceitar convite
4. Criar personagem "Thorin" na campanha
```

---

## Test Suites

### Suite 1: DM Visibility Controls (Fase 0)

**T1.1 — Quest visibility toggle no QuestBoard**
```
Precondição: Logado como DM, na campanha
1. Abrir seção Quests
2. Verificar que cada quest tem icone Eye (visivel) ou EyeOff (oculta)
3. Clicar no Eye da quest "Find the Dragon"
4. Verificar que muda para EyeOff e quest fica com opacity-50
5. Clicar novamente → volta para Eye, opacity normal
6. Criar quest "Secret Mission" e clicar Eye para ocultar
Expected: Toggle funciona, visual muda, estado persiste ao recarregar
```

**T1.2 — Visual de visibility no Mind Map do DM**
```
Precondição: Logado como DM, mind map aberto
1. Verificar que NPC "Shadow Lord" (isHidden) tem borda pontilhada
2. Verificar que Quest "Secret Mission" (oculta) mostra "???" e borda tracejada
3. Verificar que Location "Dark Citadel" (undiscovered) mostra "???"
4. Verificar que NPC "Elara" (visivel) tem borda solida normal
Expected: Nodes ocultos tem visual distinto (???, borda tracejada/pontilhada, opacity reduzida)
```

### Suite 2: Player Mind Map Core (Fase 1)

**T2.1 — Player ve mind map como primeira tab**
```
Precondição: Logado como Player, acessar campanha
1. Navegar para /app/campaigns/[id]/sheet
2. Verificar que tab "Map" / "Mapa" esta ativa (primeira tab)
3. Verificar que ReactFlow renderiza (container .react-flow existe)
4. Verificar que node central "Campaign" / nome da campanha aparece
Expected: Mind map e a landing page do Player HQ
```

**T2.2 — Fog of War: player NAO ve entidades ocultas**
```
Precondição: Player no mind map
1. Verificar que NPC "Elara" aparece no mapa
2. Verificar que NPC "Shadow Lord" NAO aparece (server-side filter)
3. Verificar que Quest "Find the Dragon" aparece
4. Verificar que Quest "Secret Mission" NAO aparece
5. Verificar que Location "Ironforge" aparece com nome real
6. Verificar que Location "Dark Citadel" aparece como "???" (undiscovered)
7. Verificar que Faction "Adventurer's Guild" aparece
Expected: Fog of war funciona — ocultos nao aparecem, undiscovered mostra "???"
```

**T2.3 — Fog of War seguranca: dados ocultos NAO vazam no network**
```
Precondição: Player no mind map, DevTools aberto na aba Network
1. Filtrar requests por "get_player_visible_nodes"
2. Inspecionar response body
3. Verificar que "Shadow Lord" NAO esta no array npcs
4. Verificar que "Secret Mission" NAO esta no array quests
5. Verificar que edges referenciando nodes ocultos NAO estao no response
Expected: Server-side filtering e completo — zero data leak
```

**T2.4 — Read-only: player NAO pode editar o mapa**
```
Precondição: Player no mind map
1. Tentar arrastar um node → nao deve mover
2. Tentar conectar dois nodes (drag handle) → nao deve criar edge
3. Selecionar node e pressionar Delete → node nao deve sumir
4. Verificar que nao ha dialog de "relacionamento" ao arrastar
Expected: Mapa e 100% read-only para o player
```

**T2.5 — Filter bar funciona**
```
Precondição: Player no mind map
1. Clicar no filtro "NPCs" para desativar
2. Verificar que nodes NPC somem do mapa
3. Clicar novamente para reativar → NPCs voltam
4. Desativar TODOS os filtros → mensagem "Nenhum node..." aparece
5. Reativar um filtro → mensagem some, nodes voltam
Expected: Filtros toggle on/off corretamente, empty state funciona
```

### Suite 3: Drawers (Fase 1)

**T3.1 — Click em NPC abre drawer com notas**
```
Precondição: Player no mind map
1. Clicar no node "Elara"
2. Verificar que drawer abre da direita com titulo "Elara"
3. Verificar icone roxo de UserCircle
4. Verificar seletor de relacionamento (Ally/Neutral/Enemy/Unknown)
5. Clicar "Ally" → verificar que fica selecionado
6. Digitar "Elara nos ajudou na taverna" no campo de notas
7. Aguardar 1s (debounce)
8. Fechar drawer (click no X ou backdrop)
9. Reabrir drawer clicando no node "Elara"
10. Verificar que "Ally" e a nota persistiram
Expected: Notas do player sobre NPC salvam e persistem
```

**T3.2 — Click em Quest abre drawer com detalhes**
```
Precondição: Player no mind map
1. Clicar no node "Find the Dragon"
2. Verificar titulo, status badge "Active"
3. Verificar campo de descricao (se DM preencheu)
4. Toggle estrela de favorito → verificar que muda
5. Digitar nota pessoal
6. Fechar e reabrir → verificar persistencia
Expected: Quest drawer mostra detalhes + notas pessoais do player
```

**T3.3 — Click em Location undiscovered mostra "???"**
```
Precondição: Player no mind map
1. Clicar no node "???" (Dark Citadel undiscovered)
2. Verificar que drawer abre com titulo "???"
3. Verificar icone HelpCircle e mensagem "Este local ainda nao foi descoberto"
4. Verificar que NAO mostra descricao nem tipo
Expected: Fog of war no drawer — sem spoilers
```

**T3.4 — Click em Location discovered mostra detalhes**
```
Precondição: Player no mind map
1. Clicar no node "Ironforge"
2. Verificar que drawer abre com titulo "Ironforge"
3. Verificar badge de tipo (city/dungeon/etc)
Expected: Location descoberta mostra informacao completa
```

**T3.5 — Drawer fecha com Escape e click-outside**
```
1. Abrir qualquer drawer (click em node)
2. Pressionar Escape → drawer fecha
3. Reabrir drawer
4. Clicar no backdrop escuro (fora do drawer) → drawer fecha
Expected: Ambos metodos de fechar funcionam
```

### Suite 4: Pins (Fase 2)

**T4.1 — Criar pin pessoal**
```
Precondição: Player no mind map
1. Verificar botao "+ Add Pin" visivel
2. Clicar "+ Add Pin"
3. Verificar que um novo node PinNode aparece no mapa
4. Clicar no pin → drawer de pin abre
5. Digitar label "Investigar a taverna"
6. Digitar nota "Algo estranho aconteceu aqui"
7. Selecionar cor azul
8. Fechar drawer
9. Verificar que pin mostra label "Investigar a taverna" no mapa
Expected: Pin criado com label, nota e cor corretos
```

**T4.2 — Deletar pin**
```
Precondição: Pin criado no T4.1
1. Clicar no pin
2. No drawer, clicar "Deletar pin"
3. Verificar que pin sumiu do mapa
4. Recarregar pagina → pin nao volta
Expected: Delete persiste
```

**T4.3 — Isolamento de pins entre players**
```
Precondição: Player 1 (warrior) tem pin criado
1. Login como player.mage@test-taverna.com
2. Aceitar convite na mesma campanha (se ainda nao fez)
3. Acessar Player HQ → Mind Map
4. Verificar que pins do Player 1 NAO aparecem
5. Criar pin proprio
6. Verificar que aparece
Expected: Pins sao privados por player
```

**T4.4 — Limite de 20 pins**
```
(Teste opcional — pode ser lento)
1. Criar 20 pins em sequencia
2. Verificar que botao "+ Add Pin" desaparece ou fica desabilitado
Expected: Limite de 20 respeitado no client
```

**T4.5 — Filtro de pins**
```
Precondição: Pin criado
1. Verificar que filtro "Pins" esta no filter bar
2. Desativar filtro "Pins" → pins somem do mapa
3. Reativar → pins voltam
Expected: Pins toggle no filter bar funciona
```

### Suite 5: NEW Badges (Fase 2)

**T5.1 — Primeira visita NAO mostra tudo como NEW**
```
Precondição: Player novo (nunca viu o mind map)
1. Login como player.fresh@test-taverna.com (se tiver acesso a campanha)
2. Acessar mind map pela primeira vez
3. Verificar que nenhum node tem badge "NEW"
Expected: First-visit seeding funciona — nao ha flood de badges
```

**T5.2 — DM revela entidade → player ve NEW badge**
```
Precondição: Player ja visitou o mind map (seeded)
1. Login como DM
2. Ir no QuestBoard, criar nova quest "Rescue the Princess" (visivel)
3. Login como Player
4. Acessar mind map
5. Verificar que node "Rescue the Princess" tem badge "NEW" (amber)
6. Verificar animacao pulse dourado no node (classe .node-reveal)
7. Clicar no node → badge "NEW" desaparece
8. Recarregar → badge nao volta (marcado como visto)
Expected: NEW badge aparece em nodes novos, desaparece ao clicar
```

**T5.3 — Recap "O que mudou"**
```
Precondição: Nodes novos existem (DM criou algo novo)
1. Acessar mind map como player
2. Verificar secao colapsavel "X novidades desde sua ultima visita"
3. Expandir → lista de mudancas com tipo (NPC, Quest, Location)
4. Clicar "Marcar todas como vistas" → secao some
5. Recarregar → secao nao reaparece (tudo marcado)
Expected: Recap mostra mudancas e permite marcar como vistas
```

### Suite 6: Realtime (Fase 2)

**T6.1 — DM muda visibility → player ve em tempo real**
```
Precondição: DM e Player logados em abas/browsers separados
1. Player abre mind map
2. DM vai no QuestBoard e cria nova quest "Urgent Quest" (visivel)
3. Aguardar ~1-2s
4. Verificar que "Urgent Quest" aparece no mind map do player SEM refresh
Expected: Realtime funciona — mudancas do DM aparecem automaticamente
```

**T6.2 — DM marca location como discovered → player ve reveal**
```
Precondição: Location "Dark Citadel" undiscovered
1. Player ve "???" no mapa
2. DM marca "Dark Citadel" como discovered
3. Aguardar ~1-2s
4. No player: "???" vira "Dark Citadel" com animacao
Expected: Reveal em tempo real com animacao
```

### Suite 7: Quick Access (Fase 3)

**T7.1 — NPC drawer → "Ver no Journal"**
```
1. Player clica no NPC node "Elara"
2. Drawer abre
3. Clicar "View in NPC Journal" / "Ver no Journal de NPCs"
4. Drawer fecha, tab muda para "Notes"
Expected: Navegacao do drawer pra tab funciona
```

**T7.2 — Quest drawer → "Ver no Quest Board"**
```
1. Player clica no Quest node "Find the Dragon"
2. Drawer abre
3. Clicar "View in Quest Board" / "Ver no Quest Board"
4. Drawer fecha, tab muda para "Quests"
Expected: Navegacao do drawer pra tab funciona
```

### Suite 8: Responsividade Mobile

**T8.1 — Mind map responsivo em mobile**
```
1. Redimensionar viewport para 375x812 (iPhone)
2. Verificar que mind map ocupa area completa
3. Verificar que filter bar tem scroll horizontal
4. Verificar que tab bar tem scroll horizontal (overflow-x-auto)
5. Clicar em node → drawer abre full-width
Expected: UX mobile funcional
```

### Suite 9: i18n

**T9.1 — Todas as strings traduzidas**
```
1. Acessar como Player em pt-BR → verificar "Mapa", "Relacao", "Suas Notas"
2. Acessar como Player em en → verificar "Map", "Relationship", "Your Notes"
3. Verificar drawers, filter bar, recap, pins
Expected: Zero strings hardcoded em ingles ou portugues
```

---

## Acceptance Criteria Nao Testados (Items Menores — verificar manualmente)

- [ ] F0-S3: "Legenda visual no filter bar indicando nodes sombreados = ocultos pro player" — NAO implementado (deferred)
- [ ] F2-S2: "Click em node existente + Add Pin = pin attached ao node" — Pins sao sempre floating, attach nao implementado
- [ ] F1-S4: Drawer de Session — funciona mas nao tem conteudo rico (so nome + status)
- [ ] NewBadge.tsx componente criado mas nao usado (badges inline nos nodes em vez de componente separado)
- [ ] prefers-reduced-motion — verificar que animacoes desligam com setting de acessibilidade

---

## Notas para o Agente de QA

1. **Ordem dos testes importa**: Suite 1 (DM setup) deve rodar antes de Suite 2-7 (player tests)
2. **Dois browsers/contexts**: Suites 6 (realtime) precisa de DM e Player logados simultaneamente
3. **Cleanup**: Nao deletar a campanha de teste — outros suites dependem dela
4. **Screenshots**: Salvar em `qa-evidence/` (gitignored)
5. **Timeouts**: Realtime tests precisam de `waitForTimeout(2000)` ou melhor, `waitForSelector` com polling
