# Especificação Completa — Epics & Sprints

**Projeto:** Pocket DM
**Autor:** BMAD Team (John, Mary, Winston, Sally, Bob)
**Data:** 2026-03-27
**Referência:** PRD V2 (`docs/prd-v2.md`)

---

## Sumário Executivo

Este documento detalha **todas as stories** dos 8 Epics definidos no PRD V2, organizadas em sprints com acceptance criteria, approach técnico, e dependências. É o documento de referência para implementação.

---

## Sprint 1 — Fundação & Combat Core (Semana 1)

**Objetivo:** Eliminar débitos técnicos críticos e resolver os 3 bugs mais impactantes do combate.
**Duração:** 5 dias
**Épics:** Epic 0 + Epic 1

---

### Epic 0: Tech Debt Cleanup

#### Story 0.1: Fix Empty Catch Blocks

**Prioridade:** P0
**Esforço:** 2h
**Arquivos:**
- `components/player/PlayerLobby.tsx:64-66`
- `components/oracle/OracleAIModal.tsx:150-152`

**O que fazer:**
- Substituir catch blocks vazios por error handling com feedback ao usuário
- PlayerLobby: mostrar toast/mensagem "Erro ao registrar. Tente novamente."
- OracleAIModal: logar erro no Sentry e mostrar mensagem contextual

**Acceptance Criteria:**
- [ ] Nenhum catch block vazio no codebase
- [ ] Usuário recebe feedback visual quando uma ação falha
- [ ] Erros logados no Sentry com contexto

**Approach Técnico:**
```typescript
// PlayerLobby.tsx — antes:
} catch {
  setIsSubmitting(false);
}

// PlayerLobby.tsx — depois:
} catch (error) {
  setIsSubmitting(false);
  setError(t('player.registrationError'));
  Sentry.captureException(error, { tags: { flow: 'player-registration' } });
}
```

---

#### Story 0.2: Fix useEffect Dependency Arrays

**Prioridade:** P0
**Esforço:** 3h
**Arquivos:**
- `components/guest/GuestCombatClient.tsx:76`
- `components/dice/DiceHistoryPanel.tsx:41`
- `components/combat/EncounterSetup.tsx:89`
- `components/combat/MonsterSearchPanel.tsx:140`

**O que fazer:**
- Analisar cada useEffect e corrigir as dependências
- Se a supressão for intencional (evitar re-render infinito), documentar com comentário explicando por que
- Usar `useCallback` ou `useRef` para estabilizar referências quando necessário

**Acceptance Criteria:**
- [ ] Zero `eslint-disable exhaustive-deps` sem justificativa documentada
- [ ] Componentes testados: comportamento não regrediu
- [ ] Cada supressão intencional tem comentário `// Deps: ...reason...`

---

#### Story 0.3: Rate Limit Persistente (Upstash Redis)

**Prioridade:** P0
**Esforço:** 4h
**Arquivos:**
- `app/api/oracle-ai/route.ts:5-8`

**O que fazer:**
- Substituir `Map<string, ...>` in-memory por Upstash Redis
- Configurar `@upstash/ratelimit` com sliding window
- Manter mesmos limites: 20 requests/min por IP

**Acceptance Criteria:**
- [ ] Rate limit funciona em deploy multi-instance (Vercel serverless)
- [ ] Fallback: se Redis falhar, permitir request (fail open, não bloquear usuário)
- [ ] Env var `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` configuradas

**Dependências:**
- Criar conta Upstash (free tier: 10k requests/dia)
- Adicionar `@upstash/ratelimit` + `@upstash/redis` ao package.json

---

#### Story 0.4: Cleanup setTimeout Leaks

**Prioridade:** P1
**Esforço:** 2h
**Arquivos:**
- `components/oracle/OracleAIModal.tsx:46`
- `components/player/PlayerLobby.tsx`
- `components/tutorial/code-block.tsx:45`

**O que fazer:**
- Guardar `setTimeout` ID em ref e chamar `clearTimeout` no cleanup do useEffect
- Para timeouts fora de useEffect, usar pattern de mounted check

**Acceptance Criteria:**
- [ ] Zero setTimeout sem cleanup em componentes React
- [ ] Testes de unmount não mostram warnings no console

---

#### Story 0.5: Remover eslint-disable Desnecessários

**Prioridade:** P1
**Esforço:** 4h
**Arquivos:** 8 arquivos com 15+ comentários eslint-disable

**O que fazer:**
- Para cada `eslint-disable`:
  - Se é `no-explicit-any`: tipar properly
  - Se é `no-unused-vars` em broadcast.ts: manter (intencional — strip de campos DM)
  - Se é `react-hooks/exhaustive-deps`: coberto pela Story 0.2

**Acceptance Criteria:**
- [ ] eslint-disable para `no-explicit-any` = 0
- [ ] eslint-disable para `no-unused-vars` justificado com comentário
- [ ] Build passa sem warnings de tipo

---

### Epic 1: Combat Core Improvements

#### Story 1.1: Adicionar Monstro Mid-Combat

**Prioridade:** P0
**Esforço:** 4h
**FRs:** FR42, FR12
**Arquivos:**
- `components/combat/CombatSessionClient.tsx`
- `components/combat/EncounterSetup.tsx`
- `components/combat/MonsterSearchPanel.tsx`
- `lib/stores/combat-store.ts`
- `lib/realtime/broadcast.ts`

**O que fazer:**
- Permitir que o botão "Add Combatant" funcione durante combate ativo (hoje só funciona na fase de setup)
- Ao adicionar mid-combat: combatant entra com iniciativa = 0 (mestre define manualmente)
- Broadcast `combat:combatant_add` para jogadores
- Persist no DB

**Acceptance Criteria:**
- [ ] DM pode adicionar monstro ou player quando `is_active = true`
- [ ] Novo combatant aparece na lista com iniciativa editável
- [ ] Jogadores conectados veem o novo combatant (sanitizado)
- [ ] DB atualizado com novo combatant
- [ ] Undo funciona (remover combatant adicionado)

**Approach Técnico:**
- Reutilizar `AddCombatantForm` mas com flag `midCombat: true`
- No combat-store: action `addCombatantMidCombat(combatant)` que insere na posição correta da initiative order
- Broadcast sanitizado via `broadcastEvent`
- Persist via `supabase.from("combatants").insert()`

---

#### Story 1.2: Display Name Customizável (Anti-Metagaming)

**Prioridade:** P0
**Esforço:** 4h
**FRs:** FR43, NFR33
**Arquivos:**
- `lib/types/combat.ts` — adicionar campo `display_name`
- `components/combat/CombatantRow.tsx` — mostrar display_name para DM com indicador
- `components/combat/StatsEditor.tsx` — campo para editar display_name
- `lib/realtime/broadcast.ts` — enviar `display_name` em vez de `name` para players
- `components/player/PlayerInitiativeBoard.tsx` — usar `display_name`
- DB migration: adicionar coluna `display_name` nullable em `combatants`

**O que fazer:**
- Adicionar campo `display_name: string | null` ao combatant
- DM view: mostrar `name (display_name)` se definido, ou só `name` se não
- Player view: mostrar `display_name` se existir, senão `name`
- Sanitização: display_name passa por `sanitize()` antes de broadcast
- Default: null (mostra nome real, comportamento atual)

**Acceptance Criteria:**
- [ ] DM pode definir display_name para qualquer monstro
- [ ] Player view mostra display_name em vez do nome real
- [ ] DM view mostra ambos (nome real + display name)
- [ ] Display name sanitizado contra XSS
- [ ] Broadcast nunca envia nome real de monstro quando display_name está definido
- [ ] DB migration aplicada sem downtime

**Exemplo de uso:**
- Monstro real: "Adult Red Dragon"
- Display name: "Criatura Misteriosa"
- DM vê: "Adult Red Dragon (Criatura Misteriosa)"
- Jogador vê: "Criatura Misteriosa"

---

#### Story 1.3: Late-Join Initiative Input

**Prioridade:** P0
**Esforço:** 6h
**FRs:** FR47
**Arquivos:**
- `components/player/PlayerJoinClient.tsx`
- `components/player/PlayerLobby.tsx`
- `lib/supabase/player-registration.ts`
- `components/session/CombatSessionClient.tsx`
- `lib/realtime/broadcast.ts`

**O que fazer:**
- Atualmente: se combate já iniciou e player entra, não consegue inputar iniciativa
- Novo fluxo:
  1. Player entra em sessão ativa → vê formulário de registro (nome, HP, AC, iniciativa)
  2. Player submete → `registerPlayerCombatant()` com flag `late_join: true`
  3. DM recebe notificação: "Jogador X quer entrar. Iniciativa: Y. [Aceitar] [Rejeitar]"
  4. DM aceita → combatant inserido na ordem de iniciativa correta
  5. Broadcast para todos os players

**Acceptance Criteria:**
- [ ] Player que entra em sessão com `is_active = true` vê formulário de registro
- [ ] Player pode definir nome, HP, AC e iniciativa
- [ ] DM recebe notificação visual de late-join request
- [ ] DM pode aceitar ou rejeitar
- [ ] Ao aceitar: combatant aparece na posição correta da initiative order
- [ ] Outros players veem o novo combatant
- [ ] Se DM rejeitar: player recebe feedback

**Dependências:** Story 1.1 (mid-combat add) fornece a infraestrutura base

---

## Sprint 2 — Grouping & Player Experience (Semana 2)

**Objetivo:** Melhorar combates com muitos monstros e tornar a experiência do jogador engajadora.
**Duração:** 5 dias
**Épics:** Epic 2 + Epic 3

---

### Epic 2: Monster Grouping & Initiative

#### Story 2.1: UI de Agrupamento de Monstros

**Prioridade:** P1
**Esforço:** 6h
**FRs:** FR44
**Arquivos:**
- `lib/types/combat.ts` — adicionar `group_id: string | null`, `group_name: string | null`
- `components/combat/CombatantRow.tsx` — renderizar grupo colapsável
- `components/combat/EncounterSetup.tsx` — opção de agrupar ao adicionar múltiplos
- `lib/stores/combat-store.ts` — actions de grupo
- DB migration: adicionar `group_id`, `group_name` em `combatants`

**O que fazer:**
- Ao adicionar monstro, campo "Quantidade" gera N combatants com mesmo `group_id`
- Grupo aparece como header colapsável: "Goblins (3)" com expand/collapse
- Cada monstro dentro do grupo tem HP individual
- Grupo compartilha uma única entrada de iniciativa

**Acceptance Criteria:**
- [ ] DM pode adicionar "3 Goblins" que são agrupados automaticamente
- [ ] Grupo tem header com nome e contagem
- [ ] Click no header expande/colapsa lista de monstros individuais
- [ ] HP é individual por monstro
- [ ] Iniciativa é compartilhada pelo grupo
- [ ] Grupos visíveis na player view (colapsados, sem stats)

---

#### Story 2.2: HP Individual Dentro do Grupo

**Prioridade:** P1
**Esforço:** 4h
**FRs:** FR45

**O que fazer:**
- Cada combatant no grupo mantém `current_hp`, `max_hp`, `temp_hp` individuais
- HpAdjuster funciona por combatant individual
- Defeat de um monstro no grupo: muda `is_defeated` individual
- Se todos no grupo defeated → grupo inteiro marcado como defeated

**Acceptance Criteria:**
- [ ] Cada monstro tem HP independente
- [ ] DM pode dano/curar cada monstro individualmente
- [ ] Monstro individual pode ser derrotado
- [ ] Grupo auto-derrota quando todos os membros estão defeated
- [ ] Broadcast sanitiza HP individual (hp_status por monstro)

---

#### Story 2.3: Expand/Collapse de Grupos

**Prioridade:** P1
**Esforço:** 3h
**FRs:** FR46

**O que fazer:**
- Header do grupo: ícone chevron para expand/collapse
- Colapsado: mostra apenas nome do grupo + contagem + HP aggregado
- Expandido: mostra cada monstro com HpAdjuster individual
- Estado de collapse persistido localmente (não no DB)

**Acceptance Criteria:**
- [ ] Click no header toggle expand/collapse
- [ ] Estado visual claro (chevron rotaciona)
- [ ] HP aggregado visível quando colapsado
- [ ] Keyboard navigable (Enter/Space para toggle)

---

#### Story 2.4: Roll Coletivo de Iniciativa

**Prioridade:** P1
**Esforço:** 2h
**FRs:** FR44

**O que fazer:**
- Na fase de setup, grupo de monstros rola 1 iniciativa
- Resultado aplicado a todos os combatants do grupo
- DM pode override individual se quiser separar do grupo

**Acceptance Criteria:**
- [ ] 1 roll de iniciativa para o grupo inteiro
- [ ] Todos os membros recebem o mesmo valor
- [ ] DM pode editar iniciativa individual (separa do grupo)

---

### Epic 3: Player Experience Upgrade

#### Story 3.1: Notificação "Você é o Próximo"

**Prioridade:** P1
**Esforço:** 3h
**FRs:** FR48, NFR31
**Arquivos:**
- `components/player/PlayerInitiativeBoard.tsx`
- `lib/realtime/broadcast.ts` — incluir info de "next player"

**O que fazer:**
- No broadcast de `combat:turn_advance`, incluir `next_combatant_id`
- PlayerInitiativeBoard: se `next_combatant_id` = player logado → mostrar banner
- Banner: "Prepare-se! Você é o próximo." com highlight visual
- Aparece 1 turno antes do player

**Acceptance Criteria:**
- [ ] Player vê notificação 1 turno antes
- [ ] Notificação aparece em ≤200ms após broadcast
- [ ] Notificação some quando não é mais o próximo
- [ ] Não aparece para monstros (only players)

---

#### Story 3.2: Notificação "É Sua Vez!"

**Prioridade:** P1
**Esforço:** 3h
**FRs:** FR49, NFR31

**O que fazer:**
- Quando `current_turn_index` aponta para o combatant do player:
  - Banner prominente: "É SUA VEZ!" com animação pulse
  - Highlight visual no card do player
  - Opcional: vibração do celular (se suportado pelo browser)
- Banner persiste enquanto for o turno do player

**Acceptance Criteria:**
- [ ] Player vê "É SUA VEZ!" quando é seu turno
- [ ] Animação visual proeminente
- [ ] Banner some quando turno avança
- [ ] Vibração do celular (best effort — navigator.vibrate)
- [ ] Acessível: aria-live="assertive" para screen readers

---

#### Story 3.3: Player Auto-Join (Campanha Vinculada)

**Prioridade:** P1
**Esforço:** 6h
**FRs:** FR51

**O que fazer:**
- Jogador cadastrado + vinculado a campanha:
  - Ao entrar em sessão da campanha → personagem carrega automaticamente
  - Não precisa registrar nome/HP/AC novamente
  - DM vê "Jogador X entrou (auto)" na lista

**Acceptance Criteria:**
- [ ] Player vinculado à campanha não precisa preencher formulário
- [ ] Dados do personagem carregam automaticamente do `player_characters`
- [ ] DM recebe notificação de auto-join
- [ ] Player pode editar dados antes de confirmar
- [ ] Funciona apenas para sessões de campanhas onde player está vinculado

**Dependência:** Story 4.3 (convite por email) para vincular players a campanhas

---

#### Story 3.4: Diferenciação Jogador vs Mestre no Cadastro

**Prioridade:** P1
**Esforço:** 4h
**FRs:** FR50
**Arquivos:**
- `app/auth/sign-up/page.tsx`
- `components/auth/AuthPageContent.tsx`
- `lib/types/database.ts` — adicionar campo `role: 'player' | 'dm' | 'both'`
- DB migration: adicionar coluna `role` em `users`

**O que fazer:**
- No signup, após email/senha: step adicional "Como você vai usar?"
  - Opções: "Sou Jogador", "Sou Mestre", "Sou Ambos"
- Role salvo no profile do usuário
- Dashboard adapta baseado no role:
  - Jogador: foco em campanhas que participa, personagens
  - Mestre: foco em campanhas que cria, sessions, presets
  - Ambos: tudo

**Acceptance Criteria:**
- [ ] Signup inclui seleção de role
- [ ] Role persistido no DB
- [ ] Dashboard adapta layout baseado em role
- [ ] Usuário pode mudar role nas settings
- [ ] Default se não selecionar: "both"

---

#### Story 3.5: Mestre Atribui Player da Campanha ao Jogador Temporário

**Prioridade:** P2
**Esforço:** 5h
**FRs:** FR56

**O que fazer:**
- DM view: quando jogador entra via QR code, DM vê dropdown "Vincular a personagem:"
  - Lista players da campanha que não estão vinculados a ninguém
  - DM seleciona → stats do player_character carregam para o combatant
- Se jogador criar conta depois → personagem fica vinculado permanentemente

**Acceptance Criteria:**
- [ ] DM vê opção de vincular jogador temporário a player_character
- [ ] Stats carregam do player_character ao vincular
- [ ] Se jogador cria conta depois, vínculo persiste
- [ ] Jogador temporário não vinculado funciona normalmente (sem regressão)

---

## Sprint 3 — Campaign Management & Freemium (Semana 3-4)

**Objetivo:** Experiência completa do mestre + modelo de monetização implementado.
**Duração:** 10 dias
**Épics:** Epic 4 + Epic 5

---

### Epic 4: Session & Campaign Management

#### Story 4.1: Notas Privadas do GM

**Prioridade:** P2
**Esforço:** 4h
**FRs:** FR52
**Arquivos:**
- `components/session/CombatSessionClient.tsx`
- `lib/types/combat.ts` — adicionar `session_notes: string`
- DB migration: adicionar `notes` text em `sessions`

**O que fazer:**
- Sidebar ou panel colapsável na DM view: "Notas da Sessão"
- Textarea com auto-save (debounced, 1s)
- NUNCA broadcast para jogadores (explicitamente excluído do broadcast)
- Persist no DB (`sessions.notes`)
- Markdown support (rendering via react-markdown)

**Acceptance Criteria:**
- [ ] DM pode escrever notas durante sessão
- [ ] Auto-save com indicador visual (saved/saving)
- [ ] Notas NUNCA aparecem na player view
- [ ] Notas persistem entre reconexões
- [ ] Markdown renderizado corretamente
- [ ] i18n para labels ("Notas da Sessão" / "Session Notes")

---

#### Story 4.2: Compartilhar Arquivos na Sessão

**Prioridade:** P2
**Esforço:** 8h
**FRs:** FR53, NFR32

**O que fazer:**
- Botão "Compartilhar" na DM view → upload de imagem ou PDF
- Supabase Storage bucket: `session-files/{session_id}/`
- Limite: 10MB por arquivo, tipos: image/*, application/pdf
- Arquivo fica disponível para todos os jogadores conectados
- DM pode remover arquivo compartilhado

**Acceptance Criteria:**
- [ ] DM pode fazer upload de imagem/PDF
- [ ] Jogadores veem arquivo compartilhado na player view
- [ ] Limite de 10MB por arquivo enforced
- [ ] Tipos de arquivo validados (imagem + PDF)
- [ ] DM pode remover arquivo
- [ ] Arquivos deletados quando sessão encerra (ou configurable retention)

**Approach Técnico:**
- Supabase Storage com RLS: apenas owner da sessão pode upload
- Players podem download via signed URL (tempo limitado)
- Broadcast evento `session:file_shared` com URL

---

#### Story 4.3: Convite de Jogador via Email

**Prioridade:** P2
**Esforço:** 6h
**FRs:** FR54, NFR30

**O que fazer:**
- Dashboard → Campanha → "Convidar Jogador"
- Input de email → enviar convite via Supabase (edge function ou email service)
- Email contém link: `/auth/sign-up?invite={token}&campaign={id}`
- Jogador cria conta → automaticamente vinculado à campanha

**Acceptance Criteria:**
- [ ] DM pode convidar jogador por email
- [ ] Email contém link com token de convite
- [ ] Rate limit: 20 convites/dia por DM
- [ ] Jogador que aceita e cria conta: vinculado automaticamente à campanha
- [ ] Jogador existente que aceita: vinculado à campanha
- [ ] Convite expira em 7 dias

**Dependências:**
- Serviço de email (Supabase built-in, Resend, ou SendGrid)
- Tabela `campaign_invites` no DB

---

#### Story 4.4: Auto-Link Personagem ao Aceitar Convite

**Prioridade:** P2
**Esforço:** 4h
**FRs:** FR55

**O que fazer:**
- Após criar conta via convite, redirecionar para wizard "Criar Personagem"
- Personagem criado é automaticamente vinculado à campanha do convite
- Se jogador já tem personagem → opção de vincular existente

**Acceptance Criteria:**
- [ ] Após signup via convite → wizard de criação de personagem
- [ ] Personagem vinculado à campanha automaticamente
- [ ] Mestre vê novo personagem na campanha
- [ ] Jogador pode editar personagem depois

---

#### Story 4.5: CR Calculator Automático

**Prioridade:** P2
**Esforço:** 6h
**FRs:** FR62

**O que fazer:**
- Na fase de setup, calcular dificuldade do encontro:
  - Input: nível do party, número de jogadores
  - Fórmula: DMG 2014 (XP thresholds) e DMG 2024 (CR budget)
  - Output: Easy / Medium / Hard / Deadly
- Exibir ao lado do botão "Start Combat"

**Acceptance Criteria:**
- [ ] Cálculo correto para SRD 2014 (XP thresholds)
- [ ] Cálculo correto para SRD 2024 (CR budget)
- [ ] Badge visual: Easy (verde) / Medium (amarelo) / Hard (laranja) / Deadly (vermelho)
- [ ] Recalcula ao adicionar/remover combatants
- [ ] Party level configurável por campanha

---

#### Story 4.6: Homebrew — Criar Monstros/Magias/Itens

**Prioridade:** P3
**Esforço:** 10h
**FRs:** FR63

**O que fazer:**
- Compendium → "Criar Homebrew" (Pro only)
- Formulário completo para monstro (stat block), magia (description), item (properties)
- Salvar em tabela separada `homebrew_content` com `owner_id`
- Homebrew aparece no search junto com SRD (marcado com badge "Homebrew")

**Acceptance Criteria:**
- [ ] DM Pro pode criar monstro homebrew com stat block completo
- [ ] DM Pro pode criar magia homebrew
- [ ] DM Pro pode criar item homebrew
- [ ] Homebrew aparece no search do compendium (badge visual)
- [ ] Homebrew é privado do criador (não compartilhado por default)
- [ ] CRUD completo: criar, editar, deletar

---

### Epic 5: Freemium Feature Gating

#### Story 5.1: Sistema de Feature Flags

**Prioridade:** P1
**Esforço:** 6h
**NFRs:** NFR29

**O que fazer:**
- Tabela `feature_flags` no Supabase: `flag_name`, `is_enabled`, `tier_required`
- Helper: `useFeatureFlag(flagName)` → retorna `{ enabled, tier }`
- Server-side: middleware verifica tier do usuário + feature flag
- Configurável sem redeploy (update DB direto)

**Feature flags iniciais:**
```
persistent_campaigns: pro
saved_presets: pro
export_data: pro
homebrew: pro
session_analytics: pro
cr_calculator: pro
file_sharing: pro
email_invites: pro
```

**Acceptance Criteria:**
- [ ] Feature flags armazenadas no DB
- [ ] Hook `useFeatureFlag` disponível em client components
- [ ] Server-side validation para APIs protegidas
- [ ] Admin pode toggle flags sem redeploy
- [ ] Cache de flags com TTL de 5min (não hit DB a cada request)

---

#### Story 5.2: Indicadores Visuais Pro

**Prioridade:** P1
**Esforço:** 4h
**FRs:** FR57

**O que fazer:**
- Componente `<ProBadge />`: ícone de cadeado + tooltip "Disponível no Pro"
- Wrapper `<ProGate feature="...">`: renderiza children se Pro, senão ProBadge
- Aplicar em: salvar campanha, salvar preset, export, homebrew, analytics

**Acceptance Criteria:**
- [ ] Features Pro visíveis mas bloqueadas no Free
- [ ] Cadeado + tooltip consistente em todo o app
- [ ] Nunca esconde a feature — sempre mostra que existe
- [ ] i18n para tooltip

---

#### Story 5.3: Upsell Contextual

**Prioridade:** P2
**Esforço:** 4h
**FRs:** FR58

**O que fazer:**
- Ao clicar em feature Pro no tier Free → modal de upsell
- Modal: "Salvar campanhas é uma feature Pro. Comece com 14 dias grátis!"
- CTA: "Começar Trial" / "Ver Planos"
- NUNCA pop-up aleatório — apenas em ação do usuário

**Acceptance Criteria:**
- [ ] Upsell aparece apenas ao tentar usar feature Pro
- [ ] Modal contextual (menciona a feature específica)
- [ ] CTA para trial e para ver planos
- [ ] Tracking: `upsell_shown`, `upsell_clicked`, `upsell_dismissed`
- [ ] Não repetitivo: mostrar no máximo 1x por sessão por feature

---

#### Story 5.4: Trial Grátis

**Prioridade:** P2
**Esforço:** 6h
**FRs:** FR59

**O que fazer:**
- Ao ativar trial: `users.trial_started_at = now()`, `users.trial_ends_at = now() + 14 days`
- Durante trial: todas as features Pro liberadas
- Banner no app: "Trial Pro: X dias restantes"
- Ao expirar: downgrade graceful para Free (dados persistidos, read-only)

**Acceptance Criteria:**
- [ ] Trial de 14 dias ativável uma vez por conta
- [ ] Todas as features Pro liberadas durante trial
- [ ] Banner com countdown visível
- [ ] Expiração graceful: dados não deletados, apenas bloqueio de escrita
- [ ] Notificação 3 dias antes de expirar

---

#### Story 5.5: Modelo "Mesa"

**Prioridade:** P2
**Esforço:** 8h
**FRs:** FR60, NFR34

**O que fazer:**
- Se DM é Pro → jogadores conectados à sessão ativa herdam features Pro
- Validação via Supabase RLS: check `sessions.owner_id → users.is_pro`
- Se assinatura expira mid-session → features Pro continuam até fim da sessão

**Acceptance Criteria:**
- [ ] Players em sessão de DM Pro veem features Pro ativas
- [ ] Graceful degradation: expiração não interrompe sessão ativa
- [ ] Features Pro do player desativam ao sair da sessão
- [ ] Sem custo adicional para jogadores

---

#### Story 5.6: Integração de Pagamento

**Prioridade:** P2
**Esforço:** 10h

**O que fazer:**
- Integrar Stripe (ou similar) para cobrança
- Webhooks para ativar/desativar Pro no DB
- Página de checkout no app
- Portal de gerenciamento de assinatura

**Acceptance Criteria:**
- [ ] Pagamento via cartão de crédito
- [ ] Preços: R$ 14,90/mês ou R$ 119,90/ano
- [ ] Webhook ativa `users.is_pro = true` no pagamento
- [ ] Webhook desativa no cancelamento/expiração
- [ ] Portal para cancelar/trocar plano
- [ ] Recibos por email

---

#### Story 5.7: Painel de Assinatura

**Prioridade:** P2
**Esforço:** 4h

**O que fazer:**
- Settings → "Plano": mostrar plano atual, data de renovação, botão para gerenciar
- Link para Stripe Customer Portal
- Histórico de pagamentos

**Acceptance Criteria:**
- [ ] Plano atual visível nas settings
- [ ] Botão "Gerenciar Plano" → Stripe Portal
- [ ] Trial: mostrar dias restantes
- [ ] Free: mostrar CTA para upgrade

---

## Backlog V2+ — Especificado mas Não Agendado

> **Repositório centralizado de itens adiados:** [bucket-future-ideas.md](bucket-future-ideas.md)
> **Sprint plan ativo:** [sprint-plan-2026-03-30.md](sprint-plan-2026-03-30.md)
> **Análise competitiva:** [competitive-analysis-masterapp-2026-03-30.md](competitive-analysis-masterapp-2026-03-30.md)

### Epic 6: Audio & Ambiance

#### Story 6.1: Efeitos Sonoros por Turno

**Esforço:** 8h

**Conceito:**
- Player view mostra botões de efeito sonoro (espada, magia, explosão, etc.)
- Botões habilitados apenas quando é o turno do jogador
- Ao clicar: som toca no PC do mestre (via broadcast de áudio)

**Desafios técnicos:**
- WebRTC ou Web Audio API para áudio remoto
- Latência aceitável: ≤500ms
- Biblioteca de sons: Freesound.org (CC0) ou similar

---

#### Story 6.2: Lock de Áudio (1 Jogador por Vez)

**Esforço:** 4h

**Conceito:**
- Apenas o jogador do turno pode disparar efeitos sonoros
- Outros jogadores veem botões desabilitados
- Lock automático: muda com turn_advance

---

#### Story 6.3: Áudio Remoto (Som no PC do Mestre)

**Esforço:** 10h

**Conceito:**
- Jogador dispara som → broadcast para DM channel → DM client reproduz áudio
- Usando Supabase Realtime broadcast com payload de audio_id
- DM client pré-carrega biblioteca de sons no IndexedDB

---

### Epic 7: Battle Scenes & Maps

#### Story 7.1: Cenários Temáticos

**Esforço:** 15h

**Conceito:**
- Biblioteca de imagens/backgrounds temáticos (neve, floresta, masmorra, arena, taverna)
- DM seleciona cenário → background aparece na player view
- Presets com música + efeitos visuais associados

---

#### Story 7.2: Geração de Cenários

**Esforço:** 20h

**Conceito:**
- AI gera cenário baseado no contexto ("combate em floresta noturna com chuva")
- Gemini ou DALL-E para gerar imagem de fundo
- DM pode regenerar até gostar

---

### Epic 8: Hardware Kit

Venture separada — não especificada em detalhe neste documento.

**Conceito alto nível:**
- Kit: projetor compacto + cabo HDMI + suporte de mesa + app
- Preço alvo: ~R$ 2.000
- App projeta cenário + combat tracker na mesa
- Conecta via WiFi/Bluetooth com celulares dos jogadores

---

## Audit de Paridade: Free Combat ↔ Logged Combat

| Feature | Guest (/try) | Free (Logado) | Pro (Logado) | Notas |
|---------|:---:|:---:|:---:|-------|
| Combat tracker (initiative, HP, conditions) | ✅ | ✅ | ✅ | Comportamento idêntico |
| Monster stat blocks | ✅ | ✅ | ✅ | Mesmo compendium |
| Spell oracle | ✅ | ✅ | ✅ | Mesma busca |
| Items compendium | ✅ | ✅ | ✅ | Mesmo compendium |
| Condition lookup | ✅ | ✅ | ✅ | Mesma referência |
| Keyboard shortcuts | ✅ | ✅ | ✅ | Mesmo cheatsheet |
| Command palette (Cmd+K) | ✅ | ✅ | ✅ | Mesmo behavior |
| Undo de HP | ✅ | ✅ | ✅ | Mesmo stack |
| Dice roller | ✅ | ✅ | ✅ | Mesmo parser |
| Oracle AI (Gemini) | ✅ | ✅ | ✅ | Rate limited igualmente |
| Player view (QR/link) | ❌ | ✅ | ✅ | Guest é solo |
| Realtime broadcast | ❌ | ✅ | ✅ | Guest é solo |
| Campanhas persistentes | ❌ | ❌ | ✅ | Pro only |
| Salvar presets | ❌ | ❌ (visual) | ✅ | Free vê com cadeado |
| Export (PDF/JSON) | ❌ | ❌ (visual) | ✅ | Free vê com cadeado |
| Homebrew | ❌ | ❌ (visual) | ✅ | Pro only |
| Analytics de sessão | ❌ | ❌ (visual) | ✅ | Pro only |
| Persistência de dados | localStorage (60min) | Sessão (não persiste entre sessões) | Cloud (persiste sempre) | |
| Add mid-combat | ✅ (após Epic 1) | ✅ | ✅ | Mesmo behavior |
| Display name (monster) | ✅ (após Epic 1) | ✅ | ✅ | Mesmo behavior |
| Monster grouping | ✅ (após Epic 2) | ✅ | ✅ | Mesmo behavior |
| Turn notifications | ❌ (solo) | ✅ (após Epic 3) | ✅ | Requer player view |
| GM notes | ❌ | ❌ (visual) | ✅ | Pro only |
| File sharing | ❌ | ❌ (visual) | ✅ | Pro only |
| Email invites | ❌ | ❌ | ✅ | Pro only |
| CR calculator | ❌ | ❌ (visual) | ✅ | Pro only |

**Regra:** Qualquer feature disponível no Guest Mode deve funcionar idêntica no Free e Pro. A diferença é apenas em persistência e features adicionais.

---

## Dependências entre Stories

```
Story 0.1 ─────────── independente
Story 0.2 ─────────── independente
Story 0.3 ─────────── precisa Upstash account
Story 0.4 ─────────── independente
Story 0.5 ─────────── após 0.2

Story 1.1 ─────────── independente (base para 1.3)
Story 1.2 ─────────── independente
Story 1.3 ─────────── após 1.1

Story 2.1 ─────────── independente
Story 2.2 ─────────── após 2.1
Story 2.3 ─────────── após 2.1
Story 2.4 ─────────── após 2.1

Story 3.1 ─────────── independente
Story 3.2 ─────────── após 3.1
Story 3.3 ─────────── após 4.3 (convite email)
Story 3.4 ─────────── independente
Story 3.5 ─────────── após 3.4

Story 4.1 ─────────── independente
Story 4.2 ─────────── independente (precisa Supabase Storage config)
Story 4.3 ─────────── independente (precisa email service)
Story 4.4 ─────────── após 4.3
Story 4.5 ─────────── independente
Story 4.6 ─────────── independente

Story 5.1 ─────────── independente (base para 5.2-5.7)
Story 5.2 ─────────── após 5.1
Story 5.3 ─────────── após 5.2
Story 5.4 ─────────── após 5.1
Story 5.5 ─────────── após 5.1
Story 5.6 ─────────── independente (precisa Stripe account)
Story 5.7 ─────────── após 5.6
```

---

## Estimativa Total

| Sprint | Épics | Dias | Stories |
|--------|-------|------|---------|
| Sprint 1 | Epic 0 + Epic 1 | 5 dias | 8 stories |
| Sprint 2 | Epic 2 + Epic 3 | 5 dias | 9 stories |
| Sprint 3 | Epic 4 + Epic 5 | 10 dias | 13 stories |
| **Total agendado** | **Epics 0-5** | **20 dias (~4 semanas)** | **30 stories** |
| Backlog V2+ | Epics 6-7 | ~30 dias | 7 stories |
| Backlog V5 | Epic 8 | TBD | Research |

---

_Documento gerado pelos agentes BMAD em 2026-03-27. Cada story deve ser specada individualmente em `docs/quick-specs/` antes da implementação._
