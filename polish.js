// 전체 다듬기: 동작 사이를 부드럽게 잇고, 세계에 바람·물결·하늘·구름·풀을 더한다
(function (root) {
  const WIND = { value: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- 동작 전환: 앞 자세에서 새 자세로 짧게 섞는다 ---------- */

  const FADE = 0.22;
  const ONE = { squash: 1, footLS: 1, footRS: 1, footLW: 1, footRW: 1 };
  const ARM = /^arm/;
  const baseOf = k => {
    if (k in ONE) return 1;
    if (typeof ANIM_DEFAULTS !== 'undefined' && k in ANIM_DEFAULTS) return ANIM_DEFAULTS[k];
    return 0;
  };
  function blend(a, id, pose) {
    const now = performance.now() / 1000;
    let st = a.polish;
    if (!st) st = a.polish = { id, last: {}, from: null, t0: 0, at: -1 };
    // 한동안 클립을 안 썼으면(걷기 등) 이어 붙일 앞 자세가 없다
    const fresh = now - st.at < 0.12;
    if (st.id !== id) {
      st.from = fresh ? { ...st.last } : null;
      st.t0 = now;
      st.id = id;
    }
    st.at = now;
    if (st.from) {
      const u = (now - st.t0) / FADE;
      if (u >= 1) st.from = null;
      else {
        const e = u * u * (3 - 2 * u);
        // 손에 든 것이 있으면 팔은 섞지 않는다 (소품이 손에서 떨어져 보이지 않게)
        const holding = !!(a.c && a.c.prop) || !!a.clipProps;
        for (const k in pose) {
          const v = pose[k];
          if (typeof v !== 'number' || k === 't') continue;
          if (holding && ARM.test(k)) continue;
          const f = k in st.from ? st.from[k] : baseOf(k);
          pose[k] = f + (v - f) * e;
        }
        for (const k in st.from) {
          if (k in pose || (holding && ARM.test(k))) continue;
          const b = baseOf(k);
          pose[k] = st.from[k] + (b - st.from[k]) * e;
        }
      }
    }
    const last = st.last;
    for (const k in last) delete last[k];
    for (const k in pose) if (typeof pose[k] === 'number' && k !== 't') last[k] = pose[k];
    return pose;
  }

  /* ---------- 바람: 나뭇잎·야자잎·풀이 흔들린다 ---------- */

  const SWAY_K = {
    blob: '0.6 + 0.4 * position.y',
    frond: 'dot(position.xz, position.xz) * 0.2',
    grass: 'clamp(position.y * 4.5, 0.0, 1.6)',
  };
  const swayCode = (target, kind) => `
    float swPh = 0.0;
    #ifdef USE_INSTANCING
      swPh = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.29;
    #endif
    float swK = ${SWAY_K[kind]};
    ${target}.x += (sin(windT * 1.15 + swPh) * 0.05 + sin(windT * 2.9 + swPh * 1.7 + position.y * 2.5) * 0.012) * swK;
    ${target}.z += cos(windT * 0.95 + swPh * 1.3) * 0.04 * swK;
    ${target}.y += sin(windT * 1.7 + swPh * 0.6) * 0.014 * swK;
  `;
  // 기본 재질(툰·램버트·베이직)에 흔들림을 넣는다
  function sway(material, kind = 'blob') {
    material.onBeforeCompile = shader => {
      shader.uniforms.windT = WIND;
      shader.vertexShader = 'uniform float windT;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' + swayCode('transformed', kind),
      );
    };
    material.customProgramCacheKey = () => 'polish-sway-' + kind;
    return material;
  }
  // 손그림 외곽선(makeInk)에도 같은 흔들림을 넣어 선이 잎과 함께 움직이게 한다
  function swayInk(material, kind = 'blob') {
    material.uniforms.windT = WIND;
    material.vertexShader = 'uniform float windT;\n' + material.vertexShader.replace(
      'vec4 worldish = vec4(position, 1.0);',
      'vec3 swP = position;\n' + swayCode('swP', kind) + '\nvec4 worldish = vec4(swP, 1.0);',
    );
    material.needsUpdate = true;
    return material;
  }

  /* ---------- 그림 재료 ---------- */

  function tileTex(size, paint, repeat) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    // 이음매가 없게, 가장자리를 넘는 그림은 반대편에도 그린다
    const wrap = (x, y, r, fn) => {
      for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
        if (x + ox + r < 0 || x + ox - r > size || y + oy + r < 0 || y + oy - r > size) continue;
        fn(x + ox, y + oy);
      }
    };
    paint(g, size, wrap);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (repeat) tex.repeat.set(repeat, repeat);
    return tex;
  }
  const cloudShadeTex = () => tileTex(256, (g, s, wrap) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const x = rnd(0, s), y = rnd(0, s), r = rnd(26, 62);
      wrap(x, y, r, (px, py) => {
        const grad = g.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, 'rgba(255,255,255,0.5)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(px - r, py - r, r * 2, r * 2);
      });
    }
  });
  const grainTex = () => tileTex(128, (g, s, wrap) => {
    g.fillStyle = 'rgb(128,128,128)';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 520; i++) {
      const x = rnd(0, s), y = rnd(0, s), r = rnd(1, 4.5);
      const v = Math.random() < 0.5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},${rnd(0.08, 0.28)})`;
      wrap(x, y, r, (px, py) => {
        g.beginPath();
        g.ellipse(px, py, r, r * rnd(0.4, 1), rnd(0, 3), 0, Math.PI * 2);
        g.fill();
      });
    }
  });
  const rippleTex = () => tileTex(256, (g, s, wrap) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, s, s);
    g.lineCap = 'round';
    for (let i = 0; i < 34; i++) {
      const x = rnd(0, s), y = rnd(0, s), w = rnd(14, 40);
      g.strokeStyle = `rgba(255,255,255,${rnd(0.35, 0.9)})`;
      g.lineWidth = rnd(1.4, 3);
      wrap(x, y, w, (px, py) => {
        g.beginPath();
        g.moveTo(px - w, py);
        g.quadraticCurveTo(px, py - w * 0.22, px + w, py);
        g.stroke();
      });
    }
  });

  /* ---------- 땅: 구름 그림자가 흘러가고, 가까이서 보면 종이 결이 보인다 ---------- */

  function patchGround(ground) {
    const m = ground.material;
    const shade = cloudShadeTex();
    const grain = grainTex();
    m.onBeforeCompile = shader => {
      shader.uniforms.windT = WIND;
      shader.uniforms.polCloud = { value: shade };
      shader.uniforms.polGrain = { value: grain };
      shader.vertexShader = 'varying vec2 vPolXZ;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvPolXZ = (modelMatrix * vec4(position, 1.0)).xz;',
      );
      shader.fragmentShader = 'uniform float windT;\nuniform sampler2D polCloud;\nuniform sampler2D polGrain;\nvarying vec2 vPolXZ;\n' + shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float polC = texture2D(polCloud, vPolXZ * 0.0035 + windT * vec2(0.0055, 0.0026)).r;
        diffuseColor.rgb *= 1.0 - 0.12 * smoothstep(0.42, 0.8, polC);
        diffuseColor.rgb *= 0.955 + 0.09 * texture2D(polGrain, vPolXZ * 0.21).r;`,
      );
    };
    m.customProgramCacheKey = () => 'polish-ground';
    m.needsUpdate = true;
  }

  /* ---------- 바다: 잔물결이 반짝이며 흐른다 ---------- */

  let seaTex = null;
  function patchSea(sea) {
    const size = sea.geometry.parameters.width || 1920;
    seaTex = rippleTex();
    seaTex.repeat.set(size / 26, size / 26);
    const m = sea.material;
    m.emissive = new THREE.Color(0xffffff);
    m.emissiveMap = seaTex;
    m.emissiveIntensity = 0.3;
    m.needsUpdate = true;
  }

  /* ---------- 하늘과 구름 ---------- */

  let sky = null;
  let clouds = null;
  const still = o => { o.raycast = () => {}; o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; return o; };
  function buildSky(scene) {
    sky = still(new THREE.Mesh(
      new THREE.SphereGeometry(1150, 32, 18),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          low: { value: new THREE.Color(0xe4f2ee) },
          mid: { value: new THREE.Color(0xbfe4f5) },
          top: { value: new THREE.Color(0x86c8ee) },
        },
        vertexShader: 'varying float vUp;\nvoid main() { vUp = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
          uniform vec3 low; uniform vec3 mid; uniform vec3 top;
          varying float vUp;
          void main() {
            float h = clamp(vUp, 0.0, 1.0);
            vec3 c = mix(low, mid, smoothstep(0.0, 0.16, h));
            c = mix(c, top, smoothstep(0.12, 0.7, h));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    ));
    sky.renderOrder = -10;
    scene.add(sky);

    // 뭉게구름: 멀리 지평선 위에만 떠서 마을을 가리지 않는다
    const puffs = [];
    for (let i = 0; i < 15; i++) {
      const ang = (i / 15) * Math.PI * 2 + rnd(-0.14, 0.14);
      const rad = rnd(640, 930);
      const cx = Math.sin(ang) * rad, cz = Math.cos(ang) * rad, cy = rnd(95, 250);
      const size = rnd(0.75, 1.5);
      const n = 5 + Math.floor(Math.random() * 4);
      // 구름은 보는 쪽에서 옆으로 길게 늘어선다
      const tx = Math.cos(ang), tz = -Math.sin(ang);
      for (let k = 0; k < n; k++) {
        const along = (k - (n - 1) / 2) * 30 * size + rnd(-8, 8);
        const mid = 1 - Math.abs(k - (n - 1) / 2) / n;
        const s = (22 + 26 * mid) * size * rnd(0.85, 1.15);
        puffs.push({ x: cx + tx * along, y: cy + s * 0.32 * rnd(0.7, 1.2), z: cz + tz * along, sx: s, sy: s * rnd(0.52, 0.68), sz: s * 0.8 });
      }
    }
    const ramp = typeof toonRampWorld !== 'undefined' ? toonRampWorld : null;
    const mat = new THREE.MeshToonMaterial({ color: 0xffffff, emissive: 0x5a6672, fog: false });
    if (ramp) mat.gradientMap = ramp;
    clouds = still(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), mat, puffs.length));
    const d = new THREE.Object3D();
    puffs.forEach((p, i) => {
      d.position.set(p.x, p.y, p.z);
      d.scale.set(p.sx, p.sy, p.sz);
      d.updateMatrix();
      clouds.setMatrixAt(i, d.matrix);
    });
    scene.add(clouds);
  }

  /* ---------- 풀포기와 들꽃: 장소 둘레 풀밭에 심는다 ---------- */

  function tuftGeometry() {
    const verts = [];
    const blades = 6;
    for (let i = 0; i < blades; i++) {
      const a = (i / blades) * Math.PI * 2 + rnd(-0.3, 0.3);
      const out = rnd(0.02, 0.07);
      const h = rnd(0.15, 0.26);
      const lean = rnd(0.03, 0.1);
      const bx = Math.cos(a) * out, bz = Math.sin(a) * out;
      const sx = -Math.sin(a) * 0.028, sz = Math.cos(a) * 0.028;
      verts.push(bx - sx, 0, bz - sz, bx + sx, 0, bz + sz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  }
  function plantGrass(scene, world, ground) {
    const places = typeof PLACES !== 'undefined' ? PLACES : [];
    const canvas = ground.material.map && ground.material.map.image;
    if (!places.length || !canvas || !canvas.getContext) return;
    const W = canvas.width;
    const px = canvas.getContext('2d').getImageData(0, 0, W, W).data;
    const size = ground.geometry.parameters.width;
    const half = size / 2;
    const tufts = [];
    const blooms = [];
    const PETAL = [0xffffff, 0xfff0a8, 0xffc9d9, 0xffffff, 0xd9e6ff];
    for (const p of places) {
      const r0 = (p.r || 8) * 0.9;
      for (let i = 0; i < 190; i++) {
        const ang = rnd(0, Math.PI * 2);
        const rad = r0 + rnd(0, 1) ** 1.4 * 30;
        const x = p.x + Math.sin(ang) * rad, z = p.z + Math.cos(ang) * rad;
        if (Math.abs(x) > half - 4 || Math.abs(z) > half - 4) continue;
        if (!world.isWalkable(x, z)) continue;
        if (places.some(q => Math.hypot(x - q.x, z - q.z) < (q.r || 8) * 0.85)) continue;
        const ix = Math.floor(((x + half) / size) * W), iz = Math.floor(((z + half) / size) * W);
        const o = (iz * W + ix) * 4;
        const r = px[o], g = px[o + 1], b = px[o + 2];
        // 풀빛인 곳에만 (길·모래·물·바닥은 건너뛴다)
        if (!(g > r * 1.06 && g > b * 1.18 && g > 110)) continue;
        const y = world.floorAt(x, z);
        if (Math.abs(world.floorAt(x + 0.4, z) - y) > 0.25 || Math.abs(world.floorAt(x, z + 0.4) - y) > 0.25) continue;
        const k = rnd(0.8, 0.94);
        const t = { x, y, z, s: rnd(0.8, 1.35), ry: rnd(0, 6.3), r: r * k, g: g * rnd(0.86, 0.98), b: b * k };
        tufts.push(t);
        if (Math.random() < 0.16) blooms.push({ x: x + rnd(-0.05, 0.05), y: y + 0.17 * t.s, z: z + rnd(-0.05, 0.05), s: rnd(0.8, 1.2), c: PETAL[Math.floor(Math.random() * PETAL.length)] });
      }
    }
    if (!tufts.length) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const grass = still(new THREE.InstancedMesh(tuftGeometry(), sway(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 'grass'), tufts.length));
    tufts.forEach((t, i) => {
      d.position.set(t.x, t.y - 0.01, t.z);
      d.rotation.set(0, t.ry, 0);
      d.scale.setScalar(t.s);
      d.updateMatrix();
      grass.setMatrixAt(i, d.matrix);
      grass.setColorAt(i, col.setRGB(t.r / 255, t.g / 255, t.b / 255, THREE.SRGBColorSpace));
    });
    scene.add(grass);
    if (blooms.length) {
      // 꽃은 납작한 다섯 장 꽃잎 한 송이
      const petal = new THREE.CircleGeometry(0.05, 5);
      petal.rotateX(-Math.PI / 2);
      const flower = still(new THREE.InstancedMesh(petal, sway(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), 'grass'), blooms.length));
      blooms.forEach((f, i) => {
        d.position.set(f.x, f.y, f.z);
        d.rotation.set(rnd(-0.3, 0.3), rnd(0, 6.3), rnd(-0.3, 0.3));
        d.scale.setScalar(f.s);
        d.updateMatrix();
        flower.setMatrixAt(i, d.matrix);
        flower.setColorAt(i, col.setHex(f.c));
      });
      scene.add(flower);
    }
  }

  /* ---------- 설치 · 프레임 ---------- */

  let cam = null;
  function install({ scene, camera, world }) {
    cam = camera;
    const step = (name, fn) => { try { fn(); } catch (e) { console.warn('polish:' + name, e); } };
    const meshes = scene.children.filter(o => o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry');
    const ground = meshes.find(o => o.material.map && o.material.isMeshLambertMaterial);
    const sea = meshes.find(o => o.material.isMeshPhongMaterial);
    if (ground) step('ground', () => patchGround(ground));
    if (sea) step('sea', () => patchSea(sea));
    step('sky', () => buildSky(scene));
    if (ground) step('grass', () => plantGrass(scene, world, ground));
  }
  function frame(time) {
    WIND.value = time;
    if (seaTex) seaTex.offset.set(time * 0.006 + Math.sin(time * 0.31) * 0.02, time * 0.0035);
    if (sky && cam) {
      sky.position.set(cam.position.x, 0, cam.position.z);
      clouds.position.set(cam.position.x, 0, cam.position.z);
      clouds.rotation.y = time * 0.0035;
    }
  }

  root.Polish = { blend, sway, swayInk, install, frame, wind: WIND };
})(typeof window !== 'undefined' ? window : globalThis);
