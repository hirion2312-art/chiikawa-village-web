'use strict';

// 치이카와 심즈 — 행동의 이유 (이재헌님 규칙: 의미 없는 행동 금지)
// 스스로 고를 때(village-sim options), 그 행동을 할 이유가 있는 주민만 고른다.
//   예: 슈퍼 알바이터 시험을 보지 않을 주민은 번호표를 뽑지 않는다. 라멘을 먹으러 온 게 아니면 대기 의자에 앉지 않는다.
// 플레이어가 시키는 것은 막지 않는다 (심즈처럼 시키면 한다).
// stepOnly: 다른 일의 한 단계일 때만 뜻이 있어 혼자서는 고르지 않는 것 (줄 서기, 호출 대답 같은 것)
(function (root) {
  const bondWith = (s, c, id) => {
    const o = s.chars.find(q => q.id === id);
    return o ? s.persona.bond(c, o) : 0;
  };
  const ownerHome = (s, id, place) => {
    const o = s.chars.find(q => q.id === id);
    return !!o && !o.hidden && !!s.places[place] && Math.hypot(o.x - s.places[place].x, o.z - s.places[place].z) < 30;
  };
  const owns = (c, item) => !!root.Shop && root.Shop.owns(c, item);
  const arbiterBound = c => !c.arbiter && !!(c.arbExam || (c.arbStudy || 0) > 0);
  const HOMES = { momongaHome: 'momonga', shisaHome: 'shisa', rakkoHome: 'rakko', kurimanjuHome: 'kurimanju', furuhonyaHome: 'furuhonya' };

  // [id 정규식, 이유 (c, sim) → true면 할 이유가 있다 | 'step' = 혼자서는 고르지 않는다, 설명]
  const RULES = [
    // 시험장: 시험을 볼 주민만
    [/^arbiter\.ticket_stand\./, (c, s) => !!(c.arbExam && c.arbExam.day === s.day && !c.arbExam.taken), '오늘 슈퍼 알바이터 시험을 보는 주민만 번호표를 뽑는다'],
    [/^arbiter\.(counter_stand|notice_look)\./, c => arbiterBound(c), '슈퍼 알바이터를 준비하는 주민만 공고를 읽고 창구에 묻는다'],
    [/^exam\.results_look\./, (c, s) => !!(c.exam && c.exam.taken && s.day - c.exam.day <= 1), '시험을 본 주민만 합격 발표를 보러 간다'],
    [/^exam\.sign_look\./, (c, s) => !!(c.exam && !c.exam.taken && c.exam.day - s.day <= 3), '시험이 다가온 주민만 시험 안내를 읽는다'],
    // 노동: 그 일을 가진 주민만
    [/^reception\.bell_touch\./, c => !!(c.plate && c.plate.state !== 'accepted'), '접수·정산할 플레이트가 있을 때만 호출 종을 누른다'],
    [/^weeding\.(fork_stand|sign_look)\./, c => !!(c.plate && c.plate.kind === 'grass'), '풀뽑기 플레이트가 있는 주민만 현장 도구와 안내를 본다'],
    [/^lemon\.crate_stand\./, 'step', '상자 나르기는 공장 일일 때만'],
    [/^hunt\.(fork_stand|sign_look)\./, c => owns(c, 'weapon') || (c.wantTrain || 0) > 0 || (c.traits && c.traits.brave >= 0.6), '토벌에 마음이 있는 주민만 훈련소 도구를 들어 본다'],
    // 줄·대기·호출: 다른 일의 한 단계
    [/\.(queue_bench|wait_stand|call_answer|queue_)\./, 'step', '줄 서기와 호출 대답은 먹거나 쓰러 왔을 때의 단계'],
    [/^pharmacy\.window_look\./, 'step', '약국 창밖 보기는 기다리는 동안만'],
    [/^pharmacy\.shelf_look\./, c => c.needs.energy < 50 || (c.hp !== undefined && c.hp < 70), '몸이 안 좋을 때만 약을 구경한다'],
    // 가게: 살 마음이 있을 때만
    [/^kissa\.usual_order\./, 'step', '"늘 마시던 걸로"는 찻집에서 차를 마실 때의 주문 단계'],
    [/^umaCurry\.menu_look\./, c => c.needs.hunger < 70 && c.money >= 300, '배가 고프고 돈이 있을 때만 메뉴판을 본다'],
    [/^mucha\.(cart_stand|parking_stand)\./, 'step', '카트는 장 볼 때, 주차장은 차가 있을 때'],
    [/^mucha\.(door_front|flyer_look)\./, c => c.money >= 300, '살 돈이 있을 때만 가게 앞과 전단지를 본다'],
    [/^recycle\.counter_stand\./, c => !owns(c, 'weapon') && c.money >= 1500, '살 물건이 있을 때만 계산대에 묻는다'],
    // 남의 집: 친한 사이이고 집에 있을 때만
    [/^home\.(keyhole_unlock|sign_view)\./, 'step', '열쇠·문패는 집에 드나들 때의 단계'],
    [/^home\.window_peek\./, (c, s) => c.id !== 'chiikawa' && bondWith(s, c, 'chiikawa') >= 60, '치이카와와 친한 주민만 집에 있나 들여다본다'],
    [/^(momongaHome|shisaHome|rakkoHome|kurimanjuHome|furuhonyaHome)\.door_front\.문 두드리기/, (c, s, x) => {
      const owner = HOMES[x.place];
      return owner !== c.id && bondWith(s, c, owner) >= 60 && ownerHome(s, owner, x.place);
    }, '친한 주민이 집에 있을 때만 문을 두드린다'],
    // 삼인방 모이기: 다른 둘이 지금 부를 수 있을 때만 (바쁘거나 너무 멀면 시도하지 않는다)
    [/^plaza\.trio_meet$/, (c, s) => !!root.Invite && root.Invite.trioFree(s, c), '삼인방 셋 다 시간이 될 때만 모이자고 한다'],
    // 무서운 곳: 대담한 주민만
    [/^(yamanba|goblin)\.(door_front|gate_stand)\./, c => !!c.traits && c.traits.brave >= 0.6, '대담한 주민만 무서운 곳의 문을 두드린다'],
  ];

  function check(c, x, s) {
    for (const [re, rule] of RULES) {
      if (!re.test(x.id)) continue;
      if (rule === 'step') return false;
      return !!rule(c, s, x);
    }
    return true;
  }

  // 측정·검수용: 어떤 상호작용이 어떤 규칙에 걸리는지
  function describe(x) {
    const r = RULES.find(([re]) => re.test(x.id));
    return r ? { step: r[1] === 'step', why: r[2] } : null;
  }

  root.Purpose = { ok: check, describe, RULES };
}(typeof self !== 'undefined' ? self : this));
