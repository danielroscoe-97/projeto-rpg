# B.11 — Log de Danos Separado

**Epic:** B — Melhorias Visuais de Combate  
**Prioridade:** Media  
**Estimativa:** 5 SP  
**Arquivos principais:** Novo componente `components/combat/DamageLog.tsx`, integracao em `GuestCombatClient.tsx` e `PlayerJoinClient.tsx`

---

## Resumo

Atualmente os eventos de dano e cura estao misturados no log geral de combate (`CombatActionLog` / `combat-log-store`), junto com turnos, condicoes, ataques e eventos de sistema. O DM e os jogadores querem um painel dedicado de log de danos mostrando: quem sofreu dano, quanto, de quem (se rastreado), em qual turno/rodada, e com timestamp. Eventos de cura tambem devem aparecer neste log com diferenciacao visual. O log persiste durante todo o encontro.

---

## Contexto

### Infraestrutura existente

O projeto ja possui um sistema de log de combate completo:

**`lib/stores/combat-log-store.ts`** — Store Zustand com:
- `CombatLogEntry` com campos: `id`, `timestamp`, `round`, `type`, `actorName`, `targetName?`, `description`, `details?`
- `details` inclui: `damageAmount`, `damageType`, `damageModifier`, `rollResult`, etc.
- Tipos suportados: `"attack" | "damage" | "heal" | "condition" | "turn" | "defeat" | "save" | "system"`
- Cap de 200 entradas com FIFO

**`components/combat/CombatActionLog.tsx`** — Componente existente que renderiza o log geral com:
- Cores por tipo (damage = vermelho, heal = verde, turn = dourado, etc.)
- Icones por tipo (Swords, Heart, Shield, etc.)
- Auto-scroll para o mais recente
- Overlay mobile + painel desktop

**`lib/utils/combat-stats.ts`** — `computeCombatStats()` ja agrega dados de dano/cura por combatente a partir do `CombatLogEntry[]`.

### O que falta

Nao ha um painel **filtrado** que mostre apenas eventos de dano e cura. O `CombatActionLog` mostra tudo misturado, incluindo mudancas de turno, condicoes e eventos de sistema que poluem a visualizacao quando o DM quer entender rapidamente "quem tomou quanto dano neste encontro".

### Player view

O `PlayerInitiativeBoard` tem sua propria interface `CombatLogEntry` (linhas 21-25 do arquivo) com tipos: `"damage" | "heal" | "turn" | "condition"`. Esses logs vem via broadcast e ja sao sanitizados (sem revelar HP exato de monstros). O log de danos do player deve filtrar apenas `damage` e `heal`.

---

## Decisoes de UX (Party Mode 2026-04-02)

| Decisao | Resolucao |
|---------|-----------|
| **UI** | Tabs `Todos \| Danos` dentro do CombatActionLog existente — sem componente novo separado |
| **Timestamp** | Apenas `R3` (sem horario). Tag em `text-xs text-muted-foreground`. Horario irrelevante durante combate — ninguem olha o relogio. |
| **Ponto de entrada** | Se nao existe acesso ao log: icone `ScrollText` (Lucide) no header do player view |
| **Estado vazio** | *"Nenhum dano registrado"* em `text-muted-foreground`. Tab sempre habilitado, nunca desabilitado. |
| **Auto-scroll** | Sim, mas respeita scroll manual do usuario. Se scrollou pra cima: badge "Nova entrada ↓" para voltar ao fim |

---

## Criterios de Aceite

1. **Tab "Danos" no CombatActionLog existente.** Adicionar tabs `Todos | Danos` no topo do `CombatActionLog`. Sem criar componente/painel completamente separado — reutilizar a UI existente com filtragem por tab.

2. Cada entrada mostra: nome do alvo, quantidade de dano (ou cura), nome da fonte (se rastreado via `actorName`), numero da rodada no formato `R3` (apenas numero da rodada, **sem horario** — tag em `text-xs text-muted-foreground`).

3. Eventos de cura sao logados com cor diferente: **verde** para cura, **vermelho** para dano. Icone de coracao para cura, espada/caveira para dano.

4. O log persiste durante todo o encontro — nao e limpo ao avancar turno. Limpo apenas quando o combate e resetado (`clear()` da store).

5. **Auto-scroll inteligente:** Scroll automatico para entrada mais recente quando novo dano chega, MAS se o usuario scrollou manualmente para cima, mantém a posicao + mostra badge "Nova entrada ↓" para voltar ao fim (pattern de chat).

6. **Estado vazio:** Tab "Danos" quando sem entradas mostra texto *"Nenhum dano registrado"* em `text-muted-foreground`. Tab sempre habilitado, nunca desabilitado.

7. Na visao Guest (DM), o log utiliza os dados ja existentes no `combat-log-store` filtrados por `type === "damage" || type === "heal"`.

8. **Ponto de entrada (player view):** Se o CombatActionLog nao e acessivel na player view hoje, adicionar icone `ScrollText` (Lucide) no header do player view para abrir o log.

9. **Acesso por papel:**
   - **Player:** ve apenas entradas onde ELE PROPRIO e o alvo (`targetId === playerId`). Nao ve danos sofridos por aliados nem por monstros. Valor exato de dano/cura proprio e visivel.
   - **DM:** ve log de todos os players — todas as entradas de dano e cura sem restricao.
   - Monstros: DM ve valor exato. Players nao veem dano de monstros (fora do proprio).
   - Acessivel durante o combate ativo (nao apenas pos-sessao).

---

## Abordagem Tecnica

### 1. Novo componente: `DamageLog.tsx`

Criar `components/combat/DamageLog.tsx` como componente reutilizavel que:
- Recebe entradas de log (do Zustand store ou via props para player view)
- Filtra por `type === "damage" || type === "heal"`
- Renderiza em lista reversa (mais recente no topo)
- Usa as mesmas cores do `CombatActionLog` (vermelho para dano, verde para cura)

```typescript
interface DamageLogProps {
  open: boolean;
  onClose: () => void;
  /** "dm" shows exact amounts, "player" sanitizes monster damage details */
  viewMode: "dm" | "player";
  /** Player-specific: only show entries where player is actor or target */
  playerId?: string;
}
```

### 2. Filtragem da store existente (DM view)

Nao criar uma nova store. Usar um selector derivado do `combat-log-store`:

```typescript
const damageEntries = useCombatLogStore((s) =>
  s.entries.filter((e) => e.type === "damage" || e.type === "heal")
);
```

Isso e performatico porque o Zustand faz shallow comparison e o filtro e O(n) com n <= 200 (cap da store).

### 3. Filtragem para Player view

No `PlayerJoinClient`, o log local (`combatLog` state) ja recebe eventos via broadcast. Filtrar por tipo E por alvo:

```typescript
const damageEntries = combatLog.filter(
  (e) =>
    (e.type === "damage" || e.type === "heal") &&
    e.targetId === currentPlayerId  // apenas danos sofridos pelo proprio player
);
```

**Nota:** Como o player so ve seus proprios danos, a sanitizacao anti-metagaming fica simples — o filtro por `targetId` ja garante que nenhum dado alheio e exibido. Nao e necessario ocultar `damageAmount` de entradas de terceiros porque essas entradas simplesmente nao aparecem. Verificar que o broadcast inclui `targetId` nas entradas de log enviadas ao player.

### 4. Layout do painel

Reutilizar o mesmo pattern de layout do `CombatActionLog`:
- Mobile: overlay fullscreen com backdrop escuro
- Desktop: painel lateral ou tab dentro do mesmo drawer

**Opcao recomendada:** Adicionar uma tab no topo do `CombatActionLog` existente ("Todos" | "Danos") em vez de criar um painel completamente separado. Isso evita UI bloat e mantem a consistencia.

```typescript
// Dentro de CombatActionLog.tsx:
const [activeTab, setActiveTab] = useState<"all" | "damage">("all");
const displayEntries = activeTab === "all"
  ? entries
  : entries.filter((e) => e.type === "damage" || e.type === "heal");
```

### 5. Formato de cada entrada

**Timestamp simplificado:** Apenas numero da rodada, sem horario (irrelevante durante combate presencial).

```
[R3] Goblin A → Thorin: 8 dano (Slashing)
[R3] Cleric → Thorin: +12 cura
[R4] Fireball (Wizard) → Goblin B: 24 dano (Fire)
```

Layout do card:

```
┌──────────────────────────────────────────┐
│ ⚔ Goblin A → Thorin                 R3  │
│   8 dano (Slashing)                      │
├──────────────────────────────────────────┤
│ ♥ Cleric → Thorin                    R3  │
│   +12 cura                               │
└──────────────────────────────────────────┘
```

A tag de rodada fica em `text-xs text-muted-foreground` alinhada a direita.

### 6. Resumo agregado (bonus)

No topo do log, mostrar um mini-resumo: "Total dano sofrido: 45 | Total cura: 20 | Rodada atual: 4". Isso pode reutilizar `computeCombatStats()` de `lib/utils/combat-stats.ts`.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `components/combat/CombatActionLog.tsx` | Adicionar sistema de tabs ("Todos" / "Danos") com filtragem por tipo |
| `components/combat/DamageLog.tsx` (novo) | Componente de renderizacao da lista filtrada de dano/cura (pode ser inline no CombatActionLog se tab approach for escolhido) |
| `components/player/PlayerInitiativeBoard.tsx` | Adicionar botao para abrir log de danos na player view, com sanitizacao anti-metagaming |
| `components/player/PlayerJoinClient.tsx` | Passar `combatLog` filtrado para o PlayerInitiativeBoard ou para o novo componente |
| `lib/stores/combat-log-store.ts` | (Opcional) Adicionar selector helper `getDamageEntries()` para evitar recriacao de arrays |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

1. **DM view — filtro de danos**
   - [ ] Iniciar combate, aplicar dano a 3 combatentes diferentes, abrir log de danos
   - [ ] Verificar que apenas entradas de dano e cura aparecem (sem turnos, condicoes, etc.)
   - [ ] Verificar que a ordem e mais-recente-primeiro

2. **DM view — cura diferenciada**
   - [ ] Aplicar cura a um combatente
   - [ ] Verificar que a entrada aparece em verde com icone de coracao
   - [ ] Verificar que o valor de cura mostra sinal positivo (+12)

3. **DM view — persistencia durante encontro**
   - [ ] Aplicar dano em rodada 1, avancar para rodada 3, abrir log
   - [ ] Verificar que entradas da rodada 1 ainda estao presentes
   - [ ] Resetar combate — verificar que log foi limpo

4. **Player view — apenas danos proprios**
   - [ ] Como player, o log mostra APENAS dano/cura sofridos pelo proprio personagem
   - [ ] Dano sofrido por aliados NAO aparece no log do player
   - [ ] Dano sofrido por monstros NAO aparece no log do player
   - [ ] Cura recebida pelo proprio personagem aparece com valor exato

5. **Player view — isolamento de dados**
   - [ ] Verificar que mesmo que o broadcast contenha entradas de outros players, o filtro por `targetId` exclui corretamente
   - [ ] Verificar que `targetId` esta presente nas entradas de log recebidas via broadcast

6. **Tab switching**
   - [ ] Alternar entre "Todos" e "Danos" — verificar que a lista atualiza corretamente
   - [ ] Verificar que o scroll position e resetado ao trocar de tab

7. **Resumo agregado (se implementado)**
   - [ ] Verificar que o total de dano e cura esta correto
   - [ ] Verificar que atualiza em tempo real conforme eventos chegam

### Testes Unitarios (recomendados)

- Filtro de entradas: dado array misto, retorna apenas `damage` + `heal`
- Sanitizacao player: dado entry com `targetName` de monstro e `actorName` diferente do player, oculta `damageAmount`
- Formatacao de timestamp: dado `timestamp` unix, retorna `HH:MM:SS`

---

## Notas de Paridade

- **Guest Combat (DM offline):** Usa `combat-log-store` Zustand diretamente. O filtro de danos funciona localmente sem dependencia de rede.
- **DM Combat (logado):** Usa o mesmo `combat-log-store`. Funciona identicamente ao Guest.
- **Player Combat (realtime):** Recebe log via broadcast. A sanitizacao anti-metagaming e aplicada no cliente do player, nao no servidor. Isso e consistente com a abordagem atual onde `sanitizeCombatantsForPlayer()` roda server-side mas o log e client-side.
- **Escopo de dados:** Esta story nao cria um novo mecanismo de tracking de dano — ela reutiliza os dados que ja existem no `combat-log-store`. Se algum evento de dano nao esta sendo logado atualmente, isso e escopo de outra story.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Log pode ficar grande em encontros longos (muitos danos) | O `combat-log-store` ja tem cap de 200 entradas. O filtro so reduz esse numero. |
| Anti-metagaming pode ser bypassado se o player inspecionar o DOM | Os dados sanitizados vem do servidor — o player nunca recebe `damageAmount` para danos que nao o envolvem. Validar que o broadcast so envia o necessario. |
| Tab approach pode ser confusa se o DM nao perceber que esta filtrando | Indicador visual claro na tab ativa + badge com contagem de entradas filtradas. |

---

## Definicao de Pronto

- [ ] Tab "Danos" funcional no CombatActionLog (ou painel separado)
- [ ] Filtro correto: apenas `damage` e `heal`
- [ ] Cores diferenciadas: vermelho (dano) e verde (cura)
- [ ] Ordem reversa cronologica (mais recente no topo)
- [ ] Persistencia durante todo o encontro
- [ ] Player view com sanitizacao anti-metagaming
- [ ] Testes manuais 1-7 passando
- [ ] Nenhuma regressao no CombatActionLog existente
