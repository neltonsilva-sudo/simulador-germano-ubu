// Orquestrador: cena, câmera (órbita / caminhar por nível), vistas das fotos, etiquetas dos equipamentos e painel de informação.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { B, LV, CAMS } from './layout.js?v=20261003134415';
import { createRenderer, buildLighting, createComposer } from './render.js?v=20261003134415';
import { buildSetor3, sim, stepSim } from './lib.js?v=20261003134415';
import { buildUI } from './ui.js?v=20261003134415';
import { gate } from './gate.js?v=20261003134415';
gate();

const Q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .05, 600);
const S3 = buildSetor3(); scene.add(S3.group); const parts = S3.parts; console.log('setor3: malhas fundidas', S3.stats);
buildLighting(scene, renderer, S3.lamps);
const composer = createComposer(renderer, scene, camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08; controls.maxDistance = 160; controls.minDistance = .5;

let tween = null;
const keys = {}; let walk = false, level = 0;
function setCam(name, instant) {
  const c = typeof name === 'object' ? name : CAMS[name]; if (!c) return;
  const to = { p: new THREE.Vector3(...c.pos), t: new THREE.Vector3(...c.look), fov: c.fov };
  if (walk && name === 'geral') setWalk(false);
  if (instant) { camera.position.copy(to.p); controls.target.copy(to.t); camera.fov = to.fov; camera.updateProjectionMatrix(); return; }
  tween = { k: 0, p0: camera.position.clone(), t0: controls.target.clone(), f0: camera.fov, to };
}
setCam(Q.get('cam') || 'cctv', true);

// caminhar: WASD/setas + arrastar para olhar; altura dos olhos 1,65 m sobre o nível escolhido
addEventListener('keydown', (e) => { keys[e.code] = true; }); addEventListener('keyup', (e) => { keys[e.code] = false; });
const LEVELS = [LV.L0, LV.L1, LV.L2];
function walkStep(dt, joy) {
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + (joy ? joy.f : 0);
  const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + (joy ? joy.s : 0);
  if (!f && !s) return;
  const dir = new THREE.Vector3().subVectors(controls.target, camera.position); dir.y = 0; dir.normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const mv = dir.multiplyScalar(f).add(side.multiplyScalar(s)).multiplyScalar(2.2 * dt * (keys.ShiftLeft ? 2.2 : 1));
  const np = camera.position.clone().add(mv); np.x = THREE.MathUtils.clamp(np.x, .5, B.W - .5); np.z = THREE.MathUtils.clamp(np.z, .5, B.D - .5);
  mv.subVectors(np, camera.position); camera.position.add(mv); controls.target.add(mv);
}
function setWalk(on, lv) {
  walk = on; if (lv != null) level = lv;
  if (on) {
    const d = new THREE.Vector3().subVectors(controls.target, camera.position); d.y = 0; if (d.lengthSq() < 1e-4) d.set(0, 0, -1); d.setLength(.6);
    if (camera.position.x < .5 || camera.position.x > B.W - .5 || camera.position.z < .5 || camera.position.z > B.D - .5) camera.position.set(6, 0, 22);
    camera.position.y = LEVELS[level] + 1.65; controls.target.copy(camera.position).add(d); controls.target.y = camera.position.y - .1;
    controls.minDistance = controls.maxDistance = .6; controls.enablePan = false; controls.rotateSpeed = -.35;
  } else { controls.minDistance = .5; controls.maxDistance = 160; controls.enablePan = true; controls.rotateSpeed = 1; }
}
const hotspots = S3.hotspots;
stepSim(0);
const ui = Q.get('ui') === '0' ? null : buildUI({ camera, controls, canvas, hotspots, setCam, setWalk, pick: S3.pick, pickRoot: S3.group, getWalk: () => ({ walk, level }), CAMS, sim, flowLabels: parts.flows.labels || [] });

function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); composer && composer.setSize(innerWidth, innerHeight); }
addEventListener('resize', resize); resize();

const clock = new THREE.Clock(); let frames = 0, acc = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  if (tween) { tween.k = Math.min(1, tween.k + dt / 1.4); const e = tween.k * tween.k * (3 - 2 * tween.k);
    camera.position.lerpVectors(tween.p0, tween.to.p, e); controls.target.lerpVectors(tween.t0, tween.to.t, e); camera.fov = THREE.MathUtils.lerp(tween.f0, tween.to.fov, e); camera.updateProjectionMatrix(); if (tween.k >= 1) tween = null; }
  if (walk) walkStep(dt, ui && ui.joy);
  controls.update();
  stepSim(dt);
  S3.update(dt, t, camera);
  ui && ui.update();
  if (composer) composer.render(dt); else renderer.render(scene, camera);
  frames++; acc += dt; if (acc > 1) { window.__fps = Math.round(frames / acc); frames = 0; acc = 0; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__twin = { scene, camera, controls, renderer, composer, parts, setCam, setWalk, sim };
window.__ready = true;
