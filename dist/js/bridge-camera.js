/*
 * Bridge camera choreography; monotone interpolation adapted from Simcraft.
 * Copyright (c) 2026 Simran Sachdeva. MIT License.
 * https://github.com/dotslashsimran/simcraft
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or
 * substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
 * WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 * TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const DEFAULT_FOCUS = {};
const cache = new WeakMap();

/* All positions below are already in the world's final 0.35 scale. */
const NEAR_BOUNDS = [{min: [117, 0, -5.4], max: [127, 38.5, 5.4]}];
const CENTRAL_BOUNDS = {min: [-4.2, 0, -6.3], max: [4.2, 45.255, 6.3]};
const FULL_BOUNDS = [
  {min: [-164.5, 7.175, -4.2], max: [164.5, 11.9, 4.2]},
  {min: [-124.6, 0, -5.6], max: [-119, 38.5, 5.6]},
  {min: [-4.2, 0, -6.3], max: [4.2, 45.255, 6.3]},
  {min: [119, 0, -5.6], max: [124.6, 38.5, 5.6]},
];
const NEAR_TARGET = {left: .18, right: .84, top: .13, bottom: .76};
const FULL_TARGET = {left: .09, right: .91, top: .14, bottom: .79};
// Keep precision during the long-to-wide transition without clipping close
// bridge-deck detail. Water identity does not depend on this depth interval.
const CLIP_PADDING = {front: 900, frontFraction: .85, back: 1700, minNear: .1, minNearFraction: .0025};
const FIELDS = ['y', 'W', 'fov', 'H', 'el', 'yaw', 'overview', 'anchor'];
const LOG_FIELDS = new Set(['W', 'fov']);

/** Fritsch-Carlson-limited Hermite interpolation without overshoot. */
function createCurve(keys) {
  const times = keys.map(k => k[0]);
  const values = keys.map(([, shot]) => FIELDS.map(key =>
    LOG_FIELDS.has(key) ? Math.log(shot[key]) : shot[key]));
  const count = keys.length;
  const slopes = FIELDS.map((_, column) => {
    const differences = [], tangents = new Array(count).fill(0);
    for (let i = 0; i < count - 1; i++) {
      differences.push((values[i + 1][column] - values[i][column]) /
        (times[i + 1] - times[i]));
    }
    for (let i = 1; i < count - 1; i++) {
      tangents[i] = differences[i - 1] * differences[i] <= 0 ? 0 :
        (differences[i - 1] + differences[i]) * .5;
    }
    for (let i = 0; i < count - 1; i++) {
      if (differences[i] === 0) {
        tangents[i] = tangents[i + 1] = 0;
        continue;
      }
      const a = tangents[i] / differences[i];
      const b = tangents[i + 1] / differences[i];
      const magnitude = a * a + b * b;
      if (magnitude > 9) {
        const scale = 3 / Math.sqrt(magnitude);
        tangents[i] = scale * a * differences[i];
        tangents[i + 1] = scale * b * differences[i];
      }
    }
    tangents[0] = tangents[count - 1] = 0;
    return tangents;
  });
  return progress => {
    let index = 0;
    while (index < count - 2 && progress >= times[index + 1]) index++;
    const duration = times[index + 1] - times[index];
    const u = clamp((progress - times[index]) / duration, 0, 1);
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    const shot = {};
    FIELDS.forEach((key, column) => {
      const value = h00 * values[index][column] +
        h10 * duration * slopes[column][index] +
        h01 * values[index + 1][column] +
        h11 * duration * slopes[column][index + 1];
      shot[key] = LOG_FIELDS.has(key) ? Math.exp(value) : value;
    });
    return shot;
  };
}

function makeRig(focus) {
  const nearBounds = focus.nearHeroBounds || NEAR_BOUNDS;
  const fullBounds = focus.heroBounds?.length ? focus.heroBounds : FULL_BOUNDS;
  const nearTarget = focus.nearTarget || NEAR_TARGET;
  const fullTarget = focus.target || FULL_TARGET;
  const nearX = focus.nearX ?? 121.8;
  const nearZ = focus.nearZ ?? 0;
  const fullX = focus.x ?? 0;
  const fullZ = focus.zf ?? 0;
  const wideW = focus.W ?? 420;
  const wideY = focus.y ?? 25;

  /* The near pylon, not the span, remains the first dolly-zoom's size anchor. */
  const flat = {y: 17.5, W: 116, fov: 2, H: -.15, el: 8, yaw: 48, overview: 0, anchor: 0};
  const reveal = {...flat, y: 11.5, fov: 28, el: 5};
  const axis = {...flat, y: 10, fov: 90, H: -.55, el: 0, yaw: 88.5, anchor: 1};
  const wideFlat = {y: wideY, W: wideW, fov: 4, H: -.18, el: 10, yaw: 39, overview: 1, anchor: 0};
  const wideDeep = {...wideFlat, fov: 38, el: 12};
  const highNear = {...axis, y: 13, fov: 43, H: -.2, el: 22, yaw: 48, anchor: 0};
  /* The downstream river views respect the wooded upstream bank. The model
   * keeps its actual hill mass; the camera does not pass through that mass. */
  const reverseFlat = {y: 17, W: 260, fov: 4, H: -.18, el: 22, yaw: 15, overview: .64, anchor: 0};
  const reverseDeep = {...reverseFlat, fov: 35, el: 22};
  const curve = createCurve([
    [0, flat],
    [.065, flat],
    [.145, reveal],             // Open depth before turning towards the bridge axis.
    [.22, axis],
    [.285, axis],               // UI deep preset: .25.
    [.375, wideFlat],
    [.405, wideFlat],
    [.455, wideDeep],
    [.495, wideDeep],           // UI overview preset: .47; all three towers and banks.
    [.565, flat],
    [.60, flat],
    [.68, highNear],
    [.72, highNear],
    [.765, reverseFlat],
    [.79, reverseFlat],
    [.835, reverseDeep],
    [.885, axis],
    [.925, axis],
    [.975, flat],
    [1, flat],
  ]);

  /* A single near box expands continuously into each full-scene hero box.
   * Duplicate near boxes have the same projection at mix=0, so changing the
   * number of boxes never changes framing at the ends of a transition. */
  const nearUnion = {
    min: [0, 1, 2].map(axis => Math.min(...nearBounds.map(b => b.min[axis]))),
    max: [0, 1, 2].map(axis => Math.max(...nearBounds.map(b => b.max[axis]))),
  };
  return {curve, nearBounds, fullBounds, nearUnion, nearTarget, fullTarget,
    nearX, nearZ, fullX, fullZ};
}

/**
 * Bridge-specific performance for the site's 24-second timeline.
 * Stable presets: .03 compressed near tower; .25 bridge-axis dolly;
 * .47 three-tower overview. Camera placement still belongs to camera.js.
 */
export function sampleBridgeShot(progress, focus = DEFAULT_FOCUS) {
  if (!focus || typeof focus !== 'object') focus = DEFAULT_FOCUS;
  let rig = cache.get(focus);
  if (!rig) {
    rig = makeRig(focus);
    cache.set(focus, rig);
  }
  const p = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const shot = rig.curve(p);
  const mix = clamp(shot.overview, 0, 1);
  // Move into the main span for the road-axis view. Its subject becomes the
  // middle pylon, so the foreground is the bridge deck rather than a hill cut.
  const anchor = clamp(shot.anchor, 0, 1);
  const heroUnion = anchor === 0 ? rig.nearUnion : {
    min: rig.nearUnion.min.map((v, i) => lerp(v, CENTRAL_BOUNDS.min[i], anchor)),
    max: rig.nearUnion.max.map((v, i) => lerp(v, CENTRAL_BOUNDS.max[i], anchor)),
  };
  shot.x = lerp(lerp(rig.nearX, 0, anchor), rig.fullX, mix);
  shot.zf = lerp(rig.nearZ, rig.fullZ, mix);
  shot.lay = 0;
  shot.cs = 1;
  shot.nominalW = shot.W;
  shot.progress = p;
  shot.sceneKind = 'bridge';
  shot.view = shot.fov < 12 && mix < .15 ? 'flat' : mix > .15 || shot.el > 10 ? 'corner' : 'deep';
  const axial=(1-mix)*clamp((shot.fov-25)/20,0,1)*clamp((8-shot.el)/8,0,1)*clamp((shot.yaw-75)/12,0,1);
  shot.maxYaw=lerp(8+6*mix,1.3,axial);
  shot.clipPadding = CLIP_PADDING;

  if (mix === 0) {
    shot.heroBounds = anchor === 0 ? rig.nearBounds : [heroUnion];
    shot.target = rig.nearTarget;
  } else if (mix === 1) {
    shot.heroBounds = rig.fullBounds;
    shot.target = rig.fullTarget;
  } else {
    shot.heroBounds = rig.fullBounds.map(box => ({
      min: box.min.map((value, axis) => lerp(heroUnion.min[axis], value, mix)),
      max: box.max.map((value, axis) => lerp(heroUnion.max[axis], value, mix)),
    }));
    shot.target = {};
    for (const side of ['left', 'right', 'top', 'bottom']) {
      shot.target[side] = lerp(rig.nearTarget[side], rig.fullTarget[side], mix);
    }
  }
  return shot;
}
