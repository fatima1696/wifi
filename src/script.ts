// Everything you would edit about words and timing lives here.
// Captions are generated from LINES, so change a line or its start/end and the captions move with it.

export const FPS = 30;
export const TOTAL_SECONDS = 56;

export const COLORS = {
  bg: "#04040a",
  glow: "#1a2352",
  ice: "#bfe6ff", // outlines, glass, electrons' halo
  amber: "#f5b73a", // light you can see
  amberHi: "#ffd98a",
  wifi: "#4db2ff", // Wi-Fi
  brick: "#c4572a",
  steel: "#d7e0f0",
  electron: "#e8f6ff",
} as const;

export type Line = {
  text: string;
  start: number; // seconds
  end: number; // seconds
  accents?: Record<string, string>; // normalised word -> colour
};

const { wifi, amber, ice, steel } = COLORS;

export const LINES: Line[] = [
  { text: "Wi-Fi is light, so why does it go through walls?", start: 0.15, end: 3.15, accents: { wifi, light: amber } },
  { text: "It's the same stuff your eyes see, just stretched.", start: 3.35, end: 6.0, accents: { see: amber, stretched: wifi } },
  {
    text: "Its waves are about a hundred thousand times longer, and the longer the wave, the weaker each little packet of light.",
    start: 6.2,
    end: 13.0,
    accents: { longer: wifi, weaker: wifi, light: amber },
  },
  {
    text: "Now, a wall is full of electrons, and they only take light that can kick them up a step.",
    start: 13.2,
    end: 19.3,
    accents: { electrons: ice, light: amber },
  },
  { text: "The light you see can, so the wall eats it.", start: 19.6, end: 22.3, accents: { light: amber, see: amber } },
  {
    text: "Wi-Fi is far too weak to kick anything, so the electrons let it slip through.",
    start: 22.7,
    end: 27.6,
    accents: { wifi, electrons: ice },
  },
  {
    text: "In glass, the steps are too high even for the light you see, which is why you can see through it.",
    start: 28.0,
    end: 34.5,
    accents: { glass: ice, light: amber },
  },
  { text: "So to your Wi-Fi, a brick wall is a window.", start: 34.9, end: 37.8, accents: { wifi, window: ice } },
  { text: "Metal is the opposite.", start: 38.2, end: 39.6, accents: { metal: steel } },
  {
    text: "Its electrons are loose, so they grab both kinds of light and throw them right back.",
    start: 39.8,
    end: 45.0,
    accents: { electrons: ice, light: amber },
  },
  {
    text: "That's why metal is shiny and why your signal dies in an elevator.",
    start: 45.3,
    end: 49.6,
    accents: { metal: steel, signal: wifi },
  },
  // The script stops mid-sentence here. Replace this line (and its end time) when you have the ending.
  { text: "And next time your phone gets full bars through a wall, remember—", start: 50.0, end: 54.4 },
];

export type Chunk = { text: string; start: number; end: number; accents: Record<string, string> };

export const norm = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");

// 2-3 words per chunk, breaking after punctuation, timed by word length inside each line.
export const buildChunks = (lines: Line[]): Chunk[] => {
  const out: Chunk[] = [];
  for (const line of lines) {
    const words = line.text.split(" ");
    const groups: string[][] = [];
    let cur: string[] = [];
    for (const w of words) {
      cur.push(w);
      if (cur.length >= 3 || /[,.?!—]$/.test(w)) {
        groups.push(cur);
        cur = [];
      }
    }
    if (cur.length) groups.push(cur);
    const weights = groups.map((g) => g.join("").length + 3);
    const total = weights.reduce((a, b) => a + b, 0);
    let t = line.start;
    groups.forEach((g, i) => {
      const d = ((line.end - line.start) * weights[i]) / total;
      out.push({ text: g.join(" "), start: t, end: t + d, accents: line.accents ?? {} });
      t += d;
    });
  }
  return out;
};

export const CHUNKS = buildChunks(LINES);

// A few small labels only, and only for technical terms.
export const PILLS = [
  { text: "PHOTON", start: 10.0, end: 12.8 },
  { text: "ELECTRON", start: 14.4, end: 16.8 },
  { text: "ENERGY STEP", start: 16.9, end: 19.2 },
  { text: "FREE ELECTRONS", start: 38.8, end: 41.4 },
];

// Counter that runs while the camera pulls back (log scale, 1 -> 100,000).
export const COUNTER = { start: 6.3, end: 9.4, target: 100000, label: "TIMES LONGER" };

// Footer on the abstract / microscopic stretches.
export const FOOTERS = [
  { start: 6.2, end: 13.2 },
  { start: 13.2, end: 28.0 },
  { start: 38.0, end: 41.6 },
];
