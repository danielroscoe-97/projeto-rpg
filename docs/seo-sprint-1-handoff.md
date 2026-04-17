# Sprint 1 — Handoff do Mago do SEO

Ações que **você (Daniel)** precisa executar no Vercel Dashboard e no Google Search Console depois do deploy do Sprint 1. Sem isso, as mudanças de código não valem nada.

## Ordem de execução

Faça nesta ordem. Cada passo tem um critério de aceite.

---

### ☐ 1. Verificar redirect canônico (já deve estar OK)

**Por quê:** Confirmar que a inversão apex/www está estável.

**Comando:**
```bash
curl -sI "https://www.pocketdm.com.br" | grep -iE "HTTP|Location"
```

**Esperado:** `HTTP/1.1 301` e `Location: https://pocketdm.com.br/`

✅ Validado em 2026-04-17.

---

### ☐ 2. Atualizar env var na Vercel

**Por quê:** `NEXT_PUBLIC_SITE_URL` alimenta `metadataBase`, sitemap, robots e canonicals. Se estiver com `www`, os tags vão apontar para domínio que redireciona → warning no GSC.

**Onde:** Vercel Dashboard → Projeto → Settings → Environment Variables

**Variável:**
```
NEXT_PUBLIC_SITE_URL=https://pocketdm.com.br
```

**Escopo:** Production, Preview, Development (os 3).

**Depois de salvar:** triggera um redeploy (pode ser com um commit vazio ou pelo botão "Redeploy" no último deployment).

**Critério de aceite:**
```bash
curl -s "https://pocketdm.com.br/sitemap.xml" | head -20
```
Primeiras URLs devem começar com `<loc>https://pocketdm.com.br/` (sem www).

---

### ☐ 3. Deploy do branch `seo/sprint-1-canonical-foundation`

**Mudanças neste sprint:**
- `app/sitemap.ts` — timestamps reais, `yearly` para SRD, priority ajustada
- `app/robots.ts` — `host` declarado, `/r/` e `/*?*` disallowed
- `.env.example` — comentário explicando canonical
- `docs/seo-baseline-2026-04-17.md` — snapshot de métricas
- `docs/seo-sprint-1-handoff.md` — este doc

**Merge strategy:** abrir PR `seo/sprint-1-canonical-foundation → master`, fazer squash merge depois de review. Zero risco funcional (só SEO).

---

### ☐ 4. Resolver split-brain no Google Search Console

**Contexto:** GSC hoje tem múltiplas propriedades (provavelmente `https://www.pocketdm.com.br/`, `http://pocketdm.com.br/`, etc.). Os dados estão fragmentados.

**Ação:**

1. Entre no [Google Search Console](https://search.google.com/search-console)
2. Verifique se existe uma **Domain Property** `pocketdm.com.br` (ícone diferente, cobre todos protocolos/subdomínios)
3. Se **não existir**, clique em **Adicionar propriedade** → **Domínio** → digite `pocketdm.com.br` → verificar via DNS TXT (Vercel facilita isso)
4. Se **existir**, vá para ela e declare como propriedade principal

**Vantagem:** Domain Property agrega dados de apex + www + http + https em um lugar só.

**Critério de aceite:** Dados aparecem na Domain Property dentro de 2-3 dias.

---

### ☐ 5. Enviar sitemap explicitamente no GSC

**Por quê:** Hoje o GSC diz "Sitemap — Todas as páginas conhecidas" (nunca foi enviado formalmente).

**Onde:** GSC → Domain Property `pocketdm.com.br` → **Sitemaps** (menu lateral)

**Ação:** Adicionar `https://pocketdm.com.br/sitemap.xml` e clicar **Enviar**.

**Critério de aceite:** Status muda de "Não enviado" → "Êxito" em 24-48h. "URLs descobertas" sobe para ~2.000.

---

### ☐ 6. Solicitar reindex das 10 páginas âncora

**Por quê:** Após mudanças de canonical + env var, queremos acelerar o reprocessamento das páginas com mais tráfego.

**Onde:** GSC → **Inspeção de URL** (barra de busca no topo)

**Limite:** ~10 URLs/dia, 1 por vez.

**Lista prioritária (cola no campo e clica "Solicitar indexação"):**
1. `https://pocketdm.com.br/`
2. `https://pocketdm.com.br/monstros`
3. `https://pocketdm.com.br/monsters`
4. `https://pocketdm.com.br/magias`
5. `https://pocketdm.com.br/spells`
6. `https://pocketdm.com.br/atributos`
7. `https://pocketdm.com.br/encounter-builder`
8. `https://pocketdm.com.br/calculadora-encontro`
9. `https://pocketdm.com.br/itens`
10. `https://pocketdm.com.br/blog`

**Critério de aceite:** Cada uma mostra "URL está no Google" OU "URL pode ser indexada".

---

### ☐ 7. Verificar robots.txt e sitemap no ar

Após o deploy:

```bash
# Robots deve mostrar host: https://pocketdm.com.br
curl -s "https://pocketdm.com.br/robots.txt"

# Sitemap deve retornar XML sem erro
curl -sI "https://pocketdm.com.br/sitemap.xml" | head -5

# Conta URLs no sitemap (~2000 esperado)
curl -s "https://pocketdm.com.br/sitemap.xml" | grep -c "<loc>"
```

**Esperado:**
- `robots.txt`: contém `Host: https://pocketdm.com.br` e linhas de `Disallow`
- `sitemap.xml`: retorna `200 OK`, content-type `application/xml`
- Contagem: ~2.000 `<loc>` entries

---

### ☐ 8. Monitoring — anotar a data de hoje

Marcar no calendário: **2026-05-17** (30 dias) para comparar métricas com `docs/seo-baseline-2026-04-17.md`.

O que checar:
- Cliques/28d saiu de 18 → meta 100+
- URLs indexadas saiu de 119 → meta 1.500+
- "Detectadas mas não indexadas" caiu de 4.698 → meta <1.500
- Queries-âncora listadas no baseline tiveram movimento?

---

## Se algo der errado

### GSC reporta "URL não está no Google" após reindex
Normal nas primeiras 48h. Se persistir após 5 dias, investigar:
- Inspeção de URL → "Visualização do Google" → ver se o Google consegue renderizar
- Checar se a página está `noindex` por engano

### Sitemap retorna erro
Checar logs da Vercel. Provavelmente é erro em `getSrdMonstersDeduped()` ou similar. Se precisar, subir sitemap estático temporário.

### robots.txt não mostra `Host:`
Next.js não emite `Host` automaticamente quando `host` está no config — verificar se o deploy pegou a mudança. Fazer hard reload da rota `/robots.txt` no browser.

---

## Próximo sprint

Após estas ações executadas e com 7 dias de dados novos no GSC (~2026-04-24), começamos o **Sprint 2 — Metadata de Conversão**.

Vou precisar de:
- Ter `generateMetadata` dinâmica funcionando para ~2.000 páginas SRD
- Slug-map PT↔EN para hreflang real
- Rewrite manual de 8 indexes prioritários

Sem resposta necessária desse doc — me avisa quando terminou os checkboxes.
