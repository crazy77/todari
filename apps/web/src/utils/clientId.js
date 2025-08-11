const KEY = 'todari:client-id';
export function getClientId() {
    if (typeof window === 'undefined')
        return 'unknown';
    const existing = localStorage.getItem(KEY);
    if (existing)
        return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
}
