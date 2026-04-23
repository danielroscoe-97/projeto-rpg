# Topologia & Navegação — 7 tabs → 4 tabs + Modo Combate Auto

**Escopo:** Estrutura macro do Player HQ, regras de navegação, modo combate auto, responsividade.
**Prereq:** [00-INDEX.md](./00-INDEX.md) + [01-player-journey.md](./01-player-journey.md)

---

## 🎯 Decisão central

**ANTES (hoje):**
```
Mapa · Ficha · Recursos · Habilidades · Inventário · Notas · Quests
 (7 tabs, 3 com empty state único, scroll infinito em Recursos)
```

**DEPOIS:**
```
Herói · Arsenal · Diário · Mapa
 (4 tabs, cada uma com propósito narrativo único)
```

---

## 🗺️ Mapa de conteúdo: 7 → 4

| Tab nova | Absorve da(s) tab(s) antiga(s) | Por quê |
|---|---|---|
| **Herói** | Ficha + Recursos + (parte de) Habilidades | HP/AC/stats + slots/efeitos/recursos de classe = os 3 JTBDs juntos em um viewport. Habilidades de combate (bardic inspiration, channel divinity) moram aqui como "recursos". |
| **Arsenal** | Inventário + Habilidades passivas + Attunement | O "o que eu tenho" — items + features de classe não-voláteis (Fighting Style, Saving Throw proficiency bonuses implícitos, etc). |
| **Diário** | Notas + Quests + NPCs conhecidos (do Mapa) | O "o que eu vivi e vou viver" — narrativa. Quests vira sub-aba. NPCs mantém link no Mapa mas tem presença textual no Diário. |
| **Mapa** | Mapa mental (unchanged) | Já é a estrela. Mantém arquitetura atual; ajustes cosméticos no §6. |

---

## 🔀 Por que essa topologia

### JTBDs atendidos

| JTBD | Tab primária | Qualidade atendimento |
|---|---|---|
| Rastrear estado volátil (combate) | Herói | ⭐⭐⭐⭐⭐ (tudo em uma tela) |
| Consultar stats rápido | Herói | ⭐⭐⭐⭐⭐ (chips sempre visíveis) |
| Registrar memória (diário, NPCs) | Diário | ⭐⭐⭐⭐ |
| Gerenciar loot + features | Arsenal | ⭐⭐⭐⭐ |
| Explorar mundo (entidades) | Mapa | ⭐⭐⭐⭐⭐ (já é bom) |

### Princípios do Grimório cumpridos

- **P1 Mesa primeiro** — Herói é a mesa. Ribbon + chips servem a mesa direto.
- **P3 Cockpit sob pressão** — modo combate auto transforma Herói em cockpit sem sair da tela.
- **P5 Menos é grimório** — 4 tabs vs 7 é -43% de noise.
- **P6 Um caminho por destino** — cada conteúdo vive em UMA tab, sem ambiguidade.

---

## 🎛️ Ordem dos tabs (left-to-right)

```
[⚔ Herói]   [🎒 Arsenal]   [📖 Diário]   [🗺 Mapa]
   #1           #2              #3           #4
```

**Rationale:**
1. **Herói primeiro** — é o default + mais frequente
2. **Arsenal segundo** — "o que eu carrego" está logicamente próximo de "quem eu sou"
3. **Diário terceiro** — transição de self (1-2) pra externo (3-4)
4. **Mapa por último** — exploração narrativa, mais cerebral

**Ícones Lucide (alinhado DESIGN-SYSTEM §4.3.2):**
- Herói: `Swords` (ou `Heart` se queremos evitar associação combate-only)
- Arsenal: `Package` ou `Backpack`
- Diário: `BookOpen`
- Mapa: `Network` (mantém atual)

**Decisão:** Sally recomenda `Heart` para Herói — é o ícone do HP, e o tab tem HP como elemento #1 do ribbon. `Swords` pode transmitir que é só combate.

---

## ⚔ Modo Combate Auto — regras definitivas

### Quando ativa

Combate da campanha do jogador está **ativo** (`campaigns.combat_active = true` OU o jogador está em um combat em andamento onde ele é combatant).

**Detecção:**
- Realtime subscription ao canal `campaign:${id}` (já existe e está consolidado por [memory/realtime_rate_limit](../../.claude/projects/c--Projetos-Daniel-projeto-rpg/memory/project_realtime_rate_limit_root_cause.md))
- Evento: `combat:started` liga, `combat:ended` desliga
- Fallback: polling de `campaigns.combat_active` a cada 10s se realtime silencioso >30s

### O que muda visualmente

| Elemento | Modo leitura | Modo combate |
|---|---|---|
| Aba Herói | Default, sem badge | **Badge pulsando gold** "⚔" |
| Header da aba Herói | Sem banner | **Banner superior**: "⚔ Round 3 · Turno de [Nome] · próximo: [Nome]" |
| Layout Herói (desktop) | Coluna A = stats + prof equilibrada, Coluna B = slots + efeitos | **Coluna A colapsa perícias** (scroll interno se necessário), **Coluna B expande** efeitos ativos + slots |
| Ribbon | Todos elementos | Todos elementos + **pulse gold** no HP quando tomar dano |
| Atalhos | Padrão | **Modo combate atalhos ativos** (N=nota rápida, números=uso de slot, etc — MVP: só N) |
| Nota rápida | Botão normal | **Botão flutuante visível** bottom-right |

### O que NÃO muda

- **Não força troca de tab.** Se jogador está no Diário tomando notas, banner aparece na aba Herói mas a UI dele não muda.
- **Não desabilita interações em outras tabs.** Arsenal continua editável, Diário continua funcional.
- **Não esconde conteúdo.** Apenas re-organiza peso visual.

### Exit do modo combate

- Mestre encerra → broadcast `combat:ended`
- Banner fade-out (400ms)
- Coluna A/B voltam proporções normais (anim 300ms)
- Badge pulsante some

---

## 📱 Responsividade

### Desktop ≥1280px

- Ribbon sticky no topo (altura ~56px)
- 2 colunas em Herói (min-width 560px cada, total ~1160px + padding 40px)
- 2 colunas em Arsenal (min-width 520px cada)
- 2 colunas em Diário (conteúdo à esquerda, timeline à direita)
- Mapa full-width

### Tablet 768-1279px

- Ribbon sticky com algumas abreviações (ex: "Spd 30" em vez de "Speed 30ft")
- Single column abaixo do ribbon
- Tab bar fica sticky
- Menu lateral colapsável (já existe)

### Mobile <768px

- Ribbon sticky **compacto** (altura ~48px, só HP + AC + botão expand pra ver Init/Speed/Stats)
- Single column
- Tab bar horizontal scroll (com fade indicator que já existe em [PlayerHqShell.tsx:104](../../components/player-hq/PlayerHqShell.tsx#L104))
- Ability chips: grid 3x2 em vez de 6x1
- Nota rápida: FAB (floating action button) bottom-right

---

## 🚦 Regras de roteamento

### URLs

**Atual (keep):**
- `/app/campaigns/[id]/sheet` — Player HQ, default tab = `map`

**Proposta (novo):**
- `/app/campaigns/[id]/sheet` — default tab = `heroi`
- `/app/campaigns/[id]/sheet?tab=heroi|arsenal|diario|mapa` — deep link para tab
- `/app/campaigns/[id]/sheet?tab=diario&section=quests` — deep link para sub-área

**Benefício:** share link com estado específico. Ex: Mestre manda "ver sua quest aqui" com URL correta.

### Default tab

**Decisão:** Default = **Herói**, não Mapa (hoje é Mapa).

**Justificativa:**
- Mapa é feature de exploração, não de uso frequente
- 7/12 fluxos têm Herói como tab primária
- Mapa ainda está 1 clique de distância

### Persistência de tab

Salvar última tab visitada em localStorage (key: `pocketdm:lastPlayerHqTab:${campaignId}`) e restaurar no próximo acesso, dentro da mesma sessão.

**TTL:** 24h. Depois disso, reseta para default `heroi`.

---

## 🔔 Badges e notificações nas tabs

| Tab | Quando mostra badge | Badge format |
|---|---|---|
| Herói | Combate ativo | `⚔` pulsante (sem número) |
| Arsenal | Items novos não vistos | `[N]` (vermelho se >0, gold se =0) |
| Diário | Notas do Mestre não lidas + quests atualizadas | `[N]` |
| Mapa | Entidades novas desde última visita | `[N]` pequeno (já existe — "N novidades desde sua ultima visita") |

**Persistência:**
- `user_player_hq_state` table: `last_visited_at` por tab × campanha
- RLS: jogador só vê/edita seu próprio state

---

## 🔗 Relações entre tabs

### Cross-navegação intencional

- Herói → Arsenal: link inline em "item sintonizado afeta stat" (ex: anel +1 INT)
- Arsenal → Herói: após adicionar item mágico, prompt "Ver efeito na ficha?"
- Diário → Mapa: menção de NPC vira link "Abrir no Mapa"
- Mapa → Diário: clicar em NPC abre drawer com tabs [Info | Notas] — "Notas" linka pro Diário > NPCs

### Atalhos de teclado (MVP)

- `1/2/3/4` — switch tab (Herói/Arsenal/Diário/Mapa)
- `N` — nota rápida overlay (de qualquer tab)
- `Esc` — fecha drawers/overlays
- `Ctrl+K` — abre search global (já existe)

**Fora MVP:** atalhos de slot (ex: `S1` usa slot nível 1), atalhos de condição (ex: `B` blind).

---

## 📐 Alinhamento com DESIGN-SYSTEM.md

| Princípio | Como é cumprido |
|---|---|
| P1 Mesa primeiro | Herói = mesa. Ribbon = HUD da mesa. |
| P2 Compositor, não formulário | Diário tem quick-add invisível (Fluxo 8). Arsenal tem auto-complete SRD. |
| P3 Cockpit sob pressão | Modo combate auto = cockpit. Ribbon sticky = 1 clique pra tudo. |
| P4 Narrativa primeiro, dado depois | Mapa + Diário priorizam narrativa. Herói é contrabalanço (dado primeiro, mas contextualizado). |
| P5 Menos é grimório | 4 tabs. Empty states não empilhados. |
| P6 Um caminho por destino | Cada item vive em uma tab. Cross-links são exceção, não regra. |
| P7 Invisible until invoked | Nota rápida overlay. Drawers. Accordions secundários (Ferramentas/Idiomas). |

---

## 🧪 Como testar a topologia

**E2E Playwright (novos testes):**

1. `topology.heroi-is-default.spec.ts` — abrir `/sheet` sem param → assert tab Herói ativa
2. `topology.combat-mode-auto.spec.ts` — broadcast combate → assert banner + badge aparecem
3. `topology.combat-mode-exit.spec.ts` — broadcast end → assert banner some, layout restore
4. `topology.deep-link-tabs.spec.ts` — `/sheet?tab=arsenal` → assert Arsenal ativa
5. `topology.no-force-tab-switch.spec.ts` — estar em Diário + combate ativa → assert permanece em Diário (apenas badge)
6. `topology.cross-nav-diary-to-map.spec.ts` — clicar menção de NPC em Diário → abre Mapa com drawer correto

**Critérios de aceitação:**
- Default tab ao logar primeira vez = Herói (não Mapa)
- Badge de combate aparece em <2s após broadcast
- Banner some em <400ms após combat:ended
- Zero force-switch em qualquer cenário de combate
- Atalhos 1-4 funcionam de qualquer tab

---

## ⚠ Decisões controversas que podem ser revisadas

1. **Ícone de Herói = `Heart` ou `Swords`?** — Sally recomenda `Heart`. Pode ficar a critério do Dani.
2. **Tab persistência por 24h ou por sessão?** — Winston recomenda 24h (melhor UX). PM pode querer menor para telemetria.
3. **Atalhos 1-4 ou W/A/S/D?** — Sally recomenda números (menos ambíguo com text input).
4. **Badge em Arsenal: "items novos não vistos" é útil?** — Mary não tem dados; pode ser feature premium futura se sub-usar.

---

## 🔒 Invariantes pós-implementação

- Qualquer redirect automático para tabs antigas (Ficha, Recursos, etc.) deve redirecionar para a nova tab canônica.
- Deep links externos quebrados (ex: Mestre compartilhou `/sheet?tab=ficha` em nota) **não** devem 404 — devem mapear automaticamente (`ficha` → `heroi`).
- Telemetria (se existir) continua tracking por tab canônica nova.
