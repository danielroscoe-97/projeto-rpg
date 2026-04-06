# Fluxo Pos-Combate — Mapa Completo

> Ultima atualizacao: 2026-04-05
> Referencia tecnica do fluxo pos-combate nos 3 modos (DM, Player, Guest).

---

## 1. Fluxo do DM (Sessao Real)

```mermaid
flowchart TD
    START([DM clica Encerrar Combate]) --> CAPTURE["Captura dados:
    Log de acoes, HP de todos,
    tempo de turno, rounds"]
    CAPTURE --> NAME_MODAL["Modal: De um nome ao encontro
    ex: Emboscada Goblin"]
    NAME_MODAL -->|Salva ou Pula| CHECK{"Houve combate real?
    Log tem dano/cura/morte
    OU alguem perdeu HP?"}

    CHECK -->|SIM| RECAP["TELA 1: Combat Recap
    estilo Spotify Wrapped
    - Premiacoes animadas
    - Narrativas epicas
    - Resumo + ranking de dano
    - Opcao de avaliar e compartilhar"]
    CHECK -->|NAO| DM_FEEDBACK

    RECAP -->|DM fecha o recap| DM_RATED{"DM ja avaliou
    dentro do recap?"}
    DM_RATED -->|SIM| POLL_RESULT
    DM_RATED -->|NAO| DM_FEEDBACK

    DM_FEEDBACK["TELA 2: Feedback do DM
    Como foi esse combate?
    Nota de 1-5 + anotacoes"]
    DM_FEEDBACK -->|Envia ou Pula| POLL_RESULT

    POLL_RESULT["TELA 3: Resultado da Votacao
    Mostra os votos dos jogadores
    sobre dificuldade 1-5"]
    POLL_RESULT -->|DM fecha| CLEANUP["Limpa tudo, salva dados,
    encerra encounter no banco,
    volta pro Dashboard"]

    style RECAP fill:#2d4a1a,stroke:#4ade80,color:#fff
    style DM_FEEDBACK fill:#4a3a1a,stroke:#facc15,color:#fff
    style POLL_RESULT fill:#1a2a4a,stroke:#60a5fa,color:#fff
    style CHECK fill:#4a1a1a,stroke:#f87171,color:#fff
```

### Passo a passo

| Passo | O que acontece | Arquivo | Linha |
|-------|---------------|---------|-------|
| 1 | DM clica "Encerrar Combate" | `CombatSessionClient.tsx` | 1237 |
| 2 | Sistema fotografa tudo: log, snapshot dos combatentes, tempos | `CombatSessionClient.tsx` | 307-341 |
| 3 | Modal pede nome do encontro | `CombatSessionClient.tsx` | 1440-1464 |
| 4 | DM salva ou pula o nome | `CombatSessionClient.tsx` | 343-352 |
| 5 | Checa: "Houve combate de verdade?" (log + HP) | `CombatSessionClient.tsx` | 204-207 |
| 6 | Se SIM: monta relatorio, broadcast pros jogadores, mostra Recap | `CombatSessionClient.tsx` | 207-297 |
| 7 | Se NAO: pula direto pro feedback do DM | `CombatSessionClient.tsx` | 298-302 |
| 8 | DM fecha Recap -> Feedback (ou pula se ja avaliou no recap) | `CombatSessionClient.tsx` | 1470-1472 |
| 9 | DM da nota + anotacoes -> Resultado da Votacao | `CombatSessionClient.tsx` | 1489-1501 |
| 10 | DM fecha resultado -> salva tudo e vai pro dashboard | `CombatSessionClient.tsx` | 365-406 |

### Maquina de estados do DM

```mermaid
stateDiagram-v2
    [*] --> leaderboard : Houve combate real
    [*] --> dm_feedback : Sem atividade de combate

    leaderboard --> dm_feedback : DM fecha recap (sem avaliar)
    leaderboard --> result : DM fecha recap (ja avaliou inline)

    dm_feedback --> result : DM envia ou pula feedback

    result --> [*] : DM fecha resultado (handleDismissAll)
```

---

## 2. Fluxo do Player (Sessao Real)

```mermaid
flowchart TD
    P_START([DM encerra combate]) -->|broadcast| P_STATS["Recebe stats do combate"]
    P_STATS -->|broadcast| P_RECAP_DATA["Recebe relatorio completo"]
    P_RECAP_DATA --> P_CHECK{"Tem relatorio
    completo?"}

    P_CHECK -->|SIM| P_RECAP["TELA 1: Combat Recap
    estilo Spotify Wrapped
    + botao Entrar na Campanha
    se for jogador anonimo"]
    P_CHECK -->|NAO| P_LEADERBOARD["TELA 1B: Leaderboard simples
    fallback se recap nao chegou"]

    P_RECAP -->|Jogador ja avaliou no recap| P_WAITING
    P_RECAP -->|Jogador fecha sem avaliar| P_POLL
    P_LEADERBOARD -->|Fecha| P_POLL

    P_POLL["TELA 2: Votacao de Dificuldade
    Quao dificil foi?
    Voto de 1-5"]
    P_POLL -->|Vota ou Pula| P_RESULTS

    P_RESULTS["TELA 3: Resultado ao Vivo
    Grafico com votos de todos
    Atualiza a cada voto novo
    + spinner Aguardando Mestre"]
    P_RESULTS -->|DM encerra sessao| P_END([Sessao encerrada])

    style P_RECAP fill:#2d4a1a,stroke:#4ade80,color:#fff
    style P_POLL fill:#4a3a1a,stroke:#facc15,color:#fff
    style P_RESULTS fill:#1a2a4a,stroke:#60a5fa,color:#fff
```

### Passo a passo

| Passo | O que acontece | Arquivo | Linha |
|-------|---------------|---------|-------|
| 1 | DM manda broadcast de stats -> Player recebe | `PlayerJoinClient.tsx` | 1159-1169 |
| 2 | DM manda broadcast de recap -> Player recebe | `PlayerJoinClient.tsx` | 1171-1176 |
| 3 | Se recap chegou -> mostra Combat Recap completo | `PlayerJoinClient.tsx` | 1807-1846 |
| 4 | Se nao chegou -> mostra Leaderboard simples (fallback) | `PlayerJoinClient.tsx` | 1848-1856 |
| 5 | Jogador fecha recap -> aparece votacao | `PlayerJoinClient.tsx` | 1860-1890 |
| 6 | Jogador vota ou pula -> ve grafico de votos ao vivo (atualiza a cada voto novo) | `PlayerJoinClient.tsx` | 1893+ |
| 7 | DM fecha tudo -> broadcast session:ended | via broadcast |

### Broadcasts envolvidos

```mermaid
sequenceDiagram
    participant DM as DM (Session)
    participant SB as Supabase Realtime
    participant P as Player

    DM->>SB: session:combat_stats (stats, nome, rounds)
    SB->>P: session:combat_stats
    DM->>SB: session:combat_recap (relatorio completo)
    SB->>P: session:combat_recap

    P->>SB: player:poll_vote (nome, voto 1-5)
    SB->>DM: player:poll_vote
    Note over DM: Recebe voto e retransmite resultado ao vivo
    DM->>SB: session:poll_results (ao vivo, a cada voto)
    SB->>P: session:poll_results (grafico atualiza)

    Note over DM: DM fecha tudo (handleDismissAll)
    DM->>SB: session:poll_results (final)
    SB->>P: session:poll_results
    DM->>SB: session:ended
    SB->>P: session:ended
```

---

## 3. Fluxo do Guest (Combate Rapido)

```mermaid
flowchart TD
    G_START([Guest clica Encerrar]) --> G_CHECK{"Houve combate real?
    Stats com atividade
    OU alguem perdeu HP?"}

    G_CHECK -->|SIM| G_RECAP["TELA UNICA: Combat Recap
    + botao Salvar e Criar Conta"]
    G_CHECK -->|NAO| G_RESET["Reseta combate direto
    volta pro setup"]

    G_RECAP -->|Fecha| G_RESET

    style G_RECAP fill:#2d4a1a,stroke:#4ade80,color:#fff
```

### Passo a passo

| Passo | O que acontece | Arquivo | Linha |
|-------|---------------|---------|-------|
| 1 | Guest clica "Encerrar" | `GuestCombatClient.tsx` | 1400 |
| 2 | Checa se houve combate real (log + HP) | `GuestCombatClient.tsx` | 1430-1432 |
| 3 | Se SIM: mostra recap + botao "Criar Conta" | `GuestCombatClient.tsx` | 1830-1836 |
| 4 | Se NAO: reseta direto pro setup | `GuestCombatClient.tsx` | 1451-1454 |
| 5 | Sem feedback, votacao ou persistencia | (simplificado de proposito) |

---

## 4. Comparacao entre os 3 Modos

| Recurso | DM (Sessao) | Player (Sessao) | Guest |
|---------|:-----------:|:---------------:|:-----:|
| Combat Recap (Spotify Wrapped) | Sim | Sim (via broadcast) | Sim |
| Nomear o encontro | Sim | -- | -- |
| Feedback do DM (nota + notas) | Sim | -- | -- |
| Votacao de dificuldade | Ve os resultados | Vota (1-5) | -- |
| Salvar relatorio no banco | Sim (automatico) | -- | -- |
| Botao "Criar Conta" | -- | -- | Sim |
| Botao "Entrar na Campanha" | -- | Sim (se anonimo) | -- |

---

## 5. Condicao para mostrar o Recap

A condicao e a mesma nos 3 modos (parity rule):

```
MOSTRAR RECAP se:
  - Log tem atividade (dano causado OU recebido OU cura OU mortes)
  - OU algum combatente perdeu HP (current_hp < max_hp) ou foi derrotado

PULAR RECAP se:
  - Nenhuma das condicoes acima (combate foi iniciado mas nada aconteceu)
```

Isso garante que o recap aparece mesmo se o navegador recarregar no meio do combate (o log some mas o HP dos combatentes sobrevive no banco).
