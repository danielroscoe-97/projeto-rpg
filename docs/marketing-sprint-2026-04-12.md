# Sprint de Marketing — 12/abr/2026

> Sessão completa de configuração de canais, conteúdo e SEO.
> Responsável: Dani_ + Claude

---

## O que foi feito

### 1. Social Media — Infraestrutura

| Item | Detalhe |
|---|---|
| Página Facebook | Criada "Pocket DM", conectada ao Meta Business Suite |
| Meta Business Suite | IG @pocket.dm + FB Pocket DM conectados |
| Metricool | Conta grátis configurada, agendamento IG + FB |
| Ayrshare | Conta criada (free), API de posting requer plano pago |
| Banner YouTube | Criado 2560x1440 (dark+gold, crown d20, tagline) |
| Banner Facebook | Criado 820x312 (mesmo estilo) |
| Arquivo banners | `public/marketing/banner-youtube-facebook.html` |

### 2. Carrosseis de Monstros — Série "Monstro da Semana"

**22 carrosseis totais**, cada um com 6 slides (1080x1080).

| Status | Quantidade | Período |
|---|---|---|
| Agendados no Metricool | 10 (Owlbear → Kraken) | 15/abr → 13/mai |
| Pendentes | 12 (Skeleton → Oni) | Agendar na próxima sessão |

**Frequência**: Segunda + Quarta, IG + FB.

**Legendas**: 4 hashtags (#PocketDM #DnD5e #RPGBrasil #MestreDeRPG), formato curto.

**Ordem completa**: documentada em `memory/project_social_media_schedule.md`.

### 3. Reels — Pipeline de Vídeo

4 Reels HTML animados criados e enviados pro editor:

| # | Título | Duração | Arquivo |
|---|---|---|---|
| R3 | Top 5 Monstros Mais Icônicos | ~35s | `reel-03-top5-monstros.html` |
| R4 | Seu Baú É Um Mimic | ~25s | `reel-04-mimic-twist.html` |
| R5 | Build Capa Barsavi | ~25s | `reel-05-build-capa-barsavi.html` |
| R6 | Top 5 Magias Que Você Precisa | ~42s | `reel-06-top5-magias.html` |

**Estilo visual aprovado**: fundo dark, partículas flutuantes, glow radial, impact flash, speed lines, scan lines, ornamentos nos cantos, vinheta, animações de slam/bounce/float.

**Roteiros e captions**: `docs/social-media/posts/reel-rX-*.md`

**Workflow documentado**: `docs/social-media/workflow-reels.md`

**Regras de conteúdo**:
- Sem termos violentos (shadowban IG): evitar "morte", "matar", "sangue"
- Acentuação PT-BR correta sempre
- Sem emojis (SVGs apenas)
- 3-4 hashtags por post

### 4. Imagens para Social Media

18 imagens curadas em `docs/social-media/imagens/`:

**Tier S (uso prioritário)**:
- wizard fireball.png, divine monk.png, drizzt.png, autumn elf.png, dh19-inquisitor.png, cleric.png, fighter.png

**Tier A**: drow 2.png, drow.png, hero dragon.png, centaur.png, zombie dragon.png, chimera.png

**Tier B (uso limitado)**: paladin.png, character criation.png, moorbouder.png, male human art.png, old wizard.jpg

**Regra**: essas imagens são APENAS para social media (posts, Reels). NUNCA usar no site.

### 5. SEO — Correções Críticas

| Problema | Solução | Status |
|---|---|---|
| 10 erros de redirecionamento no Google | Domínio primário corrigido: `pocketdm.com.br` sem www | Corrigido |
| Sitemap com URLs erradas (www) | 64 arquivos atualizados com URL canônica correta | Corrigido |
| www redirecionando com 307 | Invertido: www → 301 → sem www | Corrigido |
| DNS desatualizado | A record atualizado para 216.198.79.1 | Corrigido |
| Env var NEXT_PUBLIC_SITE_URL | Atualizada no Vercel para `https://pocketdm.com.br` | Corrigido |

**URLs submetidas no Google Search Console**: 26 URLs (prioridades 1-4)
**Validação de correção**: solicitada para os 10 erros de redirecionamento

### 6. Ferramentas avaliadas

| Ferramenta | Resultado | Decisão |
|---|---|---|
| Meta Business Suite | Funciona, grátis | Usar para cross-posting IG+FB |
| Metricool | Grátis, 50 posts/mês, sem watermark | Usar para agendamento |
| Ayrshare | API requer plano pago ($149/mo), free tem watermark | Descartado |
| Buffer | $5/canal/mês, API incerta no plano básico | Não necessário agora |
| Playwright (automação Meta) | Browser fechou, instável | Descartado |

---

## Calendário Semanal Ativo

| Dia | Formato | Plataforma | Status |
|---|---|---|---|
| Segunda | Carrossel monstro | IG + FB (Metricool) | Ativo |
| Quarta | Carrossel monstro | IG + FB (Metricool) | Ativo |
| Sexta | Reel | IG + TikTok + YouTube Short | Aguardando editor |

---

## Projeção — Próximas Semanas

### Semana 14-18/abr
- [ ] Agendar 12 carrosseis restantes no Metricool (Skeleton → Oni)
- [ ] Publicar primeiro Reel (R3 ou R4) na sexta
- [ ] Submeter 10 URLs/dia no Google Search Console
- [ ] Beta Test #3 (17/abr) — validar quality gate fixes
- [ ] Primeiro post genuíno no Reddit r/rpg_brasil

### Semana 21-25/abr
- [ ] Instalar Meta Pixel no site (obrigatório antes dos ads)
- [ ] Blog post: "Melhores Apps pra Mestre de RPG 2026" (SEO bomb)
- [ ] Publicar Reel R5 (Build Capa Barsavi) na sexta
- [ ] Configurar Meta Ads (criativos, público, budget R$500-800/mês)
- [ ] Verificar Resend ativo para email nurturing pós-ebook
- [ ] Post em 2-3 grupos Facebook RPG Brasil

### Semana 28/abr - 2/mai
- [ ] Publicar Reel R6 (Top 5 Magias) na sexta
- [ ] Lançar Meta Ads (~25/abr)
- [ ] Post Reddit EN no r/DMAcademy
- [ ] Monitorar primeiros resultados de ads + SEO
- [ ] Criar novos Reels (R7: App Features, R8+)
- [ ] Plataforma funcional (~26/abr) — início da fase de lançamento

### Semana 5-9/mai
- [ ] Monitorar e otimizar Meta Ads (CPA, CTR)
- [ ] Preparar materiais para eventos BH (QR cards, demo)
- [ ] Blog post EN: "Best Free D&D Combat Tracker 2026"
- [ ] Acompanhar indexação Google (meta: 200+ URLs)
- [ ] Testar perguntas nas IAs e documentar se Pocket DM aparece

### Semana 12-16/mai
- [ ] Evento Taverna de Ferro BH (~15/mai)
- [ ] Fotos/vídeos do evento para Instagram
- [ ] Post recap pós-evento
- [ ] Abordar mestres profissionais de BH (Pro grátis em troca de uso)

### Semana 19-23/mai
- [ ] Evento Pixel Bar BH (~20/mai)
- [ ] Post recap pós-evento
- [ ] Avaliar resultados: cadastros, followers, leads ebook
- [ ] Product Hunt: preparar materiais (screenshots, tagline, descrição)
- [ ] Contato com blogs RPG para reviews/backlinks

### Junho
- [ ] Tormenta 20 como próximo sistema (P2, multi-sistema)
- [ ] Product Hunt launch (quando tiver 50+ cadastros)
- [ ] YouTube tutorial EN: "Best Free D&D 5e Combat Tracker 2026"
- [ ] Programa de afiliados com influencers RPG BR (explorar)

---

## KPIs para Acompanhar

| Métrica | Agora (12/abr) | Meta 30 dias | Meta 90 dias |
|---|---|---|---|
| Instagram followers | ~13 | 50+ | 200+ |
| Facebook page likes | ~0 | 20+ | 100+ |
| Google URLs indexadas | 99 | 200+ | 1.000+ |
| Ebook leads | baseline | 10+ | 50+ |
| Cadastros app | baseline | 10+ | 100+ |
| YouTube subscribers | ~0 | 10+ | 50+ |
| Posts agendados | 10 | 22 | 40+ |
| Reels publicados | 0 | 4 | 12+ |

---

## Arquivos de Referência

| Arquivo | Conteúdo |
|---|---|
| `docs/marketing-sprint-2026-04-12.md` | Este documento |
| `docs/social-media/workflow-reels.md` | Boas práticas e checklist de Reels |
| `docs/social-media/editorial-calendar.md` | Calendário editorial master |
| `docs/social-media/content-pillars.md` | 4 pilares de conteúdo |
| `docs/social-media/brand-social-guidelines.md` | Guidelines visuais |
| `docs/social-media/design-system-social.md` | Design system social |
| `docs/social-media/posts/` | Roteiros e captions de cada post/Reel |
| `docs/social-media/arts/` | HTMLs dos Reels e carrosseis |
| `docs/social-media/imagens/` | Imagens curadas pra social (NÃO usar no site) |
| `docs/estrategia-marketing-completa.md` | Estratégia geral de marketing |
| `docs/workstream-3-marketing-growth.md` | Plano de execução por sprints |
| `docs/analytics-funnel-strategy.md` | Funil e métricas |
| `public/marketing/banner-youtube-facebook.html` | Banners YouTube + FB |
| `scripts/schedule-social-posts.mjs` | Script de agendamento (Ayrshare — não funcional no free) |

---

> Última atualização: 12/abr/2026
> Próxima sessão de marketing: retomar pelos próximos passos acima
