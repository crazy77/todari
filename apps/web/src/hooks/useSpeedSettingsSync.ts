import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { socket } from '@/game/socket';
import { speedSettingsAtom } from '@/stores/uiStateAtom';

export function useSpeedSettingsSync(): void {
  const [, setSpeedSettings] = useAtom(speedSettingsAtom);

  useEffect(() => {
    function onSettings({
      settings,
    }: {
      settings: {
        rewardName?: string | null;
        minParticipants?: number;
        speedReady?: boolean;
      };
    }) {
      setSpeedSettings({
        rewardName: settings.rewardName ?? null,
        minParticipants: settings.minParticipants ?? undefined,
        speedReady: settings.speedReady,
      });
    }
    socket.on('settings-updated', onSettings);
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data?.settings) onSettings({ settings: data.settings });
      } catch {}
    })();
    return () => {
      socket.off('settings-updated', onSettings);
    };
  }, [setSpeedSettings]);
}
