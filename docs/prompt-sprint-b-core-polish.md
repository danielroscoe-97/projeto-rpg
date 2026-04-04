# Prompt: Sprint B — Core Polish (Tier 3 Fixes + Validações)

Cole este prompt numa nova janela do Claude Code.

---

## CONTEXTO

O QA dos 3 Tiers do Pocket DM foi executado em 2026-04-04. O Sprint A (Demo Blockers) está completo — 7 items corrigidos em `ac2d41b`, 1 corrigido nesta sessão (matchup "0 vs 2"). Este Sprint B resolve os bugs críticos e médios do Tier 3 + validações do Tier 2.

**Relatórios de referência:**
- `docs/qa-report-tier3-2026-04-04.md` — relatório completo do Tier 3
- `docs/qa-consolidated-all-tiers-2026-04-04.md` — roadmap consolidado
- `docs/qa-report-tier2-2026-04-04.md` — relatório do Tier 2 (fixes já aplicados, validações pendentes)

**Credenciais de teste:**
- DM: `dm.primary@test-taverna.com` / `TestDM_Primary!1`
- Player: `player.warrior@test-taverna.com` / `TestPlayer_War!1`

---

## 10 ITEMS — PRIORIDADE DECRESCENTE

### B1 [CRITICAL] — Fix RLS `player_characters` para `campaign_id IS NULL`

**Bug:** Criar personagem retorna 500. RLS policies em `player_characters` não suportam standalone characters.

**Causa raiz:** As policies exigem `campaign_id` ligado a uma campanha. Personagens standalone (sem campanha) precisam de policy: `campaign_id IS NULL AND user_id = auth.uid()`.

**Fix:**
1. Criar migration em `supabase/migrations/` com RLS policy para standalone characters:
   ```sql
   CREATE POLICY "Users can manage their standalone characters"
   ON player_characters FOR ALL
   USING (campaign_id IS NULL AND user_id = auth.uid())
   WITH CHECK (campaign_id IS NULL AND user_id = auth.uid());
   ```
2. No componente de criação (`PlayerCharacterManager.tsx` ou similar): adicionar toast de erro + loading state no botão de criar.

**Reprodução:** Login como player → Personagens → Criar Personagem → Preencher form → Clicar "Criar Personagem" → 500.

---

### B2 [CRITICAL] — Investigar campaign crash persistente (Locais)

**Bug:** Campanha "Minas de Phandelver QA" crasha ao interagir com Locais (criar, toggle descoberto). Error boundary ativa. Persistente — recarregar a página também crasha.

**Investigar:**
- Componente de Locais da campanha (`CampaignLocations.tsx` ou similar)
- Hook `use-campaign-locations.ts` — pode ter erro de state ou query malformada
- Console errors quando a campanha carrega
- Dados corrompidos no DB (locais com campos null inesperados?)

**Reprodução:** Login DM → Campanha "Minas de Phandelver QA" → Locais → Crash.

---

### B3 [MEDIUM] — Fix og:image endpoint + fallbacks

**Bug:** `curl http://localhost:3000/opengraph-image` retorna empty reply. Monster/spell pages não têm og:image.

**Fix:**
1. Verificar `app/opengraph-image.tsx` ou `app/opengraph-image/route.tsx` — endpoint pode estar broken
2. Para monster pages (`app/monstros/[slug]/page.tsx`): adicionar og:image no metadata com fallback para imagem genérica do app
3. Para spell pages (`app/magias/[slug]/page.tsx`): idem
4. Testar com `curl -I` que retorna 200 + content-type image

---

### B4 [LOW] — Fix title duplicado metadata

**Bug:** Title mostra "Goblin — Ficha D&D 5e | Pocket DM | Pocket DM" (duplicado).

**Causa:** O root layout (`app/layout.tsx`) tem `title: { template: "%s | Pocket DM" }` e as pages slug já incluem "| Pocket DM" no título.

**Fix:** Nas pages de detalhe (`app/monstros/[slug]/page.tsx`, `app/magias/[slug]/page.tsx`, etc.), remover "| Pocket DM" do título retornado em `generateMetadata()`. O template do layout já adiciona o sufixo.

**NOTA:** O commit `ac2d41b` já corrigiu isso para 25+ pages de listagem. Verificar se as pages de DETALHE (slug) também foram corrigidas. Se sim, marcar como já feito.

---

### B5 [LOW] — Fix nome combate duplicado dashboard

**Bug:** Dashboard mostra "First EncounterFirst Encounter" — nome renderizado 2x.

**Investigar:**
- `CombatHistoryCard.tsx` ou componente similar no dashboard
- Provavelmente o nome é renderizado em 2 lugares (título + subtitle) ou concatenado incorretamente.

---

### B6 [LOW] — Fix pluralização i18n

**Bug:** "1 jogadores" em vez de "1 jogador". "sessoes" sem acento (este já foi corrigido no Tier 2).

**Fix:**
- Buscar strings hardcoded com pluralização incorreta
- Usar format de pluralização do next-intl: `{count, plural, one {# jogador} other {# jogadores}}`
- Verificar `messages/pt-BR.json` e `messages/en.json`

---

### B7 [VALIDAÇÃO] — Validar Via Link API funciona no browser

**Contexto:** No Tier 2, corrigimos o componente `InvitePlayerDialog.tsx` (error state + retry). Mas não testamos se a API `/api/campaign/[id]/join-link` realmente funciona.

**Testar:**
1. Login como DM → Campanha → Convidar Jogador → Tab "Via Link"
2. Verificar que link aparece (não mostra "Não foi possível gerar o link")
3. Copiar o link e abrir em aba anônima
4. Verificar que redireciona para `/join-campaign/[code]`

Se a API falhar, investigar o endpoint em `app/api/campaign/[id]/join-link/route.ts`.

---

### B8 [VALIDAÇÃO] — Testar fluxo invite→signup→join e2e

**Contexto:** Nunca foi testado end-to-end.

**Testar o fluxo completo:**
1. DM gera link de convite (Via Link)
2. Player abre link em browser anônimo
3. Player faz signup (email + senha)
4. Player confirma email
5. Player é redirecionado de volta ao link de convite
6. Player entra na campanha
7. DM vê player na lista de membros

---

### B9 [UX] — Auto-detect `/invite/` redirect no onboarding

**Contexto:** No Tier 2 adicionamos "Sou jogador" no onboarding. Mas o ideal é detectar automaticamente se o user veio de `/invite/[token]` e pular o onboarding.

**Fix:**
- No `app/auth/confirm/route.ts`: se `invite` + `campaign` params estão presentes, redirecionar direto para `/invite/[token]` em vez de `/app/onboarding`
- Ou: no `OnboardingWizard.tsx`, checar `searchParams` por `invite` e auto-skip

---

### B10 [UX] — NPC dirty state warning

**Contexto:** Fechar modal de edição de NPC sem salvar perde dados sem aviso.

**Fix:**
- No `NpcForm.tsx`: detectar se algum campo foi alterado (dirty state)
- Ao fechar sem salvar, mostrar confirm dialog "Descartar alterações?"

---

## REGRAS

- Seguir CLAUDE.md do projeto (RTK, Combat Parity, SRD compliance)
- Começar pelos criticals (B1, B2) depois médios/baixos
- Se B7/B8 falharem, documentar o que quebrou e criar fix
- Para migrations SQL: criar em `supabase/migrations/` com número sequencial
- Para traduções: atualizar AMBOS `messages/pt-BR.json` e `messages/en.json`
- Após cada fix, verificar build com `rtk tsc --noEmit`
- Rodar code review (`/bmad-code-review`) ao final de todos os fixes
