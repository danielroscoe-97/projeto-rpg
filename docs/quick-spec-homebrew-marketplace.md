# Quick Spec: Homebrew Marketplace

> **Horizonte:** 3.3 — Plataforma
> **Prioridade:** P3 — Revenue + community building
> **Estimativa:** ~20h (phased across 3 releases)
> **Data:** 2026-03-30

---

## Contexto

A tabela `homebrew` já existe (migration 026). `HomebrewCreator.tsx` e `StatBlockImporter.tsx` permitem DMs criarem conteúdo custom. Hoje é privado — apenas o criador vê. A evolução para marketplace cria um flywheel: criadores produzem conteúdo → DMs usam → mais DMs atraídos → mais criadores.

**Revenue model:** 70/30 split (criador 70%, Pocket DM 30%) — alinhado com monetization-strategy.md.

---

## Fase 1: Homebrew Compartilhável (Gratuito)

### Story 1.1: Flag de Publicação

**Implementação:**

1. Nova migration `043_homebrew_sharing.sql`:
```sql
ALTER TABLE homebrew ADD COLUMN is_public BOOLEAN DEFAULT false;
ALTER TABLE homebrew ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE homebrew ADD COLUMN description TEXT;
ALTER TABLE homebrew ADD COLUMN tags TEXT[] DEFAULT '{}';
ALTER TABLE homebrew ADD COLUMN downloads_count INTEGER DEFAULT 0;
ALTER TABLE homebrew ADD COLUMN rating_sum INTEGER DEFAULT 0;
ALTER TABLE homebrew ADD COLUMN rating_count INTEGER DEFAULT 0;
ALTER TABLE homebrew ADD COLUMN license TEXT DEFAULT 'cc-by-4.0';

CREATE INDEX idx_homebrew_public ON homebrew(is_public) WHERE is_public = true;
CREATE INDEX idx_homebrew_slug ON homebrew(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_homebrew_tags ON homebrew USING GIN(tags);
```

2. RLS para público:
```sql
-- Qualquer user logado pode ver homebrew público
CREATE POLICY "Anyone can view public homebrew"
  ON homebrew FOR SELECT
  USING (is_public = true OR user_id = auth.uid());
```

3. No HomebrewCreator, adicionar toggle "Tornar público":
   - Ao publicar, gerar slug automaticamente (slugify do nome)
   - Exigir description (mínimo 20 chars) e pelo menos 1 tag
   - Mostrar preview de como vai aparecer no marketplace

**AC:**
- [ ] DM pode marcar homebrew como público
- [ ] Homebrew público é visível para qualquer user logado
- [ ] Slug único gerado automaticamente
- [ ] Description e tags obrigatórios para publicar
- [ ] Downloads_count incrementa quando alguém usa

---

### Story 1.2: Página de Browse de Homebrew

**Rota:** `/app/homebrew` (ou `/app/compendium/homebrew`)

**Implementação:**

1. Listagem com filtros:
   - Search por nome
   - Filter por tags (monster, spell, item, encounter)
   - Sort por: mais recentes, mais baixados, melhor avaliados
   - Pagination

2. Card de homebrew:
```
┌──────────────────────────────────────┐
│ 🐉 Ancient Shadow Drake             │
│ by Dani_ · ⬇ 42 downloads · ⭐ 4.5  │
│ Tags: monster, cr15, undead          │
│ "A terrifying dragon of shadow..."   │
│ [Usar no combate]  [Ver detalhes]    │
└──────────────────────────────────────┘
```

3. Detalhe de homebrew:
   - Stat block completo (mesmo render de monsters SRD)
   - Botão "Adicionar ao encounter" (mesmo fluxo de adicionar SRD monster)
   - Rating (thumbs up/down simples)
   - Report (flag para admin review)

**AC:**
- [ ] Browse funcional com search, filters, sort
- [ ] Card mostra info essencial
- [ ] "Usar no combate" adiciona como combatant no encounter ativo
- [ ] Rating funcional (1 vote per user per homebrew)

---

## Fase 2: Coleção Pessoal + Fork

### Story 2.1: Salvar na Coleção

**Implementação:**

1. Nova tabela `homebrew_library`:
```sql
CREATE TABLE homebrew_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  homebrew_id UUID REFERENCES homebrew(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, homebrew_id)
);
```

2. Botão "Salvar na coleção" em cada homebrew público.
3. Tab "Minha Coleção" no homebrew browser (filtra por library).

**AC:**
- [ ] DM pode salvar homebrew de outros na sua coleção
- [ ] Coleção acessível rapidamente ao montar encounter
- [ ] Remover da coleção funciona

---

### Story 2.2: Fork (Criar Variante)

**Implementação:**

1. Botão "Criar variante" em qualquer homebrew:
   - Copia o conteúdo para o user
   - `forked_from` referencia o original
   - User pode editar livremente
   - Se publicar, mostra "Variante de [original] por [autor original]"

2. Campo na tabela:
```sql
ALTER TABLE homebrew ADD COLUMN forked_from UUID REFERENCES homebrew(id);
```

**AC:**
- [ ] Fork cria cópia editável
- [ ] Attribution do original é mantida
- [ ] Fork pode ser publicado independentemente

---

## Fase 3: Marketplace Pago (Futuro)

### Story 3.1: Pricing + Stripe Connect

> **Nota:** Esta fase depende de Stripe estar totalmente ativado e do volume de criadores justificar o investimento.

**Implementação conceitual:**

1. Criadores se registram como "sellers" via Stripe Connect (Express):
   - Onboarding Stripe simplificado
   - Pocket DM gerencia payouts

2. Homebrew pode ter preço:
   - Free (default)
   - Paid: R$1-50 (criador define)
   - "Pay what you want" (mínimo R$1)

3. Compra:
   - Checkout via Stripe
   - Após pagamento: homebrew adicionado à library
   - Split: 70% criador, 30% Pocket DM

4. Dashboard de criador:
   - Vendas, revenue, downloads
   - Payouts pendentes
   - Analytics de conteúdo

**AC (conceptual):**
- [ ] Stripe Connect onboarding funcional
- [ ] Pricing definível pelo criador
- [ ] Checkout funcional com split automático
- [ ] Dashboard de vendas para criador

---

## Regras do Marketplace

1. **Conteúdo SRD** (monsters/spells oficiais) NUNCA pode ser vendido — é CC-BY-4.0
2. **Homebrew** pode ser vendido se é criação original do autor
3. **Variantes/Forks** de conteúdo gratuito não podem ser vendidos
4. **Report + review:** Sistema de flags para conteúdo inapropriado/plagiado
5. **Quality bar:** Conteúdo pago precisa de stat block completo e validado
