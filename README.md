# 宜昌 · 街角幻境

Native Site: `appgprj_6af354b7ee708191aadbc66a68259d30`

An interactive, illustrated study of Yichang CBD, Guomao and Yiling Yangtze
Bridge, based on the Simcraft `perspective-illusion` technique. The original
procedural models use public photographs for visual reference. Building
dimensions, local streets and shore details are artistic approximations.

## Experience

- Three separate landmark scenes: CBD shopping centre / Tieluba-inspired side
  street, Guomao shopping complex / square edge, and Yiling Yangtze Bridge
  with a city waterfront and wooded opposite bank. The bridge opens by default.
- A continuous 24-second camera performance: telephoto flat view, dolly zoom,
  corner reveals, and a seamless return.
- Flat / deep / corner presets for streets, and flat / along-bridge / whole
  bridge presets for the river. Timeline scrubbing, horizontal dragging,
  restrained zoom, pause and replay remain available in all scenes.
- Day and rainy-night illumination, Chinese signage, animated pedestrians,
  storefronts, road furniture, and rain.
- The bridge instead uses clear blue-hour night lighting, a violet sky,
  warm gold bridge lights, reflected towers and city lights, boats and traffic.
  A daylight view retains its ivory towers, pale stays and red railings.
- Save the current rendered scene as PNG; responsive controls and keyboard
  access; reduced-motion users start with a paused scene.

## Files

- `dist/js/world.js`: original procedural scenes and Canvas textures.
- `dist/js/landmarks/cbd.js`: photograph-informed CBD facade and curved stairs.
- `dist/js/landmarks/guomao.js`: Guomao tower, rounded podium and LED crown.
- `dist/js/camera.js`: level camera, lens shift, monotone timeline, framing.
- `dist/js/bridge-world.js`: bridge scene integration, material batching and traffic.
- `dist/js/bridge-structure.js`: curved Y pylons, stays, piers, deck and approaches.
- `dist/js/bridge-context.js`: wooded terrain, city blocks, riverfront and docks.
- `dist/js/bridge-camera.js`: near-pylon dolly zoom and whole-bridge trajectory.
- `dist/js/engine.js`: four scene passes and a final illustration composite;
  the bridge adds a lower-resolution planar reflection pass, ripple distortion
  and softer ink.
- `dist/js/main.js`: interaction, scene lifecycle and deterministic timing.
- `dist/style.css`, `dist/index.html`: UI and responsive composition.
- `dist/vendor`: pinned local Three.js 0.170.0 and geometry utilities.
- `.openai/hosting.json`: canonical Site identity and static deployment root.

This is a buildless static site; all runtime dependencies are local. Run
`npm install` only to restore development dependencies. `npm run check`
validates the JavaScript modules. In the managed environment, preview with
`sites-preview start /workspace/sites/yichang-street-perspectives`.

## Visual references

- CBD: https://www.yichangly.com/shopping/CBD.html
- CBD street-level historical photographs from a tenant: https://www.sohu.com/a/335644860_100016441
- Guomao: https://www.cn3x.com.cn/article/202510/02/c806699.html
- Guomao construction report and structural photograph: https://www.baoyehb.com/webFrontNews/show?id=2757f712-816e-47c1-a275-bc5ac95ea1ec
- Square and Tieluba: https://www.cn3x.com.cn/article/202506/27/c763439.html
- Simcraft: https://github.com/dotslashsimran/simcraft/tree/main/skills/video/perspective-illusion
- Yiling bridge engineering specification: https://www.hbbidcloud.cn/shengbenji/jyxx/004001/004001003/20240716/19fe53bc-3d2a-4920-8662-e325de050014.html
- China Railway reopening report / axial photograph: https://www.crec.cn/web/xwzx61/gsyw87/2025021110072140049/index.html
- Yiling bridge aerial photograph: https://yc.cnhubei.com/content/2022-09/17/content_15071790.html
- Riverfront park photograph: https://news.hubeidaily.net/mobile/c_1613460.html
- Bridge cross section and cable quantities: https://hbtba.com/pro/pro.php?id=8eafc757-cda9-4de2-9a1c-762ca838bcc0
- Moji Mountain official landscape photographs: https://ylj.yichang.gov.cn/content-43955-959914-1.html
- Moji Mountain park and topography: https://ylj.yichang.gov.cn/content-43959-653490-1.html
- North approach and urban fabric, July 2026: https://www.cn3x.com.cn/article/202607/04/c925430.html
- Hotel / Wanda / visitor-centre relationship: https://www.ihg.com/crowneplaza/hotels/cn/zh/yichang/yihry/hoteldetail
- User-supplied motion / style reference, also supplied as a 10-second MP4:
  https://www.douyin.com/video/7706192304943687146

No source photographs are embedded in the live scene. Recognizable signage
is based on the dated references above; ancillary shops include fictional
brands. This is not a current business directory. Text is drawn with a locally
bundled subset of Noto Sans CJK.
Keep the supplied third-party license files in `dist/assets`.

## Bridge revision

The main bridge follows the documented 936 m layout (120 + 348 + 348 + 120 m),
23 m deck and three towers with one central cable plane. Geometry includes
236 paired stays, four traffic lanes, white inverted-Y pylons, red railings,
bridgehead name walls, approach roads, a layered city promenade and wooded
hills on the opposite shore. Model dimensions are authored in metres, then
the complete scene is uniformly scaled by 0.35. Tower tops, deck height and
surrounding buildings use photographic proportions, not survey elevations.
The landscape is composed around the views and is not an exact GIS model.

The supplied bridge clip informs the indigo/violet sky, gold illumination,
soft glow, reflected river light and repeated perspective changes. The camera
first fits the near Yiling pylon, holds its projected height during a 2-degree
telephoto to wide-angle dolly, and reveals the smaller distant towers. A
separate high-angle whole-bridge view shows all three pylons and both shores.
This is a 24-second interactive adaptation, not a frame-by-frame copy of the
10-second reference. Yiling retains its own tower silhouette and banks;
the reference video's other cities' landmarks are not transplanted here.

The river uses a mirrored camera with oblique water-plane clipping based on
Three.js r170 Reflector (MIT). It renders the actual towers and surroundings
at 65% of the drawing buffer dimensions and adds restrained periodic ripples.
It does not depend on an externally hosted image, map tile, video or model.

## Bridge model reconstruction, version 4

This revision addresses the scene's identity and physical construction. The
bridge now has a continuously curved Y silhouette, longer lower forks and a
shorter upper stem, tapered thickness, blue-grey recessed channels, white lips,
and a notched crown. Its footings are elongated chamfered forms with red-brown
waterline collars. Side-span auxiliary piers are present. Cable sleeves and
anchors, four-lane markings, directional arrows, sidewalk paving and curved
lamp arms remain visible in the close bridge-axis view. The red double rails
line the carriageway, with dense silver-grey pedestrian balustrades outside
the sidewalks. The approach roads carry the same surface and detail layers.

The opposite bank now keeps the steep, continuous Moji Mountain landform.
The previous broad camera-clearance lowland has been removed: only the bridge
road cut and the narrow road valley shape the terrain. Overlapping, varied
tree crowns form a continuous forest. The city bank uses manually grouped
residential slabs, low commercial podiums, older courtyard blocks and a varied
second-line skyline. The downstream waterfront includes a broad Wanda mass,
the hotel volume, passenger-service buildings, gangways, floating docks and
six moored tourist vessels. Stepped embankments, promenade furniture and local
streets connect the buildings to the water.

These are original three-dimensional models informed by photographs. Main
spans, deck width and cable count follow the cited engineering documents;
the tower elevations, building footprints and local road alignments are
photographic estimates. The official 217 m Moji summit figure is an altitude
above sea level, not a height above the modeled river. No surveyed GIS data
or externally hosted 3D model is presented as part of this reconstruction.

The camera was moved to respect the restored hills. The road-axis view moves
into the main span and frames the middle tower with a 90-degree horizontal
lens; even the tested widest viewport and zoom-out limit stay inside the
bank tower. Dragging is narrower there and broader in the whole-bridge view.
The original perspective illusion, day/night choice and other landmark scenes
remain.

## Landmark reconstruction revision

The second revision replaces the generic commercial blocks with separate
landmark models. CBD is a low, broad bronze-panelled building with a recessed
double-height entrance, enclosed curved glass stairwells, fine vertical fins,
and transparent-backed orange-red lettering. Guomao has a slender tower on
the right behind a broad, rounded and stepped podium, continuous blue glass,
fine metal mullions and a cyan/green dotted LED crown. Nearby architecture is
varied older residential and low commercial frontage; the square edge remains
open instead of being enclosed by repeated generic glass towers.

The builder's 2018 report gives the Guomao phase-three project a total height
of 120 metres. Scene units and all remaining dimensions are scaled estimates
for the composition, not surveyed measurements. The rendered facade follows
completed-building photographs; unbuilt renderings are not treated as proof
of the current exterior.

## Validation and limitations

The real scene graphs and camera trajectories have been checked on
the CPU. Offline renders inspect actual geometry, signage and projected
landmark framing. The managed cloud browser reported WebGL disabled, so its
GPU shading, actual frame rate and interactive scene rendering could not be
visually certified in that environment. Offline composition renders are not
screenshots of the live site's ink shader.

For the street revision, all 24 seconds were sampled at 241 time points across
desktop, wide and mobile aspects, with three drag offsets and three zoom
levels (13,014 placements across both scenes). Landmark camera collisions,
near/far clipping and default-view cropping were all absent. Day/night
material transitions, finite geometry and Chinese font coverage were checked.
Static geometry is batched without mixed-index warnings; estimated texture
storage including mipmaps is about 33 MiB per scene. These are CPU checks and
memory estimates, not measured browser frame-rate claims.

For the version 4 bridge model, an initial 81 preset/aspect/allowed-drag/zoom
combinations and 123 default-loop samples checked the restored terrain. Visual
review then exposed sparse forest cover, empty city fabric and an undesirable
approach-road viewpoint. Those were rebuilt. The final camera was checked at
27 axis/aspect/allowed-drag/zoom combinations and 30 anchor-transition samples:
none entered terrain or a solid object, and no sampled pylon top or body was
hidden. The furthest tested axial camera is about 318.4 m from the middle
tower, inside the bank tower at 348 m. Foundations naturally fall behind the
deck or riverbank in some views.

Daylight CPU Blender renders use the site's actual meshes and camera
projection, including an identical-camera comparison with version 3. The
comparison and final bridge-axis view are in `docs/previews/`. These renders
inspect geometry and composition, not the live ink shader, GPU performance
or exact WebGL lighting.

The live site requires WebGL 2. This is a stylized composition rather than a
surveyed geographic twin. Simcraft's original offline video renderer has
been adapted for an interactive browser budget; this project does not claim
to export a final offline-rendered video.
