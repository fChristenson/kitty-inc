// the "Pétanque" event (bounce; a free floor): it covers its crit, whose
// click freezes the screen while a little jack wisp is tossed up out of
// the clicked floor's button and bounces to a stop on a strip of light
// under the lock; three boules are lobbed up after it one after another,
// each thudding down short and bouncing on, lower and quicker, to settle
// round the jack, every landing a splash and a jolt; the last boule is
// lobbed sky-high and lands dead on the closest one with a crack, taking
// its place, and knocks it flying into the lock, which blows open in a
// huge blast: the floor unlocked for free. Then the crit's tier pays out
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream, playSwoosh } from "../../../../sound";
import { playExplosion } from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../critFlash";
import { getButtonCenter } from "../../../../floors/upgradeButton";
import { drawWisp, WISP_SIZE, type Point } from "../../../../shared/wisp";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { createBeats } from "../../../../shared/eventBeats";
import { drawBeam } from "../../../../shared/beam";
import {
  drawBounceSplash,
  hops,
  type Bounce,
  type BouncePath,
} from "../../../../shared/bounce";
import { findRewardLocked } from "../../eventRewards";
import { FLOOR_H, FLOOR_W } from "../../../../floors/constants";

const KEY = "petanque";
const JACK = WISP_SIZE * 0.5;
const BOULE = WISP_SIZE * 1.1;
// where the boules roll, below the lock's middle, and the strip under them
const GROUND = 110;
const PISTE = 520;
const PISTE_W = 6;
const PISTE_ALPHA = 0.3;
const PISTE_DROP = 24;
// the jack lands this far past the lock; the boules settle these far from
// the jack (the last the closest), landing ROLL short of where they stop
const JACK_PAST = 60;
const RESTS = [150, -120, 70];
const ROLL = 260;
// lob heights over each throw's line, and the knocked boule's hop
const LOB = 460;
const LOB_GAIN = 0.15;
const SKY_LOB = 1.7;
const ROLL_LIFT = 26;
const KNOCK_LIFT = 200;
const LAND_SHAKE = 0.7;
const ROLL_SHAKE = 0.25;
const CRACK_SHAKE = 1.6;
const SOUND_GAP_MS = 60;

interface Hit {
  bounce: Bounce;
  size: number;
  shake: number;
  crack: boolean;
}

export const forcePetanqueEvent = registerWispEvent(
  KEY,
  "Pétanque",
  () => CONFIG.petanqueEvent.chance,
  (floor, context) => {
    const { lobMs, gapMs, rollMs, knockMs, holdMs, mergeMs } =
      CONFIG.petanqueEvent;
    const locked = findRewardLocked(floor, context);
    if (!locked) return;
    const lock: Point = { x: FLOOR_W / 2, y: locked.offsetY + FLOOR_H / 2 };
    const groundY = lock.y + GROUND;
    const from = getButtonCenter(context.isGroundFloor);
    // they roll on away from the thrower
    const dir = from.x > lock.x ? -1 : 1;
    const jackSpot: Point = { x: lock.x + dir * JACK_PAST, y: groundY };
    const jack = hops(
      [from, { x: jackSpot.x - dir * ROLL * 0.6, y: groundY }, jackSpot],
      [lobMs * 0.85, rollMs * 0.4],
      [LOB, ROLL_LIFT],
    );
    const rests = RESTS.map((x) => ({ x: jackSpot.x + x, y: groundY }));
    const boules: BouncePath[] = rests.map((rest, i) =>
      hops(
        [
          from,
          { x: rest.x - dir * ROLL, y: groundY },
          { x: rest.x - dir * ROLL * 0.35, y: groundY },
          rest,
        ],
        [lobMs, rollMs * 0.3],
        [LOB * (1 + LOB_GAIN * i), ROLL_LIFT * 0.6],
        jack.endMs + i * gapMs,
      ),
    );
    const target = boules[boules.length - 1];
    const closest = rests[rests.length - 1];
    const skyMs = lobMs * 1.15;
    const carreau = hops(
      [from, closest],
      [skyMs, skyMs],
      [LOB * SKY_LOB, LOB * SKY_LOB],
      target.endMs + 100 - skyMs,
    );
    const crackAt = carreau.endMs;
    const knock = hops(
      [closest, lock],
      [knockMs, knockMs],
      [KNOCK_LIFT, KNOCK_LIFT],
      crackAt,
    );
    const openAt = knock.endMs;

    const hits: Hit[] = [
      ...jack.bounces.map((bounce, k) => ({
        bounce,
        size: 70,
        shake: k === 0 ? LAND_SHAKE * 0.6 : ROLL_SHAKE,
        crack: false,
      })),
      ...boules.flatMap((path) =>
        path.bounces.map((bounce, k) => ({
          bounce,
          size: k === 0 ? 150 : 90,
          shake: k === 0 ? LAND_SHAKE : ROLL_SHAKE,
          crack: false,
        })),
      ),
      {
        bounce: carreau.bounces[0],
        size: 220,
        shake: CRACK_SHAKE,
        crack: true,
      },
    ];
    // shown only from its throw; the closest boule flies off when it's hit
    const shown = (path: BouncePath) => (ms: number) =>
      ms < path.startMs ? null : path.at(ms);
    const jackAt = shown(jack);
    const bouleAts = boules.map(shown);
    const carreauAt = shown(carreau);
    const restingAt = bouleAts[bouleAts.length - 1];
    bouleAts[bouleAts.length - 1] = (ms) =>
      ms < crackAt ? restingAt(ms) : ms < openAt ? knock.at(ms) : null;
    let soundAt = -Infinity;

    const throwing = createBeats(
      [jack, ...boules, carreau],
      (path) => path.startMs,
      () => {
        if (cover!.isLive()) playSwoosh();
      },
    );
    const landing = createBeats(
      hits,
      (h) => h.bounce.ms,
      (h, _, now) => {
        cover!.burst(h.bounce.at, h.crack ? 0.8 : 0.3);
        if (!cover!.isLive()) return;
        shakeScreen(h.shake);
        if (h.crack) playExplosion();
        else if (now - soundAt >= SOUND_GAP_MS) {
          soundAt = now;
          playBloop();
        }
      },
    );
    const opening = createBeats(
      [openAt],
      (ms) => ms,
      () => cover!.blast(lock),
    );

    const pisteFrom: Point = { x: lock.x - PISTE, y: groundY + PISTE_DROP };
    const pisteTo: Point = { x: lock.x + PISTE, y: groundY + PISTE_DROP };
    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: openAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: 0,
        onEnd: () => context.unlockFloorFree?.(locked.floor),
        tick: (ms, now) => {
          throwing.tick(ms, now);
          landing.tick(ms, now);
          opening.tick(ms, now);
        },
        drawOver: (ctx, ms, now) => {
          if (ms < 0 || ms > openAt + 400) return;
          drawBeam(
            ctx,
            pisteFrom,
            pisteTo,
            PISTE_W,
            PISTE_ALPHA * Math.min(1, ms / 200),
          );
          for (const h of hits)
            drawBounceSplash(ctx, h.bounce, ms - h.bounce.ms, h.size, now);
          if (ms > openAt) return;
          drawWisp(ctx, jackAt, ms, now, JACK, 0.3);
          for (const at of bouleAts) drawWisp(ctx, at, ms, now, BOULE, 0.6);
          drawWisp(ctx, carreauAt, ms, now, BOULE, 0.9);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
  (floor, context) => findRewardLocked(floor, context) !== null,
);
