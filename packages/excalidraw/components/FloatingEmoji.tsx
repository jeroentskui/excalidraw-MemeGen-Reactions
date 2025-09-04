import React, { useEffect, useState } from "react";
import { Emoji } from "./ReactionManager";

export const FloatingEmoji: React.FC<{
  emoji: Emoji;
  x: number;
  y: number;
  onDone: () => void;
  animate?: boolean;
  wiggle?: { angle: number; dx: number; dy: number };
}> = ({ emoji, x, y, onDone, animate, wiggle }) => {
  const [fade, setFade] = useState(false);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    setPop(true);
    const t1 = setTimeout(() => setFade(true), 1200);
    const t2 = setTimeout(onDone, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  // Compose transform: pop/scale, wiggle angle, and random offset
  const base = pop ? 1.4 : 0.7;
  const scale = fade ? 1.2 : base;
  const translateY = fade ? -120 : 0; // float up further
  const rotate = wiggle ? wiggle.angle : 0;
  const dx = wiggle ? wiggle.dx : 0;
  const dy = wiggle ? wiggle.dy : 0;
  return (
    <span
      className="floating-emoji"
      style={{
        position: "absolute",
        left: x + dx,
        top: y + dy,
        fontSize: 32,
        opacity: fade ? 0 : 1,
        transition: "opacity 0.6s, transform 1.5s cubic-bezier(.22,1.61,.36,1)",
        transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
        pointerEvents: "none",
        zIndex: 1000,
        filter: pop ? "drop-shadow(0 2px 8px rgba(0,0,0,0.18))" : undefined,
      }}
    >
      {emoji}
    </span>
  );
};
