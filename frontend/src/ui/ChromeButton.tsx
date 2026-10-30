import type { ButtonHTMLAttributes } from "react";
import styles from "./ChromeButton.module.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "chrome" | "ember" | "ghost";
}

export function ChromeButton({ tone = "chrome", className, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      data-tone={tone}
      className={className ? `${styles.button} ${className}` : styles.button}
      {...rest}
    />
  );
}
