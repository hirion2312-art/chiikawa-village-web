'use strict';
// 먼작귀 빌리지 선공개 — 이용약관 · 개인정보 처리방침 · 구글 로그인 동의 · 내 정보 모두 지우기 (2026-11-18)
//  - 구글 로그인 단추를 누르면 먼저 동의 창: [필수] 만 14세 이상, [필수] 약관·개인정보 수집·이용 동의 → 구글로 계속
//  - 첫 화면 아래와 「더보기」에 약관·처리방침 링크, 「더보기」에 내 정보 모두 지우기
//  - 운영자가 바꿀 값은 맨 위 OPERATOR 하나에 모았다 (문의 메일은 두지 않음)
const Legal = (() => {
  const OPERATOR = { name: 'bbimworks', email: '', since: '2026년 11월 18일', version: '2026-11-18' };
  const CONSENT_KEY = 'mogukawa-consent';
  // 문의 메일은 두지 않는다 (2026-11-18 운영자 결정). 보기·고치기·지우기는 사이트 안에서 바로 할 수 있다
  const contact = () => (OPERATOR.email ? `<a href="mailto:${OPERATOR.email}">${OPERATOR.email}</a>` : '사이트 안 「더보기」에서 내 정보를 바로 보고, 고치고, 모두 지울 수 있어요');

  const PRIVACY = () => `
<h2>개인정보 처리방침</h2>
<p class="lg-meta">시행일 ${OPERATOR.since} · 운영자 ${OPERATOR.name}</p>
<p>먼작귀 빌리지 선공개(chiikawa-village.web.app, 이하 「사이트」)는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을 빠르게 처리하기 위해 다음과 같이 처리방침을 둡니다.</p>

<h3>1. 처리하는 개인정보 항목</h3>
<table class="lg-table">
<tr><th>구분</th><th>항목</th><th>모으는 방법</th></tr>
<tr><td>구글 로그인(선택)</td><td>구글 계정 고유 번호(UID). 로그인 과정에서 Google이 제공하는 이메일 주소·이름·프로필 사진은 Google의 인증 서비스(Firebase Authentication)에만 저장되며, 사이트 서버는 저장하지 않습니다.</td><td>이용자가 구글 로그인을 할 때</td></tr>
<tr><td>계정 없이 이용</td><td>익명 계정 고유 번호(Firebase 익명 로그인), 아이 열쇠(서버에는 되돌릴 수 없게 바꾼 값만 저장)</td><td>사이트를 처음 열 때 자동</td></tr>
<tr><td>아이 만들기</td><td>아이 이름, 꾸민 모습, 성격 질문 답과 성격 유형</td><td>이용자가 입력</td></tr>
<tr><td>자랑하기</td><td>올린 사진, 한 줄 글, 하트·신고 기록</td><td>이용자가 올리거나 누를 때</td></tr>
<tr><td>자동으로 생기는 정보</td><td>접속 IP 주소(지나친 요청을 막는 데만 쓰고 서버 메모리에서 1시간 안에 사라짐, 따로 저장하지 않음), 기기 저장소의 설정(언어·소리·아이 열쇠·동의 여부)</td><td>사이트 이용 중 자동</td></tr>
</table>
<p>주민등록번호, 전화번호, 주소, 결제 정보 등은 받지 않습니다. 사진과 글에 다른 사람이나 자신의 개인정보를 넣지 말아 주세요.</p>

<h3>2. 처리 목적</h3>
<ul>
<li>아이를 저장하고, 다른 기기에서도 같은 아이를 이어서 보게 하기 (계정 확인)</li>
<li>자랑 갤러리 운영: 사진 보여 주기, 하트, 신고된 사진 가리기</li>
<li>나쁜 이용 막기: 지나친 요청 제한, 신고 처리</li>
<li>마을이 열릴 때 저장된 아이를 마을에 입주시키기</li>
</ul>

<h3>3. 보유 및 이용 기간</h3>
<ul>
<li>이용자가 「내 정보 모두 지우기」를 하면 아이·사진·하트·신고 기록을 그 자리에서 지웁니다.</li>
<li>그 밖에는 사이트(선공개와 이어지는 마을 서비스)를 운영하는 동안 보관하고, 서비스를 끝내면 지체 없이 지웁니다.</li>
<li>운영 중 데이터를 처음부터 다시 시작할 때 만드는 백업은 복구 목적으로만 쓰고 30일 안에 지웁니다.</li>
<li>Google 인증 서비스에 남은 계정 정보는 「내 정보 모두 지우기」 때 함께 지우도록 요청하며, Google 계정 자체는 Google의 정책을 따릅니다.</li>
</ul>

<h3>4. 제3자 제공</h3>
<p>이용자의 개인정보를 다른 사람이나 회사에 제공하지 않습니다. 다만 법령에 따라 수사기관 등이 요구하는 경우는 예외입니다.</p>

<h3>5. 처리 위탁 및 국외 이전</h3>
<p>사이트 운영을 위해 아래 서비스를 이용하며, 이 과정에서 개인정보가 국외(Google의 데이터 센터, 미국 등)에 저장될 수 있습니다.</p>
<table class="lg-table">
<tr><th>받는 곳</th><th>하는 일</th><th>옮겨지는 항목</th><th>옮기는 때·방법</th><th>보유 기간</th></tr>
<tr><td>Google LLC (Firebase Authentication)</td><td>구글·익명 로그인</td><td>계정 고유 번호, (구글 로그인 시) 이메일·이름·프로필 사진</td><td>로그인할 때 네트워크로 전송</td><td>계정을 지우거나 서비스를 끝낼 때까지</td></tr>
<tr><td>Google LLC (Firebase Hosting)</td><td>사이트 화면 전송</td><td>접속 기록(IP 등, Google이 처리)</td><td>사이트를 열 때 네트워크로 전송</td><td>Google의 보관 정책에 따름</td></tr>
<tr><td>Google LLC (Google Cloud)</td><td>마을 서버(아이·사진 저장)</td><td>1항의 아이·자랑하기 정보, 계정 고유 번호</td><td>저장할 때 네트워크로 전송</td><td>3항의 기간</td></tr>
</table>
<p>Google LLC 연락처: <a href="https://support.google.com/policies" target="_blank" rel="noopener">support.google.com/policies</a>. 국외 이전을 원하지 않으면 구글 로그인을 하지 않거나 「내 정보 모두 지우기」를 할 수 있습니다. 이 경우 아이를 저장하는 기능은 쓸 수 없습니다.</p>

<h3>6. 이용자의 권리와 행사 방법</h3>
<ul>
<li>보기·고치기: 「내 아이 보러 가기」와 「다시 꾸미기」에서 언제든 보고 고칠 수 있습니다.</li>
<li>지우기(삭제)·처리 정지: 「더보기 → 내 정보 모두 지우기」로 바로 지울 수 있고, 자랑 사진은 하나씩도 지울 수 있습니다.</li>
<li>그 밖의 개인정보 관련 신고·상담은 아래 11항의 기관에 할 수 있습니다.</li>
</ul>

<h3>7. 만 14세 미만 아동</h3>
<p>구글 로그인은 만 14세 이상만 할 수 있습니다. 만 14세 미만 아동의 개인정보를 알게 되면 지체 없이 지웁니다.</p>

<h3>8. 파기 절차와 방법</h3>
<p>지울 정보는 서버 저장 파일에서 바로 지우고, 사진 파일은 되살릴 수 없게 삭제합니다.</p>

<h3>9. 안전성 확보 조치</h3>
<ul>
<li>모든 연결은 HTTPS로 암호화합니다.</li>
<li>아이 열쇠와 로그인 토큰은 되돌릴 수 없게 바꾼 값만 서버에 저장합니다.</li>
<li>서버와 관리 화면은 운영자만 접근할 수 있게 제한합니다.</li>
</ul>

<h3>10. 쿠키 등 자동 수집 장치</h3>
<p>사이트는 광고나 행동 추적용 쿠키를 쓰지 않습니다. 로그인 상태와 설정을 기억하려고 브라우저 저장소(localStorage·IndexedDB)를 씁니다. 브라우저 설정에서 사이트 데이터를 지우면 함께 지워지며, 이 경우 열쇠가 없으면 아이를 다시 불러올 수 없습니다.</p>

<h3>11. 개인정보 보호책임자</h3>
<p>운영자: ${OPERATOR.name}<br>연락처: ${contact()}</p>
<p>개인정보 침해 신고·상담은 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118), 개인정보분쟁조정위원회(www.kopico.go.kr, 1833-6972), 대검찰청(www.spo.go.kr, 1301), 경찰청(ecrm.police.go.kr, 182)에도 할 수 있습니다.</p>

<h3>12. 처리방침의 변경</h3>
<p>내용이 바뀌면 시행 7일 전(이용자에게 불리한 변경은 30일 전)부터 사이트에 알립니다.</p>
<p class="lg-meta">공고일 ${OPERATOR.since} · 시행일 ${OPERATOR.since}</p>`;

  const TERMS = () => `
<h2>이용약관</h2>
<p class="lg-meta">시행일 ${OPERATOR.since} · 운영자 ${OPERATOR.name}</p>
<h3>1. 목적</h3>
<p>이 약관은 먼작귀 빌리지 선공개(이하 「사이트」)를 이용하는 데 필요한 운영자와 이용자의 약속을 정합니다.</p>
<h3>2. 사이트의 성격</h3>
<ul>
<li>사이트는 원작 「치이카와(먼작귀)」를 좋아하는 팬이 비영리로 만든 팬 제작물이며, 원작자·원작 권리자와 관계가 없습니다.</li>
<li>원작 캐릭터와 관련 저작물의 권리는 원작자 나가노(ナガノ)와 권리자에게 있습니다. 권리자의 요청이 있으면 사이트를 바로 고치거나 닫을 수 있습니다.</li>
<li>사이트는 무료이며 결제나 광고가 없습니다.</li>
</ul>
<h3>3. 이용</h3>
<ul>
<li>구글 로그인은 만 14세 이상만 할 수 있습니다. 한 계정에 아이는 3명까지 만들 수 있습니다.</li>
<li>아이 열쇠는 아이를 다시 불러오는 유일한 수단입니다. 다른 사람에게 알려 주지 마세요.</li>
</ul>
<h3>4. 올리는 사진과 글</h3>
<ul>
<li>올린 사진과 글의 책임은 올린 사람에게 있습니다. 다른 사람을 괴롭히거나, 개인정보를 드러내거나, 법에 어긋나는 내용은 올릴 수 없습니다.</li>
<li>올린 사진은 자랑 갤러리에서 누구나 볼 수 있고, 공유 링크로 퍼질 수 있습니다. 이용자는 사이트가 갤러리에 보여 주는 데 필요한 범위에서 사진을 쓰는 것에 동의합니다.</li>
<li>신고가 3번 쌓이거나 운영자가 문제라고 판단한 사진은 알림 없이 가리거나 지울 수 있습니다.</li>
</ul>
<h3>5. 서비스의 변경과 종료</h3>
<p>선공개는 시험 운영입니다. 기능이 바뀌거나, 데이터를 처음부터 다시 시작하거나, 서비스를 끝낼 수 있으며, 이때는 사이트에 미리 알립니다.</p>
<h3>6. 책임의 한계</h3>
<p>운영자는 고의나 중대한 과실이 없는 한, 무료 시험 서비스 이용 중 생긴 손해(데이터 손실 등)에 책임을 지지 않습니다.</p>
<h3>7. 탈퇴</h3>
<p>이용자는 언제든 「더보기 → 내 정보 모두 지우기」로 탈퇴할 수 있습니다.</p>
<h3>8. 문의</h3>
<p>${OPERATOR.name} · ${contact()}</p>`;

  /* ---------- 창 ---------- */
  const css = document.createElement('style');
  css.textContent = `
#legalWrap { position: fixed; inset: 0; z-index: 2000; background: rgba(43, 30, 28, .55); display: flex; align-items: center; justify-content: center; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); }
#legalWrap[hidden] { display: none; }
#legalBox { width: min(560px, 100%); max-height: 100%; display: flex; flex-direction: column; background: var(--paper, #fffaf1); color: var(--ink, #4a3230); border: 2.5px solid var(--ink, #4a3230); border-radius: 22px; box-shadow: 0 5px 0 var(--ink, #4a3230); overflow: hidden; }
#legalBody { overflow: auto; padding: 18px 20px 8px; font-size: 14px; line-height: 1.6; -webkit-overflow-scrolling: touch; }
#legalBody h2 { font-family: var(--f-head, 'Jua'), sans-serif; font-weight: 400; font-size: 22px; margin: 0 0 4px; }
#legalBody h3 { font-family: var(--f-head, 'Jua'), sans-serif; font-weight: 400; font-size: 16px; margin: 16px 0 4px; }
#legalBody p, #legalBody li { margin: 4px 0; word-break: keep-all; }
#legalBody ul { padding-left: 18px; margin: 4px 0; }
#legalBody a { color: #c04d6b; }
.lg-meta { font-size: 12px; color: var(--quiet-2, #6b5449); }
.lg-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 6px 0; }
.lg-table th, .lg-table td { border: 1px solid #e2d5c4; padding: 6px; vertical-align: top; text-align: left; word-break: keep-all; }
.lg-table th { background: #f6ecdc; font-weight: 700; }
#legalFoot { display: flex; gap: 8px; padding: 12px 16px 16px; border-top: 1.5px solid #e9dccb; background: var(--paper, #fffaf1); flex-wrap: wrap; }
#legalFoot .btn { flex: 1; min-width: 120px; }
.lg-check { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border: 2px solid #e2d5c4; border-radius: 14px; margin: 8px 0; background: #fff; cursor: pointer; font-size: 14.5px; }
.lg-check input { width: 20px; height: 20px; margin-top: 1px; accent-color: #e0607e; flex: none; }
.lg-check b { color: #c04d6b; font-weight: 700; }
.lg-all { border-color: var(--ink, #4a3230); font-weight: 700; }
.lg-links { display: flex; gap: 12px; margin: 6px 2px 2px; font-size: 13px; }
.lg-links button { border: 0; background: none; padding: 0; color: #c04d6b; text-decoration: underline; font: inherit; cursor: pointer; }
.lg-sum { font-size: 12.5px; color: var(--quiet-2, #6b5449); margin: 8px 0 0; }
#legalLinks { display: flex; justify-content: center; gap: 10px; margin: 6px auto 0; font-size: 12px; }
#legalLinks button { border: 0; background: none; padding: 2px 4px; color: var(--quiet-2, #6b5449); text-decoration: underline; font: inherit; cursor: pointer; }
`;
  document.head.append(css);
  let wrap = null;
  function shell() {
    if (wrap) return wrap;
    wrap = document.createElement('div');
    wrap.id = 'legalWrap';
    wrap.hidden = true;
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = '<div id="legalBox"><div id="legalBody"></div><div id="legalFoot"></div></div>';
    document.body.append(wrap);
    return wrap;
  }
  const btn = (text, cls, on) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || ''); b.textContent = text; b.onclick = on; return b; };
  function close() { if (wrap) wrap.hidden = true; }

  // 전문 보기 (back이 있으면 「돌아가기」)
  function open(kind, back) {
    shell();
    wrap.hidden = false;
    const body = document.getElementById('legalBody');
    body.innerHTML = kind === 'terms' ? TERMS() : PRIVACY();
    body.scrollTop = 0;
    wrap.setAttribute('aria-label', kind === 'terms' ? '이용약관' : '개인정보 처리방침');
    document.getElementById('legalFoot').replaceChildren(btn(back ? '돌아가기' : '닫기', 'main', () => (back ? back() : close())));
  }

  /* ---------- 구글 로그인 전 동의 ---------- */
  const agreed = () => { try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); } catch (e) { return null; } };
  function consent() {
    const a = agreed();
    if (a && a.version === OPERATOR.version) return Promise.resolve(true);
    return new Promise(done => {
      const state = { age: false, use: false };
      const draw = () => {
        shell();
        wrap.hidden = false;
        wrap.setAttribute('aria-label', '구글 로그인 동의');
        const body = document.getElementById('legalBody');
        body.innerHTML = `
<h2>구글 계정으로 저장하기</h2>
<p>구글 계정에 아이를 저장하면 다른 기기에서도 같은 아이를 만날 수 있어요. 계속하려면 아래 내용에 동의해 주세요.</p>
<table class="lg-table">
<tr><th>모으는 항목</th><td>구글 계정 고유 번호(UID). 이메일·이름·프로필 사진은 Google 인증 서비스에만 남고 사이트 서버에는 저장하지 않아요</td></tr>
<tr><th>목적</th><td>아이를 계정에 저장하고 다른 기기에서 이어 보기, 자랑 갤러리 운영</td></tr>
<tr><th>보유 기간</th><td>「내 정보 모두 지우기」를 하거나 서비스를 끝낼 때까지</td></tr>
<tr><th>국외 이전</th><td>Google LLC(미국 등) — 로그인·서버 보관</td></tr>
</table>
<p class="lg-sum">동의하지 않아도 계정 없이 이 기기에서 아이를 만들 수 있어요. 다만 구글 계정 저장은 할 수 없어요.</p>
<label class="lg-check lg-all"><input type="checkbox" data-k="all"> 아래 내용에 모두 동의해요</label>
<label class="lg-check"><input type="checkbox" data-k="age"> <span><b>[필수]</b> 만 14세 이상이에요</span></label>
<label class="lg-check"><input type="checkbox" data-k="use"> <span><b>[필수]</b> 이용약관과 개인정보 수집·이용(국외 이전 포함)에 동의해요</span></label>
<div class="lg-links"><button type="button" data-open="terms">이용약관 전문</button><button type="button" data-open="privacy">개인정보 처리방침 전문</button></div>`;
        const boxes = [...body.querySelectorAll('input[type=checkbox]')];
        const go = btn('동의하고 계속', 'main', () => {
          try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: OPERATOR.version, at: new Date().toISOString(), age: true, use: true })); } catch (e) { /* 저장이 막힌 브라우저 */ }
          close();
          done(true);
        });
        const sync = () => {
          for (const b of boxes) b.checked = b.dataset.k === 'all' ? state.age && state.use : state[b.dataset.k];
          go.disabled = !(state.age && state.use);
        };
        for (const b of boxes) b.onchange = () => {
          if (b.dataset.k === 'all') state.age = state.use = b.checked; else state[b.dataset.k] = b.checked;
          sync();
        };
        for (const l of body.querySelectorAll('[data-open]')) l.onclick = () => open(l.dataset.open, draw);
        document.getElementById('legalFoot').replaceChildren(btn('취소', '', () => { close(); done(false); }), go);
        sync();
      };
      draw();
    });
  }
  // 구글 로그인은 언제나 동의 창을 거친다 (첫 화면·더보기 어느 단추든)
  function guardGoogle() {
    const A = window.VillageAuth;
    if (!A || A._legal) return;
    const google = A.google.bind(A);
    A.google = async () => { if (!(await consent())) return; return google(); };
    A._legal = true;
  }

  /* ---------- 내 정보 모두 지우기 ---------- */
  async function eraseAll(button) {
    if (button.dataset.sure !== '1') {
      button.dataset.sure = '1';
      button.textContent = '정말 지울까요? 아이·사진이 모두 사라져요';
      setTimeout(() => { if (button.isConnected) { button.dataset.sure = ''; button.textContent = '내 정보 모두 지우기'; } }, 5000);
      return;
    }
    button.disabled = true;
    button.textContent = '지우는 중…';
    try {
      await api('/me', { method: 'DELETE' });
    } catch (e) {
      button.disabled = false;
      button.dataset.sure = '';
      button.textContent = '내 정보 모두 지우기';
      const err = document.getElementById('error');
      if (err) err.textContent = '지우지 못했어요. 잠시 뒤에 다시 해 주세요.';
      return;
    }
    // 이 기기의 열쇠·설정도 지우고, 구글(Firebase) 계정도 지운다 (안 되면 로그아웃만)
    try { for (const k of Object.keys(localStorage)) if (/^mogukawa-|^fan-game-/.test(k)) localStorage.removeItem(k); } catch (e) { /* 저장이 막힌 브라우저 */ }
    try {
      if (window.firebase && firebase.auth) {
        const u = firebase.auth().currentUser;
        if (u) { try { await u.delete(); } catch (e) { await firebase.auth().signOut(); } }
      }
    } catch (e) { /* 계정 서비스를 못 불러옴 */ }
    alert('내 정보를 모두 지웠어요. 그동안 고마웠어요!');
    location.reload();
  }

  /* ---------- 링크·단추 붙이기 ---------- */
  function addLinks() {
    guardGoogle();
    const start = document.getElementById('start');
    if (start && !document.getElementById('legalLinks')) {
      const box = document.createElement('div');
      box.id = 'legalLinks';
      box.append(btn('이용약관', '', () => open('terms')), btn('개인정보 처리방침', '', () => open('privacy')));
      for (const b of box.children) b.className = '';
      const fine = document.getElementById('startFine');
      if (fine && fine.parentNode === start) fine.after(box); else start.append(box);
    }
    const btns = document.querySelector('#room .btns');
    if (btns && !document.getElementById('roomErase')) {
      const links = document.createElement('div');
      links.className = 'lg-links';
      links.style.justifyContent = 'center';
      links.append(btn('이용약관', '', () => open('terms')), btn('개인정보 처리방침', '', () => open('privacy')));
      for (const b of links.children) b.className = '';
      const erase = btn('내 정보 모두 지우기', 'sub', () => eraseAll(erase));
      erase.id = 'roomErase';
      btns.append(erase, links);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(addLinks, 0)); else setTimeout(addLinks, 0);
  // 로그인 모듈이 늦게 준비돼도 덮어 둔다
  if (window.VillageAuth && VillageAuth.ready) VillageAuth.ready.then(guardGoogle);

  return { open, consent, OPERATOR };
})();
