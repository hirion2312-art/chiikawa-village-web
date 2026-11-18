'use strict';

// 치이카와 심즈 — 마을의 순환 (화면을 모른다)
// 솟아나는 음식은 가끔만 솟는다. 엑스트라는 갑자기 괴물이 되어 토벌 구역으로 가고, 거기서 다른 엑스트라를 잡아먹는다.
// 잡아먹히면 음식이 솟고, 그 자리에서 새 엑스트라가 태어난다. 토벌로 쓰러진 괴물의 자리도 새 엑스트라가 채운다.
// 파자마 파티즈의 정기 공연과 슈퍼 알바이터 자격증으로 하는 가게 알바도 여기에 둔다.
(function (root) {
  // 괴물과 맞붙는 토벌 (플레이트 토벌 + 랏코의 상시 토벌)
  const HUNTS = new Set(['wilds.hunt', 'wilds.rakko_hunt']);
  const { LIST, BY_ID } = root.VillageObjects;
  const S = (socket, act, min, clip, prop, label) => ({ socket, act, min, clip, prop, label });
  const add = x => {
    LIST.push(x);
    BY_ID[x.id] = x;
  };
  const rnd = (sim, a, b) => a + sim.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  /* ---------- 솟아나는 음식 ---------- */

  const SPRINGS = ['rice', 'servers', 'misoBank', 'sausage', 'softcream', 'ramune', 'sobaSpring', 'akafuku'];
  const SPRING_FOOD = /^(rice\.(rice|steam)|servers\.|misoBank\.miso|sausage\.(sausage|feast)|softcream\.cream|ramune\.spring_|sobaSpring\.spring_|akafuku\.catch_)/;
  const SPRING_LASTS = 110;          // 한 번 솟으면 게임 분으로 이만큼 나온다
  const SPRING_GAP = [260, 620];     // 다음에 솟기까지
  const SPRING_MAX = 2;              // 한 번에 솟아 있는 음식 터는 이만큼만

  // 솟는 음식을 받아 먹는 순서 (쓰던 공용 동작 하나를 그곳다운 단계로)
  const FOOD_STEPS = {
    'ramune.spring_.솟는 라무네 마시기': [S('spring_*', 'pour', 2, 'pour_tap', 'cup', '라무네 받는 중'), S('spring_*', 'drink', 5, 'milk_gulp', 'milk', '꿀꺽꿀꺽'), S('spring_*', 'idle', 1, 'belly_pat', null, '캬')],
    'ramune.spring_.케첩밥 퍼 먹기': [S('spring_*', 'gather', 3, 'rice_scoop', 'bowl', '케첩밥 푸는 중'), S('spring_*', 'eat', 8, 'eat_bowl', 'bowl', '먹는 중'), S('spring_*', 'idle', 1, 'belly_pat', null, '잘 먹었다')],
    'sobaSpring.spring_.솟는 소바 받아 먹기': [S('spring_*', 'gather', 2, 'rice_scoop', 'bowl', '소바 건지는 중'), S('spring_*', 'eat', 8, 'ramen_eat_noodles', 'bowl', '후루룩'), S('spring_*', 'eat', 2, 'ramen_soup', 'bowl', '국물 마시는 중')],
    'akafuku.catch_.떨어지는 아카후쿠 받아 먹기': [S('catch_*', 'wait', 2, 'tilt_look', null, '떨어지길 기다리는 중'), S('catch_*', 'gather', 1, 'hold_chest', null, '받는 중'), S('catch_*', 'bite', 4, 'eat_bite', 'snack', '오물오물'), S('catch_*', 'idle', 1, 'jump_joy', null, '맛있다')],
  };
  for (const [id, steps] of Object.entries(FOOD_STEPS)) if (BY_ID[id]) BY_ID[id].steps = steps;

  /* ---------- 파자마 파티즈 ---------- */

  const TROUPE = [['pajama-midori', '파자마 미도리'], ['pajama-pink', '파자마 핑크'], ['pajama-murasaki', '파자마 무라사키'], ['pajama-shiro', '파자마 시로']];
  const SHOW_EVERY = 2;              // 이틀에 한 번
  const SHOW_START = 18 * 60;
  const SHOW_END = 19 * 60;
  const socketsOf = root.ASSET_SOCKETS;
  const stageH = socketsOf.stage.perform_center[2];
  // 무대의 네 자리 (원래 인형이 서 있던 자리와 같다)
  [-4.5, -1.5, 1.5, 4.5].forEach((lx, i) => { socketsOf.stage[`show_${i + 1}`] = [lx, -1.2, stageH, lx, 6]; });
  // 무대 앞 관객석: 네 줄
  let seat = 0;
  for (const dx of [8.8, 10.6, 12.4, 14.2]) for (const dz of [-5.4, -2.7, 0, 2.7, 5.4]) socketsOf.stage[`crowd_${++seat}`] = [-dz, dx, 0.2, 0, -1.2];
  const SHOW_SEATS = 'show_*';
  const CROWD = 'crowd_*';
  add({
    id: 'stage.show', place: 'stage', name: '정기 공연', troupeOnly: true, showAct: true, earn: 1200, hours: [15, 19.5], gain: { fun: 30, energy: -10 },
    steps: [
      { ...S(SHOW_SEATS, 'idle', 1, 'idle_stretch', null, '공연 준비'), until: SHOW_START },
      { ...S(SHOW_SEATS, 'sing', 1, 'sing_mic', 'mic', '노래'), until: SHOW_START + 22 },
      { ...S(SHOW_SEATS, 'dance', 1, 'dance_light', null, '춤'), until: SHOW_START + 42 },
      { ...S(SHOW_SEATS, 'sing', 1, 'sing_mic', 'mic', '앙코르'), until: SHOW_END - 2 },
      S(SHOW_SEATS, 'bow', 2, 'ramen_bow', null, '인사'),
    ],
  });
  add({
    id: 'stage.show_watch', place: 'stage', name: '파자마 파티즈 공연 보기', watchShow: true, group: true, hours: [15, 19], gain: { fun: 40, social: 12 },
    steps: [
      { ...S(CROWD, 'wait', 1, 'wait_tap', null, '공연을 기다리는 중'), until: SHOW_START },
      { ...S(CROWD, 'cheer', 1, 'listen_groove', null, '공연 보는 중'), until: SHOW_START + 22 },
      { ...S(CROWD, 'cheer', 1, 'jump_joy', null, '함께 뛰는 중'), until: SHOW_START + 42 },
      { ...S(CROWD, 'cheer', 1, 'listen_groove', null, '공연 보는 중'), until: SHOW_END - 3 },
      S(CROWD, 'cheer', 3, 'applaud', null, '박수'),
    ],
  });

  /* ---------- 가게 알바: 슈퍼 알바이터 자격증이 있으면 플레이트 없이 일할 수 있다 ---------- */

  const job = (place, key, name, earn, steps, gain = { energy: -10 }, hours = [8, 20]) => add({ id: `${place}.job_${key}`, place, name, earn, gain, hours, steps, isJob: true });
  job('mucha', 'stock', '무챠우마켓 진열 알바', 500, [S('cart_stand', 'carry', 4, 'carry_pile', null, '상자 나르는 중'), S('shelf_look_1|shelf_look_2', 'browse', 14, 'browse_shelf', null, '선반 채우는 중'), S('checkout_stand', 'talk', 8, 'talk_order', null, '계산 돕는 중')]);
  job('recycle', 'sort', '리사이클 숍 정리', 450, [S('browse_stand', 'browse', 12, 'browse_shelf', null, '물건 분류하는 중'), S('tv_look', 'wipe', 8, 'wipe_towel', 'towel', '먼지 닦는 중'), S('counter_stand', 'talk', 4, 'talk_order', null, '값 매기는 중')]);
  job('kissa', 'serve', '찻집 설거지', 450, [S('staff_side', 'wipe', 12, 'wipe_towel', 'towel', '그릇 닦는 중'), S('staff_side', 'cook', 10, 'cook_stir', null, '차 끓이는 중'), S('staff_side', 'talk', 3, 'talk_order', null, '주문 받는 중')]);
  job('umaiya', 'kitchen', '우마이야 주방 보조', 650, [S('staff_side', 'cook', 16, 'cook_stir', null, '볶는 중'), S('staff_side', 'wipe', 8, 'wipe_towel', 'towel', '주방 닦는 중'), S('staff_side', 'carry', 4, 'hold_chest', null, '접시 내는 중')], { energy: -14 }, [11, 22]);
  job('market', 'takoyaki', '타코야키 굽기', 500, [S('takoyaki.staff_side', 'cook', 18, 'cook_stir', null, '타코야키 굽는 중'), S('takoyaki.staff_side', 'talk', 4, 'talk_order', null, '손님 받는 중')], { energy: -10 }, [10, 20]);
  job('market', 'clothes', '포셰트 노점 보기', 400, [S('clothes.staff_side', 'browse', 12, 'browse_shelf', null, '물건 정리하는 중'), S('clothes.staff_side', 'talk', 6, 'talk_order', null, '손님 받는 중')], { energy: -6 }, [10, 19]);
  job('market', 'pottery', '그릇 노점 보기', 400, [S('pottery.staff_side', 'wipe', 12, 'wipe_towel', 'towel', '그릇 닦는 중'), S('pottery.staff_side', 'talk', 6, 'talk_order', null, '손님 받는 중')], { energy: -6 }, [10, 19]);
  job('onsen', 'clean', '온천 청소', 600, [S('towel_stand', 'take', 2, 'towel_take', 'towel', '걸레 챙기는 중'), S('wash_sit_*', 'wipe', 16, 'wipe_towel', 'towel', '씻는 곳 닦는 중'), S('milk_stand', 'carry', 5, 'carry_pile', null, '병 나르는 중')], { energy: -14, hygiene: -6 }, [8, 15]);
  job('pier', 'cargo', '선착장 짐 나르기', 650, [S('beach_stand', 'carry', 22, 'carry_pile', null, '짐 나르는 중'), S('beach_stand', 'idle', 2, 'belly_pat', null, '한숨 돌리기')], { energy: -18, hygiene: -6 }, [7, 18]);
  job('shrine', 'sweep', '신사 마당 쓸기', 350, [S('torii_pass', 'weed', 10, 'wipe_towel', 'towel', '마당 쓰는 중'), S('lantern_look', 'wipe', 8, 'wipe_towel', 'towel', '등롱 닦는 중')], { energy: -8 }, [7, 18]);
  job('lemon', 'crate', '레몬 상자 나르기', 600, [S('crate_stand', 'carry', 14, 'carry_pile', null, '상자 나르는 중'), S('door_front', 'carry', 10, 'carry_pile', null, '공장 앞에 쌓는 중')], { energy: -16, hygiene: -5 }, [8, 18]);
  job('pharmacy', 'shelf', '약국 정리', 450, [S('shelf_look', 'browse', 14, 'browse_shelf', null, '약 정리하는 중'), S('counter_stand', 'talk', 5, 'talk_order', null, '계산 돕는 중')], { energy: -6 });
  job('plaza', 'clean', '광장 게시판 정리', 300, [S('board_check_a|board_check_b', 'wipe', 12, 'wipe_towel', 'towel', '게시판 닦는 중')], { energy: -6 });

  /* ---------- 괴물 ---------- */

  const TURN_FAST = 1 / 2600;        // 괴물이 둘 미만일 때 엑스트라 한 명이 게임 1분에 변할 확률
  const TURN_SLOW = 1 / 26000;
  const MAX_BEASTS = 4;
  const RAID_GAP = [420, 900];       // 먹이를 찾으러 나서는 간격 (게임 분)
  const RAID_RANGE = 170;

  class Ecology {
    constructor(sim) {
      this.sim = sim;
      const now = sim.minutes;
      this.springs = {};
      for (const p of SPRINGS) this.springs[p] = { until: 0, next: now + rnd(sim, 5, 300) };
      this.springList = SPRINGS.filter(p => sim.places[p]);
    }
    static troupeChars() { return TROUPE; }

    /* 음식 */
    active(place) { const s = this.springs[place]; return !!s && s.until > this.sim.minutes; }
    erupt(place) {
      const s = this.springs[place];
      if (!s || (!this.active(place) && this.activeSprings().length >= SPRING_MAX)) return;
      s.until = Math.max(s.until, this.sim.minutes + SPRING_LASTS);
      s.next = s.until + rnd(this.sim, SPRING_GAP[0], SPRING_GAP[1]);
    }
    activeSprings() { return this.springList.filter(p => this.active(p)); }

    showToday() { return this.sim.day % SHOW_EVERY === 0; }
    // 이 상호작용을 지금 쓸 수 있는가 (sim.open이 부른다)
    open(x) {
      // 음식 터는 솟아 있을 때만 있다. 그곳의 다른 놀이도 마찬가지
      if (this.springList.includes(x.place)) return this.active(x.place);
      if (x.showAct || x.watchShow) return this.showToday();
      return true;
    }
    blocked(c, x) {
      if (x.troupeOnly && !c.troupe) return '파자마 파티즈만 해요';
      if (x.isJob && !c.arbiter) return '슈퍼 알바이터 자격증이 있어야 해요';
      if (this.overLimit(c, x)) return '오늘 근무는 끝났어요';
      if (x.watchShow && c.troupe) return '무대에 올라가야 해요';
      if (this.springList.includes(x.place) && !this.active(x.place)) return '지금은 솟지 않아요';
      return null;
    }
    // 하루에 할 수 있는 근무 횟수 (한 사람이 같은 가게에서 돈을 쓸어 담지 않게)
    limitOf(x) { return x.shift ? 0 : x.isJob || x.id === 'ramenRo.parttime' ? 2 : x.id === 'market.run_books' ? 3 : 0; }
    overLimit(c, x) {
      const n = this.limitOf(x);
      return !!n && !!c.shifts && c.shifts.day === this.sim.day && (c.shifts[x.id] || 0) >= n;
    }
    onFinish(c, x) {
      if (!this.limitOf(x)) return;
      if (!c.shifts || c.shifts.day !== this.sim.day) c.shifts = { day: this.sim.day };
      c.shifts[x.id] = (c.shifts[x.id] || 0) + 1;
    }
    // 돈이 모자라면 놀이에 돈을 쓰지 않고, 끼니도 굶을 정도가 아니면 아낀다 (가격은 그대로)
    tooCostly(c, x) {
      if (!x.cost || x.buy) return false;
      if ((x.gain.hunger || 0) >= 20) {
        // 솟는 음식이 어디든 나와 있으면 돈이 궁한 주민은 그쪽으로 간다
        if (c.money < 900 && c.needs.hunger >= 15 && this.activeSprings().length) return true;
        return c.needs.hunger >= 30 && c.money < x.cost + 300;
      }
      return c.money < x.cost + 1000;
    }
    scoreBonus(c, x) {
      let v = 0;
      if (SPRING_FOOD.test(x.id) && c.money < 900) v += 40;
      if (x.watchShow && this.showToday()) {
        // 제시간에 닿을 만큼만 일찍 나선다. 멀리 있어도 보러 오도록 거리 감점을 되돌려 준다
        const d = dist(c, this.sim.places.stage);
        if (this.sim.hour * 60 >= SHOW_START - (d * 1.7) / 4.2 - 25) v += (c.extra ? 170 : 230) * (1 + d / 70);
      }
      if (SPRING_FOOD.test(x.id)) v += 18;
      if (x.isJob && c.money < 1500) v += c.money < 500 ? 70 : 35;
      // 돈이 모자라면 아침에 플레이트부터 집으러 간다 (멀어도)
      if (x.takeKind && !c.plate && c.money < 5000) v += (c.money < 600 ? 190 : c.money < 1500 ? 120 : 60) * (1 + dist(c, this.sim.places.reception) / 70);
      // 형편이 어려우면 비싼 끼니를 피한다 (솟는 음식과 싼 것부터)
      if (x.cost && c.money < 2000) v -= x.cost / 12;
      return v;
    }
    // 공연 날 파자마 파티즈는 무대로 간다 (제시간에 닿게 일찍 나선다)
    duty(c) {
      if (!c.troupe || !this.showToday()) return null;
      const s = this.sim;
      if (c.showDay === s.day) return null;
      const stage = s.places.stage;
      const leave = Math.max(15 * 60, SHOW_START - (dist(c, stage) * 1.5) / 4.2 - 30);
      if (s.hour * 60 < leave || s.hour * 60 >= SHOW_END) return null;
      const x = BY_ID['stage.show'];
      return s.interactions.includes(x) ? x : null;
    }

    /* 매 틱 */
    tick(dt) {
      const s = this.sim;
      const now = s.minutes;
      // 저장된 세계에 많이 솟아 있으면 줄인다
      const on = this.activeSprings();
      while (on.length > SPRING_MAX) this.springs[on.pop()].until = now;
      for (const st of Object.values(this.springs)) {
        if (now < st.next) continue;
        if (this.activeSprings().length >= SPRING_MAX) {
          st.next = now + rnd(s, 20, 90);
          continue;
        }
        st.until = now + SPRING_LASTS;
        st.next = st.until + rnd(s, SPRING_GAP[0], SPRING_GAP[1]);
      }
      const beasts = s.chars.filter(c => c.monster && !c.gone).length;
      if (beasts < MAX_BEASTS) {
        const rate = beasts < 2 ? TURN_FAST : TURN_SLOW;
        for (const c of s.chars) {
          if (this.preyable(c) && !c.seating && !(c.doing && c.doing.x && c.doing.x.night) && s.random() < rate * dt) {
            this.turn(c);
            break;
          }
        }
      }
      // 공연 날 시간이 되면 파자마 파티즈는 하던 일을 멈춘다
      for (const c of s.chars) {
        if (c.troupe && !c.hidden && this.duty(c) && !(c.doing && c.doing.x && c.doing.x.showAct)) {
          if (c.doing) s.abort(c, '');
          c.orders.length = 0;
          c.idleLeft = 0;
        }
      }
    }
    preyable(c) { return c.extra && !c.strong && !c.troupe && !c.monster && !c.gone && !c.hidden && !c.riding; }

    /* 괴물이 된다 */
    turn(c) {
      const s = this.sim;
      if (c.doing) s.abort(c, '');
      if (c.plate) s.labor.release(c.plate);
      Object.assign(c, { monster: true, name: '괴물', orders: [], pull: null, prop: null, act: null, clip: null, idleLeft: 0, beast: { mode: 'go', spot: this.roamSpot(c), nextRaid: s.minutes + rnd(s, 90, 300) } });
      s.note('엑스트라 하나가 괴물이 되었어요');
    }
    roamSpot(c) {
      const s = this.sim;
      const p = s.places.wilds;
      const a = s.random() * Math.PI * 2;
      const r = 6 + s.random() * 18;
      return s.snap({ x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r });
    }
    // 토벌 중인 주민: 괴물이 그 앞으로 나선다
    openHunter(b) {
      const s = this.sim;
      return s.chars.find(c => c.doing && c.doing.x && HUNTS.has(c.doing.x.id) && c.doing.phase === 'use' && c.doing.step >= 2 && !c.foe && dist(c, b) < 45);
    }
    tickBeast(c, dt) {
      const s = this.sim;
      c.needs.hunger = 60;
      c.needs.energy = 60;
      if (c.gone) {
        c.goneLeft -= dt;
        if (c.goneLeft <= 0) this.reborn(c);
        return;
      }
      c.walking = false;
      const b = c.beast || (c.beast = { mode: 'go', spot: this.roamSpot(c), nextRaid: s.minutes + 200 });
      // 싸우는 중
      if (b.foe) {
        const h = b.foe;
        if (!h.doing || !h.doing.x || !HUNTS.has(h.doing.x.id)) {
          h.foe = null;
          b.foe = null;
          b.mode = 'go';
          b.spot = this.roamSpot(c);
          return;
        }
        if (!b.stand) {
          const front = { x: h.x + Math.sin(h.angle) * 2.1, z: h.z + Math.cos(h.angle) * 2.1 };
          b.stand = s.nav ? s.snap(front) : front;
        }
        if (dist(c, b.stand) > 0.2) {
          const r = s.walk(c, b.stand, dt);
          if (r === null) Object.assign(c, b.stand);
          return;
        }
        c.angle = Math.atan2(h.x - c.x, h.z - c.z);
        c.act = 'confront';
        c.clip = (Math.floor(s.minutes / 3) % 2) ? 'wobble_fear' : 'train_swing';
        return;
      }
      if (b.mode !== 'eat' && b.mode !== 'raid') {
        const h = this.openHunter(c);
        if (h) {
          h.foe = c;
          b.foe = h;
          b.stand = null;
          return;
        }
      }
      if (b.mode === 'go') {
        c.clip = null;
        c.act = null;
        const r = s.walk(c, b.spot, dt);
        if (r === null) {
          Object.assign(c, s.snap(b.spot));
          b.mode = 'prowl';
          b.left = 10;
        } else if (r) {
          s.clearRoute(c);
          b.mode = 'prowl';
          b.left = 8 + s.random() * 22;
        }
        return;
      }
      if (b.mode === 'prowl') {
        c.act = 'idle';
        c.clip = 'tilt_look';
        b.left -= dt;
        if (s.minutes >= b.nextRaid) {
          const prey = s.chars.filter(o => this.preyable(o) && dist(o, c) < RAID_RANGE).sort((p, q) => dist(p, c) - dist(q, c))[0];
          if (prey) {
            b.mode = 'raid';
            b.prey = prey;
            b.goal = { x: prey.x, z: prey.z };
            b.left = 90;
            s.clearRoute(c);
            return;
          }
          b.nextRaid = s.minutes + 120;
        }
        if (b.left <= 0) {
          b.mode = 'go';
          b.spot = this.roamSpot(c);
        }
        return;
      }
      if (b.mode === 'raid') {
        const p = b.prey;
        b.left -= dt;
        if (!this.preyable(p) || b.left <= 0) {
          b.mode = 'go';
          b.spot = this.roamSpot(c);
          b.nextRaid = s.minutes + rnd(s, 120, 300);
          s.clearRoute(c);
          return;
        }
        if (dist(c, p) < 2) {
          // 붙잡았다: 먹잇감은 하던 일을 멈추고 떤다
          if (p.doing) s.abort(p, '');
          Object.assign(p, { caught: true, idleLeft: 999, act: 'idle', clip: 'wobble_fear', orders: [] });
          b.mode = 'eat';
          b.left = 3.5;
          c.angle = Math.atan2(p.x - c.x, p.z - c.z);
          return;
        }
        if (dist(p, b.goal) > 3) {
          b.goal = { x: p.x, z: p.z };
          s.clearRoute(c);
        }
        const r = s.walk(c, { x: b.goal.x, z: b.goal.z }, dt * 1.4);
        if (r === null) {
          b.mode = 'go';
          b.spot = this.roamSpot(c);
          b.nextRaid = s.minutes + 200;
        }
        return;
      }
      if (b.mode === 'eat') {
        c.act = 'bite';
        c.clip = 'eat_bite';
        b.left -= dt;
        if (b.left <= 0) {
          this.eaten(b.prey);
          c.clip = null;
          b.prey = null;
          b.mode = 'go';
          b.spot = this.roamSpot(c);
          b.nextRaid = s.minutes + rnd(s, RAID_GAP[0], RAID_GAP[1]);
        }
      }
    }

    /* 잡아먹힘 → 음식이 솟음 → 그곳에서 새 엑스트라 */
    pickSpring() {
      const on = this.activeSprings();
      const list = on.length >= SPRING_MAX ? on : this.springList;
      return list[Math.floor(this.sim.random() * list.length)];
    }
    vanish(c, min, max) {
      const s = this.sim;
      if (c.plate) s.labor.release(c.plate);
      s.release(c);
      s.clearRoute(c);
      const spring = this.pickSpring();
      this.erupt(spring);
      Object.assign(c, { gone: true, hidden: true, caught: false, doing: null, act: null, clip: null, prop: null, walking: false, goneLeft: rnd(s, min, max), bornAt: spring, beast: null, foe: null });
    }
    eaten(c) {
      this.vanish(c, 30, 90);
      this.sim.note('엑스트라가 잡아먹혔어요. 어딘가에서 음식이 솟아요');
    }
    // 토벌 성공: 맞붙은 괴물(없으면 근처 괴물)이 쓰러진다. 쓰러뜨렸으면 true
    slay(hunter) {
      const s = this.sim;
      const foe = hunter.foe || s.chars.filter(o => o.monster && !o.gone && dist(o, hunter) < 60).sort((p, q) => dist(p, hunter) - dist(q, hunter))[0];
      hunter.foe = null;
      if (!foe) return false;
      this.vanish(foe, 60, 180);
      s.note(`${hunter.name}이(가) 괴물을 쓰러뜨렸어요`);
      return true;
    }
    reborn(c) {
      const s = this.sim;
      const p = s.places[c.bornAt] || s.places.plaza;
      const a = s.random() * Math.PI * 2;
      Object.assign(c, s.snap({ x: p.x + Math.cos(a) * 5, z: p.z + Math.sin(a) * 5 }));
      Object.assign(c, {
        name: '엑스트라', gone: false, monster: false, hidden: false, beast: null, caught: false, bonds: {}, recent: [], orders: [], pull: null, plate: null, money: 800 + Math.floor(s.random() * 1200), idleLeft: 2, huntSkill: 0, huntWins: 0, study: 0, grade: 5,
        needs: { hunger: 70, energy: 80, fun: 60, social: 50, hygiene: 80 },
      });
    }

    saveWorld() { return { springs: this.springs, wild: root.WildZones ? root.WildZones.save(this.sim) : null }; }
    loadWorld(w) {
      if (w && w.wild && root.WildZones) root.WildZones.load(this.sim, w.wild);
      if (w && w.springs) for (const [p, st] of Object.entries(w.springs)) if (this.springs[p]) this.springs[p] = st;
    }
    save(c) { return c.extra ? { monster: c.monster, gone: c.gone, goneLeft: c.goneLeft, bornAt: c.bornAt } : {}; }
    load(c, r) {
      if (r.monster) Object.assign(c, { monster: true, name: '괴물', beast: null });
      if (r.gone) Object.assign(c, { gone: true, hidden: true, goneLeft: r.goneLeft || 30, bornAt: r.bornAt || 'rice' });
    }
  }
  root.Ecology = Ecology;
}(typeof self !== 'undefined' ? self : this));
