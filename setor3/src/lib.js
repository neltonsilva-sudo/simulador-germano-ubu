// Montagem completa do setor 3 num grupo (usada pelo gêmeo imersivo e pelo simulador, que a embute em escala reduzida).
import * as THREE from 'three';
import { buildMaterials } from './mats.js?v=20261008184715';
import { buildBuilding } from './building.js?v=20261008184715';
import { buildScreens } from './screens.js?v=20261008184715';
import { buildCrushers } from './crushers.js?v=20261008184715';
import { buildFlows } from './flows.js?v=20261008184715';
import { mergeStatic } from './merge.js?v=20261008184715';
import { sim, stepSim } from './sim.js?v=20261008184715';

export function buildSetor3(opt = {}) {
  const root = new THREE.Group(); root.name = 'setor3';
  const M = buildMaterials(opt);
  const parts = {};
  for (const [k, fn] of Object.entries({ building: buildBuilding, screens: buildScreens, crushers: buildCrushers, flows: buildFlows })) {
    try { parts[k] = fn(root, M, opt) || {}; } catch (e) { console.error('setor3: falha ao montar', k, e); parts[k] = {}; }
  }
  const pick = [parts.screens, parts.crushers].flatMap((p) => p.pick || []);
  const stats = opt.merge === false ? null : mergeStatic(root);
  // normais nulas (triângulos degenerados) viram NaN no shader e o bloom espalha blocos pretos: troca por (0, 1, 0)
  root.traverse((o) => { const n = o.geometry && o.geometry.attributes && o.geometry.attributes.normal; if (!n) return; const A = n.array; let fx = 0;
    for (let i = 0; i < A.length; i += 3) { const l = A[i] * A[i] + A[i + 1] * A[i + 1] + A[i + 2] * A[i + 2]; if (!(l > 1e-10)) { A[i] = 0; A[i + 1] = 1; A[i + 2] = 0; fx++; } }
    if (fx) n.needsUpdate = true; });
  const hotspots = [parts.screens, parts.crushers].flatMap((p) => p.hotspots || []);
  return {
    group: root, M, parts, sim, stepSim, hotspots, pick, labels: (parts.flows && parts.flows.labels) || [], lamps: (parts.building && parts.building.lamps) || [], stats,
    update(dt, t, cam) { for (const p of Object.values(parts)) p.update && p.update(dt, t, sim, cam); },
  };
}
export { sim, stepSim };
