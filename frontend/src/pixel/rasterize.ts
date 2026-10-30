export interface PixelArt {
  readonly palette: Readonly<Record<string, string>>;
  readonly rows: readonly string[];
}

export function dimensions(art: PixelArt): { width: number; height: number } {
  return { width: art.rows[0]?.length ?? 0, height: art.rows.length };
}

export function rasterize(art: PixelArt, scale = 1): HTMLCanvasElement {
  const { width, height } = dimensions(art);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = art.palette[row[x]!];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  });
  return canvas;
}

const urlCache = new WeakMap<PixelArt, string>();

export function toDataUrl(art: PixelArt): string {
  let url = urlCache.get(art);
  if (!url) {
    url = rasterize(art).toDataURL("image/png");
    urlCache.set(art, url);
  }
  return url;
}
