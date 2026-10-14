// Blowout, a button crit: coins start spurting out of the top of every
// button, each spurt higher, thicker and sooner than the last, the buttons'
// glow swelling and light racing into them, the rumble building; then the
// pressure blows: every button erupts in a towering geyser of hundreds of
// coins, from the bottom of the building up, its own last and highest, the
// coins raining back down onto them; each button turns over: its next taps
// also spill a level onto the floors above and below
import meta from "./meta";
import { defineTapPerk } from "../../buttonBonus";
import {
  beginCoinBatch,
  drawCoinBurstFrame,
  endCoinBatch,
  type CoinBurstSprite,
} from "../../../../coinBurst";
import {
  chargeAt,
  drawChargeGlow,
  drawChargeStreaks,
  planCharge,
  tickCharge,
  type Charge,
} from "../../../../shared/animationStyles/charge";
import {
  DETONATION_MS,
  drawDetonation,
} from "../../../../shared/animationStyles/explosion";
import { BTN_H } from "../../../../floors/upgradeButton";
import {
  registerFloorCrit,
  type Point,
  type Running,
  drawText,
  lerp,
} from "../../../floorCrits/critPlayer";
import { holeHash, ownLast } from "../../../floorCrits/critPlayer/shared";

const IN_MS = 160;
// the spurts: SPURTS from FIRST_MS, GAPS_MS apart (closing), each up to
// HEIGHT px (higher each), COINS coins a button (more each), fanned SPREAD
// px a ms either way
const FIRST_MS = IN_MS + 80;
const SPURTS = 5;
const GAPS_MS: [number, number] = [320, 130];
const HEIGHT: [number, number] = [90, 280];
const COINS: [number, number] = [8, 20];
const SPREAD = 0.12;
// the blowout: BLOW_GAP_MS after the last spurt, each button STAGGER_MS after
// the one below; GEYSER coins up to GEYSER_H px (its own OWN_GEYSER,
// OWN_GEYSER_H), fanned GEYSER_SPREAD
const BLOW_GAP_MS = 200;
const STAGGER_MS = 45;
const GEYSER = 60;
const GEYSER_H: [number, number] = [380, 620];
const OWN_GEYSER = 100;
const OWN_GEYSER_H: [number, number] = [520, 820];
const GEYSER_SPREAD = 0.22;
// gravity, px/ms²
const G = 0.006;
const COIN = 22;
const COIN_SPIN = 0.025;
const GLOW = 240;
const STREAKS = 220;
const SPURT_BLAST = 70;
const BLAST = 180;
const OWN_BLAST = 320;
// shakes by step: a spurt, a button blowing, its own
const SHAKES = [0.3, 1, 2.8];

interface Coin {
  bar: number;
  launchMs: number;
  vx: number;
  vy: number;
  landMs: number;
  size: number;
  sprite: CoinBurstSprite;
}
interface State {
  coins: Coin[];
  spurts: number[];
  // each bar's blowout
  blows: number[];
  charge: Charge;
}
const states = new WeakMap<Running, State>();
const top: Point = { x: 0, y: 0 };

// each tap also spilling a level onto the floors above and below
const spillTaps = defineTapPerk("Spill", (t) => {
  const index = t.floors.indexOf(t.floor);
  for (const near of [t.floors[index + 1], t.floors[index - 1]])
    if (near) t.levelUp(near, 1, "+1 Lvl");
});

const topOf = (button: Point, into: Point): Point => {
  into.x = button.x;
  into.y = button.y - BTN_H / 2;
  return into;
};

// a coin shot up from a button's top at launchMs, peaking at `height`
function shoot(
  coins: Coin[],
  bar: number,
  launchMs: number,
  height: number,
  spread: number,
  k: number,
): void {
  const vy = Math.sqrt(2 * G * height);
  coins.push({
    bar,
    launchMs,
    vx: (holeHash(k, 2710) * 2 - 1) * spread,
    vy,
    landMs: launchMs + (2 * vy) / G,
    size: COIN * lerp(0.8, 1.2, holeHash(k, 2711)),
    sprite: {
      kind: k % 5 === 0 ? "bill" : "coin",
      spinFrame: 0,
      axisAngle: (holeHash(k, 2712) - 0.5) * Math.PI,
    },
  });
}

registerFloorCrit("blowoutCrit", {
  // spill taps, twice as many on its own
  reward(t) {
    const taps = Math.max(1, Math.round(t.count * meta.values.taps));
    spillTaps.add(t.floor, t.own ? taps * 2 : taps);
    t.flipButton();
  },
  plan(r, bars, hit) {
    const coins: Coin[] = [];
    const spurts: number[] = [];
    let k = 0;
    let t = FIRST_MS;
    for (let s = 0; s < SPURTS; s++) {
      const u = s / (SPURTS - 1);
      spurts.push(t);
      const n = Math.round(lerp(COINS[0], COINS[1], u));
      for (let bar = 0; bar < bars.length; bar++)
        for (let i = 0; i < n; i++, k++)
          shoot(
            coins,
            bar,
            t + i * 6,
            lerp(HEIGHT[0], HEIGHT[1], u) * lerp(0.6, 1, holeHash(k, 2713)),
            SPREAD,
            k,
          );
      hit(0, t, 0);
      t += lerp(GAPS_MS[0], GAPS_MS[1], u);
    }
    const blowMs = spurts[SPURTS - 1] + BLOW_GAP_MS;
    const blows: number[] = [];
    // from the bottom of the building up, its own last
    [...ownLast(bars).slice(0, -1).reverse(), 0].forEach((bar, j) => {
      const own = bar === 0;
      const at = blowMs + j * STAGGER_MS;
      blows[bar] = at;
      const [low, high] = own ? OWN_GEYSER_H : GEYSER_H;
      for (let i = 0; i < (own ? OWN_GEYSER : GEYSER); i++, k++)
        shoot(
          coins,
          bar,
          at + i * 3,
          lerp(low, high, holeHash(k, 2714)),
          GEYSER_SPREAD,
          k,
        );
      hit(bar, at, own ? 2 : 1);
    });
    states.set(r, {
      coins,
      spurts,
      blows,
      charge: planCharge(FIRST_MS, blowMs - FIRST_MS, { bang: false }),
    });
  },
  draw(ctx, r, ms, bars) {
    const state = states.get(r);
    if (!state) return;
    const now = r.startedAt + ms;
    if (ms < IN_MS)
      drawText(ctx, r.glyphs, r.label, 0, 0, r.flashFont, {
        alpha: 1 - ms / IN_MS,
      });
    tickCharge(state.charge, ms, r.shake);
    const c = chargeAt(state.charge, ms);
    // the pressure building in every button
    for (let bar = 0; bar < bars.length; bar++) {
      if (ms >= state.blows[bar]) continue;
      topOf(bars[bar], top);
      drawChargeStreaks(ctx, top, c, STREAKS, ms);
      drawChargeGlow(ctx, top, c, bar === 0 ? GLOW * 1.3 : GLOW, now);
    }
    // the blasts under the coins, so the spurts show over them
    for (let k = 0; k < state.spurts.length * bars.length; k++) {
      const bar = k % bars.length;
      topOf(bars[bar], top);
      drawDetonation(
        ctx,
        top,
        ms - state.spurts[Math.floor(k / bars.length)],
        SPURT_BLAST,
        now,
      );
    }
    for (let bar = 0; bar < bars.length; bar++) {
      topOf(bars[bar], top);
      drawDetonation(
        ctx,
        top,
        ms - state.blows[bar],
        bar === 0 ? OWN_BLAST : BLAST,
        now,
      );
    }
    const base = ctx.getTransform();
    beginCoinBatch(ctx);
    const { coins } = state;
    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      if (ms < coin.launchMs || ms >= coin.landMs) continue;
      const t = ms - coin.launchMs;
      const button = bars[coin.bar];
      coin.sprite.spinFrame = ms * COIN_SPIN + i;
      drawCoinBurstFrame(
        ctx,
        coin.sprite,
        button.x + coin.vx * t,
        button.y - BTN_H / 2 - (coin.vy * t - (G * t * t) / 2),
        coin.size,
        base,
      );
    }
    endCoinBatch(ctx);
  },
  tailMs: DETONATION_MS + 600,
  shake: (step) => SHAKES[step] ?? SHAKES[0],
});
