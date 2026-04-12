# Estrategia Multi-Sistema — Pocket DM

> **Data:** 2026-04-11
> **Status:** Planejamento (P2 — maio/junho 2026)
> **Autores:** BMAD Party Mode (Mary + John + Winston + Sally)

---

## 1. VISAO GERAL

Expandir o Pocket DM alem de D&D 5e, comecando com **Tormenta 20** (segundo maior RPG do Brasil), para triplicar o mercado acessivel e posicionar o produto como "Combat Tracker para RPG de Mesa" (nao apenas D&D).

### Por que Multi-Sistema?

| Razao | Impacto |
|-------|---------|
| D&D 5e e ~60% do mercado — 40% joga outros sistemas | Acesso a publicos inteiramente novos |
| Tormenta 20 tem zero ferramentas digitais dedicadas | Oceano azul identico ao D&D 5e PT-BR |
| Reposiciona a marca de "D&D tool" para "RPG tool" | Mais resiliente a mudancas da WotC |
| Comunidade Tormenta e ativa e engajada | Potencial viral alto no nicho BR |
| Demonstra ambicao e diferenciacao | Separacao competitiva do MasterApp |

---

## 2. TORMENTA 20 — PRIMEIRO SISTEMA ADICIONAL

### Dados de Mercado

| Dado | Valor |
|------|-------|
| Editora | Jambo Editora (Sao Paulo) |
| Base de jogadores estimada BR | 200-500K |
| Posicao no mercado BR | Segundo maior RPG (atras de D&D) |
| Licenca aberta | **Sim** — T20 Comunidade (similar ao SRD) |
| Comunidade online | Discord Tormenta (~15K), Reddit r/Tormenta, grupos Facebook |
| Ferramentas digitais existentes | **NENHUMA relevante** |

### Compatibilidade Tecnica com D&D 5e

| Conceito | D&D 5e | Tormenta 20 | Compativel? |
|----------|--------|-------------|-------------|
| HP (Hit Points) | Sim | Sim (PV — Pontos de Vida) | Identico |
| AC (Armor Class) | Sim | Sim (Defesa) | Identico (nome diferente) |
| Initiative | d20 + modifier | d20 + modifier | Identico |
| Conditions | 14 condicoes SRD | Set diferente (ex: Abalado, Atordoado) | Array configuravel |
| Dice system | d20 system | d20 system | Identico |
| Death saves | 3 saves / 3 fails | Regra diferente (0 PV = dying) | Precisa toggle |
| Spell slots | Nivel 1-9 | Mana points (PM) | UI diferente |
| Challenge Rating | CR numerico | ND (Nivel de Desafio) | Rename suficiente |

**Conclusao:** ~80% do combat tracker funciona sem mudanca. O esforco real e curar dados e ajustar condicoes/terminologia.

### Licenca T20 Comunidade

A Jambo permite uso nao-comercial e comercial sob a licenca T20 Comunidade, desde que:
- Mencione que o conteudo e baseado em Tormenta 20 da Jambo Editora
- Inclua a atribuicao de licenca
- NAO reproduza o texto integral dos livros (apenas dados/stats mecanicos)

**Acao necessaria:** Ler a licenca completa e garantir compliance antes de publicar conteudo T20.

---

## 3. ESTRATEGIA DE CONTATO COM A JAMBO

### Abordagem: Bottom-Up (Comunidade Primeiro, Editora Depois)

#### Fase 1 — Comunidade (Semanas 1-4)
1. Entrar no Discord Tormenta e grupos Facebook RPG BR
2. Observar por 1-2 semanas — entender a cultura, dores, ferramentas usadas
3. Postar mostrando o Pocket DM rodando um combate de T20 (mesmo que mockado)
4. Coletar feedback e pedidos da comunidade
5. Documentar: prints, comentarios positivos, pedidos de feature

#### Fase 2 — Prototipo Publico (Semanas 4-8)
1. Lancar MVP com conditions T20 + bestiario basico (dados T20 Comunidade)
2. Blog post: "Pocket DM agora suporta Tormenta 20!"
3. Post no Discord/Facebook: "Fizemos o que a comunidade pediu"
4. Coletar metricas de uso (quantos combates T20 rodaram?)

#### Fase 3 — Contato com a Jambo (Mes 3+)
1. **Email introdutorio** para contato@jfrpg.com.br ou redes sociais da Jambo
2. **Pitch:**
   - "Sou o Daniel, criador do Pocket DM — combat tracker gratuito para RPG de mesa"
   - "Lancamos suporte a Tormenta 20 a pedido da comunidade"
   - "X mestres ja estao usando para T20"
   - "Gostariam de conversar sobre parceria oficial?"
3. **O que oferecer:**
   - Ferramenta digital gratuita que FALTA no ecossistema T20
   - Visibilidade: compendio publico, blog posts, social media
   - Co-marketing: "Compativel com Tormenta 20" com logo da Jambo
   - Dados de uso (anonimizados) sobre engajamento da comunidade
4. **O que pedir:**
   - Licenca formal para uso do conteudo T20 Comunidade no app
   - Endorsement oficial (mesmo que sutil — tweet, menção)
   - Acesso antecipado a conteudo novo (T20 2e, suplementos)
   - Possibilidade de link/menção no site oficial da Jambo

### Anti-Patterns — EVITAR

- NAO abordar a Jambo sem ter prototipo funcional e metricas
- NAO pedir licenca para conteudo que ja e aberto (T20 Comunidade)
- NAO prometer features que nao pode entregar (solo dev)
- NAO copiar texto dos livros — apenas stats mecanicos e nomes
- NAO ignorar a comunidade — eles sao os verdadeiros evangelistas

---

## 4. ARQUITETURA TECNICA — MULTI-SISTEMA

### Fase 1: MVP (2-3 semanas de dev)

```
abstractions necessarias:
├── GameSystem config (novo)
│   ├── id: "dnd5e" | "tormenta20" | ...
│   ├── name: "D&D 5e" | "Tormenta 20"
│   ├── conditions[]: array de condicoes por sistema
│   ├── stats: { hp: "HP"/"PV", ac: "AC"/"Defesa", ... }
│   ├── deathSaves: boolean (D&D=true, T20=false)
│   └── spellResource: "slots" | "mana"
├── Combat session
│   └── game_system: FK → game_systems.id
├── Compendium toggle
│   └── sistema selecionado filtra bestiary/spells
└── Landing page
    └── Multi-tab: [D&D 5e] [Tormenta 20] [Em breve...]
```

### Fase 2: Dados (1-2 semanas)

```
dados T20 necessarios:
├── monsters-t20.json (bestiario basico T20 Comunidade)
│   └── ~100-200 criaturas iniciais
├── conditions-t20.json (condicoes de T20)
│   └── Abalado, Apavorado, Atordoado, Caido, Cego, etc.
├── spells-t20.json (magias T20 basicas)
│   └── Stats mecanicos apenas (nao texto descritivo)
└── classes-t20.json (classes T20)
    └── Arcanista, Barbaro, Bardo, Bucaneiro, etc.
```

### Fase 3: UI (1 semana)

```
mudancas de UI:
├── Setup de combate: dropdown "Sistema" (D&D 5e / Tormenta 20)
├── Conditions picker: muda lista baseado no sistema
├── Labels: HP→PV, AC→Defesa, CR→ND (baseado no sistema)
├── Compendium: tab "Tormenta 20" com dados T20
└── Guest mode (/try): toggle de sistema
```

### Migration

```sql
-- Novo campo na tabela sessions
ALTER TABLE sessions ADD COLUMN game_system TEXT DEFAULT 'dnd5e';

-- Tabela de sistemas (referencia)
CREATE TABLE game_systems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]',
  stat_labels JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO game_systems VALUES 
  ('dnd5e', 'D&D 5e', '[...]', '{"hp":"HP","ac":"AC","cr":"CR"}'),
  ('tormenta20', 'Tormenta 20', '[...]', '{"hp":"PV","ac":"Defesa","cr":"ND"}');
```

---

## 5. LANDING PAGE — REPOSICIONAMENTO

### Antes
> "Combat Tracker para D&D 5e"

### Depois
> "Combat Tracker para RPG de Mesa"

Com sistema-tabs visuais:
```
[D&D 5e ✓] [Tormenta 20 ✓] [Pathfinder 2e — em breve] [GURPS — em breve]
```

Cada tab mostra:
- Monstros especificos do sistema
- Condicoes do sistema
- Screenshot do combat tracker com terminologia do sistema
- CTA especifico ("Experimente com Tormenta 20")

---

## 6. CONTEUDO + SEO

### Blog Posts Multi-Sistema (prioridade por impacto SEO)

| Post | Keyword | Prioridade |
|------|---------|-----------|
| "Tormenta 20: Guia de Combate para Mestres" | tormenta 20 combate | P0 |
| "5 Ferramentas Gratuitas para Mestre de Tormenta 20" | ferramentas tormenta 20 | P1 |
| "Pocket DM: Agora com Suporte a Tormenta 20" | pocket dm tormenta 20 | P1 |
| "Como Agilizar Combate em Tormenta 20" | agilizar combate tormenta | P2 |

### E-Book Multi-Sistema

| E-Book | Publico | Momento |
|--------|---------|---------|
| "Guia Tormenta 20: Combate Eficiente" | DM T20 | Apos lancamento T20 no app |

---

## 7. TIMELINE

| Quando | O que | Prioridade |
|--------|-------|-----------|
| Semana 3-4 abril | Entrar no Discord Tormenta + observar | P1 |
| Maio (semana 1-2) | Prototipo MVP: conditions T20 + toggle | P2 |
| Maio (semana 3-4) | Dados: bestiario T20 basico (~100 criaturas) | P2 |
| Junho | LP reposicionada + blog posts T20 | P1 |
| Junho | Post comunidade: "T20 no Pocket DM" | P1 |
| Julho+ | Contato Jambo (com metricas e prototipo) | P2 |

---

## 8. SISTEMAS FUTUROS (BACKLOG)

| Sistema | Mercado | Licenca | Esforco | Prioridade |
|---------|---------|---------|---------|-----------|
| Pathfinder 2e | Global, #2 mundial | ORC License (aberta) | Medio — similar a D&D | P3 |
| GURPS | Nicho, loyal fanbase | SJG Online Policy | Baixo — generico | P4 |
| Call of Cthulhu | Medio, crescendo | Chaosium Community License | Medio | P4 |
| Ordem Paranormal | BR, crescendo rapido | A verificar | Medio | P3 |
| Old Dragon 2 | BR, classico | A verificar | Baixo — OSR | P4 |

**Nota sobre Ordem Paranormal:** Sistema brasileiro com fanbase jovem e massiva (Cellbit). Potencialmente o segundo sistema BR apos T20, mas a licenca precisa ser verificada.

---

> **Proxima revisao:** Apos entrada na comunidade Tormenta (final de abril 2026)
