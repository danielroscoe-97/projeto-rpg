# PHQ-E3-F8 — Resource Tracker: Reset Short Rest / Long Rest / Dawn

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 3 SP
**Dependencia:** PHQ-E3-F6 (trackers existem no banco)
**Arquivos principais:** `components/player-hq/RestResetPanel.tsx` (novo), `hooks/useResourceTrackers.ts` (editar — adicionar resetByType)

---

## Resumo

Em D&D 5e, recursos se recuperam em descanso curto (Short Rest), descanso longo (Long Rest) ou ao amanhecer (Dawn). Quando o DM declara "voces descansam", o jogador precisa resetar os recursos corretos com um toque — sem ter que ir em cada tracker individualmente.

Esta story adiciona os **botoes de reset em massa** por tipo de descanso. Um toque em "Long Rest" reseta todos os trackers marcados como Long Rest (e tambem os de Short Rest, ja que Long Rest inclui Short Rest). Spell slots tambem sao resetados se o reset type for Long Rest.

---

## Decisoes de UX

**D1: Botoes de descanso no topo da aba Resources.** Tres botoes em linha no topo: "🌗 Short Rest", "🌕 Long Rest", "🌅 Dawn". Sempre visiveis — sao as acoes mais frequentes durante uma sessao.

**D2: Long Rest reseta tudo.** Long Rest reseta: trackers com `reset_type = 'long_rest'` + trackers com `reset_type = 'short_rest'` (ja que Long Rest inclui Short Rest) + spell slots (`spell_slots` JSONB). Dawn reseta apenas trackers com `reset_type = 'dawn'`.

**D3: Confirmacao rapida, nao modal.** Tap no botao de descanso → aparece uma confirmacao inline abaixo do botao: "Resetar todos os recursos de Long Rest? [Sim] [Nao]". Expira em 5s automaticamente. Nao bloqueia a tela.

**D4: Toast de feedback.** Apos confirmar: toast no topo da tela: "Long Rest! X recursos recuperados." com icone de lua cheia. Duracao 3s.

**D5: Haptic triplo para Long Rest.** Feedback tatil distinto: `navigator.vibrate([100, 50, 100])` — o mesmo padrao do botao Long Rest do SpellSlotTracker (F-41). Coerencia de feedback.

**D6: Botoes desativados quando ha nada a resetar.** Se nenhum tracker tem usos gastos do tipo selecionado, o botao fica em estado `disabled` com opacidade reduzida. Evita toque acidental inutil.

---

## Contexto Tecnico

### Logica de reset por tipo

```typescript
// hooks/useResourceTrackers.ts

const resetByType = async (restType: 'short_rest' | 'long_rest' | 'dawn') => {
  // Quais reset_types sao afetados por cada tipo de descanso
  const typesToReset: Record<string, ResetType[]> = {
    short_rest: ['short_rest'],
    long_rest: ['short_rest', 'long_rest'],
    dawn: ['dawn'],
  };
  const affectedTypes = typesToReset[restType];

  // Atualizar trackers localmente (optimistic)
  setTrackers(prev =>
    prev.map(t =>
      affectedTypes.includes(t.reset_type)
        ? { ...t, current_uses: 0 }
        : t
    )
  );

  // Salvar no banco
  await supabase
    .from('character_resource_trackers')
    .update({ current_uses: 0 })
    .eq('player_character_id', characterId)
    .in('reset_type', affectedTypes);

  // Long Rest tambem reseta spell slots
  if (restType === 'long_rest') {
    const resetSpellSlots = Object.fromEntries(
      Object.entries(character.spell_slots ?? {}).map(([level, slot]) => [
        level,
        { ...slot, used: 0 },
      ])
    );
    await supabase
      .from('player_characters')
      .update({ spell_slots: resetSpellSlots })
      .eq('id', characterId);
  }

  return affectedTypes;
};
```

### Contagem para validar se ha algo a resetar

```typescript
function countGastedByType(trackers: ResourceTracker[], restType: ResetRestType): number {
  const affectedTypes = REST_RESET_MAP[restType];
  return trackers
    .filter(t => affectedTypes.includes(t.reset_type) && t.current_uses > 0)
    .length;
}
```

---

## Criterios de Aceite

### Botoes de Descanso

1. Tres botoes visiveis no topo da aba Resources: Short Rest, Long Rest, Dawn.
2. Cada botao exibe: icone + label + contagem de recursos a recuperar (badge numerico).
3. Botao desativado (opacity-50, pointer-events-none) se contagem = 0.

### Fluxo de Confirmacao

4. Tap no botao ativo: confirmacao inline aparece abaixo do botao.
5. Confirmacao mostra: "Resetar X recursos de [tipo]? Isso nao pode ser desfeito."
6. Botoes "Sim" e "Cancelar" na confirmacao.
7. Sem resposta em 5s: confirmacao desaparece automaticamente.
8. "Cancelar": confirmacao some, nenhum reset acontece.
9. "Sim": reset executado (ver criterios abaixo).

### Comportamento do Reset

10. Short Rest: reseta `current_uses = 0` em todos trackers com `reset_type = 'short_rest'`.
11. Long Rest: reseta trackers `short_rest` + `long_rest` + spell_slots JSONB.
12. Dawn: reseta somente trackers com `reset_type = 'dawn'`.
13. Trackers `manual` NUNCA sao resetados por nenhum botao de descanso.
14. Atualizacao e otimistica — lista ja mostra dots cheios antes da resposta do banco.

### Feedback

15. Toast: "Long Rest! 4 recursos recuperados." por 3s.
16. Haptic: `navigator.vibrate([100, 50, 100])` para Long Rest, `[50]` para Short Rest e Dawn.
17. Icone do tipo de descanso no toast.

### Spell Slots

18. Long Rest reseta todos os spell slots (used = 0 para todos os niveis).
19. Spell Slots tracker (SpellSlotTracker / PHQ-E5-F12) reflete o reset imediatamente.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `components/player-hq/RestResetPanel.tsx` | Criar | Painel com 3 botoes de descanso + confirmacao |
| `hooks/useResourceTrackers.ts` | Editar | Adicionar resetByType com batch update |
| `app/(authenticated)/campaign/[id]/resources/page.tsx` | Editar | Integrar RestResetPanel no topo |
| `messages/pt-BR.json` | Editar | Strings: short_rest, long_rest, dawn, reset_confirm, reset_toast |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Todos trackers com usos cheios: botoes Short Rest e Long Rest desabilitados.
2. Gastar 2 usos de Wild Shape (Short Rest): botao Short Rest mostra badge "1", Long Rest mostra badge "1".
3. Tap Short Rest → confirmacao → Sim: Wild Shape resetado, toast aparece.
4. Tap Long Rest com Sorcery Points gastos: Sorcery + Wild Shape resetados + spell slots.
5. Dawn button: somente trackers tipo 'dawn' sao afetados.
6. Trackers manuais: NUNCA resetados por qualquer botao de descanso.
7. Cancelar confirmacao: nenhuma alteracao.
8. Confirmacao expira em 5s: desaparece automaticamente.
9. Haptic: Long Rest = [100,50,100], Short Rest = [50].

---

## Notas de Paridade

| Modo | Aplica? | Justificativa |
|---|---|---|
| Guest | NAO | Auth-only |
| Anonimo | NAO | Auth-only |
| Autenticado | SIM | Player HQ |

---

## Definicao de Pronto

- [ ] RestResetPanel com 3 botoes e badges de contagem
- [ ] Botoes desabilitados quando nada a resetar
- [ ] Confirmacao inline com timeout de 5s
- [ ] Reset em batch (short, long, dawn) com logica correta de inclusao
- [ ] Long Rest reseta spell slots tambem
- [ ] Optimistic update + toast + haptic
- [ ] Build sem erros
