import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private targetColor!: number;
  private score = 0;
  private round = 1;
  private readonly maxRounds = 10;
  private readonly baseRoundMs = 5000;
  private readonly minRoundMs = 2000;
  private remainingMs = this.baseRoundMs;
  private inRound = false;
  private hits = 0;
  private misses = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('GameScene');
  }

  create(): void {
    const { width } = this.scale;
    this.scoreText = this.add.text(12, 12, `Score: ${this.score}`, {
      color: '#fff',
      fontSize: '16px',
    });
    this.roundText = this.add
      .text(width - 12, 12, `Round: ${this.round}/${this.maxRounds}`, {
        color: '#fff',
        fontSize: '16px',
      })
      .setOrigin(1, 0);
    this.timerBar = this.add.graphics();

    // 생성한 4가지 색상 버튼을 하단에 배치
    const colors = [0xff3b30, 0x34c759, 0x007aff, 0xffcc00];
    const btnSize = 64;
    const gap = 12;
    const totalW = colors.length * btnSize + (colors.length - 1) * gap;
    const startX = (width - totalW) / 2;

    this.buttons = colors.map((c, idx) => {
      const x = startX + idx * (btnSize + gap) + btnSize / 2;
      const y = this.scale.height - btnSize;
      const rect = this.add
        .rectangle(x, y, btnSize, btnSize, c)
        .setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => this.onUserPick(c));
      return rect;
    });

    this.nextRound();
  }

  private nextRound(): void {
    if (this.round > this.maxRounds) {
      this.scene.start('BootScene');
      return;
    }
    this.inRound = true;
    const roundMs = Math.max(
      this.minRoundMs,
      this.baseRoundMs - (this.round - 1) * 200,
    );
    this.remainingMs = roundMs;

    this.cameras.main.setBackgroundColor('#111');
    this.children.removeAll();
    // 상단 텍스트/타이머/버튼 유지
    this.add.existing(this.scoreText);
    this.roundText.setText(`Round: ${this.round}/${this.maxRounds}`);
    this.add.existing(this.roundText);
    this.add.existing(this.timerBar);
    for (const b of this.buttons) this.add.existing(b);

    this.targetColor = Phaser.Display.Color.RandomRGB().color;
    const { width, height } = this.scale;
    // 타겟 컬러 미리보기 박스
    this.add.rectangle(width / 2, height / 2 - 40, 120, 120, this.targetColor);

    // 라운드 타이머 진행바
    this.time.removeAllEvents();
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.remainingMs -= 16;
        this.drawTimer();
        if (this.remainingMs <= 0 && this.inRound) {
          this.inRound = false;
          this.round += 1;
          this.nextRound();
        }
      },
    });
  }

  private drawTimer(): void {
    const { width } = this.scale;
    const pct = Phaser.Math.Clamp(
      this.remainingMs /
        Math.max(this.minRoundMs, this.baseRoundMs - (this.round - 1) * 200),
      0,
      1,
    );
    this.timerBar.clear();
    const color = pct > 0.5 ? 0x00c853 : pct > 0.25 ? 0xffc400 : 0xff3b30;
    this.timerBar.fillStyle(color).fillRect(12, 36, (width - 24) * pct, 6);
  }

  private onUserPick(color: number): void {
    if (!this.inRound) return;
    this.inRound = false;
    const correct = color === this.targetColor;
    if (correct) {
      this.hits += 1;
      const timeBonus = Math.ceil(
        (this.remainingMs /
          Math.max(
            this.minRoundMs,
            this.baseRoundMs - (this.round - 1) * 200,
          )) *
          5,
      );
      this.score += 10 + timeBonus;
      this.cameras.main.flash(120, 255, 255, 255);
    } else {
      this.misses += 1;
      this.cameras.main.shake(120, 0.003);
    }
    this.scoreText.setText(`Score: ${this.score}`);
    this.round += 1;
    this.time.delayedCall(300, () => this.nextRound());
  }
}
