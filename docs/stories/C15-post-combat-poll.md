# C.15 — Enquete Pos-Combate (Difficulty Poll)

**Epic:** C — Player Agency  
**Prioridade:** Alta  
**Estimativa:** 8 SP  
**Dependencia:** A.3 (broadcast `session:ended`) — player precisa saber que o combate acabou pra votar  
**Arquivos principais:** `components/combat/CombatLeaderboard.tsx`, `components/player/PlayerJoinClient.tsx`, `components/session/CombatSessionClient.tsx`, `lib/types/realtime.ts`, nova migration Supabase

---

## Resumo

Ao encerrar um combate, o DM precisa de feedback sobre a dificuldade do encontro — "foi muito facil? muito dificil? equilibrado?". Essa informacao e essencial pra calibrar encontros futuros. Hoje o combate simplesmente encerra e ninguem pergunta nada.

Esta story implementa uma **enquete de dificuldade pos-combate** com o seguinte fluxo:

```
DM encerra combate
  → DM ve leaderboard + enquete de dificuldade
  → Players veem leaderboard + enquete de dificuldade  ← NOVO (players nao veem leaderboard hoje)
  → Todos votam (1 toque: "Muito Facil" ate "Muito Dificil")
  → DM ve resultado agregado quando todos votaram (ou apos timeout)
  → session:ended finaliza
```

**Pre-requisito incluido nesta story:** Players precisam receber e exibir o leaderboard (hoje so o DM ve). Isso e necessario para o fluxo "ver resumo → votar com contexto".

---

## Contexto Tecnico

### Fluxo atual de encerramento (DM side)

Em `CombatSessionClient.tsx`:

1. **DM clica "End Encounter"** → `handleEndEncounter` (linha 151-162)
   - Computa stats: `computeCombatStats(logEntries)` → `CombatantStats[]`
   - Gera nome: `generateEncounterName(combatants)`
   - Abre modal de nome: `setShowNameModal(true)` + `setPendingStats({ stats, rounds })`

2. **DM confirma nome** → `proceedAfterNaming` (linha 129-148)
   - Atualiza store com nome
   - **Broadcast `session:combat_stats`** (linhas 138-142):
     ```typescript
     broadcastEvent(sid, {
       type: "session:combat_stats",
       stats: pending.stats,
       encounter_name: finalName,
       rounds: pending.rounds,
     });
     ```
   - Mostra leaderboard: `setLeaderboardData(pending.stats)`

3. **DM fecha leaderboard** → `handleDismissLeaderboard` (linha 175-179)
   - Limpa leaderboard + combat log
   - Chama `doEndEncounter()` → persist + `session:ended` broadcast + navigate

### Fluxo atual de encerramento (Player side)

Em `PlayerJoinClient.tsx`:

- **Recebe `session:state_sync`** com `combatants: []` (linhas 436-444)
- Limpa combatants, seta round 0, turn -1
- **NAO tem handler pra `session:combat_stats`** — players nunca veem o leaderboard
- Quando `session:ended` chegar (story A.3), mostra overlay "Sessao encerrada"
- Hoje: player simplesmente ve tela vazia → volta pro lobby

### CombatLeaderboard existente

Em `components/combat/CombatLeaderboard.tsx`:

```typescript
interface CombatLeaderboardProps {
  stats: CombatantStats[];
  encounterName: string;
  rounds: number;
  onClose: () => void;
}
```

Mostra:
- MVP (maior dano dealt) com coroa
- Rankings: todos os combatantes por dano
- Stats secundarios: Tank (dano recebido), Healer, Crit King
- Botoes: Share (clipboard) + Close

### Evento session:combat_stats

Ja definido em `lib/types/realtime.ts` (linhas 163-168):

```typescript
export interface RealtimeCombatStats {
  type: "session:combat_stats";
  stats: CombatantStats[];
  encounter_name: string;
  rounds: number;
}
```

Ja incluido no `SanitizedEvent` union (linha 313) — passa pelo sanitizePayload sem alteracao.

### CombatantStats

Em `lib/utils/combat-stats.ts` (linhas 3-11):

```typescript
export interface CombatantStats {
  name: string;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealing: number;
  knockouts: number;
  criticalHits: number;
  criticalFails: number;
}
```

### Schema existente — encounters table

Em `supabase/migrations/002_session_tables.sql` (linhas 23-34):

```sql
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  round_number INTEGER NOT NULL DEFAULT 1,
  current_turn_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Nao tem: difficulty rating, poll responses, feedback.

---

## Decisoes de UX

> **D9:** Substituir emojis por **icones Lucide + cores**. Cross-platform, acessivel, consistente:
> - `Coffee` (verde) — Muito Facil
> - `Smile` (azul) — Facil
> - `Swords` (gold) — Equilibrado
> - `Flame` (laranja) — Dificil
> - `Skull` (vermelho) — Muito Dificil
>
> **D10:** Poll **SEPARADO** do leaderboard, em sequencia:
> 1. Leaderboard (celebracao pura: stats, MVP, share)
> 2. Player/DM fecha leaderboard
> 3. Poll aparece como card menor: "Como foi?" + 5 opcoes + "Pular"
> 4. Apos votar ou pular → overlay "Sessao encerrada"
>
> Motivo: separa celebracao (emocao positiva) de avaliacao (reflexao). Cada tela tem um proposito.
>
> **D11:** DM **NAO** ve votos em real-time. DM vota no proprio poll. Depois, quando todos votaram (ou DM avanca), ve resultado agregado. Sem ruido visual.
>
> **D12:** Sem timeout visivel. DM sempre pode fechar/avancar. Votos acumulam silenciosamente no Map. Resultado mostrado quando DM pede. Sem spinner, sem "aguardando".

---

## Criterios de Aceite

### Parte 1: Leaderboard na Player View (pre-requisito)

1. **Player recebe `session:combat_stats` e exibe leaderboard.** Quando o DM encerra o combate e o broadcast `session:combat_stats` chega, o player ve o `CombatLeaderboard` existente (mesmo componente que o DM ve). O leaderboard aparece como overlay fullscreen.

2. **Leaderboard mostra dados completos.** MVP, rankings, stats secundarios — identico ao DM. Player ve o nome do encontro e numero de rodadas.

3. **Leaderboard permanece ate player interagir.** O player ve o leaderboard ate clicar "Fechar" ou ate a enquete ser respondida + timeout.

### Parte 2: Enquete de Dificuldade

4. **Enquete como tela SEPARADA apos leaderboard.** Quando player/DM fecha o leaderboard, aparece um card de enquete (nao fullscreen — card centered menor). Titulo: "Como foi a dificuldade?" + 5 opcoes + botao "Pular".

5. **5 opcoes de dificuldade com icones Lucide + cores.** Opcoes dispostas horizontalmente:
   - `Coffee` (verde) — Muito Facil (1)
   - `Smile` (azul) — Facil (2)
   - `Swords` (gold) — Equilibrado (3)
   - `Flame` (laranja) — Dificil (4)
   - `Skull` (vermelho) — Muito Dificil (5)

   Cada opcao e um botao com icone SVG + label. Um toque seleciona. Selecao destaca em gold. Opcoes desabilitam apos voto.

6. **Opcao "Pular".** Botao discreto abaixo das opcoes: "Pular". Player pode nao votar. Nao afeta a media.

7. **Voto unico por participante.** Cada jogador e o DM votam uma vez. Sem alterar voto.

8. **DM NAO ve votos em real-time.** Votos dos players chegam via broadcast e acumulam silenciosamente no Map do DM. Nenhuma UI atualiza enquanto o DM esta votando.

9. **Resultado agregado apos o DM votar/pular.** Quando o DM vota ou pula a enquete, uma tela de resultado aparece: contagem por opcao + media + barra visual. Exemplo: "Equilibrado (media: 3.2) — 3 votos". Se nenhum player votou ainda, mostra "Aguardando votos..." com botao "Fechar mesmo assim".

10. **Votos de players chegam ao DM via broadcast.** Novo evento `player:poll_vote` enviado pelo player. DM acumula votos no Map.

11. **Voto do DM e local.** O DM vota na mesma UI. Voto armazenado localmente (nao broadcast — DM ja esta na tela).

### Parte 3: Persistencia

10. **Resultado salvo no DB (auth only).** Quando o DM fecha o leaderboard (apos ver resultado ou timeout), a media de dificuldade e a contagem de votos sao salvas na tabela `encounters` (novos campos: `difficulty_rating`, `difficulty_votes`). Players anonimos votam mas dados nao persistem no perfil deles — so no encounter do DM.

11. **Guest mode: voto local, sem persistencia.** No guest combat, o DM vota localmente. Nao ha players pra receber votos. O resultado nao e persistido (guest nao tem DB).

### Parte 4: Timing e Flow

12. **Sequencia linear:**
    ```
    session:combat_stats → Leaderboard → [Fechar] → Poll → [Votar/Pular] → Resultado (DM) → [Fechar] → session:ended
    ```
    Para players:
    ```
    session:combat_stats → Leaderboard → [Fechar] → Poll → [Votar/Pular] → "Obrigado!" → session:ended overlay
    ```
    O `session:ended` (story A.3) so e enviado APOS o DM fechar a tela de resultado.

13. **Sem timeout visivel.** DM sempre pode avancar. Nao ha spinner nem "aguardando". Votos acumulam silenciosamente. Resultado mostra o que tiver no momento.

14. **Player offline durante enquete.** Se o player desconectou antes da enquete, seu voto nao e contado. O DM ve resultado dos presentes.

---

## Abordagem Tecnica

### 1. Handler de `session:combat_stats` no Player

Em `PlayerJoinClient.tsx`, adicionar listener de broadcast:

```typescript
// Novos estados
const [combatStatsData, setCombatStatsData] = useState<{
  stats: CombatantStats[];
  encounterName: string;
  rounds: number;
} | null>(null);

// No bloco de setup do canal:
.on("broadcast", { event: "session:combat_stats" }, ({ payload }) => {
  if (payload.stats && payload.encounter_name) {
    setCombatStatsData({
      stats: payload.stats as CombatantStats[],
      encounterName: payload.encounter_name as string,
      rounds: (payload.rounds as number) ?? 0,
    });
  }
})
```

Renderizar antes do return principal (apos check de late-join, antes do initiative board):

```typescript
if (combatStatsData) {
  return (
    <CombatLeaderboard
      stats={combatStatsData.stats}
      encounterName={combatStatsData.encounterName}
      rounds={combatStatsData.rounds}
      onClose={() => setCombatStatsData(null)}
      // Props de enquete:
      pollEnabled
      onPollVote={handlePollVote}
    />
  );
}
```

### 2. Novo evento realtime: `player:poll_vote`

Em `lib/types/realtime.ts`:

```typescript
// Adicionar ao union RealtimeEventType:
| "player:poll_vote"

// Nova interface:
export interface RealtimePlayerPollVote {
  type: "player:poll_vote";
  player_name: string;
  vote: 1 | 2 | 3 | 4 | 5;
}

// Adicionar ao union RealtimeEvent:
| RealtimePlayerPollVote

// NAO adicionar ao SanitizedEvent — suprimido como outros player events
```

Sanitizacao em `broadcast.ts`:

```typescript
if (event.type === "player:poll_vote") return null;
```

### 3. Broadcast do voto pelo Player

Em `PlayerJoinClient.tsx`:

```typescript
const handlePollVote = (vote: 1 | 2 | 3 | 4 | 5) => {
  const ch = channelRef.current;
  if (!ch || connectionStatus !== "connected") return;
  ch.send({
    type: "broadcast",
    event: "player:poll_vote",
    payload: {
      player_name: registeredName,
      vote,
    },
  });
};
```

### 4. Receber votos no DM (CombatSessionClient)

Em `CombatSessionClient.tsx`:

```typescript
// Estado de votos
const [pollVotes, setPollVotes] = useState<Map<string, number>>(new Map());

// Handler
const handlePlayerPollVote = ({ payload }: { payload: Record<string, unknown> }) => {
  const { player_name, vote } = payload as { player_name: string; vote: number };
  if (!player_name || !vote || vote < 1 || vote > 5) return;
  setPollVotes(prev => {
    const next = new Map(prev);
    next.set(player_name, vote);
    return next;
  });
};

ch.on("broadcast", { event: "player:poll_vote" }, handlePlayerPollVote);
```

Fluxo sequencial com state machine no DM:

```typescript
// Estado do fluxo pos-combate
type PostCombatPhase = "leaderboard" | "poll" | "result" | null;
const [postCombatPhase, setPostCombatPhase] = useState<PostCombatPhase>(null);

// Quando stats ficam prontos:
// setPostCombatPhase("leaderboard");

// Render condicional:
{postCombatPhase === "leaderboard" && (
  <CombatLeaderboard
    stats={leaderboardData}
    encounterName={leaderboardMeta.name}
    rounds={leaderboardMeta.rounds}
    onClose={() => setPostCombatPhase("poll")}  // Avanca pra poll
  />
)}

{postCombatPhase === "poll" && (
  <DifficultyPoll
    onVote={(vote) => {
      setPollVotes(prev => { const n = new Map(prev); n.set("DM", vote); return n; });
      setPostCombatPhase("result");
    }}
    onSkip={() => setPostCombatPhase("result")}
  />
)}

{postCombatPhase === "result" && (
  <PollResult
    votes={pollVotes}
    onClose={handleDismissAll}  // Persiste + session:ended + navigate
  />
)}
```

### 5. CombatLeaderboard — SEM alteracao (poll e separado)

O `CombatLeaderboard` NAO recebe props de poll. Continua exatamente como esta. A enquete e um componente separado que aparece APOS o leaderboard ser fechado.

### 5b. Novo componente: DifficultyPoll.tsx

Criar `components/combat/DifficultyPoll.tsx`:

```typescript
interface DifficultyPollProps {
  onVote: (vote: 1 | 2 | 3 | 4 | 5) => void;
  onSkip: () => void;
}

export function DifficultyPoll({ onVote, onSkip }: DifficultyPollProps) {
  const [myVote, setMyVote] = useState<number | null>(null);
  const hasVoted = myVote !== null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h2 className="text-center text-lg font-semibold text-foreground">
          {t("poll_title")}
        </h2>
        <div className="flex justify-center gap-2">
          {DIFFICULTY_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => { if (!hasVoted) { setMyVote(opt.value); onVote(opt.value); } }}
                disabled={hasVoted}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border transition-all",
                  myVote === opt.value ? opt.bgActive
                    : hasVoted ? "opacity-20 border-white/5"
                    : `border-white/10 hover:border-white/20 ${opt.color}`
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] leading-tight font-medium">{t(opt.labelKey)}</span>
              </button>
            );
          })}
        </div>
        {hasVoted && <p className="text-center text-sm text-gold">{t("poll_thanks")}</p>}
        {!hasVoted && (
          <button onClick={onSkip} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
            {t("poll_skip")}
          </button>
        )}
      </div>
    </div>
  );
}
```

### 5c. Novo componente: PollResult.tsx (DM only)

```typescript
interface PollResultProps {
  votes: Map<string, number>;
  onClose: () => void;
}

export function PollResult({ votes, onClose }: PollResultProps) {
  const avg = calculateAverage(votes);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h2 className="text-center text-lg font-semibold">{t("poll_result_title")}</h2>
        <div className="text-center">
          <span className="text-2xl font-bold text-gold">{avg.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground ml-1">/ 5</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("poll_votes_count", { count: votes.size })}
        </p>
        {DIFFICULTY_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const count = Array.from(votes.values()).filter(v => v === opt.value).length;
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${opt.color}`} />
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${opt.bgActive.split(" ")[0]}`}
                  style={{ width: `${votes.size ? (count / votes.size) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
            </div>
          );
        })}
        <button onClick={onClose} className="w-full mt-2 px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm font-medium">
          {t("poll_close")}
        </button>
      </div>
    </div>
  );
}
```

Constantes (usando Lucide icons em vez de emojis — cross-platform):

```typescript
import { Coffee, Smile, Swords, Flame, Skull } from "lucide-react";

const DIFFICULTY_OPTIONS = [
  { value: 1 as const, icon: Coffee, labelKey: "poll_very_easy", color: "text-green-400", bgActive: "bg-green-500/20 border-green-500/50" },
  { value: 2 as const, icon: Smile, labelKey: "poll_easy", color: "text-blue-400", bgActive: "bg-blue-500/20 border-blue-500/50" },
  { value: 3 as const, icon: Swords, labelKey: "poll_balanced", color: "text-gold", bgActive: "bg-gold/20 border-gold/50" },
  { value: 4 as const, icon: Flame, labelKey: "poll_hard", color: "text-orange-400", bgActive: "bg-orange-500/20 border-orange-500/50" },
  { value: 5 as const, icon: Skull, labelKey: "poll_very_hard", color: "text-red-400", bgActive: "bg-red-500/20 border-red-500/50" },
];

function calculateAverage(votes: Map<string, number>): number {
  const values = Array.from(votes.values());
  return values.reduce((a, b) => a + b, 0) / values.length;
}
```

### 6. Timeout de 30s no DM

Em `CombatSessionClient.tsx`, apos mostrar leaderboard:

```typescript
// Quando leaderboard aparece, iniciar timeout
useEffect(() => {
  if (!leaderboardData) return;
  const timer = setTimeout(() => {
    setPollTimedOut(true);
  }, 30_000);
  return () => clearTimeout(timer);
}, [leaderboardData]);
```

O DM ve os votos chegando em tempo real. Apos 30s, ou quando todos votaram, o resultado e "final" e o DM pode fechar.

### 7. Persistencia — novos campos no encounters

Nova migration:

```sql
-- Add difficulty poll columns to encounters
ALTER TABLE encounters
  ADD COLUMN difficulty_rating NUMERIC(2,1),
  ADD COLUMN difficulty_votes INTEGER DEFAULT 0;

COMMENT ON COLUMN encounters.difficulty_rating IS 'Average difficulty rating (1.0-5.0) from post-combat poll';
COMMENT ON COLUMN encounters.difficulty_votes IS 'Number of votes in the difficulty poll';
```

### 8. Salvar resultado no encerramento

Em `handleDismissLeaderboard` de `CombatSessionClient.tsx`, antes de chamar `doEndEncounter`:

```typescript
const handleDismissLeaderboard = async () => {
  // Persistir resultado da enquete se houver votos
  if (pollVotes.size > 0) {
    const avg = calculateAverage(pollVotes);
    const encounterId = useCombatStore.getState().encounter_id;
    if (encounterId) {
      await supabase
        .from("encounters")
        .update({ difficulty_rating: avg, difficulty_votes: pollVotes.size })
        .eq("id", encounterId);
    }
  }
  // Fluxo existente
  setLeaderboardData(null);
  useCombatLogStore.getState().clear();
  doEndEncounter();
};
```

### 9. Guest combat — voto local

Em `GuestCombatClient.tsx`, o DM e o unico usuario. Adicionar enquete ao leaderboard com `pollEnabled` mas sem `pollVotes` (Map vazio). O DM vota localmente. Resultado nao persiste (guest nao tem encounter_id no DB).

```typescript
<CombatLeaderboard
  stats={leaderboardData}
  encounterName={...}
  rounds={...}
  onClose={handleLeaderboardClose}
  pollEnabled
  onPollVote={(vote) => { /* local state only */ }}
/>
```

### 10. Novas chaves i18n

Em `messages/pt-BR.json`:

```json
"poll_title": "Como foi a dificuldade?",
"poll_very_easy": "Muito Facil",
"poll_easy": "Facil",
"poll_balanced": "Equilibrado",
"poll_hard": "Dificil",
"poll_very_hard": "Muito Dificil",
"poll_votes_count": "{count} votos",
"poll_average": "media: {avg}",
"poll_thanks": "Voto registrado!",
"poll_skip": "Pular",
"poll_result_title": "Resultado da Enquete",
"poll_close": "Fechar"
```

Em `messages/en.json`:

```json
"poll_title": "How was the difficulty?",
"poll_very_easy": "Very Easy",
"poll_easy": "Easy",
"poll_balanced": "Balanced",
"poll_hard": "Hard",
"poll_very_hard": "Very Hard",
"poll_votes_count": "{count} votes",
"poll_average": "average: {avg}",
"poll_thanks": "Vote recorded!",
"poll_skip": "Skip",
"poll_result_title": "Poll Results",
"poll_close": "Close"
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/types/realtime.ts` | Novo tipo `player:poll_vote`, interface `RealtimePlayerPollVote`, adicionar aos unions |
| `lib/realtime/broadcast.ts` | Suprimir `player:poll_vote` em `sanitizePayload()` |
| `components/combat/DifficultyPoll.tsx` (novo) | Componente de enquete: 5 opcoes Lucide + skip |
| `components/combat/PollResult.tsx` (novo) | Componente de resultado agregado (DM only): barras visuais + media |
| `components/combat/CombatLeaderboard.tsx` | Nenhuma alteracao (poll e separado) |
| `components/player/PlayerJoinClient.tsx` | Handler de `session:combat_stats` → estado `combatStatsData`, renderizar leaderboard, callback `handlePollVote` |
| `components/session/CombatSessionClient.tsx` | Estado `pollVotes`, handler `handlePlayerPollVote`, timeout 30s, persistir resultado em `handleDismissLeaderboard` |
| `components/guest/GuestCombatClient.tsx` | Passar `pollEnabled` + `onPollVote` local ao CombatLeaderboard |
| `supabase/migrations/XXX_add_difficulty_poll.sql` (nova) | ALTER TABLE encounters ADD difficulty_rating, difficulty_votes |
| `messages/pt-BR.json` | Chaves de poll |
| `messages/en.json` | Chaves de poll |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

**Parte 1: Leaderboard na Player View**

1. **Player recebe leaderboard**
   - [ ] DM encerra combate, nomeia encounter
   - [ ] Player ve CombatLeaderboard com MVP, rankings, stats
   - [ ] Nome do encontro e numero de rodadas corretos
   - [ ] Leaderboard e overlay fullscreen

2. **Leaderboard com dados variados**
   - [ ] Combate com 3+ combatentes → rankings completos
   - [ ] Combate sem dano (todos com 0) → leaderboard vazio mas funcional
   - [ ] Stats secundarios (Tank, Healer, Crit King) aparecem se aplicavel

3. **Multiplos players veem leaderboard**
   - [ ] 2+ players conectados → todos recebem leaderboard simultaneamente
   - [ ] Dados identicos pra todos (mesmo ranking, mesmos stats)

**Parte 2: Enquete de Dificuldade**

4. **Player vota dificuldade**
   - [ ] Abaixo dos stats do leaderboard, secao "Como foi a dificuldade?" aparece
   - [ ] 5 opcoes com icones: 😴 🙂 ⚔️ 😰 💀
   - [ ] Clicar numa opcao destaca em gold
   - [ ] Opcoes ficam desabilitadas apos voto (sem alterar)
   - [ ] Voto unico por player

5. **DM vota dificuldade**
   - [ ] DM tambem ve enquete no leaderboard
   - [ ] DM vota com mesma UI
   - [ ] Voto do DM aparece na contagem

6. **DM ve votos chegando**
   - [ ] Player 1 vota → DM ve "1 voto"
   - [ ] Player 2 vota → DM ve "2 votos · media: X.X"
   - [ ] Atualizacao em tempo real

7. **Timeout de 30s**
   - [ ] Apos 30s sem todos votarem, DM pode fechar normalmente
   - [ ] Resultado parcial e exibido

8. **DM fecha leaderboard → resultado persiste**
   - [ ] DM clica "Fechar" → resultado salvo no DB (encounters.difficulty_rating, difficulty_votes)
   - [ ] Verificar no DB: difficulty_rating = media correta, difficulty_votes = contagem correta

**Parte 3: Guest Mode**

9. **Guest combat — enquete local**
   - [ ] DM no guest mode ve enquete no leaderboard
   - [ ] DM vota localmente
   - [ ] Nao ha players pra receber votos
   - [ ] Resultado nao persiste (guest nao tem DB)

**Parte 4: Edge Cases**

10. **Player desconectado durante enquete**
    - [ ] Player desconecta antes de votar → DM nao recebe voto → contagem correta
    - [ ] Player desconecta apos votar → voto ja foi recebido → contagem inclui

11. **Combate encerrado rapidamente (< 5s)**
    - [ ] DM inicia e encerra em 5s → leaderboard com 0 rounds/0 damage funciona
    - [ ] Enquete aparece normalmente

12. **Player anonimo vs autenticado**
    - [ ] Player anonimo (`/join`) ve leaderboard e pode votar
    - [ ] Player autenticado (`/invite`) ve leaderboard e pode votar
    - [ ] Comportamento identico

13. **Sem stats (leaderboard vazio)**
    - [ ] Se nao houve dano/cura → leaderboard mostra "Nenhum combatente com stats"
    - [ ] Enquete ainda aparece e funciona

### Testes Automatizados (recomendados)

- **Unit test** para `calculateAverage`: dado Map com votos variados, calcula media correta
- **Unit test** para sanitizePayload: `player:poll_vote` retorna `null`
- **Migration test**: campos `difficulty_rating` e `difficulty_votes` existem e aceitam valores corretos

---

## Notas de Paridade

- **Guest Combat (DM offline):** DM ve leaderboard existente + enquete (voto local). Nao ha players pra broadcast. Resultado nao persiste. **Mudanca minima: adicionar props de poll ao CombatLeaderboard.**
- **Player anonimo (`/join`):** Recebe `session:combat_stats` via broadcast, ve leaderboard, vota via `player:poll_vote`. Voto chega ao DM. **Funciona identicamente ao autenticado.**
- **Player autenticado (`/invite`):** Mesmo fluxo. Voto e associado ao encounter no DB (via DM persist). **Paridade automatica.**
- **DM logado (CombatSessionClient):** Ve leaderboard existente + enquete + votos dos players em tempo real. Persiste resultado no DB ao fechar. **Flow completo.**
- **CombatLeaderboard existente:** Recebe props opcionais — zero breaking change. Se `pollEnabled` nao for passado, comportamento identico ao atual.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Broadcast `session:combat_stats` nao chega ao player | Coberto pelo mesmo risco de A.3. Se broadcast falha, player nao ve leaderboard nem enquete — volta pro lobby normalmente. Enquete e "nice to have", nao blocker. |
| Player vota mais de uma vez (manipulacao) | Servidor nao valida (DM e quem persiste). Mas o DM Map usa `player_name` como key — segundo voto sobrescreve o primeiro. Anti-spam implicito. |
| Voto do DM nao e separado dos players | DM vota com key "DM" no Map. Na UI, todos os votos sao iguais. Na persistencia, so a media e salva. |
| Migration altera tabela existente | ALTER TABLE ADD COLUMN e non-destructive. Default null pra encounters existentes. Zero downtime. |
| Timeout de 30s pode ser curto | 30s e suficiente pra 1 toque. Se grupo grande, DM pode esperar mais (timeout so habilita o close, nao forca). |
| CombatLeaderboard cresce demais com poll | Poll e uma secao compacta (5 botoes horizontais + 1 linha de resultado). Scroll no Dialog ja cobre. |

---

## Definicao de Pronto

### Parte 1 — Leaderboard na Player View
- [ ] Handler de `session:combat_stats` no PlayerJoinClient
- [ ] Player ve CombatLeaderboard com dados completos
- [ ] Multiplos players recebem leaderboard simultaneamente

### Parte 2 — Enquete de Dificuldade
- [ ] Secao de enquete no CombatLeaderboard (5 opcoes com icones)
- [ ] Player vota com 1 toque, opcoes desabilitam apos voto
- [ ] Broadcast `player:poll_vote` enviado ao DM
- [ ] DM ve votos em tempo real + media
- [ ] DM vota localmente
- [ ] Timeout de 30s habilita close sem todos votarem

### Parte 3 — Persistencia
- [ ] Migration: `difficulty_rating` e `difficulty_votes` na tabela encounters
- [ ] DM salva resultado ao fechar leaderboard
- [ ] Guest mode: enquete local, sem persistencia

### Parte 4 — Qualidade
- [ ] Tipo `player:poll_vote` em realtime.ts
- [ ] Evento suprimido em sanitizePayload
- [ ] Chaves i18n em pt-BR e en
- [ ] Testes manuais 1-13 passando
- [ ] Nenhuma regressao no CombatLeaderboard existente
- [ ] Code review aprovado
