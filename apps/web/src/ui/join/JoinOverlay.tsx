import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  nickname: z
    .string()
    .min(1, '닉네임을 입력해 주세요.')
    .max(20, '20자 이하로 입력해 주세요.'),
});

type Form = z.infer<typeof schema>;

import { useSetAtom } from 'jotai';
import { connectSocket, joinRoom, socket } from '@/game/socket';
import { sessionPersistAtom } from '@/stores/sessionPersist';

export function JoinOverlay({
  roomId,
  onDone,
}: {
  roomId: string;
  onDone: (nick: string) => void;
}): JSX.Element {
  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
  });
  const setSession = useSetAtom(sessionPersistAtom);

  return (
    <div className=" grid place-items-center">
      <form
        onSubmit={handleSubmit(async (data) => {
          await fetch('/api/profile/nickname', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: data.nickname }),
          });
          // roomId가 빈 문자열이면 소켓 조인을 생략 (로그인 전 홈에서 사용되는 경우 방지)
          if (roomId) {
            connectSocket();
            await fetch(`/api/rooms/${roomId}/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId: socket.id }),
            });
            joinRoom(roomId);
          }
          setSession({ nickname: data.nickname });
          onDone(data.nickname);
        })}
        className="w-full max-w-sm rounded-xl bg-brand-surface p-5 shadow-xl ring-1 ring-white/10"
      >
        <h3 className="mt-0 mb-3 font-semibold text-lg text-white">
          닉네임 입력
        </h3>
        <input
          placeholder="닉네임"
          {...register('nickname')}
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        {formState.errors.nickname && (
          <div className="mt-1 text-red-400 text-xs">
            {formState.errors.nickname.message}
          </div>
        )}
        <button
          type="submit"
          className="mt-3 w-full rounded-md bg-brand-primary px-3 py-2 font-medium text-white shadow hover:brightness-110 disabled:opacity-60"
          disabled={formState.isSubmitting}
        >
          입장하기
        </button>
      </form>
    </div>
  );
}
