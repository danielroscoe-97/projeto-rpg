# Sprint Plan — Feedback de Áudio (2026-03-28)

**Projeto:** Pocket DM
**Autores:** John (PM), Sally (UX), Winston (Architect)
**Data:** 2026-03-28
**Referência:** `docs/discovery-audio-feedback-2026-03-28.md`

---

## Visão Geral

3 sprints organizados por prioridade:
1. **Sprint 1: Paridade /try + Fluidez** — Bugs críticos + paridade guest/logged + fluidez de combate
2. **Sprint 2: Polish Visual + Imersão** — HP temporário visual, histórico de dados avançado, áudio, alias UX
3. **Sprint 3: Conversão** — Leaderboard + Timer + CTA de conversão

**Estimativa total:** ~30h de implementação

---

## Sprint 1: Paridade /try + Fluidez de Combate

**Objetivo:** Tornar o combate deslogado (/try) equivalente ao logado em features críticas + melhorar fluidez do DM.
**Estimativa:** ~10h
**Prioridade:** P0 — Bloqueia conversão

### Story 1.1: Fix golden glow no MonsterGroupHeader (B1)

**Esforço:** 1h
**Arquivo:** `components/combat/MonsterGroupHeader.tsx`

**O que fazer:**
- Adicionar prop `isCurrentTurn: boolean` ao `MonsterGroupHeader`
- Propagar estado: se **qualquer membro** do grupo tem `isCurrentTurn === true`, o grupo inteiro recebe o glow
- Aplicar mesmas classes do CombatantRow: `border-gold bg-gold/[0.07] ring-1 ring-gold/30`

**Acceptance Criteria:**
- [ ] Quando é a vez de um combatente dentro de um grupo, o MonsterGroupHeader (colapsado ou expandido) mostra borda dourada
- [ ] O CombatantRow interno continua mostrando o indicador `▶`
- [ ] Quando o turno passa para fora do grupo, o glow some

**Approach Técnico:**
```tsx
// MonsterGroupHeader.tsx — adicionar prop
interface MonsterGroupHeaderProps {
  // ... props existentes
  isCurrentTurn?: boolean;  // NEW
}

// No className do container div (linha 81):
className={`border rounded-md overflow-hidden transition-colors border-l-4 border-l-orange-500/60 ${
  props.isCurrentTurn ? "border-gold bg-gold/[0.07] ring-1 ring-gold/30" : ""
} ${allDefeated ? "opacity-50 border-border" : "border-border"}`}
```

Quem passa o prop: O componente pai que renderiza o grupo (SortableCombatantList ou o wrapper de grupo) deve verificar se `currentTurnIndex` aponta para um membro do grupo.

---

### Story 1.2: Multi-target no combate guest /try (F2/F3)

**Esforço:** 2h
**Arquivo:** `components/guest/GuestCombatClient.tsx:843-859`

**O que fazer:**
- Passar `allCombatants={combatants}` ao `CombatantRow` na renderização do combate ativo guest
- Implementar callback `onApplyToMultiple` usando as ações do guest store

**Acceptance Criteria:**
- [ ] No combate /try, ao abrir HpAdjuster, seção "Aplicar em mais alvos" aparece
- [ ] Selecionar múltiplos alvos e aplicar dano/heal/temp funciona
- [ ] Comportamento idêntico ao combate logado

**Approach Técnico:**
```tsx
// GuestCombatClient.tsx — adicionar callback
const handleApplyToMultiple = useCallback(
  (targetIds: string[], amount: number, mode: HpMode) => {
    for (const id of targetIds) {
      if (mode === "damage") applyDamage(id, amount);
      else if (mode === "heal") applyHealing(id, amount);
      else setTempHp(id, amount);
    }
  },
  [applyDamage, applyHealing, setTempHp]
);

// Na renderização do CombatantRow (linha 843+):
<CombatantRow
  // ... props existentes
  allCombatants={combatants}           // ADD
  onApplyToMultiple={handleApplyToMultiple}  // ADD
/>
```

**Import necessário:** `import type { HpMode } from "@/components/combat/HpAdjuster";`

---

### Story 1.3: Auto-roll de iniciativa para grupos de monstros (F1)

**Esforço:** 1h
**Arquivos:**
- `components/guest/GuestCombatClient.tsx:134-169` — `handleSelectMonsterGroup`
- `components/combat/EncounterSetup.tsx` — mesmo fix para combate logado

**O que fazer:**
- No `handleSelectMonsterGroup`, antes de criar o array de combatants, chamar `rollInitiativeForCombatant` uma vez
- Atribuir o resultado a `initiative` de todos os membros do grupo

**Acceptance Criteria:**
- [ ] Ao inserir grupo de monstros via busca SRD, todos chegam com iniciativa já rolada
- [ ] Todos os membros têm o mesmo valor de iniciativa
- [ ] O valor é calculado com `1d20 + DEX modifier` do monstro
- [ ] Funciona tanto no /try quanto no combate logado

**Approach Técnico:**
```tsx
// GuestCombatClient.tsx — handleSelectMonsterGroup
const handleSelectMonsterGroup = useCallback(
  (monster: SrdMonster, qty: number) => {
    const groupId = crypto.randomUUID();
    // Roll initiative ONCE for the group
    const groupInitResult = rollInitiativeForCombatant("group", monster.dex ?? undefined);
    const groupInit = groupInitResult.total;

    // ... loop creating combatants
    newCombatants.push({
      // ...
      initiative: groupInit,  // was: null
      // ...
    });
  },
  [addMonsterGroup]
);
```

---

### Story 1.4: Auto-scroll para combatente ativo ao avançar turno (U3)

**Esforço:** 2h
**Arquivos:**
- `components/guest/GuestCombatClient.tsx`
- `components/session/CombatSessionClient.tsx`

**O que fazer:**
- Após cada `advanceTurn()`, fazer scroll suave para o card do combatente que agora está ativo
- Usar `useEffect` ligado a `currentTurnIndex` para disparar o scroll

**Acceptance Criteria:**
- [ ] Ao clicar "Próximo Turno", tela scrolla suavemente para o card ativo
- [ ] Scroll usa `block: 'center'` para centralizar o card na viewport
- [ ] Funciona tanto no /try quanto no logado
- [ ] Não scrolla se o card já está visível na viewport

**Approach Técnico:**
```tsx
// Em ambos os componentes, adicionar useEffect:
useEffect(() => {
  if (!is_active) return;
  // Small delay to allow DOM update
  requestAnimationFrame(() => {
    const activeCard = document.querySelector('[aria-current="true"]');
    activeCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}, [currentTurnIndex, is_active]);
```

No guest, substituir `is_active` por `phase === "active"`.

---

### Story 1.5: Histórico de dados — colapsado, newest-first, sem auto-scroll (U1)

**Esforço:** 3h
**Arquivos:**
- `lib/stores/dice-history-store.ts`
- `components/dice/DiceHistoryPanel.tsx`

**O que fazer:**
1. **Store:** Inverter ordem de inserção — `entries = [entry, ...state.entries]` em vez de `[...state.entries, entry]`
2. **Store:** `isOpen` default deve ser `false` (já é)
3. **Panel:** Remover auto-scroll useEffect (linhas 29-34)
4. **Panel (pill):** Mostrar preview do último roll no pill mode (não só o ícone)

**Acceptance Criteria:**
- [ ] Painel inicia fechado (pill) — comportamento atual, manter
- [ ] Ao abrir, entrada mais recente está no topo
- [ ] Novas rolagens aparecem no topo (sem scroll)
- [ ] Sem auto-scroll em nenhum cenário
- [ ] Pill mostra preview da última rolagem (ex: "🎲 18 — Shortsword")

**Approach Técnico:**
```typescript
// dice-history-store.ts — addEntry
addEntry: (result) => {
  const entry: HistoryEntry = { /* ... */ };
  set((state) => {
    const entries = [entry, ...state.entries]; // PREPEND instead of APPEND
    if (entries.length > MAX_ENTRIES) {
      entries.length = MAX_ENTRIES; // Trim from end (oldest)
    }
    return { entries, unreadCount: /* ... */ };
  });
},
```

```tsx
// DiceHistoryPanel.tsx — REMOVE auto-scroll useEffect (lines 29-34)
// DELETE:
// useEffect(() => {
//   if (isOpen && scrollRef.current) {
//     scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//   }
// }, [entries.length, isOpen]);

// Update pill to show last entry preview:
if (!isOpen) {
  const lastEntry = entries[0]; // First = newest
  return (
    <button className="dice-history-pill" onClick={togglePanel}>
      {/* existing icon */}
      {lastEntry && (
        <span className="dice-history-pill-preview">
          {lastEntry.result.total}
          {lastEntry.result.label ? ` — ${lastEntry.result.label}` : ""}
        </span>
      )}
      {/* existing badge */}
    </button>
  );
}
```

---

### Story 1.6: Fix texto LP "sem conta necessária" (B3)

**Esforço:** 0.5h
**Arquivo:** `app/page.tsx:454`

**O que fazer:**
- Alterar descrição do passo 3 de "Gere o link da sessão. Jogadores abrem no celular — sem conta necessária." para "Gere o link da sessão. Jogadores entram pelo celular — sem cadastro para eles."
- Esclarece que é o jogador que não precisa de conta, não o DM

**Acceptance Criteria:**
- [ ] Texto do passo 3 não promete funcionalidade que requer login
- [ ] Mensagem clara: DM precisa de conta, jogadores não

---

## Sprint 2: Polish Visual + Imersão

**Objetivo:** Completar feedback visual (temp HP, alias) e corrigir áudio.
**Estimativa:** ~12h
**Prioridade:** P1

### Story 2.1: Barra visual de HP temporário (F4)

**Esforço:** 3h
**Arquivos:**
- `components/combat/CombatantRow.tsx:117-122`
- `app/globals.css` (se necessário)

**O que fazer:**
- Quando `temp_hp > 0`, renderizar barra roxa sobreposta à direita da barra de HP
- A barra roxa representa a proporção de temp_hp no total (hp + temp_hp)
- O total visual da barra = `current_hp + temp_hp` / `max_hp + temp_hp`

**Acceptance Criteria:**
- [ ] Quando combatente tem temp_hp > 0, barra roxa aparece
- [ ] Barra roxa está à direita da barra de HP normal
- [ ] Ao perder temp_hp (dano absorvido), barra roxa diminui
- [ ] Tiers de cor (LIGHT/MODERATE/HEAVY/CRITICAL) calculam sobre HP normal, não temp_hp
- [ ] Player view também mostra indicação visual (mas sem números)

**Approach Técnico:**
```tsx
// CombatantRow.tsx — HP bar section
// Current: single bar with hpPct
// New: two segments — HP bar (green→red) + temp bar (purple)

const totalPool = combatant.max_hp + combatant.temp_hp;
const hpPctOfTotal = totalPool > 0 ? combatant.current_hp / totalPool : 0;
const tempPctOfTotal = totalPool > 0 ? combatant.temp_hp / totalPool : 0;

// Render:
<div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex">
  {/* Normal HP segment */}
  <div
    className={`h-full rounded-l-full transition-all ${hpBarColor}`}
    style={{ width: `${hpPctOfTotal * 100}%` }}
  />
  {/* Temp HP segment (purple) */}
  {combatant.temp_hp > 0 && (
    <div
      className="h-full bg-purple-500 rounded-r-full transition-all"
      style={{ width: `${tempPctOfTotal * 100}%` }}
      title={`Temp HP: ${combatant.temp_hp}`}
    />
  )}
</div>
```

**Regra HP tiers:** Os tiers LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%) continuam calculando sobre `current_hp / max_hp` — temp_hp NÃO altera os tiers. Isso é imutável por regra do projeto.

---

### Story 2.2: Advantage/Disadvantage no histórico de dados (U2)

**Esforço:** 2h
**Arquivo:** `components/dice/DiceHistoryPanel.tsx`

**O que fazer:**
- Concatenar o modo ao label exibido no histórico
- No `HistoryEntryRow`, quando `result.mode === "advantage"` ou `"disadvantage"`, append ao label

**Acceptance Criteria:**
- [ ] Rolagem com vantagem mostra: "Shortsword — Advantage" no label
- [ ] Rolagem com desvantagem mostra: "Shortsword — Disadvantage" no label
- [ ] Ambos os valores (kept e discarded) são visíveis
- [ ] O valor descartado é visualmente riscado/dimmed (já implementado)

**Approach Técnico:**
```tsx
// HistoryEntryRow — label rendering
const modeLabel = result.mode === "advantage" ? " — Advantage"
  : result.mode === "disadvantage" ? " — Disadvantage"
  : "";

// No render:
{result.label && (
  <span className="dice-history-label">
    {result.label}{modeLabel}
  </span>
)}
```

---

### Story 2.3: Fix áudios de efeitos climáticos (B2)

**Esforço:** 3h
**Arquivos:**
- `public/sounds/sfx/` — verificar existência dos arquivos
- `lib/stores/audio-store.ts` — debugging de playback
- `lib/utils/audio-presets.ts` — verificar paths
- `components/audio/PlayerSoundboard.tsx` — verificar UI

**O que fazer:**
1. **Verificar assets:** Confirmar que todos os 10 arquivos MP3 existem em `public/sounds/sfx/`
2. **Verificar volume:** Default é 0.7, mas pode estar `isMuted: true` no localStorage
3. **Verificar play():** `audio.play().catch(() => {})` silencia erros — adicionar logging
4. **Verificar UI:** Os botões de efeito climático estão chamando `playSound` corretamente?
5. **Browser autoplay:** Alguns browsers bloqueiam autoplay sem user gesture

**Acceptance Criteria:**
- [ ] Todos os 10 presets de áudio funcionam ao clicar
- [ ] Volume audível no default (0.7)
- [ ] Se arquivo não existe, feedback visual de erro
- [ ] Console log quando áudio falha (não silenciar catch)

**Root Cause Confirmada:**
Todos os 10 arquivos MP3 em `public/sounds/sfx/` são **idênticos** — mesmo hash MD5 (`ba7d399748dabfb1c5b0d43867b2d6e0`), 4387 bytes cada. São placeholders genéricos. O código de playback está correto. **Solução: substituir por áudios reais (royalty-free RPG SFX).**

**Fontes sugeridas de SFX (royalty-free):**
- freesound.org (CC0/CC-BY)
- opengameart.org (OGA-BY)
- pixabay.com/sound-effects (Pixabay License)

**Specs dos novos arquivos:**
- Formato: MP3, 128kbps, 44.1kHz
- Duração: 1-3 segundos cada
- Tamanho alvo: 15-50KB cada

---

### Story 2.4: Tooltip "Barreira Anti-Metagame" no campo de alias (U4)

**Esforço:** 1h
**Arquivos:**
- `components/combat/CombatantSetupRow.tsx` — campo display_name
- `components/combat/StatsEditor.tsx` — campo display_name no editor

**O que fazer:**
- Adicionar tooltip/title ao campo `display_name` em ambos os locais
- Texto: "🛡️ Barreira Anti-Metagame — Nome que seus jogadores verão na iniciativa"

**Acceptance Criteria:**
- [ ] Hover no campo alias mostra tooltip explicativo
- [ ] Tooltip aparece tanto na setup row quanto no editor de stats
- [ ] i18n: textos em pt-BR e en

---

### Story 2.5: Alias editável na tela pré-combate (U5)

**Esforço:** 2h
**Arquivos:**
- `components/combat/CombatantSetupRow.tsx`
- `components/guest/GuestCombatClient.tsx` (se CombatantSetupRow é compartilhado)

**O que fazer:**
- Na CombatantSetupRow, adicionar ícone (seta ou shield) ao lado do nome
- Ao clicar, expandir campo inline de display_name
- O campo mostra o alias gerado automaticamente e permite edição

**Acceptance Criteria:**
- [ ] Na tela de setup, cada combatente NPC/monstro tem ícone para editar alias
- [ ] Clicar abre campo inline com o alias atual
- [ ] Editar e confirmar atualiza o display_name
- [ ] Players não mostram o ícone (não têm alias)

---

## Sprint 3: Conversão — Leaderboard & Timer

**Objetivo:** Criar momento mágico de conversão no /try.
**Estimativa:** ~10h
**Prioridade:** P1

### Story 3.1: Timer de combate (F6)

**Esforço:** 2h
**Arquivos:**
- `lib/stores/guest-combat-store.ts` — adicionar `combatStartTime`
- `lib/stores/combat-store.ts` — idem para logado
- `components/guest/GuestCombatClient.tsx` — render timer
- `components/session/CombatSessionClient.tsx` — render timer

**O que fazer:**
- Ao chamar `startCombat()`, salvar `Date.now()` no store
- Renderizar timer no header do combate: `⏱ MM:SS`
- Atualizar a cada segundo via `setInterval`

**Acceptance Criteria:**
- [ ] Timer aparece no header do combate ativo
- [ ] Conta de 00:00 em diante
- [ ] Formato MM:SS (HH:MM:SS se > 1h)
- [ ] Timer persiste se page refresh (salvar startTime no store persistido)
- [ ] Funciona em /try e logado

**Approach Técnico:**
```typescript
// guest-combat-store.ts — adicionar ao state
combatStartTime: number | null;  // timestamp

// startCombat action:
startCombat: () => set({ phase: "active", combatStartTime: Date.now(), /* ... */ }),

// Component:
function CombatTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return <span className="text-muted-foreground text-xs font-mono">⏱ {mins}:{secs.toString().padStart(2, '0')}</span>;
}
```

---

### Story 3.2: Combat Stats Tracker (client-side) para Leaderboard

**Esforço:** 3h
**Arquivo novo:** `lib/stores/combat-stats-store.ts`

**O que fazer:**
- Store que acumula estatísticas durante o combate:
  - `damageDealt: Record<combatantId, number>` — dano total por combatente
  - `damageReceived: Record<combatantId, number>` — dano recebido
  - `kills: Record<combatantId, number>` — combatentes derrotados
  - `crits: Record<combatantId, number>` — acertos críticos
  - `healingDone: Record<combatantId, number>` — cura aplicada
  - `roundCount: number` — total de rounds
  - `combatDuration: number` — duração em segundos
- Integrar com ações existentes: `applyDamage`, `applyHealing`, `setDefeated`

**Acceptance Criteria:**
- [ ] Tracker acumula stats em tempo real durante combate
- [ ] Stats são client-side only (Zustand, não persistido)
- [ ] Reset quando novo combate inicia
- [ ] Dados disponíveis no `endCombat` para leaderboard

**Approach Técnico:**
```typescript
interface CombatStats {
  damageDealt: Record<string, number>;
  damageReceived: Record<string, number>;
  kills: Record<string, number>;
  crits: Record<string, number>;
  healingDone: Record<string, number>;
  roundCount: number;
}

// Hooks into existing actions via middleware ou manual tracking:
// Exemplo: ao chamar applyDamage(id, amount), também chamar:
// combatStatsStore.getState().trackDamage(sourceId, targetId, amount);
```

**Nota:** Como o sistema atual não tem `sourceId` (quem causou o dano), o tracker vai atribuir dano ao **turno ativo** (combatente cujo turno é `currentTurnIndex`).

---

### Story 3.3: Leaderboard no fim do combate /try (F5)

**Esforço:** 5h
**Arquivos:**
- Componente novo: `components/guest/GuestCombatLeaderboard.tsx`
- `components/guest/GuestCombatClient.tsx` — integrar ao `handleEndEncounter`

**O que fazer:**
- Ao clicar "Fim" no combate /try, mostrar tela de leaderboard em vez de resetar direto
- Rankings baseados nos stats coletados em Story 3.2
- CTA de conversão no final

**Acceptance Criteria:**
- [ ] Ao clicar "Fim", transição para tela de leaderboard
- [ ] Leaderboard mostra: Top Damage Dealer, Most Kills, Tank (mais dano recebido), Healer
- [ ] Exibe duração do combate e total de rounds
- [ ] CTA proeminente: "Quer estatísticas completas? Crie sua conta grátis"
- [ ] Botão "Novo Combate" abaixo do CTA
- [ ] Nomes exibidos são os `display_name` (anti-metagame) ou `name` se player

**Wireframe (Sally):**
```
┌─────────────────────────────────────┐
│     ⚔️ COMBATE FINALIZADO ⚔️       │
│        ⏱ 32:15 | 8 Rounds          │
│                                     │
│  🏆 LEADERBOARD                     │
│                                     │
│  ⚔️ Maior Dano                      │
│  → Thorin Escudo-de-Carvalho  142   │
│                                     │
│  💀 Mais Abates                     │
│  → Legolas                    3     │
│                                     │
│  🛡️ Tank (Dano Recebido)           │
│  → Gimli                      87   │
│                                     │
│  💚 Maior Cura                      │
│  → Gandalf                    56   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  📊 Quer estatísticas completas     │
│     na sua campanha?                │
│                                     │
│  [Criar Conta Grátis →]             │
│                                     │
│  [Novo Combate]                     │
└─────────────────────────────────────┘
```

**Approach Técnico:**
```tsx
// GuestCombatClient.tsx — alterar handleEndEncounter
// Em vez de resetCombat(), transicionar para phase = "ended" com stats

const handleEndEncounter = useCallback(() => {
  const stats = combatStatsStore.getState();
  const duration = combatStartTime ? Math.floor((Date.now() - combatStartTime) / 1000) : 0;
  // Show leaderboard phase
  setShowLeaderboard(true);
  setFinalStats({ ...stats, duration, roundCount: roundNumber });
}, [roundNumber]);

// Render:
if (showLeaderboard) {
  return <GuestCombatLeaderboard stats={finalStats} combatants={combatants} onNewCombat={resetCombat} />;
}
```

---

## Resumo de Sprints

| Sprint | Stories | Horas | Foco |
|--------|---------|-------|------|
| Sprint 1 | 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 | ~10h | Paridade /try + Fluidez |
| Sprint 2 | 2.1, 2.2, 2.3, 2.4, 2.5 | ~11h | Visual + Imersão |
| Sprint 3 | 3.1, 3.2, 3.3 | ~10h | Conversão |

---

## Checklist de Execução

### Sprint 1
- [ ] Story 1.1 — Golden glow no grupo
- [ ] Story 1.2 — Multi-target no /try
- [ ] Story 1.3 — Auto-roll iniciativa grupo
- [ ] Story 1.4 — Auto-scroll turno ativo
- [ ] Story 1.5 — Histórico de dados UX
- [ ] Story 1.6 — Fix texto LP

### Sprint 2
- [ ] Story 2.1 — Barra temp HP roxa
- [ ] Story 2.2 — Advantage/Disadvantage no histórico
- [ ] Story 2.3 — Fix áudios
- [ ] Story 2.4 — Tooltip anti-metagame
- [ ] Story 2.5 — Alias editável no setup

### Sprint 3
- [ ] Story 3.1 — Timer de combate
- [ ] Story 3.2 — Combat stats tracker
- [ ] Story 3.3 — Leaderboard + CTA
