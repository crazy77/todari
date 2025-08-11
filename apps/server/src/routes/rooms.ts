import { Router } from 'express';
import { nanoid } from 'nanoid';

export const router = Router();

import {
  createRoom,
  deleteRoom,
  getRoom,
  listRooms,
} from '../services/roomStore';

router.post('/', async (_req, res) => {
  const id = nanoid(8);
  const ttl = 1000 * 60 * 30; // 30m
  const room = await createRoom(id, ttl);
  res.json(room);
});

router.get('/:id', async (req, res) => {
  const room = await getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'not_found' });
  if (room.expiresAt < Date.now())
    return res.status(410).json({ error: 'expired' });
  res.json(room);
});

router.get('/', async (_req, res) => {
  const list = await listRooms();
  res.json({ rooms: list });
});

router.post('/:id/join', async (req, res) => {
  const id = req.params.id;
  const room = await getRoom(id);
  if (!room) return res.status(404).json({ error: 'not_found' });
  if (room.expiresAt < Date.now()) return res.status(410).json({ error: 'expired' });
  res.json({ ok: true, room });
});

router.delete('/:id', async (req, res) => {
  await deleteRoom(req.params.id);
  res.json({ ok: true });
});
