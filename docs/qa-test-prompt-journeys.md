# Prompt de QA — Microjornadas do Pocket DM

> Cole este prompt em outra janela do Claude Code (ou qualquer agente com Playwright MCP).
> O agente deve navegar em http://localhost:3000 e testar cada jornada descrita.

---

## CONTEXTO

Você é um QA tester do **Pocket DM** (https://www.pocketdm.com.br), um combat tracker de D&D 5e.
O app roda em `http://localhost:3000`. Use Playwright (browser MCP) para navegar e testar.

**Credenciais de teste:**
- DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
- Player: `player.warrior@test-taverna.com` / `TestPlayer_War!1`
- Player 2: `player.mage@test-taverna.com` / `TestPlayer_Mage!2`

**Regras:**
- Faça screenshot a cada step importante
- Se algo falhar, documente o erro e continue para o próximo cenário
- Use seletores `data-testid` quando disponíveis, senão use texto/aria-label
- O app é em PT-BR por padrão
- Após cada jornada, reporte: PASS/FAIL + screenshot + observações de UX

---

## JORNADA 1 — Landing Page e Navegação Pública

**Objetivo:** Verificar que visitantes conseguem navegar pela landing page e acessar o compêndio.

### Steps:
1. Navegar para `http://localhost:3000`
2. Verificar hero section: título "Domine o combate. Abandone o papel.", botões "Testar Grátis" e "Salvar minhas campanhas"
3. Scroll até seção Features — confirmar 6 cards visíveis
4. Scroll até seção "Como funciona" — confirmar 4 steps
5. Scroll até seção Comparativo — confirmar tabela com Roll20, D&D Beyond, Pocket DM
6. Scroll até Pricing — confirmar plano Grátis (R$ 0) e Pro (R$ 14,90)
7. Clicar "Testar Grátis" → deve ir para `/try`
8. Voltar, clicar link "Preços" no nav → deve scrollar para #precos
9. Navegar para `/monstros` → verificar lista de monstros com search
10. Clicar em qualquer monstro → verificar stat block renderiza com token, stats, ações
11. Na página do monstro, clicar botão "Traduzir" → verificar que o botão NÃO muda de posição e a ficha alterna entre EN/PT-BR
12. Navegar para `/magias` → verificar lista de magias com filtros

**Resultado esperado:** Todas as páginas públicas carregam sem erro. Navegação fluida. Compêndio funcional.

---

## JORNADA 2 — Guest Combat (Modo Visitante)

**Objetivo:** Testar o fluxo completo de combate sem login.

### Steps:
1. Navegar para `/try`
2. Verificar banner "Modo Visitante" com timer de 60min
3. Na search bar (`data-testid="srd-search-input"`), digitar "Goblin"
4. Nos resultados (`data-testid="srd-results"`), clicar botão "Adicionar" do primeiro resultado
5. Verificar Goblin aparece na lista de combatentes (`data-testid="setup-combatant-list"`)
6. Clicar botão "+ Monstro/Jogador Manual" para abrir form manual
7. Preencher: Nome="Fighter", HP=45, AC=18, Init=15
8. Clicar botão "Adicionar" (`data-testid="add-row-btn"`)
9. Verificar que agora há 2 combatentes na lista
10. Clicar "🎲 Rolar NPCs" para rolar iniciativa dos monstros
11. Clicar "Iniciar Combate →" (`data-testid="start-combat-btn"`)
12. Verificar combate ativo: lista de iniciativa visível (`data-testid="initiative-list"`)
13. Clicar "Próximo Turno →" (`data-testid="next-turn-btn"`) — verificar turno avança
14. Clicar botão "HP" em qualquer combatente → verificar adjuster abre (`data-testid="hp-adjuster"`)
15. Aplicar 3 de dano → verificar HP atualiza
16. Clicar "Cond" → verificar ConditionSelector abre com 13+ condições
17. Aplicar condição "Poisoned" → verificar badge aparece no combatente
18. Clicar "Encerrar combate" (`data-testid="end-encounter-btn"`)
19. Verificar que banner de signup CTA está visível

**Resultado esperado:** Combate completo funciona sem login. Guest banner sempre visível.

---

## JORNADA 3 — Primeiro Login + Onboarding Wizard

**Objetivo:** Simular a experiência de um novo DM fazendo primeiro login e criando sua primeira campanha.

> NOTA: Se a conta de teste já completou o onboarding, o wizard não aparecerá. Nesse caso, teste os steps individualmente.

### Steps:
1. Navegar para `/auth/login`
2. Verificar campos: email (`#login-email`), senha (`#login-password`), botão submit
3. Fazer login com DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
4. Esperar redirect para `/app/dashboard`
5. Verificar botão "Logout" visível no nav
6. **Se o onboarding wizard aparecer (`/app/onboarding`):**
   - Step 1: Preencher nome da campanha "Mesa de Teste QA"
   - Clicar "Próximo"
   - Step 2: Adicionar 2 jogadores:
     - Jogador 1: Nome="Thorin", HP=45, AC=18
     - Jogador 2: Nome="Elara", HP=30, AC=12
   - Clicar "Próximo"
   - Step 3: Preencher nome do encontro "Emboscada Goblin"
   - Clicar "Próximo"
   - Step 4: Revisar resumo e clicar "Criar Campanha"
   - Verificar link de convite gerado e botão de copiar
7. **Se já no dashboard:**
   - Verificar seções: campanhas do DM, ações rápidas, sidebar com links
   - Verificar sidebar: "Visão Geral", "Campanhas", "Combates", "Personagens", "Soundboard", "Presets", "Configurações"

**Resultado esperado:** Login funciona. Dashboard carrega com dados do DM. Onboarding cria campanha completa.

---

## JORNADA 4 — Criação de Campanha (Dashboard)

**Objetivo:** Testar criação de nova campanha via dashboard.

### Steps:
1. Fazer login como DM
2. No dashboard, clicar "Campanhas" na sidebar → `/app/dashboard/campaigns`
3. Verificar lista de campanhas existentes (se houver)
4. Procurar botão "Nova Campanha" ou "Criar Campanha" — clicar
5. Preencher nome da campanha "Minas de Phandelver QA"
6. Confirmar criação
7. Verificar redirect para detalhe da campanha `/app/campaigns/[id]`
8. Verificar que a página mostra: nome da campanha, seções colapsáveis (Players, NPCs, Notas, Encontros, Quests, Locais, Facções, Mind Map)

**Resultado esperado:** Campanha criada com sucesso. Página de detalhe mostra todas as seções.

---

## JORNADA 5 — Gestão de NPCs

**Objetivo:** Testar CRUD completo de NPCs dentro de uma campanha.

### Steps:
1. Fazer login como DM
2. Navegar para uma campanha existente (`/app/campaigns/[id]`)
3. Expandir seção "NPCs"
4. Clicar "Add NPC" ou botão equivalente
5. Preencher: Nome="Bartender Grog", Descrição="Dono da taverna, amigável mas misterioso"
6. Salvar NPC
7. Verificar NPC aparece na lista
8. Clicar para editar o NPC — mudar descrição
9. Verificar save automático (indicador "Salvando..." → "Salvo")
10. Testar toggle de visibilidade (olho/olho-fechado) — NPC deve ficar hidden
11. Verificar NPC marcado como oculto (border dashed ou indicador visual)
12. Criar segundo NPC: Nome="Dragão Anciã", com stats HP=256, AC=22
13. Deletar o segundo NPC — confirmar dialog de confirmação
14. Verificar NPC removido da lista

**Resultado esperado:** CRUD completo funciona. Auto-save funciona. Visibilidade toggle funciona.

---

## JORNADA 6 — Sistema de Notas

**Objetivo:** Testar criação, organização e compartilhamento de notas.

### Steps:
1. Na campanha, expandir seção "Notas da Campanha"
2. Clicar "Nova Nota" / "New Note"
3. Preencher título: "Sessão 1 — A Caverna dos Goblins"
4. Preencher conteúdo: "Os aventureiros encontraram uma caverna cheia de goblins..."
5. Verificar auto-save (indicador "Salvando..." → "Salvo")
6. Criar uma pasta/folder: "Sessões"
7. Mover a nota para dentro da pasta
8. Criar segunda nota: "Nota Secreta do DM" — marcar como PRIVADA (não compartilhada)
9. Criar terceira nota: "Informações para Players" — marcar como COMPARTILHADA
10. Verificar badges: nota privada tem ícone de cadeado, nota compartilhada tem ícone de olho
11. Expandir/colapsar notas — verificar conteúdo aparece/desaparece
12. Deletar uma nota — confirmar dialog

**Resultado esperado:** Notas com CRUD completo, organização em pastas, toggle compartilhado/privado funciona.

---

## JORNADA 7 — Convite de Jogador para Campanha

**Objetivo:** Testar o fluxo de convite por link e aceitação.

### Steps:
1. Fazer login como DM
2. Navegar para uma campanha
3. Expandir seção "Players" / "Membros"
4. Clicar botão "Convidar Jogador" ou "Invite Player"
5. **Tab "Via Link":**
   - Verificar que um link de convite é gerado automaticamente
   - Clicar "Copiar" — verificar feedback de clipboard
   - Anotar a URL (formato: `/join-campaign/[code]`)
6. **Abrir nova aba/contexto (incógnito):**
   - Navegar para a URL copiada
   - Se não logado: deve redirecionar para signup com params preservados
   - Fazer login como Player: `player.warrior@test-taverna.com` / `TestPlayer_War!1`
   - Verificar tela de "Entrar na Campanha"
   - Opção 1: Criar personagem novo (Nome="Thorin Escudo de Carvalho", HP=52, AC=20)
   - Clicar "Criar personagem e entrar"
   - Verificar redirect para dashboard do player
7. **Voltar à aba do DM:**
   - Verificar que o novo membro aparece na lista de membros da campanha
   - Verificar que o personagem do player aparece na seção "Players"

**Resultado esperado:** Convite por link funciona end-to-end. Player consegue criar personagem e entrar.

---

## JORNADA 8 — Criação de Personagem (Player)

**Objetivo:** Testar a gestão de personagens do lado do player.

### Steps:
1. Fazer login como Player (`player.warrior@test-taverna.com`)
2. Navegar para `/app/dashboard`
3. Verificar seção "Minhas Campanhas" (campanhas onde é player)
4. Navegar para `/app/dashboard/characters`
5. Verificar lista de personagens existentes
6. Se possível, criar novo personagem standalone
7. Verificar campos: Nome, Classe, Raça, Nível, HP, AC, Spell Save DC
8. Voltar ao dashboard — clicar em uma campanha onde é membro
9. Verificar "Player Campaign View" com: Meu Personagem, Companheiros, Histórico de Combate, Quests
10. Se houver sessão ativa, verificar botão "Entrar na Sessão"

**Resultado esperado:** Player vê seus personagens e campanhas. View de campanha mostra info relevante.

---

## JORNADA 9 — Mind Map da Campanha

**Objetivo:** Testar a visualização e interação do mind map.

### Steps:
1. Fazer login como DM
2. Navegar para uma campanha que tenha NPCs, notas, quests criados
3. Expandir seção "Mind Map"
4. Verificar que o grafo renderiza com nó central (nome da campanha, cor gold)
5. Verificar nós de NPCs (roxo), Notas (azul), Players (verde), Quests (amarelo)
6. Verificar que locations (cyan) e factions (rosa) aparecem se existirem
7. Testar zoom: scroll wheel para zoom in/out
8. Testar pan: arrastar o canvas
9. Clicar em um nó de NPC → verificar que a página scrolls para a seção de NPCs
10. Clicar em um nó de Nota → verificar scroll para seção de Notas
11. Testar filtros: clicar nos toggles de tipo (NPC, Nota, Quest, etc.) para mostrar/ocultar
12. Verificar minimap no canto inferior direito
13. Testar botão "Fit to View" nos controles

**Resultado esperado:** Mind map interativo funciona. Nós clicáveis scrollam para seções. Filtros funcionam.

---

## JORNADA 10 — Combate Autenticado (DM + Player Join)

**Objetivo:** Testar fluxo completo de combate com DM criando sessão e player entrando.

### Steps:
1. **DM Setup:**
   - Login como DM
   - Navegar para `/app/session/new`
   - Selecionar campanha (se picker aparecer) ou "Quick Combat"
   - Buscar "Adult Red Dragon" na search SRD
   - Adicionar o dragão clicando "Adicionar"
   - Abrir manual form e adicionar "Paladin" (HP=65, AC=20, Init=18)
   - Clicar "Mostrar QR Code" ou "Copiar link da sessão"
   - Anotar a URL de join (`/join/[token]`)
   - Clicar "Iniciar Combate →"
   - Verificar combate ativo

2. **Player Join (novo contexto):**
   - Navegar para a URL de join
   - Preencher nome: "Thorin"
   - Preencher HP: 52, AC: 20, Iniciativa: 15
   - Clicar botão de entrar/registrar
   - Esperar aprovação do DM (toast no DM com "Aceitar")

3. **DM aceita:**
   - No contexto do DM, clicar "Aceitar" no toast de late-join
   - Verificar player aparece na initiative list

4. **Player view:**
   - Verificar sticky turn header no topo (quem é o turno atual)
   - Verificar own character card com HP, AC, DC
   - Verificar monstros mostram apenas status (FULL/LIGHT/etc), não HP exato

5. **Combate:**
   - DM avança turno várias vezes
   - DM aplica dano no dragão
   - Verificar que player view atualiza em tempo real
   - DM encerra combate → AlertDialog com "Pular" / "Salvar"
   - Clicar "Pular"
   - Verificar post-combat summary

**Resultado esperado:** Multiplayer funciona. Realtime sync entre DM e player. Privacy (HP oculto) respeitada.

---

## JORNADA 11 — Quests e Locais

**Objetivo:** Testar criação de quests e locais dentro da campanha.

### Steps:
1. Na campanha, expandir seção "Quests"
2. Digitar "Resgatar o Prisioneiro" no campo de quick-create e pressionar Enter
3. Verificar quest aparece com status "Disponível" (?)
4. Expandir quest → editar descrição
5. Mudar status para "Ativa" (!)
6. Criar segunda quest: "Derrotar o Dragão"
7. Mudar status da primeira para "Completa" (✓) → verificar vai para seção de completas
8. Expandir seção "Locais"
9. Criar local: "Caverna dos Goblins", tipo="dungeon"
10. Criar local: "Vila de Phandalin", tipo="city"
11. Toggle discovery no segundo local → verificar indicador visual muda
12. Expandir seção "Facções"
13. Criar facção: "Guilda dos Ladrões", alinhamento="hostile"
14. Criar facção: "Ordem dos Paladinos", alinhamento="ally"
15. Verificar cores diferentes nos badges (red=hostile, green=ally)

**Resultado esperado:** CRUD de quests, locais e facções funciona. Status e alinhamentos visuais corretos.

---

## JORNADA 12 — Responsividade Mobile

**Objetivo:** Verificar que as jornadas principais funcionam em viewport mobile.

### Steps:
1. Redimensionar viewport para 390x844 (iPhone 14)
2. Repetir Jornada 2 (Guest Combat) em mobile:
   - Verificar que search, add, start combat funcionam em tela pequena
   - Verificar PlayerBottomBar aparece no mobile
   - Verificar sticky turn header não quebra
3. Repetir Jornada 3 (Login + Dashboard) em mobile:
   - Verificar sidebar colapsa em hamburger menu
   - Verificar dashboard sections são scrolláveis
4. Navegar para uma campanha:
   - Verificar seções colapsáveis funcionam com touch
   - Verificar mind map renderiza (pode ser scroll horizontal)
5. Testar landing page em mobile:
   - Verificar hero section responsiva
   - Verificar pricing cards empilham verticalmente

**Resultado esperado:** App funcional em mobile. Nenhum overflow horizontal. Touch targets min 44px.

---

## CHECKLIST FINAL

Após completar todas as jornadas, compile um relatório com:

| Jornada | Status | Bugs Encontrados | Screenshots | Observações UX |
|---------|--------|-----------------|-------------|----------------|
| 1. Landing Page | PASS/FAIL | | | |
| 2. Guest Combat | PASS/FAIL | | | |
| 3. Primeiro Login | PASS/FAIL | | | |
| 4. Criar Campanha | PASS/FAIL | | | |
| 5. NPCs | PASS/FAIL | | | |
| 6. Notas | PASS/FAIL | | | |
| 7. Convite Player | PASS/FAIL | | | |
| 8. Player Characters | PASS/FAIL | | | |
| 9. Mind Map | PASS/FAIL | | | |
| 10. Combate DM+Player | PASS/FAIL | | | |
| 11. Quests e Locais | PASS/FAIL | | | |
| 12. Mobile | PASS/FAIL | | | |

Salve os screenshots em `qa-evidence/` e o relatório em `docs/qa-report-[data].md`.
