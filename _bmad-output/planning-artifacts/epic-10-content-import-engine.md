---
status: 'ready-for-implementation'
createdAt: '2026-03-28'
version: '2.0'
epic: 10
title: 'Content Import Engine'
inputDocuments:
  - _bmad-output/planning-artifacts/research/research-compendium-legal-strategy-2026-03-28.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'epic-stories'
project_name: 'projeto-rpg'
user_name: 'Dani_'
date: '2026-03-28'
---

# Epic 10: Content Import Engine — Spec Final V2

Motor de importação de conteúdo externo + desbloqueio de conteúdo não-SRD já existente nos bundles. Integrado ao combate e ao onboarding tour do `/try`.

---

## 1. Estratégia de Coexistência (Beta)

### Estado Atual do Codebase

| Item | Detalhe |
|------|---------|
| Bundles | `public/srd/monsters-2014.json` (366+ monstros), `monsters-2024.json` (150+) |
| Campo `is_srd` | Já existe em `SrdMonster` e `SrdSpell` — filtra conteúdo nas páginas públicas |
| Server-side filter | `srd-data-server.ts` retorna apenas `is_srd: true` para SEO/públicas |
| Client-side (combate) | Atualmente carrega TODOS os monstros dos bundles no Fuse.js |
| Feature flag existente | `show_non_srd_content` (plan: "free") — já no `feature-flags.ts` |
| IndexedDB | `srd-cache` v5 com stores: monsters, spells, conditions, items |
| Homebrew merge | `mergeHomebrewMonsters()` em `srd-search.ts` — padrão reutilizável |

### Modelo de 3 Camadas com Source Flags

```
┌─────────────────────────────────────────────────────────┐
│  CAMADA 1 — SRD (sempre visível)                        │
│  is_srd: true  •  source: 'srd'                        │
│  ~334 monstros CC-BY-4.0                                │
│  Já funciona hoje, zero mudanças                        │
├─────────────────────────────────────────────────────────┤
│  CAMADA 2 — Bundled Non-SRD (gate: aceite do termo)    │
│  is_srd: false  •  source: 'bundled'                   │
│  ~30-50 monstros extras já nos bundles                  │
│  Desbloqueados via extended_compendium flag             │
│  ⚠️ Beta only — reavaliar antes do launch público      │
├─────────────────────────────────────────────────────────┤
│  CAMADA 3 — Importado pelo usuário (IndexedDB)         │
│  is_srd: false  •  source: 'imported'                  │
│  URL/upload JSON + fetch Open5e API                     │
│  Dados no browser do usuário, nunca no server           │
└─────────────────────────────────────────────────────────┘
```

### Como Coexistem

```typescript
// Na busca (MonsterSearchPanel), o filtro fica:
function getVisibleMonsters(allMonsters: SrdMonster[], hasExtendedCompendium: boolean) {
  if (hasExtendedCompendium) return allMonsters; // Tudo: SRD + bundled + imported
  return allMonsters.filter(m => m.is_srd !== false); // Só SRD (comportamento atual)
}
```

**O "buscar na internet" no beta:**
1. Usuário clica "Buscar conteúdo externo" → aceita termo
2. `extended_compendium` = true (localStorage + Zustand)
3. Monstros não-SRD do bundle ficam visíveis instantaneamente (já estavam em memória)
4. Opcionalmente: background fetch da Open5e API → salva no IndexedDB → merge no Fuse.js
5. Opção avançada: import via URL/upload pra quem quer o compêndio completo do 5etools

**Antes do launch público:**
- [ ] Decidir se mantém conteúdo não-SRD nos bundles ou remove
- [ ] Se remover: Camada 2 desaparece, apenas Camada 1 + 3
- [ ] Se mantiver: revalidar risco legal dos nomes/dados específicos

---

## 2. Decisões Técnicas

| Decisão | Implementação |
|---------|---------------|
| **Storage importados** | IndexedDB `srd-cache` v6 — novos stores `imported-monsters`, `imported-spells` |
| **Source tracking** | Campo `source: 'srd' \| 'bundled' \| 'imported'` em SrdMonster/SrdSpell |
| **Feature flag** | `extended_compendium` — nova flag, plan: "free", client-side toggle via localStorage |
| **Search merge** | Seguir padrão `mergeHomebrewMonsters()` — rebuild Fuse index com importados |
| **Parser** | Multi-formato: 5etools, Open5e, 5e-database, custom — normaliza pro schema SrdMonster |
| **Placeholder rotativo** | 6 sites reais no input URL (beta fechado) — reavaliar pré-launch |
| **Tour step** | Novo step após `monster-result` em `tour-steps.ts` |
| **Pontos de entrada** | (a) toolbar discreta no combate + (b) CTA no footer da lista de monstros |

---

## 3. Stories

### Story 10.1: Flag `extended_compendium` + filtro na busca

**Objetivo:** Gating do conteúdo não-SRD via feature flag + aceite do termo.

**Dependências:** Nenhuma

**Arquivos impactados:**
- `lib/feature-flags.ts` — adicionar `extended_compendium` ao DEFAULT_FLAGS (plan: "free")
- `lib/types/subscription.ts` — adicionar ao FeatureFlagKey union type
- `lib/hooks/use-extended-compendium.ts` — **novo** hook que lê localStorage + flag
- `components/combat/MonsterSearchPanel.tsx` — filtrar por `is_srd` quando flag desativada

**AC:**

**Given** `extended_compendium` não está ativada para o usuário
**When** busca de monstros no MonsterSearchPanel
**Then** apenas monstros com `is_srd !== false` aparecem (comportamento atual preservado)

**Given** usuário aceita termo de responsabilidade
**When** `extended_compendium` é ativada (localStorage `ext_compendium_accepted: true`)
**Then** todos os monstros dos bundles aparecem na busca (SRD + non-SRD)
**And** monstros com `is_srd: false` exibem badge discreto "Externo"

**Given** `extended_compendium` ativada + monstros importados no IndexedDB
**When** busca realizada
**Then** resultados incluem SRD + bundled + imported, com badges diferenciados

---

### Story 10.2: UI do termo de aceite + "Buscar conteúdo externo"

**Objetivo:** Modal/sheet de aceite que desbloqueia conteúdo externo.

**Dependências:** Story 10.1

**Arquivos impactados:**
- `components/import/ExternalContentGate.tsx` — **novo** modal com termo + checkbox
- `components/import/ImportContentModal.tsx` — **novo** modal de importação avançada (URL/upload)
- `components/import/RotatingPlaceholder.tsx` — **novo** input com placeholder animado
- `lib/i18n/locales/pt-BR.json` + `en.json` — textos do termo e placeholders

**AC:**

**Given** modal de aceite renderizado
**When** usuário visualiza
**Then** texto: "Declaro que entendo que o Pocket DM não possui propriedade sobre conteúdos buscados conforme minha solicitação. Os resultados são provenientes de fontes públicas da internet e estão sujeitos à disponibilidade de seus respectivos mantenedores. Assumo total responsabilidade pelo uso deste conteúdo."
**And** checkbox obrigatório + botão "Ativar Conteúdo Externo" (disabled sem checkbox)

**Given** usuário aceita o termo
**When** clica "Ativar Conteúdo Externo"
**Then** localStorage `ext_compendium_accepted: true`
**And** flag `extended_compendium` ativada no state
**And** modal fecha, conteúdo non-SRD fica visível imediatamente
**And** toast: "Compêndio expandido ativado! X monstros extras disponíveis."

**Given** usuário já aceitou o termo anteriormente
**When** abre o app em nova sessão
**Then** localStorage preserva aceite, conteúdo externo visível sem re-aceitar

---

### Story 10.3: IndexedDB store para conteúdo importado

**Objetivo:** CRUD de conteúdo importado pelo usuário, separado dos bundles.

**Dependências:** Nenhuma (paralela com 10.1)

**Arquivos impactados:**
- `lib/srd/srd-cache.ts` — bump version 5→6, novos stores `imported-monsters`, `imported-spells`
- `lib/import/import-cache.ts` — **novo** CRUD para importados

**AC:**

**Given** IndexedDB `srd-cache` atualizado para v6
**When** upgrade executa
**Then** novos object stores `imported-monsters`, `imported-spells` criados
**And** stores existentes preservados (sem clear)

**Given** `saveImportedMonsters(monsters[], sourceLabel)` chamado
**When** dados salvos
**Then** monstros armazenados com key = sourceLabel (ex: "open5e-2026-03-28")
**And** cada monstro tem `source: 'imported'`, `is_srd: false`

**Given** `getImportedMonsters()` chamado
**When** dados existem
**Then** retorna array flat de todos os monstros importados de todas as fontes

**Given** `clearImportedBySource(sourceLabel)` chamado
**When** fonte removida
**Then** apenas monstros daquela fonte removidos, outros preservados

**Given** navegador sem suporte a IndexedDB
**When** qualquer operação tentada
**Then** graceful degradation, aviso ao usuário

---

### Story 10.4: Parser multi-formato

**Objetivo:** Detectar e normalizar JSON de diferentes fontes pro schema SrdMonster.

**Dependências:** Nenhuma (paralela)

**Arquivos impactados:**
- `lib/import/import-parser.ts` — **novo** parser com auto-detect
- `lib/import/normalizers/5etools.ts` — **novo** normalizer 5etools → SrdMonster
- `lib/import/normalizers/open5e.ts` — **novo** normalizer Open5e → SrdMonster
- `lib/import/normalizers/5e-database.ts` — **novo** normalizer 5e-database → SrdMonster

**AC:**

**Given** JSON com campo `"monster"` array
**When** parser recebe
**Then** detecta formato 5etools
**And** normaliza: `hp.average` → `hit_points`, `hp.formula` → `hp_formula`, `ac[0].ac` → `armor_class`
**And** gera `id` a partir de `name.toLowerCase().replace(/\s+/g, '-')`
**And** seta `source: 'imported'`, `is_srd: false`, `ruleset_version: '2014'`

**Given** JSON com campo `"results"` array (Open5e)
**When** parser recebe
**Then** detecta Open5e, normaliza: `slug` → `id`, `hit_points` → `hit_points`, `armor_class` → `armor_class`

**Given** JSON com campo `"index"` (5e-database)
**When** parser recebe
**Then** detecta 5e-database, normaliza para SrdMonster

**Given** JSON não reconhecido
**When** parser recebe
**Then** retorna `{ success: false, error: 'FORMAT_UNKNOWN', supportedFormats: [...] }`

**Given** JSON parcialmente válido (alguns entries falham)
**When** parser processa
**Then** retorna entries válidos + warnings array com entries que falharam

---

### Story 10.5: Merge importados no Fuse.js

**Objetivo:** Conteúdo importado aparece na busca unificada com badges.

**Dependências:** Story 10.3

**Arquivos impactados:**
- `lib/srd/srd-search.ts` — nova função `mergeImportedMonsters()` (seguir padrão homebrew)
- `lib/stores/srd-store.ts` — chamar merge após carregar importados do IndexedDB
- `components/combat/MonsterSearchPanel.tsx` — badge "Importado" nos resultados

**AC:**

**Given** `mergeImportedMonsters(imported[])` chamado
**When** index rebuild
**Then** Fuse.js index contém SRD + bundled + imported
**And** monsterMap atualizado para lookup O(1)

**Given** busca por "Dragon" com monstros importados
**When** resultados renderizados
**Then** resultados misturados por relevância Fuse
**And** badge visual: nenhum (SRD), "Externo" cinza (bundled non-SRD), "Importado" azul (imported)

**Given** stat block de monstro importado
**When** renderizado via StatBlockModal
**Then** mesmo layout dos SRD, com header indicando "Conteúdo externo"

---

### Story 10.6: Importação avançada — URL + upload JSON

**Objetivo:** Power users podem importar compêndio completo via URL ou arquivo.

**Dependências:** Story 10.3, Story 10.4

**Arquivos impactados:**
- `components/import/ImportContentModal.tsx` — modal com URL input + upload
- `components/import/RotatingPlaceholder.tsx` — placeholder animado com 6 sites
- Integração: após import, chamar `mergeImportedMonsters()` e salvar no IndexedDB

**AC:**

**Given** modal de importação aberto
**When** usuário visualiza
**Then** campo URL com placeholder rotativo (fade 300ms, ciclo 3s, ordem aleatória):
  - `"Ex: https://5e.tools/data/bestiary/"`
  - `"Ex: https://open5e.com/api/monsters/"`
  - `"Ex: https://dnd5e.wikidot.com/monsters"`
  - `"Ex: https://roll20.net/compendium/dnd5e/"`
  - `"Ex: https://www.dndbeyond.com/monsters"`
  - `"Ex: https://5esrd.com/database/creature/"`
**And** separador "— ou —"
**And** botão upload JSON
**And** botão "Importar" (requer termo já aceito via Story 10.2)

**Given** URL colada e "Importar" clicado
**When** fetch client-side executa
**Then** progress indicator durante download
**And** parser auto-detecta formato e normaliza
**And** salva no IndexedDB, merge no Fuse.js
**And** toast: "X monstros importados com sucesso!"

**Given** erro no fetch (CORS, 404, JSON inválido)
**When** erro capturado
**Then** mensagem específica ao tipo de erro
**And** sugestão: "Tente fazer download do arquivo e usar o upload manual"

**Given** placeholder rotativo no campo de URL
**When** campo recebe focus
**Then** animação para, placeholder desaparece (comportamento padrão)

---

### Story 10.7: Pontos de entrada no combate

**Objetivo:** Botão de importação na toolbar + CTA no footer da lista de monstros.

**Dependências:** Story 10.2, Story 10.6

**Arquivos impactados:**
- `components/combat/MonsterSearchPanel.tsx` — CTA footer + integração modal
- `components/combat/EncounterSetup.tsx` — ícone na toolbar (se existir toolbar)
- Ou componente de ação do combate onde ficar mais natural

**AC:**

**Given** DM em combate/setup, `extended_compendium` NÃO ativada
**When** rola até o final da lista de monstros
**Then** footer CTA: "📥 Não encontrou? Busque conteúdo externo"
**And** clicar abre o ExternalContentGate (Story 10.2)

**Given** DM em combate/setup, `extended_compendium` ativada mas sem importados
**When** rola até o final da lista
**Then** footer CTA: "📥 Importe ainda mais monstros de fontes externas"
**And** clicar abre ImportContentModal (Story 10.6)

**Given** `extended_compendium` ativada + importados existem
**When** lista renderizada
**Then** CTA oculto (usuário já tem conteúdo expandido)

**Given** toolbar do combate
**When** renderizada
**Then** ícone discreto 📥 (import) visível
**And** tooltip: "Importar conteúdo externo"
**And** clicar abre ExternalContentGate ou ImportContentModal conforme estado

---

### Story 10.8: Step no tour do onboarding (`/try`)

**Objetivo:** Usuário descobre a importação durante o combate guiado.

**Dependências:** Story 10.7

**Arquivos impactados:**
- `components/tour/tour-steps.ts` — novo step após `monster-result` (index 3, entre add-row e roll-initiative)
- `lib/i18n/locales/pt-BR.json` + `en.json` — textos do tour step

**AC:**

**Given** tour ativo no `/try`, usuário acabou de adicionar primeiro monstro SRD
**When** step `monster-result` completo
**Then** novo step `import-hint` aparece apontando pro CTA/toolbar de importação
**And** tooltip: "Sabia que você pode expandir o compêndio com milhares de monstros extras? Toque aqui quando quiser."
**And** step tipo "info", position "bottom", phase "setup"

**Given** step exibido no `/try` sem login
**When** usuário visualiza
**Then** nota adicional: "Crie sua conta para manter o conteúdo importado entre sessões"

**Given** usuário importa conteúdo no `/try`
**When** importação via IndexedDB
**Then** funciona normalmente (IndexedDB não requer auth)
**And** dados persistem no browser durante a sessão

---

### Story 10.9: Gerenciamento de conteúdo importado

**Objetivo:** Usuário pode visualizar, reimportar e remover conteúdo importado.

**Dependências:** Story 10.3, Story 10.6

**Arquivos impactados:**
- `components/import/ImportManagement.tsx` — **novo** — tela em Settings
- Rota em Settings ou página dedicada

**AC:**

**Given** usuário acessa Settings → "Conteúdo Externo"
**When** página renderiza
**Then** seção 1: Status do compêndio expandido (ativado/desativado + toggle)
**And** seção 2: Lista de fontes importadas com: label, data, contagem, tamanho
**And** botões: "Reimportar" (re-fetch URL), "Remover" por fonte

**Given** "Remover" clicado em uma fonte
**When** confirmação aceita
**Then** dados removidos do IndexedDB, Fuse.js reindexado
**And** se nenhuma fonte restante, UI indica "Nenhum conteúdo importado"

**Given** "Desativar Conteúdo Externo" clicado
**When** toggle desativado
**Then** `extended_compendium` = false, busca volta a mostrar apenas SRD
**And** dados importados NÃO removidos (podem reativar a qualquer momento)

---

## 4. Dependências entre Stories

```
Story 10.1 (flag + filtro) ─── independente ← BASE
Story 10.2 (UI termo) ─── após 10.1
Story 10.3 (IndexedDB) ─── independente ← PARALELA com 10.1
Story 10.4 (Parser) ─── independente ← PARALELA com 10.1 e 10.3
Story 10.5 (Fuse.js merge) ─── após 10.3
Story 10.6 (Import URL/upload) ─── após 10.3 + 10.4
Story 10.7 (Combate UI) ─── após 10.2 + 10.6
Story 10.8 (Tour step) ─── após 10.7
Story 10.9 (Gerenciamento) ─── após 10.3 + 10.6
```

```
Dia 1: [10.1] [10.3] [10.4]  ← 3 stories paralelas
Dia 2: [10.2] [10.5]          ← UI termo + Fuse merge
Dia 3: [10.6]                  ← Import avançado
Dia 4: [10.7] [10.9]          ← Combate UI + Gerenciamento
Dia 5: [10.8]                  ← Tour step + testes + polish
```

---

## 5. Sprint Plan

| Dia | Stories | Foco | Entregável |
|-----|---------|------|------------|
| **1** | 10.1 + 10.3 + 10.4 | Fundação | Flag funciona, IndexedDB pronto, parser parseia 3 formatos |
| **2** | 10.2 + 10.5 | Gate + Search | Termo aceito → conteúdo non-SRD visível, importados no Fuse |
| **3** | 10.6 | Import | URL e upload JSON funcionam end-to-end |
| **4** | 10.7 + 10.9 | Combate + Settings | CTA no combate, gerenciamento em Settings |
| **5** | 10.8 + testes + QA | Onboarding + Polish | Tour step, testes E2E, edge cases |

---

## 6. Arquivos Impactados — Mapa Completo

### Novos arquivos
| Arquivo | Story | Descrição |
|---------|-------|-----------|
| `lib/hooks/use-extended-compendium.ts` | 10.1 | Hook: lê localStorage + flag |
| `lib/import/import-cache.ts` | 10.3 | CRUD IndexedDB para importados |
| `lib/import/import-parser.ts` | 10.4 | Parser com auto-detect de formato |
| `lib/import/normalizers/5etools.ts` | 10.4 | Normalizer 5etools → SrdMonster |
| `lib/import/normalizers/open5e.ts` | 10.4 | Normalizer Open5e → SrdMonster |
| `lib/import/normalizers/5e-database.ts` | 10.4 | Normalizer 5e-database → SrdMonster |
| `components/import/ExternalContentGate.tsx` | 10.2 | Modal aceite + ativação |
| `components/import/ImportContentModal.tsx` | 10.6 | Modal import URL/upload |
| `components/import/RotatingPlaceholder.tsx` | 10.6 | Input com placeholder animado |
| `components/import/ImportManagement.tsx` | 10.9 | Tela gerenciamento em Settings |

### Arquivos editados
| Arquivo | Story | Mudança |
|---------|-------|---------|
| `lib/feature-flags.ts` | 10.1 | Adicionar `extended_compendium` ao DEFAULT_FLAGS |
| `lib/types/subscription.ts` | 10.1 | Adicionar ao FeatureFlagKey union |
| `lib/srd/srd-cache.ts` | 10.3 | Bump v5→v6, novos stores |
| `lib/srd/srd-search.ts` | 10.5 | `mergeImportedMonsters()`, `mergeImportedSpells()` |
| `lib/stores/srd-store.ts` | 10.5 | Carregar importados no init |
| `lib/srd/srd-loader.ts` | 10.1 | Adicionar `source` ao type SrdMonster (se não existir) |
| `components/combat/MonsterSearchPanel.tsx` | 10.1, 10.7 | Filtro is_srd + CTA footer |
| `components/tour/tour-steps.ts` | 10.8 | Novo step `import-hint` |
| `lib/i18n/locales/pt-BR.json` | 10.2, 10.6, 10.8 | Textos PT-BR |
| `lib/i18n/locales/en.json` | 10.2, 10.6, 10.8 | Textos EN |

---

## 7. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| CORS block no fetch de URLs externas | Sugerir download + upload manual; proxy opcional futuro |
| 5etools muda formato JSON | Parser versioned + fallback genérico |
| Conteúdo non-SRD no bundle pré-launch | Feature flag permite desligar globalmente |
| IndexedDB quota excedida | Monitorar tamanho, avisar usuário, compressão futura |
| Performance Fuse.js com 2000+ monstros | Fuse já lida bem com esse volume; monitorar rebuild time |

---

*Epic V2 finalizado em 2026-03-28. Baseado em research legal + party mode discussion. Pronto para implementação.*
