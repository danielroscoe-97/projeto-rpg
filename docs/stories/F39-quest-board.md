# F-39 — Quest/Objectives Board Compartilhado

**Epic:** Campaign Management — Gestao de Campanha  
**Prioridade:** Media  
**Estimativa:** 8 SP  
**Dependencia:** Nenhuma  
**Arquivos principais:** `supabase/migrations/055_campaign_quests.sql` (novo), `components/campaign/QuestBoard.tsx` (novo), `components/dashboard/CampaignSections.tsx`, `components/player/PlayerCampaignView.tsx`

---

## Resumo

Toda campanha de D&D gira em torno de quests — mas hoje os players dependem de anotacoes pessoais ou memoria pra lembrar o que estao fazendo. O DM precisa de uma forma rapida de comunicar objetivos ativos sem interromper o fluxo da sessao.

O Quest Board e um painel simples e compartilhado onde o DM cria e gerencia quests (titulo + descricao + status) e os players visualizam. Sem tracking individual, sem XP, sem rewards — apenas "o que precisamos fazer" e "o que ja fizemos". Simplicidade radical: se o DM consegue criar uma quest em 10 segundos durante a sessao, a feature funciona.

---

## Decisoes de UX

**D1 — Status flow de 3 estados:** `available` (DM criou mas party nao aceitou), `active` (party esta trabalhando nisso), `completed` (feito). Transicoes controladas exclusivamente pelo DM. Simples, sem ambiguidade.

**D2 — Sem atribuicao individual:** Quests sao da party, nao de players especificos. Atribuir quests a players individuais adiciona complexidade que nao resolve problema de mesa. Se o DM quer direcionar, usa o post-it (F-38).

**D3 — Sem tracking de progresso:** Nada de "3/5 goblins eliminados" ou barras de progresso. O DM marca como completed quando decidir. O RPG de mesa nao e um videogame — o DM e o engine.

**D4 — Ordenacao por status:** Active primeiro (prioridade visual), depois Available (pendentes), depois Completed (historico). Dentro de cada grupo, sort por `sort_order` (DM pode reordenar).

**D5 — Criacao rapida (inline):** Campo de texto inline no topo do board para criar quest rapida (so titulo). Descricao e status podem ser editados depois. Otimizado para "DM no meio da sessao precisa registrar algo rapido".

**D6 — Visual de cards:** Cada quest e um card compacto com icone de status (circulo vazio = available, circulo com seta = active, check = completed), titulo, e descricao truncada (2 linhas). Click expande para ver descricao completa e controles de edicao (DM only).

**D7 — Visivel no campaign dashboard E na sessao:** Quest Board aparece como secao no `CampaignSections` (DM) e `PlayerCampaignView` (player). Durante combate, player pode ver quests via painel colapsavel.

**D8 — Completed quests colapsaveis:** Secao de quests completed vem colapsada por default. Evita poluicao visual — jogadores focam no que importa agora.

**D9 — Cor e estilo por status:**
- Available: borda `border-muted-foreground/30`, icone cinza
- Active: borda `border-gold/50`, icone gold (#D4A853), leve glow
- Completed: borda `border-green-600/30`, icone verde, texto com opacity 0.7

---

## Contexto Tecnico

### Tabela de referencia: `campaign_notes`

```sql
CREATE TABLE campaign_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

A nova tabela `campaign_quests` segue o mesmo padrao mas sem `user_id` (quests sao do DM, nao de players individuais).

### RLS pattern (migration 033)

```sql
-- DM tem ALL via campaigns.owner_id
-- Players tem SELECT via is_campaign_member()
```

### UI patterns

- `CampaignSections.tsx`: layout 2-colunas, secoes colapsaveis com `Collapsible` do shadcn. Main: Players, NPCs, Notes. Sidebar: Members, Encounters, MindMap.
- `NpcList.tsx`: lista de cards com CRUD inline, botao de criar no topo, dialogs de edicao.
- `CampaignNotes.tsx`: auto-save com debounce de 1s via `useDebouncedCallback`.

### i18n pattern

Namespace `campaign` em `messages/en.json` e `messages/pt-BR.json`. Novas chaves irao sob `campaign.quests`.

---

## Criterios de Aceite

### Banco de Dados

1. Tabela `campaign_quests` criada com campos: `id`, `campaign_id`, `title`, `description`, `status`, `sort_order`, `created_at`, `updated_at`.
2. RLS: DM (owner da campanha) tem ALL. Players membros da campanha tem SELECT.
3. Indice em `campaign_id` para performance de queries.
4. Status aceita apenas valores `available`, `active`, `completed`.

### DM — CRUD de Quests

5. DM ve secao "Quests" no `CampaignSections` (sidebar, abaixo de Encounters).
6. Campo de criacao rapida no topo: input de titulo + Enter cria quest com status `available`.
7. DM pode clicar em quest para expandir e editar: titulo, descricao, status.
8. DM pode alterar status via dropdown ou botoes de transicao (available → active → completed).
9. DM pode deletar quest (com confirmacao).
10. DM pode reordenar quests via drag-and-drop (ou botoes up/down para v1 simplificado).
11. Alteracoes persistem imediatamente (auto-save com debounce, sem botao "salvar").

### Player — Visualizacao

12. Player ve secao "Quests" no `PlayerCampaignView` (readonly).
13. Quests ordenadas por status: Active primeiro, Available segundo, Completed terceiro.
14. Player pode expandir quest para ver descricao completa.
15. Secao de Completed quests colapsada por default.
16. Player NAO pode criar, editar, ou deletar quests.

### Visual

17. Cards com estilo diferenciado por status (cores conforme D9).
18. Icones de status: circulo vazio (available), target/circulo ativo (active), check (completed).
19. Fontes: Cinzel para titulo da secao, Plus Jakarta Sans para conteudo dos cards.

### i18n

20. Todas as strings em pt-BR e en.
21. Labels de status traduzidos: "Disponivel/Available", "Ativa/Active", "Concluida/Completed".

---

## Abordagem Tecnica

### 1. Migration: `supabase/migrations/055_campaign_quests.sql`

```sql
-- Campaign quest board
CREATE TABLE campaign_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'active', 'completed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_quests_campaign ON campaign_quests(campaign_id);

ALTER TABLE campaign_quests ENABLE ROW LEVEL SECURITY;

-- DM can manage quests in their campaigns
CREATE POLICY campaign_quests_dm_all ON campaign_quests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_quests.campaign_id
      AND campaigns.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_quests.campaign_id
      AND campaigns.owner_id = auth.uid()
    )
  );

-- Players can view quests in campaigns they belong to
CREATE POLICY campaign_quests_player_select ON campaign_quests
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- Auto-update updated_at
CREATE TRIGGER set_campaign_quests_updated_at
  BEFORE UPDATE ON campaign_quests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Tipo TypeScript: `lib/types/quest.ts`

```typescript
export type QuestStatus = "available" | "active" | "completed";

export interface CampaignQuest {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  status: QuestStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuestFormData {
  title: string;
  description?: string;
  status?: QuestStatus;
}
```

### 3. Hook de dados: `lib/hooks/use-campaign-quests.ts`

```typescript
export function useCampaignQuests(campaignId: string) {
  const [quests, setQuests] = useState<CampaignQuest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch quests ordered by status priority + sort_order
  const fetchQuests = async () => {
    const { data } = await supabase
      .from("campaign_quests")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true });
    
    if (data) {
      // Client-side sort by status priority
      const sorted = sortQuestsByStatus(data);
      setQuests(sorted);
    }
    setLoading(false);
  };

  const createQuest = async (title: string) => { /* insert + refetch */ };
  const updateQuest = async (id: string, updates: Partial<QuestFormData>) => { /* update + refetch */ };
  const deleteQuest = async (id: string) => { /* delete + refetch */ };
  const reorderQuest = async (id: string, newOrder: number) => { /* update sort_order + refetch */ };

  return { quests, loading, createQuest, updateQuest, deleteQuest, reorderQuest, refetch: fetchQuests };
}

function sortQuestsByStatus(quests: CampaignQuest[]): CampaignQuest[] {
  const priority: Record<QuestStatus, number> = { active: 0, available: 1, completed: 2 };
  return [...quests].sort((a, b) => {
    const statusDiff = priority[a.status] - priority[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.sort_order - b.sort_order;
  });
}
```

### 4. Componente reutilizavel: `components/campaign/QuestBoard.tsx`

```typescript
interface QuestBoardProps {
  campaignId: string;
  /** DM pode criar/editar/deletar; Player so visualiza */
  isEditable: boolean;
}

export function QuestBoard({ campaignId, isEditable }: QuestBoardProps) {
  const { quests, loading, createQuest, updateQuest, deleteQuest } = useCampaignQuests(campaignId);
  const t = useTranslations("campaign.quests");
  
  const activeQuests = quests.filter(q => q.status === "active");
  const availableQuests = quests.filter(q => q.status === "available");
  const completedQuests = quests.filter(q => q.status === "completed");

  return (
    <div className="space-y-3">
      {/* Quick create (DM only) */}
      {isEditable && (
        <QuickCreateInput
          placeholder={t("quick_create_placeholder")}
          onSubmit={createQuest}
        />
      )}

      {/* Active quests */}
      {activeQuests.map(q => (
        <QuestCard key={q.id} quest={q} isEditable={isEditable} onUpdate={updateQuest} onDelete={deleteQuest} />
      ))}

      {/* Available quests */}
      {availableQuests.map(q => (
        <QuestCard key={q.id} quest={q} isEditable={isEditable} onUpdate={updateQuest} onDelete={deleteQuest} />
      ))}

      {/* Completed (collapsible) */}
      {completedQuests.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger>{t("completed")} ({completedQuests.length})</CollapsibleTrigger>
          <CollapsibleContent>
            {completedQuests.map(q => (
              <QuestCard key={q.id} quest={q} isEditable={isEditable} onUpdate={updateQuest} onDelete={deleteQuest} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
```

### 5. Componente `QuestCard.tsx` (interno ou exportado)

```typescript
function QuestCard({ quest, isEditable, onUpdate, onDelete }: {
  quest: CampaignQuest;
  isEditable: boolean;
  onUpdate: (id: string, data: Partial<QuestFormData>) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    available: <Circle className="h-4 w-4 text-muted-foreground" />,
    active: <Target className="h-4 w-4 text-gold" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  };

  const statusBorder = {
    available: "border-muted-foreground/30",
    active: "border-gold/50 shadow-[0_0_8px_rgba(212,168,83,0.15)]",
    completed: "border-green-600/30 opacity-70",
  };

  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-colors ${statusBorder[quest.status]}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        {statusIcon[quest.status]}
        <span className="font-medium text-sm flex-1 truncate">{quest.title}</span>
        {isEditable && expanded && (
          <QuestStatusDropdown status={quest.status} onChange={(s) => onUpdate(quest.id, { status: s })} />
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {isEditable ? (
            <Textarea
              value={quest.description}
              onChange={(e) => debouncedUpdate(quest.id, { description: e.target.value })}
              placeholder="Adicionar descricao..."
            />
          ) : (
            quest.description && <p className="text-sm text-muted-foreground">{quest.description}</p>
          )}
          {isEditable && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(quest.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

### 6. Integrar no `CampaignSections.tsx` (DM view)

Adicionar nova secao colapsavel na sidebar:

```typescript
<Collapsible defaultOpen>
  <CollapsibleTrigger>
    <ScrollText className="h-4 w-4" />
    {t("campaign.quests.title")}
  </CollapsibleTrigger>
  <CollapsibleContent>
    <QuestBoard campaignId={campaignId} isEditable={true} />
  </CollapsibleContent>
</Collapsible>
```

Posicao: abaixo de "Past Encounters", acima de "Mind Map".

### 7. Integrar no `PlayerCampaignView.tsx` (Player view)

Adicionar nova secao apos "Combat History":

```typescript
<section>
  <h3 className="font-cinzel text-lg">{t("campaign.quests.title")}</h3>
  <QuestBoard campaignId={campaignId} isEditable={false} />
</section>
```

### 8. Adicionar chaves i18n

```json
// messages/pt-BR.json (dentro de "campaign")
"quests": {
  "title": "Quests",
  "quick_create_placeholder": "Nova quest...",
  "available": "Disponivel",
  "active": "Ativa",
  "completed": "Concluida",
  "completed_section": "Concluidas",
  "empty": "Nenhuma quest ainda.",
  "delete_confirm": "Remover esta quest?",
  "description_placeholder": "Adicionar descricao..."
}

// messages/en.json (dentro de "campaign")
"quests": {
  "title": "Quests",
  "quick_create_placeholder": "New quest...",
  "available": "Available",
  "active": "Active",
  "completed": "Completed",
  "completed_section": "Completed",
  "empty": "No quests yet.",
  "delete_confirm": "Remove this quest?",
  "description_placeholder": "Add description..."
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/migrations/055_campaign_quests.sql` | **NOVO** — Tabela `campaign_quests` com RLS |
| `lib/types/quest.ts` | **NOVO** — Tipos `CampaignQuest`, `QuestStatus`, `QuestFormData` |
| `lib/hooks/use-campaign-quests.ts` | **NOVO** — Hook com CRUD + ordenacao por status |
| `components/campaign/QuestBoard.tsx` | **NOVO** — Componente reutilizavel (DM editable + Player readonly) |
| `components/dashboard/CampaignSections.tsx` | Adicionar secao "Quests" na sidebar com `QuestBoard isEditable={true}` |
| `components/player/PlayerCampaignView.tsx` | Adicionar secao "Quests" com `QuestBoard isEditable={false}` |
| `messages/pt-BR.json` | Adicionar chaves `campaign.quests.*` |
| `messages/en.json` | Adicionar chaves `campaign.quests.*` |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

1. **Criacao rapida de quest**
   - [ ] DM digita titulo no campo de criacao rapida e pressiona Enter
   - [ ] Quest aparece na lista com status "Available"
   - [ ] Campo de input limpa apos criacao

2. **Edicao de quest**
   - [ ] DM clica na quest para expandir
   - [ ] DM altera titulo — salva automaticamente (debounce)
   - [ ] DM adiciona descricao — salva automaticamente
   - [ ] Recarregar pagina — alteracoes persistidas

3. **Transicao de status**
   - [ ] DM muda quest de Available → Active — card ganha borda gold
   - [ ] DM muda quest de Active → Completed — card vai para secao colapsada
   - [ ] DM muda quest de Completed → Active — card volta para topo

4. **Exclusao de quest**
   - [ ] DM clica em deletar — confirmacao aparece
   - [ ] DM confirma — quest removida da lista
   - [ ] DM cancela — quest permanece

5. **Ordenacao visual**
   - [ ] Criar 2 Active, 1 Available, 1 Completed
   - [ ] Lista mostra: Active (2) → Available (1) → Completed (1, colapsado)

6. **Player view — readonly**
   - [ ] Player ve quests na pagina da campanha
   - [ ] Player NAO ve campo de criacao, botoes de edicao ou delete
   - [ ] Player pode expandir quest para ver descricao
   - [ ] Player ve quests na mesma ordenacao que DM

7. **Player view — atualizacao**
   - [ ] DM cria nova quest
   - [ ] Player recarrega pagina — ve a nova quest
   - [ ] DM muda status — player recarrega e ve a mudanca

8. **RLS — seguranca**
   - [ ] Player tenta INSERT via DevTools/API — bloqueado por RLS
   - [ ] Player tenta UPDATE via DevTools/API — bloqueado por RLS
   - [ ] Usuario nao-membro tenta SELECT — bloqueado por RLS

9. **Campanha sem quests**
   - [ ] Secao mostra mensagem "Nenhuma quest ainda." (vazia)

10. **i18n**
    - [ ] Trocar idioma para en — labels e placeholders traduzidos
    - [ ] Trocar idioma para pt-BR — labels e placeholders traduzidos

### Testes Automatizados (recomendados)

- Teste unitario: `QuestBoard` renderiza quests agrupadas por status
- Teste unitario: `QuestCard` mostra icone e borda corretos por status
- Teste unitario: `sortQuestsByStatus()` ordena corretamente
- Teste unitario: `QuestBoard isEditable={false}` nao renderiza controles de edicao
- Teste de integracao: CRUD de quest via `useCampaignQuests` hook (mock Supabase)

---

## Notas de Paridade

| Modo | Quest Board | Justificativa |
|------|-------------|---------------|
| **Guest (`/try`)** | N/A | Guest e DM solo sem campanha. Quests sao campaign-scoped. |
| **Anonimo (`/join`)** | N/A | Player anonimo nao tem acesso a `PlayerCampaignView` (so ve combate). Quests sao visiveis apenas para membros da campanha. |
| **Autenticado (`/invite`)** | SIM — Player ve quests readonly | Player autenticado acessa `PlayerCampaignView` onde a secao de quests sera adicionada. |

**Conclusao:** Auth-only feature. Sem impacto em Guest ou Anon. Nenhuma mudanca em `GuestCombatClient` ou `PlayerJoinClient`.

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| `update_updated_at_column()` pode nao existir (funcao de trigger) | Alto | Verificar se a funcao existe em migrations anteriores. Se nao, criar na mesma migration 055. |
| Performance com muitas quests (> 100 por campanha) | Baixo | Improvavel no uso real. Paginacao pode ser adicionada futuramente. Indice em `campaign_id` garante query rapida. |
| Concorrencia: DM edita quest em 2 abas | Baixo | `updated_at` serve como optimistic lock informal. Ultima escrita vence. Aceitavel para single-user (DM). |
| Player ve quest desatualizada (sem realtime) | Medio | Aceitavel para v1 — quests nao mudam a cada segundo. Player recarrega pagina para atualizar. Realtime pode ser adicionado em v2 se necessario. |
| Drag-and-drop de reordenacao pode ser complexo | Medio | v1 usa botoes simples de mover up/down. Drag-and-drop fica para v2 (bucket). |
| Numeracao de migration (055) pode conflitar | Baixo | Ultimo numero atual: 054 (spell_slots_column). Usar 055. |

---

## Definicao de Pronto

- [ ] Migration `055_campaign_quests.sql` aplicada com sucesso (tabela + RLS + trigger)
- [ ] Tipo `CampaignQuest` definido em `lib/types/quest.ts`
- [ ] Hook `useCampaignQuests` implementado com create, update, delete, reorder
- [ ] `QuestBoard` renderiza quests agrupadas por status com visual correto
- [ ] DM pode criar quest rapidamente (inline input + Enter)
- [ ] DM pode editar titulo, descricao e status de quest existente
- [ ] DM pode deletar quest com confirmacao
- [ ] Player ve quests readonly no `PlayerCampaignView`
- [ ] Quests completed colapsadas por default
- [ ] Secao "Quests" adicionada ao `CampaignSections` (sidebar)
- [ ] Secao "Quests" adicionada ao `PlayerCampaignView`
- [ ] RLS validado: player nao pode INSERT/UPDATE/DELETE
- [ ] i18n completo: pt-BR + en (chaves `campaign.quests.*`)
- [ ] Testes manuais 1-10 passando
- [ ] Build sem erros (`next build` passa)
