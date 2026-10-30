import { memo } from "react";
import type { ConnectionStatus } from "../types";
import styles from "./SignalLamp.module.css";

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "Acquiring signal",
  online: "Relay online",
  offline: "Relay offline",
};

export const SignalLamp = memo(function SignalLamp({ status }: { status: ConnectionStatus }) {
  return (
    <span className={styles.lamp} data-status={status} role="status">
      <span className={styles.bulb} aria-hidden="true" />
      <span className={styles.label}>{LABELS[status]}</span>
    </span>
  );
});
