Ragnarok Aesthetic Upgrades Plan
This plan details how to incorporate classic Ragnarok Online visual elements into the ro-modern theme to enhance nostalgia while maintaining a premium look.

Proposed Changes
1. Custom Mouse Cursor
We will implement the classic Ragnarok cursors (the default gauntlet and the pointer glove) across the entire website, inspired by projetoyufa.com.

Files to Modify:
ro-modern/css/theme.css
: Add global cursor rules for body, html and specific rules for a, button, .interactive elements.
Assets Needed:
We will need to locate or provide the .cur or 
.png
 cursor files (e.g., cursor.cur and pointer.cur). If not present in the old site, we can use standard web-safe links or Base64 embed them.
2. Monster Sprites in Navigation Menu
We will add the pixel-art monster heads from the old ADVENTURE RO site next to the navigation links in the header.

Assets to Use:
img/icon-menu/ico1.png
 to 
ico6.png
 from the old site directory.
We will copy these assets to ro-modern/images/icons/ for cleaner organization.
Files to Modify:
ro-modern/header.php
: Inject the <img> tags inside the <a> links of the .nav-links list.
ro-modern/css/theme.css
: Add styling to properly align the pixel-art icons vertically with the text, perhaps with a slight hover bounce animation.
3. Magical Glow Effects
We will add a subtle, elegant outer glow (cyan or gold, depending on context) to cards and buttons.

Files to Modify:
ro-modern/css/theme.css
:
Update .btn-gold and .btn-outline hover states to include a box-shadow glow.
Update .feature-card:hover or .donation-card:hover to include a magical aura effect.
4. Large Character Renders (Atmosphere)
To break the rigid boxy layout, we will add large, high-quality Ragnarok character artwork "peeking" from behind sections or the footer.

Assets to Use:
Explore characters like 
slide_1_img.png
 (Assassin Cross) or 
slide_2_img.png
 from the old site.
Copy selected artwork to ro-modern/images/renders/.
Files to Modify:
ro-modern/footer.php
 or 
main/index.php
: Add absolutely positioned <img> tags with z-index: -1 and low opacity, or sticking out from corners, similar to the existing mvp-ghost implementation but with distinct character art.
Verification Plan
Manual Verification
Cursor Check: Verify that hovering over the background shows the default RO cursor, and hovering over buttons/links changes it to the RO pointer cursor.
Navigation Check: Visually confirm the monster sprites appear next to navbar links and align correctly on both desktop and mobile views.
Glow Check: Hover over buttons and cards to ensure the new box-shadow magical glow is smooth and not overwhelming.
Artwork Check: Scroll through the homepage to ensure the new character renders add flavor without obstructing readable text or clickable elements.