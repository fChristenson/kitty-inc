import type { Floor } from "../../gameState";

// dev/test-only controls, not part of the real game UI
export function createTestButtonMarkup(): string {
  return `
    <div class="test-actions-bar">
      <input
        type="search"
        id="test-actions-filter"
        class="test-actions-filter"
        placeholder="Filter actions…"
        autocomplete="off"
      />
      <p class="test-actions-empty" id="test-actions-empty" hidden>No matches</p>
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
          <button id="spawn-blueprint-crit" class="game__button">Spawn Blueprint Crit</button>
          <button id="spawn-domino-effect-crit" class="game__button">Spawn Domino Effect Crit</button>
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
          <button id="spawn-cash-flow-crit" class="game__button">Spawn Cash Flow Crit</button>
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
          <button id="spawn-spending-freeze-crit" class="game__button">Spawn Spending Freeze Crit</button>
          <button id="spawn-snowball-crit" class="game__button">Spawn Snowball Crit</button>
          <button id="spawn-free-sale-crit" class="game__button">Spawn Free Sale Crit</button>
          <button id="spawn-bull-market-crit" class="game__button">Spawn Bull Market Crit</button>
          <button id="spawn-payday-crit" class="game__button">Spawn Payday Crit</button>
          <button id="spawn-gold-standard-crit" class="game__button">Spawn Gold Standard Crit</button>
          <button id="spawn-night-shift-crit" class="game__button">Spawn Night Shift Crit</button>
          <button id="spawn-intern-crit" class="game__button">Spawn Intern Crit</button>
          <button id="spawn-talent-scout-crit" class="game__button">Spawn Talent Scout Crit</button>
          <button id="spawn-union-boss-crit" class="game__button">Spawn Union Boss Crit</button>
          <button id="spawn-rush-hour-crit" class="game__button">Spawn Rush Hour Crit</button>
          <button id="spawn-rate-lock-crit" class="game__button">Spawn Rate Lock Crit</button>
          <button id="spawn-golden-ticket-crit" class="game__button">Spawn Golden Ticket Crit</button>
          <button id="spawn-silver-ticket-crit" class="game__button">Spawn Silver Ticket Crit</button>
          <button id="spawn-grand-opening-crit" class="game__button">Spawn Grand Opening Crit</button>
          <button id="spawn-mystic-crit" class="game__button">Spawn Mystic Crit</button>
          <button id="spawn-keynote-crit" class="game__button">Spawn Keynote Crit</button>
          <button id="spawn-fully-staffed-crit" class="game__button">Spawn Fully Staffed Crit</button>
          <button id="spawn-shift-change-crit" class="game__button">Spawn Shift Change Crit</button>
          <button id="spawn-espresso-shot-crit" class="game__button">Spawn Espresso Shot Crit</button>
          <button id="spawn-deja-vu-crit" class="game__button">Spawn Deja Vu Crit</button>
          <button id="spawn-clone-army-crit" class="game__button">Spawn Reinforcements Crit</button>
          <button id="spawn-lucky-clover-crit" class="game__button">Spawn Lucky Clover Crit</button>
          <button id="spawn-second-wind-crit" class="game__button">Spawn Second Wind Crit</button>
          <button id="spawn-executive-order-crit" class="game__button">Spawn Executive Order Crit</button>
          <button id="spawn-round-up-crit" class="game__button">Spawn Round Up Crit</button>
          <button id="spawn-safety-net-crit" class="game__button">Spawn Safety Net Crit</button>
          <button id="spawn-floor-share-crit" class="game__button">Spawn Floor Share Crit</button>
          <button id="spawn-same-boat-crit" class="game__button">Spawn Same Boat Crit</button>
          <button id="spawn-golden-handshake-crit" class="game__button">Spawn Golden Handshake Crit</button>
          <button id="spawn-supply-run-crit" class="game__button">Spawn Supply Run Crit</button>
          <button id="spawn-casual-friday-crit" class="game__button">Spawn Casual Friday Crit</button>
          <button id="spawn-fancy-friday-crit" class="game__button">Spawn Fancy Friday Crit</button>
          <button id="spawn-fire-drill-crit" class="game__button">Spawn Fire Drill Crit</button>
          <button id="spawn-bonus-round-crit" class="game__button">Spawn Bonus Round Crit</button>
          <button id="spawn-overflow-crit" class="game__button">Spawn Overflow Crit</button>
          <button id="spawn-performance-bonus-crit" class="game__button">Spawn Performance Bonus Crit</button>
          <button id="spawn-double-down-crit" class="game__button">Spawn Double Down Crit</button>
          <button id="spawn-coffee-run-crit" class="game__button">Spawn Coffee Run Crit</button>
          <button id="spawn-team-building-crit" class="game__button">Spawn Team Building Crit</button>
          <button id="spawn-team-lunch-crit" class="game__button">Spawn Team Lunch Crit</button>
          <button id="spawn-spring-cleaning-crit" class="game__button">Spawn Spring Cleaning Crit</button>
          <button id="spawn-night-owl-crit" class="game__button">Spawn Night Owl Crit</button>
          <button id="spawn-headhunter-crit" class="game__button">Spawn Headhunter Crit</button>
          <button id="spawn-dress-code-crit" class="game__button">Spawn Dress Code Crit</button>
          <button id="spawn-tea-break-crit" class="game__button">Spawn Tea Break Crit</button>
          <button id="spawn-recruitment-drive-crit" class="game__button">Spawn Recruitment Drive Crit</button>
          <button id="spawn-merger-crit" class="game__button">Spawn Merger Crit</button>
          <button id="spawn-shareholders-crit" class="game__button">Spawn Shareholders Crit</button>
          <button id="spawn-golden-parachute-crit" class="game__button">Spawn Golden Parachute Crit</button>
          <button id="spawn-payout-crit" class="game__button">Spawn Payout Crit</button>
          <button id="spawn-executive-bonus-crit" class="game__button">Spawn Executive Bonus Crit</button>
          <button id="spawn-power-surge-crit" class="game__button">Spawn Power Surge Crit</button>
          <button id="spawn-price-match-crit" class="game__button">Spawn Price Match Crit</button>
          <button id="spawn-first-class-crit" class="game__button">Spawn First Class Crit</button>
          <button id="spawn-lucky-number-crit" class="game__button">Spawn Lucky Number Crit</button>
          <button id="spawn-open-book-crit" class="game__button">Spawn Open Book Crit</button>
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
          <button id="floor-buy-mystic-crit" class="game__button">Floor Mystic Crit</button>
          <button id="floor-buy-keynote-crit" class="game__button">Floor Keynote Crit</button>
          <button id="floor-buy-fully-staffed-crit" class="game__button">Floor Fully Staffed Crit</button>
          <button id="floor-buy-espresso-shot-crit" class="game__button">Floor Espresso Shot Crit</button>
          <button id="floor-buy-deja-vu-crit" class="game__button">Floor Deja Vu Crit</button>
          <button id="floor-buy-clone-army-crit" class="game__button">Floor Reinforcements Crit</button>
          <button id="floor-buy-golden-parachute-crit" class="game__button">Floor Golden Parachute Crit</button>
          <button id="floor-buy-payout-crit" class="game__button">Floor Payout Crit</button>
          <button id="floor-buy-lucky-clover-crit" class="game__button">Floor Lucky Clover Crit</button>
          <button id="floor-buy-second-wind-crit" class="game__button">Floor Second Wind Crit</button>
          <button id="floor-buy-executive-order-crit" class="game__button">Floor Executive Order Crit</button>
          <button id="floor-buy-round-up-crit" class="game__button">Floor Round Up Crit</button>
          <button id="floor-buy-golden-handshake-crit" class="game__button">Floor Golden Handshake Crit</button>
          <button id="floor-buy-supply-run-crit" class="game__button">Floor Supply Run Crit</button>
          <button id="floor-buy-casual-friday-crit" class="game__button">Floor Casual Friday Crit</button>
          <button id="floor-buy-fancy-friday-crit" class="game__button">Floor Fancy Friday Crit</button>
          <button id="floor-buy-fire-drill-crit" class="game__button">Floor Fire Drill Crit</button>
          <button id="floor-buy-performance-bonus-crit" class="game__button">Floor Performance Bonus Crit</button>
          <button id="floor-buy-double-down-crit" class="game__button">Floor Double Down Crit</button>
          <button id="floor-buy-coffee-run-crit" class="game__button">Floor Coffee Run Crit</button>
          <button id="floor-buy-team-building-crit" class="game__button">Floor Team Building Crit</button>
          <button id="floor-buy-spring-cleaning-crit" class="game__button">Floor Spring Cleaning Crit</button>
          <button id="floor-buy-night-owl-crit" class="game__button">Floor Night Owl Crit</button>
          <button id="floor-buy-headhunter-crit" class="game__button">Floor Headhunter Crit</button>
          <button id="floor-buy-dress-code-crit" class="game__button">Floor Dress Code Crit</button>
          <button id="floor-buy-tea-break-crit" class="game__button">Floor Tea Break Crit</button>
          <button id="floor-buy-recruitment-drive-crit" class="game__button">Floor Recruitment Drive Crit</button>
          <button id="floor-buy-blueprint-crit" class="game__button">Floor Blueprint Crit</button>
          <button id="floor-buy-domino-effect-crit" class="game__button">Floor Domino Effect Crit</button>
          <button id="floor-buy-executive-bonus-crit" class="game__button">Floor Executive Bonus Crit</button>
          <button id="floor-buy-power-surge-crit" class="game__button">Floor Power Surge Crit</button>
          <button id="floor-buy-price-match-crit" class="game__button">Floor Price Match Crit</button>
          <button id="floor-buy-first-class-crit" class="game__button">Floor First Class Crit</button>
          <button id="floor-buy-lucky-number-crit" class="game__button">Floor Lucky Number Crit</button>
          <button id="floor-buy-open-book-crit" class="game__button">Floor Open Book Crit</button>
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
          <button id="map-unlock-mystic-crit" class="game__button">Map Unlock Mystic Crit</button>
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

export function wireSpawnBlueprintCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-blueprint-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnDominoEffectCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-domino-effect-crit",
  )!;
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

export function wireSpawnSpendingFreezeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-spending-freeze-crit",
  )!;
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

export function wireSpawnBullMarketCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-bull-market-crit",
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

export function wireSpawnTalentScoutCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-talent-scout-crit",
  )!;
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

export function wireSpawnRateLockCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-rate-lock-crit",
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

export function wireSpawnMysticCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-mystic-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnKeynoteCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-keynote-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFullyStaffedCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-fully-staffed-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnShiftChangeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-shift-change-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnEspressoShotCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-espresso-shot-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnDejaVuCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-deja-vu-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnCloneArmyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-clone-army-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnLuckyCloverCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-lucky-clover-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSecondWindCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-second-wind-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnExecutiveOrderCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-executive-order-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnRoundUpCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-round-up-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSafetyNetCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-safety-net-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFloorShareCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-floor-share-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSameBoatCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-same-boat-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnGoldenHandshakeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-golden-handshake-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSupplyRunCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-supply-run-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnCasualFridayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-casual-friday-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFancyFridayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-fancy-friday-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnFireDrillCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-fire-drill-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnBonusRoundCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-bonus-round-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnOverflowCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-overflow-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnPerformanceBonusCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-performance-bonus-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnDoubleDownCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-double-down-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnCoffeeRunCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-coffee-run-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnDressCodeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-dress-code-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnTeaBreakCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-tea-break-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnTeamBuildingCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-team-building-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnTeamLunchCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-team-lunch-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnSpringCleaningCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-spring-cleaning-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnNightOwlCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-night-owl-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnHeadhunterCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-headhunter-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnRecruitmentDriveCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-recruitment-drive-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpawnMergerCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#spawn-merger-crit")!;
  button.addEventListener("click", onClick);
}

export function wireSpawnShareholdersCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-shareholders-crit",
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

export function wireSpawnExecutiveBonusCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#spawn-executive-bonus-crit")!
    .addEventListener("click", onClick);
}

export function wireSpawnPowerSurgeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#spawn-power-surge-crit")!
    .addEventListener("click", onClick);
}

export function wireSpawnPriceMatchCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#spawn-price-match-crit")!
    .addEventListener("click", onClick);
}

export function wireSpawnFirstClassCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#spawn-first-class-crit")!
    .addEventListener("click", onClick);
}

export function wireSpawnLuckyNumberCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#spawn-lucky-number-crit")!
    .addEventListener("click", onClick);
}

export function wireSpawnOpenBookCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#spawn-open-book-crit")!
    .addEventListener("click", onClick);
}

export function wireSpawnCashFlowCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#spawn-cash-flow-crit",
  )!;
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

export function wireFloorBuyMysticCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-mystic-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyKeynoteCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-keynote-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyFullyStaffedCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-fully-staffed-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyEspressoShotCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-espresso-shot-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyDejaVuCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-deja-vu-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyCloneArmyCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-clone-army-crit",
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

export function wireFloorBuyLuckyCloverCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-lucky-clover-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySecondWindCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-second-wind-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyExecutiveOrderCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-executive-order-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyRoundUpCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-round-up-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyGoldenHandshakeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-golden-handshake-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySupplyRunCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-supply-run-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyCasualFridayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-casual-friday-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyFancyFridayCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-fancy-friday-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyFireDrillCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-fire-drill-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyPerformanceBonusCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-performance-bonus-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyDoubleDownCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-double-down-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyCoffeeRunCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-coffee-run-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyDressCodeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-dress-code-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyTeaBreakCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-tea-break-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyBlueprintCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#floor-buy-blueprint-crit")!
    .addEventListener("click", onClick);
}

export function wireFloorBuyDominoEffectCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#floor-buy-domino-effect-crit")!
    .addEventListener("click", onClick);
}

export function wireFloorBuyExecutiveBonusCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#floor-buy-executive-bonus-crit")!
    .addEventListener("click", onClick);
}

export function wireFloorBuyPowerSurgeCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#floor-buy-power-surge-crit")!
    .addEventListener("click", onClick);
}

export function wireFloorBuyPriceMatchCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#floor-buy-price-match-crit")!
    .addEventListener("click", onClick);
}

export function wireFloorBuyFirstClassCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#floor-buy-first-class-crit")!
    .addEventListener("click", onClick);
}

export function wireFloorBuyLuckyNumberCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#floor-buy-lucky-number-crit")!
    .addEventListener("click", onClick);
}

export function wireFloorBuyOpenBookCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  container
    .querySelector<HTMLButtonElement>("#floor-buy-open-book-crit")!
    .addEventListener("click", onClick);
}

export function wireFloorBuyTeamBuildingCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-team-building-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuySpringCleaningCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-spring-cleaning-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyNightOwlCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-night-owl-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyHeadhunterCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-headhunter-crit",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFloorBuyRecruitmentDriveCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#floor-buy-recruitment-drive-crit",
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

export function wireMapUnlockMysticCritButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#map-unlock-mystic-crit",
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

// live text filter over every dev button in the bar. Matching buttons stay
// visible and their section is forced open; a section with no matches is
// hidden entirely. Whatever the player had open by hand is remembered and
// restored once the filter is cleared
export function wireTestActionsFilter(container: HTMLElement): void {
  const input = container.querySelector<HTMLInputElement>(
    "#test-actions-filter",
  );
  if (!input) return;
  const empty = container.querySelector<HTMLParagraphElement>(
    "#test-actions-empty",
  );
  const dropdowns = Array.from(
    container.querySelectorAll<HTMLDetailsElement>(".test-actions-dropdown"),
  );
  let manualOpenState: boolean[] | null = null;

  function apply(): void {
    const query = input!.value.trim().toLowerCase();
    const filtering = query.length > 0;
    if (filtering && manualOpenState === null) {
      manualOpenState = dropdowns.map((d) => d.open);
    }
    let totalMatches = 0;
    dropdowns.forEach((dropdown, index) => {
      const toggle = dropdown.querySelector<HTMLElement>(
        ".test-actions-dropdown__toggle",
      );
      let matches = 0;
      for (const button of dropdown.querySelectorAll<HTMLButtonElement>(
        ".game__button",
      )) {
        const hit =
          !filtering ||
          (button.textContent ?? "").toLowerCase().includes(query);
        button.hidden = !hit;
        if (hit) matches++;
      }
      totalMatches += matches;
      dropdown.hidden = filtering && matches === 0;
      dropdown.classList.toggle(
        "test-actions-dropdown--filtered",
        filtering && matches > 0,
      );
      if (filtering) dropdown.open = matches > 0;
      else if (manualOpenState) dropdown.open = manualOpenState[index];
      if (toggle) toggle.dataset.matches = filtering ? String(matches) : "";
    });
    if (!filtering) manualOpenState = null;
    if (empty) empty.hidden = !filtering || totalMatches > 0;
  }

  input.addEventListener("input", apply);
  apply();
}
