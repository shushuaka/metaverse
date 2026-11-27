import * as THREE from 'three';

// 2단계 협업 & 미니게임 모듈:
// 1) 실시간 공유 화이트보드  2) 영구 저장 방명록 포스트잇
// 3) 야외 OX 퀴즈 이벤트     4) 실시간 동기화 돌림판  5) 3D 오피스 보물찾기

export const OX_ZONES = {
  O: { x0: 25.3, x1: 30.5, z0: -6.8, z1: 2.8, cx: 27.9, cz: -2.0 },
  X: { x0: 31.1, x1: 36.3, z0: -6.8, z1: 2.8, cx: 33.7, cz: -2.0 },
};

const QUIZ_CATEGORIES = [
  { id: 'all', label: '✨ 전체' },
  { id: 'chiikawa', label: '🐾 먼작귀' },
  { id: 'science', label: '🧠 상식·과학' },
  { id: 'korea', label: '🇰🇷 한국·문화' },
  { id: 'tech', label: '💻 IT·AI' },
  { id: 'food', label: '🍜 음식·일상' },
];

const QUIZ_PRESETS = [
  // 🐾 먼작귀 (8)
  { cat: 'chiikawa', q: '치이카와의 단짝 친구 파란 앞머리 고양이는 하치와레다!', a: 'O' },
  { cat: 'chiikawa', q: '우사기의 시그니처 외침은 "하아—" 이다!', a: 'X' },
  { cat: 'chiikawa', q: '랏코는 등 뒤에 멋진 검을 메고 다니는 토벌 랭킹 1위다!', a: 'O' },
  { cat: 'chiikawa', q: '모몽가는 조용하고 수줍음이 많은 성격이다!', a: 'X' },
  { cat: 'chiikawa', q: '쿠리만쥬는 맛있는 안주와 함께 "하아—" 하고 감탄하는 미식가다!', a: 'O' },
  { cat: 'chiikawa', q: '시사는 로우 라멘 가게에서 일하기 위해 슈퍼 알바 자격증을 땄다!', a: 'O' },
  { cat: 'chiikawa', q: '포셰트갑옷씨가 메고 다니는 가방은 파란색 상어 모양이다!', a: 'X' },
  { cat: 'chiikawa', q: '하치와레는 치이카와·우사기와 달리 완전한 문장으로 말을 잘한다!', a: 'O' },

  // 🧠 상식·과학 (8)
  { cat: 'science', q: '문어의 심장은 1개가 아니라 총 3개다!', a: 'O' },
  { cat: 'science', q: '기린의 목뼈 개수는 사람의 목뼈 개수(7개)보다 훨씬 많다!', a: 'X' },
  { cat: 'science', q: '천연 벌꿀은 밀봉 보관하면 수천 년이 지나도 거의 썩지 않는다!', a: 'O' },
  { cat: 'science', q: '북극곰의 털 아래 진짜 피부색은 하얀색이 아니라 검은색이다!', a: 'O' },
  { cat: 'science', q: '태양계에서 가장 뜨거운 행성은 태양에 제일 가까운 수성이다!', a: 'X' },
  { cat: 'science', q: '바나나 나무는 식물학적으로 나무가 아니라 거대한 풀(초본)이다!', a: 'O' },
  { cat: 'science', q: '소리는 공기 중보다 물속에서 더 빠르게 전달된다!', a: 'O' },
  { cat: 'science', q: '사람의 지문처럼 고양이의 코 무늬도 개체마다 모두 다르다!', a: 'O' },

  // 🇰🇷 한국·문화 (6)
  { cat: 'korea', q: '세종대왕이 훈민정음을 창제한 해는 1443년이다!', a: 'O' },
  { cat: 'korea', q: '대한민국에서 가장 높은 산은 지리산이다!', a: 'X' },
  { cat: 'korea', q: '태극기의 4괘(건·곤·감·리) 중 "감"은 물을 상징한다!', a: 'O' },
  { cat: 'korea', q: '제주도의 한라산 정상 화구호 이름은 천지다!', a: 'X' },
  { cat: 'korea', q: '대한민국 국보 제1호는 숭례문(남대문)이다!', a: 'O' },
  { cat: 'korea', q: '한국에서 해가 가장 먼저 뜨는 육지 명소 중 하나는 포항 호미곶이다!', a: 'O' },

  // 💻 IT·AI (6)
  { cat: 'tech', q: '컴퓨터 오류를 뜻하는 "버그(Bug)"는 실제로 기계에 낀 나방에서 유래했다!', a: 'O' },
  { cat: 'tech', q: '프로그래밍 언어 Python(파이썬)의 이름은 뱀이 아니라 코미디 프로그램에서 유래했다!', a: 'O' },
  { cat: 'tech', q: 'HTTP 상태 코드 404는 서버 요청이 성공했다는 뜻이다!', a: 'X' },
  { cat: 'tech', q: 'JPG(JPEG) 이미지는 투명 배경(알파 채널)을 기본으로 지원한다!', a: 'X' },
  { cat: 'tech', q: '키보드의 "QWERTY" 배열은 타자기 키가 엉키는 것을 줄이기 위해 만들어졌다!', a: 'O' },
  { cat: 'tech', q: '1GB(기가바이트)는 1TB(테라바이트)보다 큰 용량 단위다!', a: 'X' },

  // 🍜 음식·일상 (8)
  { cat: 'food', q: '토마토는 식물학적으로 채소가 아니라 과일(열매)에 속한다!', a: 'O' },
  { cat: 'food', q: '딸기는 사과·장미와 같은 "장미과" 식물이다!', a: 'O' },
  { cat: 'food', q: '에스프레소에 뜨거운 물을 타는 아메리카노는 이탈리아에서 먼저 발명됐다!', a: 'O' },
  { cat: 'food', q: '초콜릿의 주원료인 카카오는 땅속에서 자라는 뿌리 식물이다!', a: 'X' },
  { cat: 'food', q: '땅콩은 나무에서 열리는 견과류가 아니라 땅속에서 자라는 콩과 식물이다!', a: 'O' },
  { cat: 'food', q: '매운맛은 혀의 미각 세포가 느끼는 5대 기본 맛 중 하나다!', a: 'X' },
  { cat: 'food', q: '소금은 유통기한 표시가 의무가 아닌 대표적인 식품이다!', a: 'O' },
  { cat: 'food', q: '아이스크림은 영하 18도 이하 보관 시 세균 번식이 거의 없어 소비기한이 따로 없다!', a: 'O' },
];

const WHEEL_PRESETS = {
  lunch: ['라멘 🍜', '초밥 🍣', '떡볶이 🌶️', '파스타 🍝', '치킨 🍗', '삼겹살 🥩'],
  coffee: ['아아 ☕', '바닐라라떼 🥛', '말차라떼 🍵', '딸기스무디 🍓', '유자차 🍋', '초코라떼 🍫'],
  duty: ['하치와레', '우사기', '치이카와', '시사', '모몽가', '랏코 대표'],
};

const TREASURE_SPOTS = [
  { x: 0.0, y: 0.75, z: 5.6, hint: '에코 아트리움 나무 벤치 뒤쪽' },
  { x: -8.6, y: 0.75, z: -5.8, hint: '1조·2조 사이 에코 복도' },
  { x: 8.6, y: 0.75, z: -5.8, hint: '4조·5조 사이 에코 복도' },
  { x: -16.8, y: 0.75, z: 7.4, hint: '에코 가든 캠핑 라운지 잔디밭' },
  { x: 11.6, y: 0.75, z: 12.6, hint: '튜터실 · 멘토링 회의실 남쪽' },
  { x: 18.2, y: 0.75, z: 9.4, hint: '집중 업무 캡슐룸 앞' },
  { x: 30.8, y: 0.75, z: -7.2, hint: 'OX 퀴즈 광장 북쪽' },
  { x: -11.5, y: 1.3, z: -27.2, hint: '야외 숲속 LIVE STAGE 위' },
];

const NOTE_COLORS = ['#FFF3B0', '#FFD6E0', '#D8F3DC', '#D6ECFA', '#EAE0FA'];

export function createActivities({ scene, clientId, getProfile, player, npcs, showToast, appendChat, playChime, onQuizWarpToOx }) {
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

  let activeQuizCat = 'all';
  let recentQuizIdx = [];

  function pickRandomQuiz() {
    const pool = activeQuizCat === 'all'
      ? QUIZ_PRESETS
      : QUIZ_PRESETS.filter((p) => p.cat === activeQuizCat);
    if (!pool.length) return QUIZ_PRESETS[0];
    let candidates = pool.filter((p) => !recentQuizIdx.includes(p.q));
    if (!candidates.length) {
      recentQuizIdx = [];
      candidates = pool;
    }
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    recentQuizIdx.push(picked.q);
    if (recentQuizIdx.length > Math.min(18, pool.length - 1)) recentQuizIdx.shift();
    return picked;
  }

  function renderQuizCatTabs() {
    const bar = $('quiz-cat-tabs');
    if (!bar) return;
    bar.innerHTML = '';
    for (const c of QUIZ_CATEGORIES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset-chip' + (activeQuizCat === c.id ? ' on' : '');
      b.textContent = c.label;
      b.onclick = () => {
        activeQuizCat = c.id;
        renderQuizCatTabs();
        renderQuizPresets();
      };
      bar.appendChild(b);
    }
  }

  function renderQuizPresets() {
    const box = $('quiz-presets');
    if (!box) return;
    box.innerHTML = '';
    const list = activeQuizCat === 'all'
      ? QUIZ_PRESETS
      : QUIZ_PRESETS.filter((p) => p.cat === activeQuizCat);
    if ($('quiz-preset-count')) $('quiz-preset-count').textContent = String(list.length);
    list.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'preset-chip';
      b.title = p.q;
      b.textContent = p.q.slice(0, 26) + (p.q.length > 26 ? '…' : '');
      b.onclick = () => {
        $('quiz-q-input').value = p.q;
        $('quiz-a-select').value = p.a;
      };
      box.appendChild(b);
    });
  }
  renderQuizCatTabs();
  renderQuizPresets();

  if ($('btn-quiz-random')) {
    $('btn-quiz-random').onclick = () => {
      const p = pickRandomQuiz();
      $('quiz-q-input').value = p.q;
      $('quiz-a-select').value = p.a;
    };
  }
  if ($('btn-quiz-random-go')) {
    $('btn-quiz-random-go').onclick = () => {
      const p = pickRandomQuiz();
      $('quiz-q-input').value = p.q;
      $('quiz-a-select').value = p.a;
      $('games-modal').hidden = true;
      fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, question: p.q, answer: p.a, duration: 10 }),
      }).catch(() => {});
    };
  }

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
    if (onQuizWarpToOx) onQuizWarpToOx();

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

  // 게임 모달 탭 전환 (OX 퀴즈 · 3D 액션 · 파티게임 · 돌림판 · 보물찾기)
  const ALL_GAME_TABS = ['ox', 'action', 'party', 'wheel', 'treasure'];
  function switchGameTab(tab) {
    document.querySelectorAll('[data-game-tab]').forEach((x) => x.classList.toggle('on', x.dataset.gameTab === tab));
    for (const k of ALL_GAME_TABS) {
      const el = $(`pane-${k}`);
      if (el) el.hidden = k !== tab;
    }
    if (tab === 'treasure') updateTreasureUI();
  }
  document.querySelectorAll('[data-game-tab]').forEach((b) => {
    b.onclick = () => switchGameTab(b.dataset.gameTab);
  });
  function openGamesModal(tab = 'ox') {
    $('board-modal').hidden = true;
    $('games-modal').hidden = false;
    switchGameTab(tab);
  }
  $('games-close').onclick = () => { $('games-modal').hidden = true; };

  // ========================================================
  // 5-B. 보물찾기 전체 클리어 축하 이펙트 (2D 폭죽·컨페티 + 3D 황금 파티클 + 팡파레 배너)
  // ========================================================
  let celeb3d = null; // { points, geo, mat, vel, age, dur }
  let celeb2dRaf = 0;
  let celebBannerTimer = null;

  function playVictoryFanfare() {
    playChime(true);
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const seq = [
        [523.25, 0.00, 0.14], [659.25, 0.10, 0.14], [783.99, 0.20, 0.14],
        [1046.5, 0.32, 0.26], [880.00, 0.50, 0.14], [1046.5, 0.62, 0.18],
        [1318.5, 0.78, 0.45],
      ];
      const base = ctx.currentTime + 0.02;
      for (const [freq, off, dur] of seq) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, base + off);
        gain.gain.exponentialRampToValueAtTime(0.09, base + off + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, base + off + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(base + off);
        osc.stop(base + off + dur + 0.03);
      }
      setTimeout(() => { try { ctx.close(); } catch {} }, 1800);
    } catch { /* ignore */ }
  }

  function spawn3dCelebrationBurst(ox, oy, oz) {
    if (celeb3d) {
      scene.remove(celeb3d.points);
      celeb3d.geo.dispose();
      celeb3d.mat.dispose();
      celeb3d = null;
    }
    const count = 84;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#FFD54F'),
      new THREE.Color('#FF80AB'),
      new THREE.Color('#69F0AE'),
      new THREE.Color('#40C4FF'),
      new THREE.Color('#FFE57F'),
      new THREE.Color('#EA80FC'),
    ];
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.4 + Math.random() * 3.8;
      pos[i * 3] = ox + (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 1] = oy + 0.8 + Math.random() * 0.6;
      pos[i * 3 + 2] = oz + (Math.random() - 0.5) * 0.5;
      vel[i * 3] = Math.cos(ang) * spd;
      vel[i * 3 + 1] = 4.5 + Math.random() * 5.2;
      vel[i * 3 + 2] = Math.sin(ang) * spd;
      const c = palette[i % palette.length];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.42, vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    celeb3d = { points, geo, mat, vel, age: 0, dur: 4.2 };
  }

  function launch2dConfettiAndFireworks() {
    const canvas = $('celebration-canvas');
    if (!canvas) return;
    cancelAnimationFrame(celeb2dRaf);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.hidden = false;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ['#FFD54F', '#FF6B9D', '#58B98A', '#5B5CE6', '#4FC3F7', '#FFAB40', '#CE93D8', '#FFF176'];
    const confetti = [];
    for (let i = 0; i < 150; i++) {
      const fromSide = i < 40;
      confetti.push({
        x: fromSide ? (i < 20 ? 0 : W) : Math.random() * W,
        y: fromSide ? H * (0.45 + Math.random() * 0.35) : -20 - Math.random() * H * 0.45,
        vx: fromSide ? (i < 20 ? 5 + Math.random() * 8 : -(5 + Math.random() * 8)) : (Math.random() - 0.5) * 4,
        vy: fromSide ? -(8 + Math.random() * 9) : 2 + Math.random() * 4,
        w: 7 + Math.random() * 7,
        h: 5 + Math.random() * 5,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.24,
        color: colors[i % colors.length],
        shape: i % 5 === 0 ? 'circle' : 'rect',
      });
    }

    const sparks = [];
    const spawnFirework = (fx, fy) => {
      const baseCol = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 42; i++) {
        const a = (i / 42) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
        const spd = 2.4 + Math.random() * 5.8;
        sparks.push({
          x: fx, y: fy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 1,
          decay: 0.014 + Math.random() * 0.012,
          r: 2.6 + Math.random() * 2.4,
          color: i % 3 === 0 ? '#FFFDE7' : baseCol,
        });
      }
    };

    const burstTimes = [0, 420, 860, 1380, 1920];
    const burstFired = burstTimes.map(() => false);
    const startAt = performance.now();
    const totalMs = 5600;

    function frame(now) {
      const elapsedMs = now - startAt;
      ctx.clearRect(0, 0, W, H);
      burstTimes.forEach((bt, idx) => {
        if (!burstFired[idx] && elapsedMs >= bt) {
          burstFired[idx] = true;
          spawnFirework(W * (0.2 + Math.random() * 0.6), H * (0.16 + Math.random() * 0.32));
        }
      });

      const fadeOut = elapsedMs > totalMs - 1100 ? Math.max(0, (totalMs - elapsedMs) / 1100) : 1;
      ctx.globalAlpha = fadeOut;

      for (const p of confetti) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16;
        p.vx *= 0.992;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath(); ctx.arc(0, 0, p.w * 0.42, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.08;
        s.vx *= 0.975;
        s.vy *= 0.975;
        s.life -= s.decay;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.life) * fadeOut;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (elapsedMs < totalMs) {
        celeb2dRaf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
        canvas.hidden = true;
      }
    }
    celeb2dRaf = requestAnimationFrame(frame);
  }

  function triggerTreasureCelebration(customMsg = '') {
    playVictoryFanfare();
    launch2dConfettiAndFireworks();
    spawn3dCelebrationBurst(player.group.position.x, player.group.position.y, player.group.position.z);

    // 플레이어 기쁨 점프 + 축하 이모티콘 연발!
    if (player.jumpY <= 0.05) player.vy = 7.4;
    player.happyUntil = performance.now() + 4500;
    ['👑', '🎉', '✨', '🥳', '💎'].forEach((em, idx) => {
      setTimeout(() => { if (player.emote) player.emote(em); }, idx * 230);
    });

    // 상단 화려한 ALL CLEAR 축하 배너 표시
    const banner = $('treasure-clear-banner');
    if (banner) {
      const who = $('treasure-clear-who');
      if (who) who.textContent = customMsg || `${getProfile().name}님, 숨겨진 황금 보물 ${treasures.length}개를 모두 찾았어요!`;
      banner.hidden = false;
      clearTimeout(celebBannerTimer);
      celebBannerTimer = setTimeout(() => { banner.hidden = true; }, 7500);
    }
  }

  if ($('treasure-clear-close')) {
    $('treasure-clear-close').onclick = () => { $('treasure-clear-banner').hidden = true; };
  }
  if ($('treasure-clear-replay')) {
    $('treasure-clear-replay').onclick = () => {
      $('treasure-clear-banner').hidden = true;
      spawnTreasures();
      showToast('💎 오피스 곳곳에 새로운 보물 5개가 다시 숨겨졌습니다!');
    };
  }

  // 매 프레임 보물 회전 & 근접 자동 획득 체크 + 3D 축하 파티클 업데이트
  function update(dt, elapsed) {
    if (celeb3d) {
      celeb3d.age += dt;
      const arr = celeb3d.geo.attributes.position.array;
      const vel = celeb3d.vel;
      for (let i = 0; i < vel.length / 3; i++) {
        const i3 = i * 3;
        arr[i3] += vel[i3] * dt;
        arr[i3 + 1] += vel[i3 + 1] * dt;
        arr[i3 + 2] += vel[i3 + 2] * dt;
        vel[i3 + 1] -= 9.5 * dt;
        if (arr[i3 + 1] < 0.08) {
          arr[i3 + 1] = 0.08;
          vel[i3 + 1] *= -0.35;
          vel[i3] *= 0.8;
          vel[i3 + 2] *= 0.8;
        }
      }
      celeb3d.geo.attributes.position.needsUpdate = true;
      celeb3d.mat.opacity = Math.max(0, 1 - celeb3d.age / celeb3d.dur);
      if (celeb3d.age >= celeb3d.dur) {
        scene.remove(celeb3d.points);
        celeb3d.geo.dispose();
        celeb3d.mat.dispose();
        celeb3d = null;
      }
    }

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
        if (treasureFoundCount >= treasures.length) {
          player.say('👑 보물 5개 전부 발견!! 🎉', 5.5);
          showToast('👑 축하합니다! 숨겨진 먼작귀 보물 5개를 모두 찾았어요! 🎉');
          appendChat({ type: 'system', scope: 'all', text: `👑🎉 ${getProfile().name}님이 오피스 보물 5개를 모두 찾았습니다! 축하해요!`, time: Date.now() });
          triggerTreasureCelebration();
        } else {
          playChime(false);
          player.happyUntil = performance.now() + 1800;
          player.say(`💎 보물 발견! (${treasureFoundCount}/${treasures.length})`, 3.5);
          showToast(`💎 보물을 찾았어요! (${treasureFoundCount}/${treasures.length}) — 남은 힌트는 🎮 게임 메뉴에서 확인!`);
        }
      }
    }
  }

  return {
    openBoardModal,
    openGamesModal,
    triggerCelebration: triggerTreasureCelebration,
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
