import { atomWithStorage } from 'jotai/utils';
export const uiSettingsAtom = atomWithStorage('todari:ui-settings', {
    soundEnabled: true,
    vibrationEnabled: true,
    assistLabels: false,
    sfxVolume: 0.5,
});
