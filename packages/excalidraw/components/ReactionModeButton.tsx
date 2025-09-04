import React from "react";

export const ReactionModeButton = ({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      className={"ToolIcon ToolIcon_type_button" + (active ? " ToolIcon--selected" : "")}
      aria-label="Toggle emoji reaction mode"
      title={active ? "Exit reaction mode" : "Emoji reactions"}
      onClick={onClick}
      style={{ minWidth: 40 }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>😊</span>
    </button>
  );
};

ReactionModeButton.displayName = "ReactionModeButton";