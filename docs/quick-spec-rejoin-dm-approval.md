# Quick Spec: Reconexão de Jogador com Aprovação do DM

**Data:** 2026-03-29
**Status:** Em implementação

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

- `combat:rejoin_request` — player → DM (player_name, character_name, request_id, is_active_session)
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
