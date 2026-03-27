# PRD: Estabilização & Simplificação da Pocket DM

**Versão:** 1.0
**Data:** 2026-03-27
**Autor:** John (PM) + Time BMAD completo
**Status:** Aprovado para execução
**Origem:** Feedback direto do fundador (áudios transcritos — walkthrough completo da plataforma)

---

## 1. Contexto e Motivação

O fundador realizou um teste completo da plataforma cobrindo três jornadas:
1. **Visitante** → Criador de combate → Tentativa de criar conta
2. **Mestre logado** → Importar encontro → Iniciar combate → Compartilhar sessão
3. **Jogador novo** → Entrar via link → Solicitar entrada

**Resultado:** Múltiplos bugs críticos que bloqueiam o uso básico e uma interface que acumula complexidade desnecessária, violando a premissa central do produto.

### Premissa Central (North Star)

> *"Focar na simplicidade da utilização — criação de encontro, organização dos encontros, e o encontro fluir na mesa."*

Toda decisão de design e priorização deve ser avaliada contra essa premissa.

---

## 2. Problemas Identificados

### 2.1 Bugs Críticos (Bloqueiam Onboarding/Uso)

| ID | Problema | Impacto | Root Cause Identificado |
|----|----------|---------|------------------------|
| C1 | Criação de conta retorna "erro inesperado" | Nenhum novo usuário consegue entrar | Error handling genérico mascara erro real do Supabase; possível PKCE redirect não whitelistado |
| C2 | F5 perde todo o estado da sessão | Mestre perde todo o trabalho de setup | Combatants ficam apenas no Zustand (memória); `loadCombatBackup()` nunca é chamado; setup-phase não persiste no DB |
| C3 | Solicitação de entrada do jogador invisível | Jogador fica travado em "aguardando aprovação" | Listener de `combat:late_join_request` pode não estar attached ao channel no momento correto |
| C4 | Alias/máscara dos monstros não aparece | Meta-gaming: jogadores veem nome real do monstro | `display_name` é stripped do `SanitizedCombatant` em `realtime.ts`; `PlayerInitiativeBoard` usa `name` direto |

### 2.2 Bugs Funcionais

| ID | Problema | Impacto |
|----|----------|---------|
| F1 | Jogador adicionado sem iniciativa | Combate com dados incompletos |
| F2 | Botão "Pinar" não funciona | Feature morta na UI |
| F3 | Tooltip do HP vazio | Elemento confuso sem função |
| F4 | Texto "chave@h chave" na ficha | Dados corrompidos no rendering |
| F5 | Cálculo de dificuldade errado | Mestre recebe informação incorreta |
| F6 | Botão "Compartilhar Arquivo" | Feature que não deveria existir na tela de combate |

### 2.3 Melhorias UX Urgentes

| ID | Problema | Proposta |
|----|----------|---------|
| U1 | Menu superior superlotado | Agrupar Monstros/Magias/Itens/Condições em "Compêndio" |
| U2 | Tela de encontro confusa | Remover botões duplicados, limpar header |
| U3 | Dificuldade ocupa espaço excessivo | Compactar ao lado do nome do encontro |
| U4 | Sem histórico de rolagens | Painel lateral de log tipo chat |
| U5 | Barra HP Critical preta | Trocar para cor visível (vermelho escuro) |
| U6 | Minimize vai para posição errada | Reposicionar área de minimize |
| U7 | Sem opção de adicionar combatente durante combate | Botão "+ Combatente" com opções monstro/jogador |

### 2.4 Melhorias de Fluxo

| ID | Problema | Proposta |
|----|----------|---------|
| FL1 | Login/Signup confusos | Páginas separadas; opção de login na LP |
| FL2 | Jogadores não submetem iniciativa | Via sessão compartilhada |
| FL3 | Botões bloqueados para visitante | Mostrar "Salvar" e "Convidar" bloqueados, pedindo criar conta |

---

## 3. Planejamento de Sprints

### Sprint 1 — "Desbloqueio" (Prioridade Máxima)
**Objetivo:** Desbloquear o funil básico de uso

| Story | Descrição | Arquivos Chave |
|-------|-----------|---------------|
| S1.1 | Fix criação de conta | `sign-up-form.tsx`, `translate-error.ts`, `.env` |
| S1.2 | Persistência de sessão no F5 | `combat-store.ts`, `combat-persist.ts`, `CombatSessionClient.tsx` |
| S1.3 | Fix join request invisível | `CombatSessionClient.tsx`, `PlayerJoinClient.tsx`, `broadcast.ts` |
| S1.4 | Alias/máscara para jogadores | `realtime.ts`, `PlayerInitiativeBoard.tsx` |

### Sprint 2 — "Limpeza & Correções"
**Objetivo:** Simplificar a interface e corrigir bugs menores

| Story | Descrição |
|-------|-----------|
| S2.1 | Reorganizar menu superior (Compêndio agrupado) |
| S2.2 | Limpar tela de combate (remover botões desnecessários) |
| S2.3 | Compactar indicador de dificuldade |
| S2.4 | Validação de iniciativa obrigatória |
| S2.5 | Remover/fix botão Pinar |
| S2.6 | Fix tooltip HP |
| S2.7 | Fix texto "chave@h" |
| S2.8 | Cor da barra Critical HP |

### Sprint 3 — "Experiência Completa"
**Objetivo:** Features que completam a experiência

| Story | Descrição |
|-------|-----------|
| S3.1 | Histórico de rolagens (chat de dados) |
| S3.2 | Adicionar combatente durante combate ativo |
| S3.3 | Reposicionar minimize de fichas |
| S3.4 | Jogadores submetem própria iniciativa |
| S3.5 | Melhorias no fluxo login/signup |
| S3.6 | Botões bloqueados para visitante |

---

## 4. Critérios de Sucesso

- [ ] Novo usuário consegue criar conta sem erros
- [ ] Sessão de combate sobrevive a F5 sem perda de dados
- [ ] Jogador consegue solicitar entrada e mestre vê a notificação
- [ ] Jogadores veem alias dos monstros, não o nome real
- [ ] Menu superior tem no máximo 5 itens
- [ ] Tela de combate tem apenas controles essenciais visíveis
- [ ] Premissa de simplicidade é respeitada em todas as telas

---

## 5. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Fix de auth pode depender de config do Supabase Dashboard | Documentar passos de config necessários |
| Persistência pode causar conflitos de estado | Usar timestamp + merge strategy |
| Mudanças no menu podem quebrar navegação existente | Manter rotas, só mudar UI do nav |
| Remoção de features pode afetar fluxos | Verificar analytics antes de remover |

---

## 6. Decisões Arquiteturais

### Persistência de Sessão
- **Decisão:** Persistir combatants no Supabase imediatamente ao adicionar, mesmo em setup
- **Alternativa rejeitada:** localStorage-only (não sincroniza entre abas/dispositivos)
- **Justificativa:** Consistência com a arquitetura realtime existente

### Alias de Monstros
- **Decisão:** Incluir `display_name` no broadcast para jogadores
- **Campo sensível removido:** Apenas `dm_notes`, `current_hp`, `max_hp`, `temp_hp`, `ac`, `spell_save_dc`
- **Justificativa:** display_name existe exatamente para ser visto pelo jogador

### Menu Superior
- **Decisão:** Dashboard | Compêndio (dropdown) | Presets | Configurações
- **Justificativa:** Reduz de 7+ itens para 4, libera espaço para busca e branding
