---
status: 'complete'
completedAt: '2026-03-27'
inputDocuments:
  - docs/prd-v2.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
version: '2.0'
scope: 'Epic 3, Epic 4, Epic 5 — V2 Stories'
---

# Epics V2 — Stories Detalhadas (Epic 3, 4, 5)

---

## Epic 3: Player Experience Upgrade

Tornar a experiência do jogador conectado engajadora e fluida. O jogador deve sentir que o app foi feito para ele — notificações de turno, auto-join, role selection no cadastro, e vinculação a personagens de campanha. Depende de: Novu setup, Supabase Presence, schema V2 (users.role, migration 013).

---

### Story 3.1: Notificação visual "Você é o próximo"

As a **player**,
I want to receive a visual notification when it is one turn before my turn,
So that I can prepare my action and keep combat flowing without delays.

**FRs/NFRs:** FR48, NFR31
**Dependências:** Nenhuma (utiliza canal Realtime existente `session:{id}`)

**Acceptance Criteria:**

**Given** um combate ativo com jogadores conectados via player view
**When** o DM avança o turno e o broadcast `combat:turn_advance` inclui `next_combatant_id`
**Then** o jogador cujo `combatant_id` corresponde a `next_combatant_id` vê um banner "Você é o próximo!" na parte superior da tela
**And** o banner aparece em ≤200ms após o broadcast do DM (NFR31)
**And** o banner utiliza estilo visual distinto (cor amber/gold, ícone de alerta) mas não intrusivo

**Given** o combatante seguinte é um monstro (não um jogador)
**When** o DM avança o turno
**Then** nenhuma notificação "Você é o próximo" é exibida para nenhum jogador
**And** a lógica verifica `combatant.type === 'player'` antes de emitir a notificação

**Given** o jogador que é "o próximo" já está visualizando a player view
**When** a notificação aparece
**Then** o banner é exibido com `aria-live="polite"` para screen readers
**And** o banner possui um atributo `role="status"`

**Given** o jogador recebe a notificação "Você é o próximo"
**When** o DM avança novamente e agora é a vez desse jogador
**Then** o banner "Você é o próximo" é substituído pela notificação "É sua vez!" (Story 3.2)
**And** não há sobreposição de banners

**Given** o jogador está em uma sessão onde não é o próximo
**When** o turno avança
**Then** nenhum banner é exibido para esse jogador

**Notas técnicas:**
- O broadcast `combat:turn_advance` já existe no canal `session:{id}`. Adicionar campo `next_combatant_id` ao payload.
- Lógica client-side: comparar `next_combatant_id` com o `combatant_id` do jogador local.
- Não requer request adicional ao servidor (NFR31).
- Novu workflow `turn-upcoming` é acionado server-side como backup para jogadores com app em background (push notification futura).

---

### Story 3.2: Notificação visual "É sua vez!"

As a **player**,
I want to receive a prominent visual notification when it is my turn in combat,
So that I know immediately when to act, even if I am not looking at the screen.

**FRs/NFRs:** FR49, NFR31
**Dependências:** Story 3.1 (compartilha lógica de identificação de combatant)

**Acceptance Criteria:**

**Given** um combate ativo com jogadores conectados
**When** o DM avança o turno e `current_turn_index` aponta para o combatant do jogador
**Then** o jogador vê um banner proeminente "É sua vez!" com animação de pulso (pulse animation via Framer Motion ou CSS keyframes)
**And** a cor de fundo da player view muda para um tom dourado/amber sutil (overlay com opacity)
**And** a notificação aparece em ≤200ms após o broadcast do DM (NFR31)

**Given** o dispositivo do jogador suporta `navigator.vibrate`
**When** é a vez do jogador
**Then** o dispositivo vibra brevemente (200ms, single pulse) como feedback háptico
**And** se `navigator.vibrate` não estiver disponível (desktop, iOS Safari), a vibração é silenciosamente ignorada

**Given** é a vez do jogador
**When** a notificação "É sua vez!" está ativa
**Then** a notificação persiste enquanto for o turno do jogador (não desaparece automaticamente)
**And** o banner utiliza `aria-live="assertive"` para interromper screen readers imediatamente
**And** o banner inclui texto descritivo: "É sua vez, {playerName}!"

**Given** o turno do jogador termina (DM avança para o próximo combatant)
**When** o broadcast `combat:turn_advance` é recebido
**Then** a notificação "É sua vez!" é removida
**And** a cor de fundo retorna ao estado padrão com transição suave (200ms)
**And** a animação de pulso é interrompida

**Given** o combatant atual é um monstro
**When** o DM avança o turno
**Then** nenhum jogador recebe a notificação "É sua vez!"

**Given** o jogador recebeu a notificação mas o combate é encerrado pelo DM
**When** o broadcast `combat:end` é recebido
**Then** todas as notificações de turno são removidas imediatamente

**Notas técnicas:**
- Utilizar Framer Motion `animate` com `transition={{ repeat: Infinity }}` para pulse animation.
- Background color overlay via CSS variable toggle para performance.
- `navigator.vibrate([200])` com try-catch para compatibilidade.
- Novu workflow `turn-now` acionado server-side.

---

### Story 3.3: Player auto-join para jogadores cadastrados

As a **registered player**,
I want my character to load automatically when I enter a session linked to my campaign,
So that I can join combat instantly without re-entering my stats.

**FRs/NFRs:** FR51b
**Dependências:** Story 4.3 (campaign invite system — jogador deve estar vinculado à campanha)

**Acceptance Criteria:**

**Given** um jogador cadastrado que está vinculado a uma campanha via `player_characters`
**When** o jogador acessa `/join/[token]` de uma sessão dessa campanha
**Then** o sistema detecta que o `auth.uid()` do jogador possui um `player_character` na campanha associada à sessão
**And** os dados do personagem (nome, HP, AC, spell_save_dc) são carregados automaticamente no formulário de lobby
**And** o jogador NÃO precisa preencher o formulário manualmente

**Given** o jogador auto-join entra na sessão
**When** o DM está na view de combate
**Then** o DM vê uma notificação in-app "Jogador X entrou (auto)" via Novu workflow `player-joined`
**And** o combatant do jogador aparece na lista com status "aguardando confirmação"

**Given** o jogador auto-join teve seus dados carregados
**When** o jogador visualiza o formulário de lobby
**Then** os campos estão pré-preenchidos mas editáveis
**And** o jogador pode alterar nome, HP, AC ou spell_save_dc antes de confirmar
**And** um botão "Confirmar e Entrar" finaliza o join

**Given** o jogador confirma o auto-join
**When** o combate já está em andamento
**Then** o jogador é inserido como late-join (FR47) com prompt para inserir iniciativa
**And** o DM recebe notificação para aceitar a inserção na ordem de iniciativa

**Given** Supabase Realtime Presence está ativo no canal `session:{id}`
**When** o jogador entra na sessão
**Then** o jogador é rastreado via `channel.track({ userId, characterName, status: 'online' })`
**And** o DM vê o indicador de presença atualizado em tempo real

**Given** um jogador NÃO cadastrado (anônimo) acessa o link da sessão
**When** o sistema verifica o `auth.uid()`
**Then** o fluxo padrão de join manual (PlayerLobby com formulário vazio) é apresentado
**And** nenhuma tentativa de auto-join é feita

**Given** o jogador cadastrado possui mais de um personagem na campanha
**When** o auto-join é detectado
**Then** o jogador vê um seletor para escolher qual personagem carregar
**And** após a seleção, o formulário é pré-preenchido com os dados do personagem escolhido

**Notas técnicas:**
- Utilizar Supabase Realtime Presence no canal `session:{id}` existente (V2.8 da arquitetura).
- Query: `supabase.from('player_characters').select().eq('campaign_id', session.campaign_id).eq('user_id', auth.uid())`.
- Reutilizar canal existente — Presence adicionado ao mesmo canal, sem conexão extra.
- DM notification via Novu `player-joined` workflow.

---

### Story 3.4: Seleção de role no cadastro (Jogador / Mestre / Ambos)

As a **new user**,
I want to select my role (Player, DM, or Both) during signup,
So that the app adapts its dashboard and features to how I use it.

**FRs/NFRs:** FR50
**Dependências:** Migration 013 (adiciona coluna `role` à tabela `users`)

**Acceptance Criteria:**

**Given** um novo usuário no fluxo de signup em `/auth/sign-up`
**When** o usuário completa email e senha e clica em "Criar Conta"
**Then** uma etapa adicional é apresentada: "Como você vai usar o Pocket DM?"
**And** três opções são exibidas como cards selecionáveis: "Jogador", "Mestre", "Ambos"
**And** a opção "Ambos" está selecionada por padrão

**Given** o usuário seleciona um role
**When** clica em "Continuar"
**Then** o valor é salvo na coluna `users.role` (valores: `'player'`, `'dm'`, `'both'`)
**And** o usuário é redirecionado ao dashboard

**Given** o usuário selecionou "Jogador" (`role = 'player'`)
**When** acessa o dashboard
**Then** o dashboard mostra: campanhas em que participa, personagens, sessões ativas
**And** NÃO mostra a opção de criar campanha como DM de forma proeminente (mas não esconde)

**Given** o usuário selecionou "Mestre" (`role = 'dm'`)
**When** acessa o dashboard
**Then** o dashboard mostra: campanhas que criou, encounter builder, gerenciamento de jogadores
**And** o onboarding wizard (FR40) é apresentado na primeira vez

**Given** o usuário selecionou "Ambos" (`role = 'both'`)
**When** acessa o dashboard
**Then** o dashboard mostra todas as seções (jogador + mestre)
**And** um switcher de contexto permite alternar entre "visão de mestre" e "visão de jogador"

**Given** um usuário já cadastrado
**When** acessa Configurações → Perfil
**Then** pode alterar seu role a qualquer momento
**And** a mudança é refletida no dashboard imediatamente

**Given** o usuário pula a etapa de role selection (clica em "Pular")
**When** o cadastro é finalizado
**Then** o role padrão `'both'` é atribuído
**And** o usuário pode alterar posteriormente nas configurações

**Given** a migration 013 é aplicada
**When** o schema é verificado
**Then** a coluna `users.role` existe com tipo `TEXT`, constraint `CHECK (role IN ('player', 'dm', 'both'))`, default `'both'`
**And** usuários existentes recebem `role = 'both'`

**Notas técnicas:**
- Migration 013: `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'both' CHECK (role IN ('player', 'dm', 'both'));`
- i18n keys: `signup.role_selection.title`, `signup.role_selection.player`, `signup.role_selection.dm`, `signup.role_selection.both`, `signup.role_selection.skip`.
- Dashboard layout condicional baseado em `users.role` carregado via session.

---

### Story 3.5: DM vincula jogador da campanha a jogador temporário

As a **DM**,
I want to link a temporary player (who joined via QR code) to a campaign character,
So that the player's stats are loaded from the campaign and the link persists for future sessions.

**FRs/NFRs:** FR56
**Dependências:** Story 2.2 (campanhas existentes), Story 2.3 (player_characters existentes)

**Acceptance Criteria:**

**Given** um combate ativo com jogadores conectados via QR code / link (anônimos)
**When** um novo jogador entra na sessão via `/join/[token]`
**Then** o DM vê na interface um dropdown "Vincular a personagem:" ao lado do nome do jogador temporário
**And** o dropdown lista todos os `player_characters` da campanha que ainda não estão vinculados a um jogador na sessão

**Given** o DM seleciona um personagem da lista
**When** confirma a vinculação
**Then** os stats do `player_character` selecionado (nome, HP, AC, spell_save_dc) são carregados para o combatant do jogador
**And** o nome exibido muda para o nome do personagem da campanha
**And** a vinculação é salva: `combatants.player_character_id = player_character.id`

**Given** o jogador temporário foi vinculado a um personagem
**When** o jogador cria uma conta posteriormente (via convite ou por conta própria)
**Then** a vinculação persiste: o `player_character` é atualizado com o `user_id` do novo cadastro
**And** em sessões futuras, o auto-join (Story 3.3) utiliza essa vinculação

**Given** o DM tenta vincular um jogador a um personagem já vinculado a outro jogador na sessão
**When** seleciona o personagem no dropdown
**Then** o personagem aparece desabilitado (grayed out) com tooltip "Já vinculado a {nome}"
**And** a ação é bloqueada

**Given** o jogador temporário já preencheu seus stats manualmente no lobby
**When** o DM vincula a um personagem da campanha
**Then** os stats do formulário são substituídos pelos stats do personagem da campanha
**And** um toast confirma: "Stats carregados de {nome do personagem}"

**Given** nenhum `player_character` existe na campanha (ou todos já estão vinculados)
**When** o DM visualiza o dropdown
**Then** o dropdown exibe "Nenhum personagem disponível" desabilitado
**And** um link "Adicionar personagem à campanha" redireciona para a gestão da campanha

**Given** o DM desvincula um jogador temporário de um personagem
**When** clica em "Desvincular" ao lado do nome
**Then** o combatant retorna ao nome e stats originais (inseridos manualmente)
**And** o `player_character` volta a aparecer disponível no dropdown

**Notas técnicas:**
- Adicionar `player_character_id UUID REFERENCES player_characters(id)` à tabela `combatants` (migration ou inclusão na migration existente).
- Broadcast `session:player_linked` para atualizar a player view do jogador vinculado.
- A vinculação anônimo → cadastrado usa: `UPDATE player_characters SET user_id = {new_user_id} WHERE id = {pc_id} AND user_id IS NULL`.

---

## Epic 4: Session & Campaign Management

Experiência completa e rica para o mestre Pro. O DM deve ter ferramentas de sessão avançadas: notas privadas, compartilhamento de arquivos, convites por email, auto-link de personagens, calculadora de CR, e criação de conteúdo homebrew. Depende de: Supabase Storage, Novu email, homebrew tables, migrations 008-011.

---

### Story 4.1: Notas privadas do GM na sessão

As a **DM**,
I want to write and save private notes during a session,
So that I can keep track of important information without players seeing it.

**FRs/NFRs:** FR52
**Dependências:** Migration 008 (cria tabela `session_notes`)

**Acceptance Criteria:**

**Given** o DM está em uma sessão ativa em `/app/session/[id]`
**When** clica no ícone "Notas da Sessão" (ícone de caderno) na barra de ferramentas
**Then** um painel colapsável se expande na lateral (ou inferior) da tela
**And** o painel contém um textarea com placeholder "Escreva suas notas aqui..."
**And** o painel possui título "Notas da Sessão" (i18n: `session.notes.title`)

**Given** o DM digita no textarea
**When** para de digitar por 1 segundo (debounce de 1000ms)
**Then** o conteúdo é salvo automaticamente na tabela `session_notes` via `supabase.from('session_notes').upsert()`
**And** um indicador sutil "Salvo" aparece brevemente ao lado do título
**And** NÃO há botão manual de "Salvar" — o auto-save é o único mecanismo

**Given** as notas são salvas
**When** qualquer jogador está conectado à sessão
**Then** as notas NUNCA são incluídas em broadcasts do canal `session:{id}`
**And** as notas NUNCA aparecem na player view
**And** RLS policy garante: `auth.uid() = session_notes.user_id AND auth.uid() = sessions.owner_id`

**Given** o DM fecha e reabre a sessão
**When** abre o painel de notas
**Then** as notas anteriores são carregadas da tabela `session_notes`
**And** o DM pode continuar editando

**Given** o DM escreve notas com formatação Markdown
**When** o painel está aberto
**Then** o textarea aceita Markdown (headers, bold, italic, lists)
**And** um toggle "Preview" mostra o Markdown renderizado
**And** o modo padrão é edição (textarea puro)

**Given** o DM colapsa o painel de notas
**When** clica no ícone novamente ou no botão de fechar
**Then** o painel se recolhe sem perder conteúdo
**And** o último estado (aberto/fechado) é persistido em localStorage

**Given** a migration 008 é aplicada
**When** o schema é verificado
**Then** a tabela `session_notes` existe com colunas: `id`, `session_id`, `user_id`, `content`, `updated_at`
**And** RLS policy permite apenas o DM dono da sessão ler/escrever suas notas

**Notas técnicas:**
- Migration 008: cria `session_notes` conforme schema V2.2 da arquitetura.
- Debounce via `useDebouncedCallback` do `use-debounce` ou implementação custom.
- Markdown rendering: usar `react-markdown` (já disponível) ou similar.
- i18n keys: `session.notes.title`, `session.notes.placeholder`, `session.notes.saved`, `session.notes.preview`.

---

### Story 4.2: Compartilhamento de arquivos na sessão

As a **DM**,
I want to upload and share images and PDFs with players during a session,
So that I can share maps, handouts, and reference material in real-time.

**FRs/NFRs:** FR53, NFR32
**Dependências:** Migration 009 (cria tabela `session_files`), Supabase Storage bucket `session-files`

**Acceptance Criteria:**

**Given** o DM está em uma sessão ativa
**When** clica no botão "Compartilhar Arquivo" (ícone de upload) na barra de ferramentas
**Then** um file picker abre permitindo selecionar um arquivo
**And** tipos aceitos: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`
**And** tamanho máximo: 10MB

**Given** o DM seleciona um arquivo válido
**When** o upload inicia
**Then** o arquivo é enviado para Supabase Storage no path `session-files/{session_id}/{uuid}_{filename}`
**And** uma entrada é criada na tabela `session_files` com: `session_id`, `uploaded_by`, `file_name`, `file_path`, `file_type`, `file_size_bytes`
**And** uma barra de progresso é exibida durante o upload
**And** ao concluir, um broadcast `session:file_shared` é enviado no canal com `{ fileId, fileName, fileType }`

**Given** o DM tenta fazer upload de um arquivo com tipo inválido (ex: `.exe`, `.zip`)
**When** o arquivo é selecionado
**Then** a validação client-side rejeita com mensagem "Tipo de arquivo não permitido. Use imagens (PNG, JPG, WebP) ou PDF."
**And** a validação server-side (API route) também verifica magic bytes do arquivo
**And** arquivos com extensão válida mas magic bytes inválidos são rejeitados

**Given** o DM tenta fazer upload de um arquivo maior que 10MB
**When** o arquivo é selecionado
**Then** a validação rejeita com mensagem "Arquivo muito grande. Máximo: 10MB."
**And** a constraint `CHECK (file_size_bytes <= 10485760)` na tabela previne inserção no DB

**Given** um arquivo foi compartilhado com sucesso
**When** os jogadores recebem o broadcast `session:file_shared`
**Then** os jogadores veem um card na player view com: nome do arquivo, tipo (ícone), botão "Visualizar"
**And** ao clicar em "Visualizar", o arquivo é aberto via signed URL do Supabase Storage
**And** a signed URL expira em 1 hora (renovável ao clicar novamente)

**Given** o DM quer remover um arquivo compartilhado
**When** clica em "Remover" ao lado do arquivo na lista
**Then** o arquivo é deletado do Supabase Storage
**And** a entrada é removida da tabela `session_files`
**And** um broadcast `session:file_removed` é enviado
**And** os jogadores não veem mais o arquivo na player view

**Given** a sessão é encerrada
**When** o DM encerra a sessão
**Then** os arquivos persistem no Storage (não são deletados automaticamente)
**And** o DM pode acessar os arquivos via histórico da sessão no dashboard

**Given** a migration 009 é aplicada
**When** o schema é verificado
**Then** a tabela `session_files` existe conforme schema V2.2
**And** RLS policies permitem: upload apenas pelo DM da sessão, download por qualquer participante (DM + players com token), delete apenas pelo DM

**Notas técnicas:**
- API route: `/api/session/[id]/files/route.ts` — valida magic bytes antes de salvar.
- Magic bytes check: PNG (`89504E47`), JPEG (`FFD8FF`), WebP (`52494646`...`57454250`), PDF (`25504446`).
- Supabase Storage bucket `session-files` com policies configuradas.
- Broadcast no canal `session:{id}` existente.
- i18n keys: `session.files.upload`, `session.files.view`, `session.files.remove`, `session.files.error_type`, `session.files.error_size`.

---

### Story 4.3: Convite de jogador para campanha via email

As a **DM**,
I want to invite a player to my campaign by email,
So that they can create an account and have their character automatically linked to my campaign.

**FRs/NFRs:** FR54, NFR30
**Dependências:** Migration 010 (cria tabela `campaign_invites`), Novu workflow `campaign-invite`

**Acceptance Criteria:**

**Given** o DM está na página de gestão de campanha no dashboard
**When** clica em "Convidar Jogador"
**Then** um modal abre com campo de email e botão "Enviar Convite"

**Given** o DM insere um email válido e clica em "Enviar Convite"
**When** o convite é processado
**Then** uma entrada é criada na tabela `campaign_invites` com: `campaign_id`, `invited_by`, `email`, `token` (UUID único), `status = 'pending'`, `expires_at = now() + 7 days`
**And** um email é enviado via Novu workflow `campaign-invite` com payload: `{ campaignName, inviteLink, dmName }`
**And** o link do convite segue o formato: `/auth/sign-up?invite={token}&campaign={id}`
**And** um toast confirma: "Convite enviado para {email}"

**Given** o DM já enviou 20 convites hoje
**When** tenta enviar o 21o convite
**Then** a ação é bloqueada com mensagem "Limite de convites atingido. Você pode enviar até 20 convites por dia." (NFR30)
**And** o rate limit é verificado via query: `SELECT COUNT(*) FROM campaign_invites WHERE invited_by = auth.uid() AND created_at > now() - interval '24 hours'`

**Given** o DM envia convite para um email que já foi convidado para a mesma campanha (pending)
**When** o convite é processado
**Then** a ação é bloqueada com mensagem "Este email já possui um convite pendente para esta campanha."
**And** o DM pode opcionalmente reenviar o convite existente (reseta `expires_at`)

**Given** um convite foi enviado
**When** 7 dias se passam sem o jogador aceitar
**Then** o status do convite muda para `'expired'`
**And** o link não funciona mais (redirecionado para página de convite expirado)
**And** o DM pode enviar um novo convite para o mesmo email

**Given** o DM visualiza a lista de convites da campanha
**When** acessa a página de gestão da campanha
**Then** vê uma lista com: email, status (pendente/aceito/expirado), data de envio
**And** pode cancelar convites pendentes

**Given** a migration 010 é aplicada
**When** o schema é verificado
**Then** a tabela `campaign_invites` existe conforme schema V2.2
**And** o campo `token` é UNIQUE
**And** RLS policy: DM pode inserir (where `invited_by = auth.uid()`), select é público (validação em app layer)

**Notas técnicas:**
- Novu workflow `campaign-invite`: canal email, template com nome da campanha, link de convite, nome do DM.
- Trigger.dev task `send-campaign-invite` para processamento assíncrono do envio de email.
- Token gerado via `crypto.randomUUID()`.
- Rate limit em app layer (query count) + constraint no DB como fallback.
- i18n keys: `campaign.invite.title`, `campaign.invite.email_placeholder`, `campaign.invite.send`, `campaign.invite.sent`, `campaign.invite.limit_reached`, `campaign.invite.already_pending`.

---

### Story 4.4: Auto-link de personagem ao aceitar convite

As a **invited player**,
I want my character to be automatically linked to the DM's campaign after I sign up via the invite link,
So that I am ready to join sessions without additional setup.

**FRs/NFRs:** FR55
**Dependências:** Story 4.3 (sistema de convites)

**Acceptance Criteria:**

**Given** um jogador recebe um email de convite com link `/auth/sign-up?invite={token}&campaign={id}`
**When** clica no link e chega à página de signup
**Then** a página exibe: "Você foi convidado para a campanha '{campaignName}' por {dmName}"
**And** o formulário de signup padrão é apresentado (email, senha)
**And** o email é pré-preenchido com o email do convite (editável)

**Given** o jogador completa o signup via convite
**When** a conta é criada com sucesso
**Then** o status do convite muda para `'accepted'`
**And** o jogador é redirecionado para um wizard "Criar Personagem" específico da campanha
**And** a etapa de role selection (Story 3.4) é apresentada durante o flow

**Given** o jogador está no wizard "Criar Personagem"
**When** preenche nome, HP, AC, spell_save_dc do personagem
**Then** um `player_character` é criado com: `campaign_id`, `user_id`, `name`, `hp`, `ac`, `spell_save_dc`
**And** o personagem é automaticamente vinculado à campanha do convite
**And** o DM vê o novo personagem na lista da campanha (via Realtime ou refresh)

**Given** o jogador já possui uma conta e clica no link de convite
**When** é redirecionado para `/auth/sign-up?invite={token}&campaign={id}`
**Then** detecta que o usuário já está logado (ou redireciona para login)
**And** após login, apresenta opção: "Criar novo personagem" ou "Vincular personagem existente"

**Given** o jogador escolhe "Vincular personagem existente"
**When** seleciona um personagem da lista dos seus personagens
**Then** o `player_character` selecionado é atualizado: `campaign_id = {campaign_id}`
**And** o convite é marcado como aceito
**And** o DM vê o personagem vinculado

**Given** o token do convite está expirado
**When** o jogador clica no link
**Then** é redirecionado para uma página de erro: "Este convite expirou. Peça ao seu mestre para enviar um novo."
**And** um botão "Voltar para o início" é exibido

**Given** o token do convite já foi aceito
**When** outro jogador tenta usar o mesmo link
**Then** é exibido: "Este convite já foi utilizado."

**Notas técnicas:**
- A validação do token ocorre em server component (SSR) para segurança.
- O flow de signup preserva query params `invite` e `campaign` através do redirect de confirmação de email.
- Após email confirmation, o callback verifica presença de `invite` param e processa a aceitação.

---

### Story 4.5: Calculadora de CR (Challenge Rating)

As a **DM**,
I want an automatic CR calculator during encounter setup,
So that I can quickly assess if an encounter is Easy, Medium, Hard, or Deadly for my party.

**FRs/NFRs:** FR62
**Dependências:** Nenhuma (client-side computation)

**Acceptance Criteria:**

**Given** o DM está configurando um encontro (encounter setup)
**When** adiciona monstros ao encontro
**Then** um badge de dificuldade é exibido em tempo real: "Fácil" (verde), "Médio" (amarelo), "Difícil" (laranja), ou "Mortal" (vermelho)
**And** o badge é atualizado instantaneamente ao adicionar ou remover monstros

**Given** o DM configura o party: nível dos jogadores e quantidade de jogadores
**When** os campos "Nível do grupo" e "Número de jogadores" são preenchidos
**Then** a calculadora usa esses valores como base para determinar a dificuldade
**And** os campos são persistidos no estado do encontro para futuras recalculations

**Given** o encontro usa a fórmula DMG 2014 (XP Thresholds)
**When** a dificuldade é calculada
**Then** o sistema soma o XP total dos monstros, aplica o multiplicador de grupo (1x para 1 monstro, 1.5x para 2, 2x para 3-6, 2.5x para 7-10, 3x para 11-14, 4x para 15+)
**And** compara o XP ajustado com os thresholds por nível de jogador: Easy, Medium, Hard, Deadly
**And** exibe a classificação resultante

**Given** o encontro usa a fórmula DMG 2024 (CR Budget)
**When** a dificuldade é calculada
**Then** o sistema usa o CR budget system: Low (soma CR < 50% budget), Moderate (50-75%), High (75-100%), Deadly (>100%)
**And** o budget é baseado em nível × número de jogadores
**And** exibe a classificação resultante

**Given** o DM está em sessão com ruleset 2014
**When** a calculadora é exibida
**Then** a fórmula DMG 2014 é usada por padrão
**And** um toggle permite alternar para DMG 2024

**Given** o DM está em sessão com ruleset 2024
**When** a calculadora é exibida
**Then** a fórmula DMG 2024 é usada por padrão
**And** um toggle permite alternar para DMG 2014

**Given** monstros são adicionados ou removidos do encontro
**When** a lista de combatants muda
**Then** a calculadora recalcula a dificuldade automaticamente em ≤50ms (client-side)
**And** nenhum request ao servidor é necessário

**Given** nenhum jogador foi adicionado ao encontro
**When** a calculadora tenta calcular
**Then** exibe "Adicione jogadores para calcular dificuldade" em vez de um badge

**Given** um monstro homebrew sem CR definido está no encontro
**When** a calculadora tenta incluí-lo
**Then** o monstro homebrew é ignorado no cálculo com aviso: "1 monstro sem CR foi excluído do cálculo"

**Notas técnicas:**
- Toda a computação é client-side (dados de XP/CR já estão no SRD JSON local).
- XP thresholds por nível (2014): tabela estática hardcoded (PHB p.82).
- CR budget (2024): tabela estática hardcoded (DMG 2024).
- Componente: `CRCalculator` com inputs de party level e player count.
- Feature gated: Pro only (verificar via `useFeatureGate('cr_calculator')`).

---

### Story 4.6: Criação de conteúdo homebrew (monstros, magias, itens)

As a **DM (Pro)**,
I want to create custom monsters, spells, and items,
So that I can use homebrew content in my sessions and have it searchable alongside SRD content.

**FRs/NFRs:** FR63
**Dependências:** Migration 011 (cria tabelas `homebrew_monsters`, `homebrew_spells`, `homebrew_items`), Feature flag `homebrew`

**Acceptance Criteria:**

**Given** o DM Pro está no Compendium
**When** clica em "Criar Homebrew" (visível apenas para Pro, gated via `useFeatureGate('homebrew')`)
**Then** um formulário de criação é exibido com três abas: "Monstro", "Magia", "Item"

**Given** o DM está criando um monstro homebrew
**When** preenche o formulário de stat block
**Then** os campos disponíveis são: nome, CR, tipo de criatura, tamanho, HP, AC, velocidades, atributos (STR/DEX/CON/INT/WIS/CHA), saving throws, skills, resistências, imunidades, sentidos, idiomas, habilidades especiais, ações, ações lendárias
**And** o formulário segue o layout de stat block padrão do SRD
**And** campos obrigatórios: nome, CR, tipo, HP, AC

**Given** o DM está criando uma magia homebrew
**When** preenche o formulário
**Then** os campos disponíveis são: nome, nível (0-9), escola, tempo de conjuração, alcance, componentes (V/S/M), duração, descrição, classes
**And** campos obrigatórios: nome, nível, escola, descrição

**Given** o DM está criando um item homebrew
**When** preenche o formulário
**Then** os campos disponíveis são: nome, tipo (arma/armadura/poção/wondrous/etc.), raridade, descrição, propriedades, atunement (sim/não)
**And** campos obrigatórios: nome, tipo, descrição

**Given** o DM salva o conteúdo homebrew
**When** clica em "Salvar"
**Then** os dados são salvos na tabela correspondente (`homebrew_monsters`, `homebrew_spells`, ou `homebrew_items`) com `user_id = auth.uid()`
**And** o campo `data` armazena o conteúdo como JSONB
**And** o `ruleset_version` padrão é `'2024'` (editável)
**And** um toast confirma: "Conteúdo homebrew salvo com sucesso"

**Given** conteúdo homebrew foi criado
**When** o DM usa o Compendium search (Fuse.js)
**Then** o conteúdo homebrew aparece nos resultados de busca com um badge "Homebrew" (cor roxa)
**And** a busca merge os índices SRD + homebrew
**And** o conteúdo homebrew é scoped ao usuário (não aparece para outros DMs)

**Given** o DM quer editar conteúdo homebrew existente
**When** abre o conteúdo no Compendium e clica em "Editar"
**Then** o formulário de criação reabre com os dados pré-preenchidos
**And** o DM pode editar qualquer campo
**And** ao salvar, o `updated_at` é atualizado

**Given** o DM quer deletar conteúdo homebrew
**When** clica em "Excluir" no conteúdo
**Then** um diálogo de confirmação é exibido: "Tem certeza que deseja excluir {nome}? Esta ação não pode ser desfeita."
**And** ao confirmar, o registro é deletado da tabela
**And** o conteúdo é removido do índice de busca

**Given** um DM Free tenta acessar a criação de homebrew
**When** clica em "Criar Homebrew"
**Then** o `ProGate` wrapper exibe o `ProBadge` com lock icon em vez do formulário
**And** o upsell contextual (Story 5.3) é acionado

**Given** a migration 011 é aplicada
**When** o schema é verificado
**Then** as tabelas `homebrew_monsters`, `homebrew_spells`, `homebrew_items` existem conforme schema V2.2
**And** RLS policies garantem que cada usuário só vê/edita/deleta seu próprio conteúdo

**Notas técnicas:**
- Fuse.js merge: ao inicializar o índice, concatenar SRD data + homebrew data (carregado do Supabase).
- Homebrew data é carregado on-demand (não no bundle estático).
- JSONB schema flexível permite extensão futura sem migrations.
- CRUD completo com validação Zod nos schemas de entrada.
- i18n keys: `homebrew.create`, `homebrew.edit`, `homebrew.delete`, `homebrew.confirm_delete`, `homebrew.badge`, `homebrew.monster.*`, `homebrew.spell.*`, `homebrew.item.*`.

---

## Epic 5: Freemium Feature Gating

Implementar modelo de monetização sem degradar o tier gratuito. O usuário Free deve ter a experiência completa de combat tracker. Features Pro são sinalizadas de forma não intrusiva. O upsell é sempre contextual. O modelo "Mesa" garante que uma assinatura do mestre desbloqueia Pro para todos os jogadores na sessão. Depende de: feature_flags table, subscriptions table, Stripe setup, migrations 006-007.

---

### Story 5.1: Sistema de feature flags

As a **developer / admin**,
I want a feature flag system backed by a Supabase table with client-side caching,
So that Pro features can be gated, toggled, and rolled back without redeploying.

**FRs/NFRs:** NFR29
**Dependências:** Migration 007 (cria tabela `feature_flags` + seed de flags iniciais)

**Acceptance Criteria:**

**Given** a migration 007 é aplicada
**When** o schema é verificado
**Then** a tabela `feature_flags` existe com colunas: `id`, `key` (UNIQUE), `enabled`, `plan_required`, `description`, `updated_at`
**And** as seguintes flags são inseridas como seed: `persistent_campaigns`, `saved_presets`, `export_data`, `homebrew`, `session_analytics`, `cr_calculator`, `file_sharing`, `email_invites`
**And** todas as flags têm `enabled = true` e `plan_required = 'pro'` por padrão

**Given** o app é carregado no browser
**When** o hook `useFeatureGate(flagKey)` é chamado pela primeira vez
**Then** as flags são carregadas do Supabase via `supabase.from('feature_flags').select('key, enabled, plan_required')`
**And** o resultado é cacheado em memória (module scope) com TTL de 5 minutos
**And** chamadas subsequentes dentro de 5 minutos usam o cache (sem request ao servidor)

**Given** o cache tem mais de 5 minutos
**When** `useFeatureGate` é chamado
**Then** um novo fetch é disparado para atualizar o cache
**And** durante o fetch, o valor cacheado anterior é usado (stale-while-revalidate)

**Given** um componente usa `useFeatureGate('homebrew')`
**When** o usuário logado tem plano `'free'`
**Then** o hook retorna `{ allowed: false, loading: false }`

**Given** um componente usa `useFeatureGate('homebrew')`
**When** o usuário logado tem plano `'pro'` ou `'mesa'`
**Then** o hook retorna `{ allowed: true, loading: false }`

**Given** uma flag tem `enabled = false` (desabilitada globalmente)
**When** qualquer usuário (Free ou Pro) consulta essa flag
**Then** `useFeatureGate` retorna `{ allowed: false, loading: false }`
**And** a feature está bloqueada para todos os planos

**Given** o admin acessa o painel admin
**When** edita uma flag (toggle enabled, muda plan_required)
**Then** a mudança é salva na tabela `feature_flags`
**And** todos os clients recebem a atualização no próximo refresh do cache (≤5 minutos)
**And** nenhum redeploy é necessário

**Given** uma API route ou server component precisa validar uma flag
**When** a validação server-side é executada
**Then** um middleware/helper `checkFeatureFlag(flagKey, userPlan)` consulta a tabela diretamente (sem cache client-side)
**And** a resolução ocorre em ≤500ms (NFR29)
**And** ações que requerem Pro mas são feitas por Free retornam HTTP 403

**Given** a tabela `feature_flags` está inacessível (Supabase down)
**When** o hook tenta carregar flags
**Then** o fallback é: todas as flags retornam `{ allowed: false }` para gated features
**And** features que não requerem plano (`plan_required = 'free'` ou `null`) retornam `{ allowed: true }`

**Given** o admin desabilita uma flag em produção (rollback)
**When** a flag `enabled` é setada para `false`
**Then** a mudança é refletida em ≤5 minutos para clients com cache ativo
**And** imediatamente para novos page loads

**Notas técnicas:**
- Implementação conforme V2.3 da arquitetura: `lib/feature-flags.ts` com `getFeatureFlags()` e `canAccess()`.
- React hook: `lib/hooks/use-feature-gate.ts`.
- RLS: SELECT público (flags são informação pública), INSERT/UPDATE/DELETE apenas admin.
- Zustand store `useSubscriptionStore` fornece `plan` do usuário corrente.

---

### Story 5.2: Indicadores visuais Pro no tier Free

As a **Free user**,
I want to see which features are Pro-only, indicated by a lock icon and tooltip,
So that I understand what is available and what requires an upgrade.

**FRs/NFRs:** FR57, FR61
**Dependências:** Story 5.1 (feature flag system)

**Acceptance Criteria:**

**Given** um usuário Free está navegando o app
**When** encontra uma feature gated como Pro
**Then** um componente `ProBadge` é exibido: ícone de cadeado (Lock icon) + label "Pro"
**And** ao hover/focus no badge, um tooltip aparece: "Disponível no plano Pro"
**And** o tooltip é acessível via keyboard (focusable)

**Given** o componente `ProGate` wraps uma feature Pro
**When** o usuário tem plano Pro
**Then** os children são renderizados normalmente (a feature é acessível)

**Given** o componente `ProGate` wraps uma feature Pro
**When** o usuário tem plano Free
**Then** o `ProBadge` é renderizado no lugar dos children
**And** o conteúdo original NÃO é renderizado (não apenas escondido visualmente)

**Given** as seguintes features devem ter `ProGate`
**When** o usuário Free navega por elas
**Then** os badges Pro são exibidos em:
- Salvar campanha (persistente): `persistent_campaigns`
- Salvar preset de encontro: `saved_presets`
- Exportar sessão (PDF/JSON): `export_data`
- Criar homebrew: `homebrew`
- Analytics de sessão: `session_analytics`
- CR calculator: `cr_calculator`
- Compartilhar arquivos: `file_sharing`
- Convite por email: `email_invites`

**Given** o `ProBadge` é renderizado
**When** o usuário clica nele
**Then** o upsell contextual (Story 5.3) é acionado
**And** o clique é rastreado via analytics: `event: 'pro_badge_click', feature: flagKey`

**Given** os textos do ProBadge
**When** renderizados em pt-BR ou en
**Then** os textos são localizados via i18n
**And** keys: `pro.badge.label`, `pro.badge.tooltip`, `pro.badge.tooltip_description`

**Given** o componente `ProBadge` é renderizado
**When** inspecionado para acessibilidade
**Then** o ícone de cadeado tem `aria-hidden="true"` (decorativo)
**And** o texto "Pro" tem `aria-label="Funcionalidade exclusiva do plano Pro"`

**Notas técnicas:**
- Componentes: `components/billing/ProBadge.tsx`, `components/billing/ProGate.tsx`.
- `ProGate` usa `useFeatureGate(flagKey)` internamente.
- Design: badge pequeno e discreto, não intrusivo. Cor: gold (#D4A853) com fundo semitransparente.
- Garantir consistência visual em TODAS as superfícies (compendium, combat, search, command palette).

---

### Story 5.3: Upsell contextual ao tentar usar feature Pro

As a **Free user**,
I want to see a contextual upsell when I try to use a Pro feature,
So that I understand the value of upgrading without feeling pressured by random popups.

**FRs/NFRs:** FR58
**Dependências:** Story 5.2 (ProBadge/ProGate), Story 5.4 (trial) ou Story 5.6 (payment)

**Acceptance Criteria:**

**Given** um usuário Free clica em um `ProBadge` ou tenta acessar uma feature gated
**When** a ação é interceptada
**Then** um modal `UpsellCard` é exibido com:
- Título: "Desbloqueie {nome da feature}" (dinâmico por feature)
- Descrição: 1-2 frases explicando o benefício da feature específica
- CTA primário: "Iniciar Trial Grátis" (se trial disponível) ou "Ver Planos"
- CTA secundário: "Agora não" (dismiss)
**And** o modal é centrado na tela com backdrop dimmed

**Given** o modal `UpsellCard` é exibido
**When** o usuário já viu o upsell para essa feature nesta sessão (browser session)
**Then** o modal NÃO é exibido novamente (máximo 1x por sessão por feature)
**And** o estado de "já visto" é mantido em sessionStorage (não localStorage, reseta por sessão)

**Given** NUNCA
**When** o app está em uso normal
**Then** o upsell NÃO aparece como popup aleatório, banner rotativo, ou notificação não-solicitada
**And** o upsell SEMPRE é resultado direto de uma ação do usuário tentando usar uma feature Pro

**Given** o upsell é exibido
**When** as seguintes interações ocorrem
**Then** os seguintes analytics events são disparados:
- Modal exibido: `upsell_shown` com `{ feature: flagKey }`
- CTA clicado: `upsell_clicked` com `{ feature: flagKey, cta: 'trial' | 'plans' }`
- Dismissed: `upsell_dismissed` com `{ feature: flagKey }`

**Given** o usuário clica em "Iniciar Trial Grátis"
**When** o trial está disponível (nunca usou trial antes)
**Then** o usuário é redirecionado para o flow de ativação de trial (Story 5.4)

**Given** o usuário clica em "Ver Planos"
**When** a ação é processada
**Then** o usuário é redirecionado para `/pricing` ou a seção de planos no settings

**Given** o usuário clica em "Agora não" ou no backdrop
**When** o modal é dismissado
**Then** o modal fecha sem efeito colateral
**And** a feature permanece bloqueada

**Given** o `UpsellCard` exibe conteúdo para diferentes features
**When** a feature é `homebrew`
**Then** a descrição menciona: "Crie monstros, magias e itens customizados para suas sessões."
**When** a feature é `cr_calculator`
**Then** a descrição menciona: "Calcule automaticamente a dificuldade dos seus encontros."
**And** cada feature tem descrição única localizada via i18n

**Notas técnicas:**
- Componente: `components/billing/UpsellCard.tsx`.
- Feature descriptions: `i18n/messages/{locale}.json` → `upsell.{flagKey}.title`, `upsell.{flagKey}.description`.
- sessionStorage key: `upsell_shown_{flagKey}`.
- Analytics via existing tracking system.

---

### Story 5.4: Trial grátis (14 dias)

As a **Free DM**,
I want to activate a 14-day free trial of all Pro features,
So that I can evaluate the full product before committing to a subscription.

**FRs/NFRs:** FR59
**Dependências:** Migration 006 (cria tabela `subscriptions`), Story 5.1 (feature flags)

**Acceptance Criteria:**

**Given** um DM Free que nunca usou trial
**When** clica em "Iniciar Trial Grátis" (via upsell ou settings)
**Then** uma entrada é criada na tabela `subscriptions` com: `user_id`, `plan = 'pro'`, `status = 'trialing'`, `trial_ends_at = now() + 14 days`, `stripe_subscription_id = NULL`
**And** todas as features Pro são desbloqueadas imediatamente
**And** um toast confirma: "Trial Pro ativado! Você tem 14 dias para explorar."

**Given** o DM tem trial ativo
**When** navega pelo app
**Then** um banner fixo (não-dismissável) é exibido no topo: "Trial Pro: X dias restantes"
**And** o banner mostra a contagem regressiva em dias (não horas)
**And** o banner inclui CTA: "Assinar agora" que redireciona para checkout

**Given** o DM ativou o trial
**When** faltam 2 dias para expirar
**Then** o Trigger.dev cron `check-trial-expiry` identifica o trial
**And** um email é enviado via Novu workflow `trial-expiring` com: `{ daysLeft: 2, upgradeLink }`
**And** o banner no app muda de cor (amber → red) para indicar urgência

**Given** o trial expirou (`trial_ends_at < now()`)
**When** o DM acessa o app
**Then** o status do subscription muda para `'canceled'`
**And** features Pro são bloqueadas novamente
**And** dados criados durante o trial (campanhas, homebrews, notas) são PRESERVADOS (read-only, não deletados)
**And** novas escritas em features Pro são bloqueadas
**And** um banner informa: "Seu trial expirou. Seus dados foram preservados. Assine para continuar editando."

**Given** o DM já usou trial anteriormente (subscription com `status = 'canceled'` e `trial_ends_at IS NOT NULL`)
**When** tenta ativar trial novamente
**Then** a ação é bloqueada com mensagem: "Você já utilizou seu trial gratuito. Assine para desbloquear as features Pro."
**And** o CTA redireciona para checkout

**Given** a migration 006 é aplicada
**When** o schema é verificado
**Then** a tabela `subscriptions` existe conforme schema V2.2
**And** columns: `id`, `user_id`, `plan`, `status`, `stripe_subscription_id`, `stripe_customer_id`, `trial_ends_at`, `current_period_end`, `created_at`, `updated_at`

**Given** o trial está ativo
**When** o hook `useFeatureGate` verifica uma flag Pro
**Then** o plano retornado pelo `useSubscriptionStore` é `'pro'`
**And** `{ allowed: true }` é retornado para todas as flags Pro

**Given** o DM com trial ativo está em uma sessão com jogadores
**When** os jogadores acessam a sessão
**Then** o modelo "Mesa" NÃO se aplica durante trial (trial é individual, não Mesa)
**And** jogadores não herdam features Pro do trial (apenas de assinatura paga Mesa)

**Notas técnicas:**
- Migration 006: cria `subscriptions` conforme schema V2.2.
- Trigger.dev cron `check-trial-expiry`: roda diariamente às 09:00, query: `SELECT * FROM subscriptions WHERE status = 'trialing' AND trial_ends_at BETWEEN now() AND now() + interval '2 days'`.
- Novu workflow `trial-expiring`: canal email.
- Verificação de trial único: `SELECT COUNT(*) FROM subscriptions WHERE user_id = {uid} AND trial_ends_at IS NOT NULL`.
- Graceful expiry: dados preservados, writes bloqueados via RLS + app layer.

---

### Story 5.5: Modelo "Mesa" — assinatura do mestre desbloqueia Pro para jogadores

As a **DM with Pro/Mesa subscription**,
I want my connected players to inherit Pro features during my active session,
So that the entire table benefits from a single subscription.

**FRs/NFRs:** FR60, NFR34
**Dependências:** Story 5.1 (feature flags), Story 5.4 ou 5.6 (subscription ativa)

**Acceptance Criteria:**

**Given** um DM com assinatura `plan = 'pro'` ou `plan = 'mesa'` inicia uma sessão
**When** a sessão é criada
**Then** o campo `sessions.dm_plan` é preenchido com o plano atual do DM (`'pro'` ou `'mesa'`)
**And** esse valor é usado para RLS checks de features dos jogadores na sessão

**Given** jogadores estão conectados a uma sessão de um DM Pro
**When** tentam acessar features Pro (ex: ver homebrew compartilhado, receber notificações avançadas)
**Then** a RLS policy verifica: `sessions.dm_plan IN ('pro', 'mesa')`
**And** se verdadeiro, features Pro estão desbloqueadas para o jogador NAQUELA sessão
**And** o `useFeatureGate` no client do jogador recebe o contexto de sessão

**Given** a assinatura do DM expira durante uma sessão ativa
**When** o webhook do Stripe processa `customer.subscription.deleted`
**Then** o campo `subscriptions.status` é atualizado para `'canceled'`
**And** MAS a sessão ativa mantém `dm_plan` no valor original (graceful degradation — NFR34)
**And** features Pro continuam funcionando para jogadores ATÉ o fim da sessão

**Given** a sessão de um DM com assinatura expirada é encerrada
**When** jogadores tentam acessar uma nova sessão do mesmo DM
**Then** `sessions.dm_plan` é preenchido com `'free'` (plano atual)
**And** features Pro não estão mais disponíveis para jogadores

**Given** um jogador sai de uma sessão de DM Pro
**When** o jogador acessa o app fora do contexto de sessão (dashboard, etc.)
**Then** features Pro NÃO estão disponíveis (o jogador volta ao seu plano individual)
**And** o modelo "Mesa" se aplica exclusivamente dentro de sessões ativas

**Given** um jogador em sessão de DM Pro
**When** o `useFeatureGate` é chamado
**Then** o hook verifica: (1) plano individual do jogador, (2) `session.dm_plan` se em sessão ativa
**And** retorna `allowed: true` se qualquer um dos dois for suficiente

**Given** a RLS policy para o modelo Mesa
**When** um jogador tenta acessar dados de features Pro
**Then** a policy verifica: `EXISTS (SELECT 1 FROM sessions s WHERE s.id = {session_id} AND s.dm_plan IN ('pro', 'mesa') AND {player_is_participant})`

**Given** um DM Free (sem assinatura) inicia uma sessão
**When** jogadores se conectam
**Then** `sessions.dm_plan = 'free'`
**And** features Pro não estão disponíveis para jogadores (nem para o DM)

**Notas técnicas:**
- `sessions.dm_plan` é preenchido no momento da criação da sessão (snapshot do plano, não referência dinâmica).
- Graceful degradation: o campo `dm_plan` na session NÃO muda quando a subscription muda. Isso garante continuidade durante sessões ativas.
- Para novas sessões: `dm_plan` é resolvido da `subscriptions` table no momento de criação.
- RLS policy template na arquitetura V2.
- Integration test obrigatório: simular expiração de assinatura mid-session e verificar que features Pro continuam (NFR34).

---

### Story 5.6: Integração de pagamento com Stripe

As a **DM**,
I want to subscribe to the Pro plan using a secure payment flow,
So that I can unlock all Pro features with a monthly or annual subscription.

**FRs/NFRs:** Nenhum FR/NFR específico (infraestrutura de pagamento)
**Dependências:** Story 5.4 (tabela subscriptions), Stripe account setup

**Acceptance Criteria:**

**Given** o DM decide assinar o plano Pro
**When** clica em "Assinar Pro" no app (settings, pricing page, ou upsell CTA)
**Then** uma Stripe Checkout session é criada via `/api/checkout` route
**And** o DM é redirecionado para a página de Checkout hosted do Stripe
**And** os preços exibidos são: R$ 14,90/mês ou R$ 119,90/ano (2 meses grátis)

**Given** o DM completa o pagamento no Stripe Checkout
**When** o webhook `checkout.session.completed` é recebido
**Then** a rota `/api/webhooks/stripe` processa o evento
**And** a tabela `subscriptions` é atualizada: `status = 'active'`, `stripe_subscription_id`, `stripe_customer_id`, `current_period_end`
**And** o `users.subscription_id` é atualizado para referenciar a subscription
**And** features Pro são desbloqueadas imediatamente

**Given** o Stripe envia webhook `customer.subscription.updated`
**When** a rota de webhook processa o evento
**Then** os campos relevantes na tabela `subscriptions` são atualizados: `status`, `current_period_end`
**And** mudanças de plano (upgrade/downgrade) são refletidas

**Given** o Stripe envia webhook `customer.subscription.deleted`
**When** a rota de webhook processa o evento
**Then** `subscriptions.status` é atualizado para `'canceled'`
**And** features Pro são bloqueadas (respeitando graceful degradation se em sessão)

**Given** a rota `/api/webhooks/stripe` recebe um evento
**When** o evento é processado
**Then** a assinatura do webhook é validada via `stripe.webhooks.constructEvent()` com o webhook secret
**And** eventos com assinatura inválida retornam HTTP 400
**And** eventos processados com sucesso retornam HTTP 200

**Given** a rota `/api/checkout` é chamada
**When** um request é feito
**Then** o request requer autenticação (auth middleware)
**And** o `success_url` redireciona para `/app/settings/billing?success=true`
**And** o `cancel_url` redireciona para `/app/settings/billing?canceled=true`
**And** o `customer_email` é pré-preenchido com o email do usuário

**Given** o DM tem trial ativo e decide assinar
**When** completa o pagamento
**Then** o `subscriptions.status` muda de `'trialing'` para `'active'`
**And** o trial é encerrado (transição seamless)
**And** não há interrupção de features

**Given** o pagamento falha ou o cartão é recusado
**When** o Stripe não completa o checkout
**Then** nenhuma mudança é feita na tabela `subscriptions`
**And** o DM permanece no plano atual (Free ou Trial)
**And** uma mensagem de erro é exibida na success_url com `?error=payment_failed`

**Notas técnicas:**
- Rotas: `/api/checkout/route.ts`, `/api/webhooks/stripe/route.ts`.
- Stripe SDK: `stripe` npm package.
- Webhook secret: `STRIPE_WEBHOOK_SECRET` em env vars.
- Stripe prices configurados no dashboard do Stripe (não hardcoded no app).
- Price IDs referenciados via env vars: `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`.
- PCI compliance: Stripe Checkout hosted = zero PCI scope no nosso lado.

---

### Story 5.7: Painel de gerenciamento de assinatura

As a **DM**,
I want to view and manage my subscription in the settings,
So that I can see my current plan, renewal date, upgrade, or cancel.

**FRs/NFRs:** Nenhum FR/NFR específico (complemento de UX)
**Dependências:** Story 5.6 (Stripe integration), Story 5.4 (trial)

**Acceptance Criteria:**

**Given** o DM acessa Configurações → "Plano"
**When** a página carrega
**Then** o painel exibe:
- Plano atual: "Free", "Pro", ou "Trial Pro"
- Se Pro: data de renovação (`current_period_end` formatada)
- Se Trial: dias restantes ("Seu trial expira em X dias")
- Se Free: CTA "Fazer Upgrade para Pro" com botão dourado

**Given** o DM tem assinatura Pro ativa
**When** clica em "Gerenciar Assinatura"
**Then** é redirecionado para o Stripe Customer Portal
**And** no portal, pode: atualizar cartão, mudar plano (mensal ↔ anual), cancelar
**And** o link do portal é gerado via Stripe API: `stripe.billingPortal.sessions.create()`

**Given** o DM tem trial ativo
**When** visualiza o painel
**Then** vê: "Trial Pro — X dias restantes"
**And** um CTA: "Assinar para continuar após o trial"
**And** uma barra de progresso visual indicando quantos dias já se passaram

**Given** o DM tem plano Free (nunca assinou, trial expirado ou nunca usado)
**When** visualiza o painel
**Then** vê: "Plano Gratuito"
**And** lista de features Pro com indicadores do que está bloqueado
**And** CTA primário: "Iniciar Trial Grátis" (se disponível) ou "Assinar Pro"
**And** preços exibidos: R$ 14,90/mês ou R$ 119,90/ano

**Given** o DM quer ver histórico de pagamentos
**When** clica em "Histórico de Pagamentos"
**Then** é redirecionado para o Stripe Customer Portal (seção de invoices)
**And** o portal lista todas as invoices com status (pago, pendente, falhou)

**Given** o DM cancela via Stripe Customer Portal
**When** retorna ao app
**Then** o painel reflete: "Plano Pro — Cancela em {data}"
**And** features Pro continuam ativas até o fim do período pago (`current_period_end`)
**And** após a data, o plano muda para Free

**Given** o painel é renderizado
**When** inspecionado para i18n
**Then** todos os textos são localizados via i18n keys: `billing.plan.free`, `billing.plan.pro`, `billing.plan.trial`, `billing.renewal_date`, `billing.trial_days_left`, `billing.manage`, `billing.history`, `billing.upgrade_cta`, `billing.trial_cta`

**Notas técnicas:**
- Rota: `/app/settings/billing/page.tsx` (ou tab dentro de settings existente).
- Stripe Customer Portal: `stripe.billingPortal.sessions.create({ customer: stripe_customer_id, return_url })`.
- Dados carregados da tabela `subscriptions` via query com `user_id = auth.uid()`.
- Componente: `components/billing/SubscriptionPanel.tsx`.
