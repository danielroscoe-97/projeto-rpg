# Prompt de Execução — Migração Linguagem Ubíqua + Rotas

> **Para:** Agente executor (sessão fresca de Claude Code)
> **Origem:** Beta test session 3 (2026-04-16) + Party Mode + Audit completo
> **Repositório:** `c:\Projetos Daniel\projeto-rpg` (branch base: `master`)

---

## COPY-PASTE: Prompt completo para o agente

```
Você vai executar a migração de Linguagem Ubíqua do PocketDM. Toda a análise,
auditoria e plano já foi feito. Sua missão é EXECUTAR seguindo os 4 docs abaixo,
sem improvisar e sem desvio.

## CONTEXTO DO PROJETO

PocketDM é uma ferramenta web de gerenciamento de campanhas e combates D&D 5e
(pocketdm.com.br). Stack: Next.js App Router + TypeScript + Supabase + Tailwind.
PT-BR primary (83% tráfego BR), EN secondary.

Origem desta migração: Beta test com DM real revelou que a terminologia mistura
"sessão", "encontro" e "combate" de forma inconsistente. Glossário ubíquo foi
aprovado e está documentado.

## DOCS DE REFERÊNCIA (LEIA PRIMEIRO, NA ORDEM)

1. docs/glossario-ubiquo.md
   → 14 termos oficiais com EN/PT-BR e definições. CONSULTE SEMPRE em caso de dúvida.

2. docs/migration-i18n-linguagem-ubiqua.md
   → 83 chaves i18n a alterar em messages/pt-BR.json e messages/en.json.
   → Organizado em 9 grupos. Cada grupo tem tabela com chave/linha/valor atual/valor novo.
   → ATENÇÃO especial: Grupo 4 (Session Planner — 20 chaves que NÃO mudam) e
     Grupo 6 (Auth — 2 chaves que NÃO mudam).

3. docs/migration-rotas-session-to-combat.md
   → 65 referências de rota /app/session → /app/combat e /api/session → /api/combat.
   → 8 passos de execução. Estratégia de proxy para APIs (NÃO redirect).
   → ATENÇÃO especial: NÃO renomear realtime channels (session:${sessionId}) e
     NÃO renomear storage keys (pocketdm:session:).

4. docs/beta-test-session-3-2026-04-16.md
   → Contexto dos feedbacks. Útil pra entender o "porquê" das mudanças.

## REGRAS IMUTÁVEIS (CLAUDE.md do projeto)

Você DEVE respeitar estas regras durante toda execução:

1. **Combat Parity Rule** — Toda mudança em combate deve preservar paridade entre
   Guest (/try), Anônimo (/join) e Autenticado (/invite). Esta migração é UI/rotas,
   não muda lógica — então paridade é automática se você seguir o doc.

2. **Resilient Reconnection Rule** — Reconexão do jogador NUNCA pode ser perdida.
   NÃO MEXA em:
   - lib/player-identity-storage.ts (storage keys)
   - lib/realtime/* (channel names "session:")
   - useCombatResilience hook lógica interna
   - Cadeia de fallbacks L1-L5

3. **SRD Compliance** — Não aplicável a esta migração (não toca em dados SRD).

4. **SEO Canonical Decisions** — Não aplicável (não toca em metadata/sitemap).

5. **RTK** — Use `rtk` prefix em comandos (rtk tsc, rtk vitest, rtk git status).

## ORDEM DE EXECUÇÃO

### FASE 1 — Migração i18n (estimativa: 1 sessão)

Esta fase é segura e independente. Execute primeiro.

1.1. Ler `messages/pt-BR.json` para mapeamento das chaves
1.2. Aplicar as 83 alterações conforme tabelas do doc i18n:
     - Grupo 1 (45 chaves): "sessão" → "combate"
     - Grupo 2 (12 chaves): "sessão/sessões" → "histórico"
     - Grupo 3 (5 chaves): clarificar encounter
     - Grupo 5 (4 chaves): SessionHistory recap labels
     - Grupo 8 (20 chaves): outras com "sessão"
1.3. Aplicar mesmas alterações em `messages/en.json` com valores EN equivalentes
1.4. Adicionar a chave faltante `sheet` em pt-BR (Bug B02 do beta test —
     erro `MISSING_MESSAGE: sheet (pt-BR)` em /app/dashboard/campaigns)
1.5. Validar build: `rtk tsc --noEmit` — deve passar sem erros
1.6. Smoke test manual:
     - Abrir /app/dashboard — labels corretas (Combate, Histórico, etc)
     - Abrir /app/campaigns/[id] — sem "sessão" indevida
     - Abrir /app/session/[id] (combate ativo) — labels corretas
1.7. Commit: `feat(i18n): linguagem ubíqua — 83 chaves migradas`

### FASE 2 — Migração de Rotas (estimativa: 1 sessão)

⚠️ FASE CRÍTICA. Combate NÃO pode quebrar. Siga RIGOROSAMENTE os 8 passos
do doc de migração de rotas.

2.1. Criar branch: `git checkout -b refactor/session-to-combat-routes`
2.2. Executar Passo 1 (criar rotas novas como cópia)
2.3. Executar Passo 2 (redirect 301 nas rotas de PÁGINA, NÃO em APIs)
2.4. Executar Passo 3 (renomear pasta components/session → combat-session)
2.5. Executar Passo 4 (find & replace nas 65 referências — Grupos A, A2, B, C)
2.6. Executar Passo 5 (atualizar testes — Grupos D e D2)
2.7. Executar Passo 6 (rtk tsc --noEmit — DEVE passar)
2.8. Executar Passo 7 (rtk vitest run + rtk playwright test smoke)
2.9. Executar Passo 8 (smoke test manual completo do checklist)

### FASE 3 — Bug fixes técnicos rápidos (estimativa: 30min)

3.1. Bug B01: investigar /api/broadcast retornando 404 (4 ocorrências no log)
     - Verificar se rota existe em app/api/broadcast/route.ts
     - Se existe: investigar middleware/auth
     - Se não: criar handler ou remover refs
3.2. Bug B03: /opengraph-image.png 404
     - Verificar app/opengraph-image.tsx ou app/opengraph-image.png
     - Garantir que está sendo gerada corretamente
3.3. Commit: `fix(api): broadcast 404 + opengraph image`

## CHECKLIST DE SEGURANÇA (executar APÓS cada fase)

- [ ] Build limpo (`rtk tsc --noEmit`)
- [ ] Testes passando (`rtk vitest run`)
- [ ] Smoke test manual — combate ativo funciona
- [ ] Smoke test manual — player join funciona
- [ ] Smoke test manual — DM heartbeat funciona (verificar Network tab)
- [ ] Smoke test manual — sendBeacon disconnect funciona
- [ ] Grep final: `grep -rn "/app/session\|/api/session" --include="*.ts" --include="*.tsx" .` deve retornar APENAS:
  - Arquivos de redirect (page.tsx das rotas legadas)
  - Arquivos de proxy (route.ts das APIs legadas)
  - Comentários em docs/

## REGRAS DE COMUNICAÇÃO

- Reporte progresso ao final de cada FASE (1, 2, 3)
- Se encontrar AMBIGUIDADE no doc: PARE e pergunte. Não improvise.
- Se encontrar REFERÊNCIA NOVA não mapeada nos docs: documente, depois pergunte.
- Se um teste quebrar e você não sabe por quê: PARE. Não mascare. Pergunte.
- NUNCA pule etapas. NUNCA bypass --no-verify em commits.
- Use TodoWrite para tracking. Atualize em tempo real.

## CRITÉRIO DE SUCESSO

Migração está completa quando:
1. ✅ messages/pt-BR.json e en.json têm 83 chaves alteradas conforme doc
2. ✅ Rotas /app/combat/[id] e /app/combat/new funcionam
3. ✅ Rotas legadas /app/session/* redirecionam (status 307/308)
4. ✅ APIs /api/combat/[id]/* funcionam, /api/session/* funciona como proxy
5. ✅ Build limpo (`tsc --noEmit`)
6. ✅ Testes vitest passando
7. ✅ Combate ativo testado manualmente — DM + 1 player conectados, turno avança
8. ✅ Player desconecta e reconecta sem perda de estado
9. ✅ 3 commits criados (i18n, rotas, bugs)
10. ✅ Branch refactor/session-to-combat-routes pronta para PR

## SE ALGO QUEBRAR

Plano de recuperação:
1. NÃO faça force-push. NÃO faça reset --hard.
2. Se um único arquivo quebrou: revert apenas esse arquivo
3. Se a fase inteira quebrou: `git reset --soft HEAD~N` (N = número de commits da fase)
4. Se combate quebrou em produção: revert do PR é o caminho. Combate é sagrado.

Combate é o produto. Se ele quebra, nada mais importa.

## START

Comece lendo os 4 docs na ordem listada. Confirme entendimento ANTES de tocar
em qualquer arquivo. Use TodoWrite para criar o plano de tasks.
```

---

## Como usar este prompt

1. Abra uma sessão fresca de Claude Code no mesmo repositório
2. Cole o conteúdo dentro do bloco de código acima como primeiro prompt
3. O agente vai ler os 4 docs e te confirmar entendimento antes de executar
4. Se quiser executar em background/worktree, adicione no início:
   `"Trabalhe em um worktree isolado com isolation=worktree."`

## Variações úteis

**Para executar SÓ a migração i18n (mais segura):**
> Substituir "ORDEM DE EXECUÇÃO" pra ter apenas FASE 1, e remover FASE 2 e 3.

**Para executar SÓ a migração de rotas:**
> Adicionar pré-requisito: "FASE 1 (i18n) já foi executada e merged em master."

**Para dry-run (gerar PR mas não executar):**
> Adicionar no final: "NÃO faça commits. Liste TODAS as mudanças que faria em
> formato de diff resumido. Aguarde aprovação."
