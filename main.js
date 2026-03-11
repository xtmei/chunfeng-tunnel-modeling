import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── 尺寸参数 ─────────────────────────────────────────────────────────────────
const DIMENSIONS = {
  outerDiameter: 15.2,
  innerDiameter: 13.9,
  excavDiameter: 15.8,
  length: 180,
};

// ─── 色彩配置（更鲜明、更有层次感）──────────────────────────────────────────
const COLORS = {
  bgFog:    0x060c1a,
  ring:     0xa8bccf,   // 预制衬砌：混凝土灰蓝
  slab:     0xc4d6e8,   // 车道板：浅灰
  lane:     0x1b2f45,   // 车道：深沥青蓝
  sideWall: 0x7a96b2,   // 侧墙：中灰蓝
  utility:  0x00b4e0,   // 设备带：亮青蓝
  accent:   0xf5a230,   // 强调色：暖橙
  portal:   0x8899b4,   // 门户段：灰蓝
  cable:    0x2288cc,   // 电缆管廊：蓝
  smoke:    0x55ccee,   // 排烟通道：浅青
};

// ─── 渲染器 ───────────────────────────────────────────────────────────────────
const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// ACES 胶片色调映射：大幅提升画面质感，色彩更自然
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ─── 场景与相机 ───────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060c1a);
// 指数雾：远处自然消退，近处清晰
scene.fog = new THREE.FogExp2(COLORS.bgFog, 0.0055);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);

// 轨道控制（暂停时可手动探索模型）
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 5;
controls.maxDistance = 120;

// ─── 灯光（三点式 + 半球光，大幅提升立体感）──────────────────────────────────
// 半球光：天空蓝色 + 地面深色，营造自然环境感
const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x223344, 0.75);
scene.add(hemiLight);

// 主光（暖白色，高角度投射阴影）
const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.8);
keyLight.position.set(30, 45, 25);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 250;
keyLight.shadow.camera.left   = -70;
keyLight.shadow.camera.right  =  70;
keyLight.shadow.camera.top    =  70;
keyLight.shadow.camera.bottom = -70;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

// 补光（冷蓝色，来自反方向，增加冷暖对比）
const fillLight = new THREE.DirectionalLight(0x80c8ff, 0.55);
fillLight.position.set(-25, 8, -20);
scene.add(fillLight);

// 底部暖色点光（科技感氛围）
const rimLight = new THREE.PointLight(0xff9944, 1.6, 160);
rimLight.position.set(0, -28, 14);
scene.add(rimLight);

// 侧面青色点光（增加深度感）
const glowLight = new THREE.PointLight(0x22aaff, 1.1, 100);
glowLight.position.set(-32, 4, -12);
scene.add(glowLight);

// ─── 组 ───────────────────────────────────────────────────────────────────────
const root = new THREE.Group();
scene.add(root);

const cityGroup         = new THREE.Group();
const tunnelGroup       = new THREE.Group();
const crossGroup        = new THREE.Group();
const longitudinalGroup = new THREE.Group();
const heroCutGroup      = new THREE.Group();
root.add(cityGroup, tunnelGroup, crossGroup, longitudinalGroup, heroCutGroup);

// ─── 材质助手 ─────────────────────────────────────────────────────────────────
function mat(color, opacity = 1, rough = 0.6, metal = 0.1) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    roughness: rough,
    metalness: metal,
  });
}

// 混凝土质感（高粗糙度、低金属度）
function concreteMat(color, opacity = 1) {
  return mat(color, opacity, 0.88, 0.02);
}

// 金属质感（低粗糙度、高金属度）
function metalMat(color, opacity = 1) {
  return mat(color, opacity, 0.18, 0.72);
}

// 玻璃/透明材质
function glassMat(color, opacity = 0.3) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.04,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
}

// 带自发光的功能材质（设备、电缆等）
function techMat(color, emissiveColor, emissiveIntensity = 0.25, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(emissiveColor),
    emissiveIntensity,
    transparent: opacity < 1,
    opacity,
    roughness: 0.22,
    metalness: 0.65,
  });
}

// ─── 城市环境 ─────────────────────────────────────────────────────────────────
function buildCity() {
  // 地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    concreteMat(0x0c1c34, 0.92)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  cityGroup.add(ground);

  // 道路
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 24),
    concreteMat(0x152640, 0.96)
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.02;
  road.receiveShadow = true;
  cityGroup.add(road);

  // 道路中心线标记
  for (let i = -7; i <= 7; i++) {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 0.28),
      mat(0xffffff, 0.45, 1, 0)
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(i * 10, 0.04, 0);
    cityGroup.add(mark);
  }

  // 建筑群
  const bColors = [0x1c3456, 0x22405e, 0x182e4c, 0x1e3860];
  for (let i = 0; i < 30; i++) {
    const h = 5 + Math.random() * 30;
    const w = 4 + Math.random() * 6;
    const d = 4 + Math.random() * 6;
    const color = bColors[i % bColors.length];
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat(color, 0.55 + Math.random() * 0.25, 0.7, 0.08)
    );
    let x, z;
    do {
      x = (Math.random() - 0.5) * 180;
      z = (Math.random() - 0.5) * 180;
    } while (Math.abs(z) < 18);
    b.position.set(x, h / 2, z);
    b.castShadow = true;
    b.receiveShadow = true;
    cityGroup.add(b);
  }
}

// ─── 隧道走向 ─────────────────────────────────────────────────────────────────
function centerlinePoint(t) {
  const x = (t - 0.5) * DIMENSIONS.length;
  const y = -8 - 16 * Math.sin(t * Math.PI);
  return new THREE.Vector3(x, y, 0);
}

function buildTunnelAlignment() {
  const pts = [];
  for (let i = 0; i <= 120; i++) pts.push(centerlinePoint(i / 120));
  const curve = new THREE.CatmullRomCurve3(pts);

  // 外壳（透明显示轮廓）
  const outer = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 200, DIMENSIONS.outerDiameter / 2, 56, false),
    glassMat(0x4488aa, 0.16)
  );
  tunnelGroup.add(outer);

  // 内部车道面（上下层）
  const laneMat = concreteMat(0x1b2f45, 0.88);
  const upper = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 160, 2.15, 20, false),
    laneMat
  );
  upper.position.y += 1.65;
  const lower = upper.clone();
  lower.position.y -= 3.3;
  tunnelGroup.add(upper, lower);

  // 门户段（明挖段）
  const portalMat = concreteMat(COLORS.portal, 0.40);
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(24, 14, 18), portalMat);
  p1.position.copy(centerlinePoint(0.03)).add(new THREE.Vector3(0, 4.8, 0));
  const p2 = p1.clone();
  p2.position.copy(centerlinePoint(0.97)).add(new THREE.Vector3(0, 4.8, 0));
  longitudinalGroup.add(p1, p2);

  // 纵剖面轮廓线
  const profilePts = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const p = centerlinePoint(t);
    profilePts.push(new THREE.Vector3((t - 0.5) * 130, p.y + 25, 0));
  }
  const profile = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(profilePts),
    new THREE.LineBasicMaterial({ color: 0x55aadd })
  );
  longitudinalGroup.add(profile);
}

// ─── 截面组件 ─────────────────────────────────────────────────────────────────
const componentParts = [];

function addPart(geo, material, name, basePos, explodePos, labelPos = null) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(basePos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  crossGroup.add(mesh);
  componentParts.push({
    mesh,
    basePos:   basePos.clone(),
    explodePos: explodePos.clone(),
    name,
    labelPos:  labelPos ? labelPos.clone() : explodePos.clone(),
  });
}

function buildCrossSection() {
  crossGroup.position.set(0, -18, 0);

  // 衬砌环（圆环挤出）
  const ring = new THREE.Shape();
  ring.absarc(0, 0, DIMENSIONS.outerDiameter / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, DIMENSIONS.innerDiameter / 2, 0, Math.PI * 2, true);
  ring.holes.push(hole);

  addPart(
    new THREE.ExtrudeGeometry(ring, { depth: 14, bevelEnabled: false }),
    concreteMat(COLORS.ring, 0.97),
    '预制衬砌',
    new THREE.Vector3(0, 0, -7),
    new THREE.Vector3(0, 0, -13),
    new THREE.Vector3(0, 8.2, 0)
  );

  // 车道板（分隔上下层）
  addPart(
    new THREE.BoxGeometry(13.2, 0.45, 14),
    concreteMat(COLORS.slab),
    '车道板',
    new THREE.Vector3(0, -0.2, 0),
    new THREE.Vector3(0, 4.6, 0),
    new THREE.Vector3(0, 1.2, 0)
  );

  // 上层车道
  addPart(
    new THREE.BoxGeometry(10.8, 0.3, 14),
    concreteMat(COLORS.lane, 0.96),
    '上层车道',
    new THREE.Vector3(0, 2.75, 0),
    new THREE.Vector3(0, 8.8, 0),
    new THREE.Vector3(0, 3.7, 0)
  );

  // 下层车道
  addPart(
    new THREE.BoxGeometry(10.8, 0.3, 14),
    concreteMat(COLORS.lane, 0.96),
    '下层车道',
    new THREE.Vector3(0, -3.1, 0),
    new THREE.Vector3(0, -9.0, 0),
    new THREE.Vector3(0, -2.3, 0)
  );

  // 右侧壁
  addPart(
    new THREE.BoxGeometry(0.55, 7.3, 14),
    concreteMat(COLORS.sideWall, 0.92),
    '侧墙',
    new THREE.Vector3(5.7, -0.2, 0),
    new THREE.Vector3(9.2, -0.2, 0),
    new THREE.Vector3(6.8, -0.3, 0)
  );

  // 左侧壁（无标签）
  addPart(
    new THREE.BoxGeometry(0.55, 7.3, 14),
    concreteMat(COLORS.sideWall, 0.92),
    '侧墙',
    new THREE.Vector3(-5.7, -0.2, 0),
    new THREE.Vector3(-9.2, -0.2, 0)
  );

  // 设备带（自发光金属蓝）
  addPart(
    new THREE.BoxGeometry(1.2, 1.1, 14),
    techMat(COLORS.utility, 0x0099cc, 0.30, 0.92),
    '设备带',
    new THREE.Vector3(-4.8, 4.2, 0),
    new THREE.Vector3(-8.8, 6.6, 0),
    new THREE.Vector3(-6.5, 5.2, 0)
  );

  // 电缆管廊（自发光蓝色圆管）
  addPart(
    new THREE.CylinderGeometry(0.34, 0.34, 14, 24),
    techMat(COLORS.cable, 0x1166bb, 0.35, 0.93),
    '电缆管廊',
    new THREE.Vector3(-5, -4.6, 0),
    new THREE.Vector3(-8.8, -7.2, 0),
    new THREE.Vector3(-6.9, -5.5, 0)
  );

  // 排烟通道（半透明青色）
  addPart(
    new THREE.BoxGeometry(2.6, 0.85, 14),
    glassMat(0x55ccee, 0.72),
    '排烟通道',
    new THREE.Vector3(0, 5.7, 0),
    new THREE.Vector3(0, 10.8, 0),
    new THREE.Vector3(0, 7.3, 0)
  );

  // 英雄剖切面
  const heroCut = new THREE.Mesh(
    new THREE.CylinderGeometry(
      DIMENSIONS.outerDiameter / 2,
      DIMENSIONS.outerDiameter / 2,
      26, 90, 1, true,
      -0.28 * Math.PI, 1.62 * Math.PI
    ),
    glassMat(0x7aadcc, 0.26)
  );
  heroCut.rotation.z = Math.PI / 2;
  heroCut.position.set(18, -17.5, -3);
  heroCutGroup.add(heroCut);
}

buildCity();
buildTunnelAlignment();
buildCrossSection();

// ─── 标签系统 ─────────────────────────────────────────────────────────────────
const labelLayer = document.querySelector('#label-layer');
const labelMap   = new Map();
const keyNames   = ['预制衬砌', '车道板', '上层车道', '下层车道', '侧墙', '设备带', '电缆管廊', '排烟通道'];

keyNames.forEach((name) => {
  const div = document.createElement('div');
  div.className   = 'label';
  div.textContent = name;
  labelLayer.appendChild(div);
  labelMap.set(name, div);
});

// ─── 场景定义（全中文说明）────────────────────────────────────────────────────
const scenes = [
  {
    title: '整体走向 — 春风隧道以"单洞双层"结构穿越城市地下，沿线最深约 24 m，有效分离上下行车流。',
    duration: 12,
  },
  {
    title: `核心参数 — 外径 ${DIMENSIONS.outerDiameter} m，内径 ${DIMENSIONS.innerDiameter} m，开挖直径 ${DIMENSIONS.excavDiameter} m，是国内超大直径盾构隧道之一。`,
    duration: 12,
  },
  {
    title: '组件分解 — 截面由预制衬砌、车道板、上下车道、侧墙、设备带、电缆管廊及排烟通道八大构件组成，各司其职。',
    duration: 12,
  },
  {
    title: '纵向剖面 — 两端为明挖门户段，中间约 1.5 km 核心段采用盾构掘进，施工完成后地表原貌恢复。',
    duration: 12,
  },
  {
    title: '全景总览 — 上下双层分流大幅减少地面占用，通风排烟效率显著提升，是深圳城市交通立体化的重要实践。',
    duration: 12,
  },
];

const totalDuration = scenes.reduce((a, s) => a + s.duration, 0);
let timeline = 0;
let autoPlay  = true;
let showLabels = true;

// ─── UI 事件绑定 ──────────────────────────────────────────────────────────────
const captionEl = document.querySelector('#scene-caption');
const progress  = document.querySelector('#progress');
const playBtn   = document.querySelector('#play');

document.querySelector('#toggle-labels').addEventListener('change', (e) => {
  showLabels = e.target.checked;
});

playBtn.addEventListener('click', () => {
  autoPlay = !autoPlay;
  // 暂停时开启轨道控制，允许手动探索
  controls.enabled = !autoPlay;
  playBtn.textContent = autoPlay ? '⏸ 暂停' : '▶ 播放';
});

document.querySelector('#prev').addEventListener('click', () => jumpScene(-1));
document.querySelector('#next').addEventListener('click', () => jumpScene(+1));
progress.addEventListener('input', (e) => {
  timeline = Number(e.target.value) * totalDuration;
});

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function getSceneIndex() {
  let sum = 0;
  for (let i = 0; i < scenes.length; i++) {
    sum += scenes[i].duration;
    if (timeline <= sum) return i;
  }
  return scenes.length - 1;
}

function sceneProgress(index) {
  let start = 0;
  for (let i = 0; i < index; i++) start += scenes[i].duration;
  return THREE.MathUtils.clamp((timeline - start) / scenes[index].duration, 0, 1);
}

function jumpScene(dir) {
  let idx = (getSceneIndex() + dir + scenes.length) % scenes.length;
  let t = 0;
  for (let i = 0; i < idx; i++) t += scenes[i].duration;
  timeline = t + 0.03;
}

function mixVec(a, b, t) {
  return new THREE.Vector3().copy(a).lerp(b, t);
}

// 缓动函数：入出平滑（动画不生硬）
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// 平滑步：比 easeInOut 更柔和
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// ─── 标签渲染 ─────────────────────────────────────────────────────────────────
const tmp = new THREE.Vector3();

function updateLabels(active) {
  labelMap.forEach((el) => (el.style.opacity = '0'));
  if (!showLabels || !active) return;

  for (const part of componentParts) {
    if (!labelMap.has(part.name)) continue;
    if (part.name === '侧墙') continue;
    tmp.copy(part.labelPos).applyMatrix4(crossGroup.matrixWorld).project(camera);
    const visible = tmp.z > -1 && tmp.z < 1;
    const x = (tmp.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
    const y = (-tmp.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
    const el = labelMap.get(part.name);
    el.style.opacity = visible ? '1' : '0';
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
  }
}

// ─── 场景动画 ─────────────────────────────────────────────────────────────────
function animateScene() {
  const index = getSceneIndex();
  const p  = sceneProgress(index);
  const pe = easeInOut(p);   // 缓动后的进度

  // 更新说明文字（含场次标记）
  captionEl.innerHTML =
    `<span class="scene-num">第 ${index + 1} 幕 / ${scenes.length}</span>` +
    scenes[index].title;

  // 场景可见性控制
  cityGroup.visible         = index <= 1;
  tunnelGroup.visible       = index === 0 || index === 3;
  crossGroup.visible        = index >= 1;
  longitudinalGroup.visible = index === 3;
  heroCutGroup.visible      = index === 4;

  // 相机动画（仅自动播放时覆盖）
  if (autoPlay) {
    if (index === 0) {
      camera.position.copy(
        mixVec(new THREE.Vector3(42, 34, 62), new THREE.Vector3(20, -12, 35), pe)
      );
      camera.lookAt(0, -12, 0);
      cityGroup.traverse((obj) => {
        if (obj.material) obj.material.opacity = THREE.MathUtils.lerp(0.85, 0.12, pe);
      });
    }

    if (index === 1) {
      const angle = pe * Math.PI * 0.5;
      camera.position.set(
        20 * Math.cos(angle),
        -17 + 3 * Math.sin(p * Math.PI),
        20 * Math.sin(angle)
      );
      camera.lookAt(0, -17, 0);
    }

    if (index === 2) {
      camera.position.set(18, -16.3, 18);
      camera.lookAt(0, -17.5, 0);
    }

    if (index === 3) {
      camera.position.copy(
        mixVec(new THREE.Vector3(54, 20, 48), new THREE.Vector3(64, 12, 20), pe)
      );
      camera.lookAt(0, -1, 0);
    }

    if (index === 4) {
      camera.position.copy(
        mixVec(new THREE.Vector3(30, -4, 34), new THREE.Vector3(25, -8, 22), pe)
      );
      camera.lookAt(4, -17, -3);
    }
  }

  // 重置组件位置（总是执行）
  if (index !== 2) {
    componentParts.forEach((part) => part.mesh.position.copy(part.basePos));
  }

  // 爆炸动画（第3幕，使用 smoothstep 缓动）
  if (index === 2) {
    const pulse = smoothstep(Math.sin(p * Math.PI));
    componentParts.forEach((part) => {
      part.mesh.position.copy(mixVec(part.basePos, part.explodePos, pulse));
    });
  }

  // 第4幕：截面随相机滑入
  if (index === 3) {
    crossGroup.position.set(-40 + 40 * (1 - pe), -18, 0);
  } else {
    crossGroup.position.set(0, -18, 0);
  }

  // 标签（第2、3、5幕显示）
  updateLabels(index >= 1 && index !== 3);
}

// ─── 画布自适应 ───────────────────────────────────────────────────────────────
function resize() {
  const container = document.querySelector('#scene-wrap');
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));

// 阻止画布区域的默认滑动（防止与 3D 交互冲突）
document.addEventListener('touchmove', (e) => {
  if (e.target.closest('#scene-wrap')) e.preventDefault();
}, { passive: false });

resize();

// ─── 渲染循环 ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function loop() {
  const dt = clock.getDelta();
  if (autoPlay) timeline = (timeline + dt) % totalDuration;
  progress.value = (timeline / totalDuration).toFixed(4);

  if (controls.enabled) controls.update();

  animateScene();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

loop();
