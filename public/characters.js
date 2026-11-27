import * as THREE from 'three';
import { LAYOUT } from './world.js';

const TEAM_COLORS = {
  ceo: '#F2C14E',
  sec: '#6FA8E8',
  team0: '#58B98A',
  team1: '#F28CA8',
};

const PERSONALITY = {
  assistant: {
    greet: '하아— 오늘 일정과 회의 소집 준비 완벽합니다!',
    meeting: ['자, 모두 착석해 주세요!', '메타버스 공간 안건 정리 중입니다.', '의견 주시면 바로 기록하겠습니다!'],
    show: ['공연 무대가 아주 멋지네요!', '다들 신나게 춤추고 있어요!'],
    praise: '하아— 칭찬 덕분에 기운이 확 나네요! 🍺',
  },
  hachiware: {
    greet: '안녕하세요! 2.5D 도트 감성이라 우리 원래 얼굴 그대로라서 너무 귀여워요!',
    meeting: ['ZEP처럼 다 같이 모여서 회의하니까 재밌네요!', '방문자 안내문도 제가 예쁘게 써 볼게요!', '라운지 카페에 미니게임도 넣으면 좋겠어요!'],
    show: ['와아~! 다 같이 무대에서 춤추니까 너무 재밌다!', '야외 무대 최고예요!'],
    praise: '헤헤, 감사합니다! 더 열심히 써 볼게요! ✨',
  },
  usagi: {
    greet: '우라— 야하! 친구들 다 불러서 무대에서 춤추자! 야하!',
    meeting: ['우라!! 오피스 비밀 공간 만들자!', '야하! 후킹 카피: "먼작귀 2.5D 메타버스 오픈!"', '이이야하~ 공연장 불꽃놀이 추가!'],
    show: ['야하!! 우라라라!! 🎵', '푸루야하— 앵콜!!'],
    praise: '야하!! 센스 최고! 우라! 🎉',
  },
  chiikawa: {
    greet: '에... 안녕하세요! 오늘 할 일 체크리스트 3줄로 정리해 뒀어요!',
    meeting: ['으응... 핵심 3줄 요약 적고 있어요!', '맞춤법도 꼼꼼히 확인했어요!', '다들 의견 너무 좋아요... 와아!'],
    show: ['와... 와아~! ✨', '반짝반짝 너무 예뻐요!'],
    praise: '와아... 기뻐요! 더 열심히 할게요! (폴짝) 💛',
  },
  'labor-yoroi': {
    greet: '팀별 메타버스 제작 일정을 점검 중입니다!',
    meeting: ['Phase 1 완료! 다음 일정 배분하겠습니다.', '진척도 100% 순항 중입니다!', '현장 지원 필요하시면 언제든 말씀 주세요!'],
    show: ['무대 안전 점검 완료! 신나게 춤추십시오!', '멋진 사내 복지 공연이군요!'],
    praise: '감사합니다! 맡겨 주신 일정 완벽히 챙기겠습니다! 💪',
  },
  shisa: {
    greet: '멀티플레이어 동시 접속과 채팅 최적화 자료를 조사해 왔습니다!',
    meeting: ['ZEP 스타일 2.5D가 로딩도 빠르고 캐릭터 매력이 100% 살아납니다!', '실시간 채팅이랑 근접 대화 기능 멋지네요!', '용어 정리표도 깔끔하게 만들었습니다!'],
    show: ['우와! 야외 무대 조명 정말 멋집니다!', '최고예요!! 👏'],
    praise: '감사합니다! 더 열심히 공부해서 조사하겠습니다! 📚',
  },
  momonga: {
    greet: '흥! 역시 내 원래 귀여운 얼굴이 제일 빛나지?! 빨리 칭찬해 줘!',
    meeting: ['이봐, 친구들 많이 초대해서 내 귀여움을 보여 주라고!', '채팅창 퀄리티 괜찮은걸? 흥!', '내가 최종 검수해 줄 테니 감사히 여기라고!'],
    show: ['내가 무대 센터야! 내 춤을 보라고!!', '흥, 꽤 신나잖아?!'],
    praise: '흥, 당연하지! 내가 제일 귀여우니까! 더 칭찬해 봐! 😤✨',
  },
  yoroi: {
    greet: '파스텔 오피스 배경 위에 도트 캐릭터가 올라가니 ZEP 감성이 딱 살아나네요!',
    meeting: ['파스텔 민트와 핑크 러그 조화가 아주 따뜻하죠?', '시각 자료랑 안내 보드도 깔끔하게 패키징했어요!', '소파 쿠션감까지 세심하게 챙겼습니다!'],
    show: ['무대 배경막 노란색이 정말 화사하네요!', '다들 귀엽게 잘 어울려요!'],
    praise: '그렇게 말씀해 주시니 보람차네요! 감사합니다! 🎨',
  },
  'ramen-yoroi': {
    greet: '동시 접속 테스트와 사용자 피드백을 꼼꼼히 검증 중입니다!',
    meeting: ['도트 캐릭터 공간 프레임 안정성 테스트 통과했습니다!', '회의 끝나고 라운지에서 따뜻한 차 한 잔 하시죠!', '팀원 사기 120%! 팩트체크 완료!'],
    show: ['이 기세로 메타버스 대박 갑시다!!', '최고의 무대입니다! 🍜'],
    praise: '감사합니다! 오늘 간식은 제가 쏘겠습니다! 🍜',
  },
  seiren: {
    greet: '후훗… 영원의 바다에서 온 세이렌이에요! 다들 맛있게 먹고 일하고 있나요?',
    meeting: ['이 오피스, 꽤 아늑하네요~ 숟가락 챙겨 왔어요!', '다 같이 모여서 이야기하니 재밌네요! 🧜‍♀️', '잠깐 쉬면서 맛있는 간식 타임 어때요?'],
    show: ['바다의 노랫소리를 들려드릴게요~ 🎵', '무대 조명이 반짝반짝 예쁘네요! ✨'],
    praise: '어머, 칭찬 고마워요~ 특별히 한 숟가락 나눠 줄게요! 🥄✨',
  },
};

function getPersona(id) {
  return PERSONALITY[id] || {
    greet: '안녕하세요! 열심히 일하고 있어요!',
    meeting: ['좋은 아이디어네요!', '메타버스 공간 기대돼요!'],
    show: ['와아! 신난다!', '최고예요!'],
    praise: '칭찬 감사합니다! ✨',
  };
}

// ---------- 원본 도트 캐릭터 PNG로부터 픽셀아트 뒷모습(Back View) 자동 생성 ----------
function generateBackTexture(img, charName = '', pixelated = true) {
  const w = img.naturalWidth || img.width || 64;
  const h = img.naturalHeight || img.height || 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);

  let data;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
  const px = data.data;
  const alphaAt = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return px[(y * w + x) * 4 + 3];
  };
  const rgbAt = (x, y) => {
    const i = (y * w + x) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };

  // 외곽선(투명 픽셀에서 거리 <= margin) 판별: 외곽선은 절대 건드리지 않고 안쪽 얼굴만 지운다!
  const isNearTransparent = (x, y, margin) => {
    for (let dy = -margin; dy <= margin; dy++) {
      for (let dx = -margin; dx <= margin; dx++) {
        if (alphaAt(x + dx, y + dy) < 120) return true;
      }
    }
    return false;
  };

  // 몸통 대표 밝은 바탕색 샘플링 (배/몸 하단 중앙 부근)
  const sampleColor = (x0f, x1f, y0f, y1f, fallback = [255, 250, 245]) => {
    const rs = [], gs = [], bs = [];
    const x0 = Math.floor(w * x0f), x1 = Math.floor(w * x1f);
    const y0 = Math.floor(h * y0f), y1 = Math.floor(h * y1f);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (alphaAt(x, y) < 200) continue;
        const [r, g, b] = rgbAt(x, y);
        // 너무 어두운 외곽선(#2e1610)이나 분홍 볼 홍조 제외
        if (r + g + b < 220) continue;
        if (r > 220 && g < 205 && b < 210 && r - g > 30) continue;
        rs.push(r); gs.push(g); bs.push(b);
      }
    }
    if (!rs.length) return fallback;
    rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
    const mid = Math.floor(rs.length / 2);
    return [rs[mid], gs[mid], bs[mid]];
  };

  const name = String(charName || '').replace(/\s+/g, '');
  const isTall = h > w * 1.75; // 갑옷 씨 3인방
  const outline = '#2E1610';

  if (isTall) {
    // 갑옷 씨: 투구 바이저/입 그릴 영역(y: 7%..22%)을 투구 은회색으로 매끈하게 채워 뒷모습 투구로!
    const helmCol = sampleColor(0.35, 0.65, 0.03, 0.08, [184, 189, 195]);
    const x0 = Math.floor(w * 0.2), x1 = Math.floor(w * 0.8);
    const y0 = Math.floor(h * 0.07), y1 = Math.floor(h * 0.22);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (alphaAt(x, y) < 200 || isNearTransparent(x, y, 3)) continue;
        const i = (y * w + x) * 4;
        px[i] = helmCol[0]; px[i + 1] = helmCol[1]; px[i + 2] = helmCol[2];
      }
    }
    // 포셰트갑옷씨: 앞쪽 핑크 곰돌이 가방 부분도 뒷모습에서는 갑옷 회색으로 정리
    if (name.includes('포셰트')) {
      const armorCol = sampleColor(0.35, 0.6, 0.26, 0.34, [180, 185, 192]);
      for (let y = Math.floor(h * 0.37); y <= Math.floor(h * 0.51); y++) {
        for (let x = Math.floor(w * 0.45); x <= Math.floor(w * 0.88); x++) {
          if (alphaAt(x, y) < 200 || isNearTransparent(x, y, 2)) continue;
          const [r, g, b] = rgbAt(x, y);
          if (r > 180 && r - g > 20) {
            const i = (y * w + x) * 4;
            px[i] = armorCol[0]; px[i + 1] = armorCol[1]; px[i + 2] = armorCol[2];
          }
        }
      }
    }
    ctx.putImageData(data, 0, 0);

    // 투구 뒷면 중앙 능선 디테일
    ctx.fillStyle = 'rgba(70, 76, 86, 0.35)';
    ctx.fillRect(Math.floor(w * 0.49), Math.floor(h * 0.06), Math.max(1, Math.round(w * 0.03)), Math.floor(h * 0.14));
    // 라멘갑옷씨: 뒷머리 흰 하치마키 매듭
    if (name.includes('라멘')) {
      ctx.fillStyle = '#FFFDF8';
      ctx.fillRect(Math.floor(w * 0.26), Math.floor(h * 0.08), Math.floor(w * 0.48), Math.max(3, Math.round(h * 0.025)));
      ctx.fillStyle = outline;
      ctx.fillRect(Math.floor(w * 0.45), Math.floor(h * 0.095), Math.max(4, Math.round(w * 0.1)), Math.max(3, Math.round(h * 0.02)));
    }
  } else {
    // 소형 먼작귀 캐릭터들: 몸통 바탕색 샘플링 후 얼굴 영역(눈/눈썹/볼/입)을 깨끗하게 채운다!
    const bodyCol = sampleColor(0.32, 0.68, 0.62, 0.82, [255, 252, 248]);
    const capCol = name.includes('하치와레')
      ? sampleColor(0.28, 0.72, 0.13, 0.22, [96, 148, 188])
      : name.includes('쿠리만쥬')
        ? sampleColor(0.32, 0.68, 0.08, 0.22, [152, 102, 74])
        : null;

    const faceY0 = Math.floor(h * (name.includes('쿠리만쥬') ? 0.24 : 0.18));
    const faceY1 = Math.floor(h * (name.includes('시사') ? 0.66 : name.includes('세이렌') ? 0.72 : 0.61));
    const faceX0 = Math.floor(w * (name.includes('세이렌') ? 0.04 : 0.1));
    const faceX1 = Math.floor(w * (name.includes('모몽가') ? 0.78 : name.includes('세이렌') ? 0.66 : 0.9));
    const sirenHairCol = name.includes('세이렌') ? [26, 15, 14] : null;

    for (let y = faceY0; y <= faceY1; y++) {
      for (let x = faceX0; x <= faceX1; x++) {
        if (alphaAt(x, y) < 200 || isNearTransparent(x, y, 4)) continue;
        // 랏코는 목 망토(y > 54%) 살려두기
        if (name.includes('랏코') && y > h * 0.54) continue;
        const i = (y * w + x) * 4;
        // 세이렌: 뒷모습은 풍성한 검은 머리카락으로 뒤통수를 감싸고, 하단 흰 등과 인어 꼬리는 그대로 보존!
        if (sirenHairCol) {
          const [r, g, b] = rgbAt(x, y);
          if (r > 165 && r - g > 65 && y > h * 0.50) continue;
          if (y < h * 0.52) {
            px[i] = sirenHairCol[0]; px[i + 1] = sirenHairCol[1]; px[i + 2] = sirenHairCol[2];
          } else {
            px[i] = bodyCol[0]; px[i + 1] = bodyCol[1]; px[i + 2] = bodyCol[2];
          }
        } else if (name.includes('하치와레') && capCol && y < h * 0.47) {
          px[i] = capCol[0]; px[i + 1] = capCol[1]; px[i + 2] = capCol[2];
        } else if (name.includes('쿠리만쥬') && capCol && y < h * 0.34) {
          px[i] = capCol[0]; px[i + 1] = capCol[1]; px[i + 2] = capCol[2];
        } else {
          px[i] = bodyCol[0]; px[i + 1] = bodyCol[1]; px[i + 2] = bodyCol[2];
        }
      }
    }

    // 우사기 / 모몽가 귀 안쪽 분홍/하늘색도 뒤에서 볼 때는 귀 뒷면 바탕색으로 채우기
    if (name.includes('우사기') || name.includes('모몽가')) {
      for (let y = Math.floor(h * 0.04); y <= Math.floor(h * 0.24); y++) {
        for (let x = Math.floor(w * 0.12); x <= Math.floor(w * 0.85); x++) {
          if (alphaAt(x, y) < 200 || isNearTransparent(x, y, 3)) continue;
          const [r, g, b] = rgbAt(x, y);
          if (r + g + b > 260) {
            const i = (y * w + x) * 4;
            px[i] = bodyCol[0]; px[i + 1] = bodyCol[1]; px[i + 2] = bodyCol[2];
          }
        }
      }
    }

    ctx.putImageData(data, 0, 0);

    // 하치와레 뒤통수 파란 경계 픽셀 라인
    if (name.includes('하치와레') && capCol) {
      const yLine = Math.floor(h * 0.47);
      ctx.fillStyle = outline;
      for (let x = Math.floor(w * 0.12); x <= Math.floor(w * 0.88); x++) {
        if (alphaAt(x, yLine) >= 200 && !isNearTransparent(x, yLine, 3)) {
          ctx.fillRect(x, yLine, 1, 2);
        }
      }
    }

    // 쿠리만쥬 뒤통수 밤껍질 경계선
    if (name.includes('쿠리만쥬') && capCol) {
      const yLine = Math.floor(h * 0.34);
      ctx.fillStyle = outline;
      for (let x = Math.floor(w * 0.14); x <= Math.floor(w * 0.86); x++) {
        if (alphaAt(x, yLine) >= 200 && !isNearTransparent(x, yLine, 3)) {
          ctx.fillRect(x, yLine, 1, 2);
        }
      }
    }

    // 캐릭터별 귀여운 픽셀 뒷모습 디테일 (꼬리 / 랏코 등 뒤 검!)
    const drawPixelTail = (cx, cy, r, fillHex) => {
      ctx.fillStyle = outline;
      ctx.beginPath(); ctx.arc(cx, cy, r + 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fillHex;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    };

    const bodyHex = `rgb(${bodyCol[0]},${bodyCol[1]},${bodyCol[2]})`;
    if (name.includes('랏코')) {
      // 등 뒤 대각선 검 + 망토
      ctx.strokeStyle = outline;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.32);
      ctx.lineTo(w * 0.72, h * 0.76);
      ctx.stroke();
      ctx.strokeStyle = '#D9E4F0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.32, h * 0.36);
      ctx.lineTo(w * 0.7, h * 0.74);
      ctx.stroke();
      // 금색 손잡이 가드
      ctx.strokeStyle = '#F2C14E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.24, h * 0.44);
      ctx.lineTo(w * 0.4, h * 0.28);
      ctx.stroke();
      drawPixelTail(w * 0.5, h * 0.82, 4.5, '#6B4834');
    } else if (name.includes('하치와레')) {
      // 살랑이는 고양이 꼬리
      ctx.strokeStyle = outline;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.8);
      ctx.quadraticCurveTo(w * 0.62, h * 0.76, w * 0.66, h * 0.64);
      ctx.stroke();
      ctx.strokeStyle = capCol ? `rgb(${capCol[0]},${capCol[1]},${capCol[2]})` : '#5E92B8';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (!name.includes('모몽가') && !name.includes('세이렌')) {
      // 치이카와, 우사기, 쿠리만쥬, 시사: 동글동글 귀여운 꼬리!
      drawPixelTail(w * 0.5, h * 0.78, name.includes('우사기') ? 5.5 : 4.2, bodyHex);
    }
  }

  // 뒷모습임을 은은하게 살려주는 4% 그림자 톤
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(65, 50, 42, 0.04)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  const backTex = new THREE.CanvasTexture(c);
  if (pixelated) {
    backTex.magFilter = THREE.NearestFilter;
    backTex.minFilter = THREE.NearestFilter;
  }
  backTex.colorSpace = THREE.SRGBColorSpace;
  backTex._sourceCanvas = c;
  return backTex;
}

// ---------- ZEP 스타일 귀여운 3/4 옆모습 (오른쪽/왼쪽 전용 텍스처 각각 생성! THREE.Sprite 음수 스케일 버그 방지) ----------
function generateSideTextures(img, charName = '', pixelated = true) {
  const w = img.naturalWidth || img.width || 64;
  const h = img.naturalHeight || img.height || 64;
  const cleanName = String(charName || '').replace(/\s+/g, '');

  // 세이렌은 원본 자체가 왼쪽 3/4 방향 인어 포즈이므로 왜곡 없이 좌/우 선명하게 미러링!
  if (cleanName.includes('세이렌')) {
    const cL = document.createElement('canvas');
    cL.width = w; cL.height = h;
    const ctxL = cL.getContext('2d');
    ctxL.imageSmoothingEnabled = false;
    ctxL.drawImage(img, 0, 0, w, h);

    const cR = document.createElement('canvas');
    cR.width = w; cR.height = h;
    const ctxR = cR.getContext('2d');
    ctxR.imageSmoothingEnabled = false;
    ctxR.translate(w, 0);
    ctxR.scale(-1, 1);
    ctxR.drawImage(img, 0, 0, w, h);

    const sideRightTex = new THREE.CanvasTexture(cR);
    const sideLeftTex = new THREE.CanvasTexture(cL);
    for (const t of [sideRightTex, sideLeftTex]) {
      if (pixelated) {
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
      }
      t.colorSpace = THREE.SRGBColorSpace;
    }
    return { sideRightTex, sideLeftTex, sideRightCanvas: cR };
  }

  // 1) 오른쪽을 바라보는 3/4 옆모습 캔버스
  const cR = document.createElement('canvas');
  cR.width = w;
  cR.height = h;
  const ctxR = cR.getContext('2d');
  ctxR.imageSmoothingEnabled = false;

  const sw = Math.round(w * 0.9);
  const ox = Math.floor((w - sw) / 2);
  ctxR.drawImage(img, ox, 0, sw, h);

  let data;
  try {
    data = ctxR.getImageData(0, 0, w, h);
  } catch {
    return { sideRightTex: null, sideLeftTex: null };
  }
  const src = new Uint8ClampedArray(data.data);
  const dst = data.data;
  const alphaAt = (arr, x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return arr[(y * w + x) * 4 + 3];
  };
  const isNearTransparent = (arr, x, y, margin) => {
    for (let dy = -margin; dy <= margin; dy++) {
      for (let dx = -margin; dx <= margin; dx++) {
        if (alphaAt(arr, x + dx, y + dy) < 120) return true;
      }
    }
    return false;
  };

  // 외곽선 안쪽 얼굴 영역을 오른쪽(+shift px)으로 선명하게 밀어 3/4 오른쪽 시선 표현
  const isTall = h > w * 1.75;
  const shift = isTall ? 3 : Math.max(4, Math.round(w * 0.085));
  const y0 = Math.floor(h * (isTall ? 0.08 : 0.21));
  const y1 = Math.floor(h * (isTall ? 0.22 : 0.6));
  const x0 = Math.floor(w * 0.12);
  const x1 = Math.floor(w * 0.88);

  // 바탕색 샘플링 (얼굴 이동 후 왼쪽 뒤통수 여백 채우기)
  const rs = [], gs = [], bs = [];
  for (let y = Math.floor(h * (isTall ? 0.04 : 0.62)); y <= Math.floor(h * (isTall ? 0.08 : 0.8)); y++) {
    for (let x = Math.floor(w * 0.34); x <= Math.floor(w * 0.66); x++) {
      if (alphaAt(src, x, y) < 200) continue;
      const i = (y * w + x) * 4;
      if (src[i] + src[i + 1] + src[i + 2] < 220) continue;
      rs.push(src[i]); gs.push(src[i + 1]); bs.push(src[i + 2]);
    }
  }
  rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
  const mid = Math.floor(rs.length / 2);
  const fill = rs.length ? [rs[mid], gs[mid], bs[mid]] : [255, 252, 248];

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (alphaAt(src, x, y) < 200 || isNearTransparent(src, x, y, 3)) continue;
      const sx = x - shift;
      const di = (y * w + x) * 4;
      if (sx >= x0 && alphaAt(src, sx, y) >= 200 && !isNearTransparent(src, sx, y, 3)) {
        const si = (y * w + sx) * 4;
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
      } else {
        dst[di] = fill[0];
        dst[di + 1] = fill[1];
        dst[di + 2] = fill[2];
      }
    }
  }
  ctxR.putImageData(data, 0, 0);

  // 2) 왼쪽을 바라보는 3/4 옆모습 캔버스 (좌우 완전 미러링!)
  const cL = document.createElement('canvas');
  cL.width = w;
  cL.height = h;
  const ctxL = cL.getContext('2d');
  ctxL.imageSmoothingEnabled = false;
  ctxL.translate(w, 0);
  ctxL.scale(-1, 1);
  ctxL.drawImage(cR, 0, 0);

  const sideRightTex = new THREE.CanvasTexture(cR);
  const sideLeftTex = new THREE.CanvasTexture(cL);
  for (const t of [sideRightTex, sideLeftTex]) {
    if (pixelated) {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
    }
    t.colorSpace = THREE.SRGBColorSpace;
  }
  return { sideRightTex, sideLeftTex, sideRightCanvas: cR };
}

// ---------- 전 캐릭터(갑옷 씨 3인방 + 소형 먼작귀 전원) 2.5D 픽셀아트 착석 텍스처 자동 생성 ----------
function generateSittingTextures(img, backCanvas, sideRightCanvas, charName = '', isTallArmor = false, pixelated = true) {
  const w = img.naturalWidth || img.width || 64;
  const h = img.naturalHeight || img.height || 64;
  const outline = '#2E1610';
  const cleanName = String(charName || '').replace(/\s+/g, '');

  const mkTex = (canvas) => {
    const t = new THREE.CanvasTexture(canvas);
    if (pixelated) {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
    }
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  // === A. 키 큰 갑옷 씨 전체(포셰트/노동/라멘갑옷씨 등): 100% 원본 픽셀 기반 자연스러운 2.5D 무릎 굽힘 착석 ===
  if (isTallArmor || h > w * 1.55) {
    const sitH = Math.max(32, Math.round(h * 0.70));
    const kx = Math.round(w * 0.17);
    const kw = Math.round(w * 0.66);
    const shinY0 = Math.round(h * 0.74);
    const shinH = h - shinY0;
    const dstShinY = Math.round(h * 0.54);
    const dstShinH = sitH - dstShinY;
    const torsoH = Math.round(h * 0.62); // 양손 건틀릿과 포셰트 가방이 절대 잘리지 않도록 100% 보존!
    const ky0 = Math.round(h * 0.655);
    const kh = Math.max(6, Math.round(h * 0.088));
    const dstKy = Math.round(h * 0.54);

    // 1) 정면 2.5D 앉기
    const fw = w + 8;
    const ox = 4;
    const cFront = document.createElement('canvas');
    cFront.width = fw;
    cFront.height = sitH;
    const cf = cFront.getContext('2d');
    cf.imageSmoothingEnabled = false;
    cf.drawImage(img, kx, shinY0, kw, shinH, ox + kx, dstShinY, kw, dstShinH);
    cf.drawImage(img, 0, 0, w, torsoH, ox, 0, w, torsoH);
    cf.fillStyle = 'rgba(46, 22, 16, 0.32)';
    cf.fillRect(ox + kx + 2, dstKy + kh - 1, kw - 4, 3);
    cf.drawImage(img, kx, ky0, kw, kh, ox + kx, dstKy, kw, kh);

    // 2) 뒷모습 2.5D 앉기
    const cBack = document.createElement('canvas');
    cBack.width = fw;
    cBack.height = sitH;
    const cb = cBack.getContext('2d');
    cb.imageSmoothingEnabled = false;
    const backSrc = backCanvas || img;
    cb.drawImage(backSrc, kx, shinY0, kw, shinH, ox + kx, dstShinY, kw, dstShinH);
    cb.drawImage(backSrc, 0, 0, w, torsoH, ox, 0, w, torsoH);
    cb.fillStyle = 'rgba(46, 22, 16, 0.25)';
    cb.fillRect(ox + kx + 2, torsoH - 3, kw - 4, 3);

    // 3) 오른쪽 3/4 옆모습 앉기 (원본 픽셀 사선 허벅지 슬라이스 + 무릎 앞으로 + 양손 온전 보존!)
    const sw = w + 18;
    const sox = 5;
    const fwd = 6;
    const cSideR = document.createElement('canvas');
    cSideR.width = sw;
    cSideR.height = sitH;
    const cs = cSideR.getContext('2d');
    cs.imageSmoothingEnabled = false;
    const sideSrc = sideRightCanvas || img;

    // 앞으로 살짝 나온 정강이 & 갑옷 부츠
    cs.drawImage(sideSrc, kx, shinY0, kw, shinH, sox + kx + fwd, dstShinY, kw, dstShinH);
    // 원본 허벅지 픽셀을 부드러운 사선으로 앞으로 이어 자연스러운 2.5D 굽힘 표현
    const thY0 = Math.round(h * 0.55);
    const thY1 = Math.round(h * 0.655);
    for (let si = 0; si < 8; si++) {
      const t = si / 7;
      const sy = Math.round(thY0 + (thY1 - thY0) * t);
      const dy = Math.round(h * 0.535 + h * 0.055 * t);
      const dx = sox + kx + Math.round(fwd * t);
      cs.drawImage(sideSrc, kx, sy, kw, 2, dx, dy, kw, 3);
    }
    // 상체 + 양팔·건틀릿 100% 온전 보존
    cs.drawImage(sideSrc, 0, 0, w, torsoH, sox, 0, w, torsoH);
    // 앞으로 굽힌 무릎 보호대 + 미세 그림자
    cs.fillStyle = 'rgba(46, 22, 16, 0.32)';
    cs.fillRect(sox + kx + fwd + 1, dstKy + kh - 1, kw - 3, 3);
    cs.drawImage(sideSrc, kx, ky0, kw, kh, sox + kx + fwd - 1, dstKy, kw, kh);

    // 4) 왼쪽 3/4 옆모습 앉기 (좌우 미러링)
    const cSideL = document.createElement('canvas');
    cSideL.width = sw;
    cSideL.height = sitH;
    const cl = cSideL.getContext('2d');
    cl.imageSmoothingEnabled = false;
    cl.translate(sw, 0);
    cl.scale(-1, 1);
    cl.drawImage(cSideR, 0, 0);

    return {
      sitFrontTex: mkTex(cFront),
      sitBackTex: mkTex(cBack),
      sitSideRightTex: mkTex(cSideR),
      sitSideLeftTex: mkTex(cSideL),
      sitFrontAspect: fw / sitH,
      sitSideAspect: sw / sitH,
      sitHeightRatio: sitH / h,
    };
  }

  // === A-2. 세이렌(인어 꼬리): 정면 앞모습 + 전용 옆모습(기존 세이렌) 그대로 보존 ===
  if (cleanName.includes('세이렌')) {
    const mkCopy = (src, mirror = false) => {
      const sw = src.naturalWidth || src.width || w;
      const sh = src.naturalHeight || src.height || h;
      const cv = document.createElement('canvas');
      cv.width = sw; cv.height = sh;
      const cx = cv.getContext('2d');
      cx.imageSmoothingEnabled = false;
      if (mirror) { cx.translate(sw, 0); cx.scale(-1, 1); }
      cx.drawImage(src, 0, 0, sw, sh);
      return cv;
    };
    const cFront = mkCopy(img, false);
    const cBack = mkCopy(backCanvas || img, false);
    const cSideR = mkCopy(sideRightCanvas || img, !sideRightCanvas);
    const cSideL = mkCopy(sideRightCanvas || img, !!sideRightCanvas);
    const sideW = cSideR.width || w;
    const sideH = cSideR.height || h;
    return {
      sitFrontTex: mkTex(cFront),
      sitBackTex: mkTex(cBack),
      sitSideRightTex: mkTex(cSideR),
      sitSideLeftTex: mkTex(cSideL),
      sitFrontAspect: w / h,
      sitSideAspect: sideW / sideH,
      sitHeightRatio: 0.94,
    };
  }

  // === B. 소형 먼작귀 캐릭터 전원(치이카와·하치와레·우사기·랏코·쿠리만쥬·모몽가·시사·카니): 털썩 앉아 두 발 앞으로 톡! ===
  const cutY = Math.round(h * 0.89);
  const sitH = cutY + 3;

  // 발/몸통 밝은 색과 실제 몸통 좌우 폭 샘플링
  let footCol = [255, 250, 245];
  let bodyL = Math.round(w * 0.22);
  let bodyR = Math.round(w * (cleanName.includes('모몽가') ? 0.72 : 0.78));
  try {
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(img, 0, 0, w, h);
    const idata = tctx.getImageData(0, 0, w, h).data;
    const alphaAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : idata[(y * w + x) * 4 + 3];

    // cutY-2 행에서 실제 몸통 좌우 끝 탐지 (모몽가 꼬리 제외)
    const scanY = Math.max(1, cutY - 2);
    const maxScanX = Math.round(w * (cleanName.includes('모몽가') ? 0.76 : 0.90));
    let minX = w, maxX = 0;
    for (let x = Math.round(w * 0.12); x < maxScanX; x++) {
      if (alphaAt(x, scanY) >= 180) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    if (maxX - minX >= w * 0.3) {
      bodyL = minX;
      bodyR = maxX;
    }

    // 하체/몸통 대표색 샘플링
    const rs = [], gs = [], bs = [];
    for (let y = Math.floor(h * 0.72); y < Math.floor(h * 0.95); y++) {
      for (let x = bodyL + 2; x < bodyR - 2; x++) {
        if (alphaAt(x, y) < 200) continue;
        const idx = (y * w + x) * 4;
        if (idata[idx] + idata[idx + 1] + idata[idx + 2] < 170) continue;
        rs.push(idata[idx]); gs.push(idata[idx + 1]); bs.push(idata[idx + 2]);
      }
    }
    if (rs.length) {
      rs.sort((a, b) => a - b); gs.sort((a, b) => a - b); bs.sort((a, b) => a - b);
      const m = Math.floor(rs.length / 2);
      footCol = [rs[m], gs[m], bs[m]];
    }
  } catch { /* fallback */ }

  const footFill = `rgb(${footCol[0]},${footCol[1]},${footCol[2]})`;
  const bodyW = Math.max(14, bodyR - bodyL);
  const bodyMid = (bodyL + bodyR) * 0.5;
  const pawRx = Math.max(3.6, w * 0.082);
  const pawRy = Math.max(2.9, h * 0.056);
  const pawY = sitH - pawRy - 1.2;

  const drawCutePaw = (ctx, cx, cy, rx, ry) => {
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 1.3, ry + 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = footFill;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(242, 162, 180, 0.55)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 0.3, Math.max(1.5, rx * 0.44), Math.max(1.2, ry * 0.44), 0, 0, Math.PI * 2); ctx.fill();
  };

  // 1) 소형 정면 앉기 (얼굴·몸통 100% 보존 + 엉덩이 바닥 라인 + 앞으로 뻗은 귀여운 두 발!)
  const cFront = document.createElement('canvas');
  cFront.width = w;
  cFront.height = sitH;
  const cf = cFront.getContext('2d');
  cf.imageSmoothingEnabled = false;
  cf.drawImage(img, 0, 0, w, cutY, 0, 0, w, cutY);
  cf.fillStyle = outline;
  cf.fillRect(Math.round(bodyL + 2), cutY - 1, Math.round(bodyW - 4), 2);
  drawCutePaw(cf, bodyMid - bodyW * 0.27, pawY, pawRx, pawRy);
  drawCutePaw(cf, bodyMid + bodyW * 0.27, pawY, pawRx, pawRy);

  // 2) 소형 뒷모습 앉기 (서있는 다리만 접고 동글동글 엉덩이 & 꼬리 그대로 보존!)
  const cBack = document.createElement('canvas');
  cBack.width = w;
  cBack.height = sitH;
  const cb = cBack.getContext('2d');
  cb.imageSmoothingEnabled = false;
  const backSrc = backCanvas || img;
  cb.drawImage(backSrc, 0, 0, w, cutY, 0, 0, w, cutY);
  cb.fillStyle = outline;
  cb.fillRect(Math.round(bodyL + 2), cutY - 1, Math.round(bodyW - 4), 2);

  // 3) 소형 오른쪽 3/4 옆모습 앉기 (두 발을 앞쪽(오른쪽)으로 톡 내민 귀여운 착석 포즈!)
  const sw = w + 6;
  const cSideR = document.createElement('canvas');
  cSideR.width = sw;
  cSideR.height = sitH;
  const cs = cSideR.getContext('2d');
  cs.imageSmoothingEnabled = false;
  const sideSrc = sideRightCanvas || img;
  cs.drawImage(sideSrc, 0, 0, w, cutY, 2, 0, w, cutY);
  cs.fillStyle = outline;
  cs.fillRect(Math.round(bodyL + 3), cutY - 1, Math.round(bodyW - 4), 2);
  drawCutePaw(cs, 2 + bodyMid - bodyW * 0.08, pawY, pawRx * 0.96, pawRy);
  drawCutePaw(cs, 2 + bodyMid + bodyW * 0.34, pawY, pawRx * 1.04, pawRy);

  // 4) 소형 왼쪽 3/4 옆모습 앉기 (좌우 미러링)
  const cSideL = document.createElement('canvas');
  cSideL.width = sw;
  cSideL.height = sitH;
  const cl = cSideL.getContext('2d');
  cl.imageSmoothingEnabled = false;
  cl.translate(sw, 0);
  cl.scale(-1, 1);
  cl.drawImage(cSideR, 0, 0);

  return {
    sitFrontTex: mkTex(cFront),
    sitBackTex: mkTex(cBack),
    sitSideRightTex: mkTex(cSideR),
    sitSideLeftTex: mkTex(cSideL),
    sitFrontAspect: w / sitH,
    sitSideAspect: sw / sitH,
    sitHeightRatio: sitH / h,
  };
}

function makeNameTagTexture(name, color, status = '') {
  const hasStatus = !!(status && status.trim());
  const c = document.createElement('canvas');
  // 2배 고해상도(HiDPI) 캔버스 + 고대비 타이포그래피로 이름 및 한줄 소개를 또렷하고 선명하게!
  c.width = 640;
  c.height = hasStatus ? 204 : 124;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);

  // 배경 카드 (완전 불투명에 가까운 선명한 크림 화이트 + 굵은 컬러 테두리)
  ctx.save();
  ctx.shadowColor = 'rgba(20, 15, 12, 0.24)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(255, 253, 249, 0.98)';
  ctx.beginPath();
  ctx.roundRect(22, 12, c.width - 44, c.height - 24, 38);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = color || '#F2C14E';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(22, 12, c.width - 44, c.height - 24, 38);
  ctx.stroke();

  // 이름
  ctx.fillStyle = '#1E1611';
  ctx.font = '900 46px "Pretendard", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, c.width / 2, hasStatus ? 64 : 62);

  // 이름 밑 한줄 소개 / 상태 메시지 (고대비 배경 필 + 굵고 진한 다크 폰트로 선명하게!)
  if (hasStatus) {
    const cleanStatus = status.trim().slice(0, 22);
    ctx.font = '800 34px "Pretendard", "Malgun Gothic", sans-serif';
    const textW = Math.min(c.width - 110, ctx.measureText(cleanStatus).width + 46);
    const pillX = (c.width - textW) / 2;
    const pillY = 104;
    const pillH = 62;
    ctx.fillStyle = 'rgba(238, 236, 252, 0.96)';
    ctx.strokeStyle = 'rgba(91, 92, 230, 0.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, textW, pillH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1B1730';
    ctx.fillText(cleanStatus, c.width / 2, pillY + pillH / 2 + 1, c.width - 130);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Mipmap 블러 제거 -> 원거리/근거리 모두 텍스트가 칼같이 선명하게 렌더링!
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return { tex, hasStatus };
}

function makeBubbleTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = '700 24px "Pretendard", "Malgun Gothic", sans-serif';

  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > 430 && cur) {
      lines.push(cur); cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  const clipped = lines.slice(0, 2);

  const bw = Math.min(480, Math.max(160, Math.max(...clipped.map((l) => ctx.measureText(l).width)) + 52));
  const bh = clipped.length > 1 ? 88 : 64;
  const bx = (512 - bw) / 2;
  const by = 104 - bh;

  ctx.fillStyle = 'rgba(255, 253, 248, 0.97)';
  ctx.strokeStyle = '#D9B896';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 253, 248, 0.97)';
  ctx.beginPath();
  ctx.moveTo(246, 102); ctx.lineTo(266, 102); ctx.lineTo(256, 122); ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#3B2F26';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (clipped.length === 1) {
    ctx.fillText(clipped[0], 256, by + bh / 2);
  } else {
    ctx.fillText(clipped[0], 256, by + bh * 0.34);
    ctx.fillText(clipped[1], 256, by + bh * 0.68);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const emoteTexCache = new Map();
function getEmoteTexture(emoji) {
  const key = String(emoji || '✨');
  if (emoteTexCache.has(key)) return emoteTexCache.get(key);
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 192;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 192, 192);

  // ZEP 느낌의 은은한 원형 후광 (배경이 밝든 어둡든 이모지가 또렷하게 보이도록)
  const g = ctx.createRadialGradient(96, 98, 14, 96, 98, 80);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
  g.addColorStop(0.55, 'rgba(255, 255, 255, 0.22)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(96, 98, 80, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = 'rgba(35, 25, 20, 0.28)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  ctx.font = '112px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(key, 96, 102);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  emoteTexCache.set(key, tex);
  return tex;
}

export class TextureBank {
  constructor() {
    this.loader = new THREE.TextureLoader();
    this.cache = new Map();
  }
  async loadCharacter(charName, url) {
    if (this.cache.has(charName)) return this.cache.get(charName);
    const entry = await this.loadFromUrl(url, true, charName);
    if (entry) this.cache.set(charName, entry);
    return entry;
  }
  async loadFromUrl(url, pixelated = true, charName = '') {
    if (!url) return null;
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (tex) => {
          if (pixelated) {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          const img = tex.image;
          const rawAspect = img && img.height ? img.width / img.height : 1;
          const aspect = Math.min(1.5, Math.max(0.28, rawAspect));
          const cleanName = String(charName || '').replace(/\s+/g, '');
          const isTallArmor = /갑옷/.test(cleanName) || (pixelated && img && img.height > img.width * 1.65);
          const isGiantSiren = /세이렌/.test(cleanName);
          const BASE_SMALL_H = 1.44;
          let h = 1.55;
          if (pixelated && img && img.height) {
            if (isGiantSiren) {
              // 세이렌은 일반 캐릭터 평균 키(1.44)의 3배
              h = BASE_SMALL_H * 3.0;
            } else if (isTallArmor) {
              // 노동갑옷씨·라멘갑옷씨·포셰트갑옷씨는 일반 캐릭터 평균 키(1.44)의 2배
              h = BASE_SMALL_H * 2.0;
            } else {
              h = Math.min(1.62, Math.max(1.18, (img.height / 73) * BASE_SMALL_H));
            }
          }
          const backTex = img ? generateBackTexture(img, charName, pixelated) : null;
          const { sideRightTex, sideLeftTex, sideRightCanvas } = img ? generateSideTextures(img, charName, pixelated) : { sideRightTex: null, sideLeftTex: null, sideRightCanvas: null };
          const sitBundle = img ? generateSittingTextures(img, backTex?._sourceCanvas || null, sideRightCanvas || null, charName, isTallArmor, pixelated) : null;
          resolve({
            tex,
            backTex: backTex || tex,
            sideRightTex: sideRightTex || tex,
            sideLeftTex: sideLeftTex || tex,
            isTallArmor,
            sitBundle,
            aspect,
            sideAspect: aspect,
            height: h,
            url,
          });
        },
        undefined,
        () => resolve(null)
      );
    });
  }
}

export class Avatar3D {
  constructor({ id, name, status = '', charName = '', teamKey = 'ceo', teamName = '', color = null, charEntry = null, customEntry = null, isPlayer = false, isRemote = false, tasks = [] }) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.charName = charName || name || id;
    this.teamKey = teamKey;
    this.teamName = teamName;
    this.isPlayer = isPlayer;
    this.isRemote = isRemote;
    this.tasks = tasks;
    this.persona = getPersona(id);
    this.color = color || TEAM_COLORS[teamKey] || '#58B98A';

    this.group = new THREE.Group();
    this.group.userData.avatar = this;

    // 2.5D 바닥 그림자 & 파스텔 링
    this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x3b2f26, transparent: true, opacity: 0.24 });
    this.shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(0.54, 20), this.shadowMat);
    this.shadowDisc.rotation.x = -Math.PI / 2;
    this.shadowDisc.position.y = 0.025;
    this.group.add(this.shadowDisc);

    this.ringMat = new THREE.MeshBasicMaterial({
      color: this.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isPlayer || isRemote ? 0.92 : 0.55,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 24), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.035;
    this.group.add(this.ring);

    // ZEP 스타일 2.5D 도트 스프라이트 루트
    this.modelRoot = new THREE.Group();
    this.modelRoot.userData.avatar = this;
    this.group.add(this.modelRoot);

    this.spriteMat = new THREE.SpriteMaterial({ transparent: true, alphaTest: 0.1 });
    this.sprite = new THREE.Sprite(this.spriteMat);
    this.sprite.userData.avatar = this;
    this.modelRoot.add(this.sprite);

    // 의자 착석 전용 수직 빌보드 메시 (바닥 중심 피벗 + 피치 기울어짐 제거 -> 의자 쿠션·등받이·책상 겹침 원천 차단!)
    const sitPlaneGeo = new THREE.PlaneGeometry(1, 1);
    sitPlaneGeo.translate(0, 0.5, 0);
    this.sitMeshMat = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });
    this.sitMesh = new THREE.Mesh(sitPlaneGeo, this.sitMeshMat);
    this.sitMesh.visible = false;
    this.sitMesh.rotation.order = 'YXZ';
    this.sitMesh.userData.avatar = this;
    this.modelRoot.add(this.sitMesh);

    // 이름표
    this.tagMat = new THREE.SpriteMaterial({ transparent: true, depthTest: false });
    this.tagSprite = new THREE.Sprite(this.tagMat);
    this.tagSprite.renderOrder = 10;
    this.group.add(this.tagSprite);

    // 말풍선
    this.bubbleMat = new THREE.SpriteMaterial({ transparent: true, depthTest: false });
    this.bubbleSprite = new THREE.Sprite(this.bubbleMat);
    this.bubbleSprite.visible = false;
    this.bubbleSprite.renderOrder = 20;
    this.group.add(this.bubbleSprite);
    this.bubbleUntil = 0;

    // ZEP 스타일 머리 위로 떠오르는 이모티콘 풀
    this.floatingEmotes = [];

    this.charHeight = 1.48;
    this.charAspect = 1;
    this.charUrl = '';
    this.isTallArmor = false;
    this.isAdmin = false;
    this.sitBundle = null;
    this.frontTex = null;
    this.backTex = null;
    this.sideRightTex = null;
    this.sideLeftTex = null;
    this.viewDir = 'front'; // 'front' | 'back' | 'sideRight' | 'sideLeft'
    this.useSitSprite = false;
    this.facingSign = 1; // 1 = 오른쪽, -1 = 왼쪽 (찌르기 방향용)
    this.sitBlend = 0;

    this.setAppearance({ charName: this.charName, charEntry, customEntry });

    // 모션 & AI 상태
    this.baseY = 0;
    this.vy = 0;
    this.jumpY = 0;
    this.facingYaw = 0; // 0 = +Z(남/정면), Math.PI = -Z(북/뒤)
    this.danceStyle = null; // null | 'bounce' | 'spin' | 'wave' | 'star'
    this.walkPhase = Math.random() * 10;
    this.happyUntil = 0;
    this.pokeStartAt = 0;
    this.pokeUntil = 0;
    this.pokedStartAt = 0;
    this.pokedUntil = 0;
    this.sitAnimAt = 0;
    this.standAnimAt = 0;
    this.landAt = 0;
    this.wasAirborne = false;
    this.moveBlend = 0;
    this.danceFxTimer = 0;
    this.seatGlide = null; // { sx, sz, sy, tx, tz, ty, t, dur }
    // 부드러운 포즈 보간 상태 (상태 전환 시 뚝 끊기지 않음!)
    this.curSx = 1;
    this.curSy = 1;
    this.curHop = 0;
    this.curRot = 0;
    this.curShiftX = 0;
    this.curShiftZ = 0;
    this.sitting = null;
    this.state = 'work';
    this.homeSeat = { x: 0, z: 0 };
    this.waypoints = [];
    this.waitTimer = 3 + Math.random() * 6;
    this.talkTimer = 4 + Math.random() * 10;
    this.followPlayer = false;
    this.currentTask = tasks[0] || '메타버스 공간 아이디어 정리';

    // 원격 플레이어 보간용
    this.remoteTarget = { x: 0, y: 0, z: 0, yaw: 0, moving: false, dance: '', sitting: false };
  }

  setAppearance({ charName, charEntry, customEntry }) {
    if (charName) this.charName = charName;
    const active = customEntry || charEntry;
    if (!active) return;

    this.charUrl = active.url;
    this.charHeight = active.height;
    this.charAspect = active.aspect;
    this.sideAspect = active.sideAspect || active.aspect;
    this.isTallArmor = !!active.isTallArmor;
    this.sitBundle = active.sitBundle || null;
    this.frontTex = active.tex;
    this.backTex = active.backTex || active.tex;
    this.sideRightTex = active.sideRightTex || active.tex;
    this.sideLeftTex = active.sideLeftTex || active.tex;
    this.viewDir = 'front';
    this.useSitSprite = false;
    this.spriteMat.map = this.frontTex;
    this.spriteMat.needsUpdate = true;
    if (this.sitMeshMat) {
      this.sitMeshMat.map = this.frontTex;
      this.sitMeshMat.needsUpdate = true;
    }
    this.sprite.scale.set(this.charHeight * this.charAspect, this.charHeight, 1);
    this.sprite.position.y = this.charHeight * 0.5 + 0.03;
    this.bubbleSprite.scale.set(3.5, 0.88, 1);
    this.refreshNameTag();
  }

  applyCurrentSpriteTex() {
    let targetTex = this.frontTex;
    if (this.useSitSprite && this.sitBundle) {
      const sitMap = {
        front: this.sitBundle.sitFrontTex,
        back: this.sitBundle.sitBackTex,
        sideRight: this.sitBundle.sitSideRightTex,
        sideLeft: this.sitBundle.sitSideLeftTex,
      };
      targetTex = sitMap[this.viewDir] || this.sitBundle.sitFrontTex || this.frontTex;
    } else {
      const mapByDir = {
        front: this.frontTex,
        back: this.backTex || this.frontTex,
        sideRight: this.sideRightTex || this.frontTex,
        sideLeft: this.sideLeftTex || this.frontTex,
      };
      targetTex = mapByDir[this.viewDir] || this.frontTex;
    }
    if (targetTex && this.spriteMat.map !== targetTex) {
      this.spriteMat.map = targetTex;
      this.spriteMat.needsUpdate = true;
      if (this.sitMeshMat) {
        this.sitMeshMat.map = targetTex;
        this.sitMeshMat.needsUpdate = true;
      }
    }
  }

  setViewDir(dir) {
    if (this.viewDir === dir) return;
    this.viewDir = dir;
    this.applyCurrentSpriteTex();
  }

  // 카메라 시선(camYaw) 대비 4방향(앞/뒤/왼옆/오른옆) 전용 텍스처로 확실하게 전환!
  updateFacingForCamera(camYaw) {
    const camFwdX = -Math.sin(camYaw);
    const camFwdZ = -Math.cos(camYaw);
    const camRightX = Math.cos(camYaw);
    const camRightZ = -Math.sin(camYaw);

    const charX = Math.sin(this.facingYaw);
    const charZ = Math.cos(this.facingYaw);

    const dotFwd = charX * camFwdX + charZ * camFwdZ;
    const dotRight = charX * camRightX + charZ * camRightZ;

    if (Math.abs(dotRight) > Math.abs(dotFwd) + 0.08) {
      if (dotRight >= 0) {
        this.setViewDir('sideRight');
        this.facingSign = 1;
      } else {
        this.setViewDir('sideLeft');
        this.facingSign = -1;
      }
    } else if (dotFwd > 0.15) {
      this.setViewDir('back');
    } else {
      this.setViewDir('front');
    }
  }

  refreshNameTag() {
    if (this.tagMat.map) this.tagMat.map.dispose();
    const adminPrefix = this.isAdmin ? '🛡️ ' : '';
    const prefix = this.isPlayer ? `${adminPrefix}👑 ` : this.isRemote ? `${adminPrefix}🟢 ` : '';
    const { tex, hasStatus } = makeNameTagTexture(`${prefix}${this.name}`, this.color, this.status);
    this.tagMat.map = tex;
    this.tagMat.needsUpdate = true;
    this.hasStatusTag = hasStatus;
    this.ringMat.color.set(this.color);
    this.tagSprite.scale.set(2.48, hasStatus ? 0.79 : 0.48, 1);
    this.tagSprite.position.y = this.charHeight + (hasStatus ? 0.48 : 0.34);
    this.bubbleSprite.position.y = this.charHeight + (hasStatus ? 1.32 : 1.06);
  }

  updateProfile({ name, status, color, charName, charEntry, customEntry, isAdmin }) {
    if (typeof name === 'string' && name.trim()) this.name = name.trim();
    if (typeof status === 'string') this.status = status.trim();
    if (color) this.color = color;
    if (typeof isAdmin === 'boolean') this.isAdmin = isAdmin;
    this.setAppearance({ charName, charEntry, customEntry });
  }

  say(text, seconds = 5.5) {
    if (this.bubbleMat.map) this.bubbleMat.map.dispose();
    this.bubbleMat.map = makeBubbleTexture(text);
    this.bubbleMat.needsUpdate = true;
    this.bubbleSprite.visible = true;
    this.bubbleUntil = performance.now() + seconds * 1000;
  }

  emote(emoji) {
    this.happyUntil = performance.now() + 850;
    const tex = getEmoteTexture(emoji || '👍');
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 1 });
    const sp = new THREE.Sprite(mat);
    sp.renderOrder = 30;

    const startX = (Math.random() - 0.5) * 0.44;
    const startY = this.charHeight + 0.58;
    sp.position.set(startX, startY, 0.08);
    sp.scale.set(0.18, 0.18, 1);
    this.group.add(sp);

    this.floatingEmotes.push({
      sprite: sp,
      mat,
      age: 0,
      duration: 2.05,
      startX,
      startY,
      riseHeight: 2.35 + Math.random() * 0.35,
      swayAmp: 0.16 + Math.random() * 0.14,
      swayFreq: 3.1 + Math.random() * 1.4,
      swayPhase: Math.random() * Math.PI * 2,
      baseScale: 0.96,
    });

    // 연타 시 과도한 누적 방지 (최대 14개 동시 표시)
    while (this.floatingEmotes.length > 14) {
      const old = this.floatingEmotes.shift();
      this.group.remove(old.sprite);
      old.mat.dispose();
    }
  }

  // 액션 전용 소형 스파클/음표 FX (찌르기·댄스·착석 시 자연스러운 생동감)
  spawnActionFx(emoji, offsetX = 0, offsetY = 0, duration = 0.85, baseScale = 0.58, offsetZ = 0) {
    const tex = getEmoteTexture(emoji || '✨');
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0.95 });
    const sp = new THREE.Sprite(mat);
    sp.renderOrder = 28;
    const startX = offsetX + (Math.random() - 0.5) * 0.24;
    const startY = this.charHeight * 0.72 + offsetY;
    const startZ = 0.12 + offsetZ;
    sp.position.set(startX, startY, startZ);
    sp.scale.set(0.14, 0.14, 1);
    this.group.add(sp);
    this.floatingEmotes.push({
      sprite: sp,
      mat,
      age: 0,
      duration,
      startX,
      startY,
      startZ,
      riseHeight: 0.95 + Math.random() * 0.35,
      swayAmp: 0.12,
      swayFreq: 4.2,
      swayPhase: Math.random() * Math.PI * 2,
      baseScale,
    });
    while (this.floatingEmotes.length > 16) {
      const old = this.floatingEmotes.shift();
      this.group.remove(old.sprite);
      old.mat.dispose();
    }
  }

  triggerPoke() {
    const now = performance.now();
    this.pokeStartAt = now;
    this.pokeUntil = now + 520;
    const fx = Math.sin(this.facingYaw);
    const fz = Math.cos(this.facingYaw);
    setTimeout(() => {
      this.spawnActionFx('✨', fx * 0.46, 0.08, 0.55, 0.54, fz * 0.46);
    }, 125);
  }

  triggerPoked() {
    const now = performance.now();
    this.pokedStartAt = now;
    this.pokedUntil = now + 760;
    this.spawnActionFx('💥', 0, 0.35, 0.65, 0.56);
  }

  startSeatGlide(tx, tz, ty, isSittingDown = true) {
    const now = performance.now();
    this.seatGlide = {
      sx: this.group.position.x,
      sz: this.group.position.z,
      sy: this.baseY,
      tx,
      tz,
      ty,
      t: 0,
      dur: isSittingDown ? 0.28 : 0.22,
      arc: isSittingDown ? 0.42 : 0.28,
    };
    if (isSittingDown) {
      this.sitAnimAt = now;
      this.spawnActionFx('✨', 0, -0.05, 0.55, 0.44);
    } else {
      this.standAnimAt = now;
    }
  }

  updateFloatingEmotes(dt) {
    if (!this.floatingEmotes.length) return;
    for (let i = this.floatingEmotes.length - 1; i >= 0; i--) {
      const em = this.floatingEmotes[i];
      em.age += dt;
      const t = em.age / em.duration;
      if (t >= 1) {
        this.group.remove(em.sprite);
        em.mat.dispose();
        this.floatingEmotes.splice(i, 1);
        continue;
      }

      // 톡! 튀어오르는 팝인 스케일 -> 안정 -> 끝부분 살짝 확대하며 사라짐
      let sc = em.baseScale;
      if (t < 0.14) {
        const p = t / 0.14;
        sc = em.baseScale * (0.2 + p * 0.98);
      } else if (t < 0.24) {
        const p = (t - 0.14) / 0.1;
        sc = em.baseScale * (1.18 - p * 0.18);
      } else if (t > 0.72) {
        const p = (t - 0.72) / 0.28;
        sc = em.baseScale * (1 + p * 0.14);
      }

      // 부드럽게 위로 떠오르며 좌우 살랑임
      const riseEase = 1 - Math.pow(1 - t, 1.75);
      const y = em.startY + riseEase * em.riseHeight;
      const x = em.startX + Math.sin(em.age * em.swayFreq + em.swayPhase) * em.swayAmp * (0.35 + t * 0.65);
      const tilt = Math.cos(em.age * em.swayFreq + em.swayPhase) * 0.13;

      em.sprite.position.set(x, y, em.startZ ?? 0.08);
      em.sprite.scale.set(sc, sc, 1);
      em.mat.rotation = tilt;
      em.mat.opacity = t > 0.62 ? Math.max(0, 1 - (t - 0.62) / 0.38) : 1;
    }
  }

  setPos(x, z, baseY = 0) {
    this.baseY = baseY;
    this.group.position.set(x, baseY + this.jumpY, z);
  }

  faceToward(tx, tz) {
    const dx = tx - this.group.position.x;
    const dz = tz - this.group.position.z;
    if (Math.hypot(dx, dz) > 0.02) {
      this.facingYaw = Math.atan2(dx, dz);
    }
  }

  setRoute(destX, destZ, destBaseY = 0, endYaw = null) {
    const sx = this.group.position.x, sz = this.group.position.z;
    const pts = [];
    const inStage = (z) => z < -11.2;
    const inCEO = (x, z) => x < -5.5 && z < -2.2 && z >= -11.2;
    const inMeet = (x, z) => x < -5.5 && z > -0.8 && z < 5.2;

    if (inStage(sz) && !inStage(destZ)) {
      pts.push({ x: -11.5, z: -12.0, y: 0 }, { x: -11.5, z: -9.8, y: 0 });
      if (!inCEO(destX, destZ)) pts.push({ x: -7.5, z: -2.2, y: 0 }, { x: -4.2, z: -1.4, y: 0 });
    } else if (inCEO(sx, sz) && !inCEO(destX, destZ)) {
      if (inStage(destZ)) pts.push({ x: -11.5, z: -10.4, y: 0 }, { x: -11.5, z: -12.4, y: 0 });
      else pts.push({ x: -7.5, z: -2.2, y: 0 }, { x: -4.2, z: -1.4, y: 0 });
    } else if (inMeet(sx, sz) && !inMeet(destX, destZ)) {
      pts.push({ x: -4.4, z: 2.2, y: 0 });
    }

    if (inStage(destZ) && !inStage(sz)) {
      if (!inCEO(sx, sz)) pts.push({ x: -4.2, z: -1.4, y: 0 }, { x: -7.5, z: -2.2, y: 0 });
      pts.push({ x: -11.5, z: -10.0, y: 0 }, { x: -11.5, z: -13.0, y: 0 });
      if (destBaseY > 0.1) pts.push({ x: -11.5, z: -21.2, y: 0.2 }, { x: -11.5, z: -22.8, y: destBaseY });
    } else if (inCEO(destX, destZ) && !inCEO(sx, sz) && !inStage(sz)) {
      pts.push({ x: -4.2, z: -1.4, y: 0 }, { x: -7.5, z: -2.2, y: 0 });
    } else if (inMeet(destX, destZ) && !inMeet(sx, sz)) {
      pts.push({ x: -4.2, z: 2.2, y: 0 }, { x: -6.4, z: 2.2, y: 0 });
    }

    pts.push({ x: destX, z: destZ, y: destBaseY, endYaw });
    this.waypoints = pts;
  }

  animateVisual(dt, elapsed, isMoving, danceMode = null, camYaw = 0) {
    if (this.bubbleSprite.visible && performance.now() > this.bubbleUntil) {
      this.bubbleSprite.visible = false;
    }

    // 부드러운 의자 착석/기립 포물선 이동 보간
    if (this.seatGlide) {
      const g = this.seatGlide;
      g.t = Math.min(1, g.t + dt / g.dur);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - g.t, 3);
      const gx = g.sx + (g.tx - g.sx) * ease;
      const gz = g.sz + (g.tz - g.sz) * ease;
      const gy = g.sy + (g.ty - g.sy) * ease + Math.sin(g.t * Math.PI) * g.arc;
      this.baseY = gy;
      this.group.position.x = gx;
      this.group.position.z = gz;
      if (g.t >= 1) {
        this.baseY = g.ty;
        this.group.position.x = g.tx;
        this.group.position.z = g.tz;
        this.seatGlide = null;
      }
    }

    const activeDance = danceMode || this.danceStyle;
    const baseW = this.charHeight * this.charAspect;
    const baseH = this.charHeight;
    const nowMs = performance.now();
    const isHappy = nowMs < this.happyUntil;
    const isPoking = nowMs < this.pokeUntil;
    const isPoked = nowMs < this.pokedUntil;
    const isSitting = !!this.sitting;

    // 점프 착지 순간 감지 -> 탄성 있는 착지 스쿼시!
    if (this.jumpY > 0.05) {
      this.wasAirborne = true;
    } else if (this.wasAirborne && this.jumpY <= 0.005) {
      this.wasAirborne = false;
      this.landAt = nowMs;
    }

    // 걷기/정지 부드러운 가감속 블렌드
    const moveTarget = isMoving ? 1 : 0;
    this.moveBlend += (moveTarget - this.moveBlend) * Math.min(1, dt * 11);

    let sy = 1, sx = 1, hop = 0, rot = 0, shiftX = 0, shiftZ = 0;

    if (activeDance) {
      this.danceFxTimer -= dt;
      if (this.danceFxTimer <= 0) {
        const fxPool = activeDance === 'star' ? ['⭐', '✨'] : activeDance === 'spin' ? ['✨', '💫'] : ['🎵', '🎶', '✨'];
        this.spawnActionFx(fxPool[Math.floor(Math.random() * fxPool.length)], (Math.random() - 0.5) * 0.55, 0.25, 0.95, 0.52);
        this.danceFxTimer = activeDance === 'star' ? 0.65 : 0.9;
      }
    } else {
      this.danceFxTimer = 0.25;
    }

    if (activeDance === 'spin') {
      // 🌀 자연스러운 3D 피루엣 스핀 댄스 (90° 전환 시 가로 원근 수축 + 경쾌한 리듬 홉!)
      const phase = elapsed * 4.8 + this.walkPhase;
      const quarter = phase / (Math.PI / 2);
      const step = ((Math.floor(quarter + 0.5) % 4) + 4) % 4;
      if (step === 0) this.setViewDir('front');
      else if (step === 1) this.setViewDir('sideRight');
      else if (step === 2) this.setViewDir('back');
      else this.setViewDir('sideLeft');
      // 90° 경계에서 살짝 좁아졌다 펼쳐져 진짜 입체 회전처럼 보이게 연출
      const turnSqueeze = 0.64 + 0.36 * Math.abs(Math.cos(phase));
      const beat = Math.pow(Math.abs(Math.sin(phase * 1.5)), 0.8);
      hop = beat * 0.32;
      sx = turnSqueeze * (1 + (1 - beat) * 0.08);
      sy = 1 + beat * 0.1 - 0.04;
      rot = Math.sin(phase) * 0.11;
    } else {
      if (activeDance === 'wave') {
        // 🕺 부드러운 8자 그루브 웨이브 (상체 기울기가 스텝보다 살짝 늦게 따라오는 팔로우스루!)
        const beat = elapsed * 5.8 + this.walkPhase;
        const stepWave = Math.sin(beat);
        const followLag = Math.sin(beat - 0.45);
        const bounce = Math.pow(Math.abs(Math.sin(beat * 2)), 0.78);
        shiftX = stepWave * 0.3;
        hop = bounce * 0.18;
        sx = 1 + (1 - bounce) * 0.09;
        sy = 1 + bounce * 0.06 - 0.04;
        rot = followLag * 0.22;
        if (Math.cos(beat) > 0.2) this.setViewDir('sideRight');
        else if (Math.cos(beat) < -0.2) this.setViewDir('sideLeft');
        else this.setViewDir('front');
      } else {
        this.updateFacingForCamera(camYaw);
        if (activeDance === 'star') {
          // 🌟 슈퍼 스타 점프: 깊은 준비 웅크림 -> 공중 신장 & 회전 -> 푹신한 착지 스쿼시!
          const cycle = (elapsed * 1.45 + this.walkPhase) % 1;
          if (cycle < 0.22) {
            // 준비 웅크림 (Anticipation)
            const p = Math.sin((cycle / 0.22) * Math.PI * 0.5);
            sx = 1 + p * 0.2;
            sy = 1 - p * 0.18;
            hop = 0;
            rot = -p * 0.08;
          } else if (cycle < 0.76) {
            // 폭발적인 스타 점프 + 공중 플러리시
            const p = (cycle - 0.22) / 0.54;
            const arc = Math.sin(p * Math.PI);
            hop = arc * 0.72;
            const spinSqueeze = 0.72 + 0.28 * Math.abs(Math.cos(p * Math.PI * 2));
            sx = spinSqueeze * (1 - arc * 0.12);
            sy = 1 + arc * 0.18;
            rot = Math.sin(p * Math.PI * 2) * 0.24;
          } else {
            // 탄성 착지 스쿼시
            const p = (cycle - 0.76) / 0.24;
            const damp = Math.sin(p * Math.PI) * (1 - p * 0.45);
            sx = 1 + damp * 0.18;
            sy = 1 - damp * 0.15;
            hop = 0;
            rot = 0;
          }
        } else if (activeDance === 'bounce' || activeDance === true) {
          // 🎵 통통 아이돌 그루브 댄스 (좌우 리듬 틸트 + 탄성 더블 바운스)
          const beat = elapsed * 6.6 + this.walkPhase;
          const b = Math.pow(Math.abs(Math.sin(beat)), 0.72);
          const groove = Math.sin(beat * 0.5);
          hop = b * 0.36;
          shiftX = groove * 0.12;
          sx = 1 + (1 - b) * 0.12;
          sy = 1 + b * 0.09 - 0.05;
          rot = groove * 0.17 + Math.sin(beat) * 0.05;
        } else if (isPoking) {
          // 👉 3단계 찌르기 모션: 보고 있는 방향(facingYaw)으로 뒤로 힘 모으기 -> 빠른 전진 찌르기 -> 탄성 복귀!
          const dur = Math.max(1, this.pokeUntil - this.pokeStartAt);
          const t = Math.max(0, Math.min(1, (nowMs - this.pokeStartAt) / dur));
          const fx = Math.sin(this.facingYaw);
          const fz = Math.cos(this.facingYaw);
          const screenDot = fx * Math.cos(camYaw) - fz * Math.sin(camYaw);
          const tiltSign = Math.abs(screenDot) > 0.15 ? Math.sign(screenDot) : 0;
          let lunge = 0;
          if (t < 0.22) {
            // 1) 예비 동작 (보고 있는 반대쪽으로 살짝 당기며 웅크림)
            const p = Math.sin((t / 0.22) * Math.PI * 0.5);
            lunge = -0.14 * p;
            sx = 1 + 0.08 * p;
            sy = 1 - 0.09 * p;
            rot = tiltSign * 0.1 * p;
          } else if (t < 0.52) {
            // 2) 보고 있는 방향으로 빠르고 경쾌한 찌르기 런지!
            const p = (t - 0.22) / 0.30;
            const thrust = Math.sin(p * Math.PI * 0.5);
            lunge = -0.14 + 0.52 * thrust;
            hop = Math.sin(p * Math.PI) * 0.11;
            sx = 1 + 0.16 * thrust;
            sy = 1 - 0.09 * thrust;
            rot = -tiltSign * 0.23 * thrust;
          } else {
            // 3) 부드러운 탄성 스프링 복귀
            const p = (t - 0.52) / 0.48;
            const spring = Math.exp(-4.5 * p) * Math.cos(p * Math.PI * 1.5);
            lunge = 0.38 * spring;
            sx = 1 + 0.1 * spring;
            sy = 1 - 0.06 * spring;
            rot = -tiltSign * 0.2 * spring;
          }
          shiftX = fx * lunge;
          shiftZ = fz * lunge;
        } else if (isPoked) {
          // 😮 찔렸을 때: 깜짝 점프 -> 착지 후 부르르 회복!
          const dur = Math.max(1, this.pokedUntil - this.pokedStartAt);
          const t = Math.max(0, Math.min(1, (nowMs - this.pokedStartAt) / dur));
          if (t < 0.45) {
            const p = t / 0.45;
            const jump = Math.sin(p * Math.PI);
            hop = jump * 0.42;
            sx = 1 - jump * 0.1;
            sy = 1 + jump * 0.15;
            rot = Math.sin(p * Math.PI * 4) * 0.18;
          } else {
            const p = (t - 0.45) / 0.55;
            const wiggle = Math.exp(-3.5 * p) * Math.sin(p * Math.PI * 5);
            sx = 1 + Math.abs(wiggle) * 0.1;
            sy = 1 - Math.abs(wiggle) * 0.08;
            rot = wiggle * 0.16;
          }
        } else if (isHappy) {
          const b = Math.pow(Math.abs(Math.sin(elapsed * 9.5)), 0.75);
          hop = b * 0.26;
          sx = 1 + (1 - b) * 0.08;
          sy = 1 + b * 0.08 - 0.04;
          rot = Math.sin(elapsed * 9.5) * 0.09;
        } else if (isSitting) {
          // 🪑 전 캐릭터 자연스러운 2.5D 착석 모션: 얼굴 찌그러짐 없이 착석 순간만 톡! 안착 바운스 + 편안한 호흡 리듬!
          const onFurniture = this.sitting && !this.sitting.floor;
          const sitAge = (nowMs - this.sitAnimAt) / 1000;
          let settleSquash = 0;
          if (sitAge >= 0 && sitAge < 0.42) {
            const p = sitAge / 0.42;
            settleSquash = Math.exp(-5.5 * p) * Math.sin(p * Math.PI * 1.8) * 0.09;
          }
          const br = Math.sin(elapsed * 2.0 + this.walkPhase);
          const sway = Math.sin(elapsed * 1.25 + this.walkPhase) * (onFurniture ? 0.02 : 0.016);
          const typePulse = onFurniture && Math.sin(elapsed * 0.6 + this.walkPhase) > 0.35
            ? Math.abs(Math.sin(elapsed * 10.5)) * 0.012
            : 0;
          if (this.sitBundle) {
            // 전용 2.5D 착석 텍스처 사용 -> 원본 얼굴·비율 100% 보존, 미세 호흡만 자연스럽게!
            sx = 1.01 + br * 0.01 + settleSquash;
            sy = 0.99 - br * 0.01 - settleSquash - typePulse;
            hop = typePulse * 0.35;
          } else {
            sx = (onFurniture ? 1.03 : 1.06) + br * 0.012 + settleSquash;
            sy = (onFurniture ? 0.94 : 0.90) - br * 0.012 - settleSquash - typePulse;
            hop = typePulse * 0.35;
          }
          rot = sway;
        } else {
          // 🚶 자연스러운 가감속 걷기 + 편안한 대기 호흡 블렌딩!
          if (this.moveBlend > 0.02) {
            this.walkPhase += dt * (10.5 + this.moveBlend * 3.2);
          }
          const s = Math.sin(this.walkPhase);
          const stepArc = Math.pow(Math.abs(s), 0.82);
          const br = Math.sin(elapsed * 2.4 + this.walkPhase * 0.15);

          const walkHop = stepArc * 0.17;
          const walkSx = 1 + (1 - stepArc) * 0.065;
          const walkSy = 1 + stepArc * 0.055 - 0.025;
          const walkRot = s * 0.085;

          const idleSx = 1 + br * 0.018;
          const idleSy = 1 - br * 0.02;

          hop = walkHop * this.moveBlend;
          sx = idleSx + (walkSx - idleSx) * this.moveBlend;
          sy = idleSy + (walkSy - idleSy) * this.moveBlend;
          rot = walkRot * this.moveBlend;

          // 기립 직후 산뜻한 탄성 반동
          const standAge = (nowMs - this.standAnimAt) / 1000;
          if (standAge >= 0 && standAge < 0.35) {
            const p = standAge / 0.35;
            const bounce = Math.sin(p * Math.PI) * (1 - p * 0.4);
            sy += bounce * 0.08;
            sx -= bounce * 0.06;
          }
        }
      }
    }

    // 점프 중 공중 신장 & 착지 탄성 스쿼시 합성
    if (this.jumpY > 0.04) {
      const airStretch = Math.min(0.14, this.jumpY * 0.12);
      sy += airStretch;
      sx -= airStretch * 0.7;
    } else if (nowMs - this.landAt < 260) {
      const p = (nowMs - this.landAt) / 260;
      const squash = Math.sin(p * Math.PI) * (1 - p * 0.5);
      sx += squash * 0.16;
      sy -= squash * 0.14;
    }

    // 모든 포즈 값을 부드럽게 보간해 상태 전환이 뚝 끊기지 않게 처리!
    const smoothK = 1 - Math.exp(-(isPoking || isPoked ? 28 : 18) * dt);
    this.curSx += (sx - this.curSx) * smoothK;
    this.curSy += (sy - this.curSy) * smoothK;
    this.curHop += (hop - this.curHop) * smoothK;
    this.curRot += (rot - this.curRot) * smoothK;
    this.curShiftX += (shiftX - this.curShiftX) * smoothK;
    this.curShiftZ += (shiftZ - this.curShiftZ) * smoothK;

    // 전 캐릭터 2.5D 착석 포즈 스프라이트 전환 & 부드러운 높이/쿠션 밀착 보간!
    const wantSitSprite = !!(this.sitBundle && isSitting && !activeDance && !isPoking);
    if (this.useSitSprite !== wantSitSprite) {
      this.useSitSprite = wantSitSprite;
      this.applyCurrentSpriteTex();
    }
    const sitBlendTarget = wantSitSprite ? 1 : 0;
    this.sitBlend += (sitBlendTarget - this.sitBlend) * Math.min(1, dt * 16);

    const onChair = isSitting && this.sitting && !this.sitting.floor;
    const isSideView = this.viewDir === 'sideRight' || this.viewDir === 'sideLeft';
    const curBaseW = baseH * (isSideView ? (this.sideAspect || this.charAspect) : this.charAspect);
    let effH = baseH;
    let effW = curBaseW;
    let seatDrop = 0;
    if (this.sitBundle && this.sitBlend > 0.005) {
      const sitH = baseH * this.sitBundle.sitHeightRatio;
      const sitW = sitH * (isSideView ? this.sitBundle.sitSideAspect : this.sitBundle.sitFrontAspect);
      effH = baseH + (sitH - baseH) * this.sitBlend;
      effW = curBaseW + (sitW - curBaseW) * this.sitBlend;
      if (onChair) {
        if (this.isTallArmor || baseH > 2.2) {
          // 2배 키 갑옷 씨·3배 키 세이렌: 의자 쿠션 윗면(Y=seat.y)에 깔끔히 안착 (쿠션·등받이 침투/겹침 방지!)
          seatDrop = 0;
        } else {
          // 소형 먼작귀 캐릭터: 쿠션 윗면에 포근하게 밀착
          seatDrop = -0.01 * this.sitBlend;
        }
      }
    }

    const visH = effH * this.curSy;
    const useChairMesh = !!(this.sitMesh && onChair && !activeDance && !isPoking && !this.seatGlide);
    if (useChairMesh) {
      // 갑옷 씨 착석 시 등받이와 측면에서도 겹치지 않도록 의자 앞쪽으로 살짝 여유 확보
      const fwdClear = this.isTallArmor ? 0.06 * this.sitBlend : 0;
      const fx = Math.sin(this.facingYaw) * fwdClear;
      const fz = Math.cos(this.facingYaw) * fwdClear;
      this.sprite.visible = false;
      this.sitMesh.visible = true;
      this.sitMesh.scale.set(effW * this.curSx, visH, 1);
      this.sitMesh.position.set(this.curShiftX + fx, 0.015 + this.curHop + seatDrop, this.curShiftZ + fz);
      this.sitMesh.rotation.y = camYaw;
      this.sitMesh.rotation.z = this.curRot;
    } else {
      if (this.sitMesh) this.sitMesh.visible = false;
      this.sprite.visible = true;
      this.sprite.scale.set(effW * this.curSx, visH, 1);
      this.sprite.position.set(this.curShiftX, visH * 0.5 + 0.03 + this.curHop + seatDrop, this.curShiftZ);
      this.sprite.material.rotation = this.curRot;
    }
    this.group.position.y = this.baseY + this.jumpY;

    // 착석 시 머리 높이에 맞춰 이름표·말풍선도 자연스럽게 함께 내려옴!
    const topY = visH + seatDrop;
    const hasSt = !!this.hasStatusTag;
    this.tagSprite.position.y = topY + (hasSt ? 0.48 : 0.34);
    this.bubbleSprite.position.y = topY + (hasSt ? 1.32 : 1.06);

    // 점프·호핑·의자 착석 시 바닥 그림자와 링이 의자를 뚫지 않도록 깔끔히 정렬!
    const totalAir = Math.max(0, this.jumpY + this.curHop);
    const sizeFootScale = baseH > 3.2 ? 1.85 : baseH > 2.2 ? 1.25 : 1.0;
    if (this.shadowDisc && this.shadowMat) {
      if (onChair) {
        // 의자에 앉았을 때는 쿠션 위 은은한 소형 접촉 그림자만 표시
        this.shadowDisc.scale.setScalar(this.isTallArmor ? 0.62 : 0.72);
        this.shadowDisc.position.y = -this.jumpY + 0.015;
        this.shadowMat.opacity = 0.16;
      } else {
        const shScale = Math.max(0.42, (isSitting ? 0.92 : 1) - totalAir * 0.38) * sizeFootScale;
        this.shadowDisc.scale.setScalar(shScale);
        this.shadowDisc.position.y = -this.jumpY + 0.025;
        this.shadowMat.opacity = Math.max(0.08, 0.24 - totalAir * 0.12);
      }
    }
    if (this.ring) {
      // 의자/소파 착석 시 바닥 링이 의자 쿠션을 뚫고 뜨는 어색함 제거!
      this.ring.visible = !onChair;
      this.ring.position.y = -this.jumpY + 0.035;
      this.ring.scale.setScalar((isSitting ? 0.96 : 1) * sizeFootScale);
    }

    this.updateFloatingEmotes(dt);
  }
}

export async function createStaffAndPlayer(scene, officeConfig) {
  const bank = new TextureBank();
  const charList = officeConfig.characters || [];
  const entries = {};
  await Promise.all(
    charList.map(async (c) => {
      const url = c.poses?.front ? `/${c.poses.front}` : `/characters/${encodeURIComponent(c.name)}.png`;
      const loaded = await bank.loadCharacter(c.name, url);
      if (loaded) entries[c.name] = loaded;
    })
  );
  const allEntries = Object.entries(entries);
  const pickEntry = (name, idx = 0) => entries[name] || (allEntries.length ? allEntries[idx % allEntries.length][1] : null);

  // 플레이어 (2.5D 도트 원본 캐릭터 + 자동 뒷모습)
  const bossCharName = officeConfig.bossCharacter || '랏코';
  const player = new Avatar3D({
    id: 'ceo',
    name: officeConfig.boss || '랏코',
    charName: bossCharName,
    teamKey: 'ceo',
    teamName: `${officeConfig.boss || '대표'}실`,
    color: '#F2C14E',
    charEntry: pickEntry(bossCharName, 0),
    isPlayer: true,
  });
  player.setPos(-11.2, -5.2, 0);
  scene.add(player.group);

  // 메타버스에서는 기존 AI 직원 NPC를 배치하지 않고 실제 접속자만 표시
  const npcs = [];

  // 원격 실제 접속자 관리
  const remotes = new Map();

  async function resolveCustomEntry(customAvatar) {
    if (!customAvatar) return null;
    return await bank.loadFromUrl(customAvatar, false, 'custom');
  }

  async function upsertRemote(data) {
    const customEntry = await resolveCustomEntry(data.customAvatar);
    const charEntry = pickEntry(data.charName, 0);
    let av = remotes.get(data.id);
    if (!av) {
      av = new Avatar3D({
        id: data.id,
        name: data.name || '게스트',
        status: data.status || '',
        charName: data.charName || '치이카와',
        color: data.color || '#58B98A',
        charEntry,
        customEntry,
        isRemote: true,
      });
      if (data.isAdmin) { av.isAdmin = true; av.refreshNameTag(); }
      av.setPos(data.x ?? -11.2, data.z ?? -5.2, data.y ?? 0);
      av.remoteTarget = { x: data.x ?? -11.2, y: data.y ?? 0, z: data.z ?? -5.2, yaw: data.yaw ?? 0, moving: false, dance: data.dance || '', sitting: !!data.sitting, sittingFloor: !!data.sittingFloor };
      scene.add(av.group);
      remotes.set(data.id, av);
    } else {
      av.updateProfile({
        name: data.name,
        status: data.status,
        color: data.color,
        charName: data.charName,
        charEntry,
        customEntry,
        isAdmin: typeof data.isAdmin === 'boolean' ? data.isAdmin : av.isAdmin,
      });
    }
    return av;
  }

  function removeRemote(id) {
    const av = remotes.get(id);
    if (!av) return;
    scene.remove(av.group);
    remotes.delete(id);
  }

  function updateRemotes(dt, elapsed, camYaw) {
    for (const av of remotes.values()) {
      const t = av.remoteTarget;
      const dx = t.x - av.group.position.x;
      const dz = t.z - av.group.position.z;
      const dist = Math.hypot(dx, dz);
      const k = Math.min(1, dt * 12);
      av.group.position.x += dx * k;
      av.group.position.z += dz * k;
      av.baseY += (t.y - av.baseY) * k;
      if (Number.isFinite(t.yaw)) av.facingYaw = t.yaw;
      else if (dist > 0.05) av.facingYaw = Math.atan2(dx, dz);
      av.danceStyle = t.dance || null;
      const wasSitting = !!av.sitting;
      av.sitting = t.sitting ? { floor: !!t.sittingFloor } : null;
      if (t.sitting && !wasSitting) av.sitAnimAt = performance.now();
      else if (!t.sitting && wasSitting) av.standAnimAt = performance.now();
      av.animateVisual(dt, elapsed, t.moving || dist > 0.08, av.danceStyle, camYaw);
    }
  }

  // 모드 전환 함수들
  let worldMode = 'work';

  function startMeeting() {
    worldMode = 'meeting';
    npcs.forEach((n, idx) => {
      n.followPlayer = false;
      n.state = 'meeting';
      const seat = LAYOUT.meetingSeats[idx % LAYOUT.meetingSeats.length];
      n.setRoute(seat.x, seat.z, 0, seat.rotY);
      const line = n.persona.meeting[Math.floor(Math.random() * n.persona.meeting.length)];
      setTimeout(() => { if (worldMode === 'meeting') n.say(line, 6.5); }, 900 + idx * 550);
    });
  }

  function startShow() {
    worldMode = 'show';
    npcs.forEach((n, idx) => {
      n.followPlayer = false;
      if (idx < LAYOUT.stagePerformers.length) {
        n.state = 'perform';
        const spot = LAYOUT.stagePerformers[idx];
        n.setRoute(spot.x, spot.z, spot.y, 0);
      } else {
        n.state = 'watch';
        const aud = LAYOUT.stageAudience[(idx - LAYOUT.stagePerformers.length) % LAYOUT.stageAudience.length];
        n.setRoute(aud.x, aud.z, 0, Math.PI);
      }
      const line = n.persona.show[Math.floor(Math.random() * n.persona.show.length)];
      setTimeout(() => { if (worldMode === 'show') n.say(line, 5.5); }, 1200 + idx * 450);
    });
  }

  function returnToWork() {
    worldMode = 'work';
    npcs.forEach((n) => {
      n.followPlayer = false;
      n.state = 'work';
      n.setRoute(n.homeSeat.x, n.homeSeat.z, 0, 0);
    });
  }

  function updateNPCs(dt, elapsed, camYaw) {
    for (const n of npcs) {
      let moving = false;

      if (n.followPlayer) {
        const dx = player.group.position.x - n.group.position.x;
        const dz = player.group.position.z - n.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 2.2) {
          const spd = Math.min(5.2, dist * 1.4) * dt;
          n.group.position.x += (dx / dist) * spd;
          n.group.position.z += (dz / dist) * spd;
          n.baseY = player.baseY;
          n.facingYaw = Math.atan2(dx, dz);
          moving = true;
        } else {
          n.faceToward(player.group.position.x, player.group.position.z);
        }
      } else if (n.waypoints.length) {
        const wp = n.waypoints[0];
        const dx = wp.x - n.group.position.x;
        const dz = wp.z - n.group.position.z;
        const dist = Math.hypot(dx, dz);
        const speed = (worldMode === 'work' ? 3.4 : 5.2) * dt;
        if (dist <= speed) {
          n.setPos(wp.x, wp.z, wp.y);
          if (wp.endYaw !== null && wp.endYaw !== undefined) n.facingYaw = wp.endYaw;
          n.waypoints.shift();
        } else {
          n.group.position.x += (dx / dist) * speed;
          n.group.position.z += (dz / dist) * speed;
          n.baseY += (wp.y - n.baseY) * Math.min(1, dt * 8);
          n.facingYaw = Math.atan2(dx, dz);
          moving = true;
        }
      } else {
        if (worldMode === 'work') {
          n.waitTimer -= dt;
          if (n.waitTimer <= 0) {
            if (n.state === 'work' && Math.random() < 0.28) {
              n.state = 'break';
              const spot = LAYOUT.loungeSpots[Math.floor(Math.random() * LAYOUT.loungeSpots.length)];
              n.setRoute(spot.x, spot.z, 0, spot.rotY);
              n.say('쉬는 시간! 매점 다녀올게요 🍞', 4);
              n.waitTimer = 10 + Math.random() * 10;
            } else if (n.state === 'break') {
              n.state = 'work';
              n.setRoute(n.homeSeat.x, n.homeSeat.z, 0, 0);
              n.say('다시 자리에서 일해야지!', 3.5);
              n.waitTimer = 14 + Math.random() * 14;
            } else {
              n.waitTimer = 8 + Math.random() * 10;
            }
          }
        }
        n.talkTimer -= dt;
        if (n.talkTimer <= 0) {
          if (worldMode === 'meeting') {
            n.say(n.persona.meeting[Math.floor(Math.random() * n.persona.meeting.length)], 5.5);
            n.talkTimer = 7 + Math.random() * 9;
          } else if (worldMode === 'show') {
            n.say(n.persona.show[Math.floor(Math.random() * n.persona.show.length)], 4.5);
            n.talkTimer = 5 + Math.random() * 7;
          } else if (n.state === 'work') {
            const task = n.tasks[Math.floor(Math.random() * n.tasks.length)];
            n.currentTask = task;
            n.say(`${task} 진행 중!`, 4.8);
            n.talkTimer = 12 + Math.random() * 15;
          } else {
            n.talkTimer = 10 + Math.random() * 10;
          }
        }
      }

      const dancing = worldMode === 'show' && n.state === 'perform' && !moving ? 'bounce' : null;
      n.animateVisual(dt, elapsed, moving, dancing, camYaw);
    }
  }

  return {
    bank,
    player,
    npcs,
    remotes,
    entries,
    pickEntry,
    resolveCustomEntry,
    upsertRemote,
    removeRemote,
    updateRemotes,
    getMode: () => worldMode,
    startMeeting,
    startShow,
    returnToWork,
    updateNPCs,
  };
}
