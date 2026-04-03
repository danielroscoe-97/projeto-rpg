# Prompt de Implementação — Wave 3 (Features Novas)

> Copie este prompt inteiro e envie para o agente de implementação em uma nova janela de contexto.

---

## CONTEXTO DO PROJETO

Você está trabalhando no **Pocket DM** — app de combate para D&D 5e, focado em simplicidade na mesa. Stack: Next.js 15, Supabase (Postgres + Realtime), Tailwind CSS, Zustand, TypeScript.

**Filosofia:** "Simplificar pro momento da mesa. Só o que é relevante no momento de adrenalina." — radical simplicity.

**Antes de qualquer implementação**, leia obrigatoriamente:
- `CLAUDE.md` — contém a **Combat Parity Rule** (Guest vs Auth) que é obrigatória em todo change
- `docs/tech-stack-libraries.md` — libs disponíveis e regras de uso

---

## REGRA DE PARITY (IMUTÁVEL)

Toda alteração em combat experience DEVE verificar os 3 modos:

| Modo | Client | Entry Point |
|------|--------|-------------|
| Guest (DM) | `components/guest/GuestCombatClient.tsx` | `/app/try/page.tsx` |
| Anônimo (Player) | `components/player/PlayerJoinClient.tsx` | `/app/join/[token]/page.tsx` |
| Autenticado (Player) | `components/player/PlayerJoinClient.tsx` | `/app/invite/[token]/page.tsx` |

**Parity por story:**
- F-14 (Lock áudio): Aplica em Anon + Auth (ambos usam PlayerSoundboard). Guest (DM) N/A.
- F-13 (SFX turno): Aplica em Guest DM + Auth DM. Players N/A (já têm TurnNotificationOverlay).
- F-41 (Spell slots): Auth-only. Anon e Guest N/A.
- F-33 (Feats): Auth-only (compendium requer login). Guest e Anon N/A.

---

## ITEMS DESTA WAVE (4 stories)

### Ordem de implementação:

```
1. F-14 (Lock áudio ao turno) — 2 SP — menor, aquecimento
2. F-13 (SFX automático por turno) — 3 SP — relacionado a F-14
3. F-41 (Spell slots tracker) — 5 SP — feature nova, migration
4. F-33 (Feats no compendium) — 5 SP — feature nova, dataset
```

---

## 1. F-14 — Lock de Áudio ao Turno do Jogador (2 SP)

**Story completa:** `docs/stories/F14-turn-locked-audio.md` — **LEIA INTEIRA antes de codar.**

### Resumo

`PlayerSoundboard.tsx` JÁ bloqueia envio de áudio off-turn via `isPlayerTurn` prop (guard na linha 46, FAB disabled). O que falta é **feedback visual** claro — um label "Seu turno" abaixo do FAB quando desabilitado.

### O que fazer:

1. **`components/audio/PlayerSoundboard.tsx`** — adicionar label abaixo do FAB:
   ```tsx
   {!isPlayerTurn && (
     <span className="fixed bottom-[5.25rem] right-4 z-40 w-14 text-center text-muted-foreground text-[10px] leading-tight pointer-events-none">
       {t("disabled_not_turn_short")}
     </span>
   )}
   ```

2. **i18n** — adicionar chave curta:
   - `audio.disabled_not_turn_short`: "Seu turno" (pt-BR) / "Your turn" (en)

3. **Verificar pipeline** (read-only, não precisa mudar código):
   - PlayerJoinClient → `registeredName` + `channelRef` → PlayerInitiativeBoard
   - PlayerInitiativeBoard calcula `isPlayerTurn` (linhas 365-367)
   - PlayerInitiativeBoard → `isPlayerTurn` → PlayerSoundboard (linha 998)

### ACs:
- [ ] Label "Seu turno" visível quando NÃO é turno do player
- [ ] Label desaparece quando É turno do player
- [ ] FAB continua bloqueando envio off-turn (guard existente)
- [ ] DmSoundboard não é afetado
- [ ] Build passa

---

## 2. F-13 — SFX Automático por Turno (3 SP)

**Story completa:** `docs/stories/F13-turn-auto-sfx.md` — **LEIA INTEIRA antes de codar.**

### Resumo

Player JÁ tem `TurnNotificationOverlay` com som + vibração. DM não tem NENHUM feedback auditivo ao avançar turno. Adicionar SFX sutil (`page-flip.mp3`) no avanço de turno do DM, com toggle on/off.

### O que fazer:

1. **Criar `lib/utils/turn-sfx.ts`** — utility pura:
   - `playTurnSfx()` — toca `/sounds/sfx/page-flip.mp3` via `new Audio()` separado (NÃO usar audio-store para não interferir)
   - `isTurnSfxEnabled()` / `setTurnSfxEnabled()` — localStorage (`dm_turn_sfx_enabled`), default `true`
   - Respeita `isMuted` e `volume` do `useAudioStore`
   - Volume capped em 50% (`Math.min(volume, 0.5)`)

2. **Integrar no DM autenticado** (`lib/hooks/useCombatActions.ts`):
   - Chamar `playTurnSfx()` após `advanceTurn()` (linha 76)
   - Fire-and-forget, não bloqueia o fluxo

3. **Integrar no Guest DM** (`components/guest/GuestCombatClient.tsx`):
   - Chamar `playTurnSfx()` após `advanceTurn()` no `handleAdvanceTurn`

4. **Toggle no DmSoundboard** (`components/audio/DmSoundboard.tsx`):
   - Mini toggle "Som ao trocar turno" no header do panel
   - Estado via `isTurnSfxEnabled()` / `setTurnSfxEnabled()`
   - Visual: pill 8x4 com dot deslizante (gold quando on)

5. **Verificar:** Conferir se `/public/sounds/sfx/page-flip.mp3` existe. Se não existir, usar `book-open.mp3` ou `ui-click.mp3` como fallback.

6. **i18n**: `audio.turn_sfx_toggle`: "Som ao trocar turno" / "Turn advance sound"

### ACs:
- [ ] DM autenticado ouve SFX ao avançar turno
- [ ] Guest DM ouve SFX ao avançar turno
- [ ] SFX NÃO toca no undo de turno
- [ ] SFX respeita mute e volume
- [ ] Toggle on/off funciona e persiste em localStorage
- [ ] Players NÃO ouvem o SFX do DM (já têm TurnNotificationOverlay)
- [ ] Build passa

---

## 3. F-41 — Spell Slots Tracker (5 SP)

**Story completa:** `docs/stories/F41-spell-slots-tracker.md` — **LEIA INTEIRA antes de codar.**

### Resumo

Casters precisam rastrear spell slots gastos durante combate. Hoje fazem no papel. Adicionar tracker visual com bolinhas (como death saves) — preenchida = disponível, vazia = usada. Tap alterna.

### O que fazer:

1. **Migration** (`supabase/migrations/053_spell_slots_column.sql`):
   ```sql
   ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS spell_slots JSONB DEFAULT NULL;
   ```
   Formato: `{ "1": { "max": 4, "used": 2 }, "2": { "max": 3, "used": 0 } }`

   **ATENÇÃO:** Verificar se migration 053 já existe (F-40 pode usar esse número). Se existir, usar 054.

2. **Tipo TypeScript** (`lib/types/database.ts`):
   - Adicionar `spell_slots?: Record<string, { max: number; used: number }> | null` ao tipo `PlayerCharacter`

3. **Componente `SpellSlotTracker.tsx`** (novo):
   - Props: `spellSlots`, `onToggleSlot`, `onLongRest`, `collapsible?`, `readOnly?`
   - Dots: `w-3 h-3 rounded-full` — preenchido `bg-purple-400`, vazio `border-muted-foreground/30`
   - Bounce animation no toggle (400ms `scale-[1.3]`)
   - Haptic: `navigator.vibrate([50])` por dot, `[100, 50, 100]` no Long Rest
   - Collapsible: resumo "3/4 | 2/3 | 1/2" quando fechado
   - Long Rest: reset all + undo toast 3s
   - `role="checkbox"` + `aria-checked` nos dots

4. **Integrar no `PlayerBottomBar.tsx`** — colapsável, entre HP actions e conditions
5. **Integrar no `PlayerInitiativeBoard.tsx`** — expandido no card "Seu Personagem"

6. **Adicionar ao `CharacterForm.tsx`** — nova seção "Spell Slots":
   - 9 linhas (níveis 1-9), input numérico para max slots por nível
   - Níveis com max=0 não são salvos no JSONB

7. **Debounced save** no `PlayerJoinClient.tsx`:
   - 300ms debounce para persist no banco
   - `beforeunload` flush
   - Save: `supabase.from("player_characters").update({ spell_slots }).eq("id", charId)`

8. **i18n** em ambos locales:
   - `player.spell_slots_title`, `spell_slots_long_rest`, `spell_slots_restored`, `spell_slots_undo`, `spell_slots_level`, `spell_slots_config_title`, etc.

### ACs:
- [ ] Migration aplicada
- [ ] CharacterForm permite configurar max slots por nível
- [ ] Mobile: bloco colapsável com resumo + dots ao expandir
- [ ] Desktop: dots expandidos no card do personagem
- [ ] Tap alterna dot (preenchido ↔ vazio) com haptic + bounce
- [ ] Long Rest reseta tudo com undo toast
- [ ] Debounced save funcional
- [ ] Não aparece se personagem não tem slots configurados
- [ ] Build passa

---

## 4. F-33 — Feats no Compendium (5 SP)

**Story completa:** `docs/stories/F33-feats-compendium.md` — **LEIA INTEIRA antes de codar.**

### Resumo

Compendium tem monsters, spells, items, conditions — faltam feats. Adicionar 5ª aba com ~42 feats SRD 5.1 em cards accordion (pattern do ConditionReference).

### O que fazer:

1. **Dataset** (`public/srd/feats.json`):
   - Array de ~42 feats SRD 5.1 (CC-BY-4.0)
   - Campos: `id`, `name`, `description`, `prerequisite` (string | null), `source`, `ruleset_version`
   - **IMPORTANTE:** Descrições DEVEM ser fiéis ao texto do SRD 5.1. Não inventar.
   - Feats incluem: Alert, Athlete, Actor, Charger, Crossbow Expert, Defensive Duelist, Dual Wielder, Dungeon Delver, Durable, Elemental Adept, Grappler, Great Weapon Master, Healer, Heavily Armored, Heavy Armor Master, Inspiring Leader, Keen Mind, Lightly Armored, Linguist, Lucky, Mage Slayer, Magic Initiate, Martial Adept, Medium Armor Master, Mobile, Moderately Armored, Mounted Combatant, Observant, Polearm Master, Resilient, Ritual Caster, Savage Attacker, Sentinel, Sharpshooter, Shield Master, Skilled, Skulker, Spell Sniper, Tavern Brawler, Tough, War Caster, Weapon Master

2. **Interface + Loader** (`lib/srd/srd-loader.ts`):
   - `SrdFeat` interface
   - `loadFeats()` com cache promise (mesmo pattern de `loadConditions`)

3. **Cache IndexedDB** (`lib/srd/srd-cache.ts`):
   - `getCachedFeats()` / `setCachedFeats()` seguindo pattern existente

4. **SRD Store** (`lib/stores/srd-store.ts`):
   - Adicionar `feats: SrdFeat[]` ao state
   - Carregar na Phase 2 (deferred via `requestIdleCallback`)

5. **FeatBrowser** (`components/compendium/FeatBrowser.tsx`) — novo:
   - Accordion cards (ConditionReference pattern, NÃO split-panel)
   - Busca por nome (debounce 200ms)
   - Filtro prerequisito: pills "Todos" | "Com Pré-requisito" | "Sem Pré-requisito"
   - Contagem "{N} feats encontrados"
   - Card colapsado: nome + badge prereq (amber)
   - Card expandido: prerequisite destacado + descrição + botão pin
   - Pin via `usePinnedCardsStore` (verificar se aceita tipo "feat")
   - Ordenação alfabética

6. **Compendium page** (`app/app/compendium/page.tsx`):
   - Type `Tab` → adicionar `"feats"`
   - Nova aba entre "Items" e "Conditions"
   - `{activeTab === "feats" && <FeatBrowser />}`

7. **i18n** em ambos locales:
   - `compendium.tab_feats`, `feats_search_placeholder`, `feats_filter_all`, `feats_filter_has_prereq`, `feats_filter_no_prereq`, `feats_count`, `feats_prerequisite`, `feats_pin`

### ACs:
- [ ] `feats.json` com ~42 feats SRD 5.1 (texto verificado)
- [ ] Interface `SrdFeat` + `loadFeats()` funcionais
- [ ] Cache IndexedDB funcional
- [ ] SRD store carrega feats na Phase 2
- [ ] Aba "Feats" visível no compendium
- [ ] FeatBrowser: busca, filtro prereq, accordion, pin
- [ ] URL routing: `?tab=feats` funciona
- [ ] Sem regressão nas 4 tabs existentes
- [ ] Build passa

---

## REGRAS DE IMPLEMENTAÇÃO

1. **Ler a story completa antes de codar** — cada story tem decisões de UX, abordagem técnica com código e plano de testes
2. **Marcar ACs como feitos** conforme completa (`- [x]`)
3. **Verificar parity** em cada change (tabela de parity por story está acima)
4. **Screenshots de QA** em `qa-evidence/` — nunca na raiz do projeto
5. **Não criar arquivos desnecessários** — prefira editar existentes
6. **HP tiers são imutáveis**: sempre `FULL/LIGHT/MODERATE/HEAVY/CRITICAL` em inglês
7. **Rodar `next build`** ao final para garantir zero erros
8. **Migrations:** Verificar numeração sequencial — se 053 já existe, usar 054, 055, etc.

---

## ENTREGÁVEIS

Ao concluir, reportar:

```
WAVE 3 — STATUS:
- F-14 Lock áudio: [DONE/PARCIAL] — [detalhes]
- F-13 SFX turno: [DONE/PARCIAL] — [detalhes]
- F-41 Spell slots: [DONE/PARCIAL] — [detalhes]
- F-33 Feats: [DONE/PARCIAL] — [detalhes]
- Build: [PASSA/FALHA] — [detalhes]
- Migrations criadas: [lista de nomes]
```
