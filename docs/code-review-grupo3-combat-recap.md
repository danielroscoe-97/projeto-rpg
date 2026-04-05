# Code Review — Grupo 3: Combat Recap / RecapActions

> **Data:** 2026-04-05
> **Revisor:** Claude Sonnet 4.6 (automated review)
> **Base diff:** `f8393e9..HEAD -- components/combat/CombatRecap.tsx components/combat/RecapActions.tsx`
> **Stories cobertas:** JO-04
> **Status:** ✅ APROVADO — nenhum bug nos arquivos de combate

---

## Arquivos Revisados

| Arquivo | Linhas de diff | Resultado |
|---------|---------------|-----------|
| `components/combat/CombatRecap.tsx` | +5 | ✅ Limpo |
| `components/combat/RecapActions.tsx` | +18 | ✅ Limpo |

---

## O que foi adicionado (JO-04)

**Story:** Player anônimo (via `/join`) que participou de um combate vê CTA "Entrar na Campanha" no recap pós-combate, iniciando o fluxo de cadastro com `pendingCampaignJoin` pré-preenchido.

### RecapActions.tsx
- Import `UserPlus` de `lucide-react`
- Prop `onJoinCampaign?: () => void` adicionada à interface
- Botão gold primário renderizado condicionalmente: `{onJoinCampaign && <button ...>}`
- `data-testid="recap-join-campaign-btn"` para testes E2E
- Chave i18n: `t("recap_join_campaign")`

### CombatRecap.tsx
- Prop `onJoinCampaign?: () => void` adicionada à interface
- Passada diretamente para `<RecapActions onJoinCampaign={onJoinCampaign} />`

---

## Checklist de Parity (CLAUDE.md — Combat Parity Rule)

| Modo | Arquivo | `onJoinCampaign` necessário? | Resultado |
|------|---------|------------------------------|-----------|
| Guest (`/try`) | `GuestCombatClient.tsx` | ❌ Guest não tem `sessionCampaignId` | Não precisa de mudança ✅ |
| Anônimo (`/join`) | `PlayerJoinClient.tsx` | ✅ Anon player em sessão de campanha | Guard `!authUserId && !!sessionCampaignId` ✅ |
| Autenticado (`/invite`) | `PlayerJoinClient.tsx` | ❌ Já é membro da campanha | `authUserId` truthy → `showJoinCampaignCta = false` ✅ |

---

## Outros Pontos Verificados

**i18n:** `recap_join_campaign` existe em ambos `en.json:1357` e `pt-BR.json:1357` ✅

**Contrato de localStorage:** PlayerJoinClient escreve:
```ts
localStorage.setItem("pendingCampaignJoin", JSON.stringify({
  campaignId: sessionCampaignId,  // usado por joinCampaignDirectAction
  playerName: registeredName ?? "",
  sessionId,  // P1-01: validação de ownership da sessão
}));
```
DashboardOverview lê as mesmas chaves: `{ campaignId, playerName, sessionId }` ✅

**`sessionCampaignId` prop:** passada corretamente de `app/join/[token]/page.tsx:196` ✅

**Mutualidade exclusiva:** `onJoinCampaign` (anon em campanha) e `onSaveAndSignup` (guest sem campanha) nunca são passadas juntas — sem conflito visual ✅

---

## Fix Colateral Identificado (i18n ICU Escape)

Durante a revisão, foi encontrado um fix pendente nos arquivos de mensagem:

**Arquivo:** `messages/en.json` e `messages/pt-BR.json`

**Problema:** `"checklist_progress": "{done}/{total} complete"` — next-intl interpreta `{done}` e `{total}` como variáveis ICU, mas `t("checklist_progress")` é chamado sem parâmetros em `app/app/dashboard/page.tsx:217`. Isso causaria warning/erro de runtime do next-intl.

**Fix aplicado:**
```json
"checklist_progress": "'{done}/{total}' complete"
```

**Por quê funciona:** Em ICU, single quotes escapam os `{}` → next-intl retorna o literal `{done}/{total} complete`. O `ActivationChecklist.tsx:95` então faz `.replace("{done}", ...).replace("{total}", ...)` manualmente na string resultante. Comportamento correto preservado. ✅

---

## Resultado Final

Grupo 3 **aprovado sem patches de combate**. Único commit: fix ICU escape no `checklist_progress` (i18n).
