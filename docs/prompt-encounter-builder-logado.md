# Prompt — Encounter Builder na Área Logada do DM

## Contexto

O Pocket DM (pocketdm.com.br) é um combat tracker D&D 5e. Temos um Encounter Builder público (`/encounter-builder`) que funciona como calculadora de dificuldade com 1,100+ monstros SRD. Agora queremos trazer essa ferramenta para dentro da área logada do DM, integrada com campanhas.

### O que já existe
- **Encounter Builder público** (`components/public/PublicEncounterBuilder.tsx`) — calculadora de dificuldade com busca de monstros, tokens, XP thresholds, party size/level configurável
- **Campanhas** — tabela `campaigns` com `dm_id`, estrutura de membros via `campaign_members` com campo `level`
- **Combat Tracker** — sistema completo de combate com initiative, HP, dice roller, lair actions
- **Combat Store** (`lib/stores/combat-store.ts`) — Zustand store com `addMonster()`, `addCombatant()`
- **Starter Encounters** (`lib/data/starter-encounters.ts`) — presets de encontros prontos (se existir)
- **Sessões de combate** — tabela `combat_sessions` vinculada a campanhas
- **Compêndio de monstros** — busca SRD com tokens, stat blocks completos
- **Epic completo**: `docs/epic-encounter-builder-logado.md`

### Arquitetura do projeto
- Next.js 16 + TypeScript + Tailwind CSS + Supabase (auth + DB + realtime)
- Zustand para state management do combate
- next-intl para i18n (PT-BR + EN)
- shadcn/ui para componentes base
- Estética: dark theme, gold (#D4A853), Cinzel font

## O que implementar

### 1. Migration: `campaign_encounters` table

```sql
CREATE TABLE campaign_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  difficulty TEXT CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard', 'deadly')),
  monsters JSONB NOT NULL DEFAULT '[]', -- [{name, cr, count, slug, token_url}]
  party_size INT NOT NULL DEFAULT 4,
  party_level INT NOT NULL DEFAULT 1,
  total_xp INT NOT NULL DEFAULT 0,
  adjusted_xp INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  used_count INT DEFAULT 0
);

ALTER TABLE campaign_encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DM manages encounters" ON campaign_encounters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_encounters.campaign_id
      AND c.dm_id = auth.uid()
    )
  );

CREATE INDEX idx_campaign_encounters_campaign ON campaign_encounters(campaign_id);
```

### 2. Componentes

#### `components/campaign/CampaignEncounterBuilder.tsx`
- Reutiliza a lógica visual do `PublicEncounterBuilder` mas com features logadas:
  - Party size e level **automáticos** dos `campaign_members` (buscar via Supabase)
  - Override manual disponível
  - Botão "Salvar Encontro" que persiste em `campaign_encounters`
  - Botão "Iniciar Combate" que:
    1. Cria uma `combat_session`
    2. Adiciona monstros ao combat store com initiative rolls
    3. Adiciona PCs da campanha
    4. Redirect para `/app/session/[id]`

#### `components/campaign/CampaignEncounterList.tsx`
- Lista de encontros salvos da campanha
- Card por encontro: nome, difficulty badge (colorido), monstros (tokens pequenos), XP, data
- Ações: Editar, Duplicar, Iniciar Combate, Deletar
- Ordenação: mais recentes primeiro
- Empty state: "Nenhum encontro salvo. Crie um novo ou use os presets."

#### `components/campaign/CampaignEncounterPresets.tsx`
- Grid de presets temáticos (starter encounters)
- Cada preset: nome, tema, difficulty badge, monstros listados
- Botão "Usar como base" que preenche o builder com os monstros do preset
- Presets hardcoded em `lib/data/starter-encounters.ts`:
  - Goblin Ambush (Easy, 1-3): 4 Goblin + 1 Goblin Boss
  - Undead Crypt (Medium, 3-5): 6 Skeleton + 2 Zombie + 1 Ghoul
  - Bandit Camp (Medium, 2-4): 4 Bandit + 1 Bandit Captain
  - Dragon's Lair (Hard, 5-8): 1 Young Red Dragon
  - Forest Ambush (Easy, 1-3): 2 Wolf + 1 Dire Wolf
  - Cultist Hideout (Medium, 3-6): 3 Cultist + 1 Cult Fanatic
  - Giant's Den (Hard, 7-10): 1 Hill Giant + 2 Ogre
  - Lich's Sanctum (Deadly, 15+): 1 Lich + 4 Skeleton + 2 Zombie

### 3. Página

#### `app/app/campaigns/[id]/encounters/page.tsx`
- Tab "Encontros" no menu da campanha
- Layout: 
  - Tabs: "Meus Encontros" | "Novo Encontro" | "Presets"
  - "Meus Encontros": CampaignEncounterList
  - "Novo Encontro": CampaignEncounterBuilder
  - "Presets": CampaignEncounterPresets
- Protegida por auth (DM da campanha only)

### 4. Integração com Combat Tracker

O botão "Iniciar Combate" no encounter builder deve:

```typescript
async function startCombatFromEncounter(encounter: CampaignEncounter, campaignId: string) {
  // 1. Create combat session
  const { data: session } = await supabase
    .from('combat_sessions')
    .insert({ campaign_id: campaignId, status: 'active' })
    .select()
    .single();

  // 2. Add monsters to combat store
  for (const monster of encounter.monsters) {
    for (let i = 0; i < monster.count; i++) {
      combatStore.addMonster({
        name: monster.name,
        cr: monster.cr,
        slug: monster.slug,
        // ... monster data from SRD
      });
    }
  }

  // 3. Add PCs from campaign_members
  const { data: members } = await supabase
    .from('campaign_members')
    .select('*')
    .eq('campaign_id', campaignId);
  
  for (const member of members) {
    combatStore.addCombatant({
      name: member.character_name,
      type: 'pc',
      // ...
    });
  }

  // 4. Update encounter usage stats
  await supabase
    .from('campaign_encounters')
    .update({ used_at: new Date().toISOString(), used_count: encounter.used_count + 1 })
    .eq('id', encounter.id);

  // 5. Redirect
  router.push(`/app/session/${session.id}`);
}
```

## Regras

- **Combat Parity Rule**: Este é feature Auth-only (área logada do DM). Não precisa de paridade com Guest/Anon.
- **SRD Compliance**: Monstros vêm do mesmo `getSrdMonsters()` filtrado por whitelist — sem risco.
- **i18n**: Usar `useTranslations('encounters')` — adicionar keys em `messages/en.json` e `messages/pt-BR.json`.
- **RLS**: Apenas o DM da campanha pode CRUD nos encounters.
- **Responsive**: Mobile-first, mesma estética dark+gold do encounter builder público.

## Ordem de Implementação

1. Migration SQL
2. `lib/data/starter-encounters.ts` (presets data)
3. `CampaignEncounterBuilder.tsx` (reutilizando lógica do público)
4. `CampaignEncounterList.tsx`
5. `CampaignEncounterPresets.tsx`
6. Page route + navigation tab
7. Integração "Iniciar Combate"
8. Testes E2E

## Verificação

- [ ] Migration aplicada sem erros
- [ ] DM consegue criar encontro com monstros
- [ ] Party size/level vêm dos campaign_members automaticamente
- [ ] Encontro salvo persiste no DB
- [ ] Presets carregam corretamente
- [ ] "Iniciar Combate" cria sessão + popula monstros + PCs
- [ ] Redirect funciona pra sessão ativa
- [ ] Build passando, TS clean
