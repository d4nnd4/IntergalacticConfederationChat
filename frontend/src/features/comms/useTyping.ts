import { useCallback, useEffect, useRef, useState } from "react";
import { destinations } from "../../api/destinations";
import { useComms } from "../../comms/CommsProvider";
import type { ChatMessage, TypingNotice } from "../../types";

const TYPING_TTL_MS = 8000;
const NOBODY: string[] = [];

function isTypingNotice(value: unknown): value is TypingNotice {
  const candidate = value as Partial<TypingNotice> | null;
  return typeof candidate?.channel === "string" && typeof candidate.profileId === "string";
}

export function useTyping(channelId: string | undefined, messages: ChatMessage[]): string[] {
  const { subscribe } = useComms();
  const [typers, setTypers] = useState<string[]>(NOBODY);
  const timers = useRef(new Map<string, number>());

  const remove = useCallback((profileId: string) => {
    window.clearTimeout(timers.current.get(profileId));
    timers.current.delete(profileId);
    setTypers((current) => (current.includes(profileId) ? current.filter((id) => id !== profileId) : current));
  }, []);

  useEffect(() => {
    if (!channelId) {
      return;
    }
    const pending = timers.current;
    const unsubscribe = subscribe(destinations.typing(channelId), (payload) => {
      if (!isTypingNotice(payload) || payload.channel !== channelId) {
        return;
      }
      const { profileId } = payload;
      window.clearTimeout(pending.get(profileId));
      pending.set(profileId, window.setTimeout(() => remove(profileId), TYPING_TTL_MS));
      setTypers((current) => (current.includes(profileId) ? current : [...current, profileId]));
    });
    return () => {
      unsubscribe();
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
      setTypers(NOBODY);
    };
  }, [channelId, subscribe, remove]);

  const last = messages.at(-1);
  useEffect(() => {
    if (last) {
      remove(last.authorId);
    }
  }, [last, remove]);

  return typers;
}
