# Epic: Combat Recap — Post-Combat Analytics & Conversion Funnel

> **Status**: Discovery completo, pronto para implementacao
> **Autor**: Party Mode (John, Sally, Winston, Bob) + Dani_
> **Data**: 2026-04-03
> **Prioridade**: Critica — coracao do funil de conversao

---

## Tese Central

O pos-combate e o momento de maior engajamento emocional do DM. Hoje, o leaderboard fecha e reseta tudo — perdendo o unico ponto de conversao real do app. O Combat Recap transforma esse momento em:

1. **Celebracao** (awards animados card-by-card, estilo Spotify Wrapped)
2. **Narrativa** (momentos epicos detectados automaticamente)
3. **Preservacao** (share text expandido + CTA de conversao)

**Diferencial de mercado**: Nenhum concorrente TTRPG (D&D Beyond, Roll20, Foundry, Owlbear Rodeo, Improved Initiative) oferece analytics pos-combate. Oceano azul.

---

## O Que Muda vs Hoje

### Hoje (problema)
```
Combate acaba → Leaderboard (tudo de uma vez) → [X] Fechar → Setup vazio
                                                      ↑
                                              BURACO NEGRO — sem CTA, sem save
```

### Depois (solucao)
```
Combate acaba → Reveal animado (card-by-card) → Momentos epicos → Resumo
                                                                      ↓
                                                          [Compartilhar] [Salvar] [Novo combate]
```

---

## Arquitetura de Dados

### Dados JA existentes (zero coleta nova)

**Por combatente** (de `CombatantStats` + `CombatLogEntry[]`):
- `totalDamageDealt` — dano total causado
- `totalDamageReceived` — dano total recebido
- `totalHealing` — cura total feita
- `knockouts` — numero de KOs
- `criticalHits` — numero de nat20 (apenas modo DM logado*)
- `criticalFails` — numero de nat1 (apenas modo DM logado*)
- `totalTurnTime` — tempo total nos turnos (ms)
- `turnCount` — numero de turnos

**Por encontro** (de stores + log):
- `round_number` — total de rounds
- `combatStartedAt` → `Date.now()` — duracao total
- `combatants[].is_defeated` — quem caiu
- `combatants[].is_player` — se e PC ou monstro
- `combatants[].current_hp / max_hp` — HP atual vs maximo
- Log entries com `type="condition"` — condicoes aplicadas/removidas
- Log entries com `type="defeat"` + `round` — timeline de KOs
- Log entries com `details.damageType` — tipo de dano

> *Nota: `useGuestCombatStats` NAO tracka `criticalHits`/`criticalFails`. Precisara de ajuste no guest mode para incluir essas metricas via log entries ou tracking direto.

### Gap no Guest Mode

O guest combat stats store (`guest-combat-stats.ts`) e lightweight e nao tracka:
- `criticalHits` / `criticalFails` (sempre 0)
- `conditionName` / `conditionAction`
- `damageType`

**Solucao**: O GuestCombatClient ja tem acesso ao `useCombatLogStore` (compartilhado). A funcao `buildCombatReport()` deve usar os log entries diretamente (como o DM mode faz via `computeCombatStats()`), nao depender do `useGuestCombatStats`.

---

## Camada 1 — Awards com Reveal Animado

### Experiencia

Cards aparecem **um por um** com animacao (Framer Motion `AnimatePresence`), ~2-3 segundos entre cada. O DM e a mesa reagem juntos. Tap/click avanca pro proximo card. Auto-advance apos 3s se nao interagir.

### Awards (ordem de revelacao)

| # | Award | Icone | Stat | Criterio | Emocao |
|---|-------|-------|------|----------|--------|
| 1 | **MVP** | Crown | `totalDamageDealt` rank #1 | Sempre (se dano > 0) | Orgulho |
| 2 | **Assassino** | Skull | `knockouts` | Se alguem tem >= 1 kill | Flex |
| 3 | **Tank** | Shield | `totalDamageReceived` | Se alguem tomou dano | Respeito |
| 4 | **Curandeiro** | Heart | `totalHealing` | Se alguem curou > 0 | Reconhecimento |
| 5 | **Rei dos Crits** | Target | `criticalHits` | Se alguem tem >= 1 crit | Euforia |
| 6 | **Azarado** | Dice | `criticalFails` | Se alguem tem >= 1 fumble | Humor |
| 7 | **Speedster** | Zap | avg turn time (menor) | Se >= 2 elegiveis com >= 2 turnos | Competitividade |
| 8 | **Pensador** | Timer | avg turn time (maior) | Mesmo criterio do speedster | Humor leve |

**Regras de exibicao**:
- Awards so aparecem se o criterio for atendido (nao mostrar card vazio)
- Se nenhum secondary award se qualifica, pular direto pro Resumo
- MVP sempre aparece primeiro (e o unico garantido se houve dano)
- Empates: vence quem aparece primeiro na initiative order

### Implementacao UX

```
[Card animado entra com scale + fade]
   ↓
[Icone + titulo do award animam primeiro]
   ↓  (200ms delay)
[Nome do combatente aparece com typewriter ou fade]
   ↓  (200ms delay)
[Valor numerico conta de 0 ate o valor final]
   ↓  (2s pausa OU tap pra avancar)
[Card sai com slide-left, proximo entra com slide-right]
```

**Controles**:
- Tap/click em qualquer lugar: avanca pro proximo card
- Botao "Pular tudo" discreto no canto: vai direto pro Resumo
- Auto-advance: 3s por card se nao interagir
- No mobile: swipe left tambem avanca

---

## Camada 2 — Momentos Epicos (Narrativas Automaticas)

### Deteccao (todos com dados ja existentes)

| Momento | Deteccao | Texto exemplo | Dados necessarios |
|---------|----------|---------------|-------------------|
| **"Quase morreu!"** | PC chegou a <= 10% max_hp E nao esta defeated ao final | "Thorin sobreviveu com 2 HP!" | `current_hp`, `max_hp`, `is_player`, `!is_defeated` |
| **"One-shot!"** | Um unico log entry de dano matou o alvo (target ficou defeated no mesmo round que recebeu o hit) | "Luna vaporizou Goblin 3 com 28 de Fire!" | Log entry `type="damage"` seguido de `type="defeat"` no mesmo round para mesmo target |
| **"Clutch Save!"** | Death save com nat20 (log entry `type="save"` com `isNat20=true`) | "Grimjaw voltou dos mortos com um nat 20!" | Log entry `type="save"`, `details.isNat20` |
| **"Virada Epica!"** | Round com mais dano total dos PCs veio DEPOIS de um PC cair | "Round 5: a party vingou Thorin com 47 de dano combinado!" | Correlacao entre KO timeline e damage-per-round dos PCs |

**Regras**:
- Mostrar no maximo 3 momentos (os mais impactantes)
- Se nenhum momento detectado, pular direto pro Resumo
- Prioridade: Clutch Save > Quase Morreu > One-shot > Virada Epica
- Apresentacao: cards menores, com icone tematico e texto narrativo, reveal animado sequencial

### Nota sobre Guest Mode

"Clutch Save" e "Rei dos Crits" / "Azarado" dependem de `isNat20`/`isNat1` no log. No guest mode, o DM rola dados fisicos — o app nao sabe se foi nat20. **Essas narrativas so aparecem quando houver log entries com esses flags**, o que hoje so acontece no modo DM logado (que usa o dice roller integrado) ou quando o DM manualmente marca um crit no guest mode.

---

## Camada 3 — Resumo Numerico

Tela estatica apos os awards e momentos. Sempre aparece.

| Stat | Fonte | Formato |
|------|-------|---------|
| Duracao total | `combatStartedAt` → `Date.now()` | "12m 34s" |
| Total de rounds | `round_number` | "7 rounds" |
| Dano total do encontro | Sum de todos `totalDamageDealt` | "234 de dano total" |
| PCs que cairam | `combatants.filter(c => c.is_defeated && c.is_player).length` | "2 PCs cairam" |
| Monstros derrotados | `combatants.filter(c => c.is_defeated && !c.is_player).length` | "3 monstros eliminados" |
| Total de crits | Sum de todos `criticalHits` | "5 crits" |
| Total de fumbles | Sum de todos `criticalFails` | "2 fumbles" |
| Tempo medio por turno | Sum `totalTurnTime` / Sum `turnCount` | "avg 28s/turno" |

### Ranking Completo

Abaixo do resumo, a tabela de ranking atual (ja existe no CombatLeaderboard) com barras de progresso e secondary stats.

---

## Camada 4 — Acoes Pos-Recap

Substitui os botoes atuais do leaderboard. Tres opcoes claras:

### Para Guest (deslogado)

```
[Compartilhar resultados]  — formatShareText() expandido (texto)
[Salvar e criar campanha]  — saveGuestCombatSnapshot() + redirect signup
[Novo combate]             — resetStore(), volta pro setup
```

O botao "Salvar e criar campanha" e o **CTA de conversao principal**. Framing: "Salve seus resultados" (preservacao), nao "Crie uma conta" (obrigacao).

### Para DM Logado

```
[Compartilhar resultados]  — formatShareText() expandido
[Salvar encontro]          — persiste no banco (ja existe parcialmente)
[Novo combate]             — resetStore()
```

---

## Share Text Expandido

O `formatShareText()` atual mostra:
```
Pocket DM -- Combat Results
Encounter: Goblin Ambush | Rounds: 7 | Duration: 12m 34s

MVP: Thorin -- 67 damage (5m 32s)
#2: Elara -- 45 damage (3m 12s)
#3: Luna -- 28 damage (2m 45s)

Tank: Grimjaw (45 received)
Healer: Luna (28 healed)
Speedster: Elara (avg 23s/turn)
Slowpoke: Grimjaw (avg 52s/turn)
```

**Versao expandida proposta**:
```
⚔️ Pocket DM — Combat Recap
━���━━━━━━━━━━━━━━━━━━━━━━━━━━
🗡️ 4 vs 3 | ⏱️ 7 rounds | 🕐 12m 34s

🏆 MVP: Thorin — 67 dmg
💀 Assassino: Elara — 2 kills
🛡️ Tank: Grimjaw — 45 recebido
💚 Curandeiro: Luna — 28 curado
🎯 Rei dos Crits: Thorin — 3 crits
⚡ Speedster: Elara — avg 23s/turno

📖 Momentos epicos:
• Thorin sobreviveu com 2 HP!
• Luna vaporizou Goblin 3 com one-shot!

💔 Baixas: 2 PCs cairam, 3 monstros eliminados
🎲 5 crits | 2 fumbles
━━━━━━━━━━━━━���━━━━━━━━━━━━━━
🔗 pocketdm.app/try
```

---

## Arquitetura Tecnica

### Novo tipo: `CombatReport`

```typescript
// lib/types/combat-report.ts

interface CombatReportAward {
  type: "mvp" | "assassin" | "tank" | "healer" | "crit_king" | "unlucky" | "speedster" | "slowpoke";
  combatantName: string;
  value: number;
  /** Formatted display value (e.g. "67 dmg", "avg 23s/turn") */
  displayValue: string;
}

interface CombatReportNarrative {
  type: "near_death" | "one_shot" | "clutch_save" | "epic_comeback";
  text: string;
  /** Round where this happened */
  round: number;
  /** Names involved */
  actors: string[];
}

interface CombatReportSummary {
  totalDuration: number;       // ms
  totalRounds: number;
  totalDamage: number;         // sum of all damage dealt
  pcsDown: number;
  monstersDefeated: number;
  totalCrits: number;
  totalFumbles: number;
  avgTurnTime: number;         // ms
  /** "X vs Y" format */
  matchup: string;
}

interface CombatReport {
  awards: CombatReportAward[];
  narratives: CombatReportNarrative[];
  summary: CombatReportSummary;
  rankings: CombatantStats[];  // sorted by damage dealt
  encounterName: string;
  timestamp: number;
}
```

### Nova funcao: `buildCombatReport()`

```
// lib/utils/combat-stats.ts (extend)

buildCombatReport(
  entries: CombatLogEntry[],
  combatants: Combatant[],
  turnTimeAccumulated: Record<string, number>,
  idToName: Record<string, string>,
  encounterName: string,
  combatDuration: number,
  roundNumber: number,
): CombatReport
```

Essa funcao:
1. Chama `computeCombatStats()` existente pra rankings
2. Chama `getTopForStat()` + `getTimeAwards()` existentes pra awards
3. Itera log entries pra detectar narrativas (near_death, one_shot, etc.)
4. Monta o summary com dados agregados
5. Retorna `CombatReport` tipado que alimenta tudo (UI, share, persist)

### Novo componente: `CombatRecap`

```
// components/combat/CombatRecap.tsx

Substitui o CombatLeaderboard atual como overlay pos-combate.
Internamente:
  1. RecapAwardsCarousel — cards animados com Framer Motion
  2. RecapNarratives — momentos epicos (se houver)
  3. RecapSummary — resumo numerico + ranking (reusa logica do CombatLeaderboard)
  4. RecapActions — botoes de acao (share/save/new)
```

### Animacao (Framer Motion — ja disponivel)

```typescript
// Exemplo de reveal card-by-card
const [currentCard, setCurrentCard] = useState(0);

// Auto-advance timer
useEffect(() => {
  const timer = setTimeout(() => {
    if (currentCard < awards.length - 1) setCurrentCard(c => c + 1);
  }, 3000);
  return () => clearTimeout(timer);
}, [currentCard]);

// Card animation
<AnimatePresence mode="wait">
  <motion.div
    key={currentCard}
    initial={{ opacity: 0, scale: 0.8, x: 100 }}
    animate={{ opacity: 1, scale: 1, x: 0 }}
    exit={{ opacity: 0, scale: 0.8, x: -100 }}
    transition={{ type: "spring", duration: 0.5 }}
  >
    <AwardCard award={awards[currentCard]} />
  </motion.div>
</AnimatePresence>
```

---

## Parity Rule — Guest vs DM Logado

| Feature | Guest (/try) | DM Logado |
|---------|-------------|-----------|
| Awards reveal animado | Sim | Sim |
| MVP, Assassino, Tank, Healer | Sim | Sim |
| Rei dos Crits / Azarado | Parcial* | Sim |
| Speedster / Pensador | Sim | Sim |
| Narrativas (near_death, one_shot) | Sim | Sim |
| Narrativas (clutch_save) | Parcial* | Sim |
| Resumo numerico | Sim | Sim |
| Share text | Sim | Sim |
| CTA "Salvar e criar campanha" | Sim (conversao) | N/A (ja logado) |
| CTA "Salvar encontro" | N/A | Sim |
| Persistencia no banco | Nao | Sim |

> *Parcial: depende de log entries com isNat20/isNat1, que no guest mode so existem se o DM usar o dice roller integrado.

---

## Fora de Escopo (Futuro)

- Imagem compartilhavel (Canvas API / html2canvas)
- Link publico com OG preview (pocketdm.app/r/abc123)
- Dano por round (timeline chart)
- Dano por tipo de acao (melee/ranged/spell)
- Heal efficiency (cura vs dano no mesmo round)
- Turn time snapshot por round
- Resistencias/vulnerabilidades agregadas
- Campaign stats acumulados
- Streak counter
- Session recaps automaticos

---

## Stories de Implementacao

### S1: `buildCombatReport()` + tipo `CombatReport`
- **Escopo**: Nova funcao em `combat-stats.ts` + tipo em `combat-report.ts`
- **AC**: Retorna CombatReport correto com awards, narrativas e summary a partir de dados existentes
- **Esforco**: P (2-3h)
- **Dependencias**: Nenhuma

### S2: `CombatRecap` com reveal animado
- **Escopo**: Novo componente que substitui CombatLeaderboard no pos-combate
- **AC**: Awards aparecem card-by-card com animacao Framer Motion, tap avanca, auto-advance 3s, botao "pular"
- **Esforco**: G (6-8h) — e o core da experiencia
- **Dependencias**: S1

### S3: Narrativas automaticas
- **Escopo**: Deteccao de near_death, one_shot, clutch_save, epic_comeback em `buildCombatReport()`
- **AC**: Narrativas detectadas corretamente, exibidas como cards menores apos awards
- **Esforco**: M (3-4h)
- **Dependencias**: S1

### S4: Share text expandido
- **Escopo**: `formatShareText()` expandido com awards + narrativas + emojis
- **AC**: Texto compartilhavel inclui todos os awards e momentos epicos
- **Esforco**: P (1-2h)
- **Dependencias**: S1

### S5: CTA pos-recap (Guest)
- **Escopo**: Botoes de acao contextuais (compartilhar/salvar/novo) no lugar do dismiss atual
- **AC**: Guest ve "Salvar e criar campanha" que salva snapshot e redireciona pra signup
- **Esforco**: M (3-4h)
- **Dependencias**: S2

### S6: Integracao no GuestCombatClient + CombatSessionClient
- **Escopo**: Substituir CombatLeaderboard por CombatRecap em ambos os clients
- **AC**: Recap funciona tanto no guest quanto no DM logado, respeitando parity table
- **Esforco**: M (3-4h)
- **Dependencias**: S2, S5

**Ordem de execucao**: S1 → S2 + S3 + S4 (paralelo) → S5 → S6

**Esforco total estimado**: ~20-25h de dev

---

## Arquivos Afetados

| Arquivo | Mudanca |
|---------|---------|
| `lib/types/combat-report.ts` | **NOVO** — tipos CombatReport, CombatReportAward, etc. |
| `lib/utils/combat-stats.ts` | **EXTEND** — buildCombatReport(), detectNarratives(), formatShareText() expandido |
| `components/combat/CombatRecap.tsx` | **NOVO** — componente principal com reveal animado |
| `components/combat/RecapAwardsCarousel.tsx` | **NOVO** — carousel de awards card-by-card |
| `components/combat/RecapNarratives.tsx` | **NOVO** — cards de momentos epicos |
| `components/combat/RecapSummary.tsx` | **NOVO** — resumo numerico (pode reusar logica do CombatLeaderboard) |
| `components/combat/RecapActions.tsx` | **NOVO** — botoes de acao contextuais |
| `components/combat/CombatLeaderboard.tsx` | **DEPRECATE** — substituido por CombatRecap |
| `components/guest/GuestCombatClient.tsx` | **EDIT** — trocar CombatLeaderboard por CombatRecap |
| `components/session/CombatSessionClient.tsx` | **EDIT** — trocar CombatLeaderboard por CombatRecap |
| `messages/pt.json` / `messages/en.json` | **EXTEND** — novas chaves i18n para awards e narrativas |
