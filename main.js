import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DIMENSIONS = {
  outerDiameter: 15.2,
  innerDiameter: 13.9,
  excavDiameter: 15.8,
  length: 180,
};

const COLORS = {
  bgFog: 0x0b1f3b,
  ring: 0x9fb4cc,
  slab: 0xd4deea,
  lane: 0x2f4258,
  sideWall: 0x8ca2b8,
  utility: 0x3eb7ea,
  accent: 0xff9a3d,
  portal: 0x90a6c0,
};

const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ 
  canvas, 
  antialias: true, 
  alpha: true,
  powerPreference: 'high-performance', // 提示移动端使用高性能 GPU
  preserveDrawingBuffer: true // 提高部分手机端浏览器的截图和显示兼容性
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(COLORS.bgFog, 50, 220);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;

scene.add(new THREE.AmbientLight(0xb9dcff, 0.65));
const keyLight = new THREE.DirectionalLight(0xe4f0ff, 0.9);
keyLight.position.set(20, 25, 20);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x58d2ff, 1.2, 180);
rimLight.position.set(-20, 10, -20);
scene.add(rimLight);

const root = new THREE.Group();
scene.add(root);

const cityGroup = new THREE.Group();
const tunnelGroup = new THREE.Group();
const crossGroup = new THREE.Group();
const longitudinalGroup = new THREE.Group();
const heroCutGroup = new THREE.Group();
root.add(cityGroup, tunnelGroup, crossGroup, longitudinalGroup, heroCutGroup);

function mat(color, opacity = 1, rough = 0.45) {
  return new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: rough, metalness: 0.15 });
}

function buildCity() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), mat(0x122b4f, 0.75));
  ground.rotation.x = -Math.PI / 2;
  cityGroup.add(ground);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 20), mat(0x1f3552, 0.92));
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.03;
  cityGroup.add(road);

  for (let i = 0; i < 26; i++) {
    const h = 6 + Math.random() * 22;
    const b = new THREE.Mesh(new THREE.BoxGeometry(6, h, 6), mat(0x49698f, 0.5));
    b.position.set((Math.random() - 0.5) * 145, h / 2, (Math.random() - 0.5) * 145);
    cityGroup.add(b);
  }
}

function centerlinePoint(t) {
  const x = (t - 0.5) * DIMENSIONS.length;
  const y = -8 - 16 * Math.sin(t * Math.PI);
  return new THREE.Vector3(x, y, 0);
}

function buildTunnelAlignment() {
  const points = [];
  for (let i = 0; i <= 120; i++) points.push(centerlinePoint(i / 120));
  const curve = new THREE.CatmullRomCurve3(points);
  const outer = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, DIMENSIONS.outerDiameter / 2, 52, false), mat(0xa7b8ca, 0.22));
  tunnelGroup.add(outer);

  const upper = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 2.2, 22, false), mat(0x314863, 0.8));
  upper.position.y += 1.65;
  const lower = upper.clone();
  lower.position.y -= 3.25;
  tunnelGroup.add(upper, lower);

  const pMat = mat(COLORS.portal, 0.33);
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 18), pMat);
  p1.position.copy(centerlinePoint(0.03)).add(new THREE.Vector3(0, 4.6, 0));
  const p2 = p1.clone();
  p2.position.copy(centerlinePoint(0.97)).add(new THREE.Vector3(0, 4.6, 0));
  longitudinalGroup.add(p1, p2);

  const profilePts = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const p = centerlinePoint(t);
    profilePts.push(new THREE.Vector3((t - 0.5) * 130, p.y + 25, 0));
  }
  const profile = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(profilePts),
    new THREE.LineBasicMaterial({ color: 0x91d2ff })
  );
  longitudinalGroup.add(profile);
}

const componentParts = [];
function addPart(geo, material, name, basePos, explodePos, labelPos = null) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(basePos);
  crossGroup.add(mesh);
  componentParts.push({ mesh, basePos: basePos.clone(), explodePos: explodePos.clone(), name, labelPos: labelPos || explodePos.clone() });
}

function buildCrossSection() {
  crossGroup.position.set(0, -18, 0);
  const ring = new THREE.Shape();
  ring.absarc(0, 0, DIMENSIONS.outerDiameter / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, DIMENSIONS.innerDiameter / 2, 0, Math.PI * 2, true);
  ring.holes.push(hole);

  addPart(new THREE.ExtrudeGeometry(ring, { depth: 12, bevelEnabled: false }), mat(COLORS.ring, 0.95), '预制衬砌', new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, 0, -11), new THREE.Vector3(0, 8.1, 0));
  addPart(new THREE.BoxGeometry(13.1, 0.45, 12), mat(COLORS.slab), '车道板', new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(0, 4.2, 0), new THREE.Vector3(0, 1.2, 0));
  addPart(new THREE.BoxGeometry(10.8, 0.3, 12), mat(COLORS.lane, 0.96), '上层车道', new THREE.Vector3(0, 2.7, 0), new THREE.Vector3(0, 8.1, 0), new THREE.Vector3(0, 3.7, 0));
  addPart(new THREE.BoxGeometry(10.8, 0.3, 12), mat(COLORS.lane, 0.96), '下层车道', new THREE.Vector3(0, -3.1, 0), new THREE.Vector3(0, -8.4, 0), new THREE.Vector3(0, -2.3, 0));
  addPart(new THREE.BoxGeometry(0.55, 7.2, 12), mat(COLORS.sideWall, 0.9), '侧墙', new THREE.Vector3(5.7, -0.2, 0), new THREE.Vector3(8.5, -0.2, 0), new THREE.Vector3(6.7, -0.3, 0));
  addPart(new THREE.BoxGeometry(0.55, 7.2, 12), mat(COLORS.sideWall, 0.9), '侧墙', new THREE.Vector3(-5.7, -0.2, 0), new THREE.Vector3(-8.5, -0.2, 0));
  addPart(new THREE.BoxGeometry(1.2, 1.1, 12), mat(COLORS.utility, 0.88), '设备带', new THREE.Vector3(-4.8, 4.2, 0), new THREE.Vector3(-8.1, 6.3, 0), new THREE.Vector3(-6.5, 5.2, 0));
  addPart(new THREE.CylinderGeometry(0.34, 0.34, 12, 16), mat(0x47b4ff, 0.9), '电缆管廊', new THREE.Vector3(-5, -4.6, 0), new THREE.Vector3(-8.2, -6.8, 0), new THREE.Vector3(-6.9, -5.5, 0));
  addPart(new THREE.BoxGeometry(2.6, 0.85, 12), mat(0x6fd5f8, 0.65), '排烟通道', new THREE.Vector3(0, 5.7, 0), new THREE.Vector3(0, 10.2, 0), new THREE.Vector3(0, 7.2, 0));

  const heroCut = new THREE.Mesh(
    new THREE.CylinderGeometry(DIMENSIONS.outerDiameter / 2, DIMENSIONS.outerDiameter / 2, 24, 90, 1, true, -0.28 * Math.PI, 1.62 * Math.PI),
    mat(0x95aeca, 0.34)
  );
  heroCut.rotation.z = Math.PI / 2;
  heroCut.position.set(18, -17.5, -3);
  heroCutGroup.add(heroCut);
}

buildCity();
buildTunnelAlignment();
buildCrossSection();

const labelLayer = document.querySelector('#label-layer');
const labelMap = new Map();
const keyNames = ['预制衬砌', '车道板', '上层车道', '下层车道', '侧墙', '设备带', '电缆管廊', '排烟通道'];
keyNames.forEach((name) => {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = name;
  labelLayer.appendChild(div);
  labelMap.set(name, div);
});

const scenes = [
  { title: 'Scene 1 · 整体走向：显露春风隧道单洞双层地下走向。', duration: 12 },
  { title: `Scene 2 · 核心参数：外径 ${DIMENSIONS.outerDiameter}m，内径 ${DIMENSIONS.innerDiameter}m。`, duration: 12 },
  { title: 'Scene 3 · 爆炸分解：各功能组件动态展开演示。', duration: 12 },
  { title: 'Scene 4 · 纵向剖面：两端明挖门户段与中间盾构段关系。', duration: 12 },
  { title: 'Scene 5 · 全景总览：单洞双层剖切全景展示。', duration: 12 },
];

const totalDuration = scenes.reduce((a, s) => a + s.duration, 0);
let timeline = 0;
let autoPlay = true;
let showLabels = true;

const captionEl = document.querySelector('#scene-caption');
const progress = document.querySelector('#progress');
const playBtn = document.querySelector('#play');

document.querySelector('#toggle-labels').addEventListener('change', (e) => (showLabels = e.target.checked));
playBtn.addEventListener('click', () => {
  autoPlay = !autoPlay;
  playBtn.textContent = autoPlay ? '暂停' : '播放';
});
document.querySelector('#prev').addEventListener('click', () => jumpScene(-1));
document.querySelector('#next').addEventListener('click', () => jumpScene(1));
progress.addEventListener('input', (e) => (timeline = Number(e.target.value) * totalDuration));

function jumpScene(dir) {
  let idx = getSceneIndex();
  idx = (idx + dir + scenes.length) % scenes.length;
  let t = 0;
  for (let i = 0; i < idx; i++) t += scenes[i].duration;
  timeline = t + 0.03;
}

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

function mixVec(a, b, t) {
  return new THREE.Vector3().copy(a).lerp(b, t);
}

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
    el.style.top = `${y}px`;
  }
}

function animateScene() {
  const index = getSceneIndex();
  const p = sceneProgress(index);
  captionEl.textContent = scenes[index].title;

  cityGroup.visible = index <= 1;
  tunnelGroup.visible = index === 0 || index === 3;
  crossGroup.visible = index >= 1;
  longitudinalGroup.visible = index === 3;
  heroCutGroup.visible = index === 4;

  if (index === 0) {
    camera.position.copy(mixVec(new THREE.Vector3(42, 34, 62), new THREE.Vector3(20, -12, 35), p));
    camera.lookAt(0, -12, 0);
    cityGroup.traverse((obj) => {
      if (obj.material) obj.material.opacity = THREE.MathUtils.lerp(0.85, 0.1, p);
    });
  }

  if (index === 1) {
    camera.position.set(20 * Math.cos(p * Math.PI * 0.5), -17 + 3 * Math.sin(p * Math.PI), 20 * Math.sin(p * Math.PI * 0.5));
    camera.lookAt(0, -17, 0);
    componentParts.forEach((part) => part.mesh.position.copy(part.basePos));
  }

  if (index === 2) {
    const pulse = Math.sin(p * Math.PI);
    camera.position.set(18, -16.3, 18);
    camera.lookAt(0, -17.5, 0);
    componentParts.forEach((part) => {
      const t = pulse * 0.95;
      part.mesh.position.copy(mixVec(part.basePos, part.explodePos, t));
    });
  }

  if (index === 3) {
    camera.position.copy(mixVec(new THREE.Vector3(54, 20, 48), new THREE.Vector3(64, 12, 20), p));
    camera.lookAt(0, -1, 0);
    componentParts.forEach((part) => part.mesh.position.copy(part.basePos));
    crossGroup.position.set(-40 + 40 * (1 - p), -18, 0);
  } else {
    crossGroup.position.set(0, -18, 0);
  }

  if (index === 4) {
    camera.position.copy(mixVec(new THREE.Vector3(30, -4, 34), new THREE.Vector3(25, -8, 22), p));
    camera.lookAt(4, -17, -3);
    componentParts.forEach((part) => part.mesh.position.copy(part.basePos));
  }

  updateLabels(index >= 1 && index !== 3);
}

function resize() {
  const container = document.querySelector('#scene-wrap');
  const w = container.clientWidth;
  const h = container.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// 核心修复：针对手机端的视口高度变化进行实时监听
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// 阻止页面默认滑动行为，避免 3D 交互冲突
document.addEventListener('touchmove', (e) => {
  if (e.target.closest('#scene-wrap')) e.preventDefault();
}, { passive: false });

resize();

const clock = new THREE.Clock();
function loop() {
  const dt = clock.getDelta();
  if (autoPlay) timeline = (timeline + dt) % totalDuration;
  progress.value = (timeline / totalDuration).toFixed(4);
  animateScene();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();
