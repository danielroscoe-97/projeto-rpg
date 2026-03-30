# Feedbacks de Usuário — André Gomes Mamba
# App: Pocket DM / Taverna do Mestre (pocketdm.com.br / tavernadomestre.vercel.app)
# Combat Tracker D&D 5e — Next.js + Supabase
# Data dos feedbacks: 30/03/2026 (hoje)

## Contexto
André testou o app com o cunhado dele, que também joga RPG, e encaminhou prints + feedbacks direto no WhatsApp. 
Abaixo estão todos os itens identificados, separados por categoria.

---

## 🐛 BUGS (Críticos — corrigir primeiro)

### BUG 1 — [Object object] no tipo dos monstros
- **Descrição:** No filtro de busca de monstros (Search SRD Monsters), ao filtrar por TYPE, o valor 
  selecionado aparece como "× [Object" em vez do nome do tipo correto (ex: "Celestial").
  Os resultados de busca também exibem "[Object" no lugar do tipo das criaturas 
  (ex: Empyrean: "[Object · HP 346 · AC 22").
- **Print:** Tela de filtros com Type selecionado mostrando "[Object" + resultados Empyrean e Empyrean Iota 
  com tipagem errada
- **Provável causa:** toString() sendo chamado em um objeto em vez de acessar a propriedade correta 
  (ex: `creature.type` pode ser um objeto `{name: "Celestial"}` e está sendo interpolado direto)
- **Ação:** Verificar a interface/tipagem do campo `type` nos dados SRD e corrigir a serialização

### BUG 2 — Atalho de teclado +/- para HP não funciona
- **Descrição:** André tentou usar o atalho de teclado +/- para diminuir/aumentar vida de uma criatura 
  durante o combate e não funcionou
- **Print:** Tela de combate Round 2 com Hobgoblin Warlord e Tribal Warrior
- **Ação:** Verificar o event listener do atalho de HP — checar se há conflito de foco, se o listener 
  está registrado corretamente na tela de combate

### BUG 3 — Bug ao entrar pelo link /try (Modo Visitante)
- **Descrição:** Ao compartilhar o link direto `pocketdm.com.br/try` no WhatsApp e o usuário acessar 
  por ele, dá uma "bugada"
- **Ação:** Testar fluxo de entrada direto via `/try`, verificar hydration errors, redirect loops ou 
  estado inicial corrompido

---

## 🔧 UX / MELHORIAS (Alta prioridade)

### UX 1 — Fechar modal ao clicar fora (click outside)
- **Descrição:** Ao clicar para abrir a janela de stats de uma criatura (ex: Hobgoblin Warlord), 
  clicar em qualquer lugar fora do modal deveria fechá-lo. Atualmente não fecha.
- **Print:** Modal de stats do Hobgoblin Warlord aberto sobre a tela de combate
- **Ação:** Adicionar handler de `click outside` (usando useRef + useEffect ou biblioteca como 
  react-outside-click-handler) no componente de modal de stats

### UX 2 — Clicar em qualquer parte da card da criatura (não só no nome)
- **Descrição:** A possibilidade de clicar em criaturas que não participam do turno atual para abrir 
  janela de informações já existe, mas só funciona clicando no nome. 
  André sugeriu que toda a caixa/card seja clicável, ou que haja um botão/ícone explícito de info.
- **Print:** Round 5 com Tribal Warrior 1 (fora do turno) mostrando que não tem área clicável clara
- **Ação:** Expandir a área clicável para a card inteira, ou adicionar ícone de info visível em criaturas 
  fora do turno

### UX 3 — Configuração de Ruleset (2014/2024) global ou no momento de inserção
- **Descrição:** Atualmente cada criatura tem um botão individual "→2024" ou "→2014" para trocar o ruleset. 
  André apontou que ninguém vai trocar isso no meio do combate — deveria ser:
  a) Configurado globalmente antes de começar (config do encontro), ou  
  b) Selecionado no momento de inserir o personagem/criatura
- **Print:** Tela de combate mostrando botões individuais de ruleset em cada criatura
- **Ação:** Mover a seleção de ruleset para o nível do encontro (New Encounter screen) como configuração 
  global, remover os botões individuais por criatura durante o combate (ou deixar como opção avançada)

### UX 4 — Tradução incompleta (PT-BR misturado com EN)
- **Descrição:** Há textos em inglês misturados com português na interface
- **Print:** Tela New Encounter com "Search SRD Monsters", "Type monster name to auto-fill...", 
  "Add as hidden creature", "Roll All", "Roll NPCs", "Start Combat →", "Ruleset", etc. em inglês
  enquanto outras partes estão em PT-BR
- **Ação:** Fazer uma passagem completa de i18n — mapear todos os textos hardcoded em inglês e traduzir 
  para PT-BR (ou definir idioma padrão consistente)

---

## ✨ FEATURES SUGERIDAS (Backlog)

### FEAT 1 — Botão de Gerar Encontro Aleatório
- **Descrição:** Faltou um botão para gerar encontro aleatório, configurando:
  - Ambiente / Ecossistema (floresta, dungeon, planície, etc.)
  - Nível do grupo
- **Texto exato:** "faltou botão de gerar encontro aleatório, colocando o ambiente / ecosistema 
  e nivel do grupo, e botão de gerar espólio do combate automatico com base nos participantes"
- **Bônus:** Gerar espólio automaticamente com base nos participantes do combate ao terminar

### FEAT 2 — Gerar Personagens Prontos com Base em Classe
- **Descrição:** Seria legal poder buscar/gerar PCs (personagens jogadores) prontos com base em classe 
  e nível, ex: "Barbarian lv 3" — atualmente a busca por isso não retorna nada
- **Print:** Campo de busca com "barbarian lv 3" sem resultados
- **Ação:** Adicionar banco de PCs pré-gerados por classe/nível, ou integrar gerador de personagens 
  por classe

---

## 📱 SEO / META TAGS

### SEO 1 — OG Image faltando (preview sem foto no WhatsApp)
- **Descrição:** Ao mandar o link do site no WhatsApp, o preview aparece sem foto — está mostrando 
  a imagem do template Next.js Starter Kit em vez de uma OG Image própria do Pocket DM
- **Print:** Preview do link no WhatsApp com imagem genérica do Next.js
- **Ação:** Criar e configurar OG Image customizada no `<head>` (meta og:image) com visual do Pocket DM, 
  para todos os domínios: pocketdm.com.br e tavernadomestre.vercel.app

---

## 📋 RESUMO PRIORIZADO

| Prioridade | Item | Tipo |
|---|---|---|
| 🔴 P0 | BUG 1: [Object object] no tipo de monstro | Bug crítico |
| 🔴 P0 | BUG 3: Bug ao entrar pelo link /try | Bug crítico |
| 🟠 P1 | UX 1: Click outside fecha modal | UX |
| 🟠 P1 | BUG 2: Atalho +/- HP não funciona | Bug |
| 🟠 P1 | SEO 1: OG Image no WhatsApp | SEO |
| 🟡 P2 | UX 3: Ruleset como config global | UX |
| 🟡 P2 | UX 4: Tradução PT-BR completa | UX |
| 🟡 P2 | UX 2: Card inteira clicável | UX |
| 🟢 P3 | FEAT 1: Gerador de encontro aleatório + espólio | Feature |
| 🟢 P3 | FEAT 2: Gerar PCs por classe/nível | Feature |