# Quick Spec: Reconexão de Jogador com Aprovação do DM

**Data:** 2026-03-29
**Status:** QA revisado — bugs corrigidos

## Problema

Quando um jogador perde a sessão (troca de celular, aba anônima, cookies limpos) e volta pelo link `/join/{token}`, ele pode escolher qualquer personagem da lista — sem aprovação do DM. Isso permite:

1. Jogador entrar como personagem errado por engano
2. Dois jogadores no mesmo personagem ao mesmo tempo
3. Troca intencional de personagem sem o DM saber

## Escopo

**Apenas durante combate ativo.** O lobby (pré-combate) NÃO muda — DM vê quem entra e pode remover antes de iniciar.

## Fluxo

### Jogador volta pelo link (combate ativo, sem cookie)

1. Vê lista de personagens com status ativo/inativo (🟢/🔴)
2. **Clica em personagem INATIVO** → envia `combat:rejoin_request` direto pro DM → modo espectador (read-only)
3. **Clica em personagem ATIVO** → modal "Este personagem está com sessão ativa. Tem certeza?" → confirma → envia request pro DM → modo espectador
4. DM vê banner diferenciado:
   - Inativo: "{name} quer reconectar como {character}"
   - Ativo: "⚠️ {name} quer assumir {character} (sessão ativa)"
5. **DM aceita** → token transferido → jogador entra → dispositivo antigo recebe `combat:session_revoked`
6. **DM rejeita** → jogador volta pra lista de personagens (sem cooldown)

### Reconexão com cookie válido (mesmo dispositivo)

Continua automática — sem mudança.

### Reconexão no lobby (sem combate)

Continua automática — sem mudança.

## Eventos Realtime Novos

- `combat:rejoin_request` — player → DM (character_name, request_id, is_active_session, sender_token_id)
- `combat:rejoin_response` — DM → player (request_id, accepted)
- `combat:session_revoked` — DM → canal (revoked_token_id) — desconecta dispositivo antigo

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `lib/types/realtime.ts` | Novos event types |
| `messages/en.json` + `pt-BR.json` | i18n keys |
| `app/join/[token]/page.tsx` | Passa `last_seen_at` junto com `player_name` |
| `components/player/PlayerLobby.tsx` | Status ativo/inativo, modal de confirmação |
| `components/player/PlayerJoinClient.tsx` | Rejoin durante combate usa request ao invés de transfer direto |
| `components/session/JoinRequestBanner.tsx` | Variante "reconexão" com warning pra sessão ativa |
| `components/session/CombatSessionClient.tsx` | Listener pro `rejoin_request`, accept faz token transfer + broadcast `session_revoked` |

## O que NÃO muda

- Lobby (registro inicial)
- Reconexão com cookie válido (automática)
- Late-join de jogador novo (fluxo existente)
- `rejoinAsPlayer()` server action (continua existindo, chamada após aprovação do DM)

## QA Review — Bugs encontrados e corrigidos (2026-03-29)

### BUG 1 (CRÍTICO) — `session_revoked` não desconectava dispositivo antigo
**Causa:** `CombatSessionClient` enviava `revoked_token_id: req.player_name` (string com nome do personagem), mas `PlayerJoinClient` comparava com `effectiveTokenId` (UUID). Nunca batia.
**Fix:** Adicionado `sender_token_id` ao payload de `combat:rejoin_request`. O player envia seu `effectiveTokenId`, o DM armazena no `JoinRequest.senderTokenId` e usa esse valor no broadcast de `session_revoked`.
**Arquivos:** `realtime.ts`, `PlayerJoinClient.tsx`, `CombatSessionClient.tsx`, `JoinRequestBanner.tsx`

### BUG 2 (MÉDIO) — Lobby não passava `rejoinStatus`
**Causa:** O render do lobby (sem combate) não passava `rejoinStatus`/`onRejoinRetry` para `PlayerLobby`.
**Decisão:** Não é um bug real — o lobby faz rejoin direto sem aprovação, então `rejoinStatus` nunca sai de `"idle"`. Erros são reportados via toast. Comportamento está correto conforme spec.

### BUG 3 (BAIXO) — Strings i18n com `.replace()` hacky no banner
**Causa:** `JoinRequestBanner` usava `t("rejoin_notification_active", { name: "", character: ... }).replace("⚠️ ", "").replace("  ", " ")` para remover o nome e o emoji.
**Fix:** Criadas chaves i18n dedicadas `rejoin_banner_subtitle` e `rejoin_banner_subtitle_active` sem `{name}` e sem emoji, usadas diretamente no banner.
