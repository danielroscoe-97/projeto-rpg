# Épicos: Estabilização & Simplificação

**Projeto:** Taverna do Mestre
**Data de criação:** 2026-03-27
**Origem:** PRD de Estabilização & Simplificação (`docs/prd-stabilization-simplification.md`)
**Status geral:** Sprints 1–3 concluídos + QA pass, Sprint 4 (futuro) pendente

---

## Visão Geral

Este documento formaliza os épicos e stories derivados do feedback direto do fundador, coletado através de um walkthrough completo da plataforma cobrindo três jornadas de usuário (visitante, mestre logado e jogador novo). O trabalho é organizado em três épicos progressivos que partem do desbloqueio de bugs críticos, passam pela simplificação da interface e culminam em features que completam a experiência de uso.

### Premissa Central (North Star)

> *"Focar na simplicidade da utilização — criação de encontro, organização dos encontros, e o encontro fluir na mesa."*

Toda story deve ser avaliada contra essa premissa.

---

## Épico E1: Desbloqueio Crítico (Sprint 1)

**Objetivo:** Remover bloqueadores do funil básico de uso
**Prioridade:** Máxima — sem esses fixes, nenhum usuário consegue completar o fluxo básico
**Status:** ✅ Implementado

### Stories

#### E1-S1: Fix criação de conta

**Descrição:** Melhorar error handling do fluxo de signup, adicionar logging estruturado e retornar mensagens de erro mais específicas ao invés do genérico "erro inesperado".

**Problema original:** Criação de conta retornava "erro inesperado", impedindo qualquer novo usuário de entrar. O error handling genérico mascarava o erro real do Supabase, com possível PKCE redirect não whitelistado.

**Critérios de aceite:**
- Erros do Supabase são capturados e traduzidos para mensagens compreensíveis
- Logging estruturado no servidor para diagnóstico rápido
- Mensagens de erro específicas para cada cenário (email duplicado, senha fraca, redirect inválido, etc.)
- Fluxo PKCE validado end-to-end

**Arquivos-chave:** `sign-up-form.tsx`, `translate-error.ts`, `.env`

---

#### E1-S2: Persistência de sessão

**Descrição:** Salvar backup do estado de combate durante setup e restaurar do localStorage em caso de F5 (refresh da página).

**Problema original:** F5 perdia todo o estado da sessão. Combatants ficavam apenas no Zustand (memória), `loadCombatBackup()` nunca era chamado e a setup-phase não persistia no banco de dados.

**Critérios de aceite:**
- Estado dos combatentes é persistido no Supabase imediatamente ao adicionar, mesmo em fase de setup
- F5 restaura o estado completo da sessão sem perda de dados
- Estratégia de merge por timestamp para evitar conflitos de estado
- Funciona corretamente entre abas e dispositivos

**Arquivos-chave:** `combat-store.ts`, `combat-persist.ts`, `CombatSessionClient.tsx`

---

#### E1-S3: Join request visível

**Descrição:** Corrigir o singleton de canal stale do Realtime, resetando a referência quando o componente EncounterSetup desmonta, para que o mestre receba notificações de solicitação de entrada dos jogadores.

**Problema original:** Solicitação de entrada do jogador ficava invisível para o mestre. O jogador ficava travado em "aguardando aprovação" porque o listener de `combat:late_join_request` podia não estar attached ao channel no momento correto.

**Critérios de aceite:**
- Mestre recebe notificação visual quando jogador solicita entrada
- Canal Realtime é corretamente reinicializado ao remontar o componente
- Jogador recebe feedback de que sua solicitação foi enviada
- Fluxo funciona independente da ordem de entrada (mestre primeiro ou jogador primeiro)

**Arquivos-chave:** `CombatSessionClient.tsx`, `PlayerJoinClient.tsx`, `broadcast.ts`

---

#### E1-S4: Alias de monstros no setup

**Descrição:** Mostrar o `display_name` (alias/máscara) na row de setup para o mestre, e garantir que jogadores vejam apenas o alias durante o combate.

**Problema original:** Alias/máscara dos monstros não aparecia. O `display_name` era stripped do `SanitizedCombatant` em `realtime.ts` e o `PlayerInitiativeBoard` usava `name` diretamente, causando meta-gaming.

**Critérios de aceite:**
- Mestre vê o `display_name` ao lado do nome real durante setup
- Jogadores veem apenas o `display_name` durante o combate
- Campo `display_name` incluído no broadcast para jogadores
- Campos sensíveis (dm_notes, current_hp, max_hp, temp_hp, ac, spell_save_dc) continuam removidos do broadcast

**Arquivos-chave:** `realtime.ts`, `PlayerInitiativeBoard.tsx`

---

## Épico E2: Limpeza & Simplificação (Sprint 2)

**Objetivo:** Reduzir ruído visual e focar na simplicidade da interface
**Prioridade:** Alta — necessário para alinhar a UI com a premissa central do produto
**Status:** ✅ Implementado

### Stories

#### E2-S1: Limpar header de combate

**Descrição:** Remover componentes desnecessários do header da tela de combate: `FileShareButton`, `GMNotesSheet` e `ShareSessionButton` duplicado.

**Problema original:** Menu superior superlotado com botões duplicados e features que não deveriam existir na tela de combate (ex: "Compartilhar Arquivo").

**Critérios de aceite:**
- Header de combate contém apenas controles essenciais
- `FileShareButton` removido da tela de combate
- `GMNotesSheet` removido do header (acessível de outra forma se necessário)
- `ShareSessionButton` duplicado eliminado
- Layout limpo e focado na experiência de combate

---

#### E2-S2: Menu Compêndio

**Descrição:** Agrupar as seções Monstros, Magias, Itens e Condições em um dropdown único chamado "Compêndio" no menu superior.

**Problema original:** Menu superior com 7+ itens, violando a premissa de simplicidade.

**Critérios de aceite:**
- Menu superior contém no máximo 4-5 itens: Dashboard | Compêndio (dropdown) | Presets | Configurações
- Dropdown do Compêndio lista: Monstros, Magias, Itens, Condições
- Rotas existentes mantidas (apenas mudança na UI de navegação)
- Espaço liberado para busca e branding

---

#### E2-S3: Compactar dificuldade

**Descrição:** Transformar o indicador de dificuldade de encontro em um badge inline ao lado do nome do encontro, ao invés de ocupar uma seção separada.

**Problema original:** Indicador de dificuldade ocupava espaço excessivo na interface, adicionando ruído visual.

**Critérios de aceite:**
- Dificuldade exibida como badge compacto (ex: tag colorida)
- Posicionado ao lado do nome do encontro
- Cores do badge indicam nível de dificuldade (fácil, médio, difícil, mortal)
- Espaço visual liberado para conteúdo mais relevante

---

#### E2-S4: Validação de iniciativa

**Descrição:** Tornar o campo de iniciativa obrigatório ao adicionar um combatente ao encontro.

**Problema original:** Jogadores podiam ser adicionados sem valor de iniciativa, resultando em dados de combate incompletos e ordem de turno incorreta.

**Critérios de aceite:**
- Campo de iniciativa é obrigatório no formulário de adição de combatente
- Validação visual (borda vermelha, mensagem de erro) quando campo está vazio
- Não é possível confirmar adição sem iniciativa preenchida
- Valor deve ser numérico válido

---

#### E2-S5: Cor Critical HP

**Descrição:** Mudar a cor da barra de HP no estado Critical de preto para vermelho escuro (`bg-red-900`).

**Problema original:** Barra HP preta no estado Critical era visualmente confusa e pouco legível.

**Critérios de aceite:**
- Estado Critical usa `bg-red-900` (vermelho escuro) ao invés de preto
- Mantém os tiers imutáveis: LIGHT (70%), MODERATE (40%), HEAVY (10%), CRITICAL
- Contraste adequado para leitura do texto sobre a barra
- Consistência visual em todas as superfícies (combate, compêndio, busca, command palette)

---

## Épico E3: Experiência Completa (Sprint 3)

**Objetivo:** Features que completam a experiência de uso e melhoram o fluxo geral
**Prioridade:** Média — melhorias importantes mas não bloqueadoras
**Status:** ✅ Implementado (S1–S3), S4–S5 pendentes para sprint futuro

### Stories

#### E3-S1: Histórico de rolagens

**Descrição:** Criar componente `DiceRollLog` tipo chat que exibe detalhes de cada rolagem realizada durante o combate, incluindo quem rolou, o resultado e o contexto.

**Critérios de aceite:**
- Painel lateral ou inferior com histórico de rolagens em formato chat
- Cada entrada mostra: combatente, tipo de rolagem, resultado detalhado, timestamp
- Scroll automático para última rolagem
- Visível para mestre e jogadores (com informações filtradas conforme permissão)
- Design limpo, não intrusivo, seguindo a premissa de simplicidade

---

#### E3-S2: Adicionar combatente mid-combat

**Descrição:** Permitir ao mestre adicionar novos combatentes durante um combate já ativo, com opção de monstro do SRD ou jogador/NPC manual.

**Critérios de aceite:**
- Botão "+ Combatente" acessível durante combate ativo
- Opção 1: Selecionar monstro do SRD (com busca)
- Opção 2: Adicionar jogador ou NPC manualmente
- Novo combatente inserido na ordem de iniciativa correta
- Estado do combate atualizado via Realtime para todos os participantes

---

#### E3-S3: Melhoria login/signup

**Descrição:** Simplificar o fluxo de autenticação com login direto na landing page e link "já tenho conta" para facilitar a transição entre signup e login.

**Critérios de aceite:**
- Opção de login acessível diretamente na landing page
- Link "já tenho conta" visível na tela de signup
- Link "criar conta" visível na tela de login
- Transição suave entre as telas sem perda de contexto
- Páginas separadas e claras para login vs. signup

---

#### E3-S4: (Futuro) Jogadores submetem própria iniciativa

**Descrição:** Permitir que jogadores insiram seu próprio valor de iniciativa via sessão compartilhada, reduzindo trabalho manual do mestre.

**Critérios de aceite:**
- Jogador conectado à sessão vê campo de iniciativa próprio
- Valor submetido é recebido pelo mestre via Realtime
- Mestre pode aceitar ou ajustar o valor
- Funciona em conjunto com o fluxo de join request existente

**Nota:** Story planejada para sprint futuro.

---

#### E3-S5: (Futuro) Botões bloqueados para visitante incentivando criação de conta

**Descrição:** Exibir botões "Salvar" e "Convidar" em estado bloqueado para visitantes não logados, incentivando a criação de conta com mensagem contextual.

**Critérios de aceite:**
- Visitante vê botões "Salvar" e "Convidar" visualmente desabilitados
- Ao clicar, tooltip ou modal explica que é necessário criar conta
- CTA direto para tela de signup
- Não interfere na experiência de exploração do visitante

**Nota:** Story planejada para sprint futuro.

---

## Decisões Arquiteturais

### 1. Persistência de Sessão

- **Decisão:** Persistir combatants no Supabase imediatamente ao adicionar, mesmo em fase de setup
- **Alternativa rejeitada:** localStorage-only (não sincroniza entre abas/dispositivos)
- **Justificativa:** Consistência com a arquitetura Realtime existente. O Supabase já é a fonte de verdade para dados de combate ativo; estender isso para a fase de setup mantém o modelo mental simples e garante que F5, troca de aba ou dispositivo não cause perda de trabalho.

### 2. Alias de Monstros

- **Decisão:** Incluir `display_name` no broadcast para jogadores
- **Campos sensíveis removidos do broadcast:** `dm_notes`, `current_hp`, `max_hp`, `temp_hp`, `ac`, `spell_save_dc`
- **Justificativa:** O campo `display_name` existe exatamente para ser visto pelo jogador. Ele foi projetado como a máscara pública do monstro, e removê-lo do sanitize era um bug, não um feature. A separação entre dados públicos (nome, alias, posição) e privados (HP, AC, notas) continua intacta.

### 3. Menu Superior

- **Decisão:** Reestruturar para Dashboard | Compêndio (dropdown) | Presets | Configurações
- **Justificativa:** Reduz de 7+ itens para 4, liberando espaço para busca e branding. O dropdown de Compêndio agrupa categorias relacionadas (Monstros, Magias, Itens, Condições) sob um conceito que o usuário de RPG já entende. As rotas existentes são mantidas — apenas a UI de navegação muda.

---

## Resumo de Progresso

| Épico | Stories | Concluídas | Status |
|-------|---------|------------|--------|
| E1: Desbloqueio Crítico | 4 | 4 | ✅ Implementado |
| E2: Limpeza & Simplificação | 5 | 5 | ✅ Implementado |
| E3: Experiência Completa | 5 | 3 (S4–S5 futuro) | ✅ Sprint scope done |
| **Total** | **14** | **12** | S4–S5 pendentes |

---

## Critérios de Sucesso Globais

- [ ] Novo usuário consegue criar conta sem erros
- [ ] Sessão de combate sobrevive a F5 sem perda de dados
- [ ] Jogador consegue solicitar entrada e mestre vê a notificação
- [ ] Jogadores veem alias dos monstros, não o nome real
- [ ] Menu superior tem no máximo 5 itens
- [ ] Tela de combate tem apenas controles essenciais visíveis
- [ ] Premissa de simplicidade é respeitada em todas as telas

---

## Referência

- **PRD completo:** `docs/prd-stabilization-simplification.md`
- **Screenshot de referência:** `scripts/audiosv2/Screenshot_3.png`
- **Áudios transcritos:** `scripts/audiosv2/audios.md`
- **Regra imutável de HP tiers:** `docs/hp-status-tiers-rule.md`
- **Stack técnico e bibliotecas:** `docs/tech-stack-libraries.md`
