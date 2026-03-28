# QA — Roteiro de Testes: Sprint M1+M2 + Resiliência de Combate

**Data:** 2026-03-28
**URL produção:** https://pocketdm.com.br
**Ambiente:** Supabase Production

---

## Contas de Teste

| Papel | Email | Senha |
|-------|-------|-------|
| DM Principal | `dm.primary@test-taverna.com` | `TestDM_Primary!1` |
| DM Pro | `dm.pro@test-taverna.com` | `TestDM_Pro!2` |
| Player 1 (Thorin) | `player.warrior@test-taverna.com` | `TestPlayer_War!1` |
| Player 2 (Elara) | `player.mage@test-taverna.com` | `TestPlayer_Mage!2` |
| Conta pessoal | `danielroscoe97@gmail.com` | `Eusei123*` |

---

## Seção 1: Oracle Modal Mobile (M1.1)

**Objetivo:** Verificar que o modal do Oráculo pode ser fechado no mobile.

### Pré-condições
- Login como DM
- Abrir uma sessão de combate ativa
- Viewport mobile (usar DevTools → 393x851 Pixel 5, ou dispositivo real)

### Testes

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 1.1 | Abrir o Oráculo AI (botão ✨ ou Ctrl+Space) | Modal abre com campo de pergunta | |
| 1.2 | Digitar uma pergunta e submeter | Resposta aparece no modal | |
| 1.3 | **Tocar no botão X** (canto superior direito) | Modal fecha | |
| 1.4 | Reabrir o Oráculo | **Pergunta e resposta anteriores ainda estão lá** (soft dismiss) | |
| 1.5 | **Tocar no backdrop** (área escura fora do modal) | Modal fecha | |
| 1.6 | Verificar que o botão X tem tamanho mínimo 44x44px | Touch target adequado (não requer precisão) | |

### Testes no Command Palette (Ctrl+K)

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 1.7 | Abrir Command Palette (Ctrl+K ou botão de busca) | Palette abre | |
| 1.8 | Buscar uma magia (ex: "Fireball") | Resultados aparecem | |
| 1.9 | **Tocar no botão X** no mobile | Palette fecha, busca preservada | |
| 1.10 | Reabrir palette | Busca anterior ainda está lá | |

### Regressão Desktop

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 1.11 | Desktop: abrir Oráculo, pressionar ESC | Modal fecha e limpa tudo (hard close) | |
| 1.12 | Desktop: o botão X **não deve aparecer** (ESC é suficiente) | Apenas hint "ESC" visível | |

---

## Seção 2: Notas do Mestre por Jogador (M1.2)

**Objetivo:** Verificar que o DM pode anotar notas por jogador na campanha.

### Pré-condições
- Login como DM
- Navegar para Dashboard → clicar numa campanha

### Testes

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 2.1 | Na tela da campanha, abrir seção "Jogadores" | Lista de PCs visível | |
| 2.2 | Localizar textarea "Notas sobre este jogador..." abaixo dos stats | Textarea visível em cada card | |
| 2.3 | Digitar "Tem a espada amaldiçoada" | Texto aparece no campo | |
| 2.4 | Parar de digitar e esperar ~1s | Indicador "Salvando..." aparece, depois "Salvo" | |
| 2.5 | **Recarregar a página (F5)** | Nota persiste — texto está lá | |
| 2.6 | Editar a nota para "Deve 50gp ao ferreiro" | Auto-save funciona novamente | |
| 2.7 | **No mobile:** verificar que o textarea não causa zoom no iOS | Font size >= 16px, sem zoom automático | |
| 2.8 | Tentar colar texto com >2000 caracteres | Limite respeitado (trunca ou impede) | |

---

## Seção 3: Notas da Campanha (M2.2)

**Objetivo:** CRUD de notas vinculadas à campanha.

### Testes

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 3.1 | Na tela da campanha, abrir seção "Notas da Campanha" | Seção colapsável abre | |
| 3.2 | Clicar "+ Nova nota" | Nota criada com título vazio, expandida para edição | |
| 3.3 | Digitar título: "Sessão 5 — Masmorra do Dragão" | Título salva automaticamente | |
| 3.4 | Digitar conteúdo: "O grupo encontrou a espada +2 no baú..." | Conteúdo salva automaticamente | |
| 3.5 | Colapsar a nota (clicar no header) | Mostra título + preview do conteúdo | |
| 3.6 | Criar uma segunda nota | Aparece no topo da lista (mais recente primeiro) | |
| 3.7 | **Deletar** uma nota (botão de lixeira) | Confirmação aparece → confirmar → nota removida | |
| 3.8 | **Recarregar a página** | Notas persistem | |
| 3.9 | Estado vazio: deletar todas as notas | Mensagem "Nenhuma nota ainda..." | |

---

## Seção 4: Histórico de Combates (M2.3)

**Objetivo:** Ver combates finalizados da campanha.

### Pré-condições
- Ter pelo menos 1 combate finalizado na campanha
- (Se não tiver: criar sessão, adicionar combatentes, iniciar combate, finalizar)

### Testes

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 4.1 | Na tela da campanha, abrir seção "Combates Anteriores" | Lista de encounters finalizados | |
| 4.2 | Verificar dados de cada encounter | Nome, sessão, data, rounds, "X PCs vs Y monstros" | |
| 4.3 | Expandir um encounter (clicar) | Lista de combatentes com HP final e cores de tier | |
| 4.4 | Verificar cores HP: >70% verde, >40% amarelo, >10% laranja, ≤10% vermelho | Tiers LIGHT/MODERATE/HEAVY/CRITICAL corretos | |
| 4.5 | **Campanha sem combates finalizados** | Mensagem "Nenhum combate finalizado ainda" | |
| 4.6 | Se >10 combates: botão "Carregar mais" | Paginação funciona | |

---

## Seção 5: Player Drawer no Combate (M2.1)

**Objetivo:** Acesso rápido aos dados dos jogadores durante o combate.

### Pré-condições
- Login como DM
- Sessão de combate ativa vinculada a uma campanha
- Campanha com pelo menos 2 PCs

### Testes

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 5.1 | Na tela de combate, localizar botão "Players" na toolbar | Botão visível (ícone 👥) | |
| 5.2 | Clicar no botão | Drawer desliza da direita | |
| 5.3 | Verificar lista de PCs | Nome, HP bar colorida, AC badge, DC badge | |
| 5.4 | HP bar segue os tiers corretos | Verde >70%, amarelo >40%, etc. | |
| 5.5 | Editar notas de um PC no drawer | Textarea funciona, auto-save com indicador | |
| 5.6 | Fechar drawer (clicar fora ou botão X) | Drawer fecha com animação | |
| 5.7 | Reabrir drawer | Notas editadas persistiram | |
| 5.8 | **Sessão SEM campanha vinculada** | Botão "Players" não aparece OU drawer mostra mensagem | |
| 5.9 | **No mobile (393px)** | Drawer ocupa largura total | |

---

## Seção 6: Campaign Page Redesign (M2.4)

**Objetivo:** Verificar o layout redesenhado da tela de campanha.

### Testes

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 6.1 | Navegar para Dashboard → clicar numa campanha | Tela de campanha carrega | |
| 6.2 | **Summary stats** no topo | "X jogadores · Y sessões · Z combates" | |
| 6.3 | **3 seções colapsáveis**: Jogadores, Notas, Combates | Headers com ícones amber/gold | |
| 6.4 | Seção "Jogadores" começa aberta | PlayerCharacterManager visível | |
| 6.5 | Seções "Notas" e "Combates" começam fechadas | Colapsadas, clicar para abrir | |
| 6.6 | Touch targets das seções >= 44px | Fácil de clicar/tocar no mobile | |
| 6.7 | Link "← Voltar ao Dashboard" funciona | Navega de volta | |
| 6.8 | **Mobile layout** | Seções empilham verticalmente, full-width | |

---

## Seção 7: Resiliência de Combate — Offline/Reconnect

**Objetivo:** Verificar que o DM não perde ações durante queda de internet.

### Setup
- Login como DM
- Criar/abrir sessão com combate ativo
- Adicionar 3+ combatentes e iniciar combate
- Ter DevTools aberto (F12 → Network tab)

### 7A — Offline → Ações → Online

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 7A.1 | DevTools → Network → marcar "Offline" | Toast: "Sem conexão — suas ações estão salvas localmente" | |
| 7A.2 | Dar dano a um monstro (ex: -15 HP) | UI atualiza normalmente, HP diminui | |
| 7A.3 | Avançar turno 2x | Turno avança na UI | |
| 7A.4 | Marcar um combatente como derrotado | UI mostra derrotado | |
| 7A.5 | DevTools → Network → desmarcar "Offline" | Toast: "Sincronizando combate..." → "Combate sincronizado!" | |
| 7A.6 | **Recarregar a página (F5)** | Estado está correto: HP, turno, round, derrotado — tudo como na UI | |
| 7A.7 | **Abrir player view em outro browser** | Player view mostra estado sincronizado correto | |

### 7B — Fechar Aba Durante Combate

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 7B.1 | Combate ativo com 5+ combatentes | Estado carregado | |
| 7B.2 | Dar dano, avançar turno | Ações executadas | |
| 7B.3 | **Fechar a aba** (Ctrl+W ou fechar browser) | — | |
| 7B.4 | Reabrir a URL da sessão | Combate carrega do DB com estado atualizado | |
| 7B.5 | HP, turno, round estão corretos | Sem perda de dados | |

### 7C — Offline + Fechar Aba (pior caso)

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 7C.1 | Combate ativo, anotar estado (round X, turno Y, HP de todos) | Referência para comparação | |
| 7C.2 | DevTools → Offline | Toast offline | |
| 7C.3 | Fazer 3 ações (dano, turno, condição) | UI atualiza | |
| 7C.4 | **Fechar a aba** (com internet ainda offline) | — | |
| 7C.5 | DevTools → Online (restaurar internet) | — | |
| 7C.6 | Reabrir a URL da sessão | Estado do DB pode estar ligeiramente desatualizado (ações offline não sincronizaram) **MAS** localStorage tem backup | |
| 7C.7 | Se combatants carregaram do backup: verificar que estão corretos | localStorage backup funciona como fallback | |

### 7D — Retry após falha de sync

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 7D.1 | Combate ativo, ir offline | Toast offline | |
| 7D.2 | Fazer ações | UI atualiza | |
| 7D.3 | Restaurar internet mas com latência alta (DevTools → Slow 3G) | Sync tenta, pode falhar | |
| 7D.4 | Observar toasts de retry | "Sincronização falhou (tentativa 1/3). Retentando..." | |
| 7D.5 | Mudar para conexão normal | Retry eventual deve succeedir: "Combate sincronizado!" | |

### 7E — Visibility Change (tab switch)

| # | Passo | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 7E.1 | Combate ativo | — | |
| 7E.2 | Trocar para outra aba (Alt+Tab ou clicar) | Estado salva em localStorage (silencioso) | |
| 7E.3 | Voltar para a aba do PocketDM | Se estava offline durante o switch, faz sync automático | |

---

## Seção 8: Regressões Críticas

**Objetivo:** Garantir que nada quebrou.

| # | Teste de regressão | Resultado esperado | ✅/❌ |
|---|-------------------|-------------------|-------|
| 8.1 | Criar nova sessão, adicionar combatentes | Funciona normalmente | |
| 8.2 | Iniciar combate (roll initiative) | Iniciativa funciona | |
| 8.3 | Avançar turnos, dar dano, curar | Todas ações do combate normais | |
| 8.4 | Player join via link | Player consegue entrar | |
| 8.5 | Player view atualiza em tempo real | Realtime funciona | |
| 8.6 | Oráculo de Magias (buscar "Fireball") | Resultado aparece | |
| 8.7 | Oráculo de Monstros (buscar "Dragon") | Resultado aparece | |
| 8.8 | Salvar e retomar encontro | Encounter save/load funciona | |
| 8.9 | Dashboard mostra campanhas e sessões | Listagem correta | |
| 8.10 | Compendium (magias, monstros, itens) | Busca funciona | |

---

## Seção 9: Mobile-Specific

**Dispositivos para testar:** Chrome Android, Safari iOS (ou DevTools com viewport 393x851)

| # | Teste | Resultado esperado | ✅/❌ |
|---|-------|-------------------|-------|
| 9.1 | Oracle modal: botão X visível e funcional | Fecha o modal | |
| 9.2 | CommandPalette: botão X visível e funcional | Fecha a palette | |
| 9.3 | Notas do jogador: textarea sem zoom | Font 16px, sem auto-zoom iOS | |
| 9.4 | Campaign sections: colapsáveis por toque | Touch targets 44px+ | |
| 9.5 | Player Drawer: slide-in/out suave | Animação fluida | |
| 9.6 | Player Drawer: full-width no mobile | Ocupa toda a largura | |
| 9.7 | Toast de offline/sync visível | Não fica atrás de outros elementos | |

---

## Checklist Final

| Área | Status |
|------|--------|
| M1.1 — Oracle Modal Mobile Fix | ⬜ |
| M1.2 — DM Notes por Jogador | ⬜ |
| M2.1 — Player Drawer no Combate | ⬜ |
| M2.2 — Campaign Notes CRUD | ⬜ |
| M2.3 — Encounter History | ⬜ |
| M2.4 — Campaign Page Redesign | ⬜ |
| Resiliência — Offline/Online Sync | ⬜ |
| Resiliência — Tab Close Recovery | ⬜ |
| Resiliência — Retry com Backoff | ⬜ |
| Regressões Críticas | ⬜ |
| Mobile-Specific | ⬜ |

---

*Roteiro gerado em 2026-03-28*
*Total: 60+ test cases across 9 sections*
