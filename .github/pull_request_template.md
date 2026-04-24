## Resumo

<!-- 1-2 frases sobre o que muda e por quê -->

## Referências

<!-- Cite docs relevantes. Se toca UI/UX, LINK obrigatório pro wireframe. -->
- Wireframe: <!-- ex: _bmad-output/party-mode-2026-04-22/03-wireframe-heroi.md §2 -->
- Decisão PRD: <!-- ex: PRD-EPICO-CONSOLIDADO.md #37 -->
- Epic/Sprint: <!-- ex: EP-0 Wave 0, closes EP-0.1 -->

## Checklist

- [ ] `rtk tsc --noEmit` passa
- [ ] `rtk lint` passa
- [ ] Unit tests passam (onde aplicável)
- [ ] Combat Parity verificado (Guest/Anônimo/Autenticado) se toca combate
- [ ] "Mestre" em todos os textos user-facing (nunca "DM")
- [ ] HP tiers em EN (FULL/LIGHT/MODERATE/HEAVY/CRITICAL) se toca HP

## Review

**Esta PR muda pixels visíveis pro usuário?**

- [ ] Não — só refactor interno / infra / testes → review Dev + Dani
- [ ] Sim — UI/UX afetada → **requer aprovação Sally (UX) + Piper (Mestre-alvo)** antes do merge

Se SIM: marcar com label `ux-review-required` e aguardar os dois ✅ antes de mergear.

## Test plan

<!-- Passos pra validar manualmente -->
