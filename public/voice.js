// ZEP 스타일 근접 음성 + 화상 캠 + 실시간 화면공유 엔진 (WebRTC + 거리/프라이빗존 자동 연동)
// 추가 외부 서버 없이 server.mjs의 SSE + /api/signal 을 시그널링으로 사용합니다.

const ICE_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export function createProximityVoice({ clientId, getProfile, onStatus, onToast }) {
  const $ = (id) => document.getElementById(id);

  let audioStream = null;
  let camStream = null;
  let screenStream = null;
  let mixedAudioDest = null;
  let mixedSources = [];
  let audioCtx = null;
  let localAnalyser = null;
  let micOn = false;
  let camOn = false;
  let screenOn = false;
  let speaking = false;

  const peers = new Map(); // remoteId -> { pc, audioEl, gainNode, tileEl, videoEl, remoteStream, hasVideo, isScreenShare, pendingAutoStage, remoteName }
  const remoteMediaMeta = new Map(); // remoteId -> { voiceOn, videoOn, screenOn, name }
  let localTile = null;
  let lastKnownUsers = [];

  function hasLocalMedia() {
    return !!(micOn || camOn || screenOn);
  }

  function getActiveVideoStream() {
    if (screenOn && screenStream) return screenStream;
    if (camOn && camStream) return camStream;
    return null;
  }

  function getOutgoingVideoTrack() {
    const s = getActiveVideoStream();
    return s ? (s.getVideoTracks()[0] || null) : null;
  }

  function ensureAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function rebuildMixedAudioTrack() {
    for (const src of mixedSources) {
      try { src.disconnect(); } catch { /* ignore */ }
    }
    mixedSources = [];
    mixedAudioDest = null;

    const micTrack = micOn && audioStream ? (audioStream.getAudioTracks()[0] || null) : null;
    const scrTrack = screenOn && screenStream ? (screenStream.getAudioTracks()[0] || null) : null;

    if (micTrack && scrTrack) {
      try {
        const ctx = ensureAudioCtx();
        mixedAudioDest = ctx.createMediaStreamDestination();
        const s1 = ctx.createMediaStreamSource(new MediaStream([micTrack]));
        const s2 = ctx.createMediaStreamSource(new MediaStream([scrTrack]));
        s1.connect(mixedAudioDest);
        s2.connect(mixedAudioDest);
        mixedSources = [s1, s2];
        return {
          track: mixedAudioDest.stream.getAudioTracks()[0] || micTrack,
          stream: mixedAudioDest.stream,
        };
      } catch {
        return { track: micTrack, stream: audioStream };
      }
    }
    if (micTrack) return { track: micTrack, stream: audioStream };
    if (scrTrack) return { track: scrTrack, stream: screenStream };
    return { track: null, stream: null };
  }

  function sendSignal(toId, signal) {
    fetch('/api/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, toId, signal }),
    }).catch(() => {});
  }

  function notifyMediaState() {
    fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, voiceOn: micOn, videoOn: camOn, screenOn }),
    }).catch(() => {});
    onStatus({ micOn, camOn, screenOn, isScreenShare: screenOn });
  }

  let stagePinnedId = null; // null | 'me' | remoteId
  let gridMode = false;

  function renderStageOverlay() {
    const stage = $('video-stage');
    const stageVideo = $('video-stage-stream');
    const stageLabel = $('video-stage-label');
    const stageLive = $('video-stage-live');
    if (!stage || !stageVideo) return;

    if (!stagePinnedId) {
      stage.hidden = true;
      stageVideo.srcObject = null;
      if (stageLive) stageLive.hidden = true;
      return;
    }

    let stream = null;
    let label = '';
    let mirror = false;
    let showingScreen = false;
    if (stagePinnedId === 'me') {
      const activeStream = getActiveVideoStream();
      if (activeStream) {
        stream = activeStream;
        const prof = getProfile ? getProfile() : { name: '나' };
        showingScreen = screenOn;
        label = showingScreen ? `${prof.name} (나) · 화면 공유 미리보기` : `${prof.name} (나)`;
        mirror = !showingScreen;
      }
    } else {
      const p = peers.get(stagePinnedId);
      if (p && p.hasVideo && p.remoteStream) {
        stream = p.remoteStream;
        showingScreen = !!p.isScreenShare;
        label = showingScreen ? `${p.remoteName || '발표자'}님의 화면 공유` : `${p.remoteName || '발표자'} · 고정됨`;
        mirror = false;
      }
    }

    if (!stream) {
      stagePinnedId = null;
      stage.hidden = true;
      stageVideo.srcObject = null;
      if (stageLive) stageLive.hidden = true;
      return;
    }

    stage.hidden = false;
    if (stageVideo.srcObject !== stream) {
      stageVideo.srcObject = stream;
      stageVideo.play().catch(() => {});
    }
    stageVideo.classList.toggle('mirror', mirror);
    if (stageLabel) stageLabel.textContent = label;
    if (stageLive) stageLive.hidden = !showingScreen;
  }

  function pinVideo(targetId) {
    stagePinnedId = stagePinnedId === targetId ? null : targetId;
    renderStageOverlay();
  }

  function closeStage() {
    stagePinnedId = null;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    renderStageOverlay();
  }

  function toggleGridMode() {
    const dock = $('video-dock');
    if (!dock) return;
    gridMode = !gridMode;
    dock.classList.toggle('grid-view', gridMode);
    if (gridMode) {
      stagePinnedId = null;
      renderStageOverlay();
    }
    const gbtn = $('btn-video-grid');
    if (gbtn) gbtn.classList.toggle('on', gridMode);
  }

  function ensureDockToolbar() {
    const dock = $('video-dock');
    if (!dock || $('video-dock-tools')) return;
    const bar = document.createElement('div');
    bar.id = 'video-dock-tools';
    bar.className = 'video-dock-tools';
    const gbtn = document.createElement('button');
    gbtn.id = 'btn-video-grid';
    gbtn.type = 'button';
    gbtn.className = 'video-tool-btn';
    gbtn.title = '캠 그리드 보기 전환';
    gbtn.textContent = '⊞ 그리드';
    gbtn.onclick = (e) => { e.stopPropagation(); toggleGridMode(); };
    bar.appendChild(gbtn);
    dock.appendChild(bar);
  }

  function syncDockVisibility() {
    const dock = $('video-dock');
    if (!dock) return;
    const anyVisible = [...dock.children].some((el) => el.classList.contains('video-tile') && !el.hidden);
    dock.hidden = !anyVisible;
    const tools = $('video-dock-tools');
    if (tools) tools.hidden = !anyVisible;
    renderStageOverlay();
  }

  // 내 로컬 화상/화면공유 타일 생성/갱신
  function updateLocalTile() {
    const dock = $('video-dock');
    if (!dock) return;
    ensureDockToolbar();
    const activeStream = getActiveVideoStream();
    if (!activeStream) {
      if (localTile) { localTile.remove(); localTile = null; }
      if (stagePinnedId === 'me') stagePinnedId = null;
      syncDockVisibility();
      return;
    }
    if (!localTile) {
      localTile = document.createElement('div');
      localTile.className = 'video-tile me';
      const v = document.createElement('video');
      v.autoplay = true;
      v.muted = true;
      v.playsInline = true;
      const lbl = document.createElement('div');
      lbl.className = 'video-label';
      const scrBtn = document.createElement('button');
      scrBtn.className = 'video-mini-btn';
      scrBtn.title = '화면공유 시작 / 중지';
      scrBtn.textContent = '🖥️';
      scrBtn.onclick = (e) => { e.stopPropagation(); toggleScreenShare(lastKnownUsers); };
      const pinBtn = document.createElement('button');
      pinBtn.className = 'video-mini-btn pin-btn';
      pinBtn.title = '크게 보기 / 발표 화면 고정';
      pinBtn.textContent = '⛶';
      pinBtn.onclick = (e) => { e.stopPropagation(); pinVideo('me'); };
      localTile.onclick = () => pinVideo('me');
      localTile.append(v, lbl, scrBtn, pinBtn);
      dock.prepend(localTile);
    }
    const v = localTile.querySelector('video');
    if (v.srcObject !== activeStream) v.srcObject = activeStream;
    v.play().catch(() => {});
    v.classList.toggle('mirror', !screenOn);
    localTile.classList.toggle('screen-tile', screenOn);
    const prof = getProfile ? getProfile() : { name: '나' };
    localTile.querySelector('.video-label').textContent = screenOn
      ? `🖥️ ${prof.name} (나) · 화면공유`
      : `${prof.name} (나)`;
    localTile.querySelector('.video-mini-btn:not(.pin-btn)').textContent = screenOn ? '⏹' : '🖥️';
    localTile.hidden = false;
    syncDockVisibility();
  }

  function ensureRemoteTile(remoteId, remoteName = '접속자') {
    const dock = $('video-dock');
    if (!dock) return null;
    ensureDockToolbar();
    const p = peers.get(remoteId);
    if (!p) return null;
    if (!p.tileEl) {
      const tile = document.createElement('div');
      tile.className = 'video-tile';
      const v = document.createElement('video');
      v.autoplay = true;
      v.muted = true; // 오디오는 audioEl / GainNode로 제어
      v.playsInline = true;
      const lbl = document.createElement('div');
      lbl.className = 'video-label';
      lbl.textContent = p.isScreenShare ? `🖥️ ${remoteName} · 화면공유` : remoteName;
      const pinBtn = document.createElement('button');
      pinBtn.className = 'video-mini-btn pin-btn';
      pinBtn.title = '크게 보기 / 발표자 고정';
      pinBtn.textContent = '⛶';
      pinBtn.onclick = (e) => { e.stopPropagation(); pinVideo(remoteId); };
      tile.onclick = () => pinVideo(remoteId);
      tile.append(v, lbl, pinBtn);
      dock.appendChild(tile);
      p.tileEl = tile;
      p.videoEl = v;
    }
    p.tileEl.classList.toggle('screen-tile', !!p.isScreenShare);
    return p.tileEl;
  }

  function cleanupPeer(remoteId) {
    const p = peers.get(remoteId);
    if (!p) return;
    try { p.pc.close(); } catch { /* ignore */ }
    try { p.audioEl.srcObject = null; p.audioEl.remove(); } catch { /* ignore */ }
    try { if (p.tileEl) p.tileEl.remove(); } catch { /* ignore */ }
    if (stagePinnedId === remoteId) stagePinnedId = null;
    peers.delete(remoteId);
    syncDockVisibility();
  }

  function attachLocalTracks(pc) {
    const existing = new Set(pc.getSenders().map((s) => s.track).filter(Boolean));
    const { track: aTrack, stream: aStream } = rebuildMixedAudioTrack();
    if (aTrack && aStream && !existing.has(aTrack)) {
      pc.addTrack(aTrack, aStream);
    }
    const vStream = getActiveVideoStream();
    const vTrack = getOutgoingVideoTrack();
    if (vTrack && vStream && !existing.has(vTrack)) {
      pc.addTrack(vTrack, vStream);
    }
  }

  async function renegotiatePeer(remoteId) {
    const p = peers.get(remoteId);
    if (!p) return;
    try {
      const offer = await p.pc.createOffer();
      await p.pc.setLocalDescription(offer);
      sendSignal(remoteId, { type: 'offer', sdp: p.pc.localDescription });
    } catch { /* ignore */ }
  }

  function createPeer(remoteId, initiator, remoteName = '접속자') {
    cleanupPeer(remoteId);
    const pc = new RTCPeerConnection(ICE_CONFIG);

    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.playsInline = true;

    const meta = remoteMediaMeta.get(remoteId);
    const remoteStream = new MediaStream();
    const peerObj = {
      pc,
      audioEl,
      gainNode: null,
      tileEl: null,
      videoEl: null,
      remoteStream,
      hasVideo: false,
      isScreenShare: !!meta?.screenOn,
      pendingAutoStage: !!meta?.screenOn,
      remoteName: meta?.name || remoteName,
    };
    peers.set(remoteId, peerObj);

    attachLocalTracks(pc);

    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendSignal(remoteId, { type: 'ice', candidate: ev.candidate });
    };

    pc.ontrack = (ev) => {
      const track = ev.track;
      // 같은 kind의 오래된 종료 트랙 교체
      for (const old of remoteStream.getTracks()) {
        if (old.kind === track.kind && old.id !== track.id) {
          remoteStream.removeTrack(old);
        }
      }
      if (!remoteStream.getTrackById(track.id)) remoteStream.addTrack(track);

      if (track.kind === 'audio') {
        audioEl.srcObject = remoteStream;
        try {
          const ctx = ensureAudioCtx();
          if (!peerObj.gainNode) {
            const src = ctx.createMediaStreamSource(remoteStream);
            const gain = ctx.createGain();
            gain.gain.value = 0.85;
            src.connect(gain);
            gain.connect(ctx.destination);
            audioEl.muted = true;
            peerObj.gainNode = gain;
          }
        } catch {
          audioEl.muted = false;
          audioEl.play().catch(() => {});
        }
      } else if (track.kind === 'video') {
        peerObj.hasVideo = true;
        ensureRemoteTile(remoteId, peerObj.remoteName);
        if (peerObj.videoEl) {
          peerObj.videoEl.srcObject = remoteStream;
          peerObj.videoEl.play().catch(() => {});
        }
        track.onended = () => {
          peerObj.hasVideo = false;
          if (peerObj.tileEl) peerObj.tileEl.hidden = true;
          if (stagePinnedId === remoteId) stagePinnedId = null;
          syncDockVisibility();
        };
        syncDockVisibility();
      }
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) {
        cleanupPeer(remoteId);
      }
    };

    if (initiator) renegotiatePeer(remoteId);
    return peerObj;
  }

  async function syncAllPeersWithLocalTracks(remoteUsers = []) {
    if (Array.isArray(remoteUsers) && remoteUsers.length) {
      lastKnownUsers = remoteUsers;
    }
    const { track: newATrack, stream: newAStream } = rebuildMixedAudioTrack();
    const newVStream = getActiveVideoStream();
    const newVTrack = getOutgoingVideoTrack();

    // 기존 피어에 트랙 추가/교체 후 필요 시 재협상
    for (const [rid, p] of peers) {
      const senders = p.pc.getSenders();
      const aSender = senders.find((s) => s.track && s.track.kind === 'audio');
      const vSender = senders.find((s) => s.track && s.track.kind === 'video');

      let needOffer = false;
      if (aSender && newATrack) {
        if (aSender.track !== newATrack) await aSender.replaceTrack(newATrack).catch(() => {});
      } else if (aSender && !newATrack) {
        p.pc.removeTrack(aSender);
        needOffer = true;
      } else if (!aSender && newATrack && newAStream) {
        p.pc.addTrack(newATrack, newAStream);
        needOffer = true;
      }

      if (vSender && newVTrack) {
        if (vSender.track !== newVTrack) await vSender.replaceTrack(newVTrack).catch(() => {});
      } else if (vSender && !newVTrack) {
        p.pc.removeTrack(vSender);
        needOffer = true;
      } else if (!vSender && newVTrack && newVStream) {
        p.pc.addTrack(newVTrack, newVStream);
        needOffer = true;
      }

      if (needOffer) renegotiatePeer(rid);
    }

    // 내가 미디어(마이크/캠/화면공유)를 송출 중이면 모든 온라인 접속자(시청 전용 포함!)에게 연결
    if (hasLocalMedia()) {
      for (const u of lastKnownUsers) {
        if (!u || u.id === clientId || peers.has(u.id)) continue;
        const otherActive = !!(u.voiceOn || u.videoOn || u.screenOn);
        // 상대가 수동 시청자(!otherActive)거나, 양쪽 모두 송출 중일 때는 작은 ID가 offer 주도
        if (!otherActive || clientId < u.id) {
          createPeer(u.id, true, u.name || '접속자');
        }
      }
    } else {
      // 내가 아무 미디어도 안 켰을 때, 상대도 미디어를 안 켰으면 연결 정리
      for (const rid of [...peers.keys()]) {
        const meta = remoteMediaMeta.get(rid);
        if (!meta || (!meta.voiceOn && !meta.videoOn && !meta.screenOn)) {
          cleanupPeer(rid);
        }
      }
    }
  }

  async function offerHttpsRedirect(kindLabel) {
    try {
      const res = await fetch('/api/network');
      if (res.ok) {
        const net = await res.json();
        if (net.httpsPort && location.protocol === 'http:') {
          const target = `https://${location.hostname}:${net.httpsPort}${location.pathname}`;
          if (confirm(`${kindLabel} 기능은 보안(HTTPS) 주소에서 바로 사용할 수 있어요!\n\n보안 주소(${target})로 지금 바로 이동할까요?\n(처음 1회 '고급 → 안전하지 않음으로 이동'을 누르시면 크롬에서 캠·마이크·화면공유가 바로 켜집니다!)`)) {
            location.href = target;
            return;
          }
        }
      }
    } catch { /* ignore */ }
    onToast(`${kindLabel} 기능은 https:// 보안 주소 또는 http://localhost:4327 에서 사용할 수 있어요!`);
  }

  async function toggleMic(remoteUsers = []) {
    if (micOn) {
      micOn = false;
      speaking = false;
      if (audioStream) { audioStream.getTracks().forEach((t) => t.stop()); audioStream = null; }
      localAnalyser = null;
      await syncAllPeersWithLocalTracks(remoteUsers);
      notifyMediaState();
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      await offerHttpsRedirect('🎙️ 마이크');
      return false;
    }
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      micOn = true;
      const ctx = ensureAudioCtx();
      const src = ctx.createMediaStreamSource(audioStream);
      localAnalyser = ctx.createAnalyser();
      localAnalyser.fftSize = 256;
      src.connect(localAnalyser);

      await syncAllPeersWithLocalTracks(remoteUsers);
      notifyMediaState();
      onToast('🎙️ 근접 보이스챗 ON! 가까이 있는 친구나 같은 프라이빗 존 사람과 대화할 수 있어요.');
      return true;
    } catch {
      onToast('🎙️ 마이크 권한이 거부되었거나 마이크 장치를 찾을 수 없어요.');
      return false;
    }
  }

  async function toggleVideo(remoteUsers = []) {
    if (camOn) {
      camOn = false;
      if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
      updateLocalTile();
      await syncAllPeersWithLocalTracks(remoteUsers);
      notifyMediaState();
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      await offerHttpsRedirect('📹 화상 캠');
      return false;
    }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
      });
      camOn = true;
      updateLocalTile();
      await syncAllPeersWithLocalTracks(remoteUsers);
      notifyMediaState();
      onToast('📹 화상 캠 ON! 상단 화면을 클릭하면 크게 볼 수 있어요.');
      return true;
    } catch {
      onToast('📹 카메라 권한이 거부되었거나 연결된 웹캠을 찾을 수 없어요.');
      return false;
    }
  }

  async function stopScreenShare(remoteUsers = lastKnownUsers, silent = false) {
    if (!screenOn) return false;
    screenOn = false;
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      screenStream = null;
    }
    if (stagePinnedId === 'me' && !camOn) {
      closeStage();
    }
    updateLocalTile();
    await syncAllPeersWithLocalTracks(remoteUsers);
    notifyMediaState();
    if (!silent) onToast('🖥️ 화면 공유를 종료했습니다.');
    return false;
  }

  async function toggleScreenShare(remoteUsers = lastKnownUsers) {
    if (Array.isArray(remoteUsers) && remoteUsers.length) {
      lastKnownUsers = remoteUsers;
    }
    if (screenOn) {
      return await stopScreenShare(lastKnownUsers);
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      if (location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        await offerHttpsRedirect('🖥️ 화면공유');
      } else {
        onToast('🖥️ 이 브라우저에서는 화면공유를 지원하지 않아요.');
      }
      return false;
    }
    try {
      const scr = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
        audio: true,
      });
      screenStream = scr;
      screenOn = true;
      const vTrack = scr.getVideoTracks()[0];
      if (vTrack) {
        vTrack.onended = () => {
          if (screenOn) stopScreenShare(lastKnownUsers);
        };
      }
      updateLocalTile();
      await syncAllPeersWithLocalTracks(lastKnownUsers);
      notifyMediaState();
      onToast('🖥️ ZEP 스타일 화면공유를 시작했습니다! 같은 공간의 접속자에게 실시간으로 송출됩니다.');
      return true;
    } catch (err) {
      if (err?.name !== 'AbortError' && err?.name !== 'NotAllowedError') {
        onToast('🖥️ 화면공유를 시작하지 못했어요.');
      }
      return false;
    }
  }

  async function handleSignal(fromId, signal, remoteName = '접속자') {
    if (!fromId || fromId === clientId) return;
    if (signal.type === 'offer') {
      const p = peers.get(fromId) || createPeer(fromId, false, remoteName);
      p.remoteName = remoteName;
      try {
        if (p.pc.signalingState !== 'stable') {
          await p.pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
        }
        await p.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const ans = await p.pc.createAnswer();
        await p.pc.setLocalDescription(ans);
        sendSignal(fromId, { type: 'answer', sdp: p.pc.localDescription });
      } catch { /* ignore */ }
    } else if (signal.type === 'answer') {
      const p = peers.get(fromId);
      if (p) {
        try { await p.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)); } catch { /* ignore */ }
      }
    } else if (signal.type === 'ice') {
      const p = peers.get(fromId);
      if (p && signal.candidate) {
        try { await p.pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch { /* ignore */ }
      }
    }
  }

  function onRemoteJoin(user) {
    if (!user || !user.id || user.id === clientId) return;
    remoteMediaMeta.set(user.id, {
      voiceOn: !!user.voiceOn,
      videoOn: !!user.videoOn,
      screenOn: !!user.screenOn,
      name: user.name || '접속자',
    });
    if (!lastKnownUsers.some((u) => u.id === user.id)) {
      lastKnownUsers = [...lastKnownUsers, user];
    }
    // 내가 현재 화면공유/캠/마이크 송출 중이면 새로 입장한 접속자에게 즉시 스트림 전송!
    if (hasLocalMedia() && !peers.has(user.id)) {
      const otherActive = !!(user.voiceOn || user.videoOn || user.screenOn);
      if (!otherActive || clientId < user.id) {
        createPeer(user.id, true, user.name || '접속자');
      }
    }
  }

  function onRemoteMediaChange(remoteId, { voiceOn, videoOn, screenOn: remoteScreenOn, name }) {
    if (!remoteId || remoteId === clientId) return;
    const prevMeta = remoteMediaMeta.get(remoteId) || {};
    const nextScreen = !!remoteScreenOn;
    remoteMediaMeta.set(remoteId, {
      voiceOn: !!voiceOn,
      videoOn: !!videoOn,
      screenOn: nextScreen,
      name: name || prevMeta.name || '접속자',
    });

    const otherActive = !!(voiceOn || videoOn || nextScreen);
    if (!otherActive && !hasLocalMedia()) {
      cleanupPeer(remoteId);
      return;
    }

    const existing = peers.get(remoteId);
    if (existing) {
      if (name) existing.remoteName = name;
      const wasScreen = !!existing.isScreenShare;
      existing.isScreenShare = nextScreen;
      if (!wasScreen && nextScreen) {
        existing.pendingAutoStage = true;
      }
      if (existing.tileEl) {
        existing.tileEl.classList.toggle('screen-tile', nextScreen);
        if (name) {
          existing.tileEl.querySelector('.video-label').textContent = nextScreen
            ? `🖥️ ${name} · 화면공유`
            : name;
        }
      }
      if (!videoOn && !nextScreen) {
        existing.hasVideo = false;
        if (existing.tileEl) existing.tileEl.hidden = true;
        if (stagePinnedId === remoteId) stagePinnedId = null;
        syncDockVisibility();
      } else {
        renderStageOverlay();
      }
    } else if (otherActive && hasLocalMedia() && clientId < remoteId) {
      createPeer(remoteId, true, name || '접속자');
    }
  }

  const freqBuf = new Uint8Array(128);
  function updateProximity(myPos, myPrivateZone, remotesMap, onlineDir, myOnSpotlight = false) {
    if (localAnalyser && micOn) {
      localAnalyser.getByteFrequencyData(freqBuf);
      let sum = 0;
      for (let i = 0; i < 32; i++) sum += freqBuf[i];
      speaking = sum / 32 > 18;
    } else {
      speaking = false;
    }
    if (localTile) localTile.classList.toggle('speaking', speaking);

    let dockChanged = false;
    for (const [rid, p] of peers) {
      const av = remotesMap.get(rid);
      const dir = onlineDir.get(rid);
      if (!av && !dir) continue;
      const otherZone = dir?.privateZone || '';
      const otherOnSpotlight = !!dir?.onSpotlight;
      const remoteHasScreen = !!(dir?.screenOn || p.isScreenShare);
      const remoteHasVideo = !!(dir?.videoOn || remoteHasScreen);
      let vol = 0;
      let canSeeVideo = false;

      // 1) 발표 단상(스포트라이트 존): 거리·구역 무관 전원 송출
      if (myOnSpotlight || otherOnSpotlight) {
        vol = 1.0;
        canSeeVideo = true;
      // 2) 프라이빗 존: 같은 프라이빗 영역 사람끼리만 화면공유/캠/음성 격리
      } else if (myPrivateZone || otherZone) {
        const same = myPrivateZone === otherZone;
        vol = same ? 1.0 : 0.0;
        canSeeVideo = same;
      // 3) 공용 공간: 화면공유는 공용 공간 전체에서 선명하게 표시, 캠/음성은 근접 거리 연동
      } else if (remoteHasScreen) {
        vol = 1.0;
        canSeeVideo = true;
      } else if (av) {
        const d = Math.hypot(av.group.position.x - myPos.x, av.group.position.z - myPos.z);
        if (d <= 3.5) vol = 1.0;
        else if (d >= 14.5) vol = 0.0;
        else vol = 1.0 - (d - 3.5) / 11.0;
        canSeeVideo = vol > 0.02;
      }

      if (p.gainNode) p.gainNode.gain.value = vol;
      else p.audioEl.volume = vol;

      if (p.tileEl) {
        const shouldShow = p.hasVideo && remoteHasVideo && canSeeVideo;
        if (p.tileEl.hidden === shouldShow) {
          p.tileEl.hidden = !shouldShow;
          dockChanged = true;
        }
        p.tileEl.classList.toggle('screen-tile', remoteHasScreen);
        if (shouldShow && dir?.name) {
          const base = otherOnSpotlight ? `🎤 ${dir.name}` : dir.name;
          p.tileEl.querySelector('.video-label').textContent = remoteHasScreen
            ? `🖥️ ${base} · 화면공유`
            : base;
        }
        // 상대가 화면공유를 새로 켰고 같은 영역/가시 범위라면 ZEP처럼 자동으로 크게 보기 스테이지 오픈!
        if (shouldShow && remoteHasScreen && p.pendingAutoStage) {
          p.pendingAutoStage = false;
          stagePinnedId = rid;
          renderStageOverlay();
          onToast(`🖥️ ${dir?.name || p.remoteName || '접속자'}님이 화면 공유를 시작했습니다!`);
        } else if (!shouldShow && stagePinnedId === rid) {
          stagePinnedId = null;
          renderStageOverlay();
        }
      }
    }
    if (dockChanged) syncDockVisibility();
    return speaking;
  }

  function muteFromHost() {
    if (!micOn) return false;
    micOn = false;
    if (audioStream) {
      audioStream.getTracks().forEach((t) => t.stop());
      audioStream = null;
    }
    localAnalyser = null;
    syncAllPeersWithLocalTracks(lastKnownUsers);
    notifyMediaState();
    return true;
  }

  const stageCloseBtn = $('video-stage-close');
  if (stageCloseBtn) stageCloseBtn.onclick = closeStage;
  const stageFsBtn = $('video-stage-fullscreen');
  if (stageFsBtn) {
    stageFsBtn.onclick = () => {
      const stage = $('video-stage');
      if (!stage) return;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else stage.requestFullscreen?.().catch(() => {});
    };
  }
  const previewBtn = $('btn-screen-preview');
  if (previewBtn) previewBtn.onclick = () => pinVideo('me');
  const stopBtn = $('btn-screen-stop');
  if (stopBtn) stopBtn.onclick = () => stopScreenShare(lastKnownUsers);

  return {
    isEnabled: () => micOn,
    isCamEnabled: () => camOn,
    isScreenEnabled: () => screenOn,
    isSpeaking: () => speaking,
    toggleMic,
    toggleVideo,
    toggleScreenShare,
    stopScreenShare,
    pinVideo,
    closeStage,
    toggleGridMode,
    muteFromHost,
    handleSignal,
    onRemoteJoin,
    onRemoteMediaChange,
    cleanupPeer,
    updateProximity,
  };
}
