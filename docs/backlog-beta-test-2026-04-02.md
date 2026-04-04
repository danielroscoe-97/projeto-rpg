# Backlog — Beta Test Sessão #1 (2026-04-02)

> Feedback coletado durante primeira sessão de beta test presencial.
> 20+ itens identificados, categorizados em 4 trilhas independentes.
> **Stress-tested** com análise arquitetural profunda — root causes confirmados.
> Referência: [sprint-plan-2026-03-31.md](sprint-plan-2026-03-31.md) | [epics-and-sprints-spec.md](epics-and-sprints-spec.md) | [bucket-future-ideas.md](bucket-future-ideas.md)
>
> ---
> ## Status Geral — Atualizado 2026-04-03
>
> | Trilha | Status | Pendencias |
> |--------|--------|------------|
> | **A — Combat Core** | ✅ A.1-A.8 DONE | Nenhuma |
> | **B — Combat Display** | ✅ B.0, BT-06 a BT-12, BT-21 DONE | Nenhuma — verificado 2026-04-04 |
> | **C — Player Agency** | ✅ C.13-C.15 DONE | Nenhuma |
> | **D — Social/Login** | ✅ BT-16 a BT-20 DONE | Nenhuma (F-37 a F-42 implementados) |

---

## Arquitetura de Auth — Contexto para Decisões

O app opera com **dual auth model**:

| Aspecto | Anonymous (`/join`) | Autenticado (`/invite`) |
|---------|---------------------|------------------------|
| Como entra | Link do DM → `signInAnonymously()` | Login Supabase → convite campanha |
| Session persistence | Cookie Supabase (anon session) | Cookie Supabase (auth session) |
| Reconexão F5 | ✅ Se cookie existir → reclama token via `anon_user_id` | ✅ Mais robusto — user persistente |
| Cookie perdido | ⚠️ Novo anon user → DM precisa aprovar rejoin | ✅ Mesmo user, reconecta direto |
| Dados persistentes | Só `player_name` + `anon_user_id` | Tudo — personagem, campanha, histórico |
| Features avançadas | ❌ Sem ratings, notas, spell slots | ✅ Tudo possível |

**Regra**: Login NÃO é obrigatório pro combate funcionar. MAS É obrigatório pras features sociais/persistentes.

---

## Trilhas de Trabalho (Paralelizáveis)

### TRILHA A — Combat Core: Session, Reconnection & State Machine (CRÍTICO)

> Pré-requisito pra tudo. Sem isso, o combate multiplayer não funciona na mesa.
> **Sem dependência** de Trilha B. Pode rodar 100% em paralelo.
> **Decisão**: Fix arquitetural completo (state machine), não patch.

#### A.1 — Coordenação Polling/Realtime (State Machine)

**Status:** ✅ DONE — State machine implementada (CONNECTED/RECONNECTING/POLLING_FALLBACK)
**Verificado em:** 2026-04-03 — Auditoria completa dos 7 criterios de DoD
**Commits:** `a63dd7c` (Trilha A core), `51c67ae` (resilient reconnection)
**Impacto original:** BLOCKER — causa duplicação, flickering, estados revertidos
**Arquivos:** `components/player/PlayerJoinClient.tsx` (linhas 500-542)

**Problemas encontrados no stress test:**
1. Quando WebSocket desconecta e reconecta, polling E realtime ficam ativos simultaneamente
2. `fetchFullState()` e `createChannel()` são chamados em paralelo no visibility handler (linha 868-882) — sem coordenação
3. HP delta animation pode disparar 2x (uma do broadcast, outra do polling)
4. Death save audio/vibração pode tocar 2x
5. Turn-sync polling (cada 3s) pode disparar ENTRE broadcasts rápidos
6. Polling não tem backoff exponencial — se API estiver lenta, acumula requests
7. Polling não desabilita durante late-join "waiting"

**Fix requerido:**
- State machine com estados: `CONNECTED` → `RECONNECTING` → `POLLING` → `CONNECTED`
- Suprimir polling quando realtime está `SUBSCRIBED`
- Await `fetchFullState()` ANTES de reconnectar channel no visibility handler
- Desabilitar polling durante late-join status "waiting"
- Backoff exponencial no polling (2s → 4s → 8s → max 30s)

---

#### A.2 — Dedup em `combatant_add` Handler

**Status:** ROOT CAUSE CONFIRMADO — blind append sem checar ID
**Impacto:** ALTO — causa duplicação de jogadores na visão do player
**Arquivo:** `components/player/PlayerJoinClient.tsx:548`

**Código atual (BUGADO):**
```typescript
.on("broadcast", { event: "combat:combatant_add" }, ({ payload }) => {
  if (payload.combatant) {
    updateCombatants((prev) => [...prev, payload.combatant]); // BLIND APPEND!
  }
})
```

**Fix requerido:**
```typescript
updateCombatants((prev) => {
  if (prev.some(c => c.id === payload.combatant.id)) return prev; // DEDUP
  return [...prev, payload.combatant];
});
```

---

#### A.3 — Broadcast `session:ended`

**Status:** FEATURE FALTANTE — players não recebem nada quando DM encerra
**Impacto:** ALTO — players ficam em polling infinito contra sessão morta
**Decisão:** Adicionar agora (blocker pro beta test)

**Fix requerido:**
- Novo evento `session:ended` broadcast quando DM encerra combate/sessão
- Player recebe → mostra UI "Sessão encerrada" com opção de ver resumo
- Limpar todos os intervals/timers de polling

---

#### A.4 — Late-Join State Machine Recovery

**Status:** ROOT CAUSE CONFIRMADO — estado "timeout" sem recovery
**Impacto:** ALTO — player fica preso, só F5 resolve
**Arquivo:** `components/player/PlayerJoinClient.tsx:1044-1091`

**Problemas:**
1. Timeout de 2min é hardcoded, sem retry
2. Race condition: DM aceita entre 15s-120s → status pode ser sobrescrito
3. Se broadcasts chegam fora de ordem, `registerPlayerCombatant()` nunca é chamado

**Fix requerido:**
- Botão "Tentar novamente" no estado timeout
- Guard contra overwrite de status "accepted" pelo timer
- Validação de ordem dos broadcasts

---

#### A.5 — Session Persistence no Refresh (F5)

**Status:** ROOT CAUSE PARCIAL — múltiplos caminhos de falha
**Impacto:** BLOCKER
**Arquivos:** `PlayerJoinClient.tsx:981-1039`, `player-registration.ts:304-347`

**Problemas encontrados:**
1. Cookie anon auth perdido em modo incógnito / browsers mobile restritivos
2. `rejoinAsPlayer()` transferência de token não é atômica — update sem verificar resultado
3. Dois devices rejoinando mesmo player simultaneamente → último ganha, primeiro perde acesso
4. `last_seen_at` não é refreshed em sessões existentes → tracking desatualizado
5. Death save optimistic protection expira (5s) durante background → overwrite com dados stale

**Flows de Reconexão Existentes:**

```
1. SAME-DEVICE RECONNECT (cookie existe)
   Page load → PlayerJoinClient mounts
   → supabase.auth.getSession() restaura anon session
   → claimPlayerToken(masterTokenId, existingAnonUserId)
   → Retorna mesmo tokenId + playerName
   → isRegistered = true → subscribe realtime

2. COOKIE-LOST REJOIN (lobby/inactive)
   → signInAnonymously() → novo anonUserId
   → rejoinAsPlayer(sessionId, playerName, newAnonUserId)
   → Transferência atômica de ownership do token
   → Reconecta sem aprovação do DM

3. COOKIE-LOST REJOIN (combat active)
   → signInAnonymously() → novo anonUserId
   → broadcast combat:rejoin_request ao DM
   → DM aprova → combat:rejoin_response
   → Player reconecta

4. LATE JOIN (novo player durante combate)
   → broadcast combat:late_join_request
   → 15s timeout → fallback pra polling
   → 2min max timeout → mostra erro

5. REALTIME FALLBACK
   → WebSocket desconecta >3s → ativa polling
   → Mobile: poll cada 5s / Desktop: cada 2s
   → Visibility change: fetch full state imediato
```

---

#### A.6 — Auto-Join Players via Invite Link

**Status:** CONFIRMADO — precisa investigar mount flow
**Impacto:** BLOCKER
**Arquivo:** `PlayerJoinClient.tsx` mount flow, `claimPlayerToken()`

**Investigar:** flow de auto-join quando DM inicia combate com players já conectados pelo link.

---

#### A.7 — Group Rename Durante Combate

**Status:** ROOT CAUSE CONFIRMADO — handler de rename NÃO EXISTE na fase de combate
**Impacto:** MÉDIO — rename silenciosamente falha durante combate ativo

**Root cause:** `handleDisplayNameChange` (com lógica de group propagation) SÓ existe em `GuestEncounterSetup` (linhas 346-380). Durante combate, o handler é `handleUpdateStats` (linhas 1062-1066) que **não aceita `display_name`**.

**Bugs adicionais:**
- Index mismatch: setup usa 1-indexed, mid-combat add usa 0-indexed para `group_order`
- `hydrateCombatants` sobrescreve array inteiro (não atômico) → race com HP updates
- Regex `/\s+(\d+)$/` falha com nomes ambíguos ("Zombie 13 2")

**Fix requerido:**
- Mover `handleDisplayNameChange` pra fora do setup (phase-agnostic)
- OU: adicionar `display_name` ao `handleUpdateStats` type signature
- Normalizar indexação `group_order` (sempre 1-indexed)

---

#### A.8 — Group Ficha Click (Monstros Manuais + Propagação)

**Status:** ROOT CAUSE CONFIRMADO — monstros manuais têm `monster_id: null` → click inerte. **Hipótese adicional confirmada em sessão:** monstros SRD em grupo também apresentaram click morto — pode haver bug adicional no group header independente do `monster_id`.
**Impacto:** ALTO — DM não consegue ver stats de nenhum monstro em grupo (manual ou SRD)

**Root cause:** `CombatantRow.tsx:150-155`:
```typescript
const canExpand = fullMonster !== undefined;
// monster_id null → getMonsterById retorna undefined → canExpand = false → click morto
```

**Bugs adicionais:**
- MonsterGroupHeader onClick não tem `stopPropagation()` → click no filho pode colapsar grupo
- AnimatePresence exit (150ms) pode desmontar child durante click
- Keyboard handler no name row não tem `stopPropagation()` → propaga pro group header

**Fix requerido:**
- Permitir sheet parcial para monstros sem `monster_id` (mostra HP, AC, conditions, notes)
- Adicionar `e.stopPropagation()` no header onClick
- Debounce no group toggle pra evitar re-toggle rápido

---

### TRILHA B — Combat Display: UI Pura (URGENTE)

> Componentes visuais sem dependência de infra/realtime.
> **100% paralela** com Trilha A.

#### B.0 — Extrair HP_STATUS_STYLES pra Shared (PRÉ-REQUISITO)

**Status:** ✅ DONE — Duplicacao removida, `PlayerInitiativeBoard` importa de `hp-status.ts`
**Impacto:** Pré-req para BT-06 (FULL tier) — sem isso, precisa atualizar em 2 lugares
**Fix:** Centralizar estilos em `lib/utils/hp-status.ts`, importar em ambos clients

---

| # | Tipo | Item | Descrição Detalhada | Impacto | Guest? |
|---|------|------|---------------------|---------|--------|
| BT-06 | ✅ DONE | Tier "FULL" no HP status | Adicionar FULL (100% HP) acima de LIGHT. `FULL/LIGHT/MODERATE/HEAVY/CRITICAL`. Atualizar `hp-status.ts` (tipo, getHpStatus, getHpBarColor, getHpThresholdKey). | ALTO | ✅ Guest + Auth |
| BT-07 | ✅ DONE | Mostrar AC e Save DC | AC só aparece pro próprio char do player. Spell Save DC ausente em toda a player view. `broadcast.ts:109` strip spell_save_dc dos monsters. Precisa: (1) mostrar DC do próprio char em PlayerBottomBar, (2) DM vê AC/DC de todos — player vê **apenas os próprios** (aliados não exibem AC/DC). | ALTO | ✅ Guest + Auth |
| BT-08 | ✅ DONE | % exato de HP | HP % é calculado mas só usado pra largura da barra. Adicionar label texto "45%" ao lado do tier badge. **Fix (2026-04-02):** `PlayerJoinClient.tsx:737` não propagava `hp_percentage` no store update de `combat:hp_update` para monstros. `HpStatusBadge` já renderizava `· {pct}%` quando disponível. Corrigido + guard: tier FULL não exibe %. Guest parity: N/A (DM vê HP exato, sem badge). | MÉDIO | ✅ Auth/Anon (realtime) |
| BT-09 | ✅ DONE | Header sticky turno atual/próximo | Nenhuma view tem sticky no turn indicator durante combate ativo. Adicionar `sticky top-0 z-30` no turn display. | ALTO | ✅ Guest + Auth |
| BT-10 | ✅ DONE | Visual "crítico" sombreado | Participantes em CRITICAL ficam opacity-50 + desaturate. Feedback visual de urgência. | BAIXO | ✅ Guest + Auth |
| BT-11 | ✅ DONE | Log de danos separado | **Completado 2026-04-03:** CombatActionLog wired em CombatSessionClient (DM auth), GuestCombatClient (DM guest), PlayerInitiativeBoard (player com filtro por `playerId`). ScrollText button no sticky header. Tabs all/damage. Parity verificada. | MÉDIO | ✅ Guest + Auth |
| BT-12 | ✅ DONE | Legendary Actions counter | **Completado 2026-04-03:** UI dots em CombatantRow + auto-detect SRD (`getLegendaryActionCount`) + manual override no StatsEditor + reset automático por rodada + Guest parity (handleUpdateStats atualizado). Anti-metagaming: stripped em `sanitizeCombatant`. | MÉDIO | ✅ Guest (DM feature) |
| BT-21 | ✅ DONE | Monster groups na player view | Players veem agrupamento visual como o DM (collapsed groups com expand). Anti-metagaming respeitado. | ALTO | ✅ Guest + Auth |

---

### TRILHA C — Player Agency (depende de Trilha A estável)

> Features que requerem interação player→DM funcional.
> **Depende** de session persistence estável (Trilha A).
> **Stories criadas:** 2026-04-02

| # | Tipo | Item | Descrição Detalhada | Impacto | Guest? | Story |
|---|------|------|---------------------|---------|--------|-------|
| BT-13 | 🟡 FEAT | Player HP Self-Management | Player controla próprio HP (dano + cura + temp HP). Sempre disponível. Tudo logado com `(self-report)` pra auditoria. 8 SP. | ALTO | ⚠️ Anon funciona, Auth ideal | [C13](stories/C13-player-damage-report.md) |
| BT-14 | 🟢 FEAT | Aba de Spells no combate | Dialog com PlayerSpellBrowser (search, filtros, SpellCard). Reutiliza useSrdStore. **Zero dependência de A/B.** | ALTO | ✅ Guest + Auth (read-only) | [C14](stories/C14-spells-tab-combat.md) |
| BT-15 | 🟢 FEAT | Enquete pós-combate | Leaderboard na player view + enquete de dificuldade (5 opções). Inclui persistência no DB. Depende de A.3. | ALTO | ⚠️ Anon pode votar, Auth persiste | [C15](stories/C15-post-combat-poll.md) |

---

### TRILHA D — Social & Login Features (BUCKET FUTURO)

> Requer auth obrigatório funcional. Priorizar APÓS trilhas A-C.

| # | Tipo | Item | Descrição Detalhada | Impacto | Guest? |
|---|------|------|---------------------|---------|--------|
| BT-16 | 🟢 FEAT | Spell rating (1-5 estrelas) | Players logados votam magias pra tier list. | MÉDIO | ❌ Só Auth |
| BT-17 | 🔵 FEAT | Notas dos players no combate | Anotações da sessão, visíveis pro DM e player. | MÉDIO | ❌ Só Auth |
| BT-18 | 🔵 FEAT | Spell slots tracker | Bolinhas marcáveis por nível. | BAIXO | ❌ Só Auth |
| BT-19 | 🔵 FEAT | Chat privado players + post-its DM | Chat players-only + DM note-taking. | BAIXO | ❌ Só Auth |
| BT-20 | 🔵 FEAT | Quest/objectives board | Quests compartilhadas, editável por DM e players. | BAIXO | ❌ Só Auth |

---

## Mapa de Dependências

```
TRILHA A (Core) ──────┐
                      ├──→ TRILHA C (Player Agency)
TRILHA B (UI) ────────┘         │
  (100% paralela)               ▼
                          TRILHA D (Social/Login)
                          (futuro, pós-estabilização)
```

## Ordem de Execução — Trilha A

```
A.1 Polling/Realtime State Machine ──┐
A.2 Dedup combatant_add             │──→ A.5 Session Persistence (F5)
A.3 Session:ended broadcast         │         │
A.4 Late-join recovery              ┘         ├──→ A.6 Auto-join
                                              │
A.7 Group rename (combat phase) ──────────────┘
A.8 Group ficha click (manual monsters)
```

## Ordem de Execução — Trilha B

```
B.0 Extrair HP_STATUS_STYLES ──→ B.06 Tier FULL
                                    │
B.07 AC/Save DC ────────────────────┤
B.08 HP % texto ────────────────────┤──→ (independentes)
B.09 Sticky header ─────────────────┤
B.10 Visual crítico ────────────────┘
B.11 Log de danos
B.12 Legendary Actions
B.21 Monster groups player view
```

## Ordem de Execução — Trilha C

```
C.14 Spells tab (ZERO dependência) ──→ pode iniciar imediatamente

           ┌── Trilha A estável ──┐
           │                      │
C.13 Player damage report ────────┤  (depende de A.1 + A.2)
           │                      │
C.15 Enquete pós-combate ─────────┘  (depende de A.3 session:ended)
     └── inclui: leaderboard na player view
```

## Regra de Parity: Guest vs Auth

> **REGRA IMUTÁVEL**: Toda alteração em combat experience DEVE ser avaliada:
> 1. Funciona no guest (`/try`)? → Implementar lá também
> 2. Funciona no anônimo (`/join`)? → Implementar lá também
> 3. Só funciona com login? → Documentar como Auth-only e adicionar na Trilha D

## Parity Gaps Descobertos no Review

| Dimensão | Guest (`/try`) | Player (`/join`) | Gap |
|----------|---------------|------------------|-----|
| Monster Groups | ✅ Visual com expand/collapse | ❌ Lista flat | **FEATURE GAP — BT-21** |
| HP Display | Full bar pra todos | Status badge pra outros | Esperado (anti-metagaming) |
| AC/Save DC | ✅ Visível no DM view | ⚠️ AC só do próprio char, DC ausente | **FEATURE GAP — BT-07** |
| HP % texto | ❌ Nenhum | ❌ Nenhum | Ambos faltam — BT-08 |
| FULL tier | ❌ Não existe | ❌ Não existe | Ambos faltam — BT-06 |
| Sticky header | ❌ Não existe | ❌ Não existe | Ambos faltam — BT-09 |
| Dedup combatant_add | N/A (local state) | ❌ Blind append | **BUG — A.2** |
| Code sharing | ~15% shared | ~15% shared | Alto risco manutenção |
| HP_STATUS_STYLES | Importa de hp-status.ts | Hardcoded duplicado | **TECH DEBT — B.0** |

---

## Métricas de Sucesso — Próximo Beta Test

- [ ] Player entra pelo link e está no combate automaticamente
- [ ] Player dá F5 e volta pro combate sem intervenção do DM
- [ ] Turnos rápidos não duplicam jogadores
- [ ] DM consegue abrir ficha de monstro em grupo (manual e SRD)
- [ ] Rename de criatura propaga pra todo grupo durante combate
- [ ] HP mostra FULL/LIGHT/MODERATE/HEAVY/CRITICAL + %
- [ ] AC e Save DC visíveis na tela de combate
- [ ] Header sticky com turno atual/próximo
- [ ] Quando DM encerra sessão, players recebem notificação
- [ ] Late-join tem botão de retry se timeout
- [ ] Monster groups visíveis na player view
- [ ] Zero desconexões não-intencionais durante toda a sessão

---

> **Criado:** 2026-04-02 — Beta Test Sessão #1
> **Stress-tested:** 2026-04-02 — Review arquitetural com root cause analysis
> **Auditoria completa:** 2026-04-03 — Verificacao de TODOS os items, build, parity, reconnection
> **Revisado por:** Dani_ + BMAD Party Mode (John, Bob, Mary, Winston, Quinn)
> **Proxima revisao:** Pre-beta test sessao #2
>
> ### Resultado da Auditoria 2026-04-03
>
> - **Build:** `next build` passa com 0 erros, 0 warnings
> - **Parity Guest/Anon/Auth:** ✅ PHQ e 100% aditivo (novos componentes em `/components/player-hq/`). Zero alteracoes em combat files compartilhados.
> - **Reconnection Spec:** ✅ 7/7 items obrigatorios presentes e funcionais apos todos os PHQ commits.
> - **Migrations:** 16 migrations no repo (056-071). Verificar aplicacao em producao via Supabase Dashboard.
> - **Pendencias:** B.11 (damage log — parcial), B.12 (legendary actions — parcial). Documentados no bucket.
