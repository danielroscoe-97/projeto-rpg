# Funil de Aquisição — E-book "Guia do Mestre Eficaz no Combate"

## Visão Geral

```
Tráfego orgânico (SEO/Social)
    ↓
Blog posts (15 artigos + 1 dedicado ao e-book)
    ↓
CTA inline ou banner → captura de email
    ↓
Download do PDF gratuito
    ↓
Nurturing (email sequence)
    ↓
Conversão → signup no Pocket DM
```

## Pontos de Captura (onde o CTA aparece)

| Local | Variante | Posts |
|-------|----------|-------|
| Inline no corpo do post | `EbookCTA variant="inline"` | Post 1 (combat tracker), Post 5 (agilizar combate), Post 7 (encontro balanceado), Post 10 (mestrar primeira vez) |
| Banner no final de TODOS os posts | `EbookCTA variant="banner"` | Todos os 16 posts (via `[slug]/page.tsx`) |
| Post dedicado do e-book | Conteúdo + banner | `/blog/guia-mestre-eficaz-combate-dnd-5e` |
| Landing page do e-book | Banner central | `/ebook/guia-mestre-eficaz` |

## Infraestrutura

- **Tabela Supabase**: `ebook_leads` (email, ebook_slug, created_at)
- **API**: `POST /api/ebook-lead` (aceita anonymous, grava com upsert)
- **RLS**: Insert público, select apenas admin (danielroscoe97@gmail.com)
- **PDF**: `public/ebooks/guia-mestre-eficaz-no-combate.pdf`
- **HTML fonte**: `docs/ebook-guia-mestre-eficaz-no-combate.html` (exportar via Chrome Print)

## Próximos Passos — Nurturing

### Fase 1 — Infraestrutura (CONCLUÍDA 2026-04-12)
- [x] Tabela ebook_leads criada (migration 132)
- [x] API de captura funcionando (POST /api/ebook-lead)
- [x] CTA em 4 posts inline + todos os posts banner
- [x] Post dedicado ao e-book (BlogPost16)
- [x] Landing page /ebook/guia-mestre-eficaz
- [x] PDF exportado e em public/ebooks/
- [x] Auto-download do PDF ao submeter email (dispara download + mostra fallback)
- [x] SEO completo na LP: metadata, OG, Twitter card, canonical, JSON-LD (Book + FAQ + Breadcrumb)
- [x] Sitemap inclui /ebook/guia-mestre-eficaz (priority 0.9)

### Fase 2 — Email Nurturing (CONCLUÍDA 2026-04-12)
- [x] Integrado com Resend (HTTP API, RESEND_API_KEY no Vercel)
- [x] Email 1 (imediato): "Seu guia tá aqui" + PDF + preview 5 caps + CTA /try
- [x] Email 2 (D+3): "Já testou a iniciativa automática?" + QR Code + CTA /try
- [x] Email 3 (D+7): "Como ficou o combate?" + transparência + CTA criar conta
- [x] Email 4 (D+14): "1.100 monstros prontos" + compêndio + CTA conta
- [x] Cron diário (Vercel, 10h UTC) para disparar Emails 2-4 automaticamente
- [x] Tracking por lead: nurturing_2/3/4_sent_at (migration 133)
- [x] CRON_SECRET configurado no Vercel

### Fase 2.5 — Conteúdo SEO + Social (CONCLUÍDA 2026-04-12)
- [x] Blog post 17: "Como Gerenciar HP no D&D 5e sem Planilha" (tutorial)
- [x] Blog post 18: "7 Erros que Mestres Cometem no Combate de D&D" (lista)
- [x] Blog post 19: "Iniciativa D&D 5e: Regras, Variantes e Como Automatizar" (guia)
- [x] Carrossel Instagram: "5 Erros que Travam seu Combate" (7 slides)
- [x] Carrossel Instagram: "Antes vs Depois: Combate de D&D" (5 slides)
- [x] Rascunhos de posts para Reddit, Facebook, Discord, Twitter/X (7 posts)

### Fase 3 (pendente — expansão)
- [ ] Segundo e-book: "Bestiário Essencial — 10 Monstros que Todo Mestre Deveria Usar"
- [ ] Terceiro e-book: "Build Bible — Fichas Prontas de D&D 5e"
- [ ] Integrar lead scoring no Supabase (quantos e-books baixou, visitou /try, etc.)
- [ ] A/B test no CTA (inline vs banner, copy variations)

## Métricas a Acompanhar

| Métrica | Como medir |
|---------|-----------|
| Leads capturados | `select count(*) from ebook_leads` |
| Taxa de conversão CTA → lead | Analytics event vs count de leads |
| Lead → signup | Cross-reference ebook_leads.email com users.email |
| Lead → uso do app | Cross com sessions/encounters criadas |
