# Documentacao Completa de QA — Cenarios E2E para Agente de IA

**Projeto:** Taverna do Mestre (projeto-rpg)
**Autor:** Quinn (QA Engineer) + Perspectiva UX Designer
**Data:** 2026-03-27
**Formato:** Given-When-Then (GWT) — otimizado para execucao por agente de IA no navegador
**Idioma dos cenarios:** Portugues (acoes de UI em ingles quando necessario para seletores)

---

## Convencoes para o Agente de IA

### Nomenclatura de Seletores

- Usar `data-testid` quando disponivel
- Fallback: `role` + `name` (acessibilidade)
- Fallback: texto visivel na tela
- Nunca usar seletores CSS frageis (classes geradas)

### Timeouts

- Navegacao de pagina: ate 10s
- Acoes de UI (clique, digitacao): ate 3s
- Realtime sync (broadcast): ate 5s
- Supabase auth: ate 15s

### Variaveis de Ambiente

```
BASE_URL=http://localhost:3000  (ou URL de producao)
DM_EMAIL=test-dm@example.com
DM_PASSWORD=TestPassword123!
PLAYER_NAME=Jogador Teste
CAMPAIGN_NAME=Campanha QA
```

---

## MODULO 1: AUTENTICACAO E CRIACAO DE CONTA

### 1.1 Sign-Up (Criacao de Conta — Perspectiva DM)

**Rota:** `/auth/sign-up`

#### Cenario 1.1.1: Criacao de conta com email valido

```gherkin
GIVEN o usuario esta na pagina /auth/sign-up
WHEN preenche o campo "Email" com "novo-dm@example.com"
AND preenche o campo "Senha" com "MinhaS3nha!Forte"
AND clica no botao "Criar conta" (ou "Sign up")
THEN deve exibir mensagem de sucesso indicando que um email de confirmacao foi enviado
AND a pagina deve redirecionar para /auth/sign-up-success
```

**UX Esperada:** Formulario limpo, dark theme (#1a1a2e), campos com labels claras. Botao de submit fica desabilitado enquanto campos estao vazios. Apos submit, feedback visual imediato (loading spinner no botao). Mensagem de sucesso deve ser clara: "Verifique seu email para confirmar a conta."

#### Cenario 1.1.2: Tentativa de criar conta com email ja existente

```gherkin
GIVEN o usuario esta na pagina /auth/sign-up
WHEN preenche o campo "Email" com um email ja cadastrado
AND preenche o campo "Senha" com uma senha valida
AND clica no botao "Criar conta"
THEN deve exibir mensagem de erro indicando que o email ja esta em uso
AND o usuario permanece na pagina de sign-up
```

#### Cenario 1.1.3: Validacao de campos obrigatorios

```gherkin
GIVEN o usuario esta na pagina /auth/sign-up
WHEN clica no botao "Criar conta" sem preencher nenhum campo
THEN deve exibir mensagens de validacao nos campos Email e Senha
AND o formulario NAO deve ser submetido
```

#### Cenario 1.1.4: Senha fraca

```gherkin
GIVEN o usuario esta na pagina /auth/sign-up
WHEN preenche "Email" com um email valido
AND preenche "Senha" com "123"
AND clica no botao "Criar conta"
THEN deve exibir mensagem indicando requisitos minimos de senha
```

---

### 1.2 Login (Perspectiva DM)

**Rota:** `/auth/login`

#### Cenario 1.2.1: Login com credenciais validas

```gherkin
GIVEN o usuario esta na pagina /auth/login
WHEN preenche o campo "Email" com DM_EMAIL
AND preenche o campo "Senha" com DM_PASSWORD
AND clica no botao "Entrar" (ou "Sign in")
THEN deve redirecionar para /app/dashboard
AND o dashboard deve carregar com o nome do usuario visivel
AND o tempo de carregamento deve ser < 3 segundos
```

**UX Esperada:** Transicao suave para o dashboard. Se for primeiro login, redireciona para /app/onboarding em vez do dashboard. Dark theme consistente. Nenhum flash de tela branca durante a transicao.

#### Cenario 1.2.2: Login com senha incorreta

```gherkin
GIVEN o usuario esta na pagina /auth/login
WHEN preenche o campo "Email" com DM_EMAIL
AND preenche o campo "Senha" com "SenhaErrada123"
AND clica no botao "Entrar"
THEN deve exibir mensagem de erro "Credenciais invalidas" (ou equivalente)
AND o usuario permanece na pagina de login
AND o campo de senha deve ser limpo
```

#### Cenario 1.2.3: Navegacao entre Login e Sign-up

```gherkin
GIVEN o usuario esta na pagina /auth/login
WHEN clica no link "Criar conta" (ou tab "Sign up")
THEN deve navegar para /auth/sign-up (ou trocar de tab)
AND os campos do formulario de sign-up devem estar vazios
```

#### Cenario 1.2.4: Recuperacao de senha

```gherkin
GIVEN o usuario esta na pagina /auth/login
WHEN clica no link "Esqueceu sua senha?" (ou "Forgot password")
THEN deve navegar para /auth/forgot-password
WHEN preenche o campo "Email" com DM_EMAIL
AND clica no botao de enviar
THEN deve exibir mensagem confirmando envio do email de recuperacao
```

---

### 1.3 Sign-Up via Convite (Perspectiva Player)

**Rota:** `/invite/[token]?campaign=CAMPAIGN_ID`

#### Cenario 1.3.1: Jogador acessa link de convite valido

```gherkin
GIVEN o DM gerou um link de convite para a campanha
WHEN o jogador acessa /invite/[token]?campaign=[id]
THEN deve exibir informacoes da campanha (nome)
AND deve oferecer opcao de criar conta ou fazer login
AND o parametro de convite deve ser preservado no fluxo de auth
```

#### Cenario 1.3.2: Jogador cria conta via convite

```gherkin
GIVEN o jogador esta na pagina de convite
WHEN escolhe "Criar conta"
AND preenche email e senha
AND confirma o email
THEN deve ser redirecionado para a campanha do convite
AND seu personagem deve estar linkado a campanha automaticamente
```

#### Cenario 1.3.3: Convite expirado

```gherkin
GIVEN o link de convite expirou (>7 dias)
WHEN o jogador acessa /invite/[token]
THEN deve exibir mensagem clara de que o convite expirou
AND deve sugerir que o jogador peca um novo convite ao mestre
```

---

## MODULO 2: ONBOARDING (Perspectiva DM — Primeiro Acesso)

**Rota:** `/app/onboarding`

### 2.1 Wizard Completo de Onboarding

#### Cenario 2.1.1: DM novo e redirecionado para onboarding

```gherkin
GIVEN o DM acabou de confirmar o email e faz login pela primeira vez
AND o DM nao tem nenhuma campanha criada
WHEN o dashboard carrega
THEN deve redirecionar automaticamente para /app/onboarding
AND o wizard de onboarding deve estar no Step 1
```

**UX Esperada:** Redirect automatico, sem flash do dashboard vazio. Wizard com stepper visual mostrando progresso (4 steps). Cada step deve ter titulo claro e instrucoes minimas. Botao "Proximo" so habilita quando campo obrigatorio esta preenchido.

#### Cenario 2.1.2: Step 1 — Criar Campanha

```gherkin
GIVEN o DM esta no Step 1 do onboarding wizard
WHEN preenche o campo "Nome da Campanha" com "Mina Perdida de Phandelver"
AND clica em "Proximo"
THEN deve avancar para o Step 2
AND o stepper deve mostrar Step 1 como completo
```

#### Cenario 2.1.3: Step 1 — Validacao de nome

```gherkin
GIVEN o DM esta no Step 1 do onboarding wizard
WHEN tenta avancar sem preencher o nome da campanha
THEN o botao "Proximo" deve estar desabilitado OU exibir erro de validacao
AND o wizard NAO avanca
```

#### Cenario 2.1.4: Step 2 — Adicionar Jogadores

```gherkin
GIVEN o DM esta no Step 2 do onboarding wizard
WHEN clica em "Adicionar Jogador"
AND preenche "Nome" com "Thorin"
AND preenche "HP Maximo" com "45"
AND preenche "AC" com "18"
AND preenche "Spell Save DC" com "14"
THEN o jogador "Thorin" deve aparecer na lista
AND deve ser possivel adicionar mais jogadores (ate 8)
```

**UX Esperada:** Campos inline para adicao rapida. Cada jogador adicionado aparece como um card/row na lista. Botao de remover (X) em cada jogador. Limite de 8 jogadores deve ser comunicado visualmente quando atingido.

#### Cenario 2.1.5: Step 2 — Minimo de jogadores

```gherkin
GIVEN o DM esta no Step 2 sem nenhum jogador adicionado
WHEN tenta avancar para Step 3
THEN deve permitir avancar (jogadores podem ser adicionados depois)
OR exibir aviso de que nenhum jogador foi adicionado
```

#### Cenario 2.1.6: Step 3 — Criar Encontro

```gherkin
GIVEN o DM esta no Step 3 do onboarding wizard
WHEN preenche "Nome do Encontro" com "Emboscada na Estrada"
AND clica em "Proximo"
THEN deve avancar para o Step 4 (confirmacao)
```

#### Cenario 2.1.7: Step 4 — Confirmacao e Link

```gherkin
GIVEN o DM esta no Step 4 (confirmacao)
WHEN revisa os dados exibidos (campanha, jogadores, encontro)
AND clica em "Confirmar" (ou "Criar Sessao")
THEN deve criar a campanha, sessao e encontro no banco
AND deve gerar um link de sessao compartilhavel (/join/[token])
AND deve exibir o link com botao de copiar
AND deve ser possivel navegar para a sessao de combate
```

**UX Esperada:** Tela de confirmacao mostra resumo visual de tudo criado. Link compartilhavel em destaque com botao "Copiar Link". Animacao sutil de sucesso. CTA claro para "Ir para Sessao" que leva direto ao combat tracker.

---

## MODULO 3: DASHBOARD E GERENCIAMENTO

### 3.1 Dashboard Principal (Perspectiva DM)

**Rota:** `/app/dashboard`

#### Cenario 3.1.1: Dashboard carrega com campanhas existentes

```gherkin
GIVEN o DM esta logado e tem campanhas criadas
WHEN acessa /app/dashboard
THEN deve exibir lista de campanhas do DM
AND deve exibir encontros recentes/ativos
AND deve ter botao para criar nova campanha
AND deve ter botao para criar nova sessao
```

#### Cenario 3.1.2: Criar nova campanha pelo dashboard

```gherkin
GIVEN o DM esta no dashboard
WHEN clica em "Nova Campanha"
AND preenche o nome "Campanha da Morte"
AND confirma a criacao
THEN a nova campanha deve aparecer na lista
AND deve ser possivel gerenciar jogadores da campanha
```

#### Cenario 3.1.3: Gerenciar jogadores de uma campanha

```gherkin
GIVEN o DM esta visualizando uma campanha
WHEN clica em "Adicionar Jogador"
AND preenche nome, HP, AC, Spell Save DC
AND salva
THEN o jogador deve aparecer na lista de jogadores da campanha
AND deve ser possivel editar ou remover o jogador
```

---

## MODULO 4: COMBATE — PERSPECTIVA DO MESTRE (DM)

### 4.1 Setup de Encontro

**Rota:** `/app/session/[id]`

#### Cenario 4.1.1: Adicionar monstros ao encontro (pre-combate)

```gherkin
GIVEN o DM esta na tela de setup do encontro
WHEN busca "Goblin" no campo de busca de monstros
THEN deve exibir resultados do compendium SRD
WHEN seleciona "Goblin" dos resultados
AND define quantidade como 3
AND clica em "Adicionar"
THEN 3 goblins devem aparecer na lista de combatentes
AND cada goblin deve ter nome unico (Goblin 1, Goblin 2, Goblin 3)
AND HP, AC devem ser pre-preenchidos com valores do SRD
```

**UX Esperada:** Busca instantanea (< 300ms) no compendium client-side. Resultados aparecem como dropdown com stat preview. Monstros adicionados aparecem na lista de combatentes imediatamente (optimistic UI). Cada monstro e editavel inline.

#### Cenario 4.1.2: Rolar iniciativa

```gherkin
GIVEN o DM tem combatentes na lista (monstros + jogadores)
WHEN clica no botao "Rolar Iniciativa" (ou equivalente)
THEN todos os combatentes devem receber um valor de iniciativa
AND a lista deve ser reordenada por iniciativa (maior primeiro)
AND deve ser possivel editar a iniciativa de qualquer combatente manualmente
```

#### Cenario 4.1.3: Reordenar combatentes por drag-and-drop

```gherkin
GIVEN a lista de iniciativa esta visivel
WHEN o DM arrasta um combatente para outra posicao
THEN a ordem de iniciativa deve ser atualizada
AND a nova ordem deve ser refletida para jogadores conectados (realtime)
```

#### Cenario 4.1.4: Iniciar combate

```gherkin
GIVEN o DM configurou os combatentes e iniciativa
WHEN clica em "Iniciar Combate" (ou transicao para modo combate)
THEN o primeiro combatente na ordem de iniciativa deve ser destacado como turno atual
AND o contador de round deve mostrar "Round 1"
AND o combate deve ser marcado como ativo
```

### 4.2 Loop de Combate

#### Cenario 4.2.1: Avancar turno

```gherkin
GIVEN o combate esta ativo e e o turno do "Goblin 1"
WHEN o DM clica em "Proximo Turno" (ou botao de avancar)
THEN o destaque de turno atual deve mover para o proximo combatente na ordem
AND se for o ultimo combatente do round, o round deve incrementar (+1)
AND combatentes derrotados devem ser pulados automaticamente
```

**UX Esperada:** Transicao suave do indicador de turno. O combatente ativo deve ficar visualmente distinto (borda brilhante, highlight). Round counter atualiza em tempo real. Player view recebe broadcast do avancar turno em < 2s.

#### Cenario 4.2.2: Aplicar dano a combatente

```gherkin
GIVEN o combate esta ativo
WHEN o DM clica no combatente "Goblin 1"
AND insere "8" no campo de dano
AND confirma o dano
THEN o HP atual do Goblin 1 deve diminuir em 8
AND a barra de HP deve atualizar visualmente
AND se HP <= 0, o Goblin deve ser marcado como derrotado automaticamente (ou oferecer opcao)
AND a acao deve ser adicionada ao historico de undo
```

**UX Esperada:** Campo de dano abre inline ou via popover. Input numerico com foco automatico. Enter confirma. Barra de HP anima suavemente. Tiers de HP DEVEM seguir: LIGHT (>70%), MODERATE (40-70%), HEAVY (10-40%), CRITICAL (<=10%). Feedback visual imediato (optimistic UI).

#### Cenario 4.2.3: Curar combatente

```gherkin
GIVEN o combatente "Thorin" tem HP 30/45
WHEN o DM seleciona modo "Curar"
AND insere "10"
AND confirma
THEN o HP de Thorin deve ir para 40/45
AND o HP NAO deve ultrapassar o HP maximo (cap em max_hp)
```

#### Cenario 4.2.4: Undo de acao de HP

```gherkin
GIVEN o DM acabou de aplicar dano a um combatente
WHEN clica no botao "Desfazer" (undo)
THEN o HP do combatente deve voltar ao valor anterior
AND a barra de HP deve atualizar
AND o historico de undo deve mover para a acao anterior
```

#### Cenario 4.2.5: Adicionar HP temporario

```gherkin
GIVEN o combatente "Thorin" tem HP 45/45 e 0 temp HP
WHEN o DM adiciona 10 de HP temporario
THEN o temp HP deve mostrar "+10" ou equivalente visual
AND dano futuro deve ser absorvido pelo temp HP primeiro
```

#### Cenario 4.2.6: Aplicar condicao

```gherkin
GIVEN o combate esta ativo
WHEN o DM seleciona o combatente "Goblin 1"
AND abre o seletor de condicoes
AND seleciona "Poisoned"
THEN o badge "Poisoned" deve aparecer no combatente
AND a condicao deve ser visivel no player view
AND deve ser possivel remover a condicao clicando no badge
```

**UX Esperada:** Seletor de condicoes como dropdown ou grid com icones. Condicoes ativas aparecem como badges coloridos no combatente. Clicar no badge mostra descricao da condicao (tooltip ou modal). Remover e intuitivo (X no badge ou toggle).

#### Cenario 4.2.7: Marcar combatente como derrotado

```gherkin
GIVEN o Goblin 1 esta ativo no combate
WHEN o DM marca o Goblin 1 como derrotado
THEN o Goblin 1 deve ficar visualmente diferente (opacidade reduzida, tachado, etc.)
AND o turno deve pular este combatente automaticamente
AND o player view deve refletir a derrota
```

### 4.3 Mid-Combat (Acoes Especiais)

#### Cenario 4.3.1: Adicionar monstro no meio do combate

```gherkin
GIVEN o combate esta ativo no Round 3
WHEN o DM clica em "Adicionar Combatente" (mid-combat)
AND busca e adiciona "Ogre"
AND define iniciativa como 15
THEN o Ogre deve ser inserido na posicao correta da ordem de iniciativa
AND o turno atual NAO deve ser interrompido
AND os jogadores conectados devem ver o novo combatente aparecer (realtime)
```

**UX Esperada:** Botao de adicionar mid-combat deve ser acessivel sem navegar fora do combate. O novo combatente aparece com animacao de entrada. A ordem de iniciativa se reajusta suavemente. Nenhum combatente perde seu turno.

#### Cenario 4.3.2: Usar display name para anti-metagaming

```gherkin
GIVEN o DM adicionou um "Adult Red Dragon" ao encontro
WHEN o DM edita o campo "Display Name" para "Criatura Misteriosa"
THEN no player view, o combatente deve aparecer como "Criatura Misteriosa"
AND no DM view, deve mostrar o nome real + display name
AND o stat block original deve permanecer acessivel ao DM
```

#### Cenario 4.3.3: Agrupar monstros

```gherkin
GIVEN existem 4 goblins no encontro
WHEN o DM agrupa os goblins (monster grouping)
THEN os goblins devem aparecer sob um header de grupo
AND cada goblin mantem HP individual
AND deve ser possivel expandir/colapsar o grupo
AND a iniciativa do grupo pode ser coletiva
```

#### Cenario 4.3.4: Editar stats mid-combat

```gherkin
GIVEN o combate esta ativo
WHEN o DM clica para editar os stats de um combatente
AND altera AC de 15 para 17
AND salva
THEN o AC atualizado deve ser visivel no DM view
AND a alteracao NAO deve ser visivel no player view (AC e DM-only para monstros)
```

### 4.4 Compartilhamento e Sessao

#### Cenario 4.4.1: Gerar link de sessao

```gherkin
GIVEN o DM esta em uma sessao ativa
WHEN clica no botao "Compartilhar Sessao" (ShareSessionButton)
THEN deve gerar um link /join/[token]
AND deve exibir o link com botao de copiar
AND o link deve ser valido e funcional
```

#### Cenario 4.4.2: Notas privadas do GM

```gherkin
GIVEN o DM esta em combate
WHEN abre o painel de notas (GM Notes)
AND escreve "O dragao foge com HP < 50%"
AND fecha o painel
THEN as notas devem persistir durante a sessao
AND as notas NUNCA devem aparecer no player view
AND as notas devem ser acessiveis ao reabrir o painel
```

#### Cenario 4.4.3: Compartilhar arquivo na sessao

```gherkin
GIVEN o DM esta em uma sessao ativa
WHEN clica em "Compartilhar Arquivo" (FileShareButton)
AND seleciona uma imagem do mapa
THEN os jogadores conectados devem receber/ver o arquivo compartilhado
AND o arquivo deve ser visivel no player view
```

---

## MODULO 5: COMBATE — PERSPECTIVA DO JOGADOR (PLAYER)

### 5.1 Entrada na Sessao (Player Join)

**Rota:** `/join/[token]`

#### Cenario 5.1.1: Jogador acessa link de sessao valido

```gherkin
GIVEN o DM compartilhou o link /join/[token]
WHEN o jogador abre o link no navegador (mobile)
THEN deve carregar a pagina de join
AND deve fazer sign-in anonimo automaticamente (sem interacao do usuario)
AND deve exibir o lobby de jogadores (PlayerLobby)
AND o tempo total de carregamento deve ser < 5 segundos
```

**UX Esperada:** Zero fricao. Nenhum formulario de login. A pagina carrega e o jogador ja esta "dentro". Layout mobile-first (touch-optimized). Dark theme consistente. Sensacao de "entrar na taverna" — rapido, atmosferico, sem burocracia.

#### Cenario 5.1.2: Jogador registra personagem no lobby

```gherkin
GIVEN o jogador esta no PlayerLobby
WHEN preenche "Nome do Personagem" com "Elara"
AND preenche "Iniciativa" com "18"
AND preenche "HP" com "35"
AND preenche "AC" com "16"
AND clica em "Entrar no Combate" (ou "Join")
THEN o jogador deve ser registrado como combatente no encontro
AND deve aparecer na lista de iniciativa do DM
AND o DM deve receber notificacao de novo jogador (realtime)
AND o jogador deve ver o PlayerInitiativeBoard
```

**UX Esperada:** Campos minimos e claros. Tap targets >= 44x44px. Teclado numerico para HP/AC/Iniciativa. Botao de join grande e proeminente. Transicao suave do lobby para o board de combate.

#### Cenario 5.1.3: Jogador entra TARDE no combate (late join)

```gherkin
GIVEN o combate esta ativo no Round 2
AND o DM compartilhou o link
WHEN um novo jogador acessa /join/[token]
THEN deve ver o lobby com opcao de inserir iniciativa
WHEN preenche nome, HP, AC e iniciativa
AND clica em "Entrar"
THEN deve ser inserido na posicao correta da ordem de iniciativa
AND deve ver o estado atual do combate (round, turno atual)
AND outros jogadores ja conectados devem ver o novo jogador aparecer
```

**UX Esperada:** O late-joiner deve ter a mesma experiencia fluida de quem entrou no inicio. O board deve mostrar o estado atual do combate sem confusao. Animacao sutil do novo jogador aparecendo na lista.

#### Cenario 5.1.4: Link de sessao invalido ou expirado

```gherkin
GIVEN o token da sessao e invalido ou a sessao foi encerrada
WHEN o jogador acessa /join/[token-invalido]
THEN deve exibir mensagem clara de erro ("Sessao nao encontrada" ou "Sessao encerrada")
AND deve sugerir alternativa (pedir novo link ao mestre)
AND NAO deve ficar em loading infinito
```

#### Cenario 5.1.5: Jogador autenticado com personagem na campanha

```gherkin
GIVEN o jogador tem conta e um personagem na campanha do DM
WHEN acessa /join/[token] estando logado
THEN deve reconhecer o jogador e oferecer selecao do personagem existente
AND os dados (HP, AC) devem ser pre-preenchidos
AND deve permitir entrar com 1 clique
```

### 5.2 Player View — Board de Combate

#### Cenario 5.2.1: Ver ordem de iniciativa

```gherkin
GIVEN o jogador esta no PlayerInitiativeBoard
AND o combate esta ativo
THEN deve ver a lista de todos os combatentes em ordem de iniciativa
AND o combatente do turno atual deve estar destacado visualmente
AND o round atual deve estar visivel
AND a lista deve atualizar em tempo real quando o DM avanca turnos
```

**UX Esperada:** Lista vertical clara. Combatente ativo com destaque forte (borda brilhante, cor diferente). Nomes dos monstros podem ser display_names (anti-metagaming). Transicao suave quando turno muda. Mobile-first layout com scroll vertical.

#### Cenario 5.2.2: Ver HP dos aliados (jogadores) — numeros reais

```gherkin
GIVEN o jogador esta no board de combate
THEN deve ver o HP numerico de TODOS os jogadores (aliados)
AND deve ver barra de HP colorida para cada aliado
AND as cores devem seguir os tiers: verde (LIGHT >70%), amarelo (MODERATE 40-70%), laranja (HEAVY 10-40%), vermelho (CRITICAL <=10%)
```

**UX Esperada:** HP dos aliados e transparente. Numeros claros (ex: "35/45"). Barras de HP com cores consistentes com os tiers IMMUTAVEIS. Updates em tempo real quando DM aplica dano/cura.

#### Cenario 5.2.3: Ver HP dos monstros — APENAS labels de status

```gherkin
GIVEN o jogador esta no board de combate
AND existem monstros no encontro
THEN NAO deve ver numeros de HP dos monstros
AND NAO deve ver AC dos monstros
AND NAO deve ver Spell Save DC dos monstros
AND deve ver APENAS o label de status: "Ileso", "Ferido", "Muito Ferido", "Critico"
AND deve ver o nome (possivelmente display_name, nao nome real)
AND deve ver condicoes ativas dos monstros
```

**UX Esperada:** Informacao de monstros e deliberadamente limitada (anti-metagaming). Labels de status com cores correspondentes aos tiers. Monstros derrotados aparecem com visual diferente (opacidade, tachado). Nomes podem ser genericos (definidos pelo DM).

#### Cenario 5.2.4: Notificacao "Voce e o proximo!"

```gherkin
GIVEN o jogador "Elara" esta no board de combate
AND o turno atual e do combatente ANTERIOR a Elara na ordem
WHEN o DM avanca o turno para o combatente antes de Elara
THEN deve aparecer uma notificacao visual "Voce e o proximo!"
AND a notificacao deve ser visivel mas nao intrusiva
AND deve desaparecer automaticamente apos alguns segundos
```

#### Cenario 5.2.5: Notificacao "E sua vez!"

```gherkin
GIVEN o jogador "Elara" esta no board de combate
WHEN o DM avanca o turno e agora e a vez de Elara
THEN deve aparecer um overlay/notificacao proeminente "E sua vez!"
AND a notificacao deve ser visualmente impactante (animacao, cor forte)
AND deve ser possivel dispensar a notificacao (tap/click)
AND o combatente do jogador deve estar claramente destacado na lista
```

**UX Esperada:** Overlay com animacao (Framer Motion). Texto grande e claro. Cor vibrante que contrasta com o dark theme. Auto-dismiss apos 5-8 segundos OU tap para dispensar. Apos dismissar, a tela mostra o board com o jogador destacado.

#### Cenario 5.2.6: Realtime sync — atualizacoes em tempo real

```gherkin
GIVEN o jogador esta conectado no board de combate
WHEN o DM aplica dano ao Goblin 1
THEN a mudanca de status do Goblin 1 deve aparecer no player view em < 3 segundos
AND a barra/label de status deve atualizar suavemente
AND nenhuma acao do jogador deve ser necessaria (auto-refresh)
```

#### Cenario 5.2.7: Indicador de conexao

```gherkin
GIVEN o jogador esta no board de combate
THEN deve haver um indicador visual de status da conexao (SyncIndicator)
AND quando conectado: indicador verde (ou similar)
AND quando desconectado: indicador vermelho + mensagem "Reconectando..."
AND apos reconexao: estado deve sincronizar automaticamente (full state sync)
```

#### Cenario 5.2.8: Fallback de polling (conexao instavel)

```gherkin
GIVEN o jogador esta conectado mas a conexao realtime cai
WHEN mais de 3 segundos se passam sem conexao
THEN o sistema deve ativar fallback de polling automaticamente
AND o jogador deve continuar recebendo atualizacoes (com delay maior)
AND quando a conexao realtime volta, deve voltar ao modo realtime
```

### 5.3 Player — Oracle (Compendium no Player View)

#### Cenario 5.3.1: Buscar magia no player view

```gherkin
GIVEN o jogador esta no board de combate
WHEN acessa a funcao de busca de magias (Oracle/Compendium)
AND busca "Fireball"
THEN deve exibir resultado com descricao completa da magia
AND deve abrir em modal/overlay SEM navegar para fora do combate
AND ao fechar o modal, deve voltar ao board de combate
```

**UX Esperada:** Busca rapida (< 300ms). Modal overlay que nao perde o contexto do combate. Informacao da magia completa (nivel, escola, tempo de conjuracao, alcance, componentes, descricao). Botao de fechar claro. Scroll dentro do modal para magias longas.

---

## MODULO 6: GUEST MODE (Visitante)

**Rota:** `/try`

#### Cenario 6.1.1: Acessar guest mode

```gherkin
GIVEN o usuario esta na landing page (/)
WHEN clica em "Testar Gratis" (ou equivalente)
THEN deve navegar para /try
AND o combat tracker deve carregar com dados de exemplo OU vazio
AND um timer de 60 minutos deve ser visivel
AND nenhum login deve ser necessario
```

**UX Esperada:** Experiencia identica a area logada (paridade). Timer discreto mas visivel. Todas as features do combat tracker devem funcionar. Dark theme. Nenhum popup intrusivo antes do timer acabar.

#### Cenario 6.1.2: Timer expira

```gherkin
GIVEN o usuario esta no guest mode
WHEN o timer de 60 minutos chega a zero
THEN deve exibir GuestUpsellModal
AND o modal deve oferecer opcao de "Criar Conta" para manter os dados
AND o combat tracker deve ser bloqueado (nao permite novas acoes)
AND os dados NAO devem ser perdidos ate o usuario decidir
```

#### Cenario 6.1.3: Importar dados do guest para conta

```gherkin
GIVEN o usuario do guest mode decidiu criar conta
WHEN completa o sign-up e confirma email
AND faz login
THEN deve exibir GuestDataImportModal oferecendo importar os dados da sessao guest
WHEN confirma a importacao
THEN os combatentes e estado do combate devem ser transferidos para a conta
```

---

## MODULO 7: COMPENDIUM E ORACLE

**Rota:** `/app/compendium`

#### Cenario 7.1.1: Buscar monstro

```gherkin
GIVEN o DM esta na pagina do compendium
WHEN digita "Dragon" no campo de busca
THEN deve exibir resultados filtrados contendo "Dragon" em < 300ms
AND cada resultado deve mostrar: nome, CR, tipo
AND deve ser possivel expandir para ver stat block completo
```

#### Cenario 7.1.2: Buscar magia

```gherkin
GIVEN o usuario esta na secao de magias do compendium
WHEN busca "Healing Word"
THEN deve exibir a magia com: nome, nivel, escola, descricao completa
AND deve suportar busca em SRD 2014 e 2024
AND deve indicar a versao do conteudo
```

#### Cenario 7.1.3: Ver condicao

```gherkin
GIVEN o usuario esta na secao de condicoes
WHEN seleciona "Stunned"
THEN deve exibir a descricao completa da condicao
AND deve listar os efeitos mecanicos
```

---

## MODULO 8: FLUXOS CRITICOS END-TO-END (INTEGRACAO)

### 8.1 Fluxo Completo: DM cria sessao e jogador entra

```gherkin
GIVEN o DM esta logado no dashboard
WHEN cria uma nova sessao
AND adiciona 3 jogadores manualmente (Thorin, Elara, Grimjaw)
AND busca e adiciona 4 Goblins do compendium
AND rola iniciativa para todos
AND inicia o combate
AND gera link de sessao compartilhavel

# Em outro navegador/aba (simulando jogador mobile):
AND o Jogador 1 abre o link /join/[token] no celular
THEN o Jogador 1 deve ver o PlayerLobby
WHEN o Jogador 1 registra seu personagem como "Elara" com iniciativa 18
THEN o DM deve ver "Elara" aparecer na lista de combatentes (realtime)
AND o Jogador 1 deve ver o board de combate com a ordem de iniciativa

# DM aplica dano:
WHEN o DM aplica 5 de dano ao Goblin 1
THEN o Jogador 1 deve ver a mudanca de status do Goblin 1 (label muda)
AND o Jogador 1 NAO deve ver o HP numerico do Goblin

# DM avanca turno ate o jogador:
WHEN o DM avanca turnos ate chegar na vez de Elara
THEN o Jogador 1 deve receber notificacao "E sua vez!"
```

### 8.2 Fluxo Completo: Late-Join Mid-Combat

```gherkin
GIVEN o combate esta ativo no Round 3 com 3 jogadores e 4 monstros
AND o DM compartilha o link de sessao

# Novo jogador chega atrasado:
WHEN o Jogador 4 abre o link /join/[token]
THEN deve ver o lobby com informacao de que o combate ja esta em andamento
WHEN o Jogador 4 registra "Bard the Bard" com iniciativa 12
THEN deve ser inserido na posicao correta da ordem de iniciativa
AND todos os outros jogadores devem ver o novo jogador aparecer (realtime)
AND o DM deve ver o novo jogador na lista de combatentes
AND o turno atual NAO deve ser interrompido
AND o Jogador 4 deve ver o estado completo do combate (round, turno, todos os combatentes)
```

### 8.3 Fluxo Completo: Combate com Todas as Features

```gherkin
GIVEN o DM esta em uma sessao de combate ativa

# Setup:
AND tem 4 jogadores e 6 monstros (2 Goblins + 2 Wolves + 2 Skeletons)
AND os monstros estao agrupados por tipo

# Combate:
WHEN o DM avanca o turno
AND aplica dano ao Goblin 1 (derrotado)
AND aplica condicao "Frightened" ao Wolf 1
AND cura Thorin em 10 HP
AND adiciona 5 temp HP a Elara
AND adiciona um "Bugbear" mid-combat com iniciativa 14
AND edita AC do Wolf 2 de 13 para 15
AND escreve nota "Bugbear e o lider" nas GM Notes
AND muda display_name do Bugbear para "Criatura das Sombras"

THEN no DM View:
  - Goblin 1 esta marcado como derrotado
  - Wolf 1 tem badge "Frightened"
  - Thorin tem HP atualizado
  - Elara tem temp HP visivel
  - Bugbear esta na posicao correta de iniciativa
  - Wolf 2 tem AC 15
  - GM Notes mostram "Bugbear e o lider"
  - Bugbear mostra nome real + display name

AND no Player View:
  - Goblin 1 aparece derrotado
  - Wolf 1 tem badge "Frightened" visivel
  - Thorin tem HP numerico atualizado
  - Elara tem temp HP visivel
  - "Criatura das Sombras" aparece na iniciativa (NAO "Bugbear")
  - Wolf 2 NAO mostra AC
  - GM Notes NAO aparecem
  - HP dos monstros mostra APENAS labels (LIGHT/MODERATE/HEAVY/CRITICAL)
```

---

## MODULO 9: EDGE CASES E CENARIOS NEGATIVOS

#### Cenario 9.1: Recarregar pagina durante combate (DM)

```gherkin
GIVEN o DM esta no meio de um combate ativo
WHEN recarrega a pagina (F5 / refresh)
THEN o estado do combate deve ser restaurado completamente
AND o turno atual, round, HP de todos os combatentes devem estar intactos
AND o combate deve continuar normalmente
```

#### Cenario 9.2: Recarregar pagina durante combate (Player)

```gherkin
GIVEN o jogador esta no board de combate
WHEN recarrega a pagina
THEN deve reconectar automaticamente
AND o estado do combate deve ser restaurado
AND o indicador de conexao deve mostrar "Reconectando..." e depois "Conectado"
```

#### Cenario 9.3: Dois DMs tentam acessar mesma sessao

```gherkin
GIVEN o DM esta em uma sessao ativa
WHEN outra pessoa tenta acessar a URL da sessao do DM
THEN deve bloquear acesso (apenas o owner pode ver o DM view)
OR redirecionar para o player view
```

#### Cenario 9.4: Sessao sem internet (offline parcial)

```gherkin
GIVEN o DM esta em combate
WHEN a conexao com internet cai temporariamente
THEN o compendium/oracle deve continuar funcionando (cache IndexedDB)
AND acoes de combate devem ser armazenadas localmente
AND ao reconectar, o estado deve sincronizar
```

#### Cenario 9.5: Multiplos jogadores entrando simultaneamente

```gherkin
GIVEN o combate esta ativo
WHEN 5 jogadores abrem o link /join/[token] ao mesmo tempo
THEN todos devem conseguir registrar seus personagens
AND nenhum conflito de race condition deve ocorrer
AND a lista de combatentes deve ficar correta para todos
```

#### Cenario 9.6: Deletar conta

```gherkin
GIVEN o DM esta em /app/settings
WHEN clica em "Deletar Conta"
THEN deve exibir confirmacao com aviso sobre perda de dados
WHEN confirma a delecao
THEN a conta deve ser removida (LGPD compliant)
AND deve redirecionar para a landing page
AND tentar fazer login com credenciais antigas deve falhar
```

---

## MODULO 10: CHECKLIST DE VALIDACAO POR SUPERFICIE

### DM View (Desktop)

| # | Check | Prioridade |
|---|-------|-----------|
| 1 | Login funciona | P0 |
| 2 | Onboarding wizard completa sem erro | P0 |
| 3 | Dashboard carrega com campanhas | P0 |
| 4 | Criar sessao e adicionar monstros | P0 |
| 5 | Rolar iniciativa e iniciar combate | P0 |
| 6 | Avancar turno funciona corretamente | P0 |
| 7 | Aplicar dano/cura atualiza HP | P0 |
| 8 | Undo funciona | P1 |
| 9 | Condicoes podem ser adicionadas/removidas | P1 |
| 10 | Mid-combat add funciona | P1 |
| 11 | Display name funciona (anti-metagaming) | P1 |
| 12 | Monster grouping funciona | P2 |
| 13 | GM Notes salva e nao vaza para player | P1 |
| 14 | Gerar link de sessao funciona | P0 |
| 15 | Compendium busca em < 300ms | P1 |

### Player View (Mobile)

| # | Check | Prioridade |
|---|-------|-----------|
| 1 | Link /join/[token] carrega sem login | P0 |
| 2 | Lobby permite registrar personagem | P0 |
| 3 | Board mostra lista de iniciativa | P0 |
| 4 | Turno atual esta destacado | P0 |
| 5 | HP dos aliados mostra numeros reais | P0 |
| 6 | HP dos monstros mostra APENAS labels | P0 |
| 7 | AC/DC dos monstros NAO e visivel | P0 |
| 8 | Condicoes dos monstros sao visiveis | P1 |
| 9 | Notificacao "E sua vez!" aparece | P1 |
| 10 | Notificacao "Voce e o proximo!" aparece | P1 |
| 11 | Realtime sync funciona (< 3s delay) | P0 |
| 12 | Indicador de conexao funciona | P1 |
| 13 | Late-join funciona no meio do combate | P1 |
| 14 | Oracle/Compendium acessivel no player | P1 |
| 15 | Layout mobile-friendly (tap targets 44px+) | P0 |

### Guest Mode

| # | Check | Prioridade |
|---|-------|-----------|
| 1 | /try carrega sem login | P0 |
| 2 | Timer de 60 min visivel | P0 |
| 3 | Combat tracker funciona igual ao logado | P0 |
| 4 | Timer expira → modal de upsell | P1 |
| 5 | Importar dados guest para conta | P2 |

---

## Instrucoes para o Agente de IA Navegador

### Ordem de Execucao Recomendada

1. **Modulo 1** — Auth (sign-up, login) — Prerequisito para tudo
2. **Modulo 2** — Onboarding — Prerequisito para sessoes
3. **Modulo 6** — Guest Mode — Independente, pode rodar em paralelo
4. **Modulo 3** — Dashboard — Apos login
5. **Modulo 4** — Combate DM — Core do produto
6. **Modulo 5** — Combate Player — Requer sessao ativa do DM
7. **Modulo 7** — Compendium — Independente
8. **Modulo 8** — Fluxos E2E — Integra tudo
9. **Modulo 9** — Edge Cases — Apos fluxos normais passarem

### Como Reportar Bugs

Para cada falha, reportar:

```
BUG-[MODULO]-[CENARIO]: [Titulo curto]
Severidade: P0/P1/P2
Cenario: [ID do cenario, ex: 4.2.1]
Passos: [GWT que falhou]
Esperado: [O que deveria acontecer]
Atual: [O que aconteceu]
Screenshot: [Se possivel]
URL: [URL no momento da falha]
Viewport: [Desktop/Mobile + resolucao]
```

---

*Documento gerado por Quinn (QA Engineer) com perspectiva UX integrada.*
*Alinhado com PRD V2 (2026-03-27) e UX Design Specification.*
