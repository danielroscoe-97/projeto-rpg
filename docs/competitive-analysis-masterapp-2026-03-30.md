# Análise Competitiva — MasterApp RPG vs Pocket DM

> Navegação completa feita em 2026-03-30 via BMAD Party Mode.
> Credenciais usadas: conta de teste do Dani_ no MasterApp.
> Screenshots: `qa-evidence/masterapp-*.png`

---

## Visão Geral do Concorrente

| | MasterApp | Pocket DM |
|---|-----------|-----------|
| **URL** | masterapprpg.com / board.masterapprpg.com | pocketdm.app |
| **Stack** | Next.js, Supabase, Babylon.js (dados 3D) | Next.js, Supabase, SRD real |
| **Modelo** | Starter (grátis, 1 campanha) / Pro (R$10/mês, 3) / Master (R$25/mês, ilimitado) | Freemium com guest access |
| **Foco** | Gestão completa de campanha + combate | Combate realtime + simplicidade |
| **Erros em produção** | React hydration errors (#425, #418, #423), WebSocket falhas | Estável |

---

## Feature-by-Feature

### Campanhas

| Feature | MasterApp | Pocket DM | Veredito |
|---------|-----------|-----------|----------|
| Criar campanhas | Sim (limite por plano) | Sim | Empate |
| Convite por link | Sim | Sim | Empate |
| Editar campanha | Sim | Parcial | MasterApp |
| Imagem da campanha | Sim (arte AI default) | Não | MasterApp |

### Sessões & Combate

| Feature | MasterApp | Pocket DM | Veredito |
|---------|-----------|-----------|----------|
| Criar sessão | Sim | Sim | Empate |
| Combate realtime | Não (sem sync players) | Sim (broadcast realtime) | **Pocket DM** |
| Guest access (sem login) | Não | Sim | **Pocket DM** |
| Death saves + revive | ? | Sim (completo SRD) | **Pocket DM** |
| Conditions tracking | ? | Sim (com ícones) | **Pocket DM** |
| Iniciativa auto + manual | Sim | Sim (drag reorder) | Empate |
| Controle XP/Level auto | Sim | Não | MasterApp |
| Timer de turno | ? | Sim | **Pocket DM** |
| Leaderboard de dano | Não | Sim | **Pocket DM** |
| Keyboard shortcuts | ? | Sim (Space, D, H, C, arrows) | **Pocket DM** |

### Personagens

| Feature | MasterApp | Pocket DM | Veredito |
|---------|-----------|-----------|----------|
| Wizard visual (classe/raça) | Sim (cards com arte AI) | Não (planejado Sprint 3, simplificado) | MasterApp |
| Ficha completa | Sim | Não (bucket futuro) | MasterApp |
| Tokens de monstro | Sim (arte AI) | Sim (SRD tokens) | Empate |
| Token de player custom | Não visto | Planejado Sprint 3 | — |

### Bestiário

| Feature | MasterApp | Pocket DM | Veredito |
|---------|-----------|-----------|----------|
| Galeria visual | Sim (300+ com arte AI, paginado) | Sim (SRD data, tokens) | MasterApp visual, PocketDM dados |
| Criar monstro custom | Sim (limite por plano) | Sim (presets) | Empate |
| Filtros/busca | Sim (filtros) | Sim (busca inline) | Empate |
| Dados SRD reais | Não claro | Sim (SRD 2014 + 2024) | **Pocket DM** |

### Áudio / Soundboard

| Feature | MasterApp ("Bardo") | Pocket DM ("DM Soundboard") | Veredito |
|---------|-----------|-----------|----------|
| Ambiente loops | Sim (20+: Cidadela, Taverna, Rio, Mar...) | Sim | Empate |
| One-shot SFX | Sim (12+: Dragão, Explosão, Leão...) | Sim | Empate |
| Categorias | Todos/Ambiente/Músicas/Sons | Sim | Empate |
| Thumbnails visuais | Sim (fotos em cada som) | Não (ícones) | MasterApp |

### Notas

| Feature | MasterApp | Pocket DM | Veredito |
|---------|-----------|-----------|----------|
| Notas privadas GM | Sim (com pastas) | Sim (CampaignNotes) | MasterApp (pastas) |
| Notas compartilhadas campanha | Sim (com pastas) | Não (planejado Sprint 2) | MasterApp |

### Compendium / Referência

| Feature | MasterApp | Pocket DM | Veredito |
|---------|-----------|-----------|----------|
| Referência in-combat | Sim (Actions, Bonus, Reactions, Movement) | Sim (SRD mid-combat panel) | Empate |
| Profundidade do conteúdo | Básico (só nomes/descrições) | SRD completo (stats, habilidades) | **Pocket DM** |

### Perfil & Conta

| Feature | MasterApp | Pocket DM | Veredito |
|---------|-----------|-----------|----------|
| Perfil com banner/avatar | Sim (banner fantasy, avatar circular) | Básico | MasterApp |
| Gestão de plano | Sim (3 tiers) | Sim (Stripe) | Empate |
| Dados 3D (rolador) | Sim (Babylon.js) | Não | MasterApp |

---

## Onde Vencemos (Manter e Ampliar)

1. **Combate realtime com broadcast** — Killer feature. Eles não têm sync com jogadores.
2. **Guest access sem login** — Barreira zero. Eles exigem conta pra tudo.
3. **SRD real** — Dados oficiais 2014 + 2024 com stats completos.
4. **UX moderna e estável** — O app deles tem erros de hydration no console.
5. **Death saves + conditions + leaderboard** — Mecânicas de combate mais ricas.

## Onde Perdemos (Fechar Gap)

1. **Criação de personagem visual** — Sprint 3 (versão simplificada)
2. **XP/Level automático** — Bucket futuro (F-02, F-03, F-04)
3. **Notas compartilhadas com pastas** — Sprint 2
4. **Visual do bestiário** — Eles têm arte AI em cada monstro
5. **Perfil elaborado** — Sprint 3
6. **Dados 3D** — Bucket futuro (nice to have)

## Onde Nenhum Tem (Oportunidade)

- VTT mode (ambos prometem "em breve")
- IA integrada (ambos prometem "em breve")
- Marketplace (ambos prometem "em breve")
- Mind map de campanha (ninguém tem — nosso diferencial Sprint 4)

---

## Screenshots Coletados

| Arquivo | Conteúdo |
|---------|----------|
| `masterapp-icons-section.png` | LP — Seção ícones "Liberte seu DM" |
| `masterapp-dashboard-campaigns.png` | Dashboard — Lista de campanhas |
| `masterapp-campaign-inside.png` | Dentro da campanha — ações do GM |
| `masterapp-notes.png` | Sistema de notas (privadas + campanha) |
| `masterapp-create-character-step1.png` | Wizard de personagem — seleção de classe |
| `masterapp-create-character-full.png` | Wizard de personagem — visão completa |
| `masterapp-session-inside.png` | Sessão — sidebar de ações |
| `masterapp-compendium.png` | Compendium in-session |
| `masterapp-bardo-music.png` | Bardo — soundboard com thumbnails |
| `masterapp-bestiary.png` | Bestiário in-session |
| `masterapp-bestiary-page.png` | Bestiário — página dedicada |
| `masterapp-menu-dropdown.png` | Menu dropdown do usuário |
| `masterapp-profile.png` | Perfil do usuário |

---

> **Última atualização:** 2026-03-30
> **Revisado por:** Dani_ + BMAD Party Mode (Mary analyst)
