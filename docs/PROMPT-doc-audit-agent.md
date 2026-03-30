# Mega-Prompt: Auditoria Documental Completa — Pocket DM

> **Objetivo:** Você é um agente de auditoria documental. Sua missão é fazer um cruzamento completo entre a documentação existente do projeto Pocket DM e o código real implementado, identificar divergências, atualizar documentos desatualizados, e criar um índice de referência unificado para que futuros agentes encontrem informações rapidamente.

---

## Contexto do Projeto

**Pocket DM** é um combat tracker gratuito para D&D 5e. O DM gerencia combate no laptop, jogadores acompanham pelo celular em tempo real via Supabase Realtime.

### Filosofia Core (IMUTÁVEL — valide que toda documentação reflete isso)

1. **Simplicidade acima de tudo.** Nossa hipótese central é que concorrentes (Roll20, Foundry, Alchemy) erram ao criar plataformas complexas e robustas tentando suprir tudo. Isso gera complexidade que afasta jogadores casuais. O Pocket DM resolve com simplicidade radical — faz UMA coisa (combat tracking) e faz bem.

2. **Mesa presencial primeiro.** O app complementa o jogo presencial, não o substitui. O celular do jogador é uma extensão da mesa, não uma tela principal. A interação social da mesa é sagrada — o app deve REDUZIR tempo gasto olhando pra telas, não aumentar.

3. **Anti-metagaming como feature de produto.** Jogadores NUNCA veem dados numéricos exatos de monstros (HP, AC, DC). Veem apenas labels de status (LIGHT/MODERATE/HEAVY/CRITICAL). Isso preserva a tensão narrativa e a autoridade do DM.

4. **Zero fricção para experimentar.** Guest mode de 60 minutos sem login como funil de conversão. O jogador entra via link/QR code sem cadastro. O DM pode usar sem pagar.

5. **Mobile-first para jogadores, desktop-first para DM.** Duas experiências distintas otimizadas para cada contexto de uso.

6. **Referências visuais:** Liberty Ragnarok Online (UI principal), Kastark + 5e.tools (UX de combate). Pixel art 16-bit para ícones e elementos visuais.

---

## Sua Missão (Passo a Passo)

### FASE 1: Leitura e Mapeamento (NÃO pule esta fase)

Leia TODOS estes documentos na ordem indicada. Para cada um, anote internamente:
- Data de criação/última atualização
- Decisões de negócio/design contidas
- Regras de jogo/produto definidas
- Se parece atualizado ou obsoleto

#### 1.1 Documentos Fundacionais (ler primeiro)
```
_bmad-output/project-context.md              — Contexto técnico para agentes
_bmad-output/planning-artifacts/prd.md       — Product Requirements Document
_bmad-output/planning-artifacts/architecture.md — Arquitetura técnica
_bmad-output/planning-artifacts/ux-design-specification.md — Especificação UX
_bmad-output/planning-artifacts/epics.md     — Lista de épicos
_bmad-output/planning-artifacts/epics-v2-stories.md — Stories detalhadas
```

#### 1.2 Documentos de Produto e Negócio
```
docs/brand-guide.md                          — Guia de marca (Pocket DM)
docs/monetization-strategy.md                — Estratégia de monetização
docs/analytics-funnel-strategy.md            — Funil de conversão
docs/hp-status-tiers-rule.md                 — Regra imutável dos tiers de HP
docs/rpg-visual-language-spec.md             — Linguagem visual RPG
docs/rpg-visual-architecture.md              — Arquitetura visual
docs/monster-token-fallback-rules.md         — Regras de tokens de monstro
docs/tech-stack-libraries.md                 — Stack tecnológico e libs
```

#### 1.3 Épicos e Sprints (ler para entender evolução)
```
docs/epics-and-sprints-spec.md               — Spec de épicos e sprints
docs/epics-stabilization-simplification.md   — Épico de estabilização
docs/prd-stabilization-simplification.md     — PRD de estabilização
docs/prd-v2.md                               — PRD v2
docs/epic-campaign-dual-role.md              — Épico de dual-role
docs/epic-campaign-dual-role-addendum.md     — Adendo dual-role
```

#### 1.4 Quick Specs (features implementadas)
```
docs/quick-spec-combat-ux-batch2.md
docs/quick-spec-combat-ux-fixes.md
docs/quick-spec-dm-soundboard.md
docs/quick-spec-rejoin-dm-approval.md
docs/quick-specs/*.md                        — Todos os quick specs
```

#### 1.5 Sprints e QA (ler para entender estado atual)
```
docs/v2-sprint-2026-03-27.md
docs/b-stream-sprint-2026-03-27.md
docs/sprint-audio-feedback-2026-03-28.md
docs/quality-sprint-2026-03-26.md
docs/sprint-stabilization-execution-report.md
```

#### 1.6 Memória do Projeto (regras persistentes)
```
C:\Users\dani_\.claude\projects\c--Users-dani--Downloads-projeto-rpg\memory\MEMORY.md
```
Leia o MEMORY.md e TODOS os arquivos .md referenciados nele.

### FASE 2: Análise do Código Atual

Depois de ler toda a documentação, analise o código para verificar o que realmente existe:

#### 2.1 Estrutura real vs documentada
```bash
# Mapear estrutura real de diretórios
find app/ -name "page.tsx" -o -name "route.ts" | sort
find components/ -maxdepth 1 -type d | sort
find lib/ -maxdepth 1 -type d | sort
ls supabase/migrations/
```

#### 2.2 Features implementadas vs documentadas
- Verificar se CADA feature mencionada nos épicos/PRD existe no código
- Verificar se há features NO CÓDIGO que não estão documentadas
- Verificar broadcast events: `grep -r "combat:" lib/types/realtime.ts` vs documentado no project-context
- Verificar stores Zustand: `ls lib/stores/` vs documentado
- Verificar rotas API: `find app/api -name "route.ts"` vs documentado

#### 2.3 Regras de negócio no código
- HP tiers: verificar `lib/utils/hp-status.ts` — os thresholds batem com `docs/hp-status-tiers-rule.md`?
- Anti-metagaming: verificar `lib/realtime/broadcast.ts` — sanitização bate com o documentado?
- Guest mode: verificar se o timer de 60 min existe e funciona conforme documentado
- Player view: o que o player realmente vê vs o que está documentado no UX spec?

#### 2.4 i18n keys vs features
- Comparar namespaces em `messages/pt-BR.json` com features reais
- Identificar keys órfãs (existem no JSON mas não são usadas no código)
- Identificar strings hardcoded (existem no código mas não no JSON)

### FASE 3: Relatório de Divergências

Produza um relatório organizado em categorias:

#### 3.1 Divergências Críticas
Features documentadas que NÃO existem no código, ou o código faz algo diferente do documentado em aspectos que afetam a experiência do usuário ou regras de jogo.

#### 3.2 Documentação Obsoleta
Documentos que descrevem features/arquitetura que mudou significativamente desde que foram escritos. Incluir o que mudou.

#### 3.3 Features Não Documentadas
Código que implementa funcionalidades significativas sem documentação correspondente.

#### 3.4 Inconsistências entre Documentos
Quando dois documentos dizem coisas diferentes sobre a mesma feature/regra.

#### 3.5 Filosofia vs Implementação
Pontos onde a implementação atual pode estar divergindo da filosofia de simplicidade/mesa presencial. **PERGUNTE AO USUÁRIO** antes de classificar como bug — pode ser uma decisão consciente.

### FASE 4: Atualização Documental

Para cada divergência encontrada, **PERGUNTE AO USUÁRIO** antes de fazer mudanças:
- "O código está certo e a doc precisa atualizar?" OU
- "A doc está certa e o código tem um bug?"

Depois de alinhar com o usuário:

#### 4.1 Atualizar `_bmad-output/project-context.md`
Este é o documento mais importante — é o que outros agentes leem primeiro. Deve refletir o estado REAL do projeto.

Pontos a verificar e atualizar:
- Lista de broadcast events (novos eventos adicionados?)
- Lista de stores (novos stores?)
- Estrutura de diretórios (novas rotas, componentes?)
- Stack tecnológico (novas libs?)
- Regras de implementação (novas regras aprendidas?)

#### 4.2 Atualizar documentos individuais
Cada documento que precisa de atualização — faça a mudança mínima necessária. Não reescrever documentos inteiros, apenas corrigir as divergências.

#### 4.3 Criar `docs/index.md`
Um índice mestre que lista TODOS os documentos do projeto com:
- Caminho do arquivo
- Descrição em 1 linha
- Categoria (fundacional / produto / técnico / sprint / QA / spec)
- Status (atual / precisa-revisão / obsoleto)

Este índice é o que futuros agentes devem consultar PRIMEIRO.

### FASE 5: Validação Final

Depois de fazer todas as atualizações:

1. Releia o `project-context.md` atualizado e verifique se ele SOZINHO dá a um novo agente contexto suficiente para implementar código correto neste projeto.

2. Verifique se o `docs/index.md` permite encontrar qualquer informação em no máximo 2 saltos (index → documento).

3. Liste qualquer decisão que ficou ambígua e precisa de clarificação do usuário.

---

## Regras de Operação

- **NUNCA invente informação.** Se não tem certeza, pergunte.
- **NUNCA delete documentos.** Marque como obsoleto se necessário.
- **SEMPRE preserve decisões de design.** Se algo parece errado mas foi uma decisão consciente, documente o rationale.
- **Priorize project-context.md.** É o documento que mais impacta a qualidade do trabalho de agentes futuros.
- **Comunique em português brasileiro.**
- **Faça uma fase de cada vez.** Não pule para atualizações antes de ter o relatório completo de divergências.
- **Pergunte quando tiver dúvidas.** É melhor interromper e perguntar do que assumir errado.

---

## Output Esperado

Ao final, o usuário deve ter:
1. Relatório de divergências (Fase 3)
2. `project-context.md` atualizado e preciso
3. `docs/index.md` como índice mestre
4. Documentos individuais corrigidos onde necessário
5. Lista de decisões pendentes que precisam de clarificação
