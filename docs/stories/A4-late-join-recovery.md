# A.4 — Late-Join State Machine Recovery

## Resumo

Quando um jogador envia um pedido de late-join e o DM nao responde em 2 minutos, o sistema entra em estado `"timeout"` **sem nenhum mecanismo de recuperacao**. O unico caminho de volta e F5. Alem disso, existe uma race condition: se o DM aceita entre 15s e 120s, o timer de timeout pode sobrescrever o status `"accepted"` com `"timeout"`, quebrando o fluxo silenciosamente.

Esta story corrige a maquina de estados do late-join para ser resiliente, recuperavel e transparente para o jogador.

---

## Contexto

O fluxo de late-join vive em `components/player/PlayerJoinClient.tsx` (linhas 1044-1091). A maquina de estados atual tem 6 estados:

```
idle -> waiting -> polling -> timeout (DEAD END)
                -> accepted (final)
                -> rejected (tem retry via reload)
```

**Problemas identificados:**

1. **Timeout sem recovery (linha 1088):** `setLateJoinStatus("timeout")` e chamado sem verificar se o status ja e `"accepted"`. Se o DM aceitar entre o momento que o timer foi criado e o momento que dispara, a aceitacao e sobrescrita.

2. **Polling fallback tambem vulneravel (linha 1079-1082):** O timer de 15s que muda para `"polling"` nao guarda contra estados finais. Se `"accepted"` chegou via broadcast, o timer ainda pode executar (embora `lateJoinRegisteredRef` proteja parcialmente, o status visual muda).

3. **Timeout e beco sem saida:** No estado `"timeout"`, o componente `PlayerLobby` (linha 218-236) mostra apenas um botao de refresh (`window.location.reload()`). Nao ha botao "Tentar novamente" que resete a maquina de estados.

4. **Rejected tem retry incompleto:** O estado `"rejected"` (linha 239-256) tambem usa `window.location.reload()` em vez de resetar a maquina de estados programaticamente.

5. **Sem countdown visivel:** O jogador espera 2 minutos sem nenhuma indicacao de quanto tempo falta, gerando ansiedade e reloads prematuros.

6. **Cleanup incompleto:** Na funcao de cleanup do useEffect (linha 805), `lateJoinMaxTimeoutRef` e limpo, mas `lateJoinTimeoutRef` (o timer de 15s) nao e limpo no mesmo bloco. Ambos os timers devem ser cancelados quando o status alcanca um estado final ou o usuario navega para fora.

---

## Criterios de Aceitacao

1. **Botao "Tentar novamente" no timeout:** Quando o late-join atinge o estado `"timeout"`, exibir um botao "Tentar novamente" que reseta a maquina de estados para `"idle"` e permite o jogador reenviar a solicitacao — sem reload de pagina.

2. **Retry envia novo request:** Ao clicar em "Tentar novamente", o sistema deve:
   - Resetar `lateJoinStatus` para `"idle"`
   - Limpar todos os timers pendentes (15s e 120s)
   - Limpar `lateJoinRequestIdRef`, `lateJoinRegisteredRef` e `lateJoinDataRef`
   - Permitir que o formulario de late-join reaparca para o jogador preencher e enviar um novo `combat:late_join_request`

3. **Guard contra sobrescrita de status final:** Se o status ja e `"accepted"`, nenhum timer (15s polling, 120s timeout) pode altera-lo. Implementar verificacao de "status final" antes de qualquer `setLateJoinStatus` nos callbacks de timer.

4. **Rejected com opcao de retry programatico:** Se o status e `"rejected"`, exibir mensagem clara ("O DM recusou sua solicitacao") com botao "Solicitar novamente" que reseta para `"idle"` — sem `window.location.reload()`.

5. **Limpeza de timers em estados finais:** Limpar todos os timers de late-join (15s polling fallback, 120s max timeout) quando:
   - Status alcanca `"accepted"`
   - Status alcanca `"rejected"` (timers ja nao sao uteis)
   - Usuario navega para fora (cleanup do useEffect)
   - Componente desmonta

6. **Countdown visivel para o jogador:** Durante os estados `"waiting"` e `"polling"`, exibir um countdown regressivo mostrando quanto tempo falta ate o timeout de 2 minutos. Formato sugerido: "Aguardando resposta do DM... (1:45)".

7. **Limite de retentativas:** Maximo de **3 tentativas**. Apos a 3a tentativa sem resposta, exibir mensagem final: *"Peca ao mestre para adicionar voce manualmente."* — sem botao de retry.

8. **DM desconecta durante waiting:** Se o DM sair/desconectar durante o waiting do player, reutilizar o overlay de `session:ended` (A.3) — mesmo componente e comportamento.

---

## Decisoes de UX (Party Mode 2026-04-02)

| Decisao | Resolucao |
|---------|-----------|
| **Countdown** | Centralizado, `text-3xl font-mono`, com progress ring circular. Texto abaixo: *"Aguardando o mestre..."* |
| **Msg rejeicao** | *"O mestre nao pode aceitar novos jogadores agora."* + botao "Solicitar novamente" |
| **Retry form** | Manter dados preenchidos, adicionar `"Tentativa 2 de 3"` em `text-xs opacity-60` acima do botao |
| **Countdown → zero** | Nos ultimos 10s: countdown muda para `text-red-400`. Ao zerar: transicao suave para tela de timeout com botao "Tentar novamente" |
| **Limite retentativas** | **3 tentativas**. Apos a 3a: *"Peca ao mestre para adicionar voce manualmente."* — sem botao de retry |
| **DM sai durante waiting** | Reutiliza overlay de `session:ended` (A.3) |

---

## Abordagem Tecnica

### 3.1 — Ref para status finais (guard contra race condition)

Criar uma ref `lateJoinFinalStatusRef` que rastreia se o status atingiu um estado terminal:

```typescript
const FINAL_STATUSES = new Set(["accepted"]);
const lateJoinFinalStatusRef = useRef(false);
```

Em todo lugar que `setLateJoinStatus("accepted")` e chamado (3 locais: broadcast handler linha 559, late_join_response handler linha 613, polling handler linha 838), tambem setar `lateJoinFinalStatusRef.current = true`.

Nos callbacks de timer (linhas 1079-1082 e 1086-1089), adicionar guard:

```typescript
// Timer de 15s — polling fallback
lateJoinTimeoutRef.current = setTimeout(() => {
  if (lateJoinFinalStatusRef.current) return; // Guard
  if (lateJoinRequestIdRef.current === requestId && !lateJoinRegisteredRef.current) {
    setLateJoinStatus("polling");
  }
}, 15_000);

// Timer de 120s — max timeout
lateJoinMaxTimeoutRef.current = setTimeout(() => {
  if (lateJoinFinalStatusRef.current) return; // Guard
  if (!lateJoinRegisteredRef.current) {
    setLateJoinStatus("timeout");
  }
}, 120_000);
```

### 3.2 — Funcao de reset da maquina de estados

Criar `resetLateJoinState` para centralizar a limpeza:

```typescript
const resetLateJoinState = useCallback(() => {
  // Limpar timers
  if (lateJoinTimeoutRef.current) {
    clearTimeout(lateJoinTimeoutRef.current);
    lateJoinTimeoutRef.current = null;
  }
  if (lateJoinMaxTimeoutRef.current) {
    clearTimeout(lateJoinMaxTimeoutRef.current);
    lateJoinMaxTimeoutRef.current = null;
  }
  // Resetar refs
  lateJoinRequestIdRef.current = null;
  lateJoinRegisteredRef.current = false;
  lateJoinFinalStatusRef.current = false;
  lateJoinDataRef.current = null;
  // Resetar status visual
  setLateJoinStatus("idle");
}, []);
```

### 3.3 — Retry no timeout e rejected (PlayerLobby)

Adicionar prop `onLateJoinRetry` ao `PlayerLobby`. No `PlayerJoinClient`, passar `resetLateJoinState` como essa prop.

No `PlayerLobby`, substituir `window.location.reload()` por `onLateJoinRetry()` nos estados `"timeout"` e `"rejected"`:

**Timeout (linha 226-231):**
```tsx
<button onClick={onLateJoinRetry}>
  {t("late_join_retry")}  // "Tentar novamente"
</button>
```

**Rejected (linha 246-252):**
```tsx
<p className="text-red-400">{t("late_join_rejected")}</p>
<p className="text-muted-foreground text-sm">{t("late_join_rejected_hint")}</p>
<button onClick={onLateJoinRetry}>
  {t("late_join_request_again")}  // "Solicitar novamente"
</button>
```

### 3.4 — Countdown regressivo

Adicionar estado `lateJoinDeadline` (timestamp) que e setado em `handleLateJoinRequest`:

```typescript
const [lateJoinDeadline, setLateJoinDeadline] = useState<number | null>(null);
```

No `handleLateJoinRequest`, setar: `setLateJoinDeadline(Date.now() + 120_000)`.

Passar `lateJoinDeadline` como prop para `PlayerLobby`. No `PlayerLobby`, criar um mini-hook ou useEffect com `setInterval` de 1s para computar o tempo restante e exibir no formato `M:SS`.

Limpar `lateJoinDeadline` (setar para `null`) no `resetLateJoinState`.

### 3.5 — Limpeza no cleanup do useEffect

No bloco de cleanup (linha 801-805), garantir que AMBOS os timers sao limpos:

```typescript
// Ja existente:
if (lateJoinMaxTimeoutRef.current) clearTimeout(lateJoinMaxTimeoutRef.current);
// Adicionar:
if (lateJoinTimeoutRef.current) clearTimeout(lateJoinTimeoutRef.current);
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `components/player/PlayerJoinClient.tsx` | Adicionar `lateJoinFinalStatusRef`, guards nos timers, `resetLateJoinState`, `lateJoinDeadline`, cleanup completo, nova prop `onLateJoinRetry` |
| `components/player/PlayerLobby.tsx` | Adicionar prop `onLateJoinRetry`, substituir `window.location.reload()` por retry programatico, exibir countdown, melhorar mensagem de rejected |
| `messages/en.json` | Novas chaves: `late_join_countdown`, `late_join_rejected_hint`, `late_join_request_again` (se necessario) |
| `messages/pt-BR.json` | Mesmas chaves em portugues |

---

## Plano de Testes

### Testes Manuais

1. **Timeout com retry:**
   - Jogador envia late-join request
   - DM nao responde por 2 minutos
   - Verificar que aparece botao "Tentar novamente" (nao apenas "Recarregar pagina")
   - Clicar em "Tentar novamente" -> volta ao formulario de late-join
   - Enviar novo request -> DM aceita -> jogador entra no combate

2. **Race condition (DM aceita no ultimo segundo):**
   - Jogador envia late-join request
   - Esperar ~1:55 (proximo do timeout de 2 min)
   - DM aceita o request
   - Verificar que o status muda para `"accepted"` e NAO e sobrescrito por `"timeout"`

3. **Rejected com retry:**
   - DM rejeita o late-join request
   - Verificar mensagem clara de rejeicao
   - Clicar em "Solicitar novamente" -> volta ao formulario
   - Reenviar request -> DM aceita -> sucesso

4. **Countdown visivel:**
   - Jogador envia late-join request
   - Verificar que countdown aparece (ex: "2:00", "1:59", ...)
   - Countdown deve parar e desaparecer quando DM responde

5. **Cleanup ao navegar:**
   - Jogador envia late-join request
   - Fechar aba ou navegar para outra pagina
   - Verificar no console que nao ha timers orfaos ou erros de setState em componente desmontado

6. **Polling nao sobrescreve accepted:**
   - Jogador envia late-join request
   - DM aceita via broadcast antes de 15s
   - Verificar que o timer de 15s (polling fallback) NAO muda o status para `"polling"`

### Cenarios de Borda

- DM aceita exatamente no frame do timeout (ms 120000)
- Multiplos retries em sequencia rapida
- Jogador perde conexao durante waiting e reconecta — timers devem ser consistentes
- Late-join retry apos rejected + segundo reject + terceiro aceito

---

## Notas de Paridade

- **Player-only:** O fluxo de late-join existe exclusivamente em `PlayerJoinClient.tsx` + `PlayerLobby.tsx`. O `GuestCombatClient` nao possui esse fluxo (confirmado: zero referencias a `lateJoin` em `components/guest/`).
- **Rejoin != Late-join:** O fluxo de rejoin (reconexao de jogador ja registrado) e separado e ja possui `onRejoinRetry` funcional (linha 1147). Esta story NAO afeta o rejoin.
- **DM-side nao muda:** O DM recebe o broadcast `combat:late_join_request` e responde com `combat:late_join_response`. A story nao altera o lado do DM — apenas torna o lado do jogador resiliente a delays e timeouts.
