import { Router } from 'express';
import { nanoid } from 'nanoid';

export const router = Router();

import {
  createRoom,
  deleteRoom,
  getRoom,
  listRooms,
  setHostIfEmpty,
  setRoomStatus,
  endRoom,
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
  // 호스트 지정: 최초 참가자를 호스트로 설정
  if (!room.hostId && req.body?.clientId) {
    await setHostIfEmpty(id, req.body.clientId);
  }
  const updated = await getRoom(id);
  res.json({ ok: true, room: updated ?? room });
});

router.post('/:id/status', async (req, res) => {
  const id = req.params.id;
  const status = req.body?.status;
  if (!['waiting', 'playing', 'ended'].includes(status)) {
    return res.status(400).json({ error: 'bad_status' });
  }
  const room = await setRoomStatus(id, status);
  if (!room) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, room });
});

router.post('/:id/end', async (req, res) => {
  const id = req.params.id;
  const room = await endRoom(id);
  if (!room) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, room });
});

router.delete('/:id', async (req, res) => {
  await deleteRoom(req.params.id);
  res.json({ ok: true });
});
