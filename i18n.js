/* 번역판 (2026-11-18): 한국어 원문을 그대로 두고, 화면에 나온 글자를 영어·일본어로 바꿔 끼운다.
   - 언어: 고른 적이 있으면 그 언어, 아니면 브라우저 언어 (ko → 한국어, ja → 일본어, 그 밖 → 영어)
   - 사전: i18n-en.js / i18n-ja.js (한국어 원문 → 번역). 숫자·이름이 섞인 문장은 아래 PATTERNS
   - 바꾸는 곳: 글자 마디, title·placeholder·aria-label·alt, 캔버스 fillText(사진 띠), confirm·alert
   - 첫 화면 아래에 언어 단추 (한국어 / English / 日本語) */
(function () {
  const KEY = 'village-lang';
  const LANGS = [['ko', '한국어'], ['en', 'English'], ['ja', '日本語']];
  const pick = () => {
    try { const s = localStorage.getItem(KEY); if (LANGS.some(l => l[0] === s)) return s; } catch (e) { /* 저장소 막힘 */ }
    const n = String((navigator.languages && navigator.languages[0]) || navigator.language || 'ko').toLowerCase();
    return n.startsWith('ko') ? 'ko' : n.startsWith('ja') ? 'ja' : 'en';
  };
  const lang = pick();
  window.LANG = lang;
  document.documentElement.lang = lang;

  const setLang = l => {
    try { localStorage.setItem(KEY, l); } catch (e) { /* 저장소 막힘 */ }
    location.reload();
  };
  // 첫 화면 아래 언어 단추
  const addPicker = () => {
    const start = document.getElementById('start');
    if (!start || document.getElementById('langPick')) return;
    const box = document.createElement('div');
    box.id = 'langPick';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Language');
    for (const [id, name] of LANGS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.lang = id;
      b.setAttribute('aria-pressed', String(id === lang));
      b.onclick = () => { if (id !== lang) setLang(id); };
      box.append(b);
    }
    start.append(box);
  };
  const css = document.createElement('style');
  css.textContent = `
    #langPick { display: flex; justify-content: center; gap: 4px; margin: 0 auto; padding: 3px; border-radius: 999px; background: rgba(255, 250, 241, .92); border: 1.5px solid var(--line, #e2d5c4); width: max-content; }
    #langPick button { border: 0; background: none; padding: 5px 12px; border-radius: 999px; font-size: 13px; color: var(--quiet-2, #6b5449); }
    #langPick button[aria-pressed="true"] { background: var(--ink, #4a3230); color: var(--paper, #fffaf1); font-weight: 700; }
    html[lang="ja"] { --f-head: "Kiwi Maru", "Jua", sans-serif; --f-body: "Zen Maru Gothic", "Gowun Dodum", sans-serif; }`;
  document.head.append(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addPicker); else addPicker();

  if (lang === 'ko') { window.T = s => s; return; }

  if (lang === 'ja') {
    const f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Kiwi+Maru:wght@400;500&family=Zen+Maru+Gothic:wght@500;700&display=swap';
    document.head.append(f);
  }
  // 사전은 바로 읽는다 (화면이 한국어로 번쩍 보이지 않게)
  document.write('<script src="i18n-' + lang + '.js"><\/script>');

  const HANGUL = /[가-힣]/;
  const EN = lang === 'en';
  // 숫자·이름이 섞인 문장. $1… 자리는 다시 번역한다 (원작 이름·꾸미기 이름)
  const PATTERNS = [
    [/^(.+?) 외에게서$/, EN ? 'from $1 & more' : '$1ほかから'],
    [/^(.+?)에게서$/, EN ? 'from $1' : '$1から'],
    [/^(.+) 직접 고르기$/, EN ? 'Custom $1' : '$1を自分で選ぶ'],
    [/^(.+) 표정의 (.+)$/, EN ? '$2 ($1 face)' : '$1の表情の$2'],
    [/^벌써 ([\d,]+)명의 아이가 입주를 기다려요$/, EN ? '$1 kids are already waiting to move in' : 'もう$1人の子が引っ越しを待っているよ'],
    [/^지금 주민 ([\d,]+)명이 살고 있어요$/, EN ? '$1 residents live here now' : 'いま$1人の住人が暮らしているよ'],
    [/^([\d,]+)원$/, EN ? '$1 won' : '$1ウォン'],
    [/^(\d+)개$/, EN ? '$1' : '$1件'],
    [/^(\d+)일째 (.*)$/, EN ? 'Day $1 $2' : '$1日目 $2'],
    [/^없는 동안 (\d+)가지 일$/, EN ? '$1 things happened while you were away' : 'いない間に$1つのできごと'],
    [/^(.+)의 아이 열쇠$/, EN ? "$1's kid key" : '$1の子のカギ'],
    [/^(.+), 반가워요!$/, EN ? 'Nice to meet you, $1!' : '$1、はじめまして！'],
    [/^아이는 어떻게 행동하나요\? \((\d+)\/(\d+)\)$/, EN ? 'What would your kid do? ($1/$2)' : 'この子ならどうする？（$1/$2）'],
    [/^(.+)의 모습$/, EN ? "$1's look" : '$1のすがた'],
    [/^(\d+)\/3명$/, EN ? '$1/3' : '$1/3人'],
    [/^배경색 (.+)$/, EN ? 'Background $1' : '背景色 $1'],
    [/^인생네컷 (\d) \/ 4$/, EN ? '4-cut strip $1 / 4' : '4コマ写真 $1 / 4'],
    [/^친구 (\d+)\/(\d+)$/, EN ? 'Friends $1/$2' : 'ともだち $1/$2'],
    [/^(.+)의 표정 · 무대에서 다른 아이를 누르면 바꿔요$/, EN ? "$1's expression · tap another kid on stage to switch" : '$1の表情・ステージの別の子をタップで切りかえ'],
    [/^(\d+)번째 컷 · 3초 뒤$/, EN ? 'Shot $1 · in 3 s' : '$1コマ目・3秒後'],
    [/^(\d+)번째 컷$/, EN ? 'Shot $1' : '$1コマ目'],
    [/^(.+) 띠$/, EN ? '$1 frame' : '$1のフチ'],
    [/^(\d+)일 전$/, EN ? '$1 days ago' : '$1日前'],
    [/^(\d+)월 (\d+)일$/, EN ? '$1/$2' : '$1月$2日'],
    [/^좋아요 (\d+)개$/, EN ? '$1 likes' : 'いいね $1'],
    [/^(.+)의 사진 크게 보기$/, EN ? "View $1's photo large" : '$1の写真を大きく見る'],
    [/^(.+)의 사진$/, EN ? "$1's photo" : '$1の写真'],
    [/^(.+) 가는 중$/, EN ? 'Heading $1' : '$1向かっているよ'],
    [/^(.+)와 먼작귀 빌리지에서 찍었어요 #먼작귀빌리지$/, EN ? 'Took this with $1 in Chiikawa Village #ChiikawaVillage' : '$1とちいかわビレッジで撮ったよ #ちいかわビレッジ'],
    [/^(.+)의 자랑 · 먼작귀 빌리지 (\S+)$/, EN ? "$1's photo · Chiikawa Village $2" : '$1の自慢・ちいかわビレッジ $2'],
    [/^한 계정에 아이는 (\d+)명까지예요\.$/, EN ? 'Up to $1 kids per account.' : '子は1アカウント$1人までだよ。'],
    [/^(오전|오후) (\d+):(\d\d)( · 밤)?$/, m => EN ? `${m[2]}:${m[3]} ${m[1] === '오전' ? 'AM' : 'PM'}${m[4] ? ' · night' : ''}` : `${m[1] === '오전' ? '午前' : '午後'}${m[2]}:${m[3]}${m[4] ? '・夜' : ''}`],
  ];

  const cache = new Map();
  const core = key => {
    const D = window.I18N_DICT || {};
    if (D[key] != null) return D[key];
    for (const [re, rep] of PATTERNS) {
      const m = key.match(re);
      if (!m) continue;
      return typeof rep === 'function' ? rep(m) : rep.replace(/\$(\d)/g, (_, i) => T(m[i] || ''));
    }
    // 「오늘 · 인생네컷」처럼 가운뎃점으로 이은 글: 조각마다
    for (const sep of [' · ', '·']) {
      if (key.includes(sep)) {
        const parts = key.split(sep), out = parts.map(T);
        if (out.some((p, i) => p !== parts[i])) return out.join(sep === '·' ? '·' : ' · ');
      }
    }
    // 「기본 2」「동그란 눈 (43)」「몸 색 #fff」「1. 질문」처럼 앞뒤에 번호·색이 붙은 글
    const n = key.match(/^(.+) (\d+|\(\d+\)|#[0-9a-fA-F]{3,8})$/);
    if (n) { const b = T(n[1]); if (b !== n[1]) return b + ' ' + n[2]; }
    const q = key.match(/^(\d+\. )(.+)$/);
    if (q) { const b = T(q[2]); if (b !== q[2]) return q[1] + b; }
    return null;
  };
  function T(s) {
    if (!s || typeof s !== 'string' || !HANGUL.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    const key = s.trim().replace(/\s+/g, ' ');
    const hit = core(key);
    const out = hit == null ? s : lead + hit + tail;
    if (cache.size > 5000) cache.clear();
    cache.set(s, out);
    return out;
  }
  window.T = T;

  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
  const doText = n => {
    const p = n.parentNode;
    if (p && (SKIP.has(p.nodeName) || (p.closest && p.closest('[translate="no"]')))) return;
    const v = n.nodeValue, t = T(v);
    if (t !== v) n.nodeValue = t;
  };
  const doAttrs = e => {
    for (const a of ATTRS) {
      const v = e.getAttribute(a);
      if (v && HANGUL.test(v)) { const t = T(v); if (t !== v) e.setAttribute(a, t); }
    }
  };
  const walk = root => {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 || SKIP.has(root.nodeName)) return;
    doAttrs(root);
    const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = it.nextNode(); n; n = it.nextNode()) {
      if (n.nodeType === 3) doText(n);
      else if (!SKIP.has(n.nodeName)) doAttrs(n);
    }
  };
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener('DOMContentLoaded', () => walk(document.documentElement));

  // 사진 띠·열쇠 그림처럼 캔버스에 쓰는 글
  const C2D = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C2D) for (const k of ['fillText', 'strokeText', 'measureText']) {
    const f = C2D[k];
    C2D[k] = function (text, ...rest) { return f.call(this, typeof text === 'string' ? T(text) : text, ...rest); };
  }
  for (const k of ['confirm', 'alert', 'prompt']) {
    const f = window[k];
    if (typeof f === 'function') window[k] = (msg, ...rest) => f.call(window, T(String(msg == null ? '' : msg)), ...rest);
  }
  if (navigator.share) {
    const share = navigator.share.bind(navigator);
    navigator.share = d => share(d && d.text ? { ...d, text: T(d.text), title: T(d.title) } : d);
  }
})();
