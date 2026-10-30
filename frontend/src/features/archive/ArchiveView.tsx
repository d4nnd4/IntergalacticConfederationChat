import { memo, useLayoutEffect, useRef } from "react";
import { useComms } from "../../comms/CommsProvider";
import { useSession } from "../../comms/SessionProvider";
import { PixelPortrait } from "../../pixel/PixelPortrait";
import { Monolith } from "../../ui/Monolith";
import { RingBand } from "../../ui/RingBand";
import { TractorBeam } from "../../ui/TractorBeam";
import { Composer } from "../shared/Composer";
import styles from "./ArchiveView.module.css";
import { useArchivist, type ArchiveEntry } from "./useArchivist";

const MAX_QUESTION = 300;
const SUGGESTIONS = [
  "What is the Intergalactic Confederation?",
  "Tell me about the Pleiadians",
  "Who represents Earth?",
  "Who are the Anunnaki?",
  "Surprise me",
];

export function ArchiveView({ hidden }: { hidden: boolean }) {
  const { status } = useComms();
  const { delegate } = useSession();
  const { entries, thinking, ask } = useArchivist();
  const log = useRef<HTMLOListElement>(null);
  const online = status === "online";

  useLayoutEffect(() => {
    const el = log.current;
    if (el && !hidden) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries, thinking, hidden]);

  return (
    <div className={styles.layout} hidden={hidden}>
      <Monolith className={styles.dossier} label="About the Archivist">
        <div className={styles.portraitFrame}>
          <RingBand className={styles.rings} />
          <PixelPortrait id="archivist" size={128} label="The Archivist" className={styles.portrait} />
        </div>
        <h1 className={styles.name}>The Archivist</h1>
        <p className={styles.role}>Keeper of the Ganymede Archive</p>
        <p className={styles.blurb}>
          A small model that runs inside the relay. It works out what you are asking, searches Ikwipedia and condenses the
          most relevant sentences from the record.
        </p>
        <h2 className={styles.subheading}>Try asking</h2>
        <ul className={styles.suggestions}>
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button type="button" className={styles.suggestion} disabled={!online} onClick={() => ask(suggestion)}>
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      </Monolith>

      <Monolith className={styles.console} label="Conversation with the Archivist">
        <ol className={styles.log} ref={log} aria-live="polite">
          {entries.map((entry) => (
            <Entry key={entry.id} entry={entry} delegateId={delegate?.id ?? "unknown"} />
          ))}
          {thinking && (
            <li className={styles.thinking}>
              <TractorBeam label="Retrieving records…" />
            </li>
          )}
        </ol>
        <Composer
          onSend={ask}
          disabled={!online}
          maxLength={MAX_QUESTION}
          placeholder={online ? "Ask the Archivist…" : "Waiting for the relay…"}
        />
      </Monolith>
    </div>
  );
}

const Entry = memo(function Entry({ entry, delegateId }: { entry: ArchiveEntry; delegateId: string }) {
  if (entry.kind === "system") {
    return <li className={styles.system}>{entry.text}</li>;
  }
  const fromBot = entry.kind === "bot";
  const [headline, ...rest] = fromBot && entry.sources.length > 0 ? entry.text.split("\n\n") : [null, entry.text];
  return (
    <li className={styles.entry} data-from={entry.kind}>
      <PixelPortrait id={fromBot ? "archivist" : delegateId} size={36} label="" />
      <div className={styles.bubble}>
        {headline && <h3 className={styles.headline}>{headline}</h3>}
        <p className={styles.text}>{rest.join("\n\n")}</p>
        {fromBot && entry.sources.length > 0 && (
          <ul className={styles.sources}>
            {entry.sources.map((source, index) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {index === 0 ? "Read the full record" : source.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
});
