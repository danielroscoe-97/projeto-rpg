# PHQ-E4-F10 — Bag of Holding: Fluxo de Remocao com Aprovacao do DM

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 8 SP
**Dependencia:** PHQ-E4-F9 (Bag of Holding core existe, tabela removal_requests criada)
**Arquivos principais:** `components/campaign/BagOfHoldingItem.tsx` (editar), `components/campaign/RemovalRequestBadge.tsx` (novo), `components/campaign/DmRemovalApprovalPanel.tsx` (novo), `hooks/useBagOfHolding.ts` (editar)

---

## Resumo

Jogadores nao podem remover itens da Bag of Holding diretamente. Eles precisam **solicitar ao DM**, que aprova ou nega de forma assincrona. Isso preserva a integridade narrativa da campanha — o mestre sabe o que sai do inventario coletivo.

O DM pode remover itens diretamente, sem aprovacao propria.

Esta story implementa o fluxo completo: solicitacao do jogador → DM ve pendentes → DM aprova ou nega → item e removido (ou permanece na bag).

---

## Decisoes de UX

**D1: Botao "Solicitar Remocao" em cada item (visao do jogador).** Cada item na Bag tem um menu de tres pontos. Opcoes para o jogador: "Solicitar Remocao". Ao clicar, aparece um mini-form inline: motivo (opcional, ex: "Vou usar agora"). Confirmar envia a solicitacao.

**D2: Estado "Aguardando aprovacao".** Apos solicitar, o item fica com badge amarelo "Aguardando DM" na lista do jogador. O item continua visivel (status = 'pending_removal'). Jogador nao pode solicitar nova remocao do mesmo item enquanto ha pendente.

**D3: DM ve badge de urgencia.** No accordion "Bag of Holding" do dashboard do DM, aparece badge numerico vermelho com contagem de solicitacoes pendentes: "Bag of Holding (3) ●2". Dentro da bag, itens com solicitacao pendente tem destaque visual: borda amarela pulsante.

**D4: Painel de aprovacao do DM.** Item pendente tem dois botoes no card: "✓ Aprovar" (verde) e "✗ Negar" (vermelho). Ao negar, campo opcional de motivo ("O item nao pode ser removido agora"). Sem modal — acoes inline no card.

**D5: DM remove diretamente.** No menu de tres pontos do item (visao DM), opcao "Remover da Bag" — sem solicitacao, sem aprovacao. Confirmacao rapida inline.

**D6: Item removido some da lista ativa.** Apos aprovacao, item muda para `status = 'removed'` e vai para a secao "Historico de Removidos" (colapsada). O log mostra: "Removido por [jogador] com aprovacao de [DM] · [data]".

---

## Contexto Tecnico

### Fluxo de estados do item

```
active
  └─ player solicita remocao → pending_removal
      ├─ DM aprova → removed
      └─ DM nega → active (solicitacao fechada)
```

### Fluxo de estados da solicitacao

```
pending → approved (item vira removed)
       → denied (item volta a active, notificacao ao jogador via F11)
```

### Hook useBagOfHolding — extensao

```typescript
// Adicionar ao hook existente:

const requestRemoval = async (itemId: string, reason?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('inventory_removal_requests').insert({
    item_id: itemId,
    campaign_id: campaignId,
    requested_by: user!.id,
    status: 'pending',
  });
  // Atualizar status do item otimisticamente
  await supabase
    .from('party_inventory_items')
    .update({ status: 'pending_removal' })
    .eq('id', itemId);
};

const approveRemoval = async (requestId: string, itemId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  // Atualizar request
  await supabase.from('inventory_removal_requests').update({
    status: 'approved',
    approved_by: user!.id,
    approved_at: new Date().toISOString(),
  }).eq('id', requestId);
  // Atualizar item
  await supabase.from('party_inventory_items').update({
    status: 'removed',
    removed_at: new Date().toISOString(),
    removal_approved_by: user!.id,
  }).eq('id', itemId);
  // Notificacao criada via trigger do banco (F11)
};

const denyRemoval = async (requestId: string, itemId: string, reason?: string) => {
  await supabase.from('inventory_removal_requests').update({
    status: 'denied',
    denial_reason: reason ?? null,
  }).eq('id', requestId);
  // Item volta para active
  await supabase.from('party_inventory_items').update({
    status: 'active',
  }).eq('id', itemId);
  // Notificacao criada via trigger do banco (F11)
};

const directRemove = async (itemId: string) => {
  // Somente DM — sem solicitacao
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('party_inventory_items').update({
    status: 'removed',
    removed_by: user!.id,
    removed_at: new Date().toISOString(),
  }).eq('id', itemId);
};
```

### Trigger para criar notificacoes (F11 preparacao)

O banco cria a notificacao automaticamente via trigger quando `inventory_removal_requests.status` muda para `approved` ou `denied`. Isso desacopla F10 de F11 — F10 nao precisa conhecer o sistema de notificacoes.

```sql
-- Parte de migration 060 (player_notifications)
CREATE OR REPLACE FUNCTION notify_removal_decision()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' OR NEW.status = 'denied' THEN
    INSERT INTO player_notifications (user_id, campaign_id, type, title, message, meta)
    SELECT
      NEW.requested_by,
      NEW.campaign_id,
      CASE WHEN NEW.status = 'approved' THEN 'removal_approved' ELSE 'removal_denied' END,
      CASE WHEN NEW.status = 'approved' THEN 'Item removido da Bag!'
           ELSE 'Remocao negada pelo Mestre' END,
      CASE WHEN NEW.status = 'approved'
           THEN 'O Mestre aprovou a remocao do item.'
           ELSE COALESCE('Motivo: ' || NEW.denial_reason, 'O Mestre nao aprovou a remocao.') END,
      jsonb_build_object('item_id', NEW.item_id, 'request_id', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER removal_decision_notify
  AFTER UPDATE ON inventory_removal_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status IN ('approved', 'denied'))
  EXECUTE FUNCTION notify_removal_decision();
```

---

## Criterios de Aceite

### Visao do Jogador

1. Menu de tres pontos em cada item ativo: opcao "Solicitar Remocao".
2. Tap em "Solicitar Remocao": mini-form inline com campo de motivo (opcional).
3. Confirmar: item recebe badge amarelo "Aguardando DM".
4. Enquanto pendente: opcao "Solicitar Remocao" fica desabilitada para aquele item.
5. Jogador ve o estado pendente em tempo real (realtime subscription).

### Visao do DM

6. Accordion "Bag of Holding" exibe badge numerico com solicitacoes pendentes.
7. Items com solicitacao pendente tem borda/destaque amarelo.
8. Cada item pendente exibe: nome do solicitante + motivo (se informado) + data da solicitacao.
9. Botao "Aprovar" (verde) e "Negar" (vermelho) visivel nos items pendentes.
10. Tap em "Negar": campo de motivo opcional aparece inline antes de confirmar.
11. Confirmar aprovacao: item some da lista ativa e vai para "Removidos".
12. Confirmar negacao: item volta para estado ativo sem badge.

### Remocao Direta pelo DM

13. Menu de tres pontos (visao DM): opcao "Remover da Bag".
14. Confirmacao rapida inline: "Remover [nome]?".
15. Confirmar: item vai para "Removidos" sem notificacao ao jogador.

### Estados e Log

16. Item removido por aprovacao: log mostra "Removido por [jogador] · aprovado por [DM] · [data]".
17. Item removido diretamente pelo DM: log mostra "Removido por [DM] · [data]".
18. Item negado: volta a exibicao normal sem badge, sem historico de negacao visivel para o jogador (apenas notificacao F11).

### Realtime

19. Quando DM aprova/nega, o estado do item no Player HQ do jogador atualiza em < 3s.
20. Quando jogador solicita, o DM ve o badge de pendente em < 3s.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `hooks/useBagOfHolding.ts` | Editar | Adicionar requestRemoval, approveRemoval, denyRemoval, directRemove |
| `components/campaign/BagOfHoldingItem.tsx` | Editar | Adicionar menu de acoes por role + badge pendente |
| `components/campaign/RemovalRequestBadge.tsx` | Criar | Badge amarelo "Aguardando DM" |
| `components/campaign/DmRemovalApprovalPanel.tsx` | Criar | Painel inline de aprovacao/negacao |
| `supabase/migrations/060_player_notifications.sql` | Criar | Tabela + trigger de notificacao |
| `messages/pt-BR.json` | Editar | Strings de remocao |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Jogador solicita remocao de "Poção de Cura": badge "Aguardando DM" aparece.
2. DM ve badge "●1" no accordion da Bag.
3. DM abre bag: item tem destaque amarelo + botoes Aprovar/Negar.
4. DM aprova: item some da lista ativa, aparece em "Removidos".
5. Player HQ do jogador: item some em < 3s.
6. DM nega com motivo "Precisamos pra o boss": item volta ao normal, badge some.
7. Jogador pode solicitar novamente apos negacao.
8. DM remove diretamente: sem solicitacao, sem notificacao ao jogador.
9. Trigger de notificacao: apos aprovacao, row criada em player_notifications.

---

## Notas de Paridade

| Modo | Remocao | Aprovacao |
|---|---|---|
| Guest | NAO | NAO |
| Anonimo | NAO | NAO |
| Player logado | Solicita | NAO |
| DM logado | Direta | SIM |

---

## Definicao de Pronto

- [ ] requestRemoval: item muda para pending_removal, badge aparece
- [ ] approveRemoval: item muda para removed, trigger cria notificacao
- [ ] denyRemoval: item volta para active, trigger cria notificacao
- [ ] directRemove (DM): remove sem solicitacao
- [ ] DM ve badge de pendentes no accordion
- [ ] Acoes inline de aprovacao/negacao funcionando
- [ ] Realtime em ambas as direcoes (jogador ↔ DM)
- [ ] Build sem erros
