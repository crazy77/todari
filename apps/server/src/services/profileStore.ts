import type { Collection, Db } from 'mongodb';
import { getMongo } from './mongo';
import type { Profile } from '../types/profile';

let col: Collection<Profile> | null = null;

async function getCollection(): Promise<Collection<Profile>> {
  if (col) return col;
  const client = await getMongo();
  const db: Db = client.db();
  col = db.collection<Profile>('profiles');
  await col.createIndex({ id: 1 }, { unique: true });
  await col.createIndex({ nickname: 1 }, { unique: true });
  return col;
}

export async function upsertGuestProfile(id: string, nickname: string, tableNumber?: string): Promise<Profile> {
  const c = await getCollection();
  const now = Date.now();
  const update = {
    $setOnInsert: { createdAt: now, provider: 'guest' as const },
    $set: { nickname, tableNumber, updatedAt: now },
  };
  const res = await c.findOneAndUpdate({ id }, update, { upsert: true, returnDocument: 'after' });
  if (!res.value) throw new Error('profile_upsert_failed');
  return res.value;
}

export async function getProfileByNickname(nickname: string): Promise<Profile | null> {
  const c = await getCollection();
  return c.findOne({ nickname });
}

export async function getProfile(id: string): Promise<Profile | null> {
  const c = await getCollection();
  return c.findOne({ id });
}
