'use strict';

// 치이카와 심즈 — 광장 합격 게시판 + 시험 뒤 흐름 (2026-11-12 이재헌님)
// 게시판: plaza-set.glb에 원래 있던 게시판을 그대로 쓴다 (폭 10.6·높이 8.6, 나무 틀, 크림 판 15칸, 번호표 자리 48칸,
//         위 제목 띠, 얇은 지붕, 다리 둘과 받침). 모델은 손대지 않고 그 앞면에 글자와 종이만 덧그린다.
//         제목 띠: "합격 발표". 13시 발표가 나면 합격한 수험번호 종이가 번호표 자리에 차례로 붙는다(원작: 내 번호가 있으면 합격).
//         주민은 시험 날 수험번호를 받고, 판 앞에서 자기 번호를 찾는다. 찾으면 그 종이에 빨간 동그라미가 쳐진다.
// 흐름: 시험을 마치면 광장 벤치에서 발표를 기다린다 → 13시 발표가 붙으면 곧장 게시판으로(town-sets.js gather) →
//       합격이면 자격증 카드를 받으러 시험장으로, 불합격이면 벤치에서 훌쩍인다 (친한 친구가 와서 같이 본다)
(function (root) {
  const VO = root.VillageObjects;
  const AS = root.ASSET_SOCKETS;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop: prop || null, label });
  const put = x => { const i = VO.LIST.findIndex(q => q.id === x.id); if (i >= 0) VO.LIST.splice(i, 1, x); else VO.LIST.push(x); VO.BY_ID[x.id] = x; };

  // 판 앞 다섯 자리: 판(앞면 z 0.47)에서 두 걸음쯤 물러나 올려다본다. 받침(x ±3.4~5, z ±0.8)과 벤치(x 4.7~)를 피한다
  if (AS && AS.plaza) {
    for (let i = 1; i <= 8; i++) delete AS.plaza[`pass_board_${i}`];
    [[-3.0, 2.3], [-1.5, 2.45], [0, 2.5], [1.5, 2.45], [3.0, 2.3]].forEach(([x, z], i) => { AS.plaza[`pass_board_${i + 1}`] = [x, z, 0, x * 0.5, 0]; });
  }
  // 게시판 받침 둘레는 걸어 지나갈 수 없다 (예전 코드 빌더의 충돌체는 다른 자리에 있었다)
  if (typeof BUILDERS !== 'undefined') {
    const plaza0 = BUILDERS.plaza;
    BUILDERS.plaza = function (k, p) {
      if (plaza0) plaza0(k, p);
      k.solidRect(0, 0, 10.6, 1.6);
    };
  }

  /* ---------- 게시판 앞면: GLB 좌표 그대로 (holder 기준) ---------- */
  const X0 = -5, Y1 = 7.7, FW = 10, FH = 5.72, PX = 200;          // 덧그림 판: x -5~5, y 1.98~7.7
  const COLS = [-4.32, -3.08, -1.85, -0.61, 0.62, 1.855, 3.09, 4.325];  // 번호표 자리 가운데 (8칸 × 6줄)
  const ROWS = [6.15, 5.43, 4.71, 3.99, 3.27, 2.55];
  const SLOTS = COLS.length * ROWS.length;
  const live = { tex: null, canvas: null, mesh: null, sig: '' };
  const px = x => (x - X0) * PX, py = y => (Y1 - y) * PX;
  const FONT = '"Jua", "Malgun Gothic", sans-serif';
  const INK = '#4a3230';

  function draw(sheet, day) {
    const cv = live.canvas, g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    // 제목 띠 (y 6.8~7.7)
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `112px ${FONT}`;
    g.fillText('합격 발표', px(0), py(7.25) + 4);
    if (sheet) {
      g.font = `52px ${FONT}`; g.textAlign = 'right'; g.fillStyle = '#7a5a4a';
      const cal = root.game && root.game.sim && root.game.sim.calendar;
      const d = cal && cal.dateOf ? cal.dateOf(sheet.day) : { month: 1, dom: sheet.day };
      g.fillText(`${d.month}월 ${d.dom}일 오후 1시`, px(4.75), py(7.25) + 4);
      g.textAlign = 'left';
      g.fillText(sheet.title, px(-4.75), py(7.25) + 4);
    }
    if (!sheet) return;
    // 번호 종이: 번호 순서대로 왼쪽 위부터. 붙이는 중이면 shown장까지만
    const nos = sheet.posted.slice(0, Math.min(SLOTS, sheet.shown));
    nos.forEach((no, i) => {
      const cx = px(COLS[i % 8]), cy = py(ROWS[Math.floor(i / 8)]);
      const tilt = ((no * 37) % 7 - 3) * 0.008;            // 손으로 붙인 것처럼 살짝씩 기울게
      g.save(); g.translate(cx, cy); g.rotate(tilt);
      g.fillStyle = '#fffdf4'; g.fillRect(-86, -50, 172, 100);
      g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(-86, -50, 172, 100);
      g.fillStyle = '#d9534f'; g.beginPath(); g.arc(0, -40, 6, 0, Math.PI * 2); g.fill();   // 압정
      g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `72px ${FONT}`;
      g.fillText(String(no), 0, 6);
      if (sheet.circled[no]) {
        g.strokeStyle = '#e0453f'; g.lineWidth = 9;
        g.beginPath(); g.ellipse(0, 4, 96, 58, -0.06, 0.15, Math.PI * 2 + 0.05); g.stroke();
      }
      g.restore();
    });
  }
  function attach() {
    const h = root.GLB_HOLDERS && root.GLB_HOLDERS.plaza && root.GLB_HOLDERS.plaza[0];
    if (!h) return false;
    live.canvas = document.createElement('canvas'); live.canvas.width = FW * PX; live.canvas.height = Math.round(FH * PX);
    live.tex = new THREE.CanvasTexture(live.canvas); live.tex.colorSpace = THREE.SRGBColorSpace; live.tex.anisotropy = 4;
    const mat = new THREE.MeshLambertMaterial({ map: live.tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    live.mesh = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), mat);
    live.mesh.position.set(0, Y1 - FH / 2, 0.485);           // 번호표 앞면(0.47) 바로 앞
    live.mesh.renderOrder = 2;
    h.add(live.mesh);
    live.sig = ''; refresh();
    return true;
  }

  /* ---------- 수험번호와 발표 종이 ---------- */
  // 발표 날마다 종이 한 장: 그날 응시자 40~51명(마을 밖 응시자 포함), 번호마다 합격 여부를 미리 정해 두고,
  // 주민에게는 자기 결과와 같은 쪽의 빈 번호를 준다. 붙는 종이 = 합격한 번호 전부(작은 번호부터)
  const sheets = {};
  const rngOf = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function sheetFor(day) {
    if (sheets[day]) return sheets[day];
    const r = rngOf(day * 7919 + 13);
    const first = 101 + Math.floor(r() * 9) * 10, n = 40 + Math.floor(r() * 12);
    const pass = {};
    for (let i = 0; i < n; i++) pass[first + i] = r() < 0.42;
    return (sheets[day] = { day, first, n, pass, mine: {}, used: {}, circled: {}, shown: 0, r, title: '', kinds: {}, get posted() { return Object.keys(this.pass).map(Number).filter(k => this.pass[k]).sort((a, b) => a - b); } });
  }
  function giveNumber(sh, c, passed) {
    if (sh.mine[c.id]) return sh.mine[c.id];
    const free = Object.keys(sh.pass).map(Number).filter(k => !sh.used[k] && sh.pass[k] === passed);
    let no = free.length ? free[Math.floor(sh.r() * free.length)] : null;
    if (no == null) { no = sh.first + sh.n++; sh.pass[no] = passed; }   // 모자라면 끝에 한 명 더
    sh.used[no] = 1; sh.mine[c.id] = no;
    return no;
  }
  const Cal = root.Calendar && root.Calendar.prototype;
  if (Cal && Cal.announce) {
    const ann0 = Cal.announce;
    Cal.announce = function (c, r) {
      if (!c.extra) {
        const sh = sheetFor(this.sim.day);
        const no = giveNumber(sh, c, !!r.pass && !r.absent);
        c.examNo = { no, day: sh.day };
        if (r.name) sh.kinds[r.name.replace(/\s*\d+급$/, '')] = 1;
        sh.title = Object.keys(sh.kinds).slice(0, 2).join(' · ');
      }
      return ann0.call(this, c, r);
    };
  }
  // 오늘 또는 어제 발표가 게시판에 붙어 있다. 그 전 것은 떼어 낸다
  function current() {
    const G = root.game, s = G && G.sim;
    if (!s) return null;
    for (const d of [s.day, s.day - 1]) if (sheets[d]) return sheets[d];
    // 불러온 저장에는 종이가 없다: 주민의 수험번호로 같은 날 종이를 다시 만든다 (번호 배치는 날짜로 정해져 같다)
    for (const d of [s.day, s.day - 1]) {
      const mine = s.chars.filter(c => !c.extra && c.examNo && c.examNo.day === d);
      if (!mine.length) continue;
      const sh = sheetFor(d);
      for (const c of mine) {
        const pend = c.pendingResult && c.pendingResult.r;
        sh.pass[c.examNo.no] = pend ? !!pend.pass && !pend.absent : !!(c.lastExam && c.lastExam.pass);
        sh.used[c.examNo.no] = 1; sh.mine[c.id] = c.examNo.no;
        if (!pend && c.lastExam && c.lastExam.pass) sh.circled[c.examNo.no] = 1;
      }
      sh.shown = SLOTS;
      return sh;
    }
    return null;
  }
  function refresh() {
    if (!live.tex) return;
    const sh = current();
    if (sh && sh.shown < sh.posted.length) sh.shown = Math.min(sh.posted.length, sh.shown + 2);   // 한 장씩 붙어 가는 모습
    const sig = sh ? `${sh.day}|${sh.shown}|${Object.keys(sh.circled).join(',')}|${sh.title}` : 'none';
    if (sig !== live.sig) { live.sig = sig; draw(sh); live.tex.needsUpdate = true; }
  }
  let attached = false;
  setInterval(() => { if (!attached) attached = attach(); else refresh(); }, 500);

  /* ---------- 번호 찾기 (게시판 확인하기) ---------- */
  // 둘러보기 → 위아래로 번호 따라가기 → 내 번호 근처를 뚫어지게 → (끝날 때 결과: 합격이면 동그라미 치고 폴짝, 없으면 훌쩍)
  const BOARD = 'pass_board_*|board_check_a|board_check_b';
  put({ id: 'plaza.pass_board', place: 'plaza', name: '합격 게시판에서 내 번호 찾기', gain: { fun: 6, social: 6 }, hours: [7, 22], passBoard: true, group: true,
    steps: [
      S(BOARD, 'read', 1.2, 'tilt_look', null, '내 번호가… 어디 있지'),
      S(BOARD, 'read', 2.2, 'peek_tiptoe', null, '번호를 하나씩 따라가는 중'),
      S(BOARD, 'read', 1.4, 'board_read', null, '이 근처인데… 두근두근'),
    ] });
  put({ id: 'plaza.pass_cheer', place: 'plaza', name: '친구 번호 같이 찾기', gain: { social: 12, fun: 6 }, hours: [7, 22], cheer: true, group: true,
    steps: [
      S(BOARD + '|bench_sit_a|bench_sit_b', 'wait', 1.5, 'tilt_look', null, '친구 번호가 몇 번이더라'),
      S(BOARD + '|bench_sit_a|bench_sit_b', 'wait', 2, 'peek_tiptoe', null, '친구 번호 같이 찾는 중'),
      S(BOARD + '|bench_sit_a|bench_sit_b', 'idle', 1.5, 'chat_nod', null, '두근두근'),
    ] });

  /* ---------- 시험 뒤 흐름 ---------- */
  put({ id: 'plaza.results_wait', place: 'plaza', name: '합격 발표 기다리기', hours: [6, 20], gain: { fun: 2 }, resultsWait: true,
    steps: [S('bench_sit_a|bench_sit_b|speaker_listen', 'wait', 40, 'wait_tap', null, '발표를 기다리며 두근두근')] });
  put({ id: 'plaza.results_cry', place: 'plaza', name: '떨어져서 훌쩍', hours: [6, 22], gain: { fun: -2 }, resultsCry: true,
    steps: [S('bench_sit_a|bench_sit_b', 'cry', 3, 'cry', null, '훌쩍… 다음엔 꼭'), S('bench_sit_a|bench_sit_b', 'sit', 2, 'sit_idle', null, '마음 추스르는 중')] });
  if (root.Purpose && root.Purpose.RULES) root.Purpose.RULES.unshift([/^plaza\.results_(wait|cry)$/, 'step', '시험 뒤에 이어지는 단계']);
  const L = root.Labor && root.Labor.prototype;
  if (L) {
    const fin0 = L.onFinish;
    L.onFinish = function (c, x) {
      const s = this.sim;
      const hadResult = !!c.pendingResult;
      fin0.apply(this, arguments);
      if (c.extra) return;
      // 시험을 마치면 광장으로 가서 발표를 기다린다 (발표 전이면)
      if (x.examTake && s.hour < 13) { c.orders.length = 0; s.order(c, VO.BY_ID['plaza.results_wait']); }
      // 게시판을 보고 나면: 합격 → 자격증 카드 받으러, 불합격 → 벤치에서 훌쩍
      if (x.passBoard && hadResult && !c.pendingResult) {
        // 내 번호를 찾았으면 그 종이에 빨간 동그라미
        const sh = c.examNo && sheets[c.examNo.day];
        if (sh && c.lastExam && c.lastExam.pass) { sh.circled[c.examNo.no] = 1; refresh(); }
        c.orders.length = 0;
        c.afterBoard = c.cardDue ? 'exam.card' : c.lastExam && !c.lastExam.pass ? 'plaza.results_cry' : null;
        if (c.afterBoard) { c.afterBoardUntil = s.minutes + 240; s.order(c, VO.BY_ID[c.afterBoard]); }
      }
    };
  }
  // 기다리던 중에 발표가 붙으면 town-sets의 모임이 게시판으로 부른다. 발표 시각을 넘겨 기다리고 있으면 끝낸다
  const VP = root.Village && root.Village.Village && root.Village.Village.prototype;
  if (VP) {
    const update0 = VP.update;
    VP.update = function (dtReal) {
      update0.call(this, dtReal);
      // 게시판 뒤 행동: 친구가 말을 걸어 끊겨도, 한가해지면 다시 이어 간다 (4시간 안)
      for (const c of this.chars) {
        if (!c.afterBoard) continue;
        if (c.doing && c.doing.x && c.doing.x.id === c.afterBoard) { c.afterBoard = null; continue; }
        if (this.minutes > c.afterBoardUntil || (c.afterBoard === 'exam.card' && !c.cardDue)) { c.afterBoard = null; continue; }
        if (!c.doing && !c.orders.length && !c.walking) this.order(c, VO.BY_ID[c.afterBoard]);
      }
      if (this.hour < 13) return;
      for (const c of this.chars) if (c.doing && c.doing.x && c.doing.x.resultsWait && !c.pendingResult && this.hour >= 14) this.abort(c, '');
    };
  }
  // 수험번호는 저장에 남긴다 (불러오면 게시판 종이를 다시 만든다)
  if (L && L.save && L.load) {
    const save0 = L.save, load0 = L.load;
    L.save = function (c) { return Object.assign(save0.call(this, c), { examNo: c.examNo, lastExam: c.lastExam }); };
    L.load = function (c, r) { load0.call(this, c, r); if (r && r.examNo) c.examNo = { no: +r.examNo.no, day: +r.examNo.day }; if (r && r.lastExam && !c.lastExam) c.lastExam = r.lastExam; };
  }
  root.PassBoard = { sheets, sheetFor, refresh, live, current };
}(typeof self !== 'undefined' ? self : this));
