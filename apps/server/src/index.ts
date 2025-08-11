import 'dotenv/config';
import http from 'node:http';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { router as adminRouter } from './routes/admin';
import { router as adminLogsRouter } from './routes/adminLogs';
import { router as adminSettingsRouter } from './routes/adminSettings';
import { router as authRouter } from './routes/auth';
import { router as meRouter } from './routes/me';
import { router as moderationRouter } from './routes/moderation';
import { router as profileRouter } from './routes/profile';
import { router as profilesRouter } from './routes/profiles';
import { router as qrRouter } from './routes/qr';
import { router as rankingRouter } from './routes/ranking';
import { router as roomRouter } from './routes/rooms';
import { isBlocked } from './services/moderation';
import { getMongo } from './services/mongo';
import { resetRoom, startSync, stopSync } from './services/stateSync';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './socket/events';

const app = express();
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
]);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      cb(null, allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(hpp());
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/health', async (_req, res) => {
  try {
    const client = await getMongo();
    await client.db().command({ ping: 1 });
    res.json({ ok: true, mongo: 'up' });
  } catch {
    res.status(503).json({ ok: false, mongo: 'down' });
  }
});

app.use('/api/rooms', roomRouter);
app.use('/api/qr', qrRouter);
app.use('/api/profile', profileRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/auth', authRouter);
app.use('/api/auth/me', meRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/logs', adminLogsRouter);
app.use('/api/admin/moderation', moderationRouter);
app.use('/api/admin/settings', adminSettingsRouter);

const server = http.createServer(app);
export const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, { cors: { origin: '*' } });

// 방별 접속자 관리 및 제한
type MemberInfo = {
  id: string;
  userId?: string;
  nickname?: string;
  avatar?: string;
};
const roomMembers = new Map<string, Map<string, MemberInfo>>();
const ROOM_LIMIT = 30;
// 방별 세션 ID (게임 진행 식별자)
const roomSessionId = new Map<string, string>();
const roomProgress = new Map<
  string,
  Map<
    string,
    { score: number; round: number; nickname?: string; avatar?: string }
  >
>();

io.on('connection', (socket) => {
  // 소켓 상태
  socket.data.roomId = undefined;
  // 주기적 타임 싱크(5s)
  const timeSyncHandle = setInterval(() => {
    socket.emit('time-sync', { serverTs: Date.now() });
  }, 5000);

  socket.on('join-room', ({ roomId, userId, nickname, avatar }) => {
    if (!roomId) return;
    const members = roomMembers.get(roomId) ?? new Map<string, MemberInfo>();
    if (members.size >= ROOM_LIMIT) {
      socket.emit('room-full', { roomId });
      return;
    }
    members.set(socket.id, { id: socket.id, userId, nickname, avatar });
    roomMembers.set(roomId, members);

    socket.data.roomId = roomId;
    void socket.join(roomId);
    socket.emit('joined', { roomId });
    const list = Array.from(members.values());
    io.to(roomId).emit('room-members', { roomId, members: list });
    socket
      .to(roomId)
      .emit('user-joined', { id: socket.id, userId, nickname, avatar });
  });

  socket.on('resume', ({ roomId }) => {
    if (!roomId) return;
    const members = roomMembers.get(roomId) ?? new Map<string, MemberInfo>();
    if (!members.has(socket.id)) {
      if (members.size >= ROOM_LIMIT) {
        socket.emit('room-full', { roomId });
        return;
      }
      members.set(socket.id, { id: socket.id });
      roomMembers.set(roomId, members);
    }
    socket.data.roomId = roomId;
    void socket.join(roomId);
    socket.emit('joined', { roomId });
    const list = Array.from(members.values());
    io.to(roomId).emit('room-members', { roomId, members: list });
  });

  // 어드민/관전자 용 현재 멤버 목록 조회
  socket.on('watch-room', ({ roomId }) => {
    if (!roomId) return;
    const members = roomMembers.get(roomId);
    const list = members ? Array.from(members.values()) : [];
    socket.emit('room-members', { roomId, members: list });
  });

  socket.on('leave-room', ({ roomId }) => {
    if (!roomId) return;
    const members = roomMembers.get(roomId);
    if (members) {
      members.delete(socket.id);
      if (members.size === 0) roomMembers.delete(roomId);
    }
    void socket.leave(roomId);
    const list = members ? Array.from(members.values()) : [];
    io.to(roomId).emit('room-members', { roomId, members: list });
    socket.to(roomId).emit('user-left', { id: socket.id });
  });

  socket.on('game-start', ({ roomId }) => {
    if (!roomId) return;
    const sid = Date.now().toString(36);
    roomSessionId.set(roomId, sid);
    startSync(io, roomId);
    io.to(roomId).emit('room-status', {
      roomId,
      status: 'playing',
      sessionId: sid,
    });
  });

  socket.on('game-end', ({ roomId }) => {
    if (!roomId) return;
    const sid = roomSessionId.get(roomId);
    stopSync(roomId);
    resetRoom(roomId);
    io.to(roomId).emit('room-status', {
      roomId,
      status: 'ended',
      sessionId: sid,
    });
    roomProgress.delete(roomId);
  });

  // 클라이언트 ping → 서버 pong 및 RTT 계산
  socket.on('ping', ({ ts }) => {
    const rttMs = Date.now() - ts;
    socket.emit('pong', { ts, rttMs });
  });

  // 액션 처리 및 전파(간단 스로틀 + 서버 검증 스텁)
  let lastActionTs = 0;
  socket.on('action', ({ roomId, ts, type, data }) => {
    if (!roomId) return;
    const now = Date.now();
    if (now - lastActionTs < 30) return; // 30ms 스로틀
    lastActionTs = now;

    // TODO: 타입별 유효성 검증/서버 권위 로직 삽입
    socket
      .to(roomId)
      .emit('action-broadcast', { from: socket.id, ts, type, data });
    socket.emit('action-result', { ts, ok: true });
  });

  // 스코어/라운드 진행 상황 집계
  socket.on('action', () => {
    // no-op: placeholder to avoid breaking existing clients
  });

  socket.on(
    'progress-update',
    ({
      roomId,
      score,
      round,
      nickname,
      avatar,
    }: {
      roomId: string;
      score: number;
      round: number;
      nickname?: string;
      avatar?: string;
    }) => {
      if (!roomId) return;
      const m =
        roomProgress.get(roomId) ??
        new Map<
          string,
          { score: number; round: number; nickname?: string; avatar?: string }
        >();
      m.set(socket.id, { score, round, nickname, avatar });
      roomProgress.set(roomId, m);
      const top = Array.from(m.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.score - a.score || b.round - a.round)
        .slice(0, 3);
      io.to(roomId).emit('progress-top', { roomId, top });
    },
  );

  socket.on('chat-send', ({ roomId, nickname, text, emoji, ts }) => {
    // 사용자 차단 시 채팅 무시
    if (isBlocked(socket.id)) return;

    if (!roomId) return;
    const now = Date.now();
    // 간단 스팸 제한: 300ms 이내 다중 전송 차단
    // @ts-expect-error attach meta
    if (socket.lastChatTs && now - socket.lastChatTs < 300) return;
    // @ts-expect-error attach meta
    socket.lastChatTs = now;

    const clean =
      typeof text === 'string'
        ? text.replace(/[\u0000-\u001F\u007F]/g, '').trim()
        : '';
    if ((!clean || clean.length === 0) && !emoji) return;

    // 금지어 샘플(확장 예정)
    const banned = ['badword'];
    const lowered = clean.toLowerCase();
    for (const w of banned) {
      if (lowered.includes(w)) return;
    }

    const msg = {
      roomId,
      senderId: socket.id,
      nickname,
      text: clean.slice(0, 140),
      emoji,
      ts,
    };
    io.to(roomId).emit('chat-message', msg);
  });

  socket.on('disconnect', () => {
    clearInterval(timeSyncHandle);
    const roomId = socket.data.roomId;
    if (roomId) {
      const members = roomMembers.get(roomId);
      if (members) {
        members.delete(socket.id);
        if (members.size === 0) roomMembers.delete(roomId);
        const list = Array.from(members.values());
        io.to(roomId).emit('room-members', { roomId, members: list });
      }
      const prog = roomProgress.get(roomId);
      if (prog) {
        prog.delete(socket.id);
      }
    }
  });
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'not_found', res }));
// error handler
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'server_error' });
  },
);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
