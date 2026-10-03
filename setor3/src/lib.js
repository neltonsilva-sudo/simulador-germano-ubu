// Montagem completa do setor 3 num grupo (usada pelo gêmeo imersivo e pelo simulador, que a embute em escala reduzida).
import * as THREE from 'three';
import { buildMaterials } from './mats.js?v=20261003175719';
import { buildBuilding } from './building.js?v=20261003175719';
import { buildScreens } from './screens.js?v=20261003175719';
import { buildCrushers } from './crushers.js?v=20261003175719';
import { buildFlows } from './flows.js?v=20261003175719';
import { mergeStatic } from './merge.js?v=20261003175719';
import { sim, stepSim } from './sim.js?v=20261003175719';

export function buildSetor3(opt = {}) {
  const root = new THREE.Group(); root.name = 'setor3';
  const M = buildMaterials(opt);
  const parts = {};
  for (const [k, fn] of Object.entries({ building: buildBuilding, screens: buildScreens, crushers: buildCrushers, flows: buildFlows })) {
    try { parts[k] = fn(root, M, opt) || {}; } catch (e) { console.error('setor3: falha ao montar', k, e); parts[k] = {}; }
  }
  const pick = [parts.screens, parts.crushers].flatMap((p) => p.pick || []);
  const stats = opt.merge === false ? null : mergeStatic(root);
  const hotspots = [parts.screens, parts.crushers].flatMap((p) => p.hotspots || []);
  return {
    group: root, parts, sim, stepSim, hotspots, pick, labels: (parts.flows && parts.flows.labels) || [], lamps: (parts.building && parts.building.lamps) || [], stats,
    update(dt, t, cam) { for (const p of Object.values(parts)) p.update && p.update(dt, t, sim, cam); },
  };
}
export { sim, stepSim };
