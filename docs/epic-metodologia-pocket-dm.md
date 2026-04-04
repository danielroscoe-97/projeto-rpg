# Epic — Metodologia Pocket DM: Calculo de Dificuldade Proprietario

## Visao

Criar um sistema proprietario de calculo de dificuldade de encontros baseado em **dados reais de combates** da plataforma Pocket DM, substituindo (ou complementando) as tabelas estaticas do DMG 5e que todo DM sabe que sao imprecisas.

A Metodologia Pocket DM cruza:
- **O que aconteceu**: composicao real do encontro (monstros x party)
- **Como foi percebido**: ratings de dificuldade dos jogadores E do mestre
- **Contexto da party**: classes, niveis, tamanho do grupo, combinacoes especificas
- **Qualidade dos dados**: flags de monstros manuais, encontros de teste, dados incompletos

O resultado e um **indice de dificuldade preditivo** que aprende com cada combate rodado na plataforma e fica mais preciso com o tempo.

## Por que isso importa

### O problema
A tabela de dificuldade do DMG (2014) usa XP thresholds estaticos que:
- Nao consideram composicao de party (4 fighters lv5 ≠ 2 fighters + wizard + cleric lv5)
- Nao consideram sinergia entre monstros
- Sao calibrados pra "party media" que nao existe
- O multiplicador de grupo e grosseiro (1x, 1.5x, 2x, 2.5x, 3x, 4x)
- A versao 2024 (CR budget) melhorou mas ainda e estatica

### A oportunidade
Nenhum concorrente tem:
1. **Combate integrado** com votacao de dificuldade em tempo real
2. **Dados de composicao** (quais classes/niveis estavam na party)
3. **Dupla perspectiva** (DM + jogadores votam separadamente)
4. **Volume crescente** organico — cada sessao alimenta o modelo

Isso e o **moat** do Pocket DM. Kobold Fight Club, D&D Beyond, Improved Initiative — nenhum coleta esses dados.

## Premissas e Restricoes

### Dados disponiveis (ja coletados ou em coleta via Sprint 3)
- `encounter_snapshots`: party_snapshot JSONB, creatures_snapshot JSONB
- `encounter_votes`: rating individual de cada jogador (1-5)
- `encounters.difficulty_rating`: media dos votos dos jogadores
- `encounters.dm_difficulty_rating`: percepcao do mestre (1-5)
- `encounters.dm_notes`: contexto qualitativo do mestre
- `combat_reports.report_data`: stats do combate (dano, rounds, duracoes, crits)
- Data quality flags: has_manual_creatures, has_unknown_cr, has_incomplete_party

### Dados NAO disponiveis (limitacoes)
- Spell slots usados / recursos consumidos
- Terreno / posicionamento (nao temos mapa)
- Condicoes ambientais (lair actions sao tracked mas nao contextualizadas)
- Experiencia dos jogadores (1a sessao vs veteranos)
- Estado pre-combate (party descansada vs debilitada)

### Restricoes
- SRD compliance: o modelo nao pode depender de dados non-SRD
- Volume minimo: precisa de massa critica de dados antes de ser confiavel
- Privacidade: dados agregados, nunca expostos por usuario/campanha individual
- Performance: calculo precisa ser < 100ms client-side

### Exclusoes de dados — REGRA IMUTAVEL
**Todo combate das seguintes contas DEVE ser excluido do dataset de treino/analise**:
- **Conta admin** (danielroscoe97@gmail.com) — testes internos do desenvolvedor
- **Contas de QA automatizado** — qualquer user criado por Playwright/E2E (detectar via user_agent ou email pattern como `*+test@*`, `*@test.*`, `qa-*@*`)
- **Contas de seed/fixture** — users criados por scripts em `scripts/qa-*` ou `scripts/seed-*`
- **Encounters com flag `test_encounter`** no quality_flags

**Como implementar**:
1. Tabela `excluded_accounts` com user_ids a ignorar (admin + QA)
2. Na materializacao de features: `WHERE owner_id NOT IN (SELECT user_id FROM excluded_accounts)`
3. Opcionalmente: flag `is_test_account` na tabela `users` setado automaticamente pra contas criadas por E2E
4. Na Fase 1 (analise exploratoria): filtrar retroativamente todos os combates dessas contas

**Razao**: Combates de teste nao representam uso real — DMs testando a plataforma, QA rodando cenarios sinteticos, e testes automatizados geram dados que poluem o modelo. Um combate de teste onde o DM adiciona 50 goblins e encerra em 1 round nao e um dado valido.

## Fases de Implementacao

### Fase 0: Coleta (JA EM ANDAMENTO)
**Status**: Sprint 3 implementando snapshots + DM feedback

**Objetivo**: Cada combate que roda na plataforma gera um registro completo.

**Dados coletados por combate**:
```
{
  // Party
  party_size: 4,
  avg_party_level: 5,
  party_composition: ["Fighter 5", "Wizard 5", "Cleric 4", "Rogue 5"],
  class_distribution: { fighter: 1, wizard: 1, cleric: 1, rogue: 1 },

  // Monstros
  creatures: [{ name: "Goblin", cr: "1/4", qty: 4 }, { name: "Goblin Boss", cr: "1", qty: 1 }],
  total_cr_numeric: 2.0,
  creature_count: 5,
  max_single_cr: 1.0,

  // Calculo 5e
  dmg_2014_difficulty: "easy",
  dmg_2014_adjusted_xp: 350,

  // Resultado real
  player_avg_rating: 3.2,  // jogadores acharam "moderado"
  dm_rating: 2,            // DM achou "facil"
  combat_result: "victory",
  total_rounds: 4,
  duration_seconds: 1200,
  pcs_downed: 1,

  // Qualidade
  quality_score: 0.9,  // 1.0 = dados perfeitos
  quality_flags: []
}
```

**Meta de volume**:
- Fase 0 → 1: coletar ~500 combates com dados completos
- Fase 1 → 2: coletar ~2000 combates
- Fase 2 → 3: coletar ~5000+ combates

### Fase 1: Analise Exploratoria
**Objetivo**: Entender os padroes nos dados e validar hipoteses.

**Hipoteses a testar**:
1. "A tabela do DMG subestima dificuldade pra parties menores (2-3 players)"
2. "Encontros com 1 monstro de CR alto sao percebidos como mais dificeis que muitos monstros de CR baixo, mesmo com XP ajustado igual"
3. "Parties com healer (Cleric/Druid) percebem encontros como mais faceis"
4. "A percepcao do DM tende a ser mais baixa que a dos jogadores (DM sabe que pegou leve)"
5. "Numero de rounds e um proxy melhor pra dificuldade que XP ajustado"
6. "PCs downed e o indicador mais forte de dificuldade percebida"

**Metricas derivadas a computar**:
- `difficulty_gap`: diferenca entre dificuldade 5e calculada e dificuldade percebida
- `dm_player_gap`: diferenca entre rating do DM e media dos jogadores
- `lethality_index`: (PCs downed / party_size) por encounter
- `efficiency_ratio`: rounds / expected_rounds (baseado em CR)
- `class_diversity_score`: entropia da distribuicao de classes na party

**Entregaveis**:
- Dashboard interno (admin-only) com graficos de distribuicao
- Relatorio de hipoteses validadas/invalidadas
- Identificacao dos top 10 fatores que mais correlacionam com dificuldade percebida

### Fase 2: Modelo Pocket DM v1
**Objetivo**: Primeiro modelo preditivo — dado um encontro planejado, prever a dificuldade percebida.

**Abordagem**: Regressao ponderada (nao ML complexo — precisa ser interpretavel e rodar client-side).

**Formula candidata**:
```
PocketDM_Difficulty = f(
  party_size,
  avg_party_level,
  class_composition_vector,
  total_cr_numeric,
  creature_count,
  max_single_cr,
  cr_spread,           // variancia dos CRs dos monstros
  action_economy_ratio // creatures / party_size
)
```

**Output**: Score 1.0-5.0 mapeado pra:
- 1.0-1.5: Trivial
- 1.5-2.5: Facil
- 2.5-3.5: Moderado
- 3.5-4.5: Dificil
- 4.5-5.0: Mortal

**Ponderacao por qualidade**:
- Encounters com quality_score < 0.5 tem peso reduzido
- Encounters com has_manual_creatures = true tem peso 0.3x
- Encounters com >= 3 player votes tem peso 2x (mais confiavel)
- DM rating tem peso 1.5x vs player rating (DM tem mais contexto)

**Validacao**:
- Split 80/20 treino/teste
- Metrica: MAE (Mean Absolute Error) do score predito vs rating real
- Target: MAE < 0.5 (prever dentro de meio ponto da realidade)

**Entregaveis**:
- Coeficientes do modelo armazenados em JSON estatico
- Funcao `calculatePocketDmDifficulty()` em `lib/utils/pocket-dm-calculator.ts`
- Label no builder: "Pocket DM: Moderado (3.2)" ao lado do "DMG 2014: Hard"

### Fase 3: Modelo Pocket DM v2 (Contextual)
**Objetivo**: Incorporar variaveis contextuais mais ricas.

**Novas variaveis**:
- **Sinergia de monstros**: pares de monstros que frequentemente aparecem juntos e geram dificuldade acima do esperado (ex: monstro + healer NPC)
- **Class matchups**: certos tipos de monstro sao mais dificeis pra certas composicoes (ex: resistencias a dano fisico vs party melee-heavy)
- **Curva de nivel**: a dificuldade percebida muda conforme a party sobe de nivel (tier 1 vs tier 2 vs tier 3)
- **Fadiga de sessao**: encontros no final da sessao (indice alto) sao percebidos como mais dificeis
- **Historico da campanha**: parties que enfrentam muitos encontros dificeis calibram pra cima (efeito "Dark Souls")

**Abordagem**: Feature engineering + modelo linear expandido ou arvore de decisao leve.

**Entregaveis**:
- Modelo v2 com features contextuais
- "Pocket DM Insights": tooltips no builder como "Este encontro tende a ser mais dificil pra parties sem healer"
- Sugestoes de ajuste: "Considere remover 1 Goblin pra trazer pra Moderado"

### Fase 4: Modelo Pocket DM v3 (Comunidade)
**Objetivo**: Feedback loop — o modelo melhora com o uso e os usuarios participam.

**Features**:
- **Calibracao por campanha**: "Sua campanha tende a achar encontros mais faceis que a media — ajustando" 
- **Comparativo**: "Este encontro foi votado como Dificil por 73% dos grupos que enfrentaram composicao similar"
- **Contribuicao**: DMs podem optar por compartilhar dados anonimizados pra melhorar o modelo
- **Leaderboard de precisao**: gamificar — DMs que votam consistentemente ganham badge "Avaliador Confiavel"
- **API publica**: endpoint `/api/pocket-dm/predict` pra integracao com outros tools

## Arquitetura Tecnica

### Schema de Dados (Fase 1-2)

```sql
-- Tabela materializada de features por encounter (computada de snapshots)
CREATE TABLE encounter_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),

  -- Party features
  party_size INT NOT NULL,
  avg_party_level NUMERIC(4,1) NOT NULL,
  class_distribution JSONB NOT NULL, -- {"fighter": 1, "wizard": 1, ...}
  has_healer BOOLEAN DEFAULT false,
  has_caster BOOLEAN DEFAULT false,
  class_diversity NUMERIC(3,2), -- entropia 0-1

  -- Creature features
  creature_count INT NOT NULL,
  total_cr NUMERIC(6,2) NOT NULL,
  max_single_cr NUMERIC(6,2) NOT NULL,
  cr_spread NUMERIC(6,2), -- variancia
  action_economy_ratio NUMERIC(4,2), -- creatures / party_size
  
  -- 5e baseline
  dmg_2014_difficulty TEXT,
  dmg_2014_adjusted_xp INT,
  dmg_2024_difficulty TEXT,

  -- Outcomes
  player_avg_rating NUMERIC(2,1),
  player_vote_count INT,
  dm_rating SMALLINT,
  combat_result TEXT,
  total_rounds INT,
  duration_seconds INT,
  pcs_downed INT,
  lethality_index NUMERIC(3,2),

  -- Quality
  quality_score NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  quality_flags TEXT[],

  -- Computed target
  pocket_dm_target NUMERIC(3,2), -- weighted average of dm + player ratings

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_encounter_features_campaign ON encounter_features(campaign_id);
CREATE INDEX idx_encounter_features_quality ON encounter_features(quality_score) WHERE quality_score >= 0.5;
```

### Componentes

```
lib/utils/
  pocket-dm-calculator.ts   -- funcao pura: features → score (< 100ms)
  pocket-dm-features.ts     -- extrai features de um snapshot
  pocket-dm-coefficients.ts -- coeficientes do modelo (JSON estatico)

lib/supabase/
  encounter-features.ts     -- CRUD + materializacao de features

components/campaign/
  PocketDmBadge.tsx          -- badge com score + tooltip no builder
  PocketDmInsights.tsx       -- tooltips contextuais (Fase 3)

app/api/
  pocket-dm/predict/route.ts -- endpoint pra calculo (Fase 4)

scripts/
  materialize-features.ts   -- batch job pra computar features de snapshots existentes
  train-model.ts             -- script offline pra calcular coeficientes
  validate-model.ts          -- script de validacao (MAE, R², distribuicao de erros)
```

### Pipeline de Dados

```
=== COLETA (real-time, cada combate) ===
Combat End → encounter_snapshots (party + creatures + ratings + flags)

=== MATERIALIZACAO (batch ou trigger) ===
encounter_snapshots → encounter_features (extract + compute derived features)

=== TREINO (offline, periodico) ===
encounter_features → train-model.ts → pocket-dm-coefficients.ts (JSON estatico)

=== PREDICAO (client-side, real-time) ===
Builder input → pocket-dm-calculator.ts → PocketDM Score 1.0-5.0
```

## Metricas de Sucesso

| Metrica | Target Fase 1 | Target Fase 2 | Target Fase 3 |
|---------|--------------|--------------|--------------|
| Volume de dados | 500 combates | 2000 combates | 5000+ combates |
| MAE do modelo | - | < 0.5 | < 0.35 |
| % de combates com DM rating | 30% | 50% | 60% |
| Engagement (DMs usando Pocket DM label) | awareness | 20% preferem | 40% preferem |
| NPS improvement | - | +5 pontos | +10 pontos |

## Riscos

1. **Volume insuficiente**: Se a plataforma nao atingir massa critica de combates, o modelo nao converge. **Mitigacao**: priorizar retencao e facilidade de uso do combat tracker.

2. **Dados enviesados**: DMs hardcore votam diferente de DMs casuais. **Mitigacao**: segmentar por perfil de uso (combates/mes) e ponderar.

3. **Overfitting**: Com poucos dados, o modelo decora em vez de generalizar. **Mitigacao**: validacao rigorosa com holdout set, regularizacao, comeco com modelo simples (regressao linear).

4. **Latencia**: Se o calculo precisar de lookup no servidor, o builder fica lento. **Mitigacao**: coeficientes em JSON estatico, calculo 100% client-side.

5. **Interpretabilidade**: Se o modelo e uma caixa preta, DMs nao confiam. **Mitigacao**: modelo linear com coeficientes transparentes — "party size contribuiu +0.3, max CR contribuiu +1.2".

## Notas

- A Fase 0 (coleta) ja esta em andamento — Sprint 3 implementa snapshots + DM feedback
- O schema de `encounter_features` e adicional ao snapshot — materializa features computadas
- O modelo comeca simples (regressao linear) e evolui conforme volume cresce
- "Pocket DM" como label ja existe no builder (Sprint 4) — o score vai substituir o placeholder
- A API publica (Fase 4) pode ser um diferencial de marketing — "powered by real combat data"
- Considerar parcerias com criadores de conteudo que usam a plataforma pra amplificar coleta de dados
