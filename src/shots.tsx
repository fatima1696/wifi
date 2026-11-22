import React from "react";
import { COLORS } from "./script";
import {
  Backdrop,
  CamKey,
  Disc,
  Electron,
  Glow,
  Ladder,
  Lattice,
  Lines,
  Packet,
  Panel,
  Ribbon,
  Rig,
  Seg,
  TAU,
  Wall,
  circlePts,
  clamp01,
  ease,
  easeOut,
  hw,
  mix,
  phaseOf,
  rectSegs,
  rnd,
  useShot,
  wave,
  waveRay,
} from "./kit";

const A = COLORS.amber;
const AH = COLORS.amberHi;
const W = COLORS.wifi;
const ICE = COLORS.ice;
const STEEL = COLORS.steel;

// Two lanes of light that cross the wall in the opening and the closing shot.
const AMBER_Y = 2.6;
const WIFI_Y = -1.6;
const WL_AMBER = 0.42;
const WL_WIFI = 2.3;

// Ladder geometry shared by the electron shots.
const LOW = -1.4;
const HIGH = 1.5;
const ELEC_UP = 0.55;

const visibleWidth = (z: number) => 0.4094 * z;

/* ------------------------------------------------------------------ */
/* 1. Hook: Wi-Fi goes through the wall, visible light stops            */
/* ------------------------------------------------------------------ */
export const K1: CamKey[] = [
  { t: 0, z: 6.5, x: -1.2, rz: 0.07 },
  { t: 2.1, z: 23, x: 0.2, rz: -0.02 },
  { t: 3.3, z: 25, x: 0.6, rz: 0 },
];

const Lanes: React.FC<{ t: number; z: number; wifiEnd?: number }> = ({ t, z, wifiEnd = 18 }) => {
  const lw = hw(z, 3);
  const amber = wave({
    x0: -18,
    x1: -0.1,
    y: AMBER_Y,
    amp: 0.3,
    wl: WL_AMBER,
    phase: phaseOf(t, WL_AMBER),
    env: (x) => (x < -0.7 ? 1 : Math.exp(-(x + 0.7) / 0.1)),
  });
  const wifi = wave({ x0: -18, x1: wifiEnd, y: WIFI_Y, amp: 0.5, wl: WL_WIFI, phase: phaseOf(t, WL_WIFI), perWl: 28 });
  return (
    <>
      <Ribbon pts={amber} width={lw} color={A} />
      <Glow x={-0.7} y={AMBER_Y} r={1.0 + 0.2 * Math.sin(t * 28)} color={AH} opacity={0.8} />
      <Ribbon pts={wifi} width={lw} color={W} />
    </>
  );
};

export const ShotLanes: React.FC = () => {
  const { t, cam } = useShot(K1);
  return (
    <>
      <Rig keys={K1} />
      <Backdrop t={t} />
      <Wall lw={hw(cam.z, 2.4)} />
      <Lanes t={t} z={cam.z} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 2. Same stuff, just stretched                                        */
/* ------------------------------------------------------------------ */
const K2: CamKey[] = [
  { t: 0, z: 19, rx: 0.18, rz: -0.05 },
  { t: 2.9, z: 13, rx: 0, rz: 0.04 },
];

export const ShotStretch: React.FC = () => {
  const { t, cam } = useShot(K2);
  const wl = 0.4 * Math.pow(10, ease(t / 2.7)); // 0.4 -> 4
  const col = mix(A, W, ease((t - 0.2) / 2.4));
  const rows = [
    { y: 0, amp: 0.34 + 0.1 * wl, ph: 0, o: 1 },
    { y: 2.3, amp: 0.2 + 0.06 * wl, ph: 1.4, o: 0.4 },
    { y: -2.3, amp: 0.2 + 0.06 * wl, ph: 2.8, o: 0.4 },
  ];
  return (
    <>
      <Rig keys={K2} />
      <Backdrop t={t} />
      {rows.map((r, i) => (
        <Ribbon
          key={i}
          pts={wave({ x0: -12, x1: 12, y: r.y, amp: r.amp, wl, phase: 4 * t + r.ph, perWl: 26 })}
          width={hw(cam.z, 3.4)}
          color={col}
          opacity={r.o}
        />
      ))}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 3. Huge pull-back: about a hundred thousand times longer             */
/* ------------------------------------------------------------------ */
const K3: CamKey[] = [
  { t: 0, z: 3.5, y: 4, rz: 0.05 },
  { t: 3.2, z: 105, y: -5, rz: 0 },
];

export const ShotRatio: React.FC = () => {
  const { t, cam } = useShot(K3);
  const half = visibleWidth(cam.z) * 0.62;
  const lw = hw(cam.z, 3);
  const amber = wave({
    x0: -half,
    x1: half,
    y: 4,
    amp: 0.05 + 0.0055 * cam.z,
    wl: 0.36,
    phase: phaseOf(t, 0.36, 1.2),
    perWl: 22,
  });
  const blue = wave({ x0: -half, x1: half, y: -14, amp: 5, wl: 36, phase: phaseOf(t, 36, 6), perWl: 40 });
  return (
    <>
      <Rig keys={K3} />
      <Backdrop t={t} />
      <Ribbon pts={amber} width={lw} color={A} />
      <Ribbon pts={blue} width={lw} color={W} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 4. Packets: each Wi-Fi photon is weaker                              */
/* ------------------------------------------------------------------ */
const K4: CamKey[] = [
  { t: 0, z: 15, rx: 0.1, rz: -0.04 },
  { t: 3.8, z: 10, rx: 0, rz: 0.03 },
];

export const ShotPackets: React.FC = () => {
  const { t } = useShot(K4);
  const amberAt = (i: number) => ((t * 3.2 + i * 9) % 20) - 10;
  const blueX = ((t * 3.2) % 24) - 12;
  return (
    <>
      <Rig keys={K4} />
      <Backdrop t={t} />
      {[0, 1].map((i) => (
        <Packet key={i} cx={amberAt(i)} y={2.4} wl={0.5} sigma={0.9} amp={0.55} color={A} core={1.2} t={t} speed={3.2} />
      ))}
      <Packet cx={blueX} y={-2.4} wl={2.6} sigma={3.4} amp={0.3} color={W} core={0.4} coreOpacity={0.45} t={t} speed={3.2} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 5. Dive from the wall into its atoms                                 */
/* ------------------------------------------------------------------ */
const K5: CamKey[] = [
  { t: 0, z: 34, rz: 0.04 },
  { t: 3.0, z: 2.3, x: 0.04, rz: -0.04 },
];

export const ShotDive: React.FC = () => {
  const { t, cam } = useShot(K5);
  return (
    <>
      <Rig keys={K5} />
      <Backdrop t={t} />
      <Lattice t={t} cols={5} rows={19} gap={0.28} s={0.12} opacity={clamp01((20 - cam.z) / 10)} />
      <Wall lw={hw(cam.z, 2.4)} bricks={clamp01((cam.z - 9) / 9)} fillOpacity={0.18 * clamp01((cam.z - 4) / 8)} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 6. The energy ladder: the step an electron needs                     */
/* ------------------------------------------------------------------ */
const K6: CamKey[] = [
  { t: 0, z: 9, rz: 0.03 },
  { t: 3.2, z: 12, y: 0.4, rz: -0.03 },
];

export const ShotLadder: React.FC = () => {
  const { t } = useShot(K6);
  const ey = LOW + ELEC_UP + 0.05 * Math.sin(t * 4);
  return (
    <>
      <Rig keys={K6} />
      <Backdrop t={t} />
      <Lattice t={t} cols={6} rows={11} gap={2.3} opacity={0.16} z={-1.5} />
      <Ladder lowY={LOW} highY={HIGH} />
      <Electron x={0} y={ey} />
      <Packet cx={-9 + 1.8 * t} y={LOW + ELEC_UP} wl={0.5} sigma={0.7} amp={0.4} color={A} core={0.8} t={t} speed={3.2} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 7. Visible light kicks the electron up, the wall eats the light      */
/* ------------------------------------------------------------------ */
const K7: CamKey[] = [
  { t: 0, z: 12, y: 0.4, rz: -0.03 },
  { t: 1.0, z: 8, y: 0.3, rz: 0.02 },
  { t: 3.2, z: 30, y: 0, rz: 0 },
];

export const ShotAbsorb: React.FC = () => {
  const { t } = useShot(K7);
  const base = LOW + ELEC_UP;
  const up = HIGH + ELEC_UP;
  const u = clamp01((t - 1.0) / 0.5);
  const ey =
    u < 1 ? base + (up - base) * easeOut(u) + Math.sin(Math.PI * u) * 0.7 : up + 0.06 * Math.sin(t * 5);
  const ex = u < 1 ? Math.sin(TAU * u) * 0.25 : 0;
  const fl = t >= 1.0 ? clamp01(1 - (t - 1.0) / 0.45) : 0;
  const rings = t > 1.5 ? [0, 0.5] : [];
  const lattOpacity = 0.16 + 0.34 * ease((t - 1.4) / 1.6);
  return (
    <>
      <Rig keys={K7} />
      <Backdrop t={t} />
      <Lattice
        t={t}
        cols={6}
        rows={11}
        gap={2.3}
        opacity={lattOpacity}
        z={-1.5}
        flash={(i) => (t > 1.5 ? Math.max(0, 1 - Math.abs(t - 1.7 - rnd(i, 3) * 1.3) * 2.2) * 0.8 : 0)}
      />
      <Ladder lowY={LOW} highY={HIGH} />
      <Electron x={ex} y={ey} glow={1 + fl} />
      {t < 1.0 && <Packet cx={-3.2 + 3.2 * t} y={base} wl={0.5} sigma={0.7} amp={0.4} color={A} core={0.8} t={t} speed={3.2} />}
      {fl > 0 && <Glow x={0} y={base} r={1.2 + 2.2 * (1 - fl)} color={AH} opacity={fl * 0.9} />}
      {rings.map((o, i) => {
        const k = ((t - 1.5) * 0.9 + o) % 1;
        return <Ribbon key={i} pts={circlePts(0, up, 0.4 + k * 2.2)} width={0.03} color={AH} opacity={(1 - k) * 0.6} closed halo={0.15} />;
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 8. Wi-Fi is too weak: the electron stays, the wave passes            */
/* ------------------------------------------------------------------ */
const K8: CamKey[] = [
  { t: 0, z: 12, y: 0.4, rz: -0.03 },
  { t: 2.6, z: 9, x: 1.2, rz: 0.03 },
];

export const ShotPass: React.FC = () => {
  const { t } = useShot(K8);
  const wob = 0.05 * Math.sin(t * 38) * Math.exp(-(((t - 1.5) / 0.8) ** 2));
  const y = LOW + ELEC_UP;
  return (
    <>
      <Rig keys={K8} />
      <Backdrop t={t} />
      <Lattice t={t} cols={6} rows={11} gap={2.3} opacity={0.16} z={-1.5} />
      <Ladder lowY={LOW} highY={HIGH} />
      <Electron x={wob} y={y + 0.05 * Math.sin(t * 4)} />
      <Packet cx={-8 + 5.5 * t} y={y} wl={2.6} sigma={2.6} amp={0.32} color={W} core={0.4} coreOpacity={0.5} t={t} speed={3.2} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 9. Pull-back out of the atoms: the wave slips through the whole wall */
/* ------------------------------------------------------------------ */
const K9: CamKey[] = [
  { t: 0, z: 2.3, x: 0.04, rz: -0.04 },
  { t: 2.8, z: 26, x: 0, rz: 0.02 },
];

export const ShotSlab: React.FC = () => {
  const { t, cam } = useShot(K9);
  const half = visibleWidth(cam.z) * 0.62;
  const lane = wave({ x0: -half, x1: half, y: 0, amp: 0.5, wl: WL_WIFI, phase: phaseOf(t, WL_WIFI), perWl: 28 });
  return (
    <>
      <Rig keys={K9} />
      <Backdrop t={t} />
      <Lattice t={t} cols={5} rows={19} gap={0.28} s={0.12} opacity={clamp01((20 - cam.z) / 10)} />
      <Wall lw={hw(cam.z, 2.4)} bricks={clamp01((cam.z - 9) / 9)} fillOpacity={0.18 * clamp01((cam.z - 4) / 8)} />
      <Ribbon pts={lane} width={hw(cam.z, 3)} color={W} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 10. Glass: the step is far too tall, even for visible light          */
/* ------------------------------------------------------------------ */
const HIGH_TALL = 6.2;
const K10: CamKey[] = [
  { t: 0, z: 8, y: -0.2, rz: 0.03 },
  { t: 1.8, z: 14, y: 2.6, rz: -0.02 },
  { t: 3.6, z: 12, x: 0.5, y: 2.9, rz: 0.01 },
];

export const ShotTall: React.FC = () => {
  const { t } = useShot(K10);
  const hop = 0.28 * Math.sin(Math.PI * clamp01((t - 1.5) / 0.45));
  return (
    <>
      <Rig keys={K10} />
      <Backdrop t={t} />
      <Lattice t={t} cols={6} rows={11} gap={2.3} opacity={0.14} z={-1.5} />
      <Ladder lowY={LOW} highY={HIGH_TALL} />
      <Electron x={0} y={LOW + ELEC_UP + hop} />
      <Packet cx={-8 + 4.6 * t} y={LOW + ELEC_UP} wl={0.5} sigma={0.7} amp={0.4} color={A} core={0.8} t={t} speed={3.2} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 11. Light passes straight through a glass pane                       */
/* ------------------------------------------------------------------ */
const K11: CamKey[] = [
  { t: 0, z: 9, x: -2, rz: 0.04 },
  { t: 3.2, z: 24, x: 0.3, rz: -0.03 },
];

export const ShotGlass: React.FC = () => {
  const { t, cam } = useShot(K11);
  const lw = hw(cam.z, 3);
  const frame = React.useMemo<Seg[]>(() => rectSegs(0, 0, 1.6, 40), []);
  const lane = wave({ x0: -18, x1: 18, y: 0.8, amp: 0.3, wl: WL_AMBER, phase: phaseOf(t, WL_AMBER) });
  return (
    <>
      <Rig keys={K11} />
      <Backdrop t={t} />
      <Panel w={1.6} h={40} z={-0.05} color={ICE} opacity={0.12} />
      <Lines segs={frame} width={lw * 0.8} color={ICE} opacity={0.9} />
      <Ribbon pts={lane} width={lw} color={A} />
      <Glow x={3.6} y={0.8} r={1.6} color={A} opacity={0.5} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 12. A brick wall turns into a window for Wi-Fi                       */
/* ------------------------------------------------------------------ */
const K12: CamKey[] = [
  { t: 0, z: 13, x: -0.5, rz: -0.04 },
  { t: 3.2, z: 26, x: 0.4, rz: 0.03 },
];

export const ShotWindow: React.FC = () => {
  const { t, cam } = useShot(K12);
  const u = ease((t - 0.5) / 1.8);
  const lw = hw(cam.z, 3);
  const mullions = React.useMemo<Seg[]>(
    () => [
      [-0.7, -3, 0.7, -3],
      [-0.7, 3, 0.7, 3],
      [0, -8, 0, 8],
    ],
    [],
  );
  const lane = wave({ x0: -18, x1: 18, y: 0, amp: 0.5, wl: WL_WIFI, phase: phaseOf(t, WL_WIFI), perWl: 28 });
  return (
    <>
      <Rig keys={K12} />
      <Backdrop t={t} />
      <Wall
        lw={lw * 0.7}
        bricks={1 - 0.9 * u}
        fill={mix(COLORS.brick, ICE, u)}
        fillOpacity={0.32 - 0.2 * u}
        outline={ICE}
      />
      <Lines segs={mullions} width={lw * 0.5} color={ICE} opacity={0.8 * u} />
      <Ribbon pts={lane} width={lw} color={W} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 13. Metal: a sea of loose electrons                                  */
/* ------------------------------------------------------------------ */
const K13: CamKey[] = [
  { t: 0, z: 20, rz: 0.05 },
  { t: 1.8, z: 3.0, rz: -0.04 },
  { t: 3.6, z: 2.4, x: 0.1, y: 0.2, rz: 0.03 },
];

const IONS = (() => {
  const out: { x: number; y: number }[] = [];
  const cols = 5;
  const rows = 19;
  const gap = 0.28;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push({ x: (c - (cols - 1) / 2) * gap + (r % 2 ? gap / 2 : 0) - gap / 4, y: (r - (rows - 1) / 2) * gap * 0.9 });
  return out;
})();

export const ShotSea: React.FC = () => {
  const { t, cam } = useShot(K13);
  const lw = hw(cam.z, 2.4);
  return (
    <>
      <Rig keys={K13} />
      <Backdrop t={t} />
      <Wall lw={lw} bricks={0} fill={STEEL} fillOpacity={0.14} outline={STEEL} />
      {IONS.map((p, i) => (
        <Disc key={i} x={p.x} y={p.y} z={-0.02} r={0.045} color={STEEL} opacity={0.5} />
      ))}
      {Array.from({ length: 56 }, (_, i) => {
        const x = 0.6 * Math.sin(t * (1.1 + 2.2 * rnd(i, 1)) + rnd(i, 2) * TAU);
        const y = 2.5 * Math.sin(t * (0.5 + 1.4 * rnd(i, 3)) + rnd(i, 4) * TAU);
        return (
          <group key={i}>
            <Glow x={x} y={y} z={0.03} r={0.05} color={COLORS.electron} opacity={0.6} />
            <Disc x={x} y={y} z={0.04} r={0.011} color={COLORS.electron} additive />
          </group>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 14. Both kinds of light bounce straight back off the metal           */
/* ------------------------------------------------------------------ */
const K14: CamKey[] = [
  { t: 0, z: 8, x: -2.2, rz: 0.05 },
  { t: 3.8, z: 23, x: 0, rz: -0.03 },
];

export const ShotMirror: React.FC = () => {
  const { t, cam } = useShot(K14);
  const lw = hw(cam.z, 3);
  const lanes = [
    { y: AMBER_Y, wl: WL_AMBER, amp: 0.3, col: A, th: 0.32 },
    { y: WIFI_Y, wl: WL_WIFI, amp: 0.5, col: W, th: -0.32 },
  ];
  return (
    <>
      <Rig keys={K14} />
      <Backdrop t={t} />
      <Wall lw={lw * 0.8} bricks={0} fill={STEEL} fillOpacity={0.28} outline={STEEL} />
      {lanes.map((l, i) => {
        const ph = phaseOf(t, l.wl);
        const incident = waveRay({ ox: -18, oy: l.y, dx: 1, dy: 0, len: 17.3, amp: l.amp, wl: l.wl, phase: ph, fadeEnd: false });
        const back = waveRay({
          ox: -0.7,
          oy: l.y,
          dx: -Math.cos(l.th),
          dy: Math.sin(l.th),
          len: 17,
          amp: l.amp * 0.9,
          wl: l.wl,
          phase: ph,
          env: (s) => Math.exp(-s / 10),
          fadeStart: false,
        });
        return (
          <group key={i}>
            <Ribbon pts={incident} width={lw} color={l.col} />
            <Ribbon pts={back} width={lw} color={l.col} />
            <Glow x={-0.7} y={l.y} r={0.9 + 0.15 * Math.sin(t * 25 + i)} color={mix(l.col, "#ffffff", 0.5)} opacity={0.8} />
          </group>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 15. Shiny metal, then the elevator that traps the signal             */
/* ------------------------------------------------------------------ */
const K15: CamKey[] = [
  { t: 0, z: 5.5, x: -2.6, y: 0.3, rz: 0.04 },
  { t: 2.0, z: 7, x: -2.0, rz: -0.02 },
  { t: 4.6, z: 24, x: 0, rz: 0.02 },
];

export const ShotElevator: React.FC = () => {
  const { t, cam } = useShot(K15);
  const lw = hw(cam.z, 3);
  const box = React.useMemo<Seg[]>(() => rectSegs(0, 0, 5.2, 7.4), []);
  const brushed = React.useMemo<Seg[]>(
    () => Array.from({ length: 24 }, (_, i) => [-2.6, -3.5 + i * 0.3, 2.6, -3.5 + i * 0.3] as Seg),
    [],
  );
  const door = React.useMemo<Seg[]>(() => [[0, -3.7, 0, 3.7]], []);
  const sweep = clamp01((t - 0.1) / 1.8);
  const aIn = easeOut((t - 1.8) / 0.8);
  const ringK = ((t - 2.0) * 0.9) % 1;
  const laneDefs = [
    { y: 3.2, th: 0.3 },
    { y: 0.4, th: -0.1 },
    { y: -2.4, th: -0.3 },
  ];
  return (
    <>
      <Rig keys={K15} />
      <Backdrop t={t} />
      <Panel w={5.2} h={7.4} z={-0.05} color={STEEL} opacity={0.14} />
      <Lines segs={brushed} width={lw * 0.3} color={STEEL} opacity={0.12} halo={0} />
      <Lines segs={door} width={lw * 0.5} color={STEEL} opacity={0.6} />
      <Lines segs={box} width={lw * 1.2} color={STEEL} opacity={0.95} />
      {t < 2.2 && (
        <>
          <Panel x={-4 + 3 * sweep} w={0.45} h={14} rot={0.45} color={AH} opacity={0.5 * Math.sin(Math.PI * sweep)} additive />
          <Panel x={-3.4 + 3 * sweep} w={0.12} h={14} rot={0.45} color="#ffffff" opacity={0.5 * Math.sin(Math.PI * sweep)} additive />
        </>
      )}
      <Glow x={0.3} y={-0.8} r={0.55} color={W} opacity={0.5} />
      <Disc x={0.3} y={-0.8} z={0.03} r={0.1} color={W} additive />
      {t > 2.0 && <Ribbon pts={circlePts(0.3, -0.8, 0.2 + ringK * 1.9)} width={0.03} color={W} opacity={(1 - ringK) * 0.35} closed halo={0.15} />}
      {laneDefs.map((l, i) => {
        const ph = phaseOf(t, WL_WIFI);
        const incident = waveRay({ ox: -18, oy: l.y, dx: 1, dy: 0, len: 15.4, amp: 0.4 * aIn, wl: WL_WIFI, phase: ph + i, perWl: 28, fadeEnd: false });
        const back = waveRay({
          ox: -2.6,
          oy: l.y,
          dx: -Math.cos(l.th),
          dy: Math.sin(l.th),
          len: 15,
          amp: 0.36 * aIn,
          wl: WL_WIFI,
          phase: ph + i,
          env: (s) => Math.exp(-s / 9),
          perWl: 28,
          fadeStart: false,
        });
        return (
          <group key={i}>
            <Ribbon pts={incident} width={lw} color={W} opacity={aIn} />
            <Ribbon pts={back} width={lw} color={W} opacity={aIn} />
          </group>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* 16. Full bars through the wall, then loop back to the opening        */
/* ------------------------------------------------------------------ */
const K16: CamKey[] = [
  { t: 0, z: 30, x: 2.6, rz: -0.03 },
  { t: 3.0, z: 17, x: 2.6, y: -0.5, rz: 0.02 },
  { t: 4.9, z: 11, x: 0.6, rz: 0.04 },
  { t: 6.0, z: 6.5, x: -1.2, rz: 0.07 }, // identical to the first pose of shot 1, so the video loops
];

export const ShotBars: React.FC = () => {
  const { t, cam } = useShot(K16);
  const lw = hw(cam.z, 3);
  const heights = [0.5, 0.9, 1.3, 1.7];
  return (
    <>
      <Rig keys={K16} />
      <Backdrop t={t} />
      <Wall lw={hw(cam.z, 2.4)} />
      <Lanes t={t} z={cam.z} wifiEnd={3.6} />
      <Glow x={3.8} y={WIFI_Y} r={0.9 + 0.15 * Math.sin(t * 9)} color={W} opacity={0.7} />
      {heights.map((h, i) => {
        const x = 4.4 + i * 0.5;
        const lit = easeOut((t - 0.8 - 0.45 * i) / 0.3);
        const cy = -2.5 + h / 2;
        return (
          <group key={i}>
            <Lines segs={rectSegs(x, cy, 0.3, h)} width={lw * 0.7} color={ICE} opacity={0.5} halo={0.1} />
            <Panel x={x} y={cy} w={0.3} h={h} color={W} opacity={0.9 * lit} additive />
          </group>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* timeline                                                             */
/* ------------------------------------------------------------------ */
export const SHOTS: { id: string; start: number; end: number; Scene: React.FC }[] = [
  { id: "lanes", start: 0, end: 3.3, Scene: ShotLanes },
  { id: "stretch", start: 3.3, end: 6.2, Scene: ShotStretch },
  { id: "ratio", start: 6.2, end: 9.4, Scene: ShotRatio },
  { id: "packets", start: 9.4, end: 13.2, Scene: ShotPackets },
  { id: "dive", start: 13.2, end: 16.2, Scene: ShotDive },
  { id: "ladder", start: 16.2, end: 19.4, Scene: ShotLadder },
  { id: "absorb", start: 19.4, end: 22.6, Scene: ShotAbsorb },
  { id: "pass", start: 22.6, end: 25.2, Scene: ShotPass },
  { id: "slab", start: 25.2, end: 28.0, Scene: ShotSlab },
  { id: "tall", start: 28.0, end: 31.6, Scene: ShotTall },
  { id: "glass", start: 31.6, end: 34.8, Scene: ShotGlass },
  { id: "window", start: 34.8, end: 38.0, Scene: ShotWindow },
  { id: "sea", start: 38.0, end: 41.6, Scene: ShotSea },
  { id: "mirror", start: 41.6, end: 45.4, Scene: ShotMirror },
  { id: "elevator", start: 45.4, end: 50.0, Scene: ShotElevator },
  { id: "bars", start: 50.0, end: 56.0, Scene: ShotBars },
];
