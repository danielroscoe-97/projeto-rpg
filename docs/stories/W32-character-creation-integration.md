# W3.2 — Integração CharacterForm + CharacterCard no PlayerCharacterManager

**Epic:** Player Experience — Área Logada  
**Prioridade:** Alta  
**Estimativa:** 4-6h  
**Tipo:** Integração (infra e componentes já existem)

---

## Resumo

`CharacterForm.tsx` e `CharacterCard.tsx` em `components/character/` foram criados com campos completos (raça, classe, nível, notas, avatar) mas **nunca foram importados** em nenhum lugar. `PlayerCharacterManager.tsx` usa um form inline simplificado com apenas nome/HP/AC/DC.

O objetivo é substituir o form inline do `PlayerCharacterManager` pelos componentes já prontos, unificando a criação/edição de personagens em um único fluxo completo.

---

## Contexto

### Componentes existentes (orphaned)

**`components/character/CharacterForm.tsx`**
- Dialog com: nome, raça (dropdown SRD), classe (dropdown SRD), nível, HP máximo, AC, notas
- Props: `open`, `onOpenChange`, `character` (para edição), `onSave`
- **Gap:** não tem campo `spell_save_dc` — precisa ser adicionado

**`components/character/CharacterCard.tsx`**
- Exibe: avatar circular (token_url), nome, raça + classe, nível, HP e AC como badges
- Props: `character`, `onClick`
- **Gap:** não tem ação de upload de token nem edição inline

### Componente em uso (a substituir/estender)

**`components/dashboard/PlayerCharacterManager.tsx`**
- Form inline com: nome, max_hp, ac, spell_save_dc
- Cards inline com: nome, stats badges, notas DM (textarea), botões edit/remove
- Integrado em `CampaignSections.tsx`

### Schema DB (migration 001 + 027 + 038 + 044)

```typescript
player_characters {
  id, campaign_id, name,
  max_hp, current_hp, ac, spell_save_dc,
  race, class, level,       // migration 038
  notes, token_url,         // migration 044
  dm_notes,                 // migration 029
  user_id                   // migration 027
}
```

---

## Critérios de Aceite

1. Clicar em "+ Personagem" abre o `CharacterForm` (dialog) com campos: nome\*, raça, classe, nível, HP máximo\*, AC\*, Spell Save DC (opcional), notas pessoais.

2. Salvar cria o personagem com todos os campos preenchidos persistidos no banco.

3. A lista de personagens usa `CharacterCard` mostrando: avatar circular (placeholder User icon se sem token_url), nome, raça + classe como subtítulo, nível, badges HP e AC.

4. Clicar no card abre `CharacterForm` em modo edição com dados preenchidos.

5. `CharacterForm.onSave` aceita e persiste `spell_save_dc` (campo novo no form).

6. DM Notes (textarea de anotações do mestre) permanece disponível no card expandido ou em seção separada — não regredir feature existente.

7. Parity: Auth-only. Guest e Anon não têm acesso a personagens persistentes — sem mudança.

8. Testes existentes em `PlayerCharacterManager.test.tsx` continuam passando (ou são atualizados).

---

## Abordagem Técnica

### 1. Adicionar `spell_save_dc` ao `CharacterForm`

**`components/character/CharacterForm.tsx`:**
```typescript
interface CharacterFormData {
  // ... campos existentes ...
  spell_save_dc: string;  // add
}

// No onSave callback:
onSave: (data: {
  name: string; race: string | null; class: string | null;
  level: number; max_hp: number; ac: number; notes: string | null;
  spell_save_dc: number | null;  // add
}) => Promise<void>;
```

### 2. Atualizar `PlayerCharacterManager` para usar CharacterForm

```typescript
// Remover: renderForm() inline, addForm state, editForm state
// Adicionar: CharacterForm import, showAdd state (boolean), editingCharacter state

import { CharacterForm } from "@/components/character/CharacterForm";
import { CharacterCard } from "@/components/character/CharacterCard";

// No render: substituir cards inline por CharacterCard
{characters.map((character) => (
  <CharacterCard
    key={character.id}
    character={character}
    onClick={() => openEditForm(character)}
  />
))}

// CharacterForm para add e edit:
<CharacterForm
  open={showAdd || !!editingCharacter}
  onOpenChange={handleFormClose}
  character={editingCharacter}
  onSave={handleSaveCharacter}
/>
```

### 3. Manter DM Notes

DM Notes (`dm_notes`) permanece acessível — pode ser em accordion abaixo do card ou em um segundo dialog ao clicar em "Notas do DM".

### 4. Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `components/character/CharacterForm.tsx` | Adicionar `spell_save_dc` ao form e ao onSave callback |
| `components/dashboard/PlayerCharacterManager.tsx` | Substituir form inline por `CharacterForm` + cards por `CharacterCard` |
| `components/dashboard/PlayerCharacterManager.test.tsx` | Atualizar testes para novo fluxo |

---

## Plano de Testes

### Testes Manuais (obrigatórios)

1. **Criar personagem completo**
   - [ ] Clicar "+ Personagem" → abre dialog
   - [ ] Preencher nome, raça (dropdown), classe (dropdown), nível, HP, AC, notas
   - [ ] Salvar → card aparece com avatar placeholder, nome, subtítulo raça+classe

2. **Criar personagem mínimo**
   - [ ] Preencher só nome, HP, AC (obrigatórios)
   - [ ] Salvar → funciona, campos opcionais ficam vazios

3. **Editar personagem**
   - [ ] Clicar no card → dialog abre com dados preenchidos
   - [ ] Alterar nível e HP → salvar → card atualiza

4. **Spell Save DC**
   - [ ] Criar personagem com DC 15 → salvar → reabrir → DC 15 presente
   - [ ] Criar sem DC → salvar → funciona

5. **DM Notes não regride**
   - [ ] DM notes ainda acessíveis por personagem

6. **Regressão**
   - [ ] Remove/delete de personagem ainda funciona

---

## Notas de Paridade

- **Guest (`/try`):** Sem personagens persistentes. Sem mudança.
- **Anônimo (`/join`):** Sem personagens persistentes. Sem mudança.
- **Autenticado (DM logado):** Esta é a única surface afetada — `app/app/campaigns/[id]` → CampaignSections → PlayerCharacterManager.

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| CharacterForm não tem `spell_save_dc` | Adicionar campo antes de integrar |
| DM Notes regredir | Garantir que textarea de notas DM permaneça acessível no novo layout |
| Tests quebrarem | Atualizar `PlayerCharacterManager.test.tsx` junto com a mudança |

---

## Definição de Pronto

- [ ] `CharacterForm` tem `spell_save_dc` no form e no callback
- [ ] `PlayerCharacterManager` usa `CharacterForm` para criar e editar
- [ ] `PlayerCharacterManager` usa `CharacterCard` para listar personagens
- [ ] DM Notes não regrediram
- [ ] Testes manuais 1-6 passando
- [ ] `PlayerCharacterManager.test.tsx` atualizado e passando
