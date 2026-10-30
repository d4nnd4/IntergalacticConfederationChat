import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ConnectionStatus } from "../types";

type Handler = (payload: unknown) => void;

interface Comms {
  status: ConnectionStatus;
  publish: (destination: string, body: unknown) => boolean;
  subscribe: (destination: string, handler: Handler) => () => void;
}

const CommsContext = createContext<Comms | null>(null);

function brokerUrl(): string {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/ws`;
}

function parse(message: IMessage): unknown {
  try {
    return JSON.parse(message.body);
  } catch {
    return null;
  }
}

export function CommsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const handlers = useRef(new Map<string, Set<Handler>>());
  const subscriptions = useRef(new Map<string, StompSubscription>());

  const client = useMemo(
    () =>
      new Client({
        brokerURL: brokerUrl(),
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
      }),
    [],
  );

  const attach = useCallback(
    (destination: string) => {
      const subscription = client.subscribe(destination, (message) => {
        const payload = parse(message);
        if (payload !== null) {
          handlers.current.get(destination)?.forEach((handler) => handler(payload));
        }
      });
      subscriptions.current.set(destination, subscription);
    },
    [client],
  );

  useEffect(() => {
    client.onConnect = () => {
      subscriptions.current.clear();
      handlers.current.forEach((_, destination) => attach(destination));
      setStatus("online");
    };
    client.onWebSocketClose = () => setStatus(client.active ? "connecting" : "offline");
    client.onStompError = () => setStatus("connecting");
    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [client, attach]);

  const publish = useCallback(
    (destination: string, body: unknown) => {
      if (!client.connected) {
        return false;
      }
      client.publish({
        destination,
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      });
      return true;
    },
    [client],
  );

  const subscribe = useCallback(
    (destination: string, handler: Handler) => {
      let set = handlers.current.get(destination);
      if (!set) {
        set = new Set();
        handlers.current.set(destination, set);
        if (client.connected) {
          attach(destination);
        }
      }
      set.add(handler);
      return () => {
        const current = handlers.current.get(destination);
        current?.delete(handler);
        if (current?.size === 0) {
          handlers.current.delete(destination);
          if (client.connected) {
            subscriptions.current.get(destination)?.unsubscribe();
          }
          subscriptions.current.delete(destination);
        }
      };
    },
    [client, attach],
  );

  const comms = useMemo<Comms>(() => ({ status, publish, subscribe }), [status, publish, subscribe]);

  return <CommsContext.Provider value={comms}>{children}</CommsContext.Provider>;
}

export function useComms(): Comms {
  const comms = useContext(CommsContext);
  if (!comms) {
    throw new Error("useComms must be used inside CommsProvider");
  }
  return comms;
}
