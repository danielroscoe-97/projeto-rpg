# Epic — Encounter Builder na Área Logada do DM

## Visão

Transformar o Encounter Builder público (calculadora de dificuldade) em uma ferramenta completa dentro da área logada do DM, integrada com campanhas, sessões e o combat tracker. O DM pode planejar encontros, salvar presets, e iniciar combate diretamente da calculadora.

## Contexto

### O que já existe
- **Encounter Builder público** (`/encounter-builder`) — calculadora de dificuldade com 1,100+ monstros SRD, XP thresholds, party size/level
- **Combat Tracker** — sistema de combate completo com initiative, HP tracking, lair actions, dice roller
- **Campanhas** — estrutura de campanhas com membros, sessões, mind map
- **Monstros no combate** — busca e adição de monstros SRD ao combate

### O que falta
- Salvar encontros planejados
- Presets de encontros por campanha
- Party level automático dos PCs da campanha
- Iniciar combate direto do encounter builder
- Histórico de encontros (quais monstros foram usados em sessões passadas)

## Features

### F-01: Encounter Builder dentro da Campanha
**Rota**: `/app/campaigns/[id]/encounters`

**UI**: Tab "Encontros" no menu da campanha (ao lado de Sessões, Mind Map, etc.)

**Funcionalidades**:
- Mesma calculadora de dificuldade do público, mas com dados da campanha
- Party size e level **automáticos** dos PCs cadastrados na campanha (campaign_members com level)
- Override manual se necessário (para guests/NPCs temporários)
- Busca de monstros com tokens (igual ao público)
- **Salvar encontro** com nome e notas do DM
- **Lista de encontros salvos** com difficulty badge, data, notas

### F-02: Presets de Encontro
**Conceito**: Encontros pré-montados que o DM pode reutilizar

**Tipos de preset**:
1. **Pessoais** — criados pelo DM, salvos na campanha
2. **Starter Pack** — presets prontos para DMs iniciantes (goblin ambush, dragon lair, undead crypt, etc.)
3. **Baseados em sessão** — "Repetir encontro da sessão X"

**Schema sugerido**:
```sql
CREATE TABLE campaign_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  difficulty TEXT, -- easy/medium/hard/deadly
  monsters JSONB NOT NULL, -- [{name, cr, count, slug}]
  party_size INT,
  party_level INT,
  total_xp INT,
  adjusted_xp INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ, -- last time used in combat
  used_count INT DEFAULT 0
);

-- RLS: DM da campanha pode CRUD
CREATE POLICY "DM manages encounters" ON campaign_encounters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_encounters.campaign_id
      AND c.dm_id = auth.uid()
    )
  );
```

### F-03: Iniciar Combate do Encounter Builder
**Fluxo**:
1. DM monta o encontro na calculadora
2. Clica "Iniciar Combate" (ou "Start Combat")
3. Monstros são adicionados automaticamente ao combat tracker com initiative rolls
4. PCs da campanha são adicionados automaticamente
5. Redirect para a sessão de combate ativa

**Integração com Combat Store**:
- `combat-store.ts` já tem `addMonster()` — reutilizar
- Novos monstros recebem initiative roll automático
- PCs puxam initiative do jogador (ou roll automático se ausente)

### F-04: Histórico de Encontros
**Conceito**: Depois que um combate termina, registrar quais monstros foram usados

**Dados**:
- Quais monstros, quantos de cada
- Resultado (TPK, vitória, fuga)
- XP ganho
- Duração do combate
- Link para o combat recap (se existir)

**UI**: Timeline na aba de Encontros mostrando encontros passados com badges de resultado

### F-05: Starter Encounters (Presets Prontos)
**Conceito**: Pack inicial de encontros temáticos para DMs novos

**Temas**:
1. **Goblin Ambush** (Easy, nível 1-3) — 4 Goblins + 1 Goblin Boss
2. **Undead Crypt** (Medium, nível 3-5) — 6 Skeletons + 2 Zombies + 1 Ghoul
3. **Bandit Camp** (Medium, nível 2-4) — 4 Bandits + 1 Bandit Captain
4. **Dragon's Lair** (Hard, nível 5-8) — 1 Young Red Dragon
5. **Forest Ambush** (Easy, nível 1-3) — 2 Wolves + 1 Dire Wolf
6. **Cultist Hideout** (Medium, nível 3-6) — 3 Cultists + 1 Cult Fanatic
7. **Giant's Den** (Hard, nível 7-10) — 1 Hill Giant + 2 Ogres
8. **Lich's Sanctum** (Deadly, nível 15+) — 1 Lich + 4 Skeletons + 2 Zombies

**Implementação**: JSON estático em `lib/data/starter-encounters.ts` — já existe o arquivo

## Arquitetura

### Componentes Novos
```
components/campaign/
  CampaignEncounterBuilder.tsx  — versão logada (reutiliza PublicEncounterBuilder internals)
  CampaignEncounterList.tsx     — lista de encontros salvos
  CampaignEncounterPresets.tsx  — presets starter + pessoais
  StartCombatFromEncounter.tsx  — botão que cria sessão + adiciona monstros
```

### Fluxo de Dados
```
Campaign → campaign_members (party size + levels)
         → campaign_encounters (saved encounters)
         → combat sessions (initiated from encounter)
         → combat_reports (histórico pós-combate)
```

### Migrations
1. `campaign_encounters` table + RLS
2. `campaign_members.level` column (se não existir)
3. `combat_reports.encounter_id` FK (se quiser linkar)

## Priorização

| # | Feature | Esforço | Valor | Prioridade |
|---|---------|---------|-------|------------|
| 1 | F-01 Builder na campanha | Médio | Alto | P0 |
| 2 | F-02 Salvar encontros | Baixo | Alto | P0 |
| 3 | F-05 Starter presets | Baixo | Médio | P1 |
| 4 | F-03 Iniciar combate direto | Médio | Alto | P1 |
| 5 | F-04 Histórico | Médio | Médio | P2 |

## Notas

- O Encounter Builder público continua existindo como ferramenta SEO gratuita
- A versão logada REUTILIZA os mesmos componentes visuais, apenas adiciona: save, presets, auto party data, e start combat
- Guest mode NÃO tem encounter builder (é feature logada)
- Dados dos encontros são por campanha, não globais
