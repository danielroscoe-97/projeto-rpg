# B.08 — Mostrar Percentual Exato de HP

**Tipo:** Melhoria de UX  
**Prioridade:** Media  
**Estimativa:** 2 pontos  
**Componente:** HP display em todas as superficies de combate

---

## Resumo

O percentual de HP e calculado em toda a aplicacao (`currentHp / maxHp`) mas e usado apenas para determinar a largura da barra de progresso e o tier de status (LIGHT/MODERATE/HEAVY/CRITICAL). O numero percentual em si nunca e exibido como texto. DM e jogadores querem ver "MODERATE — 45%" para avaliacao rapida da situacao de cada combatente, especialmente para monstros onde o HP exato e oculto.

---

## Contexto e Problema

### Calculo atual de HP

Em `lib/utils/hp-status.ts`, o sistema calcula:
- **Tier (HpStatus):** LIGHT (>70%), MODERATE (>40%), HEAVY (>10%), CRITICAL (<=10%)
- **Cor da barra:** Verde, Ambar, Vermelho, Vermelho escuro
- **Chave i18n:** `hp_light`, `hp_moderate`, `hp_heavy`, `hp_critical`

O percentual e calculado inline em cada componente (`hpPct = currentHp / maxHp`), mas so e usado para `style={{ width: \`${hpPct * 100}%\` }}`.

### Superficies que exibem HP

| Superficie | Exibe tier? | Exibe %? | Exibe HP exato? |
|---|---|---|---|
| **PlayerBottomBar** (mobile, proprio char) | Sim (aria-label) | Nao | Sim (XX/YY) |
| **InitiativeBoard — Own Char card** (desktop) | Sim (texto) | Nao | Sim (XX/YY) |
| **InitiativeBoard — Own Char na lista** | Sim (texto) | Nao | Sim (XX/YY) |
| **InitiativeBoard — Monstros** | Sim (badge) | Nao | Nao (oculto) |
| **InitiativeBoard — Aliados** | Sim (badge) | Nao | Nao (via status) |
| **GuestCombatClient** (DM) | Sim (barra colorida) | Nao | Sim (XX/YY) |

### Problema

Sem o percentual numerico, o DM precisa fazer conta mental (ex: "35/80... quanto e isso?"). Para monstros na visao do jogador, o tier sozinho e vago — "MODERATE" pode ser 41% ou 69%. Mostrar "MODERATE — 45%" da uma leitura muito mais precisa sem revelar HP exato.

---

## Decisoes de UX (Party Mode 2026-04-02)

| Decisao | Resolucao |
|---------|-----------|
| **Formato** | Badge unico: `[TIER · %]` — tier em `font-semibold`, percentual em `font-normal` |
| **Separador** | Ponto medio `·` (nao em-dash, nao barra). Em-dash some em `text-xs`. |
| **Mobile** | Abreviado 3 chars: `MOD · 45%`. Mapeamento: `FULL→FUL`, `LIGHT→LGT`, `MODERATE→MOD`, `HEAVY→HVY`, `CRITICAL→CRT` |
| **Desktop** | Expandido: `MODERATE · 45%`. Toggle via breakpoint `sm:` |
| **Proprio personagem** | HP exato `35/80` em `font-semibold` (principal) + badge `MOD · 45%` em `text-xs text-muted-foreground` (secundario) |
| **Hierarquia visual** | HP exato > tier+% (HP exato e a informacao mais importante para o proprio jogador) |

---

## Criterios de Aceite

1. **Percentual exibido como texto no badge de HP.** Formato badge unico: `{TIER} · {XX}%` (ex: "MODERATE · 45%"). Separador ponto medio `·`. Em mobile, abreviar para 3 chars: `MOD · 45%`. Em desktop, expandir: `MODERATE · 45%`. Breakpoint `sm:` para toggle. O percentual e arredondado para inteiro (sem casas decimais).

2. **Para monstros na visao do jogador:** O badge `HpStatusBadge` mostra tier + percentual no formato badge unico. Isso nao revela HP exato — apenas a proporcao.

3. **Para o proprio personagem:** O HP exato (XX/YY) e a informacao principal em `font-semibold`. O badge tier+% aparece como secundario em `text-xs text-muted-foreground`, abaixo ou ao lado do HP exato.

4. **Para aliados (outros jogadores):** Badge com tier + percentual, igual aos monstros. Jogadores nao veem HP exato de aliados (ja e o comportamento atual via `HpStatusBadge`).

5. **Percentual atualiza em real-time** junto com mudancas de HP (broadcast/polling).

6. **Regra imutavel de tiers preservada:** LIGHT >70%, MODERATE >40%, HEAVY >10%, CRITICAL <=10%. Os tiers, thresholds e cores nao mudam. Apenas adicionamos o numero percentual como informacao complementar.

7. **DM view (GuestCombatClient):** O percentual tambem deve aparecer na visao do DM, ao lado da barra de HP de cada combatente.

---

## Abordagem Tecnica

### 1. Criar funcao utilitaria para calcular percentual formatado

Em `lib/utils/hp-status.ts`, adicionar:

```typescript
/** Calculate HP percentage as integer (0-100). */
export function getHpPercentage(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.round(Math.max(0, Math.min(100, (currentHp / maxHp) * 100)));
}
```

### 2. Atualizar `HpStatusBadge` no PlayerInitiativeBoard

O componente `HpStatusBadge` (linhas 55-77 de `PlayerInitiativeBoard.tsx`) atualmente recebe apenas `status: string`. Adicionar prop `percentage`:

```tsx
function HpStatusBadge({ status, percentage }: { status: string; percentage?: number }) {
  // ... logica existente
  return (
    <span className={/* ... */}>
      {/* icone existente */}
      {label}
      {percentage != null && (
        <span className="opacity-70 ml-1">— {percentage}%</span>
      )}
    </span>
  );
}
```

### 3. Calcular e passar percentual nos pontos de uso

**Monstros no board de iniciativa:**
O `hp_status` vem do servidor/broadcast, mas o percentual nao. Opcoes:
- **Opcao A (preferida):** Adicionar `hp_percentage?: number` ao payload sanitizado. Em `broadcast.ts` e `sanitize-combatants.ts`, calcular e incluir o percentual junto com `hp_status`.
- **Opcao B:** Calcular no client a partir de `current_hp/max_hp` — mas monstros nao tem esses campos na visao do jogador.

A Opcao A e necessaria porque o jogador nao tem acesso a `current_hp`/`max_hp` de monstros.

### 4. Atualizar sanitizacao para incluir `hp_percentage`

Em `lib/realtime/broadcast.ts`, funcao `sanitizeCombatant()`, para monstros:

```typescript
const result: SanitizedCombatant = {
  ...safe,
  name: display_name || base.name,
  hp_status: getHpStatus(c.current_hp, c.max_hp),
  hp_percentage: getHpPercentage(c.current_hp, c.max_hp),  // NOVO
};
```

Em `lib/utils/sanitize-combatants.ts`, para monstros:

```typescript
return {
  ...rest,
  name: display_name || rest.name,
  hp_status: getHpStatus(current_hp, max_hp),
  hp_percentage: getHpPercentage(current_hp, max_hp),  // NOVO
};
```

### 5. Atualizar interfaces de tipos

Em `lib/types/realtime.ts` (ou onde `SanitizedCombatant` e definido), adicionar `hp_percentage?: number`.

Em `PlayerCombatant` (PlayerInitiativeBoard.tsx), adicionar `hp_percentage?: number`.

### 6. Exibir percentual na PlayerBottomBar (mobile)

Ao lado do HP exato, adicionar o percentual em texto menor:

```tsx
<span className="text-muted-foreground text-xs ml-1">
  ({Math.round(hpPct * 100)}%)
</span>
```

### 7. Exibir percentual no card "Own Character" (desktop)

No bloco de HP do card destacado (linhas 472-518), ao lado do tier:

```tsx
{hpThresholdKey && (
  <span className="text-xs font-mono ml-2 text-muted-foreground">
    {t(hpThresholdKey)} — {Math.round(hpPct * 100)}%
  </span>
)}
```

### 8. Exibir percentual na DM view (GuestCombatClient)

Adicionar o percentual ao lado da barra de HP de cada combatente na view do DM. O DM ja tem acesso a `current_hp`/`max_hp`, entao o calculo e direto no client.

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudanca |
|---|---|
| `lib/utils/hp-status.ts` | Adicionar funcao `getHpPercentage()` |
| `components/player/PlayerInitiativeBoard.tsx` | Atualizar `HpStatusBadge` com prop `percentage`, atualizar interface `PlayerCombatant`, passar percentual nos pontos de uso |
| `components/player/PlayerBottomBar.tsx` | Exibir percentual ao lado do HP exato |
| `lib/realtime/broadcast.ts` | Adicionar `hp_percentage` ao payload sanitizado de monstros |
| `lib/utils/sanitize-combatants.ts` | Adicionar `hp_percentage` ao retorno sanitizado de monstros |
| `lib/types/realtime.ts` | Adicionar `hp_percentage` a `SanitizedCombatant` e tipos relacionados |
| `components/guest/GuestCombatClient.tsx` | Exibir percentual na DM view |

---

## Plano de Testes

### Testes manuais (obrigatorios)

1. **Monstro — visao do jogador**
   - [ ] Badge mostra "MODERATE — 45%" (com percentual correto)
   - [ ] Percentual atualiza em real-time quando DM altera HP
   - [ ] Transicao de tier (ex: LIGHT -> MODERATE) atualiza badge + percentual
   - [ ] HP exato continua oculto (apenas tier + %)

2. **Proprio personagem — mobile (PlayerBottomBar)**
   - [ ] HP exato (XX/YY) continua visivel
   - [ ] Percentual aparece como complemento
   - [ ] Layout nao quebra com HP de 3+ digitos

3. **Proprio personagem — desktop (card destacado)**
   - [ ] Tier + percentual aparecem ao lado do HP exato
   - [ ] Formato: "MODERATE — 45%" ou similar

4. **Aliados — visao do jogador**
   - [ ] Badge com tier + percentual aparece
   - [ ] HP exato continua oculto para aliados

5. **DM view**
   - [ ] Percentual aparece ao lado da barra de HP
   - [ ] Valores corretos para todos os combatentes

6. **Casos limite**
   - [ ] HP 0/100 mostra "CRITICAL — 0%"
   - [ ] HP 100/100 mostra "FULL — 100%" (apos B.06 ser implementado — tier FULL tem prioridade sobre LIGHT)
   - [ ] HP 1/3 mostra percentual arredondado corretamente (33%)
   - [ ] max_hp = 0 nao causa divisao por zero

### Testes automatizados (recomendados)

- **Unit test** para `getHpPercentage()` — limites 0%, 100%, arredondamento, max_hp=0
- **Unit test** para sanitizacao — verificar que `hp_percentage` esta presente para monstros e ausente de campos que nao devem te-lo
- Atualizar snapshot/testes existentes de `HpStatusBadge` se necessario

---

## Notas de Paridade

- **Guest (DM):** Precisa adicionar percentual ao lado da barra de HP. O DM tem acesso direto a `current_hp`/`max_hp` via Zustand store, entao o calculo e feito no client.
- **Player view:** Monstros recebem `hp_percentage` via broadcast/endpoint sanitizado. Jogadores calculam localmente para o proprio personagem.
- **Broadcast + Endpoint:** Ambos precisam ser atualizados para incluir `hp_percentage` no payload de monstros/NPCs.
- **Regra imutavel:** Os tiers LIGHT/MODERATE/HEAVY/CRITICAL com thresholds 70/40/10% sao imutaveis. O percentual e apenas informacao complementar e nao altera a logica de tiers.

---

## Definition of Done

- [ ] Funcao `getHpPercentage()` criada em `hp-status.ts`
- [ ] `HpStatusBadge` exibe percentual ao lado do tier
- [ ] Monstros na visao do jogador mostram tier + percentual (sem HP exato)
- [ ] Proprio personagem mostra HP exato + percentual
- [ ] Aliados mostram tier + percentual (sem HP exato)
- [ ] DM view mostra percentual
- [ ] Percentual atualiza em real-time
- [ ] Sanitizacao inclui `hp_percentage` no payload
- [ ] Nenhuma divisao por zero (max_hp=0)
- [ ] Testes manuais 1-6 passando
