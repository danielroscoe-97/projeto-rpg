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

export default function BlogPost13() {
  return (
    <BuildVariantProvider defaultVariant="rolled">
      {/* Quote de abertura */}
      <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.06] rounded-full blur-[60px]" />
        <p className="relative text-lg italic text-gold/90 font-display">
          {"\u201C"}Eu serei a fundação.{"\u201D"}
        </p>
        <p className="relative text-xs text-muted-foreground mt-2">— Capa Barsavi</p>
      </div>

      <P>
        Capa Barsavi não era o que causava mais dano, não era o que recebia os
        golpes, e não era o que roubava a cena. Ele era o motivo pelo qual todos
        os outros podiam fazer isso. Um <strong>Order Cleric 1 / Divine Soul Sorcerer</strong>{" "}
        construído para ser a engrenagem invisível que faz a máquina funcionar,
        e uma das builds de suporte mais eficientes do D&amp;D 5e.
      </P>

      <P>
        Abaixo apresentamos duas versões da build: a <strong>original jogada em
        campanha</strong> com dados rolados e Half-Elf, e uma{" "}
        <strong>reconstrução otimizada com Point Buy</strong> usando Shadar-kai.
        Escolha a variante e o artigo inteiro se adapta.
      </P>

      {/* ─── TOGGLE ─── */}
      <BuildVariantToggle
        variants={[
          { id: "rolled", label: "Half-Elf (Drow)", sub: "Dados Rolados" },
          { id: "pointbuy", label: "Shadar-kai", sub: "Point Buy" },
        ]}
      />

      {/* ═══════════════════════════════════════════════════════════
         FICHA EM 30 SEGUNDOS
         ═══════════════════════════════════════════════════════════ */}
      <H2>A ficha em 30 segundos</H2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-foreground/80 border-collapse">
          <tbody>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Raça</td>
              <td className="py-2">
                <Variant id="rolled">Half-Elf (Drow)</Variant>
                <Variant id="pointbuy">Shadar-kai (Tasha{"'"}s / MotM)</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Classe</td>
              <td className="py-2">Cleric 1 (Order Domain) / Sorcerer 9 (Divine Soul)</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Nível</td>
              <td className="py-2">10</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Foco</td>
              <td className="py-2">Suporte / Controle / Multiplicador de ação</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Atributos</td>
              <td className="py-2">
                <Variant id="rolled">4d6 drop lowest (campanha)</Variant>
                <Variant id="pointbuy">Point Buy (15 / 15 / 15 / 8 / 8 / 8)</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Feats</td>
              <td className="py-2">
                <Variant id="rolled">Resilient (CON), Fey Touched</Variant>
                <Variant id="pointbuy">Resilient (CON), +2 CHA ou Lucky</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Metamagic</td>
              <td className="py-2">Quickened Spell, Extended Spell</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Dificuldade</td>
              <td className="py-2">Médio — exige conhecimento de sinergia e timing</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════
         RAÇA — VARIANTE
         ═══════════════════════════════════════════════════════════ */}
      <H2>Raça</H2>

      <Variant id="rolled">
        <H3>Half-Elf (Drow)</H3>
        <P>
          Half-Elf é uma das raças mais flexíveis do 5e. O +2 CHA é exatamente o
          que um Sorcerer precisa, e os dois +1 extras permitem arredondar CON e
          DEX, atributos essenciais para sobrevivência e AC. A variante Drow
          adiciona Darkvision 60ft e Fey Ancestry (vantagem contra charm e
          imunidade a sono mágico), traços defensivos valiosos para quem precisa
          manter concentração.
        </P>
        <StrategyBox title="Por que Drow e não High Elf?">
          <p>
            A variante Drow (SCAG) troca as duas proficiências de Skill
            Versatility por Drow Magic: o cantrip <em>dancing lights</em>{" "}
            gratuito, e no nível 3 <em>faerie fire</em> 1x/dia (sem gastar
            slot). Faerie fire é brutal: vantagem em ataques contra todos os
            alvos afetados, sinergia perfeita com Voice of Authority. High Elf
            daria apenas um cantrip de Wizard — esta build já tem cantrips
            suficientes.
          </p>
        </StrategyBox>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Traço</th>
                <th className="py-2 text-left">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">ASI</td>
                <td className="py-2">+2 CHA, +1 CON, +1 DEX</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Darkvision</td>
                <td className="py-2">60ft</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Fey Ancestry</td>
                <td className="py-2">Vantagem em saves contra charm, imune a sono mágico</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Drow Magic</td>
                <td className="py-2">Dancing lights (cantrip), faerie fire 1x/dia (nível 3)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Variant>

      <Variant id="pointbuy">
        <H3>Shadar-kai</H3>
        <P>
          Se sua mesa usa Point Buy e permite ASIs flexíveis (Tasha{"'"}s Cauldron
          / MotM), <strong>Shadar-kai</strong> é a raça ideal para esta build.
          Com o array 15/15/15/8/8/8, você coloca os 15s em CHA, CON e WIS, e
          usa os bônus raciais (+2 CON, +1 CHA) para chegar a{" "}
          <strong>CON 17, CHA 16, WIS 15</strong> no nível 1.
        </P>
        <P>
          A grande vantagem: <strong>Blessing of the Raven Queen</strong>.
          Uma vez por long rest, como bônus action, você se teleporta 30ft e ganha
          resistência a <em>todo dano</em> até o início do seu próximo turno.
          Para um caster frontline que precisa se manter vivo concentrando Bless
          ou Spirit Guardians, isso é brutalmente superior a Misty Step, que
          é apenas mobilidade sem proteção.
        </P>
        <StrategyBox title="Blessing of the Raven Queen vs Misty Step">
          <p>
            Misty Step (da Fey Touched na variante Half-Elf) é bônus action +
            30ft de teleporte, disponível 1x/dia grátis + spell slots adicionais.
            Blessing of the Raven Queen é bônus action + 30ft de teleporte +
            resistência a <em>todo dano</em> por 1 turno, mas apenas 1x/long
            rest. Mesmo alcance, mas a Blessing adiciona uma camada de
            sobrevivência que Misty Step não tem. O trade-off: Misty Step pode
            ser usado múltiplas vezes com spell slots, a Blessing é 1x/dia.
          </p>
        </StrategyBox>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Traço</th>
                <th className="py-2 text-left">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">ASI (Tasha{"'"}s)</td>
                <td className="py-2">+2 CON, +1 CHA</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Darkvision</td>
                <td className="py-2">60ft</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Fey Ancestry</td>
                <td className="py-2">Vantagem em saves contra charm, imune a sono mágico</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Trance</td>
                <td className="py-2">4h de descanso em vez de 8h de sono</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Blessing of the Raven Queen</td>
                <td className="py-2">1x/long rest — teleporte 30ft + resistência a todo dano por 1 turno</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          <strong>Trade-off honesto:</strong> DEX 8 significa &minus;1 em
          iniciativa e DEX saves. Com heavy armor do Cleric, AC não é afetada,
          mas você vai agir depois de quase todo mundo. Gift of Alacrity (se
          disponível como magia via Sorcerer) ajuda a compensar, mas essa
          versão aceita ser mais lenta em troca de ser mais resistente.
        </P>
      </Variant>

      {/* ═══════════════════════════════════════════════════════════
         ATRIBUTOS — VARIANTE
         ═══════════════════════════════════════════════════════════ */}
      <H2>Atributos</H2>

      <Variant id="rolled">
        <Tip>
          Estes atributos foram rolados com 4d6 drop lowest durante a
          campanha. Cada mesa rola diferente — o importante são as{" "}
          <strong>prioridades</strong>: CHA &gt; CON &gt; WIS &gt; DEX.
        </Tip>
        <H3>Atributos finais (nível 10)</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Atributo</th>
                <th className="py-2 text-center">Base</th>
                <th className="py-2 text-center">Racial</th>
                <th className="py-2 text-center">Nível 10</th>
                <th className="py-2 text-center">Mod</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">STR</td>
                <td className="py-2 text-center">10</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">10</td>
                <td className="py-2 text-center text-muted-foreground">+0</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">DEX</td>
                <td className="py-2 text-center">13</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">14</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">CON</td>
                <td className="py-2 text-center">17</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">19*</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">INT</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">WIS</td>
                <td className="py-2 text-center">12</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">14&dagger;</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">CHA</td>
                <td className="py-2 text-center">16</td>
                <td className="py-2 text-center text-gold/70">+2</td>
                <td className="py-2 text-center">18&Dagger;</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground/60 mt-2">
            * Resilient CON (+1) &nbsp;|&nbsp; &dagger; Fey Touched (+1 WIS) &nbsp;|&nbsp; &Dagger; Tome of Leadership (+2 CHA)
          </p>
        </div>

        <H3>Progressão por nível</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs sm:text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Nível</th>
                <th className="py-2 text-left">Evento</th>
                <th className="py-2 text-center">STR</th>
                <th className="py-2 text-center">DEX</th>
                <th className="py-2 text-center">CON</th>
                <th className="py-2 text-center">INT</th>
                <th className="py-2 text-center">WIS</th>
                <th className="py-2 text-center">CHA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">1</td>
                <td className="py-1.5 text-xs">Rolado + Half-Elf (+2/+1/+1)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">12</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">5</td>
                <td className="py-1.5 text-xs">Sorc 4 — Resilient (CON)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center text-gold">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">12</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">9</td>
                <td className="py-1.5 text-xs">Sorc 8 — Fey Touched (+1 WIS)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center text-gold">14</td>
                <td className="py-1.5 text-center">18</td>
              </tr>
              <tr>
                <td className="py-1.5">10</td>
                <td className="py-1.5 text-xs">Tome of Leadership (+2 CHA)</td>
                <td className="py-1.5 text-center">10</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center">19</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">14</td>
                <td className="py-1.5 text-center text-gold">20</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Variant>

      <Variant id="pointbuy">
        <Tip>
          Point Buy 15/15/15/8/8/8 com Shadar-kai. Os 15s vão em CHA, CON e WIS.
          Os raciais (+2 CON, +1 CHA) fecham CON ímpar no nível 1, arredondado
          por Resilient no nível 5. Esta variante prioriza{" "}
          <strong>sobrevivência</strong> sobre casting puro.
        </Tip>
        <H3>Atributos finais (nível 10)</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Atributo</th>
                <th className="py-2 text-center">Point Buy</th>
                <th className="py-2 text-center">Racial</th>
                <th className="py-2 text-center">Nível 10</th>
                <th className="py-2 text-center">Mod</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">STR</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">DEX</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">CON</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-gold/70">+2</td>
                <td className="py-2 text-center">18*</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">INT</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">8</td>
                <td className="py-2 text-center text-red-400/70">&minus;1</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 font-semibold">WIS</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-muted-foreground">—</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-green-400/70">+2</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">CHA</td>
                <td className="py-2 text-center">15</td>
                <td className="py-2 text-center text-gold/70">+1</td>
                <td className="py-2 text-center">18&dagger;</td>
                <td className="py-2 text-center text-green-400/70">+4</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground/60 mt-2">
            * Resilient CON (+1) &nbsp;|&nbsp; &dagger; +2 CHA no Sorc 8 (ou Lucky — veja abaixo)
          </p>
        </div>

        <H3>Progressão por nível</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs sm:text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Nível</th>
                <th className="py-2 text-left">Evento</th>
                <th className="py-2 text-center">STR</th>
                <th className="py-2 text-center">DEX</th>
                <th className="py-2 text-center">CON</th>
                <th className="py-2 text-center">INT</th>
                <th className="py-2 text-center">WIS</th>
                <th className="py-2 text-center">CHA</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">1</td>
                <td className="py-1.5 text-xs">Point Buy + Shadar-kai (+2/+1)</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">17</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center">16</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-1.5">5</td>
                <td className="py-1.5 text-xs">Sorc 4 — Resilient (CON)</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center text-gold">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center">16</td>
              </tr>
              <tr>
                <td className="py-1.5">9</td>
                <td className="py-1.5 text-xs">Sorc 8 — +2 CHA ou Lucky</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center text-gold">18 ou 16</td>
              </tr>
            </tbody>
          </table>
        </div>

        <StrategyBox title="A decisão do nível 9: +2 CHA ou Lucky?">
          <p>
            <strong>+2 CHA (→ 18):</strong> fecha o modificador em +4. Spell save
            DC sobe de 14 para 15, spell attack de +7 para +8. É a escolha caster
            pura — suas magias acertam e grudam mais.
          </p>
          <p>
            <strong>Lucky:</strong> CHA fica em 16 (+3), mas você ganha 3 rerolls
            por dia. Pode usar em saves de concentração, saves contra efeitos
            letais, ou até forçar um inimigo a rerollar um ataque contra você.
            É a escolha sobrevivente — aceita ser um caster levemente inferior em
            troca de 3 momentos de {"\u201C"}não hoje{"\u201D"} por dia.
          </p>
          <p>
            <strong>Recomendação:</strong> se seu grupo tem bastante dano e precisa
            que você fique vivo, Lucky. Se você é o principal caster ofensivo,
            +2 CHA.
          </p>
        </StrategyBox>
      </Variant>

      {/* ═══════════════════════════════════════════════════════════
         CLASSE E FEATURES — COMPARTILHADO
         ═══════════════════════════════════════════════════════════ */}
      <H2>Classe e features</H2>

      <H3>Cleric 1 — Order Domain</H3>
      <P>
        O dip de um nível em Cleric (Order Domain) é o coração da build.{" "}
        <strong>Voice of Authority</strong> é a feature que transforma um
        caster de suporte em um multiplicador de ações: toda vez que você
        conjura uma magia com spell slot mirando um aliado, esse aliado pode
        usar sua reação para fazer um ataque de arma.
      </P>
      <P>
        Além disso, o nível de Cleric traz proficiência em armaduras pesadas e
        escudos (AC 19-21), saves de Sabedoria, e acesso a magias clericais de
        1º nível como Command e Heroism, ambas preparadas gratuitamente
        pelo domínio.
      </P>

      <StrategyBox title="Voice of Authority — Por que é tão forte">
        <p>
          Voice of Authority ativa em <em>qualquer</em> magia com spell slot que
          mire um aliado. Bless mira 3 aliados? Escolha o Fighter. Healing Word
          num aliado caído? Ele levanta E ataca. Aid num Paladin? Ele ganha HP
          temporário e um ataque de reação com Smite.
        </p>
        <p>
          Com Quickened Spell, você pode buffar (ativando Voice of Authority) como bônus
          action e ainda usar sua ação normalmente. É um ataque extra gratuito para
          seu grupo <em>em cada turno</em> que você buffa alguém.
        </p>
      </StrategyBox>

      <H3>Sorcerer — Divine Soul</H3>
      <P>
        Divine Soul Sorcerer é avaliado pela comunidade como{" "}
        <strong>tier S</strong> entre as subclasses de Sorcerer, e por bom
        motivo. Ele dá acesso à <strong>lista inteira de magias de Cleric</strong>{" "}
        sem precisar de mais níveis em Cleric. Isso significa Spirit Guardians,
        Aid, Revivify, Death Ward — tudo usando Carisma e com Metamagic
        disponível.
      </P>
      <P>
        As features da subclasse são igualmente fortes:{" "}
        <strong>Favored by the Gods</strong> (2d4 de bônus em um save ou ataque
        falhado, 1x por descanso) e{" "}
        <strong>Empowered Healing</strong> (reroll dados de cura para aliados
        próximos). Ambas reforçam o papel de suporte confiável.
      </P>

      <H3>Feats</H3>

      <Ul>
        <Li>
          <strong>Resilient (CON) — Sorc 4:</strong> Proficiência em saves de
          Constituição é essencial para manter concentração em magias como
          Bless e Spirit Guardians. No nível 10, o bônus de +7/+8 em saves de
          CON torna quase impossível perder concentração em danos baixos e
          moderados.
        </Li>
      </Ul>

      <Variant id="rolled">
        <Ul>
          <Li>
            <strong>Fey Touched — Sorc 8:</strong> +1 WIS (arredondando de 13
            para 14), Misty Step gratuito 1x/dia (mobilidade essencial para um
            caster frontline), e Gift of Alacrity (bônus de 1d8 em iniciativa para
            garantir que os buffs cheguem antes dos inimigos agirem).
          </Li>
        </Ul>
      </Variant>
      <Variant id="pointbuy">
        <Ul>
          <Li>
            <strong>+2 CHA ou Lucky — Sorc 8:</strong> Como Shadar-kai já tem
            Blessing of the Raven Queen como mobilidade de emergência, o nível 8
            abre para fechar CHA 18 (+2 ASI) ou pegar Lucky para 3 rerolls/dia.
            Sem Fey Touched, você perde Gift of Alacrity — mas com DEX 8, iniciativa
            já não era seu forte de qualquer forma.
          </Li>
        </Ul>
      </Variant>

      <H3>Metamagic</H3>
      <Ul>
        <Li>
          <strong>Quickened Spell:</strong> Transforma uma magia de ação em
          bônus action. Permite conjurar um buff (ativando Voice of Authority)
          e ainda usar sua ação para Dodge, cantrip, ou outra magia no mesmo turno.
        </Li>
        <Li>
          <strong>Extended Spell:</strong> Dobra a duração de magias como Aid
          (agora 16 horas em vez de 8), Death Ward, e qualquer buff de
          concentração longa. Excelente para preparação antes de encontros.
        </Li>
      </Ul>

      {/* ═══════════════════════════════════════════════════════════
         ESTRATÉGIA DE COMBATE — EXPANDIDO
         ═══════════════════════════════════════════════════════════ */}
      <H2>Estratégia de combate</H2>

      <P>
        Esta build não funciona como um caster tradicional. Você não fica atrás
        lançando Fireball. Você entra na frontline, concentra seu buff principal,
        entra em Dodge, e transforma cada reação em valor pro grupo. O dano vem
        dos aliados — o seu trabalho é sobreviver e mantê-los fortalecidos.
      </P>

      <H3>Turno 1 — Montar a fundação</H3>
      <StrategyBox title="Flowchart do Round 1">
        <p>
          <strong>Bônus action:</strong> Quickened Bless em 3 aliados.
          Voice of Authority ativa: escolha o aliado com maior DPR (Fighter,
          Paladin, Rogue) para o ataque de reação gratuito.
        </p>
        <p>
          <strong>Ação:</strong> Dodge. Sim, Dodge. Você está na frontline com
          AC 19-21 e Bless concentrado. Seu trabalho agora é{" "}
          <em>não perder concentração</em>, não causar dano.
        </p>
        <p>
          <strong>Movimento:</strong> Posicionar-se entre os aliados e os
          inimigos. Você quer estar ao alcance de Silvery Barbs e próximo dos
          alvos de Spirit Guardians quando for a hora.
        </p>
      </StrategyBox>

      <H3>Entre turnos — Silvery Barbs como motor</H3>
      <P>
        Aqui está o segredo da build. Silvery Barbs custa uma reação e faz
        duas coisas: força o inimigo a rerollar um teste (ataque, save, check)
        E dá vantagem a um aliado no próximo d20 dele. Mas como é uma magia
        com spell slot mirando um aliado (o beneficiado), ela ativa{" "}
        <strong>Voice of Authority</strong>.
      </P>
      <P>
        Resultado prático: <strong>entre seus turnos</strong>, toda vez que um
        inimigo acerta algo importante, você usa Silvery Barbs → o inimigo
        rerolla → seu aliado ganha vantagem E um ataque de reação gratuito.
        Isso acontece <em>fora do seu turno</em>, sem custar ação nem bônus
        action.
      </P>

      <StrategyBox title="Silvery Barbs + Voice of Authority — a combo">
        <p>
          Inimigo acerta um ataque contra o Wizard → Você usa Silvery Barbs como
          reação → Inimigo rerolla (possivelmente erra) → Fighter ganha vantagem
          no próximo ataque E um ataque de reação agora via Voice of Authority.
          Resultado: inimigo possivelmente falhou, Fighter atacou, Fighter tem
          vantagem no próximo ataque. Tudo com 1 spell slot e 0 ações.
        </p>
      </StrategyBox>

      <H3>Turnos 2+ — Manter e escalar</H3>
      <P>
        Com Bless ativo e Dodge rolando, seus turnos seguintes são flexíveis:
      </P>
      <Ul>
        <Li>
          <strong>Se o combate é longo:</strong> mantenha Bless + Dodge. Use
          Silvery Barbs nas reações. Jogue cantrips (Toll the Dead, Sacred Flame)
          como ação se não precisar de Dodge.
        </Li>
        <Li>
          <strong>Se há muitos inimigos agrupados:</strong> solte Bless e mude
          concentração para Spirit Guardians. Quickened Spirit Guardians como
          bônus action + Dodge como ação. Cada inimigo que começa o turno perto
          de você toma 3d8 radiant.
        </Li>
        <Li>
          <strong>Se precisa de dano imediato:</strong> Fireball ou outra magia
          de área. Quickened Bless → Ação Fireball funciona, e ainda ativa
          Voice of Authority.
        </Li>
        <Li>
          <strong>Emergência:</strong> Healing Word (bônus action, cura à
          distância para levantar um aliado caído) ou Revivify se alguém morreu.
        </Li>
      </Ul>

      <Variant id="rolled">
        <StrategyBox title="Fey Touched como mobility">
          <p>
            Na variante Half-Elf, Misty Step (da Fey Touched) é seu escape de
            emergência. Se você está cercado e a concentração está em risco,
            Misty Step 30ft como bônus action para sair, Dodge como ação.
            Gift of Alacrity garante que você frequentemente age antes dos
            inimigos no Round 1.
          </p>
        </StrategyBox>
      </Variant>
      <Variant id="pointbuy">
        <StrategyBox title="Blessing of the Raven Queen como panic button">
          <p>
            Na variante Shadar-kai, Blessing of the Raven Queen substitui Misty
            Step como escape. Mesmo alcance (30ft), mas com resistência a todo
            dano até o início do próximo turno. Se você está cercado e
            concentrando Spirit Guardians, ative a Blessing: teleporte para
            segurança + todo dano que vier no turno dos inimigos é reduzido
            pela metade. A diferença: Misty Step pode ser usado várias vezes
            por dia com spell slots, a Blessing é 1x/long rest.
          </p>
        </StrategyBox>
      </Variant>

      <H3>Onde a build brilha</H3>
      <Ul>
        <Li>Multiplicação de ações: cada buff + cada Silvery Barbs gera ataques extras para o grupo</Li>
        <Li>Concentração blindada: Resilient CON + alta CON + Dodge = saves quase garantidos</Li>
        <Li>Versatilidade: acesso a listas de Cleric e Sorcerer simultaneamente</Li>
        <Li>AC alta para caster: 19-21 com Heavy Armor + Shield</Li>
        <Li>Contramágica: Counterspell e Silvery Barbs para proteger o grupo</Li>
      </Ul>

      <H3>Onde a build sofre</H3>
      <Ul>
        <Li>Magias conhecidas limitadas: Sorcerer tem poucas magias, escolha com cuidado</Li>
        <Li>Dependência de concentração: perder Bless ou Spirit Guardians dói</Li>
        <Li>Dano direto baixo: o dano vem dos aliados, não de você</Li>
        <Li>Início lento: níveis 1-4 antes de Metamagic e magias de 3º nível</Li>
        <Li>Custo de Silvery Barbs: 1st level slot cada uso, queima recursos rápido em combates longos</Li>
      </Ul>

      {/* ═══════════════════════════════════════════════════════════
         META COMPARISON — COMPARTILHADO
         ═══════════════════════════════════════════════════════════ */}
      <H2>Como se compara com o meta?</H2>

      <P>
        Nos fóruns de otimização (RPGBot, TabletopBuilds, Treantmonk, r/3d6),
        o Order Cleric 1 / Divine Soul Sorcerer é consistentemente listado como{" "}
        <strong>uma das builds de suporte mais eficientes do 5e</strong>. A
        Divine Soul Sorcerer sozinha já é avaliada como tier S entre subclasses de
        Sorcerer, e o dip de Order Cleric é amplamente reconhecido como um dos
        melhores multiclass de 1 nível do jogo.
      </P>
      <P>
        Comparada a outros suportes populares: <strong>Twilight Cleric</strong>{" "}
        e <strong>Peace Cleric</strong> são frequentemente citados como mais
        fortes em termos brutos (a aura de HP temporários do Twilight e o
        Emboldening Bond do Peace são considerados {"\u201C"}broken{"\u201D"}). Porém,
        o Order/DSS tem uma vantagem única: ele{" "}
        <strong>multiplica a economia de ações do grupo inteiro</strong> em vez
        de apenas adicionar um bônus. Quando seu Fighter e seu Paladin ganham
        ataques extras como reação em todo turno que você buffa, a contribuição
        de DPR indireta pode superar a de um caster blaster.
      </P>
      <P>
        A build do Capa seguiu Quickened e Extended como metamagic em vez do
        mais popular Twinned Spell. Isso troca a capacidade de buffar dois
        alvos simultaneamente pela flexibilidade de fazer duas ações por turno
        e estender buffs como Aid para 16 horas, uma escolha que prioriza
        preparação e versatilidade sobre raw output.
      </P>

      {/* ═══════════════════════════════════════════════════════════
         CRESCIMENTO — COMPARTILHADO
         ═══════════════════════════════════════════════════════════ */}
      <H2>Depois do nível 10: pra onde crescer</H2>

      <Ul>
        <Li>
          <strong>Nível 11 (Sorc 10):</strong> mais um Metamagic. Twinned
          Spell é a escolha óbvia aqui, finalmente adicionando a capacidade de
          buffar dois aliados ao mesmo tempo.
        </Li>
        <Li>
          <strong>Nível 12 (Sorc 11):</strong> magias de 6º nível. Mass
          Suggestion para controle fora de combate, ou Heal para cura massiva
          de emergência.
        </Li>
        <Li>
          <strong>Nível 13 (Sorc 12):</strong> ASI. +2 CHA (chegando a 20) ou
          um feat como Alert para garantir iniciativa alta.
        </Li>
        <Li>
          <strong>Itens desejados:</strong> Staff of Power (Very Rare) para mais
          AC e magias, ou um Dragon Touched Focus (Legendary) para potencializar
          magias de Sorcerer.
        </Li>
      </Ul>

      {/* ═══════════════════════════════════════════════════════════
         HISTÓRIA — COMPARTILHADO
         ═══════════════════════════════════════════════════════════ */}
      <H2>A história por trás da ficha</H2>

      {/* Character Portrait — with gold glow + hover effect */}
      <div className="my-10 flex justify-center">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.06] via-gold/[0.14] to-gold/[0.06] rounded-full blur-[80px] scale-90 transition-all duration-500 group-hover:scale-100 group-hover:via-gold/[0.20]" />
          <Image
            src="/art/blog/capa-barsavi-portrait.png"
            alt="Capa Barsavi — Order Cleric / Divine Soul Sorcerer"
            width={1024}
            height={1536}
            className="relative w-[260px] sm:w-[320px] h-auto rounded-xl drop-shadow-[0_0_40px_rgba(212,168,83,0.25)] transition-all duration-500 group-hover:drop-shadow-[0_0_60px_rgba(212,168,83,0.4)] group-hover:scale-[1.02]"
            unoptimized
          />
        </div>
      </div>

      <P>
        Um meio-elfo de linhagem drow que caminha entre dois mundos: o da fé
        e o do poder inato. Capa Barsavi nasceu em uma grande metrópole costeira,
        longe dos olhares da nobreza. Filho bastardo de{" "}
        <strong>Auri Raelistor</strong>, um respeitado clérigo e nobre devoto de
        um deus da justiça, e de <strong>Lyna</strong>, uma aventureira
        meio-elfa drow que desapareceu logo após o nascimento do filho.
        {"\u201C"}Capa{"\u201D"} vem da tradição de nomear filhos bastardos com termos que
        evocam proteção; {"\u201C"}Barsavi{"\u201D"} homenageia uma figura lendária
        conhecida como {"\u201C"}O Guardião Sábio{"\u201D"}.
      </P>
      <P>
        Embora bastardo, Capa nunca foi abandonado. Seu pai garantiu que ele
        tivesse acesso às melhores instituições de ensino: escolas clericais,
        academias de filosofia, fortalezas-biblioteca lendárias e centros
        religiosos de todo o continente. Foi nesse período que desenvolveu
        habilidades em retórica, diplomacia, teologia e magia divina, e
        conheceu uma duquesa influente, após impressioná-la com um discurso
        sobre a ética da paz em tempos de guerra.
      </P>
      <P>
        Tudo mudou quando seu pai partiu em uma expedição rumo a mares
        distantes e nunca retornou. Nenhum corpo. Nenhuma pista. Nenhuma
        resposta. Se o deus que servia representava justiça e ordem, por que
        permitiu tal silêncio? Esse questionamento não destruiu sua fé, mas
        a transformou em algo mais pragmático: ele acredita na justiça e na
        ordem, mas não depende cegamente delas.
      </P>
      <P>
        Foi então que poderes que não vinham de estudo nem de oração
        começaram a se manifestar. Um sábio em uma antiga fortaleza-biblioteca
        revelou a verdade: sua mãe, Lyna, possuía linhagem descendente de um
        ser celestial tocado por uma deusa da magia. Esse sangue despertou
        dentro de Capa, tornando-o portador de duas fontes de poder: a
        disciplina da fé clerical e o poder inato de seu sangue divino.
      </P>
      <P>
        Ao aceitar o convite da duquesa para um encontro diplomático, Capa
        iniciou a jornada que o levaria às névoas de uma terra amaldiçoada sob
        o domínio de um vampiro ancestral. Em apenas{" "}
        <strong>19 dias</strong>, enfrentou horrores sobrenaturais, viu aldeias
        destruídas, ficou cara a cara com o senhor das névoas, e morreu{" "}
        <strong>duas vezes</strong>. E voltou duas vezes.
      </P>
      <P>
        Com seus companheiros Amum Titus, Skid, Sócrates, Auditore e
        Lauren Nailo, Capa se tornou o elo que mantinha o grupo unido.
        Estrategista em combate, curandeiro, voz de comando em momentos
        críticos, defensor dos mais vulneráveis. Ele não buscava protagonismo.
        Mas quando tudo começava a ruir, todos olhavam para ele.
      </P>
      <P>
        No final, Capa Barsavi morreu pelo seu grupo. A engrenagem parou para
        que a máquina sobrevivesse. Uma fundação que cumpriu sua promessa.
      </P>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 my-6 text-center">
        <p className="text-xs text-muted-foreground/70">
          Build criada e jogada por <strong className="text-foreground/80">Dani</strong> · por Pocket DM
        </p>
      </div>

      {/* CTA Build */}
      <div className="rounded-lg border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.05] rounded-full blur-[60px]" />
        <div className="relative">
          <p className="font-display text-lg text-gold mb-1">Gostou dessa build?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Monte o encontro perfeito para testá-la. Use o Pocket DM gratuitamente.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200"
            >
              Testar Grátis →
            </Link>
            <Link
              href="/auth/login"
              className="border border-white/10 text-foreground/80 font-medium px-5 py-2.5 rounded-lg text-sm hover:border-white/20 hover:text-foreground transition-all duration-200"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </div>
    </BuildVariantProvider>
  );
}
