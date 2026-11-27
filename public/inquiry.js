// 📨 관리자에게 문의하기 (사용자 측)
// - 문의 작성 / 내 문의 내역 / 관리자 답변 실시간 알림
// - 브라우저마다 고정 키(localStorage)를 써서 새로고침 후에도 내 문의 내역이 유지됨

const OWNER_KEY_STORAGE = 'aio_inquiry_owner_key';
const SEEN_STORAGE = 'aio_inquiry_seen_replies';

const CATEGORY_LABEL = {
  general: '💬 일반 문의',
  report: '🚨 사용자 신고',
  bug: '🐞 버그 · 오류',
  account: '👤 계정 · 제재',
  etc: '📎 기타',
};
const STATUS_LABEL = {
  open: ['답변 대기', 'st-open'],
  answered: ['답변 완료', 'st-answered'],
  closed: ['종료', 'st-closed'],
};

function fmtDate(ms) {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getOwnerKey() {
  let key = '';
  try { key = localStorage.getItem(OWNER_KEY_STORAGE) || ''; } catch { /* ignore */ }
  if (!/^[A-Za-z0-9_-]{4,40}$/.test(key)) {
    key = 'k_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    try { localStorage.setItem(OWNER_KEY_STORAGE, key); } catch { /* ignore */ }
  }
  return key;
}

function loadSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_STORAGE) || '{}') || {}; } catch { return {}; }
}
function saveSeen(seen) {
  try { localStorage.setItem(SEEN_STORAGE, JSON.stringify(seen)); } catch { /* ignore */ }
}

export function createInquiry({ clientId, getMyName, showToast, playNote }) {
  const $ = (id) => document.getElementById(id);
  const ownerKey = getOwnerKey();
  let myInquiries = [];
  let activeTab = 'write';
  let seen = loadSeen(); // inqId -> 확인한 답변 개수

  const unreadCount = () => myInquiries.filter((q) => (q.replies?.length || 0) > (seen[q.inqId] || 0)).length;

  function syncBadges() {
    const n = unreadCount();
    if ($('inquiry-rail-dot')) $('inquiry-rail-dot').hidden = n === 0;
    const badge = $('inq-mine-badge');
    if (badge) {
      badge.hidden = n === 0;
      badge.textContent = String(n);
    }
  }

  function markAllSeen() {
    for (const q of myInquiries) seen[q.inqId] = q.replies?.length || 0;
    saveSeen(seen);
    syncBadges();
  }

  function renderMine() {
    const box = $('inquiry-mine-list');
    if (!box) return;
    box.innerHTML = '';
    if (!myInquiries.length) {
      box.innerHTML = '<div class="inq-empty">아직 보낸 문의가 없어요.</div>';
      return;
    }
    for (const q of [...myInquiries].reverse()) {
      const card = document.createElement('div');
      card.className = 'inq-card';

      const top = document.createElement('div');
      top.className = 'inq-card-top';
      const [stTxt, stCls] = STATUS_LABEL[q.status] || STATUS_LABEL.open;
      const st = document.createElement('span');
      st.className = `inq-status ${stCls}`;
      st.textContent = stTxt;
      const cat = document.createElement('span');
      cat.textContent = CATEGORY_LABEL[q.category] || CATEGORY_LABEL.general;
      const tm = document.createElement('span');
      tm.className = 'inq-card-time';
      tm.textContent = fmtDate(q.time);
      top.append(st, cat, tm);

      const body = document.createElement('div');
      body.className = 'inq-card-text';
      body.textContent = q.text;
      card.append(top, body);

      for (const r of q.replies || []) {
        const rep = document.createElement('div');
        rep.className = 'inq-reply';
        const by = document.createElement('span');
        by.className = 'inq-reply-by';
        by.textContent = `🛡️ ${r.by || '관리자'} 답변 · ${fmtDate(r.time)}`;
        rep.append(by, document.createTextNode(r.text));
        card.appendChild(rep);
      }
      box.appendChild(card);
    }
  }

  async function fetchMine() {
    try {
      const res = await fetch('/api/inquiry/mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, ownerKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.inquiries)) {
        myInquiries = data.inquiries;
        if (activeTab === 'mine' && !$('inquiry-modal')?.hidden) markAllSeen();
        else syncBadges();
        renderMine();
      }
    } catch { /* ignore */ }
  }

  function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll('[data-inq-tab]').forEach((b) => b.classList.toggle('on', b.dataset.inqTab === tab));
    if ($('inq-pane-write')) $('inq-pane-write').hidden = tab !== 'write';
    if ($('inq-pane-mine')) $('inq-pane-mine').hidden = tab !== 'mine';
    if (tab === 'mine') {
      renderMine();
      markAllSeen();
    }
  }

  function open(tab) {
    const modal = $('inquiry-modal');
    if (!modal) return;
    modal.hidden = false;
    setTab(tab || (unreadCount() ? 'mine' : 'write'));
    fetchMine();
    if (activeTab === 'write') setTimeout(() => $('inquiry-text')?.focus(), 40);
  }

  function close() {
    if ($('inquiry-modal')) $('inquiry-modal').hidden = true;
  }

  // ---------- 이벤트 바인딩 ----------
  if ($('rail-btn-inquiry')) $('rail-btn-inquiry').onclick = () => {
    if ($('inquiry-modal')?.hidden === false) close();
    else open();
  };
  if ($('inquiry-close')) $('inquiry-close').onclick = close;
  document.querySelectorAll('[data-inq-tab]').forEach((b) => { b.onclick = () => setTab(b.dataset.inqTab); });

  const textEl = $('inquiry-text');
  if (textEl) {
    textEl.addEventListener('input', () => {
      if ($('inquiry-count')) $('inquiry-count').textContent = `${textEl.value.length} / 600`;
    });
  }

  if ($('inquiry-form')) {
    $('inquiry-form').onsubmit = async (e) => {
      e.preventDefault();
      const text = (textEl?.value || '').trim();
      if (!text) {
        showToast('✍️ 문의 내용을 입력해 주세요.');
        return;
      }
      const btn = $('inquiry-submit');
      if (btn) btn.disabled = true;
      try {
        const res = await fetch('/api/inquiry/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: clientId,
            ownerKey,
            name: getMyName ? getMyName() : '',
            category: $('inquiry-category')?.value || 'general',
            text,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          showToast('⏳ 문의는 15초에 한 번만 보낼 수 있어요. 잠시 후 다시 시도해 주세요.');
          return;
        }
        if (!res.ok || !data.ok) {
          showToast('⚠️ 문의를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
          return;
        }
        if (textEl) textEl.value = '';
        if ($('inquiry-count')) $('inquiry-count').textContent = '0 / 600';
        myInquiries.push(data.inquiry);
        seen[data.inquiry.inqId] = 0;
        saveSeen(seen);
        if (playNote) playNote(784, 0.12);
        showToast('📨 관리자에게 문의를 보냈어요! 답변이 오면 알려 드릴게요.');
        setTab('mine');
      } catch {
        showToast('⚠️ 서버 연결을 확인해 주세요.');
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }

  // 시작 시 기존 답변 확인 (새로고침 후에도 안 읽은 답변 표시)
  fetchMine();

  return {
    open,
    close,
    // SSE 'inquiry_update' 수신 (관리자 답변 / 상태 변경)
    onUpdate: (data) => {
      const inq = data?.inquiry;
      if (!inq) return;
      const idx = myInquiries.findIndex((q) => q.inqId === inq.inqId);
      if (idx >= 0) myInquiries[idx] = inq;
      else myInquiries.push(inq);
      if (data.action === 'reply') {
        if (playNote) {
          playNote(659, 0.12);
          setTimeout(() => playNote(880, 0.16), 140);
        }
        showToast('📨 관리자가 문의에 답변했어요! 📨 버튼에서 확인해 보세요.');
      }
      const modalOpen = $('inquiry-modal') && !$('inquiry-modal').hidden;
      if (modalOpen && activeTab === 'mine') markAllSeen();
      else syncBadges();
      renderMine();
    },
  };
}
