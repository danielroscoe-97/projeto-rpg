# Matriz de Jornadas do Usuário → QA E2E — Pocket DM

**Data:** 2026-03-27
**Fonte:** cenarios-financeiros-pocket-dm-2026.md + market-vtt-rpg-features-go-to-market-2026-03-27.md
**Objetivo:** Mapear cada jornada crítica do market research em testes E2E Playwright executáveis

---

## Visão Geral: 3 Fluxos × 2 Perspectivas

### Fluxos de Acesso
| Fluxo | Quem | O que testa | Spec(s) |
|---|---|---|---|
| **Try** | Visitante sem login | /try → combate → CTA signup | `j8-try-full-funnel.spec.ts` |
| **Login Free** | DM logado (tudo liberado) | Dashboard → todas features Pro acessíveis | `j10-free-all-features.spec.ts` |
| **Pago (hoje grátis)** | DM logado | >6 combatentes, campanhas, presets, audio | `j10-free-all-features.spec.ts` (J10.3) |

### Perspectivas
| Perspectiva | O que vê | O que NÃO vê | Spec(s) |
|---|---|---|---|
| **DM** | HP exato, AC, notas, controles, condições | — | `j1`, `j3`, `j6`, `j7`, `j10` |
| **Player** | HP tiers (LIGHT/MODERATE/HEAVY/CRITICAL), condições públicas, turno atual | HP exato dos monstros, AC, notas DM, controles DM | `j2`, `j9`, `j11` |

---

## Jornadas Críticas (Market Research Sec.14)

### J1 — Primeiro Combate (DM Autenticado)
**Job-to-be-Done:** "Quero rodar meu primeiro combate em < 90 segundos sem ler tutorial"
**Persona:** Pedro (DM Casual/Iniciante) + Rodolfo (DM Sobrecarregado)
**Momento AHA:** Compartilha link com jogador e o jogador acessa
**O que NÃO pode acontecer:** Tela em branco, botão que não funciona, erro de rede sem feedback

| Test ID | Cenário | Spec |
|---|---|---|
| J1.1 | Happy path: dashboard → novo combate → 2 combatentes → iniciar | `j1-first-combat.spec.ts` |
| J1.3 | Quick Combat bypassa campaign picker | `j1-first-combat.spec.ts` |
| J1.4 | Edge: não pode iniciar sem combatentes | `j1-first-combat.spec.ts` |
| J1.6 | Persistência: combatentes sobrevivem refresh | `j1-first-combat.spec.ts` |

### J2 — Player Recebe o Link (Viralidade)
**Job-to-be-Done:** "Quero ver o combate no meu celular sem instalar nada"
**Persona:** Vivi (Jogadora Curiosa)
**Momento AHA:** Vê a barra de HP do dragão caindo em tempo real
**O que NÃO pode acontecer:** Tela de login, tela de "instale o app", carregamento > 3s

| Test ID | Cenário | Spec |
|---|---|---|
| J2.3 | HP atualiza em tempo real quando DM ajusta | `j2-player-join.spec.ts` |
| J2.4 | Notificação visual quando é seu turno | `j2-player-join.spec.ts` |
| J2.6 | Link inválido mostra erro amigável | `j2-player-join.spec.ts` |
| J2.8 | Mobile player (Pixel 5) funciona | `j2-player-join.spec.ts` |

### J3 — DM Retorna (Retenção)
**Job-to-be-Done:** "Quero voltar e encontrar tudo como deixei"
**Persona:** Rodolfo (DM Sobrecarregado)
**O que NÃO pode acontecer:** Dados perdidos, ter que reconfigurar grupo

| Test ID | Cenário | Spec |
|---|---|---|
| J3.1 | Dashboard mostra conteúdo para DM recorrente | `j3-dm-returns.spec.ts` |
| J3.2 | DM retoma sessão ativa com estado preservado | `j3-dm-returns.spec.ts` |
| J3.4 | DM acessa presets salvos | `j3-dm-returns.spec.ts` |
| J3.5 | DM acessa compendium de monstros | `j3-dm-returns.spec.ts` |

### J5 — Compartilhamento Orgânico
**Job-to-be-Done:** "Quero que meus jogadores vejam e fiquem impressionados"
**Momento Viral:** Jogador vê HP caindo → posta no TikTok

| Test ID | Cenário | Spec |
|---|---|---|
| J5.3 | Dois players usam o mesmo link | `j5-share-link.spec.ts` |
| J5.4 | Link válido após múltiplos turnos | `j5-share-link.spec.ts` |

---

## Novas Jornadas (Derivadas dos Docs de Pesquisa)

### J8 — Try Mode Full Funnel (Visitante)
**Job-to-be-Done:** "Quero testar sem criar conta — se funcionar, eu faço login"
**Persona:** Pedro (DM Iniciante) + qualquer visitante via TikTok/Reddit
**Funil:** Landing → /try → combate → CTA signup
**Benchmark:** < 90s até primeiro combate

| Test ID | Cenário | Spec |
|---|---|---|
| J8.1 | Landing → /try sem login, sem redirect | `j8-try-full-funnel.spec.ts` |
| J8.2 | Visitor completa combate com 3 combatentes | `j8-try-full-funnel.spec.ts` |
| J8.3 | Visitor avança turnos e ajusta HP | `j8-try-full-funnel.spec.ts` |
| J8.4 | /try com 6 combatentes (limite free) | `j8-try-full-funnel.spec.ts` |
| J8.5 | /try nunca mostra tela de login | `j8-try-full-funnel.spec.ts` |
| J8.6 | Signup CTA visível durante/após combate | `j8-try-full-funnel.spec.ts` |

### J9 — DM vs Player: Visibilidade Diferencial
**Job-to-be-Done (DM):** "Quero controle total sem que players vejam o que não devem"
**Job-to-be-Done (Player):** "Quero entender a tensão sem ver os números exatos"
**Regra:** HP bars usam tiers LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%)

| Test ID | Cenário | Spec |
|---|---|---|
| J9.1 | DM vê HP exato, Player vê tiers (anti-metagaming) | `j9-dm-vs-player-visibility.spec.ts` |
| J9.2 | Player vê seu próprio HP mas não o dos monstros | `j9-dm-vs-player-visibility.spec.ts` |
| J9.3 | DM vê controles, Player não vê controles DM | `j9-dm-vs-player-visibility.spec.ts` |
| J9.4 | Condições aplicadas pelo DM aparecem no player view | `j9-dm-vs-player-visibility.spec.ts` |
| J9.5 | Dois players simultâneos veem visão consistente | `j9-dm-vs-player-visibility.spec.ts` |

### J10 — Login Free: Todas Features Acessíveis
**Job-to-be-Done:** "Tudo que é Pro deve funcionar sem paywall (promoção atual)"
**Contexto:** Hoje todas features Pro estão liberadas gratuitamente

| Test ID | Cenário | Spec |
|---|---|---|
| J10.1 | Dashboard carrega com conteúdo | `j10-free-all-features.spec.ts` |
| J10.2 | Criar nova sessão funciona | `j10-free-all-features.spec.ts` |
| J10.3 | >6 combatentes funciona (Pro liberado) | `j10-free-all-features.spec.ts` |
| J10.4 | Compendium Monsters funciona | `j10-free-all-features.spec.ts` |
| J10.5 | Compendium Spells funciona | `j10-free-all-features.spec.ts` |
| J10.6 | Command Palette (Ctrl+K) funciona | `j10-free-all-features.spec.ts` |
| J10.7 | Presets page carrega | `j10-free-all-features.spec.ts` |
| J10.8 | Settings page carrega | `j10-free-all-features.spec.ts` |
| J10.9 | Share link funciona | `j10-free-all-features.spec.ts` |
| J10.10 | Nenhuma página mostra paywall | `j10-free-all-features.spec.ts` |

### J11 — Player View Completa
**Job-to-be-Done:** "Quero que o player AMEEEEE a experiência no celular"
**Persona:** Vivi (Jogadora Curiosa) — vetor viral
**Momento Viral:** HP bar cai = cinema = TikTok content

| Test ID | Cenário | Spec |
|---|---|---|
| J11.1 | Player vê combate com UI completa | `j11-player-view-complete.spec.ts` |
| J11.2 | Player recebe highlight quando é seu turno | `j11-player-view-complete.spec.ts` |
| J11.3 | HP bars usam tiers narrativos | `j11-player-view-complete.spec.ts` |
| J11.4 | Player join sem login (anônimo) | `j11-player-view-complete.spec.ts` |
| J11.5 | Player view mobile (Pixel 5) sem overflow | `j11-player-view-complete.spec.ts` |
| J11.6 | Realtime: HP atualiza quando DM muda | `j11-player-view-complete.spec.ts` |

### J12 — Combat Resilience
**Job-to-be-Done:** "Se eu fechar o navegador por acidente, meu combate NÃO pode sumir"
**Dor #2 Market Research:** "Crashes e perda de dados" — TOP frustração

| Test ID | Cenário | Spec |
|---|---|---|
| J12.1 | DM refresh preserva combate | `j12-combat-resilience.spec.ts` |
| J12.2 | DM fecha e reabre — dados intactos | `j12-combat-resilience.spec.ts` |
| J12.3 | Player reconecta após offline | `j12-combat-resilience.spec.ts` |
| J12.4 | Player refresh — volta ao player view | `j12-combat-resilience.spec.ts` |
| J12.5 | Múltiplos refreshes não corrompem estado | `j12-combat-resilience.spec.ts` |

### J13 — Mobile-First (Pixel 5)
**Job-to-be-Done:** ">70% do Brasil usa smartphone no jogo — TUDO tem que funcionar no celular"
**Regra:** ZERO horizontal overflow em qualquer tela

| Test ID | Cenário | Spec |
|---|---|---|
| J13.1 | /try funciona no mobile | `j13-mobile-all-journeys.spec.ts` |
| J13.2 | Login → Dashboard no mobile | `j13-mobile-all-journeys.spec.ts` |
| J13.3 | DM cria combate com 4 combatentes no mobile | `j13-mobile-all-journeys.spec.ts` |
| J13.4 | Player view no mobile | `j13-mobile-all-journeys.spec.ts` |
| J13.5 | Compendium usável no mobile | `j13-mobile-all-journeys.spec.ts` |
| J13.6 | Landing page responsiva | `j13-mobile-all-journeys.spec.ts` |

### J14 — i18n Português (pt-BR)
**Job-to-be-Done:** "Ser o PRIMEIRO tracker profissional totalmente em português"
**Dor #5 Market Research:** 95%+ das ferramentas são em inglês

| Test ID | Cenário | Spec |
|---|---|---|
| J14.1 | Dashboard em português para DM pt-BR | `j14-i18n-journeys.spec.ts` |
| J14.2 | Botões de combate em português | `j14-i18n-journeys.spec.ts` |
| J14.3 | Condições em português no compendium | `j14-i18n-journeys.spec.ts` |
| J14.4 | DM English vê interface em inglês | `j14-i18n-journeys.spec.ts` |
| J14.5 | Badges de condição em português no combate | `j14-i18n-journeys.spec.ts` |
| J14.6 | /try em português para visitor BR | `j14-i18n-journeys.spec.ts` |
| J14.7 | /join em português para player BR | `j14-i18n-journeys.spec.ts` |

---

## Métricas de Cobertura

| Categoria | Specs Existentes | Specs Novos | Total Testes |
|---|---|---|---|
| Try Mode (Visitante) | 4 | 6 | **10** |
| Primeiro Combate (DM) | 4 | — | **4** |
| Player Join (Viralidade) | 4 | — | **4** |
| DM Retorna (Retenção) | 5 | — | **5** |
| Share Link (Viral) | 2 | — | **2** |
| Combat Core Loop | 4 | — | **4** |
| Compendium/Oracle | 4 | — | **4** |
| DM vs Player Visibility | — | 5 | **5** |
| Free All Features | — | 10 | **10** |
| Player View Completa | — | 6 | **6** |
| Combat Resilience | — | 5 | **5** |
| Mobile (Pixel 5) | — | 6 | **6** |
| i18n pt-BR | 3 | 7 | **10** |
| **TOTAL** | **30** | **45** | **75** |

---

## Mapeamento: Features do Market Research → Testes

| Feature (Tier 1 — Críticas) | Job-to-be-Done | Spec que cobre |
|---|---|---|
| HP tracking em tempo real | "Quero saber se o monstro vai cair" | J2.3, J9.1, J11.3, J11.6 |
| Condições/status tracking | "Sempre esqueço que o goblin está amedrontado" | J6.4, J9.4, J14.3, J14.5 |
| Ordem de iniciativa clara | "Quem é o próximo?" | J1.1, J6.1, J11.1 |
| Player view — tela separada | "Players querem participar sem ver fichas DM" | J2.3, J9.1-J9.5, J11.1-J11.6 |
| Notificação de turno | "Fulano está no celular e atrasa o jogo" | J2.4, J11.2 |

| Feature (Tier 2 — Desejadas) | Spec que cobre |
|---|---|
| Round counter | J6.1 |
| Salvar/reutilizar encontros | J3.4 (presets) |
| Drag & drop iniciativa | J1.1 (initiative order) |
| Integração com stat blocks | J7.1-J7.4 (compendium) |

| Dor (Market Research) | Spec que cobre |
|---|---|
| Dor #1: Complexidade mata momentum | J8.2 (< 90s), J8.5 (sem login) |
| Dor #2: Crashes e perda de dados | J12.1-J12.5 |
| Dor #3: DM não consegue focar na narrativa | J10.2 (setup rápido) |
| Dor #4: Jogadores desengajados | J11.1-J11.6, J9.1-J9.5 |
| Dor #5: Ferramentas em inglês | J14.1-J14.7 |
| Dor #7: Player view segunda classe | J9.1, J11.1-J11.6 |
