import { useEffect, useReducer, useRef } from "react";
import { destinations } from "../../api/destinations";
import { fetchHistory } from "../../api/rest";
import { useComms } from "../../comms/CommsProvider";
import type { Channel, ChatMessage } from "../../types";

const MAX_MESSAGES = 300;

interface FeedState {
  messages: Record<string, ChatMessage[]>;
  unread: Record<string, number>;
}

type FeedAction =
  | { type: "history"; channel: string; items: ChatMessage[] }
  | { type: "live"; message: ChatMessage; active: boolean }
  | { type: "read"; channel: string };

const EMPTY: ChatMessage[] = [];

const timestamp = (message: ChatMessage) => Date.parse(message.sentAt);

function merge(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const seen = new Set(existing.map((m) => m.id));
  const fresh = incoming.filter((m) => !seen.has(m.id));
  if (fresh.length === 0) {
    return existing;
  }
  const combined = existing.concat(fresh);
  const last = existing.at(-1);
  const inOrder = !last || fresh.every((m) => timestamp(m) >= timestamp(last));
  if (!inOrder) {
    combined.sort((a, b) => timestamp(a) - timestamp(b));
  }
  return combined.length > MAX_MESSAGES ? combined.slice(-MAX_MESSAGES) : combined;
}

function isChatMessage(value: unknown): value is ChatMessage {
  const candidate = value as Partial<ChatMessage> | null;
  return (
    typeof candidate?.id === "string" &&
    typeof candidate.channel === "string" &&
    typeof candidate.authorId === "string" &&
    typeof candidate.body === "string" &&
    typeof candidate.sentAt === "string"
  );
}

function reducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "history": {
      const current = state.messages[action.channel] ?? EMPTY;
      const next = merge(current, action.items);
      return next === current ? state : { ...state, messages: { ...state.messages, [action.channel]: next } };
    }
    case "live": {
      const { channel } = action.message;
      const current = state.messages[channel] ?? EMPTY;
      const next = merge(current, [action.message]);
      if (next === current) {
        return state;
      }
      return {
        messages: { ...state.messages, [channel]: next },
        unread: action.active ? state.unread : { ...state.unread, [channel]: (state.unread[channel] ?? 0) + 1 },
      };
    }
    case "read":
      return state.unread[action.channel] ? { ...state, unread: { ...state.unread, [action.channel]: 0 } } : state;
  }
}

export function useChannelFeed(channels: Channel[], activeId: string | undefined) {
  const { status, subscribe } = useComms();
  const [state, dispatch] = useReducer(reducer, { messages: {}, unread: {} });
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

  useEffect(() => {
    const unsubscribers = channels.map((channel) =>
      subscribe(destinations.channel(channel.id), (payload) => {
        if (isChatMessage(payload)) {
          dispatch({ type: "live", message: payload, active: payload.channel === activeRef.current });
        }
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [channels, subscribe]);

  useEffect(() => {
    if (status !== "online") {
      return;
    }
    const controller = new AbortController();
    channels.forEach((channel) => {
      fetchHistory(channel.id, controller.signal)
        .then((items) => dispatch({ type: "history", channel: channel.id, items }))
        .catch(() => undefined);
    });
    return () => controller.abort();
  }, [channels, status]);

  useEffect(() => {
    if (activeId) {
      dispatch({ type: "read", channel: activeId });
    }
  }, [activeId]);

  return {
    messages: (activeId && state.messages[activeId]) || EMPTY,
    unread: state.unread,
  };
}
