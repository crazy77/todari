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
import { getCurrentRoomId, setCurrentRoomId } from './services/currentRoom';
import { isBlocked } from './services/moderation';
import { getMongo } from './services/mongo';
import { upsertGameScore } from './services/ranking';
import { getSettings, setSettings } from './services/settingsStore';
import { resetRoom, startSync, stopSync } from './services/stateSync';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './socket/events';
import { setIO } from './socket/io';

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
setIO(io);

// 방별 접속자 관리 및 제한
type MemberInfo = {
  id: string;
  userId?: string;
  nickname?: string;
  avatar?: string;
  tableNumber?: string | null;
  score?: number;
  round?: number;
};
const roomMembers = new Map<string, Map<string, MemberInfo>>();
const ROOM_LIMIT = 30;
// 방별 세션 ID (게임 진행 식별자)
const roomSessionId = new Map<string, string>();
const roomProgress = new Map<
  string,
  Map<
    string,
    {
      score: number;
      round: number;
      nickname?: string;
      avatar?: string;
      tableNumber?: string | null;
    }
  >
>();
// currentRoomId는 서비스에서 단일 관리
// 최초 완주/중복 종료 방지 플래그
const firstFinisherAwarded = new Set<string>(); // roomId 기준
const endedRooms = new Set<string>(); // roomId 기준

io.on('connection', (socket) => {
  // 소켓 상태
  socket.data.roomId = undefined;
  // 주기적 타임 싱크(5s)
  const timeSyncHandle = setInterval(() => {
    socket.emit('time-sync', { serverTs: Date.now() });
  }, 5000);

  // 현재 룸 안내
  const existing = getCurrentRoomId();
  console.log('Log ~ existing:', existing);
  if (existing) socket.emit('current-room', { roomId: existing });

  socket.on('join-room', ({ roomId, memberInfo }) => {
    const { userId, nickname, avatar, tableNumber } = memberInfo;
    const useRoomId = getCurrentRoomId() ?? roomId;
    if (!useRoomId) return;
    const members = roomMembers.get(useRoomId) ?? new Map<string, MemberInfo>();

    members.set(socket.id, {
      id: socket.id,
      userId,
      nickname,
      avatar,
      tableNumber,
    });
    roomMembers.set(useRoomId, members);

    socket.data.roomId = useRoomId;
    void socket.join(useRoomId);
    socket.emit('joined', { roomId: useRoomId });
    const list = Array.from(members.values());
    io.to(useRoomId).emit('room-members', { roomId: useRoomId, members: list });
    io.to(`${useRoomId}:watchers`).emit('room-members', {
      roomId: useRoomId,
      members: list,
    });
    socket.to(useRoomId).emit('user-joined', {
      id: socket.id,
      userId,
      nickname,
      avatar,
      tableNumber,
    });
  });

  socket.on('resume', () => {
    const useRoomId = getCurrentRoomId() ?? undefined;
    console.log('Log ~ resume:', useRoomId);
    if (!useRoomId) return;
    const members = roomMembers.get(useRoomId) ?? new Map<string, MemberInfo>();
    if (!members.has(socket.id)) {
      if (members.size >= ROOM_LIMIT) {
        socket.emit('room-full', { roomId: useRoomId });
        return;
      }
      members.set(socket.id, { id: socket.id });
      roomMembers.set(useRoomId, members);
    }
    socket.data.roomId = useRoomId;
    void socket.join(useRoomId);
    socket.emit('joined', { roomId: useRoomId });
    const list = Array.from(members.values());
    io.to(useRoomId).emit('room-members', { roomId: useRoomId, members: list });
    io.to(`${useRoomId}:watchers`).emit('room-members', {
      roomId: useRoomId,
      members: list,
    });
  });

  // 어드민/관전자 용 현재 멤버 목록 조회
  socket.on('watch-room', ({ roomId }) => {
    const useRoomId = getCurrentRoomId() ?? roomId;
    console.log('Log ~ watch-room:', useRoomId);
    if (!useRoomId) return;
    void socket.join(`${useRoomId}:watchers`);
    const members = roomMembers.get(useRoomId);
    const list = members ? Array.from(members.values()) : [];
    socket.emit('room-members', { roomId: useRoomId, members: list });
  });

  socket.on('leave-room', ({ roomId }) => {
    console.log('Log ~ leave-room:', roomId);
    if (!roomId) return;
    const members = roomMembers.get(roomId);
    if (members) {
      members.delete(socket.id);
      if (members.size === 0) roomMembers.delete(roomId);
    }
    void socket.leave(roomId);
    const list = members ? Array.from(members.values()) : [];
    io.to(roomId).emit('room-members', { roomId, members: list });
    io.to(`${roomId}:watchers`).emit('room-members', { roomId, members: list });
    socket.to(roomId).emit('user-left', { id: socket.id });
  });

  socket.on('game-start', async ({ roomId }) => {
    const useRoomId = getCurrentRoomId() ?? roomId;
    console.log('Log ~ game-start:', useRoomId);
    if (!useRoomId) {
      socket.emit('start-rejected', { reason: 'no_room' });
      return;
    }
    if (endedRooms.has(useRoomId)) return; // 이미 종료 처리된 방은 무시
    // 최소 인원 검증: 설정값 존재 시 해당 인원 이상일 때만 시작
    const members = roomMembers.get(useRoomId);
    const currentCount = members ? members.size : 0;
    try {
      const s = await getSettings();
      const min = s.minParticipants ?? 0;
      const ready = s.speedReady === true;
      if (!ready) {
        socket.emit('start-rejected', { reason: 'not_ready' });
        console.log('Log ~ game-start:', useRoomId, 'not_ready');
        return;
      }
      if (min > 0 && currentCount < min) {
        socket.emit('start-rejected', { reason: 'not_enough_members' });
        return;
      }
    } catch {
      if (currentCount <= 0) {
        socket.emit('start-rejected', { reason: 'not_enough_members' });
        console.log('Log ~ game-start:', useRoomId, 'not_enough_members');
        return;
      }
    }
    const sid = Date.now().toString(36);
    roomSessionId.set(useRoomId, sid);
    startSync(io, useRoomId);
    io.emit('room-status', {
      roomId: useRoomId,
      status: 'playing',
      sessionId: sid,
    });
  });

  // 최초 완주 플레이어로 인해 게임 종료 트리거: 보너스 1000점 지급
  socket.on('game-finished', async ({ roomId, memberInfo }) => {
    const useRoomId = getCurrentRoomId() ?? roomId;
    console.log('Log ~ game-finished:', useRoomId);
    if (!useRoomId) return;
    if (endedRooms.has(useRoomId)) return; // 중복 종료 방지
    // 아직 진행 중인 방에 대해 최초 도착자를 보너스로 반영
    const sid = roomSessionId.get(useRoomId);
    if (!sid) return; // 게임이 이미 끝났거나 시작 안됨
    if (firstFinisherAwarded.has(useRoomId)) return; // 이미 보너스 지급됨

    const m =
      roomProgress.get(useRoomId) ??
      new Map<
        string,
        {
          score: number;
          round: number;
          nickname?: string;
          avatar?: string;
          tableNumber?: string | null;
        }
      >();
    // 최초 완주 보너스: 해당 소켓에게 가산. 중복 보너스를 방지하기 위해 roomSessionId를 사용하여 즉시 종료 처리
    m.set(socket.id, {
      score: memberInfo.score ?? 0 + 1000,
      round: 999,
      nickname: memberInfo.nickname,
      avatar: memberInfo.avatar,
      tableNumber: memberInfo.tableNumber,
    });
    roomProgress.set(useRoomId, m);

    // 곧바로 관리자 종료 플로우 호출
    stopSync(useRoomId);
    resetRoom(useRoomId);
    io.emit('room-status', {
      roomId: useRoomId,
      status: 'ended',
      sessionId: sid,
    });
    const progressMap = roomProgress.get(useRoomId);
    const results = progressMap
      ? Array.from(progressMap.entries())
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.score - a.score || b.round - a.round)
      : [];
    // 결과 영속화: gameId = sessionId(sid)
    try {
      const members =
        roomMembers.get(useRoomId) ?? new Map<string, MemberInfo>();
      if (sid) {
        for (const r of results) {
          const mem = members.get(r.id);
          const userId = mem?.userId ?? r.id;
          await upsertGameScore(sid, userId, r.nickname, r.score);
        }
      }
    } catch {}
    let rewardName: string | null | undefined = null;
    try {
      const s = await getSettings();
      rewardName = s.rewardName ?? null;
    } catch {}
    io.emit('game-results', {
      roomId: useRoomId,
      sessionId: sid,
      results,
      rewardName,
    });
    roomProgress.delete(useRoomId);
    setCurrentRoomId(null);
    endedRooms.add(useRoomId);
    try {
      const saved = await setSettings({ speedReady: false });
      io.emit('settings-updated', {
        settings: saved as Record<string, unknown>,
      });
    } catch {
      io.emit('settings-updated', { settings: { speedReady: false } });
    }
    io.emit('room-closed', { roomId: useRoomId });
  });

  socket.on('game-end', async ({ roomId }) => {
    const useRoomId = getCurrentRoomId() ?? roomId;
    console.log('Log ~ game-end:', useRoomId);
    if (!useRoomId) return;
    if (endedRooms.has(useRoomId)) return; // 중복 종료 방지
    const sid = roomSessionId.get(useRoomId);
    stopSync(useRoomId);
    resetRoom(useRoomId);
    io.emit('room-status', {
      roomId: useRoomId,
      status: 'ended',
      sessionId: sid,
    });
    // 직전 결과 브로드캐스트
    const progressMap = roomProgress.get(useRoomId);
    const results = progressMap
      ? Array.from(progressMap.entries())
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.score - a.score || b.round - a.round)
      : [];
    // 결과 영속화: gameId = sessionId(sid)
    try {
      if (sid) {
        const members =
          roomMembers.get(useRoomId) ?? new Map<string, MemberInfo>();
        for (const r of results) {
          const mem = members.get(r.id);
          const userId = mem?.userId ?? r.id;
          await upsertGameScore(sid, userId, r.nickname, r.score);
        }
      }
    } catch {}
    let rewardName: string | null | undefined = null;
    try {
      const s = await getSettings();
      rewardName = s.rewardName ?? null;
    } catch {}
    io.emit('game-results', {
      roomId: useRoomId,
      sessionId: sid,
      results,
      rewardName,
    });
    roomProgress.delete(useRoomId);
    // 게임 종료 시 준비 자동 OFF → 룸 초기화 및 모든 클라 대기방 이탈 지시
    setCurrentRoomId(null);
    try {
      const saved = await setSettings({ speedReady: false });
      io.emit('settings-updated', {
        settings: saved as Record<string, unknown>,
      });
    } catch {
      io.emit('settings-updated', { settings: { speedReady: false } });
    }
    io.emit('room-closed', { roomId: useRoomId });
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
      memberInfo: { score, round, nickname, avatar, tableNumber },
    }: {
      roomId: string;
      memberInfo: MemberInfo;
    }) => {
      console.log('Log ~ roomId:', roomId);
      if (!roomId) return;
      const m =
        roomProgress.get(roomId) ??
        new Map<
          string,
          {
            score: number;
            round: number;
            nickname?: string;
            avatar?: string;
            tableNumber?: string | null;
          }
        >();
      console.log('Log ~ m:', m);
      m.set(socket.id, {
        score: score ?? 0,
        round: round ?? 0,
        nickname,
        avatar,
        tableNumber,
      });
      roomProgress.set(roomId, m);
      const top = Array.from(m.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.score - a.score || b.round - a.round)
        .slice(0, 3);
      console.log('Log ~ top:', top);
      io.emit('progress-top', { roomId, top });
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
        io.to(`${roomId}:watchers`).emit('room-members', {
          roomId,
          members: list,
        });
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
