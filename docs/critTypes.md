# Crit ideas

## Implemented asset batch: 2026-09-18 (nerd culture, continued)

Eight more nerd-culture featured crits support upgrade clicks and floor unlocks
through the shared `applyFloorCrit` path. Rewards are immediate, existing crit
balance is unchanged, and proc chances apply only after a tier and the special
gateway land, before the shared proc cap; they are not per-click odds.

| Image                  | Crit                    | Immediate reward                                      | Proc chance | Comparison                                                   |
| ---------------------- | ----------------------- | ----------------------------------------------------- | ----------- | ------------------------------------------------------------ |
| biggerOnTheInside      | Bigger on the Inside    | 10 payouts on every unlocked floor                    | 1.8%        | Building-wide payout below Speedrun Payroll's 15 at 1.4%    |
| cacheMeOutside         | Cache Me Outside       | 8 upgrades on the lowest-level floor                  | 2.6%        | Between Min-Max Manager's 10 at 2.5% and Roundup Rodeo's 8 at 3.5% |
| itCompiles              | It Compiles!            | 15 upgrades on this floor                             | 2.4%        | Same count as For the King's building-wide reward, but single-floor |
| magicalPayrollGirl      | Magical Payroll Girl    | 1 tier promotion, then 10 upgrades on this floor      | 1.1%        | Larger than Save Point Savings's 5 upgrades at 1.2%         |
| mechaMiddleManagement   | Mecha Middle Management | 12 upgrades on every unlocked floor                   | 1.6%        | Building-wide upgrade reward below Gummy Bear Market's 10 at 1.5% |
| mergeConflict            | Merge Conflict           | 7 upgrades and 7 payouts on this floor                | 2%          | Mixed single-floor reward, smaller than Clowning Around's building-wide effect |
| mintCondition            | Mint Condition           | 18 payouts from the highest-earning floor              | 1.5%        | Below Sharpshooter's 10 payouts at 4% only because this is a rarer targeted hit |
| stackOverflowing         | Stack Overflowing        | 9 upgrades on the highest unlocked floor              | 2.2%        | Below Patch Notes Payday's 11 on the same target at 2.1%   |
| oneMoreRound              | One More Round            | 8 upgrades and 8 payouts on this floor                 | 2%          | Mixed single-floor reward, smaller than Merge Conflict's 7+7 at 2% |

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
