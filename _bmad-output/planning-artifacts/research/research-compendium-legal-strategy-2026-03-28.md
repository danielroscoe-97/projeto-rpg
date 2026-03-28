# Pesquisa: Estratégia Legal do Compêndio — SRD, 5etools e Importação de Conteúdo

**Data:** 2026-03-28
**Status:** Especificação aprovada — aguardando implementação
**Autor:** Dani_ + BMAD Agents (Mary, John, Winston)

---

## Contexto do Problema

O produto atualmente usa apenas conteúdo SRD (334 monstros, 319 magias por versão) sob CC-BY-4.0. Para competir com ferramentas como D&D Beyond e 5etools, precisamos dar acesso ao compêndio completo (~2.000+ monstros) sem incorrer em risco jurídico significativo.

**Pergunta central:** Como oferecer acesso ao compêndio completo de monstros/magias desvinculando o pagamento da assinatura desse acesso?

---

## 1. Panorama Legal

### 1.1 O que é Protegido por Copyright

| Elemento | Protegido? | Justificativa |
|---|---|---|
| Valores numéricos de stat blocks (CA, PV, atributos) | ❌ Não | Mecânicas de jogo — *Baker v. Selden* (1879) |
| Regras e fórmulas de jogo | ❌ Não | Procedimentos funcionais |
| Textos descritivos / flavor text | ✅ Sim | Expressão criativa original |
| Lore e histórias de monstros | ✅ Sim | Expressão criativa original |
| Artwork e ilustrações | ✅ Sim | Obras artísticas |
| Nomes proprietários (Beholder, Mind Flayer) | ✅ Sim | Trademarks da WotC |
| Organização/seleção criativa de compilação | ⚠️ Zona cinzenta | Pode ter proteção como compilação |

### 1.2 SRD sob Creative Commons (CC-BY-4.0)

- **SRD 5.1** (2014) e **SRD 5.2** (2024) foram liberados sob CC-BY-4.0 em fevereiro de 2023
- Licença **irrevogável** — WotC não pode revogar
- Inclui: ~320 monstros, ~400 magias, regras básicas, uma subclasse por classe
- **Fora do SRD:** maioria dos monstros de Mordenkainen's, Volo's, aventuras, settings proprietários

### 1.3 Status Legal do 5etools

- Site de código aberto que agrega **todo** o conteúdo publicado de D&D 5e
- Opera **sem autorização** da WotC — zona cinzenta legal
- Repositório GitHub derrubado múltiplas vezes por DMCA da WotC/Hasbro
- Ressurge sob novos repositórios/domínios
- **Não é fonte legalmente segura para uso comercial**

### 1.4 Precedentes de Apps Derrubados

| Produto | Modelo | Resultado |
|---|---|---|
| **5th Edition Spellbook** (Android) | Conteúdo completo embutido | **Removido** do Google Play por DMCA |
| **Fight Club 5e** (Lion's Den, iOS) | SRD + importação XML pelo usuário | **Sobreviveu** — app no ar há anos |
| **Foundry VTT** | SRD embutido + módulos da comunidade | **Sobreviveu** — nunca apontou pro 5etools |
| **D&D Beyond** | Licenciamento formal (propriedade da WotC) | Único 100% legal |
| Apps pequenos com tudo embutido | Conteúdo completo embutido | Muitos desaparecem silenciosamente |

**Lição-chave:** A Apple/Google não revisam proativamente copyright de D&D. Enforcement é reativo via DMCA. App estar no ar ≠ ser legal.

---

## 2. Decisão Estratégica

### Modelo Escolhido: SRD Embutido + Importação Genérica pelo Usuário

Baseado no modelo comprovado do **Foundry VTT + Plutonium** e do **Fight Club 5e**:

```
┌──────────────────────────────────────────────────────────┐
│                    NOSSO PRODUTO                          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  CAMADA 1 — Conteúdo Base (nós fornecemos)               │
│  ✅ SRD 5.1 completo (CC-BY-4.0) — 334 monstros         │
│  ✅ SRD 5.2 completo (CC-BY-4.0) — magias e regras      │
│  ✅ Homebrew engine (criação de monstros pelo usuário)    │
│                                                           │
│  CAMADA 2 — Conteúdo Importado (usuário fornece)         │
│  ✅ Importador genérico de URL ou arquivo JSON            │
│  ✅ Aceite obrigatório de responsabilidade                │
│  ✅ Dados ficam APENAS na conta do usuário                │
│  ❌ Nunca no nosso DB compartilhado                       │
│  ❌ Nunca sugerimos fontes específicas na interface       │
│                                                           │
│  CAMADA 3 — Funcionalidades Premium (o que vendemos)     │
│  💎 IA do Mestre                                         │
│  💎 Gerador de encontros avançado                        │
│  💎 Automação de combate                                 │
│  💎 Cards pináveis estilo 5etools (Epic 9)               │
│  💎 Mapas e efeitos visuais                              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Princípio Fundamental

> **A assinatura paga por funcionalidades, não por dados.**
> O conteúdo importado alimenta as features — as features são o valor real.

---

## 3. Spec: Tela de Importação de Conteúdo Externo

### 3.1 Fluxo do Usuário

```
1. Usuário acessa "Importar Conteúdo" (menu ou settings)
2. Vê campo de URL com placeholder rotativo (ver 3.2)
3. Cola uma URL ou faz upload de arquivo JSON
4. Aceita termos de responsabilidade (checkbox obrigatório)
5. Sistema faz fetch client-side, parseia os dados
6. Dados são salvos localmente (IndexedDB / conta do usuário)
7. Feature flag "extended_compendium" é ativada para esse usuário
8. Monstros/magias importados ficam disponíveis em buscas e encontros
```

### 3.2 Placeholder Rotativo com Exemplos de Sites

> **⚠️ NOTA DE RISCO:** Esta decisão foi tomada conscientemente para a fase de desenvolvimento/beta fechado. Antes do lançamento público, reavaliar se os placeholders com sites reais devem ser mantidos ou substituídos por URL genérica (`https://exemplo.com/dados.json`).

**Implementação:** O campo de URL exibe um placeholder que alterna entre exemplos de sites a cada ~3 segundos:

```
Textos que alternam no placeholder:
─────────────────────────────────────────────
"Ex: https://5e.tools/data/bestiary/"
"Ex: https://roll20.net/compendium/dnd5e/"
"Ex: https://dnd5e.wikidot.com/monsters"
"Ex: https://open5e.com/api/monsters/"
"Ex: https://www.dndbeyond.com/monsters"
"Ex: https://5esrd.com/database/creature/"
─────────────────────────────────────────────
```

**Comportamento:**
- Placeholder alterna com fade transition suave (300ms)
- Ciclo: a cada 3 segundos muda para o próximo exemplo
- Ordem embaralhada aleatoriamente a cada sessão
- Ao focar o campo, o placeholder para de animar e some (comportamento padrão)

### 3.3 Aceite de Responsabilidade

```
┌──────────────────────────────────────────────────┐
│  Importar Conteúdo Externo                        │
│                                                    │
│  URL: [https://5e.tools/data/bestiary/       🔄] │
│       (placeholder rotativo)                       │
│                                                    │
│  — ou —                                            │
│                                                    │
│  [📁 Upload arquivo JSON]                          │
│                                                    │
│  Formatos aceitos: JSON (5etools, Open5e, custom)  │
│                                                    │
│  ☐ Confirmo que possuo direitos de uso sobre       │
│    este conteúdo e assumo total responsabilidade   │
│    pela sua importação. Este conteúdo será         │
│    armazenado apenas na minha conta pessoal.       │
│                                                    │
│         [Importar]  (desabilitado sem aceite)       │
└──────────────────────────────────────────────────┘
```

### 3.4 Parser Genérico Multi-Formato

O parser deve reconhecer automaticamente o formato da fonte:

| Fonte | Formato | Detecção |
|---|---|---|
| 5etools | JSON com campo `"monster"` array | Presença de `monster[].name`, `monster[].hp.formula` |
| Open5e API | JSON com campo `"results"` array | Presença de `results[].slug`, `results[].hit_points` |
| Custom/Homebrew | JSON com schema flexível | Mapeamento manual ou schema adapter |
| SRD 5e-database | JSON com schema MongoDB-style | Presença de `index`, `hit_points` com nested object |

**Normalização:** Todos os formatos são convertidos para o schema interno do produto (mesmo formato dos monstros SRD já existentes).

### 3.5 Armazenamento

- **Client-side:** IndexedDB no navegador do usuário
- **Server-side (se sync entre dispositivos):** Dados encriptados na conta do usuário, isolados, nunca compartilhados
- **Separação clara:** Monstros SRD vs. importados têm flag `source: 'srd' | 'imported'`
- **Busca unificada:** Monstros importados aparecem junto com SRD nas buscas, com badge indicando a fonte

### 3.6 Feature Flag

- Quando o usuário importa conteúdo com sucesso, a flag `extended_compendium` é ativada para essa conta
- Essa flag **não está vinculada ao plano de assinatura** — qualquer usuário (free ou pro) pode importar
- A flag habilita: exibição de monstros importados nas buscas, uso em encontros, stat blocks expandidos

---

## 4. O Que NÃO Fazemos

| Ação Proibida | Motivo |
|---|---|
| Embutir dados do 5etools no produto | Redistribuição de conteúdo protegido |
| Armazenar dados importados em DB compartilhado | Nos torna distribuidores do conteúdo |
| Mencionar "5etools" em documentação oficial | Facilitação de infração (contributory infringement) |
| Ter API própria servindo conteúdo não-SRD | Distribuição direta |
| Cachear conteúdo importado no servidor sem encriptação | Responsabilidade por armazenamento |

---

## 5. Estratégia de Mitigação da Comunidade

> A comunidade faz o marketing da importação — nós não.

| Canal | Quem faz | Nosso envolvimento |
|---|---|---|
| Tutorial "como importar do 5etools" | Comunidade (Reddit, Discord, YouTube) | Zero — não produzimos nem incentivamos |
| Repositório com dados pré-formatados | Comunidade (GitHub) | Zero — não mantemos nem linkamos |
| FAQ "posso usar dados do 5etools?" | Nós (de forma neutra) | "O importador aceita qualquer JSON no formato compatível" |
| Discord do produto | Comunidade se ajuda | Não moderamos discussões sobre fontes de dados |

---

## 6. Fontes Legais de Dados SRD

Para o conteúdo base do produto (Camada 1):

| Fonte | URL | Formato | Licença |
|---|---|---|---|
| SRD 5.1 oficial | wotc.com | PDF | CC-BY-4.0 |
| SRD 5.2 oficial | wotc.com | PDF | CC-BY-4.0 |
| Open5e API | open5e.com | REST API JSON | OGL / CC-BY-4.0 |
| 5e-database | github.com/5e-bits/5e-database | JSON/MongoDB | CC-BY-4.0 |

---

## 7. Régua de Risco — Resumo Executivo

| Abordagem | Risco Legal | Status |
|---|---|---|
| SRD embutido (CC-BY-4.0) | 🟢 Mínimo | ✅ Já implementado |
| Importação genérica pelo usuário | 🟢 Baixo | 📋 Especificado neste doc |
| Placeholder rotativo com sites | 🟡 Baixo-Moderado | 📋 Aprovado para beta fechado |
| Sugerir 5etools explicitamente na UI | 🔴 Alto | ❌ Rejeitado |
| Dados do 5etools embutidos | 🔴 Muito Alto | ❌ Rejeitado |
| Licenciamento formal com WotC | 🟢 Mínimo | 🔮 Futuro (se escalar) |

---

## 8. Decisões Pendentes para Lançamento Público

- [ ] Reavaliar se placeholder rotativo deve manter sites reais ou usar URL genérica
- [ ] Definir se importação é feature free ou pro-only
- [ ] Definir política de moderação do Discord sobre fontes de dados
- [ ] Consultar advogado sobre compliance com lei brasileira (LGPD + direito autoral)
- [ ] Avaliar viabilidade de licenciamento formal com WotC se o produto escalar

---

## 9. Relação com Épicos Existentes

| Épico | Relação |
|---|---|
| **Epic 9** — Monster & Spell Cards (5etools style) | Cards pináveis funcionam com monstros SRD E importados |
| **C.1.1** — Feature Flags | Flag `extended_compendium` usa o sistema já especificado |
| **Story 4.1** — SRD Client-Side Search | Busca precisa ser expandida para incluir IndexedDB de importados |
| **Story 4.2** — Monster Search & Stat Block | Stat block precisa renderizar monstros importados no mesmo formato |

---

*Documento gerado a partir de sessão de pesquisa e discussão entre agentes BMAD (Mary, John, Winston) em 2026-03-28.*
