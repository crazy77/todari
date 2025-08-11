import Phaser from 'phaser';

export const gameEventBus = new Phaser.Events.EventEmitter();
export const GameEvents = {
  Booted: 'booted',
} as const;
