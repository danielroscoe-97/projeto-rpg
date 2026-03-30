# Value Proposition Canvas — Pocket DM

> **Objetivo:** Mapear exatamente por que cada persona escolhe o Pocket DM e o que precisamos entregar para cada uma.
> **Data:** 2026-03-30

---

## Persona 1: Rafael (DM — Mesa Presencial)

### Customer Profile

**Jobs to be Done:**
1. Gerenciar combate fluido para 5-6 jogadores sem interromper a narrativa
2. Consultar stat blocks e regras instantaneamente durante o combate
3. Montar encounters em menos de 5 minutos antes da sessão
4. Manter tracking de HP, condições e initiative de 8-15 combatants simultaneamente
5. Compartilhar estado do combate com jogadores sem verbalizar tudo

**Pains:**
- Perde 2-3 minutos por combate trocando entre 3-5 tabs/ferramentas
- Esquece condições aplicadas porque tracking é manual
- Players perguntam "de quem é a vez?" a cada turno (quebra imersão)
- Precisa parar o combate para consultar uma regra/spell
- Setup de encounter demora 10+ minutos em ferramentas complexas
- Multi-monster encounters viram bagunça (3 goblins = "Goblin 1, 2, 3")

**Gains esperados:**
- Sessão inteira sem abrir outra aba
- Players sabem o turno antes do DM anunciar
- Consulta de spells em <10 segundos sem sair do combate
- Impressionar os jogadores com organização e fluidez

### Value Map

**Pain Relievers:**
| Pain | Solução Pocket DM |
|------|-------------------|
| 3-5 tabs abertas | Tudo em 1 tela: combat + oracle + player sync |
| Esquece condições | Badges visuais + counter por turno + ícones |
| "De quem é a vez?" | Real-time sync → player vê no celular antes de DM anunciar |
| Parar pra consultar regra | Modal overlay — spell/stat block SEM sair do combate |
| Setup 10+ min | ≤3 min: search monster, adicionar, set initiative, start |
| Multi-monster bagunça | Display names customizáveis + grouping + collective initiative |

**Gain Creators:**
| Gain esperado | Como entregamos |
|---------------|----------------|
| Sessão sem trocar aba | Zero-navigation oracle (inline stat blocks, modal spells) |
| Players informados | Real-time broadcast → initiative board no celular |
| Consulta instantânea | Fuse.js search ≤300ms, cached em IndexedDB |
| Impressionar jogadores | Dark+gold UI premium + soundboard + "Master your table" |

---

## Persona 2: Camila (Player — Celular na Mesa)

### Customer Profile

**Jobs to be Done:**
1. Saber de quem é o turno sem perguntar ao DM
2. Consultar spells rapidamente quando for sua vez
3. Acompanhar o HP do grupo (quem precisa de heal?)
4. Entrar na sessão sem fricção (sem login, sem instalar app)

**Pains:**
- Precisa perguntar ao DM "é minha vez?" (constrangedor, quebra fluxo)
- Abrir D&D Beyond pra ler spell description demora e distrai
- Não sabe se o tank está com HP baixo (anti-metagaming do DM)
- Precisa criar conta em mais uma plataforma

**Gains esperados:**
- Acompanhar o combate no celular sem atrapalhar
- Consultar spell rapidamente sem interromper ninguém
- Sentir que faz parte da ação (não só esperando o turno)

### Value Map

**Pain Relievers:**
| Pain | Solução Pocket DM |
|------|-------------------|
| "É minha vez?" | Initiative board real-time no celular — vê antes do DM falar |
| Spell lookup lento | Oracle modal touch-friendly, search por nome |
| Não sabe HP do grupo | HP bars visíveis para PCs (números completos) + status tiers para monstros |
| Mais uma conta | Zero login — entra via link/QR code |

**Gain Creators:**
| Gain esperado | Como entregamos |
|---------------|----------------|
| Acompanhar combate | PlayerInitiativeBoard com turno highlight + round counter |
| Spell rápido | Search Fuse.js ≤300ms + modal com touch targets 44px |
| Fazer parte da ação | Turn notification + upcoming banner + sound effects |

---

## Persona 3: Guest/Visitante (Funil de Conversão)

### Customer Profile

**Jobs to be Done:**
1. Experimentar a ferramenta antes de se comprometer
2. Rodar um combate rápido para avaliar se vale a pena
3. Decidir se vale criar conta

**Pains:**
- Maioria das ferramentas exige cadastro para testar QUALQUER coisa
- Ferramentas "free" são tão limitadas que não dá pra avaliar de verdade
- Não quer dar email para "mais um site"

**Gains esperados:**
- Testar a experiência REAL (não uma demo limitada)
- Decidir baseado em experiência própria, não em marketing

### Value Map

**Pain Relievers:**
| Pain | Solução Pocket DM |
|------|-------------------|
| Cadastro obrigatório | Guest mode — 60 minutos SEM login |
| Demo limitada | Experiência COMPLETA: combat, oracle, monsters, spells |
| Medo de spam | Zero dados coletados no guest mode |

**Gain Creators:**
| Gain esperado | Como entregamos |
|---------------|----------------|
| Teste real | /try com guided tour + combate completo |
| Decisão informada | Após 60 min → modal de conversão com proposta clara |
| Transição suave | Estado do combate preservado → migra pós-signup (H1.2) |

---

## Proposta de Valor por Canal

### Para DMs (Aquisição)

> **Headline:** "Run your combat in one screen. No tabs. No setup hell."
>
> **Subheadline:** "Free combat tracker for D&D 5e. Your players follow the action on their phones."
>
> **3 Bullets:**
> 1. Combat + rules oracle + player sync — one screen
> 2. Players join via link — no accounts needed
> 3. 2014 + 2024 SRD — both versions, your choice

### Para Players (Viral)

> **Headline:** "Follow the combat on your phone"
>
> **Subheadline:** "Your DM shared a link. Tap to see whose turn it is, check spells, and stay in the action."
>
> **1 Bullet:** No app download. No account. Just tap and play.

### Para Reddit/Communities (Organic)

> **Headline:** "I built a combat tracker that doesn't suck"
>
> **Body:** "I was tired of juggling D&D Beyond, a spreadsheet, and 5e.tools every session. So I built a combat tracker where everything is in one screen — and my players can follow the combat on their phones in real time. Free, no login required for players."

---

## Métricas de Validação da Proposta de Valor

| Proposta | Métrica de Validação | Target |
|----------|---------------------|--------|
| "Sem trocar aba" | % de DMs que NÃO abrem outra tab durante sessão | >70% |
| "Players acompanham" | % de sessões com ≥1 player conectado | >60% |
| "Setup ≤3 min" | Tempo médio de setup (analytics) | ≤3 min |
| "Spell em <10s" | Tempo médio de search-to-result | <5s |
| "Experimente grátis" | % de visitors que completam 1 combate no /try | >30% |
| "Vale criar conta" | Conversão guest → signup | >15% |
| "Vale pagar" | Conversão free → Pro (quando ativado) | >5% |

---

## Anti-Propostas (O que NÃO somos)

| NÃO somos | Por quê |
|-----------|---------|
| VTT com mapas e tokens | Isso é Roll20/Foundry. Competir = perder |
| Character builder | Isso é D&D Beyond. Complementar, não substituir |
| Plataforma de play online | Isso é Roll20/Fantasy Grounds. Somos mesa presencial |
| Repositório de conteúdo | Isso é 5e.tools. Temos oracle, não enciclopédia |
| Rede social de RPG | Isso é StartPlaying/Reddit. Foco em utilidade |

**Mantra:** "Faz UMA coisa e faz bem. O resto é V3."

---

## Data de criação
2026-03-30
