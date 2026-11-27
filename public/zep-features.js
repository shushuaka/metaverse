// ZEP 통합 확장 기능 모듈 (1~11번 전체 기능)
// 1. 웹/유튜브 임베드  2. 발표 단상 연동  3. 캠 확장/그리드  4. 😊+ 이모티콘 피커 & 1~5 슬롯 커스텀
// 5. 호스트 관리(소집·음소거·잠금)  6. 상태 표시 & 손들기 & 자동 AFK  7. 공유 타이머 & 실시간 투표
// 8. 링크 자동 클릭 & 이미지 첨부/라이트박스  9. 바닥 클릭 이동 & 따라가기(main 연동)
// 10. 라운지 Lo-Fi BGM & 포토존 단체샷  11. 저전력 모드 & 알림 센터(🔔)

const EMOTE_SLOTS_KEY = 'aio_zep_emote_slots_v1';
const DEFAULT_SLOTS = [
  ['👍', '좋아요!'],
  ['👏', '박수!'],
  ['❤️', '하트!'],
  ['😆', '하하!'],
  ['😂', '빵터짐!'],
];

export const EMOTE_PALETTE = [
  ['👍', '좋아요!'], ['👏', '박수!'], ['❤️', '하트!'], ['😆', '하하!'], ['😂', '빵터짐!'], ['🔥', '불타올라!'],
  ['🎉', '축하해요!'], ['🥳', '파티!'], ['😮', '오오!'], ['😢', '으앙~'], ['🤔', '음...'], ['🙏', '감사해요!'],
  ['💯', '완벽!'], ['✨', '반짝!'], ['🎵', '신난다!'], ['☕', '커피타임'], ['👀', '주목!'], ['🙌', '만세!'],
  ['💪', '화이팅!'], ['🫶', '하트뿅!'], ['🚀', '출발!'], ['💡', '아이디어!'], ['✋', '손들기!'], ['💤', '졸려요~'],
];

export const PRESENCE_META = {
  online: { icon: '💻', label: '온라인' },
  study: { icon: '📚', label: '학습중' },
  class: { icon: '🪑', label: '수업중' },
  mentoring: { icon: '💬', label: '멘토링중' },
  restroom: { icon: '🚽', label: '화장실' },
  afk: { icon: '🕒', label: '자리비움' },
  dnd: { icon: '⛔', label: '방해금지' },
};

// 안전한 URL 링크 파싱 + 이미지 썸네일 렌더러 (XSS 방지 DOM 노드 방식)
export function renderRichMessage(container, text = '', imageUrl = '', onOpenLightbox = null) {
  container.innerHTML = '';
  if (text) {
    const textWrap = document.createElement('div');
    textWrap.className = 'rich-text';
    const urlRe = /(https?:\/\/[^\s<>"']+)/g;
    let lastIdx = 0;
    let m;
    while ((m = urlRe.exec(text)) !== null) {
      if (m.index > lastIdx) {
        textWrap.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
      }
      const a = document.createElement('a');
      a.href = m[1];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'chat-link';
      a.textContent = m[1];
      textWrap.appendChild(a);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < text.length) {
      textWrap.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    container.appendChild(textWrap);
  }
  if (imageUrl && /^data:image\//.test(imageUrl)) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '첨부 이미지';
    img.className = 'chat-attach-img';
    img.onclick = () => {
      if (onOpenLightbox) onOpenLightbox(imageUrl);
    };
    container.appendChild(img);
  }
}

// 채팅/DM 업로드 이미지 경량 리사이즈 (< 180KB)
export function resizeChatImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 600;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(32, Math.round(img.width * scale));
        const h = Math.max(32, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        let out = c.toDataURL('image/jpeg', 0.8);
        if (out.length > 205000) out = c.toDataURL('image/jpeg', 0.58);
        resolve(out);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 유튜브 시간 파라미터(예: 90, 1m30s, 1h2m3s) -> 초 변환
function parseYouTubeStart(raw) {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(raw);
  if (!m) return 0;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

// 유튜브 일반 링크 -> 임베드 URL 자동 변환
export function toEmbedUrl(rawUrl) {
  const s = String(rawUrl || '').trim();
  if (!s) return '';
  let u;
  try {
    u = new URL(s.startsWith('http') ? s : `https://${s}`);
  } catch {
    return '';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const buildYtEmbed = (vid) => {
    const start = parseYouTubeStart(u.searchParams.get('t') || u.searchParams.get('start') || '');
    const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
    if (start > 0) params.set('start', String(start));
    return `https://www.youtube.com/embed/${vid}?${params.toString()}`;
  };
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v && /^[\w-]{6,20}$/.test(v)) return buildYtEmbed(v);
    const em = /^\/embed\/([\w-]{6,20})/.exec(u.pathname);
    if (em) return buildYtEmbed(em[1]);
    const sm = /^\/shorts\/([\w-]{6,20})/.exec(u.pathname);
    if (sm) return buildYtEmbed(sm[1]);
    const lm = /^\/live\/([\w-]{6,20})/.exec(u.pathname);
    if (lm) return buildYtEmbed(lm[1]);
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    if (id && /^[\w-]{6,20}$/.test(id)) return buildYtEmbed(id);
  }
  // 데스크톱 위키백과 URL은 임베드 모달에서 보기 편한 모바일 레이아웃으로 자동 전환
  if (/^[a-z]{2,3}\.wikipedia\.org$/.test(host)) {
    const lang = host.split('.')[0];
    u.hostname = `${lang}.m.wikipedia.org`;
    return u.toString();
  }
  return u.toString();
}

export function createZepFeatures({
  clientId,
  renderer,
  scene,
  camera,
  player,
  npcs,
  voice,
  showToast,
  playChime,
  playNote,
  triggerEmote,
  onPresenceUpdated,
  getPlayerPos,
}) {
  const $ = (id) => document.getElementById(id);

  // ---------- 11-A. 알림 센터 (🔔) ----------
  const notifications = [];
  let notifUnread = 0;

  function pushNotification(icon, text) {
    const item = { icon, text, time: Date.now() };
    notifications.unshift(item);
    if (notifications.length > 40) notifications.pop();
    if ($('notif-drawer')?.hidden !== false) {
      notifUnread++;
      syncNotifBadge();
    } else {
      renderNotifications();
    }
  }

  function syncNotifBadge() {
    const dot = $('notif-dot');
    if (dot) dot.hidden = notifUnread <= 0;
  }

  function renderNotifications() {
    const box = $('notif-list');
    if (!box) return;
    box.innerHTML = '';
    if (!notifications.length) {
      const empty = document.createElement('div');
      empty.className = 'dm-empty';
      empty.textContent = '아직 도착한 알림이 없어요.';
      box.appendChild(empty);
      return;
    }
    for (const n of notifications) {
      const row = document.createElement('div');
      row.className = 'notif-row';
      const d = new Date(n.time);
      const tStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      row.innerHTML = `<span class="notif-ico">${n.icon}</span><div class="notif-body"><div class="notif-txt"></div><small>${tStr}</small></div>`;
      row.querySelector('.notif-txt').textContent = n.text;
      box.appendChild(row);
    }
  }

  $('btn-notif-bell').onclick = () => {
    const dr = $('notif-drawer');
    const opening = dr.hidden;
    if (opening) {
      if ($('users-drawer')) $('users-drawer').hidden = true;
      if ($('minimap-card')) $('minimap-card').hidden = true;
    }
    dr.hidden = !opening;
    $('btn-notif-bell').classList.toggle('active', opening);
    if (opening) {
      notifUnread = 0;
      syncNotifBadge();
      renderNotifications();
    }
  };
  $('notif-close').onclick = () => { $('notif-drawer').hidden = true; $('btn-notif-bell').classList.remove('active'); };
  $('notif-clear').onclick = () => { notifications.length = 0; notifUnread = 0; syncNotifBadge(); renderNotifications(); };

  // ---------- 8-B. 이미지 확대 라이트박스 ----------
  function openLightbox(src) {
    $('lightbox-img').src = src;
    $('img-lightbox').hidden = false;
  }
  $('img-lightbox').onclick = () => { $('img-lightbox').hidden = true; };

// X-Frame-Options / CSP frame-ancestors로 iframe 임베드가 차단된 주요 외부 도메인
const FRAME_BLOCKED_HOSTS = [
  'namu.wiki',
  'naver.com',
  'google.com',
  'github.com',
  'notion.so',
  'x.com',
  'twitter.com',
  'instagram.com',
];

function isFrameBlockedUrl(rawUrl) {
  try {
    const u = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    return FRAME_BLOCKED_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// ---------- 1. 오브젝트 웹/유튜브 임베드 모달 ----------
  let currentEmbed = { url: '', title: '오피스 공유 스크린', by: '' };
  const embedFrame = $('embed-iframe');
  const embedLoading = $('embed-loading');
  const embedExtCard = $('embed-external-card');
  const embedLiveBanner = $('embed-live-banner');
  const embedLiveText = $('embed-live-text');
  if ($('btn-embed-live-open')) {
    $('btn-embed-live-open').onclick = () => openEmbedModal();
  }
  if ($('btn-embed-live-hide')) {
    $('btn-embed-live-hide').onclick = () => { if (embedLiveBanner) embedLiveBanner.hidden = true; };
  }
  if (embedFrame) {
    embedFrame.addEventListener('load', () => {
      if (embedLoading) embedLoading.hidden = true;
    });
  }
  if ($('embed-ext-popup')) {
    $('embed-ext-popup').onclick = () => {
      if (!currentEmbed.url) return;
      const w = 980, h = 760;
      const left = Math.max(40, Math.round((window.screen.width - w) / 2));
      const top = Math.max(40, Math.round((window.screen.height - h) / 2));
      window.open(currentEmbed.url, 'ai_office_embed_popup', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    };
  }

  function syncPresetChips(activeUrl) {
    document.querySelectorAll('[data-embed-preset]').forEach((b) => {
      b.classList.toggle('on', !!activeUrl && b.dataset.embedPreset === activeUrl);
    });
  }

  function applyEmbedState(data, notify = false) {
    if (!data) return;
    currentEmbed = { url: data.url || '', title: data.title || '오피스 공유 스크린', by: data.by || '' };
    const modal = $('embed-modal');
    const frame = $('embed-iframe');
    const empty = $('embed-empty');
    const openExt = $('embed-open-ext');
    $('embed-title').textContent = currentEmbed.title || '📺 유튜브 · 웹페이지 공유 스크린';
    $('embed-url-input').value = currentEmbed.url || '';
    syncPresetChips(currentEmbed.url);

    const embedSrc = toEmbedUrl(currentEmbed.url);
    if (embedLiveBanner && embedLiveText) {
      if (embedSrc) {
        const who = currentEmbed.by ? `${currentEmbed.by}님 공유 · ` : '';
        embedLiveText.textContent = `📺 ${who}${currentEmbed.title}`;
        embedLiveBanner.hidden = false;
      } else {
        embedLiveBanner.hidden = true;
      }
    }

    // 다른 접속자가 새로 공유한 경우: 입장 완료 상태이고 다른 작업 모달이 닫혀 있으면 자동으로 공유 스크린 팝업!
    const otherBusyModal = !$('profile-overlay')?.hidden || !$('board-modal')?.hidden || !$('games-modal')?.hidden;
    if (notify && embedSrc && !otherBusyModal) {
      modal.hidden = false;
    }

    if (embedSrc && isFrameBlockedUrl(currentEmbed.url)) {
      delete frame.dataset.loadedSrc;
      frame.src = 'about:blank';
      frame.hidden = true;
      if (embedLoading) embedLoading.hidden = true;
      empty.hidden = true;
      openExt.href = currentEmbed.url;
      openExt.hidden = false;
      if (embedExtCard) {
        let hostLabel = '';
        let decodedUrl = currentEmbed.url;
        try {
          hostLabel = new URL(currentEmbed.url).hostname.replace(/^www\./, '');
          decodedUrl = decodeURI(currentEmbed.url);
        } catch { /* ignore */ }
        $('embed-ext-host').textContent = hostLabel || '외부 웹사이트';
        $('embed-ext-title').textContent = currentEmbed.title || '외부 페이지 공유';
        $('embed-ext-desc').textContent = `${hostLabel || '이 사이트'}는 보안 정책(X-Frame-Options)으로 창 내부 임베드를 차단하고 있어요.\n아래 버튼으로 바로 열어 메타버스와 함께 볼 수 있습니다!`;
        $('embed-ext-url').textContent = decodedUrl;
        $('embed-ext-tab').href = currentEmbed.url;
        embedExtCard.hidden = false;
      }
    } else if (embedSrc) {
      if (embedExtCard) embedExtCard.hidden = true;
      empty.hidden = true;
      frame.hidden = false;
      openExt.href = currentEmbed.url;
      openExt.hidden = false;
      if (!modal.hidden && frame.dataset.loadedSrc !== embedSrc) {
        if (embedLoading) embedLoading.hidden = false;
        frame.dataset.loadedSrc = embedSrc;
        frame.src = embedSrc;
      }
    } else {
      delete frame.dataset.loadedSrc;
      frame.src = 'about:blank';
      frame.hidden = true;
      if (embedLoading) embedLoading.hidden = true;
      if (embedExtCard) embedExtCard.hidden = true;
      empty.hidden = false;
      openExt.hidden = true;
    }
    if (notify && currentEmbed.url) {
      playChime(false);
      showToast(`📺 ${currentEmbed.by || '누군가'}님이 "${currentEmbed.title}" 화면을 공유했습니다!`);
      pushNotification('📺', `${currentEmbed.by || '누군가'}님이 "${currentEmbed.title}" 화면을 공유했습니다.`);
    } else if (notify && !currentEmbed.url) {
      showToast(`📺 ${currentEmbed.by || '누군가'}님이 공유 스크린을 닫았습니다.`);
    }
  }

  function openEmbedModal() {
    $('embed-modal').hidden = false;
    applyEmbedState(currentEmbed, false);
  }
  function closeEmbedModal() {
    $('embed-modal').hidden = true;
    // 창 닫을 때 영상 소리 멈추기
    const frame = $('embed-iframe');
    delete frame.dataset.loadedSrc;
    frame.src = 'about:blank';
    if (embedLoading) embedLoading.hidden = true;
  }
  $('embed-close').onclick = closeEmbedModal;

  async function shareEmbedUrl(rawUrl, title = '') {
    const trimmed = String(rawUrl || '').trim();
    const clean = toEmbedUrl(trimmed) ? (/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`) : '';
    const finalTitle = title || (clean.includes('youtu') ? 'YouTube 함께 보기' : (clean ? new URL(clean).hostname : '오피스 공유 스크린'));
    applyEmbedState({ url: clean, title: finalTitle, by: '나' }, false);
    try {
      const res = await fetch('/api/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, url: clean, title: finalTitle }),
      });
      if (!res.ok) {
        showToast('⚠️ 공유 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      if (clean) showToast(`📺 "${finalTitle}" 화면을 전체 접속자와 공유했습니다!`);
      else showToast('📺 공유 스크린을 비웠습니다.');
    } catch {
      showToast('⚠️ 서버 연결을 확인해 주세요.');
    }
  }

  // ---------- 1-B. 유튜브·웹 공유 스크린 자유 드래그 이동 & 미니모드 ----------
  const embedModalEl = $('embed-modal');
  const embedDragHead = embedModalEl?.querySelector('.char-modal-head');
  let embedDragging = false;
  let embedDragPid = null;
  let embedOffset = { x: 0, y: 0 };

  function clampEmbedModalPos() {
    if (!embedModalEl || !embedModalEl.classList.contains('is-positioned')) return;
    const rect = embedModalEl.getBoundingClientRect();
    const minVisible = 140;
    const minLeft = Math.min(12, -(rect.width - minVisible));
    const maxLeft = Math.max(12, window.innerWidth - minVisible);
    const maxTop = Math.max(8, window.innerHeight - 60);
    const curLeft = parseFloat(embedModalEl.style.left) || rect.left;
    const curTop = parseFloat(embedModalEl.style.top) || rect.top;
    embedModalEl.style.left = `${Math.round(Math.max(minLeft, Math.min(maxLeft, curLeft)))}px`;
    embedModalEl.style.top = `${Math.round(Math.max(8, Math.min(maxTop, curTop)))}px`;
  }

  function resetEmbedModalPos() {
    if (!embedModalEl) return;
    embedModalEl.classList.remove('is-positioned');
    embedModalEl.style.left = '';
    embedModalEl.style.top = '';
    embedModalEl.style.transform = '';
  }

  if (embedModalEl && embedDragHead) {
    embedDragHead.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a, input, select')) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = embedModalEl.getBoundingClientRect();
      embedModalEl.classList.add('is-positioned', 'dragging');
      embedModalEl.style.left = `${Math.round(rect.left)}px`;
      embedModalEl.style.top = `${Math.round(rect.top)}px`;
      embedModalEl.style.transform = 'none';
      embedOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      embedDragging = true;
      embedDragPid = e.pointerId;
      try { embedDragHead.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    embedDragHead.addEventListener('pointermove', (e) => {
      if (!embedDragging || e.pointerId !== embedDragPid) return;
      e.stopPropagation();
      const rect = embedModalEl.getBoundingClientRect();
      const minVisible = 140;
      const rawLeft = e.clientX - embedOffset.x;
      const rawTop = e.clientY - embedOffset.y;
      const minLeft = Math.min(12, -(rect.width - minVisible));
      const maxLeft = Math.max(12, window.innerWidth - minVisible);
      const maxTop = Math.max(8, window.innerHeight - 60);
      embedModalEl.style.left = `${Math.round(Math.max(minLeft, Math.min(maxLeft, rawLeft)))}px`;
      embedModalEl.style.top = `${Math.round(Math.max(8, Math.min(maxTop, rawTop)))}px`;
    });
    const endEmbedDrag = (e) => {
      if (!embedDragging || (embedDragPid !== null && e.pointerId !== embedDragPid)) return;
      embedDragging = false;
      try { embedDragHead.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      embedDragPid = null;
      embedModalEl.classList.remove('dragging');
    };
    embedDragHead.addEventListener('pointerup', endEmbedDrag);
    embedDragHead.addEventListener('pointercancel', endEmbedDrag);
    window.addEventListener('resize', clampEmbedModalPos);
  }

  if ($('embed-mini-toggle')) {
    $('embed-mini-toggle').onclick = () => {
      if (!embedModalEl) return;
      const mini = embedModalEl.classList.toggle('mini-mode');
      $('embed-mini-toggle').textContent = mini ? '🗖 크게' : '🗗 미니';
      $('embed-mini-toggle').title = mini ? '원래 크기로 펼치기' : '작은 미니 플레이어로 축소';
      setTimeout(clampEmbedModalPos, 10);
    };
  }
  if ($('embed-reset-pos')) {
    $('embed-reset-pos').onclick = () => {
      resetEmbedModalPos();
      showToast('📺 공유 스크린 위치를 중앙으로 초기화했어요.');
    };
  }

  $('embed-form').onsubmit = (e) => {
    e.preventDefault();
    const u = $('embed-url-input').value.trim();
    if (!u) return;
    if (!toEmbedUrl(u)) {
      showToast('올바른 웹페이지 또는 유튜브 주소(https://...)를 입력해 주세요.');
      return;
    }
    shareEmbedUrl(u);
  };
  document.querySelectorAll('[data-embed-preset]').forEach((b) => {
    b.onclick = () => shareEmbedUrl(b.dataset.embedPreset, b.dataset.embedTitle || '');
  });
  $('embed-clear').onclick = () => shareEmbedUrl('', '오피스 공유 스크린');

  // ---------- 4. 😊+ 이모티콘 피커 & 1~5 슬롯 커스터마이징 ----------
  let customSlots = DEFAULT_SLOTS.map((x) => [...x]);
  try {
    const saved = JSON.parse(localStorage.getItem(EMOTE_SLOTS_KEY) || 'null');
    if (Array.isArray(saved) && saved.length === 5) customSlots = saved;
  } catch { /* fallback */ }

  let editingSlotIdx = -1;

  function saveEmoteSlots() {
    try { localStorage.setItem(EMOTE_SLOTS_KEY, JSON.stringify(customSlots)); } catch {}
  }

  function syncEmoteBarDOM() {
    const btns = document.querySelectorAll('#emote-row button[data-key]');
    btns.forEach((b, idx) => {
      const pair = customSlots[idx] || DEFAULT_SLOTS[idx];
      b.dataset.emote = pair[0];
      b.dataset.label = pair[1];
      b.title = `${pair[1]} (${idx + 1})`;
      b.innerHTML = `${pair[0]}<span class="em-num">${idx + 1}</span>`;
    });
  }

  function renderEmotePicker() {
    const grid = $('emote-picker-grid');
    const slotRow = $('emote-slot-bar');
    if (!grid || !slotRow) return;

    slotRow.innerHTML = '';
    customSlots.forEach((pair, idx) => {
      const sb = document.createElement('button');
      sb.type = 'button';
      sb.className = 'ep-slot-btn' + (editingSlotIdx === idx ? ' editing' : '');
      sb.innerHTML = `<span class="ep-slot-num">${idx + 1}</span>${pair[0]}`;
      sb.title = `${idx + 1}번 단축키 슬롯 변경`;
      sb.onclick = () => {
        editingSlotIdx = editingSlotIdx === idx ? -1 : idx;
        renderEmotePicker();
      };
      slotRow.appendChild(sb);
    });

    $('emote-picker-hint').textContent = editingSlotIdx >= 0
      ? `✨ ${editingSlotIdx + 1}번 단축키에 넣을 이모티콘을 선택하세요!`
      : '이모티콘을 클릭하면 머리 위로 떠오릅니다 · 위 1~5 슬롯 클릭 시 단축키 변경!';

    grid.innerHTML = '';
    for (const [emoji, label] of EMOTE_PALETTE) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ep-emoji-btn';
      b.textContent = emoji;
      b.title = label;
      b.onclick = () => {
        if (editingSlotIdx >= 0) {
          customSlots[editingSlotIdx] = [emoji, label];
          saveEmoteSlots();
          syncEmoteBarDOM();
          showToast(`${editingSlotIdx + 1}번 단축키를 ${emoji} 으로 변경했어요!`);
          editingSlotIdx = -1;
          renderEmotePicker();
        } else {
          triggerEmote(emoji, label, -1);
        }
      };
      grid.appendChild(b);
    }
  }

  syncEmoteBarDOM();
  $('btn-emote-more').onclick = () => {
    const pop = $('emote-picker');
    const opening = pop.hidden;
    pop.hidden = !opening;
    editingSlotIdx = -1;
    if (opening) renderEmotePicker();
  };
  $('emote-picker-close').onclick = () => { $('emote-picker').hidden = true; editingSlotIdx = -1; };

  // ---------- 6. 상태 표시(업무/자리비움/방해금지) & ✋ 손들기 & 자동 AFK ----------
  let myPresence = 'online';
  let prevPresenceBeforeAfk = 'online';
  let myHandRaised = false;
  let lastActivityAt = performance.now();
  let autoAfkActive = false;

  function broadcastPresence(extraStatus = undefined) {
    const meta = PRESENCE_META[myPresence] || PRESENCE_META.online;
    const statusText = extraStatus !== undefined
      ? extraStatus
      : (myHandRaised ? `✋ 손들기 · ${meta.label}` : `${meta.icon} ${meta.label}`);
    const pBtn = $('btn-presence');
    if (pBtn) {
      pBtn.textContent = myHandRaised ? `✋ ${meta.label}` : `${meta.icon} ${meta.label}`;
      pBtn.className = `zep-status-pill ${myPresence}${myHandRaised ? ' hand-up' : ''}`;
    }
    document.querySelectorAll('#presence-menu [data-presence]').forEach((b) => {
      b.classList.toggle('selected', b.dataset.presence === myPresence);
    });
    $('btn-hand-raise')?.classList.toggle('on', myHandRaised);

    if (onPresenceUpdated) onPresenceUpdated({ presence: myPresence, handRaised: myHandRaised, statusText });
    fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, presence: myPresence, handRaised: myHandRaised, status: statusText }),
    }).catch(() => {});
  }

  function setPresence(mode, fromAutoAfk = false) {
    if (!PRESENCE_META[mode]) return;
    if (!fromAutoAfk) autoAfkActive = false;
    myPresence = mode;
    broadcastPresence();
    $('presence-menu').hidden = true;
  }

  function toggleHandRaise() {
    myHandRaised = !myHandRaised;
    broadcastPresence();
    if (myHandRaised) {
      triggerEmote('✋', '손들기!', -1);
      showToast('✋ 손을 들었습니다! 다시 누르면 내려갑니다.');
    }
  }

  $('btn-presence').onclick = (e) => {
    e.stopPropagation();
    $('presence-menu').hidden = !$('presence-menu').hidden;
  };
  document.addEventListener('click', (e) => {
    const menu = $('presence-menu');
    if (menu && !menu.hidden && !menu.contains(e.target) && e.target !== $('btn-presence')) {
      menu.hidden = true;
    }
  });
  document.querySelectorAll('[data-presence]').forEach((b) => {
    b.onclick = () => setPresence(b.dataset.presence, false);
  });
  $('btn-hand-raise').onclick = toggleHandRaise;

  function markUserActivity() {
    lastActivityAt = performance.now();
    if (autoAfkActive) {
      autoAfkActive = false;
      myPresence = prevPresenceBeforeAfk || 'online';
      broadcastPresence();
      showToast('👋 자리로 돌아오셔서 온라인 상태로 복귀했습니다!');
    }
  }
  ['keydown', 'pointerdown', 'wheel'].forEach((ev) => window.addEventListener(ev, markUserActivity, { passive: true }));

  // ---------- 7-A. 공유 카운트다운 타이머 (포모도로 / 회의) ----------
  let timerState = { endsAt: 0, remainingMs: 0, running: false, label: '회의 타이머', by: '' };
  let timerAlerted = false;

  function applyTimerState(st) {
    if (!st) return;
    timerState = { ...st };
    timerAlerted = false;
    updateTimerDisplay();
  }

  function fmtCountdown(ms) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    const hud = $('timer-pill-hud');
    if (!hud) return;
    const rem = timerState.running ? Math.max(0, timerState.endsAt - Date.now()) : (timerState.remainingMs || 0);
    const active = timerState.running || rem > 0;
    hud.hidden = !active;
    if (!active) return;

    $('timer-hud-label').textContent = timerState.label || '타이머';
    $('timer-hud-clock').textContent = fmtCountdown(rem);
    $('timer-hud-toggle').textContent = timerState.running ? '⏸' : '▶';
    hud.classList.toggle('urgent', timerState.running && rem <= 15000 && rem > 0);

    if (timerState.running && rem === 0 && !timerAlerted) {
      timerAlerted = true;
      timerState.running = false;
      playChime(true);
      const msg = `⏰ "${timerState.label}" 타이머가 종료되었습니다!`;
      showToast(msg);
      pushNotification('⏰', msg);
    }
  }

  async function postTimer(payload) {
    try {
      await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, ...payload }),
      });
    } catch { /* ignore */ }
  }

  $('timer-form').onsubmit = (e) => {
    e.preventDefault();
    const mins = Math.max(1, Math.min(60, Number($('timer-min-input').value) || 5));
    const label = $('timer-label-input').value.trim() || '회의 타이머';
    postTimer({ action: 'start', seconds: mins * 60, label });
    $('tools-modal').hidden = true;
  };
  document.querySelectorAll('[data-timer-preset]').forEach((b) => {
    b.onclick = () => {
      postTimer({ action: 'start', seconds: Number(b.dataset.timerPreset), label: b.dataset.timerLabel || '타이머' });
      $('tools-modal').hidden = true;
    };
  });
  $('timer-hud-toggle').onclick = () => postTimer({ action: timerState.running ? 'pause' : 'resume' });
  $('timer-hud-stop').onclick = () => postTimer({ action: 'reset' });

  // ---------- 7-B. 실시간 투표 (Poll) ----------
  let currentPoll = null;

  function renderPollCard() {
    const card = $('poll-card');
    if (!card) return;
    if (!currentPoll) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    $('poll-card-q').textContent = currentPoll.question;
    $('poll-card-meta').textContent = currentPoll.closed
      ? `마감됨 · 총 ${Object.keys(currentPoll.votes || {}).length}명 참여`
      : `${currentPoll.by}님의 투표 · 클릭해서 참여`;
    $('poll-close-vote').hidden = !!currentPoll.closed;

    const votes = currentPoll.votes || {};
    const total = Object.keys(votes).length;
    const myChoice = votes[clientId];
    const counts = currentPoll.options.map(() => 0);
    for (const idx of Object.values(votes)) {
      if (counts[idx] !== undefined) counts[idx]++;
    }

    const optsBox = $('poll-card-options');
    optsBox.innerHTML = '';
    currentPoll.options.forEach((opt, idx) => {
      const pct = total ? Math.round((counts[idx] / total) * 100) : 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'poll-opt-btn' + (myChoice === idx ? ' picked' : '');
      btn.disabled = !!currentPoll.closed;
      btn.innerHTML = `
        <span class="poll-opt-bar" style="width:${pct}%"></span>
        <span class="poll-opt-text"></span>
        <span class="poll-opt-stat">${counts[idx]}표 (${pct}%)</span>
      `;
      btn.querySelector('.poll-opt-text').textContent = opt;
      btn.onclick = () => {
        fetch('/api/poll/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: clientId, optionIndex: idx }),
        }).catch(() => {});
      };
      optsBox.appendChild(btn);
    });
  }

  function applyPollState(poll, notify = false) {
    const isNew = poll && (!currentPoll || currentPoll.id !== poll.id);
    currentPoll = poll || null;
    renderPollCard();
    if (notify && isNew) {
      playChime(false);
      pushNotification('🗳️', `새 투표: "${poll.question}"`);
    }
  }

  $('poll-create-form').onsubmit = async (e) => {
    e.preventDefault();
    const q = $('poll-q-input').value.trim();
    const opts = $('poll-opts-input').value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5);
    if (!q || opts.length < 2) {
      showToast('질문과 최소 2개 이상의 선택지(쉼표 구분)를 입력해 주세요!');
      return;
    }
    try {
      await fetch('/api/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, question: q, options: opts }),
      });
      $('tools-modal').hidden = true;
    } catch { /* ignore */ }
  };
  $('poll-close-vote').onclick = () => {
    fetch('/api/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: clientId, action: 'close' }) }).catch(() => {});
  };
  $('poll-dismiss').onclick = () => {
    fetch('/api/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: clientId, action: 'clear' }) }).catch(() => {});
  };

  // ---------- 5. 호스트 관리 (전원 소집 · 전원 음소거 · 방 비밀번호 잠금) ----------
  let roomLocked = false;

  function applyRoomLock(locked) {
    roomLocked = !!locked;
    $('host-lock-state').textContent = roomLocked ? '🔐 현재 방 잠금 ON' : '🔓 현재 공개 입장';
    $('btn-host-unlock').hidden = !roomLocked;
    const passWrap = $('join-passcode-field');
    if (passWrap) passWrap.hidden = !roomLocked;
  }

  $('btn-host-gather').onclick = () => {
    const pos = getPlayerPos();
    fetch('/api/host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, action: 'gather', x: pos.x, y: pos.y, z: pos.z }),
    }).catch(() => {});
    // AI 직원도 즉시 내 주위로 집합!
    npcs.forEach((n, idx) => {
      const ang = (idx / Math.max(1, npcs.length)) * Math.PI * 2;
      const r = 2.0 + (idx % 2) * 0.9;
      n.followPlayer = false;
      n.setRoute(pos.x + Math.cos(ang) * r, pos.z + Math.sin(ang) * r, pos.y);
      if (idx < 3) setTimeout(() => n.say('네! 지금 바로 모여요! 🏃', 3.5), 350 + idx * 250);
    });
    $('tools-modal').hidden = true;
    showToast('📢 전원을 내 위치로 소집했습니다!');
  };

  $('btn-host-mute').onclick = () => {
    fetch('/api/host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, action: 'mute_all' }),
    }).catch(() => {});
    $('tools-modal').hidden = true;
    showToast('🔇 전체 접속자에게 음소거를 요청했습니다!');
  };

  $('host-lock-form').onsubmit = (e) => {
    e.preventDefault();
    const pass = $('host-pass-input').value.trim();
    if (!pass) { showToast('비밀번호를 입력해 주세요.'); return; }
    fetch('/api/host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, action: 'lock', locked: true, passcode: pass }),
    }).catch(() => {});
    $('host-pass-input').value = '';
    showToast('🔐 입장 비밀번호 잠금이 설정되었습니다!');
  };
  $('btn-host-unlock').onclick = () => {
    fetch('/api/host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, action: 'lock', locked: false }),
    }).catch(() => {});
    showToast('🔓 입장 비밀번호 잠금을 해제했습니다.');
  };

  function onHostGather(data) {
    pushNotification('📢', `${data.by}님이 전원을 소집했습니다!`);
    if (data.byId === clientId) return;
    const jitterX = (Math.random() - 0.5) * 2.4;
    const jitterZ = (Math.random() - 0.5) * 2.4;
    player.sitting = null;
    player.setPos(data.x + jitterX, data.z + jitterZ, data.y || 0);
    playChime(false);
    showToast(`📢 ${data.by}님의 소집으로 이동했습니다!`);
  }

  function onHostMute(data) {
    pushNotification('🔇', `${data.by}님이 전체 음소거를 실행했습니다.`);
    if (data.byId === clientId) return;
    if (voice.muteFromHost()) {
      showToast(`🔇 호스트(${data.by}) 요청으로 마이크가 음소거되었습니다.`);
    }
  }

  // ---------- 10-A. 라운지 카페 자동 Lo-Fi BGM 존 ----------
  let bgmEnabled = true;
  let bgmPlaying = false;
  let bgmCtx = null;
  let bgmTimer = null;
  let bgmStep = 0;
  // 따뜻한 Lo-Fi 재즈 코드 진행 (Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
  const LOFI_CHORDS = [
    [349.23, 440.0, 523.25, 659.25],
    [329.63, 392.0, 493.88, 587.33],
    [293.66, 349.23, 440.0, 523.25],
    [261.63, 329.63, 392.0, 493.88],
  ];

  function playLofiChord() {
    if (!bgmPlaying || !bgmEnabled) return;
    try {
      if (!bgmCtx) bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (bgmCtx.state === 'suspended') bgmCtx.resume().catch(() => {});
      const chord = LOFI_CHORDS[bgmStep % LOFI_CHORDS.length];
      bgmStep++;
      const now = bgmCtx.currentTime;
      for (const freq of chord) {
        const osc = bgmCtx.createOscillator();
        const gain = bgmCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.018, now + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);
        osc.connect(gain);
        gain.connect(bgmCtx.destination);
        osc.start(now);
        osc.stop(now + 2.35);
      }
    } catch { /* ignore */ }
  }

  function updateAmbientBgmForZone(zoneId) {
    const shouldPlay = bgmEnabled && (zoneId === 'lounge' || zoneId === 'secret');
    if (shouldPlay && !bgmPlaying) {
      bgmPlaying = true;
      playLofiChord();
      bgmTimer = setInterval(playLofiChord, 2400);
      $('bgm-pill').hidden = false;
    } else if (!shouldPlay && bgmPlaying) {
      bgmPlaying = false;
      clearInterval(bgmTimer);
      bgmTimer = null;
      $('bgm-pill').hidden = true;
    }
  }

  $('btn-bgm-toggle').onclick = () => {
    bgmEnabled = !bgmEnabled;
    $('btn-bgm-toggle').textContent = bgmEnabled ? '🎵 공간 BGM ON' : '🔇 공간 BGM OFF';
    if (!bgmEnabled) updateAmbientBgmForZone('');
    showToast(bgmEnabled ? '🎵 라운지 카페·아지트 입장 시 잔잔한 BGM이 재생됩니다!' : '🔇 공간 자동 BGM을 껐습니다.');
  };

  // ---------- 10-B. 포토존 단체샷 (HUD 숨김 스냅샷) ----------
  function takePhotoSnapshot() {
    try {
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      const flash = $('photo-flash');
      if (flash) {
        flash.hidden = false;
        setTimeout(() => { flash.hidden = true; }, 220);
      }
      playNote(987.77, 0.08);
      const a = document.createElement('a');
      a.href = dataUrl;
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
      a.download = `먼작귀_오피스_포토_${stamp}.png`;
      a.click();
      showToast('📸 깔끔한 오피스 단체 기념사진을 저장했습니다!');
      pushNotification('📸', '오피스 기념사진을 촬영해 저장했습니다.');
    } catch {
      showToast('사진 저장 중 오류가 발생했어요.');
    }
  }
  $('btn-photo').onclick = takePhotoSnapshot;

  // ---------- 11-B. ZEP 저전력 모드 (4.png 상단 배너!) ----------
  let lowPowerMode = false;

  function setLowPowerMode(on) {
    lowPowerMode = !!on;
    renderer.setPixelRatio(lowPowerMode ? 1 : Math.min(window.devicePixelRatio, 2));
    $('lowpower-banner').hidden = !lowPowerMode;
    $('btn-lowpower').textContent = lowPowerMode ? '🔋 저전력 모드 ON' : '🔋 저전력 모드';
    $('btn-lowpower').classList.toggle('on', lowPowerMode);
    if (lowPowerMode) showToast('🔋 저전력 모드 ON! 화면 프레임을 절약 모드로 전환합니다.');
  }
  $('btn-lowpower').onclick = () => setLowPowerMode(!lowPowerMode);
  $('btn-lowpower-exit').onclick = () => setLowPowerMode(false);

  // ---------- ZEP 통합 도구 모달 (타이머 / 투표 / 미디어 / 호스트 / 설정) ----------
  function openToolsModal(tab = 'timer') {
    $('tools-modal').hidden = false;
    document.querySelectorAll('[data-tool-tab]').forEach((b) => b.classList.toggle('on', b.dataset.toolTab === tab));
    ['timer', 'poll', 'host', 'extras'].forEach((k) => {
      const el = $(`pane-tool-${k}`);
      if (el) el.hidden = k !== tab;
    });
  }
  document.querySelectorAll('[data-tool-tab]').forEach((b) => {
    b.onclick = () => openToolsModal(b.dataset.toolTab);
  });
  $('btn-zep-tools').onclick = () => {
    if ($('tools-modal').hidden) openToolsModal('timer');
    else $('tools-modal').hidden = true;
  };
  $('tools-close').onclick = () => { $('tools-modal').hidden = true; };
  $('btn-open-embed-from-tools').onclick = () => { $('tools-modal').hidden = true; openEmbedModal(); };

  // 주기적 타이머 & 자동 AFK 체크 (1초마다)
  function tick(joined) {
    updateTimerDisplay();
    if (joined && !autoAfkActive && myPresence !== 'afk' && performance.now() - lastActivityAt > 90000) {
      autoAfkActive = true;
      prevPresenceBeforeAfk = myPresence;
      myPresence = 'afk';
      broadcastPresence('💤 자리비움');
      pushNotification('💤', '90초간 움직임이 없어 자동으로 자리비움 상태가 되었습니다.');
    }
  }

  return {
    getEmoteSlots: () => customSlots,
    openEmbedModal,
    closeEmbedModal,
    openToolsModal,
    openLightbox,
    pushNotification,
    applyEmbedState,
    applyTimerState,
    applyPollState,
    applyRoomLock,
    onHostGather,
    onHostMute,
    updateAmbientBgmForZone,
    takePhotoSnapshot,
    setLowPowerMode,
    isLowPowerMode: () => lowPowerMode,
    getPresence: () => ({ presence: myPresence, handRaised: myHandRaised }),
    tick,
    closeAllPopups: () => {
      closeEmbedModal();
      $('tools-modal').hidden = true;
      $('notif-drawer').hidden = true;
      $('btn-notif-bell').classList.remove('active');
      if ($('users-drawer')) $('users-drawer').hidden = true;
      if ($('zep-apps-popover')) $('zep-apps-popover').hidden = true;
      if ($('btn-zep-apps')) $('btn-zep-apps').classList.remove('active');
      $('emote-picker').hidden = true;
      $('presence-menu').hidden = true;
      $('img-lightbox').hidden = true;
    },
  };
}
