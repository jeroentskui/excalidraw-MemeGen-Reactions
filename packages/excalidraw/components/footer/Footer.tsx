import clsx from "clsx";

import { actionShortcuts } from "../../actions";
import { useTunnels } from "../../context/tunnels";
import { ExitZenModeAction, UndoRedoActions, ZoomActions } from "../Actions";
import { HelpButton } from "../HelpButton";
import { ReactionModeButton } from "../ReactionModeButton";
import { Section } from "../Section";
import Stack from "../Stack";

import type { ActionManager } from "../../actions/manager";
import type { UIAppState } from "../../types";

interface FooterProps {
  appState: UIAppState;
  actionManager: ActionManager;
  showExitZenModeBtn: boolean;
  renderWelcomeScreen: boolean;
  onToggleReactionMode?: () => void;
  reactionModeActive?: boolean;
}

const Footer = ({
  appState,
  actionManager,
  showExitZenModeBtn,
  renderWelcomeScreen,
  onToggleReactionMode,
  reactionModeActive,
}: FooterProps) => {
  const { FooterCenterTunnel, WelcomeScreenHelpHintTunnel } = useTunnels();

  return (
    <footer
      role="contentinfo"
      className="layer-ui__wrapper__footer App-menu App-menu_bottom"
    >
      <div
        className={clsx("layer-ui__wrapper__footer-left zen-mode-transition", {
          "layer-ui__wrapper__footer-left--transition-left":
            appState.zenModeEnabled,
        })}
      >
        <Stack.Col gap={2}>
          <Section heading="canvasActions">
            <ZoomActions
              renderAction={actionManager.renderAction}
              zoom={appState.zoom}
            />

            {!appState.viewModeEnabled && (
              <UndoRedoActions
                renderAction={actionManager.renderAction}
                className={clsx("zen-mode-transition", {
                  "layer-ui__wrapper__footer-left--transition-bottom":
                    appState.zenModeEnabled,
                })}
              />
            )}
          </Section>
        </Stack.Col>
      </div>
      <FooterCenterTunnel.Out />
      <div
        className={clsx("layer-ui__wrapper__footer-right zen-mode-transition", {
          "transition-right": appState.zenModeEnabled,
        })}
      >
        <div style={{ position: "relative" }}>
          {renderWelcomeScreen && <WelcomeScreenHelpHintTunnel.Out />}
          <div style={{ display: "flex", gap: 4 }}>
            <ReactionModeButton
              active={!!reactionModeActive}
              onClick={onToggleReactionMode || (() => {})}
            />
            <HelpButton
              onClick={() => actionManager.executeAction(actionShortcuts)}
            />
          </div>
        </div>
      </div>
      <ExitZenModeAction
        actionManager={actionManager}
        showExitZenModeBtn={showExitZenModeBtn}
      />
    </footer>
  );
};

export default Footer;
Footer.displayName = "Footer";
