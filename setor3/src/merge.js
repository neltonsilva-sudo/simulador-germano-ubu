// Otimização: junta as malhas estáticas que usam o mesmo material numa só (menos chamadas de desenho).
// Mantém separadas: InstancedMesh, objetos com userData.keep e tudo dentro de grupos móveis (userData.dyn), que são
// agrupados em relação ao próprio grupo móvel para continuarem se movendo juntos.
import * as THREE from 'three';

function mergeGeos(list) {
  let nv = 0, ni = 0;
  for (const { geo } of list) { nv += geo.attributes.position.count; ni += geo.index ? geo.index.count : geo.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  let vo = 0, io = 0; const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const { geo, m } of list) {
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv; nm.getNormalMatrix(m);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.set([v.x, v.y, v.z], (vo + i) * 3);
      if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); }
      if (U) uv.set([U.getX(i), U.getY(i)], (vo + i) * 2);
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) idx[io + i] = geo.index.getX(i) + vo; else for (let i = 0; i < P.count; i++) idx[io + i] = vo + i;
    io += geo.index ? geo.index.count : P.count; vo += P.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map(), remove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep || o.isSkinnedMesh) return;
    if (Array.isArray(o.material)) return;
    let a = o.parent, dyn = root; while (a && a !== root) { if (a.userData.dyn) { dyn = a; break; } a = a.parent; }
    // dentro de um grupo que se move mas que não é marcado como dyn (ex.: objeto com keep) → manter
    let k = o.parent, kept = false; while (k && k !== dyn) { if (k.userData.keep) { kept = true; break; } k = k.parent; } if (kept) return;
    const shell = !!o.userData.shell, key = dyn.uuid + '|' + o.material.uuid + '|' + shell + '|' + o.castShadow;
    if (!buckets.has(key)) buckets.set(key, { dyn, mat: o.material, shell, cast: o.castShadow, list: [] });
    const inv = new THREE.Matrix4().copy(dyn.matrixWorld).invert();
    buckets.get(key).list.push({ geo: o.geometry, m: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) });
    remove.push(o);
  });
  for (const o of remove) o.parent && o.parent.remove(o);
  let n = 0;
  for (const b of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeos(b.list), b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = true; mesh.userData.shell = b.shell; b.dyn.add(mesh); n++;
  }
  return { before: remove.length, after: n };
}
