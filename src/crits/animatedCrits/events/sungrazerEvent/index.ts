// the "Sungrazer" event (mix; crit tiers and cash): it covers its crit,
// whose click freezes the screen while a comet wisp plunges in from off the
// screen and whips in a tight hairpin round the clicked floor's button like
// a comet grazing the sun, its great tail of streaming cash always blown
// straight out away from the button, so it sweeps round the screen like a
// searchlight as the comet swings past; every bar the tail sweeps over
// jumps a crit tier with a flash and a jolt, the last in a huge blast and
// shake as the comet flies off. Pays floor income × floor number × REWARD,
// plus the tiers
import { CONFIG } from "../../../../config";
import {
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp, smoothstep } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { findRewardBars, type RewardBar } from "../../eventRewards";
import { pourDurationMs, pourLine, type Pour } from "../../cashFlow";

const KEY = "sungrazer";
const REWARD = 2;
const MAX_BARS = 4;
// closest pass, and how far round (rad either side) its path runs
const PERI = 90;
const SWEEP = 2.6;
const POUR_MS = 45;
const TAIL: [number, number] = [320, 900];
const MARGIN = 120;
const COMET = 0.65;
const HIT_SHAKE: [number, number] = [0.6, 1.3];

interface Hit {
  bar: RewardBar;
  ms: number;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export const forceSungrazerEvent = registerWispEvent(
  KEY,
  "Sungrazer",
  () => CONFIG.sungrazerEvent.chance,
  (floor, context, area) => {
    const { passMs, holdMs, mergeMs } = CONFIG.sungrazerEvent;
    const bars = findRewardBars(floor, context).slice(0, MAX_BARS);
    if (bars.length === 0) return;
    const sun = getButtonCenter(context.isGroundFloor);
    const angles = bars.map((b) =>
      Math.atan2(b.center.y - sun.y, b.center.x - sun.x),
    );
    // its path centred on the bars' mean direction
    const facing = Math.atan2(
      angles.reduce((s, a) => s + Math.sin(a), 0),
      angles.reduce((s, a) => s + Math.cos(a), 0),
    );
    const spin = Math.random() < 0.5 ? 1 : -1;
    // a parabola round the button, quickest at its closest
    const anomalyAt = (ms: number) =>
      spin *
      lerp([-SWEEP, SWEEP], smoothstep(Math.min(1, Math.max(0, ms / passMs))));
    const spot: Point = { x: 0, y: 0 };
    const cometAt = (ms: number): Point => {
      const v = anomalyAt(ms);
      const r = (2 * PERI) / (1 + Math.cos(v));
      spot.x = sun.x + Math.cos(facing + v) * r;
      spot.y = sun.y + Math.sin(facing + v) * r;
      return spot;
    };
    const far = Math.max(
      ...bars.map((b) => Math.hypot(b.center.x - sun.x, b.center.y - sun.y)),
    );
    const pour: Pour = {
      coinsAlong: 22,
      width: 30,
      streamMs: 60,
      travelMs: 360,
    };
    const pours: { ms: number; line: Point[] }[] = [];
    for (let ms = 0; ms <= passMs; ms += POUR_MS) {
      const p = { ...cometAt(ms) };
      if (
        p.x < area.left - MARGIN ||
        p.x > area.right + MARGIN ||
        p.y < area.top - MARGIN ||
        p.y > area.bottom + MARGIN
      )
        continue;
      const r = Math.hypot(p.x - sun.x, p.y - sun.y) || 1;
      const ux = (p.x - sun.x) / r;
      const uy = (p.y - sun.y) / r;
      const length = Math.min(TAIL[1], Math.max(TAIL[0], far - r + 80));
      const line = Array.from({ length: 10 }, (_, i) => ({
        x: p.x + ux * length * (i / 9),
        y: p.y + uy * length * (i / 9),
      }));
      pours.push({ ms, line });
    }
    // a bar's hit when the tail points straight at it
    const hits: Hit[] = [];
    bars.forEach((bar, i) => {
      const v = wrap(angles[i] - facing) * spin;
      if (Math.abs(v) > SWEEP) return;
      let lo = 0;
      let hi: number = passMs;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        if (anomalyAt(mid) * spin < v) lo = mid;
        else hi = mid;
      }
      hits.push({ bar, ms: lo });
    });
    hits.sort((a, b) => a.ms - b.ms);
    if (hits.length === 0) return;
    const last = hits[hits.length - 1];
    const lastPour = pours.length ? pours[pours.length - 1].ms : 0;

    const pouring = createBeats(
      pours,
      (p) => p.ms,
      (p) => pourLine(cover!, p.line, pour),
    );
    const sweeping = createBeats(
      hits,
      (h) => h.ms,
      (h, k) => {
        cover!.tierUp(h.bar, h.bar.center);
        if (h === last) {
          for (const bar of bars) cover!.slam(bar);
          cover!.blast(h.bar.center);
          return;
        }
        cover!.burst(h.bar.center, 0.6);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, hits.length - 1)));
      },
    );
    const whooshing = createBeats(
      [passMs / 2],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(passMs, pourDurationMs(lastPour, pour)) + holdMs + mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        bars,
        tick: (ms, now) => {
          pouring.tick(ms, now);
          sweeping.tick(ms, now);
          whooshing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > passMs + 400) return;
          drawWispBetween(
            ctx,
            cometAt,
            ms,
            now,
            WISP_SIZE * COMET,
            1,
            0,
            passMs,
          );
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
