import { useAtom } from 'jotai';
import { GameEvents, gameEventBus } from '@/game/events';
import {
  defaultSoloSettings,
  defaultSpeedSettings,
  gameSettingsAtom,
} from '@/stores/modeAtom';

export function ModeSelector(): JSX.Element {
  const [settings, setSettings] = useAtom(gameSettingsAtom);

  return (
    <div
      style={{ position: 'fixed', top: 12, right: 12, display: 'flex', gap: 8 }}
    >
      <button
        type="button"
        onClick={() => setSettings(defaultSoloSettings)}
        style={{
          padding: '6px 10px',
          background: settings.mode === 'solo' ? '#444' : '#222',
          color: '#fff',
        }}
      >
        솔로
      </button>
      <button
        type="button"
        onClick={() => setSettings(defaultSpeedSettings)}
        style={{
          padding: '6px 10px',
          background: settings.mode === 'speed' ? '#444' : '#222',
          color: '#fff',
        }}
      >
        스피드배틀
      </button>
      <button
        type="button"
        onClick={() => gameEventBus.emit(GameEvents.StartGame)}
        style={{ padding: '6px 10px', background: '#0a84ff', color: '#fff' }}
      >
        시작
      </button>
    </div>
  );
}
