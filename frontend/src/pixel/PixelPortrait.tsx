import { memo, useMemo } from "react";
import { portraitFor } from "./portraits";
import { toDataUrl } from "./rasterize";

interface Props {
  id: string;
  size: number;
  label: string;
  className?: string;
}

export const PixelPortrait = memo(function PixelPortrait({ id, size, label, className }: Props) {
  const src = useMemo(() => toDataUrl(portraitFor(id)), [id]);
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={label}
      className={className ? `pixelated ${className}` : "pixelated"}
      draggable={false}
      decoding="async"
    />
  );
});
