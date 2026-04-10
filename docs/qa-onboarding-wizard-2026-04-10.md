# QA Exploratório — Wizard & Onboarding Pocket DM

**Data:** 2026-04-10
**Testador:** Claude (Playwright automatizado)
**Ambiente:** Produção (tavernadomestre.vercel.app)
**Viewports:** Desktop (1280x720) + Mobile (375x812 iPhone)
**Contas criadas:** 4 (DM desktop, Player desktop, DM mobile, Player mobile)
**Screenshots:** `qa-evidence/onboarding-qa/` (21 capturas)

---

## Resumo Executivo

O wizard e onboarding do Pocket DM estão **funcionais em todos os 4 cenários testados** (DM Desktop, Player Desktop, DM Mobile, Player Mobile). O fluxo é claro, rápido (~30s para completar) e bem guiado. A responsividade mobile está excelente. Existem oportunidades de melhoria em copy, UX e CTAs que seguem abaixo.

---

## Fluxos Testados

### 1. Signup (Desktop + Mobile)
| Aspecto | Status | Notas |
|---------|--------|-------|
| Formulário email/senha | OK | Campos claros, placeholder útil |
| Seleção de role (Jogador/Mestre/Ambos) | OK | Ícones distintos, subtítulos descritivos |
| Validação de senha | OK | "Min. 6 caracteres" visível |
| Google OAuth | Não testado | Presente no UI |
| Página de sucesso (email) | OK | Instruções claras com emojis |
| Responsividade mobile | OK | Layout empilhado funciona bem |

### 2. Wizard DM — Fluxo Campanha (Desktop + Mobile)
| Step | Nome | Status | Notas |
|------|------|--------|-------|
| 1 | Role Selection | OK | "Ambos" pré-selecionado — ver feedback #F-01 |
| 2 | Welcome | OK | "Bem-vindo ao Pocket DM!" — ver feedback #F-02 |
| 3 | Choose Path | OK | "Combate Rápido" vs "Configurar Campanha" |
| 4 | Campaign Name | OK | Stepper 1/2, placeholder "ex: Curse of Strahd", limite 50 chars |
| 5 | Invite Players | OK | QR code + link copiável |
| 6 | Done | OK | XP rewards, progress bar, 2 CTAs |
| 7 | Dashboard Landing | OK | Tour automático 1/7, checklist "Primeiros Passos" |

### 3. Wizard DM — Fluxo Combate Rápido (Mobile)
| Step | Nome | Status | Notas |
|------|------|--------|-------|
| 1-3 | Role → Welcome → Choose | OK | Mesmo fluxo até a bifurcação |
| 4 | Quick Combat | OK | Redireciona direto para `/app/session/new` |

### 4. Wizard Player (Desktop + Mobile)
| Step | Nome | Status | Notas |
|------|------|--------|-------|
| 1 | Role Selection | OK | Selecionar "Jogador" |
| 2 | Player Entry | OK | "Bem-vindo, Aventureiro!" + pixel art goblin |
| 3 | Player Done | OK | "Tudo pronto!" + XP + 3 CTAs |
| 4 | Dashboard Landing | OK | Tour 1/4, campo código campanha, empty state |

---

## Feedbacks, Críticas e Melhorias

### Agentes BMAD — Análise Consolidada

---

#### F-01 — Role "Ambos" pré-selecionado sem contexto
**Severidade:** Media | **Tipo:** UX | **Agentes:** Sally (UX), John (PM)

**Problema:** O wizard abre com "Ambos" pré-selecionado (border dourada). Isso cria um viés de seleção — o usuário pode clicar "Continuar" sem pensar, assumindo que "Ambos" é o recomendado.

**Sally (UX):** "Pré-selecionar 'Ambos' é um dark pattern suave. O usuário que é puramente Player vai para o fluxo de DM sem querer. Nenhuma opção deveria vir pré-selecionada — force o clique consciente."

**John (PM):** "Entendo o raciocínio de reduzir friction, mas o dado de quantos users 'Ambos' completam o onboarding vs. users que selecionam 'Jogador' ou 'Mestre' vai ser enviesado. Para analytics, nenhum pré-selecionado é melhor."

**Recomendação:** Não pré-selecionar nenhum role. Botão "Continuar" começa desabilitado até uma seleção explícita.

---

#### F-02 — Welcome Screen tem muito espaço vazio (mobile)
**Severidade:** Baixa | **Tipo:** UI/Layout | **Agente:** Sally (UX)

**Problema:** No mobile, a tela "Bem-vindo ao Pocket DM!" mostra o conteúdo na metade inferior da viewport, com ~40% de espaço vazio acima. Mesma situação na tela "Bem-vindo, Aventureiro!" do Player.

**Sally (UX):** "O conteúdo deveria estar mais centralizado verticalmente ou usar esse espaço para um visual impactante (ilustração, animação de entrada). Espaço vazio em mobile é real estate desperdiçado que faz o conteúdo parecer 'afundado'."

**Recomendação:** Ajustar vertical centering do conteúdo no mobile, ou adicionar uma ilustração/animação hero no espaço superior.

---

#### F-03 — Typo "Mestro" no card "Ambos"
**Severidade:** Alta | **Tipo:** Bug/Copy | **Agente:** Quinn (QA)

**Problema:** O subtítulo do card "Ambos" diz **"Mestro e jogo"** em vez de **"Mestro e jogo"**. Verificação: no snapshot do DOM, o texto é `Mestro e jogo` — deveria ser **"Mestre e jogo"** ou **"Mestro e jogo"** (se "Mestro" for gíria intencional).

**Quinn (QA):** "Se 'Mestro' não é intencional, é um typo que aparece na PRIMEIRA tela que TODO usuário vê. Alto impacto de percepção de qualidade."

**Recomendação:** Corrigir para "Mestre e jogo" ou "Mestro e jogo" (confirmar intenção).

---

#### F-04 — Signup pede role, wizard pede role de novo
**Severidade:** Media | **Tipo:** UX/Fluxo | **Agentes:** John (PM), Sally (UX)

**Problema:** Na tela de signup, o usuário já seleciona seu role (Jogador/Mestre/Ambos). Depois de confirmar o email e entrar, o wizard pede o role de novo na primeira tela. É redundante.

**John (PM):** "Isso é friction desnecessária. Se o user já disse 'Mestre' no signup, por que perguntar de novo? A conta DM criada via signup selecionando 'Mestre' deveria pular essa tela."

**Sally (UX):** "Concordo, mas entendo o edge case: o user pode ter mudado de ideia. Solução: pré-selecionar o role que ele escolheu no signup (ao invés de 'Ambos') e permitir alteração."

**Recomendação:** Pré-selecionar o role escolhido no signup (se disponível). Se o role vem do signup form, pular a step de role selection automaticamente ou pré-preencher.

---

#### F-05 — "Recomendado para sua primeira vez" no Combate Rápido precisa de destaque
**Severidade:** Baixa | **Tipo:** UX | **Agente:** Sally (UX)

**Problema:** O texto "Recomendado para sua primeira vez" aparece em amarelo sutil no card "Combate Rápido", mas não se destaca o suficiente contra o fundo escuro. No desktop, o card da esquerda (Combate Rápido) é visualmente igual ao da direita (Configurar Campanha) — sem hierarquia clara de qual é o caminho principal.

**Sally (UX):** "O caminho 'recomendado' deveria ter visual priority — border mais grossa, badge/ribbon, ou ser levemente maior. Ambos os cards são iguais visualmente, e 'Configurar Campanha' está no lado direito que é culturalmente dominante em LTR. Muitos novatos vão escolher errado."

**Recomendação:** Adicionar visual hierarchy ao card recomendado (badge, border diferente, ou tamanho maior).

---

#### F-06 — Link de convite longo demais no mobile (QR step)
**Severidade:** Baixa | **Tipo:** UI | **Agente:** Quinn (QA)

**Problema:** No step de invite (DM), o link `https://tavernadomestre.vercel.app/join-campaign/2a95977f` é mostrado em texto completo. No desktop fica ok, mas no mobile o link vai quebrar em múltiplas linhas e ser difícil de ler.

**Quinn (QA):** "O link completo é útil para copiar, mas visualmente poderia ser truncado ou usar uma versão curta (ex: `pocketdm.app/j/2a95977f`) no display. O botão 'Copiar link' já copia o completo."

**Recomendação:** Mostrar versão truncada visual do link no mobile; manter o link completo no clipboard via "Copiar link".

---

#### F-07 — Player "Ainda não tenho convite" deveria ter mais orientação
**Severidade:** Media | **Tipo:** UX/Copy | **Agentes:** Sally (UX), John (PM)

**Problema:** Quando o Player clica "Ainda não tenho convite", vai direto para "Tudo pronto! Aguardando convite do seu Mestre." Não explica o que o player pode fazer enquanto espera, além dos 3 CTAs na tela final.

**John (PM):** "Este é o momento mais frágil do funil. O player acabou de criar conta, não tem campanha, e a mensagem é 'aguarde'. Sem contexto do que fazer, ele fecha o app e não volta. Precisamos de engagement hooks aqui."

**Sally (UX):** "Concordo. Os CTAs 'Explorar compêndio' e 'Combate de treino' são bons mas discretos. Uma sugestão: tela intermediária tipo 'Enquanto espera seu Mestre...' com cards visuais mostrando o que explorar."

**Recomendação:** Antes do "Tudo pronto!", adicionar uma tela intermediária com sugestões visuais do que fazer enquanto espera (compêndio, guest combat, character builder preview).

---

#### F-08 — Tour Dashboard DM começa automaticamente em cima do conteúdo
**Severidade:** Baixa | **Tipo:** UX | **Agente:** Sally (UX)

**Problema:** Ao chegar no Dashboard pós-wizard, o tour (1/7 "Sua central de comando!") abre como modal centralizado cobrindo o dashboard. O user acabou de sair de um wizard de 6 passos e imediatamente entra em outro fluxo de 7 passos.

**Sally (UX):** "Wizard fatigue é real. Depois de 6 passos de onboarding, o user quer EXPLORAR, não fazer mais tour. O tour deveria começar com um delay de 5s, ou ser opt-in ('Quer um tour rápido?') em vez de automático."

**Recomendação:** Após o wizard, dar um delay de 3-5s antes de iniciar o tour, ou torná-lo opt-in com um botão "Fazer tour" no dashboard.

---

#### F-09 — Player Dashboard tour é adequado (4 steps vs 7 do DM)
**Severidade:** N/A | **Tipo:** Positivo | **Agente:** Quinn (QA)

**Observação:** O tour do Player Dashboard tem apenas 4 passos (vs 7 do DM), que é proporcional à complexidade menor do painel do player. Boa decisão de design.

---

#### F-10 — Player Dashboard empty state é excelente
**Severidade:** N/A | **Tipo:** Positivo | **Agentes:** Sally (UX), John (PM)

**Observação:** O empty state do Player Dashboard é bem pensado: campo de código de campanha proeminente, links "Explore o compêndio enquanto espera" e "Teste o combate por conta", rank de XP. O player sabe exatamente o que fazer.

**John (PM):** "O campo de código de campanha no centro é smart — é a ação mais provável do player. O empty state não é vazio de verdade, é um call-to-action contextual."

---

#### F-11 — Gamificação XP funciona como motivador
**Severidade:** N/A | **Tipo:** Positivo | **Agente:** John (PM)

**Observação:** O XP reward na conclusão do wizard (+25 XP, +50 XP para DM; +15 XP para Player) com rank visual e progress bar funciona como um "mini-celebration" que dá sensação de progresso. A diferença DM (75 XP total) vs Player (15 XP total) é proporcional ao esforço.

---

#### F-12 — Pixel art do Player wizard é encantador
**Severidade:** N/A | **Tipo:** Positivo | **Agente:** Sally (UX)

**Sally (UX):** "O goblin pixel art no 'Bem-vindo, Aventureiro!' é lindo e consistente com a identidade visual 16-bit do Pocket DM. É o tipo de detalhe que faz o user sorrir na primeira interação."

---

#### F-13 — "Recebi um link de convite — sou jogador" no fluxo DM é um bom escape hatch
**Severidade:** N/A | **Tipo:** Positivo | **Agente:** John (PM)

**John (PM):** "Esse link discreto abaixo dos cards resolve o caso do user que selecionou 'Mestre' por engano mas é player. Bom escape hatch sem poluir a UI."

---

## Priorização

| # | Feedback | Severidade | Esforço | Prioridade |
|---|----------|-----------|---------|------------|
| F-03 | Typo "Mestro" | Alta | 5min | P0 — Fix imediato |
| F-01 | Role pré-selecionado | Media | 30min | P1 — Próximo sprint |
| F-04 | Role duplicado signup→wizard | Media | 1-2h | P1 — Próximo sprint |
| F-07 | Player "sem convite" vazio | Media | 2-3h | P1 — Próximo sprint |
| F-02 | Espaço vazio welcome mobile | Baixa | 30min | P2 — Polish |
| F-05 | Card recomendado sem destaque | Baixa | 30min | P2 — Polish |
| F-06 | Link longo mobile | Baixa | 30min | P2 — Polish |
| F-08 | Tour imediato pós-wizard | Baixa | 1h | P2 — Polish |

---

## Contas de Teste Criadas

| Email | Senha | Role | Viewport | ID |
|-------|-------|------|----------|----|
| qa.dm.onboarding@test-taverna.com | QaTest_DM!2026 | DM | Desktop | 4ab4756f-c631-4be0-a08d-d7816acd04bf |
| qa.player.onboarding@test-taverna.com | QaTest_Player!2026 | Player | Desktop | 4c5b2d87-30ab-44df-a5cf-a9e96e7260b7 |
| qa.dm.mobile@test-taverna.com | QaTest_DM_Mobile!2026 | DM | Mobile | 284b5647-eeaa-4e53-b363-9e3139463db7 |
| qa.player.mobile@test-taverna.com | QaTest_Player_Mobile!2026 | Player | Mobile | a250f506-e21f-4932-9267-25d90a7278db |

---

## Screenshots Index

| # | Arquivo | Descrição |
|---|---------|-----------|
| 01 | 01-signup-page-desktop.png | Signup desktop |
| 02 | 02-signup-success-dm-desktop.png | Email confirmation page |
| 03 | 03-wizard-dm-step-role-desktop.png | Role selection (DM desktop) |
| 04 | 04-wizard-dm-welcome-desktop.png | Welcome "Bem-vindo ao Pocket DM!" |
| 05 | 05-wizard-dm-choose-path-desktop.png | Choose path (Combate Rápido vs Campanha) |
| 06 | 06-wizard-dm-campaign-name-desktop.png | Campaign name input (stepper 1/2) |
| 07 | 07-wizard-dm-invite-step-desktop.png | Invite players (QR code + link) |
| 08 | 08-wizard-dm-done-desktop.png | Done — XP rewards |
| 09 | 09-wizard-dm-dashboard-landing-desktop.png | Dashboard pós-wizard com tour |
| 10 | 10-player-dashboard-no-wizard-desktop.png | Player role selection |
| 11 | 11-player-entry-step-desktop.png | Player "Bem-vindo, Aventureiro!" |
| 12 | 12-player-waiting-desktop.png | Player "Tudo pronto!" |
| 13 | 13-login-mobile.png | Login mobile |
| 14 | 14-wizard-dm-role-mobile.png | Role selection mobile |
| 15 | 15-wizard-dm-welcome-mobile.png | Welcome mobile |
| 16 | 16-wizard-dm-choose-mobile.png | Choose path mobile |
| 17 | 17-wizard-dm-quick-combat-mobile.png | Quick combat landing mobile |
| 18 | 18-player-role-mobile.png | Player role selection mobile |
| 19 | 19-player-entry-mobile.png | Player entry mobile |
| 20 | 20-player-done-mobile.png | Player done mobile |
| 21 | 21-player-dashboard-mobile.png | Player dashboard mobile com tour |
