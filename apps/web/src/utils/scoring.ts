export type ScoringConfig = {
  matchBase: number; // 기본 매칭 점수
  wrongPenalty: number; // 틀렸을 때 감점
  timePenaltyPerSec: number; // 라운드 소요시간 초당 감점
  roundClearBonus: number; // 라운드 클리어 보너스
  comboBonusBase: number; // 콤보 n단계당 추가 가산점(가산식)
  comboScaling: 'add' | 'mult'; // 가산 또는 승수 방식
  comboCap: number; // 콤보 캡(점수 계산용)
};

export const SOLO_SCORING: ScoringConfig = {
  matchBase: 50,
  wrongPenalty: -12,
  timePenaltyPerSec: 2,
  roundClearBonus: 80,
  comboBonusBase: 8,
  comboScaling: 'add',
  comboCap: 8,
};

export const SPEED_SCORING: ScoringConfig = {
  matchBase: 40,
  wrongPenalty: -15,
  timePenaltyPerSec: 4,
  roundClearBonus: 60,
  comboBonusBase: 10,
  comboScaling: 'add',
  comboCap: 10,
};

export function getComboBonus(cfg: ScoringConfig, comboCount: number): number {
  const c = Math.max(0, Math.min(comboCount, cfg.comboCap));
  if (c <= 1) return 0;
  if (cfg.comboScaling === 'add') return (c - 1) * cfg.comboBonusBase;
  const mult = 1 + (c - 1) * (cfg.comboBonusBase / 100);
  return Math.round(cfg.matchBase * (mult - 1));
}

export function calcMatchDelta(
  cfg: ScoringConfig,
  correct: boolean,
  comboCount: number,
): number {
  if (!correct) return cfg.wrongPenalty;
  return cfg.matchBase + getComboBonus(cfg, comboCount);
}

export function calcRoundDelta(cfg: ScoringConfig, elapsedMs: number): number {
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const penalty = cfg.timePenaltyPerSec * elapsedSec;
  return cfg.roundClearBonus - penalty;
}

export function calcTimePenalty(cfg: ScoringConfig, elapsedMs: number): number {
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  return cfg.timePenaltyPerSec * elapsedSec;
}

export function getRoundBonus(cfg: ScoringConfig): number {
  return cfg.roundClearBonus;
}
