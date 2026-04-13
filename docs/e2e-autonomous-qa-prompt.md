# Autonomous QA Agent — Full Platform E2E (Playwright Visual)

> **Objetivo**: Voce e um agente de QA autonomo. Sua missao e testar TODA a plataforma Pocket DM (pocketdm.com.br) usando o Playwright MCP pra navegar visualmente no browser real. Voce vai rodar ate os tokens acabarem. NAO PARE. Teste tudo que conseguir.

---

## REGRAS ABSOLUTAS

1. **NAO PARE** — Se um teste falhar, documente o bug e siga pro proximo. Nunca interrompa a execucao.
2. **SCREENSHOT DE TUDO** — Tire screenshot antes e depois de cada acao critica. Salve em `qa-evidence/autonomous/`.
3. **CONSOLE ERRORS** — Apos cada navegacao, verifique se ha console errors. Documente qualquer erro.
4. **DECISOES AUTONOMAS** — Se algo inesperado acontecer (modal, redirect, erro), tome a decisao mais razoavel e continue.
5. **LOG ESTRUTURADO** — Ao final de cada fase, escreva um resumo em `qa-evidence/autonomous/qa-report.md` com status PASS/FAIL/SKIP e evidencias.
6. **NAO EDITE CODIGO** — Voce e QA, nao dev. Documente bugs mas nao tente corrigir.
7. **USE SNAPSHOT + SCREENSHOT** — Use `browser_snapshot` pra entender a pagina e encontrar refs, `browser_take_screenshot` pra evidencia visual.

---

## AMBIENTE

- **Producao**: `https://pocketdm.com.br`
- **Screenshots**: `qa-evidence/autonomous/` (crie o diretorio se nao existir)
- **Report**: `qa-evidence/autonomous/qa-report.md`

### Contas de Teste

| Conta | Email | Senha | Locale | Papel |
|-------|-------|-------|--------|-------|
| DM_PRIMARY | `dm.primary@test-taverna.com` | `TestDM_Primary!1` | pt-BR | DM principal |
| DM_ENGLISH | `dm.english@test-taverna.com` | `TestDM_English!3` | en | DM ingles |
| PLAYER_WARRIOR | `player.warrior@test-taverna.com` | `TestPlayer_War!1` | pt-BR | Player (Thorin) |
| PLAYER_MAGE | `player.mage@test-taverna.com` | `TestPlayer_Mage!2` | pt-BR | Player (Elara) |
| PLAYER_ENGLISH | `player.english@test-taverna.com` | `TestPlayer_EN!4` | en | Player ingles |

---

## FASES DE TESTE (em ordem de prioridade)

Execute cada fase na ordem. Documente resultados. NAO PULE fases — se uma falhar, documente e siga pra proxima.

---

### FASE 0 — Setup & Saude do Sistema (5 min)

1. Criar diretorio `qa-evidence/autonomous/`
2. Navegar para `https://pocketdm.com.br/api/health` — deve retornar 200
3. Navegar para `https://pocketdm.com.br` — landing page deve carregar
4. Screenshot da landing page: `landing-health.png`
5. Verificar console — zero errors criticos
6. Iniciar o arquivo `qa-report.md` com header e timestamp

---

### FASE 1 — Landing Page & Paginas Publicas (15 min)

Testar todas as paginas publicas sem login.

**1.1 Landing Page**
- Navegar para `/`
- Verificar: hero section, stats strip, navbar com Login/Sign Up
- Clicar "Pricing" — verificar pagina de precos
- Voltar, clicar no CTA principal ("Try Free" ou equivalente)
- Screenshot: `landing-hero.png`, `landing-pricing.png`

**1.2 Compendium Publico**
- Navegar para `/monsters` — lista de monstros SRD carrega
- Clicar em um monstro (ex: "Goblin") — stat block aparece
- Navegar para `/spells` — lista de magias carrega
- Clicar em uma magia (ex: "Fireball") — detalhes aparecem
- Navegar para `/items` — itens carregam
- Navegar para `/races` — racas carregam
- Navegar para `/classes` — classes carregam
- Screenshot de cada: `public-monsters.png`, `public-spells.png`, etc.
- **VERIFICAR**: Nenhuma pagina publica mostra conteudo non-SRD (sem fontes VGM, MPMM, MTF)

**1.3 Versao PT-BR**
- Navegar para `/monstros` — verificar que e em portugues
- Navegar para `/magias` — verificar
- Screenshot: `public-monstros-ptbr.png`

**1.4 SEO & Meta**
- Verificar que cada pagina tem `<title>` e `<meta description>` preenchidos
- Nenhuma pagina mostra "Internal Server Error" ou tela branca

---

### FASE 2 — Guest Mode /try (20 min)

O fluxo mais critico — visitante sem login testa o app.

**2.1 Acesso ao /try**
- Navegar para `/try`
- Se aparecer modal "Session expired", clicar "Start new combat"
- Verificar que a pagina de setup carrega sem exigir login
- Screenshot: `try-setup.png`

**2.2 Guided Tour (se aparecer)**
- Se o tour iniciar automaticamente, navegar pelos passos
- Verificar que pode ser pulado (Skip)
- Screenshot: `try-tour.png`

**2.3 Criar Combate (Happy Path)**
- Clicar "Load encounter" (encounter pre-feito) OU adicionar manualmente:
  - Buscar "Goblin" no SRD search → adicionar
  - Adicionar combatente manual: Nome="Hero", HP=40, AC=16, Init=18
- Verificar lista de combatentes
- Screenshot: `try-setup-filled.png`
- Clicar "Start Combat"
- Verificar que combate ativo aparece com initiative order
- Screenshot: `try-combat-active.png`

**2.4 Core Combat Loop**
- Avancar turno (Next Turn) — verificar que o turno muda
- Clicar no HP de um combatente → adjuster aparece
- Aplicar 5 de dano → verificar HP atualizou e barra mudou
- Aplicar cura (heal mode) → verificar HP subiu
- Aplicar condicao (ex: Frightened) → verificar badge aparece
- Screenshot de cada acao: `try-damage.png`, `try-heal.png`, `try-condition.png`

**2.5 Compendium Browser (Dialog)**
- Clicar no botao de Compendium na toolbar
- Verificar que dialog abre com 9 tabs
- Testar cada tab:
  - **All**: buscar "Fire" → resultados cross-category
  - **Spells**: buscar "Cure" → clicar resultado → detail view
  - **Monsters**: buscar "Dragon" → clicar → stat block
  - **Conditions**: buscar "Frightened" → clicar → descricao
  - **Items**: buscar "Sword" → clicar → detail
  - **Feats**: buscar "Alert" → clicar → detail
  - **Abilities**: buscar "Rage" → clicar → badge "Class Feature" + source "barbarian"
  - **Races**: buscar "Elf" → clicar → Size/Speed/Languages/Traits
  - **Backgrounds**: buscar "Acolyte" → clicar → Skills/Feature
- Fechar dialog
- Screenshot por tab: `try-compendium-spells.png`, `try-compendium-abilities.png`, etc.

**2.6 Encerrar Combate**
- Clicar "End combat" → confirmar
- Verificar que recap/awards aparece (ou volta pro setup)
- Screenshot: `try-combat-end.png`

**2.7 Guest Upsell**
- Verificar que banner de signup esta visivel durante/apos combate
- Clicar no CTA de signup — verificar que vai pra `/auth/sign-up`
- Screenshot: `try-upsell-banner.png`

---

### FASE 3 — Login & Dashboard DM (15 min)

**3.1 Login DM PT-BR**
- Navegar para `/auth/login`
- Preencher email: `dm.primary@test-taverna.com`, senha: `TestDM_Primary!1`
- Clicar Login
- Verificar redirect para `/app/dashboard`
- Screenshot: `dm-dashboard.png`

**3.2 Dashboard Content**
- Verificar que dashboard mostra conteudo (campanhas, sessoes, ou wizard)
- Verificar sidebar/nav com links: Sessions, Campaigns, Characters, Settings
- Navegar para cada secao e verificar que carrega
- Screenshot: `dm-sessions.png`, `dm-campaigns.png`, `dm-settings.png`

**3.3 Compendium Logado**
- Navegar para `/app/compendium`
- Verificar tabs: Monstros, Magias, Classes, Itens, Talentos, Antecedentes, Racas, Condicoes
- Clicar em "Racas" → verificar que carrega (157 entradas no auth mode)
- Buscar um monstro → verificar stat block
- Screenshot: `dm-compendium.png`

**3.4 Command Palette**
- Apertar Ctrl+K → verificar que Command Palette abre
- Buscar "Goblin" → verificar resultados
- Fechar com Escape
- Screenshot: `dm-command-palette.png`

---

### FASE 4 — DM Cria Sessao de Combate (20 min)

**4.1 Nova Sessao**
- Navegar para `/app/session/new`
- Verificar pagina de setup
- Screenshot: `dm-session-new.png`

**4.2 Adicionar Combatentes**
- Buscar "Goblin" no SRD search → adicionar 2x
- Buscar "Orc" → adicionar 1x
- Adicionar manual: "Thorin" HP=45 AC=18 Init=15 (Player)
- Adicionar manual: "Elara" HP=32 AC=15 Init=14 (Player)
- Screenshot: `dm-session-combatants.png`

**4.3 Gerar Link de Compartilhamento**
- Clicar "Share with players"
- Gerar link de compartilhamento
- **SALVAR O TOKEN** do link (vai precisar na Fase 5)
- Screenshot: `dm-share-link.png`

**4.4 Iniciar Combate**
- Clicar "Start Combat"
- Verificar que combate ativo aparece
- Verificar initiative order correta (por valor de initiative)
- Screenshot: `dm-combat-active.png`

**4.5 Acoes do DM**
- Avancar 2 turnos
- Aplicar 10 de dano no Goblin 1
- Aplicar condicao "Poisoned" no Goblin 2
- Curar Thorin (+5 HP)
- Screenshot apos cada acao: `dm-turn-2.png`, `dm-damage.png`, etc.

**4.6 Floating Cards**
- Clicar no nome de um monstro SRD (Goblin) → floating card deve abrir
- Verificar stat block no floating card
- Clicar no botao de Compendium → floating card NAO deve fechar (click-outside fix)
- Screenshot: `dm-floating-card.png`

---

### FASE 5 — Player Join & Realtime (25 min)

**IMPORTANTE**: Esta fase requer que o combate da Fase 4 ainda esteja ativo.
Se o combate foi encerrado, crie um novo na Fase 4 antes de continuar.

**5.1 Player Anonimo (/join)**
- Abrir nova aba/contexto do browser
- Navegar para `/join/[TOKEN]` (usar o token salvo na Fase 4)
- Verificar que lobby aparece (formulario de nome/initiative)
- Preencher: Nome="TestPlayer", Initiative=15
- Submeter
- Screenshot: `player-lobby.png`

**5.2 Aprovar no DM**
- Voltar pra aba do DM
- Verificar que toast de "Aceitar" aparece
- Clicar "Aceitar"
- Screenshot: `dm-approve-player.png`

**5.3 Player View**
- Voltar pra aba do player
- Verificar que player view aparece com:
  - Initiative list com todos os combatentes
  - HP bars usando TIERS (nao numeros exatos para monstros)
  - Indicador de turno atual
  - Condicoes visiveis nos combatentes
- Screenshot: `player-view.png`

**5.4 Realtime Sync**
- Na aba do DM: avancar turno
- Na aba do player: verificar que turno atualizou em tempo real
- Na aba do DM: aplicar dano em um monstro
- Na aba do player: verificar que HP bar mudou
- Screenshot: `player-realtime-sync.png`

**5.5 Anti-Metagaming**
- Na aba do player: verificar que HP dos monstros mostra apenas tier (FULL/HEAVY/MODERATE/CRITICAL)
- Na aba do player: verificar que HP do proprio player mostra numero exato
- Na aba do player: verificar que controles de DM (Next Turn, HP adjust) NAO aparecem
- Screenshot: `player-anti-metagaming.png`

---

### FASE 6 — Mobile Viewport (15 min)

Redimensionar o browser para viewport mobile (390x844 — iPhone 14) e re-testar fluxos criticos.

**6.1 Landing Mobile**
- Redimensionar viewport: `browser_resize` para 390x844
- Navegar para `/`
- Verificar: hamburger menu, sem overflow horizontal
- Screenshot: `mobile-landing.png`

**6.2 /try Mobile**
- Navegar para `/try`
- Carregar encounter pre-feito
- Iniciar combate
- Verificar: sem overflow, botoes com touch target >= 44px
- Avancar turno, aplicar dano
- Abrir Compendium dialog — verificar tabs scrollaveis
- Screenshot: `mobile-try-combat.png`, `mobile-compendium.png`

**6.3 Player View Mobile**
- Navegar para `/join/[TOKEN]` (se tiver token ativo)
- Verificar player view sem overflow
- Screenshot: `mobile-player-view.png`

**6.4 Dashboard Mobile**
- Login como DM
- Verificar dashboard mobile layout
- Screenshot: `mobile-dashboard.png`

---

### FASE 7 — i18n Bilingual (10 min)

**7.1 DM PT-BR**
- Fazer login como DM_PRIMARY (pt-BR)
- Verificar dashboard em portugues
- Criar sessao → verificar botoes em portugues ("Iniciar Combate", etc.)
- Navegar ao compendium → tabs em portugues
- Screenshot: `i18n-ptbr-dashboard.png`, `i18n-ptbr-combat.png`

**7.2 DM English**
- Fazer logout
- Login como DM_ENGLISH (en)
- Verificar dashboard em ingles
- Navegar ao compendium → tabs em ingles (Monsters, Spells, etc.)
- Screenshot: `i18n-en-dashboard.png`, `i18n-en-compendium.png`

---

### FASE 8 — Auth & Edge Cases (15 min)

**8.1 Login/Logout**
- Testar login com credenciais invalidas → verificar mensagem de erro
- Testar login valido → verificar redirect
- Testar logout → verificar que volta pra landing/login

**8.2 Link Invalido**
- Navegar para `/join/token-invalido-xyz` → verificar erro amigavel (nao 500)
- Screenshot: `edge-invalid-link.png`

**8.3 Pagina 404**
- Navegar para `/pagina-que-nao-existe` → verificar pagina 404 amigavel
- Screenshot: `edge-404.png`

**8.4 Session Persistence**
- Em combate ativo, dar refresh (F5) → verificar que estado foi preservado
- Screenshot: `edge-refresh-preserved.png`

---

### FASE 9 — Sentry & Error Monitoring (10 min)

**9.1 Console Errors**
- Revisar TODOS os console errors acumulados durante os testes
- Documentar cada erro com: pagina, mensagem, severidade

**9.2 Verificar Sentry** (se tiver acesso)
- Navegar para Sentry dashboard
- Filtrar por ultimas 24h
- Verificar se ha novos erros relacionados a "compendium", "race", "ability", "background"

**9.3 Verificar Supabase**
- Se tiver acesso ao Supabase dashboard, verificar tabela `error_logs`
- `SELECT * FROM error_logs WHERE created_at > NOW() - INTERVAL '2 hours'`

---

### FASE 10 — Paginas Publicas SEO Deep Dive (10 min)

Testar TODAS as paginas de SEO/compendium publico:

```
/monsters, /spells, /items, /conditions, /races, /classes, /feats
/monstros, /magias, /itens, /condicoes, /racas, /classes-pt, /talentos
/about, /faq, /methodology, /pricing
```

Para cada pagina:
- Verificar que carrega (nao 500, nao branca)
- Verificar que tem conteudo (nao "Loading..." infinito)
- Verificar title tag existe
- Screenshot se algo estiver errado

---

### FASE 11 — Stress & Repetition (ate tokens acabarem)

Se ainda tiver tokens, repetir fluxos criticos com variacoes:

**11.1 Multiplos Combates**
- Criar 3 combates seguidos com combatentes diferentes
- Verificar que cada um funciona independentemente

**11.2 Combate Longo**
- Criar combate com 8+ combatentes
- Avancar 5+ rounds
- Aplicar dano variado, condicoes, curas
- Derrotar combatentes
- Verificar que initiative order se ajusta

**11.3 Tabs do Compendium com Buscas Variadas**
- Abilities: buscar "Sneak Attack", "Divine Smite", "Wild Shape"
- Races: buscar "Dwarf", "Human", "Tiefling"
- Backgrounds: buscar "Criminal", "Noble", "Soldier"
- Monsters: buscar "Ancient Red Dragon", "Tarrasque", "Beholder"

**11.4 Player View Stress**
- Abrir 2-3 player contexts simultaneos
- Verificar que todos veem o mesmo estado
- DM faz acao → todos os players atualizam

**11.5 Audit de Acessibilidade**
- Verificar que botoes tem labels (aria-label ou texto visivel)
- Verificar que dialogs tem role="dialog"
- Verificar que inputs tem labels associados

---

## FORMATO DO REPORT

Ao final de cada fase, adicionar ao `qa-evidence/autonomous/qa-report.md`:

```markdown
## Fase N — [Nome da Fase]
**Status**: PASS / PARTIAL / FAIL
**Duracao**: ~X min
**Timestamp**: YYYY-MM-DD HH:MM

### Resultados
| Teste | Status | Evidencia | Notas |
|-------|--------|-----------|-------|
| N.1 Nome | PASS | screenshot.png | — |
| N.2 Nome | FAIL | screenshot.png | Bug: descricao |

### Bugs Encontrados
- **BUG-001**: [Severidade] Descricao completa do bug
  - Pagina: URL
  - Steps to reproduce: 1, 2, 3
  - Expected: X
  - Actual: Y
  - Screenshot: `bug-001.png`

### Console Errors
- [ERROR] mensagem (pagina, count)
```

---

## DECISOES AUTONOMAS — GUIA

| Situacao | Decisao |
|----------|---------|
| Modal de "Session expired" | Clicar "Start new combat" |
| Cookie consent banner | Aceitar e continuar |
| Tour/onboarding | Pular (Skip) a menos que esteja testando o tour |
| Redirect inesperado | Documentar e voltar ao fluxo |
| Timeout/loading infinito | Esperar 30s max, depois documentar como FAIL e seguir |
| Erro 500 | Screenshot, documentar, seguir pro proximo teste |
| Elemento nao encontrado | Tentar alternativa (texto, role, xpath), documentar se falhar |
| Login falha | Tentar com credenciais alternativas (DM_ENGLISH), documentar |
| Combate nao inicia | Tentar "Quick Combat", documentar o erro |
| Player join falha | Documentar como FAIL, seguir para fase seguinte |

---

## COMO COMECAR

1. Criar diretorio: `mkdir -p qa-evidence/autonomous`
2. Iniciar o report: escrever header em `qa-evidence/autonomous/qa-report.md`
3. Abrir o browser Playwright e navegar para `https://pocketdm.com.br`
4. Comecar pela **Fase 0** e seguir em ordem
5. **NAO PARE ATE OS TOKENS ACABAREM**

Boa sorte, agente. A taverna depende de voce.
