export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  // @ts-expect-error: vibrate exists on compatible browsers
  navigator.vibrate(pattern);
}
