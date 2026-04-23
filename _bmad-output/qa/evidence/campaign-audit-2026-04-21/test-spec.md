# Campaign HQ + Player HQ — Audit Spec (2026-04-21)

**Owners:** Quinn (QA) + Sally (UX) + John (PM) + Mary (Analyst)
**Mode:** Exploratory evidence capture via Playwright MCP (no pass/fail)
**Target:** `https://pocketdm.com.br` — conta de produção do Dani
**Out:** `_bmad-output/qa/evidence/campaign-audit-2026-04-21/`

---

## 1. Why

Dani reportou: "área de campanha (mestre e jogador) ruim de navegar, abas ruins de utilizar, textos cortados, menu superior aparecendo e desaparecendo, abas estranhas".

Hipótese do time:
1. **Sally** — IA genérica demais: mesma barra de 12 pills tentando servir jobs radicalmente diferentes (Mestre compositor vs Player leitor).
2. **John** — 70% dos cliques reais caem em ≤3 seções; o resto é ruído que polui visão.
3. **Mary** — o produto tenta ser "prep tool" (Notion/Obsidian) **E** "cockpit de mesa" (Roll20/Foundry) numa grade só.
4. **Quinn** — o `overflow-x-auto scrollbar-hide` da `CampaignNavBar` provavelmente é o "menu que aparece e some" (pills cortadas à direita, sem affordance visual).

## 2. Escopo

### Papéis
- **Mestre (owner)** — `danielroscoe97@gmail.com` em uma campanha existente com dados reais
- **Player** — mesma conta, se participar de alguma campanha como jogador; se não houver, documentar essa lacuna

### Superfícies (conforme `components/campaign/CampaignNavBar.tsx`)

**Mestre vê (12 pills + Overview):**
1. Overview (landing hub)
2. `sessions`
3. `encounters`
4. `quests`
5. `players`
6. `player-notes` ⚠️ dmOnly
7. `npcs`
8. `locations`
9. `factions`
10. `notes`
11. `inventory` ⚠️ dmOnly
12. `mindmap`
13. `settings` ⚠️ dmOnly

**Player vê (9 pills + Overview):**
1. Overview
2. `sessions`
3. `encounters`
4. `quests`
5. `players`
6. `npcs`
7. `locations`
8. `factions`
9. `notes`
10. `mindmap`

### Viewports
| Device | Largura × Altura | Prioridade |
|---|---|---|
| Desktop (laptop típico do Mestre) | 1440 × 900 | P0 |
| Tablet (iPad na mesa) | 1024 × 768 | P1 |
| Mobile (player consultando no cel) | 390 × 844 | P0 |

## 3. O que capturar (método híbrido: funcional + jobs)

Pra cada combinação (papel × seção × viewport), Quinn coleta:

### 3a. Screenshot viewport (visível)
Nome: `{role}-{viewport}-{section}.png`
Ex: `dm-desktop-sessions.png`, `player-mobile-quests.png`

### 3b. Screenshot full-page (scroll completo)
Nome: `{role}-{viewport}-{section}--full.png`

### 3c. DOM snapshot
Nome: `{role}-{viewport}-{section}.yaml` (via `browser_snapshot`)

### 3d. Observações estruturadas em `findings.md`

Cada observação vira uma linha no findings com este formato:

```
## F-{NN} — {título curto}
- **Onde:** {role} / {viewport} / {section}
- **Evidência:** `screenshots/{file}.png`
- **Tag:** `truncation` | `nav-flicker` | `tab-misfit` | `empty-state-poor` | `mobile-broken` | `density-issue` | `discoverability` | `consistency` | `perf` | `copy`
- **Job impactado:** Mestre-Prep-1 | Mestre-Prep-2 | Mestre-Run-1 | Player-Read-1 | Player-Note-1 | Player-Next-1 (ver §4)
- **Severidade:** 🔴 blocker | 🟠 high | 🟡 medium | 🔵 low
- **Descrição:** 1–2 frases. O que é. Por que atrapalha.
- **Sugestão inicial:** (opcional, uma linha)
```

## 4. Mapa de Jobs (lente da Opção C)

Sally + John listaram os JTBD que a Campaign HQ deveria servir. Toda finding vai ser taggeada com qual job ela atrapalha.

### Mestre
- **Mestre-Prep-1** — Preparar próxima sessão em <5min (abrir campanha, ver onde parou, escolher quest/encontro, anotar gancho)
- **Mestre-Prep-2** — Criar/editar um NPC, local, facção ou quest sem perder contexto da campanha
- **Mestre-Run-1** — No meio da mesa, achar em <10s a info de um NPC/local/quest que o jogador mencionou
- **Mestre-Retro-1** — Depois da sessão, registrar o que aconteceu (session recap + notas privadas)

### Player
- **Player-Read-1** — Abrir campanha e em <30s entender "onde estou na história" (última sessão, próximo objetivo, NPCs vivos)
- **Player-Note-1** — Anotar algo durante/após sessão sem atrito (rascunho, tag, visível só pro Mestre ou pra grupo)
- **Player-Next-1** — Saber quando é a próxima sessão e o que preciso levar (ficha, preparação)

## 5. Roteiro de captura (ordem fixa, reprodutível)

### Setup
1. Resize 1440×900
2. Navegar pra `https://pocketdm.com.br`
3. Screenshot `landing-desktop.png` (baseline)
4. Login: `danielroscoe97@gmail.com` + senha via env/secret na sessão
5. Screenshot `dashboard-desktop.png` (pós-login)

### Mestre HQ — Desktop 1440×900
6. Navegar pra campanha owned (1ª da lista do dashboard)
7. Screenshot `dm-desktop-overview.png` + `--full.png` + snapshot
8. Pra cada section em ordem (`sessions, encounters, quests, players, player-notes, npcs, locations, factions, notes, inventory, mindmap, settings`):
   - Click na pill → aguardar 500ms
   - Screenshot viewport + full + snapshot
   - Registrar console errors (`browser_console_messages level=error`)

### Mestre HQ — Tablet 1024×768
9. Resize → repetir seção Overview + 3 seções P0 (`sessions, npcs, notes`)

### Mestre HQ — Mobile 390×844
10. Resize → repetir Overview + 3 P0 (`sessions, quests, notes`)
11. **Especial mobile:** capturar estado da nav pill scrollada — evidenciar "menu que aparece e some" (screenshot antes/durante/depois do scroll horizontal)

### Player HQ
12. Se houver campanha onde Dani é player → repetir Overview + 3 seções P0 (`sessions, quests, notes`) nos 3 viewports
13. Se NÃO houver → documentar como F-GAP-01 ("Dani não tem campanha como jogador — falta cobertura de teste real do papel")

### Jornadas end-to-end (teste de job, não de pill)
14. **J1 (Mestre-Prep-1):** logar → abrir campanha → identificar "onde parei" → chegar na próxima quest/encontro. Cronometrar cliques. Screenshots de cada passo.
15. **J2 (Mestre-Run-1):** logar → abrir campanha → buscar NPC "Grolda" (ou qualquer NPC existente) em <10s. Cronometrar.
16. **J3 (Player-Read-1):** abrir campanha como player → em 30s identificar: próxima sessão, última coisa que aconteceu, objetivo atual.

## 6. Não-escopo

- ❌ Combat screen (já tem própria lente — ver `CLAUDE.md` Combat Parity Rule)
- ❌ `/try` guest mode
- ❌ Onboarding/wizard (coberto em outro epic)
- ❌ Criar/editar/deletar dados — apenas leitura
- ❌ Performance metrics (CWV) — foco é UX/IA

## 7. Deliverables

- [ ] `screenshots/*.png` — captura completa
- [ ] `snapshots/*.yaml` — DOM references
- [ ] `findings.md` — observações estruturadas com tags + jobs
- [ ] `journeys.md` — resultado das 3 jornadas J1/J2/J3 cronometradas
- [ ] Handoff pra Fase 3 (Sally + John + Mary → redesign proposal)
