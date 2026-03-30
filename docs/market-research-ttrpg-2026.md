# Pesquisa de Mercado: TTRPG Digital Tools — Março 2026

> **Objetivo:** Dados factuais do mercado para embasar decisões de produto, pricing e posicionamento.
> **Data:** 2026-03-30

---

## 1. Tamanho do Mercado

| Métrica | Valor | Fonte |
|---------|-------|-------|
| Mercado global TTRPG | **USD 2.41 bilhões** (2026) | WiFi Talents / Global Growth Insights |
| CAGR | 11.84% (2026-2035) | Global Growth Insights |
| Ferramentas digitais TTRPG | **USD 551 milhões** projetado até 2030 | World Metrics |
| Adoção de plataformas digitais | **48%** dos jogadores de TTRPG | WiFi Talents |
| Receita digital/DTC | **40%** da receita total de TTRPG | WiFi Talents |
| D&D Beyond registrados | **15 milhões** (end 2023) | Hasbro reports |
| Roll20 MAU | **1.5 milhão** | Roll20 |
| D&D 5e no Roll20 | **51.5%** dos jogos | Roll20 stats |
| Foundry VTT market share | **18%** do mercado pago | Foundry VTT |
| Discord em grupos TTRPG online | **78%** | Community surveys |

**Insight:** O mercado é grande e crescendo ~12% ao ano. Ferramentas digitais são 40% da receita — mas a maioria é capturada por plataformas online-first (Roll20, D&D Beyond). O segmento "mesa presencial + companion digital" é sub-servido.

---

## 2. Landscape Competitivo Detalhado

### D&D Beyond
- **Preço:** Free / Hero $2.99/mo / Master $5.99/mo + livros separados
- **Status 2026:** Reconstrução total anunciada (Feb 2026 roadmap). Novo engine modular, Character Builder overhaul, DM tools suite
- **Quickbuilder** lançado Mar 2026 (level 1 character creation simplificado)
- **Maps VTT:** Rebuild com 3D dice e "searchable encyclopedia"
- **Problemas atuais:** Não consegue ver monster sheet + initiative tracker simultaneamente. Condition tracking descrito como "sorely lacking". Designing encounters "harder than doing it on paper"
- **Crises de confiança:**
  - Jan 2023: OGL crisis → cancelamentos massivos crasharam os servidores
  - Aug 2024: Forçou update 2024 em character sheets → backlash, walked back
- **Relevância:** Em rebuild = janela aberta. Mas quando terminar (~2027?) será o gorila de 15M users

### Roll20
- **Preço:** Free / Plus $5.99/mo / Pro $10.99/mo / Elite (?)
- **Features:** Dynamic lighting, character sheets, voice/video, API scripting
- **Problemas:** Stagnação percebida. Server instability. Learning curve alta. Dynamic lighting difícil de configurar. Automação requer coding
- **Relevância:** Maior VTT mas cada vez mais pressionado por Foundry e FG Free. NÃO é otimizado para mesa presencial

### Foundry VTT
- **Preço:** $50 one-time (perpétuo, inclui updates)
- **Hosting:** Self-hosted ou The Forge ($3.99/mo terceirizado)
- **Features:** Milhares de módulos comunitários. Automação profunda. Self-hosted = dados são seus
- **Problemas:** Learning curve íngreme. Setup inicial demorado. Dependência de módulos cria complexidade
- **Relevância:** Poder máximo, mas público técnico. NÃO competimos diretamente — públicos diferentes

### Fantasy Grounds
- **Preço:** **GRATUITO** desde Nov 2025 (antes $50+ para host)
- **Revenue:** Marketplace de conteúdo licenciado (3000+ produtos, 50+ sistemas)
- **Novidades:** Online Reader (web-based beta), Loyalty Rewards
- **Relevância:** Maior disruption recente. Catálogo de conteúdo licenciado é imbatível. Mas UI datada e learning curve alta. Novamente: online-first

### Alchemy RPG
- **Preço:** Free (3 games) / Unlimited $8/mo ou $88/year
- **Diferencial:** Narrative-first VTT. Ambient sounds, animated effects, storytelling scenes
- **Features:** Grid tools, fog of war, voice/video, Streamer Mode, safety tools (Lines and Veils)
- **Relevância:** Posicionamento interessante (narrativa > tática) mas combat tracking é fraco

### Shieldmaiden
- **Preço:** Free / Patreon tiers
- **Features:** Initiative, HP, conditions, player-facing display, D&D Beyond sync, ambience (YouTube audio)
- **Problemas:** Não tracka damage types. Não é VTT. Open source (GitHub)
- **Relevância:** Competidor mais direto em combat tracking. MAS: sem rules oracle integrado, sem guest access sem login, sem versioning dual 2014/2024

### Owlbear Rodeo
- **Preço:** Free (2 rooms) / Paid ~$6/mo
- **Diferencial:** "Powerfully simple" — anti-complexidade. Map + tokens + play
- **Problemas:** Sem character sheets, sem rules automation, sem combat tracking nativo (usa extensions)
- **Relevância:** Validação do conceito "simplicidade vende". Modelo aspiracional para UX

### Improved Initiative
- **Preço:** Free, open source
- **Features:** SRD monsters, custom NPCs, player view URL, automated damage calc, mass initiative
- **Problemas:** UX datada. Round counter escondido. Turn advancement enterrado em menus colapsáveis. Sem integração D&D Beyond
- **Relevância:** O que NÃO fazer em UX. Funcionalidade existe mas experiência é frustrante

### Game Master 5th Edition (Lions Den)
- **Preço:** Free (limitado: 1 campaign, 3 encounters) / IAP premium
- **Plataformas:** iOS, Android, Amazon
- **Features:** Combat tracker, dice, SRD 5.1, import homebrew, integra com Fight Club 5e
- **Relevância:** Único mobile-native. Mas datado, iOS-first, sem real-time sync

---

## 3. Reclamações Reais de DMs (Pain Points)

Compilado de fórums, Reddit, reviews e artigos:

| # | Pain Point | Frequência | Pocket DM Resolve? |
|---|-----------|------------|-------------------|
| 1 | **Combate é lento** — gerenciar initiative + HP + conditions + stat blocks simultaneamente | Muito alta | SIM — tudo em uma tela |
| 2 | **Fragmentação de ferramentas** — D&D Beyond + tracker + VTT + YouTube | Muito alta | SIM — combat + oracle + sync integrados |
| 3 | **Condition tracking é péssimo em todos** — dots coloridos, notas manuais | Alta | SIM — badges com ícones + duração por turno |
| 4 | **Stat blocks inacessíveis no combate** — trocar de tab pra ver habilidades | Alta | SIM — expansion inline, sem navegação |
| 5 | **Sem mobile-first** — tools são desktop-web, ruins em celular/tablet | Alta | SIM — player view mobile-first |
| 6 | **Overhead mata imersão** — tempo clicando UI = tempo sem narrar | Média | SIM — optimistic UI, keyboard shortcuts |
| 7 | **D&D Beyond VTT** — "harder than doing it on paper" | Média | SIM — setup ≤3 min |
| 8 | **Multi-monster ruim** — grupos do mesmo monstro mal gerenciados | Média | SIM — display_name, grouping, collective init |

**Conclusão:** Pocket DM resolve 8/8 dos pain points mais comuns. Nenhum concorrente resolve mais que 4.

---

## 4. Janela de Oportunidade (Timing)

| Evento | Data | Impacto |
|--------|------|---------|
| SRD 5.2 sob CC-BY-4.0 | 2024 | Licença legal para usar todo o conteúdo SRD |
| Fantasy Grounds fica gratuito | Nov 2025 | Reordena mercado, pressiona Roll20 |
| D&D Beyond 2024 controversy | Aug 2024 | 40k+ cancellations, confiança quebrada |
| D&D Beyond rebuild anunciado | Feb 2026 | Users sabem que plataforma atual está condenada |
| D&D Beyond rebuild completo | ~2027? | Janela fecha quando nova plataforma estabilizar |

**Janela:** ~12-18 meses (Mar 2026 → ~Mid 2027) para estabelecer categoria antes do D&D Beyond terminar o rebuild.

---

## 5. Pricing Benchmarks

| Ferramenta | Free | Tier 1 | Tier 2 | Modelo |
|------------|------|--------|--------|--------|
| D&D Beyond | Sim | $2.99/mo | $5.99/mo | Subscription + books |
| Roll20 | Sim | $5.99/mo | $10.99/mo | Subscription |
| Foundry VTT | — | $50 (one-time) | — | Perpétuo |
| Fantasy Grounds | **Tudo grátis** | — | — | Marketplace content |
| Alchemy RPG | Sim | $8/mo | — | Subscription |
| Owlbear Rodeo | Sim | ~$6/mo | — | Subscription |
| MasterApp | Sim | R$10/mo | R$25/mo | Subscription |
| **Pocket DM** | **Sim (beta)** | **R$14,90/mo** | **R$119,90/yr** | **Freemium** |

**Posicionamento de preço do Pocket DM:**
- Abaixo de Roll20 Pro ($10.99/mo ≈ R$55/mo)
- Acima de MasterApp Pro (R$10/mo) — justificado por real-time sync
- Competitivo com D&D Beyond Master ($5.99/mo ≈ R$30/mo)
- Muito acessível vs mercado USD

---

## Data de criação
2026-03-30
