import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private targetColor!: number;
  private score = 0;
  private round = 1;
  private maxRounds = 10;
  private baseRoundMs = 5000;
  private minRoundMs = 2000;
  private remainingMs = this.baseRoundMs;
  private inRound = false;
  private hits = 0;
  private misses = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private timerBar!: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Rectangle[] = [];

  init(data: { settings?: { rounds: number; baseRoundMs: number; minRoundMs: number; baseScore: number; timeBonusMax: number } }): void {
    if (data?.settings) {
      this.maxRounds = data.settings.rounds;
      this.baseRoundMs = data.settings.baseRoundMs;
      this.minRoundMs = data.settings.minRoundMs;
      this.score = 0;
      this.round = 1;
    }
  }

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
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(2, 0xffffff, 0.15);
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
    // 타겟 컬러 미리보기 박스 + 색약 보조 라벨(옵션)
    const preview = this.add.rectangle(width / 2, height / 2 - 40, 120, 120, this.targetColor).setStrokeStyle(3, 0xffffff, 0.25);
    const hex = Phaser.Display.Color.IntegerToColor(this.targetColor).color;
    const hexStr = `#${hex.toString(16).padStart(6, '0')}`;
    // assistLabels는 런타임 상태 접근이 필요하므로, 전역 이벤트나 외부 주입이 적합. 간단히 로컬 스토리지 값으로 처리
    const assist = localStorage.getItem('todari:ui-settings');
    const showAssist = assist ? JSON.parse(assist)?.assistLabels : false;
    if (showAssist) {
      this.add.text(preview.x, preview.y + 80, hexStr, { color: '#ccc', fontSize: '14px' }).setOrigin(0.5);
    }

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
    const denom = Math.max(this.minRoundMs, this.baseRoundMs - (this.round - 1) * 200);
    const timeBonus = Math.ceil((this.remainingMs / denom) *  this.getTimeBonusMax());
    if (correct) {
      this.hits += 1;
      this.score += this.getBaseScore() + timeBonus;
      this.cameras.main.flash(120, 255, 255, 255);
      this.trySfx('success');
      this.tryVibrate([10, 20, 10]);
    } else {
      this.misses += 1;
      this.cameras.main.shake(120, 0.003);
      this.trySfx('fail');
      this.tryVibrate(30);
    }
    this.scoreText.setText(`Score: ${this.score}`);
    this.round += 1;
    this.time.delayedCall(300, () => this.nextRound());
  }

  private getBaseScore(): number {
    // UI에서 설정한 모드 기준 기본 점수: 씬 data 저장 방식으로도 확장 가능
    // 현재는 라운드/타이머만 주입되므로 기본값 유지(솔로=10, 스피드=8)는 상위에서 주입 시 반영 가능
    return this.baseRoundMs <= 2500 ? 8 : 10;
  }

  private getTimeBonusMax(): number {
    return this.baseRoundMs <= 2500 ? 3 : 5;
  }

  private trySfx(kind: 'success' | 'fail' | 'click'): void {
    const raw = localStorage.getItem('todari:ui-settings');
    const ui = raw ? JSON.parse(raw) : { soundEnabled: true, sfxVolume: 0.5 };
    if (!ui.soundEnabled) return;
    // 지연 로딩: 첫 호출 시 준비
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sfx = require('@/utils/sfx') as typeof import('@/utils/sfx');
    sfx.prepareSfx(ui.sfxVolume);
    if (kind === 'success') sfx.playSuccess();
    else if (kind === 'fail') sfx.playFail();
    else sfx.playClick();
  }

  private tryVibrate(pattern: number | number[]): void {
    const raw = localStorage.getItem('todari:ui-settings');
    const ui = raw ? JSON.parse(raw) : { vibrationEnabled: true };
    if (!ui.vibrationEnabled) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const h = require('@/utils/haptics') as typeof import('@/utils/haptics');
    h.vibrate(pattern);
  }
}
