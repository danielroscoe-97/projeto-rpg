# Regras de Fallback de Token de Monstro

**Data:** 2026-03-27
**Status:** Implementado e validado (100% cobertura)

## Problema

Quando o CDN do 5etools-img retorna erro ou timeout no browser, monstros sem `fallback_token_url` exibiam um emoji genérico ao invés de um token visual. Isso afetava 1462 de 3037 monstros.

## Solução: 3 Estratégias em Cascata

O script `scripts/fetch-5etools-bestiary.ts` agora atribui `fallback_token_url` a **100% dos monstros** usando 3 estratégias em ordem de prioridade:

### Estratégia 1: Cross-Version (782 matches)

Busca o mesmo monstro (por nome exato) na outra ruleset.

- Ex: "Ancient Brass Dragon" (XMM/2024) → fallback do "Ancient Brass Dragon" (MM/2014)
- Funciona para monstros que existem em ambas as rulesets (2014 e 2024)

### Estratégia 2: Family Similarity (1391 matches)

Busca o monstro com nome mais similar usando scoring de keywords.

- **Threshold:** >= 1.0 (reduzido de 1.5 para cobrir mais monstros)
- **Scoring:** Palavras em comum valem 2 pontos, age prefixes (ancient/adult/young/wyrmling) valem 0.5, mesmo sufixo dá bônus de +3
- **Cross-type:** Permitido com penalidade de 0.6x no score
- Ex: "Aartuk Starhorror" → fallback do "Aartuk Elder" (mesmo family name)

### Estratégia 3: Same Type + Closest CR (864 matches)

Garantia final — NUNCA deixa um monstro sem fallback.

- Busca outro monstro do mesmo `type` (dragon, undead, humanoid, etc.) com CR mais próximo
- Se não encontrar mesmo tipo, cai para `humanoid` como default
- Ex: Um `fiend` CR 5 sem match de nome → pega o `fiend` mais próximo de CR 5

## Componente MonsterToken

O componente `components/srd/MonsterToken.tsx` usa a seguinte cadeia de fallback:

1. Tenta carregar `tokenUrl` (primary)
2. Se falha, retry 2x com cache-bust
3. Se ainda falha, tenta `fallbackTokenUrl`
4. Se tudo falha, exibe emoji do tipo da criatura

## Testes

Arquivo: `scripts/__tests__/fetch-bestiary-output.test.ts` (11 testes)

- Valida que todos os 3037 monstros têm `token_url` e `fallback_token_url`
- Verifica que fallback nunca é igual ao primary
- Valida formato das URLs (HTTPS + .webp)
- Verifica cross-version matching
- Confirma unicidade de IDs por ruleset

## Regra Imutável

**Nenhum monstro pode ficar sem token visual.** Se o fetch script for modificado, os testes de integridade devem continuar passando com 100% de cobertura.
