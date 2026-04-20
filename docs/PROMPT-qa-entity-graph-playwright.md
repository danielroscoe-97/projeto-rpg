# Prompt — QA real + Playwright specs para Entity Graph

> **Para:** Nova sessão Claude Code no repositório `c:\Projetos Daniel\projeto-rpg`
> **Modelo sugerido:** Opus 4.7 (1M context) — precisa navegar vários arquivos
> **Pré-requisito:** Release Entity Graph Fases 3b–3f + Onda 6a em prod (commits `9468285e..da6a1b10` em `origin/master`, migrations 146–154 aplicadas)

---

## 🎯 COPY-PASTE: cole o bloco abaixo como PRIMEIRO prompt

```
Você vai fazer QA real do Entity Graph recém-entregue + escrever os primeiros
Playwright specs para essa feature. O Entity Graph (Fases 3b-3f + Onda 6a) foi
entregue em 12 commits entre 2026-04-20 e 2026-04-21, passou por 5 reviews
adversariais e está em produção. Nunca foi testado end-to-end em browser real.

## CONTEXTO

- PocketDM (pocketdm.com.br) — Next.js App Router + TypeScript + Supabase
- PT-BR primary (83% BR). Regras imutáveis em `CLAUDE.md` (Combat Parity,
  Resilient Reconnection, SRD Compliance, SEO Canonical, RTK)
- Entity Graph é Auth-only, campaign-scoped. Guest/anon NÃO têm acesso.
- Migrations 146 (cycle trigger), 147 (scope guard), 148 (relationship set),
  152 (cascade + unique), 153 (note_npc_links migration), 154 (scope hardening)
  todas em prod via `supabase db push --linked`.

## DOCS DE REFERÊNCIA (ler primeiro)

1. `docs/SPEC-entity-graph-implementation.md` — ACs numerados (AC-3b-01..REG-05)
2. `docs/PRD-entity-graph.md` §7 (fluxos UX) + §9 (critérios de aceitação)
3. `CLAUDE.md` — regras de Combat Parity + Resilient Reconnection
4. `e2e/features/*.spec.ts` — padrão dos E2E existentes (seguir o estilo)

## FASE 1 — QA MANUAL (via Playwright MCP em staging)

Use o Playwright MCP (browser_navigate, browser_click, browser_type,
browser_snapshot) para rodar os fluxos abaixo em uma campanha de teste.

Se você não tiver credenciais de staging, PARE e peça ao Daniel.

### Fluxo 1 — Hierarquia de locais (AC-3b-01..10)
1. Login como DM
2. Abrir campanha de teste → aba Locais
3. Criar local raiz "Porto Azul" (tipo `city`)
4. Criar sub-local "Taverna do Pêndulo" (tipo `building`) com pai="Porto Azul"
5. Verificar árvore: "Taverna do Pêndulo" aparece indentada sob "Porto Azul"
6. Clicar chevron de "Porto Azul" → filhos colapsam/expandem
7. Abrir detalhe de "Taverna do Pêndulo" → breadcrumb mostra "Porto Azul › Taverna do Pêndulo"
8. Editar "Porto Azul" → dropdown "Local pai" NÃO lista "Taverna do Pêndulo" (filtro de ciclo)
9. Tentar criar outro "Porto Azul" no mesmo nível → erro de duplicata
10. Deletar "Porto Azul" → modal alerta "Este local tem 1 sub-local. Ele virará local raiz."
11. Confirmar → "Taverna do Pêndulo" agora é raiz (parent_location_id = NULL)

### Fluxo 2 — NPC ↔ Location (AC-3c-01..06)
1. Criar NPC "Viktor" com Morada="Taverna do Pêndulo"
2. Card de Viktor mostra chip "Taverna do Pêndulo" com ícone MapPin
3. Abrir card expandido de "Taverna do Pêndulo" → seção "Habitantes" lista "Viktor"
4. Contador "1 habitante" no badge do card de location
5. Editar Viktor, trocar morada pra outro local → chip atualiza, reverse lookup atualiza
6. Double-click rápido em Save → apenas 1 edge criada (idempotência)

### Fluxo 3 — Facções (AC-3d-01..05)
1. Criar facção "Círculo da Rosa Negra" (alignment `neutral`)
2. Adicionar 5 NPCs como membros (multi-select)
3. Adicionar 1 local como sede
4. Card da facção mostra: count "5 membros" + badge sede com nome do local
5. Expandir → lista de membros como chips
6. Abrir ficha de um membro → chip "Membro de: Círculo da Rosa Negra"
7. Abrir location da sede → seção "Facções sediadas" lista "Círculo da Rosa Negra"
8. Deletar a facção → triggers mig 152 limpam todas edges (verificar no banco)

### Fluxo 4 — Notas linkadas (AC-3e-01..05)
1. Criar nota "O taverneiro" com:
   - NPC linkado: Viktor (via NpcTagSelector existente)
   - Locais linkados: Taverna do Pêndulo (via EntityTagSelector novo)
   - Facções linkadas: Círculo da Rosa Negra
   - Quests: (se houver)
2. Abrir card do Viktor → seção "Notas sobre isto" lista a nota
3. Abrir card da Taverna → idem
4. Abrir card da facção → idem
5. Deletar a nota → chips desaparecem de todos os 3 cards

### Fluxo 5 — Mind Map focus (Onda 6a)
1. No card de Viktor, clicar no ícone Network (canto superior direito)
2. URL muda para `/app/campaigns/<id>?section=mindmap&focus=npc-<viktor-id>`
3. Mind Map abre COM foco:
   - Viktor + vizinhança visíveis (opacity 1)
   - Outros nós dimmed (opacity 0.25)
   - Edges não-conectadas a Viktor com opacity 0.12
   - Camera centraliza em Viktor (zoom 1.15, duração 450ms)
4. Chip amarelo "Focado em: Viktor ✕" aparece acima do gráfico
5. Clicar no X → URL remove ?focus= e mapa volta ao normal
6. Ativar filtro "Ocultar NPCs" COM focus em Viktor → banner vermelho "Filtro está ocultando esta entidade"
7. Clicar "Clear focus" no banner → limpa focus + mantém filtro

### Fluxo 6 — View switcher + filtros (Fase 3f)
1. Aba Locais → alternar Árvore / Lista / Por tipo
2. Persistência: fechar/abrir campanha, voltar na mesma aba → modo preservado
3. Aba NPCs → filtrar por facção + por local simultaneamente
4. Recarregar página → filtros preservados

### Fluxo 7 — Combat Parity (REGRESSÃO CRÍTICA)
1. Abrir `/try` como guest → verificar que NÃO há UI de Entity Graph
2. Entrar em `/join/<token>` como anônimo → verificar que NÃO há acesso
3. Confirmar que reconexão resiliente não quebrou (abrir DevTools, simular
   network offline por 10s, verificar reconnect)

## FASE 2 — CRIAR PLAYWRIGHT SPECS

Para cada fluxo validado acima, criar um spec em `e2e/features/`.

Padrão: seguir `e2e/features/audio-broadcast.spec.ts` ou
`e2e/features/active-effects.spec.ts` como modelos. Use:
- `data-testid` existentes (todos os novos componentes têm testids como
  `location-tree-row-<id>`, `npc-morada-chip-<id>`, `mindmap-focus-chip`,
  `mindmap-focus-clear`, `location-open-in-map-<id>`, etc)
- Setup em `e2e/setup.ts` se necessário
- Credenciais via variáveis de ambiente (seguir padrão existente)

Specs a criar (mínimo):
1. `e2e/features/entity-graph-location-hierarchy.spec.ts`
2. `e2e/features/entity-graph-npc-location-link.spec.ts`
3. `e2e/features/entity-graph-faction-members.spec.ts`
4. `e2e/features/entity-graph-note-mentions.spec.ts`
5. `e2e/features/entity-graph-mindmap-focus.spec.ts`
6. `e2e/features/entity-graph-combat-parity.spec.ts` (regressão guest/anon)

Cada spec tem que:
- Fazer login como DM via helper de auth existente
- Criar entidades de teste + cleanup no afterEach
- Usar `data-testid` em vez de selectors frágeis
- Rodar em CI sem flake (timeouts generosos mas não ocultar bugs)

## FASE 3 — REPORTAR

Ao final, crie `docs/QA-REPORT-entity-graph-<yyyy-mm-dd>.md` com:
- ✅ / ❌ por AC numerado (AC-3b-01 até REG-05)
- Screenshots de bugs encontrados (browser_take_screenshot)
- Regressões em outros flows (combat, reconexão, oracle)
- Performance observada (tempos de load, transições)
- Lista de Playwright specs criados + status (passou/falhou/skip)

## REGRAS

- NÃO criar dados em produção — use staging
- Se encontrar BLOCKER, PARE e reporte antes de continuar
- Se encontrar bug, crie issue no padrão do repo antes de seguir
- Use `rtk` prefix em todos os comandos bash (`rtk npm run test:e2e`, etc)
- Commit messages em inglês (padrão do repo)

## CRITÉRIO DE SUCESSO

- Fluxos 1-7 executados em browser real, todos com pass/fail documentado
- Mínimo 6 Playwright specs novos em `e2e/features/`
- `rtk npm run test:e2e -- entity-graph` passa em CI
- Relatório `docs/QA-REPORT-entity-graph-<data>.md` completo
- Zero regressão em flows pré-existentes (combat, reconexão, Oracle Ctrl+K)

## START

1. Leia os 4 docs de referência
2. Use TodoWrite com 1 task por Fluxo + 1 task por spec
3. Comece pelo Fluxo 7 (Combat Parity) — se quebrar, é BLOCKER
4. Depois Fluxos 1-6 em ordem
5. Crie specs em paralelo conforme valida cada fluxo
6. Entregue o relatório + commits separados por fluxo
```

---

## Como usar

1. Abra NOVA janela Claude Code em `c:\Projetos Daniel\projeto-rpg`
2. Cole o bloco entre as aspas triplas
3. Se Playwright MCP não estiver configurado, primeiro configure conforme
   `docs/mcp-setup.md` (ou equivalente)
4. O agente vai:
   - Ler os docs
   - Rodar QA via browser_* tools em staging
   - Criar 6 specs E2E
   - Entregar relatório

## Tempo estimado

- Fase 1 (QA manual): 1-2 sessões
- Fase 2 (specs): 1-2 sessões
- Fase 3 (relatório): 0.5 sessão

Total: **3-5 sessões**, ou menos se rodar em paralelo por fluxo (worktrees).

## O que eu garanto estando em produção

- Migrations 146-154 aplicadas ✅
- Todos os componentes shipado (ver `git log --grep=entity-graph`)
- 5 reviews adversariais completas (findings documentadas em commits)
- 130 failing / 1439 passing no Jest baseline (pré-existentes, não-Entity-Graph)
