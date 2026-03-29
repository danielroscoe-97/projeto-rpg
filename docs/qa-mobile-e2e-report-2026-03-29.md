# QA Mobile E2E Report — 2026-03-29

**Viewport**: 375×812 (iPhone X)
**URL**: https://tavernadomestre.vercel.app
**Testador**: Claude (automação Playwright)

---

## Resumo Executivo

Teste ponta a ponta completo em mobile cobrindo: Landing Page, modo visitante (/try), tour guiado, login, onboarding, role selection, dashboard, criação de combate, combate ativo (HP, turnos, condições, stat blocks), compêndio, e configurações.

**Resultado geral: App mobile está sólido e funcional.** 3 bugs encontrados, 2 issues de UX.

---

## BUGS

### BUG-1: Timer do visitante mostra "0 min" imediatamente (ALTA)
- **Onde**: `/try` — banner superior "Restam apenas 0 min!"
- **Esperado**: Timer deveria mostrar tempo restante real (ex: 30min)
- **Observado**: Mostra "0min" logo ao carregar a página, permanece assim durante todo o uso
- **Impacto**: Cria falsa urgência/confusão — visitante pensa que já expirou
- **Screenshots**: `e2e-mobile-07-try-page.png`, `e2e-mobile-20-combat-active.png`

### BUG-2: Overlay do tour bloqueia interação com elementos spotlight (MÉDIA)
- **Onde**: `/try` — Tour steps 2 e 3 (busca de monstros e clique no resultado)
- **Esperado**: Usuário deveria conseguir clicar nos elementos destacados pelo spotlight
- **Observado**: O `<rect>` do SVG overlay intercepta todos os pointer events, impedindo clique nos elementos dentro do spotlight
- **Impacto**: O tour instrui "clique em um monstro" mas o clique não funciona; o tour avança automaticamente via botão "Próximo" mas a interação manual é impossível
- **Detalhe técnico**: `tour-overlay` com `fill="rgba(0, 0, 0, 0.7)"` cobre toda a tela; mask exclui visualmente a área spotlight mas não exclui do hit-test
- **Screenshots**: `e2e-mobile-09-tour-step3-results.png`

### BUG-3: SRD Loading Screen não aparece — tela de loading correta não é exibida (BAIXA)
- **Onde**: `/try` — ao carregar a página
- **Esperado**: Tela animada "Catalogando monstros..." com animação pixel art
- **Observado**: Loading screen aparece brevemente mas mostra apenas emoji 🎲 e texto, sem a animação completa do SRD Loading Screen feature
- **Nota**: Pode ser intencional se o cache já estiver preenchido

---

## ISSUES DE UX

### UX-1: Botão flutuante "Histórico de Rolls" obstrui conteúdo (MÉDIA)
- **Onde**: Todas as telas autenticadas (onboarding, session/new, compendium, settings)
- **Problema**: O botão "Histórico de Rolls" + botão de busca flutuante no canto inferior direito sobrepõe texto e botões em várias telas
- **Mais visível em**:
  - Onboarding: obstrui texto do card "Configurar Campanha"
  - Session/new: obstrui texto "Pesquise monstros SRD acima"
  - Compendium: obstrui últimos itens da lista
- **Sugestão**: Reposicionar para canto que não sobreponha conteúdo, ou adicionar padding-bottom suficiente nas páginas
- **Screenshots**: `e2e-mobile-28-onboarding.png`, `e2e-mobile-30-session-new.png`

### UX-2: Role Selection pulada no primeiro login da conta de teste (BAIXA)
- **Onde**: Fluxo pós-login
- **Problema**: Conta `dm.primary@test-taverna.com` após login vai direto para onboarding sem passar por role selection — provavelmente porque a role já foi definida em teste anterior
- **Nota**: Não é necessariamente um bug — role selection só aparece se nunca foi definida. Comportamento correto.

---

## FLUXOS TESTADOS — RESULTADOS

### 1. Landing Page Mobile
- **Status**: PASS
- Hero com logo crown d20, tagline "Master your table.", CTAs claros
- Menu hamburger: Features, Como Funciona, Comparativo, Preços, Login, Começar Grátis
- Seção Features: 6 cards (Combat Tracker, Player View, Oráculo, Regras 2014/2024, Salvar, Dark Mode)
- Seção "Como funciona": 4 steps com timeline visual
- Comparativo: Roll20 vs D&D Beyond vs Pocket DM — layout tabular mobile-friendly
- Testimonials: 3 cards com ícones
- Pricing: Grátis (R$0/sempre) e Pro (R$14,90/mês — em breve)
- Footer: links, copyright 2026, licença CC-BY-4.0
- Contadores dinâmicos: 3037 monstros, 935 magias

### 2. Modo Visitante (/try)
- **Status**: PASS (com bugs acima)
- Encounter setup funcional: busca SRD, adição manual, quantidade, criatura oculta
- Busca retorna resultados com tokens, CR, tipo, HP, AC
- Formulário manual aceita apenas nome (HP, CA, Init opcionais)
- Botões Rolar Todos / Rolar NPCs presentes
- Validação de iniciativa ao iniciar combate

### 3. Tour Guiado (11 steps)
- **Status**: PASS (com BUG-2)
- Step 1: Bem-vindo ao Pocket DM — modal de boas-vindas
- Step 2: Pesquise Monstros — auto-preenche "goblin" no campo
- Step 3: Adicione ao Combate — pede para clicar em monstro (overlay bloqueia)
- Step 4: Monstro Adicionado — Goblin na lista com HP/CA/Init
- Step 5: Expanda seu compêndio — botão conteúdo externo
- Step 6: Adição Manual — destaca formulário manual
- Step 7: Iniciativa e Ordem de Turno — botões rolar
- Step 8: Iniciar Combate — botão iniciar
- Step 9: Controles do Combate — encerrar, salvar, adicionar, próximo turno
- Step 10: Avançar Turno — botão próximo turno
- Step 11: Você está pronto! 🎉 — CTAs criar combate + criar conta
- Tour inicia combate automaticamente no step 8→9

### 4. Login Mobile
- **Status**: PASS
- Layout limpo: ícone shield, campos Email/Senha, "Esqueceu sua senha?", "Criar Conta"
- Login com credenciais de teste funciona corretamente
- Redirecionamento pós-login para `/app/onboarding`

### 5. Onboarding + Role Selection
- **Status**: PASS
- Role Selection: 3 cards (Jogador, Mestre, Ambos) com ícones pixel art
- "Ambos" selecionado por padrão, botões Continuar/Pular
- Onboarding: 2 caminhos — "Combate Rápido" (recomendado) e "Configurar Campanha"
- Ícones pixel art RPG (poção, pergaminho)

### 6. Dashboard / Session New
- **Status**: PASS
- Conta sem campanhas redireciona para onboarding (comportamento correto)
- "Combate Rápido" leva para `/app/session/new`
- Session/new tem: nome do encontro, ruleset 2014/2024, Carregar Campanha/Preset, busca SRD, form manual

### 7. Combate Ativo
- **Status**: PASS
- Timer funcional (⏱ contando)
- HP Adjuster: Dano/Curar/Temp PV com campo numerico + "Aplicar em mais alvos"
- 50 dano aplicado: HP 341→291, status LIGHT, barra verde parcial
- 13 condições D&D + Concentrando com ícones, toggle on/off, badge com ✕
- "Envenenado" aplicado e exibido corretamente
- Próximo Turno: indicador ▶ move entre combatentes
- Stat block expandido inline: full stat block com ability scores, traits, actions
- Dados clicáveis nos ataques: "+13 to hit", "26 (3d12 + 7)"
- Botões: Encerrar, Salvar, Adicionar criatura, Próximo Turno, HP, Cond, Derrotar, Editar, → 2024, Remover

### 8. Compêndio Mobile
- **Status**: PASS
- 4 tabs: Monstros (3037), Magias (935), Itens, Condições
- Monstros: tokens com CR e ruleset badge (2014 cinza, 2024 dourado)
- Magias: nível, Ritual ®, Concentration ◉ badges, sort Nome/Nível
- Filtro por nome funcional
- "Carregar mais" para lista virtualizada

### 9. Settings Mobile
- **Status**: PASS
- 4 tabs: Preferências, Wiki SRD, Plano, Conta
- Preferências: Perfil (email), Papel (Jogador/Mestre/Ambos inline), Idioma (PT-BR/EN), Conteúdo Externo (toggle)
- Conta: Segurança (Alterar Senha), Zona de Perigo (colapsado)
- Menu app autenticado: Dashboard, Compêndio (sub-items), Presets, Configurações, Busca, Oráculo ✨, Logout

---

## Resumo de Bugs por Severidade

| Severidade | Quantidade | IDs |
|-----------|-----------|-----|
| ALTA | 1 | BUG-1 (timer 0min) |
| MÉDIA | 2 | BUG-2 (tour overlay), UX-1 (floating button) |
| BAIXA | 1 | BUG-3 (loading screen) |

---

## Screenshots Capturadas (36 total)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 01 | e2e-mobile-01-landing-hero.png | Landing hero com logo e CTAs |
| 02 | e2e-mobile-02-menu-open.png | Menu hamburger aberto |
| 03 | e2e-mobile-03-features.png | Seção "Como funciona" |
| 04 | e2e-mobile-04-comparison.png | Tabela comparativa |
| 05 | e2e-mobile-05-pricing.png | Pricing (Grátis + Pro) |
| 06 | e2e-mobile-06-footer.png | Footer e CTA final |
| 07 | e2e-mobile-07-try-page.png | /try com tour welcome |
| 08 | e2e-mobile-08-tour-step2-search.png | Tour step 2 — busca |
| 09 | e2e-mobile-09-tour-step3-results.png | Tour step 3 — resultados |
| 10 | e2e-mobile-10-tour-after-add.png | Tour — tentativa de add |
| 11 | e2e-mobile-11-tour-step4-added.png | Tour step 4 — monstro adicionado |
| 12 | e2e-mobile-12-tour-step5-import.png | Tour step 5 — conteúdo externo |
| 13 | e2e-mobile-13-tour-step6-manual.png | Tour step 6 — adição manual |
| 14 | e2e-mobile-14-tour-step7-initiative.png | Tour step 7 — iniciativa |
| 15 | e2e-mobile-15-tour-step8-start.png | Tour step 8 — iniciar combate |
| 16 | e2e-mobile-16-tour-step9-combat.png | Tour step 9 — controles |
| 17 | e2e-mobile-17-tour-step10-nextturn.png | Tour step 10 — próximo turno |
| 18 | e2e-mobile-18-tour-step11-complete.png | Tour step 11 — completo |
| 19 | e2e-mobile-19-dragon-added.png | Dragon Turtle adicionado |
| 20 | e2e-mobile-20-combat-active.png | Combate ativo com 2 combatentes |
| 21 | e2e-mobile-21-hp-adjuster.png | HP Adjuster aberto |
| 22 | e2e-mobile-22-hp-damaged.png | Dragon Turtle com 50 dano |
| 23 | e2e-mobile-23-conditions.png | Painel de condições |
| 24 | e2e-mobile-24-condition-applied.png | Envenenado aplicado |
| 25 | e2e-mobile-25-next-turn.png | Turno avançado |
| 26 | e2e-mobile-26-statblock.png | Stat block expandido |
| 27 | e2e-mobile-27-login.png | Tela de login |
| 28 | e2e-mobile-28-onboarding.png | Onboarding (Combate Rápido / Campanha) |
| 29 | e2e-mobile-29-role-selection.png | Role Selection |
| 30 | e2e-mobile-30-session-new.png | Session/new autenticado |
| 31 | e2e-mobile-31-compendium.png | Compêndio — Monstros |
| 32 | e2e-mobile-32-compendium-spells.png | Compêndio — Magias |
| 33 | e2e-mobile-33-settings.png | Settings — Preferências |
| 34 | e2e-mobile-34-settings-bottom.png | Settings — Papel/Idioma |
| 35 | e2e-mobile-35-settings-account.png | Settings — Conta |
| 36 | e2e-mobile-36-app-menu.png | Menu app autenticado |
