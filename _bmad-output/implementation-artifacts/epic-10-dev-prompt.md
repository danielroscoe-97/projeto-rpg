# Epic 10: Content Import Engine — Dev Implementation Prompt

**Instrução:** Implemente o Epic 10 completo seguindo a spec em `_bmad-output/planning-artifacts/epic-10-content-import-engine.md`. Siga a ordem de stories e faça commits incrementais.

---

## Contexto do Codebase

Antes de codar, leia estes arquivos para entender os padrões existentes:

```
OBRIGATÓRIO LER ANTES DE CODAR:
├── lib/srd/srd-cache.ts          → IndexedDB patterns (idb, singleton, graceful degradation)
├── lib/srd/srd-search.ts         → Fuse.js indexes, mergeHomebrew pattern, source maps
├── lib/srd/srd-loader.ts         → SrdMonster/SrdSpell types (is_srd, source fields)
├── lib/stores/srd-store.ts       → Zustand store, loadWithCache, initializeSrd
├── lib/feature-flags.ts          → DEFAULT_FLAGS, canAccess, FeatureFlagKey
├── lib/types/subscription.ts     → FeatureFlagKey union type, Plan type
├── lib/hooks/use-feature-gate.ts → useFeatureGate hook pattern
├── components/combat/MonsterSearchPanel.tsx  → Search UI, results rendering, empty state
├── components/combat/EncounterSetup.tsx      → Where MonsterSearchPanel is used
├── components/tour/tour-steps.ts             → Tour step config structure
├── lib/i18n/locales/pt-BR.json              → i18n pattern
├── lib/i18n/locales/en.json                 → i18n pattern
├── docs/tech-stack-libraries.md             → Libraries and usage rules
```

---

## Ordem de Implementação

### DIA 1 — Stories 10.1 + 10.3 + 10.4 (Paralelas)

#### Story 10.1: Flag `extended_compendium` + filtro na busca

1. **`lib/types/subscription.ts`** — adicionar `"extended_compendium"` ao `FeatureFlagKey` union type

2. **`lib/feature-flags.ts`** — adicionar ao DEFAULT_FLAGS:
```typescript
{
  id: "",
  key: "extended_compendium",
  enabled: true,
  plan_required: "free" as Plan,  // Qualquer usuário pode ativar
  description: null,
  updated_at: "",
}
```

3. **`lib/hooks/use-extended-compendium.ts`** — NOVO:
```typescript
// Hook que combina localStorage (aceite do termo) + feature flag
// Retorna { isActive: boolean, activate: () => void, deactivate: () => void }
// localStorage key: "ext_compendium_accepted"
// Usa useFeatureGate('extended_compendium') como kill switch global
```

4. **`lib/srd/srd-loader.ts`** — verificar se `source` field existe no type SrdMonster. Se não:
```typescript
source?: 'srd' | 'bundled' | 'imported';
```

5. **`components/combat/MonsterSearchPanel.tsx`** — adicionar filtro:
   - Importar `useExtendedCompendium`
   - Antes de renderizar resultados, filtrar: se `!isActive`, mostrar apenas `is_srd !== false`
   - Se `isActive`, mostrar tudo
   - Adicionar badge visual nos resultados: monstros com `is_srd: false` ganham badge "Externo"
   - Badge style: texto cinza sutil, não intrusivo

**Commit:** `feat(epic-10): add extended_compendium flag and search filtering`

---

#### Story 10.3: IndexedDB store para importados

1. **`lib/srd/srd-cache.ts`** — bump version e adicionar stores:
```typescript
const DB_VERSION = 6; // Era 5

// No upgrade handler, adicionar:
if (!db.objectStoreNames.contains("imported-monsters")) {
  db.createObjectStore("imported-monsters");
}
if (!db.objectStoreNames.contains("imported-spells")) {
  db.createObjectStore("imported-spells");
}
// NÃO limpar stores existentes no upgrade 5→6
```

2. **`lib/import/import-cache.ts`** — NOVO:
```typescript
// Reutilizar getDb() de srd-cache (exportar se necessário)
// Funções:
// - saveImportedMonsters(sourceLabel: string, monsters: SrdMonster[]): Promise<void>
// - getImportedMonsters(): Promise<SrdMonster[]>  // Flat array de todas as fontes
// - getImportedSources(): Promise<{ label: string, count: number, date: string }[]>
// - clearImportedBySource(sourceLabel: string): Promise<void>
// - clearAllImported(): Promise<void>
// Cada fonte é uma key no store, value é { monsters: SrdMonster[], importedAt: string }
```

**Commit:** `feat(epic-10): IndexedDB stores for imported content`

---

#### Story 10.4: Parser multi-formato

1. **`lib/import/import-parser.ts`** — NOVO:
```typescript
type ParseResult =
  | { success: true; monsters: SrdMonster[]; format: string; warnings: string[] }
  | { success: false; error: string; supportedFormats: string[] };

export function parseMonsterData(json: unknown): ParseResult
// Auto-detect: check for monster[], results[], index field
// Delegate to normalizer
// Catch partial failures, return valid + warnings
```

2. **`lib/import/normalizers/5etools.ts`** — NOVO:
```typescript
// Input: 5etools monster object
// Output: SrdMonster
// Mapping: hp.average → hit_points, hp.formula → hp_formula, ac[0].ac → armor_class
// str/dex/con/int/wis/cha → ability scores
// action[].entries → actions array
// Set: source = 'imported', is_srd = false, ruleset_version = '2014'
// id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
```

3. **`lib/import/normalizers/open5e.ts`** — NOVO:
```typescript
// Input: Open5e monster object (from results[] array)
// Output: SrdMonster
// Mapping: slug → id, hit_points → hit_points, armor_class → armor_class
// Set: source = 'imported', is_srd = false
```

4. **`lib/import/normalizers/5e-database.ts`** — NOVO:
```typescript
// Input: 5e-database monster object
// Output: SrdMonster
// Mapping: index → id, hit_points → hit_points
```

**Commit:** `feat(epic-10): multi-format JSON parser with 3 normalizers`

---

### DIA 2 — Stories 10.2 + 10.5

#### Story 10.2: UI do termo de aceite

1. **`components/import/ExternalContentGate.tsx`** — NOVO:
   - Usar padrão de modal/sheet existente no projeto (verificar `components/ui/`)
   - Texto do termo em i18n (pt-BR + en)
   - Checkbox + botão "Ativar Conteúdo Externo"
   - Ao ativar: chamar `activate()` do hook `useExtendedCompendium`
   - Toast de confirmação com contagem de monstros extras
   - Estilo visual consistente com o restante do app (dark theme, gold accents)

2. **i18n keys** a adicionar:
```json
{
  "import.gate_title": "Buscar Conteúdo Externo",
  "import.gate_disclaimer": "Declaro que entendo que o Pocket DM não possui propriedade sobre conteúdos buscados conforme minha solicitação. Os resultados são provenientes de fontes públicas da internet e estão sujeitos à disponibilidade de seus respectivos mantenedores. Assumo total responsabilidade pelo uso deste conteúdo.",
  "import.gate_checkbox": "Li e aceito os termos acima",
  "import.gate_activate": "Ativar Conteúdo Externo",
  "import.gate_success": "Compêndio expandido! {{count}} monstros extras disponíveis.",
  "import.badge_external": "Externo",
  "import.badge_imported": "Importado"
}
```

**Commit:** `feat(epic-10): external content gate with disclaimer acceptance`

---

#### Story 10.5: Merge importados no Fuse.js

1. **`lib/srd/srd-search.ts`** — adicionar (seguir padrão mergeHomebrew):
```typescript
export function mergeImportedMonsters(imported: SrdMonster[]): void {
  if (!monsterIndex) return;
  imported.forEach((m) => monsterMap.set(`${m.id}:${m.ruleset_version}`, m));
  monsterIndex = new Fuse(Array.from(monsterMap.values()), MONSTER_OPTIONS);
}

export function mergeImportedSpells(imported: SrdSpell[]): void {
  if (!spellIndex) return;
  imported.forEach((s) => spellMap.set(`${s.id}:${s.ruleset_version}`, s));
  spellIndex = new Fuse(Array.from(spellMap.values()), SPELL_OPTIONS);
}
```

2. **`lib/stores/srd-store.ts`** — após `initializeSrd`, carregar importados:
```typescript
// Após buildMonsterIndex/buildSpellIndex, verificar IndexedDB para importados
// Se existem: chamar mergeImportedMonsters/mergeImportedSpells
// Condicional: apenas se extended_compendium está ativada (localStorage check)
```

**Commit:** `feat(epic-10): merge imported content into Fuse.js search indexes`

---

### DIA 3 — Story 10.6

#### Story 10.6: Importação avançada

1. **`components/import/RotatingPlaceholder.tsx`** — NOVO:
```typescript
// Input component que mostra placeholder rotativo
// Props: placeholders: string[], interval?: number (default 3000), fadeMs?: number (default 300)
// Comportamento: fade transition entre placeholders, ordem aleatória por sessão
// On focus: para animação, placeholder desaparece
// Implementar com CSS transition + useState + useEffect interval
```

2. **`components/import/ImportContentModal.tsx`** — NOVO:
   - Campo URL com RotatingPlaceholder
   - Separador "— ou —"
   - Botão upload arquivo JSON (input type="file" accept=".json")
   - Progress bar durante fetch/parsing
   - Resultados: "X monstros importados com sucesso!" ou erro detalhado
   - Fluxo:
     1. Usuário cola URL → fetch client-side → parse → save IndexedDB → merge Fuse
     2. Usuário faz upload → FileReader → parse → save IndexedDB → merge Fuse
   - Tratar erro CORS com mensagem útil: "Não foi possível acessar a URL. Tente baixar o arquivo e usar o upload manual."

**Commit:** `feat(epic-10): import modal with URL fetch, file upload, and rotating placeholder`

---

### DIA 4 — Stories 10.7 + 10.9

#### Story 10.7: Pontos de entrada no combate

1. **`components/combat/MonsterSearchPanel.tsx`** — adicionar CTA no footer:
   - Após a lista de resultados (scrollable area), adicionar footer fixo condicional
   - Se `!isActive` → CTA: "📥 Não encontrou? Busque conteúdo externo" → abre ExternalContentGate
   - Se `isActive && !hasImported` → CTA: "📥 Importe ainda mais monstros" → abre ImportContentModal
   - Se `isActive && hasImported` → CTA oculto
   - Styling: border-top subtle, texto menor, ícone de import

2. **Toolbar do combate** — adicionar ícone discreto:
   - Verificar onde está a toolbar em `EncounterSetup.tsx` ou componente de combate
   - Adicionar ícone 📥 com tooltip "Importar conteúdo externo"
   - `data-tour-id="import-content"` para o tour step

**Commit:** `feat(epic-10): import CTA in monster search + combat toolbar button`

---

#### Story 10.9: Gerenciamento

1. **`components/import/ImportManagement.tsx`** — NOVO:
   - Seção 1: Toggle compêndio expandido (on/off)
   - Seção 2: Lista de fontes importadas (do IndexedDB via `getImportedSources()`)
   - Cada fonte: label, data, contagem, botões Reimportar/Remover
   - Botão "Limpar Tudo" com confirmação
   - Integrar na página de Settings existente

**Commit:** `feat(epic-10): import management page in settings`

---

### DIA 5 — Story 10.8 + Polish

#### Story 10.8: Tour step

1. **`components/tour/tour-steps.ts`** — inserir novo step após `monster-result` (index 2):
```typescript
// Inserir como Step 3 (shift os demais)
{
  id: "import-hint",
  targetSelector: '[data-tour-id="import-content"]',
  titleKey: "tour.import_hint_title",
  descriptionKey: "tour.import_hint_description",
  type: "info",
  position: "bottom",
  phase: "setup",
},
```

2. **i18n keys**:
```json
{
  "tour.import_hint_title": "Expanda seu compêndio",
  "tour.import_hint_description": "Sabia que você pode acessar milhares de monstros extras de fontes externas? Toque aqui quando quiser expandir sua biblioteca."
}
```

**Commit:** `feat(epic-10): tour step for content import discovery`

---

## Regras de Implementação

1. **Seguir padrões existentes** — não inventar novos patterns. Copiar o estilo de `mergeHomebrew*`, `loadWithCache`, `useFeatureGate`
2. **i18n obrigatório** — todo texto visível em pt-BR + en
3. **Dark theme** — respeitar o design system existente (verificar cores em uso)
4. **Commits incrementais** — um commit por story ou sub-story
5. **Testes** — ao menos testes unitários para o parser (10.4) e cache (10.3)
6. **Sem breaking changes** — o app deve funcionar normalmente com `extended_compendium` desativada
7. **HP tier colors** — LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%) — regra imutável, não alterar
8. **Não adicionar conteúdo novo aos bundles** — apenas gating e import do que já existe
9. **Pixel art / UI style** — seguir o estilo 16-bit pixel art RPG existente para ícones e badges

---

## Checklist de Deploy

- [ ] `npm run build` passa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] Testes existentes continuam passando
- [ ] App funciona normalmente com `extended_compendium` desativada (zero regression)
- [ ] Com flag ativada: monstros non-SRD visíveis na busca com badge "Externo"
- [ ] Import via URL funciona (testar com Open5e API: `https://api.open5e.com/v1/monsters/`)
- [ ] Import via upload funciona (testar com JSON exportado)
- [ ] CTA aparece no footer da lista de monstros
- [ ] Tour step aparece no `/try` após adicionar monstro
- [ ] Gerenciamento em Settings funciona (listar, remover)
- [ ] i18n: todos os textos em pt-BR e en
- [ ] Mobile responsivo (testar MonsterSearchPanel CTA em mobile)
