# B.0 — Extrair HP_STATUS_STYLES para Modulo Shared

**Epic:** B — Evolucao do Sistema de HP Status  
**Prioridade:** Alta (blocker para B.06)  
**Estimativa:** 2 SP  
**Arquivo principal:** `lib/utils/hp-status.ts`

---

## Resumo

Os estilos visuais dos tiers de HP (cores, icones, labels) estao duplicados entre `PlayerInitiativeBoard.tsx` (constante local `HP_STATUS_STYLES`, linhas 48-53) e `lib/utils/hp-status.ts` (que so exporta funcoes de calculo, sem estilos). Antes de adicionar o tier FULL (B.06), precisamos consolidar toda a definicao visual dos tiers em um unico modulo shared para evitar divergencia e facilitar manutencao. Adicionalmente, `HPLegendOverlay.tsx` e `PlayerDrawer.tsx` possuem definicoes inline de cores/tiers que tambem devem migrar para o modulo centralizado.

---

## Contexto

### Duplicacao atual

**`PlayerInitiativeBoard.tsx:48-53`** — Constante local com cores e icones por tier:
```typescript
const HP_STATUS_STYLES: Record<string, { colorClass: string; bgClass: string; icon: "heart" | "warning" | "danger" | "skull" }> = {
  LIGHT: { colorClass: "text-green-400", bgClass: "bg-green-400/10", icon: "heart" },
  MODERATE: { colorClass: "text-amber-400", bgClass: "bg-amber-400/10", icon: "warning" },
  HEAVY: { colorClass: "text-red-500", bgClass: "bg-red-500/10", icon: "danger" },
  CRITICAL: { colorClass: "text-gray-300", bgClass: "bg-gray-900/40", icon: "skull" },
};
```

**`lib/utils/hp-status.ts`** — So exporta logica de calculo (`getHpStatus`, `getHpBarColor`, `getHpThresholdKey`). As cores da barra (`bg-green-500`, `bg-amber-400`, etc.) estao hardcoded dentro de `getHpBarColor()`.

**`components/combat/HPLegendOverlay.tsx:10-15`** — Array `TIERS` local com cores de barra e percentuais, nao usa o modulo shared.

**`components/combat/PlayerDrawer.tsx:16-32`** — Funcoes `hpTierColor()` e `hpTierTextColor()` locais que duplicam a logica de thresholds com cores DIFERENTES (`bg-emerald-500` em vez de `bg-green-500`, `bg-orange-500` em vez de `bg-red-500`). Isso e um bug visual de inconsistencia.

### Risco

Se cada arquivo mantem sua propria copia dos estilos, adicionar o tier FULL (B.06) exigiria alterar 4+ arquivos e rezar para ninguem esquecer nenhum. A centralizacao elimina esse risco.

---

## Criterios de Aceite

1. `lib/utils/hp-status.ts` exporta uma constante `HP_STATUS_STYLES` tipada, contendo para cada tier: `colorClass` (texto), `bgClass` (badge background), `barClass` (barra de progresso), `icon` (identificador do icone), `label` (chave i18n), `pct` (descricao do threshold).
2. `PlayerInitiativeBoard.tsx` importa `HP_STATUS_STYLES` de `@/lib/utils/hp-status` e remove a constante local (linhas 48-53).
3. `HPLegendOverlay.tsx` importa os tiers de `@/lib/utils/hp-status` e remove o array `TIERS` local.
4. `PlayerDrawer.tsx` importa `getHpBarColor()` do modulo shared e remove as funcoes locais `hpTierColor()` e `hpTierTextColor()`. As cores devem convergir para o padrao do modulo shared (`bg-green-500`, nao `bg-emerald-500`).
5. `getHpBarColor()` em `hp-status.ts` passa a consultar `HP_STATUS_STYLES` internamente (single source of truth), em vez de ter um switch separado com cores hardcoded.
6. Nenhuma regressao visual — as mesmas cores, os mesmos icones, os mesmos labels aparecem em todas as superficies.
7. O type `HpStatus` continua exportado e usado em `lib/types/realtime.ts`.

---

## Abordagem Tecnica

### 1. Definir a constante centralizada em `lib/utils/hp-status.ts`

```typescript
export interface HpStatusStyle {
  colorClass: string;   // e.g. "text-green-400"
  bgClass: string;      // e.g. "bg-green-400/10"
  barClass: string;     // e.g. "bg-green-500"
  icon: "heart" | "warning" | "danger" | "skull";
  labelKey: string;     // e.g. "hp_light"
  pct: string;          // e.g. ">70%"
}

export const HP_STATUS_STYLES: Record<HpStatus, HpStatusStyle> = {
  LIGHT:    { colorClass: "text-green-400",  bgClass: "bg-green-400/10", barClass: "bg-green-500",  icon: "heart",   labelKey: "hp_light",    pct: ">70%" },
  MODERATE: { colorClass: "text-amber-400",  bgClass: "bg-amber-400/10", barClass: "bg-amber-400",  icon: "warning", labelKey: "hp_moderate", pct: ">40%" },
  HEAVY:    { colorClass: "text-red-500",    bgClass: "bg-red-500/10",   barClass: "bg-red-500",    icon: "danger",  labelKey: "hp_heavy",    pct: ">10%" },
  CRITICAL: { colorClass: "text-gray-300",   bgClass: "bg-gray-900/40",  barClass: "bg-red-900",    icon: "skull",   labelKey: "hp_critical", pct: "<=10%" },
};
```

### 2. Refatorar `getHpBarColor()` para consultar a constante

```typescript
export function getHpBarColor(currentHp: number, maxHp: number): string {
  if (maxHp <= 0) return "bg-gray-500";
  const status = getHpStatus(currentHp, maxHp);
  return HP_STATUS_STYLES[status].barClass;
}
```

### 3. Migrar consumidores

- **`PlayerInitiativeBoard.tsx`**: Adicionar `import { HP_STATUS_STYLES } from "@/lib/utils/hp-status"`, deletar linhas 48-53.
- **`HPLegendOverlay.tsx`**: Substituir array `TIERS` por `Object.entries(HP_STATUS_STYLES)`.
- **`PlayerDrawer.tsx`**: Substituir funcoes locais por imports de `getHpBarColor` e adicionar helper para text color baseado em `HP_STATUS_STYLES`.

### 4. Adicionar export de funcao helper para text color (opcional)

```typescript
export function getHpTextColor(currentHp: number, maxHp: number): string {
  if (maxHp <= 0) return "text-muted-foreground";
  const status = getHpStatus(currentHp, maxHp);
  return HP_STATUS_STYLES[status].colorClass;
}
```

Isso elimina o `hpTierTextColor()` duplicado em `PlayerDrawer.tsx`.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/utils/hp-status.ts` | Adicionar `HpStatusStyle`, `HP_STATUS_STYLES`, `getHpTextColor()`. Refatorar `getHpBarColor()` para usar a constante. |
| `components/player/PlayerInitiativeBoard.tsx` | Importar `HP_STATUS_STYLES` do modulo shared, deletar constante local (linhas 48-53). |
| `components/combat/HPLegendOverlay.tsx` | Importar tiers do modulo shared, remover array `TIERS` local. |
| `components/combat/PlayerDrawer.tsx` | Importar `getHpBarColor`, `getHpTextColor` do modulo shared, remover funcoes `hpTierColor()` e `hpTierTextColor()` locais. |
| `docs/hp-status-tiers-rule.md` | Atualizar para referenciar `HP_STATUS_STYLES` como fonte unica. |

---

## Plano de Testes

### Testes Unitarios

1. **`HP_STATUS_STYLES` tem todas as chaves** — Verificar que `LIGHT`, `MODERATE`, `HEAVY`, `CRITICAL` existem com todos os campos obrigatorios.
2. **`getHpBarColor()` retorna valores corretos** — Testes existentes em `CombatantRow.test.tsx` (linhas 211-229) ja validam `bg-green-500`, `bg-amber-400`, `bg-red-500`, `bg-red-900`. Devem continuar passando sem alteracao.
3. **`getHpTextColor()` retorna classes corretas** — Novo teste: `text-green-400` para >70%, `text-amber-400` para >40%, etc.

### Testes de Componente

4. **`PlayerInitiativeBoard.test.tsx`** — Testes existentes para `hp_status_heavy` e `hp_status_critical` devem continuar passando (linhas 118-119).
5. **`HPLegendOverlay`** — Verificar que todos os 4 tiers renderizam com as cores corretas.

### Teste Manual (QA)

6. Abrir combate como DM: verificar que barra de HP mantem as 4 cores corretas para cada faixa.
7. Abrir combate como Player: verificar que badges de HP status para monstros mantam as cores e icones corretos.
8. Abrir PlayerDrawer: verificar que barra de HP dos PCs usa as mesmas cores do DM view (convergencia de `bg-emerald-500` para `bg-green-500`).
9. Verificar HPLegendOverlay exibe os 4 tiers com cores e percentuais corretos.

---

## Notas de Paridade

- **Guest Combat (`GuestCombatClient`):** Usa `CombatantRow` que ja consome `getHpBarColor()` — sera atualizado automaticamente pela refatoracao interna.
- **Player View (anonimo):** `PlayerInitiativeBoard` sera atualizado diretamente nesta story.
- **Player View (autenticado):** `PlayerJoinClient` usa `PlayerInitiativeBoard` internamente — herda a mudanca.
- **DM View:** `CombatantRow` + `MonsterGroupHeader` consomem `getHpBarColor()` — atualizados automaticamente.
- **PlayerDrawer:** Hoje usa cores divergentes (`bg-emerald-500`). Esta story corrige a inconsistencia, convergindo para o padrao. Nota: essa e uma mudanca visual intencional para PlayerDrawer (emerald -> green).

---

## Definicao de Pronto

- [ ] `HP_STATUS_STYLES` exportado de `lib/utils/hp-status.ts` com type `HpStatusStyle`
- [ ] `getHpBarColor()` e `getHpTextColor()` consultam a constante (sem switch duplicado)
- [ ] `PlayerInitiativeBoard.tsx` sem constante local — importa do shared
- [ ] `HPLegendOverlay.tsx` sem array `TIERS` local — importa do shared
- [ ] `PlayerDrawer.tsx` sem funcoes `hpTierColor` / `hpTierTextColor` — importa do shared
- [ ] Testes existentes passando (CombatantRow, PlayerInitiativeBoard)
- [ ] QA visual: mesmas cores em todas as superficies
- [ ] `docs/hp-status-tiers-rule.md` atualizado
