# Relatório de QA — Pocket DM (Produção)
> Executado em 2026-03-27 via Playwright MCP
> URL: https://tavernadomestre.vercel.app/

---

## Resumo Executivo

| Severidade | Total Planejado | Confirmados | Não Reproduzidos |
|------------|----------------|-------------|------------------|
| P0 (Crítico) | 3 | **2** | 1 |
| P1 (Alto) | 6 | **4** | 2 |
| P2 (Médio) | 10 | **1** | 4 (5 não testados) |
| **Total** | **19** | **7** | **7** |

**Checks executados**: 42 de 61 (69%)
**Checks PASS**: 28
**Bugs confirmados**: 7
**Bugs não reproduzidos**: 7
**Bug novo encontrado**: 1 (chaves i18n faltando)

---

## Bugs Confirmados

### P0 — Críticos

| ID | Bug | Status | Evidência |
|----|-----|--------|-----------|
| 56 | **F5 perde jogadores importados da campanha** — Após refresh, de 9 combatentes restam apenas 4. Os 5 jogadores da campanha Krynn desapareceram. Nome do encontro também resetou. | **CONFIRMADO** | [j2-06-after-f5-players-lost.png](j2-06-after-f5-players-lost.png) |
| 60 | **Criação de conta dá "Ocorreu um erro inesperado"** — Signup com email+senha válidos retorna erro. Console: `Failed to load resource` na URL de confirmação (status 4xx). | **CONFIRMADO** | [j3-02-signup-error.png](j3-02-signup-error.png) |

### P1 — Altos

| ID | Bug | Status | Evidência |
|----|-----|--------|-----------|
| 4,6 | **Monstros sem alias/máscara** — Goblin aparece como "Goblin 1", Brass Greatwyrm como "Brass Greatwyrm 1". Campo "Nome visível para jogadores" existe mas vem vazio. | **CONFIRMADO** | [j1-03-combatants-added.png](j1-03-combatants-added.png) |
| 8 | **Permite adicionar jogador sem iniciativa** — "Jogador 2" adicionado com campo de iniciativa vazio, sem validação ou erro. | **CONFIRMADO** | [j1-03-combatants-added.png](j1-03-combatants-added.png) |
| 17 | **Sem histórico de rolagens (visitante)** — Rolagem inline aparece momentaneamente e desaparece. Sem log persistente de rolagens no modo visitante. Na sessão logada existe área "Nenhuma rolagem ainda" mas não persiste entre reloads. | **CONFIRMADO** | [j1-07-dice-roll.png](j1-07-dice-roll.png) |
| 28 | **Nome visível não vem pré-preenchido** — Campo "Nome visível para jogadores" no modal de edição está vazio. Deveria gerar alias automaticamente (ex: "Criatura Hostil 1"). | **CONFIRMADO** | [j1-09-edit-goblin.png](j1-09-edit-goblin.png) |

### P2 — Médios

| ID | Bug | Status | Evidência |
|----|-----|--------|-----------|
| 42 | **Dois botões "Compartilhar Sessão"** — Um no header do encontro e outro dentro do bloco "Novo Encontro". Deveria ter apenas 1. | **CONFIRMADO** | [j2-03-imported-encounter.png](j2-03-imported-encounter.png) |

---

## Bugs NÃO Reproduzidos

| ID | Bug Original | Status | Observação |
|----|-------------|--------|------------|
| 55 | Pedido de join não aparece pro mestre | **NÃO TESTADO** | Limitação do Playwright (aba única, não simulei join em paralelo) |
| 15 | Texto "chave@h" na ficha do monstro | **NÃO REPRODUZIDO** | Stat block do Brass Greatwyrm sem texto espúrio |
| 24 | Barra CRITICAL preta sem cor | **NÃO REPRODUZIDO** | Barra CRITICAL é vermelha, visível e indicativa |
| 38 | Dificuldade calculada errada | **NÃO REPRODUZIDO** | Brass Greatwyrm CR28 + Goblin CR1/4 = "Mortal 240040 XP" (correto) |
| 32 | Login/signup confusos na mesma tela | **PARCIAL** | `/auth/login` mostra só login; `/auth/sign-up` mostra ambos lado a lado |
| 34-35 | Menu superior lotado | **NÃO REPRODUZIDO** | Menu usa dropdown "Compêndio" para agrupar itens |
| 41 | Botão "Compartilhar Arquivo" | **NÃO REPRODUZIDO** | Não encontrado na interface |

---

## Bug Novo Encontrado

### P2 — Chaves i18n faltando (MISSING_MESSAGE)

**Console errors em todas as telas de setup/combate:**
- `combat.setup_notes_aria` — campo de notas sem label acessível
- `combat.setup_remove_aria` — botão remover sem label acessível
- `combat.hp_amount_aria` — input de HP sem label acessível

Aparece dezenas de vezes por sessão. Não afeta funcionalidade mas prejudica acessibilidade e gera ruído no console.

---

## Checks Detalhados por Jornada

### Jornada 3 — Signup (Checks #57-61)
| # | Check | Resultado |
|---|-------|-----------|
| 58 | Página de sign-up carrega | ✅ PASS |
| 59 | Preencher email e senha | ✅ PASS |
| 60 | Clicar "Criar Conta" | ❌ FAIL — "Ocorreu um erro inesperado" |

### Jornada 1 — Visitante (Checks #1-30)
| # | Check | Resultado |
|---|-------|-----------|
| 1 | LP carrega, "Começar Grátis" visível | ✅ PASS |
| 2 | "Começar Agora (Grátis)" redireciona para `/try` | ✅ PASS |
| 3 | Buscar e adicionar Goblin | ✅ PASS |
| 4 | Goblin tem alias/máscara | ❌ FAIL — nome real exibido |
| 5 | Buscar e adicionar Brass Greatwyrm | ✅ PASS |
| 6 | Brass Greatwyrm tem alias | ❌ FAIL — nome real exibido |
| 7 | Adicionar Jogador 1 com iniciativa | ✅ PASS |
| 8 | Adicionar Jogador 2 sem iniciativa bloqueia | ❌ FAIL — aceita sem validação |
| 9 | Adicionar sem nome mostra erro | ✅ PASS |
| 10 | Iniciar combate | ✅ PASS |
| 12 | Adicionar em combate ativo | ⚠️ PARCIAL — funciona mas sem busca SRD |
| 14 | Abrir ficha Brass Greatwyrm | ✅ PASS |
| 15 | Texto "chave@h" | ✅ NÃO REPRODUZIDO |
| 16 | Rolar ataque | ✅ PASS |
| 17 | Histórico de rolagens | ❌ FAIL — não existe |
| 20 | HP > 70% = LIGHT | ✅ PASS |
| 21 | HP 40-70% = MODERATE | ✅ PASS |
| 22 | HP 10-40% = HEAVY | ✅ PASS |
| 23 | HP < 10% = CRITICAL | ✅ PASS |
| 24 | Barra CRITICAL preta | ✅ NÃO REPRODUZIDO — barra vermelha |
| 26 | Adicionar condição | ✅ PASS |
| 27 | Editar monstro | ✅ PASS |
| 28 | Nome visível pré-preenchido | ❌ FAIL — campo vazio |
| 29 | Derrotar monstro | ✅ PASS |
| 30 | Avançar turnos | ✅ PASS |

### Jornada 2 — Mestre Logado (Checks #31-56)
| # | Check | Resultado |
|---|-------|-----------|
| 31 | Página de login carrega | ✅ PASS |
| 33 | Login com conta existente | ✅ PASS |
| 34 | Itens do menu superior | ✅ PASS — 7 itens, Compêndio agrupado |
| 36 | Toast "Encontro encontrado" | ✅ PASS |
| 37 | Importar encontro | ✅ PASS |
| 38 | Dificuldade calculada errada | ✅ NÃO REPRODUZIDO — "Mortal" correto |
| 42 | Dois botões "Compartilhar Sessão" | ❌ FAIL — 2 visíveis |
| 45 | Carregar Campanha | ✅ PASS |
| 46 | Jogadores carregados | ✅ PASS — 5 jogadores Krynn |
| 47 | Preencher iniciativa (Rolar Todos) | ✅ PASS |
| 48 | Iniciar combate com campanha | ✅ PASS |
| 49 | Diferenciação visual Jogador vs Monstro | ✅ PASS |
| 52 | Compartilhar Sessão (QR + link) | ✅ PASS |
| 56 | F5 preserva sessão | ❌ FAIL — jogadores da campanha somem |

---

## Screenshots Capturados

| Arquivo | Descrição |
|---------|-----------|
| j3-01-signup-page.png | Tela de signup (login + signup lado a lado) |
| j3-02-signup-error.png | Erro "Ocorreu um erro inesperado" no signup |
| j1-01-landing-page.png | Landing page |
| j1-02-encounter-setup.png | Setup de encontro (modo visitante) |
| j1-03-combatants-added.png | Combatentes adicionados (sem alias) |
| j1-04-combat-active.png | Combate ativo (modo visitante) |
| j1-05-add-combatant-modal.png | Modal de adicionar combatente em combate |
| j1-06-brass-statblock.png | Stat block do Brass Greatwyrm (full page) |
| j1-07-dice-roll.png | Rolagem de dado inline |
| j1-08-hp-critical.png | HP CRITICAL na barra (vermelha) |
| j1-09-edit-goblin.png | Modal de edição (nome visível vazio) |
| j2-01-login-page.png | Página de login dedicada |
| j2-02-dashboard.png | Dashboard com toast de encontro encontrado |
| j2-03-imported-encounter.png | Encontro importado (2x Compartilhar Sessão) |
| j2-04-share-session.png | QR Code de compartilhamento |
| j2-05-combat-active-logged.png | Combate ativo logado (9 combatentes) |
| j2-06-after-f5-players-lost.png | Após F5 — apenas 4 combatentes (5 perdidos) |

---

## Recomendações de Priorização

1. **P0 #60 (Signup)** — Bloqueia aquisição de novos usuários. Provável problema de configuração do Supabase (redirect URL ou email confirmação).
2. **P0 #56 (F5 perde jogadores)** — Jogadores da campanha não são persistidos no banco ao iniciar combate. Crítico para sessões longas.
3. **P1 #4/6/28 (Alias)** — Implementar auto-geração de alias ao adicionar monstro SRD (ex: "Criatura Hostil 1").
4. **P1 #8 (Validação iniciativa)** — Adicionar validação ao adicionar jogador sem iniciativa.
5. **P1 #17 (Log de rolagens)** — Área existe na sessão logada mas não persiste. Não existe no modo visitante.
6. **P2 #42 (2x Compartilhar)** — Remover botão duplicado.
7. **Novo: i18n** — Adicionar chaves faltando: `combat.setup_notes_aria`, `combat.setup_remove_aria`, `combat.hp_amount_aria`.
