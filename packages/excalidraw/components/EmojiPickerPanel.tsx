import React from "react";

const EMOJIS = ["👍", "👏", "😂", "❤️", "🎉", "🔥", "😮", "😢", "👀"];

export const EmojiPickerPanel: React.FC<{
  onSelect: (emoji: string) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => (
  <div className="emoji-picker-panel">
    <div className="emoji-picker-header">React with emoji</div>
    <div className="emoji-picker-grid">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          className="emoji-picker-btn"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
    <button className="emoji-picker-close" onClick={onClose}>Close</button>
  </div>
);
