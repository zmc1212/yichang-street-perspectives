# 宜昌 · 街角幻境

Native Site: `appgprj_6af354b7ee708191aadbc66a68259d30`

An interactive, illustrated study of Yichang CBD and Guomao, based on the
Simcraft `perspective-illusion` technique. The street scenes are original
procedural geometry informed by public photographs. Building dimensions,
street relationships, and ancillary shops are artistic approximations.

## Experience

- Two separate landmark scenes: CBD shopping centre / Tieluba-inspired side
  street, and Guomao shopping complex / square edge.
- A continuous 24-second camera performance: telephoto flat view, dolly zoom,
  corner reveals, and a seamless return.
- Flat / deep / corner presets, timeline scrubbing, horizontal dragging,
  restrained zoom, pause and replay.
- Day and rainy-night illumination, Chinese signage, animated pedestrians,
  storefronts, road furniture, and rain.
- Save the current rendered scene as PNG; responsive controls and keyboard
  access; reduced-motion users start with a paused scene.

## Files

- `dist/js/world.js`: original procedural scenes and Canvas textures.
- `dist/js/camera.js`: level camera, lens shift, monotone timeline, framing.
- `dist/js/engine.js`: four-pass illustration renderer and lighting.
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
- Guomao: https://www.cn3x.com.cn/article/202510/02/c806699.html
- Square and Tieluba: https://www.cn3x.com.cn/article/202506/27/c763439.html
- Simcraft: https://github.com/dotslashsimran/simcraft/tree/main/skills/video/perspective-illusion

No source photographs are embedded in the live scene. Additional shop brands
are fictional. Text is drawn with a locally bundled subset of Noto Sans CJK.
Keep the supplied third-party license files in `dist/assets`.

## Validation and limitations

Both real scene graphs and the full camera trajectory have been checked on
the CPU. Offline renders inspect actual geometry, signage and projected
landmark framing. The managed cloud browser reported WebGL disabled, so its
GPU shading, actual frame rate and interactive scene rendering could not be
visually certified in that environment. Offline composition renders are not
screenshots of the live site's ink shader.

The live site requires WebGL 2. This is a stylized composition rather than a
surveyed geographic twin. Simcraft's original offline video renderer has
been adapted for an interactive browser budget; this project does not claim
to export a final offline-rendered video.
