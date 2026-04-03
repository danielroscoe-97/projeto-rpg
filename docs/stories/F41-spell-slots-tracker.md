# F-41 — Spell Slots Tracker (Bolinhas Marcaveis)

**Epic:** Player Agency — Combate  
**Prioridade:** Media  
**Estimativa:** 5 SP  
**Dependencia:** W3.2 (CharacterForm integrado no PlayerCharacterManager)  
**Arquivos principais:** `components/player/SpellSlotTracker.tsx` (novo), `components/player/PlayerBottomBar.tsx`, `components/player/PlayerInitiativeBoard.tsx`, `components/dashboard/PlayerCharacterManager.tsx`, `supabase/migrations/053_spell_slots_column.sql` (novo)

---

## Resumo

Na mesa, casters precisam rastrear quantos spell slots ja gastaram. Hoje fazem isso no papel, no D&D Beyond, ou de cabeca — tudo fora do Pocket DM. Isso causa pausas ("espera, deixa eu ver se ainda tenho slot de 3o nivel") que quebram o ritmo do combate.

Esta story adiciona um tracker visual de spell slots direto na player view durante combate. Bolinhas preenchidas = slots disponiveis, bolinhas vazias = slots gastos. Um toque alterna o estado. O pattern visual segue o Death Save Tracker existente (dots de 3px com cores semanticas), garantindo consistencia visual.

**Filosofia:** NAO e um calculador automatico de slots por classe/nivel. O jogador configura manualmente quantos slots tem por nivel (uma vez, no setup do personagem) e marca/desmarca durante o jogo. Simplicidade radical — como riscar bolinhas numa ficha de papel.

---

## Decisoes de UX

**D1: Configuracao manual, nao automatica.** O jogador define seus max slots por nivel na tela de edicao do personagem (CharacterForm). Nao calculamos slots pela tabela de classe — isso seria complexo, fragil (multiclass, feats, itens magicos) e contrario a filosofia "so o essencial na mesa". O jogador sabe quantos slots tem.

**D2: Somente niveis com slots configurados aparecem.** Se o jogador so tem slots de nivel 1-3, so mostra 3 linhas. Zero poluicao visual. Cantrips (nivel 0) nao tem slots — nunca aparecem.

**D3: Layout em linhas dentro do PlayerBottomBar (mobile) e no card proprio (desktop).** Cada linha: label do nivel (ex: "1o"), seguido de N dots. Preenchido = disponivel (cor purple-400 como spell_save_dc), vazio = usado (border-only). Tap alterna. O bloco inteiro fica entre a HP bar e a area de death saves.

**D4: Botao "Long Rest" — reset all com um toque.** Icone de lua/descanso, posicionado no canto superior do bloco de slots. Tap + confirmacao rapida (nao modal — apenas undo toast de 3s). Reseta todos os slots para max.

**D5: Feedback tatil.** Ao marcar/desmarcar slot: `navigator.vibrate([50])` (micro-haptic). Ao resetar tudo: `navigator.vibrate([100, 50, 100])`. Consistente com o DeathSaveTracker.

**D6: Colapsavel no PlayerBottomBar.** O bloco de spell slots inicia colapsado (so mostra "Spell Slots ▸" com um resumo "3/4 | 2/3 | 1/2"). Tap expande para ver as bolinhas. Isso evita que o bottom bar fique enorme em mobile.

**D7: Desktop (PlayerInitiativeBoard) — sempre visivel.** No card do proprio personagem na initiative board (secao "Seu Personagem"), spell slots aparecem expandidos abaixo dos stats.

---

## Contexto Tecnico

### Schema atual — `player_characters`

```sql
-- Migrations 001 + 027 + 038 + 044
player_characters (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  race TEXT,
  class TEXT,
  level INTEGER,
  max_hp INTEGER NOT NULL,
  current_hp INTEGER,
  ac INTEGER NOT NULL,
  spell_save_dc INTEGER,
  notes TEXT,
  token_url TEXT,
  dm_notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Nao existe coluna `spell_slots`.** Precisa de migration nova.

### Formato JSONB para spell_slots

```typescript
// Tipo TypeScript
type SpellSlots = {
  [level: string]: { max: number; used: number };
};

// Exemplo persistido no banco
{
  "1": { "max": 4, "used": 2 },
  "2": { "max": 3, "used": 0 },
  "3": { "max": 2, "used": 1 }
}
```

### Componentes de referencia

**`DeathSaveTracker.tsx`** — Pattern visual identico:
- Dots de `w-3 h-3 rounded-full border`
- Preenchido: `bg-emerald-400 border-emerald-400` (sucesso) / `bg-red-400 border-red-400` (falha)
- Vazio: `bg-transparent border-muted-foreground/30`
- Bounce animation no dot recem-alterado: `scale-[1.3]` por 400ms
- Haptic feedback: `navigator.vibrate`

**`PlayerBottomBar.tsx`** — Container onde os slots aparecem:
- Fixed bottom, z-40, bg-black/90 backdrop-blur
- Ja tem: HP bar, death saves (condicional), condition badges, HP actions, end turn button
- Spell slots ficam entre HP actions e condition badges

**`CharacterForm.tsx`** — Onde o jogador configura max slots:
- Dialog com campos: nome, raca, classe, nivel, HP, AC, DC, notas
- Precisa adicionar secao "Spell Slots" no form

### Fluxo de dados

1. **Setup (uma vez):** Jogador edita personagem no CharacterForm → define max slots por nivel → salva no `player_characters.spell_slots` via Supabase
2. **Combate:** `PlayerJoinClient` carrega `spell_slots` do personagem → passa para `PlayerBottomBar` e `PlayerInitiativeBoard`
3. **Uso:** Jogador toca dot → update local state + debounced save no banco (300ms debounce)
4. **Long Rest:** Reset all `used` para 0 → save imediato

---

## Criterios de Aceite

### Configuracao (CharacterForm)

1. CharacterForm exibe secao "Spell Slots" com 9 linhas (niveis 1-9).
2. Cada linha tem: label do nivel, input numerico para max slots (0-30), botao +/- para ajuste rapido.
3. Niveis com max=0 nao sao salvos no JSONB (limpar do objeto).
4. Salvar persiste `spell_slots` como JSONB na coluna `player_characters.spell_slots`.
5. Reabrir CharacterForm carrega spell_slots existentes e preenche os campos.

### Visualizacao no Combate (PlayerBottomBar — mobile)

6. Bloco "Spell Slots" aparece colapsado por padrao abaixo da HP bar.
7. Resumo colapsado mostra slots restantes por nivel: "3/4 | 2/3 | 1/2".
8. Tap no resumo expande e mostra as bolinhas por nivel.
9. Somente niveis com max > 0 aparecem.
10. Cada nivel mostra: label "1o" / "2o" / etc + N dots horizontais.
11. Dot preenchido (purple-400) = slot disponivel. Dot vazio (border-only) = slot usado.

### Visualizacao no Combate (PlayerInitiativeBoard — desktop)

12. No card "Seu Personagem", spell slots aparecem expandidos abaixo dos stats (AC, HP, DC).
13. Mesmo layout de dots do mobile, sem estado colapsado.

### Interacao

14. Tap em dot disponivel → marca como usado (esvazia, animacao bounce).
15. Tap em dot usado → marca como disponivel (preenche, animacao bounce).
16. Haptic feedback (`navigator.vibrate([50])`) em cada toggle.
17. Alteracoes sao salvas no banco com debounce de 300ms.
18. Se offline (connectionStatus !== "connected"), alteracoes ficam em state local e sincronizam ao reconectar.

### Long Rest

19. Botao "Long Rest" (icone Moon) no canto do bloco de spell slots.
20. Tap reseta todos os `used` para 0.
21. Toast "Slots restaurados" com undo por 3s.
22. Haptic feedback `navigator.vibrate([100, 50, 100])`.
23. Save imediato no banco (sem debounce).

### i18n

24. Todas as strings em `messages/pt-BR.json` e `messages/en.json` no namespace `player`.
25. Chaves: `spell_slots_title`, `spell_slots_summary`, `spell_slots_long_rest`, `spell_slots_restored`, `spell_slots_undo`, `spell_slots_level` (com interpolacao `{level}`).

### Acessibilidade

26. Dots tem `role="checkbox"` e `aria-checked` correspondente.
27. Label acessivel: "Slot de nivel {N}, {disponivel|usado}".
28. Botao Long Rest tem `aria-label` descritivo.

---

## Abordagem Tecnica

### Passo 1: Migration — Adicionar coluna `spell_slots`

**`supabase/migrations/053_spell_slots_column.sql`:**

```sql
-- F-41: Add spell_slots JSONB column to player_characters
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS spell_slots JSONB DEFAULT NULL;

COMMENT ON COLUMN player_characters.spell_slots IS
  'Spell slot tracking: { "1": { "max": 4, "used": 2 }, ... }';
```

### Passo 2: Atualizar tipo TypeScript

**`lib/types/database.ts`** — adicionar ao tipo `PlayerCharacter`:

```typescript
spell_slots?: {
  [level: string]: { max: number; used: number };
} | null;
```

### Passo 3: Componente SpellSlotTracker

**`components/player/SpellSlotTracker.tsx`:**

```typescript
interface SpellSlotTrackerProps {
  spellSlots: Record<string, { max: number; used: number }>;
  onToggleSlot: (level: string, slotIndex: number) => void;
  onLongRest: () => void;
  /** Collapsed mode for mobile bottom bar */
  collapsible?: boolean;
  /** Read-only mode (e.g. spectator) */
  readOnly?: boolean;
}
```

Pattern de dots — reutilizar exatamente o style do DeathSaveTracker:

```tsx
// Dot individual
<button
  type="button"
  role="checkbox"
  aria-checked={!isUsed}
  aria-label={t("spell_slots_level_aria", { level, status: isUsed ? t("used") : t("available") })}
  onClick={() => onToggleSlot(level, index)}
  className={`w-3 h-3 rounded-full border transition-transform duration-200 ${
    isUsed
      ? "bg-transparent border-muted-foreground/30"
      : "bg-purple-400 border-purple-400"
  } ${isBouncing ? "scale-[1.3]" : ""}`}
/>
```

### Passo 4: Integrar no PlayerBottomBar

Adicionar entre `PlayerHpActions` e condition badges:

```tsx
{character.spellSlots && Object.keys(character.spellSlots).length > 0 && (
  <SpellSlotTracker
    spellSlots={character.spellSlots}
    onToggleSlot={handleToggleSlot}
    onLongRest={handleLongRest}
    collapsible
  />
)}
```

### Passo 5: Integrar no PlayerInitiativeBoard

No card "Seu Personagem", abaixo dos stats:

```tsx
{ownCharacter?.spell_slots && (
  <SpellSlotTracker
    spellSlots={ownCharacter.spell_slots}
    onToggleSlot={handleToggleSlot}
    onLongRest={handleLongRest}
    collapsible={false}
  />
)}
```

### Passo 6: Adicionar ao CharacterForm

Nova secao "Spell Slots" no dialog, com 9 linhas numéricas:

```tsx
<div className="space-y-2">
  <Label>{t("spell_slots_config_title")}</Label>
  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
    <div key={level} className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-8">{level}o</span>
      <Input
        type="number"
        min={0}
        max={30}
        value={formData.spellSlots?.[level]?.max ?? 0}
        onChange={(e) => updateSlotMax(level, parseInt(e.target.value) || 0)}
        className="w-16 h-8 text-center"
      />
    </div>
  ))}
</div>
```

### Passo 7: Debounced save

```typescript
// Em PlayerJoinClient ou hook dedicado
const saveSpellSlots = useDebouncedCallback(
  async (characterId: string, slots: SpellSlots) => {
    await supabase
      .from("player_characters")
      .update({ spell_slots: slots })
      .eq("id", characterId);
  },
  300
);
```

### Passo 8: i18n strings

**`messages/pt-BR.json`** (namespace `player`):
```json
"spell_slots_title": "Spell Slots",
"spell_slots_summary": "Spell Slots",
"spell_slots_long_rest": "Descanso Longo",
"spell_slots_restored": "Todos os slots restaurados!",
"spell_slots_undo": "Desfazer",
"spell_slots_level": "{level}o nivel",
"spell_slots_level_aria": "Slot de nivel {level}, {status}",
"spell_slots_available": "disponivel",
"spell_slots_used": "usado",
"spell_slots_config_title": "Spell Slots (por nivel)"
```

**`messages/en.json`** (namespace `player`):
```json
"spell_slots_title": "Spell Slots",
"spell_slots_summary": "Spell Slots",
"spell_slots_long_rest": "Long Rest",
"spell_slots_restored": "All slots restored!",
"spell_slots_undo": "Undo",
"spell_slots_level": "Level {level}",
"spell_slots_level_aria": "Level {level} slot, {status}",
"spell_slots_available": "available",
"spell_slots_used": "used",
"spell_slots_config_title": "Spell Slots (per level)"
```

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/migrations/053_spell_slots_column.sql` | **Criar** | Migration para coluna JSONB |
| `lib/types/database.ts` | Editar | Adicionar `spell_slots` ao tipo PlayerCharacter |
| `components/player/SpellSlotTracker.tsx` | **Criar** | Componente principal de bolinhas |
| `components/player/PlayerBottomBar.tsx` | Editar | Integrar SpellSlotTracker (colapsavel) |
| `components/player/PlayerInitiativeBoard.tsx` | Editar | Integrar SpellSlotTracker no card proprio |
| `components/character/CharacterForm.tsx` | Editar | Adicionar secao de configuracao de slots |
| `components/dashboard/PlayerCharacterManager.tsx` | Editar | Passar spell_slots nos dados do personagem |
| `components/player/PlayerJoinClient.tsx` | Editar | Carregar spell_slots, debounced save |
| `messages/pt-BR.json` | Editar | Strings i18n (namespace player) |
| `messages/en.json` | Editar | Strings i18n (namespace player) |

---

## Plano de Testes

### Testes Manuais

1. **Setup:** Criar personagem, configurar slots (ex: nivel 1=4, nivel 2=3, nivel 3=2). Salvar. Reabrir form e verificar valores persistidos.
2. **Mobile combat:** Entrar em combate, verificar bloco colapsado com resumo. Expandir, verificar dots corretos. Tap para gastar/recuperar. Verificar haptic.
3. **Desktop combat:** Verificar dots expandidos no card do personagem na initiative board.
4. **Long Rest:** Gastar alguns slots, clicar Long Rest, verificar reset. Testar undo.
5. **Sem slots:** Personagem sem spell_slots configurado — bloco nao aparece.
6. **Offline:** Desconectar rede, alterar slots, reconectar — verificar sync.
7. **Persistencia:** Alterar slots, recarregar pagina — verificar valores salvos.

### Testes Automatizados

```typescript
// SpellSlotTracker.test.tsx
describe("SpellSlotTracker", () => {
  it("renders dots for each configured level", () => { /* ... */ });
  it("shows filled dots for available slots and empty for used", () => { /* ... */ });
  it("toggles slot on click", () => { /* ... */ });
  it("calls onLongRest and resets all", () => { /* ... */ });
  it("renders collapsed summary in collapsible mode", () => { /* ... */ });
  it("expands on click in collapsible mode", () => { /* ... */ });
  it("does not render when spellSlots is empty", () => { /* ... */ });
  it("has correct aria attributes on dots", () => { /* ... */ });
});

// CharacterForm — adicionar testes para spell slots section
describe("CharacterForm spell slots", () => {
  it("renders 9 level inputs", () => { /* ... */ });
  it("saves non-zero slots to onSave callback", () => { /* ... */ });
  it("loads existing spell_slots into form", () => { /* ... */ });
});
```

---

## Notas de Paridade

| Modo | Aplica? | Justificativa |
|------|---------|---------------|
| **Guest (`/try`)** | NAO | Guest combat nao tem personagens persistentes. DM guest nao tem player_characters. |
| **Anonimo (`/join`)** | NAO | Player anonimo via session_token nao tem `player_characters` no banco. Nao tem CharacterForm. |
| **Autenticado (`/invite`)** | SIM | Unico modo com personagens persistentes (player_characters table). Feature Auth-only. |

**Nenhuma alteracao necessaria em `GuestCombatClient.tsx`.**

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Debounce pode perder ultimo save se usuario fechar aba | Media | Baixo | `beforeunload` flush do debounce pendente |
| JSONB muito grande com todos os niveis | Baixa | Baixo | Max 9 niveis x 2 campos = ~200 bytes. Irrelevante. |
| Conflito de save se jogador edita slots de duas abas | Baixa | Medio | Last-write-wins. Spell slots nao sao criticos — jogador corrige facilmente. |
| PlayerBottomBar fica muito alto no mobile com slots expandidos | Media | Medio | D6: colapsavel por padrao. Resumo inline ocupa 1 linha. |
| Migration em producao | Baixa | Baixo | ADD COLUMN com DEFAULT NULL — zero downtime, sem lock. |

---

## Definicao de Pronto

- [ ] Migration aplicada (local + staging)
- [ ] Tipo TypeScript atualizado com `spell_slots`
- [ ] `SpellSlotTracker` renderiza dots com toggle funcional
- [ ] Integrado no `PlayerBottomBar` (colapsavel, mobile)
- [ ] Integrado no `PlayerInitiativeBoard` (expandido, desktop)
- [ ] `CharacterForm` permite configurar max slots por nivel
- [ ] Debounced save funcional com flush em beforeunload
- [ ] Long Rest reseta todos os slots com undo toast
- [ ] Strings i18n em pt-BR e en
- [ ] Testes unitarios para SpellSlotTracker (render, toggle, long rest, a11y)
- [ ] Teste manual: fluxo completo setup → combate → uso → long rest → persistencia
- [ ] Nenhuma regressao no DeathSaveTracker ou PlayerBottomBar existente
- [ ] Build passa sem erros (`next build`)
