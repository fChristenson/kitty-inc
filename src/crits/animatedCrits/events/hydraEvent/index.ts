// the "Hydra" event (gunfire; free hires): it covers its crit, whose click
// freezes the screen while a hydra of wisps rears up over the screen: a fat
// body wisp, a head swaying on a neck of light; the clicked floor's button
// turns gun and shoots the head off in a flash and a bang, and two heads
// sprout from the stump; it shoots those, and four sprout; then it rattles
// off a burst that takes all four at once, the body blowing in a huge blast
// while the severed heads arc down onto the empty spots, a new worker
// forming where each lands. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import {
  playBloop,
  playBoostEventStream,
  playExplosion,
  playSwoosh,
} from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import {
  drawWisp,
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { bezier } from "../../../../shared/curves";
import { clamp01, easeIn, easeOutBack } from "../../../../shared/easing";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  aimBullet,
  drawBullets,
  drawMuzzleFlash,
  type Bullet,
} from "../../../../shared/bullets";
import { DETONATION_MS, drawDetonation } from "../../../../shared/explosion";
import {
  drawRewardHires,
  findRewardHires,
  giveHire,
  type RewardHire,
} from "../../eventRewards";

const KEY = "hydra";
// the body this far down the screen; necks this long, fanned round straight up
const BODY_AT = 0.27;
const BODY = WISP_SIZE * 1.8;
const HEAD = WISP_SIZE * 1.1;
const NECK = 180;
const NECK_W = 12;
const ANGLES = [[0], [-0.55, 0.55], [-1.3, -0.45, 0.45, 1.3]];
const SWAY = 0.12;
const SWAY_MS = 170;
const KINK = 18;
const BULLET_SPEED = 4.5;
const BULLET = WISP_SIZE * 0.5;
const MUZZLE = 90;
const MUZZLE_MS = 120;
// the first head goes this long after the hydra rears; new heads sprout
// this long after the one they replace is shot
const FIRST_SHOT = 220;
const SPROUT_LAG = 80;
const BODY_BLAST = 760;
const LIFT = 220;
const HIT_SHAKE = 0.7;
const SHOT_SHAKE = 0.15;
const BODY_SHAKE = 1.5;
const LAND_SHAKE = 0.6;
const SOUND_GAP_MS = 50;

interface Head {
  angle: number;
  sproutAt: number;
  hitAt: number;
  // its spot at ms while it's on its neck
  at: (ms: number, into: Point) => Point;
  hit: Point;
  // for the last four: the spot it drops onto, and when it lands
  hire: RewardHire | null;
  landsAt: number;
  fall: (ms: number) => Point | null;
}

export const forceHydraEvent = registerWispEvent(
  KEY,
  "Hydra",
  () => CONFIG.hydraEvent.chance,
  (floor, context, area) => {
    const { growMs, gapMs, sproutMs, volleyGapMs, dropMs, holdMs, mergeMs } =
      CONFIG.hydraEvent;
    const hires = findRewardHires(floor, context).slice(0, 4);
    if (hires.length === 0) return;
    const gun = getButtonCenter(context.isGroundFloor);
    const body: Point = {
      x: (area.left + area.right) / 2,
      y: area.top + (area.bottom - area.top) * BODY_AT,
    };

    const heads: Head[] = [];
    const add = (
      angle: number,
      sproutAt: number,
      hitAt: number,
      hire: RewardHire | null,
    ) => {
      const grow = sproutAt === 0 ? growMs : sproutMs;
      const at = (ms: number, into: Point): Point => {
        const reach = NECK * easeOutBack(clamp01((ms - sproutAt) / grow));
        const a =
          -Math.PI / 2 + angle + Math.sin(ms / SWAY_MS + angle * 3) * SWAY;
        into.x = body.x + Math.cos(a) * reach;
        into.y = body.y + Math.sin(a) * reach;
        return into;
      };
      const hit = at(hitAt, { x: 0, y: 0 });
      const landsAt = hitAt + dropMs;
      const spot: Point = { x: 0, y: 0 };
      const to: Point | null = hire ? { x: hire.x, y: hire.y } : null;
      const lift: Point | null = to
        ? { x: (hit.x + to.x) / 2, y: Math.min(hit.y, to.y) - LIFT }
        : null;
      heads.push({
        angle,
        sproutAt,
        hitAt,
        at,
        hit,
        hire,
        landsAt,
        fall: (ms) =>
          !to || ms < hitAt || ms > landsAt
            ? null
            : bezier(hit, lift!, to, easeIn((ms - hitAt) / dropMs), spot),
      });
    };
    // one head, then two, then four, each pair sprouting off a shot head
    const first = growMs + FIRST_SHOT;
    add(ANGLES[0][0], 0, first, null);
    const secondAt = first + SPROUT_LAG + sproutMs + gapMs;
    const pairs = [secondAt, secondAt + gapMs];
    ANGLES[1].forEach((a, k) => add(a, first + SPROUT_LAG, pairs[k], null));
    const volleyAt = pairs[1] + SPROUT_LAG + sproutMs + gapMs;
    ANGLES[2].forEach((a, k) =>
      add(
        a,
        pairs[k < 2 ? 0 : 1] + SPROUT_LAG,
        volleyAt + k * volleyGapMs,
        hires[k] ?? null,
      ),
    );
    const last = heads[heads.length - 1];
    const bodyBlowsAt = last.hitAt + 40;
    const finals = heads.filter((h) => h.hire);
    const endMs = Math.max(
      bodyBlowsAt + DETONATION_MS,
      ...finals.map((h) => h.landsAt),
    );
    const lastLands = Math.max(...finals.map((h) => h.landsAt));
    const bullets: Bullet[] = heads.map((h) => {
      const reach = Math.hypot(h.hit.x - gun.x, h.hit.y - gun.y);
      return aimBullet(
        gun,
        h.hit,
        h.hitAt - reach / BULLET_SPEED,
        BULLET_SPEED,
      );
    });
    let soundAt = -Infinity;
    const sound = (now: number, play: () => void) => {
      if (now - soundAt < SOUND_GAP_MS) return;
      soundAt = now;
      play();
    };

    const rearing = createBeats(
      [0],
      (ms) => ms,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const firing = createBeats(
      bullets,
      (b) => b.firedAt,
      (_, __, now) => {
        if (!cover!.isLive()) return;
        shakeScreen(SHOT_SHAKE);
        sound(now, playBloop);
      },
    );
    const hitting = createBeats(
      heads,
      (h) => h.hitAt,
      (h, _, now) => {
        cover!.burst(h.hit, 0.6);
        if (!cover!.isLive()) return;
        shakeScreen(HIT_SHAKE);
        sound(now, playExplosion);
      },
    );
    const blowing = createBeats(
      [bodyBlowsAt],
      (ms) => ms,
      () => {
        cover!.burst(body, 1.2);
        if (!cover!.isLive()) return;
        shakeScreen(BODY_SHAKE);
        playExplosion();
      },
    );
    const landing = createBeats(
      finals,
      (h) => h.landsAt,
      (h, _, now) => {
        giveHire(h.hire!);
        const at = { x: h.hire!.x, y: h.hire!.y };
        if (h.landsAt === lastLands) {
          cover!.blast(at);
          return;
        }
        cover!.burst(at, 0.8);
        if (!cover!.isLive()) return;
        shakeScreen(LAND_SHAKE);
        sound(now, playBloop);
      },
    );

    const neck: Point = { x: 0, y: 0 };
    const kink: Point = { x: 0, y: 0 };
    const headAt = heads.map((h) => {
      const spot: Point = { x: 0, y: 0 };
      return (ms: number): Point | null =>
        ms < h.sproutAt || ms >= h.hitAt ? null : h.at(ms, spot);
    });
    const bodyAt = () => body;
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: lastLands + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        tick: (ms, now) => {
          rearing.tick(ms, now);
          firing.tick(ms, now);
          hitting.tick(ms, now);
          blowing.tick(ms, now);
          landing.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          drawRewardHires(ctx, hires, now);
          if (ms < 0 || ms > endMs) return;
          if (ms < bodyBlowsAt) {
            for (const h of heads) {
              if (ms < h.sproutAt || ms >= h.hitAt) continue;
              h.at(ms, neck);
              const dx = neck.x - body.x;
              const dy = neck.y - body.y;
              const wave = Math.sin(ms / 130 + h.angle * 5) * KINK;
              const length = Math.hypot(dx, dy) || 1;
              kink.x = body.x + dx / 2 - (dy / length) * wave;
              kink.y = body.y + dy / 2 + (dx / length) * wave;
              drawBeam(ctx, body, kink, NECK_W, 0.7);
              drawBeam(ctx, kink, neck, NECK_W * 0.8, 0.7);
            }
            const rear = easeOutBack(clamp01(ms / growMs));
            drawWisp(ctx, bodyAt, ms, now, BODY * rear, 0.6);
            for (let k = 0; k < heads.length; k++)
              drawWisp(ctx, headAt[k], ms, now, HEAD, 0.8);
          }
          for (const b of bullets) {
            const t = (ms - b.firedAt) / MUZZLE_MS;
            if (t > 0 && t < 1)
              drawMuzzleFlash(ctx, gun, Math.atan2(b.dy, b.dx), t, MUZZLE);
          }
          drawBullets(ctx, bullets, ms, now, BULLET, true);
          for (const h of finals)
            drawWispBetween(
              ctx,
              h.fall,
              ms,
              now,
              HEAD,
              0.9,
              h.hitAt,
              h.landsAt,
            );
          drawDetonation(ctx, body, ms - bodyBlowsAt, BODY_BLAST, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardHires(floor, context).length > 0,
);
