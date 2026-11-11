import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import { SegmentedControl, Tooltip, useMantineColorScheme } from "@mantine/core";
import "@mantine/dropzone/styles.css";
import { useMediaQuery } from "@mantine/hooks";
import { ThemeProvider } from "styled-components";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { generateNextSeo } from "next-seo/pages";
import { LuBraces, LuChevronsRight, LuShieldCheck, LuWorkflow } from "react-icons/lu";
import { SEO } from "../constants/seo";
import { darkTheme, lightTheme } from "../constants/theme";
import { ViewMode } from "../enums/viewMode.enum";
import { AvevaInput } from "../features/editor/AvevaInput";
import { AvevaOutput } from "../features/editor/AvevaOutput";
import { BottomBar } from "../features/editor/BottomBar";
import {
  Brand,
  CodeBody,
  LocalBadge,
  MobilePanelSwitch,
  OpenEditorButton,
  PaneCard,
  PaneHeader,
  PaneTitle,
  PreviewBody,
  SourceBody,
  Workspace,
  WorkspaceHeader,
  WorkspaceMain,
  WorkspaceSplit,
} from "../features/editor/EditorWorkspace.styles";
import { FullscreenDropzone } from "../features/editor/FullscreenDropzone";
import { Toolbar } from "../features/editor/Toolbar";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import { useViewMode } from "../hooks/useViewMode";
import useConfig from "../store/useConfig";
import useFile from "../store/useFile";

const ModalController = dynamic(() => import("../features/modals/ModalController"));
const TextEditor = dynamic(() => import("../features/editor/TextEditor"), { ssr: false });
const LiveEditor = dynamic(() => import("../features/editor/LiveEditor"), { ssr: false });

const EditorPage = () => {
  const { query, isReady } = useRouter();
  const jsonUrl = typeof query.json === "string" ? query.json : undefined;
  const { setColorScheme } = useMantineColorScheme();
  const checkEditorSession = useFile(state => state.checkEditorSession);
  const darkmodeEnabled = useConfig(state => state.darkmodeEnabled);
  const fullscreen = useGraph(state => state.fullscreen);
  const toggleFullscreen = useGraph(state => state.toggleFullscreen);
  const compact = useMediaQuery("(max-width: 760px)");
  const [mobilePanel, setMobilePanel] = useState("source");
  const [viewMode, setViewMode] = useViewMode();

  const sourceVisible = compact ? mobilePanel === "source" : !fullscreen;
  const previewVisible = !compact || mobilePanel === "preview";

  useEffect(() => {
    if (isReady) checkEditorSession(jsonUrl);
  }, [checkEditorSession, isReady, jsonUrl]);

  useEffect(() => {
    setColorScheme(darkmodeEnabled ? "dark" : "light");
  }, [darkmodeEnabled, setColorScheme]);

  return (
    <>
      <Head>
        {generateNextSeo({
          ...SEO,
          title: "AVEVA JSON Workbench",
          description: "Normalize AVEVA Wonderware JSON and explore it as a graph or tree.",
          noindex: true,
        })}
      </Head>
      <ThemeProvider theme={darkmodeEnabled ? darkTheme : lightTheme}>
        <ModalController />
        <Workspace $dark={darkmodeEnabled}>
          <WorkspaceHeader>
            <Brand>
              <span className="brand-icon" aria-hidden="true">
                <LuBraces size={27} />
              </span>
              <div>
                <p className="brand-caption">JSON CRACK / WONDERWARE EDITION</p>
                <h1>AVEVA JSON Workbench</h1>
              </div>
            </Brand>
            <LocalBadge>
              <LuShieldCheck size={16} aria-hidden="true" /> Browser-side processing
            </LocalBadge>
          </WorkspaceHeader>
          <Toolbar />
          <MobilePanelSwitch>
            <SegmentedControl
              fullWidth
              aria-label="Workspace panel"
              value={mobilePanel}
              onChange={setMobilePanel}
              data={[
                { label: "Source & editor", value: "source" },
                { label: "Visualization", value: "preview" },
              ]}
            />
          </MobilePanelSwitch>
          <WorkspaceMain>
            <WorkspaceSplit
              proportionalLayout={false}
              separator={false}
              $split={sourceVisible && previewVisible}
            >
              <Allotment.Pane
                preferredSize={460}
                minSize={compact ? 0 : 340}
                maxSize={compact ? undefined : 800}
                visible={sourceVisible}
              >
                <PaneCard aria-labelledby="source-heading" hidden={!sourceVisible}>
                  <PaneHeader>
                    <PaneTitle>
                      <span className="pane-index" aria-hidden="true">
                        01
                      </span>
                      <h2 id="source-heading">Source & editor</h2>
                    </PaneTitle>
                  </PaneHeader>
                  <SourceBody>
                    <AvevaInput />
                    <CodeBody>
                      <BottomBar
                        onCloseEditor={compact ? () => setMobilePanel("preview") : undefined}
                      />
                      <TextEditor />
                    </CodeBody>
                    <AvevaOutput />
                  </SourceBody>
                </PaneCard>
              </Allotment.Pane>
              <Allotment.Pane
                className="workspace-preview"
                minSize={compact ? 0 : 340}
                visible={previewVisible}
              >
                <PaneCard aria-labelledby="preview-heading" hidden={!previewVisible}>
                  <PaneHeader>
                    <PaneTitle>
                      <span className="pane-index" aria-hidden="true">
                        <LuWorkflow size={17} />
                      </span>
                      <h2 id="preview-heading">Visualization</h2>
                    </PaneTitle>
                    <SegmentedControl
                      aria-label="Visualization mode"
                      size="xs"
                      value={viewMode}
                      onChange={value =>
                        setViewMode(value === ViewMode.Tree ? ViewMode.Tree : ViewMode.Graph)
                      }
                      data={[
                        { label: "Graph", value: ViewMode.Graph },
                        { label: "Tree", value: ViewMode.Tree },
                      ]}
                    />
                  </PaneHeader>
                  <PreviewBody>
                    <LiveEditor />
                  </PreviewBody>
                </PaneCard>
              </Allotment.Pane>
            </WorkspaceSplit>
            {!compact && fullscreen && (
              <Tooltip label="Show source & editor" position="right" withArrow>
                <OpenEditorButton
                  type="button"
                  aria-label="Show source & editor"
                  onClick={() => toggleFullscreen(false)}
                >
                  <LuChevronsRight size={18} />
                </OpenEditorButton>
              </Tooltip>
            )}
            <FullscreenDropzone />
          </WorkspaceMain>
        </Workspace>
      </ThemeProvider>
    </>
  );
};

export default EditorPage;
