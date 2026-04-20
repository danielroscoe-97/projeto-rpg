# Ações no Vercel — Pós Release 2026-04-20

> **Owner:** Dani_
> **Quando:** Imediatamente após confirmar que deploy de `master` passou verde
> **Tempo estimado:** 15-30 minutos (incluindo smoke tests)

---

## 1. Pré-validação do deploy atual

### 1.1 Confirmar que build passou

1. Acesse https://vercel.com/ → dashboard do projeto PocketDM
2. Verifique que o último deploy (commit recente em `master`) está com status **Ready** (verde)
3. Se estiver **Failed**: NÃO prossiga. Abra os logs, identifique o erro, me avise.

### 1.2 Smoke test no preview URL

Antes de ativar a flag, teste o deploy atual (com flag OFF) em `pocketdm.com.br`:

- [ ] `/app/dashboard` abre em <3s
- [ ] `/app/campaigns/[id]` abre em <3s com briefing novo (hero + today + atividade + pulso)
- [ ] Combate ativo numa campanha tem halo dourado
- [ ] `/app/campaigns/[id]?section=player-notes` (só DM) mostra inspector
- [ ] `/app/campaigns/[id]?section=npcs` ainda funciona (focus view)
- [ ] Player HQ tem sub-tab "Do mestre" em `PlayerNotesSection`
- [ ] Clicar card de NPC/Local/Facção abre detalhe em read-only
- [ ] NavBar antiga (horizontal direita) ainda aparece — **correto, flag OFF**

Se algum item falhar, **NÃO ative a flag**. Me avise qual item falhou.

---

## 2. Ativar Onda 2b (Sidebar Nova + Quick Switcher)

### 2.1 Adicionar variável de ambiente

1. Vercel → Settings → Environment Variables
2. Adicionar:
   - **Name:** `NEXT_PUBLIC_FEATURE_NEW_SIDEBAR`
   - **Value:** `true`
   - **Environments:** marcar **Preview** primeiro (não Production ainda)
3. Save

### 2.2 Criar deploy de preview

1. Redeploy do último commit de `master` (ou push qualquer commit trivial)
2. Aguardar deploy do Preview ficar **Ready**
3. Abrir URL de preview

### 2.3 Smoke test em Preview (flag ON)

- [ ] `/app/dashboard` mostra **sidebar à esquerda** (não a navbar top antiga)
- [ ] Sidebar colapsa com `Ctrl+B`
- [ ] `Ctrl+K` abre Quick Switcher com grupos: Ações, Campanhas, Personagens, Entidades, Notas (quando dentro de campanha), + SRD (monstros/spells/etc.)
- [ ] Atalhos de teclado:
  - `g` depois `d` → vai pra Dashboard
  - `g` depois `c` → vai pra Campanhas
  - `g` depois `p` → vai pra Personagens
  - `g` depois `s` → vai pra Compêndio
- [ ] **Não dispara** chord quando cursor está dentro de um `<input>` ou `<textarea>`
- [ ] Mobile (iPhone viewport): hamburger abre drawer lateral
- [ ] Dentro de `/app/campaigns/[id]`: sidebar mostra seção "Campanha atual" com NPCs/Locais/Facções/etc.
- [ ] Combate ativo: sidebar ainda funciona, combat page não quebra
- [ ] Guest (`/try`): **continua usando nav antiga** (não toca AppSidebar)
- [ ] Anon (`/join/{token}`): idem

### 2.4 Promover para Production (se preview OK)

1. Vercel → Settings → Environment Variables → editar `NEXT_PUBLIC_FEATURE_NEW_SIDEBAR`
2. Marcar também **Production**
3. Save
4. Redeploy production (ou push trivial)
5. Aguardar deploy production ficar **Ready**
6. Repetir smoke test em `pocketdm.com.br`

### 2.5 Rollback (se precisar)

Se algo quebrar em production após flag ON:

1. Vercel → Settings → Environment Variables → editar `NEXT_PUBLIC_FEATURE_NEW_SIDEBAR`
2. Mudar value pra `false` OU **deletar** a variável (default é OFF no código)
3. Redeploy
4. Nav antiga volta em ~30s

**Zero risco de data loss** — só UI muda.

---

## 3. Smoke tests manuais das outras ondas (pós-deploy master)

### 3.1 Onda 0 — Linguagem Ubíqua

- [ ] `/app/dashboard/campaigns` mostra "Combate" / "Histórico" nos labels (não "Sessão")
- [ ] Legacy URL `/app/session/[id]` redireciona pra `/app/combat/[id]` (status 307/308 em Network tab)
- [ ] SessionPlanner drawer ainda diz "Planejar Sessão" (preservado — correto)
- [ ] Login expirado: banner diz "Sua sessão expirou" (preservado)

### 3.2 Onda 1a — B04 Performance

- [ ] `/app/campaigns/[id]` em rede lenta (Chrome DevTools throttle Fast 3G): skeleton aparece <1s, conteúdo streams em ~2-3s
- [ ] `/app/dashboard` first load: <3s no P75

### 3.3 Onda 1b — Cards Interativos + SessionHistory CTA

- [ ] Dentro de campanha, seção Sessões: botão **"Planejar Sessão"** visível (DM only)
- [ ] Clicar em LocationCard/FactionCard/NpcCard/QuestCard abre detalhe em view mode (readOnly)
- [ ] Botão Edit dentro do detalhe flipa para edit mode
- [ ] Action buttons dos cards (Edit/Delete/Visibility): clicar NÃO abre o detalhe (stopPropagation OK)
- [ ] Mobile (375px): action buttons visíveis sem hover
- [ ] Teclado: Tab até um card, Enter abre detalhe; Tab até botão interno do card, Enter faz só a ação do botão (não abre detalhe)

### 3.4 Onda 2a — Dashboard Briefing

- [ ] Abrir campanha onboarded sem sessão → Hero + Today (empty) + Timeline (empty) + MindMap ("teia não tecida") + Pulse
- [ ] Com sessão agendada → Status badge "Próxima sessão" + countdown em Today
- [ ] Com combate ativo → Status badge vermelho "Em combate" + Today com halo dourado + CTA "Entrar"
- [ ] Atividade recente: últimos 5 updates (NPC/Local/Facção/Nota/Quest) com timestamp relativo, cada um clicável
- [ ] Teia viva: mini-grafo renderiza com 15 nós (se campanha tem ≥5 edges) ou fallback narrativo
- [ ] Pulse: 6 contadores + CampaignStatsBar

### 3.5 Onda 3a — Entity Graph (foundation invisível)

Backend deployado mas sem UI ainda. Verificar:
- [ ] Abrir Supabase dashboard → Table Editor → `campaign_mind_map_edges`: existe com constraint novo incluindo `headquarters_of`, `rival_of`, `family_of`, `mentions`
- [ ] `campaign_locations`: tentar criar um local cujo parent é ele mesmo → banco retorna erro "Location cannot be its own parent"
- [ ] Migrações 146, 147, 148 listadas em Supabase Migrations

### 3.6 Onda 4 — Player Notes Visibility

**Player HQ:**
- [ ] Abrir Player HQ → seção Notas tem sub-tab **"Do mestre"** (ícone Scroll)
- [ ] Em QuickNotes: cada quick note tem toggle de visibility (ícone Lock ↔ Eye)
- [ ] Clicar toggle: badge "Visível ao mestre" aparece/some
- [ ] Em JournalEntryCard (expanded): mesmo toggle disponível

**Campaign HQ (DM):**
- [ ] Dentro de campanha: NavBar mostra pill **"Notas dos Jogadores"** (ícone Scroll, DM-only)
- [ ] Click → PlayerNotesInspector agrupado por jogador
- [ ] Botão "Nova nota privada para [jogador]" → form com title + content + target
- [ ] Criar nota: toast de sucesso + nota aparece em "Enviado pelo mestre"

**RLS test crítico (validar em 2 abas):**
- [ ] Aba 1 (DM): criar nota `dm_private_to_player` para Player A
- [ ] Aba 2 (Player B, mesma campanha): verificar que **NÃO vê** a nota do Player A
- [ ] Aba 3 (Player A): verificar que **VÊ** a nota no DM Inbox

**Mig 150 sanity check (Supabase dashboard SQL):**
```sql
-- Deve retornar 0 linhas
SELECT id FROM campaign_notes 
WHERE visibility = 'dm_private_to_player' AND is_shared = true;

-- Deve retornar 0 linhas (mig 150 sync trigger)
SELECT id FROM campaign_notes 
WHERE visibility = 'campaign_public' AND is_shared = false;
```

### 3.7 Onda 5 — Auto-invite Combat

**Setup:** 2 browsers (ou 1 normal + 1 anônimo), 2 contas autenticadas, mesma campanha.

- [ ] Conta DM: em /app/campaigns/[id], clicar "Iniciar combate"
- [ ] Conta Player (logada em /app/dashboard ou qualquer /app/*): em <2s vê toast dourado "[DM name] iniciou o combate"
- [ ] Clicar "Entrar" no toast → navega pra combate, player já autenticado com character
- [ ] Player NÃO recebe toast se for o próprio DM que iniciou
- [ ] Fechar aba do Player antes de DM iniciar → ao reabrir: NotificationBell com badge + notificação listada
- [ ] DM iniciar Quick Combat (sem campanha): **NÃO dispara invite**
- [ ] DM iniciar + cancelar + iniciar + cancelar + iniciar em 5min → 4ª tentativa não cria duplicatas (rate limit)

---

## 4. Observabilidade pós-deploy (primeiras 48h)

### 4.1 Métricas a monitorar em Vercel Analytics

- **LCP em `/app/campaigns/[id]`** — alvo <2.5s (antes era 5-8s)
- **LCP em `/app/dashboard`** — alvo <2s
- **Erros 5xx em `/api/combat/invite/dispatch`** — deve ser <1% (rate-limit 429 NÃO conta como erro 5xx)
- **Erros 4xx em `/api/combat/invite/dispatch`** — normal ter 401 de guest tentando disparar

### 4.2 Queries Supabase a monitorar

No Supabase Dashboard → Database → Query Performance:

- **`campaign_mind_map_edges`** — INSERT não deve degradar (trigger scope guard)
- **`campaign_locations`** — UPDATE de `parent_location_id` deve ser <50ms (trigger anti-cycle)
- **`player_journal_entries`** — SELECT com nova RLS deve ser <100ms

### 4.3 Logs Supabase a monitorar

Procurar por:
- `"Cycle detected in location hierarchy"` — user tentando criar ciclo (esperado ocasional, não é bug)
- `"Edge endpoints must belong to campaign"` — tentativa de cross-campaign link (esperado ocasional)
- `"Location hierarchy exceeds max depth"` — só se user criar >20 níveis de aninhamento

### 4.4 Sinais de alerta (rollback)

Rollback (remover env var / redeploy anterior) se:

- ❌ LCP subir acima de 5s em `/app/campaigns/[id]` sustentadamente
- ❌ Erros 5xx > 2% em qualquer API crítica
- ❌ Combat parity quebrada (guest/anon não funcionando `/try` ou `/join`)
- ❌ RLS leak reportado (player vê notas privadas — cenário da mig 150 re-ocorrendo)
- ❌ `useCombatResilience` ou reconexão de player quebrar

**Não rollback por issues cosméticas** (i18n, copy, alinhamento) — fixar forward.

---

## 5. Comunicação pós-deploy

### 5.1 Ao beta tester (DM que reportou os 30 feedbacks)

Após smoke tests passarem, mandar mensagem:

> "Oi! A gente resolveu 30 dos 30 feedbacks que você reportou no beta test 3. Deploy acabou de sair. Principais:
> - Cards agora clicáveis (F15, F29)
> - Botão planejar sessão (F12)
> - Dashboard briefing "Hoje na sua mesa" (F10)
> - Sidebar à esquerda + Ctrl+K Quick Switcher (F13) — ativável via flag
> - DM lê notas dos jogadores + manda notas privadas (F01, F02)
> - Combate auto-invita players logados (F19)
> - Linguagem ubíqua corrigida (Combate/Histórico, não mais "sessão")
> - Campaign page 5-8s → <2s (B04)
> - + 3 bugs corrigidos (B01, B02, B03)
>
> Entity Graph (NPCs ↔ Locais ↔ Facções) — foundation no banco pronta, UI vem na próxima onda. Me fala se rodar algo estranho pra corrigir."

### 5.2 Changelog público (blog post ou release notes)

Seguir template de release anterior do projeto. Destaque em 3 linhas:

1. **Retenção e produtividade:** dashboard agora é briefing, não grid decorativo
2. **Colaboração DM-jogador:** notas com visibilidade configurável, combate convida automático
3. **Navegação moderna:** sidebar esquerda + Ctrl+K universal (opcional via flag)

---

## 6. Checklist executivo (uma linha)

- [ ] Build master verde no Vercel
- [ ] Smoke test pre-flag passou
- [ ] Flag `NEXT_PUBLIC_FEATURE_NEW_SIDEBAR=true` em Preview
- [ ] Smoke test Preview passou
- [ ] Flag em Production
- [ ] Smoke test Production passou
- [ ] Smoke tests das 8 ondas (§3) passaram
- [ ] Métricas em Vercel Analytics estáveis 24h
- [ ] Comunicar beta tester
- [ ] Changelog publicado (opcional)

---

## 7. Contato em caso de incident

- **Rollback de flag:** comando no §2.5 acima (30s de impacto)
- **Rollback de commit em master:** `git revert <hash>` + push — NUNCA force-push
- **RLS leak suspeito:** queries SQL em §3.6 + abrir incident

Se deploy quebrar o combate (sagrado), rollback imediato via Vercel → Deployments → redeploy versão anterior.
