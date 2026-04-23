# Jornada Completa do Jogador — Player HQ

**Escopo:** Todos os fluxos que o jogador passa dentro (e pela fronteira) do Player HQ.
**Público:** PM, UX, QA, Dev.
**Prereq de leitura:** [00-INDEX.md](./00-INDEX.md)

---

## 📜 Filosofia dos fluxos

O Player HQ serve **três momentos do jogador** — nunca os três têm o mesmo peso visual ao mesmo tempo:

| Momento | Quando acontece | O que importa |
|---|---|---|
| 🔥 **Sob pressão** (combate ativo) | Durante combate iniciado pelo Mestre | HP, slots, efeitos, condições, modifier de atributo pra rolagens |
| 🧘 **Entre cenas** (exploração, role-play) | Fora de combate, sessão rodando | Anotações, NPCs, quests, consulta de habilidade |
| 📖 **Fora de sessão** (preparação, leitura) | Entre sessões, solo | Edição de ficha, revisão de diário, estudo de magias |

A topologia nova (4 tabs + modo combate auto) existe pra atender os 3 sem forçar o jogador a decidir qual contexto ele está.

---

## 🎯 Fluxo 1 — Primeiro acesso ao Player HQ

**Gatilho:** Jogador aceita convite de campanha do Mestre pela primeira vez + cria personagem.

**Caminho feliz:**
```
1. Dashboard → card "Curse of Strahd (Player)" → clica
2. Se já tem personagem criado na campanha:
   → Redirect para /campaigns/[id]/sheet (Herói tab por default)
3. Se NÃO tem personagem:
   → Redirect para wizard de criação (fora do escopo desse spec)
4. Primeira visita ao /sheet:
   → PlayerHqTourProvider auto-inicia (migration 110)
   → Tour guiado passa pelos 4 tabs: Herói → Arsenal → Diário → Mapa
   → Destaca: ability scores visíveis, spell slots tracker, notas compartilhadas
5. Fim do tour:
   → Flag user_onboarding.player_hq_tour_completed = true
   → Jogador pousa na aba Herói em modo leitura
```

**Estados-chave:**
- Loading (busca campaign + character + onboarding em paralelo)
- Sem personagem → redirect para criação
- Não-membro → redirect para `/campaigns/[id]`
- Member mas role=dm → redirect para `/campaigns/[id]` (view de mestre)

**Falhas:**
- Sem conexão → skeleton + retry automático a cada 3s (regra Resilient Reconnection)
- Tour já completado → não dispara auto-start (lê flag)

**Referências código:**
- [app/app/campaigns/[id]/sheet/page.tsx:11](../../app/app/campaigns/%5Bid%5D/sheet/page.tsx#L11) — server-side auth + redirect logic
- [components/tour/PlayerHqTourProvider.tsx](../../components/tour/PlayerHqTourProvider.tsx) — orquestrador do tour

---

## 🎯 Fluxo 2 — Mestre inicia combate durante sessão

**Gatilho:** Mestre clica "Iniciar Combate" na sua interface de Rodar Combate.

**Caminho feliz (ponto de vista do jogador):**
```
1. Jogador está lendo na aba Diário (ou qualquer tab)
2. Realtime broadcast chega: combat:started
3. Toast aparece no topo: "O mestre iniciou o combate — [Entrar]"
   └── (copy canônico do DESIGN-SYSTEM §3.1)
4. Jogador clica "Entrar"
   → Player HQ detecta combat_active=true na campanha
   → Tab Herói é automaticamente ativada (mesmo que estivesse em outra)
   → Layout desktop muda: coluna B (recursos voláteis) EXPANDE, coluna A COLAPSA perícias
   → Banner superior da tab Herói aparece: "⚔ Combate em andamento — Round 3 · seu turno"
5. Jogador consulta slot, marca ação, rolagem
```

**Detalhes críticos:**
- **Modo combate auto** não troca a tab se o jogador JÁ está em outra intencionalmente (ex: estava tomando notas) — só faz destaque visual com banner + badge pulsando na aba Herói
- Se jogador estiver em Herói, faz a transição automática (re-layout com anim 300ms)
- Ao fim do combate (broadcast `combat:ended`), banner some suavemente (fade 400ms) e layout volta ao normal

**Falhas:**
- Realtime TIMED_OUT (vide [memory/realtime_rate_limit](../../.claude/projects/c--Projetos-Daniel-projeto-rpg/memory/project_realtime_rate_limit_root_cause.md)) → fallback pra polling de `campaign.combat_active` a cada 10s
- Broadcast perdido → DM stale detection (15s) não atinge jogador, mas jogador ainda vê banner ao abrir HQ

**Referências código:**
- [lib/hooks/useCharacterStatus.ts](../../lib/hooks/useCharacterStatus.ts) — subscription realtime
- (novo) `lib/hooks/useCampaignCombatState.ts` — subscription para `combat:started|ended`

---

## 🎯 Fluxo 3 — Jogador durante combate: tomar dano

**Gatilho:** Mestre aplica dano via UI do mestre, ou jogador informa "tomei 12".

**Caminho feliz (ponto de vista do jogador):**
```
1. Jogador está na aba Herói (modo combate ativo)
2. Ribbon superior mostra: ❤ 88/88 FULL
3. Jogador clica no botão [-5] no ribbon 3 vezes:
   → Optimistic: ribbon atualiza instantaneamente 88→83→78→73
   → HP bar tier ainda FULL (73/88 = 83%)
   → Ack do servidor: gold pulse no ribbon (memory svg_sem_emojis)
4. Se o tier muda (ex: baixa para LIGHT em 50%):
   → HP bar muda cor (verde → amarelo)
   → Label do ribbon muda: "LIGHT" (inglês, memory hp_tier_labels)
   → Toast discreto: "Capa Barsavi: 42/88 LIGHT"
5. Mestre pode ver no broadcast player-hp-changed no seu ecrã
```

**Estados:**
- Optimistic → confirmed → error (fallback: reverter HP + toast "Não foi dessa vez")
- Tier transition: verde → amarelo → laranja → vermelho, com animação 300ms
- Morte (HP=0): ribbon vira vermelho, HP bar pulsando, badge "INCONSCIENTE"

**Falhas:**
- Rede cai após optimistic → revert + toast "Reconectando..."
- Multiple concurrent updates → last-write-wins com timestamp (já existe no code)

**Referências código:**
- [components/player-hq/HpDisplay.tsx](../../components/player-hq/HpDisplay.tsx)
- [lib/utils/hp-status.ts](../../lib/utils/hp-status.ts) — getHpStatus/getHpStatusWithFlag (**nunca divergir**)

---

## 🎯 Fluxo 4 — Jogador usa magia

**Gatilho:** Jogador decide lançar Abençoar (1st level slot).

**Caminho feliz:**
```
1. Jogador está na aba Herói (modo combate ou leitura, não importa)
2. Ribbon mostra resumo de slots: "R9·D6·A3" (ritual, disponíveis, ativos)
3. Jogador olha coluna B → SPELL SLOTS
   → Grid horizontal compacto: I II III IV V VI VII VIII IX
   → Nível 1: ●● (2/2 preenchidos)
4. Jogador clica no primeiro dot cheio do nível 1:
   → Optimistic: dot vira vazio ○●
   → Ribbon resumo atualiza: "R9·D5·A3"
5. (Opcional) Jogador clica [+ Efeito] no painel Efeitos Ativos
   → Drawer abre com search "Abençoar"
   → Auto-complete SRD preenche duração (1min + conc)
   → Jogador confirma
   → Efeito aparece na lista: "○ Abençoar · 1min · conc [↻][×]"
6. Concentration check: se jogador já tinha outra spell com conc:
   → Toast: "Você já concentra em Proteção contra Mal. Trocar?"
   → Confirma → Proteção some, Abençoar entra
```

**Estados especiais:**
- Slot 0/0 → dots apagados, tooltip "Sem slots de nível X"
- Conc conflict → modal ou toast conforme severidade
- Long rest → todos slots resetam em background (ver Fluxo 6)

**Referências código:**
- [components/player-hq/SpellSlotsHq.tsx](../../components/player-hq/SpellSlotsHq.tsx)
- [components/player-hq/ActiveEffectsPanel.tsx](../../components/player-hq/ActiveEffectsPanel.tsx)
- [lib/hooks/useActiveEffects.ts](../../lib/hooks/useActiveEffects.ts) — getConcentrationConflict()

---

## 🎯 Fluxo 5 — Jogador faz rolagem com modifier de atributo

**Gatilho:** Mestre pede "teste de Força DC 15" ou jogador inicia rolagem por habilidade.

**Caminho feliz (desktop, pós-redesign):**
```
1. Jogador está na aba Herói
2. Ability scores chips sempre visíveis: STR +0, DEX +2, CON +4, INT -1, WIS +2, CHA +4
3. Jogador rola d20 no dado físico (ou usa roller interno — fora escopo)
4. Soma mentalmente 14 + 0 (STR) = 14
5. Fim. ZERO cliques pra ver o modifier.

ANTES (hoje):
1. Jogador está na aba Ficha
2. Ability scores estão em accordion FECHADO "Atributos ▾"
3. Jogador precisa clicar pra expandir (1 clique, 200ms)
4. Vê chips. Lê STR: +0
5. Rola. Total 3-5s perdidos.
```

**Impacto:** Em combate com 5-10 rolagens por turno × 4-6 jogadores × 2-3h de sessão = **centenas de segundos economizados** por sessão.

**Referências código:**
- [components/player-hq/CharacterCoreStats.tsx:131](../../components/player-hq/CharacterCoreStats.tsx#L131) — accordion a ser removido

---

## 🎯 Fluxo 6 — Descanso longo (reset de recursos)

**Gatilho:** Mestre narra "vocês descansam 8h". Jogador clica "Descanso Longo" na sua ficha.

**Caminho feliz:**
```
1. Jogador vê no ribbon (ou painel Recursos) botão "Descanso Longo"
2. Clica. Modal confirm: "Resetar todos os slots, recursos e efeitos ativos?"
3. Confirma.
4. Optimistic batch:
   → Spell slots: todos voltam pra max
   → Recursos de classe (1/day): resetam
   → Efeitos ativos (duração baseada em rest): todos dismissed
   → HP: vai pra max
5. Toast: "Descansou bem. Slots e recursos restaurados."
6. Ribbon atualiza. Jogador vê ●● em todos os níveis de slot.
```

**Estados:**
- Descanso curto: só reseta recursos `reset_type=short_rest` (vide [components/player-hq/RestResetPanel.tsx](../../components/player-hq/RestResetPanel.tsx))
- Amanhecer (custom, homebrew): reseta tudo + advance long duration effects

**Detalhes importantes:**
- Descanso longo NÃO remove condições permanentes (ex: envenenado com duração fixa)
- Pontos de Inspiração, por RAW, resetam com short rest (configurável em settings)

---

## 🎯 Fluxo 7 — Jogador recebe nota privada do Mestre

**Gatilho:** Mestre escreve nota direcionada ao jogador no seu painel.

**Caminho feliz (jogador):**
```
1. Realtime broadcast chega: note:received (canal campaign consolidated)
2. Badge aparece na aba Diário do Player HQ: "Diário [1]"
3. Se jogador está em outra tab → só o badge vibra
4. Se jogador está em Diário → entrada nova aparece em "Do Mestre" com fade-in + highlight 2s
5. Jogador clica → abre nota
6. Marca como lida → badge some
```

**Estados:**
- Múltiplas notas não lidas → badge "[3]"
- Mensagem muito longa → trunca com "ver mais"
- Mestre edita nota depois → update in-place + timestamp "editado"

**Referências:**
- (novo spec) zona Diário > sub-aba "Do Mestre"
- [supabase/migrations/053_player_shared_notes.sql](../../supabase/migrations/053_player_shared_notes.sql)

---

## 🎯 Fluxo 8 — Jogador cria nota rápida durante combate

**Gatilho:** Mestre fala "vocês ouvem alguém chamar por Boris". Jogador quer anotar.

**Caminho feliz:**
```
1. Jogador está na aba Herói (modo combate ativo)
2. Ribbon sticky continua no topo
3. Jogador clica atalho "Nota rápida" (botão flutuante canto inf direito)
   → OU: pressiona atalho teclado N (fora escopo MVP)
4. Mini-input aparece em overlay leve (não tira jogador do combate)
5. Digita: "Alguém chamou Boris — investigar depois"
6. Enter confirma. Input fecha.
7. Nota salva em Diário > Rápidas + tag automática "combate"
8. Badge discreto na aba Diário [1]
```

**Estados:**
- Input vazio + enter → fecha sem salvar
- Sem conexão → salva local (sessionStorage), sync quando voltar

**Decisão de produto:** Esse fluxo **precisa funcionar em combate sem tirar o foco do jogador**. Se obriga a trocar de tab, falhou.

---

## 🎯 Fluxo 9 — Jogador revisa sessão (após sessão ou entre sessões)

**Gatilho:** Jogador abre Player HQ fora de sessão, quer revisar o que aconteceu.

**Caminho feliz:**
```
1. Dashboard → card "Curse of Strahd" → abre ficha
2. Aba Herói aparece (default)
3. Jogador clica Diário
4. Ve sub-abas: Rápidas · Diário · NPCs · Do Mestre
5. Clica "Diário" (timeline cronológica por sessão)
6. Entradas ordenadas por data, mais recente no topo
7. Pode:
   - Expandir sessão antiga (collapsible)
   - Buscar por texto (Ctrl+F local)
   - Filtrar por tag (@combate, @roleplay, @loot)
8. Entra em NPCs:
   - Cards dos NPCs conhecidos (com link pro Mapa se tem)
   - Cada card: nome em Cinzel, último encontro, tags
```

**Decisão:** Diário é **read-first**, com affordance pra escrever. O inverso (Ficha) é escrever-first, com affordance pra ler.

---

## 🎯 Fluxo 10 — Jogador sobe de nível

**Gatilho:** Mestre anuncia level up. Jogador precisa editar ficha.

**Caminho feliz:**
```
1. Aba Herói → botão [✎Editar] no header
2. Drawer "Editar Personagem" abre (CharacterEditSheet.tsx)
3. Sub-seções: Identidade · Combate · Atributos · Notas
4. Jogador ajusta:
   - Level: 10 → 11
   - Max HP: 88 → 95
   - AC se aplicável
   - Proficiency bonus (auto-calc: +4 → +4, sem mudança 11-12)
5. Salvar. Drawer fecha.
6. Ribbon + ability chips + proficiências atualizam
```

**Limitações atuais:**
- Não tem wizard de level up (escolher spell novo, habilidade de classe)
- Jogador precisa lembrar de editar proficiencies/abilities/spells manualmente em outras seções

**Roadmap futuro:** wizard de level up — fora do escopo desse spec.

**Referências:**
- [components/player-hq/CharacterEditSheet.tsx](../../components/player-hq/CharacterEditSheet.tsx)

---

## 🎯 Fluxo 11 — Jogador adiciona item ao inventário

**Gatilho:** Jogador encontra espada +1 no loot.

**Caminho feliz:**
```
1. Aba Arsenal
2. Role até "Meus Itens" (inventário pessoal)
3. Clica [+ Adicionar Item]
4. AddItemForm abre
5. Search "espada longa" → auto-complete SRD aparece
6. Seleciona → campos auto-preenchidos (peso, dano, props)
7. Customiza nome "Espada Longa +1"
8. Confirma
9. Item aparece na lista com ícone de classe
10. Se o item for magical item (com attunement):
    → Prompt: "Deseja sintonizar? (2/3 slots usados)"
    → Se sim → vai pra Sintonização (topo do Arsenal)
```

**Estados:**
- Sintonização lotada (3/3) → bloqueia + sugere dismissar uma existente
- Item sem SRD match → fallback manual

**Referências:**
- [components/player-hq/AddItemForm.tsx](../../components/player-hq/AddItemForm.tsx)
- [components/player-hq/AttunementSection.tsx](../../components/player-hq/AttunementSection.tsx)

---

## 🎯 Fluxo 12 — Jogador desconecta e reconecta

**Gatilho:** Jogador fecha aba acidentalmente, ou WiFi cai, ou troca de device.

**Caminho feliz:**
```
1. Jogador fecha browser mid-sessão (aba Herói, combate ativo)
2. Abre 30s depois em outro device
3. Login (sessão persistente — cookies/localStorage)
4. Dashboard mostra "Curse of Strahd · AO VIVO"
5. Clica → Player HQ carrega
6. Skeleton por < 1s
7. Estado sincroniza:
   → Combate ainda ativo → banner "⚔ Round 5 · turno de Grolda"
   → HP atual do servidor → ribbon atualiza
   → Efeitos ativos persistidos → lista carrega
   → Notas locais não salvas (sessionStorage) → sync se houver
8. Jogador está onde parou.
```

**Invariante:** Zero drop perceptível. Regra Resilient Reconnection ativa.

**Falhas tratadas:**
- Token expirou → redirect /auth/login (mas sessão de campaign persiste em local)
- Servidor lento → skeleton segura > 3s apenas se necessário (não antes)

---

## 📊 Mapa JTBD × Fluxo × Tab

| Fluxo | JTBD dominante | Tab foco | Modo |
|---|---|---|---|
| 1. Primeiro acesso | Onboarding | Herói | — |
| 2. Mestre inicia combate | Rastrear | Herói | Combate |
| 3. Tomar dano | Rastrear | Herói | Combate |
| 4. Usar magia | Rastrear | Herói | Combate |
| 5. Rolagem com modifier | Consultar | Herói | Ambos |
| 6. Descanso longo | Rastrear | Herói | Leitura |
| 7. Receber nota Mestre | Registrar | Diário | Ambos |
| 8. Nota rápida em combate | Registrar | Diário (overlay) | Combate |
| 9. Revisar sessão | Registrar | Diário | Leitura |
| 10. Subir de nível | Consultar+Editar | Herói (drawer) | Leitura |
| 11. Adicionar item | Registrar | Arsenal | Leitura |
| 12. Reconexão | (sistema) | qualquer | preservado |

**Leitura:** Herói é o tab dominante em 7/12 fluxos. Diário em 4/12. Arsenal em 1. Mapa zero dos fluxos críticos (mas essencial pra exploração narrativa).

---

## 🎬 Regras de ouro do design baseado em jornada

1. **Ribbon nunca some** — é o "HUD" do jogador, presente em todos os 4 tabs.
2. **Modo combate não força troca de tab** — ele destaca, não prende.
3. **Diário tem overlay de nota rápida** invocável de qualquer tab (fluxo 8).
4. **Ability chips + proficiency bonus sempre visíveis** em Herói — fluxo 5 é o mais frequente.
5. **Toasts são sempre não-bloqueantes** (vide voice & tone do DESIGN-SYSTEM §3).
6. **Reconexão invisível** quando possível — skeleton apenas quando o servidor realmente demora.
