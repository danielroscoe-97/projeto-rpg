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

### Fase 1 (agora)
- [x] Tabela ebook_leads criada
- [x] API de captura funcionando
- [x] CTA em 4 posts inline + todos os posts banner
- [x] Post dedicado ao e-book
- [x] Landing page /ebook/guia-mestre-eficaz
- [ ] Exportar PDF e colocar em public/ebooks/
- [ ] Testar fluxo completo (email → download)

### Fase 2 (email sequence)
- [ ] Integrar com serviço de email (Resend, Loops, ou Brevo)
- [ ] Email 1 (imediato): Link do PDF + boas-vindas
- [ ] Email 2 (D+3): "Já testou o Pocket DM?" + link /try
- [ ] Email 3 (D+7): Caso de uso real + depoimento de mesa
- [ ] Email 4 (D+14): Feature highlight (compêndio, condições, QR Code)

### Fase 3 (expansão)
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
