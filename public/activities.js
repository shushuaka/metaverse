import * as THREE from 'three';

// 2단계 협업 & 미니게임 모듈:
// 1) 실시간 공유 화이트보드  2) 영구 저장 방명록 포스트잇
// 3) 야외 OX 퀴즈 이벤트     4) 실시간 동기화 돌림판  5) 3D 오피스 보물찾기

export const OX_ZONES = {
  O: { x0: 20.4, x1: 25.4, z0: -6.8, z1: 2.8, cx: 22.9, cz: -2.0 },
  X: { x0: 26.2, x1: 31.2, z0: -6.8, z1: 2.8, cx: 28.7, cz: -2.0 },
};

const QUIZ_PRESETS = [
  { q: '치이카와의 단짝 친구 파란 앞머리 고양이는 하치와레다!', a: 'O' },
  { q: '우사기의 시그니처 외침은 "하아—" 이다!', a: 'X' },
  { q: '오늘 점심은 면 요리(라멘·파스타)가 땡긴다!', a: 'O' },
  { q: '랏코는 등 뒤에 멋진 검을 메고 다니는 토벌 랭킹 1위다!', a: 'O' },
  { q: '모몽가는 조용하고 수줍음이 많은 성격이다!', a: 'X' },
];

const WHEEL_PRESETS = {
  lunch: ['라멘 🍜', '초밥 🍣', '떡볶이 🌶️', '파스타 🍝', '치킨 🍗', '삼겹살 🥩'],
  coffee: ['아아 ☕', '바닐라라떼 🥛', '말차라떼 🍵', '딸기스무디 🍓', '유자차 🍋', '초코라떼 🍫'],
  duty: ['하치와레', '우사기', '치이카와', '시사', '모몽가', '랏코 대표'],
};

const TREASURE_SPOTS = [
  { x: -16.4, y: 0.75, z: -6.2, hint: '대표실 책장 근처' },
  { x: -15.4, y: 0.75, z: 7.4, hint: '라운지 커피 바 옆' },
  { x: -15.8, y: 0.75, z: 2.2, hint: '회의실 스크린 앞' },
  { x: -11.5, y: 1.3, z: -25.6, hint: '야외 LIVE STAGE 위' },
  { x: 15.8, y: 0.75, z: -9.2, hint: '조사·검수팀 화분 옆' },
  { x: 25.8, y: 0.75, z: -7.5, hint: 'OX 퀴즈 광장 북쪽' },
  { x: 9.2, y: 0.75, z: 9.4, hint: '정문 입구 화분 옆' },
  { x: 0.6, y: 0.75, z: -9.6, hint: '기획·제작팀 간판 아래' },
];

const NOTE_COLORS = ['#FFF3B0', '#FFD6E0', '#D8F3DC', '#D6ECFA', '#EAE0FA'];

export function createActivities({ scene, clientId, getProfile, player, npcs, showToast, appendChat, playChime }) {
  const $ = (id) => document.getElementById(id);

  // ========================================================
  // 1. 실시간 공유 화이트보드
  // ========================================================
  const wbCanvas = $('wb-canvas');
  const wbCtx = wbCanvas.getContext('2d');
  let wbColor = '#3C2F27';
  let wbSize = 4;
  let wbDrawing = false;
  let wbPoints = [];
  let wbStrokes = [];

  function clearBoardCanvas() {
    wbCtx.fillStyle = '#FFFDF9';
    wbCtx.fillRect(0, 0, wbCanvas.width, wbCanvas.height);
    // 은은한 모눈
    wbCtx.strokeStyle = 'rgba(180, 160, 140, 0.14)';
    wbCtx.lineWidth = 1;
    for (let x = 24; x < wbCanvas.width; x += 24) {
      wbCtx.beginPath(); wbCtx.moveTo(x, 0); wbCtx.lineTo(x, wbCanvas.height); wbCtx.stroke();
    }
    for (let y = 24; y < wbCanvas.height; y += 24) {
      wbCtx.beginPath(); wbCtx.moveTo(0, y); wbCtx.lineTo(wbCanvas.width, y); wbCtx.stroke();
    }
  }

  function drawStrokeOnCanvas(st) {
    if (!st || !Array.isArray(st.points) || st.points.length < 2) return;
    wbCtx.save();
    wbCtx.strokeStyle = st.color || '#3C2F27';
    wbCtx.lineWidth = st.size || 4;
    wbCtx.lineCap = 'round';
    wbCtx.lineJoin = 'round';
    wbCtx.beginPath();
    wbCtx.moveTo(st.points[0][0], st.points[0][1]);
    for (let i = 1; i < st.points.length; i++) {
      wbCtx.lineTo(st.points[i][0], st.points[i][1]);
    }
    wbCtx.stroke();
    wbCtx.restore();
  }

  function redrawBoard(list) {
    wbStrokes = Array.isArray(list) ? list : [];
    clearBoardCanvas();
    for (const s of wbStrokes) drawStrokeOnCanvas(s);
  }
  clearBoardCanvas();

  function wbPos(e) {
    const r = wbCanvas.getBoundingClientRect();
    return [
      Math.round(((e.clientX - r.left) / r.width) * wbCanvas.width),
      Math.round(((e.clientY - r.top) / r.height) * wbCanvas.height),
    ];
  }

  wbCanvas.addEventListener('pointerdown', (e) => {
    wbDrawing = true;
    wbCanvas.setPointerCapture(e.pointerId);
    const p = wbPos(e);
    wbPoints = [p];
  });
  wbCanvas.addEventListener('pointermove', (e) => {
    if (!wbDrawing) return;
    const p = wbPos(e);
    const prev = wbPoints[wbPoints.length - 1];
    if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 2) return;
    wbPoints.push(p);
    drawStrokeOnCanvas({ color: wbColor, size: wbSize, points: [prev, p] });
  });
  function finishStroke() {
    if (!wbDrawing) return;
    wbDrawing = false;
    if (wbPoints.length >= 2) {
      const stroke = { color: wbColor, size: wbSize, points: wbPoints.slice(0, 160) };
      wbStrokes.push(stroke);
      fetch('/api/board/stroke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, stroke }),
      }).catch(() => {});
    }
    wbPoints = [];
  }
  wbCanvas.addEventListener('pointerup', finishStroke);
  wbCanvas.addEventListener('pointercancel', finishStroke);

  document.querySelectorAll('[data-wb-color]').forEach((b) => {
    b.onclick = () => {
      wbColor = b.dataset.wbColor;
      document.querySelectorAll('[data-wb-color]').forEach((x) => x.classList.toggle('active', x === b));
    };
  });
  document.querySelectorAll('[data-wb-size]').forEach((b) => {
    b.onclick = () => {
      wbSize = Number(b.dataset.wbSize);
      document.querySelectorAll('[data-wb-size]').forEach((x) => x.classList.toggle('active', x === b));
    };
  });
  $('wb-clear').onclick = () => {
    clearBoardCanvas();
    wbStrokes = [];
    fetch('/api/board/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId }),
    }).catch(() => {});
  };

  // ========================================================
  // 2. 방명록 포스트잇 (영구 저장)
  // ========================================================
  let notes = [];
  let noteColor = NOTE_COLORS[0];

  function renderNotes() {
    const grid = $('notes-grid');
    grid.innerHTML = '';
    if (!notes.length) {
      grid.innerHTML = '<div class="empty-note">아직 방명록이 없어요! 첫 번째 포스트잇을 남겨 보세요 ✨</div>';
      return;
    }
    for (const n of [...notes].reverse()) {
      const card = document.createElement('div');
      card.className = 'sticky-card';
      card.style.background = n.color || '#FFF3B0';
      const delBtn = document.createElement('button');
      delBtn.className = 'sticky-del';
      delBtn.textContent = '×';
      delBtn.title = '삭제';
      delBtn.onclick = () => {
        fetch('/api/notes/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: clientId, noteId: n.id }),
        }).catch(() => {});
      };
      const txt = document.createElement('div');
      txt.className = 'sticky-text';
      txt.textContent = n.text;
      const meta = document.createElement('div');
      meta.className = 'sticky-meta';
      const d = new Date(n.time || Date.now());
      meta.textContent = `— ${n.author} · ${d.getMonth() + 1}/${d.getDate()}`;
      card.append(delBtn, txt, meta);
      grid.appendChild(card);
    }
  }

  const noteSwatches = $('note-colors');
  NOTE_COLORS.forEach((c, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (idx === 0 ? ' active' : '');
    b.style.background = c;
    b.onclick = () => {
      noteColor = c;
      noteSwatches.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('active', x === b));
    };
    noteSwatches.appendChild(b);
  });

  $('note-form').onsubmit = (e) => {
    e.preventDefault();
    const text = $('note-input').value.trim();
    if (!text) return;
    $('note-input').value = '';
    const prof = getProfile();
    fetch('/api/notes/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, author: prof.name, text, color: noteColor }),
    }).catch(() => {});
  };

  // 보드 모달 탭 전환
  document.querySelectorAll('[data-board-tab]').forEach((b) => {
    b.onclick = () => {
      const t = b.dataset.boardTab;
      document.querySelectorAll('[data-board-tab]').forEach((x) => x.classList.toggle('on', x === b));
      $('pane-wb').hidden = t !== 'wb';
      $('pane-notes').hidden = t !== 'notes';
    };
  });

  function openBoardModal(tab = 'wb') {
    $('games-modal').hidden = true;
    $('board-modal').hidden = false;
    document.querySelectorAll('[data-board-tab]').forEach((x) => x.classList.toggle('on', x.dataset.boardTab === tab));
    $('pane-wb').hidden = tab !== 'wb';
    $('pane-notes').hidden = tab !== 'notes';
  }
  $('board-close').onclick = () => { $('board-modal').hidden = true; };

  // ========================================================
  // 3. 야외 OX 퀴즈 이벤트
  // ========================================================
  let activeQuiz = null;
  let quizInterval = null;

  function renderQuizPresets() {
    const box = $('quiz-presets');
    box.innerHTML = '';
    QUIZ_PRESETS.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset-chip';
      b.textContent = p.q.slice(0, 22) + (p.q.length > 22 ? '…' : '');
      b.onclick = () => {
        $('quiz-q-input').value = p.q;
        $('quiz-a-select').value = p.a;
      };
      box.appendChild(b);
    });
  }
  renderQuizPresets();

  $('quiz-start-form').onsubmit = (e) => {
    e.preventDefault();
    const q = $('quiz-q-input').value.trim();
    const a = $('quiz-a-select').value === 'X' ? 'X' : 'O';
    if (!q) return;
    $('games-modal').hidden = true;
    fetch('/api/quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, question: q, answer: a, duration: 10 }),
    }).catch(() => {});
  };

  function inRect(x, z, r) {
    return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  }

  function startQuizLocal(quiz) {
    activeQuiz = quiz;
    clearInterval(quizInterval);
    $('quiz-banner').hidden = false;
    $('quiz-banner-q').textContent = quiz.question;
    $('quiz-banner-result').hidden = true;

    // AI 직원들도 신나서 O 또는 X 구역으로 달려가서 참여!
    npcs.slice(0, 6).forEach((n, i) => {
      const pick = Math.random() < 0.6 ? quiz.answer : (quiz.answer === 'O' ? 'X' : 'O');
      const r = OX_ZONES[pick];
      const tx = r.cx + ((i % 3) - 1) * 1.4;
      const tz = r.cz + (i < 3 ? -1.4 : 1.4);
      n.followPlayer = false;
      n.setRoute(tx, tz, 0, 0);
      n.say(pick === 'O' ? '난 O다!! ⭕' : '아니야 X야!! ❌', 4);
    });

    const tickQuiz = () => {
      if (!activeQuiz) return;
      const rem = Math.max(0, Math.ceil((activeQuiz.endsAt - Date.now()) / 1000));
      $('quiz-banner-timer').textContent = `${rem}초`;
      if (rem <= 0) {
        clearInterval(quizInterval);
        const px = player.group.position.x, pz = player.group.position.z;
        const myPick = inRect(px, pz, OX_ZONES.O) ? 'O' : inRect(px, pz, OX_ZONES.X) ? 'X' : '';
        const won = myPick === activeQuiz.answer;
        const resEl = $('quiz-banner-result');
        resEl.hidden = false;
        resEl.textContent = `정답은 [ ${activeQuiz.answer} ]! ` + (
          !myPick ? 'OX 광장에 없어서 아쉽네요!' : won ? '🎉 정답입니다! 최고예요!' : '😅 아쉽게 오답! 다음 문제 도전!'
        );
        if (won) {
          player.happyUntil = performance.now() + 2600;
          player.say(`🎉 ${activeQuiz.answer} 정답!!`, 4.5);
          playChime(true);
        } else if (myPick) {
          player.say('앗 틀렸다! 😭', 3.5);
        }
        setTimeout(() => {
          $('quiz-banner').hidden = true;
          activeQuiz = null;
        }, 5500);
      }
    };
    tickQuiz();
    quizInterval = setInterval(tickQuiz, 250);
  }

  // ========================================================
  // 4. 실시간 동기화 돌림판
  // ========================================================
  const wheelCanvas = $('wheel-canvas');
  const wCtx = wheelCanvas.getContext('2d');
  let wheelItems = [...WHEEL_PRESETS.lunch];
  let wheelAngle = 0;
  let wheelSpinning = false;

  const WHEEL_COLORS = ['#FFD6A5', '#FDFFB6', '#CAFFBF', '#A0C4FF', '#FFC6FF', '#FFADAD', '#9BF6FF', '#E4C1F9'];

  function drawWheel(angle) {
    const cx = wheelCanvas.width / 2, cy = wheelCanvas.height / 2, r = cx - 12;
    wCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    const n = Math.max(2, wheelItems.length);
    const slice = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      const a0 = angle + i * slice;
      const a1 = a0 + slice;
      wCtx.beginPath();
      wCtx.moveTo(cx, cy);
      wCtx.arc(cx, cy, r, a0, a1);
      wCtx.closePath();
      wCtx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      wCtx.fill();
      wCtx.strokeStyle = '#FFFDF9';
      wCtx.lineWidth = 3;
      wCtx.stroke();

      wCtx.save();
      wCtx.translate(cx, cy);
      wCtx.rotate(a0 + slice / 2);
      wCtx.fillStyle = '#3B2F26';
      wCtx.font = '800 14px "Pretendard", "Malgun Gothic", sans-serif';
      wCtx.textAlign = 'right';
      wCtx.textBaseline = 'middle';
      wCtx.fillText(wheelItems[i].slice(0, 10), r - 14, 0);
      wCtx.restore();
    }
    // 가운데 허브 & 상단 포인터
    wCtx.beginPath(); wCtx.arc(cx, cy, 18, 0, Math.PI * 2);
    wCtx.fillStyle = '#FFFDF9'; wCtx.fill();
    wCtx.strokeStyle = '#D9B896'; wCtx.lineWidth = 4; wCtx.stroke();

    // 상단 포인터 화살표 (아래쪽 당첨 칸을 정확히 가리키도록!)
    wCtx.fillStyle = '#EE6C8E';
    wCtx.strokeStyle = '#FFFDF9';
    wCtx.lineWidth = 2.5;
    wCtx.beginPath();
    wCtx.moveTo(cx, 28);
    wCtx.lineTo(cx - 12, 4);
    wCtx.lineTo(cx + 12, 4);
    wCtx.closePath();
    wCtx.fill();
    wCtx.stroke();
  }

  $('wheel-items-input').value = wheelItems.join(', ');
  drawWheel(0);

  $('wheel-items-input').addEventListener('input', () => {
    const arr = $('wheel-items-input').value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
    if (arr.length >= 2) { wheelItems = arr; drawWheel(wheelAngle); }
  });
  document.querySelectorAll('[data-wheel-preset]').forEach((b) => {
    b.onclick = () => {
      const list = WHEEL_PRESETS[b.dataset.wheelPreset];
      if (!list) return;
      wheelItems = [...list];
      $('wheel-items-input').value = wheelItems.join(', ');
      drawWheel(wheelAngle);
    };
  });

  function spinWheelLocal({ items, winnerIndex, by }) {
    if (Array.isArray(items) && items.length >= 2) {
      wheelItems = items;
      $('wheel-items-input').value = items.join(', ');
    }
    const n = wheelItems.length;
    const slice = (Math.PI * 2) / n;
    // 상단 포인터는 -Math.PI/2 위치! winnerIndex의 중앙이 -Math.PI/2에 오도록 목표 각도 계산
    const targetMod = (-Math.PI / 2) - (winnerIndex + 0.5) * slice;
    const startAngle = wheelAngle;
    const extraTurns = Math.PI * 2 * 5;
    let delta = ((targetMod - startAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const endAngle = startAngle + extraTurns + delta;
    const dur = 3200;
    const t0 = performance.now();
    wheelSpinning = true;
    $('wheel-result').textContent = `🎡 ${by || '대표'}님이 돌림판을 돌리는 중...`;

    function stepWheel(now) {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3.2);
      wheelAngle = startAngle + (endAngle - startAngle) * ease;
      drawWheel(wheelAngle);
      if (p < 1) {
        requestAnimationFrame(stepWheel);
      } else {
        wheelSpinning = false;
        const winText = wheelItems[winnerIndex] || wheelItems[0];
        $('wheel-result').textContent = `🎉 당첨 결과: 【 ${winText} 】`;
        playChime(true);
        showToast(`🎡 돌림판 당첨: ${winText}!`);
      }
    }
    requestAnimationFrame(stepWheel);
  }

  $('btn-wheel-spin').onclick = () => {
    if (wheelSpinning) return;
    const items = $('wheel-items-input').value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);
    if (items.length < 2) return;
    fetch('/api/wheel/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, items }),
    }).catch(() => {});
  };

  // ========================================================
  // 5. 3D 오피스 보물찾기 (숨겨진 황금 별 5개)
  // ========================================================
  const treasureGroup = new THREE.Group();
  scene.add(treasureGroup);
  let treasures = []; // { mesh, x, z, found, hint }
  let treasureFoundCount = 0;

  function spawnTreasures() {
    while (treasureGroup.children.length) treasureGroup.remove(treasureGroup.children[0]);
    const shuffled = [...TREASURE_SPOTS].sort(() => Math.random() - 0.5).slice(0, 5);
    treasures = shuffled.map((sp) => {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffd54f,
          emissive: 0xffa726,
          emissiveIntensity: 0.55,
          roughness: 0.2,
          metalness: 0.35,
        })
      );
      gem.position.set(sp.x, sp.y, sp.z);
      gem.castShadow = true;
      treasureGroup.add(gem);
      return { mesh: gem, baseY: sp.y, x: sp.x, z: sp.z, hint: sp.hint, found: false };
    });
    treasureFoundCount = 0;
    updateTreasureUI();
  }

  function updateTreasureUI() {
    $('treasure-count').textContent = `${treasureFoundCount} / ${treasures.length}`;
    const hints = treasures.filter((t) => !t.found).map((t) => `💎 ${t.hint}`);
    $('treasure-hints').textContent = hints.length ? `남은 힌트: ${hints.slice(0, 2).join(' · ')}` : '👑 모든 보물을 다 찾았어요! 대단해요!';
  }

  $('btn-treasure-reset').onclick = () => {
    spawnTreasures();
    showToast('💎 오피스 곳곳에 새로운 보물 5개가 숨겨졌습니다! 가까이 다가가면 획득해요.');
    $('games-modal').hidden = true;
  };
  spawnTreasures();

  // 게임 모달 탭 전환
  document.querySelectorAll('[data-game-tab]').forEach((b) => {
    b.onclick = () => {
      const t = b.dataset.gameTab;
      document.querySelectorAll('[data-game-tab]').forEach((x) => x.classList.toggle('on', x === b));
      $('pane-ox').hidden = t !== 'ox';
      $('pane-wheel').hidden = t !== 'wheel';
      $('pane-treasure').hidden = t !== 'treasure';
    };
  });
  function openGamesModal(tab = 'ox') {
    $('board-modal').hidden = true;
    $('games-modal').hidden = false;
    document.querySelectorAll('[data-game-tab]').forEach((x) => x.classList.toggle('on', x.dataset.gameTab === tab));
    $('pane-ox').hidden = tab !== 'ox';
    $('pane-wheel').hidden = tab !== 'wheel';
    $('pane-treasure').hidden = tab !== 'treasure';
    updateTreasureUI();
  }
  $('games-close').onclick = () => { $('games-modal').hidden = true; };

  // 매 프레임 보물 회전 & 근접 자동 획득 체크
  function update(dt, elapsed) {
    const px = player.group.position.x, pz = player.group.position.z;
    for (const t of treasures) {
      if (t.found) continue;
      t.mesh.rotation.y = elapsed * 2.2;
      t.mesh.position.y = t.baseY + Math.sin(elapsed * 3.4 + t.x) * 0.16;
      if (Math.hypot(t.x - px, t.z - pz) < 1.55) {
        t.found = true;
        t.mesh.visible = false;
        treasureFoundCount++;
        updateTreasureUI();
        playChime(treasureFoundCount >= treasures.length);
        player.happyUntil = performance.now() + 1800;
        if (treasureFoundCount >= treasures.length) {
          player.say('👑 보물 5개 전부 발견!!', 5);
          showToast('👑 축하합니다! 숨겨진 먼작귀 보물 5개를 모두 찾았어요!');
          appendChat({ type: 'system', scope: 'all', text: `👑 ${getProfile().name}님이 오피스 보물 5개를 모두 찾았습니다!`, time: Date.now() });
        } else {
          player.say(`💎 보물 발견! (${treasureFoundCount}/${treasures.length})`, 3.5);
          showToast(`💎 보물을 찾았어요! (${treasureFoundCount}/${treasures.length}) — 남은 힌트는 🎮 게임 메뉴에서 확인!`);
        }
      }
    }
  }

  return {
    openBoardModal,
    openGamesModal,
    update,
    applySnapshot: (snap) => {
      if (Array.isArray(snap.boardStrokes)) redrawBoard(snap.boardStrokes);
      if (Array.isArray(snap.notes)) { notes = snap.notes; renderNotes(); }
      if (snap.activeQuiz && snap.activeQuiz.endsAt > Date.now()) startQuizLocal(snap.activeQuiz);
    },
    onBoardStroke: (st) => { wbStrokes.push(st); drawStrokeOnCanvas(st); },
    onBoardClear: () => { wbStrokes = []; clearBoardCanvas(); },
    onNotesUpdate: (list) => { notes = Array.isArray(list) ? list : []; renderNotes(); },
    onQuizStart: (quiz) => startQuizLocal(quiz),
    onWheelSpin: (data) => spinWheelLocal(data),
  };
}
