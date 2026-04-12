# Workflow: Blog Post — Criacao e Publicacao

Documento de referencia para criar, ilustrar e publicar blog posts no Pocket DM.

---

## 1. Arquitetura do Blog

### Arquivos principais

| Arquivo | Funcao |
|---------|--------|
| `lib/blog/posts.ts` | Registry de todos os posts (slug, titulo, imagem, categoria, keywords) |
| `components/blog/BlogPostContent.tsx` | Conteudo de cada post como componente React |
| `app/blog/page.tsx` | Pagina index do blog (hero + grid + portais) |
| `app/blog/[slug]/page.tsx` | Pagina de artigo individual (CONTENT_MAP + related posts) |
| `components/blog/BlogGrid.tsx` | Grid de cards, search, filtros, featured card |
| `lib/blog/feature-links.ts` | CTAs contextuais por categoria de post |

### Categorias

```ts
type BlogCategory = "tutorial" | "guia" | "lista" | "comparativo" | "build" | "devlog";
```

Cada categoria tem cor propria nos badges e filtros.

---

## 2. Hero Images

### Onde ficam

| Local | Conteudo |
|-------|---------|
| `public/art/blog/heroes/*.png` | Heroes finais (PNG 1280x720) usadas no blog |
| `docs/social-media/arts/blog-hero-templates.html` | Templates HTML das primeiras 7 heroes |
| `docs/social-media/arts/blog-hero-remaining.html` | Templates HTML das 12 heroes restantes |
| `docs/social-media/arts/assets/` | Artes de monstros usadas como overlay nas heroes |

### Padrao visual das heroes

Cada hero segue o mesmo design system:

- **Resolucao**: 1280x720px
- **Background**: gradiente dark navy (`#0d0d14` → `#13131E` → `#1A1A28`)
- **Grid sutil**: linhas douradas a 3% opacidade, 60px spacing
- **Vignette**: escurecimento radial nas bordas
- **Linha decorativa**: barra lateral esquerda de 4px com gradiente (cor varia por categoria)
- **Arte de monstro**: imagem PNG do D&D SRD como overlay, 25% opacidade, desaturada, posicionada bottom-right
- **Tag de categoria**: badge JetBrains Mono, cor da categoria
- **Titulo**: Cinzel 44px, dourado `#D4A853`, com text-shadow
- **Descricao**: Plus Jakarta Sans 18px, branco a 55% opacidade
- **Meta**: "Pocket DM · X min de leitura" em JetBrains Mono
- **Watermark**: "POCKET DM" em Cinzel, 30% opacidade, bottom-right

### Cores de linha lateral por categoria

| Categoria | Cor da linha |
|-----------|-------------|
| tutorial | `#D4A853` (gold padrao) |
| guia | `#34D399` (emerald) |
| lista | `#FBBF24` (amber) |
| comparativo | `#A78BFA` (purple) |
| build | `#FB7185` (rose) |
| devlog | `#D4A853` (gold) |

### Artes de monstros disponiveis

Localizadas em `docs/social-media/arts/assets/`:

ancient-red-dragon, chimera, death-knight, doppelganger, flameskull, gelatinous-cube, goblin, hydra, kraken, lich, medusa, mimic, minotaur, oni, owlbear, rust-monster, skeleton, tarrasque, troll, vampire, werewolf, zombie

Cada monstro tem versao full (`.png`) e token (`.png`).

### Como criar uma nova hero

#### Opcao A: Adicionar ao template HTML (recomendado)

1. Abrir `docs/social-media/arts/blog-hero-remaining.html`
2. Copiar um bloco `<div class="hero">...</div>` existente
3. Alterar:
   - Tag de categoria (`.tag-tutorial`, `.tag-guia`, etc.)
   - Arte do monstro (escolher um asset tematico)
   - Titulo e descricao
   - Tempo de leitura
   - Cor da `hero-line` (se nao for tutorial)
4. Abrir o HTML no navegador via HTTP server:
   ```bash
   cd projeto-rpg && python -m http.server 8899
   # Acessar: http://localhost:8899/docs/social-media/arts/blog-hero-remaining.html
   ```
5. Usar Playwright ou DevTools para capturar o elemento `.hero` em 1280x720:
   ```js
   // Playwright
   const hero = page.locator('.hero').nth(INDEX);
   await hero.screenshot({ path: 'public/art/blog/heroes/NOME.png', type: 'png', scale: 'css' });
   ```
6. Ou: DevTools → Ctrl+Shift+P → "Capture node screenshot" no elemento `.hero`

#### Opcao B: Export manual

1. Abrir o template HTML no Chrome
2. DevTools → selecionar o `.hero` desejado
3. Ctrl+Shift+P → "Capture node screenshot"
4. Salvar em `public/art/blog/heroes/` com o nome correto

### Mapeamento post → hero → monstro

| Post | Arquivo hero | Monstro |
|------|-------------|---------|
| diario-de-aventura | diario-de-aventura.png | ancient-red-dragon |
| como-usar-combat-tracker-dnd-5e | combat-tracker.png | death-knight |
| ferramentas-essenciais-mestre-dnd-5e | 5-ferramentas.png | owlbear |
| combat-tracker-vs-vtt-diferenca | tracker-vs-vtt.png | chimera |
| guia-condicoes-dnd-5e | condicoes.png | medusa |
| como-agilizar-combate-dnd-5e | agilizar-combate.png | vampire |
| como-usar-pocket-dm-tutorial | tutorial-pocket-dm.png | troll |
| como-montar-encontro-balanceado-dnd-5e | encounter-building.png | ancient-red-dragon |
| como-mestrar-dnd-primeira-vez | first-time-dm.png | goblin |
| musica-ambiente-para-rpg | ambient-music.png | lich |
| melhores-monstros-dnd-5e | melhores-monstros.png | tarrasque |
| guia-challenge-rating-dnd-5e | challenge-rating.png | hydra |
| teatro-da-mente-vs-grid-dnd-5e | theater-vs-grid.png | minotaur |
| build PT | cleric-sorcerer-build.png | capa-barsavi-portrait |
| build EN | cleric-sorcerer-build-en.png | capa-barsavi-portrait |
| guia-mestre-eficaz-combate-dnd-5e | ebook-guia-mestre-eficaz.png | kraken |
| como-gerenciar-hp-dnd-5e | gerenciar-hp.png | oni |
| 7-erros-mestre-combate-dnd | 7-erros-combate.png | flameskull |
| iniciativa-dnd-5e-regras-variantes | iniciativa.png | werewolf |

---

## 3. Processo Completo: Novo Blog Post

### Checklist

1. **Escrever o conteudo**
   - Definir slug, titulo, categoria, keywords
   - Escrever o conteudo seguindo o tom do blog (casual, direto, como um DM de verdade)
   - Para builds: seguir `docs/workflow-build-blog.md`

2. **Criar componente React**
   - Adicionar `BlogPostN` em `components/blog/BlogPostContent.tsx`
   - Usar H2, H3, paragrafos, listas, `<Tip>` para destaques
   - Incluir links internos para outros posts e pro compendio

3. **Registrar o post**
   - Adicionar entry em `BLOG_POSTS` no `lib/blog/posts.ts`
   - Todos os campos obrigatorios: slug, title, description, date, readingTime, keywords, ogTitle, category, image
   - Para posts bilíngues: slug EN termina em `-en`

4. **Mapear no router**
   - Adicionar import em `app/blog/[slug]/page.tsx`
   - Adicionar entrada no `CONTENT_MAP`

5. **Criar hero image**
   - Seguir processo da Secao 2
   - Escolher monstro tematico que nao esteja em uso por outro post
   - Salvar em `public/art/blog/heroes/SLUG.png`
   - Referenciar em `posts.ts` como `/art/blog/heroes/SLUG.png`

6. **Verificar**
   - `tsc --noEmit` — sem erros de tipo
   - Abrir `/blog` no dev server — card aparece com hero
   - Abrir `/blog/SLUG` — artigo renderiza, related posts funcionam
   - Verificar mobile

7. **Deploy**
   - Commit e push — Vercel deploya automaticamente

---

## 4. Regras Editoriais

### Tom e voz

- Escrever como um DM de verdade falando com outro DM
- Casual, direto, sem corporativismo
- Pode usar humor, exemplos de mesa, referencias do hobby
- NUNCA soar como marketing generico ou SEO spam

### SEO

- Titulo: maximo 60 chars (sem "| Pocket DM")
- Description: 120-155 chars
- Pelo menos 2 links internos por post
- Tabelas quando possivel (Google ama tabelas)
- H2s devem conter keywords primarias

### Imagens no conteudo

- Screenshots do app sao OK dentro do artigo (nao como hero)
- Referenciar imagens do `public/art/blog/` para screenshots de features
- NUNCA usar conteudo nao-SRD em posts publicos (ver CLAUDE.md)

### CTA padrao (final de cada post)

Todo post termina com CTA contextual definido em `lib/blog/feature-links.ts`.
O componente em `app/blog/[slug]/page.tsx` renderiza automaticamente baseado na categoria.

---

## 5. OG Images

Geradas automaticamente em `app/blog/[slug]/opengraph-image.tsx`.
Usa titulo do post, tempo de leitura, e styling dinamico.
Nao dependem das hero images — sao geradas on-the-fly pelo Next.js.
