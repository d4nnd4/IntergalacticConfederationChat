import type { ElementType, ReactNode } from "react";
import styles from "./Monolith.module.css";

interface Props {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  label?: string;
}

export function Monolith({ as: Tag = "section", className, children, label }: Props) {
  return (
    <Tag className={className ? `${styles.monolith} ${className}` : styles.monolith} aria-label={label}>
      {children}
    </Tag>
  );
}
