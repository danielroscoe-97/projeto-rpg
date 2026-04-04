# Epic — Encounter Builder na Area Logada do DM

## Visao

Transformar o Encounter Builder publico (calculadora de dificuldade) em uma ferramenta completa dentro da area logada do DM, integrada com campanhas, sessoes e o combat tracker. O DM pode planejar encontros com calma, salvar presets, selecionar quais players participam, e iniciar combate diretamente — passando por uma staging area de revisao antes de confirmar. Paralelamente, construir o pipeline de coleta de dados pos-combate que alimentara a futura **Metodologia Pocket DM** de calculo de dificuldade.

## Contexto

### O que ja existe
- **Encounter Builder publico** (`/encounter-builder`) — calculadora de dificuldade com 1,100+ monstros SRD, XP thresholds, party size/level
- **Combat Tracker** — sistema de combate completo com initiative, HP tracking, lair actions, dice roller
- **Campanhas** — estrutura de campanhas com membros, sessoes, mind map
- **Monstros no combate** — busca e adicao de monstros SRD ao combate
- **Votacao de dificuldade** — jogadores votam 1-5 pos-combate (`encounter_votes`, `difficulty_rating` na tabela `encounters`)
- **Combat Reports** — analytics estilo Spotify Wrapped com awards, narratives, stats (`combat_reports` table)
- **Combat Stats** — `computeCombatStats()` agrega dano, cura, crits, turn times por combatente

### O que falta
- Salvar encontros planejados como presets por campanha
- Selecao de players (pre-carregados da campanha, com toggle individual)
- Staging area (pre-combate) para revisar preset antes de iniciar
- Dois modos de inicio de combate: Light (atual) e Full (via builder)
- Snapshot pos-combate com dados reais do encontro
- Rating de dificuldade do DM (complementar ao dos jogadores)
- Data quality flags para integridade do dataset
- Pipeline de dados para a futura Metodologia Pocket DM

## Features

### F-01: Encounter Builder dentro da Campanha
**Rota**: `/app/campaigns/[id]/encounters`

**UI**: Tab "Encontros" no menu da campanha (ao lado de Sessoes, Mind Map, etc.)

**Funcionalidades**:
- Mesma calculadora de dificuldade do publico, mas com dados da campanha
- **Selecao de players**: pre-carrega todos os `campaign_members` ativos com avatar/icone + nome + nivel + classe
  - Toggle/checkbox por player — todos marcados por padrao
  - DM desmarca quem nao participa (player faltou, grupo dividido, etc.)
  - Calculo de dificuldade recalcula automaticamente ao mudar selecao
  - Dados de nivel/classe lidos em tempo real do `campaign_members` (nao snapshotados no preset)
  - Preset salva apenas o array de `campaign_member_id`s selecionados
- Override manual se necessario (para guests/NPCs temporarios)
- Busca de monstros com autocomplete do compendium + adicao manual
- **Barra de dificuldade visual** como elemento hero: Easy (verde) > Medium (amarelo) > Hard (laranja) > Deadly (vermelho), atualiza em tempo real
- **Salvar encontro** com nome (auto-suggest baseado nos monstros, ex: "2x Goblin + 1x Bugbear") e notas do DM
- **Lista de encontros salvos** com difficulty badge, data, notas

### F-02: Presets de Encontro
**Conceito**: Encontros pre-montados que o DM pode reutilizar

**Tipos de preset**:
1. **Pessoais** — criados pelo DM, salvos na campanha
2. **Starter Pack** — presets prontos para DMs iniciantes (goblin ambush, dragon lair, undead crypt, etc.)
3. **Baseados em sessao** — "Repetir encontro da sessao X" (puxa dados do snapshot)

**Naming**: Nome obrigatorio, mas com placeholder auto-gerado baseado nos monstros (ex: "2x Goblin + 1x Bugbear"). DM pode dar nome tematico ("Emboscada na Floresta") ou aceitar o sugerido.

### F-03: Iniciar Combate do Encounter Builder (Staging Area)

**Dois modos de inicio de combate**:

1. **Light mode** (atual, padrao) — DM vai direto pro combat tracker, adiciona monstros on-the-fly, inicia rapido. Nenhuma mudanca necessaria no fluxo existente.
2. **Full mode** (via Encounter Builder) — DM seleciona preset > vai pra staging area > revisa/edita > confirma inicio

**Fluxo Full mode**:
1. DM monta ou seleciona um preset no Encounter Builder
2. Clica "Iniciar Combate"
3. Redirect para **staging area** (pagina de pre-combate) com o preset pre-carregado
4. DM revisa: players selecionados, monstros, dificuldade calculada
5. DM pode editar (adicionar/remover monstros, mudar selecao de players)
6. Clica "Confirmar e Iniciar" — monstros e PCs sao adicionados ao combat tracker com initiative rolls
7. Redirect para a sessao de combate ativa

**Staging area**: pode ser a mesma tela de pre-combate para ambos os modos. O preset apenas pre-popula os dados. A partir dali, fluxo normal.

**Integracao com Combat Store**:
- `combat-store.ts` ja tem `addMonster()` — reutilizar
- Novos monstros recebem initiative roll automatico
- PCs puxam initiative do jogador (ou roll automatico se ausente)

**Discovery**: CTAs ao longo da navegacao guiam o DM para o builder
- Pos-combate: "Salvar esse encontro como preset?"
- Lista de sessoes: "Planejar proximo encontro"
- Dashboard da campanha: card de atalho para Encounter Builder

### F-04: Snapshot Pos-Combate e Rating do DM

**Conceito**: Captura automatica do estado real do encontro ao encerrar combate + feedback do DM

**Snapshot automatico** (capturado ao encerrar qualquer combate, light ou full mode):
- **Quem lutou**: players com nivel e classe **snapshotados no momento do combate** (diferente do preset que le em tempo real)
- **Contra o que**: todos os monstros que estavam no combate (incluindo adicionados on-the-fly, nao so do preset)
- **Origem**: veio de preset (FK) ou foi montado no light mode?
- **Duracao**: timestamp de inicio e fim do combate
- **Resultado**: vitoria, TPK, fuga, DM encerrou manualmente
- **Ratings dos jogadores**: votacao que ja existe (1-5 via `encounter_votes`)
- **Rating do DM**: novo campo de dificuldade percebida pelo mestre (1-5, mesma escala)
- **Notas do DM**: campo texto opcional para contexto ("rolaram muito mal", "peguei leve", "usaram magia OP")

**Rating do DM na UX**:
- Aparece na **mesma tela de encerramento** junto com o resumo/recap
- Barra de dificuldade 1-5, campo de notas opcional, botao "Salvar"
- Se o DM ignorar, tudo bem — snapshot dos participantes ja foi capturado automaticamente
- O rating e bonus valioso, nao obrigatorio

**Data quality flags** (salvos no snapshot):
- `has_manual_creatures`: boolean — tinha monstro/NPC inserido manualmente (sem slug)?
- `has_unknown_cr`: boolean — algum monstro sem CR definido?
- `has_incomplete_party`: boolean — algum player sem classe ou nivel?
- `preset_origin_id`: UUID nullable — FK pro preset de origem, se aplicavel
- `was_modified_from_preset`: boolean — DM editou na staging area?

**Integracao com dados existentes**:
- Verificar schema existente de `encounters`, `combatants`, e `combat_reports` antes de criar tabelas novas
- Pode ser extensao da tabela `encounters` ou `combat_reports` em vez de tabela separada — evitar duplicacao
- O `combat_reports.report_data` JSONB ja contem stats; o snapshot adiciona contexto de composicao + ratings

### F-05: Starter Encounters (Presets Prontos)
**Conceito**: Pack inicial de encontros tematicos para DMs novos

**Temas**:
1. **Goblin Ambush** (Easy, nivel 1-3) — 4 Goblins + 1 Goblin Boss
2. **Undead Crypt** (Medium, nivel 3-5) — 6 Skeletons + 2 Zombies + 1 Ghoul
3. **Bandit Camp** (Medium, nivel 2-4) — 4 Bandits + 1 Bandit Captain
4. **Dragon's Lair** (Hard, nivel 5-8) — 1 Young Red Dragon
5. **Forest Ambush** (Easy, nivel 1-3) — 2 Wolves + 1 Dire Wolf
6. **Cultist Hideout** (Medium, nivel 3-6) — 3 Cultists + 1 Cult Fanatic
7. **Giant's Den** (Hard, nivel 7-10) — 1 Hill Giant + 2 Ogres
8. **Lich's Sanctum** (Deadly, nivel 15+) — 1 Lich + 4 Skeletons + 2 Zombies

**Implementacao**: JSON estatico em `lib/data/starter-encounters.ts`

### F-06: Metodologia Pocket DM (Futuro — Beta)

**Conceito**: Calculo de dificuldade proprietario baseado em dados reais de combates da plataforma, nao nas tabelas do DMG/5e.

**Visao de futuro**:
- Cruzar snapshots pos-combate com ratings de jogadores E do DM
- Identificar padroes: "Encontros com party de 3 players tendem a ser votados como mais dificeis que o CR sugere"
- Considerar composicao de party (classes, niveis), nao so quantidade e nivel medio
- Ponderar data quality flags: snapshots com `has_manual_creatures = true` tem peso menor na analise
- A longo prazo: modelo preditivo que sugere dificuldade real baseado no historico da plataforma

**Status atual**: Nao implementar analise/modelo agora. O que precisa existir agora:
1. Schema de snapshots e ratings preparado para coleta (F-04)
2. Label "Pocket DM (Beta)" no builder como placeholder para o metodo futuro
3. Coleta de dados comecando imediatamente — cada combate sem snapshot e dado perdido

**Diferenciais competitivos**:
- Nenhum concorrente tem combate integrado com votacao de dificuldade em tempo real
- O dataset cresce organicamente com o uso da plataforma
- Permite refinar dificuldade por composicao de party, nao so por level medio

## Arquitetura

### Schema SQL

```sql
-- Presets de encontro salvos pelo DM
CREATE TABLE encounter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  difficulty TEXT, -- easy/medium/hard/deadly (calculado no save)
  total_xp INT,
  adjusted_xp INT,
  selected_members UUID[], -- array de campaign_member_ids selecionados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ, -- ultima vez usado em combate
  used_count INT DEFAULT 0
);

-- Criaturas de cada preset (junction table)
CREATE TABLE encounter_preset_creatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID REFERENCES encounter_presets(id) ON DELETE CASCADE,
  monster_slug TEXT, -- null se manual
  name TEXT NOT NULL, -- nome do monstro ou criatura manual
  cr TEXT, -- challenge rating (pode ser null pra manuais)
  quantity INT NOT NULL DEFAULT 1,
  source TEXT, -- 'srd', 'srd-2024', 'mad', 'manual'
  sort_order INT DEFAULT 0
);

-- Snapshot pos-combate (pode ser extensao de encounters/combat_reports — avaliar)
-- Campos a adicionar na tabela encounters ou em tabela dedicada:
--   dm_difficulty_rating SMALLINT CHECK (dm_difficulty_rating BETWEEN 1 AND 5)
--   dm_notes TEXT
--   has_manual_creatures BOOLEAN DEFAULT false
--   has_unknown_cr BOOLEAN DEFAULT false
--   has_incomplete_party BOOLEAN DEFAULT false
--   preset_origin_id UUID REFERENCES encounter_presets(id) ON DELETE SET NULL
--   was_modified_from_preset BOOLEAN DEFAULT false
--   party_snapshot JSONB -- [{member_id, name, level, class, race}]
--   creatures_snapshot JSONB -- [{name, cr, slug, source, quantity}]
--   combat_result TEXT -- 'victory', 'tpk', 'fled', 'dm_ended'
--   started_at TIMESTAMPTZ
--   ended_at TIMESTAMPTZ

-- RLS: DM da campanha pode CRUD presets
CREATE POLICY "DM manages encounter presets" ON encounter_presets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = encounter_presets.campaign_id
      AND c.dm_id = auth.uid()
    )
  );

CREATE POLICY "DM manages preset creatures" ON encounter_preset_creatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM encounter_presets ep
      JOIN campaigns c ON c.id = ep.campaign_id
      WHERE ep.id = encounter_preset_creatures.preset_id
      AND c.dm_id = auth.uid()
    )
  );
```

### Componentes Novos
```
components/campaign/
  CampaignEncounterBuilder.tsx   — versao logada (reutiliza PublicEncounterBuilder internals)
  CampaignEncounterList.tsx      — lista de encontros salvos com difficulty badge
  CampaignEncounterPresets.tsx   — presets starter + pessoais
  EncounterPlayerSelector.tsx    — roster de players com checkboxes (avatar + nome + nivel + classe)
  EncounterStagingArea.tsx       — tela de pre-combate para revisar preset antes de iniciar
  EncounterDifficultyBar.tsx     — barra hero Easy>Medium>Hard>Deadly com calculo tempo real
  DmPostCombatFeedback.tsx       — rating do DM + notas no encerramento do combate
```

### Fluxo de Dados
```
Campaign --> campaign_members (party roster + levels + classes)
         --> encounter_presets + encounter_preset_creatures (encontros planejados)
         --> EncounterStagingArea (revisao pre-combate)
         --> combat sessions (inicio do combate)
         --> encounter snapshot (captura automatica ao encerrar)
         --> encounter_votes (rating jogadores) + dm_difficulty_rating (rating DM)
         --> combat_reports (analytics pos-combate)
         --> [FUTURO] Metodologia Pocket DM (analise agregada do dataset)
```

### Dois Modos de Inicio de Combate
```
LIGHT MODE (padrao, existente):
  DM abre combat tracker --> adiciona monstros on-the-fly --> inicia combate

FULL MODE (via Encounter Builder):
  DM abre Encounter Builder --> monta/seleciona preset --> "Iniciar Combate"
  --> Staging Area (pre-combate) --> revisa/edita --> "Confirmar e Iniciar"
  --> Combat tracker com tudo pre-carregado
```

### Migrations Necessarias
1. `encounter_presets` table + RLS
2. `encounter_preset_creatures` table + RLS
3. Campos de snapshot na tabela `encounters` (ou tabela dedicada — avaliar duplicacao com `combat_reports`)
4. `dm_difficulty_rating` + `dm_notes` na tabela `encounters`
5. `campaign_members.level` e `campaign_members.class` (verificar se existem)

## Priorizacao

| # | Feature | Esforco | Valor | Prioridade | Notas |
|---|---------|---------|-------|------------|-------|
| 1 | F-01 Builder na campanha + selecao de players | Medio | Alto | P0 | Core do builder |
| 2 | F-02 Salvar presets | Baixo | Alto | P0 | Depende de F-01 |
| 3 | F-03 Staging area + iniciar combate | Medio | Alto | P0 | Fluxo principal |
| 4 | F-04 Snapshot pos-combate + rating DM | Medio | Muito Alto | P0 | Cada combate sem snapshot = dado perdido |
| 5 | F-05 Starter presets | Baixo | Medio | P1 | DMs iniciantes |
| 6 | F-06 Metodologia Pocket DM | Alto | Muito Alto | P2 (futuro) | Depende de volume de dados de F-04 |

## Notas

- O Encounter Builder publico continua existindo como ferramenta SEO gratuita
- A versao logada REUTILIZA os mesmos componentes visuais, apenas adiciona: save, presets, selecao de players, staging area, e start combat
- Guest mode NAO tem encounter builder logado (e feature logada)
- Dados dos encontros sao por campanha, nao globais
- O **light mode** de inicio de combate NAO muda — continua como padrao
- O builder e uma **power-user feature**: quem nao quer usar, nunca precisa saber que existe
- **F-04 e P0** mesmo sendo "coleta para o futuro" — a coleta precisa comecar imediatamente porque cada combate sem captura e dado perdido para a Metodologia Pocket DM
- CTAs de discovery (pos-combate, lista de sessoes, dashboard) guiam o DM pro builder sem forcar
- DM pode criar presets para grupo dividido: "Encontro Grupo A (3 players)" e "Encontro Grupo B (2 players)"
