# Prompt: Sprint D — Testes Manuais Obrigatórios

Cole este prompt numa nova janela do Claude Code com Playwright MCP habilitado.

---

## CONTEXTO

Sprints A, B e C do Pocket DM foram executados. Este Sprint D é a validação final — re-run dos 3 Tiers de QA + testes que requerem interação manual (multiplayer, reconnection).

**Referências:**
- `docs/qa-tier1-anti-gremlin-critico.md` — definição das jornadas Tier 1
- `docs/qa-tier2-funcional-solido.md` — definição das jornadas Tier 2
- `docs/qa-tier3-cobertura-completa.md` — definição das jornadas Tier 3
- `docs/qa-consolidated-all-tiers-2026-04-04.md` — roadmap com issues e status

**Credenciais:**
- DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
- Player: `player.warrior@test-taverna.com` / `TestPlayer_War!1`
- Admin: `danielroscoe97@gmail.com`

**Ambiente:** `http://localhost:3000` (dev) — depois repetir em `https://pocketdm.com.br` (prod)

---

## 6 ITEMS

### D1 — Re-run Tier 1 completo (Desktop + Mobile)

**Objetivo:** Validar que os fixes do Sprint A (commit `ac2d41b` + matchup fix) resolveram todos os bugs.

**Executar:**
1. Rodar o prompt completo de `docs/qa-tier1-anti-gremlin-critico.md` no Playwright
2. Verificar especificamente:
   - ✅ Combat Recap mostra nomes REAIS (não "Vulto Armado")
   - ✅ Matchup mostra contagem correta (ex: "2 vs 3", não "0 vs 2")
   - ✅ Mobile: touch targets ≥ 44px
   - ✅ Mobile: zero overflow horizontal
   - ✅ Guest banner visível no mobile
   - ✅ Combat Log populado com HP changes
   - ✅ Combat Log fecha ao abrir Recap
   - ✅ Mínimo 2 combatentes para iniciar
   - ✅ Titles sem duplicação "| Pocket DM | Pocket DM"
3. Viewport mobile: 390x844 (iPhone 14)
4. Gerar relatório comparativo: antes vs depois

---

### D2 — Re-run Tier 2 completo

**Objetivo:** Validar fixes da sessão QA Tier 2 (commit `f130c5d` / equivalente).

**Verificar especificamente:**
- ✅ Via Link gera link funcional (não mais vazio)
- ✅ Tour dashboard mostra texto traduzido (não chaves brutas)
- ✅ Notas: indicador "Salvando..."/"Salvo" visível em amber/verde
- ✅ Onboarding: opção "Sou jogador" aparece
- ✅ NPCs criados como visíveis por padrão
- ✅ Tour skip mantém no dashboard (não redireciona pra /session/new)
- ✅ Criar campanha: redirect + toast
- ✅ Mind map: botão fullscreen funciona, ESC sai em camadas
- ✅ Notas: "Mais opções" toggle esconde controles secundários

---

### D3 — Re-run Tier 3 completo

**Objetivo:** Validar fixes do Sprint B.

**Verificar especificamente:**
- ✅ Criar Personagem funciona (não mais 500)
- ✅ Campanha não crasha ao interagir com Locais
- ✅ og:image retorna imagem válida
- ✅ Titles sem duplicação
- ✅ Nome de combate não duplicado no dashboard
- ✅ Pluralização correta ("1 jogador", "2 jogadores")

---

### D4 — Teste Multiplayer (J10) — REQUER 2 BROWSERS

**Objetivo:** Validar combate multiplayer DM + Player em tempo real.

**Setup:**
1. Browser 1: Login como DM (`dm.primary@test-taverna.com`)
2. Browser 2: Login como Player (`player.warrior@test-taverna.com`)
3. DM cria sessão de combate na campanha
4. Player entra via link de sessão

**Testar:**
- DM adiciona monstros → Player vê em ≤ 3s
- DM aplica dano → Player vê HP tier atualizado (não valor exato)
- Player vê nomes anti-metagaming (display_name), DM vê nomes reais
- DM derrota monstro → Player vê combatente riscado
- Player desconecta (fechar tab) → DM detecta em ≤ 45s
- Player reconecta (reabrir tab) → Reconexão automática sem approval do DM
- Late-join: Player 2 entra mid-combat → Vê estado atual correto

**Se Playwright não suportar 2 browsers simultâneos:** Documentar o que foi testável e marcar o resto como "manual humano".

---

### D5 — Teste Reconnection & Network (J16) — REQUER THROTTLING

**Objetivo:** Validar reconexão silenciosa conforme spec (`docs/spec-resilient-reconnection.md`).

**Testar:**
- Tab hidden (alt-tab) por 30s → Ao voltar, reconecta sem banner
- Browser offline 5s → Ao reconectar, estado sincroniza
- DM fecha tab → Player vê indicador de "DM offline" em ≤ 45s
- Player fecha tab e reabre → Reconexão automática via sessionStorage
- Player fecha browser e reabre → Reconexão via localStorage (24h TTL)

**Se Playwright não suportar network throttling:** Documentar e marcar como "manual humano".

---

### D6 — Demo Rehearsal Checklist

**Objetivo:** Simular o demo real na Taverna de Ferro / Pixel Bar.

**Cenário:**
1. DM abre Pocket DM no celular (390x844)
2. DM mostra a landing page pro grupo
3. DM inicia Guest Combat com 4 PCs vs 3 Goblins (starter encounter)
4. DM rola iniciativa → Ordem aparece
5. DM aplica dano → HP bars atualizam com tiers
6. DM adiciona condição → Badge aparece
7. DM derrota um Goblin → Riscado na lista
8. DM encerra combate → Recap aparece com nomes reais e matchup correto
9. DM mostra o compêndio de monstros → Busca funciona
10. DM faz signup → Guest combat é importado

**Critérios de PASS:**
- Zero erros visíveis
- Zero scroll horizontal
- Touch targets todos clicáveis sem erro
- Recap legível e correto
- Funil ≤ 7 cliques até primeiro combate

---

## OUTPUT ESPERADO

Para cada item (D1-D5), gerar um relatório no formato:

```markdown
## D[N] — [Nome]

**Status:** PASS / FAIL / PARTIAL
**Data:** YYYY-MM-DD
**Ambiente:** localhost / prod

### Verificações
- [x] Item verificado — OK
- [ ] Item que falhou — descrição do problema

### Bugs Encontrados (se houver)
- BUG-D[N]-01: descrição

### Screenshots
- path/to/screenshot.png
```

Salvar relatórios em `docs/qa-sprint-d-results-YYYY-MM-DD.md`.

---

## REGRAS

- Screenshots em `qa-evidence/sprint-d/`
- Se encontrar bugs novos, documentar com reprodução + screenshot
- NÃO corrigir bugs nesta sprint — apenas documentar. Fixes vão pro backlog.
- D6 (rehearsal) é pra ser feito presencialmente — o prompt só gera o checklist
