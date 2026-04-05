# Prompt: Fix QA Tier 2 — Bugs + UX Improvements

## CONTEXTO

O QA Tier 2 do Pocket DM foi executado em 2026-04-04 testando 6 jornadas (Campanhas, NPCs, Notas, Convite, Mind Map, First-Time Player). O relatório completo está em `docs/qa-report-tier2-2026-04-04.md` e os screenshots em `qa-evidence/tier2/`.

**Resultado: 4 PASS / 2 FAIL, UX Score médio 5.3/10.**

Foram encontrados 2 bugs técnicos e 15+ problemas de UX. Este prompt cobre TUDO que precisa ser corrigido, organizado por prioridade.

---

## PRIORIDADE 1 — BUGS TÉCNICOS (bloqueia fluxos core)

### FIX-01 [CRITICO] — Tab "Via Link" no convite de jogador está vazio

**O que acontece:** No modal "Convidar Jogador para Campanha", o tab "Via Link" (selecionado por default) mostra tabpanel completamente vazio. Sem link, sem botão, sem loading, sem erro. O tab "Via E-mail" funciona normalmente.

**Reprodução:** Login DM → qualquer campanha → seção Jogadores → "Convidar Jogador" → tab "Via Link" está vazio.

**Reproduzido em:** Ambas campanhas testadas. Console mostra 73 errors ao abrir o dialog.

**Investigar:**
- O componente do tab "Via Link" — provavelmente faz uma chamada para gerar/buscar o invite token e falha silenciosamente
- Checar se há uma RPC ou API call que gera o link (`campaign_invites` table? `invite_tokens`?)
- O tabpanel pode estar renderizando condicionalmente baseado em um state que nunca é setado
- Console errors podem dar a pista do erro

**Screenshots:** `qa-evidence/tier2/j7-02-invite-via-link.png`, `qa-evidence/tier2/j7-04-invite-qa-campaign.png`

### FIX-02 [MEDIO] — Dashboard tour mostra chaves i18n brutas

**O que acontece:** Após completar onboarding, o dashboard mostra um guided tour (dialog 1/7) com texto "TOUR.DASHBOARD_TOUR.WELCOME_TITLE" e "tour.dashboard_tour.welcome_desc" em vez do texto traduzido.

**Reprodução:** Login como player.warrior@test-taverna.com / TestPlayer_War!1 → Onboarding → "Combate Rápido" → Dashboard → Tour dialog mostra chaves brutas.

**Investigar:**
- Buscar "dashboard_tour" ou "welcome_title" nos arquivos de tradução (`messages/pt-BR.json`, `messages/en.json`)
- Provavelmente as chaves do tour nunca foram adicionadas aos JSONs de tradução
- O componente de tour usa `useTranslations()` ou `t()` com namespace que não existe

**Screenshot:** `qa-evidence/tier2/j13-03-player-dashboard.png`

### FIX-03 [MEDIO] — 91 console errors durante edição de notas

**O que acontece:** Ao editar notas da campanha, o console acumula ~91 errors em poucos segundos. Possível auto-save com debounce inadequado ou requests falhando.

**Investigar:**
- Abrir console do browser na página de campanha → seção Notas → digitar no textarea
- Verificar se os errors são de requests falhando (401? 500? network?) ou de render loops
- Se for auto-save, verificar debounce interval — deveria ser 1-2s, não a cada keystroke

---

## PRIORIDADE 2 — UX ALTA (afeta primeiro uso e retenção)

### UX-01 — Onboarding ignora que user pode ser Player

**Problema:** O onboarding mostra "Vamos montar sua primeira mesa de RPG" com opções "Combate Rápido" e "Configurar Campanha" — ambas DM-centric. Um player que recebeu link de convite e fez signup cai aqui sem opção de player.

**Fix sugerido:**
- Adicionar terceira opção no onboarding: "Recebi um link de convite" / "Sou Jogador" com ícone de escudo/espada
- Ou: detectar se o user veio de um `/invite/[token]` redirect e pular o onboarding direto pro fluxo de aceite
- O empty state do dashboard player ("Crie sua primeira mesa!") deveria dizer "Você ainda não participa de nenhuma campanha. Peça ao seu mestre o link de convite."

**Arquivos prováveis:** `app/app/onboarding/page.tsx`, componente de onboarding wizard

### UX-02 — Auto-save de notas sem feedback visual

**Problema:** Notas usam auto-save mas não há indicador "Salvando..."/"Salvo". O DM digita e não sabe se o conteúdo está persistido. Combinado com 91 console errors, é possível que dados estejam sendo perdidos silenciosamente.

**Fix sugerido:**
- Adicionar indicador de status no footer da nota: "Salvando..." (com spinner) → "Salvo" (com check) → "Erro ao salvar" (com retry)
- Usar pattern de debounced auto-save com status visual (similar ao Google Docs)

### UX-03 — NPC oculto por padrão confunde DM

**Problema:** Ao criar NPC, o toggle "Visível para jogadores" está OFF por default. A maioria dos DMs espera que o NPC seja visível por padrão.

**Fix sugerido:** Inverter o default — "Visível para jogadores" ON por padrão. O DM oculta deliberadamente quando precisa.

### UX-04 — "Já sei como funciona" no tour manda pra tela errada

**Problema:** Pular o dashboard tour redireciona para "Novo Encontro" (`/app/session/new`) em vez de manter no dashboard. Confuso.

**Fix sugerido:** Pular tour deve manter o user no dashboard. O redirect para `/app/session/new` provavelmente vem do query param `?from=wizard&next=session` — o "Já sei como funciona" deveria limpar esse redirect.

---

## PRIORIDADE 3 — UX MEDIA (polish e usabilidade)

### UX-05 — Sem redirect pós-criação de campanha

Após criar campanha, o DM fica na lista em vez de ir pro detalhe. Adicionar redirect para `/app/campaigns/[id]` após criação, para o DM continuar configurando.

### UX-06 — Sem toast de feedback na criação de campanha

Nenhum toast "Campanha criada!" aparece. Adicionar toast de sucesso.

### UX-07 — Mind Map preso na coluna estreita

O mind map renderiza na coluna direita (~350px). Com muitos nós vai ficar ilegível. Considerar opção de expandir fullscreen ou usar largura total quando a seção está aberta.

### UX-08 — Filtros do Mind Map com indicador de estado fraco

Ao desativar um filtro (ex: NPCs), o botão muda de forma sutil. Usar visual mais evidente: opacidade 50%, strikethrough, ou cor diferente.

### UX-09 — "sessoes" sem acento no header da campanha

O header mostra "0 sessoes" — deveria ser "0 sessões". Provavelmente é um literal hardcoded em vez de i18n.

### UX-10 — Modal de convite com muito espaço vazio

O modal "Convidar Jogador" tem área vazia embaixo dos tabs. Parece incompleto mesmo quando funcional (Via E-mail).

### UX-11 — Nome de NPC truncado agressivamente em grid

"Bartender Grog" vira "BARTE..." — o card tem espaço. Aumentar limite de truncamento ou usar 2 linhas.

### UX-12 — Overload cognitivo na criação de nota

Ao criar nota, aparecem 10+ elementos de uma vez (título, 7 tags, textarea, vincular NPC, privacidade, pasta, timestamp, excluir). Considerar progressive disclosure — mostrar só título + conteúdo inicialmente, expandir o resto on-demand.

---

## COMO EXECUTAR

1. **Ler o relatório completo:** `docs/qa-report-tier2-2026-04-04.md`
2. **Ver screenshots:** `qa-evidence/tier2/` (20 screenshots nomeados por jornada)
3. **Começar pelos FIX-01 a FIX-03** (bugs técnicos)
4. **Depois UX-01 a UX-04** (UX alta)
5. **Depois UX-05 a UX-12** (UX media) — conforme tempo permitir
6. **Testar cada fix** abrindo o browser na jornada correspondente
7. **Credenciais:** DM `dm.primary@test-taverna.com` / `TestDM_Primary!1`, Player `player.warrior@test-taverna.com` / `TestPlayer_War!1`

## REGRAS

- Seguir CLAUDE.md do projeto (RTK, Combat Parity, SRD compliance)
- Após cada fix, verificar que não quebrou outra coisa
- Priorizar: funcionalidade > UX alta > UX media
- Se algum fix requer migration SQL, criar em `supabase/migrations/`
- Se algum fix requer tradução, atualizar AMBOS `messages/pt-BR.json` e `messages/en.json`
