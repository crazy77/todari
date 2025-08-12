let _currentRoomId: string | null = null;

export function getCurrentRoomId(): string | null {
  return _currentRoomId;
}

export function setCurrentRoomId(id: string | null): void {
  console.log('Log ~ setCurrentRoomId ~ _currentRoomId:', _currentRoomId, id);
  _currentRoomId = id;
}
