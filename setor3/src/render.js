// Renderização: tonemapping neutro, ambiente PMREM (galpão), sol entrando pelas aberturas, luminárias de galpão,
// sombras suaves e pós-processamento (GTAO + bloom leve + saída sRGB). ?q=low desliga o pós.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { B } from './layout.js?v=20261003143008';

const Q = new URLSearchParams(location.search);
export const HIGH = Q.get('q') !== 'low' && !/Mobi|Android/i.test(navigator.userAgent);

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !HIGH, powerPreference: 'high-performance', preserveDrawingBuffer: Q.get('shot') === '1' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH ? 1.5 : 1.25));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

export function buildLighting(scene, renderer, lamps) {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .55;
  scene.background = new THREE.Color(0xbfd6ea);
  scene.fog = new THREE.Fog(0xc9d6df, 60, 220);
  const hemi = new THREE.HemisphereLight(0xdfeaf5, 0x6b4630, .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.2); sun.position.set(B.W / 2 + 30, 45, B.D + 40); sun.target.position.set(B.W / 2, 0, B.D / 2);
  sun.castShadow = true; sun.shadow.mapSize.set(HIGH ? 4096 : 2048, HIGH ? 4096 : 2048);
  const c = sun.shadow.camera; c.left = -45; c.right = 45; c.top = 35; c.bottom = -35; c.near = 10; c.far = 160; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  // luminárias: luz pontual em parte delas (custo), emissivo em todas
  lamps.forEach((p, i) => { if (i % 2) return; const l = new THREE.PointLight(0xfff0dc, 38, 22, 1.6); l.position.copy(p); scene.add(l); });
  return { sun, hemi };
}

export function createComposer(renderer, scene, camera) {
  if (!HIGH) return null;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, size.x, size.y); ao.updateGtaoMaterial({ radius: .6, distanceExponent: 1.4, thickness: .4, scale: 1.1, samples: 12 }); ao.blendIntensity = .9; composer.addPass(ao);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x, size.y), .22, .35, 2.4));
  composer.addPass(new OutputPass());
  return composer;
}
