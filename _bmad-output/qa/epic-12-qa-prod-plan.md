---
title: Epic 12 — Campaign Workspace | QA Plan em Produção
date: 2026-04-21
audience: QA testador (humano ou agente) rodando em pocketdm.com.br após deploy de 4cddc416
epicCommits:
  - 842e5da1  # Wave 1 — kill banner + eager session + sweeper
  - 5ff6bf4f  # Wave 2 — timeline + chips + entry points (via analytics commit)
  - 0a9d8d21  # Wave 2.1 — timeline visibility + sidebar reorder
  - dc0f1396  # Wave 3 — revisit modal + inline stats + chip contrast
  - 4cddc416  # Wave 3.1 — full review fix pass + Story 12.9 AC5 + Histórico sidebar
---

# QA em Produção — Epic 12 Campaign Workspace

Você vai validar a **Epic 12 completa** em `https://pocketdm.com.br` após o deploy de `4cddc416`. O objetivo é confirmar que as 5 ondas (Wave 1, 2, 2.1, 3, 3.1) entregam o que prometem e **não quebraram** nada pré-existente.

## 0. Pré-flight (obrigatório)

1. Aguarde o deploy Vercel finalizar para a branch `master` (~2-4 min após push). Confirme:
   - Abra https://vercel.com/danielroscoe97/projeto-rpg/deployments
   - Último deploy deve ser commit `4cddc416` (Wave 3.1) com status **Ready**
2. Hard-refresh no browser (`Ctrl+Shift+R`) para invalidar cache.
3. Faça login em `https://pocketdm.com.br/auth/login` como DM real (credenciais `.env.e2e`: `danielroscoe97@gmail.com` / `Eusei123*`).
4. Abra DevTools Console — deve estar zero-errors ao pousar na dashboard. Qualquer `Uncaught` ou `Failed to fetch` é bug.

## 1. Estrutura do report

Para cada teste use este formato:

```
[Wave X.Y — Test N — <título>]
Resultado: ✅ PASS / ❌ FAIL / ⚠️ PARCIAL
Evidência: screenshot / trecho DevTools / observação curta
Notas: (opcional — comportamento inesperado não-bloqueante)
```

Anexe screenshots em `_bmad-output/qa/evidence/epic-12-prod-<timestamp>/`.

---

## 2. Wave 1 — Kill the banner

**Contexto:** o banner "Selecione uma campanha para salvar o combate" deveria estar **morto**. Combate deveria persistir desde o setup.

### W1-T1 — Combate rápido persiste desde o setup
1. Dashboard → botão "Iniciar combate" no rodapé da sidebar → rota `/app/combat/new?quick=true`
2. Adicione 1 monstro SRD (ex: Goblin).
3. **Antes** de clicar "Start Combat", dê F5 na página.
4. **Esperado:** a página reabre sem perder o monstro adicionado (sessionStorage tem `pocketdm.draft-session:quick`). Se reabrir vazia, é ok apenas se o sessionStorage não existia — confirme via DevTools → Application → Session Storage.

### W1-T2 — Banner "Selecione uma campanha" não aparece mais
1. Continue do teste acima, inicie o combate, derrote o monstro, termine.
2. Ao cair na tela de recap, **NÃO deve existir** banner amarelo pedindo para selecionar campanha.
3. **Esperado:** recap mostra botão "Salvar Combate" que funciona sem pré-condição; se for quick combat, aparece o card "Vincular este combate a uma campanha" (não bloqueante).

### W1-T3 — Vincular quick combat a uma campanha (happy path)
1. No recap de um quick combat (W1-T2), selecione uma campanha no dropdown e clique "Vincular".
2. **Esperado:** toast "Vinculado a {nome da campanha}!" aparece em < 2s.
3. Navegue para a campanha escolhida → Overview → timeline "Histórico de combates" deve conter esse combate.
4. **Esperado:** entry no timeline com resultado correto (victory/dm_ended), duração e contagem.

### W1-T4 — API link-campaign rejeita ownership errada
1. Copie o session_id do quick combat (via URL `/app/combat/<UUID>` ou DevTools).
2. No DevTools Console:
   ```js
   fetch(`/api/combat/${sessionId}/link-campaign`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ campaignId: '00000000-0000-0000-0000-000000000000' }),
   }).then(r => console.log(r.status, r.statusText));
   ```
3. **Esperado:** status `404` (`campaign_not_found`) ou `403` (`forbidden_campaign`). **NUNCA** 200.

### W1-T5 — Sweeper (opcional, requer acesso Supabase)
1. Aplique manualmente: `SELECT public.sweep_abandoned_combat_drafts();`
2. **Esperado:** retorna count integer ≥ 0 sem erro.
3. Confirma entrada no `error_logs` (`level='info', component='sweep_abandoned_combat_drafts'`) quando count > 0.

---

## 3. Wave 2 — Timeline + role chips + entry points

### W2-T1 — Role chips no dashboard
1. Vá para `/app/dashboard/campaigns`.
2. **Esperado:**
   - DM cards (Krynn, Aventura Epica, Teste) têm chip `👑 Mestre` top-left (gold `text-amber-200` sobre `bg-black/80`).
   - Player cards (Curse of Strahd) têm chip `👤 Jogador` top-left (emerald).
3. Zoom-in na chip + verifique contraste visual contra imagem hero de fundo — deve ser legível mesmo em imagens claras.

### W2-T2 — DM card "Combate" button deep-link
1. No card da Krynn, clique no botão **Combate** (não no card inteiro).
2. **Esperado:** URL vira `/app/combat/new?campaign=2f3e00a3-5c5c-42ae-a8f6-c2b67baa4564`. **NÃO** abre o campaign picker.
3. Setup screen carrega os jogadores da Krynn automaticamente.

### W2-T3 — Timeline aparece em TODA campaign com finished encounters
1. Navegue para `/app/campaigns/2f3e00a3-...` (Krynn).
2. Role pra baixo.
3. **Esperado:** card "HISTÓRICO DE COMBATES" aparece com ≥ 1 entry (Krynn tem pelo menos 1 finalizado).
4. Repita para outra campanha que tenha `finishedEncounterCount > 0` (Aventura Epica).
5. **Esperado Aventura Epica:** se tem encounters mas nenhum finalizado, timeline mostra empty state "Nenhum combate finalizado ainda" (não some completamente).

### W2-T4 — Sidebar contextual promove Current Campaign ao topo
1. Estando dentro de `/app/campaigns/:id`, verifique a sidebar esquerda.
2. **Esperado:** seção "Current campaign" (Encontros, Quests, Players, NPCs, Locais, Facções, Notas, Inventário DM-only, Mapa Mental) renderiza **acima** do "Menu Principal" (Dashboard, Campanhas, Combates, Personagens, etc).
3. Saia da campanha → voltar pra `/app/dashboard`. **Esperado:** ordem normal retorna (Menu Principal em primeiro).

---

## 4. Wave 3 — Revisitar modal + inline stats + Histórico

### W3-T1 — Stats row renderiza com 4 cards
1. Campanha com ≥ 1 combate finalizado (Krynn).
2. **Esperado:** 4 cards no topo da timeline:
   - **Taxa de vitória** (% ou "—" + "Sem combates decisivos (vitória/TPK) ainda")
   - **Duração média** (ex: "2m 04s" ou "—" + "sem medições")
   - **Combates** (integer, ex: "1" + "finalizados na mesa")
   - **Dificuldade média** (ex: "3.5 / 5" ou "—" + "sem avaliações")

### W3-T2 — Taxa de vitória usa denominador correto
1. Crie (ou use existente) campanha com: 1 victory + 3 "DM encerrou" (via encerrar combate manualmente sem defeat total). Se não conseguir, pule para W3-T3.
2. **Esperado (Wave 3.1 fix):** Taxa de vitória mostra **100%** (1/1 decisivos), **NÃO** 25% (1/4 total).
3. Tooltip/subtexto: "1 vitória · 0 TPKs".

### W3-T3 — Revisitar modal abre ao clicar em timeline entry
1. Na timeline da Krynn, clique na primeira entry.
2. **Esperado:** modal abre com:
   - Hero colorido conforme resultado (verde Trophy=victory, rosa Skull=tpk, amber Flag=fled, cinza History=dm_ended, muted HelpCircle=unknown).
   - Título do encounter.
   - Rodadas + duração + estrelas de dificuldade (se avaliado).
   - Lista de jogadores (se party_snapshot não vazio).
   - Lista de criaturas com ✓ para defeated.
   - DM notes (se existirem).
3. **Fechar via X** no canto superior direito.

### W3-T4 — Focus management (a11y crítico, Wave 3.1 fix)
1. Abra a timeline entry via **Tab** + Enter (keyboard-only, não mouse).
2. **Esperado:** focus pousa no botão "X" do modal (não em algum elemento atrás).
3. Pressione **Tab** repetidamente dentro do modal.
4. **Esperado:** focus **nunca** escapa para o background (timeline, sidebar). Deve ciclar dentro do modal (X → links internos → volta pro X).
5. **Shift+Tab** no primeiro elemento focusável.
6. **Esperado:** focus vai para o último elemento focusável do modal.
7. Feche via **Escape**.
8. **Esperado:** focus retorna **exatamente** para o botão da timeline entry que abriu o modal.

### W3-T5 — Exit animation funciona (Wave 3.1 fix)
1. Abra o modal, observe fadein.
2. Clique fora (backdrop) ou pressione Esc.
3. **Esperado:** o modal executa fadeout animation (~200ms) antes de desmontar. **NÃO** deve "pipocar" instantaneamente.

### W3-T6 — Scroll lock sem layout shift (Wave 3.1 fix)
1. Na campaign detail page com scroll disponível (conteúdo grande), abra o modal.
2. **Esperado:** fundo NÃO pula horizontalmente ~15px. Scrollbar some via `padding-right` compensation.
3. Feche o modal → layout volta ao normal sem jump reverso.

### W3-T7 — CR 0 badge preservado (Wave 3.1 fix)
1. Crie combate com Commoner (CR 0) e termine.
2. Revisitar modal → seção Criaturas.
3. **Esperado:** linha do Commoner mostra `Commoner × 1 · CR 0`. O badge "CR 0" **não** pode sumir.

### W3-T8 — HP display guard (max_hp=0)
1. Cenário raro: jogador com personagem com `max_hp=0` (placeholder). Se não conseguir reproduzir, pule.
2. **Esperado:** barra de HP **não** renderiza; numérico "X/0" **não** aparece. Só nome + classe/raça.

### W3-T9 — Sidebar Histórico anchor scroll (Wave 3.1 fix)
1. No sidebar contextual de uma campanha, clique **Histórico**.
2. **Esperado:** URL ganha hash `#combat-timeline-heading`, página faz smooth-scroll pro card do timeline no Overview.
3. Se estiver em outra `?section=...` (ex: `?section=quests`), clique em Histórico leva de volta ao Overview com o scroll.

### W3-T10 — Chip contrast WCAG (Wave 3.1 fix)
1. Use DevTools → Accessibility Inspector no chip "Mestre" sobre hero image brilhante.
2. **Esperado:** contrast ratio ≥ 4.5:1 (WCAG AA small text) ou ≥ 3:1 (AA large text). Wave 3.1 visa AAA ~10:1.

---

## 5. Wave 3.1 — Story 12.9 AC5 stale-session confirm

### W3.1-T1 — Modal ">4h confirm" aparece em combate parado
**Setup requer SQL direto:**
```sql
-- Identifique uma session ativa (is_active=true) na sua campanha de teste:
SELECT id, name, updated_at FROM sessions
  WHERE campaign_id = '<campaign_uuid>' AND is_active = true LIMIT 5;
-- Envelheça updated_at para 5h atrás:
UPDATE sessions SET updated_at = now() - interval '5 hours'
  WHERE id = '<session_uuid>';
```

1. Recarregue `/app/campaigns/<id>` (a campanha com a session envelhecida).
2. O Hero deve mostrar "Combate em andamento: X".
3. Clique no botão "Entrar no combate ativo".
4. **Esperado (Wave 3.1):** modal `StaleSessionConfirm` aparece com:
   - Título: "Retomar combate parado?"
   - Body explicando que "X" está parado há "5 horas e Y minutos".
   - Botões: "Cancelar" + "Continuar mesmo assim" (amber).
   - **Enter** no teclado confirma (focus inicial no confirm button).
   - **Escape** cancela e fecha.
5. Clicar **Cancelar** → modal fecha, nada acontece.
6. Clicar **Continuar mesmo assim** → modal fecha, abre o CombatLaunchSheet normalmente.

### W3.1-T2 — Modal NÃO aparece quando < 4h
1. Rolle back `updated_at` para `now() - interval '2 hours'`.
2. Clique "Entrar no combate ativo".
3. **Esperado:** sheet abre direto, **sem** modal de confirmação.

---

## 6. Testes de regressão — CLAUDE.md rules

### R-1 — Combat Parity Rule (DM / Anon / Guest)
1. **DM** (`/app/campaigns/:id`): tudo testado acima, deve funcionar.
2. **Anônimo** (`/join/<token>` de uma campanha ativa): player entra, vê sheet, participa do combate.
3. **Guest** (`/try`): guest combat flow. Inicie, adicione monstros, termine, chegue no recap.
4. **Esperado em todos 3:** zero crashes, banner "Selecione campanha" **não** aparece em nenhum modo.

### R-2 — Resilient Reconnection
1. Como DM: inicie um combate, player conecta via link `/join/<token>` em outra aba.
2. Feche a aba do player.
3. DM continua a rodada.
4. Player reabre `/join/<token>`.
5. **Esperado:** player rejoin automático sem tela branca, heartbeat reestabelece, round state sincroniza em < 3s.

### R-3 — `campaigns_players_*` pluralização
1. Campanha com 1 jogador: card mostra "1 jogador" (singular).
2. Campanha com 5 jogadores: card mostra "5 jogadores" (plural).
3. **Esperado:** nunca "1 jogadores" ou "5 jogador".

### R-4 — `party_vs_creatures` pluralização no timeline
1. Timeline entry com 1 jogador + 3 criaturas.
2. **Esperado:** "1 jogador · 3 criaturas" (sing/plural correto).
3. Timeline entry com 4 jogadores + 1 criatura.
4. **Esperado:** "4 jogadores · 1 criatura".

### R-5 — Sweeper audit log não spammy
1. Rode `SELECT public.sweep_abandoned_combat_drafts(interval '1 second');` duas vezes seguidas com 0 rows a deletar.
2. **Esperado:** nenhuma row nova em `error_logs` quando count = 0 (log só quando há delete).

---

## 7. Bugs críticos conhecidos (scope deferido)

Não reporte como bug se encontrar:
- **Story 12.9 AC6 (rejoin banner específico "X players need to rejoin")** — deferido pra Wave 4.
- **Story 12.11 Avaliar tab dedicada** (com CR deltas, per-player damage, CSV) — deferido. Stats inline no timeline são MVP honesto.
- **Modal Revisitar sem Share/Copy** (AC5, AC6 da Story 12.10) — V2 futura.
- **`/app/campaigns/:id` em modo Player ainda não tem timeline** (só DM view) — decisão de scope.

---

## 8. Criteria de fechamento

Epic 12 é **APROVADO** se:
- Todos os testes da seção 2-5 passam (Waves 1–3.1).
- R-1 a R-5 não regredir.
- Zero console errors ao abrir páginas pela primeira vez (warnings de `Content Security Policy` via DevTools dev são OK).
- W3.1-T1 (stale confirm) funciona — é o fix mais arriscado do Epic.

Epic 12 é **REJEITADO** se:
- Qualquer test da seção 2-5 marca ❌ FAIL sem justificativa razoável.
- R-1 falha (Combat Parity quebrou).
- Qualquer modal trava o DOM (focus não volta, scroll não destrava).
- Timeline renderiza "undefined" em algum campo.

---

## 9. Comando para rodar QA via Playwright (opcional)

Se quiser rodar alguns testes automaticamente via Playwright local:

```bash
cd c:/Projetos\ Daniel/projeto-rpg
# Pre-requisito: servidor local de prod-build
PLAYWRIGHT_BASE_URL=https://pocketdm.com.br npx playwright test tests/campaign-workspace/
```

(Observação: os tests atuais em `tests/campaign-workspace/` são Jest — não Playwright. Suite E2E seria dívida nova, não rodar esperando que exista.)

---

## 10. Evidências mínimas esperadas

Ao fim do QA, o report deve incluir:

- [ ] 1 screenshot do dashboard com chips "Mestre" + "Jogador" legíveis
- [ ] 1 screenshot da timeline da Krynn com 4 stat cards + lista
- [ ] 1 screenshot do Revisitar modal aberto
- [ ] 1 screenshot do StaleSessionConfirm aparecendo após age manual
- [ ] Output do DevTools Console (zero errors em pouso em dashboard + campaign detail + abrir modal)
- [ ] Lista de qualquer ❌ FAIL com passos para reproduzir

**Entregar em:** novo arquivo `_bmad-output/qa/epic-12-qa-report-<YYYY-MM-DD>.md` seguindo a estrutura da seção 1.
