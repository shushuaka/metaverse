import * as THREE from 'three';

// 파스텔 로우폴리 3D 월드 빌더 (먼작귀 AI 오피스 + 야외 숲속 공연 무대)

export const ZONES = [
  { id: 'ceo', name: '대표실', private: true, x0: -18, x1: -5.5, z0: -11, z1: -2.2, color: '#F6E3E3', warp: { x: -11.2, z: -5.2 } },
  { id: 'team0', name: '기획·제작팀', private: true, x0: -4.5, x1: 6.5, z0: -10.5, z1: -1.5, color: '#DDF1E4', warp: { x: 0.6, z: -6.0 } },
  { id: 'team1', name: '조사·검수팀', private: true, x0: 7.5, x1: 17.5, z0: -10.5, z1: -1.5, color: '#FADFE6', warp: { x: 12.4, z: -6.0 } },
  { id: 'meeting', name: '회의실', private: true, x0: -18, x1: -5.5, z0: -0.8, z1: 5.2, color: '#EEE7DD', warp: { x: -8.5, z: 2.2 } },
  { id: 'lounge', name: '라운지 카페', private: true, x0: -17.5, x1: 3.5, z0: 5.8, z1: 10.5, color: '#EFE1CC', warp: { x: -6.2, z: 7.4 } },
  { id: 'lobby', name: '로비·기획 라운지', private: false, x0: 4.5, x1: 17.5, z0: 0.2, z1: 10.5, color: '#EAE5DA', warp: { x: 8.5, z: 6.2 } },
  { id: 'stage', name: '야외 숲속 무대', private: false, x0: -24, x1: 0, z0: -31, z1: -11.4, color: '#CFEBC8', warp: { x: -11.5, z: -15.5 } },
  { id: 'ox', name: 'OX 퀴즈 광장', private: false, x0: 19.5, x1: 32.5, z0: -8.5, z1: 4.5, color: '#DFF2EC', warp: { x: 25.8, z: 3.4 } },
  { id: 'rooftop', name: '☁️ 하늘 루프탑 파티장', private: false, x0: -9.5, x1: 9.5, z0: -52.5, z1: -37.5, color: '#DCEEFF', warp: { x: 0, y: 10.2, z: -41.5 } },
  { id: 'secret', name: '🔮 비밀 아지트', private: true, x0: -42.5, x1: -29.5, z0: 11.5, z1: 24.5, color: '#EAE0FA', warp: { x: -36, y: 0, z: 20.5 } },
];

export const ASSIGNABLE_SEATS = [
  { id: 'ceo_0', zoneId: 'ceo', zoneName: '대표실', label: '대표석', color: '#F2C14E', seatX: -13.8, seatZ: -8.9, deskX: -13.8, deskZ: -7.4, rotY: 0 },
  { id: 'sec_0', zoneId: 'ceo', zoneName: '대표실', label: '대표실 보조석', color: '#6FA8E8', seatX: -8.0, seatZ: -6.6, deskX: -8.0, deskZ: -5.3, rotY: 0 },
  { id: 'team0_0', zoneId: 'team0', zoneName: '기획·제작팀', label: '기획·제작팀 1번', color: '#58B98A', seatX: -2.2, seatZ: -8.2, deskX: -2.2, deskZ: -7.2, rotY: 0 },
  { id: 'team0_1', zoneId: 'team0', zoneName: '기획·제작팀', label: '기획·제작팀 2번', color: '#58B98A', seatX: 3.4, seatZ: -8.2, deskX: 3.4, deskZ: -7.2, rotY: 0 },
  { id: 'team0_2', zoneId: 'team0', zoneName: '기획·제작팀', label: '기획·제작팀 3번', color: '#58B98A', seatX: -2.2, seatZ: -4.2, deskX: -2.2, deskZ: -3.2, rotY: 0 },
  { id: 'team0_3', zoneId: 'team0', zoneName: '기획·제작팀', label: '기획·제작팀 4번', color: '#58B98A', seatX: 3.4, seatZ: -4.2, deskX: 3.4, deskZ: -3.2, rotY: 0 },
  { id: 'team1_0', zoneId: 'team1', zoneName: '조사·검수팀', label: '조사·검수팀 1번', color: '#F28CA8', seatX: 9.8, seatZ: -8.2, deskX: 9.8, deskZ: -7.2, rotY: 0 },
  { id: 'team1_1', zoneId: 'team1', zoneName: '조사·검수팀', label: '조사·검수팀 2번', color: '#F28CA8', seatX: 14.8, seatZ: -8.2, deskX: 14.8, deskZ: -7.2, rotY: 0 },
  { id: 'team1_2', zoneId: 'team1', zoneName: '조사·검수팀', label: '조사·검수팀 3번', color: '#F28CA8', seatX: 9.8, seatZ: -4.2, deskX: 9.8, deskZ: -3.2, rotY: 0 },
  { id: 'team1_3', zoneId: 'team1', zoneName: '조사·검수팀', label: '조사·검수팀 4번', color: '#F28CA8', seatX: 14.8, seatZ: -4.2, deskX: 14.8, deskZ: -3.2, rotY: 0 },
];

export const LAYOUT = {
  ceoSeat: { x: -13.8, z: -8.9, rotY: 0 },
  assistSeat: { x: -8.0, z: -6.6, rotY: 0 },
  teamDesks: [
    // 팀 0 (기획·제작팀) 4석
    [
      { x: -2.2, z: -8.2 }, { x: 3.4, z: -8.2 },
      { x: -2.2, z: -4.2 }, { x: 3.4, z: -4.2 },
    ],
    // 팀 1 (조사·검수팀) 4석
    [
      { x: 9.8, z: -8.2 }, { x: 14.8, z: -8.2 },
      { x: 9.8, z: -4.2 }, { x: 14.8, z: -4.2 },
    ],
  ],
  meetingSeats: [
    // 북쪽 4석
    { x: -14.8, z: 0.55, rotY: 0 },
    { x: -12.9, z: 0.55, rotY: 0 },
    { x: -11.1, z: 0.55, rotY: 0 },
    { x: -9.2, z: 0.55, rotY: 0 },
    // 남쪽 4석
    { x: -14.8, z: 3.85, rotY: Math.PI },
    { x: -12.9, z: 3.85, rotY: Math.PI },
    { x: -11.1, z: 3.85, rotY: Math.PI },
    { x: -9.2, z: 3.85, rotY: Math.PI },
    // 동쪽(비서) / 서쪽(대표)
    { x: -7.5, z: 2.2, rotY: -Math.PI / 2 },
    { x: -16.4, z: 2.2, rotY: Math.PI / 2 },
  ],
  loungeSpots: [
    { x: -10.0, z: 8.8, rotY: Math.PI },
    { x: -8.0, z: 8.8, rotY: Math.PI },
    { x: -14.0, z: 8.1, rotY: 0 },
    { x: -4.5, z: 7.6, rotY: Math.PI / 2 },
    { x: -2.5, z: 7.6, rotY: -Math.PI / 2 },
    { x: -0.2, z: 7.6, rotY: Math.PI / 2 },
    { x: 1.8, z: 7.6, rotY: -Math.PI / 2 },
    { x: -2.4, z: 9.5, rotY: Math.PI / 2 },
    { x: -0.4, z: 9.5, rotY: -Math.PI / 2 },
  ],
  stagePerformers: [
    { x: -14.5, z: -25.1, y: 0.65 },
    { x: -12.5, z: -25.1, y: 0.65 },
    { x: -10.5, z: -25.1, y: 0.65 },
    { x: -8.5, z: -25.1, y: 0.65 },
    { x: -13.5, z: -23.5, y: 0.65 },
    { x: -11.5, z: -23.5, y: 0.65 },
    { x: -9.5, z: -23.5, y: 0.65 },
  ],
  stageAudience: [
    { x: -14.0, z: -18.5 },
    { x: -11.5, z: -18.5 },
    { x: -9.0, z: -18.5 },
    { x: -13.0, z: -16.5 },
    { x: -10.0, z: -16.5 },
  ],
};

function makeTextTexture(title, subtitle = '', bg = '#FFFDF7', accent = '#58B98A', width = 512, height = 256) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  // 부드러운 상단 띠
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 24);
  ctx.strokeStyle = 'rgba(120, 96, 74, 0.25)';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.fillStyle = '#3B2F26';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${subtitle ? 40 : 48}px "Pretendard", "Malgun Gothic", sans-serif`;
  ctx.fillText(title, width / 2, subtitle ? height * 0.46 : height * 0.56);
  if (subtitle) {
    ctx.fillStyle = '#756354';
    ctx.font = '600 24px "Pretendard", "Malgun Gothic", sans-serif';
    ctx.fillText(subtitle, width / 2, height * 0.72);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene, officeConfig) {
  const colliders = []; // { x0, x1, z0, z1 }
  const interactables = []; // { x, z, radius, label, type, seat?, message? }
  const addBoxCollider = (cx, cz, w, d) => {
    colliders.push({ x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2 });
  };

  const mat = (color, rough = 0.78, metal = 0.04, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

  const box = (w, h, d, material, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    if (shadow) { m.castShadow = true; m.receiveShadow = true; }
    else { m.receiveShadow = true; }
    scene.add(m);
    return m;
  };

  // ---------- 1. 조명 & 하늘 ----------
  const hemi = new THREE.HemisphereLight(0xfffaf0, 0xb8d9b2, 1.05);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3df, 1.25);
  sun.position.set(22, 34, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 95;
  sun.shadow.camera.left = -36;
  sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 36;
  sun.shadow.camera.bottom = -36;
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // 실내 따뜻한 펜던트 조명 (밤에 밝아짐)
  const warmLights = [];
  const warmPositions = [
    [-11.5, 4.2, -6.5],
    [0.5, 4.2, -6.0],
    [12.5, 4.2, -6.0],
    [-11.8, 4.2, 2.2],
    [-6.0, 4.2, 8.2],
    [10.0, 4.2, 5.5],
  ];
  for (const [lx, ly, lz] of warmPositions) {
    const pl = new THREE.PointLight(0xffdca8, 0.25, 16, 1.6);
    pl.position.set(lx, ly, lz);
    scene.add(pl);
    warmLights.push(pl);
  }

  // 야외 무대 스포트라이트
  const stageLightL = new THREE.PointLight(0xff85c0, 0.0, 18, 1.4);
  stageLightL.position.set(-15.5, 4.5, -22.5);
  scene.add(stageLightL);
  const stageLightR = new THREE.PointLight(0x6fd3ff, 0.0, 18, 1.4);
  stageLightR.position.set(-7.5, 4.5, -22.5);
  scene.add(stageLightR);

  // ---------- 2. 대지 & 잔디 & 오피스 바닥 ----------
  const lawn = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    mat(0xc3e6b8, 0.96, 0)
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -0.12;
  lawn.receiveShadow = true;
  scene.add(lawn);

  // 오피스 바닥 데크 (따뜻한 허니 오크 우드)
  const floorMat = mat(0xf2e2c8, 0.85, 0.02);
  box(36.8, 0.24, 22.8, floorMat, 0, -0.12, 0, false);

  // 바닥 구역별 파스텔 러그
  const teamNames = (officeConfig.teams || []).map((t) => t.name);
  if (teamNames[0]) ZONES[1].name = teamNames[0];
  if (teamNames[1]) ZONES[2].name = teamNames[1];
  ZONES[0].name = `${officeConfig.boss || '대표'}실`;

  // 프라이빗 존 발광 바닥 테두리 + ZEP 스타일 라이트 커튼 (ZEP 프라이빗 스페이스 감성!)
  const privateBorders = new Map();
  function addPrivateBorder(zid, cx, cz, w, d) {
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x7b7cf0, transparent: true, opacity: 0.28, depthWrite: false });
    const wallMatP = new THREE.MeshBasicMaterial({ color: 0x9aa0ff, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
    const bg = new THREE.Group();
    const t = 0.18;
    const h = 0.42;
    const mkBar = (bw, bd, bx, bz) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), borderMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(bx, 0.056, bz);
      bg.add(m);
    };
    mkBar(w, t, cx, cz - d / 2);
    mkBar(w, t, cx, cz + d / 2);
    mkBar(t, d, cx - w / 2, cz);
    mkBar(t, d, cx + w / 2, cz);

    // 입장 시 은은하게 올라오는 프라이빗 경계 글로우 벽
    const mkWallStrip = (len, bx, bz, rotY = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), wallMatP);
      m.position.set(bx, h / 2 + 0.04, bz);
      m.rotation.y = rotY;
      bg.add(m);
    };
    mkWallStrip(w, cx, cz - d / 2, 0);
    mkWallStrip(w, cx, cz + d / 2, 0);
    mkWallStrip(d, cx - w / 2, cz, Math.PI / 2);
    mkWallStrip(d, cx + w / 2, cz, Math.PI / 2);

    scene.add(bg);
    privateBorders.set(zid, { borderMat, wallMat: wallMatP });
  }

  for (const z of ZONES) {
    if (z.id === 'stage' || z.id === 'lobby' || z.id === 'ox' || z.id === 'rooftop' || z.id === 'secret') continue;
    const w = z.x1 - z.x0 - 0.5;
    const d = z.z1 - z.z0 - 0.5;
    const cx = (z.x0 + z.x1) / 2;
    const cz = (z.z0 + z.z1) / 2;
    box(w, 0.04, d, mat(z.color, 0.92, 0), cx, 0.02, cz, false);

    if (z.private) {
      addPrivateBorder(z.id, cx, cz, w, d);
    }
  }

  // ---------- 3. 외벽 & 유리 파티션 (낮은 코지 높이로 시야 확보!) ----------
  const wallMat = mat(0xfff6e9, 0.85, 0.02);
  const trimMat = mat(0xdab894, 0.72, 0.05);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdff4ff,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.36,
  });

  const makeWall = (x0, z0, x1, z1, h = 2.7, isGlass = false, thick = 0.32) => {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const horiz = Math.abs(dx) >= Math.abs(dz);
    const w = horiz ? len : thick;
    const d = horiz ? thick : len;
    if (isGlass) {
      box(w, 0.55, d, trimMat, cx, 0.275, cz);
      box(w, h - 0.7, d * 0.45, glassMat, cx, 0.55 + (h - 0.7) / 2, cz, false);
      box(w, 0.14, d, trimMat, cx, h - 0.07, cz);
    } else {
      box(w, h, d, wallMat, cx, h / 2, cz);
      box(w, 0.14, d + 0.04, trimMat, cx, h + 0.07, cz);
    }
    addBoxCollider(cx, cz, w + 0.1, d + 0.1);
  };

  // 북쪽 외벽 (대표실 뒷문 X: -13.1..-9.9 비워둠)
  makeWall(-18, -11, -13.2, -11, 2.8);
  makeWall(-9.8, -11, 18, -11, 2.8);
  // 뒷문 아치 상인방
  box(3.6, 0.35, 0.42, trimMat, -11.5, 2.7, -11);

  // 서쪽 / 동쪽 외벽 (동쪽 벽 Z: -1.8..+1.8 은 OX 퀴즈 광장 출입문!)
  makeWall(-18, -11, -18, 11, 2.8);
  makeWall(18, -11, 18, -1.8, 2.8);
  makeWall(18, 1.8, 18, 11, 2.8);
  box(0.42, 0.35, 3.8, trimMat, 18, 2.7, 0);

  // 남쪽 외벽 (정문 입구 X: 4.5..8.5 비워둠, 시야를 위해 낮은 유리창 외벽)
  makeWall(-18, 11, 4.5, 11, 1.45, true);
  makeWall(8.5, 11, 18, 11, 1.45, true);

  // 대표실 내부 유리 파티션 (남쪽 문 X: -8.8..-6.2 비워둠)
  makeWall(-5.5, -11, -5.5, -2.2, 2.4, true);
  makeWall(-18, -2.2, -8.9, -2.2, 2.4, true);
  makeWall(-6.1, -2.2, -5.5, -2.2, 2.4, true);

  // 회의실 유리 파티션 (동쪽 문 Z: 1.0..3.6, 남쪽 문 X: -8.8..-6.2)
  makeWall(-18, -0.8, -5.5, -0.8, 2.3, true);
  makeWall(-5.5, -0.8, -5.5, 0.9, 2.3, true);
  makeWall(-5.5, 3.7, -5.5, 5.2, 2.3, true);
  makeWall(-18, 5.2, -8.9, 5.2, 2.3, true);
  makeWall(-6.1, 5.2, -5.5, 5.2, 2.3, true);

  // ---------- 4. 가구 제작 헬퍼 ----------
  const woodLight = mat(0xe8c79e, 0.72);
  const woodWarm = mat(0xc99664, 0.68);
  const darkSlate = mat(0x464b56, 0.45, 0.2);
  const screenGlow = new THREE.MeshStandardMaterial({ color: 0xb9e7ff, emissive: 0x5ab7f0, emissiveIntensity: 0.45, roughness: 0.25 });

  function makeChair(x, z, rotY = 0, cushionColor = 0xf4b6c2, label = '의자에 앉기', seatId = '') {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.9), mat(cushionColor, 0.8));
    seat.position.y = 0.52; seat.castShadow = true; seat.receiveShadow = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.65, 0.14), mat(cushionColor, 0.8));
    back.position.set(0, 0.88, -0.38); back.castShadow = true;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.48, 8), darkSlate);
    stem.position.y = 0.24;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.06, 8), darkSlate);
    base.position.y = 0.03;
    g.add(seat, back, stem, base);
    if (seatId) {
      g.userData.seatId = seatId;
      g.traverse((o) => { o.userData.seatId = seatId; });
    }
    scene.add(g);
    // 쿠션 윗면(Y=0.56) 위 & 등받이 앞쪽(+0.18)에 깔끔히 앉도록 배치해 겹침 방지!
    const sitX = x + Math.sin(rotY) * 0.18;
    const sitZ = z + Math.cos(rotY) * 0.18;
    interactables.push({
      x, z, radius: 1.5, label, type: 'sit', seatId,
      seat: { x: sitX, y: 0.56, z: sitZ, rotY, exitX: x + Math.sin(rotY) * 0.72, exitZ: z + Math.cos(rotY) * 0.72, seatId, label },
    });
    return g;
  }

  function makeDesk(x, z, accentColor = 0x58b98a, isBoss = false) {
    const w = isBoss ? 3.2 : 2.3;
    const d = isBoss ? 1.45 : 1.15;
    box(w, 0.12, d, isBoss ? woodWarm : woodLight, x, 0.82, z);
    // 다리 4개
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(0.11, 0.82, 0.11, woodWarm, x + sx * (w / 2 - 0.14), 0.41, z + sz * (d / 2 - 0.14));
    }
    // 의자(-Z)에 앉아 +Z 방향을 보고 일하도록 모니터는 책상 안쪽(+Z), 화면은 앉은 쪽(-Z)을 향하게 배치
    const monZ = isBoss ? z + 0.18 : z + 0.22;
    const kbZ = isBoss ? z - 0.28 : z - 0.20;
    // 모니터 (본체, 앉은 쪽을 향하는 화면, 스탠드 목 & 받침대)
    box(0.85, 0.56, 0.07, darkSlate, x, 1.3, monZ);
    box(0.76, 0.46, 0.02, screenGlow, x, 1.31, monZ - 0.04, false);
    box(0.14, 0.2, 0.12, darkSlate, x, 0.96, monZ);
    box(0.36, 0.03, 0.2, darkSlate, x, 0.895, monZ);
    // 키보드, 마우스 & 머그컵 (앉은 사람 손이 닿는 -Z 쪽 배치)
    box(0.55, 0.04, 0.22, mat(0xffffff, 0.5), x, 0.9, kbZ);
    box(0.11, 0.03, 0.16, mat(0xf4f6f9, 0.45), x - 0.42, 0.895, kbZ);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.14, 10), mat(accentColor, 0.4));
    mug.position.set(x + (isBoss ? 0.95 : 0.72), 0.95, kbZ);
    mug.castShadow = true;
    scene.add(mug);
    addBoxCollider(x, z, w, d);
  }

  function makePlant(x, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.52, 10), mat(0xd88c66, 0.75));
    pot.position.y = 0.26; pot.castShadow = true;
    const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 1), mat(0x6bc280, 0.82));
    foliage.position.y = 0.85; foliage.castShadow = true;
    const topLeaf = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), mat(0x88d498, 0.82));
    topLeaf.position.set(0.16, 1.25, 0.05); topLeaf.castShadow = true;
    g.add(pot, foliage, topLeaf);
    scene.add(g);
    addBoxCollider(x, z, 0.7 * scale, 0.7 * scale);
  }

  function makeBookshelf(x, z, rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.55), woodWarm);
    frame.position.y = 1.0; frame.castShadow = true; frame.receiveShadow = true;
    g.add(frame);
    const bookColors = [0xf28ca8, 0x6fa8e8, 0xf6c453, 0x58b98a, 0xb197e8];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 6; i++) {
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36 + (i % 2) * 0.07, 0.35), mat(bookColors[(row * 3 + i) % bookColors.length], 0.7));
        bk.position.set(-0.78 + i * 0.31, 0.45 + row * 0.56, 0.12);
        bk.castShadow = true;
        g.add(bk);
      }
    }
    scene.add(g);
    const w = Math.abs(Math.sin(rotY)) > 0.5 ? 0.65 : 2.2;
    const d = Math.abs(Math.sin(rotY)) > 0.5 ? 2.2 : 0.65;
    addBoxCollider(x, z, w, d);
  }

  function makeTeamSign(x, z, text, color, subtitle = '') {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), woodWarm);
    post.position.set(x, 1.1, z);
    scene.add(post);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.85, 0.1),
      [
        woodWarm, woodWarm, woodWarm, woodWarm,
        new THREE.MeshStandardMaterial({ map: makeTextTexture(text, subtitle, '#FFFDF7', color, 512, 160), roughness: 0.6 }),
        woodWarm,
      ]
    );
    board.position.set(x, 2.15, z);
    board.castShadow = true;
    scene.add(board);
  }

  // ---------- 5. 대표실 배치 ----------
  const seatPickTargets = [];
  makeDesk(-13.8, -7.4, 0xf2c14e, true);
  seatPickTargets.push(makeChair(LAYOUT.ceoSeat.x, LAYOUT.ceoSeat.z, 0, 0xf2c14e, '대표석 앉기', 'ceo_0'));
  // 대표 명패
  const bossPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.26, 0.12),
    [woodWarm, woodWarm, woodWarm, woodWarm, new THREE.MeshStandardMaterial({ map: makeTextTexture(`${officeConfig.boss || '랏코'} 대표`, '', '#FFF8E2', '#F2C14E', 256, 96) }), woodWarm]
  );
  bossPlate.position.set(-13.8, 1.0, -6.82);
  scene.add(bossPlate);

  // 비서 데스크
  makeDesk(-8.0, -5.3, 0x6fa8e8, false);
  seatPickTargets.push(makeChair(LAYOUT.assistSeat.x, LAYOUT.assistSeat.z, 0, 0x8bbbf0, '대표실 보조석 앉기', 'sec_0'));
  makePlant(-16.8, -9.8, 1.15);
  makeBookshelf(-16.2, -3.5, Math.PI / 2);

  // ---------- 6. 팀 구역 배치 (기획·제작팀 / 조사·검수팀 · 프라이빗 존) ----------
  makeTeamSign(0.6, -10.45, ZONES[1].name, '#58B98A', '🔒 프라이빗 존');
  LAYOUT.teamDesks[0].forEach((d, idx) => {
    makeDesk(d.x, d.z + 1.0, 0x58b98a);
    seatPickTargets.push(makeChair(d.x, d.z, 0, 0x9cdbb9, `기획·제작팀 ${idx + 1}번 좌석 앉기`, `team0_${idx}`));
  });
  makeTeamSign(12.3, -10.45, ZONES[2].name, '#F28CA8', '🔒 프라이빗 존');
  LAYOUT.teamDesks[1].forEach((d, idx) => {
    makeDesk(d.x, d.z + 1.0, 0xf28ca8);
    seatPickTargets.push(makeChair(d.x, d.z, 0, 0xf6b2c6, `조사·검수팀 ${idx + 1}번 좌석 앉기`, `team1_${idx}`));
  });
  makePlant(6.7, -9.8, 1.0);
  makePlant(17.1, -9.8, 1.05);

  // ---------- 6-B. ZEP 스타일 지정 좌석 3D 이름표(책상 명패 + 공중 이름표 + 바닥 링) ----------
  function makeSeatNameplateTexture(seatMeta, assigned, isMine, pickingMode = false) {
    const c = document.createElement('canvas');
    c.width = 420;
    c.height = 112;
    const ctx = c.getContext('2d');
    const drawRounded = (x, y, w, h, rad) => {
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
    };

    if (assigned && assigned.ownerName) {
      drawRounded(10, 10, 400, 92, 24);
      ctx.fillStyle = isMine ? '#F3F4FF' : 'rgba(255, 255, 255, 0.96)';
      ctx.fill();
      ctx.lineWidth = isMine ? 6 : 4;
      ctx.strokeStyle = isMine ? '#5B5CE6' : (assigned.color || seatMeta.color || '#58B98A');
      ctx.stroke();

      drawRounded(24, 26, 10, 60, 5);
      ctx.fillStyle = isMine ? '#5B5CE6' : (assigned.color || seatMeta.color || '#58B98A');
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1F2330';
      ctx.font = '800 34px "Pretendard", "Malgun Gothic", sans-serif';
      const title = isMine ? `★ ${assigned.ownerName}` : `🏷️ ${assigned.ownerName}`;
      ctx.fillText(title.slice(0, 14), 48, 45);

      ctx.fillStyle = isMine ? '#5B5CE6' : '#73798C';
      ctx.font = '700 20px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.fillText(isMine ? `내 지정 좌석 · ${seatMeta.label}` : seatMeta.label, 48, 78);
    } else {
      drawRounded(26, 22, 368, 68, 20);
      ctx.fillStyle = pickingMode ? 'rgba(238, 240, 255, 0.96)' : 'rgba(255, 253, 248, 0.84)';
      ctx.fill();
      ctx.lineWidth = pickingMode ? 5 : 3;
      ctx.strokeStyle = pickingMode ? '#5B5CE6' : 'rgba(130, 138, 158, 0.35)';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = pickingMode ? '#4849D4' : '#6A7082';
      ctx.font = '700 23px "Pretendard", "Malgun Gothic", sans-serif';
      ctx.fillText(pickingMode ? `👆 클릭해서 지정 · ${seatMeta.label}` : `🪑 ${seatMeta.label} · 빈 좌석`, 210, 56);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const seatVisuals = new Map();
  for (const sm of ASSIGNABLE_SEATS) {
    const plaqueTex = makeSeatNameplateTexture(sm, null, false, false);
    const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.35, transparent: true });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.25, 0.08), [
      woodWarm, woodWarm, woodWarm, woodWarm, plaqueMat, plaqueMat,
    ]);
    stand.position.set(sm.deskX, 0.99, sm.deskZ + 0.45);
    stand.castShadow = true;
    stand.userData.seatId = sm.id;
    scene.add(stand);
    seatPickTargets.push(stand);

    const sprMat = new THREE.SpriteMaterial({ map: plaqueTex, transparent: true, depthWrite: false });
    const spr = new THREE.Sprite(sprMat);
    spr.position.set(sm.deskX, 1.94, sm.deskZ + 0.15);
    spr.scale.set(2.15, 0.58, 1);
    spr.userData.seatId = sm.id;
    scene.add(spr);
    seatPickTargets.push(spr);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0x5b5ce6, transparent: true, opacity: 0.58, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.84, 28), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sm.seatX, 0.062, sm.seatZ);
    ring.visible = false;
    ring.userData.seatId = sm.id;
    scene.add(ring);

    seatVisuals.set(sm.id, { meta: sm, plaqueMat, sprMat, ring, ringMat, lastKey: '' });
  }

  function updateSeatAssignments(seatsMap = {}, myOwnerName = '', pickingMode = false) {
    for (const [sid, v] of seatVisuals) {
      const assigned = seatsMap[sid] || null;
      const isMine = !!(assigned && myOwnerName && assigned.ownerName === myOwnerName);
      const key = `${assigned ? `${assigned.ownerName}|${assigned.color || ''}|${isMine ? 1 : 0}` : 'empty'}|${pickingMode ? 1 : 0}`;
      v.ring.visible = isMine || pickingMode;
      v.ringMat.color.setHex(isMine ? 0x5b5ce6 : 0x2cc76f);
      v.ringMat.opacity = isMine ? 0.65 : 0.42;
      if (v.lastKey === key) continue;
      v.lastKey = key;
      const oldTex = v.plaqueMat.map;
      const nextTex = makeSeatNameplateTexture(v.meta, assigned, isMine, pickingMode);
      v.plaqueMat.map = nextTex;
      v.plaqueMat.needsUpdate = true;
      v.sprMat.map = nextTex;
      v.sprMat.needsUpdate = true;
      if (oldTex) oldTex.dispose();
    }
  }

  // ---------- 7. 회의실 배치 + 동적 프레젠테이션 스크린 ----------
  // 긴 회의 탁자
  box(7.4, 0.14, 2.0, woodLight, -12.0, 0.82, 2.2);
  for (const sx of [-2.8, 0, 2.8]) {
    box(0.24, 0.8, 1.2, woodWarm, -12.0 + sx, 0.4, 2.2);
  }
  addBoxCollider(-12.0, 2.2, 7.2, 1.9);

  for (let i = 0; i < LAYOUT.meetingSeats.length; i++) {
    const s = LAYOUT.meetingSeats[i];
    makeChair(s.x, s.z, s.rotY, i >= 8 ? 0xf6c453 : 0xdccbb8, '회의석에 앉기');
  }

  // 회의실 대형 스크린 (상태에 따라 화면 텍스트 변경!)
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 640; screenCanvas.height = 320;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const updateMeetingScreen = (title, line1, line2, accent = '#58B98A') => {
    const ctx = screenCanvas.getContext('2d');
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, 640, 320);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 640, 56);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 28px "Pretendard", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 26, 38);
    ctx.fillStyle = '#3B2F26';
    ctx.font = '700 32px "Pretendard", "Malgun Gothic", sans-serif';
    ctx.fillText(line1, 30, 145);
    ctx.fillStyle = '#6E5B4C';
    ctx.font = '600 24px "Pretendard", "Malgun Gothic", sans-serif';
    ctx.fillText(line2, 30, 205);
    // 하단 3색 도트
    ['#F6C453', '#58B98A', '#F28CA8'].forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(44 + idx * 28, 275, 9, 0, Math.PI * 2);
      ctx.fill();
    });
    screenTex.needsUpdate = true;
  };
  updateMeetingScreen('먼작귀 AI 오피스 — 회의실', '우리 메타버스 공간 프로젝트', '하단 [회의 소집] 버튼으로 전 직원을 부를 수 있어요!');

  box(0.16, 1.9, 3.6, darkSlate, -17.65, 1.85, 2.2);
  const screenPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.72),
    new THREE.MeshStandardMaterial({ map: screenTex, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 0.22, roughness: 0.35 })
  );
  screenPlane.position.set(-17.55, 1.85, 2.2);
  screenPlane.rotation.y = Math.PI / 2;
  scene.add(screenPlane);

  // ---------- 8. 라운지 카페 배치 ----------
  // 커피 바 카운터
  box(4.0, 1.0, 1.1, woodWarm, -14.2, 0.5, 9.7);
  box(4.15, 0.1, 1.25, mat(0xfff5e8, 0.6), -14.2, 1.05, 9.7);
  // 에스프레소 머신
  box(0.85, 0.72, 0.65, mat(0xd45d6a, 0.35, 0.25), -15.2, 1.44, 9.75);
  box(0.55, 0.32, 0.3, darkSlate, -15.2, 1.32, 9.52);
  // 케이크 쇼케이스
  box(1.1, 0.62, 0.68, glassMat, -13.1, 1.4, 9.72, false);
  const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12), mat(0xffe0b5, 0.7));
  cake.position.set(-13.1, 1.22, 9.72); scene.add(cake);
  addBoxCollider(-14.2, 9.7, 4.1, 1.25);
  interactables.push({
    x: -14.2, z: 8.3, radius: 2.0, label: '아이스 아메리카노 한 잔 마시기', type: 'prop',
    message: '☕ 라운지 카페에서 향긋한 커피를 한 잔 마셨어요! 에너지가 충전됩니다!',
  });

  // 푹신한 파스텔 소파
  box(3.8, 0.48, 1.2, mat(0xf4b6c2, 0.9), -9.0, 0.28, 9.65);
  box(3.8, 0.75, 0.32, mat(0xee9db0, 0.9), -9.0, 0.72, 10.12);
  box(0.32, 0.62, 1.2, mat(0xee9db0, 0.9), -10.8, 0.46, 9.65);
  box(0.32, 0.62, 1.2, mat(0xee9db0, 0.9), -7.2, 0.46, 9.65);
  addBoxCollider(-9.0, 9.65, 3.8, 1.2);
  interactables.push({ x: -9.8, z: 8.6, radius: 1.7, label: '파스텔 소파에 앉기', type: 'sit', seat: { x: -9.8, y: 0.52, z: 9.32, rotY: Math.PI, exitX: -9.8, exitZ: 8.45 } });
  interactables.push({ x: -8.2, z: 8.6, radius: 1.7, label: '파스텔 소파에 앉기', type: 'sit', seat: { x: -8.2, y: 0.52, z: 9.32, rotY: Math.PI, exitX: -8.2, exitZ: 8.45 } });

  // 카페 원형 테이블 3개
  const cafeTables = [[-3.5, 7.6], [0.8, 7.6], [-1.4, 9.5]];
  for (const [tx, tz] of cafeTables) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.09, 16), mat(0xfff6ea, 0.6));
    top.position.set(tx, 0.78, tz); top.castShadow = true; top.receiveShadow = true;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.76, 10), woodWarm);
    leg.position.set(tx, 0.38, tz);
    scene.add(top, leg);
    addBoxCollider(tx, tz, 1.35, 1.35);
    makeChair(tx - 1.05, tz, Math.PI / 2, 0xf7d794, '카페 자리 앉기');
    makeChair(tx + 1.05, tz, -Math.PI / 2, 0x9cdbb9, '카페 자리 앉기');
  }
  makeBookshelf(-17.3, 7.3, Math.PI / 2);

  // ---------- 9. 로비 & 메타버스 기획 보드 ----------
  // 웰컴 매트
  box(3.4, 0.03, 1.5, mat(0xf6c453, 0.95), 6.5, 0.02, 10.1, false);
  makePlant(4.3, 9.9, 1.1);
  makePlant(8.7, 9.9, 1.1);

  // 스탠딩 메타버스 기획 화이트보드
  box(3.2, 1.7, 0.12, darkSlate, 12.6, 1.55, 2.4);
  const wbPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 1.52),
    new THREE.MeshStandardMaterial({
      map: makeTextTexture('메타버스 로드맵', 'Phase 1 완료! · 다음: 멀티플레이어 & 꾸미기', '#FFFDF8', '#F28CA8', 600, 300),
      roughness: 0.4,
    })
  );
  wbPlane.position.set(12.6, 1.55, 2.47);
  scene.add(wbPlane);
  box(0.12, 1.5, 0.5, darkSlate, 11.1, 0.75, 2.4);
  box(0.12, 1.5, 0.5, darkSlate, 14.1, 0.75, 2.4);
  addBoxCollider(12.6, 2.4, 3.2, 0.55);
  interactables.push({
    x: 12.6, z: 3.4, radius: 2.3, label: '공유 화이트보드 & 방명록 열기', type: 'board',
  });
  interactables.push({
    x: -16.2, z: 2.2, radius: 2.4, label: '회의실 화이트보드 열기', type: 'board',
  });

  // ZEP 스타일 미디어·웹페이지 임베드 키오스크 (로비 부스)
  box(2.5, 1.55, 0.14, darkSlate, 7.6, 1.48, 2.4);
  const mediaPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 1.35),
    new THREE.MeshStandardMaterial({
      map: makeTextTexture('📺 유튜브 · 웹 공유 스크린', 'E키로 유튜브·노션·웹페이지를 함께 보세요!', '#F4F5FF', '#5B5CE6', 560, 280),
      emissive: 0x3b3ee0,
      emissiveIntensity: 0.12,
      roughness: 0.32,
    })
  );
  mediaPlane.position.set(7.6, 1.48, 2.48);
  scene.add(mediaPlane);
  box(0.14, 1.4, 0.45, darkSlate, 6.5, 0.7, 2.4);
  box(0.14, 1.4, 0.45, darkSlate, 8.7, 0.7, 2.4);
  addBoxCollider(7.6, 2.4, 2.6, 0.55);
  interactables.push({
    x: 7.6, z: 3.4, radius: 2.4, label: '📺 유튜브·웹페이지 공유 스크린 열기', type: 'embed',
  });
  interactables.push({
    x: -16.4, z: 3.6, radius: 2.1, label: '📺 회의실 발표 미디어(유튜브·웹) 열기', type: 'embed',
  });
  interactables.push({
    x: -11.4, z: 8.6, radius: 2.0, label: '🎵 라운지 미디어/유튜브 열기', type: 'embed',
  });

  // ZEP 스타일 발표 단상 (스포트라이트 존 — 올라서면 전체에게 음성·캠·화면 송출!)
  const spotlightPodiums = [];
  function makeSpotlightPodium(id, name, x, y, z, radius = 1.35) {
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 28),
      new THREE.MeshBasicMaterial({ color: 0xffe594, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, y + 0.055, z);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf5b73b, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.14, radius, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y + 0.065, z);
    // 작은 스탠드 마이크
    const micPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.18, 8), darkSlate);
    micPole.position.set(x + radius * 0.62, y + 0.6, z - 0.2);
    const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xf6c453, 0.35, 0.5));
    micHead.position.set(x + radius * 0.62, y + 1.22, z - 0.2);
    scene.add(pad, ring, micPole, micHead);
    spotlightPodiums.push({ id, name, x, y, z, radius, ring, ringMat });
  }
  makeSpotlightPodium('meeting_podium', '회의실 발표 단상', -16.4, 0, 2.2, 1.3);
  makeSpotlightPodium('stage_podium', 'LIVE STAGE 발표 단상', -11.5, 0.65, -23.0, 1.5);

  // 바닥 클릭 이동 목적지 마커 (Click-to-Walk)
  const walkMarkerGroup = new THREE.Group();
  const walkRingOuter = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.44, 24),
    new THREE.MeshBasicMaterial({ color: 0x5b5ce6, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  );
  walkRingOuter.rotation.x = -Math.PI / 2;
  const walkDotInner = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 16),
    new THREE.MeshBasicMaterial({ color: 0x8b8ef8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  walkDotInner.rotation.x = -Math.PI / 2;
  walkMarkerGroup.add(walkRingOuter, walkDotInner);
  walkMarkerGroup.visible = false;
  scene.add(walkMarkerGroup);

  // ---------- 9-B. 동쪽 정원 OX 퀴즈 광장 (ZEP 대표 미니게임 존!) ----------
  box(12.2, 0.14, 11.4, mat(0xf3ece0, 0.9), 25.8, -0.05, -2.0, false);
  // O 구역 (파스텔 민트-블루)
  const oPadTex = makeTextTexture('O', 'YES · 맞아요!', '#DDF5EC', '#3BC97C', 256, 256);
  const oPad = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 9.6), new THREE.MeshStandardMaterial({ map: oPadTex, roughness: 0.85 }));
  oPad.rotation.x = -Math.PI / 2;
  oPad.position.set(22.9, 0.04, -2.0);
  scene.add(oPad);
  // X 구역 (파스텔 코랄-핑크)
  const xPadTex = makeTextTexture('X', 'NO · 아니에요!', '#FDE4EC', '#EE6C8E', 256, 256);
  const xPad = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 9.6), new THREE.MeshStandardMaterial({ map: xPadTex, roughness: 0.85 }));
  xPad.rotation.x = -Math.PI / 2;
  xPad.position.set(28.7, 0.04, -2.0);
  scene.add(xPad);
  // OX 광장 안내 간판
  makeTeamSign(25.8, -7.6, '⭕❌ OX 퀴즈 광장', '#F09D51');

  // ---------- 9-C. 3단계: 하늘 위 루프탑 파티장 (Y = 10.2, 중심 X=0, Z=-45) ----------
  const RT_Y = 10.2;
  const RT_Z = -45.0;
  // 떠 있는 하늘 데크 본체 + 구름 받침
  box(18.4, 0.55, 14.4, woodLight, 0, RT_Y - 0.28, RT_Z);
  box(19.0, 0.16, 15.0, mat(0xfffdf8, 0.7), 0, RT_Y - 0.62, RT_Z);
  for (const [cx, cz] of [[-7.2, -5.2], [7.2, -5.2], [-7.2, 5.2], [7.2, 5.2], [0, 0]]) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10), mat(0xffffff, 0.95, 0, { transparent: true, opacity: 0.88 }));
    puff.scale.set(1.4, 0.55, 1.2);
    puff.position.set(cx, RT_Y - 1.25, RT_Z + cz);
    scene.add(puff);
  }
  // 하늘 데크 유리 안전 난간 (추락 방지 콜라이더 포함!)
  const makeRooftopRail = (rx, rz, rw, rd) => {
    box(rw, 1.05, rd, glassMat, rx, RT_Y + 0.52, rz, false);
    box(rw, 0.1, rd + 0.04, trimMat, rx, RT_Y + 1.08, rz);
    addBoxCollider(rx, rz, rw + 0.2, rd + 0.2);
  };
  makeRooftopRail(0, RT_Z - 7.1, 18.4, 0.24);
  makeRooftopRail(0, RT_Z + 7.1, 18.4, 0.24);
  makeRooftopRail(-9.1, RT_Z, 0.24, 14.4);
  makeRooftopRail(9.1, RT_Z, 0.24, 14.4);

  // 루프탑 DJ 부스 & 빛나는 파티 댄스 플로어
  const partyFloorMat = new THREE.MeshStandardMaterial({ color: 0xfde2f3, emissive: 0xd980fa, emissiveIntensity: 0.22, roughness: 0.4 });
  const partyFloor = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 5.6), partyFloorMat);
  partyFloor.rotation.x = -Math.PI / 2;
  partyFloor.position.set(0, RT_Y + 0.02, RT_Z - 1.2);
  scene.add(partyFloor);
  box(3.4, 1.05, 1.0, mat(0x524869, 0.45), 0, RT_Y + 0.52, RT_Z - 5.4);
  box(3.5, 0.1, 1.1, mat(0xf6c453, 0.4), 0, RT_Y + 1.08, RT_Z - 5.4);
  const djSign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshStandardMaterial({ map: makeTextTexture('☁️ SKY ROOFTOP DJ', 'Q키로 하늘에서 춤춰요!', '#FFFDF8', '#6FA8E8', 512, 140) })
  );
  djSign.position.set(0, RT_Y + 0.55, RT_Z - 4.88);
  scene.add(djSign);
  addBoxCollider(0, RT_Z - 5.4, 3.5, 1.1);

  // 루프탑 4개 코너 전구 기둥 & 파티 조명
  const rooftopLights = [];
  for (const [px, pz] of [[-8.2, -6.2], [8.2, -6.2], [-8.2, 6.2], [8.2, 6.2]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), woodWarm);
    pole.position.set(px, RT_Y + 1.8, RT_Z + pz);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe88c }));
    bulb.position.set(px, RT_Y + 3.65, RT_Z + pz);
    scene.add(pole, bulb);
  }
  const rtLight = new THREE.PointLight(0xffb5e8, 1.2, 22, 1.5);
  rtLight.position.set(0, RT_Y + 4.0, RT_Z);
  scene.add(rtLight);
  rooftopLights.push(rtLight);

  // 루프탑 힐링 소파 & 전망 포인트
  box(3.4, 0.48, 1.15, mat(0x9cdbb9, 0.88), 6.2, RT_Y + 0.24, RT_Z + 1.5);
  box(3.4, 0.72, 0.28, mat(0x7ac79d, 0.88), 6.2, RT_Y + 0.68, RT_Z + 1.98);
  addBoxCollider(6.2, RT_Z + 1.5, 3.5, 1.2);
  interactables.push({
    x: 6.2, z: RT_Z + 0.4, radius: 1.9, label: '루프탑 소파에 앉기', type: 'sit',
    seat: { x: 6.2, y: RT_Y + 0.5, z: RT_Z + 1.18, rotY: Math.PI, exitX: 6.2, exitZ: RT_Z + 0.35 },
  });
  interactables.push({
    x: 0, z: RT_Z + 5.6, radius: 2.3, label: '☁️ 오피스 전경 감상하기', type: 'prop',
    message: '☁️ 하늘 위 루프탑에서 먼작귀 AI 오피스 전체와 야외 무대가 한눈에 펼쳐집니다! (마우스 드래그로 아래를 내려다보세요!)',
  });

  // ---------- 9-D. 3단계: 비밀 아지트 (프라이빗 비밀방, 중심 X=-36, Z=18) ----------
  const SH_X = -36.0, SH_Z = 18.0;
  box(12.6, 0.22, 12.6, mat(0xe6daf5, 0.85), SH_X, -0.11, SH_Z, false);
  box(10.8, 0.04, 10.8, mat(0xf6eeff, 0.92), SH_X, 0.02, SH_Z, false);
  // 비밀 아지트 프라이빗 발광 테두리 등록
  addPrivateBorder('secret', SH_X, SH_Z, 10.8, 10.8);
  // 아지트 벽 4면 (완벽한 비밀 프라이빗 공간!)
  makeWall(SH_X - 6.2, SH_Z - 6.2, SH_X + 6.2, SH_Z - 6.2, 2.7);
  makeWall(SH_X - 6.2, SH_Z - 6.2, SH_X - 6.2, SH_Z + 6.2, 2.7);
  makeWall(SH_X + 6.2, SH_Z - 6.2, SH_X + 6.2, SH_Z + 6.2, 2.7);
  makeWall(SH_X - 6.2, SH_Z + 6.2, SH_X + 6.2, SH_Z + 6.2, 1.5, true);

  // 아지트 포스터 간판, 라멘 간식 테이블, 대형 빈백 쿠션 2개
  makeTeamSign(SH_X, SH_Z - 5.5, '🔮 먼작귀 비밀 아지트', '#9C86E8');
  const snackTop = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 18), woodLight);
  snackTop.position.set(SH_X, 0.56, SH_Z - 0.5); snackTop.castShadow = true;
  const snackLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.54, 10), woodWarm);
  snackLeg.position.set(SH_X, 0.27, SH_Z - 0.5);
  scene.add(snackTop, snackLeg);
  addBoxCollider(SH_X, SH_Z - 0.5, 2.1, 2.1);
  interactables.push({
    x: SH_X, z: SH_Z + 1.0, radius: 2.2, label: '🍜 비밀 야식 라멘 먹기', type: 'prop',
    message: '🍜 라멘 갑옷 씨가 몰래 준비해 둔 특제 비밀 라멘을 먹었어요! 호로록~ 기분 최고!',
  });

  for (const [bx, bz, col] of [[SH_X - 3.3, SH_Z - 0.8, 0xf6b2c6], [SH_X + 3.3, SH_Z - 0.8, 0x9cdbb9]]) {
    const bean = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), mat(col, 0.92));
    bean.scale.set(1.1, 0.55, 1.1);
    bean.position.set(bx, 0.35, bz); bean.castShadow = true;
    scene.add(bean);
    interactables.push({
      x: bx, z: bz, radius: 1.7, label: '푹신한 빈백에 앉기', type: 'sit',
      seat: { x: bx, y: 0.62, z: bz, rotY: 0, exitX: bx, exitZ: bz + 1.05 },
    });
  }
  const secretLight = new THREE.PointLight(0xd9b8ff, 1.1, 16, 1.5);
  secretLight.position.set(SH_X, 3.4, SH_Z);
  scene.add(secretLight);

  // ---------- 9-E. 3단계: 3D 마법 포털(Portal) 4개 ----------
  const portals = [];
  function makePortal({ x, y, z, color, label, toX, toY, toZ, toName }) {
    const g = new THREE.Group();
    g.position.set(x, y, z);

    const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 10, 28), ringMat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.08;

    const innerDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, side: THREE.DoubleSide })
    );
    innerDisc.rotation.x = -Math.PI / 2;
    innerDisc.position.y = 0.06;

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 2.3, 18, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 1.18;

    const signSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeTextTexture(label, '밟으면 순간이동!', '#FFFDF8', '#' + color.toString(16).padStart(6, '0'), 360, 110), transparent: true })
    );
    signSprite.scale.set(2.5, 0.76, 1);
    signSprite.position.y = 2.55;

    g.add(outerRing, innerDisc, beam, signSprite);
    scene.add(g);
    portals.push({ group: g, outerRing, beam, x, y, z, toX, toY, toZ, toName, label });
  }

  // 1) 로비 <-> 하늘 루프탑 파티장
  makePortal({ x: 10.6, y: 0, z: 8.6, color: 0x5bb8ff, label: '☁️ 하늘 루프탑', toX: 0, toY: RT_Y, toZ: RT_Z + 3.2, toName: '☁️ 하늘 루프탑 파티장' });
  makePortal({ x: -6.2, y: RT_Y, z: RT_Z + 4.8, color: 0xf6c453, label: '🏢 오피스 복귀', toX: 8.6, toY: 0, toZ: 7.4, toName: '로비·기획 라운지' });
  // 2) 라운지 카페 <-> 비밀 아지트
  makePortal({ x: -15.2, y: 0, z: 6.7, color: 0xa685f0, label: '🔮 비밀 아지트', toX: SH_X, toY: 0, toZ: SH_Z + 2.8, toName: '🔮 비밀 아지트' });
  makePortal({ x: SH_X, y: 0, z: SH_Z + 4.8, color: 0x58b98a, label: '☕ 라운지 복귀', toX: -13.0, toY: 0, toZ: 7.0, toName: '라운지 카페' });

  // 로비 라운지 식물 & 프린터
  box(1.1, 0.9, 0.9, mat(0xe6e8ee, 0.55), 16.4, 0.45, 7.8);
  box(0.75, 0.25, 0.65, darkSlate, 16.4, 1.02, 7.8);
  addBoxCollider(16.4, 7.8, 1.2, 1.0);
  makePlant(16.8, 9.7, 1.15);

  // ---------- 10. 야외 숲속 공연 무대 (북쪽 뒷문 밖!) ----------
  // 디딤돌 길
  for (let i = 0; i < 6; i++) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.08, 12), mat(0xebe3d5, 0.9));
    st.position.set(-11.5 + (i % 2 === 0 ? -0.35 : 0.35), -0.05, -12.4 - i * 1.45);
    st.receiveShadow = true;
    scene.add(st);
  }

  // 흰색 무대 플랫폼 + 계단
  box(10.6, 0.65, 4.8, mat(0xfffdf8, 0.7), -11.5, 0.325, -24.6);
  box(10.9, 0.14, 5.1, mat(0xf4d28c, 0.7), -11.5, 0.62, -24.6);
  // 중앙 계단
  box(2.8, 0.32, 0.9, mat(0xfff7e6, 0.75), -11.5, 0.16, -21.8);

  // 상징적인 노란 둥근 배경막
  box(9.2, 3.2, 0.35, mat(0xf8da6a, 0.75), -11.5, 2.25, -26.85);
  const archTop = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.35, 24, 1, false, 0, Math.PI), mat(0xf8da6a, 0.75));
  archTop.rotation.x = Math.PI / 2;
  archTop.rotation.z = -Math.PI / 2;
  archTop.scale.set(0.32, 1, 1);
  archTop.position.set(-11.5, 3.82, -26.85);
  scene.add(archTop);

  // 무대 배너 간판
  const stageBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 1.55),
    new THREE.MeshStandardMaterial({
      map: makeTextTexture('★ 먼작귀 LIVE STAGE ★', '무대에 올라가 [G] 또는 댄스 버튼으로 춤춰 보세요!', '#FFF9DB', '#F28CA8', 640, 180),
      roughness: 0.45,
    })
  );
  stageBanner.position.set(-11.5, 2.85, -26.64);
  scene.add(stageBanner);
  addBoxCollider(-11.5, -26.85, 9.4, 0.6);

  // 무대 위 댄스 존 반짝이 링 & 인터랙션
  const dancePad = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.45, 32),
    new THREE.MeshBasicMaterial({ color: 0xf48fb1, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
  );
  dancePad.rotation.x = -Math.PI / 2;
  dancePad.position.set(-11.5, 0.71, -24.3);
  scene.add(dancePad);
  interactables.push({
    x: -11.5, z: -24.3, radius: 4.8, label: 'LIVE STAGE 춤추기 (G)', type: 'dance',
  });

  // 무대 댄스 반짝이 콘페티/음표 파티클
  const danceParticleCount = 36;
  const dpGeo = new THREE.BufferGeometry();
  const dpPos = new Float32Array(danceParticleCount * 3);
  for (let i = 0; i < danceParticleCount; i++) {
    dpPos[i * 3] = -16.2 + Math.random() * 9.4;
    dpPos[i * 3 + 1] = 1.0 + Math.random() * 4.2;
    dpPos[i * 3 + 2] = -26.2 + Math.random() * 4.0;
  }
  dpGeo.setAttribute('position', new THREE.BufferAttribute(dpPos, 3));
  const dpMat = new THREE.PointsMaterial({ color: 0xffd166, size: 0.34, transparent: true, opacity: 0 });
  const danceParticles = new THREE.Points(dpGeo, dpMat);
  scene.add(danceParticles);

  // 무대 관객석 벤치 2줄
  for (const bz of [-18.5, -16.5]) {
    box(7.6, 0.16, 0.78, woodLight, -11.5, 0.48, bz);
    box(0.24, 0.46, 0.62, woodWarm, -14.6, 0.23, bz);
    box(0.24, 0.46, 0.62, woodWarm, -8.4, 0.23, bz);
    addBoxCollider(-11.5, bz, 7.6, 0.8);
    interactables.push({
      x: -11.5, z: bz + 0.9, radius: 1.9, label: '공연장 벤치에 앉기', type: 'sit',
      seat: { x: -11.5, y: 0.56, z: bz, rotY: Math.PI, exitX: -11.5, exitZ: bz + 0.95 },
    });
  }

  // ---------- 11. 야외 파스텔 나무, 꽃, 가로등, 구름 ----------
  function makeTree(x, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, -0.1, z);
    g.scale.setScalar(scale);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.1, 8), mat(0x9d7354, 0.9));
    trunk.position.y = 1.05; trunk.castShadow = true;
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55, 1), mat(0x7ac787, 0.85));
    c1.position.set(0, 2.75, 0); c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 1), mat(0x95da9c, 0.85));
    c2.position.set(0.7, 3.35, 0.35); c2.castShadow = true;
    g.add(trunk, c1, c2);
    scene.add(g);
    addBoxCollider(x, z, 1.1 * scale, 1.1 * scale);
  }

  const treeCoords = [
    [-22, -26, 1.25], [-21, -18, 1.05], [-23, -10, 1.15], [-23, 2, 1.2], [-22, 14, 1.1],
    [-3, -27, 1.2], [2, -21, 1.0], [8, -17, 1.15], [16, -16, 1.25], [24, -14, 1.1],
    [35, -8, 1.2], [35, 4, 1.15], [23, 12, 1.15], [-11, 17, 1.0], [-2, 17, 1.15], [14, 17, 1.1],
    [-16, -31, 1.3], [-7, -31, 1.25],
  ];
  for (const [tx, tz, sc] of treeCoords) makeTree(tx, tz, sc);

  // 아기자기한 야외 꽃밭
  const flowerColors = [0xffb3c6, 0xffe066, 0xa8d8ff, 0xffffff, 0xffc699];
  for (let i = 0; i < 42; i++) {
    const a = (i * 137.5) * Math.PI / 180;
    const r = 17 + (i % 7) * 3.1;
    const fx = Math.cos(a) * r * 1.15;
    const fz = Math.sin(a) * r * 0.9 - 4;
    if (fx > -18.8 && fx < 18.8 && fz > -11.8 && fz < 11.8) continue;
    if (fx > -17 && fx < -6 && fz > -27.5 && fz < -15) continue;
    const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mat(flowerColors[i % flowerColors.length], 0.7));
    fl.position.set(fx, 0.08, fz);
    scene.add(fl);
  }

  // 야외 가로등 (밤에 켜짐)
  const outdoorLanterns = [];
  for (const [lx, lz] of [[-17.2, -21.5], [-5.8, -21.5], [3.5, 13.5], [9.5, 13.5]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8), darkSlate);
    pole.position.set(lx, 1.5, lz); pole.castShadow = true;
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff5cf, emissive: 0xffd26a, emissiveIntensity: 0.25 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), bulbMat);
    bulb.position.set(lx, 3.2, lz);
    const lgt = new THREE.PointLight(0xffd785, 0.0, 14, 1.7);
    lgt.position.set(lx, 3.1, lz);
    scene.add(pole, bulb, lgt);
    outdoorLanterns.push({ bulbMat, lgt });
  }

  // 둥실둥실 파스텔 구름 (하늘 올려다볼 때 풍성하게!)
  const clouds = [];
  const cloudMat = mat(0xffffff, 0.95, 0, { transparent: true, opacity: 0.92 });
  for (let i = 0; i < 14; i++) {
    const cg = new THREE.Group();
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 8), cloudMat);
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(1.75, 10, 8), cloudMat);
    s2.position.set(1.9, -0.3, 0.2);
    const s3 = new THREE.Mesh(new THREE.SphereGeometry(1.65, 10, 8), cloudMat);
    s3.position.set(-1.8, -0.4, -0.2);
    cg.add(s1, s2, s3);
    cg.position.set(-54 + i * 9, 17 + (i % 4) * 3.2, -38 + (i % 5) * 16);
    cg.scale.set(1.3, 0.72, 0.95);
    scene.add(cg);
    clouds.push(cg);
  }

  // 하늘 해 & 달 & 밤하늘 별빛 돔 (드래그로 하늘을 올려다보면 보여요!)
  const sunOrbMat = new THREE.MeshBasicMaterial({ color: 0xfff2a8 });
  const sunOrb = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 16), sunOrbMat);
  sunOrb.position.set(34, 42, -46);
  scene.add(sunOrb);

  const moonOrb = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff8d6 })
  );
  moonOrb.position.set(-28, 40, -48);
  moonOrb.visible = false;
  scene.add(moonOrb);

  const starCount = 240;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.44;
    const r = 82 + Math.random() * 14;
    starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    starPos[i * 3 + 1] = Math.cos(phi) * r;
    starPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xfffbe0, size: 0.9, transparent: true, opacity: 0, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // 밤 반딧불이 파티클
  const fireflyCount = 48;
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = new Float32Array(fireflyCount * 3);
  for (let i = 0; i < fireflyCount; i++) {
    ffPos[i * 3] = -24 + Math.random() * 48;
    ffPos[i * 3 + 1] = 0.8 + Math.random() * 3.5;
    ffPos[i * 3 + 2] = -28 + Math.random() * 44;
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const ffMat = new THREE.PointsMaterial({ color: 0xfff08a, size: 0.28, transparent: true, opacity: 0 });
  const fireflies = new THREE.Points(ffGeo, ffMat);
  scene.add(fireflies);

  // ---------- 11-B. 3D 실시간 날씨 시스템 (비 빗줄기 / 눈송이 / 번개) ----------
  // 1) 3D 빗줄기 (LineSegments)
  const RAIN_COUNT = 650;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(RAIN_COUNT * 6);
  const rainSpeeds = new Float32Array(RAIN_COUNT);
  for (let i = 0; i < RAIN_COUNT; i++) {
    const rx = -46 + Math.random() * 88;
    const ry = Math.random() * 28;
    const rz = -56 + Math.random() * 84;
    rainSpeeds[i] = 22 + Math.random() * 10;
    const idx = i * 6;
    rainPos[idx] = rx; rainPos[idx + 1] = ry; rainPos[idx + 2] = rz;
    rainPos[idx + 3] = rx - 0.14; rainPos[idx + 4] = ry - 0.95; rainPos[idx + 5] = rz + 0.08;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xbadbff, transparent: true, opacity: 0.65 });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  rainLines.visible = false;
  scene.add(rainLines);

  // 2) 3D 동글동글 눈송이 (부드러운 원형 텍스처 Points)
  const snowCanvas = document.createElement('canvas');
  snowCanvas.width = 32; snowCanvas.height = 32;
  const sctx = snowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(16, 16, 2, 16, 16, 15);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.65, 'rgba(245,252,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 32, 32);
  const snowTex = new THREE.CanvasTexture(snowCanvas);

  const SNOW_COUNT = 620;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(SNOW_COUNT * 3);
  const snowPhase = new Float32Array(SNOW_COUNT);
  for (let i = 0; i < SNOW_COUNT; i++) {
    snowPos[i * 3] = -46 + Math.random() * 88;
    snowPos[i * 3 + 1] = Math.random() * 26;
    snowPos[i * 3 + 2] = -56 + Math.random() * 84;
    snowPhase[i] = Math.random() * Math.PI * 2;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snowMat = new THREE.PointsMaterial({ map: snowTex, color: 0xffffff, size: 0.42, transparent: true, opacity: 0.92, depthWrite: false });
  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.visible = false;
  scene.add(snowPoints);

  // 번개 플래시 라이트 (뇌우 시)
  const lightningLight = new THREE.DirectionalLight(0xdcebff, 0);
  lightningLight.position.set(-18, 40, -20);
  scene.add(lightningLight);
  let nextLightningAt = 3;

  // ---------- 12. 시간대(낮/노을/밤) + 날씨(맑음/흐림/비/눈/뇌우) 분위기 통합 ----------
  const SKY_PRESETS = [
    { name: '☀️ 낮', bg: 0xd9efff, fog: 0xd9efff, sunColor: 0xfff5e4, sunInt: 1.25, hemiSky: 0xfffaf0, hemiGnd: 0xb8d9b2, hemiInt: 1.05, warmInt: 0.22, lanternInt: 0.0, ffOp: 0.0 },
    { name: '🌇 노을', bg: 0xffcfb3, fog: 0xffd5bc, sunColor: 0xff9b5e, sunInt: 1.15, hemiSky: 0xffd0a8, hemiGnd: 0x9c8276, hemiInt: 0.85, warmInt: 0.75, lanternInt: 0.85, ffOp: 0.35 },
    { name: '🌙 밤', bg: 0x1c2541, fog: 0x222c4a, sunColor: 0x8ea8e8, sunInt: 0.42, hemiSky: 0x5c72a8, hemiGnd: 0x262e42, hemiInt: 0.55, warmInt: 1.45, lanternInt: 1.65, ffOp: 0.92 },
  ];
  let skyIndex = 0;
  let weatherKind = 'clear'; // 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm'

  function refreshAtmosphere() {
    const p = SKY_PRESETS[skyIndex];
    const isRainy = weatherKind === 'rain' || weatherKind === 'storm';
    const isSnowy = weatherKind === 'snow';
    const isCloudy = weatherKind === 'cloudy';

    let bgHex = p.bg;
    let fogDensity = 0.0105;
    let sunMul = 1.0;
    let extraWarm = 0;

    if (isRainy) {
      bgHex = skyIndex === 2 ? 0x141b2d : (weatherKind === 'storm' ? 0x7b8ea3 : 0xa5bacd);
      fogDensity = weatherKind === 'storm' ? 0.017 : 0.0145;
      sunMul = weatherKind === 'storm' ? 0.45 : 0.62;
      extraWarm = 0.45;
    } else if (isSnowy) {
      bgHex = skyIndex === 2 ? 0x232d4a : 0xdce7f5;
      fogDensity = 0.014;
      sunMul = 0.78;
      extraWarm = 0.35;
    } else if (isCloudy) {
      bgHex = skyIndex === 2 ? 0x1c253d : 0xc2d5e6;
      fogDensity = 0.012;
      sunMul = 0.8;
      extraWarm = 0.15;
    }

    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, fogDensity);
    sun.color.setHex(p.sunColor);
    sun.intensity = p.sunInt * sunMul;
    hemi.color.setHex(p.hemiSky);
    hemi.groundColor.setHex(p.hemiGnd);
    hemi.intensity = p.hemiInt * (isRainy ? 0.85 : 1.0);
    for (const l of warmLights) l.intensity = p.warmInt + extraWarm;
    for (const o of outdoorLanterns) {
      const lit = Math.max(p.lanternInt, isRainy || isSnowy ? 0.75 : 0);
      o.lgt.intensity = lit;
      o.bulbMat.emissiveIntensity = lit > 0 ? 1.35 : 0.2;
    }
    ffMat.opacity = isRainy ? 0 : p.ffOp;

    sunOrb.visible = skyIndex !== 2 && weatherKind === 'clear';
    sunOrbMat.color.setHex(skyIndex === 1 ? 0xff9e66 : 0xfff2a8);
    sunOrb.position.y = skyIndex === 1 ? 26 : 42;
    moonOrb.visible = skyIndex === 2 && weatherKind === 'clear';
    starMat.opacity = (weatherKind === 'clear' || weatherKind === 'snow') ? (skyIndex === 2 ? 0.92 : skyIndex === 1 ? 0.2 : 0) : 0;
    cloudMat.color.setHex(
      isRainy ? (skyIndex === 2 ? 0x3b4863 : 0x8ea0b5)
        : skyIndex === 1 ? 0xffe2cc
          : skyIndex === 2 ? 0x5c6d96
            : isCloudy ? 0xe5edf5 : 0xffffff
    );

    rainLines.visible = isRainy;
    rainMat.opacity = weatherKind === 'storm' ? 0.82 : 0.58;
    snowPoints.visible = isSnowy;
    lightningLight.intensity = 0;
  }

  function applySky(idx) {
    skyIndex = ((idx % SKY_PRESETS.length) + SKY_PRESETS.length) % SKY_PRESETS.length;
    refreshAtmosphere();
    return SKY_PRESETS[skyIndex].name;
  }
  function setWeather(kind) {
    weatherKind = ['clear', 'cloudy', 'rain', 'snow', 'storm'].includes(kind) ? kind : 'clear';
    refreshAtmosphere();
    return weatherKind;
  }
  applySky(0);

  function updateEnvironment(dt, elapsed, isShowMode) {
    for (const c of clouds) {
      c.position.x += dt * 0.55;
      if (c.position.x > 52) c.position.x = -52;
    }
    // 3단계 마법 포털 회전 & 루프탑 파티 조명 애니메이션
    for (const pt of portals) {
      pt.outerRing.rotation.z = elapsed * 1.8;
      pt.beam.rotation.y = elapsed * 1.2;
      pt.beam.scale.y = 0.92 + Math.sin(elapsed * 3.2 + pt.x) * 0.1;
    }
    partyFloorMat.emissive.setHSL((elapsed * 0.14) % 1, 0.72, 0.62);
    rtLight.color.setHSL((elapsed * 0.14 + 0.3) % 1, 0.85, 0.72);
    if (ffMat.opacity > 0.01) {
      const arr = ffGeo.attributes.position.array;
      for (let i = 0; i < fireflyCount; i++) {
        arr[i * 3 + 1] += Math.sin(elapsed * 2.2 + i) * dt * 0.35;
      }
      ffGeo.attributes.position.needsUpdate = true;
    }

    // 3D 비 / 눈 / 뇌우 번개 애니메이션
    if (rainLines.visible) {
      const arr = rainGeo.attributes.position.array;
      const mult = weatherKind === 'storm' ? 1.45 : 1.0;
      for (let i = 0; i < RAIN_COUNT; i++) {
        const idx = i * 6;
        const dy = rainSpeeds[i] * mult * dt;
        const dx = (weatherKind === 'storm' ? -4.2 : -2.0) * dt;
        arr[idx] += dx; arr[idx + 1] -= dy;
        arr[idx + 3] += dx; arr[idx + 4] -= dy;
        if (arr[idx + 1] < 0) {
          const rx = -46 + Math.random() * 88;
          const ry = 22 + Math.random() * 8;
          const rz = -56 + Math.random() * 84;
          arr[idx] = rx; arr[idx + 1] = ry; arr[idx + 2] = rz;
          arr[idx + 3] = rx - (weatherKind === 'storm' ? 0.26 : 0.14);
          arr[idx + 4] = ry - (weatherKind === 'storm' ? 1.35 : 0.95);
          arr[idx + 5] = rz + 0.08;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;

      if (weatherKind === 'storm') {
        if (elapsed > nextLightningAt) {
          lightningLight.intensity = 3.2;
          nextLightningAt = elapsed + 4.5 + Math.random() * 6.5;
        } else if (lightningLight.intensity > 0.02) {
          lightningLight.intensity *= Math.max(0, 1 - dt * 9);
        }
      }
    }
    if (snowPoints.visible) {
      const arr = snowGeo.attributes.position.array;
      for (let i = 0; i < SNOW_COUNT; i++) {
        const i3 = i * 3;
        arr[i3] += Math.sin(elapsed * 1.4 + snowPhase[i]) * dt * 0.85;
        arr[i3 + 1] -= (1.5 + (i % 5) * 0.25) * dt;
        arr[i3 + 2] += Math.cos(elapsed * 1.1 + snowPhase[i]) * dt * 0.45;
        if (arr[i3 + 1] < 0) {
          arr[i3] = -46 + Math.random() * 88;
          arr[i3 + 1] = 22 + Math.random() * 6;
          arr[i3 + 2] = -56 + Math.random() * 84;
        }
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    if (isShowMode) {
      stageLightL.intensity = 2.8;
      stageLightR.intensity = 2.8;
      stageLightL.position.x = -14.5 + Math.sin(elapsed * 2.6) * 2.6;
      stageLightR.position.x = -8.5 + Math.cos(elapsed * 2.6) * 2.6;
      stageLightL.color.setHSL((elapsed * 0.28) % 1, 0.85, 0.68);
      stageLightR.color.setHSL((elapsed * 0.28 + 0.5) % 1, 0.85, 0.68);
      dancePad.rotation.z = elapsed * 1.4;
      dpMat.opacity = 0.92;
      dpMat.color.setHSL((elapsed * 0.35) % 1, 0.9, 0.66);
      const arr = dpGeo.attributes.position.array;
      for (let i = 0; i < danceParticleCount; i++) {
        arr[i * 3 + 1] += dt * (1.2 + (i % 4) * 0.35);
        arr[i * 3] += Math.sin(elapsed * 3 + i) * dt * 0.35;
        if (arr[i * 3 + 1] > 5.4) arr[i * 3 + 1] = 1.0;
      }
      dpGeo.attributes.position.needsUpdate = true;
    } else {
      stageLightL.intensity = 0;
      stageLightR.intensity = 0;
      dpMat.opacity = 0;
    }
    for (const sp of spotlightPodiums) {
      sp.ring.rotation.z = elapsed * 0.9;
      sp.ringMat.opacity = 0.62 + Math.sin(elapsed * 3.5) * 0.25;
    }
    if (walkMarkerGroup.visible) {
      const pulse = 0.92 + Math.sin(elapsed * 7) * 0.14;
      walkRingOuter.scale.set(pulse, pulse, 1);
    }
  }

  function getSpotlightPodiumAt(x, y, z) {
    for (const sp of spotlightPodiums) {
      if (Math.abs(y - sp.y) < 1.2 && Math.hypot(x - sp.x, z - sp.z) <= sp.radius + 0.15) return sp;
    }
    return null;
  }

  function setWalkMarker(x, y, z) {
    walkMarkerGroup.position.set(x, y + 0.06, z);
    walkMarkerGroup.visible = true;
  }
  function hideWalkMarker() {
    walkMarkerGroup.visible = false;
  }

  function highlightPrivateZone(activeZoneId, elapsed) {
    for (const [zid, entry] of privateBorders) {
      if (zid === activeZoneId) {
        entry.borderMat.color.setHex(0x6366f1);
        entry.borderMat.opacity = 0.72 + Math.sin(elapsed * 3.8) * 0.16;
        entry.wallMat.color.setHex(0xa5b4fc);
        entry.wallMat.opacity = 0.18 + Math.sin(elapsed * 3.8) * 0.05;
      } else {
        entry.borderMat.color.setHex(0x8b8ef2);
        entry.borderMat.opacity = 0.22;
        entry.wallMat.opacity = 0.0;
      }
    }
  }

  return {
    colliders,
    interactables,
    portals,
    spotlightPodiums,
    seatPickTargets,
    getSpotlightPodiumAt,
    setWalkMarker,
    hideWalkMarker,
    updateMeetingScreen,
    applySky,
    setWeather,
    nextSky: () => applySky(skyIndex + 1),
    updateEnvironment,
    highlightPrivateZone,
    updateSeatAssignments,
  };
}

export function getZoneAt(x, z) {
  for (const zItem of ZONES) {
    if (x >= zItem.x0 && x <= zItem.x1 && z >= zItem.z0 && z <= zItem.z1) return zItem;
  }
  return { id: 'garden', name: '오피스 정원' };
}
