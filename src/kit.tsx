import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "./script";

export const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* time + small helpers                                                 */
/* ------------------------------------------------------------------ */

// Seconds since the start of the current <Sequence> (shot).
export const useT = (): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ease = (v: number) => Easing.inOut(Easing.cubic)(clamp01(v));
export const easeOut = (v: number) => Easing.out(Easing.cubic)(clamp01(v));

// Deterministic pseudo-random number in 0..1 (same every render, so frames are reproducible).
export const rnd = (i: number, k = 0) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const mix = (a: string, b: string, k: number) =>
  "#" + new THREE.Color(a).lerp(new THREE.Color(b), clamp01(k)).getHexString();

// Half line width in world units that keeps a line about `px` pixels thick on a 1080x1920 frame
// when the camera is `z` units away (fov 40).
export const hw = (z: number, px = 3) => (px * z) / 5276;

/* ------------------------------------------------------------------ */
/* camera                                                               */
/* ------------------------------------------------------------------ */

export type CamKey = { t: number; z: number; x?: number; y?: number; rx?: number; ry?: number; rz?: number };

// Keeps the stage origin about 10% above screen centre at every zoom level,
// so the subject sits above the caption area.
const LIFT = 0.0728;

export const camAt = (keys: CamKey[], t: number) => {
  const times = keys.map((k) => k.t);
  const opts = {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
  };
  const ch = (f: (k: CamKey) => number) => interpolate(t, times, keys.map(f), opts);
  // z is interpolated in log space so zooms feel like constant-speed zooms.
  const z = Math.exp(interpolate(t, times, keys.map((k) => Math.log(k.z)), opts));
  return {
    z,
    x: ch((k) => k.x ?? 0),
    y: ch((k) => k.y ?? 0) - LIFT * z,
    rx: ch((k) => k.rx ?? 0),
    ry: ch((k) => k.ry ?? 0),
    rz: ch((k) => k.rz ?? 0),
  };
};

export const useShot = (keys: CamKey[]) => {
  const t = useT();
  return { t, cam: camAt(keys, t) };
};

export const Rig: React.FC<{ keys: CamKey[] }> = ({ keys }) => {
  const camera = useThree((s) => s.camera);
  const t = useT();
  const c = camAt(keys, t);
  useLayoutEffect(() => {
    camera.position.set(c.x, c.y, c.z);
    camera.rotation.set(c.rx, c.ry, c.rz);
    camera.updateMatrixWorld();
  });
  return null;
};

/* ------------------------------------------------------------------ */
/* glowing ribbons (thick lines that work in every WebGL)               */
/* ------------------------------------------------------------------ */

export type Pt = { x: number; y: number; w?: number; a?: number };
export type Seg = [number, number, number, number];

const ribbonGeometry = (pts: Pt[], half: number, rgb: THREE.Color, closed: boolean) => {
  const n = pts.length;
  const pos = new Float32Array(n * 6);
  const col = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const p1 = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let tx = p1.x - p0.x;
    let ty = p1.y - p0.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const hwid = half * (p.w ?? 1);
    const a = p.a ?? 1;
    const nx = -ty * hwid;
    const ny = tx * hwid;
    pos.set([p.x + nx, p.y + ny, 0, p.x - nx, p.y - ny, 0], i * 6);
    col.set([rgb.r * a, rgb.g * a, rgb.b * a, rgb.r * a, rgb.g * a, rgb.b * a], i * 6);
  }
  const segs = closed ? n : n - 1;
  const idx: number[] = [];
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    idx.push(2 * i, 2 * i + 1, 2 * j, 2 * i + 1, 2 * j + 1, 2 * j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
};

const segGeometry = (segs: Seg[], half: number) => {
  const n = segs.length;
  const pos = new Float32Array(n * 12);
  const idx: number[] = [];
  segs.forEach(([x1, y1, x2, y2], i) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * half;
    const ny = (dx / l) * half;
    pos.set([x1 + nx, y1 + ny, 0, x1 - nx, y1 - ny, 0, x2 + nx, y2 + ny, 0, x2 - nx, y2 - ny, 0], i * 12);
    const b = i * 4;
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
};

export const Ribbon: React.FC<{
  pts: Pt[];
  width?: number; // half width in world units
  color: string;
  opacity?: number;
  closed?: boolean;
  halo?: number; // 0 = no glow pass
  z?: number;
}> = ({ pts, width = 0.03, color, opacity = 1, closed = false, halo = 0.22, z = 0 }) => {
  const geos = useMemo(() => {
    const c = new THREE.Color(color);
    return {
      core: ribbonGeometry(pts, width, c, closed),
      glow: halo > 0 ? ribbonGeometry(pts, width * 3.6, c, closed) : null,
    };
  }, [pts, width, color, closed, halo]);
  useEffect(
    () => () => {
      geos.core.dispose();
      geos.glow?.dispose();
    },
    [geos],
  );
  return (
    <group position={[0, 0, z]}>
      {geos.glow && (
        <mesh geometry={geos.glow} frustumCulled={false}>
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={opacity * halo}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh geometry={geos.core} frustumCulled={false}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

// Many separate straight segments drawn as one mesh (brick joints, outlines, dashes).
export const Lines: React.FC<{
  segs: Seg[];
  width?: number;
  color: string;
  opacity?: number;
  halo?: number;
  z?: number;
}> = ({ segs, width = 0.02, color, opacity = 1, halo = 0.18, z = 0 }) => {
  const geos = useMemo(
    () => ({ core: segGeometry(segs, width), glow: halo > 0 ? segGeometry(segs, width * 3.6) : null }),
    [segs, width, halo],
  );
  useEffect(
    () => () => {
      geos.core.dispose();
      geos.glow?.dispose();
    },
    [geos],
  );
  return (
    <group position={[0, 0, z]}>
      {geos.glow && (
        <mesh geometry={geos.glow} frustumCulled={false}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity * halo}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh geometry={geos.core} frustumCulled={false}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

export const rectSegs = (cx: number, cy: number, w: number, h: number): Seg[] => {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const b = cy - h / 2;
  const t = cy + h / 2;
  return [
    [l, b, r, b],
    [r, b, r, t],
    [r, t, l, t],
    [l, t, l, b],
  ];
};

/* ------------------------------------------------------------------ */
/* glows, discs, panels                                                 */
/* ------------------------------------------------------------------ */

let glowTexture: THREE.CanvasTexture | null = null;
const getGlowTexture = () => {
  if (!glowTexture) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.6, "rgba(255,255,255,0.12)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    glowTexture = new THREE.CanvasTexture(c);
    glowTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return glowTexture;
};

export const Glow: React.FC<{ x?: number; y?: number; z?: number; r: number; color: string; opacity?: number }> = ({
  x = 0,
  y = 0,
  z = 0,
  r,
  color,
  opacity = 1,
}) => (
  <mesh position={[x, y, z]} scale={[r * 2, r * 2, 1]} frustumCulled={false}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial
      map={getGlowTexture()}
      color={color}
      transparent
      opacity={opacity}
      blending={THREE.AdditiveBlending}
      depthWrite={false}
      toneMapped={false}
    />
  </mesh>
);

export const Disc: React.FC<{
  x?: number;
  y?: number;
  z?: number;
  r: number;
  color: string;
  opacity?: number;
  additive?: boolean;
}> = ({ x = 0, y = 0, z = 0, r, color, opacity = 1, additive = false }) => (
  <mesh position={[x, y, z]} scale={[r, r, 1]} frustumCulled={false}>
    <circleGeometry args={[1, 32]} />
    <meshBasicMaterial
      color={color}
      transparent
      opacity={opacity}
      blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      depthWrite={false}
      toneMapped={false}
    />
  </mesh>
);

export const Panel: React.FC<{
  x?: number;
  y?: number;
  z?: number;
  w: number;
  h: number;
  color: string;
  opacity?: number;
  rot?: number;
  additive?: boolean;
}> = ({ x = 0, y = 0, z = 0, w, h, color, opacity = 1, rot = 0, additive = false }) => (
  <mesh position={[x, y, z]} rotation={[0, 0, rot]} scale={[w, h, 1]} renderOrder={additive ? 0 : -1} frustumCulled={false}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial
      color={color}
      transparent
      opacity={opacity}
      blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      depthWrite={false}
      side={THREE.DoubleSide}
      toneMapped={false}
    />
  </mesh>
);

/* ------------------------------------------------------------------ */
/* waves                                                                */
/* ------------------------------------------------------------------ */

type RayOpts = {
  ox: number;
  oy: number;
  dx: number; // unit direction
  dy: number;
  len: number;
  amp: number;
  wl: number;
  phase: number; // radians; use TAU * speed * t / wl
  env?: (s: number) => number; // 0..1 along the ray
  perWl?: number;
  fadeStart?: boolean;
  fadeEnd?: boolean;
};

// A sine wave travelling along a straight ray (sin(k s - phase) moves in the +s direction).
export const waveRay = (o: RayOpts): Pt[] => {
  const perWl = o.perWl ?? 20;
  const n = Math.min(3600, Math.max(40, Math.ceil((o.len / o.wl) * perWl)));
  const nx = -o.dy;
  const ny = o.dx;
  const fadeN = n * 0.06;
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (o.len * i) / n;
    const e = o.env ? o.env(s) : 1;
    const d = o.amp * e * Math.sin((TAU * s) / o.wl - o.phase);
    let edge = 1;
    if (o.fadeStart !== false) edge = Math.min(edge, i / fadeN);
    if (o.fadeEnd !== false) edge = Math.min(edge, (n - i) / fadeN);
    out.push({
      x: o.ox + o.dx * s + nx * d,
      y: o.oy + o.dy * s + ny * d,
      a: Math.max(0, Math.min(1, e * 1.4, edge)),
      w: 0.4 + 0.6 * Math.min(1, e),
    });
  }
  return out;
};

// Horizontal wave from x0 to x1 (the envelope gets the absolute x).
export const wave = (o: {
  x0: number;
  x1: number;
  y?: number;
  amp: number;
  wl: number;
  phase: number;
  env?: (x: number) => number;
  perWl?: number;
  fadeStart?: boolean;
  fadeEnd?: boolean;
}): Pt[] =>
  waveRay({
    ox: o.x0,
    oy: o.y ?? 0,
    dx: 1,
    dy: 0,
    len: o.x1 - o.x0,
    amp: o.amp,
    wl: o.wl,
    phase: o.phase,
    env: o.env ? (s) => o.env!(o.x0 + s) : undefined,
    perWl: o.perWl,
    fadeStart: o.fadeStart,
    fadeEnd: o.fadeEnd,
  });

export const phaseOf = (t: number, wl: number, speed = 3.2) => (TAU * speed * t) / wl;

// A single photon: a short wave packet plus a glowing core. Bigger/brighter core = more energy.
export const Packet: React.FC<{
  cx: number;
  y: number;
  wl: number;
  sigma: number;
  amp: number;
  color: string;
  core: number;
  t: number;
  speed?: number;
  coreOpacity?: number;
  width?: number;
  opacity?: number;
}> = ({ cx, y, wl, sigma, amp, color, core, t, speed = 4, coreOpacity = 1, width = 0.035, opacity = 1 }) => {
  const pts = wave({
    x0: cx - 3.2 * sigma,
    x1: cx + 3.2 * sigma,
    y,
    amp,
    wl,
    phase: (TAU * speed * t) / wl,
    env: (x) => Math.exp(-(((x - cx) / sigma) ** 2)),
    perWl: 26,
  });
  return (
    <group>
      <Ribbon pts={pts} width={width} color={color} opacity={opacity} />
      {core > 0 && <Glow x={cx} y={y} r={core} color={color} opacity={coreOpacity * opacity} />}
    </group>
  );
};

export const circlePts = (cx: number, cy: number, r: number, n = 48): Pt[] =>
  Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos((i / n) * TAU) * r, y: cy + Math.sin((i / n) * TAU) * r }));

/* ------------------------------------------------------------------ */
/* atoms, electrons, energy ladder                                      */
/* ------------------------------------------------------------------ */

export const Electron: React.FC<{ x: number; y: number; glow?: number; s?: number }> = ({ x, y, glow = 1, s = 1 }) => (
  <group>
    <Glow x={x} y={y} r={0.8 * s} color={COLORS.electron} opacity={0.55 * glow} />
    <Disc x={x} y={y} z={0.02} r={0.15 * s} color={COLORS.electron} additive />
  </group>
);

export const Atom: React.FC<{
  x: number;
  y: number;
  t: number;
  seed: number;
  s?: number;
  opacity?: number;
  flash?: number;
}> = ({ x, y, t, seed, s = 1, opacity = 1, flash = 0 }) => {
  const tilt = rnd(seed, 7) * Math.PI;
  const rot = (ex: number, ey: number) => ({
    x: ex * Math.cos(tilt) - ey * Math.sin(tilt),
    y: ex * Math.sin(tilt) + ey * Math.cos(tilt),
  });
  const orbit = useMemo(
    () => Array.from({ length: 36 }, (_, i) => rot(Math.cos((i / 36) * TAU) * 0.9, Math.sin((i / 36) * TAU) * 0.38)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tilt],
  );
  const a = t * (1.4 + rnd(seed, 8)) + rnd(seed, 9) * TAU;
  const p = rot(Math.cos(a) * 0.9, Math.sin(a) * 0.38);
  return (
    <group position={[x, y, 0]} scale={[s, s, 1]}>
      <Ribbon pts={orbit} width={0.014} color={COLORS.ice} opacity={0.4 * opacity} closed halo={0} />
      <Disc r={0.2} color="#7d92cf" opacity={0.8 * opacity} />
      <Disc x={p.x} y={p.y} z={0.02} r={0.08} color={COLORS.electron} opacity={opacity} additive />
      {flash > 0.01 && <Glow r={1.3} color={COLORS.amberHi} opacity={flash} />}
    </group>
  );
};

export const Lattice: React.FC<{
  t: number;
  cols: number;
  rows: number;
  gap: number;
  s?: number;
  opacity?: number;
  z?: number;
  flash?: (i: number) => number;
}> = ({ t, cols, rows, gap, s = 1, opacity = 1, z = 0, flash }) => {
  if (opacity <= 0.005) return null;
  const atoms: React.ReactNode[] = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * gap + (r % 2 ? gap / 2 : 0) - gap / 4;
      const y = (r - (rows - 1) / 2) * gap * 0.9;
      atoms.push(<Atom key={i} x={x} y={y} t={t} seed={i + 1} s={s} opacity={opacity} flash={flash ? flash(i) : 0} />);
      i++;
    }
  }
  return <group position={[0, 0, z]}>{atoms}</group>;
};

// Two rungs and a dashed bracket for the "step" between them.
export const Ladder: React.FC<{ lowY: number; highY: number; w?: number; opacity?: number }> = ({
  lowY,
  highY,
  w = 5,
  opacity = 1,
}) => {
  const { low, high, dashes } = useMemo(() => {
    const rung = (y: number): Pt[] => [
      { x: -w / 2, y, a: 0 },
      { x: -w / 2 + 0.5, y, a: 1 },
      { x: w / 2 - 0.5, y, a: 1 },
      { x: w / 2, y, a: 0 },
    ];
    const n = Math.max(4, Math.round((highY - lowY) / 0.45));
    const d: Seg[] = [];
    for (let i = 0; i < n; i++) {
      const y0 = lowY + ((highY - lowY) * (i + 0.2)) / n;
      const y1 = lowY + ((highY - lowY) * (i + 0.7)) / n;
      d.push([-w / 2 - 0.5, y0, -w / 2 - 0.5, y1]);
    }
    d.push([-w / 2 - 0.7, lowY, -w / 2 - 0.3, lowY], [-w / 2 - 0.7, highY, -w / 2 - 0.3, highY]);
    return { low: rung(lowY), high: rung(highY), dashes: d };
  }, [lowY, highY, w]);
  return (
    <group>
      <Ribbon pts={low} width={0.035} color={COLORS.ice} opacity={opacity} />
      <Ribbon pts={high} width={0.03} color={COLORS.ice} opacity={0.6 * opacity} />
      <Lines segs={dashes} width={0.02} color={COLORS.amber} opacity={0.85 * opacity} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* wall + backdrop                                                      */
/* ------------------------------------------------------------------ */

const brickSegs = (cx: number, w: number, h: number): Seg[] => {
  const row = 0.6;
  const brick = 0.7;
  const segs: Seg[] = [];
  const l = cx - w / 2;
  const r = cx + w / 2;
  const rows = Math.round(h / row);
  for (let k = 0; k <= rows; k++) {
    const y = -h / 2 + k * row;
    segs.push([l, y, r, y]);
    if (k === rows) break;
    const off = (k % 2) * (brick / 2);
    for (let x = l + off + brick; x < r - 0.01; x += brick) segs.push([x, y, x, y + row]);
  }
  return segs;
};

export const Wall: React.FC<{
  x?: number;
  w?: number;
  h?: number;
  lw?: number; // half line width
  bricks?: number; // 0..1 opacity of the brick joints
  fill?: string;
  fillOpacity?: number;
  outline?: string;
  outlineOpacity?: number;
  z?: number;
}> = ({
  x = 0,
  w = 1.4,
  h = 40,
  lw = 0.02,
  bricks = 1,
  fill = COLORS.brick,
  fillOpacity = 0.3,
  outline = COLORS.ice,
  outlineOpacity = 0.9,
  z = 0,
}) => {
  const joints = useMemo(() => brickSegs(x, w, h), [x, w, h]);
  const frame = useMemo(() => rectSegs(x, 0, w, h), [x, w, h]);
  return (
    <group position={[0, 0, z]}>
      <Panel x={x} w={w} h={h} z={-0.05} color={fill} opacity={fillOpacity} />
      {bricks > 0.01 && <Lines segs={joints} width={lw * 0.6} color={COLORS.ice} opacity={0.5 * bricks} halo={0.12} />}
      <Lines segs={frame} width={lw} color={outline} opacity={outlineOpacity} />
    </group>
  );
};

// Soft navy glow plus slow drifting dust, so the background has depth for parallax.
export const Backdrop: React.FC<{ t: number; tint?: string; dust?: number }> = ({ t, tint = COLORS.glow, dust = 30 }) => (
  <group>
    <Glow x={0} y={0} z={-40} r={80} color={tint} opacity={0.55} />
    {Array.from({ length: dust }, (_, i) => {
      const x = (rnd(i, 1) - 0.5) * 70;
      const z = -4 - rnd(i, 3) * 30;
      const y = ((((rnd(i, 2) - 0.5) * 70 + t * (0.3 + rnd(i, 4) * 0.5) + 35) % 70) + 70) % 70 - 35;
      return <Disc key={i} x={x} y={y} z={z} r={0.05 + rnd(i, 5) * 0.1} color={COLORS.ice} opacity={0.15 + rnd(i, 6) * 0.3} additive />;
    })}
  </group>
);
