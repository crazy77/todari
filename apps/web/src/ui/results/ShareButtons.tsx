import { useMemo } from 'react';

export function ShareButtons({
  roomId,
  score,
}: {
  roomId: string;
  score: number;
}): JSX.Element {
  const shareText = useMemo(
    () => `Todari 게임에서 ${score}점을 달성했어요!`,
    [score],
  );
  const shareUrl = useMemo(
    () => `${location.origin}/?room=${encodeURIComponent(roomId)}`,
    [roomId],
  );

  function open(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({
                title: 'Todari',
                text: shareText,
                url: shareUrl,
              });
            } catch {}
            return;
          }
          open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          );
        }}
      >
        공유
      </button>
    </div>
  );
}
