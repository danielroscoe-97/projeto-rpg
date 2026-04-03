# F-37 — Dice Roller Multi-Dado

**Epic:** Combat UX — Utilidades de Mesa  
**Prioridade:** Média  
**Estimativa:** 5 SP  
**Dependência:** Nenhuma — infraestrutura de dice já existe  
**Arquivos principais:** `components/dice/DiceRoller.tsx` (novo), `components/guest/GuestCombatClient.tsx`, `components/session/CombatSessionClient.tsx`

---

## Resumo

Na mesa presencial, o DM frequentemente precisa rolar múltiplos dados ao mesmo tempo — iniciativa de 3 goblins, dano de uma explosão, teste de habilidade com vantagem. Hoje a única forma de rolar no app é via ClickableRoll (inline nos stat blocks de monstros) — sem como selecionar dados livremente.

O Dice Roller é uma bandeja de dados interativa: o DM toca nos tipos de dados que quer rolar, define a quantidade de cada um com tap rápido, e pressiona "Rolar". Os resultados aparecem imediatamente no DiceHistoryPanel existente. Sem formulários, sem digitação de notação — só tocar e rolar.

**Filosofia:** Mesa presencial usa dados físicos. Esse roller é para quando o DM precisa de um resultado rápido na tela — não para substituir os dados físicos. Simples, rápido, sem setup.

---

## Decisões de UX

**D1 — Tray model (não formulário):** Usuário toca nos botões de tipo de dado para incrementar o contador daquele dado. Toque novamente para incrementar. Botão – para decrementar. Zero significa "não incluso no roll". Intuitivo, sem digitação.

**D2 — Acesso via botão no toolbar do DM:** Um botão de dado no header do DM (guest e autenticado) abre um Popover com a bandeja. Não é uma página separada nem modal pesado. Fecha ao rolar ou clicar fora.

**D3 — Dados disponíveis:** d4, d6, d8, d10, d12, d20, d100. Ordem: d4 → d6 → d8 → d10 → d12 → d20 → d100. Máximo de 9 de cada tipo por roll (previne spam).

**D4 — Resultado integrado com DiceHistoryPanel:** Cada grupo de dados (ex: 3d6) é rolado como uma entrada separada no history store. Aparecem no panel existente com label "Tray". A bandeja também mostra o total acumulado de todos os grupos por 2 segundos antes de fechar.

**D5 — Reset automático após rolar:** Após o roll, o contador de todos os dados volta a zero. A bandeja permanece aberta por 2s mostrando o total, depois fecha sozinha. O DM pode fechar manualmente antes disso.

**D6 — Sem modificador global:** Não há campo de +/-N global. Se o DM precisa de um modificador, ele usa os ClickableRolls inline (já existem nos stat blocks). Manter o roller zero-config.

**D7 — Haptic feedback:** `navigator.vibrate([30])` ao incrementar dado. `navigator.vibrate([80])` ao rolar.

---

## Contexto Técnico

### Infraestrutura existente (não tocar)

```
lib/dice/roll.ts          → função roll(notation, label, mode) — engine puro
lib/stores/dice-history-store.ts → addEntry(result) + CustomEvent "dice-roll-result"
components/dice/DiceHistoryPanel.tsx → painel flutuante bottom-right (já em uso)
components/dice/ClickableRoll.tsx → despacha "dice-roll-result" via window.dispatchEvent
```

### Como despachar para o DiceHistoryPanel

```typescript
// Mesmo padrão do ClickableRoll.tsx:
const ROLL_RESULT_EVENT = "dice-roll-result";

function dispatchRoll(result: RollResult) {
  window.dispatchEvent(
    new CustomEvent(ROLL_RESULT_EVENT, { detail: structuredClone(result) })
  );
}
```

### Onde adicionar o botão

**GuestCombatClient** — toolbar principal (linha ~860, onde ficam os botões de áudio/soundboard).  
**CombatSessionClient** — mesma área de toolbar do DM autenticado.

---

## Abordagem Técnica

### 1. Componente `components/dice/DiceRoller.tsx`

```typescript
import { Dice5 } from "lucide-react";
import { roll } from "@/lib/dice/roll";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const ROLL_RESULT_EVENT = "dice-roll-result";

type DieType = 4 | 6 | 8 | 10 | 12 | 20 | 100;
const DIE_TYPES: DieType[] = [4, 6, 8, 10, 12, 20, 100];

interface TrayState {
  [sides: number]: number; // count per die type
}

export function DiceRoller() {
  const [tray, setTray] = useState<TrayState>({});
  const [lastTotal, setLastTotal] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const increment = (sides: DieType) => {
    setTray(prev => {
      const current = prev[sides] ?? 0;
      if (current >= 9) return prev;
      return { ...prev, [sides]: current + 1 };
    });
    navigator.vibrate?.([30]);
  };

  const decrement = (sides: DieType) => {
    setTray(prev => {
      const current = prev[sides] ?? 0;
      if (current <= 0) return prev;
      const next = { ...prev, [sides]: current - 1 };
      if (next[sides] === 0) delete next[sides];
      return next;
    });
  };

  const hasAnyDie = Object.values(tray).some(n => n > 0);

  const handleRoll = () => {
    if (!hasAnyDie) return;
    navigator.vibrate?.([80]);

    let total = 0;
    for (const [sides, count] of Object.entries(tray)) {
      if (count <= 0) continue;
      const notation = `${count}d${sides}`;
      const result = roll(notation, "Tray");
      total += result.total;
      window.dispatchEvent(
        new CustomEvent(ROLL_RESULT_EVENT, { detail: structuredClone(result) })
      );
    }

    setLastTotal(total);
    setTray({});

    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = setTimeout(() => {
      setOpen(false);
      setLastTotal(null);
    }, 2000);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      if (dismissRef.current) clearTimeout(dismissRef.current);
      setLastTotal(null);
      setTray({});
    }
    setOpen(o);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Dice Roller">
          <Dice5 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="grid grid-cols-4 gap-2">
          {DIE_TYPES.map(sides => {
            const count = tray[sides] ?? 0;
            return (
              <div key={sides} className="flex flex-col items-center gap-1">
                {/* Die button — tap to increment */}
                <button
                  type="button"
                  onClick={() => increment(sides)}
                  className={`relative w-12 h-12 rounded-lg border transition-colors font-cinzel font-bold text-sm
                    ${count > 0
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-muted-foreground/30 text-muted-foreground hover:border-gold/40"
                    }`}
                  aria-label={`d${sides}: ${count}`}
                >
                  d{sides}
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gold text-background text-[10px] font-bold flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </button>
                {/* Decrement button — only visible when count > 0 */}
                {count > 0 && (
                  <button
                    type="button"
                    onClick={() => decrement(sides)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                    aria-label={`Remove d${sides}`}
                  >
                    −
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Roll button + total */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            className="flex-1 bg-gold hover:bg-gold/80 text-background font-semibold"
            disabled={!hasAnyDie}
            onClick={handleRoll}
          >
            Rolar
          </Button>
          {lastTotal !== null && (
            <span className="text-2xl font-cinzel font-bold text-gold min-w-[2.5rem] text-center">
              {lastTotal}
            </span>
          )}
        </div>

        {/* Summary of selected dice */}
        {hasAnyDie && (
          <p className="mt-1.5 text-xs text-center text-muted-foreground">
            {Object.entries(tray)
              .filter(([, n]) => n > 0)
              .map(([s, n]) => `${n}d${s}`)
              .join(" + ")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

### 2. Integrar no `GuestCombatClient.tsx`

Localizar a área de toolbar/header onde ficam os botões de controle do DM (soundboard, settings, etc.) e adicionar `<DiceRoller />` como botão adjacente.

```typescript
// Importar
import { DiceRoller } from "@/components/dice/DiceRoller";

// Na toolbar do DM (junto aos outros botões do header):
<DiceRoller />
```

### 3. Integrar no `CombatSessionClient.tsx`

Mesmo padrão — adicionar `<DiceRoller />` na toolbar do DM autenticado.

### 4. i18n

O botão "Rolar" deve usar a chave i18n existente ou uma nova:

```json
// messages/pt-BR.json (dentro de "dice"):
"roller_roll": "Rolar",
"roller_title": "Bandeja de Dados"

// messages/en.json:
"roller_roll": "Roll",
"roller_title": "Dice Tray"
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `components/dice/DiceRoller.tsx` | **NOVO** — Componente de bandeja interativa |
| `components/guest/GuestCombatClient.tsx` | Importar e renderizar `<DiceRoller />` no toolbar do DM |
| `components/session/CombatSessionClient.tsx` | Importar e renderizar `<DiceRoller />` no toolbar do DM |
| `messages/pt-BR.json` | Adicionar `dice.roller_roll`, `dice.roller_title` |
| `messages/en.json` | Adicionar `dice.roller_roll`, `dice.roller_title` |

---

## Notas de Paridade

| Modo | Dice Roller | Justificativa |
|------|-------------|---------------|
| **Guest (`/try`)** | ✅ SIM | DM guest usa combat view — adicionar na toolbar |
| **Autenticado DM** | ✅ SIM | DM autenticado — mesma toolbar |
| **Player (`/join` ou `/invite`)** | ❌ N/A | Player não tem toolbar de DM. Rolar dados é responsabilidade do DM. |

---

## Critérios de Aceite

- [ ] Botão de dado (ícone Dice5) visível no toolbar do DM — guest e autenticado
- [ ] Clicar no botão abre Popover com bandeja
- [ ] Tapping em d4/d6/d8/d10/d12/d20/d100 incrementa o contador (badge numérico no botão)
- [ ] Botão − aparece quando count > 0, remove 1 do contador
- [ ] Botão "Rolar" desabilitado quando nenhum dado selecionado
- [ ] Ao rolar: cada grupo (ex: 3d6) aparece como entrada no DiceHistoryPanel
- [ ] Total acumulado aparece ao lado do botão "Rolar" por 2 segundos
- [ ] Após 2 segundos, bandeja fecha e contadores resetam
- [ ] Haptic ao incrementar (30ms) e ao rolar (80ms)
- [ ] Máximo 9 dados de cada tipo (tap além de 9 não incrementa)
- [ ] i18n: strings em pt-BR e en
- [ ] Build passa (`next build` sem erros)

---

## Plano de Testes

1. **Happy path — single die type:**
   - [ ] Tap em d20 3x → badge mostra "3" → rolar → 3 entradas "3d20" no history panel

2. **Happy path — multiple die types:**
   - [ ] Tap d6 2x, d4 1x → rolar → 2 entradas separadas: "2d6" e "1d4" no panel

3. **Total display:**
   - [ ] Rolar → número total aparece ao lado do botão por ~2s → desaparece e bandeja fecha

4. **Cap a 9:**
   - [ ] Tap d20 9x → nono tap não incrementa → badge fica em "9"

5. **Decrement:**
   - [ ] Tap d6 3x → tap − → badge vai a "2" → tap − 2x → botão − desaparece

6. **Reset após fechar:**
   - [ ] Selecionar dados → fechar popover manualmente → reabrir → tudo zerado

7. **Guest parity:**
   - [ ] Acessar `/try` → botão de dado visível no toolbar do DM guest

---

> **Última atualização:** 2026-04-03  
> **Estimativa:** 5 SP  
> **Nota:** Infraestrutura de dice (roll.ts, dice-history-store.ts, DiceHistoryPanel) 100% reutilizada. Zero novas tabelas no banco.
