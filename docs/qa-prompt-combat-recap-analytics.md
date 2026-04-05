# QA Prompt: Combat Recap + Analytics & Growth Features

> **Para**: Agente de QA (Playwright + manual)
> **Data**: 2026-04-04
> **Escopo**: Validar TODAS as features implementadas nos commits `6c33807` e `d8819fd`
> **Ambiente**: https://tavernadomestre.vercel.app/

---

## Contexto

Foram implementadas 2 grandes entregas:

### Entrega 1: Combat Recap + Funil de Conversao
- **CombatRecap** substituiu o CombatLeaderboard como tela pos-combate
- 8 awards revelados card-by-card com animacao (Framer Motion, 3s auto-advance)
- 4 narrativas automaticas (Clutch Save, Near Death, One-shot, Epic Comeback)
- CTA de conversao "Salvar resultados e criar campanha" (guest only)
- Onboarding express 1-tela para source=guest_combat
- Banner "Convide seus jogadores" no Dashboard
- Character Claim no /invite (jogador escolhe personagem do DM)

### Entrega 2: Analytics & Growth
- F1: Coleta de dados novos (attackType, turnTimeSnapshots, 5 funcoes de agregacao)
- F2: Encontro Sugerido — preset "Goblin Ambush" no /try
- F3: Link publico /r/[code] com OG preview + pagina responsiva
- F4: Auto-persist de combat reports no banco (DM logado)
- F5: Campaign stats acumulados na pagina da campanha
- F6: Streak counter (badge no Dashboard)

---

## Credenciais de Teste

| Conta | Email | Senha | Uso |
|-------|-------|-------|-----|
| DM Principal | dm.primary@test-taverna.com | TestDM_Primary!1 | DM logado, campanhas |
| Player 1 | player.warrior@test-taverna.com | TestPlayer_War!1 | Aceitar convite, claim |
| Player Fresh | player.fresh@test-taverna.com | TestPlayer_Fresh!5 | Onboarding vazio |

---

## Jornadas de Teste

### J1: Guest Combat Recap (Playwright + visual)

**Arquivo sugerido**: `e2e/journeys/j19-combat-recap-guest.spec.ts`

```
1. Navegar para /try
2. Verificar que o banner "Encontro Sugerido" aparece (data-testid="preset-load-btn")
3. Clicar "Carregar encontro" — deve popular 4 PCs + 3 Goblins
4. Verificar que initiatives foram auto-roladas
5. Clicar "Iniciar Combate"
6. Aplicar dano em um goblin ate matar (verificar que e derrotado)
7. Aplicar dano em outro combatente
8. Encerrar combate
9. VERIFICAR: CombatRecap aparece (data-testid="combat-recap")
10. VERIFICAR: Awards carousel aparece com animacao card-by-card
11. VERIFICAR: Existe botao skip (data-testid="recap-skip-btn")
12. Clicar skip — deve ir pra tela de detalhes
13. VERIFICAR: Narrativas aparecem (se houve near_death ou one_shot)
14. VERIFICAR: Resumo numerico aparece (rounds, duracao, dano total)
15. VERIFICAR: Ranking com barras de progresso aparece
16. VERIFICAR: Botao "Salvar resultados e criar campanha" aparece (data-testid="recap-save-signup-btn")
17. VERIFICAR: Botao "Compartilhar" funciona (data-testid="recap-share-btn")
18. VERIFICAR: Botao "Link" funciona (data-testid="recap-share-link-btn")
19. Clicar "Salvar resultados e criar campanha"
20. VERIFICAR: Redireciona para /auth/sign-up?from=guest-combat
21. VERIFICAR: Snapshot foi salvo no localStorage (key contem "combat-snapshot")
```

### J2: Encontro Sugerido — Comportamento do Banner

**Arquivo sugerido**: `e2e/journeys/j20-starter-encounter.spec.ts`

```
1. Navegar para /try com setup vazio
2. VERIFICAR: Banner "Quer testar com um encontro pronto?" aparece
3. Clicar "Montar do zero"
4. VERIFICAR: Banner desaparece
5. Recarregar pagina
6. VERIFICAR: Banner reaparece (state e local, nao persistido)
7. Clicar "Carregar encontro"
8. VERIFICAR: 4 PCs aparecem (Thorin, Elara, Grimjaw, Luna)
9. VERIFICAR: 3 Goblins aparecem (do SRD, com HP 7, AC 15)
10. VERIFICAR: Initiatives foram roladas para todos
11. VERIFICAR: Banner nao reaparece (combatants > 0)
12. Adicionar mais um combatante manualmente
13. Remover todos os combatantes
14. VERIFICAR: Banner NAO reaparece (presetDismissed = true nesta sessao)
```

### J3: DM Logado — Combat Recap + Auto-Save

**Arquivo sugerido**: `e2e/journeys/j21-dm-combat-recap.spec.ts`

```
1. Login como dm.primary@test-taverna.com
2. Ir para /app/session/new ou iniciar combate via campanha existente
3. Adicionar combatentes + iniciar combate
4. Aplicar dano, curar, aplicar condicoes, avancar turnos
5. Encerrar combate (dialog de nome do encontro aparece)
6. Dar nome e confirmar
7. VERIFICAR: CombatRecap aparece com awards animados
8. VERIFICAR: NAO tem botao "Salvar resultados e criar campanha" (so guest)
9. VERIFICAR: Tem botao "Link" para compartilhar
10. Clicar "Link"
11. VERIFICAR: Toast "Link copiado!" aparece
12. VERIFICAR: URL /r/[code] foi copiada
13. Abrir a URL copiada em aba anonima
14. VERIFICAR: Pagina publica responsiva carrega com awards, narrativas, stats
15. VERIFICAR: CTA "Testar agora" leva para /try
16. Fechar recap → Ir para pagina da campanha
17. VERIFICAR: CampaignStatsBar aparece (se >= 2 combates no total)
```

### J4: Link Publico — Responsivo + OG

**Arquivo sugerido**: `e2e/journeys/j22-public-report.spec.ts`

```
1. Criar um report via API (POST /api/combat-reports com body valido)
2. Navegar para /r/[shortCode]
3. VERIFICAR: Pagina carrega com encounter name, awards grid, narrativas, stats
4. VERIFICAR: CTA "Testar agora" presente e funcional
5. Verificar responsividade:
   - Mobile (375px): awards em grid 2-col, tudo cabe em ~1 tela
   - Tablet (768px): layout se adapta
   - Desktop (1280px): card centralizado com max-width
6. Verificar OG image: GET /r/[shortCode]/opengraph-image
   - VERIFICAR: Retorna imagem 1200x630 PNG
   - VERIFICAR: Contem encounter name e MVP
7. Testar com shortCode invalido → VERIFICAR: 404
8. Testar com report expirado (expires_at no passado) → VERIFICAR: 404
```

### J5: Onboarding Express (Guest → Signup → 1-tela)

**Arquivo sugerido**: `e2e/journeys/j23-onboarding-express.spec.ts`

```
1. Fazer o fluxo guest completo: /try → combate → recap → "Salvar e criar campanha"
2. Fazer signup com conta nova (ou usar player.fresh se possivel)
3. VERIFICAR: Redirecionado para /app/onboarding
4. VERIFICAR: Welcome screen detecta source=guest_combat
5. Clicar continuar
6. VERIFICAR: Tela express aparece (data-testid="onboarding-express")
   - Campo "Nome da campanha" pre-preenchido com "Minha campanha"
   - Players importados visiveis como pills
   - Botao "Criar campanha e comecar"
   - Link "Quero personalizar passo a passo"
7. Clicar "Criar campanha e comecar"
8. VERIFICAR: Campanha criada no banco
9. VERIFICAR: Players importados como player_characters
10. VERIFICAR: Sessao + encontro + token criados
11. VERIFICAR: Tela "done" com link de sessao
```

### J6: Character Claim no /invite

**Arquivo sugerido**: `e2e/journeys/j24-character-claim.spec.ts`

```
1. Login como DM (dm.primary)
2. Criar campanha com 3 personagens (ou usar existente)
3. Gerar invite link para a campanha
4. Logout
5. Login como player (player.warrior)
6. Navegar para o invite link
7. VERIFICAR: Tela de claim aparece mostrando os personagens da campanha
   - Cards com nome, HP, AC
   - Botao "Sou eu!" em cada card
   - Opcao "Nao estou na lista — criar personagem novo"
8. Selecionar um personagem
9. VERIFICAR: Botao de submit aparece "Sou eu! Entrar como este personagem"
10. Clicar submit
11. VERIFICAR: Toast de sucesso
12. VERIFICAR: Redirecionado para /app/dashboard
13. VERIFICAR: No banco, player_characters.user_id foi setado para o user do player
14. Login como outro player (player.mage)
15. Navegar para o mesmo invite (gerar novo)
16. VERIFICAR: O personagem ja claimado NAO aparece na lista
```

### J7: Banner de Convite no Dashboard

```
1. Login como DM com campanha que tem player_characters mas sem campaign_members (player)
2. VERIFICAR: Banner "Seus jogadores ainda entram manual!" aparece
3. Clicar X para dismissar
4. VERIFICAR: Banner desaparece
5. Recarregar pagina
6. VERIFICAR: Banner NAO reaparece (persistido no localStorage)
7. Limpar localStorage
8. Recarregar
9. VERIFICAR: Banner reaparece
```

### J8: Streak Counter

```
1. Login como DM que finalizou encontros em semanas consecutivas
2. VERIFICAR: Se streak >= 2, badge "🔥 X semanas consecutivas" aparece no header do Dashboard
3. VERIFICAR: Se streak < 2, badge NAO aparece
4. Login como player
5. VERIFICAR: Badge NAO aparece (so DMs)
```

### J9: Campaign Stats

```
1. Login como DM
2. Ir para uma campanha que tem >= 2 combat_reports salvos
3. VERIFICAR: CampaignStatsBar aparece acima das sections
   - Total combates, rounds, tempo total, MVP all-time
   - Grid 2-col no mobile, 4-col no desktop
4. Ir para campanha com 0 ou 1 report
5. VERIFICAR: CampaignStatsBar NAO aparece
```

### J10: Validacao de API

```
1. POST /api/combat-reports com body vazio → VERIFICAR: 400
2. POST /api/combat-reports com report sem summary → VERIFICAR: 400 "Invalid report structure"
3. POST /api/combat-reports com payload > 100KB → VERIFICAR: 413
4. POST /api/combat-reports com report valido sem auth → VERIFICAR: 200, expires_at != null (30 dias)
5. POST /api/combat-reports com report valido COM auth → VERIFICAR: 200, expires_at = null
```

---

## Checklist de Parity (CLAUDE.md Rule)

| Feature | Guest (/try) | DM Logado | Verificar |
|---------|-------------|-----------|-----------|
| CombatRecap animado | Sim | Sim | Ambos mostram awards card-by-card |
| Narrativas near_death | Sim | Sim | Detecta PC com <= 10% HP |
| Narrativas clutch_save | Nao* | Sim | *Guest nao tem death saves no log |
| CTA "Salvar e criar campanha" | Sim | **NAO** | So aparece no guest |
| Botao "Link" | Sim | Sim | Ambos podem gerar link publico |
| Auto-save report | **NAO** | Sim | Guest nao persiste no banco |
| Extended analytics (timePerRound) | Sim | Sim | Ambos passam turnTimeSnapshots |
| Encontro Sugerido | Sim | **N/A** | So no /try |

---

## Criterios de Aceitacao Global

- [ ] Build passa com 0 erros
- [ ] Todas as animacoes rodam smooth (60fps) no mobile e desktop
- [ ] Nenhum texto hardcoded — tudo via i18n (pt-BR + en)
- [ ] Pagina publica /r/[code] cabe em 1 tela no iPhone SE (375px)
- [ ] OG image gera corretamente (1200x630, contem MVP e encounter name)
- [ ] Nenhum dado sensivel exposto na pagina publica (monster HP oculto de players, etc.)
- [ ] CombatLeaderboard original ainda funciona se importado (nao foi deletado)
- [ ] Screenshots de evidencia salvos em qa-evidence/ (nao no root)

---

## Estrutura de Arquivos E2E Sugerida

```
e2e/journeys/
  j19-combat-recap-guest.spec.ts     — J1
  j20-starter-encounter.spec.ts      — J2
  j21-dm-combat-recap.spec.ts        — J3
  j22-public-report.spec.ts          — J4
  j23-onboarding-express.spec.ts     — J5
  j24-character-claim.spec.ts        — J6
```

J7, J8, J9, J10 podem ser testes manuais ou integrados em specs existentes.
