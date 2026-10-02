// the "Spiderweb" event (money): it covers its crit, whose click freezes the
// screen while rivers of cash shoot out of its middle one after another as
// the spokes of a great web, each splashing against the screen's edge with a
// flash and a jolt; then a river of cash spirals in from the rim round and
// round across the spokes, every crossing a flash, a bloop and a jolt, until
// it reaches the hub in a huge blast and shake, and all the cash pours into
// the total-income readout. Pays floor income × floor number × REWARD (see
// ../cashFlow)
import { CONFIG } from "../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../sound";
import { shakeScreen } from "../../screenShake";
import { registerWispEvent, startWispCover } from "../wispCover";
import { lerp } from "../../shared/easing";
import { createBeats } from "../../shared/eventBeats";
import { pourDurationMs, pourLine, sampleLine, type Pour } from "../cashFlow";
import type { Point } from "../../shared/wisp";

const KEY = "spiderweb";
const REWARD = 4;
// SPOKES spokes out to INSET px short of the screen's edges; the spiral
// winds TURNS times from RIM of the way out to the hub, LIFT of the screen's
// height above its middle
const SPOKES = 7;
const INSET = 16;
const TURNS = 2.2;
const RIM = 0.9;
const LIFT = 0.04;
const SPOKE_BURST = 0.7;
const SPOKE_SHAKE: [number, number] = [0.8, 1.4];
const CROSS_BURST: [number, number] = [0.35, 0.8];
const CROSS_SHAKE: [number, number] = [0.5, 1.6];

export const forceSpiderwebEvent = registerWispEvent(
  KEY,
  "Spiderweb",
  () => CONFIG.spiderwebEvent.chance,
  (floor, context, area) => {
    const {
      spokeGapMs,
      spokeStreamMs,
      spokeTravelMs,
      spiralStreamMs,
      spiralTravelMs,
      holdMs,
      mergeMs,
    } = CONFIG.spiderwebEvent;
    const width = area.right - area.left;
    const height = area.bottom - area.top;
    const hub = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2 - height * LIFT,
    };
    const turn = Math.random() < 0.5 ? 1 : -1;
    const start = Math.random() * Math.PI * 2;
    const angles = Array.from(
      { length: SPOKES },
      (_, k) =>
        start + ((k + (Math.random() - 0.5) * 0.3) / SPOKES) * Math.PI * 2,
    );
    // each spoke runs from the hub till it meets the screen's edge
    const rims: Point[] = angles.map((a) => {
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const tx =
        dx > 0
          ? (area.right - INSET - hub.x) / dx
          : (area.left + INSET - hub.x) / dx;
      const ty =
        dy > 0
          ? (area.bottom - INSET - hub.y) / dy
          : (area.top + INSET - hub.y) / dy;
      const t = Math.min(Math.abs(tx), Math.abs(ty));
      return { x: hub.x + dx * t, y: hub.y + dy * t };
    });
    const spokes = rims.map((rim) =>
      sampleLine(
        (u) => ({
          x: hub.x + (rim.x - hub.x) * u,
          y: hub.y + (rim.y - hub.y) * u,
        }),
        20,
      ),
    );
    const rx = (width / 2) * RIM;
    const ry = Math.min(hub.y - area.top, area.bottom - hub.y) * RIM;
    const spiralAt = (u: number): Point => {
      const a = start + turn * u * TURNS * Math.PI * 2;
      const s = 1 - u * 0.97;
      return {
        x: hub.x + Math.cos(a) * rx * s,
        y: hub.y + Math.sin(a) * ry * s,
      };
    };
    const spiral = sampleLine(spiralAt, 160);
    const spokePour: Pour = {
      coinsAlong: 90,
      width: 16,
      streamMs: spokeStreamMs,
      travelMs: spokeTravelMs,
    };
    const spiralPour: Pour = {
      coinsAlong: 420,
      width: 22,
      streamMs: spiralStreamMs,
      travelMs: spiralTravelMs,
    };
    const spokeAt = angles.map((_, k) => k * spokeGapMs);
    const spiralStart = spokeAt[SPOKES - 1] + spokeTravelMs;
    const hubAt = spiralStart + spiralTravelMs;
    // where the spiral's head crosses each spoke, in the order it gets there
    const crossings: { at: number; spot: Point }[] = [];
    for (const a of angles) {
      const from =
        (((turn * (a - start)) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      for (let lap = from; lap < TURNS * Math.PI * 2; lap += Math.PI * 2) {
        const u = lap / (TURNS * Math.PI * 2);
        crossings.push({
          at: spiralStart + u * spiralTravelMs,
          spot: spiralAt(u),
        });
      }
    }
    crossings.sort((a, b) => a.at - b.at);

    const shooting = createBeats(
      spokes,
      (_, k) => spokeAt[k],
      (line) => pourLine(cover!, line, spokePour),
    );
    const splashes = createBeats(
      rims,
      (_, k) => spokeAt[k] + spokeTravelMs,
      (rim, k) => {
        cover!.burst(rim, SPOKE_BURST);
        if (!cover!.isLive()) return;
        if (k === 0) playSwoosh();
        shakeScreen(lerp(SPOKE_SHAKE, k / (SPOKES - 1)));
      },
    );
    const spinning = createBeats(
      [spiralStart],
      (ms) => ms,
      () => pourLine(cover!, spiral, spiralPour),
    );
    const crossing = createBeats(
      crossings,
      (c) => c.at,
      (c, k) => {
        const t = k / Math.max(1, crossings.length - 1);
        cover!.burst(c.spot, lerp(CROSS_BURST, t));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp(CROSS_SHAKE, t));
      },
    );
    const finale = createBeats(
      [hubAt],
      (ms) => ms,
      () => cover!.blast(hub),
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs: Math.max(
          pourDurationMs(spiralStart, spiralPour),
          hubAt + holdMs + mergeMs,
        ),
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          shooting.tick(ms, now);
          splashes.tick(ms, now);
          spinning.tick(ms, now);
          crossing.tick(ms, now);
          finale.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
