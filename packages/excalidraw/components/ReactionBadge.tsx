import React from "react";
import { Emoji, Reaction } from "./ReactionManager";

export const ReactionBadge: React.FC<{
  emoji: Emoji;
  count: number;
}> = ({ emoji, count }) => (
  <span className="reaction-badge">
    {emoji}
    {count > 1 && <span className="reaction-badge-count">×{count}</span>}
  </span>
);
