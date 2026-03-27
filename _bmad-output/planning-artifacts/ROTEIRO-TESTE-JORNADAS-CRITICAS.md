# Roteiro de Teste Completo — Jornadas Criticas do Pocket DM

**Data:** 2026-03-27
**Base:** Market Research (market-vtt-rpg-features-go-to-market-2026-03-27.md)
**Escopo:** 5 jornadas criticas + 3 jornadas de suporte
**Target:** pocketdm.com.br (producao) + localhost:3000 (dev)
**Framework:** Playwright (Chromium + Mobile Chrome)

---

## Matriz de Jornadas vs. Prioridade

| # | Jornada | Prioridade | Impacto se Falhar | Status Atual |
|---|---|---|---|---|
| J1 | O Primeiro Combate (DM) | P0 | Perda total de usuario | Parcialmente coberta |
| J2 | O Jogador que Recebe o Link | P0 | Morte da viralidade | Parcialmente coberta |
| J3 | O DM que Retorna | P0 | Retencao = 0 | NAO coberta |
| J4 | O Visitante que Experimenta (/try) | P0 | Perda do topo de funil | Coberta basico |
| J5 | O Compartilhamento Organico | P1 | Viralidade nao funciona | NAO coberta |
| J6 | Combate Completo (HP + Condicoes + Turnos) | P1 | Core loop quebrado | Parcialmente coberta |
| J7 | Busca no Compendium + Oracle | P2 | Prep do DM prejudicada | NAO coberta |
| J8 | Audio/Soundboard durante Combate | P2 | Feature diferenciadora quebrada | Coberta |

---

## J1 — O Primeiro Combate (DM Autenticado)

> **Hipotese validada:** H2 — DMs que chegam ao primeiro combate em < 90s tem 2x mais chance de retornar.
> **Metrica rastreada:** `first_combat_completed` + `time_to_first_combat`

### Precondition
- DM_PRIMARY logado via `loginAs()`
- Dashboard visivel

### Cenario 1.1 — Happy Path: Dashboard → Novo Combate → 2 combatentes → Iniciar (P0)

```
DADO que o DM esta no dashboard
QUANDO clica "Nova Sessao" / "Novo Combate"
ENTAO e redirecionado para /app/session/new ou /app/session/[id]

DADO que a tela de setup esta visivel (add-row form)
QUANDO preenche nome do encontro = "Emboscada Goblin"
E adiciona combatente 1 (Paladino, HP:45, AC:18, Init:15)
E adiciona combatente 2 (Goblin, HP:7, AC:15, Init:12)
ENTAO lista de setup mostra 2 combatentes

QUANDO clica "Iniciar Combate"
ENTAO tela de combate ativo aparece (data-testid="active-combat")
E lista de iniciativa visivel (data-testid="initiative-list")
E botao "Proximo Turno" visivel (data-testid="next-turn-btn")
E o combatente com maior iniciativa esta destacado como turno atual
```

**Assertions criticas:**
- [ ] `[data-testid="active-combat"]` visivel em < 3s apos clique
- [ ] Ordem de iniciativa correta (maior primeiro)
- [ ] HP de todos os combatentes visivel para o DM
- [ ] Turno atual destacado visualmente

### Cenario 1.2 — Gerar Link de Compartilhamento durante setup (P0)

```
DADO que o DM esta na tela de setup (/session/new)
QUANDO clica no botao de compartilhar (data-testid="share-prepare-btn")
ENTAO sessao e criada on-demand (URL muda para /session/[id])

QUANDO clica "Gerar Link" (data-testid="share-session-generate")
ENTAO campo com URL de join aparece (data-testid="share-session-url")
E URL contem /join/ + token alfanumerico
```

**Assertions criticas:**
- [ ] Token gerado contem apenas [a-zA-Z0-9_-]
- [ ] URL e copiavel (input acessivel)
- [ ] Token permanece valido apos iniciar combate

### Cenario 1.3 — Quick Combat (sem campanha) (P0)

```
DADO que o DM navega para /app/session/new
E aparece picker de campanha
QUANDO clica "Combate Rapido" / "Quick Combat"
ENTAO vai direto para setup de encontro
E nao exige selecao de campanha
```

### Cenario 1.4 — Edge Case: Iniciar sem combatentes (P1)

```
DADO que a tela de setup esta visivel
E nenhum combatente foi adicionado
QUANDO clica "Iniciar Combate"
ENTAO botao esta desabilitado OU mostra mensagem de erro
E NAO redireciona para combate ativo
```

### Cenario 1.5 — Edge Case: Adicionar combatente com campos vazios (P2)

```
DADO que o DM esta na tela de setup
QUANDO clica "Adicionar" com nome vazio
ENTAO combatente NAO e adicionado OU erro inline aparece
```

### Cenario 1.6 — Persistencia: Fechar e reabrir a sessao (P1)

```
DADO que o DM esta na tela de setup com 2 combatentes adicionados
QUANDO fecha a aba e navega de volta para /app/session/[id]
ENTAO combatentes ainda estao na lista (persistidos no Supabase)
```

---

## J2 — O Jogador que Recebe o Link

> **Hipotese validada:** H1 — O player view em tempo real e o principal gatilho de compartilhamento organico.
> **Metrica rastreada:** `player_joined` + NPS qualitativo

### Precondition
- DM_PRIMARY em combate ativo com share token gerado
- Browser contexts separados (DM vs Player)

### Cenario 2.1 — Player autenticado faz late-join (P0)

```
DADO que o DM tem combate ativo com share token
E PLAYER_WARRIOR esta logado em outro contexto

QUANDO Player navega para /join/[token]
ENTAO ve formulario de late-join (nome, iniciativa, HP, AC)

QUANDO preenche nome="Thorin", init="15", HP="45", AC="18"
E clica "Solicitar Entrada" / "Request Join"
ENTAO ve estado de espera ("Aguardando aprovacao")

QUANDO DM ve notificacao de pedido de entrada
E clica "Aceitar" / "Accept"
ENTAO Player ve o PlayerInitiativeBoard (data-testid="player-view")
E ve todos os combatentes na ordem de iniciativa
E ve seu proprio HP completo
E ve HP dos monstros como tier (LIGHT/MODERATE/HEAVY/CRITICAL) — NAO numeros exatos
E ve quem e o turno atual
```

**Assertions criticas:**
- [ ] `[data-testid="player-view"]` visivel em < 5s apos aprovacao
- [ ] HP do player exibido como numero exato
- [ ] HP de monstros exibido como tier (texto ou barra colorida, NAO numeros)
- [ ] Turno atual destacado visualmente
- [ ] ZERO tela de login durante o fluxo

### Cenario 2.2 — Player anonimo (sem conta) faz late-join (P0)

```
DADO que existe combate ativo com token
E um browser limpo (sem cookies, sem login)

QUANDO navega para /join/[token]
ENTAO NAO e redirecionado para /auth/login
E ve formulario de late-join

QUANDO preenche nome="Visitante" e init="10"
E clica enviar
ENTAO ve estado de espera ou player-view apos aprovacao do DM
```

**Assertions criticas:**
- [ ] URL nao contem /auth/ em nenhum momento
- [ ] Nenhum pedido de criacao de conta
- [ ] Player view funcional apos aprovacao

### Cenario 2.3 — Player ve atualizacao de HP em tempo real (P0)

```
DADO que Player esta no player-view
E DM esta no combate ativo

QUANDO DM abre HP adjuster de um monstro
E aplica -10 HP ao monstro
ENTAO Player ve a barra de HP do monstro mudar em < 3 segundos
E tier pode mudar (ex: de "Saudavel" para "Ferido")
```

**Assertions criticas:**
- [ ] Atualizacao em tempo real via Supabase Realtime
- [ ] Player NAO ve o numero exato de HP do monstro
- [ ] Animacao de flash vermelho visivel na row do monstro

### Cenario 2.4 — Player recebe notificacao de turno (P1)

```
DADO que Player esta no player-view
E NAO e seu turno

QUANDO DM avanca turnos ate chegar no turno do Player
ENTAO overlay de notificacao aparece ("Sua vez!")
E destaque visual no combatente do Player
```

### Cenario 2.5 — Player acessa Soundboard no seu turno (P1)

```
DADO que e o turno do Player
ENTAO FAB de soundboard aparece (icone de speaker)

QUANDO clica no FAB
ENTAO drawer abre com presets de som (Bola de Fogo, Golpe de Espada, etc.)

QUANDO clica em um preset
ENTAO som e transmitido (broadcast event)
E cooldown de 2s ativa (botoes desabilitados)
```

### Cenario 2.6 — Edge Case: Link invalido/expirado (P1)

```
QUANDO navega para /join/token-invalido-123
ENTAO ve mensagem de erro amigavel (nao 500)
E sugestao de pedir novo link ao DM
```

### Cenario 2.7 — Edge Case: Player perde conexao e reconecta (P2)

```
DADO que Player esta no player-view
QUANDO perde conexao de internet (simular offline)
E reconecta apos 10 segundos
ENTAO player-view restaura o estado atual do combate
E NAO exige novo login ou novo join
```

### Cenario 2.8 — Mobile: Player abre link no celular (P0)

```
DADO link de join compartilhado via WhatsApp
QUANDO Player abre no Chrome Mobile (Pixel 5 viewport)
ENTAO layout responsivo carrega corretamente
E formulario de late-join usavel em tela pequena
E player-view renderiza sem overflow horizontal
```

---

## J3 — O DM que Retorna (Retencao)

> **Hipotese validada:** H4 — DMs que usam em 2 sessoes consecutivas tem retencao de 80%+.
> **Metrica rastreada:** `session_returned` + D7/D30 retention

### Precondition
- DM_PRIMARY logado
- Pelo menos 1 sessao anterior existe (combate ja finalizado ou em andamento)

### Cenario 3.1 — Dashboard mostra sessoes anteriores (P0)

```
DADO que o DM ja criou sessoes anteriormente
QUANDO faz login e chega no dashboard
ENTAO ve lista/cards de sessoes anteriores
E pode ver o nome do encontro
E pode ver status (ativo, finalizado)
```

**Assertions criticas:**
- [ ] Dashboard nao esta vazio para usuario recorrente
- [ ] Sessao anterior e clicavel/acessivel

### Cenario 3.2 — DM retoma sessao ativa (P0)

```
DADO que existe uma sessao com combate ativo
QUANDO DM clica "Retomar" / "Continuar" na sessao
ENTAO e levado para /app/session/[id] com combate ativo
E ve a lista de iniciativa com estado salvo
E HP de todos os combatentes esta correto (nao resetado)
E turno atual esta correto
```

**Assertions criticas:**
- [ ] Nenhum dado de combate perdido entre sessoes
- [ ] Turno atual = o mesmo de quando saiu
- [ ] Round counter correto

### Cenario 3.3 — DM cria novo combate reutilizando dados (P1)

```
DADO que o DM esta no dashboard
QUANDO clica "Nova Sessao"
ENTAO pode adicionar combatentes manualmente
OU pode buscar no compendium/presets
```

### Cenario 3.4 — DM acessa presets salvos (P1)

```
QUANDO DM navega para /app/presets
ENTAO ve lista de presets de monstros salvos anteriormente
E pode clicar em um preset para ver detalhes
```

### Cenario 3.5 — DM acessa campanha com player characters (P2)

```
QUANDO DM navega para /app/campaigns/[id]
ENTAO ve lista de player characters da campanha
E pode ver nome, classe, HP de cada PC
```

---

## J4 — O Visitante que Experimenta (/try)

> **Hipotese validada:** H2 — Onboarding de 90 segundos.
> **Metrica rastreada:** `try_combat_started` + conversao try → signup

### Precondition
- Browser limpo, sem cookies, sem login

### Cenario 4.1 — Visitante acessa /try sem login (P0)

```
DADO browser sem autenticacao
QUANDO navega para /try
ENTAO pagina carrega sem redirect para login
E formulario de adicionar combatentes esta visivel
E NAO ha navbar de app logado (ou ha navbar simplificada)
```

### Cenario 4.2 — Visitante roda combate completo no /try (P0)

```
DADO que visitante esta no /try
QUANDO adiciona "Guerreiro" (HP:45, AC:18, Init:15)
E adiciona "Goblin" (HP:7, AC:15, Init:12)
E clica "Iniciar Combate"
ENTAO combate ativo aparece
E pode avancar turnos
E pode ajustar HP
E pode aplicar condicoes

QUANDO finaliza o combate (end encounter)
ENTAO modal de upsell aparece incentivando signup
```

**Assertions criticas:**
- [ ] Combate funciona 100% sem login
- [ ] Dados armazenados em localStorage (nao Supabase)
- [ ] Upsell modal aparece ao finalizar (nao antes, nao durante)

### Cenario 4.3 — Visitante NAO consegue compartilhar link (P1)

```
DADO que visitante esta no /try
ENTAO botao de compartilhar/share NAO esta visivel
OU se clicar, mostra "Crie uma conta para compartilhar"
```

### Cenario 4.4 — Edge Case: Visitante fecha e reabre /try (P2)

```
DADO que visitante adicionou combatentes no /try
QUANDO fecha a aba
E reabre /try
ENTAO dados podem ou nao estar salvos (localStorage)
— se estiverem, otimo; se nao, aceitavel
```

---

## J5 — O Compartilhamento Organico (Share Link)

> **Hipotese validada:** H1 — Player view e o gatilho de compartilhamento.
> **Metrica rastreada:** `invite_link_copied` + `referral_registered`

### Precondition
- DM_PRIMARY em sessao com combate ativo

### Cenario 5.1 — DM gera e copia link de compartilhamento (P0)

```
DADO DM em combate ativo
QUANDO clica no botao de compartilhar
E gera link
ENTAO URL de join aparece num campo copiavel
E URL e valida (contém /join/ + token)
```

### Cenario 5.2 — Link gerado funciona para outro usuario (P0)

```
DADO que DM gerou link /join/[token]
QUANDO outro browser (contexto limpo) acessa essa URL
ENTAO ve formulario de late-join OU player-view
E NAO ve erro 404 ou 500
```

### Cenario 5.3 — Multiplos players podem usar o mesmo link (P1)

```
DADO que DM gerou 1 link
QUANDO Player A acessa /join/[token] e faz late-join
E Player B acessa /join/[token] e faz late-join
ENTAO ambos aparecem na lista de iniciativa do DM
E ambos veem o player-view com todos os combatentes
```

### Cenario 5.4 — Link permanece valido durante todo o combate (P1)

```
DADO que DM gerou link e iniciou combate
E DM avancou 5 turnos
QUANDO novo player acessa /join/[token]
ENTAO ainda funciona (token nao expirou)
E player ve o estado atual do combate (nao do inicio)
```

### Cenario 5.5 — Link expira apos DM finalizar sessao (P2)

```
DADO que DM finalizou o combate/encontro
QUANDO alguem acessa /join/[token]
ENTAO ve mensagem de "sessao encerrada" (nao erro tecnico)
```

---

## J6 — Combate Completo (Core Loop)

> **Hipotese validada:** Core product — se isso falhar, nada mais importa.
> **Metrica rastreada:** `combat_completed` + `session_duration`

### Precondition
- DM_PRIMARY em combate ativo com >= 3 combatentes

### Cenario 6.1 — DM avanca turnos em sequencia (P0)

```
DADO combate ativo com Paladino(init:18), Mago(init:12), Goblin(init:8)
QUANDO DM clica "Proximo Turno" 3 vezes
ENTAO turno avanca: Paladino → Mago → Goblin → Paladino (round 2)
E round counter incrementa de 1 para 2
```

### Cenario 6.2 — DM ajusta HP de combatente (P0)

```
DADO combate ativo com Goblin (HP:7/7)
QUANDO DM clica no HP do Goblin
E abre HP adjuster
E aplica -5 de dano
ENTAO HP do Goblin mostra 2/7
E barra de HP mostra tier CRITICAL (vermelho)
E flash de dano aparece (animacao vermelha)
```

### Cenario 6.3 — DM derrota combatente (HP chega a 0) (P0)

```
DADO Goblin com HP:2/7
QUANDO DM aplica -3 de dano
ENTAO HP do Goblin = 0 (ou clamped)
E Goblin aparece com visual de "derrotado" (opacidade 50%)
```

### Cenario 6.4 — DM aplica condicao a combatente (P1)

```
DADO combate ativo
QUANDO DM clica no seletor de condicoes do Goblin
E seleciona "Amedrontado" / "Frightened"
ENTAO badge de condicao aparece no Goblin
E Player ve a condicao tambem (se conectado)
```

### Cenario 6.5 — DM cura combatente (P1)

```
DADO Goblin com HP:2/7
QUANDO DM aplica +3 de cura via HP adjuster
ENTAO HP do Goblin = 5/7
E flash de cura aparece (animacao verde)
E tier muda para MODERATE
```

### Cenario 6.6 — DM reordena iniciativa via drag (P2)

```
DADO combate ativo com ordem Paladino → Mago → Goblin
QUANDO DM arrasta Goblin para cima de Mago
ENTAO nova ordem: Paladino → Goblin → Mago
E proximos turnos seguem a nova ordem
```

### Cenario 6.7 — DM finaliza encontro (P0)

```
DADO combate ativo
QUANDO DM clica "Finalizar Encontro" (data-testid="end-encounter-btn")
E confirma no dialog de confirmacao
ENTAO combate ativo desaparece
E DM volta para tela de setup ou dashboard
```

---

## J7 — Busca no Compendium + Oracle

> **Impacto:** Preparacao do DM — feature de retencao

### Cenario 7.1 — DM busca monstro via Command Palette (P1)

```
DADO DM logado em qualquer pagina do /app
QUANDO pressiona Ctrl+K
ENTAO Command Palette abre

QUANDO digita "Goblin"
ENTAO resultados aparecem agrupados por tipo
E monstros com "Goblin" no nome aparecem primeiro
E CR e nivel sao exibidos
```

### Cenario 7.2 — DM busca spell via Compendium (P1)

```
DADO DM em /app/compendium?tab=spells
QUANDO digita "Fireball" na busca
ENTAO resultados de spell aparecem
QUANDO clica em "Fireball"
ENTAO modal com descricao completa da spell abre
```

### Cenario 7.3 — DM busca condicao via Compendium (P2)

```
DADO DM em /app/compendium?tab=conditions
QUANDO busca "Frightened"
ENTAO card da condicao aparece com regras completas
```

### Cenario 7.4 — DM busca monstro no Command Palette durante combate (P1)

```
DADO DM em combate ativo
QUANDO pressiona Ctrl+K
E busca "Orc"
E clica "Pin" no resultado
ENTAO FloatingCardContainer mostra o stat block do Orc
E card fica acessivel enquanto gerencia o combate
```

---

## J8 — Audio/Soundboard durante Combate

> Coberta pelos testes existentes. Cenarios adicionais:

### Cenario 8.1 — Soundboard so aparece no turno do Player (P1)

```
DADO Player no player-view
E NAO e seu turno
ENTAO FAB do soundboard NAO esta visivel OU esta desabilitado

QUANDO turno muda para o Player
ENTAO FAB aparece
E presets estao habilitados
```

### Cenario 8.2 — DM recebe audio transmitido pelo player (P1)

```
DADO Player no seu turno clica preset "Bola de Fogo"
ENTAO DM recebe evento de audio
E DM audio controls mostra "Ultimo som: Bola de Fogo"
```

---

## Matriz de Cobertura: Testes Existentes vs. Necessarios

| Cenario | Prioridade | Teste Existente? | Spec File |
|---|---|---|---|
| J1.1 Happy path primeiro combate | P0 | SIM (parcial) | session-create.spec.ts |
| J1.2 Gerar share link | P0 | SIM | session-create.spec.ts |
| J1.3 Quick combat | P0 | NAO | **CRIAR** |
| J1.4 Iniciar sem combatentes | P1 | NAO | **CRIAR** |
| J1.6 Persistencia setup | P1 | NAO | **CRIAR** |
| J2.1 Player autenticado late-join | P0 | SIM | player-join.spec.ts |
| J2.2 Player anonimo late-join | P0 | SIM | player-join.spec.ts |
| J2.3 HP update real-time | P0 | NAO | **CRIAR** |
| J2.4 Notificacao turno | P1 | NAO | **CRIAR** |
| J2.5 Soundboard turno | P1 | SIM | soundboard.spec.ts |
| J2.6 Link invalido | P1 | NAO | **CRIAR** |
| J2.7 Reconexao | P2 | Parcial | language.spec.ts |
| J2.8 Mobile player | P0 | NAO | **CRIAR** |
| J3.1 Dashboard sessoes anteriores | P0 | NAO | **CRIAR** |
| J3.2 Retomar sessao ativa | P0 | NAO | **CRIAR** |
| J3.4 Presets salvos | P1 | NAO | **CRIAR** |
| J4.1 /try sem login | P0 | SIM | try-mode.spec.ts |
| J4.2 Combate completo /try | P0 | SIM | try-mode.spec.ts |
| J4.3 Sem share no /try | P1 | NAO | **CRIAR** |
| J5.1 Gerar link | P0 | SIM | session-create.spec.ts |
| J5.2 Link funciona | P0 | SIM | player-join.spec.ts |
| J5.3 Multiplos players | P1 | NAO | **CRIAR** |
| J5.4 Link valido durante combate | P1 | NAO | **CRIAR** |
| J6.1 Avancar turnos | P0 | SIM | turn-advance.spec.ts |
| J6.2 Ajustar HP | P0 | SIM (parcial) | turn-advance.spec.ts |
| J6.3 Derrotar combatente | P0 | NAO | **CRIAR** |
| J6.4 Aplicar condicao | P1 | NAO | **CRIAR** |
| J6.5 Curar combatente | P1 | NAO | **CRIAR** |
| J6.7 Finalizar encontro | P0 | SIM | turn-advance.spec.ts |
| J7.1 Command Palette busca | P1 | NAO | **CRIAR** |
| J7.2 Compendium spells | P1 | NAO | **CRIAR** |

**Resumo:** 14 cenarios cobertos, 18 cenarios a criar. Gaps criticos em J3 (retencao) e J6 (HP/condicoes detalhados).

---

## Criterios de Qualidade por Jornada

### Performance
- [ ] Primeira carga de qualquer pagina: < 3s (LCP)
- [ ] Transicao setup → combate ativo: < 2s
- [ ] Atualizacao realtime HP (DM → Player): < 3s
- [ ] Abertura do Command Palette: < 500ms

### Resiliencia
- [ ] Nenhuma tela branca em qualquer fluxo
- [ ] Nenhum erro 500 visivel ao usuario
- [ ] Dados de combate persistidos entre refreshes
- [ ] Reconexao automatica apos queda de internet

### Mobile (Pixel 5 viewport)
- [ ] Todas as jornadas J1-J5 funcionam em mobile
- [ ] Sem overflow horizontal em nenhuma tela
- [ ] Touch targets >= 44px
- [ ] Formularios usaveis sem zoom

### Acessibilidade
- [ ] Skip navigation funcional
- [ ] Contraste minimo WCAG AA em textos criticos
- [ ] Focus trap em modais
- [ ] ARIA labels em botoes de icone

---

## Dados de Teste

### Combatentes Padrao

| Nome | HP | AC | Init | Tipo |
|---|---|---|---|---|
| Paladino | 45 | 18 | 15 | PC |
| Mago | 30 | 12 | 12 | PC |
| Clerigo | 35 | 16 | 10 | PC |
| Goblin | 7 | 15 | 12 | NPC |
| Goblin Chefe | 21 | 17 | 14 | NPC |
| Orc | 15 | 13 | 8 | NPC |
| Dragao Jovem | 178 | 18 | 16 | NPC (boss) |

### Contas de Teste

| Role | Conta | Locale |
|---|---|---|
| DM pt-BR | DM_PRIMARY | pt-BR |
| DM en | DM_ENGLISH | en |
| Player pt-BR | PLAYER_WARRIOR | pt-BR |
| Player en | PLAYER_ENGLISH | en |
| Player novo | PLAYER_FRESH | pt-BR |
| Player anonimo | (sem conta) | — |

---

## Proximos Passos

1. **Imediato:** Criar specs e2e para os 18 cenarios faltantes (prioridade P0 primeiro)
2. **Semana 1:** Rodar suite completa contra producao e corrigir falhas
3. **Semana 2:** Adicionar cenarios P2 e edge cases
4. **Ongoing:** Suite roda em CI em cada PR

---

_Documento gerado com base no Market Research + exploracao de codebase em 2026-03-27._