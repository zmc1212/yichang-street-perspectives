/*
 * Guomao, Yichang — an original model rebuilt from exterior photographs.
 * Reference: 2025 Three Gorges Daily street view and 2018 Baoye structure photo.
 * The contractor records an actual height of 120 m. This composition uses 95
 * world units for the tower; footprints and minor details remain approximations.
 */
export function buildGuomao(kit) {
  const {
    THREE, group, material, customMaterial, addMesh, box, plane,
    canvasTexture, imageTexture, font, emissives, glow, noInk, seeded,
  } = kit;
  const TAU = Math.PI * 2;
  const C = {
    glass: '#172d36', glassSide: '#233a43', joint: '#142832',
    metal: '#647e85', metalDark: '#364f59', edge: '#86979a',
    stone: '#84918e', roof: '#3d5155', shop: '#597c82',
    warm: '#e8d3a3', cyan: '#86cabb',
  };

  function emitting(options, value) {
    const mat = customMaterial({ ...options, emissive: '#ffffff', emissiveIntensity: 0 });
    emissives.push({ mat, value });
    return mat;
  }
  // Photographic surfaces already contain their own lit interior. Lighting them
  // again and adding an emissive map doubles the exposure at night, so they use
  // an unlit material and behave as the light source they were photographed as.
  function photo(map, tint = '#ffffff') {
    return new THREE.MeshBasicMaterial({ map, color: tint });
  }

  // A continuous curtain wall. Daytime glazing stays blue-black: its bright
  // horizontal office ribbons belong to the night emissive map, not the albedo.
  function curtainWall(height, { tileWidth = 18, rowHeight = 3.5, seed = 1, light = .42 } = {}) {
    const rows = Math.max(1, Math.round(height / rowHeight));
    const cols = Math.round(tileWidth / .78);
    const map = canvasTexture(1024, 2048, (c, W, H) => {
      const bg = c.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#28444e'); bg.addColorStop(.44, '#1b3440');
      bg.addColorStop(1, '#142b34'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
      const cw = W / cols, rh = H / rows;
      for (let j = 0; j < cols; j++) {
        const n = seeded(seed + j * 7);
        c.fillStyle = n < .36 ? 'rgba(118,155,164,.065)' : 'rgba(4,19,27,.07)';
        c.fillRect(j * cw, 0, cw, H);
        c.fillStyle = 'rgba(7,21,29,.72)'; c.fillRect(j * cw, 0, 2.1, H);
        c.fillStyle = 'rgba(151,171,173,.26)'; c.fillRect(j * cw + 2.5, 0, 1.6, H);
      }
      for (let row = 0; row < rows; row++) {
        const y = row * rh;
        c.fillStyle = 'rgba(7,22,31,.42)'; c.fillRect(0, y + rh * .70, W, rh * .27);
        c.fillStyle = 'rgba(122,151,157,.19)'; c.fillRect(0, y + rh * .94, W, 3.0);
        c.fillStyle = 'rgba(10,26,33,.58)'; c.fillRect(0, y, W, 3.0);
      }
      // Broad, low-contrast sky reflections replace the old multicolour grid.
      const reflection = c.createLinearGradient(0, 0, W, 0);
      reflection.addColorStop(0, 'rgba(178,208,211,0)');
      reflection.addColorStop(.26, 'rgba(178,208,211,.075)');
      reflection.addColorStop(.38, 'rgba(178,208,211,.02)');
      reflection.addColorStop(.63, 'rgba(178,208,211,0)');
      reflection.addColorStop(.78, 'rgba(178,208,211,.065)');
      reflection.addColorStop(1, 'rgba(178,208,211,0)');
      c.fillStyle = reflection; c.fillRect(0, 0, W, H);
    });
    const lit = canvasTexture(1024, 2048, (c, W, H) => {
      c.fillStyle = '#000000'; c.fillRect(0, 0, W, H);
      const cw = W / cols, rh = H / rows;
      for (let row = 0; row < rows; row++) {
        const band = seeded(seed + row * 11);
        const y = row * rh;
        // Continuous, narrow warm strips read as office floors. Several floors
        // remain unlit and a few bays break the ribbon, as in the photograph.
        if (band < .18) continue;
        for (let col = 0; col < cols; col++) {
          if (seeded(seed + row * 37 + col * 13) < .22) continue;
          c.fillStyle = band < .73 ? '#b9a16e' : '#7a9896';
          c.globalAlpha = .36 + seeded(row * 17 + col + seed) * .42;
          c.fillRect(col * cw + 3, y + rh * .18, cw - 6, rh * .40);
          c.fillStyle = '#dec795'; c.globalAlpha *= .45;
          c.fillRect(col * cw + 3, y + rh * .22, cw - 6, 2.8);
        }
      }
      c.globalAlpha = 1;
    });
    map.wrapS = lit.wrapS = THREE.RepeatWrapping;
    return {
      mat: emitting({ map, color: '#ffffff', emissiveMap: lit }, light),
      tileWidth,
    };
  }

  // Rain-night frontage: photographic shop interiors behind glass. Two generated
  // interiors plus their mirrored copies give the seventeen bays four readings;
  // the lit map only appears once the night emissive is switched on, so the wet
  // paving picks up a long warm sheet of interior light.
  const shopTex = [
    imageTexture('assets/textures/guomao/shop-convenience-v001.png'),
    imageTexture('assets/textures/guomao/shop-bakery-v001.png'),
  ];
  function mirrored(tex) {
    const t = tex.clone();
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.repeat.x = -1; t.offset.x = 1;
    return t;
  }
  const shopMats = [...shopTex, ...shopTex.map(mirrored)]
    .map((tex) => photo(tex));
  const shopFrame = material('#1c2c31');
  const trimLit = canvasTexture(64, 16, (c, W, H) => {
    c.fillStyle = '#ffcb8d'; c.fillRect(0, 0, W, H);
  });
  // The fascia band is an aluminium housing with an LED face: its diffuse
  // albedo stays dark so the entrance light cannot blow it out, and the light
  // it gives the wet paving comes from the emissive map alone.
  const trimGlow = emitting({ color: '#2f3633', emissiveMap: trimLit }, .58);

  // Extrude a plan outline vertically. The first bend is the characteristic
  // soft street corner; the tower and rear junction deliberately remain square.
  function podiumBody(w, d, radius, height, x, z, mat, bottom = 0) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + radius, -d / 2);
    s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2);
    s.lineTo(-w / 2, d / 2); s.lineTo(-w / 2, -d / 2 + radius);
    s.absarc(-w / 2 + radius, -d / 2 + radius, radius, Math.PI, Math.PI * 1.5, false);
    const geo = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 12 });
    geo.rotateX(-Math.PI / 2);
    return addMesh(geo, mat, x, bottom, z);
  }

  function wallStrip(points, y, height, surface) {
    const p = [], n = [], uv = [], indices = [];
    let run = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i], [x2, z2] = points[i + 1];
      const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
      const base = p.length / 3;
      p.push(x1, y, z1, x2, y, z2, x2, y + height, z2, x1, y + height, z1);
      for (let j = 0; j < 4; j++) n.push(-dz / len, 0, dx / len);
      uv.push(run / surface.tileWidth, 0, (run + len) / surface.tileWidth, 0,
        (run + len) / surface.tileWidth, 1, run / surface.tileWidth, 1);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      run += len;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    const obj = addMesh(geo, surface.mat);
    obj.castShadow = false;
    return obj;
  }

  function frontLabel(text, x, y, z, w, h, color = '#e9e4d1', sub = '') {
    const tex = canvasTexture(1024, 256, (c, W, H) => {
      c.clearRect(0, 0, W, H); c.fillStyle = color;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(sub ? 127 : 155, 600); c.fillText(text, W / 2, sub ? H * .40 : H * .51, W - 20);
      if (sub) { c.font = font(31, 500); c.fillText(sub, W / 2, H * .83, W - 90); }
    });
    const mat = emitting({ map: tex, color: '#ffffff', emissiveMap: tex,
      transparent: true, alphaTest: .12, depthWrite: false, side: THREE.DoubleSide }, .72);
    const face = plane(w, h, x, y, z, mat);
    glow.push(face); noInk.push(face);
    return face;
  }

  const podiumGlass = curtainWall(23.2, { tileWidth: 18, rowHeight: 3.7, seed: 71, light: .68 });
  const towerGlass = curtainWall(79.4, { tileWidth: 18, rowHeight: 3.55, seed: 128, light: .82 });
  const olderGlass = curtainWall(19.5, { tileWidth: 18, rowHeight: 3.1, seed: 36, light: .44 });
  const dark = material(C.glass), edge = material(C.metalDark), rib = material(C.metal);
  const topRib = material('#a3b6b5', { emissive: '#a7cbc4', emissiveIntensity: 0 });
  emissives.push({ mat: topRib, value: .48 });

  // Massing: broad low shopping podium, a recessed middle crown, a lower old
  // west wing, and the much taller glass tower rising at the right rear.
  const px = -47, pz = -23.5, pw = 64, pd = 37, ph = 27.5, pr = 8;
  podiumBody(pw, pd, pr, ph, px, pz, dark);
  podiumBody(pw + .12, pd + .12, pr, .36, px, pz, edge, ph);
  const front = -4.91, left = -79.09;
  wallStrip([[-71, front], [-14.91, front]], .8, 26.5, podiumGlass);
  wallStrip([[left, -42], [left, -13]], .8, 26.5, podiumGlass);
  wallStrip([[-14.91, front], [-14.91, -42]], .8, 26.5, podiumGlass);
  const arc = [];
  for (let j = 0; j <= 16; j++) {
    const a = Math.PI - j / 16 * Math.PI / 2;
    arc.push([-71 + 8.09 * Math.cos(a), -13 + 8.09 * Math.sin(a)]);
  }
  wallStrip(arc, .8, 26.5, podiumGlass);

  // Fine architectural mullions; they stay subordinate to the overall glass
  // volume. The upper group is brighter and deeper, like the photographed crown.
  for (let x = -70.4; x <= -15.4; x += 1.18) {
    box(.095, 26.5, .20, x, 14.05, -4.78, rib);
    box(.12, 5.2, .28, x, 24.5, -4.72, topRib);
  }
  for (let z = -13.4; z >= -41.5; z -= 1.18) {
    box(.20, 26.5, .095, -79.22, 14.05, z, rib);
    box(.28, 5.2, .12, -79.26, 24.5, z, topRib);
  }
  for (let j = 0; j <= 11; j++) {
    const a = Math.PI - j / 11 * Math.PI / 2;
    const x = -71 + 8.18 * Math.cos(a), z = -13 + 8.18 * Math.sin(a);
    const fin = box(.11, 26.5, .23, x, 14.05, z, rib);
    fin.rotation.y = Math.PI / 2 - a;
    const finTop = box(.13, 5.2, .28, x, 24.5, z, topRib);
    finTop.rotation.y = fin.rotation.y;
  }
  // Floor bands follow the curve rather than becoming floating rectangular decks.
  for (let y = 4.8; y < ph; y += 3.75) {
    podiumBody(pw + .28, pd + .28, pr, .095, px, pz, edge, y);
  }

  // Raised commercial portion and recessed west connection give a stepped
  // skyline; these are attached building masses, not freestanding towers.
  box(27, 4.3, 24, -52.5, 29.6, -25, C.glassSide);
  box(27.15, .24, 24.15, -52.5, 31.87, -25, C.metalDark);
  for (let x = -65.5; x < -39.1; x += 1.18) box(.11, 4.2, .18, x, 29.6, -12.88, topRib);
  box(29, 23.8, 23.5, -63.5, 11.9, -41.25, '#455257');
  wallStrip([[-78.08, -53], [-78.08, -29.4]], .8, 22.5, olderGlass);
  for (let y = 4; y < 24; y += 3.25) box(29.25, .30, 23.7, -63.5, y, -41.25, '#788789');
  box(29.4, .35, 23.9, -63.5, 24.05, -41.25, C.roof);
  // A narrow opaque connection breaks the glass surfaces, as in the built joint.
  box(2.3, 31.8, 4.2, -39.4, 15.9, -33.8, '#697a7c');

  // Tall rectangular tower, intentionally to the RIGHT and BEHIND the podium.
  const tx = -30, tz = -47.5, tw = 25, td = 27, th = 95;
  box(tw, th, td, tx, th / 2, tz, dark);
  wallStrip([[-42.57, -33.91], [-17.43, -33.91]], 3.7, 79.5, towerGlass);
  wallStrip([[-17.41, -33.98], [-17.41, -61.02]], 3.7, 79.5, towerGlass);
  wallStrip([[-42.59, -61.02], [-42.59, -33.98]], 3.7, 79.5, towerGlass);
  wallStrip([[-17.43, -61.09], [-42.57, -61.09]], 3.7, 79.5, towerGlass);
  // Exposed slender silver-grey verticals continue through the LED crown.
  for (let x = -42.2; x <= -17.7; x += .96) {
    box(.075, 94.6, .15, x, 47.5, -33.81, rib);
    box(.075, 94.6, .15, x, 47.5, -61.18, edge);
  }
  for (let z = -34.25; z >= -60.75; z -= .96) {
    box(.15, 94.6, .075, -17.30, 47.5, z, rib);
    box(.15, 94.6, .075, -42.70, 47.5, z, edge);
  }
  for (let y = 7.1; y < 83.5; y += 3.55) {
    box(tw + .30, .10, td + .30, tx, y, tz, edge);
  }
  // The corner edges are only slightly heavier, never thick residential frames.
  for (const x of [-42.54, -17.46]) for (const z of [-61.04, -33.96])
    box(.24, 95, .24, x, 47.5, z, '#243d48');
  box(tw + .2, .24, td + .2, tx, 95.12, tz, C.metalDark);
  box(18.5, 1.25, 16, tx, 95.75, tz - 1.5, '#344b52');
  // Low rooftop screens are deliberately recessed below the crown silhouette.
  box(10, .6, 6.5, tx + 2, 96.6, tz - 3, '#536366');

  // The crown is a real LED mesh: a generated dot-matrix facade supplies the
  // pixel colour and the letter/stream masks only cut its silhouette, so the
  // glyph outlines stay correct Chinese while the material is photographic.
  const crownLed = imageTexture('assets/textures/guomao/crown-led-v001.png');
  function crownTexture(text = '') {
    const tex = canvasTexture(2048, 912, (c, W, H) => {
      c.clearRect(0, 0, W, H);
      if (text) {
        c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = font(760, 700); c.fillText(text, W / 2, H * .50, W * .90);
      } else {
        const cw = W / 94, ch = H / 28;
        for (let col = 0; col < 94; col++) for (let row = 0; row < 28; row++) {
          const n = seeded(52 + col * 31 + row * 13);
          if (n < .50) continue;
          c.globalAlpha = .35 + n * .5; c.fillStyle = '#fff';
          c.fillRect((col + .5) * cw - cw * .18, (row + .5) * ch - ch * .35, cw * .36, ch * .70);
        }
        c.globalAlpha = 1;
      }
    });
    const paint = () => {
      if (!crownLed.image) return;
      const cv = tex.image, W = cv.width, H = cv.height, ctx = cv.getContext('2d');
      const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
      mask.getContext('2d').drawImage(cv, 0, 0);
      // canvasTexture leaves its 0.5 canvas-space scale on this context; painting
      // through it would shrink the fill into the top-left quarter of the canvas.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (text) {
        // A lit crown sign: the glyphs stay white and only borrow the panel's
        // dot structure. Filling them with the dark facade photo would print
        // navy letters on a night sky.
        ctx.drawImage(mask, 0, 0);
        ctx.globalAlpha = .2; ctx.globalCompositeOperation = 'source-atop';
        ctx.drawImage(crownLed.image, 0, 0, W, H);
        ctx.globalAlpha = 1;
      } else {
        // The dot-matrix band keeps the photographed LED panel as its fill.
        ctx.drawImage(crownLed.image, 0, 0, W, H);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0);
      }
      ctx.globalCompositeOperation = 'source-over';
      tex.needsUpdate = true;
    };
    if (crownLed.image) paint();
    else (crownLed.userData.onLoad ||= []).push(paint);
    return tex;
  }
  const letterTex = crownTexture('国贸'), streamTex = crownTexture('');
  const crownLetter = emitting({ map: letterTex, color: '#ffffff', emissiveMap: letterTex,
    transparent: true, alphaTest: .12, depthWrite: false, side: THREE.DoubleSide }, .9);
  const crownStream = emitting({ map: streamTex, color: '#ffffff', emissiveMap: streamTex,
    transparent: true, alphaTest: .12, depthWrite: false, side: THREE.DoubleSide }, 1.22);
  // No rear face: the final shot looks almost straight up, and the back panel
  // would float above the roof as a second ghost sign.
  const crownFaces = [
    plane(24.2, 10.8, tx, 89.05, -33.68, crownLetter),
    plane(26.2, 10.8, -17.19, 89.05, tz, crownStream, Math.PI / 2),
    plane(26.2, 10.8, -42.81, 89.05, tz, crownStream, -Math.PI / 2),
  ];
  crownFaces.forEach(face => { glow.push(face); noInk.push(face); });

  // Ground-floor glazing is tall and sparse. Actual storefront identities are
  // left neutral; the main location lettering retains only the Guomao name.
  box(53, 4.5, .38, -43, 2.6, -4.64, C.joint);
  for (let i = 0; i < 17; i++) {
    const x = -68.6 + i * 3.1;
    box(2.82, 3.55, .22, x, 2.65, -4.37, shopFrame);
    plane(2.76, 3.49, x, 2.65, -4.245, shopMats[i % 4]);
    box(.10, 4.45, .26, x + 1.5, 2.65, -4.21, '#98a8a4');
    box(2.80, .14, .29, x, .93, -4.17, '#6e8587');
  }
  box(53, .23, .75, -43, 4.92, -4.20, trimGlow);
  // Main entrance: set-back glass doors, slender portal and a real projecting
  // canopy. It does not turn the whole building into a freestanding signboard.
  const ex = -25.2;
  box(12.1, 4.2, 1.35, ex, 2.25, -4.12, '#20343c');
  // One generated wide elevation covers the five leaves: the reference is the
  // real Guomao portal, with its banded pink granite, bronze-framed doors and
  // the cosmetics hall visible through the glass. Not a hotel lobby.
  const entranceTex = imageTexture('assets/textures/guomao/entrance-wide-v004.png');
  const doorMat = photo(entranceTex);
  plane(12.0, 4.14, ex, 2.23, -3.43, doorMat);
  // The convenience frontage keeps two vending machines beside the doors; their
  // fronts are photographic and light the wet paving with a small cool pool.
  const vendTex = imageTexture('assets/textures/guomao/vending-v001.png');
  const vendMat = photo(vendTex);
  for (const x of [-33.35, -34.55]) {
    box(1.06, 1.96, .66, x, .99, -3.62, '#262d30');
    plane(.99, 1.86, x, 1.00, -3.28, vendMat);
    box(1.12, .07, .70, x, 1.99, -3.62, '#3b4245');
  }
  box(14.2, .18, 4.4, ex, 4.70, -2.85, '#3e5a65');
  box(14.2, .05, .20, ex, 4.57, -.74, trimGlow);
  box(14.4, .16, .20, ex, 4.63, -.62, '#abb9b3');
  for (const x of [ex - 5.9, ex + 5.9]) box(.14, 4.5, .14, x, 2.25, -.90, '#a3b2ad');
  box(15.2, .15, 5.4, ex, .18, -2.38, '#b4b5a8');
  box(15.6, .12, 5.8, ex, .045, -2.24, '#c4c4b7');
  frontLabel('国贸', ex, 6.25, -4.04, 6.7, 1.6, '#e5dfc9', 'GUOMAO');
  // Side entrance faces the square / road edge and reinforces the corner reveal.
  box(3.3, .17, 10.2, -13.53, 4.65, -20.8, '#465e66');
  for (const z of [-25, -16.6]) box(.14, 4.45, .14, -12.2, 2.3, z, '#8b9c9b');

  // The prominent magenta screen is on the lower front of the rounded podium,
  // below the upper mullion crown, matching the real street-view arrangement.
  // The media wall carries a generated campaign photograph rather than a drawn
  // placeholder; the crop removes the photographed frame so the LED panel sits
  // inside the building's own bezel.
  const adTex = imageTexture('assets/textures/guomao/billboard-v001.png');
  adTex.repeat.set(.90, .68); adTex.offset.set(.05, .17);
  const adMat = photo(adTex);
  box(18.4, 6.8, .35, -59.2, 12.7, -4.43, '#21353f');
  const screen = plane(17.6, 5.0, -59.2, 12.7, -4.20, adMat);
  glow.push(screen);
  // Modest facade media strip and an entry display, not rows of giant ad boards.
  const stripMat = material('#87a9ae', { emissive: '#a7d4d9', emissiveIntensity: 0 });
  emissives.push({ mat: stripMat, value: .65 });
  for (let i = 0; i < 12; i++) {
    const bar = box(.65, 2.55, .16, -42 + i * .77, 12.75, -4.62, i % 3 === 0 ? '#688e9b' : stripMat);
    if (i % 3 !== 0) glow.push(bar);
  }

  // Restrained, low mechanical details preserve the photographic roof outline.
  for (const [x, z, w, d] of [[-68, -34, 6, 4], [-49, -29, 5, 3.4]]) {
    box(w, 1.15, d, x, 28.2, z, '#5e6f70');
    for (let j = 0; j < 6; j++) box(w - .4, .07, .12, x, 28.83, z - d * .36 + j * d * .14, '#8b9995');
  }

  // Warm shop light, the entrance and the magenta screen each get a real
  // source so the wet paving in front of them is lit, not just painted.
  function nightLight(x, y, z, color, intensity, distance) {
    const light = new THREE.PointLight(color, 0, distance, 2);
    light.position.set(x, y, z);
    light.userData.nightIntensity = intensity;
    group.add(light);
  }
  nightLight(-63, 3.3, -1.3, '#ffb877', 68, 22);
  nightLight(-45, 3.3, -1.3, '#ffb877', 62, 22);
  // The entrance source stands out in the forecourt, not under the canopy:
  // there it lights the wet paving instead of grazing the fascia into bloom.
  // Kept weak so the forecourt lamp post in front of it does not clip to yellow.
  nightLight(-25.2, 2.9, 1.2, '#ffd3a0', 14, 10);
  nightLight(-59.2, 9.6, -1.8, '#ff6ea8', 58, 24);
  nightLight(-33.9, 1.5, -2.5, '#bcd8ff', 16, 7);

  // The camera follows the reference clip's street walk rather than fitting
  // hero bounds; camera.js owns that path and keeps the other scenes unchanged.
  return { focus: { kind: 'guomao' } };
}
