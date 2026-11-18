'use strict';

// 치이카와 심즈 — 노동 (기획: docs/labor-plan-2026-11-08.md)
// 아침에 목제 플레이트가 꽂이에 꽂히고, 선착순으로 집어 창구에 접수한 사람만 일을 할 수 있다.
// 끝나면 접수처로 돌아와 정산해야 돈을 받는다. 화면을 모르는 판단 부분과 꽂이 모형을 함께 둔다
(function (root) {
  const KINDS = {
    grass: { label: '풀뽑기', n: 16, color: '#b7d6a5' },
    hunt: { label: '토벌', n: 8, color: '#e6a79a' },
    gather: { label: '채집', n: 8, color: '#e8c97c' },
    lemon: { label: '레몬 스티커', n: 6, color: '#f2e27a' },
  };
  const PAY = { hunt: 1800, gather: 1150, lemon: 1450 };
  const GRASS_CAP = { 0: 1100, 5: 1200, 3: 1400, 2: 1500, 1: 1650 };
  // 자기 생업이 있어 노동 플레이트를 가지러 오지 않는 주민
  const NO_LABOR = new Set(['shisa', 'rakko']);
  const RAKKO_MONEY = 30000;

  class Labor {
    constructor(sim) {
      this.sim = sim;
      this.plates = [];
      for (const [kind, k] of Object.entries(KINDS)) for (let i = 0; i < k.n; i++) this.plates.push({ kind, state: 'gone', holder: null, pay: 0 });
      this.postedDay = -1;
      this.expiredDay = -1;
      this.overdueDay = -1;
      for (const c of sim.chars) {
        Object.assign(c, { plate: null, grade: root.Persona.startGrade(c), study: 0, huntSkill: 0, wantTrain: 0, owned: [] });
        root.Shop.giveStart(c);
        // 랏코는 토벌 랭킹 1위라 모아 둔 돈이 아주 많다
        if (c.id === 'rakko') c.money = RAKKO_MONEY;
      }
    }
    left(kind) { return this.plates.filter(p => p.kind === kind && p.state === 'posted').length; }

    tick() {
      const s = this.sim;
      const h = s.hour;
      if (h >= 6 && this.postedDay !== s.day) {
        this.postedDay = s.day;
        for (const p of this.plates) {
          if (p.holder && p.holder.plate === p) continue;
          Object.assign(p, { state: 'posted', holder: null, pay: 0 });
        }
        s.note('오늘의 노동 플레이트가 꽂였어요');
      }
      if (h >= 12 && this.expiredDay !== s.day) {
        this.expiredDay = s.day;
        for (const p of this.plates) {
          if (p.state === 'posted') p.state = 'gone';
          // 집기만 하고 접수하지 않은 플레이트는 돌아간다
          if (p.state === 'taken' && !(p.holder.doing && (p.holder.doing.x.takeKind || p.holder.doing.x.accept))) this.release(p);
        }
      }
      // 작업 시간이 끝나도록 못 한 일은 실패로 돌린다. 플레이트는 돌려주러 가야 한다
      if (h >= 17 && this.closedDay !== s.day) {
        this.closedDay = s.day;
        for (const p of this.plates) if (p.state === 'accepted') p.state = 'failed';
      }
      if (h >= 18 && this.overdueDay !== s.day) {
        this.overdueDay = s.day;
        for (const p of this.plates) {
          if (!p.holder) continue;
          p.holder.banDay = s.day + 1;
          s.note(`${p.holder.name}: 플레이트를 반납하지 못했어요`);
          this.release(p);
        }
      }
    }
    release(p) {
      if (p.holder) p.holder.plate = null;
      p.holder = null;
      p.state = 'gone';
    }

    react(c, clip, text) {
      c.reactClip = clip;
      c.reactLeft = 3;
      if (text) this.sim.say(c, text, 3);
    }

    // 지금 이 상호작용을 할 수 없는 이유. 할 수 있으면 null
    blocked(c, x) {
      const s = this.sim;
      // 풀뽑기는 자기 등급 구역에서만 (weeding-field.js)
      if (x.zoneGrade !== undefined && x.zoneGrade !== (c.grade || 0)) return '다른 등급 구역이에요';
      // 랏코는 토벌만 한다: 플레이트·가게 알바·상시 일거리는 하지 않는다
      if (c.id === 'rakko' && x.id !== 'wilds.rakko_hunt' && (x.takeKind || x.plate || x.accept || x.settle || x.isJob || x.earn)) return '랏코는 토벌만 해요';
      const noItem = root.Shop.blocked(c, x);
      if (noItem) return noItem;
      const offShift = root.Shifts.blocked(s, c, x);
      if (offShift) return offShift;
      if (x.takeKind) {
        if (NO_LABOR.has(c.id)) return '자기 일이 있어요';
        if (c.plate) return '이미 플레이트가 있어요';
        if (c.plateDay === s.day) return '오늘 일은 끝났어요';
        if (c.banDay === s.day) return '어제 반납을 안 했어요';
        if (!this.left(x.takeKind)) return '다 나갔어요';
      } else if (x.plate) {
        if (!c.plate || c.plate.kind !== x.plate || c.plate.state !== 'accepted') return '플레이트가 있어야 해요';
      } else if (x.accept) {
        if (!c.plate || c.plate.state !== 'taken') return '접수할 플레이트가 없어요';
      } else if (x.settle) {
        if (!c.plate || (c.plate.state !== 'done' && c.plate.state !== 'failed')) return '정산할 일이 없어요';
      } else if (x.examTake) {
        return this.sim.calendar ? this.sim.calendar.blocked(c, x) : '지금은 안 해요';
      }
      return null;
    }

    // 플레이트를 가진 사람이 지금 해야 하는 일. 가져갔으면 접수하고, 접수했으면 일하고, 끝났으면 정산한다
    duty(c) {
      const p = c.plate;
      if (!p) return null;
      const s = this.sim;
      const want = p.state === 'taken' ? (x => x.accept) : p.state === 'accepted' ? (x => x.plate === p.kind) : (x => x.settle);
      // 토벌은 갈 수 있는 구역 가운데 가장 깊은 곳으로 (보수가 크다)
      const x = s.interactions.filter(i => want(i) && s.open(i) && !this.blocked(c, i)).sort((a, b) => (b.huntTier || 0) - (a.huntTier || 0))[0];
      if (!x) return null;
      // 첫 자리(정산은 줄 자리)가 다 찼으면 놀러 가지 않고 자리가 날 때까지 기다린다.
      // 다음 단계 자리는 미리 비어 있을 필요가 없다: 앞 단계 자리에서 차례를 기다린다 (village-sim nextStep의 queue)
      if (!s.freeSocket(c, x.place, x.steps[0].socket, x.shared)) return 'wait';
      return x;
    }

    // 꽂이 앞에 도착한 순간에 집는다 (선착순). 그 사이 다 나갔으면 false
    onArrive(c, d) {
      if (!d.x.takeKind || d.step !== 0) return true;
      const p = this.plates.find(q => q.kind === d.x.takeKind && q.state === 'posted');
      if (!p) {
        this.sim.abort(c, '');
        this.react(c, 'no_plate', '다 나갔어…');
        return false;
      }
      p.state = 'taken';
      p.holder = c;
      c.plate = p;
      return true;
    }

    huntChance(c) {
      const power = this.sim.persona.power(c) / 1000;
      const v = 0.15 + power * 0.5 + (c.huntSkill / 100) * 0.35 + (c.needs.energy / 100) * 0.1;
      return Math.max(0.1, Math.min(0.95, v));
    }

    onFinish(c, x) {
      const s = this.sim;
      root.MinorActs.finished(s, c, x);
      if ((x.takeKind || x.accept) && c.plate) {
        c.plate.state = 'accepted';
        // 풀뽑기를 접수하면 갑옷씨가 빈 제초 주머니를 건넨다
        if (x.accept && c.plate.kind === 'grass') {
          c.bag = { fill: 0 };
          s.note(`${c.name}: 갑옷씨에게 제초 주머니를 받았어요`);
        }
        s.note(`${c.name}: ${KINDS[c.plate.kind].label} 플레이트를 가져갔어요`);
      } else if (x.plate && c.plate) {
        const p = c.plate;
        if (p.kind === 'hunt') {
          if (s.random() < this.huntChance(c)) {
            p.state = 'done';
            p.pay = PAY.hunt;
            c.huntWins = (c.huntWins || 0) + 1;
            // 진짜 괴물을 쓰러뜨렸으면 웃돈
            if (s.ecology.slay(c)) p.pay += 500;
            c.huntSkill = Math.min(100, c.huntSkill + 3);
            s.note(`${c.name}: 토벌 성공`);
            this.react(c, 'jump_joy', '해냈다!');
          } else {
            p.state = 'failed';
            p.pay = 0;
            c.wantTrain = 2;
            s.note(`${c.name}: 토벌 실패. 훈련하고 싶어 해요`);
            this.react(c, 'cry', '더 강해져야 해…');
          }
        } else if (p.kind === 'grass') {
          p.state = 'done';
          const cap = GRASS_CAP[c.grade];
          p.pay = Math.round((900 + (cap - 900) * (0.4 + c.traits.diligent * 0.6)) / 10) * 10;
        } else {
          p.state = 'done';
          p.pay = PAY[p.kind];
        }
      } else if (x.settle && c.plate) {
        const p = c.plate;
        c.money += p.pay;
        c.bag = null;
        s.note(p.pay ? `${c.name}: ${KINDS[p.kind].label} 보수 +${p.pay}원` : `${c.name}: 플레이트를 돌려줬어요`);
        c.plateDay = s.day;
        this.release(p);
      }
      if (x.id === 'wilds.rakko_hunt') {
        // 진짜 괴물을 쓰러뜨렸으면 웃돈 (보수 2500원은 상호작용 earn으로 들어온다)
        if (s.ecology.slay(c)) c.money += 500;
        c.huntWins = (c.huntWins || 0) + 1;
        c.huntSkill = Math.min(100, c.huntSkill + 1);
      }
      if (x.buy) {
        root.Shop.give(c, x.buy);
        { const nm = root.Shop.ITEMS[x.buy].name, k = nm.charCodeAt(nm.length - 1) - 0xac00; s.note(`${c.name}: ${nm}${k >= 0 && k < 11172 && k % 28 ? '을' : '를'} 샀어요`); }
      }
      if (x.train) {
        c.huntSkill = Math.min(100, c.huntSkill + 10);
        if (c.wantTrain > 0) c.wantTrain -= 1;
      }
      if (x.skill === 'grass') c.study = Math.round((c.study + root.Persona.studyGain(c)) * 10) / 10;
      if (x.skill === 'arbiter') c.arbStudy = Math.round(((c.arbStudy || 0) + root.Persona.studyGain(c)) * 10) / 10;
      if (x.examTake) s.calendar.finishExam(c, x);
    }

    // 주민이 일을 고를 때 더하는 점수
    scoreBonus(c, x) {
      let v = 0;
      if (x.takeKind === 'hunt') v += (c.traits.brave - 0.5) * 30;
      // 랏코의 상시 토벌: 돈이 많아도 토벌이 삶이다 (욕구가 급하면 먹고 쉬는 쪽이 이긴다)
      if (x.id === 'wilds.rakko_hunt') v += 65;
      // 무기를 갖고 있으면 토벌(보수가 가장 큰 일)을 하러 간다. 해 볼수록 더
      if (x.takeKind === 'hunt' && root.Shop.owns(c, 'weapon')) v += 20 + (c.huntSkill || 0) * 0.2;
      if (x.takeKind === 'grass') v += (5 - c.grade) * 4;
      if (x.train && c.wantTrain) v += 45;
      v += root.Shop.score(c, x, this.sim);
      v += root.Shifts.score(this.sim, c, x);
      if (this.sim.calendar) v += this.sim.calendar.scoreBonus(c, x);
      return v;
    }
    saveWorld() { return { postedDay: this.postedDay, expiredDay: this.expiredDay, closedDay: this.closedDay, overdueDay: this.overdueDay, plates: this.plates.map(p => (p.holder ? null : p.state)) }; }
    loadWorld(w) {
      if (!w) return;
      Object.assign(this, { postedDay: w.postedDay, expiredDay: w.expiredDay, closedDay: w.closedDay, overdueDay: w.overdueDay });
      (w.plates || []).forEach((st, i) => { if (st && this.plates[i] && !this.plates[i].holder) this.plates[i].state = st; });
    }
    save(c) { return { owned: c.owned, rakkoRich: 1, gradeV: 4, grade: c.grade, study: c.study, huntSkill: c.huntSkill, wantTrain: c.wantTrain, exam: c.exam, examResult: c.examResult, arbiter: c.arbiter, arbStage: c.arbStage, arbStudy: c.arbStudy, arbExam: c.arbExam, lastExam: c.lastExam, plate: c.plate ? { kind: c.plate.kind, state: c.plate.state, pay: c.plate.pay } : null, plateDay: c.plateDay, banDay: c.banDay }; }
    load(c, r) { 
      // 등급표가 바뀌기 전 저장은 등급·공부·시험을 새로 시작한다
      const keep = r.gradeV === 4 ? ['grade', 'study', 'huntSkill', 'wantTrain', 'exam', 'examResult', 'arbiter', 'lastExam'] : ['huntSkill', 'wantTrain', 'arbiter'];
      for (const k of keep) if (r[k] !== undefined) c[k] = r[k];
      if (r.arbStage !== undefined) Object.assign(c, { arbStage: r.arbStage, arbStudy: r.arbStudy, arbExam: r.arbExam });
      if (root.Persona.startsWithArbiter(c)) c.arbiter = true;
      if (r.owned) c.owned = r.owned;
      root.Shop.giveStart(c);
      if (c.id === 'rakko' && !r.rakkoRich) c.money = Math.max(c.money, RAKKO_MONEY);
      c.plateDay = r.plateDay;
      c.banDay = r.banDay;
      // 들고 있던 플레이트를 되찾는다
      if (r.plate) {
        const p = this.plates.find(q => q.kind === r.plate.kind && !q.holder);
        if (p) {
          Object.assign(p, { state: r.plate.state, pay: r.plate.pay || 0, holder: c });
          c.plate = p;
        }
      }
    }
  }
  Labor.KINDS = KINDS;

  /* ---------- 목제 플레이트 꽂이 ---------- */

  // 접수처 앞마당에 세운다. 플레이트는 낱개 모델이라 집어 가면 하나씩 사라진다
  Labor.buildRack = function (world, scene) {
    const p = world.places.find(q => q.id === 'reception');
    if (!p) return null;
    const g = new THREE.Group();
    g.position.set(p.x + 11, world.floorAt(p.x + 11, p.z + 8), p.z + 8);
    scene.add(g);
    const k = makeKit(g, p.x + 11, p.z + 8, 0);
    k.box(-3.8, 2.3, 0, 0.42, 4.6, 0.42, '#8c6a46', 2);
    k.box(3.8, 2.3, 0, 0.42, 4.6, 0.42, '#8c6a46', 2);
    k.box(0, 2.75, -0.08, 8, 4.3, 0.34, '#a97c50', 2);
    k.box(0, 5.05, 0, 8.8, 0.5, 0.9, '#7d5a44', 2);
    k.paint(0, 3.86, 0.11, 6, 0.8, ctx => drawText(ctx, '오늘의 노동', 0, 0.4, 5.4, 0.72, '#fff8e6'));
    const boards = [];
    let i = 0;
    for (const [, info] of Object.entries(KINDS)) {
      for (let n = 0; n < info.n; n++, i++) {
        // 플레이트 38장: 10칸 4줄 (i는 종류를 이어서 센다)
        const x = -3.4 + (i % 10) * 0.755;
        const y = 3.3 - Math.floor(i / 10) * 0.68;
        const b = new THREE.Group();
        b.position.set(x, y, 0.16);
        b.scale.setScalar(0.44);
        g.add(b);
        const bk = makeKit(b, 0, 0, 0);
        bk.box(0, 0, 0, 1.62, 0.68, 0.1, info.color, 1);
        bk.paint(0, -0.34, 0.07, 1.5, 0.68, ctx => drawText(ctx, info.label, 0, 0.34, 1.32, 0.5, SIGN_INK));
        boards.push(b);
      }
    }
    return boards;
  };

  root.Labor = Labor;
  // 풀뽑기는 플레이트가 8장이니 뽑을 자리도 8곳
  Object.assign(window.ASSET_SOCKETS.weeding, { pull_4: [-1.6, -3, 0.3, -1.6, -4], pull_5: [2.4, -2.6, 0.3, 2.4, -3.6], pull_6: [-5, 2, 0.3, -5, 1], pull_7: [4.6, 0.2, 0.3, 4.6, -0.8], pull_8: [0, 4.4, 0.3, 0, 3.4] });
  window.ASSET_SOCKETS.reception = window.ASSET_SOCKETS.reception || {};
  // 창구와 저울은 여러 명이 나란히 쓴다 (한 자리면 줄이 막혀 다들 포기한다)
  Object.assign(window.ASSET_SOCKETS.reception, { window_2: [-2.4, 3.4, 0.2, -2.4, 0], window_3: [1.6, 3.4, 0.2, 1.6, 0], window_4: [3.2, 3.4, 0.2, 3.2, 0], scale_2: [-5.9, 3.4, 0.2, -5.9, 0] });
  // 정산 줄: 접수처 안은 창구 앞 한 줄뿐이라, 문(로컬 x 0~1, z 4~6) 왼쪽 바깥 벽을 따라 두 줄로 선다. 문 쪽을 본다.
  // 저울은 줄에서 차례가 오면 잡는다 (먼 데서 걸어오는 동안 저울을 잡아 두면 모두가 그 자리에서 서서 기다리게 된다)
  for (let i = 0; i < 10; i++) {
    const x = -2.6 - Math.floor(i / 2) * 1.2;
    const z = i % 2 ? 7.9 : 6.7;
    window.ASSET_SOCKETS.reception[`settle_queue_${i + 1}`] = [x, z, 0, x + 1, z];
  }
  for (let i = 0; i < 6; i++) {
    const x = 7.2 + i * 1.5;
    window.ASSET_SOCKETS.reception[`rack_stand_${i + 1}`] = [x, 9.5, 0, x, 8];
  }
  window.ASSET_SOCKETS.reception.rack_stand_7 = [5.9, 8.2, 0, 8, 8];
  window.ASSET_SOCKETS.reception.rack_stand_8 = [16.1, 8.2, 0, 14, 8];
  // 야생지대: 안쪽에서 괴물과 맞서고, 바깥 덤불에서 채집한다
  const wild = window.ASSET_SOCKETS.wilds = {};
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const at = r => [+(Math.cos(a) * r).toFixed(2), +(Math.sin(a) * r).toFixed(2)];
    const [ex, ez] = at(20);
    const [fx, fz] = at(13);
    const [mx, mz] = at(9);
    const [gx, gz] = at(24.6);
    const [bx, bz] = at(26.6);
    wild['enter_' + (i + 1)] = [ex, ez, 0, fx, fz];
    wild['fight_' + (i + 1)] = [fx, fz, 0, mx, mz];
    wild['gather_' + (i + 1)] = [gx, gz, 0, bx, bz];
  }
}(typeof self !== 'undefined' ? self : this));
