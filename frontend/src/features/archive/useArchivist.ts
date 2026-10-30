import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { destinations } from "../../api/destinations";
import { useComms } from "../../comms/CommsProvider";
import { uuid } from "../../lib/ids";
import type { BotReply, Link } from "../../types";

const REPLY_TIMEOUT_MS = 20_000;
const MAX_ENTRIES = 200;

export type ArchiveEntry =
  | { kind: "you"; id: string; text: string }
  | { kind: "bot"; id: string; text: string; sources: Link[] }
  | { kind: "system"; id: string; text: string };

const WELCOME: ArchiveEntry = {
  kind: "bot",
  id: "welcome",
  text: "Greetings, delegate. I am the Archivist. Ask me about any being, world or event recorded in Ikwipedia.",
  sources: [],
};

function isBotReply(value: unknown): value is BotReply {
  const candidate = value as Partial<BotReply> | null;
  return typeof candidate?.id === "string" && typeof candidate.text === "string" && Array.isArray(candidate.sources);
}

export function useArchivist() {
  const { publish, subscribe } = useComms();
  const sessionId = useMemo(uuid, []);
  const [entries, setEntries] = useState<ArchiveEntry[]>([WELCOME]);
  const [outstanding, setOutstanding] = useState(0);
  const pending = useRef(new Map<string, number>());

  const append = useCallback((entry: ArchiveEntry) => {
    setEntries((current) => {
      const next = current.concat(entry);
      return next.length > MAX_ENTRIES ? next.slice(-MAX_ENTRIES) : next;
    });
  }, []);

  useEffect(
    () =>
      subscribe(destinations.botReplies(sessionId), (payload) => {
        if (!isBotReply(payload)) {
          return;
        }
        const oldest = pending.current.keys().next();
        if (!oldest.done) {
          window.clearTimeout(pending.current.get(oldest.value));
          pending.current.delete(oldest.value);
          setOutstanding(pending.current.size);
        }
        append({ kind: "bot", id: payload.id, text: payload.text, sources: payload.sources });
      }),
    [subscribe, sessionId, append],
  );

  useEffect(() => {
    const timers = pending.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const ask = useCallback(
    (text: string) => {
      if (!publish(destinations.askBot, { sessionId, text })) {
        return false;
      }
      const questionId = uuid();
      append({ kind: "you", id: questionId, text });
      const timer = window.setTimeout(() => {
        if (pending.current.delete(questionId)) {
          setOutstanding(pending.current.size);
          append({ kind: "system", id: uuid(), text: "The Archive did not answer in time. Try asking again." });
        }
      }, REPLY_TIMEOUT_MS);
      pending.current.set(questionId, timer);
      setOutstanding(pending.current.size);
      return true;
    },
    [publish, sessionId, append],
  );

  return { entries, thinking: outstanding > 0, ask };
}
