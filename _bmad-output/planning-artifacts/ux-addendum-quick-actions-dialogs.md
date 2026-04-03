---
title: UX Addendum — Dialogs Criar NPC e Convidar Jogador
date: 2026-04-03
status: implemented
feature: dashboard-quick-actions-dialogs
---

# UX Addendum: Dialogs "Criar NPC" e "Convidar Jogador"

## Contexto

Os dois dialogs foram implementados funcionalmente mas precisam de polish visual para transmitir clareza de escolha, identidade por campanha e feedback de interação.

---

## Problemas Identificados

| # | Problema | Impacto |
|---|----------|---------|
| P1 | Ícone Map genérico para todas as campanhas — impossível diferenciá-las à primeira vista | Alto |
| P2 | Sem indicador de que o card é clicável/navegável (sem chevron) | Médio |
| P3 | Hover state fraco — só muda cor da borda | Médio |
| P4 | "1 jogadores" — pluralização errada | Baixo |
| P5 | NPC Global visualmente igual às opções de campanha — sem hierarquia | Médio |
| P6 | Empty state do invite sem CTA para criar campanha | Baixo |

---

## Decisões de Design

### D1 — Avatar de Campanha com Inicial

Substituir ícone Map genérico por **avatar circular com a primeira letra do nome da campanha**, com cor determinística baseada no nome (hash). Referência: Gmail, Linear, Notion.

- Cores disponíveis: amber, emerald, blue, purple, rose, cyan
- Função: `getCampaignColor(name)` com hash simples do nome
- Resultado: mesmo usuário sempre vê a mesma cor por campanha

### D2 — Chevron Right nos Cards

Adicionar `ChevronRight` alinhado à direita de cada card navegável. Sinal universal de "clique para ir a outro lugar".

### D3 — Hover State Rico

Trocar só `border-color` por um hover completo: fundo levemente mais claro + borda colorida + leve elevação via `shadow-sm`. Sensação de "levantamento" do card.

### D4 — NPC Global com Destaque

O card "NPC Global" tem uma função especial (reutilizável entre campanhas). Deve comunicar isso:
- Badge "Reutilizável" em azul
- Padding maior, borda com glow azul no hover
- Separador visual entre Global e lista de campanhas

### D5 — Pluralização Correta

"1 jogador" vs "N jogadores" — usar chave singular/plural existente.

### D6 — Empty State com CTA

Quando sem campanhas no dialog invite: link para `/app/onboarding` ou `/app/dashboard/campaigns`.

---

## Fluxos UX (As-Is → To-Be)

### Dialog "Convidar Jogador"

**Antes:**
```
[icon Map] Krynn          
           5 jogadores    
```

**Depois:**
```
[K] Krynn              →
    5 jogadores
```
_(K = inicial em círculo amber, → = ChevronRight, hover: fundo + borda emerald)_

### Dialog "Criar NPC"

**Antes:**
```
[Globe] NPC Global
        Disponível em qualquer campanha
---
Para a campanha
[Map] Krynn
      5 jogadores
```

**Depois:**
```
[Globe] NPC Global          [Reutilizável]
        Disponível em qualquer campanha    →
────────────────────────────────────────
Para a campanha
[K] Krynn                                 →
    5 jogadores
[A] Aventura Epica                        →
    1 jogador
```

---

## Implementação

Arquivo: `components/dashboard/QuickActions.tsx`

Changes:
1. `CampaignAvatar` component interno com hash de cor
2. `ChevronRight` em todos os cards
3. Hover state: `hover:bg-white/[0.03]` + border + `shadow-sm`
4. Badge "Reutilizável" no card global
5. Separador `<hr>` entre global e campanhas no dialog NPC
6. Pluralização via `campaigns_players_singular`
7. Empty state com link `<a>` para criar campanha
