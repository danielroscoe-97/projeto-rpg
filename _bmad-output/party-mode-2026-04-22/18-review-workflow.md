# Review Workflow — Grimório (Campaign + Player Redesign)

**Decidido:** 2026-04-24 via party-mode (Sally + Bob + Amelia + Piper + Dani)
**Vigor:** Sprint 1 em diante

## Regra base

Toda PR que **muda pixels visíveis** pro usuário requer aprovação de **Sally (UX)** + **Piper (Mestre-alvo)** antes do merge. PRs que são só refactor/infra/testes seguem review padrão (Dev + Dani).

## Fluxo por fase

| Fase | Ordem de review | Gate |
|---|---|---|
| EP-0 Sprint 1 (refactor puro — SpellSlotGrid, Dot, Drawer, HP dedup) | Dev → Dani | ❌ Sem gate UX |
| Sprint 1 Track B (infra/CI/E2E scaffold) | Dev → Dani | ❌ Sem gate UX |
| **Wave 1+ (qualquer mudança visível)** | Dev → **Sally** → **Piper** → Dani → Merge | ✅ `ux-review-required` |
| Mudança em primitive pós-Sprint 1 (Dot/Drawer/SpellSlotGrid consumido em Wave 1+) | Dev → **Sally** → Dani | ✅ `ux-review-required` |

## Como marcar uma PR

1. Autor responde o checkbox no template de PR:
   - **Não muda pixel** → segue review padrão
   - **Muda pixel** → adiciona label `ux-review-required` + linka wireframe relevante
2. Wireframe **obrigatório** na PR description se `ux-review-required`:
   - `Ref: _bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md §2`
   - Sem wireframe linkado, Sally rejeita automaticamente
3. Sally valida: "pixel bate com wireframe? spacing/tokens/tipografia coerentes?"
4. Piper valida: "funciona com 6 jogadores gritando no notebook da mesa real?"
5. Ambos ✅ → Dani faz merge

## Critérios de Sally (forma)

- Spacing/padding conforme `08-design-tokens-delta.md`
- Tipografia/hierarquia conforme wireframe
- Drawer/Modal side/position conforme especificado
- Cores de condições, HP tiers, estados conforme `docs/glossario-ubiquo.md`
- Accessibility: focus trap, ESC-to-close, contraste

## Critérios de Piper (função sob fogo)

- Carga cognitiva: mestre acha em <5s?
- Mobile/notebook: legível à distância de mesa?
- Latência: responsivo o suficiente pra combate?
- "Faz o mestre falhar na frente dos jogadores?" — veto absoluto
- Dado físico soberano / turno fora de ordem → veto

## Infraestrutura pendente (Sprint 2)

- [ ] CI gate automático `ux-review-required` como sibling do `parity-check` (Track B Sprint 2)
  - Detecta mudanças em `components/player-hq/**`, `components/combat/**` (visual), `app/sheet/**`, `app/journey/**`, `app/recap/**`
  - Bloqueia merge sem labels `sally-approved` + `piper-approved`
- [ ] Calibrar critérios concretos de Sally + Piper com wireframes de Wave 1 (kickoff Sprint 2)

## Anti-patterns

- ❌ Merge de PR visual sem wireframe linkado
- ❌ Sally aprovando sem conferir token/spacing
- ❌ Piper aprovando sem rodar preview URL em mobile
- ❌ Adicionar feature "pequena" sem passar pelo gate achando que não conta
- ✅ Em dúvida se muda pixel? Marcar `ux-review-required` e deixar Sally decidir
