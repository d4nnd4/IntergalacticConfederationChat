import { memo } from "react";
import { Saucer } from "./Saucer";
import styles from "./TractorBeam.module.css";

export const TractorBeam = memo(function TractorBeam({ label }: { label: string }) {
  return (
    <div className={styles.wrap} role="status">
      <Saucer size={40} beam dome="lagoon" />
      <span className={styles.motes} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
});
