import * as THREE from 'three';

// 먼작귀(치이카와) 감성 파스텔 3D 캐릭터 모델 빌더
// 10종 캐릭터(치이카와, 하치와레, 우사기, 랏코, 쿠리만쥬, 모몽가, 시사, 포셰트/노동/라멘 갑옷 씨)를
// 부드러운 모찌/피규어 비율의 360° 3D 메쉬 + 고해상도 만화 표정 데칼 + 관절 애니메이션으로 생성합니다.

const faceTexCache = new Map();

function makeMat(color, rough = 0.72, metal = 0.03, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}

function drawMangaFaceTexture(kind) {
  if (faceTexCache.has(kind)) return faceTexCache.get(kind);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  const ink = '#2F2420';
  const cheek = (x, y, rx = 44, ry = 26, color = 'rgba(255, 148, 168, 0.56)') => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // 귀여운 볼 홍조 사선
    ctx.strokeStyle = 'rgba(255, 108, 138, 0.45)';
    ctx.lineWidth = 4;
    for (let dx = -12; dx <= 12; dx += 12) {
      ctx.beginPath();
      ctx.moveTo(x + dx - 5, y + 6);
      ctx.lineTo(x + dx + 5, y - 6);
      ctx.stroke();
    }
    ctx.restore();
  };

  const sparkleEye = (x, y, rx = 24, ry = 29, bigSparkle = false) => {
    ctx.save();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // 큰 하이라이트
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.28, y - ry * 0.28, rx * (bigSparkle ? 0.46 : 0.36), ry * (bigSparkle ? 0.42 : 0.34), -0.2, 0, Math.PI * 2);
    ctx.fill();
    // 작은 아래 반짝이
    ctx.beginPath();
    ctx.arc(x + rx * 0.26, y + ry * 0.34, rx * (bigSparkle ? 0.24 : 0.16), 0, Math.PI * 2);
    ctx.fill();
    if (bigSparkle) {
      ctx.beginPath();
      ctx.arc(x + rx * 0.32, y - ry * 0.16, rx * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const catMouth = (cx, cy, w = 26, open = false) => {
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(cx - w * 0.55, cy, w * 0.55, 0.15 * Math.PI, 0.92 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + w * 0.55, cy, w * 0.55, 0.08 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    if (open) {
      ctx.fillStyle = '#F27E8E';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 20, w * 0.55, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  if (kind === '치이카와') {
    cheek(125, 290, 48, 28);
    cheek(387, 290, 48, 28);
    sparkleEye(176, 240, 24, 28, false);
    sparkleEye(336, 240, 24, 28, false);
    // 살짝 여린 귀요미 눈썹
    ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(155, 186); ctx.quadraticCurveTo(175, 178, 194, 182); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(357, 186); ctx.quadraticCurveTo(337, 178, 318, 182); ctx.stroke();
    catMouth(256, 272, 22, false);
  } else if (kind === '하치와레') {
    cheek(126, 292, 46, 26);
    cheek(386, 292, 46, 26);
    sparkleEye(178, 244, 24, 28, false);
    sparkleEye(334, 244, 24, 28, false);
    // 해맑은 눈썹
    ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(154, 192); ctx.quadraticCurveTo(178, 182, 198, 192); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(314, 192); ctx.quadraticCurveTo(334, 182, 358, 192); ctx.stroke();
    catMouth(256, 274, 24, true);
  } else if (kind === '우사기') {
    cheek(126, 286, 46, 26, 'rgba(255, 134, 146, 0.56)');
    cheek(386, 286, 46, 26, 'rgba(255, 134, 146, 0.56)');
    sparkleEye(180, 236, 22, 26, false);
    sparkleEye(332, 236, 22, 26, false);
    // 장난기 넘치는 위 눈꺼풀/눈썹
    ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(154, 196); ctx.lineTo(202, 192); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(310, 192); ctx.lineTo(358, 196); ctx.stroke();
    // 우라 야하 장난꾸러기 미소
    ctx.beginPath();
    ctx.moveTo(212, 274);
    ctx.quadraticCurveTo(234, 292, 256, 276);
    ctx.quadraticCurveTo(278, 292, 300, 274);
    ctx.stroke();
  } else if (kind === '랏코') {
    cheek(132, 294, 42, 24);
    cheek(380, 294, 42, 24);
    sparkleEye(180, 244, 22, 26, false);
    sparkleEye(332, 244, 22, 26, false);
    // 듬직한 영웅 눈썹
    ctx.strokeStyle = '#4A3326'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(150, 198); ctx.lineTo(204, 206); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(362, 198); ctx.lineTo(308, 206); ctx.stroke();
    // 시그니처 X자 흉터
    ctx.strokeStyle = '#9C5248'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(148, 160); ctx.lineTo(186, 190); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(186, 160); ctx.lineTo(148, 190); ctx.stroke();
    // 작은 코 & 늠름한 입
    ctx.fillStyle = '#52382B';
    ctx.beginPath(); ctx.ellipse(256, 266, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    catMouth(256, 282, 22, false);
  } else if (kind === '쿠리만쥬') {
    cheek(124, 290, 48, 28, 'rgba(255, 138, 138, 0.54)');
    cheek(388, 290, 48, 28, 'rgba(255, 138, 138, 0.54)');
    // 여유롭고 푸근한 눈매
    sparkleEye(178, 246, 21, 23, false);
    sparkleEye(334, 246, 21, 23, false);
    ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(152, 204); ctx.quadraticCurveTo(178, 194, 204, 204); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(308, 204); ctx.quadraticCurveTo(334, 194, 360, 204); ctx.stroke();
    // "하아—" 미소
    ctx.beginPath(); ctx.arc(256, 276, 24, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else if (kind === '모몽가') {
    cheek(118, 292, 50, 30, 'rgba(255, 136, 174, 0.62)');
    cheek(394, 292, 50, 30, 'rgba(255, 136, 174, 0.62)');
    // 엄청 크고 반짝이는 귀여운 눈 + 속눈썹
    sparkleEye(172, 238, 32, 38, true);
    sparkleEye(340, 238, 32, 38, true);
    ctx.strokeStyle = ink; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(138, 212); ctx.lineTo(152, 224); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(374, 212); ctx.lineTo(360, 224); ctx.stroke();
    catMouth(256, 282, 24, true);
  } else if (kind === '시사') {
    cheek(126, 292, 46, 26, 'rgba(255, 140, 128, 0.55)');
    cheek(386, 292, 46, 26, 'rgba(255, 140, 128, 0.55)');
    sparkleEye(178, 242, 24, 28, true);
    sparkleEye(334, 242, 24, 28, true);
    // 시사의 상징 굵고 씩씩한 눈썹!
    ctx.strokeStyle = '#5B3E2A'; ctx.lineWidth = 15; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(146, 190); ctx.quadraticCurveTo(176, 178, 204, 194); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(366, 190); ctx.quadraticCurveTo(336, 178, 308, 194); ctx.stroke();
    // 둥근 코 & 환한 미소
    ctx.fillStyle = '#7C4B38';
    ctx.beginPath(); ctx.ellipse(256, 266, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
    catMouth(256, 282, 26, true);
  } else {
    // 기본 귀요미 표정
    cheek(125, 290, 44, 26);
    cheek(387, 290, 44, 26);
    sparkleEye(178, 242, 23, 27, false);
    sparkleEye(334, 242, 23, 27, false);
    catMouth(256, 274, 22, false);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  faceTexCache.set(kind, tex);
  return tex;
}

function addCast(mesh, shadow = true) {
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  return mesh;
}

// ---------- A. 둥글둥글 모찌형 소형 캐릭터 (치이카와/하치와레/우사기/랏코/쿠리만쥬/모몽가/시사) ----------
function buildMochiCharacter(kind) {
  const root = new THREE.Group();
  const bodyColors = {
    '치이카와': 0xfffdf8,
    '하치와레': 0xfffdf9,
    '우사기': 0xfde8a6,
    '랏코': 0xead5b7,
    '쿠리만쥬': 0xfaf0dc,
    '모몽가': 0xffffff,
    '시사': 0xf8e4c8,
  };
  const baseColor = bodyColors[kind] ?? 0xfffdf8;
  const bodyMat = makeMat(baseColor, 0.78, 0.02);

  // 통통한 아랫배 + 머리 일체형 모찌 실루엣
  const torso = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 18), bodyMat));
  torso.scale.set(1.03, 0.96, 0.94);
  torso.position.set(0, 0.5, 0);
  root.add(torso);

  const head = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.44, 26, 20), bodyMat));
  head.scale.set(1.05, 0.96, 0.96);
  head.position.set(0, 0.88, 0);
  root.add(head);

  // 앞면 만화 표정 곡면 데칼 (+Z 정면)
  const faceGeo = new THREE.SphereGeometry(0.448, 24, 18, Math.PI * 0.24, Math.PI * 0.52, Math.PI * 0.27, Math.PI * 0.46);
  const faceMat = new THREE.MeshBasicMaterial({
    map: drawMangaFaceTexture(kind),
    transparent: true,
    depthWrite: false,
  });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.scale.set(1.05, 0.96, 0.96);
  faceMesh.position.set(0, 0.88, 0);
  root.add(faceMesh);

  // 팔 관절 (어깨 피벗)
  const makeLimbPivot = (x, y, z, geo, mat, offsetY) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const m = addCast(new THREE.Mesh(geo, mat));
    m.position.y = offsetY;
    pivot.add(m);
    root.add(pivot);
    return pivot;
  };

  const armGeo = new THREE.CapsuleGeometry(0.105, 0.14, 6, 12);
  const leftArm = makeLimbPivot(-0.41, 0.66, 0.05, armGeo, bodyMat, -0.1);
  const rightArm = makeLimbPivot(0.41, 0.66, 0.05, armGeo, bodyMat, -0.1);
  leftArm.rotation.z = 0.28;
  rightArm.rotation.z = -0.28;

  // 발 관절
  const footGeo = new THREE.SphereGeometry(0.135, 14, 12);
  footGeo.scale(0.95, 0.72, 1.28);
  const leftLeg = makeLimbPivot(-0.19, 0.14, 0.04, footGeo, bodyMat, -0.04);
  const rightLeg = makeLimbPivot(0.19, 0.14, 0.04, footGeo, bodyMat, -0.04);

  // 귀 & 꼬리 그룹 (움직일 때 흔들림!)
  const earsGroup = new THREE.Group();
  root.add(earsGroup);
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.36, -0.4);
  root.add(tailGroup);

  let totalHeight = 1.48;

  // ---- 캐릭터별 고유 3D 조형 & 소품 ----
  if (kind === '치이카와') {
    for (const sx of [-1, 1]) {
      const ear = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 14), bodyMat));
      ear.scale.set(1.0, 1.0, 0.72);
      ear.position.set(sx * 0.29, 1.24, -0.02);
      earsGroup.add(ear);
    }
    const tail = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), bodyMat));
    tailGroup.add(tail);
    totalHeight = 1.42;
  } else if (kind === '하치와레') {
    const blueMat = makeMat(0x5d9ee6, 0.72);
    const innerEarMat = makeMat(0xf8b9c8, 0.8);
    // 뒷머리 파란 돔
    const cap = addCast(new THREE.Mesh(
      new THREE.SphereGeometry(0.452, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.44),
      blueMat
    ));
    cap.scale.set(1.05, 0.96, 0.96);
    cap.position.set(0, 0.885, -0.01);
    root.add(cap);
    // 시그니처 팔자(八) 앞머리 두 갈래
    for (const sx of [-1, 1]) {
      const bang = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), blueMat));
      bang.scale.set(1.15, 0.65, 0.62);
      bang.position.set(sx * 0.22, 1.13, 0.26);
      bang.rotation.z = -sx * 0.46;
      bang.rotation.y = sx * 0.22;
      root.add(bang);
      // 뾰족 고양이 귀
      const ear = addCast(new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.28, 12), blueMat));
      ear.position.set(sx * 0.27, 1.31, -0.02);
      ear.rotation.z = -sx * 0.22;
      earsGroup.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 10), innerEarMat);
      inner.position.set(sx * 0.27, 1.29, 0.05);
      inner.rotation.z = -sx * 0.22;
      earsGroup.add(inner);
    }
    // 고양이 꼬리
    const tail = addCast(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.34, 6, 10), blueMat));
    tail.rotation.x = -0.85;
    tail.position.set(0, 0.08, -0.14);
    tailGroup.add(tail);
    totalHeight = 1.5;
  } else if (kind === '우사기') {
    const innerPink = makeMat(0xf7b6c4, 0.78);
    for (const sx of [-1, 1]) {
      const ear = addCast(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.46, 8, 14), bodyMat));
      ear.scale.set(1.0, 1.0, 0.65);
      ear.position.set(sx * 0.16, 1.48, -0.02);
      ear.rotation.z = -sx * 0.12;
      earsGroup.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.34, 6, 10), innerPink);
      inner.scale.set(1, 1, 0.4);
      inner.position.set(sx * 0.16, 1.47, 0.04);
      inner.rotation.z = -sx * 0.12;
      earsGroup.add(inner);
    }
    const puff = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), bodyMat));
    tailGroup.add(puff);
    totalHeight = 1.82;
  } else if (kind === '랏코') {
    const brownMat = makeMat(0x8e6748, 0.76);
    const creamBelly = makeMat(0xfff7ea, 0.82);
    const redCape = makeMat(0xd65353, 0.75);
    const bladeMat = makeMat(0xe5edf5, 0.25, 0.65);
    const goldMat = makeMat(0xf4c44e, 0.35, 0.55);

    // 밝은 배 무늬
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), creamBelly);
    belly.scale.set(0.95, 0.9, 0.55);
    belly.position.set(0, 0.47, 0.28);
    root.add(belly);

    // 갈색 해달 귀
    for (const sx of [-1, 1]) {
      const ear = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), brownMat));
      ear.scale.set(1, 1, 0.68);
      ear.position.set(sx * 0.31, 1.21, -0.02);
      earsGroup.add(ear);
    }

    // 멋진 빨간 망토 머플러
    const scarf = addCast(new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.075, 10, 20), redCape));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 0.64, 0);
    root.add(scarf);

    // 등 뒤 미니 영웅 검!
    const sword = new THREE.Group();
    sword.position.set(0.02, 0.76, -0.45);
    sword.rotation.z = -0.68;
    const blade = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.72, 0.04), bladeMat));
    const guard = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.07), goldMat));
    guard.position.y = 0.24;
    const grip = addCast(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), brownMat));
    grip.position.y = 0.38;
    sword.add(blade, guard, grip);
    root.add(sword);

    // 해달 꼬리
    const tail = addCast(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 6, 10), brownMat));
    tail.rotation.x = -0.9;
    tail.position.set(0, 0.04, -0.1);
    tailGroup.add(tail);
    totalHeight = 1.48;
  } else if (kind === '쿠리만쥬') {
    // 밤만쥬 구운 윗껍질 (광택감 있는 구운 밤색!)
    const chestnutMat = makeMat(0xa86434, 0.42, 0.06);
    const cap = addCast(new THREE.Mesh(
      new THREE.SphereGeometry(0.453, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.42),
      chestnutMat
    ));
    cap.scale.set(1.05, 0.96, 0.96);
    cap.position.set(0, 0.89, 0);
    root.add(cap);

    for (const sx of [-1, 1]) {
      const ear = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), chestnutMat));
      ear.scale.set(1, 1, 0.7);
      ear.position.set(sx * 0.29, 1.23, -0.02);
      earsGroup.add(ear);
    }
    const tail = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), bodyMat));
    tailGroup.add(tail);
    totalHeight = 1.42;
  } else if (kind === '모몽가') {
    const creamInner = makeMat(0xfbe2e8, 0.82);
    const tuftMat = makeMat(0xffffff, 0.8);
    // 복슬복슬 앞머리 솜털
    for (const [tx, ty, r] of [[-0.12, 1.26, 0.11], [0, 1.31, 0.13], [0.12, 1.26, 0.11]]) {
      const puff = addCast(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), tuftMat));
      puff.position.set(tx, ty, 0.12);
      root.add(puff);
    }
    // 넓고 포근한 하늘다람쥐 귀
    for (const sx of [-1, 1]) {
      const ear = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), tuftMat));
      ear.scale.set(1.15, 0.92, 0.55);
      ear.position.set(sx * 0.34, 1.18, 0.0);
      earsGroup.add(ear);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), creamInner);
      inner.scale.set(1.0, 0.85, 0.45);
      inner.position.set(sx * 0.34, 1.17, 0.05);
      earsGroup.add(inner);
    }
    // 시그니처 거대하고 복슬복슬한 꼬리!
    const tailPuffs = [
      [0, 0.06, -0.08, 0.22],
      [0, 0.28, -0.22, 0.28],
      [0, 0.54, -0.26, 0.31],
      [0, 0.78, -0.18, 0.25],
    ];
    for (const [x, y, z, r] of tailPuffs) {
      const tp = addCast(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), tuftMat));
      tp.position.set(x, y, z);
      tailGroup.add(tp);
    }
    totalHeight = 1.5;
  } else if (kind === '시사') {
    const maneMat = makeMat(0xebd09a, 0.82);
    // 시사의 상징 복슬복슬 사자 갈기 링!
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const mx = Math.cos(a) * 0.43;
      const my = 0.88 + Math.sin(a) * 0.41;
      if (my < 0.62) continue; // 턱 아래는 비워 귀엽게
      const puff = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), maneMat));
      puff.position.set(mx, my, -0.06);
      root.add(puff);
    }
    for (const sx of [-1, 1]) {
      const ear = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), bodyMat));
      ear.scale.set(1.1, 0.9, 0.65);
      ear.position.set(sx * 0.32, 1.24, 0.02);
      earsGroup.add(ear);
    }
    const tail = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), maneMat));
    tail.position.set(0, 0.08, -0.06);
    tailGroup.add(tail);
    totalHeight = 1.52;
  }

  return {
    root,
    height: totalHeight,
    parts: { leftArm, rightArm, leftLeg, rightLeg, earsGroup, tailGroup },
  };
}

// ---------- B. 키 크고 다정한 갑옷 씨 3인방 (포셰트/노동/라멘 갑옷 씨) ----------
function buildYoroiCharacter(kind) {
  const root = new THREE.Group();
  const armorColors = {
    '포셰트갑옷씨': 0xcbd3dc,
    '노동갑옷씨': 0xb2bac6,
    '라멘갑옷씨': 0xbdc8d8,
  };
  const armorMat = makeMat(armorColors[kind] ?? 0xc4ccd6, 0.44, 0.36);
  const darkMetal = makeMat(0x525a66, 0.5, 0.32);
  const visorMat = makeMat(0x282d36, 0.3, 0.2);

  // 다리 관절 (갑옷 부츠)
  const makeLeg = (x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.56, 0);
    const shin = addCast(new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.32, 6, 12), armorMat));
    shin.position.y = -0.26;
    const boot = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.32), darkMetal));
    boot.position.set(0, -0.48, 0.05);
    pivot.add(shin, boot);
    root.add(pivot);
    return pivot;
  };
  const leftLeg = makeLeg(-0.17);
  const rightLeg = makeLeg(0.17);

  // 둥글고 친근한 갑옷 몸통
  const chest = addCast(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.37, 0.72, 18), armorMat));
  chest.position.y = 0.92;
  root.add(chest);
  const waist = addCast(new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.34, 0.14, 18), darkMetal));
  waist.position.y = 0.6;
  root.add(waist);

  // 팔 관절 + 둥근 어깨 견갑
  const makeArm = (x, s) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.18, 0);
    const pauldron = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), armorMat));
    const arm = addCast(new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 6, 12), armorMat));
    arm.position.y = -0.26;
    const glove = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), darkMetal));
    glove.position.y = -0.48;
    pivot.add(pauldron, arm, glove);
    pivot.rotation.z = s * 0.12;
    root.add(pivot);
    return pivot;
  };
  const leftArm = makeArm(-0.42, 1);
  const rightArm = makeArm(0.42, -1);

  // 둥근 투구 머리 + 다정한 바이저 눈
  const helmBase = addCast(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.34, 18), armorMat));
  helmBase.position.y = 1.48;
  const helmTop = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.315, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), armorMat));
  helmTop.position.y = 1.64;
  root.add(helmBase, helmTop);

  // 바이저 슬릿 & 반짝이는 친근한 눈
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.1), visorMat);
  visor.position.set(0, 1.52, 0.28);
  root.add(visor);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff8e6 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), eyeMat);
    eye.position.set(sx * 0.1, 1.52, 0.33);
    root.add(eye);
  }

  // ---- 갑옷 씨별 시그니처 소품 ----
  if (kind === '포셰트갑옷씨') {
    // 핑크 포셰트 크로스백!
    const pinkMat = makeMat(0xf48fb1, 0.72);
    const goldMat = makeMat(0xf7c954, 0.35, 0.5);
    const strap = addCast(new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.032, 8, 24), pinkMat));
    strap.position.set(0, 0.94, 0);
    strap.rotation.y = Math.PI / 4;
    strap.rotation.z = 0.55;
    root.add(strap);
    const bag = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.14), pinkMat));
    bag.position.set(0.3, 0.68, 0.24);
    bag.rotation.y = 0.4;
    const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), goldMat);
    clasp.position.set(0.34, 0.72, 0.31);
    root.add(bag, clasp);
  } else if (kind === '노동갑옷씨') {
    // 노란 안전·작업 띠 + 작업 파우치
    const yellowMat = makeMat(0xf6c453, 0.65);
    const band = addCast(new THREE.Mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.08, 18), yellowMat));
    band.position.y = 1.65;
    root.add(band);
    const badge = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), yellowMat));
    badge.position.set(-0.12, 1.04, 0.33);
    root.add(badge);
  } else if (kind === '라멘갑옷씨') {
    // 흰색 하치마키 머리띠 + 라멘 장인 앞치마!
    const whiteCloth = makeMat(0xfffdf8, 0.85);
    const apronMat = makeMat(0x4b3446, 0.85);
    const headband = addCast(new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.045, 8, 22), whiteCloth));
    headband.rotation.x = Math.PI / 2;
    headband.position.y = 1.66;
    root.add(headband);
    // 머리띠 매듭
    const knot = addCast(new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), whiteCloth));
    knot.position.set(0, 1.66, -0.34);
    root.add(knot);
    // 앞치마
    const apron = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.08), apronMat));
    apron.position.set(0, 0.78, 0.35);
    const crest = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), makeMat(0xfff8ec, 0.8));
    crest.position.set(0, 0.82, 0.395);
    root.add(apron, crest);
  }

  return {
    root,
    height: 1.98,
    parts: { leftArm, rightArm, leftLeg, rightLeg, earsGroup: null, tailGroup: null },
  };
}

// 캐릭터 이름(또는 id)을 정규화해 알맞은 3D 모델 생성
export function buildCharacter3D(nameOrId) {
  const raw = String(nameOrId || '').replace(/\s+/g, '');
  const map = {
    chiikawa: '치이카와',
    '치이카와': '치이카와',
    hachiware: '하치와레',
    '하치와레': '하치와레',
    usagi: '우사기',
    '우사기': '우사기',
    ceo: '랏코',
    rakko: '랏코',
    '랏코': '랏코',
    assistant: '쿠리만쥬',
    kurimanju: '쿠리만쥬',
    '쿠리만쥬': '쿠리만쥬',
    momonga: '모몽가',
    '모몽가': '모몽가',
    shisa: '시사',
    '시사': '시사',
    yoroi: '포셰트갑옷씨',
    '포셰트갑옷씨': '포셰트갑옷씨',
    'labor-yoroi': '노동갑옷씨',
    '노동갑옷씨': '노동갑옷씨',
    'ramen-yoroi': '라멘갑옷씨',
    '라멘갑옷씨': '라멘갑옷씨',
  };
  const kind = map[raw] || map[raw.toLowerCase()] || '치이카와';
  if (kind.includes('갑옷씨')) return buildYoroiCharacter(kind);
  return buildMochiCharacter(kind);
}
