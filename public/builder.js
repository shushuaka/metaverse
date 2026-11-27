import * as THREE from 'three';

// 4단계: ZEP 스타일 3D 맵 꾸미기 모드 (실시간 배치·회전·삭제·영구 저장)

export const PROP_CATALOG = [
  { type: 'plant', name: '🌿 화분' },
  { type: 'sofa', name: '🛋️ 파스텔 소파' },
  { type: 'table', name: '🍰 카페 테이블' },
  { type: 'lamp', name: '💡 감성 조명' },
  { type: 'cushion', name: '🧸 별빛 쿠션' },
  { type: 'stool', name: '🪑 스툴' },
  { type: 'neon', name: '🌈 네온 사인' },
  { type: 'sign', name: '🪧 문구 간판' },
];

function mat(color, rough = 0.78, metal = 0.05, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}

function makeSignTexture(text) {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#FFFDF7';
  ctx.fillRect(0, 0, 384, 160);
  ctx.fillStyle = '#F28CA8';
  ctx.fillRect(0, 0, 384, 24);
  ctx.strokeStyle = '#D5B28C';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 376, 152);
  ctx.fillStyle = '#3B2F26';
  ctx.font = '800 32px "Pretendard", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((text || '환영해요!').slice(0, 14), 192, 92);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPropMesh(type, label = '', isGhost = false) {
  const g = new THREE.Group();
  const add = (mesh) => {
    if (!isGhost) { mesh.castShadow = true; mesh.receiveShadow = true; }
    g.add(mesh);
    return mesh;
  };

  if (type === 'plant') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.52, 10), mat(0xd88c66, 0.75));
    pot.position.y = 0.26; add(pot);
    const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 1), mat(0x6bc280, 0.82));
    f1.position.y = 0.85; add(f1);
    const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 1), mat(0x8be09e, 0.82));
    f2.position.set(0.18, 1.24, 0.05); add(f2);
  } else if (type === 'sofa') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.46, 1.05), mat(0xf6b2c6, 0.9));
    base.position.y = 0.26; add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.68, 0.26), mat(0xee97b1, 0.9));
    back.position.set(0, 0.66, -0.4); add(back);
    for (const sx of [-1.1, 1.1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 1.05), mat(0xee97b1, 0.9));
      arm.position.set(sx, 0.42, 0); add(arm);
    }
  } else if (type === 'table') {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 16), mat(0xfff6ea, 0.6));
    top.position.y = 0.78; add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.76, 10), mat(0xc99664, 0.7));
    leg.position.y = 0.38; add(leg);
    const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), mat(0xffe0b5, 0.7));
    cake.position.y = 0.9; add(cake);
  } else if (type === 'lamp') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 12), mat(0x525864, 0.5));
    base.position.y = 0.04; add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.75, 8), mat(0xdab894, 0.6));
    pole.position.y = 0.92; add(pole);
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.38, 0.44, 14),
      new THREE.MeshStandardMaterial({ color: 0xfff0c2, emissive: 0xffd066, emissiveIntensity: 0.75, roughness: 0.5 })
    );
    shade.position.y = 1.82; add(shade);
    if (!isGhost) {
      const pl = new THREE.PointLight(0xffdc8c, 0.85, 8, 1.7);
      pl.position.y = 1.7;
      g.add(pl);
    }
  } else if (type === 'cushion') {
    const bean = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), mat(0x9cdbb9, 0.9));
    bean.scale.set(1.15, 0.55, 1.15);
    bean.position.y = 0.34; add(bean);
  } else if (type === 'stool') {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 14), mat(0xf7d794, 0.75));
    top.position.y = 0.52; add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8), mat(0xc99664, 0.75));
    leg.position.y = 0.25; add(leg);
  } else if (type === 'neon') {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.42), mat(0x464b56, 0.5));
    stand.position.y = 0.07; add(stand);
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.06, 10, 24),
      new THREE.MeshStandardMaterial({ color: 0xff9ad5, emissive: 0xff5eb8, emissiveIntensity: 1.1, roughness: 0.2 })
    );
    frame.position.y = 1.0; add(frame);
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({ color: 0x8ef3ff, emissive: 0x52dcff, emissiveIntensity: 1.0, roughness: 0.2 })
    );
    star.position.y = 1.0; add(star);
  } else if (type === 'sign') {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.45, 8), mat(0xc99664, 0.7));
    post.position.y = 0.72; add(post);
    const wood = mat(0xd8b48c, 0.72);
    const face = new THREE.MeshStandardMaterial({ map: makeSignTexture(label || '환영해요!'), roughness: 0.55 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 0.1), [wood, wood, wood, wood, face, face]);
    board.position.y = 1.45; add(board);
  }

  if (isGhost) {
    g.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const clone = Array.isArray(obj.material)
          ? obj.material.map((m) => { const c = m.clone(); c.transparent = true; c.opacity = 0.52; return c; })
          : (() => { const c = obj.material.clone(); c.transparent = true; c.opacity = 0.52; return c; })();
        obj.material = clone;
      }
    });
  }
  return g;
}

export function createBuilder({ scene, camera, canvas, clientId, groundHeightAt, showToast, playChime }) {
  const $ = (id) => document.getElementById(id);

  const propsGroup = new THREE.Group();
  scene.add(propsGroup);
  const placedMap = new Map(); // propId -> { data, group }

  let active = false;
  let deleteMode = false;
  let selectedType = PROP_CATALOG[0].type;
  let rotAngle = 0;
  let ghostMesh = null;
  const ghostPos = new THREE.Vector3(0, 0, 0);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  function rebuildGhost() {
    if (ghostMesh) scene.remove(ghostMesh);
    if (!active || deleteMode) { ghostMesh = null; return; }
    const label = $('build-sign-input')?.value.trim() || '환영해요!';
    ghostMesh = createPropMesh(selectedType, label, true);
    ghostMesh.position.copy(ghostPos);
    ghostMesh.rotation.y = rotAngle;
    scene.add(ghostMesh);
  }

  function addPropToScene(item) {
    if (!item || !item.id || placedMap.has(item.id)) return;
    const mesh = createPropMesh(item.type, item.label || '', false);
    mesh.position.set(item.x, item.y || 0, item.z);
    mesh.rotation.y = item.rot || 0;
    mesh.traverse((o) => { o.userData.customPropId = item.id; });
    propsGroup.add(mesh);
    placedMap.set(item.id, { data: item, group: mesh });
  }

  function removePropFromScene(propId) {
    const entry = placedMap.get(propId);
    if (!entry) return;
    propsGroup.remove(entry.group);
    placedMap.delete(propId);
  }

  function syncPropsList(list) {
    for (const id of [...placedMap.keys()]) removePropFromScene(id);
    for (const item of list || []) addPropToScene(item);
  }

  // 팔레트 버튼 렌더링
  const paletteBox = $('build-palette');
  for (const item of PROP_CATALOG) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dance-btn' + (item.type === selectedType ? ' on' : '');
    b.dataset.propType = item.type;
    b.textContent = item.name;
    b.onclick = () => {
      selectedType = item.type;
      deleteMode = false;
      $('btn-build-del').classList.remove('on');
      $('build-sign-input').hidden = selectedType !== 'sign';
      paletteBox.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      rebuildGhost();
    };
    paletteBox.appendChild(b);
  }

  $('build-sign-input').addEventListener('input', () => {
    if (selectedType === 'sign') rebuildGhost();
  });

  $('btn-build-rot').onclick = () => {
    rotAngle = (rotAngle + Math.PI / 4) % (Math.PI * 2);
    if (ghostMesh) ghostMesh.rotation.y = rotAngle;
  };
  $('btn-build-del').onclick = () => {
    deleteMode = !deleteMode;
    $('btn-build-del').classList.toggle('on', deleteMode);
    rebuildGhost();
    if (deleteMode) showToast('🗑️ 삭제 모드: 지우고 싶은 커스텀 가구를 클릭하세요!');
  };
  $('btn-build-clear').onclick = () => {
    if (!placedMap.size) return;
    fetch('/api/props/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId }),
    }).catch(() => {});
  };
  $('btn-build-exit').onclick = () => setActive(false);

  function setActive(on) {
    active = on;
    $('build-bar').hidden = !on;
    $('btn-build').classList.toggle('on', on);
    if (!on) {
      deleteMode = false;
      $('btn-build-del').classList.remove('on');
    } else {
      showToast('🪑 꾸미기 모드 ON! 바닥을 클릭해 가구를 배치하고 R 키로 회전하세요.');
    }
    rebuildGhost();
  }

  function updateGhostFromPointer(clientX, clientY, currentPlayerY = 0) {
    if (!active || deleteMode || !ghostMesh) return;
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    groundPlane.constant = -(currentPlayerY > 5 ? 10.2 : 0);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, hit)) {
      const gx = Math.round(hit.x * 2) / 2;
      const gz = Math.round(hit.z * 2) / 2;
      const gy = groundHeightAt(gx, gz);
      ghostPos.set(gx, gy, gz);
      ghostMesh.position.copy(ghostPos);
    }
  }

  function handleClick(e, currentPlayerY = 0) {
    if (!active) return false;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    if (deleteMode) {
      const hits = raycaster.intersectObjects(propsGroup.children, true);
      if (hits.length) {
        let o = hits[0].object;
        while (o && !o.userData.customPropId) o = o.parent;
        const pid = o?.userData?.customPropId;
        if (pid) {
          fetch('/api/props/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: clientId, propId: pid }),
          }).catch(() => {});
          playChime(false);
        }
      }
      return true;
    }

    updateGhostFromPointer(e.clientX, e.clientY, currentPlayerY);
    const label = selectedType === 'sign' ? ($('build-sign-input').value.trim() || '환영해요!') : '';
    const item = {
      type: selectedType,
      x: ghostPos.x,
      y: ghostPos.y,
      z: ghostPos.z,
      rot: rotAngle,
      label,
    };
    fetch('/api/props/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, prop: item }),
    }).catch(() => {});
    playChime(false);
    return true;
  }

  return {
    isActive: () => active,
    setActive,
    toggle: () => setActive(!active),
    rotate: () => { rotAngle = (rotAngle + Math.PI / 4) % (Math.PI * 2); if (ghostMesh) ghostMesh.rotation.y = rotAngle; },
    updateGhostFromPointer,
    handleClick,
    syncPropsList,
    onPropAdd: (item) => addPropToScene(item),
    onPropDelete: (pid) => removePropFromScene(pid),
    onPropsClear: () => syncPropsList([]),
  };
}
