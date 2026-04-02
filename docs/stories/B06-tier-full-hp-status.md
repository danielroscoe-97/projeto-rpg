# B.06 — Adicionar Tier FULL (100% HP) ao Status de Vida

**Epic:** B — Evolucao do Sistema de HP Status  
**Prioridade:** Media  
**Estimativa:** 3 SP  
**Depende de:** B.0 (Extrair HP_STATUS_STYLES para Modulo Shared)  
**Arquivo principal:** `lib/utils/hp-status.ts`

---

## Resumo

Adicionar um novo tier **FULL** ao sistema de HP status, representando combatentes com 100% de vida (nenhum dano recebido). Atualmente o sistema possui 4 tiers (LIGHT/MODERATE/HEAVY/CRITICAL), mas nao diferencia um combatente ileso de um com 71% HP — ambos aparecem como LIGHT. Durante os testes de beta, DMs reportaram que precisam identificar rapidamente quem ainda nao foi atingido em combate. O tier FULL resolve essa necessidade com cor/icone distintos.

---

## Contexto

### Regra de Negocio IMUTAVEL

Os tiers de HP status sao **FULL / LIGHT / MODERATE / HEAVY / CRITICAL** com labels em ingles em TODAS as locales. Os thresholds sao:

| Tier | Condicao | Cor da Barra | Cor do Badge |
|------|----------|--------------|--------------|
| **FULL** | current_hp >= max_hp (100%) | Verde brilhante (`bg-emerald-400`) | `text-emerald-400` + `HeartPulse` icon |
| **LIGHT** | > 70% | Verde (`bg-green-500`) | `text-green-400` |
| **MODERATE** | > 40% | Amarelo (`bg-amber-400`) | `text-amber-400` |
| **HEAVY** | > 10% | Vermelho (`bg-red-500`) | `text-red-500` |
| **CRITICAL** | <= 10% | Vermelho escuro (`bg-red-900`) | `text-gray-300` + caveira |

### Situacao atual no codigo

- **`lib/utils/hp-status.ts`**: `HpStatus = "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL"`. A funcao `getHpStatus()` retorna `"LIGHT"` quando `pct > 0.7`, sem distinguir 100% de 71%.
- **`lib/types/realtime.ts`**: Importa `HpStatus` — usado em `SanitizedCombatant`, `SanitizedPlayerHpUpdate`, `SanitizedMonsterHpUpdate`.
- **`lib/utils/sanitize-combatants.ts`** e **`lib/realtime/sanitize.ts`**: Chamam `getHpStatus()` para gerar o `hp_status` broadcast aos jogadores.
- **Componentes consumidores**: `PlayerInitiativeBoard.tsx` (badge), `PlayerBottomBar.tsx` (barra), `CombatantRow.tsx` (barra DM), `HPLegendOverlay.tsx` (legenda), `MonsterGroupHeader.tsx` (barra agregada), `PlayerDrawer.tsx` (barra player dashboard).

Apos a story B.0, todos esses consumidores ja estarao usando `HP_STATUS_STYLES` do modulo shared, entao adicionar FULL sera uma mudanca em um unico lugar + atualizacao de tipo.

### Por que FULL precisa ser visualmente distinto de LIGHT

Se FULL fosse o mesmo verde de LIGHT, o DM nao conseguiria diferenciar "ileso" de "tomou 20% de dano". Opcoes visuais:
- **Branco/prata** (`bg-white`, `text-white`) — clean, destaca no dark theme
- **Dourado** (`bg-gold`, `text-gold`) — alinhado com a identidade visual do Pocket DM
- **Verde brilhante** (`bg-emerald-400`, `text-emerald-300`) — mais vibrante que o LIGHT `bg-green-500`

**Decisao final (Party Mode 2026-04-02):** Verde brilhante `emerald-400` com icone `HeartPulse`.

---

## Criterios de Aceite

1. Novo tier: `FULL` adicionado ao type `HpStatus` — valor: `"FULL" | "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL"`.
2. `getHpStatus()` retorna `"FULL"` quando `current_hp >= max_hp` (cobrindo over-heal e 100% exato). Se `max_hp <= 0`, continua retornando `"CRITICAL"`.
3. `HP_STATUS_STYLES` (constante shared, criada em B.0) inclui entrada para `FULL` com cor distinta de `LIGHT`.
4. `getHpBarColor()` retorna a classe Tailwind correta para FULL.
5. `getHpThresholdKey()` retorna `"hp_full"` para o tier FULL.
6. Arquivos de traducao (`messages/en.json`, `messages/pt-BR.json`) incluem label para `hp_full` e `hp_status_full`.
7. `HpStatusBadge` em `PlayerInitiativeBoard.tsx` renderiza o badge corretamente para FULL (cor + icone — sugestao: escudo ou coracao cheio).
8. `HPLegendOverlay.tsx` exibe o tier FULL na legenda com cor e percentual corretos.
9. `sanitizeCombatantsForPlayer()` e `sanitizePayloadServer()` retornam `"FULL"` corretamente quando monstro esta a 100% HP.
10. Player view: badge FULL aparece para monstros que nao receberam dano.
11. DM view: barra de HP usa cor FULL quando combatente esta a 100%.
12. `docs/hp-status-tiers-rule.md` atualizado com o novo tier.

---

## Abordagem Tecnica

### 1. Atualizar o type e a constante em `lib/utils/hp-status.ts`

```typescript
export type HpStatus = "FULL" | "LIGHT" | "MODERATE" | "HEAVY" | "CRITICAL";

// Dentro de HP_STATUS_STYLES (ja existente apos B.0):
FULL: {
  colorClass: "text-emerald-400",
  bgClass: "bg-emerald-400/20",
  barClass: "bg-emerald-400",
  icon: "heartpulse",
  labelKey: "hp_full",
  pct: "100%",
},
```

### 2. Atualizar `getHpStatus()`

```typescript
export function getHpStatus(currentHp: number, maxHp: number): HpStatus {
  if (maxHp <= 0) return "CRITICAL";
  if (currentHp >= maxHp) return "FULL";  // <-- novo check, antes dos demais
  const pct = currentHp / maxHp;
  if (pct > 0.7) return "LIGHT";
  if (pct > 0.4) return "MODERATE";
  if (pct > 0.1) return "HEAVY";
  return "CRITICAL";
}
```

O check `currentHp >= maxHp` (em vez de `===`) cobre o caso de over-heal (temp HP somado ao current em alguns sistemas). Se `current_hp` nunca excede `max_hp` no modelo de dados, o `>=` funciona como `===` sem risco.

### 3. Atualizar `getHpThresholdKey()`

Nenhuma mudanca estrutural necessaria — a funcao ja gera a chave como `hp_${status.toLowerCase()}`, entao retornara `"hp_full"` automaticamente.

### 4. Adicionar traducoes

**`messages/en.json`:**
```json
"hp_full": "FULL",
"hp_status_full": "FULL"
```

**`messages/pt-BR.json`:**
```json
"hp_full": "FULL",
"hp_status_full": "FULL"
```

Nota: As labels usam o termo ingles "FULL" em ambas as locales (regra de negocio imutavel).

### 5. Atualizar icon no `HpStatusBadge`

Na funcao `HpStatusBadge` dentro de `PlayerInitiativeBoard.tsx`, adicionar tratamento para o icone `"heartpulse"`:

```typescript
{style.icon === "heartpulse" ? (
  <HeartPulse className="w-4 h-4 lg:w-3.5 lg:h-3.5" aria-hidden="true" />
) : style.icon === "skull" ? (
  // ... resto existente
```

O icone `HeartPulse` deve ser importado de lucide-react.

### 6. Atualizar `HPLegendOverlay.tsx`

Apos B.0, o overlay ja consome `HP_STATUS_STYLES`. Basta verificar que o novo tier FULL aparece na lista.

### 7. Sanitizacao — nenhuma mudanca

`sanitizeCombatantsForPlayer()` e `sanitizePayloadServer()` chamam `getHpStatus()` que agora retorna `"FULL"`. O tipo `HpStatus` na interface `SanitizedCombatant` ja aceita qualquer valor do union. Nenhuma mudanca estrutural necessaria nesses arquivos.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/utils/hp-status.ts` | Adicionar `"FULL"` ao type, entrada em `HP_STATUS_STYLES`, logica em `getHpStatus()` |
| `lib/types/realtime.ts` | Nenhuma — importa `HpStatus` do modulo (automatico) |
| `lib/utils/sanitize-combatants.ts` | Nenhuma — chama `getHpStatus()` (automatico) |
| `lib/realtime/sanitize.ts` | Nenhuma — chama `getHpStatus()` (automatico) |
| `components/player/PlayerInitiativeBoard.tsx` | Adicionar tratamento do icone `"shield"` no `HpStatusBadge` |
| `components/combat/HPLegendOverlay.tsx` | Verificar que FULL aparece na legenda (pos-B.0, deve ser automatico) |
| `components/player/PlayerInitiativeBoard.test.tsx` | Adicionar caso de teste para tier FULL |
| `components/combat/CombatantRow.test.tsx` | Adicionar caso de teste para cor da barra FULL |
| `messages/en.json` | Adicionar `hp_full`, `hp_status_full` |
| `messages/pt-BR.json` | Adicionar `hp_full`, `hp_status_full` |
| `docs/hp-status-tiers-rule.md` | Adicionar tier FULL a tabela de referencia |

---

## Plano de Testes

### Testes Unitarios (`lib/utils/hp-status.ts`)

1. **`getHpStatus(100, 100)` retorna `"FULL"`** — 100% exato.
2. **`getHpStatus(150, 100)` retorna `"FULL"`** — over-heal (current > max).
3. **`getHpStatus(99, 100)` retorna `"LIGHT"`** — 99%, nao FULL.
4. **`getHpStatus(71, 100)` retorna `"LIGHT"`** — 71%, confirma que LIGHT nao mudou.
5. **`getHpStatus(0, 0)` retorna `"CRITICAL"`** — edge case max_hp=0.
6. **`getHpBarColor(100, 100)` retorna a classe FULL** — nova cor.
7. **`getHpThresholdKey(100, 100)` retorna `"hp_full"`** — nova chave.
8. **`HP_STATUS_STYLES.FULL` existe** — Tem todos os campos obrigatorios.

### Testes de Componente

9. **`PlayerInitiativeBoard` renderiza badge FULL** — Combatente monstro com `hp_status: "FULL"` exibe badge com cor e icone corretos.
10. **`CombatantRow` renderiza barra FULL** — Combatente com `current_hp === max_hp` usa a cor FULL na barra.
11. **`HPLegendOverlay` exibe 5 tiers** — Verificar que agora lista FULL, LIGHT, MODERATE, HEAVY, CRITICAL.

### Testes de Integracao (sanitizacao)

12. **`sanitizeCombatantsForPlayer`** — Monstro com `current_hp === max_hp` recebe `hp_status: "FULL"`.
13. **`sanitizePayloadServer` (hp_update)** — Evento de HP onde `current_hp === max_hp` retorna `hp_status: "FULL"`.

### Teste Manual (QA)

14. DM view: adicionar monstro ao combate, nao aplicar dano — barra de HP deve usar cor FULL (distinta do verde LIGHT).
15. DM view: aplicar 1 de dano ao monstro — barra muda de FULL para LIGHT (assumindo que nao caiu abaixo de 70%).
16. DM view: curar monstro de volta ao max — barra volta para FULL.
17. Player view (anonimo): verificar que monstros ilesos mostram badge FULL com cor/icone correto.
18. Player view (autenticado): idem ao anonimo.
19. Guest combat: verificar que CombatantRow DM view exibe barra FULL.
20. HPLegendOverlay: verificar que mostra 5 tiers (FULL + 4 existentes).
21. PlayerBottomBar: PC proprio com HP cheio mostra barra na cor FULL.

---

## Notas de Paridade

- **Guest Combat (`GuestCombatClient`):** Usa `CombatantRow` que consome `getHpBarColor()` — recebe FULL automaticamente apos mudanca no modulo shared.
- **Player View (anonimo — `PlayerInitiativeBoard`):** Badge `HpStatusBadge` precisa de tratamento explicito para o icone FULL. A cor vem de `HP_STATUS_STYLES` (automatico).
- **Player View (autenticado — `PlayerJoinClient`):** Usa `PlayerInitiativeBoard` internamente — herda as mudancas.
- **DM View (`CombatantRow`):** Barra de HP via `getHpBarColor()` — automatico.
- **Player Dashboard (`PlayerDrawer`):** Apos B.0, ja usa `getHpBarColor()` do shared — automatico.
- **Broadcast/Sanitizacao:** `sanitize.ts` e `sanitize-combatants.ts` chamam `getHpStatus()` — retorno `"FULL"` e automatico. Os types em `realtime.ts` usam `HpStatus` importado, que inclui o novo valor.
- **Atualizacao de docs:** `docs/hp-status-tiers-rule.md` DEVE ser atualizado com o tier FULL, incluindo a nova tabela de 5 tiers. A nota de "imutavel" permanece — agora com 5 tiers em vez de 4.

---

## Decisoes de UX — RESOLVIDAS (Party Mode 2026-04-02)

| Decisao | Resolucao | Justificativa |
|---------|-----------|---------------|
| **Cor** | `emerald-400` (com `emerald-400/20` como bg do badge) | Dourado conflita com palette brand (parece "selecionado"). Branco some no dark theme. Verde = semantica universal de "tudo ok". |
| **Icone** | `HeartPulse` (Lucide) | `Shield` remete a defesa, nao saude. `Sparkles` remete a magia. `HeartPulse` conecta diretamente a "vida plena". |
| **Hierarquia** | `FULL → LIGHT → MODERATE → HEAVY → CRITICAL` | FULL e o primeiro/mais alto tier. |
| **Tipo do icon** | Expandir para `"heart" \| "heartpulse" \| "warning" \| "danger" \| "skull"` | Novo valor `"heartpulse"` para o tier FULL. |

---

## Definicao de Pronto

- [ ] Type `HpStatus` inclui `"FULL"`
- [ ] `getHpStatus()` retorna `"FULL"` quando `current_hp >= max_hp`
- [ ] `HP_STATUS_STYLES` tem entrada para FULL com cor distinta
- [ ] `getHpBarColor()` retorna classe correta para FULL
- [ ] `getHpThresholdKey()` retorna `"hp_full"`
- [ ] Traducoes adicionadas em `en.json` e `pt-BR.json`
- [ ] `HpStatusBadge` renderiza FULL corretamente
- [ ] `HPLegendOverlay` mostra 5 tiers
- [ ] Testes unitarios para FULL passando (8 cenarios)
- [ ] Testes de componente passando (3 cenarios)
- [ ] Testes de sanitizacao passando (2 cenarios)
- [ ] QA manual em todas as superficies (DM, Player anonimo, Player autenticado, Guest)
- [ ] `docs/hp-status-tiers-rule.md` atualizado com 5 tiers
- [ ] Code review aprovado
