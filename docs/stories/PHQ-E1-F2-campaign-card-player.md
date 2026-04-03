# PHQ-E1-F2 — Campaign Card: Imagem DM + Status Rapido

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 3 SP
**Dependencia:** PHQ-E1-F1 (PlayerCampaignCard base existente)
**Arquivos principais:** `components/dashboard/PlayerCampaignCard.tsx`, `components/campaign/CampaignImageUpload.tsx` (ja existente no DM view), `app/(authenticated)/campaign/[id]/settings/page.tsx`

---

## Resumo

O card de campanha na Player Home precisa mostrar a imagem que o DM escolheu para aquela campanha — criando identidade visual imediata. Alem disso, o card precisa exibir um "status rapido" do personagem: quantos resource trackers tem usos restantes, se ha spell slots disponíveis, e notificacoes pendentes.

Esta story refina o PlayerCampaignCard alem do basico do F1, adicionando camadas visuais e informacionais que fazem o jogador querer abrir o app entre sessoes.

---

## Decisoes de UX

**D1: Imagem como experiencia, nao decoracao.** A imagem da campanha ocupa toda a area do card (card tipo "hero"). Nao e um thumbnail lateral — e o background do card inteiro. Isso cria imersao visual e diferencia visualmente campanhas diferentes.

**D2: Overlay gradiente, nao solido.** O overlay e um gradiente da base para o topo: `from-black/80 via-black/40 to-transparent`. O nome da campanha fica na base (maximo contraste), informacoes do personagem ficam no meio, e o topo da imagem fica visivel.

**D3: "Status rapido" como chips compactos.** Na parte inferior do card, antes do CTA, exibe chips de status em linha: "3/5 Slots", "2/3 Ki", "HP: FULL". Chips vermelhos para recursos esgotados, dourados para parciais, verdes para cheios. Maximo 3 chips para nao poluir.

**D4: Badge de notificacao.** Se ha notificacoes nao lidas (aprovacao de bag, etc.), exibe um badge numerico no canto superior direito do card. Toque no badge leva para a secao de notas/notificacoes.

**D5: Dimensoes fixas do card.** Card tem altura fixa de 200px no mobile, 240px no desktop. Imagens sao sempre `object-cover` para preencher sem distorcao.

**D6: Pixel art border.** Cards de campanha tem borda com o estilo visual do projeto — `border border-amber-700/40` com `rounded-lg`. Em hover/focus: `border-amber-500/70` com transicao suave.

---

## Contexto Tecnico

### Dado adicional necessario

```typescript
// Extend a query de memberships (PHQ-E1-F1) para incluir:
const { data } = await supabase
  .from('campaign_members')
  .select(`
    *,
    campaign:campaigns(
      id, name, cover_image_url, owner_id,
      owner:auth.users(raw_user_meta_data),
      active_session:combat_sessions(id)
    ),
    character:player_characters(
      id, name, race, class, level,
      max_hp, current_hp,
      spell_slots,
      resource_trackers:character_resource_trackers(
        id, name, max_uses, current_uses, reset_type
      )
    ),
    unread_notifications:player_notifications(count)
  `)
  .eq('user_id', userId)
  .eq('role', 'player')
  .eq('status', 'active');
```

### Logica de status chips

```typescript
function buildStatusChips(character: PlayerCharacter): StatusChip[] {
  const chips: StatusChip[] = [];

  // HP chip
  const hpPct = character.current_hp / character.max_hp;
  if (hpPct < 0.1) chips.push({ label: 'HP: CRITICO', color: 'red' });
  else if (hpPct < 0.4) chips.push({ label: 'HP: BAIXO', color: 'orange' });
  else if (hpPct < 0.7) chips.push({ label: 'HP: MEDIO', color: 'yellow' });
  else chips.push({ label: 'HP: OK', color: 'green' });

  // Spell slots chip (total restante)
  if (character.spell_slots) {
    const totalMax = Object.values(character.spell_slots).reduce((a, s) => a + s.max, 0);
    const totalUsed = Object.values(character.spell_slots).reduce((a, s) => a + s.used, 0);
    const remaining = totalMax - totalUsed;
    if (totalMax > 0) {
      const color = remaining === 0 ? 'red' : remaining < totalMax / 2 ? 'yellow' : 'green';
      chips.push({ label: `${remaining}/${totalMax} Slots`, color });
    }
  }

  // Resource trackers (top 1 mais urgente)
  if (character.resource_trackers?.length > 0) {
    const mostDepleted = character.resource_trackers
      .sort((a, b) => (a.current_uses / a.max_uses) - (b.current_uses / b.max_uses))[0];
    const remaining = mostDepleted.max_uses - mostDepleted.current_uses;
    if (remaining < mostDepleted.max_uses) {
      const color = remaining === 0 ? 'red' : 'yellow';
      chips.push({ label: `${remaining}/${mostDepleted.max_uses} ${mostDepleted.name}`, color });
    }
  }

  return chips.slice(0, 3); // max 3 chips
}
```

---

## Criterios de Aceite

### Visual

1. Card tem altura fixa (200px mobile / 240px desktop) com `object-cover` na imagem.
2. Overlay e gradiente `from-black/80 via-black/40 to-transparent` aplicado sobre a imagem.
3. Nome da campanha e exibido na base do card sobre o overlay (branco, bold).
4. Nome do DM exibido abaixo do nome da campanha em tamanho menor (muted).
5. Avatar/nome do personagem exibido no topo esquerdo do card.
6. Sem imagem: fundo com gradient padrao da paleta do projeto (sem imagem quebrada).
7. Borda `border-amber-700/40`, hover/focus: `border-amber-500/70`.

### Status Chips

8. Chips de status exibidos em linha horizontal abaixo do nome do personagem.
9. Maximo 3 chips exibidos.
10. Cores dos chips: vermelho para esgotado/critico, amarelo para parcial, verde para cheio.
11. Se personagem nao tem recursos configurados (novo personagem), nenhum chip de recurso aparece.
12. Chip de HP sempre aparece se personagem tem HP configurado.

### Badge de Notificacao

13. Badge com contagem de notificacoes nao lidas no canto superior direito do card.
14. Badge so aparece se count > 0.
15. Badge tem cor vermelha com texto branco.

### Interacao

16. Click/tap no card navega para `/app/campaign/[id]`.
17. Click/tap no badge de notificacao navega para `/app/campaign/[id]/notes` (secao de notificacoes).
18. Ambos os CTAs (Abrir HQ / Entrar na Sessao) funcionam como na F1.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `components/dashboard/PlayerCampaignCard.tsx` | Editar | Adicionar overlay gradiente, status chips, badge notificacao |
| `lib/utils/status-chips.ts` | Criar | Funcao `buildStatusChips` |
| `messages/pt-BR.json` | Editar | Chips: `hp_full`, `hp_low`, `hp_critical`, `slots_remaining`, etc. |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Card com imagem: overlay gradiente visivel, texto legivel sobre qualquer imagem.
2. Card sem imagem: gradient padrao sem imagem quebrada.
3. Personagem com HP critico (< 10%): chip vermelho "HP: CRITICO".
4. Personagem com spell slots gastos: chip vermelho "0/4 Slots".
5. Personagem sem recursos configurados: somente chip de HP.
6. Badge de notificacao: aparece com contagem correta, navega para secao de notas.
7. Mobile 375px: card nao transborda, chips em linha quebram graciosamente se necessario.

---

## Definicao de Pronto

- [ ] Overlay gradiente implementado corretamente sobre a imagem
- [ ] Status chips com cores semanticas (HP + spell slots + top resource)
- [ ] Badge de notificacoes com contagem
- [ ] Fallback visual para campanhas sem imagem
- [ ] Interacoes de navegacao funcionando (card, badge, CTAs)
- [ ] Responsivo mobile 375px+
- [ ] Build sem erros
