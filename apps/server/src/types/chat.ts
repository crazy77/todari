export type ChatMessage = {
  roomId: string;
  senderId: string;
  nickname?: string;
  text?: string;
  emoji?: string;
  ts: number;
};
