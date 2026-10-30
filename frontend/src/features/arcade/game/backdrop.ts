import { seededRandom, type Sector } from "./sectors";

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return [element, element.getContext("2d")];
}

function gradient(ctx: CanvasRenderingContext2D, top: number, bottom: number, stops: readonly string[]) {
  const fill = ctx.createLinearGradient(0, top, 0, bottom);
  stops.forEach((color, index) => fill.addColorStop(index / Math.max(1, stops.length - 1), color));
  return fill;
}

export function paintBackdrop(sector: Sector, width: number, height: number, horizon: number): HTMLCanvasElement {
  const [element, ctx] = canvas(width, height);
  if (!ctx) {
    return element;
  }
  ctx.fillStyle = gradient(ctx, 0, horizon, sector.sky);
  ctx.fillRect(0, 0, width, horizon);

  const random = seededRandom(sector.name.length * 97);
  ctx.fillStyle = "rgba(255, 244, 220, 0.8)";
  for (let i = 0; i < 46; i++) {
    const y = random() * horizon * 0.55;
    ctx.globalAlpha = 0.3 + random() * 0.7 * (1 - y / horizon);
    ctx.fillRect(Math.floor(random() * width), Math.floor(y), 1, 1);
  }
  ctx.globalAlpha = 1;

  const sun = ctx.createRadialGradient(width / 2, horizon, 2, width / 2, horizon, 90);
  sun.addColorStop(0, sector.sun);
  sun.addColorStop(0.35, `${sector.sun}aa`);
  sun.addColorStop(1, `${sector.sun}00`);
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, width, horizon);

  if (sector.planet) {
    const px = Math.round(width * 0.78);
    const py = Math.round(horizon * 0.3);
    const body = ctx.createRadialGradient(px - 4, py - 4, 1, px, py, 14);
    body.addColorStop(0, "#fff1c9");
    body.addColorStop(1, "#c9a45a");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(240, 217, 160, 0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(px, py, 26, 6, -0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = gradient(ctx, horizon, height, sector.ground);
  ctx.fillRect(0, horizon, width, height - horizon);
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fillRect(0, horizon, width, 1);
  return element;
}

export function paintSkyline(sector: Sector, width: number, height: number): HTMLCanvasElement {
  const [element, ctx] = canvas(width, height);
  if (!ctx) {
    return element;
  }
  const random = seededRandom(sector.name.charCodeAt(0) * 131);
  ctx.fillStyle = sector.skyline;
  let x = 0;
  while (x < width) {
    const w = 6 + Math.floor(random() * 18);
    const h = 4 + Math.floor(random() * (height - 6));
    const style = random();
    if (style < 0.45) {
      ctx.fillRect(x, height - h, w, h);
      ctx.fillRect(x - 2, height - h, w + 4, 2);
    } else if (style < 0.75) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + w / 2, height - h);
      ctx.lineTo(x + w, height);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(x + w / 2, height, w / 2 + 2, Math.min(h, 10), 0, Math.PI, 0);
      ctx.fill();
    }
    x += w + Math.floor(random() * 22);
  }
  return element;
}
