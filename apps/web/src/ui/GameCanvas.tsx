import { useSetAtom } from 'jotai';
import Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { GameEvents, gameEventBus } from '@/game/events';
import { BootScene } from '@/game/scenes/BootScene';
import { GameScene } from '@/game/scenes/GameScene';
import { gameReadyAtom } from '@/stores/gameAtom';
import { JoinOverlay } from '@/ui/join/JoinOverlay';
import { ModeSelector } from '@/ui/ModeSelector';
import { SettingsBar } from '@/ui/SettingsBar';
import { useAtomValue } from 'jotai';
import { gameSettingsAtom } from '@/stores/modeAtom';

export function GameCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const setGameReady = useSetAtom(gameReadyAtom);
  const settings = useAtomValue(gameSettingsAtom);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 360,
      height: 640,
      parent: containerRef.current,
      backgroundColor: '#111',
      scene: [BootScene, GameScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onBoot = () => setGameReady(true);
    const onStart = () => {
      const game = gameRef.current;
      if (!game) return;
      const scene = game.scene.getScene('GameScene') as GameScene;
      scene.scene.start('GameScene', { settings });
    };
    gameEventBus.on(GameEvents.Booted, onBoot);
    gameEventBus.on(GameEvents.StartGame, onStart);
    return () => {
      gameEventBus.off(GameEvents.Booted, onBoot);
      gameEventBus.off(GameEvents.StartGame, onStart);
    };
  }, [setGameReady, settings]);

  const [overlay, setOverlay] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (!room) return;
    setOverlay(
      <JoinOverlay
        roomId={room}
        onDone={() => {
          setOverlay(null);
        }}
      />,
    );
  }, []);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
      {overlay}
      <ModeSelector />
      <SettingsBar />
    </>
  );
}
