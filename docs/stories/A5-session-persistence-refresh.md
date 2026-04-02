# A.5 — Session Persistence no Refresh (F5)

**Epic:** A — Estabilidade do Realtime Player
**Prioridade:** Critica (blocker para beta test ao vivo)
**Estimativa:** 5 SP
**Arquivos principais:** `lib/supabase/player-registration.ts`, `components/player/PlayerJoinClient.tsx`, `app/join/[token]/page.tsx`

---

## Resumo

Quando um jogador anonimo em `/join/[token]` pressiona F5, fecha e reabre a aba, ou troca de aplicativo no celular, ele perde a sessao de combate e precisa que o DM o aceite novamente. Esse comportamento e um **blocker** para sessoes de beta test ao vivo, pois um refresh acidental de qualquer jogador interrompe o combate para o DM.

O mecanismo correto ja existe: se o cookie de autenticacao anonima do Supabase sobreviver, `claimPlayerToken()` detecta o `anon_user_id` existente e retorna o mesmo `tokenId` + `playerName`, permitindo o rejoin transparente sem intervencao do DM. O problema e que ha falhas silenciosas no caminho de reconexao, ausencia de heartbeat para manter o status ativo, e falta de retry no broadcast de `combat:rejoin_request` quando o cookie e perdido.

Esta story corrige cada ponto de falha e garante que o comportamento "mesmo dispositivo + cookie preservado" reconecte o jogador automaticamente.

---

## Contexto

### Causas raiz identificadas

**1. `rejoinAsPlayer()` faz UPDATE sem verificar resultado (linha 334-340)**

Em `lib/supabase/player-registration.ts`:

```typescript
// Linha 334 — UPDATE sem .select() e sem verificacao de erro
await supabase
  .from("session_tokens")
  .update({
    anon_user_id: anonUserId,
    last_seen_at: new Date().toISOString(),
  })
  .eq("id", token.id);
// Nenhum check — se o update falhar, o caller recebe { tokenId, playerName }
// como se tivesse sido bem-sucedido
```

Se a linha do banco foi modificada entre o SELECT e o UPDATE (ex: outro dispositivo fez rejoin em paralelo), o UPDATE pode afetar 0 linhas e o codigo retorna sucesso silencioso. O cliente acredita ser dono do token, mas o DB discorda.

**2. Race condition de token transfer (dois dispositivos, mesmo playerName)**

Se dois dispositivos chamam `rejoinAsPlayer()` simultaneamente com o mesmo `playerName` e sessao, ambos fazem SELECT (retornam o mesmo token), ambos fazem UPDATE. O ultimo a escrever vence. O primeiro dispositivo recebe `tokenId` correto mas perdeu a propriedade no banco — o que causa falhas futuras de autorizacao silenciosas.

**3. `last_seen_at` nao e atualizado periodicamente**

O campo `last_seen_at` so e atualizado quando o jogador faz claim ou rejoin. Em `app/join/[token]/page.tsx` (linha 159), o threshold de "ativo" e 60 segundos:

```typescript
const ACTIVE_THRESHOLD_MS = 60_000; // 60s
```

Apos 60 segundos sem heartbeat, o player aparece como "inativo" para o DM. Isso nao quebra a sessao, mas faz o DM ver dados de presenca incorretos e, no fluxo de rejoin com cookie perdido, o `isActiveSession` enviado no `combat:rejoin_request` retorna `false` mesmo para jogadores ativos.

**4. Janela de protecao de death saves (5s) expira no background mobile**

O mecanismo de death save otimista tem uma janela de 5 segundos de protecao. Em dispositivos mobile, quando o app vai para o background (mudanca de app, bloqueio de tela), esse timer pode expirar durante a ausencia. Quando o jogador retorna, o estado do servidor sobrescreve as death saves otimistas, potencialmente revertendo inputs do jogador sem aviso.

**5. Cookie de autenticacao anonima pode ser perdido em modo incognito e mobile agressivo**

iOS Safari em modo privado e alguns navegadores Android (Samsung Internet, Firefox Focus) nao persistem cookies entre sessoes de aba ou reinicializam o storage ao fechar. Nesses casos, `claimPlayerToken()` gera um novo `anon_user_id` e o jogador precisa do fluxo de rejoin com nome — que por sua vez requer o broadcast `combat:rejoin_request`.

**6. `combat:rejoin_request` nao tem confirmacao do DM**

No handler de rejoin (linha 1021-1038 de `PlayerJoinClient.tsx`), o broadcast `combat:rejoin_request` e enviado ao canal, mas nao ha:
- Timeout com retry se o DM nao responder em N segundos
- Confirmacao (`combat:rejoin_ack`) que o DM recebeu o request
- Feedback diferenciado para "DM nao respondeu" vs "DM rejeitou"

O jogador fica em `rejoinStatus = "waiting"` indefinidamente se o broadcast se perder.

---

## Criterios de Aceitacao

1. **F5 no mesmo dispositivo reconecta sem DM:** Se o cookie de autenticacao anonima sobreviver ao refresh, o jogador retorna ao combate automaticamente — sem modal de rejoin, sem aprovacao do DM.

2. **`rejoinAsPlayer()` valida resultado do UPDATE:** Adicionar `.select("id, anon_user_id")` ao UPDATE e verificar que `data.anon_user_id === anonUserId`. Se a verificacao falhar, lancar erro descritivo em vez de retornar sucesso falso.

3. **SELECT pos-UPDATE confirma ownership:** Apos o UPDATE, fazer um SELECT separado com `.eq("anon_user_id", anonUserId)` para confirmar que a linha pertence ao usuario correto — protecao extra contra race conditions.

4. **Heartbeat de `last_seen_at` a cada 30s:** Enquanto o player estiver ativo no combate (estado `isRegistered && active`), um interval atualiza `last_seen_at` via chamada leve ao banco a cada 30 segundos. O interval deve ser limpo no cleanup do `useEffect`.

5. **Retry do `combat:rejoin_request` se sem resposta em 15s:** Se o DM nao responder ao `combat:rejoin_request` em 15 segundos, reenviar automaticamente o broadcast. Maximo de 3 tentativas. Apos todas as tentativas sem resposta, mostrar mensagem clara ao jogador.

6. **Mensagem de cookie perdido:** Quando o cookie e perdido (novo `anon_user_id`, nenhum token existente encontrado), exibir mensagem clara: "Sua sessao expirou — entre pelo link novamente" em vez de mostrar o formulario de registro padrao sem contexto.

7. **Testes em mobile browsers:** QA obrigatorio em iOS Safari (modo normal e privado) e Android Chrome — documentar resultado com screenshot em `qa-evidence/`.

8. **Celular bloqueado por 15+ minutos:** Se o jogador bloquear o celular ou sair do app por mais de 15 minutos e voltar, o sistema deve reconectar automaticamente sem precisar de intervenção do DM — desde que o cookie ainda exista. O timeout de rejoin request (3 tentativas × 15s = 45s) aplica-se apenas ao fluxo de cookie perdido, não ao F5 com cookie válido.

---

## Abordagem Tecnica

### 4.1 — Corrigir `rejoinAsPlayer()` com validacao do UPDATE

Em `lib/supabase/player-registration.ts`, linhas 333-346, substituir o UPDATE sem verificacao por:

```typescript
// Antes (falha silenciosa):
await supabase
  .from("session_tokens")
  .update({ anon_user_id: anonUserId, last_seen_at: new Date().toISOString() })
  .eq("id", token.id);

// Depois (com validacao):
const { data: updated, error: updateError } = await supabase
  .from("session_tokens")
  .update({ anon_user_id: anonUserId, last_seen_at: new Date().toISOString() })
  .eq("id", token.id)
  .select("id, anon_user_id")
  .single();

if (updateError || !updated) {
  throw new Error(`Token transfer failed: ${updateError?.message ?? "no rows updated"}`);
}

if (updated.anon_user_id !== anonUserId) {
  throw new Error("Token ownership conflict — another device claimed this token");
}
```

O SELECT embutido no UPDATE e atomico no Postgres — retorna o estado da linha apos a escrita. Se outro dispositivo escreveu por ultimo, `updated.anon_user_id` sera diferente de `anonUserId` e o erro sera lancado de forma explicita.

### 4.2 — Heartbeat de `last_seen_at` no PlayerJoinClient

Criar um `useEffect` dedicado ao heartbeat em `components/player/PlayerJoinClient.tsx`. O interval so inicia quando `isRegistered && active && effectiveTokenId` sao verdadeiros:

```typescript
const HEARTBEAT_INTERVAL_MS = 30_000;

useEffect(() => {
  if (!isRegistered || !active || !effectiveTokenId) return;

  const supabase = createClient();

  const heartbeat = async () => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.user?.id) return;

    await supabase
      .from("session_tokens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", effectiveTokenId)
      .eq("anon_user_id", authSession.user.id); // safe — nao atualiza se token foi transferido
  };

  const intervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  heartbeat(); // executar imediatamente na montagem

  return () => clearInterval(intervalId);
}, [isRegistered, active, effectiveTokenId]);
```

O UPDATE inclui `.eq("anon_user_id", ...)` como guard — se o token foi transferido para outro dispositivo, o UPDATE afeta 0 linhas silenciosamente (comportamento correto: o dispositivo que perdeu a ownership nao deve renovar o heartbeat).

### 4.3 — Retry do `combat:rejoin_request`

No `handleRejoin` de `PlayerJoinClient.tsx`, apos o send inicial do broadcast, criar um timeout de 15s que reencaminha o request. Usar uma ref para controlar o numero de tentativas:

```typescript
const rejoinRetryCountRef = useRef(0);
const rejoinRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const MAX_REJOIN_RETRIES = 3;

// Funcao de send extraida para permitir retry
const sendRejoinRequest = useCallback((playerName: string, requestId: string) => {
  if (!channelRef.current) return;
  const playerStatus = registeredPlayersWithStatus.find((p) => p.name === playerName);
  channelRef.current.send({
    type: "broadcast",
    event: "combat:rejoin_request",
    payload: {
      character_name: playerName,
      request_id: requestId,
      is_active_session: playerStatus?.isActive ?? false,
      sender_token_id: effectiveTokenId,
    },
  });
}, [registeredPlayersWithStatus, effectiveTokenId]);

// No handleRejoin, apos o send inicial:
rejoinRetryCountRef.current = 0;
const scheduleRetry = (name: string, reqId: string) => {
  if (rejoinRetryCountRef.current >= MAX_REJOIN_RETRIES) {
    setRejoinStatus("timeout"); // novo estado
    return;
  }
  rejoinRetryTimerRef.current = setTimeout(() => {
    // So retentar se ainda estiver em "waiting"
    if (rejoinStatusRef.current !== "waiting") return;
    rejoinRetryCountRef.current += 1;
    sendRejoinRequest(name, reqId);
    scheduleRetry(name, reqId);
  }, 15_000);
};
scheduleRetry(playerName, requestId);
```

Limpar `rejoinRetryTimerRef` quando o DM responde (nos handlers de `combat:rejoin_approved` e `combat:rejoin_rejected`) e no cleanup do `useEffect`.

Adicionar `rejoinStatusRef` (um `useRef` espelhando o state `rejoinStatus`) para leitura segura dentro de callbacks assincronos sem closure stale.

### 4.4 — Mensagem para cookie perdido

Em `app/join/[token]/page.tsx`, o server-side ja detecta se o `anon_user_id` do cookie pertence a um token desta sessao. Se detectar que o `anon_user_id` nao corresponde a nenhum token registrado com `player_name`, passar uma prop `cookieExpired` para `PlayerJoinClient`.

No `PlayerJoinClient`, quando `cookieExpired === true` e o usuario digitou um nome que ja existe em `registeredPlayerNames`, exibir o aviso antes de iniciar o fluxo de rejoin:

```tsx
{cookieExpired && (
  <p className="text-amber-400 text-sm">
    {t("session_cookie_expired")}
    {/* "Sua sessao expirou — entre pelo link novamente" */}
  </p>
)}
```

A mensagem deve aparecer no formulario de rejoin (onde o jogador digita o nome), nao como blocker. O jogador ainda pode completar o rejoin via `combat:rejoin_request`.

### 4.5 — Novo estado `rejoinStatus = "timeout"` no PlayerLobby

O estado de timeout do rejoin (apos 3 retries sem resposta) deve mostrar mensagem e opcao de tentar novamente sem reload de pagina:

```tsx
// No PlayerLobby ou inline no PlayerJoinClient:
if (rejoinStatus === "timeout") {
  return (
    <div>
      <p>{t("rejoin_timeout")}</p>
      {/* "O DM nao respondeu. Tente novamente ou entre pelo link." */}
      <button onClick={resetRejoinState}>{t("try_again")}</button>
    </div>
  );
}
```

`resetRejoinState` limpa `rejoinStatus`, `rejoinRetryCountRef`, `rejoinRetryTimerRef`, `rejoinRequestIdRef` e `rejoinCharacterRef`.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/supabase/player-registration.ts` | Adicionar `.select("id, anon_user_id")` ao UPDATE em `rejoinAsPlayer()`, validar resultado, lancar erro em caso de falha ou conflito |
| `components/player/PlayerJoinClient.tsx` | Heartbeat `useEffect` (30s interval), retry logic para `combat:rejoin_request` (refs de retry + scheduleRetry), `rejoinStatusRef`, novo estado `"timeout"` de rejoin, cleanup de `rejoinRetryTimerRef` |
| `app/join/[token]/page.tsx` | Detectar cookie expirado server-side e passar prop `cookieExpired` para `PlayerJoinClient` |
| `components/player/PlayerLobby.tsx` | Exibir UI para estado `rejoinStatus === "timeout"` com botao de retry sem reload |
| `messages/pt-BR.json` | Novas chaves: `session_cookie_expired`, `rejoin_timeout`, `rejoin_retry_count` |
| `messages/en.json` | Mesmas chaves em ingles |

---

## Plano de Testes

### Testes Manuais — Desktop

1. **F5 com cookie preservado (caminho principal):**
   - Jogador entra em `/join/[token]`, registra nome, entra no combate
   - Pressionar F5
   - Verificar: tela de combate recarrega sem modal de rejoin, sem popup no DM
   - Verificar no Supabase: `last_seen_at` do token foi atualizado, `anon_user_id` inalterado

2. **Heartbeat ativo:**
   - Jogador em combate ativo
   - Aguardar 60+ segundos sem F5
   - Verificar no Supabase: `last_seen_at` atualizado a cada ~30s
   - Verificar no DM: jogador aparece como "ativo" (nao como "inativo") no painel

3. **Cookie apagado manualmente (simula modo incognito):**
   - Jogador em combate; abrir DevTools > Application > Cookies; deletar o cookie de auth do Supabase
   - Pressionar F5
   - Verificar: formulario de rejoin aparece com mensagem "Sua sessao expirou"
   - Digitar o nome correto → DM ve o request de rejoin → aprovar → jogador entra
   - Verificar: nenhuma segunda solicitacao ao DM apos aprovacao

4. **Retry do rejoin request (DM offline momentaneamente):**
   - Jogador perde cookie, inicia fluxo de rejoin durante combate ativo
   - Fechar e reabrir o painel do DM (simula DM com conexao instavel) para os primeiros 15s
   - Verificar: client reenvio o request automaticamente apos 15s
   - DM ve o request reenviado e aprova → jogador entra

5. **Esgotamento de retries (DM nunca responde):**
   - Jogador perde cookie, inicia fluxo de rejoin; DM nao responde
   - Apos 3 tentativas (45s total), verificar: mensagem de timeout aparece com botao "Tentar novamente"
   - Clicar "Tentar novamente" → volta ao formulario de rejoin (sem reload de pagina)

6. **Race condition: dois dispositivos, mesmo playerName:**
   - Dispositivo A: sessao ativa com playerName "Aragorn"
   - Dispositivo B: abrir `/join/[token]` em modo incognito, tentar rejoin como "Aragorn"
   - Verificar: dispositivo A mantem sessao; dispositivo B recebe erro ou entra no fluxo de rejoin com DM
   - Verificar no Supabase: `anon_user_id` do token pertence a apenas UM dispositivo

7. **`rejoinAsPlayer()` com falha de UPDATE:**
   - Usar Supabase RLS ou trigger temporario para rejeitar o UPDATE
   - Verificar: funcao lanca erro explicito em vez de retornar sucesso falso
   - Verificar: UI mostra toast de erro (nao fica em estado "waiting" indefinidamente)

### Testes em Mobile Browsers (obrigatorio)

8. **iOS Safari — modo normal:**
   - Jogador em combate; trocar para outro app por 30s; voltar ao Safari
   - Verificar: sessao ainda ativa, heartbeat continuou ou retomou

9. **iOS Safari — modo privado:**
   - Jogador entra pelo link em aba privada; registra nome; entra no combate
   - Fechar e reabrir a aba privada (simula perda de cookie)
   - Verificar: mensagem de sessao expirada aparece; rejoin pelo nome funciona com DM

10. **Android Chrome — background agressivo (2 minutos):**
    - Jogador em combate; colocar Chrome em background por 2 minutos
    - Retornar ao Chrome
    - Verificar: sessao reconecta automaticamente OU mostra rejoin com mensagem clara

11. **Celular bloqueado por 15+ minutos (cenario real de mesa):**
    - Jogador em combate; bloquear o celular (tela apagada)
    - Aguardar 15-20 minutos (cenario real: jogador guardou o celular entre combates)
    - Desbloquear e retornar ao browser
    - Verificar: cookie ainda valido → reconecta automaticamente sem DM
    - Se cookie perdido → fluxo de rejoin com nome, sem F5 forcado
    - Documentar: quanto tempo o cookie sobrevive por browser/OS (iOS Safari, Android Chrome, Firefox Android)

12. **Android Chrome — aba fechada e reaberta:**
    - Fechar aba (nao o app) e reabrir pelo historico
    - Verificar comportamento de persistencia de cookie (varia por configuracao do Android)

### Cenarios de Borda

- Jogador faz F5 durante sua propria vez no turno — estado de turno deve ser recuperado apos rejoin
- Death saves otimistas: jogador com death saves marcadas faz F5 antes do sync de 5s — verificar que o estado e recuperado do servidor corretamente
- Sessao encerrada pelo DM enquanto jogador esta em fluxo de rejoin — deve mostrar "Sessao encerrada" e nao "timeout de rejoin"
- Dois F5 rapidos seguidos — o segundo nao deve criar solicitacao duplicada ao DM
- **Celular bloqueado durante turno do jogador:** Jogador bloqueia o celular quando e sua vez; DM fica esperando; 15 min depois jogador desbloqueia — combate deve estar no ponto certo, sem necessidade de aprovacao do DM

---

## Notas de Paridade

**Caminho `/join` (anonimo) — foco desta story:**
- Usa `claimPlayerToken()` + `rejoinAsPlayer()` em `lib/supabase/player-registration.ts`
- Autenticacao via Supabase anonymous auth + cookie
- Vulneravel a perda de cookie em mobile/incognito

**Caminho `/invite` (autenticado):**
- Player tem conta Supabase real; sessao persistida por JWT de longa duracao
- F5 reconecta via sessao autenticada existente — mecanismo diferente, mais robusto
- O heartbeat de `last_seen_at` desta story deve ser ativado para ambos os caminhos, pois ambos usam `PlayerJoinClient.tsx`
- O `rejoinAsPlayer()` corrigido afeta apenas o caminho anonimo, pois o autenticado nao chama essa funcao

**Caminho `/try` (guest):**
- Usa `localStorage` em vez de banco ou cookies
- Persistencia ja funciona: F5 recupera estado do `localStorage`
- **Nenhuma mudanca necessaria**

**Conclusao de paridade:** As correcoes de `rejoinAsPlayer()` e heartbeat sao seguras para todos os caminhos. O retry de `combat:rejoin_request` e o aviso de cookie expirado sao exclusivos do caminho `/join`.

---

## Definicao de Pronto

- [ ] `rejoinAsPlayer()` adiciona `.select("id, anon_user_id")` ao UPDATE e valida ownership
- [ ] `rejoinAsPlayer()` lanca erro explicito se UPDATE falha ou retorna `anon_user_id` diferente
- [ ] Heartbeat de 30s implementado em `PlayerJoinClient` com cleanup no useEffect
- [ ] Heartbeat inclui guard `.eq("anon_user_id", userId)` para nao renovar tokens perdidos
- [ ] Retry de `combat:rejoin_request` implementado: 3 tentativas, 15s de intervalo
- [ ] `rejoinStatusRef` criado para leitura segura em callbacks assincronos
- [ ] Estado `rejoinStatus === "timeout"` com UI e botao de retry sem reload de pagina
- [ ] Prop `cookieExpired` passada do server-side para `PlayerJoinClient` quando aplicavel
- [ ] Mensagem "Sua sessao expirou — entre pelo link novamente" visivel no formulario de rejoin
- [ ] Novas chaves i18n adicionadas em `pt-BR.json` e `en.json`
- [ ] QA manual: F5 com cookie → sem intervencao do DM (screenshot em `qa-evidence/`)
- [ ] QA manual: cookie apagado → rejoin com DM → sucesso (screenshot)
- [ ] QA manual: 3 retries esgotados → mensagem de timeout → retry sem reload (screenshot)
- [ ] QA mobile: iOS Safari modo normal e privado documentados (screenshot)
- [ ] QA mobile: Android Chrome background e aba reaberta documentados (screenshot)
- [ ] Race condition de dois dispositivos testado e comportamento documentado
- [ ] Code review aprovado
