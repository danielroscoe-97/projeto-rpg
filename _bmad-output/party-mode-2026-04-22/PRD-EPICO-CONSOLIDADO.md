# 📜 PRD ÉPICO — Pocket DM · Campaign HQ + Player HQ Redesign

**Versão:** v0.4 — consolidação das 2 sessões
**Datas de origem:** 2026-04-21 (Campaign HQ + modes canônicos) + 2026-04-22 (Player HQ deep dive + densificação)
**Data desta consolidação:** 2026-04-23
**Owner:** Dani Roscoe (`danielroscoe97@gmail.com`)
**Status:** 🎯 Spec consolidado, 36 decisões travadas, pronto pra implementação faseada
**Codinome:** `Grimório`

---

## ✨ Como ler esse documento

Esse PRD é o **único ponto de verdade** pra implementar o redesign do Pocket DM. Ele substitui a necessidade de abrir múltiplos docs pra entender o "por quê" e o "o quê" — só entra em docs satélites pra detalhe extremo.

### Se você tem 5 minutos
Leia §1 (Manifesto), §2 (36 decisões canônicas), §12 (métricas).

### Se você tem 30 minutos
Adicione §3 (vocabulário), §4 (arquitetura macro), §6 (topologia do Player HQ), §11 (plano).

### Se você vai implementar
Leia tudo + satélites:
- [01-player-journey.md](./01-player-journey.md) — 12 fluxos passo-a-passo
- [02-topologia-navegacao.md](./02-topologia-navegacao.md) — transições + badges
- [03-wireframe-heroi.md](./03-wireframe-heroi.md) — detalhes visuais Herói
- [04-wireframe-arsenal.md](./04-wireframe-arsenal.md) + [05-wireframe-diario.md](./05-wireframe-diario.md) + [06-wireframe-mapa.md](./06-wireframe-mapa.md)
- [07-spec-funcional.md](./07-spec-funcional.md) — matriz estados × ações × erros
- [08-design-tokens-delta.md](./08-design-tokens-delta.md) — tokens novos
- [09-implementation-plan.md](./09-implementation-plan.md) — 4 fases, stories, riscos
- [10-mermaid-flows.md](./10-mermaid-flows.md) — diagramas de fluxo

### Docs anteriores (fonte do que foi consolidado aqui)
- [SESSION-HANDOFF-2026-04-21.md](../qa/evidence/campaign-audit-2026-04-21/SESSION-HANDOFF-2026-04-21.md) — handoff da 1ª sessão
- [redesign-proposal.md](../qa/evidence/campaign-audit-2026-04-21/redesign-proposal.md) — v0.3 com §13 decisões 1-26
- [10-modes-user-journeys.md](../qa/evidence/campaign-audit-2026-04-21/10-modes-user-journeys.md) — jornadas funcionais do Mestre e Jogador
- [DESIGN-SYSTEM.md](../qa/evidence/campaign-audit-2026-04-21/DESIGN-SYSTEM.md) — alma do Grimório
- [schema-investigation-winston.md](../architecture/schema-investigation-winston.md) — 1 migration nova
- [screenshots/](./screenshots/) — 10 PNGs de evidência real da auditoria 2026-04-22

---

## §1. Manifesto & Visão

### 1.1 Problema em uma frase

> O Pocket DM tinha uma **Campaign HQ com 13 abas em pill bar** (Mestre vinha de Notion/Obsidian/Roll20/Foundry e não encontrava lugar pra nenhum dos 4 bem feitos) e uma **Player HQ com 7 tabs** onde **50% do viewport é desperdiçado** em desktop, modifiers de atributo escondidos em accordion, e 3 tabs inteiros servem apenas pra exibir empty states.

### 1.2 Visão dos 3 horizontes

- **Horizonte 0 (hoje):** ferramenta de tracking de combate com 3k usuários ativos. Forte em Rodar Combate, frágil em Preparar e Player HQ.
- **Horizonte 1 (este redesign):** **Grimório moderno** — Mestre compõe mundo em prep, conduz a mesa em run, cronica em recap. Jogador vive a campanha em journey (ficha + quests + diário + mapa). Tudo com vocabulário ubíquo travado e hierarquia visual respirada.
- **Horizonte 2 (roadmap pós-MVP):** backlinks `@` com parser async, PWA push pro banner de combate, IA rascunhando recap, aprendizado sobre comportamento dos Jogadores.

### 1.3 Arquétipos do produto (reforço do DESIGN-SYSTEM §1.1)

| Arquétipo | Quando aparece | Como se manifesta |
|---|---|---|
| 🜃 **O Escriba** | Modo Preparar Sessão (Mestre), Minhas Notas (Jogador), Recaps | Calmo, paciente, metódico. Cinzel em nomes próprios. Espaço branco generoso. |
| ⚔ **O Mestre da Mesa** | Modo Rodar Combate, **modo combate auto do Jogador** | Preciso, sob pressão, ritmado. Alto contraste. Ação em <1 clique. |
| 📜 **O Cronista** | Recap publicado, timeline, histórico | Memória viva. Narrativa primeiro, número depois. |

### 1.4 3 JTBDs do Jogador (reconfirmados hoje com evidência)

| JTBD | Frequência | Tab primária (pós-redesign) |
|---|---|---|
| 🔥 **Rastrear volátil** em combate (HP, slots, efeitos, condições) | Alta (toda sessão) | Herói (modo combate auto) |
| 🧘 **Consultar stats rápido** (AC, modifiers, proficiências, spells) | Muito alta (dezenas por sessão) | Herói (ribbon sticky + chips) |
| 📖 **Registrar memória** (notas, NPCs, quests, diário) | Média (pós-sessão + alguns momentos em sessão) | Diário |

---

## §2. 36 Decisões Canônicas Travadas

**Regra:** qualquer implementação que contrarie uma dessas decisões é bug. Mudança exige review explícito (escrever contra-proposta em doc separado, aprovação do Dani).

### Parte I — Decisões de 2026-04-21 (#1-26) · Campaign HQ + Modes

#### Filosofia (1-15)
1. ✅ **Eliminar pill bar horizontal** — substituída por mode switcher no shell.
2. ✅ **Shell unificado Mestre + Jogador** — mesma sidebar, tabs visíveis mudam por role.
3. ✅ **Mode switcher > pill bar** — 3 ícones grandes (Mestre), 1 (Jogador).
4. ✅ **Busca rápida Ctrl+K é first-class** — sempre acessível, de qualquer mode/surface.
5. ✅ **Empty states têm copy por role** — Mestre ("criar", "adicionar"), Jogador ("aguardando Mestre").
6. ✅ **1 CTA dominante por combate ativo** — no Mestre: "Próximo Turno". No Jogador: "Entrar no Combate" (banner sticky).
7. ✅ **Mode é stateless derivado do server** — nunca salvar em localStorage.
8. ✅ **Matriz Surface × Auth explícita** — Guest/Anônimo/Autenticado com capacidades declaradas.
9. ✅ **Read-only lock em Prep/Recap durante combate** — evita desync.
10. ✅ **Labels PT-BR na UI** — "Preparar Sessão" / "Rodar Combate" / "Recaps" / "Minha Jornada".
11. ✅ **Ctrl+K primário, ⌘K alternativa Mac** — atalho global.
12. ✅ **Density budget: ≤8 elementos above-the-fold** (atualizado em hoje — ver #30).
13. ✅ **Serif (Cinzel) só em nomes próprios** — nomes de NPCs, Locais, Sessões, Facções.
14. ✅ **SVG gold em sistema / emoji em narrativa (mix)** — memória `feedback_svg_sem_emojis`.
15. ✅ **4 killer-features committed** — backlinks, tags, permissões granulares, handouts.

#### Técnicas (16-20)
16. ✅ **Rotas EN curtas** — `/prep`, `/run`, `/recap`, `/journey` (roadmap; hoje `/sheet` = alias de `/journey`).
17. ✅ **Jogador anônimo vê Minha Jornada light** — sem mini-wiki, sem chat persistente.
18. ✅ **Mode switcher vertical desktop + bottom tab mobile.**
19. ✅ **Tour dismissable com "Pular" visível.**
20. ✅ **Backlinks `@nome` primário + `[[nome]]` alternativo.**

#### Canônicas (21-22)
21. ✅ **Mode enum canônico:** `type Mode = 'prep' | 'run' | 'recap' | 'journey'` (EN código, PT-BR UI).
22. ✅ **HP tiers canônicos:** `FULL` 100% · `LIGHT` 70-100% · `MODERATE` 40-70% · `HEAVY` 10-40% · `CRITICAL` 0-10%. Labels EN nos 2 locales. Source: [lib/utils/hp-status.ts](../../lib/utils/hp-status.ts).

#### Revisão v0.3 (23-26)
23. ✅ **Watch mode REMOVIDO.** Jogador NÃO tem auto-switch pra tela de combate. Banner sticky + CTA "Entrar no Combate" → navega pra `/app/combat/[id]` existente.
24. ✅ **Mini-wiki do Jogador** em `my_notes` (dentro de journey, subtab do Diário neste redesign). MVP: markdown + tags. Roadmap: backlinks `@`.
25. ✅ **Quests atribuíveis via entity graph existente** — `campaign_mind_map_edges` já polymórfica. ZERO tabelas novas.
26. ✅ **Modes separados por papel** — Mestre tem 3, Jogador tem 1 (journey). Nunca sobreposição.

### Parte II — Decisões de 2026-04-22/23 (#27-36) · Player HQ Deep Dive

27. ✅ **Densidade visual app-wide é regra imutável.** Memória `feedback_densidade_visual`. Desktop de 1440px precisa usar ≥92% da largura útil. Escala 4/8 rígida.
28. ✅ **Topologia INTERNA do journey: 4 sub-tabs** (dentro de `/sheet` ou `/journey`):
    - **Herói** (default) — ficha viva
    - **Arsenal** — habilidades + inventário + attunement
    - **Diário** — notas + quests + NPCs conhecidos + recaps + mini-wiki
    - **Mapa** — mind map (mínimas mudanças)
    **Substitui** as 7 tabs antigas (Mapa/Ficha/Recursos/Habilidades/Inventário/Notas/Quests).
29. ✅ **Label "Herói"** (decisão explícita Dani 2026-04-22 após rejeição de "Cockpit"). **Ícone:** `Heart` (Lucide), gold #D4A853.
30. ✅ **Density budget refinado** — desktop Player HQ: ≥15 elementos úteis above-the-fold (HP + HP temp + AC + Init + Speed + CD Magia + 6 ability chips + 2 resumos de recursos). Supera o budget genérico de ≤8 por ser contexto cockpit.
31. ✅ **Ribbon superior sticky** em todos os 4 tabs do journey. Altura desktop ~56px, mobile ~48px compacto. Contém: HP bar + controles +/- + AC + Init + Speed + Inspiration + CD Magia (se caster) + resumo slots.
32. ✅ **Ability scores NUNCA em accordion** — sempre visíveis como chips na coluna A de Herói. Remove o `showAttributes` toggle de [CharacterCoreStats.tsx:131](../../components/player-hq/CharacterCoreStats.tsx#L131).
33. ✅ **Modo combate auto** — quando `campaigns.combat_active = true`, UI reorganiza:
    - Badge pulsante `⚔` na aba Herói (mesmo que usuário esteja em outra tab)
    - Banner superior em Herói: "⚔ Round N · Turno de [Nome] · próximo: [Nome]"
    - Coluna A colapsa perícias secundárias; Coluna B expande slots + efeitos
    - **Nunca força troca de tab** — jogador escolhe. Destaca, não prende.
34. ✅ **Default tab do Player HQ = Herói** (hoje é Mapa). Deep link via `?tab=heroi|arsenal|diario|mapa`. Persistência `localStorage` 24h TTL.
35. ✅ **Desktop + Mobile ambos MVP em todas as 4 tabs do journey** (UPDATED 2026-04-24 por Dani — MVP cut). Mobile mantém single-column (já funciona bem em 390px). Sem fase "mobile depois" — cada story da Fase A-E entrega as 2 viewports. QA matrix cobre 390px × 1440px; Playwright roda em 2 viewports.
36. ✅ **Reconciliação vocabular: "Diário" já existia no glossário** (#13, journal=Diário). Novos termos: **Herói** (tab), **Arsenal** (tab), **Ribbon Vivo** (componente), **Modo Combate Auto** (feature). Incluir no glossário ubíquo.
37. ✅ **Distinção canônica de dots — permanente vs transitório** (decisão Dani 2026-04-23):
    - **Permanente** (save proficient, skill proficient, idiomas, ferramentas, armaduras/armas prof): `○ = não tenho` · `● = tenho` (mantém padrão atual do código)
    - **Transitório** (spell slot, Canalizar Divindade, Intervenção Divina, Reaction, Action Surge, outros consumíveis): `○ = disponível` · `● = gasto/usado`
    - **Source-of-truth atual:** `CombatantRow.tsx:516-520` (reaction) já segue transitório. `SpellSlotTracker.tsx:117-121` e `ResourceDots.tsx:65` seguem o padrão antigo (invertido) — **precisam refactor em Fase C**.
    - **Por quê:** recursos consumíveis têm metáfora "checkbox de uso" — marco conforme gasto. Características permanentes têm metáfora "atributo presente" — marco o que tenho. Mesclar em uma convenção só quebra um dos dois.
38. ✅ **HP controls = botões semânticos Dano/Cura/Temp** (decisão Dani 2026-04-23). Reuso de [PlayerHpActions.tsx](../../components/player/PlayerHpActions.tsx) existente do combate do player. Nunca usar botões +/- genéricos no ribbon.
39. ✅ **Ribbon Vivo tem 2 linhas** (decisão Dani 2026-04-23):
    - **Row 1 (core stats):** HP bar + Dano/Cura/Temp + AC + Init + Speed + Inspiration + CD Magia
    - **Row 2 (estados temporais):** Condições ativas (chips coloridos) + Efeitos ativos com duração e badge "conc" + **Slots clicáveis** (dots 16px visual)
    - Justificativa: tudo que afeta rolagem ou turno atual visível sem precisar trocar de tab. Condições e efeitos são moduladores constantes.
    - Overflow: se >3 condições ou >3 efeitos, mostra primeiros + "+N" link pra drawer completo.
    - **Slot dots no ribbon:** 16px visual + área invisível de 44×44px (regra WCAG mobile). Hover dá scale 1.15 + glow gold. Padrão já existe em [ResourceDots.tsx:9-13](../../components/player-hq/ResourceDots.tsx#L9-L13) (`min-w-[44px] min-h-[44px]`).
    - **Mobile 390px:** row 2 colapsa em chips compactos. Slots vira chip "🪄 Slots 13/15" que abre popover com grid grande de dots. Efeitos vira chip "2 efeitos" que abre lista. Tudo com touch ≥44px.
41. ✅ **Wizard de Level Up — Mestre libera, Jogador roda** (decisão Dani 2026-04-23):
    - **Gatilho:** Mestre tem botão "Liberar Level Up" na sua UI. Escolhe destinatários (1 jogador, subset, ou party inteira) + nível alvo + mensagem opcional.
    - **Broadcast realtime:** evento `levelup:offered` chega ao Player HQ. Ribbon mostra chip dourado pulsante "🎉 Subir de Nível →" persistente até resolução.
    - **Wizard 6 passos:** Classe avança (multiclass) · HP (rolar/média) · ASI ou Feat (níveis canônicos) · Spells novas (se caster) · Features ganhas (preview) · Subclass choice (níveis canônicos).
    - **Validações:** HP mínimo, ASI vs Feat regras 5e, spells known limits, multiclass prereqs.
    - **Schema:** nova tabela `level_up_invitations` (ver §10.1.c). Total migrations: **3** (player_notes + player_favorites + level_up_invitations).
    - **Fallback:** botão `✎ Editar` no header continua existindo pra correções manuais ou level up sem wizard (Mestre pode override).
    - **Audit trail:** todas as escolhas salvas em `choices jsonb` pra histórico.
    - **Justificativa do Mestre como gatilho:** level up é momento narrativo, perde-se o ritual se jogador upa sozinho; Mestre teria que validar cada ficha manualmente. Padrão D&D Beyond + Roll20 + Foundry.
43. ✅ **Pós-combate sempre leva pro Herói** (decisão Dani 2026-04-23):
    - **Gatilho:** broadcast `combat:ended` da campanha do Jogador
    - **Comportamento por auth:**
      - **Autenticado:** Toast "Combate encerrado · Ver sua ficha →" com CTA pra `/sheet?tab=heroi`. Auto-redirect 5s se não interagir (configurável)
      - **Anônimo via `/join/token`:** `RecapCtaCard` inline com prompt "Crie conta grátis pra salvar". OAuth/Login com `redirectTo=/sheet?tab=heroi`. Claim de personagem auto-aplicado.
      - **Guest via `/try`:** comportamento atual mantido (não tem campanha persistente)
    - **Banner "Combate vencido!" no Herói:** aparece no topo do tab Herói quando jogador chega após combate. Mostra resumo (duração, dano tomado, slots usados, efeitos mantidos). Some em 30s ou ao clicar "Anotar →" (cria nota rápida).
    - **Status do código atual:** infra parcial — `RecapCtaCard` + `GuestRecapFlow` + trigger `"end-combat"` existem em `components/conversion/`. Gap: redirect default não aponta pro `/sheet?tab=heroi`. Banner "Combate vencido!" não existe.
    - **Story:** F13 vira A6 (quick win) — ajuste de `redirectTo` + criação do banner.
    - **JTBD:** capturar memória quente do combate (anotações, ajustes finos) + converter anônimos em contas no momento de maior investimento emocional.
44. ✅ **Ability chip = duas zonas clicáveis (CHECK + SAVE)** (decisão Dani 2026-04-23):
    - Cada chip de atributo (STR/DEX/CON/INT/WIS/CHA) tem **3 elementos visuais hierárquicos**:
      1. **Label** (nome do atributo, top)
      2. **Zona CHECK** — fundo escuro, número grande branco. Click = `1d20 + mod`. Usado em ability checks.
      3. **Zona SAVE** — fundo gold-soft, ícone 🛡 + número + dot proficient. Click = `1d20 + mod + PB` (se prof). Cor gold quando proficient.
      4. **Score** (valor base, footer)
    - **Cada zona é um botão de roll independente.** Hover mostra 🎲 no canto. Click rola e mostra resultado em toast/popover.
    - **Mobile:** zonas mantém touch target 44×44px via `::before` invisível (regra WCAG).
    - **Diferenciação visual obrigatória:** check sempre fundo escuro/neutro · save sempre fundo gold-soft (gold sólido se prof).
    - **Resultado do roll:** toast "STR check: 14 (12+2)" ou "CON save: 22 (14+8) ✅ vs DC 15" (DC vem do Mestre se contexto). Salvo em `roll_history` da campanha. Broadcast realtime pro Mestre.
    - **Story:** F5 já documenta o JTBD; nova story na Fase C (C7) implementa o roller inline.
45. ✅ **Cor de "concentração" = azul claro sky** (decisão Dani 2026-04-23):
    - Badge **`conc`** em spells/efeitos com concentration usa nova variável `--concentration: #7DD3FC` (azul claro sky).
    - **Antes:** estava com `--warning` (amarelo/laranja) — confundia com "atenção urgente".
    - **Por quê:** concentração não é warning, é estado neutro/encantamento. Azul claro sinaliza "vinculado a uma magia em manutenção" sem alarmar.
    - Aplicado em todos os badges: Ribbon row 2, Spell list, Active Effects, Spells conhecidas.
    - Tokens: `--concentration: #7DD3FC` · `--concentration-bg: rgba(125,211,252,0.18)` · `--concentration-border: rgba(125,211,252,0.45)`.
46. ✅ **Save dos ability chips é IGUAL ou MAIS importante em combate** (decisão Dani 2026-04-23):
    - No modo combate ativo, ability chips devem ser destacados (não simplificados).
    - Mobile combate: card de "Atributos & Saves" ganha border gold + background gold-tinted, indicando "info crítica de combate".
    - Em combate, jogador faz mais saves (Fireball, Hold Person, Fear) que ability checks. Esconder save ou simplificar é anti-cockpit.
    - **Implementação:** mesmo componente AbilityChip (decisão #44) renderiza igual, apenas o container ganha destaque em combate.
47. ✅ **Biblioteca de Favoritos** (decisão Dani 2026-04-23) — mini-wiki pessoal de referências do compêndio:
    - **Localização primária:** sub-aba 7 do Diário (`Diário > ⭐ Biblioteca`)
    - **Tipos cobertos:** magias, monstros, itens mágicos, feats/features, NPCs públicos
    - **Invocação tripla:** sub-aba (view curada) + Ctrl+K (busca rápida) + botão `⭐ Favoritar` em TODA ficha do compêndio do app
    - **Anotação:** cada favorito permite text note opcional do jogador
    - **Cross-context:** magias favoritadas TAMBÉM aparecem em `Herói > Spells > [⭐ Favoritas]` (filtro já existente no wireframe). Monstros/NPCs em Diário podem ter cross-nav pro Mapa
    - **Auth:** auth-only por default; anônimo armazena em sessionStorage temporário com prompt "Crie conta pra salvar"
    - **Schema:** nova migration `player_favorites` (ver §10.2). Total de migrations novas: 2 (player_notes + player_favorites).

### Regra absoluta travada em paralelo
**"Mestre", nunca "DM"** — UI, i18n, docs, commits, PRs, chat, comentários explicativos. Exceções só em código interno (`role='dm'`, `dmOnly` props, nome do produto "Pocket DM"). Memória `feedback_mestre_nao_dm`.

---

## §3. Vocabulário Ubíquo Aplicado

Extensão ao [docs/glossario-ubiquo.md](../../docs/glossario-ubiquo.md) com termos introduzidos pelo redesign.

### 3.1 Termos canônicos (já existentes)

| Conceito | EN (código) | PT-BR (UI) |
|---|---|---|
| Campanha | `campaign` | Campanha |
| Personagem | `character` | Personagem |
| Jogador | `player` | Jogador |
| Mestre | `dm` (interno) | **Mestre** (UI sempre) |
| Combate ao vivo | `combat` | Combate |
| Preset de combate | `encounter` | Encontro |
| Registro passado | `session` (legado) | Histórico |
| Objetivo narrativo | `quest` | Quest (inglês preservado) |
| NPC | `npc` | NPC |
| Local | `location` | Local |
| Facção | `faction` | Facção |
| Notas livres | `notes` | Notas |
| Diário pessoal | `journal` | **Diário** |

### 3.2 Termos NOVOS (introduzidos por este redesign) 🆕

| Conceito | EN (código) | PT-BR (UI) | Definição |
|---|---|---|---|
| Mode do Jogador | `journey` | **Minha Jornada** | Único mode do Jogador, shell-level. Mantido do #26. |
| Sub-tab identidade+recursos | `heroi` | **Herói** | Substitui Ficha+Recursos+parte de Habilidades. Default tab. |
| Sub-tab itens+features | `arsenal` | **Arsenal** | Substitui Inventário+Habilidades+Attunement. |
| Sub-tab narrativa | `diario` | **Diário** | Substitui Notas+Quests. Contém mini-wiki, recaps, NPCs conhecidos. |
| Componente fixo superior | `ribbon-vivo` | **Ribbon Vivo** | HUD sticky de 2 linhas. Row 1: HP + AC + Init + Speed + Insp + CD. Row 2: Condições + Efeitos + Slots. |
| Feature automática | `combat-auto-mode` | **Modo Combate Auto** | Re-organização visual quando combate ativo na campanha. |
| Mini-wiki de favoritos | `biblioteca` | **Biblioteca** | Sub-aba 7 do Diário com favoritos do compêndio (magias, monstros, itens, feats, NPCs públicos). |

### 3.3 Termos proibidos (nunca reintroduzir)

- "Cockpit" (rejeitado em 2026-04-22, substituído por "Herói")
- "Ficha" como nome de sub-tab (virou "Herói"; "ficha" pode aparecer em copy descritivo: "exportar ficha em PDF")
- "Watch" como mode (removido em decisão #23)
- "DM" em qualquer UI, doc ou comunicação
- "Sessão" referindo-se a combate passado (usar "Histórico")

### 3.4 Glossário ubíquo — adendo para `docs/glossario-ubiquo.md`

Adicionar ao glossário as 6 entradas novas da §3.2 acima + confirmar que:
- "Diário" (#13) é **a sub-tab do journey do Jogador**, não o diário do Mestre (que usa "Recap").
- "Herói" é jogador-centric — não usar em contextos de Mestre.

---

## §4. Arquitetura Macro — 4 Modes + Sub-topologia do Jogador

### 4.1 Desenho geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SHELL UNIFICADO                             │
│  ┌──────────────┬────────────────────────────────────────────────┐ │
│  │ SIDEBAR      │  MAIN CONTENT                                  │ │
│  │              │                                                │ │
│  │ MODE SWITCHER│  Cada mode renderiza seu próprio layout        │ │
│  │  ─────────── │                                                │ │
│  │  🛠 Preparar │  ← visível só pra Mestre                      │ │
│  │  ⚔ Rodar    │  ← visível só pra Mestre                      │ │
│  │  📖 Recaps   │  ← visível só pra Mestre                      │ │
│  │  ─────────── │                                                │ │
│  │  🎭 Minha    │  ← visível só pra Jogador                     │ │
│  │     Jornada  │                                                │ │
│  │  ─────────── │                                                │ │
│  │  (surfaces   │                                                │ │
│  │   do mode    │                                                │ │
│  │   atual)     │                                                │ │
│  │              │                                                │ │
│  └──────────────┴────────────────────────────────────────────────┘ │
│  Ctrl+K busca global sempre no topo                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Expansão do mode `journey` (Jogador)

O mode único do Jogador (`journey`) contém **4 sub-tabs**:

```
/app/campaigns/[id]/sheet  (rota atual)
└── journey mode
    ├── Herói       (default — ?tab=heroi)  ← §7.1-7.3
    ├── Arsenal     (?tab=arsenal)          ← §7.4
    ├── Diário      (?tab=diario)           ← §7.5
    └── Mapa        (?tab=mapa)             ← §7.6
```

**Ribbon Vivo** atravessa os 4 — mesmo componente sticky em todos.

### 4.3 Matriz Surface × Auth (mantida de #8)

| Sub-tab (Herói/Arsenal/Diário/Mapa) | Guest (`/try`) | Anônimo (`/join/token`) | Autenticado (`/invite` ou já membro) |
|---|---|---|---|
| Herói | ❌ sem campanha | ✅ read-only (inclui ability chips, slots, efeitos) | ✅ read+write (edita HP, marca slot usado, adiciona efeito) |
| Arsenal | ❌ | ✅ read-only | ✅ read+write (add item, sintoniza, cria ability) |
| Diário | ❌ | ✅ read-only (recaps, quests, NPCs). **Minhas Notas NÃO** | ✅ full (mini-wiki, quest notes, notes do Mestre visíveis se compartilhadas) |
| Mapa | ❌ | ✅ read-only (mindmap navegável, drawers read) | ✅ read+write parcial (anotar em drawer de NPC, criar pin) |

**Anônimo que quer escrever Minhas Notas** → prompt "Crie conta grátis pra salvar" (fluxo de upgrade de identidade, já existe).

### 4.4 Jogador dentro de combate ativo

**Decisão #23 reforçada:** Jogador NÃO entra automaticamente numa tela separada. Fica em `/sheet` (journey) com Modo Combate Auto ativo (decisão #33) + CTA "Entrar no Combate" no ribbon que navega pra `/app/combat/[id]` existente quando jogador quiser entrar na view dedicada de combate.

---

## §5. Jornadas Completas do Jogador — 12 Fluxos

**Spec detalhado:** [01-player-journey.md](./01-player-journey.md). Resumo aqui:

| # | Fluxo | JTBD | Tab primária | Modo |
|---|---|---|---|---|
| 1 | Primeiro acesso (onboarding) | — | Herói | Leitura |
| 2 | Mestre inicia combate | Rastrear | Herói | Combate |
| 3 | Tomar dano | Rastrear | Herói | Combate |
| 4 | Usar magia (slot + efeito) | Rastrear | Herói | Combate |
| 5 | Rolagem com modifier de atributo | Consultar | Herói | Ambos |
| 6 | Descanso longo (reset) | Rastrear | Herói | Leitura |
| 7 | Receber nota privada do Mestre | Registrar | Diário | Ambos |
| 8 | Nota rápida durante combate | Registrar | Diário (overlay) | Combate |
| 9 | Revisar sessão (recap + diário) | Registrar | Diário | Leitura |
| 10 | Subir de nível (editar ficha) | Consultar+Editar | Herói (drawer) | Leitura |
| 11 | Adicionar item ao inventário | Registrar | Arsenal | Leitura |
| 12 | Reconexão zero-drop | (sistema) | preservado | preservado |

**Observação:** Herói é tab primária em 7/12 fluxos. Diário em 4/12. Arsenal em 1. Mapa em zero dos fluxos críticos (mas essencial pra exploração narrativa — é uma feature de **leitura profunda** quando Jogador tem tempo).

---

## §6. Topologia Detalhada do Player HQ

### 6.1 Mapeamento: 7 tabs antigas → 4 novas

| Tab nova | Absorve | Justificativa |
|---|---|---|
| **Herói** | Ficha + Recursos + (parte de) Habilidades | Os 3 JTBDs em um viewport. Habilidades de combate ativas (bardic, channel divinity) como "recursos". |
| **Arsenal** | Inventário + Habilidades passivas + Attunement | O "o que eu tenho e o que sei fazer passivamente". |
| **Diário** | Notas + Quests + NPCs (do Mapa) + Recaps | O "o que eu vivi e o que vou viver". Mini-wiki do Jogador (#24) mora aqui como sub-seção. |
| **Mapa** | Mind map (inalterado) | Já é diferencial. Mudanças cosméticas mínimas. |

### 6.2 URL + deep links

**Rota atual (preservada):** `/app/campaigns/[id]/sheet`
**Query param novo:** `?tab=heroi|arsenal|diario|mapa` + `&section=<sub-secao>` (ex: `?tab=diario&section=notas`)

**Back-compat:**
- Tabs antigas deep-linked (ex: `?tab=ficha`) redirecionam automaticamente pra nova canônica:
  - `?tab=ficha` → `?tab=heroi`
  - `?tab=recursos` → `?tab=heroi&section=recursos`
  - `?tab=habilidades` → `?tab=arsenal&section=habilidades`
  - `?tab=inventario` → `?tab=arsenal`
  - `?tab=notas` → `?tab=diario&section=notas`
  - `?tab=quests` → `?tab=diario&section=quests`
  - `?tab=map` (mapa antigo) → `?tab=mapa`

### 6.3 Badges nas tabs

| Tab | Quando mostra badge | Badge format |
|---|---|---|
| Herói | Combate ativo OU dano recente | `⚔` pulsante (sem número) |
| Arsenal | Items novos não vistos | `[N]` |
| Diário | Notas do Mestre não lidas + quests atualizadas | `[N]` |
| Mapa | Entidades novas desde última visita | `[N]` pequeno |

**Persistência:** tabela auxiliar `user_player_hq_state(user_id, campaign_id, tab, last_visited_at)` — RLS por owner.

### 6.4 Modo Combate Auto (decisão #33)

**Máquina de estado:**

```
OFF ──(broadcast combat:started OU polling combat_active=true)──→ ON

ON ──(broadcast combat:ended OU polling combat_active=false)──→ OFF
```

**O que muda visualmente quando ON:**

| Elemento | OFF | ON |
|---|---|---|
| Badge aba Herói | — | `⚔` pulsante gold |
| Banner Herói | — | "⚔ Round N · Turno de X · próximo: Y" |
| Ribbon Vivo | Normal | HP com pulse gold ao mudar valor |
| Layout Herói desktop | Col A e B balanceadas | Col B expande, Col A colapsa perícias secundárias |
| Atalho N | Normal (nota rápida) | Normal (nota rápida) |
| FAB nota rápida | Hidden por default | Visible bottom-right |
| CTA "Entrar no Combate" | Hidden | Visible no ribbon (link pra `/combat/[id]`) |

**Transições:**
- OFF → ON: animation 300ms (banner slide-from-top ease-out, layout re-balance ease-out)
- ON → OFF: animation 400ms (reverse + fade)

### 6.5 Atalhos de teclado (MVP)

| Atalho | Ação |
|---|---|
| `1` | Herói |
| `2` | Arsenal |
| `3` | Diário |
| `4` | Mapa |
| `N` | Nota rápida (overlay de qualquer tab) |
| `Esc` | Fecha drawer/overlay |
| `Ctrl+K` / `⌘K` | Busca global |
| `?` | Mostra atalhos disponíveis |

**Fora MVP:** atalhos `S1`-`S9` pra slots, `B` pra blind, `G` pra grappled (condições comuns).

---

## §7. Wireframes (resumo; detalhe em docs satélites)

### 7.1 Herói · desktop 1280px+ · modo leitura (fora de combate)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  HEADER — chrome compacto                                                      │
│  ◄ Curse of Strahd · Capa Barsavi · Half-Elf Clérigo/Sorce · Nv10  [PDF][✎]  │
│  ─────────────────────────────────────────────────────────────────────────────│
│  [⚔ Herói] [🎒 Arsenal] [📖 Diário] [🗺 Mapa]                                 │
│  ─────────────────────────────────────────────────────────────────────────────│
│  ┌── RIBBON VIVO (sticky) ──────────────────────────────────────────────────┐ │
│  │ ❤88/88 FULL ██████████ [−5][−1][+1][+5]  🛡21 ⚡+2 👣30ft ✨— 🎯CD16     │ │
│  │ Slots: I●● II●●● III●●● IV●●● V●● VI○○ VII○○ VIII○○ IX○ · cond: —   [+] │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─ COLUNA A (~560px) ─────────────────┐  ┌─ COLUNA B (~560px) ──────────────┐│
│  │ ABILITY SCORES — sempre visíveis    │  │ EFEITOS ATIVOS                    ││
│  │ ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐│  │ ○ Abençoar · 9min · conc  [↻][×] ││
│  │ │STR ││DEX ││CON ││INT ││WIS ││CHA ││  │ ○ Escudo da fé · 8min      [↻][×]││
│  │ │ +0 ││ +2 ││ +4 ││−1  ││ +2 ││ +4 ││  │ [+ Efeito]                        ││
│  │ │ 10 ││ 14 ││ 18 ││ 8  ││ 14 ││ 18 ││  │ ─────────────────────────────────││
│  │ └────┘└────┘└────┘└────┘└────┘└────┘│  │ RECURSOS DE CLASSE                ││
│  │                                     │  │ Canalizar Divindade 1/1  ●        ││
│  │ TESTES DE RESISTÊNCIA               │  │ Intervenção Divina   0/1  ○       ││
│  │ ○FOR +0  ○DES +2  ●CON +4           │  │ [+ Recurso]                       ││
│  │ ●INT +4  ○SAB +2  ●CAR +4           │  │ ─────────────────────────────────││
│  │ ─────────────────────────────────── │  │ SPELLS CONHECIDAS                 ││
│  │ PERÍCIAS (3 colunas densas)         │  │ [🔍 Buscar magia...]              ││
│  │ ○ Acrobacia    DEX  +2              │  │ [Todas] [Prep] [Favs] [Truques]   ││
│  │ ● Persuasão    CAR  +8              │  │ ● Bless · 1st · conc              ││
│  │ ● Religião     INT  +4              │  │ ● Cure Wounds · 1st               ││
│  │ ○ Sobrevivência SAB +2              │  │ ● Shield of Faith · 1st · conc    ││
│  │ [...18 linhas em rows 36px]         │  │ [...rolável]                      ││
│  │                                     │  │                                   ││
│  │ [Ferramentas ▾] [Idiomas ▾]         │  │                                   ││
│  │ [Armaduras ▾]   [Armas ▾]           │  │                                   ││
│  └─────────────────────────────────────┘  └───────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────────┘
```

**Detalhe completo:** [03-wireframe-heroi.md](./03-wireframe-heroi.md)

### 7.2 Herói · desktop · modo combate ativo

Mesmo layout com:
- Banner superior: "⚔ Round 3 · Turno de Grolda · próximo: Capa Barsavi"
- Coluna A: perícias colapsam atrás de `[Perícias ▾]` (colapsável). Ability chips + Testes permanecem.
- Coluna B: ocupa mais altura. Efeitos e Slots destacam.
- Ribbon com pulse gold em HP quando valor muda.
- FAB "📝" bottom-right pra nota rápida.
- Botão destacado "⚔ Entrar no Combate →" (link pra `/combat/[id]`).

### 7.3 Herói · mobile 390px

- Ribbon compacto: HP bar + AC + [expand ▾] pra ver Init/Speed/Stats.
- Single column.
- Ability chips em grid 3×2.
- Perícias colapsadas atrás de accordion (OK em mobile — screen real estate limitado).

### 7.4 Arsenal · desktop + mobile

Desktop 2 colunas:
- Coluna A: Habilidades (features de classe, traits raciais, bardic inspiration passiva, fighting style)
- Coluna B: Inventário (Sintonização no topo, Moedas em row compacta, Pessoal, Grupo/Compartilhado)

Mobile single-column.

**Detalhe completo:** [04-wireframe-arsenal.md](./04-wireframe-arsenal.md)

### 7.5 Diário · desktop + mobile

Desktop 2 colunas:
- Coluna A (40%): Sub-aba ativa (Rápidas / Minhas Notas / Diário de Sessão / NPCs / Do Mestre / Quests)
- Coluna B (60%): Timeline cronológica (recaps + eventos marcantes) com filtros por tag

Mobile: sub-abas horizontais, conteúdo full-width abaixo.

**Detalhe completo:** [05-wireframe-diario.md](./05-wireframe-diario.md)

### 7.6 Mapa · inalterado (ajustes cosméticos)

Mantém Mind Map existente. Ajustes:
- Drawer lateral usa tokens novos (padding reduzido)
- Link inline "Abrir em Diário" quando drawer é de NPC conhecido com notas

**Detalhe:** [06-wireframe-mapa.md](./06-wireframe-mapa.md)

---

## §8. Spec Funcional — Estados, Ações, Erros

**Detalhe completo:** [07-spec-funcional.md](./07-spec-funcional.md). Resumo:

### 8.1 Matriz por zona (exemplo: HP bar)

| Estado | Visual | Interação | Ack |
|---|---|---|---|
| Default (FULL) | Verde, `88/88 FULL` | Hover mostra tier | — |
| LIGHT | Verde claro, `76/88 LIGHT` | idem | — |
| MODERATE | Amarelo, `52/88 MODERATE` | idem | — |
| HEAVY | Laranja, `25/88 HEAVY` | idem | — |
| CRITICAL | Vermelho, `5/88 CRITICAL` | idem | Pulse em runtime |
| Clique −5 | Optimistic: 83/88 | — | Pulse gold (ack), ou revert+toast se error |
| HP=0 | Vermelho + badge "INCONSCIENTE" | Click +1 revive | — |

### 8.2 Regras a11y universais

- ARIA roles corretas (tabs, tablist, tabpanel)
- Tab order lógico: ribbon → tab bar → coluna A → coluna B → footer
- Contraste mínimo WCAG AA (4.5:1 body, 3:1 UI grande)
- `prefers-reduced-motion`: fade → instant, slide → opacity-only
- Focus ring gold (shadow-gold-focus) visível

### 8.3 Regras de optimistic update

- Todo botão de modificação (HP, slot, effect toggle, resource dot) faz optimistic UI
- Ack do servidor: pulse gold 1.5s (`glow-gold` animation existente)
- Erro: revert + toast destrutivo ("Não foi dessa vez. Tentar de novo?")
- Timeout 10s → revert automático

### 8.4 Regras de Responsive

Breakpoints conforme [01-design-tokens.md](../qa/evidence/campaign-audit-2026-04-21/01-design-tokens.md):
- `sm` 640px
- `md` 768px
- `lg` 1024px
- `xl` 1280px
- `2xl` 1536px

**Player HQ:**
- <768px: single column, ribbon compacto
- 768-1279px: single column OR 2-col ajustado, ribbon completo
- ≥1280px: 2 colunas estáveis

---

## §9. Design Tokens — Delta

**Detalhe completo:** [08-design-tokens-delta.md](./08-design-tokens-delta.md). Resumo:

### 9.1 O que muda vs DESIGN-SYSTEM.md v1.0

- **Sem tokens novos.** Todos os spacings, colors, typography já estão definidos.
- **Uso dos tokens muda.** Regra pra ficha: **preferir space-2 a space-3** entre items relacionados, **space-4** entre seções, **space-6+ só em empty states + heroes**.

### 9.2 Mapa de aplicação (padrão novo)

| Container | Antes | Depois |
|---|---|---|
| Wrapper main do tab Herói | `space-y-4` | `space-y-3` |
| Card default | `p-4` | `px-4 py-3` (assimétrico — vertical menor) |
| Between related items | `space-y-3` | `space-y-2` |
| Between cards irmãos | `space-y-4` | `space-y-3` |
| Ability score chip | `p-3` (altura ~88px) | `p-2.5` (altura ~72px) |
| Header do tab | `mb-6` | `mb-4` |
| Column gap | `gap-4` | `gap-5` (mais ar entre colunas, menos dentro delas) |

### 9.3 Typography rhythm (mais agressivo)

- Perícias (hoje `text-sm` ~14/20): vira `text-[13px]` line-height `18px` (economia 10% vertical)
- Labels (hoje `text-xs` uppercase): vira `text-[11px]` com `tracking-wide +8%`
- Numbers em chips (hoje `text-lg`): vira `text-xl` (mais peso pro que importa)

### 9.4 Nada de hex inline

Regra imutável do DESIGN-SYSTEM §4.1.4 — nenhum `#ABCDEF` em novo código. Sempre token via Tailwind CSS var.

---

## §10. Schema & Backend

**Detalhe:** [schema-investigation-winston.md](../architecture/schema-investigation-winston.md) + [09-implementation-plan.md](./09-implementation-plan.md).

### 10.1 Migration única nova: `player_notes`

Spec completo em schema-investigation §2 M1. Resumo:

```sql
CREATE TABLE player_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),          -- auth
  session_token_id uuid REFERENCES session_tokens(id), -- anon
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title text,
  content_md text NOT NULL DEFAULT '',
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT player_notes_ownership_xor CHECK (
    (user_id IS NOT NULL AND session_token_id IS NULL) OR
    (user_id IS NULL AND session_token_id IS NOT NULL)
  )
);
-- índices + RLS conforme spec do Winston
```

### 10.1.b Migration `player_favorites` (nova — decisão #40)

```sql
CREATE TABLE player_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token_id uuid REFERENCES session_tokens(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,  -- nullable se favorito for global ao jogador (não-campaign-scoped)
  entity_type text NOT NULL CHECK (entity_type IN ('spell', 'monster', 'item', 'feat', 'feature', 'npc')),
  entity_id text NOT NULL,  -- slug SRD (ex: 'fireball', 'mind-flayer') OU UUID de NPC custom da campanha
  entity_source text NOT NULL DEFAULT 'srd' CHECK (entity_source IN ('srd', 'mad', 'campaign')),  -- de onde veio
  note text,  -- anotação pessoal opcional do jogador
  created_at timestamptz DEFAULT now(),

  CONSTRAINT player_favorites_ownership_xor CHECK (
    (user_id IS NOT NULL AND session_token_id IS NULL) OR
    (user_id IS NULL AND session_token_id IS NOT NULL)
  ),
  CONSTRAINT player_favorites_unique UNIQUE NULLS NOT DISTINCT
    (user_id, session_token_id, campaign_id, entity_type, entity_id)
);

CREATE INDEX idx_player_favorites_user_type ON player_favorites (user_id, entity_type) WHERE user_id IS NOT NULL;
CREATE INDEX idx_player_favorites_anon_type ON player_favorites (session_token_id, entity_type) WHERE session_token_id IS NOT NULL;
CREATE INDEX idx_player_favorites_campaign ON player_favorites (campaign_id) WHERE campaign_id IS NOT NULL;

ALTER TABLE player_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth player owns own favorites" ON player_favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- Anônimo: policy via RPC passando session_token (padrão player_quest_notes mig 069)
```

**Decisões:**
- `campaign_id` nullable — favorito pode ser global ao jogador (vale entre campanhas) OU campaign-scoped (NPC custom só importa nessa campanha)
- `entity_id text` em vez de FK — porque vai mesclar SRD slugs com UUIDs de campaign-custom NPCs. Validação no app.
- Total migrations novas: **2** (`player_notes` + `player_favorites`).

### 10.1.c Migration `level_up_invitations` (nova — decisão #41)

```sql
CREATE TABLE level_up_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),  -- o Mestre que liberou
  from_level int NOT NULL CHECK (from_level >= 1 AND from_level <= 19),
  to_level int NOT NULL CHECK (to_level > from_level AND to_level <= 20),
  message text,  -- ex: "Vocês derrotaram o dragão vermelho!"
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'declined', 'expired', 'cancelled')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  invited_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  choices jsonb,  -- snapshot das decisões: {hp_method, hp_rolled, asi_or_feat, asi_choices, feat_id, spells_added, subclass_id, ...}

  CONSTRAINT level_up_completed_has_timestamp CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
  )
);

CREATE INDEX idx_level_up_pending ON level_up_invitations (character_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_level_up_campaign ON level_up_invitations (campaign_id, invited_at DESC);

ALTER TABLE level_up_invitations ENABLE ROW LEVEL SECURITY;

-- Mestre da campanha pode CRUD
CREATE POLICY "Mestre manages level_up invitations" ON level_up_invitations FOR ALL
  USING (
    campaign_id IN (SELECT id FROM campaigns WHERE created_by = auth.uid())
  );

-- Player pode ler e atualizar suas próprias (completar)
CREATE POLICY "Player reads own invitations" ON level_up_invitations FOR SELECT
  USING (character_id IN (
    SELECT id FROM player_characters WHERE user_id = auth.uid()
  ));

CREATE POLICY "Player completes own invitation" ON level_up_invitations FOR UPDATE
  USING (
    character_id IN (SELECT id FROM player_characters WHERE user_id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (status IN ('completed', 'declined'));
```

**Realtime broadcast:**
- `levelup:offered` — Mestre criou invitation → players ouvem
- `levelup:completed` — Player concluiu wizard → Mestre ouve
- `levelup:cancelled` — Mestre cancelou pending invitation

**Total migrations novas:** 3 (`player_notes` + `player_favorites` + `level_up_invitations`).

### 10.2 Colunas ou campos novos em tabelas existentes

- **`user_player_hq_state`** (NOVA) — persistência de last_visited_at por tab × user × campanha. Minimal:
  ```sql
  CREATE TABLE user_player_hq_state (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
    tab text NOT NULL CHECK (tab IN ('heroi','arsenal','diario','mapa')),
    last_visited_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, campaign_id, tab)
  );
  ```
  RLS: user_id = auth.uid(). Alternativa se quisermos menos DB: só localStorage 24h TTL.

- **`campaigns.combat_active`** — já existe? confirmar. Se não, adicionar boolean com trigger que sincroniza a existência de `combats.state='active'` da campanha. Default: false.

### 10.3 Backlinks `@` parser

Decisão pendente de Winston (Q-WIN-3). Proposta:
- **MVP:** parser frontend, batch insert de edges via transaction ao salvar note.
- **V1.5:** trigger Postgres ou worker async pra lidar com notes grandes.

### 10.4 Realtime

- Canal: `campaign:${id}` (já consolidado — vide [memory realtime_rate_limit](../../.claude/projects/c--Projetos-Daniel-projeto-rpg/memory/project_realtime_rate_limit_root_cause.md))
- Eventos novos a subscribar no Player HQ:
  - `combat:started` → liga Modo Combate Auto
  - `combat:ended` → desliga
  - `note:received` (do Mestre pro Jogador) → badge em Diário
  - `quest:updated` → badge em Diário

---

## §11. Implementation Plan — 4 Fases

**Detalhe completo:** [09-implementation-plan.md](./09-implementation-plan.md).

### 11.1 Visão geral

| Fase | Escopo | Tamanho | Depende de |
|---|---|---|---|
| **Fase A** — Quick wins | Spacings/typography da Ficha atual SEM mudar topologia | 3-4 dias | Nada |
| **Fase B** — Topologia 7→4 | Reorganizar tabs, rotas, redirect de back-compat | 5-7 dias | Fase A mergeada |
| **Fase C** — Ribbon Vivo + Modo Combate Auto | Sticky ribbon + auto-mode + layout 2-col desktop | 5-7 dias | Fase B + realtime consolidado |
| **Fase D** — Mini-wiki + Backlinks + Cross-nav | player_notes, parser `@`, links Diário↔Mapa | 7-10 dias | Winston schema validado |

**Total:** 3-4 semanas em paralelo com outros sprints (assumindo 1 dev part-time).

### 11.2 Resumo de stories (22 total)

**Fase A — Quick wins (5 stories)**
- A1. Aplicar spacing tokens novos na ficha atual (sem mudar topologia)
- A2. Remover accordion de atributos (ability scores sempre visíveis)
- A3. Densificar rows de perícias (3 colunas em desktop)
- A4. Header da ficha em 2 linhas (hoje 4)
- A5. HP controls inline no próprio HpDisplay (sem row dedicada)

**Fase B — Topologia (6 stories)**
- B1. Novo PlayerHqShell com 4 tabs (Herói/Arsenal/Diário/Mapa)
- B2. Componentes HeroiTab, ArsenalTab, DiarioTab (composição dos existentes)
- B3. Back-compat de deep links (7 tabs antigas → 4 novas)
- B4. Default tab = Herói + persistência localStorage 24h
- B5. Atalhos de teclado 1-4 + ? (help)
- B6. E2E Playwright: topologia basic

**Fase C — Ribbon + Combate (6 stories)**
- C1. Componente `<RibbonVivo />` sticky com HP + AC + Init + Speed + Inspiration + CD
- C2. Resumo de slots no ribbon (compacto horizontal)
- C3. Layout 2-col desktop (Herói + Arsenal)
- C4. Hook `useCampaignCombatState` (broadcast + polling fallback)
- C5. Modo Combate Auto: badge + banner + layout swap
- C6. E2E Playwright: modo combate auto cenários

**Fase D — Wiki + Backlinks (5 stories)**
- D1. Migration `player_notes` + RLS + hooks
- D2. Editor markdown (Diário > Minhas Notas)
- D3. Parser `@` frontend + batch insert edges
- D4. Cross-nav Diário ↔ Mapa (links inline)
- D5. Notificações in-app de notas do Mestre + quests updated

### 11.3 Risk register

| Risco | Prob | Impacto | Mitigação |
|---|---|---|---|
| Realtime quota estoura | M | A | Já consolidado; monitorar |
| Backlinks parser com perf ruim em notes grandes | M | M | MVP frontend; v1.5 worker |
| PWA push complexo | A | M | Manter in-app only pro MVP |
| Jogadores confusos com topologia nova | M | A | Tour atualizado + redirect de URLs antigos |
| Mobile density fica apertado | B | A | Ribbon tem fallback compacto, já spec'd |

### 11.4 Feature flag

Tudo isso vive atrás de `NEXT_PUBLIC_PLAYER_HQ_V2=true` (naming padronizado em 2026-04-24 em todos os 5 docs do pacote). Default OFF em prod até QA completo.

---

## §12. Métricas de Sucesso

### 12.1 Técnicas (medidas automaticamente)

| Métrica | Baseline (hoje) | Alvo pós-deploy | Método |
|---|---|---|---|
| Largura útil viewport desktop 1440px | ~50% (~640px) | ≥92% (~1320px) | Playwright screenshot comparison |
| Elementos úteis above-the-fold em Herói desktop | 4 | ≥15 | Audit manual + test |
| Cliques pra ver modifier de atributo | 1 (accordion) | 0 (sempre visível) | UX audit |
| Cliques pra HP→slot em combate | 3+ (troca tab) | 0 (mesma tela) | Playwright |
| Tabs top-level | 7 | 4 | Contagem código |
| Empty states empilhados em tab vazia | 5 (Recursos) | ≤1 com CTA | Audit visual |

### 12.2 Comportamentais (requer telemetria)

| Métrica | Alvo |
|---|---|
| % Jogadores que usam Minhas Notas (≥1 nota em 7 dias) | ≥30% |
| Tempo médio em Herói durante combate | ≥70% do tempo total de combate |
| Taxa de leitura de recaps dentro de 48h da publicação | ≥80% |
| Taxa de clique "Entrar no Combate" quando banner aparece | ≥90% |
| Retorno semana-1 de Jogador convidado | ≥50% |
| Time-to-first-action após primeiro acesso (abrir HQ) | <30s |

### 12.3 Negativas (deveriam cair)

| Métrica | Alvo |
|---|---|
| % sessões com reconnection toast visível | ↓ (menos que hoje) |
| Bugs reportados de "não achei X" | ↓ 50% |
| Feature requests que pedem coisas já existentes | ↓ (sinal de findability melhor) |

---

## §13. Riscos & Mitigações Globais

### 13.1 Realtime (top risk)
- **Base:** [memory/realtime_rate_limit_root_cause](../../.claude/projects/c--Projetos-Daniel-projeto-rpg/memory/project_realtime_rate_limit_root_cause.md) — free tier estoura com 16-24 canais/Mestre
- **Mitigação:** canal campaign único consolidado; eventos granulares; fallback polling 10-30s

### 13.2 Mudança de hábito dos Jogadores existentes
- **Base:** Jogadores habituados a 7 tabs vão estranhar 4
- **Mitigação:** Tour atualizado auto-disparado quando flag = true; redirect 7→4 transparente; banner de upgrade no primeiro acesso pós-mudança

### 13.3 Densidade excessiva = ilegível
- **Base:** densificar demais vira ruído (regra imutável: "denso mas elegante")
- **Mitigação:** QA visual adversarial pré-merge; contrast audits; usability test com Mestres beta

### 13.4 Anônimos não podem escrever Minhas Notas
- **Base:** dual-auth com session_token_id mas ainda sem UX de "upgrade de identidade" integrado
- **Mitigação:** prompt contextual "crie conta pra salvar"; sessionStorage temporário até decidir

### 13.5 Regressões de combate
- **Base:** regra Combat Parity — 3 modos (Guest/Anon/Auth) têm que funcionar
- **Mitigação:** E2E Playwright obrigatório em PRs; visual regression com Percy ou similar

---

## §14. Glossário Ubíquo — Entradas Novas

Adicionar ao [docs/glossario-ubiquo.md](../../docs/glossario-ubiquo.md):

### 14.1 Novos termos

| Conceito | EN (código) | PT-BR (UI) | Subtítulo (UI) | Definição |
|---|---|---|---|---|
| Sub-tab identidade+recursos do journey | `heroi` | **Herói** | "Sua ficha viva" | A tab default do Player HQ. HP, stats, slots, efeitos, proficiências. |
| Sub-tab itens+features | `arsenal` | **Arsenal** | "O que você carrega e sabe" | Inventário + habilidades passivas + attunement. |
| Sub-tab narrativa completa | `diario` | **Diário** | "O que você vive e lembra" | Notas + quests + NPCs + recaps + mini-wiki. |
| Componente fixo HUD | `ribbon-vivo` | **Ribbon Vivo** | (interno) | Barra sticky de 2 linhas. Row 1: HP + AC + Init + Speed + Insp + CD. Row 2: Condições + Efeitos + Slots. |
| Feature auto-switch | `combat-auto-mode` | **Modo Combate Auto** | (interno) | Re-organização visual do Herói quando combate ativo na campanha. |
| Mini-wiki de favoritos | `biblioteca` | **Biblioteca** | "Suas referências favoritadas" | Sub-aba do Diário com magias/monstros/itens/feats/NPCs favoritados do compêndio. Acessível também via Ctrl+K. |

### 14.2 Termos proibidos adicionais

- **"Cockpit"** — rejeitado em 2026-04-22. Se precisar nomear a experiência de combate, usar "Modo Combate Auto" ou "Herói em combate".
- **"Ficha"** como nome de TAB — virou "Herói". Pode aparecer em copy descritivo ("Exportar ficha em PDF") ou refs técnicos ("rota /sheet").
- **"Dashboard"** para qualquer coisa dentro do `/sheet` — o Player HQ não é um dashboard, é o **Grimório do Jogador**.

---

## §15. Appendix

### A1. Evidência da auditoria (2026-04-22)

Screenshots em [screenshots/](./screenshots/):

- `10-dashboard-desktop.png` — dashboard real com Dani como Mestre de 3 campanhas + Jogador em Curse of Strahd
- `20-26-*-desktop.png` — 7 tabs atuais do Player HQ capturadas (Mapa/Ficha/Recursos/Habilidades/Inventário/Notas/Quests)
- `30-32-*-mobile.png` — 3 tabs principais em mobile 390px
- `03-try-combat-active-desktop.png` — combate densificado (referência viva)

### A2. 12 fluxos detalhados
Ver [01-player-journey.md](./01-player-journey.md) com steps, estados, falhas, referências código.

### A3. Mermaid flows
Ver [10-mermaid-flows.md](./10-mermaid-flows.md):
- Máquina de estado do Modo Combate Auto
- Fluxo de onboarding (primeiro acesso)
- Fluxo de "usar magia" em combate (happy path + erros)
- Jornada cross-mode (Mestre inicia combate + Jogador responde)

### A4. Checklist pré-merge

Antes de mergear qualquer PR de Fase B+:

- [ ] Tests E2E Playwright passando
- [ ] TypeScript check limpo (`rtk tsc --noEmit`)
- [ ] Lint limpo (`rtk lint`)
- [ ] Regra Combat Parity conferida (guest/anon/auth)
- [ ] Regra Mestre-nunca-DM conferida (grep por "DM" em novos arquivos)
- [ ] HP tier labels FULL/LIGHT/... não hardcoded (usam `getHpStatus`)
- [ ] Nenhum hex inline (só tokens Tailwind/CSS var)
- [ ] Contraste WCAG AA validado
- [ ] Mobile 390px funcional (manual + Playwright)
- [ ] Screenshot visual de antes/depois em comentário do PR

### A5. Perguntas ainda abertas (pra ciclo futuro)

| # | Pergunta | Dependência |
|---|---|---|
| Q-NEW-1 | Ícone da aba Herói: `Heart` ou `Swords`? | Preferência Dani (recomendação Sally: Heart) |
| Q-NEW-2 | Arsenal deve ter sub-abas internas? (Habilidades / Inventário / Sintonização separados) | UX decision |
| Q-NEW-3 | Diário deve ter filtro global por tag? | Sally+John |
| Q-NEW-4 | Sessões passadas com recap: expandir em Diário ou levar pra página dedicada? | Roadmap feature |
| Q-OLD-1 a Q-OLD-5 | Ver [SESSION-HANDOFF §Perguntas Abertas](../qa/evidence/campaign-audit-2026-04-21/SESSION-HANDOFF-2026-04-21.md) | Mantidas |
| Q-WIN-1 a Q-WIN-8 | Ver [schema-investigation-winston.md](../architecture/schema-investigation-winston.md) | Precisa Winston responder |

---

## §16. Assinatura

**Autores desta consolidação:**
- Sally (UX) — wireframes + topologia + spec visual
- Mary (Analyst) — benchmarks + moodboard
- John (PM) — JTBDs + métricas + escopo
- Winston (Architect) — viabilidade + fases + schema
- Amelia (Dev) — pronta pra pegar Fase A

**Decisor único:** Dani Roscoe

**Change log:**
- **v0.4 (2026-04-23):** consolidação das 2 sessões num PRD único. 10 decisões novas (#27-36). Satélites dedicados a cada wireframe.
- **v0.3 (2026-04-21 tarde):** watch removido, player wiki, entity graph descoberto, "Mestre nunca DM" travado.
- **v0.2 (2026-04-21 manhã):** 4 blockers resolvidos, matriz Surface × Auth, 8 wireframes ASCII.
- **v0.1 (2026-04-20):** diagnóstico inicial + proposta 4 modes.

---

**Fim do PRD. Próximos docs a abrir:** [01-player-journey.md](./01-player-journey.md) → [02-topologia-navegacao.md](./02-topologia-navegacao.md) → [09-implementation-plan.md](./09-implementation-plan.md).
