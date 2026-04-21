-- 168_seed_starter_templates.sql
-- Epic 04 (Player-as-DM Upsell), Story 04-A, Área 4 (seed).
--
-- PLACEHOLDER SEED — pure-narrative templates
--
-- Story 04-A ships the schema (162) and enough seed structure for the
-- TemplateGallery UI (Story 04-G) to render something real. Story 04-C
-- replaces these placeholders with the final monsters_payload content
-- approved by Dani + Paige (D3 — admin-curated, not LLM-generated).
--
-- Why pure-narrative here (monsters_payload = NULL)
--   * The SRD-validation trigger (162) accepts NULL payloads — see
--     validate_template_monsters_srd() early return.
--   * Slug/ID matching against the monsters table depends on staging
--     seed state (SRD import pipeline runs out-of-band). Shipping
--     hardcoded slugs in Story 04-A risks a SQLSTATE 23514 on migrate
--     if the target environment's monsters table lags. Narrative-only
--     placeholder defers that risk to Story 04-C where Winston can
--     verify the target environment matches.
--
-- Identifiers are deterministic UUIDs so subsequent migrations (and
-- Story 04-C) can UPDATE these rows in place instead of inserting
-- duplicates.
--
-- Idempotency: all INSERTs are ON CONFLICT DO NOTHING. Story 04-C will
-- issue explicit UPDATE statements when populating monsters_payload so
-- re-running 163 on a refreshed copy is a no-op.

-- ─────────────────────────────────────────────────────────────────────────────
-- Templates
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO campaign_templates (
  id, name, description, game_system, target_party_level,
  estimated_sessions, is_public, sort_order
) VALUES
  (
    '04040401-0000-0000-0000-000000000001',
    'Taverna em Chamas',
    'One-shot introdutório — uma taverna pega fogo e o grupo precisa agir. '
      || 'Três encontros curtos para testar iniciativa, ação e combate básico.',
    '5e', 1, 1, true, 10
  ),
  (
    '04040401-0000-0000-0000-000000000002',
    'A Cripta Perdida',
    'Mini-dungeon em três sessões — exploração, investigação e combate. '
      || 'Ideal para grupos de nível 3 querendo um arco curto com fechamento.',
    '5e', 3, 3, true, 20
  ),
  (
    '04040401-0000-0000-0000-000000000003',
    'Intro 5e — Primeiras Aventuras',
    'Campanha introdutória de quatro sessões que ensina regras básicas do 5e '
      || 'sem overwhelm: uma sessão por pilar (combate, exploração, interação, descanso).',
    '5e', 1, 4, true, 30
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Template encounters (narrative-only for now; Story 04-C adds monsters_payload)
-- ─────────────────────────────────────────────────────────────────────────────

-- Taverna em Chamas — 3 encontros
INSERT INTO campaign_template_encounters (
  id, template_id, name, description, sort_order, monsters_payload, narrative_prompt
) VALUES
  (
    '04040402-0001-0000-0000-000000000001',
    '04040401-0000-0000-0000-000000000001',
    'Fumaça no Salão',
    'Os jogadores acordam com fumaça enchendo o quarto. '
      || 'Precisam chegar até o salão antes que o fogo se espalhe.',
    10,
    NULL,
    'Skill challenge: Acrobacia (fugir por viga), Atletismo (arrombar porta), '
      || 'Percepção (ouvir hóspedes presos). Cada falha custa 1d6 de dano por fumaça.'
  ),
  (
    '04040402-0001-0000-0000-000000000002',
    '04040401-0000-0000-0000-000000000001',
    'Saqueadores no Pátio',
    'Bandidos aproveitaram a confusão do incêndio para saquear a taverna. '
      || 'O grupo topa com eles no pátio dos fundos.',
    20,
    NULL,
    'Encontro de combate — monstros a serem seedados em 04-C. '
      || 'Ambiente: pátio com barris empilhados (cobertura), carroça virada (difícil terreno).'
  ),
  (
    '04040402-0001-0000-0000-000000000003',
    '04040401-0000-0000-0000-000000000001',
    'O Estranho na Porta',
    'Ao escapar da taverna, um estranho se aproxima oferecendo abrigo. '
      || 'Roleplay + Insight para decidir se confiam.',
    30,
    NULL,
    'Encontro social puro. Sem combate. Hook para continuar a campanha '
      || 'se o DM quiser estender além do one-shot.'
  )
ON CONFLICT (id) DO NOTHING;

-- A Cripta Perdida — 3 encontros (apenas placeholders para UI; 04-C adiciona 5 encontros completos)
INSERT INTO campaign_template_encounters (
  id, template_id, name, description, sort_order, monsters_payload, narrative_prompt
) VALUES
  (
    '04040402-0002-0000-0000-000000000001',
    '04040401-0000-0000-0000-000000000002',
    'Entrada Selada',
    'A cripta está selada por uma porta de pedra com um enigma rúnico.',
    10,
    NULL,
    'Puzzle: três runas, uma sequência correta. Erro libera gás do sono '
      || '(CON save DC 12 ou incapacitado 1 round).'
  ),
  (
    '04040402-0002-0000-0000-000000000002',
    '04040401-0000-0000-0000-000000000002',
    'Corredor dos Guardiões',
    'Construtos animados patrulham o corredor principal.',
    20,
    NULL,
    'Encontro de combate — monstros a seedar em 04-C. '
      || 'Considerar construtos ou não-mortos SRD nível apropriado.'
  ),
  (
    '04040402-0002-0000-0000-000000000003',
    '04040401-0000-0000-0000-000000000002',
    'O Sarcófago',
    'O sarcófago central contém o objetivo da missão — e seu guardião.',
    30,
    NULL,
    'Boss encounter placeholder. 04-C define encounter final + tesouro.'
  )
ON CONFLICT (id) DO NOTHING;

-- Intro 5e — 4 encontros (1 por pilar)
INSERT INTO campaign_template_encounters (
  id, template_id, name, description, sort_order, monsters_payload, narrative_prompt
) VALUES
  (
    '04040402-0003-0000-0000-000000000001',
    '04040401-0000-0000-0000-000000000003',
    'Pilar 1 — Combate',
    'Primeiro encontro de combate: simples, didático, sem condições especiais.',
    10,
    NULL,
    'Foco: ensinar iniciativa, ação/bônus/movimento, attack rolls, dano. '
      || 'Monstros CR 1/4 a 1/2 a seedar em 04-C.'
  ),
  (
    '04040402-0003-0000-0000-000000000002',
    '04040401-0000-0000-0000-000000000003',
    'Pilar 2 — Exploração',
    'Travessia de terreno hostil com testes de perícia e gerenciamento de recursos.',
    20,
    NULL,
    'Sem combate obrigatório. Foco: tipos de dado, vantagem/desvantagem, '
      || 'passive skills, descanso curto vs longo.'
  ),
  (
    '04040402-0003-0000-0000-000000000003',
    '04040401-0000-0000-0000-000000000003',
    'Pilar 3 — Interação',
    'Negociação com NPC não-combatente. Persuasão, Intimidação, Enganação.',
    30,
    NULL,
    'Roleplay puro. Introduzir Insight, DC variável conforme abordagem.'
  ),
  (
    '04040402-0003-0000-0000-000000000004',
    '04040401-0000-0000-0000-000000000003',
    'Pilar 4 — Síntese',
    'Encontro final combinando os três pilares em uma cena.',
    40,
    NULL,
    'Combate + social + exploração. 04-C define conteúdo narrativo final.'
  )
ON CONFLICT (id) DO NOTHING;

-- Backout:
--   DELETE FROM campaign_template_encounters WHERE template_id IN
--     ('04040401-0000-0000-0000-000000000001',
--      '04040401-0000-0000-0000-000000000002',
--      '04040401-0000-0000-0000-000000000003');
--   DELETE FROM campaign_templates WHERE id IN
--     ('04040401-0000-0000-0000-000000000001',
--      '04040401-0000-0000-0000-000000000002',
--      '04040401-0000-0000-0000-000000000003');
