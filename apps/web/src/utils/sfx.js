let clickAudio = null;
let successAudio = null;
let failAudio = null;
export function prepareSfx(volume = 0.5) {
    clickAudio = new Audio('/sfx/click.mp3');
    successAudio = new Audio('/sfx/success.wav');
    failAudio = new Audio('/sfx/fail.wav');
    for (const a of [clickAudio, successAudio, failAudio]) {
        if (a)
            a.volume = volume;
    }
}
export function playClick() {
    clickAudio?.play().catch(() => { });
}
export function playSuccess() {
    successAudio?.play().catch(() => { });
}
export function playFail() {
    failAudio?.play().catch(() => { });
}
