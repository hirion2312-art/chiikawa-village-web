'use strict';

// 치이카와 심즈 — 시험장은 시험만, 공부는 따로
//  - 풀뽑기 시험장: 응시 책상 열 개를 두 줄 반으로 줄 맞춰 모두 칠판 쪽을 보게 한다
//  - 시험장·슈퍼 알바이터 시험장에서는 공부하지 않는다 (시험 보기·카드 받기·결과 보기만)
//  - 공부는 세 가지: 집에서 (보통), 혼자 책을 펴 들고 서서 (조금), 인터넷방에서 오래 (많이)
//  - 자격증이 목표인 주민만 공부한다 (goals.js CERT_GOAL: 치이카와=풀뽑기, 시사=술)
(function (root) {
  const VO = root.VillageObjects;
  const AS = root.ASSET_SOCKETS;
  const S = (socket, act, min, clip, prop, label, fx) => ({ socket, act, min, clip: clip || null, prop: prop || null, label, fx });
  const put = x => {
    const i = VO.LIST.findIndex(q => q.id === x.id);
    if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x);
    VO.BY_ID[x.id] = x;
    return x;
  };
  const drop = id => { const i = VO.LIST.findIndex(q => q.id === id); if (i >= 0) VO.LIST.splice(i, 1); delete VO.BY_ID[id]; };

  /* ---------- 시험장 책상 정렬 ---------- */
  // [x, z, 앉는 높이, 바라볼 x, 바라볼 z]. 칠판은 z = -3.95 (앞), 모두 -z를 본다
  if (AS && AS.exam && AS.exam.desk_sit_1) {
    const h = AS.exam.desk_sit_1[2];
    const COLS = [-4.2, -2.1, 2.1, 4.2];          // 가운데 통로(칠판 앞 board_look)는 비운다
    const ROWS = [-0.1, 1.7];
    const spots = [];
    for (const z of ROWS) for (const x of COLS) spots.push([x, z]);
    spots.push([-4.2, 3.5], [4.2, 3.5]);         // 뒷줄 양 끝 (가운데는 자격증 카드 자리)
    const names = ['desk_sit_1', 'desk_sit_2', ...Array.from({ length: 8 }, (_, i) => `desk_stand_${i + 1}`)];
    names.forEach((n, i) => { const [x, z] = spots[i]; AS.exam[n] = [x, z, h, x, z - 1]; });
  }
  if (AS && AS.exam && AS.exam.desk_sit_2) AS.exam.sake_desk = AS.exam.desk_sit_2.slice();

  /* ---------- 시험장에서 하던 공부는 없앤다 ---------- */
  for (const x of VO.LIST.slice()) {
    if ((x.place === 'exam' || x.place === 'arbiter') && (x.skill || x.sakeStudy || /study/.test(x.id))) drop(x.id);
  }

  /* ---------- 서서 조금 공부하기 (책을 펴 들고) ---------- */
  const SPOTS = [['plaza', 'board_check_a|board_check_b'], ['pond', 'pond_look']];
  for (const [place, socket] of SPOTS) {
    put({ id: `${place}.study_stand`, place, name: '책 펴고 서서 공부', skill: 'grass', studyMul: 0.35, worth: 120, hours: [8, 21], gain: { energy: -3, fun: -1 },
      steps: [S(socket, 'study', 8, 'read_book', 'book', '교재를 펴 들고 읽는 중')] });
    put({ id: `${place}.sake_study_stand`, place, name: '술 교재 서서 읽기', only: ['shisa'], sakeAdd: 0.35, worth: 120, hours: [8, 21], gain: { energy: -3, fun: -1 },
      steps: [S(socket, 'study', 8, 'read_book', 'book', '술 교재를 펴 들고 읽는 중')] });
  }

  /* ---------- 인터넷방에서 오래 공부하기 ---------- */
  put({ id: 'internet.study_long', place: 'internet', name: '인터넷방에서 오래 공부', skill: 'grass', studyMul: 3, worth: 420, cost: 100, hours: [9, 22], gain: { energy: -14, fun: -6 },
    steps: [S('pc_sit_*', 'study', 30, 'type_keys', null, '기출문제 검색하는 중'), S('pc_sit_*', 'study', 40, 'study_home', 'book', '노트에 정리하는 중'), S('pc_sit_*', 'study', 20, 'click_mouse', null, '모의고사 푸는 중')] });
  put({ id: 'internet.sake_study_long', place: 'internet', name: '인터넷방에서 술 자격 공부', only: ['shisa'], sakeAdd: 2.5, worth: 420, cost: 100, hours: [9, 22], gain: { energy: -14, fun: -6 },
    steps: [S('pc_sit_*', 'study', 30, 'type_keys', null, '술 자격 강의 보는 중'), S('pc_sit_*', 'study', 40, 'study_home', 'book', '노트에 정리하는 중'), S('pc_sit_*', 'study', 20, 'click_mouse', null, '모의고사 푸는 중')] });

  /* ---------- 공부량 ---------- */
  const L = root.Labor.prototype;
  const finish0 = L.onFinish;
  L.onFinish = function (c, x) {
    const before = c.study || 0;
    finish0.call(this, c, x);
    if (x.studyMul && x.skill === 'grass') c.study = Math.round((before + ((c.study || 0) - before) * x.studyMul) * 10) / 10;
    if (x.sakeAdd && !c.sakeLicense) c.sakeStudy = Math.round(((c.sakeStudy || 0) + x.sakeAdd) * 10) / 10;
  };
  // 술 공부는 시사만, 자격증을 땄으면 그만
  const blocked0 = L.blocked;
  L.blocked = function (c, x) {
    if (x.sakeAdd && (c.extra || c.sakeLicense)) return '이미 술 자격이 있어요';
    return blocked0.call(this, c, x);
  };
  // 공부할 마음: 집 공부와 같은 기준으로, 서서 공부는 짬날 때 조금 더, 인터넷방은 시험이 가까울수록
  const score0 = L.scoreBonus;
  L.scoreBonus = function (c, x) {
    let v = score0.call(this, c, x);
    if (x.sakeAdd && c.id === 'shisa' && !c.sakeLicense) v += x.sakeAdd > 1 ? 24 : 14;
    if (x.studyMul && x.skill === 'grass' && c.id === 'chiikawa') v += x.studyMul > 1 ? 18 : 10;
    return v;
  };

  root.StudyPlaces = { SPOTS };
}(typeof self !== 'undefined' ? self : this));
