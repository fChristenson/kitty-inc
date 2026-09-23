# New Element Artwork Batch

## Scope

Processed 19 newly supplied sources: 18 elements and Nucleus. All raw JFIF
files are preserved. Older unrelated source images are unchanged. Plutonium
and later elements without supplied artwork are not generated or registered.

Element labels retain their actual element names. Existing IDs are unchanged;
the older Gold entry's label is aligned to its inventory as **Gold Atom**.

## Rewards

Each element grants **N upgrades on the triggering floor, then N payouts on
the highest unlocked floor**, where N is its atomic number. This continues
the existing element family with distinct amounts, not duplicate rewards.
On a single-floor building both rewards apply there. Locked floors and income
collection timestamps are untouched. Chances continue the existing decreasing
ladder between neighboring elements; no existing chance was changed.

| Raw source        | Crit label             | Internal ID / PNG / processor suffix |         N | Proc chance |
| ----------------- | ---------------------- | ------------------------------------ | --------: | ----------: |
| osmium.jfif       | Osmium Regalia         | osmiumRegalia                        |        76 |      0.200% |
| iridium.jfif      | Iridium Aegis          | iridiumAegis                         |        77 |      0.196% |
| mercury.jfif      | Mercury Flow           | mercuryFlow                          |        80 |      0.184% |
| thallium.jfif     | Thallium Thrive        | thalliumThrive                       |        81 |      0.180% |
| lead.jfif         | Lead Lode              | leadLode                             |        82 |      0.176% |
| bismuth.jfif      | Bismuth Bastion        | bismuthBastion                       |        83 |      0.172% |
| polonium.jfif     | Polonium Prism         | poloniumPrism                        |        84 |      0.168% |
| astatine.jfif     | Astatine Aurora        | astatineAurora                       |        85 |      0.164% |
| radon.jfif        | Radon Ripple           | radonRipple                          |        86 |      0.160% |
| francium.jfif     | Francium Fortune       | franciumFortune                      |        87 |      0.156% |
| radium.jfif       | Radium Rhythm          | radiumRhythm                         |        88 |      0.152% |
| actinium.jfif     | Actinium Arc           | actiniumArc                          |        89 |      0.148% |
| thorium.jfif      | Thorium Throne         | thoriumThrone                        |        90 |      0.144% |
| protactinium.jfif | Protactinium Orbit     | protactiniumOrbit                    |        91 |      0.140% |
| neptunium.jfif    | Neptunium Nova         | neptuniumNova                        |        93 |      0.132% |
| americium.jfif    | Americium Alarm        | americiumAlarm                       |        95 |      0.124% |
| curium.jfif       | Curium Crucible        | curiumCrucible                       |        96 |      0.120% |
| berkelium.jfif    | Berkelium Breakthrough | berkeliumBreakthrough                |        97 |      0.116% |
| nucleus.jfif      | Nucleus Dividend       | nucleusDividend                      | See below |      1.400% |

Nucleus Dividend grants six upgrades on every unlocked floor and four payouts
on the triggering floor. Unlike Sugar High's five upgrades and five payouts
on every floor at 1.2%, its payout component is single-floor, so its chance is
slightly higher. It is not an element and has no assigned atomic number.

All chances are conditional on a landed tier and special gateway, with the
existing random proc cap intact. These specials and their badges are earned
only through manual upgrade clicks and manual floor unlocks. Renovation,
cloud automation, map bulk purchases, and map building unlocks do not grant
these special rewards. The generated dev controls offer upgrade/unlock events,
not unsupported map rewards.

## Artwork

All 19 sources are 1248x832. Sampled border RGB values were near-white
(approximately 247-255). An ordered source contact sheet was inspected before
processing. Dedicated wrappers reuse the border-connected white flood fill,
small-component cleanup, tight crop, 250x250 cap, and palette quantization.
No per-pixel white removal was used: enclosed highlights stay opaque.

Outputs include `public/<kind>.png`, `public/stickers/<kind>.png`, and
`public/silhouettes/<kind>.png`. Identical icon copies also reside under
`src/assets` and `src/assets/themes/references/dist`. The transparent icons
total about 565 KiB. Every processed icon was inspected on magenta for outline,
crop, enclosed light details, and detached pieces; Berkelium's sparks and
Francium's stars survive. Enclosed white orbital regions are retained,
consistent with the existing element artwork and sticker treatment.

## Verification

The existing featured suite covers concrete reward amounts/targets, single-floor
fallbacks, locked-floor exclusion, tier/timer preservation, arming/consumption,
gateway misses, tier ordering, shared proc cap, generated test controls, and
optimized assets. Additional Nucleus checks cover milestone starting levels,
exact single-floor amounts, tier caps, copy equality, and new silhouettes.

Passed:

`node scripts/test-featured-crits.mjs`: 732 featured rewards, naming,
odds, metadata, controls, timers, and assets.

`node scripts/test-bulk-purchase.mjs`: all 820 special procs excluded from
automated upgrades/unlocks, while manual specials remain functional.

`npm run build`: TypeScript and Vite production build.

Browser: all 19 generated test buttons occur once; all 19 sticker URLs
decode successfully. Combined text/event filters show upgrade and unlock
choices, hide unsupported map choices, and disable map bonus selection.

Browser fixtures: 38 real manual-handler checks (19 upgrade plus 19 unlock),
with fixed randomness and a Mega base tier, verified exact upgrade and
payout amounts. Fixtures used the live Vite module URLs to avoid duplicate
wallet instances after hot reload.

Berkelium's long-label celebration rendered within a 390px canvas; pixel
sampling confirmed nonblank artwork and a bitmap screenshot was inspected.
Badge detail artwork and text fit were checked at mobile and desktop widths,
with no horizontal overflow. The integration browser sometimes captured a
stale frame; rendered-pixel and DOM checks were used alongside the captures.
