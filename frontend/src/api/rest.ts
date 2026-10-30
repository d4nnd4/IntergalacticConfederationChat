import type { Channel, ChatMessage, Profile } from "../types";

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`${path} responded with ${response.status}`);
  }
  return (await response.json()) as T;
}

export const fetchProfiles = (signal?: AbortSignal) => getJson<Profile[]>("/api/profiles", signal);

export const fetchChannels = (signal?: AbortSignal) => getJson<Channel[]>("/api/channels", signal);

export const fetchHistory = (channelId: string, signal?: AbortSignal) =>
  getJson<ChatMessage[]>(`/api/channels/${encodeURIComponent(channelId)}/messages`, signal);
