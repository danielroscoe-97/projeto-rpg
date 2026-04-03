# PHQ-E5-F12 — Spell Slots no Player HQ (Reutiliza Bolinhas E3)

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 3 SP
**Dependencia:** PHQ-E3-F5 (ResourceDots), F-41 (SpellSlotTracker no combate), migration 054 (spell_slots column existe)
**Arquivos principais:** `components/player-hq/SpellSlotsHq.tsx` (novo), `app/(authenticated)/campaign/[id]/resources/page.tsx` (editar)

---

## Resumo

F-41 ja implementou o tracker de spell slots para a view de **combate** (`PlayerBottomBar`, `PlayerInitiativeBoard`). Esta story traz o mesmo tracker para o **Player HQ** fora de combate, na aba Resources.

A diferenca: no combate o tracker e compacto (colapsavel no bottom bar). No HQ, o tracker e expandido, com mais espaco, mais legivel, e integrado com o restante dos resource trackers.

**Reutilizacao:** o componente `SpellSlotTracker` existente e o hook de save ja funcionam. Esta story cria um wrapper `SpellSlotsHq` que usa os mesmos dados mas exibe de forma mais rica no contexto do HQ.

---

## Decisoes de UX

**D1: Spell Slots no topo da aba Resources, acima dos class resources.** A maioria dos casters usa spell slots mais que outros recursos. Posicionar no topo da aba garante acesso imediato.

**D2: Layout expandido com niveis em colunas.** No combate os slots ficam em linhas verticais. No HQ, podem ficar em uma grade 3-col: nivel + dots + contagem. Mais legivel em mobile grande e desktop.

**D3: Configuracao de slots inline.** Na aba Resources (fora de combate), o jogador pode editar o maximo de slots por nivel diretamente — sem precisar abrir o CharacterEditSheet. Tap longo no numero do nivel ou icone de lapizinho abre input inline.

**D4: Botao "Long Rest" compartilhado.** O botao Long Rest na RestResetPanel (F8) ja reseta os spell slots. O componente de slots no HQ nao precisa de botao proprio — apenas exibe o estado atual e permite gastar/recuperar individualmente.

**D5: Sem duplicacao de logica de save.** O save de spell slots ja esta implementado no F-41 (debounce, optimistic update, before unload flush). Esta story **nao reimplementa** — apenas conecta o componente HQ ao mesmo hook/logica.

---

## Contexto Tecnico

### Diferenca F-41 vs PHQ-E5-F12

| Aspecto | F-41 (Combate) | PHQ-E5-F12 (HQ) |
|---|---|---|
| Contexto | PlayerBottomBar / PlayerInitiativeBoard | Aba Resources do Player HQ |
| Layout | Linhas colapsaveis (mobile compacto) | Grade expandida, sem colapso |
| Edicao de max | Via CharacterForm | Inline na propria linha de nivel |
| Botao Long Rest | Proprio do SpellSlotTracker | Delegado para RestResetPanel (F8) |
| Fonte de dados | `player_characters.spell_slots` | Mesma fonte |

### SpellSlotsHq component

```typescript
// components/player-hq/SpellSlotsHq.tsx
interface SpellSlotsHqProps {
  characterId: string;
  spellSlots: SpellSlots; // { "1": { max: 4, used: 2 }, ... }
  onToggleSlot: (level: string, newUsed: number) => void;
  onUpdateMax: (level: string, newMax: number) => void;
}

export function SpellSlotsHq({ spellSlots, onToggleSlot, onUpdateMax }: SpellSlotsHqProps) {
  const levels = Object.entries(spellSlots)
    .filter(([, slot]) => slot.max > 0)
    .sort(([a], [b]) => parseInt(a) - parseInt(b));

  if (levels.length === 0) {
    return <SpellSlotsEmptyState />;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-amber-400">Spell Slots</h3>
      {levels.map(([level, slot]) => (
        <div key={level} className="flex items-center gap-3">
          {/* Nivel */}
          <span className="text-xs text-muted-foreground w-12 shrink-0">
            {level}o nivel
          </span>
          {/* Dots */}
          <ResourceDots
            maxUses={slot.max}
            usedCount={slot.used}
            onToggle={(index) => {
              const newUsed = index < slot.used ? index : index + 1;
              onToggleSlot(level, newUsed);
            }}
            size="md"
          />
          {/* Contagem */}
          <span className="text-xs text-muted-foreground ml-auto">
            {slot.max - slot.used}/{slot.max}
          </span>
          {/* Editar max (inline) */}
          <EditMaxButton
            value={slot.max}
            onChange={(newMax) => onUpdateMax(level, newMax)}
          />
        </div>
      ))}
      {/* Adicionar nivel de slot (para slots nao configurados) */}
      <AddSpellLevelButton onAdd={(level, max) => onUpdateMax(level.toString(), max)} />
    </div>
  );
}
```

### Empty state + adicao de niveis

Se o personagem nao configurou spell slots, exibe:
```
"Nenhum spell slot configurado.
 [Adicionar Slots]"
```
Clicar em "Adicionar Slots" abre um accordion com os 9 niveis e inputs de max (igual ao CharacterForm do F-41, mas inline na aba).

---

## Criterios de Aceite

### Display no HQ

1. Secao "Spell Slots" visivel na aba Resources acima dos class resource trackers.
2. Somente niveis com `max > 0` aparecem.
3. Cada nivel exibe: label "Xo nivel" + dots (ResourceDots) + contagem "Y/Z".
4. Dot preenchido (dourado) = disponivel. Dot vazio = usado.
5. Empty state se nenhum nivel configurado, com CTA para adicionar.

### Interacao

6. Tap em dot: gasta/recupera 1 slot do nivel correspondente.
7. Haptic `navigator.vibrate([50])` em cada toggle.
8. Debounce de 300ms no save (reutiliza logica do F-41).

### Edicao de Max Inline

9. Botao de lapizinho ao lado de cada nivel abre input numerico inline.
10. Input permite alterar o maximo de slots daquele nivel (1-30).
11. Salva imediatamente ao confirmar.

### Adicao de Novos Niveis

12. Botao "Adicionar nivel de slots" permite adicionar slots para niveis nao configurados.
13. Selecionar nivel + max → nivel aparece na lista.

### Integracao com F8 (Long Rest)

14. Ao acionar Long Rest no RestResetPanel: todos os `used` dos spell slots vao para 0.
15. SpellSlotsHq reflete o reset imediatamente (dados sao da mesma fonte).

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `components/player-hq/SpellSlotsHq.tsx` | Criar | Wrapper de spell slots para o HQ |
| `components/player-hq/AddSpellLevelButton.tsx` | Criar | Botao + dialog de adicao de nivel |
| `app/(authenticated)/campaign/[id]/resources/page.tsx` | Editar | Adicionar SpellSlotsHq no topo da aba |
| `messages/pt-BR.json` | Editar | Strings de spell slots no HQ |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Personagem com slots nivel 1 (max 4, used 2): exibe 4 dots, 2 vazios, 2 cheios.
2. Tap em dot cheio: vira vazio, contagem "1/4".
3. Long Rest via RestResetPanel: todos os dots ficam cheios.
4. Botao de editar max nivel 1: input aparece, alterar para 3, confirmar, dots ajustam.
5. Adicionar nivel 2 (max 3): aparece na lista com 3 dots cheios.
6. Personagem sem slots: empty state visivel.

---

## Definicao de Pronto

- [ ] SpellSlotsHq renderiza niveis configurados com ResourceDots
- [ ] Toggle de slot funcionando com debounce (reutiliza logica F-41)
- [ ] Edicao de max inline por nivel
- [ ] Adicao de novos niveis
- [ ] Long Rest do F8 reseta os slots visiveis
- [ ] Build sem erros, zero regressao no SpellSlotTracker do combate
