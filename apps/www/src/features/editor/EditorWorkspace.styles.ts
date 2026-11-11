import styled from "styled-components";
import { Allotment } from "allotment";

export const Workspace = styled.div<{ $dark: boolean }>`
  --workbench-bg: ${({ $dark }) => ($dark ? "#0a101d" : "#eaf0f9")};
  --workbench-panel: ${({ $dark }) => ($dark ? "#101a2b" : "#ffffff")};
  --workbench-subtle: ${({ $dark }) => ($dark ? "#0b1423" : "#f5f8fc")};
  --workbench-line: ${({ $dark }) => ($dark ? "#26374e" : "#cedbed")};
  --workbench-ink: ${({ $dark }) => ($dark ? "#edf5ff" : "#13213b")};
  --workbench-muted: ${({ $dark }) => ($dark ? "#a8bad3" : "#4c607c")};
  --workbench-accent: ${({ $dark }) => ($dark ? "#7ae8d9" : "#066f67")};
  --workbench-tint: ${({ $dark }) => ($dark ? "#12343a" : "#e2f6f3")};

  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100dvh;
  min-height: 530px;
  background: var(--workbench-bg);
  color: var(--workbench-ink);

  :focus-visible {
    outline: 2px solid var(--workbench-accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: no-preference) {
    button,
    textarea {
      transition:
        background-color 120ms ease,
        border-color 120ms ease,
        color 120ms ease;
    }
  }

  @media (max-width: 760px) {
    min-height: 610px;
  }
`;

export const WorkspaceHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 24px;
  flex-shrink: 0;
  padding: 17px clamp(12px, 3vw, 34px);
  color: #f2f7ff;
  border-bottom: 1px solid #29445c;
  background:
    radial-gradient(ellipse at 90% 10%, #194655 0%, transparent 42%),
    repeating-linear-gradient(135deg, transparent 0 14px, #8fe3f109 15px 16px), #101c33;

  @media (max-width: 480px) {
    padding-block: 11px;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  .brand-icon {
    display: grid;
    place-items: center;
    width: 45px;
    height: 45px;
    flex-shrink: 0;
    color: #082c32;
    border-radius: 12px;
    background: linear-gradient(135deg, #b5f7a7, #72e7e4);
    box-shadow: 0 4px 20px #73e8d444;
  }

  .brand-caption {
    color: #a8c2dd;
    font:
      600 10px/1.4 ui-monospace,
      "Cascadia Code",
      monospace;
    letter-spacing: 0.1em;
  }

  h1 {
    font-size: clamp(1.14rem, 2.7vw, 1.9rem);
    line-height: 1.2;
    font-weight: 750;
    letter-spacing: -0.035em;
  }
`;

export const LocalBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #5cd1c14d;
  border-radius: 999px;
  padding: 5px 10px;
  color: #b1f4e5;
  background: #0d323ccc;
  font-size: 11px;
  font-weight: 650;

  @media (max-width: 480px) {
    padding-block: 3px;
  }
`;

export const MobilePanelSwitch = styled.div`
  display: none;
  padding: 8px 10px 0;

  @media (max-width: 760px) {
    display: block;
  }
`;

export const WorkspaceMain = styled.main`
  position: relative;
  flex: 1;
  min-height: 0;
  margin: 12px;
  --focus-border: var(--workbench-accent);

  @media (max-width: 760px) {
    margin: 8px;
  }
`;

export const WorkspaceSplit = styled(Allotment)<{ $split: boolean }>`
  .workspace-preview {
    padding-left: ${({ $split }) => ($split ? "10px" : "0")};
  }
`;

export const PaneCard = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--workbench-line);
  border-radius: 14px;
  background: var(--workbench-panel);
  box-shadow: 0 8px 24px #040a1514;

  &[hidden] {
    display: none;
  }
`;

export const PaneHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  min-height: 50px;
  gap: 6px 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--workbench-line);
`;

export const PaneTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;

  h2 {
    font-size: 14px;
    font-weight: 700;
  }

  .pane-index {
    display: grid;
    place-items: center;
    min-width: 26px;
    height: 26px;
    border-radius: 7px;
    background: var(--workbench-tint);
    color: var(--workbench-accent);
    font:
      700 12px ui-monospace,
      "Cascadia Code",
      monospace;
  }
`;

export const PreviewBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

export const SourceBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-color: var(--workbench-line) transparent;
`;

export const CodeBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 0 180px;
  min-height: 180px;
`;

export const OpenEditorButton = styled.button`
  position: absolute;
  left: 2px;
  top: 48%;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 34px;
  height: 58px;
  border: 1px solid var(--workbench-line);
  border-radius: 0 10px 10px 0;
  color: var(--workbench-accent);
  background: var(--workbench-panel);

  &:hover {
    background: var(--workbench-tint);
  }
`;
