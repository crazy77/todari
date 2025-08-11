import Phaser from 'phaser';
import { GameEvents, gameEventBus } from '@/game/events';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // 에셋 프리로드 자리
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'todari', {
        color: '#fff',
        fontSize: '28px',
      })
      .setOrigin(0.5);

    // 부팅 완료 이벤트
    gameEventBus.emit(GameEvents.Booted);

    // 기본 부팅만 수행. 시작은 UI에서 제어
  }
}
