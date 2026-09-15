import type { Floor } from "../../gameState";

// dev/test-only controls, not part of the real game UI
export function createTestButtonMarkup(): string {
  return `
    <div class="test-actions-bar">
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Test Actions</summary>
        <div class="test-actions-dropdown__menu">
          <button id="add-money" class="game__button">Add Money</button>
          <button id="spawn-mouse" class="game__button">Spawn Mouse</button>
          <button id="test-idle-overlay" class="game__button">Idle Overlay</button>
          <button id="force-bonus-tier-crit" class="game__button">Force Bonus Tier x5</button>
          <button id="force-bonus-tier-mega-crit" class="game__button">Force Bonus Tier x25</button>
          <button id="force-bonus-tier-ultra-crit" class="game__button">Force Bonus Tier x125</button>
        </div>
      </details>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Upgrade Crits</summary>
        <div class="test-actions-dropdown__menu">
          <button id="spawn-crit" class="game__button">Spawn Crit</button>
          <button id="spawn-mega-crit" class="game__button">Spawn Mega Crit</button>
          <button id="spawn-ultra-crit" class="game__button">Spawn Ultra Crit</button>
          <button id="spawn-chain-crit" class="game__button">Spawn Chain Crit</button>
          <button id="spawn-chain-mega-crit" class="game__button">Spawn Chain Mega Crit</button>
          <button id="spawn-chain-ultra-crit" class="game__button">Spawn Chain Ultra Crit</button>
          <button id="spawn-boost-crit" class="game__button">Spawn Boost Crit</button>
          <button id="spawn-bounce-crit" class="game__button">Spawn Bounce Crit</button>
          <button id="spawn-bounce-mega-crit" class="game__button">Spawn Bounce Mega Crit</button>
          <button id="spawn-bounce-ultra-crit" class="game__button">Spawn Bounce Ultra Crit</button>
          <button id="spawn-explosion-crit" class="game__button">Spawn Explosion Crit</button>
          <button id="spawn-explosion-mega-crit" class="game__button">Spawn Explosion Mega Crit</button>
          <button id="spawn-explosion-ultra-crit" class="game__button">Spawn Explosion Ultra Crit</button>
          <button id="spawn-booty-crit" class="game__button">Spawn Booty Crit</button>
          <button id="spawn-upgrade-crit" class="game__button">Spawn Upgrade Crit</button>
          <button id="spawn-peppermint-crit" class="game__button">Spawn Peppermint Crit</button>
          <button id="spawn-heavenly-crit" class="game__button">Spawn Heavenly Crit</button>
          <button id="spawn-pair-crit" class="game__button">Spawn Pair Crit</button>
          <button id="spawn-three-of-a-kind-crit" class="game__button">Spawn Three of a Kind Crit</button>
          <button id="spawn-four-of-a-kind-crit" class="game__button">Spawn Four of a Kind Crit</button>
          <button id="spawn-full-house-crit" class="game__button">Spawn Full House Crit</button>
          <button id="spawn-royal-flush-crit" class="game__button">Spawn Royal Flush Crit</button>
          <button id="spawn-tick-tock-crit" class="game__button">Spawn Tick Tock Crit</button>
          <button id="spawn-chair-giveaway-crit" class="game__button">Spawn Chair Giveaway Crit</button>
          <button id="spawn-supplies-giveaway-crit" class="game__button">Spawn Supplies Giveaway Crit</button>
          <button id="spawn-winter-sale-crit" class="game__button">Spawn Winter Sale Crit</button>
          <button id="spawn-spring-sale-crit" class="game__button">Spawn Spring Sale Crit</button>
          <button id="spawn-summer-sale-crit" class="game__button">Spawn Summer Sale Crit</button>
          <button id="spawn-autumn-sale-crit" class="game__button">Spawn Autumn Sale Crit</button>
          <button id="spawn-halloween-sale-crit" class="game__button">Spawn Halloween Sale Crit</button>
          <button id="spawn-easter-sale-crit" class="game__button">Spawn Easter Sale Crit</button>
          <button id="spawn-sunshine-crit" class="game__button">Spawn Sunshine Crit</button>
          <button id="spawn-snowday-crit" class="game__button">Spawn Snowday Crit</button>
          <button id="spawn-fastforward-crit" class="game__button">Spawn Fast Forward Crit</button>
          <button id="spawn-frozen-crit" class="game__button">Spawn Frozen Crit</button>
          <button id="spawn-snowball-crit" class="game__button">Spawn Snowball Crit</button>
          <button id="spawn-free-sale-crit" class="game__button">Spawn Free Sale Crit</button>
          <button id="spawn-payday-crit" class="game__button">Spawn Payday Crit</button>
          <button id="spawn-gold-standard-crit" class="game__button">Spawn Gold Standard Crit</button>
          <button id="spawn-night-shift-crit" class="game__button">Spawn Night Shift Crit</button>
          <button id="spawn-intern-crit" class="game__button">Spawn Intern Crit</button>
          <button id="spawn-union-boss-crit" class="game__button">Spawn Union Boss Crit</button>
          <button id="spawn-rush-hour-crit" class="game__button">Spawn Rush Hour Crit</button>
          <button id="spawn-golden-ticket-crit" class="game__button">Spawn Golden Ticket Crit</button>
          <button id="spawn-silver-ticket-crit" class="game__button">Spawn Silver Ticket Crit</button>
          <button id="spawn-grand-opening-crit" class="game__button">Spawn Grand Opening Crit</button>
          <button id="spawn-golden-parachute-crit" class="game__button">Spawn Golden Parachute Crit</button>
          <button id="spawn-payout-crit" class="game__button">Spawn Payout Crit</button>
        </div>
      </details>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Floor Unlock Crits</summary>
        <div class="test-actions-dropdown__menu">
          <button id="floor-buy-crit" class="game__button">Floor Crit</button>
          <button id="floor-buy-boost-crit" class="game__button">Floor Boost Crit</button>
          <button id="floor-buy-mega-crit" class="game__button">Floor Mega Crit</button>
          <button id="floor-buy-ultra-crit" class="game__button">Floor Ultra Crit</button>
          <button id="floor-buy-chain-crit" class="game__button">Floor Chain Crit</button>
          <button id="floor-buy-chain-mega-crit" class="game__button">Floor Chain Mega Crit</button>
          <button id="floor-buy-chain-ultra-crit" class="game__button">Floor Chain Ultra Crit</button>
          <button id="floor-buy-bounce-crit" class="game__button">Floor Bounce Crit</button>
          <button id="floor-buy-bounce-mega-crit" class="game__button">Floor Bounce Mega Crit</button>
          <button id="floor-buy-bounce-ultra-crit" class="game__button">Floor Bounce Ultra Crit</button>
          <button id="floor-buy-explosion-crit" class="game__button">Floor Explosion Crit</button>
          <button id="floor-buy-explosion-mega-crit" class="game__button">Floor Explosion Mega Crit</button>
          <button id="floor-buy-explosion-ultra-crit" class="game__button">Floor Explosion Ultra Crit</button>
          <button id="floor-buy-booty-crit" class="game__button">Floor Booty Crit</button>
          <button id="floor-buy-upgrade-crit" class="game__button">Floor Upgrade Crit</button>
          <button id="floor-buy-peppermint-crit" class="game__button">Floor Peppermint Crit</button>
          <button id="floor-buy-heavenly-crit" class="game__button">Floor Heavenly Crit</button>
          <button id="floor-buy-pair-crit" class="game__button">Floor Pair Crit</button>
          <button id="floor-buy-three-of-a-kind-crit" class="game__button">Floor Three of a Kind Crit</button>
          <button id="floor-buy-four-of-a-kind-crit" class="game__button">Floor Four of a Kind Crit</button>
          <button id="floor-buy-full-house-crit" class="game__button">Floor Full House Crit</button>
          <button id="floor-buy-royal-flush-crit" class="game__button">Floor Royal Flush Crit</button>
          <button id="floor-buy-tick-tock-crit" class="game__button">Floor Tick Tock Crit</button>
          <button id="floor-buy-chair-giveaway-crit" class="game__button">Floor Chair Giveaway Crit</button>
          <button id="floor-buy-supplies-giveaway-crit" class="game__button">Floor Supplies Giveaway Crit</button>
          <button id="floor-buy-winter-sale-crit" class="game__button">Floor Winter Sale Crit</button>
          <button id="floor-buy-spring-sale-crit" class="game__button">Floor Spring Sale Crit</button>
          <button id="floor-buy-summer-sale-crit" class="game__button">Floor Summer Sale Crit</button>
          <button id="floor-buy-autumn-sale-crit" class="game__button">Floor Autumn Sale Crit</button>
          <button id="floor-buy-halloween-sale-crit" class="game__button">Floor Halloween Sale Crit</button>
          <button id="floor-buy-easter-sale-crit" class="game__button">Floor Easter Sale Crit</button>
          <button id="floor-buy-sunshine-crit" class="game__button">Floor Sunshine Crit</button>
          <button id="floor-buy-snowday-crit" class="game__button">Floor Snowday Crit</button>
          <button id="floor-buy-fastforward-crit" class="game__button">Floor Fast Forward Crit</button>
          <button id="floor-buy-frozen-crit" class="game__button">Floor Frozen Crit</button>
          <button id="floor-buy-snowball-crit" class="game__button">Floor Snowball Crit</button>
          <button id="floor-buy-free-sale-crit" class="game__button">Floor Free Sale Crit</button>
          <button id="floor-buy-payday-crit" class="game__button">Floor Payday Crit</button>
          <button id="floor-buy-gold-standard-crit" class="game__button">Floor Gold Standard Crit</button>
          <button id="floor-buy-night-shift-crit" class="game__button">Floor Night Shift Crit</button>
          <button id="floor-buy-intern-crit" class="game__button">Floor Intern Crit</button>
          <button id="floor-buy-union-boss-crit" class="game__button">Floor Union Boss Crit</button>
          <button id="floor-buy-rush-hour-crit" class="game__button">Floor Rush Hour Crit</button>
          <button id="floor-buy-golden-ticket-crit" class="game__button">Floor Golden Ticket Crit</button>
          <button id="floor-buy-silver-ticket-crit" class="game__button">Floor Silver Ticket Crit</button>
          <button id="floor-buy-grand-opening-crit" class="game__button">Floor Grand Opening Crit</button>
          <button id="floor-buy-golden-parachute-crit" class="game__button">Floor Golden Parachute Crit</button>
          <button id="floor-buy-payout-crit" class="game__button">Floor Payout Crit</button>
        </div>
      </details>
      <details class="test-actions-dropdown">
        <summary class="test-actions-dropdown__toggle">Map Unlock Crits</summary>
        <div class="test-actions-dropdown__menu">
          <button id="map-unlock-crit" class="game__button">Map Unlock Crit</button>
          <button id="map-unlock-mega-crit" class="game__button">Map Unlock Mega Crit</button>
          <button id="map-unlock-ultra-crit" class="game__button">Map Unlock Ultra Crit</button>
          <button id="map-unlock-chain-crit" class="game__button">Map Unlock Chain Crit</button>
          <button id="map-unlock-chain-mega-crit" class="game__button">Map Unlock Chain Mega Crit</button>
          <button id="map-unlock-chain-ultra-crit" class="game__button">Map Unlock Chain Ultra Crit</button>
          <button id="map-unlock-upgrade-crit" class="game__button">Map Unlock Upgrade Crit</button>
          <button id="map-unlock-grand-opening-crit" class="game__button">Map Unlock Grand Opening Crit</button>
          <button id="map-unlock-heavenly-crit" class="game__button">Map Unlock Heavenly Crit</button>
          <button id="map-unlock-pair-crit" class="game__button">Map Unlock Pair Crit</button>
          <button id="map-unlock-three-of-a-kind-crit" class="game__button">Map Unlock Three of a Kind Crit</button>
          <button id="map-unlock-four-of-a-kind-crit" class="game__button">Map Unlock Four of a Kind Crit</button>
          <button id="map-unlock-full-house-crit" class="game__button">Map Unlock Full House Crit</button>
          <button id="map-unlock-royal-flush-crit" class="game__button">Map Unlock Royal Flush Crit</button>
        </div>
      </details>
      <button id="reset-game" class="game__button game__button--danger">Reset Game</button>
    </div>
  `;
}

export function wireTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#add-money")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnMouseButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#spawn-mouse")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#spawn-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-mega-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-ultra-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnChainCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-chain-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnChainMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-chain-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnChainUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-chain-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnBoostCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-boost-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnBounceCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-bounce-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnBounceMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-bounce-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnBounceUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-bounce-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnExplosionCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-explosion-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnExplosionMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-explosion-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnExplosionUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-explosion-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnBootyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-booty-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnUpgradeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-upgrade-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnPeppermintCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-peppermint-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnHeavenlyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-heavenly-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnPairCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-pair-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnThreeOfAKindCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-three-of-a-kind-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFourOfAKindCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-four-of-a-kind-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFullHouseCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-full-house-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnRoyalFlushCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-royal-flush-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnTickTockCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-tick-tock-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnChairGiveawayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-chair-giveaway-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSuppliesGiveawayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-supplies-giveaway-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnWinterSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-winter-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSpringSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-spring-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSummerSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-summer-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnAutumnSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-autumn-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnHalloweenSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-halloween-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnEasterSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-easter-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSunshineCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-sunshine-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSnowdayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-snowday-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFastForwardCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-fastforward-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFrozenCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-frozen-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSnowballCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-snowball-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFreeSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-free-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnPaydayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-payday-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnGoldStandardCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-gold-standard-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnNightShiftCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-night-shift-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnInternCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-intern-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnUnionBossCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-union-boss-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnRushHourCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-rush-hour-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnGoldenTicketCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-golden-ticket-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSilverTicketCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-silver-ticket-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnGrandOpeningCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-grand-opening-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnGoldenParachuteCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-golden-parachute-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnPayoutCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-payout-crit")!;
  button.addEventListener("click", onClick);
}

export function wireForceBonusTierCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#force-bonus-tier-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireForceBonusTierMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#force-bonus-tier-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireForceBonusTierUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#force-bonus-tier-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>("#floor-buy-crit")!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyBoostCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-boost-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyChainCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-chain-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyChainMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-chain-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyChainUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-chain-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyBounceCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-bounce-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyBounceMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-bounce-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyBounceUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-bounce-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyExplosionCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-explosion-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyExplosionMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-explosion-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyExplosionUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-explosion-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyBootyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-booty-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyUpgradeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-upgrade-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyPeppermintCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-peppermint-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyHeavenlyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-heavenly-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyPairCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-pair-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyThreeOfAKindCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-three-of-a-kind-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyFourOfAKindCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-four-of-a-kind-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyFullHouseCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-full-house-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyRoyalFlushCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-royal-flush-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyTickTockCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-tick-tock-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyChairGiveawayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-chair-giveaway-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySuppliesGiveawayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-supplies-giveaway-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyWinterSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-winter-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySpringSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-spring-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySummerSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-summer-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyAutumnSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-autumn-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyHalloweenSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-halloween-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyEasterSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-easter-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySunshineCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-sunshine-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySnowdayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-snowday-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyFastForwardCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-fastforward-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyFrozenCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-frozen-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySnowballCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-snowball-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyFreeSaleCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-free-sale-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyPaydayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-payday-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyGoldStandardCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-gold-standard-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyNightShiftCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-night-shift-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyInternCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-intern-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyUnionBossCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-union-boss-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyRushHourCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-rush-hour-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyGoldenTicketCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-golden-ticket-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySilverTicketCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-silver-ticket-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyGrandOpeningCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-grand-opening-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyGoldenParachuteCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-golden-parachute-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyPayoutCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-payout-crit",
  )!;
  button.addEventListener("click", onClick);
}

// forces the SAME shared roll floors/upgradeButton's forceFloorBuyCrit arms
// (rollFloorBuyCrit) — the map's next building purchase reads from it too (see
// cityMap/index.ts's onClick), so these are really just clearer-labeled aliases
// of the floor-buy-crit buttons above for testing that specific call site
export function wireMapUnlockCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#map-unlock-crit")!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockChainCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-chain-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockChainMegaCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-chain-mega-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockChainUltraCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-chain-ultra-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockUpgradeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-upgrade-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockGrandOpeningCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-grand-opening-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockHeavenlyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-heavenly-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockPairCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-pair-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockThreeOfAKindCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-three-of-a-kind-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockFourOfAKindCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-four-of-a-kind-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockFullHouseCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-full-house-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMapUnlockRoyalFlushCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-royal-flush-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireIdleOverlayTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-idle-overlay")!;
  button.addEventListener("click", onClick);
}

export function wireResetButton(
  container: HTMLElement,
  buildings: Floor[][],
): void {
  const button = container.querySelector<HTMLButtonElement>("#reset-game")!;
  button.addEventListener("click", () => {
    // also truncate the in-memory array: main.ts's beforeunload handler persists
    // buildings on the way out, and without this it would just re-save the stale
    // data right after localStorage.clear() removes it, undoing the reset before
    // the reload even happens
    buildings.length = 0;
    localStorage.clear();
    location.reload();
  });
}
