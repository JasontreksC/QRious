'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import styles from './y2k-theme.module.css';

const MODEL_URL = '/models/crt_computer.glb';
const DROP_DURATION = 0.95;
const DROP_HANG = 0.28;
const POWER_DELAY = 0.16;

function easeOutBounce(t: number) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) {
    const peak = 0.82;
    const n2 = (1 - peak) / (0.5 / d1) ** 2;
    return n2 * (t - 1.5 / d1) ** 2 + peak;
  }
  if (t < 2.5 / d1) {
    const peak = 0.955;
    const n2 = (1 - peak) / (0.25 / d1) ** 2;
    return n2 * (t - 2.25 / d1) ** 2 + peak;
  }
  return n1 * (t -= 2.65 / d1) * t + 0.984375;
}

function heartGlyph(size: number): string {
  const s = size;
  return `M ${-s * 0.16} ${s * 0.62}
    C ${-s * 0.05} ${s * 0.8}, ${s * 0.05} ${s * 0.8}, ${s * 0.16} ${s * 0.62}
    C ${s} ${s * 0.02}, ${s * 0.86} ${-s * 0.74}, 0 ${-s * 0.14}
    C ${-s * 0.86} ${-s * 0.74}, ${-s} ${s * 0.02}, ${-s * 0.16} ${s * 0.62} Z`;
}

function createHeartSprite() {
  const size = 40;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext('2d');
  if (!g) {
    throw new Error('2D canvas is unavailable');
  }

  g.imageSmoothingEnabled = false;
  g.translate(size / 2, size / 2 + 1);
  const heart = new Path2D(heartGlyph(16));

  g.fillStyle = '#6a103c';
  g.translate(1, 1);
  g.fill(heart);
  g.translate(-1, -1);

  g.strokeStyle = '#9a1858';
  g.lineJoin = 'miter';
  g.miterLimit = 3;
  g.lineCap = 'round';
  g.lineWidth = 2.2;
  g.stroke(heart);

  g.fillStyle = '#ef238e';
  g.fill(heart);

  return sprite;
}

function createScreenDrawer() {
  const TEX = 1024;
  const SCREEN_U0 = 0.0014;
  const SCREEN_U1 = 0.4192;
  const SCREEN_V0 = 0.4065;
  const SCREEN_V1 = 0.9984;
  const screenX = ((SCREEN_U0 + SCREEN_U1) / 2) * TEX;
  const screenY = ((SCREEN_V0 + SCREEN_V1) / 2) * TEX;
  const screenW = (SCREEN_U1 - SCREEN_U0) * TEX;
  const screenH = (SCREEN_V1 - SCREEN_V0) * TEX;

  const canvas = document.createElement('canvas');
  canvas.width = TEX;
  canvas.height = TEX;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('2D canvas is unavailable');
  }

  const heartSprite = createHeartSprite();
  const heartWidth = 520;
  const heartHeight = 520;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 1;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let time = 0;
  let brightness = 1;
  let flickerHold = 0;
  let live = false;
  let boot = 0;

  const tickFlicker = (delta: number) => {
    flickerHold -= delta;
    if (flickerHold > 0) return;

    const roll = Math.random();
    if (roll < 0.14) {
      brightness = 0.22 + Math.random() * 0.28;
      flickerHold = 0.04 + Math.random() * 0.08;
    } else if (roll < 0.2) {
      brightness = 0.08 + Math.random() * 0.12;
      flickerHold = 0.03 + Math.random() * 0.05;
    } else if (roll < 0.32) {
      brightness = 1;
      flickerHold = 0.05 + Math.random() * 0.08;
    } else {
      brightness = 0.7 + Math.random() * 0.3;
      flickerHold = 0.07 + Math.random() * 0.2;
    }
  };

  const withScreen = (drawFn: () => void) => {
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(-Math.PI / 2);
    ctx.beginPath();
    ctx.rect(-screenH / 2, -screenW / 2, screenH, screenW);
    ctx.clip();
    drawFn();
    ctx.restore();
  };

  const drawHeart = () => {
    ctx.save();
    ctx.globalAlpha = brightness * boot;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      heartSprite,
      -heartWidth / 2,
      -heartHeight / 2 - 40,
      heartWidth,
      heartHeight
    );
    ctx.restore();
  };

  const distortVein = (
    x: number,
    y: number,
    width: number,
    height: number,
    amp: number,
    phase: number
  ) => {
    const slice = ctx.getImageData(x, y, width, height);
    const src = new Uint8ClampedArray(slice.data);
    const dst = slice.data;
    dst.fill(0);

    for (let col = 0; col < width; col += 1) {
      const shift = Math.round(
        Math.sin(phase + col * 0.38) * amp +
          Math.sin(phase * 0.55 + col * 0.12) * amp * 0.45
      );
      for (let row = 0; row < height; row += 1) {
        const from = row - shift;
        if (from < 0 || from >= height) continue;
        const si = (from * width + col) * 4;
        const di = (row * width + col) * 4;
        dst[di] = src[si];
        dst[di + 1] = src[si + 1];
        dst[di + 2] = src[si + 2];
        dst[di + 3] = src[si + 3];
      }
    }

    ctx.putImageData(slice, x, y);
  };

  const drawRollingVeins = (clock: number) => {
    const x0 = Math.floor(SCREEN_U0 * TEX);
    const y0 = Math.floor(SCREEN_V0 * TEX);
    const bw = Math.ceil(screenW);
    const bh = Math.ceil(screenH);
    const roll = (clock * 0.18) % 1;
    const veins = [
      { offset: 0, width: 20, amp: 18, glow: 0.12 },
      { offset: 0.38, width: 7, amp: 9, glow: 0.2 },
      { offset: 0.73, width: 13, amp: 15, glow: 0.1 },
    ];

    for (const vein of veins) {
      const t = (roll + vein.offset) % 1;
      const x = x0 + Math.floor(t * (bw - vein.width));
      distortVein(x, y0, vein.width, bh, vein.amp, clock * 6 + vein.offset * 8);
      ctx.fillStyle = `rgba(255, 214, 236, ${vein.glow})`;
      ctx.fillRect(x, y0, Math.max(2, Math.round(vein.width * 0.22)), bh);
    }
  };

  const draw = (animated: boolean) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050205';
    ctx.fillRect(0, 0, TEX, TEX);

    withScreen(() => {
      ctx.fillStyle = '#070407';
      ctx.fillRect(-screenH / 2, -screenW / 2, screenH, screenW);
      if (live) {
        drawHeart();
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = -screenW / 2; y < screenW / 2; y += 3) {
        ctx.fillRect(-screenH / 2, y, screenH, 1);
      }
    });

    if (live && animated) {
      drawRollingVeins(time);
    }

    texture.needsUpdate = true;
  };

  draw(false);

  return {
    texture,
    powerOn() {
      live = true;
      boot = 0;
      brightness = 1;
      flickerHold = 0.18;
    },
    advance(delta: number) {
      if (reducedMotion) {
        if (live && boot < 1) {
          boot = 1;
          draw(false);
        }
        return;
      }
      if (!live) return;
      time += delta;
      boot = Math.min(1, boot + delta * 3.4);
      if (boot > 0.5) tickFlicker(delta);
      draw(true);
    },
  };
}

function applyScreenTexture(root: THREE.Object3D, texture: THREE.CanvasTexture) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    const isScreen = materials.some(
      (material) => material?.name === 'screen_low'
    );
    if (!isScreen) return;

    const screenMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    screenMaterial.name = 'screen_low';
    child.material = screenMaterial;
  });
}

function placeOnGround(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
}

function FrameModel({ object }: { object: THREE.Object3D }) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    const parent = object.parent;
    const savedY = parent?.position.y ?? 0;
    if (parent) {
      parent.position.y = 0;
      parent.updateWorldMatrix(true, true);
    }
    object.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      if (parent) parent.position.y = savedY;
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const refVFov = THREE.MathUtils.degToRad(28);
    const hFov = 2 * Math.atan(Math.tan(refVFov / 2) * 0.85);
    persp.fov = THREE.MathUtils.radToDeg(
      2 * Math.atan(Math.tan(hFov / 2) / aspect)
    );
    const dist = (sphere.radius * 1.42) / Math.sin(refVFov / 2);
    const direction = new THREE.Vector3(0.58, 0.22, 1).normalize();
    const target = center.clone();
    target.y += sphere.radius * 0.03;
    target.x -= 0.05;

    camera.position.copy(center).addScaledVector(direction, dist);
    camera.near = Math.max(dist / 80, 0.01);
    camera.far = dist * 20;
    camera.lookAt(target);
    persp.updateProjectionMatrix();

    if (parent) {
      parent.position.y = savedY;
      parent.updateWorldMatrix(true, true);
    }
  }, [object, camera, size]);

  return null;
}

function CrtModel() {
  const drop = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const landed = useRef(false);
  const powered = useRef(false);
  const settle = useRef(0);
  const hang = useRef(0);
  const drawer = useMemo(() => createScreenDrawer(), []);
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const dropHeight = useMemo(() => {
    if (!model) return 1.1;
    const box = new THREE.Box3().setFromObject(model);
    return Math.max(1.5, (box.max.y - box.min.y) * 5);
  }, [model]);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();

    loader.load(
      MODEL_URL,
      (gltf) => {
        if (cancelled) return;
        const copy = gltf.scene.clone(true);
        applyScreenTexture(copy, drawer.texture);
        placeOnGround(copy);
        setModel(copy);
      },
      undefined,
      (error) => {
        console.error('Failed to load CRT model', error);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [drawer]);

  useLayoutEffect(() => {
    if (drop.current && model) {
      drop.current.position.y = dropHeight;
    }
  }, [model, dropHeight]);

  useFrame((_, delta) => {
    const group = drop.current;
    if (!group || !model) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      group.position.y = 0;
      if (!powered.current) {
        powered.current = true;
        drawer.powerOn();
      }
      drawer.advance(delta);
      return;
    }

    if (!landed.current) {
      hang.current += delta;
      if (hang.current < DROP_HANG) {
        group.position.y = dropHeight;
        return;
      }
      progress.current = Math.min(1, progress.current + delta / DROP_DURATION);
      group.position.y = dropHeight * (1 - easeOutBounce(progress.current));
      if (progress.current >= 1) {
        landed.current = true;
        group.position.y = 0;
      }
    } else if (!powered.current) {
      settle.current += delta;
      if (settle.current >= POWER_DELAY) {
        powered.current = true;
        drawer.powerOn();
      }
    }

    drawer.advance(delta);
  });

  if (!model) return null;

  return (
    <group>
      <group ref={drop}>
        <primitive object={model} />
      </group>
      <FrameModel object={model} />
    </group>
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#fff4e8', '#6b6560', 0.55]} />
      <directionalLight
        position={[1.4, 2.2, 1.8]}
        intensity={1.4}
        color="#fff6ea"
      />
      <directionalLight
        position={[-1.6, 0.8, 0.6]}
        intensity={0.4}
        color="#9ec9ff"
      />
    </>
  );
}

export default function HeroCrtComputer() {
  return (
    <div
      className={styles.crtCanvas}
      role="img"
      aria-label="레트로 CRT 모니터에 켜진 핑크 하트"
    >
      <Canvas
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0.45, 0.22, 0.75], fov: 28, near: 0.01, far: 20 }}
        onCreated={({ scene, camera }) => {
          (window as Window & { __crtScene?: THREE.Scene; __crtCam?: THREE.Camera }).__crtScene = scene;
          (window as Window & { __crtCam?: THREE.Camera }).__crtCam = camera;
        }}
      >
        <SceneLights />
        <CrtModel />
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.32}
          scale={1.4}
          blur={2.4}
          far={0.8}
        />
      </Canvas>
    </div>
  );
}
