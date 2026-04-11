# Plano: OmniSearch + Mobile Nav nas Paginas Publicas

## Contexto e Motivacao

Durante uma sessao de RPG, jogadores acessam o site repetidamente no celular para consultar magias, racas, itens, monstros (Wild Shape), etc. Hoje as paginas publicas:

- **Nao tem navegacao mobile** — links ficam `hidden lg:flex` no PublicNav
- **Nao tem busca global** — nao existe equivalente do CommandPalette (Ctrl+K) da area logada
- **Nao diferenciam usuario logado de deslogado** — beta testers logados veem o mesmo que guests

### Decisoes Tomadas (Party Mode Discussion)

1. **Opcao B (inline) venceu** — resultados aparecem inline (modals/floating cards), sem redirecionar pra area logada
2. **Conteudo longo ja esta resolvido** — SpellDescriptionModal (scroll 85vh), FloatingCardContainer (draggable stat blocks), ItemCard — tudo ja existe
3. **SRD vs non-SRD**: SRD content → navega pra pagina publica. Non-SRD content (beta only) → abre modal/floating card inline (nao indexavel)
4. **CommandPalette existente pode ser reutilizado** como base — mesma busca Fuse.js, mesmos indices do srd-store

---

## Arquitetura

```
PublicNav (server component — mantem SSR)
  ├─ Logo + Breadcrumbs (server)
  ├─ Center links (server, hidden lg:flex — permanece)
  ├─ PublicNavAuthSlot (server — ja existe)
  └─ PublicNavClient ("use client" — NOVO)
       ├─ SearchTrigger (botao lupa, sempre visivel)
       ├─ HamburgerTrigger (botao hamburger, lg:hidden)
       ├─ PublicMobileMenu (drawer overlay, links agrupados)
       ├─ PublicCommandPalette (overlay de busca cross-entity)
       └─ Auth-conditional SrdInitializer
            ├─ Deslogado: SrdInitializer fullData=false (SRD only)
            └─ Beta tester: SrdInitializer fullData=true (full dataset)
```

### Fluxo de Dados

```
1. PublicNavClient monta
2. Checa auth via supabase.auth.getSession()
3. Se logado + beta: setFullDataMode(true), initializeSrd() → carrega /api/srd/full/
4. Se deslogado: setFullDataMode(false), initializeSrd() → carrega /srd/*.json
5. Fuse.js indices sao built conforme dados chegam (Phase 1: monsters/spells/items, Phase 2: feats/backgrounds)
6. User abre busca → digita query → Fuse retorna resultados
7. User clica resultado:
   a. SRD content com pagina publica → router.push("/monsters/aboleth")
   b. Non-SRD content (beta) → pinCard() ou modal (FloatingCard/SpellDescriptionModal)
```

---

## Sprint Plan — 2 Workstreams Paralelizaveis

### WORKSTREAM A: Mobile Menu + Search Trigger (no PublicNav)

**Pode comecar imediatamente — zero dependencia do Workstream B**

#### A1. Criar `components/public/PublicNavClient.tsx`
Client island que vive dentro do PublicNav. Responsabilidades:
- Render hamburger button (lg:hidden)
- Render search trigger button (sempre visivel)
- Manage mobile menu open/close state
- Dispatch open event pro CommandPalette

**Padrao de referencia:** `components/layout/Navbar.tsx` linhas 148-223 (hamburger + drawer)

**Props:**
```typescript
interface PublicNavClientProps {
  locale: "en" | "pt-BR";
}
```

#### A2. Criar `components/public/PublicMobileMenu.tsx`
Drawer overlay mobile com links do compendio agrupados por categoria:

```
Combat Reference:
  - Monsters / Monstros
  - Spells / Magias
  - Conditions / Condicoes

Character Building:
  - Classes
  - Races / Racas
  - Feats / Talentos
  - Backgrounds / Antecedentes

Equipment:
  - Items / Itens

Tools:
  - Dice / Dados
  - Rules / Regras
  - Actions / Acoes
  - Encounter Builder / Calculadora

Quick Start:
  - Combat Tracker (Try Free)
```

**Padrao:** Fecha no route change (usePathname + useEffect). Links bilingual via locale prop.

#### A3. Modificar `components/public/PublicNav.tsx`
- Importar `PublicNavClient` como client island
- Adicionar no layout: hamburger (left, mobile only) + lupa (right, all sizes)
- Manter server rendering dos breadcrumbs e center links
- O hamburger fica ao lado do logo, a lupa ao lado do auth slot

**Cuidado:** PublicNav e server component. O PublicNavClient e o unico "use client" boundary.

#### A4. Remover padding/spacing que quebra com novos botoes
Testar em 375px (iPhone SE) e 390px (iPhone 14) que nada estoura.

---

### WORKSTREAM B: PublicCommandPalette + SRD Init + Auth-aware Search

**Pode comecar imediatamente — zero dependencia do Workstream A**

#### B1. Criar `components/public/PublicCommandPalette.tsx`
Wrapper que reutiliza a logica de busca do CommandPalette original mas com handlers diferentes:

**Diferencas do CommandPalette original:**
- Nao usa `useTranslations` (labels inline bilingual, como todas as public pages)
- Handler de select:
  - SRD content → `router.push(publicUrl)` (navega pra pagina publica)
  - Non-SRD content (beta) → `pinCard()` ou abre modal (floating card)
- Nao depende de `usePinnedCardsStore` se deslogado (graceful degradation)
- Abre via `command-palette:open` custom event (mesmo que o original)
- Abre via Ctrl+K keyboard shortcut

**Funcao de resolucao de URL:**
```typescript
function getPublicUrl(type: string, item: any, locale: "en" | "pt-BR"): string | null {
  const isSrd = item.is_srd || item.srd || item.basicRules;
  if (!isSrd) return null; // non-SRD → modal/floating card
  
  const isPt = locale === "pt-BR";
  switch (type) {
    case "monster": return isPt ? `/monstros/${toSlug(item.name)}` : `/monsters/${toSlug(item.name)}`;
    case "spell": return isPt ? `/magias/${toSlug(item.name)}` : `/spells/${toSlug(item.name)}`;
    case "item": return isPt ? `/itens/${item.id}` : `/items/${item.id}`;
    case "feat": return isPt ? `/talentos/${item.id}` : `/feats/${item.id}`;
    case "background": return isPt ? `/antecedentes/${item.id}` : `/backgrounds/${item.id}`;
    default: return null;
  }
}
```

**Funcoes de busca a importar de `lib/srd/srd-search.ts`:**
- `searchMonsters(query)` → `FuseResult<SrdMonster>[]`
- `searchSpells(query)` → `FuseResult<SrdSpell>[]`
- `searchItems(query)` → `FuseResult<SrdItem>[]`
- `searchFeats(query)` → `FuseResult<SrdFeatEntry>[]`
- `searchBackgrounds(query)` → `FuseResult<SrdBackgroundEntry>[]`
- `getAllConditions()` → `SrdCondition[]`

**UI:** Reutilizar exatamente o mesmo layout do CommandPalette (cmdk, filter pills, result groups).

#### B2. Criar `components/public/PublicSrdBridge.tsx`
Client component que faz a ponte entre auth e SRD initialization nas paginas publicas:

```typescript
"use client";
export function PublicSrdBridge() {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    async function init() {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && !session.user.is_anonymous) {
        // Check beta tester status
        const { canAccess } = await checkContentAccess(session.user.id);
        setFullDataMode(canAccess);
      } else {
        setFullDataMode(false);
      }
      
      // Initialize SRD store (loads data based on mode)
      useSrdStore.getState().initializeSrd();
      setReady(true);
    }
    init();
  }, []);
  
  return null; // Pure side-effect, renders nothing
}
```

**Alternativa mais simples:** usar `useContentAccess()` hook que ja tem cache de 5min. Se `canAccess === true`, passa `fullData={true}` pro `SrdInitializer`.

#### B3. Integrar FloatingCardContainer nas paginas publicas
Para que os floating cards (monster stat blocks, item cards) funcionem nas public pages, o `FloatingCardContainer` precisa estar montado. Opcoes:

- **Opcao simples:** Adicionar `<FloatingCardContainer />` no `PublicNavClient` (monta uma vez, disponivel em todas as public pages)
- Depende de `usePinnedCardsStore` (Zustand) — ja funciona sem auth
- Depende de `useSrdStore` — inicializado pelo PublicSrdBridge

#### B4. Integrar SpellDescriptionModal e ConditionRulesModal
Esses modais ja existem. Precisam ser montados nas public pages pra que os resultados de busca possam abri-los.

Montar dentro do `PublicCommandPalette` (mesmo padrao do CommandPalette original que monta os modais no proprio componente).

---

## Arquivos — Resumo Completo

### Criar (5 arquivos)
| # | Arquivo | Workstream | Descricao |
|---|---------|------------|-----------|
| 1 | `components/public/PublicNavClient.tsx` | A | Client island: hamburger + search trigger + state |
| 2 | `components/public/PublicMobileMenu.tsx` | A | Drawer mobile com links agrupados |
| 3 | `components/public/PublicCommandPalette.tsx` | B | OmniSearch com link resolver SRD/non-SRD |
| 4 | `components/public/PublicSrdBridge.tsx` | B | Auth-aware SRD initialization |
| 5 | `components/public/PublicFloatingCards.tsx` | B | Wrapper pra FloatingCardContainer + modais nas public pages |

### Modificar (1 arquivo)
| # | Arquivo | Workstream | Mudanca |
|---|---------|------------|---------|
| 1 | `components/public/PublicNav.tsx` | A | Inserir PublicNavClient como client island |

### Zero modificacao em (reutilizados as-is)
- `components/oracle/CommandPalette.tsx` — referencia de UI, nao modificado
- `components/oracle/FloatingCardContainer.tsx` — reutilizado direto
- `components/oracle/SpellDescriptionModal.tsx` — reutilizado direto
- `components/oracle/ConditionRulesModal.tsx` — reutilizado direto
- `components/oracle/MonsterStatBlock.tsx` — reutilizado direto
- `components/oracle/SpellCard.tsx` — reutilizado direto
- `components/oracle/ItemCard.tsx` — reutilizado direto
- `lib/srd/srd-search.ts` — funcoes de busca reutilizadas
- `lib/srd/srd-mode.ts` — setFullDataMode reutilizado
- `lib/stores/srd-store.ts` — initializeSrd reutilizado
- `lib/stores/pinned-cards-store.ts` — pinCard reutilizado
- `lib/hooks/use-content-access.ts` — beta detection reutilizado

---

## Dependencias e Libs

Tudo ja esta instalado no projeto:
- `cmdk` — command palette UI
- `@dnd-kit/core` — drag-and-drop para floating cards
- `fuse.js` — fuzzy search
- `lucide-react` — icones
- `@radix-ui/react-dialog` — modais
- `zustand` — state management (srd-store, pinned-cards-store)

---

## Priorizacao

| Prioridade | Feature | Workstream | Impacto |
|------------|---------|------------|---------|
| **P0** | Mobile hamburger menu | A | Navegacao mobile funcional |
| **P0** | Search trigger (lupa no nav) | A | Entry point pra busca |
| **P0** | OmniSearch com dados SRD | B | Busca rapida durante sessao |
| **P1** | Beta-aware SRD init | B | Full dataset pra beta testers |
| **P1** | Link resolver (SRD→page, non-SRD→modal) | B | UX inteligente por tipo |
| **P1** | FloatingCards nas public pages | B | Stat blocks pra Wild Shape etc |
| **P2** | Locale-aware links no OmniSearch | B | PT-BR URLs nos resultados |

---

## Criterios de Aceitacao

### Mobile Menu
- [ ] Hamburger visivel em telas < 1024px (lg breakpoint)
- [ ] Drawer abre/fecha com animacao suave
- [ ] Links agrupados por categoria
- [ ] Fecha automaticamente no route change
- [ ] Bilingual labels (EN/PT-BR)
- [ ] Touch targets >= 44px
- [ ] Funciona em 375px (iPhone SE)

### OmniSearch
- [ ] Abre com Ctrl+K ou clique na lupa
- [ ] Busca cross-entity: monsters, spells, items, feats, backgrounds, conditions
- [ ] Filter pills por categoria
- [ ] Debounce 150ms
- [ ] Max 5 resultados por grupo
- [ ] Deslogado: apenas resultados SRD
- [ ] Beta tester: resultados SRD + non-SRD (badge "Beta" nos extras)
- [ ] SRD result click → navega pra pagina publica
- [ ] Non-SRD result click → abre floating card ou modal
- [ ] Mobile: X button pra fechar (nao ESC hint)
- [ ] Loading state enquanto indices carregam

### SRD Compliance
- [ ] Conteudo non-SRD NUNCA aparece pra usuarios deslogados
- [ ] Conteudo non-SRD carregado via /api/srd/full/ (auth-gated server-side)
- [ ] Conteudo non-SRD renderizado client-side (nao no HTML estatico)
- [ ] Google nao indexa conteudo non-SRD

---

## Verificacao

1. `tsc --noEmit` — zero erros
2. Testar em localhost:3000/feats (pagina publica) com:
   - Deslogado: lupa abre busca SRD-only, hamburger navega
   - Logado (beta): lupa abre busca full, resultados non-SRD abrem modal/floating
3. Testar mobile (375px): hamburger + busca funcional
4. Verificar que nenhum conteudo non-SRD aparece no View Source (SSR HTML)

---

## Contexto Tecnico para a Segunda Janela

### Stack
- Next.js 15 (App Router) + Turbopack
- TypeScript strict
- Tailwind CSS (dark theme, gold accent #D4A853)
- Supabase (auth + DB)
- Zustand (state management)
- Fuse.js (fuzzy search)
- cmdk (command palette UI)
- @dnd-kit (drag-and-drop floating cards)
- next-intl (i18n — mas public pages usam labels inline, nao messages files)

### Padroes do Projeto
- Public pages: server components com client islands ("use client" boundaries minimas)
- Bilingual: rotas separadas (/feats vs /talentos), labels inline com objeto LABELS
- SRD compliance: public/srd/ = SRD only, data/srd/ = full, /api/srd/full/ = auth-gated
- Font headings: `font-[family-name:var(--font-cinzel)]`
- Gold accent: text-gold, bg-gold/20, border-gold/30
- Prefixo rtk em todos os comandos bash

### Arquivos de Referencia Criticos
- `components/oracle/CommandPalette.tsx` — UI de busca a replicar
- `components/layout/Navbar.tsx` (linhas 148-223) — padrao hamburger a replicar
- `components/public/PublicNav.tsx` — onde inserir client island
- `components/public/PublicNavAuthSlot.tsx` — padrao de auth detection em public pages
- `components/srd/SrdInitializer.tsx` — inicializacao do SRD store
- `lib/hooks/use-content-access.ts` — deteccao de beta tester client-side
- `lib/srd/srd-search.ts` — funcoes de busca Fuse.js
- `lib/srd/srd-mode.ts` — toggle full/public data mode
- `lib/stores/srd-store.ts` — Zustand store com dados SRD + loading state
- `lib/stores/pinned-cards-store.ts` — floating cards state
