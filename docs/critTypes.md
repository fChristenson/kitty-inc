# Crit ideas

## Implemented asset batch: 2026-09-17

32 new crits, with instant rewards on upgrade clicks and floor unlocks through
the same `applyFloorCrit` function. Previous crits remain available and their
balance is unchanged; this report replaces the previous batch report only.
Proc chances below apply after a tier and the special gateway land, before
the shared proc cap. They are not per-click odds.

| Image         | Crit            | Immediate reward                                                | Proc chance | Comparison                                                                      |
| ------------- | --------------- | --------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| amethyst      | Amethyst        | 6 payouts on this floor                                         | 5%          | Above Overflow's 5 at 6%; does not restart the timer                            |
| blessed       | Blessed         | 1 tier promotion, then 3 upgrades here                          | 1%          | Upgrade plus immediate upgrades; smaller promotion than Obelisk at 0.8%         |
| centurion     | Centurion       | 100 upgrades on this floor                                      | 1%          | Above Samurai's 30 at 1.5%; below Lucky Clover's 500 at 0.4%                    |
| checkUp       | Check Up        | 4 upgrades, then 2 payouts on the lowest-level floor            | 5%          | Roundup Rodeo's target, but 4 upgrades plus cash instead of 8 upgrades          |
| diamond       | Diamond         | 24 payouts on this floor                                        | 2%          | Above Sapphire's 18 at 2.5%                                                     |
| emerald       | Emerald         | 9 payouts on this floor                                         | 4%          | Above Amethyst's 6 at 5%                                                        |
| fireman       | First Responder | 3 upgrades, then 1 payout on every unlocked floor               | 4%          | Fire Drill's building-wide payout plus upgrades, without timer resets           |
| forTheEmperor | For the Emperor | 25 upgrades on every unlocked floor                             | 1.5%        | Above For the King's 15 at 2%; up to 500 free upgrades                          |
| forTheKing    | For the King    | 15 upgrades on every unlocked floor                             | 2%          | Above Fancy Friday's 10 at 2.5%                                                 |
| goldNugget    | Gold Nugget     | 4 payouts on this floor                                         | 7%          | Below Overflow's 5 at 6%; preserves the timer                                   |
| goldRush      | Gold Rush       | 10 payouts on every unlocked floor                              | 2%          | Above Yes Chef's 8 at 2.5%                                                      |
| hammerTime    | Hammer Time     | 9 upgrades on this floor                                        | 4%          | Below Keynote's 10 at 3%                                                        |
| robinHood     | Robin Hood      | 7 top-earner payouts, then 3 upgrades on the lowest-level floor | 3%          | Sharpshooter pays 10 without the targeted upgrades; no income is taken away     |
| roman         | Roman Holiday   | 9 upgrades on every unlocked floor                              | 3%          | Between Flamenco's 7 at 3.5% and Fancy Friday's 10 at 2.5%                      |
| ruby          | Ruby            | 12 payouts on this floor                                        | 3%          | Above Emerald's 9 at 4%                                                         |
| samurai       | Samurai         | 30 upgrades on this floor                                       | 1.5%        | Above Ninja Bonus's 12 at 2.5% and Space Race's top-floor 20 at 2%              |
| saphire       | Sapphire        | 18 payouts on this floor                                        | 2.5%        | Above Ruby's 12 at 3%; raw asset spelling retained                              |
| silverRush    | Silver Rush     | 6 payouts on every unlocked floor                               | 3.5%        | Between Dinner Time's 5 at 4% and Yes Chef's 8 at 2.5%                          |
| spy           | Undercover      | 17 upgrades on the lowest-income-rate floor                     | 2.2%        | Roundup Rodeo gives 8 to the lowest-level floor, a different target             |
| theLawWon     | The Law Won     | 6 upgrades, then 2 payouts on the cheapest-upgrade floor        | 4.5%        | Safety Net gives 5 upgrades to the most expensive floor instead                 |
| victorian     | High Society    | 9 payouts on alternating unlocked floors, starting at ground    | 3%          | Yes Chef pays 8 everywhere at 2.5%; this pays more per target but fewer targets |
| wizard        | Wizard          | 2 tier promotions, then 5 upgrades here                         | 0.6%        | Above Obelisk's 2 promotions plus 2 upgrades at 0.8%                            |
| executiveSpin | Executive Spin  | 4 upgrades on the highest unlocked floor                       | 5%          | Above Space Race's 20 on the top floor at 2% only when the target is topmost   |
| rubberStampede | Rubber Stampede | 7 payouts on every unlocked floor                              | 2.5%        | Above Silver Rush's 6 at 3.5%; broad building-wide cash effect                |
| replyAll      | Reply All       | 3 payouts on this floor and the lowest-level floor              | 6%          | More targeted than Dinner Time's 5 everywhere at 4%                            |
| stapleOfSuccess | Staple of Success | 7 upgrades on this floor                                      | 4%          | Between Hammer Time's 9 at 4% and Tea Break's 1 at 8%                          |
| faxOfFortune  | Fax of Fortune   | 8 payouts from the highest-earning floor                       | 3.5%        | Sharpshooter pays 10 at 4%; this keeps the same target with a lower payout     |
| casualMonday  | Casual Monday    | 20 upgrades on this floor                                      | 2.5%        | Below Samurai's 30 at 1.5%; twice Keynote's 10 at 3%                          |
| deskJockey    | Desk Jockey     | 6 upgrades on the lowest-level floor                            | 5%          | Targets like Roundup Rodeo's 8 at 3.5%, but with a smaller reward             |
| inboxZeroGravity | Inbox Zero Gravity | 12 payouts on every unlocked floor                          | 3%          | Above Gold Rush's 10 at 2%; broad payout scope                                |
| beanCounter  | Bean Counter    | 1 tier promotion and 6 upgrades on this floor                   | 1%          | Adds upgrades to Blessed's 1 promotion and 3 upgrades at the same 1%           |
| kingOfTheWorld | King of the World | 30 upgrades on the highest unlocked floor                    | 1.5%        | Matches Samurai's 30 upgrades, but targets the top floor at the same rarity    |

All targets are within the current building and exclude locked floors. The
base tier's free upgrades occur before the special reward and its target
selection. Payouts mean current income cycles, not seconds or banked cash;
they leave timer progress unchanged. Upgrade/payout combinations pay at the
post-upgrade rate, except Robin Hood, which pays before upgrading its other
target. No proc takes income or progress away.

Promotions cap at ultra; Blessed and Wizard still grant their free upgrades
on an already-ultra floor. Bulk upgrades use the normal numerical progression
without replaying particles or crit rolls per tick. On a one-floor building,
every target resolves to that floor; Robin Hood grants both rewards there.
For equal best scores, the triggering floor wins if tied; otherwise the first
matching floor from the ground wins. High Society always selects indices
0, 2, 4, and so on. Repeated procs remain additive; no new timed state exists.

These additions are floor-only, not map-specific. Their generated test buttons
appear for Upgrade click and Floor unlock, and stay hidden for Map unlock.
Shared Tier and Bonus tier controls remain available for floor tests.

### Processing and verification

All 10 new raw JFIF sources are preserved. Sampled corner channels ranged from
244 to 255; every icon used the existing near-white border-fill processor.
Contrasting-background inspection preserved enclosed light details and full
silhouettes. Outputs fit within 250x250, contain alpha and indexed palettes,
and have identical root/shipped copies (approximately 15-34 KB each).
Robin Hood adds three sampled background seeds for enclosed bow/quiver gaps;
the optional seeds do not change processing for any other image.

Regenerate with `node scripts/process-<image>.mjs`; wrappers use
`scripts/lib/process-crit-icon.mjs` and write both `src/assets/<image>.png`
and `src/assets/themes/references/dist/<image>.png` automatically.

Validation: `node scripts/test-featured-crits.mjs` passed all 44 featured
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
