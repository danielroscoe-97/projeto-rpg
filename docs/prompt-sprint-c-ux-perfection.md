# Prompt: Sprint C — Perfeição UX (Micro-atritos)

Cole este prompt numa nova janela do Claude Code.

---

## CONTEXTO

O Pocket DM passou por QA de 3 Tiers (2026-04-04). Sprint A (Demo Blockers) e Sprint B (Core Polish) já foram executados. Este Sprint C elimina micro-atritos de UX que impedem o score de chegar a 9.5+/10.

**Referência:** `docs/qa-consolidated-all-tiers-2026-04-04.md` — roadmap completo com score por jornada.

---

## 12 ITEMS

### C1 — Dashboard player filtra ações por role

**Problema:** Player logado vê "Criar NPC", "Convidar Jogador", "Novo Combate" — todas ações de DM. Confunde o player.

**Fix:**
- Em `components/dashboard/DashboardOverview.tsx` (ou similar): checar o `userRole` do onboarding (`user_onboarding.source` ou settings role)
- Se role === "player": esconder quick actions de DM, mostrar apenas "Meus Personagens" e "Entrar em Campanha"
- Se role === "both": mostrar tudo

---

### C2 — "Última atividade" nos cards de campanha

**Problema:** DM retornando não sabe quando foi a última sessão de cada campanha.

**Fix:**
- No card de campanha (`CampaignManager.tsx` ou similar): adicionar timestamp "Última sessão: 3 dias atrás" ou data absoluta
- Fonte: `combat_sessions.ended_at` mais recente por campanha, ou `campaigns.updated_at`

---

### C3 — Node click navega pra seção no mind map

**Problema:** Clicar num nó de NPC no mind map não faz nada. O spec esperava scroll para a seção de NPCs.

**Fix:**
- Em `CampaignMindMap.tsx`: no `handleNodeClick`, detectar o tipo do nó (NPC, Note, Quest, etc.)
- Scroll suave para o Section correspondente usando `document.querySelector('[data-section="npcs"]')?.scrollIntoView()`
- Adicionar `data-section` attrs nas seções da campanha em `CampaignSections.tsx`

---

### C4 — Condition picker auto-close após aplicar

**Problema:** Ao aplicar uma condição a um combatente, o picker permanece aberto. DM precisa fechar manualmente.

**Fix:**
- No componente de condition picker (dentro de `CombatantRow.tsx`): após `onToggleCondition`, fechar o popover/dropdown automaticamente
- Combat Parity: aplicar em Guest + Auth

---

### C5 — Mid-combat add via drawer/modal (não push)

**Problema:** Adicionar combatente mid-combat empurra a initiative list pra baixo, perdendo o scroll position.

**Fix:**
- Usar Sheet/Drawer component (shadcn) em vez de inline form
- O drawer abre por cima da lista sem deslocar conteúdo
- Combat Parity: aplicar em Guest + Auth

---

### C6 — Tab order manual add: Nome → HP → AC → Init

**Problema:** Tab order atual é Nome → Init → HP → AC. Não intuitivo — HP e AC são mais usados que Init.

**Fix:**
- Em `EncounterSetup.tsx`: reordenar os campos do manual add row para Nome → HP → AC → Init
- Manter `tabIndex` natural (DOM order)

---

### C7 — Via E-mail com instrução explicativa

**Problema:** Tab "Via E-mail" no convite mostra campo + botão sem explicação do que acontece.

**Fix:**
- Em `InvitePlayerDialog.tsx`: adicionar texto descritivo acima do form: "O jogador receberá um email com link para entrar na campanha."
- i18n: adicionar chave em ambos JSONs

---

### C8 — Form state reset ao fechar modais

**Problema:** Fechar e reabrir modal de criação mostra dados anteriores.

**Fix:**
- Em modais de criação (NPC, Personagem, etc.): resetar state no `onOpenChange(false)` handler
- Padrão: `useEffect(() => { if (!open) resetForm(); }, [open])`

---

### C9 — Sidebar em Presets/Settings

**Problema:** `/app/presets` e `/app/settings` perdem a sidebar de navegação lateral. Inconsistência de layout.

**Fix:**
- Verificar se estas páginas usam o layout do dashboard (`app/app/layout.tsx`)
- Se não, mover para dentro do layout que inclui a sidebar
- Ou adicionar breadcrumb para navegação de volta

---

### C10 — Acid Splash diferenciação 2014/2024

**Problema:** Dois cards idênticos "Acid Splash Conj" no compêndio de magias sem indicador de versão.

**Fix:**
- Em `app/magias/page.tsx` (ou SpellCard component): adicionar badge "2014" / "2024" quando existem múltiplas versões do mesmo spell
- Fonte: campo `ruleset_version` no JSON de spells

---

### C11 — Combat com mínimo 2 combatentes

**NOTA:** Verificar se já foi corrigido no commit `ac2d41b` (Tier 1 fixes). Se sim, marcar como done.

---

### C12 — 404 custom RPG-themed

**Problema:** Slug inexistente retorna 404 genérico do Next.js.

**Fix:**
- Criar `app/not-found.tsx` com design RPG (dark theme, pixel art, "Você se perdeu na dungeon...")
- Incluir link de volta para home e busca

---

## REGRAS

- Seguir CLAUDE.md do projeto (RTK, Combat Parity, SRD compliance)
- Cada fix deve ser auto-contido — testar isoladamente
- Para traduções: atualizar AMBOS `messages/pt-BR.json` e `messages/en.json`
- Após cada fix, verificar build com `rtk tsc --noEmit`
- Rodar code review (`/bmad-code-review`) ao final de todos os fixes
- Commitar com mensagem descritiva e push
