export function vibrate(pattern) {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator))
        return;
    navigator.vibrate(pattern);
}
