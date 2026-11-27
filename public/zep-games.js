import * as THREE from 'three';

// 🎮 ZEP 스타일 확장 미니게임 아케이드 모듈
// 1) 🚦 무궁화 꽃이 피었습니다 (3D 실시간 이동 & 얼음)
// 2) 🪙 30초 황금 코인 러시 (3D 타임어택 수집)
// 3) 💣 폭탄 피하기 생존전 (3D 광장 웨이브 서바이벌)
// 4) 🎲 파티 미니게임 (✊✌️✋ 가위바위보 연승전 · 🎲 전체 공유 주사위 · 🪜 사다리 타기)

const COIN_SPOTS = [
  // 친환경 오피스 50인 중앙 대통로 & 팀 아일랜드 사이 넓은 복도 (책상 충돌 없음)
  [0.0, 12.4], [-3.2, 8.6], [3.2, 8.6], [0.0, 5.6],
  [-8.6, -12.6], [-8.6, -6.0], [-8.6, 0.2], [8.6, -12.6], [8.6, -6.0], [8.6, 0.2],
  [-15.4, -6.0], [-15.4, 2.0], [0.0, -6.0], [15.4, -6.0], [15.4, 2.0],
  [-21.4, -6.0], [21.4, -6.0], [-5.2, 2.6], [5.2, 2.6],
  // 에코 가든 캠핑 라운지 · 튜터실 · 집중 캡슐룸
  [-16.8, 7.6], [-13.0, 8.2], [-15.2, 6.2], [11.6, 5.2], [11.6, 12.6], [18.2, 7.2],
  // 야외 무대 잔디 & OX 퀴즈 광장
  [-11.5, -17.8], [-14.2, -20.2], [27.9, -2.0], [33.7, -2.0], [30.8, 2.2],
];

const RPS_META = {
  rock: { emoji: '✊', label: '바위' },
  scissors: { emoji: '✌️', label: '가위' },
  paper: { emoji: '✋', label: '보' },
};

const RPS_OPPONENTS = [
  { name: '하치와레', win: '헤헤, 내가 이겼다! ✨', lose: '으앗! 너무 잘하시네요! 😆', draw: '오오! 마음이 통했어요!' },
  { name: '우사기', win: '야하!! 우라라라!! 🎵', lose: '푸루야하—?! 다시 해!!', draw: '우라?! 똑같잖아!' },
  { name: '모몽가', win: '흥! 내가 당연히 이기지! 😤', lose: '에잇! 이건 무효야!!', draw: '흥, 꽤 따라오네?' },
  { name: '치이카와', win: '와... 와아~! 이겼어요! 💛', lose: '으응... 졌어요... 🥺', draw: '와아... 비겼어요!' },
];

export function createZepGames({
  scene,
  clientId,
  getProfile,
  player,
  showToast,
  appendChat,
  playChime,
  playNote,
  triggerCelebration,
  warpPlayerTo,
}) {
  const $ = (id) => document.getElementById(id);

  // 현재 진행 중인 3D 실시간 미니게임 상태 ('mugunghwa' | 'coinrush' | 'bombdodge' | null)
  let activeGame = null;
  const gameGroup = new THREE.Group();
  scene.add(gameGroup);

  function clearGame3D() {
    while (gameGroup.children.length) {
      const ch = gameGroup.children[0];
      gameGroup.remove(ch);
      ch.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
  }

  function showHud({ badge, status, detail, tone = 'info' }) {
    const hud = $('minigame-hud');
    if (!hud) return;
    hud.hidden = false;
    hud.className = `hud minigame-hud tone-${tone}`;
    if ($('mg-hud-badge')) $('mg-hud-badge').textContent = badge;
    if ($('mg-hud-status')) $('mg-hud-status').textContent = status;
    if ($('mg-hud-detail')) $('mg-hud-detail').textContent = detail;
  }

  function hideHud() {
    const hud = $('minigame-hud');
    if (hud) hud.hidden = true;
  }

  function stopActiveGame(silent = false) {
    if (!activeGame) return;
    const prevName = activeGame.title || '미니게임';
    activeGame = null;
    clearGame3D();
    hideHud();
    if (!silent) showToast(`⏹ [${prevName}] 게임을 종료했습니다.`);
  }

  if ($('mg-hud-stop')) $('mg-hud-stop').onclick = () => stopActiveGame(false);

  function broadcastGameChat(text) {
    fetch('/api/minigame/announce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, text }),
    }).catch(() => {
      appendChat({ type: 'system', scope: 'all', text, time: Date.now() });
    });
  }

  // =========================================================================
  // 1. 🚦 무궁화 꽃이 피었습니다 (3D 야외 잔디밭 실시간 레이스!)
  // =========================================================================
  function startMugunghwa() {
    stopActiveGame(true);
    if ($('games-modal')) $('games-modal').hidden = true;

    const START_Z = -16.4;
    const GOAL_Z = -23.2;
    const CENTER_X = -11.5;

    // 시작선으로 자동 워프 + 북쪽(결승선) 바라보기
    warpPlayerTo(CENTER_X + (Math.random() - 0.5) * 1.6, START_Z, 0, Math.PI, 0);

    // 3D 결승선 체크 라인 + 골 아치 + 술래 인형(황금 별 인형)
    const goalLine = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 0.55),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
    );
    goalLine.rotation.x = -Math.PI / 2;
    goalLine.position.set(CENTER_X, 0.05, GOAL_Z);
    gameGroup.add(goalLine);

    const startLine = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide })
    );
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(CENTER_X, 0.05, START_Z + 0.6);
    gameGroup.add(startLine);

    // 술래 마스코트 (초록불: 뒤돌아봄 / 빨간불: 정면 감시!)
    const dollGroup = new THREE.Group();
    dollGroup.position.set(CENTER_X, 0.05, GOAL_Z - 0.9);
    const dollBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.62, 1.35, 14),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
    );
    dollBody.position.y = 0.7;
    const dollHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff5e4, roughness: 0.6 })
    );
    dollHead.position.y = 1.65;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), eyeMat);
    eyeL.position.set(-0.2, 1.7, 0.48);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), eyeMat);
    eyeR.position.set(0.2, 1.7, 0.48);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), lightMat);
    beacon.position.y = 2.55;
    dollGroup.add(dollBody, dollHead, eyeL, eyeR, beacon);
    dollGroup.rotation.y = Math.PI; // 처음엔 뒤돌아봄(초록불)
    gameGroup.add(dollGroup);

    const now = performance.now();
    activeGame = {
      kind: 'mugunghwa',
      title: '무궁화 꽃이 피었습니다',
      startAt: now,
      endsAt: now + 35000,
      phase: 'green', // 'green' | 'warn' | 'red'
      phaseEndsAt: now + 2600,
      startZ: START_Z,
      goalZ: GOAL_Z,
      centerX: CENTER_X,
      dollGroup,
      eyeMat,
      lightMat,
      lastX: player.group.position.x,
      lastZ: player.group.position.z,
      caughtCooldownUntil: 0,
      caughtCount: 0,
    };

    playChime(false);
    player.say('🚦 무궁화 꽃 스타트!', 2.6);
    showToast('🚦 무궁화 꽃이 피었습니다 시작! 초록불에 북쪽 빨간 결승선까지 달리세요! 빨간불엔 얼음!');
  }

  function updateMugunghwa(dt, now) {
    const g = activeGame;
    const remSec = Math.max(0, (g.endsAt - now) / 1000);
    const distLeft = Math.max(0, player.group.position.z - g.goalZ);

    // 결승선 돌파 체크 -> 우승!
    if (player.group.position.z <= g.goalZ + 0.15) {
      const clearSec = ((now - g.startAt) / 1000).toFixed(1);
      stopActiveGame(true);
      player.say(`🏆 ${clearSec}초 클리어!!`, 4.5);
      showToast(`🏆 축하합니다! 무궁화 꽃이 피었습니다를 ${clearSec}초 만에 통과했어요!`);
      broadcastGameChat(`🚦🏆 ${getProfile().name}님이 [무궁화 꽃이 피었습니다]를 ${clearSec}초 만에 완주했습니다!`);
      if (triggerCelebration) triggerCelebration(`🚦 ${getProfile().name}님, ${clearSec}초 만에 결승선 통과!`);
      return;
    }

    // 타임아웃
    if (remSec <= 0) {
      stopActiveGame(true);
      playNote(220, 0.32);
      player.say('시간 초과! 아쉽다 😭', 3.5);
      showToast('⏰ 시간 종료! 아쉽게 결승선에 도달하지 못했어요. 다시 도전해 보세요!');
      return;
    }

    // 페이즈 전환 (초록불 -> 주의 0.75초 -> 빨간불 -> 초록불)
    if (now >= g.phaseEndsAt) {
      if (g.phase === 'green') {
        g.phase = 'warn';
        g.phaseEndsAt = now + 780;
        g.eyeMat.color.setHex(0xfacc15);
        g.lightMat.color.setHex(0xfacc15);
        playNote(660, 0.09);
      } else if (g.phase === 'warn') {
        g.phase = 'red';
        g.phaseEndsAt = now + 1850 + Math.random() * 1200;
        g.eyeMat.color.setHex(0xef4444);
        g.lightMat.color.setHex(0xef4444);
        g.lastX = player.group.position.x;
        g.lastZ = player.group.position.z;
        playNote(320, 0.16);
      } else {
        g.phase = 'green';
        g.phaseEndsAt = now + 2100 + Math.random() * 1700;
        g.eyeMat.color.setHex(0x22c55e);
        g.lightMat.color.setHex(0x22c55e);
        playNote(880, 0.09);
      }
    }

    // 술래 회전 애니메이션 (초록불: 뒤(PI), 빨간불: 앞(0))
    const targetRot = g.phase === 'red' ? 0 : Math.PI;
    g.dollGroup.rotation.y += (targetRot - g.dollGroup.rotation.y) * Math.min(1, dt * 14);

    // 빨간불 움직임 감지!
    if (g.phase === 'red' && now > g.caughtCooldownUntil) {
      const movedDist = Math.hypot(player.group.position.x - g.lastX, player.group.position.z - g.lastZ);
      if (movedDist > 0.11 || player.jumpY > 0.15) {
        g.caughtCount++;
        g.caughtCooldownUntil = now + 1100;
        playNote(180, 0.28);
        player.triggerPoked();
        player.say('앗! 움직여서 걸렸다!! 😱', 2.8);
        warpPlayerTo(g.centerX + (Math.random() - 0.5) * 1.4, g.startZ, 0, Math.PI, 0);
        g.lastX = player.group.position.x;
        g.lastZ = player.group.position.z;
        showToast('🚨 빨간불에 움직였습니다! 출발선으로 되돌아갑니다!');
      }
    }

    const phaseTxt = g.phase === 'green'
      ? '🟢 무궁화 꽃이 피었습니다! (달려요!)'
      : g.phase === 'warn'
        ? '🟡 곧 뒤돌아봅니다! 멈출 준비!'
        : '🔴 얼음!! 절대 움직이지 마세요!';
    const tone = g.phase === 'green' ? 'good' : g.phase === 'warn' ? 'warn' : 'danger';
    showHud({
      badge: '🚦 무궁화 꽃',
      status: phaseTxt,
      detail: `남은 거리 ${distLeft.toFixed(1)}m · 남은 시간 ${Math.ceil(remSec)}초`,
      tone,
    });
  }

  // =========================================================================
  // 2. 🪙 30초 황금 코인 러시 (3D 타임어택 수집)
  // =========================================================================
  const COIN_BEST_KEY = 'aio_zep_coin_best_v1';
  let coinBest = Number(localStorage.getItem(COIN_BEST_KEY) || 0) || 0;

  function startCoinRush() {
    stopActiveGame(true);
    if ($('games-modal')) $('games-modal').hidden = true;

    const shuffled = [...COIN_SPOTS].sort(() => Math.random() - 0.5).slice(0, 22);
    const coins = shuffled.map(([x, z], idx) => {
      const isStar = idx < 4;
      const mesh = isStar
        ? new THREE.Mesh(
          new THREE.OctahedronGeometry(0.42, 0),
          new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xec4899, emissiveIntensity: 0.65, roughness: 0.2, metalness: 0.4 })
        )
        : new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.36, 0.1, 16),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.45, roughness: 0.25, metalness: 0.6 })
        );
      if (!isStar) mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, 0.78, z);
      gameGroup.add(mesh);
      return { mesh, x, z, isStar, points: isStar ? 3 : 1, taken: false };
    });

    const now = performance.now();
    activeGame = {
      kind: 'coinrush',
      title: '30초 황금 코인 러시',
      startAt: now,
      endsAt: now + 30000,
      coins,
      score: 0,
      collected: 0,
    };
    playChime(false);
    player.say('🪙 코인 러시 시작! 달려라!', 2.8);
    showToast('🪙 30초 코인 러시 시작! 오피스 곳곳의 황금 코인(+1)과 핑크 스타(+3)를 모으세요! (Shift 달리기 추천)');
  }

  function updateCoinRush(dt, elapsed, now) {
    const g = activeGame;
    const remSec = Math.max(0, (g.endsAt - now) / 1000);
    const px = player.group.position.x, pz = player.group.position.z;

    for (const c of g.coins) {
      if (c.taken) continue;
      c.mesh.rotation.z = elapsed * 3.0;
      c.mesh.rotation.y = elapsed * 2.4;
      c.mesh.position.y = 0.78 + Math.sin(elapsed * 4.2 + c.x) * 0.15;
      if (Math.hypot(c.x - px, c.z - pz) < 1.38) {
        c.taken = true;
        c.mesh.visible = false;
        g.score += c.points;
        g.collected++;
        playNote(c.isStar ? 1046.5 : 740 + (g.collected % 6) * 45, 0.1);
        player.spawnActionFx(c.isStar ? '🌟' : '🪙', 0, 0.2, 0.6, 0.56);
      }
    }

    const allTaken = g.collected >= g.coins.length;
    if (remSec <= 0 || allTaken) {
      const finalScore = g.score;
      const isNewBest = finalScore > coinBest;
      if (isNewBest) {
        coinBest = finalScore;
        try { localStorage.setItem(COIN_BEST_KEY, String(coinBest)); } catch {}
      }
      stopActiveGame(true);
      player.say(`🪙 ${finalScore}점 달성!!`, 4.5);
      showToast(`🪙 코인 러시 종료! 최종 점수: ${finalScore}점${isNewBest ? ' 🏆 신기록!' : ` (최고 ${coinBest}점)`}`);
      broadcastGameChat(`🪙 ${getProfile().name}님이 [30초 코인 러시]에서 ${finalScore}점을 기록했습니다!${allTaken ? ' (올클리어!)' : ''}`);
      if (finalScore >= 12 || allTaken) {
        if (triggerCelebration) triggerCelebration(`🪙 ${getProfile().name}님 코인 러시 ${finalScore}점 대성공!`);
      } else {
        playChime(true);
      }
      return;
    }

    showHud({
      badge: '🪙 코인 러시',
      status: `현재 점수: ${g.score}점 (${g.collected}/${g.coins.length})`,
      detail: `남은 시간 ${Math.ceil(remSec)}초 · 최고 기록 ${coinBest}점`,
      tone: remSec <= 6 ? 'warn' : 'good',
    });
  }

  // =========================================================================
  // 3. 💣 폭탄 피하기 생존전 (3D 동쪽 광장 웨이브 서바이벌!)
  // =========================================================================
  function startBombDodge() {
    stopActiveGame(true);
    if ($('games-modal')) $('games-modal').hidden = true;

    const AX0 = 25.4, AX1 = 36.2, AZ0 = -6.6, AZ1 = 2.6;
    warpPlayerTo(30.8, -2.0, 0, Math.PI, 0);

    // 경기장 네온 테두리
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.78 });
    const mkSide = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), borderMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.06, z);
      gameGroup.add(m);
    };
    const aw = AX1 - AX0, ad = AZ1 - AZ0, acx = (AX0 + AX1) / 2, acz = (AZ0 + AZ1) / 2;
    mkSide(aw, 0.22, acx, AZ0);
    mkSide(aw, 0.22, acx, AZ1);
    mkSide(0.22, ad, AX0, acz);
    mkSide(0.22, ad, AX1, acz);

    const now = performance.now();
    activeGame = {
      kind: 'bombdodge',
      title: '폭탄 피하기 생존전',
      startAt: now,
      endsAt: now + 30000,
      ax0: AX0, ax1: AX1, az0: AZ0, az1: AZ1,
      hp: 3,
      wave: 0,
      nextWaveAt: now + 900,
      invulnUntil: 0,
      bombs: [], // { x, z, radius, bornAt, explodeAt, exploded, ring, fill, blast }
    };

    playChime(false);
    player.say('💣 폭탄 피하기 시작!!', 2.8);
    showToast('💣 폭탄 피하기 생존전 시작! 빨간 경고 원이 터지기 전에 30초 동안 피해 살아남으세요! (하트 3개)');
  }

  function spawnBombWave(g, now) {
    g.wave++;
    const count = Math.min(9, 3 + g.wave);
    const radius = 1.65;
    const fuseMs = Math.max(1150, 1750 - g.wave * 90);
    const px = player.group.position.x, pz = player.group.position.z;

    for (let i = 0; i < count; i++) {
      // 1개는 플레이어 근처를 조준해 긴장감 업!
      const bx = i === 0
        ? Math.max(g.ax0 + 1, Math.min(g.ax1 - 1, px + (Math.random() - 0.5) * 1.4))
        : g.ax0 + 1.0 + Math.random() * (g.ax1 - g.ax0 - 2.0);
      const bz = i === 0
        ? Math.max(g.az0 + 1, Math.min(g.az1 - 1, pz + (Math.random() - 0.5) * 1.4))
        : g.az0 + 1.0 + Math.random() * (g.az1 - g.az0 - 2.0);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.15, radius, 28),
        new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(bx, 0.08, bz);

      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(radius, 24),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(bx, 0.075, bz);
      fill.scale.set(0.1, 0.1, 1);

      gameGroup.add(ring, fill);
      g.bombs.push({ x: bx, z: bz, radius, bornAt: now, explodeAt: now + fuseMs, exploded: false, ring, fill, blast: null, cleanAt: 0 });
    }
    playNote(460, 0.08);
    g.nextWaveAt = now + Math.max(1900, 2900 - g.wave * 130);
  }

  function updateBombDodge(dt, now) {
    const g = activeGame;
    const remSec = Math.max(0, (g.endsAt - now) / 1000);

    if (now >= g.nextWaveAt && remSec > 1.2) {
      spawnBombWave(g, now);
    }

    const px = player.group.position.x, pz = player.group.position.z;
    for (let i = g.bombs.length - 1; i >= 0; i--) {
      const b = g.bombs[i];
      if (!b.exploded) {
        const p = Math.min(1, (now - b.bornAt) / Math.max(1, b.explodeAt - b.bornAt));
        b.fill.scale.set(0.15 + p * 0.85, 0.15 + p * 0.85, 1);
        b.fill.material.opacity = 0.2 + p * 0.42;
        if (now >= b.explodeAt) {
          b.exploded = true;
          b.cleanAt = now + 420;
          b.ring.visible = false;
          b.fill.visible = false;
          const blast = new THREE.Mesh(
            new THREE.SphereGeometry(b.radius * 0.85, 14, 10),
            new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.85 })
          );
          blast.position.set(b.x, 0.65, b.z);
          gameGroup.add(blast);
          b.blast = blast;
          if (i === 0) playNote(140, 0.16);

          // 피격 판정
          if (now > g.invulnUntil && Math.hypot(b.x - px, b.z - pz) < b.radius + 0.18) {
            g.hp--;
            g.invulnUntil = now + 1300;
            player.vy = 6.2;
            player.triggerPoked();
            playNote(190, 0.26);
            player.say(g.hp > 0 ? `💥 앗 따거! (남은 ❤️ ${g.hp})` : '💥 윽... 탈락!!', 2.4);
            if (g.hp <= 0) {
              const survived = ((now - g.startAt) / 1000).toFixed(1);
              stopActiveGame(true);
              showToast(`💥 폭탄 생존전 종료! ${survived}초 동안 버텼습니다! 다시 도전해 보세요!`);
              broadcastGameChat(`💣 ${getProfile().name}님이 [폭탄 피하기 생존전]에서 ${survived}초 생존했습니다!`);
              return;
            }
          }
        }
      } else {
        const p = Math.min(1, (now - b.explodeAt) / 420);
        if (b.blast) {
          const sc = 0.8 + p * 0.55;
          b.blast.scale.setScalar(sc);
          b.blast.material.opacity = Math.max(0, 0.85 * (1 - p));
        }
        if (now >= b.cleanAt) {
          gameGroup.remove(b.ring, b.fill);
          if (b.blast) { gameGroup.remove(b.blast); b.blast.geometry.dispose(); b.blast.material.dispose(); }
          b.ring.geometry.dispose(); b.ring.material.dispose();
          b.fill.geometry.dispose(); b.fill.material.dispose();
          g.bombs.splice(i, 1);
        }
      }
    }

    if (remSec <= 0) {
      const heartsLeft = g.hp;
      stopActiveGame(true);
      player.say('👑 30초 폭탄 생존 성공!!', 4.5);
      showToast(`👑 대단해요! 폭탄 피하기 생존전 30초를 완주했습니다! (남은 ❤️ ${heartsLeft})`);
      broadcastGameChat(`💣👑 ${getProfile().name}님이 [폭탄 피하기 생존전] 30초 생존에 성공했습니다!`);
      if (triggerCelebration) triggerCelebration(`💣 ${getProfile().name}님 폭탄 피하기 30초 생존 성공!`);
      return;
    }

    const hearts = '❤️'.repeat(Math.max(0, g.hp)) + '🖤'.repeat(Math.max(0, 3 - g.hp));
    showHud({
      badge: `💣 폭탄 생존 · Wave ${g.wave}`,
      status: `${hearts} · 빨간 경고 원을 피하세요!`,
      detail: `생존까지 ${Math.ceil(remSec)}초`,
      tone: g.hp === 1 ? 'danger' : 'warn',
    });
  }

  // =========================================================================
  // 4. 🎲 파티 미니게임 (✊✌️✋ 가위바위보 · 🎲 전체 공유 주사위 · 🪜 사다리 타기)
  // =========================================================================
  let rpsStreak = 0;
  let rpsBestStreak = 0;

  document.querySelectorAll('[data-rps]').forEach((btn) => {
    btn.onclick = () => {
      const myPick = btn.dataset.rps;
      const keys = ['rock', 'scissors', 'paper'];
      const aiPick = keys[Math.floor(Math.random() * 3)];
      const opp = RPS_OPPONENTS[Math.floor(Math.random() * RPS_OPPONENTS.length)];

      let outcome = 'draw';
      if (
        (myPick === 'rock' && aiPick === 'scissors')
        || (myPick === 'scissors' && aiPick === 'paper')
        || (myPick === 'paper' && aiPick === 'rock')
      ) outcome = 'win';
      else if (myPick !== aiPick) outcome = 'lose';

      if (outcome === 'win') {
        rpsStreak++;
        if (rpsStreak > rpsBestStreak) rpsBestStreak = rpsStreak;
        playChime(rpsStreak >= 3);
        player.happyUntil = performance.now() + 1400;
        player.say(`${RPS_META[myPick].emoji} 승리! (${rpsStreak}연승!)`, 3.2);
      } else if (outcome === 'lose') {
        rpsStreak = 0;
        playNote(240, 0.16);
        player.say(`${RPS_META[myPick].emoji} 앗 졌다!`, 2.6);
      } else {
        playNote(520, 0.1);
        player.say(`${RPS_META[myPick].emoji} 비겼다!`, 2.4);
      }

      const resBox = $('rps-result');
      if (resBox) {
        const verdict = outcome === 'win' ? '🎉 승리!' : outcome === 'lose' ? '😅 패배!' : '🤝 무승부!';
        const line = outcome === 'win' ? opp.lose : outcome === 'lose' ? opp.win : opp.draw;
        resBox.innerHTML = `
          <div class="rps-vs">나 <b>${RPS_META[myPick].emoji} ${RPS_META[myPick].label}</b> vs ${opp.name} <b>${RPS_META[aiPick].emoji} ${RPS_META[aiPick].label}</b></div>
          <div class="rps-verdict ${outcome}">${verdict} · 현재 ${rpsStreak}연승 (최고 ${rpsBestStreak}연승)</div>
          <div class="rps-quote">${opp.name}: "${line}"</div>
        `;
      }
      if (rpsStreak === 3 && triggerCelebration) {
        triggerCelebration(`✊✌️✋ ${getProfile().name}님 가위바위보 3연승 달성!`);
      }
    };
  });

  // 🎲 전체 공유 주사위 굴리기
  function rollDice(maxVal) {
    const out = $('dice-result');
    let ticks = 0;
    const finalVal = 1 + Math.floor(Math.random() * maxVal);
    const timer = setInterval(() => {
      ticks++;
      const tmp = 1 + Math.floor(Math.random() * maxVal);
      if (out) out.textContent = `🎲 굴리는 중... 【 ${tmp} 】`;
      playNote(440 + ticks * 32, 0.05);
      if (ticks >= 10) {
        clearInterval(timer);
        if (out) out.textContent = `🎲 결과 (1~${maxVal}): 【 ${finalVal} 】`;
        playChime(finalVal === maxVal);
        player.say(`🎲 주사위 ${finalVal}!`, 3.6);
        broadcastGameChat(`🎲 ${getProfile().name}님이 1~${maxVal} 주사위를 굴려 【 ${finalVal} 】이(가) 나왔습니다!`);
      }
    }, 65);
  }
  if ($('btn-dice-6')) $('btn-dice-6').onclick = () => rollDice(6);
  if ($('btn-dice-100')) $('btn-dice-100').onclick = () => rollDice(100);

  // 🪜 미니 사다리 타기
  function runLadderGame() {
    const names = ($('ladder-names')?.value || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
    const prizes = ($('ladder-prizes')?.value || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6);
    if (names.length < 2) { showToast('참가자를 2명 이상 쉼표로 입력해 주세요!'); return; }
    while (prizes.length < names.length) prizes.push('통과 ✨');

    const canvas = $('ladder-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const n = names.length;
    const padX = 48, topY = 30, botY = H - 32;
    const stepX = n > 1 ? (W - padX * 2) / (n - 1) : 0;
    const colX = (i) => padX + i * stepX;

    // 무작위 가로다리 생성 (인접 충돌 방지)
    const rows = 7;
    const rungs = []; // { row, col } (connects col and col+1)
    for (let r = 0; r < rows; r++) {
      let lastCol = -2;
      for (let c = 0; c < n - 1; c++) {
        if (c > lastCol + 1 && Math.random() < 0.45) {
          rungs.push({ row: r, col: c });
          lastCol = c;
        }
      }
    }

    const rowY = (r) => topY + ((r + 1) / (rows + 1)) * (botY - topY);

    // 기본 사다리 그리기
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#C9B39B';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.moveTo(colX(i), topY); ctx.lineTo(colX(i), botY); ctx.stroke();
    }
    for (const rg of rungs) {
      const y = rowY(rg.row);
      ctx.beginPath(); ctx.moveTo(colX(rg.col), y); ctx.lineTo(colX(rg.col + 1), y); ctx.stroke();
    }

    const pathColors = ['#5B5CE6', '#EC4899', '#10B981', '#F59E0B', '#0EA5E9', '#8B5CF6'];
    const results = [];

    for (let start = 0; start < n; start++) {
      let cur = start;
      ctx.strokeStyle = pathColors[start % pathColors.length];
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(colX(cur) + (start - (n - 1) / 2) * 1.4, topY);
      for (let r = 0; r < rows; r++) {
        const y = rowY(r);
        const goRight = rungs.find((rg) => rg.row === r && rg.col === cur);
        const goLeft = rungs.find((rg) => rg.row === r && rg.col === cur - 1);
        ctx.lineTo(colX(cur) + (start - (n - 1) / 2) * 1.4, y);
        if (goRight) { cur++; ctx.lineTo(colX(cur) + (start - (n - 1) / 2) * 1.4, y); }
        else if (goLeft) { cur--; ctx.lineTo(colX(cur) + (start - (n - 1) / 2) * 1.4, y); }
      }
      ctx.lineTo(colX(cur) + (start - (n - 1) / 2) * 1.4, botY);
      ctx.stroke();
      results.push(`${names[start]} → ${prizes[cur]}`);
    }

    // 상단 참가자 / 하단 결과 라벨
    ctx.font = '800 12px "Pretendard", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = pathColors[i % pathColors.length];
      ctx.fillText(names[i].slice(0, 6), colX(i), 17);
      ctx.fillStyle = '#3B2F26';
      ctx.fillText(prizes[i].slice(0, 7), colX(i), H - 12);
    }

    if ($('ladder-result')) {
      $('ladder-result').textContent = `🪜 결과: ${results.join(' · ')}`;
    }
    playChime(true);
    broadcastGameChat(`🪜 [사다리 타기 결과] ${results.join(' / ')}`);
  }
  if ($('btn-ladder-go')) $('btn-ladder-go').onclick = runLadderGame;

  // 버튼 바인딩
  if ($('btn-start-mugunghwa')) $('btn-start-mugunghwa').onclick = startMugunghwa;
  if ($('btn-start-coinrush')) $('btn-start-coinrush').onclick = startCoinRush;
  if ($('btn-start-bombdodge')) $('btn-start-bombdodge').onclick = startBombDodge;

  function update(dt, elapsed) {
    if (!activeGame) return;
    const now = performance.now();
    if (activeGame.kind === 'mugunghwa') updateMugunghwa(dt, now);
    else if (activeGame.kind === 'coinrush') updateCoinRush(dt, elapsed, now);
    else if (activeGame.kind === 'bombdodge') updateBombDodge(dt, now);
  }

  return {
    startMugunghwa,
    startCoinRush,
    startBombDodge,
    stopActiveGame,
    update,
  };
}
