# Relatorio de Auditoria QA — Taverna do Mestre

**Projeto:** projeto-rpg (Taverna do Mestre)
**Auditor:** Quinn (QA Engineer)
**Data:** 2026-03-27
**Metodo:** Revisao estatica de codigo (code-level audit) em todos os modulos criticos
**Base:** PRD V2, UX Design Specification, Cenarios GWT (qa-e2e-scenarios.md)

---

## Resumo Executivo

| Severidade | Quantidade |
|-----------|-----------|
| P0 — Critico | 5 |
| P1 — Alto | 10 |
| P2 — Medio | 16 |
| P3 — Baixo | 12 |
| **Total** | **43 findings** |

### Seguranca de Dados (Anti-Metagaming)

**APROVADO** — A sanitizacao de dados para o player view esta **correta** em todas as superficies:
- `broadcast.ts`: Monstros enviam APENAS `hp_status` (label), nunca HP/AC/DC numericos
- `join/[token]/page.tsx`: Server-side strip de HP/AC/DC para monstros
- `api/session/[id]/state/route.ts`: Polling endpoint aplica mesma sanitizacao
- `display_name` aplicado corretamente (anti-metagaming)
- HP Tiers IMMUTAVEIS: LIGHT (>70%), MODERATE (>40%), HEAVY (>10%), CRITICAL (<=10%) — **CORRETOS**

---

## P0 — CRITICOS (Corrigir Imediatamente)

### BUG-P0-001: Late-join registration error silently ignored

**Arquivo:** [PlayerJoinClient.tsx:338](components/player/PlayerJoinClient.tsx#L338)
**Cenario QA:** 5.1.3 (Late Join)

```typescript
registerPlayerCombatant(effectiveTokenId, sessionId, lateJoinDataRef.current)
  .then(() => { setIsRegistered(true); })
  .catch(() => {});  // ← ERRO SILENCIADO!
```

**Problema:** Se `registerPlayerCombatant` falhar (erro de DB, validacao, etc.), o erro e completamente ignorado. Player ve "aceito" mas nunca entra no combate. Sem toast, sem retry, sem log.

**Impacto:** Player fica em estado inconsistente. Experiencia quebrada sem feedback.

**Fix:** Adicionar catch com toast.error, captureError, e mecanismo de retry.

---

### BUG-P0-002: Invite params perdidos no reenvio de email

**Arquivo:** [sign-up-success/page.tsx:31](app/auth/sign-up-success/page.tsx#L31)
**Cenario QA:** 1.3.2 (Sign-up via Convite)

```typescript
emailRedirectTo: `${window.location.origin}/auth/confirm`,
// FALTAM: ?invite=TOKEN&campaign=CAMPAIGN_ID
```

**Problema:** Quando usuario clica "Reenviar Email" na pagina de sucesso de sign-up, os parametros de invite/campaign sao perdidos no redirect URL. Isso quebra todo o fluxo de convite.

**Impacto:** Jogadores convidados nao sao redirecionados para criacao de personagem apos confirmar email.

**Fix:** Preservar invite params no emailRedirectTo.

---

### BUG-P0-003: HP permite valor 0 no setup de combatentes

**Arquivo:** [CombatantSetupRow.tsx:142](components/combat/CombatantSetupRow.tsx#L142)
**Cenario QA:** 4.1.1 (Setup de Encontro)

```typescript
if (!isNaN(val) && val >= 0) { onHpChange(combatant.id, val); }
// DEVERIA SER: val >= 1
```

**Problema:** DM pode criar criaturas com 0 HP no pre-combate. AC tambem aceita 0 (linha 160).

**Impacto:** Criaturas com 0 HP quebram logica de combate (derrotado vs ativo).

**Fix:** Mudar para `val >= 1` em HP e AC.

---

### BUG-P0-004: Inline HP editing permite setar 0 sem marcar como derrotado

**Arquivo:** [CombatantRow.tsx:260-267](components/combat/CombatantRow.tsx#L260-L267)
**Cenario QA:** 4.2.2 (Aplicar dano)

```typescript
if (!isNaN(desired) && desired >= 0) {  // ← Permite 0
  const delta = desired - combatant.current_hp;
  if (delta < 0) onApplyDamage?.(combatant.id, Math.abs(delta));
}
```

**Problema:** DM pode setar HP para 0 via inline edit. A criatura fica com 0 HP mas NAO e marcada como derrotada. Permanece na iniciativa como "viva".

**Impacto:** Confusao de UX — criatura com 0 HP nao esta derrotada.

**Fix:** Quando HP chega a 0, oferecer auto-defeat ou alertar o DM.

---

### BUG-P0-005: Temp HP sem limite maximo

**Arquivo:** [combat-store.ts:155](lib/stores/combat-store.ts#L155)
**Cenario QA:** 4.2.5 (Temp HP)

```typescript
? { ...c, temp_hp: Math.max(c.temp_hp, value) }
// SEM LIMITE SUPERIOR
```

**Problema:** DM pode acidentalmente definir temp HP como 9.999.999 (typo). Nao ha cap de valor razoavel.

**Impacto:** Criatura se torna efetivamente imortal ate temp HP ser gasto.

**Fix:** Adicionar `Math.min(9999, Math.max(c.temp_hp, value))`.

---

## P1 — ALTOS (Corrigir no Proximo Sprint)

### BUG-P1-001: state_sync nao inclui encounter_id

**Arquivo:** [broadcast.ts:104-111](lib/realtime/broadcast.ts#L104-L111)
**Cenario QA:** 5.2.6 (Realtime sync)

**Problema:** Tipo `RealtimeStateSync` e broadcast de `session:state_sync` nao incluem `encounter_id`. Se encontro muda, player fica com ID antigo, quebrando polling fallback.

---

### BUG-P1-002: Listener de `combat:player_notes_update` ausente no Player

**Arquivo:** [PlayerJoinClient.tsx](components/player/PlayerJoinClient.tsx)
**Cenario QA:** 5.2.6

**Problema:** DM broadcasts `combat:player_notes_update` mas PlayerJoinClient nao tem listener para esse evento. Notes do jogador nao sincronizam.

---

### BUG-P1-003: Polling endpoint nao inclui player_notes

**Arquivo:** [api/session/[id]/state/route.ts:55-56](app/api/session/[id]/state/route.ts#L55-L56)
**Cenario QA:** 5.2.8 (Fallback polling)

**Problema:** SELECT do endpoint de polling nao busca `player_notes`. Jogadores em polling fallback nao recebem notas atualizadas.

---

### BUG-P1-004: Senha nao e limpa apos erro de login

**Arquivo:** [login-form.tsx:54](components/login-form.tsx#L54)
**Cenario QA:** 1.2.2 (Login com senha incorreta)

**Problema:** Apos falha de login, campo de senha mantem o valor. Deveria limpar para seguranca e UX.

---

### BUG-P1-005: Sem confirmacao de senha no update-password

**Arquivo:** [update-password-form.tsx:66-77](components/update-password-form.tsx#L66-L77)
**Cenario QA:** 1.2.4 (Recuperacao de senha)

**Problema:** Formulario de atualizar senha tem apenas UM campo. Sem campo de confirmacao = typos nao detectados.

---

### BUG-P1-006: Turno avanca round incorretamente com 1 combatente

**Arquivo:** [combat-store.ts:85-101](lib/stores/combat-store.ts#L85-L101)
**Cenario QA:** 4.2.1 (Avancar turno)

**Problema:** Com apenas 1 combatente ativo, cada avancar turno incrementa o round. Deveria manter o mesmo round.

---

### BUG-P1-007: Sem validacao de sessao antes de update de senha

**Arquivo:** [update-password-form.tsx:39](components/update-password-form.tsx#L39)
**Cenario QA:** 1.2.4

**Problema:** Nenhuma verificacao se o usuario esta autenticado ou se o token de reset e valido antes de tentar atualizar a senha.

---

### BUG-P1-008: Mensagens de erro hardcoded (i18n) no wizard Step 3

**Arquivo:** [OnboardingWizard.tsx:168,172](components/dashboard/OnboardingWizard.tsx#L168)
**Cenario QA:** 2.1.6 (Step 3 Criar Encontro)

**Problema:** Mensagens de validacao em ingles hardcoded em vez de usar chaves de traducao.

---

### BUG-P1-009: Login nao verifica se onboarding foi completado

**Arquivo:** [login-form.tsx:50](components/login-form.tsx#L50)
**Cenario QA:** 1.2.1 (Login valido)

**Problema:** Apos login bem-sucedido, SEMPRE redireciona para `/app/dashboard`. Deveria verificar se DM novo precisa do onboarding.

---

### BUG-P1-010: SpellBrowser sem virtualizacao no desktop

**Arquivo:** [SpellBrowser.tsx:364](components/compendium/SpellBrowser.tsx#L364)
**Cenario QA:** 7.1.2 (Buscar magia)

**Problema:** Lista de magias no desktop renderiza TODOS os resultados sem virtualizacao (react-window). MonsterBrowser usa virtualizacao, SpellBrowser nao. Performance degrada com 100+ resultados.

---

## P2 — MEDIOS

| ID | Bug | Arquivo | Cenario |
|----|-----|---------|---------|
| P2-001 | Email nao normalizado (trim/lowercase) no sign-up e login | sign-up-form.tsx, login-form.tsx | 1.1.1, 1.2.1 |
| P2-002 | Sem feedback visual de requisitos de senha | sign-up-form.tsx | 1.1.4 |
| P2-003 | Sem checagem de membership duplicada em invite | invite/[token]/page.tsx | 1.3.1 |
| P2-004 | parseInt() retorna NaN para campos vazios no wizard | OnboardingWizard.tsx:110-112 | 2.1.4 |
| P2-005 | playerIdCounter global (colisao em testes) | OnboardingWizard.tsx:31 | 2.1.4 |
| P2-006 | Sem foco automatico entre steps do wizard | OnboardingWizard.tsx | 2.1.2 |
| P2-007 | Grid 2-col no Step 2 nao responsivo em mobile | OnboardingWizard.tsx:477 | 2.1.4 |
| P2-008 | Max HP reduzido silenciosamente cap current HP | combat-store.ts:187-190 | 4.3.4 |
| P2-009 | Group initiative nao propaga para membros individuais | MonsterGroupHeader.tsx:71-77 | 4.3.3 |
| P2-010 | Broadcast envia max_hp stale apos stats update | useCombatActions.ts:109,123,137 | 4.2.2 |
| P2-011 | player_notes usado como token ID (fragil) | EncounterSetup.tsx:179-200 | 5.1.3 |
| P2-012 | Polling interval nao limpo ao reconectar realtime | PlayerJoinClient.tsx:471-476 | 5.2.8 |
| P2-013 | Late-join HP pode ser null | player-registration.ts:161 | 5.1.3 |
| P2-014 | CampaignManager: edit otimista sem revert on error | CampaignManager.tsx:126-127 | 3.1.2 |
| P2-015 | current_hp pode exceder max_hp apos edicao | PlayerCharacterManager.tsx:155-157 | 3.1.3 |
| P2-016 | Sem validacao de dados corrompidos no guest import | GuestDataImportModal.tsx:40 | 6.1.3 |

---

## P3 — BAIXOS

| ID | Bug | Arquivo |
|----|-----|---------|
| P3-001 | Sem limite de char no nome de campanha no DB (frontend 50, DB ilimitado) | migrations/001_initial_schema.sql |
| P3-002 | Sem limite de 8 players no DB (so frontend) | migrations/001_initial_schema.sql |
| P3-003 | Sem tecla Enter no Step 2 do wizard (inconsistente com Steps 1/3) | OnboardingWizard.tsx |
| P3-004 | Mensagens de erro de invite hardcoded em portugues | invite/[token]/page.tsx:32,46,59 |
| P3-005 | Sem texto de loading no botao de aceitar invite | InviteAcceptClient.tsx:145 |
| P3-006 | HP/AC validacao minima no aceitar invite (aceita 99999) | InviteAcceptClient.tsx:49-52 |
| P3-007 | Sem cache expiration no IndexedDB SRD | srd-cache.ts |
| P3-008 | Sem indicador offline no compendium | compendium/ |
| P3-009 | Sem rate limiting em criacao de campanha | OnboardingWizard.tsx |
| P3-010 | Sem estado explicito "todos derrotados" no combate | combat-store.ts:89-96 |
| P3-011 | aria-describedby nao linkado a campos invalidos no wizard | OnboardingWizard.tsx:663-667 |
| P3-012 | Sem validacao de duplicidade de nome de campanha | CampaignManager.tsx |

---

## Validacoes que PASSARAM

| Area | Status | Detalhe |
|------|--------|---------|
| Anti-metagaming (HP) | APROVADO | Monstros: apenas hp_status label no player view |
| Anti-metagaming (AC/DC) | APROVADO | AC e spell_save_dc removidos para monstros |
| Anti-metagaming (display_name) | APROVADO | display_name aplicado no broadcast, nome real escondido |
| HP Tiers | APROVADO | LIGHT >70%, MODERATE >40%, HEAVY >10%, CRITICAL <=10% |
| HP Tier colors | APROVADO | green-500, amber-400, red-500, gray-900 |
| GM Notes isolamento | APROVADO | dm_notes NUNCA enviado no broadcast |
| Turn notifications | APROVADO | "E sua vez" e "Voce e o proximo" funcionam corretamente |
| Reconnection/Polling | APROVADO | Backoff exponencial ate 30s, polling fallback apos 3s |
| SyncIndicator | APROVADO | 3 estados visuais (conectado/conectando/desconectado) |
| Accessibility (player view) | APROVADO | aria-roles, aria-live, role="alertdialog", progressbar |
| Timer guest mode | APROVADO | 60min com urgencia aos 10min |
| SRD dual version | APROVADO | 2014 + 2024 suportados em todas as buscas |

---

## Recomendacoes de Prioridade

### Sprint Imediato (P0)
1. Fix `.catch(() => {})` no late-join registration
2. Fix invite params no reenvio de email
3. Fix HP/AC validacao `>= 0` para `>= 1`
4. Fix inline HP zero sem auto-defeat
5. Add temp HP max cap

### Proximo Sprint (P1)
6. Add encounter_id ao state_sync
7. Add listener player_notes_update
8. Fix polling endpoint SELECT
9. Add confirmacao de senha
10. Fix round increment com 1 combatente

### Backlog (P2-P3)
11-43. Demais items conforme tabelas acima

---

## Proximos Passos

1. **Agente de navegador:** Usar `qa-e2e-scenarios.md` para executar cenarios GWT no browser
2. **Regressions:** Focar nos cenarios 4.2.2, 5.1.3, 1.3.2 que tem bugs P0
3. **Coverage:** Os 43 findings cobrem 10 modulos do sistema; apos fix dos P0, re-rodar auditoria

---

*Relatorio gerado por Quinn (QA Engineer) — Auditoria code-level completa.*
