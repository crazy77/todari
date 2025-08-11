export type LogLevel = 'info' | 'error' | 'warn';
export type LogEntry = { level: LogLevel; message: string; context?: Record<string, unknown>; ts: number };

const MAX = 1000;
const buf: LogEntry[] = [];

export function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = { level, message, context, ts: Date.now() };
  buf.push(entry);
  if (buf.length > MAX) buf.shift();
}
export const logInfo = (m: string, c?: Record<string, unknown>) => log('info', m, c);
export const logWarn = (m: string, c?: Record<string, unknown>) => log('warn', m, c);
export const logError = (m: string, c?: Record<string, unknown>) => log('error', m, c);

export function getLogs(limit = 200, level?: LogLevel): LogEntry[] {
  const list = level ? buf.filter((e) => e.level === level) : buf;
  return list.slice(Math.max(0, list.length - limit));
}
