# Pattern: i18n Rich Text com `t.rich()` (next-intl)

> **Status:** Canonical
> **Criado:** 2026-04-20 (Epic 03 Story 03-B — Player Identity & Continuity)
> **Tech:** [next-intl](https://next-intl.dev/) `^3.x` + flat `messages/{en,pt-BR}.json`
> **Audiência:** qualquer dev introduzindo copy com markup inline (negrito, grifo, links)

Este doc é a **fonte de verdade** para quando usar `t()` vs `t.rich()` no projeto. Foi criado junto com o primeiro uso real de `t.rich()` (Epic 03, conversion CTAs) — antes disso o projeto só usava `t()` plano.

---

## TL;DR

| Situação | API | Exemplo de chave JSON |
|---|---|---|
| String plana sem markup | `t()` | `"cta_primary": "Salvar"` |
| String com interpolação `{var}` plana | `t()` | `"title": "Olá {name}"` |
| String com **tag custom** (`<em>`, `<strong>`, `<loginLink>`, etc.) | `t.rich()` | `"headline": "Parabéns! <em>{name}</em> sobreviveu."` |
| Markdown inline (`**bold**`, `*ital*`) | **Não suportado** — use tag custom + `t.rich()` | — |

**Regra simples:** se o valor no JSON contém um `<` seguido de letra, você precisa de `t.rich()`. Se não, `t()` resolve.

---

## 1. `t()` — caso comum (90% do uso no projeto)

```tsx
import { useTranslations } from "next-intl";

function SaveButton() {
  const t = useTranslations("conversion.waiting_room");
  // JSON: "cta_primary": "Criar minha conta"
  return <Button>{t("cta_primary")}</Button>;
}
```

Com interpolação simples (`{var}` é escapado automaticamente — XSS-safe):

```tsx
function Greeting({ name }: { name: string }) {
  const t = useTranslations("onboarding");
  // JSON: "welcome": "Bem-vindo, {name}!"
  return <h1>{t("welcome", { name })}</h1>;
}
```

---

## 2. `t.rich()` — com markup inline

Use quando a copy tem tags custom (`<em>`, `<strong>`, `<loginLink>`, etc.) que precisam virar componentes React de verdade.

### Exemplo canônico (Epic 03 `RecapCtaCard`)

```tsx
import { useTranslations } from "next-intl";

function RecapHeadline({ characterName }: { characterName: string }) {
  const t = useTranslations("conversion.recap_anon");

  // JSON: "headline": "Parabéns! <em>{characterName}</em> sobreviveu ao Combate."
  return (
    <h2>
      {t.rich("headline", {
        characterName,
        em: (chunks) => <strong className="text-gold">{chunks}</strong>,
      })}
    </h2>
  );
}
```

**O que acontece:**
- `{characterName}` é escapado por next-intl (seguro contra XSS)
- `<em>…</em>` na string **não** é HTML bruto — é apenas um marcador para o callback `em: (chunks) => …`
- `chunks` é o texto dentro das tags (no exemplo: `{characterName}` já interpolado)
- Você retorna **qualquer JSX** — `<strong>`, `<span className="…">`, um `<Link>`, etc.

### Tag como link

```tsx
// JSON: "email_taken": "Esse email já tem conta. <loginLink>Fazer login</loginLink>"
import Link from "next/link";

function EmailError() {
  const t = useTranslations("conversion.errors");
  return (
    <p>
      {t.rich("email_taken", {
        loginLink: (chunks) => (
          <Link href="/login" className="underline">
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
```

### Múltiplas tags na mesma string

```tsx
// JSON: "notice": "Campo <b>obrigatório</b>. Ver <help>ajuda</help>."
{t.rich("notice", {
  b: (chunks) => <strong>{chunks}</strong>,
  help: (chunks) => <a href="/ajuda">{chunks}</a>,
})}
```

Cada tag pode ter seu próprio componente. Ordem não importa.

---

## 3. Gotchas

### 3.1 `t.rich()` retorna `ReactNode`, não `string`

Isso quebra em APIs que esperam string:

```tsx
// ❌ ERRADO — Button pode aceitar ReactNode como children, mas atributos como
// aria-label exigem string. t.rich() aqui é type-error silencioso.
<button aria-label={t.rich("label", { em: (c) => <b>{c}</b> })}>…</button>

// ✅ CERTO — para atributos string-only, use t() com a string já plana
<button aria-label={t("label_plain")}>…</button>
```

**Regra:** se você precisa passar a tradução para um `aria-*`, `title`, `alt`, `placeholder`, ou qualquer atributo HTML string — use `t()`. Se cair em children de JSX, `t.rich()` serve.

### 3.2 Children de `<Button>` do shadcn/ui

`<Button>` aceita `ReactNode` como children, então `t.rich()` funciona:

```tsx
<Button>
  {t.rich("cta_with_name", {
    characterName,
    em: (c) => <strong>{c}</strong>,
  })}
</Button>
```

Mas **nunca** passe `t.rich()` para uma prop que o Button espera como string (ex: uma prop custom `label`).

### 3.3 Interpolação `{var}` vs tag `<name>`

- `{var}` — variável substituída por **valor** (escapado)
- `<name>…</name>` — tag interpretada por **função** passada no segundo argumento

Ambos podem coexistir:

```json
"key": "Olá <em>{name}</em>, você tem {count} mensagens"
```

```tsx
t.rich("key", {
  name: "Ana",
  count: 3,
  em: (chunks) => <strong>{chunks}</strong>,
})
```

Se você passar `{name}` como tag (`<name>…</name>`) ou vice-versa, next-intl avisa no console.

### 3.4 Markdown **não** é suportado

Não coloque `**bold**` ou `*italic*` no JSON esperando que vire `<strong>`. next-intl **não** faz markdown parsing. Use tags custom:

```json
// ❌ ERRADO — literal asteriscos aparecem na UI
"welcome": "Bem-vindo, **{name}**!"

// ✅ CERTO
"welcome": "Bem-vindo, <b>{name}</b>!"
```

```tsx
t.rich("welcome", { name, b: (c) => <strong>{c}</strong> });
```

### 3.5 Escape de aspas em JSON flat

JSON exige `\"` dentro de strings. Evite — prefira reescrever para não precisar:

```json
// ❌ Feio
"line": "Ele disse \"oi\" e saiu."

// ✅ Use aspas tipográficas (unicode é permitido direto)
"line": "Ele disse "oi" e saiu."
```

Para tags custom, os sinais `<` e `>` são literais — **não** precisam ser escapados:

```json
"ok": "Salvar <em>{name}</em>"
```

### 3.6 Nunca coloque HTML bruto esperando que renderize

```json
// ❌ Vai aparecer o texto literal "<b>Ana</b>" sem negrito
"welcome": "Olá <b>Ana</b>"
```

Se não houver callback registrado para uma tag, next-intl **não** interpreta — a tag vira parte do texto. Em `<em>`, registre sempre o `em:` handler.

### 3.7 Tag names: lowercase ASCII

Use nomes simples: `em`, `b`, `strong`, `link`, `loginLink`. Evite `<my-tag>` ou caracteres exóticos — next-intl é tolerante, mas o grep fica ruim.

---

## 4. Troubleshooting

### 4.1 "MISSING_MESSAGE: Could not resolve …"

Sua chave não existe no JSON do locale atual.

- **Verifique grafia** (case-sensitive, pontos-separados = nested)
- **Verifique namespace**: `useTranslations("conversion.recap_anon")` + `t("headline")` resolve `conversion.recap_anon.headline`. Não concatene manualmente.
- **Verifique que a chave existe nos DOIS locales** (`en.json` + `pt-BR.json`) — falta em um locale quebra em produção só naquele idioma.
- Se a chave deveria existir: certifique-se de que o arquivo foi salvo e o server foi reiniciado (flat JSON é cacheado).

### 4.2 "IMPORTANT: Interpolation failed for key `…`"

Faltou passar uma variável que o template usa.

```json
"greeting": "Olá {name}"
```

```tsx
// ❌ esquece name → warning no console
t("greeting");

// ✅
t("greeting", { name });
```

Vale também para `t.rich()` — toda tag `<foo>` no template exige `foo: (chunks) => …` no segundo argumento.

### 4.3 JSX com `t.rich()` mostra `[object Object]` na UI

Você provavelmente passou o retorno de `t.rich()` para um atributo HTML (string-only) em vez de children. Ver §3.1.

### 4.4 Snapshot test quebra depois de editar copy

Esperado — o snapshot deve refletir a copy nova. Re-gere com `pnpm test -u` **apenas** no teste impactado, e chame Paige no PR pra revisar a mudança de texto. (Epic 03 F11.)

---

## 5. Checklist ao adicionar chave nova

1. Chave entra em **ambos** `messages/en.json` e `messages/pt-BR.json`
2. Se tem tag `<algo>` → consumidor usa `t.rich()`, não `t()`
3. Se é atributo HTML (aria, title, alt) → mantenha sem tags e use `t()`
4. PT-BR respeita [`docs/glossario-ubiquo.md`](glossario-ubiquo.md): Combate / Encontro / Histórico / Quest (não traduz)
5. Rode `pnpm tsc --noEmit` — next-intl tem type-checking de chaves via `global.d.ts` em projetos bem configurados
6. Snapshot test cobre o render em PT-BR **e** EN

---

## 6. Referências

- [next-intl `t.rich` docs](https://next-intl.dev/docs/usage/messages#rich-text)
- Epic 03 D7 — `docs/epics/player-identity/epic-03-conversion-moments.md` (snippet canônico)
- Exemplo real: `components/conversion/RecapCtaCard.tsx` (a ser criado em Story 03-D)
- Glossário ubíquo: `docs/glossario-ubiquo.md`
