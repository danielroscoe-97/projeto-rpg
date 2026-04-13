# Sprint 3 Execution Report: DM Campaign Journey v2 — Polish & Safety

**Data:** 2026-04-10
**Epic:** `docs/epic-dm-campaign-journey-v2.md`
**Sprint Plan:** `docs/sprint-plan-dm-journey-2026-04-10.md`
**Commit:** `e77bbd3 feat(campaign): Sprint 3 — Polish & Safety (archive, max players, expiry, UX)`
**Status:** COMPLETO — tsc --noEmit PASS, code review 8/8 corrigido

---

## O Que Foi Implementado

### DJ-D1: Campaign Archive / Soft Delete (Agent 3A)

**Problema:** Delete de campanha era nuclear — cascadeava tudo sem aviso, sem undo.
**Solucao:** Sistema de archive em 3 camadas (archive → restore → delete permanente).

| Arquivo | Acao | Detalhes |
|---------|------|----------|
| `components/campaign/CampaignArchiveDialog.tsx` | NOVO | Dialog com 3 modos. Delete exige digitar nome. Volume warning (sessions/encounters/notes). |
| `components/dashboard/CampaignManager.tsx` | EDIT | Kebab menu: Edit/Archive/Delete. Toggle "Mostrar Arquivadas (N)". Cards arquivados com opacity-50. Empty state diferenciado quando tudo arquivado. |
| `app/app/dashboard/campaigns/page.tsx` | EDIT | Fetch `is_archived` do DB pra enviar ao CampaignManager. |

**Decisoes de design:**
- Archive usa `is_archived: true` + `archived_at` (timestamp). Migration ja existia do Sprint 1 (121).
- Campanhas arquivadas somem do dashboard por default, mas DM pode togglear.
- Restore reverte `is_archived: false` + `archived_at: null`.
- Delete permanente exige digitar nome exato — protecao contra clique acidental.
- Volume warning: "Esta campanha tem X sessoes, Y encontros e Z notas" — DM decide consciente.

---

### DJ-D2: Max Players Enforcement (Agent 3B)

**Problema:** `max_players` existia no DB mas o frontend nao checava. Campanha podia aceitar infinitos jogadores.
**Solucao:** Check triplo — server-side na page, server-side na action, e client-side na toast.

| Arquivo | Acao | Detalhes |
|---------|------|----------|
| `app/api/campaign/[id]/join-link/route.ts` | EDIT | GET retorna `current_players` e `max_players` junto com o link. |
| `app/join-campaign/[code]/page.tsx` | EDIT | Check server-side ANTES da auth: "campanha cheia" com mensagem amigavel. |
| `components/campaign/JoinCampaignClient.tsx` | EDIT | i18n na mensagem "Campanha cheia" (era hardcoded). |

**Decisoes de design:**
- Check no join page acontece ANTES da auth — melhor UX: player descobre que esta cheio sem precisar criar conta.
- A action `acceptJoinCodeAction` JA checava `max_players` (Sprint 1), entao o backend estava ok. Sprint 3 adicionou o frontend.
- API retorna contagem pra DM poder ver "3/10 players" no InvitePlayerDialog (futuro).

---

### DJ-D3: Join Code Expiration (Agent 3C)

**Problema:** Join codes nunca expiravam. Link vazado ficava ativo pra sempre.
**Solucao:** Expiracao configuravel com 4 opcoes + check server-side.

| Arquivo | Acao | Detalhes |
|---------|------|----------|
| `app/api/campaign/[id]/join-link/route.ts` | EDIT | GET retorna `expires_at`. POST (regenerate) seta 30 dias automaticamente. |
| `app/join-campaign/[code]/page.tsx` | EDIT | Check server-side de expiracao. Mensagem: "Este link expirou. Peca um novo ao Mestre." |
| `components/campaign/InvitePlayerDialog.tsx` | EDIT | Mostra "Expira em X dias" abaixo do link. Atualiza ao renovar. |
| `components/campaign/CampaignSettings.tsx` | EDIT | Select de expiracao (7d/30d/90d/Never) com auto-save. |

**Decisoes de design:**
- Coluna `join_code_expires_at` ja existia em `campaign_settings` (Sprint 1 migration 119).
- Default: 30 dias. DM pode mudar em Settings.
- Expiracao usa data absoluta no DB, nao relativa — mais confiavel.
- **Bug fix importante (CR-04):** A expiracao so recalcula quando o SELECT muda, nao em QUALQUER auto-save. Sem isso, editar o nome da campanha resetava a expiracao pra 30 dias a partir de agora.
- O derivar da option a partir da data salva usa buckets aproximados (<=10d → 7d, <=60d → 30d, else → 90d, null → never).

---

### DJ-D4: Combat Launch UX Improvement (Agent 3D)

**Problema:** CombatLaunchSheet tinha 3 paths sem explicacao. DM novo nao sabia a diferenca.
**Solucao:** Descricoes claras, opcao de sessao planejada, e reordenacao.

| Arquivo | Acao | Detalhes |
|---------|------|----------|
| `components/campaign/CombatLaunchSheet.tsx` | EDIT | Nova opcao "Iniciar Sessao: [nome]" highlighted quando ha sessao planejada. Descricoes melhoradas. Preset antes de Quick Combat. |
| `messages/pt-BR.json` + `en.json` | EDIT | Novos textos descritivos para todos os paths. |

**Mudancas visuais:**
- Se tem sessao planejada → "Iniciar Sessao: [nome]" como primeira opcao, com borda amber highlighted.
- "Novo Combate" → "Configure monstros e inicie do zero" (antes: generico)
- "Carregar Preset" → "Use um encontro que voce ja preparou" (antes: generico)
- "Combate Rapido" → "Pule a selecao de campanha, va direto pro combate" (antes: generico)
- Reordenado: Preset agora vem antes de Quick Combat (mais provavel de ser usado por DM experiente).

---

### DJ-D5 + DJ-B3: Quick Actions Contextuais + Session-First Hero (Agent 3E)

**Problema:** Hero era KPI-centric (3 numeros). Quick actions eram genericos independente do estado da campanha.
**Solucao:** Hero session-first + quick actions adaptivos.

| Arquivo | Acao | Detalhes |
|---------|------|----------|
| `app/app/campaigns/[id]/CampaignHero.tsx` | EDIT | Hero redesigned com subtitle session-first. Quick actions contextuais. Enter session button. |

**Hero Session-First:**
- **Sessao ativa:** Subtitle com pulse amber "Sessao em andamento: [nome]" + botao "Entrar na sessao ativa" em destaque.
- **Sessao planejada:** Subtitle emerald "Proxima sessao: [nome]" + NextSessionCard em destaque.
- **Nenhuma sessao:** Subtitle fallback (como antes).
- Health badge e KPI cards movidos para posicao secundaria (abaixo do session hero content).

**Quick Actions Contextuais:**
- `primaryAction` calculado com base no estado:
  - `playerCount === 0` → **"Convide seus jogadores"** (highlighted amber com ring)
  - `encounters === 0 && players > 0` → **"Crie seu primeiro encontro"** (highlighted)
  - `sessions === 0 && encounters > 0` → **"Inicie sua primeira sessao"** (highlighted)
  - `default` → Quick actions padrao (Plan Session, Combat, Encounter, Note, NPC)
- Botao standard de "Encounters" escondido quando o CTA primario ja e "create_encounter" (evita duplicata — CR-05).

---

## Code Review — 8 Issues Encontrados e Corrigidos

| # | Sev | Arquivo | Issue | Fix |
|---|-----|---------|-------|-----|
| CR-01 | BUG | CampaignArchiveDialog | `Button` importado mas nao usado | Removido import |
| CR-02 | BUG | CampaignManager | `captureError` e `toast` importados sem uso (handleDelete removido) | Removidos imports |
| CR-03 | **BUG** | join-link POST | `Promise.all` so checava erro do 1o resultado — settings upsert fail era silencioso | Agora checa ambos os erros |
| CR-04 | **BUG** | CampaignSettings | Expiry recalculava `join_code_expires_at` em TODA auto-save (nome, level, etc.) | `lastSavedExpiryRef` — so recalcula quando select muda |
| CR-05 | UX | CampaignHero | Botao "Encounters" duplicado quando primaryAction === "create_encounter" | Escondido com condicional |
| CR-06 | UX | CampaignArchiveDialog | `createClient()` recriado em cada render | Memoizado com `useMemo` |
| CR-07 | STYLE | join-link/route.ts | Blank line extra | Removida |
| CR-08 | UX | CampaignManager | Empty state generico quando tudo arquivado | "Todas as campanhas estao arquivadas" + botao mostrar |

---

## i18n Adicionado

### Namespace `campaignArchive` (18 chaves PT-BR + EN):
- archive_title, archive_desc, archive_button, archive_success
- restore_title, restore_desc, restore_button, restore_success
- delete_title, delete_desc, delete_warning, delete_confirm, delete_mismatch, delete_button, delete_success
- error

### Namespace `campaignSettings` (5 chaves novas):
- expiry_label, expiry_7d, expiry_30d, expiry_90d, expiry_never

### Namespace `campaign` (10 chaves novas):
- campaign_full
- invite_link_expired, invite_link_expires_tomorrow, invite_link_expires_in
- quick_action_invite, quick_action_first_encounter, quick_action_first_session
- hero_session_active, hero_session_next, hero_enter_session

### Namespace `campaign_combat` (2 chaves novas + 3 descricoes atualizadas):
- start_session_combat, start_session_combat_desc
- new_combat_desc (reescrita), quick_combat_desc (reescrita), load_preset_desc (reescrita)

### Namespace `dashboard` (4 chaves novas):
- campaigns_all_archived, campaigns_archive, campaigns_restore
- campaigns_show_archived, campaigns_hide_archived

---

## Mapa de Arquivos Sprint 3

```
NOVOS:
  components/campaign/CampaignArchiveDialog.tsx  -- DJ-D1

EDITADOS:
  app/api/campaign/[id]/join-link/route.ts       -- DJ-D2, DJ-D3 (expiry + counts)
  app/app/campaigns/[id]/CampaignHero.tsx        -- DJ-D5, DJ-B3 (session-first + contextual)
  app/app/dashboard/campaigns/page.tsx           -- DJ-D1 (is_archived fetch)
  app/join-campaign/[code]/page.tsx              -- DJ-D2, DJ-D3 (capacity + expiry check)
  components/campaign/CampaignSettings.tsx       -- DJ-D3 (expiry config)
  components/campaign/CombatLaunchSheet.tsx       -- DJ-D4 (session option + descriptions)
  components/campaign/InvitePlayerDialog.tsx      -- DJ-D3 (expires_at display)
  components/campaign/JoinCampaignClient.tsx      -- DJ-D2 (i18n campaign_full)
  components/dashboard/CampaignManager.tsx        -- DJ-D1 (archive flow + empty state)
  messages/en.json                               -- +39 chaves
  messages/pt-BR.json                            -- +39 chaves
```

---

## Validacao

- [x] `tsc --noEmit` PASS
- [x] i18n JSON valido (PT-BR + EN)
- [x] Code review 8/8 corrigido
- [x] Nenhuma migration necessaria (Sprint 1 ja criou todas as colunas)
- [x] Combat Parity Rule — Sprint 3 e DM-only, nao afeta Guest/Anon
- [x] SRD compliance — nenhum dado SRD envolvido
- [ ] Teste manual: archive/restore/delete no dashboard
- [ ] Teste manual: link expirado mostra mensagem
- [ ] Teste manual: campanha cheia bloqueia join
- [ ] Teste manual: quick actions adaptam por estado
- [ ] Teste manual: hero session-first
- [ ] Teste manual: mobile responsive

---

## Proximos Passos

Sprint 3 completa o epic "Jornada do Mestre v2". Jornada completa:

```
Login → Onboarding → Create Campaign (wizard) → Invite Players →
Plan Session → Run Combat → Recap → Archive/Delete
```

Itens de validacao pos-epic (sprint plan checklist final):
- [ ] Jornada completa: Login → Create → Invite → Plan → Combat → Recap
- [ ] Player perspective: receber invite → join → ver campanha → ver recap
- [ ] Edge cases: campanha vazia, campanha cheia, link expirado, archive/restore
- [ ] Realtime: player join notifica DM, hub atualiza sem refresh
- [ ] Performance: Campaign Hub < 2s com 10 players e 20 sessoes

> Sprint plans: `docs/sprint-plan-dm-journey-2026-04-10.md`
> Epic: `docs/epic-dm-campaign-journey-v2.md`
> Analise: `docs/analise-jornada-dm-2026-04-10.md`
