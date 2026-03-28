# Discovery — Mobile Bugs + Módulo de Campanhas

**Data:** 2026-03-28
**Fonte:** Transcrição de áudios do Daniel (Product Owner)
**Agentes:** Architect, UX Designer, PM

---

## 1. Inventário de Problemas & Features (Transcrição Classificada)

### 🔴 BUG CRÍTICO — Oracle Modal não fecha no Mobile

**Transcrição:**
> "Um bug crítico é que o perguntar no oráculo no mobile não tem como sair da pergunta quando você clica fora pra tentar sair não sai"

**Classificação:** Bug — Severidade P0 (bloqueia uso mobile)
**Componente afetado:** `OracleAIModal.tsx`
**Análise técnica:**
- O `OracleAIModal` usa backdrop com `onClick={handleDismiss}` (linha ~191)
- No mobile, o botão ESC fica `hidden md:inline-flex` — não há forma visual de fechar
- O backdrop click pode estar sendo interceptado por eventos de touch/scroll no mobile
- Z-index stack: backdrop=10001, modal=10002 — o backdrop pode não receber o tap
- **Causa provável:** O modal content container captura o tap antes do backdrop, ou há um `stopPropagation` implícito. No mobile sem ESC key, o usuário fica preso.

---

### 🟡 FEATURE — Módulo de Campanhas & Gerenciar Jogadores

**Transcrição:**
> "Eu quero que a gente comece a trabalhar no módulo de campanhas e gerenciar jogadores. É porque o gerenciar jogadores ali ele tem que ser um botão menu rápido gerenciar jogadores né pra ele conseguir linkar um jogador com o usuário enfim fazer o convite por e-mail já esse tipo de coisa pros jogadores e conseguir colocar vida AC essas coisas"

**Classificação:** Feature — Prioridade Alta (Tier 1 do roadmap)
**Estado atual:**
- ✅ Campaign CRUD existe (`CampaignManager.tsx`)
- ✅ Player character CRUD existe (`PlayerCharacterManager.tsx`)
- ✅ Invite por email existe (`InvitePlayerDialog.tsx` + migration 025)
- ✅ Link player→user existe (migration 027 — campo `user_id`)
- ✅ HP, AC, Spell DC já são editáveis
- ❌ Falta: acesso rápido (quick menu) durante combate
- ❌ Falta: notas do mestre por jogador
- ❌ Falta: UX mobile otimizada para gerenciamento

**Gap Analysis:**
| O que Daniel pediu | Estado atual | Gap |
|---|---|---|
| Botão menu rápido "gerenciar jogadores" | Existe via `/app/campaigns/[id]` mas requer navegação | Precisa de quick-access durante sessão/combate |
| Linkar jogador com usuário | ✅ `user_id` em `player_characters` + invite flow | Funcional, pode precisar de polish |
| Convite por email | ✅ `InvitePlayerDialog` + API route | Funcional |
| Colocar HP/AC | ✅ `PlayerCharacterManager` | Funcional |
| Notas por jogador | ❌ Não existe | **NOVO** — campo de texto livre por player_character |

---

### 🟡 FEATURE — Editar Campanha (Expansão)

**Transcrição:**
> "Na hora de editar a campanha eu acho que a gente poderia colocar algumas notas dos jogadores, notas de sessão. O mestre poderia conseguir subir alguns presets de efeitos sonoros que vão aparecer nos combates pra aquela campanha, talvez deixar ali algumas imagens, notas da sessão, notas do combate, trazer os analytics dos últimos combates finalizados dentro daquela campanha com os personagens daquela campanha, ter esse histórico ali, carregar um dashboard pro mestre por campanha."

**Classificação:** Feature — Múltiplos sub-itens, Tiers 1-3

**Decomposição e priorização:**

| Sub-feature | Tier | Complexidade | Valor para retenção |
|---|---|---|---|
| Notas do mestre por jogador | 1 | Baixa | 🔥 Alta — lock-in |
| Notas de sessão na campanha | 1 | Baixa | 🔥 Alta — ritual semanal |
| Quick-access a players durante combate | 1 | Média | 🔥 Alta — fluidez |
| Histórico de combates por campanha | 2 | Média | Média — contexto |
| Dashboard/analytics por campanha | 2 | Alta | Média — engajamento |
| Soundboard (presets de áudio) | 2 | Alta | Média — imersão |
| Upload de imagens por campanha | 3 | Média | Baixa — nice-to-have |

---

## 2. Mapeamento Técnico

### 2.1 Bug — Oracle Modal Mobile (P0)

**Arquivos envolvidos:**
- `components/oracle/OracleAIModal.tsx` — modal principal
- `components/oracle/CommandPalette.tsx` — mesmo padrão de backdrop

**Root cause analysis:**

O modal tem esta estrutura:
```
<div backdrop onClick={handleDismiss} z-[10001]>
<div modal-container z-[10002]>
  <div modal-content>
    ...input, response, etc...
  </div>
</div>
```

No mobile:
1. Não há botão de fechar visível (ESC hint é `hidden md:inline-flex`)
2. O backdrop click pode funcionar, MAS o modal content preenche quase toda a viewport mobile, deixando pouquíssima área de backdrop exposta
3. Se o teclado virtual estiver aberto, pode cobrir o backdrop completamente

**Fix proposto:**
1. Adicionar botão "✕" visível no mobile (top-right do modal)
2. Garantir que tap no backdrop funciona (verificar touch event handling)
3. Considerar swipe-down para dismiss (padrão mobile nativo)

**Esforço:** 1-2 horas

---

### 2.2 Feature — Notas do Mestre por Jogador

**Schema change:**
```sql
ALTER TABLE player_characters
ADD COLUMN dm_notes TEXT DEFAULT '';
```

**Componente:**
- Adicionar campo de texto no `PlayerCharacterManager.tsx`
- Textarea com auto-save (debounce 500ms)
- Visível apenas para o DM (RLS já garante)

**Esforço:** 2-4 horas

---

### 2.3 Feature — Quick-Access a Players durante Combate

**Opções de UX:**

**Opção A — Drawer lateral (recomendada)**
- Botão "👥 Players" na toolbar do combate
- Abre drawer com lista de PCs da campanha
- Mostra: nome, HP atual, AC, notas rápidas
- Permite editar notas inline

**Opção B — Modal overlay**
- Similar ao Oracle AI modal
- Menos ideal pois compete com o espaço do combate

**Opção C — Tab no combat tracker**
- Tab "Players" ao lado da lista de combatentes
- Mistura conceitos (combatentes vs. personagens persistentes)

**Recomendação:** Opção A — drawer lateral, padrão mobile nativo, não compete com combate

**Esforço:** 4-6 horas

---

### 2.4 Feature — Notas de Sessão na Campanha

**Estado atual:**
- `session_notes` table já existe (migration 023)
- Vinculada a `sessions`, não a `campaigns`
- Uma nota por DM por sessão

**Expansão necessária:**
- Na tela de campanha, listar notas de sessões anteriores
- Permitir criar notas livres vinculadas à campanha (não apenas sessão)

**Schema:**
```sql
CREATE TABLE campaign_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  title TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Esforço:** 4-6 horas

---

### 2.5 Feature — Histórico de Combates por Campanha

**Estado atual:**
- `sessions` tem `campaign_id` (migration 007)
- `encounters` vinculadas a sessions
- `combatants` vinculados a encounters
- Dados já existem, falta UI de consulta

**Implementação:**
- Na tela da campanha, seção "Combates anteriores"
- Lista encounters finalizadas (is_active=false) da campanha
- Para cada: data, nome, round final, combatentes
- Stats agregados: total rounds, total damage, kills

**Esforço:** 6-8 horas

---

### 2.6 Feature — Dashboard/Analytics por Campanha

**Dados disponíveis:**
- Número de sessões
- Combates finalizados
- HP total perdido/curado
- Crits, kills, KOs por personagem
- Rounds médios por combate

**Implementação:**
- Cards de stats na tela da campanha
- Queries agregadas no Supabase
- Gráficos simples (barras/linhas) com dados por sessão

**Esforço:** 8-12 horas (Tier 2)

---

### 2.7 Feature — Soundboard por Campanha

**Conceito:**
- DM faz upload de arquivos de áudio curtos
- Organizados por campanha
- Disponíveis durante combate para tocar
- Opcionalmente transmitidos para player view

**Schema:**
```sql
CREATE TABLE campaign_audio_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT DEFAULT 'sfx', -- sfx, ambient, music
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Esforço:** 12-16 horas (Tier 2, inclui upload + player + UI)

---

## 3. Sprint Plan

### Sprint M1 — Critical Fix + Quick Wins (1-2 dias)

| # | Item | Tipo | Esforço | Prioridade |
|---|---|---|---|---|
| M1.1 | Fix Oracle Modal dismiss no mobile | Bug P0 | 2h | 🔴 Crítico |
| M1.2 | Notas do mestre por jogador (dm_notes) | Feature | 3h | Alta |
| M1.3 | Botão fechar visível no CommandPalette mobile | Bug P1 | 1h | Alta |

**Entregável:** Oracle funcional no mobile + notas por jogador

---

### Sprint M2 — Campaign Experience (3-5 dias)

| # | Item | Tipo | Esforço | Prioridade |
|---|---|---|---|---|
| M2.1 | Quick-access a players durante combate (drawer) | Feature | 6h | Alta |
| M2.2 | Notas de campanha (campaign_notes) | Feature | 5h | Alta |
| M2.3 | Histórico de combates na campanha | Feature | 8h | Média |
| M2.4 | Polish da tela de campanha (layout, UX) | UX | 4h | Média |

**Entregável:** Tela de campanha como hub do mestre

---

### Sprint M3 — Engagement & Analytics (5-7 dias)

| # | Item | Tipo | Esforço | Prioridade |
|---|---|---|---|---|
| M3.1 | Dashboard/analytics por campanha | Feature | 10h | Média |
| M3.2 | Soundboard por campanha | Feature | 14h | Média |
| M3.3 | Upload de imagens por campanha | Feature | 6h | Baixa |

**Entregável:** Campanha como plataforma completa do mestre

---

## 4. Decisões de Arquitetura

### Princípios seguidos:
1. **Simplicidade sobre completude** — notas são texto livre, não formulários
2. **Mobile-first** — drawer lateral, botões de toque 44px+
3. **Dados existentes** — reutilizar schema existente onde possível
4. **Lock-in saudável** — cada nota é um motivo para voltar
5. **Não competir com D&D Beyond** — visão do mestre, não ficha do jogador

### Trade-offs:
- **campaign_notes vs session_notes:** Criamos tabela separada para notas de campanha porque têm ciclo de vida diferente (persistem, não vinculadas a uma sessão específica)
- **Quick-access drawer vs tab:** Drawer mantém o combate visível, tab esconde
- **Soundboard scope:** Tier 2 porque requer upload de arquivos e player sync, complexidade alta para impacto moderado

---

## 5. Riscos Identificados

| Risco | Impacto | Mitigação |
|---|---|---|
| Oracle fix pode ter side-effects no desktop | Médio | Testar em ambas viewports |
| Notas longas podem impactar performance mobile | Baixo | Limitar a 2000 chars, virtualizar se necessário |
| Soundboard pode ter problemas de autoplay no mobile | Alto | Browsers bloqueiam autoplay — requer user gesture |
| Histórico de combates com muitos dados pode ser lento | Médio | Paginação + query otimizada com índices |

---

*Documento gerado por: PM + Architect + UX Designer (party mode)*
*Próximo passo: Implementar Sprint M1 (Critical Fix + Quick Wins)*
