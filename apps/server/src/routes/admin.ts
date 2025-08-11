import { Router } from 'express';
import { z } from 'zod';
import {
  deleteRoom,
  getRoom,
  listRooms,
  setRoomStatus,
} from '../services/roomStore';

export const router = Router();

router.get('/rooms', async (_req, res) => {
  const rooms = await listRooms();
  res.json({ rooms });
});

router.get('/rooms/:id', async (req, res) => {
  const room = await getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'not_found' });
  res.json({ room });
});

router.post('/rooms/:id/status', async (req, res) => {
  const schema = z.object({ status: z.enum(['waiting', 'playing', 'ended']) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'bad_status' });
  const room = await setRoomStatus(req.params.id, parse.data.status);
  if (!room) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, room });
});

router.delete('/rooms/:id', async (req, res) => {
  await deleteRoom(req.params.id);
  res.json({ ok: true });
});
