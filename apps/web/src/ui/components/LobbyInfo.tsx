import { cn } from '@/utils/cn';

export function LobbyInfo({
  rewardName,
  current,
  min,
  className,
}: {
  rewardName?: string | null;
  current: number;
  min?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('mx-auto w-full max-w-sm', className)}>
      <div className="soft-card flex items-center justify-between px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">보상</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-slate-800 ring-1 ring-slate-200">
            {rewardName ?? '없음'}
          </span>
        </div>
        <div className="text-slate-700">
          인원 <span className="font-semibold">{current}</span> / {min ?? '-'}
        </div>
      </div>
    </div>
  );
}
