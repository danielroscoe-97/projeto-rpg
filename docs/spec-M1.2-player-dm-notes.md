# Spec M1.2 — Notas do Mestre por Jogador (dm_notes)

**Sprint:** M1 — Critical Fix + Quick Wins
**Tipo:** Feature
**Esforço estimado:** 3h
**Componentes:** DB migration, `PlayerCharacterManager.tsx`, campanha page

---

## Contexto

O mestre precisa anotar informações sobre cada jogador que persistem entre sessões:
- "Tem a espada amaldiçoada"
- "Deve 50gp ao ferreiro"
- "Perseguido pela guilda"

Hoje, `player_characters` tem campos estruturados (HP, AC, DC) mas nenhum campo de texto livre para o mestre.

## Solução

### 1. Migration — Adicionar campo `dm_notes`

```sql
-- migration: 029_player_character_dm_notes.sql
ALTER TABLE player_characters
ADD COLUMN dm_notes TEXT DEFAULT '';
```

**Decisão:** Campo único de texto livre. NÃO criar sistema de notas estruturadas (tags, categorias). Texto livre = menor carga cognitiva = mais uso.

### 2. UI — Textarea no PlayerCharacterManager

**No card de cada player character:**
- Abaixo dos campos HP/AC/DC
- Textarea com placeholder: "Notas do mestre sobre este jogador..."
- Auto-resize (min 2 linhas, max 6 linhas)
- Auto-save com debounce de 800ms
- Indicador sutil de "salvando..." / "salvo"
- Limite: 2000 caracteres (suficiente para notas rápidas)

**Layout mobile:**
- Textarea ocupa full-width
- Font size 16px (previne zoom automático no iOS)
- Padding confortável para digitação

### 3. Visibilidade durante combate (future-ready)

- O campo `dm_notes` NÃO aparece na player view (privado do DM)
- No futuro (Sprint M2), o quick-access drawer mostrará estas notas durante combate
- RLS: já protegido — apenas o DM (owner da campanha) pode ler/editar player_characters

## Schema

```typescript
// Atualizar lib/types/database.ts
interface PlayerCharacter {
  // ... campos existentes
  dm_notes: string; // NOVO
}
```

## Critérios de Aceite

- [ ] Campo `dm_notes` adicionado à tabela `player_characters`
- [ ] Textarea visível no card do jogador em `/app/campaigns/[id]`
- [ ] Auto-save funciona (digitar → pausa → salva automaticamente)
- [ ] Notas persistem entre page reloads
- [ ] Notas NÃO aparecem na player view
- [ ] Funciona bem no mobile (sem zoom, tamanho adequado)
- [ ] Type definitions atualizadas

## Arquivos a modificar

1. `supabase/migrations/029_player_character_dm_notes.sql` — nova migration
2. `components/dashboard/PlayerCharacterManager.tsx` — adicionar textarea
3. `lib/types/database.ts` — adicionar campo ao tipo

## Não fazer

- NÃO criar tabela separada de notas (overkill para V1)
- NÃO adicionar rich text / markdown (texto plano é suficiente)
- NÃO mostrar notas na player view
- NÃO adicionar categorias/tags (simplicidade primeiro)
