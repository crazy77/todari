import { useSetAtom } from 'jotai';
import Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { GameEvents, gameEventBus } from '@/game/events';
import { BootScene } from '@/game/scenes/BootScene';
import { GameScene } from '@/game/scenes/GameScene';
import { gameReadyAtom } from '@/stores/gameAtom';
import { JoinOverlay } from '@/ui/join/JoinOverlay';
import { ModeSelector } from '@/ui/ModeSelector';
import { KakaoLoginButton } from '@/ui/auth/KakaoLoginButton';
import { SettingsBar } from '@/ui/SettingsBar';
import { ResultsScreen } from '@/ui/results/ResultsScreen';
import { Scoreboard } from '@/ui/results/Scoreboard';
import { ChatPanel } from '@/ui/chat/ChatPanel';
import { EmojiPicker } from '@/ui/chat/EmojiPicker';
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
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (!room) return;
    setRoomId(room);
    setOverlay(
      <JoinOverlay
        roomId={room}
        onDone={() => {
          setOverlay(null);
        }}
      />,
    );
  }, []);

  useEffect(() => {
    function onStatus({ roomId: id, status }: { roomId: string; status: 'waiting' | 'playing' | 'ended' }) {
      if (roomId !== id) return;
      setShowResults(status === 'ended');
    }
    // @ts-expect-error loose typing for demo
    socket.on('room-status', onStatus);
    return () => {
      // @ts-expect-error loose typing for demo
      socket.off('room-status', onStatus);
    };
  }, [roomId]);

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />
      {overlay}
      {roomId && (
        <>
          <ChatPanel roomId={roomId} />
          <EmojiPicker roomId={roomId} />
          <Scoreboard roomId={roomId} />
          <ResultsScreen open={showResults} onClose={() => setShowResults(false)} roomId={roomId} />
        </>
      )}
      <KakaoLoginButton />
      <ModeSelector />
      <SettingsBar />
    </>
  );
}
