# Crit ideas

## Implemented asset batch: 2026-09-21 (food, beverages, cocktails and desserts)

Thirty supplied food-related illustrations support upgrade clicks and floor
unlocks through the shared `applyFloorCrit` path. Rewards are immediate and
current-building only; proc chances apply after a tier and the special gateway
land, before the shared cap, and are not per-click odds.

| Image family                                                                                | Scope              | Reward range                    | Processing                |
| ------------------------------------------------------------------------------------------- | ------------------ | ------------------------------- | ------------------------- |
| loadedBurger, tacoFeast, pizzaSupreme, ramenBowl                                            | food               | 24-27 upgrades or 22 payouts    | shared crit-icon pipeline |
| sushiPlatter2-4, berrySmoothie2-4                                                           | food and smoothies | 23-31 upgrades or 28-31 payouts | shared crit-icon pipeline |
| icedCoffee, tropicalLemonade, hotChocolate                                                  | beverages          | 18-24 payouts/upgrades          | shared crit-icon pipeline |
| sunsetMargarita, blueLagoonCocktail1-3, strawberryDaiquiri, mangoMojito1-2, espressoMartini | cocktails          | 17-32 payouts/upgrades          | shared crit-icon pipeline |
| chocolateCake, strawberryShortcake, rainbowDonut, iceCreamSundae1-2, macaronTower1-2        | desserts           | 21-34 payouts/upgrades          | shared crit-icon pipeline |

Locked floors are excluded from building-wide rewards; single-floor rewards stay
on the triggering floor and preserve collection timers. Numbered variants are
distinct crits with distinct labels and rewards. `bubbleTea` remains a prompt
only because no matching raw source image was supplied.

Each raw `.jfif` remains preserved. Dedicated `scripts/process-<name>.mjs`
wrappers use `scripts/lib/process-crit-icon.mjs` and emit palette-quantized,
250px-capped PNGs in `public/`, `public/stickers/`, and `public/silhouettes/`.

Verification: `node scripts/test-featured-crits.mjs` passes with 525 rewards;
`npm run build` follows below.

## Implemented asset batch: 2026-09-21 (gold animal statues)

Nine gold-animal illustrations support upgrade clicks and floor unlocks through
the shared `applyFloorCrit` path. Rewards are immediate, current-building only,
and existing crit balance was extended with new entries; chances are
conditional on a tier and the special gateway landing before the shared cap,
not per-click odds.

| Image        | Crit          | Immediate reward                               | Proc chance | Comparison                                                     |
| ------------ | ------------- | ---------------------------------------------- | ----------- | -------------------------------------------------------------- |
| goldLion     | Gilded Pride  | 27 payouts on every unlocked floor             | 0.5%        | Building-wide payout below Bill Blizzard's 23 at 0.5% by scope |
| goldElephant | Golden Trunk  | 28 free upgrades on this floor                 | 0.45%       | Between Bob Pawge's 24 and JC Dentclaw's 26 by chance          |
| goldBear     | Bullion Bear  | 24 payouts on every unlocked floor             | 0.55%       | Broad payout below Golden Goose's 21 at 0.7%                   |
| goldWolf     | Golden Howl   | 22 free upgrades on the highest unlocked floor | 0.6%        | Targeted top-floor reward below Handsome Jake's 18 at 1.2%     |
| goldOwl      | Owl's Reserve | 20 payouts on the lowest-level floor           | 0.7%        | Targeted low-floor payout above Penny Jar's 15 at 2%           |
| goldRam      | Ram Raid      | 18 free upgrades on alternating floors         | 0.65%       | Broader than a single-floor 18-upgrade reward                  |
| goldRabbit   | Golden Hop    | 13 payouts on this floor                       | 1%          | Smaller common payout than What isBrewing?'s 16 at 0.35%       |
| goldCat      | Golden Purr   | 15 free upgrades on this floor                 | 0.8%        | Below Antlered Fox Fortune's 34 at 0.25%                       |
| goldenLion   | Lion's Crown  | 1 tier promotion, then 20 free upgrades here   | 0.35%       | Promotion variant below Golden Chalice's 2 plus 7 at 0.8%      |

Locked floors are excluded from building-wide and alternating-floor rewards.
Single-floor rewards stay on the triggering floor, target selectors collapse to
that floor in a one-floor building, timers are preserved, and tier promotion
stops at the strongest tier. These crits have no map-specific behavior.

Each raw `.jfif` source is preserved. Dedicated `scripts/process-<name>.mjs`
wrappers use `scripts/lib/process-crit-icon.mjs` and emit palette-quantized,
250px-capped PNGs in `public/`, `public/stickers/`, and `public/silhouettes/`.
`cloudCatSprites.jfif` was intentionally excluded because it is a sprite-sheet
source, not a standalone gold-animal crit illustration.

Verification: `node scripts/test-featured-crits.mjs` passes with 495 rewards;
`npm run build` passes.

## Implemented asset batch: 2026-09-20 (World of Warcraft cats)

Twenty-six new featured crits support upgrade clicks and floor unlocks through the
shared floor reward path. Rewards are immediate, use existing upgrade/payout
shapes, and do not change map behavior. Chances are conditional on a tier and
the special gateway landing before the shared cap, not per-click odds.

| Image                      | Crit                             | Immediate reward                    | Proc chance | Comparison                                                   |
| -------------------------- | -------------------------------- | ----------------------------------- | ----------- | ------------------------------------------------------------ |
| arfthas                    | Arthas Meow-nenethil             | 22 upgrades here                    | 0.4%        | Smaller than Varian's 38 at 0.1%                             |
| guldanMeow                 | Gul'dan Meow                     | 31 payouts here                     | 0.3%        | Below Ragnaros's 37 at 0.15%                                 |
| sargerasPurrgeras          | Sargeras Purrgeras               | 45 upgrades on every unlocked floor | 0.03%       | Building-wide titan reward                                   |
| sylvanwhisker              | Sylvanas Whiskerunner            | 28 payouts here                     | 0.35%       | Below Gul'dan's 31 at 0.3%                                   |
| sylvanasWhiskerunner       | Sylvanas Windrunner's Red Hood   | 30 payouts here                     | 0.3%        | Alternate Sylvanas reward near the original 28 at 0.35%      |
| jainaPurrmoore             | Jaina Purrmoore                  | 24 upgrades here                    | 0.45%       | More common than Chen's 25-wide reward                       |
| thrallpaw                  | Thrallpaw                        | 32 payouts on every unlocked floor  | 0.15%       | Building-wide and rare                                       |
| varianWrynnkles            | Varian Wrynnkles                 | 38 upgrades here                    | 0.1%        | Strong single-floor upgrade                                  |
| anduinWrynncat             | Anduin Wrynncat                  | 30 payouts here                     | 0.3%        | Below Thrall's building-wide payout                          |
| illidandelight             | Illidan Stormrage                | 42 upgrades here                    | 0.08%       | Rarer than Varian's 38                                       |
| malfurionStormpaw          | Malfurion Stormpaw               | 35 payouts on every unlocked floor  | 0.1%        | Building-wide druid reward                                   |
| voljinWhisker              | Vol'jin Whisker                  | 26 upgrades here                    | 0.4%        | Smaller than Illidan's 42                                    |
| lorthemewPurron            | Lor'themar Purron                | 29 payouts here                     | 0.35%       | Between Sylvanas and Anduin                                  |
| khadgarPurr                | Khadgar Purr                     | 33 upgrades on every unlocked floor | 0.08%       | Building-wide mage reward                                    |
| garroshHellscreamPurr      | Garrosh Hellscream Purr          | 48 upgrades here                    | 0.05%       | Rarer than Illidan's 42                                      |
| grommewHellscream          | Grommash Hellscream              | 40 payouts on every unlocked floor  | 0.08%       | Building-wide berserker payout                               |
| deathwingTheDestroycat     | Deathwing the Destroyer          | 55 upgrades on every unlocked floor | 0.03%       | Largest building-wide reward                                 |
| deathwingAshwing           | Deathwing Ashwing                | 50 upgrades here                    | 0.05%       | Strong single-floor variant below Deathwing's 55-wide reward |
| deathwingDestroypurr       | I Am the Destroyer!              | 60 upgrades on every unlocked floor | 0.02%       | Rarer and larger than Deathwing's 55 at 0.03%                |
| ragnapurrs                 | Ragnaros the Firelord            | 37 payouts here                     | 0.15%       | Below Grommash's building-wide payout                        |
| medivhMewage               | Medivh Mewage                    | 27 upgrades here                    | 0.4%        | Smaller than Illidan's 42                                    |
| tyrandeWhiskerwind         | Elune-Adore                      | 34 payouts here                     | 0.2%        | Between Ragnaros and Malfurion                               |
| tyrandeMoonwhisker         | By Elune's Light!                | 32 payouts here                     | 0.25%       | More common and smaller than Tyrande's 34 at 0.2%            |
| tyrandeWhisperpaws         | The Night Warrior Rises!         | 38 payouts on every unlocked floor  | 0.08%       | Building-wide upgrade in scope over Tyrande's 34 here        |
| tyrandeStarbow             | Justice for the Kaldorei!        | 31 upgrades here                    | 0.35%       | Common single-floor companion to Tyrande's payout crits      |
| chenStormstout             | A Toast to Victory!              | 25 upgrades on every unlocked floor | 0.25%       | Building-wide monk reward                                    |
| antleredFoxFortune         | Antlered Fox Fortune             | 34 upgrades here                    | 0.25%       | Single-floor fortune below Illidan's 42 at 0.08%             |
| emperorProvidesPurrfection | The Emperor Provides Purrfection | 44 payouts on every unlocked floor  | 0.06%       | Rare building-wide payout above Thrall's 32 at 0.15%         |
| furionStormpaw             | Furion Stormpaw                  | 42 payouts on every unlocked floor  | 0.06%       | Alternate druid reward above Malfurion's 35 at 0.1%          |
| whatIsBrewing              | What's Brewing?                  | 16 payouts here                     | 0.35%       | Smaller and more common than Chen's 25-wide reward           |

Locked floors are excluded from building-wide rewards; single-floor rewards
stay on the triggering floor, stack on repeated targets, preserve timers, and
stop only where the normal upgrade system stops. Maximum-tier behavior and
single-floor fallback behavior remain unchanged. Raw `.jfif` files are preserved;
each wrapper emits palette-quantized alpha PNGs in `public/` and `public/stickers/`.
The four missed raw-only assets use the same shared floor reward path and do not
change map behavior. Their prompts use the canonical image basenames, and their
regression coverage checks metadata, processed assets, and exact reward effects.

## Implemented asset batch: 2026-09-20 (sweets, relics, officers and wargear)

Forty-two new featured crits support upgrade clicks and floor unlocks through
the shared `applyFloorCrit` path. Rewards are immediate and limited to the
current building; existing balance values were unchanged. Each proc chance is
conditional on a tier landing and the special gateway before the shared cap,
not a per-click probability.

| Image              | Crit                   | Immediate reward                  | Proc chance | Comparison                                                      |
| ------------------ | ---------------------- | --------------------------------- | ----------- | --------------------------------------------------------------- |
| berryShortcake     | Berry Shortcake        | 33 payouts here                   | 0.25%       | Below The Cure's 0.7% for 27 payouts                            |
| brassBanker        | Brass Banker           | 34 upgrades on lowest floor       | 0.2%        | Matches Never Surrender's 35-floor reward band                  |
| candyCastle        | Candy Castle           | 36 payouts on every floor         | 0.2%        | Below Coin Cascade's 38 payouts at 0.15%                        |
| caramelApple       | Caramel Apple          | 28 upgrades here                  | 0.4%        | Above Ember Key's 32 upgrades at 0.25%                          |
| catnipSatchel      | Catnip Satchel         | 29 payouts from top earner        | 0.5%        | Below Neon Beaker's 32 payouts at 0.3%                          |
| cinnamonSwirl      | Cinnamon Swirl         | 26 upgrades on alternating floors | 0.4%        | Broader than Clockwork Owl's 27 here at 0.4%                    |
| citrusCoin         | Citrus Coin            | 33 payouts on alternating floors  | 0.4%        | Below Moonlit Mint's 26 at 0.6% by scope                        |
| clockworkSatellite | Clockwork Satellite    | 30 upgrades on highest floor      | 0.3%        | Above To the Skies's 36 at 0.15% by rarity                      |
| coinCascade        | Coin Cascade           | 38 payouts on every floor         | 0.15%       | Rarer than Candy Castle's 36 at 0.2%                            |
| comfortFood        | Comfort Food           | 24 upgrades on lowest floor       | 1%          | More common than Brass Banker's 34 at 0.2%                      |
| crownHedgehog      | Crown Hedgehog         | 1 promotion plus 22 upgrades here | 0.3%        | Smaller than Rainbow Relic's 23-upgrade promotion               |
| emberKey           | Ember Key              | 32 upgrades here                  | 0.25%       | Above Vault Beetle's 34 here at 0.2% by chance                  |
| emberwingDragon2   | Emberwing Dragon Hoard | 30 payouts here                   | 0.3%        | Distinct companion artwork to Emberwing Dragon's upgrade reward |
| emperorsFinest     | Emperor's Finest       | 37 payouts on every floor         | 0.15%       | Near Coin Cascade's 38 at the same chance                       |
| eternalDuty        | Eternal Duty           | 27 upgrades on every floor        | 0.4%        | Broader than Never Surrender's 35 here at 0.2%                  |
| faithIsOurShield   | Faith Is Our Shield    | 1 promotion plus 24 upgrades here | 0.2%        | Stronger than Crown Hedgehog's 22 at 0.3%                       |
| fearNotThePsyker   | Fear Not the Psyker    | 34 payouts here                   | 0.25%       | Above Berry Shortcake's 33 at the same chance                   |
| frostRune          | Frost Rune             | 29 upgrades here and below        | 0.4%        | Narrower than Eternal Duty's building-wide 27                   |
| lanternFox         | Lantern Fox            | 31 payouts from top earner        | 0.3%        | Near Silver Laurel's 29 top-floor payouts at 0.4%               |
| lanternLynx        | Lantern Lynx           | 23 upgrades on lowest floor       | 1.2%        | More common than Comfort Food's 24 at 1%                        |
| memoryCrystal      | Memory Crystal         | 1 promotion plus 21 upgrades here | 0.4%        | Smaller and more common than Faith Is Our Shield                |
| mochaFroth         | Mocha Froth            | 28 payouts here                   | 0.3%        | Below Fear Not the Psyker's 34 at 0.25%                         |
| coinrootGrove      | Coinroot Grove         | 20 upgrades on every floor        | 0.5%        | Building-wide but smaller than Eternal Duty                     |
| neonBeaker         | Neon Beaker            | 32 payouts from top earner        | 0.3%        | Broader target than Catnip Satchel at 0.5%                      |
| neverSurrender     | Never Surrender        | 35 upgrades here                  | 0.2%        | Near Ember Key's 32 at 0.25%                                    |
| pearlOtter         | Pearl Otter            | 30 payouts here                   | 0.4%        | Below Mocha Froth's 28 only by target value                     |
| pickleParade       | Pickle Parade          | 25 upgrades on lowest floor       | 0.8%        | More common than Brass Banker by scope                          |
| profitPigeon       | Profit Pigeon          | 27 payouts on alternating floors  | 0.5%        | Smaller than Citrus Coin's 33 at 0.4%                           |
| purge              | Purge                  | 33 upgrades here                  | 0.2%        | Near Ember Key's 32 at 0.25%                                    |
| rainbowRelic       | Rainbow Relic          | 1 promotion plus 23 upgrades here | 0.3%        | Above Crown Hedgehog's 22 at the same chance                    |
| ramenCrown         | Ramen Crown            | 35 payouts on every floor         | 0.2%        | Below Coin Cascade's 38 at 0.15%                                |
| redPanda           | Red Panda              | 31 upgrades on alternating floors | 0.3%        | Broader than Never Surrender's 35 here                          |
| silverLaurel       | Silver Laurel          | 29 payouts from highest floor     | 0.4%        | Narrower than Lantern Fox's top-earner target                   |
| thunderNachos      | Thunder Nachos         | 28 upgrades on every floor        | 0.3%        | Building-wide versus Purge's 33 here at 0.2%                    |
| toTheSkies         | To the Skies           | 36 upgrades on highest floor      | 0.15%       | Rarer than Clockwork Satellite's 30 at 0.3%                     |
| treasureTeapot     | Treasure Teapot        | 34 payouts from top earner        | 0.2%        | Above Silver Laurel's 29 at 0.4%                                |
| whatAreYourOrders  | What Are Your Orders   | 30 upgrades on lowest floor       | 0.4%        | More targeted than Thunder Nachos's building-wide reward        |
| whisperingOrb      | Whispering Orb         | 1 promotion plus 25 upgrades here | 0.2%        | Stronger than Rainbow Relic's 23 at 0.3%                        |
| clockworkOwl       | Clockwork Owl          | 27 upgrades here                  | 0.4%        | Below Never Surrender's 35 at 0.2%                              |
| goldenGardenGolem  | Golden Garden Golem    | 33 payouts on every floor         | 0.2%        | Near Ramen Crown's 35 at the same chance                        |
| moonlitMint        | Moonlit Mint           | 26 payouts on alternating floors  | 0.6%        | More common than Citrus Coin's 33 at 0.4%                       |
| vaultBeetle        | Vault Beetle           | 34 upgrades here                  | 0.2%        | Near Purge's 33 at the same chance                              |
| lionKey            | Lion Key               | 1 promotion plus 26 upgrades here | 0.15%       | Stronger than Memory Crystal's 21 upgrades                      |
| restorationProject | Restoration Project    | 30 upgrades here                  | 0.25%       | Similar to Ember Key's 32 upgrades at 0.25%                     |

Locked floors are excluded from all building-wide, alternating, highest, and
lowest-floor effects; single-floor fallback behavior remains immediate. Tier
promotions stop at the maximum tier, and repeated targets stack normally. No
timers are reset. Map-specific behavior is unchanged: these remain floor and
floor-unlock featured procs only.

Raw `.jfif` sources were processed with
`node scripts/process-featured-crit-batch.mjs` through the shared near-white
processor. The four spaced prompt sources were copied to normalized camelCase
names while their originals were preserved. `emberwingDragon2.jfif` was
inspected and proved to be distinct artwork, so it was normalized and
integrated as Emberwing Dragon Hoard. Every
included asset produced a palette-quantized, alpha-bearing PNG plus sticker
and silhouette under `public/`; the generated contact sheet was inspected over
magenta. `node scripts/test-featured-crits.mjs` passes at 454 entries and
`npm run build` is clean. Browser interaction checks remain unverified in this
batch.

## Implemented asset batch: 2026-09-19 (food, science, treasure and gear)

Twenty-five coherent crits support upgrade clicks and floor unlocks through the
shared `applyFloorCrit` path. Rewards are immediate, current-building only,
and existing balance was unchanged. The proc chances remain conditional on a
tier landing and the special gateway before the shared proc cap; they are not
per-click odds.

| Image             | Crit               | Immediate reward                  | Proc chance |
| ----------------- | ------------------ | --------------------------------- | ----------- |
| ancientRelic      | Ancient Relic      | 35 payouts here                   | 1.4%        |
| geometricRelic    | Geometric Relic    | 34 payouts here                   | 1.5%        |
| berryParfait      | Berry Parfait      | 32 payouts on every floor         | 0.2%        |
| berrySmoothie     | Berry Smoothie     | 32 payouts from top earner        | 0.4%        |
| butterCroissant   | Butter Croissant   | 39 upgrades here                  | 0.2%        |
| cheeseWheel       | Cheese Wheel       | 34 payouts here                   | 0.3%        |
| chromeArm         | Chrome Arm         | 37 upgrades here                  | 0.2%        |
| circuitBreaker    | Circuit Breaker    | 36 upgrades here                  | 0.2%        |
| glassWyvern       | Glass Wyvern       | 30 payouts from top earner        | 0.4%        |
| goldBar           | Gold Bar           | 31 payouts on every floor         | 0.2%        |
| honeyToast        | Honey Toast        | 23 upgrades on lowest floor       | 1.3%        |
| potionCommotion   | Potion Commotion   | 30 payouts here                   | 0.4%        |
| lemonTart         | Lemon Tart         | 36 upgrades on highest floor      | 0.3%        |
| lifelineLoot      | Lifeline Loot      | 22 upgrades here                  | 1.4%        |
| moonCloak         | Moon Cloak         | 20 upgrades here and below        | 0.7%        |
| mossbackManticore | Mossback Manticore | 30 payouts on every floor         | 0.3%        |
| platinumRing      | Platinum Ring      | 32 upgrades here                  | 0.4%        |
| sapphireOrbit     | Sapphire Orbit     | 1 promotion plus 20 upgrades      | 0.45%       |
| roboticGripper    | Robotic Gripper    | 38 upgrades here                  | 0.2%        |
| silverCoin        | Silver Coin        | 25 payouts on alternating floors  | 0.6%        |
| spicedChai        | Spiced Chai        | 35 payouts here                   | 0.3%        |
| stormBoots        | Storm Boots        | 18 upgrades on alternating floors | 0.6%        |
| sushiPlatter      | Sushi Platter      | 26 payouts on alternating floors  | 0.6%        |
| thornmailGlove    | Thornmail Glove    | 1 promotion plus 19 upgrades      | 0.4%        |
| gildedCache       | Gilded Cache       | 35 upgrades on every floor        | 0.25%       |

All raw sources were `.jfif`, already camelCase, and unregistered. Twenty-four
used the shared near-white processor. `potionCommotion` used a dedicated
color-distance flood fill because its source had a dark panel background. Every
icon produced public artwork, a sticker, and an undiscovered silhouette.

`node scripts/test-featured-crits.mjs` passes at 412 entries and `npm run build`
is clean.

## Implemented asset batch: 2026-09-19 (steampunk and clockwork)

Nine crits support upgrade clicks and floor unlocks through the shared
`applyFloorCrit` path. Rewards are immediate, existing crit balance is
unchanged, and proc chances apply only after a tier and the special gateway
land, before the shared proc cap; they are not per-click odds.

This is the first batch named under the one-name rule: each source file is the
crit's display name in camelCase, so `fullSteam.png` becomes "Full Steam" and
the same string is the registry key and the icon, with nothing to keep in sync.

| Image         | Crit           | Immediate reward                              | Proc chance | Comparison                                               |
| ------------- | -------------- | --------------------------------------------- | ----------- | -------------------------------------------------------- |
| aetherLantern | Aether Lantern | 19 upgrades on this floor and every one below | 0.8%        | Above Twenty-One's 17 at 0.9%                            |
| boilerRoom    | Boiler Room    | 22 free upgrades on the lowest-level floor    | 1.4%        | Above Bullseye's 21 at 1.5%                              |
| brassDiver    | Brass Diver    | 33 instant payouts on this floor              | 0.5%        | The largest single-floor payout, above Scratch Card's 32 |
| clockworkHand | Clockwork Hand | 16 upgrades on alternating floors             | 0.9%        | Above Double Helix's 15 at 1%                            |
| cogwork       | Cogwork        | 29 payouts on every unlocked floor            | 0.3%        | The largest building-wide payout, above Half Life's 28   |
| fullSteam     | Full Steam     | 33 free upgrades on every unlocked floor      | 0.3%        | The largest building-wide batch, above Jackpot's 32      |
| pocketWatch   | Pocket Watch   | 29 payouts from the highest-earning floor     | 0.5%        | The largest top-earner payout, above High Roller's 28    |
| tubeDelivery  | Tube Delivery  | 31 upgrades on the highest unlocked floor     | 0.5%        | Above Silverware's 29, below Golem's 35                  |
| windUp        | Wind Up        | 1 tier promotion, then 17 upgrades here       | 0.55%       | Slots between Bottled Nebula's 16 and Eureka's 18        |

All nine are single-shot and current-building only, with no map-specific
behavior. Full Steam and Cogwork skip locked floors; Aether Lantern takes the
triggering floor plus everything below it; Clockwork Hand walks the building
stride-by-2 from the ground floor. Boiler Room resolves the lowest-level
unlocked floor, Tube Delivery the highest unlocked floor, and Pocket Watch the
current top earner by income rate, so on a one-floor building all three
collapse onto the triggering floor. Wind Up promotes the triggering floor's
permanent crit tier and stops at the strongest tier. Neither payout crit
touches floor collection timers.

Full Steam and Cogwork sit at 0.3% — the Huge band — because upgrading or
paying every floor at that size reshapes the whole building at once.

Wind Up lands inside the existing single-promotion family (Signet of Skulls 15,
Bottled Nebula 16, Eureka 18), which has to decrease monotonically with reward
size. Bottled Nebula and Eureka were both already sitting at 0.6% despite the
two-upgrade gap, so inserting Wind Up at 0.55% also meant dropping Eureka to
0.5%. That family now reads 0.7% / 0.6% / 0.55% / 0.5% across 15 / 16 / 17 / 18
upgrades. No other existing balance changed.

### Processing and verification (steampunk and clockwork)

All nine arrived as `.png`, so each wrapper passes `sourceExtension: ".png"`.
Three findings worth keeping:

- **The CapCut watermark needed no work.** Every source carries one in a
  corner, but its darkest pixel measures 206-220 whiteness — above the shared
  processor's 195 background threshold — so the border-seeded flood fill
  already erases it. Measure before building a removal step.
- **`boilerRoom` and `cogwork` ship inside a rounded card with a black frame.**
  A `sourceRect` cuts the frame's straight runs, but a rectangular crop can't
  follow a rounded corner, so the four corner arcs survived as a thin ring that
  blew the tight crop out to the full card. That added
  `scripts/lib/drop-edge-components.mjs`: after a border-seeded key the real
  subject is always fenced off from the edge, so anything still touching it is
  leftover framing. `keepLargestOpaqueComponent` would have been wrong here —
  Cogwork is four separate gears plus motion arcs, and it would have kept one
  gear. `pocketWatch` uses the same drop for its much fainter card edge.
- **Two enclosed holes needed seeding**: Pocket Watch's chain loop, Wind Up's
  heart-shaped bow and Aether Lantern's hanging ring all fence off white the
  border fill can't reach. Only genuine holes were seeded — most enclosed white
  in this batch (gear centres, glass panes, the watch face) is real artwork.

Each icon ships as `public/<name>.png`, `public/stickers/<name>.png` and
`public/silhouettes/<name>.png`.

`node scripts/test-featured-crits.mjs` passes at 388 entries and
`npm run build` is clean. In-game celebration rendering and the Special Crits
menu were not exercised in a browser for this batch.

## Implemented asset batch: 2026-09-19 (sports, laboratory and casino floor)

Sixteen crits — one leftover high-seas prop, four sports trophies, four
laboratory props and seven casino pieces — support upgrade clicks and floor
unlocks through the shared `applyFloorCrit` path. Rewards are immediate,
existing crit balance is unchanged, and proc chances apply only after a tier
and the special gateway land, before the shared proc cap; they are not
per-click odds.

| Image          | Crit             | Immediate reward                              | Proc chance | Comparison                                               |
| -------------- | ---------------- | --------------------------------------------- | ----------- | -------------------------------------------------------- |
| bullseye       | Bullseye         | 21 free upgrades on the lowest-level floor    | 1.5%        | Above Message in a Bottle's 20 at 1.6%                   |
| chainReaction  | Chain Reaction   | 16 upgrades on this floor and every one below | 0.9%        | Above Flooring Inspector's 15 at 1%                      |
| doubleHelix    | Double Helix     | 15 upgrades on alternating floors             | 1%          | Above Pelt Cloak's 14 at 1%                              |
| eureka         | Eureka           | 1 tier promotion, then 18 upgrades here       | 0.6%        | The largest single promotion below I Didn't Ask For This |
| goldMedal      | Gold Medal       | 31 instant payouts on this floor              | 0.6%        | The largest single-floor payout, above Despicable Fees   |
| halfLife       | Half Life        | 28 payouts on every unlocked floor            | 0.3%        | The largest building-wide payout, above Kraken's 27      |
| highRoller     | High Roller      | 28 payouts from the highest-earning floor     | 0.5%        | The largest top-earner payout, above Pearl Diver's 27    |
| jackpot        | Jackpot          | 32 free upgrades on every unlocked floor      | 0.3%        | The largest building-wide batch, above Pig Iron's 31     |
| knockout       | Knockout         | 34 free upgrades on this floor                | 0.4%        | Above Cold Steel's 33 at 0.4%                            |
| pearlDiver     | Pearl Diver      | 27 payouts from the highest-earning floor     | 0.6%        | Above Lighthouse's 26 at 0.6%                            |
| roundAndRound  | Round and Round  | 23 payouts on alternating floors              | 0.8%        | The largest alternating payout, above Quicksilver's 21   |
| scratchCard    | Scratch Card     | 32 instant payouts on this floor              | 0.6%        | Above Gold Medal's 31, and rarer for it                  |
| silverware     | Silverware       | 29 upgrades on the highest unlocked floor     | 0.6%        | Above Captain Le Fluff's 28, below Golem's 35            |
| snakeEyes      | Snake Eyes       | 20 payouts on the highest unlocked floor      | 0.9%        | Above Friendly Fire's 18 at 1%                           |
| twentyOne      | Twenty-One       | 17 upgrades on this floor and every one below | 0.9%        | Above Chain Reaction's 16, and equally rare              |
| wheelOfFortune | Wheel of Fortune | 2 tier promotions, then 13 upgrades here      | 0.5%        | Above Runic Amulet's double promotion plus 11            |

All sixteen are single-shot and current-building only, with no map-specific
behavior. Half Life and Jackpot skip locked floors; Chain Reaction and
Twenty-One take the triggering floor plus everything below it; Double Helix and
Round and Round walk the building stride-by-2 from the ground floor. Bullseye
resolves the lowest-level unlocked floor, Silverware and Snake Eyes the highest
unlocked floor, and Pearl Diver / High Roller the current top earner by income
rate, so on a one-floor building all of those collapse onto the triggering
floor. Eureka and Wheel of Fortune promote the triggering floor's permanent
crit tier and stop at the strongest tier. No payout crit in this batch touches
floor collection timers.

Half Life and Jackpot sit at 0.3% — the Huge band — because paying or upgrading
every floor at that size reshapes the whole building at once.

### Processing and verification (sports, laboratory and casino floor)

All sixteen arrived already camelCased as `.png` sources, so each wrapper
passes `sourceExtension: ".png"` to `scripts/lib/process-crit-icon.mjs`. A
border scan confirmed a near-white background on every one, so the shared
border-seeded flood fill handled them with no tailored processor, across source
sizes from 1376x768 up to 2560x2560. A magenta contact sheet confirmed no
halos, with every detached element surviving: Pearl Diver's bubbles, Eureka's
floating bulb and spilled droplets, Chain Reaction's separate electrons, Snake
Eyes' two dice, Scratch Card's loose coin and High Roller's tipped chip.

Each icon ships as both `public/<name>.png` and `public/stickers/<name>.png`
via `scripts/lib/sticker-border.mjs`.

`node scripts/test-featured-crits.mjs` passes at 379 entries and
`npm run build` is clean. In-game celebration rendering and the Special Crits
menu were not exercised in a browser for this batch.

## Implemented asset batch: 2026-09-19 (high seas)

Six crits support upgrade clicks and floor unlocks through the shared
`applyFloorCrit` path. Rewards are immediate, existing crit balance is
unchanged, and proc chances apply only after a tier and the special gateway
land, before the shared proc cap; they are not per-click odds.

| Image             | Crit                | Immediate reward                              | Proc chance | Comparison                                                 |
| ----------------- | ------------------- | --------------------------------------------- | ----------- | ---------------------------------------------------------- |
| captainLeFluff    | Captain Le Fluff    | 28 upgrades on the highest unlocked floor     | 0.6%        | Above Eclipse's 27, below Golem's 35                       |
| divingBell        | Deep Dive           | 2 free upgrades per floor, cascading down     | 5%          | Bounce's own cascade at double the step, so half as likely |
| flooringInspector | Flooring Inspector  | 15 upgrades on this floor and every one below | 1%          | Above Warding Sigil's 13 at 1.1%                           |
| kraken            | Kraken              | 27 payouts on every unlocked floor            | 0.3%        | The largest building-wide payout, above Black Hole's 26    |
| lighthouse        | Lighthouse          | 26 payouts from the highest-earning floor     | 0.6%        | The largest top-earner payout, above Treasure Map's 25     |
| messageInABottle  | Message in a Bottle | 20 free upgrades on the lowest-level floor    | 1.6%        | Above Iron Key's 19 at 1.7%                                |

**Deep Dive** reuses Bounce's shape rather than a fixed target list: it always
falls one floor from the floor that crit, then re-rolls
`bounceContinueChance` to keep falling, upgrading every floor it reaches by 2
instead of Bounce's 1. It is deliberately rarer than `bounceChance` (5% against
8%) for that doubled step. Unlike Bounce it can't pay out nothing — landing on
the ground floor with nothing below it applies to the triggering floor instead,
which the suite's single-floor-fallback check enforces.

The other five are single-shot and current-building only, with no map-specific
behavior. Kraken skips locked floors; Flooring Inspector takes the triggering
floor plus everything below it; Message in a Bottle resolves the lowest-level
unlocked floor, Captain Le Fluff the highest unlocked floor, and Lighthouse the
current top earner by income rate, so on a one-floor building all three
collapse onto the triggering floor. No payout crit in this batch touches floor
collection timers.

Kraken sits at 0.3% — the Huge band — because 27 payouts across every floor
cashes out the whole building at once.

### Processing and verification (high seas)

All six arrived already camelCased as `.png` sources, so each wrapper passes
`sourceExtension: ".png"` to `scripts/lib/process-crit-icon.mjs`. A border scan
confirmed a near-white background on every one, so the shared border-seeded
flood fill handled them with no tailored processor, despite the sources varying
from 512x512 up to 1968x1968. A magenta contact sheet confirmed no halos, with
the diving bell's detached bubbles surviving and the lighthouse keeping its own
blue sky panel, which is part of the artwork rather than background.

Each icon ships as both `public/<name>.png` and `public/stickers/<name>.png`
via `scripts/lib/sticker-border.mjs`.

`node scripts/test-featured-crits.mjs` passes at 363 entries and
`npm run build` is clean. In-game celebration rendering and the Special Crits
menu were not exercised in a browser for this batch.

## Implemented asset batch: 2026-09-19 (cosmos and high seas)

Four crits from the space/sea gap batches support upgrade clicks and floor
unlocks through the shared `applyFloorCrit` path. Rewards are immediate,
existing crit balance is unchanged, and proc chances apply only after a tier
and the special gateway land, before the shared proc cap; they are not
per-click odds.

| Image         | Crit           | Immediate reward                          | Proc chance | Comparison                                              |
| ------------- | -------------- | ----------------------------------------- | ----------- | ------------------------------------------------------- |
| blackHole     | Black Hole     | 26 payouts on every unlocked floor        | 0.3%        | The largest building-wide payout, above Storm Fork's 25 |
| bottledNebula | Bottled Nebula | 1 tier promotion, then 16 upgrades here   | 0.6%        | One upgrade above Signet of Skulls's promotion plus 15  |
| eclipse       | Eclipse        | 27 upgrades on the highest unlocked floor | 0.7%        | Above Tempered's 25, below Golem's 35                   |
| treasureMap   | Treasure Map   | 25 payouts from the highest-earning floor | 0.7%        | The largest top-earner payout, above Titanium Grip's 24 |

All four are single-shot and current-building only, with no map-specific
behavior. Black Hole skips locked floors; Eclipse targets the highest unlocked
floor and Treasure Map the current top earner by income rate, so on a one-floor
building both collapse onto the triggering floor. Bottled Nebula promotes the
triggering floor's permanent crit tier and stops at the strongest tier. Neither
payout crit touches floor collection timers.

Black Hole sits at 0.3% — the Huge band — because 26 payouts across every floor
pays out the whole building at once.

### Processing and verification (cosmos and high seas)

All four arrived already camelCased as `.png` sources, so each wrapper passes
`sourceExtension: ".png"` to `scripts/lib/process-crit-icon.mjs`. A border scan
confirmed a near-white background on every one (corner values 253-254), so the
shared border-seeded flood fill handled them with no tailored processor. Each
output was checked over magenta: no halos, and the detached details survived
intact — Black Hole's floating sparkles and streaking comets, and Treasure
Map's dotted route, which is a run of individually disconnected dots.

Each icon ships as both `public/<name>.png` and `public/stickers/<name>.png`
via `scripts/lib/sticker-border.mjs`.

`node scripts/test-featured-crits.mjs` passes at 357 entries and
`npm run build` is clean. In-game celebration rendering and the Special Crits
menu were not exercised in a browser for this batch.

## Implemented asset batch: 2026-09-19 (cyber agents, metal loot and earth metals)

Thirty-five crits — six character portraits, six cyber-augmentation props,
eighteen pieces of fantasy metal loot, and five earth-metal items — support
upgrade clicks and floor unlocks through the shared `applyFloorCrit` path.
Rewards are immediate, existing crit balance is unchanged, and proc chances
apply only after a tier and the special gateway land, before the shared proc
cap; they are not per-click odds.

| Image          | Crit             | Immediate reward                              | Proc chance | Comparison                                                |
| -------------- | ---------------- | --------------------------------------------- | ----------- | --------------------------------------------------------- |
| annaNyavarre   | Anna Nyavarre    | 23 payouts from the highest-earning floor     | 0.8%        | Above Golden Stag's 22 at 0.8%                            |
| batteryCell    | Battery Life     | 16 free upgrades on the lowest-level floor    | 1.9%        | Between Penny Jar's 15 and Purr Denton's 17               |
| blackBlade     | Black Blade      | 31 free upgrades on this floor                | 0.4%        | Above Commando's 27, below Cold Steel's 33                |
| boneFlute      | Bone Solo        | 20 payouts on alternating floors              | 0.9%        | Above Swashbuckler's 19, below Quicksilver's 21           |
| coldSteel      | Cold Steel       | 33 free upgrades on this floor                | 0.4%        | The largest single-floor batch below Samurai's 30-plus    |
| commando       | Commando         | 27 free upgrades on this floor                | 0.6%        | Above JC Dentclaw's 26 at 0.5%                            |
| corvidCrown    | Corvid Crown     | 2 tier promotions, then 10 upgrades here      | 0.6%        | Above Adam Whiskersen's double promotion plus 8           |
| daedalynx      | Daedalynx        | 24 payouts on every unlocked floor            | 0.5%        | Above Bill Blizzard's 23 at 0.5%                          |
| dataCube       | Read The Emails  | 12 upgrades on this floor and every one below | 1.2%        | Above Gem Mine's 10 at 1.3%                               |
| dropTuned      | Drop Tuned       | 13 upgrades on alternating floors             | 1.1%        | Above Cash Cannon's 10 and The Fast and the Furriest's 12 |
| eternalFlame   | Eternal Flame    | 28 instant payouts on this floor              | 0.6%        | Above The Cure's 27, below Last Call's 29                 |
| forgeAhead     | Forge Ahead      | 30 free upgrades on every unlocked floor      | 0.3%        | Reshapes the whole building, above Shoulder Spikes's 29   |
| guntherHairman | Gunther Hairman  | 28 free upgrades on this floor                | 0.5%        | Above Commando's 27, below Wrist Work's 29                |
| heliopaws      | Heliopaws        | 26 free upgrades on every unlocked floor      | 0.4%        | Above Bob Pawge's 24 at 0.5%                              |
| hornsUp        | Horns Up         | 22 upgrades on the highest unlocked floor     | 0.9%        | Above Shred Metal's 21, below Tempered's 25               |
| ironKey        | Iron Key         | 19 free upgrades on the lowest-level floor    | 1.7%        | Above Studded Belt's 18 at 1.8%                           |
| lastCall       | Last Call        | 29 instant payouts on this floor              | 0.6%        | The largest single-floor payout below Despicable Fees     |
| nanoBlade      | Wrist Work       | 29 free upgrades on this floor                | 0.5%        | Above Gunther Hairman's 28, below Black Blade's 31        |
| peltCloak      | Pelt Cloak       | 14 upgrades on alternating floors             | 1%          | Above Drop Tuned's 13, and rarer for it                   |
| pigIron        | Pig Iron         | 31 free upgrades on every unlocked floor      | 0.3%        | The largest building-wide batch, above Forge Ahead's 30   |
| praxisKit      | Level Up         | 1 tier promotion, then 14 upgrades here       | 0.8%        | One upgrade above Midas Touch's single promotion plus 13  |
| quickSilver    | Quicksilver      | 21 payouts on alternating floors              | 0.8%        | The largest alternating payout, above Bone Solo's 20      |
| runicAmulet    | Runic Amulet     | 2 tier promotions, then 11 upgrades here      | 0.6%        | Above Corvid Crown's double promotion plus 10             |
| scaledGrip     | Scaled Grip      | 32 free upgrades on this floor                | 0.4%        | Between Black Blade's 31 and Cold Steel's 33              |
| securityTurret | Friendly Fire    | 18 payouts on the highest unlocked floor      | 1%          | Above Gold Mine's 15 at 1.2%                              |
| shoulderSpikes | Shoulder Spikes  | 29 free upgrades on every unlocked floor      | 0.4%        | Above Heliopaws's 26, below Forge Ahead's 30              |
| shredMetal     | Shred Metal      | 21 upgrades on the highest unlocked floor     | 1%          | Above Space's 20, below Horns Up's 22                     |
| signetOfSkulls | Signet of Skulls | 1 tier promotion, then 15 upgrades here       | 0.7%        | The largest single promotion below I Didn't Ask For This  |
| stormFork      | Storm Fork       | 25 payouts on every unlocked floor            | 0.4%        | The largest building-wide payout, above Daedalynx's 24    |
| studdedBelt    | Studded Belt     | 18 free upgrades on the lowest-level floor    | 1.8%        | Above Purr Denton's 17 at 1.9%                            |
| swashbuckler   | Swashbuckler     | 19 payouts on alternating floors              | 1%          | Above Fair Exchange's 18 at 1.1%                          |
| tempered       | Tempered         | 25 upgrades on the highest unlocked floor     | 0.8%        | Above Horns Up's 22, below Strong Return's 26             |
| theCure        | The Cure         | 27 instant payouts on this floor              | 0.7%        | Above Abra-Cash-Dabra's 25 at 2.5%                        |
| titaniumGrip   | Titanium Grip    | 24 payouts from the highest-earning floor     | 0.7%        | The largest top-earner payout, above Anna Nyavarre's 23   |
| wardingSigil   | Warding Sigil    | 13 upgrades on this floor and every one below | 1.1%        | Above Read The Emails's 12, and rarer for it              |

All thirty-five are single-shot and current-building only, with no map-specific
behavior. Building-wide entries skip locked floors; alternating entries walk
the building stride-by-2 from the ground floor, and Read The Emails / Warding
Sigil take the triggering floor plus everything below it. Battery Life, Iron
Key and Studded Belt resolve the lowest-level unlocked floor, Friendly Fire /
Horns Up / Shred Metal / Tempered the highest unlocked floor, and Anna
Nyavarre / Titanium Grip the current top earner by income rate — on a
one-floor building all of those collapse onto the triggering floor. Level Up,
Signet of Skulls, Corvid Crown and Runic Amulet promote the triggering floor's
permanent crit tier and stop at the strongest tier. No payout crit in this
batch touches floor collection timers.

Forge Ahead and Pig Iron sit at 0.3% — the Huge band — because 30 and 31 free
upgrades on *every* floor reshapes the whole building at once.

### Processing and verification (cyber agents, metal loot and earth metals)

This batch arrived as `.png` sources rather than the usual `.jfif`, so each
wrapper passes `sourceExtension: ".png"` to `scripts/lib/process-crit-icon.mjs`.
One source needed renaming (`data cube.png` → `dataCube.png`); the rest were
already camelCased. An alpha/border scan confirmed all thirty-five are fully
opaque on a near-white background (corner values 250-254), so the shared
border-seeded flood fill handled every one with no tailored processor and no
`sourceRect`. A magenta contact sheet of the outputs confirmed no halos and no
stray components across the batch.

Each icon ships as both `public/<name>.png` and `public/stickers/<name>.png`
via `scripts/lib/sticker-border.mjs`.

`node scripts/test-featured-crits.mjs` passes at 353 entries and
`npm run build` is clean. In-game celebration rendering and the Special Crits
menu were not exercised in a browser for this batch.

## Implemented asset batch: 2026-09-18 (gold, money and cyber-agents)

Twenty-five crits — nineteen gold/money props, one meme mount, and five
character portraits — support upgrade clicks and floor unlocks through the
shared `applyFloorCrit` path. Rewards are immediate, existing crit balance is
unchanged, and proc chances apply only after a tier and the special gateway
land, before the shared proc cap; they are not per-click odds.

| Image               | Crit                    | Immediate reward                              | Proc chance | Comparison                                                |
| ------------------- | ----------------------- | --------------------------------------------- | ----------- | --------------------------------------------------------- |
| adamWhiskersen      | Adam Whiskersen         | 2 tier promotions, then 8 upgrades here       | 0.7%        | One upgrade above Golden Chalice's double promotion       |
| bankroll            | Bankroll                | 25 free upgrades on this floor                | 0.6%        | Above Bullion Brigade's 24, below JC Dentclaw's 26        |
| billBlizzard        | Bill Blizzard           | 23 payouts on every unlocked floor            | 0.5%        | The largest building-wide payout, above Money Tree's 22   |
| bobPawge            | Bob Pawge               | 24 free upgrades on every unlocked floor      | 0.5%        | The largest building-wide batch, above Money Printer's 23 |
| bullionStack        | Bullion Brigade         | 24 free upgrades on this floor                | 0.7%        | Above Astralclaw Skyblade's 23 at 0.7%                    |
| cashCannon          | Cash Cannon             | 10 upgrades on alternating floors             | 1.3%        | Above Drizzt Do'Purrden's 9 at 1.3%                       |
| fairExchange        | Fair Exchange           | 18 payouts on alternating floors              | 1.1%        | Above Tap That Asset's 17                                 |
| gemMine             | Gem Mine                | 10 upgrades on this floor and every one below | 1.3%        | Between Mime Your Business's 8 and Bready or Not's 11     |
| goldMine            | Gold Mine               | 15 payouts on the highest unlocked floor      | 1.2%        | Larger than The Griffin Contract's 9 at 1.8%              |
| goldenChalice       | Golden Chalice          | 2 tier promotions, then 7 upgrades here       | 0.8%        | Between Elmiaowster's 6 and Adam Whiskersen's 8           |
| goldenGoose         | Golden Goose            | 21 payouts on every unlocked floor            | 0.7%        | Above Elven Songblade's 20 at 0.7%                        |
| goldenStag          | Golden Stag             | 22 payouts from the highest-earning floor     | 0.8%        | Above Liquid Assets's 21, and rarer for it                |
| handsomeJake        | Handsome Jake           | 18 upgrades on the highest unlocked floor     | 1.2%        | Between Strike It Rich's 16 and Robot Resources's 19      |
| jcDentclaw          | JC Dentclaw             | 26 free upgrades on this floor                | 0.5%        | The largest single-floor batch below Samurai's 30         |
| liquidAssets        | Liquid Assets           | 21 payouts from the highest-earning floor     | 0.9%        | Above Hearthpaw Shadowagent's 20 at 1%                    |
| midasTouch          | Midas Touch             | 1 tier promotion, then 13 upgrades here       | 0.9%        | Above Arcana's single promotion plus 12                   |
| moneyPrinter        | Money Printer           | 23 free upgrades on every unlocked floor      | 0.6%        | Above Vault Door's 22, below Bob Pawge's 24               |
| moneyTree           | Money Tree              | 22 payouts on every unlocked floor            | 0.6%        | Above Golden Goose's 21, below Bill Blizzard's 23         |
| nuggetAvalanche     | Nugget Avalanche        | 17 instant payouts on this floor              | 1.2%        | Between Chonk's 16 and Saphire's 18                       |
| pennyJar            | Penny Jar               | 15 free upgrades on the lowest-level floor    | 2%          | Above Wink Wink's 14 at 2.2%                              |
| purrDenton          | Purr Denton             | 17 free upgrades on the lowest-level floor    | 1.9%        | Above Penny Jar's 15, and rarer for it                    |
| strikeItRich        | Strike It Rich          | 16 upgrades on the highest unlocked floor     | 1.4%        | Between Sarevmeowk's 15 and Metal's 17                    |
| vaultDoor           | Vault Door              | 22 free upgrades on every unlocked floor      | 0.6%        | Above Captain of Industry's 21 at 1.1%                    |
| wishingWell         | Wishing Well            | 23 instant payouts on this floor              | 0.9%        | Between Megachonk's 22 and Diamond's 24                   |
| youKnowWhatStallion | You Know What, Stallion | 11 upgrades on alternating floors             | 1.2%        | Above Cash Cannon's 10, and rarer for it                  |

All twenty-five are single-shot and current-building only, with no map-specific
behavior. Building-wide entries skip locked floors; alternating entries (Cash
Cannon, Fair Exchange, You Know What Stallion) walk the building stride-by-2
from the ground floor, and Gem Mine takes the triggering floor plus everything
below it. Penny Jar and Purr Denton resolve the lowest-level unlocked floor,
Gold Mine / Handsome Jake / Strike It Rich the highest unlocked floor, and
Golden Stag / Liquid Assets the current top earner by income rate — on a
one-floor building all of those collapse onto the triggering floor. Midas
Touch, Golden Chalice and Adam Whiskersen promote the triggering floor's
permanent crit tier and stop at the strongest tier. No payout crit in this
batch touches floor collection timers.

### Processing and verification (gold, money and cyber-agents)

All twenty-five raw sources already arrived camelCased, and were processed with
`node scripts/process-<name>.mjs` around `scripts/lib/process-crit-icon.mjs`. A
raw contact sheet plus a border-pixel scan across the batch showed twenty-four
on a plain near-white background; only `jcDentclaw` shipped as a portrait canvas
letterboxed by mid-grey bars, which blocks the border-seeded flood fill from
ever starting. That case added a small `sourceRect` option to the shared
processor rather than a bespoke copy of it — the wrapper crops to the white
canvas (`left: 279, width: 690`) and the normal key then works, taking the
output from a full-frame 250x167 down to a tight 151x250. A magenta contact
sheet of the batch confirmed no halos, including Golden Goose's white goose,
which survives because the flood fill stops at its black outline.

Each icon ships as both `public/<name>.png` and `public/stickers/<name>.png`
via `scripts/lib/sticker-border.mjs`.

`node scripts/test-featured-crits.mjs` passes at 318 entries and
`npm run build` is clean. In-game celebration rendering and the Special Crits
menu were not exercised in a browser for this batch.

## Implemented asset batch: 2026-09-18 (Baldur's Gate cats)

Nineteen Baldur's-Gate-inspired cat crits support upgrade clicks and floor
unlocks through the shared `applyFloorCrit` path. Rewards are immediate,
existing crit balance is unchanged, and proc chances apply only after a tier
and the special gateway land, before the shared proc cap; they are not
per-click odds.

| Image                | Crit                  | Immediate reward                           | Proc chance | Comparison                                                       |
| -------------------- | --------------------- | ------------------------------------------ | ----------- | ---------------------------------------------------------------- |
| astapurrion          | Astapurrion           | 19 instant payouts on this floor           | 1%          | Above Nothing to See's 20 at 2%, rarer for the near-equal payout |
| astralclawSkyblade   | Astralclaw Skyblade   | 23 free upgrades on this floor             | 0.7%        | Larger and rarer than This Is The End's 22                       |
| drizztDoPurrden      | Drizzt Do'Purrden     | 9 upgrades on alternating floors           | 1.3%        | Above Magic Is A Tool's 8 at 1.7%                                |
| elmiaowster          | Elmiaowster           | 2 tier promotions, then 6 upgrades here    | 0.9%        | Same double promotion as Wizard, with a larger batch             |
| elvenSongblade       | Elven Songblade       | 20 payouts on every unlocked floor         | 0.7%        | Above Holy Guacamole's 19 at 1.2%                                |
| galepaw              | Galepaw               | 11 payouts on every unlocked floor         | 1.6%        | Between Cosmic Catapult's 9 and Inbox Zero Gravity's 12          |
| halsinpaw            | Halsinpaw             | 16 free upgrades on every unlocked floor   | 1%          | Above For The King's 15, below Waltz Street's 17                 |
| hearthpawShadowagent | Hearthpaw Shadowagent | 20 payouts from the highest-earning floor  | 1%          | One more payout than Whisker Wyll, one tick rarer                |
| imeown               | Imeown                | 13 free upgrades on the lowest-level floor | 2.4%        | Above Cake Day's 12 at 2.8%                                      |
| jaheirball           | Jaheirball            | 14 payouts on alternating floors           | 1.2%        | Between Princess's 13 and Over The Rainbow's 15                  |
| karlachonk           | Karlachonk            | 21 free upgrades on this floor             | 0.9%        | Above Obsidian Basilisk's 20 at 1%                               |
| laezclaw             | Lae'zclaw             | 19 free upgrades on this floor             | 1%          | Between The Siege Scratcher's 18 and Obsidian Basilisk's 20      |
| minscAndMeow         | Minsc and Meow        | 18 free upgrades on every unlocked floor   | 0.8%        | Above Halsinpaw's 16, and rarer for it                           |
| sarevmeowk           | Sarevmeowk            | 15 upgrades on the highest unlocked floor  | 1.5%        | Between Imperial Scepter's 13 and Metal's 17                     |
| shadowpurr           | Shadowpurr            | 1 tier promotion, then 11 upgrades here    | 1.1%        | Promotion shape like Arcana's 12, one upgrade smaller            |
| theEmpurror          | The Empurror          | 13 payouts on every unlocked floor         | 1.1%        | Between Inbox Zero Gravity's 12 and Yes Warchief's 14            |
| thisIsTheEnd         | This Is The End       | 22 free upgrades on this floor             | 0.8%        | Above Karlachonk's 21, and rarer for it                          |
| whiskerWyll          | Whisker Wyll          | 19 payouts from the highest-earning floor  | 1.1%        | Above Mint Condition's 18 at 1.5%                                |
| winkWink             | Wink Wink             | 14 free upgrades on the lowest-level floor | 2.2%        | One more upgrade than Imeown, one tick rarer                     |

All nineteen are single-shot and current-building only, with no map-specific
behavior. Building-wide entries (Halsinpaw, Minsc and Meow, Galepaw, The
Empurror, Elven Songblade) skip locked floors; alternating entries (Drizzt
Do'Purrden, Jaheirball) walk the building's floors stride-by-2 from the ground
floor. Imeown and Wink Wink both resolve the lowest-level unlocked floor, so on
a one-floor building they land on the triggering floor; Whisker Wyll and
Hearthpaw Shadowagent do the same via current income rate. Sarevmeowk targets
the highest unlocked floor. Shadowpurr and Elmiaowster promote the triggering
floor's permanent crit tier and stop at the strongest tier. No payout crit in
this batch touches floor collection timers.

### Processing and verification (Baldur's Gate cats)

Raw sources were renamed to camelCase (`src/assets/<name>.jfif`) — three
arrived with spaces (`Astralclaw Skyblade`, `Hearthpaw Shadowagent`,
`Elven Songblade`) — and processed with `node scripts/process-<name>.mjs`, each
a thin wrapper around `scripts/lib/process-crit-icon.mjs`. A contact sheet of
the raw batch confirmed all nineteen sit on a plain near-white background, so
the shared border-seeded flood fill handled every one; a magenta contact sheet
of the outputs confirmed no halos, with Shadowpurr's detached crescent moon and
Halsinpaw's deliberate brown backdrop panel both surviving intact. That
processor also emits the white-bordered sticker cut through
`scripts/lib/sticker-border.mjs`, so each icon ships as both
`public/<name>.png` and `public/stickers/<name>.png` (the latter is what
`loadAssets`' `critAssetUrl` loads).

Imeown and Wink Wink are two distinct pink-haired rogue illustrations from the
same source prompt, kept as separate crits with distinct labels and values.

`node scripts/test-featured-crits.mjs` passes at 293 entries and
`npm run build` is clean. In-game celebration rendering and the Special Crits
menu were not exercised in a browser for this batch.

## Implemented asset batch: 2026-09-18 (adventuring cats)

Four adventuring-cat crits support upgrade clicks and floor unlocks through the
shared `applyFloorCrit` path. Rewards are immediate, existing crit balance is
unchanged, and proc chances apply only after a tier and the special gateway
land, before the shared proc cap; they are not per-click odds.

| Image                | Crit                   | Immediate reward                          | Proc chance | Comparison                                                                 |
| -------------------- | ---------------------- | ----------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| bloodlineOmen        | Bloodline Omen         | 17 free upgrades on this floor            | 1.2%        | Between Relicblade Ronin's 16 at 1.1% and The Siege Scratcher's 18 at 1.4% |
| candleclawCatacomb   | Candleclaw Catacomb    | 14 instant payouts on this floor          | 1.3%        | One more payout than Moonlit Wyvern Hunt's 13 at 1.4%                      |
| emberPawPatrol       | Ember Paw Patrol       | 14 free upgrades on every unlocked floor  | 1.1%        | Building-wide batch above Ironpaw Vanguard's 11 at 1.8%                    |
| whiskerCoastSurvivor | Whisker Coast Survivor | 17 payouts from the highest-earning floor | 1.2%        | Larger and rarer than Wolfmark Wanderer's 11 at 2.1%                       |

All four are single-shot and current-building only, with no map-specific
behavior: Ember Paw Patrol's building-wide batch skips locked floors, and both
payout crits leave floor collection timers untouched. Bloodline Omen and
Candleclaw Catacomb act on the triggering floor, so on a one-floor building they
simply apply to that floor. Whisker Coast Survivor resolves its target by
current income rate among unlocked floors, which can be the triggering floor.

### Processing and verification (adventuring cats)

Raw sources were renamed to camelCase (`src/assets/<name>.jfif`) and processed
with `node scripts/process-<name>.mjs`, each a thin wrapper around
`scripts/lib/process-crit-icon.mjs`; all four had a near-white background that
the shared border-seeded flood fill removed cleanly, verified by compositing
each output over magenta. That processor now also emits the white-bordered
sticker cut through `scripts/lib/sticker-border.mjs`, so every icon ships as
both `public/<name>.png` and `public/stickers/<name>.png` (the latter is what
`loadAssets`' `critAssetUrl` loads). Regenerate every sticker with
`node scripts/add-sticker-borders.mjs`.

`node scripts/test-featured-crits.mjs` passes at 274 entries — it now asserts
the ≤250px indexed-alpha constraints on the sticker copy as well — and
`npm run build` is clean. In-game celebration rendering and the Special Crits
menu were not exercised in a browser for this batch.

## Implemented asset batch: 2026-09-18 (grimdark space cats)

Thirty-two original grimdark space-marine-inspired cat crits support upgrade
clicks and floor unlocks through the shared `applyFloorCrit` path. Rewards are
immediate, existing crit balance is unchanged, and proc chances apply only
after a tier and the special gateway land, before the shared proc cap; they are
not per-click odds.

The batch covers armored cat warriors, alchemists, chaplains, psykers, void
pilots, gothic starships, monster contracts, siege weapons, and party banners.
The full featured-crit regression now covers 269 entries.

## Implemented asset batch: 2026-09-18 (mythic creatures)

Eighteen mythic-creature featured crits support upgrade clicks and floor
unlocks through the shared `applyFloorCrit` path. Rewards are immediate,
existing crit balance is unchanged, and proc chances apply only after a tier
and the special gateway land, before the shared proc cap; they are not per-click
odds.

| Image             | Crit               | Immediate reward                                  | Proc chance | Comparison                                                           |
| ----------------- | ------------------ | ------------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| emberwingDragon   | Emberwing Dragon   | 18 upgrades on this floor                         | 1.5%        | Same single-floor scale as Victory Pose at 1.6%                      |
| moonlitKirin      | Moonlit Kirin      | 10 payouts from the highest-earning floor         | 1.3%        | Targeted payout rarer than Diamond Compass at 1.8%                   |
| pocketPhoenix     | Pocket Phoenix     | 7 upgrades on this floor                          | 2%          | Smaller single-floor reward than Emberwing Dragon                    |
| crystalGriffin    | Crystal Griffin    | 8 payouts on every unlocked floor                 | 1.7%        | Building-wide payout below Cosmic Catapult's 9 at 1.4%               |
| velvetManticore   | Velvet Manticore   | 1 tier promotion, then 9 upgrades on this floor   | 1.2%        | Promotion shape like Emerald Crown, with a larger batch              |
| frostfangYeti     | Frostfang Yeti     | 11 upgrades on every unlocked floor               | 2.2%        | Building-wide upgrade reward below Thunder Paws's 8 at 1.8%          |
| lanternKitsune    | Lantern Kitsune    | 6 instant payouts on this floor                   | 1.9%        | Smaller than Claw and Order's 6 at 2.4% only by equal count          |
| coralSeaSerpent   | Coral Sea Serpent  | 12 payouts on this floor                          | 1.6%        | Same single-floor count as Queue Royalty at 2.3%                     |
| clockworkMinotaur | Clockwork Minotaur | 13 free upgrades on this floor                    | 1.8%        | Similar to Imperial Scepter, but stays on the current floor          |
| starryCerberus    | Starry Cerberus    | 8 upgrades on alternating floors, from the ground | 1.4%        | Alternating upgrade pattern like Sidekick Shuffle at 2.1%            |
| goldenSphinx      | Golden Sphinx      | 10 upgrades on the highest unlocked floor         | 1.1%        | Targeted top-floor reward below Hard Carry's 14 at 1.9%              |
| mossbackTreant    | Mossback Treant    | 5 upgrades on every unlocked floor                | 2.1%        | Smaller building-wide reward than Ready Check's 6 at 1.3%            |
| rainbowAlicorn    | Rainbow Alicorn    | 9 payouts from the highest-earning floor          | 1.3%        | Same target as Moonlit Kirin, with one fewer payout                  |
| bogWitchFamiliar  | Bog Witch Familiar | 6 free upgrades on this floor                     | 2.5%        | Smaller single-floor reward than Pocket Phoenix                      |
| pearlHippocampus  | Pearl Hippocampus  | 7 instant payouts on this floor                   | 1.8%        | Between Claw and Order's 6 at 2.4% and Ruby Heart Relic's 12 at 2.4% |
| thunderbirdChick  | Thunderbird Chick  | 9 free upgrades on this floor                     | 1.6%        | Smaller single-floor reward than Emberwing Dragon                    |
| obsidianBasilisk  | Obsidian Basilisk  | 20 free upgrades on this floor                    | 1%          | Larger and rarer than Feline Fury's 16 at 1.5%                       |
| cloudNymph        | Cloud Nymph        | 5 payouts on every unlocked floor                 | 2.3%        | Smaller building-wide payout than Golden Fleece's 7 at 2%            |

The full featured-crit regression now covers 237 entries.

## Implemented asset batch: 2026-09-18 (valuables)

Nine new valuables-themed featured crits support upgrade clicks and floor
unlocks through the shared `applyFloorCrit` path. Rewards are immediate,
existing crit balance is unchanged, and proc chances apply only after a tier
and the special gateway land, before the shared proc cap; they are not per-click
odds.

| Image             | Crit               | Immediate reward                                 | Proc chance | Comparison                                                          |
| ----------------- | ------------------ | ------------------------------------------------ | ----------- | ------------------------------------------------------------------- |
| crystalDragonEgg  | Crystal Dragon Egg | 12 upgrades on this floor                        | 1.4%        | Same single-floor shape as Inventory Full, with rarer odds          |
| diamondCompass    | Diamond Compass    | 10 payouts from the highest-earning floor        | 1.8%        | Same target as Sharpshooter, with equal count at lower odds         |
| emeraldCrown      | Emerald Crown      | 1 tier promotion, then 8 upgrades on this floor  | 1.2%        | Similar promotion shape to Save Point Savings, with larger upgrades |
| goldenFleece      | Golden Fleece      | 7 payouts on every unlocked floor                | 2%          | Building-wide payout below Cosmic Catapult's 9 at 1.4%              |
| imperialScepter   | Imperial Scepter   | 13 upgrades on the highest unlocked floor        | 1.5%        | Below Hard Carry's 14 at 1.9% on the same target                    |
| rubyHeartRelic    | Ruby Heart Relic   | 12 instant payouts on this floor                 | 2.4%        | Same count as Queue Royalty at 2.3%, with a narrower target         |
| sapphireHourglass | Sapphire Hourglass | 9 payouts on alternating floors, from the ground | 1.7%        | Alternating-floor payout pattern like Critical Knit                 |
| vaultOfJewels     | Vault of Jewels    | 6 free upgrades on every unlocked floor          | 1.6%        | Building-wide upgrade reward below Thunder Paws's 8 at 1.8%         |
| goldenIdol        | Golden Idol        | 15 free upgrades on this floor                   | 1.1%        | Similar single-floor reward to Feline Fury, with rarer odds         |

The full featured-crit regression now covers 219 entries.

## Implemented asset batch: 2026-09-18 (superhero and magical sweets)

Fourteen new themed featured crits support upgrade clicks and floor unlocks
through the shared `applyFloorCrit` path. Rewards are immediate, existing crit
balance is unchanged, and proc chances apply only after a tier and the special
gateway land, before the shared proc cap; they are not per-click odds.

| Image               | Crit                  | Immediate reward                                  | Proc chance | Comparison                                                               |
| ------------------- | --------------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| purrfectOrigin      | Purrfect Origin       | 7 upgrades on this floor                          | 2.8%        | Smaller single-floor reward than Feline Fury's 16 at 1.5%                |
| capeEscape          | Cape Escape           | 10 payouts from the highest-earning floor         | 2%          | Same target as Sharpshooter, with equal count at lower odds              |
| thunderPaws         | Thunder Paws          | 8 upgrades on every unlocked floor                | 1.8%        | Building-wide upgrade reward below Mecha Middle Management's 12 at 1.6%  |
| clawAndOrder        | Claw and Order        | 6 instant payouts on this floor                   | 2.4%        | Smaller than Queue Royalty's 12 at 2.3%                                  |
| felineFury          | Feline Fury           | 16 free upgrades on this floor                    | 1.5%        | Same count as It Compiles! at 2.4%, but rarer                            |
| sidekickShuffle     | Sidekick Shuffle      | 7 upgrades on alternating floors, from the ground | 2.1%        | Alternating-floor scope like Critical Knit's payouts                     |
| cosmicCatapult      | Cosmic Catapult       | 9 payouts on every unlocked floor                 | 1.4%        | Building-wide payout below Speedrun Payroll's 15 at 1.4%                 |
| theMoonstoneKey     | The Moonstone Key     | 1 tier promotion, then 6 upgrades on this floor   | 1.2%        | Similar promotion shape to Save Point Savings at 1.2%                    |
| spellbookSupreme    | Spellbook Supreme     | 12 free upgrades on this floor                    | 1.9%        | Same count as Inventory Full at 2%, with slightly rarer odds             |
| prismPotion         | Prism Potion          | 14 payouts from the highest-earning floor         | 1.7%        | Targeted payout below Mint Condition's 18 at 1.5%                        |
| galaxyGumball       | Galaxy Gumball        | 11 instant payouts on this floor                  | 2.3%        | Between Lag Compensation's 9 at 2.6% and Loot Goblin's 16 at 2.2%        |
| treasureTruffle     | Treasure Truffle      | 5 upgrades and 5 payouts on this floor            | 2.6%        | Smaller mixed reward than One More Round's 8+8 at 2%                     |
| wizardsWaffle       | Wizard's Waffle       | 10 free upgrades on every unlocked floor          | 1.6%        | Building-wide upgrade reward below Thunder Paws' 8 at 1.8% only by scope |
| goldenFortuneCookie | Golden Fortune Cookie | 9 upgrades on the lowest-level floor              | 2%          | Similar low-floor target to Cache Me Outside's 8 at 2.6%                 |

The full featured-crit regression now covers 210 entries.

## Implemented asset batch: 2026-09-18 (gaming culture)

Nine new gaming-culture featured crits support upgrade clicks and floor unlocks
through the shared `applyFloorCrit` path. Rewards are immediate, existing crit
balance is unchanged, and proc chances apply only after a tier and the special
gateway land, before the shared proc cap; they are not per-click odds.

| Image              | Crit                | Immediate reward                          | Proc chance | Comparison                                                        |
| ------------------ | ------------------- | ----------------------------------------- | ----------- | ----------------------------------------------------------------- |
| couchCoOpCapital   | Couch Co-Op Capital | 9 upgrades on every unlocked floor        | 1.7%        | Building-wide reward below Mecha Middle Management's 12 at 1.6%   |
| hardCarry          | Hard Carry          | 14 upgrades on the highest unlocked floor | 1.9%        | Below Space Race's 20 at 2%; targets the top floor                |
| readyCheck         | Ready Check         | 6 upgrades on every unlocked floor        | 1.3%        | Smaller building-wide reward than Gummy Bear Market's 10 at 1.5%  |
| queueRoyalty       | Queue Royalty       | 12 payouts on this floor                  | 2.3%        | Same single-floor count as Ruby at 3%, with a rarer proc          |
| rankedAndBanked    | Ranked and Banked   | 11 upgrades on this floor                 | 2%          | Smaller than It Compiles!'s 15 at 2.4%                            |
| victoryPose        | Victory Pose        | 18 upgrades on this floor                 | 1.6%        | Same count as Jawbreaker at 2.8%, with rarer odds                 |
| emoteEconomy       | Emote Economy       | 8 payouts on every unlocked floor         | 2.7%        | Building-wide payout below Speedrun Payroll's 15 at 1.4%          |
| checkpointChampion | Checkpoint Champion | 10 upgrades on the highest unlocked floor | 1.5%        | Below Patch Notes Payday's 11 at 2.1% on the same target          |
| fishingForFunds    | Fishing for Funds   | 13 instant payouts on this floor          | 2.5%        | Between Lag Compensation's 9 at 2.6% and Loot Goblin's 16 at 2.2% |

The full featured-crit regression now covers 196 entries.

## Implemented asset batch: 2026-09-18 (nerd culture, continued)

Eight more nerd-culture featured crits support upgrade clicks and floor unlocks
through the shared `applyFloorCrit` path. Rewards are immediate, existing crit
balance is unchanged, and proc chances apply only after a tier and the special
gateway land, before the shared proc cap; they are not per-click odds.

| Image                 | Crit                    | Immediate reward                                 | Proc chance | Comparison                                                                      |
| --------------------- | ----------------------- | ------------------------------------------------ | ----------- | ------------------------------------------------------------------------------- |
| biggerOnTheInside     | Bigger on the Inside    | 10 payouts on every unlocked floor               | 1.8%        | Building-wide payout below Speedrun Payroll's 15 at 1.4%                        |
| cacheMeOutside        | Cache Me Outside        | 8 upgrades on the lowest-level floor             | 2.6%        | Between Min-Max Manager's 10 at 2.5% and Roundup Rodeo's 8 at 3.5%              |
| itCompiles            | It Compiles!            | 15 upgrades on this floor                        | 2.4%        | Same count as For the King's building-wide reward, but single-floor             |
| magicalPayrollGirl    | Magical Payroll Girl    | 1 tier promotion, then 10 upgrades on this floor | 1.1%        | Larger than Save Point Savings's 5 upgrades at 1.2%                             |
| mechaMiddleManagement | Mecha Middle Management | 12 upgrades on every unlocked floor              | 1.6%        | Building-wide upgrade reward below Gummy Bear Market's 10 at 1.5%               |
| mergeConflict         | Merge Conflict          | 7 upgrades and 7 payouts on this floor           | 2%          | Mixed single-floor reward, smaller than Clowning Around's building-wide effect  |
| mintCondition         | Mint Condition          | 18 payouts from the highest-earning floor        | 1.5%        | Below Sharpshooter's 10 payouts at 4% only because this is a rarer targeted hit |
| stackOverflowing      | Stack Overflowing       | 9 upgrades on the highest unlocked floor         | 2.2%        | Below Patch Notes Payday's 11 on the same target at 2.1%                        |
| oneMoreRound          | One More Round          | 8 upgrades and 8 payouts on this floor           | 2%          | Mixed single-floor reward, smaller than Merge Conflict's 7+7 at 2%              |

The full featured-crit regression now covers 186 entries.

## Implemented asset batch: 2026-09-18 (nerd culture)

Twelve new nerd-culture featured crits support upgrade clicks and floor unlocks
through the shared `applyFloorCrit` path. Rewards are immediate, existing crit
balance is unchanged, and proc chances apply only after a tier and the special
gateway land, before the shared proc cap; they are not per-click odds.

| Image               | Crit                 | Immediate reward                                 | Proc chance | Comparison                                                     |
| ------------------- | -------------------- | ------------------------------------------------ | ----------- | -------------------------------------------------------------- |
| dungeonAccountant   | Dungeon Accountant   | 9 upgrades on this floor                         | 2.8%        | Below Jawbreaker's 18 at 2.8%; a smaller single-floor reward   |
| lootGoblin          | Loot Goblin          | 16 payouts on this floor                         | 2.2%        | Between Mega Chonk's 22 at 2.2% and Ruby's 12 at 3%            |
| inventoryFull       | Inventory Full       | 12 upgrades on this floor                        | 2%          | Same count as Ninja Bonus at 2.5%; a common single-floor hit   |
| sideQuestSalary     | Side Quest Salary    | 7 payouts from the highest-earning floor         | 3%          | Smaller than Sharpshooter's 10 at 4%; targets the top earner   |
| minMaxManager       | Min-Max Manager      | 10 upgrades on the lowest-level floor            | 2.5%        | Between Roundup Rodeo's 8 at 3.5% and Ninja Bonus's 12 at 2.5% |
| criticalKnit        | Critical Knit        | 6 payouts on alternating floors, from the ground | 2.4%        | Narrower than Lollipop Guild's 12 at 1.8%; same target pattern |
| savePointSavings    | Save Point Savings   | 1 tier promotion, then 5 upgrades on this floor  | 1.2%        | Same promotion shape as Blessed, with a smaller upgrade batch  |
| achievementUnlocked | Achievement Unlocked | 1 tier promotion, then 8 upgrades on this floor  | 0.9%        | Rarer and larger than Save Point Savings                       |
| newGamePlus         | New Game Plus        | 20 upgrades on this floor                        | 1.8%        | Same count as Space Race at 2%, but stays on the landed floor  |
| speedrunPayroll     | Speedrun Payroll     | 15 payouts on every unlocked floor               | 1.4%        | Building-wide payout, below Would You Kindly's 16 at 1.5%      |
| lagCompensation     | Lag Compensation     | 9 payouts on this floor                          | 2.6%        | Smaller than Chonk's 16 at 2.8%; common single-floor reward    |
| patchNotesPayday    | Patch Notes Payday   | 11 upgrades on the highest unlocked floor        | 2.1%        | Below Space Race's 20 at 2%; targets the top floor             |

Processing: raw JFIF files were renamed to camelCase, processed with the shared
near-white-background icon processor, capped at 250x250, palette-quantized,
and written to `public/`. The focused suite now covers 178 featured crits.

## Implemented asset batch: 2026-09-18 (sweet tooth)

Seventeen sweet-themed featured crits support upgrade clicks and floor unlocks
through the shared `applyFloorCrit` path. Rewards are immediate, existing crit
balance is unchanged, and these proc chances apply only after a tier and the
special gateway land, before the shared proc cap; they are not per-click odds.

| Image                    | Crit                        | Immediate reward                                  | Proc chance | Comparison                                                      |
| ------------------------ | --------------------------- | ------------------------------------------------- | ----------- | --------------------------------------------------------------- |
| chocolateFountainOfYouth | Chocolate Fountain of Youth | 20 payouts on this floor                          | 2%          | Below Diamond's 24 payouts at 2%; targets the current floor     |
| gummyBearMarket          | Gummy Bear Market           | 10 upgrades on every unlocked floor               | 1.5%        | Below Dim Sum Dynasty's 15 at 1.6%; same building-wide scope    |
| jawbreaker               | Jawbreaker                  | 18 upgrades on this floor                         | 2.8%        | Between Ninja Bonus's 12 at 2.5% and Space Race's 20 at 2%      |
| licoriceLaces            | Licorice Laces              | 9 upgrades on the lowest-level floor              | 2.4%        | Above Roundup Rodeo's 8 at 3.5%; targets the weakest floor      |
| lollipopGuild            | Lollipop Guild              | 12 payouts on alternating floors, from the ground | 1.8%        | Above Sundae Best's 10 at 2.5%; narrower alternating scope      |
| marshmallowMountain      | Marshmallow Mountain        | 8 upgrades on the highest unlocked floor          | 2.6%        | Below Space Race's 20 at 2%; targets the top floor              |
| sugarHigh                | Sugar High                  | 5 upgrades and 5 payouts on every unlocked floor  | 1.2%        | Smaller mixed building-wide reward than Clowning Around at 3%   |
| bubblegumBalloon         | Bubblegum Balloon           | 15 payouts on this floor                          | 3%          | Between Diamond's 24 at 2% and Emerald's 9 at 4%                |
| candyCaneClimber         | Candy Cane Climber          | 12 upgrades on the highest unlocked floor         | 2.2%        | Below Space Race's 20; above Marshmallow Mountain's 8           |
| sherbetSherpa            | Sherbet Sherpa              | 8 payouts on every unlocked floor                 | 1.6%        | Below Yes Chef's 8 at 2.5% with a rarer matching payout         |
| toffeeTrap               | Toffee Trap                 | 7 upgrades on this floor                          | 2.7%        | Below Ninja Bonus's 12 at 2.5%; smaller single-floor reward     |
| cottonCandyCloud         | Cotton Candy Cloud          | 11 payouts on this floor                          | 2.4%        | Narrower single-floor payout than Diamond's 24 at 2%            |
| fudgeIt                  | Fudge It                    | 14 upgrades on this floor                         | 2.1%        | Same count as Bullet Dodger at 2.2%, but targets this floor     |
| gobstopperGetaway        | Gobstopper Getaway          | 13 upgrades on the highest unlocked floor         | 1.8%        | Below Space Race's 20 at 2%; targets the top floor              |
| jellyBeanJamboree        | Jelly Bean Jamboree         | 10 payouts on alternating floors, from the ground | 2.6%        | Same pattern as Lollipop Guild's 12 at 1.8%, with fewer payouts |
| rockCandyQuarry          | Rock Candy Quarry           | 1 tier promotion and 7 upgrades on this floor     | 1.4%        | Same promotion shape as Blessed, with a larger upgrade batch    |
| sprinkleStorm            | Sprinkle Storm              | 6 upgrades on every unlocked floor                | 3%          | Building-wide, smaller than Gummy Bear Market's 10 at 1.5%      |

Processing: raw PNG and JFIF files were renamed to camelCase, processed with the shared
near-white-background icon processor, capped at 250x250, palette-quantized,
and written to `public/`. Verified with `node scripts/test-featured-crits.mjs`
and `npm run build`; the suite now covers 166 featured crits.

## Implemented asset batch: 2026-09-17 (character art)

93 new crits from the character art drops, with instant rewards on upgrade
clicks and floor unlocks through the same `applyFloorCrit` function. Previous
crits remain available and their balance is unchanged. Proc chances below apply
after a tier and the special gateway land, before the shared proc cap. They are
not per-click odds.

| Image             | Crit                  | Immediate reward                                              | Proc chance | Comparison                                                                 |
| ----------------- | --------------------- | ------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| epic              | Epic Loot             | 40 upgrades on this floor                                     | 1.2%        | Above Samurai's 30 at 1.5%; below Centurion's 100 at 1%                    |
| ready             | Dual Wield            | 4 upgrades, then 4 payouts on the highest-earning floor       | 3%          | Sharpshooter pays 10 on the same target at 4% but grants no upgrades       |
| workWork          | Work Work             | 11 upgrades on every unlocked floor                           | 2.8%        | Between Roman Holiday's 9 at 3% and For the King's 15 at 2%                |
| yesWarchief       | Yes, Warchief         | 14 payouts on every unlocked floor                            | 1.8%        | Above Inbox Zero Gravity's 12 at 3% and Gold Rush's 10 at 2%               |
| youAreNotPrepared | Not Prepared          | 2 tier promotions, then 9 upgrades on this floor              | 0.5%        | Above Wizard's 2 promotions plus 5 upgrades at 0.6%; rarest of that family |
| arcana            | Arcane Surge          | 1 tier promotion, then 12 upgrades on this floor              | 0.9%        | Above Bean Counter's 1 promotion plus 6 upgrades at 1%                     |
| bigDaddy          | Big Daddy             | 45 upgrades on this floor                                     | 1.1%        | Between Epic Loot's 40 at 1.2% and Centurion's 100 at 1%                   |
| chonk             | Chonk                 | 16 payouts on this floor                                      | 2.8%        | Between Ruby's 12 at 3% and Sapphire's 18 at 2.5%                          |
| cyberPunk         | Cyberpunk             | 13 upgrades on this floor                                     | 2.4%        | Between Ninja Bonus's 12 at 2.5% and Space Race's 20 at 2%                 |
| dodgeThis         | Dodge This            | 6 payouts from the highest-earning floor                      | 4.5%        | Below Sharpshooter's 10 on the same target at 4%                           |
| whiteRabbit       | White Rabbit          | 5 upgrades here and 5 on the lowest-level floor               | 3.5%        | Reply All hits the same pair with 3 payouts instead of upgrades at 6%      |
| gladiator         | Gladiator             | 13 upgrades on every unlocked floor                           | 2.2%        | Between Fancy Friday's 10 at 2.5% and For the King's 15 at 2%              |
| iDidntAskForThis  | I Didn't Ask For This | 1 tier promotion, then 20 upgrades on this floor              | 0.7%        | Above Arcane Surge's 1 promotion plus 12 upgrades at 0.9%                  |
| iHatePortals      | I Hate Portals        | 11 payouts on this floor                                      | 3.5%        | Between Emerald's 9 at 4% and Ruby's 12 at 3%                              |
| littleSister      | Little Sister         | 7 upgrades on the lowest-level floor                          | 3.8%        | Between Office Clown's 5 at 4% and Roundup Rodeo's 8 at 3.5%               |
| magicIsATool      | Magic Is a Tool       | 8 upgrades on alternating unlocked floors, starting at ground | 1.8%        | High Society's pattern with upgrades instead of its 9 payouts at 3%        |
| megaChonk         | Mega Chonk            | 22 payouts on this floor                                      | 2.2%        | Between Sapphire's 18 at 2.5% and Diamond's 24 at 2%                       |
| metal             | Heavy Metal           | 17 upgrades on the highest unlocked floor                     | 2.4%        | Below Space Race's 20 on the same target at 2%                             |
| princess          | Princess Cut          | 13 payouts on alternating unlocked floors, starting at ground | 2.1%        | Above Sundae Best's 10 on the same pattern at 2.5%                         |
| spaceAndTime      | Space and Time        | 9 upgrades on this floor and every floor below                | 3%          | Above Moonwalk's 6 on the same downward span at 4%                         |
| thinkWithYourHead | Think With Your Head  | 5 upgrades, then 5 payouts on the lowest-level floor          | 4%          | Above Check Up's 4 upgrades plus 2 payouts on the same target at 5%        |
| wouldYouKindly    | Would You Kindly      | 16 payouts on every unlocked floor                            | 1.5%        | Above Yes, Warchief's 14 at 1.8%; the largest building-wide payout         |
| yesYourHighness   | Yes, Your Highness    | 19 upgrades on every unlocked floor                           | 1.7%        | Between For the King's 15 at 2% and For the Emperor's 25 at 1.5%           |

Four more from the follow-up Matrix-themed drop, wired the same way:

| Image            | Crit               | Immediate reward                                                    | Proc chance | Comparison                                                           |
| ---------------- | ------------------ | ------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| bulletDodger     | Bullet Dodger      | 14 upgrades on this floor                                           | 2.2%        | Between Cyberpunk's 13 at 2.4% and Space Race's 20 at 2%             |
| nothingToSee     | Nothing to See     | 20 payouts on this floor                                            | 2.4%        | Between Sapphire's 18 at 2.5% and Mega Chonk's 22 at 2.2%            |
| nowIAmSuspicious | Now I'm Suspicious | 17 payouts on every unlocked floor                                  | 1.3%        | Above Would You Kindly's 16 at 1.5%; largest building-wide payout    |
| redOrBlue        | Red or Blue        | 6 upgrades on the lowest-level floor; 6 payouts from the top earner | 3%          | Honor among thieves pays 7 and upgrades 3 across the same pair at 3% |

Ten more from the "big personalities" drop, wired the same way. Their raw files
arrived with spaces and dashes in the names and were renamed to camelCase first:

| Image              | Crit                 | Immediate reward                                   | Proc chance | Comparison                                                        |
| ------------------ | -------------------- | -------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| abraCashDabra      | Abra-Cash-Dabra      | 25 payouts on this floor                           | 1.8%        | Above Diamond's 24 at 2%; the largest single-floor payout         |
| captainOfIndustry  | Captain of Industry  | 21 upgrades on every unlocked floor                | 1.6%        | Between Yes, Your Highness's 19 at 1.7% and For the Emperor's 25  |
| clowningAround     | Clowning Around      | 3 upgrades, then 3 payouts on every unlocked floor | 3%          | First Responder pays 1 per floor with the same 3 upgrades at 4%   |
| discoDividend      | Disco Dividend       | 11 payouts on alternating floors, from the ground  | 2.4%        | Between Sundae Best's 10 at 2.5% and Princess Cut's 13 at 2.1%    |
| mimeYourBusiness   | Mime Your Business   | 8 upgrades on this floor and every floor below     | 3.5%        | Between Moonwalk's 6 at 4% and Space and Time's 9 at 3%           |
| redCarpetTreatment | Red Carpet Treatment | 12 payouts from the highest-earning floor          | 3%          | Above Sharpshooter's 10 at 4%; below Champagne Problems' 15 at 2% |
| rockTheStock       | Rock the Stock       | 16 upgrades on this floor                          | 2.1%        | Between Bullet Dodger's 14 at 2.2% and Space Race's 20 at 2%      |
| strongReturn       | Strong Return        | 26 upgrades on the highest unlocked floor          | 1.7%        | Between Space Race's 20 at 2% and King of the World's 30 at 1.5%  |
| theBigCheese       | The Big Cheese       | 2 tier promotions, then 30 upgrades on this floor  | 0.4%        | Above Not Prepared's 2 promotions plus 9 upgrades at 0.5%         |
| queenOfQueens      | Queen of Queens      | 28 upgrades on every unlocked floor                | 1.3%        | Above For the Emperor's 25 at 1.5%; largest building-wide batch   |

Nine more from the "impossible good luck" drop, also renamed to camelCase first:

| Image                | Crit               | Immediate reward                                   | Proc chance | Comparison                                                         |
| -------------------- | ------------------ | -------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| bubbleEconomy        | Bubble Economy     | 7 payouts on this floor                            | 4.5%        | Between Amethyst's 6 at 5% and Emerald's 9 at 4%                   |
| cloudNineToFive      | Cloud Nine to Five | 9 payouts on every unlocked floor                  | 2.2%        | Between Yes Chef's 8 at 2.5% and Gold Rush's 10 at 2%              |
| luckyLaundromat      | Lucky Laundromat   | 5 upgrades, then 5 payouts on every unlocked floor | 2%          | Above Clowning Around's 3 upgrades plus 3 payouts at 3%            |
| moneyMagnet          | Money Magnet       | 14 payouts from the highest-earning floor          | 2.5%        | Between Red Carpet Treatment's 12 at 3% and Champagne's 15 at 2%   |
| overTheRainbow       | Over the Rainbow   | 15 payouts on alternating floors, from the ground  | 1.8%        | Above Princess Cut's 13 at 2.1%; largest alternating payout        |
| pocketDimension      | Pocket Dimension   | 18 upgrades on this floor and every floor below    | 2%          | Double Space and Time's 9 on the same downward span at 3%          |
| shootingStarEmployee | Shooting Star      | 23 upgrades on the highest unlocked floor          | 1.9%        | Between Space Race's 20 at 2% and Strong Return's 26 at 1.7%       |
| treasureMeasure      | Treasure Measure   | 10 upgrades on the lowest-level floor              | 3.2%        | Between Roundup Rodeo's 8 at 3.5% and Cake Day's 12 at 3%          |
| wishfulBanking       | Wishful Banking    | 2 tier promotions, then 12 upgrades on this floor  | 0.45%       | Between Not Prepared's 2 plus 9 at 0.5% and Big Cheese's 2 plus 30 |

Eleven more from the "movie references" drop, also renamed to camelCase first.
The film titles are reference notes only; the artwork and labels are original
parodies with no logos or poster layouts:

| Image                   | Crit                      | Immediate reward                                   | Proc chance | Comparison                                                          |
| ----------------------- | ------------------------- | -------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| backToTheFiscal         | Back to the Fiscal        | 11 upgrades on this floor                          | 2.6%        | Between Keynote's 10 at 3% and Ninja Bonus's 12 at 2.5%             |
| despicableFees          | Despicable Fees           | 30 payouts on this floor                           | 1.6%        | Above Abra-Cash-Dabra's 25 at 1.8%; largest single-floor payout     |
| howToTrainYourManager   | Train Your Manager        | 4 upgrades, then 6 payouts on this floor           | 4%          | Donut Disturb pays 5 with 5 upgrades at 5%; more cash, fewer levels |
| jurassicPerk            | Jurassic Perk             | 13 payouts on this floor                           | 2.9%        | Between Ruby's 12 at 3% and Chonk's 16 at 2.8%                      |
| raidersOfTheLostReceipt | Lost Receipt              | 9 upgrades on the lowest-level floor               | 3.4%        | Between Roundup Rodeo's 8 at 3.5% and Treasure Measure's 10         |
| theDevilWearsPawda      | The Devil Wears Pawda     | 14 upgrades on the cheapest-to-upgrade floor       | 2.8%        | The Law Won gives 6 upgrades plus 2 payouts to the same target      |
| theExpenseMatrix        | The Expense Matrix        | 18 payouts on every unlocked floor                 | 1.2%        | Above Now I'm Suspicious's 17 at 1.3%; largest building-wide payout |
| theFastAndTheFurriest   | The Fast and the Furriest | 12 upgrades on alternating floors, from the ground | 1.5%        | Above Magic Is a Tool's 8 on the same pattern at 1.8%               |
| theFellowshipOfTheBling | Fellowship of the Bling   | 6 upgrades, then 6 payouts on every unlocked floor | 1.6%        | Above Lucky Laundromat's 5 upgrades plus 5 payouts at 2%            |
| theGreatCatsby          | The Great Catsby          | 1 tier promotion, then 30 upgrades on this floor   | 0.65%       | Above I Didn't Ask For This's 1 promotion plus 20 at 0.7%           |
| theLordOfTheRingBinders | The Ring Binders          | 35 upgrades on this floor                          | 1.3%        | Between Samurai's 30 at 1.5% and Epic Loot's 40 at 1.2%             |

Twelve more from the "dance floor profits" drop plus one standalone
`prehistoric` source, also renamed to camelCase first:

| Image            | Crit              | Immediate reward                                   | Proc chance | Comparison                                                               |
| ---------------- | ----------------- | -------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| breakEven        | Break Even        | 8 upgrades on this floor                           | 4.5%        | Below Hammer Time's 9 at 4%; the cheapest single-floor batch             |
| chaChaChing      | Cha-Cha-Ching     | 8 payouts on this floor                            | 4.2%        | Between Bubble Economy's 7 at 4.5% and Emerald's 9 at 4%                 |
| charlestonCharge | Charleston Charge | 11 upgrades on the lowest-level floor              | 3.1%        | Between Treasure Measure's 10 at 3.2% and Cake Day's 12 at 3%            |
| congaCompounding | Conga Compounding | 4 upgrades, then 4 payouts on every unlocked floor | 2.5%        | Between Clowning Around's 3 plus 3 at 3% and Lucky Laundromat's 5 plus 5 |
| robotResources   | Robot Resources   | 19 upgrades on the highest unlocked floor          | 2.2%        | Between Heavy Metal's 17 at 2.4% and Space Race's 20 at 2%               |
| rumbaReturns     | Rumba Returns     | 21 payouts on this floor                           | 2.3%        | Between Nothing to See's 20 at 2.4% and Mega Chonk's 22 at 2.2%          |
| salsaSalary      | Salsa Salary      | 13 payouts from the highest-earning floor          | 2.7%        | Between Red Carpet Treatment's 12 at 3% and Money Magnet's 14            |
| shuffleTheFunds  | Shuffle the Funds | 14 upgrades on this floor and every floor below    | 2.5%        | Between Space and Time's 9 at 3% and Pocket Dimension's 18 at 2%         |
| tangoTender      | Tango Tender      | 7 upgrades here and 7 on the highest floor         | 2.8%        | The largest of the paired batches; Party Crasher gives 3 and 3 at 5%     |
| tapThatAsset     | Tap That Asset    | 17 payouts on alternating floors, from the ground  | 1.6%        | Above Over the Rainbow's 15 on the same pattern at 1.8%                  |
| waltzStreet      | Waltz Street      | 17 upgrades on every unlocked floor                | 1.8%        | Between For the King's 15 at 2% and Yes, Your Highness's 19              |
| prehistoric      | Prehistoric       | 1 tier promotion, then 40 upgrades on this floor   | 0.55%       | Above The Great Catsby's 1 promotion plus 30 at 0.65%                    |

Twelve more from the "comfort food" drop plus three standalone hero sources,
also renamed to camelCase first:

| Image                | Crit                    | Immediate reward                                  | Proc chance | Comparison                                                          |
| -------------------- | ----------------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| breadyOrNot          | Bready or Not           | 11 upgrades here and every floor below            | 2.8%        | Between Space and Time's 9 at 3% and Shuffle the Funds' 14 at 2.5%  |
| eggcellentWork       | Egg-cellent Work        | 1 tier promotion, then 8 upgrades on this floor   | 0.95%       | Above Bean Counter's 1 promotion plus 6 upgrades at 1%              |
| holyGuacamole        | Holy Guacamole          | 19 payouts on every unlocked floor                | 1.1%        | Above The Expense Matrix's 18 at 1.2%; largest building-wide payout |
| loafActually         | Loaf Actually           | 12 upgrades on every unlocked floor               | 2.6%        | Between Work Work's 11 at 2.8% and Gladiator's 13 at 2.2%           |
| pastaLaVista         | Pasta La Vista          | 16 payouts on alternating floors, from the ground | 1.7%        | Between Over the Rainbow's 15 at 1.8% and Tap That Asset's 17       |
| souperStar           | Souper Star             | 16 payouts from the highest-earning floor         | 1.9%        | Above Champagne Problems' 15 at 2% on the same target               |
| tacoBoutIt           | Taco 'Bout It           | 4 upgrades here and 4 on the lowest-level floor   | 4%          | A smaller, likelier White Rabbit, which gives 5 and 5 at 3.5%       |
| theGreatPancakeStack | The Great Pancake Stack | 21 upgrades here and every floor below            | 1.8%        | Above Pocket Dimension's 18 on the same downward span at 2%         |
| wokAndRoll           | Wok and Roll            | 24 upgrades on the highest unlocked floor         | 1.8%        | Between Shooting Star's 23 at 1.9% and Strong Return's 26 at 1.7%   |
| iAmTheNight          | I Am the Night          | 27 upgrades on every unlocked floor               | 1.4%        | Between For the Emperor's 25 at 1.5% and Queen of Queens' 28        |
| tubs                 | Tubs                    | 26 payouts on this floor                          | 1.7%        | Between Abra-Cash-Dabra's 25 at 1.8% and Despicable Fees' 30        |
| whySoSerious         | Why So Serious          | 2 tier promotions, then 20 upgrades on this floor | 0.35%       | The rarest promotion proc; The Big Cheese gives 2 plus 30 at 0.4%   |

Seven more from the remaining comfort-food sources plus one standalone golem,
with every source name normalized to lower camelCase before processing:

| Image              | Crit                 | Immediate reward                                  | Proc chance | Comparison                                                          |
| ------------------ | -------------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| avocardio          | Avocardio            | 15 upgrades on this floor                         | 3.5%        | Between Epic Loot's 40 at 1.2% and Hammer Time's 9 at 4%            |
| butterBelieveIt    | Butter Believe It    | 18 instant payouts on this floor                  | 2.4%        | Between Sapphire's 18 at 2.5% and Mega Chonk's 22 at 2.2%           |
| cheesePullChampion | Cheese Pull Champion | 6 upgrades and 6 payouts on this floor            | 2.2%        | Smaller than Donut Disturb's 5 and 5 at 5%, but slightly rarer      |
| grillSergeant      | Grill Sergeant       | 20 free upgrades on every unlocked floor          | 1.3%        | Between I Am the Night's 27 at 1.4% and Queen of Queens' 28         |
| noodleNap          | Noodle Nap           | 22 payouts on alternating floors, from the ground | 1.5%        | Between Pasta La Vista's 16 at 1.7% and Tap That Asset's 17 at 1.6% |
| picklePredicament  | Pickle Predicament   | 8 upgrades on the lowest-level floor              | 3.2%        | Between Treasure Measure's 10 at 3.2% and Little Sister's 7 at 3.8% |
| golem              | Golem                | 35 free upgrades on the highest floor             | 1.15%       | Between Big Daddy's 45 at 1.1% and Epic Loot's 40 at 1.2%           |

Five more from the remaining comfort-food drop, renamed to lower camelCase
before processing:

| Image               | Crit                  | Immediate reward                          | Proc chance | Comparison                                                       |
| ------------------- | --------------------- | ----------------------------------------- | ----------- | ---------------------------------------------------------------- |
| hotPotato           | Hot Potato            | 18 instant payouts on this floor          | 3.4%        | Between Bubble Economy's 7 at 4.5% and Mega Chonk's 22 at 2.2%   |
| brunchBoss          | Brunch Boss           | 7 upgrades and 7 payouts on this floor    | 2.1%        | Between Cheese Pull Champion's 6 and 6 at 2.2% and Donut Disturb |
| curryFavour         | Curry Favour          | 14 payouts from the highest-earning floor | 1.8%        | Between Souper Star's 16 at 1.9% and Money Magnet's 14 at 2.5%   |
| dimSumDynasty       | Dim Sum Dynasty       | 15 free upgrades on every unlocked floor  | 1.6%        | Between Grill Sergeant's 20 at 1.3% and Work Work's 11 at 2.8%   |
| soupDumplingSurgeon | Soup Dumpling Surgeon | 5 upgrades and 10 payouts on this floor   | 1.2%        | Between Donut Disturb's 5 and 5 at 5% and Ballerina's 3 and 3    |

All targets are within the current building and exclude locked floors. The base
tier's free upgrades occur before the special reward and its target selection.
Payouts mean current income cycles, not seconds or banked cash, and leave timer
progress unchanged. Upgrade/payout combinations pay at the post-upgrade rate.
Dual Wield and Dodge This resolve their target before upgrading or paying, so on
a tie the triggering floor wins; Little Sister, Think With Your Head, White
Rabbit, Red or Blue, Treasure Measure, Lost Receipt, The Devil Wears Pawda and
Charleston Charge break lowest-level, cheapest and top-earner ties the same way.
White Rabbit grants its upgrades once when the triggering floor is already the
lowest-level floor, not twice. Red or Blue resolves its two targets
independently and can land both on the same floor. Tango Tender and Taco 'Bout
It upgrade twice over when the triggering floor is already their second target,
exactly like Party Crasher and Finger Guns.
Magic Is a Tool, Princess Cut, Disco Dividend, Over the Rainbow, The Fast and
the Furriest, Tap That Asset and Pasta La Vista always select indices 0, 2, 4
and so on. Space and Time, Mime Your Business, Pocket Dimension, Shuffle the
Funds, Bready or Not and The Great Pancake Stack cover indices 0 through the
triggering floor inclusive.

Noodle Nap uses the same alternating-floor selection, while Grill Sergeant
upgrades every unlocked floor and Golem targets the highest unlocked floor.

Promotions cap at ultra; Arcane Surge, I Didn't Ask For This, Not Prepared,
The Big Cheese, Wishful Banking, The Great Catsby, Prehistoric, Egg-cellent Work
and Why So Serious still grant their free upgrades on an already-ultra floor. On
a one-floor building every target resolves to that floor. Repeated procs stay
additive and no new timed state exists.

All 93 are floor-only, not map-specific: their generated test buttons appear for
Upgrade click and Floor unlock and stay hidden for Map unlock.

### Processing and verification (character art)

The earlier 81 raw JFIF sources are preserved. The seven new PNG/JPG sources
arrived with spaces or title-case names and were renamed to lower camelCase to
match the `IMAGE_FILES` key convention before processing. Their wrappers use an
explicit source path so generated icons do not overwrite raw inputs.
Sampled border whiteness ran 240-255 on most images; `whiteRabbit`, `megaChonk`,
`nowIAmSuspicious`, `bubbleEconomy`, `cloudNineToFive`, `overTheRainbow`,
`breadyOrNot`, `holyGuacamole`, `tacoBoutIt` and `wokAndRoll` dip lower because
their artwork touches the frame edge, but since the shared border fill only
seeds bright border pixels, those needed no special handling either.
Every enclosed light detail (armour highlights, muzzles, bone charms, a
blindfold, white faces and bellies, visor glass, shirt collars, red/blue pills,
the mime's glass safe, a translucent soap bubble, a white cloud, the washing
machine drum, the magnet poles, a cracked eggshell, coffee mugs, receipts, a
white dinner jacket, a cardboard robot suit, a chef's hat and coat) is closed by
a dark outline, so 78 of the 81 earlier sources used the existing near-white border-fill
processor with no seeds or threshold changes.

`tangoTender`, `pastaLaVista` and `whySoSerious` are the exceptions and go
through `scripts/lib/process-sticker-crit-icon.mjs` instead. Those sources ship
as "stickers": a thick white ring or badge disc around the subject, fenced off
from the real background by the sticker's own thin mid-gray stroke (sampled at
whiteness ~109-163), which the shared border-seeded fill cannot cross — so the
shared processor left a visible white halo. The sticker processor takes a seed
inside the ring (which clears the whole connected band), erodes the leftover
stroke, and keeps only the largest opaque component so the stroke cannot survive
as a floating outline. `pastaLaVista` needs a second seed because its raised
fork splits the badge ring into two arcs, and its seeds are deliberately placed
away from the chef's white hat and coat so those survive; its dark badge circle
is connected to the cat and is kept as part of the artwork. Shared thresholds
were not touched, so no other icon is affected.

Only reach for the sticker processor when a magenta-composite check actually
shows a halo: it ends in `keepLargestOpaqueComponent`, which would discard
genuinely detached artwork such as Dodge This's pistol or Clowning Around's
juggled coins.

Regenerate with `node scripts/process-<image>.mjs`; the wrappers call
`scripts/lib/process-crit-icon.mjs` and write both `src/assets/<image>.png` and
`src/assets/themes/references/dist/<image>.png`. Note `whiteRabbit.png` comes
from `whiteRabbit.jfif`, renamed from `followTheWhiteRabbit.jfif`.

Magenta-background inspection confirmed intact enclosed highlights, detached
pistols, warglaive blades, in-flight bullets and juggled coins, feet, tails and
crop bounds, and that `tangoTender` no longer carries its sticker halo. Outputs
all fit within 250x250 as indexed-palette PNGs with alpha at 13.7-31.9 KB, and
every root/shipped pair is byte-identical.

Validation: `node scripts/test-featured-crits.mjs` passed all 149 featured
rewards (including these 93) and `npm run build` passed. Browser behaviour for
this batch was not verified in-game.

## Implemented asset batch: 2026-09-17

44 new crits, with instant rewards on upgrade clicks and floor unlocks through
the same `applyFloorCrit` function. Previous crits remain available and their
balance is unchanged; this report replaces the previous batch report only.
Proc chances below apply after a tier and the special gateway land, before
the shared proc cap. They are not per-click odds.

| Image             | Crit                | Immediate reward                                                | Proc chance | Comparison                                                                      |
| ----------------- | ------------------- | --------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| amethyst          | Amethyst            | 6 payouts on this floor                                         | 5%          | Above Overflow's 5 at 6%; does not restart the timer                            |
| blessed           | Blessed             | 1 tier promotion, then 3 upgrades here                          | 1%          | Upgrade plus immediate upgrades; smaller promotion than Obelisk at 0.8%         |
| centurion         | Centurion           | 100 upgrades on this floor                                      | 1%          | Above Samurai's 30 at 1.5%; below Lucky Clover's 500 at 0.4%                    |
| checkUp           | Check Up            | 4 upgrades, then 2 payouts on the lowest-level floor            | 5%          | Roundup Rodeo's target, but 4 upgrades plus cash instead of 8 upgrades          |
| diamond           | Diamond             | 24 payouts on this floor                                        | 2%          | Above Sapphire's 18 at 2.5%                                                     |
| emerald           | Emerald             | 9 payouts on this floor                                         | 4%          | Above Amethyst's 6 at 5%                                                        |
| fireman           | First Responder     | 3 upgrades, then 1 payout on every unlocked floor               | 4%          | Fire Drill's building-wide payout plus upgrades, without timer resets           |
| forTheEmperor     | For the Emperor     | 25 upgrades on every unlocked floor                             | 1.5%        | Above For the King's 15 at 2%; up to 500 free upgrades                          |
| forTheKing        | For the King        | 15 upgrades on every unlocked floor                             | 2%          | Above Fancy Friday's 10 at 2.5%                                                 |
| goldNugget        | Gold Nugget         | 4 payouts on this floor                                         | 7%          | Below Overflow's 5 at 6%; preserves the timer                                   |
| goldRush          | Gold Rush           | 10 payouts on every unlocked floor                              | 2%          | Above Yes Chef's 8 at 2.5%                                                      |
| hammerTime        | Hammer Time         | 9 upgrades on this floor                                        | 4%          | Below Keynote's 10 at 3%                                                        |
| robinHood         | Honor among thieves | 7 top-earner payouts, then 3 upgrades on the lowest-level floor | 3%          | Sharpshooter pays 10 without the targeted upgrades; no income is taken away     |
| roman             | Roman Holiday       | 9 upgrades on every unlocked floor                              | 3%          | Between Flamenco's 7 at 3.5% and Fancy Friday's 10 at 2.5%                      |
| ruby              | Ruby                | 12 payouts on this floor                                        | 3%          | Above Emerald's 9 at 4%                                                         |
| samurai           | Samurai             | 30 upgrades on this floor                                       | 1.5%        | Above Ninja Bonus's 12 at 2.5% and Space Race's top-floor 20 at 2%              |
| saphire           | Sapphire            | 18 payouts on this floor                                        | 2.5%        | Above Ruby's 12 at 3%; raw asset spelling retained                              |
| silverRush        | Silver Rush         | 6 payouts on every unlocked floor                               | 3.5%        | Between Dinner Time's 5 at 4% and Yes Chef's 8 at 2.5%                          |
| spy               | Undercover          | 17 upgrades on the lowest-income-rate floor                     | 2.2%        | Roundup Rodeo gives 8 to the lowest-level floor, a different target             |
| theLawWon         | The Law Won         | 6 upgrades, then 2 payouts on the cheapest-upgrade floor        | 4.5%        | Safety Net gives 5 upgrades to the most expensive floor instead                 |
| victorian         | High Society        | 9 payouts on alternating unlocked floors, starting at ground    | 3%          | Yes Chef pays 8 everywhere at 2.5%; this pays more per target but fewer targets |
| wizard            | Wizard              | 2 tier promotions, then 5 upgrades here                         | 0.6%        | Above Obelisk's 2 promotions plus 2 upgrades at 0.8%                            |
| executiveSpin     | Executive Spin      | 4 upgrades on the highest unlocked floor                        | 5%          | Above Space Race's 20 on the top floor at 2% only when the target is topmost    |
| rubberStampede    | Rubber Stampede     | 7 payouts on every unlocked floor                               | 2.5%        | Above Silver Rush's 6 at 3.5%; broad building-wide cash effect                  |
| replyAll          | Reply All           | 3 payouts on this floor and the lowest-level floor              | 6%          | More targeted than Dinner Time's 5 everywhere at 4%                             |
| stapleOfSuccess   | Staple of Success   | 7 upgrades on this floor                                        | 4%          | Between Hammer Time's 9 at 4% and Tea Break's 1 at 8%                           |
| faxOfFortune      | Fax of Fortune      | 8 payouts from the highest-earning floor                        | 3.5%        | Sharpshooter pays 10 at 4%; this keeps the same target with a lower payout      |
| casualMonday      | Casual Monday       | 20 upgrades on this floor                                       | 2.5%        | Below Samurai's 30 at 1.5%; twice Keynote's 10 at 3%                            |
| deskJockey        | Desk Jockey         | 6 upgrades on the lowest-level floor                            | 5%          | Targets like Roundup Rodeo's 8 at 3.5%, but with a smaller reward               |
| inboxZeroGravity  | Inbox Zero Gravity  | 12 payouts on every unlocked floor                              | 3%          | Above Gold Rush's 10 at 2%; broad payout scope                                  |
| beanCounter       | Bean Counter        | 1 tier promotion and 6 upgrades on this floor                   | 1%          | Adds upgrades to Blessed's 1 promotion and 3 upgrades at the same 1%            |
| kingOfTheWorld    | King of the World   | 30 upgrades on the highest unlocked floor                       | 1.5%        | Matches Samurai's 30 upgrades, but targets the top floor at the same rarity     |
| officeClown       | Office Clown        | 5 upgrades on the lowest-level floor                            | 4%          | Smaller than Roundup Rodeo's 8 at 3.5%, with the same level-based target        |
| fridayTieDay      | Friday Tie Day      | 10 payouts on alternating unlocked floors, starting at ground   | 3%          | More per selected floor than High Society's 9 at 3%, with the same pattern      |
| soReady           | So Ready            | 15 upgrades on this floor                                       | 2%          | Same count as For the King, but focused on one floor instead of the building    |
| doughDivision     | Dough Division      | 6 upgrades on this floor                                        | 6%          | Smaller than So Ready's 15 at 2%; a common single-floor upgrade                 |
| profitPopcorn     | Profit Popcorn      | 4 payouts on every unlocked floor                               | 4%          | Building-wide payout below Gold Rush's 10 at 2%                                 |
| donutDisturb      | Donut Disturb       | 5 upgrades and 5 payouts on this floor                          | 5%          | Combines a smaller upgrade batch with cash versus Check Up's targeted mix       |
| cakeDay           | Cake Day            | 12 upgrades on the lowest-level floor                           | 3%          | Same target as Office Clown, with more upgrades at a lower rarity               |
| champagneProblems | Champagne Problems  | 15 payouts from the highest-earning floor                       | 2%          | Higher than Sharpshooter's 10 at 4%, with a rarer jackpot                       |
| bonusBurrito      | Bonus Burrito       | 8 upgrades and 3 payouts on this floor                          | 4%          | Adds cash to Staple of Success's 7 upgrades at the same rarity                  |
| sundaeBest        | Sundae Best         | 10 payouts on alternating unlocked floors, starting at ground   | 2.5%        | Matches High Society's pattern with one more payout per selected floor          |
| popTheQuestion    | Pop the Question    | 1 tier promotion and 4 upgrades on this floor                   | 1%          | Similar to Blessed, with one extra upgrade and no second promotion              |
| partyCrasher      | Party Crasher       | 3 upgrades here and 3 on the highest unlocked floor             | 5%          | A smaller two-target version of Finger Guns' 2-upgrade pair at 7%               |

All targets are within the current building and exclude locked floors. The
base tier's free upgrades occur before the special reward and its target
selection. Payouts mean current income cycles, not seconds or banked cash;
they leave timer progress unchanged. Upgrade/payout combinations pay at the
post-upgrade rate, except Honor among thieves, which pays before upgrading its
other
target. No proc takes income or progress away.

Promotions cap at ultra; Blessed and Wizard still grant their free upgrades
on an already-ultra floor. Bulk upgrades use the normal numerical progression
without replaying particles or crit rolls per tick. On a one-floor building,
every target resolves to that floor; Honor among thieves grants both rewards there.
For equal best scores, the triggering floor wins if tied; otherwise the first
matching floor from the ground wins. High Society always selects indices
0, 2, 4, and so on. Repeated procs remain additive; no new timed state exists.

These additions are floor-only, not map-specific. Their generated test buttons
appear for Upgrade click and Floor unlock, and stay hidden for Map unlock.
Shared Tier and Bonus tier controls remain available for floor tests.

### Processing and verification

All 13 new raw JFIF sources are preserved. Sampled corner channels ranged from
244 to 255; every icon used the existing near-white border-fill processor.
Contrasting-background inspection preserved enclosed light details and full
silhouettes. Outputs fit within 250x250, contain alpha and indexed palettes,
and have identical root/shipped copies (approximately 15-34 KB each).
Honor among thieves adds three sampled background seeds for enclosed bow/quiver
gaps;
the optional seeds do not change processing for any other image.

Regenerate with `node scripts/process-<image>.mjs`; wrappers use
`scripts/lib/process-crit-icon.mjs` and write both `src/assets/<image>.png`
and `src/assets/themes/references/dist/<image>.png` automatically.

Validation: `node scripts/test-featured-crits.mjs` passed all 56 featured
rewards, including the previous 12; `npm run build` passed. Tests cover
single-floor rewards, target ties, locked-floor exclusions, promotion caps,
rarity ladders, roll gates/cap, proc consumption, unique controls, and icons.

Browser verification passed 44 real-handler cases (22 crits on each of upgrade
click and floor unlock), checking cash and floor progression against expected
results. All 22 icons loaded; 44 desktop/mobile flash renders drew the correct
icon with nonblank pixel output. The collection grid, mobile detail layout,
two-line descriptions, map filtering, and selected tier/bonus controls passed.
The dev panel has 123 unique buttons: 122 special crits and Regular Crit.
Tests used isolated floors and restored the test balance. A fresh Vite server
was needed after stale hot-reload module instances invalidated the first
browser check; no gameplay change was needed for that tooling issue.

## Reviewed

- Petty Cash — pays out one second of every OTHER corporation's income rate
  straight into the active one (Golden Parachute's cross-company cousin).
- Tax Refund — hands back a flat percentage of everything spent since the
  last crit landed, however long ago that was.
- Vending Machine — pays a small fixed amount per worker currently employed
  across the whole building, so a full workforce is worth far more than a
  tall empty tower.
- Compound Interest — pays out the active company's own total again, but
  only the digits after the leading one (a scaling-friendly partial double).
- Hot Desking — fills every unlocked floor to the same worker count as the
  single most-staffed floor (Reinforcements, but only levelling up, never down).
- Supply Run — grants office chairs AND supplies to every unlocked floor at
  once (Chair Giveaway + Supplies Giveaway, building-wide).
- Ribbon Cutting — unlocks the next TWO floors for free instead of one, and
  starts them already at the building's current crit tier.
- Corner Office — picks the single highest-earning floor and permanently
  doubles its rate step, nothing else.
- Promotion Ladder — promotes floors one tier each, starting from the top of
  the building and walking down until it runs out of floors.
- Hostile Takeover — copies the single best crit tier anywhere in the
  company onto every floor of the current building.
- Double Down — re-rolls the landed tier once and keeps whichever of the two
  is better, so it can only ever improve the crit that spawned it.
- Casual Friday — every floor drops one tier, but the whole building's
  income interval is permanently cut in half. A real trade-off crit.
- Fire Drill — every floor's income bar instantly completes and restarts,
  over and over, for a few seconds.
- All Hands — every worker on every floor is boosted at once for double the
  usual duration (Espresso Shot's big sibling).
- Quarterly Earnings — for the next 30 seconds every crit that lands is
  guaranteed at least mega tier.
- Ghost Shift — the building keeps earning at double rate while the tab is
  backgrounded, for one full idle stretch.
- Butterfly Effect — applies a random OTHER special crit's reward, picked
  fresh at consumption time (Deja Vu, but across procs instead of tiers).
- Rubber Duck — the next five clicks on ANY floor each count as crits at the
  base tier, no matter where they land.
- Office Cat — spawns a mouse on every unlocked floor at once, each worth a
  free boost if the player can catch them all before they scatter.
- Paper Jam — freezes every floor's upgrade price building-wide for 30
  seconds (Frozen, but not just the one floor).
- Shredder — wipes the floor's upgrade cost entirely for its next ten
  upgrades, then snaps back to normal.
- Coffee Run — every floor's income timer runs at half interval until the
  player's next crit lands, however long that takes.
- Open Plan — merges the two lowest-earning unlocked floors' rates into
  both, so each ends up at their combined rate.
- Severance — instantly pays out ten seconds of the single highest-earning
  floor's rate, then resets that floor's boost timers.
- Pension Plan — banks a small percentage of every click's payout into a pot
  that a later crit cashes out all at once.
- Whiteboard — the next upgrade bought on any floor also applies to every
  other unlocked floor, at the same price.
- Team Building — every unlocked floor gains one worker, capped at the
  render limit (Intern, building-wide).
- Key Card — unlocks the single cheapest locked floor across ALL buildings,
  not just the current one.
- Spring Cleaning — clears every floor's accumulated price growth, resetting
  upgrade costs to the base for that floor's current level.
- Night Owl — doubles idle income for the next offline stretch only, then
  expires unused if the player stays on the page.
- Stock Split — halves every floor's rate step but doubles its upgrade
  count, netting the same income with far cheaper future upgrades.
- Water Cooler — each unlocked floor gets its own independent chance to
  spawn a small crit flash, chained off this one.
- Corner Cut — permanently removes one floor's manager but doubles that
  floor's rate. Another genuine trade-off.
- Fire Sale — for 15 seconds every purchase across the whole company is
  free, capped at a handful of buys.
- Annual Review — promotes the LOWEST-tier floor in the building straight to
  the building's highest tier.
- Golden Stapler — Golden Ticket with a bigger moment: a jackpot flash that
  also guarantees an ultra on the very next click.

- Expense Report — refunds the cost of the last ten upgrades bought on the
  floor that crit, at the price they were actually paid.
- Standing Desk — permanently halves one random unlocked floor's income
  interval, no cap, so repeats keep compounding on different floors.
- Headhunter — steals the highest worker count in the company and applies it
  to the floor that crit, leaving the source floor untouched.
- Dress Code — every floor without a manager instantly gets one, and every
  floor that already has one gains a worker instead.
- Sabbatical — the floor that crit stops earning for 30 seconds, then pays
  out triple everything it would have made, plus a bonus.
- Mailroom — the next crit that lands anywhere also fires on the ground
  floor, whatever floor actually triggered it.
- Photocopier — duplicates the floor that crit's entire upgrade count onto
  the floor directly above it.
- Recruitment Drive — every unlocked floor below the one that crit gains a
  worker; every floor above gains a manager.
- Buyout — instantly unlocks every floor in the building but resets each to
  zero upgrades. Trade breadth for depth.
- Overtime Pay — every upgrade bought in the next 15 seconds also credits
  its own cost straight back as income.
- Tea Break — pauses every floor's timer for 10 seconds, then releases them
  all at once so every bar completes simultaneously.
- Company Car — one random unlocked floor permanently earns at the rate of
  the best floor in the building.
- Audit — reveals and instantly banks the exact income the building would
  make over the next full minute.
- Intern Army — fills the floor that crit to its worker cap, then spills the
  leftover hires onto the floors above it.
- Merger — averages every unlocked floor's rate, then raises them all to
  that average. Lifts the weak without touching the strong.

- Payroll — pays every unlocked floor one second of its current income rate.
- Market Research — reveals the next crit tier before the next upgrade is bought.
- Elevator Pitch — instantly moves the camera to the highest unlocked floor and gives it one free upgrade.
- Team Lunch — boosts every worker on the critted floor for twice the normal boost duration.
- Expense Freeze — locks the current upgrade price on every unlocked floor for 30 seconds.
- Open House — unlocks the next floor at no cost and gives it one free worker.
- Performance Bonus — doubles the critted floor's rate step for its next ten upgrades.
- Staff Meeting — pauses all worker animations while granting every unlocked floor one worker.
- Budget Review — refunds the next five upgrade costs on the critted floor.
- Head Start — raises the next unlocked floor to the current floor's worker count.
- Overtime Roster — adds a temporary manager to every unlocked floor for 20 seconds.
- Cost Cutting — permanently reduces the critted floor's upgrade cost growth by 10 percent.
- Floor Plan — copies the critted floor's office chairs and supplies to every unlocked floor.
- Hiring Freeze — prevents worker purchases for 30 seconds while doubling income from existing workers.
- Shareholders — pays out one percent of the active company's total earned income.

- Time Clock — instantly completes the critted floor's current income timer twice.
- Talent Scout — adds one worker to the critted floor and boosts that worker briefly.
- Cost Center — refunds the difference between the current upgrade cost and its previous cost.
- Floor Share — copies one percent of the critted floor's income rate to every other unlocked floor.
- Break Room — doubles the active floor's worker boost effect for 10 seconds.
- Cash Flow — pays out the current income rate of every unlocked floor once.
- Promotion Cycle — gives the critted floor one manager and one worker if both are available.
- Safety Net — prevents the next unaffordable upgrade from increasing its cost.
- Board Meeting — guarantees the next crit on every unlocked floor is at least mega tier.
- Open Ledger — reveals the total amount spent on upgrades in the current building.
- Shift Change — moves every active worker boost from the critted floor to the floor above it.
- Hiring Spree — fills one random unlocked floor to its worker cap.
- Rate Lock — freezes the critted floor's income interval for 20 seconds.
- Dividend Reinvestment — converts the next payout into free upgrade progress on the critted floor.
- Floor Bonus — grants one free upgrade to every unlocked floor below the critted floor.

- Bonus Round — the next completed income timer on the critted floor pays twice.
- Overflow — the critted floor immediately pays five current income timer payouts,
  then its timer restarts.
- Greenlight — removes the next upgrade cost on the critted floor only.
- Mentor — permanently increases the boost duration of one random worker.
- Tower Share — grants every unlocked floor a payout based on its own worker count.
- Lucky Break — instantly completes the next income timer that would finish naturally.
- Fast Track — halves the critted floor's next five income intervals.
- Full Shift — boosts every worker and manager on the critted floor for one normal duration.
- Rainmaker — pays one additional current income cycle from the company's highest-rate building.
- Open Door — makes the next three floor purchases free without changing upgrade costs.
- Staff Credit — grants every unlocked floor one free worker, with no manager changes.
- Momentum — each of the next three upgrades on the critted floor also triggers a small payout.
- Capital Gain — pays a bonus based on the critted floor's current upgrade level.
- Priority Lane — moves the critted floor's next upgrade milestone forward by five levels.
- Overflow — the critted floor immediately pays five current income timer payouts,
  then its timer restarts.

- **Time Deposit** — stores the critted floor's next five payouts and releases
  them together with a bonus when the deposit matures.
- **Rainy Day Fund** — converts a percentage of the building's current income
  rate into a protected reserve that pays out if the player cannot afford an
  upgrade.
- **Talent Pipeline** — the next worker hired on each unlocked floor arrives
  already boosted and extends the boost duration of the worker below it.
- **Forecast** — displays the exact next crit tier and applies a small payout
  whenever the player follows the forecasted upgrade path.
- **Vacancy Bonus** — pays extra for every worker slot that is still empty,
  turning an under-staffed building into a short-term source of cash.
- **Safety Inspection** — removes one random negative or limiting floor state
  and grants that floor a free manager if it is eligible.
- **Bidding War** — freezes the current floor's upgrade price, then increases
  its income rate each time another floor is upgraded during the window.
- **Lucky Breakroom** — every worker currently boosted has a chance to produce
  a small independent payout before their boost expires.
- **Compound Bonus** — pays a percentage based on the number of different
  special crit types collected by the player so far.
- **Quiet Quarter** — suppresses all special-crit flashes for a short period
  while increasing the odds that the next special proc is a new type.
- **Executive Bonus** — grants a building-wide payout based on the highest
  permanent crit tier currently represented in the building.
- **Open Book** — pays a one-time payout equal to the current value of all
  upgrades bought across every building.
- **Lucky Number** — unlocks a random 2-12 floors above the critted floor for
  free, extending the current building as needed up to its floor cap.

## New suggestions

- **Flash Sale** — the next three upgrades on the critted floor cost only one
  percent of their current price, without changing their normal progression.
- **Lucky Ledger** — records the next five upgrade costs and refunds their
  average value as a single payout when the fifth upgrade is bought.
- **Relay Team** — each boosted worker on the critted floor briefly passes its
  boost to the next unlocked floor, creating a short upward chain of boosts.
- **Dividend Day** — pays a small dividend from every building based on that
  building's own upgrade value, rewarding broad development across the company.
- **Milestone Marker** — instantly grants enough free upgrades on the critted
  floor to reach its next five-upgrade milestone.
- **Reserve Staff** — stores one free worker for each unlocked floor and adds
  those workers to newly unlocked floors for the next 30 seconds.
- **Fast Lane** — the next naturally completed income cycle on every unlocked
  floor completes twice as quickly, without altering stored intervals.
- **Shared Services** — temporarily treats every unlocked floor as owning
  office chairs and supplies for pricing and boost calculations.
- **Growth Fund** — converts a portion of the next building unlock cost into
  free upgrade progress on the floor that triggered the crit.
- **Secondment** — temporarily lends the best worker count in the company to
  the critted floor without changing any permanent worker totals.
- **Clean Slate** — removes all pending temporary price overrides and replaces
  them with the current cheapest-floor price for one short window.
- **Quartermaster** — grants every unlocked floor one free office upgrade,
  choosing chairs or supplies wherever that feature is still missing.

## To consider

- **Carryover** — preserves the critted floor's current income-bar progress and
  copies that same progress to every other unlocked floor.
- **Rain Check** — stores the current floor's next payout and automatically
  adds it to the total when that floor's timer completes again.
- **Blueprint Copy** — creates a temporary blueprint of the critted floor's
  income rate and applies it to the next floor unlocked for 30 seconds.
- **Prime Time** — the next ten seconds of income from the critted floor are
  paid at its current rate plus one extra payout per active worker.
- **Level Skip** — grants enough free upgrades to reach the next interval
  halving milestone, without changing the floor's permanent crit tier.
- **Budget Buffer** — reserves the current upgrade price and automatically
  covers that price once if the next click would otherwise be unaffordable.
- **Open Schedule** — reveals the next three income-cycle completion times and
  shortens each of those cycles by 25 percent.
- **Floor Dividend** — every other unlocked floor pays the critted floor's
  current one-cycle payout into the company's total income.
- **Staff Rotation** — moves one worker from the most-staffed unlocked floor
  to the least-staffed one, then boosts both workers briefly.
- **Rate Relay** — copies half of the critted floor's current rate step to the
  floor immediately above it for its next five upgrades.
- **Milestone Grant** — the next upgrade milestone on the critted floor pays
  a bonus equal to five current income cycles.
- **Fresh Start** — resets only the critted floor's upgrade cost growth to its
  current level's base cost, preserving income and upgrade progress.
- **Floor Pass** — the next floor unlock in the current building costs nothing
  and begins with the current floor's worker count.
- **Shared Momentum** — each of the next five upgrades on the critted floor
  grants one free upgrade to the floor directly above it.
- **Reserve Payout** — banks the building's current one-cycle income and pays
  it out after the next floor unlock.
- **Quiet Boost** — grants every unlocked floor a short worker boost without
  changing worker counts or triggering a map-wide celebration.
- **Top Floor Bonus** — pays the highest unlocked floor three of its current
  payouts and gives it one free manager if eligible.
- **Bottom Line** — grants the ground floor a permanent rate-step increase
  based on the number of unlocked floors.
- **Double Entry** — the next paid upgrade records both its normal income gain
  and its full price as income, then returns to normal.
- **Staff Ladder** — grants one worker to each unlocked floor in order from
  the ground floor upward until the worker cap is reached.
- **Price Discovery** — permanently lowers the critted floor's next upgrade
  cost by the exact amount of its most recent cost increase.
- **Cycle Share** — when the critted floor completes its next income cycle,
  every unlocked floor receives a quarter-cycle payout.
- **First Mover** — the next floor unlocked in this building receives five free
  upgrades and starts with the current building-wide crit tier.
- **Bridge Loan** — immediately pays enough income to cover the critted floor's
  next upgrade, capped at one upgrade's cost.
- **Lucky Breakpoint** — advances the critted floor to the next interval
  halving threshold and pays one extra current cycle.
- **Company Match** — grants a payout matching the total income rate of the
  company's second-highest-earning building.
- **Workshare** — temporarily pools all unlocked floors' worker counts when
  calculating boost strength, without changing their saved staffing.
- **Level Playing Field** — raises every unlocked floor below the critted
  floor to at least half of the critted floor's upgrade count.
- **Early Access** — unlocks the next floor's room immediately, but leaves its
  normal upgrade cost and worker requirements unchanged.
- **Golden Hour** — for the next five income cycles, every completed cycle
  grants a second payout at half value.
- **Progress Report** — pays a bonus based on the building's total upgrade
  count and reveals the current highest-tier floor.
- **Floor Upgrade Grant** — refunds the exact cost of the next upgrade while
  keeping that upgrade's income and level progress.
- **Balanced Portfolio** — pays a larger dividend when the company's building
  levels are close together, rewarding broad development.
