import Link from "next/link";
import Image from "next/image";
import {
  BuildVariantProvider,
  BuildVariantToggle,
  Variant,
  StrategyBox,
} from "../BuildVariant";
import { EbookCTA } from "../EbookCTA";
import {
  Img,
  ExtLink,
  IntLink,
  ProdLink,
  H2,
  H3,
  P,
  Li,
  Ul,
  Tip,
  CTA,
  FloatingArt,
  SectionDivider,
  ArtCallout,
} from "./_shared";

export default function BlogPost4() {
  return (
    <>
      <P>
        O Monk acerta um Stunning Strike. O Goblin falha no save. E aí...
        o que Stunned faz mesmo? Desvantagem em ataques? Não pode se mover?
        Ataques contra ele são automáticos? Se você já passou por esse momento
        de "peraí, deixa eu conferir", este guia é sua referência rápida. Todas
        as 15 condições do D&D 5e, explicadas em português, com exemplos
        práticos de mesa.
      </P>

      <H2>Condições em 30 segundos</H2>
      <P>
        Condições são efeitos que mudam o que uma criatura pode ou não fazer.
        Vêm de magias, habilidades de classe, ataques de monstro ou do
        próprio ambiente. Duram até serem removidas (tipo se levantar de{" "}
        <em>prone</em>) ou até o efeito expirar. Referência oficial em inglês
        no{" "}
        <ExtLink href="https://5e.d20srd.org/srd/conditionSummary.htm">SRD</ExtLink>{" "}
        e no guia do{" "}
        <ExtLink href="https://arcaneeye.com/mechanic-overview/5e-conditions/">Arcane Eye</ExtLink>.
      </P>

      <Img src="/art/blog/combat-conditions.png" alt="Painel de condições do Pocket DM — todas as 15 condições D&D 5e disponíveis com um clique" />

      <H2>As 15 condições — uma por uma</H2>

      {[
        {
          name: "Blinded (Cego)",
          rules: "Falha automaticamente em testes que exigem visão. Ataques contra a criatura têm vantagem. Ataques da criatura têm desvantagem.",
          example: "Magia Blindness/Deafness, ataque de tinta de um Kraken.",
        },
        {
          name: "Charmed (Enfeitiçado)",
          rules: "Não pode atacar quem a enfeitiçou. Quem enfeitiçou tem vantagem em testes sociais contra a criatura.",
          example: "Charm Person, Vampire's Charm.",
        },
        {
          name: "Deafened (Surdo)",
          rules: "Falha automaticamente em testes que exigem audição.",
          example: "Raramente aplicado sozinho; geralmente vem com Blindness/Deafness.",
        },
        {
          name: "Exhaustion (Exaustão)",
          rules: "6 níveis cumulativos: 1=desvantagem em testes de habilidade, 2=velocidade reduzida pela metade, 3=desvantagem em ataques e salvaguardas, 4=HP máximo pela metade, 5=velocidade 0, 6=morte.",
          example: "Fome, sede, frio extremo, certas magias como Sickening Radiance.",
        },
        {
          name: "Frightened (Amedrontado)",
          rules: "Desvantagem em testes de habilidade e ataques enquanto a fonte do medo estiver visível. Não pode se mover voluntariamente para perto da fonte.",
          example: "Cause Fear, Dragon's Frightful Presence, Wraith.",
        },
        {
          name: "Grappled (Agarrado)",
          rules: "Velocidade cai para 0. Termina se o agarrador ficar incapacitado ou se a criatura sair do alcance.",
          example: "Ação de agarrar, tentáculos de um Roper.",
        },
        {
          name: "Incapacitated (Incapacitado)",
          rules: "Não pode realizar ações ou reações.",
          example: "Base para outras condições como Stunned e Unconscious.",
        },
        {
          name: "Invisible (Invisível)",
          rules: "Impossível de ser visto sem magia. Ataques da criatura têm vantagem. Ataques contra ela têm desvantagem.",
          example: "Invisibility, Greater Invisibility, Potion of Invisibility.",
        },
        {
          name: "Paralyzed (Paralisado)",
          rules: "Incapacitado, não pode se mover ou falar. Falha automaticamente em salvaguardas de STR e DEX. Ataques contra têm vantagem. Ataques corpo a corpo que acertam são críticos automáticos.",
          example: "Hold Person, Hold Monster, Ghoul's Claws.",
        },
        {
          name: "Petrified (Petrificado)",
          rules: "Transformado em pedra. Peso multiplicado por 10. Não envelhece. Incapacitado, não pode se mover ou falar. Resistência a todo dano. Imune a veneno e doença.",
          example: "Flesh to Stone, Medusa's Petrifying Gaze, Basilisk.",
        },
        {
          name: "Poisoned (Envenenado)",
          rules: "Desvantagem em jogadas de ataque e testes de habilidade.",
          example: "Veneno de serpente, Ray of Sickness, Stinking Cloud.",
        },
        {
          name: "Prone (Derrubado)",
          rules: "Só pode se arrastar (1m custa 2m). Desvantagem em ataques. Ataques corpo a corpo contra têm vantagem; à distância têm desvantagem.",
          example: "Shield Master empurrão, Shove action, Grease.",
        },
        {
          name: "Restrained (Impedido)",
          rules: "Velocidade 0. Ataques contra têm vantagem. Ataques da criatura têm desvantagem. Desvantagem em salvaguardas de DEX.",
          example: "Entangle, Web, Grappler feat.",
        },
        {
          name: "Stunned (Atordoado)",
          rules: "Incapacitado, não pode se mover, fala limitada. Falha automaticamente em salvaguardas de STR e DEX. Ataques contra têm vantagem.",
          example: "Stunning Strike (Monk), Power Word Stun, Mind Flayer.",
        },
        {
          name: "Unconscious (Inconsciente)",
          rules: "Incapacitado, não pode se mover ou falar, não percebe o entorno. Cai e fica prone. Falha automaticamente em STR e DEX. Ataques contra têm vantagem. Ataques corpo a corpo que acertam são críticos automáticos.",
          example: "Cair a 0 HP, Sleep, certas armadilhas.",
        },
      ].map((c) => (
        <div
          key={c.name}
          className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-4 mb-3"
        >
          <h3 className="font-display text-base text-gold/90 mb-2">{c.name}</h3>
          <p className="text-foreground/75 text-sm leading-relaxed mb-1">
            <strong>Regras:</strong> {c.rules}
          </p>
          <p className="text-foreground/60 text-sm">
            <strong>Exemplo:</strong> {c.example}
          </p>
        </div>
      ))}

      <Tip>
        No <ProdLink href="/try">Pocket DM</ProdLink>, todas as 15 condições
        vêm com as regras integradas. Ao marcar uma condição em um combatente,
        a descrição completa aparece para consulta rápida, sem precisar abrir
        o livro. Veja também nossa{" "}
        <ProdLink href="/condicoes">referência rápida de condições</ProdLink>.
      </Tip>

      <SectionDivider src="/art/blog/treated-nobg/dnd-character-human-blood-hunter-with-red-eyes-and-long-hair.png" alt="Blood Hunter de olhos vermelhos" />

      <H2>O efeito cascata: condições que se empilham</H2>
      <P>
        Detalhe que pega muita gente: <strong>Paralyzed</strong>,{" "}
        <strong>Stunned</strong> e <strong>Unconscious</strong> já incluem{" "}
        <strong>Incapacitated</strong> automaticamente. Se o monstro tá
        paralisado, ele também tá incapacitado, você não precisa marcar
        os dois. Saber disso evita aquela discussão de 5 minutos no meio
        do combate.
      </P>

      <CTA category="guia" />
    </>
  );
}
