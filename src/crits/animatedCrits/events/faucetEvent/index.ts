// the "Faucet" event (money; a crit tier and cash): it covers its crit, whose
// click freezes the screen while a tap wisp flies up out of the clicked
// floor's button to the top of the screen over its income bar and starts to
// drip: fat drops of cash fall onto the bar, plop, plop, each a splash, a
// bloop and a jolt, quicker and quicker, until the tap bursts wide open and
// a solid column of cash thunders down onto the bar, which jumps a crit tier
// in a huge blast and shake as the coins sweep into the total. Pays floor
// income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { easeOut, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "faucet";
const REWARD = 3;
const DRIPS = 6;
const TOP = 160;
const RISE_MS = 300;
const TAP = 0.6;
const DRIP_SHAKE: [number, number] = [0.3, 0.9];

export const forceFaucetEvent = registerWispEvent(
  KEY,
  "Faucet",
  () => CONFIG.faucetEvent.chance,
  (floor, context, area) => {
    const { dripsMs, fallMs, gushMs, holdMs, mergeMs } = CONFIG.faucetEvent;
    const found = findRewardBars(floor, context);
    const bar = found.find((b) => b.floor === floor) ?? found[0];
    if (!bar) return;
    const button = getButtonCenter(context.isGroundFloor);
    const tap: Point = { x: bar.center.x, y: area.top + TOP };
    const line = sampleLine(
      (u) => ({ x: tap.x, y: lerp([tap.y, bar.center.y], u) }),
      30,
    );
    const drip: Pour = {
      coinsAlong: 700,
      width: 16,
      streamMs: 70,
      travelMs: fallMs,
    };
    const gush: Pour = {
      coinsAlong: 900,
      width: 44,
      streamMs: gushMs,
      travelMs: fallMs,
    };
    let clock = RISE_MS;
    const drips = Array.from({ length: DRIPS }, (_, k) => {
      const starts = clock;
      clock += lerp(dripsMs, k / (DRIPS - 1));
      return { starts, lands: starts + fallMs };
    });
    const gushAt = clock;
    const landsAt = gushAt + fallMs;
    const durationMs = Math.max(
      pourDurationMs(gushAt, gush),
      landsAt + holdMs + mergeMs,
    );
    const tapAt: Point = { x: 0, y: 0 };
    const tapWisp = (ms: number): Point => {
      const u = easeOut(Math.min(1, ms / RISE_MS));
      tapAt.x = lerp([button.x, tap.x], u);
      tapAt.y = lerp([button.y, tap.y], u);
      return tapAt;
    };

    const dripping = createBeats(
      drips,
      (d) => d.starts,
      () => pourLine(cover!, line, drip),
    );
    const plopping = createBeats(
      drips,
      (d) => d.lands,
      (_, k) => {
        cover!.burst(bar.center, 0.3);
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(DRIP_SHAKE, k / (DRIPS - 1)));
      },
    );
    const gushing = createBeats(
      [gushAt],
      (ms) => ms,
      () => {
        pourLine(cover!, line, gush);
        cover!.burst(tap, 0.8);
        if (cover!.isLive()) playExplosion();
      },
    );
    const landing = createBeats(
      [landsAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, tap);
        cover!.slam(bar);
        cover!.blast(bar.center);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars: [bar],
        tick: (ms, now) => {
          dripping.tick(ms, now);
          plopping.tick(ms, now);
          gushing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) =>
          drawWispBetween(
            ctx,
            tapWisp,
            ms,
            now,
            WISP_SIZE * TAP,
            Math.min(1, ms / gushAt),
            0,
            gushAt + gushMs,
          ),
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
