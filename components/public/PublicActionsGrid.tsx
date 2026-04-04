"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────
type Locale = "en" | "pt-BR";
type RulesetVersion = "2014" | "2024";
type SectionId = "actions" | "bonus" | "reactions" | "other";

interface ActionEntry {
  id: string;
  icon: string;
  name: { en: string; "pt-BR": string };
  description: { en: string; "pt-BR": string };
  keyRule: { en: string; "pt-BR": string };
  fullText: { en: string; "pt-BR": string };
  section: SectionId;
  /** If provided, this entry replaces the base entry for the given version */
  versionOverride?: Partial<Record<RulesetVersion, {
    description: { en: string; "pt-BR": string };
    keyRule: { en: string; "pt-BR": string };
    fullText: { en: string; "pt-BR": string };
  }>>;
}

interface PublicActionsGridProps {
  locale?: Locale;
}

// ── Labels ────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title: "D&D 5e Actions in Combat",
    subtitle: "Quick reference for all combat actions in D&D 5th Edition",
    turnStructureTitle: "Your Turn",
    movement: "Movement",
    action: "Action",
    bonusAction: "Bonus Action",
    reaction: "Reaction",
    freeInteraction: "Free Interaction",
    ifAvailable: "if available",
    onTrigger: "on trigger",
    sectionActions: "Actions",
    sectionBonus: "Bonus Actions",
    sectionReactions: "Reactions",
    sectionOther: "Other Activities",
    version2014: "2014",
    version2024: "2024",
    clickToExpand: "Click for full rules",
    keyRule: "Key Rule",
    changedIn2024: "Changed in 2024",
  },
  "pt-BR": {
    title: "Ações em Combate D&D 5e",
    subtitle: "Referência rápida de todas as ações de combate do D&D 5a Edição",
    turnStructureTitle: "Seu Turno",
    movement: "Movimento",
    action: "Ação",
    bonusAction: "Ação Bônus",
    reaction: "Reação",
    freeInteraction: "Interação Livre",
    ifAvailable: "se disponível",
    onTrigger: "ao gatilho",
    sectionActions: "Ações",
    sectionBonus: "Ações Bônus",
    sectionReactions: "Reações",
    sectionOther: "Outras Atividades",
    version2014: "2014",
    version2024: "2024",
    clickToExpand: "Clique para ver as regras completas",
    keyRule: "Regra-Chave",
    changedIn2024: "Alterado em 2024",
  },
} as const;

// ── Actions Data (SRD) ───────────────────────────────────────────
const ACTIONS: ActionEntry[] = [
  // ─── Main Actions ──────────────────────────────────────────────
  {
    id: "attack",
    icon: "\u2694\uFE0F",
    name: { en: "Attack", "pt-BR": "Atacar" },
    description: {
      en: "Make one melee or ranged attack. With the Extra Attack feature, you can make more than one attack with this action.",
      "pt-BR": "Faça um ataque corpo a corpo ou à distância. Com a característica Ataque Extra, você pode fazer mais de um ataque com essa ação.",
    },
    keyRule: {
      en: "One attack per action (unless you have Extra Attack).",
      "pt-BR": "Um ataque por ação (a menos que tenha Ataque Extra).",
    },
    fullText: {
      en: "With this action, you make one melee or ranged attack. The most common action in combat. Certain features, such as the Extra Attack feature of the fighter, allow you to make more than one attack with this action.",
      "pt-BR": "Com esta ação, você faz um ataque corpo a corpo ou à distância. A ação mais comum em combate. Certas características, como o Ataque Extra do guerreiro, permitem fazer mais de um ataque com esta ação.",
    },
    section: "actions",
  },
  {
    id: "cast-a-spell",
    icon: "\u2728",
    name: { en: "Cast a Spell", "pt-BR": "Conjurar uma Magia" },
    description: {
      en: "Cast a spell with a casting time of 1 action. Some spells require a bonus action or reaction instead.",
      "pt-BR": "Conjure uma magia com tempo de conjuração de 1 ação. Algumas magias requerem uma ação bônus ou reação.",
    },
    keyRule: {
      en: "If you cast a bonus action spell, the only other spell you can cast that turn is a cantrip with a casting time of 1 action.",
      "pt-BR": "Se conjurar uma magia de ação bônus, a única outra magia que pode conjurar nesse turno é um truque com tempo de 1 ação.",
    },
    fullText: {
      en: "Spellcasters such as wizards and clerics, as well as many monsters, have access to spells and can use them to great effect in combat. Each spell has a casting time, which specifies whether the caster must use an action, a reaction, minutes, or even hours to cast the spell. If a spell has a casting time of 1 action, the caster uses the Cast a Spell action.",
      "pt-BR": "Conjuradores como magos e clérigos, assim como muitos monstros, têm acesso a magias e podem usá-las com grande efeito em combate. Cada magia tem um tempo de conjuração, que especifica se o conjurador deve usar uma ação, reação, minutos ou até horas para conjurá-la. Se uma magia tem tempo de conjuração de 1 ação, o conjurador usa a ação Conjurar uma Magia.",
    },
    section: "actions",
  },
  {
    id: "dash",
    icon: "\uD83C\uDFC3",
    name: { en: "Dash", "pt-BR": "Disparada" },
    description: {
      en: "Gain extra movement equal to your speed (after applying modifiers) for the current turn.",
      "pt-BR": "Ganhe movimento extra igual à sua velocidade (após modificadores) para o turno atual.",
    },
    keyRule: {
      en: "Extra movement = your current speed. Stacks with speed increases.",
      "pt-BR": "Movimento extra = sua velocidade atual. Acumula com aumentos de velocidade.",
    },
    fullText: {
      en: "When you take the Dash action, you gain extra movement for the current turn. The increase equals your speed, after applying any modifiers. With a speed of 30 feet, for example, you can move up to 60 feet on your turn if you dash. Any increase or decrease to your speed changes this additional movement by the same amount.",
      "pt-BR": "Quando você usa a ação Disparada, ganha movimento extra para o turno atual. O aumento é igual à sua velocidade, após aplicar quaisquer modificadores. Com velocidade de 9 metros, por exemplo, você pode se mover até 18 metros no seu turno ao disparar. Qualquer aumento ou redução na sua velocidade altera esse movimento adicional na mesma proporção.",
    },
    section: "actions",
  },
  {
    id: "disengage",
    icon: "\uD83E\uDD38",
    name: { en: "Disengage", "pt-BR": "Desengajar" },
    description: {
      en: "Your movement doesn't provoke opportunity attacks for the rest of the turn.",
      "pt-BR": "Seu movimento não provoca ataques de oportunidade pelo resto do turno.",
    },
    keyRule: {
      en: "Prevents ALL opportunity attacks until end of your turn.",
      "pt-BR": "Previne TODOS os ataques de oportunidade até o final do seu turno.",
    },
    fullText: {
      en: "If you take the Disengage action, your movement doesn't provoke opportunity attacks for the rest of the turn. This is useful when you need to retreat from melee combat without taking additional damage.",
      "pt-BR": "Se você usar a ação Desengajar, seu movimento não provoca ataques de oportunidade pelo resto do turno. Isso é útil quando você precisa recuar do combate corpo a corpo sem receber dano adicional.",
    },
    section: "actions",
  },
  {
    id: "dodge",
    icon: "\uD83D\uDEE1\uFE0F",
    name: { en: "Dodge", "pt-BR": "Esquivar" },
    description: {
      en: "Until your next turn, attack rolls against you have disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage.",
      "pt-BR": "Até seu próximo turno, jogadas de ataque contra você têm desvantagem se puder ver o atacante, e você faz testes de resistência de Destreza com vantagem.",
    },
    keyRule: {
      en: "Lost if you are incapacitated or your speed drops to 0.",
      "pt-BR": "Perdido se ficar incapacitado ou sua velocidade cair para 0.",
    },
    fullText: {
      en: "When you take the Dodge action, you focus entirely on avoiding attacks. Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage. You lose this benefit if you are incapacitated or if your speed drops to 0.",
      "pt-BR": "Quando você usa a ação Esquivar, foca inteiramente em evitar ataques. Até o início do seu próximo turno, qualquer jogada de ataque feita contra você tem desvantagem se você puder ver o atacante, e você faz testes de resistência de Destreza com vantagem. Você perde esse benefício se ficar incapacitado ou se sua velocidade cair para 0.",
    },
    section: "actions",
  },
  {
    id: "help",
    icon: "\uD83E\uDD1D",
    name: { en: "Help", "pt-BR": "Ajudar" },
    description: {
      en: "Give an ally advantage on their next ability check for a task, or advantage on their next attack roll against a creature within 5 feet of you.",
      "pt-BR": "Dê a um aliado vantagem em seu próximo teste de habilidade para uma tarefa, ou vantagem em sua próxima jogada de ataque contra uma criatura a até 1,5 metro de você.",
    },
    keyRule: {
      en: "The ally must use the advantage before the start of your next turn.",
      "pt-BR": "O aliado deve usar a vantagem antes do início do seu próximo turno.",
    },
    fullText: {
      en: "You can lend your aid to another creature in the completion of a task. When you take the Help action, the creature you aid gains advantage on the next ability check it makes to perform the task you are helping with, provided that it makes the check before the start of your next turn. Alternatively, you can aid a friendly creature in attacking a creature within 5 feet of you. The target of the attack gains advantage on the next attack roll against the target.",
      "pt-BR": "Você pode auxiliar outra criatura na conclusão de uma tarefa. Quando usa a ação Ajudar, a criatura auxiliada ganha vantagem no próximo teste de habilidade que fizer para executar a tarefa que você está ajudando, desde que faça o teste antes do início do seu próximo turno. Alternativamente, você pode auxiliar uma criatura aliada a atacar uma criatura a até 1,5 metro de você. O alvo do ataque ganha vantagem na próxima jogada de ataque contra o alvo.",
    },
    section: "actions",
    versionOverride: {
      "2024": {
        description: {
          en: "Choose one creature within 5 feet. That creature gains advantage on the next ability check or attack roll it makes before the start of your next turn. OR: You can stabilize a dying creature with a DC 10 Wisdom (Medicine) check.",
          "pt-BR": "Escolha uma criatura a até 1,5 metro. Essa criatura ganha vantagem no próximo teste de habilidade ou jogada de ataque que fizer antes do início do seu próximo turno. OU: Você pode estabilizar uma criatura moribunda com um teste CD 10 de Sabedoria (Medicina).",
        },
        keyRule: {
          en: "2024: Target must be within 5 feet. Can also stabilize a dying creature.",
          "pt-BR": "2024: O alvo deve estar a até 1,5 metro. Também pode estabilizar uma criatura moribunda.",
        },
        fullText: {
          en: "When you take the Help action, you do one of the following:\nAssist an Ability Check: Choose one creature within 5 feet of you. That creature has advantage on the next ability check it makes before the start of your next turn.\nAssist an Attack Roll: Choose one creature within 5 feet of you. That creature has advantage on the next attack roll it makes against a target within 5 feet of you before the start of your next turn.\nAlternatively, you can stabilize a dying creature by succeeding on a DC 10 Wisdom (Medicine) check.",
          "pt-BR": "Quando usa a ação Ajudar, você faz um dos seguintes:\nAuxiliar um Teste de Habilidade: Escolha uma criatura a até 1,5 metro de você. Essa criatura tem vantagem no próximo teste de habilidade que fizer antes do início do seu próximo turno.\nAuxiliar uma Jogada de Ataque: Escolha uma criatura a até 1,5 metro de você. Essa criatura tem vantagem na próxima jogada de ataque que fizer contra um alvo a até 1,5 metro de você antes do início do seu próximo turno.\nAlternativamente, você pode estabilizar uma criatura moribunda com um teste CD 10 de Sabedoria (Medicina).",
        },
      },
    },
  },
  {
    id: "hide",
    icon: "\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F",
    name: { en: "Hide", "pt-BR": "Esconder-se" },
    description: {
      en: "Make a Dexterity (Stealth) check to try to hide. If successful, you gain the benefits of being unseen.",
      "pt-BR": "Faça um teste de Destreza (Furtividade) para tentar se esconder. Se bem-sucedido, você ganha os benefícios de estar oculto.",
    },
    keyRule: {
      en: "You must have something to hide behind or be heavily obscured.",
      "pt-BR": "Você deve ter algo atrás do qual se esconder ou estar totalmente obscurecido.",
    },
    fullText: {
      en: "When you take the Hide action, you make a Dexterity (Stealth) check in an attempt to hide, following the rules for hiding. If you succeed, you gain certain benefits: attack rolls against you have disadvantage, and you have advantage on attack rolls against creatures that can't see you.",
      "pt-BR": "Quando você usa a ação Esconder-se, faz um teste de Destreza (Furtividade) na tentativa de se esconder, seguindo as regras de ocultação. Se bem-sucedido, ganha certos benefícios: jogadas de ataque contra você têm desvantagem e você tem vantagem em jogadas de ataque contra criaturas que não podem vê-lo.",
    },
    section: "actions",
  },
  {
    id: "ready",
    icon: "\u23F3",
    name: { en: "Ready", "pt-BR": "Preparar" },
    description: {
      en: "Prepare an action to be triggered later. Specify the trigger circumstance and the action you'll take in response.",
      "pt-BR": "Prepare uma ação para ser ativada depois. Especifique a circunstância de gatilho e a ação que tomará em resposta.",
    },
    keyRule: {
      en: "Uses your reaction when triggered. Readied spells require concentration and expend the spell slot even if not triggered.",
      "pt-BR": "Usa sua reação quando ativado. Magias preparadas requerem concentração e gastam o espaço de magia mesmo se não ativadas.",
    },
    fullText: {
      en: "Sometimes you want to get the jump on a foe or wait for a particular circumstance before you act. To do so, you can take the Ready action on your turn, which lets you act using your reaction before the start of your next turn. First, you decide what perceivable circumstance will trigger your reaction. Then, you choose the action you will take in response to that trigger. When the trigger occurs, you can either take your reaction right after the trigger finishes or ignore the trigger. If you ready a spell, you cast it as normal but hold its energy, which requires concentration.",
      "pt-BR": "Às vezes você quer surpreender um inimigo ou esperar por uma circunstância particular antes de agir. Para isso, você pode usar a ação Preparar no seu turno, que permite agir usando sua reação antes do início do seu próximo turno. Primeiro, você decide qual circunstância perceptível ativará sua reação. Depois, escolhe a ação que tomará em resposta. Quando o gatilho ocorre, você pode usar sua reação logo após o gatilho ou ignorá-lo. Se preparar uma magia, você a conjura normalmente, mas segura sua energia, o que requer concentração.",
    },
    section: "actions",
  },
  {
    id: "search",
    icon: "\uD83D\uDD0D",
    name: { en: "Search", "pt-BR": "Procurar" },
    description: {
      en: "Devote your attention to finding something. Make a Wisdom (Perception) check or an Intelligence (Investigation) check.",
      "pt-BR": "Dedique sua atenção a encontrar algo. Faça um teste de Sabedoria (Percepção) ou Inteligência (Investigação).",
    },
    keyRule: {
      en: "DM determines the appropriate check based on what you're searching for.",
      "pt-BR": "O Mestre determina o teste apropriado com base no que você está procurando.",
    },
    fullText: {
      en: "When you take the Search action, you devote your attention to finding something. Depending on the nature of your search, the DM might have you make a Wisdom (Perception) check or an Intelligence (Investigation) check.",
      "pt-BR": "Quando você usa a ação Procurar, dedica sua atenção a encontrar algo. Dependendo da natureza da busca, o Mestre pode pedir um teste de Sabedoria (Percepção) ou Inteligência (Investigação).",
    },
    section: "actions",
    versionOverride: {
      "2024": {
        description: {
          en: "Make a Wisdom (Perception) check or an Intelligence (Investigation) check. The Study action now covers broader research.",
          "pt-BR": "Faça um teste de Sabedoria (Percepção) ou Inteligência (Investigação). A ação Estudar agora cobre pesquisas mais amplas.",
        },
        keyRule: {
          en: "2024: Search focuses on Perception/Investigation. Study is a separate action for knowledge checks.",
          "pt-BR": "2024: Procurar foca em Percepção/Investigação. Estudar é uma ação separada para testes de conhecimento.",
        },
        fullText: {
          en: "When you take the Search action, you make a Wisdom (Perception) check or an Intelligence (Investigation) check to try to find something. In the 2024 rules, the Search action is more focused: it is used specifically for detecting hidden creatures or objects. The Study action (new in 2024) covers broader knowledge-related checks using Intelligence (Arcana, History, Nature, Religion) or Wisdom (Insight, Medicine, Survival).",
          "pt-BR": "Quando usa a ação Procurar, você faz um teste de Sabedoria (Percepção) ou Inteligência (Investigação) para tentar encontrar algo. Nas regras de 2024, a ação Procurar é mais focada: é usada especificamente para detectar criaturas ou objetos escondidos. A ação Estudar (nova em 2024) cobre testes de conhecimento mais amplos usando Inteligência (Arcanismo, História, Natureza, Religião) ou Sabedoria (Intuição, Medicina, Sobrevivência).",
        },
      },
    },
  },
  {
    id: "use-an-object",
    icon: "\uD83C\uDF92",
    name: { en: "Use an Object", "pt-BR": "Usar um Objeto" },
    description: {
      en: "Interact with a second object on your turn, or use a special object feature such as a potion, magic item, or other equipment.",
      "pt-BR": "Interaja com um segundo objeto no seu turno, ou use uma característica especial de objeto como poção, item mágico ou outro equipamento.",
    },
    keyRule: {
      en: "Your free object interaction covers one simple interaction (like drawing a sword). This action is for anything beyond that.",
      "pt-BR": "Sua interação livre de objeto cobre uma interação simples (como sacar uma espada). Esta ação é para qualquer coisa além disso.",
    },
    fullText: {
      en: "You normally interact with an object while doing something else, such as when you draw a sword as part of an attack. When an object requires your action for its use, you take the Use an Object action. This action is also useful when you want to interact with more than one object on your turn.",
      "pt-BR": "Normalmente você interage com um objeto enquanto faz outra coisa, como quando saca uma espada como parte de um ataque. Quando um objeto requer sua ação para ser usado, você usa a ação Usar um Objeto. Esta ação também é útil quando quer interagir com mais de um objeto no seu turno.",
    },
    section: "actions",
  },

  // ─── Bonus Actions ────────────────────────────────────────────
  {
    id: "two-weapon-fighting",
    icon: "\u2694\uFE0F",
    name: { en: "Two-Weapon Fighting", "pt-BR": "Combate com Duas Armas" },
    description: {
      en: "When you take the Attack action with a light melee weapon, you can use a bonus action to attack with a different light melee weapon in the other hand.",
      "pt-BR": "Quando usa a ação Atacar com uma arma corpo a corpo leve, pode usar uma ação bônus para atacar com uma arma corpo a corpo leve diferente na outra mão.",
    },
    keyRule: {
      en: "Don't add your ability modifier to the damage of the bonus attack, unless that modifier is negative.",
      "pt-BR": "Não adicione seu modificador de habilidade ao dano do ataque bônus, a menos que o modificador seja negativo.",
    },
    fullText: {
      en: "When you take the Attack action and attack with a light melee weapon that you're holding in one hand, you can use a bonus action to attack with a different light melee weapon that you're holding in the other hand. You don't add your ability modifier to the damage of the bonus attack, unless that modifier is negative. If either weapon has the thrown property, you can throw the weapon, instead of making a melee attack with it.",
      "pt-BR": "Quando usa a ação Atacar e ataca com uma arma corpo a corpo leve que está segurando em uma mão, pode usar uma ação bônus para atacar com uma arma corpo a corpo leve diferente que está segurando na outra mão. Você não adiciona seu modificador de habilidade ao dano do ataque bônus, a menos que o modificador seja negativo. Se qualquer uma das armas tiver a propriedade arremesso, você pode arremessar a arma em vez de fazer um ataque corpo a corpo.",
    },
    section: "bonus",
  },
  {
    id: "bonus-action-spells",
    icon: "\u2728",
    name: { en: "Bonus Action Spells", "pt-BR": "Magias de Ação Bônus" },
    description: {
      en: "Some spells have a casting time of 1 bonus action, such as Healing Word, Misty Step, and Spiritual Weapon.",
      "pt-BR": "Algumas magias têm tempo de conjuração de 1 ação bônus, como Palavra Curativa, Passo Nebuloso e Arma Espiritual.",
    },
    keyRule: {
      en: "If you cast a bonus action spell, you can only cast a cantrip with your action that turn.",
      "pt-BR": "Se conjurar uma magia de ação bônus, só pode conjurar um truque com sua ação nesse turno.",
    },
    fullText: {
      en: "A spell cast with a bonus action is especially swift. You must use a bonus action on your turn to cast the spell, provided that you haven't already taken a bonus action this turn. You can't cast another spell during the same turn, except for a cantrip with a casting time of 1 action.",
      "pt-BR": "Uma magia conjurada com ação bônus é especialmente rápida. Você deve usar uma ação bônus no seu turno para conjurá-la, desde que não tenha usado uma ação bônus nesse turno. Você não pode conjurar outra magia durante o mesmo turno, exceto um truque com tempo de conjuração de 1 ação.",
    },
    section: "bonus",
  },

  // ─── Reactions ─────────────────────────────────────────────────
  {
    id: "opportunity-attack",
    icon: "\u26A1",
    name: { en: "Opportunity Attack", "pt-BR": "Ataque de Oportunidade" },
    description: {
      en: "When a hostile creature you can see moves out of your reach, you can use your reaction to make one melee attack against it.",
      "pt-BR": "Quando uma criatura hostil que você pode ver sai do seu alcance, você pode usar sua reação para fazer um ataque corpo a corpo contra ela.",
    },
    keyRule: {
      en: "Triggered by leaving your reach. Disengage prevents this.",
      "pt-BR": "Ativado ao sair do seu alcance. Desengajar previne isso.",
    },
    fullText: {
      en: "In a fight, everyone is constantly watching for a chance to strike an enemy who is fleeing or passing by. When a hostile creature that you can see moves out of your reach, you can use your reaction to make one melee attack against the creature. The attack occurs right before the creature leaves your reach. You can avoid provoking an opportunity attack by taking the Disengage action, or by teleporting, or when someone or something moves you without using your movement, action, or reaction.",
      "pt-BR": "Em uma luta, todos estão constantemente vigiando uma chance de atacar um inimigo que está fugindo ou passando. Quando uma criatura hostil que você pode ver sai do seu alcance, pode usar sua reação para fazer um ataque corpo a corpo contra ela. O ataque ocorre logo antes da criatura sair do seu alcance. Você pode evitar provocar ataques de oportunidade usando a ação Desengajar, teletransportando-se, ou quando alguém ou algo o move sem usar seu movimento, ação ou reação.",
    },
    section: "reactions",
  },
  {
    id: "readied-action",
    icon: "\u23F1\uFE0F",
    name: { en: "Readied Action", "pt-BR": "Ação Preparada" },
    description: {
      en: "When the trigger you specified with the Ready action occurs, you can use your reaction to execute the readied action.",
      "pt-BR": "Quando o gatilho que você especificou com a ação Preparar ocorre, pode usar sua reação para executar a ação preparada.",
    },
    keyRule: {
      en: "You can choose to ignore the trigger when it occurs.",
      "pt-BR": "Você pode escolher ignorar o gatilho quando ele ocorrer.",
    },
    fullText: {
      en: "When the trigger occurs, you can either take your reaction right after the trigger finishes or ignore the trigger. Remember, you can ready only one action per turn, and it uses both your action (to ready) and your reaction (to execute).",
      "pt-BR": "Quando o gatilho ocorre, você pode usar sua reação logo após o gatilho terminar ou ignorar o gatilho. Lembre-se: você pode preparar apenas uma ação por turno, e isso usa tanto sua ação (para preparar) quanto sua reação (para executar).",
    },
    section: "reactions",
  },
  {
    id: "reaction-spells",
    icon: "\u2728",
    name: { en: "Reaction Spells", "pt-BR": "Magias de Reação" },
    description: {
      en: "Some spells can be cast as a reaction, such as Shield and Counterspell, typically with a specific trigger.",
      "pt-BR": "Algumas magias podem ser conjuradas como reação, como Escudo e Contramágica, tipicamente com um gatilho específico.",
    },
    keyRule: {
      en: "Each spell specifies its own trigger condition (e.g., Shield: when hit by an attack).",
      "pt-BR": "Cada magia especifica sua própria condição de gatilho (ex.: Escudo: quando atingido por um ataque).",
    },
    fullText: {
      en: "Certain spells can be cast as reactions. For instance, the Shield spell can be cast when you are hit by an attack or targeted by the Magic Missile spell, and Counterspell can be cast when you see a creature within 60 feet casting a spell. The spell's description specifies exactly when it can be cast.",
      "pt-BR": "Certas magias podem ser conjuradas como reações. Por exemplo, a magia Escudo pode ser conjurada quando você é atingido por um ataque ou alvo da magia Mísseis Mágicos, e Contramágica pode ser conjurada quando vê uma criatura a até 18 metros conjurando uma magia. A descrição da magia especifica exatamente quando pode ser conjurada.",
    },
    section: "reactions",
  },

  // ─── Other Activities ──────────────────────────────────────────
  {
    id: "movement",
    icon: "\uD83D\uDC63",
    name: { en: "Movement", "pt-BR": "Movimento" },
    description: {
      en: "Move up to your speed on your turn. You can split movement before and after your action.",
      "pt-BR": "Mova-se até sua velocidade no seu turno. Pode dividir o movimento antes e depois da ação.",
    },
    keyRule: {
      en: "Movement can be split freely around actions and bonus actions.",
      "pt-BR": "O movimento pode ser dividido livremente entre ações e ações bônus.",
    },
    fullText: {
      en: "On your turn, you can move a distance up to your speed. You can use as much or as little of your speed as you like on your turn. Your movement can include jumping, climbing, and swimming. You can break up your movement, using some before and some after your action. Moving through difficult terrain costs 1 extra foot per foot moved.",
      "pt-BR": "No seu turno, pode se mover uma distância igual à sua velocidade. Pode usar toda ou parte de sua velocidade no seu turno. Seu movimento pode incluir saltar, escalar e nadar. Você pode dividir o movimento, usando parte antes e parte depois da ação. Mover-se por terreno difícil custa 1,5 metro extra por 1,5 metro percorrido.",
    },
    section: "other",
  },
  {
    id: "interact-with-object",
    icon: "\uD83D\uDEAA",
    name: { en: "Interact with Objects", "pt-BR": "Interagir com Objetos" },
    description: {
      en: "One free object interaction per turn, such as drawing a weapon, opening a door, or picking up a dropped item.",
      "pt-BR": "Uma interação livre com objetos por turno, como sacar uma arma, abrir uma porta ou pegar um item caído.",
    },
    keyRule: {
      en: "Only one free interaction per turn. A second requires the Use an Object action.",
      "pt-BR": "Apenas uma interação livre por turno. Uma segunda requer a ação Usar um Objeto.",
    },
    fullText: {
      en: "You can interact with one object for free during your turn, as part of your movement or action. For example: draw or sheathe a sword, open or close a door, pick up a dropped axe, take a potion from a comrade, hand an item to another character. If you want to interact with a second object, you need to use the Use an Object action.",
      "pt-BR": "Você pode interagir com um objeto gratuitamente durante seu turno, como parte de seu movimento ou ação. Por exemplo: sacar ou embainhar uma espada, abrir ou fechar uma porta, pegar um machado caído, pegar uma poção de um aliado, entregar um item a outro personagem. Se quiser interagir com um segundo objeto, precisa usar a ação Usar um Objeto.",
    },
    section: "other",
  },
  {
    id: "communicate",
    icon: "\uD83D\uDCAC",
    name: { en: "Communicate", "pt-BR": "Comunicar-se" },
    description: {
      en: "Speak brief utterances and make gestures as you take your turn. Not limited to your turn.",
      "pt-BR": "Fale frases breves e faça gestos durante seu turno. Não limitado ao seu turno.",
    },
    keyRule: {
      en: "No action required. Keep it brief and reasonable.",
      "pt-BR": "Nenhuma ação necessária. Mantenha breve e razoável.",
    },
    fullText: {
      en: "You can communicate however you are able, through brief utterances and gestures, as you take your turn. You can also communicate on other creatures' turns. The DM determines what is reasonable to say or gesture during a round.",
      "pt-BR": "Você pode se comunicar como puder, através de frases breves e gestos, enquanto realiza seu turno. Também pode se comunicar nos turnos de outras criaturas. O Mestre determina o que é razoável dizer ou gesticular durante uma rodada.",
    },
    section: "other",
  },
];

// ── Section config ────────────────────────────────────────────────
const SECTIONS: { id: SectionId; color: string; borderColor: string; bgHover: string }[] = [
  { id: "actions", color: "#E53E3E", borderColor: "border-l-[#E53E3E]", bgHover: "hover:border-[#E53E3E]/30" },
  { id: "bonus", color: "#D4A853", borderColor: "border-l-[#D4A853]", bgHover: "hover:border-[#D4A853]/30" },
  { id: "reactions", color: "#805AD5", borderColor: "border-l-[#805AD5]", bgHover: "hover:border-[#805AD5]/30" },
  { id: "other", color: "#718096", borderColor: "border-l-[#718096]", bgHover: "hover:border-[#718096]/30" },
];

function getSectionLabel(id: SectionId, locale: Locale): string {
  const L = LABELS[locale];
  switch (id) {
    case "actions": return L.sectionActions;
    case "bonus": return L.sectionBonus;
    case "reactions": return L.sectionReactions;
    case "other": return L.sectionOther;
  }
}

// ── Turn Structure Visual ─────────────────────────────────────────
function TurnStructure({ locale }: { locale: Locale }) {
  const L = LABELS[locale];

  const segments = [
    { label: L.movement, color: "bg-blue-500", note: null },
    { label: L.action, color: "bg-[#E53E3E]", note: null },
    { label: L.bonusAction, color: "bg-[#D4A853]", note: L.ifAvailable },
    { label: L.freeInteraction, color: "bg-gray-500", note: null },
  ];

  const reactionSegment = { label: L.reaction, color: "bg-[#805AD5]", note: L.onTrigger };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 mb-8">
      <h2 className="text-lg font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] mb-4">
        {L.turnStructureTitle}
      </h2>

      {/* Main turn bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-600 text-lg font-light">+</span>}
              <div className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded-sm ${seg.color} shrink-0`} />
                <span className="text-sm text-gray-200 font-medium whitespace-nowrap">
                  {seg.label}
                </span>
                {seg.note && (
                  <span className="text-xs text-gray-500 italic">({seg.note})</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reaction (separate, outside of your turn) */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-3 h-3 rounded-sm ${reactionSegment.color} shrink-0`} />
            <span className="text-sm text-gray-200 font-medium whitespace-nowrap">
              {reactionSegment.label}
            </span>
            <span className="text-xs text-gray-500 italic">({reactionSegment.note})</span>
          </div>
        </div>
      </div>

      {/* Visual bar representation */}
      <div className="mt-4 rounded-lg overflow-hidden h-3 flex" role="presentation">
        <div className="bg-blue-500/70 flex-[3]" title={L.movement} />
        <div className="bg-[#E53E3E]/70 flex-[4]" title={L.action} />
        <div className="bg-[#D4A853]/70 flex-[2]" title={L.bonusAction} />
        <div className="bg-gray-500/70 flex-[1]" title={L.freeInteraction} />
      </div>
      <div className="flex mt-1 text-[10px] text-gray-600">
        <span className="flex-[3]">{L.movement}</span>
        <span className="flex-[4]">{L.action}</span>
        <span className="flex-[2]">{L.bonusAction}</span>
        <span className="flex-[1]">{L.freeInteraction}</span>
      </div>
    </div>
  );
}

// ── Action Card ───────────────────────────────────────────────────
function ActionCard({
  action,
  locale,
  version,
  sectionColor,
  isExpanded,
  onToggle,
}: {
  action: ActionEntry;
  locale: Locale;
  version: RulesetVersion;
  sectionColor: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const L = LABELS[locale];

  // Check for version override
  const override = action.versionOverride?.[version];
  const description = override?.description?.[locale] ?? action.description[locale];
  const keyRule = override?.keyRule?.[locale] ?? action.keyRule[locale];
  const fullText = override?.fullText?.[locale] ?? action.fullText[locale];
  const hasOverride = !!action.versionOverride?.[version];

  return (
    <button
      onClick={onToggle}
      className={`text-left rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900/80 transition-all p-4 group cursor-pointer border-l-4 ${
        isExpanded ? "ring-1 ring-[#D4A853]/30" : ""
      }`}
      style={{ borderLeftColor: sectionColor }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" role="img" aria-hidden>
          {action.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] text-base">
              {action.name[locale]}
            </h3>
            {hasOverride && version === "2024" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800/30">
                {L.changedIn2024}
              </span>
            )}
          </div>
          {locale === "pt-BR" && (
            <p className="text-xs text-gray-500 italic">{action.name.en}</p>
          )}
          <p className={`text-sm text-gray-400 mt-1.5 ${isExpanded ? "" : "line-clamp-2"}`}>
            {description}
          </p>

          {/* Key Rule highlight */}
          <div className="mt-2 rounded-md bg-gray-800/60 border border-gray-700/50 px-3 py-2">
            <p className="text-xs font-semibold text-[#D4A853] mb-0.5">{L.keyRule}</p>
            <p className="text-xs text-gray-300">{keyRule}</p>
          </div>

          {/* Expanded full text */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {fullText}
              </p>
            </div>
          )}

          {!isExpanded && (
            <span className="text-xs text-[#D4A853] mt-2 inline-block opacity-0 group-hover:opacity-100 transition-opacity">
              {L.clickToExpand}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function PublicActionsGrid({ locale = "en" }: PublicActionsGridProps) {
  const [version, setVersion] = useState<RulesetVersion>("2024");
  const [expanded, setExpanded] = useState<string | null>(null);
  const L = LABELS[locale];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--5e-text,#F5F0E8)] font-[family-name:var(--font-cinzel)]">
          {L.title}
        </h1>
        <p className="text-[var(--5e-text-muted,#9C8E7C)] mt-1">{L.subtitle}</p>
      </div>

      {/* Version toggle */}
      <div className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1 border border-gray-800 w-fit">
        <button
          onClick={() => setVersion("2014")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            version === "2014"
              ? "bg-[#D4A853] text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {L.version2014}
        </button>
        <button
          onClick={() => setVersion("2024")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            version === "2024"
              ? "bg-[#D4A853] text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {L.version2024}
        </button>
      </div>

      {/* Turn structure visual */}
      <TurnStructure locale={locale} />

      {/* Sections */}
      {SECTIONS.map((section) => {
        const sectionActions = ACTIONS.filter((a) => a.section === section.id);
        if (sectionActions.length === 0) return null;

        return (
          <div key={section.id} className="space-y-3">
            <h2
              className="text-xl font-bold text-[#F5F0E8] font-[family-name:var(--font-cinzel)] flex items-center gap-2"
              style={{ color: section.color }}
            >
              <span
                className="inline-block w-1 h-6 rounded-full"
                style={{ backgroundColor: section.color }}
              />
              {getSectionLabel(section.id, locale)}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sectionActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  locale={locale}
                  version={version}
                  sectionColor={section.color}
                  isExpanded={expanded === action.id}
                  onToggle={() =>
                    setExpanded(expanded === action.id ? null : action.id)
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
