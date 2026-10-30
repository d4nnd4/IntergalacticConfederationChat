import { memo } from "react";
import type { Scene } from "../types";
import styles from "./Horizon.module.css";

export const Horizon = memo(function Horizon({ scene }: { scene: Scene }) {
  return (
    <div className={styles.horizon} data-scene={scene} aria-hidden="true">
      <div className={styles.sky} />
      <div className={styles.sun} />
      <div className={styles.ground} />
      <div className={styles.grain} />
    </div>
  );
});
