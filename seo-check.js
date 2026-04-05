const urls = [
  '/conditions', '/condicoes', '/diseases', '/doencas', '/damage-types', '/tipos-de-dano',
  '/ability-scores', '/atributos', '/actions', '/acoes-em-combate', '/classes', '/classes/barbarian',
  '/races', '/racas', '/races/dwarf', '/racas/dwarf', '/dice', '/dados', '/encounter-builder',
  '/calculadora-encontro', '/rules', '/regras', '/monsters/adult-red-dragon', '/monstros/dragao-vermelho-adulto'
];

async function checkSEO() {
  const results = {};
  for (const p of urls) {
    const url = 'http://localhost:3000' + p;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        results[p] = { error: res.status };
        continue;
      }
      const html = await res.text();
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
      const alternatesMatch = Array.from(html.matchAll(/<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi));
      const hasJsonLd = html.includes('type=\"application/ld+json\"');
      const has2014 = html.includes('2014');
      const has2024 = html.includes('2024');
      const hasEmojiMatch = html.match(/\p{Emoji_Presentation}/gu);
      
      results[p] = {
        title: titleMatch ? titleMatch[1] : null,
        desc: metaDesc ? metaDesc[1] : null,
        h1: h1Match ? h1Match[1] : null,
        canonical: canonicalMatch ? canonicalMatch[1] : null,
        alternates: alternatesMatch.length > 0 ? alternatesMatch.map(m => m[1] + ':' + m[2]) : [],
        hasJsonLd,
        has2014,
        has2024,
        hasEmoji: !!hasEmojiMatch
      };
    } catch(e) {
      results[p] = { error: e.message };
    }
  }
  require('fs').writeFileSync('tmp-seo-results.json', JSON.stringify(results, null, 2));
  console.log('Done running SEO script');
}
checkSEO();
