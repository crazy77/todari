import Phaser from 'phaser';
import { vibrate } from '@/utils/haptics';
import { playClick, playFail, playSuccess, prepareSfx } from '@/utils/sfx';

type TileState = 'hidden' | 'revealed' | 'matched';
type Tile = {
  container: Phaser.GameObjects.Container;
  back: Phaser.GameObjects.Rectangle;
  face: Phaser.GameObjects.Image;
  value: string; // texture key
  state: TileState;
  index: number;
};

export class GameScene extends Phaser.Scene {
  private score = 0;
  private round = 1;
  private maxRounds = 10;

  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;

  private tiles: Tile[] = [];
  private revealed: Tile[] = [];
  private inputLocked = false;

  // 사용 가능한 이미지 키 17개
  private readonly imagePool: string[] = Array.from({ length: 17 }, (_, i) => `menu-${i + 1}`);

  init(data: { settings?: { rounds: number } }): void {
    if (data?.settings) {
      this.maxRounds = data.settings.rounds;
      this.score = 0;
      this.round = 1;
    }
  }

  constructor() {
    super('GameScene');
  }

  create(): void {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#111');

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

    this.startRound();
  }

  private startRound(): void {
    // 이전 타일 제거
    for (const t of this.tiles) t.container.destroy(true);
    this.tiles = [];
    this.revealed = [];
    this.inputLocked = false;

    this.roundText.setText(`Round: ${this.round}/${this.maxRounds}`);

    // 4x4 덱 구성 (8쌍). 한 라운드에 중복된 원본 이미지는 금지 → 8개를 무작위 샘플링한 뒤 복제
    const sampled = this.sample(this.imagePool, 8);
    const values = this.shuffle([...sampled, ...sampled].slice());

    // 그리드 배치 계산
    const cols = 4;
    const rows = 4;
    const margin = 16;
    const cardW = 68;
    const cardH = 86;
    const totalW = cols * cardW + (cols - 1) * margin;
    const totalH = rows * cardH + (rows - 1) * margin;
    const startX = (this.scale.width - totalW) / 2 + cardW / 2;
    const startY = (this.scale.height - totalH) / 2 + cardH / 2;

    for (let i = 0; i < 16; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + margin);
      const y = startY + row * (cardH + margin);

      const back = this.add
        .rectangle(0, 0, cardW, cardH, 0x2b2b2e, 1)
        .setStrokeStyle(2, 0xffffff, 0.08)
        .setOrigin(0.5);
      back.setInteractive({ useHandCursor: true });

      const key = values[i] ?? sampled[0];
      const face = this.add.image(0, 0, key).setOrigin(0.5);
      // 카드 크기에 맞춰 이미지 스케일 조정
      const tex = this.textures.get(key);
      const src = tex.getSourceImage();
      // Phaser can return HTMLImageElement, HTMLCanvasElement, or a custom object. Handle known cases only.
      if (src instanceof HTMLImageElement || src instanceof HTMLCanvasElement) {
        const sw = src.width;
        const sh = src.height;
        if (sw && sh) {
          const scale = Math.min((cardW * 0.9) / sw, (cardH * 0.9) / sh);
          face.setScale(scale);
        }
      }
      face.setAlpha(0);

      const container = this.add.container(x, y, [back, face]);
      container.setSize(cardW, cardH);
      container.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH), Phaser.Geom.Rectangle.Contains);

      const tile: Tile = {
        container,
        back,
        face,
        value: key,
        state: 'hidden',
        index: i,
      };

      container.on('pointerdown', () => this.onTileClicked(tile));
      this.tiles.push(tile);
    }
  }

  private onTileClicked(tile: Tile): void {
    if (this.inputLocked) return;
    if (tile.state !== 'hidden') return;

    this.revealTile(tile);
    this.trySfx('click');

    if (this.revealed.length === 2) {
      this.inputLocked = true;
      const [a, b] = this.revealed;
      if (a.value === b.value && a.index !== b.index) {
        // 매칭 성공
        this.time.delayedCall(250, () => {
          this.markMatched(a);
          this.markMatched(b);
          this.score += 10; // 간단한 점수 규칙
          this.scoreText.setText(`Score: ${this.score}`);
          this.trySfx('success');
          this.tryVibrate([10, 20, 10]);
          this.revealed = [];
          this.inputLocked = false;
          if (this.tiles.every((t) => t.state === 'matched')) {
            this.round += 1;
            if (this.round > this.maxRounds) {
              this.scene.start('BootScene');
            } else {
              this.cameras.main.flash(150, 255, 255, 255);
              this.time.delayedCall(350, () => this.startRound());
            }
          }
        });
      } else {
        // 실패: 다시 뒤집기
        this.time.delayedCall(600, () => {
          this.hideTile(a);
          this.hideTile(b);
          this.trySfx('fail');
          this.tryVibrate(30);
          this.revealed = [];
          this.inputLocked = false;
        });
      }
    }
  }

  private revealTile(tile: Tile): void {
    tile.state = 'revealed';
    this.revealed.push(tile);
    this.flip(tile, true);
  }

  private hideTile(tile: Tile): void {
    tile.state = 'hidden';
    this.flip(tile, false);
  }

  private markMatched(tile: Tile): void {
    tile.state = 'matched';
    tile.back.setFillStyle(0x355e3b, 1); // 약간의 녹색 톤
    tile.back.setStrokeStyle(2, 0xffffff, 0.18);
    tile.face.setAlpha(1);
  }

  private flip(tile: Tile, toFace: boolean): void {
    this.tweens.add({
      targets: tile.container,
      scaleY: 0,
      duration: 120,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (toFace) {
          tile.face.setAlpha(1);
          tile.back.setFillStyle(0x3a3a3c, 1);
        } else {
          tile.face.setAlpha(0);
          tile.back.setFillStyle(0x2b2b2e, 1);
        }
        this.tweens.add({
          targets: tile.container,
          scaleY: 1,
          duration: 120,
          ease: 'Quad.easeOut',
        });
      },
    });
  }

  private shuffle<T>(input: T[]): T[] {
    const arr = input.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j] as T;
      arr[j] = tmp as T;
    }
    return arr;
  }

  private sample<T>(arr: T[], count: number): T[] {
    const shuffled = this.shuffle(arr);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  private trySfx(kind: 'success' | 'fail' | 'click'): void {
    const raw = localStorage.getItem('todari:ui-settings');
    const ui = raw ? JSON.parse(raw) : { soundEnabled: true, sfxVolume: 0.5 };
    if (!ui.soundEnabled) return;
    prepareSfx(ui.sfxVolume);
    if (kind === 'success') playSuccess();
    else if (kind === 'fail') playFail();
    else playClick();
  }

  private tryVibrate(pattern: number | number[]): void {
    const raw = localStorage.getItem('todari:ui-settings');
    const ui = raw ? JSON.parse(raw) : { vibrationEnabled: true };
    if (!ui.vibrationEnabled) return;
    vibrate(pattern);
  }
}
