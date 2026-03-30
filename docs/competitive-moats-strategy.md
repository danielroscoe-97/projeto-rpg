# Estratégia de Moats Competitivos — Pocket DM

> **Objetivo:** Mapear vantagens defensáveis, vulnerabilidades, e como expandir os moats ao longo do tempo.
> **Data:** 2026-03-30

---

## Nossos Moats Atuais

### MOAT 1: Real-Time Combat Broadcast (FORTE)

**O que é:** DM gerencia combate → Players veem em tempo real no celular. HP, turno, condições — tudo sincronizado via WebSocket.

**Por que é defensável:**
- Complexidade técnica: broadcast sanitization (anti-metagaming), optimistic UI, reconnect resilience, hidden combatants
- Nenhum combat tracker do mercado tem isso (Shieldmaiden tem "player display" mas é tela separada, não real-time sync)
- MasterApp não tem sync player nenhum
- D&D Beyond Maps VTT tem sync mas dentro do VTT (não é companion)

**Risco:** D&D Beyond pode implementar isso no rebuild (~2027). Mitigação: teremos 12+ meses de polish e user base até lá.

**Como expandir:**
- H2.2 Edge Functions → sanitização server-side (segurança real)
- H2.1 PWA offline queue → funciona mesmo sem WiFi
- H3.1 API pública → terceiros constroem em cima do nosso broadcast

---

### MOAT 2: Zero-Friction Player Access (MÉDIO)

**O que é:** Player entra via link/QR code. Sem login, sem app, sem cadastro. Abre no celular e está dentro.

**Por que é defensável:**
- MasterApp exige login para players (fricção)
- D&D Beyond exige conta + ownership de livros
- Roll20 exige conta
- Foundry depende de quem hospeda
- Nosso guest mode + session tokens = experiência mais fluida do mercado

**Risco:** Fácil de copiar tecnicamente. First-mover advantage importa mais que dificuldade técnica.

**Como expandir:**
- QR code na mesa (já temos `qrcode` lib)
- Guest → Account migration (H1.2 — preservar estado do combate)
- Deep linking para campanhas recorrentes

---

### MOAT 3: Dual SRD Versioning (MÉDIO)

**O que é:** 2014 e 2024 coexistem como first-class data. DM pode misturar versões no mesmo combate.

**Por que é defensável:**
- D&D Beyond BOTCHED isso em 2024 → 40k cancellations por forçar update
- Nenhuma outra ferramenta trata versões como equals
- Nosso modelo de dados (unique constraint `name, version`) é correto desde o início
- Combatant pode trocar versão mid-combat (`combat:version_switch`)

**Risco:** D&D Beyond está consertando isso no rebuild. Mas nossa abordagem de tratar como "mesma entidade, versões diferentes" é filosoficamente superior.

**Como expandir:**
- Quando 5.5e/6e vier, adicionar como terceira versão sem breaking change
- H3.2 Multi-system → expandir versioning para PF2e

---

### MOAT 4: In-Person First Design (MÉDIO)

**O que é:** Todo o UX é otimizado para DM no laptop + players no celular NA MESMA MESA. Não é VTT online retrofitted.

**Por que é defensável:**
- Nenhum concorrente foi desenhado para mesa presencial
- Decisões de UX (dark mode para sala escura, touch targets 44px, keyboard shortcuts para DM) são resultado de design intencional
- Difícil de retrofit (Roll20/Foundry precisariam redesenhar tudo)

**Risco:** Conceito é fácil de entender mas difícil de executar bem. Se alguém competente tentar, pode copiar.

**Como expandir:**
- H2.1 PWA → "instalar no celular" = permanente na home screen
- Audio/soundboard → imersão na mesa
- NFC tags para join? (futuro distante)

---

### MOAT 5: Simplicidade Radical (FILOSÓFICO)

**O que é:** Faz UMA coisa (combat tracking) e faz bem. Não tenta ser VTT, character builder, map editor, ou plataforma social.

**Por que é defensável:**
- Concorrentes não conseguem simplificar (feature bloat é caminho de menor resistência)
- Roll20 adicionou features por 10 anos e agora é complexo demais
- Foundry é poderoso MAS ninguém usa sem 30min de setup
- Owlbear Rodeo provou que simplicidade atrai (mas não tem combat tracking)

**Risco:** Pressão interna para adicionar features pode diluir. Disciplina é o moat real.

**Como proteger:**
- Cada feature passa pelo filtro: "Isso REDUZ tempo olhando pra tela?"
- Se a resposta é não, é V3+ no máximo
- Setup ≤3 min é NFR inviolável

---

## Vulnerabilidades

### V1: Sem Conteúdo Licenciado Oficial
- Fantasy Grounds tem 3000+ produtos oficiais (D&D, Pathfinder, CoC)
- D&D Beyond tem todos os livros da WotC
- Nós temos apenas SRD (CC-BY-4.0) = ~25% do conteúdo total de D&D
- **Mitigação:** Homebrew marketplace (H3.3) + content import (já existe StatBlockImporter)

### V2: Solo Dev / Time Pequeno
- D&D Beyond tem time da WotC/Hasbro
- Roll20 tem 50+ funcionários
- Nós: 1 dev + agentes AI
- **Mitigação:** Stack zero-ops (Supabase + Vercel). AI agents para velocity. Escopo narrow.

### V3: Sem Maps/VTT
- Muitos DMs querem maps (Theater of the Mind é minoria)
- Não planejar maps pode limitar TAM
- **Mitigação:** Não competir nesse espaço. Integrar com Owlbear Rodeo ou Foundry via API (H3.1)

### V4: Dependência do Supabase Realtime
- Toda a feature killer (broadcast) depende de um serviço managed
- Se Supabase mudar pricing ou tiver outage, afeta tudo
- **Mitigação:** H2.2 architecture permite migration para outro provider (Ably, Pusher). Combat-persist.ts já faz backup local

---

## Matriz Competitiva Visual

```
                 SIMPLES ────────────────── COMPLEXO
                    │                          │
           Pocket DM ●                         │
    MESA      │      Owlbear ●                 │
  PRESENCIAL  │                 Shieldmaiden ● │
              │                                │
              │         Alchemy ●              │
              │                                │
              │                     Roll20 ●   │
    ONLINE    │                                │
              │              D&D Beyond ●      │
              │                    Foundry ●   │
              │         Fantasy Grounds ●      │
              │                                │
```

**Pocket DM ocupa o quadrante "Simples + Mesa Presencial" sozinho.**

---

## Playbook Competitivo por Cenário

### Se D&D Beyond lança VTT completo (~2027):
- Não competir em features. Dobrar em simplicidade + velocidade
- "Setup em 3 minutos vs 30 minutos do D&D Beyond"
- API pública para integrar COM D&D Beyond (import characters)

### Se Shieldmaiden adiciona real-time sync:
- Já teremos 12+ meses de polish e user base
- Diferenciar com: anti-metagaming (HP status tiers), dual versioning, soundboard, AI oracle
- Open source deles = mais lento para iterar

### Se Fantasy Grounds captura mercado presencial:
- FG é desktop-only, UI datada
- Nosso mobile-first + zero-friction player join é impossível de retrofit
- Posicionar como "companion" que funciona COM FG, não contra

### Se novo entrante (startup bem-fundada) tenta o mesmo espaço:
- First-mover advantage + brand recognition no nicho
- Community + homebrew marketplace = network effects defensáveis
- API pública + ecossistema = lock-in suave

---

## Prioridades de Defesa

| Prioridade | Ação | Horizonte | Moat que protege |
|------------|------|-----------|-----------------|
| 1 | Estabilidade E2E + security | H1 | Confiança (users não voltam após crash) |
| 2 | PWA + offline | H2 | In-person first (WiFi ruim na mesa) |
| 3 | API pública | H3 | Ecossistema (terceiros constroem em cima) |
| 4 | Homebrew marketplace | H3 | Network effects (conteúdo atrai users) |
| 5 | Multi-system (PF2e) | H3 | TAM expansion (não só D&D) |

---

## Data de criação
2026-03-30
