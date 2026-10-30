import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchChannels, fetchProfiles } from "../api/rest";
import type { Channel, Profile } from "../types";
import { storage } from "../lib/storage";

const DELEGATE_KEY = "ic.delegate";

interface Session {
  profiles: Profile[];
  profilesById: ReadonlyMap<string, Profile>;
  channels: Channel[];
  delegate: Profile | null;
  loadError: string | null;
  board: (profileId: string) => void;
  disembark: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [delegateId, setDelegateId] = useState<string | null>(() => storage.get(DELEGATE_KEY));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchProfiles(controller.signal), fetchChannels(controller.signal)])
      .then(([loadedProfiles, loadedChannels]) => {
        setProfiles(loadedProfiles);
        setChannels(loadedChannels);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Unable to reach the relay");
        }
      });
    return () => controller.abort();
  }, []);

  const profilesById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const delegate = (delegateId && profilesById.get(delegateId)) || null;

  const board = useCallback((profileId: string) => {
    storage.set(DELEGATE_KEY, profileId);
    setDelegateId(profileId);
  }, []);

  const disembark = useCallback(() => {
    storage.remove(DELEGATE_KEY);
    setDelegateId(null);
  }, []);

  const session = useMemo<Session>(
    () => ({ profiles, profilesById, channels, delegate, loadError, board, disembark }),
    [profiles, profilesById, channels, delegate, loadError, board, disembark],
  );

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return session;
}
