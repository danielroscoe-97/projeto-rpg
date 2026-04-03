# PHQ-E7-F16 — Quest Board: Visao do Jogador Logado

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Media
**Estimativa:** 3 SP
**Dependencia:** F-39 (quest board DM implementado, tabela campaign_quests existe), PHQ-E1-F1 (Player HQ rota existe)
**Arquivos principais:** `components/player-hq/PlayerQuestBoard.tsx` (novo), `app/(authenticated)/campaign/[id]/quests/page.tsx` (novo)

---

## Resumo

F-39 implementou o Quest Board do DM: o mestre cria e gerencia quests com status (Disponivel, Ativa, Completada). Esta story adiciona a **visao do jogador logado** no Player HQ — read-only por padrao, focada em saber quais missoes estao ativas e o que ja foi completado.

O jogador nao pode criar ou editar quests (isso e poder do DM). Mas pode **adicionar notas pessoais** a uma quest ("minha teoria sobre como resolver") e marcar quests como favoritas para acompanhar mais de perto.

---

## Decisoes de UX

**D1: Aba "Quests" no Player HQ.** Quinta aba da navegacao inferior: Icone de pergaminho/mapa.

**D2: Tres listas separadas: Ativas, Disponiveis, Completadas.** Ativas primeiro (urgencia), Disponiveis segundo (oportunidade), Completadas colapsadas no final (historico).

**D3: Card de quest: titulo + descricao + notas do DM.** Identico ao que o DM ve, mas sem os controles de edicao. Tap expande para ver a descricao completa.

**D4: Nota pessoal do jogador na quest.** No card expandido, apos a descricao do DM, campo "Minhas Notas" — textarea privada. Funciona identico ao NPC Journal: autosave, privado por RLS.

**D5: Favoritar quest.** Icone de estrela em cada quest. Quests favoritadas aparecem com destaque na lista. Util para quests importantes ao arco do personagem.

**D6: Badge de quests novas.** Se o DM adicionou novas quests desde a ultima vez que o jogador abriu a aba, badge "Nova" aparece no card da quest e no icone da aba. Marker de "ja visto" salvo em localStorage (simples, sem banco).

---

## Contexto Tecnico

### Tabela existente: campaign_quests (migration 055)

```sql
-- Ja existe:
campaign_quests (
  id, campaign_id, title, description,
  status: 'available' | 'active' | 'completed',
  sort_order, created_at, updated_at
)

-- RLS existente:
-- DM: ALL (owner da campanha)
-- Players: SELECT (is_campaign_member)
```

### Nova tabela: player_quest_notes

```sql
-- migration nova (apos 062)
CREATE TABLE player_quest_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id      UUID NOT NULL REFERENCES campaign_quests(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  notes         TEXT,
  is_favorite   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quest_id, user_id)
);

ALTER TABLE player_quest_notes ENABLE ROW LEVEL SECURITY;

-- Somente o proprio jogador ve suas notas de quest
CREATE POLICY quest_notes_owner ON player_quest_notes
  FOR ALL USING (user_id = auth.uid());
```

### Hook usePlayerQuestBoard

```typescript
export function usePlayerQuestBoard(campaignId: string) {
  const [quests, setQuests] = useState<QuestWithPlayerNotes[]>([]);

  // Busca quests + notas pessoais do jogador em join
  useEffect(() => {
    supabase
      .from('campaign_quests')
      .select(`
        *,
        player_notes:player_quest_notes(notes, is_favorite)
      `)
      .eq('campaign_id', campaignId)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setQuests(data ?? []));
  }, [campaignId]);

  const saveNote = async (questId: string, notes: string) => {
    await supabase.from('player_quest_notes').upsert({
      quest_id: questId,
      user_id: (await supabase.auth.getUser()).data.user!.id,
      campaign_id: campaignId,
      notes,
    }, { onConflict: 'quest_id,user_id' });
  };

  const toggleFavorite = async (questId: string, current: boolean) => {
    await supabase.from('player_quest_notes').upsert({
      quest_id: questId,
      user_id: (await supabase.auth.getUser()).data.user!.id,
      campaign_id: campaignId,
      is_favorite: !current,
    }, { onConflict: 'quest_id,user_id' });
  };

  const activeQuests = quests.filter(q => q.status === 'active');
  const availableQuests = quests.filter(q => q.status === 'available');
  const completedQuests = quests.filter(q => q.status === 'completed');

  return { activeQuests, availableQuests, completedQuests, saveNote, toggleFavorite };
}
```

---

## Criterios de Aceite

### Aba Quests

1. Aba "Quests" na navegacao do Player HQ (icone de mapa/pergaminho).
2. Tres secoes: "Em Andamento", "Disponiveis", "Completadas" (colapsada).
3. Empty state por secao se nao ha quests naquele status.

### Cards de Quest

4. Cada quest: titulo + primeiros 80 chars da descricao do DM.
5. Badge de status: "Ativa" (dourado), "Disponivel" (cinza), "Completada" (verde).
6. Icone de estrela para favoritar.
7. Quest favoritada: estrela preenchida + borda dourada no card.
8. Tap expande o card para ver a descricao completa.

### Notas Pessoais

9. No card expandido, secao "Minhas Notas" apos a descricao do DM.
10. Textarea com placeholder "O que voce sabe sobre esta quest?"
11. Autosave apos 1s de inatividade.
12. Notas privadas — DM nao ve (RLS).

### Favoritos

13. Tap na estrela: alterna favorito.
14. Quests favoritadas aparecem antes das outras dentro de cada grupo.
15. Estado persiste no banco.

### Badge "Nova"

16. Quests adicionadas pelo DM desde a ultima visita do jogador: badge "Nova" no card.
17. Marcador de "ja visto" salvo em localStorage: `quest_seen_{questId}_{userId}`.
18. Badge some apos o jogador abrir a aba Quests.

### Realtime

19. Se DM adiciona nova quest enquanto jogador esta online: quest aparece em < 5s (subscription na tabela campaign_quests).

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `supabase/migrations/064_player_quest_notes.sql` | Criar | Tabela player_quest_notes + RLS |
| `lib/types/database.ts` | Editar | Tipos QuestWithPlayerNotes, PlayerQuestNote |
| `hooks/usePlayerQuestBoard.ts` | Criar | Quests + notas + favoritos + realtime |
| `components/player-hq/PlayerQuestBoard.tsx` | Criar | Board com 3 secoes |
| `components/player-hq/PlayerQuestCard.tsx` | Criar | Card expansivel + notas + favorito |
| `app/(authenticated)/campaign/[id]/quests/page.tsx` | Criar | Aba Quests do Player HQ |
| `messages/pt-BR.json` | Editar | Strings de quests |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. DM cria quest "Resgatar o prisioneiro" como Ativa: jogador ve na secao "Em Andamento".
2. Jogador adiciona nota "Suspeito que o prisioneiro e o rei": autosave funciona.
3. DM nao ve a nota (RLS).
4. Jogador favorita a quest: estrela preenchida + borda dourada.
5. DM marca quest como Completada: move para "Completadas" em < 5s (realtime).
6. Nova quest adicionada pelo DM: badge "Nova" aparece no card.
7. Jogador abre aba: badge "Nova" some.
8. Quest sem notas do jogador: textarea vazia com placeholder.

---

## Notas de Paridade

| Modo | Aplica? | Nota |
|---|---|---|
| Guest | NAO | Auth-only |
| Anonimo (`/join`) | Parcial | Ve quests da sessao (F-39 existente), sem notas pessoais |
| Autenticado (Player) | SIM | Ve + adiciona notas + favorita |
| Autenticado (DM) | NAO | DM usa o Quest Board proprio (F-39) |

---

## Definicao de Pronto

- [ ] Migration player_quest_notes com RLS privado
- [ ] usePlayerQuestBoard com quests + notas + favoritos + realtime
- [ ] PlayerQuestBoard com 3 secoes
- [ ] PlayerQuestCard com notas privadas + favorito + badge "Nova"
- [ ] Aba Quests no Player HQ com navegacao
- [ ] Autosave de notas funcionando
- [ ] Build sem erros
