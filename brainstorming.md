# Building a D&D 5e RPG SaaS: comprehensive market and product research

**The D&D digital tools market is a $2+ billion opportunity with clear gaps in DM tooling, in-person/hybrid play support, and AI-enhanced features that a well-positioned new entrant can exploit.** D&D Beyond dominates character management with 19M+ registered users but has chronically underserved DMs; Roll20 leads in VTT usage with 15M+ users but suffers from aging infrastructure and UX debt; and Foundry VTT captures power users with its $50 one-time model but demands technical sophistication. The most promising white space sits at the intersection of DM-first design, mobile-optimized hybrid play, and AI-powered session intelligence — three areas where every incumbent is either absent or rebuilding from scratch. Below is the complete research across all eight areas you requested.

---

## 1. Competitive landscape: 15+ platforms analyzed

### Tier 1: Major platforms

**D&D Beyond** is the official WotC-owned digital toolset with **19 million registered users** and the strongest character builder on the market. Pricing runs Free / Hero ($2.99/mo) / Master ($5.99/mo), with digital sourcebooks purchased separately at $14.99–$29.99 each. Content sharing via Master Tier (1 subscriber shares with 60 people across 5 campaigns) creates powerful group lock-in. Available on web, iOS, and Android. Key weaknesses: DM tools neglected for years (encounter builder still in beta after multiple years), the 2024 rules rollout broke trust by overwriting purchased 2014 content, the ambitious Sigil 3D VTT was launched and sunset within seven months, and the platform is undergoing a complete rebuild scheduled for 2026 — confirming significant technical debt. **Digital revenue now accounts for over 50% of D&D's profits**, per Hasbro's CEO.

**Roll20** is the most-used VTT with **15M+ registered users** and 1.5M monthly actives. Pricing: Free / Plus ($5.99/mo) / Pro ($10.99/mo) / Elite ($150/yr). Browser-based with no installation required, supporting 1,200+ game systems. Acquired Demiplane in June 2024 to build multi-system character tools. Strengths: zero-install barrier, built-in voice/video, best LFG system. Weaknesses: performance issues on complex maps, **aging interface widely described as "running D&D inside a spreadsheet with pictures,"** paywalled dynamic lighting, data breaches in both 2018 and 2024. Community perception is that Roll20 has been "neglecting their platform" while competitors innovate.

**Foundry VTT** charges a **one-time $50 purchase** (players connect free via browser), with the GM self-hosting on their machine or a third-party service ($3.50–$13.50/mo). Now at Version 13, it holds an estimated **18% of the paid VTT market**. Strengths: most powerful feature set with advanced lighting/animations, massive community module ecosystem (thousands of free modules), full data ownership, and a 2024 official WotC content partnership. Weaknesses: steep learning curve, self-hosting complexity, module dependency (updates can break functionality), and a still-limited official D&D content catalog compared to competitors.

**Fantasy Grounds** made a seismic move in **November 2025 by going completely free-to-play**, removing all upfront license costs after 20+ years as a paid product. Its **best-in-class combat automation** auto-resolves attacks, damage, saves, and conditions. It has the **largest licensed content catalog** (4,000+ products) but suffers from a universally criticized UI described as "a beast to learn." Desktop-only (Windows/Mac/Linux via Steam). The hiring of Adam Bradford (D&D Beyond co-founder) as CDO signals serious modernization intent.

**Alchemy RPG** differentiates through cinematic immersion — animated scenes, ambient soundscapes, and theater-of-the-mind focus rather than tactical maps. Pricing: Free (3 characters/games) or Unlimited ($8/mo). Built-in streamer mode is best-in-class. Weakness: limited tactical combat, small user base (~8K Discord members), SRD-only D&D content.

**TaleSpire** offers stunning **3D terrain building** on Steam ($24.99) with a Guest Edition (free with purchased "seats" at $12.50 each). It's purely visual — no character sheets, no rules automation, no combat tracking. Windows/Steam only. Beautiful but expensive for full groups and missing core RPG tool functionality.

### Tier 2: Niche and companion tools

| Tool | Type | Price | Key Strength |
|------|------|-------|-------------|
| **Owlbear Rodeo** | Lightweight VTT | Free / $3.99–$7.99/mo | Zero friction — "drop map, add tokens, play" |
| **Improved Initiative** | Combat tracker | Free (open source) | Gold standard free initiative tracker, 4.7/5 rating |
| **Shieldmaiden** | Combat tracker | Free / $1.99+/mo Patreon | Most advanced combat tracker available; hidden gem |
| **Kobold+ Fight Club** | Encounter builder | Free | Most popular encounter builder, beloved by DMs |
| **Avrae** | Discord bot | Free (WotC-maintained) | Best Discord D&D integration, D&D Beyond sync |
| **Fight Club 5e** | Character sheet app | $2.99 one-time | Cleanest mobile character sheet; 380K+ downloads |
| **Game Master 5e** | DM encounter app | Free + IAP | Excellent mobile encounter/combat management |
| **Shard Tabletop** | Full VTT | Free / $2.99–$9.99/mo | Deep rules automation, Kobold Press partnership |
| **5e.tools** | Reference site | Free (open source) | Most comprehensive D&D 5e reference, millions of visits |
| **DnD5e.info** | SRD reference | Free | Clean, mobile-friendly SRD presentation |

**Notable additional tools**: Notion/Obsidian D&D templates (increasingly popular for campaign management), World Anvil ($7+/mo for worldbuilding), LegendKeeper (campaign wiki), Above VTT (Chrome extension turning D&D Beyond into a VTT), and emerging 2024–2025 entrants like Quest Portal, DiceRight, Realm VTT, and FreeVTT.

---

## 2. What the community actually wants

Research across r/DnD, r/dndnext, r/DMAcademy, r/rpg, D&D Beyond forums, and EN World reveals clear demand patterns.

### The five most requested features

**First, an improved encounter builder and combat tracker.** This is the single most requested feature across all communities. D&D Beyond's encounter builder has been in beta for years with minimal improvement. Users want difficulty calculation for both 2014 and 2024 rules, the ability to tweak individual monsters without homebrewing entire copies, condition tracking, lair actions, and live initiative sharing with players.

**Second, an all-in-one DM dashboard.** DMs overwhelmingly want a single screen that consolidates monster stat blocks, player stats, initiative order, conditions, and rules reference. One D&D Beyond user described the dream: *"Open this hypothetical DM dashboard and run an entire session without having to switch to any other tabs or applications."* Most DMs currently juggle **3–5 tools simultaneously** during sessions.

**Third, a seamless integrated tool ecosystem.** The most common complaint is bouncing between disconnected tools — encounter builder, character sheets, maps, dice, and rules reference all exist as separate applications. Users want character sheet data flowing into the combat tracker, which flows into the map, with in-context rules lookups.

**Fourth, better mobile and tablet support.** Roll20's companion app hasn't been updated since 2022. D&D Beyond's mobile app is described as "clunky." DMs using tablets at physical tables — a very common use case — find web tools poorly suited to touch inputs. Mobile encounter builder requests on D&D Beyond went unanswered for **2.5+ years**.

**Fifth, AI-assisted session tools.** 27% of TTRPG players surveyed want AI-enhanced NPCs. DMs are already using ChatGPT extensively for NPC generation, plot brainstorming, and worldbuilding. D&D Beyond is building a basic "Rules Assistant" but no major platform has deeply integrated AI yet.

### Biggest pain points by platform

D&D Beyond's top complaints: double-purchasing content (physical books don't unlock digital), removal of à la carte purchases forcing full book buys, the "living document" problem where purchased content gets silently changed, and DM tool neglect. Roll20's top complaints: performance and lag, outdated interface, useful features paywalled behind $110+/year, and trust issues from historical controversies. Foundry VTT's top complaints: learning curve, self-hosting complexity, and "module dependency hell" where updates break workflows.

### What would make users switch tools

Research from VTT switching discussions reveals: **one-time purchase pricing** (the #1 cited reason for switching to Foundry), dramatically less prep time, true all-in-one integration, data ownership/self-hosting, cross-platform content portability, and simplicity. A growing movement favors lightweight tools — Owlbear Rodeo and Discord + Google Docs — over feature-bloated VTTs.

### The underserved niches

**In-person and hybrid play support** is the largest gap. Most tools assume fully online play, yet roughly half of all D&D is played in person. There is no good mobile-first DM combat tracker optimized for tablets at a physical table. **Comprehensive standalone combat management** (not tied to a VTT) is another gap — most trackers are either too basic or married to a specific VTT. **Session scheduling** is the #1 practical obstacle to D&D campaigns, yet no RPG tool natively solves it. **Campaign note management** remains fragmented across generic tools (Notion, Obsidian) because TTRPG-specific options are either too rigid, clunky, or abandoned. **Theater-of-the-mind support** is growing as a counter-movement to VTT complexity.

---

## 3. Core feature categories: what to build and how

### Dice rolling
Standard implementations cover d4–d20+d100, advantage/disadvantage (roll 2d20 keep highest/lowest), stat rolling methods (4d6 drop lowest, point buy calculator, standard array), and custom formulas. The community values **speed** above all — one-click rolls with automatic modifier calculation from character data. 3D dice animations are popular (Foundry's "Dice So Nice!" is one of the most-installed modules) but must be optional and fast (1–1.5 second animation max). A dice history log visible to all players builds trust and enables post-session review. Haptic feedback on mobile enhances the tactile satisfaction. Critical hit/fail special effects create memorable moments.

### Character sheet management
Digital character sheets are the **most-used feature** across all platforms and the primary gateway for user acquisition. Must-have elements: auto-calculating ability scores/modifiers/proficiency bonus, HP tracking with temp HP, spell slot management with automatic deduction on cast, resource tracking (Ki points, sorcery points, rage charges, Bardic Inspiration, etc.), equipment/inventory with weight tracking, and spell preparation. Level-up automation that walks through choices (ASI vs feat, new spells, HP increase) is a major differentiator. The information hierarchy should follow: **primary layer** (always visible: HP, AC, key modifiers, initiative), **secondary layer** (one tap away: spell list, inventory, features), **tertiary layer** (deep navigation: full descriptions, backstory, notes). Multi-class support that actually works is frequently broken across platforms.

### Combat and initiative tracker
Initiative rolling with automatic sorting, HP tracking for all combatants (party + enemies), condition tracking with visual indicators and rule descriptions (stunned, prone, concentrating, etc.), death saving throw tracker, turn timer, and temporary HP are all expected. **Shieldmaiden** is considered the most advanced combat tracker available, yet suffers from low awareness — study its feature set closely. Key innovations to implement: multi-target actions (e.g., Fireball: select affected creatures, apply damage with option to halve for saves), lair action/legendary action tracking on specific initiative counts, concentration checks triggered automatically when a concentrating creature takes damage, and a player-facing initiative display for in-person play (second screen/TV output).

### Summoning and conjure tools
This is a genuine pain point highlighted in your brief and echoed by community Druids and caster players. Conjure Animals, Conjure Woodland Beings, and similar spells create **multiple creatures with individual attack rolls**, massively slowing combat. A dedicated tool should: provide quick-reference stat blocks for all summonable SRD creatures filtered by spell and CR, automate batch attack rolls (e.g., "8 wolves attack — roll all 8 at once, show hits/misses against target AC"), track summoned creature HP individually, and handle the 2024 rule changes that standardized summoning spells to use a single stat block with scaling.

### Monster and creature reference
A searchable database of SRD monster stat blocks (325+ monsters) filterable by CR, type, size, environment, and source. Special emphasis on **Wild Shape forms** for Druids (beasts filterable by CR ≤ character level thresholds). An encounter builder implementing both the 2014 XP threshold system and the 2024 revised encounter building guidelines. Monster HP tracking (individual creature HP bars). Kobold+ Fight Club's encounter builder is the gold standard here — study its filter UX and difficulty calculation. The SRD 5.2 includes updated monster stat blocks from the 2025 Monster Manual.

### Spell reference and management
A fully searchable spell database covering all **~400 SRD spells** with filtering by class, level, school, casting time, components, concentration, and ritual tag. Spell cards (compact, printable/displayable format). Concentration tracking with automatic reminders when a concentrating caster takes damage or casts another concentration spell. Spell save DC calculator (8 + proficiency + spellcasting modifier). Spell slot management integrated with the character sheet. The 2024 rules changed approximately 30 spells and added new ones — support both 2014 and 2024 versions.

### Campaign management (DM tools)
Session notes with DM-only and player-visible sections, NPC tracker (name, description, location, relationships, disposition), location tracker with hierarchy (world → region → city → building), loot/treasure generators (by CR and hoard type per DMG tables), random encounter tables (customizable by environment), and worldbuilding tools (timelines, faction trackers, maps). This is the **most underserved category** — D&D Beyond's own 2026 roadmap admits they are "finally" prioritizing DM tools after years of neglect.

### Party and group features
Shared initiative board (real-time sync between DM and all players), party inventory (shared loot tracking), shared maps with fog of war, and real-time collaboration with presence indicators (who's online, who's viewing what). The DM-to-player content asymmetry is critical: DMs see everything, players see only what's been revealed.

### Utility tools
Short rest automation (spend Hit Dice to recover HP, reset short-rest abilities), long rest automation (reset HP, spell slots, and relevant features), condition reference cards with full rules text, quick-reference for complex rules (grappling, cover, opportunity attacks, two-weapon fighting), name generators (by race/culture), and loot generators (random treasure by CR).

---

## 4. Feature prioritization: what to build first and why

### The Kano model applied to RPG tools

**Basic features** (expected; absence causes dissatisfaction): dice roller, character stats display, save/load functionality, rules/spell reference, mobile-responsive design. **Performance features** (more = more satisfaction): character builder depth, encounter builder accuracy, map quality, search speed, content breadth. **Delighters** (unexpected, create excitement): AI session recaps, smart encounter suggestions, one-click session setup, ambient soundscapes, automatic condition tracking.

### Features mapped to business metrics

**User acquisition drivers**: Character builder (the #1 gateway feature — D&D Beyond's character builder draws most free users), a genuinely useful free tier (Roll20's free tier attracted millions), zero-friction start (Owlbear's no-login approach maximized tryouts), and mobile accessibility.

**Retention drivers**: Campaign data lock-in (characters, notes, maps stored on platform), content library investment creating switching costs, habitual session-day usage (weekly game nights build habits), DM prep tools (DMs return between sessions to prepare), and session history/campaign journals.

**Monetization drivers**: Official/premium content (rulebooks, adventures), DM-specific premium features (advanced fog of war, increased storage, encounter automation), content sharing ("one person subscribes, whole group benefits" — D&D Beyond's most powerful monetization lever), cosmetics (custom dice, avatars, tokens), and marketplace commissions on creator content.

**Virality drivers**: Content sharing (DM subscribes → 4–6 players join free), session invite links, the inherent "DM pulls players" dynamic (1 DM adoption = 4–6 player adoptions), LFG features, and streamer-friendly tools that create public visibility.

### Recommended phased roadmap

**Phase 1 — MVP "The DM's Companion" (months 1–3)**: Initiative/combat tracker with full condition support, encounter builder with CR calculator, quick monster stat block reference (SRD content), session notes with selective DM/player visibility, basic dice roller. Platform: mobile-first responsive web app. Target: in-person DMs using tablets. Differentiator: designed for the table, zero-friction setup, modern UX.

**Phase 2 — "The Smart Table" (months 4–6)**: Add player-facing character sheets (SRD 5.2 classes/races), spell reference database, spell slot and resource tracking, party overview dashboard for DMs, scheduling integration (solve the #1 practical barrier to play), and AI session transcription/summarization. Viral hook: session recaps that DMs share with players, driving player account creation.

**Phase 3 — "The Platform" (months 7–12)**: Full character builder with level-up automation, integrated maps (build or partner), homebrew content creation tools, community marketplace, advanced AI features (NPC generation, encounter suggestions, rules lookup via natural language), and multi-system support expansion.

### The strategic gap to exploit

**DM tools are chronically underserved** by the market leader — confirmed by years of community complaints and D&D Beyond's own 2026 admission that they're rebuilding. **AI is a generational shift** that no major RPG tool has deeply integrated. **In-person/hybrid play is growing** but purpose-built tools are virtually nonexistent. **DMs are the revenue driver** — they choose tools, bring 4–6 players per table, and pay most willingly. A DM-first, AI-enhanced, hybrid-play companion occupies white space that every incumbent has either neglected or is scrambling to address from a legacy position.

---

## 5. Monetization: what works and at what price

### Competitive pricing landscape

| Platform | Model | Entry Tier | Pro/GM Tier | Content |
|----------|-------|-----------|-------------|---------|
| D&D Beyond | Subscription + marketplace | $2.99/mo (Hero) | $5.99/mo (Master) | Books $14.99–$29.99 |
| Roll20 | Subscription + marketplace | $5.99/mo (Plus) | $10.99/mo (Pro) | Modules $4.99–$49.99 |
| Foundry VTT | One-time purchase | $50 (everything) | N/A | Publisher modules vary |
| Fantasy Grounds | Free (Nov 2025) + content | Free | Free | DLC $15–$50 each |
| Owlbear Rodeo | Freemium (storage-gated) | $3.99/mo | $7.99/mo | N/A |
| Shard | Subscription | $2.99/mo | $9.99/mo | Marketplace |
| Alchemy RPG | Subscription | $8/mo | N/A | Marketplace |

### What features are typically free vs. paid

Free tiers universally include: basic dice rolling, limited character creation (2–6 characters), SRD content access, joining others' games, and basic reference tools. Commonly paywalled: **storage space** (the most frequent paywall), content sharing with groups, dynamic lighting/fog of war, unlimited characters/campaigns, API/scripting access, ad removal, early access to new content, and publishing/marketplace tools.

### Pricing sweet spots

The **entry paid tier sweet spot is $3–6/month** ($30–60/year). D&D Beyond Hero at $2.99/mo, Roll20 Plus at $5.99/mo, and Owlbear Fledgling at $3.99/mo all fall here. The **power user/GM tier sits at $6–11/month** ($55–110/year). Annual pricing at a ~20% discount reduces churn. **Freemium conversion rates** in gaming SaaS run **3–5%** (industry data), meaning you need a large free user base for subscription revenue to work. Most conversions happen within the first 30 days.

### The hybrid model wins

The most successful monetization combines **subscription + marketplace**. D&D Beyond and Roll20 both generate subscription revenue from tools/features while separately selling content. This creates two revenue streams and stronger lock-in. For a new entrant, the recommended structure:

- **Free tier**: Full core functionality, 2–3 characters, 1 campaign, all SRD content
- **Player tier ($2.99–3.99/mo)**: Unlimited characters, ad-free, cosmetic perks, cloud sync
- **GM tier ($5.99–7.99/mo)**: Content sharing, advanced encounter tools, AI features, increased storage, campaign management
- **Pro/Publisher tier ($9.99–14.99/mo)**: API access, content publishing, advanced automation, white-label tools
- **Marketplace**: 70/30 or 80/20 split with creators for homebrew content

### Critical monetization insight

**Content sharing is the most powerful monetization lever in this space.** When one DM subscribes to share content with their group, that single subscription decision brings 4–6 players onto the platform. D&D Beyond's Master Tier exists primarily for this feature. Build content sharing into the GM tier from day one.

### Warning: subscription fatigue is real

Users actively resist "yet another subscription." Foundry VTT's one-time $50 model generates intense loyalty and word-of-mouth precisely because it contrasts with subscription fatigue. Consider offering both: subscription for ongoing cloud features and a one-time "lifetime" purchase option at a premium (e.g., $150–200) for users who prefer it. Fantasy Grounds' November 2025 shift to free-to-play (monetizing only content) shows the market is moving toward lower software barriers with content-driven revenue.

---

## 6. Technical and legal landscape

### The SRD under Creative Commons is your foundation

After the January 2023 OGL controversy — which saw ~40,000 D&D Beyond subscription cancellations and mainstream media coverage — WotC irrevocably released **SRD 5.1 under Creative Commons Attribution 4.0 (CC-BY-4.0)**. In April 2025, they released **SRD 5.2** (covering 2024 revised rules) under the same license. Both are permanently, irrevocably free for commercial use with only an attribution requirement.

**SRD 5.1 includes**: 12 classes (1 subclass each), 9 races, ~400 spells, ~325 monsters, 300+ magic items, full core rules, combat, conditions, spellcasting, and multiclassing. **SRD 5.2 adds**: updated 2024 rules, weapon mastery system, expanded feats, revised species, and 2025 Monster Manual stat blocks.

**What's excluded** (requires WotC licensing): Beholders, Mind Flayers, Displacer Beasts, most subclasses beyond the one per class in the SRD, most backgrounds beyond Acolyte, most feats, all campaign settings (Forgotten Realms, Eberron, etc.), named characters (Strahd, Drizzt), non-SRD spells, and all official artwork.

**Practical implications**: You can build and sell a commercial app using all SRD content with zero licensing fees — just include the required attribution statement. You can say "compatible with fifth edition" or "5E compatible" but **cannot** use "Dungeons & Dragons," "D&D," or their logos. You cannot use or reference Product Identity monsters or settings without a separate WotC license.

### Available APIs and data sources

**5e-srd-api** (dnd5eapi.co): REST + GraphQL API under MIT license covering all SRD data — monsters with full stat blocks, spells with damage/save data, classes, races, equipment, magic items. Self-hostable via Docker. Python SDK available. Planning a `/api/2024/` endpoint for SRD 5.2.

**Open5e** (api.open5e.com): Django REST API that includes SRD content **plus** third-party OGL content (Kobold Press Tome of Beasts, Creature Codex, etc.). Filterable by source, CR, type, level, school. Broader content than the 5e-srd-api.

**Static data**: The 5e-database GitHub repo provides MongoDB-ready JSON files for all SRD data. Tabyltop's CC-SRD repo offers Markdown and JSON conversions. Both SRD PDFs are freely downloadable.

### Recommended technical stack

For a modern D&D companion SaaS, the research across major VTT architectures suggests:

- **Frontend**: React/Next.js or Vue/Nuxt for web; responsive design covering phone, tablet, desktop breakpoints
- **Real-time sync**: WebSockets via Socket.IO for game state, dice rolls, initiative tracking; or Firebase/Supabase for managed real-time with built-in offline support
- **Maps** (if building): PixiJS (WebGL 2D renderer, used by Foundry VTT) for interactive battle maps; Leaflet for world/exploration maps with zoom
- **Dice**: Client-side crypto.getRandomValues() with optional 3D animation via dice-box (Three.js); server-side verification for online play integrity
- **Data storage**: Supabase (PostgreSQL with real-time subscriptions) or Firebase Firestore for character/campaign data; cache SRD reference data locally for offline access
- **Character data model**: JSON documents with core fields (ability scores, class/level arrays for multiclass, HP current/max/temp, spell slots by level, inventory with equipped/attuned flags, conditions array, prepared spells)

### 2024 rules revision impact on development

The 2024 revised rules changed classes substantially (all subclasses at level 3, weapon mastery system, revised spellcasting), restructured backgrounds (now grant ASIs and starting feats), and updated species (decoupled from ability score bonuses). Supporting both 2014 and 2024 rules simultaneously is effectively required — D&D Beyond's attempt to force 2024 updates onto 2014 content caused massive backlash. **Build your data model to support versioned rules from day one.**

---

## 7. Market trends favor a new entrant

### The market is large and growing fast

The TTRPG market is valued at approximately **$2.15 billion in 2025**, projected to reach **$6.6 billion by 2035** at an **11.84% CAGR**. D&D dominates with 50M+ cumulative players and WotC's segment generating **$2.2 billion in 2025 revenue** (up 45% YoY) at a **46% operating margin**. The 2024 Player's Handbook sold **50% above expectations**, confirming sustained demand.

### Digital adoption permanently shifted post-COVID

Roll20 saw a **300% increase in game sessions** during COVID and its user base doubled from 5M to 10M. Critically, **usage has sustained and grown post-pandemic**: VTT adoption rose from 29% in 2020 to **48%+ in 2024**. The industry settled into a permanent hybrid model — **60% of players switch between physical and online play**. D&D Beyond's direct-to-consumer revenue now represents **60% of all D&D revenue**, up from 0% before the 2022 acquisition.

### Three catalysts expanding the player base

**Baldur's Gate 3** (10M+ copies sold, 875K peak concurrent players) created an unprecedented funnel from video games to tabletop — veteran groups report former digital-only players joining, citing BG3 as their entry point. **Actual play shows** drive over 50% of new player acquisitions per WotC, with Critical Role, Dimension 20, and others generating 200M+ streaming hours annually. The **#ttrpg tag on TikTok has 4.5+ billion views**, creating awareness among younger demographics — 36% of players are now 24 or younger.

### AI integration is the next frontier

**34% of VTT campaigns** already incorporate AI-powered elements. DMs widely use ChatGPT and Claude for NPC dialogue, encounter brainstorming, and worldbuilding. AI map generators (Dungeon Alchemist) are gaining rapid adoption. Session transcription and auto-summarization tools are emerging but no major platform has deeply integrated AI. WotC has banned AI art in official products, but community AI usage for prep work is widespread and growing. **This is the single largest technology opportunity for a new entrant.**

### Market fragmentation creates openings

D&D's dominance is softening as players explore alternatives — Pathfinder 2E Remastered reached an estimated 1.5M players within six months. 58% of new TTRPG systems in 2023 came from independent creators. Platform consolidation is occurring (Roll20 + Demiplane + DriveThruRPG; WotC fully owning D&D Beyond), but this creates opportunity: **independent, system-flexible tools that aren't locked to a single corporate ecosystem have growing appeal**, especially post-OGL controversy.

---

## 8. UX and design: what separates successful RPG apps

### Speed-to-play is the ultimate metric

Owlbear Rodeo's success proves that **zero-friction onboarding** can beat feature richness. Roll20's own UX research found that redesigning map placement dropped task completion time from **55.8 seconds to 16 seconds** and success rates jumped from **13% to 94%**. Every click between "opening the app" and "playing the game" costs engagement. Design for the DM who has 5 minutes before the session starts and needs to pull up an encounter, not for the power user with hours of prep time.

### Dark mode is nearly mandatory

D&D sessions typically run 3–4 hours, often in dimly lit rooms. Dark mode is overwhelmingly preferred for gaming apps. Best practice: use **dark gray backgrounds (#1a1a2e) rather than pure black** to avoid halation for users with astigmatism. Desaturate accent colors. Fantasy-themed UI elements (subtle parchment textures, thematic color accents for headers) add personality without impeding readability — but **function always trumps form**. Body text must always be clean, readable sans-serif.

### Design for three breakpoints with different purposes

**Phone** (portrait): character reference tool, quick dice rolls, spell lookups — card-based layouts with tab navigation. **Tablet** (landscape at the table): primary in-person device — two-column layouts approximating desktop, touch-friendly dice rolling with 44px+ tap targets. **Desktop** (full VTT experience): side-by-side panels (character sheet + map, chat + combat tracker), floating/resizable windows for DMs. D&D Beyond's biggest tablet complaint was showing phone-sized layouts on iPads — **always detect screen size and serve appropriate layouts.**

### Progressive disclosure solves complexity

Tier 1 (immediate): basic character sheet, dice rolling, HP tracking. Tier 2 (after first session): spell management, inventory, leveling up. Tier 3 (experienced): homebrew content, macros, automation. Roll20's UX mistake was exposing all complexity upfront. Owlbear's strength is hiding it entirely. **The ideal is Foundry's approach through a lens of accessibility**: powerful features available through a clean default experience with clear paths to enable advanced functionality.

### Accessibility from day one

**1 in 12 men is colorblind** — significant in the RPG demographic. Never use color alone for status effects; always pair with icons/text labels. Roll20's accessibility is notably poor (a blind user reported the tutorial was impossible to complete with a screen reader). Build with semantic HTML, ARIA labels, full keyboard navigation, and screen reader support. Minimum **16px body text** on mobile. Provide visible focus indicators, especially in dark mode.

### Real-time collaboration patterns

Shared initiative boards should be always visible during combat as a persistent sidebar with the current turn prominently highlighted. DM-facing and player-facing views must show appropriate information asymmetry. Borrow from Figma: show presence indicators (who's online), use optimistic UI updates (show changes immediately, sync in background), and implement autosave with version history for psychological safety. Owlbear Rodeo's laser pointer feature — letting users circle map areas in real-time — is praised as intuitive and worth emulating.

---

## Conclusion: the strategic opportunity

The D&D digital tools market has three structural weaknesses that a new entrant can exploit simultaneously. **First, every major platform neglects DMs** — the users who choose tools, bring groups, and spend the most. D&D Beyond is only now (2026) beginning to prioritize DM tools after years of community frustration. **Second, in-person and hybrid play is the majority use case but has almost no purpose-built tooling** — everything on the market was designed for online-first and is being awkwardly retrofitted for tables. **Third, AI represents a genuine technological moat** — no incumbent has deeply integrated it, yet DMs are already using LLMs extensively for prep.

The winning formula for a new entrant is not "another VTT." The market doesn't need another map-and-tokens platform competing with Roll20, Foundry, and Owlbear. Instead, **build the DM's brain**: a mobile-first companion that handles combat tracking, encounter building, session management, and spell/monster reference with modern UX — then layer on AI session intelligence (transcription, recaps, NPC generation) as the differentiator no incumbent can quickly replicate. Start with the SRD 5.2 content (free under CC-BY-4.0), price at freemium with a $3–6/mo entry tier, and leverage the DM-pulls-players viral dynamic to grow. The market is $2+ billion, growing at 12% annually, and the incumbent platforms are either rebuilding from scratch or carrying a decade of technical debt. The window is open.