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
    <div className="pointer-events-auto fixed right-3 top-3 z-50 flex gap-2">
      <button
        type="button"
        onClick={() => setSettings(defaultSoloSettings)}
        className={`rounded-md px-3 py-2 text-sm font-medium shadow transition ${
          settings.mode === 'solo'
            ? 'bg-brand-surface text-white'
            : 'bg-black/40 text-gray-200 hover:bg-black/50'
        }`}
      >
        솔로
      </button>
      <button
        type="button"
        onClick={() => setSettings(defaultSpeedSettings)}
        className={`rounded-md px-3 py-2 text-sm font-medium shadow transition ${
          settings.mode === 'speed'
            ? 'bg-brand-surface text-white'
            : 'bg-black/40 text-gray-200 hover:bg-black/50'
        }`}
      >
        스피드배틀
      </button>
      <button
        type="button"
        onClick={() => gameEventBus.emit(GameEvents.StartGame)}
        className="rounded-md bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow hover:brightness-110 active:scale-[0.98]"
      >
        시작
      </button>
    </div>
  );
}
