const CHAT_EXCHANGE = "/exchange/ic.chat";

export const destinations = {
  channel: (channelId: string) => `${CHAT_EXCHANGE}/channel.${channelId}`,
  typing: (channelId: string) => `${CHAT_EXCHANGE}/typing.${channelId}`,
  botReplies: (sessionId: string) => `${CHAT_EXCHANGE}/bot.${sessionId}`,
  sendChat: "/app/chat.send",
  askBot: "/app/bot.ask",
} as const;
