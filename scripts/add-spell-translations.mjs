import fs from 'fs';

const descsPath = './public/srd/spell-descriptions-pt.json';
const descs = JSON.parse(fs.readFileSync(descsPath, 'utf-8'));

const newDescs = {
  "acid-arrow": {
    "name_pt": "Flecha Ácida",
    "description": "Uma flecha verde cintilante dispara em direção a um alvo dentro do alcance e explode em um jato de ácido. Faça um ataque de magia à distância contra o alvo. Em um acerto, o alvo sofre 4d4 de dano ácido imediatamente e 2d4 de dano ácido no final de seu próximo turno. Em uma falha, a flecha espirra ácido no alvo causando metade do dano inicial e nenhum dano no final do próximo turno.",
    "higher_levels": "Quando você conjura essa magia usando um espaço de magia de 3º nível ou superior, o dano (inicial e posterior) aumenta em 1d4 para cada nível de espaço acima do 2º."
  },
  "arcane-hand": {
    "name_pt": "Mão Arcana",
    "description": "Você cria uma mão Grande de força translúcida e cintilante em um espaço desocupado que você possa ver dentro do alcance. A mão dura pela duração da magia e se move ao seu comando, imitando os movimentos de sua própria mão.\n\nA mão é um objeto que tem CA 20 e pontos de vida iguais ao seu máximo de pontos de vida. Se cair a 0 pontos de vida, a magia termina. Ela tem Força 26 (+8) e Destreza 10 (+0).\n\n***Punho Cerrado.*** A mão golpeia uma criatura a 5 feet dela. Faça um ataque corpo a corpo de magia. Em um acerto, o alvo sofre 4d8 de dano de força.\n\n***Mão Forçada.*** Tenta empurrar uma criatura. Vantagem se o alvo for Médio ou menor.\n\n***Mão Agarradora.*** Tenta agarrar criatura Enorme ou menor. Pode esmagar por 2d6 + modificador de conjuração.\n\n***Mão Interposta.*** Fornece meia cobertura contra um alvo escolhido.",
    "higher_levels": "Quando você conjura essa magia usando um espaço de magia de 6º nível ou superior, o dano do punho cerrado aumenta em 2d8 e o dano da mão agarradora aumenta em 2d6 para cada nível de espaço acima do 5º."
  },
  "arcane-sword": {
    "name_pt": "Espada Arcana",
    "description": "Você cria um plano de força em forma de espada que paira dentro do alcance pela duração.\n\nQuando a espada aparece, você faz um ataque corpo a corpo de magia contra um alvo à sua escolha a 5 feet da espada. Em um acerto, o alvo sofre 3d10 de dano de força. Até a magia terminar, você pode usar uma ação bônus em cada um de seus turnos para mover a espada até 20 feet e repetir o ataque contra o mesmo alvo ou outro.",
    "higher_levels": null
  },
  "arcanists-magic-aura": {
    "name_pt": "Aura Mágica do Arcanista",
    "description": "Você coloca uma ilusão em uma criatura ou um objeto que você toca para que magias de adivinhação revelem informações falsas sobre ele. O alvo pode ser uma criatura voluntária ou um objeto que não esteja sendo carregado por outra criatura.\n\nAo conjurar a magia, escolha um ou ambos os efeitos. O efeito dura pela duração. Se você conjurar essa magia no mesmo alvo todos os dias por 30 dias, a ilusão dura até ser dissipada.\n\n***Aura Falsa.*** Você muda a forma como o alvo aparece para magias que detectam auras mágicas, como detectar magia. Você pode fazer um objeto não mágico parecer mágico, ou mudar a aura do objeto para parecer pertencer a uma escola de magia específica.\n\n***Máscara.*** Você muda a forma como o alvo aparece para magias que detectam tipos de criatura. Você escolhe um tipo de criatura e outras magias tratam o alvo como se fosse desse tipo.",
    "higher_levels": null
  },
  "armor-of-agathys": {
    "name_pt": "Armadura de Agathys",
    "description": "Uma força mágica protetora envolve você, manifestando-se como um revestimento espectral de gelo. Você ganha 5 pontos de vida temporários pela duração. Se uma criatura acertar você com um ataque corpo a corpo enquanto você tiver esses pontos de vida temporários, a criatura sofre 5 de dano de frio.",
    "higher_levels": "Quando você conjura essa magia usando um espaço de magia de 2º nível ou superior, tanto os pontos de vida temporários quanto o dano de frio aumentam em 5 para cada nível de espaço acima do 1º."
  },
  "aura-of-life": {
    "name_pt": "Aura da Vida",
    "description": "Energia vivificante irradia de você em uma aura de 30 feet de raio. Até a magia terminar, a aura se move com você. Cada criatura não hostil na aura (incluindo você) tem resistência a dano necrótico, e seu máximo de pontos de vida não pode ser reduzido. Além disso, uma criatura viva não hostil recupera 1 ponto de vida quando começa seu turno na aura com 0 pontos de vida.",
    "higher_levels": null
  },
  "aura-of-purity": {
    "name_pt": "Aura de Pureza",
    "description": "Energia purificadora irradia de você em uma aura de 30 feet de raio. Cada criatura não hostil na aura (incluindo você) não pode ficar doente, tem resistência a dano de veneno e tem vantagem em saving throws contra efeitos que causem qualquer das seguintes condições: cego, enfeitiçado, surdo, amedrontado, paralisado, envenenado e atordoado.",
    "higher_levels": null
  },
  "aura-of-vitality": {
    "name_pt": "Aura de Vitalidade",
    "description": "Energia curativa irradia de você em uma aura de 30 feet de raio. Até a magia terminar, a aura se move com você. Você pode usar uma ação bônus para fazer uma criatura na aura (incluindo você) recuperar 2d6 pontos de vida.",
    "higher_levels": null
  },
  "banishing-smite": {
    "name_pt": "Golpe Banidor",
    "description": "Na próxima vez que você acertar uma criatura com um ataque com arma antes da magia terminar, sua arma crepita com força, e o ataque causa 5d10 extras de dano de força ao alvo. Se esse ataque reduzir o alvo a 50 pontos de vida ou menos, você o bane. Se o alvo for nativo de um plano diferente, ele é banido de volta. Se for nativo do plano em que você está, é enviado para um semiplano inofensivo, ficando incapacitado até o final de seu próximo turno.",
    "higher_levels": null
  },
  "beast-sense": {
    "name_pt": "Sentido Bestial",
    "description": "Você toca uma besta voluntária. Pela duração da magia, você pode usar sua ação para ver pelos olhos da besta e ouvir o que ela ouve, continuando até usar sua ação para retornar aos seus sentidos normais. Enquanto percebe pelos sentidos da besta, você ganha os benefícios de quaisquer sentidos especiais que a criatura possua, embora fique cego e surdo em relação ao seu próprio ambiente.",
    "higher_levels": null
  },
  "bigbys-hand": {
    "name_pt": "Mão de Bigby",
    "description": "Você cria uma mão Grande de força translúcida e cintilante em um espaço desocupado que você possa ver dentro do alcance. A mão tem CA 20 e pontos de vida iguais ao seu máximo. Força 26 (+8), Destreza 10 (+0).\n\n***Punho Cerrado.*** A mão golpeia uma criatura a 5 feet. Em um acerto, 4d8 de dano de força.\n\n***Mão Forçada.*** Tenta empurrar uma criatura. Vantagem se Médio ou menor.\n\n***Mão Agarradora.*** Tenta agarrar criatura Enorme ou menor. Pode esmagar por 2d6 + modificador de conjuração.\n\n***Mão Interposta.*** Fornece meia cobertura contra um alvo escolhido.",
    "higher_levels": "O dano do punho aumenta em 2d8 e da mão agarradora em 2d6 por nível acima do 5º."
  },
  "black-tentacles": {
    "name_pt": "Tentáculos Negros",
    "description": "Tentáculos retorcidos e negros preenchem um quadrado de 20 feet no chão que você possa ver dentro do alcance. Pela duração, esses tentáculos tornam o chão na área em terreno difícil.\n\nQuando uma criatura entra na área pela primeira vez em um turno ou começa seu turno lá, ela deve ser bem-sucedida em um saving throw de Destreza ou sofrer 3d6 de dano de concussão e ficar contida pelos tentáculos até a magia terminar. Uma criatura que começa seu turno na área e já está contida sofre 3d6 de dano de concussão.\n\nUma criatura contida pode usar sua ação para fazer um teste de Força ou Destreza contra a CD de sua magia para se libertar.",
    "higher_levels": null
  },
  "blade-ward": {
    "name_pt": "Guarda-Lâmina",
    "description": "Você estende a mão e traça um sigilo de proteção no ar. Até o final de seu próximo turno, você tem resistência contra dano de concussão, perfurante e cortante causado por ataques com arma.",
    "higher_levels": null
  },
  "blinding-smite": {
    "name_pt": "Golpe Cegante",
    "description": "Na próxima vez que você acertar uma criatura com um ataque corpo a corpo com arma durante a duração da magia, sua arma irradia uma luz ofuscante, e o ataque causa 3d8 extras de dano radiante ao alvo. Além disso, o alvo deve ser bem-sucedido em um saving throw de Constituição ou ficará cego até a magia terminar. Uma criatura cega por essa magia faz outro saving throw de Constituição no final de cada turno. Em um sucesso, ela não está mais cega.",
    "higher_levels": null
  },
  "chromatic-orb": {
    "name_pt": "Orbe Cromático",
    "description": "Você arremessa uma esfera de energia de 4 polegadas de diâmetro em uma criatura que você possa ver dentro do alcance. Você escolhe ácido, frio, fogo, raio, veneno ou trovão como tipo da esfera e faz um ataque de magia à distância contra o alvo. Em um acerto, a criatura sofre 3d8 de dano do tipo escolhido.",
    "higher_levels": "Quando você conjura essa magia usando um espaço de magia de 2º nível ou superior, o dano aumenta em 1d8 para cada nível de espaço acima do 1º."
  },
  "circle-of-power": {
    "name_pt": "Círculo de Poder",
    "description": "Energia divina irradia de você, distorcendo e difundindo energia mágica dentro de 30 feet de você. Até a magia terminar, a esfera se move com você. Cada criatura amigável na área (incluindo você) tem vantagem em saving throws contra magias e outros efeitos mágicos. Além disso, quando uma criatura afetada é bem-sucedida em um saving throw contra uma magia que permite um saving throw para sofrer apenas metade do dano, ela não sofre nenhum dano.",
    "higher_levels": null
  },
  "cloud-of-daggers": {
    "name_pt": "Nuvem de Adagas",
    "description": "Você preenche o ar com adagas giratórias em um cubo de 5 feet centrado em um ponto que você escolher dentro do alcance. Uma criatura sofre 4d4 de dano cortante quando entra na área pela primeira vez em um turno ou começa seu turno lá.",
    "higher_levels": "Quando você conjura essa magia usando um espaço de magia de 3º nível ou superior, o dano aumenta em 2d4 para cada nível de espaço acima do 2º."
  },
  "compelled-duel": {
    "name_pt": "Duelo Compelido",
    "description": "Você tenta compelir uma criatura a um duelo. Uma criatura de sua escolha que você possa ver dentro do alcance deve fazer um saving throw de Sabedoria. Em uma falha, a criatura é atraída a você, compelida por sua exigência divina. Pela duração, ela tem desvantagem em jogadas de ataque contra criaturas que não sejam você, e deve fazer um saving throw de Sabedoria cada vez que tentar se mover para um espaço a mais de 30 feet de você.\n\nA magia termina se você atacar outra criatura, conjurar uma magia que mire outra criatura hostil, se uma criatura amiga causar dano ao alvo, ou se você terminar seu turno a mais de 30 feet do alvo.",
    "higher_levels": null
  },
  "conjure-barrage": {
    "name_pt": "Convocar Barragem",
    "description": "Você arremessa uma arma não mágica ou dispara uma peça de munição não mágica no ar para criar um cone de armas idênticas que disparam para a frente e depois desaparecem. Cada criatura em um cone de 60 feet deve ser bem-sucedida em um saving throw de Destreza. Uma criatura sofre 3d8 de dano em uma falha, ou metade em um sucesso. O tipo de dano é o mesmo da arma ou munição usada como componente.",
    "higher_levels": null
  },
  "conjure-volley": {
    "name_pt": "Chuva de Flechas",
    "description": "Você dispara uma peça de munição ou arremessa uma arma não mágica no ar e escolhe um ponto dentro do alcance. Centenas de duplicatas caem em uma chuva em um cilindro de 40 feet de raio e 20 feet de altura centrado naquele ponto. Cada criatura no cilindro deve fazer um saving throw de Destreza. Uma criatura sofre 8d8 de dano em uma falha, ou metade em um sucesso. O tipo de dano é o mesmo da munição ou arma usada.",
    "higher_levels": null
  },
  "cordon-of-arrows": {
    "name_pt": "Cordão de Flechas",
    "description": "Você planta quatro peças de munição não mágica no chão dentro do alcance e coloca uma magia nelas para proteger uma área. Até a magia terminar, sempre que outra criatura que não você chegar a 30 feet da munição pela primeira vez em um turno ou terminar seu turno lá, uma peça de munição voa para atingi-la. A criatura deve ser bem-sucedida em um saving throw de Destreza ou sofrer 1d6 de dano perfurante. A peça de munição é destruída. A magia termina quando nenhuma munição restar.",
    "higher_levels": "A quantidade de munição que pode ser afetada aumenta em duas para cada nível acima do 2º."
  },
  "crown-of-madness": {
    "name_pt": "Coroa da Loucura",
    "description": "Uma criatura humanoide de sua escolha que você possa ver dentro do alcance deve ser bem-sucedida em um saving throw de Sabedoria ou ficará enfeitiçada por você pela duração. Uma coroa retorcida de espinhos de ferro aparece na cabeça do alvo.\n\nA criatura enfeitiçada deve usar sua ação antes de se mover em cada turno para fazer um ataque corpo a corpo contra uma criatura que você designar mentalmente. Se você não designar nenhuma criatura, o alvo age normalmente.\n\nNos seus turnos subsequentes, você deve usar sua ação para manter controle, ou a magia termina. O alvo pode fazer um saving throw de Sabedoria no final de cada turno. Em um sucesso, a magia termina.",
    "higher_levels": null
  },
  "crusaders-mantle": {
    "name_pt": "Manto do Cruzado",
    "description": "Poder sagrado irradia de você em uma aura de 30 feet de raio, despertando ousadia em criaturas amigáveis. Até a magia terminar, a aura se move com você. Cada criatura não hostil na aura (incluindo você) causa 1d4 extras de dano radiante quando acerta com um ataque com arma.",
    "higher_levels": null
  },
  "destructive-wave": {
    "name_pt": "Onda Destruidora",
    "description": "Você golpeia o chão, criando uma explosão de energia divina que se propaga de você. Cada criatura que você escolher a 30 feet de você deve ser bem-sucedida em um saving throw de Constituição ou sofrer 5d6 de dano de trovão, 5d6 de dano radiante ou necrótico (sua escolha) e ser derrubada. Uma criatura bem-sucedida sofre metade do dano e não é derrubada.",
    "higher_levels": null
  },
  "dissonant-whispers": {
    "name_pt": "Sussurros Dissonantes",
    "description": "Você sussurra uma melodia discordante que apenas uma criatura de sua escolha dentro do alcance pode ouvir, atormentando-a com uma dor terrível. O alvo deve fazer um saving throw de Sabedoria. Em uma falha, ele sofre 3d6 de dano psíquico e deve imediatamente usar sua reação para se mover o mais longe possível de você. Em um sucesso, o alvo sofre metade do dano e não precisa se mover. Uma criatura surda é automaticamente bem-sucedida.",
    "higher_levels": "O dano aumenta em 1d6 para cada nível de espaço acima do 1º."
  },
  "drawmijs-instant-summons": {
    "name_pt": "Invocação Instantânea de Drawmij",
    "description": "Você toca um objeto pesando 10 pounds ou menos. A magia deixa uma marca invisível em sua superfície e inscreve o nome do item na safira usada como componente material.\n\nA qualquer momento depois, você pode usar sua ação para falar o nome do item e esmagar a safira. O item aparece instantaneamente em sua mão independente de distâncias físicas ou planares.\n\nSe outra criatura estiver segurando o item, esmagar a safira não transporta o item, mas você aprende quem é a criatura e onde ela está naquele momento.",
    "higher_levels": null
  },
  "elemental-weapon": {
    "name_pt": "Arma Elemental",
    "description": "Uma arma não mágica que você toca se torna uma arma mágica. Escolha um dos seguintes tipos de dano: ácido, frio, fogo, raio ou trovão. Pela duração, a arma tem um bônus de +1 nas jogadas de ataque e causa 1d4 extras de dano do tipo escolhido quando acerta.",
    "higher_levels": "No 5º ou 6º nível, o bônus é +2 e o dano extra é 2d4. No 7º nível ou superior, o bônus é +3 e o dano extra é 3d4."
  },
  "ensnaring-strike": {
    "name_pt": "Golpe Enredante",
    "description": "Na próxima vez que você acertar uma criatura com um ataque com arma, uma massa de vinhas espinhosas aparece no ponto de impacto, e o alvo deve ser bem-sucedido em um saving throw de Força ou ficará contido pelas vinhas até a magia terminar. Uma criatura Grande ou maior tem vantagem nesse saving throw.\n\nEnquanto contida, o alvo sofre 1d6 de dano perfurante no início de cada turno. Uma criatura contida pode usar sua ação para fazer um teste de Força contra a CD de sua magia para se libertar.",
    "higher_levels": "O dano aumenta em 1d6 para cada nível acima do 1º."
  },
  "evards-black-tentacles": {
    "name_pt": "Tentáculos Negros de Evard",
    "description": "Tentáculos retorcidos e negros preenchem um quadrado de 20 feet no chão dentro do alcance. Pela duração, tornam o chão na área em terreno difícil.\n\nQuando uma criatura entra na área pela primeira vez em um turno ou começa seu turno lá, deve ser bem-sucedida em um saving throw de Destreza ou sofrer 3d6 de dano de concussão e ficar contida. Uma criatura já contida sofre 3d6 de dano de concussão. Pode usar sua ação para fazer um teste de Força ou Destreza contra a CD de sua magia para se libertar.",
    "higher_levels": null
  },
  "faithful-hound": {
    "name_pt": "Cão Fiel",
    "description": "Você conjura um cão de guarda fantasma em um espaço desocupado que você possa ver dentro do alcance. O cão é invisível para todas as criaturas exceto você e não pode ser ferido. Quando uma criatura Pequena ou maior chega a 30 feet dele sem falar a senha, o cão começa a latir alto. O cão vê criaturas invisíveis e pode ver o Plano Etéreo. Ele ignora ilusões.\n\nNo início de cada um de seus turnos, o cão tenta morder uma criatura hostil a 5 feet dele. O bônus de ataque é igual ao seu modificador de habilidade de conjuração + seu bônus de proficiência. Em um acerto, 4d8 de dano perfurante.",
    "higher_levels": null
  },
  "feign-death": {
    "name_pt": "Fingir Morte",
    "description": "Você toca uma criatura voluntária e a coloca em um estado catalético indistinguível da morte.\n\nPela duração, o alvo parece morto para toda inspeção externa e para magias usadas para determinar seu status. O alvo está cego e incapacitado, e sua velocidade cai para 0. O alvo tem resistência a todos os tipos de dano exceto psíquico. Se o alvo estiver doente ou envenenado, a doença e o veneno não têm efeito até a magia terminar.",
    "higher_levels": null
  },
  "floating-disk": {
    "name_pt": "Disco Flutuante",
    "description": "Essa magia cria um plano de força circular e horizontal, de 3 feet de diâmetro e 1 polegada de espessura, que flutua 3 feet acima do chão. O disco permanece pela duração e pode suportar até 500 pounds. Se mais peso for colocado nele, a magia termina.\n\nO disco é imóvel enquanto você estiver a 20 feet dele. Se você se mover a mais de 20 feet, o disco o segue. Ele pode se mover por terreno irregular, escadas e similares, mas não pode cruzar uma mudança de elevação de 10 feet ou mais. Se você se mover a mais de 100 feet do disco, a magia termina.",
    "higher_levels": null
  },
  "freezing-sphere": {
    "name_pt": "Esfera Congelante",
    "description": "Um globo frígido de energia gelada dispara de suas pontas dos dedos para um ponto dentro do alcance, onde explode em uma esfera de 60 feet de raio. Cada criatura na área deve fazer um saving throw de Constituição. Em uma falha, 10d6 de dano de frio. Em um sucesso, metade do dano.\n\nSe o globo atingir um corpo de água, ele congela o líquido a uma profundidade de 6 polegadas em 30 feet quadrados. Criaturas nadando ficam presas no gelo.\n\nVocê pode optar por não disparar o globo, mantendo-o em sua mão. A qualquer momento, pode arremessá-lo (alcance de 40 feet). Ele se estilhaça no impacto com o mesmo efeito.",
    "higher_levels": "O dano aumenta em 1d6 para cada nível de espaço acima do 6º."
  },
  "friends": {
    "name_pt": "Amigos",
    "description": "Pela duração, você tem vantagem em todos os testes de Carisma direcionados a uma criatura de sua escolha que não seja hostil a você. Quando a magia termina, a criatura percebe que você usou magia para influenciar seu humor e se torna hostil a você. Uma criatura propensa à violência pode atacar você. Outra pode buscar retribuição de outras formas, dependendo da natureza de sua interação.",
    "higher_levels": null
  },
  "grasping-vine": {
    "name_pt": "Trepadeira Agarradora",
    "description": "Você conjura uma vinha que brota do chão em um espaço desocupado dentro do alcance. Quando você conjura essa magia, pode direcionar a vinha para chicotear uma criatura a 30 feet dela. Essa criatura deve ser bem-sucedida em um saving throw de Destreza ou será puxada 20 feet diretamente em direção à vinha.\n\nAté a magia terminar, você pode direcionar a vinha como ação bônus em cada um de seus turnos.",
    "higher_levels": null
  },
  "hail-of-thorns": {
    "name_pt": "Chuva de Espinhos",
    "description": "Na próxima vez que você acertar uma criatura com um ataque com arma à distância antes da magia terminar, essa magia cria uma chuva de espinhos que brotam de sua munição. Além do efeito normal do ataque, o alvo e cada criatura a 5 feet dele devem fazer um saving throw de Destreza. Uma criatura sofre 1d10 de dano perfurante em uma falha, ou metade em um sucesso.",
    "higher_levels": "O dano aumenta em 1d10 para cada nível acima do 1º (máximo 6d10)."
  },
  "hex": {
    "name_pt": "Maldição",
    "description": "Você coloca uma maldição em uma criatura que você possa ver dentro do alcance. Até a magia terminar, você causa 1d6 extras de dano necrótico ao alvo sempre que o acertar com um ataque. Além disso, escolha uma habilidade quando conjurar a magia. O alvo tem desvantagem em testes com a habilidade escolhida.\n\nSe o alvo cair a 0 pontos de vida antes da magia terminar, você pode usar uma ação bônus em um turno subsequente para amaldiçoar uma nova criatura.",
    "higher_levels": "No 3º ou 4º nível, concentração por até 8 horas. No 5º nível ou superior, até 24 horas."
  },
  "hideous-laughter": {
    "name_pt": "Risada Terrível",
    "description": "Uma criatura de sua escolha que você possa ver dentro do alcance percebe tudo como hilariantemente engraçado e cai em ataques de riso. O alvo deve ser bem-sucedido em um saving throw de Sabedoria ou cai no chão, ficando incapacitado e incapaz de se levantar pela duração. Uma criatura com Inteligência 4 ou menos não é afetada.\n\nNo final de cada turno, e cada vez que sofre dano, o alvo pode fazer outro saving throw de Sabedoria. Vantagem se provocado por dano. Em um sucesso, a magia termina.",
    "higher_levels": null
  },
  "hunger-of-hadar": {
    "name_pt": "Fome de Hadar",
    "description": "Você abre um portal para o vazio escuro entre as estrelas. Uma esfera de escuridão de 20 feet de raio aparece centrada em um ponto dentro do alcance pela duração. A esfera é escuridão total — nenhuma luz pode iluminá-la, e criaturas totalmente dentro ficam cegas.\n\nO vazio cria terreno difícil. Qualquer criatura que comece seu turno na área sofre 2d6 de dano de frio. Qualquer criatura que termine seu turno na área deve fazer um saving throw de Destreza ou sofrer 2d6 de dano ácido.",
    "higher_levels": null
  },
  "instant-summons": {
    "name_pt": "Invocação Instantânea",
    "description": "Você toca um objeto pesando 10 pounds ou menos. A magia deixa uma marca invisível em sua superfície e inscreve o nome do item na safira usada como componente material.\n\nA qualquer momento depois, você pode usar sua ação para falar o nome do item e esmagar a safira. O item aparece instantaneamente em sua mão independente de distâncias físicas ou planares.\n\nSe outra criatura estiver segurando o item, esmagar a safira não transporta o item, mas você aprende quem é a criatura e onde ela está. Dissipar magia aplicado na safira encerra o efeito.",
    "higher_levels": null
  },
  "irresistible-dance": {
    "name_pt": "Dança Irresistível",
    "description": "Escolha uma criatura que você possa ver dentro do alcance. O alvo começa uma dança cômica no lugar: arrastando os pés, sapateando e cabrioleando pela duração. Criaturas que não podem ser enfeitiçadas são imunes.\n\nA criatura dançando deve usar todo seu movimento para dançar sem sair de seu espaço e tem desvantagem em saving throws de Destreza e jogadas de ataque. Outras criaturas têm vantagem em jogadas de ataque contra ela. Como uma ação, a criatura faz um saving throw de Sabedoria para retomar o controle. Em um sucesso, a magia termina.",
    "higher_levels": null
  },
  "leomunds-secret-chest": {
    "name_pt": "Baú Secreto de Leomund",
    "description": "Você esconde um baú, e todo seu conteúdo, no Plano Etéreo. O baú pode conter até 12 cubic feet de material não vivo.\n\nEnquanto o baú permanece no Plano Etéreo, você pode usar uma ação e tocar a réplica para trazê-lo de volta. Você pode enviá-lo de volta usando uma ação e tocando ambos.\n\nApós 60 dias, há uma chance cumulativa de 5% por dia de que o efeito da magia termine. Se terminar e o baú estiver no Plano Etéreo, ele é irrecuperavelmente perdido.",
    "higher_levels": null
  },
  "leomunds-tiny-hut": {
    "name_pt": "Cabana Diminuta de Leomund",
    "description": "Uma cúpula imóvel de força de 10 feet de raio surge ao redor e acima de você pela duração. A magia termina se você sair de sua área.\n\nNove criaturas de tamanho Médio ou menor podem caber dentro. Criaturas e objetos dentro quando você conjura podem se mover livremente. Todas as outras são impedidas de passar. Magias não podem se estender pela cúpula ou serem conjuradas através dela. A atmosfera dentro é confortável e seca. A cúpula é opaca do lado de fora mas transparente do lado de dentro.",
    "higher_levels": null
  },
  "lightning-arrow": {
    "name_pt": "Flecha Relâmpago",
    "description": "Na próxima vez que você fizer um ataque com arma à distância durante a duração, a munição se transforma em um raio. Faça a jogada de ataque normalmente. O alvo sofre 4d8 de dano de raio em um acerto, ou metade em uma falha, em vez do dano normal. Além disso, cada criatura a 10 feet do alvo deve fazer um saving throw de Destreza, sofrendo 2d8 de dano de raio em uma falha, ou metade em um sucesso.",
    "higher_levels": "O dano de ambos os efeitos aumenta em 1d8 para cada nível acima do 3º."
  },
  "magnificent-mansion": {
    "name_pt": "Mansão Magnífica",
    "description": "Você conjura uma moradia extradimensional no alcance pela duração. A entrada brilha levemente e tem 5 feet de largura e 10 feet de altura.\n\nAlém do portal há um magnífico vestíbulo com numerosos aposentos. A atmosfera é limpa, fresca e quente. Você pode criar qualquer planta baixa, mas o espaço não pode exceder 50 cubos de 10 feet de lado. O lugar é mobiliado como você escolher. Contém comida para até 100 pessoas. Uma equipe de 100 servos quase transparentes atende todos que entram — eles são completamente obedientes mas não podem atacar. Móveis dissipam em fumaça se removidos da mansão.",
    "higher_levels": null
  },
  "melfs-acid-arrow": {
    "name_pt": "Flecha Ácida de Melf",
    "description": "Uma flecha verde cintilante dispara em direção a um alvo dentro do alcance e explode em um jato de ácido. Faça um ataque de magia à distância. Em um acerto, o alvo sofre 4d4 de dano ácido imediatamente e 2d4 de dano ácido no final de seu próximo turno. Em uma falha, metade do dano inicial e nenhum dano posterior.",
    "higher_levels": "O dano (inicial e posterior) aumenta em 1d4 para cada nível acima do 2º."
  },
  "mordenkainens-faithful-hound": {
    "name_pt": "Cão Fiel de Mordenkainen",
    "description": "Você conjura um cão de guarda fantasma em um espaço desocupado dentro do alcance. O cão é invisível para todos exceto você e não pode ser ferido. Quando uma criatura Pequena ou maior chega a 30 feet sem falar a senha, o cão late alto. Ele vê criaturas invisíveis e o Plano Etéreo, e ignora ilusões.\n\nNo início de cada turno, o cão tenta morder uma criatura hostil a 5 feet. Bônus de ataque igual ao seu modificador de conjuração + proficiência. Em um acerto, 4d8 de dano perfurante.",
    "higher_levels": null
  },
  "mordenkainens-magnificent-mansion": {
    "name_pt": "Mansão Magnífica de Mordenkainen",
    "description": "Você conjura uma moradia extradimensional no alcance pela duração. A entrada tem 5 feet de largura e 10 feet de altura. Além do portal há um vestíbulo magnífico com numerosos aposentos. O espaço pode ter até 50 cubos de 10 feet. É mobiliado como você escolher, com comida para 100 pessoas e 100 servos obedientes que não podem atacar.",
    "higher_levels": null
  },
  "mordenkainens-private-sanctum": {
    "name_pt": "Santuário Privado de Mordenkainen",
    "description": "Você torna uma área dentro do alcance magicamente segura. A área é um cubo de 5 a 100 feet de lado. Você escolhe as propriedades de segurança: som bloqueado, visão bloqueada, sem sensores de adivinhação, sem teleporte, sem viagem planar. Conjurar no mesmo local por um ano torna permanente.",
    "higher_levels": "O tamanho do cubo aumenta em 100 feet por nível acima do 4º."
  },
  "mordenkainens-sword": {
    "name_pt": "Espada de Mordenkainen",
    "description": "Você cria um plano de força em forma de espada que paira dentro do alcance pela duração. Quando a espada aparece, faça um ataque corpo a corpo de magia contra um alvo a 5 feet. Em um acerto, 3d10 de dano de força. Até a magia terminar, use ação bônus para mover a espada até 20 feet e repetir o ataque.",
    "higher_levels": null
  },
  "nystuls-magic-aura": {
    "name_pt": "Aura Mágica de Nystul",
    "description": "Você coloca uma ilusão em uma criatura ou objeto que você toca para que magias de adivinhação revelem informações falsas. Escolha um ou ambos os efeitos pela duração. Conjurar por 30 dias consecutivos torna permanente.\n\n***Aura Falsa.*** Muda como o alvo aparece para magias que detectam auras mágicas.\n\n***Máscara.*** Muda como o alvo aparece para magias que detectam tipos de criatura.",
    "higher_levels": null
  },
  "otilukes-freezing-sphere": {
    "name_pt": "Esfera Congelante de Otiluke",
    "description": "Um globo frígido de energia gelada explode em uma esfera de 60 feet de raio. Cada criatura na área deve fazer um saving throw de Constituição. Em uma falha, 10d6 de dano de frio. Em um sucesso, metade. Pode congelar água e pode ser mantido na mão para arremesso posterior.",
    "higher_levels": "O dano aumenta em 1d6 para cada nível acima do 6º."
  },
  "otilukes-resilient-sphere": {
    "name_pt": "Esfera Resiliente de Otiluke",
    "description": "Uma esfera de força cintilante envolve uma criatura ou objeto de tamanho Grande ou menor. Uma criatura involuntária deve fazer um saving throw de Destreza. Nada pode passar pela barreira, em nenhuma direção. A esfera é imune a todo dano. Uma criatura dentro pode empurrar as paredes e rolar a esfera a até metade de sua velocidade. Desintegrar destrói a esfera sem causar dano ao interior.",
    "higher_levels": null
  },
  "ottos-irresistible-dance": {
    "name_pt": "Dança Irresistível de Otto",
    "description": "Escolha uma criatura que você possa ver dentro do alcance. O alvo começa uma dança cômica no lugar pela duração. Criaturas que não podem ser enfeitiçadas são imunes. A criatura dançando deve usar todo seu movimento para dançar, tem desvantagem em saving throws de Destreza e jogadas de ataque. Outras criaturas têm vantagem em ataques contra ela. Como ação, pode fazer saving throw de Sabedoria para encerrar.",
    "higher_levels": null
  },
  "phantasmal-force": {
    "name_pt": "Força Fantasmal",
    "description": "Você cria uma ilusão fantasmagórica que se enraíza na mente de uma criatura dentro do alcance. O alvo deve fazer um saving throw de Inteligência. Em uma falha, você cria um fenômeno visível fantasmal de até um cubo de 10 feet que é perceptível apenas pelo alvo pela duração. A ilusão inclui som, temperatura e outros estímulos.\n\nO alvo pode usar sua ação para examinar a ilusão com um teste de Investigação contra a CD de sua magia. Em um sucesso, percebe que é ilusão e a magia termina. Enquanto afetado, o alvo trata a ilusão como real e racionaliza quaisquer resultados ilógicos.",
    "higher_levels": null
  },
  "power-word-heal": {
    "name_pt": "Palavra de Poder: Cura",
    "description": "Uma onda de energia curativa lava sobre a criatura que você toca. O alvo recupera todos os seus pontos de vida. Se a criatura estiver enfeitiçada, amedrontada, paralisada ou atordoada, a condição termina. Se estiver caída, pode usar sua reação para se levantar. Essa magia não tem efeito sobre mortos-vivos ou constructos.",
    "higher_levels": null
  },
  "private-sanctum": {
    "name_pt": "Santuário Privado",
    "description": "Você torna uma área dentro do alcance magicamente segura. A área é um cubo que pode ter de 5 a 100 feet de lado. Ao conjurar, você decide as propriedades de segurança:\n\n- Som não pode passar pela barreira.\n- A barreira aparece escura e nebulosa, impedindo visão.\n- Sensores de adivinhação não podem aparecer ou passar pela barreira.\n- Criaturas na área não podem ser alvo de adivinhação.\n- Nada pode se teletransportar para dentro ou fora da área.\n- Viagem planar é bloqueada.\n\nConjurar no mesmo local por um ano torna o efeito permanente.",
    "higher_levels": "O tamanho do cubo aumenta em 100 feet para cada nível acima do 4º."
  },
  "rarys-telepathic-bond": {
    "name_pt": "Vínculo Telepático de Rary",
    "description": "Você forja um vínculo telepático entre até oito criaturas voluntárias dentro do alcance. Criaturas com Inteligência 2 ou menos não são afetadas. Até a magia terminar, os alvos podem se comunicar telepaticamente pelo vínculo, tenham ou não um idioma em comum. A comunicação é possível a qualquer distância, mas não pode se estender a outros planos.",
    "higher_levels": null
  },
  "ray-of-sickness": {
    "name_pt": "Raio de Doença",
    "description": "Um raio de energia esverdeada e doentia se dirige a uma criatura dentro do alcance. Faça um ataque de magia à distância. Em um acerto, o alvo sofre 2d8 de dano de veneno e deve fazer um saving throw de Constituição. Em uma falha, também fica envenenado até o final de seu próximo turno.",
    "higher_levels": "O dano aumenta em 1d8 para cada nível de espaço acima do 1º."
  },
  "resilient-sphere": {
    "name_pt": "Esfera Resiliente",
    "description": "Uma esfera de força cintilante envolve uma criatura ou objeto de tamanho Grande ou menor. Uma criatura involuntária deve fazer um saving throw de Destreza. Em uma falha, fica envolvida pela duração.\n\nNada pode passar pela barreira. A esfera é imune a todo dano, e uma criatura dentro não pode ser danificada por ataques de fora, nem danificar nada fora dela. A esfera é leve e pode ser empurrada ou rolada. Desintegrar destrói a esfera sem causar dano ao interior.",
    "higher_levels": null
  },
  "searing-smite": {
    "name_pt": "Golpe Cauterizante",
    "description": "Na próxima vez que você acertar uma criatura com um ataque corpo a corpo com arma, sua arma flameja com calor branco, e o ataque causa 1d6 extras de dano de fogo ao alvo e o incendeia. No início de cada turno até a magia terminar, o alvo deve fazer um saving throw de Constituição. Em uma falha, sofre 1d6 de dano de fogo. Em um sucesso, a magia termina.",
    "higher_levels": "O dano extra inicial aumenta em 1d6 para cada nível acima do 1º."
  },
  "secret-chest": {
    "name_pt": "Baú Secreto",
    "description": "Você esconde um baú no Plano Etéreo. O baú pode conter até 12 cubic feet de material não vivo. Enquanto no Plano Etéreo, você pode usar uma ação e tocar a réplica para trazê-lo de volta. Após 60 dias, há uma chance cumulativa de 5% por dia de que o efeito termine. Se terminar e o baú estiver no Plano Etéreo, ele é irrecuperavelmente perdido.",
    "higher_levels": null
  },
  "staggering-smite": {
    "name_pt": "Golpe Cambaleante",
    "description": "Na próxima vez que você acertar uma criatura com um ataque corpo a corpo com arma, sua arma perfura tanto o corpo quanto a mente, e o ataque causa 4d6 extras de dano psíquico ao alvo. O alvo deve fazer um saving throw de Sabedoria. Em uma falha, tem desvantagem em jogadas de ataque e testes de habilidade, e não pode tomar reações, até o final de seu próximo turno.",
    "higher_levels": null
  },
  "swift-quiver": {
    "name_pt": "Carcaj Rápido",
    "description": "Você transmuta sua aljava para que ela produza um suprimento infinito de munição não mágica. Em cada um de seus turnos até a magia terminar, você pode usar uma ação bônus para fazer dois ataques com uma arma que usa munição da aljava. Cada vez que ataca, a aljava repõe magicamente a munição usada.",
    "higher_levels": null
  },
  "tashas-hideous-laughter": {
    "name_pt": "Risada Terrível de Tasha",
    "description": "Uma criatura de sua escolha dentro do alcance percebe tudo como hilariantemente engraçado e cai em ataques de riso. O alvo deve ser bem-sucedido em um saving throw de Sabedoria ou cai no chão, ficando incapacitado e incapaz de se levantar pela duração. Inteligência 4 ou menos é imune.\n\nNo final de cada turno, e cada vez que sofre dano, o alvo pode fazer outro saving throw (vantagem se provocado por dano). Em um sucesso, a magia termina.",
    "higher_levels": null
  },
  "telepathic-bond": {
    "name_pt": "Vínculo Telepático",
    "description": "Você forja um vínculo telepático entre até oito criaturas voluntárias dentro do alcance. Criaturas com Inteligência 2 ou menos não são afetadas. Até a magia terminar, os alvos podem se comunicar telepaticamente, tenham ou não um idioma em comum. A comunicação é possível a qualquer distância, mas não pode se estender a outros planos de existência.",
    "higher_levels": null
  },
  "telepathy": {
    "name_pt": "Telepatia",
    "description": "Você cria um vínculo telepático entre você e uma criatura voluntária com a qual esteja familiarizado. A criatura pode estar em qualquer lugar no mesmo plano. A magia termina se não estiverem mais no mesmo plano.\n\nAté a magia terminar, vocês podem trocar instantaneamente palavras, imagens, sons e outras mensagens sensoriais. A magia permite que uma criatura com Inteligência de pelo menos 1 entenda o significado de suas palavras.",
    "higher_levels": null
  },
  "tensers-floating-disk": {
    "name_pt": "Disco Flutuante de Tenser",
    "description": "Essa magia cria um plano de força circular e horizontal, de 3 feet de diâmetro, que flutua 3 feet acima do chão. O disco permanece pela duração e pode suportar até 500 pounds. O disco é imóvel enquanto você estiver a 20 feet dele. Se mover a mais de 20 feet, o disco o segue. Se mover a mais de 100 feet, a magia termina.",
    "higher_levels": null
  },
  "thorn-whip": {
    "name_pt": "Chicote de Espinhos",
    "description": "Você cria um longo chicote semelhante a uma vinha coberto de espinhos que chicoteia, ao seu comando, em direção a uma criatura no alcance. Faça um ataque de magia corpo a corpo contra o alvo. Se acertar, a criatura sofre 1d6 de dano perfurante e, se for de tamanho Grande ou menor, é puxada até 10 feet em sua direção.\n\nO dano dessa magia aumenta em 1d6 quando você alcança o 5º nível (2d6), o 11º nível (3d6) e o 17º nível (4d6).",
    "higher_levels": null
  },
  "thunderous-smite": {
    "name_pt": "Golpe Trovejante",
    "description": "Na próxima vez que você acertar um ataque corpo a corpo com arma, sua arma ressoa com trovão, e o ataque causa 2d6 extras de dano de trovão. Além disso, se o alvo for uma criatura, deve ser bem-sucedido em um saving throw de Força ou será empurrado 10 feet para longe e ficará caído.",
    "higher_levels": null
  },
  "tiny-hut": {
    "name_pt": "Cabana Diminuta",
    "description": "Uma cúpula imóvel de força de 10 feet de raio surge ao redor e acima de você pela duração. A magia termina se você sair da área. Nove criaturas de tamanho Médio ou menor podem caber dentro. Criaturas e objetos dentro podem se mover livremente. Todas as outras são impedidas de passar. Magias não podem se estender pela cúpula. A atmosfera dentro é confortável e seca. A cúpula é opaca do lado de fora, transparente do lado de dentro.",
    "higher_levels": null
  },
  "tsunami": {
    "name_pt": "Tsunami",
    "description": "Uma parede de água surge à existência em um ponto que você escolher dentro do alcance. Você pode fazer a parede ter até 300 feet de comprimento, 300 feet de altura e 50 feet de espessura. A parede dura pela duração.\n\nQuando a parede aparece, cada criatura dentro de sua área deve fazer um saving throw de Força. Em uma falha, a criatura sofre 6d10 de dano de concussão, ou metade em um sucesso.\n\nNo início de cada turno após a parede aparecer, ela se move 50 feet para longe de você. Qualquer criatura enorme ou menor dentro da parede ou cujo espaço a parede entre deve ser bem-sucedida em um saving throw de Força ou sofrer 5d10 de dano de concussão. A parede também pode causar dano a objetos e estruturas.",
    "higher_levels": null
  },
  "witch-bolt": {
    "name_pt": "Raio da Bruxa",
    "description": "Um raio de energia azul crepitante se lança em direção a uma criatura dentro do alcance, formando um arco de eletricidade sustentado. Faça um ataque de magia à distância. Em um acerto, o alvo sofre 1d12 de dano de raio. Em cada turno seguinte pela duração, você pode usar sua ação para causar automaticamente 1d12 de dano de raio. A magia termina se você usar sua ação para outra coisa, se o alvo ficar fora do alcance ou tiver cobertura total.",
    "higher_levels": "O dano inicial aumenta em 1d12 para cada nível de espaço acima do 1º."
  },
  "wrathful-smite": {
    "name_pt": "Golpe Colérico",
    "description": "Na próxima vez que você acertar um ataque corpo a corpo com arma, seu ataque causa 1d6 extra de dano psíquico. Além disso, se o alvo for uma criatura, ele deve fazer um saving throw de Sabedoria ou ficará amedrontado por você até a magia terminar. Como uma ação, a criatura pode fazer um teste de Sabedoria contra a CD de sua magia para encerrar a magia.",
    "higher_levels": null
  }
};

// Merge
const merged = { ...descs, ...newDescs };
const sorted = Object.fromEntries(Object.entries(merged).sort(([a],[b]) => a.localeCompare(b)));
fs.writeFileSync(descsPath, JSON.stringify(sorted, null, 2) + '\n');
console.log('Before:', Object.keys(descs).length);
console.log('After:', Object.keys(sorted).length);
console.log('Added:', Object.keys(sorted).length - Object.keys(descs).length);
