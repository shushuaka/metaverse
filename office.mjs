// 회사 설정 읽기: office.config.json + Claude Code 에이전트 목록 + characters 폴더 그림 목록.
// 읽는 것 (이 밖은 열지 않는다):
//   이 폴더의 office.config.json
//   에이전트 정의 폴더(~/.claude/agents, 설정한 작업 폴더의 .claude/agents)의 *.md 파일 맨 위 머리말에서 name: 한 줄만
//   이 폴더의 characters/*.png (이름과 그림 크기만 읽고, 그림 파일은 /characters/ 주소로 그대로 내준다)
import { readFile, readdir, lstat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const POSES = ['happy', 'sad', 'walk', 'rest'];
export const MAX_W = 100, MAX_H = 200;         // 캐릭터 그림 최대 크기 (1px = 도트 1칸, 2.5배 장신 캐릭터 허용)
const NAME_RE = /^[\p{L}\p{N}-]{1,30}$/u;      // 캐릭터 이름: 글자, 숫자, - (밑줄은 포즈 구분용)
const FILE_RE = /^([\p{L}\p{N}-]{1,30})(?:_(happy|sad|walk|rest))?\.png$/u;
const AGENT_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const RESERVED = new Set(['ceo', 'assistant']);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_PNG = 512 * 1024, MAX_MD = 64 * 1024, MAX_CFG = 64 * 1024;

export const claudeHome = (env = process.env) => resolve(env.AIO_CLAUDE_HOME || join(homedir(), '.claude'));
export function expandHome(p) { return typeof p === 'string' && p.startsWith('~') ? join(homedir(), p.slice(1)) : p; }
// Claude Code가 작업 폴더마다 기록을 남기는 폴더 이름 (경로의 글자, 숫자가 아닌 것을 '-'로)
export const projectSlug = (dir) => resolve(dir).replace(/[^A-Za-z0-9]/g, '-');

export async function readConfig(root) {
  const notices = [];
  let cfg = {};
  try {
    const st = await lstat(join(root, 'office.config.json'));
    if (st.isFile() && st.size <= MAX_CFG) cfg = JSON.parse(await readFile(join(root, 'office.config.json'), 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') notices.push('office.config.json을 읽지 못했어요. 쉼표나 따옴표가 빠지지 않았는지 확인해 주세요. 지금은 기본값으로 보여 드려요.');
    cfg = {};
  }
  const str = (v, d, n = 30) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : d);
  return {
    notices,
    company: str(cfg.company, '나의 AI 회사'),
    boss: str(cfg.boss, '대표', 12),
    assistant: str(cfg.assistant, '비서', 12),
    claudeFolder: typeof cfg.claudeFolder === 'string' ? cfg.claudeFolder.trim() : '',
    bossCharacter: str(cfg.bossCharacter, ''),
    assistantCharacter: str(cfg.assistantCharacter, ''),
    teams: Array.isArray(cfg.teams) ? cfg.teams : [],
  };
}

// 에이전트 정의 파일에서 name만 꺼낸다 (내용은 쓰지 않는다)
export async function scanAgents(dirs) {
  const ids = new Set();
  for (const dir of dirs) {
    let files;
    try { files = await readdir(dir); } catch { continue; }
    for (const f of files) {
      if (!/^[\w.-]+\.md$/.test(f)) continue;
      try {
        const p = join(dir, f), st = await lstat(p);
        if (!st.isFile() || st.size > MAX_MD) continue;
        const head = (await readFile(p, 'utf8')).split('\n').slice(0, 40);
        if (head[0].trim() !== '---') continue;
        for (const line of head.slice(1)) {
          if (line.trim() === '---') break;
          const m = /^name:\s*["']?([^"'\s]+)["']?\s*$/.exec(line);
          if (m && AGENT_RE.test(m[1]) && !RESERVED.has(m[1])) { ids.add(m[1]); break; }
        }
      } catch { /* 못 읽는 파일은 건너뛴다 */ }
    }
  }
  return [...ids].sort();
}

// characters 폴더: 그림 이름과 크기만 (PNG 머리에서 가로세로를 읽는다)
export async function listCharacters(dir) {
  const notices = [], chars = new Map();
  let files = [];
  try { files = await readdir(dir); } catch { return { chars: [], notices }; }
  for (const f of files.sort()) {
    if (!f.toLowerCase().endsWith('.png')) continue;
    const m = FILE_RE.exec(f.normalize('NFC'));
    if (!m) { notices.push(`"${f}" 이름은 쓸 수 없어요. 글자와 숫자로만 짓고, 포즈는 _happy, _sad, _walk, _rest만 붙여 주세요.`); continue; }
    try {
      const st = await lstat(join(dir, f));
      if (!st.isFile()) { notices.push(`"${f}"는 그림 파일이 아니에요(바로가기나 폴더는 못 써요).`); continue; }
      if (st.size > MAX_PNG) { notices.push(`"${f}"는 파일이 너무 커요(512KB까지).`); continue; }
      const buf = await readFile(join(dir, f));
      if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) { notices.push(`"${f}"는 PNG 그림이 아니에요.`); continue; }
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      if (w > MAX_W || h > MAX_H) { notices.push(`"${f}"가 너무 커요(${w}x${h}). 가로 ${MAX_W}, 세로 ${MAX_H}칸 안으로 줄여 주세요. 도트 캐릭터 스킬로 만들면 맞춰져요.`); continue; }
      const [, name, pose] = m;
      const c = chars.get(name) || { name, files: {} };
      c.files[pose || 'front'] = { file: f, w, h };
      chars.set(name, c);
    } catch { /* 건너뛴다 */ }
  }
  const out = [];
  for (const c of chars.values()) {
    if (!c.files.front) { notices.push(`"${c.name}"는 앞모습 그림(${c.name}.png)이 없어서 빠졌어요.`); continue; }
    out.push({ name: c.name, poses: Object.fromEntries(Object.entries(c.files).map(([k, v]) => [k, `characters/${encodeURIComponent(v.file)}`])) });
  }
  return { chars: out, notices };
}

// 화면에 넘길 회사 정보. 팀을 설정하지 않았으면 찾은 에이전트를 4명씩 묶어 팀을 만든다. 에이전트도 없으면 예시 직원
export async function buildOffice(root, env = process.env) {
  const cfg = await readConfig(root);
  const home = claudeHome(env);
  const agentDirs = [join(home, 'agents')];
  if (cfg.claudeFolder) agentDirs.push(join(resolve(expandHome(cfg.claudeFolder)), '.claude', 'agents'));
  const agents = await scanAgents(agentDirs);
  const { chars, notices: charNotes } = await listCharacters(join(root, 'characters'));
  const notices = [...cfg.notices, ...charNotes];
  let teams = cfg.teams.map((t) => ({
    name: typeof t.name === 'string' && t.name.trim() ? t.name.trim().slice(0, 16) : '이름 없는 팀',
    members: (Array.isArray(t.members) ? t.members : []).map((m) => (typeof m === 'string' ? { id: m } : m || {}))
      .filter((m) => typeof m.id === 'string' && AGENT_RE.test(m.id) && !RESERVED.has(m.id))
      .map((m) => ({ id: m.id, name: typeof m.name === 'string' && m.name.trim() ? m.name.trim().slice(0, 16) : m.id, character: typeof m.character === 'string' ? m.character : '', tasks: Array.isArray(m.tasks) ? m.tasks.filter((x) => typeof x === 'string').slice(0, 8).map((x) => x.slice(0, 30)) : undefined })),
  })).filter((t) => t.members.length);
  let sample = false;
  if (!teams.length && agents.length) {
    for (let i = 0; i < agents.length; i += 4) teams.push({ name: `${teams.length + 1}팀`, members: agents.slice(i, i + 4).map((id) => ({ id, name: id })) });
  } else if (!teams.length) {
    sample = true;
    teams = [1, 2].map((t) => ({ name: `${t}팀`, members: [1, 2, 3].map((i) => ({ id: `sample-${t}-${i}`, name: `직원 ${(t - 1) * 3 + i}` })) }));
  }
  return {
    company: cfg.company, boss: cfg.boss, assistant: cfg.assistant,
    bossCharacter: cfg.bossCharacter, assistantCharacter: cfg.assistantCharacter,
    teams, characters: chars, notices, sample,
    agentIds: teams.flatMap((t) => t.members.map((m) => m.id)).filter((id) => !id.startsWith('sample-')),
    claudeFolder: cfg.claudeFolder,
  };
}

// /characters/<파일> 요청을 그 폴더 안 실제 그림 파일 경로로 (목록 규칙과 같은 이름만)
export function characterPath(root, urlPath) {
  let name;
  try { name = decodeURIComponent(urlPath.slice('/characters/'.length)).normalize('NFC'); } catch { return null; }
  if (!FILE_RE.test(name) || name.includes('/') || name.includes('\\')) return null;
  return join(root, 'characters', name);
}
export { NAME_RE };
