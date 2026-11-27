// 🚫 욕설 · 비속어 필터 (서버에서 채팅/DM/방명록/닉네임/문의 텍스트를 * 로 마스킹)
// - 기본 키워드 + data/badwords.txt 사용자 키워드 (파일 수정 시 자동 재적용, 서버 재시작 불필요)
// - "시1발", "씨.발", "f*ck" 처럼 글자 사이에 숫자·기호를 끼워 넣은 우회 표현도 잡아냄
// - 띄어쓰기 우회("시 발")는 "3시 발표" 같은 정상 문장 오탐이 많아 의도적으로 잡지 않음
import { readFileSync, existsSync, writeFileSync, mkdirSync, watchFile } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT_WORDS = [
  // 시발 계열
  '씨발', '시발', '씨바', '씨빨', '시빨', '씨팔', '시팔', '쓰발', '쒸발', '씨부랄', '씨부럴', '십알', '십새', '씹새', '씹년', '씹놈', '씹할', '씹창',
  'ㅅㅂ', 'ㅆㅂ', 'ㅅㅃ', 'ㅆㅃ',
  // 병신 계열
  '병신', '븅신', '빙신', '뷩신', '병시나', 'ㅂㅅ', '등신',
  // 좆 · 존나 계열
  '좆', '좃같', '좆같', '존나', '존내', '졸라', '존만', 'ㅈㄴ', 'ㅈ같',
  // 새끼 계열
  '개새끼', '개새기', '개색기', '개색끼', '개세끼', '개쉐이', '개쌔끼', '새끼', '색끼', '쌔끼', 'ㅅㄲ',
  // 기타 비하 · 욕설
  '미친놈', '미친년', '미친새끼', '미친개', '또라이', '돌아이', '지랄', 'ㅈㄹ', '염병', '옘병', '썅', '쌍년', '쌍놈', '개년', '개놈', '개같', '개소리',
  '엠창', '느금마', '느금', '니애미', '니애비', '니미럴', '니기미', '후레자식', '호로자식', '창녀', '창년', '닥쳐', '꺼져', '뒤질래', '뒤져라', '죽어라',
  '한남충', '김치녀', '틀딱', '급식충', '맘충', '똘추', '섹스',
  // 영어
  'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'asshole', 'bastard', 'cunt', 'dickhead', 'wtf', 'stfu',
];

// 정상 단어 예외 (욕설 키워드를 포함하지만 마스킹하면 안 되는 단어)
const DEFAULT_ALLOW = ['시발점', '시발역', '시발택시'];

// 글자 사이 우회용 끼워 넣기 문자 (숫자 · 기호, 최대 2개)
const SEP = '[0-9._\\-*~!@#$%^&+=|/\\\\,\'"`]{0,2}';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildRegex(words) {
  const uniq = [...new Set(words.map((w) => w.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!uniq.length) return null;
  const parts = uniq.map((w) => [...w].map(escapeRe).join(SEP));
  return new RegExp(parts.join('|'), 'giu');
}

const FILE_HEADER = `# 🚫 욕설 필터 사용자 키워드 (한 줄에 하나)
# - 여기 적은 단어는 채팅·DM·방명록·닉네임·문의에서 * 로 가려집니다.
# - 맨 앞에 ! 를 붙이면 "예외(허용) 단어"가 됩니다.  예) !시발점
# - 파일을 저장하면 서버 재시작 없이 바로 적용됩니다.
# - # 으로 시작하는 줄은 주석입니다.
`;

export function createProfanityFilter(customFile) {
  let badRe = buildRegex(DEFAULT_WORDS);
  let allowRe = buildRegex(DEFAULT_ALLOW);

  function load() {
    const extraBad = [];
    const extraAllow = [];
    try {
      if (customFile && existsSync(customFile)) {
        for (const raw of readFileSync(customFile, 'utf8').split(/\r?\n/)) {
          const line = raw.trim();
          if (!line || line.startsWith('#')) continue;
          if (line.startsWith('!')) extraAllow.push(line.slice(1));
          else extraBad.push(line);
        }
      }
    } catch { /* 파일 오류 시 기본 목록만 사용 */ }
    badRe = buildRegex([...DEFAULT_WORDS, ...extraBad]);
    allowRe = buildRegex([...DEFAULT_ALLOW, ...extraAllow]);
  }

  if (customFile) {
    try {
      if (!existsSync(customFile)) {
        mkdirSync(dirname(customFile), { recursive: true });
        writeFileSync(customFile, FILE_HEADER, 'utf8');
      }
    } catch { /* ignore */ }
    load();
    watchFile(customFile, { interval: 2000 }, load).unref?.();
  }

  // 반환: { text: 마스킹된 문자열, filtered: 마스킹 여부 }
  function clean(input) {
    if (typeof input !== 'string' || !input || !badRe) return { text: input || '', filtered: false };
    const allowSpans = [];
    if (allowRe) {
      allowRe.lastIndex = 0;
      for (const m of input.matchAll(allowRe)) allowSpans.push([m.index, m.index + m[0].length]);
    }
    let filtered = false;
    badRe.lastIndex = 0;
    const text = input.replace(badRe, (match, offset) => {
      const end = offset + match.length;
      if (allowSpans.some(([s, e]) => offset < e && end > s)) return match;
      filtered = true;
      return '*'.repeat([...match].length);
    });
    return { text, filtered };
  }

  return { clean, mask: (s) => clean(s).text, reload: load };
}
