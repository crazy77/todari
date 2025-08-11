import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({ nickname: z.string().min(1).max(20) });

type Form = z.infer<typeof schema>;

import { useSetAtom } from 'jotai';
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
    >
      <form
        onSubmit={handleSubmit(async (data) => {
          await fetch('/api/profile/nickname', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: data.nickname }),
          });
          await fetch(`/api/rooms/${roomId}/join`, { method: 'POST' });
          setSession({ nickname: data.nickname });
          onDone(data.nickname);
        })}
        style={{
          background: '#222',
          padding: 16,
          borderRadius: 8,
          minWidth: 280,
        }}
      >
        <h3 style={{ marginTop: 0 }}>닉네임 입력</h3>
        <input
          placeholder="닉네임"
          {...register('nickname')}
          style={{ width: '100%', padding: 8 }}
        />
        {formState.errors.nickname && (
          <div style={{ color: 'tomato', fontSize: 12 }}>
            {formState.errors.nickname.message}
          </div>
        )}
        <button
          type="submit"
          style={{ marginTop: 12, width: '100%', padding: 8 }}
          disabled={formState.isSubmitting}
        >
          입장하기
        </button>
      </form>
    </div>
  );
}
