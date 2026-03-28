# Spec Sprint M2 — Campaign Experience

**Sprint:** M2 — Campaign Experience (3-5 dias)
**Objetivo:** Transformar a tela de campanha no hub central do mestre

---

## M2.1 — Quick-Access a Players durante Combate

### Problema
Durante o combate, o mestre precisa consultar informações dos jogadores (notas, stats persistentes) sem sair da tela de combate.

### Solução — Drawer Lateral

**Trigger:**
- Botão "Players" na toolbar do combate (ao lado de "Oracle", "Dice")
- Ícone: `Users` (Lucide)
- Badge com número de PCs na campanha

**Drawer:**
- Desliza da direita (padrão mobile)
- Overlay semi-transparente no combate
- Lista de player characters da campanha vinculada à sessão
- Para cada PC:
  - Nome + classe (se disponível)
  - HP atual / max HP (barra colorida com tiers existentes)
  - AC badge
  - Notas do mestre (dm_notes) — editável inline
  - Condições ativas (se em combate)
- Swipe right ou tap no overlay para fechar

**Comportamento:**
- Dados vêm da tabela `player_characters` WHERE `campaign_id` = campanha da sessão atual
- Se a sessão não tem campanha vinculada, botão fica disabled/hidden
- Edições nas notas fazem auto-save (mesmo debounce da spec M1.2)

**Arquivos novos:**
- `components/combat/PlayerDrawer.tsx`

**Arquivos a modificar:**
- `components/combat/CombatToolbar.tsx` (ou equivalente) — adicionar botão trigger
- `components/session/*` — passar campaign_id para o drawer

### Critérios de Aceite
- [ ] Botão "Players" visível na toolbar do combate
- [ ] Drawer abre com lista de PCs
- [ ] Notas editáveis inline no drawer
- [ ] Auto-save funciona
- [ ] Drawer fecha com tap fora ou swipe
- [ ] Funciona em mobile (393px+)
- [ ] Não interfere com o fluxo do combate

---

## M2.2 — Notas de Campanha

### Problema
O mestre precisa de um lugar para anotar informações da campanha que não são específicas de um jogador ou sessão.

### Solução — Seção de Notas na Tela de Campanha

**Schema:**
```sql
-- migration: 030_campaign_notes.sql
CREATE TABLE campaign_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, id)
);

CREATE INDEX idx_campaign_notes_campaign ON campaign_notes(campaign_id);

-- RLS
ALTER TABLE campaign_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DM can manage own campaign notes"
ON campaign_notes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_notes.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);
```

**UI:**
- Seção "Notas" na tela de campanha (`/app/campaigns/[id]`)
- Botão "+ Nova nota"
- Lista de notas com título + preview do conteúdo
- Click para expandir/editar
- Delete com confirmação
- Ordenadas por `updated_at DESC`

**Layout:**
- Cards colapsáveis
- Título editável inline
- Conteúdo: textarea com auto-resize
- Auto-save com debounce 800ms

### Critérios de Aceite
- [ ] Criar, ler, editar, deletar notas de campanha
- [ ] Notas ordenadas por última edição
- [ ] Auto-save funciona
- [ ] RLS: apenas DM da campanha acessa
- [ ] Mobile-friendly (cards full-width)

---

## M2.3 — Histórico de Combates na Campanha

### Problema
O mestre quer ver o histórico de combates anteriores da campanha, com dados básicos de cada um.

### Solução — Seção "Combates Anteriores"

**Dados disponíveis (já existem no DB):**
- `sessions` → `encounters` → `combatants`
- Sessions vinculadas à campanha via `campaign_id`
- Encounters com `is_active`, `round_number`, `created_at`
- Combatants com nome, HP, is_defeated, is_player

**UI:**
- Seção "Combates" na tela de campanha
- Lista de encounters finalizadas (is_active=false)
- Para cada encounter:
  - Nome + data
  - Rounds totais
  - Combatentes (resumo: "4 PCs vs 3 monstros")
  - Resultado (quantos monstros derrotados, PCs que caíram)
- Colapsável — click para ver detalhes
- Paginação: 10 por vez, load more

**Query:**
```sql
SELECT
  e.id, e.name, e.round_number, e.created_at,
  s.name as session_name,
  COUNT(c.id) FILTER (WHERE c.is_player) as pc_count,
  COUNT(c.id) FILTER (WHERE NOT c.is_player) as monster_count,
  COUNT(c.id) FILTER (WHERE c.is_defeated AND NOT c.is_player) as monsters_defeated,
  COUNT(c.id) FILTER (WHERE c.is_defeated AND c.is_player) as pcs_downed
FROM encounters e
JOIN sessions s ON s.id = e.session_id
LEFT JOIN combatants c ON c.encounter_id = e.id
WHERE s.campaign_id = $1
  AND e.is_active = false
GROUP BY e.id, s.name
ORDER BY e.created_at DESC
LIMIT 10 OFFSET $2;
```

### Critérios de Aceite
- [ ] Lista de combates finalizados na tela da campanha
- [ ] Dados corretos (rounds, combatentes, resultado)
- [ ] Paginação funcional
- [ ] Performance ok com 50+ encounters
- [ ] Mobile-friendly

---

## M2.4 — Polish da Tela de Campanha

### Problema
A tela de campanha atual é funcional mas básica. Com as novas seções, precisa de layout coerente.

### Solução — Layout reorganizado

**Estrutura da página `/app/campaigns/[id]`:**

```
┌─────────────────────────────┐
│ Campaign Name    [Edit] [⚙] │
├─────────────────────────────┤
│ 📊 Resumo                   │
│ 4 jogadores · 12 sessões    │
│ Último combate: 2 dias atrás│
├─────────────────────────────┤
│ 👥 Jogadores                │
│ [PlayerCharacterManager]    │
│ (com dm_notes visíveis)     │
├─────────────────────────────┤
│ 📝 Notas da Campanha        │
│ [CampaignNotes]             │
├─────────────────────────────┤
│ ⚔️ Combates Anteriores      │
│ [EncounterHistory]          │
└─────────────────────────────┘
```

**Mobile:** Seções como accordion/tabs para não sobrecarregar scroll
**Desktop:** Pode usar layout 2-col (players + notes lado a lado)

### Critérios de Aceite
- [ ] Layout consistente com design system RPG existente
- [ ] Seções colapsáveis no mobile
- [ ] Navegação fluida entre seções
- [ ] Stats resumidos no topo
- [ ] Consistente com visual do dashboard

---

## Arquivos Novos (Sprint M2)

1. `components/combat/PlayerDrawer.tsx` — drawer de players no combate
2. `components/campaign/CampaignNotes.tsx` — notas de campanha
3. `components/campaign/EncounterHistory.tsx` — histórico de combates
4. `supabase/migrations/030_campaign_notes.sql` — tabela de notas

## Arquivos a Modificar

1. `app/app/campaigns/[id]/page.tsx` — layout expandido
2. `components/dashboard/PlayerCharacterManager.tsx` — integrar dm_notes (da M1.2)
3. `lib/types/database.ts` — tipos para campaign_notes
4. Toolbar do combate — botão Players

---

*Specs geradas por: Architect + UX Designer + PM (party mode)*
