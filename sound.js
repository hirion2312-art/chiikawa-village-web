'use strict';
// 먼작귀 빌리지 선공개 — 배경 음악과 효과음 (2026-11-18 이재헌님)
//  - 배경 음악: 이재헌님이 준 두 곡(audio/bgm1.mp3 · bgm2.mp3)을 번갈아 이어서 튼다. 브라우저 규칙상 처음 누를 때부터 나온다
//  - 효과음: 누르기 '톡', 글쇠 '틱', 아무렇게나 꾸미기 '샤락', 사진 '찰칵', 하트 '뽁' (sound-data.js, 멜로디 있는 띠리링 없음)
//  - 소리 끄기: 첫 화면 언어 단추 옆과 「더보기」 안. 이 기기에 기억한다
const Sound = (() => {
  const KEY = 'mogukawa-sound-off';
  let off = false;
  try { off = localStorage.getItem(KEY) === '1'; } catch (e) { /* 저장이 막힌 브라우저 */ }
  const BGM_VOL = 0.34, SFX_VOL = 0.75;
  const TRACKS = ['audio/bgm1.mp3', 'audio/bgm2.mp3'];
  let ac = null, master = null, started = false, track = 0, bgm = null;
  const buffers = {};

  function ctx() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = off ? 0 : SFX_VOL;
    master.connect(ac.destination);
    for (const [name, url] of Object.entries(window.SFX_DATA || {})) {
      fetch(url).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b)).then(buf => { buffers[name] = buf; }).catch(() => {});
    }
    return ac;
  }
  function play(name, { rate = 1, gain = 1 } = {}) {
    if (off || !ac || !buffers[name]) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const s = ac.createBufferSource();
    s.buffer = buffers[name];
    s.playbackRate.value = rate;
    const g = ac.createGain();
    g.gain.value = gain;
    s.connect(g).connect(master);
    s.start();
  }

  /* ---------- 배경 음악: 두 곡을 번갈아 ---------- */
  function startBgm() {
    if (bgm) return;
    bgm = new Audio(TRACKS[track]);
    bgm.preload = 'auto';
    bgm.volume = BGM_VOL;
    bgm.addEventListener('ended', () => {
      track = (track + 1) % TRACKS.length;
      bgm.src = TRACKS[track];
      if (!off) bgm.play().catch(() => {});
    });
    if (!off) bgm.play().catch(() => {});
  }
  // 화면을 내리거나 다른 앱으로 가면 음악을 멈추고, 돌아오면 이어서
  document.addEventListener('visibilitychange', () => {
    if (!bgm || off) return;
    if (document.hidden) bgm.pause(); else bgm.play().catch(() => {});
  });

  // 처음 누를 때 소리를 연다 (브라우저는 사용자가 누르기 전 소리를 막는다)
  function unlock() {
    if (started) return;
    started = true;
    ctx();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    startBgm();
  }
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  /* ---------- 효과음 연결: 화면의 단추를 누를 때 ---------- */
  const QUIET = '#soundBtn, #photoShot';           // 자기 소리가 따로 있는 단추
  let tapAlt = 0;
  document.addEventListener('click', e => {
    const b = e.target.closest('button, [role=button], .thumb, .swatch, label.pick, summary');
    if (!b || b.disabled || b.matches(QUIET)) return;
    if (b.id === 'randomBtn') return play('random');
    if (b.matches('.gheart, #gvHeart button, #gvHeart')) return play('heart');
    // 같은 소리가 너무 똑같지 않게 높이를 아주 조금씩 바꾼다
    tapAlt = (tapAlt + 1) % 5;
    play(tapAlt === 4 ? 'tap2' : 'tap', { rate: 0.97 + Math.random() * 0.06 });
  }, true);
  // 글자를 칠 때 가벼운 '틱'
  let keyN = 0, lastKey = 0;
  document.addEventListener('input', e => {
    const t = e.target;
    if (!t.matches || !t.matches('input[type=text], input:not([type]), textarea')) return;
    const now = performance.now();
    if (now - lastKey < 45) return;
    lastKey = now;
    play('key' + (keyN++ % 4), { gain: 0.9 });
  }, true);

  /* ---------- 소리 켜고 끄기 ---------- */
  const ICON_ON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  function setOff(v) {
    off = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* 저장이 막힌 브라우저 */ }
    if (master) master.gain.value = off ? 0 : SFX_VOL;
    if (bgm) { if (off) bgm.pause(); else bgm.play().catch(() => {}); } else if (!off && started) startBgm();
    paint();
  }
  const label = () => (off ? (window.T ? T('소리 켜기') : '소리 켜기') : (window.T ? T('소리 끄기') : '소리 끄기'));
  function paint() {
    const b = document.getElementById('soundBtn');
    if (b) { b.innerHTML = off ? ICON_OFF : ICON_ON; b.setAttribute('aria-label', label()); b.setAttribute('aria-pressed', String(!off)); b.title = label(); }
    const r = document.getElementById('roomSound');
    if (r) r.textContent = label();
  }
  function addButtons() {
    // 첫 화면: 언어 단추 줄 끝에
    const lang = document.getElementById('langPick');
    if (lang && !document.getElementById('soundBtn')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'soundBtn';
      b.className = 'sound-btn';
      b.onclick = () => { unlock(); setOff(!off); };
      lang.append(b);
    }
    // 더보기 안
    const btns = document.querySelector('#room .btns');
    if (btns && !document.getElementById('roomSound')) {
      const r = document.createElement('button');
      r.type = 'button';
      r.id = 'roomSound';
      r.className = 'btn sub';
      r.onclick = () => { unlock(); setOff(!off); };
      btns.append(r);
    }
    paint();
  }
  const css = document.createElement('style');
  css.textContent = `#langPick .sound-btn { display: inline-flex; align-items: center; justify-content: center; padding: 5px 10px; margin-left: 2px; border-left: 1.5px solid var(--line, #e2d5c4); border-radius: 0 999px 999px 0; }`;
  document.head.append(css);
  // 언어 단추는 i18n.js가 문서가 다 읽힌 뒤 붙이므로 그다음에
  const later = () => setTimeout(addButtons, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();

  return { play, setOff, get off() { return off; } };
})();
