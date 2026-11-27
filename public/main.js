import * as THREE from 'three';
import { buildWorld, ZONES, ASSIGNABLE_SEATS, getZoneAt } from './world.js';
import { createStaffAndPlayer } from './characters.js';
import { createProximityVoice } from './voice.js';
import { createActivities } from './activities.js';
import { createBuilder } from './builder.js';
import { createZepFeatures, renderRichMessage, resizeChatImage } from './zep-features.js';
import { createControlRoom } from './admin-cctv.js';
import { createInquiry } from './inquiry.js';
import { createZepGames } from './zep-games.js';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'aio_3d_profile_v1';
const SWATCH_COLORS = ['#F2C14E', '#58B98A', '#F28CA8', '#6FA8E8', '#9C86E8', '#F09D51', '#4FB4D8'];

function makeClientId() {
  return 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function fmtTime(ms) {
  const d = new Date(ms || Date.now());
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDmDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) {
    return fmtTime(ms);
  }
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function loadSavedProfile(defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

function saveProfile(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// 업로드 이미지를 128x128 이하 가벼운 PNG DataURL로 리사이즈
function resizeUploadedImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 128;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(16, Math.round(img.width * scale));
        const h = Math.max(16, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function init() {
  const fill = $('loading-fill');
  fill.style.width = '28%';

  // 1. 회사 설정 불러오기
  let officeConfig = {
    company: '먼작귀 AI 오피스',
    boss: '랏코',
    assistant: '쿠리만쥬',
    teams: [],
    characters: [],
  };
  try {
    const res = await fetch('/api/office');
    if (res.ok) officeConfig = await res.json();
  } catch { /* fallback */ }

  $('loading-title').textContent = officeConfig.company;
  fill.style.width = '55%';

  // 2. Three.js 씬 & 렌더러 초기화
  const viewport = $('viewport');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 220);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  viewport.appendChild(renderer.domElement);

  // 3. 월드 & 캐릭터 생성
  const world = buildWorld(scene, officeConfig);
  fill.style.width = '78%';

  const actors = await createStaffAndPlayer(scene, officeConfig);
  const { player, npcs, remotes, entries } = actors;
  $('staff-count').textContent = String(npcs.length);
  if ($('staff-stat')) $('staff-stat').hidden = npcs.length === 0;
  fill.style.width = '100%';

  // 4. 현재 사용자 상태 & 멀티플레이어 세션
  const clientId = makeClientId();
  let joined = false;
  const defaultChar = officeConfig.bossCharacter || Object.keys(entries)[0] || '랏코';
  let myProfile = loadSavedProfile({
    name: officeConfig.boss || '랏코',
    status: '메타버스 탐험 중 ✨',
    charName: defaultChar,
    customAvatar: '',
    color: '#F2C14E',
  });
  const onlineDirectory = new Map(); // id -> { id, name, status, charName, customAvatar, color, zone, x, z }

  // 토스트 알림 헬퍼
  const assistantNpc = npcs.find((n) => n.id === 'assistant') || npcs[0] || null;
  let toastTimer = null;
  function showToast(text, who = assistantNpc) {
    $('toast-name').textContent = who ? `${who.name}` : '안내';
    const av = $('toast-avatar');
    if (who && who.charUrl) {
      av.src = who.charUrl;
      av.hidden = false;
    } else {
      av.removeAttribute('src');
      av.hidden = true;
    }
    $('toast-text').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4800);
  }

  // 일회성 콕 찌르기 플로팅 알림 (채팅/메시지에 기록을 남기지 않고 2.4초 뒤 자동으로 사라짐)
  let pokeToastTimer = null;
  function showPokeToast(text) {
    const el = $('poke-toast');
    const txt = $('poke-toast-text');
    if (!el || !txt) return;
    txt.textContent = text;
    el.hidden = false;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(pokeToastTimer);
    pokeToastTimer = setTimeout(() => {
      el.classList.remove('show');
      el.hidden = true;
    }, 2400);
  }

  // ---------- 5. ZEP 스타일 채팅 패널, 프라이빗 존, 귓속말, 스포트라이트, 근접 음성 ----------
  const chatLog = [];
  let activePanelTab = 'chat'; // 'chat' | 'users'
  let chatChannel = 'all';     // 'all' | 'private'
  let sendScope = 'all';       // 'all' | 'private' | 'spotlight'
  let currentPrivateZone = '';
  let currentPrivateZoneName = '';
  let unreadAll = false;
  let unreadPrivate = false;
  let spotlightOn = false;
  let spotlightTimer = null;
  let privateToastTimer = null;

  function showSpotlightBanner(who, text) {
    $('sp-who').textContent = who;
    $('sp-text').textContent = text;
    $('spotlight-banner').hidden = false;
    clearTimeout(spotlightTimer);
    spotlightTimer = setTimeout(() => { $('spotlight-banner').hidden = true; }, 6500);
  }

  function showPrivateToast(entered, zoneName = '') {
    const el = $('private-toast');
    const txt = $('private-toast-text');
    txt.textContent = entered
      ? (zoneName ? `프라이빗 영역(${zoneName})에 입장했습니다` : '프라이빗 영역에 입장했습니다')
      : '프라이빗 영역에서 퇴장했습니다';
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(privateToastTimer);
    privateToastTimer = setTimeout(() => { el.hidden = true; }, 2800);
  }

  const voice = createProximityVoice({
    clientId,
    getProfile: () => myProfile,
    onStatus: ({ micOn, camOn, screenOn }) => {
      $('btn-mic').classList.toggle('mic-on', micOn);
      $('btn-mic').title = micOn ? '마이크 켜짐 (클릭하여 끄기)' : '마이크 켜기/끄기';
      if (!micOn) $('btn-mic').classList.remove('mic-speaking');
      $('btn-video').classList.toggle('cam-on', camOn);
      $('btn-video').title = camOn ? '화상 캠 켜짐 (클릭하여 끄기)' : '화상 캠 켜기/끄기';
      if ($('btn-screen')) {
        $('btn-screen').classList.toggle('screen-on', !!screenOn);
        $('btn-screen').title = screenOn ? '화면공유 중 (클릭하여 중지)' : '실시간 화면공유 켜기/끄기';
      }
      if ($('screen-share-bar')) {
        $('screen-share-bar').hidden = !screenOn;
      }
      const meDir = onlineDirectory.get(clientId);
      if (meDir) {
        meDir.voiceOn = !!micOn;
        meDir.videoOn = !!camOn;
        meDir.screenOn = !!screenOn;
        renderOnlineUsers();
      }
    },
    onToast: (msg) => showToast(msg),
  });

  $('btn-mic').onclick = () => {
    voice.toggleMic([...onlineDirectory.values()]);
  };
  $('btn-video').onclick = () => {
    voice.toggleVideo([...onlineDirectory.values()]);
  };
  if ($('btn-screen')) {
    $('btn-screen').onclick = () => {
      voice.toggleScreenShare([...onlineDirectory.values()]);
    };
  }

  function syncSendBtnReady() {
    $('btn-chat-send').classList.toggle('ready', $('chat-input').value.trim().length > 0);
  }
  $('chat-input').addEventListener('input', syncSendBtnReady);

  function syncComposerUI() {
    const composer = $('zep-chat-composer');
    const isPrivateActive = !spotlightOn && chatChannel === 'private' && !!currentPrivateZone;
    composer.classList.toggle('mode-private', isPrivateActive);
    composer.classList.toggle('mode-spotlight', spotlightOn);

    $('btn-scope-all').classList.toggle('on', !spotlightOn && chatChannel === 'all');
    $('btn-scope-private').classList.toggle('on', isPrivateActive);
    $('btn-scope-private').classList.toggle('locked', !currentPrivateZone);
    $('spotlight-chip').hidden = !spotlightOn;

    $('dot-all').hidden = !unreadAll;
    $('dot-private').hidden = !unreadPrivate || !currentPrivateZone;

    const showPrivateNotice = activePanelTab === 'chat' && isPrivateActive;
    $('private-chat-notice').hidden = !showPrivateNotice;
    $('chat-stage').classList.toggle('has-private-notice', showPrivateNotice);

    if (spotlightOn) {
      $('chat-input').placeholder = '📣 전체 방송 메시지를 입력해 주세요';
    } else if (isPrivateActive) {
      $('chat-input').placeholder = '채팅을 입력해 주세요';
    } else {
      $('chat-input').placeholder = '채팅을 입력해 주세요';
    }
    syncSendBtnReady();
  }

  function setSendScope(sc) {
    if (sc === 'private' && !currentPrivateZone) sc = 'all';
    sendScope = sc;
    if (sc === 'all') {
      chatChannel = 'all';
      unreadAll = false;
    } else if (sc === 'private') {
      chatChannel = 'private';
      unreadPrivate = false;
    }
    syncComposerUI();
    if (activePanelTab === 'chat') renderChatMessages();
  }

  function setSpotlightMode(on) {
    spotlightOn = on;
    $('btn-spotlight').classList.toggle('sp-on', on);
    $('btn-spotlight').title = on ? '전체 방송 ON (클릭하여 끄기)' : '전체 방송(스포트라이트) 켜기/끄기';
    if (on) {
      sendScope = 'spotlight';
      syncComposerUI();
      showToast('📣 스포트라이트 방송 ON! 채팅을 입력하면 전체 상단 공지 배너로 방송됩니다.');
    } else {
      setSendScope(currentPrivateZone ? 'private' : 'all');
    }
  }
  $('btn-spotlight').onclick = () => setSpotlightMode(!spotlightOn);

  function updatePrivateZoneUI(zone, { announce = true } = {}) {
    const prevPrivate = currentPrivateZone;
    const nextPrivate = zone && zone.private ? zone.id : '';
    const nextName = zone && zone.private ? zone.name : '';
    currentPrivateZone = nextPrivate;
    currentPrivateZoneName = nextName;

    document.body.classList.toggle('in-private-zone', !!currentPrivateZone);
    $('private-badge').hidden = !currentPrivateZone;
    $('chat-zone-tag').hidden = !currentPrivateZone;
    if (currentPrivateZone) {
      $('private-badge').textContent = `🔒 프라이빗 · ${currentPrivateZoneName}`;
      $('chat-zone-tag').textContent = `🔒 ${currentPrivateZoneName}`;
    }

    if (nextPrivate && nextPrivate !== prevPrivate) {
      unreadPrivate = false;
      if (!spotlightOn) {
        chatChannel = 'private';
        sendScope = 'private';
      }
      if (announce) showPrivateToast(true, currentPrivateZoneName);
    } else if (!nextPrivate && prevPrivate) {
      unreadPrivate = false;
      if (!spotlightOn && chatChannel === 'private') {
        chatChannel = 'all';
        sendScope = 'all';
      }
      if (announce) showPrivateToast(false);
    }

    syncComposerUI();
    if (activePanelTab === 'chat') renderChatMessages();
  }

  function renderChatMessages() {
    const box = $('chat-messages');
    box.innerHTML = '';
    const isPrivateView = chatChannel === 'private' && !!currentPrivateZone;
    const filtered = chatLog.filter((m) => {
      if (isPrivateView) {
        return m.scope === 'private' && (!m.privateZone || m.privateZone === currentPrivateZone);
      }
      return m.scope !== 'private';
    });
    if (!filtered.length) {
      if (!isPrivateView) {
        const empty = document.createElement('div');
        empty.className = 'msg-row system';
        const pNames = ZONES.filter((z) => z.private).map((z) => z.name.replace(/^[^\p{L}\p{N}]+\s*/u, '')).join(' · ');
        empty.textContent = `💬 전체 채팅 탭입니다. 프라이빗 공간(${pNames})에 들어가면 프라이빗 대화를 쓸 수 있어요!`;
        box.appendChild(empty);
      }
      return;
    }
    for (const m of filtered) {
      const row = document.createElement('div');
      if (m.type === 'system') {
        row.className = 'msg-row system';
        row.textContent = m.text;
      } else {
        const isMe = m.senderId === clientId;
        row.className = 'msg-row' + (isMe ? ' me' : '');
        const head = document.createElement('div');
        head.className = 'msg-head';

        const nameEl = document.createElement('span');
        nameEl.className = 'msg-name';
        nameEl.style.color = m.color || '#3c2f27';
        nameEl.textContent = isMe ? `${m.name} (나)` : m.name;
        head.appendChild(nameEl);

        if (m.isAI) {
          const b = document.createElement('span');
          b.className = 'msg-badge ai';
          b.textContent = 'AI 직원';
          head.appendChild(b);
        } else if (m.scope === 'whisper') {
          const b = document.createElement('span');
          b.className = 'msg-badge whisper';
          b.textContent = m.targetName ? `💌 귓속말 → ${m.targetName}` : '💌 귓속말';
          head.appendChild(b);
        } else if (m.scope === 'private') {
          const b = document.createElement('span');
          b.className = 'msg-badge private';
          b.textContent = m.privateZoneName ? `🔒 ${m.privateZoneName}` : '🔒 프라이빗';
          head.appendChild(b);
        } else if (m.scope === 'spotlight') {
          const b = document.createElement('span');
          b.className = 'msg-badge spotlight';
          b.textContent = '📣 방송';
          head.appendChild(b);
        } else if (m.scope === 'nearby') {
          const b = document.createElement('span');
          b.className = 'msg-badge nearby';
          b.textContent = '📍 근처';
          head.appendChild(b);
        }

        const tm = document.createElement('span');
        tm.className = 'msg-time';
        tm.textContent = fmtTime(m.time);
        head.appendChild(tm);

        const bub = document.createElement('div');
        bub.className = 'msg-bubble';
        renderRichMessage(bub, m.text, m.image, (src) => zep?.openLightbox(src));
        row.append(head, bub);
      }
      box.appendChild(row);
    }
    box.scrollTop = box.scrollHeight;
  }

  function appendChat(msg) {
    chatLog.push(msg);
    if (chatLog.length > 100) chatLog.shift();
    if (msg.type === 'user' && msg.senderId !== clientId) {
      if (msg.scope === 'private' && currentPrivateZone && chatChannel !== 'private') {
        unreadPrivate = true;
        syncComposerUI();
      } else if (msg.scope !== 'private' && chatChannel === 'private') {
        unreadAll = true;
        syncComposerUI();
      }
    }
    if (activePanelTab === 'chat') renderChatMessages();
  }

  const SVG_MIC_ON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></svg>';
  const SVG_MIC_OFF = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 10v-1M5 10a7 7 0 0 0 12 4.9M15 9.34V5a3 3 0 0 0-5.68-1.33M9 9v1a3 3 0 0 0 5.12 2.12M12 17v4M8 21h8"/></svg>';
  const SVG_CAM_ON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2.5"/><path d="m16 10 6-3v10l-6-3"/></svg>';
  const SVG_CAM_OFF = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l5-2.84v9.16"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/></svg>';
  const SVG_SCREEN_ON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2.5"/><path d="M8 21h8M12 17v4"/></svg>';

  function renderLeftMembers() {
    const leftList = $('left-members-list');
    if (!leftList) return;
    const allItems = [...onlineDirectory.values()].sort((a, b) => (a.id === clientId ? -1 : b.id === clientId ? 1 : 0));
    const q = ($('left-member-search')?.value || '').trim().toLowerCase();
    const filtered = allItems.filter((u) => !q || (u.name || '').toLowerCase().includes(q) || (u.zone || '').toLowerCase().includes(q));
    if ($('left-member-count')) $('left-member-count').textContent = `${filtered.length}/${allItems.length || 1}`;
    leftList.innerHTML = '';
    if (!filtered.length) {
      const em = document.createElement('div');
      em.className = 'dm-empty';
      em.textContent = '검색 결과가 없어요.';
      leftList.appendChild(em);
      return;
    }
    for (const u of filtered) {
      const row = document.createElement('div');
      row.className = 'zep-left-row';
      const isMe = u.id === clientId;
      const pres = u.presence || 'online';
      const PRES_LABELS = {
        online: '💻 온라인',
        study: '📚 학습중',
        class: '🪑 수업중',
        mentoring: '💬 멘토링중',
        restroom: '🚽 화장실',
        afk: '🕒 자리비움',
        dnd: '⛔ 방해금지',
      };
      const presLabel = PRES_LABELS[pres] || PRES_LABELS.online;
      const presCls = PRES_LABELS[pres] ? pres : 'online';
      const micHtml = `<span class="z-media-ico ${u.voiceOn ? 'on' : 'off'}" title="${u.voiceOn ? '마이크 켜짐' : '마이크 꺼짐'}">${u.voiceOn ? SVG_MIC_ON : SVG_MIC_OFF}</span>`;
      const camHtml = u.screenOn
        ? `<span class="z-media-ico screen" title="화면공유 중">${SVG_SCREEN_ON}</span>`
        : `<span class="z-media-ico ${u.videoOn ? 'on' : 'off'}" title="${u.videoOn ? '캠 켜짐' : '캠 꺼짐'}">${u.videoOn ? SVG_CAM_ON : SVG_CAM_OFF}</span>`;
      row.innerHTML = `
        <span class="zep-left-name">${u.handRaised ? '✋ ' : ''}${u.name}</span>
        <div class="zep-left-right">
          ${micHtml}
          ${camHtml}
          <span class="zep-left-badge ${presCls}">${presLabel}</span>
        </div>
      `;
      if (!isMe) {
        row.title = `${u.name}님 옆으로 이동`;
        row.onclick = () => {
          stopFollowingUser();
          const av = remotes.get(u.id);
          const tx = av ? av.group.position.x : u.x;
          const tz = av ? av.group.position.z : u.z;
          player.sitting = null;
          player.setPos(tx + 1.2, tz + 1.2, groundHeightAt(tx + 1.2, tz + 1.2));
          showToast(`${u.name}님 옆으로 이동했습니다!`);
        };
      }
      leftList.appendChild(row);
    }
  }

  function renderOnlineUsers() {
    const count = onlineDirectory.size || 1;
    $('online-count').textContent = String(count);
    if ($('tab-user-count')) $('tab-user-count').textContent = String(count);
    const railAv = $('rail-my-avatar');
    if (railAv) {
      const myImg = myProfile.customAvatar || (entries[myProfile.charName]?.url) || (entries[defaultChar]?.url) || '';
      if (myImg && railAv.src !== myImg) railAv.src = myImg;
    }
    renderLeftMembers();

    const list = $('users-list');
    if (!list) return;
    list.innerHTML = '';
    const q = ($('users-search-input')?.value || '').trim().toLowerCase();
    const items = [...onlineDirectory.values()]
      .sort((a, b) => (a.id === clientId ? -1 : b.id === clientId ? 1 : 0))
      .filter((u) => !q || (u.name || '').toLowerCase().includes(q) || (u.zone || '').toLowerCase().includes(q));
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'dm-empty';
      empty.textContent = '검색된 사용자가 없어요.';
      list.appendChild(empty);
      return;
    }
    for (const u of items) {
      const card = document.createElement('div');
      card.className = 'user-card zep-user-row';
      const imgUrl = u.customAvatar || (entries[u.charName]?.url) || (entries[defaultChar]?.url) || '';
      const isMe = u.id === clientId;
      const pTag = u.privateZone ? '🔒 ' : '';
      const scrTag = u.screenOn ? '🖥️ ' : '';
      const handTag = u.handRaised ? '✋ ' : (u.presence === 'afk' ? '💤 ' : u.presence === 'dnd' ? '🔕 ' : '');
      const admTag = u.isAdmin ? '🛡️ ' : '';
      card.innerHTML = `
        <img src="${imgUrl}" alt="" />
        <div class="user-info">
          <strong>${admTag}${scrTag}${handTag}${u.name}${isMe ? ' (나)' : ''}</strong>
          <small>${pTag}${u.zone || '대표실'}${u.screenOn ? ' · 화면공유 중' : ''}${u.status ? ' · ' + u.status : ''}</small>
        </div>
      `;
      if (!isMe) {
        const actions = document.createElement('div');
        actions.className = 'zep-user-actions';
        const wBtn = document.createElement('button');
        wBtn.className = 'user-warp-btn';
        wBtn.textContent = '💌';
        wBtn.title = `${u.name}님에게 개인 메시지`;
        wBtn.onclick = () => openDmPanel(u.id);
        const fBtn = document.createElement('button');
        fBtn.className = 'user-warp-btn';
        fBtn.textContent = followTargetId === u.id ? '🛑' : '👣';
        fBtn.title = followTargetId === u.id ? '따라가기 해제' : `${u.name}님 따라가기`;
        fBtn.onclick = () => {
          if (followTargetId === u.id) stopFollowingUser();
          else startFollowingUser(u.id, u.name);
        };
        const btn = document.createElement('button');
        btn.className = 'user-warp-btn';
        btn.textContent = '이동';
        btn.onclick = () => {
          stopFollowingUser();
          const av = remotes.get(u.id);
          const tx = av ? av.group.position.x : u.x;
          const tz = av ? av.group.position.z : u.z;
          player.sitting = null;
          player.setPos(tx + 1.2, tz + 1.2, groundHeightAt(tx + 1.2, tz + 1.2));
          showToast(`${u.name}님 옆으로 이동했습니다!`);
        };
        actions.append(wBtn, fBtn, btn);
        if (controlRoom && controlRoom.isAdmin()) {
          const kBtn = document.createElement('button');
          kBtn.className = 'user-warp-btn admin-kick';
          kBtn.textContent = '👢';
          kBtn.title = `${u.name}님 강퇴`;
          kBtn.onclick = () => controlRoom.promptKick(u.id, u.name);
          const bBtn = document.createElement('button');
          bBtn.className = 'user-warp-btn admin-ban';
          bBtn.textContent = '⛔';
          bBtn.title = `${u.name}님 영구 밴`;
          bBtn.onclick = () => controlRoom.promptBan(u.id, u.name);
          actions.append(kBtn, bBtn);
        }
        card.appendChild(actions);
      }
      list.appendChild(card);
    }
    if (controlRoom) controlRoom.onUsersChanged();
  }

  // ---------- ZEP 스타일 지정 좌석 선택 & 3D 책상 이름표 시스템 ----------
  const SEATS_STORAGE_KEY = 'aio_3d_seats_v1';
  let seatAssignments = {};
  let seatPickMode = false;
  let focusedSeatId = '';

  function loadSeatAssignments() {
    try {
      const raw = localStorage.getItem(SEATS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        seatAssignments = parsed;
      }
    } catch { seatAssignments = {}; }
  }
  function saveSeatAssignments() {
    try { localStorage.setItem(SEATS_STORAGE_KEY, JSON.stringify(seatAssignments)); } catch { /* ignore */ }
  }
  loadSeatAssignments();

  function getMySeatId() {
    const myName = (myProfile?.name || '').trim();
    if (!myName) return '';
    for (const [sid, info] of Object.entries(seatAssignments)) {
      if (info && info.ownerName === myName) return sid;
    }
    return '';
  }

  function refreshAllSeatUI() {
    const myName = (myProfile?.name || '').trim();
    world.updateSeatAssignments(seatAssignments, myName, seatPickMode);
    syncSeatClaimBar();
    if (!$('seat-modal')?.hidden) renderSeatModal();
    renderLeftMembers();
  }

  function sitAtAssignedSeat(seatId) {
    const meta = ASSIGNABLE_SEATS.find((s) => s.id === seatId);
    if (!meta) return;
    const it = world.interactables.find((x) => x.type === 'sit' && x.seatId === seatId);
    walkTarget = null;
    world.hideWalkMarker();
    stopFollowingUser();
    player.danceStyle = null;
    if (it && it.seat) {
      sitOnFurniture(it.seat);
    } else {
      const sy = Number.isFinite(meta.seatY) ? meta.seatY : 0.59;
      const rot = meta.rotY || 0;
      const sx = meta.seatX + Math.sin(rot) * 0.18;
      const sz = meta.seatZ + Math.cos(rot) * 0.18;
      player.sitting = { x: sx, y: sy, z: sz, rotY: rot, exitX: meta.seatX + Math.sin(rot) * 0.72, exitZ: meta.seatZ + Math.cos(rot) * 0.72, seatId: meta.id, label: meta.label };
      player.setPos(sx, sz, sy);
      player.facingYaw = rot;
    }
    portalCooldownUntil = performance.now() + 1200;
    player.happyUntil = performance.now() + 900;
    playChime(false);
    syncSeatClaimBar();
  }

  function claimMySeat(seatId, shouldSit = true) {
    const meta = ASSIGNABLE_SEATS.find((s) => s.id === seatId);
    if (!meta) return;
    const myName = (myProfile?.name || '게스트').trim();
    const prevOwner = seatAssignments[seatId]?.ownerName;
    if (prevOwner && prevOwner !== myName) {
      if (!confirm(`이미 "${prevOwner}"님의 지정 좌석(${meta.label})입니다.\n내 지정 좌석으로 변경할까요?`)) return;
    }
    for (const [sid, info] of Object.entries(seatAssignments)) {
      if (info && info.ownerName === myName) delete seatAssignments[sid];
    }
    seatAssignments[seatId] = {
      seatId,
      ownerName: myName,
      color: myProfile?.color || meta.color || '#5B5CE6',
      updatedAt: Date.now(),
    };
    saveSeatAssignments();
    refreshAllSeatUI();
    if (shouldSit) sitAtAssignedSeat(seatId);
    else playChime(false);
    showToast(`🏷️ [${meta.label}]을(를) 내 지정 좌석으로 등록했습니다! 책상 이름표에 내 이름이 표시됩니다.`);
  }

  function releaseMySeat(seatId = '') {
    const targetId = seatId || getMySeatId();
    if (!targetId || !seatAssignments[targetId]) return;
    const meta = ASSIGNABLE_SEATS.find((s) => s.id === targetId);
    delete seatAssignments[targetId];
    saveSeatAssignments();
    refreshAllSeatUI();
    showToast(`🪑 [${meta?.label || '지정 좌석'}] 지정을 해제했습니다.`);
  }

  function setSeatPickMode(on) {
    seatPickMode = !!on;
    if ($('seat-pick-banner')) $('seat-pick-banner').hidden = !seatPickMode;
    if (seatPickMode && $('seat-modal')) $('seat-modal').hidden = true;
    world.updateSeatAssignments(seatAssignments, (myProfile?.name || '').trim(), seatPickMode);
  }

  function syncSeatClaimBar() {
    const bar = $('seat-claim-bar');
    if (!bar) return;
    const sid = player.sitting?.seatId || '';
    if (!sid) {
      bar.hidden = true;
      return;
    }
    const meta = ASSIGNABLE_SEATS.find((s) => s.id === sid);
    if (!meta) {
      bar.hidden = true;
      return;
    }
    const mySeat = getMySeatId();
    const isMine = mySeat === sid;
    const owner = seatAssignments[sid]?.ownerName || '';
    $('seat-claim-label').textContent = isMine
      ? `★ 내 지정 좌석 · ${meta.label}`
      : (owner ? `🪑 ${meta.label} (${owner}님 자리)` : `🪑 ${meta.label} · 빈 좌석`);
    $('btn-seat-claim-quick').hidden = isMine;
    $('btn-seat-release-quick').hidden = !isMine;
    bar.hidden = false;
  }

  function renderSeatModal() {
    const grid = $('seat-zones-grid');
    if (!grid) return;
    const mySeatId = getMySeatId();
    const myMeta = ASSIGNABLE_SEATS.find((s) => s.id === mySeatId);
    $('seat-my-current').textContent = myMeta ? `★ ${myMeta.label} (${myProfile.name})` : '아직 지정된 좌석이 없습니다';
    $('btn-seat-go-mine').hidden = !myMeta;
    $('btn-seat-release-mine').hidden = !myMeta;

    const groups = [
      { zoneId: 'team0', title: '🌿 1학년 1반 교실 (프라이빗 존)' },
      { zoneId: 'team1', title: '🌸 1학년 2반 교실 (프라이빗 존)' },
      { zoneId: 'ceo', title: '🍎 교무실 (프라이빗 존)' },
    ];
    grid.innerHTML = '';
    for (const g of groups) {
      const seats = ASSIGNABLE_SEATS.filter((s) => s.zoneId === g.zoneId);
      if (!seats.length) continue;
      const wrap = document.createElement('div');
      wrap.className = 'seat-zone-group';
      const head = document.createElement('div');
      head.className = 'seat-zone-head';
      const used = seats.filter((s) => !!seatAssignments[s.id]).length;
      head.innerHTML = `<span>${g.title}</span><small style="color:#475569;font-weight:800">${used}/${seats.length} 지정됨</small>`;
      const cards = document.createElement('div');
      cards.className = 'seat-cards-grid';
      for (const s of seats) {
        const info = seatAssignments[s.id];
        const isMine = s.id === mySeatId;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `seat-card${isMine ? ' mine' : ''}${focusedSeatId === s.id ? ' focus' : ''}`;
        btn.innerHTML = `
          <div class="seat-card-meta">
            <strong>${s.label}</strong>
            <small>${isMine ? `★ ${info.ownerName} (내 자리)` : (info ? `🏷️ ${info.ownerName}` : '빈 좌석')}</small>
          </div>
          <span class="seat-card-pill">${isMine ? '바로 앉기' : '내 자리 지정'}</span>
        `;
        btn.title = s.label;
        btn.onclick = () => {
          if (isMine) {
            $('seat-modal').hidden = true;
            sitAtAssignedSeat(s.id);
          } else {
            claimMySeat(s.id, true);
            $('seat-modal').hidden = true;
          }
        };
        cards.appendChild(btn);
      }
      wrap.append(head, cards);
      grid.appendChild(wrap);
    }
  }

  function openSeatModal(highlightSeatId = '') {
    focusedSeatId = highlightSeatId || '';
    setSeatPickMode(false);
    renderSeatModal();
    $('seat-modal').hidden = false;
  }

  function warpToMySeat() {
    const mySeatId = getMySeatId();
    if (mySeatId) {
      sitAtAssignedSeat(mySeatId);
      const meta = ASSIGNABLE_SEATS.find((s) => s.id === mySeatId);
      showToast(`🪑 내 지정 좌석(${meta?.label || '내 자리'})으로 이동해 착석했습니다!`);
    } else {
      openSeatModal();
      showToast('🏷️ 먼저 내 지정 좌석을 선택해 보세요! (맵에서 직접 클릭도 가능해요)');
    }
  }

  if ($('seat-modal-close')) $('seat-modal-close').onclick = () => { $('seat-modal').hidden = true; };
  if ($('btn-seat-go-mine')) $('btn-seat-go-mine').onclick = () => { $('seat-modal').hidden = true; warpToMySeat(); };
  if ($('btn-seat-release-mine')) $('btn-seat-release-mine').onclick = () => releaseMySeat();
  if ($('btn-seat-pick-3d')) $('btn-seat-pick-3d').onclick = () => { setSeatPickMode(true); showToast('👆 3D 맵에서 원하는 책상 의자나 이름표를 직접 클릭하세요!'); };
  if ($('btn-seat-pick-cancel')) $('btn-seat-pick-cancel').onclick = () => setSeatPickMode(false);
  if ($('btn-seat-claim-quick')) $('btn-seat-claim-quick').onclick = () => { if (player.sitting?.seatId) claimMySeat(player.sitting.seatId, false); };
  if ($('btn-seat-release-quick')) $('btn-seat-release-quick').onclick = () => { if (player.sitting?.seatId) releaseMySeat(player.sitting.seatId); };
  if ($('btn-seat-modal-open-quick')) $('btn-seat-modal-open-quick').onclick = () => openSeatModal(player.sitting?.seatId || '');
  if ($('rail-btn-seat')) $('rail-btn-seat').onclick = () => openSeatModal();
  if ($('btn-app-seat')) $('btn-app-seat').onclick = () => openSeatModal();

  window.addEventListener('storage', (ev) => {
    if (ev.key === SEATS_STORAGE_KEY) {
      loadSeatAssignments();
      refreshAllSeatUI();
    }
  });
  world.updateSeatAssignments(seatAssignments, (myProfile?.name || '').trim(), false);

  // 좌측 레일 & 도킹 상태 동기화 헬퍼 (1.png ZEP 스타일)
  function syncLeftDockLayout() {
    const leftOpen = !$('zep-left-panel')?.hidden;
    const chatOpen = !$('chat-panel')?.hidden;
    const chatDocked = chatOpen && $('chat-panel')?.classList.contains('expanded');
    document.body.classList.toggle('zep-left-docked', leftOpen || chatDocked);
    $('rail-btn-members')?.classList.toggle('active', leftOpen);
    $('rail-btn-chat')?.classList.toggle('active', chatOpen);
    if ($('btn-left-reopen')) $('btn-left-reopen').hidden = true;
    if ($('chat-reopen-btn')) $('chat-reopen-btn').hidden = chatOpen;
  }

  function toggleLeftMembersPanel(forceOpen = null) {
    const panel = $('zep-left-panel');
    if (!panel) return;
    const nextOpen = forceOpen !== null ? forceOpen : panel.hidden;
    if (nextOpen) {
      panel.classList.remove('minimized');
      // 채팅이 전체 높이 도킹 중이라면 겹치지 않게 플로팅으로 축소
      if ($('chat-panel')?.classList.contains('expanded')) {
        $('chat-panel').classList.remove('expanded');
        $('chat-btn-expand')?.classList.remove('on');
      }
      renderLeftMembers();
    }
    panel.hidden = !nextOpen;
    syncLeftDockLayout();
  }

  // 좌측 상단 ZEP 멤버 목록 패널 & 52px 세로 레일 컨트롤 (1.png 스타일)
  if ($('btn-left-settings')) {
    $('btn-left-settings').onclick = () => {
      const pop = $('zep-settings-popover');
      pop.hidden = !pop.hidden;
    };
  }
  if ($('btn-left-min')) {
    $('btn-left-min').onclick = () => {
      $('zep-left-panel').classList.toggle('minimized');
    };
  }
  if ($('btn-left-close')) {
    $('btn-left-close').onclick = () => toggleLeftMembersPanel(false);
  }
  if ($('btn-left-reopen')) {
    $('btn-left-reopen').onclick = () => toggleLeftMembersPanel(true);
  }
  if ($('btn-quick-members')) {
    $('btn-quick-members').onclick = () => toggleLeftMembersPanel();
  }
  if ($('btn-quick-seat')) {
    $('btn-quick-seat').onclick = () => warpToMySeat();
  }
  if ($('left-group-toggle')) {
    $('left-group-toggle').onclick = () => {
      $('zep-left-panel').classList.toggle('group-collapsed');
    };
  }
  if ($('left-member-search')) {
    $('left-member-search').addEventListener('input', renderLeftMembers);
  }
  if ($('btn-my-seat')) {
    $('btn-my-seat').onclick = () => warpToMySeat();
  }
  if ($('btn-app-minimap')) {
    $('btn-app-minimap').onclick = () => {
      const mm = $('minimap-card');
      const opening = mm.hidden;
      closeTopRightDrawers(opening ? 'minimap' : '');
      mm.hidden = !opening;
    };
  }

  // 최좌측 ZEP 레일 아이콘 연결
  if ($('rail-btn-members')) $('rail-btn-members').onclick = () => toggleLeftMembersPanel();
  if ($('rail-btn-chat')) {
    $('rail-btn-chat').onclick = () => {
      const cp = $('chat-panel');
      const opening = cp.hidden;
      cp.hidden = !opening;
      syncLeftDockLayout();
      if (opening) $('chat-input')?.focus();
    };
  }
  if ($('rail-btn-menu')) $('rail-btn-menu').onclick = () => $('btn-zep-tools')?.click();
  if ($('rail-btn-announce')) $('rail-btn-announce').onclick = () => $('btn-spotlight')?.click();
  if ($('rail-btn-map')) $('rail-btn-map').onclick = () => $('btn-app-minimap')?.click();
  if ($('rail-btn-link')) $('rail-btn-link').onclick = () => $('btn-invite')?.click();
  if ($('rail-btn-board')) $('rail-btn-board').onclick = () => $('btn-board')?.click();
  if ($('rail-btn-games')) $('rail-btn-games').onclick = () => $('btn-games')?.click();
  if ($('rail-btn-build')) $('rail-btn-build').onclick = () => $('btn-build')?.click();
  if ($('rail-btn-embed')) $('rail-btn-embed').onclick = () => { if (zep) zep.openEmbedModal(); };
  if ($('rail-btn-control')) $('rail-btn-control').onclick = () => { if (controlRoom) controlRoom.openControlRoom(); };
  if ($('btn-app-control')) $('btn-app-control').onclick = () => { if (controlRoom) controlRoom.openControlRoom(); };
  if ($('rail-btn-help')) $('rail-btn-help').onclick = () => $('btn-help')?.click();
  if ($('rail-btn-profile')) $('rail-btn-profile').onclick = () => $('btn-profile')?.click();
  if ($('rail-btn-settings')) {
    $('rail-btn-settings').onclick = () => {
      if ($('zep-left-panel').hidden) toggleLeftMembersPanel(true);
      $('zep-settings-popover').hidden = !$('zep-settings-popover').hidden;
    };
  }
  // Tab 키로 채팅 탭(전체 ↔ 프라이빗) 즉시 전환 (1.png 'Tab 키로 탭을 이동해 보세요')
  $('chat-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!currentPrivateZone) return;
      setSendScope(chatChannel === 'private' ? 'all' : 'private');
    }
  });

  // 우측 상단 ZEP 사용자 목록 카드 · 검색 · 미니맵 토글
  function closeTopRightDrawers(except = '') {
    if (except !== 'users' && $('users-drawer')) $('users-drawer').hidden = true;
    if (except !== 'minimap' && $('minimap-card')) $('minimap-card').hidden = true;
    if (except !== 'notif' && $('notif-drawer')) {
      $('notif-drawer').hidden = true;
      $('btn-notif-bell')?.classList.remove('active');
    }
  }
  if ($('btn-users-drawer')) {
    $('btn-users-drawer').onclick = () => {
      const dr = $('users-drawer');
      const opening = dr.hidden;
      closeTopRightDrawers(opening ? 'users' : '');
      dr.hidden = !opening;
      if (opening) renderOnlineUsers();
    };
  }
  if ($('btn-users-close')) {
    $('btn-users-close').onclick = () => { $('users-drawer').hidden = true; };
  }
  if ($('btn-users-search')) {
    $('btn-users-search').onclick = () => {
      const wrap = $('users-search-wrap');
      wrap.hidden = !wrap.hidden;
      if (!wrap.hidden) $('users-search-input').focus();
      else { $('users-search-input').value = ''; renderOnlineUsers(); }
    };
  }
  if ($('users-search-input')) {
    $('users-search-input').addEventListener('input', renderOnlineUsers);
  }
  if ($('users-group-toggle')) {
    $('users-group-toggle').onclick = () => {
      $('users-drawer').classList.toggle('group-collapsed');
    };
  }
  if ($('btn-minimap-toggle')) {
    $('btn-minimap-toggle').onclick = () => {
      const mm = $('minimap-card');
      const opening = mm.hidden;
      closeTopRightDrawers(opening ? 'minimap' : '');
      mm.hidden = !opening;
    };
  }
  if ($('btn-minimap-close')) {
    $('btn-minimap-close').onclick = () => { $('minimap-card').hidden = true; };
  }

  // 하단 중앙 ZEP 앱 & 기능 팝오버 (⊞+)
  if ($('btn-zep-apps')) {
    $('btn-zep-apps').onclick = () => {
      const pop = $('zep-apps-popover');
      const opening = pop.hidden;
      if (opening && $('emote-picker')) $('emote-picker').hidden = true;
      pop.hidden = !opening;
      $('btn-zep-apps').classList.toggle('active', opening);
    };
  }
  if ($('zep-apps-close')) {
    $('zep-apps-close').onclick = () => {
      $('zep-apps-popover').hidden = true;
      $('btn-zep-apps')?.classList.remove('active');
    };
  }
  document.querySelectorAll('#zep-apps-popover .zep-app-item').forEach((item) => {
    item.addEventListener('click', () => {
      $('zep-apps-popover').hidden = true;
      $('btn-zep-apps')?.classList.remove('active');
    });
  });

  // ZEP 스타일 하단 전체 / 프라이빗 전환 버튼
  $('btn-scope-all').onclick = () => {
    if (spotlightOn) setSpotlightMode(false);
    setSendScope('all');
  };

  $('btn-scope-private').onclick = () => {
    if (!currentPrivateZone) {
      const pNames = ZONES.filter((z) => z.private).map((z) => z.name.replace(/^[^\p{L}\p{N}]+\s*/u, '')).join(' · ');
      showToast(`🔒 프라이빗 영역(${pNames})에 입장하면 프라이빗 대화를 선택할 수 있어요!`);
      return;
    }
    if (spotlightOn) setSpotlightMode(false);
    setSendScope('private');
  };

  // ZEP 채팅창 우측 상단 3버튼 (플로팅 미니모드 · 전체 높이 크게 보기 · 닫기) + 재오픈 버튼
  if ($('chat-btn-pip')) {
    $('chat-btn-pip').onclick = () => {
      const panel = $('chat-panel');
      if (panel.classList.contains('expanded')) {
        panel.classList.remove('expanded');
        $('chat-btn-expand')?.classList.remove('on');
        syncLeftDockLayout();
        return;
      }
      const on = panel.classList.toggle('pip-mode');
      $('chat-btn-pip').classList.toggle('on', on);
      syncLeftDockLayout();
    };
  }
  if ($('chat-btn-expand')) {
    $('chat-btn-expand').onclick = () => {
      const panel = $('chat-panel');
      const on = panel.classList.toggle('expanded');
      if (on) {
        panel.classList.remove('pip-mode');
        if ($('zep-left-panel')) $('zep-left-panel').hidden = true;
      }
      $('chat-btn-expand').classList.toggle('on', on);
      $('chat-btn-pip')?.classList.remove('on');
      syncLeftDockLayout();
    };
  }
  $('chat-collapse').onclick = () => {
    $('chat-panel').hidden = true;
    $('chat-panel').classList.remove('expanded');
    $('chat-btn-expand')?.classList.remove('on');
    syncLeftDockLayout();
  };
  if ($('chat-reopen-btn')) {
    $('chat-reopen-btn').onclick = () => {
      $('chat-panel').hidden = false;
      syncLeftDockLayout();
    };
  }
  syncLeftDockLayout();

  // ---------- 5-B. ZEP 스타일 1:1 개인 메시지(DM) 검색 & 대화 ----------
  const dmThreads = new Map(); // peerId -> { peerId, name, color, avatarUrl, isAI, npcRef, zone, teamName, messages: [], unread: 0, lastAt: 0 }
  let activeDmPeerId = null;
  let dmMuted = false;

  function resolveContactById(peerId) {
    if (!peerId) return null;
    if (onlineDirectory.has(peerId)) {
      const u = onlineDirectory.get(peerId);
      return {
        peerId: u.id,
        name: u.name || '접속자',
        color: u.color || '#6FA8E8',
        avatarUrl: u.customAvatar || (entries[u.charName]?.url) || (entries[defaultChar]?.url) || '',
        isAI: false,
        online: true,
        zone: u.zone || '오피스',
        teamName: u.status || '',
      };
    }
    if (peerId.startsWith('ai_')) {
      const npcId = peerId.slice(3);
      const n = npcs.find((x) => x.id === npcId);
      if (n) {
        return {
          peerId,
          name: n.name,
          color: n.color || '#58B98A',
          avatarUrl: n.charUrl || '',
          isAI: true,
          npcRef: n,
          online: true,
          zone: getZoneAt(n.group.position.x, n.group.position.z).name,
          teamName: n.teamName || 'AI 직원',
        };
      }
    }
    return dmThreads.get(peerId) || null;
  }

  function ensureDmThread(contact) {
    if (!contact || !contact.peerId) return null;
    let th = dmThreads.get(contact.peerId);
    if (!th) {
      th = {
        peerId: contact.peerId,
        name: contact.name || '사용자',
        color: contact.color || '#6FA8E8',
        avatarUrl: contact.avatarUrl || '',
        isAI: !!contact.isAI,
        npcRef: contact.npcRef || null,
        zone: contact.zone || '',
        teamName: contact.teamName || '',
        messages: [],
        unread: 0,
        lastAt: 0,
      };
      dmThreads.set(contact.peerId, th);
    } else {
      if (contact.name) th.name = contact.name;
      if (contact.color) th.color = contact.color;
      if (contact.avatarUrl) th.avatarUrl = contact.avatarUrl;
      if (contact.zone) th.zone = contact.zone;
      if (contact.teamName) th.teamName = contact.teamName;
      if (contact.npcRef) th.npcRef = contact.npcRef;
    }
    return th;
  }

  function syncDmUnreadBadge() {
    let total = 0;
    for (const th of dmThreads.values()) total += th.unread || 0;
    const badge = $('dm-unread-badge');
    badge.textContent = total > 99 ? '99+' : String(total);
    badge.hidden = total <= 0;
  }

  function getSearchableDmContacts() {
    const map = new Map();
    for (const u of onlineDirectory.values()) {
      if (u.id === clientId) continue;
      map.set(u.id, {
        peerId: u.id,
        name: u.name || '접속자',
        color: u.color || '#6FA8E8',
        avatarUrl: u.customAvatar || (entries[u.charName]?.url) || (entries[defaultChar]?.url) || '',
        isAI: false,
        online: true,
        zone: u.zone || '오피스',
        teamName: u.status || '',
      });
    }
    for (const n of npcs) {
      const pid = `ai_${n.id}`;
      map.set(pid, {
        peerId: pid,
        name: n.name,
        color: n.color || '#58B98A',
        avatarUrl: n.charUrl || '',
        isAI: true,
        npcRef: n,
        online: true,
        zone: getZoneAt(n.group.position.x, n.group.position.z).name,
        teamName: n.teamName || 'AI 직원',
      });
    }
    for (const th of dmThreads.values()) {
      if (!map.has(th.peerId)) {
        map.set(th.peerId, { ...th, online: false });
      }
    }
    return [...map.values()];
  }

  function createDmRowEl(contact, thread) {
    const row = document.createElement('div');
    row.className = 'dm-row';
    const lastMsg = thread && thread.messages.length ? thread.messages[thread.messages.length - 1] : null;
    const dateTxt = lastMsg ? fmtDmDate(lastMsg.time) : (contact.isAI ? 'AI 직원' : (contact.online ? '접속 중' : '오프라인'));
    const previewTxt = lastMsg
      ? lastMsg.text
      : (contact.isAI ? `${contact.teamName} · 메시지 보내기` : `${contact.zone} · 1:1 메시지 시작`);
    const bgHex = contact.color || '#8c8ef7';
    const unread = thread ? (thread.unread || 0) : 0;

    row.innerHTML = `
      <div class="dm-row-avatar" style="background:${bgHex}33">
        <img src="${contact.avatarUrl || ''}" alt="" />
        ${contact.online ? '<span class="dm-online-dot"></span>' : ''}
      </div>
      <div class="dm-row-body">
        <div class="dm-row-top">
          <span class="dm-row-name"></span>
          <span class="dm-row-date"></span>
        </div>
        <div class="dm-row-bottom">
          <span class="dm-row-preview"></span>
          ${unread > 0 ? `<span class="dm-row-unread">${unread > 99 ? '99+' : unread}</span>` : ''}
        </div>
      </div>
    `;
    row.querySelector('.dm-row-name').textContent = contact.name;
    row.querySelector('.dm-row-date').textContent = dateTxt;
    row.querySelector('.dm-row-preview').textContent = previewTxt;
    row.onclick = () => openDmChat(contact.peerId);
    return row;
  }

  function renderDmList() {
    const listEl = $('dm-list');
    const qRaw = $('dm-search-input').value.trim();
    const qNorm = qRaw.toLowerCase().replace(/\s+/g, '');
    $('dm-search-clear').hidden = !qRaw;
    listEl.innerHTML = '';

    const contacts = getSearchableDmContacts();
    const matchQuery = (c) => {
      if (!qNorm) return true;
      const hay = `${c.name} ${c.teamName || ''} ${c.zone || ''}`.toLowerCase().replace(/\s+/g, '');
      return hay.includes(qNorm);
    };

    const filtered = contacts.filter(matchQuery);
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'dm-empty';
      empty.textContent = `"${qRaw}" 검색 결과가 없습니다.\n닉네임이나 직원 이름으로 다시 검색해 보세요.`;
      listEl.appendChild(empty);
      return;
    }

    const withHistory = filtered
      .filter((c) => {
        const th = dmThreads.get(c.peerId);
        return th && th.messages.length > 0;
      })
      .sort((a, b) => (dmThreads.get(b.peerId)?.lastAt || 0) - (dmThreads.get(a.peerId)?.lastAt || 0));

    const historyIds = new Set(withHistory.map((c) => c.peerId));
    const onlineHumans = filtered.filter((c) => !c.isAI && !historyIds.has(c.peerId));
    const aiContacts = filtered.filter((c) => c.isAI && !historyIds.has(c.peerId));

    const addSection = (title, items) => {
      if (!items.length) return;
      if (title) {
        const sec = document.createElement('div');
        sec.className = 'dm-section-label';
        sec.textContent = title;
        listEl.appendChild(sec);
      }
      for (const c of items) {
        listEl.appendChild(createDmRowEl(c, dmThreads.get(c.peerId)));
      }
    };

    if (qNorm) {
      // 검색 중에는 최근 대화 -> 접속자 -> AI 직원 순으로 바로 선택 가능하게 표시
      addSection('', [...withHistory, ...onlineHumans, ...aiContacts]);
    } else {
      addSection(withHistory.length ? '최근 메시지' : '', withHistory);
      addSection('접속 중인 사용자', onlineHumans);
      addSection('AI 오피스 직원 (1:1 대화)', aiContacts);
    }
  }

  function renderDmMessages() {
    const box = $('dm-messages');
    const th = activeDmPeerId ? dmThreads.get(activeDmPeerId) : null;
    box.innerHTML = '';
    if (!th || !th.messages.length) {
      const empty = document.createElement('div');
      empty.className = 'dm-empty';
      empty.textContent = th
        ? `${th.name}님과의 1:1 개인 메시지입니다.\n아래 입력창에서 메시지를 보내 보세요!`
        : '대화 상대를 선택해 주세요.';
      box.appendChild(empty);
      return;
    }
    for (const m of th.messages) {
      const row = document.createElement('div');
      row.className = 'dm-msg ' + (m.fromMe ? 'me' : 'them');
      const bub = document.createElement('div');
      bub.className = 'dm-bubble';
      renderRichMessage(bub, m.text, m.image, (src) => zep?.openLightbox(src));
      const tm = document.createElement('span');
      tm.className = 'dm-time';
      tm.textContent = fmtTime(m.time);
      row.append(bub, tm);
      box.appendChild(row);
    }
    box.scrollTop = box.scrollHeight;
  }

  function openDmChat(peerId) {
    const contact = resolveContactById(peerId);
    if (!contact) return;
    const th = ensureDmThread(contact);
    activeDmPeerId = th.peerId;
    th.unread = 0;
    syncDmUnreadBadge();

    $('dm-peer-img').src = th.avatarUrl || '';
    $('dm-peer-avatar').style.background = `${th.color || '#8c8ef7'}33`;
    $('dm-peer-name').textContent = th.name;
    $('dm-peer-sub').textContent = th.isAI
      ? `🤖 AI 직원 · ${th.teamName || '오피스'}`
      : (onlineDirectory.has(th.peerId) ? `🟢 접속 중 · ${th.zone || '오피스'}` : '⚪ 오프라인');
    $('dm-input').placeholder = `${th.name}님에게 메시지 입력`;

    $('dm-list-view').hidden = true;
    $('dm-chat-view').hidden = false;
    renderDmMessages();
    setTimeout(() => $('dm-input').focus(), 20);
  }

  function showDmListView(focusSearch = false) {
    activeDmPeerId = null;
    $('dm-chat-view').hidden = true;
    $('dm-list-view').hidden = false;
    renderDmList();
    if (focusSearch) setTimeout(() => $('dm-search-input').focus(), 20);
  }

  function openDmPanel(peerId = null) {
    $('dm-panel').hidden = false;
    $('btn-dm-toggle').classList.add('active');
    if (peerId) openDmChat(peerId);
    else showDmListView(true);
  }

  function closeDmPanel() {
    $('dm-panel').hidden = true;
    $('btn-dm-toggle').classList.remove('active');
    activeDmPeerId = null;
  }

  function syncDmSendBtn() {
    $('btn-dm-send').classList.toggle('ready', $('dm-input').value.trim().length > 0);
  }
  $('dm-input').addEventListener('input', syncDmSendBtn);

  function onIncomingDm(dm) {
    const contact = resolveContactById(dm.fromId) || {
      peerId: dm.fromId,
      name: dm.fromName || '접속자',
      color: dm.fromColor || '#6FA8E8',
      avatarUrl: dm.fromAvatar || (entries[dm.fromChar]?.url) || (entries[defaultChar]?.url) || '',
      isAI: false,
      online: true,
      zone: '오피스',
    };
    const th = ensureDmThread(contact);
    th.messages.push({ fromMe: false, text: dm.text || '', image: dm.image || '', time: dm.time || Date.now() });
    if (th.messages.length > 80) th.messages.shift();
    th.lastAt = dm.time || Date.now();

    const viewingThis = !$('dm-panel').hidden && activeDmPeerId === th.peerId;
    if (viewingThis) {
      th.unread = 0;
      renderDmMessages();
    } else {
      th.unread = (th.unread || 0) + 1;
      syncDmUnreadBadge();
      if (!$('dm-panel').hidden && !activeDmPeerId) renderDmList();
      if (!dmMuted) playChime(false);
      const preview = dm.text ? dm.text.slice(0, 34) : '🖼️ 이미지';
      showToast(`💌 ${th.name}님의 개인 메시지: "${preview}"`);
      if (zep) zep.pushNotification('💌', `${th.name}님의 개인 메시지: "${preview}"`);
    }
  }

  async function sendDmPayload({ text = '', image = '' }) {
    if ((!text && !image) || !activeDmPeerId) return;
    const th = dmThreads.get(activeDmPeerId);
    if (!th) return;
    const nowMs = Date.now();
    const myMsg = { fromMe: true, text, image, time: nowMs };
    th.messages.push(myMsg);
    if (th.messages.length > 80) th.messages.shift();
    th.lastAt = nowMs;
    renderDmMessages();

    if (th.isAI) {
      const targetNpc = th.npcRef || npcs.find((n) => `ai_${n.id}` === th.peerId);
      if (targetNpc) {
        setTimeout(() => {
          let reply = '';
          if (image && !text) {
            reply = `우와! ${myProfile.name}님이 보내주신 이미지 잘 받았어요! 깔끔하네요 ✨`;
          } else if (text.includes('수고') || text.includes('잘했') || text.includes('최고') || text.includes('고마워')) {
            reply = targetNpc.persona.praise;
          } else if (text.includes('안녕') || text.includes('하이') || text.includes('반가')) {
            reply = `${myProfile.name}님 안녕하세요! ${targetNpc.persona.greet}`;
          } else if (text.includes('뭐해') || text.includes('어디') || text.includes('무슨 일')) {
            const zName = getZoneAt(targetNpc.group.position.x, targetNpc.group.position.z).name;
            reply = `지금 ${zName}에서 "${targetNpc.currentTask}" 진행 중이에요!`;
          } else if (text.includes('커피') || text.includes('라운지') || text.includes('쉬자')) {
            reply = '좋아요! 라운지 카페에서 잠깐 커피 한 잔 하면서 얘기해요 ☕';
          } else {
            reply = `네 ${myProfile.name}님! "${text.slice(0, 22)}" 내용 1:1로 확인했습니다! 바로 챙겨 볼게요 ✨`;
          }
          th.messages.push({ fromMe: false, text: reply, time: Date.now() });
          th.lastAt = Date.now();
          if (!$('dm-panel').hidden && activeDmPeerId === th.peerId) {
            renderDmMessages();
          } else {
            th.unread = (th.unread || 0) + 1;
            syncDmUnreadBadge();
            if (!$('dm-panel').hidden && !activeDmPeerId) renderDmList();
          }
          if (!dmMuted) playNote(784, 0.1);
        }, 550);
      }
      return;
    }

    try {
      const res = await fetch('/api/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clientId,
          name: myProfile.name,
          targetId: th.peerId,
          targetName: th.name,
          text,
          image,
        }),
      });
      if (res.status === 403) {
        th.messages.push({ fromMe: false, text: '🔇 관리자에 의해 채팅/메시지가 금지되어 전송할 수 없습니다.', time: Date.now() });
        renderDmMessages();
      } else if (!res.ok) {
        th.messages.push({ fromMe: false, text: '⚠️ 상대방이 현재 오프라인 상태라 전달되지 않았어요.', time: Date.now() });
        renderDmMessages();
      } else {
        // 서버에서 욕설 필터가 적용된 경우, 내 화면의 메시지도 * 처리된 내용으로 교체
        const data = await res.json().catch(() => null);
        if (data?.dm && typeof data.dm.text === 'string' && data.dm.text !== myMsg.text) {
          myMsg.text = data.dm.text;
          renderDmMessages();
        }
      }
    } catch {
      th.messages.push({ fromMe: false, text: '⚠️ 네트워크 오류로 메시지를 보내지 못했어요.', time: Date.now() });
      renderDmMessages();
    }
  }

  $('dm-form').onsubmit = async (e) => {
    e.preventDefault();
    const text = $('dm-input').value.trim();
    if (!text || !activeDmPeerId) return;
    $('dm-input').value = '';
    syncDmSendBtn();
    await sendDmPayload({ text });
  };

  $('dm-img-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeDmPeerId) return;
    try {
      const image = await resizeChatImage(file);
      await sendDmPayload({ text: '', image });
    } catch {
      showToast('이미지를 불러오지 못했어요.');
    }
  });

  $('btn-dm-toggle').onclick = () => {
    if ($('dm-panel').hidden) openDmPanel();
    else closeDmPanel();
  };
  $('btn-dm-close').onclick = closeDmPanel;
  $('btn-dm-close-2').onclick = closeDmPanel;
  $('btn-dm-back').onclick = () => showDmListView(false);
  $('btn-dm-search-focus').onclick = () => $('dm-search-input').focus();
  $('btn-dm-mute').onclick = () => {
    dmMuted = !dmMuted;
    $('btn-dm-mute').classList.toggle('muted', dmMuted);
    showToast(dmMuted ? '🔕 개인 메시지 알림음을 껐습니다.' : '🔔 개인 메시지 알림음을 켰습니다.');
  };
  $('dm-search-input').addEventListener('input', renderDmList);
  $('dm-search-clear').onclick = () => {
    $('dm-search-input').value = '';
    renderDmList();
    $('dm-search-input').focus();
  };

  // ---------- 6. ZEP 스타일 입장 / 캐릭터 커스터마이징 모달 ----------
  let draftProfile = { ...myProfile };

  function updateProfilePreview() {
    const nick = $('input-nickname').value.trim() || '게스트';
    const stat = $('input-status').value.trim();
    draftProfile.name = nick;
    draftProfile.status = stat;
    $('preview-tag').textContent = nick;
    $('preview-tag').style.borderColor = draftProfile.color;
    $('preview-status').textContent = stat || '상태 메시지 없음';
    const imgSrc = draftProfile.customAvatar || entries[draftProfile.charName]?.url || entries[defaultChar]?.url || '';
    $('preview-img').src = imgSrc;
    $('preview-img').style.imageRendering = draftProfile.customAvatar ? 'auto' : 'pixelated';
  }

  function renderSwatches() {
    const box = $('color-swatches');
    box.innerHTML = '';
    for (const col of SWATCH_COLORS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (draftProfile.color === col ? ' active' : '');
      b.style.background = col;
      b.onclick = () => {
        draftProfile.color = col;
        renderSwatches();
        updateProfilePreview();
      };
      box.appendChild(b);
    }
  }

  function renderCharGrid() {
    const grid = $('char-grid');
    grid.innerHTML = '';
    for (const [name, entry] of Object.entries(entries)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = !draftProfile.customAvatar && draftProfile.charName === name;
      btn.className = 'char-item' + (isSelected ? ' active' : '');
      btn.innerHTML = `<img src="${entry.url}" alt="${name}" /><span>${name}</span>`;
      btn.onclick = () => {
        draftProfile.charName = name;
        draftProfile.customAvatar = '';
        renderCharGrid();
        updateProfilePreview();
      };
      grid.appendChild(btn);
    }
  }

  $('input-nickname').addEventListener('input', updateProfilePreview);
  $('input-status').addEventListener('input', updateProfilePreview);
  $('input-avatar-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeUploadedImage(file);
      draftProfile.customAvatar = dataUrl;
      renderCharGrid();
      updateProfilePreview();
    } catch {
      showToast('이미지를 불러오지 못했어요. PNG/JPG 파일을 선택해 주세요.');
    }
    e.target.value = '';
  });

  function openProfileModal(isFirstEntry = false) {
    draftProfile = { ...myProfile };
    $('input-nickname').value = draftProfile.name;
    $('input-status').value = draftProfile.status;
    $('profile-title').textContent = isFirstEntry ? '내 캐릭터 설정하고 입장하기' : '내 캐릭터 & 프로필 꾸미기';
    $('btn-enter-world').textContent = isFirstEntry ? '✨ 이 캐릭터로 오피스 입장하기' : '✅ 변경한 캐릭터 적용하기';
    $('profile-close').hidden = isFirstEntry;
    renderSwatches();
    renderCharGrid();
    updateProfilePreview();
    $('profile-overlay').hidden = false;
  }

  $('profile-close').onclick = () => { $('profile-overlay').hidden = true; };
  $('btn-profile').onclick = () => openProfileModal(false);

  async function applyMyProfileAndJoin() {
    myProfile = {
      name: ($('input-nickname').value.trim() || '게스트').slice(0, 16),
      status: $('input-status').value.trim().slice(0, 24),
      charName: draftProfile.charName || defaultChar,
      customAvatar: draftProfile.customAvatar || '',
      color: draftProfile.color || '#F2C14E',
    };
    saveProfile(myProfile);
    refreshAllSeatUI();

    const customEntry = await actors.resolveCustomEntry(myProfile.customAvatar);
    const charEntry = actors.pickEntry(myProfile.charName, 0);
    player.updateProfile({
      name: myProfile.name,
      status: myProfile.status,
      color: myProfile.color,
      charName: myProfile.charName,
      charEntry,
      customEntry,
    });

    const curZoneObj = getZoneAt(player.group.position.x, player.group.position.z);
    const passcode = $('input-passcode') ? $('input-passcode').value.trim() : '';
    const payload = {
      id: clientId,
      ...myProfile,
      passcode,
      x: player.group.position.x,
      y: player.baseY,
      z: player.group.position.z,
      zone: curZoneObj.name,
      privateZone: curZoneObj.private ? curZoneObj.id : '',
    };

    const wasJoined = joined;
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 403) {
        const err = await res.json().catch(() => ({}));
        if (err.error === 'banned') {
          if (controlRoom) controlRoom.onBanned(err);
          else showToast(`⛔ 영구 차단되었습니다: ${err.reason || ''}`);
          return;
        }
        if (zep) zep.applyRoomLock(true);
        showToast('🔐 입장 비밀번호가 올바르지 않습니다. 다시 확인해 주세요!');
        return;
      }
      // 닉네임 · 상태메시지에 욕설 필터가 적용됐다면 서버 값(* 처리)으로 내 화면도 맞춤
      const joinData = res.ok ? await res.json().catch(() => null) : null;
      const sp = joinData?.player;
      if (sp && (sp.name !== myProfile.name || sp.status !== myProfile.status)) {
        myProfile.name = sp.name;
        myProfile.status = sp.status;
        payload.name = sp.name;
        payload.status = sp.status;
        player.updateProfile({ name: sp.name, status: sp.status, color: myProfile.color, charName: myProfile.charName, charEntry, customEntry });
        if (sp.name.includes('*')) showToast('🚫 닉네임에 사용할 수 없는 단어가 있어 * 로 가려졌어요.');
      }
    } catch { /* offline fallback */ }

    updatePrivateZoneUI(curZoneObj, { announce: !wasJoined && !!curZoneObj.private });
    onlineDirectory.set(clientId, payload);
    renderOnlineUsers();
    $('profile-overlay').hidden = true;
    joined = true;

    if (!wasJoined) {
      player.say(`${myProfile.name} 입장! ✨`, 4.5);
      if (curZoneObj.private) {
        showPrivateToast(true, curZoneObj.name);
      } else {
        showToast(`${myProfile.name}님 환영합니다! 좌측 채팅창에서 전체/프라이빗 대화를 선택해 보세요.`);
      }
    } else {
      player.say('캐릭터 변신 완료! ✨', 3.5);
    }
  }
  $('btn-enter-world').onclick = applyMyProfileAndJoin;

  let activities = null;
  let builder = null;
  let zep = null;
  let controlRoom = null;
  let inquiry = null;
  let zepGames = null;
  let followTargetId = null;
  let walkTarget = null;
  let myOnSpotlight = false;

  function startFollowingUser(uid, uname) {
    followTargetId = uid;
    walkTarget = null;
    world.hideWalkMarker();
    $('follow-banner-name').textContent = uname || '접속자';
    $('follow-banner').hidden = false;
    renderOnlineUsers();
    showToast(`👣 ${uname}님을 따라가기 시작했습니다! (이동 키를 누르면 해제됩니다)`);
  }
  function stopFollowingUser() {
    if (!followTargetId) return;
    followTargetId = null;
    $('follow-banner').hidden = true;
    renderOnlineUsers();
  }
  $('btn-follow-stop').onclick = stopFollowingUser;
  let audioCtx = null;
  function playNote(freq, dur = 0.16) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch { /* ignore */ }
  }
  function playChime(fanfare = false) {
    const notes = fanfare ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 880.0];
    notes.forEach((f, idx) => setTimeout(() => playNote(f, 0.18), idx * 95));
  }

  // ---------- 7. SSE 실시간 멀티플레이어 연결 ----------
  function connectRealtime() {
    const es = new EventSource(`/api/stream?id=${encodeURIComponent(clientId)}`);

    es.addEventListener('snapshot', async (ev) => {
      const data = JSON.parse(ev.data);
      for (const p of data.players || []) {
        if (p.id === clientId) continue;
        onlineDirectory.set(p.id, p);
        await actors.upsertRemote(p);
        voice.onRemoteJoin(p);
      }
      if (Array.isArray(data.chat) && chatLog.length === 0) {
        for (const m of data.chat) chatLog.push(m);
        renderChatMessages();
      }
      if (data.worldMode && data.worldMode !== actors.getMode()) {
        applyWorldModeLocal(data.worldMode);
      }
      if (activities) activities.applySnapshot(data);
      if (builder && Array.isArray(data.customProps)) builder.syncPropsList(data.customProps);
      if (zep) {
        if (data.sharedEmbed) zep.applyEmbedState(data.sharedEmbed, false);
        if (data.sharedTimer) zep.applyTimerState(data.sharedTimer);
        if (data.activePoll) zep.applyPollState(data.activePoll, false);
        zep.applyRoomLock(!!data.roomLocked);
      }
      renderOnlineUsers();
      if (!$('dm-panel').hidden && !activeDmPeerId) renderDmList();
    });

    es.addEventListener('join', async (ev) => {
      const p = JSON.parse(ev.data);
      if (p.id === clientId) return;
      onlineDirectory.set(p.id, p);
      const av = await actors.upsertRemote(p);
      voice.onRemoteJoin(p);
      av.say('안녕하세요! ✨', 4);
      if (zep) zep.pushNotification('✨', `${p.name}님이 오피스에 입장했습니다.`);
      renderOnlineUsers();
      if (!$('dm-panel').hidden && !activeDmPeerId) renderDmList();
    });

    es.addEventListener('profile', async (ev) => {
      const p = JSON.parse(ev.data);
      if (p.id === clientId) return;
      onlineDirectory.set(p.id, p);
      await actors.upsertRemote(p);
      renderOnlineUsers();
      if (!$('dm-panel').hidden && !activeDmPeerId) renderDmList();
    });

    es.addEventListener('presence', (ev) => {
      const d = JSON.parse(ev.data);
      const dir = onlineDirectory.get(d.id);
      if (dir) {
        dir.presence = d.presence || 'online';
        dir.handRaised = !!d.handRaised;
        if (typeof d.status === 'string') dir.status = d.status;
      }
      const av = d.id === clientId ? player : remotes.get(d.id);
      if (av && typeof d.status === 'string') {
        av.status = d.status;
        av.refreshNameTag();
      }
      if (d.id !== clientId && d.handRaised && zep) {
        zep.pushNotification('✋', `${d.name}님이 손을 들었습니다!`);
      }
      renderOnlineUsers();
    });

    es.addEventListener('move', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === clientId) return;
      const av = remotes.get(m.id);
      if (av) {
        av.remoteTarget.x = m.x;
        av.remoteTarget.y = m.y;
        av.remoteTarget.z = m.z;
        if (Number.isFinite(m.yaw)) av.remoteTarget.yaw = m.yaw;
        av.remoteTarget.moving = !!m.moving;
        av.remoteTarget.sitting = !!m.sitting;
        av.remoteTarget.sittingFloor = !!m.sittingFloor;
        av.remoteTarget.dance = m.dance || '';
      }
      const dir = onlineDirectory.get(m.id);
      if (dir) {
        dir.x = m.x; dir.z = m.z;
        dir.onSpotlight = !!m.onSpotlight;
        if (typeof m.privateZone === 'string') dir.privateZone = m.privateZone;
        if (m.zone && dir.zone !== m.zone) {
          dir.zone = m.zone;
          if (!$('users-drawer')?.hidden) renderOnlineUsers();
        }
      }
    });

    es.addEventListener('leave', (ev) => {
      const d = JSON.parse(ev.data);
      if (followTargetId === d.id) stopFollowingUser();
      onlineDirectory.delete(d.id);
      actors.removeRemote(d.id);
      voice.cleanupPeer(d.id);
      renderOnlineUsers();
      if (!$('dm-panel').hidden && !activeDmPeerId) renderDmList();
    });

    es.addEventListener('embed', (ev) => {
      if (zep) zep.applyEmbedState(JSON.parse(ev.data), true);
    });
    es.addEventListener('timer', (ev) => {
      if (zep) zep.applyTimerState(JSON.parse(ev.data));
    });
    es.addEventListener('poll', (ev) => {
      if (zep) zep.applyPollState(JSON.parse(ev.data), true);
    });
    es.addEventListener('host_gather', (ev) => {
      if (zep) zep.onHostGather(JSON.parse(ev.data));
    });
    es.addEventListener('host_mute', (ev) => {
      if (zep) zep.onHostMute(JSON.parse(ev.data));
    });
    es.addEventListener('room_lock', (ev) => {
      const d = JSON.parse(ev.data);
      if (zep) zep.applyRoomLock(!!d.locked);
    });

    es.addEventListener('dm', (ev) => {
      const dm = JSON.parse(ev.data);
      onIncomingDm(dm);
    });

    es.addEventListener('spotlight', (ev) => {
      const d = JSON.parse(ev.data);
      showSpotlightBanner(d.name, d.text);
    });

    es.addEventListener('voice', (ev) => {
      const d = JSON.parse(ev.data);
      const dir = onlineDirectory.get(d.id);
      if (dir) {
        dir.voiceOn = !!d.voiceOn;
        dir.videoOn = !!d.videoOn;
        dir.screenOn = !!d.screenOn;
        renderOnlineUsers();
      }
      voice.onRemoteMediaChange(d.id, {
        voiceOn: !!d.voiceOn,
        videoOn: !!d.videoOn,
        screenOn: !!d.screenOn,
        name: d.name || dir?.name,
      });
    });

    es.addEventListener('signal', (ev) => {
      const d = JSON.parse(ev.data);
      const dir = onlineDirectory.get(d.fromId);
      voice.handleSignal(d.fromId, d.signal, dir?.name || '접속자');
    });

    es.addEventListener('chat', (ev) => {
      const m = JSON.parse(ev.data);
      appendChat(m);
      if (m.type === 'user') {
        const bubbleTxt = m.text || (m.image ? '🖼️ 이미지를 보냈어요' : '');
        if (!bubbleTxt) return;
        if (m.senderId === clientId) {
          player.say(bubbleTxt, 5.5);
        } else {
          const av = remotes.get(m.senderId);
          if (av) av.say(bubbleTxt, 5.5);
        }
      }
    });

    es.addEventListener('emote', (ev) => {
      const d = JSON.parse(ev.data);
      if (d.id === clientId) return; // 본인 이모티콘은 즉시 로컬 표시하므로 중복 방지
      const av = remotes.get(d.id);
      if (av) av.emote(d.emoji, d.label);
    });

    es.addEventListener('poke', (ev) => {
      const d = JSON.parse(ev.data);
      const fromAv = d.fromId === clientId ? player : remotes.get(d.fromId);
      const targetAv = d.targetId === clientId ? player : remotes.get(d.targetId);
      if (fromAv && d.fromId !== clientId) {
        if (targetAv) fromAv.faceToward(targetAv.group.position.x, targetAv.group.position.z);
        fromAv.triggerPoke();
        fromAv.say('👉 콕!', 2.2);
      }
      if (targetAv) {
        targetAv.triggerPoked();
        targetAv.say('앗! 깜짝이야! 😮', 3.2);
        if (d.targetId === clientId) {
          playNote(680, 0.09);
        }
      }
      // 채팅/메시지에는 남기지 않고 일회성 플로팅 알림으로만 잠깐 표시 후 자동 소멸!
      if (d.fromName && d.targetName) {
        showPokeToast(`${d.fromName}님이 ${d.targetName}님을 콕 찔렀어요!`);
      }
    });

    // 관제실 관리자 실시간 모니터링 & 제재 이벤트
    es.addEventListener('admin_log', (ev) => {
      if (controlRoom) controlRoom.onAdminLog(JSON.parse(ev.data));
    });
    es.addEventListener('admin_bans', (ev) => {
      if (controlRoom) controlRoom.onAdminBans(JSON.parse(ev.data));
    });
    es.addEventListener('admin_mutes', (ev) => {
      if (controlRoom) controlRoom.onAdminMutes(JSON.parse(ev.data));
    });
    es.addEventListener('kicked', (ev) => {
      if (controlRoom) controlRoom.onKicked(JSON.parse(ev.data));
    });
    es.addEventListener('banned', (ev) => {
      if (controlRoom) controlRoom.onBanned(JSON.parse(ev.data));
    });
    es.addEventListener('admin_warn', (ev) => {
      if (controlRoom) controlRoom.onAdminWarn(JSON.parse(ev.data));
    });
    es.addEventListener('chat_muted', (ev) => {
      if (controlRoom) controlRoom.onChatMuted(JSON.parse(ev.data));
    });

    // 📨 관리자 문의: 사용자 측 답변 알림 / 관리자 측 신규 접수·목록 갱신
    es.addEventListener('inquiry_update', (ev) => {
      if (inquiry) inquiry.onUpdate(JSON.parse(ev.data));
    });
    es.addEventListener('inquiry_new', (ev) => {
      if (controlRoom) controlRoom.onInquiryNew(JSON.parse(ev.data));
    });
    es.addEventListener('inquiry_list', (ev) => {
      if (controlRoom) controlRoom.onInquiryList(JSON.parse(ev.data));
    });

    es.addEventListener('mode', (ev) => {
      const d = JSON.parse(ev.data);
      applyWorldModeLocal(d.mode);
    });

    es.addEventListener('board_stroke', (ev) => {
      if (activities) activities.onBoardStroke(JSON.parse(ev.data));
    });
    es.addEventListener('board_clear', () => {
      if (activities) activities.onBoardClear();
    });
    es.addEventListener('notes_update', (ev) => {
      if (activities) activities.onNotesUpdate(JSON.parse(ev.data));
    });
    es.addEventListener('quiz_start', (ev) => {
      if (activities) activities.onQuizStart(JSON.parse(ev.data));
    });
    es.addEventListener('wheel_spin', (ev) => {
      if (activities) activities.onWheelSpin(JSON.parse(ev.data));
    });
    es.addEventListener('prop_add', (ev) => {
      if (builder) builder.onPropAdd(JSON.parse(ev.data));
    });
    es.addEventListener('prop_delete', (ev) => {
      const d = JSON.parse(ev.data);
      if (builder) builder.onPropDelete(d.propId);
    });
    es.addEventListener('props_clear', () => {
      if (builder) builder.onPropsClear();
    });
  }

  activities = createActivities({
    scene,
    clientId,
    getProfile: () => myProfile,
    player,
    npcs,
    showToast,
    appendChat,
    playChime,
    onQuizWarpToOx: () => {
      if (!joined) return;
      const px = player.group.position.x, pz = player.group.position.z;
      if (px >= 19.5 && px <= 32.5 && pz >= -8.5 && pz <= 4.5 && player.baseY < 3) return;
      stopFollowingUser();
      walkTarget = null;
      world.hideWalkMarker();
      player.sitting = null;
      player.seatGlide = null;
      player.danceStyle = null;
      syncSeatClaimBar();
      const jitterX = (Math.random() - 0.5) * 1.4;
      const jitterZ = (Math.random() - 0.5) * 0.8;
      player.setPos(25.8 + jitterX, 3.2 + jitterZ, 0);
      player.facingYaw = Math.PI;
      yaw = 0;
      portalCooldownUntil = performance.now() + 1800;
      player.happyUntil = performance.now() + 900;
      playChime(false);
      showToast('⭕❌ OX 퀴즈 시작! OX 퀴즈 광장으로 자동 이동했어요 — O 또는 X 발판으로 이동하세요!');
    },
  });
  $('btn-board').onclick = () => activities.openBoardModal('wb');
  $('btn-games').onclick = () => activities.openGamesModal('ox');

  zepGames = createZepGames({
    scene,
    clientId,
    getProfile: () => myProfile,
    player,
    showToast,
    appendChat,
    playChime,
    playNote,
    triggerCelebration: (msg) => { if (activities) activities.triggerCelebration(msg); },
    warpPlayerTo: (tx, tz, ty = 0, faceYaw = Math.PI, camYawVal = null) => {
      stopFollowingUser();
      walkTarget = null;
      world.hideWalkMarker();
      player.sitting = null;
      player.seatGlide = null;
      player.danceStyle = null;
      syncSeatClaimBar();
      player.setPos(tx, tz, ty);
      if (Number.isFinite(faceYaw)) player.facingYaw = faceYaw;
      if (Number.isFinite(camYawVal)) yaw = camYawVal;
      portalCooldownUntil = performance.now() + 1600;
    },
  });

  builder = createBuilder({
    scene,
    camera,
    canvas: renderer.domElement,
    clientId,
    groundHeightAt,
    showToast,
    playChime,
  });
  $('btn-build').onclick = () => builder.toggle();

  zep = createZepFeatures({
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
    triggerEmote: (em, lb, idx) => triggerEmote(em, lb, idx),
    onPresenceUpdated: ({ presence, handRaised, statusText }) => {
      myProfile.status = statusText;
      player.status = statusText;
      player.refreshNameTag();
      const meDir = onlineDirectory.get(clientId);
      if (meDir) {
        meDir.presence = presence;
        meDir.handRaised = handRaised;
        meDir.status = statusText;
        renderOnlineUsers();
      }
    },
    getPlayerPos: () => ({ x: player.group.position.x, y: player.baseY, z: player.group.position.z }),
  });

  controlRoom = createControlRoom({
    scene,
    renderer,
    player,
    remotes,
    npcs,
    clientId,
    onlineDirectory,
    getZoneAt,
    warpTo: (zoneId) => warpTo(zoneId),
    showToast,
    playChime,
    playNote,
    onAdminAuthChange: (isAdmin) => {
      player.isAdmin = !!isAdmin;
      player.refreshNameTag();
      const meDir = onlineDirectory.get(clientId);
      if (meDir) meDir.isAdmin = !!isAdmin;
      renderOnlineUsers();
    },
  });

  inquiry = createInquiry({
    clientId,
    getMyName: () => myProfile.name,
    showToast,
    playNote,
  });

  // 방 잠금 상태 사전 확인
  fetch('/api/room/status').then((r) => r.ok ? r.json() : null).then((st) => {
    if (st && zep) zep.applyRoomLock(!!st.locked);
  }).catch(() => {});

  connectRealtime();

  // 로딩 종료 -> ZEP 입장 모달 열기
  setTimeout(() => {
    $('loading').classList.add('done');
    openProfileModal(true);
  }, 350);

  // ---------- 8. 채팅 전송 & 이모티콘 & AI 직원 응답 ----------
  const EMOTE_PITCHES = [523.25, 587.33, 659.25, 783.99, 880.0];
  function triggerEmote(emoji, label, slotIdx = -1) {
    if (!joined) return;
    player.emote(emoji, label);
    playNote(EMOTE_PITCHES[slotIdx >= 0 ? slotIdx % EMOTE_PITCHES.length : 0], 0.08);
    if (slotIdx >= 0) {
      const btn = document.querySelector(`[data-key="${slotIdx + 1}"]`);
      if (btn) {
        btn.classList.remove('pressed');
        void btn.offsetWidth;
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 180);
      }
    }
    fetch('/api/emote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, emoji, label }),
    }).catch(() => {});
  }

  document.querySelectorAll('#emote-row button[data-key]').forEach((b, idx) => {
    b.onclick = () => triggerEmote(b.dataset.emote, b.dataset.label, idx);
  });

  function maybeReplyFromAI(text, scope, pZoneId = '', pZoneName = '') {
    // 프라이빗 대화일 때는 같은 프라이빗 영역 안에 있는 AI 직원만 듣고 응답!
    const candidates = scope === 'private' && pZoneId
      ? npcs.filter((n) => getZoneAt(n.group.position.x, n.group.position.z).id === pZoneId)
      : npcs;
    if (!candidates.length) return;

    // @이름 멘션 또는 근처 AI 직원 자동 반응
    let targetNpc = null;
    for (const n of candidates) {
      if (text.includes(`@${n.name}`) || text.includes(n.name)) {
        targetNpc = n;
        break;
      }
    }
    if (!targetNpc) {
      let best = 999;
      for (const n of candidates) {
        const d = Math.hypot(n.group.position.x - player.group.position.x, n.group.position.z - player.group.position.z);
        if (d < 9.5 && d < best) { best = d; targetNpc = n; }
      }
    }
    if (!targetNpc) return;

    setTimeout(() => {
      let reply = '';
      if (text.includes('수고') || text.includes('잘했') || text.includes('최고') || text.includes('고마워')) {
        reply = targetNpc.persona.praise;
      } else if (text.includes('안녕') || text.includes('하이') || text.includes('반가')) {
        reply = `${myProfile.name}님 반가워요! ${targetNpc.persona.greet}`;
      } else if (text.includes('뭐해') || text.includes('무슨 일') || text.includes('어때')) {
        reply = `지금 "${targetNpc.currentTask}" 열심히 하고 있어요!`;
      } else {
        reply = `${myProfile.name}님 말씀 접수! "${text.slice(0, 16)}" 바로 참고할게요!`;
      }
      targetNpc.happyUntil = performance.now() + 1400;
      targetNpc.say(reply, 5.2);
      appendChat({
        type: 'user',
        isAI: true,
        senderId: `ai_${targetNpc.id}`,
        name: targetNpc.name,
        color: targetNpc.color,
        scope,
        privateZone: scope === 'private' ? pZoneId : '',
        privateZoneName: scope === 'private' ? pZoneName : '',
        text: reply,
        time: Date.now(),
      });
    }, 550);
  }

  async function sendChatPayload({ rawText = '', image = '' }) {
    if (!rawText && !image) return;
    if (activePanelTab !== 'chat') {
      activePanelTab = 'chat';
      document.querySelectorAll('[data-panel-tab]').forEach((x) => x.classList.toggle('on', x.dataset.panelTab === 'chat'));
      $('chat-messages').hidden = false;
      $('users-list').hidden = true;
      syncComposerUI();
    }

    if (rawText === '/회의') { sendWorldMode('meeting'); return; }
    if (rawText === '/공연') { sendWorldMode('show'); return; }
    if (rawText === '/복귀') { sendWorldMode('work'); return; }

    // 귓속말 (/w 닉네임 메시지)
    let scope = spotlightOn ? 'spotlight' : (chatChannel === 'private' && currentPrivateZone ? 'private' : 'all');
    let text = rawText;
    let targetName = '';
    const wm = /^\/w\s+(\S+)\s+(.+)$/i.exec(rawText);
    if (wm) {
      scope = 'whisper';
      targetName = wm[1];
      text = wm[2];
    }

    const pZoneId = scope === 'private' ? currentPrivateZone : '';
    const pZoneName = scope === 'private' ? currentPrivateZoneName : '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clientId,
          name: myProfile.name,
          scope,
          targetName,
          privateZone: pZoneId,
          privateZoneName: pZoneName,
          text,
          image,
          x: player.group.position.x,
          z: player.group.position.z,
        }),
      });
      if (res.status === 403) {
        showToast('🔇 관리자에 의해 채팅이 금지되어 전송할 수 없습니다.');
        return;
      }
      if (!res.ok && scope === 'whisper') {
        appendChat({ type: 'system', scope: 'all', text: `💌 "${targetName}" 님을 찾을 수 없어요. (접속자 탭에서 닉네임을 확인해 주세요!)`, time: Date.now() });
        return;
      }
    } catch {
      player.say(text || '🖼️ 이미지', 5);
      appendChat({ type: 'user', senderId: clientId, name: myProfile.name, color: myProfile.color, scope, privateZone: pZoneId, privateZoneName: pZoneName, targetName, text, image, time: Date.now() });
    }
    if (scope !== 'whisper' && text) maybeReplyFromAI(text, scope, pZoneId, pZoneName);
  }

  $('chat-form').onsubmit = async (e) => {
    e.preventDefault();
    const rawText = $('chat-input').value.trim();
    if (!rawText) return;
    $('chat-input').value = '';
    syncSendBtnReady();
    $('chat-input').blur();
    await sendChatPayload({ rawText });
  };

  $('chat-img-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const image = await resizeChatImage(file);
      await sendChatPayload({ rawText: '', image });
    } catch {
      showToast('이미지를 불러오지 못했어요.');
    }
  });

  // ---------- 9. 입력 & 카메라 상태 ----------
  const keys = new Set();
  const camModes = ['third', 'first', 'bird'];
  const camLabels = { third: '🎥 3인칭', first: '👁️ 1인칭', bird: '🛰️ 조감도' };
  let camModeIdx = 0;
  let yaw = 0;
  let pitch = 0.52;
  let camDist = 11.5;
  let camPanMode = false;
  let camPanX = 0;
  let camPanZ = 0;
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragMoved = false;

  function setCamPanMode(on, { resetOffset = true, silent = false } = {}) {
    camPanMode = !!on;
    if (camPanMode && camModes[camModeIdx] === 'first') {
      camModeIdx = 0;
      player.group.visible = true;
      const sm = $('btn-cam')?.querySelector('small');
      if (sm) sm.textContent = '3인칭';
    }
    if (!camPanMode && resetOffset) {
      camPanX = 0;
      camPanZ = 0;
    }
    $('btn-cam-cycle')?.classList.toggle('active', camPanMode);
    document.body.classList.toggle('cam-pan-mode', camPanMode);
    if (!camPanMode) document.body.classList.remove('cam-pan-dragging');
    if (!silent) {
      showToast(
        camPanMode
          ? '✋ 화면 이동 모드 ON! 마우스로 드래그해 맵을 자유롭게 둘러보세요. (다시 누르거나 ↻ 버튼으로 복귀)'
          : '🎯 화면 이동 모드 OFF — 내 캐릭터 시점으로 복귀했습니다.'
      );
    }
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = false;
    dragStart = { x: e.clientX, y: e.clientY };
    if (camPanMode) document.body.classList.add('cam-pan-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (builder && builder.isActive()) {
      builder.updateGhostFromPointer(e.clientX, e.clientY, player.baseY);
    }
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.hypot(dx, dy) > 4) dragMoved = true;
    dragStart = { x: e.clientX, y: e.clientY };
    if (camPanMode) {
      const panScale = camModes[camModeIdx] === 'bird' ? 0.055 : Math.max(0.015, camDist * 0.0022);
      const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
      const downX = Math.sin(yaw), downZ = Math.cos(yaw);
      camPanX -= (dx * rightX + dy * downX) * panScale;
      camPanZ -= (dx * rightZ + dy * downZ) * panScale;
      const baseX = camModes[camModeIdx] === 'bird' ? -2 : player.group.position.x;
      const baseZ = camModes[camModeIdx] === 'bird' ? -6 : player.group.position.z;
      const clampedX = Math.max(-46, Math.min(42, baseX + camPanX));
      const clampedZ = Math.max(-56, Math.min(28, baseZ + camPanZ));
      camPanX = clampedX - baseX;
      camPanZ = clampedZ - baseZ;
      return;
    }
    yaw -= dx * 0.006;
    // 하늘까지 자유롭게 올려다볼 수 있도록 상하 드래그 범위 확장 (-0.72 ~ +1.38)
    pitch = Math.max(-0.72, Math.min(1.38, pitch + dy * 0.0055));
  });
  window.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('cam-pan-dragging');
    if (!dragMoved && !camPanMode && e.target === canvas) handleCanvasClick(e);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camDist = Math.max(5.0, Math.min(26.0, camDist + e.deltaY * 0.01));
  }, { passive: false });

  // 레이캐스터 (NPC 클릭 대화 + 바닥 클릭 자동 이동)
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const walkGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function handleCanvasClick(e) {
    if (builder && builder.isActive()) {
      builder.handleClick(e, player.baseY);
      return;
    }
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    // ZEP 3D 좌석 직접 클릭 지정 / 책상 이름표 클릭
    if (world.seatPickTargets && world.seatPickTargets.length) {
      const seatHits = raycaster.intersectObjects(world.seatPickTargets, true);
      if (seatHits.length) {
        let obj = seatHits[0].object;
        while (obj && !obj.userData.seatId) obj = obj.parent;
        const sid = obj?.userData?.seatId;
        if (sid) {
          if (seatPickMode) {
            claimMySeat(sid, true);
            setSeatPickMode(false);
            return;
          }
          if (seatHits[0].object.isSprite || seatHits[0].object.geometry?.type === 'BoxGeometry') {
            openSeatModal(sid);
            return;
          }
        }
      }
    }

    const roots = npcs.map((n) => n.modelRoot);
    const hits = raycaster.intersectObjects(roots, true);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj && !obj.userData.avatar) obj = obj.parent;
      const npc = obj?.userData?.avatar;
      if (npc) { openNpcPanel(npc); return; }
    }
    // 빈 바닥 클릭 시 자동 이동 (Click-to-Walk)
    walkGroundPlane.constant = -(player.baseY > 5 ? 10.2 : 0);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(walkGroundPlane, hit)) {
      if (!collidesAt(hit.x, hit.z, 0.35)) {
        stopFollowingUser();
        walkTarget = { x: hit.x, z: hit.z };
        world.setWalkMarker(hit.x, groundHeightAt(hit.x, hit.z), hit.z);
      }
    }
  }

  // NPC 대화 패널
  let selectedNpc = null;
  function openNpcPanel(npc) {
    selectedNpc = npc;
    npc.faceToward(player.group.position.x, player.group.position.z);
    $('npc-img').src = npc.charUrl || '';
    $('npc-name').textContent = npc.name;
    $('npc-team').textContent = npc.teamName;
    const stateMap = { work: '교실에서 수업 중', break: '매점에서 쉬는 시간', meeting: '도서실 전교 모임 중', perform: '야외 무대 학예회 공연 중!', watch: '학예회 관람 중' };
    $('npc-state').textContent = npc.followPlayer ? '나를 따라다니는 중' : (stateMap[npc.state] || '근무 중');
    $('npc-speech').textContent = `"${npc.persona.greet}"`;
    const box = $('npc-tasks');
    box.innerHTML = '';
    for (const t of npc.tasks) {
      const sp = document.createElement('span');
      sp.textContent = `# ${t}`;
      box.appendChild(sp);
    }
    $('npc-follow').textContent = npc.followPlayer ? '🛑 따라오기 해제' : '👋 따라오게 하기';
    $('npc-panel').hidden = false;
    npc.happyUntil = performance.now() + 1400;
    npc.say(npc.persona.greet, 5);
  }
  function closeNpcPanel() {
    selectedNpc = null;
    $('npc-panel').hidden = true;
  }
  $('npc-close').onclick = closeNpcPanel;

  $('npc-assign').onclick = () => {
    if (!selectedNpc) return;
    const nextTask = selectedNpc.tasks[Math.floor(Math.random() * selectedNpc.tasks.length)] || '메타버스 공간 확장';
    selectedNpc.currentTask = nextTask;
    selectedNpc.followPlayer = false;
    selectedNpc.state = 'work';
    selectedNpc.setRoute(selectedNpc.homeSeat.x, selectedNpc.homeSeat.z, 0);
    selectedNpc.happyUntil = performance.now() + 1800;
    selectedNpc.say(`알겠습니다! "${nextTask}" 바로 진행할게요!`, 5.5);
    $('npc-speech').textContent = `"알겠습니다! '${nextTask}' 바로 진행하겠습니다!"`;
    $('npc-state').textContent = '새 업무 착수 중';
  };
  $('npc-praise').onclick = () => {
    if (!selectedNpc) return;
    selectedNpc.happyUntil = performance.now() + 2600;
    selectedNpc.say(selectedNpc.persona.praise, 5);
    $('npc-speech').textContent = `"${selectedNpc.persona.praise}"`;
  };
  $('npc-follow').onclick = () => {
    if (!selectedNpc) return;
    selectedNpc.followPlayer = !selectedNpc.followPlayer;
    if (selectedNpc.followPlayer) {
      selectedNpc.waypoints = [];
      selectedNpc.say('뒤따라갈게요! 🐾', 4);
      $('npc-follow').textContent = '🛑 따라오기 해제';
      $('npc-state').textContent = '나를 따라다니는 중';
    } else {
      selectedNpc.setRoute(selectedNpc.homeSeat.x, selectedNpc.homeSeat.z, 0);
      selectedNpc.say('자리로 돌아갈게요!', 3.5);
      $('npc-follow').textContent = '👋 따라오게 하기';
      $('npc-state').textContent = '자리로 복귀 중';
    }
  };

  // ---------- 10. 공용 오피스 모드 (회의 / 공연 / 일상 복귀) ----------
  function syncModeUI(mode) {
    const pill = $('world-mode');
    pill.className = 'mode-pill' + (mode === 'meeting' ? ' meeting' : mode === 'show' ? ' show' : '');
    pill.textContent = mode === 'meeting' ? '📢 전체 회의 중' : mode === 'show' ? '🎵 사내 공연 중' : '일상 근무 중';
    $('btn-meeting').classList.toggle('on', mode === 'meeting');
    $('btn-show').classList.toggle('on', mode === 'show');
    $('btn-work').classList.toggle('on', mode === 'work');
  }

  function applyWorldModeLocal(mode) {
    if (mode === 'meeting') {
      actors.startMeeting();
      world.updateMeetingScreen(
        '📢 전교생 모임 진행 중',
        '주제: 이번 학기 학급 활동 계획',
        '1반 & 2반 전원 도서실 착석 중!',
        '#F09D51'
      );
      showToast('전교생 모임 소집 완료! 모두 도서실로 모이고 있어요.');
    } else if (mode === 'show') {
      actors.startShow();
      showToast('야외 숲속 무대에서 학예회가 시작됩니다! 교무실 뒷문으로 나가 보세요 🎵');
    } else {
      actors.returnToWork();
      world.updateMeetingScreen(
        '먼작귀 학교 — 도서실',
        '이달의 추천 도서: 먼작귀 모험 이야기',
        '조용히! 하단 [회의 소집] 버튼으로 전교생을 모을 수 있어요',
        '#58B98A'
      );
      showToast('모두 각자 교실 자리로 돌아가 수업을 이어갑니다!');
    }
    syncModeUI(mode);
  }

  function sendWorldMode(mode) {
    applyWorldModeLocal(mode);
    fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, mode }),
    }).catch(() => {});
  }

  $('btn-meeting').onclick = () => sendWorldMode('meeting');
  $('btn-show').onclick = () => sendWorldMode('show');
  $('btn-work').onclick = () => sendWorldMode('work');

  function toggleCameraMode() {
    camModeIdx = (camModeIdx + 1) % camModes.length;
    const m = camModes[camModeIdx];
    const camBtn = $('btn-cam');
    const sm = camBtn.querySelector('small');
    if (sm) sm.textContent = camLabels[m].replace(/^🎥\s*/, '');
    else camBtn.textContent = camLabels[m];
    player.group.visible = m !== 'first';
  }
  $('btn-cam').onclick = toggleCameraMode;
  if ($('btn-cam-reset')) {
    $('btn-cam-reset').onclick = () => {
      setCamPanMode(false, { resetOffset: true, silent: true });
      yaw = 0;
      pitch = 0.42;
      camDist = 11.5;
      camModeIdx = 0;
      player.group.visible = true;
      const sm = $('btn-cam')?.querySelector('small');
      if (sm) sm.textContent = '3인칭';
      showToast('🎥 카메라 시점을 내 캐릭터 기준으로 초기화했습니다.');
    };
  }
  if ($('btn-cam-out')) {
    $('btn-cam-out').onclick = () => { camDist = Math.min(26, camDist + 2.6); };
  }
  if ($('btn-cam-in')) {
    $('btn-cam-in').onclick = () => { camDist = Math.max(4.5, camDist - 2.6); };
  }
  if ($('btn-cam-cycle')) {
    $('btn-cam-cycle').onclick = () => setCamPanMode(!camPanMode);
  }
  $('btn-sky').onclick = () => { $('btn-sky').textContent = world.nextSky(); };

  // ---------- 실제 서울 날씨 실시간 연동 + 클릭 시 비·눈 체험 전환 ----------
  let seoulWeather = { kind: 'clear', icon: '☀️', label: '맑음', temp: null, isDay: true };
  const WEATHER_CYCLE = [
    { mode: 'live', label: '서울 실시간' },
    { mode: 'rain', icon: '🌧️', label: '비 체험' },
    { mode: 'snow', icon: '❄️', label: '눈 체험' },
    { mode: 'storm', icon: '⛈️', label: '뇌우 체험' },
    { mode: 'clear', icon: '☀️', label: '맑음 체험' },
  ];
  let weatherCycleIdx = 0;

  function applySeoulSkyByTime(isDay) {
    const hour = new Date().getHours();
    const skyIdx = !isDay ? 2 : (hour >= 17 && hour <= 18) ? 1 : (hour >= 6 && hour < 17) ? 0 : 2;
    $('btn-sky').textContent = world.applySky(skyIdx);
  }

  function renderWeatherBtn() {
    const cur = WEATHER_CYCLE[weatherCycleIdx];
    if (cur.mode === 'live') {
      const tempTxt = seoulWeather.temp !== null ? ` ${seoulWeather.temp}°C` : '';
      $('btn-weather').textContent = `서울 ${seoulWeather.icon} ${seoulWeather.label}${tempTxt}`;
    } else {
      $('btn-weather').textContent = `${cur.icon} ${cur.label}`;
    }
  }

  async function syncSeoulWeather(firstLoad = false) {
    try {
      const res = await fetch('/api/weather');
      if (res.ok) {
        seoulWeather = await res.json();
        if (weatherCycleIdx === 0) {
          world.setWeather(seoulWeather.kind || 'clear');
          if (firstLoad) applySeoulSkyByTime(seoulWeather.isDay !== false);
        }
        renderWeatherBtn();
      }
    } catch {
      renderWeatherBtn();
    }
  }
  syncSeoulWeather(true);
  setInterval(() => syncSeoulWeather(false), 10 * 60 * 1000);

  $('btn-weather').onclick = () => {
    weatherCycleIdx = (weatherCycleIdx + 1) % WEATHER_CYCLE.length;
    const cur = WEATHER_CYCLE[weatherCycleIdx];
    if (cur.mode === 'live') {
      world.setWeather(seoulWeather.kind || 'clear');
      showToast(`🌐 실제 서울 날씨(${seoulWeather.label})로 돌아왔습니다!`);
    } else {
      world.setWeather(cur.mode);
      showToast(`${cur.icon} ${cur.label} 모드로 전환했습니다! (계속 누르면 서울 실시간 날씨로 돌아가요)`);
    }
    renderWeatherBtn();
  };

  $('btn-help').onclick = () => { $('help-modal').hidden = !$('help-modal').hidden; $('invite-modal').hidden = true; };
  $('help-close').onclick = () => { $('help-modal').hidden = true; };

  // 친구 초대 모달
  async function openInviteModal() {
    $('help-modal').hidden = true;
    $('invite-modal').hidden = !$('invite-modal').hidden;
    if ($('invite-modal').hidden) return;
    try {
      const res = await fetch('/api/network');
      if (res.ok) {
        const net = await res.json();
        $('invite-lan-url').textContent = (net.httpsLanUrls && net.httpsLanUrls[0]) || (net.lanUrls && net.lanUrls[0]) || net.localUrl;
      }
    } catch {
      $('invite-lan-url').textContent = location.origin;
    }
  }
  $('btn-invite').onclick = openInviteModal;
  $('invite-close').onclick = () => { $('invite-modal').hidden = true; };
  $('btn-copy-lan').onclick = async () => {
    try { await navigator.clipboard.writeText($('invite-lan-url').textContent); showToast('접속 주소를 복사했어요! 같은 Wi-Fi 친구에게 보내 보세요.'); } catch {}
  };
  $('btn-copy-tunnel').onclick = async () => {
    try { await navigator.clipboard.writeText($('invite-tunnel-cmd').textContent); showToast('터널링 명령어를 복사했어요!'); } catch {}
  };

  let portalCooldownUntil = 0;
  function warpTo(zoneId) {
    const z = ZONES.find((item) => item.id === zoneId);
    if (!z || !z.warp) return;
    player.sitting = null;
    player.danceStyle = null;
    const wy = Number.isFinite(z.warp.y) ? z.warp.y : 0;
    player.setPos(z.warp.x, z.warp.z, wy);
    portalCooldownUntil = performance.now() + 1800;
    player.happyUntil = performance.now() + 700;
    playChime(false);
    showToast(`${z.name}(으)로 이동했습니다!`);
  }
  document.querySelectorAll('[data-warp]').forEach((b) => { b.onclick = () => warpTo(b.dataset.warp); });

  // ---------- LIVE STAGE 댄스 & 귀여운 신스 무대 BGM ----------
  const DANCE_STYLES = ['bounce', 'spin', 'wave', 'star'];
  const DANCE_LABELS = {
    bounce: '🎵 통통 아이돌 댄스!',
    spin: '🌀 빙글빙글 스핀 댄스!',
    wave: '🕺 좌우 스텝 웨이브!',
    star: '🌟 슈퍼 스타 점프!',
  };

  let bgmTimer = null;
  let bgmOn = false;
  const MELODY = [523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25];
  let melodyStep = 0;

  function setStageBgm(enable) {
    bgmOn = enable;
    $('btn-dance-bgm').textContent = bgmOn ? '🔊 음악 ON' : '🔇 음악';
    $('btn-dance-bgm').classList.toggle('on', bgmOn);
    clearInterval(bgmTimer);
    bgmTimer = null;
    if (bgmOn) {
      melodyStep = 0;
      playNote(MELODY[0], 0.16);
      bgmTimer = setInterval(() => {
        melodyStep = (melodyStep + 1) % MELODY.length;
        playNote(MELODY[melodyStep], 0.16);
      }, 210);
    }
  }
  $('btn-dance-bgm').onclick = () => setStageBgm(!bgmOn);

  function syncDanceUI() {
    document.querySelectorAll('[data-dance]').forEach((b) => {
      b.classList.toggle('on', b.dataset.dance === player.danceStyle);
    });
  }

  function setPlayerDance(style) {
    player.sitting = null;
    player.danceStyle = style || null;
    syncDanceUI();
    if (style) {
      player.facingYaw = 0; // 무대 정면(관객석 쪽) 바라보기
      player.say(DANCE_LABELS[style] || '💃 신나게 춤추는 중!', 4.2);
      // 무대 근처 직원들이 환호!
      for (const n of npcs) {
        const d = Math.hypot(n.group.position.x - player.group.position.x, n.group.position.z - player.group.position.z);
        if (d < 12) {
          n.happyUntil = performance.now() + 2000;
          if (Math.random() < 0.5) n.say('와아아! 춤 최고예요!! 👏', 3.5);
        }
      }
    } else if (bgmOn) {
      setStageBgm(false);
    }
  }

  function cyclePlayerDance() {
    if (!player.danceStyle) {
      setPlayerDance('bounce');
      if (isOnStage(player.group.position.x, player.group.position.z) && !bgmOn) setStageBgm(true);
    } else {
      const idx = DANCE_STYLES.indexOf(player.danceStyle);
      const next = idx + 1 >= DANCE_STYLES.length ? null : DANCE_STYLES[idx + 1];
      setPlayerDance(next);
    }
  }

  document.querySelectorAll('[data-dance]').forEach((b) => {
    b.onclick = () => {
      setPlayerDance(b.dataset.dance);
      if (isOnStage(player.group.position.x, player.group.position.z) && !bgmOn) setStageBgm(true);
    };
  });
  $('btn-dance-stop').onclick = () => setPlayerDance(null);

  function isOnStage(x, z) {
    return x >= -16.8 && x <= -6.2 && z >= -26.8 && z <= -21.2;
  }

  // ---------- ZEP 핵심 액션: 찌르기(Z) / 앉기(X) / 점프 / 단축키 가이드 ----------
  const POKE_REPLIES = [
    '앗! 깜짝이야! 누가 찔렀어?! 😮',
    '에엣?! 간지러워요~! 😆',
    '우라!! 찌르지 마! 야하! 👉',
    '흥! 감히 날 찌르다니?! 😤',
    '하아— 깜짝 놀랐잖아요!',
  ];

  function performPoke() {
    if (!joined) return;
    const px = player.group.position.x;
    const py = player.group.position.y;
    const pz = player.group.position.z;
    const fwdX = Math.sin(player.facingYaw);
    const fwdZ = Math.cos(player.facingYaw);

    // 보고 있는 방향(±60° 전방 부채꼴) 안의 대상만 판정 (시선 정렬 + 거리 종합 점수)
    const POKE_RANGE = 3.8;
    const POKE_MIN_DOT = 0.5; // cos(60°)
    const evalForwardTarget = (tx, ty, tz) => {
      if (Math.abs(ty - py) > 2.2) return null;
      const dx = tx - px;
      const dz = tz - pz;
      const d = Math.hypot(dx, dz);
      if (d > POKE_RANGE) return null;
      const dot = d < 0.05 ? 1 : (dx * fwdX + dz * fwdZ) / d;
      if (dot < POKE_MIN_DOT) return null;
      const score = d / (0.35 + 0.65 * dot);
      return { d, dot, score };
    };

    let best = null;
    for (const [rid, av] of remotes) {
      const m = evalForwardTarget(av.group.position.x, av.group.position.y, av.group.position.z);
      if (m && (!best || m.score < best.score)) {
        best = { kind: 'remote', id: rid, av, score: m.score };
      }
    }
    for (const n of npcs) {
      const m = evalForwardTarget(n.group.position.x, n.group.position.y, n.group.position.z);
      if (m && (!best || m.score < best.score)) {
        best = { kind: 'npc', npc: n, score: m.score };
      }
    }

    // 1. 보고 있는 방향의 실제 접속자 찌르기
    if (best && best.kind === 'remote') {
      player.triggerPoke();
      playNote(587.33, 0.07);
      player.say(`👉 ${best.av.name} 콕!`, 2.4);
      fetch('/api/poke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clientId, targetId: best.id }),
      }).catch(() => {});
      return;
    }

    // 2. 보고 있는 방향의 AI 직원 찌르기
    if (best && best.kind === 'npc') {
      player.triggerPoke();
      playNote(587.33, 0.07);
      player.say(`👉 ${best.npc.name} 콕!`, 2.4);
      best.npc.triggerPoked();
      const rep = POKE_REPLIES[Math.floor(Math.random() * POKE_REPLIES.length)];
      best.npc.say(rep, 3.6);
      showPokeToast(`${myProfile.name}님이 ${best.npc.name}을(를) 콕 찔렀어요!`);
      return;
    }

    // 3. 보고 있는 방향에 대상이 없으면 빈 공간 찌르기
    player.triggerPoke();
    playNote(523.25, 0.06);
    player.say('👉 콕콕!', 1.8);
    fetch('/api/poke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, targetId: '' }),
    }).catch(() => {});
  }

  function standUpFromSeat() {
    if (!player.sitting) return;
    const s = player.sitting;
    player.sitting = null;
    if (Number.isFinite(s.exitX) && Number.isFinite(s.exitZ) && !collidesAt(s.exitX, s.exitZ, 0.35)) {
      player.startSeatGlide(s.exitX, s.exitZ, groundHeightAt(s.exitX, s.exitZ), false);
    } else if (player.preSitPos && !collidesAt(player.preSitPos.x, player.preSitPos.z, 0.35)) {
      player.startSeatGlide(player.preSitPos.x, player.preSitPos.z, groundHeightAt(player.preSitPos.x, player.preSitPos.z), false);
    } else {
      player.standAnimAt = performance.now();
    }
    player.preSitPos = null;
    syncSeatClaimBar();
  }

  function sitOnFurniture(seat) {
    const dist = Math.hypot(seat.x - player.group.position.x, seat.z - player.group.position.z);
    player.preSitPos = { x: player.group.position.x, z: player.group.position.z };
    player.sitting = seat;
    if (dist < 4.5) {
      // 가까운 의자는 부드러운 포물선 점프 착석!
      player.startSeatGlide(seat.x, seat.z, seat.y, true);
    } else {
      // 먼 지정 좌석 순간이동 시 바로 안착 + 푹신한 쿠션 바운스
      player.seatGlide = null;
      player.sitAnimAt = performance.now();
      player.setPos(seat.x, seat.z, seat.y);
      player.spawnActionFx('✨', 0, 0.05, 0.65, 0.5);
    }
    if (Number.isFinite(seat.rotY)) player.facingYaw = seat.rotY;
    player.say('편안하다~ ☕', 2.8);
    syncSeatClaimBar();
  }

  function toggleSit() {
    if (player.sitting) {
      standUpFromSeat();
      player.say('일어났어요!', 2.0);
      return;
    }
    if (player.danceStyle) setPlayerDance(null);
    // 근처에 의자/소파가 있으면 자연스럽게 착석, 아니면 현재 바닥에 앉기!
    const px = player.group.position.x, pz = player.group.position.z;
    let nearSeat = null, bestD = 2.2;
    for (const it of world.interactables) {
      if (it.type !== 'sit') continue;
      const d = Math.hypot(it.x - px, it.z - pz);
      if (d < bestD) { bestD = d; nearSeat = it.seat; }
    }
    if (nearSeat) {
      sitOnFurniture(nearSeat);
    } else {
      player.sitting = { x: px, y: groundHeightAt(px, pz), z: pz, floor: true };
      player.say('철퍼덕~ 쉬는 중 🪑', 2.6);
    }
  }

  $('zg-jump').onclick = () => {
    if (player.sitting) { standUpFromSeat(); player.vy = 6.2; }
    else if (player.jumpY <= 0.01) player.vy = 6.8;
  };
  $('zg-poke').onclick = performPoke;
  $('zg-sit').onclick = toggleSit;
  $('zg-dance').onclick = cyclePlayerDance;
  $('zg-close').onclick = () => { $('zep-guide').hidden = true; };

  // ---------- 4단계: 모바일 가상 조이스틱 & 터치 버튼 ----------
  const joyVec = { x: 0, z: 0 };
  const isTouchDevice = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function setMobilePad(on) {
    $('mobile-controls').hidden = !on;
    $('btn-mobile-pad').classList.toggle('on', on);
  }
  setMobilePad(isTouchDevice);
  $('btn-mobile-pad').onclick = () => setMobilePad($('mobile-controls').hidden);

  const joyBase = $('joy-base');
  const joyKnob = $('joy-knob');
  let joyPid = null;
  function updateJoy(clientX, clientY) {
    const r = joyBase.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const maxR = r.width * 0.38;
    let dx = clientX - cx, dy = clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > maxR) { dx = (dx / d) * maxR; dy = (dy / d) * maxR; }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVec.x = Math.abs(dx) > 6 ? dx / maxR : 0;
    joyVec.z = Math.abs(dy) > 6 ? dy / maxR : 0;
  }
  joyBase.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    joyPid = e.pointerId;
    joyBase.setPointerCapture(e.pointerId);
    updateJoy(e.clientX, e.clientY);
  });
  joyBase.addEventListener('pointermove', (e) => {
    if (joyPid !== e.pointerId) return;
    e.stopPropagation();
    updateJoy(e.clientX, e.clientY);
  });
  function resetJoy(e) {
    if (joyPid !== e.pointerId) return;
    joyPid = null;
    joyKnob.style.transform = 'translate(0px, 0px)';
    joyVec.x = 0; joyVec.z = 0;
  }
  joyBase.addEventListener('pointerup', resetJoy);
  joyBase.addEventListener('pointercancel', resetJoy);

  $('t-jump').onclick = () => { if (player.sitting) { standUpFromSeat(); player.vy = 6.2; } else if (player.jumpY <= 0.01) player.vy = 6.8; };
  $('t-interact').onclick = performInteract;
  $('t-poke').onclick = performPoke;
  $('t-sit').onclick = toggleSit;
  $('t-dance').onclick = cyclePlayerDance;

  // 키보드 단축키 (ZEP 표준: Z 찌르기, X 앉기, Q/O/0/G 춤추기, 1~5 리액션)
  const quickEmotes = [
    ['👍', '좋아요!'], ['👏', '박수!'], ['❤️', '하트!'],
    ['😆', '하하!'], ['😂', '빵터짐!'],
  ];
  const EMOTE_CODE_MAP = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4 };
  let nearestInteract = null;
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (e.key === 'Escape') document.activeElement.blur();
      return;
    }
    if (!$('profile-overlay').hidden) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      $('chat-panel').hidden = false;
      syncLeftDockLayout();
      $('chat-input').focus();
      return;
    }
    if (e.key === 'Escape') {
      if (camPanMode) setCamPanMode(false, { resetOffset: true, silent: true });
      closeNpcPanel();
      closeDmPanel();
      if (zep) zep.closeAllPopups();
      if (controlRoom) controlRoom.closeControlRoom();
      if (inquiry) inquiry.close();
      $('video-stage').hidden = true;
      if ($('seat-modal')) $('seat-modal').hidden = true;
      if (seatPickMode) setSeatPickMode(false);
      if (builder && builder.isActive()) builder.setActive(false);
      $('help-modal').hidden = true;
      $('invite-modal').hidden = true;
      $('board-modal').hidden = true;
      $('games-modal').hidden = true;
      return;
    }
    const emoteIdx = EMOTE_CODE_MAP[e.code] !== undefined
      ? EMOTE_CODE_MAP[e.code]
      : (e.key >= '1' && e.key <= '5' ? Number(e.key) - 1 : -1);
    if (emoteIdx >= 0) {
      const slots = zep ? zep.getEmoteSlots() : quickEmotes;
      const em = slots[emoteIdx] || quickEmotes[emoteIdx];
      if (em) triggerEmote(em[0], em[1], emoteIdx);
      return;
    }
    const k = e.code;
    keys.add(k);
    if (k === 'Space') {
      e.preventDefault();
      if (player.sitting) { standUpFromSeat(); player.vy = 6.2; }
      else if (player.jumpY <= 0.01) player.vy = 6.8;
    } else if (k === 'KeyZ') performPoke();
    else if (k === 'KeyX') toggleSit();
    else if (k === 'KeyQ' || k === 'KeyO' || k === 'Digit0' || k === 'KeyG') cyclePlayerDance();
    else if (k === 'KeyB') { if (builder) builder.toggle(); }
    else if (k === 'KeyR') { if (builder && builder.isActive()) builder.rotate(); }
    else if (k === 'KeyE') performInteract();
    else if (k === 'KeyM') sendWorldMode('meeting');
    else if (k === 'KeyP') sendWorldMode('show');
    else if (k === 'KeyV') toggleCameraMode();
    else if (k === 'KeyT') $('btn-sky').textContent = world.nextSky();
    else if (k === 'KeyH') { $('help-modal').hidden = !$('help-modal').hidden; $('zep-guide').hidden = false; }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  // ---------- 11. 인터랙션 & 충돌 ----------
  function findNearestInteract() {
    const px = player.group.position.x, pz = player.group.position.z;
    let best = null, bestD = 999;

    for (const n of npcs) {
      const d = Math.hypot(n.group.position.x - px, n.group.position.z - pz);
      if (d < 2.6 && d < bestD) {
        bestD = d;
        best = { type: 'npc', npc: n, label: `${n.name}에게 말 걸기` };
      }
    }
    for (const it of world.interactables) {
      const d = Math.hypot(it.x - px, it.z - pz);
      if (d < it.radius && d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  function performInteract() {
    if (player.sitting) {
      standUpFromSeat();
      player.say('자리에서 일어났어요!', 2.2);
      return;
    }
    if (!nearestInteract) return;
    if (nearestInteract.type === 'npc') {
      openNpcPanel(nearestInteract.npc);
    } else if (nearestInteract.type === 'sit') {
      sitOnFurniture(nearestInteract.seat);
    } else if (nearestInteract.type === 'dance') {
      cyclePlayerDance();
    } else if (nearestInteract.type === 'board') {
      activities.openBoardModal('wb');
    } else if (nearestInteract.type === 'embed') {
      if (zep) zep.openEmbedModal();
    } else if (nearestInteract.type === 'control_room') {
      if (controlRoom) controlRoom.openControlRoom();
    } else if (nearestInteract.type === 'prop') {
      showToast(nearestInteract.message);
      player.happyUntil = performance.now() + 1400;
      player.say('좋아요! ✨', 3);
    }
  }

  function collidesAt(x, z, r = 0.42) {
    if (x < -44 || x > 36 || z < -54 || z > 26) return true;
    for (const c of world.colliders) {
      if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) return true;
    }
    return false;
  }

  function groundHeightAt(x, z) {
    // 3단계 하늘 위 루프탑 파티장 (Y = 10.2)
    if (x >= -9.5 && x <= 9.5 && z >= -52.5 && z <= -37.5) return 10.2;
    if (x >= -16.8 && x <= -6.2 && z >= -26.8 && z <= -22.2) return 0.65;
    if (x >= -12.9 && x <= -10.1 && z > -22.2 && z <= -21.3) return 0.32;
    return 0;
  }

  // ---------- 12. 실시간 2D 미니맵 (먼작귀 AI 오피스) ----------
  const miniCanvas = $('minimap');
  const mctx = miniCanvas.getContext('2d');
  const mx = (wx) => ((wx + 22) / 56) * 210;
  const mz = (wz) => ((wz + 30) / 48) * 165;

  miniCanvas.addEventListener('click', (e) => {
    const r = miniCanvas.getBoundingClientRect();
    const wx = ((e.clientX - r.left) / r.width) * 56 - 22;
    const wz = ((e.clientY - r.top) / r.height) * 48 - 30;
    if (!collidesAt(wx, wz, 0.35)) {
      player.sitting = null;
      player.setPos(wx, wz, groundHeightAt(wx, wz));
    }
  });

  function drawMinimap() {
    mctx.fillStyle = '#CFEAC6';
    mctx.fillRect(0, 0, 210, 165);

    mctx.fillStyle = '#FFFDF5';
    mctx.fillRect(mx(-16.8), mz(-27), mx(-6.2) - mx(-16.8), mz(-22.2) - mz(-27));
    mctx.fillStyle = '#F8DA6A';
    mctx.fillRect(mx(-16.1), mz(-27.2), mx(-6.9) - mx(-16.1), 4);

    // 동쪽 OX 퀴즈 광장
    mctx.fillStyle = '#DDF5EC';
    mctx.fillRect(mx(20.4), mz(-6.8), mx(25.4) - mx(20.4), mz(2.8) - mz(-6.8));
    mctx.fillStyle = '#FDE4EC';
    mctx.fillRect(mx(26.2), mz(-6.8), mx(31.2) - mx(26.2), mz(2.8) - mz(-6.8));

    mctx.fillStyle = '#F3E5CE';
    mctx.strokeStyle = '#B89B7A';
    mctx.lineWidth = 1.5;
    mctx.fillRect(mx(-18), mz(-11), mx(18) - mx(-18), mz(11) - mz(-11));
    mctx.strokeRect(mx(-18), mz(-11), mx(18) - mx(-18), mz(11) - mz(-11));

    for (const z of ZONES) {
      if (z.id === 'stage' || z.id === 'lobby' || z.id === 'rooftop' || z.id === 'secret' || z.id === 'ox') continue;
      const rx = mx(z.x0), rz = mz(z.z0), rw = mx(z.x1) - rx, rh = mz(z.z1) - rz;
      mctx.fillStyle = z.color;
      mctx.fillRect(rx, rz, rw, rh);
      if (z.private) {
        mctx.save();
        mctx.strokeStyle = z.id === currentPrivateZone ? '#5B5CE6' : 'rgba(91, 92, 230, 0.48)';
        mctx.lineWidth = z.id === currentPrivateZone ? 2 : 1;
        mctx.setLineDash(z.id === currentPrivateZone ? [] : [3, 2]);
        mctx.strokeRect(rx + 0.5, rz + 0.5, rw - 1, rh - 1);
        mctx.restore();
      }
    }

    // AI 직원 점
    for (const n of npcs) {
      mctx.fillStyle = n.color;
      mctx.beginPath();
      mctx.arc(mx(n.group.position.x), mz(n.group.position.z), 3, 0, Math.PI * 2);
      mctx.fill();
      mctx.strokeStyle = '#FFF';
      mctx.lineWidth = 1;
      mctx.stroke();
    }

    // 다른 접속자 점 (초록 링 강조)
    for (const r of remotes.values()) {
      mctx.fillStyle = r.color || '#3bc97c';
      mctx.beginPath();
      mctx.arc(mx(r.group.position.x), mz(r.group.position.z), 4.2, 0, Math.PI * 2);
      mctx.fill();
      mctx.strokeStyle = '#1b5e3b';
      mctx.lineWidth = 1.5;
      mctx.stroke();
    }

    // 내 플레이어 화살표
    const px = mx(player.group.position.x), pz = mz(player.group.position.z);
    mctx.save();
    mctx.translate(px, pz);
    mctx.rotate(-yaw);
    mctx.fillStyle = myProfile.color || '#F29F05';
    mctx.beginPath();
    mctx.moveTo(0, -6); mctx.lineTo(4.5, 4.5); mctx.lineTo(-4.5, 4.5); mctx.closePath();
    mctx.fill();
    mctx.strokeStyle = '#3B2F26';
    mctx.lineWidth = 1.2;
    mctx.stroke();
    mctx.restore();
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- 13. 메인 루프 & 위치 동기화 ----------
  const clock = new THREE.Clock();
  const camTargetSmooth = new THREE.Vector3();
  let lastZoneId = '';
  let lastSyncAt = 0;
  let lastRenderAt = 0;
  let lastZepTickAt = 0;
  let lastSentPos = { x: 0, y: 0, z: 0, moving: false };

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    // ZEP 저전력 모드: ~15 FPS로 렌더링 절약
    if (zep && zep.isLowPowerMode() && now - lastRenderAt < 65) return;
    lastRenderAt = now;
    const dt = Math.min(0.08, clock.getDelta());
    const elapsed = clock.elapsedTime;

    if (zep && now - lastZepTickAt > 500) {
      lastZepTickAt = now;
      zep.tick(joined);
    }

    let mxInput = 0, mzInput = 0;
    const modalOpen = !$('profile-overlay').hidden || !$('board-modal').hidden || !$('games-modal').hidden || !$('tools-modal').hidden || !$('seat-modal')?.hidden || !$('control-room-modal')?.hidden || !$('inquiry-modal')?.hidden;
    if (!modalOpen && document.activeElement?.tagName !== 'INPUT') {
      if (keys.has('KeyW') || keys.has('ArrowUp')) mzInput -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) mzInput += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mxInput -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) mxInput += 1;
      if (joyVec.x !== 0 || joyVec.z !== 0) {
        mxInput += joyVec.x;
        mzInput += joyVec.z;
      }
    }

    let isMoving = false;
    if (mxInput !== 0 || mzInput !== 0) {
      if (camPanMode || camPanX !== 0 || camPanZ !== 0) setCamPanMode(false, { resetOffset: true, silent: true });
      if (walkTarget) { walkTarget = null; world.hideWalkMarker(); }
      if (followTargetId) stopFollowingUser();
      if (player.sitting) standUpFromSeat();
      player.seatGlide = null;
      if (player.danceStyle) setPlayerDance(null);
      const len = Math.hypot(mxInput, mzInput);
      mxInput /= len; mzInput /= len;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const wx = mxInput * cos + mzInput * sin;
      const wz = -mxInput * sin + mzInput * cos;
      player.facingYaw = Math.atan2(wx, wz);
      const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9.5 : 6.2) * dt;
      const curX = player.group.position.x, curZ = player.group.position.z;
      const nx = curX + wx * speed;
      const nz = curZ + wz * speed;
      if (!collidesAt(nx, curZ)) player.group.position.x = nx;
      if (!collidesAt(player.group.position.x, nz)) player.group.position.z = nz;
      isMoving = true;
    } else if (followTargetId) {
      const targetAv = remotes.get(followTargetId);
      if (targetAv) {
        const dx = targetAv.group.position.x - player.group.position.x;
        const dz = targetAv.group.position.z - player.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1.85) {
          if (player.sitting) standUpFromSeat();
          const step = Math.min(dist - 1.5, 6.2 * dt);
          const nx = player.group.position.x + (dx / dist) * step;
          const nz = player.group.position.z + (dz / dist) * step;
          player.facingYaw = Math.atan2(dx, dz);
          if (!collidesAt(nx, player.group.position.z)) player.group.position.x = nx;
          if (!collidesAt(player.group.position.x, nz)) player.group.position.z = nz;
          isMoving = true;
        }
      }
    } else if (walkTarget) {
      const dx = walkTarget.x - player.group.position.x;
      const dz = walkTarget.z - player.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= 0.22) {
        walkTarget = null;
        world.hideWalkMarker();
      } else {
        if (player.sitting) standUpFromSeat();
        if (player.danceStyle) setPlayerDance(null);
        const step = Math.min(dist, 6.2 * dt);
        const curX = player.group.position.x, curZ = player.group.position.z;
        const nx = curX + (dx / dist) * step;
        const nz = curZ + (dz / dist) * step;
        player.facingYaw = Math.atan2(dx, dz);
        let movedAny = false;
        if (!collidesAt(nx, curZ)) { player.group.position.x = nx; movedAny = true; }
        if (!collidesAt(player.group.position.x, nz)) { player.group.position.z = nz; movedAny = true; }
        if (!movedAny) { walkTarget = null; world.hideWalkMarker(); }
        else isMoving = true;
      }
    }

    if (!player.seatGlide) {
      const targetGround = player.sitting ? player.sitting.y : groundHeightAt(player.group.position.x, player.group.position.z);
      player.baseY += (targetGround - player.baseY) * Math.min(1, dt * 14);
    }
    if (player.jumpY > 0 || player.vy > 0) {
      player.jumpY += player.vy * dt;
      player.vy -= 21 * dt;
      if (player.jumpY <= 0) { player.jumpY = 0; player.vy = 0; }
    }
    player.animateVisual(dt, elapsed, isMoving, player.danceStyle, yaw);

    // 3단계 마법 포털 자동 순간이동 체크
    if (joined && now > portalCooldownUntil && world.portals) {
      const px0 = player.group.position.x, py0 = player.baseY, pz0 = player.group.position.z;
      for (const pt of world.portals) {
        if (Math.abs(py0 - pt.y) < 1.6 && Math.hypot(px0 - pt.x, pz0 - pt.z) < 1.15) {
          portalCooldownUntil = now + 2000;
          player.sitting = null;
          player.setPos(pt.toX, pt.toZ, pt.toY);
          player.happyUntil = now + 900;
          playChime(true);
          player.say(`🌀 ${pt.toName} 도착!`, 3.2);
          showToast(`🌀 마법 포털을 타고 ${pt.toName}(으)로 순간이동했어요!`);
          break;
        }
      }
    }

    // LIVE STAGE / 루프탑 DJ 플로어 감지 -> 댄스 바 & 조명 활성화
    const onStage = isOnStage(player.group.position.x, player.group.position.z);
    const onRooftopDance = player.baseY > 8 && Math.abs(player.group.position.x) < 4.5 && player.group.position.z > -49.5 && player.group.position.z < -42.5;
    $('dance-bar').hidden = !(onStage || onRooftopDance || !!player.danceStyle) || !$('profile-overlay').hidden;
    if (!onStage && !onRooftopDance && !player.danceStyle && bgmOn) setStageBgm(false);

    let remoteStageDance = false;
    for (const r of remotes.values()) {
      if (r.danceStyle && isOnStage(r.group.position.x, r.group.position.z)) { remoteStageDance = true; break; }
    }
    const stageLit = actors.getMode() === 'show' || (onStage && !!player.danceStyle) || remoteStageDance;

    // NPC, 원격 접속자, 환경, 2단계 보물찾기, 프라이빗 존 & 근접 음성 업데이트
    actors.updateNPCs(dt, elapsed, yaw);
    actors.updateRemotes(dt, elapsed, yaw);
    world.updateEnvironment(dt, elapsed, stageLit);
    if (activities) activities.update(dt, elapsed);
    if (zepGames) zepGames.update(dt, elapsed);

    const zone = getZoneAt(player.group.position.x, player.group.position.z);
    if (zone.id !== lastZoneId) {
      lastZoneId = zone.id;
      $('zone-name').textContent = zone.name;
      updatePrivateZoneUI(zone, { announce: joined });
      if (zep && joined) zep.updateAmbientBgmForZone(zone.id);
      const meDir = onlineDirectory.get(clientId);
      if (meDir) {
        meDir.zone = zone.name;
        meDir.privateZone = currentPrivateZone;
        if (!$('users-drawer')?.hidden) renderOnlineUsers();
      }
    }
    world.highlightPrivateZone(currentPrivateZone, elapsed);

    // 발표 단상(스포트라이트 존) 감지
    const podium = world.getSpotlightPodiumAt(player.group.position.x, player.baseY, player.group.position.z);
    const nowOnSpotlight = !!podium;
    if (nowOnSpotlight !== myOnSpotlight) {
      myOnSpotlight = nowOnSpotlight;
      $('podium-badge').hidden = !myOnSpotlight;
      if (myOnSpotlight && joined) {
        $('podium-badge').textContent = `🎤 ${podium.name} LIVE`;
        showToast(`🎤 ${podium.name}에 올라섰습니다! 음성·캠이 전체 공간에 송출됩니다.`);
      }
    }

    const isSpeaking = voice.updateProximity(player.group.position, currentPrivateZone, remotes, onlineDirectory, myOnSpotlight);
    if (voice.isEnabled()) $('btn-mic').classList.toggle('mic-speaking', isSpeaking);

    // 멀티플레이어 위치 & 방향 & 앉기 & 댄스 & 프라이빗존 & 발표단상 송신 (~12Hz)
    if (joined && now - lastSyncAt > 85) {
      const px = player.group.position.x;
      const py = player.group.position.y;
      const pz = player.group.position.z;
      const fy = player.facingYaw;
      const dnc = player.danceStyle || '';
      const sit = !!player.sitting;
      const sitFloor = !!(player.sitting && player.sitting.floor);
      const moved = Math.hypot(px - lastSentPos.x, pz - lastSentPos.z) > 0.04
        || Math.abs(py - lastSentPos.y) > 0.04
        || Math.abs(fy - (lastSentPos.yaw || 0)) > 0.08
        || isMoving !== lastSentPos.moving
        || sit !== !!lastSentPos.sitting
        || sitFloor !== !!lastSentPos.sittingFloor
        || dnc !== (lastSentPos.dance || '')
        || currentPrivateZone !== (lastSentPos.privateZone || '')
        || myOnSpotlight !== !!lastSentPos.onSpotlight;
      if (moved) {
        lastSyncAt = now;
        lastSentPos = { x: px, y: py, z: pz, yaw: fy, moving: isMoving, sitting: sit, sittingFloor: sitFloor, dance: dnc, privateZone: currentPrivateZone, onSpotlight: myOnSpotlight };
        fetch('/api/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: clientId, x: px, y: py, z: pz, yaw: fy, moving: isMoving, sitting: sit, sittingFloor: sitFloor, dance: dnc, zone: zone.name, privateZone: currentPrivateZone, onSpotlight: myOnSpotlight }),
        }).catch(() => {});
      }
    }

    // 근접 인터랙션 배지
    nearestInteract = findNearestInteract();
    if (player.sitting) {
      $('interact-label').textContent = '일어나기 (또는 이동)';
      $('interact-hint').hidden = false;
    } else if (nearestInteract && $('profile-overlay').hidden) {
      $('interact-label').textContent = nearestInteract.label;
      $('interact-hint').hidden = false;
    } else {
      $('interact-hint').hidden = true;
    }

    // 카메라 업데이트
    const px = player.group.position.x;
    const py = player.group.position.y + Math.max(1.05, player.charHeight * 0.68);
    const pz = player.group.position.z;
    const mode = camModes[camModeIdx];

    if (mode === 'third') {
      // pitch > 0: 위에서 내려다봄 / pitch <= 0: 바닥을 뚫지 않고 하늘·구름·별빛까지 올려다봄!
      const fx = px + camPanX;
      const fz = pz + camPanZ;
      const effPitch = Math.max(0.02, pitch);
      const horiz = Math.cos(effPitch) * camDist;
      const cx = fx + Math.sin(yaw) * horiz;
      const cy = Math.max(0.65, py + Math.sin(effPitch) * camDist);
      const cz = fz + Math.cos(yaw) * horiz;
      const skyLift = pitch < 0.02 ? (0.02 - pitch) * camDist * 1.45 : 0;
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 10));
      camTargetSmooth.lerp(new THREE.Vector3(fx, py + 0.25 + skyLift, fz), Math.min(1, dt * 12));
      camera.lookAt(camTargetSmooth);
    } else if (mode === 'first') {
      const eyeY = player.group.position.y + Math.max(1.2, player.charHeight * 0.85);
      camera.position.set(px, eyeY, pz);
      const lookX = px - Math.sin(yaw) * 6;
      const lookY = eyeY - pitch * 5.8;
      const lookZ = pz - Math.cos(yaw) * 6;
      camera.lookAt(lookX, lookY, lookZ);
    } else {
      const fx = -2 + camPanX;
      const fz = -6 + camPanZ;
      const bx = fx + Math.sin(yaw) * 26;
      const bz = fz + Math.cos(yaw) * 26;
      const by = Math.max(4.5, 22 + pitch * 14);
      const skyLift = pitch < 0 ? -pitch * 26 : 0;
      camera.position.lerp(new THREE.Vector3(bx, by, bz), Math.min(1, dt * 5));
      camTargetSmooth.lerp(new THREE.Vector3(fx, skyLift, fz), Math.min(1, dt * 6));
      camera.lookAt(camTargetSmooth);
    }

    drawMinimap();
    renderer.render(scene, camera);
    if (controlRoom) controlRoom.updateCctvFeeds();
  }

  animate();
}

init();
