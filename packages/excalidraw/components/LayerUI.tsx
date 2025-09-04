import clsx from "clsx";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { MemeGeneratorToolbarButton } from "./MemeGeneratorToolbarButton";
import { EmojiPickerPanel } from "./EmojiPickerPanel";
import { Emoji } from "./ReactionManager";
// TODO: Properly type LayerUIProps, AppState, UIAppState
import { FloatingEmoji } from "./FloatingEmoji";

// (Removed old top-bar EmojiReactionToolbarButton)
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
const LayerUI = (props: any) => {
  // Tunnels and device
  const tunnels = useInitializeTunnels();
  const device = useDevice();
  const TunnelsJotaiProvider = tunnels.tunnelsJotai.Provider;

  // EyeDropper state
  const [eyeDropperState, setEyeDropperState] = useAtom(activeEyeDropperAtom);

  // DefaultOverwriteConfirmDialog fallback
  const DefaultOverwriteConfirmDialog = OverwriteConfirmDialog;
  const {
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
  } = props;

  // State for emoji picker and floating emojis
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{
    id: string;
    emoji: Emoji;
    x: number;
    y: number;
  }>>([]);
  // reaction mode state
  const [reactionModeActive, setReactionModeActive] = useState(false);
  const [reactionEmoji, setReactionEmoji] = useState<Emoji | null>(null);
  const lastSpawnRef = useRef<number>(0);

  const spawnEmoji = useCallback((clientX: number, clientY: number) => {
    if (!reactionEmoji) return;
    setFloatingEmojis((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        emoji: reactionEmoji,
        x: clientX,
        y: clientY,
      },
    ]);
  }, [reactionEmoji]);

  const handleReactionModeToggle = () => {
    setReactionModeActive((active) => {
      if (active) {
        setReactionEmoji(null);
        setShowEmojiPicker(false);
        return false;
      }
      if (!reactionEmoji) {
        setShowEmojiPicker(true);
        return false;
      }
      return true;
    });
  };

  // Handler for emoji select
  const handleEmojiSelect = (emoji: string) => {
  try { console.debug("[reactions] emoji selected", emoji); } catch {}
    // selecting an emoji while not in reaction mode will enable it
    setReactionEmoji(emoji as Emoji);
    if (!reactionModeActive) setReactionModeActive(true);
    setShowEmojiPicker(false);
  };

  // Handler for floating emoji animation done
  const handleFloatingDone = (id: string) => {
    setFloatingEmojis((prev) => prev.filter(e => e.id !== id));
  };

  // Escape key exits reaction mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && reactionModeActive) {
        setReactionModeActive(false);
        setReactionEmoji(null);
        setShowEmojiPicker(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reactionModeActive]);

  // DefaultMainMenu fallback for tunneled UI
  // DefaultMainMenu fallback for tunneled UI
  const DefaultMainMenu = MainMenu as any;


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
                            {/* (Removed legacy reaction UI from top toolbar) */}
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
      {/* Reaction mode overlay to capture clicks & spawn emojis (viewport coords) */}
      {reactionModeActive && reactionEmoji && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 60, // leave footer clickable so user can exit reaction mode
            cursor: "pointer",
            zIndex: 900, // below floating emojis so they remain visible
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            spawnEmoji(e.clientX, e.clientY);
            lastSpawnRef.current = performance.now();
            const target = e.currentTarget as HTMLDivElement;
            const move = (ev: PointerEvent) => {
              const now = performance.now();
              if (now - lastSpawnRef.current > 90) { // throttle ~11/sec
                spawnEmoji(ev.clientX, ev.clientY);
                lastSpawnRef.current = now;
              }
            };
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
              window.removeEventListener("pointercancel", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up, { once: true });
            window.addEventListener("pointercancel", up, { once: true });
          }}
        />
      )}
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
      <DefaultOverwriteConfirmDialog>
        <DefaultOverwriteConfirmDialog.Actions.SaveToDisk />
        <DefaultOverwriteConfirmDialog.Actions.ExportToImage />
      </DefaultOverwriteConfirmDialog>
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
              onToggleReactionMode={handleReactionModeToggle}
              reactionModeActive={reactionModeActive}
            />
            {showEmojiPicker && !reactionModeActive && (
              <div
                style={{
                  position: "fixed",
                  right: 12,
                  bottom: 72,
                  zIndex: 3000,
                  pointerEvents: "auto",
                }}
                data-testid="emoji-picker-wrapper"
              >
                <EmojiPickerPanel
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
            {appState.scrolledOutside && (
              <button
                type="button"
                className="scroll-back-to-content"
                onClick={() => {
                  setAppState((prev: any) => ({
                    ...calculateScrollCenter(elements, prev),
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
      {/* Floating ephemeral emojis rendered last so they appear on top (but below overlay due to zIndex) */}
      {floatingEmojis.map(e => (
        <FloatingEmoji
          key={e.id}
          emoji={e.emoji}
          x={e.x}
          y={e.y}
          onDone={() => handleFloatingDone(e.id)}
        />
      ))}
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

const stripIrrelevantAppStateProps = (appState: any): any => {
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

const areEqual = (prevProps: any, nextProps: any) => {
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
  stripIrrelevantAppStateProps(prevAppState as any),
  stripIrrelevantAppStateProps(nextAppState as any),
      {
        selectedElementIds: isShallowEqual,
        selectedGroupIds: isShallowEqual,
      },
    ) && isShallowEqual(prev, next)
  );
};

export default React.memo(LayerUI, areEqual);
