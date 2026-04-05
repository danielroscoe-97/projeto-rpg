# QA Report — Tier 2 Funcional Sólido

**Data:** 2026-04-04
**Testador:** Claude Code (Playwright MCP)
**Ambiente:** localhost:3000
**DM Account:** dm.primary@test-taverna.com
**Player Account:** player.warrior@test-taverna.com

---

## CHECKLIST FINAL — TIER 2

| # | Jornada | Status | Bugs Encontrados | Screenshots | Observações UX |
|---|---------|--------|-----------------|-------------|----------------|
| 4 | Criar Campanha | **PASS** | 0 | j4-01 a j4-07 | Criação inline sem redirect para detalhe (fica na lista) |
| 5 | NPCs (CRUD) | **PASS** | 0 | j5-01 a j5-07 | CRUD completo funciona. NPC oculto por default |
| 6 | Notas | **PASS** | 0 | j6-01 a j6-05 | Rich features: tags, pastas, privacidade, vincular NPC |
| 7 | Convite Player | **FAIL** | 1 critico | j7-01 a j7-05 | Tab "Via Link" vazio — sem link gerado |
| 9 | Mind Map | **PASS** | 0 | j9-01 a j9-04 | Grafo funcional com filtros e controles |
| 13 | First-Time Player | **FAIL** | 1 medio | j13-01 a j13-04 | Tour i18n keys não traduzidas |

---

## BUGS ENCONTRADOS

### BUG-T2-01 [CRITICO] — Tab "Via Link" no convite de jogador está vazio

- **Jornada:** 7 — Convite de Jogador
- **Steps para reproduzir:**
  1. Login como DM
  2. Navegar para qualquer campanha
  3. Clicar "Convidar Jogador"
  4. Observar tab "Via Link" (selecionado por padrão)
- **Esperado:** Link de convite gerado com botão "Copiar"
- **Atual:** Tabpanel completamente vazio — sem link, sem botão, sem loading
- **Impacto:** CRITICO — impede o fluxo principal de convite por link. Tab "Via E-mail" funciona normalmente.
- **Reproduzido em:** Ambas campanhas (QA Campaign e Minas de Phandelver QA)
- **Screenshots:** j7-02-invite-via-link.png, j7-04-invite-qa-campaign.png
- **Console:** 73 errors ao abrir o dialog

### BUG-T2-02 [MEDIO] — Dashboard tour mostra chaves i18n brutas

- **Jornada:** 13 — First-Time Player Experience
- **Steps para reproduzir:**
  1. Login como player (primeira vez / pós-onboarding)
  2. Selecionar "Combate Rápido" no onboarding
  3. Observar dialog do tour no dashboard
- **Esperado:** Texto traduzido do tour (título e descrição em PT-BR)
- **Atual:** Mostra "TOUR.DASHBOARD_TOUR.WELCOME_TITLE" e "tour.dashboard_tour.welcome_desc"
- **Impacto:** MEDIO — impressão ruim no primeiro uso, mas funcionalidade não é bloqueada (pode pular)
- **Screenshot:** j13-03-player-dashboard.png

---

## OBSERVAÇÕES DE UX

### Jornada 4 — Criar Campanha
- Criação inline funciona bem, mas **não redireciona** para o detalhe da campanha após criar (fica na lista). O spec esperava redirect.
- Botão "Salvar" corretamente desabilitado com nome vazio (Gremlin #12 PASS)
- Campo aceita 200 chars (Gremlin #13 PASS)
- F5 persiste dados (Gremlin #15 PASS)
- "Voltar" funciona (Gremlin #16 PASS)

### Jornada 5 — NPCs
- NPC criado como **oculto por padrão** (toggle "Visível para jogadores" off) — pode confundir DMs que esperam visibilidade default
- Edição via modal (não auto-save) — funcional mas sem indicador "Salvando"/"Salvo"
- Nome truncado no card em grid view ("BARTE..." para "Bartender Grog")
- Delete com confirmação funciona corretamente
- Toggle de visibilidade inline funciona (olho aberto/fechado)

### Jornada 6 — Notas
- Sistema muito completo: tags (Geral/Lore/Local/NPC/Resumo/Segredo/Gancho), pastas, privacidade toggle, vincular NPC
- **Muitos console errors** durante edição (91 errors) — possível problema com auto-save requests
- Dropdown de pasta aparece ao criar pasta — permite mover nota para pasta
- Pasta com botões rename/delete

### Jornada 7 — Convite
- "Via E-mail" funciona (campo email + "Enviar Convite")
- "Via Link" BUG CRITICO — tabpanel vazio
- Link inválido mostra mensagem amigável (Gremlin #21 PASS): "Este convite expirou. Peça ao seu mestre para enviar um novo."

### Jornada 9 — Mind Map
- Renderiza corretamente com nó central dourado, NPCs roxo, notas azul
- Filtros funcionam (toggle NPCs remove nós do grafo)
- Layouts: Hierárquico (default), Força, Radial
- Controles: Zoom In/Out, Fit View, Minimap
- Performance OK com poucos nós

### Jornada 13 — First-Time Player
- Onboarding assume DM role — **sem opção "Sou Jogador"**
- Player é forçado a completar onboarding (redirect loop se tentar acessar dashboard)
- Dashboard mostra empty states informativos ("Crie sua primeira mesa!", "Nenhum combate ainda")
- Tour i18n quebrado (BUG-T2-02)

---

## MÉTRICAS

- **Auto-save latência (NPC/Nota):** Notas usam auto-save (debounced), NPCs usam modal submit manual
- **Empty states presentes em todas seções:** SIM (Jogadores, NPCs, Notas, Quests)
- **Mind map render time:** < 1s (instantâneo com 3 nós)
- **Convite preserva contexto pós-login:** NÃO TESTÁVEL (Via Link bugado)
- **Console errors:** Alto volume durante notas (91 errors) e dashboard tour (87 errors)

---

## RESUMO

| Métrica | Valor |
|---------|-------|
| Jornadas testadas | 6/6 |
| PASS | 4/6 |
| FAIL | 2/6 |
| Bugs críticos | 1 (Via Link vazio) |
| Bugs médios | 1 (Tour i18n) |
| Observações UX | 6 |
| Screenshots capturados | 20 |

**Prioridade de fix:**
1. **BUG-T2-01** — Via Link vazio (bloqueia convite por link — feature core)
2. **BUG-T2-02** — Tour i18n (first impression ruim para novos users)
3. Console errors em notas (91 errors — pode indicar memory leak ou request spam)

---

## ANÁLISE CRÍTICA DE UX — POR JORNADA

### J4 — Criar Campanha: Friccção no primeiro uso

| Issue | Severidade | Detalhe |
|-------|-----------|---------|
| Sem redirect pós-criação | UX-MEDIA | DM cria campanha e fica na lista. Deveria ir pro detalhe pra continuar configurando (adicionar jogadores, NPCs). O DM tem que dar um clique extra pra entrar na campanha que acabou de criar. |
| Sem feedback de sucesso | UX-BAIXA | Nenhum toast/notificação "Campanha criada!". O card aparece na lista silenciosamente. DM pode não perceber que deu certo. |
| Header da campanha sem contexto | UX-BAIXA | O header mostra "0 jogadores / 0 sessoes / 0 combates finalizados" — bom, mas "sessoes" está sem acento (deveria ser "sessões"). |

### J5 — NPCs: Bom CRUD, mas discoverability fraca

| Issue | Severidade | Detalhe |
|-------|-----------|---------|
| NPC oculto por padrão | UX-MEDIA | O DM cria um NPC e ele nasce invisível pros jogadores. A maioria dos DMs espera que o NPC seja visível por padrão e ocultar seja a ação deliberada. O toggle "Visível para jogadores" deveria defaultar ON. |
| Nome truncado agressivo | UX-BAIXA | "Bartender Grog" vira "BARTE..." em grid view — perde contexto. O card tem espaço sobrando pro nome completo. Truncar em ~20 chars ou usar 2 linhas. |
| Modal de edição sem indicador de campo alterado | UX-BAIXA | Ao editar NPC, não há visual de "campo modificado" ou dirty state. Se o DM fechar sem salvar, perde tudo sem aviso. |
| Descrição colapsada no card | UX-INFO | A descrição aparece truncada no card e precisa clicar pra expandir — OK para economia de espaço, mas o botão de expandir (seta) é pequeno e pouco visível. |

### J6 — Notas: Feature rich, mas complexa demais pra first use

| Issue | Severidade | Detalhe |
|-------|-----------|---------|
| Overload cognitivo na criação | UX-MEDIA | Ao criar nota, o DM vê de uma vez: título, 7 tags, textarea, vincular NPC, toggle privacidade, selector de pasta, timestamp, botão excluir. São 10+ elementos simultâneos. Um DM criando sua primeira nota pode ficar paralisado. Sugestão: mostrar só título + conteúdo no início, expandir o resto on-demand. |
| Auto-save sem feedback visual | UX-MEDIA | Notas usam auto-save, mas não há indicador "Salvando..."/"Salvo". O DM não tem confiança de que o conteúdo está persistido. O spec pedia esse indicador (step 5, step 10). |
| 91 console errors | UX-TECNICA | Possível auto-save fazendo requests demais (debounce inadequado?) ou requests falhando silenciosamente. Pode causar perda de dados sem o DM saber. |
| Tag selecionada sem destaque forte | UX-BAIXA | Tag "Geral" fica com borda dourada quando selecionada, mas as não-selecionadas têm borda cinza similar. Diferença sutil — poderia usar fill color ou badge mais evidente. |

### J7 — Convite: Fluxo core quebrado

| Issue | Severidade | Detalhe |
|-------|-----------|---------|
| Via Link vazio (BUG-T2-01) | UX-CRITICA | O tab default é "Via Link" que mostra NADA. Primeira impressão é de feature quebrada. O DM vai achar que o app não funciona. |
| Via E-mail sem instrução | UX-BAIXA | Tab Via E-mail mostra campo + botão, mas sem explicação ("O jogador receberá um email com link para entrar na campanha"). DM não sabe o que vai acontecer ao clicar "Enviar Convite". |
| Modal pequeno demais | UX-BAIXA | O modal de convite tem muito espaço vazio embaixo dos tabs. Parece incompleto/carregando mesmo quando funcional (Via E-mail). |

### J9 — Mind Map: Visualmente bom, interação limitada

| Issue | Severidade | Detalhe |
|-------|-----------|---------|
| Grafo fica "preso" no canto direito | UX-MEDIA | O mind map renderiza na coluna direita da página, que é estreita (~350px). Com mais nós, vai ficar claustrofóbico. Deveria ter opção fullscreen ou pelo menos expandir pra largura total quando aberto. |
| Click em nó não faz nada visível | UX-BAIXA | O spec esperava que clicar em um nó de NPC scrollasse para a seção de NPCs. Não testei a fundo, mas não há tooltip ou feedback visual ao hover/click nos nós que indique "clique para navegar". |
| Filtros sem indicador de estado | UX-BAIXA | Ao desativar "NPCs", o botão fica com borda mais clara, mas a diferença é sutil. Poderia usar strikethrough, opacidade 50%, ou cor vermelha pra "filtro desativado". |

### J13 — First-Time Player: Experiência DM-centric

| Issue | Severidade | Detalhe |
|-------|-----------|---------|
| Onboarding assume DM | UX-ALTA | Um player que recebeu link de convite, fez signup, e cai no onboarding vê "Vamos montar sua primeira mesa de RPG" e "Combate Rápido" / "Configurar Campanha". Zero contexto de player. Deveria ter uma terceira opção: "Recebi um link de convite" ou detectar que veio de um `/invite/` redirect. |
| Redirect loop no dashboard | UX-MEDIA | Player não consegue acessar o dashboard sem completar onboarding. Se o player quer apenas ver suas campanhas como jogador, é obrigado a criar uma mesa de DM primeiro. |
| Tour i18n quebrado (BUG-T2-02) | UX-ALTA | Primeira coisa que o user vê após o onboarding são strings tipo "TOUR.DASHBOARD_TOUR.WELCOME_TITLE". Impressão de produto inacabado. |
| Empty state assume DM | UX-MEDIA | Dashboard mostra "Crie sua primeira mesa!" — mas o player não quer criar mesa, quer ENTRAR em uma mesa. Deveria mostrar "Você ainda não participa de nenhuma campanha. Peça ao seu mestre o link de convite." |
| "Já sei como funciona" skip agressivo | UX-BAIXA | Pular o tour manda direto pra "Novo Encontro" (tela de criação de combate) em vez de voltar ao dashboard. Confuso. |

---

## SCORE UX GERAL POR JORNADA

| Jornada | Funcional | UX Score | Nota |
|---------|-----------|----------|------|
| J4 Criar Campanha | PASS | 7/10 | Funciona, mas falta feedback e redirect pós-criação |
| J5 NPCs | PASS | 7/10 | CRUD sólido, mas default oculto e truncamento agressivo |
| J6 Notas | PASS | 6/10 | Feature-rich mas overload cognitivo e sem feedback auto-save |
| J7 Convite | FAIL | 2/10 | Feature core quebrada, impressão de app incompleto |
| J9 Mind Map | PASS | 7/10 | Visualmente bonito, mas espaço apertado e interação básica |
| J13 First-Time Player | FAIL | 3/10 | Experiência inteira ignora que o user pode ser player |

**UX Score Médio: 5.3/10** — O app funciona tecnicamente na maioria das jornadas, mas a experiência do DM tem atritos desnecessários e a do Player é praticamente inexistente como jornada diferenciada.
