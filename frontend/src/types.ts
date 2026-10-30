export interface Profile {
  id: string;
  name: string;
  race: string;
  title: string;
  origin: string;
  bio: string;
  accent: string;
  member: boolean;
}

export interface Channel {
  id: string;
  name: string;
  topic: string;
}

export interface Link {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  channel: string;
  authorId: string;
  body: string;
  sentAt: string;
  automated?: boolean;
  source?: Link;
}

export interface TypingNotice {
  channel: string;
  profileId: string;
}

export interface BotReply {
  id: string;
  intent: string;
  text: string;
  sources: Link[];
  sentAt: string;
}

export type ConnectionStatus = "connecting" | "online" | "offline";

export type Scene = "comms" | "archive" | "arcade";
