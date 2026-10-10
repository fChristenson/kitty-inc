// the "Starfighter" event (flight + explosion; levels), a flight-stage event (see
// ../../flightStage): it covers its crit, whose click dives the view into
// space at lightspeed. Wisps rush in out of the distance, weaving; a reticle
// closes on each and the view's twin guns fire laser bolts that blow it apart,
// quicker and quicker, until a big one looms in, takes three volleys and goes
// up in a huge blast. The view crash-lands back on the floors, the floor gets
// free levels for every wisp shot down and the crit's tier pays out
import { levelsFor, type Floor } from "../../../../gameState";
import { CONFIG } from "../../../../config";
import { COLOR } from "../../../../palette";
import { drawBeam, drawBeamFlare } from "../../../../shared/beam";
import { drawMuzzleFlash } from "../../../../shared/bullets";
import { drawDetonation } from "../../../../shared/explosion";
import {
  playCritExplosion,
  playExplosion,
} from "../../../../shared/explosionBang";
import { shakeScreen } from "../../../../shared/screenShake";
import { hash01, stampGlimmer } from "../../../../shared/twinkle";
import { clamp01, lerp } from "../../../../shared/easing";
import {
  drawWispBetween,
  WISP_SIZE,
  type Point,
} from "../../../../shared/wisp";
import { pickCritTierByOdds } from "../../../critTypes";
import { forceTestCrit } from "../../../floorCrits/upgradeCrit";
import {
  canStartFlightStage,
  isFlightStageRunning,
  project,
  startFlightStage,
  type FlightView,
} from "../../flightStage";
import {
  endEventProc,
  forceClaimEventProc,
  registerEventProc,
  type EventProcContext,
} from "../../eventProcs";
import { beginLightBatch, endLightBatch } from "../../../../shared/lightBatch";

const KEY = "starfighter";

// the small wisps: how many, how far apart they appear and how off-beat, the
// lanes they fly in and weave about (of the screen's width from its middle)
const SMALL = 5;
const SMALL_EVERY_MS = 230;
const SMALL_JITTER_MS = 60;
const LANE_X = 0.32;
const LANE_Y = 0.26;
const WEAVE = 0.06;
const WEAVE_RATE = 0.006;
// how far off they appear and how near they get before they're shot (1 is
// right in front of the view), and their size there
const FAR = 14;
const SHOT_AT = 2.2;
const WISP_SCALE = 3.5;
// the big one: when it appears, its slower rush in, its size, and the
// volleys it takes before it blows
const BIG_AT_MS = 1100;
const BIG_APPROACH_MS = 900;
const BIG_SHOT_AT = 2.6;
const BIG_SCALE = 1.5;
const BIG_VOLLEYS_MS = [-260, -130, 0];
const BIG_WORTH = 3;
// the guns at the screen's bottom corners (of its width and height), their
// bolts and flashes: a wide glow round a white-hot core
const GUN_X = 0.12;
const GUN_Y = 0.94;
const BOLT_W = 60;
const BOLT_CORE = 22;
const BOLT_TAIL = 0.6;
// the beam left burning from gun to wisp after a hit, fading
const LINGER_MS = 160;
const FLASH_MS = 140;
const FLASH_SIZE = 180;
// the reticle: its glimmers, how far out it starts and where it closes to
// (of the wisp's size)
const RETICLE = 12;
const RETICLE_FROM = 3;
const RETICLE_TO = 1.3;
const RETICLE_SIZE = 16;
// the blasts, of the screen's width at the wisp's depth 1, and their shakes
const BLAST = 0.5;
const BIG_BLAST = 0.9;
const HIT_FLARE = 0.06;
const SHAKE = 0.5;
const BIG_SHAKE = 1.6;

interface Wisp {
  x: number;
  y: number;
  phase: number;
  spawnAt: number;
  approachMs: number;
  shotAt: number;
  // the depth it's shot at, and when each volley hits it (the last blows it up)
  depth: number;
  hits: number[];
  big: boolean;
}

registerEventProc(
  {
    key: KEY,
    chance: () => CONFIG.starfighterEvent.chance,
    isInProgress: () => isFlightStageRunning(KEY),
    canArm: (floor, context) =>
      floor.unlocked &&
      canStartFlightStage(context) &&
      context.upgradeFloorFree !== undefined,
    arm: startStarfighter,
  },
  { label: "Starfighter", color: COLOR.revealBlue },
);

// dev test hook: arms a crit on floor (tier by the crit odds) carrying Starfighter
export function forceStarfighterEvent(floor: Floor): void {
  forceTestCrit(floor, null, pickCritTierByOdds(), "upgrade");
  forceClaimEventProc(KEY, floor);
}

function planWisps(approachMs: number): Wisp[] {
  const wisps: Wisp[] = [];
  for (let i = 0; i < SMALL; i++) {
    const spawnAt = i * SMALL_EVERY_MS + hash01(i, 5201) * SMALL_JITTER_MS;
    wisps.push({
      x: (hash01(i, 5202) * 2 - 1) * LANE_X,
      y: (hash01(i, 5203) * 2 - 1) * LANE_Y,
      phase: hash01(i, 5204) * Math.PI * 2,
      spawnAt,
      approachMs,
      shotAt: spawnAt + approachMs,
      depth: SHOT_AT,
      hits: [spawnAt + approachMs],
      big: false,
    });
  }
  const bigShot = BIG_AT_MS + BIG_APPROACH_MS;
  wisps.push({
    x: 0,
    y: -0.05,
    phase: 0,
    spawnAt: BIG_AT_MS,
    approachMs: BIG_APPROACH_MS,
    shotAt: bigShot,
    depth: BIG_SHOT_AT,
    hits: BIG_VOLLEYS_MS.map((ms) => bigShot + ms),
    big: true,
  });
  return wisps;
}

// its depth at ms: rushing in from FAR, holding where it's shot
function depthOf(wisp: Wisp, ms: number): number {
  const u = clamp01((ms - wisp.spawnAt) / wisp.approachMs);
  return lerp([FAR, wisp.depth], u);
}

function wispAt(view: FlightView, wisp: Wisp, ms: number): Point {
  const weave = WEAVE * (wisp.big ? 0.5 : 1);
  return project(
    view,
    wisp.x + Math.sin(ms * WEAVE_RATE + wisp.phase) * weave,
    wisp.y + Math.cos(ms * WEAVE_RATE * 1.3 + wisp.phase) * weave,
    depthOf(wisp, ms),
  );
}

const sizeOf = (wisp: Wisp, ms: number) =>
  (WISP_SIZE * WISP_SCALE * (wisp.big ? BIG_SCALE : 1)) / depthOf(wisp, ms);

function startStarfighter(floor: Floor, context: EventProcContext): void {
  const { flyMs, approachMs, lockMs, boltMs, levelShare } =
    CONFIG.starfighterEvent;
  const tier = context.critTier ?? pickCritTierByOdds();
  const wisps = planWisps(approachMs);
  // every volley in the order it lands, for the bangs and shakes
  const volleys = wisps
    .flatMap((wisp) => wisp.hits.map((at) => ({ wisp, at })))
    .sort((a, b) => a.at - b.at);
  let landed = 0;
  let downed = 0;
  startFlightStage(KEY, floor, context, {
    flyMs,
    draw: (ctx, view, ms, now) => {
      while (landed < volleys.length && ms >= volleys[landed].at) {
        const { wisp, at } = volleys[landed++];
        if (at !== wisp.shotAt) continue;
        downed += wisp.big ? BIG_WORTH : 1;
        if (wisp.big) playCritExplosion();
        else playExplosion();
        shakeScreen(wisp.big ? BIG_SHAKE : SHAKE);
      }
      const guns = [
        { x: view.x + view.w * GUN_X, y: view.y + view.h * GUN_Y },
        { x: view.x + view.w * (1 - GUN_X), y: view.y + view.h * GUN_Y },
      ];
      for (const wisp of wisps) {
        drawWispBetween(
          ctx,
          (t) => wispAt(view, wisp, t),
          ms,
          now,
          sizeOf(wisp, ms),
          wisp.big ? 0.8 : 0.4,
          wisp.spawnAt,
          wisp.shotAt,
        );
        // the reticle closing on it, then holding till it blows
        const lockAt = wisp.hits[0] - boltMs - lockMs;
        if (ms >= lockAt && ms < wisp.shotAt) {
          const at = wispAt(view, wisp, ms);
          const size = sizeOf(wisp, ms);
          const r =
            size *
            lerp([RETICLE_FROM, RETICLE_TO], clamp01((ms - lockAt) / lockMs));
          const previous = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = "lighter";
          beginLightBatch(ctx);
          for (let i = 0; i < RETICLE; i++) {
            const a = (i / RETICLE) * Math.PI * 2 + ms * 0.004;
            stampGlimmer(
              ctx,
              at.x + Math.cos(a) * r,
              at.y + Math.sin(a) * r,
              RETICLE_SIZE,
              a,
              i % 3 ? COLOR.heavenlyGold : COLOR.white,
            );
          }
          endLightBatch(ctx);
          ctx.globalCompositeOperation = previous;
        }
        for (const hit of wisp.hits) {
          const fireAt = hit - boltMs;
          const u = (ms - fireAt) / boltMs;
          const to = wispAt(view, wisp, hit);
          if (u >= 0 && u < 1) {
            for (const gun of guns) {
              const along = (v: number): Point => ({
                x: lerp([gun.x, to.x], v),
                y: lerp([gun.y, to.y], v),
              });
              drawBeam(
                ctx,
                along(Math.max(0, u - BOLT_TAIL)),
                along(u),
                BOLT_W,
                0.7,
              );
              drawBeam(
                ctx,
                along(Math.max(0, u - BOLT_TAIL)),
                along(u),
                BOLT_CORE,
              );
            }
          }
          const linger = 1 - (ms - hit) / LINGER_MS;
          if (ms >= hit && linger > 0)
            for (const gun of guns) {
              drawBeam(ctx, gun, to, BOLT_W * linger, 0.7 * linger);
              drawBeam(ctx, gun, to, BOLT_CORE * linger, linger);
            }
          const sinceFire = ms - fireAt;
          if (sinceFire >= 0 && sinceFire < FLASH_MS) {
            for (const gun of guns)
              drawMuzzleFlash(
                ctx,
                gun,
                Math.atan2(to.y - gun.y, to.x - gun.x),
                sinceFire / FLASH_MS,
                FLASH_SIZE,
              );
          }
          // the big one's earlier volleys only spark off it
          if (hit !== wisp.shotAt && ms >= hit && ms < wisp.shotAt)
            drawBeamFlare(
              ctx,
              wispAt(view, wisp, ms),
              view.w * HIT_FLARE,
              1 - clamp01((ms - hit) / 150),
              now,
            );
        }
        if (ms >= wisp.shotAt)
          drawDetonation(
            ctx,
            wispAt(view, wisp, wisp.shotAt),
            ms - wisp.shotAt,
            (view.w * (wisp.big ? BIG_BLAST : BLAST)) / wisp.depth,
            now,
          );
      }
    },
    onEnd: () => {
      context.upgradeFloorFree?.(floor, levelsFor(floor, levelShare * downed));
      context.applyTierCrit?.(floor, tier);
      endEventProc(KEY);
    },
  });
}
