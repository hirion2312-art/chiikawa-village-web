'use strict';

// 마을 화면과 촬영 세계가 함께 쓰는 인물 표현: 이름표, 말풍선, 소품, 동작
// npc.js가 쓰는 이름표
function makeNameTag(text, background = 'rgba(255, 252, 240, .94)') {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = '700 34px "Malgun Gothic", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = Math.min(248, g.measureText(text).width + 34);
  g.fillStyle = background;
  g.beginPath();
  g.roundRect(128 - w / 2, 6, w, 52, 24);
  g.fill();
  g.fillStyle = '#4a3230';
  g.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false, transparent: true }));
  sprite.scale.set(2.4, 0.6, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/* ---------- 행동에 맞는 소품 ---------- */

const propMat = color => new THREE.MeshToonMaterial({ color });
function makeProp(act, rainy) {
  const group = new THREE.Group();
  const add = (geo, color, x, y, z) => {
    const m = new THREE.Mesh(geo, propMat(color));
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const stick = (color, x, y, z, length, tilt) => {
    const m = add(new THREE.CylinderGeometry(0.035, 0.035, length, 8), color, x, y, z);
    m.rotation.x = tilt;
    return m;
  };
  if (act === 'eat') {
    add(new THREE.CylinderGeometry(0.34, 0.2, 0.26, 16), '#e8dcc2', 0, 0.86, 0.72);
    add(new THREE.SphereGeometry(0.28, 12, 8), '#fffdf2', 0, 0.98, 0.72).scale.y = 0.5;
  } else if (act === 'study') {
    add(new THREE.BoxGeometry(0.72, 0.08, 0.52), '#8fb6d6', 0, 0.86, 0.74).rotation.x = -0.7;
  } else if (act === 'letter') {
    add(new THREE.BoxGeometry(0.62, 0.42, 0.03), '#fff8e6', 0, 1.02, 0.76).rotation.x = -0.35;
  } else if (act === 'weed') {
    for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.09, 0.5, 6), '#8cc26c', (i - 2) * 0.16, 0.25, 0.86);
    // 뽑혀 튀어 오르는 풀
    group.userData.pop = add(new THREE.ConeGeometry(0.12, 0.5, 6), '#7ab35c', 0, 0.3, 0.9);
  } else if (act === 'hunt') {
    stick('#a97c50', 0.62, 1, 0.45, 2.1, 1.15);
    add(new THREE.TorusGeometry(0.2, 0.035, 8, 16, Math.PI), '#7c8388', 0.62, 1.42, 1.42);
    // 앞에서 달아나는 작은 괴이
    const monster = add(new THREE.SphereGeometry(0.72, 16, 12), '#5d4b73', 0, 0.7, 2.7);
    add(new THREE.SphereGeometry(0.1, 8, 8), '#fffdf2', -0.24, 0.92, 2.1);
    add(new THREE.SphereGeometry(0.1, 8, 8), '#fffdf2', 0.24, 0.92, 2.1);
    group.userData.monster = monster;
  } else if (act === 'confront') {
    stick('#a97c50', 0.62, 1, 0.45, 2.1, 1.15);
    add(new THREE.TorusGeometry(0.2, 0.035, 8, 16, Math.PI), '#7c8388', 0.62, 1.42, 1.42);
  } else if (act === 'read') {
    add(new THREE.BoxGeometry(0.7, 0.08, 0.5), '#e6a79a', 0, 0.86, 0.74).rotation.x = -0.9;
  } else if (act === 'browse') {
    add(new THREE.CylinderGeometry(0.34, 0.26, 0.42, 12), '#d7b27e', 0.84, 0.55, 0.15);
  } else if (act === 'type') {
    add(new THREE.BoxGeometry(0.9, 0.08, 0.45), '#6f7a84', 0, 0.62, 0.9);
    add(new THREE.BoxGeometry(0.9, 0.6, 0.06), '#bfe2f2', 0, 1, 1.15);
  } else if (act === 'drink') {
    add(new THREE.CylinderGeometry(0.17, 0.14, 0.32, 12), '#fffdf2', 0.34, 0.92, 0.72);
  } else if (act === 'bite') {
    add(new THREE.SphereGeometry(0.2, 10, 8), '#f6d986', 0, 0.95, 0.72);
  } else if (act === 'throw') {
    group.userData.stone = add(new THREE.SphereGeometry(0.16, 10, 8), '#a39d92', 0.7, 0.8, 0.6);
  } else if (act === 'peek' || act === 'sneak') {
    // 빈손으로 살핀다
  } else if (act === 'gather') {
    add(new THREE.CylinderGeometry(0.4, 0.28, 0.42, 14), '#c9a36e', 0.82, 0.5, 0.25);
    add(new THREE.SphereGeometry(0.3, 10, 8), '#9dc77d', 0.82, 0.74, 0.25).scale.y = 0.55;
  } else if (act === 'delivery') {
    add(new THREE.BoxGeometry(0.9, 0.62, 0.62), '#d7b27e', 0, 1.02, 0.82);
    add(new THREE.BoxGeometry(0.92, 0.08, 0.2), '#a97c50', 0, 1.34, 0.82);
  } else if (act === 'sweep') {
    const broom = new THREE.Group();
    broom.position.set(0.7, 0.9, 0.4);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), propMat('#a97c50'));
    pole.position.y = -0.2;
    const brush = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 8), propMat('#d8b673'));
    brush.position.y = -1.1;
    broom.add(pole, brush);
    group.add(broom);
    group.userData.broom = broom;
  } else if (act === 'work') {
    add(new THREE.CylinderGeometry(0.3, 0.2, 0.2, 14), '#fffdf2', 0, 0.98, 0.76);
    add(new THREE.CylinderGeometry(0.3, 0.2, 0.2, 14), '#fffdf2', 0, 1.14, 0.76);
  } else if (act === 'fish') {
    stick('#a97c50', 0.45, 1.3, 1.2, 2.3, 1);
    group.userData.float = add(new THREE.SphereGeometry(0.1, 8, 8), '#e0587a', 0.45, 0.2, 3.6);
  } else if (act === 'play') {
    group.userData.ball = add(new THREE.SphereGeometry(0.34, 14, 10), '#e88f7a', 0, 0.34, 1.3);
  } else if (act === 'onsen') {
    add(new THREE.BoxGeometry(0.8, 0.1, 0.5), '#ffffff', 0, 2.36, 0);
  } else if (act === 'shop') {
    add(new THREE.BoxGeometry(0.42, 0.5, 0.2), '#f2d6a2', 0.82, 0.56, 0.2);
  }
  // 손에 드는 물건은 얼굴을 가리지 않게 배 앞으로 내린다
  if (['eat', 'study', 'letter', 'delivery', 'work'].includes(act)) {
    group.position.y = -0.42;
    group.position.z = 0.08;
    group.scale.setScalar(0.85);
  }
  if (rainy) {
    add(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 6), '#7a5a42', 0.6, 1.5, 0.2);
    const top = add(new THREE.ConeGeometry(1.1, 0.46, 14), '#f6bcc8', 0.6, 2.6, 0.2);
    top.material.side = THREE.DoubleSide;
  }
  return group;
}

function textSprite(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 150;
  const g = c.getContext('2d');
  g.font = '500 28px "Malgun Gothic", sans-serif';
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (g.measureText(`${line} ${word}`).width > 460 && line) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  lines.push(line);
  const shown = lines.slice(0, 3);
  const h = shown.length * 38 + 22;
  // 말 길이에 맞춘 풍선. 짧은 말이 길쭉한 판에 담기지 않게 한다
  const w = Math.min(504, Math.max(90, ...shown.map(l => g.measureText(l).width)) + 44);
  const left = (512 - w) / 2;
  g.fillStyle = 'rgba(255, 252, 240, .96)';
  g.strokeStyle = '#4a3230';
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(left, 4, w, h, 22);
  g.fill();
  g.stroke();
  g.fillStyle = '#4a3230';
  g.textBaseline = 'top';
  shown.forEach((l, i) => g.fillText(l, left + 22, 15 + i * 38));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false, transparent: true }));
  sprite.scale.set(5.2, 1.52, 1);
  sprite.center.set(0.5, 1 - h / 150);
  sprite.renderOrder = 11;
  return sprite;
}

// 도착한 뒤의 동작. root 위치와 몸의 움직임만 바꾼다
// 음식 그림을 머리 위 생각 풍선으로 띄운다 (Cooking & Farming Pack, CC0)
const foodMaps = new Map();
function foodSprite(dish) {
  if (!foodMaps.has(dish)) {
    const tex = new THREE.TextureLoader().load(`assets/food/${dish}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    foodMaps.set(dish, tex);
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: foodMaps.get(dish), depthTest: false, fog: false, transparent: true }));
  sprite.scale.set(1, 1, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// 촬영 세계와 진짜 세계의 현장에 놓이는 물건
const toon = color => new THREE.MeshToonMaterial({ color });
function inkShell(mesh, grow = 1.08) {
  const shell = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x4a3230, side: THREE.BackSide }));
  shell.scale.setScalar(grow);
  mesh.add(shell);
  return mesh;
}
function buildThingMesh(thing) {
  const g = new THREE.Group();
  const add = (geo, color, x, y, z, outline = true) => {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    if (outline) inkShell(m);
    g.add(m);
    return m;
  };
  if (thing.type === 'riceball') {
    add(new THREE.SphereGeometry(0.55, 16, 12), '#fffdf2', 0, 0.5, 0).scale.set(1, 0.9, 0.8);
    add(new THREE.BoxGeometry(0.45, 0.42, 0.2), '#3f4a3c', 0, 0.28, 0.42, false);
  } else if (thing.type === 'ramen') {
    add(new THREE.CylinderGeometry(0.85, 0.5, 0.65, 20), '#d9534f', 0, 0.35, 0);
    add(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 20), '#f2d48a', 0, 0.66, 0, false);
    add(new THREE.SphereGeometry(0.2, 10, 8), '#fff8e6', 0.25, 0.72, 0.1, false);
    add(new THREE.BoxGeometry(0.34, 0.03, 0.2), '#c98a5a', -0.2, 0.71, -0.15, false);
  } else if (thing.type === 'pudding') {
    add(new THREE.CylinderGeometry(0.42, 0.56, 0.6, 18), '#f7d774', 0, 0.3, 0);
    add(new THREE.CylinderGeometry(0.4, 0.42, 0.12, 18), '#9a5b2b', 0, 0.65, 0, false);
  } else if (thing.type === 'feast') {
    add(new THREE.CylinderGeometry(3, 3.4, 0.5, 24), '#e8dcc2', 0, 0.25, 0);
    add(new THREE.SphereGeometry(2.7, 22, 14), '#fffdf2', 0, 0.6, 0).scale.y = 0.75;
  } else if (thing.kind === 'threat') {
    const big = thing.type === 'bigmonster' ? 2 : 1;
    add(new THREE.SphereGeometry(0.85 * big, 18, 14), '#5d4b73', 0, 0.8 * big, 0).scale.y = 0.95;
    for (const s of [-1, 1]) {
      add(new THREE.SphereGeometry(0.17 * big, 10, 8), '#fffdf2', s * 0.32 * big, 1.0 * big, 0.68 * big, false);
      add(new THREE.SphereGeometry(0.08 * big, 8, 8), '#201526', s * 0.32 * big, 1.0 * big, 0.83 * big, false);
    }
  } else if (thing.type === 'box') {
    add(new THREE.BoxGeometry(1.5, 1.2, 1.5), '#c9a57c', 0, 0.6, 0);
    add(new THREE.BoxGeometry(1.6, 0.14, 0.3), '#e0587a', 0, 1.2, 0, false);
    add(new THREE.BoxGeometry(0.3, 0.14, 1.6), '#e0587a', 0, 1.2, 0, false);
  } else if (thing.type === 'ball') {
    add(new THREE.SphereGeometry(0.42, 18, 14), '#e88f7a', 0, 0.42, 0);
  } else if (thing.type === 'coin') {
    const coin = add(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 18), '#f2c230', 0, 0.45, 0);
    coin.rotation.x = Math.PI / 2;
  }
  return g;
}

const EMOTES = { weed: '!', hunt: '!!', confront: '!!', play: '♪', sweep: '♪', fish: '…', study: '?', read: '?', browse: '♡', type: '…', eat: '♡', drink: '♡', bite: '♡', dance: '♪', pray: '…', peek: '?', sneak: '!', sit: '♪', work: '!', exercise: '♪', delivery: '!', gather: '♪', friend: '♪', festival: '♪' };
const emoteMaps = new Map();
function emoteSprite(mark) {
  if (!emoteMaps.has(mark)) {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const g = c.getContext('2d');
    g.font = '700 70px "Malgun Gothic", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = '#fffaf0';
    g.fillStyle = '#c9534f';
    g.strokeText(mark, 48, 50);
    g.fillText(mark, 48, 50);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    emoteMaps.set(mark, tex);
  }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteMaps.get(mark), depthTest: false, fog: false, transparent: true }));
  sprite.scale.set(0.9, 0.9, 1);
  sprite.renderOrder = 10;
  return sprite;
}
function swingArms(actor, speed, amount) {
  for (const arm of actor.built.arms) arm.joint.quaternion.setFromAxisAngle(arm.normal, Math.sin(speed) * amount);
}

function playAct(actor, act, face, time) {
  const model = actor.built.model;
  const { position, rotation, scale } = actor.base;
  model.position.copy(position);
  model.rotation.copy(rotation);
  model.scale.copy(scale);
  const t = time + actor.offset;
  const parts = actor.prop ? actor.prop.userData : {};
  if (act === 'weed') {
    // 온몸으로 당겼다가 뒤로 젖히며 뽑는다
    model.rotation.x += 0.2 + Math.sin(t * 5) * 0.3;
    model.scale.y *= 0.92 + Math.sin(t * 5) * 0.05;
    swingArms(actor, t * 5, 0.7);
    if (parts.pop) {
      const u = (t * 0.8) % 1;
      parts.pop.position.set(Math.sin(t) * 0.5, 0.3 + Math.sin(u * Math.PI) * 1.8, 0.9 - u * 1.2);
      parts.pop.rotation.x = u * 8;
    }
  } else if (act === 'hunt') {
    model.position.z += Math.max(0, Math.sin(t * 6)) * 0.55;
    model.position.y += Math.abs(Math.sin(t * 3)) * 0.25;
    swingArms(actor, t * 6, 0.8);
    if (parts.monster) {
      parts.monster.position.y = 0.7 + Math.abs(Math.sin(t * 5)) * 0.8;
      parts.monster.position.x = Math.sin(t * 2) * 0.8;
    }
  } else if (act === 'gather') {
    model.rotation.x += 0.45 + Math.sin(t * 2.4) * 0.25;
    swingArms(actor, t * 4, 0.5);
  } else if (act === 'sweep') {
    model.rotation.y += Math.sin(t * 3.4) * 0.3;
    swingArms(actor, t * 3.4, 0.5);
    if (parts.broom) parts.broom.rotation.x = Math.sin(t * 3.4) * 0.6;
  } else if (act === 'work') {
    model.rotation.x += 0.1 + Math.abs(Math.sin(t * 4)) * 0.15;
    model.position.y += Math.abs(Math.sin(t * 4)) * 0.08;
    swingArms(actor, t * 8, 0.45);
  } else if (act === 'delivery' || act === 'board') {
    model.rotation.z += Math.sin(t * 2) * 0.05;
  } else if (act === 'fish') {
    model.rotation.x += Math.sin(t * 0.9) * 0.05;
    if (parts.float) parts.float.position.y = 0.2 + Math.sin(t * 2.2) * 0.07;
  } else if (act === 'play') {
    model.position.y += Math.abs(Math.sin(t * 5)) * 0.5;
    swingArms(actor, t * 7, 0.9);
    if (parts.ball) parts.ball.position.y = 0.34 + Math.abs(Math.sin(t * 4)) * 1.1;
  } else if (act === 'confront') {
    model.position.z += Math.max(0, Math.sin(t * 7)) * 0.5;
    swingArms(actor, t * 7, 0.9);
  } else if (act === 'sit') {
    // 앉으면 몸이 낮아지고 발을 까딱인다
    model.scale.y *= 0.86;
    model.rotation.x += Math.sin(t * 2.2) * 0.03;
  } else if (act === 'read') {
    model.rotation.x += 0.14 + Math.sin(t * 1.2) * 0.04;
    model.rotation.y += Math.sin(t * 0.5) * 0.15;
  } else if (act === 'browse') {
    model.rotation.y += Math.sin(t * 1.1) * 0.5;
    model.rotation.x += 0.1;
    swingArms(actor, t * 2, 0.4);
  } else if (act === 'type') {
    model.rotation.x += 0.1;
    swingArms(actor, t * 16, 0.28);
  } else if (act === 'drink') {
    model.rotation.x -= Math.max(0, Math.sin(t * 1.4)) * 0.28;
  } else if (act === 'bite') {
    model.rotation.x += 0.1 + Math.abs(Math.sin(t * 6)) * 0.28;
    model.position.z += Math.abs(Math.sin(t * 6)) * 0.14;
  } else if (act === 'dance') {
    model.position.y += Math.abs(Math.sin(t * 4.4)) * 0.42;
    model.rotation.z += Math.sin(t * 2.2) * 0.2;
    model.rotation.y += Math.sin(t * 1.1) * 0.8;
    swingArms(actor, t * 8.8, 1.1);
  } else if (act === 'pray') {
    model.rotation.x += 0.22 + Math.max(0, Math.sin(t * 0.9)) * 0.28;
    swingArms(actor, t * (Math.sin(t * 0.45) > 0.6 ? 14 : 1), 0.35);
  } else if (act === 'throw') {
    const u = (t * 0.55) % 1;
    model.rotation.x -= u < 0.2 ? u * 2 : 0;
    swingArms(actor, u * 8, 1);
    if (parts.stone) {
      parts.stone.position.set(0.7 * (1 - u), 0.8 + Math.sin(u * Math.PI) * 2, 0.6 + u * 7);
      parts.stone.visible = u < 0.85;
    }
  } else if (act === 'peek') {
    model.rotation.x += 0.42 + Math.sin(t * 1.5) * 0.12;
    model.position.z += 0.2 + Math.sin(t * 1.5) * 0.2;
  } else if (act === 'sneak') {
    model.scale.y *= 0.82;
    model.rotation.y += Math.sin(t * 2.6) * 0.65;
    model.position.y += Math.abs(Math.sin(t * 4)) * 0.05;
  } else if (act === 'talk') {
    model.position.y += Math.abs(Math.sin(t * 3)) * 0.07;
    swingArms(actor, t * 3.4, 0.5);
  } else if (act === 'bath') {
    model.position.y -= 0.72;
    model.rotation.z += Math.sin(t * 0.8) * 0.06;
  } else if (act === 'poke') {
    model.rotation.x += 0.3 + Math.sin(t * 5) * 0.08;
    swingArms(actor, t * 5, 0.5);
  } else if (act === 'wave') {
    model.position.y += Math.abs(Math.sin(t * 5)) * 0.22;
    swingArms(actor, t * 9, 1.1);
  } else if (act === 'comfort') {
    model.rotation.x += 0.16 + Math.sin(t * 3.2) * 0.06;
    swingArms(actor, t * 3.2, 0.5);
  } else if (act === 'cry') {
    model.rotation.z += Math.sin(t * 17) * 0.03;
    model.scale.y *= 0.95 + Math.sin(t * 5) * 0.02;
  } else if (act === 'nap') {
    // 그 자리에서 드러눕는다
    model.rotation.x -= 1.45;
    model.position.y += 0.75 * scale.y;
    model.scale.y *= 1 + Math.sin(t * 1.6) * 0.02;
  } else if (act === 'exercise') {
    // 체조는 모두 같은 박자로 한다
    model.position.y += Math.abs(Math.sin(time * 2.4)) * 0.4;
    swingArms(actor, time * 2.4, 1.1);
  } else if (act === 'friend') {
    model.position.y += Math.abs(Math.sin(t * 3)) * 0.14;
    swingArms(actor, t * 4, 0.45);
  } else if (act === 'gaze') {
    model.rotation.x -= 0.2;
  } else if (act === 'eat') {
    model.rotation.x += 0.12 + Math.max(0, Math.sin(t * 2.6)) * 0.1;
    swingArms(actor, t * 5.2, 0.3);
  } else if (act === 'study' || act === 'letter') {
    model.rotation.x += 0.1 + Math.sin(t * 0.7) * 0.03;
  } else if (act === 'festival' || face === 'excited' || face === 'joy') {
    model.position.y += Math.abs(Math.sin(t * 3.2)) * 0.32;
  } else if (face === 'cry' || face === 'wail') {
    model.rotation.z += Math.sin(t * 16) * 0.03;
  } else if (act === 'onsen') {
    model.position.y -= 0.55;
  }
}

