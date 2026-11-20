// 먼작귀 AI 오피스 3D 메타버스 서버 (ZEP 스타일 멀티플레이어·캐릭터 커스터마이징·실시간 채팅 지원)
// 추가 패키지 설치 없이 Node.js 내장 모듈만으로 동작합니다.
// 실행: node server.mjs   (기본 포트: 4327, 변경: AIO_3D_PORT=4500 node server.mjs)
import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, sep } from 'node:path';
import { buildOffice, characterPath } from './office.mjs';
import { makeLive } from './live.mjs';

const HOST = process.env.AIO_3D_HOST || '0.0.0.0';
const PORT = Number(process.env.AIO_3D_PORT || process.env.PORT || 4327);
const HTTPS_PORT = Number(process.env.AIO_3D_HTTPS_PORT || (PORT + 1));
const HERE_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(HERE_DIR, 'data');
const STATE_FILE = resolve(DATA_DIR, 'space-state.json');
const PFX_FILE = resolve(HERE_DIR, 'certs', 'server.pfx');

function getLanAddresses() {
  const nets = networkInterfaces();
  const out = [];
  for (const list of Object.values(nets)) {
    for (const info of list || []) {
      if (info.family === 'IPv4' && !info.internal) out.push(info.address);
    }
  }
  return out;
}
const HERE = dirname(fileURLToPath(import.meta.url));
const OFFICE_ROOT = resolve(HERE, '..');
const ROOT = resolve(HERE, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const HEAD = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const MAX_BODY = 256 * 1024;
const NEARBY_RADIUS = 10.5;

// ---------- 오피스 설정 캐시 ----------
let office = null, officeAt = 0, officePending = null;
function getOffice() {
  if (office && Date.now() - officeAt < 2000) return Promise.resolve(office);
  if (!officePending) {
    officePending = buildOffice(OFFICE_ROOT).then(
      (o) => { office = o; officeAt = Date.now(); officePending = null; return o; },
      (e) => { officePending = null; throw e; }
    );
  }
  return officePending;
}
const getLive = makeLive(getOffice);

// ---------- 실시간 서울 날씨 캐시 (Open-Meteo 무료 API, 10분 캐시) ----------
let weatherCache = null, weatherAt = 0;
function mapWmoWeather(code) {
  if (code === 0 || code === 1) return { kind: 'clear', icon: '☀️', label: '맑음' };
  if (code === 2 || code === 3 || code === 45 || code === 48) return { kind: 'cloudy', icon: '⛅', label: code >= 45 ? '안개' : '흐림' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { kind: 'rain', icon: '🌧️', label: '비' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', icon: '❄️', label: '눈' };
  if (code >= 95) return { kind: 'storm', icon: '⛈️', label: '뇌우' };
  return { kind: 'clear', icon: '☀️', label: '맑음' };
}

async function getSeoulWeather() {
  if (weatherCache && Date.now() - weatherAt < 10 * 60 * 1000) return weatherCache;
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Asia%2FSeoul';
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) throw new Error('weather_http_' + resp.status);
    const data = await resp.json();
    const cur = data.current || {};
    const mapped = mapWmoWeather(Number(cur.weather_code ?? 0));
    weatherCache = {
      ok: true,
      city: '서울',
      temp: Math.round(Number(cur.temperature_2m ?? 15)),
      wind: Number(cur.wind_speed_10m ?? 0),
      isDay: cur.is_day !== 0,
      code: Number(cur.weather_code ?? 0),
      ...mapped,
      updatedAt: Date.now(),
    };
    weatherAt = Date.now();
    return weatherCache;
  } catch {
    return weatherCache || {
      ok: false,
      city: '서울',
      temp: null,
      wind: 0,
      isDay: true,
      code: 0,
      kind: 'clear',
      icon: '☀️',
      label: '맑음',
      updatedAt: Date.now(),
    };
  }
}

// ---------- 실시간 멀티플레이어 방 상태 & 영구 협업 데이터 ----------
const clients = new Map(); // id -> { res }
const players = new Map(); // id -> player state
const chatHistory = [];    // 최근 60개 채팅 기록
let sharedMode = 'work';
let msgSeq = 1;
let activeQuiz = null;

// 공유 화이트보드 & 방명록 포스트잇 & 커스텀 가구 (data/space-state.json 영구 저장)
let spaceState = { boardStrokes: [], notes: [], customProps: [] };
// ZEP 확장 공용 상태 (미디어 임베드 · 공유 타이머 · 실시간 투표 · 방 잠금)
let sharedEmbed = { url: '', title: '오피스 공유 스크린', by: '' };
let sharedTimer = { endsAt: 0, remainingMs: 0, running: false, label: '회의 타이머', by: '' };
let activePoll = null;
let roomLock = { locked: false, passcode: '' };
async function loadSpaceState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.boardStrokes)) spaceState.boardStrokes = parsed.boardStrokes.slice(-400);
    if (Array.isArray(parsed.notes)) spaceState.notes = parsed.notes.slice(-60);
    if (Array.isArray(parsed.customProps)) spaceState.customProps = parsed.customProps.slice(-120);
  } catch { /* 첫 실행 시 기본값 */ }
}
let saveTimer = null;
function scheduleSaveSpaceState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(STATE_FILE, JSON.stringify(spaceState), 'utf8');
    } catch { /* ignore */ }
  }, 400);
}
loadSpaceState();

function sendSSE(res, event, data) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch { /* ignore broken pipe */ }
}

function broadcast(event, data, exceptId = null) {
  for (const [cid, c] of clients) {
    if (exceptId && cid === exceptId) continue;
    sendSSE(c.res, event, data);
  }
}

function pushChat(entry, targetIds = null) {
  const msg = { seq: msgSeq++, time: Date.now(), ...entry };
  // 프라이빗·귓속말·근처 채팅은 공용 히스토리에 저장하지 않아 타 영역/신규 접속자에게 노출되지 않도록 격리
  if (entry.scope !== 'nearby' && entry.scope !== 'private' && entry.scope !== 'whisper') {
    chatHistory.push(msg);
    if (chatHistory.length > 60) chatHistory.shift();
  }
  if (targetIds) {
    for (const tid of targetIds) {
      const c = clients.get(tid);
      if (c) sendSSE(c.res, 'chat', msg);
    }
  } else {
    broadcast('chat', msg);
  }
  return msg;
}

// 연결 유지 하트비트
setInterval(() => {
  for (const [, c] of clients) {
    try { c.res.write(': ping\n\n'); } catch { /* ignore */ }
  }
}, 15000).unref();

// ---------- 헬퍼 ----------
function safeResolvePath(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p.includes('\0')) return null;
  if (p.endsWith('/')) p += 'index.html';
  const full = resolve(ROOT, '.' + p);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

function hostOk(req) {
  if (HOST !== '127.0.0.1') return true;
  const port = server.address() && server.address().port;
  const h = String(req.headers.host || '').toLowerCase();
  return h === `127.0.0.1:${port}` || h === `localhost:${port}`;
}

const json = (res, method, obj, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...HEAD });
  res.end(method === 'HEAD' ? undefined : JSON.stringify(obj));
};

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('bad_json'));
      }
    });
    req.on('error', reject);
  });
}

const cleanStr = (v, max = 30, fallback = '') =>
  typeof v === 'string' ? v.trim().slice(0, max) || fallback : fallback;

const cleanColor = (v) =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#F2C14E';

const cleanAvatarData = (v) =>
  typeof v === 'string' && v.length < 180000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : '';

const cleanChatImage = (v) =>
  typeof v === 'string' && v.length < 220000 && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v) ? v : '';

const cleanEmbedUrl = (v) => {
  if (typeof v !== 'string') return '';
  const s = v.trim().slice(0, 2000);
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch {
    return '';
  }
};

const cleanId = (v) =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{4,40}$/.test(v) ? v : '';

// ---------- HTTP + HTTPS 공용 요청 핸들러 ----------
let httpsReady = false;
async function handleRequest(req, res) {
  if (!hostOk(req)) { res.writeHead(403).end('forbidden'); return; }
  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const path = urlObj.pathname;

  // 1. SSE 실시간 스트림
  if (req.method === 'GET' && path === '/api/stream') {
    const id = cleanId(urlObj.searchParams.get('id'));
    if (!id) { res.writeHead(400).end('bad id'); return; }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    });
    res.write('retry: 2000\n\n');
    clients.set(id, { res });

    sendSSE(res, 'snapshot', {
      players: [...players.values()],
      chat: chatHistory,
      worldMode: sharedMode,
      boardStrokes: spaceState.boardStrokes,
      notes: spaceState.notes,
      customProps: spaceState.customProps,
      activeQuiz: activeQuiz && activeQuiz.endsAt > Date.now() ? activeQuiz : null,
      sharedEmbed,
      sharedTimer,
      activePoll,
      roomLocked: roomLock.locked,
    });

    req.on('close', () => {
      clients.delete(id);
      const left = players.get(id);
      if (left) {
        players.delete(id);
        broadcast('leave', { id, name: left.name });
        pushChat({ type: 'system', scope: 'all', text: `${left.name}님이 퇴장했습니다.` });
      }
    });
    return;
  }

  // 2. 멀티플레이어 POST 액션
  if (req.method === 'POST' && path.startsWith('/api/')) {
    let body;
    try { body = await readBody(req); } catch { return json(res, 'POST', { ok: false }, 400); }
    const id = cleanId(body.id);
    if (!id) return json(res, 'POST', { ok: false, error: 'invalid_id' }, 400);

    if (path === '/api/join') {
      const existed = players.has(id);
      if (!existed && roomLock.locked && roomLock.passcode) {
        const given = cleanStr(body.passcode, 24, '');
        if (given !== roomLock.passcode) {
          return json(res, 'POST', { ok: false, error: 'wrong_passcode', roomLocked: true }, 403);
        }
      }
      const prev = players.get(id) || {};
      const player = {
        id,
        name: cleanStr(body.name, 16, prev.name || '게스트'),
        status: cleanStr(body.status, 24, prev.status || ''),
        presence: ['online', 'study', 'class', 'mentoring', 'restroom', 'afk', 'dnd', 'work'].includes(body.presence) ? body.presence : (prev.presence || 'online'),
        handRaised: body.handRaised !== undefined ? !!body.handRaised : !!prev.handRaised,
        charName: cleanStr(body.charName, 30, prev.charName || '랏코'),
        customAvatar: body.customAvatar !== undefined ? cleanAvatarData(body.customAvatar) : (prev.customAvatar || ''),
        color: cleanColor(body.color || prev.color),
        x: Number.isFinite(body.x) ? body.x : (prev.x ?? -11.2),
        y: Number.isFinite(body.y) ? body.y : (prev.y ?? 0),
        z: Number.isFinite(body.z) ? body.z : (prev.z ?? -5.2),
        zone: cleanStr(body.zone, 20, prev.zone || '대표실'),
        privateZone: cleanStr(body.privateZone, 20, prev.privateZone || ''),
        onSpotlight: !!prev.onSpotlight,
        voiceOn: !!prev.voiceOn,
        videoOn: !!prev.videoOn,
        screenOn: !!prev.screenOn,
        moving: false,
      };
      players.set(id, player);
      broadcast(existed ? 'profile' : 'join', player, id);
      if (!existed) {
        pushChat({ type: 'system', scope: 'all', text: `✨ ${player.name}님이 오피스에 입장했습니다!` });
      }
      return json(res, 'POST', { ok: true, player });
    }

    if (path === '/api/move') {
      const p = players.get(id);
      if (!p) return json(res, 'POST', { ok: false }, 404);
      if (Number.isFinite(body.x)) p.x = Math.max(-48, Math.min(42, body.x));
      if (Number.isFinite(body.y)) p.y = Math.max(-1, Math.min(18, body.y));
      if (Number.isFinite(body.z)) p.z = Math.max(-58, Math.min(32, body.z));
      if (Number.isFinite(body.yaw)) p.yaw = body.yaw;
      p.moving = !!body.moving;
      p.sitting = !!body.sitting;
      p.onSpotlight = !!body.onSpotlight;
      if (typeof body.dance === 'string') {
        p.dance = ['bounce', 'spin', 'wave', 'star'].includes(body.dance) ? body.dance : '';
      }
      if (typeof body.zone === 'string') p.zone = cleanStr(body.zone, 20, p.zone);
      if (typeof body.privateZone === 'string') p.privateZone = cleanStr(body.privateZone, 20, '');
      broadcast('move', { id, x: p.x, y: p.y, z: p.z, yaw: p.yaw ?? 0, moving: p.moving, sitting: p.sitting, dance: p.dance || '', zone: p.zone, privateZone: p.privateZone || '', onSpotlight: p.onSpotlight }, id);
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/presence') {
      const p = players.get(id);
      if (!p) return json(res, 'POST', { ok: false }, 404);
      if (['online', 'study', 'class', 'mentoring', 'restroom', 'afk', 'dnd', 'work'].includes(body.presence)) p.presence = body.presence;
      if (body.handRaised !== undefined) p.handRaised = !!body.handRaised;
      if (typeof body.status === 'string') p.status = cleanStr(body.status, 24, '');
      broadcast('presence', { id, name: p.name, presence: p.presence, handRaised: p.handRaised, status: p.status });
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/voice') {
      const p = players.get(id);
      const wasScreen = !!p?.screenOn;
      if (p) {
        if (body.voiceOn !== undefined) p.voiceOn = !!body.voiceOn;
        if (body.videoOn !== undefined) p.videoOn = !!body.videoOn;
        if (body.screenOn !== undefined) p.screenOn = !!body.screenOn;
      }
      broadcast('voice', {
        id,
        voiceOn: !!p?.voiceOn,
        videoOn: !!p?.videoOn,
        screenOn: !!p?.screenOn,
        name: p?.name || '',
      });
      if (p && !wasScreen && p.screenOn) {
        const zoneNote = p.privateZone ? ` (${p.zone} 프라이빗)` : '';
        pushChat({ type: 'system', scope: p.privateZone ? 'private' : 'all', privateZone: p.privateZone || '', privateZoneName: p.zone || '', text: `🖥️ ${p.name}님이 실시간 화면 공유를 시작했습니다${zoneNote}!` },
          p.privateZone
            ? [...players.values()].filter((o) => o.id === id || o.privateZone === p.privateZone).map((o) => o.id)
            : null);
      }
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/signal') {
      const toId = cleanId(body.toId);
      const target = toId ? clients.get(toId) : null;
      if (target && body.signal && typeof body.signal === 'object') {
        sendSSE(target.res, 'signal', { fromId: id, signal: body.signal });
      }
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/poke') {
      const from = players.get(id);
      const targetId = cleanId(body.targetId);
      const target = targetId ? players.get(targetId) : null;
      broadcast('poke', {
        fromId: id,
        fromName: from?.name || '누군가',
        targetId: targetId || '',
        targetName: target?.name || '',
      });
      if (from && target) {
        pushChat({ type: 'system', scope: 'all', text: `👉 ${from.name}님이 ${target.name}님을 콕 찔렀어요!` });
      }
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/chat') {
      const p = players.get(id);
      const text = cleanStr(body.text, 220);
      const image = cleanChatImage(body.image);
      if (!text && !image) return json(res, 'POST', { ok: false }, 400);
      const allowedScopes = ['all', 'nearby', 'private', 'whisper', 'spotlight'];
      const scope = allowedScopes.includes(body.scope) ? body.scope : 'all';
      const senderName = p ? p.name : cleanStr(body.name, 16, '게스트');
      const senderColor = p ? p.color : '#F2C14E';
      const senderChar = p ? p.charName : '';
      const senderCustom = p ? p.customAvatar : '';
      const sx = p ? p.x : (Number.isFinite(body.x) ? body.x : 0);
      const sz = p ? p.z : (Number.isFinite(body.z) ? body.z : 0);
      const pZone = cleanStr(body.privateZone, 20, '') || p?.privateZone || '';
      const pZoneName = cleanStr(body.privateZoneName, 24, p?.zone || '');
      if (p && pZone && p.privateZone !== pZone) p.privateZone = pZone;

      let targetIds = null;
      let targetName = '';

      if (scope === 'nearby') {
        targetIds = [];
        for (const [pid, other] of players) {
          if (pid === id || Math.hypot(other.x - sx, other.z - sz) <= NEARBY_RADIUS) {
            targetIds.push(pid);
          }
        }
      } else if (scope === 'private') {
        if (!pZone) return json(res, 'POST', { ok: false, error: 'not_in_private_zone' }, 400);
        targetIds = [];
        for (const [pid, other] of players) {
          if (pid === id || other.privateZone === pZone) targetIds.push(pid);
        }
      } else if (scope === 'whisper') {
        const wantName = cleanStr(body.targetName, 16, '');
        const wantId = cleanId(body.targetId);
        let found = wantId ? players.get(wantId) : null;
        if (!found && wantName) {
          for (const other of players.values()) {
            if (other.id !== id && other.name.toLowerCase() === wantName.toLowerCase()) { found = other; break; }
          }
        }
        if (!found) return json(res, 'POST', { ok: false, error: 'target_not_found' }, 404);
        targetIds = [id, found.id];
        targetName = found.name;
      }

      const msg = pushChat({
        type: 'user',
        senderId: id,
        name: senderName,
        color: senderColor,
        charName: senderChar,
        customAvatar: senderCustom,
        scope,
        privateZone: scope === 'private' ? pZone : '',
        privateZoneName: scope === 'private' ? pZoneName : '',
        targetName,
        text,
        image,
      }, targetIds);

      if (scope === 'spotlight') {
        broadcast('spotlight', { name: senderName, color: senderColor, text: text || '🖼️ 이미지를 공유했습니다', time: Date.now() });
      }
      return json(res, 'POST', { ok: true, msg });
    }

    if (path === '/api/dm') {
      const p = players.get(id);
      const text = cleanStr(body.text, 240);
      const image = cleanChatImage(body.image);
      if (!text && !image) return json(res, 'POST', { ok: false, error: 'empty' }, 400);
      const wantId = cleanId(body.targetId);
      const wantName = cleanStr(body.targetName, 16, '');
      let target = wantId ? players.get(wantId) : null;
      if (!target && wantName) {
        for (const other of players.values()) {
          if (other.id !== id && other.name.toLowerCase() === wantName.toLowerCase()) { target = other; break; }
        }
      }
      if (!target || target.id === id) return json(res, 'POST', { ok: false, error: 'target_not_found' }, 404);

      const dm = {
        id: `dm_${msgSeq++}`,
        time: Date.now(),
        fromId: id,
        fromName: p ? p.name : cleanStr(body.name, 16, '게스트'),
        fromColor: p ? p.color : '#F2C14E',
        fromChar: p ? p.charName : '',
        fromAvatar: p ? p.customAvatar : '',
        toId: target.id,
        toName: target.name,
        toColor: target.color || '#58B98A',
        toChar: target.charName || '',
        toAvatar: target.customAvatar || '',
        text,
        image,
      };
      const targetClient = clients.get(target.id);
      if (targetClient) sendSSE(targetClient.res, 'dm', dm);
      return json(res, 'POST', { ok: true, dm });
    }

    // ---- ZEP 확장 협업 API: 미디어 임베드 / 공유 타이머 / 실시간 투표 / 호스트 제어 ----
    if (path === '/api/embed') {
      const p = players.get(id);
      const url = cleanEmbedUrl(body.url);
      const title = cleanStr(body.title, 40, url ? '공유 미디어' : '오피스 공유 스크린');
      sharedEmbed = { url, title, by: p?.name || '대표', updatedAt: Date.now() };
      broadcast('embed', sharedEmbed, id);
      if (url) {
        pushChat({ type: 'system', scope: 'all', text: `📺 ${sharedEmbed.by}님이 "${title}" 화면을 공유했습니다: ${url}` });
      }
      return json(res, 'POST', { ok: true, embed: sharedEmbed });
    }

    if (path === '/api/timer') {
      const p = players.get(id);
      const action = body.action;
      const by = p?.name || '대표';
      if (action === 'start') {
        const secs = Math.max(10, Math.min(3600, Math.round(Number(body.seconds) || 300)));
        const label = cleanStr(body.label, 24, '회의 타이머');
        sharedTimer = { endsAt: Date.now() + secs * 1000, remainingMs: secs * 1000, running: true, label, by };
        pushChat({ type: 'system', scope: 'all', text: `⏱️ ${by}님이 "${label}" (${Math.floor(secs / 60)}분 ${secs % 60 ? (secs % 60) + '초' : ''}) 타이머를 시작했습니다.` });
      } else if (action === 'pause') {
        const rem = sharedTimer.running ? Math.max(0, sharedTimer.endsAt - Date.now()) : sharedTimer.remainingMs;
        sharedTimer = { ...sharedTimer, running: false, remainingMs: rem, endsAt: 0, by };
      } else if (action === 'resume') {
        const rem = Math.max(0, sharedTimer.remainingMs || 0);
        if (rem > 0) sharedTimer = { ...sharedTimer, running: true, endsAt: Date.now() + rem, by };
      } else {
        sharedTimer = { endsAt: 0, remainingMs: 0, running: false, label: '회의 타이머', by };
      }
      broadcast('timer', sharedTimer);
      return json(res, 'POST', { ok: true, timer: sharedTimer });
    }

    if (path === '/api/poll') {
      const p = players.get(id);
      if (body.action === 'close') {
        if (activePoll) {
          activePoll.closed = true;
          broadcast('poll', activePoll);
          pushChat({ type: 'system', scope: 'all', text: `🗳️ "${activePoll.question}" 투표가 마감되었습니다.` });
        }
        return json(res, 'POST', { ok: true, poll: activePoll });
      }
      if (body.action === 'clear') {
        activePoll = null;
        broadcast('poll', null);
        return json(res, 'POST', { ok: true });
      }
      const question = cleanStr(body.question, 80);
      const options = Array.isArray(body.options)
        ? body.options.map((o) => cleanStr(o, 36)).filter(Boolean).slice(0, 5)
        : [];
      if (!question || options.length < 2) return json(res, 'POST', { ok: false, error: 'invalid_poll' }, 400);
      activePoll = {
        id: `poll_${Date.now().toString(36)}`,
        question,
        options,
        votes: {},
        by: p?.name || '대표',
        createdAt: Date.now(),
        closed: false,
      };
      broadcast('poll', activePoll);
      pushChat({ type: 'system', scope: 'all', text: `🗳️ ${activePoll.by}님이 실시간 투표를 시작했습니다: "${question}"` });
      return json(res, 'POST', { ok: true, poll: activePoll });
    }

    if (path === '/api/poll/vote') {
      if (!activePoll || activePoll.closed) return json(res, 'POST', { ok: false }, 400);
      const idx = Number(body.optionIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx >= activePoll.options.length) {
        return json(res, 'POST', { ok: false }, 400);
      }
      activePoll.votes[id] = idx;
      broadcast('poll', activePoll);
      return json(res, 'POST', { ok: true, poll: activePoll });
    }

    if (path === '/api/host') {
      const p = players.get(id);
      const by = p?.name || '대표';
      if (body.action === 'gather') {
        const gx = Number.isFinite(body.x) ? body.x : (p?.x ?? -11.2);
        const gy = Number.isFinite(body.y) ? body.y : (p?.y ?? 0);
        const gz = Number.isFinite(body.z) ? body.z : (p?.z ?? -5.2);
        broadcast('host_gather', { by, byId: id, x: gx, y: gy, z: gz });
        pushChat({ type: 'system', scope: 'all', text: `📢 ${by}님이 전원을 현재 위치로 소집했습니다!` });
        return json(res, 'POST', { ok: true });
      }
      if (body.action === 'mute_all') {
        broadcast('host_mute', { by, byId: id });
        pushChat({ type: 'system', scope: 'all', text: `🔇 ${by}님이 전체 마이크 음소거를 요청했습니다.` });
        return json(res, 'POST', { ok: true });
      }
      if (body.action === 'lock') {
        const locked = !!body.locked;
        const passcode = locked ? cleanStr(body.passcode, 20, '') : '';
        roomLock = { locked: locked && !!passcode, passcode };
        broadcast('room_lock', { locked: roomLock.locked, by });
        pushChat({ type: 'system', scope: 'all', text: roomLock.locked ? `🔐 ${by}님이 입장 비밀번호 잠금을 켰습니다.` : `🔓 ${by}님이 입장 비밀번호 잠금을 해제했습니다.` });
        return json(res, 'POST', { ok: true, locked: roomLock.locked });
      }
      return json(res, 'POST', { ok: false }, 400);
    }

    if (path === '/api/emote') {
      const p = players.get(id);
      const emoji = cleanStr(body.emoji, 8, '✨');
      const label = cleanStr(body.label, 16, '');
      broadcast('emote', { id, name: p?.name || '', emoji, label });
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/mode') {
      const p = players.get(id);
      const mode = ['work', 'meeting', 'show'].includes(body.mode) ? body.mode : 'work';
      sharedMode = mode;
      broadcast('mode', { mode, by: p?.name || '대표' });
      const labels = {
        meeting: `📢 ${p?.name || '대표'}님이 전 직원 회의를 소집했습니다!`,
        show: `🎵 ${p?.name || '대표'}님이 야외 숲속 공연을 시작했습니다!`,
        work: `💼 ${p?.name || '대표'}님이 일상 근무 모드로 전환했습니다.`,
      };
      pushChat({ type: 'system', scope: 'all', text: labels[mode] });
      return json(res, 'POST', { ok: true, mode });
    }

    // ---- 2단계 협업 & 미니게임 API ----
    if (path === '/api/board/stroke') {
      const st = body.stroke;
      if (!st || !Array.isArray(st.points) || st.points.length < 2) return json(res, 'POST', { ok: false }, 400);
      const cleanStroke = {
        color: cleanColor(st.color),
        size: Math.max(1, Math.min(28, Number(st.size) || 4)),
        points: st.points.slice(0, 160).map((pt) => [Math.round(Number(pt[0]) || 0), Math.round(Number(pt[1]) || 0)]),
      };
      spaceState.boardStrokes.push(cleanStroke);
      if (spaceState.boardStrokes.length > 400) spaceState.boardStrokes.shift();
      scheduleSaveSpaceState();
      broadcast('board_stroke', cleanStroke, id);
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/board/clear') {
      spaceState.boardStrokes = [];
      scheduleSaveSpaceState();
      broadcast('board_clear', { by: players.get(id)?.name || '' }, id);
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/notes/add') {
      const text = cleanStr(body.text, 100);
      if (!text) return json(res, 'POST', { ok: false }, 400);
      const author = cleanStr(body.author, 16, players.get(id)?.name || '방문자');
      const note = {
        id: 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        author,
        text,
        color: cleanColor(body.color || '#FFF3B0'),
        time: Date.now(),
      };
      spaceState.notes.push(note);
      if (spaceState.notes.length > 60) spaceState.notes.shift();
      scheduleSaveSpaceState();
      broadcast('notes_update', spaceState.notes);
      pushChat({ type: 'system', scope: 'all', text: `📌 ${author}님이 방명록 포스트잇을 남겼어요!` });
      return json(res, 'POST', { ok: true, note });
    }

    if (path === '/api/notes/delete') {
      const nid = cleanId(body.noteId);
      spaceState.notes = spaceState.notes.filter((n) => n.id !== nid);
      scheduleSaveSpaceState();
      broadcast('notes_update', spaceState.notes);
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/quiz/start') {
      const q = cleanStr(body.question, 90);
      if (!q) return json(res, 'POST', { ok: false }, 400);
      const a = body.answer === 'X' ? 'X' : 'O';
      const dur = Math.max(5, Math.min(30, Number(body.duration) || 10));
      const hostName = players.get(id)?.name || '대표';
      activeQuiz = { question: q, answer: a, host: hostName, endsAt: Date.now() + dur * 1000 };
      broadcast('quiz_start', activeQuiz);
      pushChat({ type: 'system', scope: 'all', text: `⭕❌ [OX 퀴즈 시작!] ${q} (${dur}초 안에 동쪽 OX 광장으로 이동하세요!)` });
      return json(res, 'POST', { ok: true, quiz: activeQuiz });
    }

    if (path === '/api/wheel/spin') {
      const items = Array.isArray(body.items) ? body.items.map((x) => cleanStr(x, 20)).filter(Boolean).slice(0, 10) : [];
      if (items.length < 2) return json(res, 'POST', { ok: false }, 400);
      const winnerIndex = Math.floor(Math.random() * items.length);
      const by = players.get(id)?.name || '대표';
      const payload = { items, winnerIndex, by };
      broadcast('wheel_spin', payload);
      setTimeout(() => {
        pushChat({ type: 'system', scope: 'all', text: `🎡 돌림판 당첨: 【 ${items[winnerIndex]} 】` });
      }, 3300);
      return json(res, 'POST', { ok: true, ...payload });
    }

    // ---- 4단계 맵 꾸미기 API (영구 저장 & 실시간 동기화) ----
    if (path === '/api/props/add') {
      const pr = body.prop;
      const validTypes = ['plant', 'sofa', 'table', 'lamp', 'cushion', 'stool', 'neon', 'sign'];
      if (!pr || !validTypes.includes(pr.type)) return json(res, 'POST', { ok: false }, 400);
      const item = {
        id: 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type: pr.type,
        x: Math.max(-44, Math.min(36, Number(pr.x) || 0)),
        y: Math.max(0, Math.min(14, Number(pr.y) || 0)),
        z: Math.max(-54, Math.min(26, Number(pr.z) || 0)),
        rot: Number.isFinite(pr.rot) ? pr.rot : 0,
        label: cleanStr(pr.label, 18, ''),
      };
      spaceState.customProps.push(item);
      if (spaceState.customProps.length > 120) spaceState.customProps.shift();
      scheduleSaveSpaceState();
      broadcast('prop_add', item);
      return json(res, 'POST', { ok: true, prop: item });
    }

    if (path === '/api/props/delete') {
      const pid = cleanId(body.propId);
      spaceState.customProps = spaceState.customProps.filter((p) => p.id !== pid);
      scheduleSaveSpaceState();
      broadcast('prop_delete', { propId: pid });
      return json(res, 'POST', { ok: true });
    }

    if (path === '/api/props/clear') {
      spaceState.customProps = [];
      scheduleSaveSpaceState();
      broadcast('props_clear', { by: players.get(id)?.name || '' });
      return json(res, 'POST', { ok: true });
    }

    return json(res, 'POST', { ok: false }, 404);
  }

  // 3. 기존 GET/HEAD 처리
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST' }).end();
    return;
  }

  try {
    if (path === '/api/office') {
      const o = await getOffice();
      const { agentIds, claudeFolder, ...pub } = o;
      return json(res, req.method, pub);
    }
    if (path === '/api/network') {
      const ips = getLanAddresses();
      const lans = ips.map((ip) => `http://${ip}:${PORT}`);
      const httpsLans = httpsReady ? ips.map((ip) => `https://${ip}:${HTTPS_PORT}`) : [];
      return json(res, req.method, {
        host: HOST,
        port: PORT,
        httpsPort: httpsReady ? HTTPS_PORT : null,
        localUrl: `http://localhost:${PORT}`,
        httpsLocalUrl: httpsReady ? `https://localhost:${HTTPS_PORT}` : null,
        lanUrls: lans,
        httpsLanUrls: httpsLans,
      });
    }
    if (path === '/api/room/status') return json(res, req.method, { locked: roomLock.locked });
    if (path === '/api/weather') return json(res, req.method, await getSeoulWeather());
    if (path === '/api/live') return json(res, req.method, await getLive());
  } catch {
    res.writeHead(500).end('error'); return;
  }

  let file = null;
  if (path.startsWith('/characters/')) file = characterPath(OFFICE_ROOT, path);
  else file = safeResolvePath(path);
  if (!file) { res.writeHead(400).end('bad path'); return; }

  try {
    const s = await lstat(file);
    if (!s.isFile()) throw new Error('not file');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', ...HEAD });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404).end('not found');
  }
}

const server = createServer(handleRequest);

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.log(`${PORT}번 포트를 이미 쓰고 있어요. AIO_3D_PORT=4500 node server.mjs 로 열어 보세요.`);
  else console.log('서버를 열지 못했어요:', e.message);
  process.exit(1);
});

server.listen(PORT, HOST, async () => {
  console.log(`먼작귀 AI 오피스 2.5D 메타버스가 열렸어요: http://localhost:${PORT}`);
  const lans = getLanAddresses();
  if (lans.length) console.log(`같은 Wi-Fi 접속 주소(HTTP): ${lans.map((ip) => `http://${ip}:${PORT}`).join(', ')}`);
  try {
    const o = await getOffice();
    console.log(`연동 회사: ${o.company} | 직원 ${o.teams.reduce((n, t) => n + t.members.length, 0)}명 | 캐릭터 ${o.characters.length}개 | ZEP 멀티플레이어·채팅 활성화`);
  } catch { /* ignore */ }
});

// 로컬 HTTPS 서버 동시 실행 (크롬·모바일에서 캠·마이크 바로 사용 가능!)
if (existsSync(PFX_FILE)) {
  try {
    const pfx = readFileSync(PFX_FILE);
    const httpsServer = createHttpsServer({ pfx, passphrase: 'metaverse' }, handleRequest);
    httpsServer.on('error', (e) => console.log('HTTPS 서버 알림:', e.message));
    httpsServer.listen(HTTPS_PORT, HOST, () => {
      httpsReady = true;
      const lans = getLanAddresses();
      console.log(`🔒 HTTPS 보안 서버 (크롬/모바일 캠·마이크 지원): https://localhost:${HTTPS_PORT}`);
      if (lans.length) console.log(`🔒 같은 Wi-Fi 캠·마이크 접속 주소: ${lans.map((ip) => `https://${ip}:${HTTPS_PORT}`).join(', ')}`);
    });
  } catch (e) {
    console.log('HTTPS 인증서 로드 실패:', e.message);
  }
}
