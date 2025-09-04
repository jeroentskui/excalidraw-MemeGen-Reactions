import clsx from "clsx";
import React from "react";
import { MemeGeneratorToolbarButton } from "./MemeGeneratorToolbarButton";
import { useState, useRef, useCallback } from "react";
import { EmojiPickerPanel } from "./EmojiPickerPanel";
import { ReactionManager, Emoji } from "./ReactionManager";
import { ReactionBadge } from "./ReactionBadge";
import { FloatingEmoji } from "./FloatingEmoji";
// Emoji Reaction Manager instance (singleton for now)
const reactionManager = new ReactionManager();

const EmojiReactionToolbarButton = ({ onClick, isActive }: { onClick: () => void; isActive: boolean }) => (
  <button
    className={"ToolIcon" + (isActive ? " ToolIcon--selected" : "")}
    title="Emoji Reaction"
    aria-label="Emoji Reaction"
    type="button"
    style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}
    onClick={onClick}
  >
    <span style={{ fontSize: 20, lineHeight: 1 }}>😊</span>
  </button>
);
import { MemeGeneratorPanel } from "./MemeGeneratorPanel";
import { useMemeGeneratorApi } from "./useMemeGeneratorApi";
// Handler type for meme generator
type MemeGenerateHandler = (template: string, topCaption: string, bottomCaption: string) => Promise<void>;

import {
  CLASSES,
  DEFAULT_SIDEBAR,
  TOOL_TYPE,
  arrayToMap,
  capitalizeString,
  isShallowEqual,
} from "@excalidraw/common";

import { mutateElement } from "@excalidraw/element";

import { showSelectedShapeActions } from "@excalidraw/element";

import { ShapeCache } from "@excalidraw/element";

import type { NonDeletedExcalidrawElement } from "@excalidraw/element/types";

import { actionToggleStats } from "../actions";
import { trackEvent } from "../analytics";
import { isHandToolActive } from "../appState";
import { TunnelsContext, useInitializeTunnels } from "../context/tunnels";
import { UIAppStateContext } from "../context/ui-appState";
import { useAtom, useAtomValue } from "../editor-jotai";

import { t } from "../i18n";
import { calculateScrollCenter } from "../scene";

import { SelectedShapeActions, ShapesSwitcher } from "./Actions";
import { LoadingMessage } from "./LoadingMessage";
import { LockButton } from "./LockButton";
import { MobileMenu } from "./MobileMenu";
import { PasteChartDialog } from "./PasteChartDialog";
import { Section } from "./Section";
import Stack from "./Stack";
import { UserList } from "./UserList";
import { PenModeButton } from "./PenModeButton";
import Footer from "./footer/Footer";
import { isSidebarDockedAtom } from "./Sidebar/Sidebar";
import MainMenu from "./main-menu/MainMenu";
import { ActiveConfirmDialog } from "./ActiveConfirmDialog";
import { useDevice } from "./App";
import { OverwriteConfirmDialog } from "./OverwriteConfirm/OverwriteConfirm";
import { LibraryIcon } from "./icons";
import { DefaultSidebar } from "./DefaultSidebar";
import { TTDDialog } from "./TTDDialog/TTDDialog";
import { Stats } from "./Stats";
import ElementLinkDialog from "./ElementLinkDialog";
import { ErrorDialog } from "./ErrorDialog";
import { EyeDropper, activeEyeDropperAtom } from "./EyeDropper";
import { FixedSideContainer } from "./FixedSideContainer";
import { HandButton } from "./HandButton";
import { HelpDialog } from "./HelpDialog";
import { HintViewer } from "./HintViewer";
import { ImageExportDialog } from "./ImageExportDialog";
import { Island } from "./Island";
import { JSONExportDialog } from "./JSONExportDialog";
import { LaserPointerButton } from "./LaserPointerButton";

import "./LayerUI.scss";
import "./Toolbar.scss";

import type { ActionManager } from "../actions/manager";

import type { Language } from "../i18n";
import type {
  AppProps,
  AppState,
  ExcalidrawProps,
  BinaryFiles,
  UIAppState,
  AppClassProperties,
} from "../types";

interface LayerUIProps {
  actionManager: ActionManager;
  appState: UIAppState;
  files: BinaryFiles;
  canvas: HTMLCanvasElement;
  setAppState: React.Component<any, AppState>["setState"];
  elements: readonly NonDeletedExcalidrawElement[];
  onLockToggle: () => void;
  onHandToolToggle: () => void;
  onPenModeToggle: AppClassProperties["togglePenMode"];
  showExitZenModeBtn: boolean;
  langCode: Language["code"];
  renderTopRightUI?: ExcalidrawProps["renderTopRightUI"];
  renderCustomStats?: ExcalidrawProps["renderCustomStats"];
  UIOptions: AppProps["UIOptions"];
  onExportImage: AppClassProperties["onExportImage"];
  renderWelcomeScreen: boolean;
  children?: React.ReactNode;
  app: AppClassProperties;
  isCollaborating: boolean;
  generateLinkForSelection?: AppProps["generateLinkForSelection"];
}

const DefaultMainMenu: React.FC<{
  UIOptions: AppProps["UIOptions"];
}> = ({ UIOptions }) => {
  return (
    <MainMenu __fallback>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      {/* FIXME we should to test for this inside the item itself */}
      {UIOptions.canvasActions.export && <MainMenu.DefaultItems.Export />}
      {/* FIXME we should to test for this inside the item itself */}
      {UIOptions.canvasActions.saveAsImage && (
        <MainMenu.DefaultItems.SaveAsImage />
      )}
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.Group title="Excalidraw links">
        <MainMenu.DefaultItems.Socials />
      </MainMenu.Group>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme />
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
};

const DefaultOverwriteConfirmDialog = () => {
  return (
    <OverwriteConfirmDialog __fallback>
      <OverwriteConfirmDialog.Actions.SaveToDisk />
      <OverwriteConfirmDialog.Actions.ExportToImage />
    </OverwriteConfirmDialog>
  );
};


const LayerUI = ({
  actionManager,
  appState,
  files,
  setAppState,
  elements,
  canvas,
  onLockToggle,
  onHandToolToggle,
  onPenModeToggle,
  showExitZenModeBtn,
  renderTopRightUI,
  renderCustomStats,
  UIOptions,
  onExportImage,
  renderWelcomeScreen,
  children,
  app,
  isCollaborating,
  generateLinkForSelection,
}: LayerUIProps) => {
  // Emoji Reaction state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionMode, setReactionMode] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<Emoji | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<{ emoji: Emoji; x: number; y: number; id: number }[]>([]);
  const floatingId = useRef(0);

  // Hold-to-spam emoji logic
  React.useEffect(() => {
    if (!reactionMode || !selectedReaction) return;
    let spamInterval: any = null;
    let isHolding = false;
    let lastX = 0, lastY = 0;
    const placeEmoji = (x: number, y: number) => {
      // Add random wiggle params
      const wiggle = {
        angle: (Math.random() - 0.5) * 80, // -40 to +40 deg (more pronounced)
        dx: (Math.random() - 0.5) * 32,    // -16 to +16 px (more pronounced)
        dy: (Math.random() - 0.5) * 32,    // -16 to +16 px (more pronounced)
      };
      setFloatingEmojis(list => [
        ...list,
        { emoji: selectedReaction, x, y, id: floatingId.current++, wiggle },
      ]);
    };
    const onDown = (e: MouseEvent) => {
      if (!app?.canvas) return;
      const rect = app.canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        isHolding = true;
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
        placeEmoji(lastX, lastY);
        spamInterval = setInterval(() => {
          placeEmoji(lastX, lastY);
        }, 80);
      }
    };
    const onUp = () => {
      isHolding = false;
      if (spamInterval) clearInterval(spamInterval);
    };
    const onMove = (e: MouseEvent) => {
      if (!isHolding) return;
      if (!app?.canvas) return;
      const rect = app.canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onUp);
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onUp);
      window.removeEventListener("mousemove", onMove);
      if (spamInterval) clearInterval(spamInterval);
    };
  }, [reactionMode, selectedReaction, app?.canvas]);

  // Enter reaction mode after emoji selection
  const handleEmojiSelect = useCallback((emoji: Emoji) => {
    setShowEmojiPicker(false);
    setSelectedReaction(emoji);
    setReactionMode(true);
  }, []);

  // Remove floating emoji after animation
  const handleFloatingDone = useCallback((id: number) => {
    setFloatingEmojis(list => list.filter(e => e.id !== id));
  }, []);

  // Toggle reaction mode on/off
  const handleReactionButton = useCallback(() => {
    if (reactionMode) {
      setReactionMode(false);
      setSelectedReaction(null);
    } else {
      setShowEmojiPicker(true);
    }
  }, [reactionMode]);
// ...existing code...
  const device = useDevice();
  const tunnels = useInitializeTunnels();

  const TunnelsJotaiProvider = tunnels.tunnelsJotai.Provider;

  const [eyeDropperState, setEyeDropperState] = useAtom(activeEyeDropperAtom);

  // Meme Generator API and handler must be declared here, before JSX
  const memeGeneratorApi = useMemeGeneratorApi(app);
  const handleMemeGenerate: MemeGenerateHandler = async (template, topCaption, bottomCaption) => {
    try {
      const encode = (s: string) => encodeURIComponent(s || "_");
      const memeUrl = `https://api.memegen.link/images/${template}/${encode(topCaption)}/${encode(bottomCaption)}.png`;
      console.log("Fetching meme image from:", memeUrl);
      const resp = await fetch(memeUrl);
      if (!resp.ok) throw new Error(`Failed to fetch meme image: ${resp.status}`);
      const blob = await resp.blob();
      console.log("Fetched blob:", blob);
      const file = new File([blob], `${template}.png`, { type: blob.type });
  const centerX = app.state.width / 2;
  const centerY = app.state.height / 2;
  const imageElements = await app.insertImages([file], centerX, centerY);
      console.log("Inserted image elements:", imageElements);
      if (!imageElements?.length) {
        alert("Failed to insert meme image into canvas.");
        return;
      }
      const image = imageElements[0];
      if (!image) {
        alert("Image element not returned from insertImages.");
        return;
      }
      const fontSize = 32;
      const textWidth = image.width;
      const baseText = {
        type: "text",
        version: 1,
        versionNonce: Math.floor(Math.random() * 2 ** 32),
        isDeleted: false,
        id: Math.random().toString(36).substr(2, 9),
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        angle: 0,
        x: image.x,
        y: 0,
        strokeColor: "#000000",
        backgroundColor: "#ffffff00",
        width: textWidth,
        height: fontSize * 1.2,
        seed: Math.floor(Math.random() * 2 ** 32),
        groupIds: [],
        frameId: null,
        containerId: null,
        boundElements: [],
        fontSize,
        fontFamily: 1,
        textAlign: "center",
        verticalAlign: "middle",
        baseline: fontSize,
        lineHeight: 1.2,
        startBinding: null,
        endBinding: null,
        originalText: "",
        autoResize: true,
      };
      const topText = {
        ...baseText,
        id: Math.random().toString(36).substr(2, 9),
        y: image.y - image.height / 2 + fontSize,
        text: topCaption,
        originalText: topCaption,
      };
      const bottomText = {
        ...baseText,
        id: Math.random().toString(36).substr(2, 9),
        y: image.y + image.height / 2 - fontSize * 1.5,
        text: bottomCaption,
        originalText: bottomCaption,
      };
      app.addElementsFromPasteOrLibrary({
        elements: [topText, bottomText],
        position: "center",
      });
      setAppState({ openSidebar: null });
    } catch (err) {
      console.error("Meme generation failed:", err);
      alert("Meme generation failed: " + err);
    }
  };

  const renderJSONExportDialog = () => {
    if (!UIOptions.canvasActions.export) {
      return null;
    }

    return (
      <JSONExportDialog
        elements={elements}
        appState={appState}
        files={files}
        actionManager={actionManager}
        exportOpts={UIOptions.canvasActions.export}
        canvas={canvas}
        setAppState={setAppState}
      />
    );
  };

  const renderImageExportDialog = () => {
    if (
      !UIOptions.canvasActions.saveAsImage ||
      appState.openDialog?.name !== "imageExport"
    ) {
      return null;
    }

    return (
      <ImageExportDialog
        elements={elements}
        appState={appState}
        files={files}
        actionManager={actionManager}
        onExportImage={onExportImage}
        onCloseRequest={() => setAppState({ openDialog: null })}
        name={app.getName()}
      />
    );
  };

  const renderCanvasActions = () => (
    <div style={{ position: "relative" }}>
      {/* wrapping to Fragment stops React from occasionally complaining
                about identical Keys */}
      <tunnels.MainMenuTunnel.Out />
      {renderWelcomeScreen && <tunnels.WelcomeScreenMenuHintTunnel.Out />}
    </div>
  );

  const renderSelectedShapeActions = () => (
    <Section
      heading="selectedShapeActions"
      className={clsx("selected-shape-actions zen-mode-transition", {
        "transition-left": appState.zenModeEnabled,
      })}
    >
      <Island
        className={CLASSES.SHAPE_ACTIONS_MENU}
        padding={2}
        style={{
          // we want to make sure this doesn't overflow so subtracting the
          // approximate height of hamburgerMenu + footer
          maxHeight: `${appState.height - 166}px`,
        }}
      >
        <SelectedShapeActions
          appState={appState}
          elementsMap={app.scene.getNonDeletedElementsMap()}
          renderAction={actionManager.renderAction}
          app={app}
        />
      </Island>
    </Section>
  );

  const renderFixedSideContainer = () => {
    const shouldRenderSelectedShapeActions = showSelectedShapeActions(
      appState,
      elements,
    );

    const shouldShowStats =
      appState.stats.open &&
      !appState.zenModeEnabled &&
      !appState.viewModeEnabled &&
      appState.openDialog?.name !== "elementLinkSelector";

    return (
      <FixedSideContainer side="top">
        <div className="App-menu App-menu_top">
          <Stack.Col gap={6} className={clsx("App-menu_top__left")}>
            {renderCanvasActions()}
            {shouldRenderSelectedShapeActions && renderSelectedShapeActions()}
          </Stack.Col>
          {!appState.viewModeEnabled &&
            appState.openDialog?.name !== "elementLinkSelector" && (
              <Section heading="shapes" className="shapes-section">
                {(heading: React.ReactNode) => (
                  <div style={{ position: "relative" }}>
                    {renderWelcomeScreen && (
                      <tunnels.WelcomeScreenToolbarHintTunnel.Out />
                    )}
                    <Stack.Col gap={4} align="start">
                      <Stack.Row
                        gap={1}
                        className={clsx("App-toolbar-container", {
                          "zen-mode": appState.zenModeEnabled,
                        })}
                      >
                        <Island
                          padding={1}
                          className={clsx("App-toolbar", {
                            "zen-mode": appState.zenModeEnabled,
                          })}
                        >
                          <HintViewer
                            appState={appState}
                            isMobile={device.editor.isMobile}
                            device={device}
                            app={app}
                          />
                          {heading}
                          <Stack.Row gap={1}>
                            <PenModeButton
                              zenModeEnabled={appState.zenModeEnabled}
                              checked={appState.penMode}
                              onChange={() => onPenModeToggle(null)}
                              title={t("toolBar.penMode")}
                              penDetected={appState.penDetected}
                            />
                            <LockButton
                              checked={appState.activeTool.locked}
                              onChange={onLockToggle}
                              title={t("toolBar.lock")}
                            />

                            <div className="App-toolbar__divider" />

                            <HandButton
                              checked={isHandToolActive(appState)}
                              onChange={() => onHandToolToggle()}
                              title={t("toolBar.hand")}
                              isMobile
                            />

                            <ShapesSwitcher
                              appState={appState}
                              activeTool={appState.activeTool}
                              UIOptions={UIOptions}
                              app={app}
                            />

                            {/* Meme Generator Button */}
                            <MemeGeneratorToolbarButton
                              onClick={() => setAppState({ openSidebar: { name: "meme-generator" } })}
                              isActive={appState.openSidebar?.name === "meme-generator"}
                            />
    {/* Emoji Reaction Floating Button (bottom right) */}
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 1200,
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        borderRadius: 32,
        background: "var(--color-surface, #fff)",
        padding: 8,
        display: "flex",
        alignItems: "center",
      }}
    >
      <EmojiReactionToolbarButton
        onClick={handleReactionButton}
        isActive={reactionMode || showEmojiPicker}
      />
    </div>
      {/* Emoji Picker Panel */}
      {showEmojiPicker && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 80,
            zIndex: 1300,
          }}
        >
          <EmojiPickerPanel
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Overlay to block board interaction in reaction mode */}
      {reactionMode && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 999,
            cursor: "pointer",
          }}
        />
      )}
      {/* Render Reaction Badges on selected objects */}
      {app.getSelectedElementIds?.()?.map(id => {
        const el = app.getElementById?.(id);
        if (!el) return null;
        const reactions = reactionManager.getReactionsForElement(id);
        if (!reactions.length) return null;
        // Position badge at top-right of element (simple absolute, demo only)
        const { x, y, width = 80 } = el;
        return reactions.map((r, i) => (
          <div
            key={r.emoji}
            style={{
              position: "absolute",
              left: x + width - 16 + i * 28,
              top: y - 24,
              zIndex: 100,
            }}
          >
            <ReactionBadge emoji={r.emoji} count={r.count} />
          </div>
        ));
      })}

      {/* Floating ephemeral emojis */}
      {floatingEmojis.map(e => (
        <FloatingEmoji
          key={e.id}
          emoji={e.emoji}
          x={e.x}
          y={e.y}
          onDone={() => handleFloatingDone(e.id)}
          animate
          wiggle={e.wiggle}
        />
      ))}
                          </Stack.Row>
                        </Island>
                        {isCollaborating && (
                          <Island
                            style={{
                              marginLeft: 8,
                              alignSelf: "center",
                              height: "fit-content",
                            }}
                          >
                            <LaserPointerButton
                              title={t("toolBar.laser")}
                              checked={
                                appState.activeTool.type === TOOL_TYPE.laser
                              }
                              onChange={() =>
                                app.setActiveTool({ type: TOOL_TYPE.laser })
                              }
                              isMobile
                            />
                          </Island>
                        )}
                      </Stack.Row>
                    </Stack.Col>
                  </div>
                )}
              </Section>
            )}
          <div
            className={clsx(
              "layer-ui__wrapper__top-right zen-mode-transition",
              {
                "transition-right": appState.zenModeEnabled,
              },
            )}
          >
            {appState.collaborators.size > 0 && (
              <UserList
                collaborators={appState.collaborators}
                userToFollow={appState.userToFollow?.socketId || null}
              />
            )}
            {renderTopRightUI?.(device.editor.isMobile, appState)}
            {!appState.viewModeEnabled &&
              appState.openDialog?.name !== "elementLinkSelector" &&
              // hide button when sidebar docked
              (!isSidebarDocked ||
                appState.openSidebar?.name !== DEFAULT_SIDEBAR.name) && (
                <tunnels.DefaultSidebarTriggerTunnel.Out />
              )}
            {shouldShowStats && (
              <Stats
                app={app}
                onClose={() => {
                  actionManager.executeAction(actionToggleStats);
                }}
                renderCustomStats={renderCustomStats}
              />
            )}
          </div>
        </div>
      </FixedSideContainer>
    );
  };

  const renderSidebars = () => {
    return (
      <>
        <DefaultSidebar
          __fallback
          onDock={(docked) => {
            trackEvent(
              "sidebar",
              `toggleDock (${docked ? "dock" : "undock"})`,
              `(${device.editor.isMobile ? "mobile" : "desktop"})`,
            );
          }}
        />
        {/* Meme Generator Sidebar */}
        {appState.openSidebar?.name === "meme-generator" && (
          <div style={{ position: "fixed", right: 0, top: 0, height: "100%", zIndex: 1000 }}>
            <MemeGeneratorPanel
              onGenerate={handleMemeGenerate}
              onClose={() => setAppState({ openSidebar: null })}
            />
          </div>
        )}
      </>
    );
  };

  const isSidebarDocked = useAtomValue(isSidebarDockedAtom);

  const layerUIJSX = (
    <>
      {/* ------------------------- tunneled UI ---------------------------- */}
      {/* make sure we render host app components first so that we can detect
          them first on initial render to optimize layout shift */}
      {children}
      {/* render component fallbacks. Can be rendered anywhere as they'll be
          tunneled away. We only render tunneled components that actually
        have defaults when host do not render anything. */}
      <DefaultMainMenu UIOptions={UIOptions} />
      <DefaultSidebar.Trigger
        __fallback
        icon={LibraryIcon}
        title={capitalizeString(t("toolBar.library"))}
        onToggle={(open) => {
          if (open) {
            trackEvent(
              "sidebar",
              `${DEFAULT_SIDEBAR.name} (open)`,
              `button (${device.editor.isMobile ? "mobile" : "desktop"})`,
            );
          }
        }}
        tab={DEFAULT_SIDEBAR.defaultTab}
      >
        {t("toolBar.library")}
      </DefaultSidebar.Trigger>
      <DefaultOverwriteConfirmDialog />
      {appState.openDialog?.name === "ttd" && <TTDDialog __fallback />}
      {/* ------------------------------------------------------------------ */}

      {appState.isLoading && <LoadingMessage delay={250} />}
      {appState.errorMessage && (
        <ErrorDialog onClose={() => setAppState({ errorMessage: null })}>
          {appState.errorMessage}
        </ErrorDialog>
      )}
      {eyeDropperState && !device.editor.isMobile && (
        <EyeDropper
          colorPickerType={eyeDropperState.colorPickerType}
          onCancel={() => {
            setEyeDropperState(null);
          }}
          onChange={(colorPickerType, color, selectedElements, { altKey }) => {
            if (
              colorPickerType !== "elementBackground" &&
              colorPickerType !== "elementStroke"
            ) {
              return;
            }

            if (selectedElements.length) {
              for (const element of selectedElements) {
                mutateElement(element, arrayToMap(elements), {
                  [altKey && eyeDropperState.swapPreviewOnAlt
                    ? colorPickerType === "elementBackground"
                      ? "strokeColor"
                      : "backgroundColor"
                    : colorPickerType === "elementBackground"
                    ? "backgroundColor"
                    : "strokeColor"]: color,
                });
                ShapeCache.delete(element);
              }
              app.scene.triggerUpdate();
            } else if (colorPickerType === "elementBackground") {
              setAppState({
                currentItemBackgroundColor: color,
              });
            } else {
              setAppState({ currentItemStrokeColor: color });
            }
          }}
          onSelect={(color, event) => {
            setEyeDropperState((state) => {
              return state?.keepOpenOnAlt && event.altKey ? state : null;
            });
            eyeDropperState?.onSelect?.(color, event);
          }}
        />
      )}
      {appState.openDialog?.name === "help" && (
        <HelpDialog
          onClose={() => {
            setAppState({ openDialog: null });
          }}
        />
      )}
      <ActiveConfirmDialog />
      {appState.openDialog?.name === "elementLinkSelector" && (
        <ElementLinkDialog
          sourceElementId={appState.openDialog.sourceElementId}
          onClose={() => {
            setAppState({
              openDialog: null,
            });
          }}
          scene={app.scene}
          appState={appState}
          generateLinkForSelection={generateLinkForSelection}
        />
      )}
      <tunnels.OverwriteConfirmDialogTunnel.Out />
      {renderImageExportDialog()}
      {renderJSONExportDialog()}
      {appState.pasteDialog.shown && (
        <PasteChartDialog
          setAppState={setAppState}
          appState={appState}
          onClose={() =>
            setAppState({
              pasteDialog: { shown: false, data: null },
            })
          }
        />
      )}
      {device.editor.isMobile && (
        <MobileMenu
          app={app}
          appState={appState}
          elements={elements}
          actionManager={actionManager}
          renderJSONExportDialog={renderJSONExportDialog}
          renderImageExportDialog={renderImageExportDialog}
          setAppState={setAppState}
          onLockToggle={onLockToggle}
          onHandToolToggle={onHandToolToggle}
          onPenModeToggle={onPenModeToggle}
          renderTopRightUI={renderTopRightUI}
          renderCustomStats={renderCustomStats}
          renderSidebars={renderSidebars}
          device={device}
          renderWelcomeScreen={renderWelcomeScreen}
          UIOptions={UIOptions}
        />
      )}
      {!device.editor.isMobile && (
        <>
          <div
            className="layer-ui__wrapper"
            style={
              appState.openSidebar &&
              isSidebarDocked &&
              device.editor.canFitSidebar
                ? { width: `calc(100% - var(--right-sidebar-width))` }
                : {}
            }
          >
            {renderWelcomeScreen && <tunnels.WelcomeScreenCenterTunnel.Out />}
            {renderFixedSideContainer()}
            <Footer
              appState={appState}
              actionManager={actionManager}
              showExitZenModeBtn={showExitZenModeBtn}
              renderWelcomeScreen={renderWelcomeScreen}
            />
            {appState.scrolledOutside && (
              <button
                type="button"
                className="scroll-back-to-content"
                onClick={() => {
                  setAppState((appState) => ({
                    ...calculateScrollCenter(elements, appState),
                  }));
                }}
              >
                {t("buttons.scrollBackToContent")}
              </button>
            )}
          </div>
          {renderSidebars()}
        </>
      )}
    </>
  );

  return (
    <UIAppStateContext.Provider value={appState}>
      <TunnelsJotaiProvider>
        <TunnelsContext.Provider value={tunnels}>
          {layerUIJSX}
        </TunnelsContext.Provider>
      </TunnelsJotaiProvider>
    </UIAppStateContext.Provider>
  );
};

const stripIrrelevantAppStateProps = (appState: AppState): UIAppState => {
  const {
    suggestedBindings,
    startBoundElement,
    cursorButton,
    scrollX,
    scrollY,
    ...ret
  } = appState;
  return ret;
};

const areEqual = (prevProps: LayerUIProps, nextProps: LayerUIProps) => {
  // short-circuit early
  if (prevProps.children !== nextProps.children) {
    return false;
  }

  const { canvas: _pC, appState: prevAppState, ...prev } = prevProps;
  const { canvas: _nC, appState: nextAppState, ...next } = nextProps;

  return (
    isShallowEqual(
      // asserting AppState because we're being passed the whole AppState
      // but resolve to only the UI-relevant props
      stripIrrelevantAppStateProps(prevAppState as AppState),
      stripIrrelevantAppStateProps(nextAppState as AppState),
      {
        selectedElementIds: isShallowEqual,
        selectedGroupIds: isShallowEqual,
      },
    ) && isShallowEqual(prev, next)
  );
};

export default React.memo(LayerUI, areEqual);
