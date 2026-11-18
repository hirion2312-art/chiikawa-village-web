'use strict';
// 먼작귀 빌리지 — 로그인 (어촌생활 웹판처럼 Firebase Auth: 게스트로 바로 시작, 구글 계정을 이으면 다른 기기에서도 내 아이)
// window.FIREBASE_CONFIG가 없으면(로컬 시험) 예전처럼 이 서버가 준 토큰을 브라우저에 둔다.
(function () {
  const TOKEN_KEY = 'mogukawa-village-token';
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const cfg = window.FIREBASE_CONFIG;
  const local = () => { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };
  let idToken = null;
  let user = null;
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.head.appendChild(s); });

  const A = {
    firebase: !!cfg,
    current: () => (cfg ? idToken : local()),
    user: () => user,
    ready: Promise.resolve(),
    // 게스트를 구글 계정에 잇는다 (같은 아이 유지). 이미 그 구글 계정에 아이가 있으면 그 계정으로 들어간다
    async google() {
      if (!cfg) return;
      const auth = firebase.auth();
      const p = new firebase.auth.GoogleAuthProvider();
      try {
        if (auth.currentUser && auth.currentUser.isAnonymous) await auth.currentUser.linkWithPopup(p);
        else await auth.signInWithPopup(p);
      } catch (e) {
        if (e && e.code === 'auth/credential-already-in-use') await auth.signInWithCredential(e.credential);
        else throw e;
      }
      idToken = await auth.currentUser.getIdToken(true);
      location.reload();
    },
    async logout() { if (cfg) { await firebase.auth().signOut(); location.reload(); } },
  };
  if (cfg) {
    A.ready = (async () => {
      await load(SDK + 'firebase-app-compat.js');
      await load(SDK + 'firebase-auth-compat.js');
      firebase.initializeApp(cfg);
      const auth = firebase.auth();
      await new Promise(ok => {
        const off = auth.onAuthStateChanged(u => { off(); ok(u); });
      });
      if (!auth.currentUser) await auth.signInAnonymously();
      user = auth.currentUser;
      idToken = await user.getIdToken();
      // 토큰은 한 시간마다 바뀐다
      auth.onIdTokenChanged(async u => { user = u; idToken = u ? await u.getIdToken() : null; });
    })().catch(e => { console.error('[로그인]', e); });
  }
  window.VillageAuth = A;
}());
