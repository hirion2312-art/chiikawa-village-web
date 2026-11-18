'use strict';

// 오픈월드: 지형, 길, 강, 식생과 장소 전체. 배치 기획은 WORLD.md
const WORLD_SIZE = 1200;
const GRID = 480;
const CELL = WORLD_SIZE / GRID;
const MAX_WALK_HEIGHT = 15;

let worldSeed = 20261102;
function rand(min = 0, max = 1) {
  worldSeed = (worldSeed * 1664525 + 1013904223) >>> 0;
  return min + (worldSeed / 4294967296) * (max - min);
}

function smoothstep(a, b, v) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* ---------- 지도 데이터 ---------- */


// 넓게 칠할 땅 구역. 숲은 나무 밀도(trees)도 함께 정한다. 이 세계는 빽빽하지 않으므로 초원은 비워 둔다
const ZONES = [
  { name: '마을 거리', x: 90, z: 0, r: 190, color: '#f6efd8', trees: 0 },
  { name: '초원', x: -190, z: 110, r: 130, color: '#cfe6ab', trees: 0.0009 },
  { name: '언덕', x: -225, z: -10, r: 50, color: '#d3cfc0', trees: 0.001 },
  { name: '치이카와의 집 앞', x: -146, z: 66, r: 48, color: '#f3e7c8', trees: 0 },
  { name: '숲', x: 95, z: -205, r: 115, color: '#a7d394', trees: 0.011 },
  { name: '숲', x: -175, z: -205, r: 85, color: '#a2d090', trees: 0.012 },
  { name: '마롱글라세의 숲', x: 292, z: -78, r: 44, color: '#e6d9aa', trees: 0.009, marron: true },
  { name: '토벌 구역', x: 205, z: 160, r: 80, color: '#eadfb4', trees: 0.0006 },
  // 야생 반도: 토벌 구역 동쪽으로 갈수록 숲이 짙어지고 괴물이 커진다 (2026-11-09 이재헌 지시 9번)
  { name: '야생의 숲', x: 335, z: 240, r: 62, color: '#b9d79a', trees: 0.009 },
  { name: '깊은 숲', x: 448, z: 292, r: 74, color: '#97c283', trees: 0.016 },
];

// 포장한 길은 마을 안쪽만이다. 마을 밖은 사람들이 걸어 다녀 생긴 흙길
const ROADS = [
  // 마을 거리: 광장에서 동쪽으로 뻗어 무차우마켓 앞에서 끝난다
  { w: 24, paved: true, points: [[26, 0], [244, 0]] },
  { w: 11, paved: true, points: [[-26, 0], [-100, 0]] },
  { w: 11, paved: true, points: [[0, -26], [0, -92]] },
  { w: 11, paved: true, points: [[0, 26], [0, 72]] },
  // 온천과 사우나로 빠지는 골목
  { w: 8, paved: true, points: [[108, -10], [108, -60]] },
  { w: 6, points: [[108, -60], [140, -72], [152, -84]] },
  // 주거지로 가는 길. 치이카와 집에서 하치와레 동굴까지 걸어서 놀러 간다
  { w: 7, points: [[-100, 0], [-122, 4], [-130, 34], [-128, 66]] },
  { w: 5, points: [[-130, 30], [-160, 22], [-166, 14], [-178, -16], [-194, -28], [-189, -14], [-188, 6]] },
  { w: 5, points: [[-130, 84], [-180, 100], [-222, 114]] },
  { w: 6, points: [[0, 72], [0, 110], [0, 310]] },
  { w: 5, points: [[0, 112], [-60, 114], [-100, 130]] },
  { w: 5, points: [[0, -92], [28, -106], [50, -130]] },
  { w: 6, points: [[172, 392], [175, 435], [175, 450], [212, 490]] },
  { w: 5, points: [[175, 450], [130, 455]] },
  { w: 5, points: [[175, 450], [222, 442]] },
  // 야생 반도로 들어가는 흙길
  { w: 4, points: [[186, 214], [232, 226], [276, 238], [306, 244]] },
  { w: 3, points: [[374, 252], [400, 268], [412, 282]] },
];

const RIVERS = [
  { name: '된장국 강', color: 0xcda673, points: [[-30, -300], [10, -250], [40, -205], [92, -165], [170, -150], [250, -118], [345, -110]] },
  { name: '맑은 강', color: 0xa4dcec, points: [[-175, -285], [-225, -190], [-235, -95], [-300, -40], [-365, -18]] },
];

// 장소 표. conf: 근거 수준(o 원작 확인, b 원작 기반, f 팬 기반). placed: 관계에 근거가 있어 고정한 위치. 나머지 위치는 전부 추정 배치
// optional: 명세의 25곳에 없어 지금은 지도에서 뺀 장소. true를 지우면 바로 다시 나타난다
const ALL_PLACES = [
  { id: 'plaza', name: '광장', jp: '広場', conf: 'o', placed: true, x: 0, z: 0, r: 30 },
  // 주거지에서 마을로 들어오는 길목
  { id: 'reception', name: '노동 접수처', jp: '労働の受付', conf: 'o', placed: true, x: -66, z: -26, r: 20 },
  { id: 'exam', name: '풀뽑기 검정 시험장', jp: '草むしり検定 会場', conf: 'o', x: -36, z: -66, r: 20, face: 1 },
  { id: 'market', name: '시장', jp: 'マーケットプレイス', conf: 'f', placed: true, x: -58, z: 46, r: 26, face: 2 },
  { id: 'internet', name: '인터넷 코너', jp: 'インターネットコーナー', conf: 'o', placed: true, x: 44, z: -24, r: 12 },

  // 라멘 로와 야마는 길 하나를 사이에 두고 마주 본다
  { id: 'ramenRo', name: '라멘 로', jp: 'ラーメン 郎', conf: 'o', placed: true, x: 84, z: -26, r: 14 },
  { id: 'ramenYama', name: '라멘 야마', jp: 'ラーメン 山', conf: 'o', placed: true, x: 84, z: 26, r: 14, face: 2 },
  { id: 'umaCurry', name: '우마카레', jp: 'うまカレー', conf: 'b', placed: true, x: 126, z: -26, r: 14 },
  { id: 'umaiya', name: '우마이야', jp: 'うまい屋', conf: 'b', placed: true, x: 126, z: 26, r: 15, face: 2 },
  { id: 'kissa', name: '찻집', jp: '喫茶店', conf: 'o', placed: true, x: 172, z: -26, r: 14 },
  { id: 'mitsuboshi', optional: true, name: '미츠보시 레스토랑 (가짜)', jp: '三ツ星レストラン', conf: 'o', placed: true, x: 188, z: 26, r: 15, face: 2 },
  // 거리 끝을 막아선 대형 슈퍼
  { id: 'mucha', name: '무차우마켓', jp: 'むちゃうマーケット', conf: 'o', placed: true, x: 234, z: 0, r: 42, face: 3 },

  { id: 'home', name: '치이카와의 집', jp: 'ちいかわの家', conf: 'o', placed: true, x: -150, z: 66, r: 32, face: 1, clear: 54 },
  // 벼랑 중턱의 돌 턱에 있다 (아래 CLIFF가 지형을 만든다)
  { id: 'cave', name: '하치와레의 동굴', jp: 'ハチワレの洞窟', conf: 'o', placed: true, x: -205, z: 6, y: 10, noFlatten: true, r: 20, face: 1, clear: 62 },
  { id: 'usagi', optional: true, name: '?', jp: '', conf: 'u', x: -152, z: -238, r: 14, face: 2, secret: true }, // 2026-11-10: 우사기는 집이 없다 (usagi-sleep.js)

  { id: 'stage', name: '들판의 무대', jp: '野原', conf: 'o', x: -236, z: 118, r: 13, face: 1 },
  { id: 'weeding', name: '풀뽑기 현장', jp: '草むしり現場', conf: 'o', x: -125, z: 150, r: 46 },
  { id: 'pond', name: '연못', jp: '池', conf: 'o', x: -60, z: 196, r: 17 },
  { id: 'ramune', name: '솟는 곳: 케첩밥과 라무네', jp: '湧きドコロ', conf: 'o', x: -262, z: 62, r: 14 },
  { id: 'rice', name: '솟는 곳: 무한백미', jp: '湧きドコロ', conf: 'o', x: 62, z: -150, r: 15 },
  { id: 'sausage', name: '솟는 곳: 어육소시지 숲', jp: '湧きドコロ', conf: 'o', x: 185, z: -238, r: 16 },
  { id: 'castella', optional: true, name: '거대 카스텔라', jp: 'カステラ', conf: 'o', x: 20, z: -136, r: 16 },
  { id: 'dotoriClub', name: '도토리 클럽', jp: 'どんぐりクラブ', conf: 'o', x: 20, z: -136, r: 11 }, // 2026-11-12: 카스텔라 자리의 지하 클럽
  { id: 'misoBank', name: '된장국 강', jp: '味噌汁の川', conf: 'o', x: 130, z: -146, r: 16 },

  { id: 'hunt', name: '토벌 훈련소', jp: '討伐訓練所', conf: 'o', x: 190, z: 150, r: 20 },
  { id: 'wilds', name: '야생지대', jp: '', conf: 'o', x: 160, z: 200, r: 30 },
  { id: 'antlion', name: '개미지옥', jp: '', conf: 'o', x: 244, z: 186, r: 11 },
  // 야생 반도의 토벌 구역: 들판 끝(wilds) → 야생의 숲 → 깊은 숲. 구역마다 괴물이 눌러산다 (wild-zones.js)
  { id: 'wildsForest', name: '야생의 숲', jp: '', conf: 'b', x: 340, z: 244, r: 34 },
  { id: 'wildsDeep', name: '깊은 숲', jp: '', conf: 'b', x: 446, z: 294, r: 38 },

  // 일상 동선과 떨어진 특수 장소: 길을 잇지 않는다
  { id: 'hole', name: '구멍', jp: '穴', conf: 'o', special: true, x: -70, z: 250, r: 6 },
  { id: 'yamanba', name: '야만바의 집', jp: '山姥の家', conf: 'o', special: true, x: 320, z: -72, r: 18, face: 3 },
  { id: 'smallCave', name: '숲 속 작은 동굴', jp: '森の洞窟', conf: 'o', special: true, x: 268, z: -84, r: 9, face: 3 },
  { id: 'hiroma', optional: true, name: '히로마', jp: '拾魔', conf: 'b', special: true, x: 335, z: 64, r: 18, face: 3 },
  { id: 'goblin', name: '고블린 동굴', jp: 'ゴブリンの洞窟', conf: 'o', special: true, x: 280, z: 118, r: 14, face: 3 },

  // 2026-11-16: 섬(선착장·섬 광장·방갈로·섬 주택가·시마지로·흔들다리·해변 동굴)은 이재헌님 결정으로 통째로 지웠다

  // 참고 이미지와 조사 문서에 있어 남겨 둔 곳 (명세 25곳 밖)
  { id: 'arbiter', name: '슈퍼 알바이터 시험장', jp: 'スーパーアルバイター', conf: 'o', x: 14, z: -64, r: 16, face: 3 },
  { id: 'statue', name: '기념공원군 상', jp: 'きねんこうえんくん', conf: 'o', x: -80, z: -100, r: 10, y: 7 },
  { id: 'shrine', name: '신사', jp: '神社', conf: 'o', x: -30, z: -180, r: 24 },
  { id: 'onsen', name: '온천', jp: '温泉', conf: 'o', x: 108, z: -88, r: 24 },
  { id: 'sauna', name: '사우나와 냉탕', jp: 'サウナ・水風呂', conf: 'o', x: 168, z: -96, r: 15 },

  // 지도에 이름을 올리지 않는 동네 풍경: 주택과 거리의 나무, 가로등
  { id: 'cottage', decor: true, v: 1, x: -92, z: 66, r: 10, face: 2 },
  { id: 'cottage', decor: true, v: 3, x: 40, z: 44, r: 10, face: 2 },
  { id: 'streetScape', decor: true, x: 0, z: 0, r: 0 },
  // 이전 월드의 집들: 주택가로 가는 길과 선착장으로 가는 길가
  { id: 'oldHouse', decor: true, v: 0, x: -112, z: -30, r: 10 },
  { id: 'oldHouse', decor: true, v: 2, x: -160, z: -24, r: 10, face: 1 },
  { id: 'oldHouse', decor: true, v: 3, x: -134, z: -60, r: 10 },
  { id: 'oldHouse', decor: true, v: 1, x: -30, z: 96, r: 10, face: 1 },
  { id: 'oldHouse', decor: true, v: 2, x: 34, z: 100, r: 10, face: 3 },
  { id: 'oldHouse', decor: true, v: 0, x: -30, z: 140, r: 10, face: 1 },
  { id: 'oldHouse', decor: true, v: 3, x: 32, z: 150, r: 10, face: 3 },
  // 2026-11-12: 새 단지 (분양용 빈집 세 채. 청약 추첨에 당첨된 주민이 이사 온다)
  { id: 'cottage', decor: true, v: 2, x: 48, z: -56, r: 10, face: 0, sale: true },
  { id: 'oldHouse', decor: true, v: 1, x: 68, z: -58, r: 10, face: 0, sale: true },
  { id: 'cottage', decor: true, v: 0, x: 56, z: -78, r: 10, face: 2, sale: true },
  // 치이카와의 집 둘레와 들판 끝에 흩어진 작은 둥근 집 (사진처럼)
  { id: 'hut', decor: true, x: -180, z: 104, r: 6.5 },
  { id: 'hut', decor: true, x: -114, z: 100, r: 7 },
  { id: 'hut', decor: true, x: -170, z: 48, r: 6 },
  { id: 'hut', decor: true, x: 72, z: 118, r: 6.5 },
  { id: 'hut', decor: true, x: 100, z: 134, r: 7 },
  { id: 'hut', decor: true, x: 64, z: 158, r: 6 },
  { id: 'hut', decor: true, x: 106, z: 170, r: 6.5 },
  // 마을에 자주 나오지 않는 주민들의 집. 위치는 추정 배치
  { id: 'momongaHome', home: true, v: 2, name: '모몽가의 집', jp: '', conf: 'f', x: -194, z: 168, r: 10 },
  { id: 'shisaHome', home: true, v: 0, name: '시사의 집', jp: '', conf: 'f', x: 136, z: 70, r: 10 },
  { id: 'rakkoHome', home: true, v: 1, name: '랏코의 집', jp: '', conf: 'f', x: -124, z: -150, r: 10, face: 1 },
  { id: 'kurimanjuHome', home: true, v: 3, name: '쿠리만쥬의 집', jp: '', conf: 'f', x: 156, z: 104, r: 10, face: 3 },
  { id: 'furuhonyaHome', home: true, v: 2, name: '후루혼야의 집', jp: '', conf: 'f', x: -84, z: 102, r: 10, face: 1 },

  { id: 'soba', name: '서서 먹는 소바', jp: '立喰そば', conf: 'f', x: 40, z: 26, r: 9, face: 2 },
  { id: 'machioka', name: '오카시노 마치오카', jp: 'おかしのまちおか', conf: 'o', x: 172, z: 26, r: 9, face: 2 },
  { id: 'pharmacy', name: '약국', jp: '薬局', conf: 'o', x: -92, z: 28, r: 9, face: 2 },
  { id: 'pottery', optional: true, name: '도예점', jp: 'お皿', conf: 'o', x: 120, z: 24, r: 9, face: 2 },
  { id: 'big1', optional: true, name: 'Big1', jp: 'ビッグワン', conf: 'f', x: 178, z: 26, r: 10, face: 2 },
  { id: 'vehicleShop', name: '탈것 가게', jp: 'のりもの屋', conf: 'f', x: 46, z: 64, r: 10, face: 2 }, // 2026-11-12: 마을 남쪽 빈터의 자전거·자동차 가게
  { id: 'weaponShop', name: '무기점', jp: '武器屋', conf: 'f', x: 16, z: 40, r: 8, face: 2 }, // 2026-11-12: 무기를 사고 고치는 가게
  { id: 'bank', name: '마을 금고', jp: '村の金庫', conf: 'f', x: -8, z: 46, r: 8, face: 2 }, // 2026-11-12: 저축·적금·청약 창구 (점검: 큰길에서 광장 북쪽 빈터로 옮김)
  { id: 'arcade', name: '게임센터', jp: 'ゲームセンター', conf: 'o', x: 258, z: -148, r: 9, face: 2 },
  { id: 'recycle', name: '리사이클 숍', jp: 'リサイクルショップ', conf: 'o', x: -106, z: 46, r: 9, face: 2 }, // 2026-11-10: 길(-122,4)~(-130,34) 위에서 비킴
  { id: 'pochette', optional: true, name: '포셰트 요로이의 가게', jp: 'ポシェットの鎧さんの店', conf: 'o', x: -152, z: 30, r: 9, face: 2 },
  { id: 'lemon', name: '레몬 스티커 공장', jp: '', conf: 'o', x: 272, z: 66, r: 22 },
  { id: 'treasure', optional: true, name: '보물찾기 시설', jp: '', conf: 'f', x: 130, z: 192, r: 9 },
  { id: 'sobaSpring', name: '소바가 솟는 곳', jp: '湧きドコロ', conf: 'o', x: 148, z: -188, r: 7 },
  { id: 'servers', name: '서버가 자라는 나무', jp: '湧きドコロ', conf: 'o', x: 98, z: -178, r: 8 },
  { id: 'akafuku', name: '아카후쿠가 떨어지는 곳', jp: '湧きドコロ', conf: 'o', x: 188, z: -168, r: 6 },
  { id: 'softcream', name: '솟는 곳: 소프트크림 서버', jp: '湧きドコロ', conf: 'o', x: 60, z: -184, r: 10 },
  { id: 'bigPudding', name: '거대 단단한 푸딩', jp: '湧きドコロ', conf: 'o', x: -8, z: -168, r: 12 },
];
const PLACES = ALL_PLACES.filter(p => !p.optional);
// 집의 문 앞 자리 (집 기준 좌표)
const HOME_DOOR = { cottage: () => [-2.6, 7.4], oldHouse: () => [-2.6, 7.4], hut: p => [0, p.r + 1.6] };
// 집 안의 침대 자리 (집 기준 좌표)
const HOME_BED = { cottage: () => [3.6, -1], oldHouse: () => [3.6, -1], hut: p => [-(p.r - 0.5) * 0.3, -0.4] };
// 지도에 칠할 건물 바닥 크기
const FOOTPRINTS = {
  reception: [24, 12], exam: [28, 18], arbiter: [20, 14], internet: [16, 12], ramenRo: [18, 16], ramenYama: [18, 16], umaCurry: [18, 16],
  umaiya: [20, 16], kissa: [16, 15], mitsuboshi: [18, 16], mucha: [70, 40], cottage: [13, 11], hiroma: [22, 14], yamanba: [17, 12],
};
for (const p of PLACES) p.foot = FOOTPRINTS[p.id];

/* ---------- 지형 ---------- */

function baseHeight(x, z) {
  const a = Math.atan2(z, x);
  const coast = 335 + 38 * Math.sin(3 * a + 1) + 22 * Math.sin(7 * a + 2) + 10 * Math.sin(13 * a) - Math.hypot(x, z);
  // 야생 반도: 동쪽 해안에서 바다로 길게 뻗은 땅
  const wx = x - 230, wz = z - 195, ux = 240, uz = 105;
  const wt = Math.max(0, Math.min(1, (wx * ux + wz * uz) / (ux * ux + uz * uz)));
  const wild = 78 + 10 * Math.sin(wt * 9 + 1) + 6 * Math.sin(Math.atan2(wz - wt * uz, wx - wt * ux) * 5) - Math.hypot(wx - wt * ux, wz - wt * uz);
  const land = Math.max(coast, wild);
  const hills = 1.8 + 1.2 * Math.sin(x * 0.021) * Math.cos(z * 0.017) + 0.6 * Math.sin(x * 0.05 + 1) * Math.sin(z * 0.043);
  let h = -3 + (3 + hills) * smoothstep(-10, 22, land);
  // 북쪽을 막는 산맥
  const ridge = smoothstep(-262, -330, z + 18 * Math.sin(x * 0.02));
  h += ridge * smoothstep(-8, 40, coast + 60) * 46 * (0.65 + 0.35 * Math.sin(x * 0.031 + 2));
  return h;
}

const heights = new Float32Array((GRID + 1) * (GRID + 1));
const roadMask = new Uint8Array((GRID + 1) * (GRID + 1));
const padMask = new Uint8Array((GRID + 1) * (GRID + 1));
const riverMask = new Uint8Array((GRID + 1) * (GRID + 1));   // 강은 얕아서 걸어 건널 수 있다
const gridIndex = (i, j) => j * (GRID + 1) + i;
const toGrid = v => (v + WORLD_SIZE / 2) / CELL;
const fromGrid = i => i * CELL - WORLD_SIZE / 2;

function stampArea(x, z, r, fn) {
  const i0 = Math.max(0, Math.floor(toGrid(x - r)));
  const i1 = Math.min(GRID, Math.ceil(toGrid(x + r)));
  const j0 = Math.max(0, Math.floor(toGrid(z - r)));
  const j1 = Math.min(GRID, Math.ceil(toGrid(z + r)));
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(fromGrid(i) - x, fromGrid(j) - z);
      if (d <= r) fn(gridIndex(i, j), d);
    }
  }
}

function walkPolyline(points, stepSize, fn) {
  for (let s = 0; s < points.length - 1; s++) {
    const [ax, az] = points[s];
    const [bx, bz] = points[s + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / stepSize));
    for (let k = 0; k <= n; k++) fn(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, s + k / n);
  }
}

for (let j = 0; j <= GRID; j++) {
  for (let i = 0; i <= GRID; i++) heights[gridIndex(i, j)] = baseHeight(fromGrid(i), fromGrid(j));
}

// 마을 전체를 낮고 평평하게 다진다
stampArea(20, 10, 190, (k, d) => {
  heights[k] += (2.4 - heights[k]) * smoothstep(190, 140, d);
});
stampArea(170, 0, 150, (k, d) => {
  heights[k] += (2.4 - heights[k]) * smoothstep(150, 110, d);
});
for (const p of PLACES) {
  p.y = p.y !== undefined ? p.y : Math.max(1.4, heights[gridIndex(Math.round(toGrid(p.x)), Math.round(toGrid(p.z)))]);
  stampArea(p.x, p.z, p.r + 14, (k, d) => {
    if (!p.noFlatten) heights[k] += (p.y - heights[k]) * smoothstep(p.r + 14, p.r + 2, d);
    if (d < p.r + 3) padMask[k] = 1;
  });
  // 집과 동굴은 정면이 가려지지 않게 나무를 멀리 둔다
  if (p.clear) stampArea(p.x, p.z, p.clear, k => { padMask[k] = 1; });
}
// 하치와레의 동굴이 있는 벼랑: 뒤로는 어두운 바위산, 앞으로는 옅은 돌 턱과 깎아지른 절벽.
// u는 동쪽(동굴이 보는 쪽), v는 남쪽, 원점은 동굴. 북쪽 끝의 비탈길로 올라간다
const CLIFF = { x: -205, z: 6, y: 10, cu: -12, cv: 6, hu: 32, hv: 42, r: 14 };
const cliffMask = new Uint8Array((GRID + 1) * (GRID + 1));
function cliffDist(u, v) {
  const qx = Math.abs(u - CLIFF.cu) - (CLIFF.hu - CLIFF.r);
  const qz = Math.abs(v - CLIFF.cv) - (CLIFF.hv - CLIFF.r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - CLIFF.r;
}
// 절벽이 시작되는 가장자리 [u, v]: 앞면 → 남쪽 모서리 → 남쪽 면
function cliffEdgePoints() {
  const out = [];
  const u1 = CLIFF.cu + CLIFF.hu;
  const v2 = CLIFF.cv + CLIFF.hv;
  for (let v = -10; v <= v2 - CLIFF.r; v += 3) out.push([u1, v]);
  for (let a = 0; a <= 1.0001; a += 0.125) out.push([u1 - CLIFF.r + Math.cos((a * Math.PI) / 2) * CLIFF.r, v2 - CLIFF.r + Math.sin((a * Math.PI) / 2) * CLIFF.r]);
  for (let u = u1 - CLIFF.r - 3; u >= -24; u -= 3) out.push([u, v2]);
  return out;
}
{
  const R = 90;
  const i0 = Math.max(0, Math.floor(toGrid(CLIFF.x - R)));
  const i1 = Math.min(GRID, Math.ceil(toGrid(CLIFF.x + R)));
  const j0 = Math.max(0, Math.floor(toGrid(CLIFF.z - R)));
  const j1 = Math.min(GRID, Math.ceil(toGrid(CLIFF.z + R)));
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const u = fromGrid(i) - CLIFF.x;
      const v = fromGrid(j) - CLIFF.z;
      const d = cliffDist(u, v);
      if (d >= 7) continue;
      const k = gridIndex(i, j);
      const t = 1 - smoothstep(0, 6.5, d);
      const back = smoothstep(-13, -36, u);
      heights[k] = heights[k] + (CLIFF.y - heights[k]) * t + back * t * 18;
      cliffMask[k] = d > 0 ? 2 : u < -13 ? 3 : 1;
    }
  }
  // 비탈길: 벼랑 발치에서 북쪽을 돌아 돌 턱 위로
  const ramp = [[-166, 14], [-178, -16], [-194, -28]];
  let foot = heights[gridIndex(Math.round(toGrid(ramp[0][0])), Math.round(toGrid(ramp[0][1])))];
  foot = Math.min(foot, CLIFF.y - 2);
  const lens = [Math.hypot(ramp[1][0] - ramp[0][0], ramp[1][1] - ramp[0][1]), Math.hypot(ramp[2][0] - ramp[1][0], ramp[2][1] - ramp[1][1])];
  const total = lens[0] + lens[1];
  const original = heights.slice();
  const nearest = new Map();
  walkPolyline(ramp, 1, (x, z, s) => {
    const along = (s < 1 ? s * lens[0] : lens[0] + (s - 1) * lens[1]) / total;
    stampArea(x, z, 10, (k, d) => {
      const cur = nearest.get(k);
      if (!cur || d < cur.d) nearest.set(k, { d, along });
    });
  });
  for (const [k, { d, along }] of nearest) {
    const b = smoothstep(10, 5, d);
    heights[k] = original[k] + (foot + (CLIFF.y - foot) * along - original[k]) * b;
    if (d < 5) cliffMask[k] = 0;
  }
}
for (const road of ROADS) {
  walkPolyline(road.points, 2, (x, z) => stampArea(x, z, road.w / 2 + 2, k => { roadMask[k] = 1; }));
}
// 강바닥 높이는 파내기 전의 땅을 기준으로 잡는다
const uncutHeights = heights.slice();
for (const river of RIVERS) {
  let bed = 8;
  river.path = [];
  walkPolyline(river.points, 4, (x, z) => {
    const sx = Math.round(toGrid(x));
    const sz = Math.round(toGrid(z));
    const ground = sx >= 0 && sx <= GRID && sz >= 0 && sz <= GRID ? uncutHeights[gridIndex(sx, sz)] : -3;
    // 바다에 닿기 전까지는 걸어서 건널 수 있는 얕은 높이를 유지한다
    bed = Math.max(ground < 0.5 ? -0.6 : 0.4, Math.min(bed, ground - 0.8));
    const lastPoint = river.path[river.path.length - 1];
    if (!lastPoint || lastPoint.x !== x || lastPoint.z !== z) river.path.push({ x, z, y: bed });
    stampArea(x, z, 13, (k, d) => {
      if (padMask[k]) return;
      heights[k] += (bed - heights[k]) * smoothstep(13, 6, d);
      if (bed > -0.2) riverMask[k] = 1;
    });
  });
}

function heightAt(x, z) {
  const gx = toGrid(x);
  const gz = toGrid(z);
  if (gx < 0 || gz < 0 || gx >= GRID || gz >= GRID) return -3;
  const i = Math.floor(gx);
  const j = Math.floor(gz);
  const fx = gx - i;
  const fz = gz - j;
  const a = heights[gridIndex(i, j)];
  const b = heights[gridIndex(i + 1, j)];
  const c = heights[gridIndex(i, j + 1)];
  const d = heights[gridIndex(i + 1, j + 1)];
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/* ---------- 충돌 ---------- */

const COLLIDER_CELL = 40;
const colliderGrid = new Map();

function addColliderToGrid(c, minX, maxX, minZ, maxZ) {
  for (let cz = Math.floor(minZ / COLLIDER_CELL); cz <= Math.floor(maxZ / COLLIDER_CELL); cz++) {
    for (let cx = Math.floor(minX / COLLIDER_CELL); cx <= Math.floor(maxX / COLLIDER_CELL); cx++) {
      const key = `${cx},${cz}`;
      if (!colliderGrid.has(key)) colliderGrid.set(key, []);
      colliderGrid.get(key).push(c);
    }
  }
}
function addCircle(x, z, r) {
  addColliderToGrid({ x, z, r }, x - r, x + r, z - r, z + r);
}
function addRect(x, z, w, d) {
  addColliderToGrid({ x, z, w, d }, x - w / 2, x + w / 2, z - d / 2, z + d / 2);
}

// 원(플레이어)을 충돌체 밖으로 밀어낸다
function resolveColliders(p, radius) {
  const key = `${Math.floor(p.x / COLLIDER_CELL)},${Math.floor(p.z / COLLIDER_CELL)}`;
  const seen = new Set();
  for (let oz = -1; oz <= 1; oz++) {
    for (let ox = -1; ox <= 1; ox++) {
      const [cx, cz] = key.split(',').map(Number);
      const list = colliderGrid.get(`${cx + ox},${cz + oz}`);
      if (!list) continue;
      for (const c of list) {
        if (seen.has(c)) continue;
        seen.add(c);
        if (c.r !== undefined) {
          const dx = p.x - c.x;
          const dz = p.z - c.z;
          const min = c.r + radius;
          const dist = Math.hypot(dx, dz);
          if (dist < min && dist > 0) {
            p.x = c.x + (dx / dist) * min;
            p.z = c.z + (dz / dist) * min;
          }
        } else {
          const nearX = Math.max(c.x - c.w / 2, Math.min(p.x, c.x + c.w / 2));
          const nearZ = Math.max(c.z - c.d / 2, Math.min(p.z, c.z + c.d / 2));
          const dx = p.x - nearX;
          const dz = p.z - nearZ;
          const dist = Math.hypot(dx, dz);
          if (dist > 0 && dist < radius) {
            p.x = nearX + (dx / dist) * radius;
            p.z = nearZ + (dz / dist) * radius;
          } else if (dist === 0) {
            // 사각형 안쪽이면 가장 가까운 변으로 내보낸다
            const toLeft = p.x - (c.x - c.w / 2);
            const toRight = c.x + c.w / 2 - p.x;
            const toTop = p.z - (c.z - c.d / 2);
            const toBottom = c.z + c.d / 2 - p.z;
            const least = Math.min(toLeft, toRight, toTop, toBottom);
            if (least === toLeft) p.x = c.x - c.w / 2 - radius;
            else if (least === toRight) p.x = c.x + c.w / 2 + radius;
            else if (least === toTop) p.z = c.z - c.d / 2 - radius;
            else p.z = c.z + c.d / 2 + radius;
          }
        }
      }
    }
  }
}

// 카메라가 건물 안으로 들어가지 않게 큰 충돌체만 검사한다
function blocksCamera(x, z) {
  const list = colliderGrid.get(`${Math.floor(x / COLLIDER_CELL)},${Math.floor(z / COLLIDER_CELL)}`);
  if (!list) return false;
  for (const c of list) {
    if (c.r !== undefined) {
      if (c.r >= 0.8 && Math.hypot(x - c.x, z - c.z) < c.r + 0.3) return true;
    } else if (c.w >= 5 && c.d >= 5 && Math.abs(x - c.x) < c.w / 2 && Math.abs(z - c.z) < c.d / 2) {
      return true;
    }
  }
  return false;
}

/* ---------- 땅 색 (게임 텍스처와 지도가 같이 쓴다) ---------- */

function paintMap() {
  const size = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const toPx = size / WORLD_SIZE;
  g.save();
  g.scale(toPx, toPx);
  g.translate(WORLD_SIZE / 2, WORLD_SIZE / 2);

  g.fillStyle = '#e4e8bd';
  g.fillRect(-WORLD_SIZE, -WORLD_SIZE, WORLD_SIZE * 2, WORLD_SIZE * 2);
  // 수채화 얼룩
  for (let i = 0; i < 900; i++) {
    const tone = rand();
    g.fillStyle = tone < 0.4 ? 'rgba(190, 220, 150, .2)' : tone < 0.75 ? 'rgba(248, 238, 205, .24)' : 'rgba(220, 205, 165, .14)';
    g.beginPath();
    g.ellipse(rand(-450, 450), rand(-450, 620), rand(8, 34), rand(5, 18), rand(0, 3), 0, Math.PI * 2);
    g.fill();
  }
  for (const zone of ZONES) {
    const grad = g.createRadialGradient(zone.x, zone.z, zone.r * 0.55, zone.x, zone.z, zone.r);
    grad.addColorStop(0, zone.color);
    grad.addColorStop(1, `${zone.color}00`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(zone.x, zone.z, zone.r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // 모래, 바위, 바다 바닥은 높이를 보고 칠한다
  const overlay = document.createElement('canvas');
  overlay.width = overlay.height = GRID + 1;
  const og = overlay.getContext('2d');
  const image = og.createImageData(GRID + 1, GRID + 1);
  for (let j = 0; j <= GRID; j++) {
    for (let i = 0; i <= GRID; i++) {
      const h = heights[gridIndex(i, j)];
      const k = gridIndex(i, j) * 4;
      const cliff = cliffMask[gridIndex(i, j)];
      if (cliff === 1) image.data.set([222, 224, 219, 255], k);
      else if (cliff === 2) image.data.set([199, 179, 145, 255], k);
      else if (cliff === 3) image.data.set([104, 124, 137, 255], k);
      else if (h < -0.15) {
        image.data.set([127, 205, 234, 255], k);
      } else if (h < 0.7) {
        image.data.set([236, 221, 170, 255], k);
      } else if (h < 1.3) {
        image.data.set([236, 221, 170, Math.round((1.3 - h) / 0.6 * 255)], k);
      } else if (h > MAX_WALK_HEIGHT - 3) {
        image.data.set([168, 178, 205, Math.min(255, Math.round((h - MAX_WALK_HEIGHT + 3) * 60))], k);
      }
    }
  }
  og.putImageData(image, 0, 0);
  g.imageSmoothingQuality = 'high';
  g.drawImage(overlay, 0, 0, size, size);

  g.save();
  g.scale(toPx, toPx);
  g.translate(WORLD_SIZE / 2, WORLD_SIZE / 2);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const trace = points => {
    g.beginPath();
    points.forEach(([x, z], i) => (i ? g.lineTo(x, z) : g.moveTo(x, z)));
  };
  for (const [color, extra] of [['#d8c088', 1.6], ['#efdcae', 0]]) {
    g.strokeStyle = color;
    for (const road of ROADS) {
      g.lineWidth = road.w + extra;
      trace(road.points);
      g.stroke();
    }
  }
  // 광장 바닥 (실제 포장은 buildPavement가 위에 깐다)
  g.fillStyle = '#efe5c8';
  g.beginPath();
  g.arc(0, 0, 30, 0, Math.PI * 2);
  g.fill();
  // 지도에서 건물이 어디 있는지 보이게 지붕 자리를 칠한다
  g.fillStyle = '#c9a184';
  for (const p of PLACES) {
    if (!p.foot) continue;
    const th = ((p.face || 0) * Math.PI) / 2;
    g.save();
    g.translate(p.x, p.z);
    g.rotate(-th);
    g.fillRect(-p.foot[0] / 2, -p.foot[1] / 2, p.foot[0], p.foot[1]);
    g.restore();
  }
  // 강 물줄기(지도에서 보이도록)
  for (const river of RIVERS) {
    g.strokeStyle = `#${river.color.toString(16).padStart(6, '0')}`;
    g.lineWidth = 8;
    trace(river.points);
    g.stroke();
  }
  g.restore();
  return c;
}

/* ---------- 조립 ---------- */

function buildWorld(scene, renderer) {
  const mapCanvas = paintMap();

  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, GRID, GRID);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heights[i]);
  geo.computeVertexNormals();
  const tex = new THREE.CanvasTexture(mapCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
  ground.receiveShadow = true;
  scene.add(ground);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE * 1.6, WORLD_SIZE * 1.6),
    new THREE.MeshPhongMaterial({ color: 0x7fcdea, shininess: 70, specular: 0xffffff, transparent: true, opacity: 0.88 }),
  );
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);

  // 강은 물줄기를 따라 띠를 깐다
  for (const river of RIVERS) {
    const verts = [];
    const index = [];
    river.path.forEach((p, i) => {
      const next = river.path[Math.min(i + 1, river.path.length - 1)];
      const prev = river.path[Math.max(i - 1, 0)];
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      const nx = -dz / len;
      const nz = dx / len;
      const y = p.y + 0.4;
      verts.push(p.x + nx * 7, y, p.z + nz * 7, p.x - nx * 7, y, p.z - nz * 7);
      if (i < river.path.length - 1) {
        const a = i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const ribbon = new THREE.BufferGeometry();
    ribbon.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    ribbon.setIndex(index);
    ribbon.computeVertexNormals();
    const water = new THREE.Mesh(ribbon, new THREE.MeshLambertMaterial({ color: river.color, side: THREE.DoubleSide }));
    scene.add(water);
  }

  const placeGroups = [];
  for (const p of PLACES) {
    const group = new THREE.Group();
    const face = p.face || 0;
    group.position.set(p.x, p.y, p.z);
    group.rotation.y = (face * Math.PI) / 2;
    scene.add(group);
    const ghost = typeof window !== 'undefined' && window.GLB_PLACES && window.GLB_PLACES.has(p.id);
    if (ghost) { group.add = function () { return group; }; }
    const k = makeKit(group, p.x, p.z, face);
    const build = BUILDERS[p.id];
    // 모델로 교체된 장소의 빌더는 메시를 만들지 않으므로 장식 기록도 남기지 않는다 (없는 벤치에 앉게 된다)
    if (typeof window !== 'undefined') window.__ghostBuild = !!ghost;
    if (build) build(k, p);
    if (typeof window !== 'undefined') window.__ghostBuild = false;
    if (p.id === 'streetScape') continue;   // 길을 따라 길게 이어져 멀어져도 숨기지 않는다
    placeGroups.push({ id: p.id, group, x: p.x, z: p.z });
  }

  buildPavement(scene);

  const rooms = {};
  let roomIndex = 0;
  for (const [id, def] of Object.entries(ROOM_DEFS)) {
    const cx = ROOM_ORIGIN + roomIndex++ * ROOM_GAP;
    const cz = ROOM_ORIGIN;
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);
    group.visible = false;
    scene.add(group);
    const k = makeKit(group, cx, cz, 0);
    k.roomId = id;
    k.box(0, -0.25, 0, def.w, 0.5, def.d, def.floor, 0);
    const wallH = 4.2;
    const t = 0.6;
    k.box(0, wallH / 2, -def.d / 2 - t / 2, def.w + t * 2, wallH, t, def.wall);
    k.box(-def.w / 2 - t / 2, wallH / 2, 0, t, wallH, def.d, def.wall);
    k.box(def.w / 2 + t / 2, wallH / 2, 0, t, wallH, def.d, def.wall);
    // 앞 벽은 낮게 두어 카메라를 가리지 않는다
    k.box(0, 0.25, def.d / 2 + t / 2, def.w + t * 2, 0.5, t, def.wall);
    paintRoomSurfaces(k, def);
    def.build(k);
    k.box(0, 0.03, def.d / 2 - 0.8, 2.4, 0.06, 1.4, '#f0c44c', 0);
    rooms[id] = { id, name: def.name, cx, cz, w: def.w, d: def.d, bg: def.bg, group };
  }

  placeGroups.push(...buildVegetation(scene));

  // 내부 방의 출구: 들어간 장소의 입구로 돌아간다
  for (const portal of portals.slice()) {
    if (portal.to.room && rooms[portal.to.room]) {
      const room = rooms[portal.to.room];
      portals.push({
        x: room.cx,
        z: room.cz + room.d / 2 - 0.8,
        r: 2.2,
        label: '밖으로 나가기',
        room: room.id,
        to: { x: portal.x, z: portal.z, back: true },
      });
    }
  }

  // 바다 위로 뻗은 부두는 걸어 다닐 수 있다
  const placeById = id => PLACES.find(p => p.id === id);
  const decks = [
    // 선착장은 2026-11-12 뺐다 (optional). 다시 열면 부두 다리도 돌아온다
    ...(placeById('pier') ? [{ x: 0, z: 314, w: 6, d: 34, y: placeById('pier').y + 1 }] : []),
    ...(placeById('dock') ? [{ x: 172, z: 382, w: 8, d: 20, y: placeById('dock').y + 0.9 }] : []),
  ];
  const deckAt = (x, z) => decks.find(s => Math.abs(x - s.x) <= s.w / 2 && Math.abs(z - s.z) <= s.d / 2);

  const worldApi = {
    mapCanvas,
    places: PLACES.filter(p => !p.decor),
    zones: ZONES,
    blocksCamera,
    // 엑스트라 주민이 저마다 들어가 자는 집: 문 앞 자리까지 계산해 둔다
    homes: PLACES.filter(p => p.decor && HOME_DOOR[p.id]).map(p => {
      const door = HOME_DOOR[p.id](p);
      const th = ((p.face || 0) * Math.PI) / 2;
      const tf = ([lx, lz]) => [p.x + lx * Math.cos(th) + lz * Math.sin(th), p.z - lx * Math.sin(th) + lz * Math.cos(th)];
      const bed = HOME_BED[p.id](p);
      return { key: `${p.id}@${p.x},${p.z}`, x: p.x, z: p.z, r: p.r, door: tf(door), bed: tf(bed), feet: tf([bed[0], bed[1] + 6]) };
    }),
    rooms,
    portals,
    placeGroups,
    floorAt(x, z) {
      const deck = deckAt(x, z);
      return deck ? deck.y : heightAt(x, z);
    },
    isWalkable(x, z) {
      if (deckAt(x, z)) return true;
      const gx = Math.round(toGrid(x));
      const gz = Math.round(toGrid(z));
      if (gx >= 0 && gz >= 0 && gx <= GRID && gz <= GRID && riverMask[gridIndex(gx, gz)]) return true;
      const h = heightAt(x, z);
      return h > 0.3 && h < MAX_WALK_HEIGHT;
    },
    collide: resolveColliders,
  };

  // Phase 2: GLB로 교체하는 장소는 glb-world.js가 비동기로 얹는다 (없으면 기존 빌더 유지)
  if (typeof window !== 'undefined' && window.GLB_PLACES && typeof window.applyGLBPlaces === 'function') {
    window.applyGLBPlaces(worldApi, scene);
  }
  return worldApi;
}
