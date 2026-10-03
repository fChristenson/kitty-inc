// the "Bolt Wheel" event (lightning; free hires): it covers its crit,
// whose click freezes the screen while a wisp flies out of the clicked
// floor's button to the middle of the screen and four spokes of lightning
// crack out of it into a great wheel that starts to turn, ever faster,
// sweeping round the whole screen; every empty spot on a floor in view
// that a spoke sweeps over takes a crack of lightning and a new worker
// forms in the flash with a jolt; then the wheel blows apart in a huge
// blast and shake. Then the crit's tier pays out
import { CONFIG } from "../../config";
import { playBoostEventStream, playExplosion } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { getButtonCenter } from "../upgradeButton";
import { drawWispBetween, WISP_SIZE, type Point } from "../../shared/wisp";
import { registerWispEvent, startWispCover } from "../wispCover";
import { clamp01, easeOut, lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { createBolt, drawBolt, drawStrike } from "../../shared/lightning";
import { drawRewardHires, findRewardHires, giveHire } from "../eventRewards";

const KEY = "boltWheel";
const MAX_HIRES = 6;
const FORM_MS = 300;
const SPOKES = 4;
// the wheel turns LAPS laps, ever faster; spokes reach REACH px past the
// furthest spot
const LAPS = 2.2;
const REACH = 40;
const SAMPLE_MS = 4;
const HUB = 0.7;
const STRIKE_MS = 200;
const STRIKE_SHAKE: [number, number] = [0.6, 1.3];

export const forceBoltWheelEvent = registerWispEvent(
  KEY,
  "Bolt Wheel",
  () => CONFIG.boltWheelEvent.chance,
  (floor, context, area) => {
    const { flyMs, spinMs, holdMs, mergeMs } = CONFIG.boltWheelEvent;
    const hires = findRewardHires(floor, context).slice(0, MAX_HIRES);
    if (hires.length === 0) return;
    const button = getButtonCenter(context.isGroundFloor);
    const hub: Point = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const spots = hires.map((h) => ({ x: h.x, y: h.y - 30 }));
    const reach =
      Math.max(...spots.map((s) => Math.hypot(s.x - hub.x, s.y - hub.y))) +
      REACH;
    const endAt = flyMs + spinMs;
    const turn = (ms: number) =>
      Math.PI * 2 * LAPS * clamp01((ms - flyMs) / spinMs) ** 1.6;
    // when a spoke first sweeps over each spot
    const angles = spots.map((s) => Math.atan2(s.y - hub.y, s.x - hub.x));
    const step = (Math.PI * 2) / SPOKES;
    const phase = (a: number) => ((a % step) + step) % step;
    const strikes: { hire: (typeof hires)[number]; spot: Point; at: number }[] =
      [];
    let last = turn(flyMs);
    for (let ms = flyMs + SAMPLE_MS; ms <= endAt; ms += SAMPLE_MS) {
      const now = turn(ms);
      hires.forEach((hire, i) => {
        if (strikes.some((s) => s.hire === hire)) return;
        const before = phase(angles[i] - last);
        const after = phase(angles[i] - now);
        // the spoke's offset to the spot wrapped past zero: it swept over
        if (now > last && after > before)
          strikes.push({ hire, spot: spots[i], at: ms });
      });
      last = now;
    }
    strikes.sort((a, b) => a.at - b.at);
    const tips = Array.from({ length: SPOKES }, () => ({ x: 0, y: 0 }));
    const spokes = tips.map((tip) => createBolt(hub, tip, 2));
    const hubAt: Point = { x: 0, y: 0 };
    const hubWisp = (ms: number): Point | null => {
      if (ms > endAt) return null;
      const u = easeOut(Math.min(1, ms / flyMs));
      hubAt.x = lerp([button.x, hub.x], u);
      hubAt.y = lerp([button.y, hub.y], u);
      return hubAt;
    };

    const striking = createBeats(
      strikes,
      (s) => s.at,
      (s, k) => {
        giveHire(s.hire);
        cover!.burst(s.spot, 0.5);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(STRIKE_SHAKE, k / Math.max(1, strikes.length - 1)));
      },
    );
    const finale = createBeats(
      [endAt],
      (ms) => ms,
      () => cover!.blast(hub),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          striking.tick(ms, now);
          finale.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now, FORM_MS);
          if (ms > endAt + 1_200) return;
          if (ms >= flyMs && ms <= endAt) {
            const a = turn(ms);
            const grow = easeOut(clamp01((ms - flyMs) / 200));
            for (let i = 0; i < SPOKES; i++) {
              tips[i].x = hub.x + Math.cos(a + i * step) * reach * grow;
              tips[i].y = hub.y + Math.sin(a + i * step) * reach * grow;
              drawBolt(ctx, spokes[i], 0.85, 0.6);
            }
          }
          for (const s of strikes) {
            const t = (ms - s.at) / STRIKE_MS;
            if (t >= 0 && t < 1) drawStrike(ctx, s.spot, 1 - t, 1, now);
          }
          drawWispBetween(
            ctx,
            hubWisp,
            ms,
            now,
            WISP_SIZE * HUB,
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
  (floor, context) => findRewardHires(floor, context).length > 0,
);
