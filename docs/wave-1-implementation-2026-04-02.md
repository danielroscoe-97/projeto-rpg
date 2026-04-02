# Wave 1 — Quick Wins Implementation
**Data:** 2026-04-02  
**Status:** ✅ Completo  
**Arquivos alterados:** 3

---

## W1.1 — B.10 Visual crítico sombreado

**Arquivo:** [components/combat/CombatantRow.tsx](../components/combat/CombatantRow.tsx)  
**Linha:** 194

### Problema
Combatants com HP ≤10% (vivos) recebiam `opacity-50 grayscale-[50%]` — idêntico ao visual de *defeated*. O jogador não conseguia distinguir "combatente em perigo crítico" de "combatente morto".

### Solução
Substituição do overlay opacity/grayscale por um **sombreado avermelhado** via inset box-shadow:

```diff
- isCritical ? "opacity-50 grayscale-[50%] border-2 border-red-500 animate-pulse"
+ isCritical ? "border-2 border-red-500/80 shadow-[inset_0_0_0_2000px_rgba(127,29,29,0.15),0_0_8px_rgba(239,68,68,0.15)] animate-pulse"
```

**Por que inset box-shadow:** Cria um overlay de cor sem conflitar com `bg-card` (ambos são background-color e se sobrescrevem de forma imprevisível). O inset shadow se sobrepõe visualmente de forma determinística.

### Parity
- ✅ Guest: `CombatantRow` é usado em `GuestCombatClient` — patch aplica automaticamente
- ✅ Auth: `CombatantRow` é usado em `PlayerJoinClient` (DM view) — automático
- N/A Player: `PlayerInitiativeBoard` não usa `CombatantRow`

---

## W1.2 — B.09 Sticky turn header

### PlayerInitiativeBoard.tsx
**Arquivo:** [components/player/PlayerInitiativeBoard.tsx](../components/player/PlayerInitiativeBoard.tsx)

**Adição:** Round number badge no sticky header do player.

O sticky já existia (`sticky top-0 z-30`) mas não exibia o número do round. Adicionado badge `R{roundNumber}` compacto antes do End Turn button:

```tsx
{currentCombatant && (
  <span className="shrink-0 text-xs font-mono text-muted-foreground/70 tabular-nums" aria-label={`Rodada ${roundNumber}`}>
    R{roundNumber}
  </span>
)}
```

### GuestCombatClient.tsx
**Arquivo:** [components/guest/GuestCombatClient.tsx](../components/guest/GuestCombatClient.tsx)

**Adições ao turn indicator row:**
1. `data-testid="dm-sticky-turn-indicator"` para testes automatizados
2. Type badge (azul=Jogador / vermelho=Monstro) espelhando o padrão do `PlayerInitiativeBoard`

```tsx
{combatants[currentTurnIndex]?.is_player ? (
  <span className="...bg-blue-500/15 text-blue-400...">Jogador</span>
) : (
  <span className="...bg-red-500/15 text-red-400...">Monstro</span>
)}
```

Translation keys usados: `combat.player_tag`, `combat.monster_tag` (já existentes em pt-BR e en).

---

## W1.3 — 2.4 Ícones RPG Landing Page

**Arquivo:** [app/page.tsx](../app/page.tsx)

### Problema
`FeaturesSection` usava ícones Lucide genéricos (`Swords`, `Sparkles`, `BookOpen`, `Save`) que não comunicavam a identidade RPG do produto.

### Solução
Substituição por ícones RPG inline já existentes na página (`D20Icon`, `SparkleIcon`, `D8Icon`, `D6Icon`):

| Feature | Antes | Depois | Razão |
|---|---|---|---|
| Combat Tracker Completo | `Swords` (Lucide) | `D20Icon` | D20 = core de D&D, mais icônico |
| Player View em Tempo Real | `Smartphone` | `Smartphone` | Mantido — comunica "no celular, sem app" |
| Oráculo de Magias & Monstros | `Sparkles` (Lucide) | `SparkleIcon` (pixel SVG) | Mesmo conceito, versão RPG |
| Regras 2014 & 2024 | `BookOpen` | `D8Icon` | Dado evoca "decisão de regra" |
| Salvar & Retomar | `Save` | `D6Icon` | Dados evocam continuidade de campanha |
| Dark Mode RPG | `Moon` | `Moon` | Mantido — direto ao ponto |

### Type change
```diff
- { icon: LucideIcon; ... }[]
+ { icon: React.ComponentType<{ className?: string }>; ... }[]
```

Imports removidos: `Swords, Sparkles, BookOpen, Save, LucideIcon` de `lucide-react`.

---

## Critérios de Aceitação (Quinn — QA)

### W1.1
- [ ] Monstro com HP 5% está vivo: tem border vermelha pulsando + overlay escuro, SEM opacity/grayscale
- [ ] Monstro derrotado: tem opacity-50 grayscale (comportamento antigo preservado)
- [ ] Não há confusão visual entre `is_defeated` e `isCritical` na lista de combate

### W1.2
- [ ] PlayerInitiativeBoard: badge "R1", "R2" etc. visível no sticky header ao scrollar
- [ ] GuestCombatClient: turn indicator mostra badge azul para "Jogador" e vermelho para "Monstro"
- [ ] `data-testid="dm-sticky-turn-indicator"` existe no DOM durante fase de combate
- [ ] `data-testid="sticky-turn-header"` (PlayerInitiativeBoard) continua existindo

### W1.3
- [ ] Landing page desktop: 6 feature cards mostram ícones RPG (D20, Smartphone, SparkleIcon, D8, D6, Moon)
- [ ] Landing page mobile: `<details>` cards renderizam os mesmos ícones
- [ ] `tsc` / `next build` passa sem type errors em `LucideIcon`
- [ ] Nenhum ícone renderiza vazio ou quebrado

---

## Design Review (Sally — UX)

### W1.1 aprovado
O inset shadow cria o "sombreado" certo: o card fica levemente avermelhado-escuro, comunicando **perigo ativo**, não morte. O pulse mantém a urgência. Visualmente distinto do defeated (cinza e transparente).

### W1.2 aprovado
O "R1" no player board é compacto o suficiente para não interferir no End Turn button no mobile. Os type badges no DM view seguem exatamente o padrão visual do player board — parity visual garantida.

### W1.3 aprovado
D20 é o símbolo mais reconhecível de D&D — colocá-lo no primeiro card é a escolha certa. SparkleIcon pixel art para o Oráculo é coerente com a direção de arte. D8 e D6 adicionam variedade sem ficarem repetitivos.
