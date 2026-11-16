import * as THREE from 'three';

/**
 * North-bank detail for the 9:16 river scene. It is layered on top of the
 * existing bridge world: the bridge itself, the banks, the promenade and the
 * city blocks all come from the photograph-informed base model, so the river
 * variant keeps the same 936 m main bridge and the same shoreline.
 *
 * Added here, only for that variant:
 *  - 镇江阁 on the city bank about 2.4 km upstream (true bearing from the bridge)
 *  - a low-rise street wall on the inland side of 沿江大道, with the generated
 *    shopfront and apartment facades
 *  - the wet lower promenade: red steel railing, warm lamps, 滨江公园 stone, pontoon
 *  - two foreground props that sweep across the lens at 4.0 s and 8.0 s
 */
export function buildRiverBank(api) {
  const { group, mesh, box, cyl, plane, beam, texture, material, customMaterial,
    emitting, glow, noInk, imageTexture, font } = api;

  const ground = 9.5;
  const shore = z => -351 - 17 * Math.sin(z / 480) + 9 * Math.sin(z / 970);
  const sphere = (r, x, y, z, mat) => mesh(new THREE.IcosahedronGeometry(r, 1), mat, x, y, z);
  const clamp = THREE.MathUtils.clamp;

  const tex = {
    skyline: imageTexture('assets/textures/river/skyline-north-night-v001-strip.png'),
    facade: imageTexture('assets/textures/river/facade-riverfront-v001.png'),
    shops: imageTexture('assets/textures/river/shopfront-band-v001-crop.png'),
    paving: imageTexture('assets/textures/river/quay-paving-v001.png'),
    concrete: imageTexture('assets/textures/river/tower-concrete-v001.png'),
    masonry: imageTexture('assets/textures/river/revetment-masonry-v001.png'),
    facadeNight: imageTexture('assets/textures/river/residential-facade-night-v002.png'),
  };
  tex.skyline.wrapS = tex.skyline.wrapT = THREE.ClampToEdgeWrapping;
  tex.facade.wrapS = tex.facade.wrapT = THREE.RepeatWrapping;
  tex.shops.wrapS = tex.shops.wrapT = THREE.RepeatWrapping;
  tex.paving.wrapS = tex.paving.wrapT = THREE.RepeatWrapping;
  tex.concrete.wrapS = tex.concrete.wrapT = THREE.RepeatWrapping;
  tex.concrete.repeat.set(0.22, 0.22);
  tex.masonry.wrapS = tex.masonry.wrapT = THREE.RepeatWrapping;
  tex.facadeNight.wrapS = tex.facadeNight.wrapT = THREE.RepeatWrapping;

  const basic = options => new THREE.MeshBasicMaterial(options);

  /* ---------------------------------------------------------------- 镇江阁 */
  const pavilionMat = material('#6f3330');
  const pavilionDark = material('#5a2b28');
  const stone = material('#a8a294');
  const stoneLight = material('#cfc9b8');
  const roofMat = material('#39423f');
  const cream = material('#d8c9a8');
  const gold = emitting('#e8c07a', 1.35);
  const redLamp = emitting('#d24a3e', 1.6);

  function pavilion(z0) {
    const x0 = shore(z0) - 46;
    const baseY = ground;
    // Stone platform and balustrade.
    box(27, 3.4, 25, x0, baseY + 1.7, z0, stone);
    box(27.8, 0.5, 25.8, x0, baseY + 3.55, z0, stoneLight);
    for (const s of [-1, 1]) {
      box(0.45, 1.15, 25.8, x0 + s * 13.7, baseY + 4.35, z0, stoneLight);
      box(27.8, 1.15, 0.45, x0, baseY + 4.35, z0 + s * 12.9, stoneLight);
    }
    // Steps down towards the river (+X).
    for (let i = 0; i < 5; i++) {
      box(1.6, 0.64, 8 - i * 0.5, x0 + 14.2 + i * 1.5, baseY + 0.32 + i * 0.64, z0, stone);
    }

    const tiers = [
      { w: 14, body: 4.2, roof: 2.9, top: 6.4, r: 11.6 },
      { w: 11.6, body: 3.9, roof: 2.7, top: 5.6, r: 9.7 },
      { w: 9.4, body: 3.6, roof: 2.5, top: 4.9, r: 8.1 },
      { w: 7.6, body: 3.3, roof: 2.4, top: 4.2, r: 6.6 },
    ];
    let y = baseY + 3.8;
    tiers.forEach((t, i) => {
      box(t.w, t.body, t.w, x0, y + t.body / 2, z0, pavilionMat);
      box(t.w + 0.95, 0.4, t.w + 0.95, x0, y + t.body - 0.25, z0, cream);
      // Windows: recessed dark bands on the two visible faces.
      const band = box(0.18, t.body * 0.44, t.w * 0.62, x0 + t.w / 2 + 0.02,
        y + t.body * 0.5, z0, pavilionDark);
      band.castShadow = false;
      y += t.body;
      const roof = cyl(t.top, t.r, t.roof, x0, y + t.roof / 2, z0, roofMat, 4);
      roof.rotation.y = Math.PI / 4;
      // Upturned corner horns, a cheap but readable pagoda silhouette.
      const d = t.r * 0.707;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        beam([x0 + sx * d * 0.92, y + 0.25, z0 + sz * d * 0.92],
          [x0 + sx * (d + 0.9), y + 1.05, z0 + sz * (d + 0.9)], 0.28, 0.28, roofMat);
      }
      // Warm under-eave light line.
      const ring = cyl(t.r * 0.99, t.r * 1.01, 0.22, x0, y + 0.16, z0, gold, 4);
      ring.rotation.y = Math.PI / 4;
      ring.castShadow = false;
      glow.push(ring); noInk.push(ring);
      if (i === 0) {
        for (const sz of [-1, 1]) {
          const l = cyl(0.42, 0.42, 0.95, x0 + t.r * 0.72, y - 0.35, z0 + sz * t.r * 0.72, redLamp, 8);
          glow.push(l); noInk.push(l);
        }
      }
      y += t.roof;
    });
    // Top roof and finial.
    const top = cyl(1.3, 7.8, 4.4, x0, y + 2.2, z0, roofMat, 4);
    top.rotation.y = Math.PI / 4;
    cyl(0.16, 0.16, 3.4, x0, y + 5.9, z0, gold, 6);
    cyl(0.7, 0.9, 0.5, x0, y + 4.6, z0, gold, 6);

    // Plaque.
    const plaqueTex = texture(768, 192, (c, W, H) => {
      c.fillStyle = '#3b1b17'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#c9a460'; c.lineWidth = 9; c.strokeRect(12, 12, W - 24, H - 24);
      c.fillStyle = '#ecd39a'; c.font = font(112, 600);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('镇江阁', W / 2, H / 2 + 6);
    });
    const plaque = plane(3.4, 0.85, x0 + 7.02, baseY + 7.2, z0,
      customMaterial({ map: plaqueTex }), Math.PI / 2, group, false);
    plaque.castShadow = false;

    // Landscaping around the platform.
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7, r = 16 + (i % 4) * 3.4;
      const tx = x0 + Math.cos(a) * r, tz = z0 + Math.sin(a) * r;
      mesh(new THREE.IcosahedronGeometry(2.6 + (i % 3) * 0.7, 0), material('#2f4038'),
        tx, ground + 3.1, tz, group, true);
      cyl(0.35, 0.45, 3.2, tx, ground + 1.6, tz, material('#4a3b30'), 6);
    }
  }
  pavilion(-2380);

  /* --------------------------------------------- 沿江大道 low-rise frontage */
  const frontage = [
    [-286, 34, 17, 1], [-247, 30, 21, 0], [-206, 36, 15, 1], [-166, 28, 24, 0],
    [-126, 33, 19, 1], [-86, 31, 14, 0], [-48, 27, 22, 1],
    [52, 30, 18, 0], [94, 36, 23, 1], [138, 29, 16, 0], [180, 34, 25, 1],
    [224, 31, 19, 0], [268, 35, 15, 1], [312, 28, 21, 0],
  ];
  const shopMat = customMaterial({ map: tex.shops, color: '#b9b2a4' });
  const frontMat = customMaterial({ map: tex.facade, color: '#a9a396' });

  function uvScale(planeMesh, w, h, uw, uh) {
    const uv = planeMesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uw, uv.getY(i) * uh);
    uv.needsUpdate = true;
    return planeMesh;
  }

  const signs = [
    ['滨江茶楼', '#a3392f', '#f4dfae'],
    ['老码头', '#8e2f2a', '#efcf8e'],
    ['江城夜市', '#b23a33', '#ffe6b4'],
  ];
  function signTexture(label, bg, fg) {
    return texture(384, 1200, (c, W, H) => {
      c.fillStyle = bg; c.fillRect(0, 0, W, H);
      c.strokeStyle = fg; c.lineWidth = 8; c.strokeRect(14, 14, W - 28, H - 28);
      c.fillStyle = fg; c.font = font(150, 700);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const chars = [...label];
      chars.forEach((ch, i) => c.fillText(ch, W / 2, H * (i + 0.62) / (chars.length + 0.24)));
    });
  }

  frontage.forEach(([z, w, h, tall], idx) => {
    const depth = 17;
    const frontX = shore(z) - 129;
    const xc = frontX - depth / 2;
    const baseY = ground - 0.4;
    box(depth, h, w, xc, baseY + h / 2, z, material(idx % 2 ? '#8f8a80' : '#9a9488'));
    // Roof parapet and a few rooftop boxes.
    box(depth + 0.5, 0.55, w + 0.5, xc, baseY + h + 0.25, z, material('#77736a'));
    for (let k = 0; k < 3; k++) {
      box(2.2, 1.5, 2.6, xc - 3 + k * 4.2, baseY + h + 1.2, z - w * 0.24 + k * w * 0.22, material('#b0aa9c'));
    }
    // Ground-floor shop band, straight-on to the river.
    const shop = plane(w, 5.0, frontX + 0.06, baseY + 2.5, z, shopMat, Math.PI / 2);
    shop.castShadow = false;
    // Upper apartment grid, one 13 m x 12.8 m tile.
    const upperH = h - 5.2;
    const upper = plane(w, upperH, frontX + 0.05, baseY + 5.2 + upperH / 2, z, frontMat, Math.PI / 2);
    uvScale(upper, w, upperH, Math.max(1, Math.round(w / 13)), Math.max(1, Math.round(upperH / 12.8)));
    upper.castShadow = false;
    // A red vertical banner on every other block, near the street corner.
    if (idx % 2 === 0) {
      const info = signs[(idx / 2) % signs.length | 0];
      const sign = plane(1.15, 4.4, frontX + 0.12, baseY + 7.1, z + w * 0.3,
        customMaterial({ map: signTexture(info[0], info[1], info[2]) }), Math.PI / 2, group, false);
      sign.castShadow = false;
      glow.push(sign); noInk.push(sign);
    }
    // A warm strip over the shopfront, so the street reads at night.
    const strip = box(0.12, 0.16, w * 0.9, frontX + 0.16, baseY + 5.15, z, emitting('#f0c583', 1.1));
    strip.castShadow = false;
    glow.push(strip); noInk.push(strip);
    if (tall) {
      // One or two air-conditioner boxes on the visible face.
      for (let k = 0; k < 4; k++) {
        box(0.5, 0.9, 0.8, frontX + 0.24, baseY + 7.5 + (k % 3) * 4.1, z - w * 0.28 + k * w * 0.18, material('#c3bdb0'));
      }
    }
  });

  /* ----------------------------------------- far skyline layers (AI plates) */
  const skyMat = basic({
    map: tex.skyline, transparent: true, depthWrite: false, color: '#9aa3b0',
    side: THREE.DoubleSide,
  });
  function skyline(x, z, width, height) {
    const p = plane(width, height, x, height * 0.46, z, skyMat, Math.PI / 2, group, false);
    p.castShadow = false; p.receiveShadow = false;
    // 不能放进 noInk：river 的无墨层在 normal pass 里被判成天空，
    // 整条天际线会被天空色覆盖掉。
    return p;
  }
  skyline(-760, -2060, 1180, 189);
  skyline(-770, 2160, 1240, 199);

  /* ------------------------------------------------ wet promenade furniture */
  const railRed = material('#a94348');
  const railDark = material('#7c353a');
  for (let z = 24; z <= 336; z += 3.1) {
    const x = shore(z) - 3.7;
    box(0.09, 1.12, 0.09, x, 1.11, z, railRed);
  }
  // Two continuous rails, segmented to follow the shoreline.
  for (let z = 24; z < 336; z += 12) {
    const za = z, zb = Math.min(z + 12, 336);
    const xa = shore(za) - 3.7, xb = shore(zb) - 3.7;
    for (const y of [0.95, 1.62]) {
      beam([xa, y, za], [xb, y, zb], 0.07, 0.11, railRed);
    }
  }
  // Bins and benches on the upper promenade.
  for (let i = 0; i < 6; i++) {
    const z = 48 + i * 46;
    box(1.5, 0.16, 0.55, shore(z) - 33, 5.62, z, material('#8a6a4c'));
    box(0.14, 0.44, 0.14, shore(z) - 33, 5.45, z - 0.2, railDark);
    box(0.14, 0.44, 0.14, shore(z) - 33, 5.45, z + 0.2, railDark);
  }
  // Warm park lamps. A few carry a pair of red lanterns.
  const lampPole = material('#3e4a44');
  const lampGlow = emitting('#ffd9a2', 1.7);
  for (let i = 0; i < 13; i++) {
    const z = 26 + i * 24.5;
    const x = shore(z) - 31.5;
    cyl(0.1, 0.14, 4.6, x, 5.5 + 2.3, z, lampPole, 6);
    const head = cyl(0.24, 0.3, 0.55, x, 5.5 + 4.75, z, lampGlow, 8);
    head.castShadow = false;
    glow.push(head); noInk.push(head);
    if (i === 4 || i === 5 || i === 9) {
      for (const s of [-1, 1]) {
        const l = cyl(0.16, 0.16, 0.3, x + s * 0.42, 5.5 + 3.55, z, redLamp, 8);
        glow.push(l); noInk.push(l);
      }
    }
  }

  /* ------------------------------------------- 夷陵大桥本体（仅 river 校准） */
  // 实景：白塔 + 蓝色竖条 + 冷白投光，桥侧白光点链，塔顶蓝色航空灯。
  // 这些改动只发生在 river 世界内部，bridge 场景使用自己的材质实例。
  const structure = api.structure;
  const DECK = api.DECK;
  if (structure) {
    const tower = structure.towerMaterial;
    tower.map = tex.concrete;
    tower.color.set('#c6cbc5');
    tower.emissive.set('#a9b6c9');
    tower.needsUpdate = true;
    const cable = structure.cableMaterial;
    if (cable) {
      cable.color.set('#eef3ff');
      cable.emissive.set('#e8f1ff');
    }
    if (structure.insetMaterial) {
      structure.insetMaterial.color.set('#2f6ca8');
      structure.insetMaterial.emissive.set('#2a5d96');
      api.emissives.push({ mat: structure.insetMaterial, value: 0.22 });
    }
    if (structure.goldMaterial) {
      structure.goldMaterial.color.set('#dbe7f7');
      structure.goldMaterial.emissive.set('#dbe7f7');
    }
    for (const item of api.emissives) {
      if (item.mat === tower) item.value = 0.16;
      if (item.mat === cable) item.value = 0.08;
      if (item.mat === structure.goldMaterial) item.value = 0.5;
    }

    // 塔身外侧的蓝色饰带：实景是沿塔肢外缘的一条窄蓝带，夜景里不发光，
    // 只被投光洗亮，所以用低自发光避免变成霓虹线条。
    const blueMat = customMaterial({
      color: '#2f6ca8', emissive: '#2a5d96', emissiveIntensity: 0,
      side: THREE.DoubleSide,
    });
    api.emissives.push({ mat: blueMat, value: 0.16 });
    const beaconMat = emitting('#6f9dff', 1.2);
    const haloMat = basic({ color: '#5b8cff', transparent: true, opacity: 0.16, depthWrite: false });
    const towerTops = [[-348, 106.5], [0, 126], [348, 106.5]];
    for (const [tx, topY] of towerTops) {
      const H = topY - DECK;
      for (const face of [-1, 1]) {
        const pos = [], idx = [];
        for (let i = 0; i <= 26; i++) {
          const t = i / 26, y = DECK + 0.4 + H * 0.96 * t;
          let z;
          if (t < 0.58) z = THREE.MathUtils.lerp(14.2, 5.3, t / 0.58);
          else if (t < 0.73) {
            const q = (t - 0.58) / 0.15;
            z = THREE.MathUtils.lerp(5.3, 2.7, q * q * (3 - 2 * q));
          } else z = THREE.MathUtils.lerp(2.7, 2.42, (t - 0.73) / 0.27);
          const zz = face * (z + 0.06);
          // 2.0 m band on the 9.2 m shaft face: same 22 % share the 1.4 m band had
          // on the surveyed 6.5 m section, so the stripe keeps its weight.
          pos.push(tx - 1.0, y, zz, tx + 1.0, y, zz);
          if (i < 26) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const stripe = mesh(geo, blueMat);
        stripe.castShadow = false;
      }
      // 塔顶蓝色光源与光晕，实景夜景的标志之一。
      const beacon = sphere(0.52, tx, topY + 2.05, 0, beaconMat);
      beacon.castShadow = false;
      glow.push(beacon); noInk.push(beacon);
      const halo = sphere(1.55, tx, topY + 2.05, 0, haloMat);
      halo.castShadow = false;
      noInk.push(halo);
    }

    // 桥侧白色点光链：从 120 m 外看会并成一条冷白线。
    const chainMat = emitting('#e9f2ff', 0.55);
    for (const side of [-1, 1]) {
      const line = box(2230, 0.085, 0.085, 0, DECK + 1.26, side * 11.56, chainMat);
      line.castShadow = false;
      glow.push(line); noInk.push(line);
    }
    for (let x = -900; x <= 900; x += 225) {
      for (const side of [-1, 1]) {
        const dot = box(0.62, 0.62, 0.62, x, DECK + 1.3, side * 11.62, chainMat);
        dot.castShadow = false;
        glow.push(dot); noInk.push(dot);
      }
    }

    // 桥墩航行灯：绿/红各一只，补齐人眼机位的近景细节。
    const navRed = emitting('#e14a3b', 1.4), navGreen = emitting('#58c98a', 1.4);
    for (const [zz, mat] of [[16.6, navGreen], [-16.6, navRed]]) {
      const lamp = sphere(0.42, -348, 2.55, zz, mat);
      lamp.castShadow = false;
      glow.push(lamp); noInk.push(lamp);
    }
  }

  /* ------------------------------------------ 北岸消落带：四级块石台阶 */
  // 实景为四级浆砌块石斜坡、每级一条步道；在现有坡面上叠一层湿块石，
  // 再压三道石阶棱线，避免改动共享的岸线几何。
  const slopeY = d => 0.5 + clamp((d - 3) / 24, 0, 1) * 5;
  const masonryMat = customMaterial({
    map: tex.masonry, color: '#8f978f', side: THREE.DoubleSide,
  });
  function bankRibbon(d0, y0, d1, y1, z0, z1, step, mat, uScale, v0, v1) {
    const pos = [], uv = [], idx = [];
    let row = 0;
    for (let z = z0; z <= z1 + 0.001; z += step) {
      pos.push(shore(z) - d0, y0, z, shore(z) - d1, y1, z);
      uv.push(z / uScale, v0, z / uScale, v1);
      if (row > 0) { const a = (row - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      row++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = mesh(geo, mat);
    m.castShadow = false;
    return m;
  }
  bankRibbon(3.0, 0.62, 27.0, 5.62, 8, 344, 6, masonryMat, 7.5, 0.98, 0.16);
  for (const d of [10, 16, 22]) {
    const y = slopeY(d) + 0.14;
    bankRibbon(d - 0.65, y, d + 0.65, y, 8, 344, 6,
      customMaterial({ map: tex.paving, color: '#6c726a', side: THREE.DoubleSide }), 5.5, 0.04, 0.96);
  }

  // 岸线树冠下的绿色地埋灯，实景夜景沿江是一条约略连续的绿带。
  const greenLamp = emitting('#4e9c6c', 0.9);
  for (let z = 18; z <= 330; z += 24) {
    const lamp = sphere(0.3, shore(z) - 47, ground + 0.9, z, greenLamp);
    lamp.castShadow = false;
    glow.push(lamp); noInk.push(lamp);
  }

  /* ---------------------------------------- 北岸沿江住宅的河侧立面（实景） */
  // 只替换立面贴图，不动 bridge-context 的体量，也不影响 bridge 场景。
  const facades = api.context?.facades || [];
  const facadeTints = ['#d8d2c4', '#c9ced1', '#cfc3ac', '#c5cac3', '#ced3d1', '#bec6c3', '#d2cab9', '#c7cecb'];
  facades.forEach((mat, i) => {
    mat.map = tex.facadeNight;
    mat.emissiveMap = tex.facadeNight;
    mat.emissive.set('#aab6c4');
    mat.color.set(facadeTints[i % facadeTints.length]);
    mat.needsUpdate = true;
  });
  for (const item of api.emissives) if (facades.includes(item.mat)) item.value = 0.72;

  /* ------------------------------------------------------ 江面驳船与游船 */
  // 待闸驳船连排是这一段江面的日常；只放低亮度轮廓灯，不抢桥塔。
  function barge(x, z, len, wid, y) {
    const hull = material('#2c3436'), cabin = material('#3b4446');
    box(wid, 2.2, len, x, y + 1.1, z, hull);
    box(wid * 0.66, 3.0, len * 0.22, x, y + 3.2, z - len * 0.2, cabin);
    const glowWarm = emitting('#e3c88e', 0.9);
    for (const zz of [z - len * 0.36, z + len * 0.36]) {
      const lamp = box(0.3, 0.3, 0.3, x, y + 2.6, zz, glowWarm);
      lamp.castShadow = false;
      glow.push(lamp); noInk.push(lamp);
    }
  }
  barge(-300, -228, 56, 10.5, 0.35);
  barge(-236, -420, 42, 8.2, 0.3);
  barge(58, 548, 48, 9.0, 0.3);

  /* ----------------------------------------------------------- 桥面车流 */
  const traffic = [];
  const carMat = material('#252b31'), busMat = material('#39434a');
  const headMat = emitting('#fff2d6', 1.45), tailMat = emitting('#e04a3c', 1.25);
  for (let i = 0; i < 6; i++) {
    const bus = i % 3 === 0;
    const len = bus ? 10.4 : 4.6, wid = bus ? 2.4 : 1.84, hgt = bus ? 2.9 : 1.2;
    const dir = i % 2 ? 1 : -1;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, hgt, wid), bus ? busMat : carMat);
    body.position.y = 0.2 + hgt / 2;
    g.add(body);
    if (bus) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(len * 0.82, 0.7, wid + 0.03),
        basic({ color: '#c8d8e6' }));
      win.position.y = 0.2 + hgt - 0.62;
      g.add(win);
    }
    for (const s of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.36), headMat);
      head.position.set(dir * (len / 2 - 0.05), 0.72, s * (wid / 2 - 0.34));
      g.add(head); glow.push(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.3), tailMat);
      tail.position.set(-dir * (len / 2 - 0.05), 0.78, s * (wid / 2 - 0.34));
      g.add(tail); glow.push(tail);
    }
    const lane = i % 2 ? 3.55 : -3.55;
    g.position.set(-620 + i * 205, DECK + 0.02, lane);
    group.add(g);
    traffic.push({ g, base: g.position.x, dir, phase: i * 1.7 });
  }

  /* 江面低雾：由 engine 的距离雾统一处理（river 的 hazeNear/hazeFar）。
     这里不再放半透明雾面——river 的 noInk 会被当作无深度覆盖层，
     在 normal pass 里被判成天空，反而在桥墩上叠出横向色带。 */

  // 滨江公园 stone at the upper promenade.
  const parkTex = texture(1024, 384, (c, W, H) => {
    c.fillStyle = '#8d8779'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#9c9586'; c.fillRect(16, 16, W - 32, H - 32);
    c.fillStyle = '#8e2f2a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = font(150, 700); c.fillText('滨江公园', W / 2, H * 0.44);
    c.fillStyle = '#6f6a5e'; c.font = font(46, 500); c.fillText('BINJIANG PARK · YICHANG', W / 2, H * 0.78);
  });
  // Facing downstream so it reads in the eye-level part of the 9:16 take.
  const parkZ = 55, parkX = shore(parkZ) - 27;
  box(7.2, 1.1, 1.0, parkX, 5.5 + 0.55, parkZ, material('#7d786c'));
  const parkSign = plane(6.6, 2.45, parkX, 5.5 + 1.3, parkZ + 0.52,
    customMaterial({ map: parkTex }), 0, group, false);
  parkSign.castShadow = false;
  noInk.push(parkSign);

  // Two red lanterns on the lower walk give the eye-level take its left anchor.
  const redLampGlow = emitting('#e04b32', 1.6);
  for (const z of [156, 118]) {
    const off = 12, x = shore(z) - off, base = 0.5 + (off - 3) / 24 * 5;
    cyl(0.07, 0.1, 2.6, x, base + 1.3, z, material('#3e3530'), 6);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), redLampGlow);
    bulb.position.set(x, base + 2.85, z);
    bulb.castShadow = false;
    group.add(bulb);
    glow.push(bulb); noInk.push(bulb);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
      basic({ color: '#e2603f', transparent: true, opacity: 0.2, depthWrite: false }));
    halo.position.copy(bulb.position);
    group.add(halo);
    glow.push(halo); noInk.push(halo);
  }

  /* --------------------------------------------------------- landing pontoon */
  {
    const z = 252, x = shore(z) - 1.4;
    box(5.2, 0.65, 24, x, 0.75, z, material('#5d6f6c'));
    box(5.4, 0.16, 24.2, x, 1.12, z, material('#8f9890'));
    for (let i = 0; i < 5; i++) cyl(0.18, 0.18, 0.7, x + 2.2, 1.4, z - 9 + i * 4.5, material('#3f4d4a'), 6);
    beam([shore(z) - 22, 5.5, z - 2], [x, 1.25, z - 2], 1.5, 0.22, material('#6f7a72'));
  }

  /* -------------------------------------------------------- red frame anchors
   * One red anchor on each side of the frame at both scales, so the take is
   * bracketed left and right from the first frame to the last:
   *  - city scale, left: a red/white 航标 tower 180 m up the bank
   *  - city scale, right: a moored pontoon plus three channel buoys placed
   *    along the camera path, so one light always sits near the right edge
   *  - street scale, left: a red park lamp on the slope (8-9 % across the
   *    whole eye-level segment)
   *  - street scale, right: a moored red channel mark at 120 m (86-93 %)
   * Screen percentages were solved with qa/project.mjs against the camera keys.
   */
  const deepRed = emitting('#e1432e', 1.8);
  const redGlow = basic({ color: '#e2603f', transparent: true, opacity: 0.12, depthWrite: false });

  function redHead(x, y, z, r) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), deepRed);
    bulb.position.set(x, y, z);
    bulb.castShadow = false;
    group.add(bulb);
    glow.push(bulb); noInk.push(bulb);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.8, 10, 8), redGlow);
    halo.position.set(x, y, z);
    group.add(halo);
    glow.push(halo); noInk.push(halo);
  }

  // City left: 航标 tower, red/white bands, 13 m to the light.
  {
    const x = -348, z = 121, top = 13;
    cyl(0.5, 0.75, top, x, top / 2, z, material('#cfd2c8'), 8);
    for (let i = 0; i < 4; i++) {
      cyl(0.56, 0.62, 1.3, x, 1.8 + i * 3.0, z, material('#b8382c', { emissive: '#7a1e16', emissiveIntensity: 0.35 }), 8);
    }
    redHead(x, top + 0.55, z, 0.55);
  }
  // City right: 趸船 with a red mast light, 11 m to the lamp.
  {
    const x = -271, z = 74;
    box(16, 2.4, 7, x, 1.2, z, material('#4c5a58'));
    box(16.4, 0.22, 7.3, x, 2.5, z, material('#8d928a'));
    box(5.6, 2.6, 4.6, x - 3.4, 3.9, z, material('#6c7671'));
    box(5.2, 0.35, 4.2, x - 3.4, 5.3, z, material('#5a635f'));
    for (const s of [-1, 1]) {
      cyl(0.13, 0.16, 6.2, x + s * 6.4, 5.7, z, material('#55605c'), 6);
      redHead(x + s * 6.4, 8.9, z, 0.42);
    }
    const win = plane(3.6, 1.4, x - 3.4, 4.1, z + 2.32,
      emitting('#f0c07a', 1.0), 0, group, false);
    win.castShadow = false;
    glow.push(win); noInk.push(win);
  }
  // Channel buoys: the camera flies past them, and whichever sits on the right
  // edge keeps a red light there while the pontoon slides out of frame.
  function channelBuoy(x, z, r = 0.42) {
    cyl(1.0, 1.35, 1.1, x, 0.55, z, material('#7a2b22'), 8);
    cyl(0.14, 0.2, 3.6, x, 2.7, z, material('#5a605c'), 6);
    cyl(0.55, 0.55, 0.14, x, 4.35, z, material('#3f4643'), 8);
    redHead(x, 4.7, z, r);
  }
  channelBuoy(-315, 60);
  channelBuoy(-300, 86);
  channelBuoy(-286, 112);
  // 桥涵标 on the deck edge: red navigation marks over the channel, which keep
  // a red light on the right through the pull-back after the second wipe.
  for (const [x, z] of [[-470, -11.6], [-326, -11.6]]) {
    cyl(0.12, 0.16, 1.2, x, 33.9, z, material('#454e4a'), 6);
    redHead(x, 34.7, z, 0.42);
  }
  // One more upstream mark at the bridge approach keeps the right edge lit
  // while the camera pulls back.
  channelBuoy(-370, -200, 1.1);
  // Street left: red park lamp on the slope. Yaw 9.56 deg pushes the near bank
  // across the frame, so it is solved for both ends of the segment instead of
  // one: 5.2 % at 4.3 s (28 m out) and 11.6 % at 7.2 s (17 m out), i.e. inside
  // the left 15 % band the whole time the camera is at eye level.
  {
    const z = 130, x = -375.0;
    const base = 0.5 + (shore(z) - x - 3) / 24 * 5;
    cyl(0.09, 0.14, 3.0, x, base + 1.5, z, material('#3e3530'), 6);
    box(0.4, 0.34, 0.4, x, base + 3.1, z, material('#8f2f2a'));
    // A 0.2 m globe, not a 0.68 m balloon: at 17 m it is ~24 px on a 960 px tall
    // frame, which is what a park lantern actually subtends.
    redHead(x, base + 3.5, z, 0.2);
    const base2 = box(0.5, 0.5, 0.5, x, base + 0.25, z, stone);
    base2.castShadow = false;
  }
  // Street right: red channel mark moored 19 m out, heavy enough to read at
  // 120 m and parked in the right edge band across the whole street segment.
  {
    const x = -336, z = 30;
    cyl(1.3, 1.7, 2.2, x, 1.1, z, material('#7a2b22'), 8);
    cyl(1.05, 1.15, 0.5, x, 2.35, z, material('#c8c4b6'), 8);
    cyl(0.16, 0.24, 4.6, x, 4.9, z, material('#4c5450'), 6);
    redHead(x, 7.5, z, 0.62);
  }
  // Tail frame: after the second wipe the camera pulls back over the water and
  // the slope lamp above slides out of the left edge. A red lantern on the
  // lower-walk railing takes over the left edge (8-11 % from 7.8 s to 9.6 s),
  // and a downstream channel buoy holds the right edge (87-95 %).
  {
    const z = 105, x = shore(z) - 4.2;
    cyl(0.07, 0.1, 2.5, x, 2.95, z, material('#3e3530'), 6);
    cyl(0.045, 0.055, 0.22, x, 4.42, z, material('#3e3530'), 6);
    redHead(x, 4.15, z, 0.38);
  }
  channelBuoy(-340, -90, 0.62);

  /* ------------------------------------------------------ wipe foregrounds */
  // Built in camera-space metres, then placed relative to the lens every frame.
  const occluders = [];

  function makeRoofWipe() {
    const root = new THREE.Group();
    root.matrixAutoUpdate = false;
    const slabMat = customMaterial({
      map: tex.paving, color: '#c2c7c4', emissive: '#565d5b', emissiveIntensity: 0.9,
    });
    // A rooftop volume close enough to the lens to cover the whole 9:16 frame
    // (1.7 m tall at 1.05 m: +-38 degrees of vertical coverage). It enters from
    // below, so the near face reads as a wet parapet rising past the camera.
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.7, 0.6), slabMat);
    slab.position.set(0, 0.05, 0);
    root.add(slab);
    // Thin parapet rails on the near face keep the sweep legible without
    // turning the peak frame into abstract red beams.
    const redMat = basic({ color: '#b0484a' });
    for (const y of [0.74, 0.60]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.006, 0.006), redMat);
      rail.position.set(0, y, 0.315);
      root.add(rail);
    }
    for (let i = 0; i < 7; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.44, 0.01), redMat);
      post.position.set(-0.6 + i * 0.2, 0.52, 0.315);
      root.add(post);
    }
    // A warm strip along the roof lip carries a little light into the wipe.
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.008, 0.008),
      basic({ color: '#f0b474' }));
    strip.position.set(0, 0.78, 0.32);
    root.add(strip);
    glow.push(strip); noInk.push(strip);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8),
      basic({ color: '#ff7a4d' }));
    lantern.position.set(-0.05, 0.62, 0.33);
    root.add(lantern);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8),
      basic({ color: '#d24a3e', transparent: true, opacity: 0.3, depthWrite: false }));
    halo.position.copy(lantern.position);
    root.add(halo);
    glow.push(lantern, halo);
    root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; noInk.push(o); } });
    group.add(root);
    return root;
  }

  function makeCanopyWipe() {
    const root = new THREE.Group();
    root.matrixAutoUpdate = false;
    const leafTex = texture(256, 256, (c, W, H) => {
      c.fillStyle = '#33452f'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 240; i++) {
        const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * W;
        const y = ((Math.sin(i * 78.233) * 12543.12) % 1 + 1) % 1 * H;
        const r = 5 + (i % 6) * 3.4;
        c.fillStyle = ['#42573a', '#2a3a28', '#4e6344', '#22301f'][i % 4];
        c.globalAlpha = 0.6;
        c.beginPath();
        c.ellipse(x, y, r, r * 0.5, i * 0.7, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    });
    const leaf = customMaterial({
      map: leafTex, color: '#cfe0c4', emissive: '#43543a', emissiveIntensity: 0.85,
    });
    const leafDark = customMaterial({
      map: leafTex, color: '#b3c4a8', emissive: '#36462f', emissiveIntensity: 0.8,
    });
    // Many small crowns instead of a few large ones: the silhouette breaks into
    // leafy scallops, and no surface sits closer than the camera near plane.
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const x = col * 0.31 + (rand() - 0.5) * 0.18;
        const y = row * 0.3 + (rand() - 0.5) * 0.16;
        const z = (rand() - 0.5) * 0.24;
        const r = 0.3 + rand() * 0.16;
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1),
          (row + col) % 2 ? leafDark : leaf);
        b.position.set(x, y, z);
        root.add(b);
      }
    }
    // A lamp behind the bough, seen through the leaves.
    for (const [x, y] of [[-0.34, 0.32], [0.3, -0.24]]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8),
        basic({ color: '#ffb06a' }));
      l.position.set(x, y, 0.36);
      root.add(l);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8),
        basic({ color: '#e08a4c', transparent: true, opacity: 0.22, depthWrite: false }));
      h.position.copy(l.position);
      root.add(h);
      glow.push(l, h);
    }
    // A dark leaf backing sits behind the crowns so the peak frame is fully
    // covered: the scalloped silhouette reads on entry, the backing guarantees
    // no sky leaks through at the moment the wipe crosses the lens.
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.35),
      customMaterial({ map: leafTex, color: '#c8d8bd', emissive: '#42523a', emissiveIntensity: 0.85 }));
    backing.position.set(0, 0, -0.2);
    root.add(backing);
    for (let i = 0; i < 4; i++) {
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.42, 5),
        basic({ color: '#2b241d' }));
      twig.position.set(-0.55 + i * 0.36, -0.62, 0.18);
      twig.rotation.z = -0.6 + i * 0.4;
      root.add(twig);
    }
    root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; noInk.push(o); } });
    group.add(root);
    return root;
  }

  // Both wipes travel straight up through the frame: in from the bottom edge,
  // a fully covered peak, then out through the top. 0.70 s per wipe means
  // roughly 0.35 s entering and 0.35 s leaving, centred on 4.0 s and 7.5 s.
  occluders.push({
    root: makeRoofWipe(),
    start: 0.365, end: 0.435,
    fromY: -1.34, toY: 1.40, x: 0, z: -1.05, rot: 0.12,
  });
  occluders.push({
    root: makeCanopyWipe(),
    start: 0.715, end: 0.785,
    fromY: -1.86, toY: 1.90, x: 0, z: -1.3, rot: -0.10,
  });
  occluders.forEach(o => { o.root.visible = false; });

  const inv = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const euler = new THREE.Euler();

  function update(progress, camera) {
    if (!camera) return;
    for (const c of traffic) {
      c.g.position.x = c.base + Math.sin(progress * Math.PI * 6 + c.phase) * 16 * c.dir;
    }
    group.updateMatrixWorld();
    inv.copy(group.matrixWorld).invert();
    group.updateMatrixWorld();
    for (const o of occluders) {
      if (progress < o.start || progress > o.end) { o.root.visible = false; continue; }
      const u = clamp((progress - o.start) / (o.end - o.start), 0, 1);
      const e = u * u * (3 - 2 * u);
      pos.set(o.x, o.fromY + (o.toY - o.fromY) * e, o.z);
      euler.set(0, 0, o.rot);
      quat.setFromEuler(euler);
      local.compose(pos, quat, scale);
      o.root.matrix.copy(inv).multiply(camera.matrixWorld).multiply(local);
      o.root.matrixWorldNeedsUpdate = true;
      o.root.visible = true;
    }
  }

  return { update, occluders, pavilion, tex };
}
