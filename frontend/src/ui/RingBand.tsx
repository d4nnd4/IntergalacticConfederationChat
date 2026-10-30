import { memo } from "react";
import styles from "./RingBand.module.css";

interface Props {
  className?: string;
}

export const RingBand = memo(function RingBand({ className }: Props) {
  return (
    <svg
      className={className ? `${styles.band} ${className}` : styles.band}
      viewBox="0 0 400 60"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line x1="0" y1="44" x2="400" y2="10" />
      <line x1="0" y1="49" x2="400" y2="15" />
      <line x1="0" y1="53" x2="400" y2="19" />
    </svg>
  );
});
