export type EnemyKind = "monolith" | "wisp" | "skull" | "spire" | "warden";
export type Formation = "line" | "column" | "vee" | "sine";

export interface Wave {
  at: number;
  kind: Exclude<EnemyKind, "warden">;
  count: number;
  formation: Formation;
  y: number;
}

export interface Sector {
  name: string;
  sky: readonly string[];
  ground: readonly string[];
  sun: string;
  skyline: string;
  streak: string;
  planet: boolean;
  water: boolean;
  roster: readonly Wave["kind"][];
}

export const SECTORS: readonly Sector[] = [
  {
    name: "Violet Shore",
    sky: ["#0b0a12", "#2b1550", "#6d2a78", "#c2416b", "#ef7a2a"],
    ground: ["#f6a02d", "#b9521f"],
    sun: "#ffd166",
    skyline: "rgba(43, 21, 80, 0.85)",
    streak: "rgba(255, 232, 190, 0.35)",
    planet: true,
    water: false,
    roster: ["monolith", "wisp", "monolith", "skull"],
  },
  {
    name: "Sunken Spires",
    sky: ["#120b1f", "#6d2a78", "#ef5a2a", "#f6a02d"],
    ground: ["#2fb3d0", "#0f4f7a"],
    sun: "#fff1c9",
    skyline: "rgba(29, 79, 138, 0.8)",
    streak: "rgba(220, 255, 255, 0.45)",
    planet: false,
    water: true,
    roster: ["wisp", "spire", "monolith", "skull", "wisp"],
  },
  {
    name: "Dry Ring",
    sky: ["#120404", "#4a0c0c", "#8e1b1b", "#e0532d"],
    ground: ["#f7c46b", "#a8591f"],
    sun: "#ffe7b0",
    skyline: "rgba(74, 12, 12, 0.85)",
    streak: "rgba(120, 50, 10, 0.35)",
    planet: true,
    water: false,
    roster: ["monolith", "skull", "spire", "wisp", "skull"],
  },
];

export const SECTOR_DURATION = 48;
const SKULL_GRACE = 12;

export function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formationsFor(kind: Wave["kind"]): readonly Formation[] {
  switch (kind) {
    case "wisp":
      return ["sine", "line", "sine"];
    case "monolith":
      return ["line", "column", "vee"];
    default:
      return ["line"];
  }
}

function countFor(kind: Wave["kind"], random: () => number): number {
  switch (kind) {
    case "skull":
      return 1 + Math.floor(random() * 2);
    case "spire":
      return 2;
    default:
      return 3 + Math.floor(random() * 3);
  }
}

export function buildWaves(sectorIndex: number, loop: number, top: number, bottom: number): Wave[] {
  const random = seededRandom(1013 * (sectorIndex + 1) + 7919 * loop);
  const roster = SECTORS[sectorIndex]!.roster;
  const gap = Math.max(1.4, 3.4 - 0.35 * sectorIndex - 0.4 * loop);
  const waves: Wave[] = [];
  for (let at = 2; at < SECTOR_DURATION; at += gap * (0.75 + random() * 0.6)) {
    const drawn = roster[Math.floor(random() * roster.length)]!;
    const kind = drawn === "skull" && at < SKULL_GRACE ? "monolith" : drawn;
    const formations = formationsFor(kind);
    waves.push({
      at,
      kind,
      count: countFor(kind, random),
      formation: formations[Math.floor(random() * formations.length)]!,
      y: top + 16 + random() * (bottom - top - 32),
    });
  }
  return waves;
}
