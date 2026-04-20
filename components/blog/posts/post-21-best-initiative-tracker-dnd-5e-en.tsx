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

export default function BlogPost21() {
  return (
    <>
      <P>
        You know the drill. Combat starts, you ask everyone to roll initiative,
        and then you spend the next five minutes scribbling numbers on a napkin,
        squinting at your own handwriting, and asking &ldquo;wait, what did you
        get?&rdquo; for the third time. By the time you finally sort out the turn
        order, that dramatic ambush you spent an hour prepping feels about as
        tense as a trip to the DMV. The problem isn&rsquo;t initiative as a
        mechanic &mdash; it&rsquo;s the manual process around it. And that is
        exactly what a good initiative tracker fixes.
      </P>

      <H2>What is an initiative tracker?</H2>
      <P>
        An initiative tracker is a tool &mdash; digital or analog &mdash; that
        organizes turn order during combat in a tabletop RPG. In D&amp;D 5e,
        every creature rolls 1d20 plus their Dexterity modifier and the DM sorts
        the results from highest to lowest. Simple in theory. In practice, with
        five players and six monsters, that is eleven numbers to jot down, sort,
        and not mess up.
      </P>
      <P>
        The whole point of an initiative tracker is to eliminate that busywork.
        Instead of scrawling numbers in a notebook, you punch them into a tool
        that auto-sorts the list, advances turns with one tap, and shows everyone
        whose turn it is. It is the difference between five minutes of fumbling
        and thirty seconds of &ldquo;let&rsquo;s go.&rdquo;
      </P>

      <H2>Paper vs Digital: why use a digital initiative tracker</H2>
      <P>
        The classic method works. Notebooks, sticky notes, clothespin trackers
        on the DM screen &mdash; every veteran DM has used some version of it.
        But &ldquo;works&rdquo; and &ldquo;works well&rdquo; are two different
        things. Here is how they compare:
      </P>
      <Ul>
        <Li>
          <strong>Speed</strong>: on paper, initiative setup takes 3 to 5 minutes
          per encounter. Multiply that by three combats in a session and you have
          burned 15 minutes on bookkeeping. A digital initiative tracker handles
          it in seconds.
        </Li>
        <Li>
          <strong>Errors</strong>: writing the wrong number, skipping someone,
          losing track of the order on round four. On paper, every correction
          turns into a table-wide debate. A digital tracker sorts automatically
          and never forgets a combatant.
        </Li>
        <Li>
          <strong>HP and conditions</strong>: on paper, you need a separate
          column for HP and another for conditions. It gets cramped and confusing
          fast. A proper D&amp;D 5e initiative tracker integrates everything in
          one interface.
        </Li>
        <Li>
          <strong>Player visibility</strong>: on paper, only the DM sees the
          turn order. &ldquo;Whose turn is it?&rdquo; is the most-asked question
          at every table. With a digital initiative tracker, everyone sees the
          order on their phone.
        </Li>
      </Ul>

      <Img
        src="/art/blog/initiative-setup.png"
        alt="Pocket DM — initiative tracker with auto-sorted turn order"
      />

      <H2>What a good initiative tracker needs</H2>
      <P>
        Not all trackers are created equal. Before you commit to one, make sure
        it checks these boxes:
      </P>
      <Ul>
        <Li>
          <strong>Auto-sort</strong>: you enter the numbers, it sorts. Ties
          resolved without arguments.
        </Li>
        <Li>
          <strong>HP tracking</strong>: damage and healing applied right in the
          tracker &mdash; no side spreadsheet required.
        </Li>
        <Li>
          <strong>Visible conditions</strong>: poisoned, stunned,
          concentration &mdash; all marked on the token without scribbling notes
          elsewhere.
        </Li>
        <Li>
          <strong>One-click turn advance</strong>: next turn, next round,
          automatic round counter. No losing your place.
        </Li>
        <Li>
          <strong>Mobile player view</strong>: players see the turn order and
          the active turn on their own phones. Zero &ldquo;whose turn is
          it?&rdquo; questions.
        </Li>
        <Li>
          <strong>No account required</strong>: the DM creates the encounter,
          players join via link. Nobody has to sign up just to participate.
        </Li>
      </Ul>
      <P>
        If the initiative tracker you are currently using does not hit at least
        four of those six, you are working with an incomplete tool &mdash; and
        probably drifting back to the notebook because &ldquo;it&rsquo;s
        basically the same.&rdquo;
      </P>

      <H2>How Pocket DM handles it</H2>
      <P>
        <ProdLink href="/try">Pocket DM</ProdLink> was built from the ground up
        as a free initiative tracker for in-person D&amp;D 5e tables. It is not
        a VTT. It is not an online character sheet. It is the thing you open on
        your laptop or tablet when combat starts. Here is how it maps to the
        checklist above:
      </P>
      <Ul>
        <Li>
          <strong>Auto-sort</strong>: players enter their own initiative rolls
          from their phones via QR code. The list sorts itself in real time on
          the DM&rsquo;s screen.
        </Li>
        <Li>
          <strong>Integrated HP</strong>: monsters from the SRD compendium come
          with HP pre-filled. Apply damage directly on the tracker panel &mdash;
          no mental math required.
        </Li>
        <Li>
          <strong>Conditions on the token</strong>: tap a token, mark the
          condition. It shows up for you and for every player connected.
        </Li>
        <Li>
          <strong>One-click turn advance</strong>: hit &ldquo;Next&rdquo; and
          the initiative tracker moves to the next creature. Round count updates
          automatically.
        </Li>
        <Li>
          <strong>Real-time player view</strong>: every player sees the full
          turn order on their phone. The view updates live as combat progresses.
        </Li>
        <Li>
          <strong>Zero sign-up</strong>: the DM launches a combat in ten seconds
          without creating an account. Players join by scanning the QR code.
        </Li>
      </Ul>

      <Img
        src="/art/blog/initiative-tracker-final.png"
        alt="Pocket DM — active initiative tracker with HP, conditions, and turn order in real time"
      />

      <H2>Pocket DM vs other initiative trackers</H2>
      <P>
        There are options out there. We tested the most popular ones &mdash;
        Improved Initiative, Donjon, DM Tools, Shieldmaiden, and the major
        VTTs &mdash; and most of them were built for a different use case:
      </P>
      <Ul>
        <Li>
          <strong>Paper / clothespin trackers</strong>: they work, but they are
          slow, error-prone, and invisible to players. The oldest initiative
          tracker in the world &mdash; and the most limited.
        </Li>
        <Li>
          <strong>Improved Initiative / Donjon</strong>: solid free options that
          run in the browser, but no mobile player view. The DM sees the order,
          the players do not. Neither includes a bestiary with integrated stat
          blocks.
        </Li>
        <Li>
          <strong>Roll20 / Foundry VTT</strong>: excellent for online play. But
          for an in-person table, nobody wants to fire up an entire VTT just to
          track initiative. It is killing a fly with a bazooka.
        </Li>
        <Li>
          <strong>D&amp;D Beyond</strong>: it has an initiative tracker, but it
          requires everyone to have an account ($6/month for the Master Tier) and
          their character sheets on the platform. For a session with a new
          player, that is a non-starter.
        </Li>
        <Li>
          <strong>Pocket DM</strong>: free, no account needed, mobile-first,
          built for in-person play. Open it in your browser, create the
          encounter, share the link. Over 1,100 SRD monsters with integrated stat
          blocks. It is the best initiative tracker for DMs who play at a
          physical table.
        </Li>
      </Ul>

      <Img
        src="/art/blog/initiative-tracker-active.png"
        alt="D&D 5e conditions in the initiative tracker — poisoned and stunned marked on Goblin tokens"
      />

      <H2>Get started in 60 seconds</H2>
      <P>
        Three steps. No installs, no sign-ups:
      </P>
      <Ul>
        <Li>
          <strong>1. Add your monsters</strong>: open{" "}
          <ProdLink href="/try">Pocket DM</ProdLink>, search the compendium or
          add them manually. HP and AC are pre-filled from the SRD.
        </Li>
        <Li>
          <strong>2. Roll initiative</strong>: each player scans the QR code and
          enters their own roll from their phone. The turn order appears
          automatically on the DM&rsquo;s screen.
        </Li>
        <Li>
          <strong>3. Start combat</strong>: hit &ldquo;Start Combat.&rdquo; The
          initiative tracker advances turn by turn. Apply damage, mark
          conditions, advance rounds &mdash; all in one place.
        </Li>
      </Ul>
      <P>
        Sixty seconds from &ldquo;roll initiative&rdquo; to the first attack.
        That is how a free initiative tracker should work.
      </P>

      <Tip
        linkHref="/blog/iniciativa-dnd-5e-regras-variantes"
        linkText="Read the complete guide to initiative rules and variants"
      >
        Want to understand the official initiative rules, variants like Popcorn
        Initiative and Side Initiative, and when to use each one? Check out
        our{" "}
        <IntLink slug="iniciativa-dnd-5e-regras-variantes">
          complete guide to initiative rules and variants
        </IntLink>.
      </Tip>

      <EbookCTA variant="banner" />

      <P>
        For more combat tips, read our{" "}
        <IntLink slug="como-agilizar-combate-dnd-5e">
          10 tips to speed up D&amp;D 5e combat
        </IntLink>{" "}
        and the{" "}
        <IntLink slug="como-usar-combat-tracker-dnd-5e">
          complete combat tracker tutorial
        </IntLink>.
      </P>
    </>
  );
}
