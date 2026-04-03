# PHQ-E4-F9 — Bag of Holding: CRUD de Itens + Log de Adicoes

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 8 SP
**Dependencia:** migrations 058+059, PHQ-E1-F1 (Player HQ rota existe)
**Arquivos principais:** `components/campaign/BagOfHolding.tsx` (novo), `components/campaign/BagOfHoldingItem.tsx` (novo), `hooks/useBagOfHolding.ts` (novo), `supabase/migrations/058_party_inventory.sql` (novo), `supabase/migrations/059_inventory_removal_requests.sql` (novo)

---

## Resumo

A Bag of Holding e o inventario compartilhado da party. Todos os membros da campanha (jogadores e DM) podem ver e adicionar itens. A lista e unica por campanha. Cada adicao fica no log com nome do usuario e data.

Esta story implementa o nucleo: visualizacao de todos os itens, adicao de novos itens, e o log de quem adicionou o que.

A regra de remocao (que requer aprovacao do DM) e implementada na F10. Esta story apenas implementa adicao e visualizacao.

---

## Decisoes de UX

**D1: Bag of Holding na campanha, acessivel por DM e Player.** No dashboard de campanha do DM (pagina existente), adicionar secao "Bag of Holding" como accordion colapsavel — igual a Jogadores, NPCs, Notas. No Player HQ, a Bag of Holding fica na aba "Inventario".

**D2: Lista de itens como cards compactos.** Cada item: nome + quantidade + notas (se houver). Abaixo: "Adicionado por [nome do usuario] · [data relativa] · Sessao X" em texto muted pequeno. Icone de item magico/rolo de dado/bolsa conforme categoria futura.

**D3: Adicionar item em 2 campos.** Botao "+" abre um mini-form inline (nao modal): campo de nome + campo de quantidade (default 1). Opcional: campo de notas (pode deixar em branco). Confirma com Enter ou tap no botao de check. Rapido como escrever numa lista.

**D4: Separacao visual entre itens ativos e removidos.** Itens com `status = 'removed'` aparecem em uma secao "Historico de Itens Removidos" colapsada abaixo da lista principal. Texto em muted + strikethrough no nome.

**D5: Busca rapida.** Campo de busca no topo da lista filtra por nome do item em tempo real (client-side). Essencial quando a bag tem muitos itens.

**D6: Contador no header.** O accordion "Bag of Holding" mostra na linha do titulo: "Bag of Holding (8 itens)". No Player HQ, o icone da aba Inventario tem badge numerico com total de itens.

**D7: Log em ordem cronologica reversa.** Itens mais recentes aparecem no topo. O log (campo "adicionado por" + data) e visivel diretamente no card do item, sem precisar expandir nada.

---

## Contexto Tecnico

### Migrations 058 + 059

Documentadas em `docs/epic-player-hq.md` secao 3.3.

### Hook useBagOfHolding

```typescript
// hooks/useBagOfHolding.ts
export function useBagOfHolding(campaignId: string) {
  const [items, setItems] = useState<PartyInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load inicial + realtime subscription
  useEffect(() => {
    const loadItems = async () => {
      const { data } = await supabase
        .from('party_inventory_items')
        .select(`
          *,
          added_by_user:added_by(raw_user_meta_data),
          removal_requests(id, status, requested_by, requested_at)
        `)
        .eq('campaign_id', campaignId)
        .order('added_at', { ascending: false });
      setItems(data ?? []);
      setIsLoading(false);
    };

    loadItems();

    // Realtime: qualquer membro ve atualizacoes instantaneas
    const channel = supabase
      .channel(`bag:${campaignId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'party_inventory_items',
        filter: `campaign_id=eq.${campaignId}`,
      }, () => loadItems())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaignId]);

  const addItem = async (input: AddItemInput) => {
    const { data: { user } } = await supabase.auth.getUser();
    const newItem = {
      campaign_id: campaignId,
      item_name: input.name,
      quantity: input.quantity,
      notes: input.notes ?? null,
      added_by: user!.id,
    };
    // Optimistic insert
    setItems(prev => [{ ...newItem, id: 'temp', added_at: new Date().toISOString(), status: 'active' }, ...prev]);
    await supabase.from('party_inventory_items').insert(newItem);
  };

  const activeItems = items.filter(i => i.status !== 'removed');
  const removedItems = items.filter(i => i.status === 'removed');

  return { activeItems, removedItems, isLoading, addItem };
}
```

### Contexto de sessao no log

Para exibir "Sessao X" no log, precisamos saber em qual sessao o item foi adicionado. Isso pode ser aproximado por data (comparar `added_at` com datas de sessoes da campanha). Para MVP, exibir apenas a data relativa ("ha 3 dias", "ha 2 sessoes" se tivermos dado de sessao).

---

## Criterios de Aceite

### Dashboard do DM — Secao Bag of Holding

1. Secao "Bag of Holding" adicionada ao dashboard de campanha do DM como accordion.
2. Titulo do accordion exibe contador: "Bag of Holding (N itens)".
3. Accordion inicia colapsado por padrao.
4. Ao expandir, exibe a lista de itens e o campo de adicao.

### Player HQ — Aba Inventario

5. Aba "Inventario" no Player HQ exibe a Bag of Holding.
6. Badge numerico no icone da aba com total de itens ativos.

### Lista de Itens

7. Cada item exibe: nome do item (bold) + quantidade (se > 1: "x3") + notas (muted, opcional).
8. Abaixo de cada item: "Adicionado por [nome] · [data relativa]".
9. Itens em ordem cronologica reversa (mais recente primeiro).
10. Campo de busca no topo filtra por nome em tempo real.
11. Empty state: "A Bag of Holding esta vazia. Adicione o primeiro item!".

### Adicao de Item

12. Botao "+" abre mini-form inline (nao modal).
13. Campos: Nome (obrigatorio, max 100 chars) + Quantidade (default 1, +/- buttons) + Notas (opcional, max 200 chars).
14. Confirmar: item aparece no topo da lista imediatamente (optimistic).
15. Salvo no banco com `added_by = auth.uid()` e `added_at = now()`.
16. Cancelar: form fecha sem salvar.

### Realtime

17. Se outro membro adiciona um item, a lista atualiza em < 3s sem recarregar a pagina.
18. Atualizacao e sinalizada visualmente por 1s (item novo com fundo highlight por breve momento).

### Historico de Removidos

19. Secao "Removidos" colapsada abaixo da lista ativa.
20. Itens removidos exibem nome com strikethrough + quem removeu + data de remocao.
21. Secao oculta se nao ha itens removidos.

### Acessibilidade

22. Campo de adicao tem `aria-label` descritivo.
23. Lista de itens e navegavel por teclado.

---

## Abordagem Tecnica

### Passo 1: Migrations 058 + 059

Criar os dois arquivos SQL conforme documentado no epic.

### Passo 2: Hook useBagOfHolding

CRUD + realtime subscription conforme acima.

### Passo 3: BagOfHolding component (view compartilhada)

```typescript
// components/campaign/BagOfHolding.tsx
// Usado tanto no DM dashboard quanto no Player HQ
interface BagOfHoldingProps {
  campaignId: string;
  viewerRole: 'dm' | 'player'; // controla se mostra opcoes de aprovacao (F10)
}
```

### Passo 4: Integrar no DM Dashboard

Adicionar `<BagOfHolding>` como secao accordion na pagina de campanha do DM.

### Passo 5: Integrar no Player HQ

Adicionar na aba Inventario do Player HQ.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `supabase/migrations/058_party_inventory.sql` | Criar | Tabela party_inventory_items + RLS |
| `supabase/migrations/059_inventory_removal_requests.sql` | Criar | Tabela removal_requests + RLS |
| `lib/types/database.ts` | Editar | Tipos PartyInventoryItem, RemovalRequest |
| `hooks/useBagOfHolding.ts` | Criar | CRUD + realtime |
| `components/campaign/BagOfHolding.tsx` | Criar | Componente view compartilhada DM+Player |
| `components/campaign/BagOfHoldingItem.tsx` | Criar | Card de item com log |
| `components/campaign/AddItemForm.tsx` | Criar | Mini-form inline de adicao |
| `app/(authenticated)/campaign/[id]/page.tsx` | Editar | Adicionar secao na view DM |
| `app/(authenticated)/campaign/[id]/inventory/page.tsx` | Criar | Aba Inventario do Player HQ |
| `messages/pt-BR.json` | Editar | Strings da Bag of Holding |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. DM abre campanha: secao "Bag of Holding (0 itens)" visivel e colapsada.
2. DM adiciona "Poção de Cura x2 com notas 'grande'": aparece na lista.
3. Jogador logado abre aba Inventario: ve o item adicionado pelo DM.
4. Jogador adiciona "Corda de Seda x1": log mostra nome do jogador + data.
5. DM ve o item adicionado pelo jogador em < 3s (realtime).
6. Campo de busca: digitar "poca" filtra para "Poção de Cura".
7. 10 itens na bag: contador do accordion mostra "(10 itens)".
8. Item removido (manual no banco para teste): aparece na secao "Removidos" com strikethrough.

---

## Notas de Paridade

| Modo | Acesso | Justificativa |
|---|---|---|
| Guest | NAO | Sem campanha persistente |
| Anonimo (`/join`) | NAO | Sem campaign_members |
| Autenticado (DM) | SIM | Ve + adiciona + aprova remocoes |
| Autenticado (Player) | SIM | Ve + adiciona + solicita remocao (F10) |

---

## Definicao de Pronto

- [ ] Migrations 058 + 059 criadas e aplicadas
- [ ] useBagOfHolding com realtime funcionando
- [ ] BagOfHolding renderiza lista com log de adicoes
- [ ] AddItemForm com 3 campos e optimistic insert
- [ ] Secao no DM dashboard (accordion colapsado)
- [ ] Aba Inventario no Player HQ
- [ ] Realtime: novo item de outro membro aparece < 3s
- [ ] Busca filtra por nome client-side
- [ ] Build sem erros
