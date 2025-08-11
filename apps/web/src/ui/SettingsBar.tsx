import { useAtom } from 'jotai';
import { uiSettingsAtom } from '@/stores/uiSettingsAtom';

export function SettingsBar(): JSX.Element {
  const [ui, setUi] = useAtom(uiSettingsAtom);
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        display: 'flex',
        gap: 8,
        background: '#222',
        padding: 8,
        borderRadius: 8,
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={ui.soundEnabled}
          onChange={(e) => setUi({ ...ui, soundEnabled: e.target.checked })}
        />
        사운드
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={ui.vibrationEnabled}
          onChange={(e) => setUi({ ...ui, vibrationEnabled: e.target.checked })}
        />
        진동
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={ui.assistLabels}
          onChange={(e) => setUi({ ...ui, assistLabels: e.target.checked })}
        />
        보조표시
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        볼륨
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={ui.sfxVolume}
          onChange={(e) => setUi({ ...ui, sfxVolume: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
