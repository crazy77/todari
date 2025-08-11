export type RoomStatus = 'waiting' | 'playing' | 'ended';

export type Room = {
  id: string;
  createdAt: number;
  expiresAt: number;
  status: RoomStatus;
  hostId?: string;
};
