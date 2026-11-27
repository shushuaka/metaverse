// AI 오피스 서버. 내 컴퓨터 안에서만 열리고(127.0.0.1), 읽기만 한다. Node.js 말고 따로 설치할 것 없음.
//   public/            화면 파일
//   /characters/<그림> characters 폴더의 캐릭터 그림
//   /api/office        회사 이름, 직원 명단, 캐릭터 목록 (office.mjs)
//   /api/live          에이전트 실제 작업 상태 (live.mjs, 이름과 상태와 시각만)
// 실행: node server.mjs   (다른 포트: AIO_PORT=4400 node server.mjs)
import { createServer } from 'node:http';
import { readFile, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, sep } from 'node:path';
import { buildOffice, characterPath } from './office.mjs';
import { makeLive } from './live.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.AIO_PORT || process.env.PORT || 4326);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const HEAD = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

// 회사 정보는 몇 초마다 다시 읽는다 (설정 파일이나 그림을 바꾸고 새로고침하면 바로 보이게)
let office = null, officeAt = 0, officePending = null;
function getOffice() {
  if (office && Date.now() - officeAt < 2000) return Promise.resolve(office);
  if (!officePending) officePending = buildOffice(HERE).then((o) => { office = o; officeAt = Date.now(); officePending = null; return o; }, (e) => { officePending = null; throw e; });
  return officePending;
}
const getLive = makeLive(getOffice);

// 요청 경로를 public 안쪽 실제 파일 경로로 바꾼다. 바깥이면 null.
function safeResolvePath(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p.includes('\0')) return null;
  if (p.endsWith('/')) p += 'index.html';
  const full = resolve(ROOT, '.' + p);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

// 다른 사이트가 주소를 바꿔치기해 이 서버를 읽지 못하게: Host가 이 서버 주소가 아니면 거절
function hostOk(req) {
  const port = server.address() && server.address().port;
  const h = String(req.headers.host || '').toLowerCase();
  return h === `127.0.0.1:${port}` || h === `localhost:${port}`;
}

const json = (res, method, obj) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...HEAD });
  res.end(method === 'HEAD' ? undefined : JSON.stringify(obj));
};

const server = createServer(async (req, res) => {
  if (!hostOk(req)) { res.writeHead(403).end('forbidden'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
  const path = (req.url || '/').split('?')[0];
  try {
    if (path === '/api/office') {
      const o = await getOffice();
      const { agentIds, claudeFolder, ...pub } = o; // 화면에 필요한 것만
      return json(res, req.method, pub);
    }
    if (path === '/api/live') return json(res, req.method, await getLive());
  } catch {
    res.writeHead(500).end('error'); return;
  }
  let file = null;
  if (path.startsWith('/characters/')) file = characterPath(HERE, path);
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
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.log(`${PORT}번 포트를 이미 쓰고 있어요. 다른 번호로 열어 보세요: AIO_PORT=4400 node server.mjs`);
  else console.log('서버를 열지 못했어요:', e.message);
  process.exit(1);
});

server.listen(PORT, HOST, async () => {
  console.log(`AI 오피스가 열렸어요: http://localhost:${PORT}`);
  try {
    const o = await getOffice();
    console.log(`직원 ${o.teams.reduce((n, t) => n + t.members.length, 0)}명, 캐릭터 그림 ${o.characters.length}개${o.sample ? ' (에이전트를 못 찾아서 예시 직원으로 보여 드려요)' : ''}`);
    console.log(process.env.AIO_LIVE === '0' ? '실제 작업 연결: 꺼짐' : '실제 작업 연결: 켜짐 (에이전트 이름, 상태, 시각만 읽어요)');
  } catch { /* 첫 화면에서 다시 읽는다 */ }
  // 터미널에서 직접 켰으면 Ctrl + C, 뒤에서 켰으면(로그 파일로 나갈 때) AI에게 말로
  console.log(process.stdout.isTTY ? '끄려면 이 창에서 Ctrl + C' : "끄려면 Claude Code에 'AI 오피스 꺼 줘'라고 말해 주세요");
});
