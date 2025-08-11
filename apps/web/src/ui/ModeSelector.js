import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtom } from 'jotai';
import { defaultSoloSettings, defaultSpeedSettings, gameSettingsAtom, } from '@/stores/modeAtom';
export function ModeSelector() {
    const [settings, setSettings] = useAtom(gameSettingsAtom);
    return (_jsxs("div", { className: "pointer-events-auto fixed top-3 right-3 z-50 flex gap-2", children: [_jsx("button", { type: "button", onClick: () => setSettings(defaultSoloSettings), className: `rounded-md px-3 py-2 font-medium text-sm shadow transition ${settings.mode === 'solo'
                    ? 'bg-brand-surface text-white'
                    : 'bg-black/40 text-gray-200 hover:bg-black/50'}`, children: "\uC194\uB85C" }), _jsx("button", { type: "button", onClick: () => setSettings(defaultSpeedSettings), className: `rounded-md px-3 py-2 font-medium text-sm shadow transition ${settings.mode === 'speed'
                    ? 'bg-brand-surface text-white'
                    : 'bg-black/40 text-gray-200 hover:bg-black/50'}`, children: "\uC2A4\uD53C\uB4DC\uBC30\uD2C0" })] }));
}
