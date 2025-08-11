import Phaser from 'phaser';
import { GameEvents, gameEventBus } from '@/game/events';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // 이미지 54장을 미리 로드 (public/images/menu-1.jpg ~ menu-54.jpg)
    for (let i = 1; i <= 54; i += 1) {
      const key = `menu-${i}`;
      const url = `/images/menu-${i}.jpg`;
      this.load.image(key, url);
    }
    // 메뉴 메타데이터 로드
    this.load.json('menu-list', '/src/assets/menu.json');
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
