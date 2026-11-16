import * as THREE from 'three';
import { createWorld } from './world.js';
import { createBridgeWorld } from './bridge-world.js';
import { createStage, sampleShot, LOOP } from './engine.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const SCENES = {
  cbd: { name: 'CBD 街角', location: 'CBD · 夷陵大道', title: '熟悉的街角，<br><em>换个角度。</em>', edition: 'VOL. 01', tagline: '让一幅街景，在眼前慢慢展开。' },
  guomao: { name: '国贸广场', location: '国贸 · 东山大道', title: '从一幅画，<br><em>走进这座城。</em>', edition: 'VOL. 02', tagline: '转过街角，看见城市的另一面。' },
  bridge: { name: '夷陵大桥', location: '夷陵长江大桥 · 一江两岸', title: '一桥飞架，<br><em>江城展开。</em>', edition: 'VOL. 03', tagline: '跟着镜头，穿过江上的光。' },
  river: { name: '夷陵江景', location: '夷陵长江大桥 · 江北滨江', title: '一江灯火，<br><em>雨落宜昌。</em>', edition: 'VOL. 04', tagline: '十秒一镜，从城市高处落到湿江岸。' },
};
const initialScene=Object.hasOwn(SCENES,params.get('scene'))?params.get('scene'):'bridge';
const state = {
  sceneId: initialScene,
  night: params.has('mood') ? params.get('mood') === 'night' : (initialScene==='bridge'||initialScene==='river'),
  playing: !reducedMotion,
  progress: 0.03,
  yaw: 0,
  zoom: 1,
  ready: false,
  transitioning: false,
  lastFrame: 0,
  requestId: 0,
  tween: null,
  isScrubbing: false,
  liveTime: 0,
  dirty: true,
};
let stage, world;
const worlds = new Map();
const sceneMoods=new Map([[state.sceneId,state.night]]);
const buildWorld=id=>id==='bridge'?createBridgeWorld():id==='river'?createBridgeWorld({variant:'river'}):createWorld(id);
const loopOf=()=>world?.loop||LOOP;
const canvas = $('gl');
const app = $('app');
const timeline = $('timeline');
const about = $('about-dialog');
let toastTimer, idleTimer, scrubResume = false, oldPlaying = false;
let drag = null, lastUiUpdate = 0, starting = false;
const ease = (v) => v * v * (3 - 2 * v);
const clamp = THREE.MathUtils.clamp;

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2700);
}
function markInteraction() {
  app.classList.add('interacted');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => app.classList.remove('interacted'), 6500);
}
function syncPlaying() {
  $('play-button').setAttribute('aria-pressed', String(state.playing));
  $('play-button').setAttribute('aria-label', state.playing ? '暂停镜头' : '播放镜头');
  $('play-button').title = state.playing ? '暂停镜头' : '播放镜头';
  $('play-button').querySelector('use').setAttribute('href', state.playing ? '#i-pause' : '#i-play');
}
function setPlaying(value) {
  state.playing = Boolean(value);
  state.tween = null;
  state.lastFrame = 0;
  syncPlaying();
}
function syncSceneText() {
  const data = SCENES[state.sceneId];
  const isBridge=state.sceneId==='bridge';
  const isRiver=state.sceneId==='river';
  const isSpan=isBridge||isRiver;
  app.classList.toggle('bridge-scene',isSpan);
  app.classList.toggle('vertical-scene',isRiver);
  $('scene-title').innerHTML = data.title;
  $('scene-location').textContent = data.location;
  $('scene-tagline').textContent = data.tagline;
  $('scene-edition').textContent = data.edition;
  $('scene-caption').textContent = data.name;
  $('gl').setAttribute('aria-label',isRiver?'宜昌夷陵长江大桥北岸滨江的雨夜三维场景，十秒一镜，从城市高处落到湿江岸':isBridge?'夷陵长江大桥与两岸的交互三维场景，可用下方镜头控件探索':'宜昌CBD与国贸的交互式三维插画场景，可用下方镜头控件探索');
  $('night-button').querySelector('span').textContent=isBridge?'夜景':'雨夜';
  $('night-button').setAttribute('aria-label',isBridge?'蓝调夜景':'雨夜');
  document.querySelector('[data-view="deep"] span').textContent=isRiver?'江岸':isBridge?'推镜':'入景';
  document.querySelector('[data-view="deep"]').setAttribute('aria-label',isRiver?'落到滨江步道的人眼高度':'展开立体街景');
  document.querySelector('[data-view="deep"]').title=isRiver?'落到江岸':isBridge?'沿桥推镜':'展开立体街景';
  document.querySelector('[data-view="corner"] span').textContent=isRiver?'收束':isBridge?'全桥':'转角';
  document.querySelector('[data-view="corner"]').setAttribute('aria-label',isRiver?'回到城市高处收束':'从街角侧看');
  document.querySelector('[data-view="corner"]').title=isRiver?'回到城市高处':'从街角侧看';
  $('explore-hint').lastElementChild.textContent=isRiver?'十秒一镜 · 雨夜江岸':isBridge?'左右拖动 · 看一江两岸':'左右拖动 · 探索街角';
  $('timeline-description').innerHTML=isRiver
    ?'城市高处<span class="timeline-arrow">→</span>湿江岸'
    :`一幅画<span class="timeline-arrow">→</span>${isBridge?'一江景':'一条街'}`;
  const stops=isRiver?['城市定场','落到江岸','桥塔竖构图','雨夜收束']
    :isBridge?['平面定场','沿桥推镜','两岸展开','回到画中']
    :state.sceneId==='guomao'?['高位定场','走入街面','穿过门廊','仰望塔冠']
    :['长焦压平','空间展开','转角发现','回到画中'];
  document.querySelectorAll('.timeline-stops span').forEach((s,i)=>s.textContent=stops[i]);
  $('unfold-button').querySelector('span').textContent=isRiver?'落到江岸':isBridge?'推入江景':'展开街景';
  $('frame-mode').textContent=isRiver?'YILING RIVER · 9:16':isBridge?'RIVER IN PERSPECTIVE':'ILLUSTRATED CITY';
  $('total-time').textContent=isRiver?'00:10':'00:24';
  $('export-button').hidden=!isRiver;
  document.querySelectorAll('.scene-tab').forEach((button) => {
    const active = button.dataset.scene === state.sceneId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set('scene', state.sceneId);
  url.searchParams.set('mood',state.night?'night':'day');
  history.replaceState(null, '', url);
}
function setNight(value, notify = false) {
  state.night = Boolean(value);
  sceneMoods.set(state.sceneId,state.night);
  app.classList.toggle('night', state.night);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', state.night ? (state.sceneId==='bridge'?'#11182d':state.sceneId==='river'?'#0c1224':'#18363d') : '#f5f2e9');
  $('day-button').classList.toggle('active', !state.night);
  $('night-button').classList.toggle('active', state.night);
  $('day-button').setAttribute('aria-pressed', String(!state.night));
  $('night-button').setAttribute('aria-pressed', String(state.night));
  world?.setNight?.(state.night);
  stage?.setNight(state.night);
  state.dirty = true;
  updateUrl();
  if (notify) toast(state.sceneId==='river'
    ? (state.night?'雨落江面，桥塔与滨江灯火一起倒映。':'白昼的江面，三塔横过北岸。')
    : state.sceneId==='bridge'
    ? (state.night?'桥灯亮起，江城倒映在水中。':'日光下，白塔连接一江两岸。')
    : (state.night ? '街灯亮起，雨夜里的宜昌。' : '日光落在熟悉的街角。'));
}
function updateUi(now, force = false) {
  if (!force && now - lastUiUpdate < 90) return;
  lastUiUpdate = now;
  timeline.value = String(Math.round(state.progress * 1000));
  timeline.style.setProperty('--progress', `${state.progress * 100}%`);
  const loop = loopOf(), total = Math.round(loop / 1000);
  const seconds = Math.min(Math.floor(state.progress * loop / 1000), total);
  $('current-time').textContent = `00:${String(seconds).padStart(2, '0')}`;
  timeline.setAttribute('aria-valuetext', `${seconds}秒，共${total}秒`);
  const shot = sampleShot(state.progress, world?.focus);
  app.classList.toggle('camera-running', state.playing && state.progress > 0.13 && state.progress < 0.93);
  const active = shot.view || (Math.abs(shot.yaw) > 10 || Math.abs(state.yaw) > 10 ? 'corner' : shot.fov > 13 ? 'deep' : 'flat');
  const labels = state.sceneId==='river'?{flat:'城市定场',deep:'湿江岸',corner:'回到城市'}:state.sceneId==='bridge'?{flat:'长焦成画',deep:'沿桥推镜',corner:'两岸展开'}:{ flat: '长焦成画', deep: '空间展开', corner: '转角发现' };
  $('shot-label').textContent = labels[active];
  document.querySelectorAll('.view-button[data-view]').forEach((button) => {
    const on = button.dataset.view === active;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  });
}
function currentShot() {
  const shot = sampleShot(state.progress, world.focus);
  const yawLimit=shot.maxYaw??32;
  shot.yaw = (shot.yaw || 0) + clamp(state.yaw,-yawLimit,yawLimit);
  if (shot.free) shot.fov = clamp(shot.fov * state.zoom, 18, 110);
  else shot.W *= state.zoom;
  return shot;
}
function frame(now) {
  state.requestId = requestAnimationFrame(frame);
  if (!state.ready || document.hidden || state.transitioning) { state.lastFrame = now; return; }
  const dt = state.lastFrame ? Math.min(now - state.lastFrame, 70) : 0;
  state.lastFrame = now;
  state.liveTime += dt;
  const mustRender = state.playing || Boolean(state.tween) || state.dirty;
  if (state.tween) {
    const t = clamp((now - state.tween.start) / state.tween.duration, 0, 1);
    state.progress = THREE.MathUtils.lerp(state.tween.from, state.tween.to, ease(t));
    if (t >= 1) state.tween = null;
  } else if (state.playing && !state.isScrubbing && !about.open) {
    state.progress = (state.progress + dt / loopOf()) % 1;
  }
  // Keep an exact relationship between time, scene animation and the camera for reproducible frames.
  if (mustRender) {
    stage.render(currentShot(), state.progress * loopOf());
    state.dirty = false;
  }
  updateUi(now);
}
function resize() {
  if (!stage) return;
  const rect = canvas.getBoundingClientRect();
  const fallback = $('viewport').getBoundingClientRect();
  stage.resize(rect.width || fallback.width, rect.height || fallback.height);
  state.dirty = true;
  state.lastFrame = 0;
}
function seek(progress) {
  state.progress = clamp(progress, 0, 0.9999);
  state.tween = null;
  state.yaw = 0;
  state.zoom = 1;
  state.dirty = true;
  updateUi(performance.now(), true);
}
function view(name) {
  if (!state.ready) return;
  const target = state.sceneId === 'guomao'
    ? { flat: 0.02, deep: 0.34, corner: 0.9 }[name]
    : state.sceneId === 'river'
    ? { flat: 0, deep: 0.55, corner: 0.94 }[name]
    : { flat: 0.03, deep: 0.25, corner: 0.47 }[name];
  setPlaying(false);
  state.yaw = 0;
  state.zoom = 1;
  const duration = reducedMotion ? 1 : 1700;
  state.tween = { from: state.progress, to: target, start: performance.now(), duration };
  markInteraction();
}
async function switchScene(id) {
  if (!SCENES[id] || id === state.sceneId || state.transitioning || !state.ready) return;
  state.transitioning = true;
  state.tween = null;
  $('transition-text').textContent = SCENES[id].name;
  $('scene-transition').classList.add('show');
  await new Promise((resolve) => setTimeout(resolve, reducedMotion ? 0 : 320));
  const previousId = state.sceneId, previousWorld = world, previousNight=state.night;
  let nextWorld;
  try {
    nextWorld = buildWorld(id);
    await nextWorld.ready;
    state.sceneId = id;
    world = nextWorld;
    stage.setWorld(world);
    state.progress = 0.03;
    state.yaw = 0;
    state.zoom = 1;
    state.lastFrame = 0;
    syncSceneText();
    setNight(sceneMoods.get(id)??(id==='bridge'||id==='river'));
    stage.render(currentShot(), state.progress * loopOf());
    worlds.clear();
    worlds.set(id, world);
    previousWorld?.dispose?.();
    updateUi(performance.now(), true);
    app.classList.remove('interacted', 'immersive');
    if (!reducedMotion) setPlaying(true);
    updateUrl();
  } catch (error) {
    state.sceneId = previousId;
    world = previousWorld;
    stage.setWorld(world);
    if (nextWorld && nextWorld !== previousWorld) nextWorld.dispose();
    syncSceneText();
    setNight(previousNight);
    state.dirty = true;
    console.error('Scene loading failed', error);
    toast('这个场景加载遇到问题，请重试。');
  } finally {
    state.transitioning = false;
    $('scene-transition').classList.remove('show');
  }
}
function openAbout() {
  oldPlaying = state.playing;
  setPlaying(false);
  about.showModal();
}
function closeAbout() {
  if (!about.open) return;
  about.close();
}
async function capture() {
  if (!state.ready) return;
  $('capture-button').disabled = true;
  try {
    stage.render(currentShot(), state.progress * loopOf());
    const data = stage.snapshot();
    if (!data || data === 'data:,') throw new Error('Empty screenshot');
    const link = document.createElement('a');
    link.download = `宜昌-${SCENES[state.sceneId].name}-${state.night ? (state.sceneId==='bridge'?'夜景':'雨夜') : '日光'}.png`;
    link.href = data;
    document.body.append(link);
    link.click();
    link.remove();
    toast('已生成当前画面，正在保存。');
  } catch (error) {
    console.error('Capture failed', error);
    toast('当前浏览器无法保存画面，请使用系统截图。');
  } finally { $('capture-button').disabled = false; }
}
/* 9:16 delivery frame: render the preset at exactly 1080 x 1920, independent
   of the on-screen viewport, then restore the interactive sizing. */
async function exportVertical() {
  if (!state.ready || state.sceneId !== 'river') return;
  const button = $('export-button');
  const wasPlaying = state.playing;
  button.disabled = true;
  setPlaying(false);
  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    stage.resize(1080, 1920, true);
    stage.render(currentShot(), state.progress * loopOf());
    const data = stage.snapshot();
    if (!data || data === 'data:,') throw new Error('Empty export frame');
    const link = document.createElement('a');
    link.download = `宜昌-夷陵江景-9x16-${String(Math.round(state.progress * 1000)).padStart(4, '0')}.png`;
    link.href = data;
    document.body.append(link);
    link.click();
    link.remove();
    toast('已导出 1080×1920 竖屏静帧。');
  } catch (error) {
    console.error('Vertical export failed', error);
    toast('当前浏览器无法导出竖屏画面，请使用系统截图。');
  } finally {
    resize();
    if (wasPlaying) setPlaying(true);
    state.dirty = true;
    button.disabled = false;
  }
}

document.querySelectorAll('[data-scene]').forEach((button) => button.addEventListener('click', () => switchScene(button.dataset.scene)));
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => view(button.dataset.view)));
$('day-button').addEventListener('click', () => setNight(false, true));
$('night-button').addEventListener('click', () => setNight(true, true));
$('play-button').addEventListener('click', () => { setPlaying(!state.playing); markInteraction(); });
$('replay-button').addEventListener('click', () => { seek(0); setPlaying(true); app.classList.remove('interacted', 'immersive'); });
$('unfold-button').addEventListener('click', () => { view('deep'); app.classList.add('immersive'); });
$('capture-button').addEventListener('click', capture);
$('export-button').addEventListener('click', exportVertical);
$('about-button').addEventListener('click', openAbout);
$('details-button').addEventListener('click', openAbout);
$('close-about').addEventListener('click', closeAbout);
about.addEventListener('close', () => { setPlaying(oldPlaying); });
about.addEventListener('click', (event) => { if (event.target === about) { const b = about.getBoundingClientRect(); if(event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) closeAbout(); } });
$('retry-button').addEventListener('click', () => location.reload());
$('fullscreen-button').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (app.requestFullscreen) await app.requestFullscreen();
    else toast('请使用浏览器的全屏功能。');
  } catch { toast('请使用浏览器的全屏功能。'); }
});
document.addEventListener('fullscreenchange', resize);
timeline.addEventListener('pointerdown', () => { state.isScrubbing = true; scrubResume = state.playing; setPlaying(false); markInteraction(); });
timeline.addEventListener('input', () => { setPlaying(false); seek(Number(timeline.value) / 1000); markInteraction(); });
timeline.addEventListener('change', () => { state.isScrubbing = false; setPlaying(false); });
timeline.addEventListener('pointerup', () => { state.isScrubbing = false; });
timeline.addEventListener('pointercancel', () => { state.isScrubbing = false; });

canvas.addEventListener('pointerdown', (event) => {
  if (!state.ready || state.transitioning) return;
  drag = { x: event.clientX, y: event.clientY, yaw: state.yaw, moved: false, pointerId: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.x;
  if (Math.abs(dx) > 4) { drag.moved = true; setPlaying(false); markInteraction(); }
  if (drag.moved) {
    const maxYaw=state.sceneId==='river'?0:state.sceneId==='bridge'?(sampleShot(state.progress,world.focus).maxYaw??14):32;
    state.yaw = clamp(drag.yaw - dx / Math.max(320, canvas.clientWidth) * 65, -maxYaw, maxYaw);
    state.dirty = true;
    updateUi(performance.now(), true);
  }
});
function endDrag(event) {
  if (drag && event.pointerId === drag.pointerId) {
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drag = null;
  }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (event) => {
  if (!state.ready) return;
  event.preventDefault();
  state.zoom = clamp(state.zoom * Math.exp(event.deltaY * 0.00045), 0.8, 1.2);
  state.dirty = true;
  setPlaying(false);
  markInteraction();
}, { passive: false });
window.addEventListener('keydown', (event) => {
  if (!state.ready || about.open || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(document.activeElement?.tagName || '')) return;
  if (event.code === 'Space') { event.preventDefault(); setPlaying(!state.playing); }
  if (event.code === 'ArrowRight') { event.preventDefault(); setPlaying(false); seek(state.progress + 0.025); markInteraction(); }
  if (event.code === 'ArrowLeft') { event.preventDefault(); setPlaying(false); seek(state.progress - 0.025); markInteraction(); }
  if (event.code === 'Home') { event.preventDefault(); setPlaying(false); seek(0.03); }
});
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { state.lastFrame = 0; });
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  state.ready = false;
  $('error-message').textContent = '图形连接暂时中断。请重新加载，恢复街景。';
  $('error-screen').hidden = false;
});
canvas.addEventListener('webglcontextrestored', () => location.reload());

// Deterministic frame hooks preserve the source skill's reproducible camera timeline.
window.render = (ms) => {
  if (!stage || !world) return;
  setPlaying(false);
  const loop = loopOf();
  state.progress = (((ms % loop) + loop) % loop) / loop;
  stage.render(currentShot(), state.progress * loop);
  updateUi(performance.now(), true);
};
window.probe = (ms) => {
  window.render(ms);
  return [[-15, 0, 0], [15, 0, -30], [0, 30, -30], [0, 0, -80]].map((point) => {
    const p = new THREE.Vector3(...point).project(stage.camera);
    return [(p.x * 0.5 + 0.5) * canvas.width, (0.5 - p.y * 0.5) * canvas.height];
  });
};

async function start() {
  if (starting) return;
  starting = true;
  try {
    syncSceneText();
    await document.fonts.load('700 32px "Scene Sans"');
    await document.fonts.ready;
    world = buildWorld(state.sceneId);
    await world.ready;
    worlds.set(state.sceneId, world);
    stage = createStage(canvas);
    stage.setWorld(world);
    resize();
    setNight(state.night);
    stage.render(currentShot(), state.progress * loopOf());
    state.ready = true;
    state.lastFrame = 0;
    window.READY = true;
    $('loading-screen').classList.add('hidden');
    setTimeout(() => { $('loading-screen').hidden = true; }, 800);
    syncPlaying();
    updateUi(performance.now(), true);
    requestAnimationFrame(frame);
    // Explicitly exposed read-only diagnostics help assess scene load without adding product clutter.
    Object.defineProperty(window, 'sceneDiagnostics', { get: () => ({ scene: state.sceneId, night: state.night, progress: state.progress, playing: state.playing, ready: state.ready, renderer: stage.getInfo?.() }) });
  } catch (error) {
    console.error('Unable to start Yichang street experience', error);
    $('loading-screen').hidden = true;
    $('error-screen').hidden = false;
    if (String(error).includes('font')) $('error-message').textContent = '场景字体加载失败，请刷新页面后再试。';
    else if (!window.WebGLRenderingContext) $('error-message').textContent = '这个浏览器未提供 WebGL。请使用新版 Chrome、Edge 或 Safari。';
    else $('error-message').textContent = '场景加载遇到问题，请刷新重试，并确认浏览器已开启硬件加速。';
  }
}
start();
