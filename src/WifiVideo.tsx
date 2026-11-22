import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { CHUNKS, COLORS, COUNTER, FOOTERS, FPS, PILLS, norm } from "./script";
import { SHOTS } from "./shots";

const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
const inter = loadInter("normal", { weights: ["600"], subsets: ["latin"] }).fontFamily;

const useSeconds = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, t: frame / fps };
};

/* --------------------------- captions --------------------------- */
const Captions: React.FC = () => {
  const { frame, fps, t } = useSeconds();
  const { width, height } = useVideoConfig();
  const c = CHUNKS.find((k) => t >= k.start && t < k.end);
  if (!c) return null;
  const pop = spring({ frame: frame - Math.round(c.start * fps), fps, config: { damping: 12, stiffness: 260 } });
  const scale = interpolate(pop, [0, 1], [0.82, 1]);
  const k = width / 720;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: height * 0.76,
        transform: `translateY(-50%) scale(${scale})`,
        textAlign: "center",
        padding: "0 60px",
        fontFamily: anton,
        textTransform: "uppercase",
        fontSize: 56 * k,
        letterSpacing: 1,
        lineHeight: 1.1,
        color: "#fff",
        WebkitTextStroke: `${6 * k}px #000`,
        paintOrder: "stroke fill",
        textShadow: "0 4px 14px rgba(0,0,0,0.6)",
      }}
    >
      {c.text.split(" ").map((w, i) => (
        <span key={i} style={{ color: c.accents[norm(w)] ?? "#fff" }}>
          {w}{" "}
        </span>
      ))}
    </div>
  );
};

/* ---------------------------- labels ---------------------------- */
const Pills: React.FC = () => {
  const { frame, fps, t } = useSeconds();
  const { height } = useVideoConfig();
  const p = PILLS.find((x) => t >= x.start && t < x.end);
  if (!p) return null;
  const pop = spring({ frame: frame - Math.round(p.start * fps), fps, config: { damping: 14, stiffness: 200 } });
  const out = interpolate(t, [p.end - 0.2, p.end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.1, display: "flex", justifyContent: "center", opacity: out }}>
      <div
        style={{
          transform: `scale(${interpolate(pop, [0, 1], [0.85, 1])})`,
          fontFamily: inter,
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.9)",
          padding: "14px 30px",
          borderRadius: 999,
          background: "rgba(10,14,34,0.55)",
          border: "1px solid rgba(191,230,255,0.45)",
        }}
      >
        {p.text}
      </div>
    </div>
  );
};

const Counter: React.FC = () => {
  const { t } = useSeconds();
  const { height } = useVideoConfig();
  if (t < COUNTER.start || t > COUNTER.end + 0.3) return null;
  const run = Easing.out(Easing.quad)(Math.min(1, Math.max(0, (t - COUNTER.start) / (COUNTER.end - COUNTER.start - 0.4))));
  const value = Math.round(Math.exp(run * Math.log(COUNTER.target)));
  const opacity = interpolate(t, [COUNTER.start, COUNTER.start + 0.2, COUNTER.end, COUNTER.end + 0.3], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.07, textAlign: "center", opacity }}>
      <div
        style={{
          fontFamily: anton,
          fontSize: 120,
          color: COLORS.amber,
          WebkitTextStroke: "8px #000",
          paintOrder: "stroke fill",
          textShadow: "0 4px 18px rgba(0,0,0,0.6)",
        }}
      >
        ≈ {value.toLocaleString("en-US")}×
      </div>
      <div style={{ fontFamily: inter, fontWeight: 600, fontSize: 30, letterSpacing: "0.16em", color: "rgba(255,255,255,0.8)" }}>
        {COUNTER.label}
      </div>
    </div>
  );
};

const Footer: React.FC = () => {
  const { t } = useSeconds();
  const { height } = useVideoConfig();
  if (!FOOTERS.some((f) => t >= f.start && t < f.end)) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: height * 0.92,
        textAlign: "center",
        fontFamily: inter,
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: "0.14em",
        color: "rgba(255,255,255,0.28)",
      }}
    >
      ILLUSTRATION · NOT TO SCALE
    </div>
  );
};

// A very quick dip to the background colour at every shot boundary, hidden inside the camera move.
const Dips: React.FC = () => {
  const { frame } = useSeconds();
  const boundaries = SHOTS.slice(1).map((s) => Math.round(s.start * FPS));
  const near = boundaries.find((b) => Math.abs(frame - b) <= 5);
  if (near === undefined) return null;
  const o = interpolate(frame, [near - 5, near, near + 5], [0, 0.85, 0]);
  return <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: o }} />;
};

/* --------------------------- composition --------------------------- */
export const WifiVideo: React.FC<{ voiceover: boolean }> = ({ voiceover }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 40, near: 0.1, far: 4000, position: [0, 0, 20] }}>
        <color attach="background" args={[COLORS.bg]} />
        {SHOTS.map((s) => (
          <Sequence
            key={s.id}
            from={Math.round(s.start * FPS)}
            durationInFrames={Math.round((s.end - s.start) * FPS)}
            layout="none"
          >
            <s.Scene />
          </Sequence>
        ))}
      </ThreeCanvas>
      <Dips />
      <Counter />
      <Pills />
      <Captions />
      <Footer />
      {voiceover ? <Audio src={staticFile("voiceover.mp3")} /> : null}
    </AbsoluteFill>
  );
};
