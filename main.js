import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const DIMENSIONS = {
  outerDiameter: 15.2,
  innerDiameter: 13.9,
  excavDiameter: 15.8,
  length: 180,
};

const COLORS = {
  bgFog: 0x445464,
  ring: 0xb9bcb9,
  slab: 0xc7cacc,
  lane: 0x30353b,
  sideWall: 0xb2b8bd,
  utility: 0x7d8a94,
  accent: 0xd48440,
  portal: 0xbabec2,
  soil: 0x846f58,
  vegetation: 0x5d7359,
  road: 0x353a40,
  marking: 0xf2efe1,
  steel: 0x91979d,
  glass: 0xc5d7e5,
  lightWarm: 0xffe5bc,
  lightCool: 0xdbe9f6,
  shadow: 0x19212a,
  linework: 0x7a8590,
  fillLayer: 0xc1a17b,
  weatheredLayer: 0x8c745b,
  rockLayer: 0x48565d,
  faultLayer: 0x9e6c58,
  groundwater: 0x2e98de,
  surfaceRoad: 0x50555c,
  sidewalk: 0x8f9499,
  fireCabinet: 0xba3b30,
  emergencyPhone: 0x46a86d,
  signBoard: 0x2f5f8a,
  caution: 0xd7c35b,
  servicePipe: 0xb74135,
  reflector: 0xe9f2ff,
};

const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(COLORS.bgFog, 65, 250);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 10;
controls.maxDistance = 52;
controls.minPolarAngle = Math.PI * 0.2;
controls.maxPolarAngle = Math.PI * 0.55;

const hemiLight = new THREE.HemisphereLight(0xf1f4f8, 0x4b5865, 1.02);
const ambientLight = new THREE.AmbientLight(0xf8fbff, 0.24);
scene.add(hemiLight, ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff1d8, 1.45);
keyLight.position.set(36, 48, 24);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -90;
keyLight.shadow.camera.right = 90;
keyLight.shadow.camera.top = 90;
keyLight.shadow.camera.bottom = -90;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 180;
keyLight.shadow.bias = -0.00018;
keyLight.target.position.set(0, -12, 0);
scene.add(keyLight, keyLight.target);

const fillLight = new THREE.DirectionalLight(0xd9e8f5, 0.6);
fillLight.position.set(-30, 22, 26);
scene.add(fillLight);

const rimLight = new THREE.PointLight(COLORS.lightCool, 0.95, 210);
rimLight.position.set(-26, 12, -26);
scene.add(rimLight);

const underLight = new THREE.PointLight(0x7ba0c2, 0.28, 180);
underLight.position.set(0, -26, 10);
scene.add(underLight);

const root = new THREE.Group();
scene.add(root);

const cityGroup = new THREE.Group();
const tunnelGroup = new THREE.Group();
const crossGroup = new THREE.Group();
const longitudinalGroup = new THREE.Group();
const heroCutGroup = new THREE.Group();
root.add(cityGroup, tunnelGroup, crossGroup, longitudinalGroup, heroCutGroup);

const crossLights = [];
const heroLights = [];

function configureMesh(mesh, castShadow = true, receiveShadow = true) {
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

function mat(color, options = {}) {
  const {
    opacity = 1,
    roughness = 0.55,
    metalness = 0.08,
    emissive = 0x000000,
    emissiveIntensity = 0,
    side = THREE.FrontSide,
    depthWrite = opacity >= 0.999,
    depthTest = true,
    polygonOffset = false,
    polygonOffsetFactor = 0,
    polygonOffsetUnits = 0,
  } = options;
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
    side,
    depthWrite,
    depthTest,
    polygonOffset,
    polygonOffsetFactor,
    polygonOffsetUnits,
  });
  material.userData.baseOpacity = opacity;
  return material;
}

function setGroupOpacity(group, factor) {
  group.traverse((obj) => {
    if (!obj.material) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach((material) => {
      const baseOpacity = material.userData.baseOpacity ?? 1;
      material.opacity = baseOpacity * factor;
      material.transparent = material.opacity < 0.999;
    });
  });
}

function circlePoints(radius, z) {
  return new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2).getPoints(72).map((p) => new THREE.Vector3(p.x, p.y, z));
}

function createGroundBandGeometry(width, topY, bottomY, holeRadius = DIMENSIONS.excavDiameter / 2 + 0.6, depth = 16) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, bottomY);
  shape.lineTo(width / 2, bottomY);
  shape.lineTo(width / 2, topY);
  shape.lineTo(-width / 2, topY);
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}

function addLaneStripMarks(parent, y = 0.18, width = 10.8, length = 12) {
  const edgeWidth = 0.16;
  const dashLength = 1.42;
  const dashCount = 5;
  const edgeLeft = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(edgeWidth, 0.025, length + 0.1), mat(COLORS.marking, {
    roughness: 0.72,
    emissive: 0xf4f4ee,
    emissiveIntensity: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })), false, true);
  edgeLeft.position.set(-(width / 2) + 0.38, y, 0);
  const edgeRight = edgeLeft.clone();
  edgeRight.position.x *= -1;
  parent.add(edgeLeft, edgeRight);

  for (let i = 0; i < dashCount; i++) {
    const dash = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.028, dashLength), mat(COLORS.marking, {
      roughness: 0.72,
      emissive: 0xf4f4ee,
      emissiveIntensity: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })), false, true);
    dash.position.set(0, y, -4.6 + i * 2.3);
    parent.add(dash);
  }
}

function addHeroLaneMarks(parent, y = 0.12, width = 10.8, length = 16.2) {
  const edgeWidth = 0.16;
  const dashLength = 1.45;
  const dashCount = 5;
  const edgeNear = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(length + 0.1, 0.025, edgeWidth), mat(COLORS.marking, {
    roughness: 0.72,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })), false, true);
  edgeNear.position.set(0, y, -(width / 2) + 0.38);
  const edgeFar = edgeNear.clone();
  edgeFar.position.z *= -1;
  parent.add(edgeNear, edgeFar);

  for (let i = 0; i < dashCount; i++) {
    const dash = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(dashLength, 0.025, 0.18), mat(COLORS.marking, {
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })), false, true);
    dash.position.set(-5.6 + i * 2.8, y, 0);
    parent.add(dash);
  }
}

function addBarrierRails(parent, xOffset, length = 12) {
  const barrier = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.5, length, 4, 0.05), mat(COLORS.steel, { roughness: 0.66, metalness: 0.14 })), false, true);
  barrier.position.set(xOffset, 0.32, 0);
  const rail = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, length + 0.1), mat(COLORS.linework, { opacity: 0.88, roughness: 0.48, metalness: 0.25 })), false, true);
  rail.position.set(xOffset - Math.sign(xOffset) * 0.06, 0.72, 0);
  parent.add(barrier, rail);
}

function addDeckRoadsideDetails(parent, side = 1, length = 12) {
  const shoulder = configureMesh(new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.03, length - 0.1),
    mat(0x3c4246, { roughness: 0.96 })
  ), false, true);
  shoulder.position.set(side * 3.35, 0.02, 0);
  parent.add(shoulder);

  const shoulderStripe = configureMesh(new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.028, length - 0.1),
    mat(COLORS.caution, {
      roughness: 0.72,
      emissive: COLORS.caution,
      emissiveIntensity: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  ), false, true);
  shoulderStripe.position.set(side * 2.28, 0.03, 0);
  parent.add(shoulderStripe);

  for (const z of [-4.7, -2.35, 0, 2.35, 4.7]) {
    const roadStud = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.18), mat(COLORS.reflector, {
      roughness: 0.25,
      emissive: 0xaacfff,
      emissiveIntensity: 0.22,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })), false, true);
    roadStud.position.set(side * 1.16, 0.045, z);
    parent.add(roadStud);

    const grate = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.22), mat(0x6d7479, { roughness: 0.82 })), false, true);
    grate.position.set(side * 4.28, 0.03, z);
    parent.add(grate);
  }

  for (const z of [-4.8, -2.4, 0, 2.4, 4.8]) {
    const delineator = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), mat(0xd8dfe6, {
      roughness: 0.55,
    })), false, true);
    delineator.position.set(side * 4.72, 0.6, z);
    parent.add(delineator);

    const reflector = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.11), mat(COLORS.caution, {
      roughness: 0.25,
      emissive: COLORS.caution,
      emissiveIntensity: 0.16,
    })), false, true);
    reflector.position.set(-side * 0.05, 0.02, 0);
    delineator.add(reflector);
  }
}

function addLaneArrow(parent, x, z, rotation = 0) {
  const arrowGroup = new THREE.Group();
  const shaft = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 1.15), mat(COLORS.marking, {
    roughness: 0.7,
    emissive: 0xf4f4ee,
    emissiveIntensity: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })), false, true);
  shaft.position.z = -0.18;
  const head = configureMesh(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.54, 3), mat(COLORS.marking, {
    roughness: 0.7,
    emissive: 0xf4f4ee,
    emissiveIntensity: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })), false, true);
  head.rotation.x = Math.PI / 2;
  head.position.z = 0.56;
  arrowGroup.add(shaft, head);
  arrowGroup.position.set(x, 0.045, z);
  arrowGroup.rotation.y = rotation;
  parent.add(arrowGroup);
}

function addDeckEdgeBeam(parent, yOffset = -0.3, z = 0) {
  for (const x of [-4.7, 4.7]) {
    const beam = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 12.05, 4, 0.05), mat(0x9ea5ab, {
      roughness: 0.84,
    })), false, true);
    beam.position.set(x, yOffset, z);
    parent.add(beam);
  }
}

function addWallEmergencyDetails(wallMesh, side = 1) {
  const insideX = -side * 0.19;

  for (const z of [-4.6, -2.3, 0, 2.3, 4.6]) {
    const upperMarker = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.2), mat(COLORS.reflector, {
      roughness: 0.22,
      emissive: 0xbfdcff,
      emissiveIntensity: 0.28,
    })), false, true);
    upperMarker.position.set(insideX, 2.9, z);
    wallMesh.add(upperMarker);

    const lowerMarker = upperMarker.clone();
    lowerMarker.position.y = -2.75;
    wallMesh.add(lowerMarker);
  }

  const cableTray = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 12.05), mat(0x72787d, {
    roughness: 0.74,
  })), false, true);
  cableTray.position.set(insideX, 3.15, 0);
  wallMesh.add(cableTray);

  for (const z of [-4.2, -1.4, 1.4, 4.2]) {
    const bracket = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.08), mat(COLORS.steel, { roughness: 0.64 })), false, true);
    bracket.position.set(insideX + side * 0.08, 2.95, z);
    wallMesh.add(bracket);
  }

  const equipmentLevels = [
    { y: 2.15, z: 4.9, color: COLORS.fireCabinet, accent: COLORS.caution },
    { y: -2.55, z: 4.25, color: COLORS.emergencyPhone, accent: 0xd9f7e3 },
  ];
  for (const { y, z, color, accent } of equipmentLevels) {
    const cabinet = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(0.32, 1.02, 0.7, 3, 0.04), mat(color, {
      roughness: 0.6,
      metalness: 0.06,
    })), false, true);
    cabinet.position.set(insideX, y, z);
    wallMesh.add(cabinet);

    const panel = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.28), mat(accent, {
      roughness: 0.24,
      emissive: accent,
      emissiveIntensity: 0.28,
    })), false, true);
    panel.position.set(-side * 0.16, 0, 0);
    cabinet.add(panel);
  }

  const sign = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.62), mat(0x2b8b57, {
    roughness: 0.32,
    emissive: 0x2b8b57,
    emissiveIntensity: 0.2,
  })), false, true);
  sign.position.set(insideX, -1.2, 4.8);
  wallMesh.add(sign);
}

function addCrownInteriorDetails(smokeMesh) {
  const fireMain = configureMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 12.1, 18), mat(COLORS.servicePipe, {
    roughness: 0.52,
  })), false, true);
  fireMain.rotation.x = Math.PI / 2;
  fireMain.position.set(0, -0.48, 0);
  smokeMesh.add(fireMain);

  for (const z of [-4.2, -2.1, 0, 2.1, 4.2]) {
    const dropper = configureMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 12), mat(COLORS.steel, {
      roughness: 0.56,
    })), false, true);
    dropper.position.set(0, -0.52, z);
    smokeMesh.add(dropper);

    const sprinkler = configureMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.12, 12), mat(COLORS.caution, {
      roughness: 0.34,
      metalness: 0.06,
    })), false, true);
    sprinkler.position.set(0, -0.78, z);
    smokeMesh.add(sprinkler);
  }

  for (const z of [-3.8, 0, 3.8, 5]) {
    const cameraPole = configureMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 10), mat(COLORS.steel, {
      roughness: 0.62,
    })), false, true);
    cameraPole.position.set(z > 4 ? 0 : 1.2, -0.56, z);
    smokeMesh.add(cameraPole);

    const camera = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.14, 0.16, 3, 0.02), mat(0x2a2e33, {
      roughness: 0.48,
    })), false, true);
    camera.position.set(z > 4 ? 0.18 : 1.38, -0.76, z);
    smokeMesh.add(camera);
  }

  for (const z of [-4.1, 0.8, 4.4, 5.2]) {
    const signFrame = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 0.1), mat(COLORS.signBoard, {
      roughness: 0.44,
      emissive: COLORS.signBoard,
      emissiveIntensity: 0.16,
    })), false, true);
    signFrame.position.set(0, -1.08, z);
    smokeMesh.add(signFrame);

    const supportLeft = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), mat(COLORS.steel, { roughness: 0.64 })), false, true);
    supportLeft.position.set(-0.94, -0.8, z);
    const supportRight = supportLeft.clone();
    supportRight.position.x *= -1;
    smokeMesh.add(supportLeft, supportRight);

    const strip = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 0.04), mat(0xeff4fb, {
      roughness: 0.26,
      emissive: 0xbfd7f3,
      emissiveIntensity: 0.22,
    })), false, true);
    strip.position.set(0, 0, 0.06);
    signFrame.add(strip);
  }
}

function addRingJoints(part) {
  const lineMaterial = new THREE.LineBasicMaterial({ color: COLORS.linework, transparent: true, opacity: 0.78 });
  [0.04, 11.96].forEach((z) => {
    const outerLoop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(DIMENSIONS.outerDiameter / 2, z)), lineMaterial);
    const innerLoop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(DIMENSIONS.innerDiameter / 2, z)), lineMaterial);
    part.mesh.add(outerLoop, innerLoop);
    [-2.42, -1.42, -0.35, 0.65, 1.68, 2.55].forEach((angle) => {
      const seam = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(Math.cos(angle) * (DIMENSIONS.innerDiameter / 2), Math.sin(angle) * (DIMENSIONS.innerDiameter / 2), z),
          new THREE.Vector3(Math.cos(angle) * (DIMENSIONS.outerDiameter / 2), Math.sin(angle) * (DIMENSIONS.outerDiameter / 2), z),
        ]),
        lineMaterial
      );
      part.mesh.add(seam);
    });
  });

  const seamRadius = (DIMENSIONS.outerDiameter + DIMENSIONS.innerDiameter) * 0.25;
  [-2.42, -1.42, -0.35, 0.65, 1.68, 2.55].forEach((angle) => {
    const seam = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 12.04), mat(COLORS.linework, { opacity: 0.65, roughness: 0.95 })), false, true);
    seam.position.set(Math.cos(angle) * seamRadius, Math.sin(angle) * seamRadius, 6);
    seam.rotation.z = angle;
    part.mesh.add(seam);
  });
}

function addCrossLights() {
  for (const z of [-4.2, 0, 4.2]) {
    const fixture = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.16, 0.34, 4, 0.04), mat(0xf8f0db, {
      roughness: 0.22,
      metalness: 0.02,
      emissive: COLORS.lightWarm,
      emissiveIntensity: 0.9,
    })), false, false);
    fixture.position.set(0, 6.1, z);
    crossGroup.add(fixture);

    const lamp = new THREE.PointLight(COLORS.lightWarm, 0.28, 16);
    lamp.position.set(0, 5.7, z);
    crossLights.push(lamp);
    crossGroup.add(lamp);
  }
}

function buildCity() {
  const ground = configureMesh(new THREE.Mesh(new THREE.PlaneGeometry(220, 220), mat(0xd8dde1, { roughness: 1 })), false, true);
  ground.rotation.x = -Math.PI / 2;
  cityGroup.add(ground);

  const boulevard = configureMesh(new THREE.Mesh(new THREE.PlaneGeometry(165, 24), mat(COLORS.road, { roughness: 0.97 })), false, true);
  boulevard.rotation.x = -Math.PI / 2;
  boulevard.position.y = 0.02;
  cityGroup.add(boulevard);

  const median = configureMesh(new THREE.Mesh(new THREE.PlaneGeometry(160, 2.4), mat(COLORS.vegetation, { roughness: 1 })), false, true);
  median.rotation.x = -Math.PI / 2;
  median.position.y = 0.03;
  cityGroup.add(median);

  for (const z of [-38, 38]) {
    const road = configureMesh(new THREE.Mesh(new THREE.PlaneGeometry(158, 10), mat(0x434950, { roughness: 0.97 })), false, true);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.018, z);
    cityGroup.add(road);
  }

  const tunnelTrace = configureMesh(new THREE.Mesh(new THREE.PlaneGeometry(170, 6.4), mat(0x89a4b4, { opacity: 0.15, roughness: 1 })), false, true);
  tunnelTrace.rotation.x = -Math.PI / 2;
  tunnelTrace.position.y = 0.015;
  cityGroup.add(tunnelTrace);

  for (let i = -7; i <= 7; i++) {
    if (i === 0) continue;
    const stripe = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.025, 0.2), mat(COLORS.marking, { roughness: 0.72 })), false, true);
    stripe.position.set(i * 10, 0.035, 0);
    cityGroup.add(stripe);
  }

  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 8; i++) {
      const x = -72 + i * 20 + row * 4;
      const width = 10 + ((i + row) % 2) * 2.4;
      const depth = 12 + (i % 3) * 3;
      const height = 15 + ((i * 3 + row * 5) % 4) * 6 + row * 4;
      for (const side of [-1, 1]) {
        const z = side * (29 + row * 19 + (i % 2) * 2.6);
        const podium = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(width + 3.5, 2.8, depth + 3.5, 4, 0.25), mat(0xc7ccd1, { opacity: 0.96, roughness: 0.9 })));
        podium.position.set(x, 1.4, z);
        cityGroup.add(podium);

        const building = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 5, 0.38), mat(0x9aa7b2, { opacity: 0.9, roughness: 0.76 })));
        building.position.set(x, height / 2 + 2.8, z);
        cityGroup.add(building);

        const cap = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(width * 0.45, 1.2, depth * 0.35, 3, 0.14), mat(COLORS.glass, {
          opacity: 0.95,
          roughness: 0.18,
          metalness: 0.08,
        })), false, true);
        cap.position.set(x, height + 3.6, z);
        cityGroup.add(cap);
      }
    }
  }
}

function centerlinePoint(t) {
  const x = (t - 0.5) * DIMENSIONS.length;
  const y = -8 - 16 * Math.sin(t * Math.PI);
  return new THREE.Vector3(x, y, 0);
}

function addTunnelRings(curve, segments) {
  const ringGeometry = new THREE.TorusGeometry(DIMENSIONS.outerDiameter / 2, 0.08, 10, 64);
  const ringMaterial = mat(COLORS.linework, { opacity: 0.54, roughness: 0.95 });
  const frames = curve.computeFrenetFrames(segments, false);

  for (let i = 7; i < segments - 6; i += 7) {
    const ring = configureMesh(new THREE.Mesh(ringGeometry, ringMaterial), false, true);
    ring.position.copy(curve.getPointAt(i / segments));
    const basis = new THREE.Matrix4().makeBasis(frames.normals[i], frames.binormals[i], curve.getTangentAt(i / segments).normalize());
    ring.quaternion.setFromRotationMatrix(basis);
    tunnelGroup.add(ring);
  }
}

function buildTunnelAlignment() {
  const points = [];
  const segments = 120;
  for (let i = 0; i <= segments; i++) points.push(centerlinePoint(i / segments));
  const curve = new THREE.CatmullRomCurve3(points);

  const excav = configureMesh(new THREE.Mesh(new THREE.TubeGeometry(curve, 220, DIMENSIONS.excavDiameter / 2, 44, false), mat(COLORS.soil, {
    opacity: 0.08,
    roughness: 1,
    side: THREE.BackSide,
  })), false, false);
  tunnelGroup.add(excav);

  const outer = configureMesh(new THREE.Mesh(new THREE.TubeGeometry(curve, 260, DIMENSIONS.outerDiameter / 2, 64, false), mat(COLORS.ring, {
    opacity: 0.4,
    roughness: 0.88,
  })), false, true);
  tunnelGroup.add(outer);

  const innerGlow = configureMesh(new THREE.Mesh(new THREE.TubeGeometry(curve, 220, DIMENSIONS.innerDiameter / 2, 52, false), mat(0xf6f8fa, {
    opacity: 0.06,
    roughness: 0.18,
    side: THREE.BackSide,
  })), false, false);
  tunnelGroup.add(innerGlow);

  addTunnelRings(curve, segments);

  const upperCurve = new THREE.CatmullRomCurve3(points.map((point) => point.clone().add(new THREE.Vector3(0, 2.65, 0))));
  const lowerCurve = new THREE.CatmullRomCurve3(points.map((point) => point.clone().add(new THREE.Vector3(0, -3.05, 0))));
  const upperDeck = configureMesh(new THREE.Mesh(new THREE.TubeGeometry(upperCurve, 180, 0.28, 14, false), mat(COLORS.slab, {
    opacity: 0.96,
    roughness: 0.9,
  })), false, true);
  const lowerDeck = configureMesh(new THREE.Mesh(new THREE.TubeGeometry(lowerCurve, 180, 0.28, 14, false), mat(COLORS.slab, {
    opacity: 0.96,
    roughness: 0.9,
  })), false, true);
  const upperSurface = configureMesh(new THREE.Mesh(new THREE.TubeGeometry(upperCurve, 180, 0.14, 10, false), mat(COLORS.lane, {
    opacity: 0.98,
    roughness: 0.98,
  })), false, true);
  const lowerSurface = configureMesh(new THREE.Mesh(new THREE.TubeGeometry(lowerCurve, 180, 0.14, 10, false), mat(COLORS.lane, {
    opacity: 0.98,
    roughness: 0.98,
  })), false, true);
  tunnelGroup.add(upperDeck, lowerDeck, upperSurface, lowerSurface);

  const pMat = mat(COLORS.portal, { opacity: 0.45, roughness: 0.82 });
  const p1 = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(22, 12, 18, 4, 0.4), pMat), false, true);
  p1.position.copy(centerlinePoint(0.03)).add(new THREE.Vector3(0, 4.6, 0));
  const p2 = p1.clone();
  p2.position.copy(centerlinePoint(0.97)).add(new THREE.Vector3(0, 4.6, 0));
  longitudinalGroup.add(p1, p2);

  for (const portal of [p1, p2]) {
    const approach = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(18, 0.28, 8), mat(COLORS.road, { roughness: 0.97 })), false, true);
    approach.position.copy(portal.position).add(new THREE.Vector3(0, -5.85, 0));
    longitudinalGroup.add(approach);
  }

  const profilePts = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const p = centerlinePoint(t);
    profilePts.push(new THREE.Vector3((t - 0.5) * 130, p.y + 25, 0));
  }
  const profile = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(profilePts),
    new THREE.LineBasicMaterial({ color: 0x8ba3b8, transparent: true, opacity: 0.85 })
  );
  longitudinalGroup.add(profile);
}

const componentParts = [];
function addPart(geometry, material, name, basePos, explodePos, labelPos = null) {
  const mesh = configureMesh(new THREE.Mesh(geometry, material));
  mesh.position.copy(basePos);
  crossGroup.add(mesh);
  const part = {
    mesh,
    basePos: basePos.clone(),
    explodePos: explodePos.clone(),
    name,
    labelPos: labelPos || explodePos.clone(),
  };
  componentParts.push(part);
  return part;
}

function buildHeroCutAssembly() {
  const heroShell = configureMesh(new THREE.Mesh(
    new THREE.CylinderGeometry(DIMENSIONS.outerDiameter / 2, DIMENSIONS.outerDiameter / 2, 24, 96, 1, true, -0.28 * Math.PI, 1.62 * Math.PI),
    mat(0xa2acb6, { opacity: 0.28, roughness: 0.84, side: THREE.DoubleSide })
  ), false, true);
  heroShell.rotation.z = Math.PI / 2;
  heroShell.position.set(18, -17.5, -3);
  heroCutGroup.add(heroShell);

  const heroRingSeams = configureMesh(new THREE.Mesh(new THREE.TorusGeometry(DIMENSIONS.innerDiameter / 2, 0.06, 8, 56), mat(COLORS.linework, {
    opacity: 0.66,
    roughness: 0.94,
  })), false, false);
  heroRingSeams.rotation.y = Math.PI / 2;
  heroRingSeams.position.set(18, -17.5, -3);
  heroCutGroup.add(heroRingSeams);

  const addHeroDeck = (yOffset) => {
    const slab = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(16.4, 0.45, 13.1, 4, 0.08), mat(COLORS.slab, {
      roughness: 0.92,
    })), false, true);
    slab.position.set(18, -17.5 + yOffset - 0.2, -3);
    heroCutGroup.add(slab);

    const lane = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(16.2, 0.18, 10.8, 4, 0.05), mat(COLORS.lane, {
      roughness: 0.98,
    })), false, true);
    lane.position.set(18, -17.5 + yOffset, -3);
    heroCutGroup.add(lane);

    addHeroLaneMarks(lane);

    for (const zOffset of [-4.95, 4.95]) {
      const barrier = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(16.2, 0.48, 0.28, 4, 0.05), mat(COLORS.steel, {
        roughness: 0.64,
        metalness: 0.14,
      })), false, true);
      barrier.position.set(18, -17.5 + yOffset + 0.26, -3 + zOffset);
      heroCutGroup.add(barrier);
    }
  };

  addHeroDeck(2.7);
  addHeroDeck(-3.1);

  for (const z of [-8.7, 2.7]) {
    const wall = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(16.1, 7.2, 0.55, 4, 0.06), mat(COLORS.sideWall, {
      opacity: 0.94,
      roughness: 0.88,
    })), false, true);
    wall.position.set(18, -17.7, z);
    heroCutGroup.add(wall);
  }

  const utilityBand = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(16.1, 1.1, 1.2, 4, 0.06), mat(0x6f8190, {
    opacity: 0.95,
    roughness: 0.68,
  })), false, true);
  utilityBand.position.set(18, -13.3, 1.8);
  heroCutGroup.add(utilityBand);
  for (const x of [12.6, 16.5, 20.4, 24.3]) {
    const bracket = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 0.16), mat(COLORS.steel, { roughness: 0.62 })), false, true);
    bracket.position.set(x, -13.35, 0.96);
    heroCutGroup.add(bracket);
  }

  const smokeDuct = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(16.1, 0.85, 2.6, 4, 0.08), mat(0xa7b5bd, {
    opacity: 0.92,
    roughness: 0.56,
  })), false, true);
  smokeDuct.position.set(18, -11.8, -3);
  heroCutGroup.add(smokeDuct);
  for (const x of [12.7, 15.7, 18.7, 21.7, 24.1]) {
    const slot = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.16), mat(COLORS.linework, {
      opacity: 0.82,
      roughness: 0.8,
    })), false, true);
    slot.position.set(x, -11.47, -3);
    heroCutGroup.add(slot);
  }

  const cableGallery = configureMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 16.1, 20), mat(0x4f86a7, {
    opacity: 0.96,
    roughness: 0.5,
  })), false, true);
  cableGallery.rotation.z = Math.PI / 2;
  cableGallery.position.set(18, -22.1, 1.9);
  heroCutGroup.add(cableGallery);
  const conduit = configureMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 16.15, 12), mat(COLORS.linework, {
    opacity: 0.88,
    roughness: 0.45,
  })), false, true);
  conduit.rotation.z = Math.PI / 2;
  conduit.position.set(18, -22.38, 1.9);
  heroCutGroup.add(conduit);

  for (const x of [12.4, 16.4, 20.4, 24.4]) {
    const fixture = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(1.55, 0.18, 0.38, 3, 0.04), mat(0xf8f0db, {
      roughness: 0.18,
      emissive: COLORS.lightWarm,
      emissiveIntensity: 1.45,
    })), false, false);
    fixture.position.set(x, -11.4, -3);
    heroCutGroup.add(fixture);

    const light = new THREE.PointLight(COLORS.lightWarm, 0.72, 18);
    light.position.set(x, -11.9, -2.4);
    heroLights.push(light);
    heroCutGroup.add(light);
  }

  for (const x of [13.8, 18, 22.2]) {
    const fixture = configureMesh(new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.14, 0.28, 3, 0.03), mat(0xf3ead5, {
      roughness: 0.2,
      emissive: COLORS.lightWarm,
      emissiveIntensity: 1.18,
    })), false, false);
    fixture.position.set(x, -15.15, -1.4);
    heroCutGroup.add(fixture);

    const light = new THREE.PointLight(COLORS.lightWarm, 0.5, 12);
    light.position.set(x, -15.45, -0.9);
    heroLights.push(light);
    heroCutGroup.add(light);
  }
}

function buildCrossSection() {
  crossGroup.position.set(0, 0, 0);
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, DIMENSIONS.outerDiameter / 2, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, DIMENSIONS.innerDiameter / 2, 0, Math.PI * 2, true);
  ringShape.holes.push(hole);

  const rockPart = addPart(
    createGroundBandGeometry(58, 7.2, -20.5),
    mat(COLORS.rockLayer, { roughness: 0.98 }),
    '硬岩层',
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(18.5, -11.5, 0)
  );
  const weatheredPart = addPart(
    createGroundBandGeometry(58, 12.8, 7.2),
    mat(COLORS.weatheredLayer, { roughness: 0.95 }),
    '强风化层',
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(18.2, 10.1, 0)
  );
  const fillPart = addPart(
    createGroundBandGeometry(58, 18.8, 12.8),
    mat(COLORS.fillLayer, { roughness: 0.94 }),
    '人工填土层',
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(-18.5, 15.8, 0)
  );
  const waterPart = addPart(
    createGroundBandGeometry(58, 11.25, 10.9, DIMENSIONS.excavDiameter / 2 + 0.7),
    mat(COLORS.groundwater, {
      opacity: 0.95,
      roughness: 0.3,
      metalness: 0.04,
      emissive: 0x11608a,
      emissiveIntensity: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    '地下水位',
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(0, 0, -8),
    new THREE.Vector3(18.5, 11.8, 0)
  );

  const faultPart = addPart(
    new THREE.BoxGeometry(4, 31, 16.1),
    mat(COLORS.faultLayer, {
      opacity: 1,
      roughness: 0.94,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
    '断层破碎带',
    new THREE.Vector3(15.6, 0.8, 0),
    new THREE.Vector3(15.6, 0.8, 0),
    new THREE.Vector3(17.2, 4.8, 0)
  );
  faultPart.mesh.rotation.z = -0.3;
  for (const y of [-10.5, -6.2, -1.8, 2.6, 7.1, 11.4]) {
    const faultStripe = configureMesh(new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.12, 0.08),
      mat(0x6b4b3c, { roughness: 0.92, emissive: 0x3d281f, emissiveIntensity: 0.05 })
    ), false, true);
    faultStripe.position.set(0, y, 8.12);
    faultPart.mesh.add(faultStripe);
  }

  const frontBoundaryMat = new THREE.LineBasicMaterial({ color: 0x2f373c, transparent: true, opacity: 0.9 });
  for (const y of [12.8, 7.2]) {
    const boundary = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-29, y, 8.04),
        new THREE.Vector3(-8.5, y, 8.04),
        new THREE.Vector3(8.5, y, 8.04),
        new THREE.Vector3(29, y, 8.04),
      ]),
      frontBoundaryMat
    );
    crossGroup.add(boundary);
  }

  const surfaceRoad = addPart(
    new RoundedBoxGeometry(34, 0.55, 16.1, 4, 0.08),
    mat(COLORS.surfaceRoad, { roughness: 0.98 }),
    '春风路地表',
    new THREE.Vector3(0, 19.25, 0),
    new THREE.Vector3(0, 19.25, 0),
    new THREE.Vector3(0, 21.2, 0)
  );
  const median = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 16.15), mat(0x737c62, { roughness: 1 })), false, true);
  median.position.set(0, 0.34, 0);
  surfaceRoad.mesh.add(median);
  for (const x of [-10.5, -4.2, 4.2, 10.5]) {
    const laneStripe = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 16.2), mat(COLORS.marking, {
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })), false, true);
    laneStripe.position.set(x, 0.3, 0);
    surfaceRoad.mesh.add(laneStripe);
  }
  for (const x of [-16.9, 16.9]) {
    const sidewalk = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 16.1), mat(COLORS.sidewalk, { roughness: 0.92 })), false, true);
    sidewalk.position.set(x, 0.35, 0);
    surfaceRoad.mesh.add(sidewalk);
  }

  const ringPart = addPart(
    new THREE.ExtrudeGeometry(ringShape, { depth: 12, bevelEnabled: false }),
    mat(COLORS.ring, { opacity: 0.98, roughness: 0.9 }),
    '预制衬砌',
    new THREE.Vector3(0, 0, -6),
    new THREE.Vector3(0, 0, -11),
    new THREE.Vector3(0, 8.1, 0)
  );
  addRingJoints(ringPart);

  const slabPart = addPart(
    new RoundedBoxGeometry(13.1, 0.48, 12, 4, 0.08),
    mat(COLORS.slab, { roughness: 0.92 }),
    '车道板',
    new THREE.Vector3(0, 2.42, 0),
    new THREE.Vector3(0, 4.2, 0),
    new THREE.Vector3(0, 1.95, 0)
  );
  for (const x of [-4.8, 4.8]) {
    const gutter = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 12.1), mat(0xa4aaaf, { roughness: 0.92 })), false, true);
    gutter.position.set(x, -0.22, 0);
    slabPart.mesh.add(gutter);
  }
  addDeckEdgeBeam(slabPart.mesh);

  const lowerDeckSlab = configureMesh(new THREE.Mesh(
    new RoundedBoxGeometry(13.1, 0.52, 12, 4, 0.08),
    mat(0xb9c0c5, { roughness: 0.94 })
  ), false, true);
  lowerDeckSlab.position.set(0, -3.46, 0);
  addDeckEdgeBeam(lowerDeckSlab);
  crossGroup.add(lowerDeckSlab);

  const upperLane = addPart(
    new RoundedBoxGeometry(10.8, 0.18, 12, 4, 0.05),
    mat(COLORS.lane, { opacity: 0.98, roughness: 0.98 }),
    '上层车道',
    new THREE.Vector3(0, 2.77, 0),
    new THREE.Vector3(0, 8.1, 0),
    new THREE.Vector3(0, 3.7, 0)
  );
  const lowerLane = addPart(
    new RoundedBoxGeometry(10.8, 0.18, 12, 4, 0.05),
    mat(COLORS.lane, { opacity: 0.98, roughness: 0.98 }),
    '下层车道',
    new THREE.Vector3(0, -3.16, 0),
    new THREE.Vector3(0, -8.4, 0),
    new THREE.Vector3(0, -2.3, 0)
  );
  addLaneStripMarks(upperLane.mesh);
  addLaneStripMarks(lowerLane.mesh);
  addBarrierRails(upperLane.mesh, 4.95);
  addBarrierRails(upperLane.mesh, -4.95);
  addBarrierRails(lowerLane.mesh, 4.95);
  addBarrierRails(lowerLane.mesh, -4.95);
  addDeckRoadsideDetails(upperLane.mesh, 1);
  addDeckRoadsideDetails(lowerLane.mesh, 1);
  addLaneArrow(upperLane.mesh, -1.2, -3.3);
  addLaneArrow(upperLane.mesh, 1.35, 1.5);
  addLaneArrow(lowerLane.mesh, -1.2, -2.9);
  addLaneArrow(lowerLane.mesh, 1.35, 1.9);

  const rightWall = addPart(
    new RoundedBoxGeometry(0.55, 7.2, 12, 4, 0.05),
    mat(COLORS.sideWall, { opacity: 0.94, roughness: 0.88 }),
    '侧墙',
    new THREE.Vector3(5.7, -0.2, 0),
    new THREE.Vector3(8.5, -0.2, 0),
    new THREE.Vector3(6.7, -0.3, 0)
  );
  const leftWall = addPart(
    new RoundedBoxGeometry(0.55, 7.2, 12, 4, 0.05),
    mat(COLORS.sideWall, { opacity: 0.94, roughness: 0.88 }),
    '侧墙',
    new THREE.Vector3(-5.7, -0.2, 0),
    new THREE.Vector3(-8.5, -0.2, 0)
  );
  [rightWall, leftWall].forEach((wallPart) => {
    const cap = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 12.05), mat(COLORS.steel, { roughness: 0.74 })), false, true);
    cap.position.set(0, 3.55, 0);
    wallPart.mesh.add(cap);
  });
  addWallEmergencyDetails(rightWall.mesh, 1);
  addWallEmergencyDetails(leftWall.mesh, -1);

  const utilityPart = addPart(
    new RoundedBoxGeometry(1.2, 1.1, 12, 4, 0.05),
    mat(COLORS.utility, { opacity: 0.94, roughness: 0.72 }),
    '设备带',
    new THREE.Vector3(-4.8, 4.2, 0),
    new THREE.Vector3(-8.1, 6.3, 0),
    new THREE.Vector3(-6.5, 5.2, 0)
  );
  for (const z of [-4, -1.2, 1.6, 4.2]) {
    const bracket = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.16), mat(COLORS.steel, { roughness: 0.62 })), false, true);
    bracket.position.set(-0.72, -0.1, z);
    utilityPart.mesh.add(bracket);
  }

  const cablePart = addPart(
    new THREE.CylinderGeometry(0.34, 0.34, 12, 20),
    mat(0x5d91b0, { opacity: 0.96, roughness: 0.5 }),
    '电缆管廊',
    new THREE.Vector3(-5, -4.6, 0),
    new THREE.Vector3(-8.2, -6.8, 0),
    new THREE.Vector3(-6.9, -5.5, 0)
  );
  cablePart.mesh.rotation.x = Math.PI / 2;
  for (const y of [-0.26, 0.26]) {
    const conduit = configureMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 12.05, 12), mat(COLORS.linework, {
      opacity: 0.9,
      roughness: 0.45,
    })), false, true);
    conduit.rotation.x = Math.PI / 2;
    conduit.position.set(0, y, 0);
    cablePart.mesh.add(conduit);
  }

  const smokePart = addPart(
    new RoundedBoxGeometry(2.6, 0.85, 12, 4, 0.08),
    mat(0xb2c1c9, { opacity: 0.92, roughness: 0.62 }),
    '排烟通道',
    new THREE.Vector3(0, 5.7, 0),
    new THREE.Vector3(0, 10.2, 0),
    new THREE.Vector3(0, 7.2, 0)
  );
  for (const z of [-4.4, -2.6, -0.8, 1, 2.8, 4.6]) {
    const slot = configureMesh(new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.06, 0.16), mat(COLORS.linework, { opacity: 0.8, roughness: 0.82 })), false, true);
    slot.position.set(0, 0.18, z);
    smokePart.mesh.add(slot);
  }
  addCrownInteriorDetails(smokePart.mesh);

  addCrossLights();
  buildHeroCutAssembly();
}

buildCity();
buildTunnelAlignment();
buildCrossSection();

const labelLayer = document.querySelector('#label-layer');
const labelMap = new Map();
const keyNames = ['春风路地表', '人工填土层', '强风化层', '断层破碎带', '硬岩层', '地下水位', '预制衬砌', '车道板', '上层车道', '下层车道', '侧墙', '设备带', '电缆管廊', '排烟通道'];
keyNames.forEach((name) => {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = name;
  labelLayer.appendChild(div);
  labelMap.set(name, div);
});

let showLabels = true;
let compactUI = false;
let labelsTouched = false;

const compactVisibleLabels = new Set(['春风路地表', '硬岩层', '上层车道', '下层车道']);

const captionEl = document.querySelector('#scene-caption');
const resetBtn = document.querySelector('#reset-view');
const labelToggle = document.querySelector('#toggle-labels');
const sceneWrap = document.querySelector('#scene-wrap');
const desktopCameraPosition = new THREE.Vector3(19, 12, 28);
const desktopTarget = new THREE.Vector3(0, 2.8, 0);
const mobileCameraPosition = new THREE.Vector3(31, 18, 47);
const mobileTarget = new THREE.Vector3(0, 4.6, 0);
const tmp = new THREE.Vector3();
const worldLabelPos = new THREE.Vector3();
const localCameraPos = new THREE.Vector3();
const labelRaycaster = new THREE.Raycaster();
const labelOccluders = componentParts.map((part) => part.mesh);

function applyInteractiveLayout() {
  cityGroup.visible = false;
  tunnelGroup.visible = false;
  longitudinalGroup.visible = false;
  heroCutGroup.visible = false;
  crossGroup.visible = true;
  crossGroup.rotation.set(0, -0.18, 0);
  crossGroup.position.set(0, 0, 0);
  componentParts.forEach((part) => part.mesh.position.copy(part.basePos));

  hemiLight.intensity = 0.95;
  ambientLight.intensity = 0.22;
  keyLight.intensity = 1.32;
  fillLight.intensity = 0.56;
  rimLight.intensity = 0.72;
  underLight.intensity = 0.2;
  crossLights.forEach((light) => {
    light.intensity = 0.4;
  });
  heroLights.forEach((light) => {
    light.intensity = 0;
  });
}

function resetView() {
  const position = compactUI ? mobileCameraPosition : desktopCameraPosition;
  const target = compactUI ? mobileTarget : desktopTarget;
  camera.position.copy(position);
  controls.target.copy(target);
  controls.update();
}

function updateResponsiveFlags() {
  compactUI = window.matchMedia('(max-width: 680px), (max-height: 760px) and (pointer: coarse)').matches || window.innerWidth < 680;
  document.body.classList.toggle('compact-ui', compactUI);

  if (!labelsTouched) {
    showLabels = !compactUI;
    labelToggle.checked = showLabels;
  }

  controls.minDistance = compactUI ? 10 : 10;
  controls.maxDistance = compactUI ? 78 : 52;
}

function syncViewportHeight() {
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
}

function updateLabels() {
  labelMap.forEach((el) => (el.style.opacity = '0'));
  if (!showLabels) return;

  localCameraPos.copy(camera.position);
  crossGroup.worldToLocal(localCameraPos);
  const frontFacingLabels = localCameraPos.z > 8 && Math.abs(localCameraPos.x) < 24;
  if (!frontFacingLabels) return;

  const xInset = compactUI ? 44 : 18;
  const yInset = compactUI ? 36 : 16;

  for (const part of componentParts) {
    if (!labelMap.has(part.name) || part.name === '侧墙') continue;
    if (compactUI && !compactVisibleLabels.has(part.name)) continue;
    worldLabelPos.copy(part.labelPos).applyMatrix4(crossGroup.matrixWorld);
    const labelDistance = camera.position.distanceTo(worldLabelPos);
    labelRaycaster.set(camera.position, worldLabelPos.clone().sub(camera.position).normalize());
    const blockingHit = labelRaycaster.intersectObjects(labelOccluders, true).find((hit) => {
      if (hit.distance >= labelDistance - 0.2) return false;
      let current = hit.object;
      while (current) {
        if (current === part.mesh) return false;
        current = current.parent;
      }
      return true;
    });
    if (blockingHit) continue;

    tmp.copy(worldLabelPos).project(camera);
    const visible = tmp.z > -1 && tmp.z < 1;
    const x = THREE.MathUtils.clamp((tmp.x * 0.5 + 0.5) * renderer.domElement.clientWidth, xInset, renderer.domElement.clientWidth - xInset);
    const y = THREE.MathUtils.clamp((-tmp.y * 0.5 + 0.5) * renderer.domElement.clientHeight, yInset, renderer.domElement.clientHeight - yInset);
    const el = labelMap.get(part.name);
    el.style.opacity = visible ? '1' : '0';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
}

function resize() {
  syncViewportHeight();
  updateResponsiveFlags();
  const w = sceneWrap.clientWidth;
  const h = sceneWrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

captionEl.innerHTML = `沿春风路（滨河大道上步立交—新秀立交）典型剖面示意。<br>盾构段约 3.6km，埋深 6.9-46.3m，地层呈上软下硬，80% 以上为硬岩，并穿越 11 条断层破碎带。`;
labelToggle.addEventListener('change', (e) => {
  labelsTouched = true;
  showLabels = e.target.checked;
});
resetBtn.addEventListener('click', resetView);

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(() => {
  resize();
  resetView();
}, 200));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resize);
}

document.addEventListener('touchmove', (e) => {
  if (e.target.closest('#scene-wrap')) e.preventDefault();
}, { passive: false });

applyInteractiveLayout();
resize();
resetView();

function loop() {
  controls.update();
  updateLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();
