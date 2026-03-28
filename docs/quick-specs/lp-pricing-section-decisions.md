# LP Pricing Section — Decisões de Design e Produto

**Data:** 2026-03-27
**Autores:** Sally (UX), John (PM), validado por Dani_
**Status:** Implementado

---

## Objetivo

Adicionar seção de preços na landing page com dois propósitos:
1. **Eliminar objeção** — comunicar que tudo está liberado durante o beta
2. **Plantar expectativa** — mostrar que existe um plano Pro futuro, com preço real

---

## Decisões de Produto (John)

| Decisão | Racional |
|---------|----------|
| **Beta banner acima dos cards** | Primeira coisa que o usuário vê — elimina a objeção de custo antes de processar qualquer informação de pricing |
| **Preço real no Pro (R$ 14,90/mês)** | Transparência gera confiança. Usuário sabe exatamente o que vai custar quando sair do beta. Evita surpresa |
| **Pro "(em breve)" sem CTA** | Mostra roadmap sem criar dead-end click. Comunica valor futuro sem frustrar |
| **Free como CTA principal** | O funil atual é: LP → /try (guest) ou /auth/sign-up. Free é a ação imediata |
| **Sem toggle mensal/anual na LP** | Simplificação. A página /pricing já tem o toggle completo. LP deve ser rápida e decisiva |
| **Seção posicionada entre Comparativo e CTA final** | Fluxo natural: features → compara → preços → converte |

---

## Decisões de Design (Sally)

### Layout

```
[Banner Beta — full width, gold gradient]
[Heading: "Simples e transparente."]
[Card Free (ativo)]  [Card Pro (dimmed)]
```

- **Desktop:** grid 2 colunas, cards lado a lado
- **Mobile:** cards empilhados, Free primeiro (é a ação)

### Hierarquia Visual

| Elemento | Tratamento | Justificativa |
|----------|------------|---------------|
| Banner beta | `bg-gradient gold/10`, borda `gold/30`, sparkle emoji | Chama atenção sem parecer alerta. Comunica abundância, não escassez |
| Card Free | Borda gold, botão gold preenchido, hover ring | É o CTA principal. "Isso é pra mim AGORA" |
| Card Pro | `opacity-60`, sem botão, sem hover | Reforço visual de "indisponível". Informativo, não acionável |
| Badge "(em breve)" | Pill `bg-gold/20 text-gold` no topo do card | Indicador claro sem poluir o layout |

### Tokens Utilizados

- Fundo seção: `bg-[#0d0d14]` (mais escuro que body para separar)
- Heading: `font-cinzel text-gold`
- Body text: `font-sans text-muted-foreground`
- Card: `bg-card border border-border rounded-2xl`
- CTA botão: `bg-gold text-[#13131E] hover:bg-gold/90`

### Anti-padrões Evitados

- ❌ Pricing table com checkmarks verde/vermelho (complexidade desnecessária)
- ❌ "Preço a definir" no Pro (gera incerteza)
- ❌ Card Pro clicável sem destino (dead-end = frustração)
- ❌ Toggle mensal/anual na LP (atrito desnecessário neste contexto)
- ❌ Hover effects no card Pro (reforço errado — sugere interatividade)

### Acessibilidade

- Badge "(em breve)" com `aria-label` descritivo
- Card Pro com `aria-disabled="true"`
- Contraste gold sobre dark atende WCAG AA
- Sem `animate-pulse` em texto (só em ícone decorativo)

---

## i18n

Novas chaves criadas sob namespace `lp_pricing` em `messages/pt-BR.json` e `messages/en.json`.
Reutiliza features do Pro já existentes no namespace `pricing.pro_features`.

---

## Referências

- [Estratégia de Monetização](../monetization-strategy.md) — modelo freemium, pricing, racional
- [Brand Guide](../brand-guide.md) — paleta, tipografia, tokens visuais
- Página de pricing completa: `/pricing` (com toggle mensal/anual e FAQ)
