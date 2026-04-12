# Prompt de Revisao — i18n + SRD Compliance Audit

> Use este prompt para pedir a outro agente ou revisor que valide todas as mudancas de internacionalizacao e protecao de dados SRD feitas no Pocket DM.

---

## Contexto

O Pocket DM recebeu uma serie de mudancas de internacionalizacao (i18n) que adicionaram:
- Traducao PT-BR de TODO o conteudo do compendio (monstros, magias, itens, talentos, condicoes, antecedentes, racas, classes)
- Landing page bilingue (PT-BR + EN) via next-intl
- Toggle de idioma persistente (localStorage + cookie NEXT_LOCALE)
- Filtro de CR com selecao de valores especificos
- Scripts de traducao reutilizaveis (5 scripts em scripts/)

## O que revisar

### 1. Protecao SRD — Vazamento de Dados (PRIORIDADE MAXIMA)

O projeto tem uma regra IMUTAVEL: conteudo nao-SRD NUNCA pode aparecer em paginas publicas. Verificar:

```bash
# 1. Verificar que NENHUM arquivo de traducao PT esta em public/srd/
ls public/srd/ | grep -i "pt\|names\|descriptions"
# Esperado: ZERO resultados

# 2. Verificar que todos os arquivos PT estao em data/srd/ (server-only)
ls data/srd/*pt* data/srd/*names*
# Esperado: ~11 arquivos

# 3. Verificar que a API auth-gated NAO serve arquivos de traducao
grep -A5 "ALLOWED_FILES" app/api/srd/full/\[...path\]/route.ts
# Esperado: Nenhum arquivo *-pt.json na lista

# 4. Verificar que ptNameMap no SSR so inclui monstros SRD
grep -A10 "srdSlugs" app/monsters/page.tsx app/monstros/page.tsx
# Esperado: ptNameMap filtrado por srdSlugs (Set de slugs SRD)

# 5. Verificar que paginas de magias usam helpers server-side
grep "getSpellNamePt\|getSpellDescriptionPt" app/magias/page.tsx app/spells/page.tsx
# Esperado: Traducoes resolvidas server-side, nao passadas como blob ao client

# 6. Contar quantos nomes vao no HTML publico de /monsters
# Abrir https://pocketdm.com.br/monsters no browser
# View Source > buscar por "ptNameMap" ou "namePt"
# Esperado: ~776 monstros SRD (nao 4085)
```

### 2. Qualidade das Traducoes

```bash
# Verificar amostra aleatoria de traducoes
node -e "
const files = [
  ['data/srd/monster-descriptions-pt.json', 'name'],
  ['data/srd/spell-descriptions-pt.json', 'name_pt'],
  ['data/srd/item-descriptions-pt.json', 'name_pt'],
  ['data/srd/feat-descriptions-pt.json', 'name_pt'],
  ['data/srd/background-descriptions-pt.json', 'name_pt'],
];
for (const [f, field] of files) {
  const data = require('./' + f);
  const entries = Object.entries(data).filter(([,v]) => v[field]);
  const sample = [];
  for (let i = 0; i < 10; i++) {
    const idx = Math.floor(Math.random() * entries.length);
    const [k, v] = entries[idx];
    sample.push(k + ' -> ' + v[field]);
  }
  console.log('\n=== ' + f.split('/').pop() + ' ===');
  for (const s of sample) console.log('  ' + s);
}
"
```

Procurar por:
- Nomes meio traduzidos (mix PT + EN): ex. "Cajado de Magi" (deve ser "Cajado dos Magi" ou manter "Staff of the Magi")
- Contracoes faltando: "de o" em vez de "do", "de a" em vez de "da"
- Nomes proprios que foram traduzidos incorretamente
- Duplicacoes: "Heroi Heroi" (ja corrigido para "Heroi Popular")

### 3. Funcionalidade do Toggle Persistente

```bash
# Verificar o hook
cat lib/hooks/useLocalePreference.ts
# Esperado: try-catch, useState sync init, SameSite=Lax

# Verificar que LanguageToggle NAO tem useLocalePreference
grep "useLocalePreference" components/public/shared/LanguageToggle.tsx
# Esperado: ZERO resultados

# Verificar que TODOS os 6 grids usam useLocalePreference
grep "useLocalePreference" components/public/Public*.tsx
# Esperado: 6 arquivos (MonsterGrid, SpellGrid, ItemGrid, ClassesIndex, RacesIndex, ConditionsGrid)
```

Teste manual:
1. Abrir /monsters
2. Trocar toggle para PT
3. Navegar para /spells — deve estar em PT automaticamente
4. Fechar browser, reabrir /items — deve lembrar PT
5. Abrir em aba anonima — deve funcionar sem crash

### 4. Landing Page Bilingue

```bash
# Verificar que page.tsx usa getTranslations
grep "getTranslations" app/page.tsx
# Esperado: import + chamada

# Contar chamadas t("...")
grep -c 't("' app/page.tsx
# Esperado: ~155+

# Verificar paridade de keys
node -e "
const pt = require('./messages/pt-BR.json');
const en = require('./messages/en.json');
const ptKeys = Object.keys(pt.landing);
const enKeys = Object.keys(en.landing);
const missing = ptKeys.filter(k => !en.landing[k]);
console.log('PT keys:', ptKeys.length, '| EN keys:', enKeys.length);
console.log('Missing in EN:', missing.length);
"
# Esperado: Mesma quantidade de keys em ambos, 0 missing
```

Teste manual:
1. Mudar cookie NEXT_LOCALE para "en" (DevTools > Application > Cookies)
2. Recarregar / — landing deve estar em ingles
3. Verificar que TODAS as secoes (hero, features, how it works, comparison, compendium, social proof, beyond combat, final CTA) estao em ingles
4. Verificar FAQ no JSON-LD (View Source > buscar "FAQPage")

### 5. Filtro de CR

Teste manual em /monsters ou /monstros:
1. Expandir "Filtros"
2. Verificar que tem dois selects (Min / Max)
3. Selecionar Min=1/4, Max=3 — deve filtrar corretamente
4. Selecionar Min=0, Max=0 — deve mostrar so CR 0
5. Selecionar Min=21, Max=30 — deve mostrar monstros de alto CR
6. Botao X deve limpar o filtro

### 6. Agrupamento Alfabetico

Em /monstros com toggle PT:
1. Verificar que NAO existem grupos "A" e "A" separados
2. Verificar que NAO existem grupos "I" e "I" separados
3. Verificar que monstros com aspas (The Demogorgon, Size-of-a-Field Mouse) aparecem sem aspas
4. Verificar que todos os monstros estao agrupados sob letras A-Z (sem "#" para caracteres especiais)

---

## Commits a revisar

```bash
git log --oneline -8
```

Os commits relevantes sao os que contem "i18n", "srd-compliance", ou "compendium" no titulo.

---

## Arquivos-chave para revisao

| Arquivo | O que verificar |
|---------|-----------------|
| `lib/hooks/useLocalePreference.ts` | try-catch, sync init, cookie format |
| `components/public/shared/LanguageToggle.tsx` | Sem hook interno |
| `components/public/PublicMonsterGrid.tsx` | useLocalePreference, cleanDisplayName, baseFirstLetter, CR filter |
| `app/monsters/page.tsx` | ptNameMap filtrado por srdSlugs |
| `app/monstros/page.tsx` | Mesmo filtro SRD |
| `app/page.tsx` | getTranslations("landing"), todas as secoes com t() |
| `messages/pt-BR.json` | namespace "landing" completo |
| `messages/en.json` | namespace "landing" em paridade |
| `data/srd/*-pt.json` | NUNCA em public/, sempre em data/ |
| `scripts/translate-*.ts` | toSlug com NFD normalize |
