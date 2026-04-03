# F-40 — Notas dos Players Durante Combate

**Epic:** F — Player Experience (Area Logada)  
**Prioridade:** Media  
**Estimativa:** 3 SP  
**Dependencia:** Migration 052 aplicada (RLS de `campaign_notes` + `is_campaign_member()` funcional)  
**Arquivos principais:** `components/player/PlayerSharedNotes.tsx`, `components/player/PlayerJoinClient.tsx`, `components/dashboard/CampaignNotes.tsx`, `supabase/migrations/053_player_notes_rls.sql` (novo), `messages/pt-BR.json`, `messages/en.json`

---

## Resumo

Na mesa, o jogador anota coisas durante o combate: "Goblin #3 parece ser o lider", "Faltam 2 slots de 3o nivel", "Lembrar de investigar a porta". Hoje, o player so ve notas compartilhadas pelo DM (read-only via `PlayerSharedNotes`). Nao consegue criar suas proprias notas.

Esta story permite ao jogador **criar notas pessoais durante o combate** — textarea simples, auto-save com debounce, privadas por padrao. O DM ganha visibilidade sobre notas dos players em `CampaignNotes` (nova aba/filtro "Notas dos Jogadores"). Radical simplicity: sem titulo obrigatorio, sem pastas, sem formatacao rich text — so texto livre.

---

## Decisoes de UX

> **D1:** Notas do player aparecem **abaixo** das notas compartilhadas pelo DM no painel de notas (`PlayerJoinClient`). Secao separada com header "Minhas Notas".
>
> **D2:** Botao "+" (Plus icon) no header da secao cria nova nota. Nota nasce vazia, com foco automatico no textarea. Sem titulo obrigatorio — campo title fica como string vazia.
>
> **D3:** **Auto-save com debounce de 1.5s** — mesmo pattern do `PlayerCharacterManager.tsx` (dm_notes). Indicador visual: "Salvando..." / "Salvo" / icone check discreto (text-xs, text-muted-foreground).
>
> **D4:** Notas do player sao `is_shared=false` por padrao (privadas). Apenas o dono ve. Sem toggle de compartilhamento nesta story (bucket futuro).
>
> **D5:** Botao de deletar nota (Trash2 icon, confirmar com dialog simples). Sem undo — deletar e permanente.
>
> **D6:** DM ve notas dos players em `CampaignNotes` como secao read-only: "Notas dos Jogadores" com badge do nome do player. DM **nao edita** notas dos players.
>
> **D7:** Maximo de **10 notas** por player por campanha (soft limit no frontend). Mensagem "Limite de notas atingido" se tentar criar a 11a.

---

## Contexto Tecnico

### PlayerSharedNotes.tsx (existente)

Componente read-only que busca `campaign_notes` onde `is_shared=true`:

```typescript
interface PlayerSharedNotesProps {
  campaignId: string;
}
// Query: .eq("campaign_id", campaignId).eq("is_shared", true)
```

Sera **estendido** (nao substituido) pra incluir secao de notas pessoais abaixo.

### Schema campaign_notes (existente)

```sql
campaign_notes {
  id UUID PK,
  campaign_id UUID FK → campaigns,
  user_id UUID FK → auth.users,
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  folder_id UUID FK → campaign_note_folders (nullable),
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
}
```

Campo `user_id` ja existe — hoje populado apenas com o ID do DM. Players usarao o mesmo campo.

### RLS atual (problema)

```sql
-- Migration 030: DM can manage own campaign notes
-- Politica: campaigns.owner_id = auth.uid()

-- Migration 052: Members can read shared notes
-- Politica: is_shared = true AND is_campaign_member(campaign_id)
```

**Players NAO podem INSERT/UPDATE/DELETE.** Nova migration necessaria.

### Pattern de auto-save (PlayerCharacterManager.tsx)

```typescript
const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

const handleNotesChange = (charId: string, value: string) => {
  setNotesValues((prev) => ({ ...prev, [charId]: value }));
  if (notesTimers.current[charId]) clearTimeout(notesTimers.current[charId]);
  notesTimers.current[charId] = setTimeout(() => saveNotes(charId, value), 1500);
};
```

Replicar esse pattern para notas do player.

### PlayerJoinClient.tsx (integracao)

Linhas 1613-1629: renderiza `PlayerSharedNotes` condicionalmente:

```tsx
{showNotes && campaignId && (
  <div className="bg-card border border-border rounded-md p-4" data-testid="player-notes">
    <PlayerSharedNotes campaignId={campaignId} />
  </div>
)}
```

O componente `PlayerSharedNotes` sera estendido pra renderizar as notas pessoais do player tambem.

---

## Criterios de Aceite

### RLS / Backend

1. **Nova migration** cria policy que permite players fazerem INSERT/UPDATE/DELETE em `campaign_notes` onde `user_id = auth.uid() AND is_campaign_member(campaign_id)`.

2. Players continuam podendo SELECT notas compartilhadas (`is_shared=true`) — policy existente nao muda.

3. Players podem SELECT suas proprias notas (`user_id = auth.uid()`) — nova policy.

4. DM continua com acesso total (ALL) a todas as notas da campanha — policy existente nao muda.

### UI Player

5. No painel de notas (`PlayerSharedNotes`), abaixo das notas compartilhadas pelo DM, aparece secao "Minhas Notas" com divider visual.

6. Botao "+" no header "Minhas Notas" cria nova nota vazia com textarea focado.

7. Textarea com auto-save debounced (1.5s). Indicador "Salvando..." durante persist, "Salvo" apos sucesso.

8. Cada nota tem botao de deletar (Trash2 icon). Click abre confirm dialog. Confirmar deleta do banco.

9. Notas do player ordenadas por `updated_at` descendente.

10. Soft limit: maximo 10 notas por player. Botao "+" desabilitado quando atingir 10, com tooltip "Limite atingido".

11. Notas criadas com `is_shared=false` (privadas por padrao). Sem toggle de compartilhamento.

### UI DM

12. Em `CampaignNotes`, nova secao/filtro "Notas dos Jogadores" lista notas onde `user_id != owner_id` (ou seja, notas de members que nao sao o DM).

13. Cada nota de player exibe badge com nome do jogador (join `campaign_members` + `profiles` ou `auth.users`).

14. DM ve notas de players como read-only — sem edicao, sem delete.

### i18n

15. Todas as strings em `messages/pt-BR.json` e `messages/en.json` sob namespaces `player` e `dashboard`.

---

## Abordagem Tecnica

### Passo 1: Nova migration RLS

**`supabase/migrations/053_player_notes_rls.sql`:**

```sql
-- Players can read their own notes (private or shared)
DROP POLICY IF EXISTS "player_own_notes_select" ON campaign_notes;
CREATE POLICY "player_own_notes_select" ON campaign_notes
  FOR SELECT USING (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  );

-- Players can create notes in campaigns they belong to
DROP POLICY IF EXISTS "player_notes_insert" ON campaign_notes;
CREATE POLICY "player_notes_insert" ON campaign_notes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  );

-- Players can update their own notes
DROP POLICY IF EXISTS "player_notes_update" ON campaign_notes;
CREATE POLICY "player_notes_update" ON campaign_notes
  FOR UPDATE USING (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  );

-- Players can delete their own notes
DROP POLICY IF EXISTS "player_notes_delete" ON campaign_notes;
CREATE POLICY "player_notes_delete" ON campaign_notes
  FOR DELETE USING (
    user_id = auth.uid()
    AND public.is_campaign_member(campaign_id)
  );
```

### Passo 2: Estender PlayerSharedNotes

**`components/player/PlayerSharedNotes.tsx`:**

Adicionar props `userId` (do auth). Apos listar notas compartilhadas do DM, buscar notas do proprio player:

```typescript
interface PlayerSharedNotesProps {
  campaignId: string;
  userId?: string; // se presente, habilita notas pessoais
}

// Novas queries:
// 1. Notas compartilhadas (existente): .eq("is_shared", true)
// 2. Notas do player (nova): .eq("user_id", userId).eq("is_shared", false)
```

Adicionar estado e handlers para CRUD:

```typescript
const [myNotes, setMyNotes] = useState<PlayerNote[]>([]);
const [savingStatus, setSavingStatus] = useState<Record<string, "saving" | "saved" | "idle">>({});
const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

const handleNoteChange = (noteId: string, content: string) => {
  setMyNotes(prev => prev.map(n => n.id === noteId ? { ...n, content } : n));
  if (debounceTimers.current[noteId]) clearTimeout(debounceTimers.current[noteId]);
  setSavingStatus(prev => ({ ...prev, [noteId]: "idle" }));
  debounceTimers.current[noteId] = setTimeout(() => persistNote(noteId, content), 1500);
};

const persistNote = async (noteId: string, content: string) => {
  setSavingStatus(prev => ({ ...prev, [noteId]: "saving" }));
  const { error } = await supabase
    .from("campaign_notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("user_id", userId);
  setSavingStatus(prev => ({ ...prev, [noteId]: error ? "idle" : "saved" }));
};

const handleAddNote = async () => {
  if (myNotes.length >= 10) return;
  const { data, error } = await supabase
    .from("campaign_notes")
    .insert({
      campaign_id: campaignId,
      user_id: userId,
      title: "",
      content: "",
      is_shared: false,
    })
    .select()
    .single();
  if (data) setMyNotes(prev => [data, ...prev]);
};

const handleDeleteNote = async (noteId: string) => {
  await supabase.from("campaign_notes").delete().eq("id", noteId).eq("user_id", userId);
  setMyNotes(prev => prev.filter(n => n.id !== noteId));
};
```

### Passo 3: Atualizar PlayerJoinClient

**`components/player/PlayerJoinClient.tsx`:**

Passar `userId` pro `PlayerSharedNotes`:

```tsx
{showNotes && campaignId && (
  <div className="bg-card border border-border rounded-md p-4" data-testid="player-notes">
    {/* ... header existente ... */}
    <PlayerSharedNotes campaignId={campaignId} userId={authUserId} />
  </div>
)}
```

O `authUserId` ja e acessivel no componente (usado para identificar membro autenticado). Se nao passar `userId`, o componente funciona como antes (read-only shared notes).

### Passo 4: Secao DM em CampaignNotes

**`components/dashboard/CampaignNotes.tsx`:**

Adicionar query para notas de players:

```typescript
// Apos carregar notas do DM, buscar notas de players
const { data: playerNotes } = await supabase
  .from("campaign_notes")
  .select("id, title, content, user_id, updated_at, campaign_members(user_id, profiles(display_name))")
  .eq("campaign_id", campaignId)
  .neq("user_id", dmUserId)
  .order("updated_at", { ascending: false });
```

Renderizar em secao colapsavel "Notas dos Jogadores" com badge do nome do player. Read-only (sem textarea editavel).

### Passo 5: Adicionar traducoes

**`messages/pt-BR.json`:**

```json
{
  "player": {
    "my_notes": "Minhas Notas",
    "my_notes_add": "Nova nota",
    "my_notes_empty": "Sem notas pessoais",
    "my_notes_saving": "Salvando...",
    "my_notes_saved": "Salvo",
    "my_notes_delete_confirm": "Excluir esta nota?",
    "my_notes_limit": "Limite de 10 notas atingido",
    "my_notes_placeholder": "Escreva aqui..."
  },
  "dashboard": {
    "player_notes_section": "Notas dos Jogadores",
    "player_notes_empty": "Nenhum jogador escreveu notas ainda",
    "player_notes_by": "por {name}"
  }
}
```

**`messages/en.json`:**

```json
{
  "player": {
    "my_notes": "My Notes",
    "my_notes_add": "New note",
    "my_notes_empty": "No personal notes",
    "my_notes_saving": "Saving...",
    "my_notes_saved": "Saved",
    "my_notes_delete_confirm": "Delete this note?",
    "my_notes_limit": "Limit of 10 notes reached",
    "my_notes_placeholder": "Write here..."
  },
  "dashboard": {
    "player_notes_section": "Player Notes",
    "player_notes_empty": "No players have written notes yet",
    "player_notes_by": "by {name}"
  }
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/migrations/053_player_notes_rls.sql` | **NOVO** — RLS policies para INSERT/UPDATE/DELETE de notas do player |
| `components/player/PlayerSharedNotes.tsx` | Estender com CRUD de notas pessoais, auto-save debounced, delete |
| `components/player/PlayerJoinClient.tsx` | Passar `userId` prop para `PlayerSharedNotes` |
| `components/dashboard/CampaignNotes.tsx` | Adicionar secao read-only "Notas dos Jogadores" |
| `messages/pt-BR.json` | Adicionar keys `player.my_notes_*` + `dashboard.player_notes_*` |
| `messages/en.json` | Adicionar keys `player.my_notes_*` + `dashboard.player_notes_*` |

---

## Plano de Testes

### Testes Manuais

1. **RLS: Player cria nota**
   - [ ] Player autenticado, membro da campanha → clicar "+" → nota criada no banco
   - [ ] Verificar no Supabase: `user_id` = player, `is_shared=false`, `campaign_id` correto

2. **RLS: Player NAO cria nota em campanha alheia**
   - [ ] Via Supabase client, tentar insert com `campaign_id` de campanha onde nao e membro → erro

3. **Auto-save**
   - [ ] Digitar texto na nota → aguardar 2s → indicador "Salvo" aparece
   - [ ] Recarregar pagina → texto persiste

4. **Delete nota**
   - [ ] Clicar trash icon → confirm dialog → confirmar → nota some da lista
   - [ ] Verificar no banco: nota deletada

5. **Limite de 10 notas**
   - [ ] Criar 10 notas → botao "+" fica desabilitado → tooltip "Limite atingido"

6. **DM ve notas dos players**
   - [ ] DM abre CampaignNotes → secao "Notas dos Jogadores" lista notas com badge do nome
   - [ ] DM nao consegue editar/deletar notas de players

7. **Backward compatibility**
   - [ ] Notas compartilhadas do DM continuam visiveis pro player (is_shared=true)
   - [ ] DM CRUD de notas proprias nao muda

8. **i18n**
   - [ ] Trocar idioma PT-BR ↔ EN → strings corretas

### Testes Automatizados

```typescript
// components/player/PlayerSharedNotes.test.tsx
describe("PlayerSharedNotes with userId", () => {
  it("renders 'My Notes' section when userId is provided", async () => {
    render(<PlayerSharedNotes campaignId="c1" userId="u1" />);
    await waitFor(() =>
      expect(screen.getByText(/minhas notas/i)).toBeInTheDocument()
    );
  });

  it("does not render 'My Notes' section when userId is absent", async () => {
    render(<PlayerSharedNotes campaignId="c1" />);
    await waitFor(() =>
      expect(screen.queryByText(/minhas notas/i)).not.toBeInTheDocument()
    );
  });

  it("creates note on + click", async () => {
    render(<PlayerSharedNotes campaignId="c1" userId="u1" />);
    await userEvent.click(screen.getByLabelText(/nova nota/i));
    expect(mockSupabase.from("campaign_notes").insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", is_shared: false })
    );
  });

  it("disables + button at 10 notes", async () => {
    // setup: mock 10 notas
    const btn = screen.getByLabelText(/nova nota/i);
    expect(btn).toBeDisabled();
  });
});
```

---

## Notas de Paridade

- **Guest (`/try`):** N/A. Guest nao tem `campaign_id` nem `user_id`. `PlayerSharedNotes` nao e renderizado no guest flow.
- **Anonimo (`/join`):** N/A. Anonimo via session_token nao tem `user_id` do Supabase Auth. `PlayerSharedNotes` so renderiza quando `showNotes && campaignId`. Anonimos nao possuem `campaignId` no `PlayerJoinClient` (e null para anonimos). Sem impacto.
- **Autenticado (`/join` com auth + `/invite`):** Unica surface afetada. Player autenticado com `campaignId` ativo ve notas compartilhadas + pode criar notas pessoais.

Nenhuma alteracao em componentes de combate core. Parity rule satisfeita.

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| RLS conflito com policies existentes do DM | Alto | Testar INSERT como player E como DM apos migration. Policies do DM usam `campaigns.owner_id`, nao conflitam com `user_id = auth.uid()` |
| Debounce perde dados se player fechar aba rapidamente | Medio | Adicionar `beforeunload` handler que forca save imediato dos timers pendentes |
| Muitos players criando notas sobrecarregam CampaignNotes do DM | Baixo | Soft limit de 10 notas/player + secao colapsavel no DM |
| `PlayerSharedNotes` fica complexo demais (shared + personal) | Medio | Manter logica separada em dois `useEffect` distintos. Se crescer, extrair `PlayerPersonalNotes` como componente separado |
| Campo `user_id` em campaign_notes nao tem index para player queries | Baixo | Adicionar `CREATE INDEX IF NOT EXISTS idx_campaign_notes_user ON campaign_notes(user_id)` na migration |

---

## Definicao de Pronto

- [ ] Migration 053 aplicada — RLS permite player INSERT/UPDATE/DELETE suas notas
- [ ] Index em `campaign_notes.user_id` criado
- [ ] `PlayerSharedNotes` exibe secao "Minhas Notas" para players autenticados
- [ ] Auto-save com debounce 1.5s funcional + indicador visual
- [ ] Create nota com "+" funcional
- [ ] Delete nota com confirmacao funcional
- [ ] Limite de 10 notas enforced no frontend
- [ ] `beforeunload` handler salva notas pendentes
- [ ] DM ve notas dos players read-only em CampaignNotes
- [ ] Backward compatibility: notas compartilhadas do DM inalteradas
- [ ] Traducoes pt-BR e en adicionadas
- [ ] Testes automatizados passando
- [ ] Testes manuais 1-8 validados
- [ ] Build sem erros (`next build` passa)
