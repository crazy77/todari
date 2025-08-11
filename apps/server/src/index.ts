import 'dotenv/config';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { getMongo } from './services/mongo';
import { router as profileRouter } from './routes/profile';
import { router as qrRouter } from './routes/qr';
import { router as roomRouter } from './routes/rooms';

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

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId }) => {
    if (!roomId) return;
    void socket.join(roomId);
    socket.emit('joined', { roomId });
    socket.to(roomId).emit('user-joined', { id: socket.id });
  });

  socket.on('leave-room', ({ roomId }) => {
    if (!roomId) return;
    void socket.leave(roomId);
    socket.to(roomId).emit('user-left', { id: socket.id });
  });

  socket.on('disconnect', () => {});
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
// error handler
// biome-ignore lint/suspicious/noExplicitAny: basic error handler
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  },
);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
