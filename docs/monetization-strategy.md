# Estratégia de Monetização — Taverna do Mestre

**Autor:** Dani_
**Data:** 2026-03-26
**Status:** Rascunho / Ideação

---

## Modelo: Freemium + Módulos Pro

O combat tracker é o gancho gratuito. Módulos avançados são a receita.
Nenhum anúncio. Nunca degradar a experiência gratuita.

---

## Tier Gratuito (Free)

O tier gratuito deve ser **funcional o bastante** para que o mestre consiga rodar combates completos sem fricção. É a porta de entrada — quanto melhor, mais mestres entram no funil. Tudo no free é **efêmero** — funciona na sessão, mas não persiste entre sessões.

| Módulo | O que inclui |
|--------|-------------|
| **Combat Tracker** | Initiative, HP, conditions, turn order, undo — o core loop completo |
| **Player View** | Link direto sem conta — jogadores acessam HP, turno, combat log no celular |
| **Compendium (SRD)** | Monstros, magias, classes, itens — SRD 5.1 (2014) + SRD 5.2 (2024), CC-BY-4.0 |
| **Spell Oracle** | Busca rápida de magias com filtros, in-context durante combate |
| **Modo Visitante** | `/try` — testar sem conta, combate efêmero no browser |

### Limites do Free
- Sem campanhas — combates são efêmeros (não persiste jogadores, histórico ou estado entre sessões)
- Sem encounter presets salvos (pode criar, mas não persiste entre sessões)
- Sem export de dados (PDF, JSON)
- Player view básica (sem customização visual)

### Por que sem campanha no Free?
O mestre típico roda 1 campanha por vez. Campanha persistente (com jogadores pré-salvos, histórico de sessões, continuidade) é o diferencial que justifica a assinatura. O upsell é orgânico: o mestre roda um combate incrível no free, a sessão acaba, e ele pensa "quero continuar semana que vem de onde parei".

---

## Tier Pro (Assinatura Mensal)

A assinatura desbloqueia módulos que resolvem dores reais de mestres que jogam frequentemente. O mestre deve sentir que está pagando por **superpoderes**, não por features que deveriam ser grátis.

### Faixa de Preço Sugerida

| Referência de mercado | Preço |
|----------------------|-------|
| D&D Beyond Hero | $2.99/mês |
| Owlbear Rodeo Plus | $3.99/mês |
| D&D Beyond Master | $5.99/mês |
| Roll20 Plus | $5.99/mês |
| Alchemy RPG | $8.00/mês |
| Roll20 Pro | $10.99/mês |

**Sugestão para Taverna Pro:** **R$ 14,90/mês** ou **R$ 119,90/ano** (~2 meses grátis)

Posicionamento: abaixo da maioria dos concorrentes em dólar, competitivo no mercado BR. O preço em real remove a barreira do câmbio para o público brasileiro.

---

### Módulos Pro

#### 1. Campanha Persistente
- Campanha ativa com jogadores pré-salvos (o mestre típico roda 1 por vez)
- Histórico completo de sessões — continua semana que vem de onde parou
- Arquivo e restauração de campanhas antigas (read-only)

#### 2. Encounter Builder Avançado
- Presets de encontro salvos e reutilizáveis
- CR calculator automático (2014 + 2024)
- Templates de encontro (boss fight, emboscada, horde, puzzle combat)
- Duplicar e modificar encounters rapidamente

#### 3. Player View Premium
- Temas visuais por campanha (dark, parchment, elemental themes)
- Logo/banner customizado da campanha
- Notificações push para jogadores (início de sessão, seu turno)

#### 4. Export & Backup
- Export de sessão em PDF (combat log, resumo)
- Export de campanha em JSON (portabilidade total)
- Backup automático na nuvem

#### 5. Compendium Homebrew
- Criar e salvar monstros, magias e itens customizados
- Compartilhar homebrew com outros mestres (link direto)
- Importar homebrew de outros mestres

#### 6. Analytics de Sessão
- Duração média de combates
- Frequência de jogadores por sessão
- Magias/habilidades mais usadas
- Tendências ao longo da campanha

---

## Fase Futura (V2+) — Ideias para Explorar

Estas ideias dependem de massa crítica de usuários. Não priorizar agora.

| Ideia | Modelo | Notas |
|-------|--------|-------|
| **Marketplace de Conteúdo** | Comissão por venda (70/30 ou 80/20) | Mestres vendem encounters, mapas, NPCs, one-shots |
| **Módulos Avulsos** | Compra única (R$ 9,90–29,90) | Para mestres que não querem assinatura mensal |
| **Tier Mesa** | Assinatura de grupo | 1 mestre + até 6 jogadores, todos com Pro — preço reduzido por pessoa |
| **Integrações AI** | Add-on Pro ou tier superior | NPC generation, plot hooks, session recap automático |
| **Patrono / Apoie** | Voluntário (Ko-fi/Apoia.se) | Complementar, não primário — bom para goodwill da comunidade |

---

## Princípios de Monetização

1. **Nunca degradar o gratuito** — o free de hoje nunca vira pago amanhã
2. **Sem anúncios** — premium feel, sempre
3. **Transparência** — preços visíveis, sem dark patterns, cancel fácil
4. **Valor antes do paywall** — o mestre experimenta o valor e depois decide pagar
5. **Freemium como funil, não como isca** — o tier gratuito é um produto completo, não uma demo

---

## Funil de Conversão

```
Landing Page → "Testar Grátis" (sem conta)
  → Modo visitante (/try) — combate efêmero
    → Gostou? → Cria conta (Free) — combat tracker persistente na sessão
      → Quer salvar jogadores e continuar semana que vem? → Upsell contextual → Pro
        → Nudges naturais: "Salve sua campanha (Pro)", "Continue de onde parou (Pro)"
```

Upsells devem ser **contextuais e não-intrusivos**: aparecem quando o mestre tenta usar uma feature Pro (salvar campanha, exportar, preset), nunca como pop-up aleatório.

---

## Métricas de Sucesso

| Métrica | Target |
|---------|--------|
| Free → Conta criada | > 30% dos visitantes de /try |
| Free → Pro (30 dias) | > 5% |
| Churn mensal Pro | < 8% |
| LTV por assinante | > R$ 120 (8+ meses) |
| NPS dos assinantes Pro | > 50 |
