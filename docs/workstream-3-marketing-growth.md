# Workstream 3: Marketing, Growth & Vídeo

> **Data:** 2026-04-04
> **Responsável:** Agente dedicado (pode rodar independente)
> **Objetivo:** Adquirir primeiros 100 cadastros, construir presença de marca
> **Métrica principal:** 100 cadastros em 90 dias, 1 vídeo publicado
> **Doc master:** `docs/strategic-3-workstreams.md`

---

## Contexto Estratégico

SEO demora 3-6 meses pra gerar tráfego consistente. Enquanto isso, precisamos de **canais paralelos** que tragam usuários mais rápido: vídeo YouTube, eventos presenciais em BH, Reddit, e presença em IAs (GEO).

### Posição Atual

| Canal | Status | Potencial |
|---|---|---|
| Google Organic (PT-BR) | Indexando (1-2 semanas) | ALTO — zero competição |
| Google Organic (EN) | Não ranqueando | MÉDIO — long-tail |
| YouTube | **ZERO** | **CRÍTICO** — sinal #1 pra IAs |
| Reddit | ZERO | ALTO — comunidade RPG ativa |
| Instagram | ZERO | MÉDIO — visual |
| Eventos presenciais | ZERO | ALTO — conversão direta |
| IAs (ChatGPT, Claude) | Não citam Pocket DM | ALTO — tráfego passivo |
| Product Hunt | Não lançado | MÉDIO — backlinks |

---

## PLANO DE EXECUÇÃO

### SPRINT 1 — Vídeo + Materiais Base (Prioridade 🔴 P0)

#### 1.1 — Vídeo "Pocket DM em 3 Minutos" (HTML Animado)

**Por que é P0:** YouTube é o sinal #1 para IAs (ChatGPT, Perplexity, Gemini) citarem um produto. Sem vídeo, somos invisíveis para IAs. Além disso, o vídeo serve como:
- Conteúdo para YouTube (SEO + GEO)
- Demo para mostrar nos eventos em BH
- Embed na landing page
- Conteúdo para Instagram Reels / TikTok (versão curta)

**Abordagem: HTML Animado → Screen Record**

Em vez de editar vídeo manualmente, criamos uma **apresentação HTML animada** com:
- Transições CSS suaves entre cenas
- Screenshots reais do app embeddados
- Texto overlay com mensagens-chave
- Duração controlada (3 minutos)
- Dani_ grava a tela rodando o HTML (OBS ou ScreenPal)
- Opcionalmente: narração por cima (ou só música de fundo)

**Roteiro do Vídeo (3 minutos):**

```
CENA 1 (0:00 - 0:15) — HOOK
━━━━━━━━━━━━━━━━━━━━━━━━
Texto: "Cansado de gerenciar combate no papel?"
Visual: Mesa de RPG bagunçada (foto) → fade para tela do Pocket DM
Transição: Fade

CENA 2 (0:15 - 0:30) — PROPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━
Texto: "Pocket DM — Combat Tracker gratuito para D&D 5e"
Texto: "Feito para mesas presenciais"
Visual: Logo crown d20 + tagline "Master your table."
Transição: Slide left

CENA 3 (0:30 - 1:00) — DEMO: BUSCAR MONSTRO
━━━━━━━━━━━━━━━━━━━━━━━━
Texto: "1. Busque qualquer monstro SRD"
Visual: Screenshot/GIF do compêndio em ação
Highlight: Barra de busca, resultados, stat block expandido
Texto: "1.100+ monstros • 2014 + 2024 • Bilíngue"
Transição: Slide right

CENA 4 (1:00 - 1:30) — DEMO: COMBATE
━━━━━━━━━━━━━━━━━━━━━━━━
Texto: "2. Gerencie combate em tempo real"
Visual: Screenshot do combat tracker (initiative, HP bars, conditions)
Highlight: Keyboard shortcuts (Space = next turn), HP controls, condition badges
Texto: "Conditions • Death Saves • Leaderboard • Undo"
Transição: Scale up

CENA 5 (1:30 - 2:00) — DEMO: PLAYER VIEW
━━━━━━━━━━━━━━━━━━━━━━━━
Texto: "3. Jogadores acompanham no celular"
Visual: Split screen — DM laptop (esquerda) + Player celular (direita)
Highlight: QR code → player abre no celular → vê turno, HP, condições
Texto: "Sem app • Sem login • Sem cadastro"
Transição: Fade

CENA 6 (2:00 - 2:20) — FEATURES EXTRAS
━━━━━━━━━━━━━━━━━━━━━━━━
Texto: "E mais..."
Visual: Grid de features com ícones:
  🎵 Música ambiente  |  📖 Compêndio SRD  |  🎲 Dice Roller
  ⚔️ Encounter Builder |  📊 Leaderboard   |  🌙 Dark Mode
Transição: Stagger in

CENA 7 (2:20 - 2:45) — DIFERENCIAL
━━━━━━━━━━━━━━━━━━━━━━━━
Texto: "Por que Pocket DM?"
Visual: Comparação visual (cards lado a lado):
  ❌ Roll20: complexo, online-first
  ❌ D&D Beyond: pago, sem tracker
  ❌ Papel: lento, desorganizado
  ✅ Pocket DM: simples, grátis, presencial
Transição: Flip

CENA 8 (2:45 - 3:00) — CTA
━━━━━━━━━━━━━━━━━━━━━━━━
Texto: "Teste agora — grátis, sem cadastro"
Visual: Logo grande + URL pocketdm.com.br/try
QR Code animado aparecendo
Texto: "pocketdm.com.br" grande e centralizado
Transição: Zoom in
```

**Implementação técnica do HTML:**

Criar arquivo `public/video/pocket-dm-demo.html` com:
- CSS animations (keyframes, transitions)
- JavaScript para controle de timing
- Screenshots reais do app como imagens
- Auto-play (roda sozinho, basta abrir e gravar)
- Resolução: 1920x1080 (YouTube standard)
- Fundo: dark (#0F0F0F) com gold (#D4A853) accents (brand guide)
- Font: Cinzel (headings), Plus Jakarta Sans (body)

**Critérios de aceite:**
- [ ] HTML roda standalone (abre no browser, auto-play)
- [ ] 3 minutos de duração controlada
- [ ] Paleta dark + gold (brand guide)
- [ ] Screenshots reais do app embeddados
- [ ] CTA final com URL e QR code
- [ ] Resolução 1920x1080
- [ ] Smooth transitions (sem jank)

**Esforço:** M (médio — é HTML/CSS/JS, não edição de vídeo)

**Após criar o HTML:**
1. Dani_ grava a tela com OBS (free) em 1080p
2. Opcionalmente adiciona narração em PT-BR
3. Upload para YouTube com:
   - Título: "Pocket DM — Combat Tracker Gratuito para D&D 5e | Tutorial em 3 Minutos"
   - Description: keywords + link pra /try
   - Tags: combat tracker, D&D 5e, mestre de RPG, ferramenta gratuita
   - Thumbnail: screenshot do app com texto "GRÁTIS"

---

#### 1.2 — QR Code Materials (Para eventos)

**Spec:**
- Design de cartão 9x5cm com:
  - Logo Pocket DM (crown d20)
  - QR code → pocketdm.com.br/try?utm_source=card&utm_medium=event
  - Texto: "Combat Tracker D&D 5e — Grátis" 
  - URL visível: pocketdm.com.br
- Formato: PDF pronto para impressão (gráfica ou impressora doméstica)
- 50 cartões por folha A4

**Implementação:**
- Criar `public/marketing/qr-card.html` (renderiza em browser, print-ready)
- Usar QR code lib existente no projeto (`qrcode`)
- UTM tags para tracking

**Esforço:** P (pequeno)

---

#### 1.3 — Versão Curta (30s) para Instagram Reels

**Spec:**
- Recorte do vídeo de 3 min:
  - Hook (3s) + Combat demo (10s) + Player view (10s) + CTA (7s)
- Mesmo HTML animado, versão compacta
- Resolução: 1080x1920 (vertical para Stories/Reels)

**Criar:** `public/video/pocket-dm-reel.html`

**Esforço:** P (derivado do vídeo principal)

---

### SPRINT 2 — Eventos Presenciais BH (Prioridade 🟡 P1)

#### 2.1 — Playbook Evento Bar RPG

**Calendário:**
- Maio 2026: Preparação
- Junho 2026: Primeiro evento (Taverna de Ferro)
- Junho 2026: Segundo evento (Pixel Bar)
- Julho 2026: Terceiro evento (Garagem do Nerd)

**ANTES do evento (2 semanas):**
- [ ] Imprimir 50 cartões QR (item 1.2)
- [ ] Preparar mesa: laptop/tablet + dados + miniaturas
- [ ] Preparar encontro pré-montado no app (4-5 monstros)
- [ ] Ensaiar demo de 3 min (mesmo roteiro do vídeo)
- [ ] Contatar bar para confirmar presença
- [ ] Configurar UTM tags específicas por evento

**DURANTE o evento:**
- [ ] Chegar cedo, montar mesa em local visível
- [ ] Jogar normalmente — app fala por si
- [ ] Quando perguntarem "o que é isso?":
  - Mostrar Pocket DM rodando
  - Dar cartão QR
  - "É grátis, só abrir no celular"
- [ ] Tirar fotos/vídeos (com permissão)
- [ ] Abordar dono do bar:
  - "Pocket DM como combat tracker oficial da casa?"
  - "QR codes nas mesas de RPG?"
  - "Evento mensal de D&D com Pocket DM?"

**DEPOIS do evento (1 semana):**
- [ ] Postar fotos no Instagram com contexto
- [ ] Post no Reddit r/rpg_brasil (genuíno, não propaganda)
- [ ] Email para dono do bar reforçando parceria
- [ ] Monitorar cadastros vindos das UTM tags do evento
- [ ] Documentar aprendizados

**Métricas por evento:**
| Métrica | Meta |
|---|---|
| Pessoas que viram o app | 20-50 |
| QR codes escaneados | 5-15 |
| Trials guest | 3-10 |
| Cadastros | 1-3 |
| Feedback qualitativo | 5+ comentários |

---

#### 2.2 — Mestres Profissionais de BH

**Estratégia:** Abordar mestres que cobram por sessão e oferecer Pro grátis em troca de uso + feedback.

**Ação:**
- [ ] Identificar 3-5 mestres profissionais em BH (Discord, Instagram, grupos Facebook)
- [ ] Oferecer: Pro lifetime grátis + suporte direto
- [ ] Em troca: usar o Pocket DM nas mesas + feedback mensal
- [ ] Cada mestre profissional tem 4-6 players/sessão × 4 sessões/mês = 16-24 players/mês expostos

**Impacto:** 5 mestres × 20 players/mês = 100 exposições/mês (canal viral orgânico)

---

### SPRINT 3 — Comunidade Online (Prioridade 🟡 P1)

#### 3.1 — Reddit (Posts Genuínos)

**Subreddits alvo:**
| Subreddit | Idioma | Tamanho | Tipo de Post |
|---|---|---|---|
| r/rpg_brasil | PT-BR | ~50K | "Criei um combat tracker gratuito pra mesa presencial" |
| r/DMAcademy | EN | ~800K | "How I speed up combat with a free tracker" |
| r/dndnext | EN | ~1M | "Free combat tracker for in-person D&D" |
| r/DnD | EN | ~3M | Screenshot + contexto |

**Regras de ouro:**
1. NUNCA postar propaganda direta — contar história genuína
2. Incluir screenshots do app em contexto de uso
3. Responder TODOS os comentários
4. Aguardar pelo menos 1 semana entre posts
5. Ser transparente: "sou o dev, criei isso pra minha mesa"

**Templates de post:**

**r/rpg_brasil:**
```
Título: Criei um combat tracker gratuito em português pra mesas presenciais de D&D

Corpo:
Oi pessoal! Sou mestre há X anos e sempre me frustrei com [pain point].
Então criei o Pocket DM — é gratuito, funciona no browser, e os jogadores 
acompanham no celular sem precisar de conta.

[Screenshot do app]

Funcionalidades:
- Initiative tracker com HP, conditions, death saves
- 1.100+ monstros SRD (2014 + 2024)
- Música ambiente integrada
- Jogadores entram via QR code, sem cadastro

Se quiserem testar: [link]
Feedback é super bem-vindo!
```

**r/DMAcademy:**
```
Título: Free combat tracker that actually works for in-person D&D

Corpo:
I've been DMing for X years and always struggled with [pain point]. 
I built Pocket DM — it's free, runs in the browser, and players follow 
along on their phones without creating an account.

[Screenshot]

Key features: [list]
Try it: [link]

Would love feedback from fellow DMs!
```

---

#### 3.2 — Instagram @pocketdm

**Tipo de conteúdo:**
| Formato | Frequência | Exemplo |
|---|---|---|
| Screenshot do app | 2x/semana | Feature highlight com texto overlay |
| Foto da mesa | 1x/semana (pós evento) | "Mesa de D&D com Pocket DM" |
| Reel 30s | 1x/semana | Versão curta do vídeo demo |
| Dica de mestre | 1x/semana | "5 dicas pra agilizar combate" |
| Behind the scenes | 1x/mês | "Como um solo dev constrói o Pocket DM" |

**Não fazer agora** — criar conta e postar primeiro conteúdo junto com o vídeo YouTube (Sprint 1).

---

### SPRINT 4 — Escala (Prioridade 🟢 P2, Q4 2026+)

#### 4.1 — Product Hunt Launch

**Quando:** Depois de 3+ meses de SEO + 100+ cadastros
**Prep:**
- [ ] Maker profile no Product Hunt
- [ ] Screenshots profissionais (5-7)
- [ ] Tagline em inglês
- [ ] Hunter (alguém influente pra submeter)

**Impacto:** 5.000+ visitantes + backlinks permanentes

#### 4.2 — Contato com Blogs RPG

**Targets:**
| Blog | Idioma | Relevância |
|---|---|---|
| Arcane Eye | EN | Listas "Best DM Tools" |
| Sly Flourish | EN | DM productivity |
| The Gamer | EN | Gaming tools |
| RPGista | PT-BR | Comunidade BR |
| Mundos de Papel | PT-BR | RPG BR |

**Objetivo:** Inclusão em listas "Best D&D combat trackers 2026" → backlinks

#### 4.3 — YouTube Tutorial EN

**Título:** "Best Free D&D 5e Combat Tracker 2026 — Pocket DM"
**Quando:** Q4 2026 (depois de ter tração PT-BR)
**Formato:** Mesmo HTML animado adaptado para EN

---

## GEO — Aparecer nas IAs

### O que já fizemos:
- Entity clarity (Organization schema com knowsAbout)
- FAQ answer-first (23 Q&As)
- SoftwareApplication schema
- Bing Webmaster Tools (ChatGPT usa Bing)

### O que falta:
| Ação | Impacto GEO | Quando |
|---|---|---|
| Vídeo YouTube | MUITO ALTO (sinal #1) | Sprint 1 |
| Posts Reddit | ALTO (menções terceiros) | Sprint 3 |
| Backlinks blogs | ALTO (domain authority) | Sprint 4 |
| Product Hunt | MÉDIO (citação + backlink) | Sprint 4 |

### Monitoramento GEO (mensal):
Perguntar nas IAs e registrar:
```
ChatGPT: "What's the best free D&D combat tracker?"
Claude: "Recommend a combat tracker for in-person D&D"
Perplexity: "best dnd 5e combat tracker 2026"
Gemini: "combat tracker D&D gratuito"
```

---

## Métricas de Sucesso

| Métrica | Meta 30 dias | Meta 90 dias | Meta 180 dias |
|---|---|---|---|
| Vídeo YouTube publicado | 1 | 1 | 2 (PT + EN) |
| Views YouTube | 50 | 500 | 2.000 |
| Eventos presenciais | 0 | 2-3 | 5-6 |
| Posts Reddit | 0 | 2-3 | 5+ |
| Instagram followers | 0 | 50 | 200 |
| Cadastros (total) | 10 | 100 | 500 |
| Menção em IA | 0 | 0-1 | 1+ |
| Backlinks externos | 0 | 2-3 | 10+ |

---

## Custos Estimados

| Item | Custo | Quando |
|---|---|---|
| Cartões QR (impressão) | ~R$ 50 | Maio 2026 |
| OBS Studio (gravação) | R$ 0 (free) | Maio 2026 |
| Instagram (conta) | R$ 0 | Junho 2026 |
| Google Ads (opcional) | R$ 200-500/mês | Se quiser acelerar |
| Influencer RPG BR (futuro) | R$ 500-2.000/vídeo | Q4 2026 |
| RPGCon 2027 (stand + viagem) | R$ 500-1.000 | 2027 |
| **Total imediato** | **~R$ 50** | |

---

## Checklist de "Done" por Entrega

**Vídeo HTML:**
- [ ] HTML roda standalone em 1080p
- [ ] 3 minutos de duração
- [ ] Brand guide respeitado (dark + gold, Cinzel, sem emoji)
- [ ] Screenshots reais do app
- [ ] CTA final com QR code + URL

**QR Cards:**
- [ ] PDF print-ready em A4
- [ ] QR aponta pra /try com UTM tags
- [ ] Logo + texto legíveis

**Posts Reddit:**
- [ ] Tom genuíno (não propaganda)
- [ ] Screenshot incluída
- [ ] Seguem regras do subreddit

---

> **Última atualização:** 2026-04-04
