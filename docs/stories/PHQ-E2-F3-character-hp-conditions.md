# PHQ-E2-F3 — Character Sheet: HP Tracker ao Vivo + Condicoes Ativas

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 5 SP
**Dependencia:** PHQ-E1-F1 (Player HQ rota existe), migration 056 (campos hp_temp + conditions)
**Arquivos principais:** `app/(authenticated)/campaign/[id]/page.tsx` (novo), `components/player-hq/CharacterStatusPanel.tsx` (novo), `components/player-hq/ConditionBadges.tsx` (novo), `supabase/migrations/056_player_characters_extended.sql` (novo)

---

## Resumo

O HP Tracker ao vivo e o elemento central do Player HQ durante uma sessao. O jogador precisa ver e editar seu HP atual, HP temporario e status de condicoes sem sair do contexto da mesa.

Esta story implementa a **aba Sheet** (ou pagina inicial do Player HQ) com foco em HP + condicoes. O HP usa o mesmo sistema de tiers visuais (LIGHT/MODERATE/HEAVY/CRITICAL) ja implementado no combate, mas agora controlado pelo proprio jogador.

**Filosofia:** o jogador e dono do estado do seu personagem fora do combate. Durante combate ativo, o DM ainda pode sobrescrever via a interface de combate existente — os dois se sincronizam via Supabase realtime.

---

## Decisoes de UX

**D1: HP como numero + barra + tier.** Exibe HP atual / HP maximo. Abaixo, barra de progresso com cor do tier. Label do tier visivel (FULL / LIGHT / MODERATE / HEAVY / CRITICAL) conforme regra imutavel do projeto.

**D2: Edicao inline de HP.** Tap no numero do HP atual abre um input numerico inline. Nao e um modal — e o proprio valor que vira um input. Botoes +/- para ajuste rapido (+1, -1, -5, +5). Confirma com Enter ou tap fora.

**D3: HP Temporario como campo separado.** Campo menor abaixo do HP principal: "HP Temp: [valor]". Edicao inline identica. HP temp e exibido com cor diferente (azul claro / cyan).

**D4: Condicoes como chips clicaveis.** Lista de condicoes SRD padrao (Poisoned, Stunned, Blinded, etc.) exibida como chips em grade. Chip inativo = borda apenas. Chip ativo = preenchido com cor semantica (vermelho para debuffs severos, amarelo para moderados). Tap alterna. Condicoes personalizadas podem ser adicionadas.

**D5: Historico de alteracoes de HP.** Pequeno log colapsavel: "DM aplicou 8 de dano", "Voce curou 5 HP". Exibe ultimas 5 alteracoes. Nao e critico para MVP, mas deve estar no modelo de dados.

**D6: Sincronizacao realtime.** `current_hp` e `conditions` na tabela `player_characters` sao a fonte da verdade. Se o DM alterar HP via interface de combate, o Player HQ reflete em tempo real (Supabase realtime subscription).

---

## Contexto Tecnico

### Tiers de HP (regra imutavel)

```typescript
function getHpTier(current: number, max: number): HpTier {
  const pct = current / max;
  if (pct > 0.7) return 'FULL';
  if (pct > 0.4) return 'LIGHT';
  if (pct > 0.1) return 'MODERATE';
  if (pct > 0) return 'HEAVY';
  return 'CRITICAL';
}

const tierColors = {
  FULL: 'bg-emerald-500',
  LIGHT: 'bg-yellow-400',
  MODERATE: 'bg-orange-400',
  HEAVY: 'bg-red-500',
  CRITICAL: 'bg-red-700 animate-pulse',
};
```

### Condicoes SRD padrao

```typescript
const SRD_CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion',
  'Frightened', 'Grappled', 'Incapacitated', 'Invisible',
  'Paralyzed', 'Petrified', 'Poisoned', 'Prone',
  'Restrained', 'Stunned', 'Unconscious',
] as const;
```

### Schema — migration 056

```sql
-- Ja documentado no epic
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS hp_temp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]';
-- (mais colunas conforme epic)
```

### Realtime subscription

```typescript
// Em CharacterStatusPanel ou hook useCharacterStatus
useEffect(() => {
  const channel = supabase
    .channel(`character:${characterId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'player_characters',
      filter: `id=eq.${characterId}`,
    }, (payload) => {
      setCharacter(prev => ({ ...prev, ...payload.new }));
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [characterId]);
```

---

## Criterios de Aceite

### Display de HP

1. HP atual e maximo exibidos em destaque: "[atual] / [maximo]".
2. Barra de progresso abaixo com cor do tier (FULL=verde, LIGHT=amarelo, MODERATE=laranja, HEAVY=vermelho, CRITICAL=vermelho pulsante).
3. Label do tier exibido ao lado ou abaixo da barra.
4. HP Temp exibido separadamente em cor cyan quando > 0.

### Edicao de HP

5. Tap no HP atual converte para input numerico inline.
6. Input aceita apenas numeros positivos (0 a max_hp + hp_temp).
7. Botoes rapidos: -5, -1, +1, +5 ao redor do input.
8. Enter ou tap fora confirma e salva no banco.
9. Haptic feedback (`navigator.vibrate([50])`) ao confirmar edicao.
10. Salvo com debounce de 500ms ou imediatamente ao confirmar.
11. HP nao pode ser negativo (clamped a 0).
12. HP nao pode exceder max_hp (clamped ao maximo).

### HP Temporario

13. Campo "HP Temp" separado, editavel inline.
14. Valor 0 e omitido da exibicao (campo aparece somente se > 0 ou em modo de edicao da sheet).

### Condicoes

15. Grid de chips com as 15 condicoes SRD.
16. Condicao inativa: chip com borda apenas.
17. Condicao ativa: chip preenchido com cor semantica.
18. Tap alterna estado da condicao.
19. Alteracao salva imediatamente no banco (JSONB `conditions`).
20. Campo para adicionar condicao personalizada (texto livre, max 30 chars).
21. Condicoes personalizadas aparecem no mesmo grid com icone diferente.

### Realtime

22. Se DM alterar HP do personagem via interface de combate, HP no Player HQ atualiza em < 2s.
23. Alteracao remota e sinalizada visualmente por 1s (flash na barra ou no numero).

### Layout

24. Panel de HP e condicoes e a primeira secao visivel ao abrir `/app/campaign/[id]`.
25. Em mobile, HP ocupa o topo da tela com grande destaque visual.
26. Em desktop, HP fica na coluna principal (esquerda).

---

## Abordagem Tecnica

### Passo 1: Migration 056

Criar `supabase/migrations/056_player_characters_extended.sql` conforme epic.

### Passo 2: Hook `useCharacterStatus`

```typescript
// hooks/useCharacterStatus.ts
export function useCharacterStatus(characterId: string) {
  const [character, setCharacter] = useState<PlayerCharacter | null>(null);

  // Initial load + realtime subscription
  // Returns: character, updateHp, updateHpTemp, toggleCondition, addCondition
}
```

### Passo 3: CharacterStatusPanel

```typescript
// components/player-hq/CharacterStatusPanel.tsx
export function CharacterStatusPanel({ characterId }: { characterId: string }) {
  const { character, updateHp, toggleCondition } = useCharacterStatus(characterId);

  return (
    <div className="space-y-4">
      <HpDisplay character={character} onUpdateHp={updateHp} />
      <ConditionBadges
        conditions={character.conditions}
        onToggle={toggleCondition}
      />
    </div>
  );
}
```

### Passo 4: ConditionBadges

Grid responsivo de chips. Cores semanticas:
- Severo (Paralyzed, Petrified, Stunned, Unconscious): `border-red-500` / `bg-red-500`
- Moderado (Poisoned, Frightened, Incapacitated, Restrained): `border-orange-400` / `bg-orange-400`
- Situacional (Prone, Grappled, Blinded, Deafened, Charmed, Invisible, Exhaustion): `border-yellow-400` / `bg-yellow-400`

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `supabase/migrations/056_player_characters_extended.sql` | Criar | Colunas hp_temp, conditions, e demais campos opcionais |
| `lib/types/database.ts` | Editar | Adicionar campos novos ao tipo PlayerCharacter |
| `app/(authenticated)/campaign/[id]/page.tsx` | Criar | Rota base do Player HQ |
| `hooks/useCharacterStatus.ts` | Criar | Hook com realtime subscription |
| `components/player-hq/CharacterStatusPanel.tsx` | Criar | Panel de HP + condicoes |
| `components/player-hq/HpDisplay.tsx` | Criar | Numero + barra + tier + edicao inline |
| `components/player-hq/ConditionBadges.tsx` | Criar | Grid de chips de condicao |
| `lib/constants/conditions.ts` | Criar | Lista de condicoes SRD + cores |
| `messages/pt-BR.json` | Editar | Strings no namespace `player_hq` |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. HP a 100%: barra verde, label "FULL".
2. HP a 50%: barra amarela, label "LIGHT".
3. HP a 25%: barra laranja, label "MODERATE".
4. HP a 5%: barra vermelha, label "HEAVY".
5. HP a 0: barra vermelha pulsante, label "CRITICAL".
6. Tap em HP: input numerico aparece, botoes +/-.
7. Confirmar: valor salvo no banco, barra atualiza.
8. HP nao pode ir abaixo de 0 (clamped).
9. Tap em "Poisoned": chip fica preenchido laranja.
10. Tap novamente: chip volta para inativo.
11. Realtime: DM altera HP na interface de combate → Player HQ atualiza em < 2s.
12. Adicionar condicao personalizada: aparece no grid.

---

## Notas de Paridade

| Modo | Aplica? | Justificativa |
|---|---|---|
| Guest | NAO | Guest nao tem player_characters persistentes |
| Anonimo | NAO | Anonimo nao tem player_characters |
| Autenticado | SIM | Auth-only |

---

## Definicao de Pronto

- [ ] Migration 056 criada e aplicada (local + staging)
- [ ] Hook useCharacterStatus com realtime funcionando
- [ ] HP display com tiers corretos (mesma logica do combate)
- [ ] Edicao inline de HP com botoes rapidos e haptic
- [ ] HP temp separado e editavel
- [ ] ConditionBadges com 15 condicoes SRD + adicao personalizada
- [ ] Realtime: alteracao do DM reflete no Player HQ < 2s
- [ ] Responsivo mobile e desktop
- [ ] Build sem erros, zero regressao no combate existente
