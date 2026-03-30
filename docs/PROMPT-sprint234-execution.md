# Prompt: Execucao Sprints 2, 3 e 4 — Parallel Coding

> **Data:** 2026-03-30
> **Referencia:** [sprint-plan-2026-03-30.md](sprint-plan-2026-03-30.md)
> **Pre-requisito:** Sprint 1 completa (guest features, logo, OAuth, upsell)

---

## Instrucoes Gerais

Implemente as stories de Sprint 2, 3 e 4 conforme descrito abaixo. Cada sprint pode ser executada em paralelo por agents independentes. Siga estas regras:

### Regras de Codigo
- **i18n:** Toda string visivel em `messages/pt-BR.json` e `messages/en.json`. Zero texto hardcoded em componentes.
- **Tipos:** TypeScript strict. Sem `any` — defina interfaces para cada entidade.
- **Padroes existentes:** Leia `lib/types/`, `lib/stores/`, `components/` antes de criar algo novo. Use os mesmos patterns (Zustand, Supabase client, toast.error + Sentry).
- **RLS:** Toda tabela nova com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policies para owner, member, e anon.
- **Testes:** Jest para unitarios, Playwright para E2E. Minimo: 1 teste por CRUD operation + 1 teste por RLS policy.
- **Migrations:** Sequenciais (042_xxx.sql, 043_xxx.sql...). Conferir ultimo numero em `supabase/migrations/`.
- **Componentes:** Usar shadcn/ui (ja instalado), lucide-react para icones, framer-motion para animacoes.
- **HP Tiers:** Monstros SEMPRE usam LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%). NUNCA HP numerico para players.

### Regras de Commit
- Prefixo: `feat(sprint2):`, `feat(sprint3):`, `feat(sprint4):`
- Rodar `npx jest` + `npx tsc` antes de cada commit. Zero falhas.
- Nao quebrar testes existentes (716 pass, 48 suites).

---

## SPRINT 2 — Dashboard v2 & Campaign Core (~20h)

### Story 2.1: Redesign Dashboard com Sidebar (3-5 dias)

**Objetivo:** Transformar dashboard flat em navegacao por dominio.

**Estrutura de rotas:**
```
/app/dashboard          → Overview (campanhas ativas + combate em andamento)
/app/dashboard/campaigns → Lista + criar nova campanha
/app/dashboard/combats   → Sessoes ativas + historico
/app/dashboard/soundboard → Biblioteca de audio (DmSoundboard existente)
/app/dashboard/settings  → Perfil + preferencias
```

**Componentes a criar:**
- `components/dashboard/DashboardSidebar.tsx` — sidebar fixa com icones RPG (lucide: Swords, ScrollText, Music, Settings)
- `components/dashboard/DashboardLayout.tsx` — layout com sidebar + area principal
- `components/dashboard/CampaignCard.tsx` — card de campanha (nome, membros, ultimo combate)
- `components/dashboard/CombatHistoryCard.tsx` — card de sessao (nome, data, status)
- `components/dashboard/QuickActions.tsx` — barra de acoes rapidas ("Novo Combate", "Criar NPC", "Convidar")

**Refatorar:** `components/dashboard/DashboardContent.tsx` existente — extrair logica em sub-componentes.

**Mobile:** Sidebar vira bottom nav (4 tabs).

**AC:**
- [ ] Sidebar com 4 secoes navegaveis
- [ ] Cards responsivos na area principal
- [ ] Quick actions funcionais (novo combate → /app/session/new)
- [ ] Bottom nav no mobile
- [ ] i18n completo (PT-BR + EN)

---

### Story 2.2: Notas com Pastas (2 dias)

**Objetivo:** Organizar notas do GM em pastas, diferenciar privadas vs compartilhadas.

**Migration `042_campaign_note_folders.sql`:**
```sql
CREATE TABLE campaign_note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES campaign_note_folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE campaign_note_folders ENABLE ROW LEVEL SECURITY;

-- Add folder_id and is_shared to existing campaign_notes
ALTER TABLE campaign_notes ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES campaign_note_folders(id) ON DELETE SET NULL;
ALTER TABLE campaign_notes ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;
```

**Componentes:**
- `components/campaign/NotesFolderTree.tsx` — tree view com drag-and-drop (ja tem framer-motion)
- Evoluir `components/campaign/CampaignNotes.tsx` — adicionar toggle privada/compartilhada, selector de pasta
- Badge visual: icone cadeado (privada) vs olho (compartilhada)

**RLS:** Player member ve apenas notas com `is_shared = true`. DM ve todas.

**AC:**
- [ ] GM cria pastas e move notas entre pastas
- [ ] Toggle privada/compartilhada por nota
- [ ] Player ve apenas notas compartilhadas
- [ ] Visual distinto (cadeado vs olho)

---

### Story 2.3: CRUD de NPCs na Campanha (2 dias)

**Objetivo:** GM registra NPCs com stats basicos, toggle visibilidade para players.

**Migration `043_campaign_npcs.sql`:**
```sql
CREATE TABLE campaign_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stats JSONB DEFAULT '{}',
  avatar_url TEXT,
  is_visible_to_players BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE campaign_npcs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_campaign_npcs_campaign ON campaign_npcs(campaign_id);
```

**Componentes:**
- `components/campaign/NpcList.tsx` — grid/lista de NPCs com avatar, nome, stats
- `components/campaign/NpcForm.tsx` — form de criacao/edicao (dialog/sheet)
- `components/campaign/NpcCard.tsx` — card individual com stats resumidos

**Stats JSONB:** `{ hp: number, ac: number, initiative_mod: number, cr: string, notes: string }`

**AC:**
- [ ] GM cria/edita/deleta NPCs
- [ ] Toggle visibilidade pro player
- [ ] Stats basicos editaveis (HP, AC, CR)
- [ ] Avatar opcional
- [ ] RLS: apenas owner da campanha pode CRUD, member ve NPCs visiveis

---

### Story 2.4: Icones RPG na Landing Page (1 dia)

**Objetivo:** Substituir emojis por SVGs game-icons.net (CC BY 3.0).

**Arquivo:** `app/page.tsx` (FeaturesSection, ~linhas 264-305)

**Mapeamento:**
| Secao | Emoji | SVG |
|-------|-------|-----|
| Combat Tracker | sword | `Swords` (lucide) |
| Player View RT | smartphone | `Smartphone` (lucide) |
| Oraculo Magias | sparkles | `Sparkles` (lucide) |
| Regras SRD | book-open | `BookOpen` (lucide) |
| Salvar & Retomar | save | `Save` (lucide) |
| Dark Mode | moon | `Moon` (lucide) |

**Estilo:** Icones gold/amber (`text-amber-400`) no tema dark, com container circular `bg-amber-400/10 rounded-full p-3`.

**AC:**
- [ ] Todos os emojis substituidos por icones lucide-react
- [ ] Estilo gold/amber consistente
- [ ] Responsivo (tamanho ajusta no mobile)

---

## SPRINT 3 — Personagens & Engajamento (~20h)

### Story 3.1: Criacao de Personagem Simplificada (3 dias)

**Objetivo:** Form simples de 1 tela para personagem essencial (NAO ficha completa).

**Migration `044_player_characters_extended.sql`:**
```sql
ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS race TEXT;
ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS class TEXT;
ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
```

**Componentes:**
- `components/character/CharacterForm.tsx` — form com: Nome, Raca (select SRD), Classe (select SRD), HP, AC, Notas
- `components/character/CharacterCard.tsx` — card resumido para listas
- Dados de raca/classe: extrair de `public/srd/` existente, ou criar `lib/data/races.ts` + `lib/data/classes.ts` com opcoes SRD 5e

**Fluxo:** Dashboard > Campanha > "Criar Personagem" → form → salva em player_characters

**AC:**
- [ ] Form de 1 tela com campos essenciais
- [ ] Select de raca e classe com opcoes SRD 5e (2014 + 2024)
- [ ] Personagem vinculado a campanha
- [ ] i18n de todos os labels

---

### Story 3.2: Player Token Upload (2 dias)

**Objetivo:** Jogador faz upload de foto como token personalizado.

**Supabase Storage:** Bucket `player-avatars` (ja existe `player-audio`, seguir mesmo padrao)

**Componentes:**
- `components/character/TokenUpload.tsx` — upload + preview com crop circular
- Reutilizar pattern de `components/audio/AudioUploadManager.tsx` para upload logic

**Fluxo:**
1. Jogador clica no avatar do personagem
2. Abre dialog com dropzone (drag-and-drop)
3. Preview com borda estilizada (ring dourado como tokens de monstro)
4. Upload para Supabase Storage
5. URL salva em `player_characters.token_url`

**AC:**
- [ ] Upload funcional com preview
- [ ] Crop circular automatico
- [ ] Borda estilizada (gold ring)
- [ ] Token aparece no combate

---

### Story 3.3: Gestao de Membros da Campanha (2 dias)

**Objetivo:** UI completa para gerenciar membros da campanha.

**Componentes:**
- `components/campaign/MembersList.tsx` — lista de membros com role, status, personagem, token
- `components/campaign/InviteMember.tsx` — modal com link de convite (ja existe lógica em `campaign_invites`)
- `components/campaign/MemberCard.tsx` — card com avatar, nome, role badge, personagem vinculado

**Funcionalidades:**
- Ver todos os membros (role, status, ultimo acesso)
- Copiar link de convite (reutilizar ShareSessionButton pattern)
- Remover membro (soft delete com confirmacao)
- Ver token/avatar do jogador

**AC:**
- [ ] Lista de membros com roles e status
- [ ] Convite por link funcional
- [ ] Remover membro com confirmacao
- [ ] Responsivo (mobile stack, desktop grid)

---

### Story 3.4: Ligar Notas com NPCs (1 dia)

**Objetivo:** Criar rede de contexto entre notas e NPCs.

**Migration `045_note_npc_links.sql`:**
```sql
CREATE TABLE note_npc_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES campaign_notes(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES campaign_npcs(id) ON DELETE CASCADE,
  UNIQUE(note_id, npc_id)
);
ALTER TABLE note_npc_links ENABLE ROW LEVEL SECURITY;
```

**UI:** Chip/tag selector no form de nota para linkar NPCs. No card de NPC, listar notas relacionadas.

**AC:**
- [ ] GM linka NPC a nota via tag selector
- [ ] Ao abrir NPC, ve notas relacionadas
- [ ] Ao abrir nota, ve NPCs linkados

---

### Story 3.5: Perfil de Usuario Melhorado (1 dia)

**Objetivo:** Pagina de perfil com avatar, info do plano, settings.

**Rota:** `/app/dashboard/settings` (ja planejada no Sprint 2.1)

**Componentes:**
- `components/settings/UserProfile.tsx` — avatar, nome, email, plano
- `components/settings/SettingsForm.tsx` — preferencias (idioma, tema, notificacoes)

**AC:**
- [ ] Avatar (upload ou Gravatar fallback)
- [ ] Info do plano (free/trial/pro)
- [ ] Settings funcionais (idioma, tema)

---

## SPRINT 4 — Mind Map & Polish (~15h)

### Story 4.1: Mind Map Basico da Campanha (3 dias)

**Objetivo:** Visualizacao em grafo dos elementos da campanha.

**Lib:** `@xyflow/react` (ex-reactflow) — verificar se ja esta no package.json, senao instalar.

**Componentes:**
- `components/campaign/CampaignMindMap.tsx` — wrapper do ReactFlow
- `components/campaign/nodes/CampaignNode.tsx` — no central (campanha)
- `components/campaign/nodes/NpcNode.tsx` — no de NPC
- `components/campaign/nodes/NoteNode.tsx` — no de nota
- `components/campaign/nodes/PlayerNode.tsx` — no de jogador

**Dados:** Query todas as entidades da campanha (NPCs, notas, membros, sessoes) e gerar nos + edges automaticamente a partir das relacoes existentes (campaign_id, note_npc_links, etc).

**Layout:** dagre layout automatico (hierarquico). Campanha no centro, entidades ao redor.

**AC:**
- [ ] Grafo renderiza com todos os elementos
- [ ] Click em no abre detalhe (sheet/dialog)
- [ ] Layout automatico hierarquico
- [ ] Responsivo (pan/zoom no mobile)

---

### Story 4.2: Google Login em Pontos Estrategicos (1 dia)

**Objetivo:** Botao Google OAuth consistente em todos os touchpoints de conversao.

**Locais:**
1. Landing page CTA principal
2. Guest combat share flow
3. Guest banner "Salve seu progresso"
4. Todos os upsell modals

**Componente:** Reutilizar `GoogleOAuthButton` existente (ver `GuestUpsellModal`)

**AC:**
- [ ] Botao Google visivel em todos os 4 locais
- [ ] Redirect correto apos login (volta pra onde estava)
- [ ] Visual consistente (mesmo componente em todos)

---

### Story 4.3: Polish Geral (2-3 dias)

**Itens:**
1. **Responsividade:** Testar novo dashboard em viewports 375px, 768px, 1024px, 1440px
2. **Loading states:** Skeleton components para cards de campanha, NPC, membro
3. **Empty states:** Ilustracao + CTA quando lista esta vazia ("Crie sua primeira campanha")
4. **Transicoes:** framer-motion `AnimatePresence` em modals, sheets, e route transitions
5. **i18n audit:** Verificar que TODAS as strings novas estao em pt-BR e en

**AC:**
- [ ] Zero text hardcoded nos novos componentes
- [ ] Skeletons em todas as listas (campanhas, NPCs, membros, notas)
- [ ] Empty states com CTAs uteis
- [ ] Testes visuais basicos (screenshot compare opcional)

---

## Dependencias entre Sprints

```
Sprint 2.1 (Dashboard) ─────────────────────────────────> Sprint 4.3 (Polish)
Sprint 2.2 (Notas) ──────> Sprint 3.4 (Notas↔NPCs) ──> Sprint 4.1 (Mind Map)
Sprint 2.3 (NPCs) ───────> Sprint 3.4 (Notas↔NPCs) ──> Sprint 4.1 (Mind Map)
Sprint 3.1 (Personagens) ─> Sprint 3.2 (Token Upload) ─> Sprint 3.3 (Membros)
Sprint 3.3 (Membros) ─────────────────────────────────> Sprint 4.1 (Mind Map)
```

**Paralelismo possivel:**
- Sprint 2.1 + 2.2 + 2.3 + 2.4 podem rodar em paralelo
- Sprint 3.1 + 3.5 podem rodar em paralelo com Sprint 2
- Sprint 3.2 depende de 3.1
- Sprint 3.3 pode rodar com 3.1 em paralelo
- Sprint 3.4 depende de 2.2 + 2.3
- Sprint 4.1 depende de 2.2 + 2.3 + 3.3 + 3.4
- Sprint 4.2 e 4.3 podem rodar em paralelo

---

## Checklist Final (por Sprint)

Para cada sprint, antes de marcar como concluida:

- [ ] `npx jest` — 0 falhas (716+ testes)
- [ ] `npx tsc` — 0 erros
- [ ] i18n completo (pt-BR + en)
- [ ] RLS policies em todas as tabelas novas
- [ ] Migrations sequenciais e corretas
- [ ] Responsivo (mobile + desktop)
- [ ] Commit com mensagem descritiva
