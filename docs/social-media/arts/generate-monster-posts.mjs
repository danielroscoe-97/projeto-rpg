/**
 * Generates all 21 "Monstro da Semana" HTML posts from SRD data.
 * Based on the approved Owlbear (post-02) template.
 *
 * Usage: node docs/social-media/arts/generate-monster-posts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRD_PATH = path.resolve(__dirname, '../../../data/srd/monsters-2014.json');
const OUT_DIR = __dirname;

const srdData = JSON.parse(fs.readFileSync(SRD_PATH, 'utf8'));

// ── Monster definitions (all 21) ──────────────────────────────────
const MONSTERS = [
  // Tier S
  { num: 3, slug: 'ancient-red-dragon', name: 'Ancient Red Dragon', namePt: 'Dragão Vermelho Ancião',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Montanhas vulcânicas</strong> e <strong>cavernas imensas</strong>. Ele precisa de espaço pra voar e usar o sopro de fogo em cone de 27m.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Ataca do ar com Frightful Presence primeiro. Pousa só pra morder. <strong>Usa Legendary Actions todo turno.</strong> Nunca dá combate justo.' },
      ability: { label: 'FIRE BREATH', text: 'Cone de 27m, <strong>26d6 fogo</strong> (média 91). Recharge 5-6. Se recarregar, o grupo inteiro pode morrer. <strong>Espalhem-se.</strong>' }
    },
    combo: '<strong>1 Ancient Red Dragon</strong> + kobold cultists + terreno elevado = TPK garantido. <strong>Boss final de campanha</strong> nível 17+.',
    lore: 'Na Volsunga Saga, Fafnir era um anão que se transformou em dragão por ganância, deitando sobre um tesouro amaldiçoado até ser morto por Sigurd. Dragões vermelhos antigos carregam essa mesma obsessão: o ouro é mais vício que riqueza.',
    loreSource: 'Volsunga Saga, séc. XIII, Islândia (domínio público)',
    curiosidade: 'Fafnir inspirou todo arquétipo de dragão sobre tesouro. No D&D, o Red Dragon é o único que organiza moedas por valor.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 4, slug: 'tarrasque', name: 'Tarrasque', namePt: 'Tarrasca',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Campo aberto</strong>. Não importa o terreno. A Tarrasca destrói tudo. Siege Monster ignora resistência de objetos e estruturas.' },
      behavior: { label: 'COMPORTAMENTO', text: '<strong>Engole criaturas inteiras.</strong> Multiattack com 5 ataques por turno. Reflective Carapace reflete magic missiles e raios.' },
      ability: { label: 'FRIGHTFUL PRESENCE', text: 'DC 17 Wisdom save ou fica frightened por 1 min. Alcance de 36m. <strong>Começa o combate quebrando o moral.</strong>' }
    },
    combo: 'A Tarrasca <strong>não precisa de combo</strong>. Ela É o encontro. Party nível 20 com itens lendários. Boa sorte.',
    lore: 'A Tarasque era uma besta que devastava a Provença até ser domada por Santa Marta apenas com orações e água benta. Os aldeões a mataram depois, indefesa. A cidade de Tarascon leva seu nome até hoje.',
    loreSource: 'Legenda Áurea, Jacopo de Varazze, séc. XIII (domínio público)',
    curiosidade: 'No folclore original, a besta foi vencida sem combate. No D&D, o Tarrasque tem CR 30 e nenhuma fraqueza conhecida. Boa sorte rezando.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 5, slug: 'lich', name: 'Lich', namePt: 'Lich',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Seu próprio covil</strong> com Lair Actions. Paredes de force, anti-magic zones e armadilhas arcanas em cada corredor.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Spellcaster de nível 18. Abre com Power Word Kill ou Disintegrate. <strong>Legendary Resistance 3x</strong> garante que seus planos funcionem.' },
      ability: { label: 'PARALYZING TOUCH', text: '3d6 cold damage + DC 18 CON save ou fica <strong>paralisado por 1 min.</strong> Legendary Action de 2 ações. Usa entre turnos.' }
    },
    combo: '<strong>Lich</strong> + death knight guarda-costas + skeleton army + lair actions = o arco final da campanha.',
    lore: 'Koschei, o Imortal, escondia sua alma dentro de uma agulha, dentro de um ovo, dentro de um pato, dentro de uma lebre, dentro de um baú numa ilha remota. Só destruindo a agulha ele morria. O Lich e seu phylactery seguem a mesma lógica.',
    loreSource: 'Folclore eslavo, conto de Koschei Bessmertnyi, tradição oral russa (domínio público)',
    curiosidade: 'A mecânica de phylactery do D&D é quase idêntica à alma-na-agulha de Koschei. Se você não achar o recipiente, o Lich volta em 1d10 dias.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 6, slug: 'mimic', name: 'Mimic', namePt: 'Mímico',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Dungeons com tesouros.</strong> Baús, portas, estantes. Qualquer objeto pode ser um Mimic. A paranoia é a arma real.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Fica imóvel até alguém tocar. Adhesive gruda o alvo. <strong>Bite + Pseudopod</strong> enquanto a vítima tenta se soltar.' },
      ability: { label: 'FALSE APPEARANCE', text: 'Indistinguível de um objeto real enquanto imóvel. <strong>Nenhuma Perception detecta.</strong> Só toque físico revela.' }
    },
    combo: '<strong>3 Mimics</strong> disfarçados em sala de tesouro + 1 real chest = jogadores nunca mais confiam em baús.',
    lore: 'Bestiários medievais descreviam a leucrocota, criatura que imitava vozes humanas para atrair viajantes e devorá-los. Plínio, o Velho, registrou relatos de feras que simulavam choro de criança nas florestas da Etiópia.',
    loreSource: 'Naturalis Historia, Plínio, o Velho, séc. I d.C. (domínio público)',
    curiosidade: 'O Mimic foi criado em 1977 especificamente para punir jogadores gananciosos que abrem todo baú sem pensar. Design puro de armadilha.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  // Tier A
  { num: 7, slug: 'kraken', name: 'Kraken', namePt: 'Kraken',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Oceano aberto ou lago subterrâneo.</strong> 18m de natação. Tenta afundar o navio primeiro, depois caça sobreviventes.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Tentacle grapple + Fling joga alvos 18m longe. <strong>Lightning Storm</strong> atinge 3 criaturas a 36m. Controla o campo de batalha.' },
      ability: { label: 'TENTACLE', text: 'Alcance de 9m, <strong>grapple automático</strong> (escape DC 18). Pode atacar 3 tentáculos por turno via Legendary Actions.' }
    },
    combo: '<strong>Kraken</strong> + tempestade + navio danificado = combate em 3 frentes: monstro, mar e naufrágio.',
    lore: 'O bispo Erik Pontoppidan descreveu o Kraken como uma ilha viva que arrastava navios inteiros para o fundo. Marinheiros noruegueses juravam que o mar borbulhava antes de seus tentáculos surgirem.',
    loreSource: 'Det forste Forsog paa Norges naturlige Historie, Erik Pontoppidan, 1752 (domínio público)',
    curiosidade: 'Pontoppidan achava que o Kraken era real. No D&D, ele controla o clima e lança raios. Lulas colossais reais chegam a 13 metros.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 8, slug: 'hydra', name: 'Hydra', namePt: 'Hidra',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Pântanos e rios.</strong> Hidras nadam e respiram na água. Emboscada na margem enquanto o grupo atravessa.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Uma Bite por cabeça. Começa com 5 = <strong>5 ataques por turno</strong>. Cortar cabeça sem fogo/ácido = 2 cabeças novas.' },
      ability: { label: 'MULTIPLE HEADS', text: 'Advantage em saves contra blind, charm, deaf, fright, stun, knockout. <strong>Reactive Heads:</strong> reação extra por cabeça a mais que 1.' }
    },
    combo: '<strong>Hydra</strong> + pântano difícil terrain + 2 lizardfolk = party presa na lama enquanto cabeças atacam.',
    lore: 'Héracles enfrentou a Hidra de Lerna como seu segundo trabalho. Cada cabeça cortada gerava duas novas, até que seu sobrinho Iolau cauterizou os cotos com fogo. Uma das cabeças era imortal e foi enterrada sob uma rocha.',
    loreSource: 'Bibliotheca, Pseudo-Apolodoro, séc. I-II d.C. (domínio público)',
    curiosidade: 'No D&D, a Hydra regenera cabeças a menos que o coto receba dano de fogo ou ácido. A mecânica é cópia direta do mito grego.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 9, slug: 'chimera', name: 'Chimera', namePt: 'Quimera',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Montanhas e desfiladeiros.</strong> Voa a 18m, ataca do alto. Ninho em penhascos inacessíveis. Caça gado e viajantes.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Mergulha com Multiattack: <strong>Bite + Horns + Claws</strong> em um turno. Sem inteligência tática (INT 3), ataca o mais próximo.' },
      ability: { label: 'FIRE BREATH', text: 'Cone de 4,5m, <strong>7d8 fogo</strong> (Recharge 5-6). A cabeça de dragão cospe. Menos range que um dragão real, mas devastador pra nível 5-6.' }
    },
    combo: '<strong>Chimera</strong> + terreno elevado com penhascos = jogadores sem cobertura. Adicione vento forte pra penalizar ranged attacks.',
    lore: 'Homero descreve a Quimera como leão na frente, cabra no meio e serpente atrás, cuspindo fogo que devastava a Lícia. Belerofonte a matou montado em Pégaso, enfiando chumbo em sua garganta que derreteu com o próprio fogo da besta.',
    loreSource: 'Ilíada, Canto VI, Homero, séc. VIII a.C. (domínio público)',
    curiosidade: 'O termo "quimera" virou sinônimo de impossibilidade na ciência. No D&D, a Chimera tem sopro de fogo do componente dragão, não da cabra.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 10, slug: 'medusa', name: 'Medusa', namePt: 'Medusa',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Ruínas e templos antigos</strong> cheios de estátuas (vítimas petrificadas). O grupo não sabe quem é estátua e quem é decoração.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Usa Petrifying Gaze primeiro. Jogadores precisam decidir: <strong>olhar e arriscar</strong> ou lutar com disadvantage (olhos fechados).' },
      ability: { label: 'PETRIFYING GAZE', text: 'DC 14 CON save ou começa a petrificar. Falha em 2 turnos seguidos = <strong>petrificado permanente.</strong> Reversível só com Greater Restoration.' }
    },
    combo: '<strong>Medusa</strong> + corredores estreitos + espelhos = paranoia. Espelhos refletem o olhar dela contra ela mesma.',
    lore: 'Ovídio conta que Medusa era uma bela sacerdotisa de Atena, transformada em monstro como punição após ser violada por Poseidon no templo. Perseu a decapitou usando seu escudo como espelho, sem nunca olhar diretamente para ela.',
    loreSource: 'Metamorfoses, Livro IV, Ovídio, 8 d.C. (domínio público)',
    curiosidade: 'No D&D, o olhar petrificante funciona igual ao mito: espelhos refletem o efeito. Jogadores espertos carregam espelhos de bolso por isso.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 11, slug: 'minotaur', name: 'Minotaur', namePt: 'Minotauro',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Labirintos e corredores longos.</strong> Labyrinthine Recall = nunca se perde. Charge precisa de 3m de corrida. Corredores perfeitos.' },
      behavior: { label: 'COMPORTAMENTO', text: '<strong>Reckless:</strong> ataca com advantage mas recebe com advantage também. Charge + Gore = extra 2d8 + push 3m. Agressivo e suicida.' },
      ability: { label: 'CHARGE', text: 'Move 3m+ em linha reta e acerta Gore = <strong>+2d8 piercing extra</strong> e DC 14 STR save ou cai prone. Devastador em corredores.' }
    },
    combo: '<strong>2 Minotaurs</strong> em lados opostos de um labirinto + pit traps nos cruzamentos = party dividida e encurralada.',
    lore: 'O Minotauro era filho de Pasífae e um touro divino, trancado no Labirinto de Creta construído por Dédalo. A cada nove anos, sete rapazes e sete moças de Atenas eram enviados como sacrifício, até Teseu entrar com o fio de Ariadne.',
    loreSource: 'Bibliotheca, Pseudo-Apolodoro, séc. I-II d.C. (domínio público)',
    curiosidade: 'O palácio de Cnossos, em Creta, tinha corredores tão complexos que pode ter inspirado a lenda. No D&D, Minotauros nunca se perdem em labirintos.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 12, slug: 'vampire', name: 'Vampire', namePt: 'Vampiro',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Mansão ou castelo</strong> à noite. Spider Climb nas paredes. Charm vítimas antes do combate. O covil inteiro é sua arma.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Charm primeiro, isola o alvo, Bite pra drenar. <strong>Legendary Resistance 3x</strong> + Regeneration 20 HP/turno. Desgasta o grupo aos poucos.' },
      ability: { label: 'CHARM', text: 'DC 17 WIS save ou é charmed por 24h. Alvo obedece comandos verbais. <strong>Pode dividir o grupo antes do combate começar.</strong>' }
    },
    combo: '<strong>Vampire</strong> + 3 vampire spawn + noite + mansão com saídas trancadas = horror survival nível 10+.',
    lore: 'O caso de Arnold Paole em 1731 foi investigado oficialmente pelo exército austríaco: corpos exumados tinham sangue fresco e unhas crescidas. O relatório Visum et Repertum chegou às cortes europeias e disparou o pânico vampírico do século XVIII.',
    loreSource: 'Visum et Repertum, relatório militar austríaco, 1732 (domínio público)',
    curiosidade: 'Vampiros do D&D precisam ser convidados para entrar, regra que vem do folclore sérvio. Estacas não matam no D&D, apenas paralisam.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 13, slug: 'werewolf', name: 'Werewolf', namePt: 'Lobisomem',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Florestas à noite, vilas isoladas.</strong> Forma humana de dia, lobo à noite. O grupo pode conviver com o monstro sem saber.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Em Hybrid Form: <strong>Bite + Claws</strong> por turno. Immune a ataques não-mágicos e não-prateados. Fighters sem magia = inúteis.' },
      ability: { label: 'LYCANTHROPY', text: 'Bite transmite a maldição. DC 12 CON save ou jogador vira lobisomem. <strong>Remove Curse</strong> antes da primeira lua cheia ou é permanente.' }
    },
    combo: '<strong>Pack de 3 Werewolves</strong> + lobos normais + floresta densa à noite = emboscada clássica de horror.',
    lore: 'O Satyricon de Petrônio contém um dos primeiros relatos de licantropia: um soldado tira as roupas sob a lua cheia, urina em círculo ao redor delas, e se transforma em lobo. Quem tocasse as roupas ficava petrificado.',
    loreSource: 'Satyricon, Petrônio, séc. I d.C. (domínio público)',
    curiosidade: 'A fraqueza a prata vem de tradições medievais francesas. No D&D, licantropia é uma maldição transmissível por mordida com cura por Remove Curse.',
    acTypeEn: '', acTypePt: '' },

  { num: 14, slug: 'death-knight', name: 'Death Knight', namePt: 'Cavaleiro da Morte',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Fortalezas e campos de batalha antigos.</strong> Marshal Undead dá advantage em saves pra mortos-vivos próximos. Lidere um exército.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Spellcaster + fighter. Abre com <strong>Destructive Wave</strong> ou <strong>Banishment</strong>. Longsword +11 com Hellfire Orb como finisher.' },
      ability: { label: 'HELLFIRE ORB', text: '1/dia, 6m radius, <strong>10d6 fogo + 10d6 necrótico</strong>. DC 18 DEX save. Total médio: 70 dano. Não pega aliados mortos-vivos.' }
    },
    combo: '<strong>Death Knight</strong> + wight lieutenants + skeleton army + desecrated ground = exército dos mortos.',
    lore: 'A Chanson de Roland narra como o paladino Rolando, traído por Ganelão, morreu em Roncesvales recusando pedir socorro. Imagine um Rolando que quebrasse seu juramento e retornasse como morto-vivo, consumido por ódio e fogo infernal.',
    loreSource: 'La Chanson de Roland, autor anônimo, séc. XI (domínio público)',
    curiosidade: 'Death Knights no D&D mantêm os poderes de paladino corrompidos. O Hellfire Orb deles causa 10d6 de fogo que ignora resistência de fiends.',
    acTypeEn: 'Plate, Shield', acTypePt: 'Placas, Escudo' },

  // Tier B
  { num: 15, slug: 'goblin', name: 'Goblin', namePt: 'Goblin',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Cavernas estreitas e armadilhas.</strong> Goblins são Small. Passam por espaços que PCs Medium não conseguem. Túneis a favor deles.' },
      behavior: { label: 'COMPORTAMENTO', text: '<strong>Nimble Escape:</strong> Disengage ou Hide como bonus action. Ataca, recua, esconde. Frustrantemente evasivos em grupo.' },
      ability: { label: 'NIMBLE ESCAPE', text: 'Hide ou Disengage como <strong>bonus action</strong>. Cada turno: ataca com Shortbow, Hide atrás de cobertura. Ranged harassment perfeito.' }
    },
    combo: '<strong>6 Goblins</strong> + Goblin Boss + armadilhas improvisadas + caverna escura = primeiro encontro clássico de toda campanha.',
    lore: 'Christina Rossetti descreveu goblins como mercadores traiçoeiros que vendiam frutas encantadas para moças incautas. Na tradição inglesa, goblins sempre oferecem algo tentador, mas o preço é sempre pior que a recompensa.',
    loreSource: 'Goblin Market, Christina Rossetti, 1862 (domínio público)',
    curiosidade: 'No D&D, Goblins têm Nimble Escape, podendo Disengage ou Hide como ação bônus. São fracos, mas irritantemente difíceis de acertar.',
    acTypeEn: 'Leather Armor, Shield', acTypePt: 'Couro, Escudo' },

  { num: 16, slug: 'skeleton', name: 'Skeleton', namePt: 'Esqueleto',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Criptas, catacumbas, campos de batalha.</strong> Surgem do chão. Use em ondas crescentes pra criar tensão e desgaste de recursos.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Sem inteligência (INT 6). Seguem ordens simples do necromante. <strong>Melhor em hordas</strong> que individualmente. Ação: ataque ou guarda.' },
      ability: { label: 'VULNERABILITY: BLUDGEONING', text: '<strong>Dano contundente é a fraqueza.</strong> Martelos e maças destroem ossos. Fighters com versatile weapons mudem pra two-handed.' }
    },
    combo: '<strong>12 Skeletons</strong> + corredor estreito (3 de frente) + necromante atrás = guerra de atrito. Desgasta spell slots.',
    lore: 'Jason e os Argonautas enfrentaram guerreiros esqueletos nascidos dos dentes do dragão de Ares, semeados na terra por Cadmo. Os spartoi brotavam do solo já armados e lutavam até a destruição total, sem medo ou hesitação.',
    loreSource: 'Argonautica, Apolônio de Rodes, séc. III a.C. (domínio público)',
    curiosidade: 'Esqueletos são o soldado descartável perfeito da necromancia no D&D. Animate Dead mantém controle por 24h, depois eles ficam hostis a tudo.',
    acTypeEn: 'Armor Scraps', acTypePt: 'Restos de Armadura' },

  { num: 17, slug: 'zombie', name: 'Zombie', namePt: 'Zumbi',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Espaços confinados e becos sem saída.</strong> Speed de 6m é lenta. Compensa com Undead Fortitude. Eles não param de vir.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Vai em linha reta pro alvo mais próximo. Sem tática. <strong>A ameaça é a persistência</strong>, não a inteligência. Hordas exaurem recursos.' },
      ability: { label: 'UNDEAD FORTITUDE', text: 'Ao cair pra 0 HP (exceto radiant/crit), DC 5+dano CON save. Sucesso = fica com 1 HP. <strong>O zumbi que não morre.</strong>' }
    },
    combo: '<strong>8 Zombies</strong> + porta trancada atrás + espaço fechado = pânico. Cada um que "morre" pode levantar de novo.',
    lore: 'A etnógrafa Zora Neale Hurston documentou no Haiti relatos de bokors que usavam pó de tetrodotoxina do baiacu para simular morte. A vítima acordava em estado catatônico, sem vontade própria, forçada a trabalhar nos campos de cana.',
    loreSource: 'Tell My Horse, Zora Neale Hurston, 1938 (domínio público)',
    curiosidade: 'Zumbis do D&D têm Undead Fortitude: ao cair a 0 HP, rolam CON save para ficar com 1 HP. Representam a teimosia do corpo sem alma.',
    acTypeEn: '', acTypePt: '' },

  { num: 18, slug: 'troll', name: 'Troll', namePt: 'Troll',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Pontes, passagens estreitas, pântanos.</strong> O Troll bloqueia o caminho. 2,7m de altura, regenera. Você paga pedágio ou luta.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Multiattack: <strong>Bite + 2 Claws</strong> = 29 dano médio/turno. Regenera 10 HP/turno. Sem fogo ou ácido, é efetivamente imortal.' },
      ability: { label: 'REGENERATION', text: '<strong>10 HP por turno</strong> no início do turno. Só para se levar fogo ou ácido. Morre de verdade só se começar turno com 0 HP e sem regen.' }
    },
    combo: '<strong>Troll</strong> + rio/pântano (difícil terrain pra party) + chuva (apaga tochas) = pesadelo pra grupos sem casters.',
    lore: 'Na Edda Prosaica, trolls eram gigantes que viravam pedra ao serem atingidos pela luz do sol. Viviam sob pontes e em cavernas, e sua estupidez era tão lendária quanto sua força bruta e capacidade de regenerar ferimentos.',
    loreSource: 'Edda Prosaica, Snorri Sturluson, séc. XIII, Islândia (domínio público)',
    curiosidade: 'No folclore nórdico, trolls temem o sol. No D&D, temem fogo e ácido. A regeneração de 10 HP por turno só para com esses dois tipos de dano.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 19, slug: 'rust-monster', name: 'Rust Monster', namePt: 'Monstro Ferrugem',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Minas e dungeons com metal.</strong> Sente ferro não-mágico a 9m. Corre direto pros fighters com plate armor. Prioridade: o melhor equipamento.' },
      behavior: { label: 'COMPORTAMENTO', text: 'Não ataca pra matar. <strong>Antennae destroem armas e armaduras de metal.</strong> Fighters perdem AC e DPR. O horror é econômico.' },
      ability: { label: 'RUST METAL', text: 'Toque nas antenas: arma de metal não-mágico <strong>pega -1 permanente</strong>. Em -5, é destruída. Armadura igual. Sem save.' }
    },
    combo: '<strong>2 Rust Monsters</strong> + corredor estreito antes do boss = party chega no boss sem armadura. Terror psicológico.',
    lore: 'Bestiários medievais descreviam a salamandra como criatura tão venenosa que frutas de árvores por onde passava se tornavam letais, e a água que tocava, mortal. O terror de corromper o que é útil é ancestral.',
    loreSource: 'De Proprietatibus Rerum, Bartholomaeus Anglicus, séc. XIII (domínio público)',
    curiosidade: 'O Rust Monster foi inventado por Gary Gygax a partir de um brinquedo de plástico sem nome. Guerreiros perdem armadura +1 em um toque. Pesadelo puro.',
    acTypeEn: 'Natural Armor', acTypePt: 'Armadura Natural' },

  { num: 20, slug: 'gelatinous-cube', name: 'Gelatinous Cube', namePt: 'Cubo Gelatinoso',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Corredores de dungeon 3x3m.</strong> O cubo preenche o corredor inteiro. Transparente. O grupo anda direto pra dentro dele.' },
      behavior: { label: 'COMPORTAMENTO', text: '<strong>Engulf:</strong> move sobre criaturas. DC 12 DEX save ou é engolido. Dentro: restrained + 6d6 ácido por turno. Escape DC 12.' },
      ability: { label: 'TRANSPARENT', text: 'DC 15 Perception pra notar. <strong>Se não perceber, o cubo tem surprise.</strong> Em corredor escuro sem Darkvision, é quase invisível.' }
    },
    combo: '<strong>Gelatinous Cube</strong> + corredor sem saída + porta trancada atrás = o cubo empurra o grupo pra um dead end.',
    lore: 'Plínio, o Velho, descreveu criaturas marinhas amorfas que dissolviam tudo que tocavam, impossíveis de ferir com lança porque a carne se fechava ao redor da arma. Gelatinas que limpam corredores ecoam esses relatos de seres sem forma fixa.',
    loreSource: 'Naturalis Historia, Plínio, o Velho, séc. I d.C. (domínio público)',
    curiosidade: 'O Gelatinous Cube tem exatamente 3x3x3m porque os corredores padrão de dungeon medem 3m. Ele é literalmente o faxineiro do labirinto.',
    acTypeEn: '', acTypePt: '' },

  { num: 21, slug: 'flameskull', name: 'Flameskull', namePt: 'Crânio Flamejante',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Salas de dungeon com teto alto.</strong> Voa (hover), fica fora de alcance melee. Ilumina a sala com luz própria. Guarda áreas específicas.' },
      behavior: { label: 'COMPORTAMENTO', text: '<strong>Spellcaster:</strong> Fireball (8d6, 6m radius) + Fire Ray ranged. Fica voando e bombardeando. Magic Resistance pra sobreviver counters.' },
      ability: { label: 'REJUVENATION', text: 'Se destruído, <strong>reforma em 1 hora</strong> com HP cheio. Só Holy Water no crânio ou Dispel Magic impede. O puzzle É descobrir isso.' }
    },
    combo: '<strong>2 Flameskulls</strong> + sala fechada + treasure bait = Fireball cruzado. 16d6 se ambos acertarem. Party nível 4 sente.',
    lore: 'As Mil e Uma Noites descrevem djinns presos em lâmpadas e crânios encantados que guardavam tesouros em ruínas desérticas. Guardiões mágicos eternos, incapazes de abandonar seu posto, são um tema recorrente na literatura árabe medieval.',
    loreSource: 'As Mil e Uma Noites, compilação, séc. IX-XIV (domínio público)',
    curiosidade: 'Flameskulls se regeneram em 1 hora a menos que sejam aspergidos com água benta. Muitos grupos os matam três vezes antes de descobrir isso.',
    acTypeEn: '', acTypePt: '' },

  { num: 22, slug: 'doppelganger', name: 'Doppelganger', namePt: 'Doppelganger',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Cidades e tavernas.</strong> Qualquer NPC pode ser um Doppelganger. O melhor terreno é a confiança que o grupo tem nos aliados.' },
      behavior: { label: 'COMPORTAMENTO', text: '<strong>Read Thoughts</strong> + Shapechanger. Copia aparência e lê mentes. Infiltra o grupo como NPC aliado. Ataca quando menos esperam.' },
      ability: { label: 'SURPRISE ATTACK', text: 'Se surpreender o alvo, <strong>+3d6 dano extra</strong> no primeiro hit. Combinado com Read Thoughts = emboscada perfeita.' }
    },
    combo: '<strong>Doppelganger</strong> substituindo NPC quest-giver + informação falsa = o grupo faz o trabalho errado por sessões.',
    lore: 'Jean Paul Richter cunhou o termo Doppelgänger em 1796 para descrever o duplo fantasmagórico de uma pessoa viva. Na tradição germânica, ver seu próprio duplo era presságio de morte iminente. Lincoln relatou ter visto o seu antes do assassinato.',
    loreSource: 'Siebenkäs, Jean Paul Richter, 1796 (domínio público)',
    curiosidade: 'Doppelgangers no D&D leem mentes superficiais automaticamente. Jogadores paranoicos com NPCs suspeitos viram um tropo clássico de mesa.',
    acTypeEn: '', acTypePt: '' },

  { num: 23, slug: 'oni', name: 'Oni', namePt: 'Oni',
    tactics: {
      terrain: { label: 'TERRENO IDEAL', text: '<strong>Vilas remotas e castelos.</strong> Change Shape pra se disfarçar de nobre ou mercador. Voa à noite pra caçar. Inteligência de 14 = planos complexos.' },
      behavior: { label: 'COMPORTAMENTO', text: '<strong>Glaive</strong> pra dano (2d10+4, alcance 3m) + Innate Spellcasting (Cone of Cold, Darkness, Invisibility). Regenera 10 HP/turno.' },
      ability: { label: 'CHANGE SHAPE', text: 'Assume forma Small ou Medium. Pode ser <strong>qualquer humanoide.</strong> Mantém stats. O vilão perfeito pra arcos de intriga e investigação.' }
    },
    combo: '<strong>Oni</strong> disfarçado de líder da vila + sequestro de crianças à noite + investigação do grupo = horror mystery.',
    lore: 'No Konjaku Monogatarishu, oni desciam das montanhas disfarçados de monges ou belas mulheres para sequestrar viajantes. Portavam kanabo de ferro e devoravam humanos vivos. Só heróis com astúcia ou relíquias sagradas os derrotavam.',
    loreSource: 'Konjaku Monogatarishu, compilação, séc. XII, Japão (domínio público)',
    curiosidade: 'No D&D, Oni podem mudar de forma à vontade e voar invisíveis. O provérbio japonês "oni ni kanabo" significa dar vantagem a quem já é forte.',
    acTypeEn: 'Chain Mail', acTypePt: 'Cota de Malha' }
];

// ── Translation helpers ──────────────────────────────────────────
const TYPE_PT = {
  dragon: 'Dragão', monstrosity: 'Monstruosidade', undead: 'Morto-Vivo',
  humanoid: 'Humanoide', giant: 'Gigante', ooze: 'Gosma'
};
const SIZE_PT = {
  Gargantuan: 'Gigantesco', Huge: 'Enorme', Large: 'Grande',
  Medium: 'Médio', Small: 'Pequeno', Tiny: 'Minúsculo'
};
const DMG_PT = {
  piercing: 'perfurante', slashing: 'cortante', bludgeoning: 'contundente',
  fire: 'fogo', cold: 'frio', lightning: 'relâmpago', thunder: 'trovão',
  poison: 'veneno', acid: 'ácido', necrotic: 'necrótico', radiant: 'radiante',
  psychic: 'psíquico', force: 'energia'
};
const ATTACK_PT = {
  Bite: 'Mordida', Claw: 'Garra', Claws: 'Garras', Tail: 'Cauda',
  Tentacle: 'Tentáculo', Horns: 'Chifres', Pseudopod: 'Pseudópode',
  Greataxe: 'Machado Grande', Gore: 'Investida', Slam: 'Golpe',
  Scimitar: 'Cimitarra', Shortbow: 'Arco Curto', Shortsword: 'Espada Curta',
  Longbow: 'Arco Longo', Longsword: 'Espada Longa', Glaive: 'Glaive',
  'Snake Hair': 'Cabelo Serpentino', 'Fire Ray': 'Raio de Fogo',
  'Paralyzing Touch': 'Toque Paralisante', 'Spear (Humanoid Form Only)': 'Lança',
  'Bite (Wolf or Hybrid Form Only)': 'Mordida', 'Claws (Hybrid Form Only)': 'Garras',
  'Unarmed Strike (Vampire Form Only)': 'Golpe Desarmado',
  'Bite (Bat or Vampire Form Only)': 'Mordida',
  'Claw (Oni Form Only)': 'Garra', Antennae: 'Antenas'
};
const TRAIT_PT = {
  'Legendary Resistance (3/Day)': 'Resistência Lendária (3/Dia)',
  'Magic Resistance': 'Resistência à Magia',
  'Reflective Carapace': 'Carapaça Reflexiva',
  'Siege Monster': 'Monstro de Cerco',
  Rejuvenation: 'Rejuvenescimento',
  'Turn Resistance': 'Resistência a Expulsar',
  Spellcasting: 'Conjuração',
  Shapechanger: 'Metamorfo',
  'Adhesive (Object Form Only)': 'Adesivo',
  'False Appearance (Object Form Only)': 'Aparência Falsa',
  Grappler: 'Agarrador',
  Amphibious: 'Anfíbio',
  'Freedom of Movement': 'Liberdade de Movimento',
  'Hold Breath': 'Prender Respiração',
  'Multiple Heads': 'Múltiplas Cabeças',
  'Reactive Heads': 'Cabeças Reativas',
  Wakeful: 'Sempre Alerta',
  'Petrifying Gaze': 'Olhar Petrificante',
  Charge: 'Investida',
  'Labyrinthine Recall': 'Memória Labiríntica',
  Reckless: 'Imprudente',
  'Misty Escape': 'Fuga Nebulosa',
  Regeneration: 'Regeneração',
  'Spider Climb': 'Escalar Aranhas',
  'Vampire Weaknesses': 'Fraquezas de Vampiro',
  'Keen Hearing and Smell': 'Audição e Faro Aguçados',
  'Marshal Undead': 'Marechal dos Mortos-Vivos',
  'Nimble Escape': 'Fuga Ágil',
  'Undead Fortitude': 'Fortitude Morta-Viva',
  'Keen Smell': 'Faro Aguçado',
  'Iron Scent': 'Farejar Ferro',
  'Rust Metal': 'Enferrujar Metal',
  'Ooze Cube': 'Cubo de Gosma',
  Transparent: 'Transparente',
  Illumination: 'Iluminação',
  Ambusher: 'Emboscador',
  'Surprise Attack': 'Ataque Surpresa',
  'Magic Weapons': 'Armas Mágicas',
  'Innate Spellcasting': 'Conjuração Inata',
  'Legendary Resistance (3/Day)': 'Resistência Lendária (3/Dia)'
};

function extractAttacks(srd) {
  const attacks = [];
  for (const a of (srd.actions || [])) {
    const hitMatch = a.desc?.match?.(/([+-]\d+) to hit/);
    const dmgMatch = a.desc?.match?.(/(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s+(\w+)\s+damage/i);
    if (hitMatch) {
      attacks.push({ name: a.name, bonus: hitMatch[1], avgDmg: dmgMatch?.[1], dice: dmgMatch?.[2] || '?', type: dmgMatch?.[3] || '' });
    }
  }
  return attacks;
}

function speedWalkFt(speed) {
  const w = speed?.walk || '30 ft.';
  return parseInt(w) || 30;
}
function speedMeters(ft) {
  const map = {5:1.5,10:3,15:4.5,20:6,25:7.5,30:9,40:12,50:15,60:18,80:24,90:27,100:30,120:36};
  return map[ft] || Math.round(ft / 3.28);
}
function speedExtraEn(speed) {
  const parts = [];
  if (speed?.fly) parts.push(`fly ${speed.fly}`);
  if (speed?.swim) parts.push(`swim ${speed.swim}`);
  if (speed?.climb) parts.push(`climb ${speed.climb}`);
  if (speed?.burrow) parts.push(`burrow ${speed.burrow}`);
  return parts.join(', ');
}
function speedExtraPt(speed) {
  const parts = [];
  const conv = (s) => { const ft = parseInt(s); return `${speedMeters(ft)}m${s.includes('hover') ? ' (pairar)' : ''}`; };
  if (speed?.fly) parts.push(`voo ${conv(speed.fly)}`);
  if (speed?.swim) parts.push(`natação ${conv(speed.swim)}`);
  if (speed?.climb) parts.push(`escalada ${conv(speed.climb)}`);
  if (speed?.burrow) parts.push(`escavar ${conv(speed.burrow)}`);
  return parts.join(', ');
}
function abilityClass(score, type) {
  if (type === 'str' || type === 'con') return score >= 18 ? ' ability-high' : score <= 8 ? ' ability-low' : '';
  if (type === 'dex') return score >= 18 ? ' ability-high' : score <= 8 ? ' ability-low' : '';
  return score >= 18 ? ' ability-high' : score <= 7 ? ' ability-low' : '';
}
function translateDmgType(en) { return DMG_PT[en?.toLowerCase()] || en; }
function translateAttackName(en) { return ATTACK_PT[en] || en; }
function topTraits(traits, max) {
  if (!traits || traits.length === 0) return '';
  return traits.slice(0, max).map(t => `<div class="special-tag">${t}</div>`).join(' ');
}
function topTraitsPt(traits, max) {
  if (!traits || traits.length === 0) return '';
  return traits.slice(0, max).map(t => `<div class="special-tag">${TRAIT_PT[t] || t}</div>`).join(' ');
}

// Choose top 2-3 attacks to display (skip Multiattack, Frightful Presence etc)
function pickAttacks(attacks, max = 3) {
  return attacks.slice(0, max);
}

// ── Color theme by CR ────────────────────────────────────────────
function crColor(cr) {
  const n = cr === '1/4' ? 0.25 : cr === '1/2' ? 0.5 : parseFloat(cr);
  if (n >= 20) return '#8E44AD'; // purple for legendary
  if (n >= 10) return '#C0392B'; // red for high
  return '#C0392B'; // default red
}

// ── HTML Generator ───────────────────────────────────────────────
function generatePost(monster, srd) {
  const { num, slug, name, namePt, tactics, combo, lore, curiosidade, acTypeEn, acTypePt } = monster;
  const hp = srd.hit_points;
  const hpFormula = srd.hp_formula;
  const ac = srd.armor_class;
  const walkFt = speedWalkFt(srd.speed);
  const walkM = speedMeters(walkFt);
  const extraEn = speedExtraEn(srd.speed);
  const extraPt = speedExtraPt(srd.speed);
  const cr = srd.cr;
  const size = srd.size;
  const type = srd.type;
  const sizePt = SIZE_PT[size] || size;
  const typePt = TYPE_PT[type] || type;
  const allAttacks = extractAttacks(srd);
  const attacks = allAttacks.slice(0, 3);
  const hasMultiattack = srd.actions?.some(a => a.name === 'Multiattack' || a.name?.includes('Multiattack'));
  const traits = (srd.special_abilities || []).map(t => t.name);

  const acExtraEn = acTypeEn ? `<div style="font-family:'JetBrains Mono',monospace; font-size:17px; color:#666; margin-top:14px;">${acTypeEn}</div>` : '';
  const acExtraPt = acTypePt ? `<div style="font-family:'JetBrains Mono',monospace; font-size:17px; color:#666; margin-top:14px;">${acTypePt}</div>` : '';
  const speedExtraEnLine = extraEn ? `<div style="font-family:'JetBrains Mono',monospace; font-size:14px; color:#666; margin-top:4px;">${extraEn}</div>` : '';
  const speedExtraPtLine = extraPt ? `<div style="font-family:'JetBrains Mono',monospace; font-size:14px; color:#666; margin-top:4px;">${extraPt}</div>` : '';

  // Attack lines EN
  const attackLinesEn = attacks.map(a => `    <div class="attack-line">
      <span><span class="attack-name">${a.name}</span></span>
      <span><span class="attack-bonus">${a.bonus}</span> &nbsp; <span class="attack-dmg">${a.dice} ${a.type}</span></span>
    </div>`).join('\n');

  // Attack lines PT
  const attackLinesPt = attacks.map(a => `    <div class="attack-line">
      <span><span class="attack-name">${translateAttackName(a.name)}</span></span>
      <span><span class="attack-bonus">${a.bonus}</span> &nbsp; <span class="attack-dmg">${a.dice} ${translateDmgType(a.type)}</span></span>
    </div>`).join('\n');

  const attackTitleEn = hasMultiattack ? 'MULTIATTACK' : 'ATTACKS';
  const attackTitlePt = hasMultiattack ? 'ATAQUES MÚLTIPLOS' : 'ATAQUES';

  const traitsEn = topTraits(traits, 2);
  const traitsPt = topTraitsPt(traits, 2);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080">
<title>Post #${String(num).padStart(2,'0')} — Monstro da Semana: ${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0f; display: flex; flex-direction: column; align-items: center; gap: 40px; padding: 40px; font-family: 'Plus Jakarta Sans', sans-serif; }
  .slide-label { font-family: 'JetBrains Mono', monospace; color: #666; font-size: 14px; margin-bottom: -30px; }
  .slide { width: 1080px; height: 1080px; position: relative; overflow: hidden; flex-shrink: 0; }
  .tag { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; padding: 10px 24px; border-radius: 4px; }
  .tag-red { color: #C0392B; background: rgba(192,57,43,0.12); border: 1px solid rgba(192,57,43,0.3); }
  .cr-badge { display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; background: rgba(192,57,43,0.15); border: 2px solid #C0392B; font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 28px; color: #C0392B; }
  .watermark { position: absolute; bottom: 30px; right: 30px; width: 70px; height: 70px; opacity: 0.18; z-index: 2; }
  .handle { position: absolute; bottom: 48px; left: 40px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; color: rgba(212,168,83,0.5); z-index: 2; }
  .dots { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 2; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(152,150,160,0.3); }
  .dot.active { background: #D4A853; width: 24px; border-radius: 4px; }
  .corner-ornament { position: absolute; width: 60px; height: 60px; border-color: rgba(212,168,83,0.2); border-style: solid; z-index: 2; }
  .corner-tl { top: 30px; left: 30px; border-width: 2px 0 0 2px; }
  .corner-tr { top: 30px; right: 30px; border-width: 2px 2px 0 0; }
  .corner-bl { bottom: 30px; left: 30px; border-width: 0 0 2px 2px; }
  .corner-br { bottom: 30px; right: 30px; border-width: 0 2px 2px 0; }
  .sep { width: 120px; height: 2px; background: linear-gradient(90deg, transparent, #D4A853, transparent); margin: 15px 0; }
  .logo-svg { fill: none; }
  .logo-svg .lg { stroke: #D4A853; stroke-linejoin: round; }
  .logo-svg .lg path:first-child { stroke-width: 10; stroke-linecap: round; }

  /* SLIDE 1 */
  .slide-1 { background: #13131E; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; gap: 20px; }
  .slide-1::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 500px 500px at 50% 50%, rgba(192,57,43,0.06) 0%, transparent 70%); }
  .slide-1::after { content: ''; position: absolute; inset: 12px; border: 1.5px solid rgba(192,57,43,0.15); border-radius: 2px; pointer-events: none; }
  .monster-art { width: 440px; height: 440px; position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; }
  .slide-1 .monster-name { font-family: 'Cinzel', serif; font-weight: 900; font-size: ${name.length > 18 ? '52' : name.length > 14 ? '60' : '72'}px; color: #D4A853; text-shadow: 0 0 60px rgba(212,168,83,0.3); position: relative; z-index: 1; letter-spacing: 4px; text-align: center; }

  /* SLIDE 2-3 STATS */
  .slide-stats { background: #1A1A28; padding: 60px 70px; display: flex; flex-direction: column; }
  .slide-stats::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent, #C0392B, transparent); }
  .stat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
  .stat-name { font-family: 'Cinzel', serif; font-weight: 700; font-size: ${name.length > 18 ? '32' : '42'}px; color: #D4A853; }
  .stat-row { display: flex; gap: 30px; margin-bottom: 25px; }
  .stat-block { flex: 1; background: rgba(212,168,83,0.06); border: 1px solid rgba(212,168,83,0.15); border-radius: 8px; padding: 20px; text-align: center; }
  .stat-label { font-family: 'JetBrains Mono', monospace; font-size: 20px; color: #9896A0; letter-spacing: 2px; margin-bottom: 8px; }
  .stat-value { font-family: 'JetBrains Mono', monospace; font-size: 48px; font-weight: 700; color: #F5F0E8; }
  .stat-value-hp { color: #2ECC71; }
  .stat-value-ac { color: #D4A853; }
  .stat-value-spd { color: #3498DB; }
  .hp-bar { width: 100%; height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; margin-top: 8px; overflow: hidden; }
  .hp-fill { height: 100%; border-radius: 6px; background: linear-gradient(90deg, #27ae60, #2ecc71); width: 100%; }
  .ability-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 20px 0; }
  .ability { text-align: center; padding: 15px 0; background: rgba(255,255,255,0.03); border-radius: 6px; }
  .ability-name { font-family: 'JetBrains Mono', monospace; font-size: 18px; color: #9896A0; margin-bottom: 6px; }
  .ability-score { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 700; color: #F5F0E8; }
  .ability-high { color: #2ECC71; }
  .ability-low { color: #C0392B; }
  .attacks-section { margin-top: 15px; padding: 25px; background: rgba(192,57,43,0.06); border: 1px solid rgba(192,57,43,0.15); border-radius: 8px; }
  .attack-title { font-family: 'JetBrains Mono', monospace; font-size: 19px; color: #C0392B; letter-spacing: 2px; margin-bottom: 15px; }
  .attack-line { font-family: 'JetBrains Mono', monospace; font-size: ${attacks.length > 3 ? '22' : '26'}px; color: #F5F0E8; margin-bottom: 10px; display: flex; justify-content: space-between; }
  .attack-name { color: #D4A853; }
  .attack-bonus { color: #2ECC71; }
  .attack-dmg { color: #C0392B; }
  .special-tag { display: inline-block; margin-top: 15px; padding: 8px 16px; background: rgba(212,168,83,0.1); border: 1px solid rgba(212,168,83,0.25); border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 20px; color: #D4A853; }

  /* SLIDE 4 TACTICS */
  .slide-tactics { background: #1A1A28; padding: 60px 70px; display: flex; flex-direction: column; }
  .slide-tactics::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent, #C0392B, transparent); }
  .section-title { font-family: 'Cinzel', serif; font-weight: 700; font-size: 42px; color: #D4A853; margin-bottom: 40px; }
  .tactic-item { display: flex; gap: 25px; margin-bottom: 35px; align-items: flex-start; }
  .tactic-icon { width: 60px; height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 36px; background: rgba(212,168,83,0.08); border-radius: 12px; border: 1px solid rgba(212,168,83,0.15); }
  .tactic-label { font-family: 'JetBrains Mono', monospace; font-size: 18px; color: #D4A853; letter-spacing: 2px; margin-bottom: 10px; }
  .tactic-text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; color: #C8C6C0; line-height: 1.5; }
  .tactic-text strong { color: #F5F0E8; font-weight: 600; }
  .combo-box { margin-top: 20px; padding: 25px 30px; background: rgba(192,57,43,0.08); border: 1px solid rgba(192,57,43,0.2); border-radius: 8px; }
  .combo-label { font-family: 'JetBrains Mono', monospace; font-size: 16px; color: #C0392B; letter-spacing: 2px; margin-bottom: 10px; }
  .combo-text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; color: #F5F0E8; line-height: 1.5; }

  /* SLIDE 5 LORE */
  .slide-lore { background: #1A1A28; padding: 70px 80px; display: flex; flex-direction: column; justify-content: center; }
  .slide-lore::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent, #C0392B, transparent); }
  .slide-lore::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 800px 600px at 50% 50%, rgba(212,168,83,0.03) 0%, transparent 70%); }
  .lore-quote { position: relative; z-index: 1; padding: 40px 50px; border-left: 4px solid rgba(212,168,83,0.4); }
  .lore-quote::before { content: '\\201C'; position: absolute; top: -20px; left: 10px; font-family: 'Cinzel', serif; font-size: 120px; color: rgba(212,168,83,0.15); line-height: 1; }
  .lore-text { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; color: #C8C6C0; line-height: 1.7; font-style: italic; word-spacing: 2px; }
  .lore-text strong { color: #D4A853; font-style: normal; font-weight: 600; }
  .lore-source { font-family: 'JetBrains Mono', monospace; font-size: 18px; color: #9896A0; margin-top: 30px; position: relative; z-index: 1; }

  /* SLIDE 6 CTA */
  .slide-cta { background: #13131E; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px; text-align: center; }
  .slide-cta::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 700px 500px at 50% 50%, rgba(212,168,83,0.07) 0%, transparent 70%); }
  .slide-cta::after { content: ''; position: absolute; inset: 12px; border: 1.5px solid rgba(212,168,83,0.15); border-radius: 2px; pointer-events: none; }
  .watermark-big { width: 140px; height: 140px; opacity: 0.9; position: relative; bottom: auto; right: auto; }
  .cta-text { font-family: 'Cinzel', serif; font-weight: 700; font-size: 44px; color: #F5F0E8; line-height: 1.3; position: relative; z-index: 1; margin: 30px 0; }
  .cta-text em { font-style: normal; color: #D4A853; }
  .cta-sub { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 26px; color: #9896A0; position: relative; z-index: 1; }
  .cta-button { margin-top: 40px; padding: 22px 60px; background: linear-gradient(180deg, #E8C87A 0%, #D4A853 50%, #B8903D 100%); border-radius: 8px; font-family: 'Cinzel', serif; font-weight: 700; font-size: 22px; color: #13131E; position: relative; z-index: 1; box-shadow: 0 0 40px rgba(212,168,83,0.3); }
  .cta-handle { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 22px; color: rgba(212,168,83,0.6); margin-top: 25px; position: relative; z-index: 1; }
</style>
</head>
<body>

<!-- ===== SLIDE 1 — CAPA ===== -->
<p class="slide-label">Slide 1 / 6 — Capa</p>
<div class="slide slide-1">
  <div class="corner-ornament corner-tl"></div>
  <div class="corner-ornament corner-tr"></div>
  <div class="corner-ornament corner-bl"></div>
  <div class="corner-ornament corner-br"></div>

  <div class="tag tag-red">Monstro da Semana</div>

  <div class="monster-art">
    <img src="assets/${slug}.png" alt="${name}" style="width:420px; height:auto; object-fit:contain; filter:drop-shadow(0 0 60px rgba(192,57,43,0.4)) drop-shadow(0 0 120px rgba(212,168,83,0.15));" onerror="this.src='../../../public/art/decorations/orc-silhouette.svg'; this.style.width='220px'; this.style.height='220px'; this.style.opacity='0.6';">
  </div>

  <div class="monster-name">${name.toUpperCase()}</div>
  <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:22px; color:#9896A0; position:relative; z-index:1; margin-top:-10px; letter-spacing:3px;">${namePt}</div>

  <div style="display:flex; align-items:center; gap:20px; position:relative; z-index:1;">
    <div style="width:56px; height:56px; border-radius:50%; overflow:hidden; border:2px solid rgba(192,57,43,0.5); box-shadow:0 0 20px rgba(192,57,43,0.3);">
      <img src="assets/${slug}-token.png" alt="" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'">
    </div>
    <div style="display:flex; flex-direction:column; gap:2px;">
      <span style="font-family:'JetBrains Mono',monospace; font-size:20px; color:#9896A0;">${size} ${type.charAt(0).toUpperCase() + type.slice(1)}</span>
      <span style="font-family:'JetBrains Mono',monospace; font-size:18px; font-weight:700; color:#C0392B;">CR ${cr}</span>
    </div>
  </div>

  <div class="dots">
    <div class="dot active"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
  <div class="handle">@pocket.dm</div>
  <svg class="watermark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="wg1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e8c87a"/><stop offset="50%" stop-color="#d4a853"/><stop offset="100%" stop-color="#b8903d"/></linearGradient></defs><g stroke="url(#wg1)" stroke-linejoin="round" fill="none"><g stroke-linecap="round"><path stroke-width="10" d="m256 110 123 75v150l-123 75-123-75V185z"/></g><path fill="url(#wg1)" stroke-width="2" d="M130 174 110 37l85 55 61-88 61 88 85-55-20 137-126-82Z"/></g></svg>
</div>

<!-- ===== SLIDE 2 — STATS EN ===== -->
<p class="slide-label">Slide 2 / 6 — Stats EN</p>
<div class="slide slide-stats">
  <div class="stat-header">
    <div class="stat-name" style="display:flex; flex-direction:column; gap:2px;">
      <span>${name}</span>
      <span style="font-family:'Plus Jakarta Sans',sans-serif; font-size:18px; font-weight:400; color:#9896A0; font-variant:normal; text-transform:none; letter-spacing:0;">${namePt}</span>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
        <div style="width:48px; height:48px; border-radius:50%; overflow:hidden; border:2px solid rgba(192,57,43,0.5); box-shadow:0 0 15px rgba(192,57,43,0.3);">
          <img src="assets/${slug}-token.png" alt="" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'">
        </div>
        <span style="font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:700; color:#C0392B;">CR ${cr}</span>
      </div>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-block">
      <div class="stat-label">HP</div>
      <div class="stat-value stat-value-hp">${hp}</div>
      <div class="hp-bar"><div class="hp-fill"></div></div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:17px; color:#666; margin-top:6px;">${hpFormula}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">AC</div>
      <div class="stat-value stat-value-ac">${ac}</div>
      ${acExtraEn}
    </div>
    <div class="stat-block">
      <div class="stat-label">SPEED</div>
      <div class="stat-value stat-value-spd">${walkFt}</div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:17px; color:#666; margin-top:14px;">ft</div>
      ${speedExtraEnLine}
    </div>
  </div>

  <div class="ability-grid">
    <div class="ability"><div class="ability-name">STR</div><div class="ability-score${abilityClass(srd.str,'str')}">${srd.str}</div></div>
    <div class="ability"><div class="ability-name">DEX</div><div class="ability-score${abilityClass(srd.dex,'dex')}">${srd.dex}</div></div>
    <div class="ability"><div class="ability-name">CON</div><div class="ability-score${abilityClass(srd.con,'con')}">${srd.con}</div></div>
    <div class="ability"><div class="ability-name">INT</div><div class="ability-score${abilityClass(srd.int,'int')}">${srd.int}</div></div>
    <div class="ability"><div class="ability-name">WIS</div><div class="ability-score${abilityClass(srd.wis,'wis')}">${srd.wis}</div></div>
    <div class="ability"><div class="ability-name">CHA</div><div class="ability-score${abilityClass(srd.cha,'cha')}">${srd.cha}</div></div>
  </div>

  <div class="attacks-section">
    <div class="attack-title">${attackTitleEn}</div>
${attackLinesEn}
  </div>

  ${traitsEn}

  <div style="position:absolute; bottom:70px; left:50%; transform:translateX(-50%); z-index:2;">
    <div style="padding:6px 16px; background:rgba(212,168,83,0.08); border:1px solid rgba(212,168,83,0.2); border-radius:20px; display:flex; align-items:center; gap:6px;">
      <span style="font-family:'JetBrains Mono',monospace; font-size:12px; color:#D4A853; letter-spacing:1px;">DESLIZE PARA PT-BR</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="#D4A853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  </div>

  <div class="dots">
    <div class="dot"></div>
    <div class="dot active"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
  <div class="handle">@pocket.dm</div>
  <svg class="watermark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="wg2" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e8c87a"/><stop offset="50%" stop-color="#d4a853"/><stop offset="100%" stop-color="#b8903d"/></linearGradient></defs><g stroke="url(#wg2)" stroke-linejoin="round" fill="none"><g stroke-linecap="round"><path stroke-width="10" d="m256 110 123 75v150l-123 75-123-75V185z"/></g><path fill="url(#wg2)" stroke-width="2" d="M130 174 110 37l85 55 61-88 61 88 85-55-20 137-126-82Z"/></g></svg>
</div>

<!-- ===== SLIDE 3 — STATS PT-BR ===== -->
<p class="slide-label">Slide 3 / 6 — Stats PT-BR</p>
<div class="slide slide-stats">
  <div class="stat-header">
    <div class="stat-name" style="display:flex; flex-direction:column; gap:2px;">
      <span>${namePt}</span>
      <span style="font-family:'Plus Jakarta Sans',sans-serif; font-size:18px; font-weight:400; color:#9896A0; font-variant:normal; text-transform:none; letter-spacing:0;">${name}</span>
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
        <div style="width:48px; height:48px; border-radius:50%; overflow:hidden; border:2px solid rgba(192,57,43,0.5); box-shadow:0 0 15px rgba(192,57,43,0.3);">
          <img src="assets/${slug}-token.png" alt="" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.style.display='none'">
        </div>
        <span style="font-family:'JetBrains Mono',monospace; font-size:16px; font-weight:700; color:#C0392B;">ND ${cr}</span>
      </div>
    </div>
  </div>

  <div class="stat-row">
    <div class="stat-block">
      <div class="stat-label">PV</div>
      <div class="stat-value stat-value-hp">${hp}</div>
      <div class="hp-bar"><div class="hp-fill"></div></div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:17px; color:#666; margin-top:6px;">${hpFormula}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">CA</div>
      <div class="stat-value stat-value-ac">${ac}</div>
      ${acExtraPt}
    </div>
    <div class="stat-block">
      <div class="stat-label">DESL.</div>
      <div class="stat-value stat-value-spd">${walkM}</div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:17px; color:#666; margin-top:14px;">m</div>
      ${speedExtraPtLine}
    </div>
  </div>

  <div class="ability-grid">
    <div class="ability"><div class="ability-name">FOR</div><div class="ability-score${abilityClass(srd.str,'str')}">${srd.str}</div></div>
    <div class="ability"><div class="ability-name">DES</div><div class="ability-score${abilityClass(srd.dex,'dex')}">${srd.dex}</div></div>
    <div class="ability"><div class="ability-name">CON</div><div class="ability-score${abilityClass(srd.con,'con')}">${srd.con}</div></div>
    <div class="ability"><div class="ability-name">INT</div><div class="ability-score${abilityClass(srd.int,'int')}">${srd.int}</div></div>
    <div class="ability"><div class="ability-name">SAB</div><div class="ability-score${abilityClass(srd.wis,'wis')}">${srd.wis}</div></div>
    <div class="ability"><div class="ability-name">CAR</div><div class="ability-score${abilityClass(srd.cha,'cha')}">${srd.cha}</div></div>
  </div>

  <div class="attacks-section">
    <div class="attack-title">${attackTitlePt}</div>
${attackLinesPt}
  </div>

  ${traitsPt}

  <div style="position:absolute; bottom:70px; left:50%; transform:translateX(-50%); z-index:2;">
    <div style="padding:6px 16px; background:rgba(74,158,92,0.1); border:1px solid rgba(74,158,92,0.25); border-radius:20px;">
      <span style="font-family:'JetBrains Mono',monospace; font-size:12px; color:#4A9E5C; letter-spacing:1px;">TRADUÇÃO PT-BR</span>
    </div>
  </div>

  <div class="dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot active"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
  <div class="handle">@pocket.dm</div>
  <svg class="watermark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="wg2b" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e8c87a"/><stop offset="50%" stop-color="#d4a853"/><stop offset="100%" stop-color="#b8903d"/></linearGradient></defs><g stroke="url(#wg2b)" stroke-linejoin="round" fill="none"><g stroke-linecap="round"><path stroke-width="10" d="m256 110 123 75v150l-123 75-123-75V185z"/></g><path fill="url(#wg2b)" stroke-width="2" d="M130 174 110 37l85 55 61-88 61 88 85-55-20 137-126-82Z"/></g></svg>
</div>

<!-- ===== SLIDE 4 — TACTICS ===== -->
<p class="slide-label">Slide 4 / 6 — Taticas</p>
<div class="slide slide-tactics">
  <div class="section-title">Como Usar</div>

  <div class="tactic-item">
    <div class="tactic-icon"><svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M16 4v24M8 12l8-8 8 8M6 28h20" stroke="#2ECC71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/><path d="M10 20l6-6 6 6" stroke="#2ECC71" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/></svg></div>
    <div class="tactic-content">
      <div class="tactic-label">${tactics.terrain.label}</div>
      <div class="tactic-text">${tactics.terrain.text}</div>
    </div>
  </div>

  <div class="tactic-item">
    <div class="tactic-icon"><svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M6 26L20 12M20 12V18M20 12H14" stroke="#C0392B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 26L12 12M12 12V18M12 12H18" stroke="#C0392B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="26" r="1.5" fill="#C0392B" opacity="0.6"/><circle cx="26" cy="26" r="1.5" fill="#C0392B" opacity="0.6"/></svg></div>
    <div class="tactic-content">
      <div class="tactic-label">${tactics.behavior.label}</div>
      <div class="tactic-text">${tactics.behavior.text}</div>
    </div>
  </div>

  <div class="tactic-item">
    <div class="tactic-icon"><svg width="28" height="28" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="15" r="9" stroke="#D4A853" stroke-width="1.8"/><ellipse cx="16" cy="24" rx="7" ry="2" stroke="#D4A853" stroke-width="1.2" opacity="0.4"/><path d="M12 13q2-3 4-1t4-1" stroke="#D4A853" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><circle cx="13.5" cy="12" r="1" fill="#D4A853" opacity="0.3"/><circle cx="19" cy="10.5" r="0.7" fill="#D4A853" opacity="0.3"/></svg></div>
    <div class="tactic-content">
      <div class="tactic-label">${tactics.ability.label}</div>
      <div class="tactic-text">${tactics.ability.text}</div>
    </div>
  </div>

  <div class="combo-box">
    <div class="combo-label">COMBO SUGERIDO</div>
    <div class="combo-text">${combo}</div>
  </div>

  <div class="dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot active"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
  <div class="handle">@pocket.dm</div>
  <svg class="watermark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="wg3" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e8c87a"/><stop offset="50%" stop-color="#d4a853"/><stop offset="100%" stop-color="#b8903d"/></linearGradient></defs><g stroke="url(#wg3)" stroke-linejoin="round" fill="none"><g stroke-linecap="round"><path stroke-width="10" d="m256 110 123 75v150l-123 75-123-75V185z"/></g><path fill="url(#wg3)" stroke-width="2" d="M130 174 110 37l85 55 61-88 61 88 85-55-20 137-126-82Z"/></g></svg>
</div>

<!-- ===== SLIDE 5 — LORE ===== -->
<p class="slide-label">Slide 5 / 6 — Lore</p>
<div class="slide slide-lore">
  <div class="section-title" style="position:relative; z-index:1;">Lore</div>

  <div class="lore-quote">
    <div class="lore-text">${lore}</div>
  </div>

  <div class="lore-source" style="margin-left:50px;">— ${monster.loreSource || 'SRD 5.1, Bestiário'}</div>

  <div style="position:relative; z-index:1; margin-top:50px; padding:25px 35px; background:rgba(212,168,83,0.06); border-radius:8px; border:1px solid rgba(212,168,83,0.12);">
    <div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:24px; color:#9896A0; line-height:1.6;">
      <strong style="color:#D4A853;">Curiosidade:</strong> ${curiosidade}
    </div>
  </div>

  <div class="dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot active"></div>
    <div class="dot"></div>
  </div>
  <div class="handle">@pocket.dm</div>
  <svg class="watermark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="wg4" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e8c87a"/><stop offset="50%" stop-color="#d4a853"/><stop offset="100%" stop-color="#b8903d"/></linearGradient></defs><g stroke="url(#wg4)" stroke-linejoin="round" fill="none"><g stroke-linecap="round"><path stroke-width="10" d="m256 110 123 75v150l-123 75-123-75V185z"/></g><path fill="url(#wg4)" stroke-width="2" d="M130 174 110 37l85 55 61-88 61 88 85-55-20 137-126-82Z"/></g></svg>
</div>

<!-- ===== SLIDE 6 — CTA ===== -->
<p class="slide-label">Slide 6 / 6 — CTA</p>
<div class="slide slide-cta">
  <div class="corner-ornament corner-tl"></div>
  <div class="corner-ornament corner-tr"></div>
  <div class="corner-ornament corner-bl"></div>
  <div class="corner-ornament corner-br"></div>

  <svg class="watermark watermark-big" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="wg5" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#e8c87a"/><stop offset="50%" stop-color="#d4a853"/><stop offset="100%" stop-color="#b8903d"/></linearGradient></defs><g stroke="url(#wg5)" stroke-linejoin="round" fill="none"><g stroke-linecap="round"><path stroke-width="10" d="m256 110 123 75v150l-123 75-123-75V185z"/><path stroke-width="6" d="m256 194-80 132h160z" opacity=".55"/><path stroke-width="5" d="m256 110-80 216M256 110l80 216M256 410l-80-84M256 410l80-84" opacity=".5"/></g><path fill="url(#wg5)" stroke-width="2" d="M130 174 110 37l85 55 61-88 61 88 85-55-20 137-126-82Z"/></g></svg>

  <div class="sep" style="position:relative; z-index:1;"></div>

  <div class="cta-text">Vai usar <em>${namePt}</em><br>na próxima sessão?</div>
  <div class="cta-sub">Stat block completo traduzido para PT-BR.<br>Iniciativa, HP, condições. Tudo automático.</div>
  <div style="position:relative; z-index:1; margin:16px 0 8px; padding:12px 24px; background:rgba(74,158,92,0.08); border:1px solid rgba(74,158,92,0.2); border-radius:8px; text-align:center;">
    <span style="font-family:'Plus Jakarta Sans',sans-serif; font-size:20px; color:#4A9E5C; font-weight:600;">Tradução PT-BR completa e gratuita</span>
  </div>
  <div class="cta-button">GRATUITO · LINK NA BIO</div>
  <div class="cta-handle">@pocket.dm</div>
</div>

</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────
let count = 0;
for (const monster of MONSTERS) {
  const srd = srdData.find(m => m.name === monster.name);
  if (!srd) {
    console.error(`SRD data not found for: ${monster.name}`);
    continue;
  }
  const html = generatePost(monster, srd);
  const filename = `post-${String(monster.num).padStart(2, '0')}-monstro-${monster.slug}.html`;
  fs.writeFileSync(path.join(OUT_DIR, filename), html, 'utf8');
  count++;
  console.log(`  ${filename}`);
}
console.log(`\nGenerated ${count} monster posts.`);
