'use strict';

// 치이카와 심즈 — 알림 장면 등록표 (기획서 docs/visible-actions-plan-2026-11-11.md §5-2)
// "문장으로 했다고 하면 화면에 보여야 한다." 모든 알림(sim.note)은 그 순간을 그리는 장면이 등록돼 있어야 한다.
// - Visible.on(패턴, 장면 함수, 설명): 알림 문장이 패턴에 맞으면 장면 함수를 부른다 (s, 문장, 맞은 조각)
// - Visible.covered(패턴, 설명): 이미 다른 코드가 그 순간을 그리고 있는 알림을 표시만 한다 (함수 없음)
// - 등록되지 않은 알림이 나가면 개발 실행에서 한 번씩 경고하고 Visible.missing에 모은다 (tools/visible-audit.js가 읽는다)
(function (root) {
  const rules = [];
  const missing = new Map();
  const Visible = {
    rules,
    missing,
    on(re, fn, what) { rules.push({ re, fn, what, kind: 'scene' }); },
    covered(re, what, weak) { rules.push({ re, fn: null, what, kind: weak ? 'weak' : 'covered' }); },
    match(text) { return rules.filter(r => r.re.test(text)); },
    report() {
      return {
        rules: rules.map(r => ({ re: String(r.re), what: r.what, kind: r.kind })),
        missing: [...missing.entries()].map(([t, n]) => ({ text: t, n })),
      };
    },
  };
  const shape = t => t.replace(/[0-9]+/g, '○');

  const V = root.Village && root.Village.Village.prototype;
  if (V) {
    const note0 = V.note;
    V.note = function (text) {
      note0.call(this, text);
      const hits = Visible.match(text);
      if (!hits.length) {
        const k = shape(text);
        const n = (missing.get(k) || 0) + 1;
        missing.set(k, n);
        if (n === 1 && typeof console !== 'undefined' && root.VISIBLE_WARN !== false) console.warn('[보이기] 장면이 없는 알림:', text);
        return;
      }
      for (const r of hits) {
        if (!r.fn) continue;
        try { r.fn(this, text, text.match(r.re)); } catch (e) { if (typeof console !== 'undefined') console.warn('[보이기] 장면 오류', r.what, e); }
      }
    };
  }

  /* ---------- 이미 그리고 있는 알림 (2026-11-11 기준) ---------- */
  const C = (re, what) => Visible.covered(re, what);
  const W = (re, what) => Visible.covered(re, what, true);
  C(/괴물이 되었어요/, '변이: 몸을 떨며 커진다 (ecology·rampage)');
  C(/잡아먹혔어요/, '붙잡아 들어 올려 삼킨다 (rampage.js 잡아먹기 연출)');
  C(/난동 괴물이 .*나타났어요|난동 괴물이 .*떠나/, '난동 괴물이 움직인다 (rampage.js)');
  C(/무기를 들고 난동 괴물에게 맞서요/, '무기를 들고 달려가 둘러싼다 (rampage.js)');
  C(/난동 괴물을 쓰러뜨렸어요|난동 괴물이 쓰러졌어요/, '쓰러지고 모두 만세·하이파이브 (rampage.js·together.js)');
  C(/쓰러졌어요! 대나무 헬리콥터/, '쓰러짐 → 대나무 헬리콥터가 집어 감 (rescue-heli.js)');
  C(/약국에 도착했어요/, '약국 앞에 내려놓고 치료받으러 들어감 (rescue-heli.js)');
  C(/다쳐서 물러났어요/, '비틀거리며 물러남 (rescue-heli.js)');
  C(/같이 .* 하러 가자/, '불린 친구가 반가워하고 함께 플레이트를 집으러 감 (team-work.js)');
  C(/에게 찾아가 "/, '친구에게 걸어가 손짓하며 부르고, 친구는 반가워한다 (invite.js)');
  C(/^👫 /, '같이 하기 판: 장소별 박자 동작과 주고받기 (pair.js·pair-meals.js)');
  C(/다 모였어요\. 같이 출발/, '접수처 앞에서 기다렸다 동시에 출발 (team-work.js)');
  W(/이번에는 같이 못 가요/, '거절 몸짓 없음 (보강 예정)');
  C(/함께 .*마쳤어요/, '같이 정산하고 친해짐 (team-work.js)');
  C(/길에서 만난 .*따라/, '인사 뒤 따라 걸어감 (encounters.js)');
  C(/수다를 떨어요/, '마주 보고 수다 동작');
  W(/응원했어요|달래 줬어요/, '수다 동작만, 등 토닥이기 없음 (보강 예정)');
  C(/달성|평생 목표/, '펄쩍 뛰며 기뻐함');
  C(/목표를 조금 쉽게/, '표시만 (행동 변화 없음)');
  C(/합격 발표가 .*붙었어요|합격 발표: /, '광장 게시판에 모여 확인 (town-sets.js)');
  C(/^[^:]+: .*(시험|검정).*을 봤어요/, '시험장 책상에서 문제를 푼다 (calendar.js)');
  C(/시험을 봤어요|시험 보기 끝/, '시험장 책상에서 문제를 푼다 (calendar.js)');
  C(/술 자격 시험 (합격|불합격)/, '시험장에서 결과에 반응 (town-sets.js)');
  C(/ 출근$| 출근 /, '가게로 들어가 일을 시작 (shifts.js)');
  C(/토벌 성공|괴물을 쓰러뜨렸어요|쓰러뜨렸어요/, '싸움 끝에 괴물이 쓰러진다 (labor·wild-zones)');
  C(/토벌 실패/, '우는 반응 (labor.js)');
  C(/다시 나타났어요/, '굴에 괴물이 다시 선다 (wild-zones.js)');
  C(/오늘의 노동 플레이트가 꽂였어요/, '접수처 꽂이에 플레이트가 꽂혀 있다 (labor.js 꽂이 모형)');
  C(/플레이트를 반납하지 못했어요/, '표시만');
  C(/끝$/, '그 행동의 단계 동작');

  root.Visible = Visible;
}(typeof self !== 'undefined' ? self : this));
