// the "Twirl" event (mix; crit tiers and cash): it covers its crit, whose
// click freezes the screen while a wisp flies out of the clicked floor's
// button to hover over an income bar and starts to twirl, a skirt of cash
// flaring out round it in spinning jets, faster and faster as the screen
// hums; then it stamps straight down onto the bar with a bang and a big
// jolt and the bar jumps a crit tier; it twirls over the next bar and
// stamps again, the last stamp a huge blast and shake as the coins sweep
// into the total. Pays floor income × floor number × REWARD
import { CONFIG } from "../../../../config";
import { playBoostEventStream } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  type Pour,
} from "../../cashFlow";
import { findRewardBars } from "../../eventRewards";

const KEY = "twirl";
const REWARD = 2;
const MAX_BARS = 2;
const ABOVE = 130;
const MOVE_MS = 200;
const STAMP_MS = 120;
// each twirl throws JETS jets SKIRT px out, swinging round as it spins
const JETS = 10;
const SKIRT = 120;
const TWIRLER = 0.6;
const HIT_SHAKE: [number, number] = [1, 1.5];

export const forceTwirlEvent = registerWispEvent(
  KEY,
  "Twirl",
  () => CONFIG.twirlEvent.chance,
  (floor, context) => {
    const { twirlsMs, holdMs, mergeMs } = CONFIG.twirlEvent;
    const found = findRewardBars(floor, context);
    const own = found.find((b) => b.floor === floor);
    const bars = [
      ...(own ? [own] : []),
      ...found.filter((b) => b !== own),
    ].slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const jet: Pour = {
      coinsAlong: 500,
      width: 18,
      streamMs: 120,
      travelMs: 280,
    };
    let clock = 0;
    let from: Point = button;
    const twirls = bars.map((bar, k) => {
      const over: Point = { x: bar.center.x, y: bar.center.y - ABOVE };
      const moves = clock;
      const spins = moves + MOVE_MS;
      const span = lerp(twirlsMs, k / Math.max(1, bars.length - 1));
      const stamps = spins + span;
      clock = stamps + STAMP_MS;
      const spin = k % 2 === 0 ? 1 : -1;
      const jets = Array.from({ length: JETS }, (_, i) => {
        const u = i / JETS;
        const a = spin * u * Math.PI * 4;
        const end: Point = {
          x: over.x + Math.cos(a) * SKIRT,
          y: over.y + Math.sin(a) * SKIRT * 0.5 + 30,
        };
        return {
          at: spins + span * Math.sqrt(u),
          line: sampleLine(
            (v) => ({
              x: lerp([over.x, end.x], v),
              y: lerp([over.y, end.y], v) + Math.sin(Math.PI * v) * 20,
            }),
            12,
          ),
        };
      });
      const twirl = {
        bar,
        from,
        over,
        moves,
        spins,
        stamps,
        lands: clock,
        jets,
      };
      from = over;
      return twirl;
    });
    const last = twirls[twirls.length - 1];
    const endAt = last.lands;
    const jets = twirls.flatMap((t) => t.jets);
    const durationMs = Math.max(
      pourDurationMs(Math.max(...jets.map((j) => j.at)), jet),
      endAt + holdMs + mergeMs,
    );
    const twirlerAt: Point = { x: 0, y: 0 };
    const twirler = (ms: number): Point => {
      let t = twirls[0];
      for (const tw of twirls) if (ms >= tw.moves) t = tw;
      if (ms < t.spins) {
        const u = smoothstep(clamp01((ms - t.moves) / MOVE_MS));
        twirlerAt.x = lerp([t.from.x, t.over.x], u);
        twirlerAt.y = lerp([t.from.y, t.over.y], u);
      } else if (ms < t.stamps) {
        const wobble = 6 * ((ms - t.spins) / (t.stamps - t.spins));
        twirlerAt.x = t.over.x + Math.cos(ms / 30) * wobble;
        twirlerAt.y = t.over.y + Math.sin(ms / 30) * wobble * 0.5;
      } else {
        const u = easeIn(clamp01((ms - t.stamps) / STAMP_MS));
        twirlerAt.x = t.over.x;
        twirlerAt.y = lerp([t.over.y, t.bar.center.y], u);
      }
      return twirlerAt;
    };

    const spraying = createBeats(
      jets,
      (j) => j.at,
      (j) => pourLine(cover!, j.line, jet),
    );
    const stamping = createBeats(
      twirls,
      (t) => t.lands,
      (t, k) => {
        cover!.tierUp(t.bar, t.over);
        if (t === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(t.bar.center);
          return;
        }
        cover!.burst(t.bar.center, 0.7);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, twirls.length - 1)));
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          spraying.tick(ms, now);
          stamping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms <= endAt)
            drawWispBetween(
              ctx,
              twirler,
              ms,
              now,
              WISP_SIZE * TWIRLER,
              0.9,
              0,
              endAt,
            );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
