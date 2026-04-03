# PHQ-E6-F14 — Player Notes: Journal por Sessao + Notas Rapidas

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Media
**Estimativa:** 5 SP
**Dependencia:** PHQ-E1-F1 (Player HQ rota existe), migration 062 (player_journal_entries)
**Arquivos principais:** `components/player-hq/PlayerNotesSection.tsx` (novo), `components/player-hq/JournalEntry.tsx` (novo), `hooks/usePlayerNotes.ts` (novo), `supabase/migrations/062_player_journal.sql` (novo)

---

## Resumo

Entre e durante as sessoes, o jogador quer registrar o que aconteceu, NPCs que conheceu, locais visitados, teorias sobre o plot. Tudo isso some no papel ou fica perdido no celular.

Esta story implementa a aba **Notas** do Player HQ com dois modos: **notas rapidas** (tipo post-it, adiciona em segundos) e **journal de sessao** (entrada mais longa associada a uma sessao especifica).

As notas sao privadas do jogador — o DM nao ve. Isso e intencional: o jogador precisa de espaco para especular, anotar suspeitas, planejar acoes sem que o DM leia.

---

## Decisoes de UX

**D1: Duas abas dentro da aba Notas.** "Rapidas" e "Journal". Notas rapidas para anotacoes curtas e frequentes durante a sessao. Journal para entradas mais estruturadas, por sessao.

**D2: Nota rapida: tap + digita + salva.** Botao "+" flutuante. Tap abre um textarea simples (full width). Salva automaticamente ao focar fora (autosave). Sem titulo, sem categorias. Texto livre, max 500 chars. Identica ao conceito de post-it do DM (F-38), mas privado.

**D3: Journal de sessao: entrada com titulo e data.** Cada entrada do journal pode ter: titulo (opcional), data, conteudo livre (textarea). Se a campanha tem sessoes registradas, o jogador pode associar a entrada a uma sessao especifica (dropdown). Caso contrario, usa a data atual.

**D4: Notas rapidas em ordem cronologica reversa.** Mais recente no topo. Cada nota mostra: conteudo + data relativa. Swipe left (mobile) ou botao de delete para remover.

**D5: Journal com cards expansiveis.** Cada entrada do journal exibe: titulo (ou primeiros 60 chars do conteudo) + data + badge da sessao. Tap expande para ler completo + editar.

**D6: Privacidade visual clara.** Icone de cadeado na aba Notas com tooltip "Suas notas sao privadas — o mestre nao pode ver." Transparencia que gera confianca.

---

## Contexto Tecnico

### Migration 062

```sql
-- supabase/migrations/062_player_journal.sql
CREATE TABLE player_journal_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id  UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id          UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL DEFAULT 'quick_note'
    CHECK (type IN ('quick_note', 'journal')),
  title                TEXT,
  content              TEXT NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journal_character ON player_journal_entries(player_character_id, type, created_at DESC);

ALTER TABLE player_journal_entries ENABLE ROW LEVEL SECURITY;

-- Somente o proprio jogador ve suas notas (privacidade garantida por RLS)
CREATE POLICY journal_owner_only ON player_journal_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_character_id AND user_id = auth.uid()
    )
  );
-- DM NAO tem politica de SELECT — privacidade total

CREATE TRIGGER set_journal_updated_at
  BEFORE UPDATE ON player_journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Nota de seguranca:** O DM nao tem politica RLS de SELECT na tabela `player_journal_entries`. Mesmo que tente acessar via client, recebera array vazio. Privacidade garantida pelo banco.

### Hook usePlayerNotes

```typescript
export function usePlayerNotes(characterId: string) {
  const [quickNotes, setQuickNotes] = useState<JournalEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  const addQuickNote = async (content: string) => {
    const entry = {
      player_character_id: characterId,
      campaign_id: campaignId,
      type: 'quick_note' as const,
      content,
    };
    // Optimistic insert
    const tempId = crypto.randomUUID();
    setQuickNotes(prev => [{ ...entry, id: tempId, created_at: new Date().toISOString() }, ...prev]);
    await supabase.from('player_journal_entries').insert(entry);
  };

  const addJournalEntry = async (title: string, content: string) => { /* similar */ };
  const updateEntry = async (id: string, updates: Partial<JournalEntry>) => { /* */ };
  const deleteEntry = async (id: string) => { /* */ };

  return { quickNotes, journalEntries, addQuickNote, addJournalEntry, updateEntry, deleteEntry };
}
```

---

## Criterios de Aceite

### Aba Notas

1. Aba "Notas" no Player HQ com sub-abas "Rapidas" e "Journal".
2. Icone de cadeado na header da aba com tooltip de privacidade.

### Notas Rapidas

3. Botao "+" abre textarea full-width inline.
4. Autosave ao desfocar (ou apos 2s de inatividade).
5. Nota salva aparece no topo da lista.
6. Cada nota exibe: conteudo + data relativa ("ha 5 min", "ontem").
7. Tap na nota abre para edicao inline.
8. Swipe left ou botao de delete: remove com confirmacao rapida.
9. Empty state: "Nenhuma nota rapida. Toque em + para comecar."
10. Max 500 chars por nota rapida (contador visivel).

### Journal

11. Botao "Nova Entrada" abre form com: Titulo (opcional) + Conteudo (obrigatorio).
12. Conteudo com textarea redimensionavel (min 4 linhas).
13. Salvar persiste no banco com `type = 'journal'`.
14. Lista de entradas com cards expansiveis: titulo/preview + data.
15. Tap expande card para leitura + botao de editar.
16. Editar: form identico ao de criacao, pre-preenchido.
17. Empty state: "Nenhuma entrada no journal. Registre o que aconteceu na ultima sessao!"

### Privacidade

18. RLS garante que DM nao pode acessar notas via API.
19. Icone de cadeado visivel na aba.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `supabase/migrations/062_player_journal.sql` | Criar | Tabela + RLS (sem politica de DM) |
| `lib/types/database.ts` | Editar | Tipo JournalEntry |
| `hooks/usePlayerNotes.ts` | Criar | CRUD notas + journal |
| `components/player-hq/PlayerNotesSection.tsx` | Criar | Container com sub-abas |
| `components/player-hq/QuickNotesList.tsx` | Criar | Lista de notas rapidas |
| `components/player-hq/JournalEntryCard.tsx` | Criar | Card expansivel do journal |
| `app/(authenticated)/campaign/[id]/notes/page.tsx` | Criar | Aba Notas do Player HQ |
| `messages/pt-BR.json` | Editar | Strings de notas |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Adicionar nota rapida "Aldric sabe algo sobre o rei": aparece no topo.
2. Editar nota: conteudo atualiza.
3. Remover nota: some apos confirmacao.
4. Criar entrada de journal "Sessao 3": salva com tipo journal.
5. Expandir entrada: conteudo completo visivel + botao editar.
6. Verificar via Supabase dashboard: DM nao consegue SELECT na tabela sem ser o dono.
7. Autosave: digitar nota + clicar fora = salva sem botao.
8. Max 500 chars: contador exibe "480/500", nao permite mais.

---

## Notas de Paridade

| Modo | Aplica? | Nota |
|---|---|---|
| Guest | NAO | Auth-only |
| Anonimo | NAO | Auth-only |
| Player logado | SIM | Notas privadas do personagem |
| DM logado | NAO | DM nao tem acesso — privacidade por RLS |

---

## Definicao de Pronto

- [ ] Migration 062 com RLS exclusivo do dono (sem acesso DM)
- [ ] Notas rapidas: CRUD + autosave + limite 500 chars
- [ ] Journal: CRUD com titulo + conteudo expandivel
- [ ] Privacidade verificada via teste de acesso com conta DM
- [ ] Icone de cadeado visivel
- [ ] Build sem erros
