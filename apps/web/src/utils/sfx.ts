let clickAudio: HTMLAudioElement | null = null;
let successAudio: HTMLAudioElement | null = null;
let failAudio: HTMLAudioElement | null = null;

export function prepareSfx(volume = 0.5): void {
  clickAudio = new Audio('/sfx/click.mp3');
  successAudio = new Audio('/sfx/success.mp3');
  failAudio = new Audio('/sfx/fail.mp3');
  for (const a of [clickAudio, successAudio, failAudio]) {
    if (a) a.volume = volume;
  }
}

export function playClick(): void {
  clickAudio?.play().catch(() => {});
}

export function playSuccess(): void {
  successAudio?.play().catch(() => {});
}

export function playFail(): void {
  failAudio?.play().catch(() => {});
}
