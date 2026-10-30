import { memo, useId } from "react";
import styles from "./Saucer.module.css";

interface Props {
  size?: number;
  beam?: boolean;
  hover?: boolean;
  dome?: "amber" | "lagoon" | "violet";
  className?: string;
}

const DOMES = {
  amber: ["#ffe7b0", "#ef5a2a"],
  lagoon: ["#d6fffb", "#2a8a8c"],
  violet: ["#ecd9ff", "#6d2a78"],
} as const;

export const Saucer = memo(function Saucer({ size = 64, beam = false, hover = true, dome = "amber", className }: Props) {
  const id = useId().replace(/:/g, "");
  const [domeLight, domeDark] = DOMES[dome];
  const classes = [styles.saucer, hover ? styles.hover : "", className ?? ""].join(" ");
  return (
    <svg className={classes} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-hull`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--chrome-hi)" />
          <stop offset="0.42" stopColor="var(--chrome-mid)" />
          <stop offset="0.52" stopColor="var(--chrome-lo)" />
          <stop offset="1" stopColor="#d4dde8" />
        </linearGradient>
        <radialGradient id={`${id}-dome`} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor={domeLight} />
          <stop offset="1" stopColor={domeDark} />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sun)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--sun)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {beam && <path className={styles.beam} d="M24 38 L40 38 L54 64 L10 64 Z" fill={`url(#${id}-beam)`} />}
      <ellipse cx="32" cy="26" rx="12" ry="10" fill={`url(#${id}-dome)`} />
      <ellipse cx="28" cy="22" rx="4" ry="2.4" fill="#fff" opacity="0.55" />
      <ellipse cx="32" cy="32" rx="28" ry="8" fill={`url(#${id}-hull)`} />
      <ellipse cx="32" cy="30.5" rx="22" ry="3" fill="none" stroke="#fff" strokeOpacity="0.45" />
      <g className={styles.lights}>
        <circle cx="14" cy="33" r="1.8" />
        <circle cx="23" cy="35.5" r="1.8" />
        <circle cx="32" cy="36.5" r="1.8" />
        <circle cx="41" cy="35.5" r="1.8" />
        <circle cx="50" cy="33" r="1.8" />
      </g>
    </svg>
  );
});
