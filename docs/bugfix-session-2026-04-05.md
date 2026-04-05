# Bugfix Session — 2026-04-05

## Bugs Corrigidos

### BUG-1 — Google OAuth não redirecionava para área logada
- **Arquivo:** `components/auth/GoogleOAuthButton.tsx:43`
- **Sintoma:** Google consent completa mas app não redireciona — usuário fica preso no loop de login
- **Causa:** `redirectTo` padrão apontava para `/app/dashboard` (rota protegida) em vez de `/auth/confirm` (rota que troca o `?code=` por sessão via `exchangeCodeForSession()`)
- **Fix:** `redirectTo ?? ${origin}/auth/confirm`
- **Status:** Já estava commitado antes da sessão

### BUG-2 — "Combate Rápido" levava usuário logado para /try (guest mode)
- **Arquivo:** `app/page.tsx:196`, `app/page.tsx:938`
- **Sintoma:** Usuário logado clica "Combate Rápido" na landing e vai para o modo visitante
- **Causa:** `href="/try"` hardcoded — texto mudava com `isLoggedIn` mas href não
- **Fix:** `href={isLoggedIn ? "/app/session/new?quick=true" : "/try"}`
- **Status:** Já estava commitado antes da sessão

### BUG-3 — Botão de travar posição da carta sumia ao clicar na tela
- **Arquivo:** `components/oracle/FloatingCardContainer.tsx:434`, `:464`
- **Sintoma:** Carta travada (🔒) desaparecia ao clicar fora dela
- **Causa:** `handleClickOutside` e handler do Escape não checavam `isLocked` antes de fechar a carta topmost
- **Fix:** `cards.filter((c) => !c.isMinimized && !c.isLocked)` — cartas travadas imunes a click-fora e Escape
- **Status:** Já estava commitado antes da sessão

### BUG-4 — Jogadores da campanha não apareciam na lista de iniciativa
- **Arquivo:** `app/app/session/new/page.tsx:117`, `components/combat/EncounterSetup.tsx:150`
- **Sintoma:** Ao criar combate a partir de uma campanha, nenhum jogador aparecia na iniciativa
- **Causa:** `handlePickCampaign` só buscava `player_characters` — membros sem ficha eram ignorados
- **Decisão de design:** Adicionar todos os membros ativos (`role=player`, `status=active`), não só os com ficha
- **Fix:**
  - Busca `player_characters` + `campaign_members` em paralelo
  - Cruza pelo `user_id`: membro com ficha → usa dados da ficha; sem ficha → placeholder com nome do usuário
  - Placeholder: `id = __placeholder__{user_id}`, HP=0, AC=0 (DM edita no setup)
  - `EncounterSetup` detecta prefix `__placeholder__` e seta `player_character_id: null`
- **Commit:** `feat(campaign): auto-add all campaign members to initiative list`
- **Status:** Deployado em 2026-04-05

---

## Bugs de Playtest — Sprint 2 (commit `a0839e0` + `05b81dc`)

### B1 — Popup de magias do player carregava infinitamente

- **Arquivo:** `app/join/[token]/page.tsx`
- **Sintoma:** Player clicava no botão de magia dentro do combate e o popup ficava em loading infinito
- **Causa:** `SrdInitializer` (o componente que popula o Zustand store de SRD com os dados de magias e monstros) só era montado no layout autenticado `/app/app/layout.tsx`. Rotas de player anônimo (`/join/[token]`) nunca inicializavam o store → o array de magias ficava vazio → o spinner nunca parava
- **Fix:** Adicionar `<SrdInitializer />` na página `/join/[token]/page.tsx`, envolto em Fragment com o `<PlayerJoinClient />`
- **Parity check:** Guest mode (`/try`) usa GuestCombatClient que já chama SrdInitializer; Auth (`/invite`) usa o layout autenticado. Fix aplica apenas ao modo Anônimo

### B2 — `conditions.blessed` aparecia como chave i18n bruta na tela do player

- **Arquivos:** `messages/en.json`, `messages/pt-BR.json`
- **Sintoma:** Condições benéficas como `blessed`, `flying`, `haste`, `heroism`, `inspired`, `raging` mostravam a chave bruta `conditions.blessed` em vez do texto traduzido
- **Causa:** `ConditionBadge.tsx` faz `t(condition.toLowerCase())` no namespace `"conditions"`. As 6 condições benéficas que os jogadores podem aplicar em si mesmos não tinham entrada na seção `"conditions"` dos arquivos de mensagem — só as condições de status de combate padrão (D&D) estavam lá
- **Fix:** Adicionar as 6 traduções ausentes em `messages/en.json` e `messages/pt-BR.json`:
  - `blessed` → "Blessed" / "Abençoado"
  - `flying` → "Flying" / "Voando"
  - `haste` → "Haste" / "Acelerado"
  - `heroism` → "Heroism" / "Heroísmo"
  - `inspired` → "Inspired" / "Inspirado"
  - `raging` → "Raging" / "Furioso"

### B3 — Condições sumiam na visão do player após alguns segundos

- **Arquivo:** `components/player/PlayerJoinClient.tsx`
- **Sintoma:** Player aplicava uma condição em si mesmo (ex: `blessed`), ela aparecia, mas sumia ~10-30s depois
- **Causa:** `fetchFullState` (polling a cada 10-30s) chamava `updateCombatants(data.combatants)` sobrescrevendo o estado local com dados do servidor. O servidor pode ter dado de condição ligeiramente desatualizado se o write do DB ainda não completou dentro da janela de polling. Não havia guard para proteger o estado otimista
- **Fix:** Adicionar `conditionOptimisticRef` (timestamp `number`) em `PlayerJoinClient`. No handler de `combat:condition_change`, gravar `Date.now()`. Em `fetchFullState`, antes de aplicar dados do servidor ao combatente local, checar se `Date.now() - conditionOptimisticRef.current < 5000` — se sim, preservar `conditions` e `condition_durations` do estado local em vez de sobrescrever com dados do servidor

### B4 — Botão de fechar do log de combate não funcionava na tela do DM

- **Arquivo:** `components/combat/CombatActionLog.tsx`
- **Sintoma:** Clicar no X do painel lateral do log de combate não fechava o painel
- **Causa:** A navbar é `fixed top-0 z-50`. O painel do log de combate também era `z-50 fixed top-0`. Com o mesmo z-index no mesmo stacking context, a navbar renderizava sobre o cabeçalho do painel → botão de fechar bloqueado pelo elemento da navbar
- **Fix:** Aumentar z-index do backdrop para `z-[55]` e do painel para `z-[60]`, garantindo que o painel fique acima da navbar

### B5 — Indicador de criatura crítica piscava muito agressivamente

- **Arquivo:** `components/combat/CombatantRow.tsx`, `app/globals.css`
- **Sintoma:** Criatura com HP crítico (≤10%) pulsava visualmente em loop muito chamativo, distraindo durante o combate
- **Causa:** Tailwind `animate-pulse` oscila opacidade de 1 para 0.5 em 2s — variação de 50% é extremamente agressiva para um indicador persistente
- **Fix:** Criar animação CSS customizada `animate-critical-glow` com:
  - Duração 3.5s (quase 2× mais lenta)
  - Variação de opacidade apenas 18% (1.0 → 0.82), sutil
  - Guard `prefers-reduced-motion: reduce` que desativa a animação para usuários com sensibilidade a movimento

### B6 — Combat Recap ("Spotify Wrapped") não aparecia para jogadores

- **Arquivos:** `components/session/CombatSessionClient.tsx`, `components/player/PlayerJoinClient.tsx`, `lib/types/realtime.ts`
- **Sintoma:** Ao final do combate, o DM via o Combat Recap completo (com awards, rankings, narrativas), mas os players só viam um leaderboard simplificado (`CombatLeaderboard`) sem os slides, prêmios ou narrativas
- **Causa:** O DM só fazia broadcast de `session:combat_stats` (array de `CombatantStats[]`) — usado pelo leaderboard. O objeto completo `CombatReport` (com `awards`, `rankings`, `narratives`) nunca era broadcastado
- **Fix:**
  1. Em `CombatSessionClient`, após broadcast de `session:combat_stats`, construir `playerSafeReport` aplicando `display_name` anti-metagaming (substituir nomes reais de monstros pelo `display_name` configurado), e fazer broadcast de `session:combat_recap` com o report completo
  2. Em `PlayerJoinClient`, adicionar listener para `session:combat_recap` que seta `combatRecapReport` state
  3. Na renderização, quando `combatRecapReport` está disponível, renderizar `<CombatRecap />` em vez de `<CombatLeaderboard />`
  4. Adicionar interface `RealtimeCombatRecap` e tipo em `RealtimeEvent` + `SanitizedEvent` unions

### B7 — Death saves sumiam na visão do player após polling

- **Arquivos:** `app/api/session/[id]/state/route.ts`, `lib/utils/sanitize-combatants.ts`
- **Sintoma:** Player com HP 0 aplicava death saves (sucessos/falhas), mas eles desapareciam ~30s depois
- **Causa:** O campo `death_saves` não estava incluído no SELECT do Supabase na rota de estado. O guard `deathSaveOptimisticRef` comparava `sc.death_saves` (undefined, pois não era retornado da API) com `local.death_saves` — a condição `if (isDeathSaveProtected && local?.death_saves && sc.death_saves)` sempre falhava porque `sc.death_saves` era `undefined`
- **Fix:**
  - Adicionar `death_saves` ao SELECT em `app/api/session/[id]/state/route.ts`
  - Adicionar campo `death_saves` à interface `RawCombatantRow` em `lib/utils/sanitize-combatants.ts`

### CR — Fixes de Code Review pós-implementação

- **Arquivo:** `components/player/PlayerJoinClient.tsx`
- **CR-1:** `combatRecapReport` não era resetado quando player votava/pulava o poll → se um jogador voltasse ao poll depois de ver o recap, o recap reaparecia sem o poll. Fix: `setCombatRecapReport(null)` nos handlers `onVote` e `onSkip`
- **CR-2:** Handler `combat:started` não resetava `combatRecapReport` → se DM iniciasse novo combate enquanto recap de combate anterior estava aberto, recap persistia. Fix: `setCombatRecapReport(null)` no handler `combat:started`

### FIX — Role padrão de combatente manual

- **Arquivos:** `components/combat/EncounterSetup.tsx`, `components/session/CombatSessionClient.tsx`, `components/guest/GuestCombatClient.tsx`
- **Sintoma:** Combatentes adicionados manualmente tinham `combatant_role: null` no DB, causando comportamento inconsistente em filtros e exibição
- **Fix:** Alterar default de `combatant_role` de `null` para `"monster"` no payload de criação manual (os manuais são tipicamente NPCs/monstros); adicionar `onRoleChange` ao `GuestCombatClient` para que o guest também possa alterar o role
