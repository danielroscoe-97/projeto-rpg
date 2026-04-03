# PHQ-E4-F11 — Bag of Holding: Notificacoes Assincronas de Aprovacao/Negacao

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Media
**Estimativa:** 5 SP
**Dependencia:** PHQ-E4-F10 (trigger de notificacao criado), migration 060 (player_notifications)
**Arquivos principais:** `components/notifications/NotificationBell.tsx` (novo), `components/notifications/NotificationFeed.tsx` (novo), `hooks/useNotifications.ts` (novo), `app/(authenticated)/dashboard/page.tsx` (editar — bell no header)

---

## Resumo

Quando o DM aprova ou nega uma solicitacao de remocao da Bag of Holding, o jogador precisa ser informado. Como a aprovacao e assincrona (DM pode responder horas depois), a notificacao precisa persistir ate o jogador ver.

Esta story implementa o **sistema de notificacoes in-app** para o Player HQ. A notificacao aparece como badge no sino do header quando o jogador loga ou quando a aprovacao acontece enquanto ele esta online (realtime).

**Escopo desta story:** notificacoes in-app apenas. Email fica para sprint futuro (depende de SMTP configurado + Edge Function).

---

## Decisoes de UX

**D1: Sino de notificacoes no header global.** Icone de sino no header da area autenticada (ao lado do avatar/menu do usuario). Badge vermelho com contagem de nao lidas. Tap abre dropdown/panel de notificacoes.

**D2: Notificacao como card compacto.** Cada notificacao exibe: icone do tipo + titulo + mensagem curta + data relativa. Background levemente diferente para nao lidas. Tap na notificacao marca como lida e navega para o contexto relevante (a bag da campanha).

**D3: Marcar como lida ao abrir o panel.** Ao abrir o panel de notificacoes, todas as visiveis sao marcadas como lidas automaticamente (atualiza `read_at`). Sem botao "marcar tudo como lido" separado.

**D4: Tipos de notificacao com icones semanticos.**
- `removal_approved`: ✅ verde — "Item retirado da Bag!"
- `removal_denied`: ❌ vermelho — "Remocao negada"
- Futuro: outros tipos podem ser adicionados sem refactor

**D5: Maximo de 50 notificacoes no feed.** As mais antigas sao automaticamente omitidas (LIMIT 50 na query, order by created_at DESC). Sem paginacao no MVP — simplifica a implementacao.

**D6: Notificacao realtime quando online.** Se o jogador esta com o app aberto quando o DM aprova/nega, a notificacao aparece instantaneamente via Supabase realtime. Badge atualiza sem recarregar.

**D7: Zero email no MVP.** Email e um requisito futuro (bucket). Esta story entrega notificacao in-app. Documentar como TO-DO no proprio codigo e no `docs/bucket-future-ideas.md`.

---

## Contexto Tecnico

### Migration 060 (ja especificada no epic)

```sql
CREATE TABLE player_notifications ( ... );
-- Trigger notify_removal_decision criado na F10
```

### Hook useNotifications

```typescript
// hooks/useNotifications.ts
export function useNotifications() {
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('player_notifications')
        .select('*, campaign:campaigns(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setNotifications(data ?? []);
      setUnreadCount((data ?? []).filter(n => !n.read_at).length);
    };

    loadNotifications();

    // Realtime: novas notificacoes
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'player_notifications',
        filter: `user_id=eq.${supabase.auth.getUser().then(r => r.data.user?.id)}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as PlayerNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('player_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user!.id)
      .is('read_at', null);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAllRead };
}
```

### Navegacao ao clicar na notificacao

```typescript
const NOTIFICATION_ROUTES: Record<string, (meta: Record<string, string>) => string> = {
  removal_approved: (meta) => `/app/campaign/${meta.campaign_id}/inventory`,
  removal_denied:   (meta) => `/app/campaign/${meta.campaign_id}/inventory`,
};

function getNotificationRoute(notification: PlayerNotification): string {
  const handler = NOTIFICATION_ROUTES[notification.type];
  return handler
    ? handler(notification.meta as Record<string, string>)
    : notification.campaign_id
      ? `/app/campaign/${notification.campaign_id}`
      : '/app/dashboard';
}
```

---

## Criterios de Aceite

### Badge no Header

1. Icone de sino no header da area autenticada.
2. Badge vermelho com contagem de notificacoes nao lidas.
3. Badge desaparece (ou mostra 0) quando todas estao lidas.
4. Badge atualiza em tempo real quando nova notificacao chega.

### Panel de Notificacoes

5. Tap no sino abre dropdown/panel de notificacoes.
6. Panel exibe ate 50 notificacoes mais recentes.
7. Notificacoes nao lidas com fundo levemente destacado.
8. Ao abrir o panel: todas as notificacoes visiveis marcadas como lidas (read_at = now).
9. Empty state: "Nenhuma notificacao por enquanto."

### Card de Notificacao

10. Icone semantico por tipo: ✅ para aprovado, ❌ para negado.
11. Titulo e mensagem conforme dados do banco.
12. Data relativa: "ha 5 minutos", "ha 2 dias".
13. Nome da campanha visivel em texto muted.
14. Tap navega para o contexto relevante (aba Inventario da campanha).

### Realtime

15. Quando DM aprova remocao e jogador esta online: notificacao aparece em < 5s sem reload.
16. Badge do sino incrementa automaticamente.

### Email (TO-DO documentado)

17. Comentario `// TODO: Email notification via Edge Function — ver bucket-future-ideas.md` no hook.
18. `docs/bucket-future-ideas.md` tem entrada para "Email notifications para aprovacao de bag".

---

## Abordagem Tecnica

### Passo 1: NotificationBell

```typescript
// components/notifications/NotificationBell.tsx
export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative" aria-label={`${unreadCount} notificacoes`}>
          <BellIcon className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <NotificationFeed notifications={notifications} />
      </PopoverContent>
    </Popover>
  );
}
```

### Passo 2: Integrar no layout da area autenticada

Adicionar `<NotificationBell>` no header global de `app/(authenticated)/layout.tsx`.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `hooks/useNotifications.ts` | Criar | CRUD + realtime |
| `components/notifications/NotificationBell.tsx` | Criar | Sino + badge + popover |
| `components/notifications/NotificationFeed.tsx` | Criar | Lista de notificacoes |
| `components/notifications/NotificationCard.tsx` | Criar | Card individual |
| `app/(authenticated)/layout.tsx` | Editar | Adicionar NotificationBell no header |
| `docs/bucket-future-ideas.md` | Editar | Adicionar entrada de email notification |
| `messages/pt-BR.json` | Editar | Strings de notificacoes |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Jogador sem notificacoes: sino sem badge.
2. DM aprova remocao: sino do jogador mostra badge "1" em < 5s.
3. Jogador abre panel: notificacao visivel com icone ✅ e titulo correto.
4. Fechar e abrir de novo: badge desaparece (marcado como lido).
5. DM nega com motivo: notificacao com icone ❌ e motivo na mensagem.
6. Tap na notificacao: navega para aba Inventario da campanha correta.
7. 2 notificacoes: badge mostra "2", ambas aparecem no feed.
8. Empty state: "Nenhuma notificacao por enquanto."

---

## Notas de Paridade

| Modo | Aplica? | Justificativa |
|---|---|---|
| Guest | NAO | Sem conta |
| Anonimo | NAO | Sem conta |
| Autenticado (Player) | SIM | Recebe notificacoes |
| Autenticado (DM) | Futuro | DM pode receber notificacoes de outros tipos |

---

## Definicao de Pronto

- [ ] useNotifications com realtime INSERT
- [ ] NotificationBell com badge e popover
- [ ] NotificationFeed com lista + empty state
- [ ] markAllRead ao abrir panel
- [ ] Navegacao ao clicar na notificacao
- [ ] Integrado no layout autenticado
- [ ] TODO de email documentado no codigo e no bucket
- [ ] Build sem erros
