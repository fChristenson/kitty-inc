import type { Floor } from "../../gameState";
import type { CritTier } from "../../shared/critTypes";
export { createTestButtonMarkup, wireCritTestActions } from "./critTestActions";

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

export function wireIdleOverlayTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-idle-overlay")!;
  button.addEventListener("click", onClick);
}

export function wireBoostEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-boost-event")!;
  button.addEventListener("click", onClick);
}

export function wireUnionEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-union-event")!;
  button.addEventListener("click", onClick);
}

export function wireHuntEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-hunt-event")!;
  button.addEventListener("click", onClick);
}

export function wireKickbackEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-kickback-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireBurstEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-burst-event")!;
  button.addEventListener("click", onClick);
}

export function wireSprayEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-spray-event")!;
  button.addEventListener("click", onClick);
}

export function wireFountainEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-fountain-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireRippleEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-ripple-event")!;
  button.addEventListener("click", onClick);
}

export function wireVortexEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-vortex-event")!;
  button.addEventListener("click", onClick);
}

export function wireRicochetEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-ricochet-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireWaterfallEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-waterfall-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireConveyorEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-conveyor-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireFirefliesEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-fireflies-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wirePaydayEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-payday-event")!;
  button.addEventListener("click", onClick);
}

export function wirePiggyBankEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-piggy-bank-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireCoinTossEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-coin-toss-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireHourglassEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-hourglass-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireRocketEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-rocket-event")!;
  button.addEventListener("click", onClick);
}

export function wireRevealEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-reveal-event")!;
  button.addEventListener("click", onClick);
}

export function wireWispEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-wisp-event")!;
  button.addEventListener("click", onClick);
}

export function wirePolishEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-polish-event")!;
  button.addEventListener("click", onClick);
}

export function wireLighthouseEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-lighthouse-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireRecruitEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-recruit-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wirePromotionDayEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-promotion-day-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireAlchemyEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-alchemy-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireInvestmentEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-investment-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireDividendsEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-dividends-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSparkChainEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-spark-chain-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMentorEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-mentor-event")!;
  button.addEventListener("click", onClick);
}

export function wireCometEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-comet-event")!;
  button.addEventListener("click", onClick);
}

export function wireMeteorShowerEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-meteor-shower-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireHaloEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-halo-event")!;
  button.addEventListener("click", onClick);
}

export function wireBlessingEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-blessing-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireAscendEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-ascend-event")!;
  button.addEventListener("click", onClick);
}

export function wireRisingTideEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-rising-tide-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireTidalWaveEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-tidal-wave-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireBeanstalkEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-beanstalk-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireConstellationEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-constellation-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSpilloverEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-spillover-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireMagnetEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-magnet-event")!;
  button.addEventListener("click", onClick);
}

export function wireDownpourEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-downpour-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireTrickleEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-trickle-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireWreckingBallEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-wrecking-ball-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wirePiledriverEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-piledriver-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireOrbitalStrikeEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-orbital-strike-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireFuseEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-fuse-event")!;
  button.addEventListener("click", onClick);
}
export function wireSupernovaEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-supernova-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireBowlingEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-bowling-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireThunderclapEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-thunderclap-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireChainReactionEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-chain-reaction-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireBullseyeEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-bullseye-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wirePopcornEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-popcorn-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireNewtonsCradleEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-newtons-cradle-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireSlashEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-slash-event")!;
  button.addEventListener("click", onClick);
}
export function wireJackhammerEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-jackhammer-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wirePummelEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-pummel-event")!;
  button.addEventListener("click", onClick);
}
export function wireOverloadEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-overload-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireGatlingEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-gatling-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wirePressEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-press-event")!;
  button.addEventListener("click", onClick);
}
export function wireDrillEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-drill-event")!;
  button.addEventListener("click", onClick);
}
export function wireBurrowEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-burrow-event")!;
  button.addEventListener("click", onClick);
}
export function wirePingPongEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-ping-pong-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireSlamDunkEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-slam-dunk-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireUppercutEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-uppercut-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireHeadHopEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-head-hop-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wirePaparazziEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-paparazzi-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireMissileBarrageEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-missile-barrage-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireSonicBoomEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-sonic-boom-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireMitosisEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-mitosis-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wirePlinkoEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-plinko-event")!;
  button.addEventListener("click", onClick);
}
export function wireHammerThrowEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-hammer-throw-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireSnakeEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-snake-event")!;
  button.addEventListener("click", onClick);
}
export function wireBreakoutEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-breakout-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireLineClearEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-line-clear-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireBreakShotEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-break-shot-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireBulletHellEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-bullet-hell-event",
  )!;
  button.addEventListener("click", onClick);
}
export function wireChainPayEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-chain-pay-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireTwisterEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-twister-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireJackpotReelsEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-jackpot-reels-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireStreamEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-stream-event")!;
  button.addEventListener("click", onClick);
}

export function wireTrailsEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-trails-event")!;
  button.addEventListener("click", onClick);
}

// onClick gets the tier whose number to draw, or undefined to roll it
export function wireDrawEventTestButton(
  container: HTMLElement,
  onClick: (tier: CritTier | undefined) => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-draw-event")!;
  const select = container.querySelector<HTMLSelectElement>(
    "#test-draw-event-tier",
  )!;
  button.addEventListener("click", () =>
    onClick(select.value === "random" ? undefined : (select.value as CritTier)),
  );
}

// onClick gets the tier whose number to trace, or undefined to roll it
export function wireNightSkyEventTestButton(
  container: HTMLElement,
  onClick: (tier: CritTier | undefined) => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-night-sky-event",
  )!;
  const select = container.querySelector<HTMLSelectElement>(
    "#test-night-sky-event-tier",
  )!;
  button.addEventListener("click", () =>
    onClick(select.value === "random" ? undefined : (select.value as CritTier)),
  );
}

// onClick gets the tier whose number to draw, or undefined to roll it
export function wirePitcherEventTestButton(
  container: HTMLElement,
  onClick: (tier: CritTier | undefined) => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-pitcher-event",
  )!;
  const select = container.querySelector<HTMLSelectElement>(
    "#test-pitcher-event-tier",
  )!;
  button.addEventListener("click", () =>
    onClick(select.value === "random" ? undefined : (select.value as CritTier)),
  );
}

export function wireGlimmerEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-glimmer-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireSwarmEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-swarm-event")!;
  button.addEventListener("click", onClick);
}

export function wireRenovateEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-renovate-event",
  )!;
  button.addEventListener("click", onClick);
}

export function wireUpgradeEventTestButton(
  container: HTMLElement,
  onClick: () => void,
): void {
  const button = container.querySelector<HTMLButtonElement>(
    "#test-upgrade-event",
  )!;
  button.addEventListener("click", onClick);
}

// onClick gets the unlock roll to force: a tier, null for no crit, or
// undefined to roll it normally
export function wireUnlockEventTestButton(
  container: HTMLElement,
  onClick: (unlockCrit: CritTier | null | undefined) => void,
): void {
  const button =
    container.querySelector<HTMLButtonElement>("#test-unlock-event")!;
  const select = container.querySelector<HTMLSelectElement>(
    "#test-unlock-event-crit",
  )!;
  button.addEventListener("click", () => {
    const value = select.value;
    onClick(
      value === "random"
        ? undefined
        : value === "none"
          ? null
          : (value as CritTier),
    );
  });
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
          button.dataset.eventUnavailable !== "true" &&
          (!filtering ||
            (button.textContent ?? "").toLowerCase().includes(query));
        button.hidden = !hit;
        if (hit) matches++;
      }
      totalMatches += matches;
      const hasEventSelector =
        dropdown.querySelector("#test-crit-event") !== null;
      dropdown.hidden = filtering && matches === 0 && !hasEventSelector;
      dropdown.classList.toggle(
        "test-actions-dropdown--filtered",
        filtering && matches > 0,
      );
      if (filtering) dropdown.open = matches > 0 || hasEventSelector;
      else if (manualOpenState) dropdown.open = manualOpenState[index];
      if (toggle) toggle.dataset.matches = filtering ? String(matches) : "";
    });
    if (!filtering) manualOpenState = null;
    if (empty) empty.hidden = !filtering || totalMatches > 0;
  }

  input.addEventListener("input", apply);
  apply();
}
