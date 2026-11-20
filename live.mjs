// 실제 작업 기록: Claude Code가 이 컴퓨터에 남기는 기록 폴더에서 "어떤 에이전트가 지금 일하나, 언제 끝났나"만 뽑는다.
// 읽는 것 (허용 목록, 이 밖은 열지 않는다):
//   PROJ/<세션 uuid>/subagents/agent-<hex>.meta.json  -> 내용을 읽되 agentType, finished만 쓴다
//   PROJ/<세션 uuid>/subagents/agent-<hex>.jsonl      -> 시각만 본다(stat). 대화 내용은 열지 않는다
// PROJ = ~/.claude/projects/<작업 폴더 이름> (설정 claudeFolder). 비워 두면 ~/.claude/projects 아래 폴더 전부.
// 화면에 넘기는 것: 에이전트 이름(직원 명단에 있는 것만), 상태, 시작/마지막/끝 시각, 익명 실행 id. 대화 본문과 프롬프트는 넘기지 않는다.
import { readdir, lstat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { claudeHome, expandHome, projectSlug } from './office.mjs';

const SESSION_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const META_RE = /^agent-[0-9a-f]{6,40}\.meta\.json$/;
const LOOKBACK_MS = 36 * 3600e3; // 이보다 오래 손대지 않은 세션 폴더는 보지 않는다
const STALE_MS = 20 * 60e3;      // 끝 표시 없이 이만큼 기록이 멈췄으면 일하는 중으로 보지 않는다 (중간에 끊긴 실행)
const META_MAX = 8 * 1024;
const CACHE_MS = 4000;

// 읽을 기록 폴더 목록
async function projectDirs(env, claudeFolder) {
  if (env.AIO_CLAUDE_PROJECT_DIR) return [resolve(env.AIO_CLAUDE_PROJECT_DIR)];
  const base = join(claudeHome(env), 'projects');
  if (claudeFolder) return [join(base, projectSlug(expandHome(claudeFolder)))];
  try {
    const ds = await readdir(base, { withFileTypes: true });
    return ds.filter((d) => d.isDirectory()).map((d) => join(base, d.name));
  } catch { return []; }
}

const inside = (root, p) => p.startsWith(root + sep);

async function scanProject(proj, agents, now, runs) {
  let sessions;
  try { sessions = await readdir(proj, { withFileTypes: true }); } catch { return false; }
  for (const d of sessions) {
    if (!d.isDirectory() || !SESSION_RE.test(d.name)) continue;
    const sub = join(proj, d.name, 'subagents');
    let st;
    try { st = await lstat(sub); } catch { continue; }
    if (!st.isDirectory() || now - st.mtimeMs > LOOKBACK_MS) continue;
    let files;
    try { files = await readdir(sub); } catch { continue; }
    for (const f of files) {
      if (!META_RE.test(f)) continue;
      const metaPath = join(sub, f), logPath = join(sub, f.replace(/\.meta\.json$/, '.jsonl'));
      if (!inside(proj, metaPath)) continue;
      try {
        const ms = await lstat(metaPath);
        if (!ms.isFile() || ms.size > META_MAX) continue;
        const meta = JSON.parse(await readFile(metaPath, 'utf8'));
        const agent = typeof meta.agentType === 'string' ? meta.agentType : '';
        if (!agents.has(agent)) continue;
        let ls = null;
        try { ls = await lstat(logPath); if (!ls.isFile()) ls = null; } catch { ls = null; }
        const startedAt = Math.round(ls ? Math.min(ls.birthtimeMs || ls.mtimeMs, ms.birthtimeMs || ms.mtimeMs) : (ms.birthtimeMs || ms.mtimeMs));
        const lastAt = Math.round(Math.max(ls ? ls.mtimeMs : 0, ms.mtimeMs));
        if (now - lastAt > LOOKBACK_MS) continue;
        const finished = meta.finished === true;
        const state = finished ? 'done' : (now - lastAt > STALE_MS ? 'stale' : 'working');
        const run = { id: createHash('sha256').update(proj + '/' + d.name + '/' + f).digest('hex').slice(0, 12), agent, state, startedAt, lastAt };
        if (finished) run.finishedAt = lastAt;
        runs.push(run);
      } catch { /* 쓰는 중이라 깨진 파일은 건너뛴다 */ }
    }
  }
  return true;
}

async function scan(env, office, now) {
  if (!office.agentIds.length) return { ok: false, reason: 'no-agents' };
  const dirs = await projectDirs(env, office.claudeFolder);
  const agents = new Set(office.agentIds);
  const runs = [];
  let any = false;
  for (const p of dirs) any = (await scanProject(p, agents, now, runs)) || any;
  if (!any) return { ok: false, reason: 'no-source' };
  runs.sort((a, b) => b.lastAt - a.lastAt);
  const day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  const today = runs.filter((r) => r.state === 'done' && r.finishedAt >= day0.getTime());
  return { ok: true, now, runs: runs.filter((r) => r.state === 'working').concat(today.slice(0, 50)), today: { done: today.length } };
}

// getOffice: 지금 회사 정보(직원 명단)를 돌려주는 함수
export function makeLive(getOffice, env = process.env) {
  let cache = null, at = 0, pending = null;
  return async function getLive() {
    if (env.AIO_LIVE === '0') return { ok: false, reason: 'off' };
    const now = Date.now();
    if (cache && now - at < CACHE_MS) return cache;
    if (!pending) pending = getOffice().then((o) => scan(env, o, now)).then((r) => { cache = r; at = Date.now(); pending = null; return r; }, () => { pending = null; return { ok: false, reason: 'error' }; });
    return pending;
  };
}
