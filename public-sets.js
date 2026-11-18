'use strict';

// 치이카와 심즈 — 공공 건물 세트 (2026-11-10 이재헌 지시: 실내 리모델링 + 세트 애니메이션)
// 세트 = 건물 + 고정 에셋 + 행동 동작 + 에셋 동작. 자리는 그대로 두고 실내 가구를 새로 짓는다
// 1) 노동 접수처: 창구 도장·동전 접시·저울·호출 종   2) 검정 시험장: 답안지·칠판·카메라·자격증 발급기
(function (root) {
  const VO = root.VillageObjects;
  const FUR = root.INTERIOR_FURNISH = root.INTERIOR_FURNISH || {};
  const ease = t => t * t * (3 - 2 * t);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  // 혼자 빛나거나 색이 바뀌는 조각 (재질을 따로 가진다)
  const lit = (parent, w, h, d, color, x, y, z, op = 1) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, depthWrite: op >= 1 }));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const text = (k, x, y, z, w, h, lines, color, size, ry) => k.paint(x, y, z, w, h, g => {
    g.save(); g.scale(1, -1); g.fillStyle = color; g.font = `800 ${size}px "Malgun Gothic", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((t, i) => g.fillText(t, 0, -h + (i + 0.5) * (h / lines.length)));
    g.restore();
  }, ry || 0);
  // 기존 행동의 단계에 에셋 동작을 건다 (덧그리던 장면 소품은 끈다)
  const hook = (place, re, pick) => {
    for (const x of VO.LIST) {
      if (x.place !== place || !re.test(x.name) || !x.steps) continue;
      x.sceneKey = 's_none';
      x.steps.forEach((s, i) => { const f = pick(s, i, x); if (f) s.fx = f; });
    }
  };
  root.PublicSets = { grp, lit, text, hook, ease, clamp };

  /* ================= 1) 노동 접수처 ================= */
  hook('reception', /접수하기/, s => (s.clip === 'stamp_press' ? 'stamp.press' : null));
  hook('reception', /정산/, s => (s.act === 'weigh' ? 'scale.weigh' : s.act === 'pay' ? 'coins.count' : null));
  hook('reception', /호출 종/, () => 'bell.tap');

  FUR.reception = (k, api, F) => {
    const CZ = 2.0, TOP = F + 0.8;
    // 바닥 깔개와 긴 나무 카운터
    k.box(-1.2, F + 0.012, 3.5, 12.6, 0.02, 1.7, '#b9544b', 0);
    k.box(-1.2, F + 0.016, 3.5, 12.2, 0.02, 1.3, '#cf6f62', 0);
    k.box(-1.3, F + 0.38, CZ, 11.2, 0.76, 0.9, '#b98a5e', 1);
    k.box(-1.3, TOP, CZ, 11.6, 0.08, 1.14, '#e6c797', 1);
    for (let i = 0; i < 14; i++) k.box(-6.6 + i * 0.82, F + 0.4, CZ + 0.46, 0.05, 0.66, 0.02, '#8f6844', 0);
    k.box(-1.3, F + 0.06, CZ + 0.47, 11.2, 0.12, 0.04, '#7d5a44', 0);
    // 직원 구역 막기 (2026-11-10): 카운터 양 끝에서 뒷벽까지 낮은 칸막이와 쪽문을 세워, 손님이 카운터 뒤로 돌아 들어가지 않게 한다
    for (const x of [-7.25, 4.65]) {
      k.box(x, F + 0.55, (CZ - 5.8) / 2, 0.12, 1.1, Math.abs(CZ + 5.8), '#b98a5e', 1);
      k.box(x, F + 1.12, (CZ - 5.8) / 2, 0.18, 0.06, Math.abs(CZ + 5.8) + 0.06, '#e6c797', 0);
      text(k, x + (x < 0 ? 0.08 : -0.08), F + 0.75, CZ - 0.9, 0.9, 0.3, ['직원 전용'], '#7d5a44', 0.13, x < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    // 창구 칸막이 기둥, 위 들보, 번호판
    for (const x of [-6.9, -5.2, -3.4, -1.5, 0.35, 2.4, 4.1]) {
      k.box(x, TOP + 0.75, CZ, 0.1, 1.5, 0.5, '#8f6844', 1);
      k.box(x, TOP + 0.35, CZ + 0.28, 0.04, 0.6, 0.06, '#e3bb4a', 0);
    }
    k.box(-1.4, TOP + 1.56, CZ, 11.3, 0.14, 0.56, '#7d5a44', 1);
    const WIN = { window_2: -2.4, window_stand: -0.6, window_3: 1.6, window_4: 3.2 };
    Object.entries(WIN).forEach(([name, x], i) => {
      k.box(x, TOP + 1.3, CZ + 0.3, 0.7, 0.36, 0.05, '#fff8e6', 1);
      text(k, x, TOP + 1.12, CZ + 0.33, 0.7, 0.36, [`${i + 1}번 창구`], '#7d5a44', 0.15);
      // 유리 가림막 (아래로 손이 드나든다)
      lit(k.group, 1.2, 0.5, 0.02, '#dff1f7', x, TOP + 0.95, CZ + 0.1, 0.28);
      // 도장과 인주, 접수 서류
      api.dyn(`stamp:${name}`, { x: x - 0.28, y: TOP + 0.04, z: CZ + 0.12, label: '접수 도장',
        clips: {
          press(o, u) {
            const p = (u * 2) % 1, lift = Math.sin(clamp(p / 0.8) * Math.PI);
            const go = ease(clamp(p / 0.5));
            o.data.stamp.position.set(0.3 - go * 0.3, 0.07 + lift * 0.3 - (p > 0.5 && p < 0.62 ? 0.02 : 0), 0);
            o.data.stamp.rotation.z = (1 - go) * 0.2;
            o.data.seal.visible = u > 0.27;
            o.data.seal2.visible = u > 0.77;
          },
        },
        end(o) { o.data.stamp.position.set(0.3, 0.07, 0); o.data.stamp.rotation.z = 0; o.data.seal.visible = o.data.seal2.visible = false; },
      }, (kk, o) => {
        kk.box(0, 0.006, 0, 0.42, 0.012, 0.3, '#fffdf4', 0);
        for (let r = 0; r < 4; r++) kk.box(-0.04, 0.014, -0.1 + r * 0.055, 0.26, 0.004, 0.012, '#b9b3a6', 0);
        o.data.seal = lit(kk.group, 0.09, 0.004, 0.09, '#d64a3f', 0.02, 0.016, 0.09);
        o.data.seal2 = lit(kk.group, 0.09, 0.004, 0.09, '#d64a3f', 0.13, 0.016, 0.09);
        o.data.seal.visible = o.data.seal2.visible = false;
        kk.box(0.3, 0.02, 0, 0.16, 0.04, 0.16, '#5a3b33', 1);
        kk.box(0.3, 0.042, 0, 0.12, 0.008, 0.12, '#c8463c', 0);
        const s = grp(kk.group, 0.3, 0.07, 0); o.data.stamp = s;
        const sk = makeKit(s, 0, 0, 0);
        sk.box(0, 0.02, 0, 0.1, 0.04, 0.1, '#7d5a44', 1);
        sk.cyl(0, 0.1, 0, 0.03, 0.14, '#c9a57c', 0);
        sk.ball(0, 0.19, 0, 0.05, 0.05, 0.05, '#c9a57c', 1);
      });
      // 동전 접시: 보수를 셀 때 동전이 한 닢씩 떨어져 쌓인다
      api.dyn(`coins:${name}`, { x: x + 0.3, y: TOP + 0.04, z: CZ + 0.2, label: '보수 접시',
        clips: {
          count(o, u) {
            o.data.coins.forEach((c, j) => {
              const t = clamp(u * o.data.coins.length - j);
              c.visible = t > 0;
              c.position.y = c.userData.y + (1 - ease(t)) * 0.28;
            });
          },
        },
        end(o) { o.data.coins.forEach(c => { c.visible = false; }); },
      }, (kk, o) => {
        kk.box(0, 0.012, 0, 0.36, 0.024, 0.26, '#5f7fa8', 1);
        kk.box(0, 0.028, 0, 0.3, 0.008, 0.2, '#86a3c6', 0);
        o.data.coins = [];
        for (let j = 0; j < 8; j++) {
          const c = kk.cyl(-0.08 + (j % 2) * 0.16, 0.045 + Math.floor(j / 2) * 0.022, (j % 2 ? 0.02 : -0.02), 0.055, 0.02, j % 3 ? '#e3bb4a' : '#d9d7d0', 0);
          c.userData.y = c.position.y; c.visible = false; o.data.coins.push(c);
        }
      });
      // 창구 안쪽: 서류 바구니와 펜꽂이
      k.box(x + 0.1, TOP + 0.09, CZ - 0.3, 0.4, 0.1, 0.3, '#c9a57c', 1);
      k.box(x + 0.1, TOP + 0.15, CZ - 0.3, 0.34, 0.02, 0.24, '#fffdf4', 0);
      k.cyl(x - 0.35, TOP + 0.1, CZ - 0.32, 0.05, 0.12, '#7f96b8', 0);
      k.cyl(x - 0.36, TOP + 0.2, CZ - 0.32, 0.012, 0.16, '#3f3d3a', 0);
    });
    // 호출 종
    api.dyn('bell', { x: 0.85, y: TOP + 0.04, z: CZ + 0.22, obj: 'bell', label: '호출 종',
      clips: {
        tap(o, u, time) {
          const hit = Math.abs(Math.sin(time * 9));
          o.data.btn.position.y = 0.15 - hit * 0.03;
          o.data.dome.rotation.z = Math.sin(time * 36) * 0.05 * hit;
          o.data.ring.visible = hit > 0.6;
          o.data.ring.scale.setScalar(1 + (1 - hit) * 3);
        },
      },
      end(o) { o.data.btn.position.y = 0.15; o.data.dome.rotation.z = 0; o.data.ring.visible = false; },
    }, (kk, o) => {
      kk.cyl(0, 0.015, 0, 0.13, 0.03, '#5a3b33', 1);
      o.data.dome = kk.ball(0, 0.03, 0, 0.11, 0.1, 0.11, '#e3bb4a', 1);
      o.data.btn = kk.cyl(0, 0.15, 0, 0.022, 0.05, '#fff3c4', 0);
      o.data.ring = lit(kk.group, 0.3, 0.004, 0.3, '#fff3c4', 0, 0.2, 0, 0.5);
      o.data.ring.visible = false;
    });
    // 저울 둘: 판이 눌리고 바늘이 흔들린다
    for (const [name, x] of [['scale_stand', -4.55], ['scale_2', -5.9]]) {
      api.dyn(`scale:${name}`, { x, y: TOP + 0.04, z: CZ + 0.05, obj: 'scale', label: '저울',
        clips: {
          weigh(o, u, time) {
            const on = ease(clamp(u / 0.25)) * (1 - ease(clamp((u - 0.85) / 0.15)));
            o.data.pan.position.y = 0.2 - on * 0.035;
            o.data.needle.rotation.z = -on * 1.9 + Math.sin(time * 11) * 0.25 * Math.exp(-u * 5) * on;
            o.data.lamp.material.color.set(u > 0.5 ? '#8fe08a' : '#f2d64b');
          },
        },
        end(o) { o.data.pan.position.y = 0.2; o.data.needle.rotation.z = 0; o.data.lamp.material.color.set('#6b6258'); },
      }, (kk, o) => {
        kk.box(0, 0.08, 0, 0.56, 0.16, 0.5, '#8fa7b8', 1);
        kk.box(0, 0.17, 0, 0.5, 0.02, 0.44, '#6f8799', 0);
        o.data.pan = kk.box(0, 0.2, 0.02, 0.46, 0.03, 0.38, '#d9d7d0', 1);
        kk.box(0, 0.4, -0.3, 0.08, 0.8, 0.06, '#8fa7b8', 1);
        kk.cyl(0, 0.82, -0.3, 0.2, 0.06, '#fffdf4', 1).rotation.x = Math.PI / 2;
        for (let j = 0; j < 9; j++) { const a = -2 + j * 0.5; kk.box(Math.sin(a) * 0.15, 0.82 + Math.cos(a) * 0.15, -0.26, 0.012, 0.03, 0.01, '#3f3d3a', 0).rotation.z = -a; }
        const n = grp(kk.group, 0, 0.82, -0.255); o.data.needle = n;
        lit(n, 0.014, 0.15, 0.01, '#d64a3f', 0, 0.07, 0);
        o.data.lamp = lit(kk.group, 0.05, 0.05, 0.02, '#6b6258', 0.2, 0.08, 0.26);
      });
    }
    // 접수원 책상: 장부, 잉크병, 등
    k.box(-0.4, F + 0.56, 0.75, 1.8, 0.08, 0.8, '#c9a57c', 1);
    for (const sx of [-0.8, 0.8]) k.box(-0.4 + sx, F + 0.27, 0.75, 0.1, 0.54, 0.7, '#a97c50', 0);
    k.box(-0.5, F + 0.62, 0.8, 0.6, 0.04, 0.42, '#fffdf4', 1);
    k.box(-0.5, F + 0.645, 0.8, 0.02, 0.01, 0.42, '#b9b3a6', 0);
    k.cyl(0.2, F + 0.66, 0.6, 0.06, 0.1, '#3d4a66', 1);
    k.cyl(-1.1, F + 0.8, 0.55, 0.03, 0.4, '#7f868a', 0);
    k.cone(-1.1, F + 1.02, 0.6, 0.16, 0.14, '#6fb385', 1);
    // 뒷벽: 장부 선반, 서류함, 금고, 열쇠 걸이
    const BZ = -4.2;
    k.box(-3.6, F + 1.3, BZ, 5.4, 2.6, 0.5, '#a97c50', 1);
    for (let r = 0; r < 4; r++) {
      k.box(-3.6, F + 0.3 + r * 0.62, BZ + 0.06, 5.2, 0.05, 0.5, '#e6c797', 0);
      for (let c = 0; c < 17; c++) {
        if ((c * 7 + r * 3) % 11 === 0) continue;
        const hgt = 0.4 + ((c * 5 + r) % 4) * 0.035;
        k.box(-6.05 + c * 0.3, F + 0.33 + r * 0.62 + hgt / 2, BZ + 0.1, 0.22, hgt, 0.36, ['#7f96b8', '#b9544b', '#6fb385', '#e3bb4a', '#8d7a9c'][(c + r * 2) % 5], 0);
        k.box(-6.05 + c * 0.3, F + 0.45 + r * 0.62, BZ + 0.285, 0.14, 0.1, 0.01, '#fffdf4', 0);
      }
    }
    for (const x of [1.2, 2.3, 3.4]) {
      k.box(x, F + 0.8, BZ, 1.0, 1.6, 0.6, '#aab3b8', 1);
      for (let r = 0; r < 3; r++) { k.box(x, F + 0.3 + r * 0.5, BZ + 0.31, 0.88, 0.42, 0.02, '#c3cbcf', 0); k.box(x, F + 0.36 + r * 0.5, BZ + 0.33, 0.3, 0.05, 0.03, '#6b7479', 0); }
    }
    k.box(5.6, F + 0.6, BZ, 1.3, 1.2, 0.9, '#4f5a66', 1);
    k.cyl(5.6, F + 0.65, BZ + 0.47, 0.2, 0.05, '#c9c4b6', 1).rotation.x = Math.PI / 2;
    for (let j = 0; j < 4; j++) k.box(5.6 + Math.cos(j * 1.57) * 0.2, F + 0.65 + Math.sin(j * 1.57) * 0.2, BZ + 0.5, 0.06, 0.06, 0.04, '#c9c4b6', 0);
    k.box(5.6, F + 2.2, BZ - 0.2, 1.3, 0.9, 0.06, '#7d5a44', 1);
    for (let j = 0; j < 8; j++) { k.cyl(5.15 + (j % 4) * 0.3, F + 2.42 - Math.floor(j / 4) * 0.4, BZ - 0.15, 0.015, 0.05, '#c9c4b6', 0); k.box(5.15 + (j % 4) * 0.3, F + 2.3 - Math.floor(j / 4) * 0.4, BZ - 0.14, 0.05, 0.14, 0.015, '#e3bb4a', 0); }
    // 의뢰 게시판: 색 플레이트가 줄지어 걸려 있다
    k.box(-1.2, F + 3.35, BZ - 0.15, 4.2, 1.0, 0.08, '#5a7a55', 1);
    k.box(-1.2, F + 3.35, BZ - 0.15, 4.4, 1.2, 0.04, '#7d5a44', 1);
    for (let j = 0; j < 12; j++) k.box(-3 + (j % 6) * 0.72, F + 3.58 - Math.floor(j / 6) * 0.46, BZ - 0.09, 0.5, 0.3, 0.03, ['#b7d6a5', '#e8a96a', '#f2d64b', '#a8c6e0'][(j * 3) % 4], 0);
    // 벽시계: 바늘이 천천히 돈다
    api.dyn('clock', { x: 3.3, y: F + 3.3, z: BZ - 0.1, label: '벽시계',
      idle(o, time) { o.data.m.rotation.z = -time * 0.1; o.data.h.rotation.z = -time * 0.1 / 12; o.data.p.rotation.z = Math.sin(time * 3.14) * 0.3; },
    }, (kk, o) => {
      kk.cyl(0, 0, 0, 0.42, 0.08, '#7d5a44', 1).rotation.x = Math.PI / 2;
      kk.cyl(0, 0, 0.03, 0.36, 0.04, '#fffdf4', 0).rotation.x = Math.PI / 2;
      for (let j = 0; j < 12; j++) kk.box(Math.sin(j * 0.5236) * 0.3, Math.cos(j * 0.5236) * 0.3, 0.055, 0.02, 0.05, 0.01, '#3f3d3a', 0).rotation.z = -j * 0.5236;
      o.data.h = grp(kk.group, 0, 0, 0.06); lit(o.data.h, 0.03, 0.18, 0.01, '#3f3d3a', 0, 0.09, 0);
      o.data.m = grp(kk.group, 0, 0, 0.065); lit(o.data.m, 0.02, 0.28, 0.01, '#3f3d3a', 0, 0.14, 0);
      kk.box(0, -0.6, 0, 0.3, 0.5, 0.08, '#7d5a44', 1);
      o.data.p = grp(kk.group, 0, -0.4, 0.05); lit(o.data.p, 0.015, 0.3, 0.01, '#c9a24a', 0, -0.15, 0); lit(o.data.p, 0.08, 0.08, 0.02, '#e3bb4a', 0, -0.32, 0);
    });
    // 기다리는 긴 의자와 화분
    k.box(6.4, F + 0.42, 3.4, 0.7, 0.1, 2.2, '#c9a57c', 1);
    k.box(6.72, F + 0.8, 3.4, 0.08, 0.66, 2.2, '#c9a57c', 1);
    for (const z of [2.5, 4.3]) k.box(6.4, F + 0.2, z, 0.6, 0.4, 0.1, '#a97c50', 0);
    k.cyl(-7, F + 0.3, -3.6, 0.3, 0.6, '#c9772e', 1);
    for (let j = 0; j < 5; j++) k.ball(-7 + Math.cos(j * 1.3) * 0.22, F + 0.85 + (j % 2) * 0.25, -3.6 + Math.sin(j * 1.3) * 0.22, 0.26, 0.34, 0.26, '#7fb46f', 1);
  };

  /* ================= 2) 검정 시험장 ================= */
  hook('exam', /공부|시험 보기/, s => (s.clip === 'pen_write' ? 'paper.write' : s.clip === 'idle_stretch' ? 'paper.submit' : s.clip === 'board_read' ? 'results.read' : null));
  hook('exam', /합격 발표/, () => 'results.read');
  hook('exam', /자격증 사진/, (s, i) => (i === 1 ? 'printer.print' : i === 2 ? 'printer.give' : null));

  FUR.exam = (k, api, F) => {
    const AS = root.ASSET_SOCKETS.exam || {};
    for (const [n, v] of Object.entries(AS)) if (/desk_stand|card_/.test(n) && v[2] < F) v[2] = F;
    const TOP = F + 0.62;
    // 답안지: 글씨가 한 줄씩 채워지고, 낼 때 앞으로 밀려 나간다
    const paper = (id, x, y, z, ry) => api.dyn(id, { x, y, z, ry, label: '답안지',
      clips: {
        write(o, u, time) {
          const p = (u * 3) % 1, n = o.data.lines.length;
          o.data.sheet.visible = true;
          o.data.lines.forEach((l, j) => { const t = clamp(p * n - j); l.visible = t > 0; l.scale.x = Math.max(0.02, t); l.position.x = -0.13 + t * 0.13; });
          const row = Math.min(n - 1, Math.floor(p * n)), t = (p * n) % 1;
          o.data.pen.visible = true;
          o.data.pen.position.set(-0.13 + t * 0.26, 0.05 + Math.abs(Math.sin(time * 16)) * 0.012, -0.12 + row * 0.04);
        },
        submit(o, u) {
          o.data.pen.visible = false;
          o.data.sheet.position.z = -ease(clamp(u / 0.7)) * 0.5;
          o.data.sheet.visible = u < 0.8;
        },
      },
      end(o) { o.data.sheet.position.z = 0; o.data.sheet.visible = true; o.data.pen.visible = false; o.data.lines.forEach(l => { l.visible = false; }); },
    }, (kk, o) => {
      const s = grp(kk.group); o.data.sheet = s;
      const sk = makeKit(s, 0, 0, 0);
      sk.box(0, 0.006, 0, 0.36, 0.012, 0.46, '#fffdf4', 0);
      sk.box(0, 0.014, -0.19, 0.3, 0.004, 0.03, '#8fa7c8', 0);
      o.data.lines = [];
      for (let j = 0; j < 8; j++) { const l = lit(s, 0.26, 0.004, 0.012, '#4a4a55', 0, 0.015, -0.12 + j * 0.04); l.visible = false; o.data.lines.push(l); }
      const p = grp(kk.group, 0, 0.05, 0); o.data.pen = p; p.visible = false;
      const pm = lit(p, 0.014, 0.16, 0.014, '#e3bb4a', 0.03, 0.05, 0.03); pm.rotation.set(0.5, 0, -0.5);
      // 지우개와 수험표
      kk.box(0.26, 0.015, 0.12, 0.07, 0.03, 0.04, '#f3a9bd', 0);
      kk.box(-0.27, 0.006, -0.15, 0.12, 0.012, 0.08, '#f2d64b', 0);
    });
    // 앉는 책상 둘 (의자는 자리에 맞춘다)
    const seatDesk = (name, dx) => {
      const v = AS[name]; if (!v) return null;
      const x = v[0], z = v[1];
      k.box(x + dx, TOP, z - 0.85, 1.1, 0.07, 0.7, '#e6c797', 1);
      k.box(x + dx, TOP - 0.2, z - 1.17, 1.0, 0.3, 0.04, '#c9a57c', 0);
      for (const sx of [-0.5, 0.5]) k.box(x + dx + sx, F + 0.3, z - 0.85, 0.06, 0.6, 0.6, '#8f969a', 0);
      k.box(x, v[2] - 0.04, z, 0.62, 0.08, 0.6, '#c9a57c', 1);
      k.box(x, v[2] + 0.3, z + 0.3, 0.62, 0.5, 0.06, '#c9a57c', 1);
      for (const [ax, az] of [[-0.26, -0.24], [0.26, -0.24], [-0.26, 0.26], [0.26, 0.26]]) k.box(x + ax, (v[2] - 0.08 + F) / 2, z + az, 0.05, v[2] - 0.08 - F, 0.05, '#8f969a', 0);
      return paper(`paper:${name}`, x, TOP + 0.04, z - 0.72, 0);
    };
    // 응시 책상 열 개: 모두 칠판을 바라보도록 줄 맞춰 (study-places.js가 자리를 격자로 다시 잡는다)
    const DESKS = ['desk_sit_1', 'desk_sit_2', ...Array.from({ length: 8 }, (_, i) => `desk_stand_${i + 1}`)];
    for (const name of DESKS) {
      const d = seatDesk(name, 0);
      if (d && name === 'desk_sit_2') d.state.dyn.set('paper:sake_desk', d);
    }
    // 칠판: 칠판 앞에서 공부하면 분필 글씨가 늘어난다
    api.dyn('paper:board_look', { x: 0, y: F, z: -3.95, label: '칠판',
      clips: {
        write(o, u) {
          const p = (u * 2) % 1, n = o.data.lines.length;
          o.data.lines.forEach((l, j) => { const t = clamp(p * n - j); l.visible = t > 0; l.scale.x = Math.max(0.02, t); l.position.x = l.userData.x - (1 - t) * l.userData.w / 2; });
          const row = Math.min(n - 1, Math.floor(p * n)), t = (p * n) % 1, l = o.data.lines[row];
          o.data.chalk.position.set(l.userData.x - l.userData.w / 2 + t * l.userData.w, l.position.y, 0.12);
        },
        submit() {},
      },
      end(o) { o.data.chalk.position.set(1.2, 0.98, 0.14); },
    }, (kk, o) => {
      kk.box(0, 1.9, 0, 4.2, 1.9, 0.1, '#7d5a44', 1);
      kk.box(0, 1.9, 0.04, 3.96, 1.66, 0.06, '#3f6f55', 0);
      kk.box(0, 0.98, 0.14, 4.0, 0.05, 0.16, '#a97c50', 1);
      for (const sx of [-1.9, 1.9]) { kk.box(sx, 0.5, 0, 0.1, 1.0, 0.1, '#7d5a44', 0); kk.box(sx, 0.04, 0.1, 0.12, 0.08, 0.7, '#7d5a44', 0); }
      text(kk, 0, 2.3, 0.08, 3.4, 0.4, ['풀뽑기 검정 5급'], '#f4f1e4', 0.26);
      o.data.lines = [];
      for (let j = 0; j < 6; j++) {
        const w = 2.2 + ((j * 5) % 3) * 0.5, x = -1.7 + w / 2;
        const l = lit(kk.group, w, 0.035, 0.01, '#f4f1e4', x, 2.12 - j * 0.17, 0.075, 0.9);
        l.userData = { x, w }; l.visible = j < 2; o.data.lines.push(l);
      }
      o.data.chalk = lit(kk.group, 0.08, 0.03, 0.03, '#fffdf4', 1.2, 0.98, 0.14);
      kk.box(-1.4, 1.03, 0.14, 0.2, 0.06, 0.09, '#5a3b33', 1);
      kk.box(-1.4, 1.0, 0.14, 0.2, 0.02, 0.09, '#e8e3d8', 0);
    });
    // 합격 발표판: 읽는 줄에 불빛이 따라 내려간다
    api.dyn('results', { x: 5.6, y: F, z: -4.0, obj: 'board', label: '합격 발표',
      clips: { read(o, u) { o.data.bar.visible = true; o.data.bar.position.y = 2.28 - Math.floor(((u * 2) % 1) * 8) * 0.14; } },
      end(o) { o.data.bar.visible = false; },
    }, (kk, o) => {
      kk.box(0, 1.85, 0, 1.9, 1.7, 0.08, '#c9a57c', 1);
      kk.box(0, 1.85, 0.045, 1.7, 1.5, 0.02, '#d8b98a', 0);
      kk.box(-0.35, 1.8, 0.06, 0.8, 1.3, 0.01, '#fffdf4', 0);
      kk.box(0.5, 2.05, 0.06, 0.6, 0.7, 0.01, '#fff3c4', 0);
      text(kk, -0.35, 2.36, 0.07, 0.8, 0.16, ['합격자'], '#c8463c', 0.12);
      for (let j = 0; j < 8; j++) { kk.box(-0.45, 2.28 - j * 0.14, 0.068, 0.4, 0.035, 0.004, '#4a4a55', 0); kk.box(-0.08, 2.28 - j * 0.14, 0.068, 0.12, 0.05, 0.004, j % 3 ? '#c8463c' : '#8fa7c8', 0); }
      for (const [px, py] of [[-0.7, 2.42], [0, 2.42], [0.25, 2.36], [0.75, 2.36]]) kk.ball(px, py, 0.08, 0.03, 0.03, 0.02, '#c8463c', 0);
      o.data.bar = lit(kk.group, 0.8, 0.07, 0.006, '#f2d64b', -0.35, 2.28, 0.064, 0.5);
      o.data.bar.visible = false;
      for (const sx of [-0.85, 0.85]) kk.box(sx, 0.5, 0, 0.08, 1.0, 0.08, '#a97c50', 0);
    });
    // 증명사진: 삼각대 카메라와 파란 배경 막
    k.box(-2, F + 1.25, 2.25, 1.7, 2.3, 0.04, '#8fb3d9', 1);
    k.cyl(-2, F + 2.45, 2.25, 0.07, 1.9, '#d9d7d0', 0).rotation.z = Math.PI / 2;
    for (const sx of [-0.9, 0.9]) k.cyl(-2 + sx, F + 1.2, 2.25, 0.03, 2.4, '#7f868a', 0);
    api.dyn('camera', { x: -2, y: F, z: 4.45, ry: Math.PI, obj: 'camera', label: '증명사진 카메라',
      clips: {
        flash(o, u) {
          const f = Math.exp(-Math.pow((u - 0.6) * 9, 2));
          o.data.flash.material.opacity = f; o.data.flash.scale.setScalar(1 + f * 5);
          o.data.lamp.material.color.set(u < 0.55 && Math.sin(u * 60) > 0 ? '#ff6b5e' : '#5a2a26');
          kitScale(o.data.shut, u > 0.56 && u < 0.66 ? 0.4 : 1);
        },
      },
      end(o) { o.data.flash.material.opacity = 0; o.data.lamp.material.color.set('#5a2a26'); kitScale(o.data.shut, 1); },
    }, (kk, o) => {
      for (let j = 0; j < 3; j++) { const a = j * 2.094; const leg = kk.cyl(Math.sin(a) * 0.22, 0.45, Math.cos(a) * 0.22, 0.02, 0.98, '#3f3d3a', 0); leg.rotation.set(Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45); }
      kk.cyl(0, 0.92, 0, 0.05, 0.1, '#3f3d3a', 0);
      kk.box(0, 1.08, 0, 0.36, 0.24, 0.22, '#4a4a55', 1);
      kk.cyl(0, 1.08, 0.16, 0.09, 0.12, '#2f2f38', 1).rotation.x = Math.PI / 2;
      o.data.shut = kk.cyl(0, 1.08, 0.225, 0.065, 0.01, '#9fd0e6', 0); o.data.shut.rotation.x = Math.PI / 2;
      kk.box(0.1, 1.24, 0, 0.14, 0.09, 0.12, '#d9d7d0', 1);
      o.data.flash = lit(kk.group, 0.14, 0.09, 0.02, '#ffffff', 0.1, 1.24, 0.08, 0);
      o.data.lamp = lit(kk.group, 0.03, 0.03, 0.02, '#5a2a26', -0.13, 1.16, 0.115);
    });
    // 자격증 발급기: 불이 깜박이고 카드가 밀려 나온다
    api.dyn('printer', { x: 0, y: F, z: 2.55, obj: 'printer', label: '자격증 발급기',
      clips: {
        print(o, u, time) {
          o.data.lamp.material.color.set(Math.sin(time * 12) > 0 ? '#8fe08a' : '#3f6f4a');
          o.data.body.position.x = Math.sin(time * 40) * 0.006;
          o.data.card.visible = u > 0.45; o.data.card.position.z = 0.3 + ease(clamp((u - 0.45) / 0.5)) * 0.2;
          o.data.bar.scale.x = Math.max(0.02, u); o.data.bar.position.x = -0.14 + u * 0.14;
        },
        give(o, u) { o.data.card.visible = u < 0.25; o.data.card.position.z = 0.5; o.data.lamp.material.color.set('#8fe08a'); },
      },
      end(o) { o.data.card.visible = false; o.data.body.position.x = 0; o.data.lamp.material.color.set('#3f6f4a'); o.data.bar.scale.x = 0.02; },
    }, (kk, o) => {
      kk.box(0, 0.36, 0, 0.9, 0.72, 0.7, '#a97c50', 1);
      const b = grp(kk.group); o.data.body = b; const bk = makeKit(b, 0, 0, 0);
      bk.box(0, 0.9, 0, 0.7, 0.36, 0.56, '#e8e3d8', 1);
      bk.box(0, 0.82, 0.285, 0.44, 0.03, 0.02, '#3f3d3a', 0);
      bk.box(0, 1.0, 0.285, 0.34, 0.1, 0.02, '#2f3a33', 0);
      o.data.bar = lit(b, 0.28, 0.04, 0.01, '#8fe08a', -0.14, 1.0, 0.3); o.data.bar.scale.x = 0.02;
      o.data.lamp = lit(b, 0.04, 0.04, 0.02, '#3f6f4a', 0.27, 1.0, 0.285);
      o.data.card = kk.box(0, 0.82, 0.3, 0.3, 0.012, 0.2, '#f2d64b', 0); o.data.card.visible = false;
      text(kk, 0, 0.2, 0.36, 0.8, 0.3, ['자격증 발급'], '#fff8e6', 0.13);
    });
    // 감독 책상과 큰 시험 시계
    k.box(-5.4, TOP + 0.1, -3.4, 1.9, 0.08, 0.9, '#c9a57c', 1);
    k.box(-5.4, F + 0.34, -3.4, 1.8, 0.68, 0.8, '#a97c50', 1);
    for (let j = 0; j < 6; j++) k.box(-5.9, TOP + 0.16 + j * 0.022, -3.4, 0.4, 0.02, 0.5, j % 2 ? '#fffdf4' : '#f1ecdc', 0);
    k.cyl(-4.8, TOP + 0.22, -3.5, 0.08, 0.16, '#7f96b8', 1);
    for (let j = 0; j < 4; j++) k.cyl(-4.8 + (j - 1.5) * 0.03, TOP + 0.36, -3.5, 0.012, 0.2, ['#e3bb4a', '#c8463c', '#6fb385', '#3f3d3a'][j], 0);
    api.dyn('timer', { x: -5.4, y: F + 3.1, z: -4.3, label: '시험 시계',
      idle(o, time) { o.data.m.rotation.z = -time * 0.5; o.data.s.material.color.set(Math.sin(time * 6.28) > 0 ? '#c8463c' : '#7a2a26'); },
    }, (kk, o) => {
      kk.cyl(0, 0, 0, 0.6, 0.1, '#4a4a55', 1).rotation.x = Math.PI / 2;
      kk.cyl(0, 0, 0.04, 0.52, 0.04, '#fffdf4', 0).rotation.x = Math.PI / 2;
      for (let j = 0; j < 12; j++) kk.box(Math.sin(j * 0.5236) * 0.44, Math.cos(j * 0.5236) * 0.44, 0.065, j % 3 ? 0.02 : 0.04, 0.08, 0.01, '#3f3d3a', 0).rotation.z = -j * 0.5236;
      o.data.m = grp(kk.group, 0, 0, 0.07); lit(o.data.m, 0.03, 0.42, 0.01, '#c8463c', 0, 0.2, 0);
      o.data.s = lit(kk.group, 0.07, 0.07, 0.02, '#c8463c', 0, 0, 0.08);
    });
    // 벽 안내문과 문제집 책장, 연필깎이, 쓰레기통
    k.box(-2.9, F + 2.6, -4.35, 1.0, 1.3, 0.04, '#fffdf4', 1);
    text(k, -2.9, F + 2.0, -4.32, 1.0, 1.2, ['정숙', '부정행위', '금지'], '#c8463c', 0.22);
    k.box(3.2, F + 1.1, -4.1, 1.8, 2.2, 0.5, '#a97c50', 1);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) k.box(2.5 + c * 0.2, F + 0.5 + r * 0.66, -3.98, 0.15, 0.46 - ((c + r) % 3) * 0.05, 0.34, ['#b7d6a5', '#a8c6e0', '#f2d64b', '#e8a96a'][(c + r) % 4], 0);
    k.box(-6.3, TOP + 0.2, -3.1, 0.16, 0.14, 0.2, '#c8463c', 1);
    k.cyl(-6.23, TOP + 0.22, -3.1, 0.05, 0.03, '#d9d7d0', 0).rotation.z = Math.PI / 2;
    k.cyl(6.4, F + 0.25, 3.8, 0.24, 0.5, '#8fa7b8', 1);
    for (let j = 0; j < 3; j++) k.ball(6.4 + (j - 1) * 0.1, F + 0.52, 3.8 + (j % 2) * 0.08, 0.1, 0.07, 0.1, '#fffdf4', 0);
  };
})(typeof self !== 'undefined' ? self : this);
