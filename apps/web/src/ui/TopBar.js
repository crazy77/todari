import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { sessionPersistAtom } from '@/stores/sessionPersist';
export function TopBar({ onOpenRanking, }) {
    const session = useAtomValue(sessionPersistAtom);
    const [open, setOpen] = useState(false);
    const onLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        }
        catch { }
        localStorage.removeItem('todari:session');
        location.href = '/';
    };
    return (_jsxs("div", { className: "pointer-events-auto fixed top-0 right-0 left-0 z-50 flex items-center justify-between px-3 py-3", children: [_jsx("button", { type: "button", onClick: onOpenRanking, className: "pill font-semibold", children: "\uD83C\uDFC6 \uB7AD\uD0B9" }), session.nickname ? (_jsxs("div", { className: "relative", children: [_jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), className: "pill", children: [session.profileImageUrl ? (_jsx("img", { src: session.profileImageUrl, alt: "avatar", className: "h-6 w-6 rounded-full object-cover" })) : (_jsx("span", { className: "grid h-6 w-6 place-items-center rounded-full bg-brand-primary text-white text-xs", children: session.nickname.slice(0, 1) })), _jsx("span", { className: "max-w-[120px] truncate", children: session.nickname })] }), open && (_jsx("div", { className: "absolute right-0 mt-2 w-40 rounded-xl bg-white p-2 text-sm text-slate-700 shadow ring-1 ring-slate-200", children: _jsx("button", { type: "button", onClick: onLogout, className: "block w-full rounded-md px-2 py-1 text-left hover:bg-slate-100", children: "\uB85C\uADF8\uC544\uC6C3" }) }))] })) : null] }));
}
