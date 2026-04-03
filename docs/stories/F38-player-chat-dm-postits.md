# F-38 — Chat Privado dos Players + Post-its do DM

**Epic:** Player Experience — Comunicacao em Sessao  
**Prioridade:** Media  
**Estimativa:** 8 SP  
**Dependencia:** Nenhuma (usa infraestrutura de realtime ja existente)  
**Arquivos principais:** `lib/types/realtime.ts`, `components/player/PlayerJoinClient.tsx`, `components/player/PlayerChat.tsx` (novo), `components/player/DmPostit.tsx` (novo), `components/combat/DmPostitSender.tsx` (novo)

---

## Resumo

Durante combate presencial, ha momentos em que players precisam se comunicar sem que o DM ouca (ex: planejar tatica, pedir item emprestado). Hoje, fazem isso por WhatsApp — quebrando a imersao. Paralelamente, o DM precisa enviar notas rapidas para players individuais (ex: "voce sente uma presenca sombria", "lembra que voce tem aquela pocao?") sem revelar a informacao pra mesa inteira.

Esta story implementa **duas features complementares** usando o canal realtime ja existente:

1. **Chat de Players** — mensagens efemeras entre players (DM nao ve). Broadcast-only, sem persistencia.
2. **Post-its do DM** — notas curtas do DM para player individual ou todos. Aparecem como notificacao flutuante com auto-dismiss.

Ambas existem apenas durante a sessao de combate ativa. Zero historico. Zero moderacao. Simplicidade radical.

---

## Decisoes de UX

**D1 — Mensagens efemeras (sem persistencia):** Mensagens vivem apenas no broadcast channel. Quando a sessao termina, tudo desaparece. Isso elimina necessidade de tabelas no banco, moderacao, LGPD de historico, e respeita a filosofia "so o que importa NA MESA".

**D2 — Chat invisivel para o DM:** O DM NAO recebe mensagens do chat de players. Isso cria confianca entre jogadores e incentiva uso da ferramenta em vez de WhatsApp. Implementado via filtragem client-side: o DM client simplesmente ignora eventos `chat:player_message`.

**D3 — Post-its sao one-way:** DM envia, player recebe. Player nao responde ao post-it (usaria o chat pra isso). Isso mantem a hierarquia narrativa do RPG (DM e o narrador) e simplifica drasticamente a UX.

**D4 — Post-it com auto-dismiss:** Post-it aparece como notificacao flutuante (toast-like) no canto da tela do player. Persiste por 15 segundos com opcao de dismiss manual. Player pode reabrir post-its recebidos na sessao via icone de envelope. Maximo de 20 post-its armazenados no estado local (FIFO).

**D5 — Chat minimalista:** Icone de balao de chat no rodape da tela do player. Abre painel deslizante (sheet) com lista de mensagens e campo de input. Maximo de 50 mensagens no estado local (FIFO). Sem formatacao, sem emojis picker, sem anexos — texto puro.

**D6 — Identificacao do remetente:** Cada mensagem mostra o nome do personagem do player (nao o nome real do usuario). Obtido via `session_tokens.character_name` (anon) ou `player_characters.name` (auth). Cor de avatar gerada por hash do nome (consistente entre mensagens).

**D7 — Indicador de novas mensagens:** Badge numerico no icone de chat quando ha mensagens nao lidas (chat fechado). Reseta ao abrir o painel.

**D8 — DM envia post-it via painel lateral:** No client do DM, um botao "Post-it" ao lado de cada player na lista de combatentes abre um input rapido. Tambem ha opcao "Enviar para todos" no topo.

---

## Contexto Tecnico

### Canal Realtime existente

O canal de sessao ja esta configurado em `PlayerJoinClient.tsx`:

```typescript
const channel = supabase.channel(`session:${sessionId}`, {
  config: { broadcast: { self: false } },
});
```

Novos event types serao adicionados ao canal existente — sem criar canais extras.

### Tipos existentes (`lib/types/realtime.ts`)

O tipo `RealtimeEventType` e uma union de strings seguindo padrao `domain:action`. Novos tipos seguirao o mesmo padrao:

```typescript
| "chat:player_message"
| "chat:dm_postit"
```

### Broadcast via `supabase.channel().send()`

Pattern existente:

```typescript
channel.send({
  type: "broadcast",
  event: "combat_event",
  payload: { type: "combat:hp_update", ... }
});
```

### Autenticacao de identidade

- **Auth players:** `user_id` do Supabase + `player_characters.name`
- **Anon players:** `session_tokens.character_name` + `token_id`
- Identidade e enviada no payload da mensagem pelo client. NAO ha validacao server-side (broadcast P2P) — aceitavel para feature efemera sem persistencia.

### i18n

Chaves existentes em `messages/en.json` e `messages/pt-BR.json` sob namespace `campaign`. Novas chaves irao sob namespace `chat`.

---

## Criterios de Aceite

### Chat de Players

1. Player ve icone de balao de chat na parte inferior da tela durante combate ativo.
2. Ao clicar no icone, abre painel lateral (Sheet) com lista de mensagens e campo de input.
3. Player digita mensagem e envia (Enter ou botao). Mensagem aparece na lista imediatamente (otimistic).
4. Mensagem e recebida por todos os outros players conectados na sessao em tempo real (< 500ms).
5. DM NAO recebe mensagens do chat de players (filtrado no client do DM).
6. Cada mensagem mostra: nome do personagem, timestamp relativo ("2m ago"), conteudo.
7. Badge numerico aparece no icone quando ha mensagens nao lidas (painel fechado).
8. Maximo de 50 mensagens no buffer local (FIFO — mais antigas descartadas).
9. Mensagens desaparecem completamente quando a sessao termina (nenhum localStorage, nenhum banco).

### Post-its do DM

10. DM ve botao de "Post-it" (icone de nota adesiva) ao lado de cada player na lista de combatentes.
11. DM clica no botao e ve input de texto curto (max 280 chars) + botao "Enviar".
12. DM pode enviar post-it para player individual ou "Todos os Players".
13. Player alvo recebe notificacao flutuante (post-it visual) no canto superior direito da tela.
14. Post-it persiste por 15 segundos na tela, com botao X para dismiss imediato.
15. Player pode ver historico de post-its da sessao via icone de envelope (maximo 20, FIFO).
16. Post-it mostra: "Mensagem do Mestre" como header, conteudo do texto.
17. Outros players NAO veem post-its enviados para player especifico.
18. Post-it "para todos" e recebido por todos os players simultaneamente.

### Geral

19. Chat e post-its funcionam tanto para players autenticados (invite) quanto anonimos (join via link).
20. Nenhuma nova tabela no banco de dados (tudo via broadcast).
21. i18n: todas as strings de UI em pt-BR e en.
22. Layout responsivo: chat e post-its funcionam em mobile (tela pequena).

---

## Abordagem Tecnica

### 1. Adicionar novos event types em `lib/types/realtime.ts`

```typescript
// Adicionar ao RealtimeEventType union:
| "chat:player_message"
| "chat:dm_postit"

// Novas interfaces:
export interface RealtimeChatPlayerMessage {
  type: "chat:player_message";
  /** Nome do personagem do remetente */
  sender_name: string;
  /** ID unico da mensagem (uuid client-generated) */
  message_id: string;
  /** Conteudo texto puro */
  content: string;
  /** Timestamp ISO */
  sent_at: string;
}

export interface RealtimeChatDmPostit {
  type: "chat:dm_postit";
  /** ID unico do post-it (uuid client-generated) */
  postit_id: string;
  /** Conteudo texto (max 280 chars) */
  content: string;
  /** Target: token_id do player especifico ou "all" */
  target: string;
  /** Timestamp ISO */
  sent_at: string;
}

// Adicionar ao SanitizedEvent union (post-its e chat passam pro player):
| RealtimeChatPlayerMessage
| RealtimeChatDmPostit
```

### 2. Criar componente `PlayerChat.tsx`

```
components/player/PlayerChat.tsx
```

Componente encapsulado com:
- Estado local: `messages: ChatMessage[]`, `unreadCount: number`, `isOpen: boolean`
- Subscreve ao evento `chat:player_message` no canal existente
- Envia mensagens via `channel.send({ type: "broadcast", event: "combat_event", payload })`
- UI: Sheet (shadcn) com lista de mensagens scrollavel + input na parte inferior
- Cores de avatar: `hsl(hashCode(name) % 360, 70%, 50%)`

```typescript
interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  sentAt: string;
  isMine: boolean;
}
```

### 3. Criar componente `DmPostit.tsx` (receiver — player side)

```
components/player/DmPostit.tsx
```

- Subscreve ao evento `chat:dm_postit` no canal
- Filtra por `target === tokenId || target === "all"`
- Exibe toast/notificacao flutuante no canto superior direito
- Auto-dismiss apos 15s via `setTimeout`
- Armazena post-its recebidos em estado local (max 20 FIFO)
- Icone de envelope com badge mostra count de post-its

Styling do post-it:
```css
/* Estilo "nota adesiva" — fundo gold translucido */
.postit {
  background: rgba(212, 168, 83, 0.15); /* gold #D4A853 com alpha */
  border-left: 3px solid #D4A853;
  backdrop-filter: blur(8px);
}
```

### 4. Criar componente `DmPostitSender.tsx` (sender — DM side)

```
components/combat/DmPostitSender.tsx
```

- Popover acionado por botao ao lado de cada player na lista de combatentes
- Input de texto (max 280 chars) + botao Enviar
- Envia via `channel.send()` com `target` = token_id do player ou "all"
- Feedback visual ao enviar (toast de confirmacao)

### 5. Integrar no `PlayerJoinClient.tsx`

Adicionar listener para novos event types no `useEffect` de realtime:

```typescript
// Dentro do handler de eventos:
case "chat:player_message":
  // Delegar para PlayerChat (via ref ou state lift)
  break;
case "chat:dm_postit":
  // Delegar para DmPostit
  break;
```

Renderizar `<PlayerChat />` e `<DmPostit />` no layout do player.

### 6. Integrar `DmPostitSender` no client do DM

No componente de lista de combatentes do DM (dentro da area de combate ativo), adicionar botao de post-it ao lado de cada combatente `is_player`.

### 7. Filtrar chat no DM client

No handler de eventos do DM, ignorar explicitamente `chat:player_message`:

```typescript
if (payload.type === "chat:player_message") return; // DM nao ve chat
```

### 8. Adicionar chaves i18n

```json
// messages/pt-BR.json
"chat": {
  "title": "Chat do Grupo",
  "placeholder": "Digite uma mensagem...",
  "send": "Enviar",
  "empty": "Nenhuma mensagem ainda. Diga oi!",
  "unread": "{count} nao lidas",
  "postit_header": "Mensagem do Mestre",
  "postit_send": "Enviar Post-it",
  "postit_placeholder": "Escreva uma nota para o jogador...",
  "postit_sent": "Post-it enviado!",
  "postit_all": "Todos os Players",
  "postit_history": "Post-its Recebidos",
  "postit_empty": "Nenhum post-it recebido."
}

// messages/en.json
"chat": {
  "title": "Party Chat",
  "placeholder": "Type a message...",
  "send": "Send",
  "empty": "No messages yet. Say hi!",
  "unread": "{count} unread",
  "postit_header": "Message from the DM",
  "postit_send": "Send Post-it",
  "postit_placeholder": "Write a note to the player...",
  "postit_sent": "Post-it sent!",
  "postit_all": "All Players",
  "postit_history": "Received Post-its",
  "postit_empty": "No post-its received."
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/types/realtime.ts` | Adicionar `chat:player_message` e `chat:dm_postit` ao `RealtimeEventType`; criar interfaces `RealtimeChatPlayerMessage` e `RealtimeChatDmPostit`; adicionar ao union `SanitizedEvent` |
| `components/player/PlayerChat.tsx` | **NOVO** — Componente de chat entre players (Sheet + lista + input) |
| `components/player/DmPostit.tsx` | **NOVO** — Componente receiver de post-its (notificacao flutuante + historico) |
| `components/combat/DmPostitSender.tsx` | **NOVO** — Componente sender de post-its (Popover + input, usado no DM client) |
| `components/player/PlayerJoinClient.tsx` | Adicionar listeners para novos event types; renderizar `PlayerChat` e `DmPostit` no layout |
| `app/join/[token]/page.tsx` | Nenhuma mudanca (PlayerJoinClient ja e importado) |
| `app/invite/[token]/page.tsx` | Nenhuma mudanca (usa mesmo PlayerJoinClient) |
| `messages/pt-BR.json` | Adicionar namespace `chat` com strings de UI |
| `messages/en.json` | Adicionar namespace `chat` com strings de UI |
| Client do DM (componente de combate ativo) | Adicionar botao de post-it ao lado de players; integrar `DmPostitSender`; filtrar `chat:player_message` no handler |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

1. **Chat — envio e recepcao basica**
   - [ ] Player A envia mensagem no chat
   - [ ] Player B recebe mensagem em < 1 segundo com nome correto do personagem
   - [ ] Player A ve sua propria mensagem como "enviada" (alinhada a direita)

2. **Chat — privacidade do DM**
   - [ ] Player envia mensagem no chat
   - [ ] DM NAO ve a mensagem em nenhum lugar da interface
   - [ ] Inspecionar Network/DevTools no DM — evento chega mas e ignorado

3. **Chat — badge de nao lidas**
   - [ ] Player recebe 3 mensagens com chat fechado
   - [ ] Badge mostra "3" no icone de chat
   - [ ] Player abre o chat — badge reseta para 0

4. **Chat — limite FIFO**
   - [ ] Enviar 55 mensagens rapidamente
   - [ ] Apenas as 50 mais recentes sao visíveis no painel

5. **Post-it — envio direcionado**
   - [ ] DM envia post-it para Player A
   - [ ] Player A ve post-it flutuante no canto superior direito
   - [ ] Player B NAO ve o post-it

6. **Post-it — envio para todos**
   - [ ] DM seleciona "Todos os Players" e envia post-it
   - [ ] Todos os players conectados recebem o post-it

7. **Post-it — auto-dismiss**
   - [ ] Player recebe post-it
   - [ ] Post-it desaparece automaticamente apos 15 segundos
   - [ ] Post-it pode ser fechado manualmente antes dos 15 segundos

8. **Post-it — historico da sessao**
   - [ ] Player recebe 3 post-its, todos auto-dismissam
   - [ ] Player clica no icone de envelope — ve os 3 post-its recebidos

9. **Sessao encerrada — limpeza**
   - [ ] DM encerra sessao
   - [ ] Player perde acesso ao chat e post-its (estado limpo)
   - [ ] Reabrir pagina: nenhum historico de chat ou post-its

10. **Mobile — responsividade**
    - [ ] Chat e post-its funcionam em tela de celular (320px+)
    - [ ] Sheet de chat nao cobre controles criticos de combate

11. **Anon player — funcionalidade**
    - [ ] Player anonimo (join via link) consegue enviar e receber chat
    - [ ] Player anonimo recebe post-its do DM

### Testes Automatizados (recomendados)

- Teste unitario: `PlayerChat` renderiza mensagens corretamente
- Teste unitario: `DmPostit` filtra post-its por target (individual vs all)
- Teste unitario: FIFO de 50 mensagens descarta as mais antigas
- Teste unitario: hash de cor por nome gera cores consistentes
- Teste de integracao: evento `chat:player_message` broadcast e recebido por subscriber

---

## Notas de Paridade

| Modo | Chat de Players | Post-its do DM | Justificativa |
|------|----------------|----------------|---------------|
| **Guest (`/try`)** | N/A | N/A | DM solo nao tem players conectados. Sem realtime. |
| **Anonimo (`/join`)** | SIM — player participa com `character_name` do `session_tokens` | SIM — recebe post-its via `token_id` | Player anonimo tem identidade via token de sessao |
| **Autenticado (`/invite`)** | SIM — player participa com nome do `player_characters` | SIM — recebe post-its via `token_id` ou `user_id` | Player autenticado tem identidade completa |

**Conclusao:** Funciona para Anon + Auth. Guest N/A (feature de multiplayer). Sem impacto no `GuestCombatClient`.

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Spam de mensagens no chat (player mal-intencionado) | Medio | Rate limit client-side: max 1 msg/segundo. Mensagens vazias bloqueadas. Max 500 chars por mensagem. |
| Broadcast nao garante entrega (player pode perder mensagem se conexao cair) | Baixo | Aceitavel para feature efemera. Player reconecta e perde historico — consistente com design "sessao-only". |
| Identidade nao validada server-side (player pode falsificar `sender_name`) | Baixo | Risco aceitavel para MVP. Players estao na mesma mesa presencial — falsificacao e detectavel. Mitigacao futura: assinar mensagem com token_id. |
| Post-it pode ser perdido se player esta com tela bloqueada | Medio | Post-its ficam no historico local (max 20). Player pode revisar via icone de envelope. |
| Aumento de trafego no canal realtime | Baixo | Chat e post-its usam o canal ja existente (`session:${id}`). Mensagens sao pequenas (< 1KB). Rate limit previne flood. |
| Conflito visual com outros toasts/notificacoes | Baixo | Post-its usam posicao top-right dedicada com z-index alto. Toasts do sistema usam bottom-right. |

---

## Definicao de Pronto

- [x] Novos event types (`chat:player_message`, `chat:dm_postit`) adicionados a `lib/types/realtime.ts`
- [x] `PlayerChat.tsx` implementado com envio, recepcao, FIFO de 50 msgs, badge de nao lidas
- [x] `DmPostit.tsx` implementado com notificacao flutuante, auto-dismiss 15s, historico de 20
- [x] `DmPostitSender.tsx` implementado com input, envio individual e "todos"
- [x] Chat integrado no `PlayerJoinClient.tsx` (anon + auth)
- [x] Post-its integrados no `PlayerJoinClient.tsx` (anon + auth)
- [x] DM client filtra `chat:player_message` (nao ve chat de players)
- [x] DM client tem botao de post-it ao lado de cada player (via PlayersOnlinePanel area + per-player combatant buttons)
- [x] Nenhuma nova tabela no banco (zero migrations)
- [x] i18n completo: pt-BR + en (namespace `chat`)
- [x] Layout responsivo (mobile 320px+)
- [ ] Testes manuais 1-11 passando (requer servidor real)
- [ ] Testes unitarios cobrindo filtro de target, FIFO, e renderizacao
- [x] Build sem erros (`next build` passa)
