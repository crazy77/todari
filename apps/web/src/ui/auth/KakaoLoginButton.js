import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { sessionPersistAtom } from '@/stores/sessionPersist';
export function KakaoLoginButton() {
    const session = useAtomValue(sessionPersistAtom);
    if (session.nickname) {
        return (_jsx("div", { className: "fixed top-2 left-2 rounded-md bg-brand-surface/80 px-3 py-1 text-sm text-white shadow", children: session.nickname }));
    }
    return (_jsxs("button", { type: "button", onClick: () => {
            location.href = '/api/auth/kakao/login';
        }, className: "inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 font-medium text-black shadow hover:bg-yellow-300 active:scale-[0.98]", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "h-5 w-5", "aria-hidden": true, children: _jsx("path", { d: "M12 3C6.477 3 2 6.466 2 10.742c0 2.64 1.77 4.952 4.44 6.28-.154.568-.558 2.064-.64 2.387-.1.398.146.392.308.285.126-.082 2.004-1.36 2.81-1.91.338.05.684.078 1.04.078 5.523 0 10-3.466 10-7.742S17.523 3 12 3z" }) }), "\uCE74\uCE74\uC624\uB85C \uB85C\uADF8\uC778"] }));
}
