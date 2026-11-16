/*
 * One 10 second, single-take camera performance for the 9:16 river preset.
 *
 * The framing follows the reference structure, not its pictures, and cuts on
 * 120 BPM beats with segments of 8 / 7 / 5 beats (4.0 s + 3.5 s + 2.5 s):
 *   0.000-0.400  city scale: high over the water, the north-bank skyline left
 *                and the pylon plus its cable fan right of centre
 *   0.370-0.430  a wet parapet rises from the bottom edge and covers the lens
 *   0.430-0.720  eye level on the 滨江公园 slope: the pylon holds ~63 % of the
 *                frame height, red anchors at both edges, the Yangtze carrying
 *                a long mirror under it. The view axis sits 9.56 deg off the
 *                bridge axis (it was 4.47 deg), which is what opens the inverted
 *                Y limbs from 4.6 % to 7.3-8.5 % of the frame width. It stops
 *                there: the camera is already 20 m up the stone slope, and every
 *                extra degree has to come from moving further inland, which puts
 *                the wet revetment, the railing and the left red lamp out of
 *                frame and trades the composition away for the silhouette.
 *   0.720-0.780  a soaked canopy rises from the bottom edge and covers the lens
 *   0.780-1.000  back to the city framing, settling on the same first frame
 *
 * The two wipes are centred on 4.0 s (beat 8) and 7.5 s (beat 16) and each
 * lasts 0.6 s, so the picture is continuous on both sides of them.
 *
 * Camera position and look-at target are both interpolated with a monotone
 * cubic, so the take never overshoots and never cuts.
 *
 * Vertical field of view is used directly; `placeFreeCamera` in camera.js
 * checks `shot.river` and skips the horizontal-FOV shift used elsewhere.
 */
const FIELDS = ['cx', 'cy', 'cz', 'tx', 'ty', 'tz', 'fov'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// The bridge world is authored in metres and then scaled by .35, so every
// camera position below is converted into the same scene units.
const SCALE = 0.35;

// progress, camera x/y/z, look-at x/y/z, vertical FOV (degrees)
const keys = [
  [0.000, -215, 50.0, 250, -267.7, 46.5, 165.0, 52],
  [0.100, -238, 46.0, 235, -289.0, 42.5, 150.0, 52],
  [0.200, -280, 37.0, 212, -320.0, 33.5, 126.0, 50],
  [0.280, -300, 30.0, 202, -330.0, 31.0, 116.0, 49],
  [0.340, -320, 27.0, 194, -336.0, 33.0, 112.0, 48],
  [0.370, -334, 24.0, 186, -342.0, 33.0, 108.0, 47],
  [0.430, -374.6, 5.60, 158, -348.2, 47.0, 1.3, 40],
  [0.500, -374.8, 5.58, 156, -348.4, 47.7, -0.7, 40],
  [0.580, -375.0, 5.56, 153, -348.6, 48.3, -3.7, 40],
  [0.660, -375.1, 5.55, 150, -348.7, 49.0, -6.7, 40],
  [0.720, -375.2, 5.56, 147, -348.8, 49.7, -9.7, 40],
  [0.780, -340, 20.0, 174, -347.5, 30.0, 84.0, 44],
  [0.850, -296, 33.0, 201, -330.0, 33.0, 116.0, 48],
  [0.920, -252, 44.0, 228, -295.0, 41.0, 144.0, 51],
  [1.000, -215, 50.0, 250, -267.7, 46.5, 165.0, 52],
];

function createCurve(points) {
  const times = points.map(p => p[0]);
  const vals = points.map(p => p.slice(1));
  const count = points.length;
  const slopes = [];
  for (let j = 0; j < FIELDS.length; j++) {
    const d = [], m = new Array(count).fill(0);
    for (let i = 0; i < count - 1; i++) d.push((vals[i + 1][j] - vals[i][j]) / (times[i + 1] - times[i]));
    for (let i = 1; i < count - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < count - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    m[0] = m[count - 1] = 0;
    slopes.push(m);
  }
  return progress => {
    const t = clamp(progress, 0, 1);
    let k = 0;
    while (k < count - 2 && t >= times[k + 1]) k++;
    const h = times[k + 1] - times[k];
    const u = clamp((t - times[k]) / h, 0, 1);
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    const out = {};
    FIELDS.forEach((field, j) => {
      out[field] = h00 * vals[k][j] + h10 * h * slopes[j][k]
        + h01 * vals[k + 1][j] + h11 * h * slopes[j][k + 1];
    });
    return out;
  };
}

const curve = createCurve(keys);

export function sampleRiverShot(progress) {
  const p = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const s = curve(p);
  const shot = {
    cx: s.cx * SCALE, cy: s.cy * SCALE, cz: s.cz * SCALE,
    tx: s.tx * SCALE, ty: s.ty * SCALE, tz: s.tz * SCALE,
    fov: s.fov,
    free: true, river: true, verticalFov: true,
    near: 0.28, far: 4200,
    view: p < 0.40 ? 'flat' : p < 0.75 ? 'deep' : 'corner',
    maxYaw: 0,
    whip: 0,
    progress: p,
    sceneKind: 'river',
  };
  // The shutter smear is centred on the two wipes, which sit on beats 8 and 16.
  const wipe1 = 1 - clamp(Math.abs(p - 0.40) / 0.035, 0, 1);
  const wipe2 = 1 - clamp(Math.abs(p - 0.75) / 0.035, 0, 1);
  shot.whip = Math.max(wipe1, wipe2) * 0.55;
  return shot;
}
