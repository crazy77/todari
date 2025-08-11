import { MongoClient } from 'mongodb';
import { env } from '../utils/env';

let client: MongoClient | null = null;

export async function getMongo(): Promise<MongoClient> {
  if (client) return client;
  if (!env.mongoUri) throw new Error('MONGODB_URI not set');
  client = await MongoClient.connect(env.mongoUri);
  return client;
}
