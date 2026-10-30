import { memo, useCallback, useLayoutEffect, useRef, type CSSProperties } from "react";
import { formatTime } from "../../lib/ids";
import { PixelPortrait } from "../../pixel/PixelPortrait";
import type { ChatMessage, Profile } from "../../types";
import { Saucer } from "../../ui/Saucer";
import styles from "./MessageList.module.css";

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const STICKY_THRESHOLD_PX = 120;

interface Props {
  messages: ChatMessage[];
  typers: string[];
  profilesById: ReadonlyMap<string, Profile>;
  selfId: string | undefined;
}

export function MessageList({ messages, typers, profilesById, selfId }: Props) {
  const scroller = useRef<HTMLOListElement>(null);
  const stuckToBottom = useRef(true);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (el) {
      stuckToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_THRESHOLD_PX;
    }
  }, []);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stuckToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, typers]);

  if (messages.length === 0 && typers.length === 0) {
    return (
      <div className={styles.empty}>
        <Saucer size={88} beam dome="violet" />
        <p>No transmissions on this frequency yet. Say hello and the Assembly will answer.</p>
      </div>
    );
  }

  return (
    <ol className={styles.list} ref={scroller} onScroll={onScroll} aria-live="polite">
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const grouped =
          previous !== undefined &&
          previous.authorId === message.authorId &&
          Boolean(previous.automated) === Boolean(message.automated) &&
          Date.parse(message.sentAt) - Date.parse(previous.sentAt) < GROUP_WINDOW_MS;
        return (
          <MessageRow
            key={message.id}
            message={message}
            author={profilesById.get(message.authorId)}
            grouped={grouped}
            self={message.authorId === selfId && !message.automated}
          />
        );
      })}
      {typers.map((profileId) => (
        <TypingRow key={profileId} profile={profilesById.get(profileId)} profileId={profileId} />
      ))}
    </ol>
  );
}

interface RowProps {
  message: ChatMessage;
  author: Profile | undefined;
  grouped: boolean;
  self: boolean;
}

const MessageRow = memo(function MessageRow({ message, author, grouped, self }: RowProps) {
  return (
    <li
      className={styles.row}
      data-grouped={grouped || undefined}
      data-self={self || undefined}
      style={author ? ({ "--accent": author.accent } as CSSProperties) : undefined}
    >
      <div className={styles.gutter}>
        {!grouped && <PixelPortrait id={message.authorId} size={40} label="" />}
      </div>
      <div className={styles.content}>
        {!grouped && (
          <div className={styles.meta}>
            <span className={styles.author}>{author?.name ?? "Unknown signal"}</span>
            <span className={styles.race}>{author?.race}</span>
            {message.automated && (
              <span className={styles.relay} title="Voiced by the Ganymede relay">
                relay
              </span>
            )}
            <time className={styles.time} dateTime={message.sentAt}>
              {formatTime(message.sentAt)}
            </time>
          </div>
        )}
        <p className={styles.body}>{message.body}</p>
        {message.source && (
          <a className={styles.source} href={message.source.url} target="_blank" rel="noopener noreferrer">
            Ikwipedia · {message.source.title} ↗
          </a>
        )}
      </div>
    </li>
  );
});

const TypingRow = memo(function TypingRow({ profile, profileId }: { profile: Profile | undefined; profileId: string }) {
  return (
    <li className={styles.typing} style={profile ? ({ "--accent": profile.accent } as CSSProperties) : undefined}>
      <div className={styles.gutter}>
        <PixelPortrait id={profileId} size={28} label="" />
      </div>
      <span>
        <span className={styles.typingName}>{profile?.name ?? "A delegate"}</span> is composing
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </span>
    </li>
  );
});
