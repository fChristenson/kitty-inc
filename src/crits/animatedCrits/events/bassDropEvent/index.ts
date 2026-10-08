// the "Bass Drop" event (an experiment beyond the money/wisp templates: the
// whole thing is a beat): it covers its crit, whose click freezes the screen
// while it pulses to a heavy beat, a white shockwave throbbing out of its
// middle with a thump and a jolt on every beat; the beats build into a
// racing snare roll, ever bigger, then cut to a beat of dead silence before
// the drop hits in a huge blast and shake that sprays hundreds of coins over
// the whole screen, and the coins sweep into the total. Pays floor income ×
// floor number × REWARD (see ../cashFlow)
import { CONFIG } from "../../../../config";
import { playBloop, playBoostEventStream } from "../../../../sound";
import { shakeScreen } from "../../../critFlash";
import { registerWispEvent, startWispCover } from "../../wispCover";
import { lerp } from "../../../../shared/easing";
import { clampTargetsY, sprayTargets } from "../../../../shared/coinTargets";
import { createBeats } from "../../../../shared/eventBeats";

const KEY = "bassDrop";
const REWARD = 4;
// BEATS heavy beats, then ROLL beats of the snare roll speeding up from a
// beat apart to ROLL_FASTEST of one, growing from BEAT to ROLL_PEAK
const BEATS = 4;
const ROLL = 10;
const ROLL_FASTEST = 0.18;
const BEAT = { burst: 0.7, shake: 1.2 };
const ROLL_PEAK = { burst: 1.3, shake: 2.2 };
// the drop: coins sprayed DROP_REACH of the screen's width (or height) out
const DROP_COINS = 420;
const DROP_REACH: [number, number] = [0.08, 0.6];

export const forceBassDropEvent = registerWispEvent(
  KEY,
  "Bass Drop",
  () => CONFIG.bassDropEvent.chance,
  (floor, context, area) => {
    const { beatMs, silenceMs, holdMs, mergeMs } = CONFIG.bassDropEvent;
    const span = Math.min(area.right - area.left, area.bottom - area.top);
    const mid = {
      x: (area.left + area.right) / 2,
      y: (area.top + area.bottom) / 2,
    };
    const pulses: { at: number; size: number }[] = [];
    for (let k = 0; k < BEATS; k++) pulses.push({ at: k * beatMs, size: 0 });
    let at = BEATS * beatMs;
    for (let k = 0; k < ROLL; k++) {
      const t = k / (ROLL - 1);
      pulses.push({ at, size: t });
      at += beatMs * lerp([0.5, ROLL_FASTEST], t);
    }
    const dropAt = at + silenceMs;

    const beats = createBeats(
      pulses,
      (p) => p.at,
      (p) => {
        cover!.burst(mid, lerp([BEAT.burst, ROLL_PEAK.burst], p.size));
        if (!cover!.isLive()) return;
        playBloop();
        shakeScreen(lerp([BEAT.shake, ROLL_PEAK.shake], p.size));
      },
    );
    const drop = createBeats(
      [dropAt],
      (ms) => ms,
      () => {
        cover!.blast(mid);
        cover!.launchFrom(
          mid,
          clampTargetsY(
            sprayTargets(mid, DROP_COINS, [
              span * DROP_REACH[0],
              span * DROP_REACH[1],
            ]),
            area.top + 40,
            area.bottom - 20,
          ),
        );
      },
    );

    const cover = startWispCover(
      KEY,
      floor,
      context,
      { durationMs: dropAt + holdMs + mergeMs, mergeMs },
      {
        rewardMultiplier: REWARD,
        tick: (ms, now) => {
          beats.tick(ms, now);
          drop.tick(ms, now);
        },
      },
    );
    if (!cover) return;
    playBoostEventStream();
  },
);
