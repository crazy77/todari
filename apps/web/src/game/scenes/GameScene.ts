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
  private maxRounds = 5;

  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;

  private tiles: Tile[] = [];
  private revealed: Tile[] = [];
  private inputLocked = false;

  // 사용 가능한 이미지 키 54개
  private readonly imagePool: string[] = Array.from(
    { length: 54 },
    (_, i) => `menu-${i + 1}`,
  );

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
    // 최상단 오브젝트만 포인터 이벤트를 받도록 설정 (중첩 상호작용 이슈 방지)
    this.input.setTopOnly(true);

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

    // 그리드 배치 계산
    const cols = 4;
    const rows = 3;
    const margin = 14;
    const cardSize = 76; // 정사각형 카드로 클릭 영역과 시각 영역 일치
    const totalW = cols * cardSize + (cols - 1) * margin;
    const totalH = rows * cardSize + (rows - 1) * margin;
    const startX = (this.scale.width - totalW) / 2 + cardSize / 2;
    const startY = (this.scale.height - totalH) / 2 + cardSize / 2;

    // 덱 구성. 한 라운드에 중복된 원본 이미지는 금지 → 무작위 샘플링한 뒤 복제
    const sampled = this.sample(this.imagePool, (cols * rows) / 2);
    const values = this.shuffle([...sampled, ...sampled].slice());

    for (let i = 0; i < cols * rows; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardSize + margin);
      const y = startY + row * (cardSize + margin);

      const back = this.add
        .rectangle(0, 0, cardSize, cardSize, 0x2b2b2e, 1)
        .setStrokeStyle(2, 0xffffff, 0.08)
        .setOrigin(0.5);
      // 개별 자식에 인터랙티브를 주지 않습니다. 컨테이너만 인터랙티브로 처리하여 히트 충돌을 방지합니다.

      const key = values[i] ?? sampled[0];
      const face = this.add.image(0, 0, key).setOrigin(0.5);
      // 카드 크기에 맞춰 이미지 "정사각형 크롭" 연출: 컨테이너의 마스크를 정사각형으로 설정
      const tex = this.textures.get(key);
      const src = tex.getSourceImage();
      // Phaser can return HTMLImageElement, HTMLCanvasElement, or a custom object. Handle known cases only.
      if (src instanceof HTMLImageElement || src instanceof HTMLCanvasElement) {
        const sw = src.width;
        const sh = src.height;
        if (sw && sh) {
          const scale = Math.max(cardSize / sw, cardSize / sh); // 짧은 변을 맞추고 넘치는 부분은 마스크로 자름
          face.setScale(scale);
        }
      }
      face.setAlpha(0);

      const container = this.add.container(x, y, [back, face]);
      container.setSize(cardSize, cardSize);
      // 정사각형 마스크 적용
      const maskGfx = this.add.graphics();
      maskGfx.fillStyle(0xffffff, 1);
      maskGfx.fillRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize);
      const geomMask = maskGfx.createGeometryMask();
      container.setMask(geomMask);
      // 컨테이너의 크기를 히트 영역으로 사용하고, 포인터 커서를 표시합니다.
      container.setInteractive({ useHandCursor: true });
      // 입력 히트 테스트 안정화: 투명 픽셀 무시 및 내부 자식과의 경쟁 방지
      const inputPlugin = container.input;
      if (inputPlugin) {
        inputPlugin.hitArea = new Phaser.Geom.Rectangle(
          -cardSize / 2,
          -cardSize / 2,
          cardSize,
          cardSize,
        );
        inputPlugin.hitAreaCallback = Phaser.Geom.Rectangle.Contains;
      }

      const tile: Tile = {
        container,
        back,
        face,
        value: key,
        state: 'hidden',
        index: i,
      };

      // pointerdown과 pointerup을 명확히 처리하여 흔들리는 입력을 방지
      container.on('pointerup', (p: Phaser.Input.Pointer) => {
        // 드래그나 멀티터치로 발생한 업 이벤트는 무시
        if (
          p.wasTouch &&
          (Math.abs(p.downX - p.upX) > 4 || Math.abs(p.downY - p.upY) > 4)
        )
          return;
        this.onTileClicked(tile);
      });
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

    // 메뉴 이름을 이미지 아래 추가 (menu.json 매핑 사용)
    const name = this.getMenuName(tile.value) ?? '';
    if (name) {
      const label = this.add.text(0, 0, name, {
        color: '#ffffff',
        fontSize: '12px',
        align: 'center',
        wordWrap: { width: tile.container.width ?? 72, useAdvancedWrap: false },
      });
      label.setOrigin(0.5, 0);
      label.setY(tile.container.height / 2 + 6);
      label.setAlpha(0);
      // 라벨을 컨테이너 좌표계 기준으로 보이도록 별도 컨테이너로 감싸서 월드에 추가
      const worldPos = tile.container.getWorldTransformMatrix();
      const lx = worldPos.tx;
      const ly = worldPos.ty + (tile.container.height / 2 + 6);
      label.setPosition(lx, ly);
      this.tweens.add({ targets: label, alpha: 1, duration: 200 });
    }
  }

  private getMenuName(id: string): string | undefined {
    // id는 'menu-<n>' 형식
    const data = this.cache.json.get('menu-list') as
      | Array<{ id: string; name: string }>
      | undefined;
    if (!data) return undefined;
    const found = data.find((m) => m.id === id);
    return found?.name;
  }

  private flip(tile: Tile, toFace: boolean): void {
    // 애니메이션 중 중복 입력 방지
    tile.container.disableInteractive();
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
          onComplete: () => {
            // 상태가 hidden/revealed인 경우에만 다시 인터랙티브 활성화 (matched는 유지)
            if (tile.state !== 'matched') {
              tile.container.setInteractive({ useHandCursor: true });
            }
          },
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
