import * as THREE from 'three';
import { CCTV_CAMERAS } from './world.js';

// 🛡️ 관리실 · 보안 관제실 모듈
// - 구역별 실시간 3D CCTV 멀티캠 (그리드 / 단독 확대 / PTZ 좌우 회전 / 야간투시 토글)
// - 전체 채팅 · 프라이빗 · 귓속말 · 1:1 DM 통합 실시간 감청 로그
// - 강력한 관리자 권한 (강퇴 / 영구 밴 / 밴 해제 / 채팅 금지 / 마이크 강제 음소거 / 경고 / 관제실 소환)

function fmtClock(ms = Date.now()) {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function fmtStamp(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${fmtClock(ms)}`;
}

export function createControlRoom({
  scene,
  renderer,
  player,
  remotes,
  npcs,
  clientId,
  onlineDirectory,
  getZoneAt,
  warpTo,
  showToast,
  playChime,
  playNote,
  onAdminAuthChange,
}) {
  const $ = (id) => document.getElementById(id);

  let isAdmin = false;
  let auditLog = [];
  let banList = [];
  let mutedIds = new Set();
  let inquiries = [];
  const inqDrafts = new Map(); // inqId -> 작성 중인 답변 (목록 갱신 시 유지)
  let activeInqFilter = 'open'; // 'open' | 'answered' | 'closed' | 'all'
  let activeRightTab = 'logs'; // 'logs' | 'users' | 'bans' | 'inquiries'
  let activeLogFilter = 'all'; // 'all' | 'public' | 'private' | 'dm' | 'system'
  let focusedCamId = null;     // null = 멀티캠 그리드, string = 단독 확대
  let nightVision = false;
  let ptzYawOffset = 0;

  // 3D CCTV 오프스크린 렌더 타깃 (저부하 고속 캡처)
  const RT_W = 256;
  const RT_H = 144;
  const cctvRT = new THREE.WebGLRenderTarget(RT_W, RT_H, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });
  const pixelBuf = new Uint8Array(RT_W * RT_H * 4);
  const cctvCamera = new THREE.PerspectiveCamera(56, RT_W / RT_H, 0.2, 95);
  const camCanvases = new Map(); // camId -> { canvas, ctx, imgData, countEl }
  let camCursor = 0;
  let lastCaptureAt = 0;

  // ---------- CCTV 멀티캠 DOM 카드 생성 ----------
  function buildCctvGrid() {
    const grid = $('cctv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    camCanvases.clear();

    const list = focusedCamId
      ? CCTV_CAMERAS.filter((c) => c.id === focusedCamId)
      : CCTV_CAMERAS;
    grid.classList.toggle('single-mode', !!focusedCamId);
    if ($('cctv-ptz-bar')) $('cctv-ptz-bar').hidden = !focusedCamId;

    for (const cam of list) {
      const card = document.createElement('div');
      card.className = 'cctv-card' + (focusedCamId ? ' focused' : '');
      const canvas = document.createElement('canvas');
      canvas.width = RT_W;
      canvas.height = RT_H;
      canvas.className = 'cctv-canvas';

      const foot = document.createElement('div');
      foot.className = 'cctv-card-foot';
      const title = document.createElement('span');
      title.className = 'cctv-cam-label';
      title.textContent = `${cam.code} · ${cam.label}`;
      const countEl = document.createElement('span');
      countEl.className = 'cctv-cam-count';
      countEl.textContent = '👤 0';
      foot.append(title, countEl);

      card.append(canvas, foot);
      card.title = focusedCamId ? '클릭하여 멀티캠 그리드로 복귀' : `${cam.label} CCTV 크게 보기`;
      card.onclick = () => {
        if (focusedCamId === cam.id) {
          focusedCamId = null;
          ptzYawOffset = 0;
        } else {
          focusedCamId = cam.id;
          ptzYawOffset = 0;
        }
        buildCctvGrid();
      };
      grid.appendChild(card);

      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(RT_W, RT_H);
      camCanvases.set(cam.id, { cam, canvas, ctx, imgData, countEl });
    }
  }

  function countActorsInZone(zoneId) {
    let n = 0;
    const pz = getZoneAt(player.group.position.x, player.group.position.z);
    if (pz.id === zoneId) n++;
    for (const r of remotes.values()) {
      if (getZoneAt(r.group.position.x, r.group.position.z).id === zoneId) n++;
    }
    for (const npc of npcs) {
      if (getZoneAt(npc.group.position.x, npc.group.position.z).id === zoneId) n++;
    }
    return n;
  }

  function captureOneCamera(entry) {
    const { cam, ctx, imgData, countEl } = entry;
    const prevPlayerVis = player.group.visible;
    player.group.visible = true;

    const [px, py, pz] = cam.pos;
    let [lx, ly, lz] = cam.look;
    if (focusedCamId === cam.id && ptzYawOffset !== 0) {
      const dx = lx - px;
      const dz = lz - pz;
      const cos = Math.cos(ptzYawOffset);
      const sin = Math.sin(ptzYawOffset);
      lx = px + dx * cos - dz * sin;
      lz = pz + dx * sin + dz * cos;
    }

    cctvCamera.position.set(px, py, pz);
    cctvCamera.lookAt(lx, ly, lz);
    cctvCamera.updateMatrixWorld();

    const prevRT = renderer.getRenderTarget();
    renderer.setRenderTarget(cctvRT);
    renderer.render(scene, cctvCamera);
    renderer.readRenderTargetPixels(cctvRT, 0, 0, RT_W, RT_H, pixelBuf);
    renderer.setRenderTarget(prevRT);
    player.group.visible = prevPlayerVis;

    // WebGL Y-flip + 선택적 야간투시(녹색 톤) / 보안 CCTV 컬러 보정
    const out = imgData.data;
    for (let y = 0; y < RT_H; y++) {
      const srcRow = (RT_H - 1 - y) * RT_W * 4;
      const dstRow = y * RT_W * 4;
      const scanDim = (y % 3 === 0) ? 0.90 : 1.0;
      for (let x = 0; x < RT_W; x++) {
        const si = srcRow + x * 4;
        const di = dstRow + x * 4;
        const r = pixelBuf[si];
        const g = pixelBuf[si + 1];
        const b = pixelBuf[si + 2];
        if (nightVision) {
          const lum = Math.min(255, (0.299 * r + 0.587 * g + 0.114 * b) * 1.18);
          out[di] = Math.round(lum * 0.22 * scanDim);
          out[di + 1] = Math.min(255, Math.round(lum * 1.05 * scanDim));
          out[di + 2] = Math.round(lum * 0.36 * scanDim);
        } else {
          out[di] = Math.round(r * 0.96 * scanDim);
          out[di + 1] = Math.round(g * 1.0 * scanDim);
          out[di + 2] = Math.min(255, Math.round(b * 1.04 * scanDim));
        }
        out[di + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // CCTV HUD 오버레이 (● REC, 캠 번호, 타임스탬프, 조준 코너 가이드)
    const people = countActorsInZone(cam.zoneId);
    if (countEl) {
      countEl.textContent = people > 0 ? `👤 ${people}명 감지` : '👤 0';
      countEl.classList.toggle('detected', people > 0);
    }

    ctx.fillStyle = 'rgba(4, 10, 20, 0.56)';
    ctx.fillRect(0, 0, RT_W, 20);
    ctx.fillRect(0, RT_H - 17, RT_W, 17);

    // 깜빡이는 REC 점
    const recBlink = Math.floor(Date.now() / 550) % 2 === 0;
    ctx.fillStyle = recBlink ? '#EF4444' : '#7F1D1D';
    ctx.beginPath();
    ctx.arc(10, 10, 3.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '700 10px monospace';
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(`REC ${cam.code}`, 18, 13.5);
    ctx.fillStyle = nightVision ? '#4ADE80' : '#38BDF8';
    ctx.textAlign = 'right';
    ctx.fillText(cam.label, RT_W - 6, 13.5);

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
    ctx.font = '600 9.5px monospace';
    ctx.fillText(fmtStamp(), 6, RT_H - 5);
    if (people > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FDE047';
      ctx.fillText(`DETECT:${people}`, RT_W - 6, RT_H - 5);
    }
    ctx.textAlign = 'left';

    // 코너 프레임 브래킷
    ctx.strokeStyle = nightVision ? 'rgba(74, 222, 128, 0.5)' : 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.2;
    const m = 6, b = 10;
    ctx.beginPath();
    ctx.moveTo(m, 24 + b); ctx.lineTo(m, 24); ctx.lineTo(m + b, 24);
    ctx.moveTo(RT_W - m - b, 24); ctx.lineTo(RT_W - m, 24); ctx.lineTo(RT_W - m, 24 + b);
    ctx.moveTo(m, RT_H - 22 - b); ctx.lineTo(m, RT_H - 22); ctx.lineTo(m + b, RT_H - 22);
    ctx.moveTo(RT_W - m - b, RT_H - 22); ctx.lineTo(RT_W - m, RT_H - 22); ctx.lineTo(RT_W - m, RT_H - 22 - b);
    ctx.stroke();
  }

  function updateCctvFeeds() {
    const modal = $('control-room-modal');
    if (!modal || modal.hidden || !isAdmin) return;
    const now = performance.now();
    const interval = focusedCamId ? 75 : 110;
    if (now - lastCaptureAt < interval) return;
    lastCaptureAt = now;

    const entries = [...camCanvases.values()];
    if (!entries.length) return;
    const entry = entries[camCursor % entries.length];
    camCursor = (camCursor + 1) % entries.length;
    try {
      captureOneCamera(entry);
    } catch { /* ignore */ }
  }

  // ---------- 관리자 액션 호출 ----------
  async function execAdminAction(payload, successMsg = '') {
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        showToast('⚠️ 관리자 명령 실행에 실패했습니다. 대상이나 권한을 확인해 주세요.');
        return null;
      }
      if (Array.isArray(data.bans)) banList = data.bans;
      if (Array.isArray(data.mutedIds)) mutedIds = new Set(data.mutedIds);
      if (successMsg) showToast(successMsg);
      renderAllAdminPanels();
      return data;
    } catch {
      showToast('⚠️ 서버 연결 오류가 발생했습니다.');
      return null;
    }
  }

  function promptKick(targetId, targetName) {
    const reason = window.prompt(`[강퇴] ${targetName}님의 강퇴 사유를 입력해 주세요 (취소 시 중단):`, '규칙 위반으로 관리자에 의해 강퇴되었습니다.');
    if (reason === null) return;
    execAdminAction({ action: 'kick', targetId, reason: reason.trim() }, `👢 ${targetName}님을 강퇴했습니다.`);
  }

  function promptBan(targetId, targetName) {
    const reason = window.prompt(`[영구 밴] ${targetName}님을 영구 차단합니다. 사유를 입력해 주세요 (취소 시 중단):`, '이용 수칙 위반으로 영구 차단되었습니다.');
    if (reason === null) return;
    execAdminAction({ action: 'ban', targetId, targetName, reason: reason.trim() }, `⛔ ${targetName}님을 영구 차단(밴)했습니다.`);
  }

  function promptWarn(targetId, targetName) {
    const reason = window.prompt(`[경고 발송] ${targetName}님에게 보낼 경고 메시지:`, '관리실 관제팀 주의 경고입니다. 채팅 예절을 지켜 주세요.');
    if (reason === null) return;
    execAdminAction({ action: 'warn', targetId, reason: reason.trim() }, `⚠️ ${targetName}님에게 경고를 보냈습니다.`);
  }

  // ---------- 관제실 우측 패널 렌더링 (전체 로그 / 접속자 / 밴 목록) ----------
  function renderAdminLogs() {
    const box = $('ctrl-log-list');
    if (!box) return;
    const q = ($('ctrl-log-search')?.value || '').trim().toLowerCase();
    const list = auditLog.filter((item) => {
      if (activeLogFilter === 'public' && item.category !== 'all' && item.category !== 'nearby' && item.category !== 'spotlight') return false;
      if (activeLogFilter === 'private' && item.category !== 'private') return false;
      if (activeLogFilter === 'dm' && item.category !== 'dm' && item.category !== 'whisper') return false;
      if (activeLogFilter === 'system' && item.category !== 'system' && item.category !== 'admin') return false;
      if (q) {
        const hay = `${item.fromName || ''} ${item.toName || ''} ${item.zoneName || ''} ${item.text || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = '<div class="ctrl-empty">표시할 채팅·메시지 기록이 없습니다.</div>';
      return;
    }

    const catBadge = {
      all: ['전체', 'cat-all'],
      nearby: ['근처', 'cat-all'],
      private: ['🔒 프라이빗', 'cat-private'],
      dm: ['💌 1:1 DM', 'cat-dm'],
      whisper: ['💌 귓속말', 'cat-dm'],
      spotlight: ['📣 방송', 'cat-spot'],
      system: ['시스템', 'cat-sys'],
      admin: ['🛡️ 관제', 'cat-admin'],
      inquiry: ['📨 문의', 'cat-inq'],
    };

    for (const item of [...list].reverse()) {
      const row = document.createElement('div');
      row.className = 'ctrl-log-row';
      const [bTxt, bCls] = catBadge[item.category] || ['채팅', 'cat-all'];
      const top = document.createElement('div');
      top.className = 'ctrl-log-top';

      const badge = document.createElement('span');
      badge.className = `ctrl-cat ${bCls}`;
      badge.textContent = item.category === 'private' && item.zoneName ? `🔒 ${item.zoneName}` : bTxt;

      const who = document.createElement('strong');
      who.className = 'ctrl-log-who';
      who.textContent = item.toName ? `${item.fromName} → ${item.toName}` : (item.fromName || '시스템');

      const tm = document.createElement('span');
      tm.className = 'ctrl-log-time';
      tm.textContent = fmtClock(item.time);

      top.append(badge, who);
      if (item.filtered) {
        const fBadge = document.createElement('span');
        fBadge.className = 'ctrl-cat cat-filter';
        fBadge.textContent = '🚫 욕설 필터';
        top.appendChild(fBadge);
      }
      top.appendChild(tm);

      // 발신자 즉시 제재 버튼 (본인 및 시스템 제외)
      if (item.senderId && item.senderId !== clientId && item.category !== 'system' && item.category !== 'admin') {
        const act = document.createElement('span');
        act.className = 'ctrl-inline-acts';
        const mBtn = document.createElement('button');
        mBtn.type = 'button';
        mBtn.title = mutedIds.has(item.senderId) ? '채팅 금지 해제' : '채팅 금지';
        mBtn.textContent = mutedIds.has(item.senderId) ? '🔊' : '🔇';
        mBtn.onclick = () => execAdminAction({ action: 'mute_chat', targetId: item.senderId }, `${item.fromName}님 채팅 상태를 변경했습니다.`);

        const kBtn = document.createElement('button');
        kBtn.type = 'button';
        kBtn.title = '강퇴';
        kBtn.textContent = '👢';
        kBtn.onclick = () => promptKick(item.senderId, item.fromName);

        const bBtn = document.createElement('button');
        bBtn.type = 'button';
        bBtn.className = 'danger';
        bBtn.title = '영구 밴';
        bBtn.textContent = '⛔';
        bBtn.onclick = () => promptBan(item.senderId, item.fromName);

        act.append(mBtn, kBtn, bBtn);
        top.appendChild(act);
      }

      const body = document.createElement('div');
      body.className = 'ctrl-log-text';
      body.textContent = item.text || (item.image ? '🖼️ [이미지 전송]' : '');

      row.append(top, body);
      // 관리자 전용: 필터 적용 전 원문 (제재 판단용)
      if (item.filtered && item.rawText) {
        const raw = document.createElement('div');
        raw.className = 'ctrl-log-raw';
        raw.textContent = `원문: ${item.rawText}`;
        row.appendChild(raw);
      }
      box.appendChild(row);
    }
  }

  function renderAdminUsers() {
    const box = $('ctrl-user-list');
    if (!box) return;
    const users = [...onlineDirectory.values()].sort((a, b) => (a.id === clientId ? -1 : b.id === clientId ? 1 : 0));
    if ($('ctrl-user-count')) $('ctrl-user-count').textContent = String(users.length);
    box.innerHTML = '';

    for (const u of users) {
      const isMe = u.id === clientId;
      const isMuted = mutedIds.has(u.id) || !!u.chatMuted;
      const card = document.createElement('div');
      card.className = 'ctrl-user-card';

      const info = document.createElement('div');
      info.className = 'ctrl-user-info';
      const title = document.createElement('div');
      title.className = 'ctrl-user-name';
      title.textContent = `${u.isAdmin ? '🛡️ ' : ''}${u.name}${isMe ? ' (나 · 관리자)' : ''}`;
      if (isMuted) {
        const tag = document.createElement('span');
        tag.className = 'ctrl-cat cat-admin';
        tag.textContent = '🔇 채금';
        title.appendChild(tag);
      }
      const meta = document.createElement('div');
      meta.className = 'ctrl-user-meta';
      meta.textContent = `📍 ${u.zone || '오피스'}${u.status ? ' · ' + u.status : ''}`;
      info.append(title, meta);
      card.appendChild(info);

      if (!isMe) {
        const btns = document.createElement('div');
        btns.className = 'ctrl-user-btns';

        const mkBtn = (label, cls, titleTxt, onClick) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = `ctrl-act-btn ${cls}`;
          b.textContent = label;
          b.title = titleTxt;
          b.onclick = onClick;
          return b;
        };

        btns.append(
          mkBtn('📍 이동', '', '대상 위치로 이동', () => {
            const av = remotes.get(u.id);
            const tx = av ? av.group.position.x : u.x;
            const tz = av ? av.group.position.z : u.z;
            player.sitting = null;
            player.setPos(tx + 1.2, tz + 1.2, 0);
            showToast(`📍 ${u.name}님 위치로 이동했습니다.`);
          }),
          mkBtn('📢 소환', '', '관제실로 강제 소환', () => {
            execAdminAction({ action: 'summon', targetId: u.id, x: 29.4, y: 0, z: 12.4 }, `📢 ${u.name}님을 관제실로 소환했습니다.`);
          }),
          mkBtn('⚠️ 경고', 'warn', '경고 알림 발송', () => promptWarn(u.id, u.name)),
          mkBtn(isMuted ? '🔊 채금해제' : '🔇 채금', 'warn', '채팅/DM 금지 토글', () => {
            execAdminAction({ action: 'mute_chat', targetId: u.id, muted: !isMuted }, `${u.name}님 채팅 금지를 ${isMuted ? '해제' : '적용'}했습니다.`);
          }),
          mkBtn('🎙️ 음소거', '', '마이크 강제 음소거', () => {
            execAdminAction({ action: 'mute_mic', targetId: u.id }, `🎙️ ${u.name}님 마이크를 음소거했습니다.`);
          }),
          mkBtn('👢 강퇴', 'danger', '즉시 강제 퇴장', () => promptKick(u.id, u.name)),
          mkBtn('⛔ 밴', 'danger-solid', '영구 차단(재입장 금지)', () => promptBan(u.id, u.name)),
        );
        card.appendChild(btns);
      }
      box.appendChild(card);
    }
  }

  function renderAdminBans() {
    const box = $('ctrl-ban-list');
    if (!box) return;
    if ($('ctrl-ban-count')) $('ctrl-ban-count').textContent = String(banList.length);
    box.innerHTML = '';
    if (!banList.length) {
      box.innerHTML = '<div class="ctrl-empty">현재 차단(밴)된 사용자가 없습니다.</div>';
      return;
    }
    for (const b of banList) {
      const row = document.createElement('div');
      row.className = 'ctrl-user-card';
      const info = document.createElement('div');
      info.className = 'ctrl-user-info';
      const nm = document.createElement('div');
      nm.className = 'ctrl-user-name';
      nm.textContent = `⛔ ${b.targetName}`;
      const meta = document.createElement('div');
      meta.className = 'ctrl-user-meta';
      meta.textContent = `${b.reason || '사유 없음'} · 처리: ${b.by || '관리자'} (${fmtStamp(b.time)})`;
      info.append(nm, meta);

      const unbanBtn = document.createElement('button');
      unbanBtn.type = 'button';
      unbanBtn.className = 'ctrl-act-btn';
      unbanBtn.textContent = '🔓 밴 해제';
      unbanBtn.onclick = () => {
        execAdminAction({ action: 'unban', banId: b.banId }, `🔓 ${b.targetName}님의 차단을 해제했습니다.`);
      };
      row.append(info, unbanBtn);
      box.appendChild(row);
    }
  }

  // ---------- 📨 사용자 문의 접수 · 답변 ----------
  const INQ_CATEGORY = {
    general: '💬 일반', report: '🚨 신고', bug: '🐞 버그', account: '👤 계정·제재', etc: '📎 기타',
  };
  const INQ_STATUS = { open: '미답변', answered: '답변 완료', closed: '종료' };

  async function inquiryAction(payload, successMsg = '') {
    try {
      const res = await fetch('/api/admin/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        showToast('⚠️ 문의 처리에 실패했습니다.');
        return false;
      }
      if (Array.isArray(data.inquiries)) inquiries = data.inquiries;
      if (successMsg) showToast(successMsg);
      renderAdminInquiries();
      return true;
    } catch {
      showToast('⚠️ 서버 연결 오류가 발생했습니다.');
      return false;
    }
  }

  function renderAdminInquiries() {
    const openCount = inquiries.filter((q) => q.status === 'open').length;
    if ($('ctrl-inq-count')) $('ctrl-inq-count').textContent = String(openCount);
    const box = $('ctrl-inq-list');
    if (!box) return;
    const list = inquiries.filter((q) => activeInqFilter === 'all' || q.status === activeInqFilter);
    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = '<div class="ctrl-empty">해당하는 문의가 없습니다.</div>';
      return;
    }
    for (const q of [...list].reverse()) {
      const card = document.createElement('div');
      card.className = 'ctrl-inq-card' + (q.status === 'open' ? ' is-open' : '');

      const top = document.createElement('div');
      top.className = 'ctrl-log-top';
      const cat = document.createElement('span');
      cat.className = 'ctrl-cat cat-inq';
      cat.textContent = INQ_CATEGORY[q.category] || INQ_CATEGORY.general;
      const st = document.createElement('span');
      st.className = `ctrl-cat ${q.status === 'open' ? 'cat-spot' : 'cat-sys'}`;
      st.textContent = INQ_STATUS[q.status] || q.status;
      const who = document.createElement('strong');
      who.className = 'ctrl-log-who';
      who.textContent = `${q.fromName}${q.zoneName ? ' · ' + q.zoneName : ''}`;
      const tm = document.createElement('span');
      tm.className = 'ctrl-log-time';
      tm.textContent = fmtStamp(q.time).slice(5, 16);
      top.append(cat, st, who, tm);

      const text = document.createElement('div');
      text.className = 'ctrl-inq-text';
      text.textContent = q.text;
      card.append(top, text);
      if (q.rawText) {
        const raw = document.createElement('div');
        raw.className = 'ctrl-log-raw';
        raw.textContent = `원문: ${q.rawText}`;
        card.appendChild(raw);
      }

      for (const r of q.replies || []) {
        const rep = document.createElement('div');
        rep.className = 'ctrl-inq-reply';
        const b = document.createElement('b');
        b.textContent = `↳ ${r.by} (${fmtClock(r.time)}): `;
        rep.append(b, document.createTextNode(r.text));
        card.appendChild(rep);
      }

      if (q.status !== 'closed') {
        const form = document.createElement('form');
        form.className = 'ctrl-inq-form';
        const ta = document.createElement('textarea');
        ta.maxLength = 600;
        ta.placeholder = '답변을 입력하세요 (작성자에게 실시간 알림)';
        ta.value = inqDrafts.get(q.inqId) || '';
        ta.oninput = () => inqDrafts.set(q.inqId, ta.value);
        const send = document.createElement('button');
        send.type = 'submit';
        send.className = 'ctrl-act-btn';
        send.textContent = '↩ 답변';
        form.append(ta, send);
        form.onsubmit = async (e) => {
          e.preventDefault();
          const t = ta.value.trim();
          if (!t) return;
          send.disabled = true;
          inqDrafts.delete(q.inqId);
          const ok = await inquiryAction({ action: 'reply', inqId: q.inqId, text: t }, `📨 ${q.fromName}님에게 답변을 보냈습니다.`);
          if (!ok) {
            inqDrafts.set(q.inqId, t);
            send.disabled = false;
          }
        };
        card.appendChild(form);
      }

      const acts = document.createElement('div');
      acts.className = 'ctrl-inq-acts';
      const mk = (label, cls, onClick) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `ctrl-act-btn ${cls}`;
        b.textContent = label;
        b.onclick = onClick;
        return b;
      };
      if (q.status === 'closed') {
        acts.appendChild(mk('🔄 다시 열기', '', () => inquiryAction({ action: 'reopen', inqId: q.inqId })));
      } else {
        acts.appendChild(mk('✅ 종료 처리', '', () => inquiryAction({ action: 'close', inqId: q.inqId }, '문의를 종료 처리했습니다.')));
      }
      acts.appendChild(mk('🗑️ 삭제', 'danger', () => {
        if (window.confirm(`${q.fromName}님의 문의를 삭제할까요? 되돌릴 수 없습니다.`)) inquiryAction({ action: 'delete', inqId: q.inqId }, '문의를 삭제했습니다.');
      }));
      if (q.fromId && q.fromId !== clientId && onlineDirectory.has(q.fromId)) {
        acts.appendChild(mk('⚠️ 경고', 'warn', () => promptWarn(q.fromId, q.fromName)));
      }
      card.appendChild(acts);
      box.appendChild(card);
    }
  }

  function renderAllAdminPanels() {
    if (!isAdmin) return;
    renderAdminLogs();
    renderAdminUsers();
    renderAdminBans();
    renderAdminInquiries();
  }

  function syncAdminUIState() {
    if ($('ctrl-auth-view')) $('ctrl-auth-view').hidden = isAdmin;
    if ($('ctrl-dash-view')) $('ctrl-dash-view').hidden = !isAdmin;
    if ($('ctrl-admin-badge')) $('ctrl-admin-badge').hidden = !isAdmin;
    if ($('rail-btn-control')) $('rail-btn-control').classList.toggle('admin-on', isAdmin);
    if (isAdmin) {
      buildCctvGrid();
      renderAllAdminPanels();
    }
  }

  async function refreshAdminState() {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/admin/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.auditLog)) auditLog = data.auditLog;
      if (Array.isArray(data.inquiries)) inquiries = data.inquiries;
      if (Array.isArray(data.bans)) banList = data.bans;
      if (Array.isArray(data.mutedIds)) mutedIds = new Set(data.mutedIds);
      renderAllAdminPanels();
    } catch { /* ignore */ }
  }

  function openControlRoom() {
    const modal = $('control-room-modal');
    if (!modal) return;
    modal.hidden = false;
    syncAdminUIState();
    if (isAdmin) {
      refreshAdminState();
    } else {
      setTimeout(() => $('ctrl-pass-input')?.focus(), 40);
    }
  }

  function closeControlRoom() {
    const modal = $('control-room-modal');
    if (modal) modal.hidden = true;
  }

  // ---------- 이벤트 바인딩 ----------
  if ($('ctrl-close')) $('ctrl-close').onclick = closeControlRoom;

  if ($('ctrl-auth-form')) {
    $('ctrl-auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const passcode = ($('ctrl-pass-input')?.value || '').trim();
      if (!passcode) return;
      try {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: clientId, passcode }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          showToast('🔐 관리자 인증 코드가 일치하지 않습니다.');
          return;
        }
        isAdmin = true;
        auditLog = Array.isArray(data.auditLog) ? data.auditLog : [];
        inquiries = Array.isArray(data.inquiries) ? data.inquiries : [];
        banList = Array.isArray(data.bans) ? data.bans : [];
        mutedIds = new Set(Array.isArray(data.mutedIds) ? data.mutedIds : []);
        if ($('ctrl-pass-input')) $('ctrl-pass-input').value = '';
        playChime(true);
        showToast('🛡️ 관제실 관리자 권한이 활성화되었습니다! 전체 CCTV·채팅·제재 권한이 열렸습니다.');
        if (onAdminAuthChange) onAdminAuthChange(true);
        syncAdminUIState();
      } catch {
        showToast('⚠️ 서버 연결을 확인해 주세요.');
      }
    };
  }

  if ($('ctrl-nv-toggle')) {
    $('ctrl-nv-toggle').onclick = () => {
      nightVision = !nightVision;
      $('ctrl-nv-toggle').classList.toggle('on', nightVision);
      $('ctrl-nv-toggle').textContent = nightVision ? '🎨 컬러 모드' : '🌙 야간투시';
    };
  }
  if ($('ctrl-grid-reset')) {
    $('ctrl-grid-reset').onclick = () => {
      focusedCamId = null;
      ptzYawOffset = 0;
      buildCctvGrid();
    };
  }
  if ($('ctrl-ptz-left')) $('ctrl-ptz-left').onclick = () => { ptzYawOffset = Math.max(-0.85, ptzYawOffset - 0.22); };
  if ($('ctrl-ptz-right')) $('ctrl-ptz-right').onclick = () => { ptzYawOffset = Math.min(0.85, ptzYawOffset + 0.22); };
  if ($('ctrl-ptz-warp')) {
    $('ctrl-ptz-warp').onclick = () => {
      const cam = CCTV_CAMERAS.find((c) => c.id === focusedCamId);
      if (cam && warpTo) {
        closeControlRoom();
        warpTo(cam.zoneId);
      }
    };
  }

  document.querySelectorAll('[data-ctrl-tab]').forEach((btn) => {
    btn.onclick = () => {
      activeRightTab = btn.dataset.ctrlTab;
      document.querySelectorAll('[data-ctrl-tab]').forEach((b) => b.classList.toggle('on', b === btn));
      if ($('ctrl-pane-logs')) $('ctrl-pane-logs').hidden = activeRightTab !== 'logs';
      if ($('ctrl-pane-users')) $('ctrl-pane-users').hidden = activeRightTab !== 'users';
      if ($('ctrl-pane-bans')) $('ctrl-pane-bans').hidden = activeRightTab !== 'bans';
      if ($('ctrl-pane-inquiries')) $('ctrl-pane-inquiries').hidden = activeRightTab !== 'inquiries';
      renderAllAdminPanels();
    };
  });

  document.querySelectorAll('[data-inq-filter]').forEach((btn) => {
    btn.onclick = () => {
      activeInqFilter = btn.dataset.inqFilter;
      document.querySelectorAll('[data-inq-filter]').forEach((b) => b.classList.toggle('on', b === btn));
      renderAdminInquiries();
    };
  });

  document.querySelectorAll('[data-ctrl-filter]').forEach((btn) => {
    btn.onclick = () => {
      activeLogFilter = btn.dataset.ctrlFilter;
      document.querySelectorAll('[data-ctrl-filter]').forEach((b) => b.classList.toggle('on', b === btn));
      renderAdminLogs();
    };
  });

  if ($('ctrl-log-search')) $('ctrl-log-search').addEventListener('input', renderAdminLogs);

  if ($('ctrl-manual-ban-form')) {
    $('ctrl-manual-ban-form').onsubmit = (e) => {
      e.preventDefault();
      const name = ($('ctrl-manual-ban-name')?.value || '').trim();
      const reason = ($('ctrl-manual-ban-reason')?.value || '').trim() || '관리자 사전 차단';
      if (!name) return;
      $('ctrl-manual-ban-name').value = '';
      $('ctrl-manual-ban-reason').value = '';
      execAdminAction({ action: 'ban', targetId: '', targetName: name, reason }, `⛔ "${name}" 닉네임을 차단 목록에 등록했습니다.`);
    };
  }

  // ---------- 제재 수신 화면 (강퇴 / 영구 밴 / 경고 / 채팅금지) ----------
  let warnTimer = null;
  function showModerationBlock({ title, subtitle, reason, canReload }) {
    const ov = $('moderation-block-overlay');
    if (!ov) return;
    $('mod-block-title').textContent = title;
    $('mod-block-sub').textContent = subtitle;
    $('mod-block-reason').textContent = reason || '관리자 조치';
    const reloadBtn = $('mod-block-reload');
    if (reloadBtn) reloadBtn.hidden = !canReload;
    ov.hidden = false;
  }

  if ($('mod-block-reload')) {
    $('mod-block-reload').onclick = () => location.reload();
  }

  function onKicked(data) {
    if (playNote) playNote(220, 0.35);
    showModerationBlock({
      title: '👢 관리자에 의해 강퇴되었습니다',
      subtitle: `처리 관리자: ${data.by || '관제실 관리자'}`,
      reason: data.reason || '관리자 판단에 의해 퇴장 처리되었습니다.',
      canReload: true,
    });
  }

  function onBanned(data) {
    if (playNote) playNote(160, 0.5);
    showModerationBlock({
      title: '⛔ 관리자에 의해 영구 차단(밴)되었습니다',
      subtitle: `처리 관리자: ${data.by || '관제실 관리자'} · 차단 해제 전까지 재입장이 불가합니다`,
      reason: data.reason || '이용 수칙 위반으로 영구 차단되었습니다.',
      canReload: false,
    });
  }

  function onAdminWarn(data) {
    if (playNote) {
      playNote(880, 0.14);
      setTimeout(() => playNote(660, 0.22), 150);
    }
    const el = $('admin-warn-banner');
    if (el) {
      $('admin-warn-text').textContent = `⚠️ [관제실 경고 · ${data.by || '관리자'}] ${data.reason || '이용 수칙을 지켜 주세요.'}`;
      el.hidden = false;
      clearTimeout(warnTimer);
      warnTimer = setTimeout(() => { el.hidden = true; }, 7000);
    }
    showToast(`⚠️ 관제실 경고: ${data.reason || ''}`);
  }

  function onChatMuted(data) {
    const muted = !!data.muted;
    const inp = $('chat-input');
    if (inp) {
      inp.disabled = muted;
      inp.placeholder = muted ? '🔇 관리자에 의해 채팅이 금지되었습니다' : '채팅을 입력해 주세요';
    }
    const dmInp = $('dm-input');
    if (dmInp) {
      dmInp.disabled = muted;
      dmInp.placeholder = muted ? '🔇 채팅 금지 상태입니다' : '메시지를 입력해 주세요';
    }
    showToast(muted ? `🔇 관리자(${data.by || '관제실'})에 의해 채팅이 금지되었습니다.` : `🔊 관리자(${data.by || '관제실'})가 채팅 금지를 해제했습니다.`);
  }

  return {
    isAdmin: () => isAdmin,
    openControlRoom,
    closeControlRoom,
    updateCctvFeeds,
    onAdminLog: (item) => {
      if (!isAdmin) return;
      auditLog.push(item);
      if (auditLog.length > 200) auditLog.shift();
      if (!$('control-room-modal')?.hidden && activeRightTab === 'logs') renderAdminLogs();
    },
    onAdminBans: (data) => {
      if (Array.isArray(data?.bans)) banList = data.bans;
      if (isAdmin && !$('control-room-modal')?.hidden) renderAdminBans();
    },
    onAdminMutes: (data) => {
      if (Array.isArray(data?.mutedIds)) mutedIds = new Set(data.mutedIds);
      if (isAdmin && !$('control-room-modal')?.hidden) renderAllAdminPanels();
    },
    // 📨 새 문의 접수 (관리자에게만 전송됨)
    onInquiryNew: (inq) => {
      if (!isAdmin || !inq) return;
      if (!inquiries.some((q) => q.inqId === inq.inqId)) inquiries.push(inq);
      if (playNote) {
        playNote(740, 0.1);
        setTimeout(() => playNote(988, 0.14), 120);
      }
      showToast(`📨 새 문의가 접수되었습니다: ${inq.fromName} — "${String(inq.text || '').slice(0, 40)}"  (🛡️ 관제실 › 문의 탭)`);
      renderAdminInquiries();
    },
    onInquiryList: (data) => {
      if (!isAdmin || !Array.isArray(data?.inquiries)) return;
      inquiries = data.inquiries;
      renderAdminInquiries();
    },
    onUsersChanged: () => {
      if (isAdmin && !$('control-room-modal')?.hidden && activeRightTab === 'users') renderAdminUsers();
    },
    onKicked,
    onBanned,
    onAdminWarn,
    onChatMuted,
    promptKick,
    promptBan,
  };
}
