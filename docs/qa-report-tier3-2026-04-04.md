# QA Report — Tier 3 Cobertura Completa

**Data:** 2026-04-04
**Testador:** Claude Code (Playwright MCP)
**Ambiente:** localhost:3000 (dev)
**Credenciais:** dm.primary@test-taverna.com / player.warrior@test-taverna.com

---

## CHECKLIST FINAL

| # | Jornada | Status | Bugs Encontrados | Observações UX |
|---|---------|--------|-----------------|----------------|
| 8 | Player Characters | **FAIL** | 2 críticos, 2 UX | Criação 500, sem feedback de erro |
| 11 | Quests, Locais, Facções | **PARTIAL PASS** | 1 crítico, 2 text | CRUD funcional, campanha crash |
| 14 | DM Returning | **PASS** | 0 críticos, 2 UX | Dashboard orientador, falta contexto temporal |
| 15 | Empty States & Boundaries | **PASS** | 0 | XSS/SQLi seguros, empty states com CTA |
| 17 | Shareability & Social | **PARTIAL PASS** | 3 bugs | OG tags presentes, image endpoint broken |
| 18 | Accessibility | **PASS** | 1 UX | ARIA OK, Escape dismiss OK, zoom OK |

---

## BUGS CRÍTICOS (Bloqueiam Beta)

### BUG-T3-01: Criar Personagem retorna 500 (Player Characters)
- **Severidade:** CRITICAL
- **Passos:** Login como player → Personagens → Criar Personagem → Preencher form → Clicar "Criar Personagem"
- **Resultado:** 500 Internal Server Error. Modal permanece aberta sem feedback.
- **Causa raiz:** RLS policies em `player_characters` não suportam standalone characters (`campaign_id IS NULL`). Precisam policies para `campaign_id IS NULL AND user_id = auth.uid()`.
- **Impacto UX:** Zero feedback de erro. Usuário não sabe o que aconteceu.
- **Fix necessário:** (1) Adicionar RLS policies para standalone characters; (2) Adicionar toast de erro + loading state no botão.
- **Screenshot:** `qa-evidence/tier3/j8-04-create-char-500-no-feedback.png`

### BUG-T3-02: Campanha "Minas de Phandelver QA" crash persistente
- **Severidade:** CRITICAL
- **Passos:** Navegar para campanha → Interagir com Locais (criar, toggle descoberto) → Crash "Algo Deu Errado"
- **Resultado:** Error boundary ativa. Navegação direta para a campanha também crasha (persistente).
- **Impacto:** DM perde acesso à campanha inteira. Precisa hard refresh ou outra campanha.
- **Screenshot:** `qa-evidence/tier3/j11-08-campaign-crash.png`

---

## BUGS MÉDIOS

### BUG-T3-03: og:image endpoint retorna empty reply
- **Severidade:** MEDIUM
- **Passos:** `curl http://localhost:3000/opengraph-image` → Empty reply from server
- **Impacto:** Preview social sem imagem (WhatsApp, Twitter, Discord mostram link sem thumbnail).

### BUG-T3-04: Title duplicado em páginas de compêndio
- **Severidade:** LOW
- **Passos:** Navegar para `/monstros/goblin` ou `/magias/fireball`
- **Resultado:** Title = "Goblin — Ficha D&D 5e | Pocket DM **| Pocket DM**" (duplicado)
- **Fix:** Remover sufixo duplicado na template de metadata.

### BUG-T3-05: Monster/Spell pages sem og:image
- **Severidade:** LOW
- **Passos:** Inspecionar meta tags em `/monstros/goblin`
- **Resultado:** og:title e og:description presentes, mas og:image ausente.
- **Fix:** Adicionar og:image com fallback para imagem do monstro/spell ou imagem genérica do app.

### BUG-T3-06: Nome de combate duplicado no dashboard
- **Severidade:** LOW
- **Passos:** Dashboard DM → Combates em Andamento
- **Resultado:** "First EncounterFirst Encounter" — nome renderizado 2x.
- **Screenshot:** `qa-evidence/tier3/j11-01-dm-dashboard.png`

### BUG-T3-07: Texto de pluralização incorreto
- **Severidade:** LOW
- **Locais:** Dashboard → "1 jogadores" (deveria ser "1 jogador"), "sessoes" (deveria ser "sessões")

---

## ACHADOS DE UX (Não são bugs, são oportunidades)

### UX-01: Dashboard do Player mostra ações de DM
- **Problema:** Player logado vê "Criar NPC", "Convidar Jogador", "Novo Combate" — todas ações de DM.
- **Sugestão:** Usar o campo "Papel" (Settings → Jogador/Mestre/Ambos) para filtrar quick actions e personalizar o dashboard por role.
- **Impacto:** Confusão de identidade. Player pensa que está no lugar errado.

### UX-02: Falta "última atividade" nos cards de campanha
- **Problema:** DM retornando não sabe quando foi a última sessão de cada campanha.
- **Sugestão:** Adicionar "Última sessão: 3 dias atrás" ou data absoluta no card.

### UX-03: Presets e Settings sem sidebar
- **Problema:** `/app/presets` e `/app/settings` perdem a sidebar de navegação lateral. Inconsistência de layout.
- **Sugestão:** Manter sidebar em todas as páginas do dashboard ou adicionar breadcrumb.

### UX-04: Form state persiste após fechar modal de criação
- **Problema:** Fechar modal de "Criar Personagem" e reabrir mostra dados anteriores.
- **Sugestão:** Resetar form ao fechar modal.

### UX-05: Nenhum feedback de erro em formulários que falham
- **Problema:** Criar personagem falha silenciosamente — sem toast, sem loading spinner, sem mensagem.
- **Sugestão:** Padrão: (1) loading spinner no botão, (2) toast de sucesso/erro, (3) desabilitar botão durante submit.

---

## TESTES DE SEGURANÇA — TODOS PASS

| Teste | Input | Resultado |
|-------|-------|-----------|
| XSS via nome NPC | `<script>alert('xss')</script>` | Escapado por React. Sem execução. |
| SQL Injection via quest | `'; DROP TABLE npcs; --` | Armazenado como texto puro. Supabase parameterizado. |
| Quest vazia | Enter no campo vazio | Bloqueado. Nenhuma quest criada. |
| Caracteres especiais | `L'Élu du Dragon — Missão #3 🐉` | Renderizado corretamente. |
| Nome vazio em personagem | Campo vazio | Botão disabled. Validação client-side OK. |

---

## TESTES DE ACESSIBILIDADE

| Teste | Resultado |
|-------|-----------|
| ARIA labels em botões de ícone | **PASS** — 0 botões sem aria-label (32 testados) |
| Inputs com labels | **PASS** — todos com label, aria-label ou placeholder |
| Escape dismiss em modais | **PASS** — modal fecha com Escape |
| Zoom 200% | **PASS** — layout não quebra, texto legível |
| Skip to content | **PARTIAL** — presente no dashboard, ausente na landing |
| Focus rings | **NOTA** — sutis (background highlight), sem outline forte |

---

## TESTES DE OG TAGS

| Página | og:title | og:description | og:image | og:type | twitter:card |
|--------|----------|---------------|----------|---------|-------------|
| Landing `/` | Pocket DM — Master your table. | Completo | URL existe (mas retorna empty) | website | summary_large_image |
| Monster `/monstros/goblin` | Goblin — Ficha D&D 5e \| Pocket DM | CR, CA, PV | **AUSENTE** | article | summary_large_image |
| Spell `/magias/fireball` | Fireball — Magia D&D 5e \| Pocket DM | Nível, escola | **AUSENTE** | article | summary_large_image |
| Dashboard `/app/dashboard` | Genérico (Pocket DM) | Genérico | URL genérica | website | summary_large_image |
| **Info privada vazada?** | **NÃO** | **NÃO** | N/A | N/A | N/A |

---

## MÉTRICAS RESUMO

| Métrica | Valor |
|---------|-------|
| Empty states com CTA | 5/5 testados (personagens, campanhas, combates, quests, locais, facções) |
| XSS/injection encontrados | **NÃO** (0/2 vetores testados) |
| Console errors por página | 2-3 (hydration mismatch OracleAIModal, script tag warning, parentNode null) |
| OG tags ausentes | og:image em monster/spell pages |
| Focus ring visível | Sim, mas sutil |
| ARIA labels ausentes | 0 |

---

## FUNCIONALIDADES TESTADAS E FUNCIONAIS

- **Quests CRUD:** Criar (Enter), expandir, editar nome/descrição, status cycling (Disponível→Ativa→Concluída), deletar com confirmação, toggle visibilidade
- **Locais CRUD:** Criar, tipos (Cidade/Masmorra/Selva/Construção/Região), toggle descoberto, descrição, deletar
- **Facções CRUD:** Criar, alinhamentos (Aliada/Neutra/Hostil) com cores (verde/cinza/vermelho), toggle visibilidade, deletar
- **Soundboard:** 9 presets de ambiente, upload de sons custom (0/5), tabs (Ambiente/Música/Efeitos)
- **Settings:** Perfil, role selector (Jogador/Mestre/Ambos), plano, tabs funcionais
- **Login/Logout:** Funcional para DM e Player
- **Error boundary:** Funcional — mostra "Algo Deu Errado" com "Tentar novamente" e "Ir para Dashboard"

---

## SCREENSHOTS SALVOS

Todos em `qa-evidence/tier3/`:
- `j8-01-player-dashboard.png` — Dashboard do player
- `j8-02-characters-empty.png` — Empty state personagens
- `j8-03-create-character-modal.png` — Modal criação personagem
- `j8-04-create-char-500-no-feedback.png` — Erro 500 sem feedback
- `j11-01-dm-dashboard.png` — Dashboard DM
- `j11-02-campaign-view.png` — Vista da campanha
- `j11-03-quest-created.png` — Quest criada
- `j11-04-quest-active-status.png` — Quest status ativa
- `j11-05-quest-completed-status.png` — Quest concluída
- `j11-06-quest-deleted.png` — Quest deletada
- `j11-07-locations-created.png` — Locais criados
- `j11-08-campaign-crash.png` — Crash da campanha
- `j11-09-factions-alignment.png` — Facções com alinhamentos
- `j14-01-dm-dashboard-return.png` — Dashboard DM retornando
- `j14-02-soundboard.png` — Soundboard
- `j14-03-presets.png` — Presets
- `j14-04-settings.png` — Configurações
- `j15-01-sql-injection-safe.png` — SQL injection como texto puro
- `j18-01-focus-ring-landing.png` — Focus ring na landing
- `j18-02-zoom-200.png` — Zoom 200%
