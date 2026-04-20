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

export default function BlogPost14() {
  return (
    <BuildVariantProvider defaultVariant="rolled">
      {/* Opening quote */}
      <div className="rounded-xl border border-gold/20 bg-gold/[0.04] p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.06] rounded-full blur-[60px]" />
        <p className="relative text-lg italic text-gold/90 font-display">
          {"\u201C"}I will be the foundation.{"\u201D"}
        </p>
        <p className="relative text-xs text-muted-foreground mt-2">— Capa Barsavi</p>
      </div>

      <P>
        Capa Barsavi wasn{"'"}t the one dealing the most damage, taking the
        hits, or stealing the spotlight. He was the reason everyone else could.
        An <strong>Order Cleric 1 / Divine Soul Sorcerer</strong> built to be
        the invisible gear that makes the machine work, and one of the most
        efficient support builds in D&amp;D 5e.
      </P>

      <P>
        Below we present two versions of the build: the{" "}
        <strong>original played in a campaign</strong> with rolled stats and
        Half-Elf, and an{" "}
        <strong>optimized Point Buy reconstruction</strong> using Shadar-kai.
        Choose a variant and the entire article adapts.
      </P>

      {/* ─── TOGGLE ─── */}
      <BuildVariantToggle
        variants={[
          { id: "rolled", label: "Half-Elf (Drow)", sub: "Rolled Stats" },
          { id: "pointbuy", label: "Shadar-kai", sub: "Point Buy" },
        ]}
      />

      <SectionDivider src="/art/blog/treated-nobg/mythjourneys-dnd-character-dark-elf-female-wizard-sorcerer.png" alt="Dark elf sorceress" />

      {/* ═══ SHEET IN 30 SECONDS ═══ */}
      <H2>The sheet in 30 seconds</H2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm text-foreground/80 border-collapse">
          <tbody>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Race</td>
              <td className="py-2">
                <Variant id="rolled">Half-Elf (Drow)</Variant>
                <Variant id="pointbuy">Shadar-kai (Tasha{"'"}s / MotM)</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Class</td>
              <td className="py-2">Cleric 1 (Order Domain) / Sorcerer 9 (Divine Soul)</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Level</td>
              <td className="py-2">10</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Focus</td>
              <td className="py-2">Support / Control / Action economy multiplier</td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Stats</td>
              <td className="py-2">
                <Variant id="rolled">4d6 drop lowest (campaign)</Variant>
                <Variant id="pointbuy">Point Buy (15 / 15 / 15 / 8 / 8 / 8)</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Feats</td>
              <td className="py-2">
                <Variant id="rolled">Resilient (CON), Fey Touched</Variant>
                <Variant id="pointbuy">Resilient (CON), +2 CHA or Lucky</Variant>
              </td>
            </tr>
            <tr className="border-b border-white/[0.06]">
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Metamagic</td>
              <td className="py-2">Quickened Spell, Extended Spell</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-gold/80 whitespace-nowrap">Difficulty</td>
              <td className="py-2">Medium — requires understanding of synergy and timing</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══ RACE — VARIANT ═══ */}
      <H2>Race</H2>

      <Variant id="rolled">
        <H3>Half-Elf (Drow)</H3>
        <P>
          Half-Elf is one of the most flexible races in 5e. The +2 CHA is exactly
          what a Sorcerer needs, and the two floating +1s let you round out CON
          and DEX, essential for survivability and AC. The Drow variant adds
          Darkvision 60ft and Fey Ancestry (advantage against charm, immunity to
          magical sleep), valuable defensive traits for maintaining concentration.
        </P>
        <StrategyBox title="Why Drow and not High Elf?">
          <p>
            The Drow variant (SCAG) trades Skill Versatility{"'"}s two proficiencies
            for Drow Magic: the <em>dancing lights</em> cantrip for free, and
            at level 3 <em>faerie fire</em> 1x/day (no slot required). Faerie
            fire is brutal: advantage on attacks against all affected targets,
            perfect synergy with Voice of Authority. High Elf would only give a
            Wizard cantrip — this build already has enough cantrips.
          </p>
        </StrategyBox>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Trait</th>
                <th className="py-2 text-left">Detail</th>
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
                <td className="py-2">Advantage on saves against charm, immune to magical sleep</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Drow Magic</td>
                <td className="py-2">Dancing lights (cantrip), faerie fire 1x/day (level 3)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Variant>

      <Variant id="pointbuy">
        <H3>Shadar-kai</H3>
        <P>
          If your table uses Point Buy with flexible ASI rules (Tasha{"'"}s Cauldron
          / MotM), <strong>Shadar-kai</strong> is the ideal race for this build.
          With the 15/15/15/8/8/8 array, place the 15s in CHA, CON and WIS, and
          use racial bonuses (+2 CON, +1 CHA) to reach{" "}
          <strong>CON 17, CHA 16, WIS 15</strong> at level 1.
        </P>
        <P>
          The key advantage: <strong>Blessing of the Raven Queen</strong>.
          Once per long rest, as a bonus action, you teleport 30ft and gain
          resistance to <em>all damage</em> until the start of your next turn.
          For a frontline caster who needs to stay alive concentrating on Bless
          or Spirit Guardians, this is brutally superior to Misty Step, which
          offers only mobility with no protection.
        </P>
        <StrategyBox title="Blessing of the Raven Queen vs Misty Step">
          <p>
            Misty Step (from Fey Touched in the Half-Elf variant) is bonus action +
            30ft teleport, available 1x/day free + additional spell slots.
            Blessing of the Raven Queen is bonus action + 30ft teleport +
            resistance to <em>all damage</em> for 1 turn, but only 1x/long
            rest. Same range, but the Blessing adds a survival layer Misty
            Step lacks. The trade-off: Misty Step can be cast multiple times
            with spell slots, the Blessing is 1x/day.
          </p>
        </StrategyBox>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Trait</th>
                <th className="py-2 text-left">Detail</th>
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
                <td className="py-2">Advantage on saves against charm, immune to magical sleep</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Trance</td>
                <td className="py-2">4h rest instead of 8h sleep</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold whitespace-nowrap">Blessing of the Raven Queen</td>
                <td className="py-2">1x/long rest — 30ft teleport + resistance to all damage for 1 turn</td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          <strong>Honest trade-off:</strong> DEX 8 means &minus;1 to initiative
          and DEX saves. With heavy armor from Cleric, AC isn{"'"}t affected, but
          you{"'"}ll act after nearly everyone. Gift of Alacrity (if available as
          a Sorcerer spell) helps compensate, but this version accepts being
          slower in exchange for being tougher.
        </P>
      </Variant>

      {/* ═══ ABILITY SCORES — VARIANT ═══ */}
      <H2>Ability Scores</H2>

      <Variant id="rolled">
        <Tip>
          These stats were rolled with 4d6 drop lowest during the campaign.
          Every table rolls differently — what matters are the{" "}
          <strong>priorities</strong>: CHA &gt; CON &gt; WIS &gt; DEX.
        </Tip>
        <H3>Final stats (level 10)</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Ability</th>
                <th className="py-2 text-center">Base</th>
                <th className="py-2 text-center">Racial</th>
                <th className="py-2 text-center">Level 10</th>
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

        <H3>Progression by level</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs sm:text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Level</th>
                <th className="py-2 text-left">Event</th>
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
                <td className="py-1.5 text-xs">Rolled + Half-Elf (+2/+1/+1)</td>
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
          Point Buy 15/15/15/8/8/8 with Shadar-kai. The 15s go into CHA, CON
          and WIS. Racial bonuses (+2 CON, +1 CHA) leave CON odd at level 1,
          rounded by Resilient at level 5. This variant prioritizes{" "}
          <strong>survival</strong> over pure casting.
        </Tip>
        <H3>Final stats (level 10)</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Ability</th>
                <th className="py-2 text-center">Point Buy</th>
                <th className="py-2 text-center">Racial</th>
                <th className="py-2 text-center">Level 10</th>
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
            * Resilient CON (+1) &nbsp;|&nbsp; &dagger; +2 CHA at Sorc 8 (or Lucky — see below)
          </p>
        </div>

        <H3>Progression by level</H3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-xs sm:text-sm text-foreground/80 border-collapse">
            <thead>
              <tr className="border-b border-gold/20 text-gold/70 text-[10px] sm:text-xs uppercase tracking-wider">
                <th className="py-2 text-left">Level</th>
                <th className="py-2 text-left">Event</th>
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
                <td className="py-1.5 text-xs">Sorc 8 — +2 CHA or Lucky</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">18</td>
                <td className="py-1.5 text-center">8</td>
                <td className="py-1.5 text-center">15</td>
                <td className="py-1.5 text-center text-gold">18 or 16</td>
              </tr>
            </tbody>
          </table>
        </div>

        <StrategyBox title="The level 9 decision: +2 CHA or Lucky?">
          <p>
            <strong>+2 CHA (to 18):</strong> closes the modifier at +4. Spell save
            DC goes from 14 to 15, spell attack from +7 to +8. The pure caster
            choice — your spells hit and stick more often.
          </p>
          <p>
            <strong>Lucky:</strong> CHA stays at 16 (+3), but you get 3 rerolls
            per day. Use them on concentration saves, saves against lethal effects,
            or force an enemy to reroll an attack against you. The survivor choice
            — slightly weaker caster in exchange for 3 daily {"\u201C"}not today{"\u201D"} moments.
          </p>
          <p>
            <strong>Recommendation:</strong> if your party has plenty of damage and
            needs you alive, take Lucky. If you{"'"}re the primary offensive caster,
            take +2 CHA.
          </p>
        </StrategyBox>
      </Variant>

      {/* ═══ CLASS AND FEATURES — SHARED ═══ */}
      <H2>Class and features</H2>

      <H3>Cleric 1 — Order Domain</H3>
      <P>
        The one-level Cleric (Order Domain) dip is the heart of the build.{" "}
        <strong>Voice of Authority</strong> transforms a support caster into an
        action economy multiplier: every time you cast a spell with a spell slot
        targeting an ally, that ally can use their reaction to make a weapon
        attack.
      </P>
      <P>
        The Cleric level also brings heavy armor and shield proficiency (AC
        19-21), Wisdom save proficiency, and access to 1st-level Cleric spells
        like Command and Heroism, both prepared for free through the domain.
      </P>

      <StrategyBox title="Voice of Authority — Why it's so strong">
        <p>
          Voice of Authority triggers on <em>any</em> spell with a spell slot
          targeting an ally. Bless targets 3 allies? Pick the Fighter. Healing
          Word on a downed ally? They stand up AND attack. Aid on a Paladin?
          They get temp HP and a reaction attack with Smite.
        </p>
        <p>
          With Quickened Spell, you can buff (triggering Voice of Authority) as a
          bonus action and still use your action normally. That{"'"}s a free extra
          attack for your party <em>every turn</em> you buff someone.
        </p>
      </StrategyBox>

      <H3>Sorcerer — Divine Soul</H3>
      <P>
        Divine Soul Sorcerer is rated by the optimization community as{" "}
        <strong>S-tier</strong> among Sorcerer subclasses, and for good reason.
        It grants access to the <strong>entire Cleric spell list</strong>{" "}
        without needing additional Cleric levels. That means Spirit Guardians,
        Aid, Revivify, Death Ward — all using Charisma and with Metamagic
        available.
      </P>
      <P>
        The subclass features are equally strong:{" "}
        <strong>Favored by the Gods</strong> (add 2d4 to a failed save or
        attack, once per rest) and{" "}
        <strong>Empowered Healing</strong> (reroll healing dice for nearby
        allies). Both reinforce the reliable support role.
      </P>

      <H3>Feats</H3>

      <Ul>
        <Li>
          <strong>Resilient (CON) — Sorc 4:</strong> Proficiency in Constitution
          saves is essential for maintaining concentration on Bless and Spirit
          Guardians. By level 10, the +7/+8 CON save bonus makes it nearly
          impossible to lose concentration on low to moderate damage.
        </Li>
      </Ul>

      <Variant id="rolled">
        <Ul>
          <Li>
            <strong>Fey Touched — Sorc 8:</strong> +1 WIS (rounding from 13
            to 14), free Misty Step 1x/day (essential mobility for a frontline
            caster), and Gift of Alacrity (1d8 initiative bonus to ensure buffs
            land before enemies act).
          </Li>
        </Ul>
      </Variant>
      <Variant id="pointbuy">
        <Ul>
          <Li>
            <strong>+2 CHA or Lucky — Sorc 8:</strong> Since Shadar-kai already
            has Blessing of the Raven Queen as emergency mobility, level 8 opens
            up to close CHA 18 (+2 ASI) or take Lucky for 3 rerolls/day.
            Without Fey Touched, you lose Gift of Alacrity — but with DEX 8,
            initiative was never your strong suit anyway.
          </Li>
        </Ul>
      </Variant>

      <H3>Metamagic</H3>
      <Ul>
        <Li>
          <strong>Quickened Spell:</strong> Turns an action spell into a bonus
          action. Cast a buff (triggering Voice of Authority) and still use your
          action for Dodge, cantrip, or another spell in the same turn.
        </Li>
        <Li>
          <strong>Extended Spell:</strong> Doubles the duration of spells like
          Aid (now 16 hours instead of 8), Death Ward, and any long-duration
          concentration buff. Excellent for pre-combat preparation.
        </Li>
      </Ul>

      {/* ═══ COMBAT STRATEGY — EXPANDED ═══ */}
      <H2>Combat strategy</H2>

      <P>
        This build doesn{"'"}t play like a traditional caster. You don{"'"}t sit
        in the back casting Fireball. You step into the frontline, concentrate
        your main buff, go into Dodge, and turn every reaction into value for
        the party. Damage comes from your allies — your job is to survive and
        keep them empowered.
      </P>

      <H3>Turn 1 — Build the foundation</H3>
      <StrategyBox title="Round 1 Flowchart">
        <p>
          <strong>Bonus action:</strong> Quickened Bless on 3 allies. Voice of
          Authority triggers: pick the ally with the highest DPR (Fighter,
          Paladin, Rogue) for the free reaction attack.
        </p>
        <p>
          <strong>Action:</strong> Dodge. Yes, Dodge. You{"'"}re on the frontline
          with AC 19-21 and Bless concentrated. Your job now is to{" "}
          <em>not lose concentration</em>, not deal damage.
        </p>
        <p>
          <strong>Movement:</strong> Position between your allies and the
          enemies. You want to be in range for Silvery Barbs and close to Spirit
          Guardians targets when the time comes.
        </p>
      </StrategyBox>

      <H3>Between turns — Silvery Barbs as the engine</H3>
      <P>
        Here{"'"}s the build{"'"}s secret. Silvery Barbs costs a reaction and does
        two things: forces the enemy to reroll a d20 (attack, save, check)
        AND gives advantage to an ally on their next d20. But since it{"'"}s a
        spell with a spell slot targeting an ally (the beneficiary), it
        triggers <strong>Voice of Authority</strong>.
      </P>
      <P>
        Practical result: <strong>between your turns</strong>, every time an
        enemy lands something important, you use Silvery Barbs — the enemy
        rerolls — your ally gains advantage AND a free reaction attack.
        This happens <em>off your turn</em>, costing no action or bonus action.
      </P>

      <StrategyBox title="Silvery Barbs + Voice of Authority — the combo">
        <p>
          Enemy hits the Wizard — You use Silvery Barbs as a reaction — Enemy
          rerolls (possibly misses) — Fighter gains advantage on next attack AND
          a reaction attack now via Voice of Authority. Result: enemy possibly
          failed, Fighter attacked, Fighter has advantage on next attack. All
          from 1 spell slot and 0 actions.
        </p>
      </StrategyBox>

      <H3>Turns 2+ — Maintain and scale</H3>
      <P>
        With Bless active and Dodge rolling, your subsequent turns are flexible:
      </P>
      <Ul>
        <Li>
          <strong>Long combat:</strong> keep Bless + Dodge. Use Silvery Barbs on
          reactions. Throw cantrips (Toll the Dead, Sacred Flame) as your action
          if you don{"'"}t need Dodge.
        </Li>
        <Li>
          <strong>Clustered enemies:</strong> drop Bless and switch concentration
          to Spirit Guardians. Quickened Spirit Guardians as bonus action + Dodge
          as action. Each enemy starting their turn near you takes 3d8 radiant.
        </Li>
        <Li>
          <strong>Burst damage needed:</strong> Fireball or another AoE.
          Quickened Bless — Action Fireball works, and still triggers Voice of
          Authority.
        </Li>
        <Li>
          <strong>Emergency:</strong> Healing Word (bonus action ranged heal to
          pick up a downed ally) or Revivify if someone died.
        </Li>
      </Ul>

      <Variant id="rolled">
        <StrategyBox title="Fey Touched as mobility">
          <p>
            In the Half-Elf variant, Misty Step (from Fey Touched) is your
            emergency escape. If you{"'"}re surrounded and concentration is at
            risk, Misty Step 30ft as bonus action to disengage, Dodge as action.
            Gift of Alacrity ensures you frequently act before enemies in
            Round 1.
          </p>
        </StrategyBox>
      </Variant>
      <Variant id="pointbuy">
        <StrategyBox title="Blessing of the Raven Queen as panic button">
          <p>
            In the Shadar-kai variant, Blessing of the Raven Queen replaces Misty
            Step as your escape. Same range (30ft), but with resistance to all
            damage until the start of your next turn. If you{"'"}re surrounded
            and concentrating Spirit Guardians, activate the Blessing: teleport
            to safety + all incoming damage is halved for a full enemy turn.
            The difference: Misty Step can be cast multiple times per day with
            spell slots, the Blessing is 1x/long rest.
          </p>
        </StrategyBox>
      </Variant>

      <H3>Where the build shines</H3>
      <Ul>
        <Li>Action multiplication: every buff + every Silvery Barbs generates extra attacks for the party</Li>
        <Li>Armored concentration: Resilient CON + high CON + Dodge = nearly guaranteed saves</Li>
        <Li>Versatility: access to both Cleric and Sorcerer spell lists</Li>
        <Li>High AC for a caster: 19-21 with Heavy Armor + Shield</Li>
        <Li>Counter-magic: Counterspell and Silvery Barbs to protect the group</Li>
      </Ul>

      <H3>Where the build struggles</H3>
      <Ul>
        <Li>Limited spells known: Sorcerer has few spell picks, choose carefully</Li>
        <Li>Concentration-dependent: losing Bless or Spirit Guardians hurts</Li>
        <Li>Low direct damage: your damage comes from allies, not from you</Li>
        <Li>Slow start: levels 1-4 before Metamagic and 3rd-level spells feel weak</Li>
        <Li>Silvery Barbs cost: 1st level slot each use, burns resources fast in long combats</Li>
      </Ul>

      {/* ═══ META COMPARISON — SHARED ═══ */}
      <H2>How it stacks up against the meta</H2>

      <P>
        In the optimization community (RPGBot, TabletopBuilds, Treantmonk,
        r/3d6), the Order Cleric 1 / Divine Soul Sorcerer is consistently
        rated as{" "}
        <strong>one of the most efficient support builds in 5e</strong>. Divine
        Soul Sorcerer alone is rated S-tier among Sorcerer subclasses, and the
        Order Cleric dip is widely recognized as one of the best 1-level
        multiclass options in the game.
      </P>
      <P>
        Compared to other popular support builds: <strong>Twilight Cleric</strong>{" "}
        and <strong>Peace Cleric</strong> are frequently cited as stronger in raw
        terms (Twilight{"'"}s temporary HP aura and Peace{"'"}s Emboldening
        Bond are considered {"\u201C"}broken{"\u201D"}). However, Order/DSS has a
        unique advantage: it{" "}
        <strong>multiplies the entire party{"'"}s action economy</strong>{" "}
        rather than just adding a bonus. When your Fighter and Paladin gain
        extra reaction attacks every turn you buff, the indirect DPR
        contribution can surpass a blaster caster{"'"}s output.
      </P>
      <P>
        Capa{"'"}s build chose Quickened and Extended as metamagic instead of
        the more popular Twinned Spell. This trades the ability to buff two
        targets simultaneously for the flexibility of two actions per turn and
        extending buffs like Aid to 16 hours, a choice that prioritizes
        preparation and versatility over raw output.
      </P>

      {/* ═══ GROWTH — SHARED ═══ */}
      <H2>After level 10: where to grow</H2>

      <Ul>
        <Li>
          <strong>Level 11 (Sorc 10):</strong> Another Metamagic: Twinned
          Spell is the obvious pick, finally adding the ability to buff two
          allies simultaneously.
        </Li>
        <Li>
          <strong>Level 12 (Sorc 11):</strong> 6th-level spells: Mass
          Suggestion for out-of-combat control, or Heal for emergency massive
          healing.
        </Li>
        <Li>
          <strong>Level 13 (Sorc 12):</strong> ASI: +2 CHA (reaching 20) or a
          feat like Alert for high initiative.
        </Li>
        <Li>
          <strong>Desired items:</strong> Staff of Power (Very Rare) for more AC
          and spells, or a Dragon Touched Focus (Legendary) to empower Sorcerer
          spells.
        </Li>
      </Ul>

      {/* ═══ STORY — SHARED ═══ */}
      <H2>The story behind the sheet</H2>

      {/* Character Portrait */}
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
        A half-elf of drow lineage who walks between two worlds: faith and
        innate power. Capa Barsavi was born in a great coastal city, far from
        the eyes of nobility. The illegitimate son of{" "}
        <strong>Auri Raelistor</strong>, a respected cleric and noble devoted to
        a god of justice, and <strong>Lyna</strong>, a half-elf drow adventurer
        who vanished shortly after his birth. {"\u201C"}Capa{"\u201D"} comes from a
        tradition of naming illegitimate children with terms evoking protection;{" "}
        {"\u201C"}Barsavi{"\u201D"} honors a legendary figure known as {"\u201C"}The
        Wise Guardian.{"\u201D"}
      </P>
      <P>
        Though illegitimate, Capa was never abandoned. His father ensured he had
        access to the finest institutions: clerical schools, philosophy
        academies, legendary fortress-libraries, and religious centers across
        the continent. During those years he developed skills in rhetoric,
        diplomacy, theology, and divine magic, and met an influential
        duchess, after impressing her with a speech on the ethics of peace in
        times of war.
      </P>
      <P>
        Everything changed when his father departed on an expedition to distant
        seas and never returned. No body. No clues. No answers. If the god he
        served stood for justice and order, why allow such silence? This
        questioning didn{"'"}t destroy his faith, it transformed it into
        something more pragmatic: he believes in justice and order, but no
        longer depends on them blindly.
      </P>
      <P>
        Then powers that came from neither study nor prayer began to manifest. A
        sage in an ancient fortress-library revealed the truth: his mother, Lyna,
        carried a bloodline descended from a celestial being touched by a goddess
        of magic. That blood awakened within Capa, making him the bearer of two
        sources of power: the discipline of clerical faith and the innate
        force of his divine heritage.
      </P>
      <P>
        After accepting the duchess{"'"}s invitation to a diplomatic meeting,
        Capa began the journey that would lead him into the mists of a cursed
        land ruled by an ancient vampire. In just{" "}
        <strong>19 days</strong>, he faced supernatural horrors, watched
        villages burn, stood face to face with the lord of the mists, and
        died <strong>twice</strong>. And came back twice.
      </P>
      <P>
        With his companions Amum Titus, Skid, Socrates, Auditore, and
        Lauren Nailo, Capa became the link that held the group together.
        Combat strategist, healer, voice of command in critical moments,
        defender of the vulnerable. He never sought the spotlight. But when
        everything started to crumble, everyone looked to him.
      </P>
      <P>
        In the end, Capa Barsavi died for his party. The gear stopped so the
        machine could survive. A foundation that kept its promise.
      </P>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 my-6 text-center">
        <p className="text-xs text-muted-foreground/70">
          Build created and played by <strong className="text-foreground/80">Dani</strong> · by Pocket DM
        </p>
      </div>

      {/* CTA Build */}
      <div className="rounded-lg border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 my-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gold/[0.05] rounded-full blur-[60px]" />
        <div className="relative">
          <p className="font-display text-lg text-gold mb-1">Like this build?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Build the perfect encounter to test it. Use Pocket DM for free.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200"
            >
              Try Free →
            </Link>
            <Link
              href="/auth/login"
              className="border border-white/10 text-foreground/80 font-medium px-5 py-2.5 rounded-lg text-sm hover:border-white/20 hover:text-foreground transition-all duration-200"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </BuildVariantProvider>
  );
}
