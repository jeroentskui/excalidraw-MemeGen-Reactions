// Handles emoji reaction state, counts, and sync
import { ExcalidrawElement } from "../element/types";

export type Emoji = "👍" | "👏" | "😂" | "❤️" | "🎉" | "🔥" | "😮" | "😢" | "👀";

export type Reaction = {
  emoji: Emoji;
  count: number;
  userIds: string[];
};

export type ObjectReactions = Record<string, Reaction[]>; // key: element id

export class ReactionManager {
  private reactions: ObjectReactions = {};
  private listeners: (() => void)[] = [];

  getReactionsForElement(elementId: string): Reaction[] {
    return this.reactions[elementId] || [];
  }

  addReaction(elementId: string, emoji: Emoji, userId: string) {
    if (!this.reactions[elementId]) this.reactions[elementId] = [];
    const arr = this.reactions[elementId];
    const existing = arr.find(r => r.emoji === emoji);
    if (existing) {
      if (!existing.userIds.includes(userId)) {
        existing.userIds.push(userId);
        existing.count++;
      }
    } else {
      arr.push({ emoji, count: 1, userIds: [userId] });
    }
    this.notify();
  }

  removeReaction(elementId: string, emoji: Emoji, userId: string) {
    const arr = this.reactions[elementId];
    if (!arr) return;
    const idx = arr.findIndex(r => r.emoji === emoji);
    if (idx > -1) {
      const r = arr[idx];
      r.userIds = r.userIds.filter(id => id !== userId);
      r.count = r.userIds.length;
      if (r.count === 0) arr.splice(idx, 1);
      this.notify();
    }
  }

  subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  // TODO: Add sync methods for collaboration
}
