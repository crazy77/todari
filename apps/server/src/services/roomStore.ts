import type { Collection, Db } from 'mongodb';
import type { Room, RoomStatus } from '../types/room';
import { getMongo } from './mongo';

let col: Collection<Room> | null = null;

async function getCollection(): Promise<Collection<Room>> {
  if (col) return col;
  const client = await getMongo();
  const db: Db = client.db();
  col = db.collection<Room>('rooms');
  await col.createIndex({ id: 1 }, { unique: true });
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return col;
}

export async function createRoom(id: string, ttlMs: number): Promise<Room> {
  const now = Date.now();
  const room: Room = { id, createdAt: now, expiresAt: now + ttlMs, status: 'waiting' };
  const c = await getCollection();
  await c.insertOne(room);
  return room;
}

export async function getRoom(id: string): Promise<Room | null> {
  const c = await getCollection();
  return c.findOne({ id });
}

export async function setHostIfEmpty(id: string, hostId: string): Promise<Room | null> {
  const c = await getCollection();
  const res = await c.findOneAndUpdate(
    { id, hostId: { $exists: false } },
    { $set: { hostId } },
    { returnDocument: 'after' },
  );
  return res.value ?? null;
}

export async function setRoomStatus(id: string, status: RoomStatus): Promise<Room | null> {
  const c = await getCollection();
  const res = await c.findOneAndUpdate(
    { id },
    { $set: { status } },
    { returnDocument: 'after' },
  );
  return res.value ?? null;
}

export async function endRoom(id: string): Promise<Room | null> {
  const c = await getCollection();
  const res = await c.findOneAndUpdate(
    { id },
    { $set: { status: 'ended' as RoomStatus, expiresAt: Date.now() } },
    { returnDocument: 'after' },
  );
  return res.value ?? null;
}

export async function deleteRoom(id: string): Promise<void> {
  const c = await getCollection();
  await c.deleteOne({ id });
}

export async function listRooms(now = Date.now()): Promise<Room[]> {
  const c = await getCollection();
  return c.find({ expiresAt: { $gte: now } }).toArray();
}
