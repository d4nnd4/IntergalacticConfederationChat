import { rasterize, type PixelArt } from "../../../pixel/rasterize";

export interface Baked {
  image: HTMLCanvasElement;
  flash: HTMLCanvasElement;
  width: number;
  height: number;
}

const ship: PixelArt = {
  palette: { h: "#ffffff", m: "#b9c6d6", M: "#5b6779", k: "#ef5a2a", f: "#ffd166", F: "#ef5a2a" },
  rows: [
    "...hh...........",
    "..hmmh..........",
    "..hmmmmhh.......",
    "ffhmmmmmmmhhh...",
    "FFhmmmmkkmmmmhhh",
    "ffhMMMMMMMhhh...",
    "..hMMMMhh.......",
    "..hMMh..........",
    "...hh...........",
  ],
};

const shipThrust: PixelArt = { ...ship, palette: { ...ship.palette, f: "#ef5a2a", F: "#ffd166" } };

const monolith: PixelArt = {
  palette: { h: "#ffb4a0", r: "#e0533d", R: "#8e1b1b", k: "#2a0b0b" },
  rows: [
    "hhhhhhhhhh",
    "hrrrrrrrRk",
    "hrrrrrrrRk",
    "kkkhrrRkkk",
    "...hrrR...",
    "..hrrrrR..",
    ".hrrrrrrR.",
    ".hrrkkrrR.",
    "hrrrkkrrrR",
    "hrrrrrrrrR",
    "hrrrrrrrrR",
    "hrkrrrrkrR",
    ".hrrrrrrR.",
    "..kkkkkk..",
  ],
};

const wisp: PixelArt = {
  palette: { d: "#ecd9ff", D: "#b48cf2", h: "#ffffff", m: "#a9b7c8", M: "#4a5568", y: "#ffd166" },
  rows: [
    "....dddd....",
    "...dDDDDd...",
    ".hhhhhhhhhh.",
    "hmmmmmmmmmmh",
    ".MyMMyMMyMM.",
    "..MMMMMMMM..",
    "....y..y....",
  ],
};

const skull: PixelArt = {
  palette: { b: "#e8d9a8", B: "#a89668", e: "#1b2a6b", E: "#4a6fd0", t: "#fff6d8", r: "#f0d9a0" },
  rows: [
    ".....bbbbbb.....",
    "...bbbbbbbbbb...",
    "..bbbbbbbbbbbb..",
    ".bbbbeeeeebbbbb.",
    ".bbbeeeeeeebbbb.",
    ".bbbeeEEeeebbbbr",
    ".bbbeeEeeeebbrr.",
    ".bbbbeeeeebrrbB.",
    "..bbbbbbbrrbbBB.",
    "..BbbbbrrbbbbB..",
    "...BbrrbbbbbB...",
    "..rrtbtbtbtB....",
    "rr..tttttttt....",
    "....BtbtbtbB....",
    ".....BBBBBB.....",
    "................",
  ],
};

const spire: PixelArt = {
  palette: { y: "#ffd166", Y: "#f5c542", c: "#5fd0c8", C: "#1d4f8a", k: "#0b0a12" },
  rows: [
    "....yy....",
    "....yy....",
    "...yYYy...",
    "...yccy...",
    "..yYccYy..",
    "..ycYYcy..",
    ".yYccccYy.",
    ".ycYccYcy.",
    "yYccccccYy",
    "ycYccccYcy",
    "yYccYYccYy",
    "yccccccccy",
    "yYccccccYy",
    "ycYccccYcy",
    "yccccccccy",
    "yYcckkccYy",
    "ycckkkkccy",
    "yYckkkkcYy",
    "cccccccccc",
    "CCCCCCCCCC",
  ],
};

const playerShot: PixelArt = {
  palette: { o: "#ef5a2a", w: "#fff3c4" },
  rows: ["oowwww", "oowwww"],
};

const enemyShot: PixelArt = {
  palette: { a: "#ef5a2a", A: "#ffe0a3" },
  rows: [".aa.", "aAAa", "aAAa", ".aa."],
};

const coolant: PixelArt = {
  palette: { h: "#ffffff", c: "#5fd0c8", C: "#1d4f8a" },
  rows: ["...hh...", "..hcch..", ".hccCch.", ".hcCCch.", ".hcCCch.", ".hccCch.", "..hcch..", "...hh..."],
};

const twin: PixelArt = {
  palette: { y: "#ffd166", Y: "#ef5a2a" },
  rows: ["...yy...", "...yy...", ".yyYYyy.", "yyYYYYyy", "yyYYYYyy", ".yyYYyy.", "...yy...", "...yy..."],
};

function whiteOut(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function bakeCanvas(image: HTMLCanvasElement): Baked {
  return { image, flash: whiteOut(image), width: image.width, height: image.height };
}

function bake(art: PixelArt): Baked {
  return bakeCanvas(rasterize(art));
}

function paintWarden(): HTMLCanvasElement {
  const width = 64;
  const height = 48;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }
  const data = ctx.createImageData(width, height);
  const put = (x: number, y: number, rgb: readonly [number, number, number]) => {
    const i = (y * width + x) * 4;
    data.data[i] = rgb[0];
    data.data[i + 1] = rgb[1];
    data.data[i + 2] = rgb[2];
    data.data[i + 3] = 255;
  };
  const bone = [
    [255, 244, 210],
    [232, 217, 168],
    [196, 178, 124],
    [140, 122, 80],
  ] as const;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - 32) / 21;
      const dy = (y - 21) / 19;
      const skullDist = dx * dx + dy * dy;
      const inJaw = y >= 32 && y <= 42 && x >= 17 && x <= 44;
      if (skullDist <= 1 || inJaw) {
        const light = Math.min(3, Math.max(0, Math.floor((dx + dy + 1.2) * 1.4)));
        put(x, y, bone[light]!);
        if (inJaw && y >= 35 && y <= 40) {
          put(x, y, x % 4 === 0 || y === 40 ? bone[3] : [255, 248, 228]);
        }
      }
      const ex = (x - 25) / 8.5;
      const ey = (y - 19) / 7.5;
      if (ex * ex + ey * ey <= 1) {
        put(x, y, ex * ex + ey * ey < 0.3 ? [74, 111, 208] : [21, 30, 80]);
      }
      const sx = (x - 41) / 4;
      const sy = (y - 20) / 4;
      if (sx * sx + sy * sy <= 1) {
        put(x, y, [21, 30, 80]);
      }
      const band = y - (30 - 0.38 * (x - 32));
      if (band >= 0 && band < 1.4) {
        put(x, y, [255, 236, 190]);
      } else if (band >= 2.2 && band < 4) {
        put(x, y, [201, 164, 90]);
      } else if (band >= 4.8 && band < 5.8) {
        put(x, y, [240, 217, 160]);
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export interface ArtBook {
  ship: Baked;
  shipThrust: Baked;
  monolith: Baked;
  wisp: Baked;
  skull: Baked;
  spire: Baked;
  warden: Baked;
  playerShot: Baked;
  enemyShot: Baked;
  coolant: Baked;
  twin: Baked;
}

export function bakeArtBook(): ArtBook {
  return {
    ship: bake(ship),
    shipThrust: bake(shipThrust),
    monolith: bake(monolith),
    wisp: bake(wisp),
    skull: bake(skull),
    spire: bake(spire),
    warden: bakeCanvas(paintWarden()),
    playerShot: bake(playerShot),
    enemyShot: bake(enemyShot),
    coolant: bake(coolant),
    twin: bake(twin),
  };
}
