# PHQ-E5-F13 — Lista de Magias do Personagem

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Media
**Estimativa:** 5 SP
**Dependencia:** PHQ-E5-F12 (SpellSlotsHq existe), compendio de magias (SRD ja populado)
**Arquivos principais:** `components/player-hq/SpellListSection.tsx` (novo), `components/player-hq/SpellCard.tsx` (novo), `hooks/useCharacterSpells.ts` (novo), migration nova (character_spells table)

---

## Resumo

Alem de rastrear spell slots (quantos tenho), o jogador quer saber **quais magias tem** e consultar rapidamente o que elas fazem durante a sessao. "O que Fireball faz mesmo? Quantos metros de alcance?"

Esta story adiciona uma lista de magias ao personagem — vindas do compendio SRD ou adicionadas manualmente. O jogador marca quais magias estao preparadas, quais sao favoritas, e pode ver um resumo rapido de cada uma sem sair do app.

**Filosofia:** a lista de magias e complementar, nao obrigatoria. Um jogador que ja tem tudo no D&D Beyond pode ignorar completamente esta aba. Quem usa adiciona o que quiser.

---

## Decisoes de UX

**D1: Lista de magias na secao abaixo dos spell slots.** Na aba Resources, abaixo do SpellSlotsHq. Pode ser acessada tambem via sub-aba "Magias" se o layout ficar pesado.

**D2: Card de magia: nome + nivel + escola + tag de status.** Cada magia exibe: nome (bold) + nivel (badge "2o") + escola magica (Evocacao, Abjuracao...) + tags: "Preparada", "Favorita", "Concentracao". Tap expande o card para ver a descricao resumida.

**D3: Adicao via compendio SRD.** Botao "Adicionar Magia" abre search do compendio SRD filtrado por magias. Jogador busca, seleciona, magia e adicionada com dados pre-preenchidos (descricao, nivel, escola). Pode tambem adicionar manualmente (nome livre, nivel, sem descricao).

**D4: Filtros rapidos.** Chips de filtro no topo da lista: "Todas", "Preparadas", "Favoritas", "Por nivel". Essencial quando o personagem tem 20+ magias.

**D5: Status de preparacao e relevante para certos casters.** Wizards e Clerics preparam magias por dia. Druids idem. Bards e Sorcerers "conhecem" magias (sempre disponíveis). O app nao enforcea — deixa o jogador marcar como preferir.

**D6: Cantrips aparecem sem slot.** Magias de nivel 0 (Cantrips) tem badge "Cantrip" em vez de numero de nivel. Nao consomem spell slots, entao ficam separadas visualmente.

---

## Contexto Tecnico

### Nova tabela: character_spells

```sql
-- migration nova (apos 062)
CREATE TABLE character_spells (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id  UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  spell_name           TEXT NOT NULL,
  spell_level          INTEGER NOT NULL DEFAULT 0
    CHECK (spell_level BETWEEN 0 AND 9),
  school               TEXT,
  description_short    TEXT,
  compendium_ref       TEXT, -- slug do compendio SRD se vier de la
  status               TEXT NOT NULL DEFAULT 'known'
    CHECK (status IN ('known', 'prepared', 'favorite')),
  is_concentration     BOOLEAN DEFAULT false,
  is_ritual            BOOLEAN DEFAULT false,
  casting_time         TEXT,
  range_text           TEXT,
  components           TEXT,
  duration             TEXT,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_character_spells_character ON character_spells(player_character_id, spell_level);

ALTER TABLE character_spells ENABLE ROW LEVEL SECURITY;

CREATE POLICY character_spells_owner ON character_spells
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_character_id AND user_id = auth.uid()
    )
  );
```

### Hook useCharacterSpells

```typescript
export function useCharacterSpells(characterId: string) {
  const [spells, setSpells] = useState<CharacterSpell[]>([]);

  const addSpellFromCompendium = async (compendiumSpell: CompendiumEntry) => {
    // Mapear campos do compendio para character_spells
    await supabase.from('character_spells').insert({
      player_character_id: characterId,
      spell_name: compendiumSpell.name,
      spell_level: compendiumSpell.level ?? 0,
      school: compendiumSpell.school,
      description_short: compendiumSpell.content?.slice(0, 300),
      compendium_ref: compendiumSpell.slug,
      casting_time: compendiumSpell.casting_time,
      range_text: compendiumSpell.range,
      components: compendiumSpell.components,
      duration: compendiumSpell.duration,
      is_concentration: compendiumSpell.concentration ?? false,
      is_ritual: compendiumSpell.ritual ?? false,
    });
  };

  const addSpellManual = async (name: string, level: number) => { /* INSERT simples */ };
  const toggleStatus = async (spellId: string, status: SpellStatus) => { /* UPDATE */ };
  const removeSpell = async (spellId: string) => { /* DELETE */ };

  return { spells, addSpellFromCompendium, addSpellManual, toggleStatus, removeSpell };
}
```

### Integracao com compendio existente

O compendio SRD ja tem magias com dados completos (nivel, escola, descricao, etc.). Reutilizar a UI de busca do compendio ja existente, ou um subconjunto filtrado por `type = 'spell'`.

---

## Criterios de Aceite

### Lista de Magias

1. Secao "Minhas Magias" visivel na aba Resources abaixo dos spell slots.
2. Magias agrupadas por nivel (0 - Cantrips, 1o nivel, 2o nivel...).
3. Cada magia: nome + badge de nivel/cantrip + escola + tags de status.
4. Tag "Concentracao" visivel se `is_concentration = true`.
5. Tag "Ritual" visivel se `is_ritual = true`.
6. Empty state com CTA para adicionar primeira magia.

### Expansao de Card

7. Tap em magia expande o card com descricao curta.
8. Campos visiveis na expansao: Tempo de Conjuracao + Alcance + Componentes + Duracao.
9. Tap novamente colapsa.

### Adicao de Magia

10. Botao "Adicionar Magia" leva para search do compendio filtrado por magias.
11. Selecionar magia do compendio: dados pre-preenchidos automaticamente.
12. Opcao "Adicionar manualmente": apenas nome + nivel obrigatorios.
13. Magia aparece na lista imediatamente apos adicionar.

### Filtros

14. Chips: "Todas", "Preparadas", "Favoritas", "Cantrips".
15. Filtro por nivel: dropdown ou chips numericos (0, 1, 2...).
16. Filtros combinaveis (Preparadas + nivel 3).

### Marcar Status

17. Menu de tres pontos em cada magia: "Marcar como Preparada", "Marcar como Favorita", "Remover".
18. Marcacao alterna (tap novamente remove o status).
19. Status persiste no banco.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `supabase/migrations/063_character_spells.sql` | Criar | Tabela + RLS |
| `lib/types/database.ts` | Editar | Tipo CharacterSpell |
| `hooks/useCharacterSpells.ts` | Criar | CRUD |
| `components/player-hq/SpellListSection.tsx` | Criar | Lista agrupada com filtros |
| `components/player-hq/SpellCard.tsx` | Criar | Card expansivel da magia |
| `app/(authenticated)/campaign/[id]/resources/page.tsx` | Editar | Adicionar SpellListSection |
| `messages/pt-BR.json` | Editar | Strings de magias |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Adicionar "Fireball" do compendio: aparece no nivel 3 com escola "Evocacao".
2. Expandir card: mostra tempo de conjuracao, alcance etc.
3. Adicionar "Prestidigitation" manualmente: aparece como Cantrip (nivel 0).
4. Marcar "Fireball" como Preparada: tag aparece.
5. Filtro "Preparadas": somente Fireball visivel.
6. Remover magia: some da lista.
7. 15 magias: agrupamento por nivel funciona corretamente.

---

## Definicao de Pronto

- [ ] Migration character_spells criada e aplicada
- [ ] useCharacterSpells CRUD funcionando
- [ ] SpellListSection com agrupamento por nivel + filtros
- [ ] SpellCard com expansao e tags de status
- [ ] Adicao via compendio e manual
- [ ] Build sem erros
