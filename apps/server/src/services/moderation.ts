const blocked = new Set<string>();

export function blockUser(userId: string): void {
  blocked.add(userId);
}
export function unblockUser(userId: string): void {
  blocked.delete(userId);
}
export function isBlocked(userId: string): boolean {
  return blocked.has(userId);
}
export function listBlocked(): string[] {
  return Array.from(blocked);
}
