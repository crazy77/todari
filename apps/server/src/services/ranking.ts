import type { MongoClient, IndexDirection } from 'mongodb';
import { getMongo } from './mongo';

export type RankingScope = 'daily' | 'monthly' | 'alltime';

export type RankingEntry = {
  userId: string;
  nickname?: string;
  score: number;
  scope: RankingScope;
  dateKey: string; // YYYYMMDD for daily, YYYYMM for monthly, '-' for alltime
  updatedAt: number;
};

function dateKey(scope: RankingScope, ts = Date.now()): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  if (scope === 'daily') return `${y}${m}${day}`;
  if (scope === 'monthly') return `${y}${m}`;
  return '-';
}

export async function ensureRankingIndexes(client?: MongoClient) {
  const c = client ?? (await getMongo());
  const col = c.db().collection<RankingEntry>('ranking');
  // unique per (scope,dateKey,userId)
  await col.createIndex({ scope: 1, dateKey: 1, userId: 1 }, { unique: true });
  // sorting index
  await col.createIndex({ scope: 1, dateKey: 1, score: -1 as IndexDirection });
}

export async function upsertScore(userId: string, nickname: string | undefined, score: number) {
  const c = await getMongo();
  const col = c.db().collection<RankingEntry>('ranking');
  const scopes: RankingScope[] = ['daily', 'monthly', 'alltime'];
  for (const scope of scopes) {
    const key = dateKey(scope);
    await col.updateOne(
      { userId, scope, dateKey: key },
      { $max: { score }, $set: { nickname, updatedAt: Date.now() } },
      { upsert: true },
    );
  }
}

export async function getRanking(scope: RankingScope, page = 1, limit = 20) {
  const c = await getMongo();
  const col = c.db().collection<RankingEntry>('ranking');
  const key = dateKey(scope);
  const cur = col
    .find({ scope, dateKey: key })
    .sort({ score: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const items = await cur.toArray();
  return items;
}
