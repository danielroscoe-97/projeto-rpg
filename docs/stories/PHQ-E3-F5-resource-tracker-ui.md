# PHQ-E3-F5 — Resource Tracker UI: Componente de Bolinhas Reutilizavel

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 3 SP
**Dependencia:** `DeathSaveTracker.tsx` (pattern visual de referencia), `SpellSlotTracker.tsx` (F-41)
**Arquivos principais:** `components/player-hq/ResourceDots.tsx` (novo), `components/player-hq/ResourceTrackerRow.tsx` (novo)

---

## Resumo

O componente de bolinhas e o coracão visual do Player HQ. Qualquer recurso com "X usos por descanso" usa esse componente: Wild Shape, Ki Points, Action Surge, Arcane Recovery, Sorcery Points, spell slots — todos.

Esta story extrai e generaliza o pattern de dots ja existente no `DeathSaveTracker` e `SpellSlotTracker` em um **componente unico, generico e reutilizavel** que servira de base para todos os outros trackers do Player HQ.

---

## Decisoes de UX

**D1: Anatomia de uma linha de tracker.**
```
[Nome do recurso]         [🌙] [🌗]
● ● ● ○ ○
```
- Nome do recurso na esquerda
- Icones de reset (Short Rest = lua crescente, Long Rest = lua cheia, Dawn = sol) na direita
- Dots em linha abaixo do nome

**D2: Tres tamanhos de dot.** `sm` (10px), `md` (14px — padrao), `lg` (18px). Tamanho `md` para uso geral, `sm` para cards compactos (como o dashboard), `lg` para tela de recursos dedicada.

**D3: Cores de dot por contexto.**
- **Disponivel:** `bg-amber-400 border-amber-400` (dourado — identidade do PocketDM)
- **Usado:** `bg-transparent border-muted-foreground/30`
- **Esgotado (todos usados):** texto do nome fica em `text-muted-foreground`, sem destaque

**D4: Animacao de toggle.** Ao tocar em um dot, ele faz `scale-[1.3]` por 300ms (bounce), igual ao DeathSaveTracker. Feedback tátil (`navigator.vibrate([30])`).

**D5: Readonly mode.** Componente suporta `readOnly` prop para exibicao sem interacao (ex: DM vendo o tracker do jogador).

**D6: Indicador de reset type.** Icone pequeno ao lado do nome indica o tipo de reset: 🌗 = short rest, 🌕 = long rest, 🌅 = dawn, ∞ = manual. Tooltip/label acessivel ao hover.

---

## Contexto Tecnico

### Interface do componente

```typescript
// components/player-hq/ResourceDots.tsx

export interface ResourceDotsProps {
  /** Numero maximo de usos */
  maxUses: number;
  /** Numero de usos ja gastos */
  usedCount: number;
  /** Chamado quando um dot e clicado. index = posicao do dot (0-based) */
  onToggle?: (index: number) => void;
  /** Tamanho dos dots */
  size?: 'sm' | 'md' | 'lg';
  /** Se true, dots sao apenas visuais (sem interacao) */
  readOnly?: boolean;
}

export function ResourceDots({
  maxUses,
  usedCount,
  onToggle,
  size = 'md',
  readOnly = false,
}: ResourceDotsProps) {
  const [bouncing, setBouncing] = useState<number | null>(null);

  const handleClick = (index: number) => {
    if (readOnly || !onToggle) return;
    setBouncing(index);
    navigator.vibrate?.([30]);
    onToggle(index);
    setTimeout(() => setBouncing(null), 300);
  };

  const dotSizes = { sm: 'w-2.5 h-2.5', md: 'w-3.5 h-3.5', lg: 'w-4.5 h-4.5' };

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Usos disponiveis">
      {Array.from({ length: maxUses }).map((_, i) => {
        const isUsed = i < usedCount;
        const isBouncing = bouncing === i;
        return (
          <button
            key={i}
            type="button"
            role="checkbox"
            aria-checked={!isUsed}
            aria-label={`Uso ${i + 1}: ${isUsed ? 'gasto' : 'disponivel'}`}
            disabled={readOnly}
            onClick={() => handleClick(i)}
            className={`
              ${dotSizes[size]} rounded-full border-2 transition-all duration-200
              ${isUsed
                ? 'bg-transparent border-muted-foreground/30'
                : 'bg-amber-400 border-amber-400'
              }
              ${isBouncing ? 'scale-[1.3]' : 'scale-100'}
              ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
            `}
          />
        );
      })}
    </div>
  );
}
```

### ResourceTrackerRow — linha completa

```typescript
// components/player-hq/ResourceTrackerRow.tsx

export interface ResourceTrackerRowProps {
  name: string;
  maxUses: number;
  currentUses: number; // usos JA GASTOS (mesmo padrao do SpellSlotTracker)
  resetType: 'short_rest' | 'long_rest' | 'dawn' | 'manual';
  onToggle?: (newUsedCount: number) => void;
  onReset?: () => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const RESET_ICONS = {
  short_rest: '🌗',
  long_rest: '🌕',
  dawn: '🌅',
  manual: '∞',
};

const RESET_LABELS = {
  short_rest: 'Descanso Curto',
  long_rest: 'Descanso Longo',
  dawn: 'Amanhecer',
  manual: 'Manual',
};
```

### Logica de toggle

O dot representa: "este uso especifico esta gasto?". Toggle funciona como rolodex:
- Tocar no primeiro dot disponivel (da direita): gasta um uso
- Tocar no ultimo dot gasto (da esquerda): recupera um uso
- Comportamento intuitivo: como marcar/desmarcar risquinhos num papel

Implementacao simplificada: o indice clicado determina o novo `usedCount`:
```typescript
const handleDotToggle = (index: number) => {
  // Se este dot esta disponivel (index >= usedCount), gastar ate ele
  // Se este dot esta usado (index < usedCount), recuperar ate ele
  const newUsedCount = index < usedCount ? index : index + 1;
  onToggle?.(newUsedCount);
};
```

---

## Criterios de Aceite

### ResourceDots

1. Renderiza `maxUses` dots em linha.
2. Dots com `index < usedCount`: vazios (transparente + borda cinza).
3. Dots com `index >= usedCount`: preenchidos (dourado).
4. Tap em dot: bounce animation 300ms + haptic 30ms + chama `onToggle`.
5. `readOnly=true`: dots sao visuais apenas, sem cursor de pointer.
6. Tres tamanhos funcionando: `sm`, `md`, `lg`.
7. Acessibilidade: `role="checkbox"`, `aria-checked`, `aria-label` por dot.

### ResourceTrackerRow

8. Nome do recurso exibido na esquerda.
9. Icone de reset type exibido na direita com tooltip do tipo ("Descanso Longo").
10. Dots exibidos abaixo do nome.
11. Se `usedCount === maxUses` (todos gastos): nome do recurso em `text-muted-foreground`.
12. Contagem textual ao lado do nome: "(2/5)" — usos restantes / total.

### Integracao

13. `SpellSlotTracker` existente (F-41) pode ser refatorado para usar `ResourceDots` internamente sem mudanca de comportamento.
14. `DeathSaveTracker` NAO e alterado — tem semantica diferente (successes/failures).

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `components/player-hq/ResourceDots.tsx` | Criar | Componente generico de dots |
| `components/player-hq/ResourceTrackerRow.tsx` | Criar | Linha completa: nome + icone reset + dots |
| `components/player/SpellSlotTracker.tsx` | Editar (opcional) | Refatorar para usar ResourceDots internamente |

---

## Plano de Testes

```typescript
// ResourceDots.test.tsx
describe('ResourceDots', () => {
  it('renderiza maxUses dots', () => { /* 5 dots para maxUses=5 */ });
  it('dots usados sao vazios', () => { /* 2 usados = primeiros 2 vazios */ });
  it('dots disponiveis sao dourados', () => { /* 3 restantes = dourados */ });
  it('tap em dot chama onToggle com novo usedCount', () => { /* */ });
  it('readOnly: tap nao chama onToggle', () => { /* */ });
  it('aria-checked correto por dot', () => { /* */ });
  it('tres tamanhos aplicam classes corretas', () => { /* */ });
});

describe('ResourceTrackerRow', () => {
  it('renderiza nome e dots', () => { /* */ });
  it('todos gastos: nome em muted', () => { /* */ });
  it('icone de reset type correto', () => { /* */ });
  it('contagem "(2/5)" visivel', () => { /* */ });
});
```

---

## Definicao de Pronto

- [ ] ResourceDots com 3 tamanhos, toggle, animacao, haptic
- [ ] ResourceTrackerRow com nome + reset icon + dots + contagem
- [ ] readOnly mode funcionando
- [ ] Acessibilidade: role, aria-checked, aria-label
- [ ] Testes unitarios passando
- [ ] Zero regressao no SpellSlotTracker e DeathSaveTracker
- [ ] Build sem erros
