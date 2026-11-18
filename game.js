'use strict';

// 치이카와 심즈 — 게임 화면. 월드·캐릭터를 그리고, village-sim.js의 상태를 보여 준다
// 장소를 누르면 그 오브젝트로 할 수 있는 일(효과·시간·돈)이 나오고, 고른 캐릭터에게 시킬 수 있다

// 이 클립을 하는 동안은 눈을 감는다 (우사기 지시 025)
const SLEEP_CLIPS = new Set(['sleep_breathe', 'hammock_sway', 'sleep_roll', 'nap_down']);

const { Village, NEEDS } = window.Village;
const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids.filter(k => k !== null && k !== undefined));
  return n;
};
const NEED_LABEL = Object.fromEntries(NEEDS.map(([k, label]) => [k, label]));
const NEED_COLOR = Object.fromEntries(NEEDS.map(([k, , color]) => [k, color]));

/* ---------- 3D 무대 ---------- */

const canvas = $('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfeaf4);
scene.fog = new THREE.Fog(0xe4f2ee, 140, 380);
const camera = new THREE.PerspectiveCamera(46, 1, 0.2, 1500);
scene.add(new THREE.HemisphereLight(0xffffff, 0xfff0d8, 2.35));
const sun = new THREE.DirectionalLight(0xfff8ec, 1.05);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 200 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);
function fit() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', fit);
fit();

const world = buildWorld(scene, renderer);
// 길 지도(접촉 규칙 R1)는 GLB가 다 얹힌 뒤의 실제 지오메트리로 만든다. 그때까지 마을은 시작하지 않는다
(async () => {
const loadingText = $('loading');
if (loadingText) loadingText.textContent = '마을을 짓는 중…';
await (window.GLB_DONE || Promise.resolve());
if (loadingText) loadingText.textContent = '길 지도를 만드는 중…';
await new Promise(r => setTimeout(r, 30));
Interiors.mountAll(world, scene);
const rackBoards = Labor.buildRack(world, scene) || [];
MapElements.buildLinks(world, scene);
Interiors.beforeNav();
// 맨땅이던 장소에 소품을 놓는다 (길 지도에 들어가야 몸이 통과하지 않는다)
WeedingField.build(scene, world);
WildZones.build(scene, world);
TrainingGround.build(scene, world);
MapDressing.apply(scene, world);
FootStools.apply(scene, world);
const nav = VillageNav.build(scene, world);
Interiors.afterNav();
const home = world.places.find(p => p.id === 'plaza') || world.places[0];
// 인어섬으로 가는 배는 다니지 않는다
nav.flood(home.x, home.z, (world.portals || []).filter(p => !/배 타고/.test(p.label)));
// 엑스트라 수: 주인공과 같은 방식으로 스스로 사는 회색 주민 (조종 불가)
const EXTRAS = 16;
const sim = new Village(world, { nav, extras: EXTRAS });
MapElements.init(sim, world);
SceneActs.install(nav, world);
MinorActs.apply(sim);
PropModels.apply(sim);
SceneClips.apply(sim);
SetClips.apply(sim);
RakkoCar.install(sim, world, scene);
YoroiKnights.init(scene, world, sim);
console.log('[nav]', JSON.stringify({ ...nav.stats, reach: nav.reachCount, links: nav.links.map(l => l.label), dropped: sim.report.dropped, unreachable: sim.report.unreachable.length }));
try {
  const saved = localStorage.getItem('chiikawa-sims-save');
  if (saved) sim.load(saved);
} catch (e) { /* 저장이 없거나 막혀 있으면 새로 시작 */ }

/* ---------- 캐릭터 ---------- */

const hash = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return h >>> 0; };
const IDLE_CLIPS = ['idle_breathe', 'idle_look', 'idle_fidget', 'idle_hum', 'idle_step', 'idle_stretch'].filter(id => ANIMS[id]);
// 쉴 때 캐릭터마다 자기 버릇이 가끔 나온다
const idleClipFor = (c, slot) => {
  const habit = window.HABITS && window.HABITS[c.id];
  if (habit && ANIMS[habit] && (hash(c.id) + slot) % 3 === 0) return habit;
  return IDLE_CLIPS[(hash(c.id) + slot) % IDLE_CLIPS.length];
};
function createActor(c) {
  // 엑스트라: 이목구비 없는 전신 회색. 회색 농도와 몸집만 조금씩 다르다
  const GREYS = ['#c9c6c2', '#bdbab6', '#d3d0cc', '#b3b0ac'];
  // 괴물: 원작 키메라 생김새 (chimera-models.js). 없으면 예전 괴물
  const preset = c.monster
    ? (window.ChimeraModels ? ChimeraModels.presetFor(c) : { ...presetFromLook({ skin: window.BigChimera ? BigChimera.skinOf(c) : '#7a6890', ears: 'cat', body: 'round' }), faceless: true, monsterFace: true })
    : c.troupe ? { ...characterEntry(c.id).preset } : c.extra
    ? { ...presetFromLook({ skin: c.scar ? '#8d8a86' : c.strong ? '#9b9894' : GREYS[hash(c.id) % GREYS.length], body: c.strong ? 'round' : ['slim', 'normal', 'round'][hash(c.id + 'b') % 3] }), faceless: true, scar: !!c.scar }
    : { ...characterEntry(c.id).preset };
  // 강한 엑스트라는 몸집이 더 크다
  if (c.strong) preset.scale *= c.scar ? 1.18 : 1.12;
  if (c.monster) preset.scale *= 1.4;
  const built = buildCharacter(preset, { faceWidth: c.scar || c.monster || c.troupe ? 512 : c.extra ? 64 : 512 });
  const a = { c, built, preset, offset: hash(c.id) % 10, phase: 0, prop: null, propKey: null, bubble: null, bubbleText: null };
  a.height = (preset.footT + 0.3) * preset.scale;
  a.base = { position: built.model.position.clone(), rotation: built.model.rotation.clone(), scale: built.model.scale.clone() };
  a.isMonster = !!c.monster;
  a.faces = c.extra && !c.troupe ? new Set() : new Set(expressionsFor(c.id).map(e => e.id));
  // 엑스트라는 이름표가 없다
  a.tag = c.extra && !c.troupe ? new THREE.Object3D() : makeNameTag(c.name);
  a.tag.position.y = a.height + 0.45;
  built.root.add(a.tag);
  scene.add(built.root);
  // 손 소품을 놓을 방향은 쉬는 자세에서 한 번 정한다
  built.root.updateMatrixWorld(true);
  a.dirs = [0, 1].map(h => VillageProps.outward(built, VillageProps.handFrame(built, h, preset).aim, h));
  return a;
}
const actors = sim.chars.map(createActor);
// 엑스트라가 괴물이 되거나 새로 태어나면 몸을 다시 만든다
function rebuildActor(a) {
  scene.remove(a.built.root);
  VillageProps.detach(a.prop);
  dropClipProps(a);
  if (focus && focus.id === a.c.id) clearFocus();
  haloCache.delete(`char:${a.c.id}`);
  haloCache.delete(`self:${a.c.id}`);
  const fresh = createActor(a.c);
  for (const k of Object.keys(a)) delete a[k];
  Object.assign(a, fresh);
}

// 클립의 표정 키(치이카와 기준 이름)를 그 캐릭터에 있는 표정으로만 바꾼다
// 앉는 자리의 좌면 종류 (애니메이션 규칙 A3, anim-rig.js SEAT_SPECS). 눕는 자리·서는 자리는 null
function seatTypeOf(socket) {
  if (!socket || FootStools.has(socket)) return null;
  const n = socket.name || '';
  if (/lie|hammock|sleep/.test(n)) return null;
  if (/soak|bath/.test(n)) return 'water';
  if (!(socket.seatIn || /_sit|sit_/.test(n))) return null;
  if ((socket.h || 0) < 0.12) return 'floor';
  return /counter_sit|table_sit|desk_sit|work_sit|pc_sit|eat_sit|tea_sit|study_sit/.test(n) ? 'stool' : 'chair';
}
// 클립 한 프레임 (anim-rig.js: 그립 팔·어깨 채널 포함). 앉은 정도 a.seatAmt만큼 앉은 자세 바탕을 깐다
// 걷기 클립 한 주기에 몸이 나가야 하는 거리 (월드 단위). 클립의 발 앞뒤 폭 × 2 × 모델 크기
const strideCache = new Map();
function strideOf(a, clipId) {
  const key = `${clipId}|${a.c.id}`;
  if (strideCache.has(key)) return strideCache.get(key);
  const tr = ANIMS[clipId] && ANIMS[clipId].tracks && ANIMS[clipId].tracks.footLZ;
  const range = tr ? Math.max(...tr.map(k => k[1])) - Math.min(...tr.map(k => k[1])) : 0.4;
  const sc = a.built.model.getWorldScale(new THREE.Vector3()).z || 1;
  const v = Math.max(0.3, range * 2 * sc);
  strideCache.set(key, v);
  return v;
}

// once 클립은 단계가 시작할 때 처음부터 재생하고 마지막 자세로 멈춘다
function clipTime(a, clip, t) {
  if (!clip.once) {
    a.onceClip = null;
    return clip.loop ? t : t % (clip.dur + 0.8);
  }
  const now = performance.now() / 1000;
  if (a.onceClip !== clip) {
    a.onceClip = clip;
    a.onceT0 = now;
  }
  return Math.min(now - a.onceT0, clip.dur - 0.001);
}
function applyClip(a, clipId, t) {
  let id = clipId;
  // 앉아 있을 때 쉬는 자세는 squash 없는 앉기 규격으로 (A3)
  if (a.seatAmt > 0 && (id === 'sit_idle' || !ANIMS[id])) id = 'seat_idle';
  const clip = ANIMS[id];
  const local = clipTime(a, clip, t);
  // 앉기 바탕은 아래에서 a.seatAmt로 한 번만 깐다 (클립의 meta.seat까지 더하면 엉덩이가 좌면 속으로 두 번 내려간다)
  // 앉기 바탕은 아래에서 a.seatAmt로 한 번만 깐다 (두 번 깔면 몸이 좌면 속으로 파묻힌다)
  const pose = AnimRig.poseAt(a, clip, local, { noSeat: a.seatAmt > 0 });
  if (a.seatAmt > 0) {
    const u = a.seatAmt * a.seatAmt * (3 - 2 * a.seatAmt);
    AnimRig.seatPose(pose, AnimRig.rigInfo(a.built, a.preset), a.seatType || 'chair', u);
    // 엉덩이가 닿는 박자에만 짧게 눌렸다 돌아온다 (앉는 중, 0.97, A3·A4)
    if (a.seatRising && a.seatAmt > 0.82 && a.seatAmt < 1) pose.squash *= 1 - 0.03 * Math.sin(Math.PI * (a.seatAmt - 0.82) / 0.18);
  }
  // 표정은 drawActor 끝에서 기분과 함께 정한다
  a.clipFace = pose.face || null;
  delete pose.face;
  Polish.blend(a, id, pose);
  AnimRig.applyPose(a, pose);
  syncClipProps(a, id, clip, local, pose);
}

// 클립이 직접 가진 소품(연필·종이 같은 clip.props): 그 클립을 하는 동안만 붙이고, 그립 맞춤 변환까지 적용한다
function syncClipProps(a, id, clip, local, pose) {
  a.clipUsed = true;
  if (a.clipPropsId !== id) {
    dropClipProps(a);
    a.clipPropsId = id;
    // 단계가 손 소품(village-props)을 이미 쥐여 주면 클립 소품은 겹치므로 쓰지 않는다.
    // 탁자 면(surface)은 미리보기용 대역이라 게임에서는 진짜 가구를 쓴다
    const own = (clip.props || []).filter(pr => pr.shape !== 'surface');
    a.clipProps = own.length && !a.c.prop ? animAttachProps(a, { ...clip, props: own }) : null;
  }
  if (a.clipProps) AnimRig.applyProps(a, a.clipProps, clip, local, pose);
}
function dropClipProps(a) {
  if (a.clipProps) animRemoveProps(a.clipProps);
  a.clipProps = null;
  a.clipPropsId = null;
}

function drawActor(a, time, dt) {
  const c = a.c;
  if (a.isMonster !== !!c.monster) rebuildActor(a);
  a.clipUsed = false;
  const root = a.built.root;
  root.visible = !c.hidden;
  if (c.hidden) { a.shownY = undefined; a.dispX = undefined; return; }
  // 표시 위치 = 자리 + 밀어내기 오프셋(R2). 높이 = 밟는 면·좌석 면(R3)
  // 시뮬레이션은 0.05초마다 한 걸음씩 옮기므로, 그 사이를 이어 그려야 뚝뚝 끊기지 않는다. 배·문처럼 순간이동하면 바로 옮긴다
  let px = c.x + (c.ox || 0);
  let pz = c.z + (c.oz || 0);
  if (c.prevX !== undefined && Math.hypot(px - c.prevX, pz - c.prevZ) < 15) {
    const u = simAlpha(performance.now());
    px = c.prevX + (px - c.prevX) * u;
    pz = c.prevZ + (pz - c.prevZ) * u;
  }
  // 프레임이 밀려도 한 번에 건너뛰지 않는다: 보이는 위치는 걷는 속도의 2.2배(뛰기 포함)까지만 따라간다.
  // 배·문처럼 정말 먼 순간이동(걸어서 1초 넘게 걸리는 거리 + 15)만 바로 옮긴다
  const walkPerSec = (window.Village.WALK || 4.2) * Math.max(1, sim.speed);
  let stepDist = 0;
  if (a.dispX === undefined || Math.hypot(px - a.dispX, pz - a.dispZ) > walkPerSec + 15) {
    a.dispX = px;
    a.dispZ = pz;
  } else {
    const gx = px - a.dispX;
    const gz = pz - a.dispZ;
    const gap = Math.hypot(gx, gz);
    const step = walkPerSec * 2.2 * dt + 0.02;
    const k = gap > step ? step / gap : 1;
    a.dispX += gx * k;
    a.dispZ += gz * k;
    stepDist = gap * k;
  }
  px = a.dispX;
  pz = a.dispZ;
  // 턱이나 물건 윗면을 밟을 때 높이가 한 프레임에 튀지 않게 잇는다. 앉는 동작은 자기 곡선이 있고, 문처럼 순간이동하면 바로 옮긴다
  const groundY = world.floorAt(px, pz) + (c.h || 0);
  const moved = a.shownY === undefined || Math.hypot(px - root.position.x, pz - root.position.z) >= 15;
  if (moved || c.seating) a.shownY = groundY;
  else {
    const climb = 5.5 * Math.max(1, sim.speed * 0.5) * dt;
    a.shownY += Math.max(-climb, Math.min(climb, groundY - a.shownY));
  }
  root.position.set(px, a.shownY, pz);
  if (c.id === 'rakko') root.position.y += RakkoCar.draw(a, dt, time);
  // 뒤돌 때도 고개가 한 번에 꺾이지 않게 초당 회전량을 제한한다
  const diff = Math.atan2(Math.sin(c.angle - root.rotation.y), Math.cos(c.angle - root.rotation.y));
  const maxTurn = 9 * Math.max(1, sim.speed * 0.5) * dt;
  root.rotation.y += Math.max(-maxTurn, Math.min(maxTurn, diff * Math.min(1, dt * 8)));
  const speed = c.walking ? 0.8 : 0;
  // 걸음 박자는 실제로 움직인 거리로 진행한다: 한 주기에 몸이 나가는 거리 = 디딘 발이 뒤로 가는 폭의 2배 (발이 미끄러지지 않는다)
  a.phase += speed * dt * 11 * Math.max(1, sim.speed * 0.5);
  // 같이 하는 친구들은 같은 박자로 (together.js가 c.syncOff를 맞춘다)
  const off = c.syncOff !== undefined ? c.syncOff : a.offset;
  a.built.animate(time + off, { speed, phase: a.phase });
  const t = time + off;
  // 어깨는 원래 자리에서 시작한다 (그립 클립만 armFwd로 앞으로 옮긴다)
  for (const arm of a.built.arms) if (arm.anchor) arm.anchor(0);
  if (a.built.feet) for (const f of a.built.feet) f.scale.set(1, 1, 1);
  // 앉기 전이 (A3): 자리에 앉아 쓰는 동안 0.7초에 걸쳐 앉고, 일어날 때도 0.7초
  const using = c.doing && c.doing.kind === 'obj' && c.doing.phase === 'use' && !c.walking && !c.seating;
  const seatType = using ? seatTypeOf(c.doing.socket) : null;
  if (seatType) a.seatType = seatType;
  const want = seatType ? 1 : 0;
  a.seatAmt = a.seatAmt || 0;
  a.seatRising = want > a.seatAmt;
  a.seatAmt = Math.max(0, Math.min(1, a.seatAmt + Math.sign(want - a.seatAmt) * dt / 0.7));
  if (a.seatAmt > 0 && !c.walking) {
    // 앉은 동안의 동작: 클립이 있으면 그 위에, 없으면 앉아 있기 (서서 하는 수식 동작은 쓰지 않는다)
    applyClip(a, c.clip && ANIMS[c.clip] ? c.clip : 'seat_idle', t);
  } else if (c.walking) {
    a.selfEmote = null;
    // 걸음 박자(phase)에 맞춰 팔다리를 크게 움직인다
    // 사다리·미끄럼 같은 이동 클립은 제 시간대로, 걷기는 걸음 박자(이동 거리)로 재생한다
    if (c.moveClip && ANIMS[c.moveClip]) applyClip(a, c.moveClip, t);
    else {
      const wid = ANIMS.walk_lively ? 'walk_lively' : 'walk_cycle';
      applyClip(a, wid, a.phase / (Math.PI * 2));
    }
  }
  else if (c.clip && ANIMS[c.clip]) applyClip(a, CombatMoves.clipFor(c) || c.clip, CombatMoves.clipFor(c) ? t * CombatMoves.rate(sim) : t);
  else if (a.selfEmote && !c.doing && ANIMS[a.selfEmote.clip] && time - a.selfEmote.start <= ANIMS[a.selfEmote.clip].dur + 0.4) applyClip(a, a.selfEmote.clip, time - a.selfEmote.start);
  else if (c.act === 'friend' && ANIMS.chat_nod) applyClip(a, 'chat_nod', t);
  else if (!c.act || c.act === 'idle') applyClip(a, idleClipFor(c, Math.floor(t / 6)), t % 6);
  else playAct(a, c.act, 'normal', time);
  // 이번 프레임에 클립을 안 썼으면(playAct 등) 클립 소품을 뗀다
  if (!a.clipUsed && a.clipProps) dropClipProps(a);
  if (a.selfEmote && ANIMS[a.selfEmote.clip] && time - a.selfEmote.start > ANIMS[a.selfEmote.clip].dur + 0.4) a.selfEmote = null;
  // 자는 동안에는 눈을 감는다
  // 자는 클립이거나, 잠·낮잠 단계(act)인 동안 (집·동굴·해먹·섬 해먹 모두)
  const asleep = !c.walking && !c.hidden && (SLEEP_CLIPS.has(c.clip) || c.act === 'sleep' || c.act === 'nap');
  if (a.built.setEyesClosed) {
    a.built.setEyesClosed(asleep);
    if (asleep && !c.extra) a.built.setExpression(a.preset.expression);
  }
  // 얼굴은 기분 글자와 같은 값으로 정한다 (동작의 놀람·울음 같은 순간 표정은 그대로)
  if (c.troupe && !asleep) a.built.setExpression(c.doing && c.doing.x && c.doing.x.showAct ? 'pj-star' : 'pj-normal');
  if (!asleep && !c.extra) {
    const faceId = sim.persona.faceFor(c, a.clipFace);
    if (faceId && a.faces.has(faceId)) a.built.setExpression(faceId);
  }
  // 손 위치로 적은 클립은 손에 든 물건을 몸 기준으로 곧게 놓고, 입으로 가져간다
  const heldClip = c.clip && ANIMS[CombatMoves.clipFor(c) || c.clip];
  // 손 소품: 상호작용 단계가 요구할 때만, 그 동작 동안 손에 (몸을 뚫지 않는 배치는 village-props.js FIT)
  // 토벌장에서 드는 막대는 그 캐릭터의 무기다
  // 걸을 때는 빈손. 단, 제초 주머니를 받은 뒤 현장·접수처를 오가는 동안은 주머니를 든다
  let hold = c.hidden ? null : c.walking ? (c.bag ? 'sack' : null) : c.prop || null;
  // 갑옷씨가 그 물건을 받아 들고 있는 동안은 손님 손에서 감춘다 (yoroi-knight.js laborAction)
  if (c.propHideAt && performance.now() - c.propHideAt < 150) hold = null;
  if (hold === 'rod' && c.doing && c.doing.x && (c.doing.x.place === 'hunt' || c.doing.x.place.startsWith('wilds'))) hold = Shop.owns(c, 'weapon') ? Persona.weaponOf(c) : c.doing.x.place === 'hunt' ? 'rod' : null;
  // 랏코·우사기는 준비 동작에서도 무기를 쥔다 (combat-moves.js)
  if (!hold && CombatMoves.wantsWeapon(c) && Shop.owns(c, 'weapon')) hold = Persona.weaponOf(c);
  if (a.propKey !== hold) {
    VillageProps.detach(a.prop);
    a.prop = hold ? VillageProps.attach(a, hold, heldClip && heldClip.reach ? { a: 0, b: 0, s: 1, o: 'f' } : undefined) : null;
    a.propKey = hold;
  }
  // 랏코: 손에 검을 쥐면 등에 멘 검은 숨긴다 (검이 둘로 보이지 않게). 앉으면 검은 내려놓고 망토는 접는다 (등받이·좌면을 뚫지 않게)
  const ud = a.built.model.userData;
  if (ud.backSword) ud.backSword.visible = !(hold && /^w_/.test(hold)) && !(a.seatAmt > 0.3);
  if (ud.cape) ud.cape.scale.y = 1 - 0.5 * (a.seatAmt || 0);
  if (heldClip && heldClip.reach && !c.walking) {
    const pose = AnimRig.poseAt(a, heldClip, clipTime(a, heldClip, t), {});
    placeHandProp(a, heldClip, pose);
    placeSticks(a, heldClip, pose);
  } else if (a.sticks) a.sticks.visible = false;
  const far = camera.position.distanceTo(root.position);
  a.tag.visible = !window.TITLE_ON && (far < 60 || c.id === selected);
}

/* ---------- 카메라 ---------- */

const view = { x: 0, z: 6, yaw: 0.6, pitch: 0.62, dist: 34 };
let selected = 'chiikawa';
let follow = true;
function placeCamera(dt) {
  if (follow) {
    const a = actors.find(x => x.c.id === selected);
    if (a) {
      // 화면에 그려진(보간된) 자리를 시간 기준으로 부드럽게 따라간다. 화면 빈도와 상관없이 같은 느낌이고, 멀리 있으면 바로 옮긴다
      const tx = a.built.root.position.x;
      const tz = a.built.root.position.z;
      const far = Math.hypot(tx - view.x, tz - view.z) > 40;
      const k = far ? 1 : 1 - Math.exp(-dt * 6);
      view.x += (tx - view.x) * k;
      view.z += (tz - view.z) * k;
    }
  }
  const y = world.floorAt(view.x, view.z);
  camera.position.set(view.x + Math.sin(view.yaw) * Math.cos(view.pitch) * view.dist, y + Math.sin(view.pitch) * view.dist, view.z + Math.cos(view.yaw) * Math.cos(view.pitch) * view.dist);
  camera.lookAt(view.x, y + 1.2, view.z);
  sun.position.set(view.x + 30, y + 60, view.z + 20);
  sun.target.position.set(view.x, y, view.z);
}
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  drag.x = e.clientX;
  drag.y = e.clientY;
  view.yaw -= dx * 0.006;
  view.pitch = Math.max(0.2, Math.min(1.35, view.pitch + dy * 0.004));
});
canvas.addEventListener('pointerup', e => {
  if (drag && drag.moved < 6) pick(e.clientX, e.clientY);
  drag = null;
});
canvas.addEventListener('wheel', e => { view.dist = Math.max(8, Math.min(140, view.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: true });
const keys = new Set();
window.addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'Space') {
    sim.paused = !sim.paused;
    renderAll();
  }
  if (e.code === 'Escape') clearFocus();
});
window.addEventListener('keyup', e => keys.delete(e.code));
function moveKeys(dt) {
  // 테스트 모드: WASD가 고른 캐릭터를 걷게 한다 (test-mode.js)
  if (window.TestMode && TestMode.drive(dt, keys, view)) { if (TestMode.on) follow = true; return; }
  const ix = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  const iz = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0);
  if (!ix && !iz) return;
  follow = false;
  const k = view.dist * 0.9 * dt;
  view.x += (Math.cos(view.yaw) * ix + Math.sin(view.yaw) * iz) * k;
  view.z += (-Math.sin(view.yaw) * ix + Math.cos(view.yaw) * iz) * k;
}

/* ---------- 누르기: 캐릭터 → 따라가기, 장소 → 할 수 있는 일 ---------- */

function pick(cx, cy) {
  const ndc = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  // 캐릭터 후보: 광선과의 거리 + 카메라로부터의 깊이
  let best = null;
  let bestD = 1.6;
  let bestT = Infinity;
  const _cp = new THREE.Vector3();
  for (const a of actors) {
    if (a.c.hidden) continue;
    const p = a.built.root.position.clone().add(new THREE.Vector3(0, 1, 0));
    const d = ray.ray.distanceToPoint(p);
    if (d < bestD) {
      bestD = d;
      best = a;
      bestT = ray.ray.closestPointToPoint(p, _cp).distanceTo(ray.ray.origin);
    }
  }
  // 땅에 닿는 점 → 가장 가까운 장소 + 닿은 거리
  const o = ray.ray.origin;
  const dir = ray.ray.direction;
  let place = null;
  let groundT = Infinity;
  let groundPoint = null;
  for (let s = 0; s < 500; s += 0.5) {
    const x = o.x + dir.x * s;
    const y = o.y + dir.y * s;
    const z = o.z + dir.z * s;
    if (y <= world.floorAt(x, z) + 0.5) {
      groundT = s;
      groundPoint = { x, z };
      let pd = Infinity;
      for (const p of world.places) {
        if (p.elem || !sim.interactions.some(i => i.place === p.id)) continue;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < (p.r || 10) + 8 && d < pd) {
          pd = d;
          place = p;
        }
      }
      break;
    }
  }
  // 캐릭터가 땅보다 앞에 있을 때만 캐릭터를 고른다 (건물 앞을 지나던 캐릭터에 클릭이 먹히지 않게)
  const thing = !(best && bestT <= groundT + 1) ? Interiors.pick(ray) : null;
  if (thing) {
    setFocus({ kind: 'obj', id: `${thing.state.place.id}/${thing.id}`, o: thing });
    openPie(cx, cy);
    renderAll();
    return;
  }
  // 벤치·가로등·나무 같은 작은 물건
  if (!(best && bestT <= groundT + 1) && groundT < Infinity) {
    const elem = MapElements.pick(ray.ray, groundT, place, groundPoint);
    if (elem) {
      setFocus({ kind: 'place', id: elem.id });
      openPie(cx, cy);
      renderAll();
      return;
    }
  }
  if (best && bestT <= groundT + 1) {
    if (best.c.id === selected) {
      follow = true;
      setFocus({ kind: 'self', id: best.c.id });
    } else setFocus({ kind: 'char', id: best.c.id });
    renderAll();
    openPie(cx, cy);
    return;
  }
  if (groundT < Infinity) {
    if (place) {
      setFocus({ kind: 'place', id: place.id, at: groundPoint });
      openPie(cx, cy);
    } else clearFocus();
    renderAll();
  }
}

/* ---------- 포커스: 흰 테두리 + 근처 행위 팝업 (심즈 방식) ---------- */

const NEAR = 34;                    // 조종 중인 캐릭터와 이 거리 안이면 "근처" — 바로 시킬 수 있다
const SELF_EMOTES = [
  { name: '춤추기', clip: 'dance_light' },
  { name: '인사하기', clip: 'wave' },
  { name: '점프하며 기뻐하기', clip: 'jump_joy' },
  { name: '기지개 켜기', clip: 'idle_stretch' },
  { name: '하품하기', clip: 'idle_yawn' },
];
let focus = null;                   // { kind: 'place' | 'char' | 'self', id }
const haloCache = new Map();
const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, transparent: true, opacity: 0.92, depthWrite: false });

// 대상의 모든 메시에 법선 방향으로 살짝 부풀린 흰 껍질을 자식으로 붙인다 (외곽선과 같은 문법, 색만 흰색)
// 껍질은 메시의 자식이라 관절·홀더 transform을 그대로 따라간다. UI 표시용이라 물리·충돌과 무관하다.
function computeNormalsFlat(pos, index) {
  const n = new Float32Array(pos.count * 3);
  const ax = i => pos.getX(i), ay = i => pos.getY(i), az = i => pos.getZ(i);
  const tri = (a, b, c) => {
    const ux = ax(b) - ax(a), uy = ay(b) - ay(a), uz = az(b) - az(a);
    const vx = ax(c) - ax(a), vy = ay(c) - ay(a), vz = az(c) - az(a);
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) { n[i * 3] += nx; n[i * 3 + 1] += ny; n[i * 3 + 2] += nz; }
  };
  if (index) for (let i = 0; i + 2 < index.count; i += 3) tri(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  else for (let i = 0; i + 2 < pos.count; i += 3) tri(i, i + 1, i + 2);
  for (let i = 0; i < pos.count; i++) {
    const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1;
    n[i * 3] /= l; n[i * 3 + 1] /= l; n[i * 3 + 2] /= l;
  }
  return n;
}
function makeHalo(rootObj) {
  const meshes = [];
  rootObj.traverse(m => {
    if (m.isMesh && m.geometry && m.geometry.attributes.position && !m.userData.halo) meshes.push(m);
  });
  const hulls = [];
  for (const m of meshes) {
    if (m.geometry.attributes.inkW) continue;                  // 월드 외곽선 전용 메시는 제외
    if (/ink/i.test(m.name || '')) continue;
    const g = m.geometry;
    const bb = g.boundingBox || (g.computeBoundingBox(), g.boundingBox);
    const sx = bb.max.x - bb.min.x;
    const sy = bb.max.y - bb.min.y;
    const sz = bb.max.z - bb.min.z;
    if (sy < 0.25 && Math.hypot(sx, sz) > 6) continue;         // 땅 원판·수면 같은 넓고 납작한 덩어리는 제외
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const flat = nor ? null : computeNormalsFlat(pos, g.index);
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const nx = nor ? nor.getX(i) : flat[i * 3];
      const ny = nor ? nor.getY(i) : flat[i * 3 + 1];
      const nz = nor ? nor.getZ(i) : flat[i * 3 + 2];
      arr[i * 3] = pos.getX(i) + nx * 0.1;
      arr[i * 3 + 1] = pos.getY(i) + ny * 0.1;
      arr[i * 3 + 2] = pos.getZ(i) + nz * 0.1;
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    if (g.index) hg.setIndex(g.index);
    const hull = new THREE.Mesh(hg, haloMat);
    hull.visible = false;
    hull.renderOrder = 998;
    hull.raycast = () => {};
    hull.userData.halo = true;
    m.add(hull);
    hulls.push(hull);
  }
  return hulls;
}
function focusRoots(f) {
  if (!f) return [];
  if (f.kind === 'place') {
    const shell = Interiors.shellOf(f.id);
    return shell ? [shell] : (window.GLB_HOLDERS || {})[f.id] || [];
  }
  if (f.kind === 'obj') return [f.o.root];
  const a = actors.find(x => x.c.id === f.id);
  return a ? [a.built.model] : [];
}
function setFocus(f) {
  clearFocus(false);
  focus = f;
  const key = `${f.kind}:${f.id}`;
  if (!haloCache.has(key)) {
    const hulls = [];
    for (const o of focusRoots(f)) hulls.push(...makeHalo(o));
    haloCache.set(key, hulls);
  }
  for (const h of haloCache.get(key)) h.visible = true;
}
function clearFocus(hidePop = true) {
  if (focus) {
    const hulls = haloCache.get(`${focus.kind}:${focus.id}`) || [];
    for (const h of hulls) h.visible = false;
  }
  focus = null;
  if (hidePop) closePie();
}

// 포커스된 캐릭터 발밑의 흰 링 (흰 몸통 캐릭터에서도 포커스가 읽히게)
const focusRing = new THREE.Mesh(
  new THREE.RingGeometry(0.95, 1.18, 40),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
);
focusRing.rotation.x = -Math.PI / 2;
focusRing.renderOrder = 997;
focusRing.visible = false;
scene.add(focusRing);
function drawFocusRing(time) {
  if (!focus || focus.kind === 'place' || focus.kind === 'obj') { focusRing.visible = false; return; }
  const a = actors.find(x => x.c.id === focus.id);
  if (!a || a.c.hidden) { focusRing.visible = false; return; }
  focusRing.visible = true;
  focusRing.position.set(a.built.root.position.x, world.floorAt(a.built.root.position.x, a.built.root.position.z) + 0.07, a.built.root.position.z);
  focusRing.material.opacity = 0.6 + 0.3 * Math.sin(time * 4);
}

/* ---------- 화면 패널 (심즈식 배치: 위 시계 · 아래 왼쪽 가족과 고른 캐릭터 · 아래 오른쪽 욕구 · 누르면 파이 메뉴) ---------- */

const NEED_ICON = { hunger: '🍙', energy: '💤', fun: '🎈', social: '💕', hygiene: '🛁' };
const EMOTE_ICON = { dance_light: '💃', wave: '👋', jump_joy: '✨', idle_stretch: '🙆', idle_yawn: '🥱' };
// 상호작용 아이콘: 버는 일은 돈, 아니면 가장 많이 채우는 욕구
function iconOf(x) {
  if (!x) return '❔';
  if (x === window.VillageObjects.CHAT) return '💬';
  if (x.earn || x.takeKind || x.settle) return '💰';
  if (x.plate) return '🪵';
  const best = Object.entries(x.gain || {}).sort((a, b) => b[1] - a[1])[0];
  return best ? NEED_ICON[best[0]] || '⭐' : '⭐';
}
const MOOD_LOOK = {
  great: { label: '기분 최고예요', color: '#78c46d' },
  ok: { label: '그럭저럭이에요', color: '#f2c230' },
  bad: { label: '힘들어요', color: '#e0607a' },
  tired: { label: '졸려요', color: '#e0607a' },
  hangover: { label: '숙취로 머리 아파요', color: '#e0607a' },
};
function moodOf(c) {
  if (c.hidden) return { label: '쿨쿨 자는 중', color: '#9a9cc8' };
  return MOOD_LOOK[sim.persona.tier(c)];
}
function doingText(c) {
  if (c.fight) return '⚔️ 난동 괴물과 싸우는 중';
  if (c.flee) return '😨 난동 괴물을 피해 도망치는 중';
  if (c.greet) return '👋 길에서 만난 친구와 얘기하는 중';
  if (c.rescue) return c.rescue.phase === 'carried' ? '🚁 대나무 헬리콥터에 집혀 약국으로 가는 중' : '💫 쓰러짐 · 대나무 헬리콥터를 기다리는 중';
  if (c.hidden) return '자는 중';
  const d = c.doing;
  if (!d) return c.orders.length ? '시킨 일 하러 가는 중' : '잠깐 쉬는 중';
  if (d.kind === 'chat') return d.phase === 'walk' ? `${d.with.name}에게 가는 중` : `${d.with.name}와(과) 수다`;
  const place = world.places.find(p => p.id === d.x.place);
  const stepLabel = d.phase === 'use' && d.x.steps[d.step] && d.x.steps[d.step].label;
  if (stepLabel) return `${d.x.name} · ${stepLabel}`;
  return d.phase === 'walk' ? `${place ? place.name : ''}(으)로 가는 중 · ${d.x.name}` : d.x.name;
}
function effText(x) {
  const parts = Object.entries(x.gain).map(([k, v]) => el('span', { className: v > 0 ? 'up' : 'down', textContent: `${NEED_ICON[k] || ''}${NEED_LABEL[k]} ${v > 0 ? '+' : ''}${v}` }));
  const extra = [];
  if (x.cost) extra.push(`${x.cost}원`);
  if (x.earn) extra.push(`+${x.earn}원 벌기`);
  if (x.takeKind) extra.push('선착순');
  extra.push(`${x.steps ? x.steps.reduce((a, s) => a + s.min, 0) : x.min}분`);
  if (x.hours) extra.push(`${x.hours[0]}~${x.hours[1]}시`);
  const out = el('div', { className: 'eff' });
  parts.forEach((p, i) => { if (i) out.append(' · '); out.append(p); });
  out.append(`${parts.length ? ' · ' : ''}${extra.join(' · ')}`);
  return out;
}
// 시키기: 심즈처럼 줄을 선다. 시킨 일을 하는 중이면 뒤에 붙이고(최대 5개), 아니면 지금 하던 일을 멈추고 바로
function enqueue(c, x, other) {
  if (!c) return;
  if ((c.doing && c.doing.ordered) || c.orders.length) {
    if (c.orders.length < 5) c.orders.push({ x, with: other });
  } else sim.order(c, x, other);
  follow = true;
  renderAll();
}

/* 얼굴 사진: 캐릭터 모델을 그 자리에서 정면으로 찍는다 (얼굴 그림이 다 읽힌 뒤 두 번) */
const portraits = {};
const shotCam = new THREE.PerspectiveCamera(22, 1, 0.1, 80);
function shootPortraits(only) {
  const W = renderer.domElement.width;
  const H = renderer.domElement.height;
  const side = Math.min(W, H);
  const keep = scene.children.map(o => o.visible);
  const bg = scene.background;
  const fog = scene.fog;
  scene.background = new THREE.Color(0xfff3d6);
  scene.fog = null;
  shotCam.aspect = W / H;
  shotCam.updateProjectionMatrix();
  const out = document.createElement('canvas');
  out.width = out.height = 160;
  const g = out.getContext('2d');
  for (const a of only || actors.filter(x => !x.c.extra || x.c.strong)) {
    a.portraitMood = sim.persona.tier(a.c);
    const r = a.built.root;
    scene.children.forEach(o => { if (!o.isLight && o !== sun.target) o.visible = o === r; });
    const was = { tag: a.tag.visible, bubble: a.bubble && a.bubble.visible, vis: r.visible, rot: r.rotation.y };
    a.tag.visible = false;
    if (a.bubble) a.bubble.visible = false;
    r.visible = true;
    r.updateMatrixWorld(true);
    const cy = r.position.y + a.height * 0.56;
    const d = a.height * 2.9;
    const yaw = r.rotation.y + 0.32;
    shotCam.position.set(r.position.x + Math.sin(yaw) * d, cy + a.height * 0.12, r.position.z + Math.cos(yaw) * d);
    shotCam.lookAt(r.position.x, cy, r.position.z);
    renderer.render(scene, shotCam);
    g.clearRect(0, 0, 160, 160);
    g.drawImage(renderer.domElement, (W - side) / 2, (H - side) / 2, side, side, 0, 0, 160, 160);
    portraits[a.c.id] = out.toDataURL('image/png');
    a.tag.visible = was.tag;
    if (a.bubble) a.bubble.visible = was.bubble;
    r.visible = was.vis;
  }
  scene.children.forEach((o, i) => { o.visible = keep[i]; });
  scene.background = bg;
  scene.fog = fog;
  uiKey.family = '';
  uiKey.me = '';
}
const faceImg = id => portraits[id] ? el('img', { src: portraits[id], alt: '' }) : el('span', { textContent: (sim.chars.find(c => c.id === id) || {}).name?.[0] || '?', style: 'display:grid;place-items:center;height:100%;font-size:20px;font-weight:700' });

// 같은 내용이면 다시 그리지 않는다 (누르는 중인 단추가 사라지지 않게)
const uiKey = { clock: '', family: '', me: '', panel: '' };
let tab = 'needs';

function renderClock() {
  const speeds = [[1, '▶'], [3, '▶▶'], [10, '▶▶▶'], [30, '⚡']];
  const h = sim.hour;
  const key = `${sim.day}|${sim.clock()}|${sim.paused}|${sim.speed}`;
  if (key === uiKey.clock) return;
  uiKey.clock = key;
  $('clock').replaceChildren(
    el('div', { className: 'sky', textContent: h >= 6 && h < 18 ? '☀️' : h >= 18 && h < 20 ? '🌇' : '🌙' }),
    el('div', { className: 'when' }, el('small', { textContent: sim.calendar.label() }), el('b', { textContent: sim.clock() })),
    el('div', { className: 'speeds' },
      el('button', { className: `round${sim.paused ? ' on' : ''}`, type: 'button', title: '멈춤 (Space)', textContent: 'II', onclick: () => { sim.paused = !sim.paused; renderAll(); } }),
      ...speeds.map(([s, label]) => el('button', { className: `round${!sim.paused && sim.speed === s ? ' on' : ''}`, type: 'button', title: `${s}배`, textContent: label, onclick: () => { sim.speed = s; sim.paused = false; renderAll(); } }))),
  );
}
// 동행: 지금 누구와 같이 움직이거나 같이 하는 중인가 (따라가기·길에서 만나 따라가기·같이 하기로 부른 짝·노동 팀)
// 같은 곳으로 가거나 같은 곳에서 하고 있을 때만 동행으로 본다 (약속만 남은 오래된 짝은 빼고)
function companionsOf(c) {
  if (c.hidden || c.extra) return [];
  const placeOf = q => (q.doing && q.doing.x && q.doing.x.place) || (q.orders[0] && q.orders[0].x && q.orders[0].x.place) || null;
  const sameWay = (a, b) => { const p = placeOf(a); return !!p && p === placeOf(b); };
  const linked = (a, b) => a.followLead === b.id || a.pairOf === b.id || a.playWith === b.id
    || (a.tagAlong && a.tagAlong.with === b.id && a.tagAlong.until > sim.minutes)
    || (a.party && a.party === b.party);
  return sim.chars.filter(o => o !== c && !o.hidden && !o.gone && !o.monster && (linked(c, o) || linked(o, c)) && sameWay(c, o));
}
function renderFamily() {
  const mains = sim.chars.filter(c => !c.extra);
  const key = mains.map(c => `${c.id}${moodOf(c).color}${c.hidden}${companionsOf(c).map(o => o.id).join('+')}`).join() + selected + Object.keys(portraits).length;
  if (key === uiKey.family) return;
  uiKey.family = key;
  $('family').replaceChildren(...mains.map(c => {
    const m = moodOf(c);
    const mates = companionsOf(c);
    const withText = mates.length ? ` · ${mates.map(o => o.name).join('·')}와(과) 동행 중` : '';
    // 동행 배지: 손잡은 아이콘 + 같이 가는 친구 얼굴(여럿이면 첫 친구와 +수)
    const badge = mates.length ? el('span', { className: 'with', title: withText.slice(3) },
      el('i', { textContent: '🤝' }),
      el('span', { className: 'with-face' }, faceImg(mates[0].id)),
      mates.length > 1 ? el('b', { textContent: `+${mates.length - 1}` }) : null) : null;
    return el('button', {
      className: `mate${c.id === selected ? ' on' : ''}${mates.length ? ' together' : ''}`, type: 'button', title: `${c.name} · ${m.label}${withText}`,
      onclick: () => { selected = c.id; follow = true; closePie(); renderAll(); },
    }, faceImg(c.id), el('span', { className: 'dot', style: `background:${m.color}` }), c.hidden ? el('span', { className: 'zz', textContent: '💤' }) : null, badge);
  }));
}
function progressOf(c) {
  const d = c.doing;
  if (!d) return 0;
  if (d.kind === 'obj') {
    const st = d.x.steps[d.step];
    if (!st) return 1;
    const before = d.x.steps.slice(0, d.step).reduce((a, s) => a + s.min, 0);
    return Math.max(0, Math.min(1, (before + (d.phase === 'use' ? st.min - d.left : 0)) / (d.total || 1)));
  }
  return d.phase === 'use' && d.x.min ? Math.max(0, Math.min(1, 1 - d.left / d.x.min)) : 0;
}
function renderMe() {
  const c = sim.chars.find(x => x.id === selected);
  if (!c) return;
  const m = moodOf(c);
  const pct = Math.round(progressOf(c) * 100);
  const plateText = c.plate ? `🪵 ${Labor.KINDS[c.plate.kind].label} · ${{ taken: '접수 전', accepted: '일하러 가요', done: '정산 필요', failed: '실패 · 반납 필요' }[c.plate.state] || ''}` : '';
  const left = sim.calendar.daysLeft(c);
  const examText = c.exam ? `📝 ${sim.calendar.examName(c)} ${left === 0 ? '오늘 12시' : `D-${left}`} · 공부 ${c.study}/${sim.calendar.need(c)}` : '';
  const arbText0 = c.extra ? '' : c.arbiter ? '💼 슈퍼 알바이터' : (c.arbStudy || 0) > 0 ? `💼 ${sim.calendar.arbName(c)} · 공부 ${c.arbStudy}/${sim.calendar.arbNeed(c)}${c.arbExam ? ` · ${sim.calendar.label(c.arbExam.day)}` : ''}` : '';
  const ownedText = c.extra ? '' : `🎒 ${Shop.names(c).join(', ') || '소지품 없음'}`;
  const arbText = [arbText0, ownedText].filter(Boolean).join(' · ');
  const mates = companionsOf(c);
  const withText = mates.length ? `🤝 ${mates.map(o => o.name).join('·')}와(과) 동행 중` : '';
  const key = [c.id, m.label, c.money, window.Society ? Society.chip(c) : '', doingText(c), pct, c.orders.map(o => o.x.id).join(), Object.keys(portraits).length, plateText, examText, arbText, withText].join('|');
  if (key === uiKey.me) return;
  uiKey.me = key;
  const box = $('me');
  const slots = [];
  if (c.doing) {
    const x = c.doing.x;
    slots.push(el('div', { className: 'q now', title: doingText(c) },
      el('span', { className: 'fill', style: `height:${pct}%` }),
      el('span', { className: 'ico', textContent: iconOf(x) }),
      el('button', { className: 'x', type: 'button', title: '그만하기', textContent: '✕', onclick: () => { sim.abort(c, ''); renderAll(); } }),
      el('span', { className: 'lab', textContent: x === window.VillageObjects.CHAT ? '수다' : x.name })));
  }
  c.orders.forEach((o, i) => {
    slots.push(el('div', { className: 'q', title: o.with ? `${o.with.name}와(과) 수다` : o.x.name },
      el('span', { className: 'ico', textContent: iconOf(o.x) }),
      el('button', { className: 'x', type: 'button', title: '줄에서 빼기', textContent: '✕', onclick: () => { c.orders.splice(i, 1); renderAll(); } }),
      el('span', { className: 'lab', textContent: o.with ? `${o.with.name} 수다` : o.x.name })));
  });
  while (slots.length < 5) slots.push(el('div', { className: 'q empty', textContent: '＋' }));
  const face = el('button', { className: 'face', type: 'button', title: '카메라를 이 캐릭터에게', onclick: () => { follow = true; setFocus({ kind: 'self', id: c.id }); const r = box.querySelector('.face').getBoundingClientRect(); openPie(r.left + r.width / 2, r.top - 70); } }, faceImg(c.id));
  box.replaceChildren(
    face,
    el('div', { className: 'plate' }, el('b', { textContent: c.name }), el('small', { textContent: m.label, style: `color:${m.color === '#f2c230' ? '#b38a00' : m.color}` })),
    el('span', { className: 'chip money', textContent: window.Society ? Society.chip(c) : `💰 ${c.money.toLocaleString()}원` }),
    withText ? el('span', { className: 'chip with-chip', textContent: withText }) : '',
    plateText ? el('span', { className: 'chip', textContent: plateText }) : '',
    examText ? el('span', { className: 'chip', textContent: examText, title: arbText }) : '',
    el('h4', { textContent: '지금 하는 일' }),
    el('div', { className: 'doing', textContent: doingText(c) }),
    el('div', { className: 'queue' }, ...slots),
  );
}
function renderPanel() {
  const c = sim.chars.find(x => x.id === selected);
  if (!c) return;
  let body = [];
  let key = tab;
  if (tab === 'needs') {
    key += NEEDS.map(([k]) => Math.round(c.needs[k])).join() + '|' + Math.round(RescueHeli.hpOf(c));
    body = NEEDS.map(([k, label, color]) => {
      const v = c.needs[k];
      return el('div', { className: 'need', title: `${label} ${Math.round(v)}` },
        el('i', { textContent: NEED_ICON[k] }), el('span', { textContent: label }),
        el('div', { className: 'meter' }, el('b', { className: v < 25 ? 'low' : '', style: `width:${Math.max(3, Math.round(v))}%;background:${v < 25 ? '#e0607a' : color}` })));
    });
    // 체력 (rescue-heli.js): 토벌하면 깎이고 쉬면 찬다. 0이 되면 구조 헬기
    const hp = RescueHeli.hpOf(c);
    body.push(el('div', { className: 'need', title: `체력 ${Math.round(hp)}` }, el('i', { textContent: '❤️' }), el('span', { textContent: '체력' }),
      el('div', { className: 'meter' }, el('b', { className: hp < 35 ? 'low' : '', style: `width:${Math.max(3, Math.round(hp))}%;background:${hp < 35 ? '#e0607a' : '#e8806f'}` }))));
  } else if (tab === 'wish') {
    const opts = sim.options(c).slice(0, 5);
    key += opts.map(o => (o.with ? o.with.id : o.x.id)).join() + c.id;
    body = opts.length ? opts.map(o => el('div', { className: 'wish' },
      el('i', { textContent: iconOf(o.x) }),
      el('div', { className: 'grow' },
        el('b', { textContent: o.with ? `${o.with.name}와(과) 수다 떨기` : o.x.name }),
        el('small', { textContent: o.with ? '친구가 그리워요' : (world.places.find(p => p.id === o.x.place) || {}).name || '' })),
      el('button', { type: 'button', textContent: '시키기', onclick: () => enqueue(c, o.x, o.with) }))) : [el('p', { className: 'quiet', textContent: '지금은 딱히 하고 싶은 게 없대요.' })];
  } else if (tab === 'self') {
    // 성격: 특성 3개, 지금 감정과 이유, 열망 단계 (traits.js)
    const T = sim.traits;
    const feel = T ? T.feelOf(c) : null;
    const asp = T ? T.aspiration(c) : null;
    key += c.id + (feel ? feel.id + Math.ceil(feel.left / 30) : '-') + (asp ? `${asp.stage}/${asp.n}/${asp.lap}/${asp.dday}/${asp.stall}` : '');
    const traitRows = T ? T.traitsOf(c).map(t => el('div', { className: 'trait' },
      el('i', { textContent: t.icon }), el('b', { textContent: t.name }), el('small', { textContent: t.desc }))) : [];
    const feelRow = el('div', { className: 'feel' },
      el('i', { textContent: feel ? feel.icon : '🙂' }),
      el('b', { textContent: feel ? feel.label : '덤덤' }),
      el('small', { textContent: feel ? `${feel.why ? feel.why + ' · ' : ''}${Math.max(1, Math.round(feel.left / 60))}시간쯤 더` : '특별한 감정은 없어요' }));
    // 목표 (goals.js): 평생 목표 + 지금 단계 앞뒤만. 마감이 있으면 D-day, 순환형이면 몇 바퀴째
    const window0 = asp ? Math.max(0, Math.min(asp.stage - 1, asp.steps.length - 4)) : 0;
    const aspBlock = asp ? el('div', { className: 'asp' },
      el('b', { className: 'asp-title', textContent: `${asp.icon} 평생 목표: ${asp.name}${asp.done ? ' — 이뤘어요!' : ''}` }),
      el('small', { className: 'quiet', textContent: [
        `${Math.min(asp.stage + 1, asp.steps.length)}/${asp.steps.length}단계`,
        asp.lap ? `${asp.lap + 1}바퀴째` : '',
        asp.dday !== null && asp.dday !== undefined && asp.dday !== Infinity ? `시험 D-${Math.max(0, asp.dday)}` : '',
        asp.stall >= 3 ? `${asp.stall}일째 제자리` : '',
      ].filter(Boolean).join(' · ') }),
      ...asp.steps.slice(window0, window0 + 4).map((st, j) => {
        const i = window0 + j;
        const done = i < asp.stage;
        const now = i === asp.stage;
        const n = done ? st.need : now ? Math.min(asp.n, st.need) : 0;
        return el('div', { className: `asp-step${done ? ' done' : now ? ' now' : ''}` },
          el('span', { textContent: done ? '✔' : now ? '▶' : '·' }),
          el('small', { textContent: st.label }),
          el('div', { className: 'meter' }, el('b', { style: `width:${Math.max(3, Math.round((n / st.need) * 100))}%;background:${done ? '#7cc48a' : '#f2c230'}` })),
          el('em', { textContent: `${n}/${st.need}` }));
      })) : c.id === 'usagi' ? el('div', { className: 'asp' }, el('b', { className: 'asp-title', textContent: '🍃 목표 없음' }), el('small', { className: 'quiet', textContent: '그날 기분대로 자유롭게 사는 중' })) : null;
    body = [el('div', { className: 'traits' }, ...traitRows), feelRow, aspBlock];
  } else if (tab === 'cal') {
    const cal = sim.calendar;
    const cells = cal.monthCells();
    const mains = sim.chars.filter(x => !x.extra);
    key += sim.day + mains.map(x => [x.study, x.exam ? x.exam.day : '', x.grade, x.lastExam ? x.lastExam.pass : '', x.arbStudy, x.arbiter].join()).join('/');
    const { month } = cal.dateOf(sim.day);
    body = [
      el('b', { className: 'cal-title', textContent: `${month}월 · 짝수 날 18시 파자마 파티즈 공연` }),
      el('div', { className: 'cal' },
        ...Calendar.WEEK.map(w => el('i', { textContent: w })),
        ...cells.map(d => el('div', { className: `${d.today ? 'today' : ''}${d.past ? ' past' : ''}${d.names.length ? ' has' : ''}`, title: d.names.join(', ') },
          el('small', { textContent: d.dom }), d.names.length ? el('span', { textContent: d.names.length > 1 ? '시험' : d.names[0].slice(0, 2) }) : null))),
      el('div', { className: 'cal-list' }, ...mains.filter(x => x.exam).sort((p, q) => p.exam.day - q.exam.day).map(x => el('div', {},
        el('b', { textContent: x.name }),
        el('span', { textContent: `${cal.examName(x)} · ${cal.label(x.exam.day)}` }),
        el('small', { className: x.study >= cal.need(x) ? 'ok' : '', textContent: `공부 ${x.study}/${cal.need(x)}${x.arbiter ? ' · 💼자격' : (x.arbStudy || 0) > 0 ? ` · 💼${x.arbStage || 1}차 ${x.arbStudy}/${cal.arbNeed(x)}` : ''}${x.lastExam ? ` · 지난 시험 ${x.lastExam.pass ? '합격' : x.lastExam.absent ? '결시' : '불합격'}` : ''}` })))),
    ];
  } else if (tab === 'bag') {
    const rows = Bag.list(c);
    const lacks = Bag.missing(c);
    key += c.id + rows.map(r => r.name + r.n).join() + lacks.join() + c.money;
    const group = g => rows.filter(r => r.group === g).map(r => el('div', { className: 'trait' },
      el('i', { textContent: r.icon }), el('b', { textContent: r.n > 1 ? `${r.name} ×${r.n}` : r.name }), el('small', { textContent: r.note || '' })));
    const tools = group('도구');
    const food = group('음식');
    body = [el('div', { className: 'traits' },
      el('b', { className: 'cal-title', textContent: `🎒 ${c.name}의 가방 · 💰 ${c.money.toLocaleString()}원` }),
      el('small', { className: 'quiet', textContent: '도구' }), ...(tools.length ? tools : [el('small', { className: 'quiet', textContent: '도구가 없어요' })]),
      el('small', { className: 'quiet', textContent: '음식' }), ...(food.length ? food : [el('small', { className: 'quiet', textContent: '먹을 게 없어요' })]),
      ...lacks.map(t => el('small', { className: 'quiet', textContent: `· ${t}` })))];
  } else {
    const list = sim.chars.filter(x => x !== c && !x.extra).map(x => ({ x, v: sim.persona.bond(c, x) })).sort((p, q) => q.v - p.v);
    key += c.id + list.map(o => o.x.id + Math.round(o.v)).join() + Object.keys(portraits).length;
    body = [el('div', { className: 'bonds' }, ...list.map(({ x, v }) => el('div', { className: 'bond' },
      el('span', { className: 'bond-face' }, faceImg(x.id)),
      el('b', { textContent: x.name }),
      el('div', { className: 'meter' }, el('b', { style: `width:${Math.max(3, Math.round(v))}%;background:#f2748e` })),
      el('small', { textContent: Persona.bondLabel(v) }))))];
  }
  if (tab === 'rank') {
    const all = sim.persona.ranking();
    const beasts = sim.chars.filter(x => x.monster && !x.gone).length;
    const list = all.map((o, i) => ({ ...o, rank: i + 1 }));
    const shown = list.slice(0, 12);
    const mine = list.find(o => o.c === c);
    if (mine && mine.rank > 12) shown.push(mine);
    key = `rank${c.id}${shown.map(o => o.c.id + o.power + (o.c.huntWins || 0)).join()}${Object.keys(portraits).length}`;
    key += beasts;
    body = [el('div', { className: 'quiet', textContent: `토벌 구역의 괴물 ${beasts}마리` }), el('div', { className: 'bonds' }, ...shown.map(o => el('div', { className: `rank-row${o.c === c ? ' me' : ''}` },
      el('b', { className: 'rank-no', textContent: o.rank }),
      el('span', { className: 'bond-face' }, faceImg(o.c.id)),
      el('span', { className: 'rank-name', textContent: o.c.name }),
      el('div', { className: 'meter' }, el('b', { style: `width:${Math.round(o.power / 10)}%;background:#d9745a` })),
      el('small', { textContent: `${o.power}${o.c.huntWins ? ` · ${o.c.huntWins}승` : ''}` }))))];
  }
  if (key === uiKey.panel) return;
  uiKey.panel = key;
  // 탭이 여섯 개라 고른 탭만 이름까지, 나머지는 아이콘만 (이름은 마우스를 올리면)
  const tabBtn = (id, label) => el('button', { className: `tab${tab === id ? ' on' : ''}`, type: 'button', title: label.split(' ')[1], textContent: tab === id ? label : label.split(' ')[0], onclick: () => { tab = id; uiKey.panel = ''; renderPanel(); } });
  $('panel').replaceChildren(el('div', { className: 'tabs' }, tabBtn('needs', '💗 욕구'), tabBtn('self', '🌱 성격'), tabBtn('bag', '🎒 가방'), tabBtn('cal', '📅 달력'), tabBtn('news', '💞 친구'), tabBtn('rank', '⚔️ 랭킹')), ...body);
}

function renderAll() {
  renderClock();
  renderFamily();
  renderMe();
  renderPanel();
}

/* 솟는 음식: 솟는 동안만 음식 알갱이가 뿜어져 나온다 */
const SPRING_COLOR = { rice: 0xfffaf0, servers: 0xf0d9a0, misoBank: 0xc99a5b, sausage: 0xf2a08a, softcream: 0xfff3d6, ramune: 0x9fd8f2, sobaSpring: 0xb79a7a, akafuku: 0xc96a7a };
const fountains = {};
// 솟아 있는 음식 터만 땅에서 올라와 있다
const springRise = {};
let springAt = 0;
function riseSprings(time, on) {
  const dt = Math.min(0.1, time - springAt);
  springAt = time;
  for (const id of sim.ecology.springList) {
    const was = springRise[id];
    const r = was === undefined ? (on.has(id) ? 1 : 0) : Math.max(0, Math.min(1, was + (on.has(id) ? dt : -dt) / 2));
    springRise[id] = r;
    // 2026-11-16: 솟는 곳은 늘 땅 위에 있다 (원작: 장소는 그대로, 음식만 솟거나 마른다). 솟는 정도 r은 음식 알갱이에만 쓴다
    const dy = 0;
    for (const h of window.GLB_HOLDERS[id] || []) {
      if (h.userData.baseY === undefined) h.userData.baseY = h.position.y;
      h.position.y = h.userData.baseY + dy;
      h.visible = true;
    }
    const pg = world.placeGroups.find(q => q.id === id);
    if (pg) {
      if (pg.group.userData.baseY === undefined) pg.group.userData.baseY = pg.group.position.y;
      pg.group.position.y = pg.group.userData.baseY + dy;
    }
  }
}
function drawFountains(time) {
  const on = new Set(sim.ecology.activeSprings());
  riseSprings(time, on);
  for (const id of sim.ecology.springList) {
    let f = fountains[id];
    if (!f) {
      const p = world.places.find(q => q.id === id);
      if (!p) continue;
      f = fountains[id] = new THREE.Group();
      f.position.set(p.x, world.floorAt(p.x, p.z), p.z);
      const mat = new THREE.MeshBasicMaterial({ color: SPRING_COLOR[id] || 0xffffff });
      const geo = new THREE.SphereGeometry(0.34, 8, 6);
      for (let i = 0; i < 14; i++) f.add(new THREE.Mesh(geo, mat));
      scene.add(f);
    }
    f.visible = on.has(id);
    if (!f.visible) continue;
    f.children.forEach((m, i) => {
      const u = ((time * 0.7 + i * 0.137) % 1);
      const a = i * 2.399;
      const r = 0.5 + u * 3.4;
      m.position.set(Math.cos(a) * r, 2.2 + u * 11 - u * u * 11, Math.sin(a) * r);
    });
  }
}

/* ---------- 파이 메뉴 ---------- */

let pieAt = null;
function closePie() {
  $('pie').hidden = true;
  $('tip').hidden = true;
  pieAt = null;
}
function openPie(x, y) {
  pieAt = { x, y };
  renderPie();
}
function addActions(c, p, d, list, items) {
  for (const x of list) {
    let why = null;
    const laborNo = sim.labor.blocked(c, x);
    if (x.only && !x.only.includes(c.id)) why = x.sake || !/집|home|cave/i.test(`${x.name}${x.place}`) ? '이 캐릭터만 해요' : `${c.name}의 집이 아니에요`;
    else if (sim.persona.blocked(c, x)) why = sim.persona.blocked(c, x);
    else if (sim.ecology.blocked(c, x)) why = sim.ecology.blocked(c, x);
    else if (laborNo) why = laborNo;
    else if (!sim.open(x)) why = x.hours ? `${x.hours[0]}~${x.hours[1]}시에만` : '지금은 안 해요';
    else if (x.cost && c.money < x.cost) why = '돈이 모자라요';
    else if (d > NEAR) why = '너무 멀어요';
    // 테스트 모드: 고른 캐릭터는 어떤 행동이든 바로 (돈·시간·자격·거리 무시)
    if (window.TestMode && TestMode.on && c.id === selected) why = null;
    items.push({ icon: iconOf(x), label: x.takeKind ? `${x.name} (${sim.labor.left(x.takeKind)}장)` : x.name, why, tip: x, run: () => enqueue(c, x) });
  }
}
// 누른 자리에서 가까운 상호작용만 고른다: 가장 가까운 자리에서 4m 안쪽까지 (넓은 장소에서 버튼이 뭉치지 않게)
function nearSpot(p, at) {
  const all = sim.interactions.filter(i => i.place === p.id);
  if (!at) return all;
  const far = x => {
    let best = Infinity;
    for (const st of x.steps.slice(0, 1)) for (const sk of sim.candidates(p.id, st.socket)) best = Math.min(best, Math.hypot(sk.x - at.x, sk.z - at.z));
    return best;
  };
  const scored = all.map(x => ({ x, d: far(x) })).filter(o => o.d < Infinity);
  if (!scored.length) return all;
  const nearest = Math.min(...scored.map(o => o.d));
  return scored.filter(o => o.d <= nearest + 4).sort((a, b) => a.d - b.d).slice(0, 10).map(o => o.x);
}
function pieItems() {
  const c = sim.chars.find(x => x.id === selected);
  const items = [];
  let title = '';
  let sub = '';
  if (!focus || !c) return null;
  if (focus.kind === 'place') {
    const p = world.places.find(x => x.id === focus.id);
    if (!p) return null;
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    title = p.name;
    sub = d <= NEAR ? `${c.name} 근처` : `${c.name}와(과) 멀어요`;
    addActions(c, p, d, nearSpot(p, focus.at), items);
    // 심즈의 벽 내리기: 안이 있는 건물은 지붕을 걷고 들여다볼 수 있다
    if (Interiors.has(p.id)) items.push({ icon: '🏠', label: Interiors.isOpen(p.id) ? '안 그만 보기' : '안 들여다보기', run: () => Interiors.togglePeek(p.id) });
    if (!items.length) sub = '여기서 할 수 있는 일이 없어요';
  } else if (focus.kind === 'obj') {
    const p = focus.o.state.place;
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    title = focus.o.label || p.name;
    sub = d <= NEAR ? `${c.name} 근처` : `${c.name}와(과) 멀어요`;
    addActions(c, p, d, sim.interactions.filter(i => i.place === p.id && i.obj === focus.o.obj), items);
    if (!items.length) sub = '이건 그냥 놓여 있어요';
  } else if (focus.kind === 'char') {
    const o = sim.chars.find(x => x.id === focus.id);
    if (!o) return null;
    title = o.name;
    sub = o.monster ? '토벌 대상이에요' : o.extra ? `조종할 수 없는 주민 · ${doingText(o)}` : doingText(o);
    if (!o.extra) items.push({ icon: '🎮', label: `${o.name} 돌보기`, run: () => { selected = o.id; follow = true; setFocus({ kind: 'self', id: o.id }); renderAll(); } });
    const night = sim.hour < 7 || sim.hour >= 21;
    if (!o.monster) items.push({ icon: '💬', label: '수다 떨기', why: night ? '밤에는 자요' : null, run: () => enqueue(c, window.VillageObjects.CHAT, o) });
  } else {
    title = c.name;
    sub = doingText(c);
    const busy = !!c.doing || c.walking;
    for (const e of SELF_EMOTES) {
      items.push({ icon: EMOTE_ICON[e.clip] || '✨', label: e.name, why: busy ? '지금 바빠요' : null, run: () => {
        const a = actors.find(x => x.c.id === c.id);
        if (a) a.selfEmote = { clip: e.clip, start: performance.now() / 1000 };
      } });
    }
  }
  return { title, sub, items };
}
function renderPie() {
  const pie = $('pie');
  const data = pieAt && pieItems();
  if (!data) { closePie(); return; }
  const n = data.items.length;
  const R = n <= 2 ? 92 : n > 7 ? Math.ceil(n / 2) * 23 + 20 : Math.min(170, 86 + n * 13);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = Math.max(R + 110, Math.min(W - R - 110, pieAt.x));
  const cy = Math.max(R + 40, Math.min(H - R - 40, pieAt.y));
  const kids = [el('div', { className: 'hub', style: `left:${cx}px;top:${cy}px` }, el('b', { textContent: data.title }), el('small', { textContent: data.sub }))];
  // 일곱 개가 넘으면 원으로 두르면 겹친다: 가운데 옆에 두 줄로 세운다
  const listed = n > 7;
  const rows = Math.ceil(n / 2);
  data.items.forEach((it, i) => {
    // 위에서 시작해 시계 방향으로 고르게 (둘이면 좌우)
    const ang = n === 1 ? -Math.PI / 2 : n === 2 ? Math.PI * i : -Math.PI / 2 + (i / n) * Math.PI * 2;
    const px = listed ? cx + (i < rows ? -1 : 1) * 175 : cx + Math.cos(ang) * (n === 2 ? 158 : R * 1.25);
    const py = listed ? cy + ((i % rows) - (rows - 1) / 2) * 46 : cy + Math.sin(ang) * R * 0.82;
    const b = el('button', {
      className: `pill${it.why ? ' no' : ''}`, type: 'button',
      style: `left:${px}px;top:${py}px;--cx:${cx}px;--cy:${cy}px;animation-delay:${i * 25}ms`,
      onclick: e => { e.stopPropagation(); if (it.why) return; it.run(); closePie(); clearFocus(); },
    }, el('i', { textContent: it.icon }), el('span', {}, it.label, it.why ? el('small', { textContent: it.why }) : null));
    if (it.tip) {
      b.onmouseenter = () => { const t = $('tip'); t.replaceChildren(effText(it.tip)); t.style.left = `${cx}px`; t.style.top = `${cy + 34}px`; t.hidden = false; };
      b.onmouseleave = () => { $('tip').hidden = true; };
    }
    kids.push(b);
  });
  pie.replaceChildren(...kids);
  pie.hidden = false;
}
// 메뉴 밖을 누르면 닫는다 (화면 바깥 빈 곳은 아래 3D 화면이 받는다)
$('pie').addEventListener('pointerdown', e => { if (e.target.id === 'pie') { closePie(); clearFocus(); } });
window.addEventListener('resize', closePie);
$('helpBtn').onclick = () => { $('help').hidden = !$('help').hidden; };

/* ---------- 낮과 밤 ---------- */

const TINT = [[4, '#7480b4'], [6, '#d9bcc4'], [7.5, '#ffffff'], [17, '#ffffff'], [18.5, '#f9d0a8'], [20, '#9a9cc8'], [22, '#7480b4'], [29, '#7480b4']];
function tint() {
  let h = sim.hour;
  if (h < 4) h += 24;
  let a = TINT[0];
  let b = TINT[TINT.length - 1];
  for (let i = 0; i + 1 < TINT.length; i++) if (h >= TINT[i][0] && h <= TINT[i + 1][0]) { a = TINT[i]; b = TINT[i + 1]; break; }
  const u = (h - a[0]) / (b[0] - a[0] || 1);
  const ca = new THREE.Color(a[1]);
  ca.lerp(new THREE.Color(b[1]), u);
  $('tint').style.background = `#${ca.getHexString()}`;
}

/* ---------- 매 프레임 ---------- */

// 마을은 화면을 보지 않아도 산다: 시뮬레이션은 화면 그리기와 따로 0.05초마다 돈다
// 화면은 그보다 자주(초당 60번) 그리므로, 캐릭터는 직전 계산과 이번 계산 사이를 이어서 그린다 (drawActor의 보간)
let simLast = performance.now();
let simSpan = 50;
setInterval(() => {
  const now = performance.now();
  for (const c of sim.chars) {
    c.prevX = c.x + (c.ox || 0);
    c.prevZ = c.z + (c.oz || 0);
  }
  sim.update(Math.min(0.25, (now - simLast) / 1000));
  simSpan = Math.max(16, now - simLast);
  simLast = now;
}, 50);
// 직전 계산부터 지금까지 지난 비율 (0~1)
const simAlpha = now => Math.max(0, Math.min(1, (now - simLast) / simSpan));

let last = performance.now();
const startAt = performance.now();
const shotsLeft = [1200, 4500];
let uiAt = 0;
let saveAt = 0;
// 멀리 있는 장소와 숲은 그리지 않는다
const actFx = new ActFx(scene);
let cullAt = 0;
function cull(now) {
  if (now - cullAt < 400) return;
  cullAt = now;
  for (const place of world.placeGroups) place.group.visible = PerfTune.near(place, camera);
  MapDressing.cull(view);
  WeedingField.update(sim);
}
function draw(now) {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
  last = now;
  moveKeys(dt);
  const time = now / 1000;
  PerfTune.frame(view);
  CombatMoves.install(scene, camera, sim);
  for (const a of actors) {
    drawActor(a, time, dt);
    CombatMoves.after(a, time, dt);
  }
  CombatMoves.update(dt);
  placeCamera(dt);
  Polish.frame(time);
  Interiors.update({ focus: view, camera, sim, time, dt });
  actFx.update(sim, world, time);
  YoroiKnights.update(sim, camera, time, dt);
  WildZones.frame(sim, time, dt, view);
  UsagiSleep.frame(sim, actors, scene);
  WeedingField.frame(sim, actors, scene, time);
  TrainingGround.frame(sim, time, dt);
  RescueHeli.frame(sim, scene, time, dt);
  Handoff.frame(sim, scene);
  Pair.frame(sim, scene);
  rackBoards.forEach((b, i) => { b.visible = sim.labor.plates[i].state === 'posted'; });
  cull(now);
  drawFocusRing(time);
  drawFountains(time);
  // 얼굴 사진은 얼굴 그림이 읽힌 뒤 찍는다 (한 번 더 찍어 늦게 읽힌 얼굴도 채운다)
  if (shotsLeft.length && now - startAt > shotsLeft[0]) {
    shotsLeft.shift();
    shootPortraits();
  }
  if (!shotsLeft.length && now - (frame.moodAt || 0) > 1500) {
    frame.moodAt = now;
    const changed = actors.filter(a => !a.c.extra && !a.c.hidden && !a.c.walking && a.portraitMood !== sim.persona.tier(a.c) && a.c.clip !== 'sleep_breathe' && a.c.clip !== 'hammock_sway').slice(0, 2);
    if (changed.length) shootPortraits(changed);
  }
  if (now - uiAt > 300) {
    uiAt = now;
    renderAll();
    tint();
  }
  if (now - saveAt > 10000) {
    saveAt = now;
    try { localStorage.setItem('chiikawa-sims-save', sim.save()); } catch (e) { /* 저장 실패는 다음에 다시 */ }
  }
  renderer.render(scene, camera);
}
function frame(now) {
  draw(now);
  requestAnimationFrame(frame);
}
window.addEventListener('beforeunload', () => { try { localStorage.setItem('chiikawa-sims-save', sim.save()); } catch (e) { /* 무시 */ } });

Polish.install({ scene, camera, world });
PerfTune.install({ renderer, scene, camera, world, actors, sim });
$('loading').hidden = true;
renderAll();
requestAnimationFrame(frame);
// 손으로 잡는 동작(연필·술잔)은 처음 쓸 때 팔 궤적을 푸느라 잠깐 멈칫한다.
// 주연이 할 수 있는 상호작용에 든 그 동작은 시작 직후 하나씩 미리 풀어 둔다 (한 번에 하나, 사이사이 화면을 그리게)
function prebakeGrips() {
  const jobs = [];
  for (const a of actors) {
    if (a.c.extra) continue;
    const clips = new Set();
    for (const x of sim.interactions) {
      if (x.only && !x.only.includes(a.c.id)) continue;
      for (const st of x.steps) if (st.clip && ANIMS[st.clip] && (ANIMS[st.clip].grips || []).length) clips.add(st.clip);
    }
    for (const id of clips) jobs.push([a, id]);
  }
  const next = () => {
    const job = jobs.shift();
    if (!job) return;
    const [a, id] = job;
    if (a.built && !a.c.monster) AnimRig.poseAt(a, ANIMS[id], 0, { noSeat: true });
    setTimeout(next, 500);
  };
  setTimeout(next, 4000);
}
prebakeGrips();

if (window.TestMode) { TestMode.sim = sim; TestMode.selected = () => selected; }
window.game = { sim, actors, view, world, nav, scene, camera, draw, renderer, ready: true, readyDone: true, setFollow: v => { follow = v; }, setSelected: id => { selected = id; } };
TitleScreen.start(window.game);
})();
window.game = { world, scene, ready: true, readyDone: false };
