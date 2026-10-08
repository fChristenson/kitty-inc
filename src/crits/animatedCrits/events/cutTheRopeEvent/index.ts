// the "Cut the Rope" event (gunfire; a crit tier): it covers its crit, whose
// click freezes the screen while a heavy wisp hangs over the clicked floor's
// bar on four taut ropes of light strung from the top of the screen; a gun
// wisp at the side shoots them one by one, every shot a muzzle flash and a
// round streaking into a rope, which snaps with a crack and a jolt, the
// weight lurching and swinging on what's left; the last shot drops it onto
// the bar in a huge blast and shake, and the bar jumps a crit tier. Then the
// crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import {
  drawGlitterLight,
  drawWisp,
  drawWispHead,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { clamp01, easeIn, lerp } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { findRewardBars } from "../../eventRewards";

const KEY = "cutTheRope";
// px the weight hangs over the bar, and each rope's anchor as a share of
// the screen's width off the weight, outer ropes cut first
const HANG = 260;
const ANCHORS = [-0.4, 0.4, -0.17, 0.17];
const DROP_PER_CUT = 26;
const FIRST_MS = 260;
const SPEED = 2.4;
const WEIGHT = 1.5;
const GUN = 0.6;
const ORB = 34;
// the weight's swing after a cut: decay and period, ms
const SWING_DECAY = 260;
const SWING_PERIOD = 420;
const SNAP_MS = 260;
const FLASH_MS = 90;
const HIT_SHAKE: [number, number] = [0.6, 1.1];

interface Cut {
  anchor: Point;
  aim: Point;
  bullet: Bullet;
  // where the weight rests once it's cut, and where it was when it was
  rest: Point;
  from: Point;
}

export const forceCutTheRopeEvent = registerWispEvent(
  KEY,
  "Cut the Rope",
  () => CONFIG.cutTheRopeEvent.chance,
  (floor, context, area) => {
    const { shotsMs, dropMs, holdMs, mergeMs } = CONFIG.cutTheRopeEvent;
    const bars = findRewardBars(floor, context);
    const bar = bars.find((b) => b.floor === floor) ?? bars[0];
    if (!bar) return;
    const width = area.right - area.left;
    const hang: Point = {
      x: bar.center.x,
      y: Math.max(area.top + 140, bar.box.y - HANG),
    };
    const anchors = ANCHORS.map((share, k) => ({
      x: Math.min(
        area.right - 30,
        Math.max(area.left + 30, hang.x + share * width),
      ),
      y: area.top + (k < 2 ? 30 : 10),
    }));
    const gun: Point = {
      x:
        hang.x > (area.left + area.right) / 2
          ? area.left + 80
          : area.right - 80,
      y: Math.min(area.bottom - 80, hang.y + 180),
    };
    const landing: Point = { x: hang.x, y: bar.box.y };

    // the weight springs toward a new rest after every cut, swinging past it
    const cuts: Cut[] = [];
    const swing = (c: Cut, t: number, into: Point) => {
      const k =
        Math.exp(-t / SWING_DECAY) * Math.cos((2 * Math.PI * t) / SWING_PERIOD);
      into.x = c.rest.x + (c.from.x - c.rest.x) * k;
      into.y = c.rest.y + (c.from.y - c.rest.y) * k;
      return into;
    };
    const weightBefore = (ms: number, into: Point): Point => {
      for (let k = cuts.length - 1; k >= 0; k--)
        if (ms >= cuts[k].bullet.hitAt)
          return swing(cuts[k], ms - cuts[k].bullet.hitAt, into);
      into.x = hang.x + Math.sin(ms * 0.004) * 4;
      into.y = hang.y;
      return into;
    };
    let fires: number = FIRST_MS;
    anchors.forEach((anchor, k) => {
      if (k > 0)
        fires += lerp(shotsMs, (k - 1) / Math.max(1, anchors.length - 2));
      // aimed at the rope's middle where it'll be when the round gets there
      const aim: Point = { x: 0, y: 0 };
      let hitAt = fires;
      for (let pass = 0; pass < 3; pass++) {
        const w = weightBefore(hitAt, { x: 0, y: 0 });
        aim.x = (anchor.x + w.x) / 2;
        aim.y = (anchor.y + w.y) / 2;
        hitAt = fires + Math.hypot(aim.x - gun.x, aim.y - gun.y) / SPEED;
      }
      const bullet = aimBullet(gun, aim, fires, SPEED);
      const from = weightBefore(bullet.hitAt, { x: 0, y: 0 });
      const left = anchors.slice(k + 1);
      const rest: Point = left.length
        ? {
            x:
              hang.x * 0.5 +
              (left.reduce((s, a) => s + a.x, 0) / left.length) * 0.5,
            y: hang.y + DROP_PER_CUT * (k + 1),
          }
        : from;
      cuts.push({ anchor, aim, bullet, rest, from });
    });
    const last = cuts[cuts.length - 1];
    const dropsAt = last.bullet.hitAt;
    const landsAt = dropsAt + dropMs;
    const endAt = landsAt + 400;
    const bullets = cuts.map((c) => c.bullet);

    const weight: Point = { x: 0, y: 0 };
    const weightAt = (ms: number): Point | null => {
      if (ms < 0 || ms > landsAt) return null;
      if (ms < dropsAt) return weightBefore(ms, weight);
      const u = easeIn(clamp01((ms - dropsAt) / dropMs));
      weight.x = lerp([last.from.x, landing.x], u);
      weight.y = lerp([last.from.y, landing.y], u);
      return weight;
    };
    const gunAt = () => gun;
    const half: Point = { x: 0, y: 0 };

    const firing = createBeats(
      cuts,
      (c) => c.bullet.firedAt,
      () => {
        if (cover!.isLive()) playBloop();
      },
    );
    const snapping = createBeats(
      cuts,
      (c) => c.bullet.hitAt,
      (c, k) => {
        cover!.burst(c.aim, 0.4);
        if (!cover!.isLive()) return;
        playExplosion();
        shakeScreen(lerp(HIT_SHAKE, k / Math.max(1, cuts.length - 1)));
      },
    );
    const dropping = createBeats(
      [landsAt],
      (ms) => ms,
      () => {
        cover!.tierUp(bar, landing);
        cover!.slam(bar);
        cover!.blast(landing);
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: endAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        bars: [bar],
        tick: (ms, now) => {
          firing.tick(ms, now);
          snapping.tick(ms, now);
          dropping.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > endAt) return;
          const w = weightAt(ms);
          for (const c of cuts) {
            const t = ms - c.bullet.hitAt;
            if (t < 0) {
              if (!w) continue;
              drawBeam(ctx, c.anchor, w, 6, 0.75);
              drawBeam(ctx, c.anchor, w, 2, 1);
              continue;
            }
            if (t >= SNAP_MS) continue;
            // the two snapped ends whipping back to where they're tied
            const v = 1 - t / SNAP_MS;
            half.x = lerp([c.anchor.x, c.aim.x], v);
            half.y = lerp([c.anchor.y, c.aim.y], v);
            drawBeam(ctx, c.anchor, half, 4, v);
            if (!w) continue;
            half.x = lerp([w.x, c.aim.x], v);
            half.y = lerp([w.y, c.aim.y], v);
            drawBeam(ctx, w, half, 4, v);
          }
          drawBullets(ctx, bullets, ms, now, WISP_SIZE * 0.35, true);
          for (const c of cuts)
            drawMuzzleFlash(
              ctx,
              gun,
              Math.atan2(c.aim.y - gun.y, c.aim.x - gun.x),
              (ms - c.bullet.firedAt) / FLASH_MS,
              WISP_SIZE * 0.9,
            );
          if (ms <= dropsAt + 200)
            drawWispHead(ctx, gunAt, ms, now, WISP_SIZE * GUN, 0.7);
          const at = weightAt(ms);
          if (at)
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2 + ms * 0.004;
              drawGlitterLight(
                ctx,
                at.x + Math.cos(a) * ORB,
                at.y + Math.sin(a) * ORB,
                9,
                k,
                0.9,
                now,
              );
            }
          drawWisp(ctx, weightAt, ms, now, WISP_SIZE * WEIGHT, 0.5);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardBars(floor, context).length > 0,
);
