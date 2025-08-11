import type { Collection, Db } from 'mongodb';
import type { Profile } from '../types/profile';
import { getMongo } from './mongo';

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

export async function upsertGuestProfile({
  id,
  nickname,
  tableNumber,
  profileImageUrl,
}: {
  id: string;
  nickname: string;
  tableNumber?: string;
  profileImageUrl?: string;
}): Promise<Profile> {
  console.log('Log ~ upsertGuestProfile ~ profileImageUrl:', profileImageUrl);
  const c = await getCollection();
  const now = Date.now();
  try {
    const update = {
      $setOnInsert: { createdAt: now, provider: 'guest' as const },
      $set: { nickname, tableNumber, profileImageUrl, updatedAt: now },
    };
    const res = await c.findOneAndUpdate({ id }, update, {
      upsert: true,
      returnDocument: 'after',
    });
    if (!res) throw new Error('profile_upsert_failed');
    return res;
  } catch (err) {
    console.error(
      'profile_upsert_failed',
      err instanceof Error ? err.message : err,
    );
    throw err;
  }
}

export async function getProfileByNickname(
  nickname: string,
): Promise<Profile | null> {
  const c = await getCollection();
  return c.findOne({ nickname });
}

export async function getProfile(id: string): Promise<Profile | null> {
  const c = await getCollection();
  return c.findOne({ id });
}
