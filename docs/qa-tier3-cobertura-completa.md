# QA Tier 3 — Cobertura Completa

> **Prioridade normal.** Estas jornadas cobrem features secundárias, edge cases globais, e qualidade não-funcional.
> Não bloqueiam o demo, mas melhoram a robustez geral.
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
- Faça screenshot a cada step importante → salve em `qa-evidence/tier3/`
- Se algo falhar, documente o erro com screenshot e continue
- Use seletores `data-testid` quando disponíveis, senão use texto/aria-label
- O app é em PT-BR por padrão
- Após cada jornada: **PASS/FAIL + screenshot + observações de UX**

---

## JORNADA 8 — Player Characters (Gestão de Personagens)

**Objetivo:** Testar a gestão de personagens do lado do player.

### Player Dashboard
1. Login como Player (`player.warrior@test-taverna.com`)
2. Navegar para `/app/dashboard`
3. Verificar seção "Minhas Campanhas" — campanhas onde é player (`data-testid="player-campaigns"`)
4. Navegar para `/app/dashboard/characters` (`data-testid="nav-characters"`)
5. Verificar lista de personagens existentes

### Personagem Standalone
6. Se possível, procurar botão "Criar Personagem" / "New Character"
7. Criar personagem:
   - Nome: "Gandalf, o Cinzento"
   - Classe: Mago (se campo existir)
   - Raça: Humano (se campo existir)
   - Nível: 20 (se campo existir)
   - HP: 110
   - AC: 15
   - Spell Save DC: 19
8. Salvar → verificar personagem aparece na lista
9. Editar personagem → mudar HP para 120 → salvar
10. Verificar edição persistiu (refresh)

### Player Campaign View
11. Voltar ao dashboard → clicar em uma campanha onde é membro
12. Verificar "Player Campaign View":
    - Meu Personagem: stats visíveis
    - Companheiros: outros players da campanha
    - Histórico de Combate: combates passados
    - Quests: se houver quests visíveis (compartilhadas pelo DM)
13. Se houver sessão ativa → verificar botão "Entrar na Sessão" funcional

### Gremlin Tests
14. **Personagem sem nome:** Tentar criar com nome vazio → deve bloquear
15. **HP = 0:** Criar personagem com HP=0 → deve aceitar ou avisar
16. **Stats negativos:** AC=-5 → verificar comportamento
17. **Deletar personagem:** Se botão existir, deletar → confirmar dialog → personagem removido
18. **Personagem em múltiplas campanhas:** Verificar se o mesmo personagem aparece em campanhas diferentes (se feature existir)

**Resultado esperado:** Player gerencia personagens. Campaign view mostra informações relevantes. CRUD funcional.

---

## JORNADA 11 — Quests, Locais e Facções

**Objetivo:** Testar CRUD de quests, locations e factions dentro de uma campanha.

### Setup
1. Login como DM
2. Navegar para uma campanha existente

### Quests
3. Expandir seção "Quests"
4. Localizar campo de quick-create (input + Enter)
5. Digitar "Resgatar o Prisioneiro" e pressionar Enter
6. Verificar quest aparece com status inicial (ícone "?" = Disponível)
7. Expandir quest → verificar campo de descrição editável
8. Preencher descrição: "O mercador Sildar Hallwinter foi capturado pelos goblins"
9. Mudar status para "Ativa" (ícone "!") → verificar ícone/badge muda
10. Criar segunda quest: "Derrotar o Dragão Negro"
11. Mudar status da primeira para "Completa" (ícone "✓")
12. Verificar quest completa vai para seção de "Completas" ou fica visualmente diferente
13. Deletar a segunda quest → confirmar → verificar removida

### Locations
14. Expandir seção "Locais" / "Locations"
15. Criar local: Nome="Caverna dos Goblins", Tipo="dungeon"
16. Verificar local aparece com tipo/badge correto
17. Criar local: Nome="Vila de Phandalin", Tipo="city"
18. Verificar tipos disponíveis: city, dungeon, wilderness, building, region (ou equivalentes)
19. Toggle "Descoberto/Undiscovered" no segundo local → verificar indicador visual muda
20. Editar descrição de um local → verificar auto-save
21. Deletar um local → confirmar → verificar removido

### Factions
22. Expandir seção "Facções" / "Factions"
23. Criar facção: Nome="Guilda dos Ladrões", Alinhamento="hostile"
24. Criar facção: Nome="Ordem dos Paladinos", Alinhamento="ally"
25. Criar facção: Nome="Mercadores de Neverwinter", Alinhamento="neutral"
26. Verificar cores nos badges:
    - hostile → vermelho/red
    - ally → verde/green
    - neutral → cinza ou amarelo
27. Toggle visibilidade de uma facção (se feature existir)
28. Editar facção → mudar alinhamento de neutral para ally → verificar cor muda
29. Deletar uma facção → confirmar → verificar removida

### Gremlin Tests
30. **Quest com nome vazio:** Enter no campo vazio → deve bloquear ou ignorar
31. **Nomes com caracteres especiais:** Quest: "L'Élu du Dragon — Missão #3" → deve renderizar corretamente
32. **Muitos itens:** Criar 15 quests + 10 locations + 5 factions → verificar performance da página
33. **Status cycling:** Mudar status de quest Available → Active → Complete → verificar não pode voltar (ou pode?)
34. **Delete em cascata:** Deletar item → verificar que referências no Mind Map foram removidas

**Resultado esperado:** CRUD de quests, locations e factions funciona. Status visuais e alinhamentos corretos. Delete com confirmação.

---

## JORNADA 14 — DM Returning After 2 Weeks (NOVA)

**Objetivo:** Testar a experiência do DM que volta ao app após um período sem usar.

### Contexto
O DM não usa o app há 2 semanas. Ele esqueceu onde parou. O dashboard precisa orientá-lo.

### Dashboard Orientation
1. Login como DM
2. No dashboard (`data-testid="dashboard-overview"`), verificar:
   - **Campanhas visíveis** com nome e última atividade (se mostrado)
   - **Combates recentes** (`data-testid="recent-combats"`) — se vazio, `data-testid="combats-empty-state"`
   - **Quick actions** claras para retomar trabalho
3. Clicar numa campanha → verificar que todas as seções carregam com dados anteriores (NPCs, notas, quests criados em sessões passadas)

### Navigação Intuitiva
4. Verificar que a sidebar indica onde o DM está (link ativo/highlighted)
5. Navegar: Dashboard → Campanhas → Campanha X → voltar → verificar breadcrumb ou navegação clara
6. Verificar que o DM consegue encontrar sessão de combate anterior (Histórico de Combate na campanha)

### Soundboard & Presets
7. Navegar para "Soundboard" (`data-testid="nav-soundboard"`) → `/app/dashboard/soundboard`
8. Verificar que a página carrega (mesmo vazia)
9. Navegar para "Presets" (`data-testid="nav-presets"`) → `/app/presets`
10. Verificar que a página carrega

### Settings
11. Navegar para "Configurações" (`data-testid="nav-settings"`) → `/app/dashboard/settings`
12. Verificar campos de configuração visíveis
13. Verificar opção de logout funcional

### Gremlin Tests
14. **Dashboard sem campanhas:** Se DM não tem campanhas → verificar empty state (`data-testid="dm-empty-state"`) com CTA "Criar Campanha"
15. **Dashboard sem combates:** Verificar empty state de combates (`data-testid="combats-empty-state"`)
16. **Navegação rápida:** Clicar em 5 sidebar items rapidamente → todas devem carregar sem erro
17. **Dados stale:** Verificar que dados exibidos são atuais (não cache antiga)

**Resultado esperado:** DM returning consegue se orientar. Dashboard mostra estado atual. Navegação intuitiva sem dead ends.

---

## JORNADA 15 — Empty States & Boundary Testing (NOVA)

**Objetivo:** Testar como o app lida com estados vazios e inputs extremos.

### Empty States — Campanha Nova
1. Login como DM
2. Criar campanha nova "Campanha Vazia QA"
3. Verificar cada seção vazia:
   - Players: "Nenhum jogador" + CTA "Convidar"
   - NPCs: "Nenhum NPC" + CTA "Criar NPC"
   - Notas: "Nenhuma nota" + CTA "Nova Nota"
   - Encontros: "Nenhum combate" + CTA "Novo Combate"
   - Quests: Vazio + input para criar
   - Locais: Vazio + input para criar
   - Facções: Vazio + input para criar
   - Mind Map: Apenas nó central (nome da campanha)
4. **Cada empty state DEVE ter uma CTA de ação** — se algum mostrar tela branca ou "undefined", é BUG

### Empty States — Dashboard
5. Se possível (novo user ou resetado):
   - Dashboard sem campanhas → verificar `data-testid="dm-empty-state"` com CTA
   - Combates vazios → verificar `data-testid="combats-empty-state"` com CTA
   - Personagens vazios → verificar empty state com CTA

### Boundary Testing — Inputs Extremos
6. **Nome de 1 caractere:** Criar NPC com nome "A" → deve aceitar
7. **Nome de 500 caracteres:** Criar NPC com 500 chars → deve aceitar ou truncar
8. **Caracteres Unicode:** NPC com nome "龍の騎士" (japonês) → deve renderizar
9. **Emojis no nome:** NPC com nome "🐉 Dragão Fire 🔥" → deve renderizar
10. **HTML injection:** Nome `<script>alert('xss')</script>` → deve escapar, NÃO executar
11. **SQL injection:** Nome `'; DROP TABLE npcs; --` → deve tratar como texto puro
12. **HP = 0:** Combatente com HP=0 → deve aceitar
13. **HP = 999999:** Combatente com HP muito alto → deve aceitar sem quebrar layout
14. **AC negativo:** AC=-10 → verificar comportamento
15. **Iniciativa = -20:** Valor extremo negativo → deve aceitar (DnD permite)
16. **Iniciativa = 999:** Valor extremo positivo → deve aceitar

### Boundary Testing — Volumes
17. **50 combatentes em guest combat:** Adicionar 50 monstros → verificar se inicia combate, se scroll funciona
18. **100 notas em campanha:** Criar 100 notas (pode usar repetição) → verificar paginação ou scroll
19. **10 condições no mesmo combatente:** Aplicar 10 condições diferentes → verificar layout do badge area

### Gremlin Tests — Cross-Cutting
20. **Double-submit em todos forms:** Em cada form do app, clicar submit 2x rapidamente → não deve duplicar
21. **Back button em todos fluxos:** Em cada tela, clicar Voltar → deve voltar logicamente
22. **Refresh em todas as telas autenticadas:** F5 → não deve perder sessão
23. **Console errors:** Abrir DevTools console em cada tela → reportar erros JavaScript

**Resultado esperado:** Empty states informativos com CTAs. Inputs extremos tratados graciosamente. Zero XSS/injection.

---

## JORNADA 17 — Shareability & Social Preview (NOVA)

**Objetivo:** Verificar como o app aparece quando compartilhado em redes sociais.

### Open Graph Tags
1. Navegar para `/` (landing page)
2. **Inspecionar** `<head>` por meta tags:
   - `og:title` → deve conter "Pocket DM"
   - `og:description` → descrição do app
   - `og:image` → URL de imagem preview (deve ser acessível)
   - `og:url` → URL canônica
   - `og:type` → "website"
   - `twitter:card` → "summary_large_image" ou equivalente
3. Verificar que `og:image` URL retorna 200 (imagem carrega)

### Páginas de Compêndio
4. Navegar para `/monstros/goblin` (ou slug existente)
5. Verificar meta tags específicas do monstro:
   - `og:title` → contém nome do monstro
   - `og:description` → breve descrição ou stats
   - `og:image` → imagem do monstro ou fallback
6. Navegar para `/magias/fireball` (ou slug existente)
7. Verificar meta tags da magia

### Páginas Autenticadas
8. Navegar para `/app/dashboard` (logado)
9. Verificar que `og:title` é genérico ("Pocket DM - Dashboard")
10. Verificar que **NENHUMA informação privada** (nome do user, campanhas, etc.) aparece em meta tags

### Gremlin Tests
11. **Meta tags ausentes:** Verificar se TODAS as páginas públicas têm og:title e og:description
12. **Imagem og:image quebrada:** Verificar que a URL da og:image retorna 200 e é imagem válida
13. **Caracteres especiais em meta:** Monstro com nome com acento → og:title renderiza correto
14. **Mobile sharing preview:** Em viewport mobile, verificar que a meta viewport tag existe e está correta

**Resultado esperado:** Todas as páginas públicas têm OG tags. Preview social funciona. Zero info privada vazada.

---

## JORNADA 18 — Accessibility Basics (NOVA)

**Objetivo:** Verificar acessibilidade básica (keyboard nav, ARIA, contraste).

### Keyboard Navigation — Landing Page
1. Navegar para `/`
2. Pressionar Tab repetidamente → verificar que focus ring (outline) é visível em cada elemento interativo
3. Verificar ordem lógica do Tab: nav links → hero CTAs → features → pricing → footer
4. Pressionar Enter em cada link/botão focado → deve ativar a ação

### Keyboard Navigation — Guest Combat
5. Navegar para `/try`
6. Tab até search input → digitar "Goblin"
7. Tab até botão "Adicionar" → Enter → monstro adicionado
8. Tab até "Iniciar Combate" → Enter → combate inicia
9. Tab até "Próximo Turno" → Enter → turno avança
10. Verificar que HP adjuster é navegável por Tab (input → botão aplicar → botão fechar)

### Keyboard Navigation — Dashboard
11. Login → dashboard
12. Tab pela sidebar → verificar que cada item é focável
13. Enter num item da sidebar → navega para a página
14. Verificar que modais/dialogs trapam o focus (Tab não sai do modal)

### ARIA Labels
15. Verificar que botões com ícone (sem texto) têm `aria-label`:
    - Botão de toggle visibilidade (olho) → aria-label descritivo
    - Botão de delete (lixeira) → aria-label descritivo
    - Botão de HP → aria-label descritivo
    - Botão de condições → aria-label descritivo
16. Verificar que inputs de form têm labels associados (`<label for="">` ou `aria-label`)

### Contraste
17. Verificar visualmente que texto principal tem contraste suficiente contra background
18. Verificar HP bars (cores de tier LIGHT/MODERATE/HEAVY/CRITICAL) têm contraste legível
19. Verificar badges de condições são legíveis

### Screen Reader Basics
20. Se possível, ativar screen reader (Narrator no Windows):
    - Verificar landing page anuncia título e CTAs
    - Verificar guest combat anuncia turno atual
    - Verificar dialogs anunciam conteúdo

### Gremlin Tests
21. **Focus trap:** Abrir qualquer modal → Tab não deve escapar para trás do modal
22. **Keyboard dismiss:** Pressionar Escape em modais/dropdowns → deve fechar
23. **Skip navigation:** Verificar se existe link "Skip to content" no topo (best practice)
24. **Zoom 200%:** Dar zoom 200% no browser → layout não deve quebrar, texto legível

**Resultado esperado:** Navegação por teclado funcional. ARIA labels presentes. Contraste adequado. Modais com focus trap.

---

## CHECKLIST FINAL — TIER 3

| # | Jornada | Status | Bugs Encontrados | Screenshots | Observações UX |
|---|---------|--------|-----------------|-------------|----------------|
| 8 | Player Characters | PASS/FAIL | | | |
| 11 | Quests, Locais, Facções | PASS/FAIL | | | |
| 14 | DM Returning | PASS/FAIL | | | |
| 15 | Empty States & Boundaries | PASS/FAIL | | | |
| 17 | Shareability & Social | PASS/FAIL | | | |
| 18 | Accessibility | PASS/FAIL | | | |

### Métricas a reportar:
- **Empty states com CTA:** ___/total seções
- **XSS/injection encontrados:** SIM/NÃO (listar)
- **Console errors por página:** Listar
- **OG tags ausentes:** Listar páginas
- **Focus ring visível em todos elementos interativos:** SIM/NÃO
- **ARIA labels ausentes em botões de ícone:** Listar

Salve screenshots em `qa-evidence/tier3/` e o relatório em `docs/qa-report-tier3-[data].md`.
