# Diagramas & Máquinas de Estado — Mermaid

**Prereq:** [PRD §A3](./PRD-EPICO-CONSOLIDADO.md)
**Uso:** transcrever no FigJam via `generate_diagram` MCP tool quando Figma plugin destravar; ou renderizar inline (GitHub suporta Mermaid).

---

## 1. Máquina de estado — Modo Combate Auto

```mermaid
stateDiagram-v2
    [*] --> Leitura
    Leitura --> Combate: broadcast combat:started
    Leitura --> Combate: polling combat_active=true
    Combate --> Leitura: broadcast combat:ended
    Combate --> Leitura: polling combat_active=false
    Combate --> Leitura: timeout sem update 5min (safety)
    Combate: banner + badge ⚡ + layout swap
    Leitura: layout normal + tabs default
```

**Eventos:**
- `combat:started` — realtime, latência <2s
- `polling combat_active` — fallback 10s
- `timeout` — safety quando realtime falha por muito tempo

---

## 2. Fluxo — Primeiro acesso ao Player HQ

```mermaid
flowchart LR
    A["Dashboard — clique no card da campanha"] --> B{"Membro da campanha?"}
    B -->|"Não"| B1["Redirect /campaigns/id (view geral)"]
    B -->|"Sim"| C{"Tem personagem?"}
    C -->|"Não"| C1["Redirect wizard de criação"]
    C -->|"Sim"| D["Render /sheet default tab=Herói"]
    D --> E{"Primeira visita?"}
    E -->|"Sim"| F["PlayerHqTourProvider auto-inicia"]
    F --> G["Tour 4 steps: Herói, Arsenal, Diário, Mapa"]
    G --> H["Flag tour_completed=true"]
    E -->|"Não"| I["Restaurar tab salva (se <24h)"]
    H --> J["Jogador em Herói"]
    I --> J
```

---

## 3. Fluxo — Usar magia em combate (happy path)

```mermaid
flowchart TD
    A["Jogador em Herói (combate ativo)"] --> B["Identifica slot disponível na Col B"]
    B --> C["Click em dot cheio do slot nível X"]
    C --> D["Optimistic: dot vira vazio"]
    D --> E["Ribbon atualiza resumo de slots"]
    E --> F{"Spell tem concentração?"}
    F -->|"Não"| G["Pronto"]
    F -->|"Sim"| H{"Já concentra em outra?"}
    H -->|"Não"| I["Click + Efeito → adiciona conc"]
    H -->|"Sim"| J["Toast: 'Trocar concentração?'"]
    J -->|"Confirma"| K["Remove conc antiga + adiciona nova"]
    J -->|"Cancela"| L["Slot reverte (undo)"]
    I --> G
    K --> G
```

---

## 4. Fluxo cross-mode — Mestre inicia combate + Jogador responde

```mermaid
sequenceDiagram
    participant M as Mestre (run mode)
    participant S as Supabase realtime
    participant J as Jogador (journey mode)
    participant C as /app/combat/id

    M->>S: Click "Iniciar Combate"
    S->>S: UPDATE campaigns SET combat_active=true
    S->>S: INSERT combats (...)
    S-->>M: combat:started broadcast
    S-->>J: combat:started broadcast
    J->>J: useCampaignCombatState detecta
    J->>J: Badge ⚡ em Herói + Banner aparece
    J->>J: Click "Entrar no Combate →" (opcional)
    J->>C: Navega /app/combat/id
    C->>S: Subscribe ao combat channel
    C->>C: Jogador vê iniciativa + turnos
    M->>C: Broadcast combat:turn-advance
    C-->>J: Update turno atual
    M->>S: Click "Encerrar Combate"
    S-->>M: combat:ended
    S-->>J: combat:ended
    S-->>C: combat:ended
    C->>J: Redirect de volta pra journey (opcional)
    J->>J: Banner fade-out, layout restore
```

---

## 5. Máquina de estado — Nota rápida em combate

```mermaid
stateDiagram-v2
    [*] --> OffScreen
    OffScreen --> Open: FAB click OR tecla N
    Open --> Typing: user começa a digitar
    Typing --> Saved: Enter (se não-vazio)
    Typing --> OffScreen: Esc (descarta)
    Typing --> OffScreen: Blur (descarta se vazio, salva se cheio)
    Saved --> OffScreen: Fade-out 300ms
    Saved: Toast "Nota salva em Diário"
    Open: Overlay leve, não esconde combate
    Typing: Input focado, count chars visível
```

---

## 6. Fluxo — Reconexão zero-drop (regra Resilient Reconnection)

```mermaid
flowchart TD
    A["Jogador em Herói (combate ativo)"] --> B["Fecha browser"]
    B --> C["Reabre em outro device"]
    C --> D["Login (cookie persistente)"]
    D --> E["Dashboard mostra campanha AO VIVO"]
    E --> F["Click no card"]
    F --> G{"sessionStorage state?"}
    G -->|"Sim"| H["Restore imediato + sync background"]
    G -->|"Não"| I["localStorage 24h TTL?"]
    I -->|"Sim"| J["Restore parcial + sync completo"]
    I -->|"Não"| K["Skeleton + full fetch"]
    H --> L["Render Player HQ + detecta combat_active"]
    J --> L
    K --> L
    L --> M["Modo Combate Auto re-ativa se ativo"]
    M --> N["Jogador está onde parou"]
```

---

## 7. Diagrama — Topologia 7 tabs → 4 tabs (transformação)

```mermaid
flowchart LR
    subgraph "Antes 7 tabs"
        A1[Mapa]
        A2[Ficha]
        A3[Recursos]
        A4[Habilidades]
        A5[Inventário]
        A6[Notas]
        A7[Quests]
    end

    subgraph "Depois 4 tabs"
        B1[Herói ⚔]
        B2[Arsenal 🎒]
        B3[Diário 📖]
        B4[Mapa 🗺]
    end

    A2 --> B1
    A3 --> B1
    A4 -->|"habilidades de combate"| B1
    A4 -->|"passivas + features"| B2
    A5 --> B2
    A6 --> B3
    A7 --> B3
    A1 --> B4
```

---

## 8. Fluxo — Descanso longo (reset de recursos)

```mermaid
flowchart LR
    A["Herói — Ribbon"] --> B["Click 'Descanso Longo'"]
    B --> C["Modal: 'Resetar tudo?'"]
    C -->|"Cancel"| A
    C -->|"Confirm"| D["Batch optimistic:"]
    D --> E1["Spell slots ← max"]
    D --> E2["Recursos (long_rest) ← max"]
    D --> E3["Efeitos (rest-based) ← dismissed"]
    D --> E4["HP ← max"]
    E1 --> F["Persiste no Supabase (transaction)"]
    E2 --> F
    E3 --> F
    E4 --> F
    F -->|"success"| G["Toast: 'Descansou bem'"]
    F -->|"error"| H["Revert + Toast: 'Tentar de novo?'"]
```

---

## 9. Máquina de estado — Badge na aba

```mermaid
stateDiagram-v2
    [*] --> Nenhum
    Nenhum --> CombateAtivo: combat_active=true
    Nenhum --> NotasNaoLidas: note:received && tab!=diario
    Nenhum --> QuestAtualizada: quest:updated && tab!=diario

    CombateAtivo --> Nenhum: combat:ended

    NotasNaoLidas --> Nenhum: user navega pra Diário
    QuestAtualizada --> Nenhum: user navega pra Diário
    NotasNaoLidas --> MultiplasNotasNaoLidas: nova nota chega
    MultiplasNotasNaoLidas --> NotasNaoLidas: 1 nota lida

    CombateAtivo: ⚡ pulsante em Herói
    NotasNaoLidas: [N] em Diário
    MultiplasNotasNaoLidas: [N] incrementa
    QuestAtualizada: [N] em Diário
```

---

## 10. Fluxo — Jogador novo cria primeira nota (onboarding wiki)

```mermaid
flowchart TD
    A["Jogador em Diário"] --> B["Sub-tab: Minhas Notas"]
    B --> C{"Já tem nota?"}
    C -->|"Sim"| D["Lista de notas + botão [+ Nova]"]
    C -->|"Não"| E["Empty state com copy:"]
    E --> F["'Sua primeira nota. O que você quer lembrar?'"]
    F --> G["Sugestões de templates:"]
    G --> G1["Minhas impressões da 1ª sessão"]
    G --> G2["NPC que encontrei"]
    G --> G3["Livre"]
    G1 --> H["Editor abre com template"]
    G2 --> H
    G3 --> H
    H --> I["Jogador digita"]
    I --> J["Auto-save 30s OR Ctrl+S"]
    J --> K["Toast: 'Nota salva'"]
    D --> K
```

---

## 11. Árvore de decisão — Qual tab o Jogador está buscando?

```mermaid
flowchart TD
    A["Jogador abre HQ"] --> B{"O que quer fazer?"}

    B -->|"Ver HP / rolar / usar magia"| C[Herói]
    B -->|"Checar inventário / sintonizar"| D[Arsenal]
    B -->|"Ler recap / anotar / ver quest"| E[Diário]
    B -->|"Explorar NPCs / Locais / Facções"| F[Mapa]

    B -->|"Algo aconteceu?"| G{"Sinal?"}
    G -->|"Combate ativo"| C
    G -->|"Nota nova do Mestre"| E
    G -->|"Quest mudou"| E
    G -->|"Loot novo"| D
    G -->|"Nada"| H["Default: Herói"]

    C -.->|"cross-nav"| C1["NPC mencionado em spell → Mapa"]
    D -.->|"cross-nav"| D1["Item mágico sintonizado afeta → Herói"]
    E -.->|"cross-nav"| E1["NPC em nota → Mapa drawer"]
    F -.->|"cross-nav"| F1["NPC drawer → Notas no Diário"]
```

---

## 12. Sequência — Auto-save de nota rápida (overlay)

```mermaid
sequenceDiagram
    participant J as Jogador
    participant UI as Overlay
    participant LS as sessionStorage
    participant API as Supabase

    J->>UI: Click FAB 📝 (ou tecla N)
    UI->>UI: Slide-up anim 200ms
    J->>UI: Digita texto
    UI->>LS: Salva draft a cada 5s
    J->>UI: Enter
    UI->>API: POST /player_notes (title=auto, tags=[combate])
    API-->>UI: 200 OK + id
    UI->>LS: Remove draft
    UI->>UI: Fade-out 300ms
    UI-->>J: Toast "Nota salva"

    alt Erro de rede
        API-->>UI: 500/timeout
        UI->>LS: Mantém draft
        UI-->>J: Toast "Nota salva local. Sincronizará ao reconectar."
    end
```

---

## 13. Notas de uso

### Como transcrever no FigJam

Quando Figma plugin destravar:
1. Invocar `mcp__plugin_figma_figma__generate_diagram` com cada snippet Mermaid
2. Passar `mermaidSyntax` e `name` descritivo
3. Tool retorna URL do FigJam criado
4. Mostrar URL ao Dani

### Como renderizar inline

GitHub e a maioria dos IDEs modernos renderizam Mermaid em markdown. Este arquivo é visível ao abrir no editor compatível.

### Convenções

- **stateDiagram-v2** para máquinas de estado
- **flowchart LR** para fluxos direcionais (left-to-right)
- **sequenceDiagram** para interações temporais entre atores

---

## 14. Referências cruzadas

Cada diagrama mapeia pra fluxo do §5 do PRD:

| Mermaid # | Fluxo do PRD | Doc detalhado |
|---|---|---|
| 1 | §6.4 Modo Combate Auto | [02-topologia §6.4](./02-topologia-navegacao.md) |
| 2 | Fluxo 1 (primeiro acesso) | [01-player-journey §1](./01-player-journey.md) |
| 3 | Fluxo 4 (usar magia) | [01-player-journey §4](./01-player-journey.md) |
| 4 | Fluxo 2 (Mestre inicia combate) + cross-mode | [01-player-journey §2](./01-player-journey.md) |
| 5 | Fluxo 8 (nota rápida) | [01-player-journey §8](./01-player-journey.md) |
| 6 | Fluxo 12 (reconexão) | [01-player-journey §12](./01-player-journey.md) |
| 7 | Topologia 7→4 | [02-topologia §6.1](./02-topologia-navegacao.md) |
| 8 | Fluxo 6 (descanso longo) | [01-player-journey §6](./01-player-journey.md) |
| 9 | Badges | [02-topologia §6.3](./02-topologia-navegacao.md) |
| 10 | Minhas Notas onboarding | [05-wireframe-diario](./05-wireframe-diario.md) |
| 11 | Decision tree de tabs | [PRD §6](./PRD-EPICO-CONSOLIDADO.md) |
| 12 | Auto-save overlay | [01-player-journey §8](./01-player-journey.md) |
