import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtom } from 'jotai';
import { uiSettingsAtom } from '@/stores/uiSettingsAtom';
export function SettingsBar() {
    const [ui, setUi] = useAtom(uiSettingsAtom);
    return (_jsxs("div", { style: {
            position: 'fixed',
            bottom: 12,
            right: 12,
            display: 'flex',
            gap: 8,
            background: '#222',
            padding: 8,
            borderRadius: 8,
        }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: ui.soundEnabled, onChange: (e) => setUi({ ...ui, soundEnabled: e.target.checked }) }), "\uC0AC\uC6B4\uB4DC"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: ui.vibrationEnabled, onChange: (e) => setUi({ ...ui, vibrationEnabled: e.target.checked }) }), "\uC9C4\uB3D9"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: ui.assistLabels, onChange: (e) => setUi({ ...ui, assistLabels: e.target.checked }) }), "\uBCF4\uC870\uD45C\uC2DC"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: ["\uBCFC\uB968", _jsx("input", { type: "range", min: 0, max: 1, step: 0.05, value: ui.sfxVolume, onChange: (e) => setUi({ ...ui, sfxVolume: Number(e.target.value) }) })] })] }));
}
