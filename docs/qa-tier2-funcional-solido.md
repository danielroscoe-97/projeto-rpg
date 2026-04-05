# QA Tier 2 — Funcional Sólido

> **Prioridade alta.** Estas jornadas cobrem o CRUD core do app e fluxos de engajamento.
> Devem funcionar bem, mas não são blocker para o demo.
> Cole este prompt em uma janela do Claude Code com Playwright MCP.

---

## CONTEXTO

Você é um QA tester do **Pocket DM** (https://www.pocketdm.com.br), um combat tracker de D&D 5e.
O app roda em `http://localhost:3000`. Use Playwright (browser MCP) para navegar e testar.

**Credenciais de teste:**
- DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
- Player 1: `player.warrior@test-taverna.com` / `TestPlayer_War!1`
- Player 2: `player.mage@test-taverna.com` / `TestPlayer_Mage!2`

**Regras gerais:**
- Faça screenshot a cada step importante → salve em `qa-evidence/tier2/`
- Se algo falhar, documente o erro com screenshot e continue
- Use seletores `data-testid` quando disponíveis, senão use texto/aria-label
- O app é em PT-BR por padrão
- Após cada jornada: **PASS/FAIL + screenshot + observações de UX**

---

## JORNADA 4 — Criação de Campanha (Dashboard)

**Objetivo:** Testar criação completa de nova campanha via dashboard.

### Happy Path
1. Login como DM (`dm.primary@test-taverna.com`)
2. No dashboard, clicar "Campanhas" na sidebar (`data-testid="nav-campaigns"`) → navegar para `/app/dashboard/campaigns`
3. Verificar lista de campanhas existentes (ou empty state `data-testid="dm-empty-state"`)
4. Procurar botão "Nova Campanha" ou "Criar Campanha" — clicar
5. Preencher nome da campanha: "Minas de Phandelver QA"
6. Confirmar criação
7. Verificar redirect para detalhe da campanha `/app/campaigns/[id]`
8. Verificar que a página mostra nome da campanha no header

### Seções da Campanha
9. Verificar presença das seções colapsáveis:
   - Players / Membros
   - NPCs
   - Notas da Campanha
   - Encontros / Histórico
   - Quests
   - Locais
   - Facções
   - Mind Map
10. Expandir e colapsar cada seção → verificar animação suave, sem flicker
11. Verificar que seções vazias mostram empty state / CTA (não tela branca)

### Gremlin Tests
12. **Nome vazio:** Tentar criar campanha com nome vazio → deve bloquear
13. **Nome gigante:** Criar campanha com nome de 200 caracteres → deve aceitar ou truncar graciosamente
14. **Duplicata:** Criar segunda campanha com mesmo nome → deve aceitar (nomes não são unique)
15. **Refresh na página de campanha:** F5 → dados devem persistir
16. **Navegar "Voltar":** Do detalhe da campanha, clicar Voltar do browser → deve voltar pra lista

**Resultado esperado:** Campanha criada com sucesso. Todas as seções visíveis e colapsáveis. Empty states presentes.

---

## JORNADA 5 — Gestão de NPCs

**Objetivo:** Testar CRUD completo de NPCs dentro de uma campanha.

### Setup
1. Login como DM
2. Navegar para uma campanha existente (`/app/campaigns/[id]`)
3. Expandir seção "NPCs"

### Criar NPC
4. Clicar "Add NPC" ou botão equivalente
5. Preencher: Nome="Bartender Grog", Descrição="Dono da taverna, amigável mas misterioso"
6. Salvar NPC
7. Verificar NPC aparece na lista com nome e descrição

### Editar NPC
8. Clicar para editar o NPC "Bartender Grog"
9. Mudar descrição para "Dono da taverna, ex-aventureiro. Tem uma cicatriz no olho esquerdo."
10. Verificar indicador de save automático: "Salvando..." → "Salvo" (ou equivalente)
11. Dar refresh (F5) → verificar que a descrição editada persiste

### Visibilidade
12. Localizar toggle de visibilidade (ícone de olho) no NPC
13. Clicar para tornar NPC oculto (hidden)
14. Verificar indicador visual de NPC oculto (border dashed, opacidade, ícone olho-fechado)
15. Clicar novamente para tornar visível → verificar indicador volta ao normal

### Criar Segundo NPC
16. Criar: Nome="Dragão Anciã Vermelha", adicionar stats se possível (HP=256, AC=22)
17. Verificar segundo NPC aparece na lista

### Deletar NPC
18. Clicar botão de deletar no "Dragão Anciã Vermelha"
19. Verificar dialog de confirmação aparece
20. Confirmar deleção
21. Verificar NPC removido da lista
22. Verificar que "Bartender Grog" ainda existe (deleção não afetou outro NPC)

### Gremlin Tests
23. **NPC sem nome:** Tentar criar NPC com nome vazio → deve bloquear
24. **NPC com descrição gigante:** Colar 5000 caracteres na descrição → deve aceitar sem quebrar layout
25. **Edição simultânea:** Abrir NPC, editar, SEM esperar auto-save, fechar seção → auto-save deve ter capturado
26. **Delete sem confirmar:** Abrir dialog de delete, clicar fora (dismiss) → NPC NÃO deve ser deletado
27. **Múltiplos NPCs:** Criar 10 NPCs rapidamente → lista deve renderizar todos sem lag

**Resultado esperado:** CRUD completo funciona. Auto-save funciona. Visibilidade toggle funciona. Delete com confirmação.

---

## JORNADA 6 — Sistema de Notas

**Objetivo:** Testar criação, organização e compartilhamento de notas de campanha.

### Criar Notas
1. Na campanha, expandir seção "Notas da Campanha"
2. Clicar "Nova Nota" / "New Note"
3. Preencher título: "Sessão 1 — A Caverna dos Goblins"
4. Preencher conteúdo: "Os aventureiros encontraram uma caverna cheia de goblins. O líder goblin, Klarg, guarda um prisioneiro humano."
5. Verificar auto-save: indicador "Salvando..." → "Salvo"

### Organização em Pastas
6. Criar uma pasta/folder: "Sessões" (se a funcionalidade existir)
7. Mover a nota para dentro da pasta
8. Verificar que a nota aparece dentro da pasta

### Privacidade
9. Criar segunda nota: "Nota Secreta do DM" — marcar como PRIVADA (não compartilhada)
10. Criar terceira nota: "Informações para Players" — marcar como COMPARTILHADA
11. Verificar badges visuais:
    - Nota privada: ícone de cadeado ou indicador visual "privado"
    - Nota compartilhada: ícone de olho ou indicador visual "compartilhado"

### Interação
12. Expandir/colapsar conteúdo de cada nota → verificar conteúdo aparece/desaparece
13. Editar conteúdo de uma nota existente → verificar auto-save
14. Verificar que markdown ou formatação básica funciona no conteúdo (se suportado)

### Deletar
15. Deletar uma nota
16. Verificar dialog de confirmação
17. Confirmar → nota removida
18. Verificar que outras notas não foram afetadas

### Gremlin Tests
19. **Nota sem título:** Criar nota com título vazio → deve bloquear ou usar placeholder
20. **Conteúdo enorme:** Colar 10.000 caracteres no conteúdo → deve aceitar sem quebrar
21. **Caracteres especiais:** Título com emojis, acentos, caracteres especiais (É, ñ, ü) → deve renderizar corretamente
22. **Refresh após edição:** Editar nota, dar F5 antes do auto-save indicator → verificar se salvou
23. **Múltiplas notas:** Criar 15 notas → lista deve ser navegável sem lag

**Resultado esperado:** Notas com CRUD completo. Organização em pastas funcional. Toggle compartilhado/privado com indicadores visuais.

---

## JORNADA 7 — Convite de Jogador para Campanha

**Objetivo:** Testar o fluxo completo de convite por link e aceitação.

### DM — Gerar Convite
1. Login como DM
2. Navegar para uma campanha
3. Expandir seção "Players" / "Membros"
4. Clicar botão "Convidar Jogador" / "Invite Player"
5. Verificar que um link de convite é gerado
6. Clicar "Copiar" → verificar feedback de clipboard (toast "Copiado!" ou similar)
7. Anotar a URL (pode ser `/invite/[token]` ou `/join-campaign/[code]`)

### Player — Aceitar Convite
8. **Abrir novo contexto de browser** (incógnito)
9. Navegar para a URL de convite copiada
10. Se não logado → verificar redirecionamento para login/signup **com preservação do token de convite**
11. Login como Player: `player.warrior@test-taverna.com` / `TestPlayer_War!1`
12. Verificar tela de "Aceitar Convite" / "Entrar na Campanha"
13. Verificar opções disponíveis:
    - Criar personagem novo
    - Selecionar personagem existente (se houver)
    - Claim personagem criado pelo DM (se existir personagem unlinked)
14. **Criar personagem novo:**
    - Nome: "Thorin Escudo de Carvalho" (`data-testid="invite-char-name"`)
    - HP: 52, AC: 20, Spell Save DC: 15 (se campos disponíveis)
15. Clicar "Criar personagem e entrar" / "Aceitar convite"
16. Verificar redirect para dashboard do player ou página da campanha

### DM — Verificar Membro
17. **Voltar ao contexto do DM**
18. Refresh na página da campanha
19. Verificar que novo membro aparece na lista de Players
20. Verificar que o personagem "Thorin Escudo de Carvalho" está listado

### Gremlin Tests
21. **Link expirado/inválido:** Navegar para `/invite/token-invalido-123` → deve mostrar erro amigável, não tela branca
22. **Duplo aceite:** Usar mesmo link de convite duas vezes com mesmo player → deve detectar que já é membro
23. **Player já na campanha:** DM convida player que já é membro → deve mostrar aviso
24. **Convite sem login:** Acessar link sem estar logado → verificar que após login, volta ao fluxo de convite (não perde contexto)
25. **Cancelar no meio:** Abrir tela de aceitar, clicar "Voltar" sem aceitar → convite continua válido para uso futuro

**Resultado esperado:** Convite por link funciona E2E. Player cria personagem. DM vê novo membro. Link preservado entre login.

---

## JORNADA 9 — Mind Map da Campanha

**Objetivo:** Testar a visualização interativa do mind map.

### Setup
1. Login como DM
2. Navegar para uma campanha que tenha NPCs, notas, quests criados (se não tiver, criar pelo menos: 2 NPCs, 2 notas, 1 quest, 1 location, 1 faction)
3. Expandir seção "Mind Map"

### Renderização
4. Verificar que o grafo renderiza com nó central (nome da campanha, cor dourada/gold)
5. Verificar nós por tipo e cor:
   - NPCs → roxo (#a78bfa)
   - Notas → azul (#60a5fa)
   - Players → verde/emerald (#34d399)
   - Quests → amarelo (#eab308)
   - Locations → cyan (#22d3ee)
   - Factions → rosa (#fb7185)
   - Sessions → vermelho (#ef4444)
6. Verificar que edges (conexões) ligam nós ao nó central

### Interação
7. **Zoom:** Usar scroll wheel para zoom in → verificar nós ficam maiores
8. **Zoom out:** Scroll wheel reverso → verificar overview
9. **Pan:** Clicar e arrastar o canvas → mapa deve se mover
10. **Click em nó NPC:** Clicar em um nó de NPC → verificar que a página rola (scroll) para a seção de NPCs
11. **Click em nó Nota:** Clicar em um nó de Nota → verificar scroll para seção de Notas
12. **Click em nó Quest:** Se disponível, clicar → verificar scroll para seção de Quests

### Filtros
13. Localizar toggles de filtro por tipo (NPC, Nota, Quest, Location, Faction)
14. Desativar filtro de NPCs → verificar nós de NPC desaparecem do grafo
15. Reativar → nós voltam
16. Desativar todos os filtros → verificar apenas nó central resta (ou estado vazio)
17. Reativar todos → grafo completo volta

### Controles
18. Verificar minimap no canto inferior direito
19. Testar botão "Fit to View" / "Ajustar" → grafo centraliza
20. Testar controles de zoom (+/-) se existirem

### Gremlin Tests
21. **Campanha vazia:** Abrir mind map de campanha sem NPCs/notas/quests → deve mostrar apenas nó central ou empty state
22. **Muitos nós:** Campanha com 20+ entidades → verificar performance (não deve travar ou ficar lento)
23. **Resize da janela:** Redimensionar browser → mind map deve se adaptar
24. **Mobile:** Em viewport 390x844, verificar que o mind map é navegável (pode ser scroll horizontal)

**Resultado esperado:** Mind map interativo renderiza. Nós clicáveis scrollam para seções. Filtros toggleam nós. Zoom/pan funcional.

---

## JORNADA 13 — First-Time Player Experience (NOVA)

**Objetivo:** Testar a experiência de um jogador que NUNCA usou o app e recebeu um link do DM.

### Simulação: Player recebe link no WhatsApp
1. **Abrir browser limpo** (incógnito, sem cookies do Pocket DM)
2. Navegar para URL de convite de campanha (formato `/invite/[token]` ou `/join-campaign/[code]`)
   - Se não tiver um link ativo, primeiro gere um como DM (login DM → campanha → convidar → copiar link)

### Primeiro Contato
3. Verificar o que o player vê SEM estar logado:
   - Tela de convite com nome da campanha?
   - Redirect para signup?
   - Mensagem clara sobre o que fazer?
4. Verificar que o contexto do convite NÃO é perdido durante signup/login
5. Se redireciona para signup → verificar campos obrigatórios (email, senha)
6. Se redireciona para login → verificar link para "Criar conta" visível

### Signup + Aceitar Convite
7. Fazer login como player: `player.mage@test-taverna.com` / `TestPlayer_Mage!2`
8. Verificar que retorna ao fluxo de convite (NÃO cai no dashboard genérico)
9. Completar aceitação do convite (criar personagem, etc.)
10. Verificar aterrissagem pós-aceite: deve mostrar a campanha ou dashboard com a campanha visível

### Player Dashboard Experience
11. No dashboard do player:
    - Verificar seção "Minhas Campanhas" mostra a campanha que acabou de entrar
    - Clicar na campanha → verificar "Player Campaign View"
    - Verificar informações visíveis: Meu Personagem, Companheiros, Histórico de Combate
12. Se houver sessão ativa do DM → verificar botão "Entrar na Sessão" visível

### Gremlin Tests
13. **Signup flow quebrado:** No meio do signup, clicar "Voltar" → link de convite ainda funciona
14. **Player sem campanha:** Dashboard do player sem nenhuma campanha → verificar empty state informativo
15. **Múltiplos convites:** Aceitar convite de 2 campanhas diferentes → ambas aparecem no dashboard

**Resultado esperado:** Player first-time tem jornada clara do link → signup → campanha. Zero perda de contexto.

---

## CHECKLIST FINAL — TIER 2

| # | Jornada | Status | Bugs Encontrados | Screenshots | Observações UX |
|---|---------|--------|-----------------|-------------|----------------|
| 4 | Criar Campanha | PASS/FAIL | | | |
| 5 | NPCs (CRUD) | PASS/FAIL | | | |
| 6 | Notas | PASS/FAIL | | | |
| 7 | Convite Player | PASS/FAIL | | | |
| 9 | Mind Map | PASS/FAIL | | | |
| 13 | First-Time Player | PASS/FAIL | | | |

### Métricas a reportar:
- **Auto-save latência** (editar NPC/Nota → "Salvo"): ___ ms
- **Empty states presentes em todas seções:** SIM/NÃO (listar faltantes)
- **Mind map render time** (expandir seção → grafo visível): ___ ms
- **Convite preserva contexto pós-login:** SIM/NÃO

Salve screenshots em `qa-evidence/tier2/` e o relatório em `docs/qa-report-tier2-[data].md`.
