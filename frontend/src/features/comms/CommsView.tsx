import { useCallback, useMemo, useState } from "react";
import { destinations } from "../../api/destinations";
import { useComms } from "../../comms/CommsProvider";
import { useSession } from "../../comms/SessionProvider";
import { PixelPortrait } from "../../pixel/PixelPortrait";
import { Monolith } from "../../ui/Monolith";
import { RingBand } from "../../ui/RingBand";
import { Composer } from "../shared/Composer";
import styles from "./CommsView.module.css";
import { MessageList } from "./MessageList";
import { useChannelFeed } from "./useChannelFeed";
import { useTyping } from "./useTyping";

const MAX_LENGTH = 1000;
const LIVE_WINDOW_MS = 10 * 60 * 1000;

export function CommsView({ hidden }: { hidden: boolean }) {
  const { channels, profiles, profilesById, delegate } = useSession();
  const { status, publish } = useComms();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const activeId = selectedId ?? channels[0]?.id;
  const active = channels.find((c) => c.id === activeId);
  const visibleId = hidden ? undefined : activeId;
  const { messages, unread } = useChannelFeed(channels, visibleId);
  const typers = useTyping(visibleId, messages);
  const live = useMemo(() => {
    const since = Date.now() - LIVE_WINDOW_MS;
    return new Set(messages.filter((m) => !m.automated && Date.parse(m.sentAt) > since).map((m) => m.authorId));
  }, [messages]);

  const send = useCallback(
    (body: string) =>
      Boolean(activeId && delegate) &&
      publish(destinations.sendChat, { channel: activeId, authorId: delegate?.id, body }),
    [activeId, delegate, publish],
  );

  return (
    <div className={styles.layout} hidden={hidden}>
      <Monolith className={styles.sidebar} label="Frequencies and delegates">
        <h2 className={styles.heading}>Frequencies</h2>
        <ul className={styles.channels}>
          {channels.map((channel) => (
            <li key={channel.id}>
              <button
                type="button"
                className={styles.channel}
                aria-current={channel.id === activeId ? "true" : undefined}
                onClick={() => setSelectedId(channel.id)}
              >
                <span className={styles.channelName}>{channel.name}</span>
                {(unread[channel.id] ?? 0) > 0 && (
                  <span className={styles.badge} aria-label={`${unread[channel.id]} unread`}>
                    {unread[channel.id]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <h2 className={styles.heading}>The Assembly</h2>
        <ul className={styles.roster}>
          {profiles.map((profile) => (
            <li key={profile.id} className={styles.member} title={profile.bio}>
              <PixelPortrait id={profile.id} size={32} label="" />
              <span className={styles.memberText}>
                <span className={styles.memberName}>
                  {profile.name}
                  {profile.id === delegate?.id && <span className={styles.you}> · you</span>}
                </span>
                <span className={styles.memberRace}>
                  {profile.race}
                  {profile.id !== delegate?.id && (
                    <span className={styles.presence} data-live={live.has(profile.id) || undefined}>
                      {live.has(profile.id) ? " · live" : " · relay"}
                    </span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Monolith>

      <Monolith className={styles.chat} label={active?.name ?? "Channel"}>
        <header className={styles.chatHeader}>
          <RingBand className={styles.rings} />
          <h1 className={styles.chatTitle}>{active?.name}</h1>
          <p className={styles.chatTopic}>{active?.topic}</p>
        </header>
        <MessageList messages={messages} typers={typers} profilesById={profilesById} selfId={delegate?.id} />
        <Composer
          onSend={send}
          disabled={status !== "online"}
          maxLength={MAX_LENGTH}
          placeholder={
            status === "online"
              ? `Transmit to ${active?.name ?? "the Assembly"}… call a delegate by name to get their answer`
              : "Waiting for the relay…"
          }
        />
      </Monolith>
    </div>
  );
}
