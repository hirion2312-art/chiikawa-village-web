'use strict';

// 치이카와 심즈 — 달력과 자격증 시험
// 한 달은 4주(28일). 시험 날은 2주마다 하루이고 전원이 같은 날 시험장에 간다. 각자 자기가 가진 등급의 다음 급수를 본다.
// 시험은 12시에 시작한다. 시험 볼 주민은 제시간에 닿도록 하던 일을 멈추고 간다. 합격 여부는 쌓은 공부량으로 정해지고, 결과는 그날 13시에 나온다.
// 카니(후루혼야)는 노동이 끝나면 헌책방을 본다
(function (root) {
  const MONTH = 28;
  const WEEK = ['월', '화', '수', '목', '금', '토', '일'];
  const CYCLE = 14;                  // 시험은 2주마다 다시 볼 수 있다
  const FIRST_EXAM = 10;             // 첫 시험 날. 이후 CYCLE마다
  const GRADE_NEED = { 0: 7, 5: 9, 3: 16, 2: 22 };
  // 슈퍼 알바이터: 풀뽑기와 별개로 공부하면 누구나 본다. 1차와 2차를 모두 붙어야 하고 공부를 다 해도 잘 떨어진다
  const ARB_FIRST = 3;               // 첫 시험 날. 풀뽑기와 겹치지 않게 일주일 어긋나게 두고, 이후 CYCLE마다
  const ARB_NEED = { 1: 28, 2: 45 }; // 공부량
  const ARB_RATE = { 1: 0.35, 2: 0.22 }; // 공부량을 채웠을 때의 합격률 (성실할수록 조금 오른다)
  const ARB_APPLY = 6;               // 이만큼 공부하면 응시한다
  const NEXT_GRADE = { 0: 5, 5: 3, 3: 2, 2: 1 };  // 0은 무자격
  const SHOP_OWNER = 'furuhonya';
  const EXAM_START = 12 * 60;        // 시험 시작 (하루 안의 분)
  const EXAM_END = 12 * 60 + 40;     // 답안 제출
  const RESULT_HOUR = 13;            // 결과 발표
  const WALK_SPEED = 4.2;            // village-sim.js WALK와 같다

  // 전원이 12시에 함께 보므로 시험장 양쪽 통로에 자리를 더 둔다 (긴 책상을 마주 보고 선다)
  for (let i = 0; i < 4; i++) {
    const across = -1.4 + i * 1.4;   // 통로 입구(왼쪽 끝)는 비워 둔다
    root.ASSET_SOCKETS.exam[`desk_stand_${i + 1}`] = [4.9, across, 0, 3, across];
    root.ASSET_SOCKETS.exam[`desk_stand_${i + 5}`] = [-3.9, across, 0, -3, across];
  }
  const SEATS = 'desk_sit_*|desk_stand_*';
  // 슈퍼 알바이터 시험장의 빈 공간에 응시 자리를 둔다
  [[-3.4, 1.6], [-1.4, 1.6], [-3.4, 3], [-1.4, 3], [-3.4, 4.4], [-1.4, 4.4]].forEach(([dx, dz], i) => {
    root.ASSET_SOCKETS.arbiter[`arb_stand_${i + 1}`] = [dz, -dx, 0.24, dz, -(dx + 3)];
  });
  const ARB_SEATS = 'desk_sit|arb_stand_*';

  const { LIST, BY_ID } = root.VillageObjects;
  const S = (socket, act, min, clip, prop) => ({ socket, act, min, clip, prop });
  const add = x => {
    LIST.push(x);
    BY_ID[x.id] = x;
  };
  add({
    id: 'exam.take', place: 'exam', name: '풀뽑기 검정 시험 보기', examTake: 'grass', hours: [6, 14], gain: { energy: -10 },
    // 전원이 같은 날 보므로 한 명이 책상을 오래 잡지 않는다 (책상 2개)
    steps: [{ ...S(SEATS, 'wait', 1, 'idle_fidget'), until: EXAM_START, label: '시험 시작을 기다리는 중' }, { ...S(SEATS, 'study', 2, 'study_home', 'book'), until: EXAM_END, label: '답안 쓰는 중' }, { ...S(SEATS, 'idle', 1, 'idle_stretch'), label: '답안 제출' }],
  });
  add({
    id: 'arbiter.take', place: 'arbiter', name: '슈퍼 알바이터 시험 보기', examTake: 'arbiter', hours: [6, 14], gain: { energy: -12 },
    steps: [{ ...S(ARB_SEATS, 'wait', 1, 'idle_fidget'), until: EXAM_START, label: '시험 시작을 기다리는 중' }, { ...S(ARB_SEATS, 'study', 2, 'study_home', 'book'), until: EXAM_END, label: '답안 쓰는 중' }, { ...S(ARB_SEATS, 'idle', 1, 'belly_pat'), label: '답안 제출' }],
  });
  // 슈퍼 알바이터 공부: 시험장 책상과 각자 집에서
  const arbDesk = BY_ID['arbiter.desk_sit.시험 문제 풀기'];
  if (arbDesk) Object.assign(arbDesk, { name: '슈퍼 알바이터 문제 풀기', skill: 'arbiter' });
  const arbStudy = (place, socket, who) => add({ id: `${place}.arb_study`, place, name: '슈퍼 알바이터 공부', only: [who], skill: 'arbiter', worth: 300, hours: [8, 23], gain: { energy: -8, fun: -6 }, steps: [S(socket, 'study', 30, 'study_home', 'book')] });
  arbStudy('home', 'table_sit', 'chiikawa');
  arbStudy('cave', 'tea_sit_*', 'hachiware');
  for (const w of ['momonga', 'rakko', 'kurimanju', 'furuhonya']) arbStudy(`${w}Home`, 'study_sit', w);
  // 노동을 마친 카니의 하루: 책을 정리하고, 앉아 읽고, 손님에게 인사하고, 먼지를 닦는다
  add({
    id: 'market.run_books', place: 'market', name: '헌책방 보기', only: [SHOP_OWNER], hours: [10, 19], earn: 250, gain: { fun: 8, energy: -3 },
    steps: [S('books.staff_side', 'browse', 6, 'browse_shelf', 'book'), S('books.staff_side', 'read', 14, 'read_book', 'book'), S('books.staff_side', 'talk', 3, 'wave'), S('books.staff_side', 'wipe', 5, 'wipe_towel', 'towel')],
  });

  class Calendar {
    constructor(sim) {
      this.sim = sim;
      this.announcedFor = -1;
      sim.chars.filter(c => !c.extra).forEach(c => {
        c.arbiter = root.Persona.startsWithArbiter(c);
        c.arbStage = 1;
        c.arbStudy = 0;
        c.arbExam = null;
        c.exam = null;
        c.examResult = null;
      });
      this.schedule();
    }
    dateOf(day) {
      const d = day - 1;
      return { month: Math.floor(d / MONTH) + 1, dom: (d % MONTH) + 1, week: WEEK[d % 7] };
    }
    label(day = this.sim.day) {
      const { month, dom, week } = this.dateOf(day);
      return `${month}월 ${dom}일 (${week})`;
    }
    // 풀뽑기 검정: 1급까지 따면 더 볼 시험이 없다
    certOf(c) { return c.grade === 1 ? null : 'grass'; }
    need(c) { return GRADE_NEED[c.grade] || 0; }
    examName(c) { return this.certOf(c) ? `풀뽑기 ${NEXT_GRADE[c.grade]}급 시험` : ''; }
    arbNeed(c) { return ARB_NEED[c.arbStage || 1]; }
    arbName(c) { return `슈퍼 알바이터 ${c.arbStage || 1}차 시험`; }
    // 오늘 봐야 하는 시험 (풀뽑기와 슈퍼 알바이터는 날이 겹치지 않는다)
    today(c) {
      const s = this.sim;
      for (const e of [c.exam, c.arbExam]) if (e && e.day === s.day && !e.taken) return e;
      return null;
    }
    // 아직 정해지지 않았거나 지난 시험의 다음 날짜를 잡는다
    schedule() {
      const s = this.sim;
      for (const c of s.chars) {
        if (c.extra) continue;
        const cert = this.certOf(c);
        if (!cert) {
          c.exam = null;
          continue;
        }
        // 전에 저장한 개인별 날짜는 공통 시험 날로 다시 잡는다
        if (c.exam && c.exam.day >= s.day && !c.exam.taken && (c.exam.day - FIRST_EXAM) % CYCLE === 0) {
          c.exam.cert = cert;
          continue;
        }
        let day = FIRST_EXAM;
        while (day < s.day || (c.exam && c.exam.taken && day <= c.exam.day)) day += CYCLE;
        c.exam = { cert, day, taken: false };
      }
      // 슈퍼 알바이터: 어느 정도 공부한 주민만 응시한다
      for (const c of s.chars) {
        if (c.extra) continue;
        if (c.arbiter || (c.arbStudy || 0) < ARB_APPLY) {
          if (!(c.arbExam && c.arbExam.day === s.day && !c.arbExam.taken)) c.arbExam = null;
          continue;
        }
        if (c.arbExam && c.arbExam.day >= s.day && !c.arbExam.taken) continue;
        let day = ARB_FIRST;
        // 오늘 시험 시간이 이미 지났으면 다음 회차로
        while (day < s.day || (day === s.day && s.hour >= 11) || (c.arbExam && c.arbExam.taken && day <= c.arbExam.day)) day += CYCLE;
        c.arbExam = { cert: 'arbiter', day, taken: false };
      }
    }
    daysLeft(c) { return c.exam ? c.exam.day - this.sim.day : Infinity; }

    tick() {
      const s = this.sim;
      const h = s.hour;
      if (this.scheduledFor !== s.day) {
        this.scheduledFor = s.day;
        this.schedule();
      }
      // 시험 볼 주민은 제시간에 닿게 하던 일을 멈추고 나선다
      if (h < RESULT_HOUR) {
        for (const c of s.chars) {
          if (!this.dueNow(c) || (c.doing && c.doing.x && c.doing.x.examTake)) continue;
          if (c.doing) s.abort(c, '');
          c.orders.length = 0;
          c.pull = null;
          c.idleLeft = 0;
        }
      }
      // 결과 발표 때까지 끝내지 못하면 결시
      if (h >= RESULT_HOUR) {
        for (const c of s.chars) {
          const e = c.extra ? null : this.today(c);
          if (!e) continue;
          if (c.doing && c.doing.x && c.doing.x.examTake) s.abort(c, '');
          e.taken = true;
          c.examResult = { pass: false, absent: true, name: e.cert === 'arbiter' ? this.arbName(c) : this.examName(c), cert: e.cert, stage: c.arbStage, on: s.day };
          this.schedule();
        }
      }
      if (h >= RESULT_HOUR && this.announcedFor !== s.day) {
        this.announcedFor = s.day;
        for (const c of s.chars) {
          const r = c.examResult;
          if (!r || r.on > s.day) continue;
          c.examResult = null;
          this.announce(c, r);
        }
        // 엑스트라의 슈퍼 알바이터는 시험 날마다 조용히 정해진다 (성실한 주민만, 드물게)
        if (s.day % CYCLE === ARB_FIRST % CYCLE) {
          for (const c of s.chars) {
            if (!c.extra || c.arbiter || c.monster || c.gone || c.traits.diligent < 0.55) continue;
            if (s.random() < 0.15) {
              if ((c.arbStage || 1) >= 2) c.arbiter = true;
              else c.arbStage = 2;
            }
          }
        }
        // 엑스트라는 시험장에 가지 않고 공부량으로만 조용히 정해진다
        if (s.day % CYCLE === 0) {
          for (const c of s.chars) {
            if (!c.extra) continue;
            const need = GRADE_NEED[c.grade];
            if (need && c.study >= need) {
              c.grade = NEXT_GRADE[c.grade];
              c.study = 0;
            }
          }
        }
      }
    }
    announce(c, r) {
      const s = this.sim;
      if (r.pass) {
        c.lastExam = { name: r.name, pass: !!r.pass, absent: !!r.absent };
        if (r.cert === 'arbiter') {
          if (r.stage >= 2) c.arbiter = true;
          else c.arbStage = 2;
          c.arbStudy = 0;
        } else c.grade = NEXT_GRADE[c.grade];
        s.note(`합격 발표: ${c.name} ${r.name} 합격`);
        s.labor.react(c, 'jump_joy', '붙었다!!');
      } else {
        c.lastExam = { name: r.name, pass: false, absent: !!r.absent };
        // 슈퍼 알바이터 2차에 떨어지면 1차부터 다시 본다
        if (r.cert === 'arbiter' && !r.absent) {
          if (r.stage >= 2) c.arbStage = 1;
          c.arbStudy = Math.floor((c.arbStudy || 0) / 2);
        }
        s.note(`합격 발표: ${c.name} ${r.name} ${r.absent ? '결시' : '불합격'}`);
        s.labor.react(c, 'cry', r.absent ? '시험을 놓쳤어…' : '떨어졌어…');
      }
      // 성격대로 결과에 반응하고 열망을 센다 (traits.js)
      if (s.traits) s.traits.onExam(c, r);
      this.schedule();
    }

    blocked(c, x) {
      if (c.extra) return '시험을 신청하지 않았어요';
      const mine = x.examTake === 'arbiter' ? c.arbExam : c.exam;
      if (!mine) return x.examTake === 'arbiter' ? '공부를 더 해야 응시할 수 있어요' : '이 시험을 준비하고 있지 않아요';
      if (mine.day !== this.sim.day) return `시험 날은 ${this.label(mine.day)}이에요`;
      if (mine.taken) return '오늘 시험은 봤어요';
      return null;
    }
    // 시험장까지 걸리는 시간을 넉넉히 잡아 12시에 닿도록 떠나는 시각 (하루 안의 분)
    departAt(c, e) {
      const s = this.sim;
      const x = s.interactions.find(i => i.examTake === e.cert);
      const p = x && s.places[x.place];
      if (!p) return EXAM_START;
      return Math.max(7 * 60, EXAM_START - (Math.hypot(c.x - p.x, c.z - p.z) * 1.7) / WALK_SPEED - 35);
    }
    dueNow(c) {
      const s = this.sim;
      const e = c.extra ? null : this.today(c);
      if (!e || s.hour >= RESULT_HOUR) return false;
      return s.hour * 60 >= (e.leaveAt === undefined ? (e.leaveAt = this.departAt(c, e)) : e.leaveAt);
    }
    // 시험 볼 때가 되면 다른 일보다 먼저 간다
    duty(c) {
      const s = this.sim;
      if (!this.dueNow(c)) return null;
      const e = this.today(c);
      const x = s.interactions.find(i => i.examTake === e.cert);
      if (!x) return null;
      if (!x.steps.every(st => s.freeSocket(c, x.place, st.socket, x.shared))) return 'wait';
      return x;
    }
    finishExam(c, x) {
      const s = this.sim;
      if (x.examTake === 'arbiter') {
        if (!c.arbExam) return;
        const stage = c.arbStage || 1;
        const enough = (c.arbStudy || 0) >= ARB_NEED[stage];
        const pass = enough && s.random() < ARB_RATE[stage] + c.traits.diligent * 0.15;
        c.examResult = { pass, cert: 'arbiter', stage, name: this.arbName(c), on: s.day };
        c.arbExam.taken = true;
        s.note(`${c.name}: ${c.examResult.name}을 봤어요`);
        this.schedule();
        return;
      }
      if (!c.exam || c.exam.cert !== x.examTake) return;
      const need = this.need(c);
      c.examResult = { pass: c.study >= need, cert: c.exam.cert, name: this.examName(c), on: s.day };
      s.note(`${c.name}: ${c.examResult.name}을 봤어요 (공부 ${c.study}/${need})`);
      c.exam.taken = true;
      c.study = 0;
      this.schedule();
    }
    // 노동이 끝나면 카니는 헌책방으로 간다. 플레이트가 있거나 몹시 지쳤으면 그것부터
    routine(c) {
      const s = this.sim;
      if (c.id !== SHOP_OWNER || c.plate || s.hour < 10 || s.hour >= 18.5) return null;
      if (c.needs.hunger < 25 || c.needs.energy < 25 || c.needs.hygiene < 15) return null;
      const x = BY_ID['market.run_books'];
      if (!s.interactions.includes(x) || s.ecology.overLimit(c, x)) return null;
      return x.steps.every(st => s.freeSocket(c, x.place, st.socket, x.shared)) ? x : null;
    }
    // 시험이 다가올수록 공부하고 싶어진다. 이미 충분히 했으면 끌리지 않는다
    scoreBonus(c, x) {
      let v = 0;
      if (x.skill === 'arbiter' && !c.extra) {
        // 돈이 되는 자격이라 성실한 주민일수록 공부한다. 이미 있으면 할 이유가 없다
        if (c.arbiter) v -= 200;
        else v += Math.max(0, c.traits.diligent - 0.3) * 70 + (c.money < 1000 ? 12 : 0) + (c.arbExam ? 20 : 0);
      }
      if (x.skill === 'grass' && !c.extra && c.exam) {
        const need = this.need(c);
        if (c.study >= need) v -= 40;
        else {
          const left = Math.max(0, this.daysLeft(c));
          v += (1 - Math.min(1, left / CYCLE)) * 70 + c.traits.diligent * 30 + ((need - c.study) / need) * 20;
        }
      }
      // 카니는 아침에 플레이트를 집으러 간다
      if (c.id === SHOP_OWNER && x.takeKind) v += 40;
      return v;
    }
    // 달력 화면: 이번 달 28칸과 칸마다 시험 보는 주민
    monthCells() {
      const s = this.sim;
      const { month } = this.dateOf(s.day);
      const first = (month - 1) * MONTH + 1;
      const mains = s.chars.filter(c => !c.extra);
      return Array.from({ length: MONTH }, (_, i) => {
        const day = first + i;
        return { day, dom: i + 1, today: day === s.day, past: day < s.day, names: mains.filter(c => (c.exam && c.exam.day === day) || (c.arbExam && c.arbExam.day === day)).map(c => c.name) };
      });
    }
  }
  Calendar.WEEK = WEEK;
  root.Calendar = Calendar;
}(typeof self !== 'undefined' ? self : this));
