# Spec — Favoritos (Monstros, Magias, Itens, Condições)

**Autores:** Sally (UX) + Winston (Architect)
**Target ship:** Beta 4 — 23/04/2026
**Estimativa:** ~9,5h (revisada; ver §12)
**Status:** Implementation-ready
**Origem:** Beta test 3 (16/04/2026) — DM Lucas solicitou atalhos para fichas de monstros durante o combate

---

## 0. Contexto do feedback

> "Seria legal favoritar as fichas dos monstros… pra ele aparecer como um atalho pra você poder clicar e abrir o item, a condição, o que for que você favoritou. Pra ficar bem fácil de entrar e sair monstro." — DM Lucas, Beta 3

Pain point principal: **o DM repete os mesmos monstros em múltiplos encontros** e precisa "entrar e sair" rapidamente da stat block durante combate. Hoje a busca no [`MonsterSearchPanel`](../components/combat/MonsterSearchPanel.tsx) obriga a digitar/rolar toda vez.

Existe precedente arquitetural direto no projeto: [`audio_favorites`](../supabase/migrations/135_audio_favorites.sql) e [`lib/stores/favorites-store.ts`](../lib/stores/favorites-store.ts) já implementam "favorites" para presets de áudio com fallback guest (localStorage) + auth (DB). **Reusar esse padrão exato.**

---

## 1. Decisões de escopo (explícitas)

### 1.1 O que pode ser favoritado (4 tipos)

| `item_type` | Fonte de dados | Exemplos |
|---|---|---|
| `monster` | SRD + MAD + 2024 + homebrew (whitelist-aware) | Goblin, Adult Red Dragon |
| `spell` | SRD + 2024 + homebrew | Fireball, Cure Wounds |
| `item` | SRD + 2024 + homebrew | Longsword, Potion of Healing |
| `condition` | Conjunto fixo SRD (15 condições) | Prone, Charmed, Poisoned |

Feats, backgrounds, classes, races e antecedentes **ficam fora** do escopo v1 (ver §14).

### 1.2 Quem usa

- **DM (primário):** atalho rápido para monstros/magias que aparecem recorrentemente em prep e durante encontros
- **Player (secundário):** bookmarkar condições/itens mágicos da sua ficha
- **Guest (`/try`):** funciona localmente (localStorage), sem cloud

### 1.3 Onde é acessado

| Superfície | Entry point | Comportamento |
|---|---|---|
| **In-combat (DM)** | Nova aba "⭐ Favoritos" no [`MonsterSearchPanel`](../components/combat/MonsterSearchPanel.tsx) | Lista de cards favoritados no topo, clique → abre stat block inline (mesma pinned card pattern) |
| **In-combat (Player)** | Botão "⭐" no toolbar do [`PlayerJoinClient`](../components/player/PlayerJoinClient.tsx) → bottom-sheet | Tabs por tipo |
| **Guest combat** | Mesmo botão ⭐ no [`GuestCombatClient`](../components/guest/GuestCombatClient.tsx) | Backing: localStorage |
| **Compêndio auth** | Nova seção "Meus Favoritos" no topo de [`app/app/compendium/page.tsx`](../app/app/compendium/page.tsx), acima dos tabs existentes | Tabs por tipo, mesmo card component que browsers |
| **Compêndio público** | Widget "Favoritos" nas páginas [`/monsters`](../app/monsters/page.tsx), [`/spells`](../app/spells/page.tsx), [`/items`](../app/items/page.tsx), [`/conditions`](../app/conditions/page.tsx) | **Apenas** favoritos com slug presente no whitelist SRD público |

### 1.4 Persistência

| Contexto | Backend | Chave |
|---|---|---|
| Auth (email/OAuth) | Supabase `user_favorites` + RLS | `user_id` |
| Anon player (`/join/[token]`) | localStorage (sessão anônima não persiste entre dispositivos) | `pocketdm:favorites` |
| Guest (`/try`) | localStorage | `pocketdm:favorites` |

**Decisão:** anon player usa localStorage e **não** DB. Justificativa: a sessão anônima do Supabase pode não sobreviver a `signOut` do token pelo DM, e é barato manter paridade com guest. Trade-off: se o player anon voltar em outro dispositivo, perde favoritos — aceitável (eles são um player "one-shot" por convite).

---

## 2. Data model (Supabase)

### 2.1 Migration `139_user_favorites.sql` (idempotente)

```sql
-- Migration 139: User Favorites (monsters, spells, items, conditions)
-- Allows DMs and players to bookmark SRD/homebrew content for quick access.
-- Precedent: audio_favorites (migration 135).

CREATE TABLE IF NOT EXISTS user_favorites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type             TEXT NOT NULL CHECK (item_type IN ('monster','spell','item','condition')),
  item_id               TEXT NOT NULL,                    -- SRD slug OR homebrew UUID stringificado
  item_ruleset_version  TEXT NULL CHECK (item_ruleset_version IN ('2014','2024') OR item_ruleset_version IS NULL),
  item_name_cached      TEXT NOT NULL,                    -- denormalizado p/ exibição rápida
  item_name_pt_cached   TEXT NULL,                        -- nome PT-BR no momento do favorito
  position              SMALLINT NOT NULL DEFAULT 0,      -- ordem de exibição, gerenciada pelo cliente
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um usuário pode favoritar o mesmo (tipo + slug + versão) apenas uma vez.
-- NULL é tratado como valor distinto via COALESCE para garantir unicidade correta.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_unique
  ON user_favorites(user_id, item_type, item_id, COALESCE(item_ruleset_version, ''));

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_type_pos
  ON user_favorites(user_id, item_type, position);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorites" ON user_favorites;
CREATE POLICY "Users manage own favorites"
  ON user_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2.2 Tipos TypeScript (`lib/types/favorites.ts`, novo)

```ts
export type FavoriteItemType = "monster" | "spell" | "item" | "condition";
export type FavoriteRulesetVersion = "2014" | "2024" | null;

export interface UserFavorite {
  id: string;
  user_id: string;
  item_type: FavoriteItemType;
  item_id: string;
  item_ruleset_version: FavoriteRulesetVersion;
  item_name_cached: string;
  item_name_pt_cached: string | null;
  position: number;
  created_at: string;
}

// Shape armazenado em localStorage (guest + anon)
export interface LocalFavoriteEntry {
  item_type: FavoriteItemType;
  item_id: string;
  item_ruleset_version: FavoriteRulesetVersion;
  item_name_cached: string;
  item_name_pt_cached: string | null;
  addedAt: string;  // ISO
}
```

### 2.3 Limites

- **200 favoritos por tipo, por usuário** (DB check na API, não via constraint)
- localStorage: mesmo limite — array bounded a 200 entries/tipo

Justificativa: 500 era excessivo para UI de browse; 200 cobre >95% dos DMs ativos de beta conforme dados de `pinned_cards` (P95 = 37). Mantém localStorage abaixo de ~60KB no total.

---

## 3. Storage shape — localStorage

**Chave:** `pocketdm:favorites`
**Formato:**

```ts
type LocalFavoritesStorage = {
  version: 1;                              // schema version para migração futura
  monsters:   LocalFavoriteEntry[];        // max 200
  spells:     LocalFavoriteEntry[];        // max 200
  items:      LocalFavoriteEntry[];        // max 200
  conditions: LocalFavoriteEntry[];        // max 200 (mas só existem 15 SRD)
  lastUpdated: string;                      // ISO
};
```

Validação no load: Zod schema (`LocalFavoritesSchema`). Se falhar parse, reseta para empty state e loga via `captureError` (sem crash).

---

## 4. UI patterns

### 4.1 Ícone estrela (presente em todos os cards)

Aplicar em:
- [`components/oracle/MonsterStatBlock.tsx`](../components/oracle/MonsterStatBlock.tsx) (cabeçalho)
- [`components/oracle/SpellCard.tsx`](../components/oracle/SpellCard.tsx) (cabeçalho)
- [`components/oracle/ItemCard.tsx`](../components/oracle/ItemCard.tsx) (cabeçalho)
- [`components/oracle/ConditionCard.tsx`](../components/oracle/ConditionCard.tsx) (cabeçalho)
- Rows virtualizados em [`MonsterBrowser`](../components/compendium/MonsterBrowser.tsx), [`SpellBrowser`](../components/compendium/SpellBrowser.tsx), [`ItemBrowser`](../components/compendium/ItemBrowser.tsx) — estrela pequena ao lado do nome

**Visual:**
- Vazio: `lucide-react` `<Star className="w-4 h-4 text-muted-foreground hover:text-gold" />`
- Favoritado: `<Star className="w-4 h-4 text-gold fill-gold" />`
- Tap/Click: toggle otimista + debounce 200ms antes do POST/DELETE
- Animação: spring scale 1.0 → 1.15 → 1.0 em 180ms (Framer Motion já usado no projeto)

### 4.2 In-combat quick-access (DM + Player + Guest)

**Desktop (≥ md):** sidebar persistente direita, 320px de largura, colapsável via toggle
**Mobile:** bottom-sheet trigado por botão flutuante "⭐" no toolbar

Estrutura interna (4 tabs):
```
[Monstros 12] [Magias 8] [Itens 3] [Condições 5]
──────────────────────────────────────────────
┌─ Card (nome + CR/level/tipo)  ⭐──┐
│  Click → expande stat block inline │
└────────────────────────────────────┘
```

- **DM:** card de monstro tem CTA extra "Adicionar ao encontro" (reusa action de `MonsterSearchPanel`)
- **Player:** sem CTA de adicionar; apenas leitura
- **Guest:** idêntico ao DM (guest também é o DM no `/try`)

### 4.3 Compêndio — seção "Meus Favoritos"

Apenas no compêndio autenticado ([`app/app/compendium/page.tsx`](../app/app/compendium/page.tsx)).

Collapsed por padrão se `count > 0`; expande ao clicar. Se `count === 0`, a seção não renderiza.

Layout:
```
⭐ Meus Favoritos (28)  [▼ expandir]
  ┌─ Monstros (12) · Magias (8) · Itens (3) · Condições (5) ─┐
  │  Grid de mini-cards (3 col desktop, 1 col mobile)         │
  └───────────────────────────────────────────────────────────┘
```

### 4.4 Compêndio público — widget "Favoritos"

Nas páginas SSG públicas ([`/monsters`](../app/monsters/page.tsx) etc.):
- Widget client-side `<PublicFavoritesWidget type="monster" />` no sidebar
- Lê **apenas** de localStorage (não faz request autenticado — página é SSG/ISR)
- **Filtro SRD obrigatório:** antes de renderizar, cruza `item_id` contra o whitelist público de [`public/srd/srd-monsters-whitelist.json`](../public/srd/). Favoritos fora do whitelist são ocultados (não removidos do storage — reaparecem no modo auth). Ver §6.

---

## 5. API endpoints

Criar em [`app/api/favorites/route.ts`](../app/api/favorites/route.ts) e [`app/api/favorites/[id]/route.ts`](../app/api/favorites/[id]/route.ts). Seguir exatamente o padrão de [`app/api/audio-favorites/route.ts`](../app/api/audio-favorites/route.ts):

### 5.1 `GET /api/favorites`
- Auth: required (rejeita anon + não logados com 401)
- Query params opcionais: `?type=monster|spell|item|condition` (filtro server-side)
- Resposta: `{ data: UserFavorite[] }`, ordenado por `(item_type, position ASC, created_at ASC)`

### 5.2 `POST /api/favorites`
- Body: `{ item_type, item_id, item_ruleset_version?, item_name_cached, item_name_pt_cached? }`
- Validação Zod antes de DB
- Check de limite (200 por tipo) → 409 `{ error: "favorites.limit_reached" }`
- Check duplicação (unique constraint) → 409 `{ error: "favorites.already_favorited" }`
- `position` = max atual do tipo + 1
- Resposta: `{ data: UserFavorite }`

### 5.3 `DELETE /api/favorites/[id]`
- 404 se não encontrado ou não é do user
- Resposta: `{ data: { deleted: true } }`

### 5.4 `PATCH /api/favorites/reorder` (nice-to-have — §14 se faltar tempo)
- Body: `{ item_type, ordered_ids: string[] }`
- Atualiza `position` em batch

### 5.5 Rate limiting

```ts
const rateLimitConfig = { max: 60, window: "1 m" } as const;
```

Usa [`withRateLimit`](../lib/rate-limit.ts) já disponível. Debounce do cliente (200ms) garante que ninguém chega perto.

### 5.6 Observabilidade

- `captureError` em todos os catches (igual `audio-favorites`)
- `trackEvent('favorite_toggled', { item_type, action: 'add'|'remove' })` no client (ver [`lib/analytics/track.ts`](../lib/analytics/track.ts))

---

## 6. SRD Compliance

**Regra crítica** (de `CLAUDE.md`): nada de conteúdo não-SRD pode vazar em páginas públicas.

### Matriz de exposição

| Superfície | Dataset | Filtro aplicado |
|---|---|---|
| `/try` (guest) | `/srd/*.json` via [`srdDataUrl`](../lib/srd/srd-mode.ts) | SRD whitelist já aplicado no build |
| `/monsters`, `/spells`, `/items`, `/conditions` (SSG) | `data/srd/*.json` via [`srd-data-server.ts`](../lib/srd/srd-data-server.ts) | SRD whitelist |
| Widget "Favoritos" em páginas públicas | localStorage + cruza com whitelist público client-side | **Filtrar no render** — se `item_id` não está em `public/srd/*-whitelist.json`, ocultar |
| `/app/compendium` (auth) | `/api/srd/full/*.json` | Apenas `content_whitelist` do user |
| `/app/session/*` (auth DM) | idem | idem |

### Regras de implementação

1. **Favoritar não expõe:** o `item_id` + `item_name_cached` ficam no DB mesmo para itens não-SRD. Eles só viajam até a UI pública se passarem o filtro whitelist.
2. **Widget público nunca fetcha dados completos:** usa apenas dados já presentes em `public/srd/`.
3. **Degradação graciosa:** se um favorito é "não disponível publicamente", o widget não mostra placeholder "???" — apenas esconde. O usuário vê o mesmo favorito no modo auth.
4. **Never nunca:** não fazer `GET /api/srd/full/` sem auth cookie no request.

---

## 7. Parity matrix

| Modo | Implementar? | Storage | Notas |
|---|---|---|---|
| Guest [`/try`](../app/try/page.tsx) | Sim | localStorage | Sem cloud, sem dedup cross-device |
| Anon [`/join/[token]`](../app/join/[token]/page.tsx) | Sim | localStorage | Mesmo motivo (anon auth efêmero) |
| Auth DM [`/app/session/*`](../components/session/CombatSessionClient.tsx) | Sim | DB via `user_favorites` | Full read/write |
| Auth Player [`/invite/[token]`](../app/invite/[token]/page.tsx) | Sim | DB via `user_favorites` | Full read/write |
| Compêndio auth [`/app/compendium`](../app/app/compendium/page.tsx) | Sim | DB | Seção "Meus Favoritos" |
| Compêndio público [`/monsters`](../app/monsters/page.tsx) etc. | Sim (read-only widget) | localStorage | Filtra SRD whitelist |

Parity rule cumprida. **UI-only feature** → aplicar nos 3 modos (guest/anon/auth).

---

## 8. Edge cases

1. **Item removido do whitelist depois:** `item_name_cached` ainda renderiza; ao clicar para abrir detalhes, se a fetch retorna 404, mostrar toast: *"Este conteúdo não está mais disponível no seu nível de acesso. [Remover dos favoritos]"* (botão que chama DELETE).

2. **Migração guest → auth (login):**
   - No primeiro login pós-registro, `useFavorites.hydrate()` detecta `isAuth=true` + localStorage não-vazio
   - Mostra prompt: *"Encontramos 14 favoritos salvos localmente. Migrar para sua conta?"* [Migrar / Descartar]
   - "Migrar" → POST em lote respeitando dedup (unique constraint), best-effort
   - Após sucesso, limpa localStorage
   - **Implementação única** ao primeiro hydrate pós-auth; depois flag `pocketdm:favorites:migrated=true` em localStorage

3. **Mesmo slug em 2014 e 2024:** são entradas separadas (`item_ruleset_version` diferente). UI mostra badge de versão via [`VersionBadge`](../components/session/RulesetSelector.tsx).

4. **Limite de 200/tipo atingido:** POST retorna 409. Cliente mostra toast *"Limite de 200 favoritos atingido. Remova alguns para adicionar novos."* + CTA "Gerenciar favoritos" que abre a aba do tipo com ações bulk-delete.

5. **Conflito de offline → online:** favoritos adicionados em localStorage enquanto offline são sincronizados no próximo POST bem-sucedido. Se houver conflito de dedup, ignora (resource já existe).

6. **Condition slugs estáveis:** condições são hardcoded (15 entradas SRD); `item_ruleset_version` sempre `null` para condição. UI não mostra selector de versão.

7. **Homebrew favoritado → homebrew deletado pelo owner:** cached name persiste; click retorna 404 → toast de remoção.

8. **Race condition otimista:** se POST falha após UI já ter mostrado star filled, reverte visualmente + toast de erro *"Falha ao salvar. Tente novamente."*

---

## 9. i18n keys (~18)

Adicionar em [`messages/pt-BR.json`](../messages/pt-BR.json) e `messages/en.json` sob namespace `favorites`:

```json
{
  "favorites": {
    "title": "Favoritos",
    "section_title": "Meus Favoritos",
    "add": "Adicionar aos favoritos",
    "remove": "Remover dos favoritos",
    "empty_tab": "Nenhum favorito ainda. Clique na estrela em qualquer {type} para adicionar.",
    "tab_monsters": "Monstros",
    "tab_spells": "Magias",
    "tab_items": "Itens",
    "tab_conditions": "Condições",
    "saved_to_cloud": "Salvo na sua conta",
    "saved_locally": "Salvo localmente",
    "migrate_prompt_title": "Migrar favoritos locais?",
    "migrate_prompt_body": "Encontramos {count} favoritos salvos localmente. Deseja migrá-los para sua conta?",
    "migrate_confirm": "Migrar",
    "migrate_dismiss": "Descartar",
    "migrate_success": "{count} favoritos migrados com sucesso",
    "limit_reached": "Limite de {max} favoritos atingido para este tipo",
    "already_favorited": "Já está nos favoritos",
    "not_available": "Este conteúdo não está mais disponível",
    "button_combat": "Favoritos",
    "sr_added": "{name} adicionado aos favoritos",
    "sr_removed": "{name} removido dos favoritos"
  }
}
```

---

## 10. Acessibilidade

Botão estrela:
```tsx
<button
  type="button"
  aria-label={isFavorited ? t("remove", { name }) : t("add", { name })}
  aria-pressed={isFavorited}
  onClick={handleToggle}
  className="min-w-[44px] min-h-[44px] ..."  // alvo de toque mobile
>
  <Star className={isFavorited ? "fill-gold text-gold" : "text-muted-foreground"} />
</button>
```

- **Keyboard:** Tab order segue ordem visual; Enter/Space toggles. Focus ring visível (`focus-visible:ring-2 ring-gold`).
- **Screen reader:** `aria-live="polite"` em região invisível que anuncia `sr_added`/`sr_removed` após toggle.
- **Alvo de toque:** 44×44 CSS px (WCAG 2.5.5 AAA); nos rows virtualizados onde o espaço é apertado, padding invisível via `::before`.
- **Contraste:** gold (#d4af37) em background dark atinge 4.8:1 vs surface — OK para AA em ícone.
- **Estado disabled:** quando limite atingido, `aria-disabled="true"` + tooltip explicativo.

---

## 11. Testes

### Unit ([`lib/stores/__tests__/user-favorites-store.test.ts`](../lib/stores/__tests__/) — novo)
- toggle local storage (add/remove/dedup)
- hydrate auth → chama `GET /api/favorites` e popula store
- hydrate guest → lê localStorage, respeita schema v1
- migrate: dedup correto quando localStorage e DB têm sobreposição
- limit: rejeita adds após 200 por tipo

### API ([`app/api/favorites/__tests__/route.test.ts`](../app/api/favorites/__tests__/) — novo)
- 401 sem auth e com anon
- 200 GET ordenado por position
- 409 em duplicata
- 409 em limite excedido
- 404 em DELETE de item de outro user (RLS)
- Rate limit 60/min

### E2E ([`e2e/favorites.spec.ts`](../e2e/) — novo)
- Guest favorita monstro em `/try`, reload, persiste
- Auth favorita em `/app/compendium`, F5, persiste
- Auth: star durante combate abre drawer, card clicável abre stat block inline
- Mobile: bottom-sheet abre, tabs funcionam, toque funciona
- A11y: `axe-core` run na drawer

### Visual regression
- Playwright screenshot do star (empty/filled) em monster card
- Screenshot do drawer desktop + bottom-sheet mobile

---

## 12. Estimativa por sub-tarefa (revisada)

| Tarefa | Estimativa |
|---|---|
| Migration `139_user_favorites.sql` + tipos | 1,0h |
| API endpoints (GET/POST/DELETE + testes) | 1,5h |
| Store `useFavoritesStore` (auth+guest unificado) + migration logic | 2,0h |
| Hook `useFavorite(itemType, itemId)` + botão `<FavoriteStar />` | 1,0h |
| Integrar star em 4 card components + 4 browsers | 1,0h |
| Drawer in-combat (desktop sidebar + mobile bottom-sheet) | 2,0h |
| Seção "Meus Favoritos" no compêndio auth | 0,75h |
| Widget público nas 4 páginas SRD (read-only + whitelist filter) | 0,5h |
| i18n keys + a11y polish + analytics events | 0,5h |
| Testes E2E + unit | 1,0h |
| Prompt de migração guest→auth | 0,5h |
| **Total** | **~11,75h** |

**Nota honesta:** ~8h era otimista. ~9,5h do prompt já reconhecia risco. Realista é **~12h** considerando integração em 4 browsers + 3 modos (guest/anon/auth) + 2 superfícies (combat + compendium) + widget público. Se o prazo Beta 4 (23/04) for rígido, cortar widget público e PATCH reorder para §14.

---

## 13. Rollout

1. Merge atrás de flag `ff_favorites_v1` em [`feature_flags`](../supabase/migrations/018_feature_flags.sql)
2. Enable para whitelist de beta testers (Lucas e outros DMs ativos) por 48h
3. Monitorar: erros 5xx em `/api/favorites`, taxa de toggle/sessão, % migrados com sucesso
4. Full rollout se error rate < 0,5% e p95 latência < 300ms
5. **Sem migration rollback:** tabela é aditiva, não bloqueia schema existente

Staging → prod direto; a tabela e o store são puramente aditivos.

---

## 14. Out of scope (futuro v2)

- Favoritar encounters/campanhas/NPCs/quests
- Favoritar DM notes / session notes
- Compartilhar favoritos entre usuários ("grupo de favoritos" para a mesa)
- PATCH reorder por drag-and-drop (se cortar em v1, adicionar badge "Em breve" no drawer)
- Sync cross-device para anon players
- Export/import favoritos (JSON)
- Favoritar feats/backgrounds/classes/races
- "Pastas" / tags / coleções organizacionais
- Pinned card diferente de favorite (hoje [`pinned-cards-store`](../lib/stores/pinned-cards-store.ts) é só UI transiente; manter separado — ver nota abaixo)

### Nota sobre overlap com PinnedCards

O store [`pinned-cards-store.ts`](../lib/stores/pinned-cards-store.ts) é **transient / session-only** (cards flutuantes na canvas durante uma sessão). Favoritos são **persistentes / cross-session**. Eles resolvem problemas diferentes:

| Feature | Escopo | Vida útil |
|---|---|---|
| Pinned card | Card aberto agora na tela | Desaparece no reload |
| Favorito | Bookmark para acesso futuro | Persiste |

**Não** fundir os dois. Coexistem naturalmente: favoritar um monstro não o pina; pinar na canvas não o favorita.

---

## 15. Referências de arquivos (verificadas)

**Ler/entender antes:**
- [`CLAUDE.md`](../CLAUDE.md) — Combat Parity Rule, SRD Compliance
- [`components/session/CombatSessionClient.tsx`](../components/session/CombatSessionClient.tsx)
- [`components/player/PlayerJoinClient.tsx`](../components/player/PlayerJoinClient.tsx)
- [`components/guest/GuestCombatClient.tsx`](../components/guest/GuestCombatClient.tsx)
- [`components/combat/MonsterSearchPanel.tsx`](../components/combat/MonsterSearchPanel.tsx)
- [`components/compendium/MonsterBrowser.tsx`](../components/compendium/MonsterBrowser.tsx)
- [`components/compendium/SpellBrowser.tsx`](../components/compendium/SpellBrowser.tsx)
- [`components/compendium/ItemBrowser.tsx`](../components/compendium/ItemBrowser.tsx)
- [`components/compendium/ConditionReference.tsx`](../components/compendium/ConditionReference.tsx)
- [`app/app/compendium/page.tsx`](../app/app/compendium/page.tsx)

**Precedente arquitetural direto (copiar padrão):**
- [`supabase/migrations/135_audio_favorites.sql`](../supabase/migrations/135_audio_favorites.sql)
- [`app/api/audio-favorites/route.ts`](../app/api/audio-favorites/route.ts)
- [`lib/stores/favorites-store.ts`](../lib/stores/favorites-store.ts) (store de audio — **não reusar**, criar novo store análogo)

**SRD infra:**
- [`lib/srd/srd-mode.ts`](../lib/srd/srd-mode.ts)
- [`public/srd/`](../public/srd/) — whitelists públicos
- [`scripts/filter-srd-public.ts`](../scripts/filter-srd-public.ts)

**Páginas públicas alvo do widget:**
- [`app/monsters/page.tsx`](../app/monsters/page.tsx), [`app/spells/page.tsx`](../app/spells/page.tsx), [`app/items/page.tsx`](../app/items/page.tsx), [`app/conditions/page.tsx`](../app/conditions/page.tsx)

**Infra compartilhada:**
- [`lib/rate-limit.ts`](../lib/rate-limit.ts)
- [`lib/errors/capture.ts`](../lib/errors/capture.ts)
- [`lib/analytics/track.ts`](../lib/analytics/track.ts)

---

## 16. Checklist de implementação

- [ ] Migration 139 aplicada em staging
- [ ] Tipos `lib/types/favorites.ts` criados
- [ ] Store `lib/stores/user-favorites-store.ts` + testes unit
- [ ] Hook `lib/hooks/useFavorite.ts`
- [ ] Componente `components/shared/FavoriteStar.tsx`
- [ ] API routes + testes
- [ ] Integração nos 4 card components do oracle
- [ ] Integração nos 4 browsers do compendium
- [ ] Drawer in-combat (DM + Player + Guest)
- [ ] Seção "Meus Favoritos" no `/app/compendium`
- [ ] Widget público nas 4 páginas SRD (com filtro whitelist)
- [ ] i18n pt-BR + en
- [ ] Analytics event `favorite_toggled` instrumentado
- [ ] A11y: axe-core passa no drawer
- [ ] E2E de guest + auth
- [ ] Prompt de migração guest→auth
- [ ] Feature flag `ff_favorites_v1` criado e enable para beta whitelist
- [ ] Docs atualizados: [`docs/glossario-ubiquo.md`](./glossario-ubiquo.md) com termo "Favoritos"

---

**FIM DO SPEC** — Pronto para implementação.
