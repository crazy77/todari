import { atomWithStorage } from 'jotai/utils';

export type UiSettings = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  assistLabels: boolean;
  sfxVolume: number; // 0..1
};

export const uiSettingsAtom = atomWithStorage<UiSettings>(
  'todari:ui-settings',
  {
    soundEnabled: true,
    vibrationEnabled: true,
    assistLabels: false,
    sfxVolume: 0.5,
  },
);
