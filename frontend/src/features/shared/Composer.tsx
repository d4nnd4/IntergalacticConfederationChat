import { useCallback, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ChromeButton } from "../../ui/ChromeButton";
import { Saucer } from "../../ui/Saucer";
import styles from "./Composer.module.css";

const MAX_HEIGHT_PX = 140;
const COUNTER_THRESHOLD = 0.8;

interface Props {
  onSend: (text: string) => boolean;
  disabled?: boolean;
  maxLength: number;
  placeholder: string;
}

export function Composer({ onSend, disabled = false, maxLength, placeholder }: Props) {
  const [text, setText] = useState("");
  const inputId = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const length = [...trimmed].length;

  useLayoutEffect(() => {
    const el = area.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    }
  }, [text]);

  const submit = useCallback(() => {
    if (!trimmed || length > maxLength || disabled) {
      return;
    }
    if (onSend(trimmed)) {
      setText("");
    }
  }, [trimmed, length, maxLength, disabled, onSend]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className={styles.composer} onSubmit={onSubmit}>
      <label className="visually-hidden" htmlFor={inputId}>
        Message
      </label>
      <textarea
        id={inputId}
        ref={area}
        className={styles.input}
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        maxLength={maxLength * 2}
        autoComplete="off"
      />
      {length > maxLength * COUNTER_THRESHOLD && (
        <span className={styles.counter} data-over={length > maxLength || undefined}>
          {length}/{maxLength}
        </span>
      )}
      <ChromeButton
        tone="ember"
        type="submit"
        className={styles.send}
        disabled={disabled || !trimmed || length > maxLength}
      >
        <Saucer size={22} hover={false} dome="violet" />
        Send
      </ChromeButton>
    </form>
  );
}
