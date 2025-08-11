import { useSetAtom } from 'jotai';
import Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { GameEvents, gameEventBus } from '@/game/events';
import { BootScene } from '@/game/scenes/BootScene';
import { GameScene } from '@/game/scenes/GameScene';
import { gameReadyAtom } from '@/stores/gameAtom';
import { JoinOverlay } from '@/ui/join/JoinOverlay';

export function GameCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const setGameReady = useSetAtom(gameReadyAtom);

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
    gameEventBus.on(GameEvents.Booted, onBoot);
    return () => gameEventBus.off(GameEvents.Booted, onBoot);
  }, [setGameReady]);

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
    </>
  );
}
