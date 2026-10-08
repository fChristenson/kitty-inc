// the "Redline" event (lightning; cash): it covers its crit, whose click
// freezes the screen while four spark plug wisps line up along the bottom
// of the screen like an engine's cylinders; they fire in order, each a bolt
// jumping its gap with a crack and a spray of cash, revving faster and
// faster until the sparks blur into a roar; at the redline all four fire
// together into one colossal bolt that strikes up into the total, a river
// of cash surging up it, in a huge blast and shake. Pays floor income ×
// floor number × REWARD
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playSlamExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBolt, drawBolt, drawStrike } from "../../../../shared/lightning";
import {
  pourDurationMs,
  pourLine,
  sampleLine,
  totalSpot,
  type Pour,
} from "../../cashFlow";

const KEY = "redline";
const REWARD = 4;
const PLUGS = 4;
const ORDER = [0, 2, 3, 1];
const FIRES = 16;
const SPACING = 110;
const LOW = 80;
const GAP = 110;
const SPARK_MS = 90;
const SPRAY = 12;
const PLUG = 0.45;
const BANG_GAP_MS = 55;
const ROARS_MS = 260;
const FIRE_SHAKE: [number, number] = [0.15, 0.7];
const REDLINE_SHAKE = 2.2;

export const forceRedlineEvent = registerWispEvent(
  KEY,
  "Redline",
  () => CONFIG.redlineEvent.chance,
  (floor, context, area) => {
    const { firesMs, holdMs, mergeMs } = CONFIG.redlineEvent;
    const total = totalSpot(area);
    const midX = (area.left + area.right) / 2;
    const plugs: Point[] = Array.from({ length: PLUGS }, (_, i) => ({
      x: midX + (i - (PLUGS - 1) / 2) * SPACING,
      y: area.bottom - LOW,
    }));
    const tips: Point[] = plugs.map((p) => ({ x: p.x, y: p.y - GAP }));
    const sparks = plugs.map((p, i) => createBolt(p, tips[i], 1));
    let clock = 200;
    const fires = Array.from({ length: FIRES }, (_, k) => {
      const ms = clock;
      clock += lerp(firesMs, k / (FIRES - 1));
      return { ms, plug: ORDER[k % PLUGS] };
    });
    const redlineAt = clock + 60;
    const endAt = redlineAt + ROARS_MS;
    const centre: Point = { x: midX, y: area.bottom - LOW - GAP / 2 };
    const roar = createBolt(centre, total, 3);
    const river = sampleLine(
      (u) => ({
        x:
          lerp([centre.x, total.x], u) +
          Math.sin(u * Math.PI * 3) * 40 * (1 - u),
        y: lerp([centre.y, total.y], u),
      }),
      30,
    );
    const pour: Pour = {
      coinsAlong: 200,
      width: 40,
      streamMs: 360,
      travelMs: 600,
    };
    const plugSpots = plugs.map((p) => () => p);

    let bang = -Infinity;
    const firing = createBeats(
      fires,
      (f) => f.ms,
      (f, k) => {
        const tip = tips[f.plug];
        cover!.launchFrom(
          tip,
          clampTargetsY(
            sprayTargets(tip, SPRAY, [60, 200], -Math.PI / 2, Math.PI * 0.7),
            area.top + 40,
            area.bottom - 40,
          ),
        );
        if (!cover!.isLive()) return;
        if (f.ms - bang >= BANG_GAP_MS) {
          bang = f.ms;
          playBloop();
        }
        shakeScreen(lerp(FIRE_SHAKE, k / (FIRES - 1)));
      },
    );
    const redlining = createBeats(
      [redlineAt],
      (ms) => ms,
      () => {
        pourLine(cover!, river, pour);
        cover!.blast(cover!.total() ?? total);
        if (!cover!.isLive()) return;
        playSlamExplosion();
        shakeScreen(REDLINE_SHAKE);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      {
        durationMs:
          Math.max(endAt + 300, pourDurationMs(redlineAt, pour)) +
          holdMs +
          mergeMs,
        mergeMs,
      },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          firing.tick(ms, now);
          redlining.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const rev = clamp01(ms / redlineAt);
          for (let i = 0; i < PLUGS; i++)
            if (ms < redlineAt)
              drawWisp(
                ctx,
                plugSpots[i],
                ms,
                now,
                WISP_SIZE * PLUG,
                lerp([0.4, 1], rev),
              );
          for (const f of fires) {
            const t = (ms - f.ms) / SPARK_MS;
            if (t < 0 || t >= 1) continue;
            drawBolt(ctx, sparks[f.plug], 1 - t, 0.5);
            drawStrike(ctx, tips[f.plug], 1 - t, 0.5, now);
          }
          if (ms < redlineAt) return;
          const fade = 1 - (ms - redlineAt) / ROARS_MS;
          drawBolt(ctx, roar, fade, 2.2);
          drawStrike(ctx, centre, fade, 2, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
