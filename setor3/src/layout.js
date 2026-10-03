// Contrato de layout do prédio do setor 3 · Britagem e peneiramento da Usina II (metros). x ao longo do prédio, z na profundidade, y para cima.
// Configuração pelo TCC (Rodrigues & Silva, 2016): 8 peneiras banana de 2 decks; retido 1º deck → britagem primária (2 cônicos HP 400);
// retido 2º deck → britagem secundária (3 Barmac VSI); passante < 12,5 mm → pilha; circuito fechado com silos alimentando os britadores.
export const B = { W: 64, D: 24, H: 24, colX: [0, 8, 16, 24, 32, 40, 48, 56, 64], colZ: [0, 12, 24], screenEnd: 46 };
export const LV = { L0: 0, L1: 7.5, L2: 14 };            // térreo, piso das peneiras, piso dos alimentadores
export const SCREENS = { xs: [3.5, 9, 14.5, 20, 25.5, 31, 36.5, 42], zFeed: 4.6, len: 7.3, w: 3.0,
  tags: ['03PN001', '03PN002', '03PN003', '03PN004', '03PN005', '03PN006', '03PN007', '03PN008'] };
export const CRUSHERS = {
  cones: [{ x: 51, z: 7, tag: '03BR001' }, { x: 59, z: 7, tag: '03BR002' }],                       // britagem primária · HP 400
  vsi: [{ x: 50, z: 17.5, tag: '03BR004' }, { x: 55.5, z: 17.5, tag: '03BR005' }, { x: 61, z: 17.5, tag: '03BR006' }],  // secundária · Barmac
};
export const BELT_FINES = { z: 20.5, y: 1.3 };
export const CAMS = {
  cctv: { pos: [1.5, 13.2, 19.5], look: [15, 8.6, 6.5], fov: 62, label: 'Câmera do prédio' },
  peneira: { pos: [11.7, 8.85, 17.6], look: [9.0, 9.2, 12.5], fov: 72, label: 'Peneira 03PN002' },
  britadores: { pos: [47.5, 1.55, 1.6], look: [59, 1.6, 8.5], fov: 68, label: 'Britagem primária (HP 400)' },
  vsi: { pos: [56.8, 2.2, 23.2], look: [61, 2.0, 17.5], fov: 62, label: 'Barmac 03BR006' },
  geral: { pos: [32, 34, 74], look: [32, 6, 10], fov: 45, label: 'Vista geral' },
};
