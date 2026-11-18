'use strict';
// 먼작귀 빌리지 선공개 — 자랑 게시판 (2026-11-17, 안 A 「코르크 게시판」으로 다시 만듦 2026-11-18)
// 포토존에서 찍어 올린 사진을 마을 게시판에 폴라로이드처럼 붙여 본다. 구경은 로그인 없이, 좋아요·신고는 내 아이가 있어야.
//  - 맨 위: 이번 주 인기 1·2·3 (최근 7일, 하트 순). 아래: 높이가 다른 사진이 엇갈려 쌓이는 판
//  - 새로운 · 인기 · 내 아이
//  - 크게 보기: 아이 이름표(누르면 아이 카드) · 한 줄 자랑 · 하트 · 공유 · 링크 · ⋯(신고·지우기), 옆으로 넘기기
//  - 공유 링크: 사이트 주소#p=<사진 id> → 이 사진이 크게 열린다
const Gallery = (() => {
  const $g = id => document.getElementById(id);
  const API = () => window.VILLAGE_API || '';
  const state = { on: false, tab: 'new', photos: [], best: [], from: 'start', more: true, loading: false, open: null, list: [] };
  const src = p => API() + p.url;
  // 사진마다 기울기·테이프 색이 늘 같게 (id로 정한다)
  const TAPE = ['rgba(247, 217, 139, .85)', 'rgba(246, 169, 186, .8)', 'rgba(191, 227, 242, .85)', 'rgba(207, 231, 180, .85)'];
  const seed = id => { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"/></svg>';
  function when(at) {
    const d = new Date(at), now = new Date();
    const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    return days <= 0 ? '오늘' : days === 1 ? '어제' : days < 7 ? `${days}일 전` : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  async function load(reset) {
    if (state.loading) return;
    state.loading = true;
    if (reset) { state.photos = []; state.more = true; }
    try {
      let list;
      if (state.tab === 'mine') list = (await api('/me/photos')).photos;
      else {
        const q = state.tab === 'top' ? `sort=top&offset=${state.photos.length}` : `sort=new${state.photos.length ? `&before=${state.photos[state.photos.length - 1].at}` : ''}`;
        list = (await api(`/photos?${q}&limit=24`)).photos;
      }
      state.photos.push(...list);
      state.more = state.tab !== 'mine' && list.length >= 24;
      // 이번 주 인기: 새로운 순 첫 화면에서만
      if (reset && state.tab === 'new') state.best = (await api('/photos?sort=week&limit=3').catch(() => ({ photos: [] }))).photos || [];
    } catch (e) {
      $g('galleryMsg').textContent = e.status === 401 ? '아이를 만들면 내 아이 사진을 볼 수 있어요.' : '사진을 받지 못했어요.';
    }
    state.loading = false;
    paint();
  }
  function heart(p, onDone) {
    const b = el('button', { type: 'button', className: `gheart${p.liked ? ' on' : ''}` });
    b.innerHTML = `${HEART}<span>${p.likes}</span>`;
    b.setAttribute('aria-pressed', String(!!p.liked));
    b.setAttribute('aria-label', `좋아요 ${p.likes}개`);
    b.onclick = async ev => {
      ev.stopPropagation();
      try {
        const r = await api(`/photos/${p.id}/like`, { method: 'POST' });
        Object.assign(p, { liked: r.liked, likes: r.likes });
        for (const x of [...state.photos, ...state.best]) if (x.id === p.id && x !== p) Object.assign(x, { liked: r.liked, likes: r.likes });
        onDone();
        if (r.liked) document.querySelectorAll(`.gheart[data-id="${p.id}"]`).forEach(h => { h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop'); });
      } catch (e) {
        const msg = e.status === 401 ? '아이를 만들면 좋아요를 누를 수 있어요.' : e.message;
        if (state.open) $g('gvMsg').textContent = msg; else $g('galleryMsg').textContent = msg;
      }
    };
    b.dataset.id = p.id;
    return b;
  }
  // 폴라로이드 한 장
  function pin(p, list, medal) {
    const h = seed(p.id);
    const card = el('figure', { className: 'pin' },
      el('img', { src: src(p), alt: p.caption || `${p.kid}의 사진`, loading: 'lazy' }),
      ...(p.caption ? [el('p', { textContent: p.caption })] : []),
      el('div', { className: 'meta' }, el('b', { textContent: p.kid }), heart(p, paint)));
    if (medal) card.prepend(el('span', { className: `medal m${medal}`, textContent: medal }));
    card.style.setProperty('--r', `${((h % 9) - 4) * 0.55}deg`);
    card.style.setProperty('--tr', `${(h % 2 ? 1 : -1) * (2 + (h % 3))}deg`);
    card.style.setProperty('--tape', TAPE[h % TAPE.length]);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${p.kid}의 사진 크게 보기`);
    card.onclick = () => openPhoto(p, list);
    card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPhoto(p, list); } };
    return card;
  }
  function paint() {
    for (const b of $g('galleryTabs').children) b.setAttribute('aria-pressed', String(b.dataset.tab === state.tab));
    const showBest = state.tab === 'new' && state.best.length > 0;
    $g('galleryBestWrap').hidden = !showBest;
    if (showBest) $g('galleryBest').replaceChildren(...state.best.map((p, i) => pin(p, state.best, i + 1)));
    const grid = $g('galleryGrid');
    if (!state.photos.length && !state.loading) {
      grid.replaceChildren(el('p', { className: 'gempty', textContent: state.tab === 'mine' ? '아직 붙인 사진이 없어요. 포토존에서 찍어 자랑해 보세요!' : '아직 붙은 사진이 없어요. 첫 사진을 붙여 보세요!' }));
    } else grid.replaceChildren(...state.photos.map(p => pin(p, state.photos)));
    $g('galleryMore').hidden = !state.more || state.loading;
    if (state.open) drawOpen();
  }

  /* ---------- 크게 보기 ---------- */
  const portraits = new Map();
  function openPhoto(p, list) {
    state.open = p;
    state.list = list && list.includes(p) ? list : [p];
    $g('galleryView').hidden = false;
    $g('gvMenu').hidden = true;
    $g('gvMore').setAttribute('aria-expanded', 'false');
    $g('gvMsg').textContent = '';
    resetSure();
    drawOpen();
    if (location.hash !== `#p=${p.id}`) history.replaceState(null, '', `#p=${p.id}`);
  }
  function drawOpen() {
    const p = state.open;
    if (!p) return;
    $g('gvImg').src = src(p);
    $g('gvImg').alt = p.caption || `${p.kid}의 사진`;
    $g('gvKid').textContent = p.kid;
    $g('gvWhen').textContent = `${when(p.at)} · ${p.kind === 'four' ? '인생네컷' : '한 장'}`;
    $g('gvCaption').textContent = p.caption || '';
    $g('gvHeart').replaceChildren(heart(p, paint));
    $g('gvDelete').hidden = !p.mine;
    $g('gvReport').hidden = p.mine;
    const i = state.list.indexOf(p);
    $g('gvPrev').disabled = i <= 0;
    $g('gvNext').disabled = i < 0 || i >= state.list.length - 1;
    // 아이 얼굴 동그라미 (아이 카드와 같은 그림)
    const av = $g('gvAv');
    av.style.backgroundImage = '';
    if (p.look && typeof kidPortrait === 'function') {
      const key = p.kidId || p.kid;
      if (!portraits.has(key)) portraits.set(key, kidPortrait(p.look).catch(() => null));
      portraits.get(key).then(url => { if (url && state.open === p) av.style.backgroundImage = `url(${url})`; });
    }
    $g('gvWho').disabled = !p.kidId || typeof Plaza === 'undefined' || !Plaza.openCard;
  }
  function step(d) {
    const i = state.list.indexOf(state.open);
    const n = state.list[i + d];
    if (n) openPhoto(n, state.list);
  }
  function resetSure() {
    $g('gvReport').dataset.sure = ''; $g('gvReport').textContent = '신고';
    $g('gvDelete').dataset.sure = ''; $g('gvDelete').textContent = '지우기';
  }
  function closePhoto() {
    $g('galleryView').hidden = true;
    state.open = null;
    if (location.hash.startsWith('#p=')) history.replaceState(null, '', location.pathname + location.search);
  }
  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    $g('gvClose').onclick = closePhoto;
    $g('gvPrev').onclick = () => step(-1);
    $g('gvNext').onclick = () => step(1);
    $g('galleryView').addEventListener('click', e => { if (e.target === $g('gvStage')) closePhoto(); });
    window.addEventListener('keydown', e => {
      if (!state.open) return;
      if (e.key === 'Escape') closePhoto();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
    // 옆으로 밀어 넘기기
    let sx = null;
    $g('gvStage').addEventListener('pointerdown', e => { sx = e.clientX; });
    $g('gvStage').addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 50) step(e.clientX < sx ? 1 : -1); sx = null; });
    $g('gvWho').onclick = () => { const p = state.open; if (p && p.kidId && Plaza.openCard) Plaza.openCard({ id: p.kidId, name: p.kid, mbti: p.mbti, look: p.look }); };
    $g('gvMore').onclick = () => { const open = $g('gvMenu').hidden; $g('gvMenu').hidden = !open; $g('gvMore').setAttribute('aria-expanded', String(open)); };
    $g('gvShare').onclick = async () => {
      const p = state.open;
      try {
        const blob = await (await fetch(src(p))).blob();
        const r = await shareImage(blob, `먼작귀빌리지-${p.kid}.jpg`, `${p.kid}의 자랑 · 먼작귀 빌리지 ${location.origin}/#p=${p.id}`);
        if (r === 'saved') $g('gvMsg').textContent = '사진을 저장했어요.';
      } catch (e) { $g('gvMsg').textContent = '사진을 보내지 못했어요.'; }
    };
    $g('gvLink').onclick = async () => {
      const link = `${location.origin}${location.pathname}#p=${state.open.id}`;
      try { await navigator.clipboard.writeText(link); $g('gvMsg').textContent = '링크를 복사했어요.'; } catch (e) { $g('gvMsg').textContent = link; }
    };
    $g('gvReport').onclick = async () => {
      const b = $g('gvReport');
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '정말 신고할까요?'; return; }
      try { await api(`/photos/${state.open.id}/report`, { method: 'POST' }); $g('gvMsg').textContent = '신고했어요. 고마워요.'; } catch (e) { $g('gvMsg').textContent = e.status === 401 ? '아이를 만들면 신고할 수 있어요.' : e.message; }
      resetSure();
    };
    $g('gvDelete').onclick = async () => {
      const b = $g('gvDelete');
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = '정말 지울까요?'; return; }
      const p = state.open;
      try {
        await api(`/photos/${p.id}`, { method: 'DELETE' });
        state.photos = state.photos.filter(x => x.id !== p.id);
        state.best = state.best.filter(x => x.id !== p.id);
        closePhoto();
        paint();
      } catch (e) { $g('gvMsg').textContent = e.message; }
      resetSure();
    };
  }

  /* ---------- 들어가기 ---------- */
  async function enter({ from = 'start', open = null } = {}) {
    state.from = from;
    showOnly('gallery');
    state.on = true;
    wire();
    $g('galleryMsg').textContent = '';
    $g('galleryTabs').querySelector('[data-tab=mine]').hidden = from === 'start';
    for (const b of $g('galleryTabs').children) b.onclick = () => { state.tab = b.dataset.tab; $g('galleryMsg').textContent = ''; $g('gallery').scrollTop = 0; load(true); };
    $g('galleryMore').onclick = () => load(false);
    $g('galleryBack').onclick = () => { closePhoto(); state.on = false; (from === 'room' ? enterHome() : enterStart()).catch(e => { $('error').textContent = e.message; }); };
    state.tab = 'new';
    $g('gallery').scrollTop = 0;
    await load(true);
    if (open) {
      const p = state.photos.find(x => x.id === open) || await api(`/photos/${open}`).catch(() => null);
      if (p) openPhoto(p, state.photos.includes(p) ? state.photos : [p]);
      else $g('galleryMsg').textContent = '그 사진은 지금 볼 수 없어요.';
    }
  }
  // 아이 카드에서 사진을 누르면 그 사진으로
  function show(p) { openPhoto(state.photos.find(x => x.id === p.id) || p, state.photos.some(x => x.id === p.id) ? state.photos : [p]); }
  return { enter, show, state, get on() { return state.on && !$g('gallery').hidden; } };
})();
