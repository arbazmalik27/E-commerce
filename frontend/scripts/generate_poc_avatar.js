// Script to generate a legally compliant, self-contained humanoid base avatar GLB for Phase 2 POC
// Fully generated using Three.js BufferGeometry with the 5 required morph targets:
// chestScale, waistScale, hipScale, legLength, torsoDepth
// License: MIT / TrendVolt Project Internal (100% legal, 0 third-party copyright)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Polyfill FileReader for Node.js GLTFExporter
globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    });
  }
};

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createHumanoidGeometry() {
  const parts = [];

  // 1. Head (sphere) - y ~ 1.63
  const head = new THREE.SphereGeometry(0.11, 24, 20);
  head.scale(0.85, 1.15, 0.95);
  head.translate(0, 1.63, 0);
  parts.push(head);

  // 2. Neck (cylinder) - y: 1.47 -> 1.54
  const neck = new THREE.CylinderGeometry(0.05, 0.058, 0.10, 16, 4);
  neck.translate(0, 1.50, 0);
  parts.push(neck);

  // 3. Upper Torso / Chest - y: 1.25 -> 1.45
  const chest = new THREE.CylinderGeometry(0.18, 0.16, 0.22, 24, 8);
  chest.scale(1.15, 1.0, 0.75); // wider than deep
  chest.translate(0, 1.34, 0.01);
  parts.push(chest);

  // 4. Mid Torso / Waist - y: 1.08 -> 1.24
  const waist = new THREE.CylinderGeometry(0.155, 0.165, 0.18, 24, 8);
  waist.scale(1.05, 1.0, 0.72);
  waist.translate(0, 1.16, 0.0);
  parts.push(waist);

  // 5. Pelvis / Hips - y: 0.88 -> 1.08
  const hips = new THREE.CylinderGeometry(0.165, 0.15, 0.20, 24, 8);
  hips.scale(1.15, 1.0, 0.80);
  hips.translate(0, 0.98, 0.0);
  parts.push(hips);

  // Helper for limbs (left & right)
  const addLimb = (createGeom, leftPos, rightPos, leftRot = null, rightRot = null) => {
    const left = createGeom();
    if (leftRot) left.rotateZ(leftRot[2]).rotateX(leftRot[0]).rotateY(leftRot[1]);
    left.translate(leftPos[0], leftPos[1], leftPos[2]);
    parts.push(left);

    const right = createGeom();
    if (rightRot) {
      right.rotateZ(rightRot[2]).rotateX(rightRot[0]).rotateY(rightRot[1]);
    } else if (leftRot) {
      right.rotateZ(-leftRot[2]).rotateX(leftRot[0]).rotateY(-leftRot[1]);
    }
    right.translate(rightPos[0], rightPos[1], rightPos[2]);
    parts.push(right);
  };

  // 6. Shoulders (spheres)
  addLimb(
    () => new THREE.SphereGeometry(0.065, 16, 12),
    [0.21, 1.42, 0],
    [-0.21, 1.42, 0]
  );

  // 7. Upper Arms in relaxed A-pose (tilted ~15 degrees)
  addLimb(
    () => {
      const g = new THREE.CylinderGeometry(0.048, 0.042, 0.26, 16, 6);
      g.translate(0, -0.13, 0);
      return g;
    },
    [0.22, 1.42, 0],
    [-0.22, 1.42, 0],
    [0, 0, -0.22],
    [0, 0, 0.22]
  );

  // 8. Forearms & Hands
  addLimb(
    () => {
      const g = new THREE.CylinderGeometry(0.042, 0.035, 0.24, 16, 6);
      g.translate(0, -0.12, 0);
      return g;
    },
    [0.28, 1.18, 0.02],
    [-0.28, 1.18, 0.02],
    [0, 0, -0.18],
    [0, 0, 0.18]
  );

  // Hands (spheres/paddles)
  addLimb(
    () => {
      const g = new THREE.SphereGeometry(0.04, 12, 10);
      g.scale(0.8, 1.4, 0.5);
      return g;
    },
    [0.32, 0.92, 0.04],
    [-0.32, 0.92, 0.04]
  );

  // 9. Thighs / Upper Legs - y: 0.50 -> 0.88
  addLimb(
    () => {
      const g = new THREE.CylinderGeometry(0.082, 0.062, 0.38, 20, 8);
      g.translate(0, -0.19, 0);
      return g;
    },
    [0.10, 0.88, 0.0],
    [-0.10, 0.88, 0.0]
  );

  // 10. Knees (spheres)
  addLimb(
    () => new THREE.SphereGeometry(0.058, 16, 12),
    [0.10, 0.50, 0.01],
    [-0.10, 0.50, 0.01]
  );

  // 11. Calves / Lower Legs - y: 0.10 -> 0.50
  addLimb(
    () => {
      const g = new THREE.CylinderGeometry(0.058, 0.045, 0.40, 20, 8);
      g.translate(0, -0.20, 0);
      return g;
    },
    [0.10, 0.50, 0.0],
    [-0.10, 0.50, 0.0]
  );

  // 12. Feet - y: 0.0 -> 0.10, extending forward along +Z
  addLimb(
    () => {
      const g = new THREE.BoxGeometry(0.08, 0.07, 0.20);
      g.translate(0, 0.035, 0.05);
      return g;
    },
    [0.10, 0.0, 0.0],
    [-0.10, 0.0, 0.0]
  );

  // Merge all body parts into one cohesive BufferGeometry
  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();

  // Create the 5 documented morph targets:
  // 1. chestScale
  // 2. waistScale
  // 3. hipScale
  // 4. legLength
  // 5. torsoDepth
  const pos = merged.attributes.position;
  const count = pos.count;

  const chestScaleDelta = new Float32Array(count * 3);
  const waistScaleDelta = new Float32Array(count * 3);
  const hipScaleDelta = new Float32Array(count * 3);
  const legLengthDelta = new Float32Array(count * 3);
  const torsoDepthDelta = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // 1. chestScale (y roughly 1.24 to 1.48)
    if (y >= 1.22 && y <= 1.48 && Math.abs(x) < 0.28) {
      const weight = Math.sin(((y - 1.22) / 0.26) * Math.PI);
      chestScaleDelta[i * 3 + 0] = x * 0.35 * weight; // expand outward in X
      chestScaleDelta[i * 3 + 2] = z * 0.40 * weight + (z > 0 ? 0.03 * weight : 0); // expand outward in Z
    }

    // 2. waistScale (y roughly 1.05 to 1.25)
    if (y >= 1.04 && y <= 1.26 && Math.abs(x) < 0.25) {
      const weight = Math.sin(((y - 1.04) / 0.22) * Math.PI);
      waistScaleDelta[i * 3 + 0] = x * 0.45 * weight;
      waistScaleDelta[i * 3 + 2] = z * 0.45 * weight;
    }

    // 3. hipScale (y roughly 0.84 to 1.08)
    if (y >= 0.84 && y <= 1.08 && Math.abs(x) < 0.28) {
      const weight = Math.sin(((y - 0.84) / 0.24) * Math.PI);
      hipScaleDelta[i * 3 + 0] = x * 0.40 * weight;
      hipScaleDelta[i * 3 + 2] = z * 0.35 * weight;
    }

    // 4. legLength (legs and feet y <= 0.88)
    if (y <= 0.88) {
      // Stretch legs: the lower the vertex, the more it extends downward
      const stretch = (0.88 - y) * 0.20;
      legLengthDelta[i * 3 + 1] = -stretch;
    }

    // 5. torsoDepth (y between 0.88 and 1.48)
    if (y >= 0.88 && y <= 1.48 && Math.abs(x) < 0.30) {
      const weight = Math.sin(((y - 0.88) / 0.60) * Math.PI);
      torsoDepthDelta[i * 3 + 2] = z * 0.50 * weight; // expand front/back depth
    }
  }

  merged.morphAttributes.position = [
    new THREE.BufferAttribute(chestScaleDelta, 3),
    new THREE.BufferAttribute(waistScaleDelta, 3),
    new THREE.BufferAttribute(hipScaleDelta, 3),
    new THREE.BufferAttribute(legLengthDelta, 3),
    new THREE.BufferAttribute(torsoDepthDelta, 3),
  ];
  merged.morphTargetsRelative = true;

  return merged;
}

async function exportBaseAvatarGLB() {
  console.log('Generating TrendVolt Base Avatar (POC)...');
  const geometry = createHumanoidGeometry();

  const material = new THREE.MeshStandardMaterial({
    color: 0xd6cbbd, // warm linen mannequin tone matching TrendVolt palette
    roughness: 0.55,
    metalness: 0.08,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'BaseAvatar_POC';
  mesh.morphTargetDictionary = {
    chestScale: 0,
    waistScale: 1,
    hipScale: 2,
    legLength: 3,
    torsoDepth: 4,
  };
  mesh.morphTargetInfluences = [0, 0, 0, 0, 0];

  const scene = new THREE.Scene();
  scene.name = 'TrendVolt_Avatar_Scene_POC';
  scene.add(mesh);

  const outputDir = path.resolve(__dirname, '../public/models');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'base_avatar_poc.glb');

  const exporter = new GLTFExporter();
  await new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        const buffer = Buffer.from(result);
        fs.writeFileSync(outputPath, buffer);
        console.log(`Successfully generated: ${outputPath}`);
        console.log(`GLB size: ${(buffer.byteLength / 1024).toFixed(1)} KB`);
        console.log(`Vertices: ${geometry.attributes.position.count}`);
        console.log('Morph targets included: chestScale, waistScale, hipScale, legLength, torsoDepth');
        resolve();
      },
      (error) => {
        console.error('Export failed:', error);
        reject(error);
      },
      { binary: true }
    );
  });
}

exportBaseAvatarGLB().catch((err) => {
  console.error(err);
  process.exit(1);
});
