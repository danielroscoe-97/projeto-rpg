# QA Tier 1 — Anti-Gremlin Crítico (Demo-Ready)

> **Prioridade máxima.** Estas jornadas DEVEM estar 100% funcionais para o demo nos bares de RPG em BH (maio 2026).
> Cole este prompt em uma janela do Claude Code com Playwright MCP.
> O agente deve navegar em `http://localhost:3000` e testar cada jornada.

---

## CONTEXTO

Você é um QA tester agressivo do **Pocket DM** (https://www.pocketdm.com.br), um combat tracker de D&D 5e.
O app roda em `http://localhost:3000`. Use Playwright (browser MCP) para navegar e testar.

**Credenciais de teste:**
- DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
- Player 1: `player.warrior@test-taverna.com` / `TestPlayer_War!1`
- Player 2: `player.mage@test-taverna.com` / `TestPlayer_Mage!2`

**Regras gerais:**
- Faça screenshot a cada step importante → salve em `qa-evidence/tier1/`
- Se algo falhar, documente o erro com screenshot e continue para o próximo cenário
- Use seletores `data-testid` quando disponíveis, senão use texto/aria-label
- O app é em PT-BR por padrão
- Após cada jornada, reporte: **PASS/FAIL + screenshot + observações de UX**
- Seja AGRESSIVO: teste edge cases, inputs estranhos, cliques rápidos, refresh no meio de ações

---

## JORNADA 1 — Landing Page + SEO + Funil Orgânico

**Objetivo:** Verificar navegação pública, meta tags, compêndio, e funil de conversão orgânica.

### Happy Path
1. Navegar para `http://localhost:3000`
2. Verificar hero section: título contém "combate" ou "combat", botões "Testar Grátis" e "Salvar minhas campanhas"
3. Scroll até seção Features — confirmar 6 cards visíveis
4. Scroll até seção "Como funciona" — confirmar 4 steps
5. Scroll até seção Comparativo — confirmar tabela com Roll20, D&D Beyond, Pocket DM
6. Scroll até Pricing — confirmar plano Grátis (R$ 0) e Pro (R$ 14,90)
7. Clicar "Testar Grátis" → deve ir para `/try`
8. Voltar, clicar link "Preços" no nav → deve scrollar para `#precos`

### Compêndio de Monstros
9. Navegar para `/monstros` → verificar lista de monstros com search bar
10. Digitar "Goblin" na busca → verificar resultados filtram
11. Clicar no primeiro resultado → verificar stat block renderiza (token, stats, ações, traits)
12. Na página do monstro, clicar botão "Traduzir" → verificar:
    - O botão NÃO muda de posição no layout
    - A ficha alterna entre EN/PT-BR
    - Clicar novamente volta ao idioma original
13. Verificar que existe CTA "Usar no combate" ou similar → clicar → deve ir para `/try`

### Compêndio de Magias
14. Navegar para `/magias` → verificar lista de magias com filtros
15. Filtrar por nível (ex: "Nível 1") → verificar resultados atualizam
16. Clicar em uma magia → verificar descrição completa renderiza

### Funil Orgânico Completo (Jornada 19)
17. Navegar para `/monstros/goblin` (ou slug equivalente)
18. Ler stat block → localizar CTA de combate
19. Clicar CTA → deve chegar em `/try`
20. No `/try`, buscar "Goblin" e adicionar → iniciar combate rápido (2 cliques)
21. Encerrar combate → verificar CTA de signup visível
22. Contar total de cliques do step 17 ao 21 → **deve ser ≤7 cliques**

### Gremlin Tests
23. Navegar para `/monstros`, buscar string vazia → deve mostrar todos ou placeholder
24. Buscar "xyznonexistent" → deve mostrar "Nenhum resultado" ou empty state
25. Navegar para `/monstros/slug-que-nao-existe` → deve mostrar 404 ou redirect
26. Refresh (F5) em qualquer página do compêndio → estado deve restaurar
27. Testar navegação com botão "Voltar" do browser em todas as páginas visitadas

**Resultado esperado:** Todas as páginas públicas carregam sem erro. Funil orgânico ≤7 cliques. Compêndio funcional com tradução estável.

---

## JORNADA 2 — Guest Combat (Modo Visitante)

**Objetivo:** Testar o fluxo completo de combate sem login, incluindo edge cases.

### Happy Path
1. Navegar para `/try`
2. Verificar banner guest visível (`data-testid="guest-banner"`) com timer de 60min
3. Na search bar (`data-testid="srd-search-input"`), digitar "Goblin"
4. Nos resultados (`data-testid="srd-results"`), clicar botão "Adicionar" do primeiro resultado (`data-testid="add-one-*"`)
5. Verificar Goblin aparece na lista de combatentes (`data-testid="setup-combatant-list"`)
6. Clicar botão "+ Monstro/Jogador Manual" para abrir form manual (`data-testid="add-row"`)
7. Preencher: Nome="Fighter" (`data-testid="add-row-name"`), HP=45 (`data-testid="add-row-hp"`), AC=18 (`data-testid="add-row-ac"`), Init=15 (`data-testid="add-row-init"`)
8. Clicar botão "Adicionar" (`data-testid="add-row-btn"`)
9. Verificar que agora há 2 combatentes na lista
10. Clicar "🎲 Rolar NPCs" (`data-testid="roll-npcs-init-btn"`) para rolar iniciativa dos monstros
11. Clicar "Iniciar Combate →" (`data-testid="start-combat-btn"`)
12. Verificar combate ativo (`data-testid="active-combat"`): lista de iniciativa visível (`data-testid="initiative-list"`)
13. Verificar turno indicator (`data-testid="dm-sticky-turn-indicator"`)

### Combate Ativo
14. Clicar "Próximo Turno →" (`data-testid="next-turn-btn"`) — verificar turno avança, highlight muda
15. Clicar botão HP de qualquer combatente (`data-testid="hp-btn-*"`) → verificar adjuster abre
16. No HP adjuster: inserir 5, clicar "Aplicar Dano" (`data-testid="hp-apply-btn"`) → verificar HP atualiza
17. Fechar HP adjuster (`data-testid="hp-close-btn"`)
18. Clicar expand do combatente (`data-testid="expand-toggle-*"`) → verificar conditions area
19. Aplicar condição "Poisoned" → verificar badge aparece (`data-testid="conditions-*"`)
20. Verificar HP bar muda de cor conforme dano (LIGHT >70%, MODERATE >40%, HEAVY >10%, CRITICAL ≤10%)

### Mid-Combat Add
21. Usar form mid-combat (`data-testid="mid-combat-add-row"`) para adicionar "Reinforcement" com HP=20
22. Clicar adicionar (`data-testid="mid-add-row-btn"`)
23. Verificar novo combatente aparece na initiative list

### Encerrar
24. Clicar "Encerrar combate" (`data-testid="end-encounter-btn"`)
25. Se AlertDialog aparecer, confirmar encerramento
26. Verificar CTA de signup visível pós-combate

### Gremlin Tests — Guest Combat
27. **Refresh mid-combat:** Durante combate ativo, dar F5 → estado deve restaurar do localStorage
28. **HP overflow:** Tentar curar acima do HP máximo → HP não deve ultrapassar max
29. **HP underflow:** Aplicar dano maior que HP atual → HP deve ir a 0, não negativo
30. **Nome vazio:** Tentar adicionar combatente com nome vazio → deve bloquear ou dar erro
31. **HP gigante:** Adicionar combatente com HP=99999 → deve aceitar sem quebrar layout
32. **Iniciativa negativa:** Adicionar com Init=-5 → deve aceitar (DnD permite negativo)
33. **20+ combatentes:** Adicionar 20 monstros → verificar performance (scroll, HP adjust continuam responsivos)
34. **Clique rápido "Próximo Turno":** Clicar 10x rapidamente → deve avançar sem pular turnos ou duplicar
35. **Duplo clique "Iniciar Combate":** Clicar 2x rápido → não deve criar 2 combates
36. **Action Log:** Clicar botão action log (`data-testid="action-log-btn"`) → verificar log mostra ações realizadas

**Resultado esperado:** Combate completo funciona sem login. Guest banner sempre visível. Edge cases tratados.

---

## JORNADA 3 — Primeiro Login + Onboarding Wizard

**Objetivo:** Simular experiência de novo DM: login → onboarding → dashboard.

### Login
1. Navegar para `/auth/login`
2. Verificar campos: email, senha, botão submit, link "Criar conta", link "Esqueci minha senha"
3. **Teste de erro:** Tentar login com email errado → verificar mensagem de erro visível
4. **Teste de erro:** Tentar login com senha errada → verificar mensagem de erro
5. Fazer login correto com DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
6. Esperar redirect para `/app/dashboard` (timeout máx 5s)
7. Verificar que a URL é `/app/dashboard` ou `/app/onboarding`

### Onboarding (se aparecer)
8. Se redirecionado para `/app/onboarding` (`data-testid="onboarding-wizard"` ou `data-testid="welcome-screen"`):
   - Verificar tela de boas-vindas
   - Verificar se há opção express (`data-testid="onboarding-express"`)
   - Se wizard completo:
     - Step 1: Preencher nome da campanha "Mesa de Teste QA"
     - Clicar "Próximo"
     - Step 2: Adicionar 2 jogadores (Nome="Thorin" HP=45 AC=18, Nome="Elara" HP=30 AC=12)
     - Clicar "Próximo"
     - Step 3: Preencher nome do encontro "Emboscada Goblin"
     - Clicar "Próximo"
     - Step 4: Revisar resumo e confirmar
     - Verificar link de convite gerado e botão de copiar
   - Se express: preencher e submeter (`data-testid="express-submit-btn"`)

### Dashboard
9. No dashboard (`data-testid="dashboard-overview"`):
   - Verificar quick actions visíveis (`data-testid="quick-actions"`)
   - Verificar seção campanhas do DM (`data-testid="dm-campaigns"`)
   - Verificar seção campanhas como player (`data-testid="player-campaigns"`)
   - Verificar seção combates recentes (`data-testid="recent-combats"`)
10. Verificar sidebar (`data-testid="sidebar"`):
    - "Visão Geral" (`data-testid="nav-overview"`)
    - "Campanhas" (`data-testid="nav-campaigns"`)
    - "Combates" (`data-testid="nav-combats"`)
    - "Personagens" (`data-testid="nav-characters"`)
    - "Soundboard" (`data-testid="nav-soundboard"`)
    - "Presets" (`data-testid="nav-presets"`)
    - "Configurações" (`data-testid="nav-settings"`)
11. Clicar em cada item da sidebar → verificar navegação funciona sem erro

### Quick Actions
12. Clicar "Novo Combate" (`data-testid="quick-action-new_combat"`) → deve ir para `/app/session/new`
13. Voltar ao dashboard
14. Clicar "Criar NPC" (`data-testid="quick-action-create_npc"`) → deve abrir flow de NPC
15. Voltar ao dashboard
16. Clicar "Convidar Jogador" (`data-testid="quick-action-invite_player"`) → deve abrir flow de convite

### Gremlin Tests — Auth
17. **Token expirado simulado:** Fazer logout, navegar direto para `/app/dashboard` → deve redirecionar para login
18. **Duplo login:** Abrir 2 tabs em `/auth/login`, fazer login nas duas → ambas devem funcionar
19. **Navegação pós-logout:** Fazer logout, clicar "Voltar" do browser → não deve acessar área logada
20. **Refresh no dashboard:** Dar F5 no dashboard → deve manter sessão e recarregar dados

**Resultado esperado:** Login funciona. Dashboard carrega com todos os dados. Sidebar navegável. Quick actions funcionais.

---

## JORNADA 10 — Combate Autenticado (DM + Player Multiplayer)

**Objetivo:** Testar fluxo completo multiplayer: DM cria sessão, player entra, combate realtime.

### DM — Setup da Sessão
1. Login como DM (`dm.primary@test-taverna.com`)
2. Navegar para `/app/session/new`
3. Se campaign picker aparecer, selecionar uma campanha (ou "Quick Combat")
4. Na search SRD (`data-testid="srd-search-input"`), buscar "Adult Red Dragon"
5. Adicionar o dragão clicando "Adicionar" (`data-testid="add-one-*"`)
6. Abrir form manual (`data-testid="add-row"`), adicionar "Paladin" (HP=65, AC=20, Init=18)
7. Clicar adicionar (`data-testid="add-row-btn"`)
8. Verificar 2 combatentes na setup list
9. Rolar iniciativa dos NPCs (`data-testid="roll-npcs-init-btn"`)
10. **Antes de iniciar:** Copiar/anotar a URL da sessão (link de join) — procurar QR Code ou botão "Copiar link"
11. Clicar "Iniciar Combate →" (`data-testid="start-combat-btn"`)
12. Verificar combate ativo (`data-testid="active-combat"`)

### Player — Join na Sessão
13. **Abrir novo contexto de browser** (incógnito ou nova sessão)
14. Navegar para a URL de join anotada (formato: `/join/[token]`)
15. Verificar tela de join com campos: Nome, HP, AC, Iniciativa
16. Preencher: Nome="Thorin", HP=52, AC=20, Iniciativa=15
17. Clicar botão de entrar/registrar
18. Aguardar estado de "Esperando aprovação do DM..."

### DM — Aceitar Player
19. **Voltar ao contexto do DM**
20. Verificar notificação/toast de late-join request
21. Clicar "Aceitar" na notificação
22. Verificar player "Thorin" aparece na initiative list

### Player — Verificar View
23. **Voltar ao contexto do Player**
24. Verificar player view carregou (`data-testid="player-view"`)
25. Verificar sticky turn header (`data-testid="sticky-turn-header"`) mostra turno atual
26. Verificar próprio personagem destacado (`data-testid="own-character-*"`)
27. Verificar monstros mostram apenas status (FULL/LIGHT/MODERATE/HEAVY/CRITICAL), **NÃO HP exato**
28. Verificar player bottom bar visível em mobile (`data-testid="player-bottom-bar-*"`)

### Combate Realtime
29. **No DM:** Avançar turno (`data-testid="next-turn-btn"`)
30. **No Player:** Verificar turno atualizou em ≤3 segundos
31. **No DM:** Aplicar 30 de dano no dragão
32. **No Player:** Verificar status do dragão mudou (FULL → LIGHT ou similar) em ≤3 segundos
33. **No DM:** Aplicar condição "Frightened" no dragão
34. **No Player:** Verificar badge de condição aparece no dragão
35. **No DM:** Avançar turnos até chegar no turno do Thorin
36. **No Player:** Verificar highlight no próprio turno, bottom bar ativa

### Encerrar Combate
37. **No DM:** Clicar "Encerrar combate" (`data-testid="end-encounter-btn"`)
38. Se AlertDialog aparecer com "Pular"/"Salvar" → clicar "Pular"
39. Verificar post-combat summary no DM
40. **No Player:** Verificar tela de "sessão encerrada" ou redirecionamento

### Gremlin Tests — Multiplayer
41. **DM fecha tab sem encerrar:** Fechar tab do DM → no player, verificar se aparece indicador "DM desconectado" após ~60s
42. **Player refresh:** No contexto do player, dar F5 → deve reconectar automaticamente SEM mostrar form de join novamente
43. **2 players mesmo nome:** Segundo player tenta entrar com Nome="Thorin" → verificar como o sistema trata duplicata
44. **DM rejeita player:** Player envia request, DM rejeita → player vê mensagem de rejeição, pode tentar novamente
45. **Late-join timeout:** Player envia request, DM NÃO responde por 2min → player vê timeout com botão "Tentar Novamente"
46. **Clique rápido DM:** DM clica "Próximo Turno" 5x rapidamente → turnos avançam sem pular ou duplicar

**Resultado esperado:** Multiplayer funciona E2E. Realtime sync ≤3s. Privacy de HP respeitada. Late-join funcional.

---

## JORNADA 12 — Responsividade Mobile (iPhone 14 — 390x844)

**Objetivo:** Verificar que as jornadas críticas funcionam em viewport mobile.

### Setup
1. Redimensionar viewport para **390x844** (iPhone 14)

### Landing Page Mobile
2. Navegar para `/` → verificar hero section responsiva (sem overflow horizontal)
3. Verificar nav colapsa em hamburger menu
4. Abrir hamburger → verificar links funcionam
5. Scroll até pricing → verificar cards empilham verticalmente
6. Verificar nenhum overflow horizontal em toda a landing page

### Guest Combat Mobile
7. Navegar para `/try`
8. Verificar guest banner visível sem overflow
9. Buscar "Goblin" na search → verificar resultados cabem na tela
10. Adicionar Goblin + adicionar manual "Fighter" (HP=30, AC=15)
11. Verificar form manual usável (labels visíveis, inputs acessíveis)
12. Iniciar combate → verificar initiative list renderiza
13. Verificar sticky turn indicator (`data-testid="dm-sticky-turn-indicator"`) visível no topo
14. Avançar turno → verificar transição suave
15. Abrir HP adjuster (`data-testid="hp-btn-*"`) → verificar modal não ultrapassa tela
16. Aplicar dano → fechar modal → verificar HP atualiza
17. Verificar que o teclado virtual (ao tocar em input de HP) NÃO cobre o campo de input
18. Encerrar combate → verificar CTA visível

### Dashboard Mobile
19. Login como DM
20. No dashboard → verificar sidebar colapsa em hamburger ou bottom nav (`data-testid="bottom-nav"`)
21. Verificar bottom nav items visíveis e clicáveis
22. Verificar dashboard sections são scrolláveis verticalmente
23. Clicar em uma campanha → verificar seções colapsáveis funcionam com tap

### Campaign Page Mobile
24. Na página da campanha → expandir/colapsar seções com tap
25. Verificar Mind Map renderiza (pode ter scroll horizontal, mas não deve quebrar)
26. Verificar que NPCs, Notas, Quests são legíveis

### Touch Targets
27. Verificar que TODOS os botões de ação têm no mínimo **44x44px** de touch target
28. Testar especificamente:
    - Botão "Próximo Turno"
    - Botões de HP/Cond nos combatentes
    - Botão "Adicionar" no search
    - Links da sidebar/bottom nav
    - Botão "Iniciar Combate"

### Gremlin Tests — Mobile
29. **Rotação:** Girar para landscape e voltar para portrait durante combate → layout NÃO deve quebrar
30. **Pull-to-refresh acidental:** Puxar pra baixo no topo → estado não deve ser perdido
31. **Keyboard overlap:** Tocar em qualquer input → verificar que o campo fica visível acima do teclado
32. **Scroll horizontal parasita:** Em NENHUMA página deve haver scroll horizontal involuntário
33. **Zoom acidental:** Verificar que double-tap NÃO dá zoom (meta viewport deve prevenir)

**Resultado esperado:** App 100% funcional em 390x844. Zero overflow horizontal. Touch targets ≥44px.

---

## JORNADA 16 — Reconnection & Network Resilience

**Objetivo:** Testar a cadeia de fallbacks de reconexão (spec: `docs/spec-resilient-reconnection.md`).

> **NOTA:** Alguns destes testes requerem simulação de condições de rede. Use Playwright network throttling ou ferramentas do browser.

### Reconnexão Silenciosa (0-5 min)
1. Iniciar sessão de combate como DM + Player (reusar setup da Jornada 10)
2. **No player:** Fechar a tab do browser
3. Esperar 30 segundos
4. Reabrir a URL de join
5. **Espera:** Player deve reconectar automaticamente:
   - Nome já preenchido (do localStorage)
   - SEM formulário de registro
   - SEM aprovação do DM
   - Skeleton loading durante reconexão (NÃO tela branca)
6. Verificar combat board carrega com estado atual

### Reconnexão por visibilitychange
7. **No player:** Trocar para outra tab (simular `visibilitychange` → hidden)
8. Esperar 10 segundos
9. Voltar para a tab do Pocket DM (`visibilitychange` → visible)
10. **Espera:**
    - Estado atualiza automaticamente
    - Nenhum banner de erro nos primeiros 3 segundos
    - Turno correto mostrado

### DM Disconnect Detection
11. **No DM:** Fechar a tab do browser (simula DM offline)
12. **No Player:** Observar por 60 segundos
13. **Espera:** Player vê indicador "DM desconectado" em até 60s (broadcast ~10s, polling fallback ~60s)

### Player Refresh Mid-Combat
14. **No Player:** Dar F5 durante combate ativo
15. **Espera:**
    - Página recarrega
    - Identidade restaurada do sessionStorage
    - Combat board reaparece sem form de registro
    - Estado do combate correto (turno, HP, condições)

### Guest Combat Refresh
16. Navegar para `/try`, iniciar combate, avançar 3 turnos, aplicar dano
17. Dar F5 (refresh)
18. **Espera:** Estado restaura do localStorage:
    - Mesmos combatentes
    - HP correto
    - Turno correto
    - Condições mantidas

### Late-Join Timeout & Retry
19. Iniciar nova sessão como DM
20. Player envia request de join
21. DM NÃO responde (não clica aceitar)
22. **Espera:** Após ~2 min:
    - Player vê estado "timeout"
    - Botão "Tentar Novamente" visível
    - Countdown foi visível durante espera (formato MM:SS)
23. Clicar "Tentar Novamente"
24. DM aceita desta vez
25. Player entra normalmente

### Gremlin Tests — Network
26. **Offline momentâneo:** Desabilitar network por 5s, reabilitar → player deve reconectar silenciosamente
27. **Offline prolongado (30s):** Desabilitar network por 30s → banner "Reconectando..." deve aparecer após ~3s, reconectar ao restaurar
28. **Múltiplas reconexões:** Alternar network on/off 5 vezes rapidamente → app não deve crashar ou mostrar múltiplos banners
29. **Storage limpo:** Limpar localStorage manualmente → no refresh, player deve ver formulário de join (último fallback)

**Resultado esperado:** Reconexão automática e invisível. Zero tela branca. Fallbacks funcionam em cadeia.

---

## CHECKLIST FINAL — TIER 1

Após completar todas as jornadas, compile o relatório:

| # | Jornada | Status | Bugs Críticos | Bugs Menores | Screenshots | Observações UX |
|---|---------|--------|---------------|--------------|-------------|----------------|
| 1 | Landing + SEO + Funil | PASS/FAIL | | | | |
| 2 | Guest Combat | PASS/FAIL | | | | |
| 3 | Login + Onboarding | PASS/FAIL | | | | |
| 10 | Combate Multiplayer | PASS/FAIL | | | | |
| 12 | Mobile (390x844) | PASS/FAIL | | | | |
| 16 | Reconnection & Network | PASS/FAIL | | | | |
| 19 | Funil Orgânico | PASS/FAIL | | | | |

### Métricas a reportar:
- **Cliques até primeiro combate** (funil orgânico): ___
- **Latência realtime** (DM action → player update): ___ ms
- **Tempo de reconexão** (tab close → board restore): ___ s
- **Overflow horizontal mobile:** SIM/NÃO
- **Touch targets <44px encontrados:** Lista: ___

Salve screenshots em `qa-evidence/tier1/` e o relatório em `docs/qa-report-tier1-[data].md`.
