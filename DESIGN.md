# Design System — DeepDex

## Product Context
- **What this is:** a personal deep-work app for macOS. Focus sessions block distractions; each completed session hatches a Pokémon egg, and the hours add up per topic.
- **Who it's for:** one person, a Spanish-speaking Pokémon fan who wants studying and work to feel like progress in a game.
- **Space/industry:** focus timers and distraction blockers (Forest, Focumon, Opal, Cold Turkey), and Pokémon fan tools.
- **Project type:** desktop web app (Electron), 520×820 window, 440×680 minimum.

## Aesthetic Direction
- **Direction:** Teselia. The interface language of Pokémon Black & White, the generation the app's sprites come from: black and white at full contrast, sharp angles instead of rounded softness, heavy black rules, and labels that sit on black tabs like the game's menus.
- **Decoration level:** intentional. The only ornaments are structural: the chamfered corner, the black label tab and the 2px rule. No shadows, no gradients, no blur.
- **Mood:** a device from the Pokémon world, not a productivity SaaS. Crisp and a little cool, the way Gen V was meant to feel.
- **Memorable thing:** "Black & White": the app's two modes. Everything you browse is White (paper, black ink); the focus session and the hatch switch to Black.
- **Research:** Pokémon fan UIs converge on the Kanto Pokédex shell (blue lens, three lights), which is now a cliché of the genre. Gen V's director pushed the generation toward "cooler", angular design, and its UI is often cited as minimal. Since every sprite in the app is a Black/White sprite, that language is the coherent one.

## Typography
- **Display / labels / buttons:** Chakra Petch 600–700. Squared, cut-corner letterforms that echo the chamfer motif; handles Spanish accents in capitals (the pixel face does not).
- **Body:** Barlow 400–500. DIN-like and legible at 12–14px, industrial without being cold.
- **Numbers that are "game":** Press Start 2P, only for the session timer, the countdown, the trainer level and hero stat values; only at 16/24/48px, never with accents.
- **Data/tables:** Barlow with `font-variant-numeric: tabular-nums`.
- **Loading:** self-hosted woff2 (latin subset) in `src/renderer/src/assets/fonts/`; the app works offline.
- **Scale (px):** 11 label caps · 13 small · 14 body · 16 emphasis · 20 title · 24 / 48 pixel numbers.

## Color
- **Approach:** restrained. Black and white do the work; one red means "act" or "you are here".
- **Ink:** `#111214` — text, rules, filled controls.
- **Paper:** `#ffffff` panels on `#ecebe7` ground (a deliberate warm grey, so white panels read as objects).
- **Mid greys:** `#6b6c70` secondary text · `#c9c8c3` empty states and quiet rules.
- **Red (Poké Ball):** `#e3350d` — primary action, active tab, today's bar. Never decorative.
- **Black mode:** `#0d0e10` ground, `#1b1c20` panels, `#f2f1ec` text.
- **Type colours:** the official 18 type colours, used only to identify a topic or a Pokémon's type.
- **Specials:** `#ffcb05` (logo yellow) for shiny, legendary and level-up moments only.
- **Semantic:** ok `#2f9e57`, waiting `#ffcb05`, problem `#e3350d`, always with text.
- **Charts:** monochrome. Bars and heat cells in ink tints; today in red.

## Spacing
- **Base unit:** 4px. **Density:** comfortable.
- **Scale:** 4 · 8 · 12 · 16 · 24 · 32.

## Layout
- **Approach:** grid-disciplined, left-aligned. Panels stack in one column; content starts at the left edge of each panel, not centred.
- **Panels:** white, 2px ink border, top-right corner cut at 12px (`clip-path`), a black label tab on the top-left edge for the section name.
- **Border radius:** 0 everywhere. Chamfers replace rounding: 12px panels, 8px controls.
- **Window chrome:** a black top bar with the lens and the wordmark; a black tab bar at the bottom whose active tab carries a red bar.
- **Signature light:** the Pokédex lens (blue, round: the one round element besides the battle platform). Dim while browsing; it breathes six times a minute during a focus session.

## Motion
- **Approach:** minimal-functional, with one orchestrated moment: the hatch.
- **Pixel art is never rotated** (it mangles pixels). Idle egg hops; hatching egg shakes sideways by whole sprite pixels.
- **Easing / duration:** state changes 120–200ms ease-out; hatch phases 450–1200ms; all motion off under `prefers-reduced-motion`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-20 | Initial design system: Teselia (Black & White) | Created with /design-consultation after the previous light "rounded cards + system font" UI read as generic AI design. |
| 2026-10-20 | Kept one Pokédex element: the blue lens | An outside design voice proposed turning the window into a full Kanto Pokédex chassis. Rejected the chassis (fan-UI cliché, against "minimal"), kept its lens as a single status light that breathes during focus. |
| 2026-10-20 | Hatch beats from Black & White | "¿Eh…?", shaking egg, two cracks, white flash, Pokémon on a battle platform, species number, red "Registrado" stamp for new entries. |
| 2026-10-20 | Reward figures use Chakra Petch, not the pixel face | The pixel face is too wide for "+1h 30m" in a three-column row. |
| 2026-10-20 | Empty Pokédex cells are bare silhouettes | Dashed outlines on 100+ empty cells were visual noise; only registered Pokémon get a paper tile. |
| 2026-10-21 | App icon: "DEX" echo on a Poké Ball | The word is the ball's black band; fading, blurred copies trail up into the red and down into the white (echo effect from a "FOCUS" reference). Source in `design/icon/`. |
