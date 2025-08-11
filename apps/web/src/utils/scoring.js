export const SOLO_SCORING = {
    matchBase: 50,
    wrongPenalty: -12,
    timePenaltyPerSec: 2,
    roundClearBonus: 80,
    comboBonusBase: 8,
    comboScaling: 'add',
    comboCap: 8,
};
export const SPEED_SCORING = {
    matchBase: 40,
    wrongPenalty: -15,
    timePenaltyPerSec: 4,
    roundClearBonus: 60,
    comboBonusBase: 10,
    comboScaling: 'add',
    comboCap: 10,
};
export function getComboBonus(cfg, comboCount) {
    const c = Math.max(0, Math.min(comboCount, cfg.comboCap));
    if (c <= 1)
        return 0;
    if (cfg.comboScaling === 'add')
        return (c - 1) * cfg.comboBonusBase;
    const mult = 1 + (c - 1) * (cfg.comboBonusBase / 100);
    return Math.round(cfg.matchBase * (mult - 1));
}
export function calcMatchDelta(cfg, correct, comboCount) {
    if (!correct)
        return cfg.wrongPenalty;
    return cfg.matchBase + getComboBonus(cfg, comboCount);
}
export function calcRoundDelta(cfg, elapsedMs) {
    const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
    const penalty = cfg.timePenaltyPerSec * elapsedSec;
    return cfg.roundClearBonus - penalty;
}
export function calcTimePenalty(cfg, elapsedMs) {
    const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
    return cfg.timePenaltyPerSec * elapsedSec;
}
export function getRoundBonus(cfg) {
    return cfg.roundClearBonus;
}
