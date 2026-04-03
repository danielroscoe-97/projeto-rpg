# PHQ-E6-F15 — NPC Journal: Registro Pessoal de NPCs do Jogador

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Baixa
**Estimativa:** 3 SP
**Dependencia:** PHQ-E6-F14 (aba Notas existe), migration 061 (player_npc_notes)
**Arquivos principais:** `components/player-hq/NpcJournal.tsx` (novo), `hooks/useNpcJournal.ts` (novo), `supabase/migrations/061_player_npc_notes.sql` (novo)

---

## Resumo

O jogador conhece dezenas de NPCs ao longo de uma campanha — e frequentemente esquece quem e quem quando a sessao retorna semanas depois. "Aldric era o ferreiro ou o taberneiro? Ele era aliado ou suspeito?"

O NPC Journal e um **caderninho pessoal de NPCs** — cada jogador tem o seu. Diferente do Mapa Mental do DM (que e do ponto de vista do mestre), este e subjetivo: o jogador registra o que o seu personagem sabe e sente sobre cada NPC.

**Privacidade:** igualmente privado ao journal. DM nao ve. Isso permite que o jogador escreva "suspeito que Aldric e o assassino" sem alertar o DM.

---

## Decisoes de UX

**D1: NPC Journal como terceira sub-aba na aba Notas.** Sub-abas: "Rapidas", "Journal", "NPCs". Simples de acessar, mesmo contexto de anotacoes.

**D2: Card de NPC: nome + relacao + resumo.** Cada NPC tem: nome + badge de relacao (Aliado = verde, Inimigo = vermelho, Neutro = cinza, Desconhecido = amarelo) + primeiros 60 chars das notas.

**D3: Adicao rapida.** Botao "+". Campos: Nome (obrigatorio) + Relacao (dropdown com 4 opcoes, padrao "Desconhecido") + Notas (opcional, textarea). Salva em 1 tap.

**D4: Edicao inline.** Tap no card abre para edicao. Tap no badge de relacao alterna entre as 4 opcoes sem abrir dialog (rolodex de 4 posicoes — tap muda: ? → ✅ → ❌ → ○ → ?).

**D5: Busca por nome.** Campo de busca no topo da lista. Essencial quando ha 30+ NPCs ao longo da campanha.

**D6: Ordenacao por relacao.** Por padrao: Aliados primeiro, Inimigos segundo, Neutros terceiro, Desconhecidos por ultimo. Dentro de cada grupo: ordem alfabetica.

---

## Contexto Tecnico

### Migration 061

```sql
-- supabase/migrations/061_player_npc_notes.sql
CREATE TABLE player_npc_notes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_character_id  UUID NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
  campaign_id          UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  npc_name             TEXT NOT NULL,
  relationship         TEXT NOT NULL DEFAULT 'unknown'
    CHECK (relationship IN ('ally', 'enemy', 'neutral', 'unknown')),
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_npc_notes_character ON player_npc_notes(player_character_id);
CREATE INDEX idx_npc_notes_search    ON player_npc_notes(player_character_id, npc_name);

ALTER TABLE player_npc_notes ENABLE ROW LEVEL SECURITY;

-- Somente o proprio jogador ve suas notas de NPC (privacidade)
CREATE POLICY npc_notes_owner_only ON player_npc_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_characters
      WHERE id = player_character_id AND user_id = auth.uid()
    )
  );

CREATE TRIGGER set_npc_notes_updated_at
  BEFORE UPDATE ON player_npc_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Badges de relacao

```typescript
const RELATIONSHIP_CONFIG = {
  ally:    { label: 'Aliado',      color: 'bg-emerald-500', icon: '✅' },
  enemy:   { label: 'Inimigo',     color: 'bg-red-500',     icon: '❌' },
  neutral: { label: 'Neutro',      color: 'bg-gray-500',    icon: '○'  },
  unknown: { label: 'Desconhecido', color: 'bg-yellow-500',  icon: '?'  },
} as const;

const RELATIONSHIP_ORDER = ['ally', 'enemy', 'neutral', 'unknown'];
```

---

## Criterios de Aceite

### Lista de NPCs

1. Sub-aba "NPCs" na aba Notas.
2. NPCs exibidos em ordem: Aliados, Inimigos, Neutros, Desconhecidos.
3. Cada NPC: nome + badge colorido de relacao + preview das notas.
4. Campo de busca por nome no topo.
5. Empty state: "Nenhum NPC registrado. Adicione o primeiro personagem que seu personagem conhece!"

### Adicao de NPC

6. Botao "+" abre form inline: Nome + Relacao (dropdown) + Notas (opcional).
7. Nome obrigatorio, max 100 chars.
8. Salvar: NPC aparece na lista na posicao correta pelo tipo de relacao.

### Edicao

9. Tap no card abre para edicao completa.
10. Tap no badge de relacao: alterna entre as 4 opcoes (unknown → ally → enemy → neutral → unknown).
11. Notas: textarea editavel inline no card expandido.
12. Autosave de notas apos 1s de inatividade.

### Remocao

13. Menu de tres pontos no card: opcao "Remover NPC".
14. Confirmacao inline. Sem undo.

### Privacidade

15. RLS garante que DM nao ve notas de NPC dos jogadores.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `supabase/migrations/061_player_npc_notes.sql` | Criar | Tabela + RLS |
| `lib/types/database.ts` | Editar | Tipo PlayerNpcNote |
| `hooks/useNpcJournal.ts` | Criar | CRUD |
| `components/player-hq/NpcJournal.tsx` | Criar | Lista + form de adicao |
| `components/player-hq/NpcCard.tsx` | Criar | Card com badge + edicao |
| `app/(authenticated)/campaign/[id]/notes/page.tsx` | Editar | Adicionar sub-aba NPCs |
| `messages/pt-BR.json` | Editar | Strings de NPC journal |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. Adicionar "Aldric" como Desconhecido com nota "Ferreiro da cidade": aparece na lista.
2. Tap no badge "?": vira "Aliado" (verde).
3. Tap novamente: vira "Inimigo" (vermelho).
4. Buscar "ald": somente Aldric aparece.
5. Remover NPC: some da lista apos confirmacao.
6. Verificar via Supabase: DM nao consegue SELECT (RLS).
7. Ordenacao: Aliados aparecem antes de Inimigos.

---

## Definicao de Pronto

- [ ] Migration 061 com RLS privado
- [ ] useNpcJournal com CRUD
- [ ] NpcJournal com lista + busca + ordenacao por relacao
- [ ] Badge de relacao com toggle rapido
- [ ] Sub-aba "NPCs" na aba Notas
- [ ] Build sem erros
