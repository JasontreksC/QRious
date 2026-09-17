'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './y2k-theme.module.css';

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

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const HEART_SIZE = { width: 92, height: 107 };

function createScreenDrawer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas is unavailable');
  }

  const heartSprite = createHeartSprite();
  const reducedMotion = prefersReducedMotion();
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

    const draw = (animated: boolean) => {
    const { width, height } = canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#070407';
    ctx.fillRect(0, 0, width, height);

    if (live) {
      const heartW = width * (HEART_SIZE.width / 100);
      const heartH = height * (HEART_SIZE.height / 100);
      ctx.save();
      ctx.globalAlpha = brightness * boot;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        heartSprite,
        (width - heartW) / 2,
        (height - heartH) / 2 - height * 0.06,
        heartW,
        heartH
      );
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }

    if (live && animated) {
      const roll = (time * 0.18) % 1;
      const veins = [
        { offset: 0, height: 10, glow: 0.14 },
        { offset: 0.38, height: 4, glow: 0.22 },
        { offset: 0.73, height: 7, glow: 0.1 },
      ];
      for (const vein of veins) {
        const t = (roll + vein.offset) % 1;
        const y = t * (height - vein.height);
        const shift = Math.round(Math.sin(time * 6 + vein.offset * 8) * 5);
        ctx.drawImage(
          canvas,
          0,
          y,
          width,
          vein.height,
          shift,
          y,
          width,
          vein.height
        );
        ctx.fillStyle = `rgba(255, 214, 236, ${vein.glow})`;
        ctx.fillRect(0, y, width, Math.max(1, Math.round(vein.height * 0.28)));
      }
    }
  };

  draw(false);

  return {
    powerOn() {
      live = true;
      boot = reducedMotion ? 1 : 0;
      brightness = 1;
      flickerHold = 0.18;
      draw(!reducedMotion);
    },
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || 340;
      const cssH = canvas.clientHeight || 520;
      const nextW = Math.max(1, Math.round(cssW * dpr));
      const nextH = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      draw(live && !reducedMotion);
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

type Point = { x: number; y: number };

type ScreenCorners = {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
};

const SCREEN_CORNERS: ScreenCorners = {
  tl: { x: 26.21, y: 40.19 },
  tr: { x: 60.96, y: 42.71 },
  br: { x: 59.9, y: 67.43 },
  bl: { x: 27.46, y: 63.22 },
};

function adj3(m: number[]) {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

function mul3(a: number[], b: number[]) {
  const result = Array.from({ length: 9 }, () => 0);
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      result[i * 3 + j] =
        a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return result;
}

function mul3v(m: number[], v: number[]) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(p1: Point, p2: Point, p3: Point, p4: Point) {
  const m = [p1.x, p2.x, p3.x, p1.y, p2.y, p3.y, 1, 1, 1];
  const v = mul3v(adj3(m), [p4.x, p4.y, 1]);
  return mul3(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

function matrix3dForQuad(
  width: number,
  height: number,
  corners: ScreenCorners
) {
  const src = basisToPoints(
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  );
  const dst = basisToPoints(corners.tl, corners.tr, corners.br, corners.bl);
  const h = mul3(dst, adj3(src));
  const n = h[8] || 1;
  for (let i = 0; i < 9; i += 1) h[i] /= n;
  return `matrix3d(${h[0]}, ${h[3]}, 0, ${h[6]}, ${h[1]}, ${h[4]}, 0, ${h[7]}, 0, 0, 1, 0, ${h[2]}, ${h[5]}, 0, ${h[8]})`;
}

export default function HeroCrtComputer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<ReturnType<typeof createScreenDrawer> | null>(null);
  const pendingPower = useRef(false);
  const [size, setSize] = useState({ width: 340, height: 400 });

  const transform = useMemo(
    () => matrix3dForQuad(size.width, size.height, {
      tl: { x: (SCREEN_CORNERS.tl.x / 100) * size.width, y: (SCREEN_CORNERS.tl.y / 100) * size.height },
      tr: { x: (SCREEN_CORNERS.tr.x / 100) * size.width, y: (SCREEN_CORNERS.tr.y / 100) * size.height },
      br: { x: (SCREEN_CORNERS.br.x / 100) * size.width, y: (SCREEN_CORNERS.br.y / 100) * size.height },
      bl: { x: (SCREEN_CORNERS.bl.x / 100) * size.width, y: (SCREEN_CORNERS.bl.y / 100) * size.height },
    }),
    [size]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawer = createScreenDrawer(canvas);
    drawerRef.current = drawer;
    drawer.resize();
    if (pendingPower.current) {
      drawer.powerOn();
    }

    const onResize = () => {
      drawer.resize();
      const host = hostRef.current;
      if (host) {
        setSize({ width: host.clientWidth, height: host.clientHeight });
      }
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);
    window.addEventListener('resize', onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      drawerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      drawerRef.current?.advance(delta);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const powerOn = () => {
    pendingPower.current = true;
    const drawer = drawerRef.current;
    if (!drawer) return;
    drawer.resize();
    drawer.powerOn();
  };

  return (
    <div
      ref={hostRef}
      className={styles.crtCanvas}
      role="img"
      aria-label="레트로 CRT 모니터에 켜진 핑크 하트"
    >
      <Image
        src="/hero/crt-monitor.png"
        alt=""
        fill
        priority
        sizes="340px"
        quality={90}
        unoptimized
        className={styles.crtStill}
        onLoad={powerOn}
      />
      <canvas
        ref={canvasRef}
        className={styles.crtScreen}
        style={{ transform }}
        aria-hidden
      />
    </div>
  );
}
