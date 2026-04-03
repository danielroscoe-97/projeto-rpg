# PHQ-E3-F6 — Resource Tracker CRUD: Gerenciar Recursos do Personagem

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 5 SP
**Dependencia:** PHQ-E3-F5 (ResourceDots/ResourceTrackerRow), migration 057
**Arquivos principais:** `components/player-hq/ResourceTrackerList.tsx` (novo), `components/player-hq/AddResourceTrackerDialog.tsx` (novo), `supabase/migrations/057_character_resource_trackers.sql` (novo)

---

## Resumo

Com o componente de bolinhas criado (F5), esta story implementa o **CRUD completo** de resource trackers: o jogador pode adicionar, editar, reordenar e remover trackers de recursos.

O jogador adiciona "Wild Shape" (3 usos, Long Rest), "Action Surge" (1 uso, Short Rest), "Sorcery Points" (5 usos, Long Rest) — e ve todos eles listados com bolinhas interativas na aba Resources do Player HQ.

**Filosofia:** 3 campos obrigatorios apenas: nome, maximo de usos, tipo de reset. Tudo mais e opcional. Adicionar um tracker deve demorar menos de 15 segundos.

---

## Decisoes de UX

**D1: Botao "+" flutuante na aba Resources.** FAB (Floating Action Button) no canto inferior direito abre o dialog de adicao. Icone de dado/magia.

**D2: Dialog de adicao minimalista.** Tres campos obrigatorios em um dialog compacto:
- Nome: input de texto com autocomplete do SRD (F7, placeholder mesmo sem F7)
- Maximo de usos: input numerico +/- (1-30)
- Tipo de reset: 4 botoes de selecao visual (🌗 Short / 🌕 Long / 🌅 Dawn / ∞ Manual)
- Botao "Adicionar" — fecha dialog e aparece na lista imediatamente

**D3: Lista ordenada por drag-and-drop.** Na tela de Resources, os trackers sao reordenaveis. Em mobile: botao de "segura e arrasta" (handle de 3 linhas) na esquerda. No desktop: drag nativo.

**D4: Edicao inline do valor atual.** Nas proprias bolinhas (via ResourceTrackerRow) o jogador ja gasta/recupera usos. Edicao de nome/max/reset e via botao de menu (tres pontos) em cada row.

**D5: Remocao com confirmacao.** Swipe left (mobile) ou botao delete (desktop) + confirmacao: "Remover [Nome]? Os usos serao perdidos." Sem undo — confirmacao e suficiente.

**D6: Ordem dos trackers.** Default: ordem de criacao. Reordenamento persiste via campo `display_order` na tabela.

---

## Contexto Tecnico

### Migration 057

```sql
-- Ja documentado no epic-player-hq.md
-- supabase/migrations/057_character_resource_trackers.sql
CREATE TABLE character_resource_trackers ( ... );
```

### Hook useResourceTrackers

```typescript
// hooks/useResourceTrackers.ts
export function useResourceTrackers(characterId: string) {
  const [trackers, setTrackers] = useState<ResourceTracker[]>([]);

  const addTracker = async (data: CreateTrackerInput) => { /* INSERT */ };
  const updateUsed = async (trackerId: string, newUsedCount: number) => {
    // UPDATE current_uses
    // Debounced 300ms
  };
  const resetTracker = async (trackerId: string) => {
    // UPDATE current_uses = 0
  };
  const resetByType = async (resetType: ResetType) => {
    // UPDATE current_uses = 0 WHERE reset_type = resetType
  };
  const deleteTracker = async (trackerId: string) => { /* DELETE */ };
  const reorder = async (newOrder: string[]) => {
    // UPSERT display_order em batch
  };

  return { trackers, addTracker, updateUsed, resetTracker, resetByType, deleteTracker, reorder };
}
```

### Formulario de adicao

```typescript
interface CreateTrackerInput {
  name: string;          // required, max 50 chars
  max_uses: number;      // required, 1-30
  reset_type: ResetType; // required
  source: 'manual';      // sempre manual nesta story (F7 adiciona 'srd')
}
```

---

## Criterios de Aceite

### Lista de Trackers

1. Aba "Resources" (ou secao) exibe lista de trackers do personagem.
2. Cada tracker exibe: nome + contagem "(X/Y)" + dots interativos (ResourceTrackerRow).
3. Icone de reset type ao lado do nome.
4. Lista e reordenavel (drag handle visivel no mobile).
5. Empty state: "Nenhum recurso configurado. Adicione seu primeiro tracker!" com CTA.

### Adicao de Tracker

6. FAB "+" visivel na aba Resources.
7. Tap no FAB abre dialog com 3 campos: nome, maximo, reset type.
8. Nome: input de texto, obrigatorio, max 50 chars.
9. Maximo: input numerico com botoes +/-, range 1-30.
10. Reset type: 4 opcoes visuais com icone e label. Selecao por tap.
11. Botao "Adicionar" habilitado somente quando nome + maximo preenchidos.
12. Ao confirmar: tracker aparece na lista imediatamente (optimistic update).
13. Salvo no banco com `source = 'manual'` e `display_order = max + 1`.

### Edicao de Tracker

14. Menu de tres pontos em cada row.
15. Opcoes do menu: "Editar" e "Remover".
16. "Editar" abre o mesmo dialog pre-preenchido.
17. Salvar edicao atualiza nome, max e reset type.

### Remocao

18. "Remover" exibe confirmacao inline: "Remover [Nome]?"
19. Confirmar remove o tracker da lista (optimistic) e do banco.
20. Swipe left no mobile aciona o mesmo fluxo de remocao.

### Uso das Bolinhas

21. Tap em dot disponivel: gasta 1 uso (current_uses++), salvo com debounce 300ms.
22. Tap em dot gasto: recupera 1 uso (current_uses--), salvo com debounce 300ms.
23. Haptic feedback em cada toggle (30ms vibration).
24. Estado local atualizado otimisticamente antes do save.

### Reset Individual

25. Tap no icone de reset type da row: reseta current_uses para 0 (com toast de confirmacao).
26. Toast: "Wild Shape resetado!" com icone do reset type.

### Reordenamento

27. Drag and drop em mobile (via handle) e desktop funcionando.
28. Nova ordem persiste no banco (display_order atualizado em batch).

---

## Abordagem Tecnica

### Passo 1: Migration 057

Criar arquivo SQL conforme especificado no epic.

### Passo 2: Hook useResourceTrackers

Implementar CRUD completo com optimistic updates e debounce no `updateUsed`.

### Passo 3: ResourceTrackerList

```typescript
// components/player-hq/ResourceTrackerList.tsx
export function ResourceTrackerList({ characterId }: { characterId: string }) {
  const { trackers, updateUsed, deleteTracker, reorder } = useResourceTrackers(characterId);
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="relative min-h-[200px]">
      <DraggableList
        items={trackers}
        onReorder={reorder}
        renderItem={(tracker) => (
          <ResourceTrackerRow
            key={tracker.id}
            name={tracker.name}
            maxUses={tracker.max_uses}
            currentUses={tracker.current_uses}
            resetType={tracker.reset_type}
            onToggle={(newUsed) => updateUsed(tracker.id, newUsed)}
          />
        )}
      />
      <FAB onClick={() => setShowAddDialog(true)} icon="plus" />
      <AddResourceTrackerDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={addTracker}
      />
    </div>
  );
}
```

### Passo 4: AddResourceTrackerDialog

Dialog compacto com os 3 campos. Reset type como RadioGroup visual.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `supabase/migrations/057_character_resource_trackers.sql` | Criar | Tabela + RLS |
| `lib/types/database.ts` | Editar | Tipo ResourceTracker |
| `hooks/useResourceTrackers.ts` | Criar | CRUD + optimistic updates |
| `components/player-hq/ResourceTrackerList.tsx` | Criar | Lista reordenavel |
| `components/player-hq/AddResourceTrackerDialog.tsx` | Criar | Dialog de adicao/edicao |
| `app/(authenticated)/campaign/[id]/resources/page.tsx` | Criar | Aba Resources do Player HQ |
| `messages/pt-BR.json` | Editar | Strings de trackers |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Empty state: personagem sem trackers exibe mensagem + CTA.
2. Adicionar "Wild Shape" (3, Long Rest): aparece na lista com 3 dots dourados.
3. Tap em 2 dots: 2 ficam vazios, contagem mostra "(1/3)".
4. Refresh da pagina: estado persiste (1/3 ainda).
5. Reset individual: tap no icone 🌕 → "Wild Shape resetado!" → 3 dots dourados.
6. Editar: mudar nome para "Wildshape" → atualiza na lista.
7. Remover: confirmacao → tracker some da lista.
8. Drag para reordenar: nova ordem persiste apos refresh.
9. Swipe left (mobile): ativa fluxo de remocao.
10. Debounce: tap rapido em varios dots — somente 1 request ao banco apos 300ms.

---

## Notas de Paridade

| Modo | Aplica? | Justificativa |
|---|---|---|
| Guest | NAO | Auth-only |
| Anonimo | NAO | Auth-only |
| Autenticado | SIM | Player HQ |

---

## Definicao de Pronto

- [ ] Migration 057 criada e aplicada
- [ ] Tipo ResourceTracker no TypeScript
- [ ] Hook useResourceTrackers com CRUD completo e debounce
- [ ] ResourceTrackerList com drag-and-drop
- [ ] AddResourceTrackerDialog funcional
- [ ] Aba Resources do Player HQ renderizando
- [ ] Optimistic updates em toggles (sem lag perceptivel)
- [ ] Build sem erros
