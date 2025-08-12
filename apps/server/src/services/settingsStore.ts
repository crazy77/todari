import { getMongo } from './mongo';

export type AdminSettings = {
  roundTimeSeconds?: number;
  maxRounds?: number;
  baseScore?: number;
  timeBonus?: number;
  rewardName?: string | null;
  minParticipants?: number;
  speedReady?: boolean;
};

const DOC_ID = 'global';

export async function getSettings(): Promise<AdminSettings> {
  const c = await getMongo();
  const col = c.db().collection<{ _id: string } & AdminSettings>('settings');
  const doc = await col.findOne({ _id: DOC_ID });
  return (doc ?? {}) as AdminSettings;
}

export async function setSettings(
  partial: AdminSettings,
): Promise<AdminSettings> {
  const c = await getMongo();
  const col = c.db().collection<{ _id: string } & AdminSettings>('settings');
  await col.updateOne({ _id: DOC_ID }, { $set: partial }, { upsert: true });
  const doc = await col.findOne({ _id: DOC_ID });
  return (doc ?? {}) as AdminSettings;
}
